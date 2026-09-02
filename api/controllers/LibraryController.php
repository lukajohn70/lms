<?php
require_once 'config/Database.php';
require_once 'lib/Auth.php';

class LibraryController {
    private $conn;

    public function __construct() {
        $db = new Database();
        $this->conn = $db->getConnection();
    }

    public function getBooks() {
        $stmt = $this->conn->query("
            SELECT id, title, author, category, cover_image_path, file_path, created_at 
            FROM library_books 
            ORDER BY created_at DESC
        ");
        echo json_encode(["books" => $stmt->fetchAll()]);
    }

    public function uploadBook() {
        $user = Auth::requireRole(['admin']);
        
        if (!isset($_FILES['file']) || empty($_POST['title'])) {
            http_response_code(400);
            echo json_encode(["error" => "Title and file are required"]);
            return;
        }

        $title = trim($_POST['title']);
        $author = isset($_POST['author']) ? trim($_POST['author']) : null;
        $category = isset($_POST['category']) ? trim($_POST['category']) : null;

        $uploadDir = __DIR__ . '/../uploads/library/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        // Handle File Upload
        $file = $_FILES['file'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $fileName = time() . "_" . preg_replace("/[^a-zA-Z0-9]/", "", $title) . "." . $ext;
        $filePath = "uploads/library/" . $fileName;

        if (!move_uploaded_file($file['tmp_name'], __DIR__ . '/../' . $filePath)) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to save file"]);
            return;
        }

        // Handle Optional Cover Image
        $coverPath = null;
        if (isset($_FILES['cover'])) {
            $cover = $_FILES['cover'];
            $cExt = strtolower(pathinfo($cover['name'], PATHINFO_EXTENSION));
            if (in_array($cExt, ['jpg', 'jpeg', 'png', 'webp'])) {
                $cName = time() . "_cover_" . preg_replace("/[^a-zA-Z0-9]/", "", $title) . "." . $cExt;
                $cPath = "uploads/library/" . $cName;
                if (move_uploaded_file($cover['tmp_name'], __DIR__ . '/../' . $cPath)) {
                    $coverPath = $cPath;
                }
            }
        }

        try {
            $stmt = $this->conn->prepare("
                INSERT INTO library_books (title, author, category, cover_image_path, file_path, uploaded_by) 
                VALUES (:t, :a, :c, :cp, :fp, :u)
            ");
            $stmt->execute([
                ':t' => $title,
                ':a' => $author,
                ':c' => $category,
                ':cp' => $coverPath,
                ':fp' => $filePath,
                ':u' => $user['id']
            ]);

            echo json_encode(["success" => true, "message" => "Book uploaded successfully"]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Database error: " . $e->getMessage()]);
        }
    }

    public function deleteBook() {
        Auth::requireRole(['admin']);
        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;

        try {
            $stmt = $this->conn->prepare("SELECT file_path, cover_image_path FROM library_books WHERE id = :id");
            $stmt->execute([':id' => $id]);
            $book = $stmt->fetch();

            if ($book) {
                if ($book['file_path'] && file_exists(__DIR__ . '/../' . $book['file_path'])) unlink(__DIR__ . '/../' . $book['file_path']);
                if ($book['cover_image_path'] && file_exists(__DIR__ . '/../' . $book['cover_image_path'])) unlink(__DIR__ . '/../' . $book['cover_image_path']);
                
                $delStmt = $this->conn->prepare("DELETE FROM library_books WHERE id = :id");
                $delStmt->execute([':id' => $id]);
            }
            echo json_encode(["success" => true]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to delete: " . $e->getMessage()]);
        }
    }
}
