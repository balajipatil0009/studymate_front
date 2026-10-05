import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { ChipRow, EmptyState, MiniBtn } from '../components/ui';
import { dateKey, liveDate } from '../lib/format';
import { usePerformance, type FocusMode } from '../state/PerformanceContext';
import { useWorkspace } from '../state/WorkspaceContext';

const RANGE_FILTERS = [
  { id: 'all', label: 'All time' },
  { id: '30', label: 'Last 30 days' },
  { id: '7', label: 'Last 7 days' },
];

const GOAL_KEY = 'studymate-goal-v1';
const DEFAULT_GOAL = 120;

const HEAT_COLORS = ['#ebedf0', '#ceead6', '#a8dab5', '#71d18f', '#34a853'];
const MODE_META: Record<FocusMode, { name: string; color: string }> = {
  focus: { name: 'Deep Focus', color: '#1a73e8' },
  short: { name: 'Short Break', color: '#fbbc04' },
  long: { name: 'Long Break', color: '#34a853' },
};

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function PerformancePage() {
  const { sessions, stats, resetDemoData } = usePerformance();
  const { tracks } = useWorkspace();
  const [range, setRange] = useState('all');
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

  const { cells, months } = useMemo(() => buildHeatmap(stats.byDay), [stats.byDay]);

  return (
    <div>
      <div className="hero">
        <div className="hero__body">
          <div className="hero__eyebrow">✨ Consistency beats intensity</div>
          <h1 className="hero__title">Keep your streak</h1>
          <p className="hero__sub">
            Small sessions, stacked daily, turn into mastery. Here is your story so far.
          </p>
          <span className="date-pill">
            <Icon name="calendar" size={13} /> {liveDate()}
          </span>
        </div>
        <div className="hero__leaf">🌿</div>
      </div>

      {/* ---- headline stats ---- */}
      <div className="hero-stats">
        <StatCard
          label="Total focus"
          value={fmtHours(rangeStats.total)}
          icon={<Icon name="clock" size={17} />}
          color="#e8f0fe"
          ink="#1a73e8"
        />
        <StatCard
          label="Best day"
          value={fmtHours(rangeStats.best)}
          icon={<Icon name="award" size={17} />}
          color="#fef7e0"
          ink="#855300"
        />
        <StatCard
          label="Current streak"
          value={`${stats.streak} ${stats.streak === 1 ? 'day' : 'days'}`}
          icon={<Icon name="flame" size={17} />}
          color="#fce8e6"
          ink="#d70015"
        />
        <StatCard
          label="Sessions"
          value={String(rangeStats.sessions)}
          icon={<Icon name="checkCircle" size={17} />}
          color="#e6f4ea"
          ink="#1a7f37"
        />
      </div>

      <div className="row" style={{ marginTop: 14, justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ minWidth: 240, flex: 1 }}>
          <ChipRow options={RANGE_FILTERS} value={range} onChange={setRange} />
        </div>
        <MiniBtn onClick={resetDemoData} title="Regenerate the demo history">
          ↻ Reset demo data
        </MiniBtn>
      </div>

      {/* ---- heatmap ---- */}
      <section className="chart-card">
        <div className="chart-card__head">
          <span className="chart-card__title">Focus heatmap</span>
          <span className="badge">
            <Icon name="flame" size={12} /> {stats.streak}-day streak
          </span>
        </div>
        <div className="heatmap-scroll">
          <div className="heatmap__months">
            <span />
            {months.map((m, i) => (
              <span key={i} className="heatmap__month">
                {m}
              </span>
            ))}
          </div>
          <div className="heatmap">{cells}</div>
        </div>
        <div className="legend">
          Less
          {HEAT_COLORS.map((c) => (
            <span key={c} className="legend__cell" style={{ background: c }} />
          ))}
          More
        </div>
      </section>

      {/* ---- last 7 days ---- */}
      <section className="chart-card">
        <div className="chart-card__head">
          <span className="chart-card__title">Last 7 days</span>
          <span className={`badge${todayMins >= goal ? '' : ' badge--red'}`}>
            {todayMins >= goal ? '✓ On target' : 'Below goal'} · goal {fmtHours(goal)}
          </span>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 4, marginTop: 6 }}>
          <MiniBtn onClick={() => changeGoal(-30)}>−30m</MiniBtn>
          <MiniBtn onClick={() => changeGoal(30)}>＋30m</MiniBtn>
        </div>
        <WeeklyBars days={stats.last7} goal={goal} />
      </section>

      <div className="chart-card">
        <div className="chart-card__head">
          <span className="chart-card__title">Session types</span>
          <span className="badge">{rangeStats.counts.focus + rangeStats.counts.short + rangeStats.counts.long} total</span>
        </div>
        <div className="donut-wrap">
          <Donut counts={rangeStats.counts} />
          <div className="donut-legend">
            {(['focus', 'short', 'long'] as FocusMode[]).map((m) => {
              const c = rangeStats.counts[m];
              const total = rangeStats.counts.focus + rangeStats.counts.short + rangeStats.counts.long;
              return (
                <div className="donut-legend__row" key={m}>
                  <span className="donut-legend__dot" style={{ background: MODE_META[m].color }} />
                  <span className="donut-legend__name">{MODE_META[m].name}</span>
                  <span className="donut-legend__count">{c}</span>
                  <span className="donut-legend__pct">{total ? Math.round((c / total) * 100) : 0}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---- mastery ---- */}
      <section className="chart-card">
        <div className="chart-card__head">
          <span className="chart-card__title">Track mastery</span>
          <span className="badge">from your To Do list</span>
        </div>
        <div style={{ marginTop: 14 }}>
          {tracks.length === 0 && (
            <EmptyState icon="🌱" title="No tracks yet" body="Add a track from the Syllabus to start measuring mastery." />
          )}
          {tracks.map((t, i) => (
            <div className="mastery-row" key={t.uid}>
              <span
                className="mastery-row__icon"
                style={{
                  background: ['rgba(26,115,232,.12)', '#fef7e0', '#e6f4ea', '#fce8e6', '#f3e8fd', '#e0f7fa'][i % 6],
                  color: 'var(--primary)',
                }}
              >
                {t.icon}
              </span>
              <div className="mastery-row__body">
                <div className="mastery-row__head">
                  <span>{t.title}</span>
                  <span>{t.pct}%</span>
                </div>
                <div className="mastery-row__bar">
                  <div
                    className="mastery-row__fill"
                    style={{ width: `${t.pct}%`, background: 'linear-gradient(90deg,#66bb6a,#34a853)' }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="tiny" style={{ textAlign: 'center', marginTop: 18 }}>
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
    <div className="stat-card">
      <div className="stat-card__top">
        <span className="stat-card__label">{label}</span>
        <span className="stat-card__icon" style={{ background: color, color: ink }}>
          {icon}
        </span>
      </div>
      <div className="stat-card__value">{value}</div>
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

  return (
    <div className="bars" role="img" aria-label="Focus minutes over the last 7 days">
      <div className="bars__plot">
        <div className="bars__grid">
          {[0, 25, 50, 75, 100].map((p) => (
            <div className="bars__gridline" key={p}>
              <span>{Math.round(max * (1 - p / 100))}</span>
            </div>
          ))}
        </div>

        <div className="bars__cols">
          {days.map((d, i) => {
            const pct = d.mins > 0 ? Math.max(3, (d.mins / max) * 100) : 0;
            const today = i === days.length - 1;
            return (
              <div className="bars__col" key={`${d.date}-${i}`}>
                {d.mins > 0 && <span className="bars__value">{d.mins}</span>}
                <div className={`bars__bar${today ? ' today' : ''}`} style={{ height: `${pct}%` }} />
              </div>
            );
          })}
        </div>

        <div className="bars__goal" style={{ bottom: `${goalPct}%` }}>
          <span>goal {goal}m</span>
        </div>
      </div>

      <div className="bars__labels">
        {days.map((d, i) => (
          <span
            key={`${d.date}-label-${i}`}
            className={`bars__label${i === days.length - 1 ? ' today' : ''}`}
          >
            {DAY_LETTERS[i]}
          </span>
        ))}
      </div>
    </div>
  );
}

function Donut({ counts }: { counts: Record<FocusMode, number> }) {
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
        stroke={MODE_META[m].color}
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
    <div className="donut">
      <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={R} fill="none" stroke="#f1f3f4" strokeWidth="16" />
        {arcs}
      </svg>
      <div className="donut__center">
        <span className="donut__num">{total}</span>
        <span className="donut__cap">SESSIONS</span>
      </div>
    </div>
  );
}

/* ---- GitHub-style heatmap grid (17 weeks × 7 days) ---- */

function buildHeatmap(byDay: Record<string, number>) {
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
          className="heatmap__cell"
          style={{ background: future ? 'transparent' : HEAT_COLORS[lvl], cursor: future ? 'default' : 'pointer' }}
          title={future ? '' : `${dateKey(d)} — ${mins} min focused`}
          aria-label={`${dateKey(d)}: ${mins} minutes`}
          tabIndex={future ? -1 : 0}
        />,
      );
    }
  }

  return { cells, months };
}
