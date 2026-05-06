import { useState, useEffect, useRef, useCallback } from 'react';

// ── Clear stale localStorage from old versions ─────────────────────────────
const GYM_VERSION = 3;
try {
  if (Number(localStorage.getItem('gym_v')) !== GYM_VERSION) {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith('gym_checklist_')) localStorage.removeItem(k);
    }
    localStorage.setItem('gym_v', String(GYM_VERSION));
  }
} catch {}

// ── API Helper ──────────────────────────────────────────────────────────────
const API = '/api/app/gym';
async function api(resource, method = 'GET', body = null, id = null) {
  const params = new URLSearchParams({ resource });
  if (id) params.set('id', id);
  const url = `${API}?${params}`;
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  return res.json();
}

// ── Design Tokens ───────────────────────────────────────────────────────────
// A single source of truth. One accent (white). Data colors only in data viz.
const T = {
  // Surface — near-black, slightly warm to read premium
  bg:        '#0A0A0B',
  surface:   'rgba(255,255,255,0.025)',
  surfaceHi: 'rgba(255,255,255,0.045)',

  // Lines — used sparingly
  line:      'rgba(255,255,255,0.06)',
  lineHi:    'rgba(255,255,255,0.12)',

  // Text ramp
  text:      '#F2F2F0',       // primary
  heading:   '#FAFAF7',       // display / numbers
  secondary: '#A6A6AB',       // body secondary
  muted:     '#6F6F76',       // captions
  darkMuted: '#3B3B40',       // separators, inactive

  // Semantic accent — used for the single primary CTA, active states
  accent:    '#FAFAF7',       // near-white
  accentInk: '#0A0A0B',       // ink on accent

  // Radii
  r1: 6, r2: 10, r3: 14, rPill: 999,

  // Legacy aliases (kept for incremental refactor)
  cardBg:     'rgba(255,255,255,0.025)',
  cardBorder: '1px solid rgba(255,255,255,0.06)',
  cardRadius: 14,
  btnRadius:  10,

  // Type
  font:    "'Inter', 'DM Sans', -apple-system, sans-serif",
  mono:    "'JetBrains Mono', ui-monospace, monospace",
  display: "'Inter', -apple-system, sans-serif",
};

// Training types — desaturated, premium dataviz palette (only in charts/badges)
const TYPE_COLORS = {
  push_run: '#C97B5E', // warm amber
  lower_a:  '#9681C4', // muted violet
  pull_run: '#7593C2', // slate blue
  rest:     '#3B3B40',
};

const TYPE_LABELS = {
  push_run: 'Push + Run',
  lower_a: 'Lower A: Quad Focus',
  pull_run: 'Pull + Run',
  rest: 'Rest Day',
};

const TRAINING_TYPES = ['push_run', 'lower_a', 'pull_run'];

const ENERGY_EMOJIS = ['', '\u{1F634}', '\u{1F610}', '\u{1F642}', '\u{1F60A}', '\u{1F525}'];

const TABS = ['Dashboard', 'History', 'Analytics', 'Body', 'Settings'];

// ── Utility Functions ───────────────────────────────────────────────────────
function fmtDate(d) {
  const dt = new Date(d);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
}

function fmtShort(d) {
  const dt = new Date(d);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[dt.getMonth()]} ${dt.getDate()}`;
}

function toDateStr(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function sameDay(a, b) {
  return toDateStr(a) === toDateStr(b);
}

// Exercises without a load (cardio) skip the weight input.
function isCardio(ex) {
  const n = (ex?.name || '').toLowerCase();
  return n.includes('treadmill') || n.includes('run') || n.includes('bike') || n.includes('row erg') || n.includes('walk');
}

function groupByMonth(workouts) {
  const groups = {};
  workouts.forEach(w => {
    const dt = new Date(w.date);
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const key = `${months[dt.getMonth()]} ${dt.getFullYear()}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(w);
  });
  return groups;
}

// ── Shared Styles ───────────────────────────────────────────────────────────
// Quiet surfaces, confident type. One accent. Motion-safe defaults.
const cardStyle = {
  background: T.surface,
  border: `1px solid ${T.line}`,
  borderRadius: T.r3,
  padding: 20,
  marginBottom: 16,
  transition: 'background 240ms ease, border-color 240ms ease',
};

const labelStyle = {
  fontSize: 10.5,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  fontWeight: 500,
  color: T.muted,
  fontFamily: T.font,
  marginBottom: 10,
};

const headingStyle = {
  fontSize: 36,
  fontWeight: 300,
  letterSpacing: '-0.02em',
  lineHeight: 1.1,
  color: T.heading,
  fontFamily: T.display,
  margin: '0 0 16px 0',
};

const inputStyle = {
  background: 'transparent',
  border: `1px solid ${T.line}`,
  borderRadius: T.r2,
  color: T.text,
  padding: '12px 14px',
  fontFamily: T.mono,
  fontSize: 14,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  transition: 'border-color 200ms ease, background 200ms ease',
};

const btnStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: `1px solid ${T.line}`,
  borderRadius: T.r2,
  color: T.text,
  padding: '11px 16px',
  fontFamily: T.font,
  fontSize: 13.5,
  fontWeight: 500,
  letterSpacing: '-0.005em',
  cursor: 'pointer',
  transition: 'background 200ms ease, border-color 200ms ease, transform 120ms ease',
};

const btnPrimary = {
  ...btnStyle,
  background: T.accent,
  border: `1px solid ${T.accent}`,
  color: T.accentInk,
  fontWeight: 500,
};

const typeBadge = (type) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 10px',
  borderRadius: T.rPill,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.01em',
  fontFamily: T.font,
  color: T.heading,
  background: 'transparent',
  border: `1px solid ${TYPE_COLORS[type] || T.darkMuted}`,
});

function typeLabel(type) {
  return TYPE_LABELS[type] || type;
}

