import { useState, useCallback } from 'react';
import { Progress, SegmentedControl, Tooltip } from '@mantine/core';
import { Search, ChevronRight, AlertTriangle, ShieldCheck, Eye } from 'lucide-react';
import { getPlainEnglish, getScoreBreakdown } from '../../utils/severity';
import InsightDecoder from './InsightDecoder';

/**
 * StoryCards — Replaces the old ClusterList with narrative "Story Cards"
 * Each cluster becomes a visual card with severity border, headline,
 * brief narrative, and an "Investigate" button that opens the InsightDecoder.
 */

function getCardSeverity(score) {
  if (score >= 1.4) return { level: 'critical', color: 'var(--red)', label: 'CRITICAL' };
  if (score >= 0.7) return { level: 'warning', color: 'var(--amber)', label: 'WARNING' };
  if (score >= 0.35) return { level: 'degraded', color: 'var(--violet)', label: 'DEGRADED' };
  return { level: 'nominal', color: 'var(--cyan)', label: 'NOMINAL' };
}

function getHeadline(cluster) {
  const t = ((cluster.template || '') + ' ' + (cluster.original_log || '')).toLowerCase();
  if (t.includes('failed password') || t.includes('authentication fail'))
    return 'Brute Force Intrusion Attempt';
  if (t.includes('invalid user'))
    return 'Unknown Identity Login Probe';
  if (t.includes('out of memory') || t.includes('kill process') || t.includes(' oom'))
    return 'Memory Exhaustion Crisis';
  if (t.includes('deadlock'))
    return 'Database Deadlock Cascade';
  if (t.includes('no space') || t.includes('disk quota'))
    return 'Storage Capacity Critical';
  if (t.includes('kernel panic'))
    return 'Kernel Crash Event';
  if (t.includes('null pointer') || t.includes('segfault'))
    return 'Illegal Memory Access';
  if (t.includes('throttled') || t.includes('temperature'))
    return 'Thermal Throttling Active';
  if (t.includes('watchdog'))
    return 'Watchdog Service Kill';
  if (t.includes('ssl') || t.includes('certificate'))
    return 'Certificate Security Failure';
  if (t.includes('500') || t.includes('502') || t.includes('503'))
    return 'Server Error Cascade';
  if (t.includes('connection refused'))
    return 'Service Refusing Connections';
  if (t.includes('slow query'))
    return 'Query Latency Anomaly';
  if (t.includes('timeout'))
    return 'Timeout Threshold Breach';
  if (t.includes('heartbeat') || t.includes('session'))
    return 'Routine Health Signal';
  return 'Anomalous Pattern Detected';
}

export default function StoryCards({ clusters, onInvestigate }) {
  const [viewMode, setViewMode] = useState('Processed Logs');
  const [decoderCluster, setDecoderCluster] = useState(null);
  const [decoderIndex, setDecoderIndex] = useState(0);

  const openDecoder = useCallback((cluster, idx) => {
    setDecoderCluster(cluster);
    setDecoderIndex(idx);
    if (onInvestigate) onInvestigate();
  }, [onInvestigate]);

  const closeDecoder = useCallback(() => {
    setDecoderCluster(null);
  }, []);

  if (!clusters?.length) return null;

  return (
    <>
      <div className="card" style={{ animation: 'fadeUp 0.45s ease forwards', animationDelay: '0.15s', opacity: 0 }}>
        {/* Header */}
        <div className="story-cards-header">
          <div className="story-cards-title-row">
            <span className="card-title">Threat Intelligence</span>
            <span className="story-count-badge">{clusters.length} clusters</span>
          </div>

          <SegmentedControl
            size="xs"
            value={viewMode}
            onChange={setViewMode}
            data={[
              { label: 'Processed Logs', value: 'Processed Logs' },
              { label: 'Raw Logs', value: 'Raw Logs' },
            ]}
          />
        </div>

        {/* Legend */}
        <div className="story-legend">
          {[
            { color: 'var(--red)', label: 'Critical', count: clusters.filter(c => (c.importance_score || 0) >= 1.4).length },
            { color: 'var(--amber)', label: 'Warning', count: clusters.filter(c => (c.importance_score || 0) >= 0.7 && (c.importance_score || 0) < 1.4).length },
            { color: 'var(--violet)', label: 'Degraded', count: clusters.filter(c => (c.importance_score || 0) >= 0.35 && (c.importance_score || 0) < 0.7).length },
            { color: 'var(--cyan)', label: 'Nominal', count: clusters.filter(c => (c.importance_score || 0) < 0.35).length },
          ].map(l => (
            <span key={l.label} className="story-legend-item">
              <span className="story-legend-dot" style={{ background: l.color, boxShadow: `0 0 6px ${l.color}` }} />
              {l.label}: {l.count}
            </span>
          ))}
        </div>

        {/* Cards grid */}
        <div className="story-cards-grid">
          {clusters.map((c, i) => {
            const sev = getCardSeverity(c.importance_score || 0);
            const max = clusters[0].importance_score || 1;
            const pct = Math.min(100, ((c.importance_score || 0) / max) * 100);
            const { found } = getScoreBreakdown(c);
            const headline = getHeadline(c);
            const narrative = getPlainEnglish(c);

            return (
              <div
                key={i}
                className={`story-card story-card-${sev.level}`}
                style={{ animationDelay: `${0.15 + i * 0.08}s` }}
              >
                {/* Severity stripe */}
                <div className="story-card-stripe" style={{ background: sev.color }} />

                {/* Content */}
                <div className="story-card-body">
                  {/* Top row: severity + score */}
                  <div className="story-card-meta">
                    <span className="story-severity-tag" style={{ color: sev.color, borderColor: `${sev.color}44`, background: `${sev.color}10` }}>
                      {sev.label}
                    </span>
                    <Tooltip label="TF-IDF importance + keyword boost" withArrow>
                      <span className="story-card-score" style={{ color: sev.color }}>
                        {(c.importance_score || 0).toFixed(3)}
                      </span>
                    </Tooltip>
                  </div>

                  {/* Headline */}
                  <h4 className="story-card-headline">{headline}</h4>

                  {/* Narrative or technical view */}
                  {viewMode === 'Processed Logs' ? (
                    <p className="story-card-narrative">{narrative}</p>
                  ) : (
                    <div className="story-card-template">
                      {(c.template || '').split(/(<\*>)/g).map((part, j) =>
                        part === '<*>' ? (
                          <span key={j} className="wildcard-token">{part}</span>
                        ) : part
                      )}
                    </div>
                  )}

                  {/* Score bar */}
                  <Progress
                    value={pct}
                    size={3}
                    radius={4}
                    styles={{ section: { background: sev.color, boxShadow: `0 0 4px ${sev.color}40`, transition: 'width 0.8s ease' } }}
                  />

                  {/* Keywords found */}
                  {found.length > 0 && (
                    <div className="story-card-keywords">
                      <AlertTriangle size={10} />
                      {found.slice(0, 3).map(kw => (
                        <span key={kw} className="story-keyword-tag">{kw}</span>
                      ))}
                    </div>
                  )}

                  {/* Investigate button */}
                  <button
                    className="story-investigate-btn"
                    onClick={() => openDecoder(c, i)}
                    style={{ borderColor: `${sev.color}33`, color: sev.color }}
                  >
                    <Eye size={12} />
                    Investigate
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Insight Decoder Modal */}
      {decoderCluster && (
        <InsightDecoder
          cluster={decoderCluster}
          index={decoderIndex}
          onClose={closeDecoder}
        />
      )}
    </>
  );
}
