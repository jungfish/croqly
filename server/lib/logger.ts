// Structured (JSON-line) logging — easy to grep in Vercel's log viewer today,
// easy to pipe into a real APM later without touching every call site.
type Level = 'info' | 'error';

function log(level: Level, message: string, meta: Record<string, unknown> = {}): void {
  const entry = { level, message, timestamp: new Date().toISOString(), ...meta };
  (level === 'error' ? console.error : console.log)(JSON.stringify(entry));
}

export function logError(message: string, error: unknown, meta: Record<string, unknown> = {}): void {
  log('error', message, {
    ...meta,
    error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
  });
}

export function logInfo(message: string, meta: Record<string, unknown> = {}): void {
  log('info', message, meta);
}
