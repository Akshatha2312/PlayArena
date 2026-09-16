import { useState, useEffect } from 'react';

/**
 * Custom hook to track browser online/offline status.
 * Listens to native browser events ('online', 'offline').
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export default useOnlineStatus;
