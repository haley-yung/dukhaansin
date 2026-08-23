import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
//  Habits — an Apple-style daily habit tracker.
//  Single-file SPA. Data: Supabase via /api/app/habits. Dates pinned to HKT.
// ═══════════════════════════════════════════════════════════════════════════

// ── API ─────────────────────────────────────────────────────────────────────
const API = '/api/app/habits';
async function api(resource, method = 'GET', body = null, id = null) {
  const params = new URLSearchParams({ resource });
  if (id) params.set('id', id);
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}?${params}`, opts);
  return res.json();
}

// ── Dates (all math pinned to Hong Kong time, UTC+8) ───────────────────────
const HK_OFFSET = 8 * 3600 * 1000;

function dstr(dt) {
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function hkTodayStr() {
  return dstr(new Date(Date.now() + HK_OFFSET));
}
function parseDate(s) {
  return new Date(`${s}T00:00:00Z`);
}
function weekdayOf(s) {
  return parseDate(s).getUTCDay(); // 0=Sun … 6=Sat
}
function addDays(s, n) {
  const d = parseDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return dstr(d);
}
function hkDateOfTimestamp(iso) {
  return dstr(new Date(new Date(iso).getTime() + HK_OFFSET));
}
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAYS_MIN = ['S','M','T','W','T','F','S'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function scheduleSummary(schedule) {
  const s = [...(schedule || [])].sort();
  if (s.length === 7) return 'Every day';
  if (s.length === 0) return 'Every day';
  if (s.join() === '1,2,3,4,5') return 'Weekdays';
  if (s.join() === '0,6') return 'Weekends';
  return s.map(d => DAYS_SHORT[d]).join(' · ');
}

// ── Habit palette (iOS system colors; dark variants live in CSS) ───────────
const HABIT_COLORS = ['red', 'orange', 'yellow', 'green', 'mint', 'teal', 'blue', 'indigo', 'purple', 'pink'];

// ── Icons — SF-Symbols-flavoured stroke glyphs ─────────────────────────────
const GLYPHS = {
  drop:     <path d="M12 3.2c3.3 4 5.8 7 5.8 9.8a5.8 5.8 0 0 1-11.6 0c0-2.8 2.5-5.8 5.8-9.8z" />,
  bolt:     <path d="M13 2.5 4.6 13.4h5.8L11 21.5l8.4-10.9h-5.8L13 2.5z" strokeLinejoin="round" />,
  book:     <><path d="M3 4.5h5.5A3.5 3.5 0 0 1 12 8v12.5a3 3 0 0 0-3-2.5H3z" /><path d="M21 4.5h-5.5A3.5 3.5 0 0 0 12 8v12.5a3 3 0 0 1 3-2.5h6z" /></>,
  dumbbell: <><path d="M7 6.8v10.4M17 6.8v10.4M3.4 9.4v5.2M20.6 9.4v5.2M7 12h10" /></>,
  moon:     <path d="M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a6.8 6.8 0 0 0 9.7 9.7z" />,
  sun:      <><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" /></>,
  heart:    <path d="M20.6 5.6a5.2 5.2 0 0 0-7.4 0l-1.2 1.2-1.2-1.2a5.2 5.2 0 1 0-7.4 7.4l1.2 1.2 7.4 7.3 7.4-7.3 1.2-1.2a5.2 5.2 0 0 0 0-7.4z" strokeLinejoin="round" />,
  leaf:     <><path d="M11.5 20.4a7 7 0 0 1-7-7c0-4 3-8.2 8.8-10.2 4.4 5.8 4 10 2.1 13a7 7 0 0 1-3.9 4.2z" /><path d="M2.8 21.2c4-2.2 6.2-4.4 8.7-8" /></>,
  flame:    <path d="M12 2.8s5.2 4.6 5.2 9.7a5.2 5.2 0 0 1-10.4 0c0-1.5.6-3.1 1.6-4.7.4 1.2 1.1 2 2.1 2.4-.3-2.6.3-5.3 1.5-7.4z" strokeLinejoin="round" />,
  pencil:   <><path d="M12 20.2h9" /><path d="M16.4 3.8a2.2 2.2 0 0 1 3.1 3.1L7.3 19.1l-4.2 1.1 1.1-4.2z" strokeLinejoin="round" /></>,
  music:    <><path d="M9 18.2V5.5l12-2.2v12.5" /><circle cx="6.5" cy="18.2" r="2.5" /><circle cx="18.5" cy="15.8" r="2.5" /></>,
  sparkle:  <><path d="M12 3.5l1.9 5.3 5.3 1.9-5.3 1.9L12 17.9l-1.9-5.3-5.3-1.9 5.3-1.9L12 3.5z" strokeLinejoin="round" /><path d="M19 17.5v4M17 19.5h4" /></>,
};
const ICON_NAMES = Object.keys(GLYPHS);

function Glyph({ name, size = 22, sw = 1.8, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={sw} strokeLinecap="round" style={style} aria-hidden="true">
      {GLYPHS[name] || GLYPHS.sparkle}
    </svg>
  );
}

// UI chrome glyphs
const UI = {
  plus:      <path d="M12 5v14M5 12h14" />,
  check:     <path d="M4.5 12.5l5 5 10-11" />,
  chevL:     <path d="M14.5 5.5 8 12l6.5 6.5" />,
  chevR:     <path d="M9.5 5.5 16 12l-6.5 6.5" />,
  chevD:     <path d="M6 9.5l6 6 6-6" />,
  close:     <path d="M6 6l12 12M18 6L6 18" />,
  flame:     <path d="M12 2.8s5.2 4.6 5.2 9.7a5.2 5.2 0 0 1-10.4 0c0-1.5.6-3.1 1.6-4.7.4 1.2 1.1 2 2.1 2.4-.3-2.6.3-5.3 1.5-7.4z" strokeLinejoin="round" />,
  trash:     <><path d="M4 6.5h16M9.5 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7M6.5 6.5l.9 12.6a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-12.6" /><path d="M10 10.5v6M14 10.5v6" /></>,
  archive:   <><rect x="3.5" y="4" width="17" height="4.5" rx="1.2" /><path d="M5.5 8.5v9A2.5 2.5 0 0 0 8 20h8a2.5 2.5 0 0 0 2.5-2.5v-9M10 12.5h4" /></>,
  restore:   <><path d="M4 9.5A8.5 8.5 0 1 1 3.5 13" /><path d="M4 4.5v5h5" /></>,
  handle:    <path d="M5 9h14M5 15h14" />,
  gear:      <><circle cx="12" cy="12" r="3.2" /><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7" /></>,
  ringTab:   <><circle cx="12" cy="12" r="8.2" /><path d="M4.5 12.5l5 4.5 9.5-9.5" opacity="0" /></>,
  gridTab:   <><rect x="3.5" y="3.5" width="7.2" height="7.2" rx="2.2" /><rect x="13.3" y="3.5" width="7.2" height="7.2" rx="2.2" /><rect x="3.5" y="13.3" width="7.2" height="7.2" rx="2.2" /><rect x="13.3" y="13.3" width="7.2" height="7.2" rx="2.2" /></>,
  chartTab:  <><path d="M4.5 20V11M12 20V4.5M19.5 20v-6.5" /></>,
};
function UIcon({ name, size = 20, sw = 1.8, style, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={sw} strokeLinecap="round" style={style} className={className} aria-hidden="true">
      {UI[name]}
    </svg>
  );
}

function vibrate(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch { /* unsupported */ }
}

// ── Local cache ────────────────────────────────────────────────────────────
const CACHE_KEY = 'habits_cache_v1';
function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function writeCache(habits, checkRows) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ habits, checkRows })); } catch { /* full */ }
}

// checks: Map<habitId, Set<dateStr>>
function buildCheckMap(rows) {
  const map = new Map();
  for (const r of rows || []) {
    if (!map.has(r.habitId)) map.set(r.habitId, new Set());
    map.get(r.habitId).add(r.date);
  }
  return map;
}
function checkMapToRows(map) {
  const rows = [];
  for (const [habitId, set] of map) for (const date of set) rows.push({ habitId, date });
  return rows;
}
function cloneCheckMap(map) {
  const next = new Map();
  for (const [k, v] of map) next.set(k, new Set(v));
  return next;
}

// ── Stats ──────────────────────────────────────────────────────────────────
function isScheduled(habit, dateStr) {
  const s = habit.schedule || [];
  return s.length === 0 || s.includes(weekdayOf(dateStr));
}
function habitStartDate(habit, set) {
  let start = habit.createdAt ? hkDateOfTimestamp(habit.createdAt) : hkTodayStr();
  for (const d of set || []) if (d < start) start = d;
  return start;
}

function currentStreak(habit, set, today) {
  if (!set || set.size === 0) return 0;
  const start = habitStartDate(habit, set);
  let d = today;
  // an unchecked "today" doesn't break the streak yet
  if (isScheduled(habit, d) && !set.has(d)) d = addDays(d, -1);
  let streak = 0;
  let guard = 0;
  while (d >= start && guard < 4000) {
    if (isScheduled(habit, d)) {
      if (set.has(d)) streak++;
      else break;
    }
    d = addDays(d, -1);
    guard++;
  }
  return streak;
}

function bestStreak(habit, set, today) {
  if (!set || set.size === 0) return 0;
  const start = habitStartDate(habit, set);
  let best = 0, run = 0, guard = 0;
  // scan at most the trailing ~11 years so the guard trims old history, not recent
  const floor = addDays(today, -3999);
  let d = start < floor ? floor : start;
  while (d <= today && guard < 4000) {
    if (isScheduled(habit, d)) {
      if (set.has(d)) { run++; if (run > best) best = run; }
      else if (!(d === today)) run = 0; // today unchecked doesn't end a run
    }
    d = addDays(d, 1);
    guard++;
  }
  return best;
}

// completion rate over the trailing `days` window (scheduled days only)
function completionRate(habit, set, today, days = 30) {
  const from = addDays(today, -(days - 1));
  const created = habitStartDate(habit, set);
  let scheduled = 0, done = 0;
  let d = from < created ? created : from;
  while (d <= today) {
    if (isScheduled(habit, d)) {
      scheduled++;
      if (set && set.has(d)) done++;
    }
    d = addDays(d, 1);
  }
  return scheduled === 0 ? null : done / scheduled;
}

function countInRange(set, from, to) {
  let n = 0;
  for (const d of set || []) if (d >= from && d <= to) n++;
  return n;
}

// ═══════════════════════════════════════════════════════════════════════════
//  Styles
// ═══════════════════════════════════════════════════════════════════════════
const CSS = `
:root {
  --bg: #F2F2F7;
  --card: #FFFFFF;
  --card-elev: #FFFFFF;
  --label: #000000;
  --sec: rgba(60,60,67,0.6);
  --ter: rgba(60,60,67,0.3);
  --sep: rgba(60,60,67,0.14);
  --fill: rgba(120,120,128,0.14);
  --fill-strong: rgba(120,120,128,0.22);
  --tint: #007AFF;
  --danger: #FF3B30;
  --bar-bg: rgba(249,249,251,0.78);
  --scrim: rgba(0,0,0,0.34);
  --card-shadow: 0 1px 1px rgba(0,0,0,0.02), 0 6px 22px rgba(0,0,0,0.045);
  --sheet-shadow: 0 -12px 44px rgba(0,0,0,0.12);
  --c-red: #FF3B30; --c-orange: #FF9500; --c-yellow: #E8B500; --c-green: #34C759;
  --c-mint: #00C7BE; --c-teal: #30B0C7; --c-blue: #007AFF; --c-indigo: #5856D6;
  --c-purple: #AF52DE; --c-pink: #FF2D55;
  --spring: cubic-bezier(0.32, 0.72, 0, 1);
  --pop: cubic-bezier(0.34, 1.56, 0.64, 1);
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #000000;
    --card: #1C1C1E;
    --card-elev: #2C2C2E;
    --label: #FFFFFF;
    --sec: rgba(235,235,245,0.6);
    --ter: rgba(235,235,245,0.3);
    --sep: rgba(84,84,88,0.5);
    --fill: rgba(120,120,128,0.2);
    --fill-strong: rgba(120,120,128,0.32);
    --tint: #0A84FF;
    --danger: #FF453A;
    --bar-bg: rgba(18,18,20,0.75);
    --scrim: rgba(0,0,0,0.52);
    --card-shadow: none;
    --sheet-shadow: 0 -12px 44px rgba(0,0,0,0.5);
    --c-red: #FF453A; --c-orange: #FF9F0A; --c-yellow: #FFD60A; --c-green: #30D158;
    --c-mint: #63E6E2; --c-teal: #40C8E0; --c-blue: #0A84FF; --c-indigo: #5E5CE6;
    --c-purple: #BF5AF2; --c-pink: #FF375F;
  }
}

