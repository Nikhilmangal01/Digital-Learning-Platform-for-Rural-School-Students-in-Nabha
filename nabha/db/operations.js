// Digital Learning Platform - Nabha | Database Operations (MongoDB Atlas with fallback)
const fs = require('fs');
const path = require('path');
const { getDB } = require('./connection');

const rootDataFile = path.resolve(__dirname, '..', 'data.json');
const backendDataFile = path.resolve(__dirname, '..', 'backend', 'data.json');

function loadLocal() {
  const filePath = fs.existsSync(rootDataFile) ? rootDataFile : backendDataFile;
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {}
  }
  return { users: [], lessons: [], quizzes: [], prog: {}, ann: [] };
}

function saveLocal(data) {
  try {
    const jsonStr = JSON.stringify(data, null, 2);
    if (fs.existsSync(path.dirname(rootDataFile))) {
      fs.writeFileSync(rootDataFile, jsonStr);
    }
    if (fs.existsSync(path.dirname(backendDataFile))) {
      fs.writeFileSync(backendDataFile, jsonStr);
    }
  } catch (err) {
    console.error('[Fallback Store] Error saving data.json:', err.message);
  }
}

// --- User Operations ---
async function findUserByUsername(username) {
  const db = getDB();
  if (db) {
    return await db.collection('users').findOne({ username });
  }
  const data = loadLocal();
  return data.users.find(u => u.username === username);
}

async function findUserById(id) {
  const db = getDB();
  if (db) {
    return await db.collection('users').findOne({
      $or: [{ id: Number(id) }, { id: String(id) }]
    });
  }
  const data = loadLocal();
  return data.users.find(u => u.id == id);
}

async function createUser(user) {
  const db = getDB();
  if (db) {
    await db.collection('users').insertOne(user);
    return user;
  }
  const data = loadLocal();
  data.users.push(user);
  saveLocal(data);
  return user;
}

async function getAllUsers() {
  const db = getDB();
  if (db) {
    return await db.collection('users').find({}).toArray();
  }
  const data = loadLocal();
  return data.users;
}

async function approveUser(id) {
  const db = getDB();
  const numericId = Number(id);
  if (db) {
    let queries = [{ id: String(id) }];
    if (!isNaN(numericId)) queries.push({ id: numericId });
    try {
      const { ObjectId } = require('mongodb');
      if (ObjectId.isValid(id)) queries.push({ _id: new ObjectId(id) });
    } catch (e) {}
    return await db.collection('users').updateOne(
      { $or: queries },
      { $set: { approved: true } }
    );
  }
  const data = loadLocal();
  const u = data.users.find(x => String(x.id) === String(id) || (!isNaN(numericId) && Number(x.id) === numericId));
  if (u) u.approved = true;
  saveLocal(data);
  return { ok: true };
}

async function resetPassword(id, newHash) {
  const db = getDB();
  const numericId = Number(id);
  if (db) {
    let queries = [{ id: String(id) }];
    if (!isNaN(numericId)) queries.push({ id: numericId });
    try {
      const { ObjectId } = require('mongodb');
      if (ObjectId.isValid(id)) queries.push({ _id: new ObjectId(id) });
    } catch (e) {}
    return await db.collection('users').updateOne(
      { $or: queries },
      { $set: { hash: newHash } }
    );
  }
  const data = loadLocal();
  const u = data.users.find(x => String(x.id) === String(id) || (!isNaN(numericId) && Number(x.id) === numericId));
  if (u) u.hash = newHash;
  saveLocal(data);
  return { ok: true };
}

