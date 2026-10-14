const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const userRepository = require('../repositories/userRepository');
const sessionRepository = require('../repositories/sessionRepository');
const verificationRepository = require('../repositories/verificationRepository');
const profileChangeRequestRepository = require('../repositories/profileChangeRequestRepository');
const auditRepository = require('../repositories/auditRepository');
const notificationRepository = require('../repositories/notificationRepository');
const emailService = require('../services/emailService');
const constants = require('../config/constants');

const SESSION_COOKIE = 'mcteb_session_user';
const REMEMBER_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const TEMPORARY_SESSION_MS = 12 * 60 * 60 * 1000;

function sessionCookieOptions(req, maxAge) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    ...(maxAge ? { maxAge } : {})
  };
}

async function establishSession(req, res, userId, rememberMe = false) {
  const token = crypto.randomBytes(32).toString('hex');
  const maxAge = rememberMe ? REMEMBER_SESSION_MS : TEMPORARY_SESSION_MS;
  await sessionRepository.create({
    sessionId: crypto.randomUUID(),
    userId,
    token,
    expiresAt: new Date(Date.now() + maxAge).toISOString()
  });
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions(req, rememberMe ? maxAge : undefined));
}

function calculateAge(birthdayStr) {
  if (!birthdayStr) return 0;
  const birthDate = new Date(birthdayStr);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

function isStrongPassword(password) {
  return typeof password === 'string'
    && password.length >= 8
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password);
}

