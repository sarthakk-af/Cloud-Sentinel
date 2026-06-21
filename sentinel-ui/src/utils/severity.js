import { CRITICAL_KWS } from './constants';

/* ── Severity classification ───────────────────────────────────── */
export function getStatusMapping(status = 'Nominal') {
  const s = status.toLowerCase();
  
  if (s === 'critical') {
    return { color: '#ff3a5c', glow: 'rgba(255,58,92,0.06)', label: 'CRITICAL', panelClass: 'severity-critical' };
  }
  if (s === 'warning') {
    return { color: '#ffb830', glow: 'rgba(255,184,48,0.06)', label: 'WARNING', panelClass: 'severity-warning' };
  }
  if (s === 'degraded') {
    return { color: '#b266ff', glow: 'rgba(178,102,255,0.06)', label: 'DEGRADED', panelClass: 'severity-degraded' };
  }
  
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
  if (t.includes('ransom') || t.includes('encrypt') || t.includes('locked'))
    return 'Catastrophic mass-file encryption or ransom note detected — ransomware behavior.';
  if (t.includes('backdoor') || t.includes('reverse shell') || t.includes('c2'))
    return 'Active adversary command-and-control connection or reverse shell detected.';
  if (t.includes('compromise') || t.includes('privilege') || t.includes('suid'))
    return 'Successful privilege escalation — an actor has secured unauthorized root/admin access.';
  if (t.includes('deletion') || t.includes('snapshot rm'))
    return 'Malicious destruction of backup snapshots detected — attempt to prevent recovery.';
  if (t.includes('anomaly') && t.includes('process tree'))
    return 'Suspicious process spawning behavior — likely a malicious payload executing.';
  return 'Non-standard log pattern identified.';
}

/* ── Score breakdown calculator (mirrors backend analyzer.py tiers) ── */
export function getScoreBreakdown(cluster) {
  const tpl = (cluster.template || '').toLowerCase();

  // Three-tier keyword system matching backend analyzer.py
  const EMERGENCY_KWS = ['panic', 'kill', 'oom', 'denied', 'brute', 'failed password', 'space', 'quota', 'critical', 'ransom', 'backdoor', 'compromise', 'malware', 'root', 'suid'];
  const ALERT_KWS     = ['timeout', 'deadlock', 'full', 'fatal', 'throttle', 'temperature', 'flood', 'warn', 'anomaly'];
  const PERF_KWS      = ['error', 'fail', 'failed', '500', '502', '503', 'storm', 'ssl', 'expired', 'spike', 'refused'];

  const found = new Set();
  let kwBoost = 0;

  // Use max() like the backend — highest matching tier wins
  for (const kw of PERF_KWS) {
    if (tpl.includes(kw)) { found.add(kw); kwBoost = Math.max(kwBoost, 0.4); }
  }
  for (const kw of ALERT_KWS) {
    if (tpl.includes(kw)) { found.add(kw); kwBoost = Math.max(kwBoost, 0.8); }
  }
  for (const kw of EMERGENCY_KWS) {
    if (tpl.includes(kw)) { found.add(kw); kwBoost = Math.max(kwBoost, 1.5); }
  }

  kwBoost = parseFloat(kwBoost.toFixed(3));
  const base = parseFloat(Math.max(0, (cluster.importance_score || 0) - kwBoost).toFixed(3));
  return { base, kwBoost, found: [...found] };
}
