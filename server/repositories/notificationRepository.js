const db = require('../../db/database');

class NotificationRepository {
  async getForUser(userId) {
    const list = await db.find('notifications', n =>
      (n.userId === userId || n.userId === 'ALL') && !(n.dismissedBy || []).includes(userId)
    );
    return list
      .map(n => ({ ...n, isRead: n.isRead || (n.readBy || []).includes(userId) }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getUnreadCount(userId) {
    const list = await db.find('notifications', n =>
      (n.userId === userId || n.userId === 'ALL') &&
      !(n.dismissedBy || []).includes(userId) &&
      !n.isRead &&
      !(n.readBy || []).includes(userId)
    );
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

  async markAsRead(notificationId, userId) {
    const notification = await db.findById('notifications', notificationId, 'notificationId');
    if (!notification || (notification.userId !== userId && notification.userId !== 'ALL')) return false;

    const updates = notification.userId === 'ALL'
      ? { readBy: [...new Set([...(notification.readBy || []), userId])] }
      : { isRead: true };
    return Boolean(await db.update('notifications', notificationId, updates, 'notificationId'));
  }

  async markAllAsRead(userId) {
    const notifications = await db.find('notifications');
    let changed = false;
    for (const notif of notifications) {
      if ((notif.userId === userId || notif.userId === 'ALL') && !notif.isRead) {
        if (notif.userId === 'ALL') {
          notif.readBy = [...new Set([...(notif.readBy || []), userId])];
        } else {
          notif.isRead = true;
        }
        notif.updatedAt = new Date().toISOString();
        changed = true;
      }
    }
    if (changed) {
      await db.save('notifications');
    }
    return true;
  }

  async deleteForUser(notificationId, userId) {
    const notification = await db.findById('notifications', notificationId, 'notificationId');
    if (!notification || (notification.userId !== userId && notification.userId !== 'ALL')) return false;
    if (notification.userId !== 'ALL') return db.delete('notifications', notificationId, 'notificationId');

    const dismissedBy = [...new Set([...(notification.dismissedBy || []), userId])];
    return Boolean(await db.update('notifications', notificationId, { dismissedBy }, 'notificationId'));
  }

  async clearForUser(userId) {
    const notifications = await db.find('notifications', n => n.userId === userId || n.userId === 'ALL');
    for (const notification of notifications) {
      await this.deleteForUser(notification.notificationId, userId);
    }
    return true;
  }
}

module.exports = new NotificationRepository();
