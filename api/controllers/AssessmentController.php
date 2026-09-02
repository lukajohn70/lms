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
        // Authenticate user
        $user = Auth::authenticate();

        $studentId = isset($_GET['student_id']) ? intval($_GET['student_id']) : 0;
        if (!$studentId) {
            if ($user['role'] === 'student') {
                $studentId = $user['id'];
            } else if ($user['role'] === 'parent') {
                $stmt = $this->conn->prepare("SELECT student_id FROM parent_students WHERE parent_id = :pid LIMIT 1");
                $stmt->execute([':pid' => $user['id']]);
                $studentId = $stmt->fetchColumn();
            }
        }

        if (!$studentId) {
            die("Student ID required.");
        }

        $term = isset($_GET['term']) ? $_GET['term'] : $this->getSetting('current_term', '2nd Term');
        $session = $this->getSetting('academic_session', '2026/2027');
        $schoolName = $this->getSetting('school_name', 'Aroura Academy');

        // Fetch student details
        $stmt = $this->conn->prepare("SELECT first_name, last_name, email FROM users WHERE id = :sid AND role = 'student' LIMIT 1");
        $stmt->execute([':sid' => $studentId]);
        $student = $stmt->fetch();
        if (!$student) {
            die("Student not found.");
        }

        // Fetch grades
        $gradesQuery = "
            SELECT 
                c.name as subject,
                CONCAT(t.first_name, ' ', t.last_name) as teacher,
                g.assignment_score, g.project_score, g.mid_term_test,
                g.ca1, g.ca2, g.exam, g.score as total, g.remarks
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            LEFT JOIN users t ON c.teacher_id = t.id
            LEFT JOIN grades g ON (e.student_id = g.student_id AND g.course_id = c.id)
            WHERE e.student_id = :sid
        ";
        $stmt = $this->conn->prepare($gradesQuery);
        $stmt->execute([':sid' => $studentId]);
        $grades = $stmt->fetchAll();

        // Fetch assessment
        $stmt = $this->conn->prepare("
            SELECT * FROM student_assessments 
            WHERE student_id = :sid AND academic_term = :term AND academic_session = :session 
            LIMIT 1
        ");
        $stmt->execute([':sid' => $studentId, ':term' => $term, ':session' => $session]);
        $assessment = $stmt->fetch();

        // Fetch daily attendance count for this student
        $stmt = $this->conn->prepare("SELECT COUNT(*) FROM attendance WHERE student_id = :sid AND status = 'present'");
        $stmt->execute([':sid' => $studentId]);
        $presentDays = $stmt->fetchColumn();

        $stmt = $this->conn->prepare("SELECT COUNT(*) FROM attendance WHERE student_id = :sid");
        $stmt->execute([':sid' => $studentId]);
        $totalDays = $stmt->fetchColumn() ?: 30; // Default to 30

        $averageScore = 0;
        $totalSum = 0;
        $gradedCount = 0;

        foreach ($grades as &$g) {
            $as = floatval($g['assignment_score'] ?? 0);
            $pr = floatval($g['project_score'] ?? 0);
            $mt = floatval($g['mid_term_test'] ?? 0);
            $g['mid_term_total'] = $as + $pr + $mt;
            
            $tTotal = floatval($g['total'] ?? 0);
            if ($tTotal > 0 || $g['exam'] !== null) {
                $totalSum += $tTotal;
                $gradedCount++;
            }
        }
        if ($gradedCount > 0) {
            $averageScore = round($totalSum / $gradedCount, 1);
        }

        // Ratings helper
        $getTicks = function($val) {
            $ticks = ['', '', '', '', ''];
            $val = intval($val);
            if ($val >= 1 && $val <= 5) {
                $ticks[$val - 1] = '✓';
            }
            return $ticks;
        };

        $gradeLetter = function($total) {
            if ($total >= 80) return ['grade' => 'A1', 'remark' => 'DISTINCTION'];
            if ($total >= 70) return ['grade' => 'B3', 'remark' => 'VERY GOOD'];
            if ($total >= 60) return ['grade' => 'C5', 'remark' => 'CREDIT'];
            if ($total >= 50) return ['grade' => 'D7', 'remark' => 'PASS'];
            if ($total >= 45) return ['grade' => 'E8', 'remark' => 'PASS'];
            return ['grade' => 'F9', 'remark' => 'FAIL'];
        };

        // Render Premium Printable HTML
        ?>
        <!DOCTYPE html>
        <html>
        <head>
            <title>Report Card - <?= htmlspecialchars($student['first_name'] . ' ' . $student['last_name']) ?></title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                body {
                    font-family: 'Inter', sans-serif;
                    color: #1e293b;
                    background: #f8fafc;
                    margin: 0;
                    padding: 30px;
                    font-size: 11px;
                }
                .sheet {
                    max-width: 900px;
                    margin: 0 auto;
                    background: #fff;
                    padding: 40px;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    border-radius: 8px;
                }
                .header-section {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 2px solid #023047;
                    padding-bottom: 15px;
                    margin-bottom: 20px;
                }
                .logo-title {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                .logo-img {
                    width: 60px;
                    height: 60px;
                    border-radius: 8px;
                    background: #219EBC;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #fff;
                    font-weight: 800;
                    font-size: 24px;
                }
                .school-name {
                    font-size: 20px;
                    font-weight: 800;
                    color: #023047;
                }
                .school-sub {
                    font-size: 11px;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .card-title {
                    text-align: right;
                }
                .card-title h2 {
                    margin: 0;
                    color: #219EBC;
                    font-size: 18px;
                    font-weight: 800;
                    text-transform: uppercase;
                }
                .student-details {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 15px;
                    background: #f1f5f9;
                    padding: 12px 18px;
                    border-radius: 6px;
                    margin-bottom: 25px;
                    font-weight: 600;
                }
                .detail-item span {
                    color: #64748b;
                    font-size: 10px;
                    display: block;
                    text-transform: uppercase;
                }
                .main-layout {
                    display: flex;
                    gap: 25px;
                }
                .academic-table-wrap {
                    flex: 1.4;
                }
                .evaluations-wrap {
                    flex: 0.6;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 10.5px;
                }
                th {
                    background: #023047;
                    color: #fff;
                    font-weight: 700;
                    text-transform: uppercase;
                    font-size: 9px;
                    padding: 8px 6px;
                }
                td {
                    border: 1px solid #cbd5e1;
                    padding: 8px 6px;
                    text-align: center;
                }
                .sub-name {
                    text-align: left;
                    font-weight: 700;
                }
                .eval-table th {
                    background: #f1f5f9;
                    color: #023047;
                }
                .eval-table td {
                    padding: 5px 4px;
                    font-size: 10px;
                }
                .eval-table td:first-child {
                    text-align: left;
                    font-weight: 600;
                }
                .tick {
                    font-weight: 800;
                    color: #219EBC;
                }
                .remarks-section {
                    margin-top: 25px;
                    border-top: 1.5px solid #cbd5e1;
                    padding-top: 15px;
                }
                .comment-block {
                    margin-bottom: 12px;
                }
                .comment-title {
                    font-weight: 700;
                    text-transform: uppercase;
                    font-size: 9.5px;
                    color: #023047;
                    margin-bottom: 4px;
                }
                .comment-text {
                    font-style: italic;
                    color: #475569;
                    background: #fafafa;
                    padding: 8px 12px;
                    border-radius: 4px;
                    border-left: 3px solid #219EBC;
                }
                .signatures {
                    margin-top: 40px;
                    display: flex;
                    justify-content: space-between;
                }
                .sig-line {
                    border-top: 1px solid #94a3b8;
                    width: 200px;
                    text-align: center;
                    padding-top: 6px;
                    font-weight: 600;
                    color: #64748b;
                }
                @media print {
                    body {
                        background: none;
                        padding: 0;
                    }
                    .sheet {
                        border: none;
                        box-shadow: none;
                        padding: 0;
                    }
                    .no-print {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            <div class="sheet">
                <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: flex-end;">
                    <button onclick="window.print()" style="background: #219EBC; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 700; cursor: pointer;">Print Report Card</button>
                </div>
                
                <div class="header-section">
                    <div class="logo-title">
                        <div class="logo-img"><?= substr($schoolName, 0, 1) ?></div>
                        <div>
                            <div class="school-name"><?= htmlspecialchars($schoolName) ?></div>
                            <div class="school-sub">Official Academic Transcript</div>
                        </div>
                    </div>
                    <div class="card-title">
                        <h2>Report Card</h2>
                        <div style="font-weight: 600; font-size: 11px; margin-top: 3px;"><?= htmlspecialchars($term) ?> · <?= htmlspecialchars($session) ?></div>
                    </div>
                </div>

                <div class="student-details">
                    <div class="detail-item">
                        <span>Student Name</span>
                        <?= htmlspecialchars($student['first_name'] . ' ' . $student['last_name']) ?>
                    </div>
                    <div class="detail-item">
                        <span>Admission No.</span>
                        STU/<?= str_pad($studentId, 3, '0', STR_PAD_LEFT) ?>
                    </div>
                    <div class="detail-item">
                        <span>Attendance Rate</span>
                        <?= intval($presentDays) ?> / <?= intval($totalDays) ?> days (<?= round(($presentDays / $totalDays) * 100) ?>%)
                    </div>
                </div>

                <div class="main-layout">
                    <!-- Academic Performance -->
                    <div class="academic-table-wrap">
                        <h3 style="margin: 0 0 10px 0; color: #023047; text-transform: uppercase; font-size: 11px; border-bottom: 2px solid #219EBC; padding-bottom: 4px;">Subject Performance Summary</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th width="30%">Subject</th>
                                    <th>Asgn<br>(5)</th>
                                    <th>Proj<br>(5)</th>
                                    <th>Test<br>(10)</th>
                                    <th>Mid<br>(20)</th>
                                    <th>CA 2<br>(20)</th>
                                    <th>Exam<br>(60)</th>
                                    <th>Total<br>(100)</th>
                                    <th>Grade</th>
                                    <th>Remark</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($grades as $g): 
                                    $gl = $gradeLetter($g['total'] ?? 0);
                                ?>
                                <tr>
                                    <td class="sub-name"><?= htmlspecialchars($g['subject']) ?></td>
                                    <td><?= $g['assignment_score'] !== null ? floatval($g['assignment_score']) : '—' ?></td>
                                    <td><?= $g['project_score'] !== null ? floatval($g['project_score']) : '—' ?></td>
                                    <td><?= $g['mid_term_test'] !== null ? floatval($g['mid_term_test']) : '—' ?></td>
                                    <td style="background: #f8fafc; font-weight: 600;"><?= $g['assignment_score'] !== null ? floatval($g['mid_term_total']) : '—' ?></td>
                                    <td><?= $g['ca2'] !== null ? floatval($g['ca2']) : '—' ?></td>
                                    <td><?= $g['exam'] !== null ? floatval($g['exam']) : '—' ?></td>
                                    <td style="font-weight: 700; color: #023047;"><?= $g['total'] !== null ? floatval($g['total']) : '—' ?></td>
                                    <td style="font-weight: 700;"><?= $g['total'] !== null ? $gl['grade'] : '—' ?></td>
                                    <td style="font-size: 9px; font-weight: 600;"><?= $g['total'] !== null ? $gl['remark'] : '—' ?></td>
                                </tr>
                                <?php endforeach; ?>
                                <tr style="background: #f1f5f9; font-weight: 800; font-size: 11px;">
                                    <td colspan="7" style="text-align: right; padding: 10px;">AVERAGE SCORE</td>
                                    <td colspan="3" style="color: #219EBC; text-align: left; padding-left: 15px; font-size: 12px;"><?= $averageScore ?>%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Behavior and Skill Ratings -->
                    <div class="evaluations-wrap">
                        <!-- Character development -->
                        <div>
                            <h4 style="margin: 0 0 8px 0; color: #023047; text-transform: uppercase; font-size: 10px; border-bottom: 1.5px solid #219EBC; padding-bottom: 2px;">Affective Domain</h4>
                            <table class="eval-table">
                                <thead>
                                    <tr>
                                        <th width="50%">Trait</th>
                                        <th>1</th>
                                        <th>2</th>
                                        <th>3</th>
                                        <th>4</th>
                                        <th>5</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php 
                                    $traits = [
                                        'punctuality' => 'Punctuality',
                                        'neatness' => 'Neatness',
                                        'politeness' => 'Politeness',
                                        'honesty' => 'Honesty',
                                        'team_spirit' => 'Cooperation',
                                        'leadership' => 'Leadership',
                                        'helping_others' => 'Helpfulness',
                                        'emotional_stability' => 'Emotional Stability',
                                        'health' => 'Health',
                                        'attitude_to_work' => 'Attitude',
                                        'attentiveness' => 'Attentiveness',
                                        'perseverance' => 'Perseverance',
                                        'spoken_english' => 'Spoken English'
                                    ];
                                    foreach ($traits as $key => $label):
                                        $ticks = $getTicks($assessment[$key] ?? 0);
                                    ?>
                                    <tr>
                                        <td><?= $label ?></td>
                                        <?php for($i=0; $i<5; $i++): ?>
                                            <td class="tick"><?= $ticks[$i] ?></td>
                                        <?php endfor; ?>
                                    </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>

                        <!-- Psychomotor -->
                        <div>
                            <h4 style="margin: 0 0 8px 0; color: #023047; text-transform: uppercase; font-size: 10px; border-bottom: 1.5px solid #219EBC; padding-bottom: 2px;">Psychomotor Domain</h4>
                            <table class="eval-table">
                                <thead>
                                    <tr>
                                        <th width="50%">Skill</th>
                                        <th>1</th>
                                        <th>2</th>
                                        <th>3</th>
                                        <th>4</th>
                                        <th>5</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php 
                                    $skills = [
                                        'handwriting' => 'Handwriting',
                                        'verbal_fluency' => 'Verbal Fluency',
                                        'sports' => 'Sports & Games',
                                        'handling_tools' => 'Tools Handling',
                                        'drawing_painting' => 'Drawing & Painting',
                                        'musical' => 'Music'
                                    ];
                                    foreach ($skills as $key => $label):
                                        $ticks = $getTicks($assessment[$key] ?? 0);
                                    ?>
                                    <tr>
                                        <td><?= $label ?></td>
                                        <?php for($i=0; $i<5; $i++): ?>
                                            <td class="tick"><?= $ticks[$i] ?></td>
                                        <?php endfor; ?>
                                    </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Descriptive Comments -->
                <div class="remarks-section">
                    <?php if (!empty($assessment['class_teacher_comment'])): ?>
                    <div class="comment-block">
                        <div class="comment-title">Form Teacher's Remarks</div>
                        <div class="comment-text"><?= htmlspecialchars($assessment['class_teacher_comment']) ?></div>
                    </div>
                    <?php endif; ?>

                    <?php if (!empty($assessment['principal_remark'])): ?>
                    <div class="comment-block">
                        <div class="comment-title">Principal's Decision & Remarks</div>
                        <div class="comment-text"><?= htmlspecialchars($assessment['principal_remark']) ?></div>
                    </div>
                    <?php endif; ?>
                </div>

                <div class="signatures">
                    <div class="sig-line">Class Teacher Signature</div>
                    <div class="sig-line">Principal Signature</div>
                </div>
            </div>
        </body>
        </html>
        <?php
    }
}
