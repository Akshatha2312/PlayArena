const assert = require('assert');
const authService = require('./src/services/authService');
const authController = require('./src/controllers/authController');
const { hashPassword } = require('./src/utils/password');

async function runLoginTests() {
  console.log('=== RUNNING CUSTOMER LOGIN TEST SUITE ===\n');

  const testEmail = 'logintest@playarena.local';
  const testPassword = 'CorrectPassword123!';
  const hashedPassword = await hashPassword(testPassword);

  // Mock User stored in DB
  const mockDbUser = {
    _id: 'mock_user_id_777',
    name: 'Login Test User',
    email: testEmail,
    phone: '9876543210',
    passwordHash: hashedPassword,
    role: 'customer',
    isVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // TEST 1: Valid Login
  {
    console.log('TEST 1: Valid Login (HTTP 200)');
    const originalLogin = authService.loginUser;
    authService.loginUser = async ({ email, password }) => {
      assert.strictEqual(email, testEmail);
      assert.strictEqual(password, testPassword);
      return {
        id: mockDbUser._id,
        name: mockDbUser.name,
        email: mockDbUser.email,
        phone: mockDbUser.phone,
        role: mockDbUser.role,
        isVerified: mockDbUser.isVerified,
        createdAt: mockDbUser.createdAt,
        updatedAt: mockDbUser.updatedAt,
      };
    };

    let statusSet = 0;
    let jsonSent = null;
    const req = { body: { email: testEmail, password: testPassword } };
    const res = {
      status(code) { statusSet = code; return this; },
      json(data) { jsonSent = data; return this; }
    };

    await authController.login(req, res, () => {});
    assert.strictEqual(statusSet, 200);
    assert.strictEqual(jsonSent.status, 'success');
    assert.strictEqual(jsonSent.message, 'Login successful');
    assert.strictEqual(jsonSent.data.user.email, testEmail);
    assert.strictEqual(jsonSent.data.user.role, 'customer');
    assert.strictEqual('passwordHash' in jsonSent.data.user, false);
    assert.strictEqual('password' in jsonSent.data.user, false);
    assert.strictEqual('token' in jsonSent.data, false); // No JWT generated yet

    authService.loginUser = originalLogin;
    console.log('✅ TEST 1 PASSED\n');
  }

  // TEST 2 & 3: Wrong Password & Non-Existent Email (Generic 401 Unauthorized)
  {
    console.log('TEST 2 & 3: Wrong Password & Non-Existent Email (Generic 401)');
    const originalLogin = authService.loginUser;
    authService.loginUser = async () => {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    };

    // Test wrong password
    let statusSet1 = 0, jsonSent1 = null;
    await authController.login(
      { body: { email: testEmail, password: 'WrongPassword' } },
      { status(code) { statusSet1 = code; return this; }, json(data) { jsonSent1 = data; return this; } },
      () => {}
    );

    // Test non-existent email
    let statusSet2 = 0, jsonSent2 = null;
    await authController.login(
      { body: { email: 'nonexistent@example.com', password: testPassword } },
      { status(code) { statusSet2 = code; return this; }, json(data) { jsonSent2 = data; return this; } },
      () => {}
    );

    assert.strictEqual(statusSet1, 401);
    assert.strictEqual(jsonSent1.message, 'Invalid email or password');
    assert.strictEqual(statusSet2, 401);
    assert.strictEqual(jsonSent2.message, 'Invalid email or password');

    authService.loginUser = originalLogin;
    console.log('✅ TEST 2 & 3 PASSED (Identical 401 message prevents user enumeration)\n');
  }

  // TEST 4 & 5 & 6 & 7: Validation Checks (Missing/Empty email or password)
  {
    console.log('TEST 4-7: Missing and Empty Credentials Validation (HTTP 400)');

    const cases = [
      { body: { password: 'pass' }, field: 'Email' },
      { body: { email: 'user@example.com' }, field: 'Password' },
      { body: { email: '   ', password: 'pass' }, field: 'Email' },
      { body: { email: 'user@example.com', password: '   ' }, field: 'Password' },
    ];

    for (const testCase of cases) {
      let statusSet = 0, jsonSent = null;
      await authController.login(
        { body: testCase.body },
        { status(code) { statusSet = code; return this; }, json(data) { jsonSent = data; return this; } },
        () => {}
      );
      assert.strictEqual(statusSet, 400);
      assert.strictEqual(jsonSent.status, 'fail');
      assert.strictEqual(jsonSent.message, `${testCase.field} is required`);
    }
    console.log('✅ TEST 4-7 PASSED\n');
  }

  // TEST 8: Attempt to Inject/Override Role in Login Request
  {
    console.log('TEST 8: Role Injection Protection in Login Request');
    const originalLogin = authService.loginUser;
    let passedArgs = null;

    authService.loginUser = async (credentials) => {
      passedArgs = credentials;
      return {
        id: mockDbUser._id,
        name: mockDbUser.name,
        email: mockDbUser.email,
        phone: mockDbUser.phone,
        role: 'customer', // Always returns stored DB role
        isVerified: mockDbUser.isVerified,
      };
    };

    let statusSet = 0, jsonSent = null;
    const req = {
      body: {
        email: testEmail,
        password: testPassword,
        role: 'admin', // Attempted role injection
      }
    };
    const res = {
      status(code) { statusSet = code; return this; },
      json(data) { jsonSent = data; return this; }
    };

    await authController.login(req, res, () => {});
    assert.strictEqual(statusSet, 200);
    assert.strictEqual(jsonSent.data.user.role, 'customer');
    assert.strictEqual('role' in passedArgs, false); // Controller stripped body.role

    authService.loginUser = originalLogin;
    console.log('✅ TEST 8 PASSED (Role from req.body ignored, database role returned)\n');
  }

  // TEST 9: Password Security Exclusions
  {
    console.log('TEST 9: Verification that passwordHash is Excluded');
    const originalLogin = authService.loginUser;
    authService.loginUser = async () => ({
      id: 'id_123',
      name: 'User',
      email: testEmail,
      phone: '1234567890',
      role: 'customer',
      isVerified: false,
    });

    let jsonSent = null;
    await authController.login(
      { body: { email: testEmail, password: testPassword } },
      { status() { return this; }, json(data) { jsonSent = data; return this; } },
      () => {}
    );
    assert.strictEqual('passwordHash' in jsonSent.data.user, false);
    assert.strictEqual('password' in jsonSent.data.user, false);

    authService.loginUser = originalLogin;
    console.log('✅ TEST 9 PASSED\n');
  }

  // TEST 10: Express Route & Regression Integration Check
  {
    console.log('TEST 10: Express Route & Health Check Regression');
    const app = require('./src/app');
    const http = require('http');

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    // Test POST /api/v1/auth/login route endpoint handles bad request cleanly
    const loginRouteRes = await fetch(`http://localhost:${port}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '', password: '' }),
    });
    assert.strictEqual(loginRouteRes.status, 400);

    // Test GET /api/v1/health regression
    const healthRes = await fetch(`http://localhost:${port}/api/v1/health`);
    const healthData = await healthRes.json();
    assert.strictEqual(healthRes.status, 200);
    assert.strictEqual(healthData.status, 'success');

    // Test 404 handler regression
    const unknownRes = await fetch(`http://localhost:${port}/api/v1/nonexistent-route`);
    assert.strictEqual(unknownRes.status, 404);

    server.close();
    console.log('✅ TEST 10 PASSED (Routes & regression tests verified)\n');
  }

  console.log('=== ALL CUSTOMER LOGIN TESTS PASSED SUCCESSFULLY! ===');
}

runLoginTests().catch((err) => {
  console.error('❌ LOGIN TEST SUITE ERROR:', err);
  process.exit(1);
});
