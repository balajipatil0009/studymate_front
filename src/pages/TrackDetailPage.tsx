import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { catalogApi } from '../api/catalog';
import type { TrackDetail } from '../api/types';
import { ModuleCard } from '../components/cards';
import { Icon } from '../components/Icon';
import { Btn, EmptyState, ErrorCard, InteractiveStars, PBar, Spinner } from '../components/ui';
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
      <div className="detail-topbar">
        <button type="button" className="circle-btn" onClick={() => navigate('/syllabus')} aria-label="Back">
          <Icon name="chevronLeft" size={20} />
        </button>
        <div className="detail-topbar__title">
          <h2>
            {track.icon} {track.title}
          </h2>
          <p>{track.desc}</p>
        </div>
        <div className="track-badge">
          {track.icon} TRACK
        </div>
      </div>

      {track.sourceUrl && (
        <a className="source-banner" href={track.sourceUrl} target="_blank" rel="noopener noreferrer">
          {track.source ?? 'Official source'} ↗
        </a>
      )}

      <div className="hero" style={{ marginTop: 0 }}>
        <div className="hero__body">
          <div className="hero__eyebrow">
            <Icon name="book" size={14} /> {track.modules.length} modules
          </div>
          <h1 className="hero__title" style={{ fontSize: 19 }}>
            {track.title}
          </h1>
          <p className="hero__sub">{track.desc}</p>
          <div className="row" style={{ marginTop: 8, flexWrap: 'wrap' }}>
            <InteractiveStars value={rating.my} onRate={rating.rate} busy={rating.busy} />
            <span className="tiny">
              {ratingLabel(rating.avg)} community · {rating.count} ratings
            </span>
          </div>
        </div>
        <div className="hero__leaf">{track.icon}</div>
      </div>

      {track.prerequisites.length > 0 && (
        <div className="prereq">
          <div className="eyebrow">BEFORE YOU START</div>
          <ul>
            {track.prerequisites.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="row row--between" style={{ margin: '4px 0 10px' }}>
        <div>
          <div className="section-title" style={{ margin: 0 }}>
            Your progress
          </div>
          <div className="tiny">
            {personal ? `${personal.done} of ${personal.total} items completed` : 'Not added to To Do yet'}
          </div>
        </div>
        {!personal ? (
          <Btn variant="primary" onClick={() => void addTrack()} disabled={wsLoading}>
            ＋ Add to To Do
          </Btn>
        ) : (
          <Btn variant="soft" onClick={() => navigate('/todo')}>
            Open To Do →
          </Btn>
        )}
      </div>
      {personal && (
        <div className="card">
          <div className="row row--between" style={{ marginBottom: 6 }}>
            <span style={{ fontWeight: 800 }}>{personal.pct}% complete</span>
            <span className="tiny">
              {personal.done}/{personal.total} items
            </span>
          </div>
          <PBar pct={personal.pct} large />
        </div>
      )}

      <div className="section-title">Modules</div>
      {track.modules.length === 0 && (
        <EmptyState icon="🗺️" title="No modules yet" body="This track is still being written." />
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
    <div className="detail-topbar">
      <button type="button" className="circle-btn" onClick={onBack} aria-label="Back">
        <Icon name="chevronLeft" size={20} />
      </button>
      <div className="detail-topbar__title">
        <h2>{title}</h2>
      </div>
      <span style={{ width: 36 }} />
    </div>
  );
}
