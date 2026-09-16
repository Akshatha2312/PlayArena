const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      unique: true,
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking reference is required'],
      unique: true,
      index: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: [true, 'Payment reference is required'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['paid', 'void', 'issued'],
      default: 'paid',
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
      required: true,
      uppercase: true,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      default: 'paid',
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },

    // Immutable Snapshots for Financial Integrity
    customerSnapshot: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, default: 'N/A' },
    },
    bookingSnapshot: {
      bookingReference: { type: String, required: true },
      gameName: { type: String, required: true },
      resourceName: { type: String, required: true },
      bookingDate: { type: String, required: true },
      startTime: { type: String, required: true },
      endTime: { type: String, required: true },
      durationMinutes: { type: Number, required: true },
    },
    pricingSnapshot: {
      pricePerHourAtBooking: { type: Number, required: true },
      subtotal: { type: Number, required: true },
      discountAmount: { type: Number, default: 0 },
      taxAmount: { type: Number, default: 0 },
      totalAmount: { type: Number, required: true },
      currency: { type: String, default: 'INR' },
    },
    paymentSnapshot: {
      provider: { type: String, default: 'razorpay' },
      providerPaymentId: { type: String, default: 'N/A' },
      providerOrderId: { type: String, default: 'N/A' },
      method: { type: String, default: 'card/upi' },
      paidAt: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true,
  }
);

invoiceSchema.index({ userId: 1, createdAt: -1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;
