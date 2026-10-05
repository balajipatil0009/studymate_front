import { http } from './http';
import type { RateResult } from './types';

export type RatingType = 'track' | 'resource' | 'lab';

export const ratingsApi = {
  mine(signal?: AbortSignal) {
    return http.get<{ votes: Record<string, number> }>('/ratings/mine', { signal });
  },
  rate(type: RatingType, id: string, stars: number) {
    return http.put<RateResult>(`/ratings/${type}/${encodeURIComponent(id)}`, { stars });
  },
};
