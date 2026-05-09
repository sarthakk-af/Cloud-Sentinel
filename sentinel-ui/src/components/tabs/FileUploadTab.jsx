import { useState, useRef, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { FileText, CheckCircle, Upload, Search, ArrowDown } from 'lucide-react';
import axios from 'axios';
import { API } from '../../utils/constants';
import ScanningBeam from '../effects/ScanningBeam';
import { ScreenRipple } from '../effects/RippleEffect';

/**
 * Detect the log format from sample lines.
 */
function detectFormat(lines) {
  for (const l of lines) {
    if (l.trim().startsWith('{')) return 'JSON Structured Logs';
    if (/^\d{4}-\d{2}-\d{2}/.test(l)) return 'ISO Timestamp Logs';
    if (/^[A-Z][a-z]{2}\s+\d{1,2}\s/.test(l)) return 'Syslog Format';
    if (/^\d+\.\d+\.\d+\.\d+/.test(l)) return 'HTTP Access Logs';
  }
  return 'Raw Text Logs';
}

/**
 * Count critical keywords in sample lines.
 */
function quickScan(lines) {
  const kws = ['error', 'fail', 'critical', 'panic', 'denied', 'timeout', 'kill', 'oom'];
  let hits = 0;
  const lower = lines.join(' ').toLowerCase();
  for (const kw of kws) {
    const matches = lower.split(kw).length - 1;
    hits += matches;
  }
  return hits;
}

export default function FileUploadTab({ onResults, analyzing, setAnalyzing }) {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [dragNear, setDragNear] = useState(false);
  const [showRipple, setShowRipple] = useState(false);

  // Auto-triage state
  const [triageData, setTriageData] = useState(null);
  const [triageAnim, setTriageAnim] = useState(false);

  const inputRef = useRef(null);
  const dropzoneRef = useRef(null);

  /**
   * Process a file for triage — read first few lines, detect format, quick-scan.
   */
  const triageFile = useCallback((f) => {
    setFile(f);
    setTriageAnim(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const allLines = text.split('\n').filter(l => l.trim());
      const sampleLines = allLines.slice(0, 5);
      const format = detectFormat(sampleLines);
      const criticalHits = quickScan(allLines.slice(0, 50));

      // Stagger the triage reveal
      setTimeout(() => {
        setTriageData({
          format,
          totalLines: allLines.length,
          sampleLines,
          criticalHits,
        });
        setTriageAnim(false);
      }, 800);
    };
    reader.readAsText(f.slice(0, 50000)); // Read first 50KB for triage
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) triageFile(e.target.files[0]);
  };

  /* ── Drag & Drop handlers (Symbiotic Portal) ────────── */
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
    setDragNear(true);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only deactivate if leaving the dropzone entirely
    if (dropzoneRef.current && !dropzoneRef.current.contains(e.relatedTarget)) {
      setDragActive(false);
      setDragNear(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setDragNear(false);

    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile) {
      setShowRipple(true);
      triageFile(droppedFile);
    }
  }, [triageFile]);

  const handleAnalyze = async () => {
    if (!file) {
      notifications.show({ title: 'No file selected', message: 'Select a log file to proceed.', color: 'yellow' });
      return;
    }
    setAnalyzing(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await axios.post(`${API}/api/analyze`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onResults(r.data);
    } catch {
      notifications.show({ title: 'Analysis failed', message: 'Cannot reach AI Engine. Verify backend status.', color: 'red' });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="card" style={{ animation: 'fadeUp 0.4s ease forwards' }}>
      <div className="card-header">
        <span className="card-title">Upload Log File</span>
      </div>

      {/* ── Symbiotic Upload Portal ───────────────── */}
      <div
        ref={dropzoneRef}
        id="upload-dropzone"
        className={`dropzone-portal${dragActive ? ' drag-active' : ''}${dragNear ? ' drag-near' : ''}${file ? ' has-file' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Gravitational pull rings */}
        <div className="portal-ring ring-1" />
        <div className="portal-ring ring-2" />
        <div className="portal-ring ring-3" />

        {/* Portal glow core */}
        <div className="portal-core" />

        {/* Content */}
        <div className="portal-content">
          {file ? (
            <>
              <div className="portal-icon success"><CheckCircle size={32} /></div>
              <div className="portal-file-name">{file.name}</div>
              <div className="portal-file-meta">
                {(file.size / 1024).toFixed(1)} KB · Ready · Click to change
              </div>
            </>
          ) : (
            <>
              <div className={`portal-icon${dragActive ? ' pulling' : ''}`}>
                {dragActive ? <ArrowDown size={36} /> : <Upload size={36} />}
              </div>
              <div className="portal-drop-text">
                {dragActive ? 'Release to upload' : 'Drop your log file here'}
              </div>
              <div className="portal-drop-hint">.log or .txt files · Click to browse</div>
            </>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          id="logUpload"
          style={{ display: 'none' }}
          accept=".log,.txt"
          onChange={handleFileChange}
        />
      </div>

      {/* ── Automatic Intelligence Triage ─────────── */}
      {(triageAnim || triageData) && (
        <div className="triage-panel" style={{ animation: 'fadeUp 0.4s ease forwards' }}>
          <div className="triage-header">
            <Search size={14} />
            <span>{triageAnim ? 'Pre-scanning patterns…' : 'Intelligence Triage Complete'}</span>
          </div>

          {triageAnim && (
            <ScanningBeam label="Detecting format…" color="var(--violet)" />
          )}

          {triageData && !triageAnim && (
            <>
              {/* Format + stats row */}
              <div className="triage-stats">
                <div className="triage-stat">
                  <span className="triage-stat-label">Format</span>
                  <span className="triage-stat-value" style={{ color: 'var(--cyan)' }}>
                    {triageData.format}
                  </span>
                </div>
                <div className="triage-stat">
                  <span className="triage-stat-label">Lines</span>
                  <span className="triage-stat-value" style={{ color: 'var(--violet)' }}>
                    {triageData.totalLines.toLocaleString()}
                  </span>
                </div>
                <div className="triage-stat">
                  <span className="triage-stat-label">Threat Keywords</span>
                  <span className="triage-stat-value" style={{ color: triageData.criticalHits > 0 ? 'var(--red)' : 'var(--green)' }}>
                    {triageData.criticalHits > 0 ? `${triageData.criticalHits} found` : 'None detected'}
                  </span>
                </div>
              </div>

              {/* Sample lines preview */}
              <div className="triage-sample">
                <div className="triage-sample-label">Sample Lines</div>
                {triageData.sampleLines.map((line, i) => (
                  <div key={i} className="triage-sample-line">
                    <span className="triage-line-num">{i + 1}</span>
                    {line.length > 100 ? line.slice(0, 100) + '…' : line}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Action Button ────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 20 }}>
        <button id="run-analysis-btn" className="btn btn-primary" onClick={handleAnalyze} disabled={!file || analyzing}>
          {analyzing ? 'Analyzing…' : 'Run Analysis'}
        </button>
        {analyzing && <ScanningBeam label="Processing intelligence…" />}
      </div>

      {/* Screen ripple on dramatic file drop */}
      <ScreenRipple active={showRipple} onComplete={() => setShowRipple(false)} />
    </div>
  );
}
