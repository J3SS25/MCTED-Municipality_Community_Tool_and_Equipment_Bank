const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/stats', dashboardController.getStats);
router.get('/export', requireAuth, requireAdmin, dashboardController.exportData);

module.exports = router;
