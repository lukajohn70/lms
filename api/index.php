<?php
// Set CORS headers
header("Access-Control-Allow-Origin: *"); // Adjust in production
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'controllers/MaterialController.php';
require_once 'controllers/AdmissionController.php';
require_once 'controllers/DashboardController.php';
require_once 'controllers/ClassController.php';
require_once 'controllers/MessageController.php';
require_once 'controllers/LibraryController.php';

require_once 'config/Database.php';
require_once 'lib/Router.php';
require_once 'lib/Auth.php';

$router = new Router();

// Routes
// Authentication & Registration
$router->post('/login', 'AuthController@login');
$router->post('/register-parent', 'AuthController@registerParent');

// Admin actions
$router->post('/admin/approve-student', 'RegistrationController@approveStudent');
$router->post('/admin/assign-parent', 'RegistrationController@assignParent');

// Parent actions
$router->post('/parent/register-child', 'RegistrationController@registerChild');
$router->get('/parent/children', 'RegistrationController@getChildren');
$router->get('/parent/admissions', 'AdmissionController@getParentAdmissions');

// Attendance
$router->get('/teacher/attendance', 'AttendanceController@getTeacherAttendance');
$router->post('/teacher/attendance/save', 'AttendanceController@saveAttendance');
$router->get('/parent/attendance', 'AttendanceController@getParentAttendance');
$router->get('/student/attendance', 'AttendanceController@getStudentAttendance');

// Grades
$router->get('/teacher/grades', 'GradeController@getTeacherGrades');
$router->post('/teacher/grades/save', 'GradeController@saveGrades');
$router->post('/teacher/grades/submit', 'GradeController@submitGradesForApproval');
$router->post('/teacher/grades/request-reopen', 'GradeController@requestReopenGrades');
$router->get('/admin/grades/submissions', 'GradeController@getAdminGradeSubmissions');
$router->get('/admin/grades/preview', 'GradeController@getAdminGradePreview');
$router->post('/admin/grades/update-status', 'GradeController@updateGradeStatus');
$router->get('/parent/grades', 'GradeController@getParentGrades');
$router->get('/student/grades', 'GradeController@getStudentGrades');
$router->get('/student/courses', 'GradeController@getStudentCourses');

// Assessments & Evaluations
$router->get('/teacher/assessments', 'AssessmentController@getTeacherAssessments');
$router->post('/teacher/assessments/save', 'AssessmentController@saveAssessment');
$router->get('/student/assessment', 'AssessmentController@getStudentAssessment');
$router->get('/parent/assessment', 'AssessmentController@getStudentAssessment');
$router->get('/reports/print', 'AssessmentController@printReportCard');

// System Settings
$router->get('/admin/settings', 'SettingController@getSettings');
$router->post('/admin/settings/save', 'SettingController@saveSettings');

// Reports
$router->get('/admin/reports', 'DashboardController@getAdminReports');

// Fees
$router->get('/admin/fees', 'FeeController@getAdminFees');
$router->post('/admin/fees/create', 'FeeController@createFee');
$router->post('/admin/fees/record-payment', 'FeeController@recordPayment');
$router->get('/parent/fees', 'FeeController@getParentFees');
$router->get('/student/fees', 'FeeController@getStudentFees');
$router->post('/parent/fees/pay', 'FeeController@payFee');
$router->post('/student/fees/pay', 'FeeController@payFee');

// Users
$router->get('/users/me', 'UserController@me');
$router->get('/users', 'UserController@index');
$router->post('/admin/users/assign-class', 'UserController@assignStudentClass');
$router->get('/', function() {
    echo json_encode(["status" => "online", "message" => "Aroura LMS API is running"]);
});
$router->post('/parent/update-profile', 'UserController@updateProfile');
$router->post('/parent/update-password', 'UserController@updatePassword');
$router->post('/student/update-password', 'UserController@updatePassword');
$router->post('/teacher/update-profile', 'UserController@updateProfile');
$router->post('/teacher/update-password', 'UserController@updatePassword');
$router->post('/admin/update-profile', 'UserController@updateProfile');
$router->post('/admin/update-password', 'UserController@updatePassword');
$router->post('/users/update-avatar', 'UserController@updateAvatar');
$router->post('/users/send-support', 'UserController@sendSupportTicket');
$router->post('/admin/users/bulk-import', 'UserController@bulkImportUsers');
$router->post('/admin/upload-study-guide', 'SettingController@uploadStudyGuide');
$router->post('/admin/upload-logo', 'SettingController@uploadSchoolLogo');

// Materials
$router->post('/materials/upload', 'MaterialController@upload');
$router->get('/teacher/materials', 'MaterialController@getTeacherMaterials');
$router->get('/student/materials', 'MaterialController@getStudentMaterials');
$router->post('/teacher/materials/delete', 'MaterialController@deleteMaterial');

// Admissions
$router->post('/admissions/apply', 'AdmissionController@apply');
$router->get('/admissions/status', 'AdmissionController@getStatus');
$router->post('/admissions/create-account', 'AdmissionController@createAccount');
$router->get('/admissions', 'AdmissionController@index');
$router->post('/admissions/update', 'AdmissionController@update');
$router->post('/admissions/approve', 'AdmissionController@approve');
$router->post('/admissions/reject', 'AdmissionController@reject');

// Dashboards
$router->get('/dashboard/student', 'DashboardController@getStudentDashboard');
$router->get('/dashboard/teacher', 'DashboardController@getTeacherDashboard');
$router->get('/dashboard/admin', 'DashboardController@getAdminDashboard');
$router->get('/dashboard/admin/reports', 'DashboardController@getAdminReports');

// Classes & Subjects
$router->get('/classes', 'ClassController@getClasses');
$router->post('/admin/classes/create', 'ClassController@createClass');
$router->post('/admin/classes/delete', 'ClassController@deleteClass');
$router->get('/courses', 'ClassController@getCourses');
$router->post('/admin/courses/create', 'ClassController@createCourse');
$router->get('/class-subjects', 'ClassController@getClassSubjects');
$router->post('/admin/class-subjects/save', 'ClassController@saveClassSubjects');

// Library
$router->get('/library/books', 'LibraryController@getBooks');
$router->post('/admin/library/upload', 'LibraryController@uploadBook');
$router->post('/admin/library/delete', 'LibraryController@deleteBook');

// Messages
$router->get('/student/messages', 'MessageController@getMessages');
$router->post('/student/messages/send', 'MessageController@sendMessage');
$router->get('/student/teachers', 'MessageController@getTeachers');

// Student Enrollments
$router->get('/student/available-courses', 'GradeController@getAvailableCourses');
$router->post('/student/enroll', 'GradeController@enrollCourses');
$router->post('/student/deregister', 'GradeController@deregisterCourse');

// Teacher: Classes & Roster
$router->get('/teacher/classes', 'DashboardController@getTeacherClasses');
$router->get('/teacher/classes/detail', 'DashboardController@getTeacherClassDetail');

// Teacher: CBT Exams
$router->post('/teacher/exams/create', 'ExamController@createExam');
$router->get('/teacher/exams', 'ExamController@getTeacherExams');
$router->get('/teacher/exams/detail', 'ExamController@getExamDetail');
$router->get('/teacher/activity', 'ExamController@getTeacherActivity');
$router->get('/teacher/score-trend', 'ExamController@getTeacherScoreTrend');

// Admin: CBT Exams
$router->get('/admin/exams', 'ExamController@getAdminExams');
$router->post('/admin/exams/update-status', 'ExamController@updateExamStatus');

$router->dispatch($_SERVER['REQUEST_METHOD'], $_SERVER['REQUEST_URI']);
