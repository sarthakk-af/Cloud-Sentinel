import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Upload, Shield, Radio, RotateCcw, ChevronDown } from 'lucide-react';

import Footer from './components/layout/Footer';
import FileUploadTab from './components/tabs/FileUploadTab';
import DemoScenariosTab from './components/tabs/DemoScenariosTab';
import LiveStreamTab from './components/tabs/LiveStreamTab';
import DatasetReplayTab from './components/tabs/DatasetReplayTab';

import ResultsPanel from './components/dashboard/ResultsPanel';
import PipelineEngine from './components/pipeline/PipelineEngine';
import DigitalRain from './components/effects/DigitalRain';

import { useStreamConnection } from './hooks/useStreamConnection';
import { API } from './utils/constants';

import './index.css';

const MODES = [
  { key: 'upload', icon: Upload,    label: 'Upload Log File',   desc: 'Drop a .log or .txt file and let the AI pipeline dissect it.' },
  { key: 'demo',   icon: Shield,    label: 'Threat Library',    desc: 'Run pre-crafted attack scenarios through the analysis engine.' },
  { key: 'live',   icon: Radio,     label: 'Live Feed',         desc: 'Connect to a real-time log stream and monitor threats live.' },
  { key: 'replay', icon: RotateCcw, label: 'Dataset Replay',    desc: 'Replay a historical dataset through the full AI pipeline.' },
];

const STEPS = [
  { id: '01', title: 'Feed the Sentinel', text: 'Upload logs or pick a scenario.' },
  { id: '02', title: 'Watch the Brain', text: 'AI hunts for hidden anomalies.' },
  { id: '03', title: 'Get the Story', text: 'Read clear threat intelligence.' },
];

/* ── localStorage helpers ──────────────────────────────── */
const ANOMALY_KEY = 'sentinel_anomalies_solved';
function loadAnomalies() {
  try { return parseInt(localStorage.getItem(ANOMALY_KEY), 10) || 0; } catch { return 0; }
}
function saveAnomalies(n) {
  try { localStorage.setItem(ANOMALY_KEY, String(n)); } catch { /**/ }
}

