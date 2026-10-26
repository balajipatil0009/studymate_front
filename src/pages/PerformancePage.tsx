import { useMemo, useState } from 'react';
import { Check, Leaf, Minus, Plus, RefreshCw, Sparkles, Sprout } from 'lucide-react';
import { Icon } from '../components/Icon';
import { TrackIcon } from '../components/TrackIcon';
import { ChipRow, EmptyState, MiniBtn } from '../components/ui';
import { dateKey, liveDate } from '../lib/format';
import { usePerformance, type FocusMode } from '../state/PerformanceContext';
import { useTheme, type Theme } from '../state/ThemeContext';
import { useWorkspace } from '../state/WorkspaceContext';

const RANGE_FILTERS = [
  { id: 'all', label: 'All time' },
  { id: '30', label: 'Last 30 days' },
  { id: '7', label: 'Last 7 days' },
];

const GOAL_KEY = 'studymate-goal-v1';
const DEFAULT_GOAL = 120;

const HEAT_COLORS: Record<Theme, string[]> = {
  dark: ['#141b2c', '#25336b', '#4338ca', '#6366f1', '#a78bfa'],
  light: ['#eef1f8', '#c7d2fe', '#818cf8', '#4f46e5', '#3730a3'],
};

const MODE_META: Record<Theme, Record<FocusMode, { name: string; color: string }>> = {
  dark: {
    focus: { name: 'Deep Focus', color: '#818cf8' },
    short: { name: 'Short Break', color: '#2dd4bf' },
    long: { name: 'Long Break', color: '#fbbf24' },
  },
  light: {
    focus: { name: 'Deep Focus', color: '#4f46e5' },
    short: { name: 'Short Break', color: '#0d9488' },
    long: { name: 'Long Break', color: '#d97706' },
  },
};

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const MASTERY_TINTS: Record<Theme, string[]> = {
  dark: [
    'rgba(99,102,241,0.2)',
    'rgba(251,191,36,0.16)',
    'rgba(52,211,153,0.16)',
    'rgba(248,113,113,0.16)',
    'rgba(168,85,247,0.16)',
    'rgba(34,211,238,0.16)',
  ],
  light: [
    'rgba(79,70,229,0.10)',
    'rgba(180,83,9,0.10)',
    'rgba(5,150,105,0.10)',
    'rgba(220,38,38,0.08)',
    'rgba(124,58,237,0.10)',
    'rgba(8,145,178,0.10)',
  ],
};

const STAT_TINTS: Record<Theme, { color: string; ink: string }[]> = {
  dark: [
    { color: 'rgba(99,102,241,0.2)', ink: '#a5b4fc' },
    { color: 'rgba(251,191,36,0.16)', ink: '#fbbf24' },
    { color: 'rgba(248,113,113,0.16)', ink: '#f87171' },
    { color: 'rgba(52,211,153,0.16)', ink: '#34d399' },
  ],
  light: [
    { color: 'rgba(79,70,229,0.10)', ink: '#4f46e5' },
    { color: 'rgba(180,83,9,0.10)', ink: '#b45309' },
    { color: 'rgba(220,38,38,0.08)', ink: '#dc2626' },
    { color: 'rgba(5,150,105,0.10)', ink: '#059669' },
  ],
};

const CHART =
  'mt-4 rounded-[22px] border border-line bg-surface p-4 shadow-[var(--shadow-card)]';

