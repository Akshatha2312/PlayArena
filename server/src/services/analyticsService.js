const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Game = require('../models/Game');
const Resource = require('../models/Resource');
const User = require('../models/User');

/**
 * Parses and validates date range parameters from query.
 * Enforces half-open date range [startDate, endDate) in UTC.
 */
const parseDateRange = (query = {}) => {
  const preset = query.preset || 'last30days';
  let startDate;
  let endDate;
  let groupBy = query.groupBy;

  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  if (preset === 'today') {
    startDate = new Date(todayUtc);
    endDate = new Date(todayUtc);
    endDate.setUTCDate(endDate.getUTCDate() + 1);
  } else if (preset === 'yesterday') {
    startDate = new Date(todayUtc);
    startDate.setUTCDate(startDate.getUTCDate() - 1);
    endDate = new Date(todayUtc);
  } else if (preset === 'last7days') {
    startDate = new Date(todayUtc);
    startDate.setUTCDate(startDate.getUTCDate() - 6);
    endDate = new Date(todayUtc);
    endDate.setUTCDate(endDate.getUTCDate() + 1);
  } else if (preset === 'last30days') {
    startDate = new Date(todayUtc);
    startDate.setUTCDate(startDate.getUTCDate() - 29);
    endDate = new Date(todayUtc);
    endDate.setUTCDate(endDate.getUTCDate() + 1);
  } else if (preset === 'thisMonth') {
    startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  } else if (preset === 'previousMonth') {
    startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  } else if (preset === 'custom') {
    if (!query.startDate || !query.endDate) {
      const err = new Error('Custom date range requires both startDate and endDate parameters');
      err.statusCode = 400;
      throw err;
    }
    startDate = new Date(query.startDate);
    endDate = new Date(query.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      const err = new Error('Invalid startDate or endDate format. Use valid ISO date strings');
      err.statusCode = 400;
      throw err;
    }

    if (startDate > endDate) {
      const err = new Error('startDate cannot be after endDate');
      err.statusCode = 400;
      throw err;
    }

    // Max 366 days range limit
    const diffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
    if (diffDays > 366) {
      const err = new Error('Date range cannot exceed 366 days');
      err.statusCode = 400;
      throw err;
    }
  } else {
    const err = new Error(`Invalid preset '${preset}'. Supported presets: today, yesterday, last7days, last30days, thisMonth, previousMonth, custom`);
    err.statusCode = 400;
    throw err;
  }

  // Determine default groupBy if not provided or invalid
  const validGroupings = ['day', 'week', 'month'];
  if (!groupBy || !validGroupings.includes(groupBy)) {
    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
    if (diffDays <= 2) {
      groupBy = 'day';
    } else if (diffDays <= 60) {
      groupBy = 'day';
    } else if (diffDays <= 180) {
      groupBy = 'week';
    } else {
      groupBy = 'month';
    }
  }

  return {
    preset,
    startDate,
    endDate,
    groupBy,
  };
};

/**
 * Overview Metrics Endpoint Implementation
 */
