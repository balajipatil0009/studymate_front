// ---------- formatting helpers (port of flutter_app/lib/theme.dart) ----------

/** 45 -> "45 min", 90 -> "1.5 h", 60 -> "1 h", 0/undefined -> "" */
export function fmtTime(min?: number | null): string {
  const n = Number(min ?? 0);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n < 60) return `${Math.round(n)} min`;
  const h = Math.round((n / 60) * 10) / 10;
  if (h === Math.round(h)) return `${Math.round(h)} h`;
  return `${h} h`;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** 3722 -> "1:02:02", 275 -> "04:35" */
export function fmtClock(sec?: number | null): string {
  const s = Math.max(0, Math.floor(Number(sec ?? 0)));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(ss)}` : `${pad2(m)}:${pad2(ss)}`;
}

/** 83 -> "01:23" */
export function fmtMMSS(s: number): string {
  const sec = Math.max(0, Math.floor(s));
  return `${pad2(Math.floor(sec / 60))}:${pad2(sec % 60)}`;
}

/** Community/my rating label: 4.7 -> "4.7", 4 -> "4" */
export function ratingLabel(r: number | null | undefined): string {
  const n = Number(r ?? 0);
  if (!Number.isFinite(n) || n <= 0) return '';
  return Number.isInteger(n) ? n.toFixed(1) : String(n);
}

export function clampRating(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1 || n > 5) return 0;
  return Math.round(n * 10) / 10;
}

export function hostOf(url?: string | null): string {
  if (!url) return 'roadmap';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function fmtDate(ts?: number | null): string {
  if (!ts) return '';
  return new Date(ts).toLocaleString();
}

/** "Monday, September 28" — header date pill on Performance. */
export function liveDate(): string {
  const now = new Date();
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${days[(now.getDay() + 6) % 7]}, ${months[now.getMonth()]} ${now.getDate()}`;
}

export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
