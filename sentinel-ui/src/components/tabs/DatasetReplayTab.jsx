import { SimpleGrid, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Play } from 'lucide-react';
import axios from 'axios';
import { API } from '../../utils/constants';

const REPLAY_INFO = [
  { label: 'Dataset', value: 'sample_syslog.log' },
  { label: 'Speed', value: 'Turbo (0ms)' },
  { label: 'Max Lines', value: '2,000 logs' },
  { label: 'Pipeline', value: 'Full 3-Phase' },
];

export default function DatasetReplayTab({ onResults, analyzing, setAnalyzing }) {
  const handleReplay = async () => {
    setAnalyzing(true);
    try {
      const r = await axios.get(`${API}/api/replay`);
      onResults(r.data);
    } catch {
      notifications.show({ title: 'Replay failed', message: 'Dataset replay error. Check backend logs.', color: 'red' });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="card" style={{ animation: 'fadeUp 0.4s ease forwards' }}>
      <div className="card-header">
        <span className="card-title">Dataset Replay</span>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
        Run the full 3-phase pipeline against the{' '}
        <span style={{ color: 'var(--text-bright)', fontWeight: 500 }}>BGL Supercomputer Dataset</span>
        {' '}— 2,000 log lines at turbo speed.
      </p>

      <div style={{ padding: 16, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 20 }}>
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
          {REPLAY_INFO.map(d => (
            <div key={d.label}>
              <div className="card-label" style={{ marginBottom: 3 }}>{d.label}</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-bright)' }}>{d.value}</div>
            </div>
          ))}
        </SimpleGrid>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button id="run-replay-btn" className="btn btn-primary" onClick={handleReplay} disabled={analyzing}>
          {analyzing ? ( <><Loader size={14} color="var(--cyan)" /> Replaying…</> ) : ( <><Play size={15} /> Start Replay</> )}
        </button>
      </div>
    </div>
  );
}
