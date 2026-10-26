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
import { useWorkspace } from './WorkspaceContext';
import { usePerformance, type FocusMode } from './PerformanceContext';

const WORK_KEY = 'studymate-work-v1';
const SYNC_EVERY_SEC = 10;

export interface WorkBinding {
  uid: string;
  personalId: string;
  originTrackId: string;
  originModuleId: string;
  title: string;
  goal: number; // estMinutes, 0 = unlimited
  elapsedSec: number;
}

interface TimerContextValue {
  // ---- countdown ----
  mode: FocusMode;
  totalSec: number;
  remaining: number;
  countdownRunning: boolean;
  startLabel: string;
  hint: string;
  selectMode: (m: FocusMode) => void;
  adjustMinutes: (delta: number) => void;
  setPreset: (minutes: number) => void;
  toggleCountdown: () => void;
  resetCountdown: () => void;

  // ---- work stopwatch (bound to a To-Do item) ----
  work: WorkBinding | null;
  workElapsed: number;
  workRunning: boolean;
  startWork: (binding: WorkBinding) => void;
  toggleWork: () => void;
  pauseWork: () => void;
  resetWork: () => void;
  completeWork: () => Promise<void>;
  leaveWork: () => Promise<void>;
}

const TimerContext = createContext<TimerContextValue | null>(null);

const MODES: Record<FocusMode, { label: string; minutes: number; hint: string }> = {
  focus: { label: 'FOCUS', minutes: 25, hint: 'Tap start to begin your session' },
  short: { label: 'SHORT BREAK', minutes: 5, hint: 'Take a breather — 5 minutes' },
  long: { label: 'LONG BREAK', minutes: 15, hint: 'Recharge — 15 minutes' },
};

function loadWork(): WorkBinding | null {
  try {
    const raw = localStorage.getItem(WORK_KEY);
    return raw ? (JSON.parse(raw) as WorkBinding) : null;
  } catch {
    return null;
  }
}

