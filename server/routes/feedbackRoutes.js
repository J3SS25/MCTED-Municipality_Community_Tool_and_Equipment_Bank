const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { requireAuth } = require('../middleware/auth');

router.get('/', feedbackController.getAll);
router.post('/', requireAuth, feedbackController.create);

module.exports = router;