async function updateUserDetails(id, fields) {
  const db = getDB();
  const numericId = Number(id);
  const allowed = {};
  if (fields.name) allowed.name = String(fields.name).trim();
  if (fields.username) allowed.username = String(fields.username).trim();
  if (fields.subject !== undefined) allowed.subject = String(fields.subject || '').trim();
  if (fields.class !== undefined) allowed.class = Number(fields.class) || 6;
  if (fields.role) allowed.role = fields.role;
  if (fields.hash) allowed.hash = fields.hash;
  if (db) {
    if (fields.username) {
      const exists = await db.collection('users').findOne({ username: fields.username });
      if (exists && exists.id != numericId && String(exists.id) !== String(id)) {
        return { error: 'taken' };
      }
    }
    await db.collection('users').updateOne(
      { $or: [{ id: numericId }, { id: String(id) }] },
      { $set: allowed }
    );
    return { ok: true };
  }
  const data = loadLocal();
  const u = data.users.find(x => x.id == id);
  if (!u) return { error: 'not_found' };
  if (fields.username && data.users.some(x => x.username === fields.username && x.id != id)) {
    return { error: 'taken' };
  }
  Object.assign(u, allowed);
  saveLocal(data);
  return { ok: true };
}

async function deleteUser(id, adminId) {
  const db = getDB();
  const numericId = Number(id);
  if (String(id) === String(adminId) || (!isNaN(numericId) && numericId === Number(adminId))) {
    return { error: 'self_delete' };
  }
  if (db) {
    let queries = [{ id: String(id) }];
    if (!isNaN(numericId)) queries.push({ id: numericId });
    try {
      const { ObjectId } = require('mongodb');
      if (ObjectId.isValid(id)) queries.push({ _id: new ObjectId(id) });
    } catch (e) {}

    const user = await db.collection('users').findOne({ $or: queries });
    if (!user) return { error: 'not_found' };
    if (user.role === 'admin') return { error: 'forbidden' };
    await db.collection('users').deleteOne({ $or: queries });

    let progQueries = [{ userId: String(id) }];
    if (!isNaN(numericId)) progQueries.push({ userId: numericId });
    if (user.id != null) progQueries.push({ userId: user.id }, { userId: String(user.id) });
    await db.collection('progress').deleteOne({ $or: progQueries }).catch(() => {});
    return { ok: true };
  }
  const data = loadLocal();
  const idx = data.users.findIndex(x => String(x.id) === String(id) || (!isNaN(numericId) && Number(x.id) === numericId));
  if (idx === -1) return { error: 'not_found' };
  if (data.users[idx].role === 'admin') return { error: 'forbidden' };
  const removed = data.users.splice(idx, 1)[0];
  if (data.prog) {
    delete data.prog[id];
    if (removed && removed.id != null) delete data.prog[removed.id];
  }
  saveLocal(data);
  return { ok: true };
}

// --- Lesson Operations ---
async function getLessons(filter = null) {
  const db = getDB();
  if (db) {
    const query = {};
    if (filter) {
      if (filter.curriculumCode) {
        query.$or = [
          { curriculumCode: String(filter.curriculumCode).toUpperCase() },
          { curriculumCode: { $exists: false } }
        ];
      }
      if (filter.class) query.c = Number(filter.class);
      if (filter.subject) query.s = filter.subject;
    }
    const rawList = await db.collection('lessons').find(query, { projection: { _id: 0 } }).toArray();
    return rawList.map(l => {
      const cObj = l.content || l.cnt || l.n || { en: '', hi: '', pa: '' };
      l.content = cObj;
      l.cnt = cObj;
      l.n = cObj;
      l.attachments = Array.isArray(l.attachments) ? l.attachments : [];
      l.driveLink = l.driveLink || '';
      return l;
    });
  }
  const data = loadLocal();
  let list = data.lessons || [];
  if (filter) {
    if (filter.curriculumCode) {
      const code = String(filter.curriculumCode).toUpperCase();
      list = list.filter(l => !l.curriculumCode || l.curriculumCode.toUpperCase() === code);
    }
    if (filter.class) {
      list = list.filter(l => Number(l.c) === Number(filter.class));
    }
    if (filter.subject) {
      list = list.filter(l => String(l.s).toLowerCase() === String(filter.subject).toLowerCase());
    }
  }
  return list.map(l => {
    const cObj = l.content || l.cnt || l.n || { en: '', hi: '', pa: '' };
    l.content = cObj;
    l.cnt = cObj;
    l.n = cObj;
    l.attachments = Array.isArray(l.attachments) ? l.attachments : [];
    l.driveLink = l.driveLink || '';
    return l;
  });
}

