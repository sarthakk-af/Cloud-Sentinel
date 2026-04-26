import { CRITICAL_KWS } from './constants';

/* ── Severity classification ───────────────────────────────────── */
export function getSeverity(summary = '') {
  const s = summary.toLowerCase();
  if (s.startsWith('critical') || s.startsWith('security'))
    return { color: '#ff3a5c', glow: 'rgba(255,58,92,0.06)', label: 'CRITICAL', panelClass: 'severity-critical' };
  if (s.startsWith('performance') || s.startsWith('warning') || s.startsWith('storage') || s.startsWith('network'))
    return { color: '#ffb830', glow: 'rgba(255,184,48,0.06)', label: 'WARNING', panelClass: 'severity-warning' };
  if (s.startsWith('database') || s.startsWith('web server'))
    return { color: '#b266ff', glow: 'rgba(178,102,255,0.06)', label: 'DEGRADED', panelClass: 'severity-degraded' };
  return { color: '#00ff94', glow: 'rgba(0,255,148,0.06)', label: 'NOMINAL', panelClass: 'severity-nominal' };
}

/* ── Terminal line classifier ──────────────────────────────────── */
export function getTerminalClass(line) {
  if (line.startsWith('[SYSTEM]'))  return 'terminal-line sys';
  if (line.startsWith('[SUCCESS]')) return 'terminal-line ok';
  if (line.startsWith('[ERROR]') || line.startsWith('[TIP]')) return 'terminal-line error';
  if (line.startsWith('[TRAFFIC]')) return 'terminal-line traffic';
  return 'terminal-line ok';
}

/* ── Plain-English translations ────────────────────────────────── */
export function getPlainEnglish(cluster) {
  const t = ((cluster.template || '') + ' ' + (cluster.original_log || '')).toLowerCase();
  if (t.includes('failed password') || t.includes('authentication fail'))
    return 'Repeated credential attacks detected — possible intrusion attempt.';
  if (t.includes('invalid user'))
    return 'Login attempts using non-existent user identities.';
  if (t.includes('out of memory') || t.includes('kill process') || t.includes(' oom'))
    return 'Memory exhaustion — processes terminated by OOM killer.';
  if (t.includes('deadlock'))
    return 'Transaction deadlock cascade — operations blocked.';
  if (t.includes('no space') || t.includes('disk quota'))
    return 'Disk capacity exhausted — write operations failing.';
  if (t.includes('kernel panic'))
    return 'Operating system crash — immediate reboot required.';
  if (t.includes('null pointer') || t.includes('segfault'))
    return 'Illegal memory access — process crash imminent.';
  if (t.includes('throttled') || t.includes('temperature above threshold'))
    return 'CPU thermal throttling engaged — performance degraded.';
  if (t.includes('watchdog') && t.includes('timeout'))
    return 'Service unresponsive — forcefully terminated by watchdog.';
  if (t.includes('ssl') || t.includes('certificate'))
    return 'Security certificate invalid — encrypted connections failing.';
  if (t.includes(' 500') || t.includes(' 502') || t.includes(' 503'))
    return 'Web server returning error status — service degraded.';
  if (t.includes('connection refused'))
    return 'Target service rejecting connections.';
  if (t.includes('slow query'))
    return 'Database query exceeding latency threshold.';
  if (t.includes('timeout'))
    return 'Request exceeded maximum wait duration.';
  if (t.includes('heartbeat') || t.includes('started session'))
    return 'Routine health check — system operational.';
  return 'Non-standard log pattern identified.';
}

/* ── Score breakdown calculator ────────────────────────────────── */
export function getScoreBreakdown(cluster) {
  const tpl = (cluster.template || '').toLowerCase();
  const found = CRITICAL_KWS.filter(kw => tpl.includes(kw));
  const kwBoost = parseFloat((found.length * 0.5).toFixed(3));
  const base = parseFloat(Math.max(0, (cluster.importance_score || 0) - kwBoost).toFixed(3));
  return { base, kwBoost, found };
}
