import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { LoadingState, ErrorState } from '../../components/StateComponents';

export const AdminDashboardPage = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await adminService.getDashboardSummary();
      setSummary(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load admin dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) return <LoadingState message="Loading Control Center Dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={fetchDashboard} />;

  const { metrics, recentBookings, recentPayments, date } = summary;

  return (
    <div className="admin-page-container">
      <div className="admin-header-actions">
        <div>
          <h1 className="admin-title">👑 Executive Control Dashboard</h1>
          <p className="admin-subtitle">Live Overview for {date}</p>
        </div>
        <button className="btn-admin-secondary" onClick={fetchDashboard}>
          🔄 Refresh Metrics
        </button>
      </div>

      {/* Top Business Metrics */}
      <div className="admin-metrics-grid">
        <div className="admin-card metric-revenue">
          <span className="metric-icon">💰</span>
          <span className="metric-num">₹{metrics.todaysRevenue}</span>
          <span className="metric-label">Today's Revenue</span>
        </div>
        <div className="admin-card metric-games">
          <span className="metric-icon">🎮</span>
          <span className="metric-num">{metrics.activeGamesCount}</span>
          <span className="metric-label">Active Catalog Games</span>
        </div>
        <div className="admin-card metric-resources">
          <span className="metric-icon">🏟️</span>
          <span className="metric-num">{metrics.activeResourcesCount} / {metrics.totalResourcesCount}</span>
          <span className="metric-label">Available Resources</span>
        </div>
        <div className="admin-card metric-bookings">
          <span className="metric-icon">📅</span>
          <span className="metric-num">{metrics.bookingCounts.totalToday}</span>
          <span className="metric-label">Today's Total Bookings</span>
        </div>
      </div>

      {/* Booking Status Breakdown */}
      <div className="admin-section">
        <h2 className="admin-section-heading">📊 Today's Booking Lifecycle Breakdown</h2>
        <div className="status-breakdown-bar">
          <div className="breakdown-item pill-confirmed">Confirmed: {metrics.bookingCounts.confirmed}</div>
          <div className="breakdown-item pill-checked_in">Checked In: {metrics.bookingCounts.checkedIn}</div>
          <div className="breakdown-item pill-in_progress">In Progress: {metrics.bookingCounts.inProgress}</div>
          <div className="breakdown-item pill-completed">Completed: {metrics.bookingCounts.completed}</div>
          <div className="breakdown-item pill-cancelled">Cancelled: {metrics.bookingCounts.cancelled}</div>
          <div className="breakdown-item pill-no_show">No Show: {metrics.bookingCounts.noShow}</div>
        </div>
      </div>

      {/* Recent Activity Grids */}
      <div className="admin-two-col">
        {/* Recent Bookings */}
        <div className="admin-card">
          <div className="card-header-flex">
            <h2>📅 Recent Bookings</h2>
            <Link to="/admin/bookings" className="link-action">View All →</Link>
          </div>
          <table className="admin-compact-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Game</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((b) => (
                <tr key={b._id}>
                  <td>{b.userId?.name || 'Walk-in'}</td>
                  <td>{b.gameId?.title || 'Game'}</td>
                  <td>₹{b.totalAmount}</td>
                  <td>
                    <span className={`status-pill pill-${b.status}`}>{b.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recent Payments */}
        <div className="admin-card">
          <div className="card-header-flex">
            <h2>💳 Recent Transactions</h2>
            <Link to="/admin/payments" className="link-action">View All →</Link>
          </div>
          <table className="admin-compact-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Amount</th>
                <th>Provider</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.map((p) => (
                <tr key={p._id}>
                  <td>{p.userId?.name || 'Customer'}</td>
                  <td>₹{p.amount} {p.currency}</td>
                  <td>{p.provider}</td>
                  <td>
                    <span className={`status-pill pill-${p.status}`}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
