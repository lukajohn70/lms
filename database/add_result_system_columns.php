<?php
require_once __DIR__ . '/../api/config/Database.php';

$db = new Database();
$conn = $db->getConnection();

echo "Running migrations for system settings and result system...\n";

// 1. Alter grades table to add mid_term columns if they do not exist
$columnsToAdd = [
    "assignment_score DECIMAL(5, 2) DEFAULT NULL",
    "project_score DECIMAL(5, 2) DEFAULT NULL",
    "mid_term_test DECIMAL(5, 2) DEFAULT NULL"
];

foreach ($columnsToAdd as $colDef) {
    // Extract column name
    $parts = explode(' ', trim($colDef));
    $colName = $parts[0];
    
    try {
        $conn->exec("ALTER TABLE grades ADD COLUMN $colDef");
        echo "Successfully added column: $colName\n";
    } catch (PDOException $e) {
        // Ignore column already exists errors
        if ($e->getCode() === '42S21' || strpos($e->getMessage(), 'Duplicate column name') !== false) {
            echo "Column $colName already exists, skipped.\n";
        } else {
            echo "Error adding column $colName: " . $e->getMessage() . "\n";
        }
    }
}

// 2. Create system_settings table
$createSettingsTable = "
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(255) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
";

try {
    $conn->exec($createSettingsTable);
    echo "Created table: system_settings\n";
} catch (PDOException $e) {
    echo "Error creating system_settings table: " . $e->getMessage() . "\n";
}

// 3. Create student_assessments table
$createAssessmentsTable = "
CREATE TABLE IF NOT EXISTS student_assessments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    academic_term VARCHAR(10) NOT NULL,
    academic_session VARCHAR(20) NOT NULL,
    punctuality TINYINT DEFAULT NULL,
    neatness TINYINT DEFAULT NULL,
    politeness TINYINT DEFAULT NULL,
    honesty TINYINT DEFAULT NULL,
    team_spirit TINYINT DEFAULT NULL,
    leadership TINYINT DEFAULT NULL,
    helping_others TINYINT DEFAULT NULL,
    emotional_stability TINYINT DEFAULT NULL,
    health TINYINT DEFAULT NULL,
    attitude_to_work TINYINT DEFAULT NULL,
    attentiveness TINYINT DEFAULT NULL,
    perseverance TINYINT DEFAULT NULL,
    spoken_english TINYINT DEFAULT NULL,
    handwriting TINYINT DEFAULT NULL,
    verbal_fluency TINYINT DEFAULT NULL,
    sports TINYINT DEFAULT NULL,
    handling_tools TINYINT DEFAULT NULL,
    musical TINYINT DEFAULT NULL,
    drawing_painting TINYINT DEFAULT NULL,
    class_teacher_comment TEXT DEFAULT NULL,
    principal_remark TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_student_term_session (student_id, academic_term, academic_session)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
";

try {
    $conn->exec($createAssessmentsTable);
    echo "Created table: student_assessments\n";
} catch (PDOException $e) {
    echo "Error creating student_assessments table: " . $e->getMessage() . "\n";
}

echo "Migrations completed.\n";
