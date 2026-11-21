// Auth Controller
// Digital Learning Platform - Nabha | Developed by Piyush and Team
const db = require('../db');
const { H, sign, pub, DEMO } = require('../middleware/auth');
let User;
try {
  User = require('../db/models/User');
} catch (e) {
  User = class User {
    constructor(data = {}) {
      this.id = data.id || Date.now();
      this.username = (data.username || '').trim().toLowerCase();
      this.name = (data.name || '').trim();
      this.role = data.role || 'student';
      this.class = Number(data.class) || 0;
      this.subject = data.subject || (data.role === 'teacher' ? 'Maths' : '');
      this.schoolId = data.schoolId || 'SCH_NABHA_01';
      this.schoolName = data.schoolName || 'Govt Sen Sec School, Nabha';
      this.curriculumCode = (data.curriculumCode || 'PSEB').trim().toUpperCase();
      this.hash = data.hash || '';
      this.approved = typeof data.approved === 'boolean' ? data.approved : true;
      this.createdAt = data.createdAt || new Date().toISOString();
    }
    static sanitize(u) {
      if (!u) return null;
      return {
        id: u.id,
        username: u.username,
        name: u.name,
        role: u.role,
        class: u.class,
        subject: u.subject || (u.role === 'teacher' ? 'Maths' : ''),
        schoolId: u.schoolId || 'SCH_NABHA_01',
        schoolName: u.schoolName || 'Govt Sen Sec School, Nabha',
        curriculumCode: u.curriculumCode || 'PSEB',
        approved: u.approved,
      };
    }
  };
}

exports.getConfig = (req, res) => {
  res.json({ demo: DEMO });
};

exports.login = async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'wrong' });

    const u = await db.findUserByUsername(String(username).trim());
    if (!u || u.hash !== H(password)) {
      return res.status(401).json({ error: 'wrong' });
    }

    if (role && u.role !== role) {
      return res.status(403).json({ error: 'wrong' });
    }

    // Role-specific approval guard: Teachers must be approved by admin
    if (u.role === 'teacher' && !u.approved) {
      return res.status(403).json({ error: 'wait', message: 'Account pending admin approval' });
    }

    res.json({
      token: sign({ id: u.id, role: u.role }),
      user: pub(u),
    });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};

exports.register = async (req, res) => {
  try {
    const { username, password, name, role, schoolId, curriculumCode } = req.body;
    if (!username || !password || !name) return res.status(400).json({ error: 'wrong' });

    const cleanUsername = String(username).trim();
    const existing = await db.findUserByUsername(cleanUsername);
    if (existing) return res.status(409).json({ error: 'taken' });

    const targetRole = role === 'teacher' ? 'teacher' : 'student';
    // Teachers require admin approval (approved: false), students are auto-approved
    const isApproved = targetRole === 'teacher' ? false : true;

    let targetSchoolId = 'SCH_NABHA_01';
    let targetSchoolName = 'Govt Sen Sec School, Nabha';
    let targetCurriculum = 'PSEB';

    // Multi-School & Multi-Curriculum Resolution
    const allSchools = await db.getSchools();
    if (targetRole === 'student') {
      if (schoolId) {
        const foundSchool = allSchools.find(s => s.schoolId === schoolId);
        if (foundSchool) {
          targetSchoolId = foundSchool.schoolId;
          targetSchoolName = foundSchool.name;
          targetCurriculum = foundSchool.curriculumCode || 'PSEB';
        }
      }
    } else if (targetRole === 'teacher') {
      // Teacher selects their Curriculum directly
      if (curriculumCode) {
        targetCurriculum = String(curriculumCode).trim().toUpperCase();
      }
    }

    const newUser = new User({
      id: Date.now(),
      username: cleanUsername,
      name: String(name).trim(),
      role: targetRole,
      class: Number(req.body.class) || (targetRole === 'teacher' ? 0 : 8),
      subject: req.body.subject || (targetRole === 'teacher' ? 'Maths' : ''),
      schoolId: targetSchoolId,
      schoolName: targetSchoolName,
      curriculumCode: targetCurriculum,
      hash: H(password),
      approved: isApproved,
    });

    await db.createUser(newUser);

    // If teacher, do not issue login token immediately; notify that admin approval is needed
    if (targetRole === 'teacher') {
      return res.json({
        ok: true,
        status: 'wait',
        message: 'Registration successful. Waiting for admin approval.',
      });
    }

    res.json({
      token: sign({ id: newUser.id, role: newUser.role }),
      user: pub(newUser),
    });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};

exports.getMe = async (req, res) => {
  try {
    res.json({ user: pub(req.u) });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};
