import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PersonalItem, PersonalTrack } from '../api/types';
import { Icon } from '../components/Icon';
import { ChipRow, EmptyState, ErrorCard, MiniBtn, PBar, SearchBox, Spinner } from '../components/ui';
import { fmtClock, fmtTime } from '../lib/format';
import { usePerformance } from '../state/PerformanceContext';
import { useTimer } from '../state/TimerContext';
import { useToast } from '../state/ToastContext';
import { useWorkspace } from '../state/WorkspaceContext';

const FILTERS = [
  { id: 'all', label: 'Everything' },
  { id: 'active', label: 'Active' },
  { id: 'done', label: 'Completed' },
  { id: 'res', label: 'Resources' },
  { id: 'lab', label: 'Labs' },
];

type PersonalResource = Extract<PersonalItem, { title: string }>;

const isResource = (i: PersonalItem): i is PersonalResource => 'title' in i;
const titleOf = (i: PersonalItem) => (isResource(i) ? i.title : i.task);

interface Row {
  item: PersonalItem;
  moduleTitle: string;
}

export function TodoPage() {
  const { tracks, items, loading, error, refresh, removeItem, setStatus } = useWorkspace();
  const { startWork } = useTimer();
  const { stats } = usePerformance();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [busyUid, setBusyUid] = useState<string | null>(null);

  const overall = useMemo(() => {
    const total = tracks.reduce((n, t) => n + t.total, 0);
    const done = tracks.reduce((n, t) => n + t.done, 0);
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [tracks]);

  // Modules that hold items but haven't been paged in yet.
  const pending = tracks.some((t) =>
    t.modules.some((m) => m.total > 0 && items[`${t.uid}:${m.id}`] === undefined),
  );

  const matches = (i: PersonalItem) => {
    const resource = isResource(i);
    if (filter === 'res' && !resource) return false;
    if (filter === 'lab' && resource) return false;
    if (filter === 'active' && i.status !== 'active') return false;
    if (filter === 'done' && i.status !== 'completed') return false;
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return titleOf(i).toLowerCase().includes(needle);
  };

  const groups = useMemo(
    () =>
      tracks
        .map((track) => {
          const rows: Row[] = track.modules.flatMap((m) => {
            const bundle = items[`${track.uid}:${m.id}`];
            if (!bundle) return [];
            return [
              ...bundle.resources.map((r) => ({ item: r as PersonalItem, moduleTitle: m.title })),
              ...bundle.labs.map((l) => ({ item: l as PersonalItem, moduleTitle: m.title })),
            ];
          });
          return { track, rows: rows.filter((r) => matches(r.item)) };
        })
        .filter((g) => g.rows.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tracks, items, filter, q],
  );

  const act = async (uid: string, fn: () => Promise<void>, msg?: string) => {
    setBusyUid(uid);
    try {
      await fn();
      if (msg) toast(msg, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Action failed — try again', 'error');
    } finally {
      setBusyUid(null);
    }
  };

  const beginWork = (t: PersonalTrack, i: PersonalItem) => {
    startWork({
      uid: i.uid,
      personalId: t.uid,
      originTrackId: t.originTrackId,
      originModuleId: i.originModuleId,
      title: titleOf(i),
      goal: i.estMinutes,
      elapsedSec: i.elapsedSec,
    });
    toast(`Working on “${titleOf(i)}” ⏱`, 'success');
    navigate('/');
  };

  if ((loading && tracks.length === 0) || (pending && tracks.length > 0 && groups.length === 0)) {
    return <Spinner />;
  }

  return (
    <div>
      <div className="page-header">
        <h1>To Do</h1>
        <p>Everything you have added, in one place.</p>
      </div>

      {error && <ErrorCard body={error} onRetry={() => void refresh()} />}

      <div className="overall-card">
        <div className="row row--between">
          <div>
            <div className="eyebrow">OVERALL PROGRESS</div>
            <div className="row" style={{ gap: 10, marginTop: 4 }}>
              <span className="overall-pct">{overall.pct}%</span>
              <span className="overall-pct-label">
                COMPLETE
                <br />
                {overall.done}/{overall.total} items
              </span>
            </div>
          </div>
          <div className="overall-streak">
            <Icon name="flame" size={16} /> {stats.streak}-day streak
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <PBar pct={overall.pct} large />
        </div>
      </div>

      <SearchBox value={q} onChange={setQ} placeholder="Search your tasks…" />
      <ChipRow options={FILTERS} value={filter} onChange={setFilter} />

      {tracks.length === 0 && !loading && (
        <EmptyState
          icon="🗒️"
          title="Nothing here yet"
          body="Add a track or individual resources from the Syllabus to build your study list."
        />
      )}

      {tracks.length > 0 && groups.length === 0 && !pending && (
        <EmptyState icon="🔍" title="No matching tasks" body="Try another filter or search term." />
      )}

      {pending && groups.length === 0 && <Spinner />}

      {groups.map(({ track, rows }) => {
        const isOpen = !collapsed[track.uid];
        const doneCount = rows.filter((r) => r.item.status === 'completed').length;
        return (
          <div key={track.uid} className="card" style={{ marginBottom: 12, padding: 14 }}>
            <div className="row" style={{ gap: 8 }}>
              <button
                type="button"
                className="row"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flex: 1, minWidth: 0 }}
                onClick={() => setCollapsed((c) => ({ ...c, [track.uid]: isOpen }))}
                aria-expanded={isOpen}
              >
                <span className="todo-row__icon">{track.icon}</span>
                <span style={{ minWidth: 0, textAlign: 'left' }}>
                  <span className="todo-row__title" style={{ display: 'block' }}>
                    {track.title}
                  </span>
                  <span className="todo-row__meta">
                    {doneCount}/{rows.length} shown done · {track.pct}% overall
                  </span>
                </span>
                <span
                  className="module-card__chevron"
                  style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}
                >
                  <Icon name="chevronRight" size={18} />
                </span>
              </button>
            </div>

            <div style={{ marginTop: 8 }}>
              <PBar pct={track.pct} />
            </div>

            {isOpen && (
              <div style={{ marginTop: 10 }}>
                {rows.map(({ item, moduleTitle }) => (
                  <ItemRow
                    key={item.uid}
                    item={item}
                    moduleTitle={moduleTitle}
                    busy={busyUid === item.uid}
                    onStart={() => beginWork(track, item)}
                    onToggle={() =>
                      act(item.uid, () =>
                        setStatus(item.uid, item.status === 'completed' ? 'active' : 'completed'),
                      )
                    }
                    onRemove={() => act(item.uid, () => removeItem(item.uid), 'Removed from To Do')}
                    onOpen={() => {
                      if (isResource(item)) {
                        if (item.url) window.open(item.url, '_blank', 'noopener');
                      } else {
                        navigate(
                          `/syllabus/${track.originTrackId}/modules/${item.originModuleId}/labs/${Math.max(
                            0,
                            (item.rank ?? 1) - 1,
                          )}`,
                        );
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ItemRow({
  item,
  moduleTitle,
  busy,
  onStart,
  onToggle,
  onRemove,
  onOpen,
}: {
  item: PersonalItem;
  moduleTitle: string;
  busy: boolean;
  onStart: () => void;
  onToggle: () => void;
  onRemove: () => void;
  onOpen: () => void;
}) {
  const resource = isResource(item);
  const done = item.status === 'completed';
  const kindLabel = resource ? (item as PersonalResource).kind.toUpperCase() : 'LAB';

  return (
    <div className={`resource-card${done ? ' done' : ''}`} style={{ marginBottom: 6 }}>
      <div className="row row--between" style={{ alignItems: 'flex-start', gap: 8 }}>
        <button
          type="button"
          className="resource-card__title"
          style={{ flex: 1 }}
          onClick={onOpen}
          title="Open"
        >
          {titleOf(item)}
          <span className="tiny" style={{ display: 'block', fontWeight: 400 }}>
            {moduleTitle} · {kindLabel}
            {item.elapsedSec > 0 ? ` · ${fmtClock(item.elapsedSec)} logged` : ''}
            {!resource && item.estMinutes > 0 ? ` · ${fmtTime(item.estMinutes)}` : ''}
          </span>
        </button>
        <div className="row" style={{ gap: 6 }}>
          <MiniBtn className="on" onClick={onStart} disabled={busy} title="Start the timer on this task">
            ⏱ Start
          </MiniBtn>
          <MiniBtn onClick={onToggle} disabled={busy} title={done ? 'Reopen' : 'Mark done'}>
            {done ? '↩' : '✓'}
          </MiniBtn>
          <button
            type="button"
            className="icon-btn"
            onClick={onRemove}
            disabled={busy}
            aria-label="Remove from To Do"
            title="Remove"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
