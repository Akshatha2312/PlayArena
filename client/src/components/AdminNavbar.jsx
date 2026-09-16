import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AdminNavbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="admin-navbar">
      <div className="admin-navbar-container">
        <div className="admin-navbar-brand">
          <Link to="/admin/dashboard" className="admin-brand-link">
            <span className="admin-brand-logo">⚡ PLAY ARENA</span>
            <span className="admin-badge">CONTROL CENTER</span>
          </Link>
        </div>

        <nav className="admin-nav-links">
          <Link
            to="/admin/dashboard"
            className={`admin-nav-item ${isActive('/admin/dashboard') ? 'active' : ''}`}
          >
            📊 Overview
          </Link>
          <Link
            to="/admin/analytics"
            className={`admin-nav-item ${isActive('/admin/analytics') ? 'active' : ''}`}
          >
            📈 Analytics
          </Link>
          <Link
            to="/admin/games"
            className={`admin-nav-item ${isActive('/admin/games') ? 'active' : ''}`}
          >
            🎮 Games
          </Link>
          <Link
            to="/admin/resources"
            className={`admin-nav-item ${isActive('/admin/resources') ? 'active' : ''}`}
          >
            🏟️ Resources
          </Link>
          <Link
            to="/admin/venue-layout"
            className={`admin-nav-item ${isActive('/admin/venue-layout') ? 'active' : ''}`}
          >
            🗺️ Venue Layout
          </Link>
          <Link
            to="/admin/bookings"
            className={`admin-nav-item ${isActive('/admin/bookings') ? 'active' : ''}`}
          >
            📅 Bookings
          </Link>
          <Link
            to="/admin/customers"
            className={`admin-nav-item ${isActive('/admin/customers') ? 'active' : ''}`}
          >
            👥 Customers
          </Link>
          <Link
            to="/admin/staff"
            className={`admin-nav-item ${isActive('/admin/staff') ? 'active' : ''}`}
          >
            🛡️ Staff
          </Link>
          <Link
            to="/admin/payments"
            className={`admin-nav-item ${isActive('/admin/payments') ? 'active' : ''}`}
          >
            💳 Payments
          </Link>
          <Link
            to="/admin/support"
            className={`admin-nav-item ${isActive('/admin/support') ? 'active' : ''}`}
          >
            💬 Support
          </Link>
        </nav>

        <div className="admin-user-controls">
          <span className="admin-user-name">
            👑 {user?.name} <span className="role-tag">(Admin)</span>
          </span>
          <button onClick={handleLogout} className="btn-admin-logout">
            Exit Admin
          </button>
        </div>
      </div>
    </header>
  );
};
