import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { staffService } from '../../services/staffService';
import { LoadingState, ErrorState, EmptyState } from '../../components/StateComponents';
import { Pagination } from '../../components/Pagination';

export const StaffSchedulePage = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

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

  const totalPages = Math.ceil(bookings.length / itemsPerPage) || 1;
  const paginatedBookings = bookings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="container page-container">
      <div className="compact-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h1 className="page-title">📅 DAILY OPERATIONS SCHEDULE</h1>
          <p className="page-subtitle">Scan & Manage Bookings for {date}</p>
        </div>

        <div className="compact-toolbar-right">
          <input
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setCurrentPage(1); }}
            className="compact-input"
          />

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="compact-select"
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
        <>
          <div className="dense-table-container">
            <table className="dense-table">
              <thead>
                <tr>
                  <th>TIME SLOT</th>
                  <th>GAME & RESOURCE</th>
                  <th>CUSTOMER</th>
                  <th>STATUS</th>
                  <th>CHECK-IN</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBookings.map((b) => {
                  const startTime = new Date(b.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const endTime = new Date(b.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const statusClass = b.status === 'confirmed' ? 'badge-confirmed' : b.status === 'checked_in' || b.status === 'in_progress' ? 'badge-paid' : b.status === 'completed' ? 'badge-completed' : 'badge-cancelled';

                  return (
                    <tr key={b._id}>
                      <td>
                        <strong>{startTime} - {endTime}</strong>
                        <span className="text-dim text-xs" style={{ marginLeft: 6 }}>({b.durationMinutes}m)</span>
                      </td>
                      <td>
                        <strong>{b.gameId?.name || b.gameId?.title || 'Game'}</strong>
                        <span className="text-dim text-xs" style={{ marginLeft: 6 }}>📍 {b.resourceId?.name || 'Resource'}</span>
                      </td>
                      <td>
                        <strong>{b.userId?.name || 'Walk-in Guest'}</strong>
                        <span className="text-dim text-xs" style={{ marginLeft: 6 }}>{b.userId?.phone || b.userId?.email}</span>
                      </td>
                      <td>
                        <span className={`badge-compact ${statusClass}`}>
                          {b.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {b.checkedInAt ? (
                          <span className="text-xs text-success">✅ {new Date(b.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        ) : (
                          <span className="text-dim text-xs">Pending</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                          <Link to={`/staff/bookings/${b._id}`} className="btn-action secondary">
                            Details
                          </Link>

                          {b.status === 'confirmed' && (
                            <>
                              <button
                                disabled={actionLoading === b._id}
                                onClick={() => handleStateAction(b._id, 'check-in')}
                                className="btn-action primary"
                              >
                                Check-In
                              </button>
                              <button
                                disabled={actionLoading === b._id}
                                onClick={() => handleStateAction(b._id, 'no-show')}
                                className="btn-action danger-outline"
                              >
                                No-Show
                              </button>
                            </>
                          )}

                          {b.status === 'checked_in' && (
                            <button
                              disabled={actionLoading === b._id}
                              onClick={() => handleStateAction(b._id, 'start')}
                              className="btn-action primary"
                            >
                              Start
                            </button>
                          )}

                          {b.status === 'in_progress' && (
                            <button
                              disabled={actionLoading === b._id}
                              onClick={() => handleStateAction(b._id, 'complete')}
                              className="btn-action success"
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

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={bookings.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </>
      )}
    </div>
  );
};

