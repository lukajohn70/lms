<?php
/**
 * ==============================================================================
 * DLHS Portal Extracted Data → Aroura LMS Database Importer
 * ==============================================================================
 * Run via CLI: php database/import_portal_results.php
 * Or via browser: http://localhost/lms/database/import_portal_results.php
 *
 * Imports:
 * 1. Classes into `classes` table
 * 2. Subjects into `courses` table (with departments)
 * 3. Students into `users` table (role = 'student', default password = 'password123' or '1234')
 * 4. Course enrollments into `enrollments` table
 * 5. Historical class assignments into `student_class_history` table
 * 6. Terminal grades into `grades` table (ca1, ca2, exam, score, status='published')
 * ==============================================================================
 */

require_once __DIR__ . '/../api/config/Database.php';

// CLI or Web output helper
$isCli = (php_sapi_name() === 'cli');
if (!$isCli) {
    header('Content-Type: text/html; charset=utf-8');
    echo "<!DOCTYPE html><html><head><title>LMS Portal Importer</title></head><body style='background:#0f172a;color:#f8fafc;font-family:monospace;padding:24px;'>";
    echo "<h2>🚀 DLHS Portal &rarr; Aroura LMS Import Runner</h2>";
}

function logMsg($msg, $color = '#38bdf8') {
    global $isCli;
    if ($isCli) {
        echo $msg . PHP_EOL;
    } else {
        echo "<div style='color:{$color};margin-bottom:4px;'>&bull; {$msg}</div>";
        ob_flush();
        flush();
    }
}

$extractDir = __DIR__ . '/portal_extract';
$classesFile = $extractDir . '/classes.json';
$subjectsFile = $extractDir . '/subjects.json';
$studentsFile = $extractDir . '/all_students_full.json';
$gradesFile = $extractDir . '/all_terminal_grades.json';

// Validate files exist
if (!file_exists($studentsFile) && file_exists($extractDir . '/all_students_basic.json')) {
    $studentsFile = $extractDir . '/all_students_basic.json';
}

if (!file_exists($classesFile) || !file_exists($subjectsFile)) {
    logMsg("Error: Missing extracted data in {$extractDir}. Please run run_crawler.py first.", '#ef4444');
    exit(1);
}

$classesData = json_decode(file_get_contents($classesFile), true) ?: [];
$subjectsData = json_decode(file_get_contents($subjectsFile), true) ?: [];
$studentsData = file_exists($studentsFile) ? (json_decode(file_get_contents($studentsFile), true) ?: []) : [];
$gradesData = file_exists($gradesFile) ? (json_decode(file_get_contents($gradesFile), true) ?: []) : [];

logMsg("Found " . count($classesData) . " classes.");
logMsg("Found " . count($subjectsData) . " subjects.");
logMsg("Found " . count($studentsData) . " students.");
logMsg("Found " . count($gradesData) . " terminal grade records.");

// Department mapping for courses
$deptMapping = [
    'Mathematics' => ['Mathematics', 'Further Mathematics', 'Further Maths'],
    'Sciences' => ['Physics', 'Chemistry', 'Biology', 'Agricultural Science', 'Basic Science', 'Computer Studies', 'Data Processing', 'Robotics and A.I.', 'Digital Technology', 'Intermediate Science', 'Animal Husbandry'],
    'Languages' => ['English Language', 'French', 'French Language', 'Literature in English', 'Yoruba', 'Igbo', 'Hausa'],
    'Arts & Social Sciences' => ['Civic Education', 'Social Studies', 'Economics', 'Geography', 'Government', 'Christian Religious Studies', 'Islamic Studies', 'History', 'Nigerian History', 'Visual Art', 'Cultural and Creative Art', 'Citizenship and Heritage Studies'],
    'Vocational & Commercial' => ['Basic Technology', 'Technical Drawing', 'Business Studies', 'Commerce', 'Financial Accounting', 'Music', 'Physical and Health Education', 'LET', 'Home Economics', 'Food and Nutrition', 'Catering Craft Practice']
];

function resolveDept($courseName, $deptMapping) {
    foreach ($deptMapping as $dept => $keywords) {
        foreach ($keywords as $kw) {
            if (stripos($courseName, $kw) !== false) {
                return $dept;
            }
        }
    }
    return 'General';
}

// Connect to LMS database
$db = new Database();
$conn = $db->getConnection();

