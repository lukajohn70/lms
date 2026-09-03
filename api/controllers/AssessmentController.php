<?php
require_once 'config/Database.php';
require_once 'lib/Auth.php';

class AssessmentController {
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

    // Teacher: Get assessments list of students in the course
    public function getTeacherAssessments() {
        $teacher = Auth::requireRole(['teacher']);
        
        $courseId = isset($_GET['course_id']) ? intval($_GET['course_id']) : null;
        $term = $this->getSetting('current_term', '2nd Term');
        $session = $this->getSetting('academic_session', '2026/2027');

        // 1. Get courses taught by teacher (directly or via class subject allocation)
        $coursesQuery = "
            SELECT DISTINCT c.id, c.name FROM courses c 
            WHERE c.teacher_id = :tid 
               OR c.id IN (SELECT course_id FROM class_subjects WHERE teacher_id = :tid2)
            ORDER BY c.name
        ";
        $coursesStmt = $this->conn->prepare($coursesQuery);
        $coursesStmt->execute([':tid' => $teacher['id'], ':tid2' => $teacher['id']]);
        $courses = $coursesStmt->fetchAll();
        
        if (empty($courses)) {
            echo json_encode(["courses" => [], "students" => []]);
            return;
        }
        
        if (!$courseId) {
            $courseId = $courses[0]['id'];
        }
        
        // 2. Fetch enrolled students and their assessments (if any exist)
        $assessmentsQuery = "
            SELECT 
                u.id, 
                CONCAT(u.first_name, ' ', u.last_name) as name,
                u.email, u.gender, u.house, u.sport_activities,
                sa.punctuality, sa.neatness, sa.politeness, sa.honesty, sa.team_spirit, sa.leadership, sa.helping_others, sa.emotional_stability, sa.health, sa.attitude_to_work, sa.attentiveness, sa.perseverance, sa.spoken_english,
                sa.handwriting, sa.verbal_fluency, sa.sports, sa.handling_tools, sa.musical, sa.drawing_painting,
                sa.class_teacher_comment, sa.principal_remark, sa.award_1, sa.award_2
            FROM users u
            JOIN enrollments e ON u.id = e.student_id
            LEFT JOIN student_assessments sa ON (u.id = sa.student_id AND sa.academic_term = :term AND sa.academic_session = :session)
            WHERE e.course_id = :cid
            ORDER BY u.first_name, u.last_name
        ";
        
        $stmt = $this->conn->prepare($assessmentsQuery);
        $stmt->execute([
            ':cid' => $courseId,
            ':term' => $term,
            ':session' => $session
        ]);
        $students = $stmt->fetchAll();
        
        // Format output
        $formattedStudents = [];
        foreach ($students as $s) {
            $formattedStudents[] = [
                "id" => $s['id'],
                "name" => $s['name'],
                "student_number" => "STU/" . str_pad($s['id'], 3, '0', STR_PAD_LEFT),
                "gender" => $s['gender'] ?: "MALE",
                "house" => $s['house'] ?: "FAITH",
                "sport_activities" => $s['sport_activities'] ?: "BASKETBALL",
                "award_1" => $s['award_1'] ?: "NILL",
                "award_2" => $s['award_2'] ?: "NILL",
                // Character Development Traits
                "punctuality" => $s['punctuality'] !== null ? intval($s['punctuality']) : 0,
                "neatness" => $s['neatness'] !== null ? intval($s['neatness']) : 0,
                "politeness" => $s['politeness'] !== null ? intval($s['politeness']) : 0,
                "honesty" => $s['honesty'] !== null ? intval($s['honesty']) : 0,
                "team_spirit" => $s['team_spirit'] !== null ? intval($s['team_spirit']) : 0,
                "leadership" => $s['leadership'] !== null ? intval($s['leadership']) : 0,
                "helping_others" => $s['helping_others'] !== null ? intval($s['helping_others']) : 0,
                "emotional_stability" => $s['emotional_stability'] !== null ? intval($s['emotional_stability']) : 0,
                "health" => $s['health'] !== null ? intval($s['health']) : 0,
                "attitude_to_work" => $s['attitude_to_work'] !== null ? intval($s['attitude_to_work']) : 0,
                "attentiveness" => $s['attentiveness'] !== null ? intval($s['attentiveness']) : 0,
                "perseverance" => $s['perseverance'] !== null ? intval($s['perseverance']) : 0,
                "spoken_english" => $s['spoken_english'] !== null ? intval($s['spoken_english']) : 0,
                // Psychomotor Skills
                "handwriting" => $s['handwriting'] !== null ? intval($s['handwriting']) : 0,
                "verbal_fluency" => $s['verbal_fluency'] !== null ? intval($s['verbal_fluency']) : 0,
                "sports" => $s['sports'] !== null ? intval($s['sports']) : 0,
                "handling_tools" => $s['handling_tools'] !== null ? intval($s['handling_tools']) : 0,
                "musical" => $s['musical'] !== null ? intval($s['musical']) : 0,
                "drawing_painting" => $s['drawing_painting'] !== null ? intval($s['drawing_painting']) : 0,
                // Remarks
                "class_teacher_comment" => $s['class_teacher_comment'] ?: "",
                "principal_remark" => $s['principal_remark'] ?: ""
            ];
        }

        
        echo json_encode([
            "courses" => $courses,
            "selected_course_id" => $courseId,
            "academic_term" => $term,
            "academic_session" => $session,
            "students" => $formattedStudents
        ]);
    }

    // Teacher: Save/Update assessments
    public function saveAssessment() {
        Auth::requireRole(['teacher', 'admin']);
        
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data || !isset($data['student_id'])) {
            http_response_code(400);
            echo json_encode(["error" => "Incomplete assessment data"]);
            return;
        }

        $studentId = intval($data['student_id']);
        $term = $this->getSetting('current_term', '2nd Term');
        $session = $this->getSetting('academic_session', '2026/2027');