export function PerformancePage() {
  const { sessions, stats, resetDemoData } = usePerformance();
  const { tracks } = useWorkspace();
  const { theme } = useTheme();
  const [range, setRange] = useState('all');
  const heatColors = HEAT_COLORS[theme];
  const modeMeta = MODE_META[theme];
  const masteryTints = MASTERY_TINTS[theme];
  const [focusTint, bestTint, streakTint, sessionsTint] = STAT_TINTS[theme];
  const [goal, setGoal] = useState(() => {
    const raw = Number(localStorage.getItem(GOAL_KEY));
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_GOAL;
  });

  const changeGoal = (delta: number) => {
    const next = Math.max(30, Math.min(600, goal + delta));
    setGoal(next);
    localStorage.setItem(GOAL_KEY, String(next));
  };

  const rangeSessions = useMemo(() => {
    if (range === 'all') return sessions;
    const days = Number(range);
    const cutoff = Date.now() - days * 86_400_000;
    return sessions.filter((s) => s.ts >= cutoff);
  }, [sessions, range]);

  const rangeStats = useMemo(() => {
    const focus = rangeSessions.filter((s) => s.completed && s.mode === 'focus');
    const byDay: Record<string, number> = {};
    for (const s of focus) {
      const k = dateKey(new Date(s.ts));
      byDay[k] = (byDay[k] ?? 0) + s.mins;
    }
    const total = focus.reduce((n, s) => n + s.mins, 0);
    const best = Object.values(byDay).reduce((m, v) => Math.max(m, v), 0);
    const counts: Record<FocusMode, number> = { focus: 0, short: 0, long: 0 };
    for (const s of rangeSessions.filter((x) => x.completed)) counts[s.mode]++;
    return { total, best, counts, sessions: focus.length, byDay };
  }, [rangeSessions]);

  const todayMins = stats.byDay[dateKey(new Date())] ?? 0;

  const { cells, months } = useMemo(() => buildHeatmap(stats.byDay, heatColors), [stats.byDay, heatColors]);

  return (
    <div>
      <div className="relative overflow-hidden rounded-[28px] border border-line bg-[linear-gradient(135deg,var(--hero-from),var(--hero-mid)_55%,var(--hero-to-amber))] p-6 shadow-[var(--shadow-card)]">
        <div className="relative z-10 max-w-[54ch]">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-soft">
            <Sparkles size={13} />
            Consistency beats intensity
          </div>
          <h1 className="mt-2 text-[30px] font-extrabold leading-tight tracking-[-0.035em]">
            Keep your streak
          </h1>
          <p className="mt-1 text-sm text-muted">
            Small sessions, stacked daily, turn into mastery. Here is your story so far.
          </p>
          <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/15 px-2.5 py-1 text-[12px] font-semibold text-brand-soft">
            <Icon name="calendar" size={13} /> {liveDate()}
          </span>
        </div>
        <Leaf
          size={110}
          strokeWidth={1.2}
          aria-hidden="true"
          className="pointer-events-none absolute -right-2 -top-5 text-brand-soft opacity-10"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatCard
          label="Total focus"
          value={fmtHours(rangeStats.total)}
          icon={<Icon name="clock" size={17} />}
          color={focusTint.color}
          ink={focusTint.ink}
        />
        <StatCard
          label="Best day"
          value={fmtHours(rangeStats.best)}
          icon={<Icon name="award" size={17} />}
          color={bestTint.color}
          ink={bestTint.ink}
        />
        <StatCard
          label="Current streak"
          value={`${stats.streak} ${stats.streak === 1 ? 'day' : 'days'}`}
          icon={<Icon name="flame" size={17} />}
          color={streakTint.color}
          ink={streakTint.ink}
        />
        <StatCard
          label="Sessions"
          value={String(rangeStats.sessions)}
          icon={<Icon name="checkCircle" size={17} />}
          color={sessionsTint.color}
          ink={sessionsTint.ink}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-[240px] flex-1">
          <ChipRow options={RANGE_FILTERS} value={range} onChange={setRange} />
        </div>
        <MiniBtn onClick={resetDemoData} title="Regenerate the demo history">
          <RefreshCw size={12} /> Reset demo data
        </MiniBtn>
      </div>

      <section className={CHART}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[15px] font-bold">Focus heatmap</span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-surface-strong px-2 py-0.5 text-[11px] font-semibold text-muted">
            <Icon name="flame" size={12} /> {stats.streak}-day streak
          </span>
        </div>

        <div className="mt-4 overflow-x-auto pb-1">
          <div className="grid w-max grid-cols-[20px_repeat(17,14px)] gap-[3px]">
            <span />
            {months.map((m, i) => (
              <span key={i} className="text-[9px] font-semibold text-faint">
                {m}
              </span>
            ))}
          </div>
          <div className="mt-1 grid w-max grid-cols-[20px_repeat(17,14px)] gap-[3px]">{cells}</div>
        </div>

        <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-faint">
          Less
          {heatColors.map((c) => (
            <span key={c} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: c }} />
          ))}
          More
        </div>
      </section>

      <section className={CHART}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[15px] font-bold">Last 7 days</span>
          <span
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold ${
              todayMins >= goal ? 'bg-mint/10 text-mint' : 'bg-danger/10 text-danger'
            }`}
          >
            {todayMins >= goal ? (
              <>
                <Check size={12} /> On target
              </>
            ) : (
              'Below goal'
            )}{' '}
            · goal {fmtHours(goal)}
          </span>
        </div>
        <div className="mt-1.5 flex justify-end gap-1">
          <MiniBtn onClick={() => changeGoal(-30)}>
            <Minus size={12} /> 30m
          </MiniBtn>
          <MiniBtn onClick={() => changeGoal(30)}>
            <Plus size={12} /> 30m
          </MiniBtn>
        </div>
        <WeeklyBars days={stats.last7} goal={goal} />
      </section>

      <div className={CHART}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[15px] font-bold">Session types</span>
          <span className="rounded-lg bg-surface-strong px-2 py-0.5 text-[11px] font-semibold text-muted">
            {rangeStats.counts.focus + rangeStats.counts.short + rangeStats.counts.long} total
          </span>
        </div>
        <div className="mt-3 flex flex-col items-center gap-5 sm:flex-row">
          <Donut counts={rangeStats.counts} />
          <div className="w-full flex-1">
            {(['focus', 'short', 'long'] as FocusMode[]).map((m) => {
              const c = rangeStats.counts[m];
              const total = rangeStats.counts.focus + rangeStats.counts.short + rangeStats.counts.long;
              return (
                <div className="flex items-center gap-2 py-1.5 text-[12px]" key={m}>
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: modeMeta[m].color }}
                  />
                  <span className="flex-1 font-medium text-ink">{modeMeta[m].name}</span>
                  <span className="font-bold">{c}</span>
                  <span className="w-10 text-right text-[11px] text-faint">
                    {total ? Math.round((c / total) * 100) : 0}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <section className={CHART}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[15px] font-bold">Track mastery</span>
          <span className="rounded-lg bg-surface-strong px-2 py-0.5 text-[11px] font-semibold text-muted">
            from your To Do list
          </span>
        </div>
        <div className="mt-4">
          {tracks.length === 0 && (
            <EmptyState
              icon={<Sprout size={34} strokeWidth={1.6} />}
              title="No tracks yet"
              body="Add a track from the Syllabus to start measuring mastery."
            />
          )}
          {tracks.map((t, i) => (
            <div className="mb-3 flex items-center gap-3" key={t.uid}>
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-base text-brand-soft"
                style={{ background: masteryTints[i % masteryTints.length] }}
              >
                <TrackIcon id={t.originTrackId ?? t.id} size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between text-[13px] font-semibold">
                  <span className="truncate">{t.title}</span>
                  <span>{t.pct}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-strong">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#6366f1,#a78bfa)] transition-[width] duration-700"
                    style={{ width: `${t.pct}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-5 text-center text-[12.5px] text-faint">
        History lives in this browser and is synced to the server when the sessions API is available.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function fmtHours(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.round((mins / 60) * 10) / 10;
  return `${h} h`;
}

