import { Zap } from 'lucide-react';
import StatsGrid from './StatsGrid';
import SummaryBox from './SummaryBox';
import HealthGauge from './HealthGauge';
import ClusterList from './ClusterList';

export default function ResultsPanel({ results }) {
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

  const clusters = results.top_clusters || [];

  return (
    <div style={{ animation: 'fadeUp 0.4s ease forwards', marginTop: 24 }}>
      <div className="section-divider">
        <span className="section-divider-label">Analysis Results</span>
        <div className="section-divider-line" />
      </div>
      <StatsGrid results={results} />
      <SummaryBox summary={results.ai_summary} />
      <HealthGauge summary={results.ai_summary} clusters={clusters} />
      <ClusterList clusters={clusters} />
    </div>
  );
}
