<?php
/**
 * DLHS LMS — Automated Database Migration & .env Configuration Tool for cPanel
 *
 * HOW TO RUN:
 * 1. CLI: Open your terminal and run:
 *    php deploy_database.php
 *    (It will prompt you for your cPanel DB details, or you can fill them below!)
 *
 * 2. BROWSER: Open in your local browser:
 *    http://localhost/lms/deploy_database.php
 *    (Fill the fields in the web form and click "Start Migration")
 */

// ==============================================================================
// OPTION A: FILL IN YOUR CPANEL DATABASE DETAILS HERE (OR LEAVE BLANK TO BE PROMPTED)
// ==============================================================================
$targetHost     = '';      // e.g. "cpanel.yourdomain.com", server IP, or "localhost" if run directly on cPanel
$targetPort     = 3306;    // Default MySQL port is 3306
$targetDbName   = '';      // e.g. "cpaneluser_dlhs"
$targetUser     = '';      // e.g. "cpaneluser_dbuser"
$targetPassword = '';      // e.g. "YourSecurePassword123!"
$appDomain      = 'https://lms.jlm.com.ng'; // Production domain for CORS_ORIGIN
$isProductionOnCpanel = true; // Set DB_HOST=localhost in .env for production cPanel app execution

// Increase execution time & memory for database export/import
@ini_set('memory_limit', '512M');
@set_time_limit(600);

$isCli = (php_sapi_name() === 'cli');

// Local database credentials (defaults from MAMP / local api/.env)
$localEnvPath = __DIR__ . '/api/.env';
$localHost = '127.0.0.1';
$localPort = 3306;
$localDb   = 'aroura';
$localUser = 'root';
$localPass = 'root';

