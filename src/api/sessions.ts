import { http } from './http';

export interface FocusSession {
  ts: number;
  mode: 'focus' | 'short' | 'long';
  mins: number;
  completed: boolean;
}

/** One row from GET /v1/sessions. */
export interface HistorySession {
  id: string;
  ts: number;
  mode: FocusSession['mode'];
  sec: number;
  mins: number;
  completed: boolean;
}

export interface SessionLogResult {
  logged: boolean;
  id: string | null;
  mode: FocusSession['mode'];
  plannedSec: number;
  focusedSec: number;
  completed: boolean;
  createdAt?: string;
}

export interface TodayStats {
  sessions: number;
  minutes: number;
  streakDays: number;
  pctBloomed: number;
}

export const sessionsApi = {
  /** Persists one countdown/work focus block; returns null when offline. */
  async log(
    mode: FocusSession['mode'],
    totalSec: number,
    remainingSec = 0,
  ): Promise<SessionLogResult | null> {
    try {
      return await http.post<SessionLogResult>('/sessions', { mode, totalSec, remainingSec });
    } catch {
      return null;
    }
  },

  async history(days = 365): Promise<HistorySession[] | null> {
    try {
      const res = await http.get<{ sessions: HistorySession[] }>(`/sessions?days=${days}`);
      return res.sessions;
    } catch {
      return null;
    }
  },

  async today(goalMinutes = 120): Promise<TodayStats | null> {
    try {
      return await http.get<TodayStats>(`/stats/today?goal=${goalMinutes}`);
    } catch {
      return null;
    }
  },
};
