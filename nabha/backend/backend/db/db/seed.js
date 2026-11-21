// Digital Learning Platform - Nabha | Database Seeding & Migration
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const H = p => crypto.scryptSync(p, 'nabha-salt', 32).toString('hex');
const T = (en, hi, pa) => ({ en, hi, pa });

async function seedDatabase(db) {
  if (!db) {
    return;
  }

  const usersCol = db.collection('users');
  const lessonsCol = db.collection('lessons');
  const quizzesCol = db.collection('quizzes');
  const progressCol = db.collection('progress');
  const annCol = db.collection('announcements');
  const curriculaCol = db.collection('curricula');
  const schoolsCol = db.collection('schools');

  // Ensure unique & compound performance indexes
  await Promise.all([
    usersCol.createIndex({ id: 1 }, { unique: true }).catch(() => {}),
    usersCol.createIndex({ username: 1 }, { unique: true }).catch(() => {}),
    curriculaCol.createIndex({ code: 1 }, { unique: true }).catch(() => {}),
    schoolsCol.createIndex({ schoolId: 1 }, { unique: true }).catch(() => {}),
    schoolsCol.createIndex({ curriculumCode: 1 }).catch(() => {}),
    lessonsCol.createIndex({ id: 1 }, { unique: true }).catch(() => {}),
    lessonsCol.createIndex({ curriculumCode: 1, schoolId: 1, c: 1, s: 1 }).catch(() => {}),
    quizzesCol.createIndex({ id: 1 }, { unique: true }).catch(() => {}),
    quizzesCol.createIndex({ lesson: 1, curriculumCode: 1 }).catch(() => {}),
    progressCol.createIndex({ userId: 1 }, { unique: true }).catch(() => {}),
  ]);

  const userCount = await usersCol.countDocuments();
  if (userCount > 0) {
    return; // Already populated
  }

  const jsonFilePath = path.join(__dirname, '..', 'data.json');
  let migrated = false;

  if (fs.existsSync(jsonFilePath)) {
    try {
      const raw = fs.readFileSync(jsonFilePath, 'utf8');
      const data = JSON.parse(raw);
      console.log('[MongoDB] Found existing data.json. Migrating into MongoDB Atlas...');

      if (Array.isArray(data.users) && data.users.length > 0) {
        await usersCol.insertMany(data.users);
      }

      if (Array.isArray(data.lessons) && data.lessons.length > 0) {
        await lessonsCol.insertMany(data.lessons);
      }

      if (Array.isArray(data.quizzes) && data.quizzes.length > 0) {
        await quizzesCol.insertMany(data.quizzes);
      }

      if (Array.isArray(data.ann) && data.ann.length > 0) {
        const annDocs = data.ann.map(a => ({
          text: a.text,
          by: a.by,
          createdAt: new Date(),
        }));
        await annCol.insertMany(annDocs);
      }

      if (data.prog && typeof data.prog === 'object') {
        const progDocs = Object.entries(data.prog).map(([uid, p]) => ({
          userId: isNaN(uid) ? uid : Number(uid),
          l: Array.isArray(p.l) ? p.l : [],
          q: p.q && typeof p.q === 'object' ? p.q : {},
        }));
        if (progDocs.length > 0) {
          await progressCol.insertMany(progDocs);
        }
      }

      migrated = true;
      console.log('[MongoDB] Migration from data.json completed successfully!');
    } catch (err) {
      console.error('[MongoDB] Migration from data.json failed, falling back to default seed:', err.message);
    }
  }

  if (!migrated) {
    console.log('[MongoDB] Seeding initial default dataset...');
    const U = (id, username, name, role, cls, pw, ap = true) => ({
      id,
      username,
      name,
      role,
      class: cls,
      hash: H(pw),
      approved: ap,
    });

    const defaultUsers = [
      U(1, 'admin', 'Harpreet Singh', 'admin', 0, 'admin123'),
      U(2, 'teacher_manpreet', 'Manpreet Kaur', 'teacher', 0, 'teacher123'),
      U(3, 'teacher_gurdeep', 'Gurdeep Singh', 'teacher', 0, 'teacher123'),
      U(4, 'simran_k', 'Simranjit Kaur', 'student', 8, 'student123'),
      U(5, 'new_student', 'New Student', 'student', 8, 'student123'),
    ];

    const defaultLessons = [
      [1, 'Maths', 6, 'Fractions', 'भिन्न', 'ਭਿੰਨ'],
      [2, 'Maths', 8, 'Algebra Basics', 'बीजगणित की मूल बातें', 'ਬੀਜਗਣਿਤ ਦੀਆਂ ਬੁਨਿਆਦਾਂ'],
      [3, 'Science', 7, 'Photosynthesis', 'प्रकाश संश्लेषण', 'ਪ੍ਰਕਾਸ਼ ਸੰਸ਼ਲੇਸ਼ਣ'],
      [4, 'Science', 8, 'States of Matter', 'पदार्थ की अवस्थाएँ', 'ਪਦਾਰਥ ਦੀਆਂ ਅਵਸਥਾਵਾਂ'],
      [5, 'English', 8, 'Nouns and Verbs', 'संज्ञा और क्रिया', 'ਨਾਂਵ ਅਤੇ ਕਿਰਿਆ'],
      [6, 'Punjabi', 8, 'Punjabi Alphabet', 'पंजाबी वर्णमाला', 'ਪੰਜਾਬੀ ਵਰਣਮਾਲਾ'],
    ].map(([id, s, c, a, b, d]) => ({
      id,
      s,
      c,
      t: T(a, b, d),
      n: { en: 'Read this chapter carefully, then mark it complete and take the quiz.' },
    }));

    const defaultQuizzes = [
      {
        id: 1,
        lesson: 1,
        q: [
          {
            q: T('What is 1/2 + 1/2?', '1/2 + 1/2 कितना होता है?', '1/2 + 1/2 ਕਿੰਨਾ ਹੁੰਦਾ ਹੈ?'),
            o: ['1', '2', '1/4'],
            a: 0,
          },
          {
            q: T('Which is bigger, 1/2 or 1/4?', 'कौन बड़ा है, 1/2 या 1/4?', 'ਕਿਹੜਾ ਵੱਡਾ ਹੈ, 1/2 ਜਾਂ 1/4?'),
            o: ['1/2', '1/4'],
            a: 0,
          },
        ],
      },
      {
        id: 2,
        lesson: 3,
        q: [
          {
            q: T('Plants make food using…', 'पौधे भोजन बनाने के लिए क्या उपयोग करते हैं?', 'ਪੌਦੇ ਭੋਜਨ ਬਣਾਉਣ ਲਈ ਕੀ ਵਰਤਦੇ ਹਨ?'),
            o: [
              T('Sunlight', 'सूर्य का प्रकाश', 'ਸੂਰਜ ਦੀ ਰੌਸ਼ਨੀ'),
              T('Sand', 'रेत', 'ਰੇਤ'),
            ],
            a: 0,
          },
          {
            q: T('What do plants release?', 'पौधे क्या छोड़ते हैं?', 'ਪੌਦੇ ਕੀ ਛੱਡਦੇ ਹਨ?'),
            o: [
              T('Oxygen', 'ऑक्सीजन', 'ਆਕਸੀਜਨ'),
              T('Smoke', 'धुआँ', 'ਧੂੰਆਂ'),
            ],
            a: 0,
          },
        ],
      },
    ];

    const defaultProgress = [
      {
        userId: 4,
        l: [1, 2],
        q: { 1: 100 },
      },
    ];

    const defaultAnnouncements = [
      {
        text: 'Welcome to the Nabha Digital Learning Platform!',
        by: 'Nabha Learning Platform',
        createdAt: new Date(),
      },
    ];

    await usersCol.insertMany(defaultUsers);
    await lessonsCol.insertMany(defaultLessons);
    await quizzesCol.insertMany(defaultQuizzes);
    await progressCol.insertMany(defaultProgress);
    await annCol.insertMany(defaultAnnouncements);
    console.log('[MongoDB] Default data seed completed successfully!');
  }
}

module.exports = {
  seedDatabase,
  H,
  T,
};
