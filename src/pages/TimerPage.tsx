import { useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Sparkles } from 'lucide-react';
import type { PersonalItem, PersonalTrack } from '../api/types';
import { fmtMMSS, fmtTime, liveDate } from '../lib/format';
import { usePerformance, type FocusMode } from '../state/PerformanceContext';
import { useTheme, type Theme } from '../state/ThemeContext';
import { useTimer } from '../state/TimerContext';
import { useWorkspace } from '../state/WorkspaceContext';
import { Icon } from '../components/Icon';

const MODES: { id: FocusMode; label: string }[] = [
  { id: 'focus', label: 'Focus' },
  { id: 'short', label: 'Short break' },
  { id: 'long', label: 'Long break' },
];

const MODE_LABELS: Record<FocusMode, string> = {
  focus: 'FOCUS SESSION',
  short: 'SHORT BREAK',
  long: 'LONG BREAK',
};

/* Colour psychology: indigo/violet lowers arousal and supports sustained
   concentration, teal restores calm between sprints, amber signals reward.
   Light mode shifts each hue darker so text and arcs stay AA-readable. */
const MODE_THEMES: Record<
  Theme,
  Record<FocusMode, { accent: string; accent2: string; soft: string; ink: string }>
> = {
  dark: {
    focus: { accent: '#6366f1', accent2: '#a78bfa', soft: 'rgba(99,102,241,0.16)', ink: '#ffffff' },
    short: { accent: '#14b8a6', accent2: '#5eead4', soft: 'rgba(20,184,166,0.16)', ink: '#ffffff' },
    long: { accent: '#f59e0b', accent2: '#fcd34d', soft: 'rgba(245,158,11,0.16)', ink: '#ffffff' },
  },
  light: {
    focus: { accent: '#4f46e5', accent2: '#6d28d9', soft: 'rgba(79,70,229,0.10)', ink: '#4f46e5' },
    short: { accent: '#0f766e', accent2: '#0d9488', soft: 'rgba(13,148,136,0.10)', ink: '#0f766e' },
    long: { accent: '#b45309', accent2: '#d97706', soft: 'rgba(217,119,6,0.12)', ink: '#b45309' },
  },
};

const PRESETS = [15, 25, 45, 60];

const RING_R = 132;
const RING_C = 2 * Math.PI * RING_R;

const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const CARD =
  'rounded-[22px] border border-line bg-[image:var(--panel-bg)] p-[18px] shadow-[var(--shadow-card)]';

const EYEBROW = 'text-[10.5px] font-bold uppercase tracking-[0.16em] text-faint';

