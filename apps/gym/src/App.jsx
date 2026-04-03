import { useState, useEffect, useRef, useCallback } from 'react';

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
const T = {
  bg: '#0A0A0F',
  text: '#E8E6E1',
  heading: '#F5F5F0',
  secondary: '#8B8B96',
  muted: '#6B6B76',
  darkMuted: '#4A4A52',
  cardBg: 'rgba(255,255,255,0.03)',
  cardBorder: '1px solid rgba(255,255,255,0.06)',
  cardRadius: 12,
  btnRadius: 8,
  font: "'DM Sans', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

const TYPE_COLORS = {
  push_run: '#EF4444',
  lower_a: '#8B5CF6',
  pull_run: '#3B82F6',
  lower_b: '#10B981',
  rest: '#4A4A52',
};

const TYPE_LABELS = {
  push_run: 'Push + Run',
  lower_a: 'Lower A: Quad Focus',
  pull_run: 'Pull + Run',
  lower_b: 'Lower B: Posterior Chain',
  rest: 'Rest Day',
};

const TRAINING_TYPES = ['push_run', 'lower_a', 'pull_run', 'lower_b'];

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
const cardStyle = {
  background: T.cardBg,
  border: T.cardBorder,
  borderRadius: T.cardRadius,
  padding: 16,
  marginBottom: 12,
};

const labelStyle = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  color: T.muted,
  fontFamily: T.font,
  marginBottom: 6,
};

const headingStyle = {
  fontSize: 28,
  fontWeight: 300,
  letterSpacing: '-0.5px',
  color: T.heading,
  fontFamily: T.font,
  margin: '0 0 16px 0',
};

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: T.btnRadius,
  color: T.text,
  padding: '10px 12px',
  fontFamily: T.mono,
  fontSize: 14,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const btnStyle = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: T.btnRadius,
  color: T.text,
  padding: '10px 16px',
  fontFamily: T.font,
  fontSize: 14,
  cursor: 'pointer',
  transition: 'background 0.2s',
};

const btnPrimary = {
  ...btnStyle,
  background: '#8B5CF6',
  border: '1px solid #8B5CF6',
  fontWeight: 500,
};

const typeBadge = (type) => ({
  display: 'inline-block',
  padding: '3px 10px',
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 500,
  fontFamily: T.font,
  color: '#fff',
  background: TYPE_COLORS[type] || T.darkMuted,
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
  (workouts || []).forEach(w => {
    const key = toDateStr(w.date);
    workoutMap[key] = w.type;
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

      cells.push(
        <rect
          key={key}
          x={col * step + labelW}
          y={row * step + 20}
          width={cellSize}
          height={cellSize}
          rx={2}
          fill={fill}
          stroke={isToday ? '#fff' : 'none'}
          strokeWidth={isToday ? 1.5 : 0}
        >
          <title>{`${key}${type ? ` — ${typeLabel(type)}` : ''}`}</title>
        </rect>
      );
    }
  }

  const svgWidth = weeks * step + labelW + 5;
  const svgHeight = 7 * step + 30;

  return (
    <div style={{ ...cardStyle, padding: 12 }}>
      <div style={labelStyle}>Training Heatmap</div>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <svg width={svgWidth} height={svgHeight} style={{ display: 'block' }}>
          {monthLabels.map((m, i) => (
            <text key={i} x={m.x} y={14} fill={T.muted} fontSize={10} fontFamily={T.font}>{m.label}</text>
          ))}
          {dayLabels.map((label, i) => (
            <text key={i} x={0} y={i * step + 20 + cellSize - 2} fill={T.muted} fontSize={10} fontFamily={T.font}>{label}</text>
          ))}
          {cells}
        </svg>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
            <span style={{ fontSize: 11, color: T.muted, fontFamily: T.font }}>{typeLabel(type)}</span>
          </div>
        ))}
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
  if (!display.length) return <div style={{ color: T.muted, fontSize: 14, fontFamily: T.font }}>No personal records yet</div>;

  return (
    <div>
      {display.map((pr, i) => (
        <div
          key={pr.id || i}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
            borderBottom: i < display.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            animation: glow && glow.includes(pr.id) ? 'prGlow 1.5s ease-out' : 'none',
          }}
        >
          <span style={{ fontSize: 18 }}>{'\u{1F3C6}'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ color: T.text, fontSize: 14, fontFamily: T.font }}>{pr.exercise}</div>
            <div style={{ fontFamily: T.mono, fontSize: 13, color: T.secondary }}>
              {pr.type === 'running' ? `${pr.distance}km in ${pr.duration}min` : `${pr.weight}kg x ${pr.reps}`}
            </div>
          </div>
          <div style={{ color: T.muted, fontSize: 12, fontFamily: T.font }}>{fmtShort(pr.date)}</div>
        </div>
      ))}
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

