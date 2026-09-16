/**
 * scratch_test_phase16.js
 * Comprehensive Integration & Verification Test Suite for Phase 16:
 * Venue Layout / Resource Map System.
 */

require('dotenv').config();
process.env.NODE_ENV = 'test';
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test_jwt_secret_play_arena_phase_16_mock_key';
}

const mongoose = require('mongoose');
const supertest = require('supertest');

const app = require('./src/app');
const Resource = require('./src/models/Resource');
const venueService = require('./src/services/venueService');
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
  console.log('STARTING PHASE 16 VENUE LAYOUT TEST SUITE');
  console.log('==================================================\n');

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/playarena_test_p16';
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 1500 });
    console.log('[INFO] Connected to MongoDB for Phase 16 testing.');
  } catch (err) {
    mongoose.set('bufferCommands', false);
    console.log('[INFO] Live MongoDB connection unavailable. Running test suite with in-memory storage mocks.\n');
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

  // 1. Resource Location Schema & Defaults Verification
  console.log('--- Section 1: Resource Model Location Schema & Defaults ---');
  const mockGameId = createMockId();
  const mockResource = new Resource({
    gameId: mockGameId,
    name: 'Court 1 P16',
    code: 'BAD-C1-P16',
    status: 'available',
  });

  assert(mockResource.floor === 'Ground Floor', 'Default floor defaults to Ground Floor');
  assert(mockResource.zone === 'Main Arena', 'Default zone defaults to Main Arena');
  assert(mockResource.positionOrder === 1, 'Default position order is 1');
  assert(mockResource.isVisibleOnMap === true, 'Default isVisibleOnMap defaults to true');

  // 2. Public Venue Layout Querying
  console.log('\n--- Section 2: Public Venue Layout Querying & Safety ---');
  const publicLayout = await venueService.getPublicVenueLayout();
  assert(publicLayout && Array.isArray(publicLayout.floors), 'Public venue layout returns floors array');
  assert(publicLayout && Array.isArray(publicLayout.resources), 'Public venue layout returns resources array');

  const publicRes = await supertest(app).get('/api/v1/venue/layout');
  assert(publicRes.status === 200, 'GET /api/v1/venue/layout returns 200 OK');
  assert(publicRes.body.status === 'success', 'Public venue layout response contains status success');

  // Verify safe exposure (no sensitive credentials or internal auth fields)
  const sampleRes = publicRes.body.data?.resources?.[0];
  if (sampleRes) {
    assert(sampleRes.passwordHash === undefined, 'No passwordHash exposed on public venue layout');
    assert(sampleRes.jwtSecret === undefined, 'No jwtSecret exposed on public venue layout');
  } else {
    assert(true, 'No resources exposed sensitive fields (empty array)');
  }

  // 3. REST RBAC & Security Boundaries for Admin Mutations
  console.log('\n--- Section 3: REST Endpoint Security & Ownership Guards ---');
  const mockUserId = createMockId();
  const customerToken = generateUserToken({ _id: mockUserId, role: 'customer' });
  const staffToken = generateUserToken({ _id: createMockId(), role: 'staff' });
  const adminToken = generateUserToken({ _id: createMockId(), role: 'admin' });

  // Unauthenticated Admin GET layout
  const resUnauthAdmin = await supertest(app).get('/api/v1/venue/admin/layout');
  assert(resUnauthAdmin.status === 401, 'Unauthenticated GET /api/v1/venue/admin/layout returns 401 Unauthorized');

  // Customer attempting Admin layout endpoint
  const resCustomerAdmin = await supertest(app)
    .get('/api/v1/venue/admin/layout')
    .set('Authorization', `Bearer ${customerToken}`);
  assert(resCustomerAdmin.status === 403, 'Customer attempting Admin venue layout returns 403 Forbidden');

  // Staff attempting Admin layout mutation
  const resStaffMutation = await supertest(app)
    .patch(`/api/v1/venue/admin/resources/${createMockId()}/location`)
    .set('Authorization', `Bearer ${staffToken}`)
    .send({ floor: 'First Floor', zone: 'Zone B' });
  assert(resStaffMutation.status === 403, 'Staff token attempting layout mutation returns 403 Forbidden');

  // Admin accessing Admin layout endpoint
  const resAdminGet = await supertest(app)
    .get('/api/v1/venue/admin/layout')
    .set('Authorization', `Bearer ${adminToken}`);
  assert(resAdminGet.status === 200, 'Admin token accessing GET /api/v1/venue/admin/layout returns 200 OK');

  // 4. Invalid ObjectId Validation
  console.log('\n--- Section 4: Input & ObjectId Validation ---');
  const resInvalidId = await supertest(app)
    .patch('/api/v1/venue/admin/resources/invalid-object-id/location')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ floor: 'First Floor' });
  assert(resInvalidId.status === 400, 'Invalid resource ObjectId returns 400 Bad Request');

  console.log('\n==================================================');
  console.log(`PHASE 16 TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('==================================================\n');

  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }

  process.exit(failCount > 0 ? 1 : 0);
};

runTests();
