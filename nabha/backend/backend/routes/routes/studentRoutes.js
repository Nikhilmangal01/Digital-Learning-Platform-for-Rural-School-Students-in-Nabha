// Student & Learning Content Routes
// Digital Learning Platform - Nabha | Developed by Piyush and Team
const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { auth } = require('../middleware/auth');

router.get('/content', auth(), studentController.getContent);
router.get('/progress', auth(), studentController.getProgress);
router.post('/sync', auth(), studentController.syncProgress);
router.get('/announcements', studentController.getAnnouncements);

module.exports = router;
