<?php
require_once 'config/Database.php';
require_once 'lib/Auth.php';

class GradeController {
    private $conn;

    public function __construct() {
        $db = new Database();
        $this->conn = $db->getConnection();
    }

    private function getSetting($key, $default = "") {
        $stmt = $this->conn->prepare("SELECT setting_value FROM system_settings WHERE setting_key = :k LIMIT 1");
        $stmt->execute([':k' => $key]);
        $val = $stmt->fetchColumn();
        return $val !== false ? $val : $default;
    }

    private function normalizeTerm($raw) {
        if (!$raw) return $this->getSetting('current_term', '2nd Term');
        if ($raw === '1st' || $raw === '1st Term') return '1st Term';
        if ($raw === '2nd' || $raw === '2nd Term') return '2nd Term';
        if ($raw === '3rd' || $raw === '3rd Term') return '3rd Term';
        return $raw;
    }

    // Teacher: Get grades list for course
    public function getTeacherGrades() {
        $teacher = Auth::requireRole(['teacher', 'admin']);
        
        $courseId = isset($_GET['course_id']) ? intval($_GET['course_id']) : null;
        $term = $this->normalizeTerm($_GET['term'] ?? null);
        $session = isset($_GET['session']) ? $_GET['session'] : $this->getSetting('academic_session', '2026/2027');
        
        // 1. Get courses taught by teacher (or all courses if admin)
        if ($teacher['role'] === 'admin') {
            $coursesQuery = "SELECT id, name FROM courses ORDER BY name";
            $coursesStmt = $this->conn->query($coursesQuery);
            $courses = $coursesStmt->fetchAll();
        } else {
            // Teacher sees courses assigned directly (courses.teacher_id)
            // OR via class subject allocation (class_subjects.teacher_id)
            $coursesQuery = "
                SELECT DISTINCT c.id, c.name FROM courses c
                WHERE c.teacher_id = :tid
                   OR c.id IN (SELECT course_id FROM class_subjects WHERE teacher_id = :tid2)
                ORDER BY c.name
            ";
            $coursesStmt = $this->conn->prepare($coursesQuery);
            $coursesStmt->execute([':tid' => $teacher['id'], ':tid2' => $teacher['id']]);
            $courses = $coursesStmt->fetchAll();
        }
        
        if (empty($courses)) {
            echo json_encode([
                "courses" => [],
                "students" => [],
                "course_status" => "draft",
                "selected_term" => $term,
                "selected_session" => $session
            ]);
            return;
        }
        
        if (!$courseId) {
            $courseId = $courses[0]['id'];
        }
        
        // 2. Fetch enrolled students and their grades for this specific term/session
        $gradesQuery = "
            SELECT 
                u.id, 
                CONCAT(u.first_name, ' ', u.last_name) as name,
                u.email,
                g.ca1,
                g.ca2,
                g.exam,
                g.assignment_score,
                g.project_score,
                g.mid_term_test,
                g.score,
                g.remarks,
                g.status
            FROM users u
            JOIN enrollments e ON u.id = e.student_id
            LEFT JOIN grades g ON (u.id = g.student_id AND g.course_id = :cid AND g.academic_term = :term AND g.academic_session = :session)
            WHERE e.course_id = :cid
            ORDER BY u.first_name, u.last_name
        ";
        
        $gradesStmt = $this->conn->prepare($gradesQuery);
        $gradesStmt->execute([
            ':cid' => $courseId,
            ':term' => $term,
            ':session' => $session
        ]);
        $students = $gradesStmt->fetchAll();
        
        // Find overall status of this course mark sheet
        $courseStatus = "draft";
        $formattedStudents = [];
        foreach ($students as $s) {
            if ($s['status']) {
                $courseStatus = $s['status'];
            }
            $formattedStudents[] = [
                "id" => $s['id'],
                "name" => $s['name'],
                "student_number" => "STU/" . str_pad($s['id'], 3, '0', STR_PAD_LEFT),
                "ca1" => $s['ca1'] !== null ? strval(floatval($s['ca1'])) : "0",
                "ca2" => $s['ca2'] !== null ? strval(floatval($s['ca2'])) : "0",
                "exam" => $s['exam'] !== null ? strval(floatval($s['exam'])) : "0",
                "assignment_score" => $s['assignment_score'] !== null ? strval(floatval($s['assignment_score'])) : "0",
                "project_score" => $s['project_score'] !== null ? strval(floatval($s['project_score'])) : "0",
                "mid_term_test" => $s['mid_term_test'] !== null ? strval(floatval($s['mid_term_test'])) : "0",
                "score" => $s['score'] !== null ? floatval($s['score']) : 0,
                "remarks" => $s['remarks'] ?: "",
                "status" => $s['status'] ?: "draft"
            ];
        }
        
        echo json_encode([
            "courses" => $courses,
            "selected_course_id" => $courseId,
            "selected_term" => $term,
            "selected_session" => $session,
            "course_status" => $courseStatus,
            "result_mode" => $this->getSetting('result_mode', 'end_of_term'),
            "students" => $formattedStudents
        ]);
    }

