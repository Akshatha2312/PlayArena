import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { staffService } from '../../services/staffService';
import { qrService } from '../../services/qrService';
import { CheckCircle2, AlertTriangle, Camera, Search, RefreshCw, ShieldAlert } from 'lucide-react';

export const StaffCheckInPage = () => {
  const [mode, setMode] = useState('qr'); // 'qr' | 'search'

  // Scanner & Camera state
  const [isScanning, setIsScanning] = useState(true);
  const [cameraPermissionError, setCameraPermissionError] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Manual input within QR mode
  const [manualQrInput, setManualQrInput] = useState('');

  // Verification & Check-in Result state
  const [verifying, setVerifying] = useState(false);
  const [verifiedResult, setVerifiedResult] = useState(null); // { booking, validity }
  const [verificationError, setVerificationError] = useState(null);
  const [checkInComplete, setCheckInComplete] = useState(null); // checked-in booking object
  const [checkingIn, setCheckingIn] = useState(false);

  // Search Mode state
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchSuccessMessage, setSearchSuccessMessage] = useState('');

  const html5QrcodeRef = useRef(null);

  // Initialize and manage HTML5 Camera QR Scanner
  useEffect(() => {
    if (mode !== 'qr' || !isScanning) {
      stopCameraScanner();
      return;
    }

    let isMounted = true;
    const scannerId = 'qr-reader-container';

    const container = document.getElementById(scannerId);
    if (!container) return;

    const scanner = new Html5Qrcode(scannerId);
    html5QrcodeRef.current = scanner;

    setCameraPermissionError(null);

    scanner
      .start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minDim = Math.min(viewfinderWidth, viewfinderHeight);
            return {
              width: Math.floor(minDim * 0.7),
              height: Math.floor(minDim * 0.7),
            };
          },
        },
        (decodedText) => {
          if (isMounted) {
            handleDecodedPayload(decodedText);
          }
        },
        () => {}
      )
      .then(() => {
        if (isMounted) {
          setCameraActive(true);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('Camera activation failed:', err);
          setCameraActive(false);
          setCameraPermissionError(
            err?.message || 'Camera permission denied or camera device unavailable.'
          );
        }
      });

    return () => {
      isMounted = false;
      stopCameraScanner();
    };
  }, [mode, isScanning]);

  const stopCameraScanner = () => {
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          html5QrcodeRef.current.stop().catch(() => {});
        }
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
      html5QrcodeRef.current = null;
    }
    setCameraActive(false);
  };

  const handleDecodedPayload = async (payload) => {
    setIsScanning(false);
    stopCameraScanner();
    await verifyPayload(payload);
  };

  const verifyPayload = async (rawPayload) => {
    const payload = rawPayload ? rawPayload.trim() : '';
    if (!payload) return;

    setVerifying(true);
    setVerificationError(null);
    setVerifiedResult(null);
    setCheckInComplete(null);
    setSearchSuccessMessage('');

    try {
      if (payload.startsWith('PAQR:')) {
        const res = await qrService.verifyQR(payload);
        if (res && res.data) {
          setVerifiedResult(res.data);
        } else {
          setVerificationError({
            title: 'QR CODE INVALID',
            message: 'The arena pass payload could not be verified by the system.',
            reasons: ['invalid signature', 'tampered payload', 'malformed format'],
          });
        }
      } else {
        const lookupRes = await staffService.lookupBooking(payload);
        const bookings = lookupRes?.data?.bookings || [];
        if (bookings.length > 0) {
          const b = bookings[0];
          setVerifiedResult({
            booking: b,
            validity: {
              eligible: b.status === 'confirmed',
              reason: b.status === 'confirmed' ? 'Eligible for check-in' : `Booking is currently '${b.status}'`,
            },
          });
        } else {
          setVerificationError({
            title: 'BOOKING NOT FOUND',
            message: `No active reservation found for ID or code: ${payload}`,
            reasons: ['booking ID does not exist', 'cancelled booking'],
          });
        }
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Invalid or expired QR payload';
      let title = 'QR CODE INVALID';
      let reasons = ['expired token', 'invalid HMAC signature', 'booking not found', 'already checked in'];

      if (errMsg.toLowerCase().includes('already checked in')) {
        title = 'ALREADY CHECKED IN';
        reasons = ['This booking pass has already been scanned and checked in.'];
      } else if (errMsg.toLowerCase().includes('cancelled')) {
        title = 'BOOKING CANCELLED';
      } else if (errMsg.toLowerCase().includes('expired')) {
        title = 'PASS EXPIRED';
      }

      setVerificationError({
        title,
        message: errMsg,
        reasons,
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleConfirmCheckIn = async () => {
    if (!verifiedResult || !verifiedResult.booking) return;

    setCheckingIn(true);
    setVerificationError(null);

    try {
      const bookingId = verifiedResult.booking._id;
      const res = await staffService.checkInBooking(bookingId);
      const updatedBooking = res.data?.booking || verifiedResult.booking;

      setSearchSuccessMessage(`Check-In Successful! Booking #${bookingId} checked in successfully.`);
      setCheckInComplete(updatedBooking);
      setVerifiedResult((prev) => (prev ? { ...prev, booking: { ...prev.booking, status: 'checked_in' }, validity: { eligible: false, reason: 'Booking has already been checked in.' } } : prev));
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Check-in failed';
      setVerificationError({
        title: 'CHECK-IN FAILED',
        message: errMsg,
        reasons: ['double check-in conflict', 'server verification error'],
      });
    } finally {
      setCheckingIn(false);
    }
  };

  const handleResetScan = () => {
    setVerifiedResult(null);
    setVerificationError(null);
    setCheckInComplete(null);
    setSearchSuccessMessage('');
    setManualQrInput('');
    setIsScanning(true);
  };

  const handleManualFormSubmit = (e) => {
    e.preventDefault();
    if (!manualQrInput.trim()) return;
    setIsScanning(false);
    stopCameraScanner();
    verifyPayload(manualQrInput.trim());
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearchLoading(true);
    setSearchError('');
    setSearchSuccessMessage('');

    try {
      const res = await staffService.lookupBooking(query.trim());
      setSearchResults(res.data?.bookings || []);
    } catch (err) {
      setSearchError(err.message || 'Lookup search failed');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchCheckIn = async (bookingId) => {
    setSearchLoading(true);
    setSearchError('');
    setSearchSuccessMessage('');

    try {
      const res = await staffService.checkInBooking(bookingId);
      setSearchSuccessMessage(`Booking #${res.data?.booking?._id || bookingId} checked in successfully!`);
      const refreshRes = await staffService.lookupBooking(query.trim());
      setSearchResults(refreshRes.data?.bookings || []);
    } catch (err) {
      setSearchError(err.message || 'Check-in failed');
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Camera style={{ color: '#0284c7' }} /> Staff Customer Check-In Console
        </h1>
        <p style={{ margin: '6px 0 0 0', color: '#94a3b8', fontSize: '0.95rem' }}>
          Scan customer QR passes or search by booking reference / customer details
        </p>
      </div>

      {/* Navigation Mode Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
        <button
          onClick={() => {
            setMode('qr');
            handleResetScan();
          }}
          style={{
            backgroundColor: mode === 'qr' ? '#0284c7' : '#1e293b',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontWeight: '700',
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          📷 QR Pass Mode
        </button>
        <button
          onClick={() => {
            setMode('search');
            stopCameraScanner();
          }}
          style={{
            backgroundColor: mode === 'search' ? '#0284c7' : '#1e293b',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontWeight: '700',
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          🔍 Manual Lookup (Email/Phone/ID)
        </button>
      </div>

      {searchSuccessMessage && (
        <div style={{ backgroundColor: '#14532d', border: '1px solid #16a34a', color: '#86efac', padding: '16px', borderRadius: '8px', marginBottom: '20px', fontWeight: '600' }}>
          ✓ {searchSuccessMessage}
        </div>
      )}

      {/* MODE 1: QR CAMERA SCANNER & VERIFICATION */}
      {mode === 'qr' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'start' }}>
          
          {/* LEFT SIDE: CAMERA STREAM / SCANNER UI */}
          <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '12px', border: '1px solid #334155' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#e2e8f0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>📷 Live Arena Pass Scanner</span>
              {cameraActive && (
                <span style={{ fontSize: '0.75rem', backgroundColor: '#15803d', color: '#86efac', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                  CAMERA ACTIVE
                </span>
              )}
            </h3>

            {/* Camera Permission Denied / Error Box */}
            {cameraPermissionError ? (
              <div style={{ backgroundColor: '#450a0a', border: '1px solid #dc2626', color: '#fca5a5', padding: '20px', borderRadius: '10px', textAlign: 'center', marginBottom: '20px' }}>
                <ShieldAlert size={48} style={{ color: '#ef4444', margin: '0 auto 12px auto' }} />
                <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#f87171' }}>CAMERA ACCESS DENIED</h4>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#fca5a5' }}>
                  Please allow camera access to scan the arena pass.
                </p>
                <button
                  onClick={() => setMode('search')}
                  style={{
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px 18px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  [ ENTER BOOKING ID MANUALLY ]
                </button>
              </div>
            ) : isScanning ? (
              <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '10px', backgroundColor: '#0f172a', border: '2px dashed #0284c7', minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div id="qr-reader-container" style={{ width: '100%', minHeight: '300px' }} />
                <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                  Position customer digital pass inside viewfinder frame
                </div>
              </div>
            ) : (
              <div style={{ padding: '30px', textAlign: 'center', backgroundColor: '#0f172a', borderRadius: '10px', border: '1px solid #334155' }}>
                <CheckCircle2 size={48} style={{ color: '#22c55e', margin: '0 auto 12px auto' }} />
                <p style={{ margin: '0 0 16px 0', color: '#cbd5e1', fontWeight: '600' }}>QR Code Captured</p>
                <button
                  onClick={handleResetScan}
                  style={{
                    backgroundColor: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <RefreshCw size={16} /> Scan Next Pass
                </button>
              </div>
            )}

            {/* Manual QR Payload Input Box (Fallback within Scanner tab) */}
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #334155' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px', fontWeight: '600' }}>
                Or paste QR payload or Booking ID:
              </label>
              <form onSubmit={handleManualFormSubmit} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Paste QR payload or Booking ID (e.g. 64b8f0... or PAQR:v1:...)"
                  value={manualQrInput}
                  onChange={(e) => setManualQrInput(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                  }}
                />
                <button
                  type="submit"
                  disabled={verifying}
                  style={{
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  {verifying ? 'Searching...' : 'Search Booking / Verify QR Code'}
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT SIDE: VERIFICATION & CHECK-IN RESULT CARD */}
          <div>
            {verifying ? (
              <div style={{ backgroundColor: '#1e293b', padding: '40px', borderRadius: '12px', border: '1px solid #334155', textAlign: 'center', color: '#38bdf8' }}>
                <RefreshCw size={36} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }} />
                <h3 style={{ margin: 0 }}>Verifying Arena Pass...</h3>
                <p style={{ margin: '8px 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>Validating HMAC signature & timestamp</p>
              </div>
            ) : checkInComplete ? (
              /* SUCCESS STATE 2: CHECK-IN COMPLETE */
              <div style={{ backgroundColor: '#064e3b', border: '2px solid #10b981', padding: '24px', borderRadius: '12px', color: '#ecfdf5' }}>
                <div style={{ textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '16px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 4px 0' }}>✓ CHECK-IN COMPLETE</div>
                  <div style={{ fontSize: '1rem', fontWeight: '800', color: '#6ee7b7', letterSpacing: '1px' }}>PLAYER ENTERED ARENA</div>
                </div>

                <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.3rem', color: '#ffffff' }}>
                    {checkInComplete.gameId?.title || checkInComplete.gameId?.name || 'ARENA SPORT'}
                  </h3>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#a7f3d0', marginBottom: '12px' }}>
                    {checkInComplete.resourceId?.name || 'COURT / UNIT'}
                  </div>
                  <div style={{ color: '#d1fae5', fontSize: '0.95rem' }}>
                    🕒 {new Date(checkInComplete.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(checkInComplete.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ color: '#d1fae5', fontSize: '0.95rem', marginTop: '6px' }}>
                    👤 Customer: {checkInComplete.userId?.name || 'Customer'}
                  </div>
                </div>

                <button
                  onClick={handleResetScan}
                  style={{
                    width: '100%',
                    backgroundColor: '#10b981',
                    color: '#064e3b',
                    border: 'none',
                    padding: '14px',
                    borderRadius: '8px',
                    fontWeight: '800',
                    fontSize: '1rem',
                    cursor: 'pointer',
                  }}
                >
                  NEXT CUSTOMER CHECK-IN
                </button>
              </div>
            ) : verifiedResult ? (
              /* SUCCESS STATE 1: ARENA PASS VERIFIED */
              <div style={{ backgroundColor: '#1e293b', border: '2px solid #0284c7', padding: '24px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '16px', marginBottom: '20px' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#38bdf8', letterSpacing: '1px', display: 'block' }}>
                      ✓ ARENA PASS VERIFIED
                    </span>
                    <h3 style={{ margin: '4px 0 0 0', color: '#38bdf8', fontSize: '1.2rem' }}>
                      Booking #{verifiedResult.booking.bookingReference || verifiedResult.booking._id}
                    </h3>
                  </div>
                  <span style={{ backgroundColor: verifiedResult.booking.status === 'confirmed' ? '#0284c7' : '#475569', color: '#fff', padding: '6px 14px', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    {verifiedResult.booking.status.toUpperCase()}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase' }}>Game</span>
                    <strong style={{ color: '#ffffff', fontSize: '1rem' }}>{verifiedResult.booking.gameId?.title || 'Game'}</strong>
                  </div>
                  <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase' }}>Resource</span>
                    <strong style={{ color: '#38bdf8', fontSize: '1rem' }}>{verifiedResult.booking.resourceId?.name || 'Court'}</strong>
                  </div>
                </div>

                <div style={{ backgroundColor: '#0f172a', padding: '14px', borderRadius: '8px', border: '1px solid #334155', marginBottom: '20px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase' }}>Customer Details</span>
                  <div style={{ color: '#ffffff', fontWeight: 'bold', marginTop: '2px' }}>
                    {verifiedResult.booking.userId?.name || 'Customer'}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                    {verifiedResult.booking.userId?.email || 'N/A'}
                  </div>
                </div>

                {verifiedResult.validity && !verifiedResult.validity.eligible ? (
                  <div style={{ backgroundColor: '#450a0a', border: '1px solid #dc2626', color: '#fca5a5', padding: '14px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>
                    ❌ <strong>Check-In Blocked:</strong> {verifiedResult.validity.reason}
                  </div>
                ) : (
                  <button
                    onClick={handleConfirmCheckIn}
                    disabled={checkingIn}
                    aria-label="Check In Customer"
                    style={{
                      width: '100%',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      padding: '16px',
                      borderRadius: '8px',
                      fontSize: '1.1rem',
                      fontWeight: '800',
                      cursor: checkingIn ? 'not-allowed' : 'pointer',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {checkingIn ? 'Processing Check-In...' : '✔ CONFIRM CHECK-IN'}
                  </button>
                )}

                <button
                  onClick={handleResetScan}
                  style={{
                    width: '100%',
                    backgroundColor: 'transparent',
                    color: '#94a3b8',
                    border: '1px solid #334155',
                    padding: '10px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    marginTop: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel / Scan Next
                </button>
              </div>
            ) : verificationError ? (
              /* FAILURE STATE: INVALID QR / EXPIRED / ALREADY CHECKED IN */
              <div style={{ backgroundColor: '#450a0a', border: '2px solid #dc2626', padding: '24px', borderRadius: '12px', color: '#fca5a5' }}>
                <h3 style={{ margin: '0 0 12px 0', color: '#f87171', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={24} /> {verificationError.title}
                </h3>
                <p style={{ color: '#fecaca', margin: '0 0 16px 0', fontSize: '0.95rem' }}>
                  {verificationError.message}
                </p>

                <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '8px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fca5a5', display: 'block', marginBottom: '6px' }}>Possible reasons:</span>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: '#f87171' }}>
                    {verificationError.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={handleResetScan}
                  style={{
                    width: '100%',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    padding: '14px',
                    borderRadius: '8px',
                    fontWeight: '800',
                    fontSize: '1rem',
                    cursor: 'pointer',
                  }}
                >
                  [ SCAN AGAIN ]
                </button>
              </div>
            ) : (
              /* DEFAULT INITIAL SCAN PROMPT */
              <div style={{ backgroundColor: '#1e293b', padding: '40px 24px', borderRadius: '12px', border: '1px dashed #334155', textAlign: 'center', color: '#64748b' }}>
                <Camera size={48} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                <h3 style={{ margin: '0 0 6px 0', color: '#cbd5e1' }}>Ready to Scan Arena Pass</h3>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>
                  Hold customer QR code up to the camera or paste code on left to verify booking.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 2: MANUAL SEARCH LOOKUP */}
      {mode === 'search' && (
        <div>
          <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '12px', border: '1px solid #334155', marginBottom: '24px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#e2e8f0' }}>Lookup Booking Reference / Customer Details</h3>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search by ID, email, or phone (e.g. 64b8f0... or customer@email.com)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: '280px',
                  padding: '12px 16px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                }}
                required
              />
              <button
                type="submit"
                disabled={searchLoading}
                style={{
                  backgroundColor: '#0284c7',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                {searchLoading ? 'Searching...' : 'Search Booking'}
              </button>
            </form>
          </div>

          {searchError && (
            <div style={{ backgroundColor: '#450a0a', border: '1px solid #dc2626', color: '#fca5a5', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
              ⚠️ {searchError}
            </div>
          )}

          {searchResults !== null && !searchLoading && (
            <div>
              <h3 style={{ color: '#e2e8f0', marginBottom: '16px' }}>Results ({searchResults.length})</h3>
              {searchResults.length === 0 ? (
                <p style={{ color: '#94a3b8' }}>No bookings found matching query.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {searchResults.map((b) => (
                    <div key={b._id} style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '10px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '1.1rem' }}>{b.gameId?.title || 'Game'} – {b.resourceId?.name || 'Resource'}</h4>
                          <span style={{ backgroundColor: b.status === 'confirmed' ? '#0284c7' : '#475569', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                            {b.status.toUpperCase()}
                          </span>
                        </div>
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>
                          Customer: <strong>{b.userId?.name || 'Customer'}</strong> ({b.userId?.email || 'N/A'}) | Slot: {new Date(b.startAt).toLocaleString()}
                        </p>
                      </div>

                      {b.status === 'confirmed' && (
                        <button
                          onClick={() => handleSearchCheckIn(b._id)}
                          style={{
                            backgroundColor: '#16a34a',
                            color: '#fff',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '6px',
                            fontWeight: '700',
                            cursor: 'pointer',
                          }}
                        >
                          Check In Customer
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
