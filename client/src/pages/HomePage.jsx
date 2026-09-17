import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { gameService } from '../services/gameService';
import { GameCard } from '../components/GameCard';
import { LoadingState, ErrorState } from '../components/StateComponents';
import { Trophy, Zap, ArrowRight, ShieldCheck, Gamepad2, Compass, Layers, CheckCircle } from 'lucide-react';
import './HomePage.css';

export const HomePage = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

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

  const categories = [
    { label: 'COURTS', icon: Trophy, category: 'court' },
    { label: 'TABLES', icon: Layers, category: 'table' },
    { label: 'CONSOLES', icon: Gamepad2, category: 'console' },
    { label: 'SIMULATORS', icon: Zap, category: 'simulator' },
  ];

  return (
    <div className="home-page">
      {/* Hero Entrance Section */}
      <section className="hero-entrance-section">
        <div className="container hero-container">
          <div className="hero-content">
            <span className="hero-badge">
              <Zap className="hero-badge-icon" /> DIGITAL SPORTS & GAMING ARENA
            </span>
            <h1 className="hero-title">
              READY TO PLAY?<br />
              <span className="title-highlight">CHOOSE YOUR ARENA.</span>
            </h1>
            <p className="hero-description">
              Reserve professional badminton courts, pool tables, high-end PS5 rigs, and simulator bays with real-time slot availability.
            </p>

            {/* Quick Category Selector Pills */}
            <div className="category-pills-row">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.category}
                    className="category-pill-btn"
                    onClick={() => navigate(`/games?category=${cat.category}`)}
                  >
                    <Icon className="pill-icon" /> {cat.label}
                  </button>
                );
              })}
            </div>

            <div className="hero-actions">
              <Link to="/games" className="btn btn-primary btn-hero">
                EXPLORE ALL ARENAS <ArrowRight />
              </Link>
              <Link to="/venue" className="btn btn-secondary btn-hero">
                <Compass className="btn-icon" /> MAP LAYOUT
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Games Section */}
      <section className="featured-section container">
        <div className="section-header">
          <div>
            <span className="section-tag">POPULAR ARENAS</span>
            <h2 className="section-title">FEATURED ACTIVITIES & COURTS</h2>
            <p className="section-subtitle">Pick an activity below to inspect live resources and choose your session time.</p>
          </div>
          <Link to="/games" className="btn btn-outline">
            View Full Catalog &rarr;
          </Link>
        </div>

        {loading ? (
          <LoadingState message="Connecting to Play Arena catalog..." />
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

      {/* Interactive Match Flow Steps */}
      <section className="how-it-works-section">
        <div className="container">
          <div className="section-header-center">
            <span className="section-tag">SIMPLIFIED BOOKING</span>
            <h2 className="section-title text-center">HOW YOUR SESSION WORKS</h2>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <div className="step-header">
                <span className="step-number">01</span>
                <Gamepad2 className="step-icon" />
              </div>
              <h3>CHOOSE ARENA</h3>
              <p>Select your favorite sport, court, or gaming console setup from our live catalog.</p>
            </div>

            <div className="step-card">
              <div className="step-number-container">
                <div className="step-header">
                  <span className="step-number">02</span>
                  <Trophy className="step-icon" />
                </div>
              </div>
              <h3>SELECT COURT & SLOT</h3>
              <p>Pick your specific physical court/table and lock in your preferred time slot.</p>
            </div>

            <div className="step-card">
              <div className="step-header">
                <span className="step-number">03</span>
                <CheckCircle className="step-icon" />
              </div>
              <h3>LOCK & PLAY</h3>
              <p>Complete fast checkout and receive your instant digital entry QR arena pass.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
