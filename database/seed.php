<?php
require_once __DIR__ . '/../api/config/Database.php';

$db = new Database();
$conn = $db->getConnection();

echo "Starting database seed...\n";

try {
    // Temporarily disable foreign key checks to allow truncation
    $conn->exec("SET FOREIGN_KEY_CHECKS = 0");

    // Clear existing data
    $tables = ['users', 'parent_students', 'courses', 'enrollments', 'materials', 'exams', 'exam_questions', 'exam_options', 'exam_submissions', 'attendance', 'fees', 'fee_payments', 'grades', 'system_settings', 'student_assessments'];
    foreach ($tables as $table) {
        $conn->exec("TRUNCATE TABLE `$table`");
    }

    $conn->exec("SET FOREIGN_KEY_CHECKS = 1");

    $conn->beginTransaction();

    // 1. Users
    $password = password_hash('password123', PASSWORD_BCRYPT);
    $users = [
        ['email' => 'kolade@student.aroura.com', 'role' => 'student', 'first_name' => 'Kolade', 'last_name' => 'Adeyemi'],
        ['email' => 'amaka.eze@teacher.aroura.com', 'role' => 'teacher', 'first_name' => 'Amaka', 'last_name' => 'Eze'],
        ['email' => 'admin@aroura.com', 'role' => 'admin', 'first_name' => 'Seun', 'last_name' => 'Okafor'],
        ['email' => 'folake@parent.aroura.com', 'role' => 'parent', 'first_name' => 'Folake', 'last_name' => 'Adeyemi'],
        // Additional mock students for grade/attendance lists
        ['email' => 'emeka@student.aroura.com', 'role' => 'student', 'first_name' => 'Emeka', 'last_name' => 'Nwosu'],
        ['email' => 'aisha@student.aroura.com', 'role' => 'student', 'first_name' => 'Aisha', 'last_name' => 'Bello'],
        ['email' => 'temi@student.aroura.com', 'role' => 'student', 'first_name' => 'Temi', 'last_name' => 'Olusola'],
        ['email' => 'chukwudi@student.aroura.com', 'role' => 'student', 'first_name' => 'Chukwudi', 'last_name' => 'Okafor'],
        ['email' => 'fatima@student.aroura.com', 'role' => 'student', 'first_name' => 'Fatima', 'last_name' => 'Hassan'],
        ['email' => 'biodun@student.aroura.com', 'role' => 'student', 'first_name' => 'Biodun', 'last_name' => 'Adeyinka'],
        ['email' => 'ngozi@student.aroura.com', 'role' => 'student', 'first_name' => 'Ngozi', 'last_name' => 'Eze'],
    ];

    $userMap = [];
    $studentIds = [];
    $stmt = $conn->prepare("INSERT INTO users (email, password_hash, role, first_name, last_name) VALUES (:email, :password_hash, :role, :first_name, :last_name)");
    foreach ($users as $u) {
        $stmt->execute([
            ':email' => $u['email'],
            ':password_hash' => $password,
            ':role' => $u['role'],
            ':first_name' => $u['first_name'],
            ':last_name' => $u['last_name']
        ]);
        $uid = $conn->lastInsertId();
        if ($u['role'] === 'student') {
            $studentIds[$u['first_name'] . ' ' . $u['last_name']] = $uid;
        }
        if (!isset($userMap[$u['role']])) {
            $userMap[$u['role']] = $uid; // Keep first for backward compatibility
        }
    }

    // Link Parent (Folake) and Student (Kolade)
    $koladeId = $studentIds['Kolade Adeyemi'];
    $conn->exec("INSERT INTO parent_students (parent_id, student_id) VALUES ({$userMap['parent']}, {$koladeId})");

    // 2. Courses
    $courses = [
        ['name' => 'Quantum Mechanics', 'description' => 'Physics Dept.', 'topics' => 'Wave Functions,Uncertainty Principle,Quantum Entanglement,Schrödinger Equation', 'teacher_id' => $userMap['teacher']],
        ['name' => 'SQL Database Design', 'description' => 'Computer Science Dept.', 'topics' => 'ER Diagrams,Normalization,Joins & Queries,Stored Procedures', 'teacher_id' => $userMap['teacher']],
        ['name' => 'Further Calculus', 'description' => 'Maths Dept.', 'topics' => 'Definite Integrals,Integration by Parts,Substitution Method,Applications', 'teacher_id' => $userMap['teacher']],
        ['name' => 'Organic Chemistry II', 'description' => 'Chem Dept.', 'topics' => 'Hydrocarbons,Functional Groups,Reactions,Polymers', 'teacher_id' => $userMap['teacher']],
        ['name' => 'English Literature', 'description' => 'English Dept.', 'topics' => 'Poetry Analysis,Prose Fiction,Drama,Essay Writing', 'teacher_id' => null]
    ];
    
    $courseMap = [];
    $stmt = $conn->prepare("INSERT INTO courses (name, description, topics, teacher_id) VALUES (:name, :description, :topics, :teacher_id)");
    foreach ($courses as $c) {
        $stmt->execute([
            ':name' => $c['name'],
            ':description' => $c['description'],
            ':topics' => $c['topics'],
            ':teacher_id' => $c['teacher_id']
        ]);
        $courseMap[$c['name']] = $conn->lastInsertId();
    }

    // Enroll Kolade in all courses, and other students too
    $progressValues = [
        'Quantum Mechanics' => 68,
        'SQL Database Design' => 82,
        'Further Calculus' => 55,
        'Organic Chemistry II' => 71,
        'English Literature' => 90
    ];

    $stmtEnroll = $conn->prepare("INSERT INTO enrollments (student_id, course_id, progress) VALUES (:s, :c, :p)");
    foreach ($studentIds as $sName => $sid) {
        foreach ($courseMap as $cName => $cid) {
            $prog = ($sid === $koladeId) ? $progressValues[$cName] : rand(40, 95);
            $stmtEnroll->execute([':s' => $sid, ':c' => $cid, ':p' => $prog]);
        }
    }

    // 4. Materials
    $materials = [
        ['course_id' => $courseMap['SQL Database Design'], 'title' => 'SQL Database Schema 2.1', 'file_path' => '#', 'uploaded_by' => $userMap['teacher']],
        ['course_id' => $courseMap['Quantum Mechanics'], 'title' => 'Quantum Wave Functions — Lecture 4', 'file_path' => '#', 'uploaded_by' => $userMap['teacher']],
        ['course_id' => $courseMap['Further Calculus'], 'title' => 'Integration by Parts', 'file_path' => '#', 'uploaded_by' => $userMap['teacher']],
        ['course_id' => $courseMap['SQL Database Design'], 'title' => 'OSI Model Explained', 'file_path' => '#', 'uploaded_by' => $userMap['teacher']]
    ];
    $stmt = $conn->prepare("INSERT INTO materials (course_id, title, description, file_path, uploaded_by) VALUES (:c, :t, 'Seeded', :f, :u)");
    foreach ($materials as $m) {
        $stmt->execute([':c' => $m['course_id'], ':t' => $m['title'], ':f' => $m['file_path'], ':u' => $m['uploaded_by']]);
    }

    // 5. Exams & Submissions (For CBT Center)
    $conn->exec("INSERT INTO exams (course_id, title, description, duration_minutes, status, created_by) 
                 VALUES ({$courseMap['Quantum Mechanics']}, 'Intro to Quantum Mechanics', 'Physics · 50 questions · 60 min', 60, 'approved', {$userMap['teacher']})");
    $examId = $conn->lastInsertId();

    // 6. Attendance Seeding (30 days for Kolade and others)
    $attWeeks = [
        [true,true,true,true,true],
        [true,false,true,true,true],
        [true,true,true,false,true],
        [true,true,true,true,true],
        [true,true,false,true,true],
        [true,true,true,true,true]
    ];
    $flatAtt = array_merge(...$attWeeks); // 30 values

    // Generate dates (last 30 weekdays)
    $dates = [];
    $current = time();
    while (count($dates) < 30) {
        $dayOfWeek = date('N', $current);
        if ($dayOfWeek < 6) { // Monday-Friday
            $dates[] = date('Y-m-d', $current);
        }
        $current -= 86400; // Go back 1 day
    }
    $dates = array_reverse($dates); // chronological order

    $stmtAtt = $conn->prepare("INSERT INTO attendance (course_id, student_id, attendance_date, status, recorded_by) VALUES (:c, :s, :d, :st, :r)");
    
    foreach ($studentIds as $sName => $sid) {
        foreach ($dates as $idx => $dString) {
            // Kolade gets the exact grid
            if ($sid === $koladeId) {
                $isPresent = $flatAtt[$idx];
            } else {
                $isPresent = (rand(1, 100) > 10); // 90% present
            }
            $status = $isPresent ? 'present' : 'absent';
            $stmtAtt->execute([
                ':c' => $courseMap['Quantum Mechanics'],
                ':s' => $sid,
                ':d' => $dString,
                ':st' => $status,
                ':r' => $userMap['teacher']
            ]);
        }
    }

    // 7. Grades Seeding (with breakdowns: ca1, ca2, exam, total)
    $gradeRecords = [
        'Quantum Mechanics' => ['ca1' => 18, 'ca2' => 20, 'exam' => 46, 'score' => 84, 'max' => 100, 'asgn' => 4.5, 'proj' => 4.5, 'test' => 9.0],
        'SQL Database Design' => ['ca1' => 17, 'ca2' => 20, 'exam' => 54, 'score' => 91, 'max' => 100, 'asgn' => 4.0, 'proj' => 4.5, 'test' => 8.5],
        'Further Calculus' => ['ca1' => 16, 'ca2' => 16, 'exam' => 44, 'score' => 76, 'max' => 100, 'asgn' => 3.5, 'proj' => 4.0, 'test' => 8.5],
        'Organic Chemistry II' => ['ca1' => 17, 'ca2' => 17, 'exam' => 48, 'score' => 82, 'max' => 100, 'asgn' => 4.0, 'proj' => 4.0, 'test' => 9.0],
        'English Literature' => ['ca1' => 18, 'ca2' => 18, 'exam' => 52, 'score' => 88, 'max' => 100, 'asgn' => 4.5, 'proj' => 4.5, 'test' => 9.0],
    ];

    $stmtGrade = $conn->prepare("
        INSERT INTO grades (student_id, course_id, ca1, ca2, exam, assignment_score, project_score, mid_term_test, score, max_score, remarks, graded_by) 
        VALUES (:s, :c, :ca1, :ca2, :exam, :asgn, :proj, :test, :score, :max, 'Excellent', :g)
    ");

    foreach ($studentIds as $sName => $sid) {
        foreach ($courseMap as $cName => $cid) {
            if ($sid === $koladeId) {
                $g = $gradeRecords[$cName];
                $stmtGrade->execute([
                    ':s' => $sid,
                    ':c' => $cid,
                    ':ca1' => $g['ca1'],
                    ':ca2' => $g['ca2'],
                    ':exam' => $g['exam'],
                    ':asgn' => $g['asgn'],
                    ':proj' => $g['proj'],
                    ':test' => $g['test'],
                    ':score' => $g['score'],
                    ':max' => $g['max'],
                    ':g' => $userMap['teacher']
                ]);
            } else {
                // Generate random grades for other students
                $asgn = rand(2, 5);
                $proj = rand(2, 5);
                $test = rand(4, 10);
                $ca1 = $asgn + $proj + $test;
                $ca2 = rand(10, 20);
                $exam = rand(25, 60);
                $total = $ca1 + $ca2 + $exam;
                $stmtGrade->execute([
                    ':s' => $sid,
                    ':c' => $cid,
                    ':ca1' => $ca1,
                    ':ca2' => $ca2,
                    ':exam' => $exam,
                    ':asgn' => $asgn,
                    ':proj' => $proj,
                    ':test' => $test,
                    ':score' => $total,
                    ':max' => 100,
                    ':g' => $userMap['teacher']
                ]);
            }
        }
    }

    // 8. Fees & Payments Seeding
    $feesData = [
        ['desc' => '2nd Term School Fees', 'amount' => 85000, 'paid' => 45000, 'due' => '2026-06-30', 'status' => 'partial'],
        ['desc' => 'Exam Registration', 'amount' => 15000, 'paid' => 15000, 'due' => '2026-05-15', 'status' => 'paid'],
        ['desc' => 'Library / ICT Levy', 'amount' => 5000, 'paid' => 0, 'due' => '2026-06-30', 'status' => 'pending'],
        ['desc' => 'Development Levy', 'amount' => 10000, 'paid' => 10000, 'due' => '2026-04-30', 'status' => 'paid'],
    ];

    $stmtFee = $conn->prepare("INSERT INTO fees (student_id, amount, description, due_date, status) VALUES (:s, :a, :d, :du, :st)");
    $stmtPayment = $conn->prepare("INSERT INTO fee_payments (fee_id, amount_paid, payment_method, payment_date) VALUES (:fid, :ap, :pm, :pd)");

    foreach ($studentIds as $sName => $sid) {
        foreach ($feesData as $f) {
            // Kolade gets exact values, others get varying ones
            $amount = $f['amount'];
            $status = ($sid === $koladeId) ? $f['status'] : (($sid % 2 === 0) ? 'paid' : 'pending');
            $paidAmt = 0;
            if ($status === 'paid') $paidAmt = $amount;
            else if ($status === 'partial') $paidAmt = ($sid === $koladeId) ? $f['paid'] : 30000;

            $stmtFee->execute([
                ':s' => $sid,
                ':a' => $amount,
                ':d' => $f['desc'],
                ':du' => $f['due'],
                ':st' => ($status === 'partial') ? 'pending' : $status
            ]);
            $feeId = $conn->lastInsertId();

            // Insert matching payments
            if ($paidAmt > 0) {
                $stmtPayment->execute([
                    ':fid' => $feeId,
                    ':ap' => $paidAmt,
                    ':pm' => ($sid % 2 === 0) ? 'Card Payment' : 'Bank Transfer',
                    ':pd' => date('Y-m-d H:i:s', time() - rand(86400, 86400 * 30))
                ]);
            }
        }
    }

    // 9. System Settings Seeding
    $settingsData = [
        'school_name' => 'Aroura Academy',
        'academic_session' => '2026/2027',
        'current_term' => '2nd Term',
        'school_email' => 'admin@aroura.com',
        'result_mode' => 'end_of_term',
        'email_notifications' => '1',
        'cbt_reminders' => '1',
        'fee_due_alerts' => '0',
        'system_announcements' => '1',
        'two_factor_auth' => '0',
        'session_timeout' => '1',
        'login_attempt_limit' => '1',
        'auto_backups' => '1',
        'audit_logging' => '1'
    ];

    $stmtSetting = $conn->prepare("INSERT INTO system_settings (setting_key, setting_value) VALUES (:key, :val)");
    foreach ($settingsData as $k => $v) {
        $stmtSetting->execute([':key' => $k, ':val' => $v]);
    }

    // 10. Student Behavior & Psychomotor Assessments Seeding
    $stmtAssessment = $conn->prepare("
        INSERT INTO student_assessments 
        (student_id, academic_term, academic_session, punctuality, neatness, politeness, honesty, team_spirit, leadership, helping_others, emotional_stability, health, attitude_to_work, attentiveness, perseverance, spoken_english, handwriting, verbal_fluency, sports, handling_tools, musical, drawing_painting, class_teacher_comment, principal_remark)
        VALUES 
        (:sid, '2nd Term', '2026/2027', :punc, :neat, :poli, :hone, :team, :lead, :help, :emot, :heal, :atti, :atte, :pers, :spok, :hand, :verb, :spor, :handl, :musi, :draw, :teacher_comment, :principal_remark)
    ");

    foreach ($studentIds as $sName => $sid) {
        $stmtAssessment->execute([
            ':sid' => $sid,
            ':punc' => rand(4, 5),
            ':neat' => rand(4, 5),
            ':poli' => rand(4, 5),
            ':hone' => rand(4, 5),
            ':team' => rand(4, 5),
            ':lead' => rand(3, 5),
            ':help' => rand(4, 5),
            ':emot' => rand(4, 5),
            ':heal' => 5,
            ':atti' => rand(4, 5),
            ':atte' => rand(4, 5),
            ':pers' => rand(4, 5),
            ':spok' => rand(4, 5),
            ':hand' => rand(3, 5),
            ':verb' => rand(4, 5),
            ':spor' => rand(3, 5),
            ':handl' => rand(3, 5),
            ':musi' => rand(3, 5),
            ':draw' => rand(3, 5),
            ':teacher_comment' => $sid === $koladeId ? 'Kolade is a highly focused and dedicated student. Keep it up!' : 'Shows good behavior and takes academic tasks seriously.',
            ':principal_remark' => $sid === $koladeId ? 'An excellent academic term. Exemplary performance.' : 'A very good term. Keep striving for excellence.'
        ]);
    }

    $conn->commit();
    echo "Seed completed successfully!\n";
    echo "Login Credentials (Password for all is 'password123'):\n";
    echo "Student: kolade@student.aroura.com\n";
    echo "Teacher: amaka.eze@teacher.aroura.com\n";
    echo "Admin: admin@aroura.com\n";
    echo "Parent: folake@parent.aroura.com\n";

} catch (Exception $e) {
    $conn->rollBack();
    echo "Seeding failed: " . $e->getMessage() . "\n";
}
