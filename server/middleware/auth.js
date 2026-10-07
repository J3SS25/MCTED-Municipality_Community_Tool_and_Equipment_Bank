const userRepository = require('../repositories/userRepository');

async function authMiddleware(req, res, next) {
  try {
    // Check session cookie or Authorization header
    let userId = req.cookies ? req.cookies.mcteb_session_user : null;
    
    if (!userId && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        userId = parts[1];
      }
    }

    if (!userId) {
      req.user = null;
      return next();
    }

    const user = await userRepository.getById(userId);
    if (!user || user.status === 'Suspended') {
      req.user = null;
      return next();
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    req.user = null;
    next();
  }
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
  }
  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
}

const requireAdmin = requireRole('Administrator');
const requireStaffOrAdmin = requireRole('Administrator', 'Municipal Staff');

module.exports = {
  authMiddleware,
  requireAuth,
  requireRole,
  requireAdmin,
  requireStaffOrAdmin
};
