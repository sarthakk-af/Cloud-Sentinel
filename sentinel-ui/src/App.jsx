import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Upload, Shield, Radio, RotateCcw } from 'lucide-react';

import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

import FileUploadTab from './components/tabs/FileUploadTab';
import DemoScenariosTab from './components/tabs/DemoScenariosTab';
import LiveStreamTab from './components/tabs/LiveStreamTab';
import DatasetReplayTab from './components/tabs/DatasetReplayTab';

import ResultsPanel from './components/dashboard/ResultsPanel';
import PipelineWaterfall from './components/pipeline/PipelineWaterfall';

import { useStreamConnection } from './hooks/useStreamConnection';
import { API } from './utils/constants';

import './index.css';

const MODES = [
  { key: 'upload', icon: Upload,     label: 'Upload' },
  { key: 'demo',   icon: Shield,     label: 'Threat Library' },
  { key: 'live',   icon: Radio,      label: 'Live Feed' },
  { key: 'replay', icon: RotateCcw,  label: 'Replay' },
];

export default function App() {
  const [tab, setTab]                 = useState('upload');
  const [results, setResults]         = useState(null);
  const [analyzing, setAnalyzing]     = useState(false);
  const [activeScenario, setActiveScenario] = useState(null);

  const stream = useStreamConnection();

  const reset = useCallback(() => {
    setResults(null);
    setActiveScenario(null);
  }, []);

  const switchTab = useCallback((t) => {
    if (stream.isStreaming) stream.stopStream();
    setTab(t);
    reset();
  }, [stream.isStreaming, stream.stopStream, reset]);

  useEffect(() => {
    if (stream.streamResults) setResults(stream.streamResults);
  }, [stream.streamResults]);

  useEffect(() => {
    let iv = null;
    if (results?.status === 'processing') {
      iv = setInterval(async () => {
        try {
          const r = await axios.get(`${API}/api/results`);
          if (r.data.status === 'complete' || r.data.status === 'error') {
            setResults(r.data);
            setAnalyzing(false);
            clearInterval(iv);
          } else {
            setResults(p => ({ ...p, ...r.data }));
          }
        } catch { /**/ }
      }, 1000);
    }
    return () => { if (iv) clearInterval(iv); };
  }, [results?.status]);

  return (
    <div className="app-shell">
      <Navbar isStreaming={stream.isStreaming} activeTab={tab} />

      <div className="content-split">
        <div className="main-panel">
          <div className="mode-selector">
            {MODES.map(m => {
              const Icon = m.icon;
              return (
                <button
                  key={m.key}
                  id={`tab-${m.key}`}
                  className={`mode-btn${tab === m.key ? ' active' : ''}`}
                  onClick={() => switchTab(m.key)}
                >
                  <span className="mode-btn-icon"><Icon size={16} /></span>
                  <span className="mode-btn-label">{m.label}</span>
                </button>
              );
            })}
          </div>

          <div className="main-panel-scroll">
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
            <ResultsPanel results={results} />
          </div>
        </div>

        <PipelineWaterfall analyzing={analyzing || stream.isStreaming} />
      </div>

      <Footer />
    </div>
  );
}