async function createLesson(lesson) {
  const cObj = lesson.content || lesson.cnt || lesson.n || { en: '', hi: '', pa: '' };
  lesson.content = cObj;
  lesson.cnt = cObj;
  lesson.n = cObj;
  lesson.attachments = Array.isArray(lesson.attachments) ? lesson.attachments : [];
  lesson.driveLink = lesson.driveLink || '';

  const db = getDB();
  if (db) {
    await db.collection('lessons').insertOne(lesson);
    return lesson;
  }
  const data = loadLocal();
  data.lessons.push(lesson);
  saveLocal(data);
  return lesson;
}

async function updateLesson(id, updateData, userId, userRole) {
  const db = getDB();
  const numericId = Number(id);

  // Synchronize all three content fields in updateData
  const cObj = updateData.content || updateData.cnt || updateData.n;
  if (cObj) {
    updateData.content = cObj;
    updateData.cnt = cObj;
    updateData.n = cObj;
  }

  if (db) {
    const lesson = await db.collection('lessons').findOne({ id: numericId });
    if (!lesson) return { error: 'not_found' };
    if (userRole !== 'admin' && lesson.authorId != null && String(lesson.authorId) !== String(userId)) {
      return { error: 'unauthorized' };
    }
    await db.collection('lessons').updateOne(
      { id: numericId },
      { $set: updateData }
    );
    return { ok: true };
  }
  const data = loadLocal();
  const lesson = data.lessons.find(l => l.id == id || (!isNaN(numericId) && Number(l.id) === numericId));
  if (!lesson) return { error: 'not_found' };
  if (userRole !== 'admin' && lesson.authorId != null && String(lesson.authorId) !== String(userId)) {
    return { error: 'unauthorized' };
  }
  Object.assign(lesson, updateData);
  saveLocal(data);
  return { ok: true };
}

async function countLessons() {
  const db = getDB();
  if (db) {
    return await db.collection('lessons').countDocuments();
  }
  const data = loadLocal();
  return data.lessons.length;
}

// --- Quiz Operations ---
async function getQuizzes(filter = null) {
  const db = getDB();
  if (db) {
    const query = {};
    if (filter && filter.curriculumCode) {
      query.$or = [
        { curriculumCode: String(filter.curriculumCode).toUpperCase() },
        { curriculumCode: { $exists: false } }
      ];
    }
    return await db.collection('quizzes').find(query, { projection: { _id: 0 } }).toArray();
  }
  const data = loadLocal();
  let list = data.quizzes || [];
  if (filter && filter.curriculumCode) {
    const code = String(filter.curriculumCode).toUpperCase();
    list = list.filter(q => !q.curriculumCode || q.curriculumCode.toUpperCase() === code);
  }
  return list;
}

async function countQuizzes() {
  const db = getDB();
  if (db) {
    return await db.collection('quizzes').countDocuments();
  }
  const data = loadLocal();
  return data.quizzes.length;
}

