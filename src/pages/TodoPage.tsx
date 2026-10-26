import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ClipboardList, RotateCcw, Search, Timer, X } from 'lucide-react';
import type { PersonalItem, PersonalTrack } from '../api/types';
import { Icon } from '../components/Icon';
import { TrackIcon } from '../components/TrackIcon';
import {
  ChipRow,
  EmptyState,
  ErrorCard,
  MiniBtn,
  PBar,
  SearchBox,
  Spinner,
  languageName,
} from '../components/ui';
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
    toast(`Working on “${titleOf(i)}”`, 'success');
    navigate('/');
  };

  if ((loading && tracks.length === 0) || (pending && tracks.length > 0 && groups.length === 0)) {
    return <Spinner />;
  }

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-[-0.03em]">To Do</h1>
        <p className="mt-1 text-sm text-muted">Everything you have added, in one place.</p>
      </header>

      {error && <ErrorCard body={error} onRetry={() => void refresh()} />}

      <div className="relative mb-3 overflow-hidden rounded-[24px] border border-line bg-[linear-gradient(135deg,var(--hero-from),var(--hero-mid)_60%,var(--hero-to))] p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-faint">
              Overall progress
            </div>
            <div className="mt-1 flex items-center gap-2.5">
              <span className="text-[30px] font-extrabold leading-none tracking-[-0.03em]">
                {overall.pct}%
              </span>
              <span className="text-[10.5px] font-bold uppercase leading-tight tracking-[0.08em] text-faint">
                complete
                <br />
                {overall.done}/{overall.total} items
              </span>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber/25 bg-amber/10 px-2.5 py-1 text-[11.5px] font-bold text-amber">
            <Icon name="flame" size={14} /> {stats.streak}-day streak
          </span>
        </div>
        <div className="mt-3">
          <PBar pct={overall.pct} large />
        </div>
      </div>

      <SearchBox value={q} onChange={setQ} placeholder="Search your tasks…" />
      <ChipRow options={FILTERS} value={filter} onChange={setFilter} />

      {tracks.length === 0 && !loading && (
        <EmptyState
          icon={<ClipboardList size={34} strokeWidth={1.6} />}
          title="Nothing here yet"
          body="Add a track or individual resources from the Syllabus to build your study list."
        />
      )}

      {tracks.length > 0 && groups.length === 0 && !pending && (
        <EmptyState
          icon={<Search size={34} strokeWidth={1.6} />}
          title="No matching tasks"
          body="Try another filter or search term."
        />
      )}

      {pending && groups.length === 0 && <Spinner />}

      {groups.map(({ track, rows }) => {
        const isOpen = !collapsed[track.uid];
        const doneCount = rows.filter((r) => r.item.status === 'completed').length;
        return (
          <div
            key={track.uid}
            className="mb-3 rounded-[22px] border border-line bg-surface p-3.5 shadow-[var(--shadow-card)]"
          >
            <button
              type="button"
              className="flex w-full min-w-0 items-center gap-2 text-left"
              onClick={() => setCollapsed((c) => ({ ...c, [track.uid]: isOpen }))}
              aria-expanded={isOpen}
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] border border-brand/20 bg-[linear-gradient(135deg,rgba(99,102,241,0.26),rgba(168,85,247,0.12))] text-brand-soft">
                <TrackIcon id={track.originTrackId ?? track.id} size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15.5px] font-bold text-ink">{track.title}</span>
                <span className="block truncate text-[12px] text-muted">
                  {doneCount}/{rows.length} shown done · {track.pct}% overall
                </span>
              </span>
              <span
                className={`text-faint transition-transform ${isOpen ? 'rotate-90' : ''}`}
              >
                <Icon name="chevronRight" size={18} />
              </span>
            </button>

            <div className="mt-2">
              <PBar pct={track.pct} />
            </div>

            {isOpen && (
              <div className="mt-2.5">
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
    <div
      className={`mb-1.5 rounded-2xl border p-3 transition-colors ${
        done
          ? 'border-mint/20 bg-mint/[0.05]'
          : 'border-line bg-surface-strong hover:border-line-strong'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className={`flex-1 text-left text-[13.5px] font-bold transition-colors ${
            done ? 'text-mint' : 'text-ink hover:text-brand-soft'
          }`}
          onClick={onOpen}
          title="Open"
        >
          {titleOf(item)}
          <span className="mt-0.5 block text-[11.5px] font-normal text-faint">
            {moduleTitle} · {kindLabel} · {languageName(item.language)}
            {item.elapsedSec > 0 ? ` · ${fmtClock(item.elapsedSec)} logged` : ''}
            {!resource && item.estMinutes > 0 ? ` · ${fmtTime(item.estMinutes)}` : ''}
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-1.5">
          <MiniBtn active onClick={onStart} disabled={busy} title="Start the timer on this task">
            <Timer size={12} /> Start
          </MiniBtn>
          <MiniBtn onClick={onToggle} disabled={busy} title={done ? 'Reopen' : 'Mark done'}>
            {done ? <RotateCcw size={12} /> : <Check size={12} />}
          </MiniBtn>
          <button
            type="button"
            className="grid h-7 w-7 place-items-center rounded-full text-faint transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
            onClick={onRemove}
            disabled={busy}
            aria-label="Remove from To Do"
            title="Remove"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
