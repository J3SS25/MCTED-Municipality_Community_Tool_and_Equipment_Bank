const userRepository = require('../repositories/userRepository');
const sessionRepository = require('../repositories/sessionRepository');

async function authMiddleware(req, res, next) {
  try {
    const token = req.cookies ? req.cookies.mcteb_session_user : null;
    if (!token) {
      req.user = null;
      req.session = null;
      return next();
    }

    const session = await sessionRepository.getByToken(token);
    if (!session || new Date(session.expiresAt) <= new Date()) {
      if (session) await sessionRepository.delete(session.sessionId);
      req.user = null;
      req.session = null;
      return next();
    }

    const user = await userRepository.getById(session.userId);
    if (!user || user.status === 'Suspended') {
      await sessionRepository.delete(session.sessionId);
      req.user = null;
      req.session = null;
      return next();
    }

    req.user = user;
    req.session = session;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    next(err);
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
