import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { staffService } from '../../services/staffService';
import { LoadingState } from '../../components/StateComponents';

export const StaffCheckInPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      setLoading(true);
      setError('');
      setActionMessage('');
      const res = await staffService.lookupBooking(query.trim());
      setResults(res.data?.bookings || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Lookup failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (bookingId) => {
    try {
      setLoading(true);
      const res = await staffService.checkInBooking(bookingId);
      setActionMessage(`Booking ${res.data.booking._id} checked in successfully!`);
      // Refresh lookup
      const lookupRes = await staffService.lookupBooking(query.trim());
      setResults(lookupRes.data?.bookings || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="staff-page-container">
      <div className="staff-header">
        <h1 className="staff-title">🔍 Customer Check-In Lookup</h1>
        <p className="staff-subtitle">Enter Booking Reference ID, Customer Email, or Phone Number</p>
      </div>

      <div className="lookup-search-card">
        <form onSubmit={handleSearch} className="lookup-form">
          <input
            type="text"
            placeholder="e.g. 64b8f0... or customer@email.com or 9876543210"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="lookup-input"
            required
          />
          <button type="submit" className="btn-staff-primary" disabled={loading}>
            {loading ? 'Searching...' : 'Search Booking'}
          </button>
        </form>
      </div>

      {actionMessage && <div className="success-banner">{actionMessage}</div>}
      {error && <div className="error-banner">{error}</div>}

      {loading && <LoadingState message="Searching bookings..." />}

      {results !== null && !loading && (
        <div className="lookup-results-section">
          <h3>Search Results ({results.length})</h3>
          {results.length === 0 ? (
            <p className="no-results">No matching bookings found for "{query}".</p>
          ) : (
            <div className="lookup-cards-grid">
              {results.map((b) => {
                const startTime = new Date(b.startAt).toLocaleString();
                return (
                  <div key={b._id} className="lookup-card">
                    <div className="lookup-card-header">
                      <span className="booking-ref">ID: {b._id}</span>
                      <span className={`status-pill pill-${b.status}`}>
                        {b.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    <div className="lookup-card-body">
                      <p><strong>Customer:</strong> {b.userId?.name || 'Walk-in Guest'}</p>
                      <p><strong>Email/Phone:</strong> {b.userId?.email} {b.userId?.phone ? `| ${b.userId.phone}` : ''}</p>
                      <p><strong>Game:</strong> {b.gameId?.title}</p>
                      <p><strong>Resource:</strong> {b.resourceId?.name}</p>
                      <p><strong>Slot:</strong> {startTime} ({b.durationMinutes} mins)</p>
                    </div>

                    <div className="lookup-card-actions">
                      <Link to={`/staff/bookings/${b._id}`} className="btn-secondary">
                        View Details
                      </Link>
                      {b.status === 'confirmed' && (
                        <button
                          className="btn-staff-primary"
                          onClick={() => handleCheckIn(b._id)}
                        >
                          Check In Customer
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
