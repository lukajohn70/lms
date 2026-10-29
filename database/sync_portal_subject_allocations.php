<?php
/**
 * Synchronize all subject allocations from dlhsportal.org/sms/admin/all_subjects
 * into local LMS database:
 * 1. users (verify all 37 teachers exist)
 * 2. classes (form_teacher_id)
 * 3. class_subjects (all 353 class-course pairs with teacher_id)
 * 4. teacher_allocations (all 357 teacher-class-course triplets for 2026/2027 and 2025/2026)
 * 5. enrollments (align enrolled students to class subjects)
 */

require_once __DIR__ . '/../api/config/Database.php';

$db = new Database();
$conn = $db->getConnection();

echo "========================================================\n";
echo "   DLHS PORTAL SUBJECT ALLOCATION SYNCHRONIZATION       \n";
echo "   Source of truth: https://dlhsportal.org/sms/admin/all_subjects\n";
echo "========================================================\n\n";

$portalData = json_decode(file_get_contents(__DIR__ . '/portal_extract/all_subjects_portal.json'), true);
$portalTeachersData = json_decode(file_get_contents(__DIR__ . '/portal_extract/teachers_portal.json'), true);

if (!$portalData) {
    die("❌ Error: database/portal_extract/all_subjects_portal.json not found or empty.\n");
}

// 1. Teacher Map: Portal Teacher Name -> Local users.id
$teacherMap = [
    "MR. ABEL PETER"                   => 110,
    "MR. ADESOKAN PHILIP"              => 30579,
    "MR. ALI PETER"                    => 135,
    "MR. BELLO MUDI"                   => 106,
    "MR. BRIGHT UYEYE"                 => 100,
    "MR. CANDY GODWIN"                 => 102,
    "MR. DANIEL ADEYEMI"               => 122,
    "MR. DAVID ADAMS"                  => 117,
    "MR. EMMANUEL BELLO"               => 111,
    "MR. GEORGE AWOR"                  => 101,
    "MR. GODWIN OCHIGBO"               => 120,
    "MR. IDOKO JOSEPH"                 => 134,
    "MR. JOHN LUKA"                    => 98,
    "MR. JOSEPH OLAWALE"               => 112,
    "MR. KOLAWOLE STEPHEN"             => 132,
    "MR. LINUS OBUH"                   => 105,
    "MR. LOVELYN SAIDU"                => 30581,
    "MR. MATTHEW IKEH"                 => 116,
    "MR. MICHAEL AJAIYEOBA"            => 130,
    "MR. OBAFEMI OLUWASEUN"            => 99,
    "MR. OLALEYE ADEGBOYE"             => 119,
    "MR. PHILIP IBRAHIM"               => 109,
    "MR. SAMUEL IBRAHIM"               => 128,
    "MR. SIMAN SUNDAY"                 => 30580,
    "MR. THOMPSON SALAMI"              => 115,
    "MR. ZEPHANIAH KAZZAH"             => 113,
    "MRS. ADEBAYO FUNMILAYO"           => 121,
    "MRS. ADEBOWALE MERCY"             => 125,
    "MRS. FOLASHADE SANUSI"            => 124,
    "MRS. GODIYA GODWIN"               => 108,
    "MRS. JULIANA SAMBAM"              => 123,
    "MRS. NWAFOR HELEN"                => 107,
    "MRS. PAUL BLESSING"               => 127,
    "MRS. UDEH FAVOUR"                 => 103,
    "MRS. UKACHI IRIBHOGBE"            => 129,
    "MS. ODEH PATIENCE"                => 104,
    "Miss. MORDI PRAISE"               => 133
];

