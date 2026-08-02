import { authFetch } from '@/lib/apiClient';

async function parseErrorOr(response: Response, fallback: string): Promise<never> {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || fallback);
}

// Public endpoint (no auth required server-side) — still routed through
// authFetch just for consistency with the rest of this file.
export async function fetchVapidPublicKey(): Promise<string | null> {
  const response = await authFetch('/api/push/vapid-public-key');
  if (!response.ok) return null;
  const { publicKey } = await response.json();
  return publicKey ?? null;
}

// PushManager.subscribe wants the VAPID key as a Uint8Array, but the server
// hands it over as the usual base64url string — this is the standard
// conversion recipe (see https://vapidkeys.com or the web.dev push guide).
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64Safe);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export async function subscribeToPush(registration: ServiceWorkerRegistration): Promise<void> {
  const publicKey = await fetchVapidPublicKey();
  if (!publicKey) throw new Error('Les notifications ne sont pas configurées.');

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  const json = subscription.toJSON();
  const response = await authFetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });
  if (!response.ok) return parseErrorOr(response, "Échec de l'activation des notifications");
}

export async function unsubscribeFromPush(registration: ServiceWorkerRegistration): Promise<void> {
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  await subscription.unsubscribe();
  await authFetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  }).catch(() => {});
}
