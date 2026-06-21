import { Zap, AlertTriangle, ChevronRight } from 'lucide-react';
import StatsGrid from './StatsGrid';
import HealthGauge from './HealthGauge';
import ClusterList from './ClusterList';

export default function ResultsPanel({ results, onInvestigate }) {
  if (!results) {
    return (
      <div className="empty-state" style={{ marginTop: 32 }}>
        <div className="empty-state-icon"><Zap size={28} /></div>
        <div className="empty-state-title">Awaiting Analysis</div>
        <div className="empty-state-desc">
          Upload a log file, select a threat scenario, or connect to the live feed to see results here.
        </div>
      </div>
    );
  }

  if (results.status === 'processing') {
    return (
      <div className="empty-state" style={{ marginTop: 32, animation: 'fadeUp 0.4s ease forwards' }}>
        <div className="empty-state-icon" style={{ animation: 'pulse-glow 2s infinite', color: 'var(--cyan)' }}>
          <Zap size={28} />
        </div>
        <div className="empty-state-title" style={{ color: 'var(--cyan)' }}>Neural Engine Processing</div>
        <div className="empty-state-desc">
          The AI is currently analyzing the logs. Please wait...
        </div>
      </div>
    );
  }

  const clusters = results.top_clusters || [];

  return (
    <div style={{ animation: 'fadeUp 0.4s ease forwards', marginTop: 24 }}>
      <div className="section-divider">
        <span className="section-divider-label">Analysis Results</span>
        <div className="section-divider-line" />
      </div>
      {/* 1. The Pipeline Story */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--cyan)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>Phase 1: Data Pipeline</div>
        <div className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(90deg, rgba(30,35,45,1) 0%, rgba(20,25,35,1) 100%)' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1 }}>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 600, marginBottom: 8 }}>Raw Ingestion</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{results.total_logs || results.new_logs_chunk || 0}</div>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: 4 }}>Logs Processed</div>
          </div>

          <div style={{ color: 'var(--cyan)', opacity: 0.5, flexShrink: 0 }}>
            <ChevronRight size={24} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1 }}>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 600, marginBottom: 8 }}>AI Clustering (Drain3)</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--violet)', lineHeight: 1 }}>{results.unique_templates || results.total_unique_templates || 0}</div>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: 4 }}>Unique Patterns Extracted</div>
          </div>

          <div style={{ color: 'var(--cyan)', opacity: 0.5, flexShrink: 0 }}>
            <ChevronRight size={24} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1 }}>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 600, marginBottom: 8 }}>Threat Analysis</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--green)', lineHeight: 1 }}>{results.processing_time_ms}</div>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: 4 }}>Milliseconds Elapsed</div>
          </div>

        </div>
      </div>

      {/* 2. The Conclusion */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--cyan)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>Phase 2: Executive Conclusion</div>
        <HealthGauge status={results.system_status} score={results.threat_score} clusters={clusters} summary={results.ai_summary} />
      </div>

      {/* 3. The Evidence */}
      <div>
        <div style={{ fontSize: '0.8rem', color: 'var(--cyan)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>Phase 3: Forensic Evidence</div>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: 16 }}>The following anomalous patterns were extracted from the logs and triggered the conclusion above.</p>
        <ClusterList clusters={clusters} onInvestigate={onInvestigate} />
      </div>
    </div>
  );
}
