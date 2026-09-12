const mongoose = require('mongoose');
const User = require('../models/User');
const Game = require('../models/Game');
const Resource = require('../models/Resource');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const { hashPassword } = require('../utils/password');

/**
 * Returns Admin Business & Operational Dashboard Summary
 */
const getDashboardSummary = async () => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // 1. Today's Bookings & Status breakdown
  const todaysBookings = await Booking.find({
    startAt: { $gte: startOfDay, $lte: endOfDay },
  });

  const bookingCounts = {
    totalToday: todaysBookings.length,
    confirmed: todaysBookings.filter((b) => b.status === 'confirmed').length,
    checkedIn: todaysBookings.filter((b) => b.status === 'checked_in').length,
    inProgress: todaysBookings.filter((b) => b.status === 'in_progress').length,
    completed: todaysBookings.filter((b) => b.status === 'completed').length,
    cancelled: todaysBookings.filter((b) => b.status === 'cancelled').length,
    noShow: todaysBookings.filter((b) => b.status === 'no_show').length,
  };

  // 2. Today's Total Revenue from completed or paid bookings
  const todaysPaidPayments = await Payment.find({
    createdAt: { $gte: startOfDay, $lte: endOfDay },
    status: 'paid',
  });

  const todaysRevenue = todaysPaidPayments.reduce((sum, p) => sum + p.amount, 0);

  // 3. Active Games & Resources count
  const [activeGamesCount, totalResourcesCount, activeResourcesCount] = await Promise.all([
    Game.countDocuments({ isActive: true }),
    Resource.countDocuments({}),
    Resource.countDocuments({ isActive: true, status: 'available' }),
  ]);

  // 4. Recent Bookings (Last 5)
  const recentBookings = await Booking.find({})
    .populate('userId', 'name email')
    .populate('gameId', 'title')
    .populate('resourceId', 'name')
    .sort({ createdAt: -1 })
    .limit(5);

  // 5. Recent Payments (Last 5)
  const recentPayments = await Payment.find({})
    .populate('userId', 'name email')
    .populate('bookingId', 'totalAmount status')
    .sort({ createdAt: -1 })
    .limit(5);

  return {
    date: startOfDay.toISOString().split('T')[0],
    metrics: {
      todaysRevenue,
      activeGamesCount,
      activeResourcesCount,
      totalResourcesCount,
      bookingCounts,
    },
    recentBookings,
    recentPayments,
  };
};

/**
 * Returns list of all resources across all games with optional filters
 */
