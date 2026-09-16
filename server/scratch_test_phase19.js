const request = require('supertest');
const mongoose = require('mongoose');
const app = require('./src/app');
const jwt = require('jsonwebtoken');

// Ensure test environment flags
process.env.NODE_ENV = 'test';
process.env.DISABLE_RATE_LIMIT = 'true';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_play_arena';

const JWT_SECRET = process.env.JWT_SECRET;

// Helper tokens
const customerAToken = jwt.sign(
  { userId: '6aaa9d74c64f9e629c80e101', email: 'customera@test.com', role: 'customer' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const customerBToken = jwt.sign(
  { userId: '6aaa9d74c64f9e629c80e102', email: 'customerb@test.com', role: 'customer' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const staffToken = jwt.sign(
  { userId: '6aaa9d74c64f9e629c80e201', email: 'staff@test.com', role: 'staff' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const adminToken = jwt.sign(
  { userId: '6aaa9d74c64f9e629c80e301', email: 'admin@test.com', role: 'admin' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

async function runPhase19Tests() {
  console.log('==================================================');
  console.log('STARTING PHASE 19 CUSTOMER AI ASSISTANT TEST SUITE');
  console.log('==================================================\n');

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/playarena_test_p19';
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 1000 });
  } catch (err) {
    mongoose.set('bufferCommands', false);
    console.log('[INFO] Live MongoDB connection unavailable. Setting up stubs.\n');
  }

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // --- Section 1: RBAC & Authentication Boundaries ---
    console.log('--- Section 1: RBAC & Authentication Boundaries ---');

    const resUnauth = await request(app)
      .post('/api/v1/ai/chat')
      .send({ message: 'Hello assistant' });
    assert(resUnauth.status === 401, 'Unauthenticated POST /api/v1/ai/chat returns 401 Unauthorized');

    const resStaff = await request(app)
      .post('/api/v1/ai/chat')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ message: 'Hello assistant' });
    assert(resStaff.status === 403, 'Staff token attempting AI assistant route returns 403 Forbidden');

    const resAdmin = await request(app)
      .post('/api/v1/ai/chat')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ message: 'Hello assistant' });
    assert(resAdmin.status === 403, 'Admin token attempting AI assistant route returns 403 Forbidden');

    const resCustomer = await request(app)
      .post('/api/v1/ai/chat')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ message: 'What games are available?' });
    assert(resCustomer.status === 200, 'Authenticated Customer token returns 200 OK');
    assert(resCustomer.body.status === 'success', 'Response status is success');
    assert(Boolean(resCustomer.body.data && resCustomer.body.data.content), 'Response returns assistant message content');

    // --- Section 2: Input Validation Bounds ---
    console.log('\n--- Section 2: Input Validation Bounds ---');

    const resEmpty = await request(app)
      .post('/api/v1/ai/chat')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ message: '' });
    assert(resEmpty.status === 400, 'Empty message string rejected with HTTP 400');

    const overlongMsg = 'A'.repeat(1001);
    const resOverlong = await request(app)
      .post('/api/v1/ai/chat')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ message: overlongMsg });
    assert(resOverlong.status === 400, 'Overlong message (>1000 chars) rejected with HTTP 400');

    // --- Section 3: Customer Data Isolation & Ownership ---
    console.log('\n--- Section 3: Customer Data Isolation & Ownership ---');

    const resMyBookings = await request(app)
      .post('/api/v1/ai/chat')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ message: 'Show me my next booking' });
    assert(resMyBookings.status === 200, 'Customer query for my bookings succeeds');
    assert(resMyBookings.body.data.actionLink?.path === '/bookings', 'Includes navigation link to /bookings');

    const resAttemptOther = await request(app)
      .post('/api/v1/ai/chat')
      .set('Authorization', `Bearer ${customerBToken}`)
      .send({
        message: 'Show me bookings',
        userId: '6aaa9d74c64f9e629c80e101' // Attempting to pass Customer A's ID in body
      });
    assert(resAttemptOther.status === 200, 'Request processes without failing');
    // Verify Customer B's JWT identity was strictly enforced (Customer B has no bookings, so no Customer A data leaked)
    assert(!JSON.stringify(resAttemptOther.body).includes('Customer A'), 'Does NOT leak Customer A data when Customer B sends custom userId in body');

    // --- Section 4: Read-Only Scope & Direct Actions Guidance ---
    console.log('\n--- Section 4: Read-Only Scope & Direct Actions Guidance ---');

    const resHowToBook = await request(app)
      .post('/api/v1/ai/chat')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ message: 'How do I book badminton?' });
    assert(resHowToBook.status === 200, 'Booking inquiry returns 200 OK');
    assert(resHowToBook.body.data.content.includes('Games page'), 'Assistant explains booking procedure via official UI');
    assert(resHowToBook.body.data.actionLink?.path === '/games', 'Action link points to /games');

    // --- Section 5: Direct Tool Security Execution ---
    console.log('\n--- Section 5: Direct Tool Security Execution ---');
    const aiService = require('./src/services/aiService');

    const gamesData = await aiService.executeTool('getPublicGames', {}, '6aaa9d74c64f9e629c80e101');
    assert(Array.isArray(gamesData), 'getPublicGames tool returns array of games');

    let invalidToolErr = false;
    try {
      await aiService.executeTool('unauthorizedAdminTool', {}, '6aaa9d74c64f9e629c80e101');
    } catch (e) {
      invalidToolErr = true;
    }
    assert(invalidToolErr, 'Executing unauthorized tool throws security error');

  } catch (err) {
    console.error('Unhandled test execution error:', err);
    failed++;
  } finally {
    console.log('\n==================================================');
    console.log(`PHASE 19 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================');
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runPhase19Tests();