function StatCard({
  label,
  value,
  icon,
  color,
  ink,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  ink: string;
}) {
  return (
    <div className="flex min-h-[96px] flex-col justify-between rounded-2xl border border-line bg-surface p-3.5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-semibold text-muted">{label}</span>
        <span
          className="grid h-8 w-8 place-items-center rounded-[10px]"
          style={{ background: color, color: ink }}
        >
          {icon}
        </span>
      </div>
      <div className="mt-2 text-[20px] font-extrabold tracking-[-0.02em]">{value}</div>
    </div>
  );
}

function WeeklyBars({
  days,
  goal,
}: {
  days: { date: string; mins: number; dow: number }[];
  goal: number;
}) {
  const max = Math.max(goal * 1.25, ...days.map((d) => d.mins), 60);
  const goalPct = Math.min(96, (goal / max) * 100);
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className="relative mt-2 h-[190px]" role="img" aria-label="Focus minutes over the last 7 days">
      <div className="absolute inset-x-0 bottom-6 top-0">
        <div className="pointer-events-none absolute bottom-0 left-[26px] right-0 top-3.5 flex flex-col justify-between">
          {[0, 25, 50, 75, 100].map((p) => (
            <div className="relative border-t border-line-soft" key={p}>
              <span className="absolute -left-[26px] -top-[7px] text-[9.5px] text-faint">
                {Math.round(max * (1 - p / 100))}
              </span>
            </div>
          ))}
        </div>

        <div className="absolute bottom-0 left-[26px] right-0 top-3.5 flex items-end gap-2">
          {days.map((d, i) => {
            const pct = d.mins > 0 ? Math.max(3, (d.mins / max) * 100) : 0;
            const today = i === days.length - 1;
            return (
              <div
                className="relative z-[1] flex h-full flex-1 flex-col items-center justify-end gap-1"
                key={`${d.date}-${i}`}
              >
                {d.mins > 0 && (
                  <span className="text-[9px] font-bold text-brand-soft">{d.mins}</span>
                )}
                <div
                  className={`w-[54%] min-h-[2px] rounded-t-[5px] transition-[height] duration-700 ${
                    today
                      ? isLight
                        ? 'bg-[linear-gradient(180deg,#6366f1,#4338ca)]'
                        : 'bg-[linear-gradient(180deg,#a5b4fc,#6366f1)]'
                      : isLight
                        ? 'bg-[linear-gradient(180deg,#c7d2fe,#818cf8)]'
                        : 'bg-[linear-gradient(180deg,#4f5bd5,#232b52)]'
                  }`}
                  style={{ height: `${pct}%` }}
                />
              </div>
            );
          })}
        </div>

        <div
          className="pointer-events-none absolute left-[26px] right-0 z-[2] border-t border-dashed border-danger/60"
          style={{ bottom: `${goalPct}%` }}
        >
          <span className="absolute -top-[15px] left-0 text-[9.5px] font-bold text-danger">
            goal {goal}m
          </span>
        </div>
      </div>

      <div className="absolute bottom-0 left-[26px] right-0 flex gap-2">
        {days.map((d, i) => (
          <span
            key={`${d.date}-label-${i}`}
            className={`flex-1 text-center text-[9.5px] ${
              i === days.length - 1 ? 'font-bold text-brand-soft' : 'text-faint'
            }`}
          >
            {DAY_LETTERS[i]}
          </span>
        ))}
      </div>
    </div>
  );
}

