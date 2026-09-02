<?php
require_once 'api/config/Database.php';
$db = new Database();
$conn = $db->getConnection();

try {
    $conn->beginTransaction();

    // 1. Create classes table
    $conn->exec("
        CREATE TABLE IF NOT EXISTS classes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            department VARCHAR(100) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");

    // 2. Add class_id to users
    try {
        $conn->exec("ALTER TABLE users ADD COLUMN class_id INT NULL AFTER role");
        $conn->exec("ALTER TABLE users ADD FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL");
    } catch (PDOException $e) {
        // Ignore if column already exists
        if (strpos($e->getMessage(), 'Duplicate column name') === false) {
            throw $e;
        }
    }

    // 3. Create class_subjects table
    $conn->exec("
        CREATE TABLE IF NOT EXISTS class_subjects (
            id INT AUTO_INCREMENT PRIMARY KEY,
            class_id INT NOT NULL,
            course_id INT NOT NULL,
            type ENUM('core', 'elective') DEFAULT 'core',
            elective_group VARCHAR(100) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
            UNIQUE KEY unique_class_course (class_id, course_id)
        )
    ");

    // 4. Create library_books table
    $conn->exec("
        CREATE TABLE IF NOT EXISTS library_books (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            author VARCHAR(255) NULL,
            category VARCHAR(100) NULL,
            cover_image_path VARCHAR(255) NULL,
            file_path VARCHAR(255) NOT NULL,
            uploaded_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
        )
    ");

    // 5. Update grades table (add academic_term and academic_session)
    try {
        $conn->exec("ALTER TABLE grades ADD COLUMN academic_term VARCHAR(50) NULL AFTER graded_by");
        $conn->exec("ALTER TABLE grades ADD COLUMN academic_session VARCHAR(50) NULL AFTER academic_term");
        
        // Populate existing rows with default term/session
        $stmt = $conn->query("SELECT setting_value FROM system_settings WHERE setting_key = 'current_term' LIMIT 1");
        $term = $stmt->fetchColumn() ?: '2nd Term';
        
        $stmt = $conn->query("SELECT setting_value FROM system_settings WHERE setting_key = 'academic_session' LIMIT 1");
        $session = $stmt->fetchColumn() ?: '2026/2027';

        $conn->exec("UPDATE grades SET academic_term = '$term', academic_session = '$session' WHERE academic_term IS NULL");
        
        // Remove old UNIQUE constraint and add new one
        $conn->exec("ALTER TABLE grades DROP INDEX student_id"); // It was usually created automatically by MySQL for foreign keys or UNIQUE
    } catch (PDOException $e) {
        // Continue if columns exist
    }

    try {
        // Specifically drop the UNIQUE constraint if it exists. Sometimes named differently.
        // It's often `student_id_course_id_unique` or similar. We'll drop constraint by name if we can.
        $conn->exec("ALTER TABLE grades DROP INDEX student_id_2");
    } catch (Exception $e) {}

    try {
        // Create the new compound UNIQUE index
        $conn->exec("ALTER TABLE grades ADD UNIQUE KEY grade_record_unique (student_id, course_id, academic_term, academic_session)");
    } catch (PDOException $e) {
        // Ignore if exists
    }

    // Seed some initial classes based on old grade levels for existing students
    $stmt = $conn->query("SELECT id, admission_number FROM users WHERE role = 'student' AND class_id IS NULL");
    $students = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Default seed classes
    $seedClasses = ['JSS 1', 'JSS 2', 'JSS 3', 'SSS 1 Science', 'SSS 1 Art', 'SSS 2 Science', 'SSS 2 Art', 'SSS 3 Science'];
    foreach ($seedClasses as $sc) {
        $stmt = $conn->prepare("INSERT IGNORE INTO classes (name) VALUES (:n)");
        $stmt->execute([':n' => $sc]);
    }

    $conn->commit();
    echo "Migration completed successfully.\n";

} catch (Exception $e) {
    $conn->rollBack();
    echo "Migration failed: " . $e->getMessage() . "\n";
}
