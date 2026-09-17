import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { bookingService } from '../services/bookingService';
import { LoadingState, ErrorState } from '../components/StateComponents';
import { CheckCircle2, Calendar, Clock, Trophy, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import './BookingSuccessPage.css';

export const BookingSuccessPage = () => {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    bookingService
      .getUserBookingById(id)
      .then((res) => {
        setBooking(res.data.booking);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load booking details');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) return <LoadingState message="Securing session pass..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="container page-container">
      <div className="success-card arena-locked-card">
        <div className="success-badge-row">
          <span className="badge badge-success">
            <Sparkles className="sparkle-icon" /> SESSION LOCKED
          </span>
        </div>

        <div className="success-icon-wrapper">
          <CheckCircle2 className="success-icon" />
        </div>

        <h1 className="success-title">YOU'RE READY TO PLAY!</h1>
        <p className="success-subtitle">
          Your court reservation at Play Arena is confirmed and locked. Reference ID: <code>{id}</code>
        </p>

        {booking && (
          <div className="confirmation-details">
            <div className="confirm-row">
              <span>Activity / Arena</span>
              <span className="value font-bold">{booking.gameId?.name || 'Play Arena Game'}</span>
            </div>
            <div className="confirm-row">
              <span>Reserved Unit</span>
              <span className="value font-bold">{booking.resourceId?.name || 'Arena Unit'}</span>
            </div>
            <div className="confirm-row">
              <span>Date & Time</span>
              <span className="value">
                {new Date(booking.startAt).toLocaleDateString()} ({new Date(booking.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </span>
            </div>
            <div className="confirm-row">
              <span>Duration</span>
              <span className="value">{booking.durationMinutes} minutes</span>
            </div>
            <div className="confirm-row">
              <span>Status</span>
              <span className="badge badge-confirmed">{booking.status.toUpperCase()}</span>
            </div>
            <div className="confirm-row total-row">
              <span>Total Amount Paid</span>
              <span className="value price-value">₹{booking.totalAmount}</span>
            </div>
          </div>
        )}

        <div className="arena-pass-cta">
          <ShieldCheck className="pass-shield-icon" />
          <span>Present your QR Arena Pass at front desk for instant entry.</span>
        </div>

        <div className="success-actions">
          <Link to={`/my-bookings/${id}`} className="btn btn-primary btn-hero">
            VIEW ARENA PASS & QR <ArrowRight />
          </Link>
          <Link to="/my-bookings" className="btn btn-secondary">
            Go to My Bookings
          </Link>
          <Link to="/games" className="btn btn-outline">
            Browse More Games
          </Link>
        </div>
      </div>
    </div>
  );
};
