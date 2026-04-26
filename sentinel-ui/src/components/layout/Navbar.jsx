import { Shield, Activity, Cpu, Braces } from 'lucide-react';

export default function Navbar({ isStreaming, activeTab }) {
  return (
    <header>
      {/* ── Top Bar ──────────────────────────────────── */}
      <nav className="nav-bar">
        <div className="nav-brand">
          <div className="nav-brand-icon"><Shield size={16} /></div>
          <span className="nav-brand-text">Cloud Sentinel</span>
        </div>
        <div className="nav-tags">
          {[
            { label: 'Drain3', active: true },
            { label: 'TF-IDF', active: true },
            { label: 'T5 AI', active: true },
          ].map(t => (
            <span key={t.label} className="nav-tag" data-active={t.active}>{t.label}</span>
          ))}
          {activeTab === 'live' && isStreaming && (
            <span className="nav-live-badge">
              <span className="status-dot status-dot-red" />
              LIVE
            </span>
          )}
        </div>
      </nav>

      {/* ── Hero Banner ──────────────────────────────── */}
      <div className="hero-banner">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              AI-Powered Log Intelligence
            </h1>
            <p className="hero-subtitle">
              Detect anomalies, decode threats & understand system behavior.
            </p>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-icon"><Shield size={16} /></div>
              <div>
                <div className="hero-stat-value">3-Phase</div>
                <div className="hero-stat-label">Pipeline</div>
              </div>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <div className="hero-stat-icon"><Braces size={16} /></div>
              <div>
                <div className="hero-stat-value">Drain3</div>
                <div className="hero-stat-label">Template Parser</div>
              </div>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <div className="hero-stat-icon"><Activity size={16} /></div>
              <div>
                <div className="hero-stat-value">TF-IDF</div>
                <div className="hero-stat-label">Anomaly Scorer</div>
              </div>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <div className="hero-stat-icon"><Cpu size={16} /></div>
              <div>
                <div className="hero-stat-value">T5 AI</div>
                <div className="hero-stat-label">Summarizer</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
