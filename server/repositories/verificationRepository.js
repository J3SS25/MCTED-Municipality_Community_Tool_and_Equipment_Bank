const crypto = require('crypto');
const db = require('../../db/database');

class VerificationRepository {
  hashCode(code) {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  async issue(email, purpose, code) {
    await this.deleteForEmail(email, purpose);
    return db.insert('auth_verifications', {
      verificationId: crypto.randomUUID(),
      email: email.toLowerCase().trim(),
      purpose,
      codeHash: this.hashCode(code),
      attempts: 0,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    });
  }

  async consume(email, purpose, code) {
    const normalizedEmail = email.toLowerCase().trim();
    const verification = await db.findOne(
      'auth_verifications',
      item => item.email === normalizedEmail && item.purpose === purpose
    );
    if (!verification) return false;

    if (new Date(verification.expiresAt) <= new Date() || verification.attempts >= 5) {
      await db.delete('auth_verifications', verification.verificationId, 'verificationId');
      return false;
    }

    const submittedHash = Buffer.from(this.hashCode(code), 'hex');
    const storedHash = Buffer.from(verification.codeHash, 'hex');
    const matches = submittedHash.length === storedHash.length
      && crypto.timingSafeEqual(submittedHash, storedHash);

    if (!matches) {
      const attempts = verification.attempts + 1;
      if (attempts >= 5) {
        await db.delete('auth_verifications', verification.verificationId, 'verificationId');
      } else {
        await db.update(
          'auth_verifications',
          verification.verificationId,
          { attempts },
          'verificationId'
        );
      }
      return false;
    }

    await db.delete('auth_verifications', verification.verificationId, 'verificationId');
    return true;
  }

  async deleteForEmail(email, purpose) {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await db.find(
      'auth_verifications',
      item => item.email === normalizedEmail && item.purpose === purpose
    );
    await Promise.all(existing.map(item =>
      db.delete('auth_verifications', item.verificationId, 'verificationId')
    ));
  }
}

module.exports = new VerificationRepository();
