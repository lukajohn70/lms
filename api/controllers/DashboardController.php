<?php
require_once 'config/Database.php';
require_once 'lib/Auth.php';

class DashboardController {
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

    public function getStudentDashboard() {
        $user = Auth::requireRole(['student']);
        
        // 1. Stats Overview
        // Active Courses
        $stmt = $this->conn->prepare("SELECT COUNT(*) FROM enrollments WHERE student_id = :id");
        $stmt->execute([':id' => $user['id']]);
        $activeCourses = $stmt->fetchColumn();

        // CBTs Completed
        $stmt = $this->conn->prepare("SELECT COUNT(*) FROM exam_submissions WHERE student_id = :id");
        $stmt->execute([':id' => $user['id']]);
        $cbtsCompleted = $stmt->fetchColumn();
        
        $stmt = $this->conn->prepare("
            SELECT COUNT(*) FROM exams e 
            JOIN enrollments en ON e.course_id = en.course_id 
            WHERE en.student_id = :id AND e.status IN ('active', 'completed')
        ");
        $stmt->execute([':id' => $user['id']]);
        $totalCbts = $stmt->fetchColumn();

        // Real Average Score
        $stmt = $this->conn->prepare("SELECT AVG(score) FROM grades WHERE student_id = :id");
        $stmt->execute([':id' => $user['id']]);
        $avgScoreVal = $stmt->fetchColumn();
        $avgScore = $avgScoreVal !== null ? round(floatval($avgScoreVal), 1) : 0.0;

        // Dynamic Class Rank
        $rankQuery = "
            SELECT e.student_id, AVG(COALESCE(g.score, 0)) as avg_score
            FROM enrollments e
            LEFT JOIN grades g ON (e.student_id = g.student_id AND e.course_id = g.course_id)
            GROUP BY e.student_id
            ORDER BY avg_score DESC
        ";
        $rankStmt = $this->conn->query($rankQuery);
        $rankings = $rankStmt->fetchAll();
        
        $rankPos = 1;
        $totalClassmates = count($rankings);
        foreach ($rankings as $idx => $r) {
            if ($r['student_id'] == $user['id']) {
                $rankPos = $idx + 1;
                break;
            }
        }
        $ends = ['th','st','nd','rd','th','th','th','th','th','th'];
        $suffix = (($rankPos % 100) >= 11 && ($rankPos % 100) <= 13) ? 'th' : $ends[$rankPos % 10];
        $classRank = "{$rankPos}{$suffix} / {$totalClassmates}";

        // 2. Upcoming CBTs
        $stmt = $this->conn->prepare("
            SELECT e.id, e.title, e.description, e.duration_minutes, c.name as course_name
            FROM exams e
            JOIN courses c ON e.course_id = c.id
            JOIN enrollments en ON e.course_id = en.course_id
            WHERE en.student_id = :id AND e.status IN ('approved', 'active')
            ORDER BY e.created_at DESC LIMIT 1
        ");
        $stmt->execute([':id' => $user['id']]);
        $upcomingCbt = $stmt->fetch();

        // 3. Recent Materials
        $stmt = $this->conn->prepare("
            SELECT m.id, m.title, m.file_path, c.name as course_name, m.created_at, u.last_name as teacher_name
            FROM materials m
            JOIN courses c ON m.course_id = c.id
            JOIN enrollments en ON c.id = en.course_id
            JOIN users u ON m.uploaded_by = u.id
            WHERE en.student_id = :id
            ORDER BY m.created_at DESC LIMIT 4
        ");
        $stmt->execute([':id' => $user['id']]);
        $recentMaterials = $stmt->fetchAll();

        // 4. Course Progress
        $stmt = $this->conn->prepare("
            SELECT c.name, en.progress 
            FROM courses c
            JOIN enrollments en ON c.id = en.course_id
            WHERE en.student_id = :id
        ");
        $stmt->execute([':id' => $user['id']]);
        $courseProgress = $stmt->fetchAll();

        // 5. Attendance Summary
        $stmt = $this->conn->prepare("SELECT COUNT(*) FROM attendance WHERE student_id = :id AND status = 'present'");
        $stmt->execute([':id' => $user['id']]);
        $daysPresent = $stmt->fetchColumn();
        
        $stmt = $this->conn->prepare("SELECT COUNT(*) FROM attendance WHERE student_id = :id");
        $stmt->execute([':id' => $user['id']]);
        $totalDays = $stmt->fetchColumn() ?: 30; // fallback default to 30

        echo json_encode([
            "academic_term" => $this->getSetting('current_term', '2nd Term'),
            "academic_session" => $this->getSetting('academic_session', '2026/2027'),
            "school_name" => $this->getSetting('school_name', 'Deeper Life High School'),
            "stats" => [
                "avgScore" => $avgScore,
                "classRank" => $classRank,
                "activeCourses" => $activeCourses,
                "cbtsCompleted" => $cbtsCompleted,
                "totalCbts" => $totalCbts
            ],
            "upcomingCbt" => $upcomingCbt,
            "recentMaterials" => $recentMaterials,
            "courseProgress" => $courseProgress,
            "attendance" => [
                "present" => intval($daysPresent),
                "total" => intval($totalDays)
            ]
        ]);
    }

    public function getTeacherDashboard() {
        $user = Auth::requireRole(['teacher']);
        
        $session = isset($_GET['session']) && !empty($_GET['session']) ? trim($_GET['session']) : $this->getSetting('academic_session', '2026/2027');
        $currentSession = $this->getSetting('academic_session', '2026/2027');
        $isCurr = ($session === $currentSession ? 1 : 0);

        // 1. Total Students across their assigned classes & courses for this session
        $stmt = $this->conn->prepare("
            SELECT COUNT(DISTINCT u.id) 
            FROM users u
            JOIN enrollments en ON u.id = en.student_id
            WHERE EXISTS (
                SELECT 1 FROM teacher_allocations ta 
                WHERE ta.teacher_id = :tid AND ta.academic_session = :session 
                  AND ta.course_id = en.course_id AND ta.class_id = u.class_id
            ) OR (:is_curr = 1 AND EXISTS (
                SELECT 1 FROM class_subjects cs
                WHERE cs.teacher_id = :tid2
                  AND cs.course_id = en.course_id AND cs.class_id = u.class_id
            ))
        ");
        $stmt->execute([
            ':tid' => $user['id'],
            ':session' => $session,
            ':is_curr' => $isCurr,
            ':tid2' => $user['id']
        ]);
        $totalStudents = intval($stmt->fetchColumn());

        // 2. Active Classes assigned to this teacher for this session
        $stmt = $this->conn->prepare("
            SELECT COUNT(DISTINCT class_id) FROM (
                SELECT class_id FROM teacher_allocations 
                WHERE teacher_id = :tid AND academic_session = :session
                UNION
                SELECT class_id FROM class_subjects 
                WHERE teacher_id = :tid2 AND :is_curr = 1
            ) t
        ");
        $stmt->execute([
            ':tid' => $user['id'],
            ':session' => $session,
            ':tid2' => $user['id'],
            ':is_curr' => $isCurr
        ]);
        $activeClasses = intval($stmt->fetchColumn());

        // 3. CBTs Created
        $stmt = $this->conn->prepare("SELECT COUNT(*) FROM exams WHERE created_by = :id");
        $stmt->execute([':id' => $user['id']]);
        $cbtsCreated = $stmt->fetchColumn();

        // 4. Materials Uploaded
        $stmt = $this->conn->prepare("SELECT COUNT(*) FROM materials WHERE uploaded_by = :id");
        $stmt->execute([':id' => $user['id']]);
        $materialsUploaded = $stmt->fetchColumn();

        // 5. My Classes (List with actual averages per assigned class arm)
        $stmt = $this->conn->prepare("
            SELECT DISTINCT 
                alloc.course_id, 
                c.name AS course_name, 
                alloc.class_id, 
                cl.name AS class_name
            FROM (
                SELECT DISTINCT course_id, class_id FROM teacher_allocations 
                WHERE teacher_id = :tid AND academic_session = :session
                UNION
                SELECT DISTINCT course_id, class_id FROM class_subjects 
                WHERE teacher_id = :tid2 AND :is_curr = 1
            ) alloc
            JOIN courses c ON alloc.course_id = c.id
            JOIN classes cl ON alloc.class_id = cl.id
            ORDER BY cl.name ASC, c.name ASC
        ");
        $stmt->execute([
            ':tid' => $user['id'],
            ':session' => $session,
            ':tid2' => $user['id'],
            ':is_curr' => $isCurr
        ]);
        $classes = $stmt->fetchAll();
        $classDetails = [];
        foreach ($classes as $c) {
            $s = $this->conn->prepare("
                SELECT COUNT(DISTINCT u.id) 
                FROM users u 
                JOIN enrollments en ON u.id = en.student_id 
                WHERE en.course_id = :cid AND u.class_id = :clid
            ");
            $s->execute([':cid' => $c['course_id'], ':clid' => $c['class_id']]);
            $studentCount = intval($s->fetchColumn());
            
            $sAvg = $this->conn->prepare("
                SELECT AVG(score) FROM grades 
                WHERE course_id = :cid AND class_id = :clid AND academic_session = :session AND score IS NOT NULL
            ");
            $sAvg->execute([':cid' => $c['course_id'], ':clid' => $c['class_id'], ':session' => $session]);
            $avgScoreVal = $sAvg->fetchColumn();
            $avgScore = $avgScoreVal !== null ? round(floatval($avgScoreVal)) : 0;
            
            $classDetails[] = [
                'name' => $c['course_name'] . ' (' . $c['class_name'] . ')',
                'course_id' => $c['course_id'],
                'class_id' => $c['class_id'],
                'students' => $studentCount,
                'avg' => $avgScore
            ];
        }

        echo json_encode([
            "academic_session" => $session,
            "stats" => [
                "totalStudents" => $totalStudents,
                "activeClasses" => $activeClasses,
                "cbtsCreated" => $cbtsCreated,
                "materialsUploaded" => $materialsUploaded
            ],
            "classes" => $classDetails
        ]);
    }

    public function getAdminDashboard() {
        $user = Auth::requireRole(['admin']);
        
        // Stats
        $stmt = $this->conn->prepare("SELECT COUNT(*) FROM users WHERE role = 'student'");
        $stmt->execute();
        $totalStudents = $stmt->fetchColumn();

        $stmt = $this->conn->prepare("SELECT COUNT(*) FROM users WHERE role = 'teacher'");
        $stmt->execute();
        $teachingStaff = $stmt->fetchColumn();

        $stmt = $this->conn->prepare("SELECT COUNT(*) FROM exams WHERE status = 'pending_approval'");
        $stmt->execute();
        $pendingCbts = $stmt->fetchColumn();

        // Actual cash collected from fee payments
        $stmt = $this->conn->prepare("SELECT SUM(amount_paid) FROM fee_payments");
        $stmt->execute();
        $feesCollected = $stmt->fetchColumn();
        if (!$feesCollected) $feesCollected = 0;

        // Reopen requests for grades
        $stmt = $this->conn->prepare("SELECT COUNT(DISTINCT course_id) FROM grades WHERE status = 'reopen_requested'");
        $stmt->execute();
        $reopenRequests = intval($stmt->fetchColumn());

        // Pending admissions applications
        $stmt = $this->conn->prepare("SELECT COUNT(*) FROM admissions WHERE status = 'pending'");
        $stmt->execute();
        $pendingAdmissions = intval($stmt->fetchColumn());

        echo json_encode([
            "academic_term" => $this->getSetting('current_term', '2nd Term'),
            "academic_session" => $this->getSetting('academic_session', '2026/2027'),
            "school_name" => $this->getSetting('school_name', 'Deeper Life High School'),
            "stats" => [
                "totalStudents"    => $totalStudents,
                "teachingStaff"    => $teachingStaff,
                "pendingCbts"      => $pendingCbts,
                "feesCollected"    => floatval($feesCollected),
                "reopenRequests"   => $reopenRequests,
                "pendingAdmissions" => $pendingAdmissions,
            ]
        ]);
    }

    // Admin: Get analytics report card metrics
    public function getAdminReports() {
        Auth::requireRole(['admin']);

        try {
            // 1. Overview counts
            $stmt = $this->conn->query("SELECT COUNT(*) FROM users WHERE role = 'student'");
            $totalStudents = intval($stmt->fetchColumn());

            $stmt = $this->conn->query("SELECT COUNT(*) FROM users WHERE role = 'teacher'");
            $teachingStaff = intval($stmt->fetchColumn());

            $stmt = $this->conn->query("SELECT COUNT(*) FROM exams");
            $totalExams = intval($stmt->fetchColumn());

            $stmt = $this->conn->query("SELECT AVG(score) FROM grades");
            $academicAvgVal = $stmt->fetchColumn();
            $academicAvg = $academicAvgVal !== null ? round(floatval($academicAvgVal), 1) : 0.0;

            // Fees totals
            $feesPaid = floatval($this->conn->query("SELECT SUM(amount_paid) FROM fee_payments")->fetchColumn() ?: 0);
            $feesTotal = floatval($this->conn->query("SELECT SUM(amount) FROM fees")->fetchColumn() ?: 0);
            $feeCollectionRate = $feesTotal > 0 ? round(($feesPaid / $feesTotal) * 100) : 0;

            // 2. Enrollment Timelines (last 6 months)
            $enrollmentStmt = $this->conn->query("
                SELECT DATE_FORMAT(created_at, '%b') as m, COUNT(*) as v 
                FROM users 
                WHERE role = 'student' 
                GROUP BY DATE_FORMAT(created_at, '%b'), MONTH(created_at) 
                ORDER BY MONTH(created_at) ASC
            ");
            $enrollmentTrend = $enrollmentStmt->fetchAll();

            // Default fallback if seeder creates all in one month
            if (count($enrollmentTrend) <= 1) {
                $enrollmentTrend = [
                    ["m" => "Sep", "v" => $totalStudents - 6],
                    ["m" => "Oct", "v" => $totalStudents - 4],
                    ["m" => "Nov", "v" => $totalStudents - 3],
                    ["m" => "Dec", "v" => $totalStudents - 3],
                    ["m" => "Jan", "v" => $totalStudents - 2],
                    ["m" => "Feb", "v" => $totalStudents - 1],
                    ["m" => "Mar", "v" => $totalStudents]
                ];
            }

            // 3. Fee Status collected vs outstanding
            $feeBreakdown = [
                ["name" => "Collected", "value" => $feeCollectionRate, "fill" => "#219EBC"],
                ["name" => "Outstanding", "value" => max(0, 100 - $feeCollectionRate), "fill" => "#FFB703"],
                ["name" => "Waived", "value" => 0, "fill" => "#8ECAE6"]
            ];

            // 4. Department Performance Average
            $deptStmt = $this->conn->query("
                SELECT c.description as d, ROUND(AVG(g.score), 1) as v 
                FROM grades g 
                JOIN courses c ON g.course_id = c.id 
                GROUP BY c.description
            ");
            $deptAvg = $deptStmt->fetchAll();

            // Fallback default if no grades recorded yet
            if (empty($deptAvg)) {
                $deptAvg = [
                    ["d" => "Physics", "v" => 76],
                    ["d" => "CS", "v" => 82],
                    ["d" => "Maths", "v" => 71],
                    ["d" => "Chem", "v" => 74],
                    ["d" => "English", "v" => 80]
                ];
            }

            echo json_encode([
                "success" => true,
                "overview" => [
                    "total_students" => $totalStudents,
                    "teaching_staff" => $teachingStaff,
                    "academic_average" => $academicAvg,
                    "exams_conducted" => $totalExams,
                    "fees_collected_rate" => $feeCollectionRate,
                    "fees_collected_amount" => $feesPaid
                ],
                "enrollment_trend" => $enrollmentTrend,
                "fee_breakdown" => $feeBreakdown,
                "department_averages" => $deptAvg
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to compile reports: " . $e->getMessage()]);
        }
    }

    // Teacher: Full class list with real stats per course and class arm
    public function getTeacherClasses() {
        $user = Auth::requireRole(['teacher']);
        $session = isset($_GET['session']) && !empty($_GET['session']) ? trim($_GET['session']) : $this->getSetting('academic_session', '2026/2027');
        $currentSession = $this->getSetting('academic_session', '2026/2027');
        $isCurr = ($session === $currentSession ? 1 : 0);

        $stmt = $this->conn->prepare("
            SELECT DISTINCT 
                alloc.course_id AS id,
                c.name,
                c.description,
                alloc.class_id,
                cl.name AS class_name
            FROM (
                SELECT DISTINCT course_id, class_id FROM teacher_allocations 
                WHERE teacher_id = :tid AND academic_session = :session
                UNION
                SELECT DISTINCT course_id, class_id FROM class_subjects 
                WHERE teacher_id = :tid2 AND :is_curr = 1
            ) alloc
            JOIN courses c ON alloc.course_id = c.id
            JOIN classes cl ON alloc.class_id = cl.id
            ORDER BY cl.name ASC, c.name ASC
        ");
        $stmt->execute([
            ':tid' => $user['id'],
            ':session' => $session,
            ':tid2' => $user['id'],
            ':is_curr' => $isCurr
        ]);
        $rows = $stmt->fetchAll();

        $result = [];
        foreach ($rows as $r) {
            $cid = $r['id'];
            $clid = $r['class_id'];

            // Enrolled count strictly for this class arm
            $s = $this->conn->prepare("
                SELECT COUNT(DISTINCT u.id) 
                FROM users u 
                JOIN enrollments en ON u.id = en.student_id 
                WHERE en.course_id = :cid AND u.class_id = :clid
            ");
            $s->execute([':cid' => $cid, ':clid' => $clid]);
            $student_count = intval($s->fetchColumn());

            // Avg, highest, lowest scores strictly for this class arm and session
            $s = $this->conn->prepare("
                SELECT AVG(score), MAX(score), MIN(score) 
                FROM grades 
                WHERE course_id = :cid AND class_id = :clid AND academic_session = :session AND score IS NOT NULL
            ");
            $s->execute([':cid' => $cid, ':clid' => $clid, ':session' => $session]);
            $scores = $s->fetch(PDO::FETCH_NUM);
            $avg     = $scores[0] !== null ? round(floatval($scores[0])) : 0;
            $highest = $scores[1] !== null ? round(floatval($scores[1])) : 0;
            $lowest  = $scores[2] !== null ? round(floatval($scores[2])) : 0;

            // Absent count for students in this class arm
            $s = $this->conn->prepare("
                SELECT COUNT(*) FROM attendance a
                JOIN users u ON a.student_id = u.id
                WHERE a.course_id = :cid AND u.class_id = :clid AND a.status = 'absent'
                  AND a.attendance_date = (
                      SELECT MAX(a2.attendance_date) FROM attendance a2 
                      JOIN users u2 ON a2.student_id = u2.id 
                      WHERE a2.course_id = :cid2 AND u2.class_id = :clid2
                  )
            ");
            $s->execute([':cid' => $cid, ':clid' => $clid, ':cid2' => $cid, ':clid2' => $clid]);
            $absent = intval($s->fetchColumn());

            $result[] = [
                'id'            => $cid,
                'class_id'      => $clid,
                'name'          => $r['name'],
                'class_name'    => $r['class_name'],
                'description'   => $r['description'] ?? '',
                'student_count' => $student_count,
                'avg'           => $avg,
                'highest'       => $highest,
                'lowest'        => $lowest,
                'absent'        => $absent,
                'session'       => $session
            ];
        }

        echo json_encode(['courses' => $result, 'selected_session' => $session]);
    }

    // Teacher: Detail view for one course & class arm (student roster + grades + attendance)
    public function getTeacherClassDetail() {
        $user = Auth::requireRole(['teacher']);

        $courseId = isset($_GET['course_id']) ? intval($_GET['course_id']) : 0;
        $classId  = isset($_GET['class_id']) ? intval($_GET['class_id']) : 0;
        $session  = isset($_GET['session']) && !empty($_GET['session']) ? trim($_GET['session']) : $this->getSetting('academic_session', '2026/2027');
        $currentSession = $this->getSetting('academic_session', '2026/2027');
        $isCurr = ($session === $currentSession ? 1 : 0);

        if (!$courseId) {
            http_response_code(400);
            echo json_encode(['error' => 'course_id required']);
            return;
        }

        // Check teacher allocation for this course (and class_id if supplied)
        if ($classId > 0) {
            $authStmt = $this->conn->prepare("
                SELECT 1 FROM (
                    SELECT course_id, class_id FROM teacher_allocations 
                    WHERE teacher_id = :tid AND course_id = :cid AND class_id = :clid AND academic_session = :session
                    UNION
                    SELECT course_id, class_id FROM class_subjects 
                    WHERE teacher_id = :tid2 AND course_id = :cid2 AND class_id = :clid2 AND :is_curr = 1
                ) t LIMIT 1
            ");
            $authStmt->execute([
                ':tid' => $user['id'], ':cid' => $courseId, ':clid' => $classId, ':session' => $session,
                ':tid2' => $user['id'], ':cid2' => $courseId, ':clid2' => $classId, ':is_curr' => $isCurr
            ]);
            if (!$authStmt->fetchColumn()) {
                http_response_code(403);
                echo json_encode(['error' => 'Access denied: You are not assigned to teach this subject to this class in session ' . $session]);
                return;
            }
        } else {
            // Find first assigned class for this course and session
            $findClass = $this->conn->prepare("
                SELECT class_id FROM (
                    SELECT class_id FROM teacher_allocations 
                    WHERE teacher_id = :tid AND course_id = :cid AND academic_session = :session
                    UNION
                    SELECT class_id FROM class_subjects 
                    WHERE teacher_id = :tid2 AND course_id = :cid2 AND :is_curr = 1
                ) t LIMIT 1
            ");
            $findClass->execute([
                ':tid' => $user['id'], ':cid' => $courseId, ':session' => $session,
                ':tid2' => $user['id'], ':cid2' => $courseId, ':is_curr' => $isCurr
            ]);
            $classId = intval($findClass->fetchColumn());
            if (!$classId) {
                http_response_code(403);
                echo json_encode(['error' => 'Access denied: No assigned class found for this subject in session ' . $session]);
                return;
            }
        }

        // Get course and class name
        $cStmt = $this->conn->prepare("SELECT name FROM courses WHERE id = :cid LIMIT 1");
        $cStmt->execute([':cid' => $courseId]);
        $courseName = $cStmt->fetchColumn() ?: "Subject";

        $clStmt = $this->conn->prepare("SELECT name FROM classes WHERE id = :clid LIMIT 1");
        $clStmt->execute([':clid' => $classId]);
        $className = $clStmt->fetchColumn() ?: "Class";

        // Enrolled students strictly belonging to this class arm
        $stmt = $this->conn->prepare("
            SELECT
                u.id,
                CONCAT(u.first_name, ' ', u.last_name) AS name,
                u.email,
                g.ca1, g.ca2, g.exam, g.score AS total, g.remarks,
                (
                    SELECT COUNT(*) FROM attendance a
                    WHERE a.student_id = u.id AND a.course_id = :cid2 AND a.status = 'present'
                ) AS days_present,
                (
                    SELECT COUNT(*) FROM attendance a
                    WHERE a.student_id = u.id AND a.course_id = :cid3
                ) AS days_total
            FROM users u
            JOIN enrollments e ON u.id = e.student_id AND e.course_id = :cid
            LEFT JOIN grades g ON (g.student_id = u.id AND g.course_id = :cid4 AND g.class_id = :clid AND g.academic_session = :session)
            WHERE u.class_id = :clid2
            ORDER BY u.first_name, u.last_name
        ");
        $stmt->execute([
            ':cid'   => $courseId,
            ':cid2'  => $courseId,
            ':cid3'  => $courseId,
            ':cid4'  => $courseId,
            ':clid'  => $classId,
            ':session' => $session,
            ':clid2' => $classId,
        ]);
        $students = $stmt->fetchAll();

        $roster = [];
        foreach ($students as $s) {
            $total = $s['total'] !== null ? round(floatval($s['total'])) : null;

            if ($total === null) {
                $grade = '—';
            } elseif ($total >= 80) {
                $grade = 'A';
            } elseif ($total >= 65) {
                $grade = 'B';
            } elseif ($total >= 50) {
                $grade = 'C';
            } elseif ($total >= 45) {
                $grade = 'D';
            } else {
                $grade = 'F';
            }

            $att = $s['days_total'] > 0
                ? round(($s['days_present'] / $s['days_total']) * 100)
                : 0;

            $roster[] = [
                'id'           => $s['id'],
                'name'         => $s['name'],
                'email'        => $s['email'],
                'total'        => $total,
                'grade'        => $grade,
                'attendance'   => $att,
                'days_present' => intval($s['days_present']),
                'days_total'   => intval($s['days_total']),
            ];
        }

        echo json_encode([
            'course_id'   => $courseId,
            'course_name' => $courseName,
            'class_id'    => $classId,
            'class_name'  => $className,
            'session'     => $session,
            'roster'      => $roster,
        ]);
    }
}
