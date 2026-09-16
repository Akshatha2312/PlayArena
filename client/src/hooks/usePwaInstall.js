import { useState, useEffect } from 'react';

/**
 * Custom hook to handle PWA installation state and prompt.
 */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('playarena_pwa_dismissed') === 'true';
  });

  useEffect(() => {
    // Check if app is already running in standalone mode (installed)
    const checkStandalone = () => {
      const isStandaloneMode =
        (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        (typeof navigator !== 'undefined' && navigator.standalone === true) ||
        (typeof document !== 'undefined' && document.referrer && document.referrer.includes('android-app://'));
      setIsStandalone(Boolean(isStandaloneMode));
    };

    checkStandalone();

    const handleBeforeInstallPrompt = (e) => {
      // Prevent automatic mini-infobar in browsers
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      setIsStandalone(true);
      console.log('Play Arena PWA was successfully installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installPwa = async () => {
    if (!deferredPrompt) return false;

    // Show native prompt
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
      return true;
    } else {
      console.log('User dismissed PWA install prompt');
      return false;
    }
  };

  const dismissPrompt = () => {
    setIsDismissed(true);
    localStorage.setItem('playarena_pwa_dismissed', 'true');
  };

  return {
    isInstallable: isInstallable && !isStandalone && !isDismissed,
    isStandalone,
    installPwa,
    dismissPrompt,
  };
}

export default usePwaInstall;
