const authService = require('../services/authService');

/**
 * Handles HTTP POST request for user registration.
 */
const register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body || {};

    // Input validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Name is required',
      });
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Email is required',
      });
    }

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Phone number is required',
      });
    }

    if (!password || typeof password !== 'string' || !password.trim()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Password is required',
      });
    }

    // Pass validated parameters to service layer
    const user = await authService.registerCustomer({
      name,
      email,
      phone,
      password,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Registration successful',
      data: {
        user,
      },
    });
  } catch (error) {
    if (error.statusCode === 409 || error.code === 11000) {
      return res.status(409).json({
        status: 'fail',
        message: 'An account with this email already exists',
      });
    }
    next(error);
  }
};

/**
 * Handles HTTP POST request for user login.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Email is required',
      });
    }

    if (!password || typeof password !== 'string' || !password.trim()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Password is required',
      });
    }

    const { user, token } = await authService.loginUser({ email, password });

    return res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    if (error.statusCode === 401) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid email or password',
      });
    }
    next(error);
  }
};

module.exports = {
  register,
  login,
};

