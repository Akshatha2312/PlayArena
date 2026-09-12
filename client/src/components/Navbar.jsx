import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Trophy, Calendar, User, LogOut, Menu, X } from 'lucide-react';
import './Navbar.css';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

          {isAuthenticated ? (
            <>
              <Link to="/my-bookings" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                <Calendar className="nav-icon" /> My Bookings
              </Link>
              <Link to="/my-payments" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                Payments
              </Link>
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
