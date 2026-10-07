const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { requireAuth, requireStaffOrAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', requireAuth, paymentController.getAll);
router.get('/:id', requireAuth, paymentController.getById);
router.get('/receipt/:receiptId', requireAuth, paymentController.getReceipt);
router.post('/', requireAuth, upload.single('proofImage'), paymentController.submitPayment);
router.put('/:id/verify', requireAuth, requireStaffOrAdmin, paymentController.verifyPayment);

module.exports = router;
