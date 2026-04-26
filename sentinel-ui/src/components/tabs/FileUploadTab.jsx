import { useState } from 'react';
import { Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { FileText, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { API } from '../../utils/constants';

export default function FileUploadTab({ onResults, analyzing, setAnalyzing }) {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

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

      <div
        id="upload-dropzone"
        className={`dropzone${file ? ' has-file' : ''}`}
        onClick={() => document.getElementById('logUpload').click()}
      >
        {file ? (
          <>
            <div style={{ marginBottom: 8, color: 'var(--cyan)' }}><CheckCircle size={32} /></div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-bright)', marginBottom: 4 }}>{file.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {(file.size / 1024).toFixed(1)} KB · Ready · Click to change
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 8, color: 'var(--text-dim)' }}><FileText size={36} /></div>
            <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Drop your log file here
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>.log or .txt files · Click to browse</div>
          </>
        )}
        <input type="file" id="logUpload" style={{ display: 'none' }} accept=".log,.txt" onChange={handleFileChange} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
        <button id="run-analysis-btn" className="btn btn-primary" onClick={handleAnalyze} disabled={!file || analyzing}>
          {analyzing ? ( <><Loader size={14} color="var(--cyan)" /> Processing…</> ) : 'Run Analysis'}
        </button>
      </div>
    </div>
  );
}
