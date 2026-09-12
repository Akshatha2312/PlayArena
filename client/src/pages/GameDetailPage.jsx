import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { gameService } from '../services/gameService';
import { LoadingState, ErrorState } from '../components/StateComponents';
import { Trophy, Clock, Tag, Users, CheckCircle, ArrowRight, ShieldAlert } from 'lucide-react';
import './GameDetailPage.css';

export const GameDetailPage = () => {
  const { id } = useParams();
  const [game, setGame] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([gameService.getGameById(id), gameService.getGameResources(id)])
      .then(([gameRes, resourceRes]) => {
        setGame(gameRes.data.game);
        setResources(resourceRes.data.resources || []);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load game details or resources');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) return <LoadingState message="Loading game and court availability..." />;
  if (error) return <ErrorState message={error} />;
  if (!game) return <ErrorState message="Game not found." />;

  return (
    <div className="container page-container">
      {/* Game Overview Header */}
      <div className="game-detail-header">
        <div className="game-header-main">
          <span className="badge badge-info">{game.category}</span>
          <h1 className="game-detail-title">{game.name}</h1>
          <p className="game-detail-description">{game.description}</p>
        </div>

        <div className="game-rules-card">
          <h3>Booking Rules & Pricing</h3>
          <div className="rules-grid">
            <div className="rule-item">
              <Tag className="rule-icon" />
              <div>
                <span className="rule-label">Base Rate</span>
                <span className="rule-value">₹{game.basePricePerHour} / hour</span>
              </div>
            </div>

            <div className="rule-item">
              <Clock className="rule-icon" />
              <div>
                <span className="rule-label">Duration Rules</span>
                <span className="rule-value">
                  {game.minBookingDurationMinutes}m to {game.maxBookingDurationMinutes}m ({game.bookingIntervalMinutes}m steps)
                </span>
              </div>
            </div>

            {game.maxPlayersPerResource && (
              <div className="rule-item">
                <Users className="rule-icon" />
                <div>
                  <span className="rule-label">Capacity</span>
                  <span className="rule-value">Up to {game.maxPlayersPerResource} players / station</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bookable Physical Resources Section */}
      <div className="resources-section">
        <h2 className="section-title">SELECT A BOOKABLE ARENA / RESOURCE</h2>
        <p className="section-subtitle">Choose an operational court, table, or gaming rig to proceed to time-slot reservation.</p>

        {resources.length === 0 ? (
          <div className="no-resources-card">
            <ShieldAlert className="warning-icon" />
            <p>No operational units/courts are currently available for this game.</p>
          </div>
        ) : (
          <div className="resources-grid">
            {resources.map((resource) => (
              <div key={resource._id || resource.id} className="resource-card">
                <div className="resource-card-header">
                  <h3 className="resource-name">{resource.name}</h3>
                  <span className={`badge badge-${resource.status === 'available' ? 'success' : 'warning'}`}>
                    {resource.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="resource-pricing-info">
                  {resource.customPricePerHour !== undefined && resource.customPricePerHour !== null ? (
                    <span className="custom-price">
                      Custom Rate: <strong>₹{resource.customPricePerHour} / hr</strong>
                    </span>
                  ) : (
                    <span className="standard-price">
                      Standard Rate: <strong>₹{game.basePricePerHour} / hr</strong>
                    </span>
                  )}
                </div>

                <div className="resource-card-footer">
                  <Link
                    to={`/booking/${game._id || game.id}/${resource._id || resource.id}`}
                    className="btn btn-primary btn-block"
                  >
                    Select Arena & Pick Time <ArrowRight />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
