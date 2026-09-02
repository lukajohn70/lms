<?php
require_once 'config/Database.php';
require_once 'lib/Auth.php';

class RegistrationController {
    private $conn;

    public function __construct() {
        $db = new Database();
        $this->conn = $db->getConnection();
    }

    // Parent registers a child
    public function registerChild() {
        $user = Auth::requireRole(['parent']);
        
        $data = json_decode(file_get_contents("php://input"));
        
        if (!isset($data->child_first_name) || !isset($data->child_last_name) || !isset($data->child_dob) || !isset($data->grade_level)) {
            http_response_code(400);
            echo json_encode(["error" => "Incomplete data"]);
            return;
        }

        $query = "INSERT INTO student_registrations (parent_id, child_first_name, child_last_name, child_dob, grade_level) VALUES (:parent_id, :child_first_name, :child_last_name, :child_dob, :grade_level)";
        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(':parent_id', $user['id']);
        $stmt->bindParam(':child_first_name', $data->child_first_name);
        $stmt->bindParam(':child_last_name', $data->child_last_name);
        $stmt->bindParam(':child_dob', $data->child_dob);
        $stmt->bindParam(':grade_level', $data->grade_level);

        if ($stmt->execute()) {
            http_response_code(201);
            echo json_encode(["message" => "Child registration submitted. Pending admin approval."]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Unable to submit registration"]);
        }
    }

    // Admin approves a child registration
    public function approveStudent() {
        $admin = Auth::requireRole(['admin']);
        
        $data = json_decode(file_get_contents("php://input"));
        
        if (!isset($data->registration_id)) {
            http_response_code(400);
            echo json_encode(["error" => "Registration ID is required"]);
            return;
        }

        try {
            $this->conn->beginTransaction();

            // 1. Get the registration details
            $regQuery = "SELECT * FROM student_registrations WHERE id = :id AND status = 'pending'";
            $regStmt = $this->conn->prepare($regQuery);
            $regStmt->bindParam(':id', $data->registration_id);
            $regStmt->execute();
            $registration = $regStmt->fetch();

            if (!$registration) {
                throw new Exception("Registration not found or not pending");
            }

            // 2. Create the child user account
            // Generating a default email and password for the student based on their name for simplicity
            $studentEmail = strtolower($registration['child_first_name'] . '.' . $registration['child_last_name'] . $registration['id'] . '@aroura.com');
            // Remove spaces from email just in case
            $studentEmail = str_replace(' ', '', $studentEmail);
            $defaultPassword = "password123";
            $passwordHash = password_hash($defaultPassword, PASSWORD_BCRYPT);

            // Get school name for prefix
            $sStmt = $this->conn->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'school_name' LIMIT 1");
            $sStmt->execute();
            $sName = $sStmt->fetchColumn();
            $schoolName = $sName ? $sName : "Aroura Academy";
            
            $words = explode(" ", preg_replace("/[^a-zA-Z ]/", "", $schoolName));
            $prefix = "";
            foreach ($words as $w) {
                if (!empty($w)) $prefix .= strtoupper($w[0]);
            }
            if (strlen($prefix) < 2) {
                $prefix = strtoupper(substr($schoolName, 0, 3));
            }
            
            $year = date('Y');
            $admNumber = $prefix . "/" . $year . "/" . str_pad($data->registration_id, 4, '0', STR_PAD_LEFT);

            $userQuery = "INSERT INTO users (email, password_hash, role, first_name, last_name, admission_number) VALUES (:email, :password_hash, 'student', :first_name, :last_name, :adm_num)";
            $userStmt = $this->conn->prepare($userQuery);
            $userStmt->bindParam(':email', $studentEmail);
            $userStmt->bindParam(':password_hash', $passwordHash);
            $userStmt->bindParam(':first_name', $registration['child_first_name']);
            $userStmt->bindParam(':last_name', $registration['child_last_name']);
            $userStmt->bindParam(':adm_num', $admNumber);
            $userStmt->execute();
            
            $studentId = $this->conn->lastInsertId();

            // 3. Link parent and student
            $linkQuery = "INSERT INTO parent_students (parent_id, student_id) VALUES (:parent_id, :student_id)";
            $linkStmt = $this->conn->prepare($linkQuery);
            $linkStmt->bindParam(':parent_id', $registration['parent_id']);
            $linkStmt->bindParam(':student_id', $studentId);
            $linkStmt->execute();

            // 3.5 Generate Tuition and Materials fee invoices for the new student
            // Detect school level from grade_level to pick the right fee tier
            $gradeLevel = strtolower($registration['grade_level'] ?? '');
            if (strpos($gradeLevel, 'nur') !== false || strpos($gradeLevel, 'nursery') !== false) {
                $tuitionKey = 'fee_tuition_nursery';
                $materialsKey = 'fee_materials_nursery';
                $defaultTuition = 75000.00;
                $defaultMaterials = 18000.00;
            } elseif (strpos($gradeLevel, 'pri') !== false || strpos($gradeLevel, 'primary') !== false || preg_match('/^pri|^p[1-6]/i', $gradeLevel)) {
                $tuitionKey = 'fee_tuition_primary';
                $materialsKey = 'fee_materials_primary';
                $defaultTuition = 95000.00;
                $defaultMaterials = 22000.00;
            } else {
                // Default to secondary (JSS/SS)
                $tuitionKey = 'fee_tuition_secondary';
                $materialsKey = 'fee_materials_secondary';
                $defaultTuition = 120000.00;
                $defaultMaterials = 28000.00;
            }

            $tStmt = $this->conn->prepare("SELECT setting_value FROM system_settings WHERE setting_key = :key LIMIT 1");
            $tStmt->execute([':key' => $tuitionKey]);
            $tRow = $tStmt->fetch();
            $tuitionFee = $tRow ? floatval($tRow['setting_value']) : $defaultTuition;

            $mStmt = $this->conn->prepare("SELECT setting_value FROM system_settings WHERE setting_key = :key LIMIT 1");
            $mStmt->execute([':key' => $materialsKey]);
            $mRow = $mStmt->fetch();
            $materialsFee = $mRow ? floatval($mRow['setting_value']) : $defaultMaterials;

            $dueDate = date('Y-m-d', strtotime('+30 days'));
            
            // Note: fees table has NO 'paid' column — payments go in fee_payments table
            $feeQuery = "INSERT INTO fees (student_id, amount, description, status, due_date) VALUES (:student_id, :amount, :description, 'pending', :due_date)";
            $feeStmt = $this->conn->prepare($feeQuery);
            
            // Insert Tuition Fee
            $feeStmt->execute([
                ':student_id' => $studentId,
                ':amount' => $tuitionFee,
                ':description' => '1st Term Tuition Fee',
                ':due_date' => $dueDate
            ]);

            // Insert Materials Fee
            $feeStmt->execute([
                ':student_id' => $studentId,
                ':amount' => $materialsFee,
                ':description' => '1st Term Books & Materials Fee',
                ':due_date' => $dueDate
            ]);


            // 4. Update registration status
            $updateQuery = "UPDATE student_registrations SET status = 'approved' WHERE id = :id";
            $updateStmt = $this->conn->prepare($updateQuery);
            $updateStmt->bindParam(':id', $data->registration_id);
            $updateStmt->execute();

            $this->conn->commit();

            http_response_code(200);
            echo json_encode([
                "message" => "Student approved and created successfully",
                "student_email" => $studentEmail,
                "default_password" => $defaultPassword
            ]);

        } catch (Exception $e) {
            $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(["error" => "Transaction failed: " . $e->getMessage()]);
        }
    }

    // Get children of a logged in parent
    public function getChildren() {
        $parent = Auth::requireRole(['parent']);

        $query = "SELECT u.id, u.first_name, u.last_name, u.email 
                  FROM users u
                  JOIN parent_students ps ON u.id = ps.student_id
                  WHERE ps.parent_id = :parent_id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':parent_id', $parent['id']);
        $stmt->execute();

        $children = $stmt->fetchAll();
        
        // Also get pending registrations
        $pendingQuery = "SELECT id, child_first_name as first_name, child_last_name as last_name, status, created_at 
                         FROM student_registrations 
                         WHERE parent_id = :parent_id AND status != 'approved'";
        $pendingStmt = $this->conn->prepare($pendingQuery);
        $pendingStmt->bindParam(':parent_id', $parent['id']);
        $pendingStmt->execute();
        $pending = $pendingStmt->fetchAll();

        http_response_code(200);
        echo json_encode([
            "active_children" => $children,
            "pending_registrations" => $pending
        ]);
    }

    // Admin assigns a student to a parent
    public function assignParent() {
        Auth::requireRole(['admin']);
        
        $data = json_decode(file_get_contents("php://input"));
        
        if (!isset($data->parent_id) || !isset($data->student_id)) {
            http_response_code(400);
            echo json_encode(["error" => "parent_id and student_id are required"]);
            return;
        }

        // Check if link already exists
        $check = "SELECT parent_id FROM parent_students WHERE parent_id = :parent_id AND student_id = :student_id";
        $stmt = $this->conn->prepare($check);
        $stmt->bindParam(':parent_id', $data->parent_id);
        $stmt->bindParam(':student_id', $data->student_id);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            http_response_code(400);
            echo json_encode(["error" => "Student is already linked to this parent"]);
            return;
        }

        $query = "INSERT INTO parent_students (parent_id, student_id) VALUES (:parent_id, :student_id)";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':parent_id', $data->parent_id);
        $stmt->bindParam(':student_id', $data->student_id);

        if ($stmt->execute()) {
            http_response_code(200);
            echo json_encode(["message" => "Parent and child linked successfully"]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Unable to link parent and child"]);
        }
    }
}
