const db = require('../../db/database');

class FeedbackRepository {
  async getAll(filters = {}) {
    let list = await db.find('feedback');

    if (filters.toolId) {
      list = list.filter(f => f.toolId === filters.toolId);
    }
    if (filters.userId) {
      list = list.filter(f => f.userId === filters.userId);
    }

    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async getById(feedbackId) {
    return await db.findById('feedback', feedbackId, 'feedbackId');
  }

  async create(data) {
    const records = await db.find('feedback');
    const year = new Date().getFullYear();
    const nextSeq = String(records.length + 1).padStart(4, '0');
    const feedbackId = data.feedbackId || `FDB-${year}-${nextSeq}`;

    const item = {
      feedbackId,
      rentalId: data.rentalId || null,
      toolId: data.toolId,
      userId: data.userId,
      userName: data.userName || 'Resident',
      rating: parseInt(data.rating, 10) || 5,
      toolConditionRating: parseInt(data.toolConditionRating, 10) || 5,
      serviceRating: parseInt(data.serviceRating, 10) || 5,
      comments: data.comments || '',
      isPublic: data.isPublic !== undefined ? data.isPublic : true
    };

    return await db.insert('feedback', item);
  }

  async getAverageRatingForTool(toolId) {
    const list = await this.getAll({ toolId });
    if (list.length === 0) return { avgRating: 5.0, count: 0 };
    const sum = list.reduce((acc, curr) => acc + curr.rating, 0);
    return {
      avgRating: Number((sum / list.length).toFixed(1)),
      count: list.length
    };
  }
}

module.exports = new FeedbackRepository();
