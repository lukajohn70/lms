<?php
require_once 'config/Database.php';
require_once 'lib/Auth.php';

class FeeController {
    private $conn;

    public function __construct() {
        $db = new Database();
        $this->conn = $db->getConnection();
    }

    // Admin: List all student fees with pagination, filtering, and search
    public function getAdminFees() {
        Auth::requireRole(['admin']);
        
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $status = isset($_GET['status']) ? $_GET['status'] : 'all';
        
        $query = "
            SELECT 
                f.id,
                CONCAT(u.first_name, ' ', u.last_name) as student,
                COALESCE((
                    SELECT grade_level 
                    FROM student_registrations 
                    WHERE parent_id = (SELECT parent_id FROM parent_students WHERE student_id = u.id LIMIT 1) 
                    LIMIT 1
                ), 'SS2A') as class,
                '2nd' as term,
                f.description,
                f.amount as total,
                COALESCE((SELECT SUM(amount_paid) FROM fee_payments WHERE fee_id = f.id), 0) as paid
            FROM fees f
            JOIN users u ON f.student_id = u.id
            WHERE u.role = 'student'
        ";
        
        $params = [];
        if (!empty($search)) {
            $query .= " AND (u.first_name LIKE :search OR u.last_name LIKE :search)";
            $params[':search'] = '%' . $search . '%';
        }
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute($params);
        $records = $stmt->fetchAll();
        
        // Filter by UI status (pending, partial, paid) since status in DB is just ENUM(pending, paid, overdue)
        $formatted = [];
        foreach ($records as $r) {
            $total = floatval($r['total']);
            $paid = floatval($r['paid']);
            
            $uiStatus = 'pending';
            if ($paid >= $total) {
                $uiStatus = 'paid';
            } else if ($paid > 0) {
                $uiStatus = 'partial';
            }
            
            if ($status === 'all' || $status === $uiStatus) {
                $formatted[] = [
                    "id" => intval($r['id']),
                    "student" => $r['student'],
                    "class" => $r['class'],
                    "term" => $r['term'],
                    "description" => $r['description'],
                    "total" => $total,
                    "paid" => $paid,
                    "status" => $uiStatus
                ];
            }
        }
        
        echo json_encode($formatted);
    }

