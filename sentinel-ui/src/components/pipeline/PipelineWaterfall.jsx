import { useEffect, useState } from 'react';

/* ── Particle dots that flow between nodes ────────────────── */
function Connector({ active }) {
  return (
    <div className={`pipeline-connector${active ? ' active' : ''}`}>
      <span className="pipeline-particle" />
      <span className="pipeline-particle" />
      <span className="pipeline-particle" />
    </div>
  );
}

/* ── Drain3 micro visualization ───────────────────────────── */
function Drain3Visual() {
  const [idx, setIdx] = useState(0);
  const examples = [
    { raw: 'Failed password for root from 192.168.1.45 port 22', parsed: 'Failed password for <*> from <*> port <*>' },
    { raw: 'OOM killer triggered pid 3847 memory 98%', parsed: 'OOM killer triggered pid <*> memory <*>' },
    { raw: 'Connection refused from 10.0.0.12:5432', parsed: 'Connection refused from <*>' },
  ];

  useEffect(() => {
    const iv = setInterval(() => setIdx(p => (p + 1) % examples.length), 4000);
    return () => clearInterval(iv);
  }, []);

  const ex = examples[idx];

  return (
    <div className="pipeline-node-visual">
      <div style={{ marginBottom: 6, color: 'var(--text-dim)', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.04em' }}>
        INPUT
      </div>
      <div style={{ color: 'var(--text-secondary)', fontSize: '0.64rem', marginBottom: 8, wordBreak: 'break-all', transition: 'opacity 0.3s', minHeight: '1.3em' }}>
        {ex.raw}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ color: 'var(--cyan)', fontSize: '0.8rem' }}>↓</span>
        <span style={{ color: 'var(--text-dim)', fontSize: '0.58rem', fontWeight: 600 }}>TEMPLATE</span>
      </div>
      <div style={{ color: 'var(--cyan)', fontSize: '0.64rem', wordBreak: 'break-all', transition: 'opacity 0.3s', minHeight: '1.3em' }}>
        {ex.parsed.split(/(<\*>)/g).map((part, i) =>
          part === '<*>' ? <span key={i} className="highlight" style={{ animation: 'pulse-glow 2s ease infinite' }}>{'<*>'}</span> : part
        )}
      </div>
    </div>
  );
}

/* ── TF-IDF micro visualization ───────────────────────────── */
function TfidfVisual() {
  return (
    <div className="pipeline-node-visual">
      <div style={{ marginBottom: 8, color: 'var(--text-dim)', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.04em' }}>
        SCORING
      </div>
      {[
        { label: 'failed password', score: 85, color: 'var(--red)' },
        { label: 'oom killer', score: 72, color: 'var(--amber)' },
        { label: 'session opened', score: 12, color: 'var(--text-dim)' },
      ].map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < 2 ? 6 : 0 }}>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', width: 90, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.label}
          </span>
          <div className="score-bar" style={{ flex: 1 }}>
            <div
              className="score-bar-fill"
              style={{
                background: item.color,
                width: `${item.score}%`,
                animation: `score-fill 3s ease-in-out infinite alternate`,
                animationDelay: `${i * 0.4}s`,
                boxShadow: `0 0 6px ${item.color}`,
              }}
            />
          </div>
          <span style={{ fontSize: '0.58rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', width: 30, textAlign: 'right' }}>
            0.{item.score}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── T5 AI micro visualization ────────────────────────────── */
function T5Visual() {
  const [text, setText] = useState('');
  const fullText = 'Critical: Multiple SSH brute-force attacks detected targeting root credentials...';

  useEffect(() => {
    let i = 0;
    setText('');
    const iv = setInterval(() => {
      i++;
      setText(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(iv);
        setTimeout(() => {
          setText('');
          i = 0;
          // restart
          const iv2 = setInterval(() => {
            i++;
            setText(fullText.slice(0, i));
            if (i >= fullText.length) clearInterval(iv2);
          }, 45);
        }, 2000);
      }
    }, 45);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="pipeline-node-visual">
      <div style={{ marginBottom: 6, color: 'var(--text-dim)', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.04em' }}>
        AI VERDICT
      </div>
      <div style={{ color: 'var(--green)', fontSize: '0.64rem', minHeight: '2.6em', lineHeight: 1.5 }}>
        {text}
        <span className="typing-cursor" />
      </div>
    </div>
  );
}

/* ── Main Pipeline Waterfall Component ─────────────────────── */
export default function PipelineWaterfall({ analyzing }) {
  const [activePhase, setActivePhase] = useState(-1);

  useEffect(() => {
    if (!analyzing) {
      setActivePhase(-1);
      return;
    }
    // Simulate pipeline progression during analysis
    setActivePhase(0);
    const t1 = setTimeout(() => setActivePhase(1), 1200);
    const t2 = setTimeout(() => setActivePhase(2), 2800);
    const t3 = setTimeout(() => setActivePhase(-1), 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [analyzing]);

  return (
    <div className="waterfall-panel">
      <div className="waterfall-header">
        <h3>How It Works</h3>
      </div>

      <div className="waterfall-content">
        <div className="pipeline-flow">
          {/* ── Phase 1: Drain3 ──────────────────────── */}
          <div className={`pipeline-node${activePhase === 0 ? ' active' : ''}`}>
            <div className="pipeline-node-header">
              <div className="pipeline-node-dot drain3" />
              <span className="pipeline-node-title">Drain3</span>
              <span className="pipeline-node-phase">Phase 1</span>
            </div>
            <p className="pipeline-node-desc">
              Extracts structural templates from raw logs, replacing dynamic values with wildcards.
            </p>
            <Drain3Visual />
          </div>

          {/* Connector */}
          <Connector active={analyzing && activePhase >= 0} />

          {/* ── Phase 2: TF-IDF ──────────────────────── */}
          <div className={`pipeline-node${activePhase === 1 ? ' active' : ''}`}>
            <div className="pipeline-node-header">
              <div className="pipeline-node-dot tfidf" />
              <span className="pipeline-node-title">TF-IDF Scoring</span>
              <span className="pipeline-node-phase">Phase 2</span>
            </div>
            <p className="pipeline-node-desc">
              Ranks templates by rarity. Critical keywords get boosted scores.
            </p>
            <TfidfVisual />
          </div>

          {/* Connector */}
          <Connector active={analyzing && activePhase >= 1} />

          {/* ── Phase 3: T5 AI ───────────────────────── */}
          <div className={`pipeline-node${activePhase === 2 ? ' active' : ''}`}>
            <div className="pipeline-node-header">
              <div className="pipeline-node-dot t5" />
              <span className="pipeline-node-title">T5 Summarizer</span>
              <span className="pipeline-node-phase">Phase 3</span>
            </div>
            <p className="pipeline-node-desc">
              AI generates a human-readable verdict from the top-ranked anomalies.
            </p>
            <T5Visual />
          </div>
        </div>
      </div>
    </div>
  );
}
