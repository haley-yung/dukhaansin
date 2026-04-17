import { useState, useEffect, useRef } from "react";

// ── Constants ─────────────────────────────────────────────────────────────
const INCOME = 42000;
const FAMILY = 11000;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_UC = MONTHS.map(m => m.toUpperCase());

// ── Design Tokens — mirror the gym tracker, single source of truth ────────
const T = {
  bg:        '#0A0A0B',
  surface:   'rgba(255,255,255,0.025)',
  surfaceHi: 'rgba(255,255,255,0.045)',
  line:      'rgba(255,255,255,0.06)',
  lineHi:    'rgba(255,255,255,0.12)',
  text:      '#F2F2F0',
  heading:   '#FAFAF7',
  secondary: '#A6A6AB',
  muted:     '#6F6F76',
  darkMuted: '#3B3B40',
  accent:    '#FAFAF7',
  accentInk: '#0A0A0B',
  // Restrained semantic accents — used only in data viz
  warn:      '#C9A06E', // warm amber, desaturated
  danger:    '#C56B6B', // muted red, no neon
  good:      '#7FA98A', // sage
  r1: 6, r2: 10, r3: 14, rPill: 999,
  font:    "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  mono:    "'JetBrains Mono', ui-monospace, monospace",
  display: "'Inter', -apple-system, sans-serif",
};

// ── Shared styles ─────────────────────────────────────────────────────────
const labelStyle = {
  fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
  color: T.muted, fontWeight: 500, fontFamily: T.font,
};
const tnum = { fontVariantNumeric: 'tabular-nums' };
const cardStyle = {
  background: T.surface, border: `1px solid ${T.line}`,
  borderRadius: T.r3, padding: 24,
};

// ── Utilities ─────────────────────────────────────────────────────────────
function fmtShort(n) {
  // Compact $ display for large sums — 1,234 stays, avoids decimals
  return Math.round(n).toLocaleString();
}

// ── Animated number — eases toward new value ──────────────────────────────
function AnimatedNumber({ value, prefix = "", duration = 720 }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const raf = useRef(null);
  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) return;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);
  return <span>{prefix}{Math.round(display).toLocaleString()}</span>;
}

