import { useEffect } from 'react';

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

const EMBED_SCRIPT_SRC = 'https://www.instagram.com/embed.js';

function loadEmbedScript(): Promise<void> {
  if (window.instgrm) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${EMBED_SCRIPT_SRC}"]`);
  if (existing) {
    return new Promise((resolve) => existing.addEventListener('load', () => resolve()));
  }
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = EMBED_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    document.body.appendChild(script);
  });
}

// Instagram's official embed widget (the same blockquote+script Instagram's
// own "Embed" button generates) — used instead of replaying our own
// downloaded copy of the Reel, since displaying someone else's Instagram
// post through their sanctioned widget is the compliant way to do it.
const InstagramEmbed = ({ url }: { url: string }) => {
  useEffect(() => {
    let cancelled = false;
    loadEmbedScript().then(() => {
      if (!cancelled) window.instgrm?.Embeds.process();
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="w-full flex justify-center">
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{ background: '#FFF', border: 0, borderRadius: '12px', margin: 0, maxWidth: '360px', width: '100%' }}
      />
    </div>
  );
};

export default InstagramEmbed;
