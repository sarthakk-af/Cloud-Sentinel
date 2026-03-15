import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
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

function ClusterChart({ clusters }) {
  if (!clusters?.length) return null;
  const data = clusters.map(c => ({
    name: `#${c.id ?? c.template_id}`,
    score: parseFloat((c.importance_score || 0).toFixed(3)),
    template: (c.template || '').slice(0, 40),
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div style={{
        background: '#111827', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem',
        maxWidth: 300,
      }}>
        <div style={{ color: '#ef4444', fontWeight: 700 }}>Score: {d.score}</div>
        <div style={{ color: '#94a3b8', marginTop: 4 }}>{d.template}…</div>
      </div>
    );
  };

  return (
    <div className="chart-wrapper">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
          <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="score" radius={[4,4,0,0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === 0 ? '#ef4444' : i === 1 ? '#f59e0b' : '#3b82f6'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ResultsPanel({ results }) {
  if (!results) return null;
  const sev = getSeverity(results.ai_summary);

  const rawLogs = results.total_logs != null
    ? results.total_logs
    : (results.new_logs_chunk != null ? null : null);

  const rawLabel = results.total_logs != null
    ? results.total_logs
    : (results.new_logs_chunk != null ? `+${results.new_logs_chunk}` : '—');

  return (
    <div style={{ animation: 'fadeUp 0.4s ease forwards' }}>
      {/* Stats */}
      <div className="stats-grid">
        <AnimatedStat
          value={typeof rawLabel === 'number' ? rawLabel : undefined}
          label="Raw Logs Parsed"
          icon="📋"
          bg="rgba(59,130,246,0.12)"
        />
        <AnimatedStat
          value={results.unique_templates ?? results.total_unique_templates}
          label="Unique Templates"
          icon="🧩"
          bg="rgba(139,92,246,0.12)"
        />
        <AnimatedStat
          value={results.processing_time_ms}
          label="Time to Intelligence"
          icon="⚡"
          bg="rgba(16,185,129,0.12)"
        />
      </div>

      {/* Summary */}
      <SummaryBox summary={results.ai_summary} />

      {/* Chart */}
      {results.top_clusters?.length > 0 && (
        <div className="panel fade-up fade-up-2">
          <div className="panel-header">
            <div className="panel-header-icon icon-orange">📊</div>
            Importance Score Distribution
          </div>
          <ClusterChart clusters={results.top_clusters} />
        </div>
      )}

      {/* Clusters */}
      <div className="panel fade-up fade-up-3">
        <div className="panel-header">
          <div className="panel-header-icon icon-red">🚨</div>
          Top Critical Event Clusters
          {results.top_clusters?.length > 0 && (
            <span className="badge badge-blue" style={{ marginLeft: 'auto' }}>
              Phase B · TF-IDF
            </span>
          )}
        </div>
        <div className="cluster-list">
          {!results.top_clusters?.length ? (
            <p style={{ color: 'var(--text-3)', fontSize: '0.9rem' }}>No templates found.</p>
          ) : (
            results.top_clusters.map((c, i) => {
              const maxScore = results.top_clusters[0].importance_score || 1;
              const pct = Math.min(100, ((c.importance_score || 0) / maxScore) * 100);
              return (
                <div key={i} className="cluster-item">
                  <div className="cluster-meta">
                    <span className="cluster-id">Cluster #{c.id ?? c.template_id}</span>
                    <span className="cluster-score-badge">
                      Score: {(c.importance_score || 0).toFixed(3)}
                    </span>
                  </div>
                  <div className="cluster-score-bar">
                    <div className="cluster-score-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="cluster-template">{c.template}</div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────
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
  const [isStreaming, setIsStreaming]   = useState(false);
  const [terminalLogs, setTerminalLogs] = useState([]);
  const eventSourceRef = useRef(null);
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
    reset(); setIsStreaming(true);
    setTerminalLogs([
      `[SYSTEM] Targeting API: ${API}`,
      '[SYSTEM] Connecting to backend Log Generator...',
      '[SYSTEM] Tailing live_system.log...',
    ]);
    const es = new EventSource(`${API}/api/stream`);
    eventSourceRef.current = es;
    es.onopen = () => setTerminalLogs(p => [...p, '[SUCCESS] SSE Connection established.']);
    es.onmessage = (ev) => {
      try {
        const d = JSON.parse(ev.data);
        if (d.status === 'live') {
          setTerminalLogs(p => [...p, `[TRAFFIC] +${d.new_logs_chunk} logs ingested — ${d.unique_templates} templates.`]);
          setResults(d);
        }
      } catch { /* heartbeat */ }
    };
    es.onerror = () => {
      setTerminalLogs(p => [...p,
        `[ERROR] Connection failed at ${API}/api/stream`,
        '[TIP] Ensure uvicorn is running on the correct port.',
      ]);
      setError('Live stream disconnected. See terminal for details.');
      stopStream();
    };
  };

  const stopStream = () => {
    setIsStreaming(false);
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  };

  // auto-scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs]);

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
              </div>
              <p style={{ color: 'var(--text-2)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                Watch the AI Engine tail <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: '0.82rem' }}>live_system.log</code> via SSE,
                parsing and summarizing new lines every 2 seconds.
              </p>

              <div className="terminal-window" id="terminal-output">
                {terminalLogs.length === 0 && (
                  <span style={{ color: 'var(--text-3)' }}>
                    Connect the engine to start tailing logs…
                  </span>
                )}
                {terminalLogs.map((line, i) => (
                  <p key={i} className={getTerminalClass(line)}>{line}</p>
                ))}
                <span className="blinking-cursor" />
                <div ref={terminalEndRef} />
              </div>

              <div style={{ textAlign: 'center' }}>
                {!isStreaming ? (
                  <button id="connect-stream-btn" className="btn" onClick={startStream}>
                    📡 Connect to Target Server
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
                  { icon: '📂', label: 'Dataset', value: 'bgl_sample.log' },
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
