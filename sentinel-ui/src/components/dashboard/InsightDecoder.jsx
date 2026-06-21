import { useEffect, useCallback } from 'react';
import { Portal } from '@mantine/core';
import { X, FileText, Brain, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getPlainEnglish, getScoreBreakdown } from '../../utils/severity';

/**
 * InsightDecoder — Full-screen modal opened from Story Cards.
 * Three-column layout:
 *   Left: Raw log template
 *   Center: AI Interpretation (plain english + score breakdown)
 *   Right: Recommended Actions (hardcoded per pattern type)
 */

const ACTIONS_MAP = [
  { match: ['failed password', 'authentication fail', 'brute'],
    title: 'Credential Attack Response',
    icon: Shield,
    steps: [
      'Enable fail2ban with 5-attempt threshold',
      'Audit authorized_keys for unauthorized entries',
      'Rotate root credentials immediately',
      'Enable MFA for all SSH access',
      'Review firewall rules — block source IPs',
    ]
  },
  { match: ['out of memory', 'oom', 'kill process'],
    title: 'Memory Crisis Protocol',
    icon: AlertTriangle,
    steps: [
      'Check container memory limits (docker stats)',
      'Review heap size configuration (JVM: -Xmx)',
      'Identify memory-leaking processes (top -o %MEM)',
      'Enable swap as temporary safety net',
      'Scale horizontally to distribute load',
    ]
  },
  { match: ['deadlock'],
    title: 'Deadlock Resolution',
    icon: AlertTriangle,
    steps: [
      'Identify blocked transactions (pg_locks)',
      'Kill the oldest blocking transaction',
      'Review query ordering to prevent cycles',
      'Add advisory locks for hot tables',
      'Enable deadlock_timeout logging',
    ]
  },
  { match: ['no space', 'disk full', 'disk quota'],
    title: 'Storage Recovery',
    icon: AlertTriangle,
    steps: [
      'Identify large files: du -sh /* | sort -rh',
      'Clear old logs: journalctl --vacuum-size=500M',
      'Purge Docker: docker system prune -af',
      'Expand volume or add storage',
      'Set up disk usage alerting at 80%',
    ]
  },
  { match: ['kernel panic', 'null pointer', 'segfault'],
    title: 'Kernel Emergency',
    icon: Shield,
    steps: [
      'Capture core dump for analysis',
      'Check dmesg for hardware errors',
      'Update kernel to latest stable',
      'Run memtest86+ for RAM integrity',
      'Review recently loaded kernel modules',
    ]
  },
  { match: ['ssl', 'certificate', 'cert'],
    title: 'Certificate Remediation',
    icon: Shield,
    steps: [
      'Run: certbot renew --force-renewal',
      'Verify certificate chain validity',
      'Check DNS propagation for ACME challenge',
      'Update certificate store (update-ca-certificates)',
      'Set calendar alert 30 days before next expiry',
    ]
  },
  { match: ['500', '502', '503', 'http'],
    title: 'Service Error Response',
    icon: AlertTriangle,
    steps: [
      'Check upstream backend health',
      'Review Nginx error log (tail -f /var/log/nginx/error.log)',
      'Verify proxy_pass targets are reachable',
      'Increase worker_connections if under load',
      'Enable circuit breaker pattern',
    ]
  },
  { match: ['throttl', 'temperature', 'cpu'],
    title: 'Thermal Emergency',
    icon: AlertTriangle,
    steps: [
      'Check fan and cooling system',
      'Reduce CPU-intensive processes temporarily',
      'Review ambient temperature and airflow',
      'Throttle non-critical cron jobs',
      'Consider hardware upgrade or better cooling',
    ]
  },
];

function getActions(cluster) {
  const t = ((cluster.template || '') + ' ' + (cluster.original_log || '')).toLowerCase();
  for (const entry of ACTIONS_MAP) {
    if (entry.match.some(kw => t.includes(kw))) {
      return entry;
    }
  }
  return {
    title: 'General Investigation',
    icon: Shield,
    steps: [
      'Correlate with other log sources',
      'Check system metrics around this timeframe',
      'Review recent deployments or config changes',
      'Escalate to on-call engineer if recurring',
      'Document findings in incident log',
    ],
  };
}

