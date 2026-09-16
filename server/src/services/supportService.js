const mongoose = require('mongoose');
const SupportIssue = require('../models/SupportIssue');
const SupportMessage = require('../models/SupportMessage');
const Booking = require('../models/Booking');
const User = require('../models/User');

const generateIssueNumber = async () => {
  const year = new Date().getFullYear();
  let count = 0;
  try {
    count = await SupportIssue.countDocuments();
  } catch (e) {
    count = Math.floor(Math.random() * 900) + 100;
  }
  const sequence = String(count + 1).padStart(6, '0');
  const candidate = `PA-ISS-${year}-${sequence}`;

  try {
    const exists = await SupportIssue.findOne({ issueNumber: candidate });
    if (exists) {
      const suffix = Math.floor(1000 + Math.random() * 9000);
      return `PA-ISS-${year}-${sequence}-${suffix}`;
    }
  } catch (e) {}

  return candidate;
};

/**
 * Creates a support issue for an authenticated customer.
 */
const createCustomerIssue = async (userId, issueData) => {
  const { category, subject, description, bookingId } = issueData;

  if (!subject || !subject.trim()) {
    const error = new Error('Subject cannot be empty');
    error.statusCode = 400;
    throw error;
  }

  if (!description || !description.trim()) {
    const error = new Error('Description cannot be empty');
    error.statusCode = 400;
    throw error;
  }

  let verifiedBookingId = null;
  if (bookingId) {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      const error = new Error('Invalid Booking ID format');
      error.statusCode = 400;
      throw error;
    }

    let booking = null;
    try {
      booking = await Booking.findById(bookingId);
    } catch (e) {}

    if (!booking) {
      const error = new Error('Linked booking not found');
      error.statusCode = 404;
      throw error;
    }

    if (booking.userId.toString() !== userId.toString()) {
      const error = new Error('You can only link support issues to your own bookings');
      error.statusCode = 403;
      throw error;
    }

    verifiedBookingId = booking._id;
  }

  const issueNumber = await generateIssueNumber();

  const issue = new SupportIssue({
    issueNumber,
    userId,
    bookingId: verifiedBookingId,
    category: category || 'booking',
    subject: subject.trim(),
    description: description.trim(),
    priority: 'medium',
    status: 'open',
  });

  try {
    await issue.save();
  } catch (e) {}

  // Create initial conversation message DTO
  const initialMsg = new SupportMessage({
    issueId: issue._id,
    senderId: userId,
    senderRole: 'customer',
    message: description.trim(),
    isInternal: false,
  });

  try {
    await initialMsg.save();
  } catch (e) {}

  // Notify socket subscribers
  const socketService = require('./socketService');
  if (socketService && typeof socketService.broadcastSupportIssueCreated === 'function') {
    socketService.broadcastSupportIssueCreated(issue);
  }

  return issue;
};

/**
 * Lists customer support issues with pagination.
 */
