<?php
/**
 * LMS Consolidated Migration Script
 * Run this from the command line: php database/migrate.php
 * Or via browser: http://localhost/lms/database/migrate.php
 *
 * Safe to run multiple times — uses IF NOT EXISTS and IGNORE DUPLICATE errors.
 */
require_once __DIR__ . '/../api/config/Database.php';

$db = new Database();
$conn = $db->getConnection();

echo "=== LMS Migration Runner ===\n\n";

$migrations = [
    // ─── Base course/enrollment columns ───────────────────────────────────
    "ALTER TABLE courses ADD COLUMN topics TEXT DEFAULT NULL",
    "ALTER TABLE enrollments ADD COLUMN progress INT DEFAULT 0",

    // ─── Basic grade columns ───────────────────────────────────────────────
    "ALTER TABLE grades ADD COLUMN ca1 DECIMAL(5,2) DEFAULT 0",
    "ALTER TABLE grades ADD COLUMN ca2 DECIMAL(5,2) DEFAULT 0",
    "ALTER TABLE grades ADD COLUMN exam DECIMAL(5,2) DEFAULT 0",

    // ─── Mid-term grade components ─────────────────────────────────────────
    "ALTER TABLE grades ADD COLUMN assignment_score DECIMAL(5,2) DEFAULT NULL",
    "ALTER TABLE grades ADD COLUMN project_score    DECIMAL(5,2) DEFAULT NULL",
    "ALTER TABLE grades ADD COLUMN mid_term_test    DECIMAL(5,2) DEFAULT NULL",
    "ALTER TABLE grades ADD COLUMN remarks          VARCHAR(20)  DEFAULT NULL",

    // ─── System settings table ─────────────────────────────────────────────
    "CREATE TABLE IF NOT EXISTS system_settings (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        setting_key   VARCHAR(100) NOT NULL UNIQUE,
        setting_value TEXT,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB",

    // ─── Student assessments (affective + psychomotor) ─────────────────────
    "CREATE TABLE IF NOT EXISTS student_assessments (
        id                  INT AUTO_INCREMENT PRIMARY KEY,
        student_id          INT NOT NULL,
        academic_term       VARCHAR(50) NOT NULL,
        academic_session    VARCHAR(20) NOT NULL,

        -- Affective Domain (1–5 scale)
        punctuality         TINYINT(1) DEFAULT NULL,
        neatness            TINYINT(1) DEFAULT NULL,
        politeness          TINYINT(1) DEFAULT NULL,
        honesty             TINYINT(1) DEFAULT NULL,
        team_spirit         TINYINT(1) DEFAULT NULL,
        leadership          TINYINT(1) DEFAULT NULL,
        helping_others      TINYINT(1) DEFAULT NULL,
        emotional_stability TINYINT(1) DEFAULT NULL,
        health              TINYINT(1) DEFAULT NULL,
        attitude_to_work    TINYINT(1) DEFAULT NULL,
        attentiveness       TINYINT(1) DEFAULT NULL,
        perseverance        TINYINT(1) DEFAULT NULL,
        spoken_english      TINYINT(1) DEFAULT NULL,

        -- Psychomotor Domain (1–5 scale)
        handwriting         TINYINT(1) DEFAULT NULL,
        verbal_fluency      TINYINT(1) DEFAULT NULL,
        sports              TINYINT(1) DEFAULT NULL,
        handling_tools      TINYINT(1) DEFAULT NULL,
        musical             TINYINT(1) DEFAULT NULL,
        drawing_painting    TINYINT(1) DEFAULT NULL,

        -- Comments
        class_teacher_comment TEXT DEFAULT NULL,
        principal_remark      TEXT DEFAULT NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        UNIQUE KEY uq_student_term_session (student_id, academic_term, academic_session),
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB",

    // ─── User avatar column ────────────────────────────────────────────────
    "ALTER TABLE users ADD COLUMN avatar_path VARCHAR(255) DEFAULT NULL",
];

$passed  = 0;
$skipped = 0;
$failed  = 0;

foreach ($migrations as $sql) {
    // Build a short label for display
    $label = strlen($sql) > 80 ? substr($sql, 0, 77) . '...' : $sql;

    try {
        $conn->exec($sql);
        echo "  ✔  $label\n";
        $passed++;
    } catch (PDOException $e) {
        $code = $e->getCode();
        $msg  = $e->getMessage();

        // 42S21 = Duplicate column name  |  42000 with "already exists" = table exists
        if ($code === '42S21'
            || strpos($msg, 'Duplicate column name') !== false
            || strpos($msg, 'already exists') !== false
        ) {
            echo "  ↷  Skipped (already applied): $label\n";
            $skipped++;
        } else {
            echo "  ✗  Error on: $label\n     → $msg\n";
            $failed++;
        }
    }
}

echo "\n=== Done. Passed: $passed  |  Skipped: $skipped  |  Failed: $failed ===\n";

if ($failed > 0) {
    echo "\nWARNING: Some migrations failed. Review errors above.\n";
    http_response_code(500);
} else {
    echo "\nAll migrations applied successfully.\n";
}