async function createOrUpdateQuiz(lessonId, questions, userId, userRole) {
  const db = getDB();
  const numLessonId = Number(lessonId);
  if (db) {
    const lesson = await db.collection('lessons').findOne({ id: numLessonId });
    if (!lesson) return { error: 'lesson_not_found' };
    if (userRole !== 'admin' && lesson.authorId != null && lesson.authorId !== Number(userId)) {
      return { error: 'unauthorized' };
    }
    const existing = await db.collection('quizzes').findOne({ lesson: numLessonId });
    if (existing) {
      await db.collection('quizzes').updateOne({ id: existing.id }, { $set: { q: questions } });
      return { ok: true, id: existing.id };
    }
    const newQuiz = { id: Date.now(), lesson: numLessonId, q: questions };
    await db.collection('quizzes').insertOne(newQuiz);
    return { ok: true, id: newQuiz.id };
  }
  const data = loadLocal();
  const lesson = data.lessons.find(l => l.id == numLessonId);
  if (!lesson) return { error: 'lesson_not_found' };
  if (userRole !== 'admin' && lesson.authorId != null && lesson.authorId !== Number(userId)) {
    return { error: 'unauthorized' };
  }
  const existing = data.quizzes.find(q => q.lesson == numLessonId);
  if (existing) {
    existing.q = questions;
    saveLocal(data);
    return { ok: true, id: existing.id };
  }
  const newQuiz = { id: Date.now(), lesson: numLessonId, q: questions };
  data.quizzes.push(newQuiz);
  saveLocal(data);
  return { ok: true, id: newQuiz.id };
}

// --- Announcement Operations ---
async function getAnnouncements(limit = 5) {
  const db = getDB();
  if (db) {
    return await db.collection('announcements')
      .find({}, { projection: { _id: 0, text: 1, by: 1 } })
      .sort({ _id: -1 })
      .limit(limit)
      .toArray();
  }
  const data = loadLocal();
  return (data.ann || []).slice(-limit).reverse();
}

async function createAnnouncement(text, by) {
  const annDoc = { text: String(text).slice(0, 300), by };
  const db = getDB();
  if (db) {
    await db.collection('announcements').insertOne({ ...annDoc, createdAt: new Date() });
    return annDoc;
  }
  const data = loadLocal();
  data.ann = data.ann || [];
  data.ann.push(annDoc);
  saveLocal(data);
  return annDoc;
}

// --- Progress Operations ---
async function getProgress(userId) {
  const db = getDB();
  const numericId = Number(userId);
  if (db) {
    try {
      let queries = [{ userId: String(userId) }];
      if (!isNaN(numericId)) queries.push({ userId: numericId });
      const doc = await db.collection('progress').findOne({ $or: queries });
      if (doc) {
        return { l: Array.isArray(doc.l) ? doc.l : [], q: doc.q || {} };
      }
    } catch (e) {
      console.warn('[MongoDB] getProgress error:', e.message);
    }
  }
  const data = loadLocal();
  data.prog = data.prog || {};
  const p = data.prog[String(userId)] || (!isNaN(numericId) && data.prog[numericId]) || { l: [], q: {} };
  return { l: Array.isArray(p.l) ? p.l : [], q: p.q || {} };
}

async function calculateProgressPercentage(userId, targetSubject = null) {
  const [p, user, allLessons] = await Promise.all([
    getProgress(userId),
    findUserById(userId),
    getLessons(),
  ]);

  const userClass = user && user.role === 'student' && user.class ? Number(user.class) : 0;
  const userCurr = user && user.curriculumCode ? user.curriculumCode.toUpperCase() : 'PSEB';
  let relevantLessons = allLessons;

  if (userClass > 0) {
    relevantLessons = relevantLessons.filter(l => Number(l.c) === userClass);
  }

  if (user && user.role === 'student') {
    relevantLessons = relevantLessons.filter(l => !l.curriculumCode || l.curriculumCode.toUpperCase() === userCurr || (userCurr === 'PSEB' && !l.curriculumCode));
  }

  if (targetSubject) {
    const sNorm = String(targetSubject).toLowerCase();
    relevantLessons = relevantLessons.filter(l => String(l.s).toLowerCase() === sNorm);
  }

  const total = relevantLessons.length;
  if (!total) return 0;

  const relevantLessonIds = new Set(relevantLessons.map(l => String(l.id)));
  const completedLessons = (p.l || []).filter(id => relevantLessonIds.has(String(id))).length;

  return Math.round((completedLessons / total) * 100);
}

