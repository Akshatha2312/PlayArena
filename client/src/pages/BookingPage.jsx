import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gameService } from '../services/gameService';
import { bookingService } from '../services/bookingService';
import { paymentService } from '../services/paymentService';
import { waitlistService } from '../services/waitlistService';
import { useAuth } from '../context/AuthContext';
import { LoadingState, ErrorState } from '../components/StateComponents';
import { Calendar, Clock, CheckCircle2, AlertTriangle, ShieldCheck, CreditCard } from 'lucide-react';
import './BookingPage.css';

// Helper to generate dynamic duration options according to Game constraints
const generateDurationOptions = (min, max, step) => {
  const options = [];
  for (let d = min; d <= max; d += step) {
    options.push(d);
  }
  return options;
};

// Helper to load Razorpay SDK dynamically
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const BookingPage = () => {
  const { gameId, resourceId } = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [game, setGame] = useState(null);
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form State
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [durationMinutes, setDurationMinutes] = useState(60);

  // Availability State
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [isAvailable, setIsAvailable] = useState(null);
  const [availabilityMessage, setAvailabilityMessage] = useState('');

  // Submission / Payment State
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState(null);

  // Waitlist State
  const [waitlistJoining, setWaitlistJoining] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState('');
  const [waitlistError, setWaitlistError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([gameService.getGameById(gameId), gameService.getGameResources(gameId)])
      .then(([gameRes, resourceRes]) => {
        const fetchedGame = gameRes.data.game;
        setGame(fetchedGame);
        setDurationMinutes(fetchedGame.minBookingDurationMinutes || 60);

        const foundResource = (resourceRes.data.resources || []).find(
          (r) => (r._id || r.id) === resourceId
        );
        if (!foundResource) {
          throw new Error('Selected resource court/table not found.');
        }
        setResource(foundResource);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load booking details');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [gameId, resourceId]);

  // Check Availability whenever inputs change
  useEffect(() => {
    if (!game || !resource || !date || !startTime || !durationMinutes) return;

    setCheckingAvailability(true);
    setIsAvailable(null);
    setAvailabilityMessage('');
    setBookingError(null);

    gameService
      .checkAvailability(gameId, resourceId, {
        date,
        startTime,
        durationMinutes,
      })
      .then((res) => {
        setIsAvailable(res.data?.available);
        if (res.data?.available) {
          setAvailabilityMessage('Time slot is available for instant booking!');
        } else {
          setAvailabilityMessage('Selected time slot is already booked. Please choose another time.');
        }
      })
      .catch((err) => {
        setIsAvailable(false);
        setAvailabilityMessage(err.message || 'Error verifying time slot availability.');
      })
      .finally(() => {
        setCheckingAvailability(false);
      });
  }, [gameId, resourceId, date, startTime, durationMinutes, game, resource]);

  // Calculated Pricing Breakdown
  const effectivePricePerHour =
    resource?.customPricePerHour !== undefined && resource?.customPricePerHour !== null
      ? resource.customPricePerHour
      : game?.basePricePerHour || 0;

  const totalAmount = Math.round(effectivePricePerHour * (durationMinutes / 60) * 100) / 100;

  const handleBookingAndPayment = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setSubmitting(true);
    setBookingError(null);

    try {
      // 1. Create Booking in Backend
      const bookingRes = await bookingService.createBooking({
        gameId,
        resourceId,
        date,
        startTime,
        durationMinutes,
      });

      const newBooking = bookingRes.data.booking;
      const createdBookingId = newBooking._id || newBooking.id;

      // 2. Request Payment Order from Backend
      const orderRes = await paymentService.createPaymentOrder(createdBookingId);
      const paymentOrderData = orderRes.data;

      // 3. Load Razorpay Script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded && !window.Razorpay) {
        throw new Error('Razorpay Checkout SDK failed to load. Please check network connection.');
      }

      // If test mock environment, verify directly
      if (paymentOrderData.orderId.startsWith('order_mock_')) {
        const verifyRes = await paymentService.verifyPayment({
          razorpay_order_id: paymentOrderData.orderId,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_signature: 'mock_signature',
        });
        navigate(`/booking-success/${createdBookingId}`);
        return;
      }

      // 4. Open Razorpay Checkout Modal
      const options = {
        key: paymentOrderData.keyId,
        amount: paymentOrderData.amount,
        currency: paymentOrderData.currency,
        name: 'Play Arena Indoor Center',
        description: `Booking for ${game.name} - ${resource.name}`,
        order_id: paymentOrderData.orderId,
        handler: async (response) => {
          try {
            // 5. Send Verification to Backend
            await paymentService.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            navigate(`/booking-success/${createdBookingId}`);
          } catch (verifyErr) {
            setBookingError(`Payment Verification Failed: ${verifyErr.message}`);
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: {
          color: '#ff3b30',
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            setBookingError('Payment checkout dismissed. You can retry payment from My Bookings.');
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on('payment.failed', (failedRes) => {
        setSubmitting(false);
        setBookingError(`Payment Failed: ${failedRes.error.description}`);
      });
      razorpayInstance.open();
    } catch (err) {
      setSubmitting(false);
      if (err.status === 409) {
        setBookingError('This slot was just booked by another customer. Please choose another time.');
        setIsAvailable(false);
      } else {
        setBookingError(err.message || 'Failed to complete booking. Please try again.');
      }
    }
  };

  if (loading) return <LoadingState message="Loading court reservation calendar..." />;
  if (error) return <ErrorState message={error} />;

  const durationOptions = generateDurationOptions(
    game.minBookingDurationMinutes || 30,
    game.maxBookingDurationMinutes || 120,
    game.bookingIntervalMinutes || 30
  );

  return (
    <div className="container page-container">
      <div className="booking-layout">
        {/* Left Column: Form Controls */}
        <div className="booking-form-card">
          <h1 className="form-title">RESERVE TIME SLOT</h1>
          <p className="form-subtitle">
            Booking court <strong>{resource.name}</strong> for <strong>{game.name}</strong>
          </p>

          {bookingError && <div className="alert alert-error">{bookingError}</div>}
          {waitlistSuccess && <div className="alert alert-success">✅ {waitlistSuccess}</div>}
          {waitlistError && <div className="alert alert-error">⚠️ {waitlistError}</div>}

          <form onSubmit={handleBookingAndPayment}>
            <div className="form-group">
              <label htmlFor="booking-date">Select Date</label>
              <input
                id="booking-date"
                type="date"
                value={date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="booking-time">Start Time (24h format)</label>
                <select
                  id="booking-time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                >
                  {['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'].map((time) => (
                    <option key={time} value={time}>
                      {time} hrs
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="booking-duration">Duration</label>
                <select
                  id="booking-duration"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
                  required
                >
                  {durationOptions.map((dur) => (
                    <option key={dur} value={dur}>
                      {dur} minutes
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Availability Indicator & Waitlist Option */}
            <div className="availability-box">
              {checkingAvailability ? (
                <div className="checking-text">Checking real-time slot availability...</div>
              ) : isAvailable === true ? (
                <div className="available-status text-success">
                  <CheckCircle2 className="status-icon" /> {availabilityMessage}
                </div>
              ) : isAvailable === false ? (
                <div className="unavailable-container">
                  <div className="available-status text-error">
                    <AlertTriangle className="status-icon" /> {availabilityMessage}
                  </div>
                  <button
                    type="button"
                    onClick={handleJoinWaitlist}
                    disabled={waitlistJoining}
                    className="btn btn-secondary btn-block margin-top-sm"
                  >
                    {waitlistJoining ? 'Joining Waitlist...' : '⏳ Join Waitlist for This Slot'}
                  </button>
                </div>
              ) : null}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block submit-booking-btn"
              disabled={submitting || checkingAvailability || isAvailable === false}
            >
              {submitting ? 'Processing Payment...' : 'Proceed to Razorpay Checkout'}
            </button>
          </form>
        </div>

        {/* Right Column: Order Summary Card */}
        <div className="summary-card">
          <h2>BOOKING SUMMARY</h2>
          <div className="summary-list">
            <div className="summary-item">
              <span className="label">Activity / Game</span>
              <span className="value">{game.name}</span>
            </div>

            <div className="summary-item">
              <span className="label">Court / Resource</span>
              <span className="value">{resource.name}</span>
            </div>

            <div className="summary-item">
              <span className="label">Date</span>
              <span className="value">{date}</span>
            </div>

            <div className="summary-item">
              <span className="label">Time Interval</span>
              <span className="value">{startTime} ({durationMinutes} mins)</span>
            </div>

            <div className="summary-item">
              <span className="label">Hourly Rate</span>
              <span className="value">₹{effectivePricePerHour} / hr</span>
            </div>

            <div className="summary-item total-item">
              <span className="label">Total Amount</span>
              <span className="value total-price">₹{totalAmount}</span>
            </div>
          </div>

          <div className="security-notice">
            <ShieldCheck className="shield-icon" />
            <p>100% Backend Verified & Encrypted via Razorpay Payment Gateway.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
