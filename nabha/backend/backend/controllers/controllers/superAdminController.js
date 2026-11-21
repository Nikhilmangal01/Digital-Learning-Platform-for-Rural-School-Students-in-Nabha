// Super Admin Controller - Multi-Curriculum & Multi-School Orchestration
// Digital Learning Platform - Nabha | Developed by Piyush and Team
const db = require('../db');
const { H, pub } = require('../middleware/auth');
const Curriculum = require('../db/models/Curriculum');
const School = require('../db/models/School');

// --- Curricula Management ---
exports.getCurricula = async (req, res) => {
  try {
    const list = await db.getCurricula();
    res.json({ curricula: list });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};

exports.createCurriculum = async (req, res) => {
  try {
    const { code, name, description, classes, subjects } = req.body;
    const err = Curriculum.validate({ code, name });
    if (err) return res.status(400).json({ error: err });

    const newCurr = new Curriculum({ code, name, description, classes, subjects });
    const result = await db.createCurriculum(newCurr);
    if (result.error === 'already_exists') {
      return res.status(409).json({ error: 'curriculum_code_exists' });
    }
    res.json({ ok: true, curriculum: newCurr });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};

exports.updateCurriculum = async (req, res) => {
  try {
    const { code } = req.params;
    const { name, description, classes, subjects } = req.body;
    const result = await db.updateCurriculum(code, { name, description, classes, subjects });
    if (result.error === 'not_found') return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};

exports.deleteCurriculum = async (req, res) => {
  try {
    const { code } = req.params;
    if (code === 'PSEB') {
      return res.status(400).json({ error: 'cannot_delete_default_curriculum' });
    }
    const result = await db.deleteCurriculum(code);
    if (result.error === 'not_found') return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};

// --- Schools Management ---
exports.getSchools = async (req, res) => {
  try {
    const list = await db.getSchools();
    res.json({ schools: list });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};

exports.createSchool = async (req, res) => {
  try {
    const { schoolId, name, curriculumCode, city, state } = req.body;
    const err = School.validate({ schoolId, name, curriculumCode });
    if (err) return res.status(400).json({ error: err });

    const newSchool = new School({ schoolId, name, curriculumCode, city, state });
    const result = await db.createSchool(newSchool);
    if (result.error === 'already_exists') {
      return res.status(409).json({ error: 'school_id_exists' });
    }
    res.json({ ok: true, school: newSchool });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};

exports.updateSchool = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { name, curriculumCode, city, state, active } = req.body;
    const result = await db.updateSchool(schoolId, { name, curriculumCode, city, state, active });
    if (result.error === 'not_found') return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};

exports.deleteSchool = async (req, res) => {
  try {
    const { schoolId } = req.params;
    if (schoolId === 'SCH_NABHA_01') {
      return res.status(400).json({ error: 'cannot_delete_primary_school' });
    }
    const result = await db.deleteSchool(schoolId);
    if (result.error === 'not_found') return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};

// --- Users Management ---
exports.getUsers = async (req, res) => {
  try {
    const users = await db.getAllUsers();
    res.json({ users: users.map(pub) });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};

exports.approveUser = async (req, res) => {
  try {
    const { id } = req.body;
    await db.approveUser(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { id } = req.body;
    await db.resetPassword(id, H('pass123'));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};

exports.updateUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, subject, class: cls, role, password, schoolId, curriculumCode } = req.body;
    const fields = { name, username, subject, class: cls, role, schoolId, curriculumCode };
    if (password) fields.hash = H(password);
    const result = await db.updateUserDetails(id, fields);
    if (result.error === 'taken') return res.status(409).json({ error: 'taken' });
    if (result.error === 'not_found') return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.deleteUser(id, req.u.id);
    if (result.error === 'self_delete') return res.status(400).json({ error: 'cannot_delete_self' });
    if (result.error === 'forbidden') return res.status(403).json({ error: 'cannot_delete_admin' });
    if (result.error === 'not_found') return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};

exports.createAnnouncement = async (req, res) => {
  try {
    if (req.body.text) {
      await db.createAnnouncement(String(req.body.text).slice(0, 300), req.u.name);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};
