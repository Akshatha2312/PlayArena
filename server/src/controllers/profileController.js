/**
 * Profile Controller for demonstrating role-based access control (RBAC).
 */
const getCustomerProfile = (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Customer profile access granted',
    data: {
      user: req.user,
    },
  });
};

const getStaffProfile = (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Staff profile access granted',
    data: {
      user: req.user,
    },
  });
};

const getAdminProfile = (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Admin profile access granted',
    data: {
      user: req.user,
    },
  });
};

module.exports = {
  getCustomerProfile,
  getStaffProfile,
  getAdminProfile,
};
