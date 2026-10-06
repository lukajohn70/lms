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

        $studentId  = isset($_GET['student_id']) ? intval($_GET['student_id']) : 0;
        $classParam = $_GET['class_id'] ?? '';

        $cumulParam = $_GET['cumulative'] ?? '1';
        $isCumulative = !($cumulParam === '0' || $cumulParam === 'false' || $cumulParam === 'no');

        $studentIds = [];
        $batchClassName = '';

        if (!empty($classParam) && !$studentId) {
            if ($user['role'] !== 'admin' && $user['role'] !== 'teacher') {
                die("<p style='font-family:sans-serif;padding:40px'>Access denied.</p>");
            }
            if (substr($classParam, 0, 9) === 'combined:') {
                $cohort = substr($classParam, 9);
                $batchClassName = $cohort;
                $stmt = $this->conn->prepare("
                    SELECT u.id FROM users u
                    JOIN classes c ON u.class_id = c.id
                    WHERE c.name LIKE :cohort AND u.role = 'student'
                    ORDER BY c.name ASC, u.first_name ASC, u.last_name ASC
                ");
                $stmt->execute([':cohort' => $cohort . '%']);
                $studentIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
            } else {
                $classId = intval($classParam);
                $cn = $this->conn->prepare("SELECT name FROM classes WHERE id = :cid LIMIT 1");
                $cn->execute([':cid' => $classId]);
                $batchClassName = $cn->fetchColumn() ?: "CLASS $classId";

                $stmt = $this->conn->prepare("
                    SELECT id FROM users 
                    WHERE class_id = :cid AND role = 'student' 
                    ORDER BY first_name ASC, last_name ASC
                ");
                $stmt->execute([':cid' => $classId]);
                $studentIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
            }

            if (empty($studentIds)) {
                die("<p style='font-family:sans-serif;padding:40px'>No students found in this class arm.</p>");
            }
        } else {
            if (!$studentId) {
                if ($user['role'] === 'student') $studentId = $user['id'];
                else if ($user['role'] === 'parent') {
                    $s = $this->conn->prepare("SELECT student_id FROM parent_students WHERE parent_id=:pid LIMIT 1");
                    $s->execute([':pid' => $user['id']]);
                    $studentId = $s->fetchColumn();
                }
            }
            if (!$studentId) die("<p style='font-family:sans-serif;padding:40px'>Student ID or Class ID required.</p>");
            $studentIds = [$studentId];
        }

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
        $logoPath      = $this->getSetting('school_logo_path', 'uploads/logos/dlhs_logo.webp');

        // Vacation & resumption dates — keyed by term number
        $termNum = ($term === '1st Term') ? '1' : (($term === '2nd Term') ? '2' : '3');
        $vacationDate   = $this->getSetting('vacation_date_term'   . $termNum, '');
        $resumptionDate = $this->getSetting('resumption_date_term' . $termNum, '');

        $fmtDate = function($d) {
            if (!$d) return "—";
            $ts = strtotime($d);
            return date('j/M/Y', $ts);
        };

        // Class averages per subject — only from students in the same class(es), NULL scores excluded
        $caStmt = $this->conn->prepare("
            SELECT course_id, AVG(score) as class_avg
            FROM grades
            WHERE academic_term = :term AND academic_session = :session
              AND score IS NOT NULL
            GROUP BY course_id
        ");
        $caStmt->execute([':term' => $term, ':session' => $session]);
        $classAvgMap = $caStmt->fetchAll(PDO::FETCH_KEY_PAIR);

        // Class rankings
        $rankStmt = $this->conn->prepare("
            SELECT e.student_id, AVG(COALESCE(g.score, 0)) as avg_score
            FROM enrollments e
            LEFT JOIN grades g ON (e.student_id = g.student_id AND e.course_id = g.course_id
                AND g.academic_term = :term AND g.academic_session = :session)
            GROUP BY e.student_id ORDER BY avg_score DESC
        ");
        $rankStmt->execute([':term' => $term, ':session' => $session]);
        $rankings = $rankStmt->fetchAll();

        // Grade scale thresholds from settings - Senior (SS 1 - SS 3)
        $seniorGradeA = intval($this->getSetting('grade_A_min', 80));
        $seniorGradeB = intval($this->getSetting('grade_B_min', 70));
        $seniorGradeC = intval($this->getSetting('grade_C_min', 60));
        $seniorGradeD = intval($this->getSetting('grade_D_min', 50));
        $seniorGradeE = intval($this->getSetting('grade_E_min', 45));

        // Grade scale thresholds from settings - Junior (Basic 7 - Basic 9 / JSS 1 - 3)
        $juniorGradeA = intval($this->getSetting('grade_junior_A_min', 70));
        $juniorGradeB = intval($this->getSetting('grade_junior_B_min', 60));
        $juniorGradeC = intval($this->getSetting('grade_junior_C_min', 50));
        $juniorGradeD = intval($this->getSetting('grade_junior_D_min', 45));
        $juniorGradeE = intval($this->getSetting('grade_junior_E_min', 40));

        // Grade scale helper (supports both Junior and Senior thresholds)
        $getGradeInfo = function($score, $isJunior = false) use (
            $seniorGradeA, $seniorGradeB, $seniorGradeC, $seniorGradeD, $seniorGradeE,
            $juniorGradeA, $juniorGradeB, $juniorGradeC, $juniorGradeD, $juniorGradeE
        ) {
            $gA = $isJunior ? $juniorGradeA : $seniorGradeA;
            $gB = $isJunior ? $juniorGradeB : $seniorGradeB;
            $gC = $isJunior ? $juniorGradeC : $seniorGradeC;
            $gD = $isJunior ? $juniorGradeD : $seniorGradeD;
            $gE = $isJunior ? $juniorGradeE : $seniorGradeE;

            if ($score >= $gA) return ['grade' => 'A', 'remark' => 'EXCELLENT'];
            if ($score >= $gB) return ['grade' => 'B', 'remark' => 'VERY GOOD'];
            if ($score >= $gC) return ['grade' => 'C', 'remark' => 'CREDIT'];
            if ($score >= $gD) return ['grade' => 'D', 'remark' => 'PASS'];
            if ($score >= $gE) return ['grade' => 'E', 'remark' => 'PASS'];
            return ['grade' => 'F', 'remark' => 'FAIL'];
        };

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

        $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);
        $proto    = $isHttps ? 'https://' : 'http://';
        $apiBase  = $proto . ($_SERVER['HTTP_HOST'] ?? 'localhost') . '/lms/api';
        $logoSrc  = $logoPath ? "$apiBase/$logoPath" : '';
        ?>
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title><?= count($studentIds) > 1 ? "Batch Report Cards - " . htmlspecialchars($batchClassName) : "Report Card" ?></title>
<link rel="icon" type="image/x-icon" href="/lms/favicon.ico">
<link rel="icon" type="image/png" href="<?= htmlspecialchars($logoSrc ?: '/lms/public/favicon.png') ?>">
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
  margin: 0 auto 20px;
  background: #fff;
  border: 2.5px solid #5b21b6;
  padding: 5mm 7mm 6mm;
  box-sizing: border-box;
  box-shadow: 0 10px 35px rgba(0,0,0,0.35);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  page-break-after: always;
  break-after: page;
}
.sheet:last-child {
  page-break-after: auto;
  break-after: auto;
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
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 10px;
  font-weight: 700;
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
  padding: 2px 2px;
  background: #fff;
  font-weight: 900;
  text-align: center;
  font-size: 8px;
  vertical-align: bottom;
}
table.academic-table th.vert {
  height: 70px;
  white-space: nowrap;
  padding: 4px 2px 2px;
  vertical-align: bottom;
}
table.academic-table th.vert > div {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  display: block;
  margin: 0 auto;
  line-height: 1;
}
table.academic-table td {
  border: 1px solid #000;
  padding: 2px 3px;
  text-align: center;
  font-weight: 600;
  height: 15.5px;
}
table.academic-table td.subj-name {
  text-align: left;
  font-weight: 800;
  font-size: 9px;
  padding-left: 5px;
}
table.academic-table tr.total-row td {
  font-weight: 900;
  background: #f1f5f9;
}
table.academic-table tr.avg-row td {
  font-weight: 900;
  background: #f8fafc;
}
.score-blue {
  color: #1e3a8a;
  font-weight: 700;
}
.score-bold {
  font-weight: 900;
}

/* Behavior Table */
table.behavior-table {
  width: 100%;
  border-collapse: collapse;
  border: 1.5px solid #000;
  font-size: 8.5px;
  margin-bottom: 5px;
}
table.behavior-table th {
  border: 1px solid #000;
  padding: 2px 4px;
  background: #cbd5e1;
  font-weight: 900;
  font-size: 8.5px;
  text-align: left;
}
table.behavior-table td {
  border: 1px solid #000;
  padding: 1.5px 3px;
  text-align: center;
  font-weight: 700;
  height: 14.5px;
}
table.behavior-table td.trait-name {
  text-align: left;
  font-weight: 700;
  padding-left: 4px;
}

/* Domain Rating Tables (Character Development, Psychomotor Skills) */
table.domain-table {
  width: 100%;
  border-collapse: collapse;
  border: 1.5px solid #000;
  font-size: 8.5px;
  margin-bottom: 5px;
}
table.domain-table th {
  border: 1px solid #000;
  padding: 2px 4px;
  background: #cbd5e1;
  font-weight: 900;
  font-size: 8.5px;
  text-align: center;
}
table.domain-table td {
  border: 1px solid #000;
  padding: 1.5px 3px;
  text-align: center;
  font-weight: 700;
  height: 14.5px;
}
table.domain-table td.trait-name {
  text-align: left;
  font-weight: 700;
  padding-left: 4px;
}

/* Footer cards */
.footer-row {
  display: flex;
  gap: 7px;
  margin-top: 4px;
}
.footer-col-1 {
  flex: 0.95;
}
.footer-col-2 {
  flex: 1.25;
}
.footer-col-3 {
  flex: 0.8;
}

.boxed-card {
  border: 1px solid #000;
  margin-bottom: 5px;
}
.boxed-card-title {
  background: #cbd5e1;
  border-bottom: 1px solid #000;
  padding: 2px 5px;
  font-weight: 900;
  font-size: 8.5px;
  text-transform: uppercase;
}
.boxed-card-body {
  padding: 4px 6px;
  font-size: 9px;
  font-weight: 600;
}

@media print {
  html, body {
    width: 210mm !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
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
    page-break-after: always !important;
    break-after: page !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: space-between !important;
  }
  .sheet:last-child {
    page-break-after: auto !important;
    break-after: auto !important;
  }
}
</style>
</head>
<body>
<div class="no-print">
  <?php if (count($studentIds) > 1): ?>
    <div style="display: flex; justify-content: space-between; align-items: center; background: #1e293b; color: #fff; padding: 12px 18px; border-radius: 8px; margin-bottom: 14px;">
      <div>
        <span style="font-weight: 900; color: #38bdf8; font-size: 14px;">CLASS REPORT CARDS:</span>
        <span style="font-weight: 700; margin-left: 6px;"><?= htmlspecialchars($batchClassName) ?></span>
        <span style="color: #94a3b8; margin-left: 6px;">(<?= count($studentIds) ?> students)</span>
      </div>
      <button onclick="window.print()" class="print-btn">🖨 Print All <?= count($studentIds) ?> Report Cards</button>
    </div>
  <?php else: ?>
    <button onclick="window.print()" class="print-btn">🖨 Print Official Report Card</button>
  <?php endif; ?>
</div>

<?php
foreach ($studentIds as $studentId):
    // Student Details
    $ss = $this->conn->prepare("SELECT first_name, last_name, email, admission_number, class_id, avatar_path, gender, house, sport_activities FROM users WHERE id=:sid AND role='student' LIMIT 1");
    $ss->execute([':sid'=>$studentId]);
    $student = $ss->fetch();
    if (!$student) continue;

    $studentName = strtoupper(trim($student['first_name'] . ' ' . $student['last_name']));
    $gender      = strtoupper($student['gender'] ?: 'MALE');
    $house       = strtoupper($student['house'] ?: 'FAITH');
    $sports      = strtoupper($student['sport_activities'] ?: 'BASKETBALL');

    // Fetch Assessment
    $as = $this->conn->prepare("SELECT * FROM student_assessments WHERE student_id=:sid AND academic_term=:term AND academic_session=:session LIMIT 1");
    $as->execute([':sid'=>$studentId, ':term'=>$term, ':session'=>$session]);
    $assessment = $as->fetch() ?: [];

    // Historical Class Name Resolution
    $histClassId = null;
    if (!empty($assessment['class_id'])) {
        $histClassId = intval($assessment['class_id']);
    } else {
        $gCls = $this->conn->prepare("SELECT class_id FROM grades WHERE student_id=:sid AND academic_term=:term AND academic_session=:session AND class_id IS NOT NULL LIMIT 1");
        $gCls->execute([':sid'=>$studentId, ':term'=>$term, ':session'=>$session]);
        $histClassId = $gCls->fetchColumn();
        if (!$histClassId) {
            $sch = $this->conn->prepare("SELECT class_id FROM student_class_history WHERE student_id=:sid AND academic_term=:term AND academic_session=:session LIMIT 1");
            $sch->execute([':sid'=>$studentId, ':term'=>$term, ':session'=>$session]);
            $histClassId = $sch->fetchColumn();
        }
    }
    if (!$histClassId) {
        $histClassId = $student['class_id'];
    }

    $className = $batchClassName ?: 'BASIC 7 DIAMOND';
    if ($histClassId) {
        $cs = $this->conn->prepare("SELECT name FROM classes WHERE id=:cid LIMIT 1");
        $cs->execute([':cid'=>$histClassId]);
        $cRow = $cs->fetchColumn();
        if ($cRow) $className = strtoupper($cRow);
    }

    // Detect Junior vs Senior secondary level
    $isJunior = (
        stripos($className, 'BASIC') !== false ||
        stripos($className, 'JSS') !== false ||
        stripos($className, 'JUNIOR') !== false ||
        stripos($className, 'JS ') !== false ||
        stripos($className, 'JS1') !== false ||
        stripos($className, 'JS2') !== false ||
        stripos($className, 'JS3') !== false
    );
    $activeGradeA = $isJunior ? $juniorGradeA : $seniorGradeA;
    $activeGradeB = $isJunior ? $juniorGradeB : $seniorGradeB;
    $activeGradeC = $isJunior ? $juniorGradeC : $seniorGradeC;
    $activeGradeD = $isJunior ? $juniorGradeD : $seniorGradeD;
    $activeGradeE = $isJunior ? $juniorGradeE : $seniorGradeE;

    // Attendance — use only real DB values, no dummy fallbacks
    if (isset($assessment['days_present']) && $assessment['days_present'] !== null && $assessment['days_present'] !== '') {
        $presentDays = intval($assessment['days_present']);
        $totalDays   = (isset($assessment['total_days']) && $assessment['total_days'] !== null && $assessment['total_days'] !== '') ? intval($assessment['total_days']) : 0;
        $absentDays  = (isset($assessment['days_absent']) && $assessment['days_absent'] !== null && $assessment['days_absent'] !== '') ? intval($assessment['days_absent']) : max(0, $totalDays - $presentDays);
    } else {
        $pa = $this->conn->prepare("SELECT COUNT(*) FROM attendance WHERE student_id=:sid AND status='present'");
        $pa->execute([':sid'=>$studentId]);
        $presentDays = intval($pa->fetchColumn());
        $ta = $this->conn->prepare("SELECT COUNT(*) FROM attendance WHERE student_id=:sid");
        $ta->execute([':sid'=>$studentId]);
        $totalDays = intval($ta->fetchColumn());
        if ($totalDays < $presentDays) $totalDays = $presentDays;
        $absentDays = max(0, $totalDays - $presentDays);
    }
    $attendanceRate = $totalDays > 0 ? round(($presentDays / $totalDays) * 100, 1) : 0.0;

    // Class Rank
    $pos = 1;
    $numberInClass = max(count($rankings), count($studentIds));
    foreach ($rankings as $idx => $r) {
        if ($r['student_id'] == $studentId) { $pos = $idx + 1; break; }
    }
    $rankString = $this->formatOrdinal($pos);

    // Fetch Student Grades
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

    $rows = [];
    $sumTest1 = 0; $sumTest2 = 0; $sumExam = 0;
    $sumTerm1 = 0; $sumTerm2 = 0; $sumTerm3 = 0;
    $sumCurrentTotal = 0;
    $sumCumTotal = 0; $sumStudAvg = 0; $sumClassAvg = 0;
    $gradedCount = 0;      // subjects that actually have a score entered
    $classAvgCount = 0;    // subjects that have a real class average

    foreach ($grades as $g) {
        $cid = $g['course_id'];

        // Use real DB values; null means not yet entered
        $hasScore = ($g['ca1'] !== null || $g['ca2'] !== null || $g['exam'] !== null || $g['total'] !== null);
        $test1 = $g['ca1'] !== null ? floatval($g['ca1']) : null;
        $test2 = $g['ca2'] !== null ? floatval($g['ca2']) : null;
        $exam  = $g['exam'] !== null ? floatval($g['exam']) : null;

        // Current total: use stored score if available, else sum components
        if ($g['total'] !== null) {
            $currentTotal = floatval($g['total']);
        } else {
            $currentTotal = ($test1 ?? 0) + ($test2 ?? 0) + ($exam ?? 0);
        }

        // Previous term scores — only real DB values, never fabricated
        $t1 = isset($termMatrix[$cid]['1st Term']) ? floatval($termMatrix[$cid]['1st Term']) : null;
        $t2 = isset($termMatrix[$cid]['2nd Term']) ? floatval($termMatrix[$cid]['2nd Term']) : null;
        $t3 = $term === '3rd Term' ? ($g['total'] !== null ? floatval($g['total']) : ($hasScore ? $currentTotal : null)) : null;

        if ($isCumulative) {
            if ($term === '3rd Term') {
                $validParts = array_filter([$t1, $t2, $t3], fn($v) => $v !== null);
                $cummulative = count($validParts) > 0 ? round(array_sum($validParts), 2) : 0;
                $studAvg     = count($validParts) > 0 ? round($cummulative / count($validParts), 2) : 0;
            } else if ($term === '2nd Term') {
                $validParts = array_filter([$t1, $t2], fn($v) => $v !== null);
                $cummulative = count($validParts) > 0 ? round(array_sum($validParts), 2) : 0;
                $studAvg     = count($validParts) > 0 ? round($cummulative / count($validParts), 2) : 0;
            } else {
                $cummulative = $t1 !== null ? round($t1, 2) : 0;
                $studAvg     = $cummulative;
            }
        } else {
            $cummulative = round($currentTotal, 2);
            $studAvg     = $cummulative;
        }

        $gInfo = $getGradeInfo($studAvg, $isJunior);

        // Class average: only use real DB value; null means no class data
        $classAvg = (isset($classAvgMap[$cid]) && $classAvgMap[$cid] !== null)
            ? round(floatval($classAvgMap[$cid]), 2)
            : null;

        if ($hasScore) {
            $gradedCount++;
            $sumTest1 += ($test1 ?? 0);
            $sumTest2 += ($test2 ?? 0);
            $sumExam  += ($exam ?? 0);
            $sumTerm1 += ($t1 ?? 0);
            $sumTerm2 += ($t2 ?? 0);
            if ($t3 !== null) $sumTerm3 += $t3;
            $sumCurrentTotal += $currentTotal;
            $sumCumTotal += $cummulative;
            $sumStudAvg  += $studAvg;
        }
        if ($classAvg !== null) {
            $sumClassAvg += $classAvg;
            $classAvgCount++;
        }

        $rows[] = [
            'subject'       => strtoupper($g['subject']),
            'hasScore'      => $hasScore,
            'test1'         => $test1,
            'test2'         => $test2,
            'exam'          => $exam,
            'current_total' => $hasScore ? $currentTotal : null,
            't1'            => $t1,
            't2'            => $t2,
            't3'            => $t3,
            'cummulative'   => $hasScore ? $cummulative : null,
            'grade'         => $hasScore ? $gInfo['grade'] : '',
            'stud_avg'      => $hasScore ? $studAvg : null,
            'class_avg'     => $classAvg,
            'remark'        => $hasScore ? $gInfo['remark'] : ''
        ];
    }

    $studentOverallAvg = $gradedCount > 0 ? round($sumStudAvg / $gradedCount, 2) : 0.00;
    $classOverallAvg   = $classAvgCount > 0 ? round($sumClassAvg / $classAvgCount, 2) : 0.00;

    // Character and psychomotor rates — only from real DB entries
    $charSum = 0; $charRated = 0;
    foreach (array_keys($characterTraits) as $k) {
        if (!empty($assessment[$k]) && intval($assessment[$k]) > 0) {
            $charSum += intval($assessment[$k]);
            $charRated++;
        }
    }
    $characterRate = $charRated > 0 ? round(($charSum / ($charRated * 5)) * 100, 1) : 0.0;

    $psySum = 0; $psyRated = 0;
    foreach (array_keys($psychomotorSkills) as $k) {
        if (!empty($assessment[$k]) && intval($assessment[$k]) > 0) {
            $psySum += intval($assessment[$k]);
            $psyRated++;
        }
    }
    $psychomotorRate = $psyRated > 0 ? round(($psySum / ($psyRated * 5)) * 100, 1) : 0.0;

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

    // Comments — strictly from DB; no dummy text fallbacks
    $classTeacherComment = !empty($assessment['class_teacher_comment'])
        ? $assessment['class_teacher_comment']
        : '';

    $principalRemark = !empty($assessment['principal_remark'])
        ? $assessment['principal_remark']
        : '';

    $photoSrc = $student['avatar_path'] ? "$apiBase/{$student['avatar_path']}" : '';
?>
<div class="sheet">

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
            <th class="vert"><div>1ST TEST(20%)</div></th>
            <th class="vert"><div>2ND TEST(20%)</div></th>
            <th class="vert"><div>EXAM (60%)</div></th>
            <?php if ($isCumulative): ?>
              <th class="vert"><div>1ST TERM TOTAL</div></th>
              <?php if ($term === '2nd Term' || $term === '3rd Term'): ?>
                <th class="vert"><div>2ND TERM TOTAL</div></th>
              <?php endif; ?>
              <?php if ($term === '3rd Term'): ?>
                <th class="vert"><div>3RD TERM TOTAL</div></th>
              <?php endif; ?>
              <th class="vert"><div>CUMMULATIVE</div></th>
            <?php else: ?>
              <th class="vert"><div>TOTAL SCORE</div></th>
            <?php endif; ?>
            <th class="vert"><div>GRADE</div></th>
            <th class="vert"><div>STUD. AVERAGE</div></th>
            <th class="vert"><div>CLASS AVERAGE</div></th>
            <th style="width: 14%; vertical-align: middle;">REMARK</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($rows as $r): ?>
          <tr>
            <td class="subj-name"><?= $r['subject'] ?></td>
            <td class="score-blue"><?= $r['test1'] !== null ? $r['test1'] : '&mdash;' ?></td>
            <td class="score-blue"><?= $r['test2'] !== null ? $r['test2'] : '&mdash;' ?></td>
            <td class="score-blue"><?= $r['exam']  !== null ? $r['exam']  : '&mdash;' ?></td>
            <?php if ($isCumulative): ?>
              <td class="score-blue"><?= $r['t1'] !== null ? $r['t1'] : '&mdash;' ?></td>
              <?php if ($term === '2nd Term' || $term === '3rd Term'): ?>
                <td class="score-blue"><?= $r['t2'] !== null ? $r['t2'] : '&mdash;' ?></td>
              <?php endif; ?>
              <?php if ($term === '3rd Term'): ?>
                <td class="score-blue"><?= $r['t3'] !== null ? $r['t3'] : '&mdash;' ?></td>
              <?php endif; ?>
              <td style="font-weight: 700;"><?= $r['cummulative'] !== null ? $r['cummulative'] : '&mdash;' ?></td>
            <?php else: ?>
              <td class="score-blue" style="font-weight: 800;"><?= $r['current_total'] !== null ? $r['current_total'] : '&mdash;' ?></td>
            <?php endif; ?>
            <td style="font-weight: 800;"><?= $r['grade'] ?></td>
            <td style="font-weight: 700;"><?= $r['stud_avg'] !== null ? number_format($r['stud_avg'], 2) : '&mdash;' ?></td>
            <td><?= $r['class_avg'] !== null ? number_format($r['class_avg'], 2) : '&mdash;' ?></td>
            <td style="font-size: 8px; font-weight: 700;"><?= $r['remark'] ?></td>
          </tr>
          <?php endforeach; ?>

          <?php for ($i = count($rows); $i < 16; $i++): ?>
          <tr>
            <td class="subj-name">&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <?php if ($isCumulative): ?>
              <td>&nbsp;</td>
              <?php if ($term === '2nd Term' || $term === '3rd Term'): ?>
                <td>&nbsp;</td>
              <?php endif; ?>
              <?php if ($term === '3rd Term'): ?>
                <td>&nbsp;</td>
              <?php endif; ?>
              <td>&nbsp;</td>
            <?php else: ?>
              <td>&nbsp;</td>
            <?php endif; ?>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
          </tr>
          <?php endfor; ?>

          <!-- Total Row 1 -->
          <tr style="font-weight: 900;">
            <td class="subj-name cum-red"><?= $isCumulative ? 'CUMMULATIVE:' : 'TOTAL:' ?></td>
            <td class="score-blue"><?= $sumTest1 ?></td>
            <td class="score-blue"><?= $sumTest2 ?></td>
            <td class="score-blue"><?= $sumExam ?></td>
            <?php if ($isCumulative): ?>
              <td class="score-blue"><?= $sumTerm1 ?></td>
              <?php if ($term === '2nd Term' || $term === '3rd Term'): ?>
                <td class="score-blue"><?= $sumTerm2 ?></td>
              <?php endif; ?>
              <?php if ($term === '3rd Term'): ?>
                <td class="score-blue"><?= $sumTerm3 ?></td>
              <?php endif; ?>
              <td style="font-weight: 900;"><?= $sumCumTotal ?></td>
            <?php else: ?>
              <td class="score-blue" style="font-weight: 900;"><?= $sumCurrentTotal ?></td>
            <?php endif; ?>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>

          <!-- Total Row 2 -->
          <tr style="font-weight: 900;">
            <td class="subj-name cum-red"><?= $isCumulative ? 'CUMMULATIVE (%):' : 'AVERAGE (%):' ?></td>
            <td colspan="<?= $isCumulative ? ($term === '3rd Term' ? 8 : ($term === '2nd Term' ? 7 : 6)) : 5 ?>"></td>
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
            $val = (!empty($assessment[$k]) && intval($assessment[$k]) > 0) ? intval($assessment[$k]) : 0;
          ?>
          <tr>
            <td class="trait-name"><?= $label ?></td>
            <?php for ($i = 5; $i >= 1; $i--): ?>
              <td><?= ($val > 0 && $val == $i) ? '<span class="check-badge">✓</span>' : '' ?></td>
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
            $val = (!empty($assessment[$k]) && intval($assessment[$k]) > 0) ? intval($assessment[$k]) : 0;
          ?>
          <tr>
            <td class="trait-name"><?= $label ?></td>
            <?php for ($i = 5; $i >= 1; $i--): ?>
              <td><?= ($val > 0 && $val == $i) ? '<span class="check-badge">✓</span>' : '' ?></td>
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

  <!-- Grading Scale & Parent Signature Strip -->
  <div style="margin-bottom: 5px; border: 1.5px solid #000;">
    <div style="display: flex; align-items: stretch;">

      <!-- Grading Key Table -->
      <div style="flex: 1.4; border-right: 1px solid #000;">
        <div style="background: #cbd5e1; border-bottom: 1px solid #000; padding: 2px 6px; font-weight: 900; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.3px;">
          GRADING SCALE / KEY <?= $isJunior ? '(JUNIOR SCHOOL - BASIC 7–9)' : '(SENIOR SCHOOL - SS 1–3)' ?>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 8.5px;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="border: 1px solid #000; padding: 2px 5px; font-weight: 900; text-align: center; width: 12%;">GRADE</th>
              <th style="border: 1px solid #000; padding: 2px 5px; font-weight: 900; text-align: center; width: 25%;">SCORE RANGE (%)</th>
              <th style="border: 1px solid #000; padding: 2px 5px; font-weight: 900; text-align: center;">REMARK</th>
              <th style="border: 1px solid #000; padding: 2px 5px; font-weight: 900; text-align: center; width: 12%;">GRADE</th>
              <th style="border: 1px solid #000; padding: 2px 5px; font-weight: 900; text-align: center; width: 25%;">SCORE RANGE (%)</th>
              <th style="border: 1px solid #000; padding: 2px 5px; font-weight: 900; text-align: center;">REMARK</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #000; padding: 2px 5px; text-align: center; font-weight: 800; color: #16a34a;">A</td>
              <td style="border: 1px solid #000; padding: 2px 5px; text-align: center; font-weight: 700;"><?= $activeGradeA ?> – 100</td>
              <td style="border: 1px solid #000; padding: 2px 5px; font-weight: 700;">EXCELLENT</td>
              <td style="border: 1px solid #000; padding: 2px 5px; text-align: center; font-weight: 800; color: #ca8a04;">D</td>
              <td style="border: 1px solid #000; padding: 2px 5px; text-align: center; font-weight: 700;"><?= $activeGradeD ?> – <?= $activeGradeC - 1 ?></td>
              <td style="border: 1px solid #000; padding: 2px 5px; font-weight: 700;">PASS</td>
            </tr>
            <tr style="background: #f8fafc;">
              <td style="border: 1px solid #000; padding: 2px 5px; text-align: center; font-weight: 800; color: #2563eb;">B</td>
              <td style="border: 1px solid #000; padding: 2px 5px; text-align: center; font-weight: 700;"><?= $activeGradeB ?> – <?= $activeGradeA - 1 ?></td>
              <td style="border: 1px solid #000; padding: 2px 5px; font-weight: 700;">VERY GOOD</td>
              <td style="border: 1px solid #000; padding: 2px 5px; text-align: center; font-weight: 800; color: #d97706;">E</td>
              <td style="border: 1px solid #000; padding: 2px 5px; text-align: center; font-weight: 700;"><?= $activeGradeE ?> – <?= $activeGradeD - 1 ?></td>
              <td style="border: 1px solid #000; padding: 2px 5px; font-weight: 700;">PASS</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 2px 5px; text-align: center; font-weight: 800; color: #0891b2;">C</td>
              <td style="border: 1px solid #000; padding: 2px 5px; text-align: center; font-weight: 700;"><?= $activeGradeC ?> – <?= $activeGradeB - 1 ?></td>
              <td style="border: 1px solid #000; padding: 2px 5px; font-weight: 700;">CREDIT</td>
              <td style="border: 1px solid #000; padding: 2px 5px; text-align: center; font-weight: 800; color: #dc2626;">F</td>
              <td style="border: 1px solid #000; padding: 2px 5px; text-align: center; font-weight: 700;">0 – <?= $activeGradeE - 1 ?></td>
              <td style="border: 1px solid #000; padding: 2px 5px; font-weight: 700;">FAIL</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Parent/Guardian Acknowledgment -->
      <div style="flex: 1; display: flex; flex-direction: column;">
        <div style="background: #cbd5e1; border-bottom: 1px solid #000; padding: 2px 6px; font-weight: 900; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.3px;">
          PARENT / GUARDIAN ACKNOWLEDGMENT
        </div>
        <div style="padding: 5px 8px; font-size: 8px; font-weight: 600; color: #374151; line-height: 1.5; flex: 1;">
          I have seen and read this report card and I am satisfied with its content.
        </div>
        <div style="padding: 3px 8px 5px; display: flex; gap: 16px; align-items: flex-end;">
          <div style="flex: 1; border-top: 1px solid #000; font-size: 7.5px; padding-top: 2px; font-weight: 700;">Signature</div>
          <div style="flex: 1; border-top: 1px solid #000; font-size: 7.5px; padding-top: 2px; font-weight: 700;">Date</div>
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
          <?= $classTeacherComment ? htmlspecialchars($classTeacherComment) : '&mdash;' ?>
        </div>
      </div>

      <div class="boxed-card" style="margin-bottom: 0;">
        <div class="boxed-card-title">Principal's Remark</div>
        <div class="boxed-card-body" style="font-weight: 700; min-height: 40px; line-height: 1.35;">
          <?= $principalRemark ? htmlspecialchars($principalRemark) : '&mdash;' ?>
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
          <?php
            $aw1 = !empty($assessment['award_1']) && strtoupper(trim($assessment['award_1'])) !== 'NILL'
                   ? htmlspecialchars($assessment['award_1']) : 'NILL';
            $aw2 = !empty($assessment['award_2']) && strtoupper(trim($assessment['award_2'])) !== 'NILL'
                   ? htmlspecialchars($assessment['award_2']) : 'NILL';
          ?>
          <div>1. <?= $aw1 ?></div>
          <div>2. <?= $aw2 ?></div>
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
<?php endforeach; ?>
</body>
</html>
<?php
    }

    public function printMidtermResult() {
        header('Content-Type: text/html; charset=UTF-8');
        $user = Auth::authenticate();

        $studentId  = isset($_GET['student_id']) ? intval($_GET['student_id']) : 0;
        $classParam = $_GET['class_id'] ?? '';

        $studentIds = [];
        $batchClassName = '';

        if (!empty($classParam) && !$studentId) {
            if ($user['role'] !== 'admin' && $user['role'] !== 'teacher') {
                die("<p style='font-family:sans-serif;padding:40px'>Access denied.</p>");
            }
            if (substr($classParam, 0, 9) === 'combined:') {
                $cohort = substr($classParam, 9);
                $batchClassName = $cohort;
                $stmt = $this->conn->prepare("
                    SELECT u.id FROM users u
                    JOIN classes c ON u.class_id = c.id
                    WHERE c.name LIKE :cohort AND u.role = 'student'
                    ORDER BY c.name ASC, u.first_name ASC, u.last_name ASC
                ");
                $stmt->execute([':cohort' => $cohort . '%']);
                $studentIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
            } else {
                $classId = intval($classParam);
                $cn = $this->conn->prepare("SELECT name FROM classes WHERE id = :cid LIMIT 1");
                $cn->execute([':cid' => $classId]);
                $batchClassName = $cn->fetchColumn() ?: "CLASS $classId";

                $stmt = $this->conn->prepare("
                    SELECT id FROM users 
                    WHERE class_id = :cid AND role = 'student' 
                    ORDER BY first_name ASC, last_name ASC
                ");
                $stmt->execute([':cid' => $classId]);
                $studentIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
            }

            if (empty($studentIds)) {
                die("<p style='font-family:sans-serif;padding:40px'>No students found in this class arm.</p>");
            }
        } else {
            if (!$studentId) {
                if ($user['role'] === 'student') $studentId = $user['id'];
                else if ($user['role'] === 'parent') {
                    $s = $this->conn->prepare("SELECT student_id FROM parent_students WHERE parent_id=:pid LIMIT 1");
                    $s->execute([':pid' => $user['id']]);
                    $studentId = $s->fetchColumn();
                }
            }
            if (!$studentId) die("<p style='font-family:sans-serif;padding:40px'>Student ID or Class ID required.</p>");
            $studentIds = [$studentId];
        }

        $termRaw = $_GET['term'] ?? $this->getSetting('current_term', '2nd Term');
        $term    = ($termRaw==='1st'||$termRaw==='1st Term') ? '1st Term' : (($termRaw==='2nd'||$termRaw==='2nd Term') ? '2nd Term' : '3rd Term');
        $session = $_GET['session'] ?? $this->getSetting('academic_session', '2023/2024');

        // School settings
        $schoolName   = $this->getSetting('school_name', 'DEEPER LIFE HIGH SCHOOL');
        $schoolCampus = $this->getSetting('school_campus', 'KADUNA CAMPUS');
        $schoolPrincipal = $this->getSetting('school_principal', 'Mrs. Bamishe Olumuyiwa');
        $logoPath     = $this->getSetting('school_logo_path', 'uploads/logos/dlhs_logo.webp');
        $isHttps      = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);
        $proto        = $isHttps ? 'https://' : 'http://';
        $apiBase      = $proto . ($_SERVER['HTTP_HOST'] ?? 'localhost') . '/lms/api';
        $logoSrc      = $logoPath ? "$apiBase/$logoPath" : '';

        // Vacation & Resumption dates for Mid-Term Break
        $termNum = ($term === '1st Term') ? '1' : (($term === '2nd Term') ? '2' : '3');
        $midtermVacationDate   = $this->getSetting('midterm_vacation_date_term' . $termNum, '');
        if (!$midtermVacationDate) {
            $midtermVacationDate = $this->getSetting('midterm_vacation_date', '');
        }
        $midtermResumptionDate = $this->getSetting('midterm_resumption_date_term' . $termNum, '');
        if (!$midtermResumptionDate) {
            $midtermResumptionDate = $this->getSetting('midterm_resumption_date', '');
        }

        $fmtDate = function($d) {
            if (!$d) return "—";
            $ts = strtotime($d);
            return date('jS F, Y', $ts);
        };
        ?>
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title><?= count($studentIds) > 1 ? "Batch Mid-Term Results — " . htmlspecialchars($batchClassName) : "Mid-Term Result" ?></title>
<link rel="icon" type="image/x-icon" href="/lms/favicon.ico">
<link rel="icon" type="image/png" href="<?= htmlspecialchars($logoSrc ?: '/lms/public/favicon.png') ?>">
<style>
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
@page { size: A4 portrait; margin: 8mm 10mm; }
body { font-family: 'Roboto', Arial, sans-serif; color: #000; background: #334155; padding: 20px 0; font-size: 11px; }
.no-print { width: 210mm; margin: 0 auto 10px; text-align: right; }
.print-btn { background: #2563eb; color: #fff; border: none; padding: 9px 20px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 13px; }
.sheet { width: 210mm; min-height: 297mm; margin: 0 auto 20px; background: #fff; padding: 8mm 9mm 8mm; box-sizing: border-box; box-shadow: 0 10px 35px rgba(0,0,0,0.35); page-break-after: always; break-after: page; }
.sheet:last-child { page-break-after: auto; break-after: auto; }

/* Header */
.header { display: flex; align-items: center; margin-bottom: 6px; }
.logo-wrap { width: 90px; flex-shrink: 0; }
.logo-wrap img { width: 80px; height: 80px; object-fit: contain; }
.logo-fallback { width: 72px; height: 72px; border-radius: 50%; border: 3px solid #dc2626; background: #fef2f2; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #dc2626; font-weight: 900; font-size: 13px; text-align: center; line-height: 1.1; }
.header-center { flex: 1; text-align: center; }
.school-name { font-size: 20px; font-weight: 900; letter-spacing: 0.5px; margin-bottom: 1px; }
.school-campus { font-size: 12px; font-weight: 700; margin-bottom: 2px; }
.school-session { font-size: 13px; font-weight: 900; color: #1565c0; text-transform: uppercase; margin-bottom: 1px; }
.report-title { font-size: 14px; font-weight: 900; color: #dc2626; text-transform: uppercase; }

/* Info table */
.info-table { width: 100%; border-collapse: collapse; border: 1.5px solid #000; margin-bottom: 10px; }
.info-table td { border: 1px solid #000; padding: 4px 8px; font-size: 11px; }
.info-table td.lbl { font-weight: 900; background: #e5e7eb; width: 80px; }
.info-table td.val { font-weight: 700; }

/* Grade table */
.grade-table { width: 100%; border-collapse: collapse; border: 1.5px solid #000; margin-bottom: 12px; font-size: 10.5px; }
.grade-table th { border: 1px solid #000; padding: 5px 4px; text-align: center; font-weight: 900; background: #fff; vertical-align: bottom; font-size: 10px; }
.grade-table th.subj-hdr { text-align: left; padding-left: 6px; width: 42%; }
.grade-table td { border: 1px solid #000; padding: 4px 3px; text-align: center; font-weight: 600; height: 18px; }
.grade-table td.subj-name { text-align: left; font-weight: 700; padding-left: 6px; font-size: 10px; }
.grade-table tr.total-row td { font-weight: 900; background: #f1f5f9; }
.grade-table tr.avg-row td { font-weight: 900; color: #dc2626; background: #fff7f7; }
.remark-cell { font-size: 9px; font-weight: 700; white-space: nowrap; }

/* Remarks section */
.remarks-section { display: flex; flex-direction: column; gap: 8px; }
.remark-box { border: 1.5px solid #000; }
.remark-box-title { background: #e5e7eb; border-bottom: 1px solid #000; padding: 4px 8px; font-weight: 900; font-size: 10px; text-transform: uppercase; }
.remark-box-body { padding: 10px 10px; font-size: 11px; font-weight: 700; min-height: 38px; text-align: center; display: flex; align-items: center; justify-content: center; }

/* Endorsement & Mid-term Dates Section */
.endorsement-section { display: flex; gap: 12px; margin-top: 10px; }
.break-calendar-box { flex: 1; border: 1.5px solid #000; display: flex; flex-direction: column; }
.signature-stamp-box { flex: 1.25; border: 1.5px solid #000; display: flex; flex-direction: column; }
.box-hdr { background: #e5e7eb; border-bottom: 1px solid #000; padding: 4px 8px; font-weight: 900; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; }
.calendar-details { padding: 8px 12px; display: flex; flex-direction: column; justify-content: center; flex: 1; }
.cal-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px dashed #cbd5e1; font-size: 10.5px; }
.cal-row:last-of-type { border-bottom: none; }
.cal-lbl { font-weight: 800; color: #334155; font-size: 10px; }
.cal-val { font-weight: 900; color: #0f172a; }
.cal-note { font-size: 8.5px; font-style: italic; color: #64748b; margin-top: 6px; }
.endorsement-body { padding: 6px 12px; display: flex; align-items: center; justify-content: space-around; flex: 1; min-height: 72px; }
.stamp-wrapper { flex-shrink: 0; transform: rotate(-5deg); opacity: 0.95; }
.sign-block { text-align: center; display: flex; flex-direction: column; align-items: center; }
.sign-canvas { height: 38px; }
.principal-title { border-top: 1px solid #000; padding-top: 3px; width: 140px; }
.principal-name { font-weight: 800; font-size: 10px; color: #000; text-transform: uppercase; }
.principal-role { font-weight: 700; font-size: 8.5px; color: #64748b; letter-spacing: 0.5px; }

@media print {
  html, body { width: 210mm !important; margin: 0 !important; padding: 0 !important; background: #fff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .no-print { display: none !important; }
  .sheet { width: 210mm !important; min-height: 297mm !important; padding: 6mm 8mm !important; box-shadow: none !important; page-break-after: always !important; break-after: page !important; }
  .sheet:last-child { page-break-after: auto !important; break-after: auto !important; }
}
</style>
</head>
<body>
<div class="no-print">
  <?php if (count($studentIds) > 1): ?>
    <div style="display: flex; justify-content: space-between; align-items: center; background: #1e293b; color: #fff; padding: 12px 18px; border-radius: 8px; margin-bottom: 14px;">
      <div>
        <span style="font-weight: 900; color: #fbbf24; font-size: 14px;">CLASS MID-TERM RESULTS:</span>
        <span style="font-weight: 700; margin-left: 6px;"><?= htmlspecialchars($batchClassName) ?></span>
        <span style="color: #94a3b8; margin-left: 6px;">(<?= count($studentIds) ?> students)</span>
      </div>
      <button onclick="window.print()" class="print-btn" style="background: #d97706;">🖨 Print All <?= count($studentIds) ?> Mid-Terms</button>
    </div>
  <?php else: ?>
    <button onclick="window.print()" class="print-btn" style="background: #d97706;">🖨 Print Mid-Term Result</button>
  <?php endif; ?>
</div>

<?php
foreach ($studentIds as $sid):
    // Student details
    $ss = $this->conn->prepare("SELECT first_name, last_name, class_id, gender, house FROM users WHERE id=:sid AND role='student' LIMIT 1");
    $ss->execute([':sid' => $sid]);
    $student = $ss->fetch();
    if (!$student) continue;

    $studentName = strtoupper(trim($student['first_name'] . ' ' . $student['last_name']));
    $gender      = strtoupper($student['gender'] ?: 'MALE');
    $house       = strtoupper($student['house'] ?: '—');

    // Resolve class name (historical)
    $histClassId = $student['class_id'];
    $gCls = $this->conn->prepare("SELECT class_id FROM grades WHERE student_id=:sid AND academic_term=:term AND academic_session=:session AND class_id IS NOT NULL LIMIT 1");
    $gCls->execute([':sid'=>$sid,':term'=>$term,':session'=>$session]);
    $fc = $gCls->fetchColumn();
    if ($fc) $histClassId = $fc;

    $className = $batchClassName ?: '—';
    if ($histClassId) {
        $cs = $this->conn->prepare("SELECT name FROM classes WHERE id=:cid LIMIT 1");
        $cs->execute([':cid' => $histClassId]);
        $cn = $cs->fetchColumn();
        if ($cn) $className = strtoupper($cn);
    }

    // Assessment (for comments)
    $as = $this->conn->prepare("SELECT class_teacher_comment, principal_remark FROM student_assessments WHERE student_id=:sid AND academic_term=:term AND academic_session=:session LIMIT 1");
    $as->execute([':sid'=>$sid,':term'=>$term,':session'=>$session]);
    $assessment = $as->fetch() ?: [];

    $classMasterRemark = !empty($assessment['class_teacher_comment']) ? strtoupper($assessment['class_teacher_comment']) : '—';
    $principalComment  = !empty($assessment['principal_remark'])      ? strtoupper($assessment['principal_remark'])      : '—';

    // Fetch midterm grades (assignment_score, project_score, mid_term_test)
    $gs = $this->conn->prepare("
        SELECT c.name as subject,
               g.assignment_score, g.project_score, g.mid_term_test
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        LEFT JOIN grades g ON (e.student_id = g.student_id AND g.course_id = c.id
            AND g.academic_term = :term AND g.academic_session = :session)
        WHERE e.student_id = :sid
        ORDER BY c.name
    ");
    $gs->execute([':sid'=>$sid,':term'=>$term,':session'=>$session]);
    $grades = $gs->fetchAll();

    // Compute totals
    $rows = [];
    $grandTotal = 0;
    foreach ($grades as $g) {
        $asgn  = floatval($g['assignment_score'] ?? 0);
        $proj  = floatval($g['project_score']    ?? 0);
        $test  = floatval($g['mid_term_test']    ?? 0);
        $total = round($asgn + $proj + $test, 2);
        $grandTotal += $total;

        $remark = '';
        if ($total >= 18)     $remark = 'EXCELLENT';
        elseif ($total >= 14) $remark = 'VERY GOOD';
        elseif ($total >= 10) $remark = 'GOOD';
        elseif ($total >= 6)  $remark = 'FAIR';
        else                  $remark = 'POOR';

        $rows[] = [
            'subject' => strtoupper($g['subject']),
            'asgn'    => $asgn > 0 ? number_format($asgn, 2, '.', '') : '',
            'proj'    => $proj > 0 ? number_format($proj, 2, '.', '') : '',
            'test'    => $test > 0 ? number_format($test, 2, '.', '') : '',
            'total'   => $total > 0 ? number_format($total, 2, '.', '') : '',
            'remark'  => $remark,
            'hasData' => ($asgn + $proj + $test) > 0
        ];
    }
    $count   = count(array_filter($rows, fn($r) => $r['hasData']));
    $average = $count > 0 ? round($grandTotal / $count, 2) : 0;
?>
<div class="sheet">

  <!-- Header -->
  <div class="header">
    <div class="logo-wrap">
      <?php if ($logoSrc): ?>
        <img src="<?= $logoSrc ?>" alt="School Logo">
      <?php else: ?>
        <div class="logo-fallback"><span style="font-size:18px;margin-bottom:2px">✝</span><span>DLHS</span></div>
      <?php endif; ?>
    </div>
    <div class="header-center">
      <div class="school-name"><?= htmlspecialchars($schoolName) ?></div>
      <div class="school-campus"><?= htmlspecialchars($schoolCampus) ?></div>
      <div class="school-session"><?= htmlspecialchars($term) ?> <?= htmlspecialchars($session) ?> SESSION</div>
      <div class="report-title">MID-TERM RESULT</div>
    </div>
  </div>

  <!-- Student Info -->
  <table class="info-table">
    <tr>
      <td class="lbl">NAME:</td>
      <td class="val" style="width:50%"><?= htmlspecialchars($studentName) ?></td>
      <td class="lbl" style="width:70px">GENDER:</td>
      <td class="val"><?= htmlspecialchars($gender) ?></td>
    </tr>
    <tr>
      <td class="lbl">CLASS:</td>
      <td class="val"><?= htmlspecialchars($className) ?></td>
      <td class="lbl">HOUSE:</td>
      <td class="val"><?= htmlspecialchars($house) ?></td>
    </tr>
  </table>

  <!-- Grade Table -->
  <table class="grade-table">
    <thead>
      <tr>
        <th class="subj-hdr">SUBJECTS</th>
        <th>ASSIGN<br>-MENT<br>(05)</th>
        <th>PROJECT<br>(05)</th>
        <th>TEST<br>(10)</th>
        <th>TOTAL<br>SCORE<br>(20)</th>
        <th>REMARK</th>
      </tr>
    </thead>
    <tbody>
      <?php foreach ($rows as $row): ?>
      <tr>
        <td class="subj-name"><?= htmlspecialchars($row['subject']) ?></td>
        <td><?= htmlspecialchars($row['asgn']) ?></td>
        <td><?= htmlspecialchars($row['proj']) ?></td>
        <td><?= htmlspecialchars($row['test']) ?></td>
        <td style="font-weight:800"><?= htmlspecialchars($row['total']) ?></td>
        <td class="remark-cell"><?= $row['hasData'] ? htmlspecialchars($row['remark']) : '' ?></td>
      </tr>
      <?php endforeach; ?>
      <tr class="total-row">
        <td class="subj-name" colspan="4" style="text-align:right;padding-right:8px">TOTAL:</td>
        <td><?= number_format($grandTotal, 2) ?></td>
        <td></td>
      </tr>
      <tr class="avg-row">
        <td class="subj-name" colspan="4" style="text-align:right;padding-right:8px;color:#dc2626">AVERAGE:</td>
        <td><?= number_format($average, 2) ?></td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <!-- Remarks -->
  <div class="remarks-section">
    <div class="remark-box">
      <div class="remark-box-title">CLASS MASTER/MISTRESS' REMARK:</div>
      <div class="remark-box-body"><?= htmlspecialchars($classMasterRemark) ?></div>
    </div>
    <div class="remark-box">
      <div class="remark-box-title">PRINCIPAL'S COMMENT:</div>
      <div class="remark-box-body"><?= htmlspecialchars($principalComment) ?></div>
    </div>
  </div>

  <!-- Mid-term Dates & Principal Endorsement Section -->
  <div class="endorsement-section">
    <!-- Mid-Term Break Calendar Box -->
    <div class="break-calendar-box">
      <div class="box-hdr">MID-TERM BREAK CALENDAR</div>
      <div class="calendar-details">
        <div class="cal-row">
          <span class="cal-lbl">DATE OF VACATION:</span>
          <span class="cal-val"><?= htmlspecialchars($fmtDate($midtermVacationDate)) ?></span>
        </div>
        <div class="cal-row">
          <span class="cal-lbl">DATE OF RESUMPTION:</span>
          <span class="cal-val"><?= htmlspecialchars($fmtDate($midtermResumptionDate)) ?></span>
        </div>
        <div class="cal-note">
          * Students are required to observe the break and resume promptly on the stated date.
        </div>
      </div>
    </div>

    <!-- Principal's Signature & Stamp Box -->
    <div class="signature-stamp-box">
      <div class="box-hdr">PRINCIPAL'S SIGNATURE & OFFICIAL STAMP</div>
      <div class="endorsement-body">
        <!-- Stamp Seal -->
        <div class="stamp-wrapper">
          <svg class="official-stamp" viewBox="0 0 140 140" width="84" height="84">
            <defs>
              <path id="stampCircleTop" d="M 22,70 A 48,48 0 0,1 118,70" fill="none" />
              <path id="stampCircleBottom" d="M 118,70 A 48,48 0 0,1 22,70" fill="none" />
            </defs>
            <!-- Outer Double Ring -->
            <circle cx="70" cy="70" r="66" fill="none" stroke="#1e3a8a" stroke-width="2.5" stroke-dasharray="7,3" />
            <circle cx="70" cy="70" r="62" fill="none" stroke="#1e3a8a" stroke-width="1.2" />
            <circle cx="70" cy="70" r="44" fill="none" stroke="#1e3a8a" stroke-width="1.2" />
            <!-- Curved Text along circle -->
            <text fill="#1e3a8a" font-size="8" font-weight="900" letter-spacing="1.1">
              <textPath href="#stampCircleTop" startOffset="50%" text-anchor="middle">DEEPER LIFE HIGH SCHOOL</textPath>
            </text>
            <text fill="#1e3a8a" font-size="8.5" font-weight="900" letter-spacing="1.4">
              <textPath href="#stampCircleBottom" startOffset="50%" text-anchor="middle">★ KADUNA CAMPUS ★</textPath>
            </text>
            <!-- Center Seal Content -->
            <text x="70" y="59" text-anchor="middle" fill="#1e3a8a" font-size="7" font-weight="800" letter-spacing="0.5">OFFICIAL</text>
            <text x="70" y="71" text-anchor="middle" fill="#dc2626" font-size="9" font-weight="900" letter-spacing="1">VERIFIED</text>
            <text x="70" y="82" text-anchor="middle" fill="#1e3a8a" font-size="6.5" font-weight="700"><?= htmlspecialchars($session) ?></text>
          </svg>
        </div>

        <!-- Signature & Principal Name -->
        <div class="sign-block">
          <div class="sign-canvas">
            <svg width="125" height="38" viewBox="0 0 125 38">
              <path d="M10,26 C26,5 36,33 46,15 C56,0 62,31 76,17 C86,7 92,28 112,19 M30,26 C53,23 80,21 106,22" fill="none" stroke="#1e3a8a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="principal-title">
            <div class="principal-name"><?= htmlspecialchars($schoolPrincipal) ?></div>
            <div class="principal-role">PRINCIPAL</div>
          </div>
        </div>
      </div>
    </div>
  </div>

</div>
<?php endforeach; ?>
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

