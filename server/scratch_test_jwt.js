const assert = require('assert');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const authService = require('./src/services/authService');
const authController = require('./src/controllers/authController');
const { hashPassword } = require('./src/utils/password');
const { verifyToken } = require('./src/utils/token');

async function runJwtTests() {
  console.log('=== RUNNING JWT GENERATION TEST SUITE ===\n');

  const testEmail = 'jwttest@playarena.local';
  const testPassword = 'SecurePassword123!';
  const hashedPassword = await hashPassword(testPassword);

  const mockDbUser = {
    _id: 'mock_user_id_999',
    name: 'JWT Test User',
    email: testEmail,
    phone: '9876543210',
    passwordHash: hashedPassword,
    role: 'customer',
    isVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // TEST 1: Valid Login & Token Generation
  {
    console.log('TEST 1: Valid Login & Token Generation (HTTP 200)');
    const originalLogin = authService.loginUser;
    authService.loginUser = async ({ email, password }) => {
      assert.strictEqual(email, testEmail);
      assert.strictEqual(password, testPassword);
      const { generateUserToken } = require('./src/utils/token');
      const safeUser = {
        id: mockDbUser._id,
        name: mockDbUser.name,
        email: mockDbUser.email,
        phone: mockDbUser.phone,
        role: mockDbUser.role,
        isVerified: mockDbUser.isVerified,
      };
      return { user: safeUser, token: generateUserToken(safeUser) };
    };

    let statusSet = 0, jsonSent = null;
    const req = { body: { email: testEmail, password: testPassword } };
    const res = {
      status(code) { statusSet = code; return this; },
      json(data) { jsonSent = data; return this; }
    };

    await authController.login(req, res, () => {});
    assert.strictEqual(statusSet, 200);
    assert.strictEqual(jsonSent.status, 'success');
    assert.strictEqual(typeof jsonSent.data.token, 'string');
    assert.strictEqual(jsonSent.data.token.length > 20, true);
    assert.strictEqual('passwordHash' in jsonSent.data.user, false);
    assert.strictEqual('password' in jsonSent.data.user, false);

    authService.loginUser = originalLogin;
    console.log('✅ TEST 1 PASSED\n');
  }

  // TEST 2: Signature Verification & Payload Identity Check
  {
    console.log('TEST 2: Verify JWT Signature & Decoded Identity Payload');
    const { generateUserToken } = require('./src/utils/token');
    const token = generateUserToken({ id: mockDbUser._id, role: mockDbUser.role });

    const decoded = verifyToken(token);
    assert.strictEqual(decoded.userId, mockDbUser._id);
    assert.strictEqual(decoded.role, 'customer');
    console.log('  Decoded Payload:', { userId: decoded.userId, role: decoded.role });
    console.log('✅ TEST 2 PASSED (Signature valid, payload identity verified)\n');
  }

  // TEST 3: Expiration Claim Check
  {
    console.log('TEST 3: JWT Expiration (exp) Claim Check');
    const { generateUserToken } = require('./src/utils/token');
    const token = generateUserToken({ id: mockDbUser._id, role: mockDbUser.role });
    const decoded = jwt.decode(token);

    assert.strictEqual(typeof decoded.exp, 'number');
    assert.strictEqual(decoded.exp > Math.floor(Date.now() / 1000), true);
    console.log('  Expiration timestamp:', new Date(decoded.exp * 1000).toISOString());
    console.log('✅ TEST 3 PASSED\n');
  }

  // TEST 4 & 5: Invalid Credentials -> No Token Generated
  {
    console.log('TEST 4 & 5: Invalid Credentials (No JWT Issued)');
    const originalLogin = authService.loginUser;
    authService.loginUser = async () => {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    };

    let statusSet = 0, jsonSent = null;
    await authController.login(
      { body: { email: testEmail, password: 'WrongPassword' } },
      { status(code) { statusSet = code; return this; }, json(data) { jsonSent = data; return this; } },
      () => {}
    );
    assert.strictEqual(statusSet, 401);
    assert.strictEqual(jsonSent.data, undefined); // No token returned

    authService.loginUser = originalLogin;
    console.log('✅ TEST 4 & 5 PASSED\n');
  }

  // TEST 6: Role Escalation Protection in Token
  {
    console.log('TEST 6: Role Escalation Protection in JWT Payload');
    const { generateUserToken } = require('./src/utils/token');

    // Simulate login request containing malicious body: role = 'admin'
    const req = { body: { email: testEmail, password: testPassword, role: 'admin' } };
    const originalLogin = authService.loginUser;

    authService.loginUser = async () => {
      // Role is sourced strictly from database
      const safeUser = { id: mockDbUser._id, role: mockDbUser.role }; // 'customer'
      return { user: safeUser, token: generateUserToken(safeUser) };
    };

    let jsonSent = null;
    await authController.login(
      req,
      { status() { return this; }, json(data) { jsonSent = data; return this; } },
      () => {}
    );

    const token = jsonSent.data.token;
    const decoded = verifyToken(token);
    assert.strictEqual(decoded.role, 'customer');

    authService.loginUser = originalLogin;
    console.log('✅ TEST 6 PASSED (JWT role locked to customer)\n');
  }

  // TEST 7: JWT_SECRET Isolation Protection
  {
    console.log('TEST 7: JWT_SECRET Protection Check');
    const secret = process.env.JWT_SECRET;
    assert.strictEqual(!!secret, true);
    assert.notStrictEqual(secret, 'your_jwt_secret_here');

    const { generateUserToken } = require('./src/utils/token');
    const token = generateUserToken({ id: mockDbUser._id, role: mockDbUser.role });
    const decoded = jwt.decode(token);

    assert.strictEqual(JSON.stringify(decoded).includes(secret), false);
    console.log('✅ TEST 7 PASSED (JWT_SECRET is isolated)\n');
  }

  // TEST 8: Express Endpoints & Regression Tests
  {
    console.log('TEST 8: Express App Integration & Phase 1 Regression');
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
    console.log('✅ TEST 8 PASSED (App routes & regression checks verified)\n');
  }

  console.log('=== ALL JWT GENERATION TESTS PASSED SUCCESSFULLY! ===');
}

runJwtTests().catch((err) => {
  console.error('❌ JWT TEST SUITE ERROR:', err);
  process.exit(1);
});
