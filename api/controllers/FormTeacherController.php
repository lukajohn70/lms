<?php
require_once 'config/Database.php';
require_once 'lib/Auth.php';

class FormTeacherController {
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

    // Check if the teacher has access to the specified class arm as form teacher or admin
    private function verifyFormTeacherAccess($user, $classId) {
        if ($user['role'] === 'admin') return true;

        $stmt = $this->conn->prepare("SELECT id FROM classes WHERE id = :cid AND form_teacher_id = :tid");
        $stmt->execute([':cid' => $classId, ':tid' => $user['id']]);
        return $stmt->fetch() !== false;
    }

    // Get list of class arms assigned to the logged-in teacher (0, 1, or 2 arms)
    public function getFormClasses() {
        $user = Auth::requireRole(['teacher', 'admin']);

        if ($user['role'] === 'admin') {
            $stmt = $this->conn->query("
                SELECT c.id, c.name, c.department, c.form_teacher_id,
                       CONCAT(u.first_name, ' ', u.last_name) AS form_teacher_name,
                       (SELECT COUNT(*) FROM users s WHERE s.class_id = c.id AND s.role = 'student') AS student_count
                FROM classes c
                LEFT JOIN users u ON c.form_teacher_id = u.id
                ORDER BY c.name ASC
            ");
            $classes = $stmt->fetchAll();
            echo json_encode(["form_classes" => $classes, "is_form_teacher" => count($classes) > 0]);
            return;
        }

        $stmt = $this->conn->prepare("
            SELECT c.id, c.name, c.department, c.form_teacher_id,
                   (SELECT COUNT(*) FROM users s WHERE s.class_id = c.id AND s.role = 'student') AS student_count
            FROM classes c
            WHERE c.form_teacher_id = :tid
            ORDER BY c.name ASC
        ");
        $stmt->execute([':tid' => $user['id']]);
        $classes = $stmt->fetchAll();

        echo json_encode([
            "form_classes" => $classes,
            "is_form_teacher" => count($classes) > 0
        ]);
    }

    // Get all students enrolled in a class arm with their assessment record for current term
    public function getFormClassStudents() {
        $user = Auth::requireRole(['teacher', 'admin']);
        $classId = isset($_GET['class_id']) ? intval($_GET['class_id']) : 0;

        if (!$classId) {
            http_response_code(400);
            echo json_encode(["error" => "Class arm ID is required"]);
            return;
        }

        if (!$this->verifyFormTeacherAccess($user, $classId)) {
            http_response_code(403);
            echo json_encode(["error" => "You are not the designated Form Teacher for this class arm."]);
            return;
        }

        $term = $this->getSetting('current_term', '2nd Term');
        $session = $this->getSetting('academic_session', '2026/2027');

        // Fetch class info
        $cStmt = $this->conn->prepare("SELECT id, name, department FROM classes WHERE id = :cid");
        $cStmt->execute([':cid' => $classId]);
        $classInfo = $cStmt->fetch();

        if (!$classInfo) {
            http_response_code(404);
            echo json_encode(["error" => "Class arm not found"]);
            return;
        }

        // Fetch students and assessments
        $query = "
            SELECT 
                u.id, u.first_name, u.last_name, u.admission_number, u.email, u.gender, u.house, u.sport_activities,
                sa.punctuality, sa.neatness, sa.politeness, sa.honesty, sa.team_spirit, sa.leadership, sa.helping_others, 
                sa.emotional_stability, sa.health, sa.attitude_to_work, sa.attentiveness, sa.perseverance, sa.spoken_english,
                sa.handwriting, sa.verbal_fluency, sa.sports, sa.handling_tools, sa.musical, sa.drawing_painting,
                sa.days_present, sa.days_absent, sa.total_days,
                sa.class_teacher_comment, sa.principal_remark, sa.award_1, sa.award_2
            FROM users u
            LEFT JOIN student_assessments sa ON (u.id = sa.student_id AND sa.academic_term = :term AND sa.academic_session = :session)
            WHERE u.class_id = :cid AND u.role = 'student'
            ORDER BY u.first_name ASC, u.last_name ASC
        ";

        $stmt = $this->conn->prepare($query);
        $stmt->execute([':cid' => $classId, ':term' => $term, ':session' => $session]);
        $students = $stmt->fetchAll();

        $formatted = [];
        foreach ($students as $s) {
            $formatted[] = [
                "id" => $s['id'],
                "first_name" => $s['first_name'],
                "last_name" => $s['last_name'],
                "name" => trim($s['first_name'] . " " . $s['last_name']),
                "admission_number" => $s['admission_number'] ?: "ADM-" . str_pad($s['id'], 4, '0', STR_PAD_LEFT),
                "email" => $s['email'],
                "gender" => $s['gender'] ?: "MALE",
                "house" => $s['house'] ?: "FAITH",
                "sport_activities" => $s['sport_activities'] ?: "BASKETBALL",
                "award_1" => $s['award_1'] ?: "NILL",
                "award_2" => $s['award_2'] ?: "NILL",
                "days_present" => $s['days_present'] !== null ? intval($s['days_present']) : null,
                "days_absent" => $s['days_absent'] !== null ? intval($s['days_absent']) : null,
                "total_days" => $s['total_days'] !== null ? intval($s['total_days']) : null,
                // Affective Traits (1-5)
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
                // Psychomotor Skills (1-5)
                "handwriting" => $s['handwriting'] !== null ? intval($s['handwriting']) : 0,
                "verbal_fluency" => $s['verbal_fluency'] !== null ? intval($s['verbal_fluency']) : 0,
                "sports" => $s['sports'] !== null ? intval($s['sports']) : 0,
                "handling_tools" => $s['handling_tools'] !== null ? intval($s['handling_tools']) : 0,
                "musical" => $s['musical'] !== null ? intval($s['musical']) : 0,
                "drawing_painting" => $s['drawing_painting'] !== null ? intval($s['drawing_painting']) : 0,
                // Comments
                "class_teacher_comment" => $s['class_teacher_comment'] ?: "",
                "principal_remark" => $s['principal_remark'] ?: ""
            ];
        }

        echo json_encode([
            "class" => $classInfo,
            "term" => $term,
            "session" => $session,
            "students" => $formatted
        ]);
    }

    // Save/Update assessment for a student by their Form Teacher
    public function saveAssessment() {
        $user = Auth::requireRole(['teacher', 'admin']);
        $data = json_decode(file_get_contents("php://input"), true);

        if (!$data || empty($data['student_id']) || empty($data['class_id'])) {
            http_response_code(400);
            echo json_encode(["error" => "Incomplete assessment data"]);
            return;
        }

        $classId = intval($data['class_id']);
        $studentId = intval($data['student_id']);

        if (!$this->verifyFormTeacherAccess($user, $classId)) {
            http_response_code(403);
            echo json_encode(["error" => "Unauthorized: You are not the Form Teacher for this class arm."]);
            return;
        }

        // Verify student belongs to this class arm
        $sChk = $this->conn->prepare("SELECT id FROM users WHERE id = :sid AND class_id = :cid AND role = 'student'");
        $sChk->execute([':sid' => $studentId, ':cid' => $classId]);
        if (!$sChk->fetch()) {
            http_response_code(400);
            echo json_encode(["error" => "Student does not belong to this class arm."]);
            return;
        }

        $term = $this->getSetting('current_term', '2nd Term');
        $session = $this->getSetting('academic_session', '2026/2027');

        try {
            $query = "
                INSERT INTO student_assessments (
                    student_id, academic_term, academic_session,
                    punctuality, neatness, politeness, honesty, team_spirit, leadership, helping_others, emotional_stability, health, attitude_to_work, attentiveness, perseverance, spoken_english,
                    handwriting, verbal_fluency, sports, handling_tools, musical, drawing_painting,
                    days_present, days_absent, total_days,
                    class_teacher_comment, award_1, award_2
                ) VALUES (
                    :sid, :term, :session,
                    :punc, :neat, :poli, :hone, :team, :lead, :help, :emot, :heal, :atti, :atte, :pers, :spok,
                    :hand, :verb, :spor, :handl, :musi, :draw,
                    :present, :absent, :total,
                    :teacher_comment, :award_1, :award_2
                ) ON DUPLICATE KEY UPDATE
                    punctuality = :punc, neatness = :neat, politeness = :poli, honesty = :hone, team_spirit = :team, leadership = :lead, helping_others = :help, emotional_stability = :emot, health = :heal, attitude_to_work = :atti, attentiveness = :atte, perseverance = :pers, spoken_english = :spok,
                    handwriting = :hand, verbal_fluency = :verb, sports = :spor, handling_tools = :handl, musical = :musi, drawing_painting = :draw,
                    days_present = :present, days_absent = :absent, total_days = :total,
                    class_teacher_comment = :teacher_comment,
                    award_1 = :award_1, award_2 = :award_2
            ";

            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                ':sid' => $studentId,
                ':term' => $term,
                ':session' => $session,
                ':punc' => isset($data['punctuality']) && $data['punctuality'] > 0 ? min(5, max(1, intval($data['punctuality']))) : null,
                ':neat' => isset($data['neatness']) && $data['neatness'] > 0 ? min(5, max(1, intval($data['neatness']))) : null,
                ':poli' => isset($data['politeness']) && $data['politeness'] > 0 ? min(5, max(1, intval($data['politeness']))) : null,
                ':hone' => isset($data['honesty']) && $data['honesty'] > 0 ? min(5, max(1, intval($data['honesty']))) : null,
                ':team' => isset($data['team_spirit']) && $data['team_spirit'] > 0 ? min(5, max(1, intval($data['team_spirit']))) : null,
                ':lead' => isset($data['leadership']) && $data['leadership'] > 0 ? min(5, max(1, intval($data['leadership']))) : null,
                ':help' => isset($data['helping_others']) && $data['helping_others'] > 0 ? min(5, max(1, intval($data['helping_others']))) : null,
                ':emot' => isset($data['emotional_stability']) && $data['emotional_stability'] > 0 ? min(5, max(1, intval($data['emotional_stability']))) : null,
                ':heal' => isset($data['health']) && $data['health'] > 0 ? min(5, max(1, intval($data['health']))) : null,
                ':atti' => isset($data['attitude_to_work']) && $data['attitude_to_work'] > 0 ? min(5, max(1, intval($data['attitude_to_work']))) : null,
                ':atte' => isset($data['attentiveness']) && $data['attentiveness'] > 0 ? min(5, max(1, intval($data['attentiveness']))) : null,
                ':pers' => isset($data['perseverance']) && $data['perseverance'] > 0 ? min(5, max(1, intval($data['perseverance']))) : null,
                ':spok' => isset($data['spoken_english']) && $data['spoken_english'] > 0 ? min(5, max(1, intval($data['spoken_english']))) : null,
                ':hand' => isset($data['handwriting']) && $data['handwriting'] > 0 ? min(5, max(1, intval($data['handwriting']))) : null,
                ':verb' => isset($data['verbal_fluency']) && $data['verbal_fluency'] > 0 ? min(5, max(1, intval($data['verbal_fluency']))) : null,
                ':spor' => isset($data['sports']) && $data['sports'] > 0 ? min(5, max(1, intval($data['sports']))) : null,
                ':handl' => isset($data['handling_tools']) && $data['handling_tools'] > 0 ? min(5, max(1, intval($data['handling_tools']))) : null,
                ':musi' => isset($data['musical']) && $data['musical'] > 0 ? min(5, max(1, intval($data['musical']))) : null,
                ':draw' => isset($data['drawing_painting']) && $data['drawing_painting'] > 0 ? min(5, max(1, intval($data['drawing_painting']))) : null,
                ':present' => isset($data['days_present']) && $data['days_present'] !== '' && $data['days_present'] !== null ? max(0, intval($data['days_present'])) : null,
                ':absent' => isset($data['days_absent']) && $data['days_absent'] !== '' && $data['days_absent'] !== null ? max(0, intval($data['days_absent'])) : null,
                ':total' => isset($data['total_days']) && $data['total_days'] !== '' && $data['total_days'] !== null ? max(0, intval($data['total_days'])) : null,
                ':teacher_comment' => isset($data['class_teacher_comment']) ? trim($data['class_teacher_comment']) : null,
                ':award_1' => isset($data['award_1']) ? trim($data['award_1']) : 'NILL',
                ':award_2' => isset($data['award_2']) ? trim($data['award_2']) : 'NILL'
            ]);

            echo json_encode(["success" => true, "message" => "Form teacher assessment saved successfully."]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to save assessment: " . $e->getMessage()]);
        }
    }

    // Form teacher can edit students names ONLY (first_name and last_name)
    public function updateStudentName() {
        $user = Auth::requireRole(['teacher', 'admin']);
        $data = json_decode(file_get_contents("php://input"), true);

        if (!$data || empty($data['student_id']) || empty($data['first_name']) || empty($data['last_name'])) {
            http_response_code(400);
            echo json_encode(["error" => "First name and last name are required."]);
            return;
        }

        $studentId = intval($data['student_id']);
        $firstName = trim($data['first_name']);
        $lastName = trim($data['last_name']);

        if (strlen($firstName) < 2 || strlen($lastName) < 2) {
            http_response_code(400);
            echo json_encode(["error" => "Names must be at least 2 characters long."]);
            return;
        }

        // Fetch student's class
        $stmt = $this->conn->prepare("SELECT id, class_id FROM users WHERE id = :sid AND role = 'student'");
        $stmt->execute([':sid' => $studentId]);
        $student = $stmt->fetch();

        if (!$student) {
            http_response_code(404);
            echo json_encode(["error" => "Student not found."]);
            return;
        }

        if (!$student['class_id'] || !$this->verifyFormTeacherAccess($user, $student['class_id'])) {
            http_response_code(403);
            echo json_encode(["error" => "Unauthorized: You can only edit names of students in your assigned form class arm."]);
            return;
        }

        try {
            // STRICT SECURITY: Only first_name and last_name are touched
            $uStmt = $this->conn->prepare("UPDATE users SET first_name = :fn, last_name = :ln WHERE id = :sid AND role = 'student'");
            $uStmt->execute([':fn' => $firstName, ':ln' => $lastName, ':sid' => $studentId]);

            echo json_encode([
                "success" => true,
                "message" => "Student name updated successfully.",
                "student" => [
                    "id" => $studentId,
                    "first_name" => $firstName,
                    "last_name" => $lastName,
                    "name" => "$firstName $lastName"
                ]
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to update student name: " . $e->getMessage()]);
        }
    }

    // Download CSV template pre-populated with student roster of that arm
    public function downloadCsvTemplate() {
        $user = Auth::requireRole(['teacher', 'admin']);
        $classId = isset($_GET['class_id']) ? intval($_GET['class_id']) : 0;

        if (!$classId || !$this->verifyFormTeacherAccess($user, $classId)) {
            http_response_code(403);
            echo json_encode(["error" => "Unauthorized access to class arm template"]);
            return;
        }

        $cStmt = $this->conn->prepare("SELECT name FROM classes WHERE id = :cid");
        $cStmt->execute([':cid' => $classId]);
        $className = $cStmt->fetchColumn() ?: "Class_Arm";

        $term = $this->getSetting('current_term', '2nd Term');
        $session = $this->getSetting('academic_session', '2026/2027');

        // Fetch students
        $query = "
            SELECT 
                u.id, u.admission_number, u.first_name, u.last_name,
                sa.punctuality, sa.neatness, sa.politeness, sa.honesty, sa.team_spirit, sa.leadership, sa.helping_others, 
                sa.emotional_stability, sa.health, sa.attitude_to_work, sa.attentiveness, sa.perseverance, sa.spoken_english,
                sa.handwriting, sa.verbal_fluency, sa.sports, sa.handling_tools, sa.musical, sa.drawing_painting,
                sa.days_present, sa.days_absent, sa.total_days,
                sa.class_teacher_comment, sa.award_1, sa.award_2
            FROM users u
            LEFT JOIN student_assessments sa ON (u.id = sa.student_id AND sa.academic_term = :term AND sa.academic_session = :session)
            WHERE u.class_id = :cid AND u.role = 'student'
            ORDER BY u.first_name ASC, u.last_name ASC
        ";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([':cid' => $classId, ':term' => $term, ':session' => $session]);
        $students = $stmt->fetchAll();

        $headers = [
            "student_id", "admission_number", "student_name",
            // Affective (1-5)
            "punctuality", "neatness", "politeness", "honesty", "cooperation", "leadership", 
            "helpfulness", "emotional_stability", "health", "attitude_to_work", "attentiveness", 
            "perseverance", "spoken_english",
            // Psychomotor (1-5)
            "handwriting", "verbal_fluency", "sports", "handling_tools", "drawing_painting", "music",
            // Attendance
            "days_present", "days_absent", "total_days",
            // Awards & Comment
            "award_1", "award_2", "form_teacher_comment"
        ];

        $safeClassName = preg_replace('/[^A-Za-z0-9_-]/', '_', $className);
        $filename = "{$safeClassName}_Form_Teacher_Assessment_Template.csv";

        header('Content-Type: text/csv; charset=UTF-8');
        header("Content-Disposition: attachment; filename=\"$filename\"");
        header('Pragma: no-cache');
        header('Expires: 0');

        $out = fopen('php://output', 'w');
        // UTF-8 BOM for Excel
        fprintf($out, chr(0xEF).chr(0xBB).chr(0xBF));

        // Comment instructions
        fputcsv($out, ["# AROURA ACADEMY — FORM TEACHER ASSESSMENT TEMPLATE"]);
        fputcsv($out, ["# Class Arm: $className | Term: $term | Session: $session"]);
        fputcsv($out, ["# Ratings scale: 1 (Poor) to 5 (Excellent). Do not edit student_id or admission_number."]);
        fputcsv($out, $headers);

        foreach ($students as $s) {
            fputcsv($out, [
                $s['id'],
                $s['admission_number'] ?: "ADM-" . str_pad($s['id'], 4, '0', STR_PAD_LEFT),
                trim($s['first_name'] . " " . $s['last_name']),
                $s['punctuality'] ?: "",
                $s['neatness'] ?: "",
                $s['politeness'] ?: "",
                $s['honesty'] ?: "",
                $s['team_spirit'] ?: "",
                $s['leadership'] ?: "",
                $s['helping_others'] ?: "",
                $s['emotional_stability'] ?: "",
                $s['health'] ?: "",
                $s['attitude_to_work'] ?: "",
                $s['attentiveness'] ?: "",
                $s['perseverance'] ?: "",
                $s['spoken_english'] ?: "",
                $s['handwriting'] ?: "",
                $s['verbal_fluency'] ?: "",
                $s['sports'] ?: "",
                $s['handling_tools'] ?: "",
                $s['drawing_painting'] ?: "",
                $s['musical'] ?: "",
                $s['days_present'] !== null ? $s['days_present'] : "",
                $s['days_absent'] !== null ? $s['days_absent'] : "",
                $s['total_days'] !== null ? $s['total_days'] : "",
                $s['award_1'] ?: "NILL",
                $s['award_2'] ?: "NILL",
                $s['class_teacher_comment'] ?: ""
            ]);
        }

        fclose($out);
        exit;
    }

    // Bulk import Form Teacher assessments from CSV
    public function importCsv() {
        $user = Auth::requireRole(['teacher', 'admin']);
        $classId = isset($_POST['class_id']) ? intval($_POST['class_id']) : 0;

        if (!$classId || !$this->verifyFormTeacherAccess($user, $classId)) {
            http_response_code(403);
            echo json_encode(["error" => "Unauthorized access to import for this class arm."]);
            return;
        }

        if (!isset($_FILES['csv_file'])) {
            http_response_code(400);
            echo json_encode(["error" => "No CSV file was uploaded."]);
            return;
        }

        $file = $_FILES['csv_file'];
        if (strtolower(pathinfo($file['name'], PATHINFO_EXTENSION)) !== 'csv') {
            http_response_code(400);
            echo json_encode(["error" => "Only CSV files are allowed."]);
            return;
        }

        $handle = fopen($file['tmp_name'], 'r');
        if (!$handle) {
            http_response_code(500);
            echo json_encode(["error" => "Unable to read uploaded CSV."]);
            return;
        }

        // Skip comment lines (#)
        $headers = null;
        while (($row = fgetcsv($handle, 2000, ",")) !== false) {
            if (empty($row) || (isset($row[0]) && substr(trim($row[0]), 0, 1) === '#')) {
                continue;
            }
            $headers = $row;
            break;
        }

        if (!$headers) {
            fclose($handle);
            http_response_code(400);
            echo json_encode(["error" => "CSV file does not contain a valid header row."]);
            return;
        }

        // Clean header keys
        $cleanHeaders = array_map(function($h) {
            return strtolower(trim(preg_replace('/[\x00-\x1F\x80-\xFF]/', '', $h)));
        }, $headers);
        $headerMap = array_flip($cleanHeaders);

        // Required student identifier
        $hasStudentId = isset($headerMap['student_id']);
        $hasAdmNo = isset($headerMap['admission_number']) || isset($headerMap['adm_no']);

        if (!$hasStudentId && !$hasAdmNo) {
            fclose($handle);
            http_response_code(400);
            echo json_encode(["error" => "CSV must include a 'student_id' or 'admission_number' column."]);
            return;
        }

        // Fetch students in this class arm for validation and mapping
        $stmt = $this->conn->prepare("SELECT id, admission_number, first_name, last_name FROM users WHERE class_id = :cid AND role = 'student'");
        $stmt->execute([':cid' => $classId]);
        $roster = $stmt->fetchAll();

        $rosterById = [];
        $rosterByAdm = [];
        foreach ($roster as $r) {
            $rosterById[intval($r['id'])] = $r;
            if ($r['admission_number']) {
                $rosterByAdm[strtolower(trim($r['admission_number']))] = $r;
            }
        }

        $term = $this->getSetting('current_term', '2nd Term');
        $session = $this->getSetting('academic_session', '2026/2027');

        $upsertQuery = "
            INSERT INTO student_assessments (
                student_id, academic_term, academic_session,
                punctuality, neatness, politeness, honesty, team_spirit, leadership, helping_others, emotional_stability, health, attitude_to_work, attentiveness, perseverance, spoken_english,
                handwriting, verbal_fluency, sports, handling_tools, musical, drawing_painting,
                days_present, days_absent, total_days,
                class_teacher_comment, award_1, award_2
            ) VALUES (
                :sid, :term, :session,
                :punc, :neat, :poli, :hone, :team, :lead, :help, :emot, :heal, :atti, :atte, :pers, :spok,
                :hand, :verb, :spor, :handl, :musi, :draw,
                :present, :absent, :total,
                :teacher_comment, :award_1, :award_2
            ) ON DUPLICATE KEY UPDATE
                punctuality = COALESCE(:punc, punctuality),
                neatness = COALESCE(:neat, neatness),
                politeness = COALESCE(:poli, politeness),
                honesty = COALESCE(:hone, honesty),
                team_spirit = COALESCE(:team, team_spirit),
                leadership = COALESCE(:lead, leadership),
                helping_others = COALESCE(:help, helping_others),
                emotional_stability = COALESCE(:emot, emotional_stability),
                health = COALESCE(:heal, health),
                attitude_to_work = COALESCE(:atti, attitude_to_work),
                attentiveness = COALESCE(:atte, attentiveness),
                perseverance = COALESCE(:pers, perseverance),
                spoken_english = COALESCE(:spok, spoken_english),
                handwriting = COALESCE(:hand, handwriting),
                verbal_fluency = COALESCE(:verb, verbal_fluency),
                sports = COALESCE(:spor, sports),
                handling_tools = COALESCE(:handl, handling_tools),
                musical = COALESCE(:musi, musical),
                drawing_painting = COALESCE(:draw, drawing_painting),
                days_present = COALESCE(:present, days_present),
                days_absent = COALESCE(:absent, days_absent),
                total_days = COALESCE(:total, total_days),
                class_teacher_comment = COALESCE(:teacher_comment, class_teacher_comment),
                award_1 = COALESCE(:award_1, award_1),
                award_2 = COALESCE(:award_2, award_2)
        ";

        $upsertStmt = $this->conn->prepare($upsertQuery);

        $getRating = function($row, $key) use ($headerMap) {
            if (!isset($headerMap[$key]) || !isset($row[$headerMap[$key]])) return null;
            $val = trim($row[$headerMap[$key]]);
            if ($val === '' || !is_numeric($val)) return null;
            $num = intval($val);
            return ($num >= 1 && $num <= 5) ? $num : null;
        };

        $getInt = function($row, $key) use ($headerMap) {
            if (!isset($headerMap[$key]) || !isset($row[$headerMap[$key]])) return null;
            $val = trim($row[$headerMap[$key]]);
            if ($val === '' || !is_numeric($val)) return null;
            return max(0, intval($val));
        };

        $getText = function($row, $key) use ($headerMap) {
            if (!isset($headerMap[$key]) || !isset($row[$headerMap[$key]])) return null;
            $val = trim($row[$headerMap[$key]]);
            return $val !== '' ? $val : null;
        };

        $updatedCount = 0;
        $skippedCount = 0;
        $rowNum = 1;

        $this->conn->beginTransaction();
        try {
            while (($row = fgetcsv($handle, 2000, ",")) !== false) {
                $rowNum++;
                if (empty($row) || (isset($row[0]) && substr(trim($row[0]), 0, 1) === '#')) continue;

                // Match student
                $student = null;
                if ($hasStudentId && isset($row[$headerMap['student_id']])) {
                    $sid = intval(trim($row[$headerMap['student_id']]));
                    if (isset($rosterById[$sid])) $student = $rosterById[$sid];
                }

                if (!$student && $hasAdmNo) {
                    $admKey = isset($headerMap['admission_number']) ? 'admission_number' : 'adm_no';
                    $adm = strtolower(trim($row[$headerMap[$admKey]]));
                    if (isset($rosterByAdm[$adm])) $student = $rosterByAdm[$adm];
                }

                if (!$student) {
                    $skippedCount++;
                    continue;
                }

                // Extract ratings & fields
                $teamVal = $getRating($row, 'cooperation') ?? $getRating($row, 'team_spirit');
                $musiVal = $getRating($row, 'music') ?? $getRating($row, 'musical');
                $commVal = $getText($row, 'form_teacher_comment') ?? $getText($row, 'class_teacher_comment') ?? $getText($row, 'comment');

                $upsertStmt->execute([
                    ':sid' => $student['id'],
                    ':term' => $term,
                    ':session' => $session,
                    ':punc' => $getRating($row, 'punctuality'),
                    ':neat' => $getRating($row, 'neatness'),
                    ':poli' => $getRating($row, 'politeness'),
                    ':hone' => $getRating($row, 'honesty'),
                    ':team' => $teamVal,
                    ':lead' => $getRating($row, 'leadership'),
                    ':help' => $getRating($row, 'helpfulness') ?? $getRating($row, 'helping_others'),
                    ':emot' => $getRating($row, 'emotional_stability'),
                    ':heal' => $getRating($row, 'health'),
                    ':atti' => $getRating($row, 'attitude_to_work'),
                    ':atte' => $getRating($row, 'attentiveness'),
                    ':pers' => $getRating($row, 'perseverance'),
                    ':spok' => $getRating($row, 'spoken_english'),
                    ':hand' => $getRating($row, 'handwriting'),
                    ':verb' => $getRating($row, 'verbal_fluency'),
                    ':spor' => $getRating($row, 'sports'),
                    ':handl' => $getRating($row, 'handling_tools'),
                    ':musi' => $musiVal,
                    ':draw' => $getRating($row, 'drawing_painting'),
                    ':present' => $getInt($row, 'days_present'),
                    ':absent' => $getInt($row, 'days_absent'),
                    ':total' => $getInt($row, 'total_days'),
                    ':teacher_comment' => $commVal,
                    ':award_1' => $getText($row, 'award_1'),
                    ':award_2' => $getText($row, 'award_2')
                ]);

                $updatedCount++;
            }

            $this->conn->commit();
            fclose($handle);

            echo json_encode([
                "success" => true,
                "updated_count" => $updatedCount,
                "skipped_count" => $skippedCount,
                "message" => "Successfully updated assessments for {$updatedCount} student(s)." . ($skippedCount > 0 ? " ({$skippedCount} skipped rows did not match this class arm)" : "")
            ]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            fclose($handle);
            http_response_code(500);
            echo json_encode(["error" => "CSV Import Error: " . $e->getMessage()]);
        }
    }
}
