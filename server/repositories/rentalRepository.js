const db = require('../../db/database');

class RentalRepository {
  async getAll(filters = {}) {
    let list = await db.find('rentals');

    if (filters.userId) {
      list = list.filter(r => r.userId === filters.userId);
    }
    if (filters.toolId) {
      list = list.filter(r => r.toolId === filters.toolId);
    }
    if (filters.rentalStatus && filters.rentalStatus !== 'All') {
      list = list.filter(r => r.rentalStatus === filters.rentalStatus);
    }

    // Sort by rentalDate or createdAt descending
    return list.sort((a, b) => new Date(b.rentalDate || b.createdAt) - new Date(a.rentalDate || a.createdAt));
  }

  async getById(rentalId) {
    return await db.findById('rentals', rentalId, 'rentalId');
  }

  async create(data) {
    const records = await db.find('rentals');
    const year = new Date().getFullYear();
    const nextSeq = String(records.length + 1).padStart(4, '0');
    const rentalId = data.rentalId || `RNT-${year}-${nextSeq}`;

    const rental = {
      rentalId,
      reservationId: data.reservationId || null,
      userId: data.userId,
      toolId: data.toolId,
      rentalDate: data.rentalDate || new Date().toISOString(),
      dueDate: data.dueDate,
      actualReturnDate: null,
      rentalStatus: data.rentalStatus || 'Borrowed',
      initialCondition: data.initialCondition || 'Good',
      returnedCondition: null,
      releasedBy: data.releasedBy,
      receivedBy: null,
      inspectionNotes: data.inspectionNotes || '',
      overduePenalty: parseFloat(data.overduePenalty) || 0,
      damagePenalty: parseFloat(data.damagePenalty) || 0
    };

    return await db.insert('rentals', rental);
  }

  async update(rentalId, updates) {
    return await db.update('rentals', rentalId, updates, 'rentalId');
  }

  async delete(rentalId) {
    return await db.delete('rentals', rentalId, 'rentalId');
  }
}

module.exports = new RentalRepository();
