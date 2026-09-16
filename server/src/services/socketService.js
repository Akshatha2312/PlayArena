const jwt = require('jsonwebtoken');
const EventEmitter = require('events');

let Server;
try {
  Server = require('socket.io').Server;
} catch (e) {
  Server = null;
}

const { verifyToken } = require('../utils/token');
const Booking = require('../models/Booking');

let io = null;
const eventBus = new EventEmitter();

/**
 * Initializes Socket.IO on the HTTP server instance.
 */
const initSocketServer = (httpServer) => {
  if (!Server || !httpServer) {
    console.log('[SocketService] Running in event-emitter simulation mode.');
    return null;
  }

  try {
    io = new Server(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        credentials: true,
      },
    });

    // Middleware: Authenticate incoming socket connection via JWT handshake token
    io.use((socket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication Error: Missing socket token'));
      }

      try {
        const decoded = verifyToken(token);
        socket.user = { userId: decoded.userId, role: decoded.role };
        next();
      } catch (err) {
        return next(new Error('Authentication Error: Invalid or expired socket token'));
      }
    });

    io.on('connection', (socket) => {
      const { userId, role } = socket.user || {};

      // Auto-join private user room
      if (userId) {
        socket.join(`user:${userId}`);
      }

      // Join role rooms
      if (role === 'staff' || role === 'admin') {
        socket.join('staff:operations');
      }
      if (role === 'admin') {
        socket.join('admin:control');
      }

      // Allow joining specific booking room only if user is owner, staff, or admin
      socket.on('join_booking', async ({ bookingId }) => {
        if (!bookingId) return;

        if (role === 'staff' || role === 'admin') {
          socket.join(`booking:${bookingId}`);
          return;
        }

        try {
          const booking = await Booking.findById(bookingId).select('userId');
          if (booking && booking.userId && booking.userId.toString() === userId) {
            socket.join(`booking:${bookingId}`);
          }
        } catch (err) {}
      });

      socket.on('leave_booking', ({ bookingId }) => {
        if (bookingId) {
          socket.leave(`booking:${bookingId}`);
        }
      });
    });

    console.log('[SocketService] Socket.IO server initialized successfully.');
    return io;
  } catch (error) {
    console.error('[SocketService] Error initializing Socket.IO:', error.message);
    return null;
  }
};

/**
 * Emit event helper across socket.io and local eventBus.
 */
const emitEvent = (room, eventName, payload) => {
  eventBus.emit(eventName, { room, payload });

  if (io) {
    try {
      io.to(room).emit(eventName, payload);
    } catch (err) {
      console.error(`[SocketService] Error emitting ${eventName} to ${room}:`, err.message);
    }
  }
};

/**
 * Broadcast helpers for operational business events
 */
const broadcastBookingUpdated = (booking) => {
  if (!booking) return;
  const bookingId = booking._id ? booking._id.toString() : booking.toString();
  const userId = booking.userId ? (booking.userId._id || booking.userId).toString() : null;

  const payload = {
    bookingId,
    status: booking.status,
    startAt: booking.startAt,
    endAt: booking.endAt,
    updatedAt: new Date().toISOString(),
  };

  if (userId) emitEvent(`user:${userId}`, 'booking:status_updated', payload);
  emitEvent(`booking:${bookingId}`, 'booking:status_updated', payload);
  emitEvent('staff:operations', 'schedule:updated', payload);
  emitEvent('admin:control', 'dashboard:updated', payload);
};

const broadcastCheckIn = (booking) => {
  if (!booking) return;
  const bookingId = booking._id ? booking._id.toString() : booking.toString();
  const userId = booking.userId ? (booking.userId._id || booking.userId).toString() : null;

  const payload = {
    bookingId,
    status: 'checked_in',
    checkedInAt: booking.checkedInAt || new Date().toISOString(),
  };

  if (userId) emitEvent(`user:${userId}`, 'booking:checked_in', payload);
  emitEvent(`booking:${bookingId}`, 'booking:checked_in', payload);
  emitEvent('staff:operations', 'schedule:updated', payload);
};

const broadcastSessionStarted = (booking) => {
  if (!booking) return;
  const bookingId = booking._id ? booking._id.toString() : booking.toString();
  const userId = booking.userId ? (booking.userId._id || booking.userId).toString() : null;

  const payload = {
    bookingId,
    status: 'in_progress',
    startedAt: booking.startedAt || new Date().toISOString(),
  };

  if (userId) emitEvent(`user:${userId}`, 'session:started', payload);
  emitEvent(`booking:${bookingId}`, 'session:started', payload);
  emitEvent('staff:operations', 'schedule:updated', payload);
};

const broadcastSessionCompleted = (booking) => {
  if (!booking) return;
  const bookingId = booking._id ? booking._id.toString() : booking.toString();
  const userId = booking.userId ? (booking.userId._id || booking.userId).toString() : null;

  const payload = {
    bookingId,
    status: 'completed',
    completedAt: booking.completedAt || new Date().toISOString(),
  };

  if (userId) emitEvent(`user:${userId}`, 'session:completed', payload);
  emitEvent(`booking:${bookingId}`, 'session:completed', payload);
  emitEvent('staff:operations', 'schedule:updated', payload);
};

const broadcastCancellation = (booking) => {
  if (!booking) return;
  const bookingId = booking._id ? booking._id.toString() : booking.toString();
  const userId = booking.userId ? (booking.userId._id || booking.userId).toString() : null;

  const payload = {
    bookingId,
    status: 'cancelled',
    cancelledAt: booking.cancelledAt || new Date().toISOString(),
  };

  if (userId) emitEvent(`user:${userId}`, 'booking:cancelled', payload);
  emitEvent(`booking:${bookingId}`, 'booking:cancelled', payload);
  emitEvent('staff:operations', 'schedule:updated', payload);
};

const broadcastWaitlistAvailable = (waitlistEntry) => {
  if (!waitlistEntry) return;
  const entryId = waitlistEntry._id ? waitlistEntry._id.toString() : waitlistEntry.toString();
  const userId = waitlistEntry.userId ? (waitlistEntry.userId._id || waitlistEntry.userId).toString() : null;

  const payload = {
    waitlistId: entryId,
    status: 'notified',
    notifiedAt: waitlistEntry.notifiedAt || new Date().toISOString(),
  };

  if (userId) emitEvent(`user:${userId}`, 'waitlist:available', payload);
};

const broadcastBookingRescheduled = (booking) => {
  if (!booking) return;
  const bookingId = booking._id ? booking._id.toString() : booking.toString();
  const userId = booking.userId ? (booking.userId._id || booking.userId).toString() : null;

  const payload = {
    bookingId,
    status: booking.status,
    startAt: booking.startAt,
    endAt: booking.endAt,
    durationMinutes: booking.durationMinutes,
    isRescheduled: true,
    rescheduledAt: booking.rescheduledAt || new Date().toISOString(),
  };

  if (userId) emitEvent(`user:${userId}`, 'booking:rescheduled', payload);
  emitEvent(`booking:${bookingId}`, 'booking:rescheduled', payload);
  emitEvent('staff:operations', 'schedule:updated', payload);
  emitEvent('admin:control', 'dashboard:updated', payload);
};

const getIO = () => io;
const getEventBus = () => eventBus;

module.exports = {
  initSocketServer,
  emitEvent,
  broadcastBookingUpdated,
  broadcastCheckIn,
  broadcastSessionStarted,
  broadcastSessionCompleted,
  broadcastCancellation,
  broadcastWaitlistAvailable,
  broadcastBookingRescheduled,
  getIO,
  getEventBus,
};
