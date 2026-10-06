<?php
require_once __DIR__ . '/Env.php';
Env::load(__DIR__ . '/../.env');

class Database {
    private string $host;
    private string $port;
    private string $db_name;
    private string $username;
    private string $password;
    public $conn;

    public function __construct() {
        $this->host     = Env::get('DB_HOST',     '127.0.0.1');
        $this->port     = Env::get('DB_PORT',     '3306');
        $this->db_name  = Env::get('DB_NAME',     'aroura');
        $this->username = Env::get('DB_USERNAME',  'root');
        $this->password = Env::get('DB_PASSWORD',  '');
    }

    public function getConnection() {
        $this->conn = null;

        try {
            $dsn = "mysql:host={$this->host};port={$this->port};dbname={$this->db_name};charset=utf8mb4";
            $this->conn = new PDO($dsn, $this->username, $this->password);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch (PDOException $exception) {
            // Log the real error server-side; never expose internals to the HTTP response.
            error_log('DB Connection failed: ' . $exception->getMessage());
            http_response_code(503);
            echo json_encode(["error" => "Service temporarily unavailable. Please try again later."]);
            exit;
        }

        return $this->conn;
    }
}