function saveWork(work: WorkBinding | null) {
  try {
    if (work) localStorage.setItem(WORK_KEY, JSON.stringify(work));
    else localStorage.removeItem(WORK_KEY);
  } catch {
    /* ignore */
  }
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const { setStatus, saveElapsed, refresh } = useWorkspace();
  const { logSession } = usePerformance();

  // ---------- countdown ----------
  const [countdown, setCountdown] = useState(() => {
    const minutes = MODES.focus.minutes;
    return { mode: 'focus' as FocusMode, total: minutes * 60, remaining: minutes * 60, running: false };
  });
  const { mode, total: totalSec, remaining } = countdown;

  useEffect(() => {
    if (!countdown.running) return;
    const id = window.setInterval(() => {
      setCountdown((c) => {
        if (c.remaining <= 1) return { ...c, remaining: 0, running: false };
        return { ...c, remaining: c.remaining - 1 };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [countdown.running]);

  // Session finished (remaining hit 0): log it once and nudge the user.
  const loggedRef = useRef(false);
  useEffect(() => {
    if (countdown.remaining === 0 && !countdown.running) {
      if (loggedRef.current) return;
      loggedRef.current = true;
      logSession(countdown.mode, Math.round(countdown.total / 60), true);
      navigator.vibrate?.(180);
    } else {
      loggedRef.current = false;
    }
  }, [countdown, logSession]);

  const selectMode = useCallback((m: FocusMode) => {
    const minutes = MODES[m].minutes;
    setCountdown({ mode: m, total: minutes * 60, remaining: minutes * 60, running: false });
  }, []);

  const adjustMinutes = useCallback((delta: number) => {
    setCountdown((c) => {
      const total = Math.min(180 * 60, Math.max(60, c.total + delta * 60));
      return { ...c, total, remaining: Math.min(c.remaining + delta * 60, total), running: false };
    });
  }, []);

  const setPreset = useCallback((minutes: number) => {
    setCountdown((c) => ({ ...c, total: minutes * 60, remaining: minutes * 60, running: false }));
  }, []);

  const toggleCountdown = useCallback(() => {
    setCountdown((c) => {
      if (c.remaining <= 0) return { ...c, remaining: c.total, running: true };
      return { ...c, running: !c.running };
    });
  }, []);

  const resetCountdown = useCallback(() => {
    setCountdown((c) => ({ ...c, remaining: c.total, running: false }));
  }, []);

  // ---------- work stopwatch (bound to a To-Do item) ----------
  const [work, setWork] = useState<WorkBinding | null>(() => loadWork());
  const [workElapsed, setWorkElapsed] = useState(() => loadWork()?.elapsedSec ?? 0);
  const [workRunning, setWorkRunning] = useState(false);
  const workRef = useRef<WorkBinding | null>(work);
  const elapsedRef = useRef<number>(work?.elapsedSec ?? 0);
  const ticksRef = useRef(0);
  workRef.current = work;

  // ---------- work stopwatch ticking ----------
  useEffect(() => {
    if (!workRunning || !work) return;
    const id = window.setInterval(() => {
      elapsedRef.current += 1;
      setWorkElapsed(elapsedRef.current);
      ticksRef.current += 1;
      const current = workRef.current;
      if (current && ticksRef.current % SYNC_EVERY_SEC === 0) {
        void saveElapsed(current.uid, elapsedRef.current);
        saveWork({ ...current, elapsedSec: elapsedRef.current });
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [workRunning, work, saveElapsed]);

  const startWork = useCallback(
    (binding: WorkBinding) => {
      setWork(binding);
      elapsedRef.current = binding.elapsedSec;
      setWorkElapsed(binding.elapsedSec);
      saveWork(binding);
      setWorkRunning(true);
      ticksRef.current = 0;
      void saveElapsed(binding.uid, binding.elapsedSec);
    },
    [saveElapsed],
  );

  const persistElapsed = useCallback(
    (uid: string, elapsed: number) => {
      void saveElapsed(uid, elapsed);
    },
    [saveElapsed],
  );

  const toggleWork = useCallback(() => {
    setWorkRunning((run) => {
      const next = !run;
      const current = workRef.current;
      if (!next && current) {
        persistElapsed(current.uid, elapsedRef.current);
        saveWork({ ...current, elapsedSec: elapsedRef.current });
      }
      return next;
    });
  }, [persistElapsed]);

  const pauseWork = useCallback(() => {
    setWorkRunning((run) => {
      if (run) {
        const current = workRef.current;
        if (current) {
          persistElapsed(current.uid, elapsedRef.current);
          saveWork({ ...current, elapsedSec: elapsedRef.current });
        }
      }
      return false;
    });
  }, [persistElapsed]);

  const resetWork = useCallback(() => {
    elapsedRef.current = 0;
    setWorkElapsed(0);
    const current = workRef.current;
    if (current) {
      saveWork({ ...current, elapsedSec: 0 });
      persistElapsed(current.uid, 0);
    }
  }, [persistElapsed]);

  const clearWork = useCallback(() => {
    setWorkRunning(false);
    setWork(null);
    elapsedRef.current = 0;
    setWorkElapsed(0);
    saveWork(null);
  }, []);

  const completeWork = useCallback(async () => {
    const current = workRef.current;
    clearWork();
    if (current) {
      try {
        await setStatus(current.uid, 'completed');
      } catch {
        /* offline — the item stays active locally */
      }
    }
    await refresh();
  }, [clearWork, setStatus, refresh]);

  const leaveWork = useCallback(async () => {
    const current = workRef.current;
    if (current) persistElapsed(current.uid, elapsedRef.current);
    clearWork();
    await refresh();
  }, [clearWork, persistElapsed, refresh]);

  const countdownRunning = countdown.running;

  const startLabel = countdownRunning
    ? 'Pause'
    : remaining < totalSec
      ? remaining === 0
        ? 'Restart'
        : 'Resume'
      : 'Start';

  const hint = countdownRunning
    ? 'Stay in flow — you got this'
    : remaining === 0
      ? 'Done. Nice work.'
      : remaining < totalSec
        ? 'Paused — tap resume when ready'
        : MODES[mode].hint;

  const value = useMemo(
    () => ({
      mode,
      totalSec,
      remaining,
      countdownRunning,
      startLabel,
      hint,
      selectMode,
      adjustMinutes,
      setPreset,
      toggleCountdown,
      resetCountdown,
      work,
      workElapsed,
      workRunning,
      startWork,
      toggleWork,
      pauseWork,
      resetWork,
      completeWork,
      leaveWork,
    }),
    [
      mode,
      totalSec,
      remaining,
      countdownRunning,
      startLabel,
      hint,
      selectMode,
      adjustMinutes,
      setPreset,
      toggleCountdown,
      resetCountdown,
      work,
      workElapsed,
      workRunning,
      startWork,
      toggleWork,
      pauseWork,
      resetWork,
      completeWork,
      leaveWork,
    ],
  );

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer(): TimerContextValue {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used inside <TimerProvider>');
  return ctx;
}
