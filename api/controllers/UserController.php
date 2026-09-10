<?php
require_once 'config/Database.php';
require_once 'lib/Auth.php';

class UserController {
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

    public function me() {
        $user = Auth::authenticate();

        // If teacher, enrich with Form Teacher and HOD details
        if ($user['role'] === 'teacher') {
            $tStmt = $this->conn->prepare("SELECT is_hod, hod_department FROM users WHERE id = :id");
            $tStmt->execute([':id' => $user['id']]);
            $tRow = $tStmt->fetch();

            $user['is_hod'] = !empty($tRow['is_hod']) && intval($tRow['is_hod']) === 1;
            $user['hod_department'] = $tRow['hod_department'] ?? null;

            // Form classes
            $fcStmt = $this->conn->prepare("SELECT id, name FROM classes WHERE form_teacher_id = :id ORDER BY name ASC");
            $fcStmt->execute([':id' => $user['id']]);
            $formClasses = $fcStmt->fetchAll();

            $user['is_form_teacher'] = count($formClasses) > 0;
            $user['form_classes'] = $formClasses;
        }

        http_response_code(200);
        echo json_encode(["user" => $user]);
    }

    public function index() {
        $admin = Auth::requireRole(['admin']);
        
        $query = "
            SELECT u.id, u.email, u.role, u.first_name, u.last_name, u.phone, u.class_id, u.created_at,
                   u.is_hod, u.hod_department,
                   (SELECT GROUP_CONCAT(c.name SEPARATOR ', ') FROM classes c WHERE c.form_teacher_id = u.id) as form_classes_names
            FROM users u
            ORDER BY u.id DESC
        ";
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
        $session = $this->getSetting('academic_session', '2023/2024');
        $term = $this->getSetting('current_term', '3rd Term');

        try {
            $stmt = $this->conn->prepare("UPDATE users SET class_id = :class_id WHERE id = :id AND role = 'student'");
            $stmt->execute([':class_id' => $classId, ':id' => $studentId]);

            // If a class was assigned, stamp into student_class_history for current term & session
            if ($classId !== null) {
                $histStmt = $this->conn->prepare("
                    INSERT INTO student_class_history (student_id, class_id, academic_session, academic_term)
                    VALUES (:sid, :cid, :sess, :term)
                    ON DUPLICATE KEY UPDATE class_id = :cid2, assigned_at = CURRENT_TIMESTAMP
                ");
                $histStmt->execute([
                    ':sid' => $studentId,
                    ':cid' => $classId,
                    ':sess' => $session,
                    ':term' => $term,
                    ':cid2' => $classId
                ]);
            }

            echo json_encode(["success" => true, "message" => "Student class assigned successfully"]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to assign class: " . $e->getMessage()]);
        }
    }

    // Admin: Create a new user (admin, teacher, parent, student)
    public function createUser() {
        Auth::requireRole(['admin']);
        $data = json_decode(file_get_contents("php://input"), true);

        if (!$data || empty($data['email']) || empty($data['first_name']) || empty($data['last_name'])) {
            http_response_code(400);
            echo json_encode(["error" => "First name, last name, and email are required."]);
            return;
        }

        $email = strtolower(trim($data['email']));
        $firstName = trim($data['first_name']);
        $lastName = trim($data['last_name']);
        $role = in_array($data['role'] ?? '', ['admin', 'teacher', 'student', 'parent']) ? $data['role'] : 'admin';
        $phone = !empty($data['phone']) ? trim($data['phone']) : null;
        $password = !empty($data['password']) ? trim($data['password']) : '12345678';
        $isHod = !empty($data['is_hod']) ? 1 : 0;
        $hodDept = !empty($data['hod_department']) ? trim($data['hod_department']) : null;

        // Check duplicate email
        $chk = $this->conn->prepare("SELECT id FROM users WHERE email = :email");
        $chk->execute([':email' => $email]);
        if ($chk->fetchColumn()) {
            http_response_code(400);
            echo json_encode(["error" => "A user with this email address already exists."]);
            return;
        }

        try {
            $pwdHash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $this->conn->prepare("
                INSERT INTO users (email, password_hash, role, first_name, last_name, phone, is_hod, hod_department)
                VALUES (:email, :pwd, :role, :fn, :ln, :phone, :is_hod, :hod_dept)
            ");
            $stmt->execute([
                ':email' => $email,
                ':pwd' => $pwdHash,
                ':role' => $role,
                ':fn' => $firstName,
                ':ln' => $lastName,
                ':phone' => $phone,
                ':is_hod' => $isHod,
                ':hod_dept' => $hodDept
            ]);
            $newId = $this->conn->lastInsertId();

            echo json_encode([
                "success" => true,
                "message" => "Account created successfully.",
                "user" => [
                    "id" => $newId,
                    "email" => $email,
                    "role" => $role,
                    "first_name" => $firstName,
                    "last_name" => $lastName
                ]
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to create account: " . $e->getMessage()]);
        }
    }

    // Admin: Update user details (name, email, phone, role, is_hod, hod_department)
    public function updateUser() {
        Auth::requireRole(['admin']);
        $data = json_decode(file_get_contents("php://input"), true);

        if (!$data || empty($data['id']) || empty($data['first_name']) || empty($data['last_name']) || empty($data['email'])) {
            http_response_code(400);
            echo json_encode(["error" => "ID, first name, last name, and email are required."]);
            return;
        }

        $id = intval($data['id']);
        $email = strtolower(trim($data['email']));
        $firstName = trim($data['first_name']);
        $lastName = trim($data['last_name']);
        $phone = !empty($data['phone']) ? trim($data['phone']) : null;
        $role = in_array($data['role'] ?? '', ['admin', 'teacher', 'student', 'parent']) ? $data['role'] : null;
        $isHod = isset($data['is_hod']) ? (intval($data['is_hod']) === 1 ? 1 : 0) : null;
        $hodDept = isset($data['hod_department']) ? trim($data['hod_department']) : null;

        // Check email uniqueness if changed
        $chk = $this->conn->prepare("SELECT id FROM users WHERE email = :email AND id != :id");
        $chk->execute([':email' => $email, ':id' => $id]);
        if ($chk->fetchColumn()) {
            http_response_code(400);
            echo json_encode(["error" => "Another user with this email already exists."]);
            return;
        }

        try {
            $query = "UPDATE users SET first_name = :fn, last_name = :ln, email = :email, phone = :phone";
            $params = [
                ':fn' => $firstName,
                ':ln' => $lastName,
                ':email' => $email,
                ':phone' => $phone,
                ':id' => $id
            ];

            if ($role !== null) {
                $query .= ", role = :role";
                $params[':role'] = $role;
            }
            if ($isHod !== null) {
                $query .= ", is_hod = :is_hod, hod_department = :hod_dept";
                $params[':is_hod'] = $isHod;
                $params[':hod_dept'] = $hodDept;
            }

            $query .= " WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->execute($params);

            echo json_encode(["success" => true, "message" => "User updated successfully."]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to update user: " . $e->getMessage()]);
        }
    }

    // Admin: Delete user (guard against self-deletion)
    public function deleteUser() {
        $admin = Auth::requireRole(['admin']);
        $data = json_decode(file_get_contents("php://input"), true);

        if (!$data || empty($data['id'])) {
            http_response_code(400);
            echo json_encode(["error" => "User ID is required."]);
            return;
        }

        $id = intval($data['id']);
        if ($id === intval($admin['id'])) {
            http_response_code(400);
            echo json_encode(["error" => "Security Protection: You cannot delete your own active administrator account."]);
            return;
        }

        try {
            $stmt = $this->conn->prepare("DELETE FROM users WHERE id = :id");
            $stmt->execute([':id' => $id]);

            echo json_encode(["success" => true, "message" => "Account deleted successfully."]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to delete account: " . $e->getMessage()]);
        }
    }

    // Admin: Reset password for any account
    public function resetPassword() {
        Auth::requireRole(['admin']);
        $data = json_decode(file_get_contents("php://input"), true);

        if (!$data || empty($data['user_id']) || empty($data['new_password'])) {
            http_response_code(400);
            echo json_encode(["error" => "User ID and new password are required."]);
            return;
        }

        $userId = intval($data['user_id']);
        $newPassword = trim($data['new_password']);
        if (strlen($newPassword) < 6) {
            http_response_code(400);
            echo json_encode(["error" => "New password must be at least 6 characters."]);
            return;
        }

        try {
            $pwdHash = password_hash($newPassword, PASSWORD_DEFAULT);
            $stmt = $this->conn->prepare("UPDATE users SET password_hash = :pwd WHERE id = :id");
            $stmt->execute([':pwd' => $pwdHash, ':id' => $userId]);

            echo json_encode(["success" => true, "message" => "Password reset successfully."]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to reset password: " . $e->getMessage()]);
        }
    }

    // Admin: Appoint/unappoint teacher as HOD
    public function appointHod() {
        Auth::requireRole(['admin']);
        $data = json_decode(file_get_contents("php://input"), true);

        if (!$data || empty($data['teacher_id'])) {
            http_response_code(400);
            echo json_encode(["error" => "Teacher ID is required."]);
            return;
        }

        $teacherId = intval($data['teacher_id']);
        $isHod = !empty($data['is_hod']) ? 1 : 0;
        $department = !empty($data['department']) ? trim($data['department']) : null;

        try {
            $stmt = $this->conn->prepare("UPDATE users SET is_hod = :is_hod, hod_department = :dept WHERE id = :id AND role = 'teacher'");
            $stmt->execute([':is_hod' => $isHod, ':dept' => $department, ':id' => $teacherId]);

            echo json_encode([
                "success" => true,
                "message" => $isHod ? "Teacher appointed as HOD of $department." : "HOD appointment revoked."
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to update HOD appointment: " . $e->getMessage()]);
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
