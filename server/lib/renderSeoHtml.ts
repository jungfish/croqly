import * as fs from 'fs';
import path from 'path';

// The app is a client-rendered SPA (see server/app.ts's catch-all). Google
// still executes JS, but social-preview bots (Facebook, WhatsApp, Discord,
// X) do not — so the two public, SEO-critical routes (recipe + creator hub)
// get their <title>/meta/JSON-LD injected into the HTML *before* it's sent,
// instead of relying on a client-side-only <script> tag. React hydrates
// normally afterward and renders the same content, so there's no divergence.
let templateCache: string | null = null;

function loadTemplate(distDir: string): string {
  if (templateCache) return templateCache;
  templateCache = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');
  return templateCache;
}

// Prevents a JSON-LD payload containing "</script>" (e.g. inside a recipe
// title or instruction text) from closing the script tag early.
function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

// Recipe titles/descriptions originate from scraped Instagram captions —
// untrusted third-party text — and land directly in HTML attributes and
// text nodes here, so they need escaping like any other user-controlled input.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface SeoHtmlOptions {
  distDir: string;
  title: string;
  description: string;
  url: string;
  image?: string | null;
  jsonLd: unknown[];
}

export function renderSeoHtml({ distDir, title, description, url, image, jsonLd }: SeoHtmlOptions): string {
  const template = loadTemplate(distDir);

  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeUrl = escapeHtml(url);
  const safeImage = image ? escapeHtml(image) : null;

  const jsonLdTags = jsonLd
    .map((entry) => `<script type="application/ld+json">${safeJsonLd(entry)}</script>`)
    .join('\n    ');

  const metaTags = `
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDescription}" />
    <link rel="canonical" href="${safeUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDescription}" />
    <meta property="og:url" content="${safeUrl}" />
    ${safeImage ? `<meta property="og:image" content="${safeImage}" />` : ''}
    <meta name="twitter:card" content="${safeImage ? 'summary_large_image' : 'summary'}" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDescription}" />
    ${safeImage ? `<meta name="twitter:image" content="${safeImage}" />` : ''}
    ${jsonLdTags}
  `;

  return template
    .replace(/<title>.*?<\/title>/i, '')
    .replace(/<meta name="description"[^>]*>/i, '')
    .replace('</head>', `${metaTags}\n  </head>`);
}
