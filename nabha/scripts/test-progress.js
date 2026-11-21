// Test Student Completion -> Teacher Dashboard Real-time Progress Reflection
// Digital Learning Platform - Nabha | PS019
const assert = require('assert');
const path = require('path');

async function run() {
  console.log('--- Starting Student-Teacher Progress Flow Test ---');
  const db = require('../db');
  const studentCtrl = require('../controllers/studentController');
  const teacherCtrl = require('../controllers/teacherController');

  const testStudentId = 99988877;
  const testStudent = {
    id: testStudentId,
    username: 'test_student_sync',
    name: 'Test Student Sync',
    role: 'student',
    class: 8,
    schoolId: 'SCH_NABHA_01',
    schoolName: 'Govt Sen Sec School, Nabha',
    curriculumCode: 'PSEB',
    hash: 'dummyhash',
    approved: true
  };

  // 1. Create or ensure test student in db
  await db.createUser(testStudent);
  console.log('✓ Test student created:', testStudent.username);

  // 2. Clear progress for clean test
  await db.syncProgress(testStudentId, []);
  let pInit = await db.getProgress(testStudentId);
  console.log('Initial progress:', pInit);

  // 3. Simulate frontend sync call with { ops: [ { t: 'l', id: 4 } ] } (Lesson 4 is Class 8 Science)
  const mockReq = {
    u: testStudent,
    body: {
      ops: [
        { t: 'l', type: 'l', id: 4, score: undefined, u: testStudentId, at: Date.now() }
      ]
    }
  };

  let responseData = null;
  const mockRes = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      responseData = data;
      return this;
    }
  };

  await studentCtrl.syncProgress(mockReq, mockRes);
  console.log('Sync response:', responseData);
  assert.strictEqual(responseData.ok, true, 'Sync response must have ok: true');
  assert(responseData.progress.l.includes(4), 'Progress.l must include lesson 4');

  // 4. Verify Teacher Dashboard for Science Teacher (Class 8, PSEB, Science)
  const scienceTeacherReq = {
    u: {
      id: 888777,
      role: 'teacher',
      class: 8,
      curriculumCode: 'PSEB',
      subject: 'Science'
    }
  };
  let scienceTeacherResData = null;
  const scienceTeacherRes = {
    json: function(data) {
      scienceTeacherResData = data;
      return this;
    }
  };

  await teacherCtrl.getCurriculumStudents(scienceTeacherReq, scienceTeacherRes);
  const foundInScience = scienceTeacherResData.find(s => s.id === testStudentId || s.username === testStudent.username);
  console.log('Found in Science teacher dashboard:', foundInScience);
  assert(foundInScience, 'Student must appear in Science teacher dashboard');
  assert.strictEqual(foundInScience.doneLessons, 1, 'Science teacher should see 1 completed lesson');
  assert(foundInScience.p > 0, 'Science progress percentage must be > 0%');

  // 5. Verify Teacher Dashboard for Maths Teacher (Class 8, PSEB, Maths)
  const mathsTeacherReq = {
    u: {
      id: 888666,
      role: 'teacher',
      class: 8,
      curriculumCode: 'PSEB',
      subject: 'Maths'
    }
  };
  let mathsTeacherResData = null;
  const mathsTeacherRes = {
    json: function(data) {
      mathsTeacherResData = data;
      return this;
    }
  };

  await teacherCtrl.getCurriculumStudents(mathsTeacherReq, mathsTeacherRes);
  const foundInMaths = mathsTeacherResData.find(s => s.id === testStudentId || s.username === testStudent.username);
  console.log('Found in Maths teacher dashboard:', foundInMaths);
  assert(foundInMaths, 'Student must appear in Maths teacher dashboard');
  assert.strictEqual(foundInMaths.doneLessons, 0, 'Maths teacher should see 0 completed lessons because lesson 4 is Science');
  assert.strictEqual(foundInMaths.p, 0, 'Maths teacher should see 0% progress, NOT 100%');

  console.log('\n=============================================');
  console.log('ALL TESTS PASSED: Student -> Teacher Progress flow is 100% verified and subject-scoped!');
  console.log('=============================================');
  process.exit(0);
}

run().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
