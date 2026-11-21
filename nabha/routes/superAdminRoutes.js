// Super Admin Routes
// Digital Learning Platform - Nabha | Developed by Piyush and Team
const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const uploadController = require('../controllers/uploadController');
const { auth } = require('../middleware/auth');

router.use(auth('admin'));

// Attachments Moderation
router.post('/lesson/attachment/delete', uploadController.deleteAttachment);

// Curricula CRUD
router.get('/curricula', superAdminController.getCurricula);
router.post('/curricula', superAdminController.createCurriculum);
router.put('/curricula/:code', superAdminController.updateCurriculum);
router.delete('/curricula/:code', superAdminController.deleteCurriculum);

// Schools CRUD
router.get('/schools', superAdminController.getSchools);
router.post('/schools', superAdminController.createSchool);
router.put('/schools/:schoolId', superAdminController.updateSchool);
router.delete('/schools/:schoolId', superAdminController.deleteSchool);

// User Management
router.get('/users', superAdminController.getUsers);
router.post('/approve', superAdminController.approveUser);
router.post('/reset-pass', superAdminController.resetPassword);
router.put('/user/:id', superAdminController.updateUserDetails);
router.delete('/user/:id', superAdminController.deleteUser);

// Announcements
router.post('/announce', superAdminController.createAnnouncement);

module.exports = router;
