const jwt = require('jsonwebtoken');

/**
 * Generates a signed JWT token for a user.
 * @param {Object} user - User object containing id and role
 * @returns {string} Signed JWT token
 */
const INSECURE_DEFAULT_SECRETS = [
  'secret',
  '123456',
  'jwt_secret',
  'your_jwt_secret_here',
  'default_secret',
];

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not defined');
  }

  if (process.env.NODE_ENV === 'production') {
    if (INSECURE_DEFAULT_SECRETS.includes(secret.toLowerCase()) || secret.length < 32) {
      throw new Error('FATAL: Insecure or default JWT_SECRET detected in production environment.');
    }
  }

  return secret;
};

/**
 * Generates a signed JWT token for a user.
 * @param {Object} user - User object containing id and role
 * @returns {string} Signed JWT token
 */
const generateUserToken = (user) => {
  const secret = getJwtSecret();

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
  const secret = getJwtSecret();
  return jwt.verify(token, secret);
};

module.exports = {
  generateUserToken,
  verifyToken,
};