    // Teacher: Save/update grades as draft or submitted
    public function saveGrades() {
        $user = Auth::requireRole(['teacher', 'admin']);
        $data = json_decode(file_get_contents("php://input"));
        
        if (!isset($data->course_id) || !isset($data->grades)) {
            http_response_code(400);
            echo json_encode(["error" => "Incomplete data"]);
            return;
        }
        
        $courseId = intval($data->course_id);
        $term = $this->normalizeTerm($data->term ?? null);
        $session = isset($data->session) ? $data->session : $this->getSetting('academic_session', '2026/2027');
        $resultMode = $this->getSetting('result_mode', 'end_of_term');
        $targetStatus = isset($data->status) && in_array($data->status, ['draft', 'submitted', 'approved', 'published']) ? $data->status : 'draft';

        // If not admin, check if already published/locked
        if ($user['role'] !== 'admin') {
            $lockCheck = $this->conn->prepare("SELECT status FROM grades WHERE course_id = :cid AND academic_term = :term AND academic_session = :session LIMIT 1");
            $lockCheck->execute([':cid' => $courseId, ':term' => $term, ':session' => $session]);
            $currentStatus = $lockCheck->fetchColumn();
            if ($currentStatus === 'published') {
                http_response_code(403);
                echo json_encode(["error" => "These results are published and locked. Contact the administrator to unlock for editing."]);
                return;
            }
        }
        
        try {
            $this->conn->beginTransaction();
            
            $query = "
                INSERT INTO grades (
                    student_id, course_id, academic_term, academic_session, 
                    ca1, ca2, exam, assignment_score, project_score, mid_term_test, 
                    score, max_score, remarks, graded_by, status
                ) VALUES (
                    :s, :c, :term, :session, 
                    :ca1, :ca2, :exam, :asgn, :proj, :test, 
                    :score, 100, :remarks, :g, :status
                ) ON DUPLICATE KEY UPDATE 
                    ca1 = :ca1, 
                    ca2 = :ca2, 
                    exam = :exam, 
                    assignment_score = :asgn,
                    project_score = :proj,
                    mid_term_test = :test,
                    score = :score, 
                    remarks = :remarks,
                    graded_by = :g,
                    status = :status
            ";
            
            $stmt = $this->conn->prepare($query);
            
            foreach ($data->grades as $g) {
                // Fetch existing grade record if it exists
                $findStmt = $this->conn->prepare("
                    SELECT assignment_score, project_score, mid_term_test, ca1, ca2, exam, status 
                    FROM grades 
                    WHERE student_id = :s AND course_id = :c AND academic_term = :term AND academic_session = :session
                ");
                $findStmt->execute([
                    ':s' => intval($g->student_id),
                    ':c' => $courseId,
                    ':term' => $term,
                    ':session' => $session
                ]);
                $existing = $findStmt->fetch();
                
                $asgn = isset($g->assignment_score) && $g->assignment_score !== "" ? floatval($g->assignment_score) : ($existing ? ($existing['assignment_score'] !== null ? floatval($existing['assignment_score']) : null) : null);
                $proj = isset($g->project_score) && $g->project_score !== "" ? floatval($g->project_score) : ($existing ? ($existing['project_score'] !== null ? floatval($existing['project_score']) : null) : null);
                $test = isset($g->mid_term_test) && $g->mid_term_test !== "" ? floatval($g->mid_term_test) : ($existing ? ($existing['mid_term_test'] !== null ? floatval($existing['mid_term_test']) : null) : null);
                
                $ca1 = ($asgn !== null || $proj !== null || $test !== null) ? (($asgn ?? 0) + ($proj ?? 0) + ($test ?? 0)) : 0;
                $ca2 = isset($g->ca2) && $g->ca2 !== "" ? floatval($g->ca2) : ($existing ? ($existing['ca2'] !== null ? floatval($existing['ca2']) : 0) : 0);
                $exam = isset($g->exam) && $g->exam !== "" ? floatval($g->exam) : ($existing ? ($existing['exam'] !== null ? floatval($existing['exam']) : 0) : 0);
                
                if ($resultMode === 'mid_term') {
                    $total = $ca1;
                } else {
                    $total = $ca1 + $ca2 + $exam;
                }
                
                $remarks = isset($g->remarks) ? $g->remarks : "";
                
                $stmt->execute([
                    ':s' => intval($g->student_id),
                    ':c' => $courseId,
                    ':term' => $term,
                    ':session' => $session,
                    ':ca1' => $ca1,
                    ':ca2' => $ca2,
                    ':exam' => $exam,
                    ':asgn' => $asgn,
                    ':proj' => $proj,
                    ':test' => $test,
                    ':score' => $total,
                    ':remarks' => $remarks,
                    ':g' => $user['id'],
                    ':status' => $targetStatus
                ]);
            }
            
            $this->conn->commit();
            echo json_encode(["success" => true, "message" => "Grades saved successfully."]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(["error" => "Failed to save grades: " . $e->getMessage()]);
        }
    }

    // Teacher: Submit grades for Admin Review
    public function submitGradesForApproval() {
        $teacher = Auth::requireRole(['teacher', 'admin']);
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->course_id)) {
            http_response_code(400);
            echo json_encode(["error" => "Course ID is required."]);
            return;
        }

        $courseId = intval($data->course_id);
        $term = $this->normalizeTerm($data->term ?? null);
        $session = isset($data->session) ? $data->session : $this->getSetting('academic_session', '2026/2027');

        try {
            $stmt = $this->conn->prepare("
                UPDATE grades 
                SET status = 'submitted' 
                WHERE course_id = :cid AND academic_term = :term AND academic_session = :session
            ");
            $stmt->execute([
                ':cid' => $courseId,
                ':term' => $term,
                ':session' => $session
            ]);

            echo json_encode(["success" => true, "message" => "Results submitted to Administration for approval."]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to submit grades: " . $e->getMessage()]);
        }
    }

    // Teacher: Request reopening of submitted / locked / published mark sheet
    public function requestReopenGrades() {
        $teacher = Auth::requireRole(['teacher', 'admin']);
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->course_id)) {
            http_response_code(400);
            echo json_encode(["error" => "Course ID is required."]);
            return;
        }

        $courseId = intval($data->course_id);
        $term = $this->normalizeTerm($data->term ?? null);
        $session = isset($data->session) ? $data->session : $this->getSetting('academic_session', '2026/2027');
        $reason = isset($data->reason) && !empty(trim($data->reason)) ? trim($data->reason) : "Teacher requested grade sheet reopening for adjustments.";

        try {
            $stmt = $this->conn->prepare("
                UPDATE grades 
                SET status = 'reopen_requested', reopen_reason = :reason 
                WHERE course_id = :cid AND academic_term = :term AND academic_session = :session
            ");
            $stmt->execute([
                ':reason' => $reason,
                ':cid' => $courseId,
                ':term' => $term,
                ':session' => $session
            ]);

            echo json_encode(["success" => true, "message" => "Reopening request sent to Administration for review."]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to request reopening: " . $e->getMessage()]);
        }
    }

    // Admin: List all subject grade submissions across the school
    public function getAdminGradeSubmissions() {
        Auth::requireRole(['admin']);

        $term = $this->normalizeTerm($_GET['term'] ?? null);
        $session = isset($_GET['session']) ? $_GET['session'] : $this->getSetting('academic_session', '2026/2027');

        try {
            // Look up term-level result release date
            $termKey = strtolower(str_replace([' ', 'st', 'nd', 'rd', 'th'], ['_', '', '', '', ''], $term));
            // Map e.g. '1st_term' -> 'term1', '2nd_term' -> 'term2', '3rd_term' -> 'term3'
            $termNum = preg_replace('/\D/', '', $termKey);
            $releaseKey = "result_release_date_term{$termNum}";
            $releaseDate = $this->getSetting($releaseKey, null);

            $query = "
                SELECT 
                    c.id as course_id,
                    c.name as course_name,
                    CONCAT(t.first_name, ' ', t.last_name) as teacher_name,
                    t.email as teacher_email,
                    COUNT(DISTINCT e.student_id) as enrolled_count,
                    COUNT(DISTINCT g.student_id) as graded_count,
                    ROUND(AVG(g.score), 1) as class_average,
                    COALESCE(MAX(g.status), 'draft') as status,
                    MAX(g.reopen_reason) as reopen_reason
                FROM courses c
                LEFT JOIN users t ON c.teacher_id = t.id
                LEFT JOIN enrollments e ON c.id = e.course_id
                LEFT JOIN grades g ON (c.id = g.course_id AND e.student_id = g.student_id AND g.academic_term = :term AND g.academic_session = :session)
                GROUP BY c.id, c.name, t.first_name, t.last_name, t.email
                ORDER BY c.name
            ";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute([':term' => $term, ':session' => $session]);
            $submissions = $stmt->fetchAll();

            echo json_encode([
                "success" => true,
                "term" => $term,
                "session" => $session,
                "result_release_date" => $releaseDate ?: null,
                "submissions" => $submissions
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to load grade submissions: " . $e->getMessage()]);
        }
    }

    // Admin: Preview grade sheet for a specific course
    public function getAdminGradePreview() {
        Auth::requireRole(['admin']);

        $courseId = isset($_GET['course_id']) ? intval($_GET['course_id']) : null;
        $term     = $this->normalizeTerm($_GET['term'] ?? null);
        $session  = isset($_GET['session']) ? $_GET['session'] : $this->getSetting('academic_session', '2026/2027');

        if (!$courseId) {
            http_response_code(400);
            echo json_encode(["error" => "course_id is required"]);
            return;
        }

        try {
            // Course info
            $course = $this->conn->prepare("SELECT c.id, c.name, CONCAT(t.first_name,' ',t.last_name) as teacher_name FROM courses c LEFT JOIN users t ON c.teacher_id=t.id WHERE c.id=:id");
            $course->execute([':id' => $courseId]);
            $courseInfo = $course->fetch();

            // Enrolled students with their grades
            $stmt = $this->conn->prepare("
                SELECT 
                    u.id, 
                    CONCAT(u.first_name,' ',u.last_name) as student_name,
                    u.admission_number,
                    g.ca1,
                    g.ca2,
                    g.exam,
                    g.score as total,
                    g.status,
                    g.reopen_reason,
                    g.auto_publish_at
                FROM enrollments e
                JOIN users u ON e.student_id = u.id
                LEFT JOIN grades g ON (e.student_id = g.student_id AND g.course_id = :cid AND g.academic_term = :term AND g.academic_session = :session)
                WHERE e.course_id = :cid2
                ORDER BY u.last_name, u.first_name
            ");
            $stmt->execute([
                ':cid'     => $courseId,
                ':term'    => $term,
                ':session' => $session,
                ':cid2'    => $courseId
            ]);
            $students = $stmt->fetchAll();

            echo json_encode([
                "success"  => true,
                "course"   => $courseInfo,
                "term"     => $term,
                "session"  => $session,
                "count"    => count($students),
                "students" => $students
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to load preview: " . $e->getMessage()]);
        }
    }

    // Admin: Batch update grade status (lock only, lock & publish, reopen/draft, auto-publish date)
    public function updateGradeStatus() {
        Auth::requireRole(['admin']);
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->course_id) || !isset($data->status)) {
            http_response_code(400);
            echo json_encode(["error" => "Course ID and Status are required."]);
            return;
        }

        $courseId = intval($data->course_id);
        $status = $data->status;
        if (!in_array($status, ['draft', 'submitted', 'locked', 'approved', 'published', 'reopen_requested'])) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid status value."]);
            return;
        }

        $term = $this->normalizeTerm($data->term ?? null);
        $session = isset($data->session) ? $data->session : $this->getSetting('academic_session', '2026/2027');
        $autoPublishAt = !empty($data->auto_publish_at) ? $data->auto_publish_at : null;

        try {
            $stmt = $this->conn->prepare("
                UPDATE grades 
                SET status = :status,
                    auto_publish_at = :auto_publish_at,
                    reopen_reason = CASE WHEN :status = 'draft' THEN NULL ELSE reopen_reason END
                WHERE course_id = :cid AND academic_term = :term AND academic_session = :session
            ");
            $stmt->execute([
                ':status' => $status,
                ':auto_publish_at' => $autoPublishAt,
                ':cid' => $courseId,
                ':term' => $term,
                ':session' => $session
            ]);

            $statusLabels = [
                'draft' => 're-opened for editing',
                'locked' => 'locked (awaiting publish)',
                'approved' => 'approved',
                'published' => 'published & locked'
            ];
            $msg = "Grades have been " . ($statusLabels[$status] ?? $status);
            if ($autoPublishAt) {
                $msg .= " and scheduled to auto-publish on " . $autoPublishAt;
            }

            echo json_encode(["success" => true, "message" => $msg]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to update grade status: " . $e->getMessage()]);
        }
    }

    // Student: Get their grades report
    public function getStudentGrades() {
        $student = Auth::requireRole(['student']);
        $this->respondStudentGrades($student['id']);
    }

    // Parent: Get their child's grades report
    public function getParentGrades() {
        $parent = Auth::requireRole(['parent']);
        
        $studentId = isset($_GET['student_id']) ? intval($_GET['student_id']) : null;
        if (!$studentId) {
            $stmt = $this->conn->prepare("SELECT student_id FROM parent_students WHERE parent_id = :pid LIMIT 1");
            $stmt->execute([':pid' => $parent['id']]);
            $studentId = $stmt->fetchColumn();
        }
        
        if (!$studentId) {
            http_response_code(404);
            echo json_encode(["error" => "No student linked to this parent"]);
            return;
        }
        
        $this->respondStudentGrades($studentId);
    }

    private function respondStudentGrades($studentId) {
        $systemResultMode = $this->getSetting('result_mode', 'end_of_term');
        $currentTerm     = $this->normalizeTerm($_GET['term'] ?? null);
        $session         = isset($_GET['session']) ? $_GET['session'] : $this->getSetting('academic_session', '2026/2027');

        // view_type from query string: 'terminal' | 'mid_term' | 'cumulative'
        // Falls back to system setting when not supplied
        $viewType = $_GET['view_type'] ?? ($systemResultMode === 'mid_term' ? 'mid_term' : 'terminal');
        if (!in_array($viewType, ['terminal', 'mid_term', 'cumulative'])) {
            $viewType = 'terminal';
        }
        // 1st Term cannot have cumulative — fall back to terminal
        if ($viewType === 'cumulative' && $currentTerm === '1st Term') {
            $viewType = 'terminal';
        }

        // 1. Fetch enrolled courses + grades for the requested term
        $gradesQuery = "
            SELECT
                c.id as course_id,
                c.name as subject,
                CONCAT(u.first_name, ' ', u.last_name) as teacher,
                g.ca1,
                g.ca2,
                g.exam,
                g.assignment_score,
                g.project_score,
                g.mid_term_test,
                g.score as total,
                g.remarks,
                g.status,
                g.auto_publish_at
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            LEFT JOIN users u ON c.teacher_id = u.id
            LEFT JOIN grades g ON (
                e.student_id = g.student_id
                AND g.course_id = c.id
                AND g.academic_term = :term
                AND g.academic_session = :session
                AND g.status = 'published'
            )
            WHERE e.student_id = :sid
            ORDER BY c.name
        ";
        $stmt = $this->conn->prepare($gradesQuery);
        $stmt->execute([':sid' => $studentId, ':term' => $currentTerm, ':session' => $session]);
        $grades = $stmt->fetchAll();

        // 2. Fetch all-term scores for cumulative calculations
        $allTermsStmt = $this->conn->prepare(
            "SELECT course_id, academic_term, score
             FROM grades
             WHERE student_id = :sid AND academic_session = :session"
        );
        $allTermsStmt->execute([':sid' => $studentId, ':session' => $session]);
        $termMatrix = [];
        foreach ($allTermsStmt->fetchAll() as $r) {
            $cid = $r['course_id'];
            $t   = $this->normalizeTerm($r['academic_term']);
            if (!isset($termMatrix[$cid])) {
                $termMatrix[$cid] = ['1st Term' => null, '2nd Term' => null, '3rd Term' => null];
            }
            $termMatrix[$cid][$t] = floatval($r['score']);
        }

        // 3. Build per-subject rows
        $formatted    = [];
        $totalSum     = 0;
        $highest      = 0;
        $highestSubject = 'N/A';
        $cumSum       = 0;
        $cumCount     = 0;

        foreach ($grades as $g) {
            $cid  = $g['course_id'];
            $t1   = $termMatrix[$cid]['1st Term'] ?? null;
            $t2   = $termMatrix[$cid]['2nd Term'] ?? null;
            $t3   = $termMatrix[$cid]['3rd Term'] ?? null;

            // --- TERMINAL ---
            if ($viewType === 'terminal') {
                $ca1  = floatval($g['ca1']  ?? 0);
                $ca2  = floatval($g['ca2']  ?? 0);
                $ca   = $ca1 + $ca2;
                $exam = floatval($g['exam'] ?? 0);
                $total = floatval($g['total'] ?? ($ca + $exam));
                $row  = [
                    'course_id'  => $cid,
                    'subject'    => $g['subject'],
                    'teacher'    => $g['teacher'] ?: 'Unassigned',
                    'view_type'  => 'terminal',
                    'ca1'        => $ca1,
                    'ca2'        => $ca2,
                    'ca'         => $ca,
                    'exam'       => $exam,
                    'total'      => $total,
                    'grade'      => $this->calculateGradeLetter($total),
                    'position'   => 'N/A',
                    'status'     => $g['status'] ?: 'draft',
                ];
                $totalSum += $total;
                if ($total > $highest) { $highest = $total; $highestSubject = $g['subject']; }
                $cumSum += $total; $cumCount++;
            }

            // --- MID-TERM ---
            elseif ($viewType === 'mid_term') {
                $asgn  = floatval($g['assignment_score'] ?? 0);
                $proj  = floatval($g['project_score']    ?? 0);
                $test  = floatval($g['mid_term_test']    ?? 0);
                $total = $asgn + $proj + $test;
                if      ($total >= 36) $rating = 'EXCELLENT';
                else if ($total >= 28) $rating = 'VERY GOOD';
                else if ($total >= 20) $rating  = 'GOOD';
                else if ($total >= 12) $rating  = 'FAIR';
                else                  $rating  = 'POOR';
                $row  = [
                    'course_id'   => $cid,
                    'subject'     => $g['subject'],
                    'teacher'     => $g['teacher'] ?: 'Unassigned',
                    'view_type'   => 'mid_term',
                    'assignment'  => $asgn,
                    'project'     => $proj,
                    'mid_term_test' => $test,
                    'total'       => $total,
                    'rating'      => $rating,
                    'status'      => $g['status'] ?: 'draft',
                ];
                $totalSum += $total; $cumSum += $total; $cumCount++;
            }

            // --- CUMULATIVE ---
            else {
                // 2nd Term cumulative: average of 1st + 2nd
                // 3rd Term cumulative: average of 1st + 2nd + 3rd
                if ($currentTerm === '2nd Term') {
                    $termsInAvg = array_filter([$t1, $t2], fn($v) => $v !== null);
                    $cumAvg     = count($termsInAvg) > 0 ? round(array_sum($termsInAvg) / count($termsInAvg), 1) : 0;
                } else { // 3rd Term
                    $termsInAvg = array_filter([$t1, $t2, $t3], fn($v) => $v !== null);
                    $cumAvg     = count($termsInAvg) > 0 ? round(array_sum($termsInAvg) / count($termsInAvg), 1) : 0;
                }
                $row = [
                    'course_id'  => $cid,
                    'subject'    => $g['subject'],
                    'teacher'    => $g['teacher'] ?: 'Unassigned',
                    'view_type'  => 'cumulative',
                    'term1'      => $t1,
                    'term2'      => $t2,
                    'term3'      => $currentTerm === '3rd Term' ? $t3 : null,
                    'cum_avg'    => $cumAvg,
                    'grade'      => $this->calculateGradeLetter($cumAvg),
                    'status'     => $g['status'] ?: 'draft',
                ];
                $cumSum += $cumAvg; $cumCount++;
                if ($cumAvg > $highest) { $highest = $cumAvg; $highestSubject = $g['subject']; }
            }

            $formatted[] = $row;
        }

        // 4. Averages
        $average       = count($formatted) > 0 ? round($totalSum / count($formatted), 1) : 0;
        $displayAverage = $viewType !== 'cumulative' ? $average
            : ($cumCount > 0 ? round($cumSum / $cumCount, 1) : 0);

        // 5. Promotion recommendation (ONLY in 3rd Term)
        $promotionDecision = null;
        $promotionColor = null;
        if ($currentTerm === '3rd Term') {
            $cStmt = $this->conn->prepare("SELECT c.name FROM users u LEFT JOIN classes c ON u.class_id = c.id WHERE u.id = :sid LIMIT 1");
            $cStmt->execute([':sid' => $studentId]);
            $currentClassName = $cStmt->fetchColumn() ?: '';
            $nextClass = $this->getNextClassName($currentClassName);

            $promScore = $displayAverage;
            if ($promScore >= 50) {
                $promotionDecision = 'PROMOTED TO ' . $nextClass;
                $promotionColor = '#219EBC';
            } else if ($promScore >= 40) {
                $promotionDecision = 'PROMOTED ON TRIAL';
                $promotionColor = '#FFB703';
            } else {
                $promotionDecision = 'ADVISED TO REPEAT';
                $promotionColor = '#ef4444';
            }
        }

        // 6. Class rank
        $rankStmt = $this->conn->prepare("
            SELECT e.student_id, AVG(COALESCE(g.score, 0)) as avg_score
            FROM enrollments e
            LEFT JOIN grades g ON (e.student_id = g.student_id AND e.course_id = g.course_id
                AND g.academic_term = :term AND g.academic_session = :session)
            GROUP BY e.student_id ORDER BY avg_score DESC
        ");
        $rankStmt->execute([':term' => $currentTerm, ':session' => $session]);
        $rankings  = $rankStmt->fetchAll();
        $rankPos   = 1;
        foreach ($rankings as $idx => $r) {
            if ($r['student_id'] == $studentId) { $rankPos = $idx + 1; break; }
        }
        $rankString = $this->formatOrdinal($rankPos) . ' / ' . count($rankings);

        // 7. Subject position (terminal only)
        if ($viewType === 'terminal') {
            foreach ($formatted as &$f) {
                $srStmt = $this->conn->prepare(
                    "SELECT student_id, score FROM grades
                     WHERE course_id = :cid AND academic_term = :term AND academic_session = :session
                     ORDER BY score DESC"
                );
                $srStmt->execute([':cid' => $f['course_id'], ':term' => $currentTerm, ':session' => $session]);
                $srRows = $srStmt->fetchAll();
                $pos    = 1;
                foreach ($srRows as $idx => $sr) {
                    if ($sr['student_id'] == $studentId) { $pos = $idx + 1; break; }
                }
                $f['position'] = $this->formatOrdinal($pos);
            }
        }

        // 8. Check term-level result release date
        $termNum = preg_replace('/\D/', '', $currentTerm);
        $releaseKey = "result_release_date_term{$termNum}";
        $releaseDate = $this->getSetting($releaseKey, null);
        $released = !$releaseDate || strtotime($releaseDate) <= time();

        echo json_encode([
            'term'               => $currentTerm,
            'session'            => $session,
            'view_type'          => $viewType,
            'result_mode'        => $systemResultMode,
            'average'            => $released ? $displayAverage : null,
            'annual_average'     => $released ? $displayAverage : null,
            'promotion_decision' => $released ? $promotionDecision : null,
            'promotion_color'    => $released ? $promotionColor : null,
            'rank'               => $released ? $rankString : null,
            'highest'            => $released ? $highest : null,
            'highest_subject'    => $released ? $highestSubject : null,
            'grades'             => $released ? $formatted : [],
            'result_release_date' => $releaseDate ?: null,
            'result_released'    => $released,
        ]);
    }



    private function calculateGradeLetter($score) {
        if ($score >= 70) return "A";
        if ($score >= 60) return "B";
        if ($score >= 50) return "C";
        if ($score >= 45) return "D";
        return "F";
    }

    private function formatOrdinal($number) {
        $ends = array('th','st','nd','rd','th','th','th','th','th','th');
        if ((($number % 100) >= 11) && (($number % 100) <= 13)) {
            return $number. 'th';
        } else {
            return $number. $ends[$number % 10];
        }
    }

    private function getNextClassName($currentClass) {
        if (empty($currentClass)) return "NEXT CLASS";
        if (preg_match('/(JSS|SS|SSS|Basic|Grade|Primary|NUR)\s*(\d+)/i', $currentClass, $m)) {
            $prefix = strtoupper($m[1]);
            $num = intval($m[2]);
            if ($prefix === 'JSS' && $num >= 3) return "SSS 1";
            if ($prefix === 'SSS' && $num >= 3) return "GRADUATION";
            if ($prefix === 'PRIMARY' && $num >= 6) return "JSS 1";
            if ($prefix === 'BASIC' && $num >= 9) return "SSS 1";
            return $prefix . " " . ($num + 1);
        }
        return "NEXT CLASS";
    }

    // Student/Parent: Get enrolled courses list with progress & topics
    public function getStudentCourses() {
        $user = Auth::authenticate();
        $studentId = $user['id'];
        
        if ($user['role'] === 'parent') {
            $stmt = $this->conn->prepare("SELECT student_id FROM parent_students WHERE parent_id = :pid LIMIT 1");
            $stmt->execute([':pid' => $user['id']]);
            $studentId = $stmt->fetchColumn();
        }
        
        if (!$studentId) {
            echo json_encode([]);
            return;
        }

        $term = $this->getSetting('current_term', '2nd Term');
        $session = $this->getSetting('academic_session', '2026/2027');

        $query = "
            SELECT 
                c.id, 
                c.name, 
                c.description as subject, 
                c.topics,
                CONCAT(t.first_name, ' ', t.last_name) as teacher, 
                e.progress, 
                COALESCE(g.score, 0) as score
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            LEFT JOIN users t ON c.teacher_id = t.id
            LEFT JOIN grades g ON (e.student_id = g.student_id AND g.course_id = c.id AND g.academic_term = :term AND g.academic_session = :session)
            WHERE e.student_id = :sid
        ";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute([':sid' => $studentId, ':term' => $term, ':session' => $session]);
        $courses = $stmt->fetchAll();
        
        $colors = ["#219EBC", "#8ECAE6", "#FFB703", "#FB8500"];
        $formatted = [];
        foreach ($courses as $idx => $c) {
            $topics = $c['topics'] ? explode(',', $c['topics']) : ["Overview", "Basics", "Advanced"];
            $formatted[] = [
                "id" => intval($c['id']),
                "name" => $c['name'],
                "subject" => $c['subject'] ?: "General Science",
                "teacher" => $c['teacher'] ?: "Unassigned",
                "progress" => intval($c['progress']),
                "score" => floatval($c['score']),
                "students" => rand(30, 45),
                "duration" => "12 weeks",
                "status" => "active",
                "color" => $colors[$idx % count($colors)],
                "topics" => $topics
            ];
        }
        
        echo json_encode($formatted);
    }

    // Student: Get available courses for enrollment
    public function getAvailableCourses() {
        $student = Auth::requireRole(['student']);
        
        $stmt = $this->conn->prepare("SELECT class_id FROM users WHERE id = :id");
        $stmt->execute([':id' => $student['id']]);
        $classId = $stmt->fetchColumn();

        if (!$classId) {
            echo json_encode(["error" => "You have not been assigned to a class yet.", "core" => [], "electives" => []]);
            return;
        }

        $stmt = $this->conn->prepare("
            SELECT cs.course_id, c.name, cs.type, cs.elective_group 
            FROM class_subjects cs
            JOIN courses c ON cs.course_id = c.id
            WHERE cs.class_id = :cid
        ");
        $stmt->execute([':cid' => $classId]);
        $subjects = $stmt->fetchAll();

        $stmt = $this->conn->prepare("SELECT course_id FROM enrollments WHERE student_id = :sid");
        $stmt->execute([':sid' => $student['id']]);
        $enrolledIds = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $core = [];
        $electives = [];

        foreach ($subjects as $s) {
            $isEnrolled = in_array($s['course_id'], $enrolledIds);
            $subjectData = [
                "course_id" => $s['course_id'],
                "name" => $s['name'],
                "enrolled" => $isEnrolled
            ];

            if ($s['type'] === 'core') {
                $core[] = $subjectData;
            } else {
                $group = $s['elective_group'] ?: "Other Electives";
                if (!isset($electives[$group])) {
                    $electives[$group] = [];
                }
                $electives[$group][] = $subjectData;
            }
        }

        echo json_encode([
            "class_id" => $classId,
            "core" => $core,
            "electives" => $electives
        ]);
    }

    // Student: Enroll in courses
    public function enrollCourses() {
        $student = Auth::requireRole(['student']);
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->course_ids) || !is_array($data->course_ids)) {
            http_response_code(400);
            echo json_encode(["error" => "No courses provided"]);
            return;
        }

        try {
            $this->conn->beginTransaction();

            $stmt = $this->conn->prepare("INSERT IGNORE INTO enrollments (student_id, course_id, progress) VALUES (:s, :c, 0)");
            
            foreach ($data->course_ids as $cid) {
                $stmt->execute([
                    ':s' => $student['id'],
                    ':c' => intval($cid)
                ]);
            }

            $this->conn->commit();
            echo json_encode(["success" => true, "message" => "Successfully enrolled in courses."]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(["error" => "Enrollment failed: " . $e->getMessage()]);
        }
    }

    // Student: Deregister/drop a course
    public function deregisterCourse() {
        $student = Auth::requireRole(['student']);
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->course_id)) {
            http_response_code(400);
            echo json_encode(["error" => "Course ID required"]);
            return;
        }

        $stmt = $this->conn->prepare("SELECT class_id FROM users WHERE id = :id");
        $stmt->execute([':id' => $student['id']]);
        $classId = $stmt->fetchColumn();

        if ($classId) {
            $checkStmt = $this->conn->prepare("SELECT type FROM class_subjects WHERE class_id = :cid AND course_id = :coid");
            $checkStmt->execute([':cid' => $classId, ':coid' => $data->course_id]);
            $type = $checkStmt->fetchColumn();

            if ($type === 'core') {
                http_response_code(403);
                echo json_encode(["error" => "You cannot deregister from a core subject."]);
                return;
            }
        }

        try {
            $stmt = $this->conn->prepare("DELETE FROM enrollments WHERE student_id = :sid AND course_id = :cid");
            $stmt->execute([
                ':sid' => $student['id'],
                ':cid' => intval($data->course_id)
            ]);
            echo json_encode(["success" => true, "message" => "Course dropped."]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to drop course: " . $e->getMessage()]);
        }
    }
}
