const jwt = require('jsonwebtoken');

/**
 * Generates a signed JWT token for a user.
 * @param {Object} user - User object containing id and role
 * @returns {string} Signed JWT token
 */
const generateUserToken = (user) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not defined');
  }

  const payload = {
    userId: user.id || user._id,
    role: user.role,
  };

  const options = {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  };

  return jwt.sign(payload, secret, options);
};

/**
 * Verifies a JWT token string against the JWT_SECRET.
 * @param {string} token - Signed JWT token string
 * @returns {Object} Decoded payload
 */
const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not defined');
  }

  return jwt.verify(token, secret);
};

module.exports = {
  generateUserToken,
  verifyToken,
};
