<?php
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../lib/Auth.php';

class TranscriptController {
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

    /**
     * Canonicalize course names to eliminate case mismatches and known duplicates
     */
    private function canonicalizeSubject($rawName) {
        $name = strtoupper(trim($rawName));
        // Remove trailing or redundant punctuation
        $name = preg_replace('/\s+/', ' ', $name);

        $aliases = [
            'FURTHER MATHS'                           => 'FURTHER MATHEMATICS',
            'FURTHER MATHEMATICS'                     => 'FURTHER MATHEMATICS',
            'LET'                                     => 'LIFE ENRICHMENT TRAINING',
            'L. E. T.'                                => 'LIFE ENRICHMENT TRAINING',
            'L.E.T'                                   => 'LIFE ENRICHMENT TRAINING',
            'LIFE ENRICHMENT TRAINING'                => 'LIFE ENRICHMENT TRAINING',
            'ROBOTICS AND ARTIFITIAL INTELLIGENCE'    => 'ROBOTICS & ARTIFICIAL INTELLIGENCE',
            'ROBOTICS AND ARTIFICIAL INTELLIGENCE'    => 'ROBOTICS & ARTIFICIAL INTELLIGENCE',
            'ROBOTICS AND A.I.'                       => 'ROBOTICS & ARTIFICIAL INTELLIGENCE',
            'ROBOTICS & A.I.'                         => 'ROBOTICS & ARTIFICIAL INTELLIGENCE',
            'ROBOTICS & ARTIFICIAL INTELLIGENCE'      => 'ROBOTICS & ARTIFICIAL INTELLIGENCE',
            'VISUAL ARTS'                             => 'VISUAL ART',
            'VISUAL ART'                              => 'VISUAL ART',
            'FRENCH LANGUAGE'                         => 'FRENCH',
            'FRENCH'                                  => 'FRENCH',
            'CHRISTIAN RELIGIOUS KNOWLEDGE'           => 'CHRISTIAN RELIGIOUS STUDIES',
            'CRS'                                     => 'CHRISTIAN RELIGIOUS STUDIES',
            'C.R.S'                                   => 'CHRISTIAN RELIGIOUS STUDIES',
            'C.R.S.'                                  => 'CHRISTIAN RELIGIOUS STUDIES',
            'CHRISTIAN RELIGIOUS STUDIES'             => 'CHRISTIAN RELIGIOUS STUDIES',
            'PHYSICAL AND HEALTH EDUCATION'           => 'PHYSICAL & HEALTH EDUCATION',
            'PHE'                                     => 'PHYSICAL & HEALTH EDUCATION',
            'P.H.E'                                   => 'PHYSICAL & HEALTH EDUCATION',
            'P.H.E.'                                  => 'PHYSICAL & HEALTH EDUCATION',
            'PHYSICAL & HEALTH EDUCATION'             => 'PHYSICAL & HEALTH EDUCATION',
            'CIVIC EDUCATION'                         => 'CIVIC EDUCATION',
            'AGRICULTURAL SCIENCE'                    => 'AGRICULTURAL SCIENCE',
            'ANIMAL HUSBANDRY'                        => 'ANIMAL HUSBANDRY',
            'DATA PROCESSING'                         => 'DATA PROCESSING',
            'COMPUTER STUDIES'                        => 'COMPUTER STUDIES',
            'FINANCIAL ACCOUNTING'                    => 'FINANCIAL ACCOUNTING',
            'BASIC SCIENCE'                           => 'BASIC SCIENCE',
            'BASIC TECHNOLOGY'                        => 'BASIC TECHNOLOGY',
            'BUSINESS STUDIES'                        => 'BUSINESS STUDIES',
            'CULTURAL AND CREATIVE ARTS'              => 'CULTURAL & CREATIVE ARTS',
            'CCA'                                     => 'CULTURAL & CREATIVE ARTS',
            'HOME ECONOMICS'                          => 'HOME ECONOMICS',
            'SOCIAL STUDIES'                          => 'SOCIAL STUDIES',
            'ENGLISH LANGUAGE'                        => 'ENGLISH LANGUAGE',
            'MATHEMATICS'                             => 'MATHEMATICS',
        ];

        return $aliases[$name] ?? $name;
    }

    /**
     * Compute letter grade and remarks based on Junior vs Senior thresholds
     */
    private function calculateGradeInfo($score, $isJunior = false) {
        if ($score === null || $score === '') {
            return ['grade' => '—', 'remark' => '—', 'points' => 0];
        }
        $s = floatval($score);

        if ($isJunior) {
            $gA = intval($this->getSetting('grade_junior_A_min', 70));
            $gB = intval($this->getSetting('grade_junior_B_min', 60));
            $gC = intval($this->getSetting('grade_junior_C_min', 50));
            $gD = intval($this->getSetting('grade_junior_D_min', 45));
            $gE = intval($this->getSetting('grade_junior_E_min', 40));
        } else {
            $gA = intval($this->getSetting('grade_A_min', 80));
            $gB = intval($this->getSetting('grade_B_min', 70));
            $gC = intval($this->getSetting('grade_C_min', 60));
            $gD = intval($this->getSetting('grade_D_min', 50));
            $gE = intval($this->getSetting('grade_E_min', 45));
        }

        if ($s >= $gA) return ['grade' => 'A', 'remark' => 'EXCELLENT', 'points' => 5];
        if ($s >= $gB) return ['grade' => 'B', 'remark' => 'VERY GOOD', 'points' => 4];
        if ($s >= $gC) return ['grade' => 'C', 'remark' => 'CREDIT',    'points' => 3];
        if ($s >= $gD) return ['grade' => 'D', 'remark' => 'PASS',      'points' => 2];
        if ($s >= $gE) return ['grade' => 'E', 'remark' => 'PASS',      'points' => 1];
        return ['grade' => 'F', 'remark' => 'FAIL', 'points' => 0];
    }

    /**
     * Generate unique, tamper-evident verification reference
     */
    public function generateVerificationReference($studentId, $admissionNo = '') {
        $salt = "DLHS_TRANSCRIPT_SECURE_SALT_2026";
        $hash = strtoupper(substr(hash('sha256', $studentId . '|' . $admissionNo . '|' . $salt), 0, 6));
        $campus = strtoupper(trim($this->getSetting('school_campus', 'KD')));
        $campusCode = (stripos($campus, 'KADUNA') !== false || $campus === 'KD') ? 'KD' : substr(preg_replace('/[^A-Z]/', '', $campus), 0, 3);
        if (empty($campusCode)) $campusCode = 'KD';
        return "DLHS-TR-{$campusCode}-{$studentId}-{$hash}";
    }

