import { useEffect, useState, useRef } from 'react';
import { ArrowRight, ArrowDown, ArrowLeft, Terminal, Cpu, Activity, Zap, Brain } from 'lucide-react';
import TechDecoderModal, { TechHubWidget } from './TechHub';

/* ── Phase 1: Drain3 (High Density Rolling Logs) ─────── */
function Drain3Visual() {
  const [logs, setLogs] = useState([
    { id: 1, text: 'AUTHENTICATION_FAILURE: root from 192.168.1.45', parsed: 'AUTH_FAIL: root from <*>' },
    { id: 2, text: 'KERNEL_LOG: OOM killer triggered memory 98%', parsed: 'KERNEL_LOG: OOM killer <*>' }
  ]);

  useEffect(() => {
    const raw = [
      'SYSTEM_WARN: CPU temp exceeded 85C',
      'ACCESS_DENIED: User sarthak on /etc/shadow',
      'NETWORK_INFO: Incoming TCP on port 22',
      'DISK_ALERT: I/O wait spike on sda1'
    ];
    const parsed = [
      'SYSTEM_WARN: CPU temp <*>',
      'ACCESS_DENIED: User <*> on <*>',
      'NETWORK_INFO: Incoming <*> on port <*>',
      'DISK_ALERT: I/O wait spike on <*>'
    ];

    const iv = setInterval(() => {
      setLogs(prev => {
        const nextIdx = Math.floor(Math.random() * raw.length);
        const newLog = { id: Date.now(), text: raw[nextIdx], parsed: parsed[nextIdx] };
        return [newLog, ...prev.slice(0, 2)];
      });
    }, 2500);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="engine-node-visual density-high">
      <div className="rolling-logs">
        {logs.map((l, i) => (
          <div key={l.id} className="rolling-log-entry" style={{ opacity: 1 - i * 0.3 }}>
            <div className="log-line raw">{l.text}</div>
            <div className="log-line parsed">{l.parsed}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Phase 2: TF-IDF (High Density Histogram) ───────── */
function TfidfVisual() {
  const [points, setPoints] = useState(Array.from({ length: 12 }, () => Math.random() * 100));

  useEffect(() => {
    const iv = setInterval(() => {
      setPoints(prev => [...prev.slice(1), Math.random() * 100]);
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="engine-node-visual density-high">
      <div className="tfidf-histogram">
        {points.map((p, i) => (
          <div key={i} className="hist-bar" style={{ height: `${p}%`, opacity: 0.3 + (i / 12) * 0.7 }} />
        ))}
      </div>
      <div className="tfidf-stats">
        <span className="stat-label">Anomaly Density:</span>
        <span className="stat-value">{(points[11] / 100).toFixed(2)}</span>
      </div>
    </div>
  );
}

/* ── Phase 3: T5 AI (Neural Decode Visual) ───────────── */
function T5Visual() {
  const [pulse, setPulse] = useState(0);
  const [decode, setDecode] = useState('');
  const msg = "THREAT_ANALYSIS: Potential unauthorized root access via brute force.";

  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      setDecode(msg.slice(0, i));
      i = (i + 1) % (msg.length + 30);
      setPulse(p => (p + 1) % 10);
    }, 60);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="engine-node-visual density-high">
      <div className="neural-decode-bg">
        <div className={`neural-pulse pulse-${pulse}`} />
      </div>
      <div className="decode-terminal">
        <Terminal size={10} className="term-icon" />
        <span className="decode-text">{decode}</span>
      </div>
    </div>
  );
}

export default function PipelineEngine() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="pipeline-engine">
      <div className="engine-grid">
        
        {/* Q1: Drain3 */}
        <div className="engine-node q1">
          <div className="engine-node-header">
            <Cpu size={14} className="node-icon drain3" />
            <span className="engine-label">DRAIN3</span>
          </div>
          <div className="engine-title">Log Clustering</div>
          <Drain3Visual />
          
          <div className="engine-connector h-flow">
            <div className="flow-line" />
            <div className="flow-pulse" />
            <ArrowRight size={14} className="flow-arrow" />
          </div>
        </div>

        {/* Q2: TF-IDF */}
        <div className="engine-node q2">
          <div className="engine-node-header">
            <Activity size={14} className="node-icon tfidf" />
            <span className="engine-label">TF-IDF</span>
          </div>
          <div className="engine-title">Anomaly Scoring</div>
          <TfidfVisual />

          <div className="engine-connector v-flow">
            <div className="flow-line" />
            <div className="flow-pulse-v" />
            <ArrowDown size={14} className="flow-arrow" />
          </div>
        </div>

        {/* Q4: Tech Hub */}
        <div className="engine-node q4">
          <TechHubWidget onOpen={() => setIsModalOpen(true)} />
          <div className="engine-connector v-flow-up">
            <div className="flow-line" />
          </div>
        </div>

        {/* Q3: T5 AI */}
        <div className="engine-node q3">
          <div className="engine-node-header">
            <Brain size={14} className="node-icon t5" />
            <span className="engine-label">T5 AI MODEL</span>
          </div>
          <div className="engine-title">Threat Interpretation</div>
          <T5Visual />

          <div className="engine-connector h-flow-rev">
            <div className="flow-line" />
            <div className="flow-pulse-rev" />
            <ArrowLeft size={14} className="flow-arrow" />
          </div>
        </div>

      </div>

      {/* Render modal at root to escape CSS stacking context */}
      <TechDecoderModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
