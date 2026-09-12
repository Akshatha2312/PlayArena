import React, { useState } from 'react';
import { staffService } from '../../services/staffService';

export const StaffWalkInModal = ({ games, onClose, onSuccess }) => {
  const [gameId, setGameId] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('12:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [customerEmail, setCustomerEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedGame = games.find((g) => g._id === gameId);
  const availableResources = selectedGame?.resources || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!gameId || !resourceId || !date || !startTime) {
      setError('Please select game, resource, date, and start time.');
      return;
    }

    try {
      setLoading(true);
      const res = await staffService.createWalkInBooking({
        gameId,
        resourceId,
        date,
        startTime,
        durationMinutes: Number(durationMinutes),
        customerEmail: customerEmail.trim() || undefined,
        autoCheckIn: true,
      });

      onSuccess(res.data.booking);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create walk-in booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h3>➕ New Walk-In Booking</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Game</label>
            <select
              value={gameId}
              onChange={(e) => {
                setGameId(e.target.value);
                setResourceId('');
              }}
              required
            >
              <option value="">-- Select Game --</option>
              {games.map((g) => (
                <option key={g._id} value={g._id}>
                  {g.title} (₹{g.basePricePerHour}/hr)
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Resource / Court</label>
            <select
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              disabled={!gameId}
              required
            >
              <option value="">-- Select Resource --</option>
              {availableResources.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name} ({r.status})
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Duration (mins)</label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              >
                <option value={30}>30 mins</option>
                <option value={60}>60 mins</option>
                <option value={90}>90 mins</option>
                <option value={120}>120 mins</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Customer Email (Optional)</label>
            <input
              type="email"
              placeholder="customer@example.com"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-staff-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create & Check-In Walk-In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