// ── Heatmap Component ───────────────────────────────────────────────────────
function Heatmap({ workouts }) {
  const cellSize = 13;
  const gap = 2;
  const step = cellSize + gap;
  const labelW = 30;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  // Fixed range: March 29 to December 31, 2026
  const rangeStart = new Date(2026, 2, 29); // March 29 (Sun)
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(2026, 11, 31); // December 31
  rangeEnd.setHours(0, 0, 0, 0);

  // Grid starts on the Sunday of the week containing rangeStart
  const gridStart = new Date(rangeStart);
  const sunOffset = rangeStart.getDay(); // 0=Sun, already Sunday
  gridStart.setDate(gridStart.getDate() - sunOffset);

  // Grid ends on the Saturday of the week containing rangeEnd
  const endDay = rangeEnd.getDay(); // 0=Sun
  const gridEnd = new Date(rangeEnd);
  if (endDay !== 6) gridEnd.setDate(gridEnd.getDate() + (6 - endDay));

  const weeks = Math.round((gridEnd - gridStart) / (1000 * 60 * 60 * 24) / 7);

  const workoutMap = {};
  const ranMap = {};
  (workouts || []).forEach(w => {
    const key = toDateStr(w.date);
    workoutMap[key] = w.type;
    // Folded-corner mark: did this session include any cardio?
    // exercises is a JSONB array of { name, sets, ... }; isCardio() matches by name.
    const exs = Array.isArray(w.exercises) ? w.exercises : [];
    if (exs.some(e => isCardio(e))) ranMap[key] = true;
  });

  const cells = [];
  const monthLabels = [];
  let lastMonth = -1;
  let lastLabelCol = -4;

  for (let col = 0; col < weeks; col++) {
    let colLabelPlaced = false;
    for (let row = 0; row < 7; row++) {
      const date = new Date(gridStart);
      date.setDate(date.getDate() + col * 7 + row);
      if (date < rangeStart || date > rangeEnd) continue;
      const key = toDateStr(date);
      const type = workoutMap[key];
      const isFuture = date > todayDate;
      const fill = type ? TYPE_COLORS[type] : isFuture ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)';
      const isToday = toDateStr(date) === toDateStr(todayDate);

      if (!colLabelPlaced) {
        colLabelPlaced = true;
        const m = date.getMonth();
        if (m !== lastMonth && col - lastLabelCol >= 3) {
          lastMonth = m;
          lastLabelCol = col;
          monthLabels.push({ label: months[m], x: col * step + labelW });
        }
      }

      const ran = !!ranMap[key];
      const cellX = col * step + labelW;
      const cellY = row * step + 20;
      const wedge = 5; // size of folded corner triangle in px

      cells.push(
        <g key={key}>
          <rect
            x={cellX}
            y={cellY}
            width={cellSize}
            height={cellSize}
            rx={2}
            fill={fill}
            stroke={isToday ? '#fff' : 'none'}
            strokeWidth={isToday ? 1.5 : 0}
          >
            <title>{`${key}${type ? ` — ${typeLabel(type)}` : ''}${ran ? ' · ran' : ''}`}</title>
          </rect>
          {ran && type && (
            // Top-right folded-corner wedge — marks days that included cardio.
            <polygon
              points={`${cellX + cellSize - wedge},${cellY} ${cellX + cellSize},${cellY} ${cellX + cellSize},${cellY + wedge}`}
              fill={T.heading}
              opacity={0.95}
              pointerEvents="none"
            />
          )}
        </g>
      );
    }
  }

  const svgWidth = weeks * step + labelW + 5;
  const svgHeight = 7 * step + 30;

  return (
    <div style={{ ...cardStyle, padding: 20 }}>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginLeft: -4 }}>
        <svg width={svgWidth} height={svgHeight} style={{ display: 'block' }}>
          {monthLabels.map((m, i) => (
            <text key={i} x={m.x} y={14}
              fill={T.muted}
              fontSize={10}
              fontFamily={T.font}
              style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}
            >{m.label.toUpperCase()}</text>
          ))}
          {dayLabels.map((label, i) => (
            <text key={i} x={0} y={i * step + 20 + cellSize - 3}
              fill={T.muted}
              fontSize={9.5}
              fontFamily={T.font}
              style={{ letterSpacing: '0.08em' }}
            >{label.slice(0,1)}</text>
          ))}
          {cells}
        </svg>
      </div>
      <div style={{
        display: 'flex', gap: 18, marginTop: 16, flexWrap: 'wrap',
        paddingTop: 16, borderTop: `1px solid ${T.line}`,
      }}>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
            <span style={{ fontSize: 11.5, color: T.secondary, fontFamily: T.font, letterSpacing: '-0.005em' }}>
              {typeLabel(type)}
            </span>
          </div>
        ))}
        {/* Folded-corner mark = ran that day */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width={10} height={10} viewBox="0 0 10 10" aria-hidden="true">
            <rect width={10} height={10} rx={2} fill={T.darkMuted} />
            <polygon points="6,0 10,0 10,4" fill={T.heading} />
          </svg>
          <span style={{ fontSize: 11.5, color: T.secondary, fontFamily: T.font, letterSpacing: '-0.005em' }}>
            Ran that day
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Rest Timer Component ────────────────────────────────────────────────────
function RestTimer({ timerState, setTimerState }) {
  const { seconds, total, running, collapsed } = timerState;
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setTimerState(prev => {
          const next = prev.seconds - 1;
          if (next <= 0) {
            try { navigator.vibrate([200, 100, 200]); } catch (e) { /* no vibration API */ }
            return { ...prev, seconds: 0, running: false };
          }
          return { ...prev, seconds: next };
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, seconds > 0]);

  const presets = [30, 60, 90, 120, 180];
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? (1 - seconds / total) * circumference : 0;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (collapsed) {
    return (
      <div
        style={{ ...cardStyle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        onClick={() => setTimerState(p => ({ ...p, collapsed: false }))}
      >
        <span style={{ ...labelStyle, margin: 0 }}>Rest Timer</span>
        {seconds > 0 && <span style={{ fontFamily: T.mono, color: T.text, fontSize: 14 }}>{mins}:{secs.toString().padStart(2, '0')}</span>}
        <span style={{ color: T.muted, fontSize: 18 }}>+</span>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ ...labelStyle, margin: 0 }}>Rest Timer</span>
        <span
          style={{ color: T.muted, fontSize: 18, cursor: 'pointer' }}
          onClick={() => setTimerState(p => ({ ...p, collapsed: true }))}
        >&minus;</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {presets.map(p => (
          <button
            key={p}
            style={{ ...btnStyle, padding: '8px 12px', fontSize: 13, fontFamily: T.mono, background: total === p ? 'rgba(139,92,246,0.2)' : btnStyle.background }}
            onClick={() => setTimerState(prev => ({ ...prev, seconds: p, total: p, running: false }))}
          >
            {p >= 60 ? `${p / 60}m` : `${p}s`}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <svg width={130} height={130} viewBox="0 0 130 130">
          <circle cx={65} cy={65} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} />
          <circle
            cx={65} cy={65} r={radius} fill="none"
            stroke="#8B5CF6" strokeWidth={6}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            transform="rotate(-90 65 65)"
            style={{ transition: 'stroke-dashoffset 0.3s' }}
          />
          <text x={65} y={70} textAnchor="middle" fill={T.heading} fontSize={28} fontFamily={T.mono}>
            {mins}:{secs.toString().padStart(2, '0')}
          </text>
        </svg>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={btnPrimary}
            onClick={() => {
              if (seconds === 0 && total > 0) {
                setTimerState(p => ({ ...p, seconds: p.total, running: true }));
              } else {
                setTimerState(p => ({ ...p, running: !p.running }));
              }
            }}
          >
            {seconds === 0 && total > 0 ? 'Restart' : running ? 'Pause' : 'Start'}
          </button>
          <button
            style={btnStyle}
            onClick={() => setTimerState(p => ({ ...p, seconds: p.total, running: false }))}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PR List Component ───────────────────────────────────────────────────────
function PRList({ records, limit, glow }) {
  const display = limit ? records.slice(0, limit) : records;
  if (!display.length) {
    return (
      <div style={{
        padding: '32px 0 12px', textAlign: 'center',
        color: T.muted, fontSize: 13.5, letterSpacing: '-0.005em',
      }}>
        Your records will appear here.
      </div>
    );
  }

  return (
    <div>
      {display.map((pr, i) => {
        const name = pr.exercise || pr.exerciseName || pr.exercise_name || '—';
        const metric = pr.type === 'running'
          ? `${pr.distance} km · ${pr.duration} min`
          : `${pr.weight} kg × ${pr.reps}`;
        return (
          <div
            key={pr.id || i}
            style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              gap: 16, padding: '14px 0',
              borderBottom: i < display.length - 1 ? `1px solid ${T.line}` : 'none',
              animation: glow && glow.includes(pr.id) ? 'prGlow 1.8s ease-out' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, minWidth: 0 }}>
              <span className="tnum" style={{
                fontFamily: T.display, fontSize: 22, fontWeight: 300,
                color: T.heading, letterSpacing: '-0.02em', lineHeight: 1,
                whiteSpace: 'nowrap',
              }}>
                {metric}
              </span>
              <span style={{
                color: T.secondary, fontSize: 13.5, letterSpacing: '-0.005em',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {name}
              </span>
            </div>
            <div className="tnum" style={{
              color: T.muted, fontSize: 12, fontFamily: T.mono,
              whiteSpace: 'nowrap', letterSpacing: '-0.01em',
            }}>
              {fmtShort(pr.date)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Dashboard Tab ───────────────────────────────────────────────────────────
function SmallCheck({ checked, color }) {
  return (
    <div style={{
      width: 24, height: 24, borderRadius: 5, flexShrink: 0,
      border: checked ? `2px solid ${color}` : '2px solid rgba(255,255,255,0.15)',
      background: checked ? color : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.15s', cursor: 'pointer',
      minWidth: 44, minHeight: 44, padding: 10,
    }}>
      {checked && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6L5 9L10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  );
}

function WorkoutChecklist({ exercises, workouts, onLogRest, onStartTimer, onLogWorkout, todayLogged }) {
  const storageKey = `gym_checklist_${today()}`;

  // Restore state from localStorage on mount (survives iOS Safari tab suspension)
  const saved = useRef(null);
  if (saved.current === null) {
    try {
      const raw = localStorage.getItem(storageKey);
      saved.current = raw ? JSON.parse(raw) : {};
    } catch { saved.current = {}; }
  }

  const [selectedType, setSelectedType] = useState(saved.current.type || null);
  const [setChecked, setSetChecked] = useState(saved.current.checks || {});
  const [weights, setWeights] = useState(saved.current.weights || {});
  const [submitted, setSubmitted] = useState(saved.current.submitted || false);
  // Date the session is being logged for. Defaults to today; can be back-
  // dated when the user forgot to log on the actual day.
  const [sessionDate, setSessionDate] = useState(saved.current.sessionDate || today());
  const dateInputRef = useRef(null);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    const data = { type: selectedType, checks: setChecked, weights, submitted, sessionDate };
    try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch {}
  }, [selectedType, setChecked, weights, submitted, sessionDate, storageKey]);

  // Clean up old days' entries
  useEffect(() => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('gym_checklist_') && k !== storageKey) localStorage.removeItem(k);
      }
    } catch {}
  }, [storageKey]);

  const typeExercises = (exercises || []).filter(e => e.type === selectedType).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  // Heaviest weight per exercise from the most recent prior session,
  // relative to the date being logged. When backdating, we skip the
  // session date itself plus anything more recent, so "last" reflects
  // what came BEFORE the date being entered.
  const prevByExercise = {};
  for (const w of (workouts || [])) {
    if (toDateStr(w.date) >= sessionDate) continue;
    const exs = Array.isArray(w.exercises) ? w.exercises : [];
    for (const e of exs) {
      const sets = Array.isArray(e.sets) ? e.sets : [];
      let best = 0;
      for (const s of sets) {
        const wt = parseFloat(s?.weight) || 0;
        if (wt > best) best = wt;
      }
      if (best <= 0) continue;
      if (e.exerciseId && !(e.exerciseId in prevByExercise)) prevByExercise[e.exerciseId] = best;
      if (e.name && !(e.name in prevByExercise)) prevByExercise[e.name] = best;
    }
  }

  // An exercise is "active" (intended for today) when the user has
  // engaged with it — typed a weight or ticked any set. Cardio is a
  // single yes/no, so any check counts. Blank kg + no checks = skip.
  const isActive = (ex) => {
    const checks = setChecked[ex.id] || [];
    const anyChecked = checks.some(Boolean);
    if (isCardio(ex)) return anyChecked;
    const w = (weights[ex.id] || '').toString().trim();
    return w !== '' || anyChecked;
  };

  const isExerciseDone = (ex) => {
    const checks = setChecked[ex.id];
    if (isCardio(ex)) return !!(checks && checks[0]);
    const numSets = ex.sets || 1;
    return checks && checks.length >= numSets && checks.every(Boolean);
  };

  const activeExercises = typeExercises.filter(isActive);
  const exerciseDoneCount = activeExercises.filter(isExerciseDone).length;

  const selectType = (t) => {
    setSelectedType(t);
    const init = {};
    const initWeights = {};
    (exercises || []).filter(e => e.type === t).forEach(ex => {
      init[ex.id] = new Array(ex.sets || 1).fill(false);
      initWeights[ex.id] = '';
    });
    setSetChecked(init);
    setWeights(initWeights);
    setSubmitted(false);
  };

  const toggleSet = (exId, setIdx, ex) => {
    setSetChecked(prev => {
      const arr = [...(prev[exId] || [])];
      const wasChecked = arr[setIdx];
      arr[setIdx] = !wasChecked;
      const next = { ...prev, [exId]: arr };

      if (!wasChecked && ex.restSeconds) {
        onStartTimer(ex.restSeconds);
      }

      return next;
    });
  };

  // Manual submission — user controls when the session ends.
  // (Auto-submit was removed because it fired the moment the
  // first batch of active exercises was complete, even though the
  // user might still be planning to do more.)
  const handleEndSession = () => {
    if (submitted || todayLogged) return;
    if (activeExercises.length === 0) return;
    setSubmitted(true);
    onLogWorkout(selectedType, activeExercises, weights, sessionDate);
  };

  const reset = () => {
    setSelectedType(null);
    setSetChecked({});
    setWeights({});
    setSubmitted(false);
    setSessionDate(today());
  };

  const openDatePicker = () => {
    const el = dateInputRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') {
      try { el.showPicker(); return; } catch {}
    }
    el.click();
  };

  if (!selectedType) {
    return (
      <div style={cardStyle}>
        {todayLogged ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px',
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${T.line}`,
            borderRadius: T.r2,
            marginBottom: 20,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7.5L6 10.5L11 4.5" stroke={T.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 13.5, color: T.text, letterSpacing: '-0.005em' }}>
              Today's session is logged.
            </span>
            <span style={{
              marginLeft: 'auto', fontSize: 12, color: T.secondary,
              letterSpacing: '-0.005em',
            }}>
              {typeLabel(todayLogged.type)}
            </span>
          </div>
        ) : (
          <p style={{
            fontSize: 15.5, lineHeight: 1.55, color: T.secondary,
            margin: '0 0 20px 0', maxWidth: 480, letterSpacing: '-0.005em',
          }}>
            Choose today's session. Log each set as you go — the rest is automatic.
          </p>
        )}

        {/* Training type cards — typographic, minimal chrome */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 8,
          marginBottom: 8,
        }}>
          {TRAINING_TYPES.map(t => (
            <button
              key={t}
              onClick={() => selectType(t)}
              style={{
                textAlign: 'left',
                padding: '16px 16px',
                background: 'transparent',
                border: `1px solid ${T.line}`,
                borderRadius: T.r2,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                minHeight: 56,
                fontFamily: T.font,
              }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: 2,
                background: TYPE_COLORS[t], flexShrink: 0,
              }} />
              <span style={{
                fontSize: 14, fontWeight: 500, color: T.heading,
                letterSpacing: '-0.005em', lineHeight: 1.3,
              }}>
                {typeLabel(t)}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={onLogRest}
          style={{
            ...btnStyle, width: '100%', marginTop: 8,
            padding: '14px 16px',
            background: 'transparent',
            border: `1px dashed ${T.line}`,
            color: T.muted, fontSize: 13,
            fontWeight: 400,
          }}
        >
          Rest day
        </button>
      </div>
    );
  }

  // Exercise numbering: warmup = W, rest numbered starting from 1
  let exerciseNum = 0;

  return (
    <div style={cardStyle}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            width: 8, height: 8, borderRadius: 2,
            background: TYPE_COLORS[selectedType],
          }} />
          <span style={{
            fontSize: 15, fontWeight: 500, color: T.heading,
            letterSpacing: '-0.01em',
          }}>
            {typeLabel(selectedType)}
          </span>
          <span className="tnum" style={{
            color: T.muted, fontSize: 12.5, fontFamily: T.mono,
            letterSpacing: '-0.02em',
          }}>
            {exerciseDoneCount}/{activeExercises.length || 0}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, position: 'relative' }}>
          <button
            type="button"
            onClick={openDatePicker}
            title="Log this session for a different date"
            aria-label={sessionDate === today() ? 'Logging for today' : `Logging for ${fmtShort(sessionDate)}`}
            style={{
              background: 'transparent',
              border: `1px solid ${sessionDate === today() ? 'transparent' : T.lineHi}`,
              padding: '5px 10px', borderRadius: T.r1,
              color: sessionDate === today() ? T.muted : T.text,
              fontSize: 12, fontFamily: T.mono, cursor: 'pointer',
              letterSpacing: '-0.005em',
            }}
          >
            {sessionDate === today() ? 'Today' : fmtShort(sessionDate)}
          </button>
          <input
            ref={dateInputRef}
            type="date"
            value={sessionDate}
            max={today()}
            onChange={e => setSessionDate(e.target.value || today())}
            aria-hidden="true"
            tabIndex={-1}
            style={{
              position: 'absolute', left: 0, bottom: -2,
              opacity: 0, pointerEvents: 'none',
              width: 1, height: 1, padding: 0, margin: 0, border: 0,
            }}
          />
          <button
            style={{
              background: 'transparent', border: 'none', padding: '6px 4px',
              color: T.muted, fontSize: 13, cursor: 'pointer',
              fontFamily: T.font, letterSpacing: '-0.005em',
            }}
            onClick={reset}
          >
            Change
          </button>
        </div>
      </div>

      {/* Progress bar — hairline */}
      <div style={{
        height: 2, background: T.line, borderRadius: 2,
        marginBottom: 12, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: activeExercises.length > 0 ? `${(exerciseDoneCount / activeExercises.length) * 100}%` : '0%',
          background: T.accent, borderRadius: 2,
          transition: 'width 420ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        }} />
      </div>

      {activeExercises.length === 0 && !todayLogged && (
        <div style={{
          fontSize: 12.5, color: T.muted, marginBottom: 16,
          letterSpacing: '-0.005em', lineHeight: 1.5,
        }}>
          Enter a weight or tick a set for each exercise you're doing.
          Skip the rest.
        </div>
      )}

      {typeExercises.map((ex, i) => {
        const isWarmup = ex.sortOrder === 0;
        if (!isWarmup) exerciseNum++;
        const cardio = isCardio(ex);
        const numSets = cardio ? 1 : (ex.sets || 1);
        const checks = setChecked[ex.id] || new Array(numSets).fill(false);
        const allSetsChecked = checks.length >= numSets && checks.every(Boolean);
        const fmtRest = ex.restSeconds ? (ex.restSeconds >= 120 ? `${ex.restSeconds / 60}min` : `${ex.restSeconds}s`) : null;
        const active = isActive(ex);
        // Skipped = user hasn't engaged and hasn't completed → visually muted, lets them know it won't be logged.
        const skipped = !active && !allSetsChecked;

        return (
          <div
            key={ex.id}
            style={{
              padding: '10px 0',
              borderBottom: i < typeExercises.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              opacity: allSetsChecked ? 0.45 : skipped ? 0.55 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {/* Top row: checkbox + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div onClick={() => {
                setSetChecked(prev => {
                  const arr = prev[ex.id] || new Array(numSets).fill(false);
                  const allDone = arr.every(Boolean);
                  return { ...prev, [ex.id]: new Array(numSets).fill(!allDone) };
                });
              }}>
                <SmallCheck checked={allSetsChecked} color={TYPE_COLORS[selectedType]} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  color: allSetsChecked ? T.muted : T.text,
                  fontSize: 14, fontFamily: T.font,
                  fontWeight: isWarmup ? 400 : 500,
                  fontStyle: isWarmup ? 'italic' : 'normal',
                  textDecoration: allSetsChecked ? 'line-through' : 'none',
                }}>
                  {isWarmup ? `W. ${ex.name}` : `${exerciseNum}. ${ex.name}`}
                </div>
                <div style={{ fontSize: 12, color: T.muted, fontFamily: T.mono, marginTop: 2 }}>
                  {cardio ? (ex.reps || 'Cardio') : (ex.sets ? `${ex.sets}\u00D7${ex.reps || ''}` : (ex.reps || ''))}
                  {fmtRest && !cardio ? ` \u00B7 ${fmtRest} rest` : ''}
                </div>
              </div>
            </div>

            {/* Bottom row: cardio gets a single yes/no pill; everything else gets weight + per-set checkboxes */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 8, paddingLeft: 34 }}>
              {cardio && !isWarmup ? (
                /* Single checkbox — same affordance as other exercises.
                   Click = ran today; leave unchecked + end session = not logged. */
                <div
                  onClick={() => {
                    setSetChecked(prev => {
                      const cur = prev[ex.id] && prev[ex.id][0];
                      return { ...prev, [ex.id]: [!cur] };
                    });
                  }}
                  role="checkbox"
                  aria-checked={allSetsChecked}
                  aria-label={`Mark ${ex.name} as done`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      setSetChecked(prev => {
                        const cur = prev[ex.id] && prev[ex.id][0];
                        return { ...prev, [ex.id]: [!cur] };
                      });
                    }
                  }}
                  style={{ cursor: 'pointer', display: 'inline-flex' }}
                >
                  <SmallCheck checked={allSetsChecked} color={TYPE_COLORS[selectedType]} />
                </div>
              ) : (
                <>
                  {!isWarmup && (() => {
                    const prevW = prevByExercise[ex.id] ?? prevByExercise[ex.name];
                    return (
                      <>
                        {prevW != null && (
                          <span
                            title="Last session"
                            style={{
                              fontSize: 12, fontFamily: T.mono, color: T.muted,
                              letterSpacing: '-0.005em', whiteSpace: 'nowrap',
                            }}
                          >
                            last {prevW}kg
                          </span>
                        )}
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="kg"
                          value={weights[ex.id] || ''}
                          onChange={e => setWeights(prev => ({ ...prev, [ex.id]: e.target.value }))}
                          style={{
                            width: 60, padding: '6px 8px', fontSize: 13,
                            fontFamily: T.mono, color: T.text,
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 6, outline: 'none', textAlign: 'center',
                            minHeight: 36,
                          }}
                        />
                      </>
                    );
                  })()}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {Array.from({ length: numSets }).map((_, si) => (
                      <div key={si} onClick={() => toggleSet(ex.id, si, ex)}>
                        <SmallCheck checked={!!checks[si]} color={TYPE_COLORS[selectedType]} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}

      {/* End-session controls — user explicitly decides when the session is over.
          Auto-submit fired too eagerly when the first batch was complete. */}
      {!submitted && activeExercises.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '14px 16px',
            border: `1px solid ${T.line}`,
            borderRadius: T.r2,
            background: 'rgba(255,255,255,0.02)',
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, color: T.text, letterSpacing: '-0.005em' }}>
                {exerciseDoneCount}/{activeExercises.length} logged
                {exerciseDoneCount < activeExercises.length && (
                  <span style={{ color: T.muted }}>
                    {' · '}{activeExercises.length - exerciseDoneCount} unfinished
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 2, letterSpacing: '-0.005em' }}>
                {exerciseDoneCount === activeExercises.length
                  ? 'Looks good. End the session when you’re ready.'
                  : 'Finish what you started, or end now to save what’s done.'}
              </div>
            </div>
            <button
              type="button"
              onClick={handleEndSession}
              disabled={exerciseDoneCount === 0}
              style={{
                padding: '10px 18px',
                fontSize: 13, fontWeight: 500,
                fontFamily: T.font,
                letterSpacing: '-0.005em',
                borderRadius: T.r2,
                cursor: exerciseDoneCount === 0 ? 'not-allowed' : 'pointer',
                background: exerciseDoneCount === 0 ? 'transparent' : T.accent,
                color: exerciseDoneCount === 0 ? T.muted : T.accentInk,
                border: `1px solid ${exerciseDoneCount === 0 ? T.line : T.accent}`,
                transition: 'background 200ms ease, color 200ms ease, border-color 200ms ease, opacity 200ms ease',
                opacity: exerciseDoneCount === 0 ? 0.7 : 1,
                flexShrink: 0,
              }}
            >
              End session
            </button>
          </div>
        </div>
      )}

      {submitted && (
        <div style={{
          marginTop: 20, padding: '24px 20px',
          textAlign: 'center',
          background: 'rgba(255,255,255,0.03)',
          border: `1px solid ${T.line}`,
          borderRadius: T.r2,
          animation: 'scaleIn 380ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: '50%',
            background: T.accent, marginBottom: 14,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7.5L6 10.5L11 4.5" stroke={T.accentInk} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray="16" style={{ animation: 'drawCheck 420ms ease-out 120ms forwards' }}
              />
            </svg>
          </div>
          <div style={{
            color: T.heading, fontFamily: T.display,
            fontSize: 20, fontWeight: 400, letterSpacing: '-0.015em',
            marginBottom: 6,
          }}>
            Session complete.
          </div>
          <div style={{
            color: T.secondary, fontSize: 13, marginBottom: 18,
            letterSpacing: '-0.005em',
          }}>
            Your work is saved. See you tomorrow.
          </div>
          <button
            onClick={reset}
            style={{
              ...btnStyle,
              padding: '10px 20px', fontSize: 13,
              background: 'transparent',
              border: `1px solid ${T.lineHi}`,
              color: T.text,
            }}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

// Stat tile — hoisted out of DashboardTab so React preserves component
// identity across re-renders (rerender-no-inline-components).
function Stat({ value, label, sub }) {
  return (
    <div style={{
      padding: '20px 4px',
      borderTop: `1px solid ${T.line}`,
    }}>
      <div className="tnum" style={{
        fontSize: 44, fontWeight: 300, letterSpacing: '-0.03em',
        color: T.heading, fontFamily: T.display, lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
        color: T.muted, fontWeight: 500, marginTop: 10,
      }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: 12.5, color: T.secondary, marginTop: 6, lineHeight: 1.45 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function DashboardTab({ workouts, records, exercises, timerState, setTimerState, onLogRest, onLogWorkout, newPRs }) {
  const todayWorkout = (workouts || []).find(w => sameDay(w.date, new Date()));

  // Weekly snapshot — this week's count + streak
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(now.getDate() - now.getDay()); // Sun
  const thisWeek = (workouts || []).filter(w => {
    const d = new Date(w.date);
    return d >= weekStart && d <= now && w.type !== 'rest';
  }).length;

  // Streak: consecutive days with a logged session (any type, incl. rest)
  let streak = 0;
  const logged = new Set((workouts || []).map(w => toDateStr(w.date)));
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (logged.has(toDateStr(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const handleStartTimer = (seconds) => {
    setTimerState({ seconds, total: seconds, running: true, collapsed: false });
  };

  return (
    <div>
      {/* Snapshot row — three quiet numbers, no boxes. Typography does the work. */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 32,
        marginBottom: 48,
      }}>
        <Stat
          value={thisWeek}
          label="This week"
          sub={thisWeek === 0 ? 'Begin the week.' : thisWeek >= 4 ? 'Strong cadence.' : 'Building rhythm.'}
        />
        <Stat
          value={streak}
          label="Streak"
          sub={streak === 0 ? 'Start today.' : streak === 1 ? 'Day one.' : `${streak} days in a row.`}
        />
        <Stat
          value={(records || []).length}
          label="Records"
          sub={(records || []).length === 0 ? 'None yet.' : 'Keep pushing.'}
        />
      </section>

      {/* Today — primary action region */}
      <section style={{ marginBottom: 40 }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <h2 style={{
            fontSize: 22, fontWeight: 400, letterSpacing: '-0.015em',
            color: T.heading, margin: 0, fontFamily: T.display,
          }}>
            Today
          </h2>
          {todayWorkout && (
            <span style={{
              fontSize: 12, color: T.secondary, fontFamily: T.font,
              letterSpacing: '-0.005em',
            }}>
              Logged · {typeLabel(todayWorkout.type)}
            </span>
          )}
        </div>
        <WorkoutChecklist
          exercises={exercises}
          workouts={workouts}
          onLogRest={onLogRest}
          onStartTimer={handleStartTimer}
          onLogWorkout={onLogWorkout}
          todayLogged={todayWorkout}
        />
      </section>

      <section style={{ marginBottom: 40 }}>
        <RestTimer timerState={timerState} setTimerState={setTimerState} />
      </section>

      {/* Year at a glance */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{
          fontSize: 22, fontWeight: 400, letterSpacing: '-0.015em',
          color: T.heading, margin: '0 0 16px 0', fontFamily: T.display,
        }}>
          The year so far
        </h2>
        <Heatmap workouts={workouts} />
      </section>

      {/* Records */}
      <section style={{ marginBottom: 16 }}>
        <h2 style={{
          fontSize: 22, fontWeight: 400, letterSpacing: '-0.015em',
          color: T.heading, margin: '0 0 16px 0', fontFamily: T.display,
        }}>
          Records
        </h2>
        <div style={cardStyle}>
          <PRList records={(records || []).slice(0, 5)} limit={5} glow={newPRs} />
        </div>
      </section>
    </div>
  );
}

// ── Workout Logger Modal ────────────────────────────────────────────────────
function WorkoutLogger({ exercises: exerciseLib, templates, onClose, onSave }) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState('');
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [exerciseSets, setExerciseSets] = useState({});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const typeExercises = (exerciseLib || []).filter(e => e.type === type);

  const addExercise = (ex) => {
    if (selectedExercises.find(s => s.id === ex.id)) return;
    setSelectedExercises(prev => [...prev, ex]);
    setExerciseSets(prev => ({
      ...prev,
      [ex.id]: [{ weight: '', reps: '', distance: '', duration: '' }],
    }));
  };

  const removeExercise = (id) => {
    setSelectedExercises(prev => prev.filter(e => e.id !== id));
    setExerciseSets(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const updateSet = (exId, setIdx, field, value) => {
    setExerciseSets(prev => {
      const sets = [...prev[exId]];
      sets[setIdx] = { ...sets[setIdx], [field]: value };
      return { ...prev, [exId]: sets };
    });
  };

  const addSet = (exId) => {
    setExerciseSets(prev => {
      const sets = prev[exId];
      const last = sets[sets.length - 1] || {};
      return { ...prev, [exId]: [...sets, { ...last }] };
    });
  };

  const removeSet = (exId, setIdx) => {
    setExerciseSets(prev => {
      const sets = prev[exId].filter((_, i) => i !== setIdx);
      return { ...prev, [exId]: sets.length ? sets : [{ weight: '', reps: '', distance: '', duration: '' }] };
    });
  };

  const loadTemplate = (tpl) => {
    setType(tpl.type);
    const exes = tpl.exercises || [];
    const matched = exes.map(e => (exerciseLib || []).find(ex => ex.id === e.exerciseId || ex.name === e.name)).filter(Boolean);
    setSelectedExercises(matched);
    const sets = {};
    matched.forEach(ex => {
      const tplEx = exes.find(e => e.exerciseId === ex.id || e.name === ex.name);
      sets[ex.id] = (tplEx && tplEx.sets) ? tplEx.sets.map(s => ({ ...s })) : [{ weight: '', reps: '', distance: '', duration: '' }];
    });
    setExerciseSets(sets);
    setStep(3);
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) return;
    const tpl = {
      name: templateName.trim(),
      trainingType: type,
      exercises: selectedExercises.map(ex => ({
        exerciseId: ex.id,
        name: ex.name,
        sets: exerciseSets[ex.id] || [],
      })),
    };
    await api('templates', 'POST', tpl);
    setTemplateName('');
  };

  const handleSave = async () => {
    setSaving(true);
    const workout = {
      date: today(),
      trainingType: type,
      notes,
      exercises: selectedExercises.map(ex => ({
        exerciseId: ex.id,
        name: ex.name,
        sets: (exerciseSets[ex.id] || []).map(s => ({
          weight: s.weight ? parseFloat(s.weight) : null,
          reps: s.reps ? parseInt(s.reps) : null,
          distance: s.distance ? parseFloat(s.distance) : null,
          duration: s.duration ? parseFloat(s.duration) : null,
        })),
      })),
    };
    const result = await api('workouts', 'POST', workout);
    setSaving(false);
    onSave(result);
  };

  const overlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.85)', zIndex: 1000,
    display: 'flex', flexDirection: 'column',
    overflow: 'auto',
  };

  const modalStyle = {
    background: T.bg, flex: 1, maxWidth: 600, width: '100%',
    margin: '0 auto', padding: 20, boxSizing: 'border-box',
    minHeight: '100dvh',
  };

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ ...headingStyle, fontSize: 22, margin: 0 }}>Log Workout</h2>
          <button style={{ ...btnStyle, padding: '6px 12px', fontSize: 13 }} onClick={onClose}>Close</button>
        </div>

        {/* Template Loader */}
        {templates && templates.length > 0 && step === 1 && (
          <div style={{ marginBottom: 16 }}>
            <div style={labelStyle}>Load Template</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {templates.map(tpl => (
                <button
                  key={tpl.id}
                  style={{ ...btnStyle, fontSize: 13, padding: '8px 12px' }}
                  onClick={() => loadTemplate(tpl)}
                >
                  <span style={typeBadge(tpl.type)}>{typeLabel(tpl.type)}</span>{' '}
                  {tpl.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Type Selection */}
        {step === 1 && (
          <div>
            <div style={labelStyle}>Training Type</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {TRAINING_TYPES.map(t => (
                <button
                  key={t}
                  style={{
                    ...btnStyle,
                    padding: '16px 12px',
                    fontSize: 14,
                    background: TYPE_COLORS[t],
                    border: `1px solid ${TYPE_COLORS[t]}`,
                    color: '#fff',
                    fontWeight: 500,
                    minHeight: 60,
                    lineHeight: 1.3,
                    textAlign: 'center',
                  }}
                  onClick={() => { setType(t); setStep(2); }}
                >
                  {typeLabel(t)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Exercise Selection */}
        {step === 2 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={labelStyle}>Select Exercises ({type})</div>
              <button style={{ ...btnStyle, fontSize: 12, padding: '6px 10px' }} onClick={() => setStep(1)}>Back</button>
            </div>

            {selectedExercises.length > 0 && (
              <div style={{ ...cardStyle, marginBottom: 12 }}>
                <div style={{ ...labelStyle, marginBottom: 8 }}>Selected</div>
                {selectedExercises.map(ex => (
                  <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                    <span style={{ color: T.text, fontSize: 14, fontFamily: T.font }}>{ex.name}</span>
                    <button
                      style={{ ...btnStyle, padding: '4px 10px', fontSize: 12, color: '#EF4444' }}
                      onClick={() => removeExercise(ex.id)}
                    >&times;</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {typeExercises.map(ex => {
                const selected = selectedExercises.find(s => s.id === ex.id);
                return (
                  <button
                    key={ex.id}
                    style={{
                      ...btnStyle,
                      textAlign: 'left',
                      padding: '12px 14px',
                      opacity: selected ? 0.4 : 1,
                    }}
                    onClick={() => addExercise(ex)}
                    disabled={!!selected}
                  >
                    {ex.name}
                  </button>
                );
              })}
              {typeExercises.length === 0 && (
                <div style={{ color: T.muted, fontSize: 14, fontFamily: T.font, padding: 16, textAlign: 'center' }}>
                  No exercises found for {type}. Add some in Settings.
                </div>
              )}
            </div>

            {selectedExercises.length > 0 && (
              <button
                style={{ ...btnPrimary, width: '100%', marginTop: 16 }}
                onClick={() => setStep(3)}
              >
                Next: Log Sets
              </button>
            )}
          </div>
        )}

        {/* Step 3: Set Logging */}
        {step === 3 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={labelStyle}>Log Sets</div>
              <button style={{ ...btnStyle, fontSize: 12, padding: '6px 10px' }} onClick={() => setStep(2)}>Back</button>
            </div>

            {selectedExercises.map(ex => {
              const sets = exerciseSets[ex.id] || [];
              const isRunning = type === 'running';
              return (
                <div key={ex.id} style={{ ...cardStyle }}>
                  <div style={{ color: T.heading, fontSize: 15, fontWeight: 500, fontFamily: T.font, marginBottom: 10 }}>
                    {ex.name}
                  </div>
                  {sets.map((s, si) => (
                    <div key={si} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ color: T.muted, fontSize: 12, fontFamily: T.mono, minWidth: 20 }}>#{si + 1}</span>
                      {isRunning ? (
                        <>
                          <input
                            type="number" inputMode="decimal" placeholder="km"
                            style={{ ...inputStyle, width: '40%' }} value={s.distance}
                            onChange={e => updateSet(ex.id, si, 'distance', e.target.value)}
                          />
                          <input
                            type="number" inputMode="decimal" placeholder="min"
                            style={{ ...inputStyle, width: '40%' }} value={s.duration}
                            onChange={e => updateSet(ex.id, si, 'duration', e.target.value)}
                          />
                        </>
                      ) : (
                        <>
                          <input
                            type="number" inputMode="decimal" placeholder="kg"
                            style={{ ...inputStyle, width: '40%' }} value={s.weight}
                            onChange={e => updateSet(ex.id, si, 'weight', e.target.value)}
                          />
                          <input
                            type="number" inputMode="decimal" placeholder="reps"
                            style={{ ...inputStyle, width: '40%' }} value={s.reps}
                            onChange={e => updateSet(ex.id, si, 'reps', e.target.value)}
                          />
                        </>
                      )}
                      <button
                        style={{ ...btnStyle, padding: '6px 10px', fontSize: 14, color: '#EF4444', flexShrink: 0 }}
                        onClick={() => removeSet(ex.id, si)}
                      >&times;</button>
                    </div>
                  ))}
                  <button
                    style={{ ...btnStyle, fontSize: 12, padding: '6px 12px', width: '100%' }}
                    onClick={() => addSet(ex.id)}
                  >+ Add Set</button>
                </div>
              );
            })}

            <div style={{ marginBottom: 12 }}>
              <div style={labelStyle}>Notes</div>
              <textarea
                style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="How did it feel?"
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                placeholder="Template name"
              />
              <button style={{ ...btnStyle, flexShrink: 0, fontSize: 13 }} onClick={saveTemplate}>
                Save Template
              </button>
            </div>

            <button
              style={{ ...btnPrimary, width: '100%', opacity: saving ? 0.6 : 1 }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Workout'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── History Tab ─────────────────────────────────────────────────────────────
function HistoryTab({ workouts, onRefresh }) {
  const [expanded, setExpanded] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const sorted = [...(workouts || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  const grouped = groupByMonth(sorted);

  const handleDelete = async (id) => {
    setDeleting(id);
    await api('workouts', 'DELETE', null, id);
    setConfirmDelete(null);
    setExpanded(null);
    setDeleting(null);
    onRefresh();
  };

  if (!sorted.length) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>{'\u{1F3CB}\uFE0F'}</div>
        <div style={{ color: T.secondary, fontSize: 16, fontFamily: T.font }}>No workouts logged yet</div>
        <div style={{ color: T.muted, fontSize: 14, fontFamily: T.font, marginTop: 4 }}>Tap the + button to log your first workout</div>
      </div>
    );
  }

  return (
    <div>
      {Object.entries(grouped).map(([month, wks]) => (
        <div key={month}>
          <div style={{ ...labelStyle, marginTop: 16, marginBottom: 8 }}>{month}</div>
          {wks.map(w => {
            const isExpanded = expanded === w.id;
            return (
              <div key={w.id} style={{ ...cardStyle, cursor: 'pointer' }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                  onClick={() => setExpanded(isExpanded ? null : w.id)}
                >
                  <span style={typeBadge(w.type)}>{typeLabel(w.type)}</span>
                  <span style={{ color: T.text, fontSize: 14, fontFamily: T.font, flex: 1 }}>
                    {w.exercises ? `${w.exercises.length} exercise${w.exercises.length !== 1 ? 's' : ''}` : ''}
                  </span>
                  <span style={{ color: T.muted, fontSize: 12, fontFamily: T.font }}>{fmtShort(w.date)}</span>
                  <span style={{ color: T.muted, fontSize: 14, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    {'\u25BE'}
                  </span>
                </div>
                {isExpanded && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    {(w.exercises || []).map((ex, ei) => (
                      <div key={ei} style={{ marginBottom: 10 }}>
                        <div style={{ color: T.heading, fontSize: 14, fontWeight: 500, fontFamily: T.font, marginBottom: 4 }}>
                          {ex.name}
                        </div>
                        {(ex.sets || []).map((s, si) => (
                          <div key={si} style={{ color: T.secondary, fontSize: 13, fontFamily: T.mono, paddingLeft: 12, lineHeight: 1.6 }}>
                            {w.type === 'running'
                              ? `${s.distance || 0}km in ${s.duration || 0}min`
                              : `${s.weight || 0}kg \u00D7 ${s.reps || 0}`
                            }
                          </div>
                        ))}
                      </div>
                    ))}
                    {w.notes && (
                      <div style={{ color: T.muted, fontSize: 13, fontFamily: T.font, fontStyle: 'italic', marginTop: 8 }}>
                        {w.notes}
                      </div>
                    )}
                    <div style={{ marginTop: 12 }}>
                      {confirmDelete === w.id ? (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ color: '#EF4444', fontSize: 13, fontFamily: T.font }}>Delete this workout?</span>
                          <button
                            style={{ ...btnStyle, fontSize: 12, padding: '6px 12px', color: '#EF4444', border: '1px solid #EF4444' }}
                            onClick={() => handleDelete(w.id)}
                            disabled={deleting === w.id}
                          >{deleting === w.id ? '...' : 'Yes'}</button>
                          <button
                            style={{ ...btnStyle, fontSize: 12, padding: '6px 12px' }}
                            onClick={() => setConfirmDelete(null)}
                          >No</button>
                        </div>
                      ) : (
                        <button
                          style={{ ...btnStyle, fontSize: 12, padding: '6px 12px', color: '#EF4444' }}
                          onClick={(e) => { e.stopPropagation(); setConfirmDelete(w.id); }}
                        >Delete</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Analytics Tab ───────────────────────────────────────────────────────────
function AnalyticsTab({ workouts, records }) {
  const all = workouts || [];
  const totalWorkouts = all.length;
  const totalPRs = (records || []).length;

  // Current streak
  let streak = 0;
  if (all.length) {
    const sorted = [...all].sort((a, b) => new Date(b.date) - new Date(a.date));
    const todayStr = today();
    let checkDate = new Date(todayStr);
    for (let i = 0; i < 365; i++) {
      const key = toDateStr(checkDate);
      if (sorted.some(w => toDateStr(w.date) === key)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i === 0) {
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      } else {
        break;
      }
    }
  }

  // This month
  const now = new Date();
  const thisMonth = all.filter(w => {
    const d = new Date(w.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // Training split
  const typeCounts = {};
  all.forEach(w => {
    typeCounts[w.type] = (typeCounts[w.type] || 0) + 1;
  });
  const maxCount = Math.max(...Object.values(typeCounts), 1);

  // Weekly volume (last 8 weeks)
  const weeklyVolume = [];
  for (let w = 7; w >= 0; w--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (w + 1) * 7);
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() - w * 7);
    const weekLabel = fmtShort(weekStart);
    let volume = 0;
    all.forEach(wk => {
      const d = new Date(wk.date);
      if (d >= weekStart && d < weekEnd) {
        (wk.exercises || []).forEach(ex => {
          (ex.sets || []).forEach(s => {
            if (s.weight && s.reps) volume += s.weight * s.reps;
            if (s.distance) volume += s.distance * 100;
          });
        });
      }
    });
    weeklyVolume.push({ label: weekLabel, volume });
  }
  const maxVolume = Math.max(...weeklyVolume.map(w => w.volume), 1);

  const summaryCards = [
    { label: 'Total Workouts', value: totalWorkouts },
    { label: 'Current Streak', value: `${streak}d` },
    { label: 'This Month', value: thisMonth },
    { label: 'Total PRs', value: totalPRs },
  ];

  const chartWidth = 340;
  const chartHeight = 160;
  const barWidth = 30;
  const chartPadding = 30;

  return (
    <div>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
        {summaryCards.map((c, i) => (
          <div key={i} style={cardStyle}>
            <div style={labelStyle}>{c.label}</div>
            <div style={{ fontSize: 28, fontWeight: 300, fontFamily: T.mono, color: T.heading }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Training Split */}
      <div style={cardStyle}>
        <div style={labelStyle}>Training Split</div>
        {Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ color: T.text, fontSize: 13, fontFamily: T.font, minWidth: 80 }}>{typeLabel(type)}</span>
            <div style={{ flex: 1, height: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                width: `${(count / maxCount) * 100}%`,
                height: '100%',
                background: TYPE_COLORS[type] || T.darkMuted,
                borderRadius: 4,
                transition: 'width 0.5s ease',
              }} />
            </div>
            <span style={{ fontFamily: T.mono, color: T.secondary, fontSize: 13, minWidth: 20, textAlign: 'right' }}>{count}</span>
          </div>
        ))}
        {Object.keys(typeCounts).length === 0 && (
          <div style={{ color: T.muted, fontSize: 14, fontFamily: T.font }}>No data yet</div>
        )}
      </div>

      {/* Weekly Volume Chart */}
      <div style={cardStyle}>
        <div style={labelStyle}>Weekly Volume</div>
        <div style={{ overflowX: 'auto' }}>
          <svg width={Math.max(chartWidth, weeklyVolume.length * (barWidth + 12) + chartPadding * 2)} height={chartHeight + 40} style={{ display: 'block' }}>
            {weeklyVolume.map((w, i) => {
              const x = chartPadding + i * (barWidth + 12);
              const barHeight = maxVolume > 0 ? (w.volume / maxVolume) * chartHeight : 0;
              const y = chartHeight - barHeight + 10;
              return (
                <g key={i}>
                  <defs>
                    <linearGradient id={`volGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                  </defs>
                  <rect
                    x={x} y={y} width={barWidth} height={barHeight}
                    rx={4} fill={`url(#volGrad${i})`}
                  />
                  <text x={x + barWidth / 2} y={chartHeight + 28} textAnchor="middle" fill={T.muted} fontSize={9} fontFamily={T.font}>
                    {w.label}
                  </text>
                  {w.volume > 0 && (
                    <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" fill={T.secondary} fontSize={9} fontFamily={T.mono}>
                      {w.volume >= 1000 ? `${(w.volume / 1000).toFixed(1)}k` : w.volume}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* PR Showcase */}
      <div style={cardStyle}>
        <div style={labelStyle}>PR Showcase</div>
        <PRList records={(records || []).slice(0, 10)} />
      </div>
    </div>
  );
}

// ── Body Tab ────────────────────────────────────────────────────────────────
function BodyTab({ metrics, onRefresh }) {
  const [date, setDate] = useState(today());
  const [weight, setWeight] = useState('');
  const [energy, setEnergy] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!weight) return;
    setSaving(true);
    await api('metrics', 'POST', {
      date,
      weight: parseFloat(weight),
      energy,
      notes,
    });
    setWeight('');
    setEnergy(0);
    setNotes('');
    setSaving(false);
    onRefresh();
  };

  const sorted = [...(metrics || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  const chartData = sorted.slice(0, 30).reverse();

  // Weight trend chart
  const chartWidth = 340;
  const chartHeight = 140;
  const padding = { top: 10, right: 10, bottom: 30, left: 40 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  let pathD = '';
  let dots = [];
  let yLabels = [];
  if (chartData.length > 1) {
    const weights = chartData.map(d => d.weight);
    const minW = Math.min(...weights) - 1;
    const maxW = Math.max(...weights) + 1;
    const range = maxW - minW || 1;

    yLabels = [minW, minW + range / 2, maxW].map(v => ({
      value: v.toFixed(1),
      y: padding.top + plotHeight - ((v - minW) / range) * plotHeight,
    }));

    chartData.forEach((d, i) => {
      const x = padding.left + (i / (chartData.length - 1)) * plotWidth;
      const y = padding.top + plotHeight - ((d.weight - minW) / range) * plotHeight;
      if (i === 0) pathD += `M${x},${y}`;
      else pathD += ` L${x},${y}`;
      dots.push({ x, y, weight: d.weight, date: d.date });
    });
  }

  return (
    <div>
      {/* Log Form */}
      <div style={cardStyle}>
        <div style={labelStyle}>Log Body Metrics</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <input
              type="date" style={inputStyle} value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <input
              type="number" inputMode="decimal" style={inputStyle}
              placeholder="Weight (kg)" value={weight}
              onChange={e => setWeight(e.target.value)}
            />
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ ...labelStyle, marginBottom: 8 }}>Energy Level</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 3, 4, 5].map(level => (
              <button
                key={level}
                style={{
                  ...btnStyle,
                  fontSize: 22,
                  padding: '8px 12px',
                  minWidth: 44,
                  minHeight: 44,
                  background: energy === level ? 'rgba(139,92,246,0.2)' : btnStyle.background,
                  border: energy === level ? '1px solid #8B5CF6' : btnStyle.border,
                }}
                onClick={() => setEnergy(level)}
              >
                {ENERGY_EMOJIS[level]}
              </button>
            ))}
          </div>
        </div>
        <textarea
          style={{ ...inputStyle, minHeight: 50, resize: 'vertical', marginBottom: 10 }}
          placeholder="Notes (optional)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
        <button
          style={{ ...btnPrimary, width: '100%', opacity: saving || !weight ? 0.6 : 1 }}
          onClick={handleSave}
          disabled={saving || !weight}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Weight Trend Chart */}
      {chartData.length > 1 && (
        <div style={cardStyle}>
          <div style={labelStyle}>Weight Trend</div>
          <div style={{ overflowX: 'auto' }}>
            <svg width={chartWidth} height={chartHeight} style={{ display: 'block', width: '100%' }} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
              {yLabels.map((yl, i) => (
                <g key={i}>
                  <line x1={padding.left} y1={yl.y} x2={chartWidth - padding.right} y2={yl.y} stroke="rgba(255,255,255,0.04)" />
                  <text x={padding.left - 6} y={yl.y + 4} textAnchor="end" fill={T.muted} fontSize={9} fontFamily={T.mono}>{yl.value}</text>
                </g>
              ))}
              <path d={pathD} fill="none" stroke="#8B5CF6" strokeWidth={2} />
              {dots.map((d, i) => (
                <circle key={i} cx={d.x} cy={d.y} r={3} fill="#8B5CF6">
                  <title>{`${d.weight}kg - ${fmtShort(d.date)}`}</title>
                </circle>
              ))}
              {chartData.length > 0 && chartData.filter((_, i) => i % Math.ceil(chartData.length / 6) === 0 || i === chartData.length - 1).map((d, i, arr) => {
                const idx = chartData.indexOf(d);
                const x = padding.left + (idx / (chartData.length - 1)) * plotWidth;
                return (
                  <text key={i} x={x} y={chartHeight - 5} textAnchor="middle" fill={T.muted} fontSize={8} fontFamily={T.font}>
                    {fmtShort(d.date)}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* History List */}
      <div style={cardStyle}>
        <div style={labelStyle}>History</div>
        {sorted.length === 0 && (
          <div style={{ color: T.muted, fontSize: 14, fontFamily: T.font }}>No entries yet</div>
        )}
        {sorted.slice(0, 20).map((m, i) => (
          <div
            key={m.id || i}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
              borderBottom: i < Math.min(sorted.length, 20) - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}
          >
            <span style={{ fontFamily: T.mono, fontSize: 15, color: T.heading, minWidth: 55 }}>{m.weight}kg</span>
            {m.energy > 0 && <span style={{ fontSize: 16 }}>{ENERGY_EMOJIS[m.energy]}</span>}
            <span style={{ color: T.muted, fontSize: 12, fontFamily: T.font, flex: 1 }}>{m.notes || ''}</span>
            <span style={{ color: T.muted, fontSize: 12, fontFamily: T.font }}>{fmtShort(m.date)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Settings Tab ────────────────────────────────────────────────────────────
function SettingsTab({ exercises, templates, onRefresh, workouts, records, metrics }) {
  // `newExercise[type]` = { name, sets, reps, restSeconds }
  const [newExercise, setNewExercise] = useState({});
  const [addingType, setAddingType] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const grouped = {};
  (exercises || []).forEach(ex => {
    if (!grouped[ex.type]) grouped[ex.type] = [];
    grouped[ex.type].push(ex);
  });

  const addExercise = async (type) => {
    const draft = newExercise[type] || {};
    const name = (draft.name || '').trim();
    if (!name) return;
    await api('exercises', 'POST', {
      name,
      trainingType: type,
      sets: draft.sets,
      reps: draft.reps,
      restSeconds: draft.restSeconds,
    });
    setNewExercise(prev => ({ ...prev, [type]: {} }));
    setAddingType(null);
    onRefresh();
  };

  const startEdit = (ex) => {
    setEditingId(ex.id);
    setEditDraft({
      name: ex.name || '',
      sets: ex.sets ?? '',
      reps: ex.reps ?? '',
      restSeconds: ex.restSeconds ?? '',
    });
  };

  const saveEdit = async (id) => {
    await api('exercises', 'PUT', {
      name: editDraft.name,
      sets: editDraft.sets,
      reps: editDraft.reps,
      restSeconds: editDraft.restSeconds,
    }, id);
    setEditingId(null);
    setEditDraft({});
    onRefresh();
  };

  const deleteExercise = async (id) => {
    await api('exercises', 'DELETE', null, id);
    onRefresh();
  };

  const deleteTemplate = async (id) => {
    await api('templates', 'DELETE', null, id);
    onRefresh();
  };

  const exportData = () => {
    const data = { workouts, exercises, templates, records, metrics, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gym-tracker-export-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      await api('import', 'POST', data);
      onRefresh();
    } catch (err) {
      alert('Invalid JSON file');
    }
  };

  const clearAll = async () => {
    setClearing(true);
    await api('clear', 'DELETE');
    setConfirmClear(false);
    setClearing(false);
    onRefresh();
  };

  return (
    <div>
      {/* Exercise Management */}
      <div style={{ marginBottom: 20 }}>
        <div style={labelStyle}>Exercise Library</div>
        {TRAINING_TYPES.map(type => {
          const draft = newExercise[type] || {};
          const setDraft = (patch) => setNewExercise(prev => ({ ...prev, [type]: { ...(prev[type] || {}), ...patch } }));
          const smallInput = {
            ...inputStyle,
            width: 60, padding: '8px 10px', fontSize: 13, textAlign: 'center',
            fontFamily: T.mono,
          };
          return (
          <div key={type} style={{ ...cardStyle }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={typeBadge(type)}>{typeLabel(type)}</span>
            </div>
            {(grouped[type] || []).map(ex => {
              if (editingId === ex.id) {
                return (
                  <div key={ex.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <input
                      style={{ ...inputStyle, width: '100%', marginBottom: 8 }}
                      value={editDraft.name}
                      onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))}
                      placeholder="Exercise name"
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input style={smallInput} type="number" inputMode="numeric" placeholder="sets" value={editDraft.sets}
                        onChange={e => setEditDraft(d => ({ ...d, sets: e.target.value }))} />
                      <span style={{ color: T.muted, fontSize: 13 }}>&times;</span>
                      <input style={{ ...smallInput, width: 80 }} placeholder="reps" value={editDraft.reps}
                        onChange={e => setEditDraft(d => ({ ...d, reps: e.target.value }))} />
                      <input style={{ ...smallInput, width: 70 }} type="number" inputMode="numeric" placeholder="rest s" value={editDraft.restSeconds}
                        onChange={e => setEditDraft(d => ({ ...d, restSeconds: e.target.value }))} />
                      <div style={{ flex: 1 }} />
                      <button style={{ ...btnPrimary, fontSize: 13 }} onClick={() => saveEdit(ex.id)}>Save</button>
                      <button style={{ ...btnStyle, fontSize: 13 }} onClick={() => { setEditingId(null); setEditDraft({}); }}>Cancel</button>
                    </div>
                  </div>
                );
              }
              const metaParts = [];
              if (ex.sets) metaParts.push(`${ex.sets}\u00D7${ex.reps || '-'}`);
              else if (ex.reps) metaParts.push(ex.reps);
              if (ex.restSeconds) metaParts.push(`${ex.restSeconds}s rest`);
              return (
                <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', gap: 8 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: T.text, fontSize: 14, fontFamily: T.font }}>{ex.name}</div>
                    {metaParts.length > 0 && (
                      <div style={{ color: T.muted, fontSize: 12, fontFamily: T.mono, marginTop: 2 }}>
                        {metaParts.join(' \u00B7 ')}
                      </div>
                    )}
                  </div>
                  <button style={{ ...btnStyle, padding: '4px 10px', fontSize: 12 }} onClick={() => startEdit(ex)}>Edit</button>
                  <button
                    style={{ ...btnStyle, padding: '4px 10px', fontSize: 12, color: '#EF4444' }}
                    onClick={() => deleteExercise(ex.id)}
                  >&times;</button>
                </div>
              );
            })}
            {addingType === type ? (
              <div style={{ marginTop: 10 }}>
                <input
                  style={{ ...inputStyle, width: '100%', marginBottom: 8 }}
                  placeholder="Exercise name"
                  value={draft.name || ''}
                  onChange={e => setDraft({ name: e.target.value })}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input style={smallInput} type="number" inputMode="numeric" placeholder="sets" value={draft.sets || ''}
                    onChange={e => setDraft({ sets: e.target.value })} />
                  <span style={{ color: T.muted, fontSize: 13 }}>&times;</span>
                  <input style={{ ...smallInput, width: 80 }} placeholder="reps" value={draft.reps || ''}
                    onChange={e => setDraft({ reps: e.target.value })} />
                  <input style={{ ...smallInput, width: 70 }} type="number" inputMode="numeric" placeholder="rest s" value={draft.restSeconds || ''}
                    onChange={e => setDraft({ restSeconds: e.target.value })} />
                  <div style={{ flex: 1 }} />
                  <button style={{ ...btnPrimary, fontSize: 13 }} onClick={() => addExercise(type)}>Add</button>
                  <button style={{ ...btnStyle, fontSize: 13 }} onClick={() => setAddingType(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <button
                style={{ ...btnStyle, fontSize: 12, padding: '6px 12px', marginTop: 8, width: '100%' }}
                onClick={() => setAddingType(type)}
              >+ Add Exercise</button>
            )}
          </div>
          );
        })}
      </div>

      {/* Template Management */}
      <div style={{ marginBottom: 20 }}>
        <div style={labelStyle}>Templates</div>
        {(!templates || templates.length === 0) ? (
          <div style={{ ...cardStyle, color: T.muted, fontSize: 14, fontFamily: T.font }}>No templates saved</div>
        ) : (
          templates.map(tpl => (
            <div key={tpl.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={typeBadge(tpl.type)}>{typeLabel(tpl.type)}</span>
                <span style={{ color: T.text, fontSize: 14, fontFamily: T.font, marginLeft: 8 }}>{tpl.name}</span>
                <span style={{ color: T.muted, fontSize: 12, fontFamily: T.font, marginLeft: 8 }}>
                  {(tpl.exercises || []).length} exercise{(tpl.exercises || []).length !== 1 ? 's' : ''}
                </span>
              </div>
              <button
                style={{ ...btnStyle, padding: '4px 10px', fontSize: 12, color: '#EF4444' }}
                onClick={() => deleteTemplate(tpl.id)}
              >&times;</button>
            </div>
          ))
        )}
      </div>

      {/* Data Management */}
      <div>
        <div style={labelStyle}>Data Management</div>
        <div style={cardStyle}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button style={{ ...btnStyle, fontSize: 13 }} onClick={exportData}>
              Export Data
            </button>
            <label style={{ ...btnStyle, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
              Import Data
              <input type="file" accept=".json" style={{ display: 'none' }} onChange={importData} />
            </label>
            {confirmClear ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: '#EF4444', fontSize: 13, fontFamily: T.font }}>Are you sure?</span>
                <button
                  style={{ ...btnStyle, fontSize: 12, padding: '6px 12px', color: '#EF4444', border: '1px solid #EF4444' }}
                  onClick={clearAll}
                  disabled={clearing}
                >{clearing ? '...' : 'Yes, Clear All'}</button>
                <button
                  style={{ ...btnStyle, fontSize: 12, padding: '6px 12px' }}
                  onClick={() => setConfirmClear(false)}
                >Cancel</button>
              </div>
            ) : (
              <button
                style={{ ...btnStyle, fontSize: 13, color: '#EF4444' }}
                onClick={() => setConfirmClear(true)}
              >
                Clear All Data
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PR Celebration Overlay ──────────────────────────────────────────────────
function PRCelebration({ prs, onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 3000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.7)', zIndex: 2000,
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        animation: 'fadeUp 0.3s ease-out',
      }}
      onClick={onDone}
    >
      <div style={{ fontSize: 64, marginBottom: 16 }}>{'\u{1F3C6}'}</div>
      <div style={{ color: '#FFD700', fontSize: 24, fontWeight: 300, fontFamily: T.font, marginBottom: 12, letterSpacing: '-0.5px' }}>
        New Personal Record{prs.length > 1 ? 's' : ''}!
      </div>
      {prs.map((pr, i) => (
        <div key={i} style={{ color: T.text, fontSize: 16, fontFamily: T.font, marginBottom: 4 }}>
          {pr.exercise}: {pr.type === 'running' ? `${pr.distance}km in ${pr.duration}min` : `${pr.weight}kg \u00D7 ${pr.reps}`}
        </div>
      ))}
    </div>
  );
}

// ── Main App Component ──────────────────────────────────────────────────────
export default function GymTracker() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [workouts, setWorkouts] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [records, setRecords] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogger, setShowLogger] = useState(false);
  const [newPRs, setNewPRs] = useState([]);
  const [celebratePRs, setCelebratePRs] = useState(null);
  const [timerState, setTimerState] = useState({
    seconds: 0,
    total: 0,
    running: false,
    collapsed: true,
  });
  const [tabKey, setTabKey] = useState(0);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [w, e, t, r, m] = await Promise.all([
        api('workouts'),
        api('exercises'),
        api('templates'),
        api('records'),
        api('metrics'),
      ]);
      const norm = arr => (Array.isArray(arr) ? arr : []).map(x => {
        if (x.trainingType !== undefined) { x.type = x.trainingType; delete x.trainingType; }
        return x;
      });
      setWorkouts(norm(w));
      setExercises(norm(e));
      setTemplates(norm(t));
      setRecords(Array.isArray(r) ? r : []);
      setMetrics(Array.isArray(m) ? m : []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleLogRest = async () => {
    await api('workouts', 'POST', { date: today(), trainingType: 'rest', exercises: [], notes: 'Rest day' });
    fetchAll();
  };

  const handleLogWorkout = async (type, activeExes, weightsMap, date) => {
    // activeExes is the subset of exercises the user engaged with —
    // weight entered or (for cardio) sets checked. Everything else is skipped.
    const ordered = [...(activeExes || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const exerciseData = ordered.map(ex => {
      const raw = weightsMap && weightsMap[ex.id];
      const w = raw != null && raw !== '' ? parseFloat(raw) || null : null;
      return {
        exerciseId: ex.id,
        name: ex.name,
        sets: Array.from({ length: ex.sets || 1 }, () => ({ reps: ex.reps || null, weight: w })),
      };
    });
    const logDate = date || today();
    const result = await api('workouts', 'POST', { date: logDate, trainingType: type, exercises: exerciseData, notes: '' });
    if (result?.newPRs?.length > 0) {
      setCelebratePRs(result.newPRs);
      setNewPRs(result.newPRs.map(pr => pr.id));
      setTimeout(() => setNewPRs([]), 5000);
    }
    fetchAll();
  };

  const handleWorkoutSaved = (result) => {
    setShowLogger(false);
    if (result && result.newPRs && result.newPRs.length > 0) {
      setCelebratePRs(result.newPRs);
      setNewPRs(result.newPRs.map(pr => pr.id));
      setTimeout(() => setNewPRs([]), 5000);
    }
    fetchAll();
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setTabKey(k => k + 1);
  };

  const containerStyle = {
    maxWidth: 920,
    margin: '0 auto',
    padding: '0 24px 120px 24px',
    fontFamily: T.font,
    color: T.text,
    minHeight: '100dvh',
    background: T.bg,
    boxSizing: 'border-box',
  };

  const tabBarStyle = {
    display: 'flex',
    gap: 4,
    marginBottom: 40,
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    position: 'sticky',
    top: 0,
    background: T.bg,
    zIndex: 100,
    padding: '12px 0',
    borderBottom: `1px solid ${T.line}`,
  };

  // Intentional header: short, sharp, dated. No tagline clutter.
  const now = new Date();
  const dayWords = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const monthWords = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const todayLabel = `${dayWords[now.getDay()]}, ${monthWords[now.getMonth()]} ${now.getDate()}`;

  return (
    <div style={containerStyle}>
      <style>{`
        /* Entrance — page & stagger */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes drawCheck {
          from { stroke-dashoffset: 16; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes breathe {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes prGlow {
          0%   { box-shadow: 0 0 24px rgba(250,250,247,0.25); }
          100% { box-shadow: none; }
        }

        /* Global */
        * { box-sizing: border-box; }
        html { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility; }
        body { margin: 0; background: ${T.bg}; }

        /* Staggered entry utility */
        .stagger > * {
          opacity: 0;
          animation: fadeUp 520ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .stagger > *:nth-child(1) { animation-delay:  40ms; }
        .stagger > *:nth-child(2) { animation-delay: 120ms; }
        .stagger > *:nth-child(3) { animation-delay: 200ms; }
        .stagger > *:nth-child(4) { animation-delay: 280ms; }
        .stagger > *:nth-child(5) { animation-delay: 360ms; }
        .stagger > *:nth-child(6) { animation-delay: 440ms; }

        /* Hover/press motion */
        button { transition: background 220ms ease, border-color 220ms ease, transform 120ms ease, color 220ms ease; }
        button:not(:disabled):hover { background: rgba(255,255,255,0.07); }
        button:not(:disabled):active { transform: scale(0.98); }
        button:focus-visible { outline: 1px solid ${T.lineHi}; outline-offset: 2px; }

        input, textarea, select { transition: border-color 200ms ease, background 200ms ease; }
        input:focus, textarea:focus, select:focus { border-color: ${T.lineHi} !important; }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }

        /* Numeric tabular rendering */
        .tnum { font-variant-numeric: tabular-nums; }

        /* Inputs */
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.line}; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: ${T.lineHi}; }

        /* Tab indicator */
        .tab-btn { position: relative; }
        .tab-btn::after {
          content: '';
          position: absolute;
          left: 10px; right: 10px;
          bottom: -1px;
          height: 1px;
          background: ${T.accent};
          transform: scaleX(0);
          transform-origin: center;
          transition: transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .tab-btn[data-active="true"]::after { transform: scaleX(1); }

        /* Eyebrow pulse on active day indicator */
        .pulse-dot { animation: breathe 2.4s ease-in-out infinite; }
      `}</style>

      {/* Header — confident, typographic, no decoration */}
      <header style={{ paddingTop: 44, paddingBottom: 24, animation: 'fadeIn 520ms ease-out' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
          color: T.muted, fontWeight: 500, marginBottom: 14,
        }}>
          <span className="pulse-dot" style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: T.accent }} />
          {todayLabel}
        </div>
        <h1 style={{
          fontSize: 44, fontWeight: 300, letterSpacing: '-0.03em',
          lineHeight: 1.05, color: T.heading, fontFamily: T.display,
          margin: 0, maxWidth: 560,
        }}>
          Train with intention.
        </h1>
      </header>

      {/* Tab Bar — minimal pill nav with animated indicator */}
      <nav style={tabBarStyle} aria-label="Sections">
        {TABS.map(tab => (
          <button
            key={tab}
            className="tab-btn"
            data-active={activeTab === tab}
            style={{
              background: 'transparent',
              border: 'none',
              color: activeTab === tab ? T.heading : T.muted,
              padding: '12px 10px',
              fontSize: 13.5,
              fontWeight: activeTab === tab ? 500 : 400,
              fontFamily: T.font,
              letterSpacing: '-0.005em',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              minHeight: 44,
            }}
            onClick={() => switchTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* Loading State */}
      {loading && (
        <div style={{
          textAlign: 'center', padding: '80px 20px', color: T.muted,
          fontFamily: T.font, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase',
          animation: 'breathe 2s ease-in-out infinite',
        }}>
          Loading
        </div>
      )}

      {/* Tab Content */}
      {!loading && (
        <div key={tabKey} className="stagger" style={{ animation: 'fadeIn 240ms ease-out' }}>
          {activeTab === 'Dashboard' && (
            <DashboardTab
              workouts={workouts}
              records={records}
              exercises={exercises}
              timerState={timerState}
              setTimerState={setTimerState}
              onLogRest={handleLogRest}
              onLogWorkout={handleLogWorkout}
              newPRs={newPRs}
            />
          )}
          {activeTab === 'History' && (
            <HistoryTab workouts={workouts} onRefresh={fetchAll} />
          )}
          {activeTab === 'Analytics' && (
            <AnalyticsTab workouts={workouts} records={records} />
          )}
          {activeTab === 'Body' && (
            <BodyTab metrics={metrics} onRefresh={fetchAll} />
          )}
          {activeTab === 'Settings' && (
            <SettingsTab
              exercises={exercises}
              templates={templates}
              workouts={workouts}
              records={records}
              metrics={metrics}
              onRefresh={fetchAll}
            />
          )}
        </div>
      )}

      {/* Floating Log button — minimal pill, high contrast */}
      <button
        onClick={() => setShowLogger(true)}
        aria-label="Log workout"
        style={{
          position: 'fixed',
          bottom: 28, right: 28,
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '13px 20px',
          borderRadius: T.rPill,
          background: T.accent, color: T.accentInk,
          border: `1px solid ${T.accent}`,
          fontSize: 13.5, fontWeight: 500, letterSpacing: '-0.005em',
          fontFamily: T.font, cursor: 'pointer',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.3)',
          zIndex: 50,
          animation: 'scaleIn 420ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
        Log workout
      </button>

      {/* Workout Logger Modal */}
      {showLogger && (
        <WorkoutLogger
          exercises={exercises}
          templates={templates}
          onClose={() => setShowLogger(false)}
          onSave={handleWorkoutSaved}
        />
      )}

      {/* PR Celebration */}
      {celebratePRs && (
        <PRCelebration prs={celebratePRs} onDone={() => setCelebratePRs(null)} />
      )}
    </div>
  );
}
