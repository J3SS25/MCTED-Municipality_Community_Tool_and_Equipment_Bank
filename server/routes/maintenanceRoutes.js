const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');
const { requireAuth, requireStaffOrAdmin } = require('../middleware/auth');

router.get('/', requireAuth, maintenanceController.getAll);
router.get('/:id', requireAuth, maintenanceController.getById);
router.post('/report', requireAuth, maintenanceController.reportDamage);
router.put('/:id', requireAuth, requireStaffOrAdmin, maintenanceController.update);

module.exports = router;
