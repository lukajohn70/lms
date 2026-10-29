<?php
/**
 * DLHS LMS — Live Database Diagnostic & Auto-Fix Tool
 * Access via: https://lms.jlm.com.ng/check_db.php
 */

@ini_set('display_errors', '1');
@error_reporting(E_ALL);

$envPath = __DIR__ . '/api/.env';
$sqlFile = __DIR__ . '/database/aroura_export_latest.sql';

// Read current .env
$env = [];
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($k, $v) = explode('=', $line, 2);
            $env[trim($k)] = trim($v, " \t\n\r\0\x0B\"'");
        }
    }
}

$dbHost = $_POST['db_host'] ?? ($env['DB_HOST'] ?? 'localhost');
$dbPort = intval($_POST['db_port'] ?? ($env['DB_PORT'] ?? 3306));
$dbName = $_POST['db_name'] ?? ($env['DB_NAME'] ?? '');
$dbUser = $_POST['db_user'] ?? ($env['DB_USERNAME'] ?? '');
$dbPass = isset($_POST['db_pass']) ? $_POST['db_pass'] : ($env['DB_PASSWORD'] ?? '');

$saveNotice = '';
$importNotice = '';

// Handle Delete Self
if (isset($_POST['action']) && $_POST['action'] === 'delete_self') {
    @unlink(__FILE__);
    echo "<p style='font-family:sans-serif;padding:20px;color:green;'>check_db.php has been removed for security.</p>";
    exit;
}

// Handle Save .env
if (isset($_POST['action']) && $_POST['action'] === 'save_env') {
    $newContent = "# ─────────────────────────────────────────────\n";
    $newContent .= "#  DLHS LMS — cPanel Production Environment\n";
    $newContent .= "#  Updated via check_db.php on " . date('Y-m-d H:i:s') . "\n";
    $newContent .= "# ─────────────────────────────────────────────\n\n";
    $newContent .= "DB_HOST={$dbHost}\n";
    $newContent .= "DB_PORT={$dbPort}\n";
    $newContent .= "DB_NAME={$dbName}\n";
    $newContent .= "DB_USERNAME={$dbUser}\n";
    $newContent .= "DB_PASSWORD={$dbPass}\n\n";
    $newContent .= "JWT_SECRET=" . ($env['JWT_SECRET'] ?? base64_encode(random_bytes(36))) . "\n\n";
    $newContent .= "CORS_ORIGIN=" . ($env['CORS_ORIGIN'] ?? 'https://lms.jlm.com.ng') . "\n\n";
    $newContent .= "APP_ENV=" . ($env['APP_ENV'] ?? 'production') . "\n";
    $newContent .= "APP_DEBUG=true\n";

    if (@file_put_contents($envPath, $newContent)) {
        $saveNotice = "Saved new credentials to api/.env!";
        $env['DB_HOST'] = $dbHost;
        $env['DB_PORT'] = $dbPort;
        $env['DB_NAME'] = $dbName;
        $env['DB_USERNAME'] = $dbUser;
        $env['DB_PASSWORD'] = $dbPass;
    } else {
        $saveNotice = "Error: Could not write to api/.env. Check file permissions (should be 644).";
    }
}

// Test Connection
$connected = false;
$connError = '';
$tables = [];
$pdo = null;

$hostsToTry = array_unique([$dbHost, ($dbHost === 'localhost' ? '127.0.0.1' : 'localhost')]);
$successfulHost = null;

foreach ($hostsToTry as $h) {
    try {
        $dsn = "mysql:host={$h};port={$dbPort};dbname={$dbName};charset=utf8mb4";
        $pdo = new PDO($dsn, $dbUser, $dbPass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 3
        ]);
        $connected = true;
        $successfulHost = $h;
        break;
    } catch (PDOException $e) {
        $connError = $e->getMessage();
    }
}

// If connected, fetch tables
if ($connected && $pdo) {
    try {
        $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    } catch (Exception $e) {
        $connError = "Connected but could not list tables: " . $e->getMessage();
    }
}

