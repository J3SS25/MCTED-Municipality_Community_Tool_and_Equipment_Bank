const crypto = require('crypto');
const db = require('../../db/database');

class ProfileChangeRequestRepository {
  async create(request) {
    return db.insert('profile_change_requests', {
      requestId: crypto.randomUUID(),
      status: 'Pending',
      ...request,
      auditTrail: request.auditTrail || []
    });
  }

  async getById(requestId) {
    return db.findById('profile_change_requests', requestId, 'requestId');
  }

  async getForUser(userId) {
    const requests = await db.find('profile_change_requests', request => request.userId === userId);
    return requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async getAll() {
    const requests = await db.find('profile_change_requests');
    return requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async update(requestId, changes) {
    return db.update('profile_change_requests', requestId, changes, 'requestId');
  }
}

module.exports = new ProfileChangeRequestRepository();
