<?php
require_once 'config/Database.php';
require_once 'lib/Auth.php';

class BroadsheetController {
    private $conn;

    public function __construct() {
        $db = new Database();
        $this->conn = $db->getConnection();
    }

    private function getSetting($key, $default = "") {
        $stmt = $this->conn->prepare("SELECT setting_value FROM system_settings WHERE setting_key = :k LIMIT 1");
        $stmt->execute([':k' => $key]);
        $val = $stmt->fetchColumn();
        return $val !== false ? $val : $default;
    }

    private function normalizeTerm($raw) {
        if (!$raw) return $this->getSetting('current_term', '3rd Term');
        if ($raw === '1st' || $raw === '1st Term' || $raw === 'FIRST') return '1st Term';
        if ($raw === '2nd' || $raw === '2nd Term' || $raw === 'SECOND') return '2nd Term';
        if ($raw === '3rd' || $raw === '3rd Term' || $raw === 'THIRD') return '3rd Term';
        return $raw;
    }

    private function calculateGradeLetter($score) {
        if ($score === null || $score === '') return null;
        $s = floatval($score);
        if ($s >= 70) return 'A';
        if ($s >= 60) return 'B';
        if ($s >= 50) return 'C';
        if ($s >= 45) return 'D';
        return 'F';
    }

