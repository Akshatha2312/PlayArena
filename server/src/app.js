const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { authLimiter, sensitiveApiLimiter, generalApiLimiter } = require('./middleware/rateLimiter');

const app = express();

// 1. Production Security Headers & CORS
app.use(
  helmet({
    contentSecurityPolicy: false, // Allowed for cross-origin React frontend & Razorpay checkout compatibility
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// Apply general API rate limiter
app.use('/api/', generalApiLimiter);

// API Routes & Route-specific Middlewares
const paymentRoutes = require('./routes/paymentRoutes');

// Mount /api/v1/payments BEFORE global express.json() so webhook can consume raw body
app.use('/api/v1/payments', sensitiveApiLimiter, paymentRoutes);

// Global JSON parsing middleware for all other routes
app.use(express.json());

// 2. Base & Health Check API Endpoints
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Welcome to Play Arena API Engine',
  });
});

app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Play Arena API is healthy and operational',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// 3. API Routes
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const staffRoutes = require('./routes/staffRoutes');
const adminRoutes = require('./routes/adminRoutes');
const catalogRoutes = require('./routes/catalogRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const waitlistRoutes = require('./routes/waitlistRoutes');

app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/customer', customerRoutes);
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/games', catalogRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/notifications', sensitiveApiLimiter, notificationRoutes);
app.use('/api/v1/waitlist', waitlistRoutes);

// 4. Unhandled Route Handler (404)
app.use((req, res, next) => {
  res.status(404).json({
    status: 'fail',
    message: `Cannot find ${req.originalUrl} on this server`,
  });
});

// 5. Centralized Global Error Handling Middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
  const isProd = process.env.NODE_ENV === 'production';

  // In production, mask internal server 500 errors to prevent leaking stack traces or db errors
  const message = isProd && statusCode === 500 ? 'Internal Server Error' : err.message || 'Internal Server Error';

  res.status(statusCode).json({
    status,
    message,
    ...(!isProd && { stack: err.stack }),
  });
});

module.exports = app;
