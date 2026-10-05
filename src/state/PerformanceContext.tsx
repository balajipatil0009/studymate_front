import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { sessionsApi, type FocusSession } from '../api/sessions';
import { dateKey } from '../lib/format';

const STORAGE_KEY = 'studymate-perf-v1';
export type FocusMode = FocusSession['mode'];

export interface PerfStats {
  totalMins: number;
  bestDay: number;
  streak: number;
  totalSessions: number;
  counts: Record<FocusMode, number>;
  /** "YYYY-MM-DD" -> focus minutes */
  byDay: Record<string, number>;
  last7: { date: string; mins: number; dow: number }[];
}

interface PerformanceContextValue {
  sessions: FocusSession[];
  logSession: (mode: FocusMode, mins: number, completed: boolean) => void;
  resetDemoData: () => void;
  stats: PerfStats;
}

const PerformanceContext = createContext<PerformanceContextValue | null>(null);

function load(): FocusSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { sessions?: FocusSession[] };
    return Array.isArray(parsed.sessions) ? parsed.sessions : [];
  } catch {
    return [];
  }
}

function save(sessions: FocusSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions }));
  } catch {
    /* storage full / private mode — stats stay in memory */
  }
}

/** Same generator as the Flutter app so the heatmap never looks empty. */
function seedDemo(): FocusSession[] {
  const now = Date.now();
  const dayMs = 86_400_000;
  const out: FocusSession[] = [];
  for (let back = 65; back >= 0; back--) {
    if (Math.random() < 0.18 && back > 3) continue;
    const dayBase = now - back * dayMs;
    const count = 1 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      const r = Math.random();
      const mode: FocusMode = r < 0.68 ? 'focus' : r < 0.84 ? 'short' : 'long';
      const opts =
        mode === 'focus' ? [25, 25, 25, 45, 60] : mode === 'short' ? [5, 5, 5] : [15, 20];
      out.push({
        ts: dayBase + i * 3_000_000 + Math.floor(Math.random() * 1_800_000),
        mode,
        mins: opts[Math.floor(Math.random() * opts.length)],
        completed: Math.random() < 0.88,
      });
    }
  }
  return out;
}

function computeStats(sessions: FocusSession[]): PerfStats {
  const completed = sessions.filter((s) => s.completed);
  const focus = completed.filter((s) => s.mode === 'focus');

  const byDay: Record<string, number> = {};
  for (const s of focus) {
    const key = dateKey(new Date(s.ts));
    byDay[key] = (byDay[key] ?? 0) + s.mins;
  }

  const totalMins = focus.reduce((sum, s) => sum + s.mins, 0);
  const bestDay = Object.values(byDay).reduce((max, v) => Math.max(max, v), 0);

  const now = new Date();
  let streak = 0;
  for (let i = 0; i <= 365; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    if ((byDay[dateKey(d)] ?? 0) > 0) {
      streak++;
    } else if (i === 0) {
      continue; // today may not have a session yet — check yesterday
    } else {
      break;
    }
  }

  const counts: Record<FocusMode, number> = { focus: 0, short: 0, long: 0 };
  for (const s of completed) counts[s.mode] = (counts[s.mode] ?? 0) + 1;

  const last7: PerfStats['last7'] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    last7.push({ date: dateKey(d), mins: byDay[dateKey(d)] ?? 0, dow: d.getDay() });
  }

  return { totalMins, bestDay, streak, totalSessions: focus.length, counts, byDay, last7 };
}

export function PerformanceProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<FocusSession[]>(() => {
    const stored = load();
    if (stored.length) return stored;
    const seeded = seedDemo();
    save(seeded);
    return seeded;
  });

  // Fire-and-forget: the /v1/sessions endpoint is still a stub (501 today).
  const posted = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (sessions.length === 0) return;
    const last = sessions[sessions.length - 1];
    if (posted.current.has(last.ts)) return;
    posted.current.add(last.ts);
    void sessionsApi.log(last.mode, last.mins * 60, 0);
  }, [sessions]);

  const logSession = useCallback((mode: FocusMode, mins: number, completed: boolean) => {
    setSessions((prev) => {
      const next = [...prev, { ts: Date.now(), mode, mins, completed }];
      save(next);
      return next;
    });
  }, []);

  const resetDemoData = useCallback(() => {
    const seeded = seedDemo();
    save(seeded);
    setSessions(seeded);
  }, []);

  const stats = useMemo(() => computeStats(sessions), [sessions]);

  const value = useMemo(
    () => ({ sessions, logSession, resetDemoData, stats }),
    [sessions, logSession, resetDemoData, stats],
  );

  return <PerformanceContext.Provider value={value}>{children}</PerformanceContext.Provider>;
}

export function usePerformance(): PerformanceContextValue {
  const ctx = useContext(PerformanceContext);
  if (!ctx) throw new Error('usePerformance must be used inside <PerformanceProvider>');
  return ctx;
}
