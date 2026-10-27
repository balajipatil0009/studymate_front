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
import {
  sessionsApi,
  type FocusSession,
  type HistorySession,
  type TodayStats,
} from '../api/sessions';
import { dateKey } from '../lib/format';
import { useAuth } from './AuthContext';

const STORAGE_PREFIX = 'studymate-perf-v2';
const LEGACY_KEY = 'studymate-perf-v1';
const GOAL_KEY = 'studymate-goal-v1';
const DEFAULT_GOAL = 120;
const HISTORY_DAYS = 365;

export type FocusMode = FocusSession['mode'];

/** Local session row: server id (once synced) + a client-side queue id. */
export interface LocalSession extends FocusSession {
  clientId: string;
  id?: string;
  sec: number;
  synced: boolean;
}

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
  sessions: LocalSession[];
  logSession: (mode: FocusMode, mins: number, completed: boolean) => void;
  logFocusSeconds: (seconds: number, completed?: boolean) => void;
  stats: PerfStats;
  todayStats: TodayStats | null;
  goal: number;
  changeGoal: (deltaMinutes: number) => void;
  /** Re-fetch history + today from the API. */
  refresh: (goal?: number) => Promise<void>;
  /** Re-fetch only the today/streak summary. */
  refreshToday: (goal?: number) => Promise<void>;
}

const PerformanceContext = createContext<PerformanceContextValue | null>(null);

