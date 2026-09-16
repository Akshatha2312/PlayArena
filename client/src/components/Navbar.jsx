import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Trophy, Calendar, User, LogOut, Menu, X, Bell } from 'lucide-react';
import { notificationService } from '../services/notificationService';
import './Navbar.css';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated && user?.role === 'customer') {
      notificationService
        .getUnreadCount()
        .then((res) => {
          if (isMounted && res && res.data) {
            setUnreadCount(res.data.unreadCount || 0);
          }
        })
        .catch(() => {});
    } else {
      setUnreadCount(0);
    }
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  return (
    <header className="navbar-header">
      <div className="container navbar-container">
        <Link to="/" className="navbar-logo" onClick={() => setMobileMenuOpen(false)}>
          <Trophy className="logo-icon" />
          <span className="logo-text">PLAY<span className="logo-highlight">ARENA</span></span>
        </Link>

        {/* Mobile menu toggle button */}
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>

        {/* Navigation Links */}
        <nav className={`navbar-nav ${mobileMenuOpen ? 'nav-open' : ''}`}>
          <Link to="/games" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
            Games Catalog
          </Link>
          <Link to="/venue" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
            🗺️ Venue Map
          </Link>

          {isAuthenticated ? (
            <>
              <Link to="/my-bookings" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                <Calendar className="nav-icon" /> My Bookings
              </Link>
              <Link to="/my-payments" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                Payments
              </Link>
              {user?.role === 'customer' && (
                <>
                  <Link to="/my-invoices" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                    🧾 Invoices
                  </Link>
                  <Link to="/my-waitlist" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                    ⏳ Waitlist
                  </Link>
                  <Link to="/notifications" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                  <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Bell className="nav-icon" /> Notifications
                    {unreadCount > 0 && (
                      <span
                        className="badge-unread"
                        style={{
                          backgroundColor: '#ef4444',
                          color: '#ffffff',
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          borderRadius: '9999px',
                          padding: '2px 6px',
                          marginLeft: '4px',
                        }}
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </span>
                  </Link>
                  <Link to="/settings/notifications" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                    ⚙️ Settings
                  </Link>
                </>
              )}
              <div className="user-profile-badge">
                <User className="nav-icon" />
                <span className="user-name">{user?.name}</span>
              </div>
              <button className="btn btn-secondary logout-btn" onClick={handleLogout}>
                <LogOut className="nav-icon" /> Logout
              </button>
            </>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-secondary" onClick={() => setMobileMenuOpen(false)}>
                Login
              </Link>
              <Link to="/register" className="btn btn-primary" onClick={() => setMobileMenuOpen(false)}>
                Register
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};
