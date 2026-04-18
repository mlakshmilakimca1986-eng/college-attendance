CREATE DATABASE IF NOT EXISTS CollegeAttendance;
USE CollegeAttendance;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    principal_name VARCHAR(255) NOT NULL,
    campus_email VARCHAR(255) UNIQUE NOT NULL,
    whatsapp_number VARCHAR(20) NOT NULL,
    role ENUM('admin', 'principal') DEFAULT 'principal',
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    principal_id INT,
    date DATE NOT NULL,
    -- Sections based on the Excel breakdown
    branch VARCHAR(100), -- Seniors, Juniors, LTC-VAIDYAH, CO-IPL
    stream VARCHAR(100), -- MEC, CEC, BiPC, MPC, etc.
    gender ENUM('Boys', 'Girls'),
    type ENUM('Day', 'D&R'),
    strength INT DEFAULT 0,
    present INT DEFAULT 0,
    FOREIGN KEY (principal_id) REFERENCES users(id),
    UNIQUE KEY (principal_id, date, branch, stream, gender, type)
);
