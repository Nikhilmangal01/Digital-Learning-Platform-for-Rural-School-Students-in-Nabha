// Digital Learning Platform - Nabha | Developed by Piyush and Team
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const crypto = require('crypto');
const db = require('./db');

const SEC = process.env.SECRET || 'nabha-secret';
const DEMO = process.env.DEMO_MODE !== 'false';
const H = p => crypto.scryptSync(p, 'nabha-salt', 32).toString('hex');
const T = (en, hi, pa) => ({ en, hi, pa });

const sign = o => {
  const b = Buffer.from(JSON.stringify({ ...o, e: Date.now() + 864e5 })).toString('base64url');
  return b + '.' + crypto.createHmac('sha256', SEC).update(b).digest('base64url');
};

const ver = t => {
  try {
    const [b, s] = t.split('.');
    if (s !== crypto.createHmac('sha256', SEC).update(b).digest('base64url')) return;
    const o = JSON.parse(Buffer.from(b, 'base64url'));
    return o.e > Date.now() ? o : null;
  } catch {}
};

const auth = (...r) => async (q, s, n) => {
  try {
    const o = ver((q.headers.authorization || '').slice(7));
    if (!o || (r.length && !r.includes(o.role))) return s.status(401).json({ error: 'wrong' });
    q.u = await db.findUserById(o.id);
    if (!q.u) return s.status(401).json({ error: 'wrong' });
    n();
  } catch (err) {
    s.status(401).json({ error: 'wrong' });
  }
};

const pub = u => ({
  id: u.id,
  username: u.username,
  name: u.name,
  role: u.role,
  class: u.class,
  subject: u.subject || (u.role === 'teacher' ? 'Maths' : ''),
  approved: u.approved,
});

const app = express();
app.use(express.json());
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Page Routing & Aliases
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

app.get('/api/config', (q, s) => s.json({ demo: DEMO }));

app.post('/api/login', async (q, s) => {
  try {
    const { username, password, role } = q.body;
    const u = await db.findUserByUsername(username);
    if (!u || u.hash !== H(password || '') || u.role !== role) return s.status(400).json({ error: 'wrong' });
    if (!u.approved) return s.status(403).json({ error: 'pending' });
    s.json({ token: sign({ id: u.id, role: u.role }), user: pub(u) });
  } catch (err) {
    s.status(500).json({ error: 'server_error' });
  }
});

app.post('/api/register', async (q, s) => {
  try {
    const { username, password, name, role, subject } = q.body;
    if (!['student', 'teacher'].includes(role) || !username || !password || !name) {
      return s.status(400).json({ error: 'wrong' });
    }
    const existing = await db.findUserByUsername(username);
    if (existing) return s.status(400).json({ error: 'taken' });

    const chosenSubject = role === 'teacher' ? (String(subject || '').trim() || 'Maths') : '';
    const assignedClass = role === 'student' ? (+q.body.class || 6) : (role === 'teacher' ? (+q.body.class || 8) : 0);
    const u = {
      id: Date.now(),
      username: String(username).trim(),
      name: String(name).trim(),
      role,
      class: assignedClass,
      subject: chosenSubject,
      hash: H(password),
      approved: role === 'student',
    };
    await db.createUser(u);
    console.log('[Register] New user registered:', u.username, '| Role:', u.role, '| Subject:', u.subject, '| Class:', u.class);
    u.approved ? s.json({ token: sign({ id: u.id, role }), user: pub(u) }) : s.json({ pending: true });
  } catch (err) {
    s.status(500).json({ error: 'server_error' });
  }
});

app.get('/api/content', auth(), async (q, s) => {
  try {
    const [lessons, quizzes] = await Promise.all([db.getLessons(), db.getQuizzes()]);
    s.json({ lessons, quizzes });
  } catch (err) {
    s.status(500).json({ error: 'server_error' });
  }
});

app.get('/api/announcements', auth(), async (q, s) => {
  try {
    const ann = await db.getAnnouncements(5);
    s.json(ann);
  } catch (err) {
    s.status(500).json({ error: 'server_error' });
  }
});

// Progress Retrieval & Sync Routes
const handleGetProgress = async (q, s) => {
  try {
    const p = await db.getProgress(q.u.id);
    const pct = await db.calculateProgressPercentage(q.u.id);
    s.json({ ok: true, progress: p, l: p.l || [], q: p.q || {}, pct });
  } catch (err) {
    s.status(500).json({ error: 'server_error' });
  }
};
app.get('/api/progress', auth(), handleGetProgress);
app.get('/api/user/progress', auth(), handleGetProgress);

