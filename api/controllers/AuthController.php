<?php
require_once 'config/Database.php';
require_once 'lib/Auth.php';

class AuthController {
    private $conn;

    public function __construct() {
        $db = new Database();
        $this->conn = $db->getConnection();
    }

    public function login() {
        $data = json_decode(file_get_contents("php://input"));
        
        if (!isset($data->email) || !isset($data->password)) {
            http_response_code(400);
            echo json_encode(["error" => "Email and password are required"]);
            return;
        }

        $query = "SELECT id, email, password_hash, role, first_name, last_name, phone, relationship FROM users WHERE email = :email LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':email', $data->email);
        $stmt->execute();

        $user = $stmt->fetch();

        if ($user && password_verify($data->password, $user['password_hash'])) {
            $payload = [
                "id" => $user['id'],
                "email" => $user['email'],
                "role" => $user['role'],
                "first_name" => $user['first_name'],
                "last_name" => $user['last_name'],
                "phone" => $user['phone'],
                "relationship" => $user['relationship']
            ];
            $jwt = Auth::generateJWT($payload);
            
            http_response_code(200);
            echo json_encode([
                "message" => "Login successful",
                "token" => $jwt,
                "user" => $payload
            ]);
        } else {
            http_response_code(401);
            echo json_encode(["error" => "Invalid email or password"]);
        }
    }

    public function registerParent() {
        $data = json_decode(file_get_contents("php://input"));
        
        if (!isset($data->email) || !isset($data->password) || !isset($data->first_name) || !isset($data->last_name)) {
            http_response_code(400);
            echo json_encode(["error" => "Incomplete data"]);
            return;
        }

        // Check if email exists
        $checkQuery = "SELECT id FROM users WHERE email = :email LIMIT 1";
        $checkStmt = $this->conn->prepare($checkQuery);
        $checkStmt->bindParam(':email', $data->email);
        $checkStmt->execute();
        
        if ($checkStmt->rowCount() > 0) {
            http_response_code(400);
            echo json_encode(["error" => "Email already registered"]);
            return;
        }

        $query = "INSERT INTO users (email, password_hash, role, first_name, last_name, phone, relationship) VALUES (:email, :password_hash, 'parent', :first_name, :last_name, :phone, :relationship)";
        $stmt = $this->conn->prepare($query);

        $password_hash = password_hash($data->password, PASSWORD_BCRYPT);
        $phone = isset($data->phone) ? $data->phone : null;
        $relationship = isset($data->relationship) ? $data->relationship : null;

        $stmt->bindParam(':email', $data->email);
        $stmt->bindParam(':password_hash', $password_hash);
        $stmt->bindParam(':first_name', $data->first_name);
        $stmt->bindParam(':last_name', $data->last_name);
        $stmt->bindParam(':phone', $phone);
        $stmt->bindParam(':relationship', $relationship);

        try {
            if ($stmt->execute()) {
                http_response_code(201);
                echo json_encode(["message" => "Parent account created successfully"]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Unable to create account: " . $e->getMessage()]);
        }
    }
}
