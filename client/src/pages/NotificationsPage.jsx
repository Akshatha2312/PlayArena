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
      const params = { page, limit: 10 };
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
        return <span style={{ backgroundColor: '#0284c7', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>CONFIRMED</span>;
      case 'payment_success':
        return <span style={{ backgroundColor: '#16a34a', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>PAYMENT</span>;
      case 'booking_cancelled':
        return <span style={{ backgroundColor: '#dc2626', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>CANCELLED</span>;
      case 'booking_reminder':
        return <span style={{ backgroundColor: '#d97706', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>REMINDER</span>;
      default:
        return <span style={{ backgroundColor: '#64748b', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>INFO</span>;
    }
  };

  return (
    <div className="container page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#f8fafc' }}>NOTIFICATIONS</h1>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
            Stay updated with your court bookings, payments, and system notifications.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={actionLoading}
            className="btn btn-primary"
          >
            {actionLoading ? 'Updating...' : 'Mark All as Read'}
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', borderBottom: '1px solid #262936', paddingBottom: '12px' }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            background: 'none',
            border: 'none',
            color: filter === 'all' ? '#00e5ff' : '#9ca3af',
            borderBottom: filter === 'all' ? '2px solid #00e5ff' : 'none',
            paddingBottom: '4px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          All Notifications
        </button>
        <button
          onClick={() => setFilter('unread')}
          style={{
            background: 'none',
            border: 'none',
            color: filter === 'unread' ? '#00e5ff' : '#9ca3af',
            borderBottom: filter === 'unread' ? '2px solid #00e5ff' : 'none',
            paddingBottom: '4px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Unread {unreadCount > 0 && `(${unreadCount})`}
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
          <p>Loading notifications...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div style={{ backgroundColor: '#450a0a', border: '1px solid #991b1b', color: '#fca5a5', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
          <p style={{ margin: 0 }}>{error}</p>
          <button
            onClick={() => fetchNotifications(currentPage)}
            style={{ marginTop: '12px', backgroundColor: '#991b1b', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && notifications.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 16px', backgroundColor: '#12141a', borderRadius: '8px', border: '1px solid #262936' }}>
          <h3 style={{ color: '#e2e8f0', marginBottom: '8px' }}>No notifications found</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
            {filter === 'unread' ? "You don't have any unread notifications." : "You don't have any notifications right now."}
          </p>
        </div>
      )}

      {/* Notification List */}
      {!loading && !error && notifications.length > 0 && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {notifications.map((item) => (
              <div
                key={item._id}
                style={{
                  backgroundColor: item.isRead ? '#12141a' : '#1a1d26',
                  border: item.isRead ? '1px solid #262936' : '1px solid #00e5ff',
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {getTypeBadge(item.type)}
                    <h3 style={{ margin: 0, fontSize: '1rem', color: item.isRead ? '#cbd5e1' : '#ffffff' }}>
                      {item.title}
                    </h3>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>

                <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.9rem', lineHeight: '1.4' }}>
                  {item.message}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', borderTop: '1px solid #262936', paddingTop: '8px' }}>
                  {item.relatedBookingId ? (
                    <Link
                      to={`/my-bookings/${item.relatedBookingId._id || item.relatedBookingId}`}
                      style={{ color: '#00e5ff', fontSize: '0.85rem', textDecoration: 'none', fontWeight: '500' }}
                    >
                      View Booking Details &rarr;
                    </Link>
                  ) : (
                    <span />
                  )}

                  {!item.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(item._id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#00e5ff',
                        fontSize: '0.85rem',
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
            itemsPerPage={10}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
};

export default NotificationsPage;
