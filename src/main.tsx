import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

// registerType is "autoUpdate" (vite.config.ts) — calling this activates that
// behavior: once a new deploy's service worker is detected, it reloads the
// page onto the new bundle automatically instead of leaving open tabs/PWA
// instances stuck running stale JS against the current API indefinitely.
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(<App />);
