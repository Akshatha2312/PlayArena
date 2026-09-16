const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema(
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
      index: true,
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      min: [15, 'Duration must be at least 15 minutes'],
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['waiting', 'notified', 'fulfilled', 'cancelled', 'expired'],
        message: '{VALUE} is not a valid waitlist status',
      },
      default: 'waiting',
      index: true,
    },
    notifiedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    fulfilledAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Index: Optimizes lookups for resource waitlists by interval
waitlistSchema.index({ resourceId: 1, status: 1, startAt: 1, endAt: 1 });

// Compound Index: Prevents duplicate active waitlist entries for same user, resource, startAt, endAt
waitlistSchema.index(
  { userId: 1, resourceId: 1, startAt: 1, endAt: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['waiting', 'notified'] } },
  }
);

const Waitlist = mongoose.model('Waitlist', waitlistSchema);

module.exports = Waitlist;
