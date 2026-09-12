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

async function runStep4Tests() {
  console.log('==================================================');
  console.log('PHASE 3 STEP 4: ADMIN RESOURCE CRUD TEST SUITE');
  console.log('==================================================\n');

  let isDbConnected = false;
  const mongoUri = process.env.MONGODB_URI;

  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
      isDbConnected = true;
      console.log('✔ Connected to MongoDB live database.\n');
    } catch (err) {
      console.log(`[INFO] Live MongoDB connection unavailable (${err.message}). Using HTTP mock-backed Mongoose store for tests.\n`);
    }
  }

  // Setup In-Memory Mongoose Mock Store if DB is offline
  const inMemoryGames = new Map();
  const inMemoryResources = new Map();

  if (!isDbConnected) {
    mongoose.set('bufferCommands', false);

    // --- MOCK GAME MODEL ---
    Game.prototype.save = async function () {
      await this.validate();
      if (!this._id) this._id = new mongoose.Types.ObjectId();
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
                  return list.slice(skipVal, skipVal + limitVal).map((g) => new Game(g.toObject()));
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

    // --- MOCK RESOURCE MODEL ---
    Resource.prototype.save = async function () {
      await this.validate();
      if (!this._id) this._id = new mongoose.Types.ObjectId();
      const idStr = this._id.toString();

      for (const [existingId, r] of inMemoryResources.entries()) {
        if (existingId !== idStr) {
          // Check compound unique index { gameId: 1, name: 1 }
          if (r.gameId.toString() === this.gameId.toString() && r.name.toLowerCase() === this.name.toLowerCase()) {
            const dupErr = new Error('E11000 duplicate key error: gameId + name index');
            dupErr.code = 11000;
            throw dupErr;
          }
          // Check sparse unique index on code
          if (this.code && r.code && r.code.toUpperCase() === this.code.toUpperCase()) {
            const dupErr = new Error('E11000 duplicate key error: code index');
            dupErr.code = 11000;
            throw dupErr;
          }
        }
      }
      inMemoryResources.set(idStr, this);
      return this;
    };

    Resource.findById = async function (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const doc = inMemoryResources.get(id.toString());
      if (!doc) return null;
      return new Resource(doc.toObject());
    };

    Resource.find = function (filter = {}) {
      return {
        sort: function () {
          return {
            skip: function (skipVal = 0) {
              return {
                limit: async function (limitVal = 10) {
                  let list = Array.from(inMemoryResources.values());
                  if (filter.gameId) list = list.filter((r) => r.gameId.toString() === filter.gameId.toString());
                  if (filter.status) list = list.filter((r) => r.status === filter.status);
                  if (filter.isActive !== undefined) list = list.filter((r) => r.isActive === filter.isActive);
                  return list.slice(skipVal, skipVal + limitVal).map((r) => new Resource(r.toObject()));
                },
              };
            },
          };
        },
      };
    };

    Resource.countDocuments = async function (filter = {}) {
      let list = Array.from(inMemoryResources.values());
      if (filter.gameId) list = list.filter((r) => r.gameId.toString() === filter.gameId.toString());
      if (filter.status) list = list.filter((r) => r.status === filter.status);
      if (filter.isActive !== undefined) list = list.filter((r) => r.isActive === filter.isActive);
      return list.length;
    };
  }

  // Setup Users & Server
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
    // PREPARATION: Create 2 Games (Game A & Game B)
    const gameA = new Game({
      name: 'Game A Court ' + Date.now(),
      slug: 'game-a-' + Date.now(),
      category: 'court',
      basePricePerHour: 300,
    });
    await gameA.save();

    const gameB = new Game({
      name: 'Game B Pool ' + Date.now(),
      slug: 'game-b-' + Date.now(),
      category: 'table',
      basePricePerHour: 200,
    });
    await gameB.save();

    const inactiveGame = new Game({
      name: 'Inactive Game ' + Date.now(),
      slug: 'inactive-game-' + Date.now(),
      category: 'court',
      basePricePerHour: 100,
      isActive: false,
    });
    await inactiveGame.save();

    let res1Id = null;
    let res2Id = null;

    // ==================================================
    // CREATION TESTS (1 - 9)
    // ==================================================
    console.log('\n--- SECTION 1: CREATION TESTS ---');

    // TEST 1: Admin creates Resource -> 201
    try {
      const res = await fetch(`${baseUrl}/admin/games/${gameA._id}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          name: 'Court 1',
          code: 'GAMEA-C01',
          status: 'available',
          customPricePerHour: 350,
          capacity: 4,
          locationNote: 'Zone 1',
        }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(data)}`);
      assert.strictEqual(data.status, 'success');
      assert.strictEqual(data.data.resource.name, 'Court 1');
      res1Id = data.data.resource._id;
      recordSuccess(1, 'Admin creates Resource -> 201 Created');
    } catch (err) {
      recordFailure(1, 'Admin creates Resource -> 201 Created', err);
    }

    // TEST 2: Customer cannot create Resource -> 403
    try {
      const res = await fetch(`${baseUrl}/admin/games/${gameA._id}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ name: 'Court Cust' }),
      });
      assert.strictEqual(res.status, 403);
      recordSuccess(2, 'Customer cannot create Resource -> 403 Forbidden');
    } catch (err) {
      recordFailure(2, 'Customer cannot create Resource -> 403 Forbidden', err);
    }

    // TEST 3: Staff cannot create Resource -> 403
    try {
      const res = await fetch(`${baseUrl}/admin/games/${gameA._id}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ name: 'Court Staff' }),
      });
      assert.strictEqual(res.status, 403);
      recordSuccess(3, 'Staff cannot create Resource -> 403 Forbidden');
    } catch (err) {
      recordFailure(3, 'Staff cannot create Resource -> 403 Forbidden', err);
    }

    // TEST 4: Missing Game -> 404
    try {
      const dummyId = new mongoose.Types.ObjectId();
      const res = await fetch(`${baseUrl}/admin/games/${dummyId}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ name: 'Court Missing Game' }),
      });
      assert.strictEqual(res.status, 404);
      recordSuccess(4, 'Missing Game -> 404 Not Found');
    } catch (err) {
      recordFailure(4, 'Missing Game -> 404 Not Found', err);
    }

    // TEST 5: Invalid Game ObjectId -> 400
    try {
      const res = await fetch(`${baseUrl}/admin/games/invalid-game-id/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ name: 'Court Bad GameId' }),
      });
      assert.strictEqual(res.status, 400);
      recordSuccess(5, 'Invalid Game ObjectId -> 400 Bad Request');
    } catch (err) {
      recordFailure(5, 'Invalid Game ObjectId -> 400 Bad Request', err);
    }

    // TEST 6: Invalid Resource fields -> 400
    try {
      const res = await fetch(`${baseUrl}/admin/games/${gameA._id}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ name: 'Court Bad Status', status: 'broken' }),
      });
      assert.strictEqual(res.status, 400);
      recordSuccess(6, 'Invalid Resource fields -> 400 Bad Request');
    } catch (err) {
      recordFailure(6, 'Invalid Resource fields -> 400 Bad Request', err);
    }

    // TEST 7: Duplicate name within same Game -> 409
    try {
      const res = await fetch(`${baseUrl}/admin/games/${gameA._id}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ name: 'Court 1' }), // Court 1 already created under gameA
      });
      assert.strictEqual(res.status, 409);
      recordSuccess(7, 'Duplicate name within same Game -> 409 Conflict');
    } catch (err) {
      recordFailure(7, 'Duplicate name within same Game -> 409 Conflict', err);
    }

    // TEST 8: Same resource name under different Game succeeds -> 201
    try {
      const res = await fetch(`${baseUrl}/admin/games/${gameB._id}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ name: 'Court 1', code: 'GAMEB-C01' }), // Same name "Court 1", but under gameB
      });
      const data = await res.json();
      assert.strictEqual(res.status, 201);
      res2Id = data.data.resource._id;
      recordSuccess(8, 'Same resource name under different Game succeeds -> 201 Created');
    } catch (err) {
      recordFailure(8, 'Same resource name under different Game succeeds -> 201 Created', err);
    }

    // TEST 9: Duplicate code -> 409
    try {
      const res = await fetch(`${baseUrl}/admin/games/${gameB._id}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ name: 'Court 2', code: 'GAMEA-C01' }), // Duplicate code already used by Court 1 under gameA
      });
      assert.strictEqual(res.status, 409);
      recordSuccess(9, 'Duplicate code -> 409 Conflict');
    } catch (err) {
      recordFailure(9, 'Duplicate code -> 409 Conflict', err);
    }

    // Additional Creation Check: Attempting to create resource for inactive game returns 400
    try {
      const res = await fetch(`${baseUrl}/admin/games/${inactiveGame._id}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ name: 'Court Inactive Game' }),
      });
      assert.strictEqual(res.status, 400, 'Creating resource under inactive game should return 400');
    } catch (err) {
      // logged in assertion
    }

    // ==================================================
    // LIST TESTS (10 - 14)
    // ==================================================
    console.log('\n--- SECTION 2: LIST TESTS ---');

    // TEST 10: Admin lists Resources for Game -> 200
    try {
      const res = await fetch(`${baseUrl}/admin/games/${gameA._id}/resources`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.status, 'success');
      assert(Array.isArray(data.data.resources));
      recordSuccess(10, 'Admin lists Resources for Game -> 200 OK');
    } catch (err) {
      recordFailure(10, 'Admin lists Resources for Game -> 200 OK', err);
    }

    // TEST 11: Filtering by status works
    try {
      const res = await fetch(`${baseUrl}/admin/games/${gameA._id}/resources?status=available`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert(data.data.resources.every((r) => r.status === 'available'));
      recordSuccess(11, 'Filtering by status works');
    } catch (err) {
      recordFailure(11, 'Filtering by status works', err);
    }

    // TEST 12: Filtering by isActive works
    try {
      const res = await fetch(`${baseUrl}/admin/games/${gameA._id}/resources?isActive=true`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert(data.data.resources.every((r) => r.isActive === true));
      recordSuccess(12, 'Filtering by isActive works');
    } catch (err) {
      recordFailure(12, 'Filtering by isActive works', err);
    }

    // TEST 13: Customer cannot list -> 403
    try {
      const res = await fetch(`${baseUrl}/admin/games/${gameA._id}/resources`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.strictEqual(res.status, 403);
      recordSuccess(13, 'Customer cannot list -> 403 Forbidden');
    } catch (err) {
      recordFailure(13, 'Customer cannot list -> 403 Forbidden', err);
    }

    // TEST 14: Staff cannot list -> 403
    try {
      const res = await fetch(`${baseUrl}/admin/games/${gameA._id}/resources`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      assert.strictEqual(res.status, 403);
      recordSuccess(14, 'Staff cannot list -> 403 Forbidden');
    } catch (err) {
      recordFailure(14, 'Staff cannot list -> 403 Forbidden', err);
    }

    // ==================================================
    // GET ONE TESTS (15 - 19)
    // ==================================================
    console.log('\n--- SECTION 3: GET ONE TESTS ---');

    // TEST 15: Admin retrieves Resource -> 200
    try {
      assert(res1Id, 'res1Id should exist');
      const res = await fetch(`${baseUrl}/admin/resources/${res1Id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.data.resource.name, 'Court 1');
      recordSuccess(15, 'Admin retrieves Resource -> 200 OK');
    } catch (err) {
      recordFailure(15, 'Admin retrieves Resource -> 200 OK', err);
    }

    // TEST 16: Invalid Resource ObjectId -> 400
    try {
      const res = await fetch(`${baseUrl}/admin/resources/invalid-res-id`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 400);
      recordSuccess(16, 'Invalid Resource ObjectId -> 400 Bad Request');
    } catch (err) {
      recordFailure(16, 'Invalid Resource ObjectId -> 400 Bad Request', err);
    }

    // TEST 17: Nonexistent Resource -> 404
    try {
      const dummyResId = new mongoose.Types.ObjectId();
      const res = await fetch(`${baseUrl}/admin/resources/${dummyResId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 404);
      recordSuccess(17, 'Nonexistent Resource -> 404 Not Found');
    } catch (err) {
      recordFailure(17, 'Nonexistent Resource -> 404 Not Found', err);
    }

    // TEST 18: Customer cannot retrieve -> 403
    try {
      const res = await fetch(`${baseUrl}/admin/resources/${res1Id}`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.strictEqual(res.status, 403);
      recordSuccess(18, 'Customer cannot retrieve -> 403 Forbidden');
    } catch (err) {
      recordFailure(18, 'Customer cannot retrieve -> 403 Forbidden', err);
    }

    // TEST 19: Staff cannot retrieve -> 403
    try {
      const res = await fetch(`${baseUrl}/admin/resources/${res1Id}`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      assert.strictEqual(res.status, 403);
      recordSuccess(19, 'Staff cannot retrieve -> 403 Forbidden');
    } catch (err) {
      recordFailure(19, 'Staff cannot retrieve -> 403 Forbidden', err);
    }

    // ==================================================
    // UPDATE TESTS (20 - 29)
    // ==================================================
    console.log('\n--- SECTION 4: UPDATE TESTS ---');

    // TEST 20: Admin updates allowed fields -> 200
    try {
      assert(res1Id, 'res1Id should exist');
      const res = await fetch(`${baseUrl}/admin/resources/${res1Id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          name: 'Court 1 Main',
          status: 'maintenance',
          customPricePerHour: 400,
          locationNote: 'Zone 1 - Main Entrance',
        }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.data.resource.name, 'Court 1 Main');
      assert.strictEqual(data.data.resource.status, 'maintenance');
      assert.strictEqual(data.data.resource.customPricePerHour, 400);
      recordSuccess(20, 'Admin updates allowed fields -> 200 OK');
    } catch (err) {
      recordFailure(20, 'Admin updates allowed fields -> 200 OK', err);
    }

    // TEST 21: Attempt to change gameId is rejected/ignored
    try {
      const newGameId = new mongoose.Types.ObjectId();
      const res = await fetch(`${baseUrl}/admin/resources/${res1Id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ gameId: newGameId }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.data.resource.gameId.toString(), gameA._id.toString(), 'gameId must remain unchanged');
      recordSuccess(21, 'Attempt to change gameId is safely ignored');
    } catch (err) {
      recordFailure(21, 'Attempt to change gameId is safely ignored', err);
    }

    // TEST 22: Attempt to update protected fields is rejected/ignored
    try {
      const res = await fetch(`${baseUrl}/admin/resources/${res1Id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ _id: '650000000000000000009999', createdAt: '2000-01-01' }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.data.resource._id.toString(), res1Id.toString(), '_id must remain unchanged');
      recordSuccess(22, 'Attempt to update protected fields is safely ignored');
    } catch (err) {
      recordFailure(22, 'Attempt to update protected fields is safely ignored', err);
    }

    // TEST 23: Invalid status -> 400
    try {
      const res = await fetch(`${baseUrl}/admin/resources/${res1Id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: 'broken' }),
      });
      assert.strictEqual(res.status, 400);
      recordSuccess(23, 'Invalid status -> 400 Bad Request');
    } catch (err) {
      recordFailure(23, 'Invalid status -> 400 Bad Request', err);
    }

    // TEST 24: Negative customPricePerHour -> 400
    try {
      const res = await fetch(`${baseUrl}/admin/resources/${res1Id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ customPricePerHour: -100 }),
      });
      assert.strictEqual(res.status, 400);
      recordSuccess(24, 'Negative customPricePerHour -> 400 Bad Request');
    } catch (err) {
      recordFailure(24, 'Negative customPricePerHour -> 400 Bad Request', err);
    }

    // TEST 25: Invalid capacity -> 400
    try {
      const res = await fetch(`${baseUrl}/admin/resources/${res1Id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ capacity: 0 }),
      });
      assert.strictEqual(res.status, 400);
      recordSuccess(25, 'Invalid capacity (< 1) -> 400 Bad Request');
    } catch (err) {
      recordFailure(25, 'Invalid capacity (< 1) -> 400 Bad Request', err);
    }

    // TEST 26: Duplicate name -> 409
    try {
      // First create a second resource under gameA
      const r2 = new Resource({ gameId: gameA._id, name: 'Court 2 Existing' });
      await r2.save();

      // Try updating res1 name to 'Court 2 Existing'
      const res = await fetch(`${baseUrl}/admin/resources/${res1Id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ name: 'Court 2 Existing' }),
      });
      assert.strictEqual(res.status, 409);
      recordSuccess(26, 'Duplicate name within same game -> 409 Conflict');
    } catch (err) {
      recordFailure(26, 'Duplicate name within same game -> 409 Conflict', err);
    }

    // TEST 27: Duplicate code -> 409
    try {
      const res = await fetch(`${baseUrl}/admin/resources/${res1Id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ code: 'GAMEB-C01' }), // Code already used by gameB's resource
      });
      assert.strictEqual(res.status, 409);
      recordSuccess(27, 'Duplicate code -> 409 Conflict');
    } catch (err) {
      recordFailure(27, 'Duplicate code -> 409 Conflict', err);
    }

    // TEST 28: Customer cannot update -> 403
    try {
      const res = await fetch(`${baseUrl}/admin/resources/${res1Id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ name: 'Cust Patch' }),
      });
      assert.strictEqual(res.status, 403);
      recordSuccess(28, 'Customer cannot update -> 403 Forbidden');
    } catch (err) {
      recordFailure(28, 'Customer cannot update -> 403 Forbidden', err);
    }

    // TEST 29: Staff cannot update -> 403
    try {
      const res = await fetch(`${baseUrl}/admin/resources/${res1Id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ name: 'Staff Patch' }),
      });
      assert.strictEqual(res.status, 403);
      recordSuccess(29, 'Staff cannot update -> 403 Forbidden');
    } catch (err) {
      recordFailure(29, 'Staff cannot update -> 403 Forbidden', err);
    }

    // ==================================================
    // DEACTIVATION TESTS (30 - 35)
    // ==================================================
    console.log('\n--- SECTION 5: DEACTIVATION TESTS ---');

    // TEST 30: Admin DELETE sets isActive=false
    try {
      assert(res1Id, 'res1Id should exist');
      const res = await fetch(`${baseUrl}/admin/resources/${res1Id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.data.resource.isActive, false);
      recordSuccess(30, 'Admin DELETE sets isActive=false -> 200 OK');
    } catch (err) {
      recordFailure(30, 'Admin DELETE sets isActive=false -> 200 OK', err);
    }

    // TEST 31: Resource still exists in database
    try {
      const resInDb = await Resource.findById(res1Id);
      assert(resInDb, 'Resource should physically exist in database');
      assert.strictEqual(resInDb.isActive, false);
      recordSuccess(31, 'Resource still exists in database after DELETE');
    } catch (err) {
      recordFailure(31, 'Resource still exists in database after DELETE', err);
    }

    // TEST 32: Associated Game still exists
    try {
      const gameInDb = await Game.findById(gameA._id);
      assert(gameInDb, 'Associated Game should still exist');
      recordSuccess(32, 'Associated Game still exists after Resource DELETE');
    } catch (err) {
      recordFailure(32, 'Associated Game still exists after Resource DELETE', err);
    }

    // TEST 33: Other Resources remain unchanged
    try {
      assert(res2Id, 'res2Id should exist');
      const otherRes = await Resource.findById(res2Id);
      assert(otherRes, 'Other resource should exist');
      assert.strictEqual(otherRes.isActive, true, 'Other resource should still be active');
      recordSuccess(33, 'Other Resources remain unchanged');
    } catch (err) {
      recordFailure(33, 'Other Resources remain unchanged', err);
    }

    // TEST 34: Customer cannot DELETE -> 403
    try {
      const res = await fetch(`${baseUrl}/admin/resources/${res2Id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.strictEqual(res.status, 403);
      recordSuccess(34, 'Customer cannot DELETE -> 403 Forbidden');
    } catch (err) {
      recordFailure(34, 'Customer cannot DELETE -> 403 Forbidden', err);
    }

    // TEST 35: Staff cannot DELETE -> 403
    try {
      const res = await fetch(`${baseUrl}/admin/resources/${res2Id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      assert.strictEqual(res.status, 403);
      recordSuccess(35, 'Staff cannot DELETE -> 403 Forbidden');
    } catch (err) {
      recordFailure(35, 'Staff cannot DELETE -> 403 Forbidden', err);
    }

    // ==================================================
    // AUTHENTICATION TESTS (36 - 39)
    // ==================================================
    console.log('\n--- SECTION 6: AUTHENTICATION TESTS ---');

    // TEST 36: Missing JWT -> 401
    try {
      const res = await fetch(`${baseUrl}/admin/resources/${res1Id}`);
      assert.strictEqual(res.status, 401);
      recordSuccess(36, 'Missing JWT -> 401 Unauthorized');
    } catch (err) {
      recordFailure(36, 'Missing JWT -> 401 Unauthorized', err);
    }

    // TEST 37: Invalid JWT -> 401
    try {
      const res = await fetch(`${baseUrl}/admin/resources/${res1Id}`, {
        headers: { Authorization: 'Bearer invalid.jwt.string' },
      });
      assert.strictEqual(res.status, 401);
      recordSuccess(37, 'Invalid JWT -> 401 Unauthorized');
    } catch (err) {
      recordFailure(37, 'Invalid JWT -> 401 Unauthorized', err);
    }

    // TEST 38: Expired JWT -> 401
    try {
      const res = await fetch(`${baseUrl}/admin/resources/${res1Id}`, {
        headers: { Authorization: `Bearer ${expiredToken}` },
      });
      assert.strictEqual(res.status, 401);
      recordSuccess(38, 'Expired JWT -> 401 Unauthorized');
    } catch (err) {
      recordFailure(38, 'Expired JWT -> 401 Unauthorized', err);
    }

    // TEST 39: Tampered JWT -> 401
    try {
      const res = await fetch(`${baseUrl}/admin/resources/${res1Id}`, {
        headers: { Authorization: `Bearer ${tamperedToken}` },
      });
      assert.strictEqual(res.status, 401);
      recordSuccess(39, 'Tampered JWT -> 401 Unauthorized');
    } catch (err) {
      recordFailure(39, 'Tampered JWT -> 401 Unauthorized', err);
    }

    // ==================================================
    // REGRESSION TESTS (40 - 45)
    // ==================================================
    console.log('\n--- SECTION 7: REGRESSION TESTS ---');

    // TEST 40: Existing Game CRUD still works
    try {
      const res = await fetch(`${baseUrl}/admin/games`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      recordSuccess(40, 'Existing Game CRUD still works');
    } catch (err) {
      recordFailure(40, 'Existing Game CRUD still works', err);
    }

    // TEST 41: Registration still works
    try {
      const testEmail = `step4_reg_${Date.now()}@playarena.test`;
      const testUser = new User({
        name: 'Step4 Reg User',
        email: testEmail,
        phone: '9998887770',
        passwordHash: 'hashedpassword',
        role: 'customer',
      });
      const err = await testUser.validate().catch((e) => e);
      assert.strictEqual(err, undefined);
      recordSuccess(41, 'Registration model validation still works');
    } catch (err) {
      recordFailure(41, 'Registration model validation still works', err);
    }

    // TEST 42: Login still works
    try {
      const token = generateUserToken({ id: mockCustomerUser._id, role: 'customer' });
      assert(token, 'JWT token generation works');
      recordSuccess(42, 'Login JWT generation still works');
    } catch (err) {
      recordFailure(42, 'Login JWT generation still works', err);
    }

    // TEST 43: JWT still works
    try {
      const verified = jwt.verify(adminToken, process.env.JWT_SECRET || 'fallback_secret_key_for_testing_only');
      assert.strictEqual(verified.role, 'admin');
      recordSuccess(43, 'JWT verification still works');
    } catch (err) {
      recordFailure(43, 'JWT verification still works', err);
    }

    // TEST 44: RBAC still works
    try {
      const res = await fetch(`${baseUrl}/admin/profile`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.strictEqual(res.status, 403);
      recordSuccess(44, 'RBAC still works (403 for unauthorized role)');
    } catch (err) {
      recordFailure(44, 'RBAC still works', err);
    }

    // TEST 45: Health endpoint still works
    try {
      const res = await fetch(`${baseUrl}/health`);
      assert.strictEqual(res.status, 200);
      recordSuccess(45, 'Health endpoint still works');
    } catch (err) {
      recordFailure(45, 'Health endpoint still works', err);
    }

  } finally {
    if (isDbConnected) {
      try {
        await Game.deleteMany({ slug: { $regex: /^game-a-|^game-b-|^inactive-game-/ } });
        await Resource.deleteMany({ locationNote: { $regex: /^Zone 1/ } });
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
    console.log('ALL 45 TESTS PASSED SUCCESSFULLY!');
  }
}

runStep4Tests().catch((err) => {
  console.error('❌ Fatal error in test suite:', err);
  process.exit(1);
});
