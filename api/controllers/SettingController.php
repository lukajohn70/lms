<?php
require_once 'config/Database.php';
require_once 'lib/Auth.php';

class SettingController {
    private $conn;

    public function __construct() {
        $db = new Database();
        $this->conn = $db->getConnection();
    }

    // Get all system settings
    public function getSettings() {
        Auth::authenticate(); // Any authenticated user can read settings

        try {
            $stmt = $this->conn->query("SELECT setting_key, setting_value FROM system_settings");
            $rows = $stmt->fetchAll();

            $settings = [];
            foreach ($rows as $row) {
                $settings[$row['setting_key']] = $row['setting_value'];
            }

            echo json_encode(["success" => true, "settings" => $settings]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to fetch settings: " . $e->getMessage()]);
        }
    }

    // Save/update system settings
    public function saveSettings() {
        Auth::requireRole(['admin']); // Only admins can modify settings

        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data) {
            http_response_code(400);
            echo json_encode(["error" => "Incomplete or invalid data"]);
            return;
        }

        try {
            $this->conn->beginTransaction();

            $query = "
                INSERT INTO system_settings (setting_key, setting_value) 
                VALUES (:key, :val)
                ON DUPLICATE KEY UPDATE setting_value = :val
            ";
            $stmt = $this->conn->prepare($query);

            foreach ($data as $key => $value) {
                // Keep values as strings for consistency in the DB
                $valStr = is_bool($value) ? ($value ? "1" : "0") : strval($value);
                $stmt->execute([
                    ':key' => $key,
                    ':val' => $valStr
                ]);
            }

            $this->conn->commit();
            echo json_encode(["success" => true, "message" => "Settings saved successfully"]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(["error" => "Failed to save settings: " . $e->getMessage()]);
        }
    }

    public function uploadStudyGuide() {
        Auth::requireRole(['admin']);

        if (!isset($_POST['category']) || !isset($_FILES['guide_file'])) {
            http_response_code(400);
            echo json_encode(["error" => "Category and file are required"]);
            return;
        }

        $category = $_POST['category'];
        if (!in_array($category, ['nursery', 'primary', 'secondary'])) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid category"]);
            return;
        }

        $file = $_FILES['guide_file'];
        $targetDir = __DIR__ . "/../../public/study_guides/";
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0777, true);
        }

        $targetFilePath = $targetDir . $category . "_guide.pdf";

        // Validate PDF type
        $fileType = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if ($fileType !== 'pdf') {
            http_response_code(400);
            echo json_encode(["error" => "Only PDF files are allowed for study guides."]);
            return;
        }

        if (move_uploaded_file($file["tmp_name"], $targetFilePath)) {
            echo json_encode(["success" => true, "message" => ucfirst($category) . " study guide updated successfully."]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Failed to save the uploaded study guide file."]);
        }
    }
}
