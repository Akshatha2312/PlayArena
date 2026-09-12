const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking reference is required'],
      index: true,
    },
    provider: {
      type: String,
      enum: {
        values: ['razorpay'],
        message: '{VALUE} is not a supported payment provider',
      },
      default: 'razorpay',
      required: true,
    },
    providerOrderId: {
      type: String,
      required: [true, 'Provider order ID is required'],
      index: true,
    },
    providerPaymentId: {
      type: String,
      default: null,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      required: true,
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['created', 'pending', 'paid', 'failed', 'cancelled'],
        message: '{VALUE} is not a valid payment status',
      },
      default: 'created',
      required: true,
      index: true,
    },
    method: {
      type: String,
      default: null,
    },
    failureReason: {
      type: String,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    rawWebhookEvents: [
      {
        eventId: String,
        eventType: String,
        receivedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound Index for fast lookup of active payment orders per booking
paymentSchema.index({ bookingId: 1, status: 1 });

// Compound Index for fast lookup of user payment history ordered by date
paymentSchema.index({ userId: 1, createdAt: -1 });

// Unique index to guarantee idempotency on webhook event IDs per payment record
paymentSchema.index({ _id: 1, 'rawWebhookEvents.eventId': 1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
