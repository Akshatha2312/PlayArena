const invoiceService = require('../services/invoiceService');

const getCustomerInvoices = async (req, res, next) => {
  try {
    const result = await invoiceService.getCustomerInvoices(req.user.userId, req.query);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getCustomerInvoiceById = async (req, res, next) => {
  try {
    const invoice = await invoiceService.getCustomerInvoiceById(req.user.userId, req.params.id);
    res.status(200).json({
      status: 'success',
      data: { invoice },
    });
  } catch (error) {
    next(error);
  }
};

const getInvoiceByBookingId = async (req, res, next) => {
  try {
    const invoice = await invoiceService.getInvoiceByBookingId(req.user.userId, req.params.bookingId);
    res.status(200).json({
      status: 'success',
      data: { invoice },
    });
  } catch (error) {
    next(error);
  }
};

const getAdminInvoices = async (req, res, next) => {
  try {
    const result = await invoiceService.getAdminInvoices(req.query);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getAdminInvoiceById = async (req, res, next) => {
  try {
    const invoice = await invoiceService.getAdminInvoiceById(req.params.id);
    res.status(200).json({
      status: 'success',
      data: { invoice },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomerInvoices,
  getCustomerInvoiceById,
  getInvoiceByBookingId,
  getAdminInvoices,
  getAdminInvoiceById,
};
