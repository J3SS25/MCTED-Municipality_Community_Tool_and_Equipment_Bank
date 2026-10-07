const express = require('express');
const router = express.Router();
const rentalController = require('../controllers/rentalController');
const { requireAuth, requireStaffOrAdmin } = require('../middleware/auth');

router.get('/', requireAuth, rentalController.getAll);
router.get('/:id', requireAuth, rentalController.getById);
router.post('/checkout', requireAuth, requireStaffOrAdmin, rentalController.checkout);
router.put('/:id/return', requireAuth, requireStaffOrAdmin, rentalController.returnEquipment);

module.exports = router;
