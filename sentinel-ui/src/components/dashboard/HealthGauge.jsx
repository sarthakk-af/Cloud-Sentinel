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

export default function HealthGauge({ status, score, clusters, summary }) {
  if (!clusters?.length) return null;

  const criticalCount = clusters.filter(c => (c.importance_score || 0) >= 1.4).length;
  const totalEvents = clusters.reduce((sum, c) => sum + (c.size || 1), 0);
  
  const ips = new Set();
  clusters.forEach(c => {
    const m = (c.original_log || '').match(/\b\d{1,3}(?:-\d{1,3}){3}\b|\b\d{1,3}(?:\.\d{1,3}){3}\b/); // Matches 10.0.0.1 or 10-0-0-1
    if (m) ips.add(m[0]);
  });
  const ipCount = ips.size;

  return (
    <div className="card gauge-card" style={{ animation: 'fadeUp 0.45s ease forwards', animationDelay: '0.1s', opacity: 0 }}>
      <div className="card-header" style={{ marginBottom: 8 }}>
        <Activity size={16} style={{ color: 'var(--cyan)' }} />
        <span className="card-title">Sentinel state</span>
      </div>

      <div className="gauge-layout">
        <div className="gauge-arc-wrapper">
          <GaugeArc status={status} score={score} />
        </div>

        <div className="gauge-divider" />

        <div className="gauge-breakdown" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, paddingLeft: 20 }}>
          <div className="card-label" style={{ marginBottom: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Intelligence Briefing</div>
          <p style={{
            fontSize: '1.2rem',
            lineHeight: 1.5,
            color: 'var(--text-primary)',
            fontWeight: 600,
            marginBottom: 20
          }}>
            {summary || 'Analysis complete. System is performing within expected parameters.'}
          </p>
          
          {/* Sub-stats row */}
          <div style={{ display: 'flex', gap: 32 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--red)', lineHeight: 1.2 }}>{criticalCount}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-dim)' }}>critical clusters</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>{totalEvents.toLocaleString()}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-dim)' }}>total events</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>{ipCount}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-dim)' }}>source IP{ipCount !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Action Plan */}
          <div style={{ marginTop: 24, padding: '12px 16px', background: 'rgba(0, 255, 200, 0.05)', border: '1px solid rgba(0, 255, 200, 0.15)', borderRadius: '6px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ color: 'var(--green)', marginTop: '2px' }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Recommended Action Plan</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                {(() => {
                  const s = (summary || '').toLowerCase();
                  
                  if (s.includes('ransom') || s.includes('encrypt') || s.includes('locked') || s.includes('deletion')) 
                    return "CATASTROPHIC INCIDENT: Immediate EDR isolation required. Sever network egress, halt all backup destruction tasks, and initiate forensic memory capture.";
                  if (s.includes('backdoor') || s.includes('reverse shell') || s.includes('malware') || s.includes('c2')) 
                    return "ACTIVE COMPROMISE: Kill outbound connections to non-corporate ASNs immediately. Terminate unauthorized shells and isolate the host.";
                  if (s.includes('compromise') || s.includes('privilege') || s.includes('escalation') || s.includes('suid')) 
                    return "PRIVILEGE ESCALATION: A malicious actor has gained root access. Freeze the system state, revoke all active sessions, and lock down IAM.";
                    
                  if (s.includes('unauthorized') || s.includes('brute') || s.includes('login') || s.includes('credential') || s.includes('password')) 
                    return "Block offending source IPs at the perimeter firewall immediately. Mandate key-based authentication for SSH and audit recent successful logins.";
                  if (s.includes('memory') || s.includes('oom') || s.includes('crash') || s.includes('panic')) 
                    return "Investigate daemon memory leaks. Restart affected services to clear memory pressure and consider scaling the instance RAM limits.";
                  if (s.includes('ssl') || s.includes('certificate')) 
                    return "Renew expired SSL certificates immediately and verify file permissions on the web server's /etc/ssl configuration directories.";
                  if (s.includes('space') || s.includes('disk') || s.includes('quota')) 
                    return "Clear temporary logs and caches immediately. Expand the primary storage volume to prevent impending database corruption.";
                  if (s.includes('deadlock') || s.includes('transaction')) 
                    return "Database transaction gridlock detected. Identify and terminate long-running queries; review application logic for locking order issues.";
                  if (s.includes('temperature') || s.includes('cpu') || s.includes('throttle')) 
                    return "Thermal throttling active. Investigate CPU-heavy processes, check hardware cooling, and redistribute load across the cluster.";
                  if (s.includes('timeout') || s.includes('500') || s.includes('flood') || s.includes('rate')) 
                    return "Service degradation detected. Implement strict rate limiting, scale up application replicas, and verify upstream service health.";
                  return "Continue monitoring the system logs. No immediate manual intervention required at this threshold.";
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
