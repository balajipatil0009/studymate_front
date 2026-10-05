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
import { workspaceApi } from '../api/workspace';
import type { PersonalLab, PersonalResource, PersonalTrack } from '../api/types';
import { useAuth } from './AuthContext';

export interface NewResourceInput {
  title: string;
  url: string;
  kind: string;
  access: string;
  estMinutes: number;
}

/** Items of one personal module — the snapshot only ships counts, so these are paged in. */
export interface ModuleItems {
  resources: PersonalResource[];
  labs: PersonalLab[];
}

interface WorkspaceContextValue {
  tracks: PersonalTrack[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Look up a copy by personal id (`p-html` style) or server uuid. */
  findTrack: (id: string | undefined) => PersonalTrack | undefined;
  /** Paged items keyed `${trackUid}:${moduleId}`. */
  items: Record<string, ModuleItems>;
  moduleItems: (trackUid: string, moduleId: string) => ModuleItems;
  reloadModule: (trackUid: string, moduleId: string) => Promise<void>;
  copyTrack: (trackId: string) => Promise<PersonalTrack | null>;
  removeTrack: (personalId: string) => Promise<void>;
  addCatalogResource: (
    personalId: string,
    moduleId: string,
    ref: { trackId: string; moduleId: string; url: string },
  ) => Promise<'added' | 'exists'>;
  addCatalogLab: (
    personalId: string,
    moduleId: string,
    ref: { trackId: string; moduleId: string; task: string },
  ) => Promise<'added' | 'exists'>;
  addCustomResource: (
    personalId: string,
    moduleId: string,
    input: NewResourceInput,
  ) => Promise<'added' | 'exists'>;
  addCustomLab: (
    personalId: string,
    moduleId: string,
    input: { task: string; estMinutes: number },
  ) => Promise<'added' | 'exists'>;
  removeItem: (uid: string) => Promise<void>;
  setStatus: (uid: string, status: 'active' | 'completed') => Promise<void>;
  saveElapsed: (uid: string, elapsedSec: number) => Promise<void>;
  overall: { total: number; done: number; pct: number };
}

const EMPTY: ModuleItems = { resources: [], labs: [] };

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const itemKey = (trackUid: string, moduleId: string) => `${trackUid}:${moduleId}`;

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const [tracks, setTracks] = useState<PersonalTrack[]>([]);
  const [items, setItems] = useState<Record<string, ModuleItems>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef<Set<string>>(new Set());
  const tracksRef = useRef<PersonalTrack[]>([]);
  tracksRef.current = tracks;

