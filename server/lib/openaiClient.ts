import OpenAI from 'openai';

// Single shared client — reads OPENAI_API_KEY from env. Server-side only;
// never import this from anything that ships to the browser.
//
// Lazily constructed: `new OpenAI()` throws immediately if OPENAI_API_KEY is
// missing, which would otherwise crash the whole server (including routes
// that don't need AI) before it's configured in .env.
let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (client) return client;
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set — add it to .env to use AI features.');
  }
  client = new OpenAI();
  return client;
}
