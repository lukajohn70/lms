<?php
require_once 'config/Database.php';
require_once 'lib/Auth.php';

class UserController {
    private $conn;

    public function __construct() {
        $db = new Database();
        $this->conn = $db->getConnection();
    }

    public function me() {
        $user = Auth::authenticate();
        http_response_code(200);
        echo json_encode(["user" => $user]);
    }

    public function index() {
        $admin = Auth::requireRole(['admin']);
        
        $query = "SELECT id, email, role, first_name, last_name, class_id, created_at FROM users";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        
        $users = $stmt->fetchAll();
        
        http_response_code(200);
        echo json_encode(["users" => $users]);
    }

    public function updateProfile() {
        $user = Auth::authenticate();

        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid input"]);
            return;
        }

        $firstName   = isset($data['first_name']) ? trim($data['first_name']) : null;
        $lastName    = isset($data['last_name'])  ? trim($data['last_name'])  : null;
        $phone       = isset($data['phone'])       ? trim($data['phone'])       : null;
        $relationship = isset($data['relationship']) ? trim($data['relationship']) : null;

        if (!$firstName || !$lastName) {
            http_response_code(400);
            echo json_encode(["error" => "First name and last name are required"]);
            return;
        }

        $query = "UPDATE users SET first_name = :fn, last_name = :ln";
        $params = [':fn' => $firstName, ':ln' => $lastName, ':id' => $user['id']];

        if ($phone !== null) {
            $query .= ", phone = :phone";
            $params[':phone'] = $phone;
        }
        if ($relationship !== null) {
            $query .= ", relationship = :rel";
            $params[':rel'] = $relationship;
        }

        $query .= " WHERE id = :id";

        try {
            $stmt = $this->conn->prepare($query);
            $stmt->execute($params);
            echo json_encode(["success" => true, "message" => "Profile updated successfully"]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to update profile: " . $e->getMessage()]);
        }
    }

    public function updatePassword() {
        $user = Auth::authenticate();

        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data || empty($data['current_password']) || empty($data['new_password'])) {
            http_response_code(400);
            echo json_encode(["error" => "Current and new passwords are required"]);
            return;
        }

        // Fetch stored password hash
        $stmt = $this->conn->prepare("SELECT password_hash FROM users WHERE id = :id");
        $stmt->execute([':id' => $user['id']]);
        $row = $stmt->fetch();

        if (!$row || !password_verify($data['current_password'], $row['password_hash'])) {
            http_response_code(401);
            echo json_encode(["error" => "Current password is incorrect"]);
            return;
        }

        if (strlen($data['new_password']) < 8) {
            http_response_code(400);
            echo json_encode(["error" => "New password must be at least 8 characters"]);
            return;
        }

        $newHash = password_hash($data['new_password'], PASSWORD_DEFAULT);

        try {
            $stmt = $this->conn->prepare("UPDATE users SET password_hash = :pw WHERE id = :id");
            $stmt->execute([':pw' => $newHash, ':id' => $user['id']]);
            echo json_encode(["success" => true, "message" => "Password updated successfully"]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to update password: " . $e->getMessage()]);
        }
    }

