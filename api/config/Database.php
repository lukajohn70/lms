<?php

class Database {
    private $host = "127.0.0.1";
    private $port = "3306";
    private $db_name = "aroura";
    private $username = "root";
    private $password = "root"; // Default MAMP password
    public $conn;

    public function getConnection() {
        $this->conn = null;

        try {
            $this->conn = new PDO("mysql:host=" . $this->host . ";port=" . $this->port . ";dbname=" . $this->db_name, $this->username, $this->password);
            $this->conn->exec("set names utf8");
            // Set error mode to exception
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch(PDOException $exception) {
            echo json_encode(["error" => "Database Connection error: " . $exception->getMessage()]);
            exit;
        }

        return $this->conn;
    }
}
