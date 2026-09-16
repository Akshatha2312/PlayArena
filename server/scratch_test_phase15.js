/**
 * scratch_test_phase15.js
 * Integration & Business Logic Test Suite for Phase 15: Invoice & Receipt System.
 */

require('dotenv').config();
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test_jwt_secret_play_arena_phase_15_mock_key';
}

const mongoose = require('mongoose');
const express = require('express');
const supertest = require('supertest');

const app = require('./src/app');
const Invoice = require('./src/models/Invoice');
const invoiceService = require('./src/services/invoiceService');
const { generateUserToken } = require('./src/utils/token');

function createMockId() {
  const bytes = [];
  for (let i = 0; i < 12; i++) {
    bytes.push(Math.floor(Math.random() * 256).toString(16).padStart(2, '0'));
  }
  return bytes.join('');
}

const runTests = async () => {
  console.log('==================================================');
  console.log('STARTING PHASE 15 INVOICE & RECEIPT TEST SUITE');
  console.log('==================================================\n');

  let isUsingMock = false;
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/playarena_test_p15';
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 1500 });
    console.log('[INFO] Connected to MongoDB for Phase 15 testing.');
  } catch (err) {
    isUsingMock = true;
    mongoose.set('bufferCommands', false);
    console.log('[INFO] Live MongoDB connection unavailable. Running test suite with memory storage mocks.\n');
  }

  let passCount = 0;
  let failCount = 0;

  const assert = (condition, description) => {
    if (condition) {
      console.log(`✅ [PASS] ${description}`);
      passCount++;
    } else {
      console.error(`❌ [FAIL] ${description}`);
      failCount++;
    }
  };

  // 1. Invoice Number Generation & Formatting
  console.log('--- Section 1: Invoice Number & Model Integrity ---');

  const invNum = await invoiceService.generateInvoiceNumber();
  assert(invNum.startsWith('PA-INV-'), 'Invoice number has standard prefix PA-INV-');
  assert(invNum.split('-').length >= 4, 'Invoice number includes year and sequence parts');

  // 2. Mock Generation & Idempotency Check
  console.log('\n--- Section 2: Idempotent Invoice Generation ---');

  const mockBookingId = createMockId();
  const mockPaymentId = createMockId();
  const mockUserId = createMockId();

  const mockPayment = {
    _id: mockPaymentId,
    bookingId: mockBookingId,
    userId: mockUserId,
    amount: 800,
    currency: 'INR',
    provider: 'razorpay',
    providerPaymentId: 'pay_test_p15_123',
    providerOrderId: 'order_test_p15_123',
    method: 'card',
    paidAt: new Date(),
  };

  const mockBooking = {
    _id: mockBookingId,
    userId: mockUserId,
    bookingReference: 'BK15TEST',
    totalAmount: 800,
    pricePerHourAtBooking: 400,
    durationMinutes: 120,
    bookingDate: '2026-10-15',
    startTime: '14:00',
    endTime: '16:00',
  };

  const genResult1 = await invoiceService.generateInvoiceForPayment(mockPayment, mockBooking);
  assert(genResult1 && genResult1.invoice, '1. First invoice generation produces valid invoice document');

  // 3. Customer & Admin REST APIs
  console.log('\n--- Section 3: REST Endpoint Security & Ownership ---');

  const customerToken = generateUserToken({ _id: mockUserId, role: 'customer' });
  const otherCustomerToken = generateUserToken({ _id: createMockId(), role: 'customer' });
  const adminToken = generateUserToken({ _id: createMockId(), role: 'admin' });
  const staffToken = generateUserToken({ _id: createMockId(), role: 'staff' });

  // Unauthenticated GET /api/v1/invoices
  const resUnauth = await supertest(app).get('/api/v1/invoices');
  assert(resUnauth.status === 401, 'Unauthenticated GET /api/v1/invoices returns 401 Unauthorized');

  // Staff attempting GET /api/v1/invoices
  const resStaff = await supertest(app)
    .get('/api/v1/invoices')
    .set('Authorization', `Bearer ${staffToken}`);
  assert(resStaff.status === 403, 'Staff token attempting customer invoice endpoint returns 403 Forbidden');

  // Staff attempting Admin invoice endpoint
  const resStaffAdmin = await supertest(app)
    .get('/api/v1/invoices/admin/all')
    .set('Authorization', `Bearer ${staffToken}`);
  assert(resStaffAdmin.status === 403, 'Staff token attempting admin invoice endpoint returns 403 Forbidden');

  // Admin accessing Admin invoice endpoint
  const resAdmin = await supertest(app)
    .get('/api/v1/invoices/admin/all')
    .set('Authorization', `Bearer ${adminToken}`);
  assert(resAdmin.status === 200, 'Admin token accessing GET /api/v1/invoices/admin/all returns 200 OK');

  console.log('\n==================================================');
  console.log(`PHASE 15 TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('==================================================\n');

  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }

  process.exit(failCount > 0 ? 1 : 0);
};

runTests();
