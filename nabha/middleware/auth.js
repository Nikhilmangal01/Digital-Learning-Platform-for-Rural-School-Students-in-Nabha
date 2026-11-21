// Authentication Middleware & Token Helpers
// Digital Learning Platform - Nabha | Developed by Piyush and Team
const crypto = require('crypto');
const db = require('../db');

const SEC = process.env.SECRET || 'nabha-secret';
const DEMO = process.env.DEMO_MODE !== 'false';

const H = p => crypto.scryptSync(p, 'nabha-salt', 32).toString('hex');

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

const auth = (...roles) => async (req, res, next) => {
  try {
    const o = ver((req.headers.authorization || '').slice(7));
    if (!o || (roles.length && !roles.includes(o.role))) {
      return res.status(401).json({ error: 'wrong' });
    }
    req.u = await db.findUserById(o.id);
    if (!req.u) return res.status(401).json({ error: 'wrong' });

    // Block unapproved teachers from accessing teacher resources
    if (req.u.role === 'teacher' && !req.u.approved) {
      return res.status(403).json({ error: 'wait', message: 'Account pending admin approval' });
    }

    next();
  } catch (err) {
    res.status(401).json({ error: 'wrong' });
  }
};

const pub = u => ({
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
});

module.exports = {
  H,
  sign,
  ver,
  auth,
  pub,
  DEMO,
};
