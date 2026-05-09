import { getStatusMapping } from '../../utils/severity';

export default function SummaryBox({ summary, status }) {
  const sev = getStatusMapping(status || 'Nominal');

  return (
    <div
      className="card"
      style={{
        marginBottom: 12,
        borderLeft: `3px solid ${sev.color}`,
        background: sev.glow,
      }}
    >
      {/* Verdict */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{
          fontSize: '1.2rem',
          fontWeight: 800,
          color: sev.color,
          letterSpacing: '-0.01em',
        }}>
          {status === 'Critical' && 'Critical Threat Detected'}
          {status === 'Warning' && 'System Alert Issued'}
          {status === 'Degraded' && 'System Performance Degraded'}
          {status === 'Nominal' && 'System Nominal'}
          {!['Critical', 'Warning', 'Degraded', 'Nominal'].includes(status) && `System ${status || 'Stable'}`}
        </span>
        <span style={{
          padding: '2px 10px',
          borderRadius: 20,
          border: `1px solid ${sev.color}44`,
          background: `${sev.color}15`,
          fontSize: '0.62rem',
          fontWeight: 700,
          color: sev.color,
          textTransform: 'uppercase'
        }}>
          {status || 'NOMINAL'}
        </span>
      </div>

      {/* Summary text */}
      <p style={{
        fontSize: '0.85rem',
        fontWeight: 400,
        lineHeight: 1.7,
        color: 'var(--text-primary)',
      }}>
        {summary || 'Analysis complete. System is performing within expected parameters.'}
      </p>
    </div>
  );
}
