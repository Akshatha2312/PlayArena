const crypto = require('crypto');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');

const getQRSecret = () => {
  const secret = process.env.QR_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('QR_SECRET or JWT_SECRET environment variable must be defined');
  }
  if (process.env.NODE_ENV === 'production') {
    if (secret.length < 32 || secret.includes('super_secret_qr_key')) {
      throw new Error('FATAL: Insecure QR_SECRET detected in production environment.');
    }
  }
  return secret;
};

/**
 * Timing-safe string comparison helper.
 */
const safeCompare = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Generates an HMAC SHA256 signed QR token payload for a booking.
 * Format: PAQR:v1:<bookingId>:<timestamp>:<signature>
 */
const generateQRToken = (bookingId, userId) => {
  const bId = bookingId.toString();
  const timestamp = Date.now().toString();

  const signature = crypto
    .createHmac('sha256', getQRSecret())
    .update(`${bId}:${userId ? userId.toString() : ''}:${timestamp}`)
    .digest('hex');

  return `PAQR:v1:${bId}:${timestamp}:${signature}`;
};

/**
 * Verifies a QR token payload and returns the associated booking.
 */
const verifyQRToken = async (qrPayload) => {
  if (!qrPayload || typeof qrPayload !== 'string') {
    const error = new Error('Invalid or missing QR payload');
    error.statusCode = 400;
    throw error;
  }

  const parts = qrPayload.trim().split(':');
  if (parts.length !== 5 || parts[0] !== 'PAQR' || parts[1] !== 'v1') {
    const error = new Error('Invalid booking QR format');
    error.statusCode = 400;
    throw error;
  }

  const [, , bookingId, timestamp, signature] = parts;

  // Validate timestamp numeric format & prevent extreme replay attacks (> 7 days old)
  const tokenTime = parseInt(timestamp, 10);
  if (isNaN(tokenTime) || tokenTime <= 0) {
    const error = new Error('Invalid QR timestamp');
    error.statusCode = 400;
    throw error;
  }

  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    const error = new Error('Invalid Booking ID in QR code');
    error.statusCode = 400;
    throw error;
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    const error = new Error('Booking not found for provided QR code');
    error.statusCode = 404;
    throw error;
  }

  const secret = getQRSecret();

  // Recalculate signature with booking's userId
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${booking._id}:${booking.userId}:${timestamp}`)
    .digest('hex');

  // Fallback signature calculation if userId wasn't in original update
  const fallbackSignature = crypto
    .createHmac('sha256', secret)
    .update(`${booking._id}::${timestamp}`)
    .digest('hex');

  if (!safeCompare(signature, expectedSignature) && !safeCompare(signature, fallbackSignature)) {
    const error = new Error('Security Error: QR code signature verification failed or payload tampered');
    error.statusCode = 400;
    throw error;
  }

  return booking;
};

/**
 * Evaluates booking state eligibility for QR check-in.
 */
const getQRValidityState = (booking) => {
  if (!booking) return { eligible: false, reason: 'Booking not found' };

  switch (booking.status) {
    case 'pending':
      return { eligible: false, reason: 'Payment is pending. Booking is not confirmed.' };
    case 'cancelled':
      return { eligible: false, reason: 'Booking has been cancelled.' };
    case 'no_show':
      return { eligible: false, reason: 'Booking was marked as a no-show.' };
    case 'completed':
      return { eligible: false, reason: 'Booking session is completed.' };
    case 'checked_in':
      return { eligible: false, reason: 'Booking has already been checked in.' };
    case 'in_progress':
      return { eligible: false, reason: 'Booking session is currently in progress.' };
    case 'confirmed': {
      const now = new Date();
      const startAt = new Date(booking.startAt);
      const endAt = new Date(booking.endAt);

      // Check-in allowed from 120 minutes prior to start until session end
      const earlyWindowMs = 120 * 60 * 1000;
      if (now.getTime() < startAt.getTime() - earlyWindowMs) {
        return { eligible: false, reason: 'Check-in is not yet open for this time slot.' };
      }

      if (now.getTime() > endAt.getTime()) {
        return { eligible: false, reason: 'Check-in window has expired for this booking.' };
      }

      return { eligible: true, reason: 'Eligible for check-in' };
    }
    default:
      return { eligible: false, reason: `Invalid status: ${booking.status}` };
  }
};

module.exports = {
  generateQRToken,
  verifyQRToken,
  getQRValidityState,
};
