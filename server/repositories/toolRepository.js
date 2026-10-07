const db = require('../../db/database');

class ToolRepository {
  async getAll(filters = {}) {
    let tools = await db.find('tools');
    
    // Default filter out archived unless specifically requested
    if (!filters.includeArchived) {
      tools = tools.filter(t => !t.isArchived);
    }

    if (filters.category && filters.category !== 'All') {
      tools = tools.filter(t => t.category === filters.category);
    }

    if (filters.status && filters.status !== 'All') {
      tools = tools.filter(t => t.availabilityStatus === filters.status);
    }

    if (filters.condition && filters.condition !== 'All') {
      tools = tools.filter(t => t.equipmentCondition === filters.condition);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      tools = tools.filter(t => 
        t.toolName.toLowerCase().includes(q) ||
        t.toolId.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.specifications && t.specifications.toLowerCase().includes(q)) ||
        t.category.toLowerCase().includes(q)
      );
    }

    return tools;
  }

  async getById(toolId) {
    return await db.findById('tools', toolId, 'toolId');
  }

  async create(toolData) {
    const records = await db.find('tools');
    const categoryCode = (toolData.category || 'GEN').substring(0, 3).toUpperCase();
    const nextSeq = String(records.length + 1).padStart(3, '0');
    const toolId = toolData.toolId || `TL-${categoryCode}-${nextSeq}`;

    const tool = {
      toolId,
      toolName: toolData.toolName,
      category: toolData.category,
      description: toolData.description || '',
      specifications: toolData.specifications || '',
      availabilityStatus: toolData.availabilityStatus || 'Available',
      equipmentCondition: toolData.equipmentCondition || 'Good',
      rentalFee: parseFloat(toolData.rentalFee) || 0,
      depositFee: parseFloat(toolData.depositFee) || 0,
      quantityTotal: parseInt(toolData.quantityTotal, 10) || 1,
      quantityAvailable: parseInt(toolData.quantityAvailable, 10) || (parseInt(toolData.quantityTotal, 10) || 1),
      imagePath: toolData.imagePath || '',
      serialNumber: toolData.serialNumber || '',
      acquisitionDate: toolData.acquisitionDate || new Date().toISOString().split('T')[0],
      totalTimesBorrowed: 0,
      isArchived: false
    };

    return await db.insert('tools', tool);
  }

  async update(toolId, updates) {
    return await db.update('tools', toolId, updates, 'toolId');
  }

  async delete(toolId) {
    // Soft delete / archive
    return await this.update(toolId, { isArchived: true, availabilityStatus: 'Archived' });
  }

  async permanentDelete(toolId) {
    return await db.delete('tools', toolId, 'toolId');
  }

  async incrementBorrowCount(toolId) {
    const tool = await this.getById(toolId);
    if (!tool) return;
    const newCount = (tool.totalTimesBorrowed || 0) + 1;
    const newQty = Math.max(0, (tool.quantityAvailable || 1) - 1);
    const newStatus = newQty === 0 ? 'Borrowed' : tool.availabilityStatus;
    return await this.update(toolId, {
      totalTimesBorrowed: newCount,
      quantityAvailable: newQty,
      availabilityStatus: newStatus
    });
  }

  async returnTool(toolId, newCondition = null) {
    const tool = await this.getById(toolId);
    if (!tool) return;
    const newQty = Math.min(tool.quantityTotal || 1, (tool.quantityAvailable || 0) + 1);
    const updates = {
      quantityAvailable: newQty,
      availabilityStatus: (newCondition === 'Needs Repair' || newCondition === 'Under Maintenance' || tool.equipmentCondition === 'Needs Repair') ? 'Maintenance' : 'Available'
    };
    if (newCondition) {
      updates.equipmentCondition = newCondition;
    }
    return await this.update(toolId, updates);
  }
}

module.exports = new ToolRepository();
