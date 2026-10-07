const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const { requireAuth, requireStaffOrAdmin } = require('../middleware/auth');

router.get('/', requireAuth, reservationController.getAll);
router.get('/:id', requireAuth, reservationController.getById);
router.post('/', requireAuth, reservationController.create);
router.put('/:id/approve', requireAuth, requireStaffOrAdmin, reservationController.approve);
router.put('/:id/reject', requireAuth, requireStaffOrAdmin, reservationController.reject);
router.put('/:id/cancel', requireAuth, reservationController.cancel);

module.exports = router;
