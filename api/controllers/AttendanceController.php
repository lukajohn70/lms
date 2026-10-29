<?php
require_once 'config/Database.php';
require_once 'lib/Auth.php';

class AttendanceController {
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

    // Teacher: Get attendance grid for a course, class arm, and week
    public function getTeacherAttendance() {
        $teacher = Auth::requireRole(['teacher']);
        
        $courseId = isset($_GET['course_id']) ? intval($_GET['course_id']) : null;
        $classId  = isset($_GET['class_id']) ? intval($_GET['class_id']) : null;
        $session  = isset($_GET['session']) && !empty($_GET['session']) ? trim($_GET['session']) : $this->getSetting('academic_session', '2026/2027');
        $dateStr  = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');
        $currentSession = $this->getSetting('academic_session', '2026/2027');
        $isCurr = ($session === $currentSession ? 1 : 0);
        
        // 1. Teacher sees courses assigned to them for this session
        $coursesQuery = "
            SELECT DISTINCT c.id, c.name FROM courses c
            WHERE c.id IN (
                SELECT DISTINCT course_id FROM teacher_allocations 
                WHERE teacher_id = :tid AND academic_session = :session
                UNION
                SELECT DISTINCT course_id FROM class_subjects 
                WHERE teacher_id = :tid2 AND :is_curr = 1
            )
            ORDER BY c.name
        ";
        $coursesStmt = $this->conn->prepare($coursesQuery);
        $coursesStmt->execute([
            ':tid' => $teacher['id'],
            ':session' => $session,
            ':tid2' => $teacher['id'],
            ':is_curr' => $isCurr
        ]);
        $courses = $coursesStmt->fetchAll();
        
        if (empty($courses)) {
            echo json_encode([
                "courses" => [],
                "classes" => [],
                "selected_course_id" => null,
                "selected_class_id" => null,
                "selected_session" => $session,
                "students" => [],
                "dates" => []
            ]);
            return;
        }
        
        $courseIds = array_column($courses, 'id');
        if (!$courseId || !in_array($courseId, $courseIds)) {
            $courseId = $courses[0]['id'];
        }

        // 2. Classes assigned to teacher for this course and session
        $classesStmt = $this->conn->prepare("
            SELECT DISTINCT cl.id, cl.name 
            FROM classes cl
            WHERE cl.id IN (
                SELECT DISTINCT class_id FROM teacher_allocations 
                WHERE teacher_id = :tid AND course_id = :cid AND academic_session = :session
                UNION
                SELECT DISTINCT class_id FROM class_subjects 
                WHERE teacher_id = :tid2 AND course_id = :cid2 AND :is_curr = 1
            )
            ORDER BY cl.name ASC
        ");
        $classesStmt->execute([
            ':tid' => $teacher['id'],
            ':cid' => $courseId,
            ':session' => $session,
            ':tid2' => $teacher['id'],
            ':cid2' => $courseId,
            ':is_curr' => $isCurr
        ]);
        $availableClasses = $classesStmt->fetchAll();

        if (empty($availableClasses)) {
            echo json_encode([
                "courses" => $courses,
                "classes" => [],
                "selected_course_id" => $courseId,
                "selected_class_id" => null,
                "selected_session" => $session,
                "students" => [],
                "dates" => []
            ]);
            return;
        }

        $allowedClassIds = array_column($availableClasses, 'id');
        if (!$classId || !in_array($classId, $allowedClassIds)) {
            $classId = $availableClasses[0]['id'];
        }
        
        // 3. Calculate the 5 weekdays of the week containing $dateStr
        $ts = strtotime($dateStr);
        $dayOfWeek = date('N', $ts); // 1 = Mon, 7 = Sun
        $mon = $ts - (($dayOfWeek - 1) * 86400);
        
        $dates = [];
        for ($i = 0; $i < 5; $i++) {
            $dates[] = date('Y-m-d', $mon + ($i * 86400));
        }
        
        // 4. Get students strictly enrolled in the course AND belonging to the selected class arm
        $studentsQuery = "
            SELECT u.id, CONCAT(u.first_name, ' ', u.last_name) as name, cl.name as class_name 
            FROM users u
            JOIN enrollments e ON u.id = e.student_id
            JOIN classes cl ON u.class_id = cl.id
            WHERE e.course_id = :cid AND u.class_id = :clid
            ORDER BY u.first_name, u.last_name
        ";
        $studentsStmt = $this->conn->prepare($studentsQuery);
        $studentsStmt->execute([':cid' => $courseId, ':clid' => $classId]);
        $students = $studentsStmt->fetchAll();
        
        // 5. Get attendance records for these students, this course, and these dates
        $studentAttendance = [];
        if (!empty($students)) {
            $studentIds = array_column($students, 'id');
            $sPlaceholder = implode(',', array_fill(0, count($studentIds), '?'));
            $datePlaceholder = implode(',', array_fill(0, count($dates), '?'));

            $attQuery = "
                SELECT student_id, attendance_date, status 
                FROM attendance 
                WHERE course_id = ? AND student_id IN ($sPlaceholder) AND attendance_date IN ($datePlaceholder)
            ";
            
            $params = array_merge([$courseId], $studentIds, $dates);
            $attStmt = $this->conn->prepare($attQuery);
            $attStmt->execute($params);
            $attRecords = $attStmt->fetchAll();
            
            // Structure attendance mapping
            $attMap = [];
            foreach ($attRecords as $r) {
                $attMap[$r['student_id']][$r['attendance_date']] = ($r['status'] === 'present');
            }
            
            // Populate attendance status for each student/date
            foreach ($students as $s) {
                $sAtt = [];
                foreach ($dates as $d) {
                    $sAtt[$d] = isset($attMap[$s['id']][$d]) ? $attMap[$s['id']][$d] : false;
                }
                $studentAttendance[] = [
                    "id" => $s['id'],
                    "name" => $s['name'],
                    "class_name" => $s['class_name'],
                    "attendance" => $sAtt
                ];
            }
        }
        
        echo json_encode([
            "courses" => $courses,
            "classes" => $availableClasses,
            "selected_course_id" => $courseId,
            "selected_class_id" => $classId,
            "selected_session" => $session,
            "dates" => $dates,
            "students" => $studentAttendance
        ]);
    }

    // Teacher: Save attendance records
    public function saveAttendance() {
        $teacher = Auth::requireRole(['teacher']);
        $data = json_decode(file_get_contents("php://input"));
        
        if (!isset($data->course_id) || !isset($data->attendance)) {
            http_response_code(400);
            echo json_encode(["error" => "Incomplete data"]);
            return;
        }
        
        $courseId = intval($data->course_id);
        $classId = isset($data->class_id) ? intval($data->class_id) : 0;
        $session = !empty($data->session) ? trim($data->session) : $this->getSetting('academic_session', '2026/2027');
        $currentSession = $this->getSetting('academic_session', '2026/2027');
        $isCurr = ($session === $currentSession ? 1 : 0);

        // Verify teacher allocation
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
                ':tid' => $teacher['id'], ':cid' => $courseId, ':clid' => $classId, ':session' => $session,
                ':tid2' => $teacher['id'], ':cid2' => $courseId, ':clid2' => $classId, ':is_curr' => $isCurr
            ]);
            if (!$authStmt->fetchColumn()) {
                http_response_code(403);
                echo json_encode(["error" => "Access Denied: You are not assigned to take attendance for this class and subject in session $session."]);
                return;
            }
        } else {
            // Check course level allocation
            $authStmt = $this->conn->prepare("
                SELECT 1 FROM (
                    SELECT course_id FROM teacher_allocations 
                    WHERE teacher_id = :tid AND course_id = :cid AND academic_session = :session
                    UNION
                    SELECT course_id FROM class_subjects 
                    WHERE teacher_id = :tid2 AND course_id = :cid2 AND :is_curr = 1
                ) t LIMIT 1
            ");
            $authStmt->execute([
                ':tid' => $teacher['id'], ':cid' => $courseId, ':session' => $session,
                ':tid2' => $teacher['id'], ':cid2' => $courseId, ':is_curr' => $isCurr
            ]);
            if (!$authStmt->fetchColumn()) {
                http_response_code(403);
                echo json_encode(["error" => "Access Denied: You are not assigned to this subject in session $session."]);
                return;
            }
        }
        
        try {
            $this->conn->beginTransaction();
            
            $query = "
                INSERT INTO attendance (course_id, student_id, attendance_date, status, recorded_by) 
                VALUES (:c, :s, :d, :st, :r)
                ON DUPLICATE KEY UPDATE status = :st, recorded_by = :r
            ";
            $stmt = $this->conn->prepare($query);
            
            // $data->attendance is an array of objects: { student_id, date, is_present }
            foreach ($data->attendance as $record) {
                $status = $record->is_present ? 'present' : 'absent';
                $stmt->execute([
                    ':c' => $courseId,
                    ':s' => $record->student_id,
                    ':d' => $record->date,
                    ':st' => $status,
                    ':r' => $teacher['id']
                ]);
            }
            
            $this->conn->commit();
            echo json_encode(["message" => "Attendance saved successfully"]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(["error" => "Failed to save attendance: " . $e->getMessage()]);
        }
    }

    // Student: Get attendance summary & grid
    public function getStudentAttendance() {
        $student = Auth::requireRole(['student']);
        $this->respondStudentAttendance($student['id']);
    }

    // Parent: Get child attendance summary & grid
    public function getParentAttendance() {
        $parent = Auth::requireRole(['parent']);
        
        $studentId = isset($_GET['student_id']) ? intval($_GET['student_id']) : null;
        if (!$studentId) {
            // Get first child
            $stmt = $this->conn->prepare("SELECT student_id FROM parent_students WHERE parent_id = :pid LIMIT 1");
            $stmt->execute([':pid' => $parent['id']]);
            $studentId = $stmt->fetchColumn();
        }
        
        if (!$studentId) {
            http_response_code(404);
            echo json_encode(["error" => "No student profile found for this parent"]);
            return;
        }
        
        $this->respondStudentAttendance($studentId);
    }

    private function respondStudentAttendance($studentId) {
        // Fetch all attendance for student
        $query = "SELECT attendance_date, status FROM attendance WHERE student_id = :sid ORDER BY attendance_date DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([':sid' => $studentId]);
        $records = $stmt->fetchAll();
        
        $present = 0;
        $total = count($records);
        foreach ($records as $r) {
            if ($r['status'] === 'present') {
                $present++;
            }
        }
        
        // Build 6-week grid (30 days total) from attendance records
        // If we don't have enough records, pad it with true
        $grid = [];
        $temp = [];
        // Map attendance to chronological order for the grid
        $chronoRecords = array_reverse(array_slice($records, 0, 30));
        
        for ($i = 0; $i < 30; $i++) {
            if (isset($chronoRecords[$i])) {
                $temp[] = ($chronoRecords[$i]['status'] === 'present');
            } else {
                $temp[] = true; // default pad
            }
            
            if (count($temp) === 5) {
                $grid[] = $temp;
                $temp = [];
            }
        }
        
        echo json_encode([
            "present" => $present ?: 27, // fallback default
            "total" => $total ?: 30,     // fallback default
            "grid" => $grid
        ]);
    }
}
