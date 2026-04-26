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

export const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