const handleSyncProgress = async (q, s) => {
  try {
    const ops = q.body.ops || q.body.actions || (q.body.type || q.body.t ? [q.body] : []);
    await db.syncProgress(q.u.id, ops);
    const pct = await db.calculateProgressPercentage(q.u.id);
    const p = await db.getProgress(q.u.id);
    s.json({ ok: true, pct, progress: p, l: p.l || [], q: p.q || {} });
  } catch (err) {
    s.status(500).json({ error: 'server_error' });
  }
};
app.post('/api/sync', auth(), handleSyncProgress);
app.post('/api/action', auth(), handleSyncProgress);
app.post('/api/user/action', auth(), handleSyncProgress);

app.post('/api/user/profile', auth('student', 'teacher'), async (q, s) => {
  try {
    const { name, username, password } = q.body;
    if (!name || !username) return s.status(400).json({ error: 'wrong' });
    const updatePayload = {
      name: String(name).trim(),
      username: String(username).trim(),
    };
    if (password && String(password).trim().length > 0) {
      updatePayload.hash = H(String(password).trim());
    }
    const res = await db.updateUserDetails(q.u.id, updatePayload);
    if (res.error) return s.status(400).json({ error: res.error });
    const updatedUser = await db.findUserById(q.u.id);
    s.json({ ok: true, user: pub(updatedUser) });
  } catch (err) {
    s.status(500).json({ error: 'server_error' });
  }
});

app.get('/api/teacher/students', auth('teacher', 'admin'), async (q, s) => {
  try {
    const teacherClass = q.u.role === 'teacher' && q.u.class ? Number(q.u.class) : null;
    const students = await db.getStudentsWithProgress(teacherClass);
    s.json(students);
  } catch (err) {
    s.status(500).json({ error: 'server_error' });
  }
});

app.post('/api/teacher/lesson', auth('teacher', 'admin'), async (q, s) => {
  try {
    const { en, hi, pa, subject, cls, note, content, t_en, t_hi, t_pa, cnt_en, cnt_hi, cnt_pa } = q.body;
    const titleEn = en || t_en || pa || t_pa || hi || t_hi;
    if (!titleEn) return s.status(400).json({ error: 'wrong' });
    const titleHi = hi || t_hi || titleEn;
    const titlePa = pa || t_pa || titleEn;
    const assignedSubject = q.u.role === 'teacher' ? (q.u.subject || 'Maths') : (subject || q.body.s || 'Maths');
    const assignedClass = q.u.role === 'teacher' ? (Number(q.u.class) || 8) : (+cls || +q.body.c || 8);
    const rawEn = (content && content.en) || cnt_en || note || '';
    const rawHi = (content && content.hi) || cnt_hi || rawEn;
    const rawPa = (content && content.pa) || cnt_pa || rawEn;
    const lessonContent = T(rawEn, rawHi, rawPa);
    const newLesson = {
      id: Date.now(),
      s: assignedSubject,
      c: assignedClass,
      t: T(titleEn, titleHi, titlePa),
      n: lessonContent,
      content: lessonContent,
      authorId: q.u.id,
      authorName: q.u.name,
    };
    await db.createLesson(newLesson);
    s.json({ ok: true, lesson: newLesson });
  } catch (err) {
    s.status(500).json({ error: 'server_error' });
  }
});

app.post('/api/teacher/lesson/update', auth('teacher', 'admin'), async (q, s) => {
  try {
    const { id, en, hi, pa, subject, cls, note, content, t_en, t_hi, t_pa, cnt_en, cnt_hi, cnt_pa } = q.body;
    const titleEn = en || t_en || pa || t_pa || hi || t_hi;
    if (!id || !titleEn) return s.status(400).json({ error: 'wrong' });
    const titleHi = hi || t_hi || titleEn;
    const titlePa = pa || t_pa || titleEn;
    const assignedSubject = q.u.role === 'teacher' ? (q.u.subject || 'Maths') : (subject || q.body.s || 'Maths');
    const assignedClass = q.u.role === 'teacher' ? (Number(q.u.class) || 8) : (+cls || +q.body.c || 8);
    const updateData = {
      s: assignedSubject,
      c: assignedClass,
      t: T(titleEn, titleHi, titlePa),
    };
    if (content || note || cnt_en) {
      const rawEn = (content && content.en) || cnt_en || note || '';
      const rawHi = (content && content.hi) || cnt_hi || rawEn;
      const rawPa = (content && content.pa) || cnt_pa || rawEn;
      const lessonContent = T(rawEn, rawHi, rawPa);
      updateData.n = lessonContent;
      updateData.content = lessonContent;
    }
    const res = await db.updateLesson(id, updateData, q.u.id, q.u.role);
    if (res.error === 'unauthorized') return s.status(403).json({ error: 'unauthorized' });
    if (res.error === 'not_found') return s.status(404).json({ error: 'not_found' });
    s.json({ ok: true });
  } catch (err) {
    s.status(500).json({ error: 'server_error' });
  }
});

