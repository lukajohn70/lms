<?php
$pdo = new PDO('mysql:host=127.0.0.1;dbname=aroura;port=3306', 'root', 'root');
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

echo "=== COURSES TABLE ===\n";
$stmt = $pdo->query("SHOW CREATE TABLE courses");
$row = $stmt->fetch();
print_r($row['Create Table']);

echo "\n\n=== CLASS_SUBJECTS TABLE ===\n";
$stmt = $pdo->query("SHOW CREATE TABLE class_subjects");
$row = $stmt->fetch();
print_r($row['Create Table']);
