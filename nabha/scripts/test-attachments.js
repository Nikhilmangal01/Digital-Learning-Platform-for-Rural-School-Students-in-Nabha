// Test Lesson Notes Attachments (Images, PDFs, Drive Link) & Admin Deletion
// Digital Learning Platform - Nabha | PS019
const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log('--- Starting Notes Attachments (Image, PDF, Drive Link) & Admin Moderation Test ---');
  const db = require('../db');
  const teacherCtrl = require('../controllers/teacherController');
  const studentCtrl = require('../controllers/studentController');
  const uploadCtrl = require('../controllers/uploadController');

  const testTeacher = {
    id: 777666,
    name: 'Harman Singh',
    role: 'teacher',
    class: 8,
    subject: 'Science',
    curriculumCode: 'PSEB',
    approved: true
  };

  const testStudent = {
    id: 555333,
    name: 'Navjot Kaur',
    role: 'student',
    class: 8,
    curriculumCode: 'PSEB',
    approved: true
  };

  const testAdmin = {
    id: 1,
    name: 'Super Admin',
    role: 'admin',
    approved: true
  };

  // 1. Upload a simulated Image file
  const dummyImageBase64 = Buffer.from('fake-png-image-binary-data').toString('base64');
  let uploadImgRes = null;
  await uploadCtrl.uploadFile({
    u: testTeacher,
    body: {
      filename: 'cell_diagram.png',
      data: dummyImageBase64,
      title: 'Cell Diagram Note'
    }
  }, {
    status: function() { return this; },
    json: function(data) { uploadImgRes = data; return this; }
  });

  assert(uploadImgRes && uploadImgRes.ok, 'Image upload must succeed');
  assert.strictEqual(uploadImgRes.attachment.type, 'image', 'Uploaded type must be image');
  assert(fs.existsSync(path.join(__dirname, '..', uploadImgRes.attachment.url)), 'Physical image file must exist on disk');
  console.log('✓ Image uploaded successfully:', uploadImgRes.attachment.url);

  // 2. Upload a simulated PDF notes file
  const dummyPdfBase64 = Buffer.from('%PDF-1.4 dummy-pdf-content-for-testing').toString('base64');
  let uploadPdfRes = null;
  await uploadCtrl.uploadFile({
    u: testTeacher,
    body: {
      filename: 'cell_theory_handwritten_notes.pdf',
      data: dummyPdfBase64,
      title: 'Cell Theory Complete Study Notes'
    }
  }, {
    status: function() { return this; },
    json: function(data) { uploadPdfRes = data; return this; }
  });

  assert(uploadPdfRes && uploadPdfRes.ok, 'PDF upload must succeed');
  assert.strictEqual(uploadPdfRes.attachment.type, 'pdf', 'Uploaded type must be pdf');
  assert(fs.existsSync(path.join(__dirname, '..', uploadPdfRes.attachment.url)), 'Physical PDF file must exist on disk');
  console.log('✓ PDF uploaded successfully:', uploadPdfRes.attachment.url);

  // 3. Teacher creates a lesson attaching the Image, PDF and a Google Drive Link
  let createdLesson = null;
  const driveUrl = 'https://drive.google.com/drive/folders/sample-nabha-notes-123';
  await teacherCtrl.createLesson({
    u: testTeacher,
    body: {
      c: 8,
      s: 'Science',
      t_en: 'Cell Biology Notes & Resources',
      t_hi: 'कोशिका जीवविज्ञान नोट्स और संसाधन',
      t_pa: 'ਸੈੱਲ ਜੀਵ ਵਿਗਿਆਨ ਨੋਟਸ ਅਤੇ ਸਰੋਤ',
      cnt_en: 'Review the attached diagram, PDF notes and Google drive resources below.',
      driveLink: driveUrl,
      attachments: [
        uploadImgRes.attachment,
        uploadPdfRes.attachment,
        {
          id: 'att_link_test',
          type: 'link',
          driveLink: driveUrl,
          url: driveUrl,
          title: 'Google Drive Science Folder',
          filename: 'Google Drive Resource',
          uploadedAt: new Date().toISOString()
        }
      ]
    }
  }, {
    status: function() { return this; },
    json: function(data) { createdLesson = data.lesson; return this; }
  });

  assert(createdLesson, 'Lesson with attachments must be created');
  assert.strictEqual(createdLesson.attachments.length, 3, 'Lesson should have 3 attachments');
  assert.strictEqual(createdLesson.driveLink, driveUrl, 'Lesson should have driveLink');
  console.log('✓ Lesson created with 3 attachments (1 image, 1 pdf, 1 drive link):', createdLesson.id);

  // 4. Student fetches content via getContent
  let studentContent = null;
  await studentCtrl.getContent({ u: testStudent }, {
    status: function() { return this; },
    json: function(data) { studentContent = data; return this; }
  });

  const studentLesson = (studentContent.lessons || []).find(l => l.id == createdLesson.id);
  assert(studentLesson, 'Student must receive the lesson in content API');
  assert(studentLesson.attachments && studentLesson.attachments.length === 3, 'Student must see all 3 attachments');
  assert.strictEqual(studentLesson.driveLink, driveUrl, 'Student must see the drive link');
  console.log('✓ Student verified: Can access image, PDF (offline downloadable) and Google Drive link');

  // 5. Admin moderates / deletes the PDF attachment
  const pdfFilePath = path.join(__dirname, '..', uploadPdfRes.attachment.url);
  assert(fs.existsSync(pdfFilePath), 'PDF file must exist before deletion');

  let adminDeleteRes = null;
  await uploadCtrl.deleteAttachment({
    u: testAdmin,
    body: {
      lessonId: createdLesson.id,
      attachmentId: uploadPdfRes.attachment.id
    }
  }, {
    status: function() { return this; },
    json: function(data) { adminDeleteRes = data; return this; }
  });

  assert(adminDeleteRes && adminDeleteRes.ok, 'Admin deletion must succeed');
  assert(!fs.existsSync(pdfFilePath), 'Physical PDF file should be unlinked/deleted from disk');

  // Verify DB no longer has the PDF attachment
  const updatedLessons = await db.getLessons();
  const verifiedLesson = updatedLessons.find(l => l.id == createdLesson.id);
  assert.strictEqual(verifiedLesson.attachments.length, 2, 'Lesson should now only have 2 attachments left');
  assert(!verifiedLesson.attachments.some(a => a.id === uploadPdfRes.attachment.id), 'PDF attachment must be deleted from lesson');
  console.log('✓ Admin moderation verified: Successfully deleted PDF attachment and unlinked physical file');

  // 6. Clean up test lesson and image file
  const imgFilePath = path.join(__dirname, '..', uploadImgRes.attachment.url);
  if (fs.existsSync(imgFilePath)) fs.unlinkSync(imgFilePath);
  await teacherCtrl.deleteLesson({ u: { role: 'admin' }, params: { id: createdLesson.id } }, { json: () => {} });
  console.log('✓ Cleaned up test data');

  console.log('\n========================================================================');
  console.log('ALL TESTS PASSED: Notes Attachments (Image, PDF, Drive Link) & Admin Moderation Verified 100%!');
  console.log('========================================================================');
  process.exit(0);
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
