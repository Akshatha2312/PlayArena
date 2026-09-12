import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingService } from '../services/bookingService';
import { LoadingState, ErrorState } from '../components/StateComponents';
import { Calendar, Clock, Tag, AlertTriangle, ShieldCheck, XCircle } from 'lucide-react';
import './BookingDetailPage.css';

export const BookingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cancellation Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const fetchBooking = () => {
    setLoading(true);
    setError(null);

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
  };

  const handleCancelBooking = async (e) => {
    e.preventDefault();
    setCancelling(true);
    setCancelError(null);

    try {
      await bookingService.cancelBooking(id, cancellationReason);
      setShowCancelModal(false);
      fetchBooking(); // Refresh details
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <LoadingState message="Loading booking details..." />;
  if (error) return <ErrorState message={error} />;
  if (!booking) return <ErrorState message="Booking record not found." />;

  const isEligibleForCancellation = booking.status === 'confirmed' || booking.status === 'pending';

  return (
    <div className="container page-container">
      <div className="detail-card">
        <div className="detail-header-row">
          <div>
            <span className={`badge badge-${booking.status === 'confirmed' ? 'confirmed' : booking.status === 'cancelled' ? 'cancelled' : 'pending'}`}>
              {booking.status}
            </span>
            <h1 className="detail-title">RESERVATION #{id}</h1>
          </div>

          {isEligibleForCancellation && (
            <button className="btn btn-danger" onClick={() => setShowCancelModal(true)}>
              <XCircle /> Cancel Booking
            </button>
          )}
        </div>

        <div className="detail-grid">
          <div className="grid-item">
            <span className="grid-label">Start Time</span>
            <span className="grid-value">{new Date(booking.startAt).toLocaleString()}</span>
          </div>

          <div className="grid-item">
            <span className="grid-label">End Time</span>
            <span className="grid-value">{new Date(booking.endAt).toLocaleString()}</span>
          </div>

          <div className="grid-item">
            <span className="grid-label">Duration</span>
            <span className="grid-value">{booking.durationMinutes} minutes</span>
          </div>

          <div className="grid-item">
            <span className="grid-label">Price per Hour</span>
            <span className="grid-value">₹{booking.pricePerHourAtBooking} / hr</span>
          </div>

          <div className="grid-item">
            <span className="grid-label">Total Amount</span>
            <span className="grid-value highlight-price">₹{booking.totalAmount}</span>
          </div>
        </div>

        {booking.status === 'cancelled' && (
          <div className="cancellation-info-box">
            <h4>Cancellation Information</h4>
            <p><strong>Cancelled At:</strong> {booking.cancelledAt ? new Date(booking.cancelledAt).toLocaleString() : 'N/A'}</p>
            {booking.cancellationReason && (
              <p><strong>Reason:</strong> {booking.cancellationReason}</p>
            )}
          </div>
        )}
      </div>

      {/* Cancellation Confirmation Modal */}
      {showCancelModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">CANCEL COURT RESERVATION</h3>
            <p className="modal-description">
              Are you sure you want to cancel this booking?
            </p>

            {cancelError && (
              <div className="alert-box alert-error">
                <AlertTriangle className="alert-icon" />
                <span>{cancelError}</span>
              </div>
            )}

            <form onSubmit={handleCancelBooking}>
              <div className="form-group margin-bottom">
                <label htmlFor="cancel-reason">Reason for Cancellation (Optional)</label>
                <input
                  id="cancel-reason"
                  type="text"
                  placeholder="e.g. Schedule clash, change of plans"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCancelModal(false)}
                  disabled={cancelling}
                >
                  Keep Reservation
                </button>
                <button type="submit" className="btn btn-danger" disabled={cancelling}>
                  {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
