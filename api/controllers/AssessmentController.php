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

        // 1. Get courses taught by teacher
        $coursesQuery = "SELECT id, name FROM courses WHERE teacher_id = :tid";
        $coursesStmt = $this->conn->prepare($coursesQuery);
        $coursesStmt->execute([':tid' => $teacher['id']]);
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
                u.email,
                sa.punctuality, sa.neatness, sa.politeness, sa.honesty, sa.team_spirit, sa.leadership, sa.helping_others, sa.emotional_stability, sa.health, sa.attitude_to_work, sa.attentiveness, sa.perseverance, sa.spoken_english,
                sa.handwriting, sa.verbal_fluency, sa.sports, sa.handling_tools, sa.musical, sa.drawing_painting,
                sa.class_teacher_comment, sa.principal_remark
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
                    class_teacher_comment, principal_remark
                ) VALUES (
                    :sid, :term, :session,
                    :punc, :neat, :poli, :hone, :team, :lead, :help, :emot, :heal, :atti, :atte, :pers, :spok,
                    :hand, :verb, :spor, :handl, :musi, :draw,
                    :teacher_comment, :principal_remark
                ) ON DUPLICATE KEY UPDATE
                    punctuality = :punc, neatness = :neat, politeness = :poli, honesty = :hone, team_spirit = :team, leadership = :lead, helping_others = :help, emotional_stability = :emot, health = :heal, attitude_to_work = :atti, attentiveness = :atte, perseverance = :pers, spoken_english = :spok,
                    handwriting = :hand, verbal_fluency = :verb, sports = :spor, handling_tools = :handl, musical = :musi, drawing_painting = :draw,
                    class_teacher_comment = :teacher_comment, principal_remark = :principal_remark
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
                ':principal_remark' => $data['principal_remark'] ?? null
            ]);

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

    // Print Report Card View
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

        $termRaw  = $_GET['term']    ?? $this->getSetting('current_term','2nd Term');
        $term     = ($termRaw==='1st'||$termRaw==='1st Term')?'1st Term':(($termRaw==='2nd'||$termRaw==='2nd Term')?'2nd Term':'3rd Term');
        $session  = $_GET['session'] ?? $this->getSetting('academic_session','2026/2027');
        $viewType = $_GET['view_type'] ?? 'terminal';
        if (!in_array($viewType,['terminal','mid_term','cumulative'])) $viewType='terminal';
        if ($viewType==='cumulative' && $term==='1st Term') $viewType='terminal';

        // Settings
        $schoolName    = $this->getSetting('school_name','Aroura Academy');
        $schoolAcronym = $this->getSetting('school_acronym','AROURA');
        $schoolAddress = $this->getSetting('school_address','');
        $schoolPhone   = $this->getSetting('school_phone','');
        $directorName  = $this->getSetting('school_director_name','');
        $logoPath      = $this->getSetting('school_logo_path','');

        // Term-specific vacation & resumption dates
        $termKey      = $term==='1st Term'?'term1':($term==='2nd Term'?'term2':'term3');
        $vacationDate = $this->getSetting("vacation_date_{$termKey}",'');
        $resumptionDate = $this->getSetting("resumption_date_{$termKey}",'');
        $fmtDate      = fn($d) => $d ? date('j M Y', strtotime($d)) : '—';

        // Student details (with avatar)
        $ss = $this->conn->prepare("SELECT first_name, last_name, email, admission_number, class_id, avatar_path FROM users WHERE id=:sid AND role='student' LIMIT 1");
        $ss->execute([':sid'=>$studentId]);
        $student = $ss->fetch();
        if (!$student) die("<p style='font-family:sans-serif;padding:40px'>Student not found.</p>");

        // Class name
        $className = '';
        if ($student['class_id']) {
            $cs = $this->conn->prepare("SELECT name FROM classes WHERE id=:cid LIMIT 1");
            $cs->execute([':cid'=>$student['class_id']]);
            $className = $cs->fetchColumn() ?: '';
        }

        // Grades
        $gs = $this->conn->prepare("
            SELECT c.id as course_id, c.name as subject,
                   CONCAT(t.first_name,' ',t.last_name) as teacher,
                   g.assignment_score, g.project_score, g.mid_term_test,
                   g.ca1, g.ca2, g.exam, g.score as total, g.status
            FROM enrollments e
            JOIN courses c ON e.course_id=c.id
            LEFT JOIN users t ON c.teacher_id=t.id
            LEFT JOIN grades g ON (e.student_id=g.student_id AND g.course_id=c.id
                AND g.academic_term=:term AND g.academic_session=:session)
            WHERE e.student_id=:sid ORDER BY c.name
        ");
        $gs->execute([':sid'=>$studentId,':term'=>$term,':session'=>$session]);
        $grades = $gs->fetchAll();

        // Multi-term matrix
        $ms = $this->conn->prepare("SELECT course_id,academic_term,score FROM grades WHERE student_id=:sid AND academic_session=:session");
        $ms->execute([':sid'=>$studentId,':session'=>$session]);
        $mmap = [];
        foreach($ms->fetchAll() as $r){
            $tn = ($r['academic_term']==='1st'||$r['academic_term']==='1st Term')?'1st Term':(($r['academic_term']==='2nd'||$r['academic_term']==='2nd Term')?'2nd Term':'3rd Term');
            $mmap[$r['course_id']][$tn]=floatval($r['score']);
        }

        // Assessment
        $as = $this->conn->prepare("SELECT * FROM student_assessments WHERE student_id=:sid AND academic_term=:term AND academic_session=:session LIMIT 1");
        $as->execute([':sid'=>$studentId,':term'=>$term,':session'=>$session]);
        $assessment = $as->fetch();

        // Attendance
        $pa=$this->conn->prepare("SELECT COUNT(*) FROM attendance WHERE student_id=:sid AND status='present'");$pa->execute([':sid'=>$studentId]);$presentDays=$pa->fetchColumn();
        $ta=$this->conn->prepare("SELECT COUNT(*) FROM attendance WHERE student_id=:sid");$ta->execute([':sid'=>$studentId]);$totalDays=$ta->fetchColumn()?:1;

        // Compute per-subject data & averages
        $termSum=0; $cumSum=0; $count=0;
        foreach($grades as &$g){
            $cid=$g['course_id'];
            $g['t1']=$mmap[$cid]['1st Term']??null;
            $g['t2']=$mmap[$cid]['2nd Term']??null;
            $g['t3']=$mmap[$cid]['3rd Term']??null;
            $g['mid_total']=floatval($g['assignment_score']??0)+floatval($g['project_score']??0)+floatval($g['mid_term_test']??0);
            $tot=floatval($g['total']??0);
            // cumulative avg depending on current term
            if($term==='2nd Term'){$avail=array_filter([$g['t1'],$g['t2']],fn($v)=>$v!==null);}
            else{$avail=array_filter([$g['t1'],$g['t2'],$g['t3']],fn($v)=>$v!==null);}
            $g['cum_avg']=!empty($avail)?round(array_sum($avail)/count($avail),1):$tot;
            $termSum+=$tot; $cumSum+=$g['cum_avg']; $count++;
        }
        $termAvg   = $count>0?round($termSum/$count,1):0;
        $cumAvg    = $count>0?round($cumSum/$count,1):0;
        $showAvg   = $viewType==='cumulative'?$cumAvg:$termAvg;

        if($showAvg>=50){$promoText='PROMOTED TO NEXT CLASS';$promoColor='#219EBC';}
        elseif($showAvg>=40){$promoText='PROMOTED ON TRIAL';$promoColor='#FFB703';}
        else{$promoText='ADVISED TO REPEAT';$promoColor='#ef4444';}

        $gl=function($s){
            if($s>=80)return['g'=>'A1','r'=>'DISTINCTION'];if($s>=70)return['g'=>'B3','r'=>'VERY GOOD'];
            if($s>=60)return['g'=>'C5','r'=>'CREDIT'];if($s>=50)return['g'=>'D7','r'=>'PASS'];
            if($s>=45)return['g'=>'E8','r'=>'PASS'];return['g'=>'F9','r'=>'FAIL'];
        };
        $rtg=function($t){
            if($t>=36)return'EXCELLENT';if($t>=28)return'VERY GOOD';
            if($t>=20)return'GOOD';if($t>=12)return'FAIR';return'POOR';
        };
        $getTicks=function($v){$v=intval($v);$r=['','','','',''];if($v>=1&&$v<=5)$r[$v-1]='✓';return $r;};

        $viewLabel = $viewType==='mid_term'?'Mid-Term Assessment':($viewType==='cumulative'?'Cumulative Result Sheet':'End-of-Term Result');
        $admNo = $student['admission_number']?:'STU/'.str_pad($studentId,3,'0',STR_PAD_LEFT);
        $studentName = htmlspecialchars($student['first_name'].' '.$student['last_name']);
        $attendPct = round(($presentDays/$totalDays)*100);

        // Logo / student photo URLs
        $apiBase  = 'http://'.($_SERVER['HTTP_HOST']??'localhost').'/lms/api';
        $logoSrc  = $logoPath ? "$apiBase/$logoPath" : '';
        $photoSrc = $student['avatar_path'] ? "$apiBase/{$student['avatar_path']}" : '';
        ?>
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Report Card — <?= $studentName ?></title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;color:#1e293b;background:#f0f4f8;padding:24px;font-size:11px}
.sheet{max-width:960px;margin:0 auto;background:#fff;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,.12);overflow:hidden}
.header{background:linear-gradient(135deg,#023047 0%,#219EBC 100%);color:#fff;padding:24px 32px;display:flex;justify-content:space-between;align-items:center;gap:16px}
.logo-wrap{display:flex;align-items:center;gap:14px}
.logo-box{width:64px;height:64px;border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}
.logo-box img{width:100%;height:100%;object-fit:cover}
.logo-box .acronym{font-size:22px;font-weight:900;color:#023047}
.school-name{font-size:20px;font-weight:900;letter-spacing:-.3px}
.school-meta{font-size:9.5px;opacity:.8;margin-top:3px;line-height:1.5}
.card-label{text-align:right}
.card-label h2{font-size:17px;font-weight:900;text-transform:uppercase;letter-spacing:.04em}
.card-label .sub{font-size:9.5px;opacity:.8;margin-top:4px;line-height:1.5}
.body{padding:20px 28px}
.student-row{display:flex;gap:16px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:8px;padding:14px 18px;margin-bottom:18px;align-items:center}
.student-photo{width:70px;height:70px;border-radius:8px;object-fit:cover;border:2px solid #219EBC;flex-shrink:0}
.student-photo-placeholder{width:70px;height:70px;border-radius:8px;background:linear-gradient(135deg,#219EBC,#023047);display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:900;flex-shrink:0}
.details-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;flex:1}
.detail-item .lbl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:2px}
.detail-item .val{font-size:12px;font-weight:700;color:#1e293b}
.term-calendar{display:flex;gap:14px;align-items:center;padding:8px 14px;background:linear-gradient(90deg,rgba(33,158,188,.08),rgba(2,48,71,.06));border-radius:7px;border:1px solid rgba(33,158,188,.2);margin-bottom:18px}
.calendar-item{text-align:center}
.calendar-item .lbl{font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;display:block}
.calendar-item .val{font-size:11.5px;font-weight:800;color:#023047}
.calendar-sep{color:#cbd5e1;font-size:14px}
.main-layout{display:flex;gap:20px}
.academic-wrap{flex:1.5}
.eval-wrap{flex:.55;display:flex;flex-direction:column;gap:16px}
.section-title{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#023047;border-bottom:2px solid #219EBC;padding-bottom:4px;margin-bottom:8px}
.section-title.orange{border-color:#FB8500}
table{width:100%;border-collapse:collapse;font-size:10px}
th{background:#023047;color:#fff;font-weight:700;text-transform:uppercase;font-size:8.5px;padding:7px 5px;letter-spacing:.03em}
td{border:1px solid #e2e8f0;padding:7px 5px;text-align:center;vertical-align:middle}
.sub-td{text-align:left;font-weight:700;font-size:10.5px;padding-left:8px}
.avg-row{background:#f1f5f9;font-weight:800;font-size:11px}
.promo-box{margin-top:12px;border:2px solid <?= $promoColor ?>;border-radius:6px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;background:#f8fafc}
.promo-text{font-size:13px;font-weight:900;color:<?= $promoColor ?>}
.promo-badge{font-size:9px;font-weight:700;color:#2a9d8f;background:rgba(42,157,143,.1);padding:4px 8px;border-radius:4px;border:1px solid rgba(42,157,143,.3)}
.eval-table th{background:#f1f5f9;color:#023047;font-size:9px}
.eval-table td{padding:5px 4px;font-size:9.5px}
.eval-table td:first-child{text-align:left;font-weight:600}
.tick{font-weight:800;color:#219EBC}
.remarks{margin-top:20px;border-top:1.5px solid #e2e8f0;padding-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:14px}
.remark-block .remark-title{font-size:9px;font-weight:800;text-transform:uppercase;color:#023047;margin-bottom:5px}
.remark-text{font-style:italic;color:#475569;background:#fafafa;padding:8px 10px;border-radius:4px;border-left:3px solid #219EBC;line-height:1.6;font-size:10.5px}
.sigs{margin-top:30px;display:flex;justify-content:space-between}
.sig-line{border-top:1px solid #94a3b8;width:190px;text-align:center;padding-top:6px;font-weight:600;color:#64748b;font-size:10px}
.no-print{margin-bottom:16px;text-align:right}
@media print{
  body{background:none;padding:0}
  .sheet{box-shadow:none;border-radius:0}
  .no-print{display:none}
}
</style>
</head>
<body>
<div class="sheet">
  <div class="no-print">
    <button onclick="window.print()" style="background:#219EBC;color:#fff;border:none;padding:8px 20px;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;font-family:'Inter',sans-serif">🖨 Print / Save as PDF</button>
  </div>

  <!-- Header -->
  <div class="header">
    <div class="logo-wrap">
      <div class="logo-box">
        <?php if($logoSrc): ?><img src="<?= $logoSrc ?>" alt="Logo"><?php else: ?>
        <span class="acronym"><?= substr($schoolAcronym,0,2) ?></span><?php endif; ?>
      </div>
      <div>
        <div class="school-name"><?= htmlspecialchars($schoolName) ?></div>
        <div class="school-meta">
          <?= htmlspecialchars($schoolAddress) ?><br>
          <?= htmlspecialchars($schoolPhone) ?>
        </div>
      </div>
    </div>
    <div class="card-label">
      <h2><?= $viewLabel ?></h2>
      <div class="sub">
        <?= htmlspecialchars($term) ?> · <?= htmlspecialchars($session) ?><br>
        Director: <?= htmlspecialchars($directorName) ?>
      </div>
    </div>
  </div>

  <div class="body">
    <!-- Student Details Row -->
    <div class="student-row">
      <?php if($photoSrc): ?>
        <img src="<?= $photoSrc ?>" alt="Student Photo" class="student-photo">
      <?php else: ?>
        <div class="student-photo-placeholder"><?= strtoupper(substr($student['first_name'],0,1).substr($student['last_name'],0,1)) ?></div>
      <?php endif; ?>
      <div class="details-grid">
        <div class="detail-item"><span class="lbl">Student Name</span><span class="val"><?= $studentName ?></span></div>
        <div class="detail-item"><span class="lbl">Admission No.</span><span class="val"><?= $admNo ?></span></div>
        <div class="detail-item"><span class="lbl">Class</span><span class="val"><?= htmlspecialchars($className ?: '—') ?></span></div>
        <div class="detail-item"><span class="lbl">Attendance</span><span class="val"><?= intval($presentDays) ?>/<?= intval($totalDays) ?> (<?= $attendPct ?>%)</span></div>
        <div class="detail-item"><span class="lbl">Term Average</span><span class="val" style="color:#219EBC;font-size:14px"><?= $showAvg ?>%</span></div>
        <div class="detail-item"><span class="lbl">Academic Session</span><span class="val"><?= $session ?></span></div>
        <div class="detail-item" style="grid-column:span 2"><span class="lbl">Academic Decision</span><span class="val" style="color:<?= $promoColor ?>"><?= $promoText ?></span></div>
      </div>
    </div>

    <!-- Term Calendar -->
    <div class="term-calendar">
      <div class="calendar-item"><span class="lbl">📅 Term</span><span class="val"><?= $term ?></span></div>
      <span class="calendar-sep">·</span>
      <div class="calendar-item"><span class="lbl">🏫 School Vacates</span><span class="val"><?= $fmtDate($vacationDate) ?></span></div>
      <span class="calendar-sep">→</span>
      <div class="calendar-item"><span class="lbl">🔔 Resumption Date</span><span class="val"><?= $fmtDate($resumptionDate) ?></span></div>
      <span class="calendar-sep">·</span>
      <div class="calendar-item"><span class="lbl">📊 Result Type</span><span class="val" style="color:#219EBC"><?= strtoupper(str_replace('_',' ',$viewType)) ?></span></div>
    </div>

    <div class="main-layout">
      <div class="academic-wrap">
        <?php if($viewType==='terminal'): ?>
        <!-- TERMINAL TABLE -->
        <div class="section-title">End-of-Term Subject Performance</div>
        <table>
          <thead><tr>
            <th style="text-align:left;width:26%">Subject</th>
            <th>CA 1 /20</th><th>CA 2 /20</th><th>Exam /60</th>
            <th>Total /100</th><th>Grade</th><th>Remark</th>
          </tr></thead>
          <tbody>
            <?php foreach($grades as $g): $gl2=$gl(floatval($g['total']??0)); ?>
            <tr>
              <td class="sub-td"><?= htmlspecialchars($g['subject']) ?></td>
              <td><?= $g['ca1']!==null?floatval($g['ca1']):'—' ?></td>
              <td><?= $g['ca2']!==null?floatval($g['ca2']):'—' ?></td>
              <td><?= $g['exam']!==null?floatval($g['exam']):'—' ?></td>
              <td style="font-weight:800;font-size:12px;color:#023047"><?= $g['total']!==null?floatval($g['total']):'—' ?></td>
              <td style="font-weight:800;color:#219EBC"><?= $g['total']!==null?$gl2['g']:'—' ?></td>
              <td style="font-size:9px;font-weight:700"><?= $g['total']!==null?$gl2['r']:'—' ?></td>
            </tr>
            <?php endforeach; ?>
            <tr class="avg-row"><td colspan="4" style="text-align:right;padding-right:12px">TERM AVERAGE</td>
              <td colspan="3" style="color:#219EBC;font-size:13px;text-align:left;padding-left:10px"><?= $termAvg ?>%</td></tr>
          </tbody>
        </table>

        <?php elseif($viewType==='mid_term'): ?>
        <!-- MID-TERM TABLE -->
        <div class="section-title">Mid-Term Assessment Results</div>
        <table>
          <thead><tr>
            <th style="text-align:left;width:26%">Subject</th>
            <th>Assign /10</th><th>Project /10</th><th>Mid-Test /20</th>
            <th>Total /40</th><th>Rating</th>
          </tr></thead>
          <tbody>
            <?php foreach($grades as $g): ?>
            <tr>
              <td class="sub-td"><?= htmlspecialchars($g['subject']) ?></td>
              <td><?= floatval($g['assignment_score']??0) ?></td>
              <td><?= floatval($g['project_score']??0) ?></td>
              <td><?= floatval($g['mid_term_test']??0) ?></td>
              <td style="font-weight:800;font-size:12px"><?= floatval($g['mid_total']) ?></td>
              <td style="font-weight:700;font-size:9px"><?= $rtg(floatval($g['mid_total'])) ?></td>
            </tr>
            <?php endforeach; ?>
            <tr class="avg-row"><td colspan="4" style="text-align:right;padding-right:12px">MID-TERM AVERAGE</td>
              <td colspan="2" style="color:#FFB703;font-size:13px;text-align:left;padding-left:10px"><?= $termAvg ?>%</td></tr>
          </tbody>
        </table>

        <?php else: ?>
        <!-- CUMULATIVE TABLE -->
        <div class="section-title orange"><?= $term==='2nd Term'?'1st & 2nd Term Cumulative':'Full Annual Cumulative (All 3 Terms)' ?></div>
        <table>
          <thead><tr>
            <th style="text-align:left;width:24%">Subject</th>
            <th>1st Term</th><th>2nd Term</th>
            <?php if($term==='3rd Term'): ?><th>3rd Term</th><?php endif; ?>
            <th style="background:#FB8500">Cum. Avg</th><th>Grade</th><th>Remark</th>
          </tr></thead>
          <tbody>
            <?php foreach($grades as $g):
              $cumG=$gl(floatval($g['cum_avg']));
              $termAvgForRow=$g['cum_avg'];
            ?>
            <tr>
              <td class="sub-td"><?= htmlspecialchars($g['subject']) ?></td>
              <td><?= $g['t1']!==null?floatval($g['t1']).'%':'—' ?></td>
              <td><?= $g['t2']!==null?floatval($g['t2']).'%':'—' ?></td>
              <?php if($term==='3rd Term'): ?><td><?= $g['t3']!==null?floatval($g['t3']).'%':'—' ?></td><?php endif; ?>
              <td style="font-weight:800;font-size:12px;color:#023047;background:#fff8f0"><?= floatval($g['cum_avg']) ?>%</td>
              <td style="font-weight:800;color:#219EBC"><?= $cumG['g'] ?></td>
              <td style="font-size:9px;font-weight:700"><?= $cumG['r'] ?></td>
            </tr>
            <?php endforeach; ?>
            <tr class="avg-row">
              <td colspan="<?= $term==='3rd Term'?4:3 ?>" style="text-align:right;padding-right:12px">CUMULATIVE AVERAGE</td>
              <td colspan="3" style="color:#FB8500;font-size:13px;text-align:left;padding-left:10px"><?= $cumAvg ?>%</td>
            </tr>
          </tbody>
        </table>
        <?php endif; ?>

        <!-- Promotion Banner -->
        <div class="promo-box" style="margin-top:14px">
          <div>
            <span style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;display:block;margin-bottom:3px">Academic Board Recommendation</span>
            <span class="promo-text"><?= $promoText ?></span>
          </div>
          <span class="promo-badge">✓ OFFICIAL &amp; PUBLISHED</span>
        </div>
      </div>

      <!-- Evaluations sidebar -->
      <div class="eval-wrap">
        <div>
          <div class="section-title">Affective Domain</div>
          <table class="eval-table">
            <thead><tr><th width="52%">Trait</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr></thead>
            <tbody>
            <?php $traits=['punctuality'=>'Punctuality','neatness'=>'Neatness','politeness'=>'Politeness','honesty'=>'Honesty','team_spirit'=>'Cooperation','leadership'=>'Leadership','helping_others'=>'Helpfulness','emotional_stability'=>'Emot. Stability','health'=>'Health','attitude_to_work'=>'Attitude','attentiveness'=>'Attentiveness','perseverance'=>'Perseverance','spoken_english'=>'Spoken English'];
            foreach($traits as $k=>$lbl):$tks=$getTicks($assessment[$k]??0); ?>
            <tr><td><?= $lbl ?></td><?php for($i=0;$i<5;$i++): ?><td class="tick"><?= $tks[$i] ?></td><?php endfor; ?></tr>
            <?php endforeach; ?>
            </tbody>
          </table>
        </div>
        <div>
          <div class="section-title">Psychomotor Domain</div>
          <table class="eval-table">
            <thead><tr><th width="52%">Skill</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr></thead>
            <tbody>
            <?php $skills=['handwriting'=>'Handwriting','verbal_fluency'=>'Verbal Fluency','sports'=>'Sports & Games','handling_tools'=>'Tools Handling','drawing_painting'=>'Drawing & Art','musical'=>'Music'];
            foreach($skills as $k=>$lbl):$tks=$getTicks($assessment[$k]??0); ?>
            <tr><td><?= $lbl ?></td><?php for($i=0;$i<5;$i++): ?><td class="tick"><?= $tks[$i] ?></td><?php endfor; ?></tr>
            <?php endforeach; ?>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Remarks -->
    <?php if(!empty($assessment['class_teacher_comment'])||!empty($assessment['principal_remark'])): ?>
    <div class="remarks">
      <?php if(!empty($assessment['class_teacher_comment'])): ?>
      <div class="remark-block">
        <div class="remark-title">Form Teacher's Remarks</div>
        <div class="remark-text"><?= htmlspecialchars($assessment['class_teacher_comment']) ?></div>
      </div>
      <?php endif; ?>
      <?php if(!empty($assessment['principal_remark'])): ?>
      <div class="remark-block">
        <div class="remark-title">Principal's Remarks</div>
        <div class="remark-text" style="border-color:#FFB703"><?= htmlspecialchars($assessment['principal_remark']) ?></div>
      </div>
      <?php endif; ?>
    </div>
    <?php endif; ?>

    <div class="sigs">
      <div class="sig-line">Class Teacher's Signature</div>
      <div class="sig-line">Principal's Signature</div>
      <div class="sig-line">Parent's Signature</div>
    </div>
  </div>
</div>
</body>
</html>
<?php
    }
}

