import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { staffService } from '../../services/staffService';
import { LoadingState, ErrorState, EmptyState } from '../../components/StateComponents';

export const StaffSchedulePage = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const res = await staffService.getSchedule({
        date,
        status: statusFilter,
      });
      setBookings(res.data?.bookings || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [date, statusFilter]);

  const handleStateAction = async (id, actionType) => {
    try {
      setActionLoading(id);
      if (actionType === 'check-in') await staffService.checkInBooking(id);
      if (actionType === 'start') await staffService.startSession(id);
      if (actionType === 'complete') await staffService.completeSession(id);
      if (actionType === 'no-show') await staffService.markNoShow(id);
      await fetchSchedule();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="staff-page-container">
      <div className="staff-header-actions">
        <div>
          <h1 className="staff-title">📅 Daily Operations Schedule</h1>
          <p className="staff-subtitle">Scan & Manage Bookings for {date}</p>
        </div>

        <div className="schedule-filter-bar">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="staff-date-input"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="staff-select"
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Upcoming (Confirmed)</option>
            <option value="checked_in">Checked In</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="no_show">No Show</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Fetching schedule..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchSchedule} />
      ) : bookings.length === 0 ? (
        <EmptyState
          title="No Bookings Found"
          message={`No bookings matching criteria for date ${date}.`}
        />
      ) : (
        <div className="table-responsive">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Time Slot</th>
                <th>Game & Resource</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Check-In</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const startTime = new Date(b.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const endTime = new Date(b.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <tr key={b._id} className={`row-status-${b.status}`}>
                    <td>
                      <strong>{startTime} - {endTime}</strong>
                      <div className="sub-text">{b.durationMinutes} mins</div>
                    </td>
                    <td>
                      <div><strong>{b.gameId?.title || 'Game'}</strong></div>
                      <div className="sub-text">📍 {b.resourceId?.name || 'Resource'}</div>
                    </td>
                    <td>
                      <div><strong>{b.userId?.name || 'Walk-in Guest'}</strong></div>
                      <div className="sub-text">📧 {b.userId?.email}</div>
                      {b.userId?.phone && <div className="sub-text">📞 {b.userId?.phone}</div>}
                    </td>
                    <td>
                      <span className={`status-pill pill-${b.status}`}>
                        {b.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {b.checkedInAt ? (
                        <span className="checkin-badge">✅ {new Date(b.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      ) : (
                        <span className="sub-text">Pending</span>
                      )}
                    </td>
                    <td>
                      <div className="table-action-btns">
                        <Link to={`/staff/bookings/${b._id}`} className="btn-table-action btn-view">
                          Details
                        </Link>

                        {b.status === 'confirmed' && (
                          <>
                            <button
                              disabled={actionLoading === b._id}
                              onClick={() => handleStateAction(b._id, 'check-in')}
                              className="btn-table-action btn-checkin"
                            >
                              Check-In
                            </button>
                            <button
                              disabled={actionLoading === b._id}
                              onClick={() => handleStateAction(b._id, 'no-show')}
                              className="btn-table-action btn-noshow"
                            >
                              No-Show
                            </button>
                          </>
                        )}

                        {b.status === 'checked_in' && (
                          <button
                            disabled={actionLoading === b._id}
                            onClick={() => handleStateAction(b._id, 'start')}
                            className="btn-table-action btn-start"
                          >
                            Start Session
                          </button>
                        )}

                        {b.status === 'in_progress' && (
                          <button
                            disabled={actionLoading === b._id}
                            onClick={() => handleStateAction(b._id, 'complete')}
                            className="btn-table-action btn-complete"
                          >
                            End Session
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
