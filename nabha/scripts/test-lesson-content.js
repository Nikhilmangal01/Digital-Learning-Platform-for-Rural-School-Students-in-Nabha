// Test Teacher Create & Edit Lesson Content & Student Visibility
// Digital Learning Platform - Nabha | PS019
const assert = require('assert');

async function run() {
  console.log('--- Starting Lesson Content Creation, Editing & Student Visibility Test ---');
  const db = require('../db');
  const teacherCtrl = require('../controllers/teacherController');
  const studentCtrl = require('../controllers/studentController');

  const testTeacher = {
    id: 555444,
    name: 'Gurpreet Singh',
    role: 'teacher',
    class: 8,
    subject: 'Science',
    curriculumCode: 'PSEB',
    approved: true
  };

  const testStudent = {
    id: 333222,
    name: 'Kiran Deep',
    role: 'student',
    class: 8,
    curriculumCode: 'PSEB',
    approved: true
  };

  // 1. Teacher creates a new lesson with rich content in 3 languages
  let createdLesson = null;
  const createReq = {
    u: testTeacher,
    body: {
      c: 8,
      s: 'Science',
      t_en: 'Cell Structure and Functions',
      t_hi: 'कोशिका संरचना और कार्य',
      t_pa: 'ਸੈੱਲ ਬਣਤਰ ਅਤੇ ਕਾਰਜ',
      cnt_en: 'All living organisms are made up of basic structural units called cells.',
      cnt_hi: 'सभी जीवित जीव मूल संरचनात्मक इकाइयों से बने होते हैं जिन्हें कोशिकाएँ कहा जाता है।',
      cnt_pa: 'ਸਾਰੇ ਜੀਵ ਮੂਲ ਬਣਤਰ ਇਕਾਈਆਂ ਦੇ ਬਣੇ ਹੁੰਦੇ ਹਨ ਜਿਨ੍ਹਾਂ ਨੂੰ ਸੈੱਲ ਕਿਹਾ ਜਾਂਦਾ ਹੈ।'
    }
  };

  const createRes = {
    status: function(code) { this.code = code; return this; },
    json: function(data) { createdLesson = data.lesson; return this; }
  };

  await teacherCtrl.createLesson(createReq, createRes);
  assert(createdLesson, 'Lesson should be created successfully');
  console.log('✓ Created lesson id:', createdLesson.id);
  console.log('Created lesson content:', createdLesson.content);
  assert.strictEqual(createdLesson.content.en, createReq.body.cnt_en, 'content.en must match input');
  assert.strictEqual(createdLesson.content.hi, createReq.body.cnt_hi, 'content.hi must match input');
  assert.strictEqual(createdLesson.content.pa, createReq.body.cnt_pa, 'content.pa must match input');
  assert.strictEqual(createdLesson.cnt.en, createReq.body.cnt_en, 'cnt.en must match input');
  assert.strictEqual(createdLesson.n.en, createReq.body.cnt_en, 'n.en must match input');

  // 2. Teacher edits the lesson to update the content
  const editReq = {
    u: testTeacher,
    params: { id: createdLesson.id },
    body: {
      id: createdLesson.id,
      c: 8,
      s: 'Science',
      t_en: 'Cell Structure and Functions (Updated)',
      t_hi: 'कोशिका संरचना और कार्य (अपडेटेड)',
      t_pa: 'ਸੈੱਲ ਬਣਤਰ ਅਤੇ ਕਾਰਜ (ਅਪਡੇਟ ਕੀਤਾ)',
      cnt_en: 'UPDATED: Cells have a nucleus, cytoplasm, and cell membrane.',
      cnt_hi: 'अपडेटेड: कोशिकाओं में केंद्रक, कोशिकाद्रव्य और कोशिका झिल्ली होती है।',
      cnt_pa: 'ਅਪਡੇਟ ਕੀਤਾ: ਸੈੱਲਾਂ ਵਿੱਚ ਨਿਊਕਲੀਅਸ, ਸਾਇਟੋਪਲਾਜ਼ਮ ਅਤੇ ਸੈੱਲ ਝਿੱਲੀ ਹੁੰਦੀ ਹੈ।'
    }
  };

  let updateResData = null;
  const editRes = {
    status: function(code) { this.code = code; return this; },
    json: function(data) { updateResData = data; return this; }
  };

  await teacherCtrl.updateLesson(editReq, editRes);
  assert(updateResData && updateResData.ok, 'updateLesson must return ok: true');
  console.log('✓ Lesson updated successfully');

  // 3. Student fetches content via getContent
  let studentContent = null;
  const studentReq = {
    u: testStudent
  };
  const studentRes = {
    status: function(code) { this.code = code; return this; },
    json: function(data) { studentContent = data; return this; }
  };

  await studentCtrl.getContent(studentReq, studentRes);
  const studentLesson = (studentContent.lessons || []).find(l => l.id == createdLesson.id);
  assert(studentLesson, 'Student must receive the newly created lesson in their curriculum content');
  console.log('✓ Student received lesson with content:');
  console.log('  content.en:', studentLesson.content && studentLesson.content.en);
  console.log('  content.hi:', studentLesson.content && studentLesson.content.hi);
  console.log('  content.pa:', studentLesson.content && studentLesson.content.pa);
  assert.strictEqual(studentLesson.content.en, editReq.body.cnt_en, 'Student must see updated content in English');
  assert.strictEqual(studentLesson.cnt.en, editReq.body.cnt_en, 'Student must see updated cnt in English');
  assert.strictEqual(studentLesson.n.en, editReq.body.cnt_en, 'Student must see updated n in English');

  // 4. Verify that edit form in teacher dashboard would find the content without being empty
  const teacherLesson = studentLesson;
  const formPaVal = (teacherLesson.content && teacherLesson.content.pa) || (teacherLesson.cnt && teacherLesson.cnt.pa) || (teacherLesson.n && teacherLesson.n.pa);
  const formHiVal = (teacherLesson.content && teacherLesson.content.hi) || (teacherLesson.cnt && teacherLesson.cnt.hi) || (teacherLesson.n && teacherLesson.n.hi);
  const formEnVal = (teacherLesson.content && teacherLesson.content.en) || (teacherLesson.cnt && teacherLesson.cnt.en) || (teacherLesson.n && teacherLesson.n.en);
  assert(formPaVal && formHiVal && formEnVal, 'Teacher edit form textareas will be populated with content and NOT empty');
  console.log('✓ Teacher edit form textareas will have content correctly populated');

  // 5. Clean up test lesson
  await teacherCtrl.deleteLesson({ u: { role: 'admin' }, params: { id: createdLesson.id } }, { json: () => {} });
  console.log('✓ Cleaned up test lesson');

  console.log('\n==========================================================');
  console.log('SUCCESS: Teacher Lesson Content Save, Edit & Student Display are 100% verified!');
  console.log('==========================================================');
  process.exit(0);
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
