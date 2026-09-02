<?php
/**
 * Migration: Add term calendar dates & school logo to system_settings
 * Run via: /Applications/MAMP/bin/php/php7.4.33/bin/php database/add_term_calendar.php
 */

require_once __DIR__ . '/../api/config/Database.php';

$db = new Database();
$conn = $db->getConnection();

$newSettings = [
    'vacation_date_term1'   => '2026-12-19',
    'resumption_date_term1' => '2027-01-10',
    'vacation_date_term2'   => '2027-04-04',
    'resumption_date_term2' => '2027-04-22',
    'vacation_date_term3'   => '2027-07-25',
    'resumption_date_term3' => '2027-09-15',
    'school_logo_path'      => '',
];

$stmt = $conn->prepare("
    INSERT INTO system_settings (setting_key, setting_value)
    VALUES (:key, :val)
    ON DUPLICATE KEY UPDATE setting_value = IF(setting_value = '', :val, setting_value)
");

foreach ($newSettings as $key => $val) {
    $stmt->execute([':key' => $key, ':val' => $val]);
    echo "✓ $key = $val\n";
}

echo "\nTerm calendar settings added successfully.\n";
