const db = require('../../db/database');

class UserRepository {
  async getAll() {
    return await db.find('users');
  }

  async getById(userId) {
    return await db.findById('users', userId, 'userId');
  }

  async getByEmail(email) {
    if (!email) return null;
    return await db.findOne('users', (u) => u.email.toLowerCase() === email.toLowerCase());
  }

  async create(userData) {
    const records = await db.find('users');
    const nextSeq = String(records.length + 1).padStart(4, '0');
    const year = new Date().getFullYear();
    const userId = userData.userId || `USR-${year}-${nextSeq}`;

    const user = {
      userId,
      firstName: userData.firstName,
      middleName: userData.middleName || '',
      lastName: userData.lastName,
      birthday: userData.birthday,
      age: parseInt(userData.age, 10) || 0,
      contactNumber: userData.contactNumber,
      houseNumber: userData.houseNumber,
      street: userData.street,
      barangay: userData.barangay,
      email: userData.email.toLowerCase().trim(),
      passwordHash: userData.passwordHash,
      role: userData.role || 'Borrower',
      status: userData.status || 'Active',
      avatar: userData.avatar || '',
      failedLoginAttempts: 0,
      lockedUntil: null
    };

    return await db.insert('users', user);
  }

  async update(userId, updates) {
    return await db.update('users', userId, updates, 'userId');
  }

  async delete(userId) {
    return await db.delete('users', userId, 'userId');
  }

  async incrementFailedAttempts(userId) {
    const user = await this.getById(userId);
    if (!user) return;
    const attempts = (user.failedLoginAttempts || 0) + 1;
    const updates = { failedLoginAttempts: attempts };
    if (attempts >= 5) {
      // Lock account for 15 minutes
      updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    }
    return await this.update(userId, updates);
  }

  async resetFailedAttempts(userId) {
    return await this.update(userId, { failedLoginAttempts: 0, lockedUntil: null });
  }
}

module.exports = new UserRepository();