// 2. Course Map: Portal Subject Title -> Local courses.id
$courseMap = [
    "AGRICULTURAL SCIENCE" => 107,
    "ANIMAL HUSBANDRY" => 108,
    "BASIC SCIENCE" => 40,
    "BASIC TECHNOLOGY" => 41,
    "BIOLOGY" => 181,
    "BUSINESS STUDIES" => 42,
    "CATERING CRAFT PRACTICE" => 32,
    "CHEMISTRY" => 182,
    "CHRISTIAN RELIGIOUS STUDIES" => 187,
    "CIVIC EDUCATION" => 112,
    "COMMERCE" => 190,
    "COMPUTER STUDIES" => 11,
    "CULTURAL AND CREATIVE ART" => 24,
    "DATA PROCESSING" => 114,
    "ECONOMICS" => 193,
    "ENGLISH LANGUAGE" => 180,
    "FASHION DESIGN AND GARMENT MAKING" => 198,
    "FINANCIAL ACCOUNTING" => 144,
    "FOOD AND NUTRITION" => 122,
    "FRENCH" => 124,
    "FURTHER MATHS" => 26,
    "GEOGRAPHY" => 188,
    "GOVERNMENT" => 186,
    "HAUSA" => 23,
    "HISTORY" => 157,
    "HOME ECONOMICS" => 50,
    "LET" => 36,
    "LITERATURE IN ENGLISH" => 185,
    "MATHEMATICS" => 179,
    "MUSIC" => 154,
    "PHYSICAL AND HEALTH EDUCATION" => 33,
    "PHYSICS" => 183,
    "ROBOTICS AND A.I." => 20,
    "SOCIAL STUDIES" => 55,
    "SOLAR PHOTOVOLTAIC INSTALLATION AND MAINTENANCE" => 197,
    "TECHNICAL DRAWING" => 191,
    "VISUAL ART" => 12
];

// Verify all teachers exist in database
echo "1. Verifying teachers in database...\n";
foreach ($teacherMap as $tName => $tId) {
    $stmt = $conn->prepare("SELECT id, first_name, last_name, email FROM users WHERE id = :id");
    $stmt->execute([':id' => $tId]);
    $tRow = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$tRow) {
        die("❌ Teacher missing: $tName (ID: $tId)\n");
    }
}
echo "   ✅ All 37 teachers verified.\n\n";

// 3. Update Form Teachers in classes
echo "2. Updating Form Teachers for class arms...\n";
$formTeacherAssignments = [
    472 => 112,   // SS 1 HUMANITIES -> MR. JOSEPH OLAWALE
    502 => 115,   // SS 1 SCIENCE A -> MR. THOMPSON SALAMI
    862 => 117,   // SS 1 SCIENCE B -> MR. DAVID ADAMS
    473 => 98,    // SS 2 HUMANITIES -> MR. JOHN LUKA
    501 => 30579, // SS 2 SCIENCE A -> MR. ADESOKAN PHILIP
    492 => 103,   // SS 3 HUMANITIES -> MRS. UDEH FAVOUR
    443 => 107,   // SS 3 SCIENCE B -> MRS. NWAFOR HELEN
    490 => 99,    // BASIC 7 DIAMOND -> MR. OBAFEMI OLUWASEUN
    864 => 105,   // BASIC 7 TOPAZ -> MR. LINUS OBUH
    504 => 100,   // BASIC 8 GOLD -> MR. BRIGHT UYEYE
    505 => 109,   // BASIC 8 TOPAZ -> MR. PHILIP IBRAHIM
    506 => 122,   // BASIC 9 DIAMOND -> MR. DANIEL ADEYEMI
    507 => 102,   // BASIC 9 GOLD -> MR. CANDY GODWIN
    863 => 104,   // BASIC 9 TOPAZ -> MS. ODEH PATIENCE
];

$updateFormStmt = $conn->prepare("UPDATE classes SET form_teacher_id = :tid WHERE id = :cid");
foreach ($formTeacherAssignments as $cid => $tid) {
    $updateFormStmt->execute([':tid' => $tid, ':cid' => $cid]);
}
echo "   ✅ Form teachers updated for active classes.\n\n";

// 4. Update class_subjects Table
echo "3. Synchronizing class_subjects with 100% portal truth...\n";
$conn->exec("DELETE FROM class_subjects");
$conn->beginTransaction();

