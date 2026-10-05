// Tiny fetch wrapper: base URL, bearer token, single-flight refresh on 401.

const BASE = (import.meta.env.VITE_API_URL as string | undefined) || '/v1';

const ACCESS_KEY = 'studymate-access';
const REFRESH_KEY = 'studymate-refresh';

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

/** Fired when the session can no longer be refreshed. */
export const AUTH_EXPIRED_EVENT = 'studymate:auth-expired';

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface RequestOptions {
  method?: Method;
  body?: unknown;
  /** Send the bearer token when present (default true). Catalog reads are
   * public but still benefit: the API returns myRating/canRate when a token
   * is attached. */
  auth?: boolean;
  signal?: AbortSignal;
}

async function raw(path: string, opts: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  const access = tokenStore.access;
  const sendToken = opts.auth !== false && !!access;
  if (sendToken && access) headers['Authorization'] = `Bearer ${access}`;
  return fetch(`${BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    signal: opts.signal,
  });
}

let refreshing: Promise<RefreshOutcome> | null = null;

/** `ok` = refreshed, `rejected` = the refresh token is dead, `error` = could not reach the API. */
type RefreshOutcome = 'ok' | 'rejected' | 'error';

async function refreshSession(): Promise<RefreshOutcome> {
  if (!refreshing) {
    refreshing = (async () => {
      const refreshToken = tokenStore.refresh;
      if (!refreshToken) return 'rejected';
      try {
        const res = await fetch(`${BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (res.ok) {
          const data = (await res.json()) as { accessToken: string; refreshToken: string };
          tokenStore.set(data.accessToken, data.refreshToken);
          return 'ok';
        }
        return res.status >= 400 && res.status < 500 ? 'rejected' : 'error';
      } catch {
        return 'error';
      } finally {
        // Release the lock on the next tick so concurrent callers await this one.
        setTimeout(() => {
          refreshing = null;
        }, 0);
      }
    })();
  }
  return refreshing;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const sentToken = opts.auth !== false && !!tokenStore.access;
  let res = await raw(path, opts);
  if (res.status === 401 && sentToken && tokenStore.refresh) {
    const outcome = await refreshSession();
    if (outcome === 'ok') {
      res = await raw(path, opts);
    } else if (outcome === 'rejected') {
      tokenStore.clear();
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    } else {
      // The API is unreachable — report that instead of ending the session.
      throw new ApiError(0, 'Cannot reach the StudyMate API right now');
    }
  }
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let body: unknown = undefined;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const msg =
      (body && typeof body === 'object' && 'message' in body
        ? String((body as { message: unknown }).message)
        : null) || res.statusText || 'Request failed';
    throw new ApiError(res.status, Array.isArray(msg) ? msg.join(', ') : msg, body);
  }
  return body as T;
}

export const http = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PUT', body }),
  del: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'DELETE' }),
};