const getOverview = async (query = {}) => {
  const { preset, startDate, endDate } = parseDateRange(query);

  // 1. Bookings in range
  const bookingMatch = {
    startAt: { $gte: startDate, $lt: endDate },
  };

  const bookingStatsPipeline = [
    { $match: bookingMatch },
    {
      $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
        checkedIn: { $sum: { $cond: [{ $eq: ['$status', 'checked_in'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        noShow: { $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] } },
        totalDuration: { $sum: '$durationMinutes' },
        totalValue: { $sum: '$totalAmount' },
      },
    },
  ];

  // 2. Payments in range (Successful paid payments)
  const paymentMatch = {
    status: 'paid',
    $or: [
      { paidAt: { $gte: startDate, $lt: endDate } },
      { paidAt: null, createdAt: { $gte: startDate, $lt: endDate } },
    ],
  };

  const paymentStatsPipeline = [
    { $match: paymentMatch },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        successfulPaymentsCount: { $sum: 1 },
      },
    },
  ];

  // Run aggregations and document counts in parallel
  const [bookingAggResult, paymentAggResult, activeCustomers, activeGames, activeResources] = await Promise.all([
    Booking.aggregate(bookingStatsPipeline),
    Payment.aggregate(paymentStatsPipeline),
    User.countDocuments({ role: 'customer' }),
    Game.countDocuments({ isActive: true }),
    Resource.countDocuments({ isActive: true, status: 'available' }),
  ]);

  const bStats = bookingAggResult[0] || {
    totalBookings: 0,
    confirmed: 0,
    checkedIn: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    noShow: 0,
    totalDuration: 0,
    totalValue: 0,
  };

  const pStats = paymentAggResult[0] || {
    totalRevenue: 0,
    successfulPaymentsCount: 0,
  };

  const totalBookings = bStats.totalBookings;
  const cancellationRate = totalBookings > 0 ? parseFloat(((bStats.cancelled / totalBookings) * 100).toFixed(2)) : 0;
  const noShowRate = totalBookings > 0 ? parseFloat(((bStats.noShow / totalBookings) * 100).toFixed(2)) : 0;

  const avgBookingDuration = totalBookings > 0 ? parseFloat((bStats.totalDuration / totalBookings).toFixed(1)) : 0;
  const avgBookingValue = totalBookings > 0 ? parseFloat((bStats.totalValue / totalBookings).toFixed(2)) : 0;

  return {
    dateRange: {
      preset,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    bookings: {
      totalBookings,
      confirmed: bStats.confirmed,
      checkedIn: bStats.checkedIn,
      inProgress: bStats.inProgress,
      completed: bStats.completed,
      cancelled: bStats.cancelled,
      noShow: bStats.noShow,
      cancellationRate,
      noShowRate,
    },
    revenue: {
      totalRevenue: pStats.totalRevenue,
      successfulPaymentsCount: pStats.successfulPaymentsCount,
      avgTransactionValue: pStats.successfulPaymentsCount > 0 ? parseFloat((pStats.totalRevenue / pStats.successfulPaymentsCount).toFixed(2)) : 0,
    },
    catalog: {
      activeCustomers,
      activeGames,
      activeResources,
    },
    averages: {
      avgBookingDuration,
      avgBookingValue,
    },
  };
};

/**
 * Revenue Analytics Endpoint Implementation
 */
const getRevenueAnalytics = async (query = {}) => {
  const { preset, startDate, endDate, groupBy } = parseDateRange(query);

  let dateFormat;
  if (groupBy === 'month') {
    dateFormat = '%Y-%m';
  } else if (groupBy === 'week') {
    dateFormat = '%G-W%V';
  } else {
    dateFormat = '%Y-%m-%d';
  }

  const paymentMatch = {
    $or: [
      { paidAt: { $gte: startDate, $lt: endDate } },
      { paidAt: null, createdAt: { $gte: startDate, $lt: endDate } },
    ],
  };

  const pipeline = [
    { $match: paymentMatch },
    {
      $project: {
        amount: '$amount',
        status: '$status',
        dateRef: { $ifNull: ['$paidAt', '$createdAt'] },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: '$dateRef', timezone: 'UTC' } },
        totalRevenue: {
          $sum: {
            $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0],
          },
        },
        successfulCount: {
          $sum: {
            $cond: [{ $eq: ['$status', 'paid'] }, 1, 0],
          },
        },
        failedCount: {
          $sum: {
            $cond: [{ $eq: ['$status', 'failed'] }, 1, 0],
          },
        },
        cancelledCount: {
          $sum: {
            $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ];

  const trendResults = await Payment.aggregate(pipeline);

  let totalRevenue = 0;
  let totalSuccessfulCount = 0;
  let totalFailedCount = 0;
  let totalCancelledCount = 0;

  const formattedTrend = trendResults.map((item) => {
    totalRevenue += item.totalRevenue;
    totalSuccessfulCount += item.successfulCount;
    totalFailedCount += item.failedCount;
    totalCancelledCount += item.cancelledCount;

    const avgAmount = item.successfulCount > 0 ? parseFloat((item.totalRevenue / item.successfulCount).toFixed(2)) : 0;

    return {
      date: item._id,
      totalRevenue: item.totalRevenue,
      successfulCount: item.successfulCount,
      failedCount: item.failedCount,
      cancelledCount: item.cancelledCount,
      avgAmount,
    };
  });

  const avgTransactionValue = totalSuccessfulCount > 0 ? parseFloat((totalRevenue / totalSuccessfulCount).toFixed(2)) : 0;

  return {
    dateRange: {
      preset,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      groupBy,
    },
    summary: {
      totalRevenue,
      successfulCount: totalSuccessfulCount,
      failedCount: totalFailedCount,
      cancelledCount: totalCancelledCount,
      avgTransactionValue,
    },
    trend: formattedTrend,
  };
};

/**
 * Booking Trends & Breakdown Analytics Endpoint Implementation
 */
const getBookingsAnalytics = async (query = {}) => {
  const { preset, startDate, endDate, groupBy } = parseDateRange(query);

  let dateFormat;
  if (groupBy === 'month') {
    dateFormat = '%Y-%m';
  } else if (groupBy === 'week') {
    dateFormat = '%G-W%V';
  } else {
    dateFormat = '%Y-%m-%d';
  }

  const bookingMatch = {
    startAt: { $gte: startDate, $lt: endDate },
  };

  const trendPipeline = [
    { $match: bookingMatch },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: '$startAt', timezone: 'UTC' } },
        totalBookings: { $sum: 1 },
        confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        noShow: { $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] } },
        checkedIn: { $sum: { $cond: [{ $eq: ['$status', 'checked_in'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ];

  const trendResults = await Booking.aggregate(trendPipeline);

  let totalBookings = 0;
  let totalConfirmed = 0;
  let totalCompleted = 0;
  let totalCancelled = 0;
  let totalNoShow = 0;

  const formattedTrend = trendResults.map((item) => {
    totalBookings += item.totalBookings;
    totalConfirmed += item.confirmed;
    totalCompleted += item.completed;
    totalCancelled += item.cancelled;
    totalNoShow += item.noShow;

    return {
      date: item._id,
      totalBookings: item.totalBookings,
      confirmed: item.confirmed,
      completed: item.completed,
      cancelled: item.cancelled,
      noShow: item.noShow,
      checkedIn: item.checkedIn,
      inProgress: item.inProgress,
    };
  });

  const cancellationRate = totalBookings > 0 ? parseFloat(((totalCancelled / totalBookings) * 100).toFixed(2)) : 0;
  const noShowRate = totalBookings > 0 ? parseFloat(((totalNoShow / totalBookings) * 100).toFixed(2)) : 0;

  const statusBreakdown = [
    { status: 'confirmed', count: totalConfirmed, percentage: totalBookings > 0 ? parseFloat(((totalConfirmed / totalBookings) * 100).toFixed(2)) : 0 },
    { status: 'completed', count: totalCompleted, percentage: totalBookings > 0 ? parseFloat(((totalCompleted / totalBookings) * 100).toFixed(2)) : 0 },
    { status: 'cancelled', count: totalCancelled, percentage: totalBookings > 0 ? parseFloat(((totalCancelled / totalBookings) * 100).toFixed(2)) : 0 },
    { status: 'no_show', count: totalNoShow, percentage: totalBookings > 0 ? parseFloat(((totalNoShow / totalBookings) * 100).toFixed(2)) : 0 },
  ];

  return {
    dateRange: {
      preset,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      groupBy,
    },
    summary: {
      totalBookings,
      confirmed: totalConfirmed,
      completed: totalCompleted,
      cancelled: totalCancelled,
      noShow: totalNoShow,
      cancellationRate,
      noShowRate,
    },
    trend: formattedTrend,
    statusBreakdown,
  };
};

/**
 * Game Performance Analytics Endpoint Implementation
 */
const getGameAnalytics = async (query = {}) => {
  const { preset, startDate, endDate } = parseDateRange(query);

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const allowedSortFields = ['totalBookings', 'totalRevenue', 'completedBookings', 'totalDurationMinutes', 'name'];
  const sortBy = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'totalBookings';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

  const gameFilter = {};
  if (query.search && typeof query.search === 'string') {
    const cleanSearch = query.search.trim();
    if (cleanSearch) {
      gameFilter.name = { $regex: cleanSearch, $options: 'i' };
    }
  }

  const pipeline = [
    { $match: gameFilter },
    {
      $lookup: {
        from: 'bookings',
        let: { gameId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$gameId', '$$gameId'] },
                  { $gte: ['$startAt', startDate] },
                  { $lt: ['$startAt', endDate] },
                ],
              },
            },
          },
        ],
        as: 'bookings',
      },
    },
    {
      $project: {
        name: 1,
        category: 1,
        basePricePerHour: 1,
        isActive: 1,
        totalBookings: { $size: '$bookings' },
        completedBookings: {
          $size: {
            $filter: {
              input: '$bookings',
              as: 'b',
              cond: { $eq: ['$$b.status', 'completed'] },
            },
          },
        },
        cancelledBookings: {
          $size: {
            $filter: {
              input: '$bookings',
              as: 'b',
              cond: { $eq: ['$$b.status', 'cancelled'] },
            },
          },
        },
        noShowBookings: {
          $size: {
            $filter: {
              input: '$bookings',
              as: 'b',
              cond: { $eq: ['$$b.status', 'no_show'] },
            },
          },
        },
        totalDurationMinutes: {
          $reduce: {
            input: '$bookings',
            initialValue: 0,
            in: { $add: ['$$value', '$$this.durationMinutes'] },
          },
        },
        totalRevenue: {
          $reduce: {
            input: {
              $filter: {
                input: '$bookings',
                as: 'b',
                cond: { $in: ['$$b.status', ['confirmed', 'checked_in', 'in_progress', 'completed']] },
              },
            },
            initialValue: 0,
            in: { $add: ['$$value', '$$this.totalAmount'] },
          },
        },
      },
    },
    {
      $addFields: {
        avgBookingDuration: {
          $cond: [
            { $gt: ['$totalBookings', 0] },
            { $divide: ['$totalDurationMinutes', '$totalBookings'] },
            0,
          ],
        },
        avgBookingValue: {
          $cond: [
            { $gt: ['$totalBookings', 0] },
            { $divide: ['$totalRevenue', '$totalBookings'] },
            0,
          ],
        },
      },
    },
    { $sort: { [sortBy]: sortOrder, _id: 1 } },
  ];

  const allGames = await Game.aggregate(pipeline);
  const total = allGames.length;
  const paginatedGames = allGames.slice(skip, skip + limit).map((g) => ({
    _id: g._id,
    name: g.name,
    category: g.category,
    basePricePerHour: g.basePricePerHour,
    isActive: g.isActive,
    totalBookings: g.totalBookings,
    completedBookings: g.completedBookings,
    cancelledBookings: g.cancelledBookings,
    noShowBookings: g.noShowBookings,
    totalDurationMinutes: g.totalDurationMinutes,
    totalRevenue: parseFloat(g.totalRevenue.toFixed(2)),
    avgBookingDuration: parseFloat(g.avgBookingDuration.toFixed(1)),
    avgBookingValue: parseFloat(g.avgBookingValue.toFixed(2)),
  }));

  return {
    dateRange: {
      preset,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    games: paginatedGames,
  };
};

