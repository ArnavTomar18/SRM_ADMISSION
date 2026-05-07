CREATE DATABASE IF NOT EXISTS srm_admission;
USE srm_admission;

CREATE TABLE IF NOT EXISTS campuses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  location VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS programs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  campus_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  seat_capacity INT NOT NULL DEFAULT 60,
  min_cutoff DECIMAL(5,2) NOT NULL DEFAULT 60,
  FOREIGN KEY (campus_id) REFERENCES campuses(id)
);

CREATE TABLE IF NOT EXISTS student (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  preferred_campus_id INT NULL,
  preferred_program_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (preferred_campus_id) REFERENCES campuses(id),
  FOREIGN KEY (preferred_program_id) REFERENCES programs(id)
);

CREATE TABLE IF NOT EXISTS academic_marks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL UNIQUE,
  physics DECIMAL(5,2) NOT NULL,
  chemistry DECIMAL(5,2) NOT NULL,
  mathematics DECIMAL(5,2) NOT NULL,
  english DECIMAL(5,2),
  FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS entrance_exams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  exam_name VARCHAR(100) NOT NULL,
  score DECIMAL(6,2) NOT NULL,
  exam_rank INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_exam_per_student (student_id),
  FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS counselling_choices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  campus_id INT NOT NULL,
  program_id INT NOT NULL,
  preference_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_choice_per_student_program (student_id, campus_id, program_id),
  FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE,
  FOREIGN KEY (campus_id) REFERENCES campuses(id),
  FOREIGN KEY (program_id) REFERENCES programs(id)
);

CREATE TABLE IF NOT EXISTS allocations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL UNIQUE,
  program_id INT NOT NULL,
  aggregate_score DECIMAL(6,2) NOT NULL,
  status ENUM('ALLOCATED', 'CONFIRMED', 'REJECTED') NOT NULL DEFAULT 'ALLOCATED',
  allocation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE,
  FOREIGN KEY (program_id) REFERENCES programs(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  allocation_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_reference VARCHAR(120),
  status ENUM('SUCCESS', 'FAILED', 'PENDING') NOT NULL DEFAULT 'PENDING',
  paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE,
  FOREIGN KEY (allocation_id) REFERENCES allocations(id) ON DELETE CASCADE
);
