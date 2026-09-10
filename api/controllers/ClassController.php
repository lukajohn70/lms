<?php
require_once 'config/Database.php';
require_once 'lib/Auth.php';

class ClassController {
    private $conn;

    public function __construct() {
        $db = new Database();
        $this->conn = $db->getConnection();

        try {
            $chk = $this->conn->query("SHOW COLUMNS FROM class_subjects LIKE 'teacher_id'");
            if ($chk->rowCount() == 0) {
                $this->conn->exec("ALTER TABLE class_subjects ADD COLUMN teacher_id int DEFAULT NULL");
                $this->conn->exec("ALTER TABLE class_subjects ADD CONSTRAINT fk_class_subject_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL");
            }

            $chkForm = $this->conn->query("SHOW COLUMNS FROM classes LIKE 'form_teacher_id'");
            if ($chkForm->rowCount() == 0) {
                $this->conn->exec("ALTER TABLE classes ADD COLUMN form_teacher_id int DEFAULT NULL");
                $this->conn->exec("ALTER TABLE classes ADD CONSTRAINT fk_classes_form_teacher FOREIGN KEY (form_teacher_id) REFERENCES users(id) ON DELETE SET NULL");
            }
        } catch (Exception $e) {}
    }

    // Get all classes with form teacher details
    public function getClasses() {
        Auth::requireRole(['admin', 'teacher']);
        
        $stmt = $this->conn->query("
            SELECT c.*, CONCAT(u.first_name, ' ', u.last_name) AS form_teacher_name, u.email AS form_teacher_email
            FROM classes c
            LEFT JOIN users u ON c.form_teacher_id = u.id
            ORDER BY c.name ASC
        ");
        $classes = $stmt->fetchAll();
        
        echo json_encode(["classes" => $classes]);
    }

    // Assign / unassign Form Teacher to a class arm (Max 2 arms per teacher)
    public function assignFormTeacher() {
        Auth::requireRole(['admin']);
        $data = json_decode(file_get_contents("php://input"));

        if (empty($data->class_id)) {
            http_response_code(400);
            echo json_encode(["error" => "Class ID is required."]);
            return;
        }

        $classId = intval($data->class_id);
        $teacherId = !empty($data->teacher_id) ? intval($data->teacher_id) : null;

        try {
            if ($teacherId !== null) {
                // Verify teacher exists and is teacher role
                $uStmt = $this->conn->prepare("SELECT id, first_name, last_name, role FROM users WHERE id = :tid");
                $uStmt->execute([':tid' => $teacherId]);
                $teacher = $uStmt->fetch();

                if (!$teacher || $teacher['role'] !== 'teacher') {
                    http_response_code(400);
                    echo json_encode(["error" => "Selected user is not a registered teacher."]);
                    return;
                }

                // Check maximum 2 arms per teacher constraint
                $countStmt = $this->conn->prepare("SELECT COUNT(*) FROM classes WHERE form_teacher_id = :tid AND id != :cid");
                $countStmt->execute([':tid' => $teacherId, ':cid' => $classId]);
                $assignedCount = intval($countStmt->fetchColumn());

                if ($assignedCount >= 2) {
                    http_response_code(400);
                    echo json_encode([
                        "error" => "{$teacher['first_name']} {$teacher['last_name']} is already assigned as Form Teacher to 2 class arms (the maximum allowed)."
                    ]);
                    return;
                }
            }

            $updateStmt = $this->conn->prepare("UPDATE classes SET form_teacher_id = :tid WHERE id = :cid");
            $updateStmt->execute([':tid' => $teacherId, ':cid' => $classId]);

            echo json_encode([
                "success" => true,
                "message" => $teacherId ? "Form teacher assigned successfully." : "Form teacher removed from class arm."
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to update form teacher: " . $e->getMessage()]);
        }
    }

    // Create a new class
    public function createClass() {
        Auth::requireRole(['admin']);
        $data = json_decode(file_get_contents("php://input"));
        
        if (empty($data->name)) {
            http_response_code(400);
            echo json_encode(["error" => "Class name is required"]);
            return;
        }

        try {
            $stmt = $this->conn->prepare("INSERT INTO classes (name, department) VALUES (:n, :d)");
            $stmt->execute([
                ':n' => trim($data->name),
                ':d' => isset($data->department) ? trim($data->department) : null
            ]);
            $id = $this->conn->lastInsertId();
            
            echo json_encode(["success" => true, "id" => $id, "message" => "Class created successfully"]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to create class: " . $e->getMessage()]);
        }
    }

    // Delete a class
    public function deleteClass() {
        Auth::requireRole(['admin']);
        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        
        try {
            $stmt = $this->conn->prepare("DELETE FROM classes WHERE id = :id");
            $stmt->execute([':id' => $id]);
            echo json_encode(["success" => true, "message" => "Class deleted"]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Cannot delete class as it is tied to users or subjects."]);
        }
    }

    // Get all courses (subjects)
    public function getCourses() {
        Auth::requireRole(['admin', 'teacher', 'student']);
        
        $stmt = $this->conn->query("SELECT * FROM courses ORDER BY name ASC");
        $courses = $stmt->fetchAll();
        
        echo json_encode(["courses" => $courses]);
    }

    // Create a new course (subject)
    public function createCourse() {
        Auth::requireRole(['admin']);
        $data = json_decode(file_get_contents("php://input"));
        
        if (empty($data->name)) {
            http_response_code(400);
            echo json_encode(["error" => "Course name is required"]);
            return;
        }

        try {
            $stmt = $this->conn->prepare("INSERT INTO courses (name, description, topics, department) VALUES (:n, :d, :t, :dept)");
            $stmt->execute([
                ':n' => trim($data->name),
                ':d' => isset($data->description) ? trim($data->description) : null,
                ':t' => isset($data->topics) ? trim($data->topics) : null,
                ':dept' => isset($data->department) ? trim($data->department) : null
            ]);
            $id = $this->conn->lastInsertId();
            
            echo json_encode(["success" => true, "id" => $id, "message" => "Subject created successfully"]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to create subject: " . $e->getMessage()]);
        }
    }

    // Bulk import courses (subjects) via CSV
    public function bulkImportCourses() {
        Auth::requireRole(['admin']);

        if (!isset($_FILES['csv_file'])) {
            http_response_code(400);
            echo json_encode(["error" => "No CSV file uploaded"]);
            return;
        }

        $file = $_FILES['csv_file'];
        if (strtolower(pathinfo($file['name'], PATHINFO_EXTENSION)) !== 'csv') {
            http_response_code(400);
            echo json_encode(["error" => "Only CSV files are allowed"]);
            return;
        }

        $handle = fopen($file['tmp_name'], "r");
        if ($handle === false) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to open uploaded CSV"]);
            return;
        }

        // Read headers, skipping commented lines
        $headers = fgetcsv($handle, 1000, ",");
        while ($headers !== false && (empty($headers[0]) || substr(trim($headers[0]), 0, 1) === '#')) {
            $headers = fgetcsv($handle, 1000, ",");
        }

        if (!$headers) {
            fclose($handle);
            http_response_code(400);
            echo json_encode(["error" => "Empty or invalid CSV file"]);
            return;
        }

        // Clean headers
        $cleanHeaders = array_map(function($h) {
            return strtolower(trim(preg_replace('/[\x00-\x1F\x80-\xFF]/', '', $h)));
        }, $headers);
        $headerMap = array_flip($cleanHeaders);

        if (!isset($headerMap['name']) && !isset($headerMap['subject_name']) && !isset($headerMap['subject'])) {
            fclose($handle);
            http_response_code(400);
            echo json_encode(["error" => "CSV must include a 'name' or 'subject' column"]);
            return;
        }

        $nameKey = isset($headerMap['name']) ? $headerMap['name'] : (isset($headerMap['subject_name']) ? $headerMap['subject_name'] : $headerMap['subject']);
        $descKey = isset($headerMap['description']) ? $headerMap['description'] : null;
        $deptKey = isset($headerMap['department']) ? $headerMap['department'] : (isset($headerMap['dept']) ? $headerMap['dept'] : null);
        $topicsKey = isset($headerMap['topics']) ? $headerMap['topics'] : null;

        $created = 0;
        $skipped = 0;
        $errors = [];

        $stmtCheck = $this->conn->prepare("SELECT id FROM courses WHERE LOWER(name) = LOWER(:n) LIMIT 1");
        $stmtInsert = $this->conn->prepare("INSERT INTO courses (name, description, topics, department) VALUES (:n, :d, :t, :dept)");

        $this->conn->beginTransaction();
        try {
            while (($row = fgetcsv($handle, 1000, ",")) !== false) {
                if (empty($row) || !isset($row[$nameKey])) continue;
                $name = trim($row[$nameKey]);
                if (empty($name)) continue;

                $desc = ($descKey !== null && isset($row[$descKey])) ? trim($row[$descKey]) : null;
                $dept = ($deptKey !== null && isset($row[$deptKey])) ? trim($row[$deptKey]) : null;
                $topics = ($topicsKey !== null && isset($row[$topicsKey])) ? trim($row[$topicsKey]) : null;

                // Check duplicate
                $stmtCheck->execute([':n' => $name]);
                if ($stmtCheck->rowCount() > 0) {
                    $skipped++;
                    continue;
                }

                $stmtInsert->execute([
                    ':n' => $name,
                    ':d' => $desc,
                    ':t' => $topics,
                    ':dept' => $dept
                ]);
                $created++;
            }

            $this->conn->commit();
            fclose($handle);

            echo json_encode([
                "success" => true,
                "created" => $created,
                "skipped" => $skipped,
                "message" => "Imported $created subject(s)" . ($skipped > 0 ? " ($skipped already existed)" : "")
            ]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            fclose($handle);
            http_response_code(500);
            echo json_encode(["error" => "Bulk import error: " . $e->getMessage()]);
        }
    }

    // Get subjects allocated to a specific class
    public function getClassSubjects() {
        $user = Auth::authenticate();
        $classId = isset($_GET['class_id']) ? intval($_GET['class_id']) : 0;

        if (!$classId && $user['role'] === 'student') {
            $classId = $user['class_id'];
        }
        
        $stmt = $this->conn->prepare("
            SELECT cs.id, cs.course_id, c.name, c.description, cs.type, cs.elective_group, cs.teacher_id, CONCAT(u.first_name, ' ', u.last_name) AS teacher_name
            FROM class_subjects cs
            JOIN courses c ON cs.course_id = c.id
            LEFT JOIN users u ON cs.teacher_id = u.id
            WHERE cs.class_id = :cid
            ORDER BY cs.type ASC, c.name ASC
        ");
        $stmt->execute([':cid' => $classId]);
        $subjects = $stmt->fetchAll();
        
        echo json_encode(["subjects" => $subjects]);
    }

    // Save subjects allocation for a class
    public function saveClassSubjects() {
        Auth::requireRole(['admin']);
        $data = json_decode(file_get_contents("php://input"));
        
        if (empty($data->class_id) || !isset($data->subjects)) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid data"]);
            return;
        }

        $classId = intval($data->class_id);

        try {
            $this->conn->beginTransaction();

            // Clear old allocation
            $stmt = $this->conn->prepare("DELETE FROM class_subjects WHERE class_id = :cid");
            $stmt->execute([':cid' => $classId]);

            // Insert new allocations
            $stmtInsert = $this->conn->prepare("
                INSERT INTO class_subjects (class_id, course_id, type, elective_group, teacher_id) 
                VALUES (:cid, :coid, :t, :eg, :tid)
            ");

            $stmtCourseTeacher = $this->conn->prepare("UPDATE courses SET teacher_id = :tid WHERE id = :coid");

            foreach ($data->subjects as $sub) {
                $tid = !empty($sub->teacher_id) ? intval($sub->teacher_id) : null;
                $coid = intval($sub->course_id);

                $stmtInsert->execute([
                    ':cid' => $classId,
                    ':coid' => $coid,
                    ':t' => $sub->type, // 'core' or 'elective'
                    ':eg' => ($sub->type === 'elective' && !empty($sub->elective_group)) ? $sub->elective_group : null,
                    ':tid' => $tid
                ]);

                if ($tid) {
                    $stmtCourseTeacher->execute([':tid' => $tid, ':coid' => $coid]);
                }
            }

            $this->conn->commit();
            echo json_encode(["success" => true, "message" => "Subjects allocated successfully"]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(["error" => "Failed to save allocation: " . $e->getMessage()]);
        }
    }

    // Update course (subject) - Admin only
    public function updateCourse() {
        Auth::requireRole(['admin']);
        $data = json_decode(file_get_contents("php://input"));

        if (empty($data->id) || empty($data->name)) {
            http_response_code(400);
            echo json_encode(["error" => "Subject ID and Name are required."]);
            return;
        }

        $id = intval($data->id);
        $name = trim($data->name);
        $description = isset($data->description) ? trim($data->description) : null;
        $department = isset($data->department) ? trim($data->department) : null;
        $topics = isset($data->topics) ? trim($data->topics) : null;

        try {
            $stmt = $this->conn->prepare("
                UPDATE courses 
                SET name = :n, description = :d, department = :dept, topics = :t 
                WHERE id = :id
            ");
            $stmt->execute([
                ':n' => $name,
                ':d' => $description,
                ':dept' => $department,
                ':t' => $topics,
                ':id' => $id
            ]);

            echo json_encode(["success" => true, "message" => "Subject updated successfully."]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to update subject: " . $e->getMessage()]);
        }
    }

    // Delete course (subject) - Admin only
    public function deleteCourse() {
        Auth::requireRole(['admin']);
        $data = json_decode(file_get_contents("php://input"));

        $id = !empty($data->id) ? intval($data->id) : (isset($_GET['id']) ? intval($_GET['id']) : 0);

        if (!$id) {
            http_response_code(400);
            echo json_encode(["error" => "Subject ID is required."]);
            return;
        }

        try {
            // Check if there are recorded grades
            $chk = $this->conn->prepare("SELECT COUNT(*) FROM grades WHERE course_id = :id");
            $chk->execute([':id' => $id]);
            $gradeCount = intval($chk->fetchColumn());

            if ($gradeCount > 0) {
                http_response_code(400);
                echo json_encode(["error" => "Cannot delete subject because $gradeCount grade records exist for it. You can rename or edit it instead."]);
                return;
            }

            $stmt = $this->conn->prepare("DELETE FROM courses WHERE id = :id");
            $stmt->execute([':id' => $id]);

            echo json_encode(["success" => true, "message" => "Subject deleted successfully."]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to delete subject: " . $e->getMessage()]);
        }
    }

    // HOD Allocations: Get departmental subjects, classes, and assigned teachers
    public function getHodAllocations() {
        $user = Auth::requireRole(['admin', 'teacher']);

        $department = null;
        if ($user['role'] === 'teacher') {
            // Must be an HOD
            $uStmt = $this->conn->prepare("SELECT is_hod, hod_department FROM users WHERE id = :id");
            $uStmt->execute([':id' => $user['id']]);
            $uRow = $uStmt->fetch();

            if (empty($uRow['is_hod']) || intval($uRow['is_hod']) !== 1) {
                http_response_code(403);
                echo json_encode(["error" => "Access denied. You are not designated as a Head of Department (HOD)."]);
                return;
            }
            $department = $uRow['hod_department'];
        } else {
            // Admin can pass ?department=... or view all
            $department = $_GET['department'] ?? null;
        }

        try {
            // 1. Get courses for this department
            if (!empty($department) && $department !== 'All') {
                $cStmt = $this->conn->prepare("SELECT * FROM courses WHERE department = :dept ORDER BY name ASC");
                $cStmt->execute([':dept' => $department]);
            } else {
                $cStmt = $this->conn->query("SELECT * FROM courses ORDER BY department ASC, name ASC");
            }
            $courses = $cStmt->fetchAll();

            // 2. Get all classes
            $classesStmt = $this->conn->query("SELECT id, name, department FROM classes ORDER BY name ASC");
            $classes = $classesStmt->fetchAll();

            // 3. Get all teachers
            $tStmt = $this->conn->query("
                SELECT u.id, u.first_name, u.last_name, u.email, u.is_hod, u.hod_department,
                       (SELECT COUNT(*) FROM class_subjects WHERE teacher_id = u.id) as assigned_subjects_count
                FROM users u 
                WHERE u.role = 'teacher' 
                ORDER BY u.first_name ASC, u.last_name ASC
            ");
            $teachers = $tStmt->fetchAll();

            // 4. Get current allocations for these courses across all classes
            $courseIds = array_column($courses, 'id');
            $allocations = [];
            if (!empty($courseIds)) {
                $inCourses = implode(',', array_fill(0, count($courseIds), '?'));
                $allocStmt = $this->conn->prepare("
                    SELECT cs.*, c.name as course_name, c.department as course_department,
                           cls.name as class_name,
                           u.first_name, u.last_name,
                           CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,'')) as teacher_name
                    FROM class_subjects cs
                    JOIN courses c ON cs.course_id = c.id
                    JOIN classes cls ON cs.class_id = cls.id
                    LEFT JOIN users u ON cs.teacher_id = u.id
                    WHERE cs.course_id IN ($inCourses)
                    ORDER BY cls.name ASC, c.name ASC
                ");
                $allocStmt->execute($courseIds);
                $allocations = $allocStmt->fetchAll();
            }

            echo json_encode([
                "success" => true,
                "department" => $department,
                "courses" => $courses,
                "classes" => $classes,
                "teachers" => $teachers,
                "allocations" => $allocations
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to load HOD allocations: " . $e->getMessage()]);
        }
    }

    // HOD or Admin assigns a subject teacher to a class arm
    public function assignSubjectTeacherByHod() {
        $user = Auth::requireRole(['admin', 'teacher']);

        $data = json_decode(file_get_contents("php://input"));
        if (empty($data->class_id) || empty($data->course_id)) {
            http_response_code(400);
            echo json_encode(["error" => "Class ID and Subject ID are required."]);
            return;
        }

        $classId = intval($data->class_id);
        $courseId = intval($data->course_id);
        $teacherId = !empty($data->teacher_id) ? intval($data->teacher_id) : null;

        // If teacher role, verify HOD status and department ownership
        if ($user['role'] === 'teacher') {
            $uStmt = $this->conn->prepare("SELECT is_hod, hod_department FROM users WHERE id = :id");
            $uStmt->execute([':id' => $user['id']]);
            $uRow = $uStmt->fetch();

            if (empty($uRow['is_hod']) || intval($uRow['is_hod']) !== 1) {
                http_response_code(403);
                echo json_encode(["error" => "Only appointed Heads of Department (HOD) can assign subject teachers."]);
                return;
            }

            $hodDept = $uRow['hod_department'];
            // Check course department
            $cStmt = $this->conn->prepare("SELECT department FROM courses WHERE id = :id");
            $cStmt->execute([':id' => $courseId]);
            $courseDept = $cStmt->fetchColumn();

            if (!empty($courseDept) && !empty($hodDept) && strcasecmp($courseDept, $hodDept) !== 0) {
                http_response_code(403);
                echo json_encode(["error" => "You are only permitted to assign teachers for subjects in your department ($hodDept)."]);
                return;
            }
        }

        try {
            // Verify teacher exists and has teacher role if provided
            $teacherName = "No Teacher";
            if ($teacherId !== null) {
                $tCheck = $this->conn->prepare("SELECT first_name, last_name, role FROM users WHERE id = :tid");
                $tCheck->execute([':tid' => $teacherId]);
                $tRow = $tCheck->fetch();
                if (!$tRow || $tRow['role'] !== 'teacher') {
                    http_response_code(400);
                    echo json_encode(["error" => "Selected user is not a valid registered teacher."]);
                    return;
                }
                $teacherName = $tRow['first_name'] . ' ' . $tRow['last_name'];
            }

            // Update or insert class_subjects allocation
            $exist = $this->conn->prepare("SELECT id FROM class_subjects WHERE class_id = :cid AND course_id = :coid");
            $exist->execute([':cid' => $classId, ':coid' => $courseId]);
            $allocId = $exist->fetchColumn();

            if ($allocId) {
                $upd = $this->conn->prepare("UPDATE class_subjects SET teacher_id = :tid WHERE id = :id");
                $upd->execute([':tid' => $teacherId, ':id' => $allocId]);
            } else {
                $ins = $this->conn->prepare("
                    INSERT INTO class_subjects (class_id, course_id, type, teacher_id) 
                    VALUES (:cid, :coid, 'core', :tid)
                ");
                $ins->execute([':cid' => $classId, ':coid' => $courseId, ':tid' => $teacherId]);
            }

            // Also update courses default teacher_id if unassigned
            if ($teacherId !== null) {
                $this->conn->prepare("UPDATE courses SET teacher_id = :tid WHERE id = :coid AND teacher_id IS NULL")
                    ->execute([':tid' => $teacherId, ':coid' => $courseId]);
            }

            echo json_encode([
                "success" => true,
                "message" => "Assigned $teacherName to subject successfully.",
                "teacher_id" => $teacherId,
                "teacher_name" => $teacherName
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to assign teacher: " . $e->getMessage()]);
        }
    }
}
