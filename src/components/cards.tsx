import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  LabItem,
  ModuleSummary,
  PersonalLab,
  PersonalModule,
  PersonalResource,
  TrackListItem,
} from '../api/types';
import { fmtTime, hostOf, ratingLabel } from '../lib/format';
import { useRating } from '../lib/useRating';
import { useToast } from '../state/ToastContext';
import { useWorkspace } from '../state/WorkspaceContext';
import { Icon } from './Icon';
import { AccessPill, InteractiveStars, KindPill, LanguagePill, MiniBtn, PBar, StaticStars, TimePill } from './ui';

/* ------------------------------------------------------------------ */
/* Syllabus list                                                       */
/* ------------------------------------------------------------------ */

export function TrackCard({
  track,
  progress,
}: {
  track: TrackListItem;
  progress?: { done: number; total: number };
}) {
  const navigate = useNavigate();
  const { copyTrack } = useWorkspace();
  const { toast } = useToast();
  const rating = useRating('track', track.id, {
    my: track.myRating,
    avg: track.avgRating,
    count: track.ratingCount,
    canRate: track.canRate,
  });

  const go = () => navigate(`/syllabus/${track.id}`);

  const add = async () => {
    try {
      const created = await copyTrack(track.id);
      if (created && created.originTrackId === track.id && created.total === 0) {
        toast(`${track.title} added to To Do`, 'success');
      } else {
        toast('Already in your To Do list', 'info');
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not add track', 'error');
    }
  };

  return (
    <div className="track-card">
      <button type="button" className="track-card__icon" onClick={go} aria-label={`Open ${track.title}`}>
        {track.icon}
      </button>

      <div
        className="track-card__body"
        role="button"
        tabIndex={0}
        onClick={go}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            go();
          }
        }}
      >
        <div className="track-card__title">{track.title}</div>
        <div className="track-card__meta">{track.desc}</div>
        <div className="track-card__foot">
          <StaticStars value={rating.avg} />
          <span className="tiny">
            {ratingLabel(rating.avg)} ({rating.count})
          </span>
          {progress && (
            <span className="tiny" style={{ fontWeight: 700 }}>
              · {progress.done}/{progress.total} done
            </span>
          )}
        </div>
        {rating.canRate && (
          <div className="track-card__foot" onClick={(e) => e.stopPropagation()}>
            <InteractiveStars value={rating.my} onRate={rating.rate} busy={rating.busy} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        {progress ? (
          <span className="explore">In To Do ✓</span>
        ) : (
          <MiniBtn onClick={add}>＋ Add</MiniBtn>
        )}
        <span className="explore" aria-hidden="true">
          Explore ›
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Track detail → module list                                          */
/* ------------------------------------------------------------------ */

export function ModuleCard({
  trackId,
  index,
  module: m,
  progress,
  added,
}: {
  trackId: string;
  index: number;
  module: ModuleSummary;
  progress?: PersonalModule;
  added: boolean;
}) {
  const navigate = useNavigate();
  const pct = progress && progress.total ? (progress.done / progress.total) * 100 : 0;
  const done = progress ? progress.total > 0 && progress.done >= progress.total : false;

  return (
    <div className={`module-card${done ? ' done' : ''}`}>
      <button
        type="button"
        className="module-card__head"
        onClick={() => navigate(`/syllabus/${trackId}/modules/${m.id}`)}
      >
        <span className="module-card__num">{done ? '✓' : index + 1}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="module-card__stage" style={{ display: 'block' }}>
            {m.stage.toUpperCase()}
          </span>
          <span className="module-card__title" style={{ display: 'block' }}>
            {m.title}
          </span>
          <span className="module-card__desc" style={{ display: 'block' }}>
            {m.description}
          </span>
        </span>
        <span className="module-card__chevron">
          <Icon name="chevronRight" size={18} />
        </span>
      </button>

      <div className="row row--between" style={{ marginTop: 10 }}>
        <span className="module-card__meta" style={{ marginTop: 0 }}>
          {m.resCount} resources · {m.labCount} labs
          {m.estMinutes > 0 ? ` · ~${fmtTime(m.estMinutes)}` : ''}
        </span>
        {added ? (
          <span className="tiny" style={{ fontWeight: 700, color: 'var(--green-ink)' }}>
            {progress && progress.total > 0 ? `${progress.done}/${progress.total} done` : 'Added ✓'}
          </span>
        ) : (
          <span className="tiny" style={{ fontWeight: 700 }}>
            Open to add items ›
          </span>
        )}
      </div>

      {progress && progress.total > 0 && (
        <div style={{ marginTop: 8 }}>
          <PBar pct={pct} />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Module page → resource / lab items                                  */
/* ------------------------------------------------------------------ */

export interface CatalogResourceVM {
  id: string;
  title: string;
  url: string | null;
  kind: string;
  access: string;
  language: string;
  summary: string;
  estMinutes: number;
  avgRating: number;
  ratingCount: number;
  myRating: number;
  canRate: boolean;
}

export function ResourceCard({
  item,
  personal,
  onAdd,
  onRemove,
  onToggle,
}: {
  item: CatalogResourceVM;
  personal?: PersonalResource;
  onAdd?: () => Promise<void>;
  onRemove?: () => Promise<void>;
  onToggle?: () => Promise<void>;
}) {
  const rating = useRating('resource', item.id, {
    my: item.myRating,
    avg: item.avgRating,
    count: item.ratingCount,
    canRate: item.canRate,
  });

  const completed = personal?.status === 'completed';
  const canAdd = Boolean(item.url) && Boolean(onAdd);
  const [busy, setBusy] = useState(false);

  const run = async (fn?: () => Promise<void>) => {
    if (!fn || busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`resource-card${completed ? ' done' : ''}`}>
      <div className="row row--between" style={{ alignItems: 'flex-start', gap: 8 }}>
        <button
          type="button"
          className="resource-card__title"
          style={{ flex: 1 }}
          onClick={() => {
            if (item.url) window.open(item.url, '_blank', 'noopener');
          }}
        >
          {item.title}
          {item.url && (
            <span className="tiny" style={{ marginLeft: 6, fontWeight: 400 }}>
              ↗ {hostOf(item.url)}
            </span>
          )}
        </button>

        {personal ? (
          <>
            <MiniBtn className={completed ? '' : 'on'} onClick={() => void run(onToggle)} disabled={busy}>
              {completed ? '↩ Reopen' : '✓ Done'}
            </MiniBtn>
            <MiniBtn onClick={() => void run(onRemove)} disabled={busy} title="Remove from To Do">
              ✕
            </MiniBtn>
          </>
        ) : (
          <MiniBtn
            onClick={() => void run(onAdd)}
            disabled={!canAdd || busy}
            title={item.url ? 'Add to To Do' : 'No link to copy — add a custom resource instead'}
          >
            ＋ Add
          </MiniBtn>
        )}
      </div>

      {item.summary && <div className="resource-card__summary">{item.summary}</div>}

      <div className="pill-row">
        <KindPill kind={item.kind} />
        <LanguagePill language={item.language} />
        <AccessPill access={item.access} />
        <TimePill minutes={item.estMinutes} />
        <InteractiveStars value={rating.my} onRate={rating.rate} busy={rating.busy} />
        <span className="tiny">
          {ratingLabel(rating.avg)} ({rating.count})
        </span>
        {personal && personal.elapsedSec > 0 && (
          <span className="pill pill--time">⏱ {fmtTime(Math.round(personal.elapsedSec / 60))}</span>
        )}
      </div>
    </div>
  );
}

export function LabRow({
  item,
  personal,
  onAdd,
  onRemove,
  onOpen,
}: {
  item: LabItem;
  personal?: PersonalLab;
  onAdd?: () => Promise<void>;
  onRemove?: () => Promise<void>;
  onOpen: () => void;
}) {
  const rating = useRating('lab', item.id, {
    my: item.myRating,
    avg: item.avgRating,
    count: item.ratingCount,
    canRate: item.canRate,
  });
  const [busy, setBusy] = useState(false);
  const done = personal?.status === 'completed';

  const run = async (e: React.MouseEvent, fn?: () => Promise<void>) => {
    e.stopPropagation();
    if (!fn || busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`lab-row${done ? ' done' : ''}`}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={`Open lab ${item.rank}`}
    >
      <span className="lab-row__num">{done ? '✓' : item.rank}</span>
      <span className="lab-row__task">{item.task}</span>
      {rating.my > 0 && (
        <span className="lab-row__rating" title="Your rating">
          ★ {rating.my}
        </span>
      )}
      <MiniBtn
        className={personal ? 'on' : ''}
        onClick={(e) => void run(e, personal ? onRemove : onAdd)}
        disabled={busy}
        title={personal ? 'Remove from To Do' : 'Add to To Do'}
      >
        {personal ? '✕' : '＋'}
      </MiniBtn>
      <span className="lab-row__chevron">
        <Icon name="chevronRight" size={16} />
      </span>
    </div>
  );
}
