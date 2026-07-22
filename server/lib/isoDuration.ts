// Recipe.prepTime/cookTime/totalTime are stored as free-text French strings
// ("15 minutes", "1 h 30") for on-page display, but schema.org/Recipe expects
// ISO 8601 durations ("PT15M") for structured data. Unparseable or missing
// input returns null so the caller omits the property from JSON-LD entirely
// — a guessed duration in public structured data is worse than a missing one.
const ISO_DURATION_RE = /^PT(?:\d+H)?(?:\d+M)?(?:\d+S)?$/i;

export function toIsoDuration(input: string | null | undefined): string | null {
  if (!input) return null;

  const trimmed = input.trim();
  if (ISO_DURATION_RE.test(trimmed)) return trimmed.toUpperCase();

  const text = trimmed.toLowerCase();
  let hours = 0;
  let minutes = 0;
  let matched = false;

  // "1h30", "1 h 30", "1 heure 30" — hours with optional glued/spaced minutes.
  const withHours = text.match(/(\d+)\s*h(?:eures?)?\s*(\d{1,2})?/);
  if (withHours) {
    hours += parseInt(withHours[1], 10);
    if (withHours[2]) minutes += parseInt(withHours[2], 10);
    matched = true;
  }

  // Standalone minutes ("20 minutes", "45 min") — skip if already consumed
  // as the glued minutes part of an "Xh Y" match above.
  const minutesOnly = text.match(/(\d+)\s*min(?:utes?)?\b/);
  if (minutesOnly && !(withHours && withHours[2])) {
    minutes += parseInt(minutesOnly[1], 10);
    matched = true;
  }

  if (!matched || (hours === 0 && minutes === 0)) return null;

  let result = 'PT';
  if (hours > 0) result += `${hours}H`;
  if (minutes > 0) result += `${minutes}M`;
  return result;
}