html, body { background: var(--bg); }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Inter', 'Helvetica Neue', sans-serif;
  color: var(--label);
  -webkit-tap-highlight-color: transparent;
}
button {
  font-family: inherit;
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
  touch-action: manipulation;
  padding: 0;
}
button:focus-visible, a:focus-visible, input:focus-visible, [role="button"]:focus-visible {
  outline: 2.5px solid var(--tint);
  outline-offset: 2px;
}
input { font-family: inherit; }
::selection { background: color-mix(in srgb, var(--tint) 25%, transparent); }

.shell {
  max-width: 600px;
  margin: 0 auto;
  min-height: 100dvh;
  padding: 0 20px calc(118px + env(safe-area-inset-bottom));
}

/* ── Compact top bar ── */
.topbar {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 40;
  height: calc(50px + env(safe-area-inset-top));
  padding-top: env(safe-area-inset-top);
  display: flex; align-items: center; justify-content: center;
  background: var(--bar-bg);
  -webkit-backdrop-filter: saturate(180%) blur(22px);
  backdrop-filter: saturate(180%) blur(22px);
  border-bottom: 0.5px solid var(--sep);
  opacity: 0;
  transform: translateY(-6px);
  pointer-events: none;
  transition: opacity 240ms ease, transform 240ms ease;
}
.topbar.on { opacity: 1; transform: none; pointer-events: auto; }
.topbar .t { font-size: 17px; font-weight: 600; letter-spacing: -0.01em; }

/* ── Large title header ── */
.head {
  padding: calc(24px + env(safe-area-inset-top)) 0 6px;
  display: flex; align-items: flex-end; justify-content: space-between; gap: 12px;
  animation: rise 560ms var(--spring) both;
}
.eyebrow {
  font-size: 13px; font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--sec);
  margin-bottom: 3px;
  font-variant-numeric: tabular-nums;
}
.large-title {
  font-size: 34px;
  font-weight: 700;
  letter-spacing: -0.021em;
  line-height: 1.15;
}
.head-actions { display: flex; align-items: center; gap: 10px; padding-bottom: 2px; }
.txt-btn {
  font-size: 17px;
  color: var(--tint);
  font-weight: 400;
  padding: 6px 2px;
  transition: opacity 150ms ease;
}
.txt-btn.bold { font-weight: 600; }
.txt-btn:active { opacity: 0.4; }
.txt-btn:disabled { color: var(--ter); cursor: default; }
.icon-btn {
  width: 34px; height: 34px;
  border-radius: 50%;
  background: var(--fill);
  color: var(--tint);
  display: grid; place-items: center;
  transition: transform 180ms var(--pop), background 150ms ease;
}
.icon-btn:active { transform: scale(0.88); }

/* ── Cards & lists ── */
.card {
  background: var(--card);
  border-radius: 20px;
  box-shadow: var(--card-shadow);
}
.section-label {
  font-size: 13px; font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--sec);
  margin: 26px 4px 8px;
}
.list-card { overflow: hidden; }
.row {
  width: 100%;
  display: flex; align-items: center; gap: 13px;
  padding: 12px 16px;
  text-align: left;
  position: relative;
  transition: background 200ms ease;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  box-sizing: border-box;
}
.row + .row::before {
  content: '';
  position: absolute;
  left: 68px; right: 0; top: 0;
  height: 0.5px;
  background: var(--sep);
}
.row:active { background: var(--fill); }
.row .grow { flex: 1; min-width: 0; }
.row-title {
  font-size: 17px; font-weight: 500;
  letter-spacing: -0.01em;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  transition: color 250ms ease;
}
.row-title.done-dim { color: var(--sec); }
.row-sub {
  font-size: 13px; color: var(--sec);
  margin-top: 1.5px;
  display: flex; align-items: center; gap: 4px;
  font-variant-numeric: tabular-nums;
}
.row-sub .streak-hot { color: var(--c-orange); display: inline-flex; align-items: center; gap: 2.5px; font-weight: 500; }

.squircle {
  width: 42px; height: 42px;
  flex-shrink: 0;
  border-radius: 12.5px;
  display: grid; place-items: center;
  background: color-mix(in srgb, var(--hc) 14%, transparent);
  color: var(--hc);
  transition: transform 300ms var(--pop);
}
.squircle.lg { width: 56px; height: 56px; border-radius: 17px; }

/* ── Check circle ── */
.checkwrap {
  width: 44px; height: 44px;
  margin: -7px -7px -7px 0;
  display: grid; place-items: center;
  flex-shrink: 0;
}
.check {
  width: 30px; height: 30px;
  border-radius: 50%;
  position: relative;
  display: grid; place-items: center;
  border: 2px solid color-mix(in srgb, var(--hc) 42%, transparent);
  background: transparent;
  transition: border-color 200ms ease, background 200ms ease;
}
.check svg { opacity: 0; transform: scale(0.4); transition: opacity 120ms ease, transform 120ms ease; color: #fff; }
.check.on {
  background: var(--hc);
  border-color: var(--hc);
  animation: checkPop 460ms var(--pop);
}
.check.on svg { opacity: 1; transform: scale(1); }
.check.on svg path {
  stroke-dasharray: 30;
  stroke-dashoffset: 30;
  animation: draw 320ms ease 60ms forwards;
}
@keyframes checkPop {
  0% { transform: scale(1); }
  40% { transform: scale(0.82); }
  70% { transform: scale(1.12); }
  100% { transform: scale(1); }
}
@keyframes draw { to { stroke-dashoffset: 0; } }

/* ── Hero ── */
.hero {
  margin-top: 14px;
  padding: 20px 22px;
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  position: relative;
  overflow: visible;
  animation: rise 560ms var(--spring) 60ms both;
}
.hero-kicker { font-size: 13px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--sec); }
.hero-line { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; margin-top: 4px; }
.hero-line .accent { color: var(--tint); }
.hero-cap { font-size: 14px; color: var(--sec); margin-top: 5px; line-height: 1.4; max-width: 240px; }
.ringbox { position: relative; flex-shrink: 0; }
.ring-center {
  position: absolute; inset: 0;
  display: grid; place-items: center;
  font-variant-numeric: tabular-nums;
}
.ring-center .big { font-size: 21px; font-weight: 700; letter-spacing: -0.02em; }
.ring-center .of { font-size: 11px; font-weight: 600; color: var(--sec); margin-top: -1px; }
.ring-track { stroke: var(--fill); }
.ring-fg {
  transition: stroke-dashoffset 700ms var(--spring);
}

