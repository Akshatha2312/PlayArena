import React, { useState, useEffect } from 'react';
import { analyticsService } from '../../services/analyticsService';
import { LoadingState, ErrorState, EmptyState } from '../../components/StateComponents';
import './AdminAnalyticsPage.css';

export const AdminAnalyticsPage = () => {
  const [preset, setPreset] = useState('last30days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Data states
  const [overview, setOverview] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [bookingData, setBookingData] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [resourceData, setResourceData] = useState(null);
  const [customerData, setCustomerData] = useState(null);

  // Pagination & Sort states for tables
  const [gamePage, setGamePage] = useState(1);
  const [gameSortBy, setGameSortBy] = useState('totalBookings');
  const [gameSortOrder, setGameSortOrder] = useState('desc');
  const [gameSearch, setGameSearch] = useState('');

  const [resourcePage, setResourcePage] = useState(1);
  const [resourceSortBy, setResourceSortBy] = useState('totalBookings');
  const [resourceSortOrder, setResourceSortOrder] = useState('desc');

  const fetchAllAnalytics = async () => {
    try {
      setLoading(true);
      setError('');

      const queryParams = { preset };
      if (preset === 'custom') {
        if (!startDate || !endDate) {
          setError('Please specify both start and end dates for custom date range');
          setLoading(false);
          return;
        }
        queryParams.startDate = startDate;
        queryParams.endDate = endDate;
      }

      const [ovRes, revRes, bkRes, gmRes, rsRes, csRes] = await Promise.all([
        analyticsService.getOverview(queryParams),
        analyticsService.getRevenueAnalytics(queryParams),
        analyticsService.getBookingsAnalytics(queryParams),
        analyticsService.getGameAnalytics({ ...queryParams, page: gamePage, limit: 10, sortBy: gameSortBy, sortOrder: gameSortOrder, search: gameSearch }),
        analyticsService.getResourceAnalytics({ ...queryParams, page: resourcePage, limit: 10, sortBy: resourceSortBy, sortOrder: resourceSortOrder }),
        analyticsService.getCustomerAnalytics(queryParams),
      ]);

      setOverview(ovRes.data);
      setRevenueData(revRes.data);
      setBookingData(bkRes.data);
      setGameData(gmRes.data);
      setResourceData(rsRes.data);
      setCustomerData(csRes.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (preset !== 'custom' || (startDate && endDate)) {
      fetchAllAnalytics();
    }
  }, [preset, gamePage, gameSortBy, gameSortOrder, resourcePage, resourceSortBy, resourceSortOrder]);

  const handleApplyCustomDate = (e) => {
    e.preventDefault();
    if (startDate && endDate) {
      fetchAllAnalytics();
    }
  };

  if (loading && !overview) return <LoadingState message="Calculating Play Arena business analytics..." />;
  if (error && !overview) return <ErrorState message={error} onRetry={fetchAllAnalytics} />;

  const { bookings = {}, revenue = {}, catalog = {}, averages = {} } = overview || {};

  return (
    <div className="admin-page-container analytics-page">
      {/* Header & Date Range Control Bar */}
      <div className="analytics-header">
        <div>
          <h1 className="admin-title">📈 Business Analytics & Operations Reporting</h1>
          <p className="admin-subtitle">Fact-based metrics calculated directly from MongoDB core records</p>
        </div>

        <div className="analytics-controls">
          <div className="preset-selector">
            <label htmlFor="preset-select">Date Range:</label>
            <select
              id="preset-select"
              value={preset}
              onChange={(e) => {
                setPreset(e.target.value);
                setGamePage(1);
                setResourcePage(1);
              }}
              className="analytics-select"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="previousMonth">Previous Month</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {preset === 'custom' && (
            <form onSubmit={handleApplyCustomDate} className="custom-date-form">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="analytics-date-input"
                required
              />
              <span className="date-sep">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="analytics-date-input"
                required
              />
              <button type="submit" className="btn-admin-primary">Apply</button>
            </form>
          )}

          <button onClick={fetchAllAnalytics} className="btn-admin-secondary" title="Refresh Data">
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && <div className="analytics-error-banner">⚠️ {error}</div>}

      {/* KPI Overview Cards */}
      <div className="admin-metrics-grid analytics-kpi-grid">
        <div className="admin-card metric-revenue">
          <span className="metric-icon">💰</span>
          <span className="metric-num">₹{revenue.totalRevenue || 0}</span>
          <span className="metric-label">Verified Revenue ({revenue.successfulPaymentsCount || 0} Paid Tx)</span>
        </div>

        <div className="admin-card metric-bookings">
          <span className="metric-icon">📅</span>
          <span className="metric-num">{bookings.totalBookings || 0}</span>
          <span className="metric-label">Total Bookings ({bookings.completed || 0} Completed)</span>
        </div>

        <div className="admin-card metric-cancellation">
          <span className="metric-icon">⚠️</span>
          <span className="metric-num">{bookings.cancellationRate || 0}%</span>
          <span className="metric-label">Cancellation Rate ({bookings.cancelled || 0} Cancelled)</span>
        </div>

        <div className="admin-card metric-customers">
          <span className="metric-icon">👥</span>
          <span className="metric-num">{catalog.activeCustomers || 0}</span>
          <span className="metric-label">Registered Customers</span>
        </div>

        <div className="admin-card metric-value">
          <span className="metric-icon">🏷️</span>
          <span className="metric-num">₹{averages.avgBookingValue || 0}</span>
          <span className="metric-label">Avg Booking Value ({averages.avgBookingDuration || 0} mins avg)</span>
        </div>
      </div>

      {/* Analytics Tabs Navigation */}
      <div className="analytics-tabs-bar">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Performance Overview
        </button>
        <button
          className={`tab-btn ${activeTab === 'revenue' ? 'active' : ''}`}
          onClick={() => setActiveTab('revenue')}
        >
          💳 Revenue Analysis
        </button>
        <button
          className={`tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          📅 Booking Trends
        </button>
        <button
          className={`tab-btn ${activeTab === 'games' ? 'active' : ''}`}
          onClick={() => setActiveTab('games')}
        >
          🎮 Game Performance
        </button>
        <button
          className={`tab-btn ${activeTab === 'resources' ? 'active' : ''}`}
          onClick={() => setActiveTab('resources')}
        >
          🏟️ Resource Utilization
        </button>
        <button
          className={`tab-btn ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => setActiveTab('customers')}
        >
          ⏰ Busiest Hours & Customers
        </button>
      </div>

      {/* Tab 1: Performance Overview */}
      {activeTab === 'overview' && (
        <div className="tab-content">
          <div className="admin-two-col">
            {/* Booking Status Breakdown Chart/Progress Bar */}
            <div className="admin-card">
              <h3>📊 Booking Status Breakdown</h3>
              <p className="card-subtitle">Distribution of booking statuses in selected period</p>

              {bookings.totalBookings === 0 ? (
                <EmptyState title="No Bookings Data" message="No booking records found for the selected date range." />
              ) : (
                <div className="status-breakdown-container">
                  <div className="status-bar-wrapper">
                    <div className="status-segment confirmed" style={{ width: `${(bookings.confirmed / bookings.totalBookings) * 100}%` }} title={`Confirmed: ${bookings.confirmed}`} />
                    <div className="status-segment checked_in" style={{ width: `${(bookings.checkedIn / bookings.totalBookings) * 100}%` }} title={`Checked In: ${bookings.checkedIn}`} />
                    <div className="status-segment in_progress" style={{ width: `${(bookings.inProgress / bookings.totalBookings) * 100}%` }} title={`In Progress: ${bookings.inProgress}`} />
                    <div className="status-segment completed" style={{ width: `${(bookings.completed / bookings.totalBookings) * 100}%` }} title={`Completed: ${bookings.completed}`} />
                    <div className="status-segment cancelled" style={{ width: `${(bookings.cancelled / bookings.totalBookings) * 100}%` }} title={`Cancelled: ${bookings.cancelled}`} />
                    <div className="status-segment no_show" style={{ width: `${(bookings.noShow / bookings.totalBookings) * 100}%` }} title={`No Show: ${bookings.noShow}`} />
                  </div>

                  <div className="status-legend-grid">
                    <div className="legend-item"><span className="legend-dot confirmed" /> Confirmed: <strong>{bookings.confirmed}</strong></div>
                    <div className="legend-item"><span className="legend-dot checked_in" /> Checked In: <strong>{bookings.checkedIn}</strong></div>
                    <div className="legend-item"><span className="legend-dot in_progress" /> In Progress: <strong>{bookings.inProgress}</strong></div>
                    <div className="legend-item"><span className="legend-dot completed" /> Completed: <strong>{bookings.completed}</strong></div>
                    <div className="legend-item"><span className="legend-dot cancelled" /> Cancelled: <strong>{bookings.cancelled} ({bookings.cancellationRate}%)</strong></div>
                    <div className="legend-item"><span className="legend-dot no_show" /> No Show: <strong>{bookings.noShow} ({bookings.noShowRate}%)</strong></div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Revenue Summary */}
            <div className="admin-card">
              <h3>💰 Revenue Snapshot</h3>
              <p className="card-subtitle">Verified payment processing performance</p>

              <div className="snapshot-stats-list">
                <div className="snapshot-stat-row">
                  <span>Verified Total Revenue:</span>
                  <strong>₹{revenue.totalRevenue || 0}</strong>
                </div>
                <div className="snapshot-stat-row">
                  <span>Successful Transactions:</span>
                  <strong>{revenue.successfulPaymentsCount || 0}</strong>
                </div>
                <div className="snapshot-stat-row">
                  <span>Average Transaction Value:</span>
                  <strong>₹{revenue.avgTransactionValue || 0}</strong>
                </div>
                <div className="snapshot-stat-row">
                  <span>Catalog Active Games:</span>
                  <strong>{catalog.activeGames || 0}</strong>
                </div>
                <div className="snapshot-stat-row">
                  <span>Operational Resources:</span>
                  <strong>{catalog.activeResources || 0}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Revenue Analysis */}
      {activeTab === 'revenue' && (
        <div className="tab-content">
          <div className="admin-card">
            <h3>💰 Revenue Trend ({revenueData?.dateRange?.groupBy} aggregation)</h3>
            <p className="card-subtitle">Verified backend payment amounts over time</p>

            {(!revenueData?.trend || revenueData.trend.length === 0) ? (
              <EmptyState title="No Payment Trends" message="No payment transactions found in selected date range." />
            ) : (
              <div className="chart-wrapper">
                <div className="trend-bar-chart">
                  {revenueData.trend.map((point) => {
                    const maxRev = Math.max(...revenueData.trend.map((p) => p.totalRevenue), 1);
                    const heightPct = Math.max(5, (point.totalRevenue / maxRev) * 100);

                    return (
                      <div key={point.date} className="chart-bar-column" title={`${point.date}: ₹${point.totalRevenue} (${point.successfulCount} paid tx)`}>
                        <span className="bar-val">₹{point.totalRevenue}</span>
                        <div className="bar-fill revenue-fill" style={{ height: `${heightPct}%` }} />
                        <span className="bar-label">{point.date}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="trend-summary-footer">
              <div>Total Revenue: <strong>₹{revenueData?.summary?.totalRevenue || 0}</strong></div>
              <div>Successful Payments: <strong>{revenueData?.summary?.successfulCount || 0}</strong></div>
              <div>Failed/Cancelled Payments: <strong>{(revenueData?.summary?.failedCount || 0) + (revenueData?.summary?.cancelledCount || 0)}</strong></div>
              <div>Average Transaction: <strong>₹{revenueData?.summary?.avgTransactionValue || 0}</strong></div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Booking Trends */}
      {activeTab === 'bookings' && (
        <div className="tab-content">
          <div className="admin-card">
            <h3>📅 Booking Trends Over Time</h3>
            <p className="card-subtitle">Volume of bookings grouped by {bookingData?.dateRange?.groupBy}</p>

            {(!bookingData?.trend || bookingData.trend.length === 0) ? (
              <EmptyState title="No Booking Trends" message="No bookings recorded for this date range." />
            ) : (
              <div className="chart-wrapper">
                <div className="trend-bar-chart">
                  {bookingData.trend.map((point) => {
                    const maxBk = Math.max(...bookingData.trend.map((p) => p.totalBookings), 1);
                    const heightPct = Math.max(5, (point.totalBookings / maxBk) * 100);

                    return (
                      <div key={point.date} className="chart-bar-column" title={`${point.date}: ${point.totalBookings} total bookings (${point.completed} completed)`}>
                        <span className="bar-val">{point.totalBookings}</span>
                        <div className="bar-fill booking-fill" style={{ height: `${heightPct}%` }} />
                        <span className="bar-label">{point.date}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Game Performance */}
      {activeTab === 'games' && (
        <div className="tab-content">
          <div className="admin-card">
            <div className="table-header-actions">
              <div>
                <h3>🎮 Game Performance Breakdown</h3>
                <p className="card-subtitle">Booking counts, duration, and attributable revenue per game</p>
              </div>

              <div className="table-filter-group">
                <input
                  type="text"
                  placeholder="Search game..."
                  value={gameSearch}
                  onChange={(e) => setGameSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchAllAnalytics()}
                  className="analytics-search-input"
                />

                <select
                  value={gameSortBy}
                  onChange={(e) => setGameSortBy(e.target.value)}
                  className="analytics-select"
                >
                  <option value="totalBookings">Sort by Total Bookings</option>
                  <option value="totalRevenue">Sort by Total Revenue</option>
                  <option value="completedBookings">Sort by Completed Sessions</option>
                  <option value="totalDurationMinutes">Sort by Duration</option>
                  <option value="name">Sort by Name</option>
                </select>

                <select
                  value={gameSortOrder}
                  onChange={(e) => setGameSortOrder(e.target.value)}
                  className="analytics-select"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>

            {(!gameData?.games || gameData.games.length === 0) ? (
              <EmptyState title="No Game Records Found" message="No games matched the criteria." />
            ) : (
              <table className="admin-compact-table analytics-table">
                <thead>
                  <tr>
                    <th>Game Name</th>
                    <th>Category</th>
                    <th>Base Price/Hr</th>
                    <th>Bookings</th>
                    <th>Completed</th>
                    <th>Cancelled</th>
                    <th>Total Booked Duration</th>
                    <th>Attributable Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {gameData.games.map((g) => (
                    <tr key={g._id}>
                      <td><strong>{g.name}</strong></td>
                      <td><span className="category-tag">{g.category}</span></td>
                      <td>₹{g.basePricePerHour}</td>
                      <td>{g.totalBookings}</td>
                      <td>{g.completedBookings}</td>
                      <td>{g.cancelledBookings}</td>
                      <td>{g.totalDurationMinutes} mins</td>
                      <td><strong>₹{g.totalRevenue}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Pagination Controls */}
            {gameData?.pagination && gameData.pagination.totalPages > 1 && (
              <div className="pagination-bar">
                <button
                  disabled={gamePage <= 1}
                  onClick={() => setGamePage((p) => Math.max(1, p - 1))}
                  className="btn-admin-secondary"
                >
                  ← Previous
                </button>
                <span>Page {gameData.pagination.page} of {gameData.pagination.totalPages}</span>
                <button
                  disabled={gamePage >= gameData.pagination.totalPages}
                  onClick={() => setGamePage((p) => p + 1)}
                  className="btn-admin-secondary"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Resource Utilization */}
      {activeTab === 'resources' && (
        <div className="tab-content">
          <div className="admin-card">
            <div className="table-header-actions">
              <div>
                <h3>🏟️ Resource Utilization Analysis</h3>
                <p className="card-subtitle">Booked hours, sessions, and status per inventory resource</p>
              </div>

              <div className="table-filter-group">
                <select
                  value={resourceSortBy}
                  onChange={(e) => setResourceSortBy(e.target.value)}
                  className="analytics-select"
                >
                  <option value="totalBookings">Sort by Bookings</option>
                  <option value="completedBookings">Sort by Completed</option>
                  <option value="totalBookedMinutes">Sort by Booked Minutes</option>
                  <option value="totalRevenue">Sort by Revenue</option>
                  <option value="name">Sort by Name</option>
                </select>

                <select
                  value={resourceSortOrder}
                  onChange={(e) => setResourceSortOrder(e.target.value)}
                  className="analytics-select"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>

            {(!resourceData?.resources || resourceData.resources.length === 0) ? (
              <EmptyState title="No Resource Records" message="No resource utilization records found." />
            ) : (
              <table className="admin-compact-table analytics-table">
                <thead>
                  <tr>
                    <th>Resource Name</th>
                    <th>Game</th>
                    <th>Status</th>
                    <th>Bookings</th>
                    <th>Completed</th>
                    <th>Booked Hours</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {resourceData.resources.map((r) => (
                    <tr key={r._id}>
                      <td>
                        <strong>{r.name}</strong> {r.code && <span className="code-tag">({r.code})</span>}
                      </td>
                      <td>{r.gameName}</td>
                      <td><span className={`status-pill pill-${r.status}`}>{r.status}</span></td>
                      <td>{r.totalBookings}</td>
                      <td>{r.completedBookings}</td>
                      <td>{r.bookedHours} hrs</td>
                      <td><strong>₹{r.totalRevenue}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {resourceData?.pagination && resourceData.pagination.totalPages > 1 && (
              <div className="pagination-bar">
                <button
                  disabled={resourcePage <= 1}
                  onClick={() => setResourcePage((p) => Math.max(1, p - 1))}
                  className="btn-admin-secondary"
                >
                  ← Previous
                </button>
                <span>Page {resourceData.pagination.page} of {resourceData.pagination.totalPages}</span>
                <button
                  disabled={resourcePage >= resourceData.pagination.totalPages}
                  onClick={() => setResourcePage((p) => p + 1)}
                  className="btn-admin-secondary"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 6: Customer Intelligence & Busiest Hours */}
      {activeTab === 'customers' && (
        <div className="tab-content">
          <div className="admin-two-col">
            {/* Peak Booking Hours Distribution */}
            <div className="admin-card">
              <h3>⏰ Busiest Period (Peak Booking Hours UTC)</h3>
              <p className="card-subtitle">Distribution of booking start times across 24 hours</p>

              {(!customerData?.hourlyDistribution) ? (
                <EmptyState title="No Peak Hours Data" message="No hourly booking data available." />
              ) : (
                <div className="hourly-chart-container">
                  {customerData.hourlyDistribution.map((h) => {
                    const maxH = Math.max(...customerData.hourlyDistribution.map((item) => item.bookingCount), 1);
                    const heightPct = Math.max(4, (h.bookingCount / maxH) * 100);

                    return (
                      <div key={h.hour} className="hourly-column" title={`Hour ${h.hourLabel}: ${h.bookingCount} bookings`}>
                        <div className="hourly-bar" style={{ height: `${heightPct}%` }} />
                        <span className="hourly-label">{h.hour % 3 === 0 ? `${h.hour}h` : ''}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Customer Engagement Summary */}
            <div className="admin-card">
              <h3>👥 Customer Intelligence Metrics</h3>
              <p className="card-subtitle">Aggregated customer registration & booking metrics</p>

              <div className="snapshot-stats-list">
                <div className="snapshot-stat-row">
                  <span>Total Registered Customers:</span>
                  <strong>{customerData?.summary?.totalCustomers || 0}</strong>
                </div>
                <div className="snapshot-stat-row">
                  <span>New Registrations (In Period):</span>
                  <strong>{customerData?.summary?.newCustomers || 0}</strong>
                </div>
                <div className="snapshot-stat-row">
                  <span>Active Booking Customers:</span>
                  <strong>{customerData?.summary?.activeBookingCustomers || 0}</strong>
                </div>
                <div className="snapshot-stat-row">
                  <span>Repeat Customers (≥ 2 sessions):</span>
                  <strong>{customerData?.summary?.repeatCustomers || 0}</strong>
                </div>
                <div className="snapshot-stat-row">
                  <span>Avg Bookings Per Active Customer:</span>
                  <strong>{customerData?.summary?.avgBookingsPerActiveCustomer || 0}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
