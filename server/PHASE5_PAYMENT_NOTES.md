# Play Arena — Phase 5: Payment Engine Documentation

## 1. Overview & Architecture
Phase 5 introduces a robust, secure, backend-controlled payment engine for Play Arena built with Razorpay. The system ensures complete isolation between client-side requests and sensitive payment validation parameters (such as total booking price, currency, user ownership, and checkout signatures).

### Key Architectural Highlights
- **Separation of Concerns**: `razorpayService.js` wraps the official Razorpay Node.js SDK and crypto HMAC operations. `paymentService.js` implements business rules, idempotency, and database state transitions. `paymentController.js` handles HTTP request/response logic.
- **Backend Source of Truth**: Amounts charged are strictly derived from server-side `Booking.totalAmount`. The client can never specify or override price, currency, or payment status.
- **HMAC Signature Verification**: Checkout signatures (`razorpay_signature`) and Webhook signatures (`x-razorpay-signature`) are computed on the backend using `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET`.
- **Raw Request Body Webhook Handling**: Route `/api/v1/payments/webhook` is mounted before global `express.json()` using `express.raw({ type: 'application/json' })` to preserve exact string payload needed for HMAC SHA256 validation.

---

## 2. Payment Model (`Payment.js`)
The `Payment` model tracks the complete payment lifecycle and associates a customer, booking, and Razorpay transactions.

### Fields
- `userId` (ObjectId, ref: 'User', index): Customer initiating payment.
- `bookingId` (ObjectId, ref: 'Booking', index): Target booking.
- `provider` (String, enum: `['razorpay']`, default: `'razorpay'`): Extensible payment provider identifier.
- `providerOrderId` (String, index): Razorpay Order ID (`order_...`).
- `providerPaymentId` (String, index, nullable): Razorpay Payment ID (`pay_...`).
- `amount` (Number): Payment amount in INR Rupees.
- `currency` (String, default: `'INR'`): Fixed currency code.
- `status` (String, enum: `['created', 'pending', 'paid', 'failed', 'cancelled']`, default: `'created'`): Payment lifecycle status.
- `method` (String, nullable): Payment instrument used (card, upi, netbanking, wallet).
- `failureReason` (String, nullable): Detailed failure/rejection explanation if payment fails.
- `paidAt` (Date, nullable): Timestamp when payment was verified and marked paid.
- `rawWebhookEvents` (Array): Log of processed webhook event IDs (`eventId`, `eventType`, `receivedAt`) for idempotency.

---

## 3. Payment & Booking Lifecycle
```
Customer Requests Booking
        │
        ▼
Booking Created (Confirmed / Pending Payment)
        │
        ▼
Customer Calls POST /api/v1/payments/order
        │
        ├─► Backend fetches Booking totalAmount (Rupees -> Paise)
        ├─► Razorpay Order Created (or reused if active order exists)
        └─► Payment record stored in DB ('created' status)
        │
        ▼
Customer Completes Razorpay Checkout Widget
        │
        ▼
Customer Calls POST /api/v1/payments/verify OR Webhook Triggered
        │
        ├─► Backend verifies HMAC SHA256 signature
        ├─► Backend verifies amount & currency consistency
        ├─► Payment marked 'paid', paidAt set
        └─► Booking status set to 'confirmed'
```

---

## 4. API Endpoints

### 1. Create Payment Order
- **POST** `/api/v1/payments/order`
- **Auth**: Required (`customer` role)
- **Request Body**: `{ "bookingId": "<ObjectId>" }`
- **Response** (200 OK):
  ```json
  {
    "status": "success",
    "message": "Razorpay order created successfully",
    "data": {
      "keyId": "rzp_test_...",
      "orderId": "order_...",
      "amount": 50000,
      "currency": "INR",
      "bookingId": "...",
      "paymentId": "..."
    }
  }
  ```

### 2. Verify Payment Checkout
- **POST** `/api/v1/payments/verify`
- **Auth**: Required (`customer` role)
- **Request Body**:
  ```json
  {
    "razorpay_order_id": "order_...",
    "razorpay_payment_id": "pay_...",
    "razorpay_signature": "e5b..."
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "status": "success",
    "message": "Payment verified and booking confirmed successfully",
    "data": { "payment": {...}, "booking": {...} }
  }
  ```

### 3. Razorpay Webhook Endpoint
- **POST** `/api/v1/payments/webhook`
- **Auth**: None (Public; authenticated via Razorpay signature header `x-razorpay-signature`)
- **Events Handled**: `payment.captured`, `payment.authorized`, `payment.failed`
- **Response** (200 OK): `{ "status": "success", "message": "..." }`

### 4. Customer Payment History
- **GET** `/api/v1/payments?page=1&limit=10`
- **Auth**: Required (`customer` role)

### 5. Customer Payment Detail
- **GET** `/api/v1/payments/:id`
- **Auth**: Required (`customer` role)

---

## 5. Security & Idempotency Strategy
1. **Idempotent Order Creation**: Backend queue locking per booking prevents double-click race conditions from creating duplicate active payment orders. If an active `created`/`pending` payment already exists, the server returns the existing Razorpay Order ID.
2. **Idempotent Verification**: Re-submitting an already verified order returns the existing `paid` record without duplicate DB mutations.
3. **Idempotent Webhook Processing**: `rawWebhookEvents` tracks unique Razorpay `event_id` values to ignore duplicate webhook deliveries.
4. **Amount Verification**: Razorpay integer paise (`amount / 100`) must match `payment.amount` exactly before marking paid.
5. **Ownership Enforcement**: Customers cannot initiate payment, verify signature, or view payment history for bookings belonging to other users.

---

## 6. Environment Variables
- `RAZORPAY_KEY_ID`: Client public key ID returned to frontend.
- `RAZORPAY_KEY_SECRET`: Private API secret used ONLY on backend for signature verification.
- `RAZORPAY_WEBHOOK_SECRET`: Secret used to verify webhook payloads.

---

## 7. Deferred to Future Phases
- Frontend Razorpay Checkout Modal UI integration.
- Full Admin Refund Engine & Refund UI (minimal safe state updates are supported).
- Socket.IO real-time payment notifications.
- Email payment receipts.
