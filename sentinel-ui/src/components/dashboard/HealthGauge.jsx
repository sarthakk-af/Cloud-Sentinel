import { Progress, Tooltip } from '@mantine/core';
import { getSeverity } from '../../utils/severity';

const CONFIGS = {
  CRITICAL: { score: 88, text: 'Critical Threat',  pulse: true },
  WARNING:  { score: 62, text: 'Warning Detected', pulse: false },
  DEGRADED: { score: 40, text: 'Degraded State',   pulse: false },
  NOMINAL:  { score: 15, text: 'System Nominal',   pulse: false },
};

const RANK_COLORS = ['var(--red)', 'var(--amber)', 'var(--cyan)'];

function GaugeArc({ summary }) {
  const sev = getSeverity(summary);
  const cfg = CONFIGS[sev.label] || CONFIGS.NOMINAL;
  const R = 52, CX = 70, CY = 72;
  const START = 135, SWEEP = 270;
  const fillEnd = START + (cfg.score / 100) * SWEEP;

  const pt = deg => {
    const r = (deg * Math.PI) / 180;
    return { x: +(CX + R * Math.cos(r)).toFixed(2), y: +(CY + R * Math.sin(r)).toFixed(2) };
  };
  const arc = (a, b) => {
    const s = pt(a), e = pt(b);
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${b - a > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width="140" height="118" viewBox="0 0 140 128">
        <path d={arc(START, START + SWEEP)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round" />
        <path
          d={arc(START, fillEnd)}
          fill="none"
          stroke={sev.color}
          strokeWidth="10"
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 8px ${sev.color}88)`,
            transition: 'all 1s ease',
            ...(cfg.pulse ? { animation: 'pulse-glow 2s ease infinite' } : {}),
          }}
        />
        <text x={CX} y={CY + 6} textAnchor="middle" fill={sev.color} fontSize="24" fontWeight="800"
          fontFamily="'Inter', sans-serif"
          style={{ filter: `drop-shadow(0 0 10px ${sev.color}60)` }}
        >
          {cfg.score}
        </text>
        <text x={CX} y={CY + 22} textAnchor="middle" fill="var(--text-dim)" fontSize="8"
          fontFamily="'Inter', sans-serif" letterSpacing="0.08em"
        >
          THREAT LEVEL
        </text>
      </svg>
      <div style={{
        color: sev.color,
        fontWeight: 700,
        fontSize: '0.72rem',
        ...(cfg.pulse ? { animation: 'pulse-glow 2s ease infinite' } : {}),
      }}>
        {cfg.text}
      </div>
    </div>
  );
}

export default function HealthGauge({ summary, clusters }) {
  if (!clusters?.length) return null;

  return (
    <div className="card" style={{ marginBottom: 12, animation: 'fadeUp 0.45s ease forwards', animationDelay: '0.1s', opacity: 0 }}>
      <div className="card-header">
        <span className="card-title">Anomaly Overview</span>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap', minHeight: 110 }}>
        {/* Gauge */}
        <div style={{ flex: '0 0 150px', display: 'flex', justifyContent: 'center' }}>
          <GaugeArc summary={summary} />
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch', minHeight: 80 }} />

        {/* Threat breakdown */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="card-label" style={{ marginBottom: 2 }}>Top Threat Clusters</div>
          {clusters.slice(0, 3).map((c, i) => {
            const max = clusters[0].importance_score || 1;
            const pct = Math.min(100, ((c.importance_score || 0) / max) * 100);
            return (
              <Tooltip
                key={i}
                label={c.template?.slice(0, 80) || `Cluster #${i + 1}`}
                position="top"
                withArrow
                multiline
                maw={350}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    color: RANK_COLORS[i],
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    width: 22,
                    flexShrink: 0,
                  }}>
                    #{i + 1}
                  </span>
                  <Progress
                    value={pct}
                    color={RANK_COLORS[i]}
                    size={4}
                    radius={4}
                    style={{ flex: 1, transition: 'width 0.8s ease' }}
                  />
                  <span style={{
                    color: 'var(--text-dim)',
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-mono)',
                    width: 44,
                    textAlign: 'right',
                  }}>
                    {(c.importance_score || 0).toFixed(3)}
                  </span>
                </div>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </div>
  );
}
