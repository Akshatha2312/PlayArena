import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { bookingService } from '../services/bookingService';
import { LoadingState, ErrorState, EmptyState } from '../components/StateComponents';
import { Pagination } from '../components/Pagination';
import { Calendar, Clock, ArrowRight, Tag } from 'lucide-react';
import './MyBookingsPage.css';

export const MyBookingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
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
      <div className="bookings-header">
        <div>
          <h1 className="page-title">MY RESERVATIONS</h1>
          <p className="page-subtitle">View and manage your Play Arena court bookings and payment receipts.</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="status-tabs">
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
          <div className="bookings-list">
            {bookings.map((b) => {
              const bId = b._id || b.id;
              const startDate = new Date(b.startAt);
              return (
                <div key={bId} className="booking-card-item">
                  <div className="booking-main-info">
                    <div className="booking-title-group">
                      <span className={`badge badge-${b.status === 'confirmed' ? 'confirmed' : b.status === 'cancelled' ? 'cancelled' : 'pending'}`}>
                        {b.status}
                      </span>
                      <h3 className="booking-ref-id">Ref #{bId.substring(0, 10)}...</h3>
                    </div>

                    <div className="booking-meta">
                      <span><Calendar className="meta-icon" /> {startDate.toLocaleDateString()}</span>
                      <span><Clock className="meta-icon" /> {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({b.durationMinutes} mins)</span>
                      <span><Tag className="meta-icon" /> ₹{b.totalAmount}</span>
                    </div>
                  </div>

                  <div className="booking-action">
                    <Link to={`/my-bookings/${bId}`} className="btn btn-secondary">
                      View Details <ArrowRight />
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
