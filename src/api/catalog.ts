import { http } from './http';
import type {
  LabDetail,
  LabItem,
  Paged,
  ResourceItem,
  TrackDetail,
  TrackListItem,
} from './types';

export const catalogApi = {
  list(params: { q?: string; tag?: string } = {}, signal?: AbortSignal) {
    const search = new URLSearchParams();
    if (params.q) search.set('q', params.q);
    if (params.tag) search.set('tag', params.tag);
    const qs = search.toString();
    return http.get<TrackListItem[]>(`/tracks${qs ? `?${qs}` : ''}`, { signal });
  },

  detail(id: string, mq?: string, signal?: AbortSignal) {
    const qs = mq ? `?mq=${encodeURIComponent(mq)}` : '';
    return http.get<TrackDetail>(`/tracks/${encodeURIComponent(id)}${qs}`, { signal });
  },

  module(trackId: string, moduleId: string, signal?: AbortSignal) {
    return http.get<{ id: string; title: string; stage: string; description: string }>(
      `/tracks/${enc(trackId)}/modules/${enc(moduleId)}`,
      { signal },
    );
  },

  resources(trackId: string, moduleId: string, page = 1, limit = 50, signal?: AbortSignal) {
    return http.get<Paged<ResourceItem>>(
      `/tracks/${enc(trackId)}/modules/${enc(moduleId)}/resources?page=${page}&limit=${limit}`,
      { signal },
    );
  },

  labs(trackId: string, moduleId: string, page = 1, limit = 50, signal?: AbortSignal) {
    return http.get<Paged<LabItem>>(
      `/tracks/${enc(trackId)}/modules/${enc(moduleId)}/labs?page=${page}&limit=${limit}`,
      { signal },
    );
  },

  /** `labIdx` is 0-based (server orders labs by position). */
  lab(trackId: string, moduleId: string, labIdx: number, signal?: AbortSignal) {
    return http.get<LabDetail>(
      `/tracks/${enc(trackId)}/modules/${enc(moduleId)}/labs/${labIdx}`,
      { signal },
    );
  },
};

const enc = (s: string) => encodeURIComponent(s);
