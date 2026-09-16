import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';

export function PwaUpdatePrompt({ forceNeedRefresh, onUpdate }) {
  let needRefresh = false;
  let updateServiceWorker = () => {};

  try {
    const swResult = useRegisterSW({
      onRegistered(r) {
        console.log('SW Registered:', r);
      },
      onRegisterError(error) {
        console.error('SW registration error', error);
      }
    });
    if (swResult && swResult.needRefresh) {
      needRefresh = swResult.needRefresh[0];
      updateServiceWorker = swResult.updateServiceWorker;
    }
  } catch (e) {
    // Virtual module handling in testing environments
  }

  const showPrompt = forceNeedRefresh !== undefined ? forceNeedRefresh : needRefresh;

  if (!showPrompt) {
    return null;
  }

  const handleUpdate = () => {
    if (onUpdate) {
      onUpdate();
    } else {
      updateServiceWorker(true);
    }
  };

  return (
    <div
      id="pwa-update-prompt"
      role="alert"
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        padding: '1rem 1.25rem',
        borderRadius: '0.5rem',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
        border: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        gap: '0.875rem',
        zIndex: 10000,
        maxWidth: '90vw'
      }}
    >
      <RefreshCw style={{ width: '1.25rem', height: '1.25rem', color: '#38bdf8', flexShrink: 0 }} />
      <div style={{ fontSize: '0.875rem' }}>
        <strong>Update Available!</strong> A new version of Play Arena is ready.
      </div>
      <button
        id="pwa-update-btn"
        onClick={handleUpdate}
        style={{
          backgroundColor: '#0284c7',
          color: '#ffffff',
          border: 'none',
          padding: '0.375rem 0.75rem',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap'
        }}
      >
        Refresh
      </button>
    </div>
  );
}

export default PwaUpdatePrompt;
