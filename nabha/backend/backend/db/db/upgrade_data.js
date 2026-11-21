const fs = require('fs');
const path = require('path');

const rootDataFile = path.resolve(__dirname, '..', 'data.json');
const backendDataFile = path.resolve(__dirname, '..', 'backend', 'data.json');

[rootDataFile, backendDataFile].forEach(p => {
  if (!fs.existsSync(p)) return;
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));

  if (!d.curricula) {
    d.curricula = [
      {
        code: "PSEB",
        name: "Punjab School Education Board",
        description: "Official state curriculum for Punjab state and aided schools.",
        classes: [6, 7, 8, 9, 10, 11, 12],
        subjects: ["Maths", "Science", "English", "Punjabi"],
        createdAt: new Date().toISOString()
      },
      {
        code: "CBSE",
        name: "Central Board of Secondary Education",
        description: "National curriculum following NCERT standards.",
        classes: [6, 7, 8, 9, 10, 11, 12],
        subjects: ["Maths", "Science", "English", "Punjabi"],
        createdAt: new Date().toISOString()
      }
    ];
  }

  if (!d.schools) {
    d.schools = [
      {
        schoolId: "SCH_NABHA_01",
        name: "Govt Sen Sec School, Nabha",
        curriculumCode: "PSEB",
        city: "Nabha",
        state: "Punjab",
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        schoolId: "SCH_NABHA_02",
        name: "Model Senior Secondary School, Nabha",
        curriculumCode: "CBSE",
        city: "Nabha",
        state: "Punjab",
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        schoolId: "SCH_PATIALA_01",
        name: "Govt High School, Patiala",
        curriculumCode: "PSEB",
        city: "Patiala",
        state: "Punjab",
        active: true,
        createdAt: new Date().toISOString()
      }
    ];
  }

  (d.users || []).forEach(u => {
    if (!u.curriculumCode) u.curriculumCode = "PSEB";
    if (u.role === "student" && !u.schoolId) {
      u.schoolId = "SCH_NABHA_01";
      u.schoolName = "Govt Sen Sec School, Nabha";
    }
  });

  (d.lessons || []).forEach(l => {
    if (!l.curriculumCode) l.curriculumCode = "PSEB";
    if (!l.schoolId) l.schoolId = "ALL";
  });

  (d.quizzes || []).forEach(q => {
    if (!q.curriculumCode) q.curriculumCode = "PSEB";
    if (!q.schoolId) q.schoolId = "ALL";
  });

  fs.writeFileSync(p, JSON.stringify(d, null, 2));
  console.log('Successfully upgraded ' + p);
});
