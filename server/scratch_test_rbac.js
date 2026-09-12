const assert = require('assert');
const { authenticate, authorize } = require('./src/middleware/authMiddleware');
const { generateUserToken } = require('./src/utils/token');

async function runRbacTests() {
  console.log('=== RUNNING RBAC AUTHORIZATION MIDDLEWARE TEST SUITE ===\n');

  // Helper mock helper for req, res, next
  const createMockRes = () => {
    let statusCode = 200;
    let jsonPayload = null;
    return {
      res: {
        status(code) { statusCode = code; return this; },
        json(data) { jsonPayload = data; return this; }
      },
      getStatus: () => statusCode,
      getJson: () => jsonPayload,
    };
  };

  // TEST 1: Customer allowed on customer-only route
  {
    console.log('TEST 1: Customer allowed on customer-only route');
    let nextCalled = false;
    const req = { user: { userId: 'usr_cust_1', role: 'customer' } };
    const { res } = createMockRes();

    authorize('customer')(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
    console.log('✅ TEST 1 PASSED\n');
  }

  // TEST 2: Customer rejected on staff-only route (HTTP 403)
  {
    console.log('TEST 2: Customer rejected on staff-only route (HTTP 403 Forbidden)');
    let nextCalled = false;
    const req = { user: { userId: 'usr_cust_1', role: 'customer' } };
    const { res, getStatus, getJson } = createMockRes();

    authorize('staff')(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(getStatus(), 403);
    assert.strictEqual(getJson().status, 'fail');
    assert.strictEqual(getJson().message, 'You do not have permission to perform this action');
    console.log('✅ TEST 2 PASSED\n');
  }

  // TEST 3: Customer rejected on admin-only route (HTTP 403)
  {
    console.log('TEST 3: Customer rejected on admin-only route (HTTP 403 Forbidden)');
    let nextCalled = false;
    const req = { user: { userId: 'usr_cust_1', role: 'customer' } };
    const { res, getStatus } = createMockRes();

    authorize('admin')(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(getStatus(), 403);
    console.log('✅ TEST 3 PASSED\n');
  }

  // TEST 4: Staff allowed on staff-only route
  {
    console.log('TEST 4: Staff allowed on staff-only route');
    let nextCalled = false;
    const req = { user: { userId: 'usr_staff_1', role: 'staff' } };
    const { res } = createMockRes();

    authorize('staff')(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
    console.log('✅ TEST 4 PASSED\n');
  }

  // TEST 5: Staff rejected on customer-only route (HTTP 403)
  {
    console.log('TEST 5: Staff rejected on explicitly customer-only route');
    let nextCalled = false;
    const req = { user: { userId: 'usr_staff_1', role: 'staff' } };
    const { res, getStatus } = createMockRes();

    authorize('customer')(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(getStatus(), 403);
    console.log('✅ TEST 5 PASSED\n');
  }

  // TEST 6: Admin allowed on admin-only route
  {
    console.log('TEST 6: Admin allowed on admin-only route');
    let nextCalled = false;
    const req = { user: { userId: 'usr_admin_1', role: 'admin' } };
    const { res } = createMockRes();

    authorize('admin')(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
    console.log('✅ TEST 6 PASSED\n');
  }

  // TEST 7: Admin allowed on staff+admin route
  {
    console.log('TEST 7: Admin allowed on multi-role staff+admin route');
    let nextCalled = false;
    const req = { user: { userId: 'usr_admin_1', role: 'admin' } };
    const { res } = createMockRes();

    authorize('staff', 'admin')(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
    console.log('✅ TEST 7 PASSED\n');
  }

  // TEST 8: Customer rejected on staff+admin route (HTTP 403)
  {
    console.log('TEST 8: Customer rejected on staff+admin route (HTTP 403 Forbidden)');
    let nextCalled = false;
    const req = { user: { userId: 'usr_cust_1', role: 'customer' } };
    const { res, getStatus } = createMockRes();

    authorize('staff', 'admin')(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(getStatus(), 403);
    console.log('✅ TEST 8 PASSED\n');
  }

  // TEST 9: Body Role Spoofing Does NOT Bypass RBAC
  {
    console.log('TEST 9: Body Role Spoofing (req.body.role = "admin") Rejected');
    let nextCalled = false;
    const req = {
      user: { userId: 'usr_cust_1', role: 'customer' },
      body: { role: 'admin' } // Attempted body tampering
    };
    const { res, getStatus } = createMockRes();

    authorize('admin')(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(getStatus(), 403); // Customer role from req.user was checked, not body
    console.log('✅ TEST 9 PASSED (Body role tampering rejected)\n');
  }

  // TEST 10: Unauthenticated request rejected by authenticate() before RBAC
  {
    console.log('TEST 10: Unauthenticated Request Blocked (HTTP 401)');
    let nextCalled = false;
    const req = { headers: {} };
    const { res, getStatus } = createMockRes();

    await authenticate(req, res, () => {
      authorize('admin')(req, res, () => { nextCalled = true; });
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(getStatus(), 401);
    console.log('✅ TEST 10 PASSED (authenticate blocked before RBAC)\n');
  }

  // TEST 11: Regression Checks
  {
    console.log('TEST 11: Express App & API Regression Checks');
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
    console.log('✅ TEST 11 PASSED (App health check & 404 handler verified)\n');
  }

  console.log('=== ALL RBAC AUTHORIZATION TESTS PASSED SUCCESSFULLY! ===');
}

runRbacTests().catch((err) => {
  console.error('❌ RBAC TEST SUITE ERROR:', err);
  process.exit(1);
});
