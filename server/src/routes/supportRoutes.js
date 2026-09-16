const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { sensitiveApiLimiter } = require('../middleware/rateLimiter');
const {
  createCustomerIssue,
  getCustomerIssues,
  getCustomerIssueById,
  addCustomerMessage,
  closeCustomerIssue,
  reopenCustomerIssue,
  getStaffSupportQueue,
  getStaffIssueById,
  addStaffMessage,
  addStaffInternalNote,
  updateIssueStatus,
  updateIssuePriority,
  assignIssue,
} = require('../controllers/supportController');

// All support routes require authentication
router.use(authenticate);

// 1. Staff Support Operations Routes (Must be declared before customer :id route to prevent path collisions)
router.get('/staff/queue', authorize('staff', 'admin'), sensitiveApiLimiter, getStaffSupportQueue);
router.get('/staff/issues/:id', authorize('staff', 'admin'), sensitiveApiLimiter, getStaffIssueById);
router.post('/staff/issues/:id/messages', authorize('staff', 'admin'), sensitiveApiLimiter, addStaffMessage);
router.post('/staff/issues/:id/internal-notes', authorize('staff', 'admin'), sensitiveApiLimiter, addStaffInternalNote);
router.patch('/staff/issues/:id/status', authorize('staff', 'admin'), sensitiveApiLimiter, updateIssueStatus);
router.patch('/staff/issues/:id/priority', authorize('staff', 'admin'), sensitiveApiLimiter, updateIssuePriority);
router.patch('/staff/issues/:id/assign', authorize('staff', 'admin'), sensitiveApiLimiter, assignIssue);

// 2. Admin Support Operations Routes
router.get('/admin/queue', authorize('admin'), sensitiveApiLimiter, getStaffSupportQueue);
router.get('/admin/issues/:id', authorize('admin'), sensitiveApiLimiter, getStaffIssueById);

// 3. Customer Support Routes
router.post('/issues', authorize('customer'), sensitiveApiLimiter, createCustomerIssue);
router.get('/issues', authorize('customer'), sensitiveApiLimiter, getCustomerIssues);
router.get('/issues/:id', authorize('customer'), sensitiveApiLimiter, getCustomerIssueById);
router.post('/issues/:id/messages', authorize('customer'), sensitiveApiLimiter, addCustomerMessage);
router.post('/issues/:id/close', authorize('customer'), sensitiveApiLimiter, closeCustomerIssue);
router.post('/issues/:id/reopen', authorize('customer'), sensitiveApiLimiter, reopenCustomerIssue);

module.exports = router;
