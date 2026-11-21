// Digital Learning Platform - Nabha | Developed by Piyush and Team (PS019)
// Layered MVC Architecture with Multi-Curriculum & Multi-School Support
try { require('dotenv').config(); } catch (e) {}
const fs = require('fs');
const path = require('path');
const express = require('express');
const db = require('./db');

const authRoutes = require('./routes/authRoutes');
const publicRoutes = require('./routes/publicRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const studentRoutes = require('./routes/studentRoutes');

const superAdminController = require('./controllers/superAdminController');
const teacherController = require('./controllers/teacherController');
const studentController = require('./controllers/studentController');
const authController = require('./controllers/authController');
const { auth, pub, H } = require('./middleware/auth');

const app = express();
app.use(express.json());

const frontendPath = path.join(__dirname, 'frontend');
app.use(express.static(frontendPath));
if (fs.existsSync(path.join(__dirname, 'public'))) {
  app.use(express.static(path.join(__dirname, 'public')));
}

// --- Page Routing & Aliases ---
app.get('/sw.js', (q, s) => s.sendFile(path.join(frontendPath, 'sw.js')));
app.get('/student/login', (q, s) => s.sendFile(path.join(frontendPath, 'student', 'login.html')));
app.get('/student/dashboard', (q, s) => s.sendFile(path.join(frontendPath, 'student', 'dashboard.html')));
app.get('/student-login', (q, s) => s.sendFile(path.join(frontendPath, 'student', 'login.html')));
app.get('/student-dashboard', (q, s) => s.sendFile(path.join(frontendPath, 'student', 'dashboard.html')));
app.get('/student', (q, s) => s.sendFile(path.join(frontendPath, 'student', 'login.html')));

app.get('/teacher/login', (q, s) => s.sendFile(path.join(frontendPath, 'teacher', 'login.html')));
app.get('/teacher/dashboard', (q, s) => s.sendFile(path.join(frontendPath, 'teacher', 'dashboard.html')));
app.get('/teacher-login', (q, s) => s.sendFile(path.join(frontendPath, 'teacher', 'login.html')));
app.get('/teacher-dashboard', (q, s) => s.sendFile(path.join(frontendPath, 'teacher', 'dashboard.html')));
app.get('/teacher', (q, s) => s.sendFile(path.join(frontendPath, 'teacher', 'login.html')));

app.get('/admin/login', (q, s) => s.sendFile(path.join(frontendPath, 'admin', 'login.html')));
app.get('/admin/dashboard', (q, s) => s.sendFile(path.join(frontendPath, 'admin', 'dashboard.html')));
app.get('/admin-login', (q, s) => s.sendFile(path.join(frontendPath, 'admin', 'login.html')));
app.get('/admin-dashboard', (q, s) => s.sendFile(path.join(frontendPath, 'admin', 'dashboard.html')));
app.get('/admin', (q, s) => s.sendFile(path.join(frontendPath, 'admin', 'login.html')));

// --- Modular API Routes ---
app.use('/api', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', superAdminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api', studentRoutes);

// --- Public Aliases for Schools & Curricula ---
app.get('/api/schools', (q, s) => require('./controllers/publicController').getPublicSchools(q, s));
app.get('/api/curricula', (q, s) => require('./controllers/publicController').getPublicCurricula(q, s));

// --- Backward-Compatible Legacy Route Aliases ---
// Teacher aliases
app.post('/api/teacher/lesson/update', auth('teacher', 'admin'), (q, s) => {
  q.params = { id: q.body.id };
  teacherController.updateLesson(q, s);
});
app.delete('/api/teacher/lesson', auth('teacher', 'admin'), (q, s) => {
  q.params = { id: q.query.id || q.body.id };
  teacherController.deleteLesson(q, s);
});

// Admin aliases
app.post('/api/announce', auth('teacher', 'admin'), superAdminController.createAnnouncement);
app.post('/api/admin/approve', auth('admin'), superAdminController.approveUser);
app.post('/api/admin/approve-user', auth('admin'), superAdminController.approveUser);
app.post('/api/admin/reset', auth('admin'), superAdminController.resetPassword);
app.post('/api/admin/reset-password', auth('admin'), superAdminController.resetPassword);
app.post('/api/admin/user/update', auth('admin'), (q, s) => {
  q.params = { id: q.body.id };
  superAdminController.updateUserDetails(q, s);
});
app.post('/api/admin/update-user', auth('admin'), (q, s) => {
  q.params = { id: q.body.id };
  superAdminController.updateUserDetails(q, s);
});
app.post('/api/admin/user/delete', auth('admin'), (q, s) => {
  q.params = { id: q.body.id };
  superAdminController.deleteUser(q, s);
});
app.post('/api/admin/delete-user', auth('admin'), (q, s) => {
  q.params = { id: q.body.id };
  superAdminController.deleteUser(q, s);
});

// User action and progress aliases
app.post('/api/action', auth(), studentController.syncProgress);
app.post('/api/user/action', auth(), studentController.syncProgress);
app.get('/api/user/progress', auth(), studentController.getProgress);
app.post('/api/user/profile', auth('student', 'teacher'), async (q, s) => {
  try {
    const { name, password, subject, class: cls, schoolId, curriculumCode } = q.body;
    const fields = {};
    if (name) fields.name = String(name).trim();
    if (password) fields.hash = H(password);
    if (q.u.role === 'teacher') {
      if (subject) fields.subject = String(subject).trim();
      if (cls !== undefined) fields.class = Number(cls) || 0;
      if (curriculumCode) fields.curriculumCode = String(curriculumCode).trim().toUpperCase();
    }
    if (q.u.role === 'student') {
      if (cls !== undefined) fields.class = Number(cls) || 8;
      if (schoolId) {
        fields.schoolId = schoolId;
        const schools = await db.getSchools();
        const found = schools.find(x => x.schoolId === schoolId);
        if (found) {
          fields.schoolName = found.name;
          fields.curriculumCode = found.curriculumCode;
        }
      }
    }
    await db.updateUserDetails(q.u.id, fields);
    const updatedUser = await db.findUserById(q.u.id);
    s.json({ ok: true, user: pub(updatedUser) });
  } catch (err) {
    s.status(500).json({ error: 'server_error' });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Nabha Server] Running on http://localhost:${PORT}`);
  console.log(`[Architecture] Modular MVC with Multi-Curriculum & Multi-School Support active.`);
});
