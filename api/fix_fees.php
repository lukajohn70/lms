<?php
// Fix script: seed missing invoices for FuNom Luka and fix fees.status ENUM
$pdo = new PDO('mysql:host=127.0.0.1;dbname=aroura;port=3306', 'root', 'root');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== FIXING FEES FOR FUNOM LUKA (student_id=13) ===\n";

// Check current fees for student 13
$rows = $pdo->query("SELECT id, description, amount, status FROM fees WHERE student_id = 13")->fetchAll(PDO::FETCH_ASSOC);
echo "Current fees for student 13: " . count($rows) . "\n";

if (empty($rows)) {
    $dueDate = date('Y-m-d', strtotime('+30 days'));
    
    $stmt = $pdo->prepare("INSERT INTO fees (student_id, amount, description, status, due_date) VALUES (:sid, :amount, :desc, 'pending', :due)");
    
    // Tuition Fee (Secondary level default)
    $stmt->execute([':sid' => 13, ':amount' => 120000.00, ':desc' => '1st Term Tuition Fee', ':due' => $dueDate]);
    echo "  Inserted: 1st Term Tuition Fee - N120,000\n";
    
    // Materials Fee
    $stmt->execute([':sid' => 13, ':amount' => 28000.00, ':desc' => '1st Term Books & Materials Fee', ':due' => $dueDate]);
    echo "  Inserted: 1st Term Books & Materials Fee - N28,000\n";
    
    // Development Levy
    $stmt->execute([':sid' => 13, ':amount' => 15000.00, ':desc' => 'Development Levy', ':due' => $dueDate]);
    echo "  Inserted: Development Levy - N15,000\n";
    
    echo "  Done! 3 invoices created for FuNom Luka.\n";
} else {
    echo "  Fees already exist, skipping.\n";
    foreach ($rows as $r) {
        echo "  fee[{$r['id']}] {$r['description']} - N{$r['amount']} ({$r['status']})\n";
    }
}

echo "\n=== FIXING fees.status ENUM (add 'partial') ===\n";
try {
    $pdo->exec("ALTER TABLE fees MODIFY COLUMN status ENUM('pending','partial','paid','overdue') NOT NULL DEFAULT 'pending'");
    echo "  fees.status ENUM updated to include 'partial'\n";
} catch (Exception $e) {
    echo "  Note: " . $e->getMessage() . "\n";
}

echo "\n=== VERIFY FINAL STATE ===\n";
$rows = $pdo->query("
    SELECT f.id, f.student_id, CONCAT(u.first_name,' ',u.last_name) AS student_name, 
           f.description, f.amount, f.status, f.due_date,
           COALESCE((SELECT SUM(amount_paid) FROM fee_payments WHERE fee_id = f.id), 0) AS total_paid
    FROM fees f 
    JOIN users u ON f.student_id = u.id
    WHERE f.student_id = 13
")->fetchAll(PDO::FETCH_ASSOC);
echo "Fees for student 13:\n";
foreach ($rows as $r) {
    echo "  fee[{$r['id']}] {$r['student_name']} | {$r['description']} | N{$r['amount']} | paid: N{$r['total_paid']} | {$r['status']} | due {$r['due_date']}\n";
}

echo "\n=== SHOW COLUMNS FROM fees ===\n";
$cols = $pdo->query("SHOW COLUMNS FROM fees")->fetchAll(PDO::FETCH_ASSOC);
foreach ($cols as $c) {
    echo "  {$c['Field']} | {$c['Type']} | null={$c['Null']} | default={$c['Default']}\n";
}
