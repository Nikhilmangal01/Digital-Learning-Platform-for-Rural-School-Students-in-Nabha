// Auth Routes
// Digital Learning Platform - Nabha | Developed by Piyush and Team
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');

router.get('/config', authController.getConfig);
router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/me', auth(), authController.getMe);

module.exports = router;