    /**
     * Core data aggregation logic for broadsheet
     */
    private function compileBroadsheetData($classParam, $termParam, $sessionParam) {
        $term = $this->normalizeTerm($termParam);
        $session = !empty($sessionParam) ? $sessionParam : $this->getSetting('academic_session', '2023/2024');

        // Resolve school metadata
        $schoolName = $this->getSetting('school_name', 'DEEPER LIFE HIGH SCHOOL');
        $campus = $this->getSetting('school_campus', 'KADUNA');
        if (empty($campus)) {
            // Extract from school address if available
            $address = $this->getSetting('school_address', 'KADUNA');
            if (stripos($address, 'KADUNA') !== false) $campus = 'KADUNA';
            else $campus = 'CAMPUS';
        }

        // Fetch all classes for options and mapping
        $allClassesStmt = $this->conn->query("SELECT id, name, department FROM classes ORDER BY name ASC");
        $allClasses = $allClassesStmt->fetchAll();

        // Build available combined cohort options (e.g. SSS 1 Science, SSS 2, JSS 1, etc.)
        $cohortGroups = [];
        foreach ($allClasses as $c) {
            $name = trim($c['name']);
            // e.g. "SSS 1 Science Diamond" -> cohort "SSS 1 Science"
            if (preg_match('/^(SSS\s*\d|S\.S\.S\s*\d|JSS\s*\d|J\.S\.S\s*\d|BASIC\s*\d|GRADE\s*\d)\s*(SCIENCE|COMMERCIAL|ARTS|ART)?/i', $name, $matches)) {
                $cohortKey = strtoupper(trim($matches[0]));
                $cohortGroups[$cohortKey][] = $c['id'];
            }
        }

        // Resolve selected class IDs
        $targetClassIds = [];
        $classTitle = "";

        if (strpos($classParam, 'combined:') === 0) {
            $cohortName = substr($classParam, 9);
            $classTitle = strtoupper($cohortName) . " (COMBINED)";
            if (isset($cohortGroups[strtoupper($cohortName)])) {
                $targetClassIds = $cohortGroups[strtoupper($cohortName)];
            } else {
                // Fallback fuzzy search on class names
                foreach ($allClasses as $c) {
                    if (stripos($c['name'], $cohortName) !== false) {
                        $targetClassIds[] = $c['id'];
                    }
                }
            }
        } elseif (!empty($classParam) && is_numeric($classParam)) {
            $cid = intval($classParam);
            $targetClassIds = [$cid];
            foreach ($allClasses as $c) {
                if ($c['id'] == $cid) {
                    $classTitle = strtoupper($c['name']);
                    break;
                }
            }
        } else {
            // Default to first class if none specified
            if (!empty($allClasses)) {
                $targetClassIds = [$allClasses[0]['id']];
                $classTitle = strtoupper($allClasses[0]['name']);
            }
        }

        if (empty($classTitle)) {
            $classTitle = "ALL CLASSES";
        }

        // Determine if senior or junior
        $isSenior = (stripos($classTitle, 'SSS') !== false || stripos($classTitle, 'S.S.S') !== false || stripos($classTitle, 'SENIOR') !== false);
        $levelTitle = $isSenior ? "END OF TERM RESULT FOR SENIOR CLASS" : "END OF TERM RESULT FOR JUNIOR CLASS";

        if (empty($targetClassIds)) {
            return [
                "school" => [
                    "name" => $schoolName,
                    "campus" => $campus,
                    "class_title" => $classTitle,
                    "level_title" => $levelTitle,
                    "term" => $term,
                    "session" => $session,
                    "is_senior" => $isSenior
                ],
                "subjects" => [],
                "students" => [],
                "summary" => [],
                "available_classes" => $allClasses,
                "cohort_options" => array_keys($cohortGroups)
            ];
        }

        // 1. Fetch students who were in the selected class(es) for this term & session
        $inPlaceholders = implode(',', array_fill(0, count($targetClassIds), '?'));
        $studentQuery = "
            SELECT DISTINCT u.id, u.first_name, u.last_name, u.admission_number, u.gender,
                   COALESCE(sch.class_id, g_chk.class_id, u.class_id) as class_id,
                   c.name as class_name
            FROM users u
            LEFT JOIN student_class_history sch ON (u.id = sch.student_id AND sch.academic_session = ? AND sch.academic_term = ?)
            LEFT JOIN (SELECT DISTINCT student_id, class_id FROM grades WHERE academic_session = ? AND academic_term = ? AND class_id IS NOT NULL) g_chk ON u.id = g_chk.student_id
            LEFT JOIN classes c ON COALESCE(sch.class_id, g_chk.class_id, u.class_id) = c.id
            WHERE u.role = 'student'
              AND (
                sch.class_id IN ($inPlaceholders)
                OR (sch.class_id IS NULL AND g_chk.class_id IN ($inPlaceholders))
                OR (sch.class_id IS NULL AND g_chk.class_id IS NULL AND u.class_id IN ($inPlaceholders))
              )
            ORDER BY u.last_name ASC, u.first_name ASC
        ";
        $stuParams = array_merge([$session, $term, $session, $term], $targetClassIds, $targetClassIds, $targetClassIds);
        $stuStmt = $this->conn->prepare($studentQuery);
        $stuStmt->execute($stuParams);
        $students = $stuStmt->fetchAll();

        if (empty($students)) {
            return [
                "school" => [
                    "name" => $schoolName,
                    "campus" => $campus,
                    "class_title" => $classTitle,
                    "level_title" => $levelTitle,
                    "term" => $term,
                    "session" => $session,
                    "is_senior" => $isSenior
                ],
                "subjects" => [],
                "students" => [],
                "summary" => [],
                "available_classes" => $allClasses,
                "cohort_options" => array_keys($cohortGroups)
            ];
        }

        $studentIds = array_column($students, 'id');
        $stuPlaceholders = implode(',', array_fill(0, count($studentIds), '?'));

        // 2. Fetch all subjects/courses taken by these students (either via enrollments or existing grades)
        $courseQuery = "
            SELECT DISTINCT c.id, c.name
            FROM courses c
            WHERE c.id IN (
                SELECT course_id FROM enrollments WHERE student_id IN ($stuPlaceholders)
                UNION
                SELECT course_id FROM grades WHERE student_id IN ($stuPlaceholders) AND academic_term = ? AND academic_session = ?
            )
            ORDER BY c.name ASC
        ";
        $courseParams = array_merge($studentIds, $studentIds, [$term, $session]);
        $cStmt = $this->conn->prepare($courseQuery);
        $cStmt->execute($courseParams);
        $rawCourses = $cStmt->fetchAll();

        // Sort courses to match standard DLHS hierarchy:
        // English Language -> Mathematics -> Agricultural Science -> Animal Husbandry -> Biology -> Catering Craft -> Chemistry -> Civic Education -> Computer Studies -> Data Processing -> Economics -> Food & Nutrition -> French -> Further Mathematics -> Geography -> Physics -> Technical Drawing -> Visual Arts -> AI/Robotics -> LET
        $orderPriority = function($name) {
            $n = strtoupper(trim($name));
            if (stripos($n, 'ENGLISH') !== false) return 1;
            if ($n === 'MATHEMATICS' || $n === 'GENERAL MATHEMATICS') return 2;
            if (stripos($n, 'AGRIC') !== false) return 3;
            if (stripos($n, 'ANIMAL') !== false) return 4;
            if (stripos($n, 'BIOLOGY') !== false) return 5;
            if (stripos($n, 'CATERING') !== false) return 6;
            if (stripos($n, 'CHEMISTRY') !== false) return 7;
            if (stripos($n, 'CIVIC') !== false) return 8;
            if (stripos($n, 'COMPUTER') !== false) return 9;
            if (stripos($n, 'DATA') !== false) return 10;
            if (stripos($n, 'ECONOMICS') !== false) return 11;
            if (stripos($n, 'FOOD') !== false) return 12;
            if (stripos($n, 'FRENCH') !== false) return 13;
            if (stripos($n, 'FURTHER MATH') !== false) return 14;
            if (stripos($n, 'GEOGRAPHY') !== false) return 15;
            if (stripos($n, 'PHYSICS') !== false) return 16;
            if (stripos($n, 'TECHNICAL') !== false) return 17;
            if (stripos($n, 'VISUAL') !== false) return 18;
            if (stripos($n, 'AI') !== false || stripos($n, 'ROBOTICS') !== false) return 19;
            if ($n === 'LET' || stripos($n, 'ENTREPRENEUR') !== false || stripos($n, 'LEADERSHIP') !== false) return 99;
            return 50;
        };

        usort($rawCourses, function($a, $b) use ($orderPriority) {
            $pA = $orderPriority($a['name']);
            $pB = $orderPriority($b['name']);
            if ($pA !== $pB) return $pA - $pB;
            return strcasecmp($a['name'], $b['name']);
        });

        $subjects = [];
        $subIndex = 1;
        foreach ($rawCourses as $rc) {
            $subjects[] = [
                'id' => intval($rc['id']),
                'name' => strtoupper(trim($rc['name'])),
                'index' => $subIndex++
            ];
        }

        // 3. Fetch all grades for these students
        $gradesQuery = "
            SELECT student_id, course_id, score, ca1, ca2, exam
            FROM grades
            WHERE student_id IN ($stuPlaceholders)
              AND academic_term = ?
              AND academic_session = ?
        ";
        $gParams = array_merge($studentIds, [$term, $session]);
        $gStmt = $this->conn->prepare($gradesQuery);
        $gStmt->execute($gParams);
        $gradesList = $gStmt->fetchAll();

        // Index grades by [student_id][course_id]
        $studentScores = [];
        foreach ($gradesList as $g) {
            $sid = intval($g['student_id']);
            $cid = intval($g['course_id']);
            $scoreVal = $g['score'] !== null ? floatval($g['score']) : null;
            $studentScores[$sid][$cid] = $scoreVal;
        }

        // 4. Calculate student averages, letter grade tallies, and prepare student rows
        $compiledStudents = [];
        foreach ($students as $stu) {
            $sid = intval($stu['id']);
            $scoresMap = [];
            $totalScore = 0;
            $offeredCount = 0;
            $gradeCounts = ['A' => 0, 'B' => 0, 'C' => 0, 'D' => 0, 'F' => 0];

            foreach ($subjects as $sub) {
                $cid = $sub['id'];
                if (isset($studentScores[$sid][$cid]) && $studentScores[$sid][$cid] !== null) {
                    $sc = $studentScores[$sid][$cid];
                    $scoresMap[$cid] = $sc;
                    $totalScore += $sc;
                    $offeredCount++;

                    $letter = $this->calculateGradeLetter($sc);
                    if ($letter && isset($gradeCounts[$letter])) {
                        $gradeCounts[$letter]++;
                    }
                } else {
                    $scoresMap[$cid] = null;
                }
            }

            $average = $offeredCount > 0 ? round($totalScore / $offeredCount, 2) : 0.00;

            $fullName = strtoupper(trim($stu['last_name'] . ' ' . $stu['first_name']));

            $compiledStudents[] = [
                'id' => $sid,
                'name' => $fullName,
                'admission_number' => $stu['admission_number'] ?: "STU-" . $sid,
                'class_name' => $stu['class_name'] ?: "",
                'scores' => $scoresMap,
                'average' => $average,
                'offered_count' => $offeredCount,
                'grades' => $gradeCounts
            ];
        }

        // 5. Sort students strictly descending by AVERAGE (Rank / Position)
        usort($compiledStudents, function($a, $b) {
            if ($a['average'] == $b['average']) {
                return strcasecmp($a['name'], $b['name']);
            }
            return ($a['average'] > $b['average']) ? -1 : 1;
        });

        // Assign S/NO (1, 2, 3...)
        for ($i = 0; $i < count($compiledStudents); $i++) {
            $compiledStudents[$i]['s_no'] = $i + 1;
        }

        // 6. Calculate subject bottom statistics
        $subjectSummary = [];
        foreach ($subjects as $sub) {
            $cid = $sub['id'];
            $stCount = 0;
            $aCount = 0;
            $bCount = 0;
            $cCount = 0;
            $dCount = 0;
            $fCount = 0;

            foreach ($compiledStudents as $stu) {
                $sc = $stu['scores'][$cid] ?? null;
                if ($sc !== null) {
                    $stCount++;
                    $let = $this->calculateGradeLetter($sc);
                    if ($let === 'A') $aCount++;
                    elseif ($let === 'B') $bCount++;
                    elseif ($let === 'C') $cCount++;
                    elseif ($let === 'D') $dCount++;
                    elseif ($let === 'F') $fCount++;
                }
            }

            $passCount = $aCount + $bCount + $cCount;
            $passPct = $stCount > 0 ? round(($passCount / $stCount) * 100) : 0;

            $subjectSummary[$cid] = [
                'subject_id' => $cid,
                'subject_name' => $sub['name'],
                'student_count' => $stCount,
                'a_count' => $aCount,
                'b_count' => $bCount,
                'c_count' => $cCount,
                'd_count' => $dCount,
                'f_count' => $fCount,
                'pass_count' => $passCount,
                'pass_percentage' => $passPct
            ];
        }

        return [
            "school" => [
                "name" => $schoolName,
                "campus" => $campus,
                "class_title" => $classTitle,
                "level_title" => $levelTitle,
                "term" => $term,
                "session" => $session,
                "is_senior" => $isSenior
            ],
            "subjects" => $subjects,
            "students" => $compiledStudents,
            "summary" => $subjectSummary,
            "available_classes" => $allClasses,
            "cohort_options" => array_keys($cohortGroups)
        ];
    }

