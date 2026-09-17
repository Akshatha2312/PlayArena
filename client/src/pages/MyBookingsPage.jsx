import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { bookingService } from '../services/bookingService';
import { LoadingState, ErrorState, EmptyState } from '../components/StateComponents';
import { Pagination } from '../components/Pagination';
import { Calendar, Clock, ChevronRight, Tag } from 'lucide-react';
import './MyBookingsPage.css';

export const MyBookingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const statusFilter = searchParams.get('status') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const query = { page: currentPage, limit: 10 };
    if (statusFilter) {
      query.status = statusFilter;
    }

    bookingService
      .getUserBookings(query)
      .then((res) => {
        setBookings(res.data.bookings || res.data || []);
        setPagination(res.pagination || {});
      })
      .catch((err) => {
        setError(err.message || 'Failed to load bookings');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [statusFilter, currentPage]);

  const handleFilterChange = (status) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    params.set('page', '1');
    setSearchParams(params);
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
  };

  return (
    <div className="container page-container">
      <div className="compact-page-header">
        <h1 className="page-title">MY BOOKINGS</h1>
        <p className="page-subtitle">Manage your arena sessions and view reservation history.</p>
      </div>

      {/* Filter Tabs Toolbar */}
      <div className="compact-toolbar">
        <div className="compact-toolbar-left">
          {['', 'confirmed', 'pending', 'cancelled', 'completed'].map((st) => (
            <button
              key={st}
              className={`tab-btn ${statusFilter === st ? 'active' : ''}`}
              onClick={() => handleFilterChange(st)}
            >
              {st ? st.replace('_', ' ').toUpperCase() : 'ALL BOOKINGS'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading your bookings history..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : bookings.length === 0 ? (
        <EmptyState
          title="No Bookings Found"
          message="You have no court reservations matching the selected filter."
          actionLink="/games"
          actionText="Book an Arena Now"
        />
      ) : (
        <>
          {/* Desktop Compact Table */}
          <div className="dense-table-container dense-table-desktop">
            <table className="dense-table">
              <thead>
                <tr>
                  <th>REF ID</th>
                  <th>GAME / ARENA</th>
                  <th>RESOURCE</th>
                  <th>DATE & TIME</th>
                  <th>STATUS</th>
                  <th>AMOUNT</th>
                  <th style={{ textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const bId = b._id || b.id;
                  const startDate = new Date(b.startAt);
                  const gameName = b.gameName || b.gameId?.name || 'Arena Game';
                  const resourceName = b.resourceName || b.resourceId?.name || 'Court/Station';
                  const statusClass = b.status === 'confirmed' ? 'badge-confirmed' : b.status === 'cancelled' ? 'badge-cancelled' : b.status === 'completed' ? 'badge-completed' : 'badge-pending';
                  
                  return (
                    <tr 
                      key={bId} 
                      className="clickable-row"
                      onClick={() => navigate(`/my-bookings/${bId}`)}
                    >
                      <td>
                        <span className="font-mono text-dim">#{bId.substring(0, 8)}</span>
                      </td>
                      <td>
                        <strong>{gameName}</strong>
                      </td>
                      <td>{resourceName}</td>
                      <td>
                        {startDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} · {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({b.durationMinutes || 60}m)
                      </td>
                      <td>
                        <span className={`badge-compact ${statusClass}`}>
                          {b.status}
                        </span>
                      </td>
                      <td>
                        <strong>₹{b.totalAmount || b.price || 0}</strong>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link 
                          to={`/my-bookings/${bId}`} 
                          className="btn-icon-link"
                          onClick={(e) => e.stopPropagation()}
                          aria-label="View booking details"
                        >
                          <ChevronRight size={18} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Compact Cards */}
          <div className="compact-cards-list">
            {bookings.map((b) => {
              const bId = b._id || b.id;
              const startDate = new Date(b.startAt);
              const gameName = b.gameName || b.gameId?.name || 'Arena Game';
              const resourceName = b.resourceName || b.resourceId?.name || 'Court/Station';
              const statusClass = b.status === 'confirmed' ? 'badge-confirmed' : b.status === 'cancelled' ? 'badge-cancelled' : b.status === 'completed' ? 'badge-completed' : 'badge-pending';

              return (
                <div 
                  key={bId} 
                  className="compact-card-item"
                  onClick={() => navigate(`/my-bookings/${bId}`)}
                >
                  <div className="compact-card-header">
                    <span className="compact-card-title">{gameName} · {resourceName}</span>
                    <span className={`badge-compact ${statusClass}`}>{b.status}</span>
                  </div>
                  <div className="compact-card-meta">
                    <span><Calendar size={13} /> {startDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    <span><Clock size={13} /> {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span><Tag size={13} /> ₹{b.totalAmount || b.price || 0}</span>
                  </div>
                  <div className="compact-card-actions">
                    <span className="text-dim text-xs">Ref #{bId.substring(0, 8)}</span>
                    <Link to={`/my-bookings/${bId}`} className="btn-text-action" onClick={(e) => e.stopPropagation()}>
                      View Details →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            currentPage={pagination.page || currentPage}
            totalPages={pagination.totalPages || 1}
            totalItems={pagination.total}
            itemsPerPage={pagination.limit || 10}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
};

