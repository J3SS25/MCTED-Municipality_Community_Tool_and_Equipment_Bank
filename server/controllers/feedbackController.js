const feedbackRepository = require('../repositories/feedbackRepository');
const toolRepository = require('../repositories/toolRepository');
const userRepository = require('../repositories/userRepository');
const auditRepository = require('../repositories/auditRepository');

class FeedbackController {
  // Get feedback
  async getAll(req, res) {
    try {
      const { toolId, userId } = req.query;
      const list = await feedbackRepository.getAll({ toolId, userId });

      const hydrated = await Promise.all(
        list.map(async (f) => {
          const tool = await toolRepository.getById(f.toolId);
          const user = await userRepository.getById(f.userId);
          return {
            ...f,
            toolName: tool ? tool.toolName : 'Tool',
            category: tool ? tool.category : '',
            userName: user ? `${user.firstName} ${user.lastName}` : f.userName,
            userBarangay: user ? user.barangay : ''
          };
        })
      );

      res.json({ success: true, count: hydrated.length, feedback: hydrated });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Submit feedback
  async create(req, res) {
    try {
      const {
        toolId,
        rentalId,
        rating,
        toolConditionRating,
        serviceRating,
        comments
      } = req.body;

      if (!toolId || !rating) {
        return res.status(400).json({
          success: false,
          message: 'Tool ID and rating (1-5) are required.'
        });
      }

      const user = req.user;
      const feedback = await feedbackRepository.create({
        rentalId: rentalId || null,
        toolId,
        userId: user.userId,
        userName: `${user.firstName} ${user.lastName}`,
        rating: parseInt(rating, 10),
        toolConditionRating: parseInt(toolConditionRating, 10) || parseInt(rating, 10),
        serviceRating: parseInt(serviceRating, 10) || parseInt(rating, 10),
        comments: comments || '',
        isPublic: true
      });

      await auditRepository.log(
        'FEEDBACK_SUBMIT',
        'Feedback',
        feedback.feedbackId,
        `User ${user.userId} submitted ${rating}-star feedback for tool ${toolId}`,
        req.user,
        req.ip
      );

      res.status(201).json({
        success: true,
        message: 'Thank you for your feedback! It helps improve Basco community services.',
        feedback
      });
    } catch (err) {
      console.error('Feedback submit error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new FeedbackController();