    // Admin: Create a new fee invoice for a student
    public function createFee() {
        Auth::requireRole(['admin']);
        $data = json_decode(file_get_contents("php://input"));
        
        if (!isset($data->student_id) || !isset($data->amount) || !isset($data->description) || !isset($data->due_date)) {
            http_response_code(400);
            echo json_encode(["error" => "Incomplete data"]);
            return;
        }
        
        $query = "INSERT INTO fees (student_id, amount, description, due_date, status) VALUES (:s, :a, :d, :du, 'pending')";
        $stmt = $this->conn->prepare($query);
        
        if ($stmt->execute([
            ':s' => intval($data->student_id),
            ':a' => floatval($data->amount),
            ':d' => $data->description,
            ':du' => $data->due_date
        ])) {
            echo json_encode(["message" => "Fee invoice created successfully"]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Unable to create fee"]);
        }
    }

    // Admin/Parent/Student: Record a payment
    public function recordPayment() {
        Auth::requireRole(['admin']);
        $data = json_decode(file_get_contents("php://input"));
        $this->processPaymentRecord($data, 'Manual Entry');
    }

    public function payFee() {
        $user = Auth::requireRole(['parent', 'student']);
        $data = json_decode(file_get_contents("php://input"));
        $this->processPaymentRecord($data, 'Card Payment');
    }

    private function processPaymentRecord($data, $method) {
        if (!isset($data->fee_id) || !isset($data->amount)) {
            http_response_code(400);
            echo json_encode(["error" => "Incomplete data"]);
            return;
        }
        
        $feeId = intval($data->fee_id);
        $amountPaid = floatval($data->amount);
        
        try {
            $this->conn->beginTransaction();
            
            // 1. Verify fee invoice exists
            $stmt = $this->conn->prepare("SELECT amount, status FROM fees WHERE id = :id FOR UPDATE");
            $stmt->execute([':id' => $feeId]);
            $fee = $stmt->fetch();
            
            if (!$fee) {
                throw new Exception("Fee record not found");
            }
            
            // 2. Sum current payments
            $sumStmt = $this->conn->prepare("SELECT SUM(amount_paid) FROM fee_payments WHERE fee_id = :fid");
            $sumStmt->execute([':fid' => $feeId]);
            $currentPaid = floatval($sumStmt->fetchColumn());
            
            $newPaid = $currentPaid + $amountPaid;
            $totalAmount = floatval($fee['amount']);
            
            // 3. Record payment transaction
            $payQuery = "INSERT INTO fee_payments (fee_id, amount_paid, payment_method) VALUES (:fid, :ap, :pm)";
            $payStmt = $this->conn->prepare($payQuery);
            $payStmt->execute([
                ':fid' => $feeId,
                ':ap' => $amountPaid,
                ':pm' => $method
            ]);
            
            // 4. Update parent invoice status
            $dbStatus = ($newPaid >= $totalAmount) ? 'paid' : 'pending';
            $updateStmt = $this->conn->prepare("UPDATE fees SET status = :st WHERE id = :id");
            $updateStmt->execute([
                ':st' => $dbStatus,
                ':id' => $feeId
            ]);
            
            $this->conn->commit();
            echo json_encode(["message" => "Payment transaction recorded successfully"]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(["error" => "Transaction failed: " . $e->getMessage()]);
        }
    }

    // Parent: Get fee information and payment history for a student
    public function getParentFees() {
        $parent = Auth::requireRole(['parent']);
        
        $studentId = isset($_GET['student_id']) ? intval($_GET['student_id']) : null;
        if (!$studentId) {
            $stmt = $this->conn->prepare("SELECT student_id FROM parent_students WHERE parent_id = :pid LIMIT 1");
            $stmt->execute([':pid' => $parent['id']]);
            $studentId = $stmt->fetchColumn();
        }
        
        if (!$studentId) {
            http_response_code(404);
            echo json_encode(["error" => "No student linked to this parent"]);
            return;
        }
        
        $this->respondStudentFees($studentId);
    }

    // Student: Get fee information and payment history
    public function getStudentFees() {
        $student = Auth::requireRole(['student']);
        $this->respondStudentFees($student['id']);
    }

    private function respondStudentFees($studentId) {
        // 1. Get all fees
        $feesQuery = "
            SELECT 
                f.id, 
                f.description as `desc`, 
                f.amount, 
                f.due_date as due,
                COALESCE((SELECT SUM(amount_paid) FROM fee_payments WHERE fee_id = f.id), 0) as paid
            FROM fees f
            WHERE f.student_id = :sid
            ORDER BY f.due_date ASC
        ";
        
        $stmt = $this->conn->prepare($feesQuery);
        $stmt->execute([':sid' => $studentId]);
        $fees = $stmt->fetchAll();
        
        $formattedFees = [];
        foreach ($fees as $f) {
            $amount = floatval($f['amount']);
            $paid = floatval($f['paid']);
            
            $uiStatus = 'pending';
            if ($paid >= $amount) {
                $uiStatus = 'paid';
            } else if ($paid > 0) {
                $uiStatus = 'partial';
            }
            
            $formattedFees[] = [
                "id" => intval($f['id']),
                "desc" => $f['desc'],
                "amount" => $amount,
                "paid" => $paid,
                "due" => date('M d, Y', strtotime($f['due'])),
                "status" => $uiStatus
            ];
        }
        
        // 2. Get payment history list
        $historyQuery = "
            SELECT 
                fp.payment_date as date,
                f.description as `desc`,
                fp.amount_paid as amount,
                CONCAT('AA-', YEAR(fp.payment_date), '-', LPAD(fp.id, 5, '0')) as ref,
                fp.payment_method as method
            FROM fee_payments fp
            JOIN fees f ON fp.fee_id = f.id
            WHERE f.student_id = :sid
            ORDER BY fp.payment_date DESC
        ";
        
        $stmtHist = $this->conn->prepare($historyQuery);
        $stmtHist->execute([':sid' => $studentId]);
        $history = $stmtHist->fetchAll();
        
        $formattedHistory = [];
        foreach ($history as $h) {
            $formattedHistory[] = [
                "date" => date('M d, Y', strtotime($h['date'])),
                "desc" => $h['desc'],
                "amount" => floatval($h['amount']),
                "ref" => $h['ref'],
                "method" => $h['method']
            ];
        }
        
        echo json_encode([
            "fee_items" => $formattedFees,
            "payment_history" => $formattedHistory
        ]);
    }
}