export default function App() {
  const [tab, setTab]                        = useState('upload');
  const [results, setResults]                = useState(null);
  const [analyzing, setAnalyzing]            = useState(false);
  const [activeScenario, setActiveScenario]  = useState(null);
  const [anomaliesSolved, setAnomaliesSolved] = useState(loadAnomalies);

  const workspaceRef = useRef(null);
  const contentRef = useRef(null);
  const resultsRef = useRef(null);
  const stream = useStreamConnection();

  const incrementAnomalies = useCallback(() => {
    setAnomaliesSolved(prev => { const n = prev + 1; saveAnomalies(n); return n; });
  }, []);

  // Auto-scroll to results when an analysis begins
  useEffect(() => {
    if (analyzing) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [analyzing]);

  const reset = useCallback(() => { setResults(null); setActiveScenario(null); }, []);

  const switchTab = useCallback((t) => {
    if (stream.isStreaming) stream.stopStream();
    setTab(t);
    reset();
    
    // Smoothly scroll down to the tab content area
    setTimeout(() => {
      contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, [stream.isStreaming, stream.stopStream, reset]);

  useEffect(() => { if (stream.streamResults) setResults(stream.streamResults); }, [stream.streamResults]);

  useEffect(() => {
    let iv = null;
    if (results?.status === 'processing') {
      iv = setInterval(async () => {
        try {
          const r = await axios.get(`${API}/api/results`);
          if (r.data.status === 'complete' || r.data.status === 'error') {
            setResults(r.data); setAnalyzing(false); clearInterval(iv);
          } else { setResults(p => ({ ...p, ...r.data })); }
        } catch { /**/ }
      }, 1000);
    }
    return () => { if (iv) clearInterval(iv); };
  }, [results?.status]);

  const scrollToWorkspace = () => {
    workspaceRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="app-page">
      <DigitalRain />

      {/* ══════════════════════════════════════════════════════
          SECTION 1 — LANDING HERO (full viewport)
          ══════════════════════════════════════════════════════ */}
      <section className="landing-hero">
        {/* Minimal top brand */}
        <div className="landing-topbar">
          <div className="landing-brand">
            <div className="landing-brand-icon"><Shield size={16} /></div>
            <span>Cloud Sentinel</span>
          </div>
        </div>

        {/* Hero split: left text + right Engine Grid */}
        <div className="landing-split engine-mode">
          {/* ── Left: Narrative & Steps ──────────── */}
          <div className="landing-text">
            <h1 className="landing-title">
              Messy Logs In.<br/>
              <span className="landing-title-accent">Clear Intelligence Out.</span>
            </h1>
            <p className="landing-desc">
              Every second, your systems are "talking"—writing thousands of messy log lines. 
              Most are boring, but hidden inside are the footprints of hackers. 
              Cloud Sentinel is an AI detective that reads those messy records, 
              throws away the junk, and explains threats in plain English.
            </p>

            <div className="landing-steps horizontal">
              {STEPS.map(s => (
                <div key={s.id} className="landing-step-item">
                  <span className="landing-step-id">{s.id}</span>
                  <div className="landing-step-content">
                    <div className="landing-step-title">{s.title}</div>
                    <div className="landing-step-text">{s.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="landing-actions">
              <div className="scroll-hint big" onClick={scrollToWorkspace}>
                <div className="scroll-hint-line" />
                <span>Scroll to explore workspace</span>
                <ChevronDown size={14} className="scroll-chevron" />
              </div>
            </div>
          </div>

          {/* ── Right: Clockwise Engine ── */}
          <div className="landing-engine-container">
            <PipelineEngine />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 2 — WORKSPACE (below the fold)
          ══════════════════════════════════════════════════════ */}
      <section className="workspace" id="workspace" ref={workspaceRef}>
        {/* Workspace header */}
        <div className="workspace-header">
          <h2 className="workspace-title">Choose Your Analysis Mode</h2>
          <p className="workspace-subtitle">
            Select how you want to feed logs into the AI pipeline
          </p>
        </div>

        {/* Mode cards */}
        <div className="mode-cards">
          {MODES.map(m => {
            const Icon = m.icon;
            return (
              <button
                key={m.key}
                id={`tab-${m.key}`}
                className={`mode-card${tab === m.key ? ' active' : ''}`}
                onClick={() => switchTab(m.key)}
              >
                <div className="mode-card-icon"><Icon size={22} /></div>
                <div className="mode-card-label">{m.label}</div>
                <div className="mode-card-desc">{m.desc}</div>
                {tab === m.key && <div className="mode-card-active-dot" />}
              </button>
            );
          })}
        </div>

        {/* Active tab content + Results */}
        <div className="workspace-content" ref={contentRef} style={{ position: 'relative', scrollMarginTop: '80px' }}>
          {tab === 'upload' && (
            <FileUploadTab onResults={setResults} analyzing={analyzing} setAnalyzing={setAnalyzing} />
          )}
          {tab === 'demo' && (
            <DemoScenariosTab onResults={setResults} analyzing={analyzing} setAnalyzing={setAnalyzing}
              activeScenario={activeScenario} setActiveScenario={setActiveScenario} />
          )}
          {tab === 'live' && (
            <LiveStreamTab isStreaming={stream.isStreaming} terminalLogs={stream.terminalLogs}
              injectingScenario={stream.injectingScenario} startStream={stream.startStream}
              stopStream={stream.stopStream} handleInject={stream.handleInject}
              cancelInject={stream.cancelInject} />
          )}
          {tab === 'replay' && (
            <DatasetReplayTab onResults={setResults} analyzing={analyzing} setAnalyzing={setAnalyzing} />
          )}

          <div ref={resultsRef} style={{ scrollMarginTop: '20px' }}>
            <ResultsPanel results={results} onInvestigate={incrementAnomalies} />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
