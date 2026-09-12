const assert = require('assert');
const authService = require('./src/services/authService');
const authController = require('./src/controllers/authController');
const { hashPassword } = require('./src/utils/password');

async function runUnitTests() {
  console.log('=== RUNNING CUSTOMER REGISTRATION TEST SUITE ===\n');

  // TEST 1: Controller Input Validation - Missing Name
  {
    console.log('TEST 1: Missing Name Validation (HTTP 400)');
    let statusSet = 0;
    let jsonSent = null;
    const req = { body: { email: 'test@example.com', phone: '1234567890', password: 'pass' } };
    const res = {
      status(code) { statusSet = code; return this; },
      json(data) { jsonSent = data; return this; }
    };
    await authController.register(req, res, () => {});
    assert.strictEqual(statusSet, 400);
    assert.strictEqual(jsonSent.status, 'fail');
    assert.strictEqual(jsonSent.message, 'Name is required');
    console.log('✅ TEST 1 PASSED\n');
  }

  // TEST 2: Controller Input Validation - Missing Email
  {
    console.log('TEST 2: Missing Email Validation (HTTP 400)');
    let statusSet = 0;
    let jsonSent = null;
    const req = { body: { name: 'User', phone: '1234567890', password: 'pass' } };
    const res = {
      status(code) { statusSet = code; return this; },
      json(data) { jsonSent = data; return this; }
    };
    await authController.register(req, res, () => {});
    assert.strictEqual(statusSet, 400);
    assert.strictEqual(jsonSent.status, 'fail');
    assert.strictEqual(jsonSent.message, 'Email is required');
    console.log('✅ TEST 2 PASSED\n');
  }

  // TEST 3: Controller Input Validation - Missing Phone
  {
    console.log('TEST 3: Missing Phone Validation (HTTP 400)');
    let statusSet = 0;
    let jsonSent = null;
    const req = { body: { name: 'User', email: 'test@example.com', password: 'pass' } };
    const res = {
      status(code) { statusSet = code; return this; },
      json(data) { jsonSent = data; return this; }
    };
    await authController.register(req, res, () => {});
    assert.strictEqual(statusSet, 400);
    assert.strictEqual(jsonSent.status, 'fail');
    assert.strictEqual(jsonSent.message, 'Phone number is required');
    console.log('✅ TEST 3 PASSED\n');
  }

  // TEST 4: Controller Input Validation - Missing Password
  {
    console.log('TEST 4: Missing Password Validation (HTTP 400)');
    let statusSet = 0;
    let jsonSent = null;
    const req = { body: { name: 'User', email: 'test@example.com', phone: '1234567890' } };
    const res = {
      status(code) { statusSet = code; return this; },
      json(data) { jsonSent = data; return this; }
    };
    await authController.register(req, res, () => {});
    assert.strictEqual(statusSet, 400);
    assert.strictEqual(jsonSent.status, 'fail');
    assert.strictEqual(jsonSent.message, 'Password is required');
    console.log('✅ TEST 4 PASSED\n');
  }

  // TEST 5 & 6: Security Check - Role Parameter Stripping
  {
    console.log('TEST 5 & 6: Security Role Lock & Parameter Isolation');
    // Save original registerCustomer
    const originalRegister = authService.registerCustomer;
    let passedParams = null;

    authService.registerCustomer = async (params) => {
      passedParams = params;
      return {
        id: 'mock_id_123',
        name: params.name,
        email: params.email,
        phone: params.phone,
        role: 'customer',
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    };

    let statusSet = 0;
    let jsonSent = null;
    const req = {
      body: {
        name: 'Hacker User',
        email: 'hacker@example.com',
        phone: '9999999999',
        password: 'Password123!',
        role: 'admin', // Attempted escalation
      }
    };
    const res = {
      status(code) { statusSet = code; return this; },
      json(data) { jsonSent = data; return this; }
    };

    await authController.register(req, res, () => {});

    // Assert controller did NOT pass role to service
    assert.strictEqual('role' in passedParams, false);
    // Assert response status is 201 Created and role is 'customer'
    assert.strictEqual(statusSet, 201);
    assert.strictEqual(jsonSent.data.user.role, 'customer');
    assert.strictEqual('passwordHash' in jsonSent.data.user, false);
    assert.strictEqual('password' in jsonSent.data.user, false);

    // Restore original service
    authService.registerCustomer = originalRegister;
    console.log('✅ TEST 5 & 6 PASSED (Role tampering prevented, passwordHash not exposed)\n');
  }

  // TEST 7: Service Layer Duplicate Email Error (409 Conflict)
  {
    console.log('TEST 7: Duplicate Email Error Handling (HTTP 409)');
    const originalRegister = authService.registerCustomer;
    authService.registerCustomer = async () => {
      const err = new Error('An account with this email already exists');
      err.statusCode = 409;
      throw err;
    };

    let statusSet = 0;
    let jsonSent = null;
    const req = {
      body: {
        name: 'Duplicate',
        email: 'existing@example.com',
        phone: '1234567890',
        password: 'Password123!'
      }
    };
    const res = {
      status(code) { statusSet = code; return this; },
      json(data) { jsonSent = data; return this; }
    };

    await authController.register(req, res, () => {});
    assert.strictEqual(statusSet, 409);
    assert.strictEqual(jsonSent.status, 'fail');
    assert.strictEqual(jsonSent.message, 'An account with this email already exists');

    authService.registerCustomer = originalRegister;
    console.log('✅ TEST 7 PASSED (409 Conflict returned)\n');
  }

  // TEST 8: Password Utility Integration Test
  {
    console.log('TEST 8: Password Hashing Utility Verification');
    const plainPass = 'CustomerSecret999!';
    const hash = await hashPassword(plainPass);
    assert.notStrictEqual(hash, plainPass);
    assert.strictEqual(hash.startsWith('$2a$') || hash.startsWith('$2b$'), true);
    console.log('✅ TEST 8 PASSED (Plaintext password safely hashed)\n');
  }

  // TEST 9 & 10: Express Route & Health/404 App Regression Tests
  {
    console.log('TEST 9 & 10: Express App Integration & Regression Checks');
    const app = require('./src/app');
    const http = require('http');

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    // Test GET /api/v1/health
    const healthRes = await fetch(`http://localhost:${port}/api/v1/health`);
    const healthData = await healthRes.json();
    assert.strictEqual(healthRes.status, 200);
    assert.strictEqual(healthData.status, 'success');

    // Test Unknown Route 404
    const unknownRes = await fetch(`http://localhost:${port}/api/v1/nonexistent`);
    const unknownData = await unknownRes.json();
    assert.strictEqual(unknownRes.status, 404);
    assert.strictEqual(unknownData.status, 'fail');

    server.close();
    console.log('✅ TEST 9 & 10 PASSED (App routes & regression checks verified)\n');
  }

  console.log('=== ALL REGISTRATION TESTS PASSED SUCCESSFULLY! ===');
}

runUnitTests().catch((err) => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
