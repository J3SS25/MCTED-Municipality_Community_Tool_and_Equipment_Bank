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
      const updated = await notificationRepository.markAsRead(id, req.user.userId);
      if (!updated) return res.status(404).json({ success: false, message: 'Notification not found.' });
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

  async deleteNotification(req, res) {
    try {
      const deleted = await notificationRepository.deleteForUser(req.params.id, req.user.userId);
      if (!deleted) return res.status(404).json({ success: false, message: 'Notification not found.' });
      res.json({ success: true, message: 'Notification deleted.' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async clearNotifications(req, res) {
    try {
      await notificationRepository.clearForUser(req.user.userId);
      res.json({ success: true, message: 'Notifications cleared.' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new NotificationController();