async function syncProgress(userId, ops) {
  const db = getDB();
  const p = await getProgress(userId);

  const [lessons, quizzes] = await Promise.all([getLessons(), getQuizzes()]);

  // Handle direct state objects like { l: [...], q: {...} }
  if (ops && typeof ops === 'object' && !Array.isArray(ops)) {
    if (Array.isArray(ops.l)) {
      for (const lid of ops.l) {
        const numId = Number(lid) || lid;
        if (!p.l.some(x => String(x) === String(numId))) {
          p.l.push(numId);
        }
      }
    }
    if (ops.q && typeof ops.q === 'object') {
      for (const [qid, sc] of Object.entries(ops.q)) {
        p.q[String(qid)] = Math.max(0, Math.min(100, Number(sc != null ? sc : 0)));
      }
    }
  }

  const opList = Array.isArray(ops) ? ops : (ops && ops.ops ? ops.ops : (ops ? [ops] : []));
  for (const o of opList) {
    if (!o) continue;
    const ty = o.t || o.type;
    const rawId = o.id != null ? o.id : (o.lessonId || o.quizId);
    if (rawId == null) continue;

    if (ty === 'l' || ty === 'lesson') {
      const lessonId = Number(rawId) || rawId;
      if (!p.l.some(x => String(x) === String(lessonId))) {
        p.l.push(lessonId);
      }
    }
    if (ty === 'q' || ty === 'quiz') {
      const quizKey = String(rawId);
      p.q[quizKey] = Math.max(0, Math.min(100, Number(o.score != null ? o.score : o.s) || 0));
      // Auto-complete parent lesson if quiz completed
      const parentQ = quizzes.find(q => String(q.id) === quizKey);
      if (parentQ && parentQ.lesson != null) {
        const parentLId = Number(parentQ.lesson) || parentQ.lesson;
        if (!p.l.some(x => String(x) === String(parentLId))) {
          p.l.push(parentLId);
        }
      }
    }
  }

  // Durable local persistence
  try {
    const data = loadLocal();
    data.prog = data.prog || {};
    data.prog[String(userId)] = { l: p.l, q: p.q };
    if (!isNaN(Number(userId))) {
      data.prog[Number(userId)] = { l: p.l, q: p.q };
    }
    saveLocal(data);
  } catch (err) {
    console.error('[Progress] Local save error:', err.message);
  }

  // MongoDB persistence without $or in upsert
  if (db) {
    try {
      const numericId = Number(userId);
      let queries = [{ userId: String(userId) }];
      if (!isNaN(numericId)) queries.push({ userId: numericId });
      const existingDoc = await db.collection('progress').findOne({ $or: queries });

      const targetUserId = !isNaN(numericId) ? numericId : String(userId);
      if (existingDoc && existingDoc._id) {
        await db.collection('progress').updateOne(
          { _id: existingDoc._id },
          { $set: { userId: targetUserId, l: p.l, q: p.q, updatedAt: new Date() } }
        );
      } else {
        await db.collection('progress').updateOne(
          { userId: targetUserId },
          { $set: { userId: targetUserId, l: p.l, q: p.q, updatedAt: new Date() } },
          { upsert: true }
        );
      }
    } catch (err) {
      console.error('[MongoDB] syncProgress error:', err.message);
    }
  }
  return p;
}

