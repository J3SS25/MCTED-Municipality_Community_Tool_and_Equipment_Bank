const db = require('../../db/database');

class AuditRepository {
  async log(action, targetType, targetId, details, user = null, ip = '') {
    const records = await db.find('audit_logs');
    const nextSeq = String(records.length + 1).padStart(5, '0');
    const logId = `AUD-${nextSeq}`;

    const logEntry = {
      logId,
      userId: user ? user.userId : 'SYSTEM',
      userName: user ? `${user.firstName} ${user.lastName}` : 'System Action',
      action,
      targetType,
      targetId: targetId || '',
      details: typeof details === 'object' ? JSON.stringify(details) : String(details),
      ipAddress: ip || '127.0.0.1'
    };

    return await db.insert('audit_logs', logEntry);
  }

  async getAll(limit = 100) {
    const list = await db.find('audit_logs');
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
  }
}

module.exports = new AuditRepository();
