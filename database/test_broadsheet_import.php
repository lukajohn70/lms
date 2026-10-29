<?php
/**
 * Test Broadsheet Import Logic
 */
$arouraPdo = new PDO("mysql:host=127.0.0.1;port=3306;dbname=aroura", "root", "root", [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
]);

$adminId = 98; // ICT Kaduna admin

$broadsheetCourseMap = [
    'AGRICULTURAL SCIENCE' => 107,
    'ANIMAL HUSBANDRY' => 108,
    'BASIC SCIENCE' => 40,
    'BASIC TECHNOLOGY' => 41,
    'BIOLOGY' => 181,
    'BUSINESS STUDIES' => 42,
    'CATERING CRAFT PRACTICE' => 32,
    'CATERING CRAFT' => 32,
    'CHEMISTRY' => 182,
    'CHRISTIAN RELIGIOUS STUDIES' => 187,
    'CIVIC EDUCATION' => 112,
    'COMMERCE' => 190,
    'COMPUTER STUDIES' => 114,
    'CULTURAL AND CREATIVE ART' => 24,
    'C. C. A.' => 24,
    'DATA PROCESSING' => 114,
    'ECONOMICS' => 193,
    'ENGLISH LANGUAGE' => 180,
    'FASHION DESIGN AND GARMENT MAKING' => 198,
    'FINANCIAL ACCOUNTING' => 144,
    'FOOD AND NUTRITION' => 122,
    'FRENCH' => 124,
    'FURTHER MATHS' => 26,
    'FURTHER MATHEMATICS' => 26,
    'GEOGRAPHY' => 188,
    'GOVERNMENT' => 186,
    'HAUSA' => 23,
    'HAUSA LANGUAGE' => 23,
    'HISTORY' => 157,
    'HOME ECONOMICS' => 50,
    'LET' => 36,
    'L. E. T.' => 36,
    'LITERATURE IN ENGLISH' => 185,
    'MATHEMATICS' => 179,
    'MUSIC' => 154,
    'PHYSICAL AND HEALTH EDUCATION' => 33,
    'P. H. E.' => 33,
    'PHYSICS' => 183,
    'ROBOTICS AND A.I.' => 20,
    'ROBOTICS AND ARTIFITIAL INTELLIGENCE' => 20,
    'SOCIAL STUDIES' => 55,
    'SOLAR PHOTOVOLTAIC INSTALLATION AND MAINTENANCE' => 197,
    'TECHNICAL DRAWING' => 191,
    'VISUAL ART' => 12,
    'VISUAL ARTS' => 12
];

// Build student lookup
$users = $arouraPdo->query("SELECT id, first_name, last_name, admission_number, class_id FROM users WHERE role = 'student'")->fetchAll();
$studentNameMap = [];
$usersList = [];
foreach ($users as $u) {
    $sid = intval($u['id']);
    $fn = strtoupper(trim($u['first_name']));
    $ln = strtoupper(trim($u['last_name']));
    $words = array_values(array_filter(preg_split('/[^A-Za-z]+/', $fn . ' ' . $ln)));
    sort($words);
    $sortedKey = implode(' ', $words);
    
    $studentNameMap[$fn . ' ' . $ln] = $sid;
    $studentNameMap[$ln . ' ' . $fn] = $sid;
    $studentNameMap[$sortedKey] = $sid;
    $usersList[$sid] = $words;
}
$studentNameMap['TALSON MANJI'] = 6546;

function findStudentId($rawName, $studentNameMap, $usersList) {
    $clean = strtoupper(trim($rawName));
    if (isset($studentNameMap[$clean])) return $studentNameMap[$clean];
    
    $words = array_values(array_filter(preg_split('/[^A-Za-z]+/', $clean)));
    sort($words);
    $sortedKey = implode(' ', $words);
    if (isset($studentNameMap[$sortedKey])) return $studentNameMap[$sortedKey];
    
    // Subset match
    foreach ($usersList as $sid => $uWords) {
        $diff = array_diff($words, $uWords);
        if (count($diff) == 0) return $sid;
        if (count($words) >= 2 && count(array_intersect($words, $uWords)) >= 2) return $sid;
    }
    return null;
}

$broadsheetsFile = '/Applications/MAMP/htdocs/lms/database/portal_extract/all_portal_broadsheets.json';
$allBroadsheets = json_decode(file_get_contents($broadsheetsFile), true);
echo "Loaded " . count($allBroadsheets) . " broadsheets.\n";

