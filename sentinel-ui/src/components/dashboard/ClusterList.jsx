import { useState } from 'react';
import { Progress, SegmentedControl, Tooltip } from '@mantine/core';
import { getPlainEnglish, getScoreBreakdown } from '../../utils/severity';

export default function ClusterList({ clusters }) {
  const [plainMode, setPlainMode] = useState(false);

  if (!clusters?.length) return null;

  return (
    <div className="card" style={{ animation: 'fadeUp 0.45s ease forwards', animationDelay: '0.15s', opacity: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <span className="card-title">Detected Clusters</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Legend */}
          {[
            { color: 'var(--red)', label: 'Critical', count: clusters.filter((_, i) => i < 2).length },
            { color: 'var(--amber)', label: 'Warning', count: clusters.filter((_, i) => i >= 2 && i < 4).length },
            { color: 'var(--cyan)', label: 'Stable', count: clusters.filter((_, i) => i >= 4).length },
          ].map(l => (
            <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.65rem', color: 'var(--text-dim)' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: l.color, boxShadow: `0 0 4px ${l.color}` }} />
              {l.label}: {l.count}
            </span>
          ))}
        </div>
      </div>

      {/* Toggle */}
      <div style={{ marginBottom: 12 }}>
        <SegmentedControl
          size="xs"
          value={plainMode ? 'decoded' : 'technical'}
          onChange={val => setPlainMode(val === 'decoded')}
          data={[
            { label: 'Technical', value: 'technical' },
            { label: 'Plain English', value: 'decoded' },
          ]}
        />
      </div>

      {/* Cluster list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {clusters.map((c, i) => {
          const max = clusters[0].importance_score || 1;
          const pct = Math.min(100, ((c.importance_score || 0) / max) * 100);
          const { found } = getScoreBreakdown(c);
          const accentColor = i < 2 ? 'var(--red)' : i < 4 ? 'var(--amber)' : 'var(--cyan)';

          return (
            <div
              key={i}
              className="cluster-row"
              style={{ borderLeft: `3px solid ${accentColor}` }}
            >
              {/* Meta */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-dim)' }}>
                  Cluster {c.id ?? c.template_id ?? i}
                </span>
                {plainMode ? (
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                    {found.length > 0
                      ? `⚠ ${found.slice(0, 3).join(', ')}`
                      : '✓ No critical keywords'}
                  </span>
                ) : (
                  <Tooltip label="TF-IDF importance + keyword boost" withArrow>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 20,
                      border: `1px solid ${accentColor}33`,
                      background: `${accentColor}0a`,
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      color: accentColor,
                    }}>
                      {(c.importance_score || 0).toFixed(3)}
                    </span>
                  </Tooltip>
                )}
              </div>

              {/* Score bar */}
              <Progress
                value={pct}
                size={3}
                mb="xs"
                radius={4}
                styles={{
                  section: {
                    background: accentColor,
                    boxShadow: `0 0 4px ${accentColor}40`,
                    transition: 'width 0.6s ease',
                  },
                }}
              />

              {/* Content */}
              {plainMode ? (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6, paddingTop: 2 }}>
                  {getPlainEnglish(c)}
                </p>
              ) : (
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  color: 'var(--text-secondary)',
                  background: 'var(--bg-deep)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  wordBreak: 'break-all',
                  lineHeight: 1.5,
                }}>
                  {c.template}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
