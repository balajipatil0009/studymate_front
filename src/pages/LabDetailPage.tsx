import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { catalogApi } from '../api/catalog';
import { workspaceApi } from '../api/workspace';
import type { LabDetail, PersonalLab } from '../api/types';
import { Icon } from '../components/Icon';
import { Btn, ErrorCard, InteractiveStars, MiniBtn, Spinner } from '../components/ui';
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

  /** Adds the lab (creating the track copy first when needed) and returns the fresh personal item. */
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
      // Snapshot counts AND the paged item cache must both update, otherwise
      // this page keeps rendering the "not in To Do" state.
      await refresh();
      await reloadModule(personalId, moduleId);
      let item = (res.item as PersonalLab | undefined) ?? personal ?? null;
      if (res.exists && !item) {
        // Server says it is already there but our cache has not loaded yet → fetch it.
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
      toast('Timer started — go build something! ⏱', 'success');
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
      toast(next === 'completed' ? 'Lab completed — well done! 🎉' : 'Lab reopened', 'success');
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

      <div className="detail-hero">
        <div className="eyebrow">
          {done ? '✓ COMPLETED' : `LAB ${lab.idx + 1} OF ${lab.total}`}
        </div>
        <h1>{lab.task}</h1>
        <div className="row" style={{ marginTop: 8, flexWrap: 'wrap', gap: 8 }}>
          <span className="pill pill--time">
            <Icon name="clock" size={11} /> {fmtTime(lab.estMinutes) || 'self-paced'}
          </span>
          <span className="pill pill--text">HANDS-ON</span>
          <InteractiveStars value={rating.my} onRate={rating.rate} busy={rating.busy} />
          <span className="tiny">
            {ratingLabel(rating.avg)} community · {rating.count} ratings
          </span>
        </div>
      </div>

      <div className="card">
        <div className="eyebrow" style={{ marginBottom: 6 }}>
          THE BRIEF
        </div>
        <div className="md">
          <ReactMarkdown>{lab.detail || 'No extra instructions — just build the thing!'}</ReactMarkdown>
        </div>
      </div>

      <div className="row" style={{ gap: 8, margin: '12px 0', flexWrap: 'wrap' }}>
        <Btn variant={done ? 'soft' : 'primary'} large onClick={() => void onStartWork()} disabled={busy}>
          <Icon name="play" size={16} fill />
          {done ? 'Work again' : 'Start work'}
        </Btn>
        {personal ? (
          <>
            <Btn variant={done ? 'soft' : 'green'} large onClick={() => void toggleDone()} disabled={busy}>
              {done ? '↩ Reopen' : '✓ Mark done'}
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
              // Failures toast their own message inside addToList.
              const added = await addToList();
              if (added) toast('Added to To Do', 'success');
            }}
            disabled={busy}
          >
            ＋ Add to To Do
          </Btn>
        )}
      </div>

      {lab.solution && (
        <div className="card" style={{ marginTop: 4 }}>
          <div className="row row--between">
            <div className="eyebrow">SOLUTION</div>
            <MiniBtn className={showSolution ? 'on' : ''} onClick={() => setShowSolution((s) => !s)}>
              {showSolution ? 'Hide' : 'Reveal'}
            </MiniBtn>
          </div>
          {showSolution && (
            <div className="md" style={{ marginTop: 10 }}>
              {lab.solution.type === 'link' && lab.solution.url ? (
                <a href={lab.solution.url} target="_blank" rel="noopener noreferrer">
                  Open reference solution ↗
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
    <div className="detail-topbar">
      <button type="button" className="circle-btn" onClick={onBack} aria-label="Back to module">
        <Icon name="chevronLeft" size={20} />
      </button>
      <div className="detail-topbar__title">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="row" style={{ gap: 6 }}>
        <button
          type="button"
          className="circle-btn"
          onClick={onPrev}
          disabled={!onPrev || disabled}
          aria-label="Previous lab"
          style={{ opacity: onPrev ? 1 : 0.35 }}
        >
          <Icon name="chevronLeft" size={18} />
        </button>
        <button
          type="button"
          className="circle-btn"
          onClick={onNext}
          disabled={!onNext || disabled}
          aria-label="Next lab"
          style={{ opacity: onNext ? 1 : 0.35 }}
        >
          <Icon name="chevronRight" size={18} />
        </button>
      </div>
    </div>
  );
}