function makeClientId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `c-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function storageKeyFor(userId?: string) {
  return `${STORAGE_PREFIX}:${userId ?? 'guest'}`;
}

function loadGoal(): number {
  const raw = Number(localStorage.getItem(GOAL_KEY));
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_GOAL;
}

function normalize(raw: Partial<LocalSession>): LocalSession | null {
  const mode = raw.mode;
  if (mode !== 'focus' && mode !== 'short' && mode !== 'long') return null;
  const ts = Number(raw.ts);
  const sec = Math.max(1, Math.round(Number(raw.sec ?? (Number(raw.mins) || 0) * 60)));
  if (!Number.isFinite(ts) || !Number.isFinite(sec)) return null;
  const mins = Number(raw.mins);
  return {
    clientId: typeof raw.clientId === 'string' && raw.clientId ? raw.clientId : makeClientId(),
    id: typeof raw.id === 'string' && raw.id ? raw.id : undefined,
    ts,
    mode,
    sec,
    mins: Number.isFinite(mins) && mins >= 0 ? mins : Math.round((sec / 60) * 10) / 10,
    completed: raw.completed !== false,
    synced: raw.synced === true,
  };
}

function load(key: string): LocalSession[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { sessions?: unknown };
    if (!Array.isArray(parsed.sessions)) return [];
    return parsed.sessions
      .map((s) => normalize(s as Partial<LocalSession>))
      .filter((s): s is LocalSession => s !== null)
      .sort((a, b) => a.ts - b.ts);
  } catch {
    return [];
  }
}

function save(key: string, sessions: LocalSession[]) {
  try {
    localStorage.setItem(key, JSON.stringify({ sessions }));
  } catch {
    /* storage full / private mode */
  }
}

/** Server history is the source of truth; keep pending local rows + older synced ones. */
function mergeServer(local: LocalSession[], server: HistorySession[]): LocalSession[] {
  const serverRows: LocalSession[] = server.map((s) => ({
    clientId: s.id,
    id: s.id,
    ts: s.ts,
    mode: s.mode,
    sec: s.sec,
    mins: s.mins,
    completed: s.completed,
    synced: true,
  }));

  const byId = new Map<string, LocalSession>();
  for (const s of serverRows) byId.set(s.clientId, s);

  // A pending row whose response was lost may already exist server-side.
  const onServer = (s: LocalSession) =>
    serverRows.some((x) => x.mode === s.mode && Math.abs(x.ts - s.ts) < 5000);

  for (const s of local) {
    if (s.synced && s.id) {
      if (!byId.has(s.id)) byId.set(s.id, s);
      continue;
    }
    if (onServer(s)) continue;
    if (!byId.has(s.clientId)) byId.set(s.clientId, s);
  }

  return [...byId.values()].sort((a, b) => a.ts - b.ts);
}

function computeStats(sessions: LocalSession[]): PerfStats {
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
  const { user, status } = useAuth();
  const storageKey = storageKeyFor(user?.id);

  const [sessions, setSessions] = useState<LocalSession[]>(() => load(storageKeyFor()));
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [goal, setGoal] = useState<number>(loadGoal);

  const storageKeyRef = useRef(storageKey);
  storageKeyRef.current = storageKey;
  const goalRef = useRef(goal);
  goalRef.current = goal;
  const syncingRef = useRef(false);

  // Drop the old seeded/demo log once; v2 starts clean and server-backed.
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  // Load the right bucket when the signed-in user changes.
  useEffect(() => {
    setSessions(load(storageKey));
    setHydratedKey(storageKey);
    setTodayStats(null);
  }, [storageKey]);

  // Persist only after the matching bucket has been loaded (avoids cross-user writes).
  useEffect(() => {
    if (hydratedKey !== storageKey) return;
    save(storageKey, sessions);
  }, [hydratedKey, storageKey, sessions]);

  const refreshToday = useCallback(async (nextGoal = goalRef.current) => {
    goalRef.current = nextGoal;
    const next = await sessionsApi.today(nextGoal);
    if (next) setTodayStats(next);
  }, []);

  const changeGoal = useCallback(
    (deltaMinutes: number) => {
      const next = Math.max(30, Math.min(600, goalRef.current + deltaMinutes));
      goalRef.current = next;
      setGoal(next);
      try {
        localStorage.setItem(GOAL_KEY, String(next));
      } catch {
        /* ignore */
      }
      void refreshToday(next);
    },
    [refreshToday],
  );

  const refresh = useCallback(
    async (goal = goalRef.current) => {
      const history = await sessionsApi.history(HISTORY_DAYS);
      if (history) setSessions((prev) => mergeServer(prev, history));
      await refreshToday(goal);
    },
    [refreshToday],
  );

  // Hydrate this account's history from the API.
  useEffect(() => {
    if (status !== 'authed') return;
    let cancelled = false;
    void (async () => {
      const history = await sessionsApi.history(HISTORY_DAYS);
      if (cancelled || !history) return;
      setSessions((prev) => mergeServer(prev, history));
      const next = await sessionsApi.today(goalRef.current);
      if (!cancelled && next) setTodayStats(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [status, storageKey]);

  // Push pending local sessions once; the effect re-runs as they become synced.
  useEffect(() => {
    if (status !== 'authed' || syncingRef.current) return;
    const pending = sessions.filter((s) => !s.synced);
    if (pending.length === 0) return;

    const runKey = storageKey;
    syncingRef.current = true;

    void (async () => {
      const updates = new Map<string, LocalSession>();
      const drop = new Set<string>();
      try {
        for (const s of pending) {
          const res = await sessionsApi.log(s.mode, s.sec, 0);
          if (!res) break; // offline: keep the rest queued for next time
          if (res.logged && res.id) {
            updates.set(s.clientId, {
              ...s,
              id: res.id,
              ts: res.createdAt ? Date.parse(res.createdAt) || s.ts : s.ts,
              sec: res.focusedSec,
              mins: Math.round((res.focusedSec / 60) * 10) / 10,
              completed: res.completed,
              synced: true,
            });
          } else {
            drop.add(s.clientId);
          }
        }

        if (storageKeyRef.current !== runKey) return;
        if (updates.size === 0 && drop.size === 0) return;

        setSessions((prev) =>
          prev
            .filter((s) => !drop.has(s.clientId))
            .map((s) => updates.get(s.clientId) ?? s),
        );
        await refreshToday();
      } finally {
        syncingRef.current = false;
      }
    })();
  }, [sessions, status, storageKey, refreshToday]);

  const addSession = useCallback((mode: FocusMode, seconds: number, completed: boolean) => {
    const sec = Math.max(1, Math.round(seconds));
    setSessions((prev) => [
      ...prev,
      {
        clientId: makeClientId(),
        ts: Date.now(),
        mode,
        sec,
        mins: Math.round((sec / 60) * 10) / 10,
        completed,
        synced: false,
      },
    ]);
  }, []);

  const logSession = useCallback(
    (mode: FocusMode, mins: number, completed: boolean) => addSession(mode, mins * 60, completed),
    [addSession],
  );

  const logFocusSeconds = useCallback(
    (seconds: number, completed = true) => addSession('focus', seconds, completed),
    [addSession],
  );

  const stats = useMemo(() => computeStats(sessions), [sessions]);

  const value = useMemo(
    () => ({
      sessions,
      logSession,
      logFocusSeconds,
      stats,
      todayStats,
      goal,
      changeGoal,
      refresh,
      refreshToday,
    }),
    [
      sessions,
      logSession,
      logFocusSeconds,
      stats,
      todayStats,
      goal,
      changeGoal,
      refresh,
      refreshToday,
    ],
  );

  return <PerformanceContext.Provider value={value}>{children}</PerformanceContext.Provider>;
}

export function usePerformance(): PerformanceContextValue {
  const ctx = useContext(PerformanceContext);
  if (!ctx) throw new Error('usePerformance must be used inside <PerformanceProvider>');
  return ctx;
}
