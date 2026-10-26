import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Check, ChevronRight, Plus, RotateCcw, Star, Timer, X } from 'lucide-react';
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
import { TrackIcon } from './TrackIcon';
import {
  AccessPill,
  InteractiveStars,
  KindPill,
  LanguagePill,
  MiniBtn,
  PBar,
  StaticStars,
  TimePill,
} from './ui';

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
    <div className="mb-3 flex items-center gap-3 rounded-[22px] border border-line bg-surface p-3.5 shadow-[var(--shadow-card)] transition-colors hover:border-line-strong hover:bg-surface-strong">
      <button
        type="button"
        onClick={go}
        aria-label={`Open ${track.title}`}
        className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-brand/20 bg-[linear-gradient(135deg,rgba(99,102,241,0.28),rgba(168,85,247,0.14))] text-xl"
      >
        <TrackIcon id={track.id} size={24} className="text-brand-soft" />
      </button>

      <div
        className="min-w-0 flex-1 cursor-pointer text-left"
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
        <div className="truncate text-[15.5px] font-bold text-ink">{track.title}</div>
        <div className="truncate text-[12.5px] text-muted">{track.desc}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <StaticStars value={rating.avg} />
          <span className="text-[11.5px] text-faint">
            {ratingLabel(rating.avg)} ({rating.count})
          </span>
          {progress && (
            <span className="text-[11.5px] font-bold text-brand-soft">
              · {progress.done}/{progress.total} done
            </span>
          )}
        </div>
        {rating.canRate && (
          <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
            <InteractiveStars value={rating.my} onRate={rating.rate} busy={rating.busy} />
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {progress ? (
          <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-mint">
            In To Do <Check size={12} />
          </span>
        ) : (
          <MiniBtn onClick={add}>
            <Plus size={12} /> Add
          </MiniBtn>
        )}
        <span className="inline-flex items-center gap-0.5 text-[11.5px] font-bold text-brand-soft">
          Explore <ChevronRight size={12} />
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
    <div
      className={`mb-3 rounded-[22px] border p-3.5 transition-colors ${
        done
          ? 'border-mint/20 bg-mint/[0.06]'
          : 'border-line bg-surface hover:border-line'
      }`}
    >
      <button
        type="button"
        className="flex w-full items-center gap-3 text-left"
        onClick={() => navigate(`/syllabus/${trackId}/modules/${m.id}`)}
      >
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[13px] font-extrabold ${
            done ? 'bg-mint/20 text-mint' : 'bg-surface text-brand-soft'
          }`}
        >
          {done ? <Check size={16} /> : index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10.5px] font-bold uppercase tracking-[0.14em] text-brand-soft">
            {m.stage.toUpperCase()}
          </span>
          <span className="block truncate text-[15.5px] font-bold text-ink">{m.title}</span>
          <span className="line-clamp-1 block text-[12.5px] text-muted">{m.description}</span>
        </span>
        <span className="text-faint">
          <Icon name="chevronRight" size={18} />
        </span>
      </button>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[12px] text-faint">
          {m.resCount} resources · {m.labCount} labs
          {m.estMinutes > 0 ? ` · ~${fmtTime(m.estMinutes)}` : ''}
        </span>
        {added ? (
          <span className="text-[11.5px] font-bold text-mint">
            {progress && progress.total > 0 ? (
              `${progress.done}/${progress.total} done`
            ) : (
              <span className="inline-flex items-center gap-1">
                Added <Check size={11} />
              </span>
            )}
          </span>
        ) : (
          <span className="inline-flex items-center gap-0.5 text-[11.5px] font-bold text-muted">
            Open to add items <ChevronRight size={11} />
          </span>
        )}
      </div>

      {progress && progress.total > 0 && (
        <div className="mt-2">
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
    <div
      className={`mb-2 rounded-2xl border p-3 transition-colors ${
        completed
          ? 'border-mint/20 bg-mint/[0.05]'
          : 'border-transparent bg-surface hover:bg-surface'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className={`flex-1 text-left text-[13.5px] font-bold transition-colors ${
            completed ? 'text-mint' : 'text-ink hover:text-brand-soft'
          }`}
          onClick={() => {
            if (item.url) window.open(item.url, '_blank', 'noopener');
          }}
        >
          {item.title}
          {item.url && (
            <span className="ml-1.5 inline-flex items-center gap-0.5 text-[11.5px] font-normal text-faint">
              <ArrowUpRight size={11} /> {hostOf(item.url)}
            </span>
          )}
        </button>

        <div className="flex shrink-0 gap-1.5">
          {personal ? (
            <>
              <MiniBtn active={!completed} onClick={() => void run(onToggle)} disabled={busy}>
                {completed ? (
                  <>
                    <RotateCcw size={12} /> Reopen
                  </>
                ) : (
                  <>
                    <Check size={12} /> Done
                  </>
                )}
              </MiniBtn>
              <MiniBtn onClick={() => void run(onRemove)} disabled={busy} title="Remove from To Do">
                <X size={12} />
              </MiniBtn>
            </>
          ) : (
            <MiniBtn
              onClick={() => void run(onAdd)}
              disabled={!canAdd || busy}
              title={item.url ? 'Add to To Do' : 'No link to copy — add a custom resource instead'}
            >
              <Plus size={12} /> Add
            </MiniBtn>
          )}
        </div>
      </div>

      {item.summary && (
        <div className="mt-1 line-clamp-2 text-[12.5px] text-muted">{item.summary}</div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <KindPill kind={item.kind} />
        <LanguagePill language={item.language} />
        <AccessPill access={item.access} />
        <TimePill minutes={item.estMinutes} />
        <InteractiveStars value={rating.my} onRate={rating.rate} busy={rating.busy} />
        <span className="text-[11.5px] text-faint">
          {ratingLabel(rating.avg)} ({rating.count})
        </span>
        {personal && personal.elapsedSec > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-[3px] text-[10.5px] font-semibold text-muted">
            <Timer size={11} /> {fmtTime(Math.round(personal.elapsedSec / 60))}
          </span>
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
      className={`relative mb-1.5 flex w-full cursor-pointer items-center gap-2 rounded-xl border py-2.5 pl-9 pr-3 text-left transition-colors ${
        done
          ? 'border-mint/20 bg-mint/[0.05]'
          : 'border-transparent bg-surface hover:bg-surface-strong'
      }`}
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
      <span
        className={`absolute left-2.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full text-[10.5px] font-extrabold ${
          done ? 'bg-mint/20 text-mint' : 'bg-brand text-white'
        }`}
      >
        {done ? <Check size={12} /> : item.rank}
      </span>
      <span
        className={`flex-1 text-[13.5px] ${
          done ? 'text-faint line-through' : 'text-ink'
        }`}
      >
        {item.task}
      </span>
      {rating.my > 0 && (
        <span
          className="inline-flex items-center gap-0.5 text-[11.5px] font-bold text-amber"
          title="Your rating"
        >
          <Star size={11} fill="currentColor" /> {rating.my}
        </span>
      )}
      <MiniBtn
        active={Boolean(personal)}
        onClick={(e) => void run(e, personal ? onRemove : onAdd)}
        disabled={busy}
        title={personal ? 'Remove from To Do' : 'Add to To Do'}
      >
        {personal ? <X size={12} /> : <Plus size={12} />}
      </MiniBtn>
      <span className="text-faint">
        <Icon name="chevronRight" size={16} />
      </span>
    </div>
  );
}
