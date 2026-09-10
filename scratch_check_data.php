<?php
require_once "/Applications/MAMP/htdocs/lms/api/config/database.php";
$db = (new Database())->getConnection();

$grades = $db->query("
    SELECT g.student_id, u.first_name, u.last_name, c.name as class_name, g.academic_term, g.academic_session, COUNT(*) as grade_count, AVG(g.score) as avg_score
    FROM grades g
    JOIN users u ON g.student_id = u.id
    LEFT JOIN classes c ON u.class_id = c.id
    WHERE g.student_id <= 20
    GROUP BY g.student_id, g.academic_term, g.academic_session
    ORDER BY g.student_id ASC
")->fetchAll(PDO::FETCH_ASSOC);

echo "Students 1-20 grades:\n";
print_r($grades);
