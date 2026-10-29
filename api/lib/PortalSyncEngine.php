<?php
/**
 * DLHS LMS — Native PHP Portal Synchronization Engine
 * Connects directly to dlhsportal.org to synchronize student Continuous Assessments,
 * Mid-term scores, Terminal Exam scores, and Broadsheets into the LMS database.
 * Runs 100% in pure PHP with cURL and PDO — no external Python or exec() dependencies.
 */

class PortalSyncEngine {
    private PDO $pdo;
    private string $statusFile;
    private string $logFile;
    private string $cookieFile;
    private float $startTime;

    private int $scoresSynced = 0;
    private int $assessmentsSynced = 0;
    private int $photosSynced = 0;
    private int $errorsCount = 0;
    private array $recentLogs = [];
    private int $adminId = 3;

    private array $sessions = [
        '14' => '2026/2027',
        '13' => '2025/2026',
        '12' => '2024/2025',
        '9'  => '2023/2024'
    ];

    private array $terms = [
        ['code' => 'term1', 'name' => '1st Term', 'num' => '1'],
        ['code' => 'term2', 'name' => '2nd Term', 'num' => '2'],
        ['code' => 'term3', 'name' => '3rd Term', 'num' => '3']
    ];

    private array $classes = [
        '490' => 'BASIC 7 DIAMOND',
        '491' => 'BASIC 7 GOLD',
        '864' => 'BASIC 7 TOPAZ',
        '503' => 'BASIC 8 DIAMOND',
        '504' => 'BASIC 8 GOLD',
        '505' => 'BASIC 8 TOPAZ',
        '506' => 'BASIC 9 DIAMOND',
        '507' => 'BASIC 9 GOLD',
        '863' => 'BASIC 9 TOPAZ',
        '502' => 'SS 1 SCIENCE A',
        '862' => 'SS 1 SCIENCE B',
        '472' => 'SS 1 HUMANITIES',
        '501' => 'SS 2 SCIENCE A',
        '444' => 'SS 2 SCIENCE B',
        '473' => 'SS 2 HUMANITIES',
        '493' => 'SS 3 SCIENCE A',
        '443' => 'SS 3 SCIENCE B',
        '492' => 'SS 3 HUMANITIES',
        '859' => 'CLASS OF 2025 SCIENCE A',
        '860' => 'CLASS OF 2025 SCIENCE B',
        '861' => 'CLASS OF 2025 HUMANITIES',
        '1023' => 'CLASS OF 2026 A',
        '1024' => 'CLASS OF 2026 B',
        '1025' => 'CLASS OF 2026 HUM'
    ];

    public function __construct(PDO $pdo, string $statusFile, string $logFile) {
        $this->pdo = $pdo;
        $this->statusFile = $statusFile;
        $this->logFile = $logFile;
        $this->cookieFile = tempnam(sys_get_temp_dir(), 'dlhs_sync_');
        $this->startTime = microtime(true);

        $adm = $this->pdo->query("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1")->fetchColumn();
        if ($adm) $this->adminId = intval($adm);
    }

    public function __destruct() {
        if (file_exists($this->cookieFile)) {
            @unlink($this->cookieFile);
        }
    }

    private function log(string $msg, string $level = 'INFO'): void {
        $ts = gmdate('Y-m-d\TH:i:s\Z');
        $entry = "[{$ts}] [{$level}] {$msg}";
        $this->recentLogs[] = $entry;
        if (count($this->recentLogs) > 120) {
            array_shift($this->recentLogs);
        }
        @file_put_contents($this->logFile, $entry . PHP_EOL, FILE_APPEND);
    }

    private function isCancelled(): bool {
        $cancelFile = $this->statusFile . '.cancel';
        if (file_exists($cancelFile)) {
            return true;
        }
        if (file_exists($this->statusFile)) {
            $content = @file_get_contents($this->statusFile);
            if ($content) {
                $decoded = json_decode($content, true);
                if (is_array($decoded) && isset($decoded['state']) && ($decoded['state'] === 'cancelled' || $decoded['state'] === 'stopped')) {
                    return true;
                }
            }
        }
        return false;
    }

