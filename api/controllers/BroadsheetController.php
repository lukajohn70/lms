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
        if (stripos($raw, 'CUMULATIVE') !== false || stripos($raw, 'ANNUAL') !== false) return 'Cumulative';
        if ($raw === '1st' || $raw === '1st Term' || $raw === 'FIRST') return '1st Term';
        if ($raw === '2nd' || $raw === '2nd Term' || $raw === 'SECOND') return '2nd Term';
        if ($raw === '3rd' || $raw === '3rd Term' || $raw === 'THIRD') return '3rd Term';
        return $raw;
    }

    private function calculateGradeLetter($score, $isJunior = false) {
        if ($score === null || $score === '') return null;
        $s = floatval($score);

        if ($isJunior) {
            $gA = intval($this->getSetting('grade_junior_A_min', 70));
            $gB = intval($this->getSetting('grade_junior_B_min', 60));
            $gC = intval($this->getSetting('grade_junior_C_min', 50));
            $gD = intval($this->getSetting('grade_junior_D_min', 45));
        } else {
            $gA = intval($this->getSetting('grade_A_min', 80));
            $gB = intval($this->getSetting('grade_B_min', 70));
            $gC = intval($this->getSetting('grade_C_min', 60));
            $gD = intval($this->getSetting('grade_D_min', 50));
        }

        if ($s >= $gA) return 'A';
        if ($s >= $gB) return 'B';
        if ($s >= $gC) return 'C';
        if ($s >= $gD) return 'D';
        return 'F';
    }

    public function getShortSubjectName($name) {
        $trimmed = trim($name);
        $upper = strtoupper($trimmed);

        // 1. Explicit canonical short forms for school broadsheets
        $map = [
            "LEADERSHIP & ENTREPRENEURSHIP TRAINING (L.E.T.)" => "L.E.T.",
            "LEADERSHIP AND ENTREPRENEURSHIP TRAINING (L.E.T.)" => "L.E.T.",
            "LEADERSHIP & ENTREPRENEURSHIP TRAINING" => "L.E.T.",
            "LEADERSHIP AND ENTREPRENEURSHIP TRAINING" => "L.E.T.",
            "PHYSICAL AND HEALTH EDUCATION (P.H.E.)" => "P.H.E.",
            "PHYSICAL & HEALTH EDUCATION (P.H.E.)" => "P.H.E.",
            "PHYSICAL AND HEALTH EDUCATION" => "P.H.E.",
            "PHYSICAL & HEALTH EDUCATION" => "P.H.E.",
            "CULTURAL AND CREATIVE ART (C.C.A.)" => "C.C.A.",
            "CULTURAL & CREATIVE ART (C.C.A.)" => "C.C.A.",
            "CULTURAL AND CREATIVE ART" => "C.C.A.",
            "CULTURAL & CREATIVE ARTS" => "C.C.A.",
            "CULTURAL AND CREATIVE ARTS" => "C.C.A.",
            "CHRISTIAN RELIGIOUS STUDIES" => "C.R.S.",
            "CHRISTIAN RELIGIOUS KNOWLEDGE" => "C.R.K.",
            "ISLAMIC RELIGIOUS STUDIES" => "I.R.S.",
            "ISLAMIC RELIGIOUS KNOWLEDGE" => "I.R.K.",
            "ROBOTICS AND ARTIFICIAL INTELLIGENCE" => "ROBOTICS & A.I.",
            "ROBOTICS & ARTIFICIAL INTELLIGENCE" => "ROBOTICS & A.I.",
            "ROBOTICS AND A.I." => "ROBOTICS & A.I.",
            "ROBOTICS & A.I." => "ROBOTICS & A.I.",
            "AGRICULTURAL SCIENCE" => "AGRIC SCIENCE",
            "INFORMATION & COMMUNICATION TECHNOLOGY" => "I.C.T.",
            "INFORMATION AND COMMUNICATION TECHNOLOGY" => "I.C.T.",
            "COMPUTER HARDWARE AND GSM REPAIRS" => "HARDWARE & GSM",
            "FASHION DESIGN AND GARMENT MAKING" => "GARMENT MAKING",
            "SOLAR PHOTOVOLTAIC INSTALLATION AND MAINTENANCE" => "SOLAR PHOTOVOLTAIC",
            "CITIZENSHIP AND HERITAGE STUDIES" => "HERITAGE STUDIES",
            "SOCIAL AND CITIZENSHIP STUDIES" => "CITIZENSHIP STUDIES",
            "HORTICULTURE AND CROP PRODUCTION" => "CROP PRODUCTION",
            "CATERING CRAFT PRACTICE" => "CATERING CRAFT",
            "LITERATURE IN ENGLISH" => "LIT. IN ENGLISH",
            "FINANCIAL ACCOUNTING" => "FIN. ACCOUNTING",
            "FOOD AND NUTRITION" => "FOOD & NUTRITION",
            "FOOD & NUTRITION" => "FOOD & NUTRITION",
            "TECHNICAL DRAWING" => "TECH. DRAWING",
            "FURTHER MATHEMATICS" => "FURTHER MATHS",
            "ENTRANCE EXAMINATION" => "ENTRANCE EXAM",
            "INTERMEDIATE SCIENCE" => "INTERMED. SCIENCE"
        ];

        if (isset($map[$upper])) {
            return $map[$upper];
        }

        // 2. If subject contains an acronym in brackets/parentheses, extract it
        if (preg_match('/\(([A-Z\.\s]{2,8})\)/i', $trimmed, $m)) {
            return strtoupper(trim($m[1]));
        }

        // 3. Keep short/medium names as is (up to 16 chars)
        if (strlen($upper) <= 16) {
            return $upper;
        }

        // 4. For longer names, apply standard educational abbreviations
        $replacements = [
            '/\bAND\b/i' => '&',
            '/\bMATHEMATICS\b/i' => 'MATHS',
            '/\bEDUCATION\b/i' => 'EDU',
            '/\bTECHNOLOGY\b/i' => 'TECH',
            '/\bLANGUAGE\b/i' => 'LANG'
        ];
        $short = preg_replace(array_keys($replacements), array_values($replacements), $upper);
        return trim($short);
    }

    /**
     * Core data aggregation logic for broadsheet
     */
    public function compileBroadsheetData($classParam, $termParam, $sessionParam) {
        $term = $this->normalizeTerm($termParam);
        $session = !empty($sessionParam) ? $sessionParam : $this->getSetting('academic_session', '2026/2027');
        $isCumulative = ($term === 'Cumulative' || (isset($_GET['cumulative']) && ($_GET['cumulative'] === '1' || $_GET['cumulative'] === 'true' || $_GET['cumulative'] === 'yes')));
        if ($isCumulative) {
            $term = 'Cumulative';
        }

        // Resolve school metadata
        $schoolName = $this->getSetting('school_name', 'DEEPER LIFE HIGH SCHOOL');
        $campus = $this->getSetting('school_campus', 'KADUNA');
        if (empty($campus)) {
            // Extract from school address if available
            $address = $this->getSetting('school_address', 'KADUNA');
            if (stripos($address, 'KADUNA') !== false) $campus = 'KADUNA';
            else $campus = 'CAMPUS';
        }

        // School logo resolution
        $logoPath = $this->getSetting('school_logo_path', 'uploads/logos/dlhs_logo.webp');
        $isHttps  = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);
        $proto    = $isHttps ? 'https://' : 'http://';
        $scriptDir = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/api'), '/\\');
        $apiBase  = $proto . ($_SERVER['HTTP_HOST'] ?? 'localhost') . ($scriptDir ?: '/api');
        $logoUrl  = $logoPath ? "$apiBase/$logoPath" : '';

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
        $isSenior = (
            stripos($classTitle, 'SSS') !== false ||
            stripos($classTitle, 'S.S.S') !== false ||
            stripos($classTitle, 'SENIOR') !== false ||
            stripos($classTitle, 'SS ') !== false ||
            stripos($classTitle, 'SS1') !== false ||
            stripos($classTitle, 'SS2') !== false ||
            stripos($classTitle, 'SS3') !== false
        );
        $isJunior = !$isSenior;
        if ($isCumulative) {
            $levelTitle = $isSenior ? "ANNUAL CUMULATIVE RESULT FOR SENIOR CLASS" : "ANNUAL CUMULATIVE RESULT FOR JUNIOR CLASS";
        } else {
            $levelTitle = $isSenior ? "END OF TERM RESULT FOR SENIOR CLASS" : "END OF TERM RESULT FOR JUNIOR CLASS";
        }

        if (empty($targetClassIds)) {
            return [
                "school" => [
                    "name" => $schoolName,
                    "campus" => $campus,
                    "class_title" => $classTitle,
                    "level_title" => $levelTitle,
                    "term" => $term,
                    "session" => $session,
                    "is_senior" => $isSenior,
                    "is_cumulative" => $isCumulative,
                    "logo_url" => $logoUrl
                ],
                "subjects" => [],
                "students" => [],
                "summary" => [],
                "available_classes" => $allClasses,
                "cohort_options" => array_keys($cohortGroups)
            ];
        }

        // 1. Fetch students who were in the selected class(es) for this term & session
        $inClassPlaceholders = implode(',', array_fill(0, count($targetClassIds), '?'));
        
        if ($isCumulative) {
            // Priority 1: Check grades table for students graded in this class & session across any term
            $studentQuery = "
                SELECT DISTINCT u.id, u.first_name, u.last_name, u.admission_number, u.gender,
                       g.class_id, c.name as class_name
                FROM grades g
                JOIN users u ON g.student_id = u.id
                JOIN classes c ON g.class_id = c.id
                WHERE g.class_id IN ($inClassPlaceholders)
                  AND g.academic_session = ?
                  AND u.role = 'student'
                ORDER BY u.last_name ASC, u.first_name ASC
            ";
            $stuParams = array_merge($targetClassIds, [$session]);
            $stuStmt = $this->conn->prepare($studentQuery);
            $stuStmt->execute($stuParams);
            $students = $stuStmt->fetchAll();

            // Priority 2: If no grades recorded, check authentic student_class_history for this session
            if (empty($students)) {
                $histQuery = "
                    SELECT DISTINCT u.id, u.first_name, u.last_name, u.admission_number, u.gender,
                           sch.class_id, c.name as class_name
                    FROM student_class_history sch
                    JOIN users u ON sch.student_id = u.id
                    JOIN classes c ON sch.class_id = c.id
                    WHERE sch.class_id IN ($inClassPlaceholders)
                      AND sch.academic_session = ?
                      AND u.role = 'student'
                    ORDER BY u.last_name ASC, u.first_name ASC
                ";
                $histStmt = $this->conn->prepare($histQuery);
                $histStmt->execute(array_merge($targetClassIds, [$session]));
                $students = $histStmt->fetchAll();
            }
        } else {
            // Priority 1: Check grades table for students graded in this class, session, and term
            $studentQuery = "
                SELECT DISTINCT u.id, u.first_name, u.last_name, u.admission_number, u.gender,
                       g.class_id, c.name as class_name
                FROM grades g
                JOIN users u ON g.student_id = u.id
                JOIN classes c ON g.class_id = c.id
                WHERE g.class_id IN ($inClassPlaceholders)
                  AND g.academic_session = ?
                  AND g.academic_term = ?
                  AND u.role = 'student'
                ORDER BY u.last_name ASC, u.first_name ASC
            ";
            $stuParams = array_merge($targetClassIds, [$session, $term]);
            $stuStmt = $this->conn->prepare($studentQuery);
            $stuStmt->execute($stuParams);
            $students = $stuStmt->fetchAll();

            // Priority 2: If no grades recorded, check authentic student_class_history
            if (empty($students)) {
                $histQuery = "
                    SELECT DISTINCT u.id, u.first_name, u.last_name, u.admission_number, u.gender,
                           sch.class_id, c.name as class_name
                    FROM student_class_history sch
                    JOIN users u ON sch.student_id = u.id
                    JOIN classes c ON sch.class_id = c.id
                    WHERE sch.class_id IN ($inClassPlaceholders)
                      AND sch.academic_session = ?
                      AND sch.academic_term = ?
                      AND u.role = 'student'
                    ORDER BY u.last_name ASC, u.first_name ASC
                ";
                $histStmt = $this->conn->prepare($histQuery);
                $histStmt->execute(array_merge($targetClassIds, [$session, $term]));
                $students = $histStmt->fetchAll();
            }
        }

        // Priority 3: Only if active current session and no grades/history exist yet, fall back to current users.class_id
        $currentSession = $this->getSetting('academic_session', '2026/2027');
        if (empty($students) && $session === $currentSession) {
            $currQuery = "
                SELECT u.id, u.first_name, u.last_name, u.admission_number, u.gender,
                       u.class_id, c.name as class_name
                FROM users u
                JOIN classes c ON u.class_id = c.id
                WHERE u.class_id IN ($inClassPlaceholders)
                  AND u.role = 'student'
                ORDER BY u.last_name ASC, u.first_name ASC
            ";
            $currStmt = $this->conn->prepare($currQuery);
            $currStmt->execute($targetClassIds);
            $students = $currStmt->fetchAll();
        }

        if (empty($students)) {
            return [
                "school" => [
                    "name" => $schoolName,
                    "campus" => $campus,
                    "class_title" => $classTitle,
                    "level_title" => $levelTitle,
                    "term" => $term,
                    "session" => $session,
                    "is_senior" => $isSenior,
                    "is_cumulative" => $isCumulative,
                    "logo_url" => $logoUrl
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

        // Subjects strictly unique to JSS (must never appear in SS)
        $jssOnlyCourseIds = [40, 41, 42, 24, 50, 55, 33, 154, 23]; // Basic Sci, Basic Tech, Bus Studies, CCA, Home Ec, Social Studies, PHE, Music, Hausa
        // Subjects strictly unique to SS (must never appear in JSS)
        $ssOnlyCourseIds  = [181, 182, 183, 26, 193, 188, 186, 185, 190, 144, 114, 191, 12, 108, 32, 122, 198, 197]; // Bio, Chem, Phys, FMath, Econ, Geog, Govt, Lit, Comm, FinAcct, DataProc, TechDraw, VisArt, AnimHusb, CatCraft, FoodNut, Garment, SolarPV

        // 2. Fetch all subjects/courses taken by these students scoped strictly to the selected class(es), term & session
        // Only include subjects that have actual recorded scores (> 0) in this class and session/term
        if ($isCumulative) {
            $courseQuery = "
                SELECT c.id, c.name
                FROM courses c
                JOIN grades g ON c.id = g.course_id
                WHERE g.class_id IN ($inClassPlaceholders)
                  AND g.academic_session = ?
                GROUP BY c.id, c.name
                HAVING (MAX(COALESCE(g.score, 0)) > 0 
                     OR MAX(COALESCE(g.ca1, 0)) > 0 
                     OR MAX(COALESCE(g.ca2, 0)) > 0 
                     OR MAX(COALESCE(g.exam, 0)) > 0)
                ORDER BY c.name ASC
            ";
            $cStmt = $this->conn->prepare($courseQuery);
            $cStmt->execute(array_merge($targetClassIds, [$session]));
            $rawCourses = $cStmt->fetchAll();
        } else {
            // Priority 1: Courses with recorded positive grades for this class, session, and term
            $courseQuery = "
                SELECT c.id, c.name
                FROM courses c
                JOIN grades g ON c.id = g.course_id
                WHERE g.class_id IN ($inClassPlaceholders)
                  AND g.academic_term = ?
                  AND g.academic_session = ?
                GROUP BY c.id, c.name
                HAVING (MAX(COALESCE(g.score, 0)) > 0 
                     OR MAX(COALESCE(g.ca1, 0)) > 0 
                     OR MAX(COALESCE(g.ca2, 0)) > 0 
                     OR MAX(COALESCE(g.exam, 0)) > 0)
                ORDER BY c.name ASC
            ";
            $cStmt = $this->conn->prepare($courseQuery);
            $cStmt->execute(array_merge($targetClassIds, [$term, $session]));
            $rawCourses = $cStmt->fetchAll();
        }

        // Priority 2: If no grades recorded yet for this term/session, fall back to class_subjects
        if (empty($rawCourses)) {
            $csQuery = "
                SELECT DISTINCT c.id, c.name
                FROM courses c
                JOIN class_subjects cs ON c.id = cs.course_id
                WHERE cs.class_id IN ($inClassPlaceholders)
                ORDER BY c.name ASC
            ";
            $csStmt = $this->conn->prepare($csQuery);
            $csStmt->execute($targetClassIds);
            $rawCourses = $csStmt->fetchAll();
        }

        // Enforce strict educational level boundaries:
        // JSS classes can NEVER contain SS-only subjects.
        // SS classes can NEVER contain JSS-only subjects.
        $rawCourses = array_values(array_filter($rawCourses, function($c) use ($isJunior, $isSenior, $jssOnlyCourseIds, $ssOnlyCourseIds) {
            $cid = intval($c['id']);
            if ($isJunior && in_array($cid, $ssOnlyCourseIds)) {
                return false;
            }
            if ($isSenior && in_array($cid, $jssOnlyCourseIds)) {
                return false;
            }
            return true;
        }));

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
            $fullName = strtoupper(trim($rc['name']));
            $shortName = $this->getShortSubjectName($rc['name']);
            $subjects[] = [
                'id' => intval($rc['id']),
                'name' => $fullName,
                'short_name' => $shortName,
                'index' => $subIndex++
            ];
        }

        // 3. Fetch all grades for these students strictly scoped to these class(es)
        if ($isCumulative) {
            $gradesQuery = "
                SELECT student_id, course_id, academic_term, score, ca1, ca2, exam
                FROM grades
                WHERE student_id IN ($stuPlaceholders)
                  AND class_id IN ($inClassPlaceholders)
                  AND academic_session = ?
                  AND (score IS NOT NULL OR ca1 IS NOT NULL OR ca2 IS NOT NULL OR exam IS NOT NULL)
            ";
            $gParams = array_merge($studentIds, $targetClassIds, [$session]);
            $gStmt = $this->conn->prepare($gradesQuery);
            $gStmt->execute($gParams);
            $gradesList = $gStmt->fetchAll();

            $studentTermScores = [];
            foreach ($gradesList as $g) {
                $sid = intval($g['student_id']);
                $cid = intval($g['course_id']);
                $t = trim($g['academic_term']);

                // Calculate end-of-term total from components if available
                $hasComponents = ($g['ca1'] !== null || $g['ca2'] !== null || $g['exam'] !== null);
                if ($hasComponents) {
                    $comp = floatval($g['ca1'] ?? 0) + floatval($g['ca2'] ?? 0) + floatval($g['exam'] ?? 0);
                    $scoreVal = round(min(100.0, $comp), 2);
                } elseif ($g['score'] !== null && $g['score'] !== '') {
                    $scoreVal = floatval($g['score']);
                } else {
                    $scoreVal = null;
                }

                if ($scoreVal !== null) {
                    $studentTermScores[$sid][$cid][$t] = $scoreVal;
                }
            }

            // Calculate cumulative subject scores (average of available terms)
            $studentScores = [];
            foreach ($studentIds as $sid) {
                foreach ($subjects as $sub) {
                    $cid = $sub['id'];
                    $tScores = $studentTermScores[$sid][$cid] ?? [];
                    if (!empty($tScores)) {
                        $studentScores[$sid][$cid] = round(array_sum($tScores) / count($tScores), 2);
                    } else {
                        $studentScores[$sid][$cid] = null;
                    }
                }
            }
        } else {
            $gradesQuery = "
                SELECT student_id, course_id, score, ca1, ca2, exam
                FROM grades
                WHERE student_id IN ($stuPlaceholders)
                  AND class_id IN ($inClassPlaceholders)
                  AND academic_term = ?
                  AND academic_session = ?
            ";
            $gParams = array_merge($studentIds, $targetClassIds, [$term, $session]);
            $gStmt = $this->conn->prepare($gradesQuery);
            $gStmt->execute($gParams);
            $gradesList = $gStmt->fetchAll();

            // Index grades by [student_id][course_id]
            // Broadsheet subject totals are calculated from the authentic end-of-term continuous assessments (CA1 + CA2 + Exam)
            $studentScores = [];
            foreach ($gradesList as $g) {
                $sid = intval($g['student_id']);
                $cid = intval($g['course_id']);

                $hasComponents = ($g['ca1'] !== null || $g['ca2'] !== null || $g['exam'] !== null);
                if ($hasComponents) {
                    $comp = floatval($g['ca1'] ?? 0) + floatval($g['ca2'] ?? 0) + floatval($g['exam'] ?? 0);
                    $scoreVal = round(min(100.0, $comp), 2);
                } elseif ($g['score'] !== null && $g['score'] !== '') {
                    $scoreVal = floatval($g['score']);
                } else {
                    $scoreVal = null;
                }
                $studentScores[$sid][$cid] = $scoreVal;
            }
        }

        // 4. Calculate student averages, letter grade tallies, and prepare student rows
        $maxClassScore = 0.0;
        foreach ($studentScores as $sidScores) {
            foreach ($sidScores as $scVal) {
                if ($scVal !== null && floatval($scVal) > $maxClassScore) {
                    $maxClassScore = floatval($scVal);
                }
            }
        }
        $isMidtermScale = ($maxClassScore > 0 && $maxClassScore <= 20.0);

        $compiledStudents = [];
        foreach ($students as $stu) {
            $sid = intval($stu['id']);
            $scoresMap = [];
            $totalScore = 0;
            $offeredCount = 0;
            $gradeCounts = ['A' => 0, 'B' => 0, 'C' => 0, 'D' => 0, 'F' => 0];

            foreach ($subjects as $sub) {
                $cid = $sub['id'];
                if (isset($studentScores[$sid][$cid]) && $studentScores[$sid][$cid] !== null && floatval($studentScores[$sid][$cid]) > 0) {
                    $sc = floatval($studentScores[$sid][$cid]);
                    $scoresMap[$cid] = $sc;
                    $totalScore += $sc;
                    $offeredCount++;

                    $evalScore = $isMidtermScale ? round(($sc / 20.0) * 100.0, 2) : $sc;
                    $letter = $this->calculateGradeLetter($evalScore, $isJunior);
                    if ($letter && isset($gradeCounts[$letter])) {
                        $gradeCounts[$letter]++;
                    }
                } else {
                    $scoresMap[$cid] = null;
                }
            }

            $average = $offeredCount > 0 ? round($totalScore / $offeredCount, 2) : 0.00;

            // Determine cumulative decision (Promoted / Promoted on Trial / Repeat)
            $decision = '—';
            if ($isCumulative && $offeredCount > 0) {
                if ($average >= 50.0) {
                    $decision = 'PROMOTED';
                } elseif ($average >= 40.0) {
                    $decision = 'PROMOTED ON TRIAL';
                } else {
                    $decision = 'REPEAT';
                }
            }

            $fullName = strtoupper(trim($stu['last_name'] . ' ' . $stu['first_name']));

            $compiledStudents[] = [
                'id' => $sid,
                'name' => $fullName,
                'admission_number' => $stu['admission_number'] ?: "STU-" . $sid,
                'class_name' => $stu['class_name'] ?: "",
                'scores' => $scoresMap,
                'average' => $average,
                'offered_count' => $offeredCount,
                'grades' => $gradeCounts,
                'decision' => $decision
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
                "is_senior" => $isSenior,
                "is_cumulative" => $isCumulative,
                "logo_url" => $logoUrl
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

        // Dynamically compute width for student name column based on the longest name in the class
        $maxNameLen = 14;
        if (!empty($students)) {
            foreach ($students as $stu) {
                $len = strlen(trim($stu['name'] ?? ''));
                if ($len > $maxNameLen) {
                    $maxNameLen = $len;
                }
            }
        }
        // At 9.5px font-size in Arial uppercase: ~5.9px per character + 14px padding.
        // Clamp dynamically between 110px and 200px so it fits the longest name snugly without wasting landscape space.
        $dynamicNameWidth = max(110, min(200, intval($maxNameLen * 5.9 + 14)));

        ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Broadsheet - <?= htmlspecialchars($school['class_title']) ?> (<?= htmlspecialchars($school['term']) ?> <?= htmlspecialchars($school['session']) ?>)</title>
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="icon" type="image/png" href="<?= htmlspecialchars(!empty($school['logo_url']) ? $school['logo_url'] : '/favicon.png') ?>">
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
        .header-title-box {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 14px;
            margin-bottom: 4px;
        }
        .school-logo-img {
            width: 52px;
            height: 52px;
            object-fit: contain;
            flex-shrink: 0;
        }
        .logo-fallback-badge {
            width: 46px;
            height: 46px;
            border-radius: 50%;
            border: 2px solid #dc2626;
            background: #fef2f2;
            color: #dc2626;
            font-size: 18px;
            font-weight: 900;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .title-details {
            text-align: center;
        }
        .school-title {
            font-size: 20px;
            font-weight: 900;
            letter-spacing: 0.5px;
            margin: 0;
            text-transform: uppercase;
            line-height: 1.15;
        }
        .sub-title {
            font-size: 13px;
            font-weight: bold;
            margin: 2px 0 0 0;
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
            <?= count($subjects) <= 6 ? 'width: auto; min-width: 60%; margin: 0 auto;' : 'width: 100%;' ?>
            border-collapse: collapse;
            table-layout: auto !important;
            border: 2px solid #000;
        }
        table.broadsheet-table th, 
        table.broadsheet-table td {
            border: 1px solid #000;
            padding: 2px 3px;
            text-align: center;
            font-size: 9.5px;
            line-height: 1.15;
            height: 19px;
            vertical-align: middle;
        }
        .col-sno {
            width: 28px;
            min-width: 28px;
            font-weight: bold;
        }
        .col-name {
            width: 1% !important;
            white-space: nowrap !important;
            text-align: left !important;
            padding-left: 6px !important;
            padding-right: 14px !important;
            font-weight: 600;
        }
        .col-sub {
            width: 32px;
            min-width: 30px;
        }
        .col-avg {
            width: 48px;
            min-width: 44px;
            font-weight: bold;
        }
        .col-grade {
            width: 32px;
            min-width: 30px;
            text-align: center;
            font-size: 10px;
            font-weight: bold;
            padding: 2px 2px;
        }
        .col-decision {
            width: 72px;
            min-width: 68px;
            text-align: center;
            font-size: 8.5px;
            font-weight: bold;
            padding: 2px 2px;
        }

        /* Numbered header row */
        tr.index-row th {
            height: 18px;
            font-size: 9px;
            background: #f8fafc;
        }

        /* Vertical rotated subject header */
        .vertical-header {
            height: 135px;
            max-height: 135px;
            position: relative;
            vertical-align: bottom !important;
            padding: 0 1px !important;
            overflow: hidden !important;
        }
        .vertical-header-wrapper {
            height: 135px;
            max-height: 135px;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            padding-bottom: 5px;
            overflow: hidden !important;
            box-sizing: border-box;
        }
        .vertical-text {
            writing-mode: vertical-rl;
            transform: rotate(180deg);
            white-space: nowrap;
            display: inline-block;
            text-align: left;
            font-size: 8.5px;
            font-weight: bold;
            letter-spacing: 0.2px;
            max-height: 125px;
            overflow: hidden !important;
            text-overflow: ellipsis;
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
        <div class="header-title-box">
            <?php if (!empty($school['logo_url'])): ?>
                <img src="<?= htmlspecialchars($school['logo_url']) ?>" alt="School Logo" class="school-logo-img">
            <?php else: ?>
                <div class="logo-fallback-badge">✝</div>
            <?php endif; ?>
            <div class="title-details">
                <h1 class="school-title"><?= htmlspecialchars($school['name']) ?></h1>
                <div class="sub-title"><?= htmlspecialchars($school['level_title']) ?></div>
            </div>
        </div>
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
                <th class="col-grade"></th>
                <th class="col-grade"></th>
                <th class="col-grade"></th>
                <th class="col-grade"></th>
                <th class="col-grade"></th>
                <?php if (!empty($school['is_cumulative'])): ?>
                    <th class="col-decision"></th>
                <?php endif; ?>
            </tr>
            <!-- Subject names (vertical headers) -->
            <tr>
                <th class="col-sno" style="vertical-align: bottom;">S/<br>NO</th>
                <th class="col-name" style="vertical-align: bottom;">NAME OF STUDENT</th>
                <?php foreach ($subjects as $sub): ?>
                    <th class="col-sub vertical-header" title="<?= htmlspecialchars($sub['name']) ?>">
                        <div class="vertical-header-wrapper">
                            <span class="vertical-text"><?= htmlspecialchars($sub['short_name'] ?? $sub['name']) ?></span>
                        </div>
                    </th>
                <?php endforeach; ?>
                <th class="col-avg vertical-header" title="<?= !empty($school['is_cumulative']) ? 'Cumulative Average' : 'Term Average' ?>">
                    <div class="vertical-header-wrapper">
                        <span class="vertical-text"><?= !empty($school['is_cumulative']) ? 'CUM. AVG' : 'AVERAGE' ?></span>
                    </div>
                </th>
                <th class="col-grade" style="vertical-align: bottom;">A</th>
                <th class="col-grade" style="vertical-align: bottom;">B</th>
                <th class="col-grade" style="vertical-align: bottom;">C</th>
                <th class="col-grade" style="vertical-align: bottom;">D</th>
                <th class="col-grade" style="vertical-align: bottom;">F</th>
                <?php if (!empty($school['is_cumulative'])): ?>
                    <th class="col-decision" style="vertical-align: bottom; font-size: 8.5px; font-weight: bold;">DECISION</th>
                <?php endif; ?>
            </tr>
        </thead>
        <tbody>
            <?php 
                $totalCols = 2 + count($subjects) + 1 + 5 + (!empty($school['is_cumulative']) ? 1 : 0); 
                $summaryTrailing = !empty($school['is_cumulative']) ? 7 : 6;
            ?>
            <?php if (empty($students)): ?>
                <tr>
                    <td colspan="<?= $totalCols ?>" style="padding: 24px; text-align:center; color:#64748b;">
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
                                <?= ($sc !== null && floatval($sc) > 0) ? (floatval($sc) == intval($sc) ? intval($sc) : number_format($sc, 2)) : '' ?>
                            </td>
                        <?php endforeach; ?>
                        <td class="col-avg"><?= number_format($stu['average'], 2) ?></td>
                        <td class="col-grade"><?= $stu['grades']['A'] ?></td>
                        <td class="col-grade"><?= $stu['grades']['B'] ?></td>
                        <td class="col-grade"><?= $stu['grades']['C'] ?></td>
                        <td class="col-grade"><?= $stu['grades']['D'] ?></td>
                        <td class="col-grade"><?= $stu['grades']['F'] ?></td>
                        <?php if (!empty($school['is_cumulative'])): ?>
                            <td class="col-decision" style="font-weight: bold; font-size: 8px; color: <?= ($stu['decision'] ?? '') === 'PROMOTED' ? '#15803d' : (($stu['decision'] ?? '') === 'PROMOTED ON TRIAL' ? '#b45309' : '#b91c1c') ?>;">
                                <?= htmlspecialchars($stu['decision'] ?? '—') ?>
                            </td>
                        <?php endif; ?>
                    </tr>
                <?php endforeach; ?>

                <!-- Blank spacer row before summary -->
                <tr>
                    <td colspan="<?= $totalCols ?>" style="height: 10px; background: #e2e8f0; border-left:none; border-right:none;"></td>
                </tr>

                <!-- Subject Statistics Summary -->
                <tr class="summary-row">
                    <td class="label-cell bold-cell" colspan="2">No of Students</td>
                    <?php foreach ($subjects as $sub): ?>
                        <td class="bold-cell"><?= $summary[$sub['id']]['student_count'] ?? 0 ?></td>
                    <?php endforeach; ?>
                    <td colspan="<?= $summaryTrailing ?>" style="background:#f8fafc;"></td>
                </tr>
                <tr class="summary-row">
                    <td class="label-cell" colspan="2">No of A's</td>
                    <?php foreach ($subjects as $sub): ?>
                        <td><?= $summary[$sub['id']]['a_count'] ?? 0 ?></td>
                    <?php endforeach; ?>
                    <td colspan="<?= $summaryTrailing ?>" style="background:#f8fafc;"></td>
                </tr>
                <tr class="summary-row">
                    <td class="label-cell" colspan="2">No of B's</td>
                    <?php foreach ($subjects as $sub): ?>
                        <td><?= $summary[$sub['id']]['b_count'] ?? 0 ?></td>
                    <?php endforeach; ?>
                    <td colspan="<?= $summaryTrailing ?>" style="background:#f8fafc;"></td>
                </tr>
                <tr class="summary-row">
                    <td class="label-cell" colspan="2">No of C's</td>
                    <?php foreach ($subjects as $sub): ?>
                        <td><?= $summary[$sub['id']]['c_count'] ?? 0 ?></td>
                    <?php endforeach; ?>
                    <td colspan="<?= $summaryTrailing ?>" style="background:#f8fafc;"></td>
                </tr>
                <tr class="summary-row">
                    <td class="label-cell" colspan="2">No of D's</td>
                    <?php foreach ($subjects as $sub): ?>
                        <td><?= $summary[$sub['id']]['d_count'] ?? 0 ?></td>
                    <?php endforeach; ?>
                    <td colspan="<?= $summaryTrailing ?>" style="background:#f8fafc;"></td>
                </tr>
                <tr class="summary-row">
                    <td class="label-cell" colspan="2">No of F's</td>
                    <?php foreach ($subjects as $sub): ?>
                        <td><?= $summary[$sub['id']]['f_count'] ?? 0 ?></td>
                    <?php endforeach; ?>
                    <td colspan="<?= $summaryTrailing ?>" style="background:#f8fafc;"></td>
                </tr>
                <tr class="summary-row">
                    <td class="label-cell bold-cell" colspan="2">No of Pass</td>
                    <?php foreach ($subjects as $sub): ?>
                        <td class="bold-cell"><?= $summary[$sub['id']]['pass_count'] ?? 0 ?></td>
                    <?php endforeach; ?>
                    <td colspan="<?= $summaryTrailing ?>" style="background:#f8fafc;"></td>
                </tr>
                <tr class="summary-row">
                    <td class="label-cell bold-cell" colspan="2">% pass</td>
                    <?php foreach ($subjects as $sub): ?>
                        <td class="pass-pct"><?= ($summary[$sub['id']]['pass_percentage'] ?? 0) ?>%</td>
                    <?php endforeach; ?>
                    <td colspan="<?= $summaryTrailing ?>" style="background:#f8fafc;"></td>
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
        $header[] = !empty($school['is_cumulative']) ? 'CUM. AVERAGE' : 'AVERAGE';
        $header[] = 'A';
        $header[] = 'B';
        $header[] = 'C';
        $header[] = 'D';
        $header[] = 'F';
        if (!empty($school['is_cumulative'])) {
            $header[] = 'DECISION';
        }
        fputcsv($out, $header);

        // Student Rows
        foreach ($students as $stu) {
            $row = [$stu['s_no'], $stu['name']];
            foreach ($subjects as $sub) {
                $sc = $stu['scores'][$sub['id']] ?? '';
                $row[] = ($sc !== null && $sc !== '' && floatval($sc) > 0) ? (floatval($sc) == intval($sc) ? intval($sc) : number_format($sc, 2)) : '';
            }
            $row[] = number_format($stu['average'], 2);
            $row[] = $stu['grades']['A'];
            $row[] = $stu['grades']['B'];
            $row[] = $stu['grades']['C'];
            $row[] = $stu['grades']['D'];
            $row[] = $stu['grades']['F'];
            if (!empty($school['is_cumulative'])) {
                $row[] = $stu['decision'] ?? '';
            }
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
