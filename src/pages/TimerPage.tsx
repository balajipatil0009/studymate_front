import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PersonalItem, PersonalTrack } from '../api/types';
import { fmtMMSS, fmtTime } from '../lib/format';
import { usePerformance, type FocusMode } from '../state/PerformanceContext';
import { useTimer } from '../state/TimerContext';
import { useWorkspace } from '../state/WorkspaceContext';
import { Icon } from '../components/Icon';
import { Btn, CircleBtn, EncourageCard, StatTile } from '../components/ui';

const MODE_LABELS: Record<FocusMode, string> = {
  focus: 'FOCUS',
  short: 'SHORT BREAK',
  long: 'LONG BREAK',
};

const PRESETS = [15, 25, 45, 60];

const RING_R = 132;
const RING_C = 2 * Math.PI * RING_R;

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
  const { stats } = usePerformance();
  const [leaving, setLeaving] = useState(false);

  const pct = totalSec > 0 ? remaining / totalSec : 0;
  const offset = RING_C * (1 - pct);

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

  const todayMins = stats.last7[stats.last7.length - 1]?.mins ?? 0;

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
    <div className="timer-wrap">
      {/* ---------- countdown ---------- */}
      <div className="seg" style={{ width: '100%', maxWidth: 420 }} role="tablist">
        {(['focus', 'short', 'long'] as FocusMode[]).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={m === mode}
            className={`seg__btn${m === mode ? ' active' : ''}`}
            onClick={() => selectMode(m)}
          >
            <span aria-hidden="true">{m === 'focus' ? '🧠' : m === 'short' ? '☕' : '🌿'}</span>
            {m === 'focus' ? 'Focus' : m === 'short' ? 'Short' : 'Long'}
          </button>
        ))}
      </div>

      <div className="ring">
        <svg viewBox="0 0 300 300" width="100%" height="100%" aria-hidden="true">
          <defs>
            <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1a73e8" />
              <stop offset="100%" stopColor="#64b5f6" />
            </linearGradient>
          </defs>
          <circle cx="150" cy="150" r={RING_R} fill="none" stroke="#e8eaed" strokeWidth="16" />
          <circle
            cx="150"
            cy="150"
            r={RING_R}
            fill="none"
            stroke="url(#ringGrad)"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={RING_C}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.9s linear' }}
          />
        </svg>
        <div className="ring__center">
          <span className="mode-chip">{MODE_LABELS[mode]}</span>
          <span className="time">{fmtMMSS(remaining)}</span>
          <span className="time-sub">of {Math.round(totalSec / 60)} min</span>
        </div>
      </div>

      <div className="stepper">
        <button
          type="button"
          className="stepper__btn"
          onClick={() => adjustMinutes(-5)}
          disabled={totalSec <= 60}
          aria-label="Less time"
        >
          −
        </button>
        <div style={{ textAlign: 'center' }}>
          <div className="stepper__label">DURATION</div>
          <div style={{ fontWeight: 700 }}>{Math.round(totalSec / 60)} min</div>
        </div>
        <button
          type="button"
          className="stepper__btn"
          onClick={() => adjustMinutes(5)}
          disabled={totalSec >= 180 * 60}
          aria-label="More time"
        >
          ＋
        </button>
      </div>

      <div className="presets">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            className={`preset${totalSec === p * 60 ? ' active' : ''}`}
            onClick={() => setPreset(p)}
          >
            {p} min
          </button>
        ))}
      </div>

      <div className="timer-controls">
        <Btn variant={countdownRunning ? 'paused' : 'primary'} large onClick={toggleCountdown}>
          <Icon name={countdownRunning ? 'pause' : 'play'} size={17} fill={countdownRunning ? false : true} />
          {startLabel}
        </Btn>
        <Btn variant="soft" large onClick={resetCountdown} aria-label="Reset timer">
          <Icon name="restart" size={17} />
          Reset
        </Btn>
      </div>
      <p className="hint">{hint}</p>

      {/* ---------- work stopwatch ---------- */}
      {work ? (
        <div className="work-card" style={{ marginTop: 16 }}>
          <div className="work-card__title">
            <Icon name="flag" size={15} />
            {work.title}
          </div>
          <div className="time" style={{ fontSize: 44 }}>
            {fmtMMSS(workElapsed)}
          </div>
          <p className="hint" style={{ margin: 0 }}>
            {work.goal > 0 ? `Goal: ${fmtTime(work.goal)}` : 'No time goal — track as long as you like'}
          </p>
          <div className="work-actions">
            <Btn variant={workRunning ? 'paused' : 'primary'} onClick={toggleWork}>
              <Icon name={workRunning ? 'pause' : 'play'} size={16} />
              {workRunning ? 'Pause' : 'Resume'}
            </Btn>
            <Btn variant="green" onClick={() => void completeWork()}>
              ✓ Complete
            </Btn>
          </div>
          <div className="work-actions">
            <Btn variant="soft" onClick={resetWork}>
              Reset time
            </Btn>
            <Btn variant="ghost" onClick={() => void leave()} disabled={leaving}>
              {leaving ? 'Saving…' : 'Save & leave'}
            </Btn>
          </div>
        </div>
      ) : (
        activeItems.length > 0 && (
          <div className="work-card" style={{ marginTop: 16 }}>
            <div className="eyebrow">START WORKING ON…</div>
            {activeItems.map((entry) => {
              const item = entry.item;
              const title = 'title' in item ? item.title : item.task;
              return (
                <div className="row row--between" key={item.uid}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1, minWidth: 0 }}>
                    {title}
                    <span className="tiny" style={{ display: 'block' }}>
                      {fmtTime(item.estMinutes)}
                    </span>
                  </span>
                  <CircleBtn label={`Start ${title}`} onClick={() => onStartWork(entry)}>
                    <Icon name="play" size={15} fill />
                  </CircleBtn>
                </div>
              );
            })}
            <Link to="/todo" className="tiny" style={{ fontWeight: 700 }}>
              See all tasks →
            </Link>
          </div>
        )
      )}

      <div className="stat-tiles" style={{ width: '100%', maxWidth: 460 }}>
        <StatTile icon="clock" label="Focused today" value={fmtTime(todayMins)} />
        <StatTile icon="award" label="Tasks done" value={`${overall.done}/${overall.total}`} alt />
      </div>

      <div style={{ width: '100%', maxWidth: 460 }}>
        <EncourageCard
          body={
            stats.streak > 0
              ? `${stats.streak}-day streak alive — ${stats.totalMins} min focused in total. Keep the garden growing 🌱`
              : 'Complete your first focus session today to start a streak.'
          }
        />
      </div>
    </div>
  );
}