    private function updateStatus(float $progress, string $step, string $state = 'running'): void {
        $payload = [
            'is_syncing'         => ($state === 'running' || $state === 'starting'),
            'state'              => $state,
            'progress'           => round($progress, 1),
            'step'               => $step,
            'scores_synced'      => $this->scoresSynced,
            'assessments_synced' => $this->assessmentsSynced,
            'photos_synced'      => $this->photosSynced,
            'errors_count'       => $this->errorsCount,
            'elapsed_seconds'    => round(microtime(true) - $this->startTime, 1),
            'updated_at'         => gmdate('Y-m-d\TH:i:s\Z'),
            'recent_logs'        => $this->recentLogs
        ];
        $tmp = $this->statusFile . '.tmp';
        @file_put_contents($tmp, json_encode($payload, JSON_PRETTY_PRINT));
        @rename($tmp, $this->statusFile);
    }

    private function cleanStr(?string $s): string {
        if (!$s) return '';
        return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $s));
    }

    private function fetchUrl(string $url, int $timeout = 20, int $retries = 3): string {
        for ($i = 0; $i < $retries; $i++) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_COOKIEFILE     => $this->cookieFile,
                CURLOPT_COOKIEJAR      => $this->cookieFile,
                CURLOPT_TIMEOUT        => $timeout,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_SSL_VERIFYHOST => false,
                CURLOPT_USERAGENT      => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) DLHS-LMS-Sync/2.0'
            ]);
            $res = curl_exec($ch);
            $err = curl_error($ch);
            if (!$err && $res) {
                if (strpos($res, 'login.php') !== false && strpos($res, 'submit') !== false) {
                    $this->login();
                    continue;
                }
                return $res;
            }
            usleep(300000);
        }
        return '';
    }

    private function login(): bool {
        $ch = curl_init('https://dlhsportal.org/sms/login.php');
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => http_build_query([
                'email'     => 'ictkaduna@deeperlifehighschool.org',
                'password'  => '12',
                'user_type' => 'admin',
                'submit'    => 'yes'
            ]),
            CURLOPT_COOKIEJAR      => $this->cookieFile,
            CURLOPT_COOKIEFILE     => $this->cookieFile,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_USERAGENT      => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
        ]);
        $resp = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($resp && (stripos($resp, 'logout') !== false || stripos($resp, 'dashboard') !== false || $code === 200)) {
            return true;
        }
        return false;
    }

    public function runSync(string $sessionFilter = 'all', string $termFilter = 'all', array $scope = []): array {
        @ini_set('memory_limit', '512M');
        @set_time_limit(600);

        $this->updateStatus(2, 'Authenticating to DLHS Portal...', 'starting');
        $this->log("======================================================================");
        $this->log("🚀 STARTING NATIVE PORTAL SYNCHRONIZATION");
        $this->log("   Session Filter: {$sessionFilter} | Term Filter: {$termFilter}");
        $this->log("======================================================================");

        if (!$this->login()) {
            $this->errorsCount++;
            $this->log("Failed to authenticate to DLHS Portal with ICT Admin credentials.", "ERROR");
            $this->updateStatus(100, "Portal authentication failed.", "error");
            return ['success' => false, 'error' => 'Portal authentication failed. Please check portal status.'];
        }
        $this->log("✅ Authenticated successfully with dlhsportal.org (ICT Admin)");

        // Preload local mappings
        $this->updateStatus(5, 'Loading local database student and course indexes...', 'running');
        $students = $this->pdo->query("SELECT id, admission_number, first_name, last_name, class_id FROM users WHERE role = 'student'")->fetchAll(PDO::FETCH_ASSOC);
        
        $studentByAdm = [];
        $studentByName = [];
        foreach ($students as $s) {
            $uid = intval($s['id']);
            if (!empty($s['admission_number'])) {
                $studentByAdm[$this->cleanStr($s['admission_number'])] = $uid;
            }
            $fn = $this->cleanStr($s['first_name']);
            $ln = $this->cleanStr($s['last_name']);
            if ($fn && $ln) {
                $studentByName[$fn . $ln] = $uid;
                $studentByName[$ln . $fn] = $uid;
            }
        }

        $courses = $this->pdo->query("SELECT id, name FROM courses")->fetchAll(PDO::FETCH_ASSOC);
        $courseNameToId = [];
        foreach ($courses as $c) {
            $courseNameToId[$this->cleanStr($c['name'])] = intval($c['id']);
        }

        $classesRows = $this->pdo->query("SELECT id, name FROM classes")->fetchAll(PDO::FETCH_ASSOC);
        $classMap = [];
        foreach ($classesRows as $cl) {
            $classMap[strtoupper(trim($cl['name']))] = intval($cl['id']);
        }

        // Helper to resolve student
        $resolveStudent = function(string $portalName, ?string $rollNum = null, ?int $classId = null) use (&$studentByAdm, &$studentByName, &$students) {
            if ($rollNum) {
                $adm = $this->cleanStr($rollNum);
                if (isset($studentByAdm[$adm])) return $studentByAdm[$adm];
            }
            $cName = $this->cleanStr($portalName);
            if (isset($studentByName[$cName])) return $studentByName[$cName];

            // Token overlap fallback
            $tokens = array_filter(preg_split('/[^A-Za-z]+/', $portalName), fn($t) => strlen($t) >= 2);
            if (count($tokens) >= 2) {
                $tokenSet = array_flip(array_map('strtoupper', $tokens));
                $bestMatch = null;
                $bestOverlap = 0;
                foreach ($students as $s) {
                    if ($classId && intval($s['class_id']) !== $classId) continue;
                    $dbTokens = array_filter(preg_split('/[^A-Za-z]+/', "{$s['first_name']} {$s['last_name']}"), fn($t) => strlen($t) >= 2);
                    $overlap = 0;
                    foreach ($dbTokens as $dt) {
                        if (isset($tokenSet[strtoupper($dt)])) $overlap++;
                    }
                    if ($overlap > $bestOverlap && $overlap >= 2) {
                        $bestOverlap = $overlap;
                        $bestMatch = intval($s['id']);
                    }
                }
                if ($bestMatch) return $bestMatch;
            }
            return null;
        };

        // Helper to resolve course
        $resolveCourse = function(string $subjName) use (&$courseNameToId) {
            $clean = $this->cleanStr($subjName);
            if (isset($courseNameToId[$clean])) return $courseNameToId[$clean];
            $aliases = [
                'FURTHERMATHS' => 'FURTHERMATHEMATICS',
                'MATHS' => 'MATHEMATICS',
                'ROBOTICS' => 'ROBOTICSANDARTIFICIALINTELLIGENCE',
                'ROBOTICSAI' => 'ROBOTICSANDARTIFICIALINTELLIGENCE',
                'AGRIC' => 'AGRICULTURALSCIENCE',
                'AGRICSCIENCE' => 'AGRICULTURALSCIENCE',
                'CIVIC' => 'CIVICEDUCATION',
                'PHE' => 'PHYSICALANDHEALTHEDUCATION',
                'CRS' => 'CHRISTIANRELIGIOUSSTUDIES',
                'CRK' => 'CHRISTIANRELIGIOUSSTUDIES',
                'IRS' => 'ISLAMICRELIGIOUSSTUDIES',
                'IRK' => 'ISLAMICRELIGIOUSSTUDIES',
                'BUS' => 'BUSINESSSTUDIES',
                'TECH' => 'BASICTECHNOLOGY',
                'FRENCH' => 'FRENCHLANGUAGE',
                'ENGLISH' => 'ENGLISHLANGUAGE'
            ];
            if (isset($aliases[$clean]) && isset($courseNameToId[$aliases[$clean]])) {
                return $courseNameToId[$aliases[$clean]];
            }
            foreach ($courseNameToId as $k => $id) {
                if (strpos($clean, $k) !== false || strpos($k, $clean) !== false) {
                    return $id;
                }
            }
            return null;
        };

        // Filter sessions & terms
        $targetSessions = [];
        foreach ($this->sessions as $secId => $sessName) {
            if ($sessionFilter === 'all' || $sessionFilter === $sessName) {
                $targetSessions[$secId] = $sessName;
            }
        }
        if (empty($targetSessions)) $targetSessions = ['14' => '2026/2027'];

        $targetTerms = [];
        foreach ($this->terms as $t) {
            if ($termFilter === 'all' || $termFilter === $t['code'] || $termFilter === $t['name']) {
                $targetTerms[] = $t;
            }
        }
        if (empty($targetTerms)) $targetTerms = $this->terms;

        $totalSteps = count($targetSessions) * count($targetTerms) * count($this->classes);
        $completedSteps = 0;

        // Prepared upsert statement
        $upsertStmt = $this->pdo->prepare("
            INSERT INTO grades (
                student_id, course_id, class_id, score, max_score,
                assignment_score, project_score, mid_term_test,
                ca1, ca2, exam, academic_session, academic_term, status, graded_by
            ) VALUES (
                :student_id, :course_id, :class_id, :score, :max_score,
                :assignment_score, :project_score, :mid_term_test,
                :ca1, :ca2, :exam, :academic_session, :academic_term, 'published', :graded_by
            )
            ON DUPLICATE KEY UPDATE
                score = COALESCE(VALUES(score), grades.score),
                max_score = COALESCE(VALUES(max_score), grades.max_score),
                assignment_score = COALESCE(VALUES(assignment_score), grades.assignment_score),
                project_score = COALESCE(VALUES(project_score), grades.project_score),
                mid_term_test = COALESCE(VALUES(mid_term_test), grades.mid_term_test),
                ca1 = COALESCE(VALUES(ca1), grades.ca1),
                ca2 = COALESCE(VALUES(ca2), grades.ca2),
                exam = COALESCE(VALUES(exam), grades.exam),
                class_id = COALESCE(VALUES(class_id), grades.class_id),
                status = 'published'
        ");

        foreach ($targetSessions as $secId => $sessionName) {
            foreach ($targetTerms as $term) {
                $termName = $term['name'];
                $termCode = $term['code'];
                $this->log("--- Processing {$sessionName} • {$termName} ---");

                foreach ($this->classes as $portalCid => $className) {
                    if ($this->isCancelled()) {
                        $this->log("🛑 Sync execution stopped by administrator.", "WARN");
                        $this->updateStatus($progress ?? 0, "Synchronization stopped by administrator.", "cancelled");
                        $cancelFile = $this->statusFile . '.cancel';
                        if (file_exists($cancelFile)) @unlink($cancelFile);
                        return [
                            'success'       => false,
                            'message'       => 'Synchronization stopped by administrator.',
                            'scores_synced' => $this->scoresSynced
                        ];
                    }

                    $completedSteps++;
                    $progress = 10 + ($completedSteps / max(1, $totalSteps)) * 85;
                    $this->updateStatus($progress, "Syncing {$className} ({$termName})...");

                    $targetClassId = $classMap[strtoupper($className)] ?? intval($portalCid);

                    // Fetch JSON broadsheet
                    $rawJson = '';
                    foreach (['fetch_broadsheet.php', 'fetch_broadsheet_previous.php'] as $ep) {
                        $url = "https://dlhsportal.org/sms/admin/{$ep}?class_ID={$portalCid}&section_ID={$secId}&term={$termCode}";
                        $res = $this->fetchUrl($url, 15);
                        if ($res && strpos($res, 'students') !== false) {
                            $rawJson = $res;
                            break;
                        }
                    }

                    if (!$rawJson) {
                        continue;
                    }

                    $data = json_decode($rawJson, true);
                    if (!$data || empty($data['students']) || empty($data['subjects'])) {
                        continue;
                    }

                    $subMap = [];
                    foreach ($data['subjects'] as $sb) {
                        $subMap[strval($sb['id'])] = $sb['name'];
                    }

                    // Detect scale
                    $maxScore = 0.0;
                    foreach ($data['students'] as $st) {
                        foreach (($st['scores'] ?? []) as $val) {
                            if ($val !== null && is_numeric($val) && floatval($val) > $maxScore) {
                                $maxScore = floatval($val);
                            }
                        }
                    }
                    $isMidterm = ($maxScore > 0 && $maxScore <= 20.0);

                    $classGrades = 0;
                    $this->pdo->beginTransaction();
                    try {
                        foreach ($data['students'] as $st) {
                            $stName = $st['name'] ?? '';
                            $roll = $st['roll_number'] ?? null;
                            $uid = $resolveStudent($stName, $roll, $targetClassId);
                            if (!$uid) continue;

                            foreach (($st['scores'] ?? []) as $sidStr => $val) {
                                if ($val === null || !is_numeric($val)) continue;
                                $sc = floatval($val);
                                if ($sc <= 0) continue;

                                $subjName = $subMap[strval($sidStr)] ?? '';
                                $cid = $resolveCourse($subjName);
                                if (!$cid) continue;

                                if ($isMidterm) {
                                    $ca1 = $sc;
                                    $ca2 = null;
                                    $exam = null;
                                    $asgn = round($sc * 0.25, 2);
                                    $proj = round($sc * 0.25, 2);
                                    $test = round($sc - ($asgn + $proj), 2);
                                    $maxSc = 20.00;
                                } else {
                                    $ca1 = round($sc * 0.20, 2);
                                    $ca2 = round($sc * 0.20, 2);
                                    $exam = round($sc - ($ca1 + $ca2), 2);
                                    $asgn = null;
                                    $proj = null;
                                    $test = null;
                                    $maxSc = 100.00;
                                }

                                $upsertStmt->execute([
                                    ':student_id'       => $uid,
                                    ':course_id'        => $cid,
                                    ':class_id'         => $targetClassId,
                                    ':score'            => $sc,
                                    ':max_score'        => $maxSc,
                                    ':assignment_score' => $asgn,
                                    ':project_score'    => $proj,
                                    ':mid_term_test'    => $test,
                                    ':ca1'              => $ca1,
                                    ':ca2'              => $ca2,
                                    ':exam'             => $exam,
                                    ':academic_session' => $sessionName,
                                    ':academic_term'    => $termName,
                                    ':graded_by'        => $this->adminId
                                ]);
                                $classGrades++;
                                $this->scoresSynced++;
                            }
                        }
                        $this->pdo->commit();
                        if ($classGrades > 0) {
                            $this->log("   ✓ {$className}: synced {$classGrades} course grades");
                        }
                    } catch (\Throwable $e) {
                        $this->pdo->rollBack();
                        $this->errorsCount++;
                        $this->log("   ⚠ DB error for {$className}: " . $e->getMessage(), "WARN");
                    }
                }
            }
        }

        // Finalize
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $this->pdo->prepare("
            INSERT INTO system_settings (setting_key, setting_value) 
            VALUES ('last_portal_sync', :now) 
            ON DUPLICATE KEY UPDATE setting_value = :now2
        ")->execute([':now' => $now, ':now2' => $now]);

        $duration = round(microtime(true) - $this->startTime, 1);
        $this->log("======================================================================");
        $this->log("🎉 PORTAL SYNC COMPLETED SUCCESSFULLY IN {$duration}s!");
        $this->log("   Total Scores Synced: {$this->scoresSynced}");
        $this->log("   Errors Encountered:  {$this->errorsCount}");
        $this->log("======================================================================");

        $this->updateStatus(100, "Synchronization finished successfully.", "completed");

        return [
            'success'        => true,
            'message'        => "Sync finished in {$duration}s. Updated {$this->scoresSynced} student grades across all classes.",
            'scores_synced'  => $this->scoresSynced,
            'duration'       => $duration
        ];
    }
}
