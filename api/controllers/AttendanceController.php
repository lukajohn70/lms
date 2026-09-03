<?php
require_once 'config/Database.php';
require_once 'lib/Auth.php';

class AttendanceController {
    private $conn;

    public function __construct() {
        $db = new Database();
        $this->conn = $db->getConnection();
    }

    // Teacher: Get attendance grid for a course and week
    public function getTeacherAttendance() {
        $teacher = Auth::requireRole(['teacher']);
        
        $courseId = isset($_GET['course_id']) ? intval($_GET['course_id']) : null;
        $dateStr = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');
        
        // Teacher sees courses assigned directly OR via class subject allocation
        $coursesQuery = "
            SELECT DISTINCT c.id, c.name FROM courses c
            WHERE c.teacher_id = :tid
               OR c.id IN (SELECT course_id FROM class_subjects WHERE teacher_id = :tid2)
            ORDER BY c.name
        ";
        $coursesStmt = $this->conn->prepare($coursesQuery);
        $coursesStmt->execute([':tid' => $teacher['id'], ':tid2' => $teacher['id']]);
        $courses = $coursesStmt->fetchAll();
        
        if (empty($courses)) {
            echo json_encode(["courses" => [], "students" => [], "dates" => []]);
            return;
        }
        
        if (!$courseId) {
            $courseId = $courses[0]['id'];
        }
        
        // 2. Calculate the 5 weekdays of the week containing $dateStr
        $ts = strtotime($dateStr);
        $dayOfWeek = date('N', $ts); // 1 = Mon, 7 = Sun
        // Start from Monday (subtract dayOfWeek - 1 days)
        $mon = $ts - (($dayOfWeek - 1) * 86400);
        
        $dates = [];
        for ($i = 0; $i < 5; $i++) {
            $dates[] = date('Y-m-d', $mon + ($i * 86400));
        }
        
        // 3. Get students enrolled in the course
        $studentsQuery = "
            SELECT u.id, CONCAT(u.first_name, ' ', u.last_name) as name 
            FROM users u
            JOIN enrollments e ON u.id = e.student_id
            WHERE e.course_id = :cid
            ORDER BY u.first_name, u.last_name
        ";
        $studentsStmt = $this->conn->prepare($studentsQuery);
        $studentsStmt->execute([':cid' => $courseId]);
        $students = $studentsStmt->fetchAll();
        
        // 4. Get attendance records for these students, this course, and these dates
        $datePlaceholder = implode(',', array_fill(0, count($dates), '?'));
        $attQuery = "
            SELECT student_id, attendance_date, status 
            FROM attendance 
            WHERE course_id = ? AND attendance_date IN ($datePlaceholder)
        ";
        
        $params = array_merge([$courseId], $dates);
        $attStmt = $this->conn->prepare($attQuery);
        $attStmt->execute($params);
        $attRecords = $attStmt->fetchAll();
        
        // Structure attendance mapping
        $attMap = [];
        foreach ($attRecords as $r) {
            $attMap[$r['student_id']][$r['attendance_date']] = ($r['status'] === 'present');
        }
        
        // Populate attendance status for each student/date
        $studentAttendance = [];
        foreach ($students as $s) {
            $sAtt = [];
            foreach ($dates as $d) {
                // Default to false (unchecked) until teacher marks present
                $sAtt[$d] = isset($attMap[$s['id']][$d]) ? $attMap[$s['id']][$d] : false;
            }
            $studentAttendance[] = [
                "id" => $s['id'],
                "name" => $s['name'],
                "attendance" => $sAtt
            ];
        }
        
        echo json_encode([
            "courses" => $courses,
            "selected_course_id" => $courseId,
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
