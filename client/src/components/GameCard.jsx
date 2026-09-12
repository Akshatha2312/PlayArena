import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users, Clock, Tag } from 'lucide-react';
import './GameCard.css';

export const GameCard = ({ game }) => {
  return (
    <div className="game-card">
      <div className="game-card-header">
        <span className="badge badge-info">{game.category}</span>
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
        <Link to={`/games/${game._id || game.id}`} className="btn btn-primary btn-block">
          <Trophy className="btn-icon" /> View & Book Arena
        </Link>
      </div>
    </div>
  );
};
