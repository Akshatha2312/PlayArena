import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { bookingService } from '../services/bookingService';
import { LoadingState, ErrorState } from '../components/StateComponents';
import { CheckCircle2, Calendar, Clock, Trophy, ArrowRight } from 'lucide-react';
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

  if (loading) return <LoadingState message="Fetching booking confirmation..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="container page-container">
      <div className="success-card">
        <div className="success-icon-wrapper">
          <CheckCircle2 className="success-icon" />
        </div>

        <h1 className="success-title">BOOKING & PAYMENT CONFIRMED!</h1>
        <p className="success-subtitle">
          Your court reservation at Play Arena is confirmed. Reference ID: <code>{id}</code>
        </p>

        {booking && (
          <div className="confirmation-details">
            <div className="confirm-row">
              <span>Status</span>
              <span className="badge badge-confirmed">{booking.status}</span>
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
              <span>Total Amount Paid</span>
              <span className="value price-value">₹{booking.totalAmount}</span>
            </div>
          </div>
        )}

        <div className="success-actions">
          <Link to={`/my-bookings/${id}`} className="btn btn-primary">
            View Booking Details <ArrowRight />
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