// --- Teacher Dashboard: Student Progress Overview (Scoped by Subject, Class & Curriculum) ---
async function getStudentsWithProgress(targetClass = null, targetCurriculumCode = null, targetSubject = null) {
  const db = getDB();
  const numClass = targetClass != null && Number(targetClass) > 0 ? Number(targetClass) : null;
  const currCode = targetCurriculumCode ? String(targetCurriculumCode).toUpperCase() : null;
  const subj = targetSubject ? String(targetSubject).toLowerCase() : null;

  let students;
  if (db) {
    const query = { role: 'student' };
    if (numClass) {
      query.class = { $in: [numClass, String(numClass)] };
    }
    if (currCode) {
      if (currCode === 'PSEB') {
        query.$or = [
          { curriculumCode: 'PSEB' },
          { curriculumCode: { $exists: false } },
          { curriculumCode: null },
          { curriculumCode: '' }
        ];
      } else {
        query.curriculumCode = currCode;
      }
    }
    students = await db.collection('users').find(query).toArray();
  } else {
    const data = loadLocal();
    students = (data.users || []).filter(u =>
      u.role === 'student' &&
      (!numClass || Number(u.class) === numClass) &&
      (!currCode || (u.curriculumCode || 'PSEB').toUpperCase() === currCode)
    );
  }

  // Fetch relevant lessons and quizzes to isolate progress to targetSubject
  const [allLessons, allQuizzes] = await Promise.all([
    getLessons(),
    getQuizzes(),
  ]);

  // Lessons strictly matching this teacher's subject, class, and curriculum
  const subjectLessons = allLessons.filter(l => {
    const matchCls = !numClass || Number(l.c) === numClass;
    const matchCurr = !currCode || !l.curriculumCode || l.curriculumCode.toUpperCase() === currCode || (currCode === 'PSEB' && !l.curriculumCode);
    const matchSubj = !subj || String(l.s || '').toLowerCase() === subj;
    return matchCls && matchCurr && matchSubj;
  });

  const subjectLessonIdSet = new Set(subjectLessons.map(l => String(l.id)));
  const totalSubjectLessons = subjectLessons.length;

  // Quizzes belonging to this subject's lessons
  const subjectQuizzes = allQuizzes.filter(q => subjectLessonIdSet.has(String(q.lesson)));
  const subjectQuizIdSet = new Set(subjectQuizzes.map(q => String(q.id)));

  return await Promise.all(
    students.map(async u => {
      const prog = await getProgress(u.id);

      // 1. Lessons completed for THIS subject only
      const completedSubjectLessons = (prog.l || []).filter(id => subjectLessonIdSet.has(String(id)));
      const doneCount = completedSubjectLessons.length;

      // 2. Subject progress percentage (0 if teacher has not added lessons yet)
      const subjectPct = totalSubjectLessons > 0 ? Math.round((doneCount / totalSubjectLessons) * 100) : 0;

      // 3. Quiz scores for THIS subject only
      const scores = [];
      for (const [qid, score] of Object.entries(prog.q || {})) {
        if (subjectQuizIdSet.has(String(qid)) && score != null) {
          scores.push(Number(score));
        }
      }
      const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + Number(b || 0), 0) / scores.length) : null;

      return {
        id: u.id,
        username: u.username,
        name: u.name,
        role: u.role,
        class: u.class,
        subject: targetSubject,
        schoolId: u.schoolId || 'SCH_NABHA_01',
        schoolName: u.schoolName || 'Govt Sen Sec School, Nabha',
        curriculumCode: u.curriculumCode || 'PSEB',
        approved: u.approved,
        doneLessons: doneCount,
        totalLessons: totalSubjectLessons,
        p: subjectPct,
        pct: subjectPct,
        progress: {
          l: completedSubjectLessons,
          allDoneCount: (prog.l || []).length,
          q: prog.q,
        },
        avgScore,
      };
    })
  );
}

// --- Curriculum Operations ---
async function getCurricula() {
  const db = getDB();
  if (db) {
    return await db.collection('curricula').find({}, { projection: { _id: 0 } }).toArray();
  }
  const data = loadLocal();
  return data.curricula || [];
}

