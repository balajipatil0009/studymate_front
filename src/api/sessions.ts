import { http, ApiError } from './http';

// The NestJS `sessions` / `stats` controllers are still stubs (501). We call
// them when possible and fall back to the local session log so the
// Performance tab always has data — same behavior as the Flutter app.

export interface FocusSession {
  ts: number;
  mode: 'focus' | 'short' | 'long';
  mins: number;
  completed: boolean;
}

export interface TodayStats {
  sessions: number;
  minutes: number;
  streakDays: number;
}

export const sessionsApi = {
  /** Returns true when the server accepted the session. */
  async log(mode: FocusSession['mode'], totalSec: number, remainingSec: number) {
    try {
      await http.post('/sessions', { mode, totalSec, remainingSec });
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 501) return false;
      return false;
    }
  },

  async today(): Promise<TodayStats | null> {
    try {
      return await http.get<TodayStats>('/stats/today');
    } catch {
      return null;
    }
  },
};
