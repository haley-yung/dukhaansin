import { useState, useEffect, useRef } from "react";

const INCOME = 42000;
const FAMILY = 11000;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function AnimatedNumber({ value, prefix = "", duration = 800 }) {
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
  }, [value]);
  return <span>{prefix}{Math.round(display).toLocaleString()}</span>;
}

function ProgressRing({ percent, size = 120, stroke = 10, color = "#EF4444", label }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ - (Math.min(percent, 100) / 100) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", color }}>{percent.toFixed(1)}%</div>
        {label && <div style={{ fontSize: 10, color: "#6B6B76", textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{label}</div>}
      </div>
    </div>
  );
}

function CalendarHeatmap({ paid, total, color, startYear, startMonth, justPaid }) {
  const SQ = 16;
  const GAP = 4;
  const endMonth = startMonth + total - 1;
  const endYear = startYear + Math.floor(endMonth / 12);
  const years = [];
  for (let y = startYear; y <= endYear; y++) years.push(y);

  return (
    <div style={{ overflowX: "auto" }}>
      {/* Month headers */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 6, minWidth: "fit-content" }}>
        <div style={{ width: 36, flexShrink: 0 }} />
        <div style={{ display: "grid", gridTemplateColumns: `repeat(12, ${SQ}px)`, gap: GAP }}>
          {MONTHS.map((m, i) => (
            <div key={i} style={{ fontSize: 9, color: "#4A4A52", textAlign: "center", fontFamily: "'JetBrains Mono', monospace", width: SQ }}>{m}</div>
          ))}
        </div>
      </div>
      {/* Year rows */}
      {years.map(year => (
        <div key={year} style={{ display: "flex", alignItems: "center", marginBottom: GAP }}>
          <div style={{ width: 36, flexShrink: 0, fontSize: 10, color: "#4A4A52", fontFamily: "'JetBrains Mono', monospace" }}>{year}</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(12, ${SQ}px)`, gap: GAP }}>
            {Array.from({ length: 12 }, (_, monthIdx) => {
              const absMonth = (year - startYear) * 12 + monthIdx - startMonth;
              const isInRange = absMonth >= 0 && absMonth < total;
              const isPaid = isInRange && absMonth < paid;
              const isLatest = isInRange && absMonth === paid - 1 && justPaid;

              if (!isInRange) {
                return <div key={monthIdx} style={{ width: SQ, height: SQ }} />;
              }

              let bg = "rgba(255,255,255,0.04)";
              if (isPaid) {
                const r = parseInt(color.slice(1,3), 16);
                const g = parseInt(color.slice(3,5), 16);
                const b = parseInt(color.slice(5,7), 16);
                const intensity = 0.25 + (absMonth / Math.max(paid, 1)) * 0.75;
                bg = `rgba(${r},${g},${b},${(intensity * 0.65 + 0.2).toFixed(2)})`;
              }

              return (
                <div key={monthIdx} title={`${MONTHS[monthIdx]} ${year} — ${isPaid ? "Paid" : "Upcoming"} (#${absMonth + 1})`}
                  style={{
                    width: SQ, height: SQ, borderRadius: 3, background: bg,
                    transition: "all 0.3s ease",
                    boxShadow: isLatest ? `0 0 10px ${color}80` : "none",
                    transform: isLatest ? "scale(1.2)" : "scale(1)",
                    border: isLatest ? `1px solid ${color}` : "1px solid transparent",
                  }} />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function PayButton({ onClick, disabled, justPaid }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 18px", borderRadius: 8, border: "none", cursor: disabled ? "default" : "pointer",
        background: justPaid ? "rgba(16,185,129,0.15)" : disabled ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)",
        color: justPaid ? "#6EE7B7" : disabled ? "#3A3A42" : "#E8E6E1",
        fontSize: 13, fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
        transition: "all 0.3s ease", opacity: disabled ? 0.5 : 1,
        transform: justPaid ? "scale(1.02)" : "scale(1)",
        whiteSpace: "nowrap", flexShrink: 0,
      }}>
      {justPaid ? (
        <><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.5 12L13 4" stroke="#6EE7B7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Paid!</>
      ) : disabled ? (
        <><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.5 12L13 4" stroke="#3A3A42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Fully paid</>
      ) : (
        <><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2"/><path d="M5 8h6M8 5v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>Pay installment</>
      )}
    </button>
  );
}

function UndoButton({ onClick }) {
  return (
    <button onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 8, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.04)", color: "#8B8B96", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 5h5.5a3 3 0 010 6H7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M5.5 2.5L3 5l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
      Undo last
    </button>
  );
}

export default function FinancialDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [justPaidId, setJustPaidId] = useState(null);
  const [history, setHistory] = useState([]); // stores { loanId, previous } for undo

  // Fetch loans from API on mount
  useEffect(() => {
    fetch("/api/app/debt/loans")
      .then(r => r.json())
      .then(data => { setLoans(data.loans); setLoading(false); })
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

  const payInstallment = async (id) => {
    // Optimistically update UI
    const loan = loans.find(l => l.id === id);
    if (!loan || loan.installmentsPaid >= loan.totalInstallments) return;

    const interest = loan.remaining * (loan.apr / 100 / 12);
    const principal = Math.max(loan.monthly - interest, 0);
    const previous = { installmentsPaid: loan.installmentsPaid, paid: loan.paid, remaining: loan.remaining };

    setLoans(prev => prev.map(l => {
      if (l.id !== id) return l;
      return { ...l, installmentsPaid: l.installmentsPaid + 1, paid: Math.round((l.paid + l.monthly) * 100) / 100, remaining: Math.max(Math.round((l.remaining - principal) * 100) / 100, 0) };
    }));
    setJustPaidId(id);

    // Persist to API
    const res = await fetch(`/api/app/debt/loans/${id}/pay`, { method: "PUT" });
    const data = await res.json();
    if (data.ok) {
      setHistory(prev => [...prev, { loanId: id, previous: data.previous }]);
    } else {
      // Revert on failure
      setLoans(prev => prev.map(l => l.id === id ? { ...l, ...previous } : l));
    }
  };

  useEffect(() => {
    if (justPaidId === null) return;
    const timer = setTimeout(() => setJustPaidId(null), 1800);
    return () => clearTimeout(timer);
  }, [justPaidId]);

  const undoLast = async () => {
    if (!history.length) return;
    const last = history[history.length - 1];
    const { loanId, previous } = last;

    // Optimistically revert UI
    setLoans(prev => prev.map(l => l.id === loanId ? { ...l, ...previous } : l));
    setHistory(h => h.slice(0, -1));

    // Persist undo to API
    await fetch(`/api/app/debt/loans/${loanId}/undo`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(previous),
    });
  };

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "loans", label: "Loans" },
    { id: "cashflow", label: "Cash flow" },
    { id: "action", label: "Action plan" },
  ];

  if (loading) {
    return (
      <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#0A0A0F", color: "#6B6B76", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 14, letterSpacing: 2, textTransform: "uppercase" }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", background: "#0A0A0F", color: "#E8E6E1", minHeight: "100vh", padding: "0 0 40px" }}>

      <div className="page-pad" style={{ paddingTop: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <h1 style={{ fontSize: 28, fontWeight: 300, margin: 0, letterSpacing: -0.5, color: "#F5F5F0" }}>Debt Overview</h1>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "#6B6B76" }}>Last updated</div>
          <div style={{ fontSize: 14, fontFamily: "'JetBrains Mono', monospace", color: "#8B8B96" }}>31 Mar 2026</div>
        </div>
      </div>

      <div className="page-pad" style={{ marginTop: 20, marginBottom: 20, padding: "14px 18px", background: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#F59E0B", boxShadow: "0 0 12px rgba(245,158,11,0.6)", flexShrink: 0 }} />
        <div style={{ fontSize: 13, color: "#FCD34D", lineHeight: 1.5 }}>
          <strong style={{ color: "#FDE68A" }}>X Wallet #1: 86% of payments went to interest</strong> — Of $35,317 paid over 12 months, only $4,939 reduced the principal. Now paying $4,552/mo to clear in 24 months.
        </div>
      </div>

      <div className="page-pad" style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className="tab-btn" style={{ padding: "10px 18px", fontSize: 13, fontWeight: activeTab === t.id ? 500 : 400, color: activeTab === t.id ? "#F5F5F0" : "#6B6B76", background: "none", border: "none", borderBottom: activeTab === t.id ? "2px solid #E8E6E1" : "2px solid transparent", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="page-pad">

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            {/* Top row: 3 metrics + circle chart */}
            <div className="metrics-grid">
              {[
                { label: "Monthly income", value: INCOME, prefix: "$", color: "#E8E6E1" },
                { label: "Remaining debt", value: totalDebt, prefix: "$", color: "#EF4444" },
                { label: "Total borrowed", value: totalBorrowed, prefix: "$", color: "#8B8B96" },
              ].map((m, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "18px 20px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ fontSize: 11, color: "#6B6B76", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>{m.label}</div>
                  <div className="metric-value" style={{ fontSize: 24, fontWeight: 300, color: m.color, fontFamily: "'JetBrains Mono', monospace" }}>
                    <AnimatedNumber value={m.value} prefix={m.prefix} />
                  </div>
                </div>
              ))}
              {/* Circle chart */}
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <ProgressRing percent={pctPaid} size={100} stroke={8} color="#10B981" label="Paid" />
              </div>
            </div>

            {/* DSR + Cash flow */}
            <div className="two-col">
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 24, display: "flex", alignItems: "center", gap: 32 }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <ProgressRing percent={dsr} color={dsr > 40 ? "#EF4444" : "#10B981"} label="DSR" />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>Debt servicing ratio</div>
                  <div style={{ fontSize: 12, color: "#8B8B96", lineHeight: 1.6 }}>
                    At <span style={{ color: dsr > 40 ? "#EF4444" : "#10B981", fontWeight: 500 }}>{dsr.toFixed(1)}%</span> — {dsr > 40 ? "above the 40% high-risk threshold" : "within safe range"}.
                  </div>
                  <div style={{ marginTop: 12, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, position: "relative" }}>
                    <div style={{ position: "absolute", left: "40%", top: -4, bottom: -4, width: 1, background: "#F59E0B", opacity: 0.6 }} />
                    <div style={{ width: `${Math.min(dsr, 100)}%`, height: "100%", background: dsr > 40 ? "#EF4444" : "#10B981", borderRadius: 2, transition: "width 0.8s ease" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6B6B76", marginTop: 4 }}>
                    <span>0%</span><span style={{ color: "#F59E0B" }}>40% limit</span><span>100%</span>
                  </div>
                </div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 24 }}>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 16 }}>Monthly cash flow</div>
                {[
                  { label: "Loan payments", value: totalMonthly, pct: Math.round((totalMonthly / INCOME) * 100), color: "#3B82F6" },
                  { label: "Family support", value: FAMILY, pct: Math.round((FAMILY / INCOME) * 100), color: "#F97316" },
                  { label: "Living expenses", value: Math.max(living, 0), pct: Math.max(Math.round((living / INCOME) * 100), 0), color: "#10B981" },
                ].map((item, i) => (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: "#8B8B96" }}>{item.label}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: item.color }}>${item.value.toLocaleString()} ({item.pct}%)</span>
                    </div>
                    <div style={{ height: 6, background: "rgba(255,255,255,0.04)", borderRadius: 3 }}>
                      <div style={{ width: `${item.pct}%`, height: "100%", background: item.color, borderRadius: 3, transition: "width 0.8s ease" }} />
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "#6B6B76" }}>Remaining for living</span>
                  <span style={{ fontSize: 18, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", color: living < 10000 ? "#EF4444" : living < 12000 ? "#F59E0B" : "#10B981" }}>
                    <AnimatedNumber value={Math.max(living, 0)} prefix="$" />
                  </span>
                </div>
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>Interest rate comparison</div>
              <div style={{ fontSize: 12, color: "#6B6B76", marginBottom: 20 }}>Pay off the most expensive debt first</div>
              {[...loans].sort((a, b) => b.apr - a.apr).map((loan, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 130, fontSize: 12, color: "#8B8B96", textAlign: "right" }}>{loan.name}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 24, borderRadius: 6, background: loan.color, width: `${(loan.apr / 42) * 100}%`, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8, minWidth: 45 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: "#fff" }}>{loan.apr}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── LOANS ── */}
        {activeTab === "loans" && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            {history.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, padding: "10px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
                <span style={{ fontSize: 12, color: "#8B8B96" }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#6EE7B7", fontWeight: 500 }}>{history.length}</span> payment{history.length > 1 ? "s" : ""} recorded
                </span>
                <UndoButton onClick={undoLast} />
              </div>
            )}

            {loans.map((loan) => {
              const progress = (loan.installmentsPaid / loan.totalInstallments) * 100;
              const isFullyPaid = loan.installmentsPaid >= loan.totalInstallments || loan.remaining <= 0;
              const wasJustPaid = justPaidId === loan.id;
              const monthsLeft = loan.totalInstallments - loan.installmentsPaid;

              return (
                <div key={loan.id}
                  style={{
                    background: wasJustPaid ? "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))" : isFullyPaid ? "linear-gradient(135deg, rgba(16,185,129,0.05), rgba(16,185,129,0.01))" : loan.danger ? "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.02))" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${wasJustPaid ? "rgba(16,185,129,0.3)" : isFullyPaid ? "rgba(16,185,129,0.15)" : loan.danger ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.06)"}`,
                    borderRadius: 12, padding: 20, marginBottom: 12, transition: "all 0.5s ease",
                  }}>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: isFullyPaid ? "#10B981" : loan.color, boxShadow: `0 0 10px ${isFullyPaid ? "#10B981" : loan.color}40` }} />
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                          {loan.name}
                          {loan.revolving && !isFullyPaid && <span style={{ padding: "2px 8px", background: "rgba(245,158,11,0.2)", color: "#FDE68A", borderRadius: 4, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Revolving</span>}
                          {isFullyPaid && <span style={{ padding: "2px 8px", background: "rgba(16,185,129,0.2)", color: "#6EE7B7", borderRadius: 4, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Cleared</span>}
                        </div>
                        <div style={{ fontSize: 12, color: "#6B6B76", marginTop: 2 }}>{loan.apr}% APR &middot; {isFullyPaid ? "fully paid" : `${monthsLeft} month${monthsLeft !== 1 ? "s" : ""} remaining`}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 20, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", color: isFullyPaid ? "#10B981" : loan.danger ? "#EF4444" : "#E8E6E1" }}>
                        <AnimatedNumber value={loan.remaining} prefix="$" />
                      </div>
                      <div style={{ fontSize: 11, color: "#6B6B76" }}>{isFullyPaid ? "cleared" : "remaining"}</div>
                    </div>
                  </div>

                  <div className={`loan-stats${loan.revolving ? " has-revolving" : ""}`}>
                    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, color: "#6B6B76", textTransform: "uppercase", letterSpacing: 1 }}>Monthly</div>
                      <div style={{ fontSize: 16, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", color: loan.color, marginTop: 2 }}>${loan.monthly.toLocaleString()}</div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, color: "#6B6B76", textTransform: "uppercase", letterSpacing: 1 }}>Total paid</div>
                      <div style={{ fontSize: 16, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", color: "#E8E6E1", marginTop: 2 }}><AnimatedNumber value={loan.paid} prefix="$" /></div>
                    </div>
                    {loan.revolving && (
                      <div style={{ background: "rgba(245,158,11,0.08)", borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontSize: 10, color: "#FDE68A", textTransform: "uppercase", letterSpacing: 1 }}>
                          {loan.interestPaid ? "Interest paid" : "Type"}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", color: loan.interestPaid ? "#EF4444" : "#F59E0B", marginTop: 2 }}>
                          {loan.interestPaid ? `$${loan.interestPaid.toLocaleString()}` : "Revolving"}
                        </div>
                        <div style={{ fontSize: 10, color: "#92400E", marginTop: 2 }}>
                          {loan.interestPaid ? `${Math.round(loan.interestPaid / loan.paid * 100)}% of payments` : "No fixed term"}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Installment heatmap + pay button */}
                  <div style={{ paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div style={{ fontSize: 12, color: "#6B6B76" }}>
                        {isFullyPaid ? "All installments complete" : `Next: installment #${loan.installmentsPaid + 1} — $${loan.monthly.toLocaleString()}`}
                      </div>
                      <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#4A4A52" }}>{loan.installmentsPaid}/{loan.totalInstallments}</div>
                    </div>
                    <div className="heatmap-row">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <CalendarHeatmap paid={loan.installmentsPaid} total={loan.totalInstallments} color={isFullyPaid ? "#10B981" : loan.color} startYear={loan.startYear} startMonth={loan.startMonth} justPaid={wasJustPaid} />
                      </div>
                      <div style={{ flexShrink: 0, paddingBottom: 8 }}>
                        <PayButton onClick={() => payInstallment(loan.id)} disabled={isFullyPaid} justPaid={wasJustPaid} />
                      </div>
                    </div>
                  </div>

                  {loan.revolving && !isFullyPaid && (
                    <div style={{ marginTop: 14, padding: "10px 14px", background: loan.interestPaid ? "rgba(239,68,68,0.06)" : "rgba(245,158,11,0.06)", borderRadius: 8, fontSize: 12, color: loan.interestPaid ? "#FCA5A5" : "#FCD34D", lineHeight: 1.5, borderLeft: `3px solid ${loan.interestPaid ? "#EF4444" : "#F59E0B"}` }}>
                      {loan.interestPaid ? (
                        <>Revolving at {loan.apr}% APR — avg payment was ${loan.avgPayment.toLocaleString()}/mo but only ${loan.principalPaid.toLocaleString()} went to principal. Now paying ${loan.monthly.toLocaleString()}/mo (catch-up) to clear in {monthsLeft} months. Interest remaining: ${loan.interestRemaining.toLocaleString()}.</>
                      ) : (
                        <>Revolving credit — no penalty for lower payments, but {loan.apr}% APR compounds monthly. {loan.apr >= 30 ? "Highest priority to clear." : "Clear early to save on interest."}</>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, color: "#8B8B96" }}>Total monthly loan payments</span>
              <span style={{ fontSize: 22, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" }}><AnimatedNumber value={totalMonthly} prefix="$" /></span>
            </div>
          </div>
        )}

        {/* ── CASH FLOW ── */}
        {activeTab === "cashflow" && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 24, marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>Income allocation</div>
              <div style={{ fontSize: 12, color: "#6B6B76", marginBottom: 20 }}>How your $42,000 monthly income is distributed</div>
              <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", height: 32, gap: 2 }}>
                {[{ value: totalMonthly, color: "#3B82F6" }, { value: FAMILY, color: "#F97316" }, { value: Math.max(living, 0), color: "#10B981" }].map((d, i) => (
                  <div key={i} style={{ width: `${(d.value / INCOME) * 100}%`, background: d.color, transition: "width 0.8s ease" }} />
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 24px", marginTop: 14 }}>
                {[{ label: "Loans", value: totalMonthly, color: "#3B82F6" }, { label: "Family", value: FAMILY, color: "#F97316" }, { label: "Living", value: Math.max(living, 0), color: "#10B981" }].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color }} />
                    <span style={{ color: "#8B8B96" }}>{item.label}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", color: item.color }}>${item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 24, marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 16 }}>Detailed monthly breakdown</div>
              {[{ label: "Income", value: INCOME, type: "income" }, ...loans.map(l => ({ label: l.name, value: -l.monthly, color: l.color, type: "expense" })), { label: "Family support", value: -FAMILY, color: "#F97316", type: "expense" }].map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < loans.length + 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {item.color && <div style={{ width: 6, height: 6, borderRadius: "50%", background: item.color }} />}
                    <span style={{ fontSize: 13, color: "#8B8B96" }}>{item.label}</span>
                  </div>
                  <span style={{ fontSize: 14, fontFamily: "'JetBrains Mono', monospace", color: item.type === "income" ? "#10B981" : "#E8E6E1" }}>{item.type === "income" ? "+" : "-"}${Math.abs(item.value).toLocaleString()}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, marginTop: 6, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>Remaining for living</span>
                <span style={{ fontSize: 22, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, color: living < 10000 ? "#EF4444" : living < 12000 ? "#F59E0B" : "#10B981" }}><AnimatedNumber value={Math.max(living, 0)} prefix="$" /></span>
              </div>
            </div>
            <div style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#6EE7B7", marginBottom: 6 }}>After all debts cleared (~2029)</div>
              <div style={{ fontSize: 12, color: "#6EE7B780", lineHeight: 1.6 }}>You'll free up <span style={{ color: "#10B981", fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>${totalMonthly.toLocaleString()}/mo</span> currently going to loans.</div>
            </div>
          </div>
        )}

        {/* ── ACTION PLAN ── */}
        {activeTab === "action" && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            {[
              { priority: "Urgent", color: "#EF4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", title: "Keep up $4,552/mo on X Wallet #1", desc: "86% of past payments ($30,378 of $35,317) went to interest at 39% APR. Catch-up plan: $4,552/mo for 24 months clears it. Still $34,196 in interest remaining.", timeline: "24 months" },
              { priority: "High", color: "#F59E0B", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)", title: "Consider partial Pokémon liquidation", desc: "Sell ~$75k (4.5% of portfolio) to clear X Wallet #1 immediately. Saves ~$34k in remaining interest.", timeline: "Within 1 month" },
              { priority: "Medium", color: "#3B82F6", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.2)", title: "Clear X Wallet #2 next", desc: "Also revolving (18% APR). Redirect freed cash after #1 is done. No penalty but interest still adds up.", timeline: "3–6 months" },
              { priority: "Ongoing", color: "#8B5CF6", bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.2)", title: "Avalanche the remaining 3 loans", desc: "Attack SC (8%) first, then Mox (5%), then BOCHK (4%).", timeline: "6–36 months" },
              { priority: "Goal", color: "#10B981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)", title: "Debt-free by 2029", desc: "$20k+/mo freed up for MPF, index funds, emergency fund, and life goals.", timeline: "~2029" },
            ].map((item, i) => (
              <div key={i} className="action-item" style={{ background: item.bg, border: `1px solid ${item.border}`, borderRadius: 12, padding: 20, marginBottom: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 60 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${item.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 600, color: item.color, fontFamily: "'JetBrains Mono', monospace" }}>{i + 1}</div>
                  <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5, color: item.color }}>{item.priority}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4, color: "#F5F5F0" }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: "#8B8B96", lineHeight: 1.6, marginBottom: 8 }}>{item.desc}</div>
                  <div style={{ fontSize: 11, color: item.color, fontFamily: "'JetBrains Mono', monospace" }}>{item.timeline}</div>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 8, background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(59,130,246,0.05))", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: "#6EE7B7", marginBottom: 12 }}>Quick scenario: sell $75k of Pokémon now</div>
              <div className="scenario-grid">
                {[{ label: "Interest saved", value: "~$34,196", color: "#10B981" }, { label: "Portfolio impact", value: "−4.5%", color: "#F59E0B" }, { label: "Monthly freed", value: "+$4,552", color: "#10B981" }].map((s, i) => (
                  <div key={i} style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, color: "#6B6B76", textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", color: s.color, marginTop: 4 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .page-pad { padding-left: 32px; padding-right: 32px; }
        .metrics-grid { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 12px; margin-bottom: 24px; align-items: stretch; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        .scenario-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .heatmap-row { display: flex; align-items: flex-end; gap: 40px; }
        .loan-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
        .loan-stats.has-revolving { grid-template-columns: 1fr 1fr 1fr; }
        .action-item { display: flex; gap: 16px; }
        @media (max-width: 768px) {
          .page-pad { padding-left: 16px; padding-right: 16px; }
          .metrics-grid { grid-template-columns: 1fr 1fr; }
          .metrics-grid .metric-value { font-size: 20px !important; }
          .two-col { grid-template-columns: 1fr; }
          .scenario-grid { grid-template-columns: 1fr; }
          .heatmap-row { flex-direction: column; align-items: stretch; gap: 16px; }
          .loan-stats, .loan-stats.has-revolving { grid-template-columns: 1fr; }
          .action-item { flex-direction: column; gap: 10px; }
          .tab-btn { padding: 10px 12px !important; font-size: 12px !important; }
        }
      `}</style>
    </div>
  );
}