/* celebration burst */
.burst { position: absolute; inset: 0; pointer-events: none; }
.burst i {
  position: absolute; left: 50%; top: 50%;
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--bc);
  opacity: 0;
  animation: burst 950ms cubic-bezier(0.16, 0.9, 0.3, 1) var(--bd) forwards;
}
@keyframes burst {
  0% { transform: translate(-50%, -50%) scale(0.4); opacity: 0; }
  12% { opacity: 1; }
  100% { transform: translate(calc(-50% + var(--bx)), calc(-50% + var(--by))) scale(1); opacity: 0; }
}

/* ── Today list ── */
.today-list { margin-top: 18px; }
.stagger { animation: rise 520ms var(--spring) both; animation-delay: calc(90ms + var(--i) * 40ms); }

.empty {
  margin-top: 18px;
  padding: 44px 28px;
  text-align: center;
  animation: rise 560ms var(--spring) 100ms both;
}
.empty .art {
  width: 74px; height: 74px; margin: 0 auto 18px;
  border-radius: 24px;
  background: color-mix(in srgb, var(--tint) 12%, transparent);
  color: var(--tint);
  display: grid; place-items: center;
}
.empty h3 { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
.empty p { font-size: 15px; color: var(--sec); line-height: 1.45; margin: 8px auto 20px; max-width: 260px; }
.cta {
  display: inline-flex; align-items: center; gap: 7px;
  background: var(--tint);
  color: #fff;
  font-size: 16px; font-weight: 600;
  padding: 12px 22px;
  border-radius: 999px;
  transition: transform 200ms var(--pop), opacity 150ms ease;
}
.cta:active { transform: scale(0.95); opacity: 0.85; }

/* ── Week strip (habits view) ── */
.weekstrip { display: flex; gap: 4.5px; margin-top: 6px; }
.weekstrip i {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--fill-strong);
}
.weekstrip i.hit { background: var(--hc); }
.weekstrip i.off { background: transparent; border: 1px solid var(--sep); width: 5px; height: 5px; margin: 1px; }

/* ── Tab bar ── */
.tabbar-wrap {
  position: fixed;
  left: 0; right: 0;
  bottom: calc(14px + env(safe-area-inset-bottom));
  display: flex; justify-content: center;
  z-index: 45;
  pointer-events: none;
}
.tabbar {
  pointer-events: auto;
  display: flex;
  gap: 4px;
  padding: 5px;
  border-radius: 999px;
  background: var(--bar-bg);
  -webkit-backdrop-filter: saturate(180%) blur(24px);
  backdrop-filter: saturate(180%) blur(24px);
  border: 0.5px solid var(--sep);
  box-shadow: 0 8px 32px rgba(0,0,0,0.12);
}
.tab {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  min-width: 76px;
  padding: 8px 12px 7px;
  border-radius: 999px;
  color: var(--sec);
  transition: color 200ms ease, background 250ms var(--spring), transform 200ms var(--pop);
}
.tab span { font-size: 10.5px; font-weight: 600; letter-spacing: 0.01em; }
.tab.on { color: var(--tint); background: color-mix(in srgb, var(--tint) 11%, transparent); }
.tab:active { transform: scale(0.93); }

