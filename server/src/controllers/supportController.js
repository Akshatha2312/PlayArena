const supportService = require('../services/supportService');

// Customer Handlers
const createCustomerIssue = async (req, res, next) => {
  try {
    const issue = await supportService.createCustomerIssue(req.user.userId, req.body);
    return res.status(201).json({
      status: 'success',
      message: 'Support issue submitted successfully',
      data: { issue },
    });
  } catch (error) {
    next(error);
  }
};

const getCustomerIssues = async (req, res, next) => {
  try {
    const data = await supportService.getCustomerIssues(req.user.userId, req.query);
    return res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

const getCustomerIssueById = async (req, res, next) => {
  try {
    const data = await supportService.getCustomerIssueById(req.user.userId, req.params.id);
    return res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

const addCustomerMessage = async (req, res, next) => {
  try {
    const message = await supportService.addCustomerMessage(req.user.userId, req.params.id, req.body.message);
    return res.status(201).json({
      status: 'success',
      message: 'Reply sent successfully',
      data: { message },
    });
  } catch (error) {
    next(error);
  }
};

const closeCustomerIssue = async (req, res, next) => {
  try {
    const issue = await supportService.closeCustomerIssue(req.user.userId, req.params.id);
    return res.status(200).json({
      status: 'success',
      message: 'Issue closed successfully',
      data: { issue },
    });
  } catch (error) {
    next(error);
  }
};

const reopenCustomerIssue = async (req, res, next) => {
  try {
    const issue = await supportService.reopenCustomerIssue(req.user.userId, req.params.id);
    return res.status(200).json({
      status: 'success',
      message: 'Issue reopened successfully',
      data: { issue },
    });
  } catch (error) {
    next(error);
  }
};

// Staff / Admin Handlers
const getStaffSupportQueue = async (req, res, next) => {
  try {
    const data = await supportService.getStaffSupportQueue(req.query);
    return res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

const getStaffIssueById = async (req, res, next) => {
  try {
    const data = await supportService.getStaffIssueById(req.params.id);
    return res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

const addStaffMessage = async (req, res, next) => {
  try {
    const message = await supportService.addStaffMessage(req.user, req.params.id, req.body.message);
    return res.status(201).json({
      status: 'success',
      message: 'Response sent to customer',
      data: { message },
    });
  } catch (error) {
    next(error);
  }
};

const addStaffInternalNote = async (req, res, next) => {
  try {
    const note = await supportService.addStaffInternalNote(req.user, req.params.id, req.body.note);
    return res.status(201).json({
      status: 'success',
      message: 'Internal note saved',
      data: { note },
    });
  } catch (error) {
    next(error);
  }
};

const updateIssueStatus = async (req, res, next) => {
  try {
    const issue = await supportService.updateIssueStatus(req.user, req.params.id, req.body.status);
    return res.status(200).json({
      status: 'success',
      message: 'Issue status updated',
      data: { issue },
    });
  } catch (error) {
    next(error);
  }
};

const updateIssuePriority = async (req, res, next) => {
  try {
    const issue = await supportService.updateIssuePriority(req.user, req.params.id, req.body.priority);
    return res.status(200).json({
      status: 'success',
      message: 'Issue priority updated',
      data: { issue },
    });
  } catch (error) {
    next(error);
  }
};

const assignIssue = async (req, res, next) => {
  try {
    const issue = await supportService.assignIssue(req.user, req.params.id, req.body.assigneeId);
    return res.status(200).json({
      status: 'success',
      message: 'Issue assignment updated',
      data: { issue },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