try {
    $conn->beginTransaction();

    // ---------------------------------------------------------
    // 1. IMPORT CLASSES
    // ---------------------------------------------------------
    logMsg("Importing classes...", '#a855f7');
    $stmtClass = $conn->prepare("
        INSERT INTO classes (id, name, department)
        VALUES (:id, :name, :dept)
        ON DUPLICATE KEY UPDATE name = VALUES(name), department = VALUES(department)
    ");

    $classCount = 0;
    foreach ($classesData as $cid => $c) {
        $cName = trim($c['name']);
        if (in_array(strtoupper($cName), ['NULL', 'NILL'])) continue;
        
        $dept = $c['dept'] ?? 'General';
        $stmtClass->execute([
            ':id' => intval($cid),
            ':name' => $cName,
            ':dept' => $dept
        ]);
        $classCount++;
    }
    logMsg("✓ Synced {$classCount} classes.", '#22c55e');

    // ---------------------------------------------------------
    // 2. IMPORT SUBJECTS (COURSES)
    // ---------------------------------------------------------
    logMsg("Importing subjects into courses table...", '#a855f7');
    $stmtCourse = $conn->prepare("
        INSERT INTO courses (id, name, department, description)
        VALUES (:id, :name, :dept, :desc)
        ON DUPLICATE KEY UPDATE name = VALUES(name), department = VALUES(department)
    ");

    $courseMap = []; // Name (uppercase) -> id
    $courseCount = 0;
    foreach ($subjectsData as $sid => $sub) {
        $sName = trim($sub['name']);
        if (!$sName) continue;
        $dept = resolveDept($sName, $deptMapping);
        
        $stmtCourse->execute([
            ':id' => intval($sid),
            ':name' => $sName,
            ':dept' => $dept,
            ':desc' => $sub['year_group'] ?? ''
        ]);
        $courseMap[strtoupper($sName)] = intval($sid);
        $courseCount++;
    }
    logMsg("✓ Synced {$courseCount} courses.", '#22c55e');

    // ---------------------------------------------------------
    // 3. IMPORT STUDENTS
    // ---------------------------------------------------------
    logMsg("Importing students into users table...", '#a855f7');
    $defaultPasswordHash = password_hash('1234', PASSWORD_BCRYPT);
    $stmtUser = $conn->prepare("
        INSERT INTO users (id, email, password_hash, role, first_name, last_name, class_id, admission_number, gender)
        VALUES (:id, :email, :pwd, 'student', :fname, :lname, :cid, :adm, :gender)
        ON DUPLICATE KEY UPDATE
            email = VALUES(email),
            first_name = VALUES(first_name),
            last_name = VALUES(last_name),
            class_id = VALUES(class_id),
            admission_number = VALUES(admission_number),
            gender = VALUES(gender)
    ");

    $stmtHistory = $conn->prepare("
        INSERT IGNORE INTO student_class_history (student_id, class_id, academic_session, academic_term)
        VALUES (:sid, :cid, :sess, :term)
    ");

    $studentCount = 0;
    foreach ($studentsData as $st) {
        $sid = intval($st['student_id']);
        $rawName = trim($st['name']);
        $cid = intval($st['class_id']);
        
        // Split name into First Name and Last Name
        $nameParts = preg_split('/\s+/', $rawName);
        $lastName = array_shift($nameParts) ?: 'Student'; // DLHS convention: Surname first
        $firstName = !empty($nameParts) ? implode(' ', $nameParts) : 'DLHS';

        // SPECIAL HANDLING: EHI WINIFRED
        // Student ID 6663 or name contains EHI WINIFRED
        if ($sid === 6663 || (stripos($rawName, 'EHI') !== false && stripos($rawName, 'WINIFRED') !== false)) {
            $lastName = 'Patrick';
            $firstName = 'Ehi Winifred';
            logMsg("  &rarr; Handled special student: Patrick Ehi Winifred (ID: {$sid})", '#f59e0b');
        }

        $email = trim($st['email']);
        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $email = "student" . $sid . "@dlhs.org";
        }
        $adm = trim($st['admission_number'] ?? '');
        if (!$adm) {
            $adm = "DLHS/" . $sid;
        }
        $gender = strtoupper(trim($st['gender'] ?? 'MALE'));
        if (!in_array($gender, ['MALE', 'FEMALE'])) $gender = 'MALE';

        $stmtUser->execute([
            ':id' => $sid,
            ':email' => $email,
            ':pwd' => $defaultPasswordHash,
            ':fname' => $firstName,
            ':lname' => $lastName,
            ':cid' => $cid,
            ':adm' => $adm,
            ':gender' => $gender
        ]);

        // Seed current class history
        $stmtHistory->execute([
            ':sid' => $sid,
            ':cid' => $cid,
            ':sess' => '2024/2025',
            ':term' => '1st Term'
        ]);

        $studentCount++;
    }
    logMsg("✓ Synced {$studentCount} students.", '#22c55e');

    // ---------------------------------------------------------
    // 4. IMPORT TERMINAL RESULTS (GRADES)
    // ---------------------------------------------------------
    if (!empty($gradesData)) {
        logMsg("Importing terminal grades...", '#a855f7');
        $stmtGrade = $conn->prepare("
            INSERT INTO grades (
                student_id, course_id, class_id, academic_term, academic_session,
                ca1, ca2, exam, score, max_score, remarks, status,
                assignment_score, project_score, mid_term_test
            ) VALUES (
                :sid, :cid, :class_id, :term, :sess,
                :ca1, :ca2, :exam, :score, 100, :rmk, 'published',
                :asgn, :proj, :test
            ) ON DUPLICATE KEY UPDATE
                ca1 = VALUES(ca1),
                ca2 = VALUES(ca2),
                exam = VALUES(exam),
                score = VALUES(score),
                remarks = VALUES(remarks),
                status = 'published',
                assignment_score = VALUES(assignment_score),
                project_score = VALUES(project_score),
                mid_term_test = VALUES(mid_term_test)
        ");

        $stmtEnroll = $conn->prepare("
            INSERT IGNORE INTO enrollments (student_id, course_id)
            VALUES (:sid, :cid)
        ");

        $gradeCount = 0;
        foreach ($gradesData as $g) {
            $sid = intval($g['student_id']);
            $sName = strtoupper(trim($g['subject']));
            
            // Resolve course_id
            $courseId = $courseMap[$sName] ?? null;
            if (!$courseId) {
                // Try fuzzy lookup
                foreach ($courseMap as $k => $cidVal) {
                    if (strpos($k, $sName) !== false || strpos($sName, $k) !== false) {
                        $courseId = $cidVal;
                        break;
                    }
                }
            }

            if (!$courseId) {
                // Insert new course dynamically if not found
                $insC = $conn->prepare("INSERT INTO courses (name, department) VALUES (:n, :d)");
                $insC->execute([':n' => $g['subject'], ':d' => resolveDept($g['subject'], $deptMapping)]);
                $courseId = intval($conn->lastInsertId());
                $courseMap[$sName] = $courseId;
            }

            $cid = intval($g['class_id'] ?? 0);
            if (!$cid) {
                $chkCid = $conn->prepare("SELECT class_id FROM users WHERE id = :u LIMIT 1");
                $chkCid->execute([':u' => $sid]);
                $cid = intval($chkCid->fetchColumn()) ?: null;
            }

            $stmtGrade->execute([
                ':sid' => $sid,
                ':cid' => $courseId,
                ':class_id' => $cid,
                ':term' => $g['term'],
                ':sess' => $g['session'],
                ':ca1' => floatval($g['ca1'] ?? 0),
                ':ca2' => floatval($g['ca2'] ?? 0),
                ':exam' => floatval($g['exam'] ?? 0),
                ':score' => floatval($g['score'] ?? 0),
                ':rmk' => $g['remarks'] ?? '',
                ':asgn' => isset($g['assignment_score']) ? floatval($g['assignment_score']) : null,
                ':proj' => isset($g['project_score']) ? floatval($g['project_score']) : null,
                ':test' => isset($g['mid_term_test']) ? floatval($g['mid_term_test']) : null
            ]);

            // Ensure student is enrolled in this course
            $stmtEnroll->execute([':sid' => $sid, ':cid' => $courseId]);

            // Track historical class placement
            if ($cid) {
                $stmtHistory->execute([
                    ':sid' => $sid,
                    ':cid' => $cid,
                    ':sess' => $g['session'],
                    ':term' => $g['term']
                ]);
            }

            $gradeCount++;
        }
        logMsg("✓ Synced {$gradeCount} student grades.", '#22c55e');
    }

    $conn->commit();
    logMsg("🎉 DATA IMPORT COMPLETED CLEANLY!", '#22c55e');

} catch (Exception $e) {
    if ($conn->inTransaction()) {
        $conn->rollBack();
    }
    logMsg("ERROR during import: " . $e->getMessage(), '#ef4444');
    exit(1);
}

if (!$isCli) {
    echo "</body></html>";
}
