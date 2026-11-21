// Public Metadata Routes
// Digital Learning Platform - Nabha | Developed by Piyush and Team
const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

router.get('/schools', publicController.getPublicSchools);
router.get('/curricula', publicController.getPublicCurricula);

module.exports = router;
