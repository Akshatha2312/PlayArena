const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Game = require('../models/Game');
const Resource = require('../models/Resource');
const User = require('../models/User');
const { createBooking } = require('./bookingService');

/**
 * Valid state transitions for staff session lifecycle:
 * - confirmed -> checked_in
 * - checked_in -> in_progress
 * - in_progress -> completed
 * - confirmed / checked_in -> no_show
 */
const VALID_TRANSITIONS = {
  confirmed: ['checked_in', 'no_show'],
  checked_in: ['in_progress', 'no_show'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
  no_show: [],
};

/**
 * Returns today's operations dashboard summary.
 */
const getDashboardSummary = async () => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // 1. Fetch today's bookings
  const todaysBookings = await Booking.find({
    startAt: { $gte: startOfDay, $lte: endOfDay },
  }).select('status startAt endAt resourceId gameId');

  const counts = {
    totalToday: todaysBookings.length,
    upcoming: todaysBookings.filter((b) => b.status === 'confirmed').length,
    checkedIn: todaysBookings.filter((b) => b.status === 'checked_in').length,
    inProgress: todaysBookings.filter((b) => b.status === 'in_progress').length,
    completed: todaysBookings.filter((b) => b.status === 'completed').length,
    cancelled: todaysBookings.filter((b) => b.status === 'cancelled').length,
    noShow: todaysBookings.filter((b) => b.status === 'no_show').length,
  };

  // 2. Resource occupancy status
  const allResources = await Resource.find({}).populate('gameId', 'title');
  
  // Find currently active bookings across all resources
  const currentActiveBookings = await Booking.find({
    status: { $in: ['checked_in', 'in_progress'] },
    startAt: { $lte: now },
    endAt: { $gte: now },
  });

  const activeResourceIds = new Set(currentActiveBookings.map((b) => b.resourceId.toString()));

  const resourceOccupancy = allResources.map((res) => {
    let occupancyState = 'available';
    if (res.status !== 'available') {
      occupancyState = res.status; // maintenance, out_of_service
    } else if (activeResourceIds.has(res._id.toString())) {
      occupancyState = 'occupied';
    }

    return {
      _id: res._id,
      name: res.name,
      gameTitle: res.gameId?.title || 'Unknown Game',
      status: res.status,
      isActive: res.isActive,
      occupancyState,
    };
  });

  return {
    date: startOfDay.toISOString().split('T')[0],
    counts,
    resourceOccupancy,
  };
};

/**
 * Returns filtered schedule for staff console.
 */
const getSchedule = async (queryOptions = {}) => {
  const filter = {};

  // Date filter (defaults to current date if not specified)
  const targetDateStr = queryOptions.date || new Date().toISOString().split('T')[0];
  const dateParts = targetDateStr.split('-');
  if (dateParts.length === 3) {
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const day = parseInt(dateParts[2], 10);
    const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
    filter.startAt = { $gte: startOfDay, $lte: endOfDay };
  }

  if (queryOptions.status && queryOptions.status !== 'all') {
    filter.status = queryOptions.status;
  }

  if (queryOptions.gameId) {
    filter.gameId = queryOptions.gameId;
  }

  if (queryOptions.resourceId) {
    filter.resourceId = queryOptions.resourceId;
  }

  const page = Math.max(1, parseInt(queryOptions.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(queryOptions.limit, 10) || 50));
  const skip = (page - 1) * limit;

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate('userId', 'name email phone role')
      .populate('gameId', 'title category')
      .populate('resourceId', 'name status')
      .sort({ startAt: 1 })
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
 * Returns single booking details for staff.
 */
const getBookingDetails = async (bookingId) => {
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    const error = new Error('Invalid Booking ID format');
    error.statusCode = 400;
    throw error;
  }

  const booking = await Booking.findById(bookingId)
    .populate('userId', 'name email phone role')
    .populate('gameId', 'title category basePricePerHour minBookingDurationMinutes')
    .populate('resourceId', 'name status customPricePerHour')
    .populate('cancelledBy', 'name email role')
    .populate('checkedInBy', 'name email role');

  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    throw error;
  }

  return booking;
};

/**
 * Lookup booking by reference ID, customer email, or customer phone.
 */
