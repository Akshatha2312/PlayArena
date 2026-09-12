const assert = require('assert');
const jwt = require('jsonwebtoken');
const http = require('http');
require('dotenv').config();

const app = require('./src/app');
const User = require('./src/models/User');
const { generateUserToken } = require('./src/utils/token');

async function runPhase2FinalTests() {
  console.log('=== STARTING PHASE 2 FINAL VERIFICATION TEST SUITE ===\n');

  const mockCustomerUser = { _id: '650000000000000000000001', role: 'customer' };
  const mockStaffUser = { _id: '650000000000000000000002', role: 'staff' };
  const mockAdminUser = { _id: '650000000000000000000003', role: 'admin' };

  // Mock User.findById for authentication DB check
  const originalFindById = User.findById;
  User.findById = (id) => ({
    select: async () => {
      const idStr = id.toString();
      if (idStr === mockCustomerUser._id) return mockCustomerUser;
      if (idStr === mockStaffUser._id) return mockStaffUser;
      if (idStr === mockAdminUser._id) return mockAdminUser;
      return null;
    }
  });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  const customerToken = generateUserToken({ id: mockCustomerUser._id, role: 'customer' });
  const staffToken = generateUserToken({ id: mockStaffUser._id, role: 'staff' });
  const adminToken = generateUserToken({ id: mockAdminUser._id, role: 'admin' });

  // TEST 1: Customer JWT -> Customer Route
  {
    console.log('TEST 1: Customer JWT -> Customer Route (HTTP 200)');
    const res = await fetch(`${baseUrl}/customer/profile`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'success');
    assert.strictEqual(data.data.user.role, 'customer');
    console.log('✅ TEST 1 PASSED\n');
  }

  // TEST 2: Customer JWT -> Staff Route
  {
    console.log('TEST 2: Customer JWT -> Staff Route (HTTP 403 Forbidden)');
    const res = await fetch(`${baseUrl}/staff/profile`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 403);
    assert.strictEqual(data.status, 'fail');
    console.log('✅ TEST 2 PASSED\n');
  }

  // TEST 3: Customer JWT -> Admin Route
  {
    console.log('TEST 3: Customer JWT -> Admin Route (HTTP 403 Forbidden)');
    const res = await fetch(`${baseUrl}/admin/profile`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 403);
    assert.strictEqual(data.status, 'fail');
    console.log('✅ TEST 3 PASSED\n');
  }

  // TEST 4: Staff JWT -> Staff Route
  {
    console.log('TEST 4: Staff JWT -> Staff Route (HTTP 200)');
    const res = await fetch(`${baseUrl}/staff/profile`, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.data.user.role, 'staff');
    console.log('✅ TEST 4 PASSED\n');
  }

  // TEST 5: Staff JWT -> Customer Route
  {
    console.log('TEST 5: Staff JWT -> Customer-Only Route (HTTP 403 Forbidden)');
    const res = await fetch(`${baseUrl}/customer/profile`, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    assert.strictEqual(res.status, 403);
    console.log('✅ TEST 5 PASSED\n');
  }

  // TEST 6: Staff JWT -> Admin Route
  {
    console.log('TEST 6: Staff JWT -> Admin Route (HTTP 403 Forbidden)');
    const res = await fetch(`${baseUrl}/admin/profile`, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    assert.strictEqual(res.status, 403);
    console.log('✅ TEST 6 PASSED\n');
  }

  // TEST 7: Admin JWT -> Admin Route
  {
    console.log('TEST 7: Admin JWT -> Admin Route (HTTP 200)');
    const res = await fetch(`${baseUrl}/admin/profile`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.data.user.role, 'admin');
    console.log('✅ TEST 7 PASSED\n');
  }

  // TEST 8: Admin JWT -> Staff Route (Staff + Admin Allowed)
  {
    console.log('TEST 8: Admin JWT -> Staff Route (Multi-role HTTP 200)');
    const res = await fetch(`${baseUrl}/staff/profile`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.data.user.role, 'admin');
    console.log('✅ TEST 8 PASSED\n');
  }

  // TEST 9: Admin JWT -> Customer Route
  {
    console.log('TEST 9: Admin JWT -> Customer-Only Route (HTTP 403 Forbidden)');
    const res = await fetch(`${baseUrl}/customer/profile`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 403);
    console.log('✅ TEST 9 PASSED\n');
  }

  // TEST 10: Missing Token -> Protected Route
  {
    console.log('TEST 10: Missing Token -> Protected Route (HTTP 401 Unauthorized)');
    const res = await fetch(`${baseUrl}/admin/profile`);
    assert.strictEqual(res.status, 401);
    console.log('✅ TEST 10 PASSED\n');
  }

  // TEST 11: Invalid Token -> Protected Route
  {
    console.log('TEST 11: Invalid Token -> Protected Route (HTTP 401 Unauthorized)');
    const res = await fetch(`${baseUrl}/admin/profile`, {
      headers: { Authorization: 'Bearer invalid.token.value' }
    });
    assert.strictEqual(res.status, 401);
    console.log('✅ TEST 11 PASSED\n');
  }

  // TEST 12: Expired Token -> Protected Route
  {
    console.log('TEST 12: Expired Token -> Protected Route (HTTP 401 Unauthorized)');
    const expiredToken = jwt.sign(
      { userId: mockAdminUser._id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    );
    const res = await fetch(`${baseUrl}/admin/profile`, {
      headers: { Authorization: `Bearer ${expiredToken}` }
    });
    assert.strictEqual(res.status, 401);
    console.log('✅ TEST 12 PASSED\n');
  }

  // TEST 13: Tampered Token -> Protected Route
  {
    console.log('TEST 13: Tampered Signature -> Protected Route (HTTP 401 Unauthorized)');
    const tamperedToken = adminToken.slice(0, -5) + 'zzzzz';
    const res = await fetch(`${baseUrl}/admin/profile`, {
      headers: { Authorization: `Bearer ${tamperedToken}` }
    });
    assert.strictEqual(res.status, 401);
    console.log('✅ TEST 13 PASSED\n');
  }

  // TEST 14: Request Body / Parameter Role Spoofing
  {
    console.log('TEST 14: Role Spoofing Prevention (Customer JWT on Admin route)');
    const res = await fetch(`${baseUrl}/admin/profile`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'X-Role-Spoof': 'admin'
      }
    });
    assert.strictEqual(res.status, 403);
    console.log('✅ TEST 14 PASSED (Role tampering rejected)\n');
  }

  // TEST 15: Query Parameter Role Spoofing
  {
    console.log('TEST 15: Query Parameter Role Spoofing (?role=admin)');
    const res = await fetch(`${baseUrl}/admin/profile?role=admin`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert.strictEqual(res.status, 403);
    console.log('✅ TEST 15 PASSED (Query parameter role tampering rejected)\n');
  }

  // TEST 16: Path / Identity Spoofing Protection
  {
    console.log('TEST 16: Identity Spoofing Protection (Verified req.user identity used)');
    const res = await fetch(`${baseUrl}/customer/profile`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.data.user.userId, mockCustomerUser._id);
    assert.strictEqual(data.data.user.role, 'customer');
    console.log('✅ TEST 16 PASSED\n');
  }

  // Restore User.findById
  User.findById = originalFindById;

  // REGRESSION CHECKS: Phase 1 & Public API Endpoints
  {
    console.log('REGRESSION CHECKS: Health Endpoint & 404 Handler');
    const healthRes = await fetch(`${baseUrl}/health`);
    assert.strictEqual(healthRes.status, 200);

    const unknownRes = await fetch(`${baseUrl}/unknown-nonexistent-route`);
    assert.strictEqual(unknownRes.status, 404);
    console.log('✅ REGRESSION CHECKS PASSED\n');
  }

  server.close();
  console.log('=== ALL 16 PROTECTED ROUTE & PHASE 2 VERIFICATION TESTS PASSED! ===');
}

runPhase2FinalTests().catch((err) => {
  console.error('❌ PHASE 2 VERIFICATION ERROR:', err);
  process.exit(1);
});
