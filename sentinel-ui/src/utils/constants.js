/* ── Scenario definitions ──────────────────────────────────────── */

export const SCENARIOS = [
  { key: 'ssh_brute',    icon: 'ShieldAlert',  name: 'SSH Brute Force',      desc: 'External IP brute-forcing root via SSH.' },
  { key: 'java_oom',     icon: 'Zap',          name: 'Memory Crash',          desc: 'Java container triggering OOM panic.' },
  { key: 'mixed_noise',  icon: 'Wind',         name: 'High Volume Noise',     desc: 'TF-IDF filtering errors in normal traffic.' },
  { key: 'disk_full',    icon: 'HardDrive',    name: 'Disk Full Alert',       desc: 'Partition filling up, blocking all writes.' },
  { key: 'db_deadlock',  icon: 'Lock',         name: 'DB Deadlock',           desc: 'Postgres deadlock cascade + connection failures.' },
  { key: 'http_flood',   icon: 'Globe',        name: 'HTTP 500 Storm',        desc: 'Nginx internal server error spike.' },
  { key: 'ssl_cert',     icon: 'KeyRound',     name: 'SSL Certificate Failure',desc: 'Expired certs + missing host keys.' },
  { key: 'kernel_panic', icon: 'Skull',        name: 'Kernel Panic',          desc: 'NULL pointer dereference + OOM killer firing.' },
  { key: 'cpu_spike',    icon: 'Flame',        name: 'CPU Overload',          desc: 'Thermal throttling with watchdog timeouts.' },
];

export const LIVE_SCENARIOS = [
  { key: 'ssh_brute',    icon: 'ShieldAlert',  name: 'SSH Brute Force',       color: '#ff3a5c' },
  { key: 'kernel_panic', icon: 'Skull',        name: 'Kernel Panic',          color: '#ff3a5c' },
  { key: 'db_deadlock',  icon: 'Lock',         name: 'DB Deadlock',           color: '#b266ff' },
  { key: 'disk_full',    icon: 'HardDrive',    name: 'Disk Full',             color: '#ffb830' },
  { key: 'cpu_spike',    icon: 'Flame',        name: 'CPU Overload',          color: '#ffb830' },
  { key: 'http_flood',   icon: 'Globe',        name: 'HTTP 500 Storm',        color: '#00dcff' },
  { key: 'ssl_cert',     icon: 'KeyRound',     name: 'SSL Certificate Failure',color: '#b266ff' },
];

export const CRITICAL_KWS = [
  'error', 'fail', 'failed', 'critical', 'panic',
  'denied', 'timeout', 'exception', 'kill', 'oom',
];

/* ── Security Tips — "Did You Know?" sidebar widget ────────── */
export const SECURITY_TIPS = [
  { title: 'SSH Hardening', fact: 'Disabling root login and using key-based auth blocks over 90% of brute-force attacks on SSH.' },
  { title: 'Log Retention', fact: 'NIST recommends retaining security logs for at least 1 year. Most breaches are discovered months after the initial compromise.' },
  { title: 'OOM Prevention', fact: 'Setting memory limits on containers prevents a single runaway process from taking down the entire host.' },
  { title: 'TLS Best Practices', fact: 'Certificates should be auto-renewed 30 days before expiry. Let\'s Encrypt certs last only 90 days.' },
  { title: 'Fail2ban', fact: 'A well-configured fail2ban can reduce SSH brute-force attempts by 99% by banning repeat offenders after 5 failures.' },
  { title: 'Kernel Hardening', fact: 'Enabling ASLR and restricting /proc makes kernel exploits significantly harder to execute.' },
  { title: 'Database Locks', fact: 'PostgreSQL deadlocks often stem from inconsistent lock ordering. Always acquire locks in the same sequence.' },
  { title: 'Disk Monitoring', fact: 'Setting disk alerts at 80% capacity gives operations teams enough runway to prevent cascading write failures.' },
  { title: 'Container Isolation', fact: 'Running containers as non-root with read-only filesystems reduces the blast radius of a compromise by 70%.' },
  { title: 'Log Anomaly Detection', fact: 'TF-IDF scoring surfaces rare log patterns — the "needle in a haystack" that often signals an active threat.' },
  { title: 'Rate Limiting', fact: 'API rate limiting at the reverse-proxy level stops 95% of HTTP flood attacks before they reach your application.' },
  { title: 'Immutable Infrastructure', fact: 'Treating servers as cattle, not pets — rebuilding instead of patching — eliminates configuration drift vulnerabilities.' },
];

export const API = window.location.hostname === 'localhost' 
    ? 'http://127.0.0.1:8000' 
    : '';