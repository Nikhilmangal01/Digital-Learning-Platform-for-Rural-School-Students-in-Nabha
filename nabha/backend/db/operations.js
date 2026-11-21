// Digital Learning Platform - Nabha | Database Operations (MongoDB Atlas with fallback)
const fs = require('fs');
const path = require('path');
const { getDB } = require('./connection');

const rootDataFile = path.resolve(__dirname, '..', '..', 'data.json');
const backendDataFile = path.resolve(__dirname, '..', 'data.json');

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
async function getLessons() {
  const db = getDB();
  if (db) {
    return await db.collection('lessons').find({}, { projection: { _id: 0 } }).toArray();
  }
  const data = loadLocal();
  return data.lessons;
}

async function createLesson(lesson) {
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
  if (db) {
    const lesson = await db.collection('lessons').findOne({ id: numericId });
    if (!lesson) return { error: 'not_found' };
    if (userRole !== 'admin' && lesson.authorId != null && lesson.authorId !== Number(userId)) {
      return { error: 'unauthorized' };
    }
    await db.collection('lessons').updateOne(
      { id: numericId },
      { $set: updateData }
    );
    return { ok: true };
  }
  const data = loadLocal();
  const lesson = data.lessons.find(l => l.id == id);
  if (!lesson) return { error: 'not_found' };
  if (userRole !== 'admin' && lesson.authorId != null && lesson.authorId !== Number(userId)) {
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
async function getQuizzes() {
  const db = getDB();
  if (db) {
    return await db.collection('quizzes').find({}, { projection: { _id: 0 } }).toArray();
  }
  const data = loadLocal();
  return data.quizzes;
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

async function calculateProgressPercentage(userId) {
  const [p, user, allLessons] = await Promise.all([
    getProgress(userId),
    findUserById(userId),
    getLessons(),
  ]);

  const userClass = user && user.role === 'student' && user.class ? Number(user.class) : 0;
  let relevantLessons = allLessons;

  if (userClass > 0) {
    relevantLessons = allLessons.filter(l => Number(l.c) === userClass);
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
  const validLessonIds = new Set(lessons.map(l => String(l.id)));
  const validQuizIds = new Set(quizzes.map(q => String(q.id)));

  const opList = Array.isArray(ops) ? ops : (ops ? [ops] : []);
  for (const o of opList) {
    if (!o) continue;
    const ty = o.t || o.type;
    const rawId = o.id != null ? o.id : (o.lessonId || o.quizId);
    if (rawId == null) continue;

    if ((ty === 'l' || ty === 'lesson') && (validLessonIds.has(String(rawId)) || validLessonIds.size === 0)) {
      const lessonId = Number(rawId) || rawId;
      if (!p.l.some(x => String(x) === String(lessonId))) {
        p.l.push(lessonId);
      }
    }
    if ((ty === 'q' || ty === 'quiz') && (validQuizIds.has(String(rawId)) || validQuizIds.size === 0)) {
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

// --- Teacher Dashboard: Student Progress Overview ---
async function getStudentsWithProgress(targetClass = null) {
  const db = getDB();
  const numClass = targetClass != null && Number(targetClass) > 0 ? Number(targetClass) : null;
  let students;
  if (db) {
    const query = { role: 'student' };
    if (numClass) {
      query.class = numClass;
    }
    students = await db.collection('users').find(query).toArray();
  } else {
    const data = loadLocal();
    students = (data.users || []).filter(u => u.role === 'student' && (!numClass || Number(u.class) === numClass));
  }

  return await Promise.all(
    students.map(async u => {
      const prog = await getProgress(u.id);
      const pct = await calculateProgressPercentage(u.id);
      const scores = Object.values(prog.q || {});
      const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + Number(b || 0), 0) / scores.length) : null;
      return {
        id: u.id,
        username: u.username,
        name: u.name,
        role: u.role,
        class: u.class,
        approved: u.approved,
        p: pct,
        pct: pct,
        progress: prog,
        avgScore,
      };
    })
  );
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
};
