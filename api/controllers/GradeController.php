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

    // Teacher: Get grades list for course
    public function getTeacherGrades() {
        $teacher = Auth::requireRole(['teacher']);
        
        $courseId = isset($_GET['course_id']) ? intval($_GET['course_id']) : null;
        
        // 1. Get courses taught by teacher
        $coursesQuery = "SELECT id, name FROM courses WHERE teacher_id = :tid";
        $coursesStmt = $this->conn->prepare($coursesQuery);
        $coursesStmt->execute([':tid' => $teacher['id']]);
        $courses = $coursesStmt->fetchAll();
        
        if (empty($courses)) {
            echo json_encode(["courses" => [], "students" => []]);
            return;
        }
        
        if (!$courseId) {
            $courseId = $courses[0]['id'];
        }
        
        // 2. Fetch enrolled students and their grades (if they have one)
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
                g.remarks
            FROM users u
            JOIN enrollments e ON u.id = e.student_id
            LEFT JOIN grades g ON (u.id = g.student_id AND g.course_id = :cid)
            WHERE e.course_id = :cid
            ORDER BY u.first_name, u.last_name
        ";
        
        $gradesStmt = $this->conn->prepare($gradesQuery);
        $gradesStmt->execute([':cid' => $courseId]);
        $students = $gradesStmt->fetchAll();
        
        // Format grades output
        $formattedStudents = [];
        foreach ($students as $s) {
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
                "remarks" => $s['remarks'] ?: ""
            ];
        }
        
        echo json_encode([
            "courses" => $courses,
            "selected_course_id" => $courseId,
            "result_mode" => $this->getSetting('result_mode', 'end_of_term'),
            "students" => $formattedStudents
        ]);
    }

    // Teacher: Save/update grades
    public function saveGrades() {
        $teacher = Auth::requireRole(['teacher']);
        $data = json_decode(file_get_contents("php://input"));
        
        if (!isset($data->course_id) || !isset($data->grades)) {
            http_response_code(400);
            echo json_encode(["error" => "Incomplete data"]);
            return;
        }
        
        $courseId = intval($data->course_id);
        $resultMode = $this->getSetting('result_mode', 'end_of_term');
        
        try {
            $this->conn->beginTransaction();
            
            $query = "
                INSERT INTO grades (
                    student_id, course_id, ca1, ca2, exam, 
                    assignment_score, project_score, mid_term_test, 
                    score, max_score, remarks, graded_by
                ) VALUES (
                    :s, :c, :ca1, :ca2, :exam, 
                    :asgn, :proj, :test, 
                    :score, 100, :remarks, :g
                ) ON DUPLICATE KEY UPDATE 
                    ca1 = :ca1, 
                    ca2 = :ca2, 
                    exam = :exam, 
                    assignment_score = :asgn,
                    project_score = :proj,
                    mid_term_test = :test,
                    score = :score, 
                    remarks = :remarks,
                    graded_by = :g
            ";
            
            $stmt = $this->conn->prepare($query);
            
            foreach ($data->grades as $g) {
                // Fetch existing grade record if it exists
                $findStmt = $this->conn->prepare("
                    SELECT assignment_score, project_score, mid_term_test, ca1, ca2, exam 
                    FROM grades 
                    WHERE student_id = :s AND course_id = :c
                ");
                $findStmt->execute([':s' => intval($g->student_id), ':c' => $courseId]);
                $existing = $findStmt->fetch();
                
                // Read from input, fallback to existing DB value, fallback to null
                $asgn = isset($g->assignment_score) && $g->assignment_score !== "" ? floatval($g->assignment_score) : ($existing ? ($existing['assignment_score'] !== null ? floatval($existing['assignment_score']) : null) : null);
                $proj = isset($g->project_score) && $g->project_score !== "" ? floatval($g->project_score) : ($existing ? ($existing['project_score'] !== null ? floatval($existing['project_score']) : null) : null);
                $test = isset($g->mid_term_test) && $g->mid_term_test !== "" ? floatval($g->mid_term_test) : ($existing ? ($existing['mid_term_test'] !== null ? floatval($existing['mid_term_test']) : null) : null);
                
                $ca1 = ($asgn !== null || $proj !== null || $test !== null) ? (($asgn ?? 0) + ($proj ?? 0) + ($test ?? 0)) : 0;
                
                $ca2 = isset($g->ca2) && $g->ca2 !== "" ? floatval($g->ca2) : ($existing ? ($existing['ca2'] !== null ? floatval($existing['ca2']) : 0) : 0);
                $exam = isset($g->exam) && $g->exam !== "" ? floatval($g->exam) : ($existing ? ($existing['exam'] !== null ? floatval($existing['exam']) : 0) : 0);
                
                // Set total score based on mode
                if ($resultMode === 'mid_term') {
                    $total = $ca1;
                } else {
                    $total = $ca1 + $ca2 + $exam;
                }
                
                $remarks = isset($g->remarks) ? $g->remarks : "";
                
                $stmt->execute([
                    ':s' => intval($g->student_id),
                    ':c' => $courseId,
                    ':ca1' => $ca1,
                    ':ca2' => $ca2,
                    ':exam' => $exam,
                    ':asgn' => $asgn,
                    ':proj' => $proj,
                    ':test' => $test,
                    ':score' => $total,
                    ':remarks' => $remarks,
                    ':g' => $teacher['id']
                ]);
            }
            
            $this->conn->commit();
            echo json_encode(["message" => "Grades saved successfully"]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(["error" => "Failed to save grades: " . $e->getMessage()]);
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
        $resultMode = $this->getSetting('result_mode', 'end_of_term');

        // 1. Get grades for all enrolled courses
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
                g.remarks
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            LEFT JOIN users u ON c.teacher_id = u.id
            LEFT JOIN grades g ON (e.student_id = g.student_id AND g.course_id = c.id)
            WHERE e.student_id = :sid
        ";
        $stmt = $this->conn->prepare($gradesQuery);
        $stmt->execute([':sid' => $studentId]);
        $grades = $stmt->fetchAll();
        
        // 2. Format grades & compute grade/totals
        $formatted = [];
        $totalSum = 0;
        $highest = 0;
        $highestSubject = "N/A";
        
        foreach ($grades as $g) {
            $asgn = floatval($g['assignment_score'] ?? 0);
            $proj = floatval($g['project_score'] ?? 0);
            $test = floatval($g['mid_term_test'] ?? 0);
            $midTermTotal = $asgn + $proj + $test;

            if ($resultMode === 'mid_term') {
                $ca = $midTermTotal;
                $exam = 0;
                $total = $midTermTotal;
                // Calculate mid-term remark based on out of 20
                if ($total >= 18) {
                    $gradeLetter = "EXCELLENT";
                } else if ($total >= 14) {
                    $gradeLetter = "VERY GOOD";
                } else if ($total >= 12) {
                    $gradeLetter = "GOOD";
                } else if ($total >= 10) {
                    $gradeLetter = "FAIR";
                } else {
                    $gradeLetter = "POOR";
                }
                $maxCA = 20;
                $maxExam = 0;
            } else {
                $ca1 = floatval($g['ca1'] ?? 0);
                $ca2 = floatval($g['ca2'] ?? 0);
                $ca = $ca1 + $ca2; // CA / 40
                $exam = floatval($g['exam'] ?? 0); // Exam / 60
                $total = floatval($g['total'] ?? ($ca + $exam));
                $gradeLetter = $this->calculateGradeLetter($total);
                $maxCA = 40;
                $maxExam = 60;
            }
            
            $formatted[] = [
                "subject" => $g['subject'],
                "teacher" => $g['teacher'] ?: "Unassigned",
                "ca" => $ca,
                "exam" => $exam,
                "total" => $total,
                "grade" => $gradeLetter,
                "position" => "N/A", // We'll compute rank position later
                "maxCA" => $maxCA,
                "maxExam" => $maxExam
            ];
            
            $totalSum += $total;
            if ($total > $highest) {
                $highest = $total;
                $highestSubject = $g['subject'];
            }
        }
        
        $average = count($formatted) > 0 ? round($totalSum / count($formatted)) : 0;
        
        // 3. Dynamic Rank Calculation:
        // Rank = Position of this student among all students enrolled in the same courses, based on average scores
        $rankQuery = "
            SELECT 
                e.student_id, 
                AVG(COALESCE(g.score, 0)) as avg_score,
                COUNT(DISTINCT e.student_id) as total_students
            FROM enrollments e
            LEFT JOIN grades g ON (e.student_id = g.student_id AND e.course_id = g.course_id)
            GROUP BY e.student_id
            ORDER BY avg_score DESC
        ";
        
        $rankStmt = $this->conn->query($rankQuery);
        $rankings = $rankStmt->fetchAll();
        
        $rankPosition = 1;
        $totalClassmates = count($rankings);
        
        foreach ($rankings as $idx => $r) {
            if ($r['student_id'] == $studentId) {
                $rankPosition = $idx + 1;
                break;
            }
        }
        
        // Convert rank position to suffix: 1st, 2nd, 3rd, 4th...
        $rankString = $this->formatOrdinal($rankPosition) . " / " . $totalClassmates;
        
        // Populate specific position inside formatted courses
        foreach ($formatted as &$f) {
            // Give subject specific rank
            $subjRankQuery = "
                SELECT student_id, score 
                FROM grades 
                WHERE course_id = (SELECT id FROM courses WHERE name = :sName)
                ORDER BY score DESC
            ";
            $subjRankStmt = $this->conn->prepare($subjRankQuery);
            $subjRankStmt->execute([':sName' => $f['subject']]);
            $subjRankings = $subjRankStmt->fetchAll();
            
            $subjPos = 1;
            foreach ($subjRankings as $idx => $sr) {
                if ($sr['student_id'] == $studentId) {
                    $subjPos = $idx + 1;
                    break;
                }
            }
            $f['position'] = $this->formatOrdinal($subjPos);
        }
        
        echo json_encode([
            "average" => $average,
            "rank" => $rankString,
            "highest" => $highest,
            "highest_subject" => $highestSubject,
            "grades" => $formatted
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
            LEFT JOIN grades g ON (e.student_id = g.student_id AND g.course_id = c.id)
            WHERE e.student_id = :sid
        ";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute([':sid' => $studentId]);
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
                "students" => rand(30, 45), // mock total student classmates
                "duration" => "12 weeks",
                "status" => "active",
                "color" => $colors[$idx % count($colors)],
                "topics" => $topics
            ];
        }
        
        echo json_encode($formatted);
    }

    // Student: Get available courses for enrollment (Core + Electives based on class)
    public function getAvailableCourses() {
        $student = Auth::requireRole(['student']);
        
        // Find student class
        $stmt = $this->conn->prepare("SELECT class_id FROM users WHERE id = :id");
        $stmt->execute([':id' => $student['id']]);
        $classId = $stmt->fetchColumn();

        if (!$classId) {
            echo json_encode(["error" => "You have not been assigned to a class yet.", "core" => [], "electives" => []]);
            return;
        }

        // Get class subjects
        $stmt = $this->conn->prepare("
            SELECT cs.course_id, c.name, cs.type, cs.elective_group 
            FROM class_subjects cs
            JOIN courses c ON cs.course_id = c.id
            WHERE cs.class_id = :cid
        ");
        $stmt->execute([':cid' => $classId]);
        $subjects = $stmt->fetchAll();

        // Get already enrolled courses
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

        // Verify it's an elective? 
        // We look up the student's class, then check if the course is core. If core, reject.
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