// ── Progress ring — monochrome, confident ─────────────────────────────────
function ProgressRing({ percent, size = 112, stroke = 1.5, color = T.accent, labelTop, labelBottom }) {
  const r = (size - stroke * 8) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ - (Math.min(percent, 100) / 100) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.darkMuted} strokeWidth={stroke} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={off}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 800ms cubic-bezier(0.2, 0.8, 0.2, 1)" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <div className="tnum" style={{
          fontSize: 28, fontWeight: 300, letterSpacing: '-0.02em',
          color: T.heading, fontFamily: T.display, lineHeight: 1,
        }}>
          {percent.toFixed(0)}<span style={{ fontSize: 14, color: T.muted }}>%</span>
        </div>
        {labelTop && (
          <div style={{ ...labelStyle, fontSize: 10, marginTop: 8 }}>
            {labelTop}
          </div>
        )}
        {labelBottom && (
          <div style={{ fontSize: 11, color: T.secondary, marginTop: 2 }}>
            {labelBottom}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Monochrome calendar heatmap ───────────────────────────────────────────
function CalendarHeatmap({ paid, total, startYear, startMonth }) {
  const SQ = 14;
  const GAP = 4;
  const endMonth = startMonth + total - 1;
  const endYear = startYear + Math.floor(endMonth / 12);
  const years = [];
  for (let y = startYear; y <= endYear; y++) years.push(y);

  return (
    <div style={{ overflowX: "auto" }}>
      {/* Month labels */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 8, minWidth: "fit-content" }}>
        <div style={{ width: 36, flexShrink: 0 }} />
        <div style={{ display: "grid", gridTemplateColumns: `repeat(12, ${SQ}px)`, gap: GAP }}>
          {MONTHS_UC.map((m, i) => (
            <div key={i} style={{
              fontSize: 9, color: T.darkMuted, textAlign: "center",
              fontFamily: T.mono, letterSpacing: '0.08em', width: SQ,
            }}>
              {m.slice(0, 1)}
            </div>
          ))}
        </div>
      </div>
      {/* Year rows */}
      {years.map(year => (
        <div key={year} style={{ display: "flex", alignItems: "center", marginBottom: GAP }}>
          <div style={{
            width: 36, flexShrink: 0,
            fontSize: 10, color: T.darkMuted, fontFamily: T.mono,
          }}>
            {String(year).slice(2)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(12, ${SQ}px)`, gap: GAP }}>
            {Array.from({ length: 12 }, (_, monthIdx) => {
              const absMonth = (year - startYear) * 12 + monthIdx - startMonth;
              const inRange = absMonth >= 0 && absMonth < total;
              const isPaid = inRange && absMonth < paid;
              if (!inRange) return <div key={monthIdx} style={{ width: SQ, height: SQ }} />;

              // Monochrome intensity — white increases with progress
              const intensity = isPaid ? 0.55 + (absMonth / Math.max(paid, 1)) * 0.4 : 0.04;
              const bg = isPaid
                ? `rgba(250, 250, 247, ${intensity.toFixed(2)})`
                : 'rgba(255,255,255,0.03)';

              return (
                <div key={monthIdx}
                  title={`${MONTHS[monthIdx]} ${year} — ${isPaid ? "Paid" : "Upcoming"}`}
                  style={{
                    width: SQ, height: SQ, borderRadius: 2, background: bg,
                    transition: "background 300ms ease",
                  }}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Buttons ───────────────────────────────────────────────────────────────
const btnBase = {
  fontFamily: T.font, fontSize: 13,
  padding: '10px 16px', borderRadius: T.r2, cursor: 'pointer',
  border: `1px solid ${T.line}`, background: 'transparent', color: T.text,
  transition: 'background 200ms ease, border-color 200ms ease, transform 120ms ease, color 200ms ease',
  display: 'inline-flex', alignItems: 'center', gap: 8,
  letterSpacing: '-0.005em',
};
const btnPrimary = {
  ...btnBase,
  background: T.accent, color: T.accentInk,
  border: `1px solid ${T.accent}`,
  fontWeight: 500,
};
const btnGhost = { ...btnBase, color: T.secondary };

function PayButton({ onClick, disabled, justPaid }) {
  const base = justPaid
    ? { ...btnBase, color: T.heading, borderColor: T.lineHi }
    : disabled
    ? { ...btnBase, color: T.darkMuted, cursor: 'default', borderColor: T.line }
    : btnPrimary;
  return (
    <button onClick={onClick} disabled={disabled} style={base}>
      {justPaid ? (
        <>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M3 7.5L6 10.5L11 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Recorded
        </>
      ) : disabled ? (
        <>Cleared</>
      ) : (
        <>Pay</>
      )}
    </button>
  );
}

function UndoButton({ onClick }) {
  return (
    <button onClick={onClick} style={btnGhost}>
      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
        <path d="M3 5h5.5a3 3 0 010 6H7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5.5 2.5L3 5l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Undo last
    </button>
  );
}

// ── Stat block — typography carries the weight ────────────────────────────
function Stat({ value, label, sub, prefix = '', mono = false, tone = 'heading' }) {
  const color = tone === 'warn' ? T.warn : tone === 'danger' ? T.danger : T.heading;
  return (
    <div style={{
      padding: '20px 4px',
      borderTop: `1px solid ${T.line}`,
    }}>
      <div className="tnum" style={{
        fontSize: 38, fontWeight: 300, letterSpacing: '-0.028em',
        color, fontFamily: mono ? T.mono : T.display, lineHeight: 1,
      }}>
        {typeof value === 'number' ? <AnimatedNumber value={value} prefix={prefix} /> : value}
      </div>
      <div style={{ ...labelStyle, marginTop: 10 }}>{label}</div>
      {sub && (
        <div style={{
          fontSize: 12.5, color: T.secondary, marginTop: 6,
          lineHeight: 1.5, letterSpacing: '-0.005em',
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Main
// ═══════════════════════════════════════════════════════════════════════════

export default function FinancialDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [justPaidId, setJustPaidId] = useState(null);
  const [history, setHistory] = useState([]);
  const [customAmounts, setCustomAmounts] = useState({});

  useEffect(() => {
    fetch("/api/app/debt")
      .then(r => r.json())
      .then(data => { setLoans(data.loans || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const totalDebt = loans.reduce((s, l) => s + l.remaining, 0);
  const totalMonthly = loans.reduce((s, l) => s + l.monthly, 0);
  const totalBorrowed = loans.reduce((s, l) => s + l.borrowed, 0);
  const totalInstallments = loans.reduce((s, l) => s + l.totalInstallments, 0);
  const totalInstallmentsPaid = loans.reduce((s, l) => s + l.installmentsPaid, 0);
  const pctPaid = totalInstallments ? (totalInstallmentsPaid / totalInstallments) * 100 : 0;
  const living = INCOME - totalMonthly - FAMILY;
  const dsr = INCOME ? (totalMonthly / INCOME) * 100 : 0;

  const payInstallment = async (id, customAmount = null) => {
    const loan = loans.find(l => l.id === id);
    if (!loan || loan.installmentsPaid >= loan.totalInstallments) return;

    const payAmount = (customAmount != null && !isNaN(parseFloat(customAmount)) && parseFloat(customAmount) > 0)
      ? parseFloat(customAmount)
      : loan.monthly;

    const interest = loan.remaining * (loan.apr / 100 / 12);
    const principal = Math.max(payAmount - interest, 0);
    const previous = { installmentsPaid: loan.installmentsPaid, paid: loan.paid, remaining: loan.remaining };

    setLoans(prev => prev.map(l => l.id === id
      ? { ...l, installmentsPaid: l.installmentsPaid + 1, paid: Math.round((l.paid + payAmount) * 100) / 100, remaining: Math.max(Math.round((l.remaining - principal) * 100) / 100, 0) }
      : l
    ));
    setJustPaidId(id);

    const res = await fetch("/api/app/debt", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pay", loanId: id, amount: payAmount }),
    });
    const data = await res.json();
    if (data.ok) {
      setHistory(prev => [...prev, { loanId: id, previous: data.previous }]);
    } else {
      setLoans(prev => prev.map(l => l.id === id ? { ...l, ...previous } : l));
    }
  };

  useEffect(() => {
    if (justPaidId === null) return;
    const t = setTimeout(() => setJustPaidId(null), 1600);
    return () => clearTimeout(t);
  }, [justPaidId]);

  const undoLast = async () => {
    if (!history.length) return;
    const last = history[history.length - 1];
    const { loanId, previous } = last;
    setLoans(prev => prev.map(l => l.id === loanId ? { ...l, ...previous } : l));
    setHistory(h => h.slice(0, -1));
    await fetch("/api/app/debt", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "undo", loanId, previous }),
    });
  };

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "loans", label: "Loans" },
    { id: "cashflow", label: "Cashflow" },
    { id: "action", label: "Action plan" },
  ];

  if (loading) {
    return (
      <div style={{
        fontFamily: T.font, background: T.bg, color: T.muted,
        minHeight: "100vh", display: "flex",
        alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ ...labelStyle, fontSize: 12 }}>Loading</div>
      </div>
    );
  }

  // Header — dated eyebrow + display heading
  const now = new Date();
  const dayWords = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const monthWords = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const todayLabel = `${dayWords[now.getDay()]}, ${monthWords[now.getMonth()]} ${now.getDate()}`;

  return (
    <div style={{
      fontFamily: T.font,
      background: T.bg,
      color: T.text,
      minHeight: "100vh",
      paddingBottom: 80,
    }}>
      <style>{`
        html, body { background: ${T.bg}; }
        body { margin: 0; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        * { box-sizing: border-box; }

        .tnum { font-variant-numeric: tabular-nums; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }

        .pulse-dot {
          animation: pulse 2.6s ease-in-out infinite;
        }

        .tab-btn {
          position: relative;
          background: none;
          border: none;
          padding: 12px 4px;
          margin-right: 28px;
          font-family: ${T.font};
          font-size: 14px;
          color: ${T.muted};
          cursor: pointer;
          letter-spacing: -0.005em;
          transition: color 200ms ease;
        }
        .tab-btn:hover { color: ${T.text}; }
        .tab-btn.active { color: ${T.heading}; }
        .tab-btn::after {
          content: '';
          position: absolute;
          left: 0; right: 0; bottom: -1px;
          height: 1px;
          background: ${T.accent};
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .tab-btn.active::after { transform: scaleX(1); }

        button { transition: background 200ms ease, border-color 200ms ease, transform 120ms ease, color 200ms ease; }
        button:not(:disabled):hover { background: rgba(255,255,255,0.045); }
        button:not(:disabled):active { transform: scale(0.98); }

        input, textarea {
          font-family: inherit;
          transition: border-color 200ms ease, background 200ms ease;
        }
        input::placeholder { color: ${T.darkMuted}; }

        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.line}; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: ${T.lineHi}; }

        @media (prefers-reduced-motion: reduce) {
          *, ::before, ::after {
            animation-duration: 0.001ms !important;
            transition-duration: 0.001ms !important;
          }
        }

        .wrap {
          max-width: 920px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .header {
          padding-top: 48px;
          padding-bottom: 24px;
        }

        .tabs {
          display: flex;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border-bottom: 1px solid ${T.line};
          margin-bottom: 40px;
          position: sticky;
          top: 0;
          z-index: 10;
          background: ${T.bg};
          padding: 12px 0 0;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
          margin-bottom: 48px;
        }
        .two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 40px;
        }

        .loan-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-top: 18px;
          margin-bottom: 18px;
        }
        .loan-stats.has-revolving {
          grid-template-columns: 1fr 1fr 1fr;
        }

        .heatmap-row {
          display: flex;
          align-items: flex-end;
          gap: 32px;
        }

        .apr-row {
          display: grid;
          grid-template-columns: 140px 1fr;
          gap: 16px;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,0.03);
        }
        .apr-row:last-child { border-bottom: none; }

        @media (max-width: 720px) {
          .wrap { padding: 0 18px; }
          .header { padding-top: 32px; }
          .metrics-grid { grid-template-columns: 1fr; gap: 0; }
          .metrics-grid > * { border-top: 1px solid ${T.line}; }
          .two-col { grid-template-columns: 1fr; }
          .loan-stats, .loan-stats.has-revolving { grid-template-columns: 1fr; gap: 10px; }
          .heatmap-row { flex-direction: column; align-items: stretch; gap: 20px; }
          .tab-btn { margin-right: 18px; font-size: 13.5px; }
          .apr-row { grid-template-columns: 110px 1fr; }
        }
      `}</style>

      <div className="wrap header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <span className="pulse-dot" style={{
            display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
            background: T.accent,
          }} />
          <span style={labelStyle}>{todayLabel}</span>
        </div>
        <h1 style={{
          fontFamily: T.display,
          fontSize: 'clamp(36px, 5.5vw, 52px)',
          fontWeight: 300,
          letterSpacing: '-0.022em',
          color: T.heading,
          lineHeight: 1.05,
          margin: 0,
        }}>
          Clear the balance.
        </h1>
        <p style={{
          fontSize: 15.5, color: T.secondary,
          lineHeight: 1.55, letterSpacing: '-0.005em',
          marginTop: 14, maxWidth: 520,
        }}>
          <span className="tnum">${fmtShort(totalDebt)}</span> remaining across{' '}
          <span className="tnum">{loans.length}</span> loans.
          Pay what you can, watch it shrink.
        </p>
      </div>

      <div className="wrap">
        <div className="tabs">
          {tabs.map(t => (
            <button
              key={t.id}
              className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══ OVERVIEW ═══ */}
        {activeTab === "overview" && (
          <div style={{ animation: 'fadeUp 420ms cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
            {/* Stats row — typography, hairline rule */}
            <div className="metrics-grid">
              <Stat
                value={INCOME}
                prefix="$"
                label="Monthly income"
                sub="Before tax."
                mono
              />
              <Stat
                value={totalDebt}
                prefix="$"
                label="Remaining debt"
                sub={`${pctPaid.toFixed(0)}% paid down.`}
                mono
              />
              <Stat
                value={totalBorrowed}
                prefix="$"
                label="Total borrowed"
                sub="Lifetime principal."
                mono
              />
            </div>

            {/* DSR + Cashflow */}
            <div className="two-col">
              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <ProgressRing
                    percent={dsr}
                    color={dsr > 40 ? T.danger : T.accent}
                    labelTop="DSR"
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: T.display, fontSize: 18, fontWeight: 400,
                      letterSpacing: '-0.01em', color: T.heading,
                      marginBottom: 6,
                    }}>
                      Debt servicing ratio
                    </div>
                    <div style={{
                      fontSize: 13, color: T.secondary,
                      lineHeight: 1.55, letterSpacing: '-0.005em',
                    }}>
                      {dsr > 40 ? 'Above the 40% high-risk line.' : 'Within safe range.'}
                    </div>
                    <div style={{
                      marginTop: 16,
                      height: 2, background: T.line, borderRadius: 2,
                      position: 'relative', overflow: 'hidden',
                    }}>
                      <div style={{
                        position: 'absolute',
                        left: '40%', top: -3, bottom: -3,
                        width: 1, background: T.warn, opacity: 0.8,
                      }} />
                      <div style={{
                        width: `${Math.min(dsr, 100)}%`,
                        height: '100%',
                        background: dsr > 40 ? T.danger : T.accent,
                        transition: 'width 800ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                      }} />
                    </div>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      fontSize: 10, color: T.muted, marginTop: 6,
                      fontFamily: T.mono, letterSpacing: '0.04em',
                    }}>
                      <span>0%</span>
                      <span style={{ color: T.warn }}>40%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={cardStyle}>
                <div style={{
                  fontFamily: T.display, fontSize: 18, fontWeight: 400,
                  letterSpacing: '-0.01em', color: T.heading,
                  marginBottom: 18,
                }}>
                  Monthly cashflow
                </div>
                {[
                  { label: 'Loan payments', value: totalMonthly, color: T.warn },
                  { label: 'Family support', value: FAMILY, color: T.secondary },
                  { label: 'Left for living', value: Math.max(living, 0), color: T.good },
                ].map((item, i) => {
                  const pct = Math.round((item.value / INCOME) * 100);
                  return (
                    <div key={i} style={{ marginBottom: i < 2 ? 14 : 0 }}>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        fontSize: 12.5, marginBottom: 6,
                        letterSpacing: '-0.005em',
                      }}>
                        <span style={{ color: T.secondary }}>{item.label}</span>
                        <span className="tnum" style={{
                          fontFamily: T.mono, color: T.text,
                        }}>
                          ${item.value.toLocaleString()} <span style={{ color: T.muted }}>· {pct}%</span>
                        </span>
                      </div>
                      <div style={{ height: 2, background: T.line, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          width: `${pct}%`, height: '100%',
                          background: item.color, borderRadius: 2,
                          transition: 'width 800ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* APR comparison — minimal bars */}
            <div style={cardStyle}>
              <div style={{
                fontFamily: T.display, fontSize: 18, fontWeight: 400,
                letterSpacing: '-0.01em', color: T.heading,
                marginBottom: 4,
              }}>
                Rates, highest first
              </div>
              <div style={{
                fontSize: 12.5, color: T.secondary,
                letterSpacing: '-0.005em', marginBottom: 18,
              }}>
                Always pay the most expensive debt first.
              </div>
              {[...loans].sort((a, b) => b.apr - a.apr).map((loan, i) => {
                const maxApr = Math.max(...loans.map(l => l.apr));
                const pct = (loan.apr / maxApr) * 100;
                return (
                  <div key={loan.id} className="apr-row">
                    <div style={{
                      fontSize: 13, color: T.text,
                      letterSpacing: '-0.005em',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {loan.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        flex: 1, height: 2, background: T.line,
                        borderRadius: 2, overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${pct}%`, height: '100%',
                          background: loan.apr >= 30 ? T.danger : loan.apr >= 15 ? T.warn : T.accent,
                          opacity: 0.85,
                          transition: 'width 800ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                        }} />
                      </div>
                      <span className="tnum" style={{
                        fontFamily: T.mono, fontSize: 13,
                        color: T.heading, minWidth: 48, textAlign: 'right',
                      }}>
                        {loan.apr}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ LOANS ═══ */}
        {activeTab === "loans" && (
          <div style={{ animation: 'fadeUp 420ms cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
            {history.length > 0 && (
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: 16, padding: "12px 16px",
                background: T.surface, border: `1px solid ${T.line}`,
                borderRadius: T.r2,
              }}>
                <span style={{ fontSize: 13, color: T.secondary, letterSpacing: '-0.005em' }}>
                  <span className="tnum" style={{
                    fontFamily: T.mono, color: T.heading,
                  }}>
                    {history.length}
                  </span>
                  {' '}payment{history.length > 1 ? "s" : ""} recorded this session
                </span>
                <UndoButton onClick={undoLast} />
              </div>
            )}

            {loans.map((loan) => {
              const isFullyPaid = loan.installmentsPaid >= loan.totalInstallments || loan.remaining <= 0;
              const wasJustPaid = justPaidId === loan.id;
              const monthsLeft = loan.totalInstallments - loan.installmentsPaid;

              return (
                <div key={loan.id}
                  style={{
                    ...cardStyle,
                    marginBottom: 12,
                    transition: "background 400ms ease, border-color 400ms ease",
                    background: wasJustPaid ? T.surfaceHi : T.surface,
                  }}>

                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", gap: 16,
                  }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                      }}>
                        <span style={{
                          fontFamily: T.display, fontSize: 18, fontWeight: 400,
                          letterSpacing: '-0.01em', color: T.heading,
                        }}>
                          {loan.name}
                        </span>
                        {loan.revolving && !isFullyPaid && (
                          <span style={{
                            ...labelStyle,
                            fontSize: 10, padding: '3px 8px',
                            border: `1px solid ${T.lineHi}`, borderRadius: T.rPill,
                            color: T.warn,
                          }}>
                            Revolving
                          </span>
                        )}
                        {isFullyPaid && (
                          <span style={{
                            ...labelStyle,
                            fontSize: 10, padding: '3px 8px',
                            border: `1px solid ${T.lineHi}`, borderRadius: T.rPill,
                            color: T.good,
                          }}>
                            Cleared
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: 12.5, color: T.muted, marginTop: 6,
                        fontFamily: T.mono, letterSpacing: '-0.005em',
                      }}>
                        {loan.apr}% APR · {isFullyPaid ? 'fully paid' : `${monthsLeft} month${monthsLeft !== 1 ? 's' : ''} left`}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div className="tnum" style={{
                        fontFamily: T.display, fontSize: 26, fontWeight: 300,
                        letterSpacing: '-0.02em',
                        color: isFullyPaid ? T.good : T.heading,
                        lineHeight: 1,
                      }}>
                        <AnimatedNumber value={loan.remaining} prefix="$" />
                      </div>
                      <div style={{
                        ...labelStyle, fontSize: 10, marginTop: 6,
                      }}>
                        {isFullyPaid ? 'Cleared' : 'Remaining'}
                      </div>
                    </div>
                  </div>

                  <div className={`loan-stats${loan.revolving && loan.interestPaid ? ' has-revolving' : ''}`}>
                    <div>
                      <div style={{ ...labelStyle, fontSize: 10, marginBottom: 4 }}>Monthly</div>
                      <div className="tnum" style={{
                        fontFamily: T.mono, fontSize: 15,
                        color: T.text,
                      }}>
                        ${loan.monthly.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ ...labelStyle, fontSize: 10, marginBottom: 4 }}>Paid</div>
                      <div className="tnum" style={{
                        fontFamily: T.mono, fontSize: 15,
                        color: T.text,
                      }}>
                        <AnimatedNumber value={loan.paid} prefix="$" />
                      </div>
                    </div>
                    {loan.revolving && loan.interestPaid != null && (
                      <div>
                        <div style={{ ...labelStyle, fontSize: 10, marginBottom: 4 }}>
                          Interest paid
                        </div>
                        <div className="tnum" style={{
                          fontFamily: T.mono, fontSize: 15,
                          color: T.danger,
                        }}>
                          ${loan.interestPaid.toLocaleString()}
                        </div>
                        <div style={{ fontSize: 10.5, color: T.muted, marginTop: 2, fontFamily: T.mono }}>
                          {Math.round(loan.interestPaid / loan.paid * 100)}% of payments
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ paddingTop: 18, borderTop: `1px solid ${T.line}` }}>
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      alignItems: "center", marginBottom: 14,
                      fontSize: 12.5, color: T.muted,
                      letterSpacing: '-0.005em',
                    }}>
                      <span>
                        {isFullyPaid
                          ? 'All installments complete'
                          : <>Next: <span style={{ color: T.text }}>#{loan.installmentsPaid + 1}</span> · ${loan.monthly.toLocaleString()}</>}
                      </span>
                      <span className="tnum" style={{ fontFamily: T.mono, color: T.darkMuted }}>
                        {loan.installmentsPaid}/{loan.totalInstallments}
                      </span>
                    </div>
                    <div className="heatmap-row">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <CalendarHeatmap
                          paid={loan.installmentsPaid}
                          total={loan.totalInstallments}
                          startYear={loan.startYear}
                          startMonth={loan.startMonth}
                        />
                      </div>
                      <div style={{
                        flexShrink: 0,
                        display: "flex", alignItems: "center", gap: 8,
                      }}>
                        {loan.name === "X Wallet 80K" && !isFullyPaid && (
                          <div style={{
                            display: "flex", alignItems: "center", gap: 4,
                            background: 'transparent',
                            border: `1px solid ${T.line}`,
                            borderRadius: T.r2, padding: "8px 12px",
                          }}>
                            <span style={{
                              fontSize: 12, color: T.muted, fontFamily: T.mono,
                            }}>$</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              placeholder={loan.monthly.toLocaleString()}
                              value={customAmounts[loan.id] ?? ""}
                              onChange={(e) => setCustomAmounts(prev => ({ ...prev, [loan.id]: e.target.value }))}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: 90, background: "transparent", border: "none", outline: "none",
                                color: T.text, fontSize: 13, fontFamily: T.mono,
                                padding: 0,
                              }}
                            />
                          </div>
                        )}
                        <PayButton
                          onClick={() => {
                            const amt = customAmounts[loan.id];
                            payInstallment(loan.id, amt && amt.trim() !== "" ? amt : null);
                            setCustomAmounts(prev => ({ ...prev, [loan.id]: "" }));
                          }}
                          disabled={isFullyPaid}
                          justPaid={wasJustPaid}
                        />
                      </div>
                    </div>
                  </div>

                  {loan.revolving && !isFullyPaid && (
                    <div style={{
                      marginTop: 16,
                      padding: "12px 14px",
                      background: 'transparent',
                      borderLeft: `2px solid ${loan.interestPaid ? T.danger : T.warn}`,
                      fontSize: 12.5, color: T.secondary,
                      lineHeight: 1.6, letterSpacing: '-0.005em',
                    }}>
                      {loan.interestPaid ? (
                        <>
                          Revolving at {loan.apr}% APR. Avg payment was{' '}
                          <span className="tnum" style={{ fontFamily: T.mono, color: T.text }}>
                            ${loan.avgPayment.toLocaleString()}/mo
                          </span>
                          {' '}but only{' '}
                          <span className="tnum" style={{ fontFamily: T.mono, color: T.text }}>
                            ${loan.principalPaid.toLocaleString()}
                          </span>
                          {' '}went to principal. Now paying{' '}
                          <span className="tnum" style={{ fontFamily: T.mono, color: T.heading }}>
                            ${loan.monthly.toLocaleString()}/mo
                          </span>
                          {' '}to clear in {monthsLeft} months.
                        </>
                      ) : (
                        <>
                          Revolving credit — no fixed term, but {loan.apr}% APR compounds monthly.
                          {loan.apr >= 30 ? ' Highest priority.' : ' Clear early to save.'}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{
              ...cardStyle,
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: '18px 20px',
            }}>
              <span style={{ fontSize: 13.5, color: T.secondary, letterSpacing: '-0.005em' }}>
                Total monthly loan payments
              </span>
              <span className="tnum" style={{
                fontFamily: T.display, fontSize: 24, fontWeight: 300,
                letterSpacing: '-0.02em', color: T.heading,
              }}>
                <AnimatedNumber value={totalMonthly} prefix="$" />
              </span>
            </div>
          </div>
        )}

        {/* ═══ CASHFLOW ═══ */}
        {activeTab === "cashflow" && (
          <div style={{ animation: 'fadeUp 420ms cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
            {/* Allocation bar */}
            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <div style={{
                fontFamily: T.display, fontSize: 18, fontWeight: 400,
                letterSpacing: '-0.01em', color: T.heading,
              }}>
                Income allocation
              </div>
              <div style={{
                fontSize: 12.5, color: T.secondary,
                letterSpacing: '-0.005em', marginTop: 4,
              }}>
                Where every{' '}
                <span className="tnum" style={{ fontFamily: T.mono }}>
                  ${INCOME.toLocaleString()}
                </span>
                {' '}lands each month.
              </div>
              <div style={{
                display: "flex", borderRadius: T.r1, overflow: "hidden",
                height: 4, gap: 2, marginTop: 22,
              }}>
                {[
                  { value: totalMonthly, color: T.warn },
                  { value: FAMILY, color: T.secondary },
                  { value: Math.max(living, 0), color: T.good },
                ].map((d, i) => (
                  <div key={i} style={{
                    width: `${(d.value / INCOME) * 100}%`, background: d.color,
                    transition: "width 800ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                  }} />
                ))}
              </div>
              <div style={{
                display: "flex", flexWrap: "wrap", gap: "10px 28px",
                marginTop: 18,
              }}>
                {[
                  { label: 'Loans', value: totalMonthly, color: T.warn },
                  { label: 'Family', value: FAMILY, color: T.secondary },
                  { label: 'Living', value: Math.max(living, 0), color: T.good },
                ].map((item, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    fontSize: 12.5, letterSpacing: '-0.005em',
                  }}>
                    <div style={{ width: 8, height: 2, background: item.color }} />
                    <span style={{ color: T.secondary }}>{item.label}</span>
                    <span className="tnum" style={{ fontFamily: T.mono, color: T.text }}>
                      ${item.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Breakdown */}
            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <div style={{
                fontFamily: T.display, fontSize: 18, fontWeight: 400,
                letterSpacing: '-0.01em', color: T.heading, marginBottom: 18,
              }}>
                Monthly breakdown
              </div>
              {[
                { label: "Income", value: INCOME, type: "income" },
                ...loans.map(l => ({ label: l.name, value: -l.monthly, type: "expense" })),
                { label: "Family support", value: -FAMILY, type: "expense" },
              ].map((item, i, arr) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "12px 0", borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                }}>
                  <span style={{ fontSize: 13.5, color: T.text, letterSpacing: '-0.005em' }}>
                    {item.label}
                  </span>
                  <span className="tnum" style={{
                    fontFamily: T.mono, fontSize: 13.5,
                    color: item.type === "income" ? T.good : T.text,
                  }}>
                    {item.type === "income" ? "+" : "−"}${Math.abs(item.value).toLocaleString()}
                  </span>
                </div>
              ))}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                paddingTop: 18, marginTop: 10, borderTop: `1px solid ${T.lineHi}`,
              }}>
                <span style={{ ...labelStyle }}>Left for living</span>
                <span className="tnum" style={{
                  fontFamily: T.display, fontSize: 26, fontWeight: 300,
                  letterSpacing: '-0.02em',
                  color: living < 10000 ? T.danger : living < 12000 ? T.warn : T.heading,
                }}>
                  <AnimatedNumber value={Math.max(living, 0)} prefix="$" />
                </span>
              </div>
            </div>

            <div style={{
              ...cardStyle,
              borderLeft: `2px solid ${T.good}`,
            }}>
              <div style={{
                fontFamily: T.display, fontSize: 16, fontWeight: 400,
                letterSpacing: '-0.01em', color: T.heading, marginBottom: 6,
              }}>
                After 2029
              </div>
              <div style={{
                fontSize: 13, color: T.secondary,
                lineHeight: 1.55, letterSpacing: '-0.005em',
              }}>
                You'll free up{' '}
                <span className="tnum" style={{ fontFamily: T.mono, color: T.heading }}>
                  ${totalMonthly.toLocaleString()}/mo
                </span>
                {' '}currently going to loans.
              </div>
            </div>
          </div>
        )}

        {/* ═══ ACTION PLAN ═══ */}
        {activeTab === "action" && (
          <div style={{ animation: 'fadeUp 420ms cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
            {[
              { priority: "Urgent",  tone: T.danger, title: "Keep $4,552/mo on X Wallet 80K", desc: "86% of past payments went to interest at 39% APR. Catch-up plan clears it in 24 months; $34,196 in interest remains.", timeline: "24 months" },
              { priority: "High",    tone: T.warn,   title: "Consider partial Pokémon liquidation", desc: "Sell ~$75k (4.5% of portfolio) to clear X Wallet 80K immediately. Saves ~$34k in future interest.", timeline: "Within 1 month" },
              { priority: "Medium",  tone: T.accent, title: "Clear X Wallet 30K next", desc: "Also revolving at 18% APR. Redirect the freed cash once 80K is done.", timeline: "3–6 months" },
              { priority: "Ongoing", tone: T.secondary, title: "Avalanche the remaining three", desc: "Standard Chartered (8%) → Mox (5%) → BOCHK (4%).", timeline: "6–36 months" },
              { priority: "Goal",    tone: T.good,   title: "Debt-free by 2029", desc: "$20k+/mo freed up for MPF, index funds, emergency fund, life.", timeline: "~2029" },
            ].map((item, i) => (
              <div key={i} style={{
                ...cardStyle,
                marginBottom: 12,
                display: "flex", gap: 24,
                alignItems: "flex-start",
              }}>
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "flex-start",
                  gap: 8, minWidth: 80, flexShrink: 0,
                }}>
                  <div className="tnum" style={{
                    fontFamily: T.display, fontSize: 28, fontWeight: 300,
                    letterSpacing: '-0.02em', color: T.heading, lineHeight: 1,
                  }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div style={{ ...labelStyle, fontSize: 10, color: item.tone }}>
                    {item.priority}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: T.display, fontSize: 17, fontWeight: 400,
                    letterSpacing: '-0.01em', color: T.heading,
                    marginBottom: 8,
                  }}>
                    {item.title}
                  </div>
                  <div style={{
                    fontSize: 13.5, color: T.secondary,
                    lineHeight: 1.6, letterSpacing: '-0.005em',
                    marginBottom: 10,
                  }}>
                    {item.desc}
                  </div>
                  <div style={{
                    fontSize: 11, color: T.muted,
                    fontFamily: T.mono, letterSpacing: '0.04em',
                  }}>
                    {item.timeline}
                  </div>
                </div>
              </div>
            ))}

            <div style={{
              ...cardStyle,
              marginTop: 8,
              borderLeft: `2px solid ${T.good}`,
            }}>
              <div style={{
                fontFamily: T.display, fontSize: 17, fontWeight: 400,
                letterSpacing: '-0.01em', color: T.heading, marginBottom: 18,
              }}>
                Scenario: sell $75k of Pokémon now
              </div>
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16,
              }}>
                {[
                  { label: "Interest saved",   value: "$34,196",  tone: T.good },
                  { label: "Portfolio impact", value: "−4.5%",    tone: T.warn },
                  { label: "Monthly freed",    value: "+$4,552", tone: T.good },
                ].map((s, i) => (
                  <div key={i} style={{
                    paddingTop: 14,
                    borderTop: `1px solid ${T.line}`,
                  }}>
                    <div style={{ ...labelStyle, fontSize: 10 }}>{s.label}</div>
                    <div className="tnum" style={{
                      fontFamily: T.display, fontSize: 22, fontWeight: 300,
                      letterSpacing: '-0.02em', color: s.tone,
                      marginTop: 8, lineHeight: 1,
                    }}>
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