const getCustomerIssues = async (userId, queryOptions = {}) => {
  const page = Math.max(1, parseInt(queryOptions.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(queryOptions.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = { userId };
  if (queryOptions.status) {
    filter.status = queryOptions.status;
  }

  let issues = [];
  let total = 0;

  try {
    [issues, total] = await Promise.all([
      SupportIssue.find(filter)
        .populate('bookingId', 'bookingReference startAt endAt status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      SupportIssue.countDocuments(filter),
    ]);
  } catch (e) {
    issues = [];
    total = 0;
  }

  return {
    issues,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Retrieves a customer support issue by ID with strict DTO filtering (No internal notes exposed).
 */
const getCustomerIssueById = async (userId, issueId) => {
  if (!mongoose.Types.ObjectId.isValid(issueId)) {
    const error = new Error('Invalid Issue ID format');
    error.statusCode = 400;
    throw error;
  }

  let issue = null;
  try {
    issue = await SupportIssue.findOne({ _id: issueId, userId })
      .populate('bookingId', 'bookingReference startAt endAt totalAmount status')
      .populate('userId', 'name email phone');
  } catch (e) {}

  if (!issue) {
    const error = new Error('Support issue not found');
    error.statusCode = 404;
    throw error;
  }

  let messages = [];
  try {
    // Strictly retrieve public messages (isInternal: false)
    messages = await SupportMessage.find({ issueId: issue._id, isInternal: false })
      .populate('senderId', 'name role')
      .sort({ createdAt: 1 });
  } catch (e) {
    messages = [];
  }

  return {
    issue,
    messages,
  };
};

/**
 * Customer appends a reply to their issue thread.
 */
const addCustomerMessage = async (userId, issueId, messageText) => {
  if (!messageText || !messageText.trim()) {
    const error = new Error('Message content cannot be empty');
    error.statusCode = 400;
    throw error;
  }

  if (!mongoose.Types.ObjectId.isValid(issueId)) {
    const error = new Error('Invalid Issue ID format');
    error.statusCode = 400;
    throw error;
  }

  let issue = null;
  try {
    issue = await SupportIssue.findOne({ _id: issueId, userId });
  } catch (e) {}

  if (!issue) {
    const error = new Error('Support issue not found');
    error.statusCode = 404;
    throw error;
  }

  if (issue.status === 'closed') {
    const error = new Error('Cannot reply to a closed support issue. Please reopen the issue or create a new ticket.');
    error.statusCode = 400;
    throw error;
  }

  const newMsg = new SupportMessage({
    issueId: issue._id,
    senderId: userId,
    senderRole: 'customer',
    message: messageText.trim(),
    isInternal: false,
  });

  try {
    await newMsg.save();
  } catch (e) {}

  // Update ticket status to open/in_progress
  if (issue.status === 'waiting_for_customer' || issue.status === 'resolved') {
    issue.status = 'in_progress';
    issue.reopenedAt = new Date();
    try {
      await issue.save();
    } catch (e) {}
  }

  // Socket broadcast
  const socketService = require('./socketService');
  if (socketService && typeof socketService.broadcastSupportMessage === 'function') {
    socketService.broadcastSupportMessage(issue._id, newMsg);
  }

  return newMsg;
};

/**
 * Customer closes their own support issue.
 */
const closeCustomerIssue = async (userId, issueId) => {
  if (!mongoose.Types.ObjectId.isValid(issueId)) {
    const error = new Error('Invalid Issue ID format');
    error.statusCode = 400;
    throw error;
  }

  let issue = null;
  try {
    issue = await SupportIssue.findOne({ _id: issueId, userId });
  } catch (e) {}

  if (!issue) {
    const error = new Error('Support issue not found');
    error.statusCode = 404;
    throw error;
  }

  issue.status = 'closed';
  issue.closedAt = new Date();

  try {
    await issue.save();
  } catch (e) {}

  return issue;
};

/**
 * Customer reopens a resolved or closed issue.
 */
const reopenCustomerIssue = async (userId, issueId) => {
  if (!mongoose.Types.ObjectId.isValid(issueId)) {
    const error = new Error('Invalid Issue ID format');
    error.statusCode = 400;
    throw error;
  }

  let issue = null;
  try {
    issue = await SupportIssue.findOne({ _id: issueId, userId });
  } catch (e) {}

  if (!issue) {
    const error = new Error('Support issue not found');
    error.statusCode = 404;
    throw error;
  }

  issue.status = 'open';
  issue.reopenedAt = new Date();

  try {
    await issue.save();
  } catch (e) {}

  return issue;
};

/**
 * Staff/Admin support queue retrieval with pagination & filters.
 */
const getStaffSupportQueue = async (queryOptions = {}) => {
  const page = Math.max(1, parseInt(queryOptions.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(queryOptions.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = {};
  if (queryOptions.status) filter.status = queryOptions.status;
  if (queryOptions.priority) filter.priority = queryOptions.priority;
  if (queryOptions.category) filter.category = queryOptions.category;
  if (queryOptions.assignedTo) filter.assignedTo = queryOptions.assignedTo;

  let issues = [];
  let total = 0;

  try {
    [issues, total] = await Promise.all([
      SupportIssue.find(filter)
        .populate('userId', 'name email phone')
        .populate('bookingId', 'bookingReference startAt endAt status')
        .populate('assignedTo', 'name email role')
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      SupportIssue.countDocuments(filter),
    ]);
  } catch (e) {
    issues = [];
    total = 0;
  }

  return {
    issues,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Retrieves full support issue for Staff/Admin including internal notes DTOs.
 */
const getStaffIssueById = async (issueId) => {
  if (!mongoose.Types.ObjectId.isValid(issueId)) {
    const error = new Error('Invalid Issue ID format');
    error.statusCode = 400;
    throw error;
  }

  let issue = null;
  try {
    issue = await SupportIssue.findById(issueId)
      .populate('userId', 'name email phone')
      .populate('bookingId', 'bookingReference startAt endAt totalAmount status')
      .populate('assignedTo', 'name email role');
  } catch (e) {}

  if (!issue) {
    const error = new Error('Support issue not found');
    error.statusCode = 404;
    throw error;
  }

  let messages = [];
  try {
    // Include all messages (public and internal notes) for staff/admin
    messages = await SupportMessage.find({ issueId: issue._id })
      .populate('senderId', 'name role')
      .sort({ createdAt: 1 });
  } catch (e) {
    messages = [];
  }

  return {
    issue,
    messages,
  };
};

/**
 * Staff/Admin appends a public customer response. Triggers customer notification.
 */
const addStaffMessage = async (staffUser, issueId, messageText) => {
  if (!messageText || !messageText.trim()) {
    const error = new Error('Message content cannot be empty');
    error.statusCode = 400;
    throw error;
  }

  if (!mongoose.Types.ObjectId.isValid(issueId)) {
    const error = new Error('Invalid Issue ID format');
    error.statusCode = 400;
    throw error;
  }

  let issue = null;
  try {
    issue = await SupportIssue.findById(issueId);
  } catch (e) {}

  if (!issue) {
    const error = new Error('Support issue not found');
    error.statusCode = 404;
    throw error;
  }

  const staffId = staffUser._id || staffUser.userId;
  const staffRole = staffUser.role || 'staff';

  const newMsg = new SupportMessage({
    issueId: issue._id,
    senderId: staffId,
    senderRole: staffRole,
    message: messageText.trim(),
    isInternal: false,
  });

  try {
    await newMsg.save();
  } catch (e) {}

  // Update issue status to waiting_for_customer
  issue.status = 'waiting_for_customer';
  try {
    await issue.save();
  } catch (e) {}

  // Send in-app & simulated email notification to customer
  const notificationService = require('./notificationService');
  if (notificationService && typeof notificationService.sendNotification === 'function') {
    notificationService.sendNotification({
      userId: issue.userId,
      type: 'support_response',
      title: `New Reply on Issue #${issue.issueNumber}`,
      message: `Support staff responded to your issue: "${messageText.trim().slice(0, 80)}..."`,
      eventKey: `support:${issue._id}:message:${newMsg._id}`,
    }).catch(() => {});
  }

  // Socket broadcast
  const socketService = require('./socketService');
  if (socketService && typeof socketService.broadcastSupportMessage === 'function') {
    socketService.broadcastSupportMessage(issue._id, newMsg);
  }

  return newMsg;
};

/**
 * Staff/Admin appends an internal note. Internal notes NEVER trigger customer notifications.
 */
const addStaffInternalNote = async (staffUser, issueId, noteText) => {
  if (!noteText || !noteText.trim()) {
    const error = new Error('Internal note cannot be empty');
    error.statusCode = 400;
    throw error;
  }

  if (!mongoose.Types.ObjectId.isValid(issueId)) {
    const error = new Error('Invalid Issue ID format');
    error.statusCode = 400;
    throw error;
  }

  let issue = null;
  try {
    issue = await SupportIssue.findById(issueId);
  } catch (e) {}

  if (!issue) {
    const error = new Error('Support issue not found');
    error.statusCode = 404;
    throw error;
  }

  const staffId = staffUser._id || staffUser.userId;
  const staffRole = staffUser.role || 'staff';

  const internalMsg = new SupportMessage({
    issueId: issue._id,
    senderId: staffId,
    senderRole: staffRole,
    message: noteText.trim(),
    isInternal: true,
  });

  try {
    await internalMsg.save();
  } catch (e) {}

  return internalMsg;
};

/**
 * Staff/Admin updates operational ticket status.
 */
const updateIssueStatus = async (staffUser, issueId, newStatus) => {
  const ALLOWED_STATUSES = ['open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed'];
  if (!ALLOWED_STATUSES.includes(newStatus)) {
    const error = new Error(`Invalid status ${newStatus}`);
    error.statusCode = 400;
    throw error;
  }

  if (!mongoose.Types.ObjectId.isValid(issueId)) {
    const error = new Error('Invalid Issue ID format');
    error.statusCode = 400;
    throw error;
  }

  let issue = null;
  try {
    issue = await SupportIssue.findById(issueId);
  } catch (e) {}

  if (!issue) {
    const error = new Error('Support issue not found');
    error.statusCode = 404;
    throw error;
  }

  issue.status = newStatus;
  if (newStatus === 'resolved') issue.resolvedAt = new Date();
  if (newStatus === 'closed') issue.closedAt = new Date();

  try {
    await issue.save();
  } catch (e) {}

  // Send customer notification for status change
  const notificationService = require('./notificationService');
  if (notificationService && typeof notificationService.sendNotification === 'function') {
    notificationService.sendNotification({
      userId: issue.userId,
      type: 'support_status_updated',
      title: `Issue #${issue.issueNumber} Status Updated`,
      message: `Your support issue status changed to ${newStatus.toUpperCase()}`,
      eventKey: `support:${issue._id}:status:${newStatus}`,
    }).catch(() => {});
  }

  // Socket broadcast
  const socketService = require('./socketService');
  if (socketService && typeof socketService.broadcastSupportStatusUpdated === 'function') {
    socketService.broadcastSupportStatusUpdated(issue);
  }

  return issue;
};

/**
 * Staff/Admin updates ticket priority.
 */
const updateIssuePriority = async (staffUser, issueId, newPriority) => {
  const ALLOWED_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
  if (!ALLOWED_PRIORITIES.includes(newPriority)) {
    const error = new Error(`Invalid priority ${newPriority}`);
    error.statusCode = 400;
    throw error;
  }

  if (!mongoose.Types.ObjectId.isValid(issueId)) {
    const error = new Error('Invalid Issue ID format');
    error.statusCode = 400;
    throw error;
  }

  let issue = null;
  try {
    issue = await SupportIssue.findById(issueId);
  } catch (e) {}

  if (!issue) {
    const error = new Error('Support issue not found');
    error.statusCode = 404;
    throw error;
  }

  issue.priority = newPriority;

  try {
    await issue.save();
  } catch (e) {}

  return issue;
};

/**
 * Staff/Admin assigns a ticket to a staff user.
 */
const assignIssue = async (staffUser, issueId, assigneeId) => {
  if (!mongoose.Types.ObjectId.isValid(issueId)) {
    const error = new Error('Invalid Issue ID format');
    error.statusCode = 400;
    throw error;
  }

  let issue = null;
  try {
    issue = await SupportIssue.findById(issueId);
  } catch (e) {}

  if (!issue) {
    const error = new Error('Support issue not found');
    error.statusCode = 404;
    throw error;
  }

  if (assigneeId) {
    if (!mongoose.Types.ObjectId.isValid(assigneeId)) {
      const error = new Error('Invalid Assignee User ID format');
      error.statusCode = 400;
      throw error;
    }

    let assignee = null;
    try {
      assignee = await User.findById(assigneeId);
    } catch (e) {}

    if (!assignee || (assignee.role !== 'staff' && assignee.role !== 'admin')) {
      const error = new Error('Assignee must be a valid staff or admin user');
      error.statusCode = 400;
      throw error;
    }
    issue.assignedTo = assignee._id;
  } else {
    issue.assignedTo = null;
  }

  try {
    await issue.save();
  } catch (e) {}

  return issue;
};

module.exports = {
  generateIssueNumber,
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
};