export default function InsightDecoder({ cluster, index, onClose }) {
  const { found, base, kwBoost } = getScoreBreakdown(cluster);
  const plainText = getPlainEnglish(cluster);
  const actions = getActions(cluster);
  const ActionIcon = actions.icon;

  const impScore = cluster.importance_score || 0;
  const sevColor = impScore >= 1.4 ? 'var(--red)' : impScore >= 0.7 ? 'var(--amber)' : impScore >= 0.35 ? 'var(--violet)' : 'var(--cyan)';

  // Close on Escape
  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    // Lock body scroll
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [handleKey]);

  return (
    <Portal>
      <div className="decoder-overlay" onClick={onClose}>
        <div className="decoder-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className="decoder-close" onClick={onClose}>
          <X size={18} />
        </button>

        {/* Header */}
        <div className="decoder-header">
          <div className="decoder-header-badge" style={{ color: sevColor, borderColor: `${sevColor}44`, background: `${sevColor}10` }}>
            Cluster {cluster.id ?? cluster.template_id ?? index}
          </div>
          <h2 className="decoder-title">Insight Decoder</h2>
          <p className="decoder-subtitle">Side-by-side intelligence breakdown</p>
        </div>

        {/* Three columns */}
        <div className="decoder-columns">
          {/* ── Left: Raw Template ──────────────── */}
          <div className="decoder-col">
            <div className="decoder-col-header">
              <FileText size={14} />
              <span>Raw Template</span>
            </div>
            <div className="decoder-col-content">
              <div className="decoder-template-box">
                {(cluster.template || 'N/A').split(/(<\*>)/g).map((part, i) =>
                  part === '<*>' ? (
                    <span key={i} className="wildcard-token">{part}</span>
                  ) : part
                )}
              </div>

              {cluster.original_log && (
                <div className="decoder-original-log">
                  <div className="decoder-mini-label">Original Log</div>
                  <div className="decoder-log-text">{cluster.original_log}</div>
                </div>
              )}

              <div className="decoder-score-grid">
                <div className="decoder-score-item">
                  <span className="decoder-score-label">TF-IDF Base</span>
                  <span className="decoder-score-value">{base.toFixed(3)}</span>
                </div>
                <div className="decoder-score-item">
                  <span className="decoder-score-label">Keyword Boost</span>
                  <span className="decoder-score-value" style={{ color: kwBoost > 0 ? 'var(--red)' : 'var(--text-dim)' }}>
                    +{kwBoost.toFixed(3)}
                  </span>
                </div>
                <div className="decoder-score-item">
                  <span className="decoder-score-label">Final Score</span>
                  <span className="decoder-score-value" style={{ color: sevColor, fontWeight: 800 }}>
                    {(cluster.importance_score || 0).toFixed(3)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Center: AI Interpretation ────────── */}
          <div className="decoder-col decoder-col-center">
            <div className="decoder-col-header">
              <Brain size={14} />
              <span>AI Interpretation</span>
            </div>
            <div className="decoder-col-content">
              <div className="decoder-interpretation">
                {plainText}
              </div>

              {found.length > 0 && (
                <div className="decoder-keywords-section">
                  <div className="decoder-mini-label">Detected Keywords</div>
                  <div className="decoder-keyword-list">
                    {found.map(kw => (
                      <span key={kw} className="decoder-keyword-tag">
                        <AlertTriangle size={9} />
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {cluster.ai_summary_line && (
                <div className="decoder-ai-summary">
                  <div className="decoder-mini-label">T5 AI Summary</div>
                  <p className="decoder-ai-text">{cluster.ai_summary_line}</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Action Plan ───────────────── */}
          <div className="decoder-col">
            <div className="decoder-col-header">
              <ActionIcon size={14} />
              <span>{actions.title}</span>
            </div>
            <div className="decoder-col-content">
              <div className="decoder-actions-list">
                {actions.steps.map((step, i) => (
                  <div key={i} className="decoder-action-step">
                    <div className="decoder-step-num">{i + 1}</div>
                    <span className="decoder-step-text">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </Portal>
  );
}
