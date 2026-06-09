-- Create Database
CREATE DATABASE IF NOT EXISTS healthcare_db;
USE healthcare_db;

-- Patients Table
CREATE TABLE IF NOT EXISTS patients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Doctors Table
CREATE TABLE IF NOT EXISTS doctors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    qualification VARCHAR(200),
    experience INT,
    fee DECIMAL(10, 2),
    available_days VARCHAR(100),
    available_time VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100)
);

-- Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    reason TEXT,
    status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);

-- Medical Reports Table
CREATE TABLE IF NOT EXISTS medical_reports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    report_title VARCHAR(200) NOT NULL,
    report_type VARCHAR(100),
    file_path VARCHAR(500) NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Insert Sample Doctors
INSERT INTO doctors (name, specialization, qualification, experience, fee, available_days, available_time, phone, email) VALUES
('Dr. Ahmed Khan', 'Cardiologist', 'MBBS, FCPS', 15, 1500.00, 'Mon-Wed-Fri', '10:00 AM - 5:00 PM', '03001234567', 'ahmed.khan@hospital.com'),
('Dr. Fatima Ali', 'Dermatologist', 'MBBS, FCPS', 10, 1200.00, 'Tue-Thu-Sat', '9:00 AM - 4:00 PM', '03007654321', 'fatima.ali@hospital.com'),
('Dr. Usman Riaz', 'Neurologist', 'MBBS, FRCP', 20, 2000.00, 'Mon-Thu', '11:00 AM - 6:00 PM', '03005555555', 'usman.riaz@hospital.com'),
('Dr. Sara Zafar', 'Pediatrician', 'MBBS, MD', 8, 1000.00, 'Mon-Fri', '9:00 AM - 3:00 PM', '03009999999', 'sara.zafar@hospital.com'),
('Dr. Bilal Hassan', 'Orthopedic', 'MBBS, MS', 12, 1800.00, 'Mon-Wed-Fri', '2:00 PM - 8:00 PM', '03008888888', 'bilal.hassan@hospital.com'),
('Dr. Hina Tariq', 'Gynecologist', 'MBBS, FCPS', 14, 1700.00, 'Tue-Thu-Sat', '10:00 AM - 7:00 PM', '03007777777', 'hina.tariq@hospital.com'),
('Dr. Omar Farooq', 'General Physician', 'MBBS', 5, 800.00, 'Mon-Sat', '9:00 AM - 9:00 PM', '03006666666', 'omar.farooq@hospital.com');