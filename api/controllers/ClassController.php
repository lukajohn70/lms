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
            $stmt = $this->conn->prepare("INSERT INTO courses (name, description, topics) VALUES (:n, :d, :t)");
            $stmt->execute([
                ':n' => trim($data->name),
                ':d' => isset($data->description) ? trim($data->description) : null,
                ':t' => isset($data->topics) ? trim($data->topics) : null
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
        $topicsKey = isset($headerMap['topics']) ? $headerMap['topics'] : null;

        $created = 0;
        $skipped = 0;
        $errors = [];

        $stmtCheck = $this->conn->prepare("SELECT id FROM courses WHERE LOWER(name) = LOWER(:n) LIMIT 1");
        $stmtInsert = $this->conn->prepare("INSERT INTO courses (name, description, topics) VALUES (:n, :d, :t)");

        $this->conn->beginTransaction();
        try {
            while (($row = fgetcsv($handle, 1000, ",")) !== false) {
                if (empty($row) || !isset($row[$nameKey])) continue;
                $name = trim($row[$nameKey]);
                if (empty($name)) continue;

                $desc = ($descKey !== null && isset($row[$descKey])) ? trim($row[$descKey]) : null;
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
                    ':t' => $topics
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
}
