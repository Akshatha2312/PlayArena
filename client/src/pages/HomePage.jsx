import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { gameService } from '../services/gameService';
import { GameCard } from '../components/GameCard';
import { LoadingState, ErrorState } from '../components/StateComponents';
import { Trophy, Shield, Zap, ArrowRight, CheckCircle } from 'lucide-react';
import './HomePage.css';

export const HomePage = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    gameService
      .getGames({ limit: 6 })
      .then((res) => {
        setGames(res.data.games || []);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load featured games');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container hero-container">
          <div className="hero-content">
            <span className="hero-badge">
              <Zap className="hero-badge-icon" /> Next-Gen Sports & Gaming Facility
            </span>
            <h1 className="hero-title">
              CHOOSE YOUR GAME.<br />
              BOOK YOUR ARENA.<br />
              <span className="title-highlight">PLAY COMPETITIVELY.</span>
            </h1>
            <p className="hero-description">
              Play Arena features world-class indoor badminton courts, professional table tennis arenas, high-end PS5/Xbox simulators, and arcade zones. Instant time-slot confirmation and seamless online booking.
            </p>
            <div className="hero-actions">
              <Link to="/games" className="btn btn-primary btn-hero">
                Explore Games Catalog <ArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Games Section */}
      <section className="featured-section container">
        <div className="section-header">
          <div>
            <h2 className="section-title">FEATURED ARENAS & GAMES</h2>
            <p className="section-subtitle">Select an activity to view operational courts and book your preferred time slot.</p>
          </div>
          <Link to="/games" className="btn btn-outline">
            View All Games
          </Link>
        </div>

        {loading ? (
          <LoadingState message="Loading available games..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : games.length === 0 ? (
          <p className="no-games">No active games available at the moment.</p>
        ) : (
          <div className="games-grid">
            {games.map((game) => (
              <GameCard key={game._id || game.id} game={game} />
            ))}
          </div>
        )}
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="container">
          <h2 className="section-title text-center">HOW PLAY ARENA WORKS</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">01</div>
              <h3>Choose Activity</h3>
              <p>Browse our catalog of indoor court sports, table games, and eSports stations.</p>
            </div>
            <div className="step-card">
              <div className="step-number">02</div>
              <h3>Pick Resource & Time</h3>
              <p>Select your physical court or station, pick a date, and select an available time slot.</p>
            </div>
            <div className="step-card">
              <div className="step-number">03</div>
              <h3>Book & Play</h3>
              <p>Complete secure checkout via Razorpay and receive instant confirmation.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
