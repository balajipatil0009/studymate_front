import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Map, Plus } from 'lucide-react';
import { catalogApi } from '../api/catalog';
import type { TrackDetail } from '../api/types';
import { ModuleCard } from '../components/cards';
import { Icon } from '../components/Icon';
import { TrackIcon } from '../components/TrackIcon';
import { Btn, CircleBtn, EmptyState, ErrorCard, InteractiveStars, PBar, Spinner } from '../components/ui';
import { ratingLabel } from '../lib/format';
import { useRating } from '../lib/useRating';
import { useToast } from '../state/ToastContext';
import { useWorkspace } from '../state/WorkspaceContext';

export function TrackDetailPage() {
  const { trackId = '' } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { findTrack, copyTrack, loading: wsLoading } = useWorkspace();

  const [track, setTrack] = useState<TrackDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      setTrack(await catalogApi.detail(trackId, undefined, signal));
    } catch (err) {
      if (!signal?.aborted) setError(err instanceof Error ? err.message : 'Could not load track');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const ctrl = new AbortController();
    void load(ctrl.signal);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId]);

  const personal = findTrack(trackId);
  const rating = useRating('track', trackId, {
    my: track?.myRating ?? 0,
    avg: track?.avgRating ?? 0,
    count: track?.ratingCount ?? 0,
    canRate: track?.canRate ?? false,
  });

  const addTrack = async () => {
    try {
      const added = await copyTrack(trackId);
      toast(added ? 'Track added to your To Do list' : 'Already in your To Do list', added ? 'success' : 'info');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not add track', 'error');
    }
  };

  if (loading) return <Spinner />;

  if (error || !track) {
    return (
      <div>
        <BackBar title="Syllabus" onBack={() => navigate('/syllabus')} />
        <ErrorCard body={error ?? 'Track not found'} onRetry={() => void load()} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 pb-1">
        <CircleBtn label="Back" onClick={() => navigate('/syllabus')}>
          <Icon name="chevronLeft" size={20} />
        </CircleBtn>
        <div className="min-w-0 flex-1 text-center">
          <h2 className="flex items-center justify-center gap-2 text-[17px] font-bold">
            <TrackIcon id={track.id} size={18} />
            <span className="truncate">{track.title}</span>
          </h2>
          <p className="truncate text-[12.5px] text-muted">{track.desc}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brand/25 bg-brand/10 px-3 py-1.5 text-[10.5px] font-bold tracking-[0.14em] text-brand-soft">
          <TrackIcon id={track.id} size={13} /> TRACK
        </span>
      </div>

      {track.sourceUrl && (
        <a
          href={track.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block rounded-xl border border-brand/25 bg-brand/15 px-3 py-2.5 text-center text-[13px] font-bold text-brand-soft transition-colors hover:bg-brand/25 hover:text-ink"
        >
          <span className="inline-flex items-center gap-1">
            {track.source ?? 'Official source'} <ArrowUpRight size={13} />
          </span>
        </a>
      )}

      <div className="relative mt-3 overflow-hidden rounded-[24px] border border-line bg-[linear-gradient(135deg,var(--hero-from),var(--hero-mid)_60%,var(--hero-to))] p-5 shadow-[var(--shadow-card)]">
        <div className="relative z-10">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-soft">
            <Icon name="book" size={14} /> {track.modules.length} modules
          </div>
          <h1 className="mt-1.5 text-[20px] font-extrabold tracking-[-0.02em]">{track.title}</h1>
          <p className="mt-1 max-w-[60ch] text-[13px] text-muted">{track.desc}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <InteractiveStars value={rating.my} onRate={rating.rate} busy={rating.busy} />
            <span className="text-[12px] text-faint">
              {ratingLabel(rating.avg)} community · {rating.count} ratings
            </span>
          </div>
        </div>
        <TrackIcon
          id={track.id}
          size={96}
          strokeWidth={1.3}
          className="pointer-events-none absolute -right-3 -top-3 text-brand-soft opacity-10"
        />
      </div>

      {track.prerequisites.length > 0 && (
        <div className="mt-3 rounded-[20px] border border-line bg-surface p-4">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-faint">
            Before you start
          </div>
          <ul className="mt-2 space-y-1.5">
            {track.prerequisites.map((p) => (
              <li key={p} className="flex gap-2 text-[13.5px] text-muted">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-soft" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-2.5 mt-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-[17px] font-bold tracking-[-0.01em]">Your progress</div>
          <div className="text-[12.5px] text-muted">
            {personal ? `${personal.done} of ${personal.total} items completed` : 'Not added to To Do yet'}
          </div>
        </div>
        {!personal ? (
          <Btn variant="primary" onClick={() => void addTrack()} disabled={wsLoading}>
            <Plus size={15} /> Add to To Do
          </Btn>
        ) : (
          <Btn variant="soft" onClick={() => navigate('/todo')}>
            <span className="inline-flex items-center gap-1">
              Open To Do <ArrowRight size={14} />
            </span>
          </Btn>
        )}
      </div>
      {personal && (
        <div className="rounded-[20px] border border-line bg-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold">{personal.pct}% complete</span>
            <span className="text-[12px] text-faint">
              {personal.done}/{personal.total} items
            </span>
          </div>
          <PBar pct={personal.pct} large />
        </div>
      )}

      <div className="mb-2 mt-5 text-[17px] font-bold tracking-[-0.01em]">Modules</div>
      {track.modules.length === 0 && (
        <EmptyState
          icon={<Map size={34} strokeWidth={1.6} />}
          title="No modules yet"
          body="This track is still being written."
        />
      )}
      {track.modules.map((m, i) => {
        const copy = personal?.modules.find((pm) => pm.originModuleId === m.id || pm.id === m.id);
        return (
          <ModuleCard
            key={m.id}
            trackId={trackId}
            index={i}
            module={m}
            progress={copy}
            added={Boolean(copy)}
          />
        );
      })}
    </div>
  );
}

function BackBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 pb-1">
      <CircleBtn label="Back" onClick={onBack}>
        <Icon name="chevronLeft" size={20} />
      </CircleBtn>
      <div className="min-w-0 flex-1 text-center">
        <h2 className="text-[17px] font-bold">{title}</h2>
      </div>
      <span className="w-9" />
    </div>
  );
}
