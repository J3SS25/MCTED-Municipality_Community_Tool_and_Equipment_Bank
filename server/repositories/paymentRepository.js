const db = require('../../db/database');

class PaymentRepository {
  async getAll(filters = {}) {
    let list = await db.find('payments');

    if (filters.userId) {
      list = list.filter(p => p.userId === filters.userId);
    }
    if (filters.status && filters.status !== 'All') {
      list = list.filter(p => p.paymentStatus === filters.status);
    }
    if (filters.paymentMethod && filters.paymentMethod !== 'All') {
      list = list.filter(p => p.paymentMethod === filters.paymentMethod);
    }

    return list.sort((a, b) => new Date(b.paymentDate || b.createdAt) - new Date(a.paymentDate || a.createdAt));
  }

  async getById(paymentId) {
    return await db.findById('payments', paymentId, 'paymentId');
  }

  async getByReceiptId(receiptId) {
    return await db.findOne('payments', p => p.receiptId === receiptId);
  }

  async create(data) {
    const records = await db.find('payments');
    const year = new Date().getFullYear();
    const nextSeq = String(records.length + 1).padStart(4, '0');
    const receiptSeq = String(Math.floor(100000 + Math.random() * 900000));
    
    const paymentId = data.paymentId || `PAY-${year}-${nextSeq}`;
    const receiptId = data.receiptId || `OR-${year}-${receiptSeq}`;

    const payment = {
      paymentId,
      receiptId,
      userId: data.userId,
      reservationId: data.reservationId || null,
      rentalId: data.rentalId || null,
      toolId: data.toolId,
      amount: parseFloat(data.amount) || 0,
      referenceNumber: data.referenceNumber || `REF-${Date.now()}`,
      paymentMethod: data.paymentMethod,
      paymentDate: data.paymentDate || new Date().toISOString(),
      paymentStatus: data.paymentStatus || 'Pending',
      proofImage: data.proofImage || '',
      verifiedBy: data.verifiedBy || null,
      verifiedAt: data.verifiedAt || null,
      notes: data.notes || ''
    };

    return await db.insert('payments', payment);
  }

  async update(paymentId, updates) {
    return await db.update('payments', paymentId, updates, 'paymentId');
  }

  async delete(paymentId) {
    return await db.delete('payments', paymentId, 'paymentId');
  }
}

module.exports = new PaymentRepository();
