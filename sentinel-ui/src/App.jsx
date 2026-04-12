import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import './index.css';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// ── helpers ───────────────────────────────────────────────────
function getSeverity(summary = '') {
  const s = summary.toLowerCase();
  if (s.startsWith('critical') || s.startsWith('security'))
    return { color: '#ef4444', glow: 'rgba(239,68,68,0.18)', label: 'CRITICAL' };
  if (s.startsWith('performance') || s.startsWith('warning') || s.startsWith('storage') || s.startsWith('network'))
    return { color: '#f59e0b', glow: 'rgba(245,158,11,0.18)', label: 'WARNING' };
  if (s.startsWith('database') || s.startsWith('web server'))
    return { color: '#8b5cf6', glow: 'rgba(139,92,246,0.18)', label: 'DEGRADED' };
  return { color: '#3b82f6', glow: 'rgba(59,130,246,0.18)', label: 'INFO' };
}

function getTerminalClass(line) {
  if (line.startsWith('[SYSTEM]')) return 'terminal-line sys';
  if (line.startsWith('[SUCCESS]')) return 'terminal-line ok';
  if (line.startsWith('[ERROR]') || line.startsWith('[TIP]')) return 'terminal-line error';
  if (line.startsWith('[TRAFFIC]')) return 'terminal-line traffic';
  return 'terminal-line ok';
}

const SCENARIOS = [
  { key: 'ssh_brute',    icon: '🛡️', name: 'SSH Brute Force',      desc: 'External IP brute-forcing root via SSH.' },
  { key: 'java_oom',     icon: '💥', name: 'Memory Crash',          desc: 'Java container triggering OOM panic.' },
  { key: 'mixed_noise',  icon: '🌪️', name: 'High Volume Noise',     desc: 'TF-IDF filtering errors in normal traffic.' },
  { key: 'disk_full',    icon: '💾', name: 'Disk Full Alert',        desc: 'Partition filling up, blocking all writes.' },
  { key: 'db_deadlock',  icon: '🔒', name: 'DB Deadlock',           desc: 'Postgres deadlock cascade + connection failures.' },
  { key: 'http_flood',   icon: '🌊', name: 'HTTP 500 Storm',        desc: 'Nginx internal server error spike.' },
  { key: 'ssl_cert',     icon: '🔐', name: 'SSL Certificate Failure',desc: 'Expired certs + missing host keys.' },
  { key: 'kernel_panic', icon: '☠️', name: 'Kernel Panic',          desc: 'NULL pointer dereference + OOM killer firing.' },
  { key: 'cpu_spike',    icon: '🔥', name: 'CPU Overload',          desc: 'Thermal throttling with watchdog timeouts.' },
];

// ── sub-components ────────────────────────────────────────────

function AnimatedStat({ value, label, icon, bg }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (typeof value !== 'number') return;
    const target = value;
    const step = Math.max(1, Math.floor(target / 24));
    let cur = 0;
    const timer = setInterval(() => {
      cur = Math.min(cur + step, target);
      setDisplay(cur);
      if (cur >= target) clearInterval(timer);
    }, 28);
    return () => clearInterval(timer);
  }, [value]);

  const shown = typeof value === 'number' ? display.toLocaleString() : value;

  return (
    <div className="stat-card fade-up">
      <div className="stat-header">
        <div className="stat-label">{label}</div>
        <div className="stat-icon" style={{ background: bg }}>{icon}</div>
      </div>
      <div className="stat-value">{shown ?? '—'}</div>
    </div>
  );
}

function SummaryBox({ summary }) {
  const sev = getSeverity(summary);
  return (
    <div className="summary-box fade-up" style={{
      borderColor: sev.color,
      background: sev.glow,
    }}>
      <div className="summary-title" style={{ color: sev.color }}>
        🤖 AI Executive Summary
        <span className="badge" style={{
          background: `${sev.color}22`,
          color: sev.color,
          border: `1px solid ${sev.color}44`,
        }}>{sev.label}</span>
      </div>
      <div className="summary-text">
        {summary || 'System is stable. No critical anomalies detected.'}
      </div>
    </div>
  );
}

// ── Plain English + Score helpers ────────────────────────────
const CRITICAL_KWS = ['error','fail','failed','critical','panic','denied','timeout','exception','kill','oom'];

