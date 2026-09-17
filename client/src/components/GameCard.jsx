import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users, Clock, Tag, Sparkles } from 'lucide-react';
import './GameCard.css';

export const GameCard = ({ game }) => {
  const gameId = game._id || game.id;

  return (
    <div className="game-card arena-card-interactive">
      <div className="game-card-header">
        <div className="card-badge-row">
          <span className="badge badge-info">{game.category?.toUpperCase() || 'ARENA'}</span>
          {game.resourceCount && (
            <span className="resource-count-tag">
              <Sparkles className="sparkle-icon" /> {game.resourceCount} UNITS
            </span>
          )}
        </div>
        <h3 className="game-title">{game.name}</h3>
      </div>

      <p className="game-description">{game.description}</p>

      <div className="game-details-grid">
        <div className="detail-item">
          <Tag className="detail-icon" />
          <span>₹{game.basePricePerHour} / hour</span>
        </div>

        <div className="detail-item">
          <Clock className="detail-icon" />
          <span>{game.minBookingDurationMinutes}–{game.maxBookingDurationMinutes} mins</span>
        </div>

        {game.maxPlayersPerResource && (
          <div className="detail-item">
            <Users className="detail-icon" />
            <span>Up to {game.maxPlayersPerResource} players</span>
          </div>
        )}
      </div>

      <div className="game-card-footer">
        <Link to={`/games/${gameId}`} className="btn btn-primary btn-block enter-arena-btn">
          ENTER ARENA <ArrowRight className="btn-icon-right" />
        </Link>
      </div>
    </div>
  );
};