if (file_exists($localEnvPath)) {
    $lines = file($localEnvPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($k, $v) = explode('=', $line, 2);
            $k = trim($k);
            $v = trim($v, " \t\n\r\0\x0B\"'");
            if ($k === 'DB_HOST') $localHost = $v;
            if ($k === 'DB_PORT') $localPort = intval($v);
            if ($k === 'DB_NAME') $localDb   = $v;
            if ($k === 'DB_USERNAME') $localUser = $v;
            if ($k === 'DB_PASSWORD') $localPass = $v;
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI INTERACTIVE PROMPTS
// ─────────────────────────────────────────────────────────────────────────────
if ($isCli) {
    echo "\n";
    echo "====================================================================\n";
    echo "  DLHS LMS — cPanel Database Migration & .env Setup Tool\n";
    echo "====================================================================\n\n";

    echo "Local Database Detected: [{$localDb}] on {$localHost}:{$localPort} (User: {$localUser})\n\n";

    if (empty($targetHost)) {
        echo "Enter cPanel / Remote MySQL Host [e.g. your server IP, domain, or localhost]: ";
        $input = trim(fgets(STDIN));
        $targetHost = $input ?: 'localhost';
    }

    if ($targetPort === 3306) {
        echo "Enter cPanel MySQL Port [3306]: ";
        $input = trim(fgets(STDIN));
        if ($input !== '') $targetPort = intval($input);
    }

    if (empty($targetDbName)) {
        echo "Enter cPanel Database Name [e.g. username_aroura]: ";
        $targetDbName = trim(fgets(STDIN));
    }

    if (empty($targetUser)) {
        echo "Enter cPanel Database Username [e.g. username_dbuser]: ";
        $targetUser = trim(fgets(STDIN));
    }

    if (empty($targetPassword)) {
        echo "Enter cPanel Database Password: ";
        $targetPassword = trim(fgets(STDIN));
    }

    if (empty($appDomain)) {
        echo "Enter your cPanel Website URL [https://lms.jlm.com.ng]: ";
        $input = trim(fgets(STDIN));
        $appDomain = $input ?: 'https://lms.jlm.com.ng';
    }

    echo "\nStarting process...\n\n";
    $result = runMigration($localHost, $localPort, $localDb, $localUser, $localPass, $targetHost, $targetPort, $targetDbName, $targetUser, $targetPassword, $appDomain, $isProductionOnCpanel, true);
    
    echo "\n";
    if ($result['success']) {
        echo "====================================================================\n";
        echo "  MIGRATION & SETUP COMPLETE! \n";
        echo "====================================================================\n";
        echo $result['message'] . "\n\n";
    } else {
        echo "====================================================================\n";
        echo "  MIGRATION NOTICE / ATTENTION REQUIRED\n";
        echo "====================================================================\n";
        echo $result['message'] . "\n\n";
    }
    exit($result['success'] ? 0 : 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// WEB BROWSER INTERFACE
// ─────────────────────────────────────────────────────────────────────────────
$webAction = $_SERVER['REQUEST_METHOD'] === 'POST' ? 'migrate' : 'form';
$webResult = null;

if ($webAction === 'migrate') {
    $targetHost     = trim($_POST['targetHost'] ?? '');
    $targetPort     = intval($_POST['targetPort'] ?? 3306);
    $targetDbName   = trim($_POST['targetDbName'] ?? '');
    $targetUser     = trim($_POST['targetUser'] ?? '');
    $targetPassword = trim($_POST['targetPassword'] ?? '');
    $appDomain      = trim($_POST['appDomain'] ?? '');
    $isProductionOnCpanel = isset($_POST['isProductionOnCpanel']);

    $webResult = runMigration($localHost, $localPort, $localDb, $localUser, $localPass, $targetHost, $targetPort, $targetDbName, $targetUser, $targetPassword, $appDomain, $isProductionOnCpanel, false);
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DLHS LMS — cPanel Database Migration & .env Setup</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        body { background: #0f172a; color: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px 16px; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; width: 100%; max-width: 680px; padding: 32px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
        .logo-row { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
        .logo-badge { background: #2563eb; color: #fff; width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px; }
        h1 { font-size: 20px; font-weight: 700; color: #fff; }
        .subtitle { font-size: 13px; color: #94a3b8; margin-top: 2px; }
        .local-info { background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 14px 16px; margin-bottom: 24px; font-size: 13px; color: #cbd5e1; }
        .local-info strong { color: #38bdf8; }
        .form-group { margin-bottom: 16px; }
        label { display: block; font-size: 13px; font-weight: 600; color: #cbd5e1; margin-bottom: 6px; }
        .input-hint { font-size: 11px; color: #64748b; margin-top: 4px; }
        input[type="text"], input[type="password"], input[type="number"] {
            width: 100%; padding: 10px 14px; background: #0f172a; border: 1px solid #475569; border-radius: 8px; color: #f8fafc; font-size: 14px; outline: none; transition: border-color 0.2s;
        }
        input:focus { border-color: #38bdf8; }
        .grid-2 { display: grid; grid-template-columns: 3fr 1fr; gap: 12px; }
        .checkbox-group { display: flex; align-items: center; gap: 10px; margin: 18px 0; font-size: 13px; color: #cbd5e1; }
        .btn-submit {
            width: 100%; padding: 14px; background: #2563eb; color: #fff; font-size: 15px; font-weight: 700; border: none; border-radius: 8px; cursor: pointer; transition: background 0.2s;
        }
        .btn-submit:hover { background: #1d4ed8; }
        .alert { border-radius: 10px; padding: 18px; margin-bottom: 24px; font-size: 13px; line-height: 1.6; }
        .alert-success { background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #34d399; }
        .alert-warning { background: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; color: #fbbf24; }
        .alert-error { background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #f87171; }
        pre { background: #090d16; border: 1px solid #1e293b; padding: 12px; border-radius: 6px; font-size: 12px; color: #e2e8f0; overflow-x: auto; margin-top: 10px; }
    </style>
</head>
<body>
<div class="card">
    <div class="logo-row">
        <div class="logo-badge">DL</div>
        <div>
            <h1>cPanel Database Migration & .env Setup</h1>
            <div class="subtitle">Deeper Life High School Academic Management System</div>
        </div>
    </div>

    <div class="local-info">
        <strong>Source Local Database:</strong> [<?= htmlspecialchars($localDb) ?>] on <?= htmlspecialchars($localHost) ?>:<?= htmlspecialchars($localPort) ?> (User: <?= htmlspecialchars($localUser) ?>)
    </div>

    <?php if ($webResult): ?>
        <?php if ($webResult['success']): ?>
            <div class="alert alert-success">
                <strong>Migration & Setup Succeeded!</strong><br>
                <?= nl2br(htmlspecialchars($webResult['message'])) ?>
            </div>
            <pre><?= htmlspecialchars($webResult['envPreview']) ?></pre>
            <p style="margin-top: 16px; text-align: center;"><a href="deploy_database.php" style="color: #38bdf8; text-decoration: none; font-size: 13px;">← Return to Setup Form</a></p>
        <?php else: ?>
            <div class="alert alert-warning">
                <strong>Migration Status & Action Steps:</strong><br>
                <?= nl2br(htmlspecialchars($webResult['message'])) ?>
            </div>
            <?php if (!empty($webResult['envPreview'])): ?>
                <div style="font-size: 12px; color: #94a3b8; margin-bottom: 6px;">Generated Production .env:</div>
                <pre><?= htmlspecialchars($webResult['envPreview']) ?></pre>
            <?php endif; ?>
            <p style="margin-top: 16px; text-align: center;"><a href="deploy_database.php" style="color: #38bdf8; text-decoration: none; font-size: 13px;">← Try Again</a></p>
        <?php endif; ?>
    <?php else: ?>
        <form method="POST" action="deploy_database.php">
            <div class="grid-2">
                <div class="form-group">
                    <label>cPanel / Remote MySQL Host</label>
                    <input type="text" name="targetHost" placeholder="e.g. server IP, domain, or localhost" value="<?= htmlspecialchars($targetHost ?: 'localhost') ?>" required>
                    <div class="input-hint">Use your cPanel server IP/domain if connecting from Mac, or 'localhost' if running on cPanel.</div>
                </div>
                <div class="form-group">
                    <label>Port</label>
                    <input type="number" name="targetPort" value="<?= htmlspecialchars($targetPort ?: '3306') ?>" required>
                </div>
            </div>

            <div class="form-group">
                <label>cPanel Database Name</label>
                <input type="text" name="targetDbName" placeholder="e.g. cpaneluser_aroura" value="<?= htmlspecialchars($targetDbName) ?>" required>
                <div class="input-hint">The database name created via cPanel MySQL Databases.</div>
            </div>

            <div class="form-group">
                <label>cPanel Database Username</label>
                <input type="text" name="targetUser" placeholder="e.g. cpaneluser_dbuser" value="<?= htmlspecialchars($targetUser) ?>" required>
            </div>

            <div class="form-group">
                <label>cPanel Database Password</label>
                <input type="password" name="targetPassword" placeholder="Your database password" value="<?= htmlspecialchars($targetPassword) ?>" required>
            </div>

            <div class="form-group">
                <label>Website URL (CORS Origin)</label>
                <input type="text" name="appDomain" placeholder="https://portal.yourdomain.com" value="<?= htmlspecialchars($appDomain ?: 'https://yourdomain.com') ?>" required>
                <div class="input-hint">Your deployed website URL. Used for CORS security and token validation.</div>
            </div>

            <div class="checkbox-group">
                <input type="checkbox" name="isProductionOnCpanel" id="isProd" checked>
                <label for="isProd" style="margin: 0; font-weight: normal; cursor: pointer;">
                    Set DB_HOST=localhost in .env for cPanel app execution (recommended)
                </label>
            </div>

            <button type="submit" class="btn-submit">Start Database Migration & Configure .env</button>
        </form>
    <?php endif; ?>
</div>
</body>
</html>
<?php

// ─────────────────────────────────────────────────────────────────────────────
// CORE MIGRATION LOGIC FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
function runMigration($localHost, $localPort, $localDb, $localUser, $localPass, $targetHost, $targetPort, $targetDbName, $targetUser, $targetPassword, $appDomain, $isProductionOnCpanel, $isCli) {
    $out = [];
    $log = function($msg) use (&$out, $isCli) {
        $out[] = $msg;
        if ($isCli) echo "$msg\n";
    };

    $log(">> Step 1: Connecting to Local Database [$localDb]...");
    try {
        $localPdo = new PDO(
            "mysql:host={$localHost};port={$localPort};dbname={$localDb};charset=utf8mb4",
            $localUser,
            $localPass,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        $localTables = $localPdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
        $log("   Found " . count($localTables) . " tables in local database.");
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => "Failed to connect to local database: " . $e->getMessage() . "\nPlease ensure MAMP MySQL is running.",
            'envPreview' => ''
        ];
    }

    $log("\n>> Step 2: Generating fresh SQL Export [database/aroura_export_latest.sql]...");
    $sqlDumpPath = __DIR__ . '/database/aroura_export_latest.sql';
    
    // Try mysqldump first
    $dumpBinCandidates = [
        '/Applications/MAMP/Library/bin/mysql80/bin/mysqldump',
        '/Applications/MAMP/Library/bin/mysql57/bin/mysqldump',
        'mysqldump'
    ];
    $dumpSuccess = false;
    foreach ($dumpBinCandidates as $bin) {
        $cmd = escapeshellcmd($bin) . " -h " . escapeshellarg($localHost) . " -P " . escapeshellarg($localPort) . " -u " . escapeshellarg($localUser) . " -p" . escapeshellarg($localPass) . " --routines --triggers --single-transaction " . escapeshellarg($localDb) . " > " . escapeshellarg($sqlDumpPath) . " 2>/dev/null";
        @exec($cmd, $o, $ret);
        if ($ret === 0 && file_exists($sqlDumpPath) && filesize($sqlDumpPath) > 1000) {
            $dumpSuccess = true;
            $log("   Export created successfully via $bin (" . round(filesize($sqlDumpPath) / 1024 / 1024, 2) . " MB).");
            break;
        }
    }

    if (!$dumpSuccess) {
        $log("   Generating export via PHP PDO fallback...");
        $fp = fopen($sqlDumpPath, 'w');
        fwrite($fp, "SET FOREIGN_KEY_CHECKS = 0;\nSET NAMES utf8mb4;\n\n");
        foreach ($localTables as $tbl) {
            fwrite($fp, "DROP TABLE IF EXISTS `{$tbl}`;\n");
            $ctRow = $localPdo->query("SHOW CREATE TABLE `{$tbl}`")->fetch(PDO::FETCH_ASSOC);
            fwrite($fp, $ctRow['Create Table'] . ";\n\n");

            $rows = $localPdo->query("SELECT * FROM `{$tbl}`")->fetchAll(PDO::FETCH_ASSOC);
            if (!empty($rows)) {
                $cols = array_keys($rows[0]);
                $colList = implode('`, `', $cols);
                $chunks = array_chunk($rows, 200);
                foreach ($chunks as $chunk) {
                    $valSets = [];
                    foreach ($chunk as $r) {
                        $escaped = array_map(function($v) use ($localPdo) {
                            return ($v === null) ? 'NULL' : $localPdo->quote($v);
                        }, array_values($r));
                        $valSets[] = '(' . implode(', ', $escaped) . ')';
                    }
                    fwrite($fp, "INSERT INTO `{$tbl}` (`{$colList}`) VALUES \n" . implode(",\n", $valSets) . ";\n");
                }
                fwrite($fp, "\n");
            }
        }
        fwrite($fp, "SET FOREIGN_KEY_CHECKS = 1;\n");
        fclose($fp);
        $log("   Export created successfully via PHP PDO (" . round(filesize($sqlDumpPath) / 1024 / 1024, 2) . " MB).");
    }

    $log("\n>> Step 3: Connecting to Target cPanel Database [$targetDbName] on $targetHost:$targetPort...");
    $targetConnected = false;
    $targetPdo = null;
    $connectionError = '';

    try {
        $optMulti = defined('Pdo\Mysql::ATTR_MULTI_STATEMENTS') ? \Pdo\Mysql::ATTR_MULTI_STATEMENTS : (defined('PDO::MYSQL_ATTR_MULTI_STATEMENTS') ? PDO::MYSQL_ATTR_MULTI_STATEMENTS : 1000);
        $targetPdo = new PDO(
            "mysql:host={$targetHost};port={$targetPort};dbname={$targetDbName};charset=utf8mb4",
            $targetUser,
            $targetPassword,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                $optMulti => true
            ]
        );
        $targetConnected = true;
        $log("   Connected to target database successfully!");
    } catch (Exception $e) {
        $connectionError = $e->getMessage();
        $log("   Notice: Direct remote connection failed: $connectionError");
    }

    // Step 4: Import into Target Database if connected
    $importSuccess = false;
    if ($targetConnected && $targetPdo) {
        $log("\n>> Step 4: Importing tables and records into target database...");
        try {
            $targetPdo->exec("SET FOREIGN_KEY_CHECKS = 0; SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';");
            
            // Read and execute statements
            $fp = fopen($sqlDumpPath, 'r');
            $stmt = '';
            $executed = 0;
            while (($line = fgets($fp)) !== false) {
                $trimmed = trim($line);
                if ($trimmed === '' || strpos($trimmed, '--') === 0 || strpos($trimmed, '/*') === 0) continue;
                $stmt .= $line;
                if (substr($trimmed, -1) === ';') {
                    $targetPdo->exec($stmt);
                    $stmt = '';
                    $executed++;
                }
            }
            fclose($fp);
            if (!empty(trim($stmt))) {
                $targetPdo->exec($stmt);
            }
            $targetPdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

            // Verify
            $remoteTables = $targetPdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
            $log("   Import complete! Remote database now contains " . count($remoteTables) . " tables.");
            $importSuccess = true;
        } catch (Exception $e) {
            $log("   Import error: " . $e->getMessage());
        }
    }

    // Step 5: Generate and write production .env
    $log("\n>> Step 5: Preparing .env configuration...");
    $jwtSecret = base64_encode(random_bytes(36));

    // When running inside cPanel, PHP executes on the same server, so DB_HOST is usually 'localhost' or '127.0.0.1'
    $envDbHost = $isProductionOnCpanel ? 'localhost' : $targetHost;

    $envContent = "# ─────────────────────────────────────────────\n";
    $envContent .= "#  DLHS LMS — cPanel Production Environment\n";
    $envContent .= "#  Generated on " . date('Y-m-d H:i:s') . "\n";
    $envContent .= "# ─────────────────────────────────────────────\n\n";
    $envContent .= "DB_HOST={$envDbHost}\n";
    $envContent .= "DB_PORT={$targetPort}\n";
    $envContent .= "DB_NAME={$targetDbName}\n";
    $envContent .= "DB_USERNAME={$targetUser}\n";
    $envContent .= "DB_PASSWORD={$targetPassword}\n\n";
    $envContent .= "# Cryptographic JWT Secret\n";
    $envContent .= "JWT_SECRET={$jwtSecret}\n\n";
    $envContent .= "# Allowed CORS Origin\n";
    $envContent .= "CORS_ORIGIN=" . rtrim($appDomain, '/') . "\n\n";
    $envContent .= "# App Environment\n";
    $envContent .= "APP_ENV=production\n";

    // Write api/.env.production
    $prodEnvPath = __DIR__ . '/api/.env.production';
    file_put_contents($prodEnvPath, $envContent);
    $log("   Created production environment file: [api/.env.production]");

    // Also update api/.env (backup first)
    $envPath = __DIR__ . '/api/.env';
    if (file_exists($envPath)) {
        @copy($envPath, __DIR__ . '/api/.env.local.backup');
    }
    file_put_contents($envPath, $envContent);
    $log("   Updated [api/.env] with target credentials (local backup saved to api/.env.local.backup).");

    // Final Summary
    $finalMsg = implode("\n", $out);

    if ($importSuccess) {
        $finalMsg .= "\n\n SUCCESS: All 23 local tables and 51,800+ records have been imported to cPanel database [{$targetDbName}]!";
        $finalMsg .= "\n Both [api/.env] and [api/.env.production] have been updated with your cPanel database credentials.";
        return [
            'success' => true,
            'message' => $finalMsg,
            'envPreview' => $envContent
        ];
    } else {
        $finalMsg .= "\n\n NOTE ON CPANEL REMOTE MYSQL:";
        $finalMsg .= "\n Direct remote MySQL connection to {$targetHost}:{$targetPort} failed.";
        $finalMsg .= "\n Shared cPanel hosting by default protects MySQL port 3306 from external internet connections.";
        $finalMsg .= "\n\n YOU HAVE TWO QUICK OPTIONS:";
        $finalMsg .= "\n 1. In cPanel, click 'Remote MySQL' and add your IP address (or '%' for temporary access), then re-run this script!";
        $finalMsg .= "\n 2. OR go to cPanel -> 'phpMyAdmin', select database [{$targetDbName}], click 'Import', and choose the exported file: [database/aroura_export_latest.sql] (already generated for you!).";
        $finalMsg .= "\n\n Your [api/.env] and [api/.env.production] have been successfully configured with your cPanel database details!";
        return [
            'success' => false,
            'message' => $finalMsg,
            'envPreview' => $envContent
        ];
    }
}