function Donut({ counts }: { counts: Record<FocusMode, number> }) {
  const { theme } = useTheme();
  const meta = MODE_META[theme];
  const trackColor = theme === 'light' ? '#e6eaf2' : '#1b2438';
  const total = counts.focus + counts.short + counts.long;
  const R = 46;
  const C = 2 * Math.PI * R;
  let acc = 0;

  const arcs = (['focus', 'short', 'long'] as FocusMode[]).map((m) => {
    const frac = total ? counts[m] / total : 0;
    const dash = frac * C;
    const el = (
      <circle
        key={m}
        cx="60"
        cy="60"
        r={R}
        fill="none"
        stroke={meta[m].color}
        strokeWidth="16"
        strokeDasharray={`${dash} ${C - dash}`}
        strokeDashoffset={-acc * C}
        transform="rotate(-90 60 60)"
      />
    );
    acc += frac;
    return el;
  });

  return (
    <div className="relative h-[120px] w-[120px] shrink-0">
      <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={R} fill="none" stroke={trackColor} strokeWidth="16" />
        {arcs}
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className="text-[22px] font-extrabold leading-none tracking-[-0.02em]">{total}</span>
        <span className="mt-0.5 text-[8.5px] font-bold tracking-[0.08em] text-faint">SESSIONS</span>
      </div>
    </div>
  );
}

/* ---- GitHub-style heatmap grid (17 weeks × 7 days) ---- */

function buildHeatmap(byDay: Record<string, number>, colors: string[]) {
  const WEEKS = 17;
  const today = new Date();
  const dow = (today.getDay() + 6) % 7; // 0 = Monday
  const end = today;
  const start = new Date(end);
  start.setDate(end.getDate() - (WEEKS * 7 - 1) - dow);

  const level = (mins: number) => {
    if (mins <= 0) return 0;
    if (mins < 30) return 1;
    if (mins < 60) return 2;
    if (mins < 120) return 3;
    return 4;
  };

  const cells: React.ReactNode[] = [];
  const months: string[] = [];
  let lastMonth = -1;

  for (let c = 0; c < WEEKS; c++) {
    const colDate = new Date(start);
    colDate.setDate(start.getDate() + c * 7);
    months.push(colDate.getMonth() !== lastMonth ? colDate.toLocaleString('en', { month: 'short' }) : '');
    lastMonth = colDate.getMonth();

    for (let r = 0; r < 7; r++) {
      const d = new Date(start);
      d.setDate(start.getDate() + c * 7 + r);
      const future = d.getTime() > end.getTime() + 86_400_000;
      const mins = byDay[dateKey(d)] ?? 0;
      const lvl = level(mins);
      cells.push(
        <button
          key={`${c}-${r}`}
          type="button"
          className="h-3.5 w-3.5 rounded-[3px] p-0 transition-[outline] hover:outline hover:outline-1 hover:outline-line-strong"
          style={{
            background: future ? 'transparent' : colors[lvl],
            cursor: future ? 'default' : 'pointer',
          }}
          title={future ? '' : `${dateKey(d)} — ${mins} min focused`}
          aria-label={`${dateKey(d)}: ${mins} minutes`}
          tabIndex={future ? -1 : 0}
        />,
      );
    }
  }

  return { cells, months };
}