function WorkoutChecklist({ exercises, onLogRest, onStartTimer, onAutoLog, todayLogged }) {
  const [selectedType, setSelectedType] = useState(null);
  // setChecked tracks per-set: { [exId]: [bool, bool, bool] }
  const [setChecked, setSetChecked] = useState({});
  // weights tracks per-exercise weight: { [exId]: number|'' }
  const [weights, setWeights] = useState({});
  const [logged, setLogged] = useState(false);

  const typeExercises = (exercises || []).filter(e => e.type === selectedType).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  // Count exercises where all sets are done
  const exerciseDoneCount = typeExercises.filter(ex => {
    const numSets = ex.sets || 1;
    const checks = setChecked[ex.id];
    return checks && checks.length >= numSets && checks.every(Boolean);
  }).length;
  const allDone = typeExercises.length > 0 && exerciseDoneCount === typeExercises.length;

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
    setLogged(false);
  };

  const toggleSet = (exId, setIdx, ex) => {
    setSetChecked(prev => {
      const arr = [...(prev[exId] || [])];
      const wasChecked = arr[setIdx];
      arr[setIdx] = !wasChecked;
      const next = { ...prev, [exId]: arr };

      // If checking a set (not unchecking), trigger rest timer
      if (!wasChecked && ex.restSeconds) {
        onStartTimer(ex.restSeconds);
      }

      // Auto-log: when first set is checked anywhere, log the workout
      if (!wasChecked && !logged && !todayLogged) {
        setLogged(true);
        onAutoLog(selectedType, exercises, weights);
      }

      return next;
    });
  };

  const reset = () => {
    setSelectedType(null);
    setSetChecked({});
    setWeights({});
    setLogged(false);
  };

  if (!selectedType) {
    return (
      <div style={cardStyle}>
        <div style={labelStyle}>Today's Workout</div>
        {todayLogged ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={typeBadge(todayLogged.type)}>{typeLabel(todayLogged.type)}</span>
            <span style={{ color: T.secondary, fontSize: 13, fontFamily: T.font }}>Logged today</span>
          </div>
        ) : null}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 8 }}>
          {TRAINING_TYPES.map(t => (
            <button
              key={t}
              style={{
                ...btnStyle,
                padding: '14px 12px', fontSize: 13,
                background: TYPE_COLORS[t], border: `1px solid ${TYPE_COLORS[t]}`,
                color: '#fff', fontWeight: 500, textAlign: 'center', lineHeight: 1.3,
              }}
              onClick={() => selectType(t)}
            >
              {typeLabel(t)}
            </button>
          ))}
        </div>
        <button
          style={{ ...btnStyle, width: '100%', fontSize: 13, padding: '10px 14px', color: T.secondary }}
          onClick={onLogRest}
        >
          Log Rest Day
        </button>
      </div>
    );
  }

  // Exercise numbering: warmup = W, rest numbered starting from 1
  let exerciseNum = 0;

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={labelStyle}>Today's Workout</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={typeBadge(selectedType)}>{typeLabel(selectedType)}</span>
            <span style={{ color: T.muted, fontSize: 12, fontFamily: T.mono }}>{exerciseDoneCount}/{typeExercises.length}</span>
          </div>
        </div>
        <button style={{ ...btnStyle, padding: '6px 12px', fontSize: 12 }} onClick={reset}>Change</button>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginBottom: 14 }}>
        <div style={{
          height: '100%',
          width: typeExercises.length > 0 ? `${(exerciseDoneCount / typeExercises.length) * 100}%` : '0%',
          background: TYPE_COLORS[selectedType], borderRadius: 2, transition: 'width 0.3s ease',
        }} />
      </div>

      {typeExercises.map((ex, i) => {
        const isWarmup = ex.sortOrder === 0;
        if (!isWarmup) exerciseNum++;
        const numSets = ex.sets || 1;
        const checks = setChecked[ex.id] || new Array(numSets).fill(false);
        const allSetsChecked = checks.length >= numSets && checks.every(Boolean);
        const fmtRest = ex.restSeconds ? (ex.restSeconds >= 120 ? `${ex.restSeconds / 60}min` : `${ex.restSeconds}s`) : null;

        return (
          <div
            key={ex.id}
            style={{
              padding: '10px 0',
              borderBottom: i < typeExercises.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              opacity: allSetsChecked ? 0.45 : 1,
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
                  {ex.sets ? `${ex.sets}×${ex.reps}` : ex.reps}
                  {fmtRest ? ` · ${fmtRest} rest` : ''}
                </div>
              </div>
            </div>

            {/* Bottom row: weight input + per-set checkboxes */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 8, paddingLeft: 34 }}>
              {!isWarmup && (
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
              )}
              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: numSets }).map((_, si) => (
                  <div key={si} onClick={() => toggleSet(ex.id, si, ex)}>
                    <SmallCheck checked={!!checks[si]} color={TYPE_COLORS[selectedType]} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      {allDone && (
        <div style={{
          textAlign: 'center', padding: '16px 0 4px',
          color: TYPE_COLORS[selectedType], fontFamily: T.font, fontSize: 15, fontWeight: 500,
        }}>
          Workout complete!
        </div>
      )}
    </div>
  );
}

function DashboardTab({ workouts, records, exercises, timerState, setTimerState, onLogRest, onAutoLog, newPRs }) {
  const todayWorkout = (workouts || []).find(w => sameDay(w.date, new Date()));

  const handleStartTimer = (seconds) => {
    setTimerState({ seconds, total: seconds, running: true, collapsed: false });
  };

  return (
    <div>
      <Heatmap workouts={workouts} />

      <WorkoutChecklist
        exercises={exercises}
        onLogRest={onLogRest}
        onStartTimer={handleStartTimer}
        onAutoLog={onAutoLog}
        todayLogged={todayWorkout}
      />

      <RestTimer timerState={timerState} setTimerState={setTimerState} />

      <div style={cardStyle}>
        <div style={labelStyle}>Recent PRs</div>
        <PRList records={(records || []).slice(0, 5)} limit={5} glow={newPRs} />
      </div>
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
    minHeight: '100vh',
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
  const [newExercise, setNewExercise] = useState({});
  const [addingType, setAddingType] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const grouped = {};
  (exercises || []).forEach(ex => {
    if (!grouped[ex.type]) grouped[ex.type] = [];
    grouped[ex.type].push(ex);
  });

  const addExercise = async (type) => {
    const name = (newExercise[type] || '').trim();
    if (!name) return;
    await api('exercises', 'POST', { name, trainingType: type });
    setNewExercise(prev => ({ ...prev, [type]: '' }));
    setAddingType(null);
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
        {TRAINING_TYPES.map(type => (
          <div key={type} style={{ ...cardStyle }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={typeBadge(type)}>{typeLabel(type)}</span>
            </div>
            {(grouped[type] || []).map(ex => (
              <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <span style={{ color: T.text, fontSize: 14, fontFamily: T.font }}>{ex.name}</span>
                <button
                  style={{ ...btnStyle, padding: '4px 10px', fontSize: 12, color: '#EF4444' }}
                  onClick={() => deleteExercise(ex.id)}
                >&times;</button>
              </div>
            ))}
            {addingType === type ? (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder="Exercise name"
                  value={newExercise[type] || ''}
                  onChange={e => setNewExercise(prev => ({ ...prev, [type]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addExercise(type)}
                  autoFocus
                />
                <button style={{ ...btnPrimary, flexShrink: 0, fontSize: 13 }} onClick={() => addExercise(type)}>Add</button>
                <button style={{ ...btnStyle, flexShrink: 0, fontSize: 13 }} onClick={() => setAddingType(null)}>Cancel</button>
              </div>
            ) : (
              <button
                style={{ ...btnStyle, fontSize: 12, padding: '6px 12px', marginTop: 8, width: '100%' }}
                onClick={() => setAddingType(type)}
              >+ Add Exercise</button>
            )}
          </div>
        ))}
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

  const handleAutoLog = async (type, allExercises, weightsMap) => {
    const typeExes = (allExercises || []).filter(e => e.type === type).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const exerciseData = typeExes.map(ex => {
      const w = weightsMap && weightsMap[ex.id] ? parseFloat(weightsMap[ex.id]) || null : null;
      return {
        exerciseId: ex.id,
        name: ex.name,
        sets: Array.from({ length: ex.sets || 1 }, () => ({
          reps: ex.reps || null,
          weight: w,
        })),
      };
    });
    await api('workouts', 'POST', { date: today(), trainingType: type, exercises: exerciseData, notes: '' });
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
    maxWidth: 800,
    margin: '0 auto',
    padding: '0 16px 100px 16px',
    fontFamily: T.font,
    color: T.text,
    minHeight: '100vh',
    background: T.bg,
    boxSizing: 'border-box',
  };

  const tabBarStyle = {
    display: 'flex',
    gap: 0,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    marginBottom: 20,
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    position: 'sticky',
    top: 0,
    background: T.bg,
    zIndex: 100,
    paddingTop: 16,
  };

  const fabStyle = {
    position: 'fixed',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: '#8B5CF6',
    color: '#fff',
    fontSize: 28,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(139,92,246,0.4)',
    zIndex: 50,
    transition: 'transform 0.2s',
    fontWeight: 300,
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes prGlow {
          0% { box-shadow: 0 0 20px rgba(255,215,0,0.6); }
          100% { box-shadow: none; }
        }
        * { box-sizing: border-box; }
        body { margin: 0; background: ${T.bg}; }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none; margin: 0;
        }
        input[type="number"] { -moz-appearance: textfield; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>

      {/* Header */}
      <div style={{ paddingTop: 8 }}>
        <h1 style={headingStyle}>Gym Tracker</h1>
      </div>

      {/* Tab Bar */}
      <div style={tabBarStyle}>
        {TABS.map(tab => (
          <button
            key={tab}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #fff' : '2px solid transparent',
              color: activeTab === tab ? T.heading : T.muted,
              padding: '10px 16px',
              fontSize: 14,
              fontFamily: T.font,
              cursor: 'pointer',
              transition: 'color 0.2s, border-color 0.2s',
              whiteSpace: 'nowrap',
              minHeight: 44,
            }}
            onClick={() => switchTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: T.muted, fontFamily: T.font }}>
          Loading...
        </div>
      )}

      {/* Tab Content */}
      {!loading && (
        <div key={tabKey} style={{ animation: 'fadeUp 0.3s ease-out' }}>
          {activeTab === 'Dashboard' && (
            <DashboardTab
              workouts={workouts}
              records={records}
              exercises={exercises}
              timerState={timerState}
              setTimerState={setTimerState}
              onLogRest={handleLogRest}
              onAutoLog={handleAutoLog}
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

      {/* FAB */}
      <button style={fabStyle} onClick={() => setShowLogger(true)}>+</button>

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
