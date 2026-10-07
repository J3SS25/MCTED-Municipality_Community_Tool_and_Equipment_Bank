const notificationRepository = require('../repositories/notificationRepository');

class NotificationController {
  // Get notifications for current user
  async getMyNotifications(req, res) {
    try {
      const list = await notificationRepository.getForUser(req.user.userId);
      const unreadCount = await notificationRepository.getUnreadCount(req.user.userId);
      res.json({ success: true, unreadCount, notifications: list.slice(0, 30) });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Mark single as read
  async markRead(req, res) {
    try {
      const { id } = req.params;
      await notificationRepository.markAsRead(id);
      res.json({ success: true, message: 'Notification marked as read.' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Mark all as read
  async markAllRead(req, res) {
    try {
      await notificationRepository.markAllAsRead(req.user.userId);
      res.json({ success: true, message: 'All notifications marked as read.' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new NotificationController();
