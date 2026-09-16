import React from 'react';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { Download, X } from 'lucide-react';

export function PwaInstallBanner() {
  const { isInstallable, installPwa, dismissPrompt } = usePwaInstall();

  if (!isInstallable) {
    return null;
  }

  return (
    <div
      id="pwa-install-banner"
      role="region"
      aria-label="App installation notification"
      style={{
        backgroundColor: '#1e293b',
        color: '#f8fafc',
        padding: '0.75rem 1rem',
        borderBottom: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        zIndex: 9998,
        position: 'relative'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 280px' }}>
        <Download style={{ width: '1.25rem', height: '1.25rem', color: '#38bdf8', flexShrink: 0 }} />
        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
          Install Play Arena for a faster, full-screen app experience on your device.
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          id="pwa-install-btn"
          onClick={installPwa}
          style={{
            backgroundColor: '#0284c7',
            color: '#ffffff',
            border: 'none',
            padding: '0.375rem 0.875rem',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          Install App
        </button>
        <button
          id="pwa-install-dismiss-btn"
          onClick={dismissPrompt}
          aria-label="Dismiss install prompt"
          style={{
            backgroundColor: 'transparent',
            color: '#94a3b8',
            border: 'none',
            padding: '0.375rem',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X style={{ width: '1.25rem', height: '1.25rem' }} />
        </button>
      </div>
    </div>
  );
}

export default PwaInstallBanner;
