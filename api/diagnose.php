<?php
require_once 'config/Database.php';
require_once 'lib/Auth.php';

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    $stmt = $conn->query("SELECT id FROM users WHERE role = 'student'");
    $students = $stmt->fetchAll();
    
    $issues = 0;
    foreach ($students as $s) {
        $id = $s['id'];
        
        $payload = [
            'id' => $id,
            'role' => 'student',
            'exp' => time() + 3600
        ];
        $token = Auth::generateJWT($payload);
        
        $urls = [
            "http://localhost/lms/api/index.php/dashboard/student",
            "http://localhost/lms/api/index.php/student/attendance",
            "http://localhost/lms/api/index.php/student/grades"
        ];
        
        foreach ($urls as $url) {
            $cmd = "curl -s -H 'Authorization: Bearer $token' '$url'";
            $output = [];
            exec($cmd, $output);
            $outStr = trim(implode("\n", $output));
            if ($outStr === "" || $outStr[0] !== '{') {
                echo "Student $id has malformed JSON for $url:\n$outStr\n\n";
                $issues++;
            }
        }
    }
    if ($issues === 0) echo "All students return valid JSON.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
