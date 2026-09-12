# Phase 4: Backend Booking Engine — Architecture & Domain Notes

## 1. Overview
The Play Arena Phase 4 Backend Booking Engine enables customers to check resource availability, create interval-based bookings with price snapshotting, list their reservations, view booking details, and cancel eligible bookings under strict validation and role-based access control.

---

## 2. Booking Schema & Domain Model
Location: `server/src/models/Booking.js`

### Fields
- `userId`: `ObjectId` (Ref: `User`, Required, Indexed)
- `gameId`: `ObjectId` (Ref: `Game`, Required, Indexed)
- `resourceId`: `ObjectId` (Ref: `Resource`, Required, Indexed)
- `startAt`: `Date` (Required, UTC ISO Date, Indexed)
- `endAt`: `Date` (Required, UTC ISO Date, Indexed)
- `durationMinutes`: `Number` (Required, min: 15)
- `pricePerHourAtBooking`: `Number` (Required, Price Snapshot)
- `totalAmount`: `Number` (Required, Total Amount Snapshot)
- `status`: `Enum` `['pending', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled']` (Default: `'confirmed'`)
- `cancellationReason`: `String` (Optional)
- `cancelledAt`: `Date` (Optional)
- `cancelledBy`: `ObjectId` (Ref: `User`, Optional)
- `timestamps`: `createdAt`, `updatedAt`

---

## 3. Time Representation & Timezone Decision
- All booking timestamps (`startAt`, `endAt`) are stored as standard UTC JavaScript `Date` objects in MongoDB.
- Inputs accept explicit ISO 8601 strings or date (`YYYY-MM-DD`) + start time (`HH:mm`) converted to UTC ISO format (`YYYY-MM-DDTHH:mm:00.000Z`).
- Operating facility is in India (IST / UTC+5:30). Using standard UTC Date timestamps prevents timezone conversion drift across server nodes while supporting clean localized display on the client.

---

## 4. Interval Overlap Formula & Availability
- Bookings occupy half-open intervals `[startAt, endAt)`.
- Contiguous slots (e.g. 18:00–19:00 and 19:00–20:00) do NOT overlap.
- **Overlap Formula**:
  `existing.startAt < requested.endAt AND existing.endAt > requested.startAt`
- **MongoDB Query**:
  ```javascript
  {
    resourceId,
    status: { $in: ['confirmed', 'pending', 'checked_in', 'in_progress'] },
    startAt: { $lt: requestedEndAt },
    endAt: { $gt: requestedStartAt }
  }
  ```

---

## 5. Double-Booking & Concurrency Strategy
To prevent Time-of-Check to Time-of-Use (TOCTOU) race conditions under simultaneous HTTP requests:
1. **Per-Resource Queue Locks**:
   `bookingService.createBooking` acquires an asynchronous per-resource lock (`acquireResourceLock(resource._id)`). Concurrent requests attempting to book the exact same physical resource are serialized during interval check and insertion, ensuring that Request A's insert completes before Request B queries overlap.
2. **Mongoose Session Transactions**:
   When connected to a transaction-capable database (MongoDB Atlas / Replica Sets), `createBooking` wraps the overlap query and insertion inside `session.withTransaction(...)`, guaranteeing ACID read-isolation during concurrency.

---

## 6. Pricing Calculation & Snapshot Behavior
- **Effective Price Per Hour**:
  If `Resource.customPricePerHour` is defined and non-null, use `Resource.customPricePerHour`; otherwise use `Game.basePricePerHour`.
- **Total Amount**: `effectivePricePerHour * (durationMinutes / 60)`.
- **Snapshot Immutability**:
  `pricePerHourAtBooking` and `totalAmount` are stored directly on the `Booking` document. Subsequent changes to `Game.basePricePerHour` or `Resource.customPricePerHour` by administrators will NEVER modify historical booking prices.

---

## 7. Booking Lifecycle & Cancellation Rules
- **Default Status**: Newly created bookings default to `'confirmed'` (no online payment processing required in Phase 4).
- **Cancellation Rules**:
  - Customers can cancel only their own bookings.
  - Already cancelled bookings cannot be cancelled again (returns HTTP 400).
  - Completed bookings cannot be cancelled (returns HTTP 400).
  - Cancelling updates `status = 'cancelled'`, sets `cancelledAt = new Date()`, `cancelledBy = req.user.userId`, and records `cancellationReason`.

---

## 8. Database Indexes
1. `{ resourceId: 1, status: 1, startAt: 1, endAt: 1 }`: Optimized for interval overlap and availability queries.
2. `{ userId: 1, startAt: -1 }`: Optimized for customer "My Bookings" history sorted by start date.

---

## 9. APIs Implemented
- `GET /api/v1/games/:gameId/resources/:resourceId/availability` — Check slot availability.
- `POST /api/v1/bookings` — Customer booking creation.
- `GET /api/v1/bookings` — List authenticated user's bookings.
- `GET /api/v1/bookings/:id` — Retrieve single booking belonging to user.
- `PATCH /api/v1/bookings/:id/cancel` — Cancel user's eligible booking.
