const crypto = require('crypto');
const db = require('../../db/database');

class SessionRepository {
  async create(session) {
    const { token, ...sessionData } = session;
    return db.insert('sessions', {
      ...sessionData,
      tokenHash: this.hashToken(token)
    });
  }

  async getByToken(token) {
    const tokenHash = this.hashToken(token);
    return db.findOne('sessions', session => session.tokenHash === tokenHash);
  }

  async delete(sessionId) {
    return db.delete('sessions', sessionId, 'sessionId');
  }

  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

module.exports = new SessionRepository();