async function createCurriculum(curr) {
  const db = getDB();
  const code = (curr.code || '').trim().toUpperCase();
  if (!code) return { error: 'invalid_code' };
  if (db) {
    const exists = await db.collection('curricula').findOne({ code });
    if (exists) return { error: 'already_exists' };
    await db.collection('curricula').insertOne(curr);
    return curr;
  }
  const data = loadLocal();
  data.curricula = data.curricula || [];
  if (data.curricula.some(c => c.code === code)) return { error: 'already_exists' };
  data.curricula.push(curr);
  saveLocal(data);
  return curr;
}

async function updateCurriculum(code, updates) {
  const db = getDB();
  const upCode = String(code).trim().toUpperCase();
  if (db) {
    await db.collection('curricula').updateOne({ code: upCode }, { $set: updates });
    return { ok: true };
  }
  const data = loadLocal();
  data.curricula = data.curricula || [];
  const c = data.curricula.find(x => x.code === upCode);
  if (!c) return { error: 'not_found' };
  Object.assign(c, updates);
  saveLocal(data);
  return { ok: true };
}

async function deleteCurriculum(code) {
  const db = getDB();
  const upCode = String(code).trim().toUpperCase();
  if (db) {
    await db.collection('curricula').deleteOne({ code: upCode });
    return { ok: true };
  }
  const data = loadLocal();
  data.curricula = data.curricula || [];
  const idx = data.curricula.findIndex(x => x.code === upCode);
  if (idx === -1) return { error: 'not_found' };
  data.curricula.splice(idx, 1);
  saveLocal(data);
  return { ok: true };
}

// --- School Operations ---
async function getSchools() {
  const db = getDB();
  if (db) {
    return await db.collection('schools').find({}, { projection: { _id: 0 } }).toArray();
  }
  const data = loadLocal();
  return data.schools || [];
}

async function createSchool(school) {
  const db = getDB();
  const schoolId = (school.schoolId || '').trim();
  if (!schoolId) return { error: 'invalid_id' };
  if (db) {
    const exists = await db.collection('schools').findOne({ schoolId });
    if (exists) return { error: 'already_exists' };
    await db.collection('schools').insertOne(school);
    return school;
  }
  const data = loadLocal();
  data.schools = data.schools || [];
  if (data.schools.some(s => s.schoolId === schoolId)) return { error: 'already_exists' };
  data.schools.push(school);
  saveLocal(data);
  return school;
}

async function updateSchool(schoolId, updates) {
  const db = getDB();
  if (db) {
    await db.collection('schools').updateOne({ schoolId }, { $set: updates });
    return { ok: true };
  }
  const data = loadLocal();
  data.schools = data.schools || [];
  const s = data.schools.find(x => x.schoolId === schoolId);
  if (!s) return { error: 'not_found' };
  Object.assign(s, updates);
  saveLocal(data);
  return { ok: true };
}

async function deleteSchool(schoolId) {
  const db = getDB();
  if (db) {
    await db.collection('schools').deleteOne({ schoolId });
    return { ok: true };
  }
  const data = loadLocal();
  data.schools = data.schools || [];
  const idx = data.schools.findIndex(x => x.schoolId === schoolId);
  if (idx === -1) return { error: 'not_found' };
  data.schools.splice(idx, 1);
  saveLocal(data);
  return { ok: true };
}

module.exports = {
  findUserByUsername,
  findUserById,
  createUser,
  getAllUsers,
  approveUser,
  resetPassword,
  updateUserDetails,
  deleteUser,
  getLessons,
  createLesson,
  updateLesson,
  countLessons,
  getQuizzes,
  createOrUpdateQuiz,
  countQuizzes,
  getAnnouncements,
  createAnnouncement,
  getProgress,
  calculateProgressPercentage,
  syncProgress,
  getStudentsWithProgress,
  getCurricula,
  createCurriculum,
  updateCurriculum,
  deleteCurriculum,
  getSchools,
  createSchool,
  updateSchool,
  deleteSchool,
};
