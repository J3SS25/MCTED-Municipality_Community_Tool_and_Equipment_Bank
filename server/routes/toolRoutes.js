const express = require('express');
const router = express.Router();
const toolController = require('../controllers/toolController');
const { requireAuth, requireStaffOrAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', toolController.getAll);
router.get('/:id', toolController.getById);
router.post('/', requireAuth, requireStaffOrAdmin, upload.single('image'), toolController.create);
router.put('/:id', requireAuth, requireStaffOrAdmin, upload.single('image'), toolController.update);
router.delete('/:id', requireAuth, requireStaffOrAdmin, toolController.delete);

module.exports = router;
