import { useEffect } from 'react';

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

// Instagram's official embed widget — same blockquote+script Instagram's own
// "Embed" button generates, so a Reel is displayed through their sanctioned
// widget instead of replaying our own downloaded copy of it. embed.js scans
// and processes every .instagram-media blockquote on its own once loaded, so
// a fresh load needs nothing further; only a later mount (script already
// present from an earlier embed) needs an explicit re-process.
const InstagramEmbed = ({ url }: { url: string }) => {
  useEffect(() => {
    if (window.instgrm) {
      window.instgrm.Embeds.process();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://www.instagram.com/embed.js';
    script.async = true;
    document.body.appendChild(script);
  }, [url]);

  return (
    <blockquote
      className="instagram-media"
      data-instgrm-permalink={url}
      data-instgrm-version="14"
      style={{ margin: 0, width: '100%' }}
    />
  );
};

export default InstagramEmbed;