    /**
     * Search and list students for transcript generator interface
     */
    public function getTranscriptStudents() {
        $user = Auth::authenticate();
        if ($user['role'] !== 'admin' && $user['role'] !== 'teacher') {
            http_response_code(403);
            echo json_encode(["error" => "Access denied."]);
            return;
        }

        $query = trim($_GET['q'] ?? '');
        $classParam = trim($_GET['class_id'] ?? '');

        // Fetch classes and cohorts for filters
        $classesStmt = $this->conn->query("SELECT id, name FROM classes ORDER BY name ASC");
        $classes = $classesStmt->fetchAll(PDO::FETCH_ASSOC);

        $cohorts = [];
        foreach ($classes as $c) {
            $name = $c['name'];
            $baseName = trim(preg_replace('/\s+(DIAMOND|GOLD|TOPAZ|RUBY|EMERALD|SILVER|[A-D])(\s.*)?$/i', '', $name));
            if (!empty($baseName) && !in_array($baseName, $cohorts)) {
                $cohorts[] = $baseName;
            }
        }

        $params = [];
        $whereClauses = ["u.role = 'student'"];

        if (!empty($query)) {
            $whereClauses[] = "(u.first_name LIKE :q OR u.last_name LIKE :q OR u.admission_number LIKE :q OR u.email LIKE :q)";
            $params[':q'] = "%$query%";
        }

        if (!empty($classParam) && $classParam !== 'all') {
            if (substr($classParam, 0, 9) === 'combined:') {
                $cohort = substr($classParam, 9);
                $whereClauses[] = "c.name LIKE :cohort";
                $params[':cohort'] = $cohort . '%';
            } else {
                $whereClauses[] = "u.class_id = :cid";
                $params[':cid'] = intval($classParam);
            }
        }

        $whereSql = implode(' AND ', $whereClauses);

        $sql = "
            SELECT 
                u.id, 
                u.first_name, 
                u.last_name, 
                u.admission_number, 
                u.gender, 
                u.email, 
                u.avatar_path,
                c.id as class_id, 
                c.name as class_name,
                COUNT(DISTINCT g.academic_session) as sessions_count,
                GROUP_CONCAT(DISTINCT g.academic_session ORDER BY g.academic_session ASC SEPARATOR ', ') as sessions_list
            FROM users u
            LEFT JOIN classes c ON u.class_id = c.id
            LEFT JOIN grades g ON u.id = g.student_id AND g.score > 0
            WHERE {$whereSql}
            GROUP BY u.id
            ORDER BY u.last_name ASC, u.first_name ASC
            LIMIT 100
        ";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        $students = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "students" => $students,
            "classes" => $classes,
            "cohort_options" => $cohorts
        ]);
    }

    /**
     * Core Data Aggregator: Compiles complete transcript payload for a student
     */
    public function compileStudentTranscriptData($studentId, $scope = 'all', $customSession = null) {
        // 1. Fetch Student Details
        $sStmt = $this->conn->prepare("
            SELECT u.id, u.first_name, u.last_name, u.email, u.admission_number, 
                   u.class_id, u.avatar_path, u.gender, u.house, u.sport_activities, u.created_at,
                   c.name as current_class_name
            FROM users u
            LEFT JOIN classes c ON u.class_id = c.id
            WHERE u.id = :sid AND u.role = 'student'
            LIMIT 1
        ");
        $sStmt->execute([':sid' => $studentId]);
        $student = $sStmt->fetch(PDO::FETCH_ASSOC);

        if (!$student) {
            return null;
        }

        // Student DOB check (e.g. from student_registrations if matched)
        $dobStmt = $this->conn->prepare("
            SELECT child_dob FROM student_registrations 
            WHERE (child_first_name = :fn AND child_last_name = :ln)
            LIMIT 1
        ");
        $dobStmt->execute([':fn' => $student['first_name'], ':ln' => $student['last_name']]);
        $dob = $dobStmt->fetchColumn() ?: null;

        // 2. School Settings & Metadata
        $schoolName    = $this->getSetting('school_name', 'DEEPER LIFE HIGH SCHOOL');
        $schoolCampus  = $this->getSetting('school_campus', 'KADUNA CAMPUS');
        $schoolAddress = $this->getSetting('school_address', 'KM 16, EASTERN BYE-PASS, MARABA RIDO, KADUNA');
        $schoolPhone   = $this->getSetting('school_phone', '08158190115');
        $schoolEmail   = $this->getSetting('school_email', 'ictkaduna@deeperlifehighschool.org');
        $schoolWebsite = $this->getSetting('school_website', 'www.deeperlifehighschool.org');
        $schoolMotto   = $this->getSetting('school_motto', 'LEADERSHIP WITH DISTINCTION');
        $principalName = $this->getSetting('school_principal', 'Mrs. Bamishe Olumuyiwa');
        $logoPath      = $this->getSetting('school_logo_path', 'uploads/logos/dlhs_logo.webp');
        $signaturePath = $this->getSetting('principal_signature_path', '');

        $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);
        $proto    = $isHttps ? 'https://' : 'http://';
        $scriptDir = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/api'), '/\\');
        $apiBase  = $proto . ($_SERVER['HTTP_HOST'] ?? 'localhost') . ($scriptDir ?: '/api');
        $logoUrl  = $logoPath ? "$apiBase/$logoPath" : '';
        $signatureUrl = $signaturePath ? "$apiBase/$signaturePath" : '';

        // 3. Fetch All Grade Records for Student
        $gSql = "
            SELECT 
                g.academic_session,
                g.academic_term,
                g.class_id,
                c.name as class_name,
                co.id as course_id,
                co.name as raw_course_name,
                co.department,
                g.ca1,
                g.ca2,
                g.exam,
                g.score as total_score,
                g.remarks,
                g.status
            FROM grades g
            JOIN courses co ON g.course_id = co.id
            LEFT JOIN classes c ON g.class_id = c.id
            WHERE g.student_id = :sid AND g.status = 'published' AND g.score > 0
            ORDER BY g.academic_session ASC,
                CASE 
                    WHEN g.academic_term = '1st Term' THEN 1 
                    WHEN g.academic_term = '2nd Term' THEN 2 
                    WHEN g.academic_term = '3rd Term' THEN 3 
                    ELSE 4 
                END,
                co.name ASC
        ";
        $gStmt = $this->conn->prepare($gSql);
        $gStmt->execute([':sid' => $studentId]);
        $gradeRows = $gStmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch student class history to associate accurate class with each session/term
        $histStmt = $this->conn->prepare("
            SELECT sch.academic_session, sch.academic_term, sch.class_id, c.name as class_name
            FROM student_class_history sch
            JOIN classes c ON sch.class_id = c.id
            WHERE sch.student_id = :sid
        ");
        $histStmt->execute([':sid' => $studentId]);
        $histRows = $histStmt->fetchAll(PDO::FETCH_ASSOC);

        $sessionClassMap = [];
        foreach ($histRows as $hr) {
            $sess = $hr['academic_session'];
            if (!isset($sessionClassMap[$sess])) {
                $sessionClassMap[$sess] = $hr['class_name'];
            }
        }

        // Group rows by Academic Session -> Subject -> Term
        $rawSessionData = [];
        foreach ($gradeRows as $row) {
            $sess = $row['academic_session'];
            $term = $row['academic_term'];
            $subj = $this->canonicalizeSubject($row['raw_course_name']);

            // Map class name if not already set
            if (!isset($sessionClassMap[$sess]) && !empty($row['class_name'])) {
                $sessionClassMap[$sess] = $row['class_name'];
            }

            if (!isset($rawSessionData[$sess])) {
                $rawSessionData[$sess] = [];
            }
            if (!isset($rawSessionData[$sess][$subj])) {
                $rawSessionData[$sess][$subj] = [
                    'department' => $row['department'] ?: 'General',
                    'terms' => []
                ];
            }

            // In case of multiple entries for the same subject/term, keep the highest authentic score
            $score = floatval($row['total_score']);
            if (!isset($rawSessionData[$sess][$subj]['terms'][$term]) || $score > $rawSessionData[$sess][$subj]['terms'][$term]['score']) {
                $rawSessionData[$sess][$subj]['terms'][$term] = [
                    'ca1'   => $row['ca1'] !== null ? floatval($row['ca1']) : null,
                    'ca2'   => $row['ca2'] !== null ? floatval($row['ca2']) : null,
                    'exam'  => $row['exam'] !== null ? floatval($row['exam']) : null,
                    'score' => $score
                ];
            }
        }

        // Process sessions & apply scope filters
        $processedSessions = [];
        $allGrandScores = [];
        $totalCreditsEarned = 0;
        $totalSubjectsEvaluated = 0;
        $totalPointsEarned = 0;

        foreach ($rawSessionData as $sessName => $subjectsMap) {
            $className = $sessionClassMap[$sessName] ?? $student['current_class_name'] ?? 'Class Record';
            $isJunior = (
                stripos($className, 'BASIC') !== false ||
                stripos($className, 'JSS') !== false ||
                stripos($className, 'JUNIOR') !== false ||
                stripos($className, 'JS ') !== false ||
                stripos($className, 'JS1') !== false ||
                stripos($className, 'JS2') !== false ||
                stripos($className, 'JS3') !== false
            );

            // Scope filtering
            if ($scope === 'junior' && !$isJunior) continue;
            if ($scope === 'senior' && $isJunior) continue;
            if ($scope === 'session' && !empty($customSession) && $sessName !== $customSession) continue;

            $sessionSubjects = [];
            $sessionTotalScore = 0;
            $sessionSubjectCount = 0;
            $termScoreSums = ['1st Term' => 0, '2nd Term' => 0, '3rd Term' => 0];
            $termSubjectCounts = ['1st Term' => 0, '2nd Term' => 0, '3rd Term' => 0];
            $sessionPassedCount = 0;

            foreach ($subjectsMap as $subjName => $subjData) {
                $terms = $subjData['terms'];
                if (empty($terms)) continue;

                $termResults = [];
                $annualScores = [];

                foreach (['1st Term', '2nd Term', '3rd Term'] as $t) {
                    if (isset($terms[$t])) {
                        $tScore = $terms[$t]['score'];
                        $gInfo = $this->calculateGradeInfo($tScore, $isJunior);
                        $termResults[$t] = [
                            'ca1'    => $terms[$t]['ca1'],
                            'ca2'    => $terms[$t]['ca2'],
                            'exam'   => $terms[$t]['exam'],
                            'score'  => $tScore,
                            'grade'  => $gInfo['grade'],
                            'remark' => $gInfo['remark']
                        ];
                        $annualScores[] = $tScore;
                        $termScoreSums[$t] += $tScore;
                        $termSubjectCounts[$t]++;
                    } else {
                        $termResults[$t] = null;
                    }
                }

                $annualAvg = !empty($annualScores) ? round(array_sum($annualScores) / count($annualScores), 1) : 0;
                $annualGInfo = $this->calculateGradeInfo($annualAvg, $isJunior);

                if (in_array($annualGInfo['grade'], ['A', 'B', 'C'])) {
                    $sessionPassedCount++;
                    $totalCreditsEarned++;
                }

                $sessionTotalScore += $annualAvg;
                $sessionSubjectCount++;
                $allGrandScores[] = $annualAvg;
                $totalPointsEarned += $annualGInfo['points'];
                $totalSubjectsEvaluated++;

                $sessionSubjects[] = [
                    'subject'        => $subjName,
                    'department'     => $subjData['department'],
                    'terms'          => $termResults,
                    'annual_average' => $annualAvg,
                    'annual_grade'   => $annualGInfo['grade'],
                    'annual_remark'  => $annualGInfo['remark'],
                    'grade_points'   => $annualGInfo['points']
                ];
            }

            // Sort subjects alphabetically
            usort($sessionSubjects, function($a, $b) {
                return strcmp($a['subject'], $b['subject']);
            });

            // Session overall average
            $sessionAvg = $sessionSubjectCount > 0 ? round($sessionTotalScore / $sessionSubjectCount, 1) : 0;
            $sessionGInfo = $this->calculateGradeInfo($sessionAvg, $isJunior);

            // Term Averages
            $termAverages = [];
            foreach (['1st Term', '2nd Term', '3rd Term'] as $t) {
                $termAverages[$t] = $termSubjectCounts[$t] > 0 
                    ? round($termScoreSums[$t] / $termSubjectCounts[$t], 1) 
                    : null;
            }

            // Promotion / Completion Status remark
            $promotionStatus = "PASSED";
            if ($isJunior) {
                if (stripos($className, 'BASIC 9') !== false || stripos($className, 'JSS 3') !== false) {
                    $promotionStatus = ($sessionAvg >= 50) ? "COMPLETED JUNIOR SECONDARY COURSE — PROMOTED TO SS 1" : "ELIGIBLE FOR RESIT";
                } elseif (stripos($className, 'BASIC 8') !== false || stripos($className, 'JSS 2') !== false) {
                    $promotionStatus = ($sessionAvg >= 50) ? "PROMOTED TO BASIC 9" : "REPEAT BASIC 8";
                } else {
                    $promotionStatus = ($sessionAvg >= 50) ? "PROMOTED TO BASIC 8" : "REPEAT BASIC 7";
                }
            } else {
                if (stripos($className, 'SS 3') !== false) {
                    $promotionStatus = ($sessionAvg >= 50 && $sessionPassedCount >= 5) 
                        ? "COMPLETED SENIOR SECONDARY COURSE — ELIGIBLE FOR GRADUATION" 
                        : "COMPLETED SENIOR SECONDARY COURSE";
                } elseif (stripos($className, 'SS 2') !== false) {
                    $promotionStatus = ($sessionAvg >= 50) ? "PROMOTED TO SS 3" : "REPEAT SS 2";
                } else {
                    $promotionStatus = ($sessionAvg >= 50) ? "PROMOTED TO SS 2" : "REPEAT SS 1";
                }
            }

            $processedSessions[] = [
                'session_name'     => $sessName,
                'class_name'       => $className,
                'is_junior'        => $isJunior,
                'subjects'         => $sessionSubjects,
                'total_score'      => round($sessionTotalScore, 1),
                'total_subjects'   => $sessionSubjectCount,
                'passed_subjects'  => $sessionPassedCount,
                'average_score'    => $sessionAvg,
                'overall_grade'    => $sessionGInfo['grade'],
                'term_averages'    => $termAverages,
                'promotion_status' => $promotionStatus
            ];
        }

        // Grand Cumulative Statistics
        $grandAvg = !empty($allGrandScores) ? round(array_sum($allGrandScores) / count($allGrandScores), 1) : 0;
        $grandGInfo = $this->calculateGradeInfo($grandAvg, false); // Senior standard for overall degree standing

        $cgpa5 = $totalSubjectsEvaluated > 0 ? round($totalPointsEarned / $totalSubjectsEvaluated, 2) : 0.0;
        $cgpa4 = round(($grandAvg / 100) * 4.0, 2);

        $classification = "Pass";
        if ($grandAvg >= 80) $classification = "Distinction (First Class Equivalent)";
        elseif ($grandAvg >= 70) $classification = "Very Good (Upper Credit)";
        elseif ($grandAvg >= 60) $classification = "Credit";
        elseif ($grandAvg >= 50) $classification = "Pass";
        else $classification = "Fail / Unsatisfactory";

        $refNumber = $this->generateVerificationReference($studentId, $student['admission_number'] ?? '');

        return [
            "student" => [
                "id"                => intval($student['id']),
                "first_name"        => $student['first_name'],
                "last_name"         => $student['last_name'],
                "full_name"         => strtoupper(trim($student['first_name'] . ' ' . $student['last_name'])),
                "admission_number"  => $student['admission_number'] ?: "DLHS/" . date('Y', strtotime($student['created_at'])) . "/" . str_pad($student['id'], 4, '0', STR_PAD_LEFT),
                "gender"            => strtoupper($student['gender'] ?: 'MALE'),
                "house"             => strtoupper($student['house'] ?: 'FAITH'),
                "sport_activities"  => strtoupper($student['sport_activities'] ?: 'BASKETBALL'),
                "dob"               => $dob,
                "email"             => $student['email'],
                "avatar_url"        => $student['avatar_path'] ? "$apiBase/" . $student['avatar_path'] : null,
                "current_class"     => $student['current_class_name'] ?: 'DLHS Student',
                "enrolled_date"     => date('jS F, Y', strtotime($student['created_at']))
            ],
            "school" => [
                "name"          => $schoolName,
                "campus"        => $schoolCampus,
                "address"       => $schoolAddress,
                "phone"         => $schoolPhone,
                "email"         => $schoolEmail,
                "website"       => $schoolWebsite,
                "motto"         => $schoolMotto,
                "principal"     => $principalName,
                "logo_url"      => $logoUrl,
                "signature_url" => $signatureUrl
            ],
            "sessions" => $processedSessions,
            "cumulative_summary" => [
                "total_sessions_completed" => count($processedSessions),
                "total_subjects_evaluated" => $totalSubjectsEvaluated,
                "total_credits_earned"     => $totalCreditsEarned,
                "overall_average"          => $grandAvg,
                "overall_grade"            => $grandGInfo['grade'],
                "overall_classification"   => $classification,
                "cgpa_5_point"             => $cgpa5,
                "cgpa_4_point"             => $cgpa4
            ],
            "verification" => [
                "reference_number" => $refNumber,
                "date_issued"      => date('jS F, Y'),
                "verification_url" => "$apiBase/index.php?path=/transcript/verify&ref=" . urlencode($refNumber),
                "principal_name"   => $principalName,
                "principal_title"  => "Principal / Chief Academic Officer"
            ]
        ];
    }

    /**
     * API Endpoint: Get Student Transcript JSON
     */
    public function getTranscriptData() {
        $user = Auth::authenticate();
        $studentId = isset($_GET['student_id']) ? intval($_GET['student_id']) : 0;

        if ($user['role'] === 'student') {
            $studentId = $user['id'];
        } elseif ($user['role'] === 'parent') {
            $pStmt = $this->conn->prepare("SELECT student_id FROM parent_students WHERE parent_id = :pid AND student_id = :sid LIMIT 1");
            $pStmt->execute([':pid' => $user['id'], ':sid' => $studentId]);
            if (!$pStmt->fetchColumn()) {
                http_response_code(403);
                echo json_encode(["error" => "Unauthorized access to child transcript."]);
                return;
            }
        } elseif ($user['role'] !== 'admin' && $user['role'] !== 'teacher') {
            http_response_code(403);
            echo json_encode(["error" => "Access denied."]);
            return;
        }

        if (!$studentId) {
            http_response_code(400);
            echo json_encode(["error" => "Student ID required."]);
            return;
        }

        $scope = $_GET['scope'] ?? 'all';
        $customSession = $_GET['session'] ?? null;

        $data = $this->compileStudentTranscriptData($studentId, $scope, $customSession);
        if (!$data) {
            http_response_code(404);
            echo json_encode(["error" => "Student academic records not found."]);
            return;
        }

        echo json_encode(["success" => true, "transcript" => $data]);
    }

    /**
     * Student Self-service endpoint
     */
    public function getStudentTranscript() {
        $user = Auth::authenticate();
        if ($user['role'] !== 'student') {
            http_response_code(403);
            echo json_encode(["error" => "Student portal only."]);
            return;
        }
        $scope = $_GET['scope'] ?? 'all';
        $data = $this->compileStudentTranscriptData($user['id'], $scope);
        echo json_encode(["success" => true, "transcript" => $data]);
    }

    /**
     * Parent Child Transcript endpoint
     */
    public function getParentTranscript() {
        $user = Auth::authenticate();
        if ($user['role'] !== 'parent') {
            http_response_code(403);
            echo json_encode(["error" => "Parent portal only."]);
            return;
        }
        $studentId = intval($_GET['student_id'] ?? 0);
        $pStmt = $this->conn->prepare("SELECT student_id FROM parent_students WHERE parent_id = :pid AND student_id = :sid LIMIT 1");
        $pStmt->execute([':pid' => $user['id'], ':sid' => $studentId]);
        if (!$pStmt->fetchColumn()) {
            http_response_code(403);
            echo json_encode(["error" => "Child record not linked to parent."]);
            return;
        }
        $scope = $_GET['scope'] ?? 'all';
        $data = $this->compileStudentTranscriptData($studentId, $scope);
        echo json_encode(["success" => true, "transcript" => $data]);
    }

    /**
     * Public Verification Endpoint
     */
    public function verifyTranscript() {
        $ref = trim($_GET['ref'] ?? '');
        if (empty($ref)) {
            $this->renderVerificationView(false, "No transcript reference code provided.");
            return;
        }

        // Format expected: DLHS-TR-[CAMPUS]-[STUDENT_ID]-[HASH]
        $parts = explode('-', $ref);
        if (count($parts) < 5 || $parts[0] !== 'DLHS' || $parts[1] !== 'TR') {
            $this->renderVerificationView(false, "Invalid transcript reference format: " . htmlspecialchars($ref));
            return;
        }

        $studentId = intval($parts[3]);
        $data = $this->compileStudentTranscriptData($studentId);

        if (!$data || $data['verification']['reference_number'] !== $ref) {
            $this->renderVerificationView(false, "Transcript reference {$ref} does not match any official school record.");
            return;
        }

        // If JSON requested
        if (isset($_GET['format']) && $_GET['format'] === 'json') {
            header('Content-Type: application/json; charset=UTF-8');
            echo json_encode([
                "valid" => true,
                "verification" => $data['verification'],
                "student" => [
                    "full_name" => $data['student']['full_name'],
                    "admission_number" => $data['student']['admission_number']
                ],
                "cumulative" => $data['cumulative_summary']
            ]);
            return;
        }

        $this->renderVerificationView(true, "", $data);
    }

    /**
     * Render the official verification landing page
     */
    private function renderVerificationView($valid, $message = "", $data = null) {
        header('Content-Type: text/html; charset=UTF-8');
        ?>
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>DLHS Transcript Authenticity Verification</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <link rel="icon" type="image/x-icon" href="/favicon.ico">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
            body { background: #0f172a; color: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
            .card { background: #1e293b; border: 1.5px solid <?= $valid ? '#10b981' : '#ef4444' ?>; border-radius: 18px; max-width: 580px; width: 100%; padding: 36px 32px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); text-align: center; }
            .badge-icon { width: 72px; height: 72px; border-radius: 50%; margin: 0 auto 18px; display: flex; align-items: center; justify-content: center; font-size: 34px; background: <?= $valid ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' ?>; border: 2px solid <?= $valid ? '#10b981' : '#ef4444' ?>; }
            .status-title { font-size: 22px; font-weight: 800; color: <?= $valid ? '#34d399' : '#f87171' ?>; margin-bottom: 8px; }
            .school-label { font-size: 13px; font-weight: 700; letter-spacing: 1px; color: #94a3b8; text-transform: uppercase; margin-bottom: 20px; }
            .details-box { background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 18px; text-align: left; margin-bottom: 24px; font-size: 13px; line-height: 1.8; }
            .details-box dt { color: #94a3b8; font-weight: 600; }
            .details-box dd { color: #f1f5f9; font-weight: 700; margin-bottom: 8px; }
            .ref-chip { display: inline-block; font-family: monospace; font-size: 12.5px; background: #334155; color: #38bdf8; padding: 4px 10px; border-radius: 6px; font-weight: 700; }
            .seal-note { font-size: 11px; color: #64748b; line-height: 1.5; margin-top: 16px; border-top: 1px solid #334155; padding-top: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <?php if ($valid && $data): ?>
              <div class="badge-icon">✓</div>
              <h1 class="status-title">Authentic Academic Transcript</h1>
              <div class="school-label"><?= htmlspecialchars($data['school']['name']) ?> • <?= htmlspecialchars($data['school']['campus']) ?></div>
              
              <div class="details-box">
                <dl>
                  <dt>Student Name:</dt>
                  <dd style="font-size: 15px; color: #fff;"><?= htmlspecialchars($data['student']['full_name']) ?></dd>
                  <dt>Admission Number:</dt>
                  <dd><?= htmlspecialchars($data['student']['admission_number']) ?></dd>
                  <dt>Transcript Reference ID:</dt>
                  <dd><span class="ref-chip"><?= htmlspecialchars($data['verification']['reference_number']) ?></span></dd>
                  <dt>Sessions Evaluated:</dt>
                  <dd><?= count($data['sessions']) ?> Academic Session(s)</dd>
                  <dt>Cumulative Academic Standing:</dt>
                  <dd style="color: #38bdf8;"><?= htmlspecialchars($data['cumulative_summary']['overall_classification']) ?> (<?= $data['cumulative_summary']['overall_average'] ?>%)</dd>
                  <dt>Date of Certification:</dt>
                  <dd><?= htmlspecialchars($data['verification']['date_issued']) ?></dd>
                </dl>
              </div>

              <p style="font-size: 12.5px; color: #34d399; font-weight: 700;">
                Official Institutional Seal Verified. Document is genuine and on record.
              </p>
            <?php else: ?>
              <div class="badge-icon">✕</div>
              <h1 class="status-title">Verification Failed</h1>
              <div class="school-label">Deeper Life High School Official Registry</div>
              <p style="color: #cbd5e1; font-size: 14px; margin-bottom: 20px; line-height: 1.6;">
                <?= htmlspecialchars($message) ?>
              </p>
              <p style="font-size: 12px; color: #94a3b8;">
                Please contact the Registrar / Exams Office if you believe this is in error.
              </p>
            <?php endif; ?>

            <div class="seal-note">
              Official Electronic Verification Service • Deeper Life High School Examination Board
            </div>
          </div>
        </body>
        </html>
        <?php
    }

    /**
     * Print Official Transcript (A4 Printable HTML with Watermark, Badges, and Signatures)
     */
    public function printTranscript() {
        header('Content-Type: text/html; charset=UTF-8');
        $user = Auth::authenticate();

        $studentId  = isset($_GET['student_id']) ? intval($_GET['student_id']) : 0;
        $classParam = $_GET['class_id'] ?? '';
        $scope      = $_GET['scope'] ?? 'all';
        $watermark  = ($_GET['watermark'] ?? '1') !== '0';
        $official   = ($_GET['official'] ?? '1') !== '0';
        $showRank   = ($_GET['show_rank'] ?? '0') === '1';

        $studentIds = [];
        $batchTitle = "";

        if (!empty($classParam) && !$studentId) {
            if ($user['role'] !== 'admin' && $user['role'] !== 'teacher') {
                die("<p style='font-family:sans-serif;padding:40px'>Access denied.</p>");
            }

            if (substr($classParam, 0, 9) === 'combined:') {
                $cohort = substr($classParam, 9);
                $batchTitle = $cohort;
                $cStmt = $this->conn->prepare("SELECT id FROM classes WHERE name LIKE :c");
                $cStmt->execute([':c' => $cohort . '%']);
                $cids = $cStmt->fetchAll(PDO::FETCH_COLUMN);
                if (!empty($cids)) {
                    $in = implode(',', array_fill(0, count($cids), '?'));
                    $st = $this->conn->prepare("
                        SELECT DISTINCT u.id 
                        FROM users u 
                        LEFT JOIN grades g ON u.id = g.student_id 
                        WHERE (u.class_id IN ($in) OR g.class_id IN ($in)) AND u.role = 'student'
                        ORDER BY u.last_name ASC, u.first_name ASC
                    ");
                    $st->execute(array_merge($cids, $cids));
                    $studentIds = $st->fetchAll(PDO::FETCH_COLUMN);
                }
            } else {
                $cid = intval($classParam);
                $cnStmt = $this->conn->prepare("SELECT name FROM classes WHERE id = :id LIMIT 1");
                $cnStmt->execute([':id' => $cid]);
                $batchTitle = $cnStmt->fetchColumn() ?: "Class $cid";

                $st = $this->conn->prepare("
                    SELECT DISTINCT u.id 
                    FROM users u 
                    LEFT JOIN grades g ON u.id = g.student_id 
                    WHERE (u.class_id = :cid OR g.class_id = :cid2) AND u.role = 'student'
                    ORDER BY u.last_name ASC, u.first_name ASC
                ");
                $st->execute([':cid' => $cid, ':cid2' => $cid]);
                $studentIds = $st->fetchAll(PDO::FETCH_COLUMN);
            }

            if (empty($studentIds)) {
                die("<p style='font-family:sans-serif;padding:40px'>No students found for {$batchTitle}.</p>");
            }
        } else {
            if (!$studentId) {
                if ($user['role'] === 'student') $studentId = $user['id'];
                elseif ($user['role'] === 'parent') {
                    $pStmt = $this->conn->prepare("SELECT student_id FROM parent_students WHERE parent_id = :pid LIMIT 1");
                    $pStmt->execute([':pid' => $user['id']]);
                    $studentId = $pStmt->fetchColumn();
                }
            }
            if (!$studentId) {
                die("<p style='font-family:sans-serif;padding:40px'>Student ID required.</p>");
            }
            $studentIds = [$studentId];
        }

        // Render HTML Document
        ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title><?= count($studentIds) > 1 ? "Official Transcripts Batch - " . htmlspecialchars($batchTitle) : "Official Student Academic Transcript" ?></title>
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;900&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

@page {
  size: A4 portrait;
  margin: 6mm 8mm;
}

body {
  font-family: 'Plus Jakarta Sans', Arial, sans-serif;
  color: #0f172a;
  background: #334155;
  margin: 0;
  padding: 20px 0;
  font-size: 10px;
  line-height: 1.35;
}

.no-print {
  width: 210mm;
  margin: 0 auto 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.btn-group {
  display: flex;
  gap: 8px;
}
.print-btn {
  background: #2563eb;
  color: #fff;
  border: none;
  padding: 9px 20px;
  border-radius: 6px;
  font-weight: 700;
  cursor: pointer;
  font-size: 13px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
.close-btn {
  background: #475569;
  color: #fff;
  border: none;
  padding: 9px 16px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  font-size: 13px;
}

/* Transcript Sheet */
.sheet {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto 20px;
  background: #fff;
  border: 3px double #5b21b6;
  padding: 6mm 8mm 6mm;
  box-sizing: border-box;
  box-shadow: 0 10px 35px rgba(0,0,0,0.35);
  position: relative;
  page-break-after: always;
  break-after: page;
}

/* Optional Watermark */
<?php if ($watermark): ?>
.sheet::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 320px;
  height: 320px;
  background-image: url('<?= htmlspecialchars($logoUrl ?: "/favicon.png") ?>');
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  opacity: 0.045;
  pointer-events: none;
  z-index: 1;
}
<?php endif; ?>

.content-layer {
  position: relative;
  z-index: 2;
}

/* Header */
.official-header {
  border-bottom: 2.5px solid #5b21b6;
  padding-bottom: 6px;
  margin-bottom: 8px;
}
.header-grid {
  display: table;
  width: 100%;
}
.logo-cell {
  display: table-cell;
  width: 82px;
  vertical-align: middle;
  text-align: center;
}
.logo-img {
  width: 76px;
  height: 76px;
  object-fit: contain;
}
.title-cell {
  display: table-cell;
  vertical-align: middle;
  text-align: center;
  padding: 0 10px;
}
.school-main-name {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 20px;
  font-weight: 900;
  color: #1e1b4b;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  margin-bottom: 2px;
}
.school-campus-badge {
  font-size: 11px;
  font-weight: 800;
  color: #dc2626;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 3px;
}
.school-contact-line {
  font-size: 8.5px;
  font-weight: 600;
  color: #334155;
  line-height: 1.3;
}
.school-motto-tag {
  font-size: 9.5px;
  font-weight: 800;
  color: #4338ca;
  font-style: italic;
  margin-top: 2px;
}
.doc-badge-cell {
  display: table-cell;
  width: 105px;
  vertical-align: middle;
  text-align: right;
}
.transcript-badge {
  background: #f8fafc;
  border: 1.5px solid #5b21b6;
  border-radius: 6px;
  padding: 6px;
  text-align: center;
}
.transcript-badge-title {
  font-size: 9px;
  font-weight: 900;
  color: #5b21b6;
  text-transform: uppercase;
  line-height: 1.1;
}
.transcript-ref-val {
  font-family: monospace;
  font-size: 8px;
  font-weight: 700;
  color: #0f172a;
  margin-top: 4px;
  word-break: break-all;
}

/* Document Title Bar */
.document-banner {
  background: linear-gradient(90deg, #5b21b6, #4338ca);
  color: #fff;
  text-align: center;
  padding: 4px 0;
  font-size: 11.5px;
  font-weight: 900;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  border-radius: 4px;
  margin-bottom: 8px;
}

/* Student Bio Box */
.student-bio-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #cbd5e1;
  margin-bottom: 10px;
  background: #faf5ff;
}
.student-bio-table td {
  padding: 3.5px 6px;
  border: 1px solid #cbd5e1;
  font-size: 9px;
}
.bio-label {
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  font-size: 8px;
  width: 14%;
  background: #f3e8ff;
}
.bio-val {
  font-weight: 800;
  color: #0f172a;
  width: 36%;
}

/* Academic Session Card */
.session-card {
  margin-bottom: 9px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  overflow: hidden;
}
.session-header {
  background: #ede9fe;
  border-bottom: 1px solid #cbd5e1;
  padding: 3px 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.session-title {
  font-weight: 900;
  color: #4c1d95;
  font-size: 10px;
  text-transform: uppercase;
}
.session-class-pill {
  font-weight: 800;
  color: #5b21b6;
  font-size: 9px;
}

/* Grade Table */
.grade-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 8.5px;
}
.grade-table th {
  background: #f1f5f9;
  color: #1e293b;
  font-weight: 800;
  text-align: center;
  padding: 3.5px 4px;
  border: 1px solid #cbd5e1;
  text-transform: uppercase;
  font-size: 7.5px;
}
.grade-table td {
  padding: 3px 4px;
  border: 1px solid #cbd5e1;
  text-align: center;
  font-weight: 600;
}
.grade-table td.subj-col {
  text-align: left;
  font-weight: 700;
  color: #0f172a;
  padding-left: 6px;
  width: 36%;
}
.grade-table tr:nth-child(even) {
  background: #fdfdfd;
}
.grade-badge-A { font-weight: 800; color: #047857; }
.grade-badge-B { font-weight: 800; color: #0284c7; }
.grade-badge-C { font-weight: 800; color: #b45309; }
.grade-badge-D { font-weight: 800; color: #c2410c; }
.grade-badge-E { font-weight: 800; color: #d97706; }
.grade-badge-F { font-weight: 800; color: #dc2626; }

.session-footer-row {
  background: #f8fafc;
  font-weight: 800;
  border-top: 1.5px solid #94a3b8;
}

/* Cumulative Summary Box */
.summary-container {
  display: table;
  width: 100%;
  margin-top: 6px;
  margin-bottom: 8px;
  border: 1.5px solid #5b21b6;
  border-radius: 4px;
  overflow: hidden;
}
.summary-col {
  display: table-cell;
  vertical-align: middle;
  padding: 6px 10px;
  border-right: 1px solid #e2e8f0;
  text-align: center;
}
.summary-col:last-child {
  border-right: none;
}
.summary-kpi-label {
  font-size: 7.5px;
  font-weight: 800;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}
.summary-kpi-val {
  font-size: 13px;
  font-weight: 900;
  color: #4338ca;
}

/* Grading Scale Legend */
.legend-box {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 4px 6px;
  margin-bottom: 8px;
  font-size: 7.5px;
  color: #475569;
  line-height: 1.4;
}
.legend-title {
  font-weight: 800;
  color: #1e293b;
  text-transform: uppercase;
  margin-bottom: 2px;
}

/* Authentication & Signatures */
.auth-grid {
  display: table;
  width: 100%;
  margin-top: 8px;
  padding-top: 4px;
}
.auth-cell {
  display: table-cell;
  width: 33.33%;
  vertical-align: bottom;
  text-align: center;
  padding: 0 8px;
}
.sig-line {
  border-top: 1.5px solid #0f172a;
  padding-top: 3px;
  margin-top: 28px;
  font-weight: 800;
  font-size: 8.5px;
  color: #0f172a;
  text-transform: uppercase;
}
.sig-title {
  font-size: 7.5px;
  color: #475569;
  font-weight: 600;
}
.stamp-box {
  border: 1.5px dashed #94a3b8;
  height: 52px;
  border-radius: 50%;
  width: 80px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 7px;
  font-weight: 800;
  text-transform: uppercase;
}

/* Security Disclaimer */
.security-note {
  margin-top: 8px;
  border-top: 1px dashed #cbd5e1;
  padding-top: 4px;
  font-size: 7px;
  color: #64748b;
  text-align: center;
  line-height: 1.3;
}

/* Print Overrides */
@media print {
  body {
    background: transparent;
    padding: 0;
  }
  .no-print {
    display: none !important;
  }
  .sheet {
    box-shadow: none;
    margin: 0;
    border: 2px solid #5b21b6;
    padding: 4mm 6mm;
    page-break-after: always;
    break-after: page;
  }
}
</style>
</head>
<body>

<div class="no-print">
  <div>
    <span style="color:#fff;font-weight:700;font-size:14px;">
      DLHS Official Transcript Generation Module
    </span>
    <span style="color:#94a3b8;font-size:12px;margin-left:8px;">
      <?= count($studentIds) ?> Student Record(s) Loaded
    </span>
  </div>
  <div class="btn-group">
    <button onclick="window.print()" class="print-btn">🖨 Print Official Transcript</button>
    <button onclick="window.close()" class="close-btn">Close</button>
  </div>
</div>

<?php foreach ($studentIds as $sId): 
    $tData = $this->compileStudentTranscriptData($sId, $scope);
    if (!$tData || empty($tData['sessions'])) continue;

    $stu = $tData['student'];
    $sch = $tData['school'];
    $cum = $tData['cumulative_summary'];
    $ver = $tData['verification'];
?>

<div class="sheet">
  <div class="content-layer">

    <!-- Official Header -->
    <div class="official-header">
      <div class="header-grid">
        <div class="logo-cell">
          <?php if (!empty($sch['logo_url'])): ?>
            <img src="<?= htmlspecialchars($sch['logo_url']) ?>" alt="Logo" class="logo-img">
          <?php else: ?>
            <img src="/favicon.png" alt="Logo" class="logo-img">
          <?php endif; ?>
        </div>
        <div class="title-cell">
          <div class="school-main-name"><?= htmlspecialchars($sch['name']) ?></div>
          <div class="school-campus-badge"><?= htmlspecialchars($sch['campus']) ?></div>
          <div class="school-contact-line">
            <?= htmlspecialchars($sch['address']) ?><br>
            Tel: <?= htmlspecialchars($sch['phone']) ?> • Email: <?= htmlspecialchars($sch['email']) ?> • Web: <?= htmlspecialchars($sch['website']) ?>
          </div>
          <div class="school-motto-tag">Motto: <?= htmlspecialchars($sch['motto']) ?></div>
        </div>
        <div class="doc-badge-cell">
          <div class="transcript-badge">
            <div class="transcript-badge-title"><?= $official ? "OFFICIAL TRANSCRIPT" : "STUDENT COPY" ?></div>
            <div class="transcript-ref-val"><?= htmlspecialchars($ver['reference_number']) ?></div>
            <div style="font-size:7px;color:#64748b;margin-top:2px;">Issued: <?= htmlspecialchars($ver['date_issued']) ?></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Document Banner -->
    <div class="document-banner">
      CUMULATIVE ACADEMIC TRANSCRIPT OF RECORD
    </div>

    <!-- Student Bio Grid -->
    <table class="student-bio-table">
      <tr>
        <td class="bio-label">STUDENT NAME</td>
        <td class="bio-val" style="font-size:10px;color:#3b0764;"><?= htmlspecialchars($stu['full_name']) ?></td>
        <td class="bio-label">ADMISSION NO.</td>
        <td class="bio-val"><?= htmlspecialchars($stu['admission_number']) ?></td>
      </tr>
      <tr>
        <td class="bio-label">GENDER</td>
        <td class="bio-val"><?= htmlspecialchars($stu['gender']) ?></td>
        <td class="bio-label">HOUSE / SPORT</td>
        <td class="bio-val"><?= htmlspecialchars($stu['house']) ?> / <?= htmlspecialchars($stu['sport_activities']) ?></td>
      </tr>
      <tr>
        <td class="bio-label">PROGRAMME / TRACK</td>
        <td class="bio-val">
          <?= stripos($stu['current_class'], 'BASIC') !== false ? 'JUNIOR SECONDARY (BASIC 7 - 9)' : 'SENIOR SECONDARY (SS 1 - 3)' ?>
        </td>
        <td class="bio-label">CURRENT STATUS</td>
        <td class="bio-val" style="color:#047857;"><?= htmlspecialchars($stu['current_class']) ?> (ACTIVE)</td>
      </tr>
    </table>

    <!-- Academic Sessions Grid -->
    <?php foreach ($tData['sessions'] as $sess): ?>
      <div class="session-card">
        <div class="session-header">
          <div class="session-title">
            <?= htmlspecialchars($sess['session_name']) ?> ACADEMIC SESSION
          </div>
          <div class="session-class-pill">
            CLASS: <?= htmlspecialchars($sess['class_name']) ?>
          </div>
        </div>

        <table class="grade-table">
          <thead>
            <tr>
              <th rowspan="2" style="width:36%;">SUBJECT</th>
              <th colspan="2">1ST TERM</th>
              <th colspan="2">2ND TERM</th>
              <th colspan="2">3RD TERM</th>
              <th colspan="3" style="background:#e0e7ff;color:#312e81;">ANNUAL COMPILATION</th>
            </tr>
            <tr>
              <th style="width:7%;">SCORE</th>
              <th style="width:6%;">GRD</th>
              <th style="width:7%;">SCORE</th>
              <th style="width:6%;">GRD</th>
              <th style="width:7%;">SCORE</th>
              <th style="width:6%;">GRD</th>
              <th style="width:8%;background:#e0e7ff;color:#312e81;">AVG (%)</th>
              <th style="width:7%;background:#e0e7ff;color:#312e81;">GRD</th>
              <th style="width:10%;background:#e0e7ff;color:#312e81;">REMARK</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($sess['subjects'] as $sb): 
                $t1 = $sb['terms']['1st Term'];
                $t2 = $sb['terms']['2nd Term'];
                $t3 = $sb['terms']['3rd Term'];
            ?>
              <tr>
                <td class="subj-col"><?= htmlspecialchars($sb['subject']) ?></td>
                <td><?= $t1 ? $t1['score'] : '—' ?></td>
                <td class="grade-badge-<?= $t1 ? $t1['grade'] : '' ?>"><?= $t1 ? $t1['grade'] : '—' ?></td>
                <td><?= $t2 ? $t2['score'] : '—' ?></td>
                <td class="grade-badge-<?= $t2 ? $t2['grade'] : '' ?>"><?= $t2 ? $t2['grade'] : '—' ?></td>
                <td><?= $t3 ? $t3['score'] : '—' ?></td>
                <td class="grade-badge-<?= $t3 ? $t3['grade'] : '' ?>"><?= $t3 ? $t3['grade'] : '—' ?></td>
                <td style="font-weight:800;background:#f5f3ff;color:#3730a3;"><?= $sb['annual_average'] ?></td>
                <td class="grade-badge-<?= $sb['annual_grade'] ?>" style="background:#f5f3ff;"><?= $sb['annual_grade'] ?></td>
                <td style="font-size:7.5px;font-weight:700;background:#f5f3ff;"><?= htmlspecialchars($sb['annual_remark']) ?></td>
              </tr>
            <?php endforeach; ?>
            <tr class="session-footer-row">
              <td class="subj-col">SESSION AVERAGE &amp; STANDING</td>
              <td colspan="2" style="color:#475569;"><?= $sess['term_averages']['1st Term'] ? $sess['term_averages']['1st Term'] . '%' : '—' ?></td>
              <td colspan="2" style="color:#475569;"><?= $sess['term_averages']['2nd Term'] ? $sess['term_averages']['2nd Term'] . '%' : '—' ?></td>
              <td colspan="2" style="color:#475569;"><?= $sess['term_averages']['3rd Term'] ? $sess['term_averages']['3rd Term'] . '%' : '—' ?></td>
              <td colspan="3" style="background:#e0e7ff;color:#1e1b4b;font-size:9px;font-weight:900;">
                <?= $sess['average_score'] ?>% (GRADE: <?= $sess['overall_grade'] ?>) • <?= htmlspecialchars($sess['promotion_status']) ?>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    <?php endforeach; ?>

    <!-- Grand Cumulative Academic Summary -->
    <div class="summary-container">
      <div class="summary-col">
        <div class="summary-kpi-label">SESSIONS COMPLETED</div>
        <div class="summary-kpi-val"><?= $cum['total_sessions_completed'] ?></div>
      </div>
      <div class="summary-col">
        <div class="summary-kpi-label">COURSES EVALUATED</div>
        <div class="summary-kpi-val"><?= $cum['total_subjects_evaluated'] ?></div>
      </div>
      <div class="summary-col">
        <div class="summary-kpi-label">CREDITS EARNED</div>
        <div class="summary-kpi-val" style="color:#059669;"><?= $cum['total_credits_earned'] ?></div>
      </div>
      <div class="summary-col">
        <div class="summary-kpi-label">CUMULATIVE AVERAGE</div>
        <div class="summary-kpi-val" style="color:#7c3aed;"><?= $cum['overall_average'] ?>%</div>
      </div>
      <div class="summary-col">
        <div class="summary-kpi-label">OVERALL GRADE</div>
        <div class="summary-kpi-val" style="color:#b45309;"><?= $cum['overall_grade'] ?></div>
      </div>
      <div class="summary-col" style="width:25%;">
        <div class="summary-kpi-label">CLASSIFICATION</div>
        <div style="font-size:10px;font-weight:800;color:#1e1b4b;"><?= htmlspecialchars($cum['overall_classification']) ?></div>
      </div>
    </div>

    <!-- Official Grading Scale Legend -->
    <div class="legend-box">
      <div class="legend-title">Official Grading System Reference</div>
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;">
        <span><strong>Senior Secondary:</strong> A: 80-100% (Distinction) | B: 70-79% (Very Good) | C: 60-69% (Credit) | D: 50-59% (Pass) | E: 45-49% (Pass) | F: 0-44% (Fail)</span>
        <span><strong>Junior Secondary:</strong> A: 70-100% | B: 60-69% | C: 50-59% | D: 45-49% | E: 40-44% | F: 0-39%</span>
      </div>
    </div>

    <!-- Signatures & Official Validation -->
    <div class="auth-grid">
      <div class="auth-cell">
        <div style="font-family:monospace;font-size:8px;color:#334155;margin-bottom:4px;">
          REF: <?= htmlspecialchars($ver['reference_number']) ?>
        </div>
        <div class="sig-line">EXAMINATION OFFICER</div>
        <div class="sig-title">Office of the Registrar &amp; Records</div>
      </div>

      <div class="auth-cell">
        <?php if ($official): ?>
          <div class="stamp-box">
            OFFICIAL<br>SCHOOL<br>SEAL
          </div>
        <?php endif; ?>
        <div class="sig-line">DATE OF ISSUE</div>
        <div class="sig-title"><?= htmlspecialchars($ver['date_issued']) ?></div>
      </div>

      <div class="auth-cell">
        <?php if (!empty($sch['signature_url']) && $official): ?>
          <img src="<?= htmlspecialchars($sch['signature_url']) ?>" style="height:32px;display:block;margin:0 auto 2px;" alt="Signature">
        <?php endif; ?>
        <div class="sig-line"><?= htmlspecialchars($ver['principal_name']) ?></div>
        <div class="sig-title"><?= htmlspecialchars($ver['principal_title']) ?></div>
      </div>
    </div>

    <!-- Tamper Evident Notice -->
    <div class="security-note">
      <strong>OFFICIAL SECURITY DECLARATION:</strong> This academic transcript is issued by Deeper Life High School without alteration or erasure. 
      Any addition, falsification, or unauthorized duplication invalidates this document. Electronic authenticity can be verified online at 
      <code><?= htmlspecialchars($ver['verification_url']) ?></code>
    </div>

  </div>
</div>

<?php endforeach; ?>

</body>
</html>
        <?php
    }
}
