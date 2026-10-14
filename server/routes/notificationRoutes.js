const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/auth');

router.get('/my', requireAuth, notificationController.getMyNotifications);
router.delete('/my', requireAuth, notificationController.clearNotifications);
router.put('/:id/read', requireAuth, notificationController.markRead);
router.delete('/:id', requireAuth, notificationController.deleteNotification);
router.put('/read-all', requireAuth, notificationController.markAllRead);

module.exports = router;
