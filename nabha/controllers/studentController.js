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
    let ops = [];
    const body = req.body || {};

    // 1. If sent as { ops: [...] } from frontend flush()
    if (Array.isArray(body.ops)) {
      ops = ops.concat(body.ops);
    }
    // 2. If sent as { actions: [...] }
    if (Array.isArray(body.actions)) {
      ops = ops.concat(body.actions);
    }
    // 3. If sent as array directly [ ... ]
    if (Array.isArray(body)) {
      ops = ops.concat(body);
    }
    // 4. If sent as single action { t: 'l', id: ... } or { type: 'l', id: ... }
    if ((body.t || body.type) && (body.id != null || body.lessonId != null || body.quizId != null)) {
      ops.push(body);
    }
    // 5. If sent as full state { l: [...], q: {...} } or { progress: { l, q } }
    const fullState = body.progress || body;
    if (Array.isArray(fullState.l)) {
      for (const lid of fullState.l) {
        ops.push({ t: 'l', type: 'l', id: lid });
      }
    }
    if (fullState.q && typeof fullState.q === 'object') {
      for (const [qid, sc] of Object.entries(fullState.q)) {
        ops.push({ t: 'q', type: 'q', id: qid, score: sc });
      }
    }

    let updated;
    if (ops.length > 0) {
      updated = await db.syncProgress(req.u.id, ops);
    } else {
      updated = await db.getProgress(req.u.id);
    }

    const pct = await db.calculateProgressPercentage(req.u.id);

    res.json({
      ok: true,
      progress: updated,
      p: updated,
      l: updated.l || [],
      q: updated.q || {},
      pct,
    });
  } catch (err) {
    console.error('syncProgress error:', err);
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
