import React, { useState, useEffect } from 'react';
import { staffService } from '../../services/staffService';
import { LoadingState, ErrorState, EmptyState } from '../../components/StateComponents';

export const StaffSessionsPage = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchActiveSessions = async () => {
    try {
      setLoading(true);
      const res = await staffService.getSchedule({
        status: 'all',
      });

      // Filter only checked_in or in_progress sessions
      const activeList = (res.data?.bookings || []).filter(
        (b) => b.status === 'checked_in' || b.status === 'in_progress'
      );

      setSessions(activeList);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load active sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveSessions();
  }, []);

  const handleAction = async (id, actionType) => {
    try {
      setActionLoading(id);
      if (actionType === 'start') await staffService.startSession(id);
      if (actionType === 'complete') await staffService.completeSession(id);
      await fetchActiveSessions();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <LoadingState message="Fetching live active sessions..." />;
  if (error) return <ErrorState message={error} onRetry={fetchActiveSessions} />;

  return (
    <div className="staff-page-container">
      <div className="staff-header-actions">
        <div>
          <h1 className="staff-title">⏱️ Active Floor Sessions</h1>
          <p className="staff-subtitle">Live Tracker for Checked-In & In-Progress Court Sessions</p>
        </div>
        <button className="btn-secondary" onClick={fetchActiveSessions}>
          🔄 Refresh Sessions
        </button>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          title="No Active Sessions"
          message="There are currently no active checked-in or in-progress court sessions."
        />
      ) : (
        <div className="sessions-grid">
          {sessions.map((s) => {
            const startTime = new Date(s.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const endTime = new Date(s.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div key={s._id} className={`session-card session-status-${s.status}`}>
                <div className="session-card-header">
                  <span className="session-game-tag">{s.gameId?.title}</span>
                  <span className={`status-pill pill-${s.status}`}>
                    {s.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="session-card-body">
                  <h2>{s.resourceId?.name}</h2>
                  <p className="session-customer font-bold">👤 {s.userId?.name || 'Walk-in Customer'}</p>
                  <p className="session-times">⏰ {startTime} – {endTime} ({s.durationMinutes} mins)</p>

                  {s.checkedInAt && (
                    <p className="session-timestamp">
                      Checked In: {new Date(s.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                  {s.startedAt && (
                    <p className="session-timestamp">
                      Started: {new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>

                <div className="session-card-actions">
                  {s.status === 'checked_in' && (
                    <button
                      disabled={actionLoading === s._id}
                      onClick={() => handleAction(s._id, 'start')}
                      className="btn-staff-primary w-full"
                    >
                      ▶️ Start Session
                    </button>
                  )}

                  {s.status === 'in_progress' && (
                    <button
                      disabled={actionLoading === s._id}
                      onClick={() => handleAction(s._id, 'complete')}
                      className="btn-complete w-full"
                    >
                      ⏹️ End Session
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
