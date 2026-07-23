import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaInstallContextValue {
  // True once Chrome/Edge/Android have signaled the app is installable and
  // `promptInstall` will show the native dialog.
  canInstall: boolean;
  // iOS never fires `beforeinstallprompt` — callers need this to fall back
  // to "Share > Add to Home Screen" instructions instead of calling promptInstall.
  isIOS: boolean;
  isStandalone: boolean;
  promptInstall: () => Promise<void>;
}

const PwaInstallContext = createContext<PwaInstallContextValue | undefined>(undefined);

function isStandaloneDisplay() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

  useEffect(() => {
    setIsStandalone(isStandaloneDisplay());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <PwaInstallContext.Provider
      value={{ canInstall: deferredPrompt !== null, isIOS, isStandalone, promptInstall }}
    >
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall() {
  const context = useContext(PwaInstallContext);
  if (!context) throw new Error('usePwaInstall must be used within a PwaInstallProvider');
  return context;
}
