<?php
require_once 'config/Database.php';
require_once 'lib/Auth.php';

class MessageController {
    private $conn;

    public function __construct() {
        $db = new Database();
        $this->conn = $db->getConnection();
    }

    public function getMessages() {
        $user = Auth::authenticate();
        $userId = $user['id'];

        // Get unique conversations
        $stmt = $this->conn->prepare("
            SELECT DISTINCT
                CASE WHEN sender_id = :u THEN receiver_id ELSE sender_id END as other_user_id
            FROM messages
            WHERE sender_id = :u OR receiver_id = :u
        ");
        $stmt->execute([':u' => $userId]);
        $others = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $threads = [];
        $messagesMap = [];

        if (!empty($others)) {
            // Get user details for these other users
            $placeholders = implode(',', array_fill(0, count($others), '?'));
            $userStmt = $this->conn->prepare("SELECT id, first_name, last_name, role FROM users WHERE id IN ($placeholders)");
            $userStmt->execute($others);
            $userDetails = [];
            foreach ($userStmt->fetchAll() as $u) {
                $userDetails[$u['id']] = $u;
            }

            // Get all messages for this user
            $msgStmt = $this->conn->prepare("
                SELECT id, sender_id, receiver_id, subject, body, is_read, DATE_FORMAT(created_at, '%b %d, %H:%i') as time
                FROM messages
                WHERE sender_id = :u OR receiver_id = :u
                ORDER BY created_at ASC
            ");
            $msgStmt->execute([':u' => $userId]);
            $allMessages = $msgStmt->fetchAll();

            foreach ($allMessages as $m) {
                $otherId = ($m['sender_id'] == $userId) ? $m['receiver_id'] : $m['sender_id'];
                
                if (!isset($messagesMap[$otherId])) {
                    $messagesMap[$otherId] = [];
                }

                $messagesMap[$otherId][] = [
                    "id" => $m['id'],
                    "from" => ($m['sender_id'] == $userId) ? "Me" : ($userDetails[$otherId]['first_name'] . " " . $userDetails[$otherId]['last_name']),
                    "text" => $m['body'],
                    "time" => $m['time'],
                    "self" => ($m['sender_id'] == $userId)
                ];

                // Update thread last message
                if (!isset($threads[$otherId])) {
                    $colors = ["#219EBC", "#8ECAE6", "#FFB703", "#FB8500"];
                    $name = isset($userDetails[$otherId]) ? ($userDetails[$otherId]['first_name'] . " " . $userDetails[$otherId]['last_name']) : "Unknown";
                    
                    $threads[$otherId] = [
                        "id" => $otherId,
                        "name" => $name,
                        "subject" => isset($userDetails[$otherId]) ? ucfirst($userDetails[$otherId]['role']) : "",
                        "avatar" => strtoupper(substr(isset($userDetails[$otherId]) ? $userDetails[$otherId]['first_name'] : "U", 0, 1) . substr(isset($userDetails[$otherId]) ? $userDetails[$otherId]['last_name'] : "N", 0, 1)),
                        "color" => $colors[$otherId % count($colors)],
                        "last" => $m['body'],
                        "time" => $m['time'],
                        "unread" => 0
                    ];
                } else {
                    $threads[$otherId]['last'] = $m['body'];
                    $threads[$otherId]['time'] = $m['time'];
                }

                if ($m['receiver_id'] == $userId && !$m['is_read']) {
                    $threads[$otherId]['unread']++;
                }
            }
        }

        echo json_encode([
            "threads" => array_values($threads),
            "messages" => $messagesMap
        ]);
    }

    public function sendMessage() {
        $user = Auth::authenticate();
        $data = json_decode(file_get_contents("php://input"));

        if (empty($data->receiver_id) || empty($data->body)) {
            http_response_code(400);
            echo json_encode(["error" => "Receiver and body required"]);
            return;
        }

        try {
            $stmt = $this->conn->prepare("INSERT INTO messages (sender_id, receiver_id, subject, body, is_read) VALUES (:s, :r, :sub, :b, 0)");
            $stmt->execute([
                ':s' => $user['id'],
                ':r' => intval($data->receiver_id),
                ':sub' => isset($data->subject) ? trim($data->subject) : "No Subject",
                ':b' => trim($data->body)
            ]);

            echo json_encode(["success" => true]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to send message: " . $e->getMessage()]);
        }
    }

    public function getTeachers() {
        Auth::requireRole(['student', 'parent']);
        $stmt = $this->conn->query("SELECT id, CONCAT(first_name, ' ', last_name) as name FROM users WHERE role = 'teacher' ORDER BY first_name ASC");
        echo json_encode(["teachers" => $stmt->fetchAll()]);
    }
}
