const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

/**
 * Hashes a plain-text password securely using bcrypt.
 * @param {string} plainPassword - Plain-text password to hash
 * @returns {Promise<string>} The hashed password string
 */
const hashPassword = async (plainPassword) => {
  if (!plainPassword) {
    throw new Error('Password is required for hashing');
  }
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return await bcrypt.hash(plainPassword, salt);
};

/**
 * Compares a plain-text candidate password with a stored password hash.
 * @param {string} candidatePassword - Plain-text password supplied during authentication
 * @param {string} hashedPassword - Stored password hash from database
 * @returns {Promise<boolean>} True if password matches, false otherwise
 */
const comparePassword = async (candidatePassword, hashedPassword) => {
  if (!candidatePassword || !hashedPassword) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, hashedPassword);
};

module.exports = {
  hashPassword,
  comparePassword,
};
