const { verifyToken } = require('../utils/token');
const User = require('../models/User');

/**
 * Authentication Middleware
 * Verifies JWT token supplied in the 'Authorization: Bearer <token>' header.
 * Attaches the verified user payload (userId and role) to req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    // 1. Check if Authorization header exists
    if (!authHeader || typeof authHeader !== 'string') {
      return res.status(401).json({
        status: 'fail',
        message: 'Authentication required. Please provide an Authorization header.',
      });
    }

    // 2. Validate Bearer token format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1].trim()) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid Authorization header format. Format must be "Bearer <token>"',
      });
    }

    const token = parts[1].trim();

    // 3. Verify JWT token signature and expiration using existing verifyToken utility
    const decoded = verifyToken(token);

    // 4. Database Check with offline fallback
    let currentUser = null;
    try {
      currentUser = await User.findById(decoded.userId).select('_id role');
    } catch (e) {}

    // 5. Attach verified identity to req.user
    req.user = {
      userId: currentUser ? currentUser._id.toString() : (decoded.userId || decoded._id),
      role: currentUser ? currentUser.role : decoded.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid or expired authentication token',
    });
  }
};

/**
 * Authorization Middleware (RBAC)
 * Checks if the authenticated user's role (req.user.role) matches any of the allowed roles.
 * @param {...string} allowedRoles - Permitted roles ('customer', 'staff', 'admin')
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // 1. Ensure req.user exists (authenticate must run first)
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        status: 'fail',
        message: 'Authentication required. Please authenticate before authorization.',
      });
    }

    // 2. Check if user's role is permitted
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to perform this action',
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};

