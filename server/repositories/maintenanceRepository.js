const db = require('../../db/database');

class MaintenanceRepository {
  async getAll(filters = {}) {
    let list = await db.find('maintenance');

    if (filters.toolId) {
      list = list.filter(m => m.toolId === filters.toolId);
    }
    if (filters.status && filters.status !== 'All') {
      list = list.filter(m => m.status === filters.status);
    }
    if (filters.severity && filters.severity !== 'All') {
      list = list.filter(m => m.severity === filters.severity);
    }

    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async getById(maintenanceId) {
    return await db.findById('maintenance', maintenanceId, 'maintenanceId');
  }

  async create(data) {
    const records = await db.find('maintenance');
    const year = new Date().getFullYear();
    const nextSeq = String(records.length + 1).padStart(4, '0');
    const maintenanceId = data.maintenanceId || `MNT-${year}-${nextSeq}`;

    const item = {
      maintenanceId,
      toolId: data.toolId,
      reportedBy: data.reportedBy,
      rentalId: data.rentalId || null,
      issueDescription: data.issueDescription,
      severity: data.severity || 'Moderate',
      status: data.status || 'Reported',
      assignedTechnician: data.assignedTechnician || 'Basco Municipal Motorpool',
      estimatedCost: parseFloat(data.estimatedCost) || 0,
      actualCost: parseFloat(data.actualCost) || 0,
      scheduledDate: data.scheduledDate || null,
      completedDate: data.completedDate || null,
      resolutionNotes: data.resolutionNotes || ''
    };

    return await db.insert('maintenance', item);
  }

  async update(maintenanceId, updates) {
    return await db.update('maintenance', maintenanceId, updates, 'maintenanceId');
  }

  async delete(maintenanceId) {
    return await db.delete('maintenance', maintenanceId, 'maintenanceId');
  }
}

module.exports = new MaintenanceRepository();
