<?php
/**
 * Import deeper_life Database into LMS (aroura)
 *
 * Rules:
 * 1. Import classes from deeper_life (with yeargroup & section) into classes table.
 * 2. Import subjects from deeper_life into courses table.
 * 3. Import staff from deeper_life.stafflogin into users table (role = teacher).
 * 4. Import students from deeper_life.studentlogin into users table (role = student).
 * 5. Import admins from deeper_life.admintable into users table (role = admin).
 * 6. Set all passwords to '1234', EXCEPT admin password which remains 'rr'.
 * 7. Enroll students into appropriate courses by section.
 */

$dl = new PDO("mysql:host=127.0.0.1;port=3306;dbname=deeper_life", "root", "root", [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
]);

$ar = new PDO("mysql:host=127.0.0.1;port=3306;dbname=aroura", "root", "root", [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
]);

echo "Starting migration from deeper_life to aroura...\n\n";

$ar->beginTransaction();

try {
    // -------------------------------------------------------------
    // 1. IMPORT CLASSES
    // -------------------------------------------------------------
    echo "--- 1. Importing Classes ---\n";
    $classQuery = "
        SELECT c.classId, c.className, y.yearGroupName, s.sectionName
        FROM classes c
        LEFT JOIN yeargroup y ON c.classYearGroup = y.yearGroupId
        LEFT JOIN sections s ON y.sectionId = s.sectionId
        ORDER BY c.classId
    ";
    $classes = $dl->query($classQuery)->fetchAll();
    $classStmt = $ar->prepare("
        INSERT INTO classes (id, name, department)
        VALUES (:id, :name, :dept)
        ON DUPLICATE KEY UPDATE name = VALUES(name), department = VALUES(department)
    ");

    $classCount = 0;
    foreach ($classes as $c) {
        $fullName = trim(($c['yearGroupName'] ? $c['yearGroupName'] . ' ' : '') . $c['className']);
        $dept = $c['sectionName'] ?: 'General';
        $classStmt->execute([
            ':id'   => intval($c['classId']),
            ':name' => $fullName,
            ':dept' => $dept
        ]);
        $classCount++;
    }
    echo "Imported / synced $classCount classes.\n\n";

    // -------------------------------------------------------------
    // 2. IMPORT TEACHERS (STAFF)
    // -------------------------------------------------------------
    echo "--- 2. Importing Teachers (Staff) ---\n";
    
    // Free up any previous conflicting test parent email if needed
    $ar->exec("UPDATE users SET email = 'lukajohn_parent@deeperlifehighschool.org' WHERE id = 12 AND email = 'lukajohn_kaduna@deeperlifehighschool.org'");

    $staff = $dl->query("SELECT * FROM stafflogin ORDER BY staffId")->fetchAll();
    $teacherPwdHash = password_hash('1234', PASSWORD_DEFAULT);

    $userStmt = $ar->prepare("
        INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, gender, house, sport_activities)
        VALUES (:id, :email, :pwd, 'teacher', :fname, :lname, :phone, :gender, 'FAITH', 'BASKETBALL')
        ON DUPLICATE KEY UPDATE
            email = VALUES(email),
            password_hash = VALUES(password_hash),
            role = 'teacher',
            first_name = VALUES(first_name),
            last_name = VALUES(last_name),
            gender = VALUES(gender)
    ");

    $staffCount = 0;
    foreach ($staff as $st) {
        $staffId = intval($st['staffId']);
        $email = trim($st['username']);
        if (empty($email)) {
            $email = "staff" . $staffId . "@deeperlifehighschool.org";
        }
        $firstName = trim($st['firstName']);
        if (!empty($st['middleName'])) {
            $firstName .= ' ' . trim($st['middleName']);
        }
        $lastName = trim($st['surname']);
        $gender = strtoupper(trim($st['gender'] ?: 'MALE'));
        if (!in_array($gender, ['MALE', 'FEMALE'])) $gender = 'MALE';

        $userStmt->execute([
            ':id'     => $staffId,
            ':email'  => $email,
            ':pwd'    => $teacherPwdHash,
            ':fname'  => $firstName ?: 'Staff',
            ':lname'  => $lastName ?: 'Member',
            ':phone'  => null,
            ':gender' => $gender
        ]);
        $staffCount++;
    }
    echo "Imported / synced $staffCount teachers (all passwords set to '1234').\n\n";

    // -------------------------------------------------------------
    // 3. IMPORT SUBJECTS (COURSES)
    // -------------------------------------------------------------
    echo "--- 3. Importing Subjects (Courses) ---\n";
    $subjects = $dl->query("SELECT * FROM subjects ORDER BY subjectId")->fetchAll();
    
    // Check subject teacher assignments
    $teacherMap = [];
    $staStmt = $dl->query("SELECT subjectId, teacherId FROM subject_teacher_assignment WHERE teacherId > 0");
    foreach ($staStmt->fetchAll() as $sta) {
        $teacherMap[intval($sta['subjectId'])] = intval($sta['teacherId']);
    }

    $courseStmt = $ar->prepare("
        INSERT INTO courses (id, name, description, teacher_id)
        VALUES (:id, :name, :desc, :tid)
        ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), teacher_id = VALUES(teacher_id)
    ");

    $subjectCount = 0;
    foreach ($subjects as $s) {
        $subId = intval($s['subjectId']);
        $subName = trim($s['subjectName']);
        $teacherId = $teacherMap[$subId] ?? null;

        $courseStmt->execute([
            ':id'   => $subId,
            ':name' => $subName,
            ':desc' => "$subName curriculum and continuous assessments",
            ':tid'  => $teacherId
        ]);
        $subjectCount++;
    }
    echo "Imported / synced $subjectCount subjects.\n\n";


    // -------------------------------------------------------------
    // 4. IMPORT ADMINS
    // -------------------------------------------------------------
    echo "--- 4. Importing Admins ---\n";
    $adminRrHash   = password_hash('rr', PASSWORD_DEFAULT);
    $admin1234Hash = password_hash('1234', PASSWORD_DEFAULT);

    // Ensure main admin account has password 'rr'
    $adminCheck = $ar->query("SELECT id FROM users WHERE email = 'admin@aroura.com' LIMIT 1")->fetch();
    if ($adminCheck) {
        $ar->prepare("UPDATE users SET password_hash = :pwd, role = 'admin' WHERE id = :id")->execute([
            ':pwd' => $adminRrHash,
            ':id'  => $adminCheck['id']
        ]);
    } else {
        $ar->prepare("INSERT INTO users (email, password_hash, role, first_name, last_name) VALUES ('admin@aroura.com', :pwd, 'admin', 'System', 'Admin')")->execute([
            ':pwd' => $adminRrHash
        ]);
    }

    // Also import admintable rows from deeper_life
    $admins = $dl->query("SELECT * FROM admintable ORDER BY adminId")->fetchAll();
    $adminCount = 0;
    foreach ($admins as $adm) {
        $uname = trim($adm['username']);
        $adminId = intval($adm['adminId']);
        
        // If it is the main 'admin' account: password remains 'rr'
        $isMainAdmin = (strtolower($uname) === 'admin' || $adm['password'] === 'rr');
        $pwdToSet = $isMainAdmin ? $adminRrHash : $admin1234Hash;

        // Target email
        $adminEmail = strpos($uname, '@') !== false ? $uname : strtolower($uname) . '@deeperlifehighschool.org';

        // Check if user already exists with this email
        $exist = $ar->prepare("SELECT id FROM users WHERE email = :email");
        $exist->execute([':email' => $adminEmail]);
        $existingId = $exist->fetchColumn();

        if ($existingId) {
            $ar->prepare("UPDATE users SET password_hash = :pwd, role = 'admin' WHERE id = :id")->execute([
                ':pwd' => $pwdToSet,
                ':id'  => $existingId
            ]);
        } else {
            $ar->prepare("
                INSERT INTO users (email, password_hash, role, first_name, last_name)
                VALUES (:email, :pwd, 'admin', :fname, 'Administrator')
            ")->execute([
                ':email' => $adminEmail,
                ':pwd'   => $pwdToSet,
                ':fname' => ucfirst($uname)
            ]);
        }
        $adminCount++;
    }
    echo "Imported / synced $adminCount admin accounts (admin password = 'rr', others = '1234').\n\n";

    // -------------------------------------------------------------
    // 5. IMPORT STUDENTS
    // -------------------------------------------------------------
    echo "--- 5. Importing Students ---\n";
    $students = $dl->query("SELECT * FROM studentlogin ORDER BY studentId")->fetchAll();
    $studentPwdHash = password_hash('1234', PASSWORD_DEFAULT);

    $stuStmt = $ar->prepare("
        INSERT INTO users (id, email, password_hash, role, class_id, first_name, last_name, admission_number, gender, house, sport_activities)
        VALUES (:id, :email, :pwd, 'student', :cid, :fname, :lname, :adm, :gender, 'FAITH', 'BASKETBALL')
        ON DUPLICATE KEY UPDATE
            email = VALUES(email),
            password_hash = VALUES(password_hash),
            role = 'student',
            class_id = VALUES(class_id),
            first_name = VALUES(first_name),
            last_name = VALUES(last_name),
            admission_number = VALUES(admission_number),
            gender = VALUES(gender)
    ");

    $seenAdmissions = [];
    $studentCount = 0;

    foreach ($students as $stu) {
        $studentId = intval($stu['studentId']);
        $admRaw = trim($stu['admissionNumber']);
        $emailRaw = trim($stu['studentEmail']);
        $fName = trim($stu['firstName']);
        $lName = trim($stu['surname']);

        // Skip completely empty row (e.g. dummy row 473)
        if (empty($admRaw) && empty($emailRaw) && empty($fName) && empty($lName)) {
            continue;
        }

        // Ensure unique, non-empty admission number
        if (empty($admRaw)) {
            $adm = "DLHS-" . $studentId;
        } else if (isset($seenAdmissions[$admRaw])) {
            $adm = $admRaw . "-B";
        } else {
            $adm = $admRaw;
        }
        $seenAdmissions[$adm] = true;

        // Ensure valid email
        if (empty($emailRaw)) {
            $email = strtolower(str_replace(['/', ' '], '-', $adm)) . "@dlhs.org";
        } else {
            $email = $emailRaw;
        }

        if (!empty($stu['middleName'])) {
            $fName .= ' ' . trim($stu['middleName']);
        }

        $gender = strtoupper(trim($stu['gender'] ?: 'MALE'));
        if (!in_array($gender, ['MALE', 'FEMALE'])) $gender = 'MALE';
        $classId = intval($stu['classId']) ?: null;

        $stuStmt->execute([
            ':id'     => $studentId,
            ':email'  => $email,
            ':pwd'    => $studentPwdHash,
            ':cid'    => $classId,
            ':fname'  => $fName ?: 'Student',
            ':lname'  => $lName ?: 'DLHS',
            ':adm'    => $adm,
            ':gender' => $gender
        ]);
        $studentCount++;
    }
    echo "Imported / synced $studentCount students (all passwords set to '1234').\n\n";

    // -------------------------------------------------------------
    // 6. ENROLL STUDENTS INTO CURRICULUM SUBJECTS
    // -------------------------------------------------------------
    echo "--- 6. Enrolling Students into Subjects by Class Section ---\n";

    // Standard subject groups
    $juniorSubjects = [1, 2, 8, 9, 10, 11, 14, 17, 18, 19, 20, 23, 24, 25, 30, 31, 33, 35];
    $seniorScienceSubjects = [1, 2, 3, 5, 6, 7, 8, 11, 15, 16, 18, 21, 26, 30];
    $seniorHumanitiesSubjects = [1, 2, 6, 8, 10, 12, 13, 14, 21, 22, 23, 27, 28, 29, 30, 32];

    // Build map of classId -> section / department
    $classSectionMap = [];
    foreach ($classes as $c) {
        $cid = intval($c['classId']);
        $cName = strtoupper($c['className']);
        $sName = strtoupper($c['sectionName'] ?: '');
        
        if (strpos($sName, 'JUNIOR') !== false || strpos($c['yearGroupName'], 'Basic') !== false) {
            $classSectionMap[$cid] = 'junior';
        } else if (strpos($cName, 'HUMANITIES') !== false || strpos($cName, 'ART') !== false) {
            $classSectionMap[$cid] = 'senior_humanities';
        } else {
            $classSectionMap[$cid] = 'senior_science';
        }
    }

    $enrollStmt = $ar->prepare("
        INSERT IGNORE INTO enrollments (student_id, course_id)
        VALUES (:sid, :cid)
    ");

    $enrollmentCount = 0;
    // Fetch all imported students
    $allStudents = $ar->query("SELECT id, class_id FROM users WHERE role = 'student'")->fetchAll();
    foreach ($allStudents as $st) {
        $sid = intval($st['id']);
        $cid = intval($st['class_id']);
        $sec = $classSectionMap[$cid] ?? 'junior';

        $subjList = $sec === 'junior'
            ? $juniorSubjects
            : ($sec === 'senior_humanities' ? $seniorHumanitiesSubjects : $seniorScienceSubjects);

        foreach ($subjList as $subId) {
            $enrollStmt->execute([
                ':sid' => $sid,
                ':cid' => $subId
            ]);
            $enrollmentCount++;
        }
    }
    echo "Generated $enrollmentCount student-subject enrollments.\n\n";

    $ar->commit();
    echo "=========================================================\n";
    echo "SUCCESS: deeper_life database imported cleanly into LMS!\n";
    echo "Summary:\n";
    echo "- Classes: $classCount\n";
    echo "- Subjects: $subjectCount\n";
    echo "- Teachers: $staffCount (password: 1234)\n";
    echo "- Students: $studentCount (password: 1234)\n";
    echo "- Admins: $adminCount (admin password: rr, others: 1234)\n";
    echo "- Course Enrollments: $enrollmentCount\n";
    echo "=========================================================\n";

} catch (Exception $e) {
    $ar->rollBack();
    echo "ERROR during migration: " . $e->getMessage() . "\n";
    exit(1);
}
