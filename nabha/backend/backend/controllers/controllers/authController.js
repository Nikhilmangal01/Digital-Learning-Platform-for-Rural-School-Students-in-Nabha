// Auth Controller
// Digital Learning Platform - Nabha | Developed by Piyush and Team
const db = require('../db');
const { H, sign, pub, DEMO } = require('../middleware/auth');
const User = require('../db/models/User');

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
      approved: true, // auto-approved in demo/pilot
    });

    await db.createUser(newUser);

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
