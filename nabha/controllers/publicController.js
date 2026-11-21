// Public Controller - Metadata for Registration & Selectors
// Digital Learning Platform - Nabha | Developed by Piyush and Team
const db = require('../db');

exports.getPublicSchools = async (req, res) => {
  try {
    const schools = await db.getSchools();
    const activeSchools = schools
      .filter(s => s.active !== false)
      .map(s => ({
        schoolId: s.schoolId,
        name: s.name,
        curriculumCode: s.curriculumCode || 'PSEB',
        city: s.city || 'Nabha',
      }));
    res.json({ schools: activeSchools });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};

exports.getPublicCurricula = async (req, res) => {
  try {
    const curricula = await db.getCurricula();
    const list = curricula.map(c => ({
      code: c.code,
      name: c.name,
      description: c.description || '',
      classes: c.classes || [6, 7, 8, 9, 10, 11, 12],
      subjects: c.subjects || ['Maths', 'Science', 'English', 'Punjabi'],
    }));
    res.json({ curricula: list });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};
