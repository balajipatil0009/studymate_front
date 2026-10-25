// Response shapes of the NestJS /v1 API (see ../backend.md and ../backend/src).

export interface SessionUser {
  user: { id: string; email: string; name: string };
  accessToken: string;
  refreshToken: string;
}

export interface MeResponse {
  id: string;
  email: string;
  name: string;
  sessions_today: number;
  seconds_today: number;
}

// ---------- catalog ----------

export interface TrackListItem {
  id: string;
  title: string;
  icon: string;
  source_url: string | null;
  source_label: string | null;
  modules: number;
  resources: number;
  labs: number;
  avgRating: number;
  ratingCount: number;
  myRating: number;
  canRate: boolean;
  /** "10 modules · 58 resources" */
  desc: string;
}

export interface ModuleSummary {
  id: string;
  title: string;
  stage: string;
  description: string;
  estMinutes: number;
  resCount: number;
  labCount: number;
}

export interface TrackDetail {
  id: string;
  title: string;
  icon: string;
  source_url: string | null;
  source: string | null;
  sourceUrl: string | null;
  prerequisites: string[];
  avgRating: number;
  ratingCount: number;
  myRating: number;
  canRate: boolean;
  desc: string;
  modules: ModuleSummary[];
}

export interface Solution {
  type: 'link' | 'md';
  url?: string;
  body?: string;
}

export interface ResourceItem {
  id: string;
  title: string;
  url: string | null;
  kind: string;
  access: string;
  /** BCP-47-ish content language, e.g. "en", "hi". */
  language: string;
  summary: string;
  estMinutes: number;
  avgRating: number;
  ratingCount: number;
  myRating: number;
  canRate: boolean;
  addedToTodo: boolean;
}

export interface LabItem {
  id: string;
  rank: number;
  task: string;
  detail: string;
  language: string;
  solution: Solution | null;
  estMinutes: number;
  avgRating: number;
  ratingCount: number;
  myRating: number;
  canRate: boolean;
  addedToTodo: boolean;
}

export interface LabDetail extends Omit<LabItem, 'rank' | 'addedToTodo'> {
  idx: number;
  total: number;
}

export interface Paged<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

// ---------- workspace ----------

export interface PersonalResource {
  uid: string;
  custom: boolean;
  originTrackId: string;
  originModuleId: string;
  catalogId: string | null;
  estMinutes: number;
  rating: number;
  published: boolean;
  status: 'active' | 'completed';
  elapsedSec: number;
  running: boolean;
  completedAt: number | null;
  title: string;
  url: string | null;
  kind: string;
  access: string;
  language: string;
  summary: string;
  avgRating?: number;
  ratingCount?: number;
  myRating?: number;
}

export interface PersonalLab {
  uid: string;
  custom: boolean;
  originTrackId: string;
  originModuleId: string;
  catalogId: string | null;
  estMinutes: number;
  rating: number;
  published: boolean;
  status: 'active' | 'completed';
  elapsedSec: number;
  running: boolean;
  completedAt: number | null;
  task: string;
  detail: string;
  language: string;
  solution: Solution | null;
  rank?: number;
  avgRating?: number;
  ratingCount?: number;
  myRating?: number;
}

export type PersonalItem = PersonalResource | PersonalLab;

export interface PersonalModule {
  uid: string;
  originTrackId: string;
  originModuleId: string;
  id: string;
  title: string;
  stage: string;
  description: string;
  estMinutes: number;
  resTotal: number;
  labTotal: number;
  total: number;
  done: number;
  resources: PersonalResource[];
  labs: PersonalLab[];
}

export interface PersonalTrack {
  uid: string;
  originTrackId: string;
  id: string;
  title: string;
  icon: string;
  total: number;
  done: number;
  pct: number;
  modules: PersonalModule[];
}

export interface OverallStats {
  total: number;
  done: number;
  pct: number;
}

export interface AddItemResult {
  exists?: true;
  added?: true;
  item?: PersonalItem;
}

export interface RateResult {
  avg: number;
  count: number;
  myRating: number;
}
