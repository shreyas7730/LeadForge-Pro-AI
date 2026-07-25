/** Date formatting helpers — Phase 2 */

export function formatTimestamp(ms: number): string {
  return new Date(ms).toISOString();
}

export function formatDisplayDate(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelative(ms: number, now = Date.now()): string {
  const diff = now - ms;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

export function toDateKey(ms: number = Date.now()): string {
  return new Date(ms).toISOString().slice(0, 10);
}