function getPlainEnglish(cluster) {
  const t = ((cluster.template || '') + ' ' + (cluster.original_log || '')).toLowerCase();
  if (t.includes('failed password') || t.includes('authentication fail'))
    return '🔐 Someone is repeatedly trying to log in with wrong passwords — possible break-in attempt.';
  if (t.includes('invalid user'))
    return '🔐 Login attempts using usernames that don\'t exist on this server.';
  if (t.includes('out of memory') || t.includes('kill process') || t.includes(' oom'))
    return '💥 The server ran out of memory and was forced to shut down one or more programs.';
  if (t.includes('deadlock'))
    return '🔒 Two database operations got stuck waiting for each other — transactions are blocked.';
  if (t.includes('no space') || t.includes('disk quota'))
    return '💾 The server disk is completely full — it cannot save any new data.';
  if (t.includes('kernel panic'))
    return '☠️ The operating system crashed — like a Blue Screen of Death for Linux.';
  if (t.includes('null pointer') || t.includes('segfault'))
    return '⚠️ A program tried to read memory it wasn\'t allowed to — it crashed as a result.';
  if (t.includes('throttled') || t.includes('temperature above threshold'))
    return '🔥 The CPU is overheating and slowing itself down automatically to cool off.';
  if (t.includes('watchdog') && t.includes('timeout'))
    return '⏱️ A service stopped responding — the system\'s watchdog timer cut it off.';
  if (t.includes('ssl') || t.includes('certificate'))
    return '🔐 A security certificate is expired or broken — encrypted connections are failing.';
  if (t.includes(' 500') || t.includes(' 502') || t.includes(' 503'))
    return '🌐 The web server is returning error responses — users may see a broken site.';
  if (t.includes('connection refused'))
    return '🔌 A service could not connect to another — it was actively rejected.';
  if (t.includes('slow query'))
    return '🐢 A database query is running much slower than expected — users may experience delays.';
  if (t.includes('timeout'))
    return '⏰ A request took too long and was cut off before it could complete.';
  if (t.includes('heartbeat') || t.includes('started session'))
    return '✅ Normal background activity — the system is checking in as healthy.';
  return '📋 An unusual log pattern detected that does not match typical background noise.';
}

function getScoreBreakdown(cluster) {
  const tpl      = (cluster.template || '').toLowerCase();
  const found    = CRITICAL_KWS.filter(kw => tpl.includes(kw));
  const kwBoost  = parseFloat((found.length * 0.5).toFixed(3));
  const base     = parseFloat(Math.max(0, (cluster.importance_score || 0) - kwBoost).toFixed(3));
  return { base, kwBoost, found };
}

