import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { waitlistService } from '../services/waitlistService';
import { LoadingState, ErrorState, EmptyState } from '../components/StateComponents';
import './MyWaitlistPage.css';

export const MyWaitlistPage = () => {
  const [waitlists, setWaitlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchWaitlists = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await waitlistService.getUserWaitlists({ status: statusFilter });
      setWaitlists(res.data.waitlists || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch waitlist entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWaitlists();
  }, [statusFilter]);

  const handleLeaveWaitlist = async (id) => {
    if (!window.confirm('Are you sure you want to leave this waitlist?')) return;
    try {
      setActionLoadingId(id);
      await waitlistService.leaveWaitlist(id);
      fetchWaitlists();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to leave waitlist');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading && waitlists.length === 0) return <LoadingState message="Loading your waitlist entries..." />;
  if (error && waitlists.length === 0) return <ErrorState message={error} onRetry={fetchWaitlists} />;

  return (
    <div className="container page-container page-my-waitlist">
      <div className="page-header">
        <div>
          <h1 className="page-title">⏳ My Waitlists</h1>
          <p className="page-subtitle">Track requested time slots and notifications</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {['all', 'waiting', 'notified', 'cancelled'].map((st) => (
          <button
            key={st}
            className={`filter-btn ${statusFilter === st ? 'active' : ''}`}
            onClick={() => setStatusFilter(st)}
          >
            {st.charAt(0).toUpperCase() + st.slice(1)}
          </button>
        ))}
      </div>

      {waitlists.length === 0 ? (
        <EmptyState
          title="No Waitlist Entries"
          message="You have no waitlist requests matching the selected filter."
          actionLink="/games"
          actionText="Explore Games Catalog"
        />
      ) : (
        <div className="waitlist-grid">
          {waitlists.map((entry) => {
            const gameName = entry.gameId?.name || 'Game';
            const resourceName = entry.resourceId?.name || 'Resource';
            const resourceCode = entry.resourceId?.code || '';
            const startDate = new Date(entry.startAt).toLocaleDateString();
            const startTime = new Date(entry.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const endTime = new Date(entry.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const isCanLeave = entry.status === 'waiting' || entry.status === 'notified';

            return (
              <div key={entry._id} className={`waitlist-card card-status-${entry.status}`}>
                <div className="waitlist-card-header">
                  <div>
                    <h3 className="game-name">{gameName}</h3>
                    <p className="resource-name">
                      {resourceName} {resourceCode && <span className="resource-code">({resourceCode})</span>}
                    </p>
                  </div>
                  <span className={`status-pill pill-${entry.status}`}>
                    {entry.status === 'notified' ? '🔔 Slot Available!' : entry.status}
                  </span>
                </div>

                <div className="waitlist-details">
                  <div className="detail-row">
                    <span className="detail-label">📅 Date:</span>
                    <strong>{startDate}</strong>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">⏰ Time Slot:</span>
                    <strong>{startTime} - {endTime} ({entry.durationMinutes} mins)</strong>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Joined On:</span>
                    <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {entry.status === 'notified' && (
                  <div className="waitlist-alert">
                    ⚡ Great news! A slot opened up for this time. Go to the game catalog to book your slot now.
                  </div>
                )}

                <div className="waitlist-card-actions">
                  {entry.status === 'notified' && (
                    <Link to={`/games`} className="btn-action primary">
                      Book Now →
                    </Link>
                  )}

                  {isCanLeave && (
                    <button
                      onClick={() => handleLeaveWaitlist(entry._id)}
                      disabled={actionLoadingId === entry._id}
                      className="btn-action danger-outline"
                    >
                      {actionLoadingId === entry._id ? 'Leaving...' : 'Leave Waitlist'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