/**
 * Resource Utilization Analytics Endpoint Implementation
 */
const getResourceAnalytics = async (query = {}) => {
  const { preset, startDate, endDate } = parseDateRange(query);

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const allowedSortFields = ['totalBookings', 'completedBookings', 'totalBookedMinutes', 'totalRevenue', 'name'];
  const sortBy = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'totalBookings';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

  const resourceFilter = {};
  if (query.gameId && mongoose.Types.ObjectId.isValid(query.gameId)) {
    resourceFilter.gameId = new mongoose.Types.ObjectId(query.gameId);
  }

  const pipeline = [
    { $match: resourceFilter },
    {
      $lookup: {
        from: 'games',
        localField: 'gameId',
        foreignField: '_id',
        as: 'game',
      },
    },
    { $unwind: { path: '$game', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'bookings',
        let: { resourceId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$resourceId', '$$resourceId'] },
                  { $gte: ['$startAt', startDate] },
                  { $lt: ['$startAt', endDate] },
                ],
              },
            },
          },
        ],
        as: 'bookings',
      },
    },
    {
      $project: {
        name: 1,
        code: 1,
        status: 1,
        isActive: 1,
        gameName: '$game.name',
        totalBookings: { $size: '$bookings' },
        completedBookings: {
          $size: {
            $filter: {
              input: '$bookings',
              as: 'b',
              cond: { $eq: ['$$b.status', 'completed'] },
            },
          },
        },
        cancelledBookings: {
          $size: {
            $filter: {
              input: '$bookings',
              as: 'b',
              cond: { $eq: ['$$b.status', 'cancelled'] },
            },
          },
        },
        noShowBookings: {
          $size: {
            $filter: {
              input: '$bookings',
              as: 'b',
              cond: { $eq: ['$$b.status', 'no_show'] },
            },
          },
        },
        totalBookedMinutes: {
          $reduce: {
            input: {
              $filter: {
                input: '$bookings',
                as: 'b',
                cond: { $in: ['$$b.status', ['confirmed', 'checked_in', 'in_progress', 'completed']] },
              },
            },
            initialValue: 0,
            in: { $add: ['$$value', '$$this.durationMinutes'] },
          },
        },
        totalRevenue: {
          $reduce: {
            input: {
              $filter: {
                input: '$bookings',
                as: 'b',
                cond: { $in: ['$$b.status', ['confirmed', 'checked_in', 'in_progress', 'completed']] },
              },
            },
            initialValue: 0,
            in: { $add: ['$$value', '$$this.totalAmount'] },
          },
        },
      },
    },
    { $sort: { [sortBy]: sortOrder, _id: 1 } },
  ];

  const allResources = await Resource.aggregate(pipeline);
  const total = allResources.length;
  const paginatedResources = allResources.slice(skip, skip + limit).map((r) => {
    const bookedHours = parseFloat((r.totalBookedMinutes / 60).toFixed(1));

    return {
      _id: r._id,
      name: r.name,
      code: r.code || '',
      status: r.status,
      isActive: r.isActive,
      gameName: r.gameName || 'Unknown Game',
      totalBookings: r.totalBookings,
      completedBookings: r.completedBookings,
      cancelledBookings: r.cancelledBookings,
      noShowBookings: r.noShowBookings,
      totalBookedMinutes: r.totalBookedMinutes,
      bookedHours,
      totalRevenue: parseFloat(r.totalRevenue.toFixed(2)),
    };
  });

  return {
    dateRange: {
      preset,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    resources: paginatedResources,
  };
};

