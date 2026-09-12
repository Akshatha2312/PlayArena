const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateUserToken } = require('../utils/token');

/**
 * Registers a new customer user.
 * Explicitly locks role to 'customer' for security.
 * @param {Object} userData - User registration parameters ({ name, email, phone, password })
 * @returns {Promise<Object>} Safe user object excluding passwordHash
 */
const registerCustomer = async ({ name, email, phone, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists with the given email
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const error = new Error('An account with this email already exists');
    error.statusCode = 409;
    throw error;
  }

  // Hash plain text password securely
  const passwordHash = await hashPassword(password);

  // Enforce customer role security boundary
  const newUser = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    phone: phone.trim(),
    passwordHash,
    role: 'customer',
    isVerified: false,
  });

  return {
    id: newUser._id,
    name: newUser.name,
    email: newUser.email,
    phone: newUser.phone,
    role: newUser.role,
    isVerified: newUser.isVerified,
    createdAt: newUser.createdAt,
    updatedAt: newUser.updatedAt,
  };
};

/**
 * Authenticates a user with email and password and returns JWT token.
 * @param {Object} credentials - ({ email, password })
 * @returns {Promise<Object>} Safe user object and signed JWT token
 */
const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Find user by email and explicitly select passwordHash
  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Compare candidate password against stored passwordHash
  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const safeUser = {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  // Generate signed JWT token containing user identity and role
  const token = generateUserToken(safeUser);

  return {
    user: safeUser,
    token,
  };
};

module.exports = {
  registerCustomer,
  loginUser,
};


