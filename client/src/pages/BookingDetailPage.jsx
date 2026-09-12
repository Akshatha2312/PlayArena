import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingService } from '../services/bookingService';
import { qrService } from '../services/qrService';
import { socketService } from '../services/socketService';
import { QRCodeDisplay } from '../components/QRCodeDisplay';
import { LoadingState, ErrorState } from '../components/StateComponents';
import { Calendar, Clock, Tag, AlertTriangle, ShieldCheck, XCircle } from 'lucide-react';
import './BookingDetailPage.css';

export const BookingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cancellation Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  useEffect(() => {
    fetchBooking();

    // Socket real-time subscription
    socketService.connect();
    socketService.joinBooking(id);

    const unsubscribeUpdate = socketService.subscribe('booking:status_updated', (data) => {
      if (data.bookingId === id) {
        setBooking((prev) => (prev ? { ...prev, status: data.status } : prev));
      }
    });

    const unsubscribeCheckIn = socketService.subscribe('booking:checked_in', (data) => {
      if (data.bookingId === id) {
        setBooking((prev) => (prev ? { ...prev, status: 'checked_in', checkedInAt: data.checkedInAt } : prev));
      }
    });

    return () => {
      unsubscribeUpdate();
      unsubscribeCheckIn();
      socketService.leaveBooking(id);
    };
  }, [id]);

  const fetchBooking = () => {
    setLoading(true);
    setError(null);

    bookingService
      .getUserBookingById(id)
      .then((res) => {
        setBooking(res.data.booking);
        if (res.data.booking && res.data.booking.status === 'confirmed') {
          qrService
            .getBookingQR(id)
            .then((qrRes) => setQrData(qrRes.data))
            .catch(() => {});
        }
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

        {/* QR Code Section for Confirmed Bookings */}
        {booking.status === 'confirmed' && qrData && (
          <div style={{ marginTop: '24px', marginBottom: '24px', textAlign: 'center', backgroundColor: '#0f172a', padding: '24px', borderRadius: '8px', border: '1px solid #0284c7' }}>
            <h3 style={{ color: '#38bdf8', marginTop: 0, marginBottom: '16px', fontSize: '1.1rem' }}>ENTRY QR PASS</h3>
            <QRCodeDisplay value={qrData.qrToken} size={220} />
            <p style={{ marginTop: '16px', marginBottom: 0, color: '#94a3b8', fontSize: '0.85rem' }}>
              Present this QR code at Play Arena front desk for instant staff check-in.
            </p>
          </div>
        )}

        {/* Status Messages for Non-confirmed Bookings */}
        {booking.status !== 'confirmed' && (
          <div style={{ marginTop: '20px', marginBottom: '20px', padding: '16px', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155', color: '#94a3b8', fontSize: '0.9rem' }}>
            {booking.status === 'checked_in' && '✔ Checked in at venue. Enjoy your session!'}
            {booking.status === 'in_progress' && '⚡ Session is currently active in progress.'}
            {booking.status === 'completed' && '🏁 Session completed. Thank you for playing at Play Arena!'}
            {booking.status === 'cancelled' && '❌ Booking has been cancelled.'}
            {booking.status === 'no_show' && '⚠️ Marked as no-show.'}
            {booking.status === 'pending' && '⏳ Payment pending.'}
          </div>
        )}

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
