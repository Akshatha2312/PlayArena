import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { gameService } from '../services/gameService';
import { LoadingState, ErrorState } from '../components/StateComponents';
import { Trophy, Clock, Tag, Users, CheckCircle, ArrowRight, ShieldAlert, Sparkles, Check } from 'lucide-react';
import './GameDetailPage.css';

export const GameDetailPage = () => {
  const { id } = useParams();
  const [game, setGame] = useState(null);
  const [resources, setResources] = useState([]);
  const [selectedResourceId, setSelectedResourceId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([gameService.getGameById(id), gameService.getGameResources(id)])
      .then(([gameRes, resourceRes]) => {
        const fetchedGame = gameRes.data.game;
        const fetchedResources = resourceRes.data.resources || [];
        setGame(fetchedGame);
        setResources(fetchedResources);

        // Auto-select first available resource if present
        const firstAvail = fetchedResources.find((r) => r.status === 'available');
        if (firstAvail) {
          setSelectedResourceId(firstAvail._id || firstAvail.id);
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load game details or resources');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) return <LoadingState message="Connecting to arena..." />;
  if (error) return <ErrorState message={error} />;
  if (!game) return <ErrorState message="Game not found." />;

  const gameId = game._id || game.id;
  const availableCount = resources.filter((r) => r.status === 'available').length;

  return (
    <div className="container page-container">
      {/* Interactive Arena Welcome Banner */}
      <div className="arena-entered-banner">
        <div className="arena-header-left">
          <span className="arena-status-tag">
            <Sparkles className="sparkle-icon" /> ARENA ENTERED
          </span>
          <h1 className="game-detail-title">{game.name.toUpperCase()} ARENA</h1>
          <p className="game-detail-description">{game.description}</p>
        </div>

        <div className="game-rules-card">
          <h3>Arena Specifications</h3>
          <div className="rules-grid">
            <div className="rule-item">
              <Tag className="rule-icon" />
              <div>
                <span className="rule-label">Base Hourly Rate</span>
                <span className="rule-value">₹{game.basePricePerHour} / hour</span>
              </div>
            </div>

            <div className="rule-item">
              <Clock className="rule-icon" />
              <div>
                <span className="rule-label">Slot Duration</span>
                <span className="rule-value">
                  {game.minBookingDurationMinutes}m to {game.maxBookingDurationMinutes}m ({game.bookingIntervalMinutes}m steps)
                </span>
              </div>
            </div>

            {game.maxPlayersPerResource && (
              <div className="rule-item">
                <Users className="rule-icon" />
                <div>
                  <span className="rule-label">Station Capacity</span>
                  <span className="rule-value">Up to {game.maxPlayersPerResource} players</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Resource / Court Selection Section */}
      <div className="resources-section">
        <div className="resource-section-header">
          <div>
            <span className="section-tag">STEP 1 OF 3</span>
            <h2 className="section-title">CHOOSE YOUR ARENA UNIT</h2>
            <p className="section-subtitle">
              Select an available court, table, or console station to lock your time slot.
            </p>
          </div>
          <div className="units-count-pill">
            <span>{availableCount} UNITS AVAILABLE</span>
          </div>
        </div>

        {resources.length === 0 ? (
          <div className="no-resources-card">
            <ShieldAlert className="warning-icon" />
            <p>No operational units/courts are currently available for this game.</p>
          </div>
        ) : (
          <div className="resources-interactive-grid">
            {resources.map((resource) => {
              const resId = resource._id || resource.id;
              const isSelected = selectedResourceId === resId;
              const isAvailable = resource.status === 'available';

              return (
                <div
                  key={resId}
                  className={`resource-interactive-card ${isSelected ? 'selected' : ''} ${!isAvailable ? 'disabled' : ''}`}
                  onClick={() => isAvailable && setSelectedResourceId(resId)}
                >
                  <div className="card-top-row">
                    <span className="unit-type-tag">
                      {game.category?.toUpperCase() || 'UNIT'}
                    </span>
                    <span className={`badge badge-${isAvailable ? 'success' : 'warning'}`}>
                      {resource.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <h3 className="resource-unit-name">{resource.name}</h3>

                  <div className="resource-pricing-info">
                    {resource.customPricePerHour !== undefined && resource.customPricePerHour !== null ? (
                      <span className="custom-price">
                        Rate: <strong>₹{resource.customPricePerHour} / hr</strong>
                      </span>
                    ) : (
                      <span className="standard-price">
                        Rate: <strong>₹{game.basePricePerHour} / hr</strong>
                      </span>
                    )}
                  </div>

                  {isAvailable ? (
                    <Link
                      to={`/booking/${gameId}/${resId}`}
                      className={`btn btn-block ${isSelected ? 'btn-primary' : 'btn-secondary'} select-unit-btn`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isSelected ? (
                        <>
                          <Check className="btn-icon" /> SELECT {resource.name.toUpperCase()} &rarr;
                        </>
                      ) : (
                        'SELECT THIS UNIT &rarr;'
                      )}
                    </Link>
                  ) : (
                    <button className="btn btn-secondary btn-block" disabled>
                      UNAVAILABLE
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