/**
 * Customer & Peak Hours Analytics Endpoint Implementation
 */
const getCustomerAnalytics = async (query = {}) => {
  const { preset, startDate, endDate } = parseDateRange(query);

  const [totalCustomers, newCustomers] = await Promise.all([
    User.countDocuments({ role: 'customer' }),
    User.countDocuments({ role: 'customer', createdAt: { $gte: startDate, $lt: endDate } }),
  ]);

  const bookingMatch = {
    startAt: { $gte: startDate, $lt: endDate },
  };

  const customerBookingPipeline = [
    { $match: bookingMatch },
    {
      $group: {
        _id: '$userId',
        bookingCount: { $sum: 1 },
        validBookingCount: {
          $sum: {
            $cond: [{ $in: ['$status', ['confirmed', 'checked_in', 'in_progress', 'completed']] }, 1, 0],
          },
        },
      },
    },
  ];

  const customerBookingResults = await Booking.aggregate(customerBookingPipeline);

  const activeBookingCustomers = customerBookingResults.length;
  const repeatCustomers = customerBookingResults.filter((c) => c.validBookingCount >= 2).length;
  const totalPeriodBookings = customerBookingResults.reduce((sum, c) => sum + c.bookingCount, 0);

  const avgBookingsPerActiveCustomer = activeBookingCustomers > 0
    ? parseFloat((totalPeriodBookings / activeBookingCustomers).toFixed(2))
    : 0;

  // Hourly Distribution for Peak Hours Analysis (0 to 23 hours UTC)
  const hourlyPipeline = [
    { $match: bookingMatch },
    {
      $project: {
        hour: { $hour: { date: '$startAt', timezone: 'UTC' } },
      },
    },
    {
      $group: {
        _id: '$hour',
        bookingCount: { $sum: 1 },
      },
    },
  ];

  const hourlyResults = await Booking.aggregate(hourlyPipeline);
  const hourMap = {};
  hourlyResults.forEach((h) => {
    hourMap[h._id] = h.bookingCount;
  });

  const hourlyDistribution = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    hourLabel: `${h.toString().padStart(2, '0')}:00`,
    bookingCount: hourMap[h] || 0,
  }));

  return {
    dateRange: {
      preset,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    summary: {
      totalCustomers,
      newCustomers,
      activeBookingCustomers,
      repeatCustomers,
      avgBookingsPerActiveCustomer,
    },
    hourlyDistribution,
  };
};

module.exports = {
  parseDateRange,
  getOverview,
  getRevenueAnalytics,
  getBookingsAnalytics,
  getGameAnalytics,
  getResourceAnalytics,
  getCustomerAnalytics,
};
