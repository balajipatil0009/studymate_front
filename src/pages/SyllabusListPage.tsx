import { useEffect, useMemo, useState } from 'react';
import { catalogApi } from '../api/catalog';
import type { TrackListItem } from '../api/types';
import { TrackCard } from '../components/cards';
import { ChipRow, EmptyState, ErrorCard, SearchBox, Spinner } from '../components/ui';
import { useToast } from '../state/ToastContext';
import { useWorkspace } from '../state/WorkspaceContext';

const FILTERS = [
  { id: 'all', label: 'All tracks' },
  { id: 'frontend', label: 'Frontend' },
  { id: 'backend', label: 'Backend' },
];

const FRONTEND = new Set(['html', 'css', 'js', 'react']);

export function SyllabusListPage() {
  const [tracks, setTracks] = useState<TrackListItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const { toast } = useToast();
  const { tracks: workspace } = useWorkspace();

  const load = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      setTracks(await catalogApi.list({}, signal));
    } catch (err) {
      if (!signal?.aborted) {
        setError(err instanceof Error ? err.message : 'Could not load tracks');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const ctrl = new AbortController();
    void load(ctrl.signal);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    if (!tracks) return [];
    const needle = q.trim().toLowerCase();
    return tracks.filter((t) => {
      if (filter === 'frontend' && !FRONTEND.has(t.id)) return false;
      if (filter === 'backend' && FRONTEND.has(t.id)) return false;
      if (!needle) return true;
      return `${t.title} ${t.desc}`.toLowerCase().includes(needle);
    });
  }, [tracks, q, filter]);

  const progressOf = (t: TrackListItem) => {
    const copy = workspace.find((w) => w.originTrackId === t.id);
    return copy ? { done: copy.done, total: copy.total } : undefined;
  };

  return (
    <div>
      <div className="hero">
        <div className="hero__body">
          <div className="hero__eyebrow">🌱 Focus in bloom</div>
          <h1 className="hero__title">Syllabus</h1>
          <p className="hero__sub">
            Pick a track, follow the roadmap, and check items off as you master them.
          </p>
        </div>
        <div className="hero__leaf">📚</div>
      </div>

      <SearchBox value={q} onChange={setQ} placeholder="Search tracks, e.g. react" />
      <ChipRow options={FILTERS} value={filter} onChange={setFilter} />

      {loading && <Spinner />}

      {error && (
        <ErrorCard body={error} onRetry={() => void load()} />
      )}

      {!loading && !error && visible.length === 0 && (
        <EmptyState
          icon="🔍"
          title="No tracks found"
          body="Try a different search or clear your filters."
        />
      )}

      {!loading &&
        !error &&
        visible.map((t) => (
          <TrackCard key={t.id} track={t} progress={progressOf(t)} />
        ))}

      {!loading && !error && visible.length > 0 && (
        <p className="tiny" style={{ textAlign: 'center', marginTop: 8 }}>
          Missing something?{' '}
          <button
            type="button"
            className="link-btn"
            style={{ padding: '0 4px' }}
            onClick={() => toast('Re-run the backend seed to restore demo tracks', 'info')}
          >
            Restore demo data
          </button>
        </p>
      )}
    </div>
  );
}
