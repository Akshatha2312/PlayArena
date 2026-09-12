const paymentService = require('../services/paymentService');

const createOrder = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Booking ID is required',
      });
    }

    const orderData = await paymentService.createPaymentOrder(userId, bookingId);

    res.status(200).json({
      status: 'success',
      message: 'Razorpay order created successfully',
      data: orderData,
    });
  } catch (error) {
    next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const result = await paymentService.verifyPayment(userId, {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    res.status(200).json({
      status: 'success',
      message: result.message,
      data: {
        payment: result.payment,
        booking: result.booking,
      },
    });
  } catch (error) {
    next(error);
  }
};

const handleWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.body; // Buffer or String captured by express.raw()

    if (!signature) {
      return res.status(400).json({
        status: 'fail',
        message: 'Missing x-razorpay-signature header',
      });
    }

    if (!rawBody) {
      return res.status(400).json({
        status: 'fail',
        message: 'Missing raw request body',
      });
    }

    const result = await paymentService.handleWebhook(rawBody, signature);

    res.status(200).json({
      status: 'success',
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

const getMyPayments = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const result = await paymentService.getCustomerPayments(userId, req.query);

    res.status(200).json({
      status: 'success',
      data: result.payments,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

const getPaymentById = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const paymentId = req.params.id;

    const payment = await paymentService.getCustomerPaymentById(userId, paymentId);

    res.status(200).json({
      status: 'success',
      data: {
        payment,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  handleWebhook,
  getMyPayments,
  getPaymentById,
};
