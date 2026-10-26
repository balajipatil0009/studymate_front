import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowUpRight, Check, Plus, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { catalogApi } from '../api/catalog';
import { workspaceApi } from '../api/workspace';
import type { LabDetail, PersonalLab } from '../api/types';
import { Icon } from '../components/Icon';
import {
  Btn,
  CircleBtn,
  ErrorCard,
  InteractiveStars,
  MiniBtn,
  Spinner,
} from '../components/ui';
import { fmtTime, ratingLabel } from '../lib/format';
import { useRating } from '../lib/useRating';
import { useToast } from '../state/ToastContext';
import { useTimer } from '../state/TimerContext';
import { useWorkspace } from '../state/WorkspaceContext';

export function LabDetailPage() {
  const { trackId = '', moduleId = '', labIdx = '0' } = useParams();
  const idx = Math.max(0, Number(labIdx) || 0);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { findTrack, moduleItems, reloadModule, setStatus, removeItem, refresh } = useWorkspace();
  const { startWork } = useTimer();

  const [lab, setLab] = useState<LabDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        setLab(await catalogApi.lab(trackId, moduleId, idx, signal));
      } catch (err) {
        if (!signal?.aborted) setError(err instanceof Error ? err.message : 'Could not load lab');
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [trackId, moduleId, idx],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    void load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  const personalTrack = findTrack(trackId);
  const bundle = personalTrack ? moduleItems(personalTrack.uid, moduleId) : undefined;
  const personal = bundle?.labs.find(
    (l) => l.catalogId === lab?.id || (lab != null && l.task === lab.task),
  );

  const rating = useRating('lab', lab?.id ?? '', {
    my: lab?.myRating ?? 0,
    avg: lab?.avgRating ?? 0,
    count: lab?.ratingCount ?? 0,
    canRate: lab?.canRate ?? false,
  });

  const go = (delta: number) =>
    navigate(`/syllabus/${trackId}/modules/${moduleId}/labs/${Math.max(0, idx + delta)}`);

  const addToList = async (): Promise<{ item: PersonalLab; personalId: string } | null> => {
    if (personal && personalTrack) return { item: personal, personalId: personalTrack.uid };
    if (!lab) return null;
    let personalId = personalTrack?.uid;
    if (!personalId) {
      try {
        const created = await workspaceApi.copyTrack(trackId);
        personalId = created?.uid;
      } catch {
        toast('Could not add this track to your To Do list', 'error');
        return null;
      }
    }
    if (!personalId) return null;
    try {
      const res = await workspaceApi.addItem(personalId, moduleId, {
        kind: 'lab',
        sourceRef: { trackId, moduleId, task: lab.task },
      });
      await refresh();
      await reloadModule(personalId, moduleId);
      let item = (res.item as PersonalLab | undefined) ?? personal ?? null;
      if (res.exists && !item) {
        const paged = await workspaceApi.moduleLabs(personalId, moduleId, 1, 50);
        item = paged.items.find((l) => l.task === lab.task) ?? null;
      }
      if (!item) return null;
      return { item, personalId };
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not add lab', 'error');
      return null;
    }
  };

  const onStartWork = async () => {
    if (!lab) return;
    setBusy(true);
    try {
      const added = await addToList();
      if (!added) {
        toast('Could not add this lab to To Do', 'error');
        return;
      }
      startWork({
        uid: added.item.uid,
        personalId: added.personalId,
        originTrackId: trackId,
        originModuleId: moduleId,
        title: lab.task,
        goal: lab.estMinutes,
        elapsedSec: added.item.elapsedSec,
      });
      toast('Timer started — go build something!', 'success');
      navigate('/');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not start work', 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleDone = async () => {
    if (!personal) return;
    setBusy(true);
    try {
      const next = personal.status === 'completed' ? 'active' : 'completed';
      await setStatus(personal.uid, next);
      if (personalTrack) await reloadModule(personalTrack.uid, moduleId);
      toast(next === 'completed' ? 'Lab completed — well done!' : 'Lab reopened', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not update lab', 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeFromList = async () => {
    if (!personal) return;
    setBusy(true);
    try {
      await removeItem(personal.uid);
      if (personalTrack) await reloadModule(personalTrack.uid, moduleId);
      toast('Removed from To Do');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not remove lab', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  if (error || !lab) {
    return (
      <div>
        <LabTopbar
          title="Lab"
          subtitle=""
          onBack={() => navigate(`/syllabus/${trackId}/modules/${moduleId}`)}
          onPrev={idx > 0 ? () => go(-1) : undefined}
          onNext={undefined}
          disabled
        />
        <ErrorCard body={error ?? 'Lab not found'} onRetry={() => void load()} />
      </div>
    );
  }

  const done = personal?.status === 'completed';

  return (
    <div>
      <LabTopbar
        title={`Lab ${lab.idx + 1} / ${lab.total}`}
        subtitle={lab.task}
        onBack={() => navigate(`/syllabus/${trackId}/modules/${moduleId}`)}
        onPrev={idx > 0 ? () => go(-1) : undefined}
        onNext={idx + 1 < lab.total ? () => go(1) : undefined}
      />

      <div className="relative mt-3 overflow-hidden rounded-[24px] border border-line bg-[linear-gradient(135deg,var(--hero-from),var(--hero-mid)_60%,var(--hero-to-mint))] p-5 shadow-[var(--shadow-card)]">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-brand-soft">
          {done ? (
            <span className="inline-flex items-center gap-1">
              <Check size={12} /> COMPLETED
            </span>
          ) : (
            `LAB ${lab.idx + 1} OF ${lab.total}`
          )}
        </div>
        <h1 className="mt-1.5 text-[22px] font-extrabold tracking-[-0.025em]">{lab.task}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-[3px] text-[10.5px] font-semibold text-muted">
            <Icon name="clock" size={11} /> {fmtTime(lab.estMinutes) || 'self-paced'}
          </span>
          <span className="inline-flex items-center rounded-full bg-brand/15 px-2.5 py-[3px] text-[10.5px] font-bold uppercase tracking-[0.06em] text-brand-soft">
            HANDS-ON
          </span>
          <InteractiveStars value={rating.my} onRate={rating.rate} busy={rating.busy} />
          <span className="text-[12px] text-faint">
            {ratingLabel(rating.avg)} community · {rating.count} ratings
          </span>
        </div>
      </div>

      <div className="mt-3 rounded-[22px] border border-line bg-surface p-4">
        <div className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.16em] text-faint">
          The brief
        </div>
        <div className="md">
          <ReactMarkdown>{lab.detail || 'No extra instructions — just build the thing!'}</ReactMarkdown>
        </div>
      </div>

      <div className="my-3 flex flex-wrap gap-2">
        <Btn variant={done ? 'soft' : 'primary'} large onClick={() => void onStartWork()} disabled={busy}>
          <Icon name="play" size={16} fill />
          {done ? 'Work again' : 'Start work'}
        </Btn>
        {personal ? (
          <>
            <Btn variant={done ? 'soft' : 'green'} large onClick={() => void toggleDone()} disabled={busy}>
              {done ? (
                <>
                  <RotateCcw size={15} /> Reopen
                </>
              ) : (
                <>
                  <Check size={15} /> Mark done
                </>
              )}
            </Btn>
            <Btn variant="ghost" onClick={() => void removeFromList()} disabled={busy}>
              Remove
            </Btn>
          </>
        ) : (
          <Btn
            variant="soft"
            large
            onClick={async () => {
              const added = await addToList();
              if (added) toast('Added to To Do', 'success');
            }}
            disabled={busy}
          >
            <Plus size={16} /> Add to To Do
          </Btn>
        )}
      </div>

      {lab.solution && (
        <div className="rounded-[22px] border border-line bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-faint">
              Solution
            </div>
            <MiniBtn active={showSolution} onClick={() => setShowSolution((s) => !s)}>
              {showSolution ? 'Hide' : 'Reveal'}
            </MiniBtn>
          </div>
          {showSolution && (
            <div className="md mt-3">
              {lab.solution.type === 'link' && lab.solution.url ? (
                <a href={lab.solution.url} target="_blank" rel="noopener noreferrer">
                  <span className="inline-flex items-center gap-1">
                    Open reference solution <ArrowUpRight size={13} />
                  </span>
                </a>
              ) : (
                <ReactMarkdown>{lab.solution.body ?? ''}</ReactMarkdown>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LabTopbar({
  title,
  subtitle,
  onBack,
  onPrev,
  onNext,
  disabled,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 pb-1">
      <CircleBtn label="Back to module" onClick={onBack}>
        <Icon name="chevronLeft" size={20} />
      </CircleBtn>
      <div className="min-w-0 flex-1 text-center">
        <h2 className="truncate text-[17px] font-bold">{title}</h2>
        {subtitle && <p className="truncate text-[12.5px] text-muted">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 gap-1.5">
        <CircleBtn label="Previous lab" onClick={onPrev} disabled={!onPrev || disabled}>
          <Icon name="chevronLeft" size={18} />
        </CircleBtn>
        <CircleBtn label="Next lab" onClick={onNext} disabled={!onNext || disabled}>
          <Icon name="chevronRight" size={18} />
        </CircleBtn>
      </div>
    </div>
  );
}
