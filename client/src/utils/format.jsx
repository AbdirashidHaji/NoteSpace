/** Date helpers (API returns "YYYY-MM-DD HH:MM:SS" strings, UTC-naive local insert). */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(String(dateStr).replace(' ', 'T') + (String(dateStr).includes('Z') ? '' : 'Z'));
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(String(dateStr).replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "Just now", "5m ago", "2d ago", else formatted date. */
export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(String(dateStr).replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return String(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

/** Strip HTML to plain text. */
export function htmlToText(html) {
  const div = document.createElement('div');
  div.innerHTML = String(html || '');
  return div.textContent || div.textContent === '' ? div.textContent : '';
}

export function wordCount(text) {
  const t = (text || '').trim();
  return t ? t.split(/\s+/).length : 0;
}

/** First initials for avatar. */
export function initials(name) {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-rose-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-sky-500', 'bg-fuchsia-500', 'bg-teal-500',
];

export function avatarColor(seed) {
  let hash = 0;
  const s = String(seed || '');
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** Highlight query matches in plain text; returns JSX-friendly segments. */
export function highlightSegments(text, query) {
  if (!query || !text) return null;
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${safe})`, 'ig');
  const parts = String(text).split(regex);
  if (parts.length === 1) return null;
  return parts.map((part, i) =>
    regex.test(part) && part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="hl">{part}</mark>
    ) : (
      part
    )
  );
}
