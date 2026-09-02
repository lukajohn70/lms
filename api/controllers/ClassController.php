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
        } catch (Exception $e) {}
    }

    // Get all classes
    public function getClasses() {
        Auth::requireRole(['admin', 'teacher']);
        
        $stmt = $this->conn->query("SELECT * FROM classes ORDER BY name ASC");
        $classes = $stmt->fetchAll();
        
        echo json_encode(["classes" => $classes]);
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

            foreach ($data->subjects as $sub) {
                $stmtInsert->execute([
                    ':cid' => $classId,
                    ':coid' => intval($sub->course_id),
                    ':t' => $sub->type, // 'core' or 'elective'
                    ':eg' => ($sub->type === 'elective' && !empty($sub->elective_group)) ? $sub->elective_group : null,
                    ':tid' => !empty($sub->teacher_id) ? intval($sub->teacher_id) : null
                ]);
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
