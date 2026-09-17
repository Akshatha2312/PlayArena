import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { waitlistService } from '../services/waitlistService';
import { LoadingState, ErrorState, EmptyState } from '../components/StateComponents';
import { Pagination } from '../components/Pagination';
import './MyWaitlistPage.css';

export const MyWaitlistPage = () => {
  const [waitlists, setWaitlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const totalPages = Math.ceil(waitlists.length / itemsPerPage) || 1;
  const paginatedWaitlists = waitlists.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="container page-container page-my-waitlist">
      <div className="compact-page-header">
        <h1 className="page-title">My Waitlists</h1>
        <p className="page-subtitle">Track requested court time slots and availability notifications.</p>
      </div>

      {/* Filter Toolbar */}
      <div className="compact-toolbar">
        <div className="compact-toolbar-left">
          {['all', 'waiting', 'notified', 'cancelled'].map((st) => (
            <button
              key={st}
              className={`filter-btn ${statusFilter === st ? 'active' : ''}`}
              onClick={() => { setStatusFilter(st); setCurrentPage(1); }}
            >
              {st.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {waitlists.length === 0 ? (
        <EmptyState
          title="No Waitlist Entries"
          message="You have no waitlist requests matching the selected filter."
          actionLink="/games"
          actionText="Explore Games Catalog"
        />
      ) : (
        <>
          <div className="waitlist-list-dense">
            {paginatedWaitlists.map((entry) => {
              const gameName = entry.gameId?.name || 'Game';
              const resourceName = entry.resourceId?.name || 'Resource';
              const resourceCode = entry.resourceId?.code ? ` (${entry.resourceId.code})` : '';
              const startDate = new Date(entry.startAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
              const startTime = new Date(entry.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const endTime = new Date(entry.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const isCanLeave = entry.status === 'waiting' || entry.status === 'notified';
              const statusClass = entry.status === 'notified' ? 'badge-confirmed' : entry.status === 'cancelled' ? 'badge-cancelled' : 'badge-pending';

              return (
                <div key={entry._id} className="compact-card-item">
                  <div className="compact-card-header">
                    <div>
                      <strong className="game-name">{gameName}</strong>
                      <span className="text-dim text-xs" style={{ marginLeft: 8 }}>
                        {resourceName}{resourceCode}
                      </span>
                    </div>
                    <span className={`badge-compact ${statusClass}`}>
                      {entry.status === 'notified' ? '🔔 Slot Available!' : entry.status}
                    </span>
                  </div>
                  <div className="compact-card-meta">
                    <span>📅 {startDate}</span>
                    <span>⏰ {startTime} - {endTime} ({entry.durationMinutes}m)</span>
                    <span className="text-dim">Joined: {new Date(entry.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="compact-card-actions">
                    {entry.status === 'notified' && (
                      <Link to="/games" className="btn-action primary">
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

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={waitlists.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </>
      )}
    </div>
  );
};


