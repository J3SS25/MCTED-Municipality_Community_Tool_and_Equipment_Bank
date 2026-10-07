const db = require('../../db/database');

class NotificationRepository {
  async getForUser(userId) {
    let list = await db.find('notifications', n => n.userId === userId || n.userId === 'ALL');
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async getUnreadCount(userId) {
    const list = await db.find('notifications', n => (n.userId === userId || n.userId === 'ALL') && !n.isRead);
    return list.length;
  }

  async create(data) {
    const records = await db.find('notifications');
    const nextSeq = String(records.length + 1).padStart(5, '0');
    const notificationId = data.notificationId || `NOTIF-${nextSeq}`;

    const item = {
      notificationId,
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type || 'info', // info, success, warning, danger
      link: data.link || '',
      isRead: false
    };

    return await db.insert('notifications', item);
  }

  async markAsRead(notificationId) {
    return await db.update('notifications', notificationId, { isRead: true }, 'notificationId');
  }

  async markAllAsRead(userId) {
    const notifications = await db.find('notifications');
    let changed = false;
    for (const notif of notifications) {
      if ((notif.userId === userId || notif.userId === 'ALL') && !notif.isRead) {
        notif.isRead = true;
        notif.updatedAt = new Date().toISOString();
        changed = true;
      }
    }
    if (changed) {
      await db.save('notifications');
    }
    return true;
  }
}

module.exports = new NotificationRepository();
