<?php
require_once 'config/Database.php';
require_once 'lib/Auth.php';

class ExamController {
    private $conn;

    public function __construct() {
        $db = new Database();
        $this->conn = $db->getConnection();
    }

    // Teacher: Create (save) a CBT exam with questions
    public function createExam() {
        $user = Auth::requireRole(['teacher']);

        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data || empty($data['title']) || empty($data['course_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'title and course_id are required']);
            return;
        }

        $courseId       = intval($data['course_id']);
        $title          = trim($data['title']);
        $description    = $data['description'] ?? '';
        $duration       = intval($data['duration_minutes'] ?? 60);
        $questions      = $data['questions'] ?? [];
        $action         = $data['action'] ?? 'draft'; // 'draft' or 'submit'

        // Verify teacher owns the course (directly or via class_subjects)
        $s = $this->conn->prepare("
            SELECT id FROM courses 
            WHERE id = :cid 
              AND (teacher_id = :tid OR id IN (SELECT course_id FROM class_subjects WHERE teacher_id = :tid2)) 
            LIMIT 1
        ");
        $s->execute([':cid' => $courseId, ':tid' => $user['id'], ':tid2' => $user['id']]);
        if (!$s->fetch()) {
            http_response_code(403);
            echo json_encode(['error' => 'Course not found or access denied']);
            return;
        }

        $status = $action === 'submit' ? 'pending_approval' : 'draft';

        try {
            $this->conn->beginTransaction();

            // Insert exam
            $examStmt = $this->conn->prepare("
                INSERT INTO exams (course_id, title, description, duration_minutes, status, created_by)
                VALUES (:cid, :title, :desc, :dur, :status, :uid)
            ");
            $examStmt->execute([
                ':cid'    => $courseId,
                ':title'  => $title,
                ':desc'   => $description,
                ':dur'    => $duration,
                ':status' => $status,
                ':uid'    => $user['id'],
            ]);
            $examId = $this->conn->lastInsertId();

            // Insert questions + options
            foreach ($questions as $q) {
                if (empty(trim($q['text'] ?? ''))) continue;

                $qStmt = $this->conn->prepare("
                    INSERT INTO exam_questions (exam_id, question_text, question_type, points)
                    VALUES (:eid, :text, 'multiple_choice', 1)
                ");
                $qStmt->execute([':eid' => $examId, ':text' => trim($q['text'])]);
                $questionId = $this->conn->lastInsertId();

                foreach (($q['opts'] ?? []) as $idx => $optText) {
                    if (empty(trim($optText))) continue;
                    $is_correct = ($idx === intval($q['correct'] ?? 0)) ? 1 : 0;
                    $oStmt = $this->conn->prepare("
                        INSERT INTO exam_options (question_id, option_text, is_correct)
                        VALUES (:qid, :text, :correct)
                    ");
                    $oStmt->execute([
                        ':qid'    => $questionId,
                        ':text'   => trim($optText),
                        ':correct' => $is_correct,
                    ]);
                }
            }

            $this->conn->commit();

            echo json_encode([
                'success' => true,
                'exam_id' => $examId,
                'status'  => $status,
                'message' => $status === 'pending_approval'
                    ? 'CBT submitted for approval'
                    : 'Draft saved successfully',
            ]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(['error' => 'Failed to save CBT: ' . $e->getMessage()]);
        }
    }

    // Teacher: List their CBT exams
    public function getTeacherExams() {
        $user = Auth::requireRole(['teacher']);

        $stmt = $this->conn->prepare("
            SELECT e.id, e.title, e.description, e.duration_minutes, e.status, e.created_at,
                   c.name AS course_name,
                   (SELECT COUNT(*) FROM exam_questions WHERE exam_id = e.id) AS question_count,
                   (SELECT COUNT(*) FROM exam_submissions WHERE exam_id = e.id) AS submission_count
            FROM exams e
            JOIN courses c ON e.course_id = c.id
            WHERE e.created_by = :uid
            ORDER BY e.created_at DESC
        ");
        $stmt->execute([':uid' => $user['id']]);
        $exams = $stmt->fetchAll();

        echo json_encode(['exams' => $exams]);
    }

    // Teacher: Get full CBT detail (for editing or viewing)
    public function getExamDetail() {
        $user = Auth::requireRole(['teacher', 'admin']);

        $examId = isset($_GET['exam_id']) ? intval($_GET['exam_id']) : 0;
        if (!$examId) {
            http_response_code(400);
            echo json_encode(['error' => 'exam_id required']);
            return;
        }

        $s = $this->conn->prepare("SELECT * FROM exams WHERE id = :eid AND created_by = :uid LIMIT 1");
        $s->execute([':eid' => $examId, ':uid' => $user['id']]);
        $exam = $s->fetch();
        if (!$exam) {
            http_response_code(404);
            echo json_encode(['error' => 'Exam not found']);
            return;
        }

        $qStmt = $this->conn->prepare("SELECT * FROM exam_questions WHERE exam_id = :eid ORDER BY id");
        $qStmt->execute([':eid' => $examId]);
        $questions = $qStmt->fetchAll();

        foreach ($questions as &$q) {
            $oStmt = $this->conn->prepare("SELECT * FROM exam_options WHERE question_id = :qid ORDER BY id");
            $oStmt->execute([':qid' => $q['id']]);
            $q['options'] = $oStmt->fetchAll();
        }

        echo json_encode(['exam' => $exam, 'questions' => $questions]);
    }

    // Teacher dashboard: recent activity (exam events)
    public function getTeacherActivity() {
        $user = Auth::requireRole(['teacher']);

        $stmt = $this->conn->prepare("
            SELECT
                'submission' AS type,
                CONCAT(u.first_name, ' ', u.last_name, ' submitted \"', e.title, '\"') AS text,
                es.submitted_at AS happened_at
            FROM exam_submissions es
            JOIN exams e ON es.exam_id = e.id
            JOIN users u ON es.student_id = u.id
            WHERE e.created_by = :uid AND es.submitted_at IS NOT NULL
            UNION ALL
            SELECT
                'exam_status' AS type,
                CONCAT('CBT \"', e.title, '\" ', e.status) AS text,
                e.created_at AS happened_at
            FROM exams e
            WHERE e.created_by = :uid2
            UNION ALL
            SELECT
                'material' AS type,
                CONCAT('Material \"', m.title, '\" uploaded') AS text,
                m.created_at AS happened_at
            FROM materials m
            WHERE m.uploaded_by = :uid3
            ORDER BY happened_at DESC
            LIMIT 8
        ");
        $stmt->execute([':uid' => $user['id'], ':uid2' => $user['id'], ':uid3' => $user['id']]);
        $rows = $stmt->fetchAll();

        $activity = [];
        foreach ($rows as $r) {
            $ts = strtotime($r['happened_at']);
            $diff = time() - $ts;
            if ($diff < 3600) { $when = round($diff / 60) . 'm ago'; }
            elseif ($diff < 86400) { $when = round($diff / 3600) . 'h ago'; }
            elseif ($diff < 172800) { $when = 'Yesterday'; }
            else { $when = date('M j', $ts); }

            $color = $r['type'] === 'submission' ? '#219EBC'
                   : ($r['type'] === 'material' ? '#8ECAE6' : '#FFB703');

            $activity[] = ['text' => $r['text'], 'time' => $when, 'color' => $color];
        }

        echo json_encode(['activity' => $activity]);
    }

    // Teacher dashboard: per-class score trend (avg score per course)
    public function getTeacherScoreTrend() {
        $user = Auth::requireRole(['teacher']);

        $stmt = $this->conn->prepare("
            SELECT c.name AS label, ROUND(AVG(g.score), 1) AS avg_score
            FROM grades g
            JOIN courses c ON g.course_id = c.id
            WHERE c.teacher_id = :uid AND g.score IS NOT NULL
            GROUP BY c.id, c.name
            ORDER BY avg_score DESC
            LIMIT 6
        ");
        $stmt->execute([':uid' => $user['id']]);
        $rows = $stmt->fetchAll();

        // Map for chart: [{m: 'Course', avg: 74}, ...]
        $trend = array_map(fn($r) => ['m' => substr($r['label'], 0, 6), 'avg' => floatval($r['avg_score'])], $rows);

        echo json_encode(['trend' => $trend]);
    }

    // Admin: List all CBT exams with their approval status
    public function getAdminExams() {
        Auth::requireRole(['admin']);

        $stmt = $this->conn->query("
            SELECT e.id, e.title, e.description, e.duration_minutes, e.status, e.created_at,
                   c.name AS subject, CONCAT(u.first_name, ' ', u.last_name) AS teacher,
                   (SELECT GROUP_CONCAT(cl.name SEPARATOR ', ') FROM class_subjects cs JOIN classes cl ON cs.class_id = cl.id WHERE cs.course_id = c.id) AS class,
                   (SELECT COUNT(*) FROM exam_questions WHERE exam_id = e.id) AS questions
            FROM exams e
            JOIN courses c ON e.course_id = c.id
            JOIN users u ON e.created_by = u.id
            ORDER BY e.created_at DESC
        ");
        $exams = $stmt->fetchAll();

        echo json_encode(['exams' => $exams]);
    }

    // Admin: Approve or Reject CBT Exam
    public function updateExamStatus() {
        Auth::requireRole(['admin']);
        $data = json_decode(file_get_contents('php://input'), true);

        if (empty($data['id']) || empty($data['status'])) {
            http_response_code(400);
            echo json_encode(['error' => 'id and status are required']);
            return;
        }

        if (!in_array($data['status'], ['approved', 'rejected'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid status']);
            return;
        }

        try {
            $stmt = $this->conn->prepare("UPDATE exams SET status = :status WHERE id = :id");
            $stmt->execute([':status' => $data['status'], ':id' => intval($data['id'])]);
            
            echo json_encode(['success' => true, 'message' => 'Exam status updated to ' . $data['status']]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update status: ' . $e->getMessage()]);
        }
    }
}
