// Returns a human-readable relative time string (e.g. "2 days ago").
// Uses Intl.RelativeTimeFormat when available, with a manual fallback.
const rtf = typeof Intl !== 'undefined' && Intl.RelativeTimeFormat
  ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  : null;

const UNITS = [
  { unit: 'year',   ms: 365 * 24 * 3600 * 1000 },
  { unit: 'month',  ms: 30  * 24 * 3600 * 1000 },
  { unit: 'week',   ms: 7   * 24 * 3600 * 1000 },
  { unit: 'day',    ms: 24  * 3600 * 1000 },
  { unit: 'hour',   ms: 3600 * 1000 },
  { unit: 'minute', ms: 60  * 1000 },
];

export function relativeTime(dateString) {
  const diff = new Date(dateString) - Date.now();
  const absDiff = Math.abs(diff);

  for (const { unit, ms } of UNITS) {
    if (absDiff >= ms) {
      const value = Math.round(diff / ms);
      if (rtf) return rtf.format(value, unit);
      const abs = Math.abs(value);
      return value < 0 ? `${abs} ${unit}${abs !== 1 ? 's' : ''} ago` : `in ${abs} ${unit}${abs !== 1 ? 's' : ''}`;
    }
  }
  return 'just now';
}
