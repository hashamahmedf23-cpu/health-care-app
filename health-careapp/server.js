const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Session Configuration
app.use(session({
    secret: 'healthcare_secret_key_2024',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Database Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Change this to your MySQL password
    database: 'healthcare_db'
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Create uploads directory if not exists
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images, PDFs, and documents are allowed'));
        }
    }
});

// ==================== API ROUTES ====================

// Middleware to check if user is logged in
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Please login first' });
    }
}

// 1. Patient Registration
app.post('/api/register', async (req, res) => {
    const { full_name, email, password, phone, date_of_birth, address } = req.body;
    
    if (!full_name || !email || !password) {
        return res.status(400).json({ error: 'Name, email and password are required' });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO patients (full_name, email, password, phone, date_of_birth, address) VALUES (?, ?, ?, ?, ?, ?)';
        
        db.query(query, [full_name, email, hashedPassword, phone, date_of_birth, address], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'Email already registered' });
                }
                return res.status(500).json({ error: 'Registration failed' });
            }
            res.json({ success: true, message: 'Registration successful! Please login.' });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// 2. Patient Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const query = 'SELECT * FROM patients WHERE email = ?';
    db.query(query, [email], async (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const patient = results[0];
        const isValid = await bcrypt.compare(password, patient.password);
        
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        req.session.userId = patient.id;
        req.session.userName = patient.full_name;
        req.session.userEmail = patient.email;
        
        res.json({ success: true, message: 'Login successful', redirect: '/dashboard.html' });
    });
});

// 3. Get Patient Profile
app.get('/api/profile', isAuthenticated, (req, res) => {
    const query = 'SELECT id, full_name, email, phone, date_of_birth, address FROM patients WHERE id = ?';
    db.query(query, [req.session.userId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        res.json(results[0]);
    });
});

// 4. Get All Doctors
app.get('/api/doctors', (req, res) => {
    const query = 'SELECT * FROM doctors ORDER BY name';
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch doctors' });
        }
        res.json(results);
    });
});

// 5. Get Single Doctor by ID
app.get('/api/doctors/:id', (req, res) => {
    const query = 'SELECT * FROM doctors WHERE id = ?';
    db.query(query, [req.params.id], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        res.json(results[0]);
    });
});

// 6. Book Appointment
app.post('/api/appointments', isAuthenticated, (req, res) => {
    const { doctor_id, appointment_date, appointment_time, reason } = req.body;
    const patient_id = req.session.userId;
    
    if (!doctor_id || !appointment_date || !appointment_time) {
        return res.status(400).json({ error: 'Please fill all required fields' });
    }
    
    const query = 'INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, reason) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [patient_id, doctor_id, appointment_date, appointment_time, reason], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to book appointment' });
        }
        res.json({ success: true, message: 'Appointment booked successfully!', appointment_id: result.insertId });
    });
});

// 7. Get Patient Appointments
app.get('/api/appointments', isAuthenticated, (req, res) => {
    const query = `
        SELECT a.*, d.name as doctor_name, d.specialization 
        FROM appointments a 
        JOIN doctors d ON a.doctor_id = d.id 
        WHERE a.patient_id = ? 
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
    `;
    db.query(query, [req.session.userId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch appointments' });
        }
        res.json(results);
    });
});

// 8. Cancel Appointment
app.delete('/api/appointments/:id', isAuthenticated, (req, res) => {
    const query = 'UPDATE appointments SET status = "cancelled" WHERE id = ? AND patient_id = ?';
    db.query(query, [req.params.id, req.session.userId], (err, result) => {
        if (err || result.affectedRows === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        res.json({ success: true, message: 'Appointment cancelled successfully' });
    });
});

// 9. Upload Medical Report
app.post('/api/reports', isAuthenticated, upload.single('report_file'), (req, res) => {
    const { report_title, report_type, notes } = req.body;
    const patient_id = req.session.userId;
    
    if (!report_title || !req.file) {
        return res.status(400).json({ error: 'Please provide report title and file' });
    }
    
    const query = 'INSERT INTO medical_reports (patient_id, report_title, report_type, file_path, notes) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [patient_id, report_title, report_type, req.file.path, notes], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to upload report' });
        }
        res.json({ success: true, message: 'Report uploaded successfully!', report_id: result.insertId });
    });
});

// 10. Get Patient Medical Reports
app.get('/api/reports', isAuthenticated, (req, res) => {
    const query = 'SELECT * FROM medical_reports WHERE patient_id = ? ORDER BY upload_date DESC';
    db.query(query, [req.session.userId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch reports' });
        }
        res.json(results);
    });
});

// 11. Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logged out successfully' });
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});