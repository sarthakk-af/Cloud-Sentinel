import { useEffect, useState, useRef } from 'react';
import { Funnel, BarChart3, Brain, ChevronDown } from 'lucide-react';
import SecurityTipWidget from './SecurityTipWidget';

/* ── Particle dots that flow between nodes ────────────────── */
function Connector({ active }) {
  return (
    <div className={`pipeline-connector${active ? ' active' : ''}`}>
      <span className="pipeline-particle" />
      <span className="pipeline-particle" />
      <span className="pipeline-particle" />
      <div className="connector-label">
        <ChevronDown size={10} />
      </div>
    </div>
  );
}

/* ── Drain3 — "The Cleaning Funnel" ───────────────────────── */
function Drain3Visual() {
  const [idx, setIdx] = useState(0);
  const examples = [
    { raw: 'Failed password for root from 192.168.1.45 port 22', parsed: 'Failed password for <*> from <*> port <*>', highlight: 'Variables extracted → wildcards' },
    { raw: 'OOM killer triggered pid 3847 memory 98%', parsed: 'OOM killer triggered pid <*> memory <*>', highlight: 'Dynamic values generalized' },
    { raw: 'Connection refused from 10.0.0.12:5432', parsed: 'Connection refused from <*>', highlight: 'IP address → wildcard' },
  ];

  useEffect(() => {
    const iv = setInterval(() => setIdx(p => (p + 1) % examples.length), 4000);
    return () => clearInterval(iv);
  }, []);

  const ex = examples[idx];

  return (
    <div className="pipeline-node-visual">
      {/* Raw input */}
      <div className="pipeline-visual-section">
        <div className="pipeline-visual-badge raw">RAW INPUT</div>
        <div className="pipeline-visual-log raw-line">{ex.raw}</div>
      </div>

      {/* Funnel animation */}
      <div className="pipeline-funnel">
        <div className="funnel-arrow">
          <Funnel size={14} />
        </div>
        <span className="funnel-label">{ex.highlight}</span>
      </div>

      {/* Clean output */}
      <div className="pipeline-visual-section">
        <div className="pipeline-visual-badge clean">TEMPLATE</div>
        <div className="pipeline-visual-log clean-line">
          {ex.parsed.split(/(<\*>)/g).map((part, i) =>
            part === '<*>' ? (
              <span key={i} className="wildcard-token">{part}</span>
            ) : part
          )}
        </div>
      </div>
    </div>
  );
}

/* ── TF-IDF — "The Rarity Race" ──────────────────────────── */
function TfidfVisual() {
  const [tick, setTick] = useState(0);
  const items = [
    { label: 'failed password', score: 87, color: 'var(--red)', emoji: '🔴' },
    { label: 'oom killer', score: 72, color: 'var(--amber)', emoji: '🟠' },
    { label: 'session opened', score: 15, color: 'var(--text-dim)', emoji: '⚪' },
  ];

  useEffect(() => {
    const iv = setInterval(() => setTick(p => p + 1), 3000);
    return () => clearInterval(iv);
  }, []);

  // Shuffle scores slightly on each tick for the "racing" effect
  const animatedItems = items.map((item, i) => ({
    ...item,
    score: Math.min(95, Math.max(10, item.score + (tick % 2 === 0 ? (i === 0 ? 5 : -3) : (i === 0 ? -3 : 3)))),
  }));

  // Sort by score descending
  const sorted = [...animatedItems].sort((a, b) => b.score - a.score);

  return (
    <div className="pipeline-node-visual">
      <div className="pipeline-visual-badge scoring">RARITY RANKING</div>
      <div className="tfidf-race">
        {sorted.map((item, i) => (
          <div key={item.label} className="tfidf-bar-row" style={{ order: i }}>
            <div className="tfidf-rank" style={{ color: item.color }}>#{i + 1}</div>
            <span className="tfidf-label">{item.label}</span>
            <div className="tfidf-bar-track">
              <div
                className="tfidf-bar-fill"
                style={{
                  width: `${item.score}%`,
                  background: item.color,
                  boxShadow: `0 0 8px ${item.color}60`,
                  transition: 'width 1s cubic-bezier(0.23, 1, 0.32, 1)',
                }}
              />
            </div>
            <span className="tfidf-score">0.{String(item.score).padStart(2, '0')}</span>
          </div>
        ))}
      </div>
      <div className="tfidf-insight">
        <BarChart3 size={10} />
        <span>Rare templates rise to the top — common ones fade</span>
      </div>
    </div>
  );
}

/* ── T5 AI — "The Decoder" ────────────────────────────────── */
function T5Visual() {
  const [phase, setPhase] = useState('template');
  const [text, setText] = useState('');

  const templateText = 'Failed password for <*> from <*> port <*>';
  const decodedText = '🔴 Brute Force Attack detected — multiple failed SSH login attempts from external IP targeting root credentials.';

  useEffect(() => {
    let timer;
    const cycle = () => {
      // Phase 1: Show template
      setPhase('template');
      setText(templateText);

      // Phase 2: Morphing animation
      timer = setTimeout(() => {
        setPhase('morphing');
        setText('');

        // Phase 3: Type out decoded text
        timer = setTimeout(() => {
          setPhase('decoded');
          let i = 0;
          const iv = setInterval(() => {
            i++;
            setText(decodedText.slice(0, i));
            if (i >= decodedText.length) {
              clearInterval(iv);
              // Restart cycle
              timer = setTimeout(cycle, 3000);
            }
          }, 30);
        }, 800);
      }, 2500);
    };

    cycle();
    return () => { clearTimeout(timer); };
  }, []);

  return (
    <div className="pipeline-node-visual">
      <div className="pipeline-visual-badge ai">AI TRANSLATION</div>

      <div className="t5-morph-container">
        {phase === 'template' && (
          <div className="t5-template-line">
            {templateText.split(/(<\*>)/g).map((part, i) =>
              part === '<*>' ? (
                <span key={i} className="wildcard-token">{part}</span>
              ) : <span key={i} className="t5-dim">{part}</span>
            )}
          </div>
        )}

        {phase === 'morphing' && (
          <div className="t5-morphing">
            <Brain size={16} className="t5-brain-icon" />
            <span>Decoding threat intelligence…</span>
          </div>
        )}

        {phase === 'decoded' && (
          <div className="t5-decoded-line">
            {text}
            <span className="typing-cursor" />
          </div>
        )}
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
    <div className="waterfall-panel no-header">
      <div className="waterfall-content">
        <div className="pipeline-flow">
          {/* ── Phase 1: Drain3 ──────────────────────── */}
          <div className={`pipeline-node${activePhase === 0 ? ' active' : ''}`}>
            <div className="pipeline-node-header">
              <div className="pipeline-node-dot drain3" />
              <span className="pipeline-node-title">Drain3</span>
              <span className="pipeline-node-phase">Phase 1 · Cleaning</span>
            </div>
            <p className="pipeline-node-desc">
              Raw logs enter the funnel — variables are extracted, templates emerge.
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
              <span className="pipeline-node-phase">Phase 2 · Ranking</span>
            </div>
            <p className="pipeline-node-desc">
              Templates race by rarity — critical patterns rise to the top.
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
              <span className="pipeline-node-phase">Phase 3 · Decoding</span>
            </div>
            <p className="pipeline-node-desc">
              Cryptic templates transform into clear threat intelligence.
            </p>
            <T5Visual />
          </div>
        </div>
      </div>
    </div>
  );
}
