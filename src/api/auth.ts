import { http, tokenStore } from './http';
import type { MeResponse, SessionUser } from './types';

export const authApi = {
  async register(input: { email: string; password: string; name: string }) {
    const data = await http.post<SessionUser>('/auth/register', input, { auth: false });
    tokenStore.set(data.accessToken, data.refreshToken);
    return data;
  },
  async login(input: { email: string; password: string }) {
    const data = await http.post<SessionUser>('/auth/login', input, { auth: false });
    tokenStore.set(data.accessToken, data.refreshToken);
    return data;
  },
  me(signal?: AbortSignal) {
    return http.get<MeResponse>('/auth/me', { signal });
  },
  logout() {
    tokenStore.clear();
  },
};
