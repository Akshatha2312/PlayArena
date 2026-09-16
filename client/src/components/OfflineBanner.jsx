import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, AlertTriangle } from 'lucide-react';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="alert"
      id="offline-banner"
      style={{
        backgroundColor: '#991b1b',
        color: '#fef2f2',
        padding: '0.75rem 1rem',
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        fontSize: '0.875rem',
        fontWeight: 500,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
        borderBottom: '1px solid #7f1d1d'
      }}
    >
      <WifiOff style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }} />
      <div>
        <strong>You're offline.</strong> Some Play Arena features require an internet connection. Your app is still available, but bookings and payments require connectivity.
      </div>
    </div>
  );
}

export default OfflineBanner;
