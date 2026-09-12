const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Game',
      required: [true, 'Game reference is required'],
      index: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: [true, 'Resource reference is required'],
      index: true,
    },
    startAt: {
      type: Date,
      required: [true, 'Start date and time is required'],
      index: true,
    },
    endAt: {
      type: Date,
      required: [true, 'End date and time is required'],
      validate: {
        validator: function (val) {
          return val > this.startAt;
        },
        message: 'End date and time must be after start date and time',
      },
      index: true,
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      min: [15, 'Booking duration must be at least 15 minutes'],
    },
    pricePerHourAtBooking: {
      type: Number,
      required: [true, 'Price per hour snapshot is required'],
      min: [0, 'Price per hour cannot be negative'],
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount snapshot is required'],
      min: [0, 'Total amount cannot be negative'],
    },
    status: {
      type: String,
      required: [true, 'Booking status is required'],
      enum: {
        values: ['pending', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled'],
        message: '{VALUE} is not a valid booking status',
      },
      default: 'confirmed',
      index: true,
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: '',
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Index: Optimizes overlap queries for resources across active booking statuses
bookingSchema.index({ resourceId: 1, status: 1, startAt: 1, endAt: 1 });

// Compound Index: Optimizes user "My Bookings" queries ordered by start time
bookingSchema.index({ userId: 1, startAt: -1 });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
