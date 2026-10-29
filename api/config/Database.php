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
            // Auto-fallback between localhost (UNIX socket) and 127.0.0.1 (TCP/IP port 3306)
            $fallbackHost = ($this->host === 'localhost') ? '127.0.0.1' : (($this->host === '127.0.0.1') ? 'localhost' : null);
            if ($fallbackHost) {
                try {
                    $dsnFallback = "mysql:host={$fallbackHost};port={$this->port};dbname={$this->db_name};charset=utf8mb4";
                    $this->conn = new PDO($dsnFallback, $this->username, $this->password);
                    $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                    $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
                    return $this->conn;
                } catch (PDOException $e2) {
                    // Fallback also failed; proceed to error handling
                }
            }

            // Log the real error server-side
            error_log('DB Connection failed: ' . $exception->getMessage());
            http_response_code(503);
            $showDebug = (Env::get('APP_DEBUG', 'false') === 'true' || Env::get('APP_ENV', 'production') === 'development');
            $errMsg = $showDebug ? ('Database connection failed: ' . $exception->getMessage()) : 'Service temporarily unavailable. Please try again later.';
            echo json_encode(["error" => $errMsg]);
            exit;
        }

        return $this->conn;
    }
}