// ── Health Gauge (Option 4) ───────────────────────────────────
function HealthGauge({ summary }) {
  const sev = getSeverity(summary);
  const CONFIGS = {
    CRITICAL: { score: 88, text: 'CRITICAL THREAT',  icon: '🚨', pulse: true  },
    WARNING:  { score: 62, text: 'WARNING DETECTED', icon: '⚡', pulse: false },
    DEGRADED: { score: 40, text: 'DEGRADED STATE',   icon: '🔶', pulse: false },
    INFO:     { score: 15, text: 'SYSTEM STABLE',    icon: '✅', pulse: false },
  };
  const cfg = CONFIGS[sev.label] || CONFIGS.INFO;

  const R = 52, CX = 70, CY = 72;
  const START = 135, SWEEP = 270;
  const fillEnd = START + (cfg.score / 100) * SWEEP;

  const pt = (deg) => {
    const r = (deg * Math.PI) / 180;
    return { x: +(CX + R * Math.cos(r)).toFixed(2), y: +(CY + R * Math.sin(r)).toFixed(2) };
  };
  const arc = (a, b) => {
    const s = pt(a), e = pt(b);
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${b - a > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
      <svg width="140" height="120" viewBox="0 0 140 128">
        <path d={arc(START, START + SWEEP)} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="11" strokeLinecap="round"/>
        <path d={arc(START, fillEnd)} fill="none" stroke={sev.color} strokeWidth="11" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${sev.color}99)`, transition: 'all 1s ease',
                   ...(cfg.pulse ? { animation: 'pulse-glow 2s ease infinite' } : {}) }}/>
        <text x={CX} y={CY + 8}  textAnchor="middle" fill={sev.color}  fontSize="22" fontWeight="800" fontFamily="system-ui">{cfg.score}</text>
        <text x={CX} y={CY + 22} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="8" fontFamily="system-ui">THREAT LEVEL</text>
      </svg>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: sev.color,
                    fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.08em',
                    ...(cfg.pulse ? { animation: 'pulse-glow 2s ease infinite' } : {}) }}>
        {cfg.icon} {cfg.text}
      </div>
    </div>
  );
}

function ResultsPanel({ results }) {
  const [plainMode, setPlainMode] = useState(false);
  const [openPhase, setOpenPhase] = useState(null);

  if (!results) return null;

  const clusters  = results.top_clusters || [];
  const rawLabel  = results.total_logs != null ? results.total_logs
                  : results.new_logs_chunk != null ? `+${results.new_logs_chunk}` : '—';
  const toggle    = (p) => setOpenPhase(prev => prev === p ? null : p);
  const topColors = ['#ef4444', '#f59e0b', '#3b82f6'];

  return (
    <div style={{ animation: 'fadeUp 0.4s ease forwards' }}>

      {/* Stats row */}
      <div className="stats-grid">
        <AnimatedStat value={typeof rawLabel === 'number' ? rawLabel : undefined} label="Raw Logs Parsed"     icon="📋" bg="rgba(59,130,246,0.12)"/>
        <AnimatedStat value={results.unique_templates ?? results.total_unique_templates}                       label="Unique Templates"    icon="🧩" bg="rgba(139,92,246,0.12)"/>
        <AnimatedStat value={results.processing_time_ms}                                                      label="Time to Intelligence" icon="⚡" bg="rgba(16,185,129,0.12)"/>
      </div>

      {/* AI Summary */}
      <SummaryBox summary={results.ai_summary} />

      {/* ── Option 4: Health Gauge + mini threat bars ─────────── */}
      {clusters.length > 0 && (
        <div className="panel fade-up fade-up-2 gauge-panel">
          {/* Circular gauge */}
          <div style={{ flex: '0 0 150px', display: 'flex', justifyContent: 'center' }}>
            <HealthGauge summary={results.ai_summary} />
          </div>

          <div className="gauge-divider" />

          {/* Threat breakdown mini-bars */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>
              Top threat clusters
            </div>
            {clusters.slice(0, 3).map((c, i) => {
              const max = clusters[0].importance_score || 1;
              const pct = Math.min(100, ((c.importance_score || 0) / max) * 100);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ color: topColors[i], fontSize: '0.68rem', fontWeight: 700, width: 22, flexShrink: 0 }}>#{i + 1}</span>
                  <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: topColors[i], borderRadius: 99, transition: 'width 0.8s ease' }} />
                  </div>
                  <span style={{ color: 'var(--text-3)', fontSize: '0.7rem', minWidth: 38, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {(c.importance_score || 0).toFixed(3)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Option 3: Cluster list with Plain English toggle ───── */}
      <div className="panel fade-up fade-up-3">
        <div className="panel-header">
          <div className="panel-header-icon icon-red">🚨</div>
          Top Critical Event Clusters
          {clusters.length > 0 && (
            <>
              <span className="badge badge-blue" style={{ marginLeft: 'auto' }}>Phase B · TF-IDF</span>
              <button
                onClick={() => setPlainMode(m => !m)}
                title={plainMode ? 'Switch to technical view' : 'Switch to plain English'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
                  background: plainMode ? 'rgba(59,130,246,0.15)' : 'var(--bg-2)',
                  border: `1px solid ${plainMode ? 'rgba(59,130,246,0.5)' : 'var(--border)'}`,
                  borderRadius: 999, padding: '3px 11px',
                  color: plainMode ? '#60a5fa' : 'var(--text-2)',
                  fontSize: '0.75rem', fontWeight: 600,
                  fontFamily: 'var(--font-ui)', transition: 'all 0.2s',
                }}
              >
                {plainMode ? '🔬 Technical' : '📖 Plain English'}
              </button>
            </>
          )}
        </div>

        <div className="cluster-list">
          {!clusters.length ? (
            <p style={{ color: 'var(--text-3)', fontSize: '0.9rem' }}>No templates found.</p>
          ) : clusters.map((c, i) => {
            const max  = clusters[0].importance_score || 1;
            const pct  = Math.min(100, ((c.importance_score || 0) / max) * 100);
            const { found } = getScoreBreakdown(c);
            return (
              <div key={i} className="cluster-item">
                <div className="cluster-meta">
                  <span className="cluster-id">Cluster #{c.id ?? c.template_id}</span>
                  {plainMode ? (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
                      {found.length > 0 ? `⚠️ ${found.slice(0, 3).join(', ')}` : '✓ no critical keywords'}
                    </span>
                  ) : (
                    <span className="cluster-score-badge">Score: {(c.importance_score || 0).toFixed(3)}</span>
                  )}
                </div>
                <div className="cluster-score-bar">
                  <div className="cluster-score-fill" style={{ width: `${pct}%` }} />
                </div>
                {plainMode ? (
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-2)', lineHeight: 1.6, paddingTop: '0.2rem' }}>
                    {getPlainEnglish(c)}
                  </div>
                ) : (
                  <div className="cluster-template">{c.template}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Option 1: Show Your Work — Pipeline Breakdown ──────── */}
      {clusters.length > 0 && (
        <div className="panel fade-up fade-up-3">
          <div className="panel-header">
            <div className="panel-header-icon" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>🔬</div>
            How The AI Interpreted These Logs
            <span className="badge" style={{ marginLeft: 'auto', background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
              3-Phase Pipeline
            </span>
          </div>

          {/* Phase A */}
          <div className="breakdown-phase" onClick={() => toggle('A')}>
            <div className="breakdown-phase-header">
              <span className="phase-num" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' }}>A</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>Drain3 Parsing — Pattern Extraction</div>
                <div style={{ fontSize: '0.77rem', color: 'var(--text-3)', marginTop: 2 }}>How raw logs were grouped into reusable templates</div>
              </div>
              <span style={{ color: 'var(--text-3)', fontSize: '0.78rem', marginTop: 4 }}>{openPhase === 'A' ? '▲' : '▼'}</span>
            </div>
            {openPhase === 'A' && (
              <div className="breakdown-phase-body">
                <div className="breakdown-explain">
                  Drain3 reads every log line and finds repeating structures. Dynamic values — IP addresses,
                  usernames, timestamps, process IDs — are replaced with{' '}
                  <code style={{ color: 'var(--accent)', fontSize: '0.8rem' }}>&lt;*&gt;</code>, leaving
                  behind only the static pattern that represents the event type.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.85rem' }}>
                  {clusters.slice(0, 3).map((c, i) => {
                    const n = (c.template?.match(/<\*>/g) || []).length;
                    return (
                      <div key={i} style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '0.75rem 1rem', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>Raw log #{i + 1}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.77rem', color: 'var(--text-2)', wordBreak: 'break-all', marginBottom: '0.5rem' }}>{c.original_log}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>→ Template</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.77rem', color: '#a78bfa', wordBreak: 'break-all', marginBottom: '0.4rem' }}>{c.template}</div>
                        <div style={{ fontSize: '0.71rem', color: 'var(--text-3)' }}>
                          {n > 0
                            ? `↳ ${n} dynamic value${n > 1 ? 's' : ''} replaced with <*> — the pattern stays constant, the variables are stripped.`
                            : '↳ No variable parts — this event always looks exactly the same.'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Phase B */}
          <div className="breakdown-phase" onClick={() => toggle('B')}>
            <div className="breakdown-phase-header">
              <span className="phase-num" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>B</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>TF-IDF Ranking — Why Is Cluster #1 On Top?</div>
                <div style={{ fontSize: '0.77rem', color: 'var(--text-3)', marginTop: 2 }}>How templates are scored by rarity and keyword importance</div>
              </div>
              <span style={{ color: 'var(--text-3)', fontSize: '0.78rem', marginTop: 4 }}>{openPhase === 'B' ? '▲' : '▼'}</span>
            </div>
            {openPhase === 'B' && (() => {
              const top = clusters[0];
              const { base, kwBoost, found } = getScoreBreakdown(top);
              const rows = [
                { label: 'TF-IDF Rarity Score', val: base.toFixed(3),              note: 'How uncommon this pattern is compared to all other templates',           color: '#3b82f6' },
                { label: `Keyword Boost (${found.length} keyword${found.length !== 1 ? 's' : ''})`, val: `+${kwBoost.toFixed(3)}`, note: found.length ? `Critical words found: ${found.join(', ')}` : 'No critical keywords in this template', color: '#f59e0b' },
                { label: 'Final Importance Score', val: (top.importance_score||0).toFixed(3), note: 'Used to rank this cluster above the rest', color: '#ef4444', bold: true },
              ];
              return (
                <div className="breakdown-phase-body">
                  <div className="breakdown-explain">
                    TF-IDF scores how <em>rare and unusual</em> each template is across all logs. 
                    Common, repetitive events (heartbeats, routine sessions) score low.
                    Rare events score higher. Templates with critical keywords like{' '}
                    <code style={{ color: 'var(--accent)', fontSize: '0.8rem' }}>failed</code>,{' '}
                    <code style={{ color: 'var(--accent)', fontSize: '0.8rem' }}>kill</code>, or{' '}
                    <code style={{ color: 'var(--accent)', fontSize: '0.8rem' }}>panic</code> get an additional boost.
                  </div>
                  <div style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '1rem', border: '1px solid var(--border)', marginTop: '0.85rem' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Score breakdown — Cluster #1</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#a78bfa', marginBottom: '0.85rem', wordBreak: 'break-all' }}>{top.template}</div>
                    {rows.map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.4rem 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                        <div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text)', fontWeight: r.bold ? 700 : 400 }}>{r.label}</div>
                          <div style={{ fontSize: '0.71rem', color: 'var(--text-3)' }}>{r.note}</div>
                        </div>
                        <div style={{ color: r.color, fontWeight: 700, fontSize: r.bold ? '1.05rem' : '0.9rem', fontFamily: 'var(--font-mono)', paddingLeft: '1rem', minWidth: 52, textAlign: 'right' }}>{r.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Phase C */}
          <div className="breakdown-phase" onClick={() => toggle('C')}>
            <div className="breakdown-phase-header">
              <span className="phase-num" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>C</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>T5 Summarization — How Was The Final Verdict Reached?</div>
                <div style={{ fontSize: '0.77rem', color: 'var(--text-3)', marginTop: 2 }}>How the AI translated technical patterns into a human-readable conclusion</div>
              </div>
              <span style={{ color: 'var(--text-3)', fontSize: '0.78rem', marginTop: 4 }}>{openPhase === 'C' ? '▲' : '▼'}</span>
            </div>
            {openPhase === 'C' && (
              <div className="breakdown-phase-body">
                <div className="breakdown-explain">
                  The top-ranked template is fed into the T5 language model — or matched against built-in
                  heuristic rules for well-known patterns. Either way, the goal is the same: translate  
                  dry, technical log structure into a plain verdict that describes the real-world impact.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.85rem' }}>
                  <div style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '0.75rem 1rem', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Input — top templates sent to AI</div>
                    {clusters.slice(0, 2).map((c, i) => (
                      <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: '#a78bfa', marginBottom: i === 0 ? '0.3rem' : 0 }}>{c.template}</div>
                    ))}
                  </div>
                  <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '0.78rem' }}>↓ T5 Language Model / Heuristic Engine</div>
                  <div style={{ background: `${getSeverity(results.ai_summary).glow}`, borderRadius: 8, padding: '0.75rem 1rem', border: `1px solid ${getSeverity(results.ai_summary).color}44` }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Output — human-readable verdict</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: 500, lineHeight: 1.6 }}>{results.ai_summary}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────
// Live stream incident scenarios for injection
const LIVE_SCENARIOS = [
  { key: 'ssh_brute',    icon: '🛡️', name: 'SSH Brute Force',       color: '#ef4444' },
  { key: 'kernel_panic', icon: '☠️', name: 'Kernel Panic',          color: '#ef4444' },
  { key: 'db_deadlock',  icon: '🔒', name: 'DB Deadlock',           color: '#8b5cf6' },
  { key: 'disk_full',    icon: '💾', name: 'Disk Full',             color: '#f59e0b' },
  { key: 'cpu_spike',    icon: '🔥', name: 'CPU Overload',          color: '#f59e0b' },
  { key: 'http_flood',   icon: '🌊', name: 'HTTP 500 Storm',        color: '#3b82f6' },
  { key: 'ssl_cert',     icon: '🔐', name: 'SSL Certificate Failure',color: '#8b5cf6' },
];

export default function App() {
  const [tab, setTab]         = useState('upload');
  const [results, setResults] = useState(null);
  const [error, setError]     = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  // upload
  const [file, setFile] = useState(null);

  // demo
  const [activeScenario, setActiveScenario] = useState(null);

  // live
  const [isStreaming, setIsStreaming]     = useState(false);
  const [terminalLogs, setTerminalLogs]   = useState([]);
  const [injectingScenario, setInjectingScenario] = useState(null);
  const eventSourceRef = useRef(null);
  const sessionIdRef   = useRef(null);
  const terminalEndRef = useRef(null);

  const reset = useCallback(() => {
    setError('');
    setResults(null);
    setTerminalLogs([]);
    setActiveScenario(null);
  }, []);

  const switchTab = useCallback((t) => {
    if (isStreaming) stopStream();
    setTab(t);
    reset();
  }, [isStreaming, reset]);

  // ── Upload ──────────────────────────────────────────────────
  const handleFileChange = (e) => {
    if (e.target.files?.[0]) { setFile(e.target.files[0]); setError(''); }
  };

  const handleAnalyze = async () => {
    if (!file) { setError('Please select a log file first.'); return; }
    setAnalyzing(true); reset();
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await axios.post(`${API}/api/analyze`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResults(r.data);
    } catch {
      setError('Failed to reach the AI Engine. Is the backend running?');
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Demo ────────────────────────────────────────────────────
  const handleDemo = async (scenario) => {
    setAnalyzing(true); reset(); setActiveScenario(scenario);
    try {
      const r = await axios.get(`${API}/api/library/${scenario}`);
      setResults(r.data);
    } catch {
      setError(`Failed to load scenario: ${scenario}`);
      setActiveScenario(null);
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Replay ─────────────────────────────────────────────────
  const handleReplay = async () => {
    setAnalyzing(true); reset();
    try {
      const r = await axios.get(`${API}/api/replay`);
      setResults(r.data);
    } catch {
      setError('Failed to run dataset replay. Check backend logs.');
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Stream ──────────────────────────────────────────────────
  const startStream = () => {
    reset();
    setIsStreaming(true);
    sessionIdRef.current = null;
    setTerminalLogs([
      `[SYSTEM] Targeting API: ${API}`,
      '[SYSTEM] Starting in-process chaos log generator...',
      '[SYSTEM] Stream engine initializing — waiting for first batch...',
    ]);

    const es = new EventSource(`${API}/api/stream`);
    eventSourceRef.current = es;

    es.onopen = () =>
      setTerminalLogs(p => [...p, '[SUCCESS] SSE Connection established. Chaos engine is live.']);

    es.onmessage = (ev) => {
      try {
        const d = JSON.parse(ev.data);

        // First event — captures the session ID for injection calls
        if (d.type === 'session') {
          sessionIdRef.current = d.session_id;
          setTerminalLogs(p => [...p, `[SYSTEM] Session ID: ${d.session_id.slice(0, 8)}… — chaos generator running.`]);
          return;
        }

        // Analysis events
        if (d.type === 'analysis' && d.status === 'live') {
          // Show the raw log lines in the terminal
          if (d.raw_lines?.length) {
            setTerminalLogs(p => [
              ...p,
              ...d.raw_lines.map(l => `[TRAFFIC] ${l.length > 100 ? l.slice(0, 100) + '…' : l}`),
            ]);
          }
          setTerminalLogs(p => [
            ...p,
            `[SUCCESS] AI Analysis: +${d.new_logs_chunk} logs → ${d.unique_templates} templates (${d.processing_time_ms}ms)`,
          ]);
          setResults(d);
        }

        if (d.type === 'error') {
          setTerminalLogs(p => [...p, `[ERROR] Engine error: ${d.error}`]);
        }
      } catch { /* heartbeat comment lines — safe to ignore */ }
    };

    es.onerror = () => {
      setTerminalLogs(p => [...p,
        `[ERROR] Connection lost at ${API}/api/stream`,
        '[TIP] Check that uvicorn is running and the API is reachable.',
      ]);
      setError('Live stream disconnected. See terminal for details.');
      stopStream();
    };
  };

  const stopStream = () => {
    setIsStreaming(false);
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    sessionIdRef.current   = null;
    setInjectingScenario(null);
  };

  // ── Inject Incident ─────────────────────────────────────────
  const handleInject = async (scenario) => {
    if (!sessionIdRef.current) {
      setTerminalLogs(p => [...p, '[ERROR] No active session. Connect first.']);
      return;
    }
    const s = LIVE_SCENARIOS.find(x => x.key === scenario);
    setInjectingScenario(scenario);
    setTerminalLogs(p => [...p,
      `[SYSTEM] ⚡ Injecting incident: ${s?.name ?? scenario}...`,
      '[SYSTEM] Logs will appear gradually inside the chaos stream.',
    ]);
    try {
      await axios.post(`${API}/api/stream/inject/${scenario}?session_id=${sessionIdRef.current}`);
      setTerminalLogs(p => [...p, `[SUCCESS] Incident '${s?.name}' injected — watch the AI summary update.`]);
    } catch (err) {
      const msg = err?.response?.data?.error ?? 'Injection failed.';
      setTerminalLogs(p => [...p, `[ERROR] ${msg}`]);
    } finally {
      // Clear the active inject badge after the injection duration (~30s)
      setTimeout(() => setInjectingScenario(null), 30000);
    }
  };

  // // auto-scroll terminal
  // useEffect(() => {
  //   terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  // }, [terminalLogs]);

  // polling for background upload results
  useEffect(() => {
    let iv = null;
    if (results?.status === 'processing') {
      iv = setInterval(async () => {
        try {
          const r = await axios.get(`${API}/api/results`);
          if (r.data.status === 'complete' || r.data.status === 'error') {
            setResults(r.data); setAnalyzing(false); clearInterval(iv);
          } else {
            setResults(p => ({ ...p, ...r.data }));
          }
        } catch { /**/ }
      }, 1000);
    }
    return () => { if (iv) clearInterval(iv); };
  }, [results?.status]);

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="app-wrapper">

      {/* Navbar */}
      <nav className="navbar">
        <div className="container">
          <div className="navbar-inner">
            <div className="navbar-brand">
              <div className="brand-icon">🛡️</div>
              Cloud-Sentinel
            </div>
            <div className="navbar-badges">
              <span className="badge badge-blue">Drain3</span>
              <span className="badge badge-purple">TF-IDF</span>
              <span className="badge badge-green">
                <span className="badge-dot" />
                T5 AI
              </span>
              {tab === 'live' && isStreaming && (
                <span className="live-badge">
                  <span className="live-dot" /> LIVE
                </span>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="container">
        <div className="hero">
          <div className="hero-eyebrow">⚡ AI-Powered Log Intelligence</div>
          <h1>DevOps AI Log Interpreter</h1>
          <p className="hero-sub">
            Transform raw system logs into actionable insights using a 3-phase
            AI pipeline — structural parsing, anomaly ranking, and natural-language summarization.
          </p>
          <div className="pipeline-badges">
            {[
              { n: 'A', label: 'Drain3 Parsing' },
              { n: 'B', label: 'TF-IDF Ranking' },
              { n: 'C', label: 'T5 Summarization' },
            ].map(p => (
              <div className="pipeline-badge" key={p.n}>
                <div className="pipeline-badge-num">{p.n}</div>
                {p.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <div className="container">
          <div className="tabs">
            {[
              { key: 'upload', icon: '📁', label: 'File Upload' },
              { key: 'demo',   icon: '⚡', label: 'Demo Scenarios' },
              { key: 'live',   icon: '📡', label: 'Live Stream' },
              { key: 'replay', icon: '🗃️', label: 'Dataset Replay' },
            ].map(t => (
              <button
                key={t.key}
                id={`tab-${t.key}`}
                className={`tab ${tab === t.key ? 'active' : ''}`}
                onClick={() => switchTab(t.key)}
              >
                <span className="tab-icon">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="main-content">
        <div className="container">

          {/* ── Tab 1: File Upload ─────────────────────────── */}
          {tab === 'upload' && (
            <div className="panel fade-up">
              <div className="panel-header">
                <div className="panel-header-icon icon-blue">📁</div>
                Analyze Static Log File
              </div>
              <div
                id="upload-dropzone"
                className={`upload-area ${file ? 'has-file' : ''}`}
                onClick={() => document.getElementById('logUpload').click()}
              >
                <div className="upload-icon">{file ? '✅' : '📄'}</div>
                {file ? (
                  <>
                    <div className="upload-text">{file.name}</div>
                    <div className="upload-sub">{(file.size / 1024).toFixed(1)} KB · Click to change</div>
                  </>
                ) : (
                  <>
                    <div className="upload-text">Drop a .log or .txt file here</div>
                    <div className="upload-sub">Or click to browse — try the sample BGL dataset</div>
                  </>
                )}
                <input type="file" id="logUpload" style={{ display: 'none' }} accept=".log,.txt" onChange={handleFileChange} />
              </div>

              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <button id="run-analysis-btn" className="btn" onClick={handleAnalyze} disabled={!file || analyzing}>
                  {analyzing ? <><span className="loader" /> Processing…</> : '🚀 Run AI Analysis'}
                </button>
              </div>
            </div>
          )}

          {/* ── Tab 2: Demo Scenarios ──────────────────────── */}
          {tab === 'demo' && (
            <div className="panel fade-up">
              <div className="panel-header">
                <div className="panel-header-icon icon-blue">⚡</div>
                Predefined Incident Scenarios
                <span className="badge badge-blue" style={{ marginLeft: 'auto' }}>9 Scenarios</span>
              </div>
              <p style={{ color: 'var(--text-2)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                Click any scenario to instantly see how the AI pipeline parses, ranks, and summarizes the incident.
              </p>
              <div className="demo-grid">
                {SCENARIOS.map(s => (
                  <div
                    key={s.key}
                    id={`demo-${s.key}`}
                    className={`demo-card ${activeScenario === s.key ? 'active-card' : ''}`}
                    onClick={() => handleDemo(s.key)}
                  >
                    <div className="demo-icon">{s.icon}</div>
                    <h3>{s.name}</h3>
                    <p>{s.desc}</p>
                  </div>
                ))}
              </div>
              {analyzing && (
                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                  <span className="loader" style={{ color: 'var(--accent)' }} />
                </div>
              )}
            </div>
          )}

          {/* ── Tab 3: Live Stream ─────────────────────────── */}
          {tab === 'live' && (
            <div className="panel fade-up">
              <div className="panel-header">
                <div className="panel-header-icon icon-green">📡</div>
                Real-Time Log Ingestion
                {isStreaming && (
                  <span className="live-badge" style={{ marginLeft: 'auto' }}>
                    <span className="live-dot" /> CHAOS ENGINE LIVE
                  </span>
                )}
              </div>
              <p style={{ color: 'var(--text-2)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                An in-process chaos engine generates dirty, mixed, real-world logs continuously.
                Once connected, <strong style={{ color: 'var(--text)' }}>inject a live incident</strong> to watch the AI detect it inside the noise.
              </p>

              {/* Incident injection panel — only shown when streaming */}
              {isStreaming && (
                <div style={{
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '1rem 1.25rem',
                  marginBottom: '1.25rem',
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginBottom: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    ⚡ Inject Live Incident
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {LIVE_SCENARIOS.map(s => (
                      <button
                        key={s.key}
                        id={`inject-${s.key}`}
                        onClick={() => handleInject(s.key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.4rem 0.85rem',
                          borderRadius: '999px',
                          border: `1px solid ${injectingScenario === s.key ? s.color : 'var(--border)'}`,
                          background: injectingScenario === s.key ? `${s.color}22` : 'var(--bg-3)',
                          color: injectingScenario === s.key ? s.color : 'var(--text-2)',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          whiteSpace: 'nowrap',
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        <span>{s.icon}</span>
                        {s.name}
                        {injectingScenario === s.key && (
                          <span style={{ marginLeft: '2px', opacity: 0.8 }}>↗</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="terminal-window" id="terminal-output">
                {terminalLogs.length === 0 && (
                  <span style={{ color: 'var(--text-3)' }}>
                    Connect the engine to start the chaos log generator…
                  </span>
                )}
                {terminalLogs.map((line, i) => (
                  <p key={i} className={getTerminalClass(line)}>{line}</p>
                ))}
                <span className="blinking-cursor" />
                <div ref={terminalEndRef} />
              </div>

              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                {!isStreaming ? (
                  <button id="connect-stream-btn" className="btn" onClick={startStream}>
                    📡 Start Chaos Engine
                  </button>
                ) : (
                  <button id="disconnect-stream-btn" className="btn btn-danger" onClick={stopStream}>
                    ⏹ Disconnect Engine
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Tab 4: Dataset Replay ──────────────────────── */}
          {tab === 'replay' && (
            <div className="panel fade-up">
              <div className="panel-header">
                <div className="panel-header-icon icon-orange">🗃️</div>
                Dataset Replay
              </div>
              <p style={{ color: 'var(--text-2)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Runs the full 3-phase AI pipeline against the bundled <strong style={{ color: 'var(--text)' }}>BGL Supercomputer dataset</strong>,
                ingesting up to 2,000 real-world log lines at turbo speed to demonstrate large-scale analysis capability.
              </p>

              <div style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '1.25rem 1.5rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
              }}>
                {[
                  { icon: '📂', label: 'Dataset', value: 'sample_syslog.log' },
                  { icon: '⚡', label: 'Replay Speed', value: 'Turbo (0ms delay)' },
                  { icon: '📋', label: 'Max Lines', value: '2,000 logs' },
                  { icon: '🧠', label: 'Pipeline', value: 'Full 3-Phase AI' },
                ].map(d => (
                  <div key={d.label} style={{ flex: '1 1 180px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginBottom: '4px' }}>
                      {d.icon} {d.label}
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.95rem', fontFamily: 'var(--font-mono)' }}>
                      {d.value}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ textAlign: 'center' }}>
                <button id="run-replay-btn" className="btn" onClick={handleReplay} disabled={analyzing}>
                  {analyzing ? <><span className="loader" /> Replaying Dataset…</> : '▶️ Run Dataset Replay'}
                </button>
              </div>
            </div>
          )}

          {/* ── Error Toast ─────────────────────────────────── */}
          {error && (
            <div className="error-toast fade-up" id="error-message" role="alert">
              <span style={{ fontSize: '1.1rem' }}>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* ── Results ─────────────────────────────────────── */}
          <ResultsPanel results={results} />

        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-inner">
            <div className="footer-brand">
              <div className="brand-icon" style={{ width: 24, height: 24, fontSize: '0.65rem' }}>🛡️</div>
              Cloud-Sentinel v2.0
            </div>
            <div className="footer-tech">
              {['FastAPI', 'React + Vite', 'Drain3', 'TF-IDF', 'T5-small', 'Recharts'].map(t => (
                <span key={t} className="tech-chip">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
