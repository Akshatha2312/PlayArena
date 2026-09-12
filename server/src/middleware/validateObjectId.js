const mongoose = require('mongoose');

/**
 * Middleware factory that validates specified route parameters as valid MongoDB ObjectIds.
 * @param {...string} paramNames - Parameter names to validate (e.g., 'id', 'bookingId')
 */
const validateObjectId = (...paramNames) => {
  return (req, res, next) => {
    for (const paramName of paramNames) {
      const value = req.params[paramName];
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        return res.status(400).json({
          status: 'fail',
          message: `Invalid ID format for parameter '${paramName}'`,
        });
      }
    }
    next();
  };
};

module.exports = validateObjectId;
