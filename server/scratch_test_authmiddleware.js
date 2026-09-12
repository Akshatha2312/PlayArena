const assert = require('assert');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { authenticate } = require('./src/middleware/authMiddleware');
const { generateUserToken } = require('./src/utils/token');
const User = require('./src/models/User');

async function runMiddlewareTests() {
  console.log('=== RUNNING AUTHENTICATION MIDDLEWARE TEST SUITE ===\n');

  const mockUserId = '650000000000000000000001';
  const mockCustomer = {
    _id: mockUserId,
    role: 'customer',
  };

  // Mock User.findById for middleware DB check
  const originalFindById = User.findById;
  User.findById = (id) => ({
    select: async () => {
      if (id === mockUserId) return mockCustomer;
      return null;
    }
  });

  // TEST 1: Missing Authorization Header
  {
    console.log('TEST 1: Missing Authorization Header (HTTP 401)');
    let statusSet = 0, jsonSent = null;
    const req = { headers: {} };
    const res = {
      status(code) { statusSet = code; return this; },
      json(data) { jsonSent = data; return this; }
    };
    await authenticate(req, res, () => {});
    assert.strictEqual(statusSet, 401);
    assert.strictEqual(jsonSent.status, 'fail');
    assert.strictEqual(jsonSent.message.includes('Authentication required'), true);
    console.log('✅ TEST 1 PASSED\n');
  }

  // TEST 2: Invalid Authorization Header Format
  {
    console.log('TEST 2: Invalid Authorization Format (HTTP 401)');
    let statusSet = 0, jsonSent = null;
    const req = { headers: { authorization: 'Basic dXNlcjpwYXNz' } };
    const res = {
      status(code) { statusSet = code; return this; },
      json(data) { jsonSent = data; return this; }
    };
    await authenticate(req, res, () => {});
    assert.strictEqual(statusSet, 401);
    assert.strictEqual(jsonSent.status, 'fail');
    assert.strictEqual(jsonSent.message.includes('Invalid Authorization header format'), true);
    console.log('✅ TEST 2 PASSED\n');
  }

  // TEST 3: Bearer Without Token
  {
    console.log('TEST 3: Bearer Header Without Token (HTTP 401)');
    let statusSet = 0, jsonSent = null;
    const req = { headers: { authorization: 'Bearer  ' } };
    const res = {
      status(code) { statusSet = code; return this; },
      json(data) { jsonSent = data; return this; }
    };
    await authenticate(req, res, () => {});
    assert.strictEqual(statusSet, 401);
    assert.strictEqual(jsonSent.status, 'fail');
    console.log('✅ TEST 3 PASSED\n');
  }

  // TEST 4: Invalid JWT String
  {
    console.log('TEST 4: Malformed/Invalid JWT (HTTP 401)');
    let statusSet = 0, jsonSent = null;
    const req = { headers: { authorization: 'Bearer fake.invalid.jwttoken' } };
    const res = {
      status(code) { statusSet = code; return this; },
      json(data) { jsonSent = data; return this; }
    };
    await authenticate(req, res, () => {});
    assert.strictEqual(statusSet, 401);
    assert.strictEqual(jsonSent.status, 'fail');
    assert.strictEqual(jsonSent.message.includes('Invalid or expired authentication token'), true);
    console.log('✅ TEST 4 PASSED\n');
  }

  // TEST 5: Valid JWT Token - Identity Attached to req.user
  {
    console.log('TEST 5: Valid JWT Passes Middleware & Populates req.user');
    const validToken = generateUserToken({ id: mockUserId, role: 'customer' });
    let nextCalled = false;
    const req = { headers: { authorization: `Bearer ${validToken}` } };
    const res = { status() { return this; }, json() { return this; } };

    await authenticate(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
    assert.strictEqual(req.user.userId, mockUserId);
    assert.strictEqual(req.user.role, 'customer');
    console.log('  Populated req.user:', req.user);
    console.log('✅ TEST 5 PASSED\n');
  }

  // TEST 6: Expired JWT Token
  {
    console.log('TEST 6: Expired JWT Token (HTTP 401)');
    const expiredToken = jwt.sign(
      { userId: mockUserId, role: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    );
    let statusSet = 0, jsonSent = null;
    const req = { headers: { authorization: `Bearer ${expiredToken}` } };
    const res = {
      status(code) { statusSet = code; return this; },
      json(data) { jsonSent = data; return this; }
    };

    await authenticate(req, res, () => {});
    assert.strictEqual(statusSet, 401);
    assert.strictEqual(jsonSent.message.includes('Invalid or expired authentication token'), true);
    console.log('✅ TEST 6 PASSED\n');
  }

  // TEST 7: Tampered JWT Token Signature
  {
    console.log('TEST 7: Tampered JWT Signature (HTTP 401)');
    const validToken = generateUserToken({ id: mockUserId, role: 'customer' });
    const tamperedToken = validToken.slice(0, -5) + 'xxxxx';

    let statusSet = 0, jsonSent = null;
    const req = { headers: { authorization: `Bearer ${tamperedToken}` } };
    const res = {
      status(code) { statusSet = code; return this; },
      json(data) { jsonSent = data; return this; }
    };

    await authenticate(req, res, () => {});
    assert.strictEqual(statusSet, 401);
    assert.strictEqual(jsonSent.message.includes('Invalid or expired authentication token'), true);
    console.log('✅ TEST 7 PASSED\n');
  }

  // TEST 8: Role Spoofing in Request Body
  {
    console.log('TEST 8: Body Role Spoofing Prevention');
    const validToken = generateUserToken({ id: mockUserId, role: 'customer' });
    let nextCalled = false;
    const req = {
      headers: { authorization: `Bearer ${validToken}` },
      body: { role: 'admin', userId: 'attacker_id' } // Attempted body tampering
    };
    const res = { status() { return this; }, json() { return this; } };

    await authenticate(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
    assert.strictEqual(req.user.userId, mockUserId);
    assert.strictEqual(req.user.role, 'customer');
    console.log('  req.user role remains:', req.user.role);
    console.log('✅ TEST 8 PASSED (Request body identity ignored)\n');
  }

  // Restore User.findById
  User.findById = originalFindById;

  // TEST 9: Express Endpoints & Phase 1 Regression Checks
  {
    console.log('TEST 9: Express Routes & Phase 1 Regression Checks');
    const app = require('./src/app');
    const http = require('http');

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    const healthRes = await fetch(`http://localhost:${port}/api/v1/health`);
    assert.strictEqual(healthRes.status, 200);

    const unknownRes = await fetch(`http://localhost:${port}/api/v1/nonexistent`);
    assert.strictEqual(unknownRes.status, 404);

    server.close();
    console.log('✅ TEST 9 PASSED (App routes & regression checks verified)\n');
  }

  console.log('=== ALL AUTHENTICATION MIDDLEWARE TESTS PASSED SUCCESSFULLY! ===');
}

runMiddlewareTests().catch((err) => {
  console.error('❌ AUTH MIDDLEWARE TEST SUITE ERROR:', err);
  process.exit(1);
});
