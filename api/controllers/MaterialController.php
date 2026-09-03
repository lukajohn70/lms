<?php
require_once 'config/Database.php';
require_once 'lib/Auth.php';

class MaterialController {
    private $conn;

    public function __construct() {
        $db = new Database();
        $this->conn = $db->getConnection();
    }

    public function upload() {
        $user = Auth::requireRole(['teacher', 'admin']);
        
        if (!isset($_POST['course_id']) || !isset($_POST['title']) || !isset($_FILES['material_file'])) {
            http_response_code(400);
            echo json_encode(["error" => "Course ID, title, and file are required"]);
            return;
        }

        $courseId = $_POST['course_id'];
        $title = $_POST['title'];
        $description = isset($_POST['description']) ? $_POST['description'] : '';
        $file = $_FILES['material_file'];

        // Verify course exists and user has permission (if teacher, verify they teach the course)
        $courseQuery = "SELECT id, teacher_id FROM courses WHERE id = :id";
        $cStmt = $this->conn->prepare($courseQuery);
        $cStmt->bindParam(':id', $courseId);
        $cStmt->execute();
        $course = $cStmt->fetch();

        if (!$course) {
            http_response_code(404);
            echo json_encode(["error" => "Course not found"]);
            return;
        }

        if ($user['role'] === 'teacher') {
            $s = $this->conn->prepare("SELECT 1 FROM class_subjects WHERE course_id = :cid AND teacher_id = :tid LIMIT 1");
            $s->execute([':cid' => $course['id'], ':tid' => $user['id']]);
            $inClass = $s->fetchColumn();
            if ($course['teacher_id'] != $user['id'] && !$inClass) {
                http_response_code(403);
                echo json_encode(["error" => "You don't have permission to upload to this course"]);
                return;
            }
        }

        // File upload handling
        $targetDir = __DIR__ . "/../uploads/materials/";
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0777, true);
        }

        $fileName = time() . "_" . basename($file["name"]);
        $targetFilePath = $targetDir . $fileName;
        
        // Basic validation (can be expanded)
        $fileType = strtolower(pathinfo($targetFilePath, PATHINFO_EXTENSION));
        $allowedTypes = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'zip', 'jpg', 'png'];

        if (!in_array($fileType, $allowedTypes)) {
            http_response_code(400);
            echo json_encode(["error" => "Sorry, only PDF, DOC, PPT, ZIP, JPG, & PNG files are allowed."]);
            return;
        }

        if (move_uploaded_file($file["tmp_name"], $targetFilePath)) {
            // Save to database
            // Store relative path so it's accessible via web server
            $dbFilePath = "uploads/materials/" . $fileName;

            $query = "INSERT INTO materials (course_id, title, description, file_path, uploaded_by) VALUES (:course_id, :title, :description, :file_path, :uploaded_by)";
            $stmt = $this->conn->prepare($query);

            $stmt->bindParam(':course_id', $courseId);
            $stmt->bindParam(':title', $title);
            $stmt->bindParam(':description', $description);
            $stmt->bindParam(':file_path', $dbFilePath);
            $stmt->bindParam(':uploaded_by', $user['id']);

            if ($stmt->execute()) {
                http_response_code(201);
                echo json_encode([
                    "message" => "File uploaded successfully.",
                    "file_path" => $dbFilePath
                ]);
            } else {
                http_response_code(500);
                echo json_encode(["error" => "Database error: unable to save file info"]);
            }
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Sorry, there was an error uploading your file."]);
        }
    }

    public function getTeacherMaterials() {
        $user = Auth::requireRole(['teacher', 'admin']);

        $query = "
            SELECT m.id, m.title, m.description, m.file_path, m.created_at,
                   c.name AS course_name, c.id AS course_id
            FROM materials m
            JOIN courses c ON m.course_id = c.id
            WHERE m.uploaded_by = :uid
            ORDER BY m.created_at DESC
        ";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([':uid' => $user['id']]);
        $rows = $stmt->fetchAll();

        $materials = [];
        foreach ($rows as $r) {
            $ext = strtolower(pathinfo($r['file_path'], PATHINFO_EXTENSION));
            $type = in_array($ext, ['mp4','mov','avi','webm']) ? 'video'
                  : (in_array($ext, ['jpg','jpeg','png','gif','webp']) ? 'image' : 'pdf');
            $materials[] = [
                'id'          => $r['id'],
                'title'       => $r['title'],
                'description' => $r['description'],
                'file_path'   => $r['file_path'],
                'course_id'   => $r['course_id'],
                'course_name' => $r['course_name'],
                'file_type'   => $type,
                'ext'         => $ext,
                'date'        => date('M j', strtotime($r['created_at'])),
            ];
        }

        echo json_encode(['materials' => $materials]);
    }

    public function getStudentMaterials() {
        $user = Auth::requireRole(['student']);
        
        $query = "
            SELECT m.id, m.title, m.description, m.file_path, m.created_at,
                   c.name AS course_name, c.id AS course_id,
                   CONCAT(t.first_name, ' ', t.last_name) as teacher_name
            FROM materials m
            JOIN courses c ON m.course_id = c.id
            LEFT JOIN users t ON m.uploaded_by = t.id
            JOIN enrollments e ON m.course_id = e.course_id
            WHERE e.student_id = :sid
            ORDER BY m.created_at DESC
        ";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([':sid' => $user['id']]);
        $rows = $stmt->fetchAll();

        $materials = [];
        foreach ($rows as $r) {
            $ext = strtolower(pathinfo($r['file_path'], PATHINFO_EXTENSION));
            $type = in_array($ext, ['mp4','mov','avi','webm']) ? 'video'
                  : (in_array($ext, ['jpg','jpeg','png','gif','webp']) ? 'image' : 'pdf');
            $materials[] = [
                'id'          => $r['id'],
                'title'       => $r['title'],
                'description' => $r['description'],
                'file_path'   => $r['file_path'],
                'course_id'   => $r['course_id'],
                'course_name' => $r['course_name'],
                'teacher_name'=> $r['teacher_name'] ?: 'System Upload',
                'file_type'   => $type,
                'ext'         => $ext,
                'date'        => date('M j, Y', strtotime($r['created_at'])),
                'size'        => 'N/A' // file size isn't stored in DB, we could compute or show N/A
            ];
        }

        echo json_encode(['materials' => $materials]);
    }

    public function deleteMaterial() {
        $user = Auth::requireRole(['teacher', 'admin']);

        $data = json_decode(file_get_contents('php://input'), true);
        $id   = isset($data['id']) ? intval($data['id']) : 0;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Material ID required']);
            return;
        }

        // Only allow deleting own materials (teachers) or any (admin)
        if ($user['role'] === 'teacher') {
            $s = $this->conn->prepare("SELECT file_path FROM materials WHERE id = :id AND uploaded_by = :uid LIMIT 1");
            $s->execute([':id' => $id, ':uid' => $user['id']]);
        } else {
            $s = $this->conn->prepare("SELECT file_path FROM materials WHERE id = :id LIMIT 1");
            $s->execute([':id' => $id]);
        }
        $mat = $s->fetch();
        if (!$mat) {
            http_response_code(404);
            echo json_encode(['error' => 'Material not found or access denied']);
            return;
        }

        // Delete physical file
        $filePath = __DIR__ . '/../' . $mat['file_path'];
        if (file_exists($filePath)) { @unlink($filePath); }

        $this->conn->prepare("DELETE FROM materials WHERE id = :id")->execute([':id' => $id]);
        echo json_encode(['success' => true]);
    }
}
