// Teacher Controller - Curriculum-Scoped Instruction & Assessments
// Digital Learning Platform - Nabha | Developed by Piyush and Team
const db = require('../db');
const Lesson = require('../db/models/Lesson');
const Quiz = require('../db/models/Quiz');

exports.setCurriculum = async (req, res) => {
  try {
    const { curriculumCode } = req.body;
    if (!curriculumCode) return res.status(400).json({ error: 'curriculum_code_required' });
    const code = String(curriculumCode).trim().toUpperCase();
    await db.updateUserDetails(req.u.id, { curriculumCode: code });
    req.u.curriculumCode = code;
    res.json({ ok: true, curriculumCode: code });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};

exports.createLesson = async (req, res) => {
  try {
    const { c, s, t, cnt, mediaUrl } = req.body;
    if (!c || !s || !t) return res.status(400).json({ error: 'wrong' });

    // Validate class and subject against teacher profile if restricted
    if (req.u.role === 'teacher') {
      if (req.u.subject && s.toLowerCase() !== req.u.subject.toLowerCase()) {
        return res.status(403).json({ error: 'unauthorized_subject' });
      }
      if (req.u.class && Number(req.u.class) !== Number(c)) {
        return res.status(403).json({ error: 'unauthorized_class' });
      }
    }

    const teacherCurriculum = req.u.curriculumCode || 'PSEB';

    const newLesson = new Lesson({
      id: Date.now(),
      c: Number(c),
      s: String(s),
      t,
      cnt: cnt || { en: '', hi: '', pa: '' },
      authorId: req.u.id,
      authorName: req.u.name,
      curriculumCode: teacherCurriculum,
      schoolId: 'ALL', // Global shared to all schools following this curriculum
      mediaUrl: mediaUrl || '',
    });

    await db.createLesson(newLesson);
    res.json({ ok: true, lesson: newLesson });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};

exports.updateLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const { c, s, t, cnt, mediaUrl } = req.body;
    const updateData = {};
    if (c) updateData.c = Number(c);
    if (s) updateData.s = String(s);
    if (t) updateData.t = t;
    if (cnt) updateData.cnt = cnt;
    if (mediaUrl !== undefined) updateData.mediaUrl = mediaUrl;

    const result = await db.updateLesson(id, updateData, req.u.id, req.u.role);
    if (result.error === 'unauthorized') return res.status(403).json({ error: 'unauthorized' });
    if (result.error === 'not_found') return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};

exports.deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const allLessons = await db.getLessons();
    const target = allLessons.find(l => l.id == Number(id));
    if (!target) return res.status(404).json({ error: 'not_found' });
    if (req.u.role !== 'admin' && target.authorId != null && target.authorId !== req.u.id) {
      return res.status(403).json({ error: 'unauthorized' });
    }

    const dbInst = db.getDB ? db.getDB() : null;
    if (dbInst) {
      await dbInst.collection('lessons').deleteOne({ id: Number(id) });
      await dbInst.collection('quizzes').deleteOne({ lesson: Number(id) }).catch(() => {});
    } else {
      const data = db.loadLocal ? db.loadLocal() : null;
      if (data) {
        data.lessons = data.lessons.filter(l => l.id != Number(id));
        data.quizzes = data.quizzes.filter(q => q.lesson != Number(id));
        db.saveLocal(data);
      }
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};

exports.createOrUpdateQuiz = async (req, res) => {
  try {
    const { lessonId, questions } = req.body;
    if (!lessonId || !Array.isArray(questions) || !questions.length) {
      return res.status(400).json({ error: 'wrong' });
    }

    const allLessons = await db.getLessons();
    const targetLesson = allLessons.find(l => l.id == Number(lessonId));
    if (!targetLesson) return res.status(404).json({ error: 'not_found' });

    if (req.u.role === 'teacher') {
      if (targetLesson.authorId != null && targetLesson.authorId !== req.u.id) {
        return res.status(403).json({ error: 'unauthorized' });
      }
      if (req.u.subject && targetLesson.s && targetLesson.s.toLowerCase() !== req.u.subject.toLowerCase()) {
        return res.status(403).json({ error: 'unauthorized' });
      }
      if (req.u.class && targetLesson.c && Number(targetLesson.c) !== Number(req.u.class)) {
        return res.status(403).json({ error: 'unauthorized' });
      }
    }

    const result = await db.createOrUpdateQuiz(lessonId, questions, req.u.id, req.u.role);
    if (result.error === 'unauthorized') return res.status(403).json({ error: 'unauthorized' });
    if (result.error === 'lesson_not_found') return res.status(404).json({ error: 'not_found' });

    res.json({
      ok: true,
      id: result.id,
      quiz: { id: result.id, lesson: Number(lessonId), q: questions, curriculumCode: req.u.curriculumCode || 'PSEB' },
    });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};

exports.getCurriculumStudents = async (req, res) => {
  try {
    const teacherClass = req.u.class || null;
    const teacherCurriculum = req.u.curriculumCode || 'PSEB';
    // Fetches all students enrolled in schools that follow this teacher's curriculum for this class
    const students = await db.getStudentsWithProgress(teacherClass, teacherCurriculum);
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};