// Handle Database Import
if (isset($_POST['action']) && $_POST['action'] === 'import_db' && $connected && $pdo) {
    if (!file_exists($sqlFile)) {
        $importNotice = "SQL dump file not found at: database/aroura_export_latest.sql";
    } else {
        try {
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 0; SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';");
            $fp = fopen($sqlFile, 'r');
            $stmt = '';
            $executed = 0;
            while (($line = fgets($fp)) !== false) {
                $trimmed = trim($line);
                if ($trimmed === '' || strpos($trimmed, '--') === 0 || strpos($trimmed, '/*') === 0) continue;
                $stmt .= $line;
                if (substr($trimmed, -1) === ';') {
                    $pdo->exec($stmt);
                    $stmt = '';
                    $executed++;
                }
            }
            fclose($fp);
            if (!empty(trim($stmt))) {
                $pdo->exec($stmt);
            }
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
            $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
            $importNotice = "SUCCESS: Imported all tables and data! Total tables now: " . count($tables);
        } catch (Exception $e) {
            $importNotice = "Import Error: " . $e->getMessage();
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Diagnostic & Fix Tool</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #0b1329; color: #f1f5f9; padding: 30px 16px; min-height: 100vh; display: flex; justify-content: center; }
        .wrap { width: 100%; max-width: 680px; }
        .card { background: #16203c; border: 1px solid #293556; border-radius: 14px; padding: 28px; margin-bottom: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
        h1 { font-size: 20px; font-weight: 800; margin-bottom: 6px; color: #fff; }
        .desc { font-size: 13px; color: #94a3b8; margin-bottom: 20px; }
        .banner { border-radius: 10px; padding: 16px; margin-bottom: 20px; font-size: 13px; line-height: 1.6; }
        .banner-err { background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #fca5a5; }
        .banner-ok { background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #6ee7b7; }
        .banner-warn { background: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; color: #fcd34d; }
        .form-row { margin-bottom: 14px; }
        label { display: block; font-size: 12px; font-weight: 700; color: #cbd5e1; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.03em; }
        input[type="text"], input[type="password"], input[type="number"] {
            width: 100%; padding: 10px 12px; background: #0c152c; border: 1px solid #334155; border-radius: 8px; color: #fff; font-size: 14px; outline: none;
        }
        input:focus { border-color: #38bdf8; }
        .grid-2 { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; }
        .btn { padding: 12px 20px; border-radius: 8px; font-size: 14px; font-weight: 700; border: none; cursor: pointer; transition: opacity 0.2s; }
        .btn-primary { background: #2563eb; color: #fff; width: 100%; }
        .btn-success { background: #059669; color: #fff; width: 100%; margin-top: 10px; }
        .btn-danger { background: #dc2626; color: #fff; font-size: 12px; padding: 8px 14px; }
        .btn:hover { opacity: 0.9; }
        .help-box { background: #0c152c; border: 1px solid #1e293b; border-radius: 8px; padding: 14px; font-size: 12.5px; line-height: 1.6; color: #cbd5e1; margin-top: 14px; }
        .help-box strong { color: #38bdf8; }
        .help-box ol { margin-left: 20px; margin-top: 6px; }
        code { background: #1e293b; padding: 2px 6px; border-radius: 4px; color: #f472b6; font-size: 12px; }
    </style>
</head>
<body>
<div class="wrap">
    <div class="card">
        <h1>Database Connection Diagnostic</h1>
        <div class="desc">Deeper Life High School Academic Management System (cPanel)</div>

        <?php if ($saveNotice): ?>
            <div class="banner banner-ok"><?= htmlspecialchars($saveNotice) ?></div>
        <?php endif; ?>

        <?php if ($importNotice): ?>
            <div class="banner <?= strpos($importNotice, 'SUCCESS') !== false ? 'banner-ok' : 'banner-err' ?>">
                <?= htmlspecialchars($importNotice) ?>
            </div>
        <?php endif; ?>

        <?php if ($connected): ?>
            <div class="banner banner-ok">
                <strong>Connection SUCCESSFUL!</strong><br>
                Connected to MySQL host: <code><?= htmlspecialchars($successfulHost) ?></code> (Database: <code><?= htmlspecialchars($dbName) ?></code>).<br>
                Found <strong><?= count($tables) ?></strong> tables in this database.
            </div>

            <?php if (count($tables) === 0): ?>
                <div class="banner banner-warn">
                    <strong>Notice:</strong> Connected to database, but it has 0 tables! Your data has not been imported yet.
                </div>
                <form method="POST">
                    <input type="hidden" name="action" value="import_db">
                    <input type="hidden" name="db_host" value="<?= htmlspecialchars($successfulHost) ?>">
                    <input type="hidden" name="db_port" value="<?= htmlspecialchars($dbPort) ?>">
                    <input type="hidden" name="db_name" value="<?= htmlspecialchars($dbName) ?>">
                    <input type="hidden" name="db_user" value="<?= htmlspecialchars($dbUser) ?>">
                    <input type="hidden" name="db_pass" value="<?= htmlspecialchars($dbPass) ?>">
                    <button type="submit" class="btn btn-success">Import All 23 Tables & Data Now (One Click)</button>
                </form>
            <?php else: ?>
                <p style="font-size: 13px; color: #94a3b8; margin-bottom: 16px;">
                    Your database is connected and contains all <?= count($tables) ?> tables! You can now log into the portal at <a href="https://lms.jlm.com.ng" style="color: #38bdf8;">https://lms.jlm.com.ng</a>.
                </p>
                <form method="POST" onsubmit="return confirm('Delete check_db.php now?');">
                    <input type="hidden" name="action" value="delete_self">
                    <button type="submit" class="btn btn-danger">Delete check_db.php for Security</button>
                </form>
            <?php endif; ?>

        <?php else: ?>
            <div class="banner banner-err">
                <strong>Connection FAILED:</strong><br>
                <code><?= htmlspecialchars($connError) ?></code>
            </div>

            <div class="help-box">
                <?php if (strpos($connError, '1045') !== false): ?>
                    <strong>How to fix [1045 Access denied]:</strong>
                    <ol>
                        <li><strong>Did you assign the User to the Database?</strong><br>
                            In cPanel, go to <strong>MySQL Databases</strong> → scroll to <strong>"Add User To Database"</strong> → Select User <code><?= htmlspecialchars($dbUser) ?></code> and Database <code><?= htmlspecialchars($dbName) ?></code> → click <strong>Add</strong> → check <strong>ALL PRIVILEGES</strong> → click <strong>Make Changes</strong>!</li>
                        <li><strong>Is the password correct?</strong><br>
                            In cPanel → <strong>MySQL Databases</strong> → scroll to <strong>Current Users</strong> → click <strong>Change Password</strong> for <code><?= htmlspecialchars($dbUser) ?></code> → enter the new password into the form below and click "Test & Save".</li>
                    </ol>
                <?php elseif (strpos($connError, '1049') !== false): ?>
                    <strong>How to fix [1049 Unknown database]:</strong>
                    <ol>
                        <li>In cPanel, go to <strong>MySQL Databases</strong> and check the exact database name. Usually it starts with your cPanel username prefix (e.g. <code>gwylvxeo_...</code>).</li>
                    </ol>
                <?php else: ?>
                    <strong>Troubleshooting Tip:</strong>
                    Ensure your database exists in cPanel and your user has been added to it with ALL PRIVILEGES.
                <?php endif; ?>
            </div>
        <?php endif; ?>

        <hr style="border: none; border-top: 1px solid #293556; margin: 24px 0;">

        <form method="POST">
            <input type="hidden" name="action" value="save_env">
            <div class="grid-2">
                <div class="form-row">
                    <label>Database Host</label>
                    <input type="text" name="db_host" value="<?= htmlspecialchars($dbHost) ?>" required>
                </div>
                <div class="form-row">
                    <label>Port</label>
                    <input type="number" name="db_port" value="<?= htmlspecialchars($dbPort) ?>" required>
                </div>
            </div>

            <div class="form-row">
                <label>Database Name</label>
                <input type="text" name="db_name" value="<?= htmlspecialchars($dbName) ?>" required>
            </div>

            <div class="form-row">
                <label>Database User</label>
                <input type="text" name="db_user" value="<?= htmlspecialchars($dbUser) ?>" required>
            </div>

            <div class="form-row">
                <label>Database Password</label>
                <input type="password" name="db_pass" value="<?= htmlspecialchars($dbPass) ?>" placeholder="Enter cPanel Database Password">
            </div>

            <button type="submit" class="btn btn-primary">Test Connection & Save to .env</button>
        </form>
    </div>
</div>
</body>
</html>
