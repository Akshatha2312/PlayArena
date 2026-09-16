const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('./src/app');
const validateEnv = require('./src/config/validateEnv');

// Set test environment configuration
process.env.NODE_ENV = 'test';
process.env.DISABLE_RATE_LIMIT = 'true';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_play_arena_phase20_master';

const JWT_SECRET = process.env.JWT_SECRET;

// Generate test tokens
const customerToken = jwt.sign(
  { userId: '6aaa9d74c64f9e629c80e101', email: 'customer@test.com', role: 'customer' },
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

async function runPhase20Tests() {
  console.log('==================================================');
  console.log('STARTING PHASE 20 DEPLOYMENT & FINAL QA TEST SUITE');
  console.log('==================================================\n');

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/playarena_test_p20';
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 1000 });
  } catch (err) {
    mongoose.set('bufferCommands', false);
    console.log('[INFO] Live MongoDB connection unavailable. Running in-memory security & validation tests.\n');
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
    // --- Section 1: Secret & Environment Validation ---
    console.log('--- Section 1: Secret & Environment Validation ---');

    let validateResult = true;
    try {
      validateEnv();
      assert(true, 'validateEnv runs without error in non-production mode');
    } catch (e) {
      validateResult = false;
      assert(false, 'validateEnv threw unexpected error');
    }

    // --- Section 2: Health Check & Base Endpoints ---
    console.log('\n--- Section 2: Health Check & Base Endpoints ---');

    const resRoot = await request(app).get('/');
    assert(resRoot.status === 200, 'GET / returns 200 OK welcome message');

    const resHealth = await request(app).get('/api/v1/health');
    assert(resHealth.status === 200, 'GET /api/v1/health returns 200 OK');
    assert(resHealth.body.status === 'success', 'Health endpoint status is success');
    assert(Boolean(resHealth.body.timestamp), 'Health response includes timestamp');

    const res404 = await request(app).get('/api/v1/nonexistent-route');
    assert(res404.status === 404, 'GET /api/v1/nonexistent-route returns 404 Not Found');

    // --- Section 3: Master Cross-Role RBAC Matrix ---
    console.log('\n--- Section 3: Master Cross-Role RBAC Matrix ---');

    // Unauthenticated protection
    const resUnauthBk = await request(app).get('/api/v1/bookings/my-bookings');
    assert(resUnauthBk.status === 401, 'Unauthenticated access to customer bookings returns 401');

    const resUnauthStaff = await request(app).get('/api/v1/staff/queue');
    assert(resUnauthStaff.status === 401, 'Unauthenticated access to staff queue returns 401');

    const resUnauthAdmin = await request(app).get('/api/v1/admin/analytics/overview');
    assert(resUnauthAdmin.status === 401, 'Unauthenticated access to admin analytics returns 401');

    // Customer role boundary
    const resCustStaff = await request(app)
      .get('/api/v1/staff/queue')
      .set('Authorization', `Bearer ${customerToken}`);
    assert(resCustStaff.status === 403, 'Customer attempting staff endpoint returns 403 Forbidden');

    const resCustAdmin = await request(app)
      .get('/api/v1/admin/analytics/overview')
      .set('Authorization', `Bearer ${customerToken}`);
    assert(resCustAdmin.status === 403, 'Customer attempting admin endpoint returns 403 Forbidden');

    // Staff role boundary
    const resStaffAdmin = await request(app)
      .get('/api/v1/admin/analytics/overview')
      .set('Authorization', `Bearer ${staffToken}`);
    assert(resStaffAdmin.status === 403, 'Staff attempting admin analytics endpoint returns 403 Forbidden');

    const resStaffAi = await request(app)
      .post('/api/v1/ai/chat')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ message: 'Hello' });
    assert(resStaffAi.status === 403, 'Staff attempting customer AI endpoint returns 403 Forbidden');

    // Admin role boundary
    const resAdminAi = await request(app)
      .post('/api/v1/ai/chat')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ message: 'Hello' });
    assert(resAdminAi.status === 403, 'Admin attempting customer AI endpoint returns 403 Forbidden');

    // Customer legitimate AI access
    const resCustAi = await request(app)
      .post('/api/v1/ai/chat')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ message: 'What games are available?' });
    assert(resCustAi.status === 200, 'Customer attempting customer AI endpoint returns 200 OK');

    // --- Section 4: Production Security Headers ---
    console.log('\n--- Section 4: Production Security Headers ---');
    assert(Boolean(resHealth.headers['x-dns-prefetch-control']), 'Helmet x-dns-prefetch-control header present');
    assert(Boolean(resHealth.headers['x-content-type-options']), 'Helmet x-content-type-options header present');

  } catch (err) {
    console.error('Unhandled test execution error:', err);
    failed++;
  } finally {
    console.log('\n==================================================');
    console.log(`PHASE 20 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================');
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runPhase20Tests();
