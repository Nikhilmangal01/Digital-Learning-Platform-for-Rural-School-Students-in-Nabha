// Teacher Routes
// Digital Learning Platform - Nabha | Developed by Piyush and Team
const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { auth } = require('../middleware/auth');

router.use(auth('teacher', 'admin'));

router.post('/curriculum', teacherController.setCurriculum);
router.post('/lesson', teacherController.createLesson);
router.put('/lesson/:id', teacherController.updateLesson);
router.delete('/lesson/:id', teacherController.deleteLesson);
router.post('/quiz', teacherController.createOrUpdateQuiz);
router.get('/students', teacherController.getCurriculumStudents);

module.exports = router;
