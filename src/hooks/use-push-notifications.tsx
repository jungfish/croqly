import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { subscribeToPush, unsubscribeFromPush } from '@/services/pushService';

interface PushNotificationsContextValue {
  // Whether the browser even supports the Push API — Safari on macOS and
  // any non-HTTPS context don't, so callers should hide the toggle entirely
  // rather than show it disabled.
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

const PushNotificationsContext = createContext<PushNotificationsContextValue | undefined>(undefined);

function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

export function PushNotificationsProvider({ children }: { children: ReactNode }) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isSupported = isPushSupported();

  useEffect(() => {
    if (!isSupported) return;
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setIsSubscribed(subscription !== null))
      .catch(() => {});
  }, [isSupported]);

  const subscribe = async () => {
    if (!isSupported) return;
    setIsLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      const registration = await navigator.serviceWorker.ready;
      await subscribeToPush(registration);
      setIsSubscribed(true);
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!isSupported) return;
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      await unsubscribeFromPush(registration);
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PushNotificationsContext.Provider value={{ isSupported, isSubscribed, isLoading, subscribe, unsubscribe }}>
      {children}
    </PushNotificationsContext.Provider>
  );
}

export function usePushNotifications() {
  const context = useContext(PushNotificationsContext);
  if (!context) throw new Error('usePushNotifications must be used within a PushNotificationsProvider');
  return context;
}
