# Play Arena — Phase 6: Customer Frontend Documentation

## 1. Overview & Architecture
Phase 6 builds the complete, production-grade customer-facing React application for Play Arena using Vite, JavaScript, custom CSS, and Lucide React icons.

### Key Architectural Highlights
- **Centralized API Layer**: All HTTP calls flow through `src/services/api.js` which automatically attaches JWT `Authorization: Bearer <token>` headers and handles `401 Unauthorized` responses.
- **Service Modules**: Domain services (`authService.js`, `gameService.js`, `bookingService.js`, `paymentService.js`) encapsulate backend REST endpoints.
- **Context State Management**: `AuthContext.jsx` manages customer authentication state, token storage in `localStorage`, role enforcement (`customer`), and session restoration.
- **Protected Routing**: `ProtectedRoutes.jsx` guards customer-only pages (`/booking/...`, `/my-bookings`, `/my-payments`) and redirects unauthenticated users or non-customer accounts.

---

## 2. Customer Routes

| Path | Auth Requirement | Purpose |
|---|---|---|
| `/` | Public | Hero landing page, Play Arena value proposition, featured games preview, how it works |
| `/games` | Public | Full Games & Activities catalog with category filtering and pagination |
| `/games/:id` | Public | Game detail overview, booking rules, custom rates, and operational resource units |
| `/login` | Guest Only | Customer login form |
| `/register` | Guest Only | Customer account registration form |
| `/booking/:gameId/:resourceId` | Protected (`customer`) | Time-slot reservation page with real-time availability check & Razorpay Checkout modal |
| `/booking-success/:id` | Protected (`customer`) | Instant reservation and payment confirmation receipt |
| `/my-bookings` | Protected (`customer`) | Customer reservation list with status tabs (`ALL`, `CONFIRMED`, `PENDING`, `CANCELLED`) |
| `/my-bookings/:id` | Protected (`customer`) | Detailed booking breakdown with modal cancellation action |
| `/my-payments` | Protected (`customer`) | Historical transaction log of Razorpay Order & Payment IDs |

---

## 3. End-to-End Booking & Razorpay Payment Integration Flow

```
1. Customer selects court resource on /games/:id -> Navigates to /booking/:gameId/:resourceId
2. Customer selects Date, Start Time, and Duration
3. Frontend triggers gameService.checkAvailability() -> Real-time status displayed
4. Customer clicks "Proceed to Razorpay Checkout"
5. Frontend calls POST /api/v1/bookings -> Backend validates constraints & creates Booking
6. Frontend calls POST /api/v1/payments/order -> Backend returns Razorpay Order ID & Key ID
7. Frontend opens official Razorpay Checkout Modal (using public VITE_RAZORPAY_KEY_ID)
8. Customer completes payment -> Razorpay returns razorpay_order_id, razorpay_payment_id, razorpay_signature
9. Frontend calls POST /api/v1/payments/verify -> Backend verifies HMAC SHA256 signature
10. Backend marks Payment 'paid' & Booking 'confirmed' -> Frontend redirects to /booking-success/:id
```

---

## 4. Error Handling & Edge Cases
- **409 Conflict**: If a slot is booked by a competing customer between availability check and submission, the UI displays: `"This slot was just booked by another customer. Please choose another time."`
- **Dismissed Checkout**: If customer closes Razorpay modal without paying, booking remains pending and retry prompt is shown.
- **Verification Failures**: Verification failure prevents confirmation and displays explicit error feedback.

---

## 5. Environment Variables
- `VITE_API_BASE_URL`: Base URL for Express backend (`http://localhost:5000/api/v1`).
- `VITE_RAZORPAY_KEY_ID`: Public Razorpay Key ID used by client checkout modal.

---

## 6. Testing Strategy
- Automated unit and integration test suite created in `client/src/test/CustomerFrontend.test.jsx` using **Vitest** and **React Testing Library**.
- All tests pass (Catalog rendering, login, registration, availability checking, pricing calculation, reservation list).