$insertCsStmt = $conn->prepare("
    INSERT INTO class_subjects (class_id, course_id, type, elective_group, teacher_id) 
    VALUES (:cid, :coid, 'core', NULL, :tid)
    ON DUPLICATE KEY UPDATE teacher_id = :tid2
");

$csInserted = 0;
$allocations = []; // To store for teacher_allocations

foreach ($portalData as $cid => $cinfo) {
    $cid = intval($cid);
    foreach ($cinfo["subjects"] as $s) {
        $tName = trim($s["teacher"]);
        $sTitle = trim($s["subject_title"]);
        
        $tid = $teacherMap[$tName];
        $coid = $courseMap[$sTitle];
        
        $insertCsStmt->execute([
            ':cid' => $cid,
            ':coid' => $coid,
            ':tid' => $tid,
            ':tid2' => $tid
        ]);
        $csInserted++;
        
        $allocKey = $tid . "_" . $cid . "_" . $coid;
        $allocations[$allocKey] = [
            'teacher_id' => $tid,
            'class_id' => $cid,
            'course_id' => $coid
        ];
    }
}
$conn->commit();

$totalClassSubjectsInDb = $conn->query("SELECT COUNT(*) FROM class_subjects")->fetchColumn();
echo "   ✅ class_subjects synced: $totalClassSubjectsInDb distinct class-subject pairs in database.\n\n";

// 5. Update teacher_allocations Table for 2026/2027 and 2025/2026
echo "4. Synchronizing teacher_allocations for active sessions...\n";
$conn->exec("DELETE FROM teacher_allocations");
$conn->beginTransaction();

$insertAllocStmt = $conn->prepare("
    INSERT INTO teacher_allocations (teacher_id, class_id, course_id, academic_session) 
    VALUES (:tid, :cid, :coid, :session)
    ON DUPLICATE KEY UPDATE teacher_id = :tid2
");

$sessions = ['2026/2027', '2025/2026'];
$allocInserted = 0;

foreach ($sessions as $session) {
    foreach ($allocations as $alloc) {
        $insertAllocStmt->execute([
            ':tid' => $alloc['teacher_id'],
            ':cid' => $alloc['class_id'],
            ':coid' => $alloc['course_id'],
            ':session' => $session,
            ':tid2' => $alloc['teacher_id']
        ]);
        $allocInserted++;
    }
}
$conn->commit();

$totalAllocInDb = $conn->query("SELECT COUNT(*) FROM teacher_allocations")->fetchColumn();
echo "   ✅ teacher_allocations synced: $totalAllocInDb total records across active sessions ($allocInserted inserted).\n\n";

// 6. Synchronize enrollments table
echo "5. Synchronizing student enrollments strictly to subjects allocated to their class...\n";
$conn->beginTransaction();

// Remove enrollments in subjects not allocated to the student's class
$delEnroll = $conn->exec("
    DELETE e FROM enrollments e
    JOIN users u ON e.student_id = u.id
    WHERE NOT EXISTS (
        SELECT 1 FROM class_subjects cs 
        WHERE cs.class_id = u.class_id AND cs.course_id = e.course_id
    )
");
echo "   Removed $delEnroll invalid/cross-class enrollments.\n";

// Ensure every student in an active class is enrolled in all subjects allocated to that class
$addEnroll = $conn->exec("
    INSERT IGNORE INTO enrollments (student_id, course_id, progress)
    SELECT u.id, cs.course_id, 0
    FROM users u
    JOIN class_subjects cs ON u.class_id = cs.class_id
    WHERE u.role = 'student'
");
echo "   Added $addEnroll missing class subject enrollments.\n";

$conn->commit();

$totalEnrollInDb = $conn->query("SELECT COUNT(*) FROM enrollments")->fetchColumn();
echo "   ✅ enrollments synced: $totalEnrollInDb clean, valid student course enrollments.\n\n";

echo "========================================================\n";
echo "   SYNCHRONIZATION COMPLETED WITH 100% SUCCESS!          \n";
echo "========================================================\n";