class AuthController {
  // Get Basco metadata
  async getMetadata(req, res) {
    try {
      res.json({
        success: true,
        municipality: constants.MUNICIPALITY,
        barangays: constants.BARANGAYS,
        roles: Object.values(constants.USER_ROLES),
        categories: constants.TOOL_CATEGORIES,
        toolStatuses: Object.values(constants.TOOL_STATUS),
        toolConditions: Object.values(constants.TOOL_CONDITIONS),
        paymentMethods: Object.values(constants.PAYMENT_METHODS)
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Register new user
  async register(req, res) {
    try {
      const {
        firstName,
        middleName,
        lastName,
        birthday,
        contactNumber,
        houseNumber,
        street,
        barangay,
        email,
        password,
        emailVerificationCode,
        role,
        adminPasscode
      } = req.body;

      if (!firstName || !lastName || !birthday || !contactNumber || !houseNumber || !street || !barangay || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Please provide all required fields including address in Basco, Batanes.'
        });
      }

      // Check if email already exists
      const existing = await userRepository.getByEmail(email);
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email address already exists.'
        });
      }

      // Validate barangay
      if (!constants.BARANGAYS.includes(barangay)) {
        return res.status(400).json({
          success: false,
          message: `Invalid barangay. Must be one of: ${constants.BARANGAYS.join(', ')}`
        });
      }

      if (!isStrongPassword(password)) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters and include uppercase, lowercase, a number, and a symbol.'
        });
      }

      if (!emailVerificationCode || !await verificationRepository.consume(email, 'registration', emailVerificationCode)) {
        return res.status(400).json({
          success: false,
          message: 'Verify your email address with the code we sent before creating your account.'
        });
      }

      // Determine role
      let userRole = constants.USER_ROLES.BORROWER;
      if (role === constants.USER_ROLES.ADMIN || role === constants.USER_ROLES.STAFF) {
        const configuredPasscode = role === constants.USER_ROLES.ADMIN
          ? process.env.ADMIN_REGISTRATION_PASSCODE
          : process.env.STAFF_REGISTRATION_PASSCODE;
        if (!configuredPasscode || adminPasscode !== configuredPasscode) {
          return res.status(403).json({
            success: false,
            message: 'Staff and administrator accounts must be created with an authorized municipal registration code.'
          });
        }
        userRole = role;
      }

      const age = calculateAge(birthday);
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const newUser = await userRepository.create({
        firstName,
        middleName: middleName || '',
        lastName,
        birthday,
        age,
        contactNumber,
        houseNumber,
        street,
        barangay,
        email,
        passwordHash,
        role: userRole,
        status: constants.USER_STATUS.ACTIVE
      });

      // Send welcome notification
      await notificationRepository.create({
        userId: newUser.userId,
        title: 'Welcome to Basco MCTEB!',
        message: `Hello ${firstName}, your account (${newUser.userId}) has been successfully registered. You can now browse and reserve community tools and equipment.`,
        type: 'success'
      });

      await auditRepository.log(
        'USER_REGISTER',
        'User',
        newUser.userId,
        `New ${userRole} registered: ${firstName} ${lastName} (${email}) from Brgy. ${barangay}`,
        newUser,
        req.ip
      );

      await establishSession(req, res, newUser.userId);

      const safeUser = { ...newUser };
      delete safeUser.passwordHash;

      res.status(201).json({
        success: true,
        message: 'Registration successful! Welcome to MCTEB Basco.',
        user: safeUser
      });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ success: false, message: err.message || 'Registration failed.' });
    }
  }

  async sendEmailVerification(req, res) {
    try {
      const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      if (!email) {
        return res.status(400).json({ success: false, message: 'A valid email address is required.' });
      }
      if (await userRepository.getByEmail(email)) {
        return res.status(409).json({ success: false, message: 'An account with this email address already exists.' });
      }

      const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
      await verificationRepository.issue(email, 'registration', code);
      try {
        await emailService.sendVerificationCode(email, code, 'registration');
      } catch (err) {
        await verificationRepository.deleteForEmail(email, 'registration');
        throw err;
      }

      res.json({ success: true, message: 'Verification code sent. Check your email.' });
    } catch (err) {
      console.error('Email verification delivery error:', err);
      res.status(503).json({ success: false, message: err.message || 'Could not send the verification email.' });
    }
  }

  // Login
  async login(req, res) {
    try {
      const { email, password, rememberMe } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
      }

      const user = await userRepository.getByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password. Please check your credentials.'
        });
      }

      // Check if account is locked
      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        const remainingMinutes = Math.ceil((new Date(user.lockedUntil) - new Date()) / 60000);
        return res.status(403).json({
          success: false,
          message: `Account is temporarily locked due to multiple failed login attempts. Please retry in ${remainingMinutes} minute(s).`
        });
      }

      // Check account status
      if (user.status === 'Suspended') {
        return res.status(403).json({
          success: false,
          message: 'Your account has been suspended by the municipal administrator. Please contact the Basco LGU office.'
        });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        await userRepository.incrementFailedAttempts(user.userId);
        const currentAttempts = (user.failedLoginAttempts || 0) + 1;
        const remaining = Math.max(0, 5 - currentAttempts);
        
        return res.status(401).json({
          success: false,
          message: `Invalid credentials. (${remaining} reattempt${remaining === 1 ? '' : 's'} remaining before temporary lockout)`
        });
      }

      // Successful login - reset failed attempts
      await userRepository.resetFailedAttempts(user.userId);
      const loggedInUser = await userRepository.update(user.userId, { lastLoginAt: new Date().toISOString() });

      await establishSession(req, res, user.userId, rememberMe === true);

      await auditRepository.log('USER_LOGIN', 'User', user.userId, `User ${user.email} logged in`, user, req.ip);

      const safeUser = { ...loggedInUser };
      delete safeUser.passwordHash;

      res.json({
        success: true,
        message: `Welcome back, ${user.firstName}!`,
        user: safeUser
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ success: false, message: err.message || 'Login failed.' });
    }
  }

  // Logout
  async logout(req, res) {
    try {
      if (req.session) await sessionRepository.delete(req.session.sessionId);
      res.clearCookie(SESSION_COOKIE, sessionCookieOptions(req));
      res.json({ success: true, message: 'Logged out successfully.' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Get current authenticated user
  async getMe(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
      }
      const safeUser = { ...req.user };
      delete safeUser.passwordHash;
      res.json({ success: true, user: safeUser });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Edit Profile
  async updateProfile(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
      }

      const restrictedFields = ['firstName', 'middleName', 'lastName', 'birthday', 'houseNumber', 'street', 'barangay'];
      if (restrictedFields.some(field => Object.prototype.hasOwnProperty.call(req.body, field))) {
        return res.status(400).json({
          success: false,
          message: 'Official resident information cannot be changed directly. Submit an information update request for staff review.'
        });
      }

      if (Object.prototype.hasOwnProperty.call(req.body, 'contactNumber')) {
        return res.status(400).json({
          success: false,
          message: 'Contact number changes require contact verification before they can be saved.'
        });
      }

      const updates = {};
      if (Object.prototype.hasOwnProperty.call(req.body, 'email')) {
        const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
        const verificationCode = req.body.emailVerificationCode;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
        }
        const existing = await userRepository.getByEmail(email);
        if (existing && existing.userId !== req.user.userId) {
          return res.status(409).json({ success: false, message: 'That email address is already associated with an account.' });
        }
        if (email === req.user.email.toLowerCase()) {
          return res.status(400).json({ success: false, message: 'That is already your current email address.' });
        }
        if (typeof verificationCode !== 'string'
          || !await verificationRepository.consume(email, `email-change:${req.user.userId}`, verificationCode)) {
          return res.status(400).json({ success: false, message: 'Verify the new email address before saving it.' });
        }
        updates.email = email;
      }
      if (Object.prototype.hasOwnProperty.call(req.body, 'avatar')) {
        if (typeof req.body.avatar !== 'string' || req.body.avatar.length > 500000
          || (req.body.avatar && !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(req.body.avatar))) {
          return res.status(400).json({ success: false, message: 'Profile picture data is invalid or too large.' });
        }
        updates.avatar = req.body.avatar;
      }
      if (Object.prototype.hasOwnProperty.call(req.body, 'emailVerificationCode') && !updates.email) {
        return res.status(400).json({ success: false, message: 'An email verification code can only be used with a new email address.' });
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, message: 'No editable account settings were provided.' });
      }

      const updated = await userRepository.update(req.user.userId, updates);
      await auditRepository.log(
        'PROFILE_UPDATE',
        'User',
        req.user.userId,
        { previousEmail: req.user.email, newEmail: updated.email, emailChanged: Boolean(updates.email), avatarChanged: Object.prototype.hasOwnProperty.call(updates, 'avatar') },
        req.user,
        req.ip
      );

      const safeUser = { ...updated };
      delete safeUser.passwordHash;

      res.json({
        success: true,
        message: 'Profile updated successfully!',
        user: safeUser
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async sendEmailChangeVerification(req, res) {
    try {
      const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: 'Enter a valid new email address.' });
      }
      if (email === req.user.email.toLowerCase()) {
        return res.status(400).json({ success: false, message: 'That is already your current email address.' });
      }
      if (await userRepository.getByEmail(email)) {
        return res.status(409).json({ success: false, message: 'That email address is already associated with an account.' });
      }

      const purpose = `email-change:${req.user.userId}`;
      const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
      await verificationRepository.issue(email, purpose, code);
      try {
        await emailService.sendVerificationCode(email, code, 'email-change');
      } catch (err) {
        await verificationRepository.deleteForEmail(email, purpose);
        throw err;
      }

      res.json({ success: true, message: 'Verification code sent to the new email address.' });
    } catch (err) {
      console.error('Email change verification delivery error:', err);
      res.status(503).json({ success: false, message: err.message || 'Could not send the email verification code.' });
    }
  }

  async createProfileChangeRequest(req, res) {
    try {
      const { field, requestedValue, reason, notes = '' } = req.body;
      const allowedFields = ['firstName', 'middleName', 'lastName', 'birthday', 'barangay', 'houseNumber', 'street'];
      if (!allowedFields.includes(field) || typeof requestedValue !== 'string') {
        return res.status(400).json({ success: false, message: 'Choose an eligible resident information field and provide the requested value.' });
      }
      if (typeof reason !== 'string' || !reason.trim()) {
        return res.status(400).json({ success: false, message: 'Explain the reason for the requested information change.' });
      }
      if (typeof notes !== 'string' || notes.length > 2000 || reason.length > 500) {
        return res.status(400).json({ success: false, message: 'Reason or supporting notes exceed the allowed length.' });
      }

      const value = requestedValue.trim();
      if ((field !== 'middleName' && !value) || value.length > 200) {
        return res.status(400).json({ success: false, message: 'Provide a valid requested value (up to 200 characters).' });
      }
      if (field === 'barangay' && !constants.BARANGAYS.includes(value)) {
        return res.status(400).json({ success: false, message: 'Select a valid Basco barangay.' });
      }
      if (field === 'birthday' && (
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
        || Number.isNaN(Date.parse(value))
        || new Date(value).toISOString().slice(0, 10) !== value
        || new Date(value) > new Date()
      )) {
        return res.status(400).json({ success: false, message: 'Enter a valid birthday that is not in the future.' });
      }

      const request = await profileChangeRequestRepository.create({
        userId: req.user.userId,
        userName: `${req.user.firstName} ${req.user.lastName}`,
        field,
        requestedValue: value,
        reason: reason.trim(),
        notes: notes.trim(),
        auditTrail: [{
          status: 'Pending',
          dateTime: new Date().toISOString(),
          previousValue: req.user[field] || '',
          newValue: value,
          approvedBy: null
        }]
      });

      res.status(201).json({ success: true, message: 'Information update request submitted for municipal review.', request });
    } catch (err) {
      console.error('Profile change request error:', err);
      res.status(500).json({ success: false, message: 'Could not submit the information update request.' });
    }
  }

  async getProfileChangeRequests(req, res) {
    try {
      const requests = await profileChangeRequestRepository.getAll();
      res.json({ success: true, requests });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Could not load information update requests.' });
    }
  }

  async getMyProfileChangeRequests(req, res) {
    try {
      const requests = await profileChangeRequestRepository.getForUser(req.user.userId);
      res.json({ success: true, requests });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Could not load your information update requests.' });
    }
  }

  async reviewProfileChangeRequest(req, res) {
    try {
      const { status, reviewNotes = '' } = req.body;
      if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Review decision must be Approved or Rejected.' });
      }
      if (typeof reviewNotes !== 'string' || reviewNotes.length > 2000) {
        return res.status(400).json({ success: false, message: 'Review notes must not exceed 2000 characters.' });
      }

      const request = await profileChangeRequestRepository.getById(req.params.requestId);
      if (!request) return res.status(404).json({ success: false, message: 'Information update request not found.' });
      if (request.status !== 'Pending') {
        return res.status(409).json({ success: false, message: 'This information update request has already been reviewed.' });
      }
      if (request.userId === req.user.userId) {
        return res.status(403).json({ success: false, message: 'You cannot review your own information update request.' });
      }

      const user = await userRepository.getById(request.userId);
      if (!user) return res.status(404).json({ success: false, message: 'The account associated with this request no longer exists.' });
      const allowedFields = ['firstName', 'middleName', 'lastName', 'birthday', 'barangay', 'houseNumber', 'street'];
      if (!allowedFields.includes(request.field)) {
        return res.status(400).json({ success: false, message: 'This request contains an invalid resident information field.' });
      }

      let updatedUser = user;
      const previousValue = user[request.field] || '';
      if (status === 'Approved') {
        const updates = { [request.field]: request.requestedValue };
        if (request.field === 'birthday') updates.age = calculateAge(request.requestedValue);
        updatedUser = await userRepository.update(user.userId, updates);
        if (!updatedUser) return res.status(500).json({ success: false, message: 'Could not update the resident record.' });
      }

      const reviewedAt = new Date().toISOString();
      const auditEntry = {
        status,
        dateTime: reviewedAt,
        previousValue,
        newValue: status === 'Approved' ? request.requestedValue : previousValue,
        requestedValue: request.requestedValue,
        approvedBy: `${req.user.firstName} ${req.user.lastName}`,
        reviewerUserId: req.user.userId,
        reviewNotes: reviewNotes.trim()
      };
      const updatedRequest = await profileChangeRequestRepository.update(request.requestId, {
        status,
        reviewNotes: reviewNotes.trim(),
        reviewedAt,
        reviewedBy: req.user.userId,
        auditTrail: [...(request.auditTrail || []), auditEntry]
      });

      await auditRepository.log(
        `PROFILE_CHANGE_${status.toUpperCase()}`,
        'User',
        user.userId,
        { requestId: request.requestId, field: request.field, previousValue, newValue: auditEntry.newValue, reviewNotes: reviewNotes.trim() },
        req.user,
        req.ip
      );

      res.json({
        success: true,
        message: status === 'Approved' ? 'Request approved and resident information updated.' : 'Request rejected.',
        request: updatedRequest,
        user: status === 'Approved' ? (() => {
          const safeUser = { ...updatedUser };
          delete safeUser.passwordHash;
          return safeUser;
        })() : undefined
      });
    } catch (err) {
      console.error('Profile change request review error:', err);
      res.status(500).json({ success: false, message: 'Could not review the information update request.' });
    }
  }

  // Change Password
  async changePassword(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
      }

      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Please provide both current and new password.' });
      }
      if (!isStrongPassword(newPassword)) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters and include uppercase, lowercase, a number, and a symbol.'
        });
      }

      const isMatch = await bcrypt.compare(currentPassword, req.user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Incorrect current password.' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);
      await userRepository.update(req.user.userId, { passwordHash });

      await auditRepository.log('PASSWORD_CHANGE', 'User', req.user.userId, `Password changed`, req.user, req.ip);

      res.json({ success: true, message: 'Password changed successfully.' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Forgot Password / Reset simulation
  async forgotPassword(req, res) {
    try {
      const { email, verificationCode, newPassword } = req.body;
      if (typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({ success: false, message: 'A registered email address is required.' });
      }
      const user = await userRepository.getByEmail(email);
      if (verificationCode && newPassword) {
        if (!isStrongPassword(newPassword)) {
          return res.status(400).json({
            success: false,
            message: 'Password must be at least 8 characters and include uppercase, lowercase, a number, and a symbol.'
          });
        }
        if (!await verificationRepository.consume(email, 'password-reset', verificationCode)) {
          return res.status(400).json({ success: false, message: 'The verification code is invalid or expired.' });
        }
        if (!user) {
          return res.status(400).json({ success: false, message: 'The verification code is invalid or expired.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);
        await userRepository.update(user.userId, { passwordHash, failedLoginAttempts: 0, lockedUntil: null });
        
        await auditRepository.log('PASSWORD_RESET', 'User', user.userId, 'Password reset using email verification', user, req.ip);
        return res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
      }

      if (user) {
        const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
        await verificationRepository.issue(email, 'password-reset', code);
        try {
          await emailService.sendVerificationCode(email, code, 'password-reset');
        } catch (err) {
          await verificationRepository.deleteForEmail(email, 'password-reset');
          throw err;
        }
      }
      return res.json({
        success: true,
        message: 'If an account is associated with that email, a password reset code has been sent.'
      });
    } catch (err) {
      console.error('Password reset error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Admin: Get all users
  async getAllUsers(req, res) {
    try {
      const users = await userRepository.getAll();
      const safeList = users.map(u => {
        const c = { ...u };
        delete c.passwordHash;
        return c;
      });
      res.json({ success: true, users: safeList });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Admin: Update user status or role
  async updateUserStatus(req, res) {
    try {
      const { userId } = req.params;
      const { status, role } = req.body;
      
      const updates = {};
      if (status) updates.status = status;
      if (role) updates.role = role;

      const updated = await userRepository.update(userId, updates);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      await auditRepository.log('ADMIN_USER_UPDATE', 'User', userId, `Admin updated user to role=${role || updated.role}, status=${status || updated.status}`, req.user, req.ip);

      const safeUser = { ...updated };
      delete safeUser.passwordHash;

      res.json({ success: true, message: 'User updated successfully.', user: safeUser });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new AuthController();
