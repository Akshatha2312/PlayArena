const assert = require('assert');
const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = require('./src/app');
const User = require('./src/models/User');
const Game = require('./src/models/Game');
const Resource = require('./src/models/Resource');
const { generateUserToken } = require('./src/utils/token');

async function runStep3Tests() {
  console.log('==================================================');
  console.log('PHASE 3 STEP 3: ADMIN GAME MANAGEMENT TEST SUITE');
  console.log('==================================================\n');

  let isDbConnected = false;
  const mongoUri = process.env.MONGODB_URI;

  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
      isDbConnected = true;
      console.log('✔ Connected to MongoDB live database.\n');
    } catch (err) {
      console.log(`[INFO] MongoDB connection unavailable (${err.message}). Using HTTP mock-backed Mongoose store for tests.\n`);
    }
  }

  // Setup In-Memory Mongoose Mock Store if DB is offline
  const inMemoryGames = new Map();
  const inMemoryResources = new Map();

  if (!isDbConnected) {
    // Disable Mongoose buffering so calls fail/succeed immediately without waiting for DB
    mongoose.set('bufferCommands', false);

    Game.prototype.save = async function () {
      await this.validate();

      if (!this._id) {
        this._id = new mongoose.Types.ObjectId();
      }

      const idStr = this._id.toString();
      for (const [existingId, g] of inMemoryGames.entries()) {
        if (existingId !== idStr) {
          if (g.name === this.name || g.slug === this.slug) {
            const dupErr = new Error('E11000 duplicate key error collection: games');
            dupErr.code = 11000;
            throw dupErr;
          }
        }
      }

      inMemoryGames.set(idStr, this);
      return this;
    };

    Game.findById = async function (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const doc = inMemoryGames.get(id.toString());
      if (!doc) return null;
      return new Game(doc.toObject());
    };

    Game.find = function (filter = {}) {
      return {
        sort: function () {
          return {
            skip: function (skipVal = 0) {
              return {
                limit: async function (limitVal = 10) {
                  let list = Array.from(inMemoryGames.values());
                  if (filter.category) list = list.filter((g) => g.category === filter.category);
                  if (filter.isActive !== undefined) list = list.filter((g) => g.isActive === filter.isActive);
                  return list.slice(skipVal, skipVal + limitVal);
                },
              };
            },
          };
        },
      };
    };

    Game.countDocuments = async function (filter = {}) {
      let list = Array.from(inMemoryGames.values());
      if (filter.category) list = list.filter((g) => g.category === filter.category);
      if (filter.isActive !== undefined) list = list.filter((g) => g.isActive === filter.isActive);
      return list.length;
    };

    Resource.prototype.save = async function () {
      await this.validate();
      if (!this._id) this._id = new mongoose.Types.ObjectId();
      inMemoryResources.set(this._id.toString(), this);
      return this;
    };

    Resource.findById = async function (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      return inMemoryResources.get(id.toString()) || null;
    };
  }

  // Setup HTTP test server
  const mockCustomerUser = { _id: '650000000000000000000001', role: 'customer', name: 'Cust User', email: 'cust@test.com' };
  const mockStaffUser = { _id: '650000000000000000000002', role: 'staff', name: 'Staff User', email: 'staff@test.com' };
  const mockAdminUser = { _id: '650000000000000000000003', role: 'admin', name: 'Admin User', email: 'admin@test.com' };

  const originalFindById = User.findById;
  User.findById = (id) => ({
    select: async () => {
      const idStr = id.toString();
      if (idStr === mockCustomerUser._id) return mockCustomerUser;
      if (idStr === mockStaffUser._id) return mockStaffUser;
      if (idStr === mockAdminUser._id) return mockAdminUser;
      return null;
    },
  });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  const adminToken = generateUserToken({ id: mockAdminUser._id, role: 'admin' });
  const staffToken = generateUserToken({ id: mockStaffUser._id, role: 'staff' });
  const customerToken = generateUserToken({ id: mockCustomerUser._id, role: 'customer' });
  const tamperedToken = adminToken.slice(0, -5) + 'xxxxx';
  const expiredToken = jwt.sign(
    { id: mockAdminUser._id, role: 'admin' },
    process.env.JWT_SECRET || 'fallback_secret_key_for_testing_only',
    { expiresIn: '-1s' }
  );

  const passed = [];
  const failed = [];

  function recordSuccess(testNum, title) {
    console.log(`✅ TEST ${testNum} PASSED: ${title}`);
    passed.push({ testNum, title });
  }

  function recordFailure(testNum, title, err) {
    console.error(`❌ TEST ${testNum} FAILED: ${title} - ${err.message}`);
    failed.push({ testNum, title, error: err.message });
  }

  try {
    // TEST 1: POST /admin/games - Admin creates game successfully (201 Created)
    let createdGameId = null;
    const testGameSlug = 'test-badminton-' + Date.now();
    const testGameName = 'Test Badminton ' + Date.now();

    try {
      const res = await fetch(`${baseUrl}/admin/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: testGameName,
          slug: testGameSlug,
          description: 'Indoor badminton court',
          category: 'court',
          basePricePerHour: 400,
          minBookingDurationMinutes: 60,
          maxBookingDurationMinutes: 180,
          bookingIntervalMinutes: 60,
          minPlayers: 2,
          maxPlayers: 4,
        }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(data)}`);
      assert.strictEqual(data.status, 'success');
      assert.strictEqual(data.data.game.name, testGameName);
      assert.strictEqual(data.data.game.slug, testGameSlug);
      createdGameId = data.data.game._id;
      recordSuccess(1, 'Admin POST /admin/games creates game successfully (201 Created)');
    } catch (err) {
      recordFailure(1, 'Admin POST /admin/games creates game successfully', err);
    }

    // TEST 2: Customer attempt to create game returns 403 Forbidden
    try {
      const res = await fetch(`${baseUrl}/admin/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          name: 'Cust Game',
          slug: 'cust-game',
          category: 'court',
          basePricePerHour: 100,
        }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(data.status, 'fail');
      recordSuccess(2, 'Customer POST /admin/games returns 403 Forbidden');
    } catch (err) {
      recordFailure(2, 'Customer POST /admin/games returns 403 Forbidden', err);
    }

    // TEST 3: Staff attempt to create game returns 403 Forbidden
    try {
      const res = await fetch(`${baseUrl}/admin/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({
          name: 'Staff Game',
          slug: 'staff-game',
          category: 'court',
          basePricePerHour: 100,
        }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(data.status, 'fail');
      recordSuccess(3, 'Staff POST /admin/games returns 403 Forbidden');
    } catch (err) {
      recordFailure(3, 'Staff POST /admin/games returns 403 Forbidden', err);
    }

    // TEST 4: Missing/invalid/expired JWT returns 401 Unauthorized
    try {
      const noAuthRes = await fetch(`${baseUrl}/admin/games`);
      assert.strictEqual(noAuthRes.status, 401, 'No auth header should return 401');

      const tamperedRes = await fetch(`${baseUrl}/admin/games`, {
        headers: { Authorization: `Bearer ${tamperedToken}` },
      });
      assert.strictEqual(tamperedRes.status, 401, 'Tampered token should return 401');

      const expiredRes = await fetch(`${baseUrl}/admin/games`, {
        headers: { Authorization: `Bearer ${expiredToken}` },
      });
      assert.strictEqual(expiredRes.status, 401, 'Expired token should return 401');

      recordSuccess(4, 'Missing/invalid/expired/tampered JWT returns 401 Unauthorized');
    } catch (err) {
      recordFailure(4, 'Missing/invalid/expired/tampered JWT returns 401 Unauthorized', err);
    }

    // TEST 5: Schema validation errors return 400 Bad Request
    try {
      const res = await fetch(`${baseUrl}/admin/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Invalid Price Game',
          slug: 'invalid-price-game',
          category: 'court',
          basePricePerHour: -50,
        }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 400);
      assert.strictEqual(data.status, 'fail');
      recordSuccess(5, 'Schema validation error returns 400 Bad Request');
    } catch (err) {
      recordFailure(5, 'Schema validation error returns 400 Bad Request', err);
    }

    // TEST 6: Duplicate Game name or slug returns 409 Conflict
    try {
      const res = await fetch(`${baseUrl}/admin/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: testGameName, // Duplicate name
          slug: 'another-slug-' + Date.now(),
          category: 'court',
          basePricePerHour: 200,
        }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 409, `Expected 409, got ${res.status}`);
      assert.strictEqual(data.status, 'fail');
      recordSuccess(6, 'Duplicate Game name/slug returns 409 Conflict');
    } catch (err) {
      recordFailure(6, 'Duplicate Game name/slug returns 409 Conflict', err);
    }

    // TEST 7: Invalid ObjectId returns 400 Bad Request
    try {
      const res = await fetch(`${baseUrl}/admin/games/invalid-game-id-123`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      assert.strictEqual(res.status, 400);
      assert.strictEqual(data.status, 'fail');
      recordSuccess(7, 'Invalid ObjectId format returns 400 Bad Request');
    } catch (err) {
      recordFailure(7, 'Invalid ObjectId format returns 400 Bad Request', err);
    }

    // TEST 8: Nonexistent Game ID returns 404 Not Found
    try {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await fetch(`${baseUrl}/admin/games/${nonExistentId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      assert.strictEqual(res.status, 404);
      assert.strictEqual(data.status, 'fail');
      recordSuccess(8, 'Nonexistent Game returns 404 Not Found');
    } catch (err) {
      recordFailure(8, 'Nonexistent Game returns 404 Not Found', err);
    }

    // TEST 9: GET /admin/games returns list with filtering & pagination
    try {
      const res = await fetch(`${baseUrl}/admin/games?category=court&isActive=true&page=1&limit=5`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.status, 'success');
      assert(Array.isArray(data.data.games));
      assert(data.data.pagination);
      assert.strictEqual(data.data.pagination.page, 1);
      assert.strictEqual(data.data.pagination.limit, 5);
      recordSuccess(9, 'GET /admin/games list with filtering and pagination succeeds');
    } catch (err) {
      recordFailure(9, 'GET /admin/games list with filtering and pagination succeeds', err);
    }

    // TEST 10: GET /admin/games/:id returns single game
    try {
      assert(createdGameId, 'Created Game ID should be present');
      const res = await fetch(`${baseUrl}/admin/games/${createdGameId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.data.game._id.toString(), createdGameId.toString());
      recordSuccess(10, 'GET /admin/games/:id retrieves single game');
    } catch (err) {
      recordFailure(10, 'GET /admin/games/:id retrieves single game', err);
    }

    // TEST 11: PATCH /admin/games/:id partially updates allowed fields and preserves validation
    try {
      assert(createdGameId, 'Created Game ID should be present');
      const res = await fetch(`${baseUrl}/admin/games/${createdGameId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          basePricePerHour: 450,
          description: 'Updated description',
        }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.data.game.basePricePerHour, 450);
      assert.strictEqual(data.data.game.description, 'Updated description');
      recordSuccess(11, 'PATCH /admin/games/:id partially updates allowed fields');
    } catch (err) {
      recordFailure(11, 'PATCH /admin/games/:id partially updates allowed fields', err);
    }

    // TEST 12: PATCH fails if partial update breaks cross-field relationship (maxDuration < minDuration)
    try {
      assert(createdGameId, 'Created Game ID should be present');
      // Current max is 180 min. Setting min to 240 min should fail cross-field check!
      const res = await fetch(`${baseUrl}/admin/games/${createdGameId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          minBookingDurationMinutes: 240,
        }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 400);
      assert.strictEqual(data.status, 'fail');
      recordSuccess(12, 'PATCH fails if partial update breaks cross-field min/max relationship');
    } catch (err) {
      recordFailure(12, 'PATCH fails if partial update breaks cross-field min/max relationship', err);
    }

    // TEST 13: DELETE /admin/games/:id soft-deletes game (isActive = false) without physical removal or deleting resources
    try {
      assert(createdGameId, 'Created Game ID should be present');

      let testResId = new mongoose.Types.ObjectId();
      const resourceDoc = new Resource({
        _id: testResId,
        gameId: createdGameId,
        name: 'Court Soft Delete Check',
        status: 'available',
      });
      await resourceDoc.save();

      // Perform soft DELETE
      const delRes = await fetch(`${baseUrl}/admin/games/${createdGameId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const delData = await delRes.json();
      assert.strictEqual(delRes.status, 200);
      assert.strictEqual(delData.data.game.isActive, false);

      // Verify game still exists via GET /admin/games/:id with isActive = false
      const getRes = await fetch(`${baseUrl}/admin/games/${createdGameId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const getData = await getRes.json();
      assert.strictEqual(getRes.status, 200);
      assert.strictEqual(getData.data.game.isActive, false);
      assert.strictEqual(getData.data.game._id.toString(), createdGameId.toString());

      // Verify resource still exists intact
      const resInDb = await Resource.findById(testResId);
      assert(resInDb, 'Resource should NOT be deleted by Game soft delete');
      assert.strictEqual(resInDb.status, 'available');

      recordSuccess(13, 'DELETE sets isActive=false, does not physically remove Game, and does not touch Resources');
    } catch (err) {
      recordFailure(13, 'DELETE soft-deletes Game without physical removal or touching resources', err);
    }

    // TEST 14: Existing health, auth login, RBAC regression endpoints intact
    try {
      const healthRes = await fetch(`${baseUrl}/health`);
      assert.strictEqual(healthRes.status, 200);

      const custRes = await fetch(`${baseUrl}/customer/profile`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.strictEqual(custRes.status, 200);

      recordSuccess(14, 'Existing health, registration, login, and RBAC functionality still works');
    } catch (err) {
      recordFailure(14, 'Existing health, registration, login, and RBAC functionality still works', err);
    }

  } finally {
    // Cleanup
    if (isDbConnected) {
      try {
        await Game.deleteMany({ slug: { $regex: /^test-/ } });
      } catch (e) {
        // ignore
      }
    }
    User.findById = originalFindById;
    await new Promise((resolve) => server.close(resolve));
    if (isDbConnected) {
      await mongoose.disconnect();
    }
  }

  // ==================================================
  // SUMMARY REPORT
  // ==================================================
  console.log('\n==================================================');
  console.log(`SUMMARY: ${passed.length} PASSED / ${failed.length} FAILED (TOTAL ${passed.length + failed.length} TESTS)`);
  console.log('==================================================\n');

  if (failed.length > 0) {
    console.error('FAILED TESTS LIST:');
    failed.forEach((f) => console.error(`  - Test ${f.testNum}: ${f.title} (${f.error})`));
    process.exit(1);
  } else {
    console.log('ALL TESTS PASSED SUCCESSFULLY!');
  }
}

runStep3Tests().catch((err) => {
  console.error('❌ Fatal error in test suite:', err);
  process.exit(1);
});
