import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { staffService } from '../../services/staffService';
import { LoadingState, ErrorState } from '../../components/StateComponents';

export const StaffBookingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await staffService.getBookingDetails(id);
      setBooking(res.data?.booking);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleAction = async (actionType) => {
    try {
      setActionLoading(true);
      if (actionType === 'check-in') await staffService.checkInBooking(id);
      if (actionType === 'start') await staffService.startSession(id);
      if (actionType === 'complete') await staffService.completeSession(id);
      if (actionType === 'no-show') await staffService.markNoShow(id);
      await fetchDetail();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingState message="Loading booking detail..." />;
  if (error) return <ErrorState message={error} onRetry={fetchDetail} />;
  if (!booking) return <ErrorState message="Booking not found" />;

  const startTime = new Date(booking.startAt).toLocaleString();
  const endTime = new Date(booking.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="staff-page-container">
      <div className="staff-header-actions">
        <div>
          <Link to="/staff/schedule" className="btn-back">← Back to Schedule</Link>
          <h1 className="staff-title">Booking Details #{booking._id}</h1>
          <p className="staff-subtitle">Operational Record & Transition Control</p>
        </div>
        <div>
          <span className={`status-pill pill-${booking.status}`}>
            {booking.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      <div className="detail-grid">
        {/* Customer & Game Info */}
        <div className="detail-card">
          <h2>👤 Customer Information</h2>
          <div className="detail-row">
            <span className="label">Name:</span>
            <span className="value">{booking.userId?.name || 'Walk-in Customer'}</span>
          </div>
          <div className="detail-row">
            <span className="label">Email:</span>
            <span className="value">{booking.userId?.email || 'N/A'}</span>
          </div>
          <div className="detail-row">
            <span className="label">Phone:</span>
            <span className="value">{booking.userId?.phone || 'N/A'}</span>
          </div>
        </div>

        {/* Booking & Financial Info */}
        <div className="detail-card">
          <h2>🏟️ Booking Information</h2>
          <div className="detail-row">
            <span className="label">Game:</span>
            <span className="value">{booking.gameId?.title}</span>
          </div>
          <div className="detail-row">
            <span className="label">Resource:</span>
            <span className="value">{booking.resourceId?.name}</span>
          </div>
          <div className="detail-row">
            <span className="label">Scheduled Time:</span>
            <span className="value">{startTime} - {endTime}</span>
          </div>
          <div className="detail-row">
            <span className="label">Duration:</span>
            <span className="value">{booking.durationMinutes} Minutes</span>
          </div>
          <div className="detail-row">
            <span className="label">Amount Paid/Snapshot:</span>
            <span className="value font-bold">₹{booking.totalAmount}</span>
          </div>
        </div>

        {/* Operational Timestamps */}
        <div className="detail-card full-width">
          <h2>⏱️ Operational Timestamps & Audit Log</h2>
          <div className="detail-row">
            <span className="label">Created At:</span>
            <span className="value">{new Date(booking.createdAt).toLocaleString()}</span>
          </div>
          {booking.checkedInAt && (
            <div className="detail-row">
              <span className="label">Checked In At:</span>
              <span className="value">{new Date(booking.checkedInAt).toLocaleString()} (Staff: {booking.checkedInBy?.name || 'System'})</span>
            </div>
          )}
          {booking.startedAt && (
            <div className="detail-row">
              <span className="label">Session Started At:</span>
              <span className="value">{new Date(booking.startedAt).toLocaleString()}</span>
            </div>
          )}
          {booking.completedAt && (
            <div className="detail-row">
              <span className="label">Session Completed At:</span>
              <span className="value">{new Date(booking.completedAt).toLocaleString()}</span>
            </div>
          )}
          {booking.noShowAt && (
            <div className="detail-row">
              <span className="label">Marked No-Show At:</span>
              <span className="value">{new Date(booking.noShowAt).toLocaleString()}</span>
            </div>
          )}
          {booking.cancelledAt && (
            <div className="detail-row">
              <span className="label">Cancelled At:</span>
              <span className="value">{new Date(booking.cancelledAt).toLocaleString()} ({booking.cancellationReason || 'No reason provided'})</span>
            </div>
          )}
        </div>
      </div>

      {/* Operational Actions Bar */}
      <div className="staff-actions-card">
        <h2>⚡ Available Operational Actions</h2>
        <div className="action-buttons-group">
          {booking.status === 'confirmed' && (
            <>
              <button
                disabled={actionLoading}
                onClick={() => handleAction('check-in')}
                className="btn-staff-primary"
              >
                ✅ Perform Check-In
              </button>
              <button
                disabled={actionLoading}
                onClick={() => handleAction('no-show')}
                className="btn-noshow"
              >
                ⚠️ Mark No-Show
              </button>
            </>
          )}

          {booking.status === 'checked_in' && (
            <button
              disabled={actionLoading}
              onClick={() => handleAction('start')}
              className="btn-staff-primary"
            >
              ▶️ Start Session
            </button>
          )}

          {booking.status === 'in_progress' && (
            <button
              disabled={actionLoading}
              onClick={() => handleAction('complete')}
              className="btn-complete"
            >
              ⏹️ End Session
            </button>
          )}

          {(booking.status === 'completed' || booking.status === 'cancelled' || booking.status === 'no_show') && (
            <p className="no-actions-text">
              No further state transitions are permitted for status: <strong>{booking.status}</strong>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
