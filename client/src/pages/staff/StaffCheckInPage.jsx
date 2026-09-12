import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { staffService } from '../../services/staffService';
import { qrService } from '../../services/qrService';
import { LoadingState } from '../../components/StateComponents';

export const StaffCheckInPage = () => {
  const [mode, setMode] = useState('qr'); // 'qr' | 'search'
  
  // QR State
  const [qrInput, setQrInput] = useState('');
  const [verifiedBooking, setVerifiedBooking] = useState(null);
  const [qrValidity, setQrValidity] = useState(null);
  const [verifyingQR, setVerifyingQR] = useState(false);
  const [qrError, setQrError] = useState('');

  // Manual Search State
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const handleVerifyQR = async (e) => {
    if (e) e.preventDefault();
    if (!qrInput.trim()) return;

    try {
      setVerifyingQR(true);
      setQrError('');
      setVerifiedBooking(null);
      setQrValidity(null);
      setActionMessage('');

      if (qrInput.trim().startsWith('PAQR:')) {
        const res = await qrService.verifyQR(qrInput.trim());
        if (res && res.data) {
          setVerifiedBooking(res.data.booking);
          setQrValidity(res.data.validity);
        }
      } else {
        const res = await staffService.lookupBooking(qrInput.trim());
        setResults(res.data?.bookings || []);
      }
    } catch (err) {
      setQrError(err.response?.data?.message || err.message || 'Invalid or unverified QR payload');
    } finally {
      setVerifyingQR(false);
    }
  };

  const handleConfirmQRCheckIn = async () => {
    if (!verifiedBooking) return;
    try {
      setLoading(true);
      setQrError('');
      const res = await staffService.checkInBooking(verifiedBooking._id);
      setActionMessage(`Check-In Successful! Booking #${res.data.booking._id} status is now Checked In.`);
      setVerifiedBooking((prev) => ({ ...prev, status: 'checked_in' }));
      setQrValidity({ eligible: false, reason: 'Booking has already been checked in.' });
    } catch (err) {
      setQrError(err.message || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      setLoading(true);
      setError('');
      setActionMessage('');
      const res = await staffService.lookupBooking(query.trim());
      setResults(res.data?.bookings || []);
    } catch (err) {
      setError(err.message || 'Lookup failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (bookingId) => {
    try {
      setLoading(true);
      setError('');
      const res = await staffService.checkInBooking(bookingId);
      setActionMessage(`Booking #${res.data.booking._id} checked in successfully!`);
      // Refresh lookup
      const lookupRes = await staffService.lookupBooking(query.trim());
      setResults(lookupRes.data?.bookings || []);
    } catch (err) {
      setError(err.message || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="staff-page-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px', color: '#f8fafc' }}>
      <div className="staff-header" style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', margin: 0, color: '#f8fafc' }}>Staff Customer Check-In Console</h1>
        <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
          Scan customer QR passes or search by booking reference / customer details
        </p>
      </div>

      {/* Mode Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
        <button
          onClick={() => setMode('qr')}
          style={{
            backgroundColor: mode === 'qr' ? '#0284c7' : '#1e293b',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 20px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          📷 QR Pass Mode
        </button>
        <button
          onClick={() => setMode('search')}
          style={{
            backgroundColor: mode === 'search' ? '#0284c7' : '#1e293b',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 20px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          🔍 Manual Lookup (Email/Phone/ID)
        </button>
      </div>

      {actionMessage && (
        <div style={{ backgroundColor: '#14532d', border: '1px solid #16a34a', color: '#86efac', padding: '16px', borderRadius: '8px', marginBottom: '20px', fontWeight: '500' }}>
          {actionMessage}
        </div>
      )}

      {/* Mode 1: QR Verification */}
      {mode === 'qr' && (
        <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', border: '1px solid #334155' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#e2e8f0' }}>Verify Booking QR Pass</h3>
          <form onSubmit={handleVerifyQR} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Paste QR payload or Booking ID (e.g. 64b8f0... or PAQR:v1:...)"
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              style={{
                flex: 1,
                minWidth: '280px',
                padding: '12px',
                backgroundColor: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '6px',
                color: '#ffffff',
                fontFamily: 'monospace',
              }}
              required
            />
            <button
              type="submit"
              disabled={verifyingQR}
              style={{
                backgroundColor: '#0284c7',
                color: '#fff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: verifyingQR ? 'not-allowed' : 'pointer',
              }}
            >
              {verifyingQR ? 'Searching...' : 'Search Booking / Verify QR Code'}
            </button>
          </form>

          {qrError && (
            <div style={{ backgroundColor: '#450a0a', border: '1px solid #dc2626', color: '#fca5a5', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
              {`⚠️ ${qrError}`}
            </div>
          )}

          {/* Verified Booking Review Card */}
          {verifiedBooking && (
            <div style={{ backgroundColor: '#0f172a', border: '1px solid #0284c7', borderRadius: '8px', padding: '20px', marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, color: '#38bdf8', fontSize: '1.2rem' }}>
                  Booking #{verifiedBooking.bookingReference || verifiedBooking._id}
                </h3>
                <span style={{ backgroundColor: verifiedBooking.status === 'confirmed' ? '#0284c7' : '#475569', color: '#fff', padding: '4px 12px', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  {verifiedBooking.status.toUpperCase()}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'block' }}>Customer Name</span>
                  <strong style={{ color: '#ffffff' }}>{verifiedBooking.userId?.name || 'Customer'}</strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'block' }}>Game</span>
                  <strong style={{ color: '#ffffff' }}>{verifiedBooking.gameId?.title || 'Game'}</strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'block' }}>Resource</span>
                  <strong style={{ color: '#ffffff' }}>{verifiedBooking.resourceId?.name || 'Resource'}</strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'block' }}>Time Slot</span>
                  <strong style={{ color: '#ffffff' }}>{new Date(verifiedBooking.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(verifiedBooking.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                </div>
              </div>

              {qrValidity && !qrValidity.eligible && (
                <div style={{ backgroundColor: '#450a0a', border: '1px solid #991b1b', color: '#fca5a5', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.9rem' }}>
                  ❌ {qrValidity.reason}
                </div>
              )}

              {qrValidity && qrValidity.eligible && verifiedBooking.status === 'confirmed' && (
                <button
                  onClick={handleConfirmQRCheckIn}
                  disabled={loading}
                  style={{
                    width: '100%',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '14px',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Processing Check-In...' : '✔ CONFIRM CHECK-IN'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Manual Search */}
      {mode === 'search' && (
        <div>
          <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', border: '1px solid #334155', marginBottom: '24px' }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search by ID, email, or phone (e.g. 64b8f0... or customer@email.com)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ flex: 1, minWidth: '280px', padding: '12px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#ffffff' }}
                required
              />
              <button type="submit" disabled={loading} style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                {loading ? 'Searching...' : 'Search Booking'}
              </button>
            </form>
          </div>

          {error && <div style={{ backgroundColor: '#450a0a', border: '1px solid #dc2626', color: '#fca5a5', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>{error}</div>}
        </div>
      )}

      {/* Lookup Results Section (Visible when search results exist) */}
      {results !== null && !loading && (
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ color: '#e2e8f0', marginBottom: '16px' }}>Results ({results.length})</h3>
          {results.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No bookings found for query.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {results.map((b) => (
                <div key={b._id} style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h4 style={{ margin: 0, color: '#f8fafc' }}>{b.gameId?.title || 'Game'} - {b.resourceId?.name || 'Resource'}</h4>
                    <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                      Customer: {b.userId?.name || 'Customer'} ({b.userId?.email || 'N/A'}) | Slot: {new Date(b.startAt).toLocaleString()}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ backgroundColor: '#334155', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                      {b.status.toUpperCase()}
                    </span>
                    {b.status === 'confirmed' && (
                      <button
                        onClick={() => handleCheckIn(b._id)}
                        style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
                      >
                        Check In Customer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
