// Student Controller - Curriculum-Filtered Learning & Progress Tracking
// Digital Learning Platform - Nabha | Developed by Piyush and Team
const db = require('../db');

exports.getContent = async (req, res) => {
  try {
    let lessons = [];
    let quizzes = [];

    if (req.u.role === 'student') {
      const studentCurriculum = req.u.curriculumCode || 'PSEB';
      const studentClass = Number(req.u.class) || 8;
      // Scoped content matching student's curriculum board and class
      lessons = await db.getLessons({ curriculumCode: studentCurriculum, class: studentClass });
      quizzes = await db.getQuizzes({ curriculumCode: studentCurriculum });
      // Keep quizzes only for the student's lessons
      const lessonIdSet = new Set(lessons.map(l => l.id));
      quizzes = quizzes.filter(q => lessonIdSet.has(q.lesson));
    } else if (req.u.role === 'teacher') {
      const teacherCurriculum = req.u.curriculumCode || 'PSEB';
      lessons = await db.getLessons({ curriculumCode: teacherCurriculum });
      quizzes = await db.getQuizzes({ curriculumCode: teacherCurriculum });
    } else {
      // Admin sees all
      lessons = await db.getLessons();
      quizzes = await db.getQuizzes();
    }

    res.json({ lessons, quizzes });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};

exports.getProgress = async (req, res) => {
  try {
    const prog = await db.getProgress(req.u.id);
    res.json(prog);
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};

exports.syncProgress = async (req, res) => {
  try {
    const { l, q } = req.body;
    if (!l && !q) return res.status(400).json({ error: 'wrong' });

    const updated = await db.syncProgress(req.u.id, { l, q });
    const pct = await db.calculateProgressPercentage(req.u.id);

    res.json({
      ok: true,
      p: updated,
      pct,
    });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};

exports.getAnnouncements = async (req, res) => {
  try {
    const ann = await db.getAnnouncements(10);
    res.json(ann);
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};
