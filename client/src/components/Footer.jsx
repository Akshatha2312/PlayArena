import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, ShieldCheck, Zap } from 'lucide-react';
import './Footer.css';

export const Footer = () => {
  return (
    <footer className="footer-container">
      <div className="container footer-content">
        <div className="footer-brand">
          <div className="footer-logo">
            <Trophy className="logo-icon" />
            <span>PLAY<span className="logo-highlight">ARENA</span></span>
          </div>
          <p className="footer-tagline">
            Premier Indoor Sports & Gaming Complex. Choose your game, reserve your court/station, and play competitively.
          </p>
        </div>

        <div className="footer-links-group">
          <h4>Explore</h4>
          <Link to="/games">All Games</Link>
          <Link to="/games?category=court">Court Sports</Link>
          <Link to="/games?category=table">Table Sports</Link>
          <Link to="/games?category=esports">eSports & VR</Link>
        </div>

        <div className="footer-links-group">
          <h4>Customer Care</h4>
          <Link to="/my-bookings">My Bookings</Link>
          <Link to="/my-payments">Payment History</Link>
          <Link to="/login">Account Login</Link>
        </div>

        <div className="footer-features">
          <div className="feature-item">
            <Zap className="feature-icon" /> Instant Time-Slot Confirmation
          </div>
          <div className="feature-item">
            <ShieldCheck className="feature-icon" /> Safe & Verified Razorpay Checkout
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container">
          <p>© {new Date().getFullYear()} Play Arena Indoor Sports Center. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
