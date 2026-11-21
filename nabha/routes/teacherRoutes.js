// Teacher Routes
// Digital Learning Platform - Nabha | Developed by Piyush and Team
const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const uploadController = require('../controllers/uploadController');
const { auth } = require('../middleware/auth');

router.use(auth('teacher', 'admin'));

router.post('/curriculum', teacherController.setCurriculum);
router.post('/upload', uploadController.uploadFile);
router.post('/lesson/attachment/add', uploadController.addAttachment);
router.post('/lesson/attachment/delete', uploadController.deleteAttachment);
router.post('/lesson', teacherController.createLesson);
router.post('/lesson/update', (req, res) => {
  req.params.id = req.params.id || req.body.id;
  teacherController.updateLesson(req, res);
});
router.post('/lesson/delete', (req, res) => {
  req.params.id = req.params.id || req.body.id || req.query.id;
  teacherController.deleteLesson(req, res);
});
router.put('/lesson/:id', teacherController.updateLesson);
router.delete('/lesson/:id', teacherController.deleteLesson);
router.post('/quiz', teacherController.createOrUpdateQuiz);
router.get('/students', teacherController.getCurriculumStudents);

module.exports = router;