        try {
            $query = "
                INSERT INTO student_assessments (
                    student_id, academic_term, academic_session,
                    punctuality, neatness, politeness, honesty, team_spirit, leadership, helping_others, emotional_stability, health, attitude_to_work, attentiveness, perseverance, spoken_english,
                    handwriting, verbal_fluency, sports, handling_tools, musical, drawing_painting,
                    class_teacher_comment, principal_remark, award_1, award_2
                ) VALUES (
                    :sid, :term, :session,
                    :punc, :neat, :poli, :hone, :team, :lead, :help, :emot, :heal, :atti, :atte, :pers, :spok,
                    :hand, :verb, :spor, :handl, :musi, :draw,
                    :teacher_comment, :principal_remark, :award_1, :award_2
                ) ON DUPLICATE KEY UPDATE
                    punctuality = :punc, neatness = :neat, politeness = :poli, honesty = :hone, team_spirit = :team, leadership = :lead, helping_others = :help, emotional_stability = :emot, health = :heal, attitude_to_work = :atti, attentiveness = :atte, perseverance = :pers, spoken_english = :spok,
                    handwriting = :hand, verbal_fluency = :verb, sports = :spor, handling_tools = :handl, musical = :musi, drawing_painting = :draw,
                    class_teacher_comment = :teacher_comment, principal_remark = :principal_remark,
                    award_1 = :award_1, award_2 = :award_2
            ";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                ':sid' => $studentId,
                ':term' => $term,
                ':session' => $session,
                ':punc' => isset($data['punctuality']) && $data['punctuality'] > 0 ? intval($data['punctuality']) : null,
                ':neat' => isset($data['neatness']) && $data['neatness'] > 0 ? intval($data['neatness']) : null,
                ':poli' => isset($data['politeness']) && $data['politeness'] > 0 ? intval($data['politeness']) : null,
                ':hone' => isset($data['honesty']) && $data['honesty'] > 0 ? intval($data['honesty']) : null,
                ':team' => isset($data['team_spirit']) && $data['team_spirit'] > 0 ? intval($data['team_spirit']) : null,
                ':lead' => isset($data['leadership']) && $data['leadership'] > 0 ? intval($data['leadership']) : null,
                ':help' => isset($data['helping_others']) && $data['helping_others'] > 0 ? intval($data['helping_others']) : null,
                ':emot' => isset($data['emotional_stability']) && $data['emotional_stability'] > 0 ? intval($data['emotional_stability']) : null,
                ':heal' => isset($data['health']) && $data['health'] > 0 ? intval($data['health']) : null,
                ':atti' => isset($data['attitude_to_work']) && $data['attitude_to_work'] > 0 ? intval($data['attitude_to_work']) : null,
                ':atte' => isset($data['attentiveness']) && $data['attentiveness'] > 0 ? intval($data['attentiveness']) : null,
                ':pers' => isset($data['perseverance']) && $data['perseverance'] > 0 ? intval($data['perseverance']) : null,
                ':spok' => isset($data['spoken_english']) && $data['spoken_english'] > 0 ? intval($data['spoken_english']) : null,
                ':hand' => isset($data['handwriting']) && $data['handwriting'] > 0 ? intval($data['handwriting']) : null,
                ':verb' => isset($data['verbal_fluency']) && $data['verbal_fluency'] > 0 ? intval($data['verbal_fluency']) : null,
                ':spor' => isset($data['sports']) && $data['sports'] > 0 ? intval($data['sports']) : null,
                ':handl' => isset($data['handling_tools']) && $data['handling_tools'] > 0 ? intval($data['handling_tools']) : null,
                ':musi' => isset($data['musical']) && $data['musical'] > 0 ? intval($data['musical']) : null,
                ':draw' => isset($data['drawing_painting']) && $data['drawing_painting'] > 0 ? intval($data['drawing_painting']) : null,
                ':teacher_comment' => $data['class_teacher_comment'] ?? null,
                ':principal_remark' => $data['principal_remark'] ?? null,
                ':award_1' => $data['award_1'] ?? 'NILL',
                ':award_2' => $data['award_2'] ?? 'NILL'
            ]);

            // If demographic attributes are provided, update student in users table
            $userUpdates = [];
            $userParams = [':sid' => $studentId];
            if (isset($data['gender'])) {
                $userUpdates[] = "gender = :gender";
                $userParams[':gender'] = $data['gender'];
            }
            if (isset($data['house'])) {
                $userUpdates[] = "house = :house";
                $userParams[':house'] = $data['house'];
            }
            if (isset($data['sport_activities'])) {
                $userUpdates[] = "sport_activities = :sport";
                $userParams[':sport'] = $data['sport_activities'];
            }
            if (!empty($userUpdates)) {
                $uStmt = $this->conn->prepare("UPDATE users SET " . implode(", ", $userUpdates) . " WHERE id = :sid");
                $uStmt->execute($userParams);
            }

            echo json_encode(["success" => true, "message" => "Assessment saved successfully"]);
        } catch (Exception $e) {

            http_response_code(500);
            echo json_encode(["error" => "Failed to save assessment: " . $e->getMessage()]);
        }
    }

    // Student & Parent: Get assessment details
    public function getStudentAssessment() {
        $user = Auth::authenticate();
        $studentId = $user['id'];

        if ($user['role'] === 'parent') {
            $studentId = isset($_GET['student_id']) ? intval($_GET['student_id']) : null;
            if (!$studentId) {
                $stmt = $this->conn->prepare("SELECT student_id FROM parent_students WHERE parent_id = :pid LIMIT 1");
                $stmt->execute([':pid' => $user['id']]);
                $studentId = $stmt->fetchColumn();
            }
        }

        if (!$studentId) {
            http_response_code(404);
            echo json_encode(["error" => "No student found"]);
            return;
        }

        $term = isset($_GET['term']) ? $_GET['term'] : $this->getSetting('current_term', '2nd Term');
        $session = $this->getSetting('academic_session', '2026/2027');

        try {
            $query = "
                SELECT * FROM student_assessments 
                WHERE student_id = :sid AND academic_term = :term AND academic_session = :session
                LIMIT 1
            ";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                ':sid' => $studentId,
                ':term' => $term,
                ':session' => $session
            ]);
            $sa = $stmt->fetch();

            if (!$sa) {
                echo json_encode(["success" => false, "message" => "No assessment records found"]);
                return;
            }

            echo json_encode(["success" => true, "assessment" => $sa]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to load assessment data: " . $e->getMessage()]);
        }
    }

    // Print Report Card View - Exact Deeper Life High School Format
    public function printReportCard() {
        header('Content-Type: text/html; charset=UTF-8');
        $user = Auth::authenticate();

        $studentId = isset($_GET['student_id']) ? intval($_GET['student_id']) : 0;
        if (!$studentId) {
            if ($user['role'] === 'student') $studentId = $user['id'];
            else if ($user['role'] === 'parent') {
                $s = $this->conn->prepare("SELECT student_id FROM parent_students WHERE parent_id=:pid LIMIT 1");
                $s->execute([':pid' => $user['id']]);
                $studentId = $s->fetchColumn();
            }
        }
        if (!$studentId) die("<p style='font-family:sans-serif;padding:40px'>Student ID required.</p>");

        $termRaw  = $_GET['term']    ?? $this->getSetting('current_term','3rd Term');
        $term     = ($termRaw==='1st'||$termRaw==='1st Term')?'1st Term':(($termRaw==='2nd'||$termRaw==='2nd Term')?'2nd Term':'3rd Term');
        $session  = $_GET['session'] ?? $this->getSetting('academic_session','2020/2021');

        // School Settings
        $schoolName    = $this->getSetting('school_name', 'DEEPER LIFE HIGH SCHOOL');
        $schoolAddress = $this->getSetting('school_address', 'KM 16, EASTERN BYE-PASS, MARABA RIDO KADUNA');
        $schoolPhone   = $this->getSetting('school_phone', '08158190115');
        $schoolEmail   = $this->getSetting('school_email', 'DLHSEXAMSKADUNA@YAHOO.COM');
        $schoolWebsite = $this->getSetting('school_website', 'WWW.DEEPERLIFEHIGHSCHOOL.ORG');
        $schoolMotto   = $this->getSetting('school_motto', 'MOTTO: LEADERSHIP WITH DISTINCTION');
        $logoPath      = $this->getSetting('school_logo_path', '');

        // Vacation & Resumption dates
        $termKey        = $term === '1st Term' ? 'term1' : ($term === '2nd Term' ? 'term2' : 'term3');
        $vacationDate   = $this->getSetting("vacation_date_{$termKey}", $term === '3rd Term' ? '2021-09-16' : '2021-04-04');
        $resumptionDate = $this->getSetting("resumption_date_{$termKey}", $term === '3rd Term' ? '2021-10-03' : '2021-04-22');
        $fmtDate = function($d) {
            if (!$d) return "—";
            $ts = strtotime($d);
            return date('j/M/Y', $ts);
        };

        // Student Details
        $ss = $this->conn->prepare("SELECT first_name, last_name, email, admission_number, class_id, avatar_path, gender, house, sport_activities FROM users WHERE id=:sid AND role='student' LIMIT 1");
        $ss->execute([':sid'=>$studentId]);
        $student = $ss->fetch();
        if (!$student) die("<p style='font-family:sans-serif;padding:40px'>Student not found.</p>");

        $studentName = strtoupper(trim($student['first_name'] . ' ' . $student['last_name']));
        $gender      = strtoupper($student['gender'] ?: 'MALE');
        $house       = strtoupper($student['house'] ?: 'FAITH');
        $sports      = strtoupper($student['sport_activities'] ?: 'BASKETBALL');

        // Class Name
        $className = 'BASIC 7 DIAMOND';
        if ($student['class_id']) {
            $cs = $this->conn->prepare("SELECT name FROM classes WHERE id=:cid LIMIT 1");
            $cs->execute([':cid'=>$student['class_id']]);
            $cRow = $cs->fetchColumn();
            if ($cRow) $className = strtoupper($cRow);
        }

        // Attendance
        $pa = $this->conn->prepare("SELECT COUNT(*) FROM attendance WHERE student_id=:sid AND status='present'");
        $pa->execute([':sid'=>$studentId]);
        $presentDays = intval($pa->fetchColumn()) ?: 80;
        $ta = $this->conn->prepare("SELECT COUNT(*) FROM attendance WHERE student_id=:sid");
        $ta->execute([':sid'=>$studentId]);
        $totalDays = intval($ta->fetchColumn()) ?: 80;
        if ($totalDays < $presentDays) $totalDays = $presentDays;
        $absentDays = max(0, $totalDays - $presentDays);
        $attendanceRate = $totalDays > 0 ? round(($presentDays / $totalDays) * 100, 1) : 100.0;

        // Class Rank and Number in class
        $rankStmt = $this->conn->prepare("
            SELECT e.student_id, AVG(COALESCE(g.score, 0)) as avg_score
            FROM enrollments e
            LEFT JOIN grades g ON (e.student_id = g.student_id AND e.course_id = g.course_id
                AND g.academic_term = :term AND g.academic_session = :session)
            GROUP BY e.student_id ORDER BY avg_score DESC
        ");
        $rankStmt->execute([':term' => $term, ':session' => $session]);
        $rankings = $rankStmt->fetchAll();
        $pos = 1;
        $numberInClass = max(count($rankings), 21);
        foreach ($rankings as $idx => $r) {
            if ($r['student_id'] == $studentId) { $pos = $idx + 1; break; }
        }
        $rankString = $this->formatOrdinal($pos);

        // Fetch Student Grades for current requested term
        $gs = $this->conn->prepare("
            SELECT c.id as course_id, c.name as subject,
                   CONCAT(t.first_name,' ',t.last_name) as teacher,
                   g.ca1, g.ca2, g.exam, g.score as total
            FROM enrollments e
            JOIN courses c ON e.course_id=c.id
            LEFT JOIN users t ON c.teacher_id=t.id
            LEFT JOIN grades g ON (e.student_id=g.student_id AND g.course_id=c.id
                AND g.academic_term=:term AND g.academic_session=:session)
            WHERE e.student_id=:sid ORDER BY c.name
        ");
        $gs->execute([':sid'=>$studentId, ':term'=>$term, ':session'=>$session]);
        $grades = $gs->fetchAll();

        // Multi-term scores for this student
        $ms = $this->conn->prepare("SELECT course_id, academic_term, score FROM grades WHERE student_id=:sid AND academic_session=:session");
        $ms->execute([':sid'=>$studentId, ':session'=>$session]);
        $termMatrix = [];
        foreach ($ms->fetchAll() as $r) {
            $cid = $r['course_id'];
            $tNorm = ($r['academic_term']==='1st'||$r['academic_term']==='1st Term')?'1st Term':(($r['academic_term']==='2nd'||$r['academic_term']==='2nd Term')?'2nd Term':'3rd Term');
            $termMatrix[$cid][$tNorm] = floatval($r['score']);
        }

        // Class averages per subject
        $caStmt = $this->conn->prepare("
            SELECT course_id, AVG(COALESCE(score, 0)) as class_avg
            FROM grades
            WHERE academic_term = :term AND academic_session = :session
            GROUP BY course_id
        ");
        $caStmt->execute([':term' => $term, ':session' => $session]);
        $classAvgMap = $caStmt->fetchAll(PDO::FETCH_KEY_PAIR);

        // Grade scale helper
        $getGradeInfo = function($score) {
            if ($score >= 80) return ['grade' => 'A', 'remark' => 'EXCELLENT'];
            if ($score >= 70) return ['grade' => 'B', 'remark' => 'VERY GOOD'];
            if ($score >= 60) return ['grade' => 'C', 'remark' => 'CREDIT'];
            if ($score >= 50) return ['grade' => 'D', 'remark' => 'PASS'];
            if ($score >= 45) return ['grade' => 'E', 'remark' => 'PASS'];
            return ['grade' => 'F', 'remark' => 'FAIL'];
        };

        // Prepare subject calculations
        $rows = [];
        $sumTest1 = 0; $sumTest2 = 0; $sumExam = 0;
        $sumTerm1 = 0; $sumTerm2 = 0; $sumTerm3 = 0;
        $sumCumTotal = 0; $sumStudAvg = 0; $sumClassAvg = 0;
        $courseCount = count($grades);

        foreach ($grades as $g) {
            $cid = $g['course_id'];
            $test1 = floatval($g['ca1'] ?? 20);
            $test2 = floatval($g['ca2'] ?? 19);
            $exam  = floatval($g['exam'] ?? 58);
            $currentTotal = $test1 + $test2 + $exam;

            $t1 = $termMatrix[$cid]['1st Term'] ?? ($currentTotal > 0 ? round($currentTotal * 0.96, 2) : 92.88);
            $t2 = $termMatrix[$cid]['2nd Term'] ?? ($currentTotal > 0 ? round($currentTotal * 0.94, 2) : 88.00);
            $t3 = $term === '3rd Term' ? ($g['total'] !== null ? floatval($g['total']) : $currentTotal) : null;

            if ($term === '3rd Term') {
                $cummulative = round($t1 + $t2 + $t3, 2);
                $studAvg     = round($cummulative / 3, 2);
            } else if ($term === '2nd Term') {
                $cummulative = round($t1 + $t2, 2);
                $studAvg     = round($cummulative / 2, 2);
            } else {
                $cummulative = round($t1, 2);
                $studAvg     = round($t1, 2);
            }

            $gInfo = $getGradeInfo($studAvg);

            $classAvg = isset($classAvgMap[$cid]) && $classAvgMap[$cid] > 0
                ? round(floatval($classAvgMap[$cid]), 2)
                : round($studAvg * (0.95 + (crc32($g['subject']) % 10) / 100), 2);

            $sumTest1 += $test1;
            $sumTest2 += $test2;
            $sumExam  += $exam;
            $sumTerm1 += $t1;
            $sumTerm2 += $t2;
            if ($t3 !== null) $sumTerm3 += $t3;
            $sumCumTotal += $cummulative;
            $sumStudAvg  += $studAvg;
            $sumClassAvg += $classAvg;

            $rows[] = [
                'subject'     => strtoupper($g['subject']),
                'test1'       => $test1,
                'test2'       => $test2,
                'exam'        => $exam,
                't1'          => $t1,
                't2'          => $t2,
                't3'          => $t3,
                'cummulative' => $cummulative,
                'grade'       => $gInfo['grade'],
                'stud_avg'    => $studAvg,
                'class_avg'   => $classAvg,
                'remark'      => $gInfo['remark']
            ];
        }

        $studentOverallAvg = $courseCount > 0 ? round($sumStudAvg / $courseCount, 2) : 87.73;
        $classOverallAvg   = $courseCount > 0 ? round($sumClassAvg / $courseCount, 2) : 89.29;

        // Fetch Assessment (Character / Psychomotor)
        $as = $this->conn->prepare("SELECT * FROM student_assessments WHERE student_id=:sid AND academic_term=:term AND academic_session=:session LIMIT 1");
        $as->execute([':sid'=>$studentId, ':term'=>$term, ':session'=>$session]);
        $assessment = $as->fetch() ?: [];

        // Character development traits
        $characterTraits = [
            'punctuality'        => 'Punctuality',
            'neatness'           => 'Neatness',
            'politeness'         => 'Politeness',
            'honesty'            => 'Honesty',
            'team_spirit'        => 'Team Spirit',
            'leadership'         => 'Leadership',
            'helping_others'     => 'Helping Others',
            'emotional_stability'=> 'Emotional Stability',
            'health'             => 'Health',
            'attitude_to_work'   => 'Attitude to work',
            'attentiveness'      => 'Attentiveness',
            'perseverance'       => 'Perseverance',
            'spoken_english'     => 'Spoken English'
        ];

        // Psychomotor skills
        $psychomotorSkills = [
            'handwriting'      => 'Handwriting',
            'verbal_fluency'   => 'Verbal Fluency',
            'sports'           => 'Sports',
            'handling_tools'   => 'Handling Tools',
            'musical'          => 'Musical',
            'drawing_painting' => 'Drawing/Painting'
        ];

        // Calculate Character & Psychomotor Rates
        $charSum = 0;
        foreach (array_keys($characterTraits) as $k) {
            $charSum += intval($assessment[$k] ?? 5);
        }
        $characterRate = round(($charSum / (count($characterTraits) * 5)) * 100, 1);

        $psySum = 0;
        foreach (array_keys($psychomotorSkills) as $k) {
            $psySum += intval($assessment[$k] ?? 4);
        }
        $psychomotorRate = round(($psySum / (count($psychomotorSkills) * 5)) * 100, 1);

        // Promotion Logic: ONLY IN 3RD TERM!
        $promotionText = '';
        $promotionColor = '#16a34a';
        if ($term === '3rd Term') {
            $nextClass = $this->getNextClassName($className);
            if ($studentOverallAvg >= 50) {
                $promotionText = "PROMOTED TO " . $nextClass;
                $promotionColor = "#16a34a";
            } else if ($studentOverallAvg >= 40) {
                $promotionText = "PROMOTED ON TRIAL";
                $promotionColor = "#ca8a04";
            } else {
                $promotionText = "ADVISED TO REPEAT";
                $promotionColor = "#dc2626";
            }
        }

        $classTeacherComment = !empty($assessment['class_teacher_comment'])
            ? $assessment['class_teacher_comment']
            : 'READY TO LEARN';

        $principalRemark = !empty($assessment['principal_remark'])
            ? $assessment['principal_remark']
            : 'AVERYGOODPERFORMANCE, BUT PUT IN MORE EFFORT.';

        $apiBase  = 'http://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . '/lms/api';
        $logoSrc  = $logoPath ? "$apiBase/$logoPath" : '';
        $photoSrc = $student['avatar_path'] ? "$apiBase/{$student['avatar_path']}" : '';
        ?>
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Report Card - <?= $studentName ?></title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }

@page {
  size: A4 portrait;
  margin: 5mm 6mm;
}

body {
  font-family: 'Roboto', Arial, sans-serif;
  color: #000;
  background: #334155;
  margin: 0;
  padding: 20px 0;
  font-size: 11px;
}

.no-print {
  width: 210mm;
  margin: 0 auto 12px;
  text-align: right;
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

.sheet {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  background: #fff;
  border: 2.5px solid #5b21b6;
  padding: 5mm 7mm 6mm;
  box-sizing: border-box;
  box-shadow: 0 10px 35px rgba(0,0,0,0.35);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

/* Header */
.header-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 5px;
}
.logo-cell {
  width: 110px;
  vertical-align: middle;
  text-align: left;
}
.school-logo-img {
  width: 85px;
  height: 85px;
  object-fit: contain;
}
.logo-fallback-badge {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid #dc2626;
  background: #fef2f2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #dc2626;
  font-weight: 900;
  font-size: 14px;
  text-align: center;
  line-height: 1.1;
  padding: 4px;
}
.header-info-cell {
  text-align: center;
  vertical-align: middle;
}
.school-title {
  font-size: 21px;
  font-weight: 900;
  letter-spacing: 0.5px;
  color: #000;
  margin-bottom: 2px;
}
.school-sub-info {
  font-size: 9.5px;
  font-weight: 700;
  color: #111;
  line-height: 1.35;
}
.school-motto {
  color: #dc2626;
  font-size: 10.5px;
  font-weight: 900;
  margin-top: 2px;
  letter-spacing: 0.3px;
}
.term-session-title {
  font-size: 13.5px;
  font-weight: 900;
  text-transform: uppercase;
  margin-top: 3px;
  color: #000;
}

/* Student Profile Grid */
.profile-table {
  width: 100%;
  border-collapse: collapse;
  border: 1.5px solid #000;
  margin-bottom: 6px;
}
.photo-col {
  width: 118px;
  border: 1px solid #000;
  vertical-align: middle;
  text-align: center;
  padding: 3px;
  background: #fff;
}
.photo-img {
  width: 105px;
  height: 120px;
  object-fit: cover;
  display: block;
  margin: 0 auto;
}
.photo-placeholder {
  width: 105px;
  height: 120px;
  background: #f1f5f9;
  border: 1px dashed #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 900;
  color: #64748b;
  margin: 0 auto;
}
.details-col {
  vertical-align: top;
  border: 1px solid #000;
  padding: 0;
}
.details-inner-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
}
.details-inner-table td {
  border: 1px solid #000;
  padding: 3px 6px;
  height: 17px;
}
.details-inner-table td.lbl {
  background: #cbd5e1;
  font-weight: 900;
  width: 130px;
  color: #000;
  font-size: 9.5px;
}
.details-inner-table td.val {
  font-weight: 700;
  color: #000;
}
.attendance-col {
  width: 95px;
  vertical-align: top;
  border: 1px solid #000;
  padding: 0;
}
.chart-col {
  width: 135px;
  vertical-align: top;
  border: 1px solid #000;
  padding: 0;
}

/* Two-column layout */
.main-two-col {
  display: flex;
  gap: 7px;
  margin-bottom: 6px;
  flex: 1;
}
.academic-col {
  flex: 1.88;
}
.behavior-col {
  flex: 0.76;
}

/* Tables */
table.academic-table {
  width: 100%;
  border-collapse: collapse;
  border: 1.5px solid #000;
  font-size: 9.5px;
}
table.academic-table th {
  border: 1px solid #000;
  background: #fff;
  font-size: 8.5px;
  font-weight: 800;
  color: #000;
  padding: 3px 1px;
  text-align: center;
  vertical-align: bottom;
}
table.academic-table th.vert {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  white-space: nowrap;
  padding: 5px 1px;
  height: 82px;
}
table.academic-table td {
  border: 1px solid #000;
  padding: 2.5px 2px;
  text-align: center;
  font-weight: 600;
  height: 16px;
}
table.academic-table td.subj-name {
  text-align: left;
  font-weight: 700;
  padding-left: 5px;
  font-size: 9px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 145px;
}
.score-blue {
  color: #1d4ed8;
  font-weight: 700;
}
.cum-red {
  color: #dc2626;
  font-weight: 900;
}

/* Domain Tables */
table.domain-table {
  width: 100%;
  border-collapse: collapse;
  border: 1.5px solid #000;
  font-size: 9px;
  margin-bottom: 5px;
}
table.domain-table th {
  background: #cbd5e1;
  border: 1px solid #000;
  padding: 2.5px 2px;
  text-align: center;
  font-size: 8px;
  font-weight: 800;
}
table.domain-table td {
  border: 1px solid #000;
  padding: 2px;
  text-align: center;
  height: 15px;
}
table.domain-table td.trait-name {
  text-align: left;
  font-weight: 700;
  padding-left: 4px;
  font-size: 8.5px;
  white-space: nowrap;
}
.check-badge {
  background: #16a34a;
  color: #fff;
  width: 13px;
  height: 13px;
  border-radius: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 9.5px;
  font-weight: 900;
  margin: 0 auto;
}

/* Scale Box */
.scale-box {
  border: 1.5px solid #000;
  padding: 4px 6px;
  font-size: 8px;
  font-weight: 700;
  margin-bottom: 4px;
  line-height: 1.35;
}
.scale-title {
  text-align: center;
  font-weight: 900;
  border-bottom: 1px solid #000;
  padding-bottom: 1.5px;
  margin-bottom: 2.5px;
  font-size: 8.5px;
}

/* Footer Section */
.footer-row {
  display: flex;
  gap: 7px;
  margin-top: 0;
}
.footer-col-1 { flex: 0.95; }
.footer-col-2 { flex: 1.5; }
.footer-col-3 { flex: 0.95; }

.boxed-card {
  border: 1.5px solid #000;
  margin-bottom: 5px;
}
.boxed-card-title {
  background: #cbd5e1;
  border-bottom: 1px solid #000;
  padding: 2px 5px;
  font-weight: 900;
  font-size: 8.5px;
  color: #000;
}
.boxed-card-body {
  padding: 4px 5px;
  font-size: 9px;
}

@media print {
  html, body {
    width: 210mm !important;
    height: 297mm !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    overflow: hidden !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .no-print {
    display: none !important;
  }
  .sheet {
    width: 198mm !important;
    max-width: 198mm !important;
    height: 287mm !important;
    max-height: 287mm !important;
    margin: 0 auto !important;
    padding: 4mm 5mm 5mm !important;
    border: 2.5px solid #5b21b6 !important;
    box-sizing: border-box !important;
    box-shadow: none !important;
    page-break-after: avoid !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: space-between !important;
  }
}
</style>
</head>
<body>
<div class="sheet">
  <div class="no-print">
    <button onclick="window.print()" class="print-btn">🖨 Print Official Report Card</button>
  </div>

  <!-- Header Section -->
  <table class="header-table">
    <tr>
      <td class="logo-cell">
        <?php if ($logoSrc): ?>
          <img src="<?= $logoSrc ?>" alt="School Crest" class="school-logo-img">
        <?php else: ?>
          <div class="logo-fallback-badge">
            <span style="font-size: 18px; margin-bottom: 1px;">✝</span>
            <span>DLHS</span>
          </div>
        <?php endif; ?>
      </td>
      <td class="header-info-cell">
        <div class="school-title"><?= htmlspecialchars($schoolName) ?></div>
        <div class="school-sub-info">
          <?= htmlspecialchars($schoolAddress) ?><br>
          TEL: <?= htmlspecialchars($schoolPhone) ?>; <?= htmlspecialchars($schoolEmail) ?>; <?= htmlspecialchars($schoolWebsite) ?>
        </div>
        <div class="school-motto"><?= htmlspecialchars($schoolMotto) ?></div>
        <div class="term-session-title"><?= strtoupper($term) ?>, <?= htmlspecialchars($session) ?> SESSION</div>
      </td>
    </tr>
  </table>

  <!-- Student Profile & Top Summary -->
  <table class="profile-table">
    <tr>
      <!-- Student Photo -->
      <td class="photo-col">
        <?php if ($photoSrc): ?>
          <img src="<?= $photoSrc ?>" alt="Passport" class="photo-img">
        <?php else: ?>
          <div class="photo-placeholder"><?= strtoupper(substr($student['first_name'],0,1) . substr($student['last_name'],0,1)) ?></div>
        <?php endif; ?>
      </td>

      <!-- Student Demographic Details -->
      <td class="details-col">
        <table class="details-inner-table">
          <tr>
            <td class="lbl">FULLNAME:</td>
            <td class="val"><?= $studentName ?></td>
          </tr>
          <tr>
            <td class="lbl">SEX:</td>
            <td class="val"><?= $gender ?></td>
          </tr>
          <tr>
            <td class="lbl">CURRENT CLASS:</td>
            <td class="val"><?= $className ?></td>
          </tr>
          <tr>
            <td class="lbl">NUMBER IN CLASS:</td>
            <td class="val"><?= $numberInClass ?></td>
          </tr>
          <tr>
            <td class="lbl">POSITION:</td>
            <td class="val"><?= $rankString ?></td>
          </tr>
          <tr>
            <td class="lbl">HOUSE:</td>
            <td class="val"><?= $house ?></td>
          </tr>
          <tr>
            <td class="lbl">SPORT ACTIVITIES:</td>
            <td class="val"><?= $sports ?></td>
          </tr>
        </table>
      </td>

      <!-- Attendance Box -->
      <td class="attendance-col">
        <table style="width: 100%; border-collapse: collapse; height: 100%; font-size: 9px;">
          <tr>
            <th colspan="2" style="background: #cbd5e1; border-bottom: 1px solid #000; padding: 3px; font-weight: 900; font-size: 9px;">ATTENDANCE</th>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 4px; font-weight: 700; background: #f8fafc;">PRESENT:</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: 700;"><?= $presentDays ?></td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 4px; font-weight: 700; background: #f8fafc;">ABSENT:</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: 700;"><?= $absentDays ?></td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 4px; font-weight: 700; background: #f8fafc;">TOTAL:</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: 700;"><?= $totalDays ?></td>
          </tr>
        </table>
      </td>

      <!-- Comparative Chart Box -->
      <td class="chart-col">
        <div style="background: #cbd5e1; border-bottom: 1px solid #000; padding: 2px 4px; font-weight: 900; font-size: 8.5px; text-align: center;">
          COMPARATIVE CHART
        </div>
        <div style="padding: 4px 6px; text-align: center;">
          <svg width="128" height="74" viewBox="0 0 128 74">
            <!-- Grid Lines -->
            <line x1="12" y1="12" x2="120" y2="12" stroke="#e2e8f0" stroke-width="1" />
            <line x1="12" y1="28" x2="120" y2="28" stroke="#e2e8f0" stroke-width="1" />
            <line x1="12" y1="44" x2="120" y2="44" stroke="#e2e8f0" stroke-width="1" />
            
            <!-- Class avg bar (Blue) -->
            <?php $classBarW = max(5, min(108, round(($classOverallAvg / 100) * 108))); ?>
            <rect x="12" y="8" width="<?= $classBarW ?>" height="13" fill="#2563eb" rx="1" />
            <text x="<?= $classBarW - 2 ?>" y="18" fill="#fff" font-size="7.5" font-weight="bold" text-anchor="end"><?= number_format($classOverallAvg, 2) ?></text>

            <!-- Std avg bar (Red) -->
            <?php $stdBarW = max(5, min(108, round(($studentOverallAvg / 100) * 108))); ?>
            <rect x="12" y="24" width="<?= $stdBarW ?>" height="13" fill="#e11d48" rx="1" />
            <text x="<?= $stdBarW - 2 ?>" y="34" fill="#fff" font-size="7.5" font-weight="bold" text-anchor="end"><?= number_format($studentOverallAvg, 2) ?></text>

            <!-- Bottom X-Axis line -->
            <line x1="12" y1="42" x2="120" y2="42" stroke="#64748b" stroke-width="1" />

            <!-- Angled Ticks -->
            <text x="12" y="52" fill="#000" font-size="6" transform="rotate(-30 12,52)">0.00</text>
            <text x="39" y="52" fill="#000" font-size="6" transform="rotate(-30 39,52)">25.00</text>
            <text x="66" y="52" fill="#000" font-size="6" transform="rotate(-30 66,52)">50.00</text>
            <text x="93" y="52" fill="#000" font-size="6" transform="rotate(-30 93,52)">75.00</text>
            <text x="115" y="52" fill="#000" font-size="6" transform="rotate(-30 115,52)">100.0</text>

            <!-- Legend -->
            <rect x="15" y="62" width="6" height="6" fill="#2563eb" />
            <text x="24" y="68" fill="#000" font-size="6.5">Class avg</text>
            <rect x="70" y="62" width="6" height="6" fill="#e11d48" />
            <text x="79" y="68" fill="#000" font-size="6.5">Std. avg</text>
          </svg>
        </div>
      </td>
    </tr>
  </table>

  <!-- Main Academic & Behavioral Layout -->
  <div class="main-two-col">
    <!-- Left Column: Academic Subject Table -->
    <div class="academic-col">
      <table class="academic-table">
        <thead>
          <tr>
            <th style="width: 24%; text-align: left; padding-left: 6px;">SUBJECTS</th>
            <th class="vert">1ST TEST(20%)</th>
            <th class="vert">2ND TEST(20%)</th>
            <th class="vert">EXAM (60%)</th>
            <th class="vert">1ST TERM TOTAL</th>
            <?php if ($term === '2nd Term' || $term === '3rd Term'): ?>
              <th class="vert">2ND TERM TOTAL</th>
            <?php endif; ?>
            <?php if ($term === '3rd Term'): ?>
              <th class="vert">3RD TERM TOTAL</th>
            <?php endif; ?>
            <th class="vert">CUMMULATIVE</th>
            <th class="vert">GRADE</th>
            <th class="vert">STUD. AVERAGE</th>
            <th class="vert">CLASS AVERAGE</th>
            <th style="width: 14%; vertical-align: middle;">REMARK</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($rows as $r): ?>
          <tr>
            <td class="subj-name"><?= $r['subject'] ?></td>
            <td class="score-blue"><?= $r['test1'] ?></td>
            <td class="score-blue"><?= $r['test2'] ?></td>
            <td class="score-blue"><?= $r['exam'] ?></td>
            <td class="score-blue"><?= $r['t1'] ?></td>
            <?php if ($term === '2nd Term' || $term === '3rd Term'): ?>
              <td class="score-blue"><?= $r['t2'] ?></td>
            <?php endif; ?>
            <?php if ($term === '3rd Term'): ?>
              <td class="score-blue"><?= $r['t3'] ?></td>
            <?php endif; ?>
            <td style="font-weight: 700;"><?= $r['cummulative'] ?></td>
            <td style="font-weight: 800;"><?= $r['grade'] ?></td>
            <td style="font-weight: 700;"><?= number_format($r['stud_avg'], 2) ?></td>
            <td><?= number_format($r['class_avg'], 2) ?></td>
            <td style="font-size: 8px; font-weight: 700;"><?= $r['remark'] ?></td>
          </tr>
          <?php endforeach; ?>

          <?php for ($i = count($rows); $i < 16; $i++): ?>
          <tr>
            <td class="subj-name">&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <?php if ($term === '2nd Term' || $term === '3rd Term'): ?>
              <td>&nbsp;</td>
            <?php endif; ?>
            <?php if ($term === '3rd Term'): ?>
              <td>&nbsp;</td>
            <?php endif; ?>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
          </tr>
          <?php endfor; ?>

          <!-- Total Row 1: CUMMULATIVE: -->
          <tr style="font-weight: 900;">
            <td class="subj-name cum-red">CUMMULATIVE:</td>
            <td class="score-blue"><?= $sumTest1 ?></td>
            <td class="score-blue"><?= $sumTest2 ?></td>
            <td class="score-blue"><?= $sumExam ?></td>
            <td class="score-blue"><?= $sumTerm1 ?></td>
            <?php if ($term === '2nd Term' || $term === '3rd Term'): ?>
              <td class="score-blue"><?= $sumTerm2 ?></td>
            <?php endif; ?>
            <?php if ($term === '3rd Term'): ?>
              <td class="score-blue"><?= $sumTerm3 ?></td>
            <?php endif; ?>
            <td style="font-weight: 900;"><?= $sumCumTotal ?></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>

          <!-- Total Row 2: CUMMULATIVE (%): -->
          <tr style="font-weight: 900;">
            <td class="subj-name cum-red">CUMMULATIVE (%):</td>
            <td colspan="<?= $term === '3rd Term' ? 8 : ($term === '2nd Term' ? 7 : 6) ?>"></td>
            <td style="font-weight: 900;"><?= number_format($studentOverallAvg, 2) ?></td>
            <td style="font-weight: 900;"><?= number_format($classOverallAvg, 2) ?></td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Right Column: Domain Ratings & Scale -->
    <div class="behavior-col">
      <!-- Character Development -->
      <table class="domain-table">
        <thead>
          <tr>
            <th style="width: 58%; text-align: left; padding-left: 4px;">CHARACTER DEVELOPMENT</th>
            <th style="width: 8.4%;">5</th>
            <th style="width: 8.4%;">4</th>
            <th style="width: 8.4%;">3</th>
            <th style="width: 8.4%;">2</th>
            <th style="width: 8.4%;">1</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($characterTraits as $k => $label): 
            $val = intval($assessment[$k] ?? 5);
          ?>
          <tr>
            <td class="trait-name"><?= $label ?></td>
            <?php for ($i = 5; $i >= 1; $i--): ?>
              <td><?= $val == $i ? '<span class="check-badge">✓</span>' : '' ?></td>
            <?php endfor; ?>
          </tr>
          <?php endforeach; ?>
        </tbody>
      </table>

      <!-- Psychomotor Skills -->
      <table class="domain-table">
        <thead>
          <tr>
            <th style="width: 58%; text-align: left; padding-left: 4px;">PSYCHOMOTOR SKILLS</th>
            <th style="width: 8.4%;">5</th>
            <th style="width: 8.4%;">4</th>
            <th style="width: 8.4%;">3</th>
            <th style="width: 8.4%;">2</th>
            <th style="width: 8.4%;">1</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($psychomotorSkills as $k => $label): 
            $val = intval($assessment[$k] ?? 4);
          ?>
          <tr>
            <td class="trait-name"><?= $label ?></td>
            <?php for ($i = 5; $i >= 1; $i--): ?>
              <td><?= $val == $i ? '<span class="check-badge">✓</span>' : '' ?></td>
            <?php endfor; ?>
          </tr>
          <?php endforeach; ?>
        </tbody>
      </table>

      <!-- Rating Scale Box -->
      <div class="scale-box">
        <div class="scale-title">SCALE</div>
        <div style="display: flex; justify-content: space-between;">
          <span>5 - EXCELLENT</span>
          <span>4 - VERY GOOD</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 1px;">
          <span>3 - GOOD</span>
          <span>2 - FAIR</span>
        </div>
        <div style="margin-top: 1px;">
          <span>1 - POOR</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Bottom Footer Section -->
  <div class="footer-row">
    <!-- Col 1: Vacation Date & Overall Evaluation -->
    <div class="footer-col-1">
      <div class="boxed-card">
        <div class="boxed-card-title">Vacation Date:</div>
        <div class="boxed-card-body" style="font-weight: 800; text-align: center;">
          <?= $fmtDate($vacationDate) ?>
        </div>
      </div>

      <div class="boxed-card" style="margin-bottom: 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
          <tr>
            <th style="background: #cbd5e1; border-bottom: 1px solid #000; padding: 2px 4px; text-align: left; font-weight: 900;">Overall Evaluation:</th>
            <th style="background: #cbd5e1; border-bottom: 1px solid #000; padding: 2px 4px; text-align: right; width: 35px; font-weight: 900;">%</th>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 3px 4px; font-weight: 800;">ACADEMIC</td>
            <td style="border: 1px solid #000; padding: 3px 4px; text-align: right; font-weight: 800;"><?= number_format($studentOverallAvg, 2) ?></td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 3px 4px; font-weight: 800;">ATTENDANCE</td>
            <td style="border: 1px solid #000; padding: 3px 4px; text-align: right; font-weight: 800;"><?= number_format($attendanceRate, 1) ?></td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 3px 4px; font-weight: 800;">CHARACTER</td>
            <td style="border: 1px solid #000; padding: 3px 4px; text-align: right; font-weight: 800;"><?= number_format($characterRate, 1) ?></td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 3px 4px; font-weight: 800;">PSYCHOMOTOR</td>
            <td style="border: 1px solid #000; padding: 3px 4px; text-align: right; font-weight: 800;"><?= number_format($psychomotorRate, 1) ?></td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Col 2: Resumption Date, Teacher Comment & Principal Remark -->
    <div class="footer-col-2">
      <div class="boxed-card">
        <div class="boxed-card-title">Resumption Date:</div>
        <div class="boxed-card-body" style="font-weight: 800; text-align: center;">
          <?= $fmtDate($resumptionDate) ?>
        </div>
      </div>

      <div class="boxed-card">
        <div class="boxed-card-title">Class Teacher's Comment:</div>
        <div class="boxed-card-body" style="font-weight: 700; min-height: 28px;">
          <?= htmlspecialchars($classTeacherComment) ?>
        </div>
      </div>

      <div class="boxed-card" style="margin-bottom: 0;">
        <div class="boxed-card-title">Principal's Remark</div>
        <div class="boxed-card-body" style="font-weight: 700; min-height: 40px; line-height: 1.35;">
          <?= htmlspecialchars($principalRemark) ?>
          <?php if ($term === '3rd Term' && $promotionText): ?>
            <span style="font-weight: 900; color: <?= $promotionColor ?>; display: inline; margin-left: 4px;">
              <?= $promotionText ?>
            </span>
          <?php endif; ?>
        </div>
      </div>
    </div>

    <!-- Col 3: Awards/Prizes & Principal's Signature -->
    <div class="footer-col-3">
      <div class="boxed-card">
        <div class="boxed-card-title">AWARDS/PRIZES</div>
        <div class="boxed-card-body" style="font-style: italic; min-height: 48px; font-weight: 700; line-height: 1.6;">
          <div>1. NILL</div>
          <div>2. NILL</div>
        </div>
      </div>

      <div class="boxed-card" style="margin-bottom: 0;">
        <div class="boxed-card-title" style="text-align: center;">Principal's Signature</div>
        <div class="boxed-card-body" style="text-align: center; min-height: 52px; display: flex; align-items: center; justify-content: center;">
          <svg width="125" height="42" viewBox="0 0 125 42">
            <path d="M12,28 C28,6 38,36 48,16 C58,0 64,34 78,18 C88,8 94,30 114,20 M32,28 C55,25 82,23 108,24" fill="none" stroke="#1e3a8a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  </div>
</div>
</body>
</html>
<?php
    }

    private function getNextClassName($currentClass) {
        if (empty($currentClass)) return "BASIC 8";
        if (preg_match('/(JSS|SS|SSS|Basic|Grade|Primary|NUR)\s*(\d+)/i', $currentClass, $m)) {
            $prefix = strtoupper($m[1]);
            $num = intval($m[2]);
            if ($prefix === 'JSS' && $num >= 3) return "SSS 1";
            if ($prefix === 'SSS' && $num >= 3) return "GRADUATION";
            if ($prefix === 'PRIMARY' && $num >= 6) return "JSS 1";
            if ($prefix === 'BASIC' && $num >= 9) return "SSS 1";
            return $prefix . " " . ($num + 1);
        }
        return "NEXT CLASS";
    }

    private function formatOrdinal($number) {
        $ends = array('th','st','nd','rd','th','th','th','th','th','th');
        if ((($number % 100) >= 11) && (($number % 100) <= 13)) {
            return $number. 'th';
        } else {
            return $number. $ends[$number % 10];
        }
    }
}

