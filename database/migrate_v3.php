<?php
require_once __DIR__ . '/../api/config/Database.php';

$db = new Database();
$conn = $db->getConnection();

echo "Running Migration V3: Teacher Roles, HOD, Course Departments, and Historical Class Results...\n\n";

try {
    // 1. Add is_hod and hod_department to users table
    $chkHod = $conn->query("SHOW COLUMNS FROM users LIKE 'is_hod'");
    if ($chkHod->rowCount() == 0) {
        $conn->exec("ALTER TABLE users ADD COLUMN is_hod TINYINT(1) DEFAULT 0");
        echo "✓ Added 'is_hod' to users table.\n";
    }

    $chkHodDept = $conn->query("SHOW COLUMNS FROM users LIKE 'hod_department'");
    if ($chkHodDept->rowCount() == 0) {
        $conn->exec("ALTER TABLE users ADD COLUMN hod_department VARCHAR(100) DEFAULT NULL");
        echo "✓ Added 'hod_department' to users table.\n";
    }

    // 2. Add department to courses table
    $chkCourseDept = $conn->query("SHOW COLUMNS FROM courses LIKE 'department'");
    if ($chkCourseDept->rowCount() == 0) {
        $conn->exec("ALTER TABLE courses ADD COLUMN department VARCHAR(100) DEFAULT NULL");
        echo "✓ Added 'department' to courses table.\n";
    }

    // 3. Add class_id to grades table
    $chkGradeClass = $conn->query("SHOW COLUMNS FROM grades LIKE 'class_id'");
    if ($chkGradeClass->rowCount() == 0) {
        $conn->exec("ALTER TABLE grades ADD COLUMN class_id INT DEFAULT NULL");
        $conn->exec("ALTER TABLE grades ADD CONSTRAINT fk_grades_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL");
        echo "✓ Added 'class_id' to grades table.\n";
    }

    // 4. Add class_id to student_assessments table
    $chkAssessmentClass = $conn->query("SHOW COLUMNS FROM student_assessments LIKE 'class_id'");
    if ($chkAssessmentClass->rowCount() == 0) {
        $conn->exec("ALTER TABLE student_assessments ADD COLUMN class_id INT DEFAULT NULL");
        $conn->exec("ALTER TABLE student_assessments ADD CONSTRAINT fk_sa_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL");
        echo "✓ Added 'class_id' to student_assessments table.\n";
    }

    // 5. Create student_class_history table
    $conn->exec("
        CREATE TABLE IF NOT EXISTS student_class_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            class_id INT NOT NULL,
            academic_session VARCHAR(50) NOT NULL,
            academic_term VARCHAR(50) NOT NULL,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_stu_term_session (student_id, academic_session, academic_term),
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
    ");
    echo "✓ Ensured 'student_class_history' table exists.\n";

    // 6. Backfill class_id into grades and student_assessments where null
    $backfillGrades = $conn->exec("
        UPDATE grades g
        JOIN users u ON g.student_id = u.id
        SET g.class_id = u.class_id
        WHERE g.class_id IS NULL AND u.class_id IS NOT NULL
    ");
    echo "✓ Backfilled class_id for $backfillGrades grade records.\n";

    $backfillAssessments = $conn->exec("
        UPDATE student_assessments sa
        JOIN users u ON sa.student_id = u.id
        SET sa.class_id = u.class_id
        WHERE sa.class_id IS NULL AND u.class_id IS NOT NULL
    ");
    echo "✓ Backfilled class_id for $backfillAssessments student assessment records.\n";

    // 7. Seed student_class_history for current users
    $seedHistory = $conn->exec("
        INSERT IGNORE INTO student_class_history (student_id, class_id, academic_session, academic_term)
        SELECT u.id, u.class_id, '2023/2024', '3rd Term'
        FROM users u
        WHERE u.role = 'student' AND u.class_id IS NOT NULL
    ");
    echo "✓ Seeded $seedHistory historical student-class mappings for 2023/2024 3rd Term.\n";

    // 8. Auto-assign departments to existing courses if null
    $deptRules = [
        'Mathematics' => ['Mathematics', 'Further Mathematics'],
        'Sciences' => ['Physics', 'Chemistry', 'Biology', 'Agricultural Science', 'Animal Husbandry', 'Computer Studies', 'Data Processing', 'AI/Robotics'],
        'Languages' => ['English Language', 'French Language', 'Literature in English', 'Yoruba', 'Igbo', 'Hausa'],
        'Arts & Social Sciences' => ['Civic Education', 'Economics', 'Geography', 'Government', 'Christian Religious Studies', 'Islamic Studies', 'Visual Arts', 'History'],
        'Vocational & Commercial' => ['Technical Drawing', 'Catering Craft', 'Catering Craft Practice', 'Food & Nutrition', 'Commerce', 'Financial Accounting', 'Music', 'Physical & Health Education', 'LET']
    ];

    $updateDeptStmt = $conn->prepare("UPDATE courses SET department = :dept WHERE name = :name AND (department IS NULL OR department = '')");
    foreach ($deptRules as $dept => $courseNames) {
        foreach ($courseNames as $cname) {
            $updateDeptStmt->execute([':dept' => $dept, ':name' => $cname]);
        }
    }
    echo "✓ Auto-assigned departments to core school courses.\n";

    echo "\nMigration V3 completed successfully!\n";

} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
