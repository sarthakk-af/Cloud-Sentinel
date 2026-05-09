import { Progress, Tooltip } from '@mantine/core';
import { AlertTriangle, ShieldCheck, ShieldAlert, ShieldX, Activity } from 'lucide-react';
import { getStatusMapping } from '../../utils/severity';

const STATUS_ICONS = {
  CRITICAL: ShieldX,
  WARNING:  ShieldAlert,
  DEGRADED: AlertTriangle,
  NOMINAL:  ShieldCheck,
};

function GaugeArc({ status, score }) {
  const sev = getStatusMapping(status || 'Nominal');
  const Icon = STATUS_ICONS[sev.label] || ShieldCheck;
  const pulse = sev.label === 'CRITICAL';
  
  const displayScore = score !== undefined ? score : 15;
  const displayText = status ? `System ${status}` : 'System Nominal';

  const R = 62, CX = 80, CY = 82;
  const START = 135, SWEEP = 270;
  const fillEnd = START + (displayScore / 100) * SWEEP;

  const pt = deg => {
    const r = (deg * Math.PI) / 180;
    return { x: +(CX + R * Math.cos(r)).toFixed(2), y: +(CY + R * Math.sin(r)).toFixed(2) };
  };
  const arc = (a, b) => {
    const s = pt(a), e = pt(b);
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${b - a > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
  };

  return (
    <div className="gauge-container">
      <svg width="160" height="135" viewBox="0 0 160 145">
        <path d={arc(START, START + SWEEP)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" strokeLinecap="round" />
        <path
          d={arc(START, fillEnd)}
          fill="none"
          stroke={sev.color}
          strokeWidth="12"
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 12px ${sev.color}88)`,
            transition: 'all 1.2s cubic-bezier(0.23, 1, 0.32, 1)',
            ...(pulse ? { animation: 'pulse-glow 2s ease infinite' } : {}),
          }}
        />
        <text x={CX} y={CY + 4} textAnchor="middle" fill={sev.color} fontSize="28" fontWeight="800"
          fontFamily="'Inter', sans-serif"
          style={{ filter: `drop-shadow(0 0 14px ${sev.color}60)` }}
        >
          {displayScore}
        </text>
        <text x={CX} y={CY + 22} textAnchor="middle" fill="var(--text-dim)" fontSize="8"
          fontFamily="'Inter', sans-serif" letterSpacing="0.1em"
        >
          THREAT LEVEL
        </text>
      </svg>

      <div
        className="gauge-status-badge"
        style={{
          color: sev.color,
          borderColor: `${sev.color}44`,
          background: `${sev.color}10`,
          ...(pulse ? { animation: 'pulse-glow 2s ease infinite' } : {}),
        }}
      >
        <Icon size={12} />
        {displayText}
      </div>
    </div>
  );
}

const RANK_COLORS = ['var(--red)', 'var(--amber)', 'var(--cyan)'];

export default function HealthGauge({ status, score, clusters }) {
  if (!clusters?.length) return null;

  return (
    <div className="card gauge-card" style={{ animation: 'fadeUp 0.45s ease forwards', animationDelay: '0.1s', opacity: 0 }}>
      <div className="card-header" style={{ marginBottom: 8 }}>
        <Activity size={16} style={{ color: 'var(--cyan)' }} />
        <span className="card-title">Sentinel State</span>
      </div>

      <div className="gauge-layout">
        <div className="gauge-arc-wrapper">
          <GaugeArc status={status} score={score} />
        </div>

        <div className="gauge-divider" />

        <div className="gauge-breakdown">
          <div className="card-label" style={{ marginBottom: 6 }}>Top Threat Clusters</div>
          {clusters.slice(0, 3).map((c, i) => {
            const max = clusters[0].importance_score || 1;
            const pct = Math.min(100, ((c.importance_score || 0) / max) * 100);
            
            // Fix: Use actual cluster severity for color, not rank
            const score = c.importance_score || 0;
            let barColor = 'var(--cyan)'; // Nominal
            if (score >= 0.9) barColor = 'var(--red)';
            else if (score >= 0.4) barColor = 'var(--amber)';

            return (
              <Tooltip
                key={i}
                label={c.template?.slice(0, 80) || `Cluster #${i + 1}`}
                position="top"
                withArrow
                multiline
                maw={350}
              >
                <div className="gauge-threat-row">
                  <span className="gauge-rank" style={{ color: barColor, opacity: 0.8 }}>
                    #{i + 1}
                  </span>
                  <Progress
                    value={pct}
                    color={barColor}
                    size={5}
                    radius={4}
                    style={{ 
                      flex: 1, 
                      transition: 'width 1s ease',
                      filter: score >= 0.9 ? 'drop-shadow(0 0 4px var(--red))' : 'none'
                    }}
                  />
                  <span className="gauge-score" style={{ color: barColor }}>
                    {score.toFixed(3)}
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