    /**
     * API: Get JSON broadsheet data (Admin Only)
     */
    public function getBroadsheetData() {
        Auth::requireRole(['admin']);

        $classParam = $_GET['class_id'] ?? '';
        $termParam = $_GET['term'] ?? '';
        $sessionParam = $_GET['session'] ?? '';

        $data = $this->compileBroadsheetData($classParam, $termParam, $sessionParam);
        echo json_encode(array_merge(["success" => true], $data));
    }

    /**
     * Printable landscape HTML broadsheet view (Admin Only)
     */
    public function printBroadsheet() {
        header('Content-Type: text/html; charset=UTF-8');
        Auth::requireRole(['admin']);

        $classParam = $_GET['class_id'] ?? '';
        $termParam = $_GET['term'] ?? '';
        $sessionParam = $_GET['session'] ?? '';

        $data = $this->compileBroadsheetData($classParam, $termParam, $sessionParam);

        $school = $data['school'];
        $subjects = $data['subjects'];
        $students = $data['students'];
        $summary = $data['summary'];

        ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Broadsheet - <?= htmlspecialchars($school['class_title']) ?> (<?= htmlspecialchars($school['term']) ?> <?= htmlspecialchars($school['session']) ?>)</title>
    <style>
        @page {
            size: landscape;
            margin: 6mm 6mm 6mm 6mm;
        }
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 8px;
            background: #fff;
            color: #000;
            font-size: 11px;
        }
        .action-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 16px;
            background: #1e293b;
            color: #fff;
            border-radius: 8px;
            margin-bottom: 12px;
            font-family: sans-serif;
        }
        .action-bar button {
            background: #0284c7;
            color: #fff;
            border: none;
            padding: 8px 16px;
            font-size: 12px;
            font-weight: bold;
            border-radius: 6px;
            cursor: pointer;
            margin-left: 8px;
        }
        .action-bar button:hover {
            background: #0369a1;
        }
        @media print {
            .action-bar { display: none !important; }
            body { padding: 0 !important; }
        }
        .header-container {
            text-align: center;
            margin-bottom: 6px;
        }
        .school-title {
            font-size: 20px;
            font-weight: 900;
            letter-spacing: 0.5px;
            margin: 0;
            text-transform: uppercase;
        }
        .sub-title {
            font-size: 13px;
            font-weight: bold;
            margin: 2px 0 6px 0;
            letter-spacing: 0.3px;
        }
        .meta-strip {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            font-weight: bold;
            padding: 4px 10px;
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            margin-bottom: 4px;
        }
        .meta-strip span {
            display: inline-block;
        }

        /* Main Table */
        table.broadsheet-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            border: 2px solid #000;
        }
        table.broadsheet-table th, 
        table.broadsheet-table td {
            border: 1px solid #000;
            padding: 2px 3px;
            text-align: center;
            font-size: 9.5px;
            line-height: 1.15;
            height: 18px;
            vertical-align: middle;
        }
        .col-sno {
            width: 26px;
            font-weight: bold;
        }
        .col-name {
            width: 180px;
            text-align: left !important;
            padding-left: 5px !important;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-weight: 600;
        }
        .col-sub {
            width: 25px;
        }
        .col-avg {
            width: 44px;
            font-weight: bold;
        }
        .col-grade {
            width: 17px;
            font-weight: bold;
        }

        /* Numbered header row */
        tr.index-row th {
            height: 16px;
            font-size: 9px;
            background: #f8fafc;
        }

        /* Vertical rotated subject header */
        .vertical-header {
            height: 125px;
            position: relative;
            vertical-align: bottom !important;
            padding-bottom: 6px !important;
        }
        .vertical-text {
            writing-mode: vertical-rl;
            transform: rotate(180deg);
            white-space: nowrap;
            display: inline-block;
            text-align: left;
            font-size: 9px;
            font-weight: bold;
            letter-spacing: 0.3px;
            max-height: 115px;
        }

        /* Alternating row styling */
        tr.student-row:nth-child(even) {
            background-color: #fdfdfd;
        }
        .score-val {
            font-weight: 500;
        }
        .empty-val {
            color: #bbb;
        }

        /* Summary section */
        tr.summary-header-row th {
            background: #f1f5f9;
            font-weight: bold;
            font-size: 9px;
            height: 20px;
        }
        tr.summary-row td {
            font-size: 9px;
            height: 17px;
        }
        tr.summary-row td.label-cell {
            text-align: left !important;
            padding-left: 5px !important;
            font-weight: bold;
        }
        .bold-cell {
            font-weight: bold;
        }
        .pass-pct {
            font-weight: 900;
            background: #f8fafc;
        }
    </style>
