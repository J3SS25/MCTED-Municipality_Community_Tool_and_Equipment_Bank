const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const auditRepository = require('../repositories/auditRepository');
const notificationRepository = require('../repositories/notificationRepository');
const constants = require('../config/constants');

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

      // Determine role
      let userRole = constants.USER_ROLES.BORROWER;
      if (role === constants.USER_ROLES.ADMIN || role === constants.USER_ROLES.STAFF) {
        // Simple security check for creating admin/staff during setup or via registration
        if (adminPasscode === 'BASCO_MCTEB_2026' || adminPasscode === 'Admin@123') {
          userRole = role;
        } else {
          userRole = constants.USER_ROLES.BORROWER;
        }
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

      // Auto login session
      res.cookie('mcteb_session_user', newUser.userId, {
        httpOnly: false, // Accessible to client app for low-bandwidth local state
        maxAge: 30 * 24 * 60 * 60 * 1000,
        sameSite: 'lax'
      });

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

  // Login
  async login(req, res) {
    try {
      const { email, password } = req.body;
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

      res.cookie('mcteb_session_user', user.userId, {
        httpOnly: false,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        sameSite: 'lax'
      });

      await auditRepository.log('USER_LOGIN', 'User', user.userId, `User ${user.email} logged in`, user, req.ip);

      const safeUser = { ...user };
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
      res.clearCookie('mcteb_session_user');
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

      const {
        firstName,
        middleName,
        lastName,
        birthday,
        contactNumber,
        houseNumber,
        street,
        barangay,
        avatar
      } = req.body;

      const updates = {};
      if (firstName) updates.firstName = firstName;
      if (middleName !== undefined) updates.middleName = middleName;
      if (lastName) updates.lastName = lastName;
      if (birthday) {
        updates.birthday = birthday;
        updates.age = calculateAge(birthday);
      }
      if (contactNumber) updates.contactNumber = contactNumber;
      if (houseNumber) updates.houseNumber = houseNumber;
      if (street) updates.street = street;
      if (barangay) {
        if (!constants.BARANGAYS.includes(barangay)) {
          return res.status(400).json({ success: false, message: 'Invalid Basco barangay.' });
        }
        updates.barangay = barangay;
      }
      if (avatar) updates.avatar = avatar;

      const updated = await userRepository.update(req.user.userId, updates);
      await auditRepository.log('PROFILE_UPDATE', 'User', req.user.userId, `User updated profile information`, req.user, req.ip);

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
      const { email, newPassword, recoveryPin } = req.body;
      const user = await userRepository.getByEmail(email);
      if (!user) {
        return res.status(404).json({ success: false, message: 'No account found with this email.' });
      }

      // If recovery PIN is provided (default master code or user contact last 4 digits)
      const lastFour = user.contactNumber.slice(-4);
      if (recoveryPin && (recoveryPin === '1234' || recoveryPin === lastFour || recoveryPin === 'BASCO')) {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);
        await userRepository.update(user.userId, { passwordHash, failedLoginAttempts: 0, lockedUntil: null });
        
        await auditRepository.log('PASSWORD_RESET', 'User', user.userId, `Password reset via recovery PIN`, user, req.ip);
        return res.json({ success: true, message: 'Password has been successfully reset! You can now log in.' });
      } else {
        return res.json({
          success: true,
          requiresPin: true,
          hint: `Enter your 4-digit security PIN (Default: last 4 digits of your contact number ending in ...${lastFour})`,
          message: 'Please provide your security PIN to confirm password reset.'
        });
      }
    } catch (err) {
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
