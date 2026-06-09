let currentView = 'doctors';
let selectedDoctor = null;
let appointmentModal;

document.addEventListener('DOMContentLoaded', async () => {
    appointmentModal = new bootstrap.Modal(document.getElementById('appointmentModal'));
    await loadUserProfile();
    loadDoctors();
    
    // Setup menu listeners
    document.querySelectorAll('#menuTabs .nav-link').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#menuTabs .nav-link').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.section;
            
            switch(currentView) {
                case 'doctors':
                    loadDoctors();
                    break;
                case 'appointments':
                    showBookAppointmentForm();
                    break;
                case 'reports':
                    showUploadReports();
                    break;
                case 'history':
                    loadAppointmentHistory();
                    break;
                case 'profile':
                    loadProfile();
                    break;
            }
        });
    });
});

async function loadUserProfile() {
    try {
        const response = await fetch('/api/profile');
        const user = await response.json();
        document.getElementById('userName').innerText = user.full_name;
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function loadDoctors() {
    const container = document.getElementById('mainContent');
    container.innerHTML = '<div class="text-center"><div class="spinner-border"></div><p>Loading doctors...</p></div>';
    
    try {
        const response = await fetch('/api/doctors');
        const doctors = await response.json();
        
        let html = '<h4><i class="fas fa-stethoscope me-2"></i>Our Doctors</h4><div class="row mt-3">';
        doctors.forEach(doctor => {
            html += `
                <div class="col-md-6 mb-3">
                    <div class="card doctor-card" onclick="showDoctorDetails(${doctor.id}, '${doctor.name}', ${doctor.fee}, '${doctor.specialization}', ${doctor.experience})">
                        <div class="card-body">
                            <h5 class="card-title">${doctor.name}</h5>
                            <h6 class="card-subtitle mb-2 text-muted">${doctor.specialization}</h6>
                            <p class="card-text mb-1"><i class="fas fa-graduation-cap me-2"></i>${doctor.qualification}</p>
                            <p class="card-text mb-1"><i class="fas fa-clock me-2"></i>Exp: ${doctor.experience} years</p>
                            <p class="card-text"><i class="fas fa-money-bill-wave me-2"></i>Fee: Rs. ${doctor.fee}</p>
                            <button class="btn btn-sm btn-primary mt-2" onclick="event.stopPropagation(); bookAppointment(${doctor.id}, '${doctor.name}')">
                                <i class="fas fa-calendar-plus me-1"></i>Book Appointment
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = '<div class="alert alert-danger">Failed to load doctors. Please refresh the page.</div>';
    }
}

function showDoctorDetails(id, name, fee, specialization, experience) {
    const container = document.getElementById('mainContent');
    container.innerHTML = `
        <h4><i class="fas fa-user-md me-2"></i>Doctor Details</h4>
        <div class="card mt-3">
            <div class="card-body">
                <h5>${name}</h5>
                <p><strong>Specialization:</strong> ${specialization}</p>
                <p><strong>Experience:</strong> ${experience} years</p>
                <p><strong>Consultation Fee:</strong> Rs. ${fee}</p>
                <button class="btn btn-primary" onclick="bookAppointment(${id}, '${name}')">
                    <i class="fas fa-calendar-plus me-2"></i>Book Appointment
                </button>
                <button class="btn btn-secondary ms-2" onclick="loadDoctors()">Back to Doctors</button>
            </div>
        </div>
    `;
}

function bookAppointment(doctorId, doctorName) {
    document.getElementById('bookDoctorId').value = doctorId;
    document.getElementById('bookDoctorName').value = doctorName;
    appointmentModal.show();
}

async function submitAppointment() {
    const doctorId = document.getElementById('bookDoctorId').value;
    const appointment_date = document.getElementById('appointmentDate').value;
    const appointment_time = document.getElementById('appointmentTime').value;
    const reason = document.getElementById('appointmentReason').value;
    
    if (!appointment_date || !appointment_time) {
        alert('Please select date and time');
        return;
    }
    
    try {
        const response = await fetch('/api/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ doctor_id: doctorId, appointment_date, appointment_time, reason })
        });
        const data = await response.json();
        
        if (data.success) {
            alert('Appointment booked successfully!');
            appointmentModal.hide();
            document.getElementById('appointmentDate').value = '';
            document.getElementById('appointmentTime').value = '';
            document.getElementById('appointmentReason').value = '';
            loadAppointmentHistory();
            document.querySelector('[data-section="history"]').click();
        } else {
            alert(data.error || 'Failed to book appointment');
        }
    } catch (error) {
        alert('Error booking appointment. Please try again.');
    }
}

function showBookAppointmentForm() {
    const container = document.getElementById('mainContent');
    container.innerHTML = `
        <h4><i class="fas fa-calendar-plus me-2"></i>Book New Appointment</h4>
        <p class="text-muted">Select a doctor from the list below to book an appointment.</p>
        <div class="row mt-3" id="doctorListForBooking"></div>
    `;
    
    fetch('/api/doctors')
        .then(res => res.json())
        .then(doctors => {
            let html = '';
            doctors.forEach(doctor => {
                html += `
                    <div class="col-md-6 mb-3">
                        <div class="card">
                            <div class="card-body">
                                <h5>${doctor.name}</h5>
                                <p class="mb-1"><strong>${doctor.specialization}</strong></p>
                                <p class="mb-1">Fee: Rs. ${doctor.fee}</p>
                                <button class="btn btn-primary mt-2" onclick="bookAppointment(${doctor.id}, '${doctor.name}')">
                                    <i class="fas fa-calendar-plus me-1"></i>Book
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
            document.getElementById('doctorListForBooking').innerHTML = html;
        })
        .catch(error => {
            container.innerHTML = '<div class="alert alert-danger">Failed to load doctors</div>';
        });
}

async function loadAppointmentHistory() {
    const container = document.getElementById('mainContent');
    container.innerHTML = '<div class="text-center"><div class="spinner-border"></div><p>Loading appointments...</p></div>';
    
    try {
        const response = await fetch('/api/appointments');
        const appointments = await response.json();
        
        if (appointments.length === 0) {
            container.innerHTML = '<div class="alert alert-info">No appointments booked yet. <a href="#" onclick="showBookAppointmentForm(); document.querySelector(\'[data-section="appointments"]\').click(); return false;">Book your first appointment</a></div>';
            return;
        }
        
        let html = '<h4><i class="fas fa-history me-2"></i>Appointment History</h4>';
        appointments.forEach(apt => {
            const statusClass = apt.status === 'confirmed' ? 'success' : apt.status === 'cancelled' ? 'danger' : 'warning';
            html += `
                <div class="card appointment-card mb-3">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-4">
                                <strong>Dr. ${apt.doctor_name}</strong><br>
                                <small class="text-muted">${apt.specialization}</small>
                            </div>
                            <div class="col-md-3">
                                <i class="fas fa-calendar me-1"></i>${new Date(apt.appointment_date).toLocaleDateString()}<br>
                                <i class="fas fa-clock me-1"></i>${apt.appointment_time}
                            </div>
                            <div class="col-md-3">
                                <span class="badge bg-${statusClass}">${apt.status.toUpperCase()}</span>
                                ${apt.status !== 'cancelled' ? `<br><small class="text-muted">Booked: ${new Date(apt.created_at).toLocaleDateString()}</small>` : ''}
                            </div>
                            ${apt.status !== 'cancelled' ? `
                            <div class="col-md-2">
                                <button class="btn btn-sm btn-danger" onclick="cancelAppointment(${apt.id})">
                                    <i class="fas fa-times me-1"></i>Cancel
                                </button>
                            </div>
                            ` : ''}
                        </div>
                        ${apt.reason ? `<div class="mt-2"><small class="text-muted">Reason: ${apt.reason}</small></div>` : ''}
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = '<div class="alert alert-danger">Failed to load appointments</div>';
    }
}

async function cancelAppointment(appointmentId) {
    if (confirm('Are you sure you want to cancel this appointment?')) {
        try {
            const response = await fetch(`/api/appointments/${appointmentId}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            
            if (data.success) {
                alert('Appointment cancelled successfully');
                loadAppointmentHistory();
            } else {
                alert(data.error || 'Failed to cancel appointment');
            }
        } catch (error) {
            alert('Error cancelling appointment');
        }
    }
}

function showUploadReports() {
    const container = document.getElementById('mainContent');
    container.innerHTML = `
        <h4><i class="fas fa-upload me-2"></i>Upload Medical Report</h4>
        <form id="reportUploadForm" enctype="multipart/form-data">
            <div class="mb-3">
                <label>Report Title *</label>
                <input type="text" class="form-control" name="report_title" id="reportTitle" required>
            </div>
            <div class="mb-3">
                <label>Report Type</label>
                <select class="form-control" name="report_type" id="reportType">
                    <option value="">Select Type</option>
                    <option>Blood Test</option>
                    <option>X-Ray</option>
                    <option>MRI</option>
                    <option>CT Scan</option>
                    <option>Prescription</option>
                    <option>Other</option>
                </select>
            </div>
            <div class="mb-3">
                <label>Upload File *</label>
                <div class="upload-area" onclick="document.getElementById('reportFile').click()">
                    <i class="fas fa-cloud-upload-alt fa-3x mb-2"></i>
                    <p>Click to select file (PDF, JPG, PNG, DOC)</p>
                    <small class="text-muted">Max size: 5MB</small>
                </div>
                <input type="file" class="d-none" id="reportFile" name="report_file" accept=".jpg,.jpeg,.png,.pdf,.doc,.docx">
                <div id="fileName" class="mt-2 small text-muted"></div>
            </div>
            <div class="mb-3">
                <label>Notes</label>
                <textarea class="form-control" name="notes" id="reportNotes" rows="3"></textarea>
            </div>
            <button type="submit" class="btn btn-primary">Upload Report</button>
        </form>
        <hr>
        <h5 class="mt-4">My Medical Reports</h5>
        <div id="reportsList"></div>
    `;
    
    document.getElementById('reportFile').addEventListener('change', function() {
        document.getElementById('fileName').innerText = this.files[0]?.name || '';
    });
    
    document.getElementById('reportUploadForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('report_title', document.getElementById('reportTitle').value);
        formData.append('report_type', document.getElementById('reportType').value);
        formData.append('report_file', document.getElementById('reportFile').files[0]);
        formData.append('notes', document.getElementById('reportNotes').value);
        
        try {
            const response = await fetch('/api/reports', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            
            if (data.success) {
                alert('Report uploaded successfully!');
                loadReportsList();
                document.getElementById('reportUploadForm').reset();
                document.getElementById('fileName').innerText = '';
            } else {
                alert(data.error || 'Upload failed');
            }
        } catch (error) {
            alert('Error uploading report');
        }
    });
    
    loadReportsList();
}

async function loadReportsList() {
    try {
        const response = await fetch('/api/reports');
        const reports = await response.json();
        
        if (reports.length === 0) {
            document.getElementById('reportsList').innerHTML = '<div class="alert alert-info">No medical reports uploaded yet.</div>';
            return;
        }
        
        let html = '<div class="list-group">';
        reports.forEach(report => {
            html += `
                <div class="list-group-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${report.report_title}</strong><br>
                            <small class="text-muted">Type: ${report.report_type || 'General'} | Uploaded: ${new Date(report.upload_date).toLocaleDateString()}</small>
                            ${report.notes ? `<br><small>Notes: ${report.notes}</small>` : ''}
                        </div>
                        <a href="/${report.file_path}" class="btn btn-sm btn-outline-primary" target="_blank">
                            <i class="fas fa-download me-1"></i>View
                        </a>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        document.getElementById('reportsList').innerHTML = html;
    } catch (error) {
        document.getElementById('reportsList').innerHTML = '<div class="alert alert-danger">Failed to load reports</div>';
    }
}

async function loadProfile() {
    try {
        const response = await fetch('/api/profile');
        const profile = await response.json();
        
        const container = document.getElementById('mainContent');
        container.innerHTML = `
            <h4><i class="fas fa-id-card me-2"></i>My Profile</h4>
            <div class="card mt-3">
                <div class="card-body">
                    <p><strong><i class="fas fa-user me-2"></i>Full Name:</strong> ${profile.full_name}</p>
                    <p><strong><i class="fas fa-envelope me-2"></i>Email:</strong> ${profile.email}</p>
                    <p><strong><i class="fas fa-phone me-2"></i>Phone:</strong> ${profile.phone || 'Not provided'}</p>
                    <p><strong><i class="fas fa-calendar me-2"></i>Date of Birth:</strong> ${profile.date_of_birth || 'Not provided'}</p>
                    <p><strong><i class="fas fa-home me-2"></i>Address:</strong> ${profile.address || 'Not provided'}</p>
                </div>
            </div>
        `;
    } catch (error) {
        document.getElementById('mainContent').innerHTML = '<div class="alert alert-danger">Failed to load profile</div>';
    }
}

async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/';
    } catch (error) {
        window.location.href = '/';
    }
}