app.post('/api/teacher/quiz', auth('teacher', 'admin'), async (q, s) => {
  try {
    const { lessonId, questions } = q.body;
    if (!lessonId || !Array.isArray(questions) || !questions.length) {
      return s.status(400).json({ error: 'wrong' });
    }
    if (q.u.role === 'teacher') {
      const allLessons = await db.getLessons();
      const targetLesson = allLessons.find(l => l.id == Number(lessonId));
      if (!targetLesson) return s.status(404).json({ error: 'not_found' });
      if (targetLesson.authorId != null && targetLesson.authorId !== q.u.id) {
        return s.status(403).json({ error: 'unauthorized' });
      }
      if (q.u.subject && targetLesson.s && targetLesson.s.toLowerCase() !== q.u.subject.toLowerCase()) {
        return s.status(403).json({ error: 'unauthorized' });
      }
      if (q.u.class && targetLesson.c && Number(targetLesson.c) !== Number(q.u.class)) {
        return s.status(403).json({ error: 'unauthorized' });
      }
    }
    const res = await db.createOrUpdateQuiz(lessonId, questions, q.u.id, q.u.role);
    if (res.error === 'unauthorized') return s.status(403).json({ error: 'unauthorized' });
    if (res.error === 'lesson_not_found') return s.status(404).json({ error: 'not_found' });
    s.json({ ok: true, id: res.id, quiz: { id: res.id, lesson: Number(lessonId), q: questions } });
  } catch (err) {
    s.status(500).json({ error: 'server_error' });
  }
});

app.post('/api/announce', auth('teacher', 'admin'), async (q, s) => {
  try {
    if (q.body.text) {
      await db.createAnnouncement(String(q.body.text).slice(0, 300), q.u.name);
    }
    s.json({ ok: true });
  } catch (err) {
    s.status(500).json({ error: 'server_error' });
  }
});

app.get('/api/admin/users', auth('admin'), async (q, s) => {
  try {
    const users = await db.getAllUsers();
    s.json(users.map(pub));
  } catch (err) {
    s.status(500).json({ error: 'server_error' });
  }
});

// Admin Action Handlers (Dual Route Aliases)
const handleAdminApprove = async (q, s) => {
  try {
    const { id } = q.body;
    if (!id) return s.status(400).json({ error: 'wrong' });
    await db.approveUser(id);
    s.json({ ok: true });
  } catch (err) {
    s.status(500).json({ error: 'server_error' });
  }
};
app.post('/api/admin/approve', auth('admin'), handleAdminApprove);
app.post('/api/admin/approve-user', auth('admin'), handleAdminApprove);

const handleAdminReset = async (q, s) => {
  try {
    const { id, password } = q.body;
    if (!id) return s.status(400).json({ error: 'wrong' });
    if (password) {
      await db.resetPassword(id, H(password));
    }
    s.json({ ok: true });
  } catch (err) {
    s.status(500).json({ error: 'server_error' });
  }
};
app.post('/api/admin/reset', auth('admin'), handleAdminReset);
app.post('/api/admin/reset-password', auth('admin'), handleAdminReset);

const handleAdminUpdate = async (q, s) => {
  try {
    const { id, name, username, subject, class: cls } = q.body;
    if (!id) return s.status(400).json({ error: 'wrong' });
    const res = await db.updateUserDetails(id, { name, username, subject, class: cls });
    if (res && res.error) return s.status(400).json({ error: res.error });
    s.json({ ok: true });
  } catch (err) {
    s.status(500).json({ error: 'server_error' });
  }
};
app.post('/api/admin/user/update', auth('admin'), handleAdminUpdate);
app.post('/api/admin/update-user', auth('admin'), handleAdminUpdate);

const handleAdminDelete = async (q, s) => {
  try {
    const { id } = q.body;
    if (!id) return s.status(400).json({ error: 'wrong' });
    const res = await db.deleteUser(id, q.u.id);
    if (res && res.error === 'self_delete') return s.status(400).json({ error: 'self_delete' });
    if (res && res.error === 'forbidden') return s.status(403).json({ error: 'forbidden' });
    if (res && res.error === 'not_found') return s.status(404).json({ error: 'not_found' });
    s.json({ ok: true });
  } catch (err) {
    s.status(500).json({ error: 'server_error' });
  }
};
app.post('/api/admin/user/delete', auth('admin'), handleAdminDelete);
app.post('/api/admin/delete-user', auth('admin'), handleAdminDelete);

const port = process.env.PORT || 5000;

// Initialize MongoDB Atlas database before starting HTTP server
db.initDB()
  .then(() => {
    app.listen(port, () => console.log('Nabha Learning Platform running at http://localhost:' + port));
  })
  .catch(err => {
    console.error('\n[Database Error] Could not connect to MongoDB Atlas:');
    console.error(err.message);
    console.error('\nPlease verify your MONGODB_URI in the .env file and restart the server.\n');
  });
