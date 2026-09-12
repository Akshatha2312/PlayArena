import React, { useState, useEffect } from 'react';
import { staffService } from '../../services/staffService';
import { gameService } from '../../services/gameService';
import { LoadingState, ErrorState } from '../../components/StateComponents';
import { StaffWalkInModal } from './StaffWalkInModal';

import { socketService } from '../../services/socketService';

export const StaffDashboardPage = () => {
  const [summary, setSummary] = useState(null);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showWalkInModal, setShowWalkInModal] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [sumRes, gamesRes] = await Promise.all([
        staffService.getDashboardSummary(),
        gameService.getGames(),
      ]);

      setSummary(sumRes.data);
      setGames(gamesRes.data?.games || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load staff dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();

    // Socket subscription for real-time operational schedule updates
    socketService.connect();
    const unsubscribe = socketService.subscribe('schedule:updated', () => {
      fetchDashboard();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (loading) return <LoadingState message="Loading Operations Dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={fetchDashboard} />;

  const { counts, resourceOccupancy, date } = summary;

  return (
    <div className="staff-page-container">
      <div className="staff-header-actions">
        <div>
          <h1 className="staff-title">⚡ Operations Control</h1>
          <p className="staff-subtitle">Live Overview for {date}</p>
        </div>
        <button
          className="btn-staff-primary"
          onClick={() => setShowWalkInModal(true)}
        >
          ➕ Quick Walk-In
        </button>
      </div>

      {/* Operations Metric Badges */}
      <div className="staff-metrics-grid">
        <div className="metric-card metric-total">
          <span className="metric-num">{counts.totalToday}</span>
          <span className="metric-label">Today Total</span>
        </div>
        <div className="metric-card metric-upcoming">
          <span className="metric-num">{counts.upcoming}</span>
          <span className="metric-label">Upcoming</span>
        </div>
        <div className="metric-card metric-checkedin">
          <span className="metric-num">{counts.checkedIn}</span>
          <span className="metric-label">Checked In</span>
        </div>
        <div className="metric-card metric-inprogress">
          <span className="metric-num">{counts.inProgress}</span>
          <span className="metric-label">In Progress</span>
        </div>
        <div className="metric-card metric-completed">
          <span className="metric-num">{counts.completed}</span>
          <span className="metric-label">Completed</span>
        </div>
        <div className="metric-card metric-noshow">
          <span className="metric-num">{counts.noShow}</span>
          <span className="metric-label">No Shows</span>
        </div>
      </div>

      {/* Resource Occupancy Monitor */}
      <div className="staff-section">
        <h2 className="section-heading">🏟️ Live Resource Occupancy</h2>
        <div className="resource-grid">
          {resourceOccupancy.map((res) => (
            <div key={res._id} className={`resource-card occupancy-${res.occupancyState}`}>
              <div className="res-card-header">
                <h3>{res.name}</h3>
                <span className={`status-pill pill-${res.occupancyState}`}>
                  {res.occupancyState.toUpperCase()}
                </span>
              </div>
              <p className="res-game-title">{res.gameTitle}</p>
              <div className="res-card-footer">
                <span className="res-state-text">
                  {res.occupancyState === 'occupied'
                    ? '🔴 Session Active'
                    : res.occupancyState === 'available'
                    ? '🟢 Ready for Play'
                    : '🟡 Maintenance'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Walk-In Modal */}
      {showWalkInModal && (
        <StaffWalkInModal
          games={games}
          onClose={() => setShowWalkInModal(false)}
          onSuccess={() => {
            setShowWalkInModal(false);
            fetchDashboard();
          }}
        />
      )}
    </div>
  );
};
