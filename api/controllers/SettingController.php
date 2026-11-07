<?php
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../lib/Auth.php';
require_once __DIR__ . '/../lib/TenantContext.php';

class SettingController {
    private $conn;

    public function __construct() {
        $db = new Database();
        $this->conn = $db->getConnection();
    }

    // Get all system settings scoped to current tenant
    public function getSettings() {
        Auth::authenticate(); // Any authenticated user can read settings
        $tenant = TenantContext::getTenant();
        $tenantId = TenantContext::getTenantId();

        try {
            // First load baseline settings
            $stmt = $this->conn->prepare("SELECT setting_key, setting_value FROM system_settings WHERE tenant_id = 1 OR tenant_id IS NULL");
            $stmt->execute();
            $rows = $stmt->fetchAll();

            $settings = [];
            foreach ($rows as $row) {
                $settings[$row['setting_key']] = $row['setting_value'];
            }

            // If tenant is not 1, overlay tenant-specific overrides
            if ($tenantId !== 1) {
                $tStmt = $this->conn->prepare("SELECT setting_key, setting_value FROM system_settings WHERE tenant_id = ?");
                $tStmt->execute([$tenantId]);
                while ($tRow = $tStmt->fetch()) {
                    $settings[$tRow['setting_key']] = $tRow['setting_value'];
                }
            }

            // Overlay tenant model profile properties
            $settings['school_name']     = $tenant['name'] ?? ($settings['school_name'] ?? 'School');
            $settings['school_acronym']  = $tenant['acronym'] ?? ($settings['school_acronym'] ?? 'SCH');
            $settings['school_motto']    = $tenant['motto'] ?? ($settings['school_motto'] ?? '');
            $settings['school_vision']   = $tenant['vision'] ?? ($settings['school_vision'] ?? '');
            $settings['school_campus']   = $tenant['campus'] ?? ($settings['school_campus'] ?? '');
            $settings['school_address']  = $tenant['address'] ?? ($settings['school_address'] ?? '');
            $settings['school_email']    = $tenant['email'] ?? ($settings['school_email'] ?? '');
            $settings['school_phone']    = $tenant['phone'] ?? ($settings['school_phone'] ?? '');
            $settings['school_principal']= $tenant['principal_name'] ?? ($settings['school_principal'] ?? '');
            $settings['school_director'] = $tenant['director_name'] ?? ($settings['school_director'] ?? '');
            $settings['school_logo_path']= $tenant['logo_url'] ?? ($settings['school_logo_path'] ?? 'uploads/logos/default_school.png');
            $settings['theme_primary']   = $tenant['theme_primary'] ?? '#023047';
            $settings['theme_secondary'] = $tenant['theme_secondary'] ?? '#219ebc';
            $settings['theme_accent']    = $tenant['theme_accent'] ?? '#ffb703';

            echo json_encode(["success" => true, "settings" => $settings, "tenant" => $tenant]);
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
        if (!in_array($category, ['junior_secondary', 'senior_secondary', 'secondary', 'nursery', 'primary'])) {
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

    public function uploadSchoolLogo() {
        Auth::requireRole(['admin']);

        if (!isset($_FILES['logo_file'])) {
            http_response_code(400);
            echo json_encode(["error" => "Logo file is required"]);
            return;
        }

        $file = $_FILES['logo_file'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, ['png', 'jpg', 'jpeg', 'webp', 'svg'])) {
            http_response_code(400);
            echo json_encode(["error" => "Only PNG, JPG, WEBP, or SVG images are allowed."]);
            return;
        }

        $targetDir = __DIR__ . "/../uploads/logos/";
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0777, true);
        }

        $fileName = "school_logo_" . time() . "." . $ext;
        $targetFilePath = $targetDir . $fileName;
        $relPath = "uploads/logos/" . $fileName;

        if (move_uploaded_file($file["tmp_name"], $targetFilePath)) {
            $stmt = $this->conn->prepare("
                INSERT INTO system_settings (setting_key, setting_value) 
                VALUES ('school_logo_path', :val)
                ON DUPLICATE KEY UPDATE setting_value = :val
            ");
            $stmt->execute([':val' => $relPath]);

            echo json_encode([
                "success" => true,
                "message" => "School logo updated successfully.",
                "logo_path" => $relPath
            ]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Failed to save uploaded logo file."]);
        }
    }

    public function uploadPrincipalSignature() {
        Auth::requireRole(['admin']);

        if (!isset($_FILES['signature_file'])) {
            http_response_code(400);
            echo json_encode(["error" => "Signature file is required."]);
            return;
        }

        $file = $_FILES['signature_file'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, ['png', 'jpg', 'jpeg', 'webp', 'svg'])) {
            http_response_code(400);
            echo json_encode(["error" => "Only PNG, JPG, WEBP, or SVG images are allowed."]);
            return;
        }

        $targetDir = __DIR__ . "/../uploads/signatures/";
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0777, true);
        }

        $fileName = "principal_signature_" . time() . "." . $ext;
        $targetFilePath = $targetDir . $fileName;
        $relPath = "uploads/signatures/" . $fileName;

        if (move_uploaded_file($file["tmp_name"], $targetFilePath)) {
            $stmt = $this->conn->prepare("
                INSERT INTO system_settings (setting_key, setting_value) 
                VALUES ('principal_signature_path', :val)
                ON DUPLICATE KEY UPDATE setting_value = :val
            ");
            $stmt->execute([':val' => $relPath]);

            echo json_encode([
                "success" => true,
                "message" => "Principal signature uploaded successfully.",
                "signature_path" => $relPath
            ]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Failed to save uploaded signature file."]);
        }
    }
}