    public function updateAvatar() {
        $user = Auth::authenticate();

        if (!isset($_FILES['avatar'])) {
            http_response_code(400);
            echo json_encode(["error" => "No file uploaded"]);
            return;
        }

        $file = $_FILES['avatar'];
        $targetDir = __DIR__ . "/../uploads/avatars/";
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0777, true);
        }

        $fileName = time() . "_" . preg_replace("/[^A-Za-z0-9\.\-_]/", "", basename($file["name"]));
        $targetFilePath = $targetDir . $fileName;
        
        $fileType = strtolower(pathinfo($targetFilePath, PATHINFO_EXTENSION));
        $allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

        if (!in_array($fileType, $allowedTypes)) {
            http_response_code(400);
            echo json_encode(["error" => "Only JPG, JPEG, PNG, GIF, and WEBP files are allowed."]);
            return;
        }

        if (move_uploaded_file($file["tmp_name"], $targetFilePath)) {
            $dbFilePath = "uploads/avatars/" . $fileName;

            try {
                $stmt = $this->conn->prepare("UPDATE users SET avatar_path = :path WHERE id = :id");
                $stmt->execute([':path' => $dbFilePath, ':id' => $user['id']]);
                echo json_encode(["success" => true, "avatar_path" => $dbFilePath]);
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(["error" => "Failed to update database: " . $e->getMessage()]);
            }
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Failed to move uploaded file."]);
        }
    }

    public function sendSupportTicket() {
        $user = Auth::authenticate();

        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data || empty($data['subject']) || empty($data['message'])) {
            http_response_code(400);
            echo json_encode(["error" => "Subject and message are required"]);
            return;
        }

        try {
            // Find first admin user
            $adminStmt = $this->conn->query("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1");
            $admin = $adminStmt->fetch();
            if (!$admin) {
                http_response_code(500);
                echo json_encode(["error" => "No admin user found in system to route ticket to."]);
                return;
            }

            $stmt = $this->conn->prepare("
                INSERT INTO messages (sender_id, receiver_id, subject, body, is_read) 
                VALUES (:sender_id, :receiver_id, :subject, :body, 0)
            ");
            $stmt->execute([
                ':sender_id' => $user['id'],
                ':receiver_id' => $admin['id'],
                ':subject' => "SUPPORT: " . trim($data['subject']),
                ':body' => trim($data['message'])
            ]);

            echo json_encode(["success" => true, "message" => "Support ticket submitted successfully."]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to send support ticket: " . $e->getMessage()]);
        }
    }

    public function assignStudentClass() {
        Auth::requireRole(['admin']);
        $data = json_decode(file_get_contents("php://input"));

        if (empty($data->student_id)) {
            http_response_code(400);
            echo json_encode(["error" => "student_id is required"]);
            return;
        }

        $studentId = intval($data->student_id);
        $classId = !empty($data->class_id) ? intval($data->class_id) : null;

        try {
            $stmt = $this->conn->prepare("UPDATE users SET class_id = :class_id WHERE id = :id AND role = 'student'");
            $stmt->execute([':class_id' => $classId, ':id' => $studentId]);
            echo json_encode(["success" => true, "message" => "Student class assigned successfully"]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to assign class: " . $e->getMessage()]);
        }
    }

    public function bulkImportUsers() {
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
            echo json_encode(["error" => "Failed to open uploaded file"]);
            return;
        }

        // Read header line
        // Ignore commented out rows at top of file
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

        // Map header columns to indices
        $headerMap = array_flip(array_map('trim', $headers));
        
        $requiredKeys = ['first_name', 'last_name', 'role'];
        foreach ($requiredKeys as $k) {
            if (!isset($headerMap[$k])) {
                fclose($handle);
                http_response_code(400);
                echo json_encode(["error" => "CSV is missing required header column: $k. Please use the downloaded template."]);
                return;
            }
        }

        $imported = 0;
        $errors = [];
        $lineNum = 1;

        $this->conn->beginTransaction();

        try {
            $stmtCheck = $this->conn->prepare("SELECT id FROM users WHERE email = :email LIMIT 1");
            $stmtInsert = $this->conn->prepare("
                INSERT INTO users (email, password_hash, role, first_name, last_name, phone, relationship) 
                VALUES (:email, :password_hash, :role, :first_name, :last_name, :phone, :relationship)
            ");

            while (($row = fgetcsv($handle, 1000, ",")) !== false) {
                $lineNum++;
                
                // Get values by header index
                $firstName = isset($row[$headerMap['first_name']]) ? trim($row[$headerMap['first_name']]) : '';
                $lastName = isset($row[$headerMap['last_name']]) ? trim($row[$headerMap['last_name']]) : '';
                $email = isset($row[$headerMap['email']]) ? trim($row[$headerMap['email']]) : '';
                $role = isset($row[$headerMap['role']]) ? trim(strtolower($row[$headerMap['role']])) : '';
                
                $phone = isset($headerMap['phone']) && isset($row[$headerMap['phone']]) ? trim($row[$headerMap['phone']]) : null;
                $relationship = isset($headerMap['relationship']) && isset($row[$headerMap['relationship']]) ? trim($row[$headerMap['relationship']]) : null;

                if (empty($firstName) || empty($lastName) || empty($role)) {
                    $errors[] = "Line $lineNum: Incomplete data — first_name, last_name, and role are required.";
                    continue;
                }

                if (!in_array($role, ['admin', 'parent', 'student', 'teacher'])) {
                    $errors[] = "Line $lineNum: Invalid role '$role'. Allowed roles: admin, parent, student, teacher.";
                    continue;
                }

                // Auto-generate email: firstname.lastname@aroura.edu
                $baseEmail = strtolower(preg_replace('/[^A-Za-z]/', '', $firstName) . '.' . preg_replace('/[^A-Za-z]/', '', $lastName));
                $email = $baseEmail . '@aroura.edu';
                
                // Handle duplicate emails by appending a number
                $suffix = 1;
                while (true) {
                    $stmtCheck->execute([':email' => $email]);
                    if ($stmtCheck->rowCount() === 0) {
                        break;
                    }
                    $email = $baseEmail . $suffix . '@aroura.edu';
                    $suffix++;
                }

                // Auto-generate password: firstname + 4 random digits
                $autoPassword = strtolower(preg_replace('/[^A-Za-z]/', '', $firstName)) . rand(1000, 9999);

                // Insert user with auto-generated password
                $passwordHash = password_hash($autoPassword, PASSWORD_BCRYPT);
                $stmtInsert->execute([
                    ':email' => $email,
                    ':password_hash' => $passwordHash,
                    ':role' => $role,
                    ':first_name' => $firstName,
                    ':last_name' => $lastName,
                    ':phone' => empty($phone) ? null : $phone,
                    ':relationship' => empty($relationship) ? null : $relationship
                ]);

                $imported++;
            }

            $this->conn->commit();
            fclose($handle);

            echo json_encode([
                "success" => true, 
                "message" => "Import completed. $imported user(s) created.",
                "created" => $imported,
                "errors" => $errors
            ]);

        } catch (Exception $e) {
            $this->conn->rollBack();
            fclose($handle);
            http_response_code(500);
            echo json_encode(["error" => "Failed to import users: " . $e->getMessage()]);
        }
    }
}
