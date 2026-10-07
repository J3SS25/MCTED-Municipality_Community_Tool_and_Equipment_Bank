const db = require('../../db/database');

class ReservationRepository {
  async getAll(filters = {}) {
    let list = await db.find('reservations');

    if (filters.userId) {
      list = list.filter(r => r.userId === filters.userId);
    }
    if (filters.toolId) {
      list = list.filter(r => r.toolId === filters.toolId);
    }
    if (filters.status && filters.status !== 'All') {
      list = list.filter(r => r.status === filters.status);
    }

    // Sort by createdAt descending
    return list.sort((a, b) => new Date(b.createdAt || b.reservationDate) - new Date(a.createdAt || a.reservationDate));
  }

  async getById(reservationId) {
    return await db.findById('reservations', reservationId, 'reservationId');
  }

  async create(data) {
    const records = await db.find('reservations');
    const year = new Date().getFullYear();
    const nextSeq = String(records.length + 1).padStart(4, '0');
    const reservationId = data.reservationId || `RES-${year}-${nextSeq}`;

    const reservation = {
      reservationId,
      userId: data.userId,
      toolId: data.toolId,
      reservationDate: data.reservationDate || new Date().toISOString(),
      pickupDate: data.pickupDate,
      returnDate: data.returnDate,
      purpose: data.purpose || '',
      status: data.status || 'Pending',
      staffNotes: data.staffNotes || '',
      reviewedBy: null,
      reviewedAt: null
    };

    return await db.insert('reservations', reservation);
  }

  async update(reservationId, updates) {
    return await db.update('reservations', reservationId, updates, 'reservationId');
  }

  async delete(reservationId) {
    return await db.delete('reservations', reservationId, 'reservationId');
  }
}

module.exports = new ReservationRepository();
