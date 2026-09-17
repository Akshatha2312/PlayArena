import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Trophy,
  Gamepad2,
  MapPin,
  Calendar,
  HelpCircle,
  Bell,
  User,
  CreditCard,
  FileText,
  Clock,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
import { notificationService } from '../services/notificationService';
import './Navbar.css';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close menus on location change
  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  // Fetch notification unread count for customer users
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
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <header className="navbar-header">
      <div className="container navbar-container">
        {/* Brand Logo */}
        <Link to="/" className="navbar-logo" aria-label="Play Arena Home">
          <Trophy className="logo-icon" />
          <span className="logo-text">
            PLAY<span className="logo-highlight">ARENA</span>
          </span>
        </Link>

        {/* Mobile Header Quick Actions */}
        <div className="mobile-header-actions">
          {isAuthenticated && user?.role === 'customer' && (
            <Link to="/notifications" className="mobile-bell-btn" aria-label="Notifications">
              <Bell className="nav-icon" />
              {unreadCount > 0 && (
                <span className="badge-unread">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </Link>
          )}

          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Desktop Primary Navigation & Actions */}
        <nav className={`navbar-nav ${mobileMenuOpen ? 'nav-open' : ''}`}>
          <div className="primary-nav">
            <Link to="/games" className={`nav-link ${isActive('/games') ? 'active' : ''}`}>
              <Gamepad2 className="nav-icon" /> Games
            </Link>
            <Link to="/venue" className={`nav-link ${isActive('/venue') ? 'active' : ''}`}>
              <MapPin className="nav-icon" /> Venue
            </Link>

            {isAuthenticated && (
              <>
                <Link
                  to="/my-bookings"
                  className={`nav-link ${isActive('/my-bookings') ? 'active' : ''}`}
                >
                  <Calendar className="nav-icon" /> My Bookings
                </Link>
                <Link
                  to="/my-support"
                  className={`nav-link ${isActive('/my-support') || isActive('/support') ? 'active' : ''}`}
                >
                  <HelpCircle className="nav-icon" /> Support
                </Link>
              </>
            )}
          </div>

          {/* Desktop Right Side Actions */}
          <div className="nav-actions">
            {isAuthenticated ? (
              <>
                {user?.role === 'customer' && (
                  <Link
                    to="/notifications"
                    className={`notification-icon-btn ${isActive('/notifications') ? 'active' : ''}`}
                    title="Notifications"
                    aria-label="Notifications"
                  >
                    <Bell className="nav-icon" />
                    {unreadCount > 0 && (
                      <span className="badge-unread">{unreadCount > 99 ? '99+' : unreadCount}</span>
                    )}
                  </Link>
                )}

                {/* Account Dropdown */}
                <div className="account-dropdown-wrapper" ref={dropdownRef}>
                  <button
                    className={`account-btn ${dropdownOpen ? 'open' : ''}`}
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    aria-haspopup="true"
                    aria-expanded={dropdownOpen}
                  >
                    <User className="user-icon" />
                    <span className="user-name">{user?.name}</span>
                    <ChevronDown className={`chevron-icon ${dropdownOpen ? 'rotate' : ''}`} />
                  </button>

                  {dropdownOpen && (
                    <div className="account-dropdown-menu" role="menu">
                      <div className="dropdown-user-header">
                        <p className="user-header-name">{user?.name}</p>
                        <p className="user-header-email">{user?.email}</p>
                      </div>

                      <div className="dropdown-divider"></div>

                      <Link
                        to="/my-payments"
                        className="dropdown-item"
                        role="menuitem"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <CreditCard className="dropdown-icon" /> Payments
                      </Link>

                      <Link
                        to="/my-invoices"
                        className="dropdown-item"
                        role="menuitem"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <FileText className="dropdown-icon" /> Invoices
                      </Link>

                      <Link
                        to="/my-waitlist"
                        className="dropdown-item"
                        role="menuitem"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Clock className="dropdown-icon" /> Waitlist
                      </Link>

                      <Link
                        to="/settings/notifications"
                        className="dropdown-item"
                        role="menuitem"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Settings className="dropdown-icon" /> Notification Settings
                      </Link>

                      <div className="dropdown-divider"></div>

                      <button
                        className="dropdown-item logout-item"
                        role="menuitem"
                        onClick={() => {
                          setDropdownOpen(false);
                          handleLogout();
                        }}
                      >
                        <LogOut className="dropdown-icon" /> Logout
                      </button>
                    </div>
                  )}
                </div>

                {/* Mobile Drawer Menu Extra Items */}
                <div className="mobile-dropdown-links">
                  <div className="mobile-section-title">ACCOUNT</div>
                  <Link to="/my-payments" className="nav-link">
                    <CreditCard className="nav-icon" /> Payments
                  </Link>
                  <Link to="/my-invoices" className="nav-link">
                    <FileText className="nav-icon" /> Invoices
                  </Link>
                  <Link to="/my-waitlist" className="nav-link">
                    <Clock className="nav-icon" /> Waitlist
                  </Link>
                  <Link to="/settings/notifications" className="nav-link">
                    <Settings className="nav-icon" /> Notification Settings
                  </Link>
                  <button className="btn btn-secondary logout-btn" onClick={handleLogout}>
                    <LogOut className="nav-icon" /> Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="auth-buttons">
                <Link to="/login" className="btn btn-secondary">
                  Login
                </Link>
                <Link to="/register" className="btn btn-primary">
                  Register
                </Link>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};