$stmtGrade = $arouraPdo->prepare("
    INSERT INTO grades (
        student_id, course_id, class_id, academic_term, academic_session,
        ca1, ca2, exam, score, max_score, assignment_score, project_score, mid_term_test,
        remarks, status, graded_by
    ) VALUES (
        :sid, :cid, :class_id, :term, :sess,
        :ca1, :ca2, :exam, :score, 100, :asgn, :proj, :test,
        :rmk, 'published', :graded_by
    ) ON DUPLICATE KEY UPDATE
        ca1 = VALUES(ca1),
        ca2 = VALUES(ca2),
        exam = VALUES(exam),
        score = VALUES(score),
        assignment_score = VALUES(assignment_score),
        project_score = VALUES(project_score),
        mid_term_test = VALUES(mid_term_test),
        remarks = VALUES(remarks),
        status = 'published',
        graded_by = VALUES(graded_by)
");

$stmtHistory = $arouraPdo->prepare("
    INSERT INTO student_class_history (student_id, class_id, academic_session, academic_term)
    VALUES (:sid, :cid, :sess, :term)
    ON DUPLICATE KEY UPDATE class_id = VALUES(class_id)
");

$arouraPdo->beginTransaction();
$totalImported = 0;
$studentsMatched = 0;
$missingStudents = [];

$startTime = microtime(true);

foreach ($allBroadsheets as $bs) {
    $classId = intval($bs['class_id']);
    $session = trim($bs['session']);
    $term = trim($bs['term']);
    
    // Build subject ID -> Course ID map for this broadsheet
    $subIdToCourseId = [];
    foreach ($bs['subjects'] as $sb) {
        $sbId = strval($sb['id']);
        $sbName = strtoupper(trim($sb['name']));
        $cid = $broadsheetCourseMap[$sbName] ?? null;
        if (!$cid) {
            // fuzzy match
            foreach ($broadsheetCourseMap as $k => $v) {
                if (stripos($k, $sbName) !== false || stripos($sbName, $k) !== false) {
                    $cid = $v;
                    break;
                }
            }
        }
        if ($cid) {
            $subIdToCourseId[$sbId] = $cid;
        }
    }
    
    foreach ($bs['students'] as $st) {
        $stName = trim($st['name']);
        $sid = findStudentId($stName, $studentNameMap, $usersList);
        if (!$sid) {
            $missingStudents[$stName] = true;
            continue;
        }
        $studentsMatched++;
        
        // Sessions to write: original session + replicate 2025/2026 into 2026/2027
        $sessionsToWrite = [$session];
        if ($session === '2025/2026') {
            $sessionsToWrite[] = '2026/2027';
        }
        
        foreach ($sessionsToWrite as $targetSession) {
            $stmtHistory->execute([
                ':sid' => $sid,
                ':cid' => $classId,
                ':sess' => $targetSession,
                ':term' => $term
            ]);
            
            foreach ($st['scores'] as $sbId => $totScore) {
                $cId = $subIdToCourseId[strval($sbId)] ?? null;
                if (!$cId) continue;
                
                $tot = floatval($totScore);
                $ca1 = round($tot * 0.20, 2);
                $ca2 = round($tot * 0.20, 2);
                $exam = round($tot - $ca1 - $ca2, 2);
                $asgn = round($ca1 * 0.5, 2);
                $proj = round($ca1 * 0.5, 2);
                $test = $ca2;
                $rmk = ($tot >= 75 ? 'Distinction' : ($tot >= 60 ? 'Credit' : ($tot >= 50 ? 'Pass' : 'Fair')));
                
                $stmtGrade->execute([
                    ':sid' => $sid,
                    ':cid' => $cId,
                    ':class_id' => $classId,
                    ':term' => $term,
                    ':sess' => $targetSession,
                    ':ca1' => $ca1,
                    ':ca2' => $ca2,
                    ':exam' => $exam,
                    ':score' => $tot,
                    ':asgn' => $asgn,
                    ':proj' => $proj,
                    ':test' => $test,
                    ':rmk' => $rmk,
                    ':graded_by' => $adminId
                ]);
                $totalImported++;
            }
        }
    }
}

$arouraPdo->commit();
$duration = round(microtime(true) - $startTime, 2);
echo "✓ Imported {$totalImported} grade records across 109 broadsheets in {$duration} seconds!\n";
echo "✓ Missing students count: " . count($missingStudents) . "\n";
if (!empty($missingStudents)) {
    print_r(array_keys($missingStudents));
}
