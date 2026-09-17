import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { notificationService } from '../services/notificationService';
import { Pagination } from '../components/Pagination';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [actionLoading, setActionLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);

  const fetchNotifications = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, limit: 15 };
      if (filter === 'unread') {
        params.isRead = 'false';
      }
      const response = await notificationService.getNotifications(params);
      if (response && response.data) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unreadCount || 0);
        setPagination(response.pagination || { page: 1, totalPages: 1, total: response.data.notifications?.length || 0 });
      }
    } catch (err) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchNotifications(1);
  }, [filter]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchNotifications(newPage);
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setActionLoading(true);
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'booking_confirmed':
        return <span className="badge-compact badge-confirmed">CONFIRMED</span>;
      case 'payment_success':
        return <span className="badge-compact badge-paid">PAYMENT</span>;
      case 'booking_cancelled':
        return <span className="badge-compact badge-cancelled">CANCELLED</span>;
      case 'booking_reminder':
        return <span className="badge-compact badge-pending">REMINDER</span>;
      default:
        return <span className="badge-compact" style={{ background: 'rgba(100,116,139,0.2)', color: '#94a3b8' }}>INFO</span>;
    }
  };

  return (
    <div className="container page-container">
      <div className="compact-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h1 className="page-title">NOTIFICATIONS</h1>
          <p className="page-subtitle">Stay updated with your court bookings, payments, and system updates.</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={actionLoading}
            className="btn btn-primary btn-sm"
          >
            {actionLoading ? 'Updating...' : 'Mark All as Read'}
          </button>
        )}
      </div>

      {/* Filter Tabs Toolbar */}
      <div className="compact-toolbar">
        <div className="compact-toolbar-left">
          <button
            onClick={() => setFilter('all')}
            className={`tab-btn ${filter === 'all' ? 'active' : ''}`}
          >
            All Notifications
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`tab-btn ${filter === 'unread' ? 'active' : ''}`}
          >
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
          <p>Loading notifications...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div style={{ backgroundColor: '#450a0a', border: '1px solid #991b1b', color: '#fca5a5', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
          <p style={{ margin: 0 }}>{error}</p>
          <button
            onClick={() => fetchNotifications(currentPage)}
            style={{ marginTop: '8px', backgroundColor: '#991b1b', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && notifications.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 16px', backgroundColor: '#12141a', borderRadius: '8px', border: '1px solid #262936' }}>
          <h3 style={{ color: '#e2e8f0', marginBottom: '4px' }}>No notifications found</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
            {filter === 'unread' ? "You don't have any unread notifications." : "You don't have any notifications right now."}
          </p>
        </div>
      )}

      {/* Compact Notification Item Rows */}
      {!loading && !error && notifications.length > 0 && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {notifications.map((item) => (
              <div
                key={item._id}
                style={{
                  backgroundColor: item.isRead ? '#12141a' : '#181b24',
                  border: item.isRead ? '1px solid #262936' : '1px solid #00e5ff',
                  borderRadius: '6px',
                  padding: '0.65rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: '240px' }}>
                  {!item.isRead && (
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#00e5ff', shrink: 0 }} />
                  )}
                  {getTypeBadge(item.type)}
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.85rem', color: item.isRead ? '#e2e8f0' : '#ffffff', fontWeight: 600 }}>
                      {item.title}
                    </h4>
                    <p style={{ margin: '2px 0 0 0', color: '#9ca3af', fontSize: '0.8rem' }}>
                      {item.message}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', shrink: 0 }}>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  {item.relatedBookingId && (
                    <Link
                      to={`/my-bookings/${item.relatedBookingId._id || item.relatedBookingId}`}
                      className="btn-text-action"
                      style={{ fontSize: '0.78rem' }}
                    >
                      View →
                    </Link>
                  )}

                  {!item.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(item._id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#00e5ff',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Pagination
            currentPage={pagination.page || currentPage}
            totalPages={pagination.totalPages || 1}
            totalItems={pagination.total}
            itemsPerPage={15}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
};

export default NotificationsPage;

