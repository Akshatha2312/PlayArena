# Play Arena — Indoor Gaming Center Booking & Operations Platform

Play Arena is an enterprise-grade MERN stack indoor gaming and sports center booking platform supporting customers, staff operators, and administrative management.

---

## Key Platform Features

- **Customer Experience**: Game catalog, real-time availability check, booking engine, Razorpay payments, booking passes with signed QR codes, waitlist, rescheduling, PDF/printable invoices, customer support ticketing, and progressive web app (PWA) support.
- **Customer AI Assistant**: Integrated server-side AI assistant using read-only allowlisted tool calling to answer queries about catalog, bookings, invoices, support, and venue navigation without exposing secrets or enabling unauthorized mutations.
- **Staff Console**: Operational schedule view, session tracking (check-in, start, complete, no-show), manual walk-in booking creation, QR code scanner check-in, and customer support ticket resolution queue.
- **Admin Control Center**: Comprehensive resource management, game pricing configuration, staff management, global booking control, payment transaction auditing, venue layout editor, and real-time revenue/booking analytics dashboards.
- **PWA & Offline Shell**: Offline notification banner, install prompt handling, service worker update prompt, and static asset caching while keeping all API, payment, and booking endpoints server-authoritative and online-only.

---

## Production Deployment Architecture

```
                                 ┌─────────────────────────┐
                                 │     CDN / Static Host   │
                                 │  (Vercel / Netlify)     │
                                 │  React + Vite PWA App   │
                                 └────────────┬────────────┘
                                              │ HTTPS
                                              ▼
┌───────────────────────────┐    ┌─────────────────────────┐    ┌─────────────────────────┐
│     Razorpay Gateway      │───►│    Node.js Express      │───►│      MongoDB Atlas      │
│  Payment & Webhook Engine │◄───│  Backend API Cluster    │◄───│  Encrypted Cloud DB     │
└───────────────────────────┘    └────────────┬────────────┘    └─────────────────────────┘
                                              │ WSS / HTTPS
                                              ▼
                                 ┌─────────────────────────┐
                                 │  Socket.IO & Push Server│
                                 │  Realtime Updates Hub   │
                                 └─────────────────────────┘
```

---

## Environment Configuration Matrix

### Backend (`server/.env`)

| Variable Name | Required | Purpose / Description |
| :--- | :--- | :--- |
| `PORT` | Yes | HTTP Server listener port (e.g. `5000`) |
| `NODE_ENV` | Yes | Runtime environment (`production` or `development`) |
| `CLIENT_URL` | Yes | Allowed frontend origin URL for CORS |
| `MONGODB_URI` | Yes | Encrypted MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | Cryptographic secret for signing JWT auth tokens |
| `JWT_EXPIRES_IN` | Yes | Expiration duration for JWT tokens (e.g. `1d`) |
| `RAZORPAY_KEY_ID` | Conditional | Razorpay API Key ID |
| `RAZORPAY_KEY_SECRET` | Conditional | Razorpay API Key Secret |
| `RAZORPAY_WEBHOOK_SECRET` | Conditional | Razorpay Webhook Signature Verification Secret |
| `SMTP_HOST` | Optional | SMTP Host for email notifications |
| `SMTP_PORT` | Optional | SMTP Port (e.g. `587` or `465`) |
| `SMTP_USER` | Optional | SMTP Authentication Username |
| `SMTP_PASSWORD` | Optional | SMTP Authentication Password |
| `EMAIL_FROM` | Optional | Default Sender Email Address |
| `WHATSAPP_ENABLED` | Optional | Set `true` to enable WhatsApp notifications |
| `WHATSAPP_PROVIDER` | Optional | Provider name (`meta` or `mock`) |
| `WHATSAPP_ACCESS_TOKEN` | Optional | Meta Graph API Access Token |
| `WHATSAPP_PHONE_NUMBER_ID` | Optional | Meta Phone Number ID |
| `AI_ENABLED` | Optional | Set `true` to enable Customer AI Assistant |
| `AI_PROVIDER` | Optional | AI Provider (`gemini`, `openai`, or `mock`) |
| `AI_API_KEY` | Optional | Server-side AI Provider API Key |
| `AI_MODEL` | Optional | Model identifier (e.g., `gemini-2.5-flash`) |
| `TRUST_PROXY` | Optional | Set `1` when running behind Render, Railway, or Nginx |

### Frontend (`client/.env`)

| Variable Name | Required | Purpose / Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Optional | Base URL for backend API (defaults to relative `/api/v1`) |
| `VITE_SOCKET_URL` | Optional | WebSocket server endpoint for Socket.IO |

---

## Security Policies & Hardening

1. **Production Secret Validation**: Server startup in `production` mode automatically inspects `JWT_SECRET`, `MONGODB_URI`, `RAZORPAY_KEY_SECRET`, and `AI_API_KEY` to ensure no default development placeholders exist.
2. **Backend RBAC Boundary**: Strict authentication middleware (`authenticate`) and role authorization (`authorize('customer')`, `authorize('staff')`, `authorize('admin')`) enforced on all protected REST and Socket.IO endpoints.
3. **Data Isolation**: Customer-specific queries strictly derive identity from the verified JWT payload (`req.user.userId`).
4. **PWA Security Rule**: Service worker explicitly bypasses `/api/*` and `/socket.io/*` routes (`NetworkOnly`), preventing private user data, JWTs, availability responses, or payment information from remaining in PWA cache.
5. **Rate Limiting**: Tiered IP rate limiting (`authLimiter`, `sensitiveApiLimiter`, `generalApiLimiter`, `aiApiLimiter`).

---

## Automated Verification & Test Commands

### Run Backend Regression Suites
```bash
cd server
node scratch_test_phase20.js    # Master Phase 20 Deployment & RBAC Test Suite
node scratch_test_phase19.js    # Customer AI Assistant Test Suite
node scratch_test_phase17.js    # Support & Issue Management Test Suite
```

### Run Frontend Vitest Suite
```bash
cd client
npx vitest run
```

### Build Production Bundle
```bash
cd client
npm run build
```

---

## Manual Deployment Verification Checklist

- [ ] Configure cloud database in MongoDB Atlas & add server IP to IP Access List.
- [ ] Deploy backend service to cloud host (Render, Railway, Fly.io, or AWS EC2).
- [ ] Configure production environment variables on backend host.
- [ ] Deploy frontend static bundle to CDN (Vercel, Netlify, or Cloudflare Pages).
- [ ] Configure HTTPS SSL certificates for custom domains.
- [ ] Register production Razorpay Webhook endpoint URL in Razorpay Dashboard.
- [ ] Verify PWA installation & standalone launch on real iOS/Android devices over HTTPS.