</head>
<body>

    <div class="action-bar">
        <div>
            <strong>DLHS Broadsheet Generator</strong> — <?= htmlspecialchars($school['class_title']) ?> (<?= htmlspecialchars($school['term']) ?>, <?= htmlspecialchars($school['session']) ?>)
        </div>
        <div>
            <button onclick="window.print()">🖨️ Print / Save as PDF</button>
            <button onclick="window.location.href='/api/admin/broadsheet/export?<?= http_build_query($_GET) ?>'">📥 Export to CSV</button>
            <button style="background:#475569" onclick="window.close()">✕ Close</button>
        </div>
    </div>

    <div class="header-container">
        <h1 class="school-title"><?= htmlspecialchars($school['name']) ?></h1>
        <div class="sub-title"><?= htmlspecialchars($school['level_title']) ?></div>
        <div class="meta-strip">
            <span>CLASS: <?= htmlspecialchars($school['class_title']) ?></span>
            <span>TERM: <?= htmlspecialchars(strtoupper(str_replace(' Term', '', $school['term']))) ?></span>
            <span>SESSION: <?= htmlspecialchars($school['session']) ?></span>
            <span>CAMPUS: <?= htmlspecialchars($school['campus']) ?></span>
        </div>
    </div>

    <table class="broadsheet-table">
        <thead>
            <!-- Index Row (1, 2, 3...) -->
            <tr class="index-row">
                <th class="col-sno"></th>
                <th class="col-name"></th>
                <?php foreach ($subjects as $sub): ?>
                    <th class="col-sub"><?= $sub['index'] ?></th>
                <?php endforeach; ?>
                <th class="col-avg"></th>
                <th class="col-grade" colspan="5"></th>
            </tr>
            <!-- Subject names (vertical headers) -->
            <tr>
                <th class="col-sno" style="vertical-align: bottom;">S/<br>NO</th>
                <th class="col-name" style="vertical-align: bottom;">NAME OF STUDENT</th>
                <?php foreach ($subjects as $sub): ?>
                    <th class="col-sub vertical-header">
                        <span class="vertical-text"><?= htmlspecialchars($sub['name']) ?></span>
                    </th>
                <?php endforeach; ?>
                <th class="col-avg vertical-header">
                    <span class="vertical-text">AVERAGE</span>
                </th>
                <th class="col-grade" style="vertical-align: bottom;">A</th>
                <th class="col-grade" style="vertical-align: bottom;">B</th>
                <th class="col-grade" style="vertical-align: bottom;">C</th>
                <th class="col-grade" style="vertical-align: bottom;">D</th>
                <th class="col-grade" style="vertical-align: bottom;">F</th>
            </tr>
        </thead>
        <tbody>
            <?php if (empty($students)): ?>
                <tr>
                    <td colspan="<?= 3 + count($subjects) + 5 ?>" style="padding: 24px; text-align:center; color:#64748b;">
                        No student results found for this class and term.
                    </td>
                </tr>
            <?php else: ?>
                <?php foreach ($students as $stu): ?>
                    <tr class="student-row">
                        <td class="col-sno"><?= $stu['s_no'] ?></td>
                        <td class="col-name" title="<?= htmlspecialchars($stu['name']) ?>"><?= htmlspecialchars($stu['name']) ?></td>
                        <?php foreach ($subjects as $sub): ?>
                            <?php $sc = $stu['scores'][$sub['id']] ?? null; ?>
                            <td class="col-sub score-val">
                                <?= $sc !== null ? (floatval($sc) == intval($sc) ? intval($sc) : number_format($sc, 2)) : '' ?>
                            </td>
                        <?php endforeach; ?>
                        <td class="col-avg"><?= number_format($stu['average'], 2) ?></td>
                        <td class="col-grade"><?= $stu['grades']['A'] ?></td>
                        <td class="col-grade"><?= $stu['grades']['B'] ?></td>
                        <td class="col-grade"><?= $stu['grades']['C'] ?></td>
                        <td class="col-grade"><?= $stu['grades']['D'] ?></td>
                        <td class="col-grade"><?= $stu['grades']['F'] ?></td>
                    </tr>
                <?php endforeach; ?>

                <!-- Blank spacer row before summary -->
                <tr>
                    <td colspan="<?= 3 + count($subjects) + 5 ?>" style="height: 10px; background: #e2e8f0; border-left:none; border-right:none;"></td>
                </tr>

                <!-- Subject Statistics Summary -->
                <tr class="summary-row">
                    <td class="label-cell bold-cell" colspan="2">No of Students</td>
                    <?php foreach ($subjects as $sub): ?>
                        <td class="bold-cell"><?= $summary[$sub['id']]['student_count'] ?? 0 ?></td>
                    <?php endforeach; ?>
                    <td colspan="6" style="background:#f8fafc;"></td>
                </tr>
                <tr class="summary-row">
                    <td class="label-cell" colspan="2">No of A's</td>
                    <?php foreach ($subjects as $sub): ?>
                        <td><?= $summary[$sub['id']]['a_count'] ?? 0 ?></td>
                    <?php endforeach; ?>
                    <td colspan="6" style="background:#f8fafc;"></td>
                </tr>
                <tr class="summary-row">
                    <td class="label-cell" colspan="2">No of B's</td>
                    <?php foreach ($subjects as $sub): ?>
                        <td><?= $summary[$sub['id']]['b_count'] ?? 0 ?></td>
                    <?php endforeach; ?>
                    <td colspan="6" style="background:#f8fafc;"></td>
                </tr>
                <tr class="summary-row">
                    <td class="label-cell" colspan="2">No of C's</td>
                    <?php foreach ($subjects as $sub): ?>
                        <td><?= $summary[$sub['id']]['c_count'] ?? 0 ?></td>
                    <?php endforeach; ?>
                    <td colspan="6" style="background:#f8fafc;"></td>
                </tr>
                <tr class="summary-row">
                    <td class="label-cell" colspan="2">No of D's</td>
                    <?php foreach ($subjects as $sub): ?>
                        <td><?= $summary[$sub['id']]['d_count'] ?? 0 ?></td>
                    <?php endforeach; ?>
                    <td colspan="6" style="background:#f8fafc;"></td>
                </tr>
                <tr class="summary-row">
                    <td class="label-cell" colspan="2">No of F's</td>
                    <?php foreach ($subjects as $sub): ?>
                        <td><?= $summary[$sub['id']]['f_count'] ?? 0 ?></td>
                    <?php endforeach; ?>
                    <td colspan="6" style="background:#f8fafc;"></td>
                </tr>
                <tr class="summary-row">
                    <td class="label-cell bold-cell" colspan="2">No of Pass</td>
                    <?php foreach ($subjects as $sub): ?>
                        <td class="bold-cell"><?= $summary[$sub['id']]['pass_count'] ?? 0 ?></td>
                    <?php endforeach; ?>
                    <td colspan="6" style="background:#f8fafc;"></td>
                </tr>
                <tr class="summary-row">
                    <td class="label-cell bold-cell" colspan="2">% pass</td>
                    <?php foreach ($subjects as $sub): ?>
                        <td class="pass-pct"><?= ($summary[$sub['id']]['pass_percentage'] ?? 0) ?>%</td>
                    <?php endforeach; ?>
                    <td colspan="6" style="background:#f8fafc;"></td>
                </tr>
            <?php endif; ?>
        </tbody>
    </table>

