<?php
require_once 'config/Database.php';
require_once 'lib/Auth.php';

class AdmissionController {
    private $conn;

    public function __construct() {
        $db = new Database();
        $this->conn = $db->getConnection();

        // Self-healing database check: ensure passport_path column exists
        try {
            $chk = $this->conn->query("SHOW COLUMNS FROM admissions LIKE 'passport_path'");
            if ($chk->rowCount() == 0) {
                $this->conn->exec("ALTER TABLE admissions ADD COLUMN passport_path VARCHAR(255) NULL");
            }
        } catch (Exception $e) {
            // Ignore/silent fail
        }
    }

    // Public: Apply for admission
    public function apply() {
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->parent_id) ||
            !isset($data->parent_first_name) || !isset($data->parent_last_name) || 
            !isset($data->parent_email) || !isset($data->parent_phone) || 
            !isset($data->parent_address) || !isset($data->parent_relationship) ||
            !isset($data->child_first_name) || !isset($data->child_last_name) || 
            !isset($data->child_dob) || !isset($data->child_gender) || 
            !isset($data->grade_level) || !isset($data->payment_reference)) {
            http_response_code(400);
            echo json_encode(["error" => "Incomplete data"]);
            return;
        }

        // Generate application number: APP-YYYY-RAND
        $year = date('Y');
        $random = rand(1000, 9999);
        $appNumber = "APP-" . $year . "-" . $random;

        // Auto schedule entrance exam
        // Let's schedule it for next Saturday from today at 9:00 AM
        $nextSaturday = date('Y-m-d H:i:s', strtotime('next Saturday 09:00:00'));
        $venue = "Aroura Academy Main Auditorium";
        $seatNumber = "SEAT-" . rand(100, 999);

        // Handle Base64 Passport Photograph Upload
        $passportPath = null;
        if (isset($data->passport_image) && !empty($data->passport_image)) {
            $imgData = $data->passport_image;
            if (preg_match('/^data:image\/(\w+);base64,/', $imgData, $type)) {
                $imgData = substr($imgData, strpos($imgData, ',') + 1);
                $type = strtolower($type[1]); // jpg, png, jpeg, gif
                if (in_array($type, ['jpg', 'jpeg', 'png', 'gif'])) {
                    $imgData = base64_decode($imgData);
                    if ($imgData !== false) {
                        $targetDir = __DIR__ . "/../uploads/passports/";
                        if (!is_dir($targetDir)) {
                            mkdir($targetDir, 0777, true);
                        }
                        $fileName = time() . "_" . uniqid() . "." . $type;
                        if (file_put_contents($targetDir . $fileName, $imgData)) {
                            $passportPath = "uploads/passports/" . $fileName;
                        }
                    }
                }
            }
        }

        $query = "INSERT INTO admissions (
            application_number, parent_first_name, parent_last_name, parent_email, parent_phone, 
            parent_address, parent_occupation, parent_relationship, child_first_name, child_last_name, 
            child_dob, child_gender, grade_level, previous_school, previous_grade, 
            payment_status, payment_reference, status, exam_type, exam_date, exam_venue, exam_seat_number, parent_id, passport_path
        ) VALUES (
            :application_number, :parent_first_name, :parent_last_name, :parent_email, :parent_phone, 
            :parent_address, :parent_occupation, :parent_relationship, :child_first_name, :child_last_name, 
            :child_dob, :child_gender, :grade_level, :previous_school, :previous_grade, 
            'paid', :payment_reference, 'exam_scheduled', 'entrance', :exam_date, :exam_venue, :exam_seat_number, :parent_id, :passport_path
        )";

        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(':application_number', $appNumber);
        $stmt->bindParam(':parent_first_name', $data->parent_first_name);
        $stmt->bindParam(':parent_last_name', $data->parent_last_name);
        $stmt->bindParam(':parent_email', $data->parent_email);
        $stmt->bindParam(':parent_phone', $data->parent_phone);
        $stmt->bindParam(':parent_address', $data->parent_address);
        $stmt->bindParam(':parent_occupation', $data->parent_occupation);
        $stmt->bindParam(':parent_relationship', $data->parent_relationship);
        $stmt->bindParam(':child_first_name', $data->child_first_name);
        $stmt->bindParam(':child_last_name', $data->child_last_name);
        $stmt->bindParam(':child_dob', $data->child_dob);
        $stmt->bindParam(':child_gender', $data->child_gender);
        $stmt->bindParam(':grade_level', $data->grade_level);
        $stmt->bindParam(':previous_school', $data->previous_school);
        $stmt->bindParam(':previous_grade', $data->previous_grade);
        $stmt->bindParam(':payment_reference', $data->payment_reference);
        $stmt->bindParam(':exam_date', $nextSaturday);
        $stmt->bindParam(':exam_venue', $venue);
        $stmt->bindParam(':exam_seat_number', $seatNumber);
        $stmt->bindParam(':parent_id', $data->parent_id);
        $stmt->bindParam(':passport_path', $passportPath);

        try {
            if ($stmt->execute()) {
                http_response_code(201);
                echo json_encode([
                    "message" => "Application submitted successfully",
                    "application_number" => $appNumber,
                    "exam_date" => $nextSaturday,
                    "exam_venue" => $venue,
                    "exam_seat_number" => $seatNumber,
                    "passport_path" => $passportPath
                ]);
            } else {
                http_response_code(500);
                echo json_encode(["error" => "Unable to submit application"]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Database error: " . $e->getMessage()]);
        }
    }

    // Public: Check status
    public function getStatus() {
        if (!isset($_GET['number'])) {
            http_response_code(400);
            echo json_encode(["error" => "Application number is required"]);
            return;
        }

        $appNumber = $_GET['number'];
        $query = "SELECT * FROM admissions WHERE application_number = :application_number LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':application_number', $appNumber);
        $stmt->execute();

        $application = $stmt->fetch();

        if ($application) {
            http_response_code(200);
            echo json_encode(["application" => $application]);
        } else {
            http_response_code(404);
            echo json_encode(["error" => "Application not found"]);
        }
    }

    // Public: Parent accepts admission and creates account
    public function createAccount() {
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->application_number) || !isset($data->password)) {
            http_response_code(400);
            echo json_encode(["error" => "Application number and password are required"]);
            return;
        }

        try {
            $this->conn->beginTransaction();

            // 1. Get the application details
            $query = "SELECT * FROM admissions WHERE application_number = :application_number AND status = 'admitted' LIMIT 1";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':application_number', $data->application_number);
            $stmt->execute();
            $application = $stmt->fetch();

            if (!$application) {
                throw new Exception("Application not found or not admitted");
            }

            if (!$application['admission_number']) {
                throw new Exception("Admission number has not been generated yet");
            }

            // 2. Check if parent account exists, otherwise create it
            $parentEmail = $application['parent_email'];
            $checkParent = "SELECT id FROM users WHERE email = :email LIMIT 1";
            $parentStmt = $this->conn->prepare($checkParent);
            $parentStmt->bindParam(':email', $parentEmail);
            $parentStmt->execute();
            $parent = $parentStmt->fetch();

            if ($parent) {
                $parentId = $parent['id'];
            } else {
                // Create parent user
                $parentPasswordHash = password_hash($data->password, PASSWORD_BCRYPT);
                $createParent = "INSERT INTO users (email, password_hash, role, first_name, last_name) VALUES (:email, :password_hash, 'parent', :first_name, :last_name)";
                $createParentStmt = $this->conn->prepare($createParent);
                $createParentStmt->bindParam(':email', $parentEmail);
                $createParentStmt->bindParam(':password_hash', $parentPasswordHash);
                $createParentStmt->bindParam(':first_name', $application['parent_first_name']);
                $createParentStmt->bindParam(':last_name', $application['parent_last_name']);
                $createParentStmt->execute();
                $parentId = $this->conn->lastInsertId();
            }

            // 3. Create student user account
            $studentEmail = strtolower($application['child_first_name'] . '.' . $application['child_last_name'] . $application['id'] . '@aroura.com');
            $studentEmail = str_replace(' ', '', $studentEmail);
            $studentPasswordHash = password_hash($data->password, PASSWORD_BCRYPT);

            $createStudent = "INSERT INTO users (email, password_hash, role, first_name, last_name, admission_number) VALUES (:email, :password_hash, 'student', :first_name, :last_name, :admission_number)";
            $createStudentStmt = $this->conn->prepare($createStudent);
            $createStudentStmt->bindParam(':email', $studentEmail);
            $createStudentStmt->bindParam(':password_hash', $studentPasswordHash);
            $createStudentStmt->bindParam(':first_name', $application['child_first_name']);
            $createStudentStmt->bindParam(':last_name', $application['child_last_name']);
            $createStudentStmt->bindParam(':admission_number', $application['admission_number']);
            $createStudentStmt->execute();
            $studentId = $this->conn->lastInsertId();

            // 4. Link parent and student
            $linkQuery = "INSERT INTO parent_students (parent_id, student_id) VALUES (:parent_id, :student_id)";
            $linkStmt = $this->conn->prepare($linkQuery);
            $linkStmt->bindParam(':parent_id', $parentId);
            $linkStmt->bindParam(':student_id', $studentId);
            $linkStmt->execute();

            // 5. Generate Tuition and Materials fee invoices for the new student
            // Detect school level from application to pick the right fee tier
            $gradeApplied = strtolower($application['grade_applied'] ?? $application['grade_level'] ?? '');
            if (strpos($gradeApplied, 'nur') !== false) {
                $tuitionKey = 'fee_tuition_nursery';
                $materialsKey = 'fee_materials_nursery';
                $defaultTuition = 75000.00;
                $defaultMaterials = 18000.00;
            } elseif (strpos($gradeApplied, 'pri') !== false || preg_match('/p[1-6]/i', $gradeApplied)) {
                $tuitionKey = 'fee_tuition_primary';
                $materialsKey = 'fee_materials_primary';
                $defaultTuition = 95000.00;
                $defaultMaterials = 22000.00;
            } else {
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
            
            // Note: fees table has NO 'paid' column — payments are tracked in fee_payments table
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

            
            $this->conn->commit();

            http_response_code(200);
            echo json_encode([
                "message" => "Portal accounts created successfully!",
                "student_email" => $studentEmail,
                "parent_email" => $parentEmail
            ]);

        } catch (Exception $e) {
            $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(["error" => "Transaction failed: " . $e->getMessage()]);
        }
    }

    // Admin: List all applications
    public function index() {
        Auth::requireRole(['admin']);

        $query = "SELECT * FROM admissions ORDER BY created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $applications = $stmt->fetchAll();

        http_response_code(200);
        echo json_encode(["applications" => $applications]);
    }

    // Admin: Update exam schedule/scores
    public function update() {
        Auth::requireRole(['admin']);
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->id)) {
            http_response_code(400);
            echo json_encode(["error" => "Application ID is required"]);
            return;
        }

        // Build dynamic query
        $fields = [];
        $params = [':id' => $data->id];

        if (isset($data->exam_type)) {
            $fields[] = "exam_type = :exam_type";
            $params[':exam_type'] = $data->exam_type;
        }
        if (isset($data->exam_date)) {
            $fields[] = "exam_date = :exam_date";
            $params[':exam_date'] = $data->exam_date;
        }
        if (isset($data->exam_venue)) {
            $fields[] = "exam_venue = :exam_venue";
            $params[':exam_venue'] = $data->exam_venue;
        }
        if (isset($data->exam_seat_number)) {
            $fields[] = "exam_seat_number = :exam_seat_number";
            $params[':exam_seat_number'] = $data->exam_seat_number;
        }
        if (isset($data->score_english)) {
            $fields[] = "score_english = :score_english";
            $params[':score_english'] = $data->score_english;
        }
        if (isset($data->score_math)) {
            $fields[] = "score_math = :score_math";
            $params[':score_math'] = $data->score_math;
        }
        if (isset($data->score_general)) {
            $fields[] = "score_general = :score_general";
            $params[':score_general'] = $data->score_general;
        }
        if (isset($data->status)) {
            $fields[] = "status = :status";
            $params[':status'] = $data->status;
        }

        if (empty($fields)) {
            http_response_code(400);
            echo json_encode(["error" => "No fields to update"]);
            return;
        }

        $query = "UPDATE admissions SET " . implode(", ", $fields) . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);

        try {
            if ($stmt->execute($params)) {
                http_response_code(200);
                echo json_encode(["message" => "Application updated successfully"]);
            } else {
                http_response_code(500);
                echo json_encode(["error" => "Unable to update application"]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Database error: " . $e->getMessage()]);
        }
    }

    // Admin: Approve Admission
    public function approve() {
        Auth::requireRole(['admin']);
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->id)) {
            http_response_code(400);
            echo json_encode(["error" => "Application ID is required"]);
            return;
        }

        // Autogenerate admission number reflecting school name
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
        $admNumber = $prefix . "/" . $year . "/" . str_pad($data->id, 4, '0', STR_PAD_LEFT);

        $query = "UPDATE admissions SET status = 'admitted', admission_number = :admission_number WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':admission_number', $admNumber);
        $stmt->bindParam(':id', $data->id);

        try {
            if ($stmt->execute()) {
                http_response_code(200);
                echo json_encode([
                    "message" => "Admission approved",
                    "admission_number" => $admNumber
                ]);
            } else {
                http_response_code(500);
                echo json_encode(["error" => "Unable to approve admission"]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Database error: " . $e->getMessage()]);
        }
    }

    // Admin: Reject Admission
    public function reject() {
        Auth::requireRole(['admin']);
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->id)) {
            http_response_code(400);
            echo json_encode(["error" => "Application ID is required"]);
            return;
        }

        $query = "UPDATE admissions SET status = 'rejected' WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $data->id);

        try {
            if ($stmt->execute()) {
                http_response_code(200);
                echo json_encode(["message" => "Admission rejected"]);
            } else {
                http_response_code(500);
                echo json_encode(["error" => "Unable to reject admission"]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Database error: " . $e->getMessage()]);
        }
    }

    // Parent: Get their submitted admissions applications
    public function getParentAdmissions() {
        $parent = Auth::requireRole(['parent']);

        $query = "SELECT * FROM admissions WHERE parent_id = :parent_id ORDER BY created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':parent_id', $parent['id']);
        
        try {
            $stmt->execute();
            $applications = $stmt->fetchAll(PDO::FETCH_ASSOC);
            http_response_code(200);
            echo json_encode(["applications" => $applications]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Database error: " . $e->getMessage()]);
        }
    }
}