const getAllResources = async (queryOptions = {}) => {
  const filter = {};

  if (queryOptions.gameId) {
    filter.gameId = queryOptions.gameId;
  }

  if (queryOptions.status && queryOptions.status !== 'all') {
    filter.status = queryOptions.status;
  }

  if (queryOptions.isActive !== undefined && queryOptions.isActive !== 'all') {
    filter.isActive = queryOptions.isActive === 'true';
  }

  const page = Math.max(1, parseInt(queryOptions.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(queryOptions.limit, 10) || 50));
  const skip = (page - 1) * limit;

  const [resources, total] = await Promise.all([
    Resource.find(filter)
      .populate('gameId', 'title category basePricePerHour')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Resource.countDocuments(filter),
  ]);

  return {
    resources,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Returns paginated bookings with search & filtering
 */
const getAllBookings = async (queryOptions = {}) => {
  const filter = {};

  if (queryOptions.status && queryOptions.status !== 'all') {
    filter.status = queryOptions.status;
  }

  if (queryOptions.gameId) {
    filter.gameId = queryOptions.gameId;
  }

  if (queryOptions.resourceId) {
    filter.resourceId = queryOptions.resourceId;
  }

  if (queryOptions.date) {
    const targetDateStr = queryOptions.date;
    const dateParts = targetDateStr.split('-');
    if (dateParts.length === 3) {
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const day = parseInt(dateParts[2], 10);
      const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
      filter.startAt = { $gte: startOfDay, $lte: endOfDay };
    }
  }

  if (queryOptions.search && queryOptions.search.trim()) {
    const searchClean = queryOptions.search.trim();
    if (mongoose.Types.ObjectId.isValid(searchClean)) {
      filter._id = searchClean;
    } else {
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: searchClean, $options: 'i' } },
          { email: { $regex: searchClean, $options: 'i' } },
          { phone: { $regex: searchClean, $options: 'i' } },
        ],
      }).select('_id');
      filter.userId = { $in: matchingUsers.map((u) => u._id) };
    }
  }

  const page = Math.max(1, parseInt(queryOptions.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(queryOptions.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate('userId', 'name email phone role')
      .populate('gameId', 'title category')
      .populate('resourceId', 'name status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Booking.countDocuments(filter),
  ]);

  return {
    bookings,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Returns single booking details for Admin
 */
const getBookingById = async (bookingId) => {
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    const error = new Error('Invalid Booking ID format');
    error.statusCode = 400;
    throw error;
  }

  const booking = await Booking.findById(bookingId)
    .populate('userId', 'name email phone role createdAt')
    .populate('gameId', 'title category basePricePerHour')
    .populate('resourceId', 'name status customPricePerHour')
    .populate('cancelledBy', 'name email role')
    .populate('checkedInBy', 'name email role');

  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    throw error;
  }

  // Fetch associated payment if exists
  const payment = await Payment.findOne({ bookingId: booking._id });

  return {
    booking,
    payment: payment || null,
  };
};

/**
 * Returns paginated customer users
 */
const getCustomers = async (queryOptions = {}) => {
  const filter = { role: 'customer' };

  if (queryOptions.search && queryOptions.search.trim()) {
    const cleanSearch = queryOptions.search.trim();
    filter.$or = [
      { name: { $regex: cleanSearch, $options: 'i' } },
      { email: { $regex: cleanSearch, $options: 'i' } },
      { phone: { $regex: cleanSearch, $options: 'i' } },
    ];
  }

  const page = Math.max(1, parseInt(queryOptions.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(queryOptions.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [customers, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    customers,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Returns single customer details and booking history
 */
const getCustomerById = async (customerId) => {
  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    const error = new Error('Invalid Customer ID format');
    error.statusCode = 400;
    throw error;
  }

  const customer = await User.findOne({ _id: customerId, role: 'customer' }).select('-passwordHash');
  if (!customer) {
    const error = new Error('Customer not found');
    error.statusCode = 404;
    throw error;
  }

  const bookings = await Booking.find({ userId: customer._id })
    .populate('gameId', 'title')
    .populate('resourceId', 'name')
    .sort({ createdAt: -1 });

  return {
    customer,
    bookings,
  };
};

/**
 * Returns paginated staff users
 */
const getStaffList = async (queryOptions = {}) => {
  const filter = { role: 'staff' };

  if (queryOptions.search && queryOptions.search.trim()) {
    const cleanSearch = queryOptions.search.trim();
    filter.$or = [
      { name: { $regex: cleanSearch, $options: 'i' } },
      { email: { $regex: cleanSearch, $options: 'i' } },
      { phone: { $regex: cleanSearch, $options: 'i' } },
    ];
  }

  const page = Math.max(1, parseInt(queryOptions.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(queryOptions.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [staffList, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    staff: staffList,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Securely creates a staff user (locked to role: 'staff')
 */
const createStaffUser = async (adminUserId, payload = {}) => {
  const { name, email, phone, password } = payload;

  if (!name || !email || !phone || !password) {
    const error = new Error('Name, email, phone, and password are required');
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const error = new Error('An account with this email already exists');
    error.statusCode = 409;
    throw error;
  }

  const pwdHash = await hashPassword(password);

  const newStaff = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    phone: phone.trim(),
    passwordHash: pwdHash,
    role: 'staff',
    isVerified: true,
  });

  return {
    id: newStaff._id,
    name: newStaff.name,
    email: newStaff.email,
    phone: newStaff.phone,
    role: newStaff.role,
    isVerified: newStaff.isVerified,
    createdAt: newStaff.createdAt,
  };
};

/**
 * Updates staff user profile details
 */
const updateStaffUser = async (staffId, payload = {}) => {
  if (!mongoose.Types.ObjectId.isValid(staffId)) {
    const error = new Error('Invalid Staff ID format');
    error.statusCode = 400;
    throw error;
  }

  const staffUser = await User.findOne({ _id: staffId, role: 'staff' });
  if (!staffUser) {
    const error = new Error('Staff user not found');
    error.statusCode = 404;
    throw error;
  }

  if (payload.name) staffUser.name = payload.name.trim();
  if (payload.phone) staffUser.phone = payload.phone.trim();

  await staffUser.save();

  return {
    id: staffUser._id,
    name: staffUser.name,
    email: staffUser.email,
    phone: staffUser.phone,
    role: staffUser.role,
  };
};

/**
 * Returns paginated payment transactions
 */
const getAllPayments = async (queryOptions = {}) => {
  const filter = {};

  if (queryOptions.status && queryOptions.status !== 'all') {
    filter.status = queryOptions.status;
  }

  if (queryOptions.search && queryOptions.search.trim()) {
    const cleanSearch = queryOptions.search.trim();
    filter.$or = [
      { providerOrderId: { $regex: cleanSearch, $options: 'i' } },
      { providerPaymentId: { $regex: cleanSearch, $options: 'i' } },
    ];
  }

  const page = Math.max(1, parseInt(queryOptions.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(queryOptions.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate('userId', 'name email phone')
      .populate('bookingId', 'totalAmount status startAt endAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Payment.countDocuments(filter),
  ]);

  return {
    payments,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Returns single payment details for Admin
 */
const getPaymentById = async (paymentId) => {
  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    const error = new Error('Invalid Payment ID format');
    error.statusCode = 400;
    throw error;
  }

  const payment = await Payment.findById(paymentId)
    .populate('userId', 'name email phone role')
    .populate({
      path: 'bookingId',
      populate: [{ path: 'gameId', select: 'title' }, { path: 'resourceId', select: 'name' }],
    });

  if (!payment) {
    const error = new Error('Payment record not found');
    error.statusCode = 404;
    throw error;
  }

  return payment;
};

module.exports = {
  getDashboardSummary,
  getAllResources,
  getAllBookings,
  getBookingById,
  getCustomers,
  getCustomerById,
  getStaffList,
  createStaffUser,
  updateStaffUser,
  getAllPayments,
  getPaymentById,
};
