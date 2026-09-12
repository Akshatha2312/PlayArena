import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { LoadingState, ErrorState, EmptyState } from '../../components/StateComponents';

export const AdminBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected Booking Detail Modal State
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchBookings = async (page = 1) => {
    try {
      setLoading(true);
      const res = await adminService.getAllBookings({
        page,
        status: statusFilter,
        search,
        date,
      });
      setBookings(res.data?.bookings || []);
      setPagination(res.data?.pagination || { page: 1, totalPages: 1, total: 0 });
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings(1);
  }, [statusFilter, date]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBookings(1);
  };

  const handleOpenDetail = async (id) => {
    try {
      setDetailLoading(true);
      const res = await adminService.getBookingById(id);
      setSelectedBooking(res.data);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to load booking details');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="admin-page-container">
      <div className="admin-header-actions">
        <div>
          <h1 className="admin-title">📅 Master Bookings Registry</h1>
          <p className="admin-subtitle">Inspect historical and active center bookings across all games</p>
        </div>

        <div className="admin-filter-bar">
          <form onSubmit={handleSearchSubmit} className="search-form">
            <input
              type="text"
              placeholder="Booking ID or Customer Name/Email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-input-search"
            />
            <button type="submit" className="btn-admin-secondary">Search</button>
          </form>

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="admin-date-input"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="admin-select"
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked_in">Checked In</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="no_show">No Show</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Fetching master bookings..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchBookings(1)} />
      ) : bookings.length === 0 ? (
        <EmptyState title="No Bookings Found" message="No booking records match the selected filters." />
      ) : (
        <>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Customer</th>
                  <th>Game & Resource</th>
                  <th>Time Slot</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const startTime = new Date(b.startAt).toLocaleString();
                  return (
                    <tr key={b._id}>
                      <td>
                        <span className="font-mono text-dim">#{b._id}</span>
                      </td>
                      <td>
                        <strong>{b.userId?.name || 'Walk-in Guest'}</strong>
                        <div className="sub-text">{b.userId?.email}</div>
                      </td>
                      <td>
                        <div><strong>{b.gameId?.title || b.gameId?.name || 'Game'}</strong></div>
                        <div className="sub-text">📍 {b.resourceId?.name}</div>
                      </td>
                      <td>
                        <div>{startTime}</div>
                        <div className="sub-text">{b.durationMinutes} Mins</div>
                      </td>
                      <td>
                        <strong>₹{b.totalAmount}</strong>
                      </td>
                      <td>
                        <span className={`status-pill pill-${b.status}`}>
                          {b.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn-table-action btn-view"
                          onClick={() => handleOpenDetail(b._id)}
                        >
                          Inspect Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination-bar">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchBookings(pagination.page - 1)}
                className="btn-secondary"
              >
                ← Previous
              </button>
              <span>Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchBookings(pagination.page + 1)}
                className="btn-secondary"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="modal-overlay">
          <div className="modal-card modal-lg">
            <div className="modal-header">
              <h3>🔍 Booking Detail #{selectedBooking.booking._id}</h3>
              <button className="btn-close" onClick={() => setSelectedBooking(null)}>✕</button>
            </div>

            <div className="detail-modal-body">
              <div className="detail-grid-modal">
                <div>
                  <h4>Customer Profile</h4>
                  <p><strong>Name:</strong> {selectedBooking.booking.userId?.name}</p>
                  <p><strong>Email:</strong> {selectedBooking.booking.userId?.email}</p>
                  <p><strong>Phone:</strong> {selectedBooking.booking.userId?.phone || 'N/A'}</p>
                </div>

                <div>
                  <h4>Game & Slot</h4>
                  <p><strong>Game:</strong> {selectedBooking.booking.gameId?.title || selectedBooking.booking.gameId?.name}</p>
                  <p><strong>Resource:</strong> {selectedBooking.booking.resourceId?.name}</p>
                  <p><strong>Start:</strong> {new Date(selectedBooking.booking.startAt).toLocaleString()}</p>
                  <p><strong>End:</strong> {new Date(selectedBooking.booking.endAt).toLocaleString()}</p>
                </div>

                <div>
                  <h4>Financial & Status</h4>
                  <p><strong>Total Amount:</strong> ₹{selectedBooking.booking.totalAmount}</p>
                  <p><strong>Status:</strong> <span className={`status-pill pill-${selectedBooking.booking.status}`}>{selectedBooking.booking.status}</span></p>
                  <p><strong>Payment Status:</strong> {selectedBooking.payment ? selectedBooking.payment.status : 'Pending / None'}</p>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setSelectedBooking(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
