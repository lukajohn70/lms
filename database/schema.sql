-- Database: aroura

CREATE DATABASE IF NOT EXISTS aroura;
USE aroura;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'parent', 'student', 'teacher') NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Student Registrations (Parent registers child, Admin approves)
CREATE TABLE IF NOT EXISTS student_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parent_id INT NOT NULL,
    child_first_name VARCHAR(100) NOT NULL,
    child_last_name VARCHAR(100) NOT NULL,
    child_dob DATE NOT NULL,
    grade_level VARCHAR(50) NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Parent-Student Link (Created after admin approval)
CREATE TABLE IF NOT EXISTS parent_students (
    parent_id INT NOT NULL,
    student_id INT NOT NULL,
    PRIMARY KEY (parent_id, student_id),
    FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Courses / Classes
CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    topics TEXT,
    teacher_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 5. Enrollments
CREATE TABLE IF NOT EXISTS enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progress INT DEFAULT 0,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE(student_id, course_id)
);

-- 6. Materials (Files stored on local filesystem, URLs in DB)
CREATE TABLE IF NOT EXISTS materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_path VARCHAR(255) NOT NULL,
    uploaded_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. CBT Exams
CREATE TABLE IF NOT EXISTS exams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INT NOT NULL,
    status ENUM('draft', 'pending_approval', 'approved', 'active', 'completed') DEFAULT 'draft',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. CBT Questions
CREATE TABLE IF NOT EXISTS exam_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exam_id INT NOT NULL,
    question_text TEXT NOT NULL,
    question_type ENUM('multiple_choice', 'boolean', 'short_answer') NOT NULL,
    points INT DEFAULT 1,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

-- 9. CBT Options
CREATE TABLE IF NOT EXISTS exam_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (question_id) REFERENCES exam_questions(id) ON DELETE CASCADE
);

-- 10. CBT Submissions
CREATE TABLE IF NOT EXISTS exam_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exam_id INT NOT NULL,
    student_id INT NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP NULL,
    score DECIMAL(5, 2) DEFAULT NULL,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 11. Grades
CREATE TABLE IF NOT EXISTS grades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    exam_id INT DEFAULT NULL,
    score DECIMAL(5, 2) NOT NULL,
    ca1 DECIMAL(5, 2) DEFAULT 0,
    ca2 DECIMAL(5, 2) DEFAULT 0,
    exam DECIMAL(5, 2) DEFAULT 0,
    assignment_score DECIMAL(5, 2) DEFAULT NULL,
    project_score DECIMAL(5, 2) DEFAULT NULL,
    mid_term_test DECIMAL(5, 2) DEFAULT NULL,
    max_score DECIMAL(5, 2) NOT NULL,
    remarks TEXT,
    graded_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE SET NULL,
    FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 12. Fees
CREATE TABLE IF NOT EXISTS fees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    description VARCHAR(255) NOT NULL,
    due_date DATE NOT NULL,
    status ENUM('pending', 'paid', 'overdue') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 13. Fee Payments
CREATE TABLE IF NOT EXISTS fee_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fee_id INT NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(100) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fee_id) REFERENCES fees(id) ON DELETE CASCADE
);

-- 14. Attendance
CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    student_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    status ENUM('present', 'absent', 'late', 'excused') NOT NULL,
    recorded_by INT NOT NULL,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(course_id, student_id, attendance_date)
);

-- 15. Messages
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 16. System Settings
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(255) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 17. Student Behavior & Psychomotor Assessments
CREATE TABLE IF NOT EXISTS student_assessments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    academic_term VARCHAR(10) NOT NULL,
    academic_session VARCHAR(20) NOT NULL,
    -- Character Development Traits (1-5)
    punctuality TINYINT DEFAULT NULL,
    neatness TINYINT DEFAULT NULL,
    politeness TINYINT DEFAULT NULL,
    honesty TINYINT DEFAULT NULL,
    team_spirit TINYINT DEFAULT NULL,
    leadership TINYINT DEFAULT NULL,
    helping_others TINYINT DEFAULT NULL,
    emotional_stability TINYINT DEFAULT NULL,
    health TINYINT DEFAULT NULL,
    attitude_to_work TINYINT DEFAULT NULL,
    attentiveness TINYINT DEFAULT NULL,
    perseverance TINYINT DEFAULT NULL,
    spoken_english TINYINT DEFAULT NULL,
    -- Psychomotor Skills (1-5)
    handwriting TINYINT DEFAULT NULL,
    verbal_fluency TINYINT DEFAULT NULL,
    sports TINYINT DEFAULT NULL,
    handling_tools TINYINT DEFAULT NULL,
    musical TINYINT DEFAULT NULL,
    drawing_painting TINYINT DEFAULT NULL,
    -- Descriptive Comments & Remarks
    class_teacher_comment TEXT DEFAULT NULL,
    principal_remark TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_student_term_session (student_id, academic_term, academic_session)
);


-- Insert a default admin user (password: admin123)
-- Hash generated via standard bcrypt cost 10
INSERT INTO users (email, password_hash, role, first_name, last_name) 
VALUES ('admin@aroura.com', '$2y$10$8.4F15b6m4172fP2A3xGae2NIn0gWj0nC1sN1.S9fXzN/n/sS6rBq', 'admin', 'Super', 'Admin') 
ON DUPLICATE KEY UPDATE email=email;
