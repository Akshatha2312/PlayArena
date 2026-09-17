import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingService } from '../services/bookingService';
import { qrService } from '../services/qrService';
import { socketService } from '../services/socketService';
import { invoiceService } from '../services/invoiceService';
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

  const [remainingTimeText, setRemainingTimeText] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    fetchBooking();

    // Socket real-time subscription
    const socket = socketService.connect();
    if (socket) {
      setSocketConnected(socket.connected);
      socket.on('connect', () => setSocketConnected(true));
      socket.on('disconnect', () => setSocketConnected(false));
    }

    socketService.joinBooking(id);

    const unsubscribeUpdate = socketService.subscribe('booking:status_updated', (data) => {
      if (data.bookingId === id) {
        setBooking((prev) => (prev ? { ...prev, status: data.status, startAt: data.startAt || prev.startAt, endAt: data.endAt || prev.endAt } : prev));
      }
    });

    const unsubscribeCheckIn = socketService.subscribe('booking:checked_in', (data) => {
      if (data.bookingId === id) {
        setBooking((prev) => (prev ? { ...prev, status: 'checked_in', checkedInAt: data.checkedInAt } : prev));
      }
    });

    const unsubscribeStarted = socketService.subscribe('session:started', (data) => {
      if (data.bookingId === id) {
        setBooking((prev) => (prev ? { ...prev, status: 'in_progress', startedAt: data.startedAt } : prev));
      }
    });

    const unsubscribeCompleted = socketService.subscribe('session:completed', (data) => {
      if (data.bookingId === id) {
        setBooking((prev) => (prev ? { ...prev, status: 'completed', completedAt: data.completedAt } : prev));
      }
    });

    const unsubscribeCancelled = socketService.subscribe('booking:cancelled', (data) => {
      if (data.bookingId === id) {
        setBooking((prev) => (prev ? { ...prev, status: 'cancelled', cancelledAt: data.cancelledAt } : prev));
      }
    });

    const unsubscribeRescheduled = socketService.subscribe('booking:rescheduled', (data) => {
      if (data.bookingId === id) {
        setBooking((prev) => (prev ? {
          ...prev,
          status: data.status,
          startAt: data.startAt,
          endAt: data.endAt,
          durationMinutes: data.durationMinutes,
          isRescheduled: true,
          rescheduledAt: data.rescheduledAt
        } : prev));
      }
    });

    return () => {
      unsubscribeUpdate();
      unsubscribeCheckIn();
      unsubscribeStarted();
      unsubscribeCompleted();
      unsubscribeCancelled();
      unsubscribeRescheduled();
      socketService.leaveBooking(id);
    };
  }, [id]);

  // Live countdown timer based on endAt timestamp
  useEffect(() => {
    if (!booking || booking.status !== 'in_progress' || !booking.endAt) {
      setRemainingTimeText(null);
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const end = new Date(booking.endAt).getTime();
      const diffMs = end - now;

      if (diffMs <= 0) {
        setRemainingTimeText('Session ending...');
      } else {
        const totalSecs = Math.floor(diffMs / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        setRemainingTimeText(`${mins}m ${secs < 10 ? '0' : ''}${secs}s remaining`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [booking]);

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

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('10:00');
  const [rescheduleDuration, setRescheduleDuration] = useState(60);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');
  const [rescheduleSuccess, setRescheduleSuccess] = useState('');

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    setRescheduling(true);
    setRescheduleError('');
    setRescheduleSuccess('');

    try {
      await bookingService.rescheduleBooking(id, {
        date: rescheduleDate,
        startTime: rescheduleTime,
        durationMinutes: parseInt(rescheduleDuration, 10),
      });
      setShowRescheduleModal(false);
      setRescheduleSuccess('Booking rescheduled successfully!');
      fetchBooking();
    } catch (err) {
      setRescheduleError(err.response?.data?.message || err.message || 'Failed to reschedule booking');
    } finally {
      setRescheduling(false);
    }
  };

  if (loading) return <LoadingState message="Loading booking details..." />;
  if (error) return <ErrorState message={error} />;
  if (!booking) return <ErrorState message="Booking record not found." />;

  const isEligibleForCancellation = booking.status === 'confirmed' || booking.status === 'pending';
  const isEligibleForReschedule = booking.status === 'confirmed' || booking.status === 'pending' || booking.status === 'checked_in';

  return (
    <div className="container page-container">
      {rescheduleSuccess && <div className="alert alert-success margin-bottom-md">✅ {rescheduleSuccess}</div>}

      <div className="detail-card">
        <div className="detail-header-row">
          <div>
            <span className={`badge badge-${booking.status === 'confirmed' ? 'confirmed' : booking.status === 'cancelled' ? 'cancelled' : 'pending'}`}>
              {booking.status}
            </span>
            {booking.isRescheduled && (
              <span className="badge badge-info margin-left-xs">
                🔄 Rescheduled ({booking.rescheduleCount})
              </span>
            )}
            <span className="socket-status-badge" style={{ marginLeft: '8px', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: socketConnected ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: socketConnected ? '#4ade80' : '#f87171', border: `1px solid ${socketConnected ? '#22c55e' : '#ef4444'}` }}>
              {socketConnected ? '🟢 Live Syncing' : '🔴 REST Fallback'}
            </span>
            <h1 className="detail-title">RESERVATION #{id}</h1>
          </div>

          <div className="action-button-group" style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => navigate(`/my-support?bookingId=${id}&bookingRef=${booking.bookingReference}`)}
            >
              💬 Report an Issue
            </button>
            {booking.resourceId && (
              <button
                className="btn btn-secondary"
                onClick={() => navigate(`/venue?highlightResource=${booking.resourceId._id || booking.resourceId}`)}
              >
                🗺️ View on Venue Map
              </button>
            )}

            {booking.status === 'confirmed' || booking.status === 'checked_in' || booking.status === 'in_progress' || booking.status === 'completed' ? (
              <button className="btn btn-secondary" onClick={() => {
                invoiceService.getInvoiceByBookingId(id)
                  .then((res) => {
                    if (res && res.data && res.data.invoice) {
                      navigate(`/my-invoices/${res.data.invoice._id}`);
                    }
                  })
                  .catch(() => {
                    navigate('/my-invoices');
                  });
              }}>
                🧾 Receipt / Invoice
              </button>
            ) : null}

            {isEligibleForReschedule && (
              <button className="btn btn-secondary" onClick={() => {
                setRescheduleDate(new Date(booking.startAt).toISOString().split('T')[0]);
                setRescheduleDuration(booking.durationMinutes);
                setShowRescheduleModal(true);
              }}>
                📅 Reschedule
              </button>
            )}

            {isEligibleForCancellation && (
              <button className="btn btn-danger" onClick={() => setShowCancelModal(true)}>
                <XCircle /> Cancel Booking
              </button>
            )}
          </div>
        </div>

        {/* Live Session Timeline */}
        <div className="session-timeline-container" style={{ margin: '20px 0', padding: '20px', backgroundColor: '#090d16', borderRadius: '8px', border: '1px solid #1e293b' }}>
          <h4 style={{ color: '#94a3b8', margin: '0 0 16px 0', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>LIVE SESSION TIMELINE</h4>
          <div className="timeline-steps" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
            {[
              { key: 'confirmed', label: 'CONFIRMED', step: 1 },
              { key: 'checked_in', label: 'CHECKED IN', step: 2 },
              { key: 'in_progress', label: 'ACTIVE SESSION', step: 3 },
              { key: 'completed', label: 'COMPLETED', step: 4 },
            ].map((st, idx, arr) => {
              const order = { pending: 0, confirmed: 1, checked_in: 2, in_progress: 3, completed: 4, cancelled: -1, no_show: -1 };
              const currentOrder = order[booking.status] || 0;
              const isDone = currentOrder >= st.step && currentOrder !== -1;
              const isActive = currentOrder === st.step && currentOrder !== -1;

              return (
                <div key={st.key} className="timeline-step-item" style={{ flex: 1, textAlign: 'center', position: 'relative', zIndex: 2 }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: isDone ? (isActive ? '#0284c7' : '#16a34a') : '#1e293b',
                    color: isDone ? '#ffffff' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 8px auto',
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                    border: isActive ? '2px solid #38bdf8' : 'none',
                    boxShadow: isActive ? '0 0 10px rgba(56, 189, 248, 0.5)' : 'none'
                  }}>
                    {isDone ? '✓' : st.step}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: isActive ? 'bold' : 'normal', color: isActive ? '#38bdf8' : isDone ? '#f8fafc' : '#64748b' }}>
                    {st.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Session Live Countdown for In Progress Bookings */}
        {booking.status === 'in_progress' && remainingTimeText && (
          <div style={{ margin: '16px 0', padding: '16px', backgroundColor: 'rgba(2, 132, 199, 0.15)', borderRadius: '8px', border: '1px solid #0284c7', textAlign: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: '#7dd3fc', fontWeight: 'bold' }}>⏱️ LIVE SESSION COUNTDOWN: </span>
            <span style={{ fontSize: '1.2rem', color: '#38bdf8', fontWeight: 'bold', marginLeft: '8px' }}>{remainingTimeText}</span>
          </div>
        )}

        {/* QR Code Section for Confirmed Bookings */}
        {booking.status === 'confirmed' && qrData && (
          <div className="digital-arena-pass-card" style={{ marginTop: '24px', marginBottom: '24px', textAlign: 'center', backgroundColor: '#12141a', padding: '24px', borderRadius: '12px', border: '1px solid #00e5ff', boxShadow: '0 0 25px rgba(0, 229, 255, 0.15)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#00e5ff', letterSpacing: '0.08em', marginBottom: '4px' }}>DIGITAL ARENA ACCESS PASS</div>
            <h3 style={{ color: '#ffffff', marginTop: 0, marginBottom: '16px', fontSize: '1.2rem', fontWeight: '800' }}>{booking.gameId?.name || 'PLAY ARENA'} • {booking.resourceId?.name || 'UNIT'}</h3>
            <QRCodeDisplay value={qrData.qrToken} size={220} />
            <p style={{ marginTop: '16px', marginBottom: 0, color: '#9ca3af', fontSize: '0.85rem', fontWeight: '500' }}>
              Present this QR pass at Play Arena front desk for instant check-in entrance.
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
      {/* Reschedule Booking Modal */}
      {showRescheduleModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">📅 RESCHEDULE RESERVATION</h3>
            <p className="modal-description">
              Select a new date, start time, and duration for your booking.
            </p>

            {rescheduleError && (
              <div className="alert-box alert-error">
                <AlertTriangle className="alert-icon" />
                <span>{rescheduleError}</span>
              </div>
            )}

            <form onSubmit={handleRescheduleSubmit}>
              <div className="form-group margin-bottom">
                <label htmlFor="reschedule-date">New Date</label>
                <input
                  id="reschedule-date"
                  type="date"
                  value={rescheduleDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group margin-bottom">
                <label htmlFor="reschedule-time">New Start Time (24h format)</label>
                <select
                  id="reschedule-time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  required
                >
                  {['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'].map((time) => (
                    <option key={time} value={time}>
                      {time} hrs
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group margin-bottom">
                <label htmlFor="reschedule-duration">Duration</label>
                <select
                  id="reschedule-duration"
                  value={rescheduleDuration}
                  onChange={(e) => setRescheduleDuration(parseInt(e.target.value, 10))}
                  required
                >
                  {[30, 60, 90, 120, 180, 240].map((dur) => (
                    <option key={dur} value={dur}>
                      {dur} minutes
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRescheduleModal(false)}
                  disabled={rescheduling}
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={rescheduling}
                >
                  {rescheduling ? 'Rescheduling...' : 'Confirm New Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
