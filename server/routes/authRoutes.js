const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth, requireAdmin, requireStaffOrAdmin } = require('../middleware/auth');

router.get('/metadata', authController.getMetadata);
router.post('/register', authController.register);
router.post('/send-email-verification', authController.sendEmailVerification);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', authController.getMe);
router.put('/profile', requireAuth, authController.updateProfile);
router.post('/profile/email-verification', requireAuth, authController.sendEmailChangeVerification);
router.get('/profile-change-requests/mine', requireAuth, authController.getMyProfileChangeRequests);
router.post('/profile-change-requests', requireAuth, authController.createProfileChangeRequest);
router.get('/profile-change-requests', requireAuth, requireStaffOrAdmin, authController.getProfileChangeRequests);
router.put('/profile-change-requests/:requestId', requireAuth, requireStaffOrAdmin, authController.reviewProfileChangeRequest);
router.put('/change-password', requireAuth, authController.changePassword);
router.post('/forgot-password', authController.forgotPassword);

// Admin user management
router.get('/users', requireAuth, requireAdmin, authController.getAllUsers);
router.put('/users/:userId', requireAuth, requireAdmin, authController.updateUserStatus);

module.exports = router;
