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

export default function ClusterList({ clusters, onInvestigate }) {
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
            const { found } = getScoreBreakdown(c);

            return (
              <div
                key={i}
                className={`story-card story-card-${sev.level}`}
                style={{ 
                  animationDelay: `${0.15 + i * 0.08}s`,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: '12px 16px',
                  gap: '16px'
                }}
              >
                {/* Severity stripe */}
                <div className="story-card-stripe" style={{ background: sev.color }} />

                {/* Severity Badge */}
                <div style={{ width: 85, flexShrink: 0 }}>
                  <span className="story-severity-tag" style={{ color: sev.color, borderColor: `${sev.color}44`, background: `${sev.color}10`, width: '100%', justifyContent: 'center' }}>
                    {sev.label}
                  </span>
                </div>

                {/* Score */}
                <Tooltip label="TF-IDF importance + keyword boost" withArrow>
                  <div style={{ width: 50, fontWeight: 700, color: sev.color, fontSize: '0.9rem', flexShrink: 0 }}>
                    {(c.importance_score || 0).toFixed(3)}
                  </div>
                </Tooltip>

                {/* Log Count Multiplier */}
                <Tooltip label="Number of identical logs compressed into this cluster" withArrow>
                  <div style={{ padding: '2px 8px', borderRadius: 4, background: 'var(--surface-darker)', border: '1px solid var(--border-color)', color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>
                    x{c.size || 1}
                  </div>
                </Tooltip>

                {/* Technical Template View */}
                <div style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  <div className="story-card-template" style={{ margin: 0, display: 'inline-block', fontSize: '0.85rem' }}>
                    {(c.template || '').split(/(<\*>)/g).map((part, j) =>
                      part === '<*>' ? (
                        <span key={j} className="wildcard-token">{part}</span>
                      ) : part
                    )}
                  </div>
                </div>

                {/* Threat Triggers */}
                {found.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Triggers:</span>
                    {found.slice(0, 2).map(kw => (
                      <span key={kw} className="story-keyword-tag" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>{kw}</span>
                    ))}
                  </div>
                )}

                {/* Investigate button */}
                <button
                  className="story-investigate-btn"
                  onClick={() => openDecoder(c, i)}
                  style={{ borderColor: `${sev.color}33`, color: sev.color, padding: '4px 12px', marginTop: 0, flexShrink: 0 }}
                >
                  <Eye size={12} />
                  Investigate
                </button>
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