/* ── Sheets ── */
.scrim {
  position: fixed; inset: 0;
  background: var(--scrim);
  z-index: 50;
  animation: fadeIn 280ms ease both;
}
.scrim.closing { animation: fadeOut 260ms ease both; pointer-events: none; }
.sheet {
  position: fixed;
  left: 50%; bottom: 0;
  transform: translateX(-50%);
  width: min(600px, 100%);
  max-height: 93dvh;
  z-index: 51;
  background: var(--bg);
  border-radius: 22px 22px 0 0;
  box-shadow: var(--sheet-shadow);
  display: flex; flex-direction: column;
  animation: sheetUp 460ms var(--spring) both;
  touch-action: pan-y;
}
@media (prefers-color-scheme: dark) {
  .sheet { background: #161618; }
  .sheet .card { background: #232326; }
  .sheet input.namefield { background: #232326; }
}
.sheet.closing { pointer-events: none; }
.sheet:focus { outline: none; }
.grabber-zone { padding: 8px 0 2px; cursor: grab; flex-shrink: 0; }
.grabber { width: 38px; height: 5px; border-radius: 3px; background: var(--fill-strong); margin: 0 auto; }
.sheet-head {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 6px 18px 12px;
  flex-shrink: 0;
}
.sheet-head .t { font-size: 17px; font-weight: 600; letter-spacing: -0.01em; text-align: center; }
.sheet-head .l { justify-self: start; }
.sheet-head .r { justify-self: end; }
.sheet-body {
  overflow-y: auto;
  padding: 4px 20px calc(30px + env(safe-area-inset-bottom));
  overscroll-behavior: contain;
}
@keyframes sheetUp { from { transform: translateX(-50%) translateY(103%); } to { transform: translateX(-50%) translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
@keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }

/* ── Form ── */
input.namefield {
  width: 100%;
  background: var(--card);
  border: none;
  border-radius: 14px;
  padding: 15px 16px;
  font-size: 17px;
  color: var(--label);
  letter-spacing: -0.01em;
}
input.namefield::placeholder { color: var(--ter); }
input.namefield:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2.5px color-mix(in srgb, var(--tint) 55%, transparent);
}

.icon-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; padding: 14px; }
.icon-cell {
  aspect-ratio: 1;
  border-radius: 13px;
  display: grid; place-items: center;
  background: var(--fill);
  color: var(--sec);
  transition: transform 200ms var(--pop), background 180ms ease, color 180ms ease;
}
.icon-cell:active { transform: scale(0.88); }
.icon-cell.sel { background: var(--hc); color: #fff; transform: scale(1.06); }

.color-grid { display: grid; grid-template-columns: repeat(10, 1fr); gap: 6px; padding: 16px 14px; }
.color-dot {
  aspect-ratio: 1;
  border-radius: 50%;
  position: relative;
  background: var(--dc);
  transition: transform 200ms var(--pop);
}
.color-dot:active { transform: scale(0.85); }
.color-dot.sel::after {
  content: '';
  position: absolute; inset: -4.5px;
  border-radius: 50%;
  border: 2.5px solid var(--dc);
}

.day-chips { display: flex; gap: 7px; padding: 14px; justify-content: space-between; }
.day-chip {
  width: 40px; height: 40px;
  border-radius: 50%;
  font-size: 14px; font-weight: 600;
  background: var(--fill);
  color: var(--sec);
  transition: background 180ms ease, color 180ms ease, transform 200ms var(--pop);
}
.day-chip:active { transform: scale(0.88); }
.day-chip.sel { background: var(--hc); color: #fff; }
.form-hint { font-size: 13px; color: var(--sec); padding: 0 16px 13px; margin-top: -4px; }

.bigbtn {
  width: 100%;
  padding: 15px;
  border-radius: 15px;
  font-size: 17px; font-weight: 600;
  letter-spacing: -0.01em;
  background: var(--tint);
  color: #fff;
  margin-top: 26px;
  transition: transform 200ms var(--pop), opacity 150ms ease;
}
.bigbtn:active { transform: scale(0.97); }
.bigbtn:disabled { background: var(--fill-strong); color: var(--ter); }

/* ── Detail ── */
.stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
.stat-card { padding: 14px 16px; }
.stat-num {
  font-size: 26px; font-weight: 700; letter-spacing: -0.025em;
  font-variant-numeric: tabular-nums;
  display: flex; align-items: baseline; gap: 4px;
}
.stat-num .unit { font-size: 13px; font-weight: 600; color: var(--sec); letter-spacing: 0; }
.stat-lab { font-size: 12.5px; font-weight: 600; color: var(--sec); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 3px; }

/* calendar */
.cal { padding: 16px; margin-top: 12px; }
.cal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.cal-title { font-size: 16px; font-weight: 600; letter-spacing: -0.01em; }
.cal-nav { display: flex; gap: 4px; }
.cal-nav button {
  width: 32px; height: 32px; border-radius: 50%;
  display: grid; place-items: center;
  color: var(--tint);
  transition: background 150ms ease, transform 180ms var(--pop), color 150ms ease;
}
.cal-nav button:active { background: var(--fill); transform: scale(0.88); }
.cal-nav button:disabled { color: var(--ter); }
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); row-gap: 5px; }
.cal-dow { font-size: 11px; font-weight: 600; color: var(--ter); text-align: center; padding-bottom: 7px; }
.cal-day {
  aspect-ratio: 1;
  max-height: 44px;
  display: grid; place-items: center;
  position: relative;
}
.cal-day button {
  width: 34px; height: 34px;
  border-radius: 50%;
  font-size: 14.5px;
  font-variant-numeric: tabular-nums;
  color: var(--label);
  display: grid; place-items: center;
  position: relative;
  transition: background 180ms ease, color 180ms ease, transform 200ms var(--pop);
}
.cal-day button:active { transform: scale(0.85); }
.cal-day button.hit { background: var(--hc); color: #fff; font-weight: 600; }
.cal-day button.today-ring { box-shadow: inset 0 0 0 1.8px var(--hc); font-weight: 600; }
.cal-day button.future { color: var(--ter); cursor: default; }
.cal-day .sched-dot {
  position: absolute; bottom: 2.5px; left: 50%;
  transform: translateX(-50%);
  width: 3.5px; height: 3.5px; border-radius: 50%;
  background: var(--ter);
}

/* heatmap */
.heat { padding: 16px; margin-top: 12px; }
.heat-title { font-size: 16px; font-weight: 600; letter-spacing: -0.01em; margin-bottom: 12px; }
.heat-scroll { overflow-x: auto; scrollbar-width: none; }
.heat-scroll::-webkit-scrollbar { display: none; }
.heat-months { display: flex; font-size: 10.5px; font-weight: 600; color: var(--sec); margin-bottom: 5px; }
.heat-grid { display: flex; gap: 3px; }
.heat-col { display: flex; flex-direction: column; gap: 3px; }
.heat-cell { width: 11px; height: 11px; border-radius: 3.2px; background: var(--fill); }
.heat-legend {
  display: flex; align-items: center; gap: 4px;
  justify-content: flex-end;
  margin-top: 10px;
  font-size: 11px; color: var(--sec);
}
.heat-legend i { width: 9px; height: 9px; border-radius: 2.6px; display: inline-block; }

/* grouped action list (detail bottom) */
.action-list { margin-top: 24px; }
.action-row {
  width: 100%;
  display: flex; align-items: center; gap: 12px;
  padding: 13.5px 16px;
  font-size: 17px;
  letter-spacing: -0.01em;
  color: var(--tint);
  position: relative;
  text-align: left;
  transition: background 150ms ease;
}
.action-row:active { background: var(--fill); }
.action-row + .action-row::before {
  content: '';
  position: absolute; left: 50px; right: 0; top: 0;
  height: 0.5px; background: var(--sep);
}
.action-row.danger { color: var(--danger); }

/* confirm sheet */
.confirm-body { text-align: center; padding: 6px 24px 0; }
.confirm-body h3 { font-size: 19px; font-weight: 700; letter-spacing: -0.015em; }
.confirm-body p { font-size: 14.5px; color: var(--sec); line-height: 1.45; margin-top: 7px; }
.confirm-actions { display: flex; flex-direction: column; gap: 9px; margin-top: 22px; }
.confirm-actions .primary {
  padding: 14.5px; border-radius: 14px;
  font-size: 17px; font-weight: 600;
  background: var(--danger); color: #fff;
  transition: transform 200ms var(--pop), opacity 150ms ease;
}
.confirm-actions .primary.safe { background: var(--tint); }
.confirm-actions .primary:active { transform: scale(0.97); }
.confirm-actions .ghost {
  padding: 13px; font-size: 17px; font-weight: 500; color: var(--tint);
}

/* insights */
.duo { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.bars { padding: 6px 16px; }
.bar-row { display: flex; align-items: center; gap: 12px; padding: 10.5px 0; position: relative; }
.bar-row + .bar-row::before {
  content: ''; position: absolute; left: 42px; right: 0; top: 0;
  height: 0.5px; background: var(--sep);
}
.bar-ic {
  width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
  display: grid; place-items: center;
  background: color-mix(in srgb, var(--hc) 14%, transparent);
  color: var(--hc);
}
.bar-meta { flex: 1; min-width: 0; }
.bar-name { font-size: 14.5px; font-weight: 500; letter-spacing: -0.01em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bar-track { height: 5px; border-radius: 3px; background: var(--fill); margin-top: 6px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 3px; background: var(--hc); transition: width 700ms var(--spring); }
.bar-pct { font-size: 14px; font-weight: 600; color: var(--sec); font-variant-numeric: tabular-nums; width: 42px; text-align: right; flex-shrink: 0; }

.rhythm { padding: 18px 18px 12px; }
.rhythm-bars { display: flex; align-items: flex-end; gap: 8px; height: 92px; }
.rhythm-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; justify-content: flex-end; }
.rhythm-bar {
  width: 100%;
  max-width: 30px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--tint) 24%, transparent);
  transition: height 700ms var(--spring);
  min-height: 4px;
}
.rhythm-col.today .rhythm-bar { background: var(--tint); }
.rhythm-lab { font-size: 11px; font-weight: 600; color: var(--sec); }
.rhythm-col.today .rhythm-lab { color: var(--tint); }

/* edit mode drag */
/* while a drag is live, release the entry animation's fill so inline transforms apply */
.drag-active .stagger { animation: none; }
.drag-row { transition: transform 260ms var(--spring); }
.drag-row.dragging {
  transition: none;
  z-index: 5;
  position: relative;
  box-shadow: 0 10px 32px rgba(0,0,0,0.16);
  border-radius: 20px;
  background: var(--card-elev);
}
.handle { color: var(--ter); flex-shrink: 0; cursor: grab; padding: 8px 2px 8px 8px; margin: -8px 0; touch-action: none; }

/* toast */
.toast {
  position: fixed;
  left: 50%;
  bottom: calc(96px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  z-index: 70;
  background: var(--card-elev);
  color: var(--label);
  font-size: 14.5px; font-weight: 500;
  padding: 11px 20px;
  border-radius: 999px;
  box-shadow: 0 10px 36px rgba(0,0,0,0.18);
  border: 0.5px solid var(--sep);
  animation: toastIn 380ms var(--pop) both;
  max-width: calc(100vw - 48px);
  text-align: center;
}
@keyframes toastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(12px) scale(0.92); }
  to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}

/* spinner */
.spin-wrap { display: grid; place-items: center; padding: 90px 0 40px; }
.spinner {
  width: 26px; height: 26px;
  border-radius: 50%;
  border: 2.5px solid var(--fill-strong);
  border-top-color: var(--sec);
  animation: rot 800ms linear infinite;
}
@keyframes rot { to { transform: rotate(360deg); } }

@media (max-width: 380px) {
  .shell { padding-left: 16px; padding-right: 16px; }
  .day-chip { width: 36px; height: 36px; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-delay: 0ms !important;
    transition-duration: 0.01ms !important;
  }
  .spinner { animation: none !important; }
}
`;

// ═══════════════════════════════════════════════════════════════════════════
//  Small building blocks
// ═══════════════════════════════════════════════════════════════════════════

function hcVar(color) {
  return { '--hc': `var(--c-${HABIT_COLORS.includes(color) ? color : 'blue'})` };
}

// List rows contain their own buttons (check circles, restore), so the row
// itself must not be a <button> — nested buttons are invalid HTML.
function rowActivate(fn) {
  return {
    role: 'button',
    tabIndex: 0,
    onClick: fn,
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fn(e);
      }
    },
  };
}

function Ring({ size = 92, stroke = 9, pct = 0, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, pct)));
  return (
    <div className="ringbox" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--c-blue)" />
            <stop offset="100%" stopColor="var(--c-teal)" />
          </linearGradient>
        </defs>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        <circle
          className="ring-fg"
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

function CheckCircle({ checked, color, onToggle, label }) {
  // the 44px wrapper is the touch target and owns the handler — the inner
  // button's synthesized keyboard click bubbles up to it
  return (
    <span
      className="checkwrap"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        className={`check ${checked ? 'on' : ''}`}
        style={hcVar(color)}
        aria-pressed={checked}
        aria-label={label}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4.5 12.5l5 5 10-11" />
        </svg>
      </button>
    </span>
  );
}

const BURST_COLORS = ['blue', 'teal', 'green', 'orange', 'pink', 'purple', 'yellow', 'mint'];
function Burst({ seed }) {
  const dots = useMemo(() => {
    return Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * Math.PI * 2 + (seed % 7) * 0.13;
      const dist = 52 + ((i * 37 + seed * 11) % 30);
      return {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        c: BURST_COLORS[(i + seed) % BURST_COLORS.length],
        d: (i % 5) * 28,
      };
    });
  }, [seed]);
  if (!seed) return null;
  return (
    <div className="burst" key={seed} aria-hidden="true">
      {dots.map((d, i) => (
        <i key={i} style={{
          '--bx': `${d.x}px`, '--by': `${d.y}px`,
          '--bc': `var(--c-${d.c})`, '--bd': `${d.d}ms`,
        }} />
      ))}
    </div>
  );
}

// ── Sheet (bottom modal, iOS style, drag-to-dismiss on grabber) ────────────
// Stacked sheets can unmount in any order (delete flow), so the body scroll
// lock is a counter, not a saved/restored value.
let bodyScrollLocks = 0;

function Sheet({ onClose, children, ariaLabel, layer = 0 }) {
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const panelRef = useRef(null);
  const drag = useRef({ y: 0, dy: 0, active: false });

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    const el = panelRef.current;
    if (el) {
      // entry animation fills forwards; drop it so the inline transform drives
      el.style.animation = 'none';
      el.style.transition = 'transform 300ms ease-in';
      el.style.transform = 'translateX(-50%) translateY(103%)';
    }
    setTimeout(onClose, 290);
  }, [onClose]);

  useEffect(() => {
    if (++bodyScrollLocks === 1) document.body.style.overflow = 'hidden';
    const prevFocus = document.activeElement;
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) panel.focus({ preventScroll: true });
    return () => {
      if (--bodyScrollLocks === 0) document.body.style.overflow = '';
      if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const onPointerDown = (e) => {
    drag.current = { y: e.clientY, dy: 0, active: true };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.current.active || closingRef.current) return;
    const dy = Math.max(0, e.clientY - drag.current.y);
    drag.current.dy = dy;
    const el = panelRef.current;
    if (el) {
      el.style.animation = 'none';
      el.style.transition = 'none';
      el.style.transform = `translateX(-50%) translateY(${dy}px)`;
    }
  };
  const springBack = () => {
    const el = panelRef.current;
    if (el && !closingRef.current) {
      el.style.transition = 'transform 380ms var(--spring)';
      el.style.transform = 'translateX(-50%) translateY(0)';
    }
  };
  const onPointerUp = () => {
    if (!drag.current.active) return;
    const { dy } = drag.current;
    drag.current.active = false;
    if (dy > 110) close();
    else springBack();
  };
  const onPointerCancel = () => {
    if (!drag.current.active) return;
    drag.current.active = false;
    springBack();
  };

  return (
    <>
      <div
        className={`scrim ${closing ? 'closing' : ''}`}
        style={{ zIndex: 50 + layer * 4 }}
        onClick={close}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`sheet ${closing ? 'closing' : ''}`}
        style={{ zIndex: 51 + layer * 4 }}
        role="dialog" aria-modal="true" aria-label={ariaLabel}
      >
        <div
          className="grabber-zone"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          <div className="grabber" />
        </div>
        {typeof children === 'function' ? children(close) : children}
      </div>
    </>
  );
}

function ConfirmSheet({ title, message, confirmLabel, destructive = true, onConfirm, onClose }) {
  return (
    <Sheet onClose={onClose} ariaLabel={title} layer={1}>
      {(close) => (
        <div className="sheet-body">
          <div className="confirm-body">
            <h3>{title}</h3>
            <p>{message}</p>
          </div>
          <div className="confirm-actions">
            <button
              className={`primary ${destructive ? '' : 'safe'}`}
              onClick={() => { onConfirm(); close(); }}
            >
              {confirmLabel}
            </button>
            <button className="ghost" onClick={close}>Cancel</button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Habit form (new / edit)
// ═══════════════════════════════════════════════════════════════════════════
function HabitForm({ initial, onSave, onClose }) {
  const editing = !!initial?.id;
  const [name, setName] = useState(initial?.name || '');
  const [icon, setIcon] = useState(initial?.icon || 'sparkle');
  const [color, setColor] = useState(initial?.color || 'blue');
  const [schedule, setSchedule] = useState(
    initial?.schedule?.length ? [...initial.schedule] : [0, 1, 2, 3, 4, 5, 6]
  );
  const [saving, setSaving] = useState(false);
  const valid = name.trim().length > 0 && schedule.length > 0;

  const toggleDay = (d) => {
    vibrate(6);
    setSchedule(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());
  };

  const submit = async (close) => {
    if (!valid || saving) return;
    setSaving(true);
    const ok = await onSave({ name: name.trim(), icon, color, schedule });
    setSaving(false);
    if (ok) close();
  };

  return (
    <Sheet onClose={onClose} ariaLabel={editing ? 'Edit habit' : 'New habit'}>
      {(close) => (
        <>
          <div className="sheet-head">
            <button className="txt-btn l" onClick={close}>Cancel</button>
            <span className="t">{editing ? 'Edit Habit' : 'New Habit'}</span>
            <button className="txt-btn bold r" disabled={!valid || saving} onClick={() => submit(close)}>
              {editing ? 'Save' : 'Add'}
            </button>
          </div>
          <div className="sheet-body">
            <input
              className="namefield"
              value={name}
              placeholder="Habit name"
              maxLength={48}
              autoFocus={!editing}
              enterKeyHint="done"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(close); }}
              aria-label="Habit name"
            />

            <div className="section-label">Icon</div>
            <div className="card icon-grid" style={hcVar(color)}>
              {ICON_NAMES.map(n => (
                <button
                  key={n}
                  className={`icon-cell ${icon === n ? 'sel' : ''}`}
                  onClick={() => { vibrate(6); setIcon(n); }}
                  aria-label={`Icon ${n}`}
                  aria-pressed={icon === n}
                >
                  <Glyph name={n} size={22} />
                </button>
              ))}
            </div>

            <div className="section-label">Color</div>
            <div className="card color-grid">
              {HABIT_COLORS.map(c => (
                <button
                  key={c}
                  className={`color-dot ${color === c ? 'sel' : ''}`}
                  style={{ '--dc': `var(--c-${c})` }}
                  onClick={() => { vibrate(6); setColor(c); }}
                  aria-label={`Color ${c}`}
                  aria-pressed={color === c}
                />
              ))}
            </div>

            <div className="section-label">Repeat</div>
            <div className="card" style={hcVar(color)}>
              <div className="day-chips">
                {DAYS_MIN.map((d, i) => (
                  <button
                    key={i}
                    className={`day-chip ${schedule.includes(i) ? 'sel' : ''}`}
                    onClick={() => toggleDay(i)}
                    aria-label={DAYS_FULL[i]}
                    aria-pressed={schedule.includes(i)}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <div className="form-hint">
                {schedule.length === 0 ? 'Pick at least one day' : scheduleSummary(schedule)}
              </div>
            </div>

            <button className="bigbtn" disabled={!valid || saving} onClick={() => submit(close)}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Habit'}
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Calendar + heatmap
// ═══════════════════════════════════════════════════════════════════════════
function MonthCalendar({ habit, set, today, onToggleDay }) {
  const [cursor, setCursor] = useState(today.slice(0, 7)); // YYYY-MM
  const [cy, cm] = cursor.split('-').map(Number);

  const cells = useMemo(() => {
    const first = `${cursor}-01`;
    const startDow = weekdayOf(first);
    const daysInMonth = new Date(Date.UTC(cy, cm, 0)).getUTCDate();
    const out = [];
    for (let i = 0; i < startDow; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      out.push(`${cursor}-${String(d).padStart(2, '0')}`);
    }
    return out;
  }, [cursor, cy, cm]);

  const nav = (n) => {
    const d = new Date(Date.UTC(cy, cm - 1 + n, 1));
    setCursor(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  };
  const atCurrentMonth = cursor >= today.slice(0, 7);

  return (
    <div className="card cal" style={hcVar(habit.color)}>
      <div className="cal-head">
        <span className="cal-title">{MONTHS[cm - 1]} {cy}</span>
        <div className="cal-nav">
          <button onClick={() => nav(-1)} aria-label="Previous month"><UIcon name="chevL" size={18} sw={2.2} /></button>
          <button onClick={() => nav(1)} disabled={atCurrentMonth} aria-label="Next month"><UIcon name="chevR" size={18} sw={2.2} /></button>
        </div>
      </div>
      <div className="cal-grid">
        {DAYS_MIN.map((d, i) => <span key={i} className="cal-dow">{d}</span>)}
        {cells.map((date, i) => {
          if (!date) return <span key={`b${i}`} />;
          const future = date > today;
          const hit = set?.has(date);
          const isToday = date === today;
          const sched = isScheduled(habit, date);
          return (
            <span key={date} className="cal-day">
              <button
                className={`${hit ? 'hit' : ''} ${isToday && !hit ? 'today-ring' : ''} ${future ? 'future' : ''}`}
                disabled={future}
                onClick={() => onToggleDay(date)}
                aria-label={`${date}${hit ? ', completed' : ''}`}
                aria-pressed={!!hit}
              >
                {Number(date.slice(8))}
                {sched && !hit && !future && <span className="sched-dot" />}
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// Build trailing-year week columns (Sunday-start), ending on today's week.
function buildWeeks(today, numWeeks = 52) {
  const thisSunday = addDays(today, -weekdayOf(today));
  const weeks = [];
  for (let w = numWeeks - 1; w >= 0; w--) {
    const start = addDays(thisSunday, -7 * w);
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(start, i)));
  }
  return weeks;
}

function Heatmap({ title, weeks, today, cellStyle, legend }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, []);

  const monthLabels = useMemo(() => {
    const labels = [];
    let last = null;
    for (let i = 0; i < weeks.length; i++) {
      const m = weeks[i][0].slice(5, 7);
      if (m !== last) {
        labels.push({ i, label: MONTHS_SHORT[Number(m) - 1] });
        last = m;
      }
    }
    // drop a leading label crowded against the second one
    if (labels.length > 1 && labels[1].i - labels[0].i < 3) labels.shift();
    return labels;
  }, [weeks]);

  return (
    <div className="card heat">
      {title && <div className="heat-title">{title}</div>}
      <div className="heat-scroll" ref={scrollRef}>
        <div style={{ width: weeks.length * 14 }}>
          <div className="heat-months" style={{ position: 'relative', height: 14 }}>
            {monthLabels.map(({ i, label }) => (
              <span key={i} style={{ position: 'absolute', left: i * 14 }}>{label}</span>
            ))}
          </div>
          <div className="heat-grid">
            {weeks.map((week, wi) => (
              <div key={wi} className="heat-col">
                {week.map(date => (
                  <span
                    key={date}
                    className="heat-cell"
                    style={date <= today ? cellStyle(date) : { opacity: 0.28 }}
                    title={date}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      {legend}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Habit detail sheet
// ═══════════════════════════════════════════════════════════════════════════
function HabitDetail({ habit, set, today, onToggleDay, onEdit, onArchive, onDelete, onClose }) {
  const [confirm, setConfirm] = useState(null); // 'delete' | null
  const weeks = useMemo(() => buildWeeks(today), [today]);
  const cur = currentStreak(habit, set, today);
  const best = bestStreak(habit, set, today);
  const monthStart = `${today.slice(0, 7)}-01`;
  const thisMonth = countInRange(set, monthStart, today);
  const total = set ? set.size : 0;
  const rate = completionRate(habit, set, today, 30);

  const cellStyle = (date) => {
    if (set?.has(date)) return { background: 'var(--hc)' };
    if (isScheduled(habit, date) && date >= habitStartDate(habit, set)) {
      return { background: 'var(--fill-strong)' };
    }
    return {};
  };

  return (
    <>
      <Sheet onClose={onClose} ariaLabel={habit.name}>
        {(close) => (
          <>
            <div className="sheet-head">
              <span className="l" />
              <span className="t">{habit.name}</span>
              <button className="txt-btn r" onClick={() => onEdit(close)}>Edit</button>
            </div>
            <div className="sheet-body" style={hcVar(habit.color)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginTop: 6 }}>
                <div className="squircle lg" style={hcVar(habit.color)}>
                  <Glyph name={habit.icon} size={28} />
                </div>
                <div>
                  <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.02em' }}>{habit.name}</div>
                  <div style={{ fontSize: 14, color: 'var(--sec)', marginTop: 2 }}>
                    {scheduleSummary(habit.schedule)}
                    {rate != null && <> · {Math.round(rate * 100)}% · 30 days</>}
                  </div>
                </div>
              </div>

              <div className="stat-grid">
                <div className="card stat-card">
                  <div className="stat-num" style={{ color: cur > 0 ? 'var(--hc)' : 'var(--label)' }}>
                    {cur > 0 && <UIcon name="flame" size={20} sw={2} style={{ alignSelf: 'center' }} />}
                    {cur}<span className="unit">{cur === 1 ? 'day' : 'days'}</span>
                  </div>
                  <div className="stat-lab">Current streak</div>
                </div>
                <div className="card stat-card">
                  <div className="stat-num">{best}<span className="unit">{best === 1 ? 'day' : 'days'}</span></div>
                  <div className="stat-lab">Best streak</div>
                </div>
                <div className="card stat-card">
                  <div className="stat-num">{thisMonth}<span className="unit">{thisMonth === 1 ? 'time' : 'times'}</span></div>
                  <div className="stat-lab">This month</div>
                </div>
                <div className="card stat-card">
                  <div className="stat-num">{total}<span className="unit">{total === 1 ? 'time' : 'times'}</span></div>
                  <div className="stat-lab">All time</div>
                </div>
              </div>

              <MonthCalendar habit={habit} set={set} today={today} onToggleDay={onToggleDay} />

              <Heatmap
                title="Past year"
                weeks={weeks}
                today={today}
                cellStyle={cellStyle}
                legend={
                  <div className="heat-legend">
                    Missed <i style={{ background: 'var(--fill-strong)' }} />
                    <i style={{ background: 'var(--hc)' }} /> Done
                  </div>
                }
              />

              <div className="card list-card action-list">
                <button className="action-row" onClick={() => { onArchive(); close(); }}>
                  <UIcon name={habit.archived ? 'restore' : 'archive'} size={20} />
                  {habit.archived ? 'Restore Habit' : 'Archive Habit'}
                </button>
                <button className="action-row danger" onClick={() => setConfirm('delete')}>
                  <UIcon name="trash" size={20} />
                  Delete Habit
                </button>
              </div>
            </div>
          </>
        )}
      </Sheet>
      {confirm === 'delete' && (
        <ConfirmSheet
          title="Delete Habit?"
          message={`“${habit.name}” and its entire history will be permanently deleted. This can’t be undone.`}
          confirmLabel="Delete Habit"
          onConfirm={() => { onDelete(); onClose(); }}
          onClose={() => setConfirm(null)}
        />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Today view
// ═══════════════════════════════════════════════════════════════════════════
function TodayView({ habits, checks, today, onToggle, onOpenHabit, onNew, burstSeed }) {
  const wd = weekdayOf(today);
  const active = habits.filter(h => !h.archived);
  const scheduled = active.filter(h => (h.schedule || []).includes(wd) || (h.schedule || []).length === 0);
  const unscheduled = active.filter(h => !scheduled.includes(h));
  const done = scheduled.filter(h => checks.get(h.id)?.has(today)).length;
  const pct = scheduled.length ? done / scheduled.length : 0;
  const allDone = scheduled.length > 0 && done === scheduled.length;

  if (active.length === 0) {
    return (
      <div className="card empty">
        <div className="art"><Glyph name="sparkle" size={34} sw={1.6} /></div>
        <h3>Start something small</h3>
        <p>Pick one thing worth doing every day. Quiet progress compounds.</p>
        <button className="cta" onClick={onNew}><UIcon name="plus" size={17} sw={2.4} />New Habit</button>
      </div>
    );
  }

  const renderRow = (h, i, dimmed) => {
    const set = checks.get(h.id);
    const isChecked = !!set?.has(today);
    const streak = currentStreak(h, set, today);
    return (
      <div
        key={h.id}
        className="row stagger"
        style={{ '--i': i, opacity: dimmed && !isChecked ? 0.62 : 1 }}
        aria-label={`${h.name} details`}
        {...rowActivate(() => onOpenHabit(h.id))}
      >
        <span className="squircle" style={hcVar(h.color)}>
          <Glyph name={h.icon} />
        </span>
        <span className="grow">
          <span className={`row-title ${isChecked ? 'done-dim' : ''}`} style={{ display: 'block' }}>{h.name}</span>
          <span className="row-sub">
            {streak > 0 ? (
              <span className={streak >= 3 ? 'streak-hot' : undefined} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                {streak >= 3 && <UIcon name="flame" size={13} sw={2.2} />}
                {streak}-day streak
              </span>
            ) : dimmed ? 'Not scheduled today' : 'No streak yet'}
          </span>
        </span>
        <CheckCircle
          checked={isChecked}
          color={h.color}
          label={`Mark ${h.name} ${isChecked ? 'not done' : 'done'}`}
          onToggle={() => onToggle(h.id, today)}
        />
      </div>
    );
  };

  return (
    <>
      <div className="card hero">
        <div>
          <div className="hero-kicker">{allDone ? 'Perfect day' : 'Progress'}</div>
          <div className="hero-line">
            {scheduled.length === 0 ? (
              'Nothing scheduled'
            ) : allDone ? (
              'All done.'
            ) : (
              <><span className="accent">{done}</span> of {scheduled.length} complete</>
            )}
          </div>
          <div className="hero-cap">
            {scheduled.length === 0
              ? 'A quiet day. Anything below still counts.'
              : allDone
                ? 'Every habit kept. See you tomorrow.'
                : done === 0
                  ? 'The first one is the hardest. Start anywhere.'
                  : 'Keep going — you’re close.'}
          </div>
        </div>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Ring size={96} stroke={9.5} pct={scheduled.length === 0 ? 1 : pct}>
            <div style={{ textAlign: 'center' }}>
              <div className="big">{scheduled.length === 0 ? '—' : done}</div>
              {scheduled.length > 0 && <div className="of">of {scheduled.length}</div>}
            </div>
          </Ring>
          <Burst seed={burstSeed} />
        </div>
      </div>

      {scheduled.length > 0 && (
        <div className="card list-card today-list">
          {scheduled.map((h, i) => renderRow(h, i, false))}
        </div>
      )}

      {unscheduled.length > 0 && (
        <>
          <div className="section-label">Not scheduled today</div>
          <div className="card list-card">
            {unscheduled.map((h, i) => renderRow(h, scheduled.length + i, true))}
          </div>
        </>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Habits view (manage + reorder)
// ═══════════════════════════════════════════════════════════════════════════
function HabitsView({ habits, checks, today, editMode, onOpenHabit, onReorder, onUnarchive, onNew }) {
  const active = habits.filter(h => !h.archived);
  const archived = habits.filter(h => h.archived);
  const [showArchived, setShowArchived] = useState(false);

  // drag-to-reorder (edit mode)
  const ROW_H = 66;
  const [drag, setDrag] = useState(null); // { id, startIdx, curIdx, dy }
  const dragRef = useRef(null);

  const startDrag = (e, id, idx) => {
    e.preventDefault();
    dragRef.current = { id, startIdx: idx, curIdx: idx, startY: e.clientY, dy: 0 };
    setDrag({ ...dragRef.current });
    vibrate(8);
    const onMove = (ev) => {
      const d = dragRef.current;
      if (!d) return;
      d.dy = ev.clientY - d.startY;
      const target = Math.max(0, Math.min(active.length - 1, d.startIdx + Math.round(d.dy / ROW_H)));
      if (target !== d.curIdx) { d.curIdx = target; vibrate(4); }
      setDrag({ ...d });
    };
    const teardown = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      setDrag(null);
    };
    const onUp = () => {
      const d = dragRef.current;
      teardown();
      if (d && d.curIdx !== d.startIdx) {
        const ids = active.map(h => h.id);
        const [moved] = ids.splice(d.startIdx, 1);
        ids.splice(d.curIdx, 0, moved);
        onReorder(ids);
      }
    };
    const onCancel = () => teardown();
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  };

  const rowTransform = (idx) => {
    if (!drag) return undefined;
    if (active[idx].id === drag.id) return { transform: `translateY(${drag.dy}px)` };
    let shift = 0;
    if (drag.curIdx > drag.startIdx && idx > drag.startIdx && idx <= drag.curIdx) shift = -ROW_H;
    if (drag.curIdx < drag.startIdx && idx < drag.startIdx && idx >= drag.curIdx) shift = ROW_H;
    return { transform: `translateY(${shift}px)` };
  };

  const last7 = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)),
    [today]
  );

  if (active.length === 0 && archived.length === 0) {
    return (
      <div className="card empty">
        <div className="art"><Glyph name="leaf" size={34} sw={1.6} /></div>
        <h3>No habits yet</h3>
        <p>Create your first habit and it will live here.</p>
        <button className="cta" onClick={onNew}><UIcon name="plus" size={17} sw={2.4} />New Habit</button>
      </div>
    );
  }

  return (
    <>
      {active.length > 0 && (
        <div className={`card list-card ${drag ? 'drag-active' : ''}`} style={{ marginTop: 14 }}>
          {active.map((h, i) => {
            const set = checks.get(h.id);
            const isDragging = drag?.id === h.id;
            return (
              <div
                key={h.id}
                className={`row stagger drag-row ${isDragging ? 'dragging' : ''}`}
                style={{ '--i': i, ...rowTransform(i), ...(editMode ? { cursor: 'default' } : {}) }}
                {...(editMode ? {} : rowActivate(() => onOpenHabit(h.id)))}
              >
                <span className="squircle" style={hcVar(h.color)}>
                  <Glyph name={h.icon} />
                </span>
                <span className="grow">
                  <span className="row-title" style={{ display: 'block' }}>{h.name}</span>
                  <span className="row-sub">{scheduleSummary(h.schedule)}</span>
                  {!editMode && (
                    <span className="weekstrip" style={hcVar(h.color)} aria-hidden="true">
                      {last7.map(d => {
                        const hit = set?.has(d);
                        const sched = isScheduled(h, d);
                        return <i key={d} className={hit ? 'hit' : sched ? '' : 'off'} />;
                      })}
                    </span>
                  )}
                </span>
                {editMode ? (
                  <span
                    className="handle"
                    onPointerDown={(e) => startDrag(e, h.id, i)}
                    aria-label={`Reorder ${h.name}`}
                    role="button"
                  >
                    <UIcon name="handle" size={20} sw={2} />
                  </span>
                ) : (
                  <UIcon name="chevR" size={16} sw={2.4} style={{ color: 'var(--ter)', flexShrink: 0 }} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {archived.length > 0 && (
        <>
          <button
            className="txt-btn"
            style={{ margin: '20px 4px 4px', fontSize: 15, display: 'flex', alignItems: 'center', gap: 5 }}
            onClick={() => setShowArchived(v => !v)}
          >
            <UIcon name="chevD" size={15} sw={2.4}
              style={{ transform: showArchived ? 'none' : 'rotate(-90deg)', transition: 'transform 220ms ease' }} />
            Archived ({archived.length})
          </button>
          {showArchived && (
            <div className="card list-card">
              {archived.map((h, i) => (
                <div
                  key={h.id}
                  className="row stagger"
                  style={{ '--i': i, opacity: 0.65 }}
                  {...rowActivate(() => onOpenHabit(h.id))}
                >
                  <span className="squircle" style={hcVar(h.color)}>
                    <Glyph name={h.icon} />
                  </span>
                  <span className="grow">
                    <span className="row-title" style={{ display: 'block' }}>{h.name}</span>
                    <span className="row-sub">Archived</span>
                  </span>
                  <button
                    className="txt-btn"
                    style={{ fontSize: 15, flexShrink: 0 }}
                    onClick={(e) => { e.stopPropagation(); onUnarchive(h.id); }}
                    onKeyDown={(e) => e.stopPropagation()}
                    aria-label={`Restore ${h.name}`}
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Insights view
// ═══════════════════════════════════════════════════════════════════════════
function InsightsView({ habits, checks, today }) {
  const active = habits.filter(h => !h.archived);
  const weeks = useMemo(() => buildWeeks(today), [today]);
  const from30 = addDays(today, -29);

  const stats = useMemo(() => {
    let completions30 = 0;
    let perfectDays = 0;
    // per-day completion fraction for heatmap + perfect days
    const dayPct = new Map();
    let d = from30;
    // heatmap needs a full year of day fractions
    const yearStart = weeks[0]?.[0] || from30;
    let hd = yearStart;
    let guard = 0;
    while (hd <= today && guard < 400) {
      let sched = 0, done = 0;
      for (const h of active) {
        if (!isScheduled(h, hd)) continue;
        if (hd < habitStartDate(h, checks.get(h.id))) continue;
        sched++;
        if (checks.get(h.id)?.has(hd)) done++;
      }
      dayPct.set(hd, sched === 0 ? null : done / sched);
      hd = addDays(hd, 1);
      guard++;
    }
    while (d <= today) {
      const pct = dayPct.get(d);
      if (pct === 1) perfectDays++;
      for (const h of active) {
        if (checks.get(h.id)?.has(d)) completions30++;
      }
      d = addDays(d, 1);
    }
    let longest = { habit: null, days: 0 };
    for (const h of active) {
      const b = bestStreak(h, checks.get(h.id), today);
      if (b > longest.days) longest = { habit: h, days: b };
    }
    // weekday rhythm (last 30 days)
    const byDow = Array.from({ length: 7 }, () => ({ sched: 0, done: 0 }));
    let rd = from30;
    while (rd <= today) {
      const dow = weekdayOf(rd);
      for (const h of active) {
        if (!isScheduled(h, rd)) continue;
        if (rd < habitStartDate(h, checks.get(h.id))) continue;
        byDow[dow].sched++;
        if (checks.get(h.id)?.has(rd)) byDow[dow].done++;
      }
      rd = addDays(rd, 1);
    }
    return { completions30, perfectDays, longest, byDow, dayPct };
  }, [active, checks, today, from30, weeks]);

  if (active.length === 0) {
    return (
      <div className="card empty">
        <div className="art"><UIcon name="chartTab" size={32} sw={1.8} /></div>
        <h3>Nothing to chart yet</h3>
        <p>Once you start tracking habits, your patterns will show up here.</p>
      </div>
    );
  }

  const heatCellStyle = (date) => {
    const pct = stats.dayPct.get(date);
    if (pct == null) return {};
    if (pct === 0) return { background: 'var(--fill-strong)' };
    return { background: 'var(--c-blue)', opacity: 0.28 + pct * 0.72 };
  };

  const todayDow = weekdayOf(today);

  return (
    <>
      <div className="duo" style={{ marginTop: 14 }}>
        <div className="card stat-card stagger" style={{ '--i': 0 }}>
          <div className="stat-num" style={{ color: 'var(--c-green)' }}>{stats.perfectDays}</div>
          <div className="stat-lab">Perfect days · 30d</div>
        </div>
        <div className="card stat-card stagger" style={{ '--i': 1 }}>
          <div className="stat-num">{stats.completions30}</div>
          <div className="stat-lab">Completions · 30d</div>
        </div>
      </div>

      {stats.longest.days > 0 && (
        <div className="card stat-card stagger" style={{ '--i': 2, marginTop: 12, ...hcVar(stats.longest.habit.color) }}>
          <div className="stat-num" style={{ color: 'var(--hc)' }}>
            <UIcon name="flame" size={22} sw={2} style={{ alignSelf: 'center' }} />
            {stats.longest.days}<span className="unit">{stats.longest.days === 1 ? 'day' : 'days'}</span>
          </div>
          <div className="stat-lab">Longest streak · {stats.longest.habit.name}</div>
        </div>
      )}

      <div className="section-label">Last 30 days</div>
      <div className="card bars stagger" style={{ '--i': 0 }}>
        {active.map(h => {
          const rate = completionRate(h, checks.get(h.id), today, 30);
          const pct = rate == null ? 0 : Math.round(rate * 100);
          return (
            <div key={h.id} className="bar-row" style={hcVar(h.color)}>
              <span className="bar-ic"><Glyph name={h.icon} size={17} /></span>
              <span className="bar-meta">
                <span className="bar-name">{h.name}</span>
                <span className="bar-track"><span className="bar-fill" style={{ width: `${pct}%` }} /></span>
              </span>
              <span className="bar-pct">{rate == null ? '—' : `${pct}%`}</span>
            </div>
          );
        })}
      </div>

      <div className="section-label">Rhythm</div>
      <div className="card rhythm stagger" style={{ '--i': 0 }}>
        <div className="rhythm-bars">
          {stats.byDow.map((s, i) => {
            const pct = s.sched === 0 ? 0 : s.done / s.sched;
            return (
              <div key={i} className={`rhythm-col ${i === todayDow ? 'today' : ''}`}>
                <div
                  className="rhythm-bar"
                  style={{ height: `${Math.max(5, pct * 100)}%` }}
                  title={`${DAYS_FULL[i]}: ${Math.round(pct * 100)}%`}
                />
                <span className="rhythm-lab">{DAYS_MIN[i]}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="section-label">Past year</div>
      <Heatmap
        weeks={weeks}
        today={today}
        cellStyle={heatCellStyle}
        legend={
          <div className="heat-legend">
            Less
            <i style={{ background: 'var(--fill-strong)' }} />
            <i style={{ background: 'var(--c-blue)', opacity: 0.4 }} />
            <i style={{ background: 'var(--c-blue)', opacity: 0.7 }} />
            <i style={{ background: 'var(--c-blue)' }} />
            More
          </div>
        }
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  App
// ═══════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: 'today', label: 'Today', icon: 'ringTab' },
  { id: 'habits', label: 'Habits', icon: 'gridTab' },
  { id: 'insights', label: 'Insights', icon: 'chartTab' },
];

export default function App() {
  const [tab, setTab] = useState('today');
  const [habits, setHabits] = useState(null);       // null = loading
  const [checks, setChecks] = useState(new Map());
  const [loadError, setLoadError] = useState(false);
  const [today, setToday] = useState(hkTodayStr());
  const [sheet, setSheet] = useState(null);         // {kind:'new'} | {kind:'edit',id} | {kind:'detail',id}
  const [editMode, setEditMode] = useState(false);
  const [toast, setToast] = useState(null);
  const [burstSeed, setBurstSeed] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const toastTimer = useRef(null);
  const prevAllDone = useRef(false);

  // Refs are the authoritative store; state mirrors them for rendering.
  // This keeps rapid optimistic mutations and async responses race-free.
  const habitsRef = useRef(null);
  const checksRef = useRef(new Map());
  const pendingToggles = useRef(new Map()); // `${habitId}|${date}` -> intended boolean

  const applyHabits = useCallback((next) => {
    habitsRef.current = next;
    setHabits(next);
    writeCache(next || [], checkMapToRows(checksRef.current));
  }, []);

  const applyChecks = useCallback((next) => {
    checksRef.current = next;
    setChecks(next);
    writeCache(habitsRef.current || [], checkMapToRows(next));
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  // keep "today" fresh across midnight and app resume
  useEffect(() => {
    const update = () => setToday(hkTodayStr());
    const t = setInterval(update, 60_000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(t);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  // compact bar on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 46);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [h, c] = await Promise.all([api('habits'), api('checks')]);
      if (Array.isArray(h) && Array.isArray(c)) {
        const map = buildCheckMap(c);
        // the server snapshot predates any in-flight optimistic toggles —
        // re-apply their intent so a tap during refresh isn't reverted
        for (const [key, intent] of pendingToggles.current) {
          const [habitId, date] = key.split('|');
          if (!map.has(habitId)) map.set(habitId, new Set());
          if (intent) map.get(habitId).add(date);
          else map.get(habitId).delete(date);
        }
        habitsRef.current = h;
        setHabits(h);
        applyChecks(map);
        setLoadError(false);
      } else {
        throw new Error(h?.error || c?.error || 'Bad response');
      }
    } catch {
      if (habitsRef.current === null) setLoadError(true);
    }
  }, [applyChecks]);

  useEffect(() => {
    const cached = readCache();
    if (cached?.habits) {
      habitsRef.current = cached.habits;
      checksRef.current = buildCheckMap(cached.checkRows);
      setHabits(cached.habits);
      setChecks(checksRef.current);
    }
    refresh();
  }, [refresh]);

  // celebration when the day completes
  const activeHabits = useMemo(() => (habits || []).filter(h => !h.archived), [habits]);
  const wd = weekdayOf(today);
  const scheduledToday = activeHabits.filter(h => (h.schedule || []).includes(wd) || (h.schedule || []).length === 0);
  const doneToday = scheduledToday.filter(h => checks.get(h.id)?.has(today)).length;
  const allDone = scheduledToday.length > 0 && doneToday === scheduledToday.length;
  useEffect(() => {
    if (allDone && !prevAllDone.current) {
      setBurstSeed(s => s + 1);
      vibrate([12, 60, 18]);
    }
    prevAllDone.current = allDone;
  }, [allDone]);

  // clear the burst once it has played so tab remounts don't replay it
  useEffect(() => {
    if (!burstSeed) return;
    const t = setTimeout(() => setBurstSeed(0), 1500);
    return () => clearTimeout(t);
  }, [burstSeed]);

  // ── mutations ──
  const toggleCheck = useCallback(async (habitId, date) => {
    vibrate(10);
    const key = `${habitId}|${date}`;
    const willCheck = !checksRef.current.get(habitId)?.has(date);
    const next = cloneCheckMap(checksRef.current);
    if (!next.has(habitId)) next.set(habitId, new Set());
    if (willCheck) next.get(habitId).add(date);
    else next.get(habitId).delete(date);
    applyChecks(next);
    pendingToggles.current.set(key, willCheck);
    try {
      // idempotent set — a retry or race converges instead of re-toggling
      const r = await api('checks', 'POST', { habitId, date, checked: willCheck });
      if (!r || r.error) throw new Error(r?.error);
    } catch {
      const rolled = cloneCheckMap(checksRef.current);
      if (!rolled.has(habitId)) rolled.set(habitId, new Set());
      if (willCheck) rolled.get(habitId).delete(date);
      else rolled.get(habitId).add(date);
      applyChecks(rolled);
      showToast('Couldn’t save — check your connection');
    } finally {
      if (pendingToggles.current.get(key) === willCheck) pendingToggles.current.delete(key);
    }
  }, [applyChecks, showToast]);

  const saveHabit = useCallback(async (fields, id) => {
    try {
      const r = id
        ? await api('habits', 'PUT', fields, id)
        : await api('habits', 'POST', fields);
      if (!r || r.error) throw new Error(r?.error);
      const prev = habitsRef.current || [];
      applyHabits(id ? prev.map(h => h.id === id ? r : h) : [...prev, r]);
      return true;
    } catch (e) {
      showToast(e.message || 'Couldn’t save habit');
      return false;
    }
  }, [applyHabits, showToast]);

  const setArchived = useCallback(async (id, archived) => {
    const r = await api('habits', 'PUT', { archived }, id).catch(() => null);
    if (!r || r.error) { showToast('Couldn’t update habit'); return; }
    applyHabits((habitsRef.current || []).map(h => h.id === id ? r : h));
    showToast(archived ? 'Habit archived' : 'Habit restored');
  }, [applyHabits, showToast]);

  const deleteHabit = useCallback(async (id) => {
    const removed = (habitsRef.current || []).find(h => h.id === id);
    if (!removed) return;
    applyHabits((habitsRef.current || []).filter(h => h.id !== id));
    const r = await api('habits', 'DELETE', null, id).catch(() => null);
    if (!r || r.error) {
      // re-insert just the removed habit — a snapshot restore would wipe
      // any mutations that landed while the request was in flight
      const restored = [...(habitsRef.current || []), removed]
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      applyHabits(restored);
      showToast('Couldn’t delete habit');
      return;
    }
    const nextChecks = cloneCheckMap(checksRef.current);
    nextChecks.delete(id);
    applyChecks(nextChecks);
    showToast('Habit deleted');
  }, [applyHabits, applyChecks, showToast]);

  const reorderHabits = useCallback((orderedActiveIds) => {
    const prev = habitsRef.current;
    if (!prev) return;
    const pos = new Map(orderedActiveIds.map((id, i) => [id, i]));
    const next = [...prev].sort((a, b) => {
      const pa = pos.has(a.id) ? pos.get(a.id) : 1000 + (a.sortOrder || 0);
      const pb = pos.has(b.id) ? pos.get(b.id) : 1000 + (b.sortOrder || 0);
      return pa - pb;
    }).map((h, i) => ({ ...h, sortOrder: i }));
    applyHabits(next);
    // fire-and-forget; server order only matters across reloads
    api('reorder', 'PUT', { ids: next.map(h => h.id) }).catch(() => {});
  }, [applyHabits]);

  // ── render ──
  const sheetHabit = sheet?.id ? (habits || []).find(h => h.id === sheet.id) : null;
  const title = TABS.find(t => t.id === tab)?.label || 'Habits';
  const eyebrow = (() => {
    const d = parseDate(today);
    return `${DAYS_FULL[d.getUTCDay()]} · ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  })();

  const switchTab = (id) => {
    if (id === tab) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setTab(id);
    setEditMode(false);
    window.scrollTo(0, 0);
  };

  return (
    <>
      <style>{CSS}</style>

      <div className={`topbar ${scrolled ? 'on' : ''}`} aria-hidden={!scrolled}>
        <span className="t">{title}</span>
      </div>

      <div className="shell">
        <header className="head" key={tab}>
          <div>
            <div className="eyebrow">{eyebrow}</div>
            <h1 className="large-title">{title}</h1>
          </div>
          <div className="head-actions">
            {tab === 'habits' && activeHabits.length > 1 && (
              <button className="txt-btn" onClick={() => setEditMode(v => !v)}>
                {editMode ? 'Done' : 'Edit'}
              </button>
            )}
            {tab !== 'insights' && (
              <button className="icon-btn" onClick={() => setSheet({ kind: 'new' })} aria-label="New habit">
                <UIcon name="plus" size={19} sw={2.2} />
              </button>
            )}
          </div>
        </header>

        <main key={`${tab}-main`}>
          {habits === null ? (
            loadError ? (
              <div className="card empty">
                <div className="art" style={{ background: 'var(--fill)', color: 'var(--sec)' }}>
                  <UIcon name="restore" size={30} sw={1.8} />
                </div>
                <h3>Couldn’t load</h3>
                <p>Check your connection and try again.</p>
                <button className="cta" onClick={() => { setLoadError(false); refresh(); }}>Retry</button>
              </div>
            ) : (
              <div className="spin-wrap"><div className="spinner" /></div>
            )
          ) : tab === 'today' ? (
            <TodayView
              habits={habits}
              checks={checks}
              today={today}
              onToggle={toggleCheck}
              onOpenHabit={(id) => setSheet({ kind: 'detail', id })}
              onNew={() => setSheet({ kind: 'new' })}
              burstSeed={burstSeed}
            />
          ) : tab === 'habits' ? (
            <HabitsView
              habits={habits}
              checks={checks}
              today={today}
              editMode={editMode}
              onOpenHabit={(id) => setSheet({ kind: 'detail', id })}
              onReorder={reorderHabits}
              onUnarchive={(id) => setArchived(id, false)}
              onNew={() => setSheet({ kind: 'new' })}
            />
          ) : (
            <InsightsView habits={habits} checks={checks} today={today} />
          )}
        </main>
      </div>

      <div className="tabbar-wrap">
        <nav className="tabbar" aria-label="Sections">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab ${tab === t.id ? 'on' : ''}`}
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => switchTab(t.id)}
            >
              <UIcon name={t.icon} size={23} sw={1.9} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {sheet?.kind === 'new' && (
        <HabitForm
          onSave={(fields) => saveHabit(fields)}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.kind === 'edit' && sheetHabit && (
        <HabitForm
          initial={sheetHabit}
          onSave={(fields) => saveHabit(fields, sheetHabit.id)}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.kind === 'detail' && sheetHabit && (
        <HabitDetail
          habit={sheetHabit}
          set={checks.get(sheetHabit.id)}
          today={today}
          onToggleDay={(date) => toggleCheck(sheetHabit.id, date)}
          onEdit={() => setSheet({ kind: 'edit', id: sheetHabit.id })}
          onArchive={() => setArchived(sheetHabit.id, !sheetHabit.archived)}
          onDelete={() => deleteHabit(sheetHabit.id)}
          onClose={() => setSheet(null)}
        />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