  const refresh = useCallback(async () => {
    if (status !== 'authed') {
      setTracks([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const snapshot = await workspaceApi.snapshot();
      // Keep the ref in sync immediately: reloadModule() runs right after this
      // and reads the ref, which would otherwise still hold the pre-mutation
      // counts (total 0) and cache an empty item list.
      tracksRef.current = snapshot;
      setTracks(snapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your To Do list');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadModule = useCallback(
    async (trackUid: string, moduleId: string, force = false) => {
      const key = itemKey(trackUid, moduleId);
      if (!force && loadedRef.current.has(key)) return;
      loadedRef.current.add(key);

      const track = tracksRef.current.find((t) => t.uid === trackUid);
      const mod = track?.modules.find((m) => m.id === moduleId || m.originModuleId === moduleId);

      // Nothing added to this module → no request at all.
      if (!mod || mod.total === 0) {
        setItems((prev) => (prev[key] ? prev : { ...prev, [key]: EMPTY }));
        return;
      }

      try {
        const [res, labs] = await Promise.all([
          mod.resTotal > 0
            ? workspaceApi.moduleResources(trackUid, moduleId, 1, 50)
            : Promise.resolve({ items: [] as PersonalResource[] }),
          mod.labTotal > 0
            ? workspaceApi.moduleLabs(trackUid, moduleId, 1, 50)
            : Promise.resolve({ items: [] as PersonalLab[] }),
        ]);
        setItems((prev) => ({ ...prev, [key]: { resources: res.items, labs: labs.items } }));
      } catch {
        loadedRef.current.delete(key); // retry on the next pass
      }
    },
    [],
  );

  // Pull items for every module that actually has some (counted in the snapshot).
  useEffect(() => {
    if (status !== 'authed') return;
    for (const t of tracks) {
      for (const m of t.modules) {
        if (m.total > 0) void loadModule(t.uid, m.id);
      }
    }
  }, [tracks, status, loadModule]);

  const reloadModule = useCallback(
    async (trackUid: string, moduleId: string) => {
      loadedRef.current.delete(itemKey(trackUid, moduleId));
      await loadModule(trackUid, moduleId, true);
    },
    [loadModule],
  );

  /** Snapshot counts change after mutations → refresh shell + affected module. */
  const afterMutation = useCallback(
    async (personalId?: string, moduleId?: string) => {
      await refresh();
      if (personalId && moduleId) await reloadModule(personalId, moduleId);
    },
    [refresh, reloadModule],
  );

  const findTrack = useCallback(
    (id: string | undefined) =>
      id
        ? tracks.find(
            (t) => t.id === id || t.uid === id || t.originTrackId === id || `p-${t.originTrackId}` === id,
          )
        : undefined,
    [tracks],
  );

  const copyTrack = useCallback(
    async (trackId: string) => {
      const existing = tracks.find((t) => t.originTrackId === trackId);
      if (existing) return existing;
      const created = await workspaceApi.copyTrack(trackId);
      await refresh();
      return created;
    },
    [tracks, refresh],
  );

  const removeTrack = useCallback(
    async (personalId: string) => {
      await workspaceApi.removeTrack(personalId);
      loadedRef.current.clear();
      setItems({});
      await refresh();
    },
    [refresh],
  );

  const addCatalogResource: WorkspaceContextValue['addCatalogResource'] = useCallback(
    async (personalId, moduleId, ref) => {
      const res = await workspaceApi.addItem(personalId, moduleId, {
        kind: 'res',
        sourceRef: ref,
      });
      await afterMutation(personalId, moduleId);
      return res.exists ? 'exists' : 'added';
    },
    [afterMutation],
  );

  const addCatalogLab: WorkspaceContextValue['addCatalogLab'] = useCallback(
    async (personalId, moduleId, ref) => {
      const res = await workspaceApi.addItem(personalId, moduleId, { kind: 'lab', sourceRef: ref });
      await afterMutation(personalId, moduleId);
      return res.exists ? 'exists' : 'added';
    },
    [afterMutation],
  );

  const addCustomResource: WorkspaceContextValue['addCustomResource'] = useCallback(
    async (personalId, moduleId, input) => {
      const res = await workspaceApi.addItem(personalId, moduleId, {
        kind: 'res',
        title: input.title,
        url: input.url,
        resourceKind: input.kind,
        access: input.access,
        estMinutes: input.estMinutes,
      });
      await afterMutation(personalId, moduleId);
      if (res.exists) return 'exists';
      return 'added';
    },
    [afterMutation],
  );

  const addCustomLab: WorkspaceContextValue['addCustomLab'] = useCallback(
    async (personalId, moduleId, input) => {
      const res = await workspaceApi.addItem(personalId, moduleId, {
        kind: 'lab',
        task: input.task,
        estMinutes: input.estMinutes,
      });
      await afterMutation(personalId, moduleId);
      if (res.exists) return 'exists';
      return 'added';
    },
    [afterMutation],
  );

  /** Locate which loaded module owns an item uid (for targeted invalidation). */
  const locate = useCallback((uid: string) => {
    for (const [key, bundle] of Object.entries(items)) {
      const hit =
        bundle.resources.find((r) => r.uid === uid) ?? bundle.labs.find((l) => l.uid === uid);
      if (hit) {
        const [trackUid, moduleId] = key.split(':');
        return { trackUid, moduleId };
      }
    }
    return undefined;
  }, [items]);

  const removeItem = useCallback(
    async (uid: string) => {
      await workspaceApi.removeItem(uid);
      const at = locate(uid);
      await afterMutation(at?.trackUid, at?.moduleId);
    },
    [locate, afterMutation],
  );

  const setStatus = useCallback(
    async (uid: string, s: 'active' | 'completed') => {
      await workspaceApi.patchItem(uid, { status: s });
      const at = locate(uid);
      if (at) {
        setItems((prev) => {
          const bundle = prev[`${at.trackUid}:${at.moduleId}`];
          if (!bundle) return prev;
          return {
            ...prev,
            [`${at.trackUid}:${at.moduleId}`]: {
              resources: bundle.resources.map((r) => (r.uid === uid ? { ...r, status: s } : r)),
              labs: bundle.labs.map((l) => (l.uid === uid ? { ...l, status: s } : l)),
            },
          };
        });
      }
      await afterMutation(at?.trackUid, at?.moduleId);
    },
    [locate, afterMutation],
  );

  const saveElapsed = useCallback(async (uid: string, elapsedSec: number) => {
    try {
      await workspaceApi.patchItem(uid, { elapsedSec: Math.floor(elapsedSec) });
    } catch {
      // Best effort: the local stopwatch keeps running either way.
    }
  }, []);

  const overall = useMemo(() => {
    const total = tracks.reduce((n, t) => n + t.total, 0);
    const done = tracks.reduce((n, t) => n + t.done, 0);
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [tracks]);

  const moduleItems = useCallback(
    (trackUid: string, moduleId: string): ModuleItems => items[itemKey(trackUid, moduleId)] ?? EMPTY,
    [items],
  );

  const value = useMemo(
    () => ({
      tracks,
      loading,
      error,
      refresh,
      findTrack,
      items,
      moduleItems,
      reloadModule,
      copyTrack,
      removeTrack,
      addCatalogResource,
      addCatalogLab,
      addCustomResource,
      addCustomLab,
      removeItem,
      setStatus,
      saveElapsed,
      overall,
    }),
    [
      tracks,
      loading,
      error,
      refresh,
      findTrack,
      items,
      moduleItems,
      reloadModule,
      copyTrack,
      removeTrack,
      addCatalogResource,
      addCatalogLab,
      addCustomResource,
      addCustomLab,
      removeItem,
      setStatus,
      saveElapsed,
      overall,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>');
  return ctx;
}
