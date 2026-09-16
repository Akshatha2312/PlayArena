import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const StaffNavbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/staff/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="staff-navbar">
      <div className="staff-navbar-container">
        <div className="staff-navbar-brand">
          <Link to="/staff/dashboard" className="staff-brand-link">
            <span className="staff-brand-logo">⚡ PLAY ARENA</span>
            <span className="staff-badge">STAFF OPS</span>
          </Link>
        </div>

        <nav className="staff-nav-links">
          <Link
            to="/staff/dashboard"
            className={`staff-nav-item ${isActive('/staff/dashboard') ? 'active' : ''}`}
          >
            📊 Dashboard
          </Link>
          <Link
            to="/staff/schedule"
            className={`staff-nav-item ${isActive('/staff/schedule') ? 'active' : ''}`}
          >
            📅 Schedule
          </Link>
          <Link
            to="/staff/check-in"
            className={`staff-nav-item ${isActive('/staff/check-in') ? 'active' : ''}`}
          >
            🔍 Check-In
          </Link>
          <Link
            to="/staff/sessions"
            className={`staff-nav-item ${isActive('/staff/sessions') ? 'active' : ''}`}
          >
            ⏱️ Sessions
          </Link>
          <Link
            to="/venue"
            className={`staff-nav-item ${isActive('/venue') ? 'active' : ''}`}
          >
            🗺️ Venue Map
          </Link>
        </nav>

        <div className="staff-user-controls">
          <span className="staff-user-name">
            👤 {user?.name} <span className="role-tag">({user?.role})</span>
          </span>
          <button onClick={handleLogout} className="btn-staff-logout">
            Exit Portal
          </button>
        </div>
      </div>
    </header>
  );
};
