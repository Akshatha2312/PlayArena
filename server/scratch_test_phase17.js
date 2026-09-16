/**
 * scratch_test_phase17.js
 * Integration & Business Logic Test Suite for Phase 17: Support & Issue Management System.
 */

require('dotenv').config();
process.env.NODE_ENV = 'test';
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test_jwt_secret_play_arena_phase_17_mock_key';
}

const mongoose = require('mongoose');
const supertest = require('supertest');

const app = require('./src/app');
const SupportIssue = require('./src/models/SupportIssue');
const SupportMessage = require('./src/models/SupportMessage');
const supportService = require('./src/services/supportService');
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
  console.log('STARTING PHASE 17 SUPPORT & ISSUE MANAGEMENT TEST SUITE');
  console.log('==================================================\n');

  const inMemoryIssues = new Map();
  const inMemoryMessages = new Map();

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/playarena_test_p17';
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 1500 });
    console.log('[INFO] Connected to MongoDB for Phase 17 testing.');
  } catch (err) {
    mongoose.set('bufferCommands', false);
    console.log('[INFO] Live MongoDB connection unavailable. Setting up in-memory Mongoose model stubs.\n');

    SupportIssue.prototype.save = async function () {
      if (!this._id) this._id = new mongoose.Types.ObjectId();
      if (!this.createdAt) this.createdAt = new Date();
      if (!this.updatedAt) this.updatedAt = new Date();
      inMemoryIssues.set(this._id.toString(), this);
      return this;
    };

    SupportIssue.findById = function (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const doc = inMemoryIssues.get(id.toString());
      const resDoc = doc ? new SupportIssue(doc.toObject ? doc.toObject() : doc) : null;
      const queryObj = {
        populate: function () { return queryObj; },
        exec: async function () { return resDoc; },
        then: function (resolve, reject) { return Promise.resolve(resDoc).then(resolve, reject); },
      };
      return queryObj;
    };

    SupportIssue.findOne = function (query) {
      let foundDoc = null;
      for (const issue of inMemoryIssues.values()) {
        let match = true;
        if (query._id && issue._id.toString() !== query._id.toString()) match = false;
        if (query.userId && issue.userId && issue.userId.toString() !== query.userId.toString()) match = false;
        if (query.issueNumber && issue.issueNumber !== query.issueNumber) match = false;
        if (match) {
          foundDoc = new SupportIssue(issue.toObject ? issue.toObject() : issue);
          break;
        }
      }
      const queryObj = {
        populate: function () { return queryObj; },
        exec: async function () { return foundDoc; },
        then: function (resolve, reject) { return Promise.resolve(foundDoc).then(resolve, reject); },
      };
      return queryObj;
    };

    SupportIssue.find = function (filter = {}) {
      let list = Array.from(inMemoryIssues.values());
      if (filter.userId) list = list.filter((i) => i.userId.toString() === filter.userId.toString());
      if (filter.status) list = list.filter((i) => i.status === filter.status);

      return {
        populate: function () { return this; },
        sort: function () { return this; },
        skip: function () { return this; },
        limit: async function () { return list.map((i) => new SupportIssue(i.toObject ? i.toObject() : i)); },
      };
    };

    SupportIssue.countDocuments = async function (filter = {}) {
      let list = Array.from(inMemoryIssues.values());
      if (filter.userId) list = list.filter((i) => i.userId.toString() === filter.userId.toString());
      if (filter.status) list = list.filter((i) => i.status === filter.status);
      return list.length;
    };

    SupportMessage.prototype.save = async function () {
      if (!this._id) this._id = new mongoose.Types.ObjectId();
      if (!this.createdAt) this.createdAt = new Date();
      inMemoryMessages.set(this._id.toString(), this);
      return this;
    };

    SupportMessage.find = function (filter = {}) {
      let list = Array.from(inMemoryMessages.values());
      if (filter.issueId) list = list.filter((m) => m.issueId.toString() === filter.issueId.toString());
      if (filter.isInternal !== undefined) list = list.filter((m) => m.isInternal === filter.isInternal);

      const resList = list.map((m) => new SupportMessage(m.toObject ? m.toObject() : m));
      const queryObj = {
        populate: function () { return queryObj; },
        sort: function () { return queryObj; },
        exec: async function () { return resList; },
        then: function (resolve, reject) { return Promise.resolve(resList).then(resolve, reject); },
      };
      return queryObj;
    };
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

  // 1. Issue Sequence Generator & Validation
  console.log('--- Section 1: Issue Number & Validation Rules ---');
  const invNum = await supportService.generateIssueNumber();
  assert(invNum.startsWith('PA-ISS-'), 'Issue number has standard prefix PA-ISS-');
  assert(invNum.split('-').length >= 4, 'Issue number contains year and sequence parts');

  // 2. Customer Issue Creation & Validation Rejections
  console.log('\n--- Section 2: Issue Creation & Input Validation ---');
  const customerId = createMockId();
  const otherCustomerId = createMockId();

  try {
    await supportService.createCustomerIssue(customerId, { category: 'booking', subject: '  ', description: 'valid' });
    assert(false, 'Empty/whitespace subject rejected');
  } catch (e) {
    assert(e.statusCode === 400, 'Empty/whitespace subject rejected with HTTP 400');
  }

  try {
    await supportService.createCustomerIssue(customerId, { category: 'booking', subject: 'Valid subject', description: '' });
    assert(false, 'Empty/whitespace description rejected');
  } catch (e) {
    assert(e.statusCode === 400, 'Empty/whitespace description rejected with HTTP 400');
  }

  // 3. Issue Creation & Ownership Boundaries
  console.log('\n--- Section 3: REST Security & Ownership Guards ---');
  const customerToken = generateUserToken({ _id: customerId, role: 'customer' });
  const otherCustomerToken = generateUserToken({ _id: otherCustomerId, role: 'customer' });
  const staffToken = generateUserToken({ _id: createMockId(), role: 'staff' });
  const adminToken = generateUserToken({ _id: createMockId(), role: 'admin' });

  // Unauthenticated issue creation
  const resUnauth = await supertest(app).post('/api/v1/support/issues').send({ subject: 'Test', description: 'Desc' });
  assert(resUnauth.status === 401, 'Unauthenticated POST /api/v1/support/issues returns 401 Unauthorized');

  // Staff attempting customer issue creation route
  const resStaffCreate = await supertest(app)
    .post('/api/v1/support/issues')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({ subject: 'Test', description: 'Desc' });
  assert(resStaffCreate.status === 403, 'Staff token attempting customer issue endpoint returns 403 Forbidden');

  // Customer creating valid ticket
  const resCreate = await supertest(app)
    .post('/api/v1/support/issues')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ category: 'check_in', subject: 'Court busy on arrival', description: 'Court was occupied during start time.' });

  assert(resCreate.status === 201, 'Customer creating support ticket returns 201 Created');
  assert(resCreate.body.data?.issue?.issueNumber.startsWith('PA-ISS-'), 'Response returns valid issueNumber');

  const createdIssueId = resCreate.body.data?.issue?._id || createMockId();

  // Cross-customer access check
  const resOtherCustGet = await supertest(app)
    .get(`/api/v1/support/issues/${createdIssueId}`)
    .set('Authorization', `Bearer ${otherCustomerToken}`);
  assert(resOtherCustGet.status === 404, 'Customer B attempting to read Customer A ticket returns 404 Not Found');

  // 4. Staff Response & Internal Note Isolation
  console.log('\n--- Section 4: Internal Note Isolation & DTO Protection ---');

  // Staff replying to ticket
  const resStaffReply = await supertest(app)
    .post(`/api/v1/support/staff/issues/${createdIssueId}/messages`)
    .set('Authorization', `Bearer ${staffToken}`)
    .send({ message: 'Hello Customer, we are looking into this.' });
  assert(resStaffReply.status === 201, 'Staff replying to ticket returns 201 Created');

  // Staff adding internal note
  const resInternalNote = await supertest(app)
    .post(`/api/v1/support/staff/issues/${createdIssueId}/internal-notes`)
    .set('Authorization', `Bearer ${staffToken}`)
    .send({ note: 'INTERNAL: Customer was delayed by 10 mins.' });
  assert(resInternalNote.status === 201, 'Staff recording internal note returns 201 Created');

  // Customer reading thread DTO - MUST NOT receive internal note
  const resCustomerView = await supertest(app)
    .get(`/api/v1/support/issues/${createdIssueId}`)
    .set('Authorization', `Bearer ${customerToken}`);

  if (resCustomerView.status !== 200) console.log('resCustomerView body:', resCustomerView.body);
  assert(resCustomerView.status === 200, 'Customer reading own issue returns 200 OK');
  const customerMessages = resCustomerView.body.data?.messages || [];
  const hasInternalInCustomerView = customerMessages.some((m) => m.isInternal === true || (m.message && m.message.includes('INTERNAL:')));
  assert(!hasInternalInCustomerView, 'Customer view strictly isolates and hides internal notes');

  // Staff reading thread DTO - MUST receive internal note
  const resStaffView = await supertest(app)
    .get(`/api/v1/support/staff/issues/${createdIssueId}`)
    .set('Authorization', `Bearer ${staffToken}`);

  if (resStaffView.status !== 200) console.log('resStaffView body:', resStaffView.body);
  assert(resStaffView.status === 200, 'Staff reading issue returns 200 OK');
  const staffMessages = resStaffView.body.data?.messages || [];
  const hasInternalInStaffView = staffMessages.some((m) => m.isInternal === true);
  assert(hasInternalInStaffView, 'Staff view includes internal notes DTOs');

  // 5. Admin Controls & Status State Transitions
  console.log('\n--- Section 5: Admin Controls & State Transitions ---');

  // Priority update by Admin
  const resPrio = await supertest(app)
    .patch(`/api/v1/support/staff/issues/${createdIssueId}/priority`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ priority: 'urgent' });
  assert(resPrio.status === 200, 'Admin updating ticket priority to urgent returns 200 OK');

  // Status update to resolved
  const resStatus = await supertest(app)
    .patch(`/api/v1/support/staff/issues/${createdIssueId}/status`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'resolved' });
  assert(resStatus.status === 200, 'Admin resolving ticket status returns 200 OK');

  // Customer closing ticket
  const resClose = await supertest(app)
    .post(`/api/v1/support/issues/${createdIssueId}/close`)
    .set('Authorization', `Bearer ${customerToken}`);
  assert(resClose.status === 200, 'Customer closing ticket returns 200 OK');

  console.log('\n==================================================');
  console.log(`PHASE 17 TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('==================================================\n');

  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }

  process.exit(failCount > 0 ? 1 : 0);
};

runTests();