const lookupBooking = async (queryStr) => {
  if (!queryStr || typeof queryStr !== 'string' || !queryStr.trim()) {
    const error = new Error('Lookup search query is required');
    error.statusCode = 400;
    throw error;
  }

  const cleanQuery = queryStr.trim();

  // 1. If valid ObjectId, try finding directly by Booking ID
  if (mongoose.Types.ObjectId.isValid(cleanQuery)) {
    const booking = await Booking.findById(cleanQuery)
      .populate('userId', 'name email phone')
      .populate('gameId', 'title')
      .populate('resourceId', 'name');
    if (booking) {
      return [booking];
    }
  }

  // 2. Search users matching email or phone
  const matchingUsers = await User.find({
    $or: [
      { email: { $regex: cleanQuery, $options: 'i' } },
      { phone: { $regex: cleanQuery, $options: 'i' } },
      { name: { $regex: cleanQuery, $options: 'i' } },
    ],
  }).select('_id');

  const userIds = matchingUsers.map((u) => u._id);

  const bookings = await Booking.find({
    $or: [{ _id: mongoose.Types.ObjectId.isValid(cleanQuery) ? cleanQuery : null }, { userId: { $in: userIds } }],
  })
    .populate('userId', 'name email phone')
    .populate('gameId', 'title')
    .populate('resourceId', 'name')
    .sort({ startAt: -1 })
    .limit(10);

  return bookings;
};

/**
 * Staff Check-in action (confirmed -> checked_in)
 */
const performCheckIn = async (bookingId, staffUserId) => {
  const booking = await getBookingDetails(bookingId);

  if (!VALID_TRANSITIONS[booking.status]?.includes('checked_in')) {
    const error = new Error(`Cannot check in a booking with status '${booking.status}'`);
    error.statusCode = 400;
    throw error;
  }

  booking.status = 'checked_in';
  booking.checkedInAt = new Date();
  booking.checkedInBy = staffUserId;

  await booking.save();
  return booking;
};

/**
 * Staff Start Session action (checked_in -> in_progress)
 */
const startSession = async (bookingId, staffUserId) => {
  const booking = await getBookingDetails(bookingId);

  if (!VALID_TRANSITIONS[booking.status]?.includes('in_progress')) {
    const error = new Error(`Cannot start session for a booking with status '${booking.status}'`);
    error.statusCode = 400;
    throw error;
  }

  booking.status = 'in_progress';
  booking.startedAt = new Date();

  await booking.save();
  return booking;
};

/**
 * Staff Complete Session action (in_progress -> completed)
 */
const completeSession = async (bookingId, staffUserId) => {
  const booking = await getBookingDetails(bookingId);

  if (!VALID_TRANSITIONS[booking.status]?.includes('completed')) {
    const error = new Error(`Cannot complete session for a booking with status '${booking.status}'`);
    error.statusCode = 400;
    throw error;
  }

  booking.status = 'completed';
  booking.completedAt = new Date();

  await booking.save();
  return booking;
};

/**
 * Staff No-Show action (confirmed / checked_in -> no_show)
 */
const markNoShow = async (bookingId, staffUserId) => {
  const booking = await getBookingDetails(bookingId);

  if (!VALID_TRANSITIONS[booking.status]?.includes('no_show')) {
    const error = new Error(`Cannot mark no-show for a booking with status '${booking.status}'`);
    error.statusCode = 400;
    throw error;
  }

  booking.status = 'no_show';
  booking.noShowAt = new Date();

  await booking.save();
  return booking;
};

/**
 * Staff Walk-In Booking Creation
 * Uses standard booking creation pipeline to enforce availability & lock protection.
 */
const createWalkInBooking = async (staffUserId, payload = {}) => {
  let targetUserId = payload.userId;

  // If customer email/phone specified instead of userId, locate or use staff identity
  if (!targetUserId && payload.customerEmail) {
    const existingCustomer = await User.findOne({ email: payload.customerEmail.toLowerCase().trim() });
    if (existingCustomer) {
      targetUserId = existingCustomer._id.toString();
    }
  }

  if (!targetUserId) {
    targetUserId = staffUserId; // Fallback to staff user ID if generic walk-in guest
  }

  const booking = await createBooking(targetUserId, payload);
  
  // Walk-ins created on site can optionally be auto-checked-in if requested
  if (payload.autoCheckIn !== false) {
    booking.status = 'checked_in';
    booking.checkedInAt = new Date();
    booking.checkedInBy = staffUserId;
    await booking.save();
  }

  return booking;
};

module.exports = {
  getDashboardSummary,
  getSchedule,
  getBookingDetails,
  lookupBooking,
  performCheckIn,
  startSession,
  completeSession,
  markNoShow,
  createWalkInBooking,
};