</body>
</html>
        <?php
    }

    /**
     * CSV Export (Admin Only)
     */
    public function exportCsv() {
        Auth::requireRole(['admin']);

        $classParam = $_GET['class_id'] ?? '';
        $termParam = $_GET['term'] ?? '';
        $sessionParam = $_GET['session'] ?? '';

        $data = $this->compileBroadsheetData($classParam, $termParam, $sessionParam);

        $school = $data['school'];
        $subjects = $data['subjects'];
        $students = $data['students'];
        $summary = $data['summary'];

        $filename = "Broadsheet_" . preg_replace('/[^a-zA-Z0-9_\-]/', '_', $school['class_title']) . "_" . preg_replace('/[^a-zA-Z0-9]/', '', $school['term']) . ".csv";

        header('Content-Type: text/csv; charset=UTF-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Pragma: no-cache');
        header('Expires: 0');

        $out = fopen('php://output', 'w');
        // UTF-8 BOM for Excel compatibility
        fprintf($out, chr(0xEF).chr(0xBB).chr(0xBF));

        // School & Class Metadata
        fputcsv($out, [$school['name']]);
        fputcsv($out, [$school['level_title']]);
        fputcsv($out, ["CLASS: " . $school['class_title'], "TERM: " . $school['term'], "SESSION: " . $school['session'], "CAMPUS: " . $school['campus']]);
        fputcsv($out, []); // blank line

        // Table Header
        $header = ['S/NO', 'NAME OF STUDENT'];
        foreach ($subjects as $sub) {
            $header[] = $sub['name'];
        }
        $header[] = 'AVERAGE';
        $header[] = 'A';
        $header[] = 'B';
        $header[] = 'C';
        $header[] = 'D';
        $header[] = 'F';
        fputcsv($out, $header);

        // Student Rows
        foreach ($students as $stu) {
            $row = [$stu['s_no'], $stu['name']];
            foreach ($subjects as $sub) {
                $sc = $stu['scores'][$sub['id']] ?? '';
                $row[] = $sc !== null && $sc !== '' ? (floatval($sc) == intval($sc) ? intval($sc) : number_format($sc, 2)) : '';
            }
            $row[] = number_format($stu['average'], 2);
            $row[] = $stu['grades']['A'];
            $row[] = $stu['grades']['B'];
            $row[] = $stu['grades']['C'];
            $row[] = $stu['grades']['D'];
            $row[] = $stu['grades']['F'];
            fputcsv($out, $row);
        }

        // Summary Rows
        fputcsv($out, []); // blank line
        fputcsv($out, ['SUBJECT PERFORMANCE SUMMARY']);

        // No of Students
        $stRow = ['No of Students', ''];
        foreach ($subjects as $sub) { $stRow[] = $summary[$sub['id']]['student_count'] ?? 0; }
        fputcsv($out, $stRow);

        // No of A's
        $aRow = ["No of A's", ''];
        foreach ($subjects as $sub) { $aRow[] = $summary[$sub['id']]['a_count'] ?? 0; }
        fputcsv($out, $aRow);

        // No of B's
        $bRow = ["No of B's", ''];
        foreach ($subjects as $sub) { $bRow[] = $summary[$sub['id']]['b_count'] ?? 0; }
        fputcsv($out, $bRow);

        // No of C's
        $cRow = ["No of C's", ''];
        foreach ($subjects as $sub) { $cRow[] = $summary[$sub['id']]['c_count'] ?? 0; }
        fputcsv($out, $cRow);

        // No of D's
        $dRow = ["No of D's", ''];
        foreach ($subjects as $sub) { $dRow[] = $summary[$sub['id']]['d_count'] ?? 0; }
        fputcsv($out, $dRow);

        // No of F's
        $fRow = ["No of F's", ''];
        foreach ($subjects as $sub) { $fRow[] = $summary[$sub['id']]['f_count'] ?? 0; }
        fputcsv($out, $fRow);

        // No of Pass
        $pRow = ['No of Pass', ''];
        foreach ($subjects as $sub) { $pRow[] = $summary[$sub['id']]['pass_count'] ?? 0; }
        fputcsv($out, $pRow);

        // % pass
        $pctRow = ['% pass', ''];
        foreach ($subjects as $sub) { $pctRow[] = ($summary[$sub['id']]['pass_percentage'] ?? 0) . '%'; }
        fputcsv($out, $pctRow);

        fclose($out);
        exit;
    }
}