export function TimerPage() {
  const {
    mode,
    totalSec,
    remaining,
    countdownRunning,
    startLabel,
    hint,
    selectMode,
    adjustMinutes,
    setPreset,
    toggleCountdown,
    resetCountdown,
    work,
    workElapsed,
    workRunning,
    toggleWork,
    resetWork,
    completeWork,
    leaveWork,
    startWork,
  } = useTimer();
  const { tracks, items, overall } = useWorkspace();
  const { stats, todayStats } = usePerformance();
  const [leaving, setLeaving] = useState(false);

  const pct = totalSec > 0 ? remaining / totalSec : 0;
  const offset = RING_C * (1 - pct);
  const dotAngle = 360 * pct;

  // Active tasks already paged into the workspace cache.
  const activeItems = useMemo(() => {
    const out: { item: PersonalItem; track: PersonalTrack }[] = [];
    for (const t of tracks) {
      for (const m of t.modules) {
        const bundle = items[`${t.uid}:${m.id}`];
        if (!bundle) continue;
        for (const r of bundle.resources) out.push({ item: r, track: t });
        for (const l of bundle.labs) out.push({ item: l, track: t });
      }
    }
    return out
      .filter((x) => x.item.status === 'active' && x.item.uid !== work?.uid)
      .slice(0, 4);
  }, [tracks, items, work?.uid]);

  const todayMins = todayStats?.minutes ?? stats.last7[stats.last7.length - 1]?.mins ?? 0;
  const streak = todayStats?.streakDays ?? stats.streak;
  const weekMax = Math.max(1, ...stats.last7.map((d) => d.mins));
  const bestDay = Math.max(stats.bestDay, todayMins, 1);
  const dayPct = Math.min(100, Math.round((todayMins / bestDay) * 100));
  const workPct =
    work && work.goal > 0 ? Math.min(100, Math.round((workElapsed / 60 / work.goal) * 100)) : 0;

  const { theme } = useTheme();
  const modeTheme = MODE_THEMES[theme][mode];
  const themeVars = {
    '--tp-accent': modeTheme.accent,
    '--tp-accent-2': modeTheme.accent2,
    '--tp-accent-soft': modeTheme.soft,
    '--tp-accent-ink': modeTheme.ink,
  } as CSSProperties;

  const statusText = countdownRunning
    ? 'in flow'
    : remaining === 0
      ? 'complete'
      : remaining < totalSec
        ? 'paused'
        : 'ready when you are';

  const onStartWork = (entry: { item: PersonalItem; track: PersonalTrack }) => {
    const { item, track } = entry;
    const title = 'title' in item ? item.title : item.task;
    startWork({
      uid: item.uid,
      personalId: track.uid,
      originTrackId: track.originTrackId,
      originModuleId: item.originModuleId,
      title,
      goal: item.estMinutes,
      elapsedSec: item.elapsedSec,
    });
  };

  const leave = async () => {
    setLeaving(true);
    try {
      await leaveWork();
    } finally {
      setLeaving(false);
    }
  };

  return (
    <div
      className="font-sans text-ink animate-[tp-in_0.5s_ease_both] motion-reduce:animate-none"
      style={themeVars}
    >
      {/* ---------- header ---------- */}
      <header className="relative z-[1] mb-6 flex flex-wrap items-start justify-between gap-6 max-[620px]:mb-4 max-[620px]:flex-col max-[620px]:gap-3">
        <div>
          <span className="inline-flex items-center gap-[9px] text-[10.5px] font-bold uppercase tracking-[0.2em] text-[var(--tp-accent-2)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--tp-accent-2)] shadow-[0_0_0_4px_var(--tp-accent-soft)] animate-[tp-pulse_2.6s_ease-in-out_infinite] motion-reduce:animate-none" />
            Focus studio
          </span>
          <h1 className="mb-1.5 mt-[9px] text-[clamp(24px,3vw,33px)] font-extrabold leading-[1.08] tracking-[-0.035em]">
            Make space for deep work.
          </h1>
          <p className="max-w-[46ch] text-[13.5px] text-muted">
            A calm, distraction-free timer that turns small sessions into lasting progress.
          </p>
        </div>

        <div className="flex flex-col items-end gap-[9px] max-[620px]:flex-row max-[620px]:items-center">
          <span className="whitespace-nowrap text-[11.5px] tracking-[0.02em] text-faint">
            {liveDate()}
          </span>
          <span className="inline-flex items-center gap-[7px] rounded-full border border-amber/25 bg-amber/10 px-[13px] py-[7px] text-xs font-semibold text-amber">
            <Icon name="flame" size={14} />
            {streak > 0 ? `${streak}-day streak` : 'Start a streak'}
          </span>
        </div>
      </header>

      <div className="relative z-[1] grid grid-cols-1 items-start gap-[18px] min-[881px]:grid-cols-[minmax(0,1.32fr)_minmax(286px,0.88fr)]">
        {/* ---------- countdown ---------- */}
        <section
          aria-label="Focus timer"
          className="flex flex-col items-center rounded-[30px] border border-line bg-[image:var(--panel-bg)] px-6 pb-[25px] pt-[22px] shadow-[var(--shadow-panel)] backdrop-blur-xl max-[620px]:px-3.5 max-[620px]:pb-5 max-[620px]:pt-[18px]"
        >
          <div
            role="tablist"
            className="flex gap-1 rounded-full border border-line-soft bg-track p-1 max-[620px]:w-full"
          >
            {MODES.map((m) => {
              const active = m.id === mode;
              const compact = m.id === 'focus' ? 'Focus' : m.id === 'short' ? 'Short' : 'Long';
              return (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => selectMode(m.id)}
                  className={`flex items-center gap-[7px] whitespace-nowrap rounded-full px-[15px] py-2 text-[12.5px] font-semibold transition-colors max-[620px]:flex-1 max-[620px]:justify-center max-[620px]:px-2 max-[620px]:text-[11px] ${
                    active
                      ? 'bg-[linear-gradient(135deg,var(--tp-accent),var(--tp-accent-2))] text-white shadow-[0_8px_20px_-8px_var(--tp-accent)]'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full max-[620px]:hidden ${
                      active
                        ? 'bg-white shadow-[0_0_0_3px_rgba(255,255,255,0.25)]'
                        : 'bg-current opacity-50'
                    }`}
                  />
                  <span className="min-[621px]:hidden">{compact}</span>
                  <span className="max-[620px]:hidden">{m.label}</span>
                </button>
              );
            })}
          </div>

          <div className="relative my-[14px] mb-0.5 grid aspect-square w-[min(322px,82vw)] place-items-center max-[620px]:my-3 max-[620px]:w-[min(250px,74vw)]">
            <svg
              viewBox="0 0 300 300"
              aria-hidden="true"
              className="absolute inset-0 h-full w-full -rotate-90 overflow-visible"
            >
              <defs>
                <linearGradient id="tpRingGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" style={{ stopColor: 'var(--tp-accent)' }} />
                  <stop offset="100%" style={{ stopColor: 'var(--tp-accent-2)' }} />
                </linearGradient>
              </defs>
              <circle
                cx="150"
                cy="150"
                r={RING_R}
                fill="none"
                strokeWidth={14}
                style={{ stroke: 'var(--ring-track)' }}
              />
              <circle
                cx="150"
                cy="150"
                r={RING_R - 22}
                fill="none"
                strokeWidth={1.5}
                strokeDasharray="1 9"
                strokeLinecap="round"
                style={{ stroke: 'var(--ring-orbit)' }}
              />
              <circle
                cx="150"
                cy="150"
                r={RING_R}
                fill="none"
                stroke="url(#tpRingGrad)"
                strokeWidth={14}
                strokeLinecap="round"
                strokeDasharray={RING_C}
                strokeDashoffset={offset}
                style={{
                  transition: 'stroke-dashoffset 0.9s linear',
                  filter:
                    'drop-shadow(0 0 11px color-mix(in srgb, var(--tp-accent) 70%, transparent))',
                }}
              />
              <g
                style={{
                  transform: `rotate(${dotAngle}deg)`,
                  transformOrigin: '150px 150px',
                  transition: 'transform 0.9s linear',
                }}
              >
                <circle
                  cx="150"
                  cy={150 - RING_R}
                  r={6.5}
                  fill="#fff"
                  style={{ filter: 'drop-shadow(0 0 7px var(--tp-accent-2))' }}
                />
              </g>
            </svg>

            <div className="relative z-[1] flex flex-col items-center text-center">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-[var(--tp-accent-2)]">
                {MODE_LABELS[mode]}
              </span>
              <span
                className="my-1 text-[clamp(52px,7vw,72px)] font-bold leading-[1.02] tracking-[-0.045em] tabular-nums text-ink"
                style={{
                  textShadow: '0 0 44px color-mix(in srgb, var(--tp-accent) 45%, transparent)',
                }}
              >
                {fmtMMSS(remaining)}
              </span>
              <span className="text-xs text-muted">
                of {Math.round(totalSec / 60)} min · {statusText}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4 max-[620px]:mt-3">
            <button
              type="button"
              onClick={() => adjustMinutes(-5)}
              disabled={totalSec <= 60}
              aria-label="Less time"
              className="grid h-[38px] w-[38px] place-items-center rounded-full border border-line bg-surface text-lg leading-none text-ink transition-colors enabled:hover:border-[color-mix(in_srgb,var(--tp-accent)_45%,transparent)] enabled:hover:bg-[var(--tp-accent-soft)] enabled:hover:text-[var(--tp-accent-ink)] disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Minus size={18} strokeWidth={2} />
            </button>
            <div className="min-w-[78px] text-center">
              <span className="block text-[9.5px] font-bold tracking-[0.2em] text-faint">
                DURATION
              </span>
              <span className="text-sm font-bold tabular-nums text-ink">
                {Math.round(totalSec / 60)} min
              </span>
            </div>
            <button
              type="button"
              onClick={() => adjustMinutes(5)}
              disabled={totalSec >= 180 * 60}
              aria-label="More time"
              className="grid h-[38px] w-[38px] place-items-center rounded-full border border-line bg-surface text-lg leading-none text-ink transition-colors enabled:hover:border-[color-mix(in_srgb,var(--tp-accent)_45%,transparent)] enabled:hover:bg-[var(--tp-accent-soft)] enabled:hover:text-[var(--tp-accent-ink)] disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Plus size={18} strokeWidth={2} />
            </button>
          </div>

          <div className="mt-3.5 flex flex-wrap justify-center gap-[7px] max-[620px]:mt-3">
            {PRESETS.map((p) => {
              const active = totalSec === p * 60;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPreset(p)}
                  className={`rounded-full border px-[13px] py-[7px] text-xs font-semibold transition-colors ${
                    active
                      ? 'border-[color-mix(in_srgb,var(--tp-accent)_55%,transparent)] bg-[var(--tp-accent-soft)] text-[var(--tp-accent-ink)]'
                      : 'border-line-soft text-muted hover:border-line-strong hover:text-ink'
                  }`}
                >
                  {p} min
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex w-full max-w-[400px] gap-2.5 max-[620px]:mt-4 max-[620px]:max-w-none">
            <button
              type="button"
              onClick={toggleCountdown}
              className={`flex flex-1 items-center justify-center gap-[9px] rounded-2xl px-5 py-3.5 text-[15px] font-bold text-white transition-[transform,box-shadow,filter,background] duration-200 active:translate-y-px ${
                countdownRunning
                  ? 'bg-[linear-gradient(135deg,#1e293b,#334155)] shadow-[0_12px_26px_-14px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.12)]'
                  : 'bg-[linear-gradient(135deg,var(--tp-accent),var(--tp-accent-2))] shadow-[0_16px_36px_-14px_var(--tp-accent),inset_0_1px_0_rgba(255,255,255,0.3)] hover:brightness-110'
              }`}
            >
              <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-white/20">
                <Icon
                  name={countdownRunning ? 'pause' : 'play'}
                  size={17}
                  fill={!countdownRunning}
                />
              </span>
              {startLabel}
            </button>
            <button
              type="button"
              onClick={resetCountdown}
              aria-label="Reset timer"
              className="inline-flex items-center gap-[7px] rounded-2xl border border-line bg-surface px-[18px] text-[13.5px] font-semibold text-muted transition-colors hover:bg-surface-strong hover:text-ink"
            >
              <Icon name="restart" size={17} />
              Reset
            </button>
          </div>

          <p className="mt-3 min-h-[17px] text-center text-xs text-faint">{hint}</p>
        </section>

        {/* ---------- side column ---------- */}
        <aside className="flex flex-col gap-3.5 max-[880px]:grid max-[880px]:grid-cols-2 max-[880px]:items-start max-[620px]:grid-cols-1">
          <div className={`${CARD} max-[880px]:col-span-2 max-[620px]:col-span-1`}>
            <div className="mb-3.5 flex items-center justify-between gap-2.5">
              <span className={EYEBROW}>Today&apos;s momentum</span>
              <Icon name="clock" size={16} className="text-faint" />
            </div>
            <div className="text-[32px] font-bold leading-[1.1] tracking-[-0.03em] text-ink">
              {todayMins ? fmtTime(todayMins) : '0 min'}
            </div>
            <div className="mb-[9px] mt-[11px] h-1.5 overflow-hidden rounded-full bg-surface-strong">
              <span
                className="block h-full rounded-full bg-[linear-gradient(90deg,var(--tp-accent),var(--tp-accent-2))] shadow-[0_0_12px_var(--tp-accent)] transition-[width] duration-500"
                style={{ width: `${dayPct}%` }}
              />
            </div>
            <div className="flex justify-between gap-2 text-[11px] text-faint">
              <span>Best day · {stats.bestDay ? fmtTime(stats.bestDay) : '—'}</span>
              <span>
                {overall.done}/{overall.total} tasks done
              </span>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1.5">
              {stats.last7.map((d, i) => (
                <div key={d.date} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`flex h-11 w-full items-end overflow-hidden rounded-md ${
                      i === 6 ? 'bg-surface-strong' : 'bg-surface'
                    }`}
                  >
                    <span
                      className="w-full rounded-md bg-[linear-gradient(to_top,var(--tp-accent),var(--tp-accent-2))] opacity-85"
                      style={{ height: `${Math.max(8, (d.mins / weekMax) * 100)}%` }}
                    />
                  </div>
                  <span
                    className={`text-[9.5px] font-semibold ${
                      i === 6 ? 'text-ink' : 'text-faint'
                    }`}
                  >
                    {WEEK[d.dow]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={`${CARD} flex items-center gap-3.5`}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border border-amber/20 bg-[radial-gradient(circle_at_30%_20%,rgba(251,191,36,0.24),rgba(251,191,36,0.06))] text-amber shadow-[0_8px_24px_-14px_rgba(251,191,36,0.9)]">
              <Icon name="flame" size={20} />
            </span>
            <div>
              <div className="text-sm font-bold text-ink">
                {streak > 0 ? `${streak}-day streak` : 'Start a streak'}
              </div>
              <p className="mt-[3px] text-[11.5px] leading-[1.45] text-muted">
                {streak > 0
                  ? `${fmtTime(stats.totalMins) || '0 min'} focused across ${stats.totalSessions} sessions. One session keeps it alive.`
                  : 'Finish a focus session today to light the flame.'}
              </p>
            </div>
          </div>

          {work ? (
            <div className="rounded-[22px] border border-[color-mix(in_srgb,var(--tp-accent)_32%,transparent)] bg-[linear-gradient(180deg,var(--tp-accent-soft),transparent),var(--panel-bg)] p-[18px] shadow-[var(--shadow-card)]">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--tp-accent-2)]">
                  <Icon name="flag" size={13} />
                  In progress
                </span>
                <span className="h-2 w-2 rounded-full bg-mint shadow-[0_0_0_4px_rgba(52,211,153,0.15)] animate-[tp-pulse_1.8s_ease-in-out_infinite] motion-reduce:animate-none" />
              </div>
              <div className="text-sm font-bold leading-[1.35] text-ink">{work.title}</div>
              <div className="mb-0.5 mt-1.5 text-[40px] font-bold leading-[1.1] tracking-[-0.03em] tabular-nums text-ink">
                {fmtMMSS(workElapsed)}
              </div>
              <div className="text-[11.5px] text-muted">
                {work.goal > 0 ? `Goal ${fmtTime(work.goal)}` : 'Open-ended session'}
              </div>
              {work.goal > 0 && (
                <div className="mt-2.5 h-[5px] overflow-hidden rounded-full bg-surface-strong">
                  <span
                    className="block h-full rounded-full bg-[linear-gradient(90deg,var(--tp-accent),var(--tp-accent-2))] transition-[width] duration-500"
                    style={{ width: `${workPct}%` }}
                  />
                </div>
              )}
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  onClick={toggleWork}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[linear-gradient(135deg,var(--tp-accent),var(--tp-accent-2))] px-3 py-2.5 text-[12.5px] font-bold text-white transition hover:brightness-110"
                >
                  <Icon name={workRunning ? 'pause' : 'play'} size={15} />
                  {workRunning ? 'Pause' : 'Resume'}
                </button>
                <button
                  type="button"
                  onClick={() => void completeWork()}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-mint/30 bg-mint/10 px-3 py-2.5 text-[12.5px] font-bold text-mint transition hover:bg-mint/[0.18]"
                >
                  <Icon name="checkCircle" size={15} />
                  Complete
                </button>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={resetWork}
                  className="flex flex-1 items-center justify-center rounded-xl border border-line-soft bg-surface px-3 py-2.5 text-[12px] font-semibold text-muted transition-colors hover:bg-surface-strong hover:text-ink"
                >
                  Reset time
                </button>
                <button
                  type="button"
                  onClick={() => void leave()}
                  disabled={leaving}
                  className="flex flex-1 items-center justify-center rounded-xl border border-line-soft bg-surface px-3 py-2.5 text-[12px] font-semibold text-muted transition-colors hover:bg-surface-strong hover:text-ink disabled:opacity-50"
                >
                  {leaving ? 'Saving…' : 'Save & leave'}
                </button>
              </div>
            </div>
          ) : activeItems.length > 0 ? (
            <div className={CARD}>
              <div className="mb-3.5 flex items-center justify-between gap-2.5">
                <span className={EYEBROW}>Up next</span>
                <Link
                  to="/todo"
                  className="inline-flex items-center gap-0.5 text-[11.5px] font-semibold text-muted transition-colors hover:text-[var(--tp-accent-2)]"
                >
                  All tasks
                  <Icon name="chevronRight" size={13} />
                </Link>
              </div>
              <ul className="flex flex-col gap-0.5">
                {activeItems.map((entry) => {
                  const item = entry.item;
                  const title = 'title' in item ? item.title : item.task;
                  return (
                    <li
                      key={item.uid}
                      className="flex items-center gap-2.5 rounded-xl px-2 py-[9px] transition-colors hover:bg-surface"
                    >
                      <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[var(--tp-accent-2)] shadow-[0_0_0_3px_var(--tp-accent-soft)]" />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[12.5px] font-semibold text-ink">
                          {title}
                        </span>
                        <span className="truncate text-[10.5px] text-faint">
                          {fmtTime(item.estMinutes) || 'No time goal'} · {entry.track.title}
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-label={`Start ${title}`}
                        onClick={() => onStartWork(entry)}
                        className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full border border-line bg-surface text-ink transition-all hover:scale-105 hover:border-transparent hover:bg-[var(--tp-accent)] hover:text-white hover:shadow-[0_6px_16px_-8px_var(--tp-accent)]"
                      >
                        <Icon name="play" size={13} fill />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className={CARD}>
              <div className="mb-3.5 flex items-center justify-between gap-2.5">
                <span className={EYEBROW}>Up next</span>
              </div>
              <p className="text-xs leading-normal text-muted">
                Nothing queued.{' '}
                <Link to="/todo" className="font-semibold text-[var(--tp-accent-2)]">
                  Add a task
                </Link>{' '}
                to pair the timer with your goal.
              </p>
            </div>
          )}
        </aside>
      </div>

      <footer className="relative z-[1] mt-4 flex items-center gap-2.5 rounded-[18px] border border-line-soft bg-[linear-gradient(100deg,var(--tp-accent-soft),rgba(168,85,247,0.06)_55%,transparent)] px-[18px] py-3.5">
        <Sparkles size={15} className="shrink-0 text-[var(--tp-accent-2)]" />
        <p className="m-0 text-xs text-muted">
          Small sessions, repeated daily, compound into mastery. Your future self is already
          thanking you.
        </p>
      </footer>
    </div>
  );
}
