import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gameService } from '../services/gameService';
import { bookingService } from '../services/bookingService';
import { paymentService } from '../services/paymentService';
import { waitlistService } from '../services/waitlistService';
import { useAuth } from '../context/AuthContext';
import { LoadingState, ErrorState } from '../components/StateComponents';
import { Calendar, Clock, CheckCircle2, AlertTriangle, ShieldCheck, Lock, Check, Sparkles } from 'lucide-react';
import './BookingPage.css';

const generateDurationOptions = (min, max, step) => {
  const options = [];
  for (let d = min; d <= max; d += step) {
    options.push(d);
  }
  return options;
};

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

const availableSlotPresetTimes = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
];

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
          setAvailabilityMessage('Time slot is available! Click Lock My Slot to secure.');
        } else {
          setAvailabilityMessage('Selected time slot is already booked. Please choose another slot.');
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

  const handleJoinWaitlist = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setWaitlistJoining(true);
    setWaitlistSuccess('');
    setWaitlistError('');

    try {
      await waitlistService.joinWaitlist({
        gameId,
        resourceId,
        startAt: new Date(`${date}T${startTime}:00`).toISOString(),
        durationMinutes,
      });
      setWaitlistSuccess('Successfully joined waitlist for this slot! We will notify you if it opens up.');
    } catch (err) {
      setWaitlistError(err.response?.data?.message || err.message || 'Failed to join waitlist');
    } finally {
      setWaitlistJoining(false);
    }
  };

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
      const bookingRes = await bookingService.createBooking({
        gameId,
        resourceId,
        date,
        startTime,
        durationMinutes,
      });

      const newBooking = bookingRes.data.booking;
      const createdBookingId = newBooking._id || newBooking.id;

      const orderRes = await paymentService.createPaymentOrder(createdBookingId);
      const paymentOrderData = orderRes.data;

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded && !window.Razorpay) {
        throw new Error('Razorpay Checkout SDK failed to load. Please check network connection.');
      }

      if (paymentOrderData.orderId.startsWith('order_mock_')) {
        await paymentService.verifyPayment({
          razorpay_order_id: paymentOrderData.orderId,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_signature: 'mock_signature',
        });
        navigate(`/booking-success/${createdBookingId}`);
        return;
      }

      const options = {
        key: paymentOrderData.keyId,
        amount: paymentOrderData.amount,
        currency: paymentOrderData.currency,
        name: 'Play Arena Indoor Center',
        description: `Booking for ${game.name} - ${resource.name}`,
        order_id: paymentOrderData.orderId,
        handler: async (response) => {
          try {
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

  if (loading) return <LoadingState message="Securing your arena session..." />;
  if (error) return <ErrorState message={error} />;

  const durationOptions = generateDurationOptions(
    game.minBookingDurationMinutes || 30,
    game.maxBookingDurationMinutes || 120,
    game.bookingIntervalMinutes || 30
  );

  return (
    <div className="container page-container">
      {/* Booking Step Progress Indicator */}
      <div className="booking-progress-bar">
        <div className="progress-step completed">
          <span className="step-num"><Check size={14} /></span>
          <span className="step-label">GAME</span>
        </div>
        <div className="progress-line active"></div>
        <div className="progress-step completed">
          <span className="step-num"><Check size={14} /></span>
          <span className="step-label">UNIT</span>
        </div>
        <div className="progress-line active"></div>
        <div className="progress-step active">
          <span className="step-num">03</span>
          <span className="step-label">TIME & LOCK</span>
        </div>
        <div className="progress-line"></div>
        <div className="progress-step">
          <span className="step-num">04</span>
          <span className="step-label">PAYMENT</span>
        </div>
      </div>

      <div className="booking-layout">
        {/* Left Column: Interactive Time Slot Picker */}
        <div className="booking-form-card">
          <div className="card-header-badge">
            <span className="badge badge-info">{game.name.toUpperCase()}</span>
            <span className="resource-name-tag">📍 {resource.name}</span>
          </div>

          <h1 className="form-title">CHOOSE YOUR SESSION TIME</h1>
          <p className="form-subtitle">
            Pick a date and select an interactive time slot to lock your arena court.
          </p>

          {bookingError && <div className="alert alert-error">{bookingError}</div>}
          {waitlistSuccess && <div className="alert alert-success">✅ {waitlistSuccess}</div>}
          {waitlistError && <div className="alert alert-error">⚠️ {waitlistError}</div>}

          <form onSubmit={handleBookingAndPayment}>
            <div className="form-group margin-bottom-md">
              <label htmlFor="booking-date">01. Select Date</label>
              <input
                id="booking-date"
                type="date"
                value={date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDate(e.target.value)}
                required
                className="date-picker-input"
              />
            </div>

            {/* Interactive Time Slot Selector Grid */}
            <div className="form-group margin-bottom-md">
              <label>02. Choose Start Time</label>
              <div className="interactive-slots-grid">
                {availableSlotPresetTimes.map((time) => {
                  const isSelected = startTime === time;
                  return (
                    <button
                      key={time}
                      type="button"
                      className={`slot-chip ${isSelected ? 'selected' : ''}`}
                      onClick={() => setStartTime(time)}
                    >
                      <Clock className="chip-icon" />
                      <span>{time}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-group margin-bottom-md">
              <label htmlFor="booking-duration">03. Session Duration</label>
              <div className="duration-selector-row">
                {durationOptions.map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    className={`duration-chip ${durationMinutes === dur ? 'selected' : ''}`}
                    onClick={() => setDurationMinutes(dur)}
                  >
                    {dur} mins
                  </button>
                ))}
              </div>
            </div>

            {/* Availability Indicator & Waitlist Option */}
            <div className="availability-box">
              {checkingAvailability ? (
                <div className="checking-text">Verifying real-time slot availability...</div>
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
              className="btn btn-primary btn-block submit-booking-btn lock-slot-btn"
              disabled={submitting || checkingAvailability || isAvailable === false}
            >
              {submitting ? (
                <>SECURING YOUR SESSION...</>
              ) : (
                <>
                  <Lock className="btn-icon" /> 🔒 LOCK MY SLOT & PAY NOW
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Order Summary Card */}
        <div className="summary-card">
          <h2>SESSION SUMMARY</h2>
          <div className="summary-list">
            <div className="summary-item">
              <span className="label">Activity</span>
              <span className="value">{game.name}</span>
            </div>

            <div className="summary-item">
              <span className="label">Selected Unit</span>
              <span className="value">{resource.name}</span>
            </div>

            <div className="summary-item">
              <span className="label">Date</span>
              <span className="value">{date}</span>
            </div>

            <div className="summary-item">
              <span className="label">Session Slot</span>
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
            <p>Instant lock. Encrypted checkout via Razorpay Payment Gateway.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
