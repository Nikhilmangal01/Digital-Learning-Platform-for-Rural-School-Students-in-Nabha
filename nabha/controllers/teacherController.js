// Teacher Controller - Curriculum-Scoped Instruction & Assessments
// Digital Learning Platform - Nabha | Developed by Piyush and Team
const db = require('../db');
let Lesson, Quiz;
try {
  Lesson = require('../db/models/Lesson');
  Quiz = require('../db/models/Quiz');
} catch (e) {
  Lesson = class Lesson {
    constructor(data = {}) {
      this.id = data.id || Date.now();
      this.c = Number(data.c) || 6;
      this.s = (data.s || 'Maths').trim();
      this.t = typeof data.t === 'object' ? data.t : { en: data.t || '' };
      this.n = typeof data.cnt === 'object' ? data.cnt : (typeof data.n === 'object' ? data.n : { en: data.cnt || data.n || '' });
      this.mediaUrl = data.mediaUrl || '';
      this.driveLink = data.driveLink || '';
      this.attachments = Array.isArray(data.attachments) ? data.attachments : [];
      this.curriculumCode = (data.curriculumCode || 'PSEB').trim().toUpperCase();
      this.authorId = data.authorId || null;
      this.createdAt = data.createdAt || new Date().toISOString();
    }
  };
  Quiz = class Quiz {
    constructor(data = {}) {
      this.id = data.id || Date.now();
      this.c = Number(data.c) || 6;
      this.s = (data.s || 'Maths').trim();
      this.q = typeof data.q === 'object' ? data.q : { en: data.q || '' };
      this.o = Array.isArray(data.o) ? data.o : [];
      this.a = Number(data.a) || 0;
      this.curriculumCode = (data.curriculumCode || 'PSEB').trim().toUpperCase();
      this.authorId = data.authorId || null;
      this.createdAt = data.createdAt || new Date().toISOString();
    }
  };
}

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
    let { c, s, t, cnt, content, n, t_en, t_hi, t_pa, cnt_en, cnt_hi, cnt_pa, mediaUrl, driveLink, attachments } = req.body;
    if (!t) {
      t = { en: t_en || '', hi: t_hi || '', pa: t_pa || '' };
    }

    const resolvedCnt = cnt || content || n || {
      en: cnt_en || '',
      hi: cnt_hi || '',
      pa: cnt_pa || ''
    };
    if (cnt_en !== undefined || cnt_hi !== undefined || cnt_pa !== undefined) {
      resolvedCnt.en = resolvedCnt.en || cnt_en || '';
      resolvedCnt.hi = resolvedCnt.hi || cnt_hi || '';
      resolvedCnt.pa = resolvedCnt.pa || cnt_pa || '';
    }

    if (!c || !s || (!t.en && !t.hi && !t.pa)) return res.status(400).json({ error: 'wrong' });

    // Validate class and subject against teacher profile if restricted
    if (req.u.role === 'teacher') {
      const normUserSubj = (req.u.subject || '').toLowerCase().replace(/s$/, '');
      const normLessonSubj = (s || '').toLowerCase().replace(/s$/, '');
      if (req.u.subject && normUserSubj !== normLessonSubj) {
        return res.status(403).json({ error: 'unauthorized_subject' });
      }
      if (req.u.class && Number(req.u.class) > 0 && Number(req.u.class) !== Number(c)) {
        return res.status(403).json({ error: 'unauthorized_class' });
      }
    }

    const teacherCurriculum = req.u.curriculumCode || 'PSEB';

    const newLesson = new Lesson({
      id: Date.now(),
      c: Number(c),
      s: String(s),
      t,
      cnt: resolvedCnt,
      content: resolvedCnt,
      n: resolvedCnt,
      authorId: req.u.id,
      authorName: req.u.name,
      curriculumCode: teacherCurriculum,
      schoolId: 'ALL', // Global shared to all schools following this curriculum
      mediaUrl: mediaUrl || '',
      driveLink: driveLink || '',
      attachments: Array.isArray(attachments) ? attachments : []
    });

    await db.createLesson(newLesson);
    res.json({ ok: true, lesson: newLesson });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};

exports.updateLesson = async (req, res) => {
  try {
    const id = req.params.id || req.body.id;
    let { c, s, t, cnt, content, n, t_en, t_hi, t_pa, cnt_en, cnt_hi, cnt_pa, mediaUrl, driveLink, attachments } = req.body;
    const updateData = {};
    if (c) updateData.c = Number(c);
    if (s) updateData.s = String(s);

    if (t) {
      updateData.t = t;
    } else if (t_en !== undefined || t_hi !== undefined || t_pa !== undefined) {
      updateData.t = { en: t_en || '', hi: t_hi || '', pa: t_pa || '' };
    }

    const resolvedCnt = cnt || content || n || (
      (cnt_en !== undefined || cnt_hi !== undefined || cnt_pa !== undefined)
        ? { en: cnt_en || '', hi: cnt_hi || '', pa: cnt_pa || '' }
        : null
    );

    if (resolvedCnt) {
      updateData.cnt = resolvedCnt;
      updateData.content = resolvedCnt;
      updateData.n = resolvedCnt;
    }

    if (mediaUrl !== undefined) updateData.mediaUrl = mediaUrl;
    if (driveLink !== undefined) updateData.driveLink = String(driveLink).trim();
    if (attachments !== undefined) updateData.attachments = Array.isArray(attachments) ? attachments : [];

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
    const teacherSubject = req.u.subject || 'Maths';
    // Fetches all students enrolled in schools that follow this teacher's curriculum for this class and computes SUBJECT-SCOPED progress
    const students = await db.getStudentsWithProgress(teacherClass, teacherCurriculum, teacherSubject);
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};
