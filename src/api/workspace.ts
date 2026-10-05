import { http } from './http';
import type {
  AddItemResult,
  OverallStats,
  Paged,
  PersonalItem,
  PersonalLab,
  PersonalResource,
  PersonalTrack,
} from './types';

export const workspaceApi = {
  snapshot(signal?: AbortSignal) {
    return http.get<PersonalTrack[]>('/workspace', { signal });
  },

  copyTrack(trackId: string) {
    return http.post<PersonalTrack | null>('/workspace/tracks', { trackId });
  },

  removeTrack(personalId: string) {
    return http.del<{ removed: boolean }>(`/workspace/tracks/${personalId}`);
  },

  moduleResources(personalId: string, moduleId: string, page = 1, limit = 50, signal?: AbortSignal) {
    return http.get<Paged<PersonalResource>>(
      `/workspace/tracks/${personalId}/modules/${enc(moduleId)}/resources?page=${page}&limit=${limit}`,
      { signal },
    );
  },

  moduleLabs(personalId: string, moduleId: string, page = 1, limit = 50, signal?: AbortSignal) {
    return http.get<Paged<PersonalLab>>(
      `/workspace/tracks/${personalId}/modules/${enc(moduleId)}/labs?page=${page}&limit=${limit}`,
      { signal },
    );
  },

  /** Copy a public item (`sourceRef`) or create a custom one (`title`/`task`). */
  addItem(
    personalId: string,
    moduleId: string,
    payload:
      | {
          kind: 'res' | 'lab';
          sourceRef: { trackId: string; moduleId: string; url?: string; task?: string };
        }
      | {
          kind: 'res';
          title: string;
          url: string;
          resourceKind?: string;
          access?: string;
          estMinutes?: number;
        }
      | { kind: 'lab'; task: string; estMinutes?: number },
  ) {
    return http.post<AddItemResult>(
      `/workspace/tracks/${personalId}/modules/${enc(moduleId)}/items`,
      payload,
    );
  },

  patchItem(uid: string, patch: { status?: 'active' | 'completed'; elapsedSec?: number }) {
    return http.patch<PersonalItem>(`/workspace/items/${uid}`, patch);
  },

  removeItem(uid: string) {
    return http.del<{ removed: boolean }>(`/workspace/items/${uid}`);
  },

  overall(signal?: AbortSignal) {
    return http.get<OverallStats>('/workspace/overall', { signal });
  },
};

const enc = (s: string) => encodeURIComponent(s);
