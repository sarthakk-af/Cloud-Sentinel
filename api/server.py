# api/server.py
from fastapi import FastAPI, UploadFile, File, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import time
import asyncio
import json
import logging
import os
import uuid
import random
from datetime import datetime
from typing import Dict
from concurrent.futures import ThreadPoolExecutor

from engine.parser import LogParser
from engine.analyzer import LogAnalyzer
from engine.summarizer import LogSummarizer
from dotenv import load_dotenv

# Configure professional logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join("data", "server_debug.log"))
    ]
)
logger = logging.getLogger("sentinel-api")

# Load configurations
load_dotenv()

PORT = int(os.getenv("PORT", 8000))
USE_AI = os.getenv("USE_AI", "True").lower() == "true"
MODEL_NAME = os.getenv("MODEL_NAME", "t5-small")
DATA_DIR = os.getenv("DATA_DIR", "data")
DATASETS_DIR = os.getenv("DATASETS_DIR", "datasets")
LOG_MAX_BYTES = int(os.getenv("LOG_MAX_BYTES", 5 * 1024 * 1024))  # default 5 MB
MAX_CONCURRENT_STREAMS = int(os.getenv("MAX_CONCURRENT_STREAMS", 5))

# CORS: use env var for production, wildcard for dev
_cors_origins_env = os.getenv("CORS_ORIGINS", "")
CORS_ORIGINS = [o.strip() for o in _cors_origins_env.split(",") if o.strip()] or ["*"]

os.makedirs(DATA_DIR, exist_ok=True)

app = FastAPI(
    title="Cloud-Sentinel AI Log Interpreter",
    description="Intelligent log analysis platform using Drain3, TF-IDF, and T5 transformers.",
    version="2.0.0"
)

# Allow UI to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_startup_time = time.time()

# Thread pool for CPU-bound summarizer calls (T5 model)
_thread_pool = ThreadPoolExecutor(max_workers=2)

# Reusable loop reference (set at first async call)
_event_loop = None

# Instantiate shared stateless engines
logger.info("Waking up Intelligence Engine...")
try:
    analyzer = LogAnalyzer()
    summarizer = LogSummarizer(use_ai=USE_AI, model_name=MODEL_NAME)
    logger.info(f"Intelligence Engine Ready. model={MODEL_NAME}, use_ai={USE_AI}")
except Exception as e:
    logger.error(f"Error initializing Engine: {e}")

# In-memory storage for the latest analysis (used by upload mode)
latest_analysis = {
    "status": "idle",
    "total_logs": 0,
    "unique_templates": 0,
    "top_clusters": [],
    "ai_summary": "",
    "processing_time_ms": 0
}

# ── Active stream registry ──────────────────────────────────────────────────
# Maps session_id -> asyncio.Queue used to inject incident logs into the stream
active_streams: Dict[str, asyncio.Queue] = {}


# ── Chaos Log Generator ─────────────────────────────────────────────────────
# These functions produce dirty, mixed, realistic log lines identical to what
# real multi-service environments generate. Intentionally noisy and unformatted.

_IPS   = ["192.168.1.10", "10.0.0.5", "172.16.254.1", "114.12.55.90", "203.0.113.42", "198.51.100.7"]
_USERS = ["admin", "root", "deploy_user", "guest_99", "jenkins", "ubuntu"]
_NODES = ["node001", "node042", "node119", "node220", "node008", "node333"]

def _chaos_nginx() -> str:
    ip     = random.choice(_IPS)
    ts     = datetime.now().strftime("%d/%b/%Y:%H:%M:%S +0000")
    method = random.choice(["GET", "POST", "PUT", "DELETE", "PATCH"])
    path   = random.choice(["/api/v1/login", "/api/v1/data", "/health", "/admin/config",
                            "/static/logo.png", "/metrics", "/api/v2/users", "/favicon.ico"])
    code   = random.choices([200, 201, 301, 400, 401, 403, 404, 500, 502, 503],
                             weights=[55, 5, 3, 5, 3, 2, 10, 8, 5, 4])[0]
    size   = random.randint(100, 9800)
    return f'{ip} - - [{ts}] "{method} {path} HTTP/1.1" {code} {size} "-" "Mozilla/5.0 (Cloud-Sentinel-Bot)"'

def _chaos_postgres() -> str:
    ts     = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3] + " UTC"
    level  = random.choices(["LOG", "INFO", "WARNING", "ERROR", "FATAL"],
                             weights=[55, 20, 12, 10, 3])[0]
    msgs   = [
        "database system is ready to accept connections",
        "could not connect to Ident server at address \"127.0.0.1\": Connection refused",
        "slow query detected: SELECT * FROM logs WHERE severity = 'ERROR' LIMIT 1000 (duration: 4821ms)",
        "checkpoint starting: time",
        "autovacuum: processing database billing_db",
        "connection received: host=localhost port=54321",
        "password authentication failed for user \"app_user\"",
        "statement timeout: query exceeded 30000ms",
    ]
    return f"{ts} [db_cluster_01] {level}: {random.choice(msgs)}"

def _chaos_auth() -> str:
    ts   = datetime.now().strftime("%b %d %H:%M:%S")
    ip   = random.choice(_IPS)
    user = random.choice(_USERS)
    node = random.choice(_NODES)
    actions = [
        f"sshd[{random.randint(1000,9999)}]: Accepted publickey for {user} from {ip} port {random.randint(1024,65535)} ssh2",
        f"sshd[{random.randint(1000,9999)}]: pam_unix(sshd:auth): authentication failure; logname= uid=0 euid=0 tty=ssh ruser= rhost={ip} user={user}",
        f"sudo: {user} : TTY=pts/0 ; PWD=/home/{user} ; USER=root ; COMMAND=/usr/bin/systemctl restart nginx",
        f"sshd[{random.randint(1000,9999)}]: Failed password for invalid user {user} from {ip} port {random.randint(1024,65535)} ssh2",
        f"cron[{random.randint(100,9999)}]: ({user}) CMD (/usr/bin/backup.sh >> /var/log/backup.log 2>&1)",
        f"su[{random.randint(100,999)}]: pam_unix(su:auth): authentication failure; logname={user} uid=1000 euid=0",
    ]
    return f"{ts} {node} {random.choice(actions)}"

def _chaos_kernel() -> str:
    ts   = datetime.now().strftime("%b %d %H:%M:%S")
    node = random.choice(_NODES)
    msgs = [
        "kernel: [UFW BLOCK] IN=eth0 OUT= MAC=... SRC=114.12.55.90 DST=10.0.0.5 PROTO=TCP DPT=22",
        "kernel: EXT4-fs (sda1): re-mounted. Opts: errors=remount-ro",
        f"kernel: CPU{random.randint(0,7)}: Core temperature above threshold, cpu clock throttled (total events = {random.randint(8000,9000)})",
        "kernel: NOHZ: local_softirq_pending 08 — possible timer issue",
        f"kernel: Out of memory: Kill process {random.randint(1000,9999)} (python3) score {random.randint(100,999)} or sacrifice child",
        "kernel: usb 1-1: USB disconnect, device number 3",
        "kernel: ACPI: Power Button [PWRF]",
        f"kernel: net_ratelimit: {random.randint(100,300)} callbacks suppressed",
    ]
    return f"{ts} {node} {random.choice(msgs)}"

def _chaos_app_json() -> str:
    ts      = datetime.now().isoformat()
    level   = random.choices(["DEBUG", "INFO", "WARN", "ERROR"], weights=[35, 45, 15, 5])[0]
    actions = ["user_signup", "payment_processed", "cache_miss", "external_api_timeout",
               "db_query_slow", "session_expired", "rate_limit_hit", "worker_spawned"]
    log_obj = {
        "timestamp": ts,
        "level": level,
        "service": random.choice(["billing-v2", "auth-service", "api-gateway", "worker-pool"]),
        "trace_id": f"tr-{random.randint(1000, 9999)}",
        "message": f"Action {random.choice(actions)} completed",
        "metadata": {
            "latency_ms": random.randint(5, 3500),
            "region": random.choice(["us-east-1", "eu-west-1", "ap-south-1"]),
            "status": random.choice(["ok", "ok", "ok", "degraded", "failed"]),
        }
    }
    return json.dumps(log_obj)

def _chaos_systemd() -> str:
    ts      = datetime.now().strftime("%b %d %H:%M:%S")
    node    = random.choice(_NODES)
    units   = ["nginx.service", "postgresql.service", "redis.service", "billing-v2.service",
               "logrotate.service", "cron.service", "ssh.service"]
    unit    = random.choice(units)
    msgs    = [
        f"systemd[1]: {unit}: Reloading.",
        f"systemd[1]: {unit}: Control process exited, code=exited, status=1/FAILURE",
        f"systemd[1]: Started {unit}.",
        f"systemd[1]: {unit}: Watchdog timeout (limit 30s)!",
        f"systemd[1]: Stopping {unit}...",
        f"systemd[1]: {unit}: Main process exited, code=killed, signal=KILL",
    ]
    return f"{ts} {node} {random.choice(msgs)}"

def _chaos_heartbeat() -> str:
    ts   = datetime.now().strftime("%b %d %H:%M:%S")
    node = random.choice(_NODES)
    msgs = [
        f"Heartbeat OK from {node}",
        f"healthcheck: {node} responded in {random.randint(1,120)}ms",
        f"rsyslogd: imuxsock lost {random.randint(1,50)} messages from pid {random.randint(100,9999)} due to rate-limiting",
    ]
    return f"{ts} {random.choice(msgs)}"

# Weighted chaos generator pool — heartbeats and normal traffic dominate (realistic)
_CHAOS_GENERATORS = [
    (_chaos_nginx,     28),
    (_chaos_postgres,  18),
    (_chaos_auth,      15),
    (_chaos_kernel,    12),
    (_chaos_app_json,  15),
    (_chaos_systemd,   8),
    (_chaos_heartbeat, 4),
]
_CHAOS_FUNCS, _CHAOS_WEIGHTS = zip(*_CHAOS_GENERATORS)

def generate_chaos_log() -> str:
    fn = random.choices(_CHAOS_FUNCS, weights=_CHAOS_WEIGHTS, k=1)[0]
    return fn()


# ── Incident Scenario Registry ──────────────────────────────────────────────
# Each scenario is a list of log lines that get injected gradually (one at a time)
# into the live chaos stream, simulating a real incident unfolding over time.

INCIDENT_SCENARIOS = {
    "ssh_brute": [
        "Nov 01 03:12:01 node220 sshd[1230]: Failed password for root from 114.12.55.90 port 54321 ssh2",
        "Nov 01 03:12:03 node220 sshd[1231]: Failed password for root from 114.12.55.90 port 54322 ssh2",
        "Nov 01 03:12:05 node220 sshd[1232]: Failed password for invalid user admin from 114.12.55.90 port 54323 ssh2",
        "Nov 01 03:12:07 node220 sshd[1233]: Failed password for root from 114.12.55.90 port 54324 ssh2",
        "Nov 01 03:12:08 node220 sshd[1234]: Invalid user guest from 114.12.55.90 port 54325",
        "Nov 01 03:12:09 node220 sshd[1235]: Failed password for invalid user ubuntu from 114.12.55.90 port 54326 ssh2",
        "Nov 01 03:12:10 node220 sshd[1236]: Failed password for root from 114.12.55.90 port 54327 ssh2",
        "Nov 01 03:12:11 node220 sshd[1237]: Failed password for root from 114.12.55.90 port 54328 ssh2",
        "Nov 01 03:12:11 node220 sshd[1238]: Failed password for deploy_user from 114.12.55.90 port 54329 ssh2",
        "Nov 01 03:12:12 node220 sshd[1239]: Failed password for root from 114.12.55.90 port 54330 ssh2",
        "Nov 01 03:12:12 node220 sshd[1240]: pam_unix(sshd:auth): authentication failure; user=root rhost=114.12.55.90",
        "Nov 01 03:12:13 node220 sshd[1241]: Failed password for root from 114.12.55.90 port 54331 ssh2",
        "Nov 01 03:12:14 node220 sshd[1242]: Failed password for root from 114.12.55.90 port 54332 ssh2",
        "Nov 01 03:12:15 node220 sshd[1243]: error: maximum authentication attempts exceeded for root from 114.12.55.90 port 54333 ssh2",
        "Nov 01 03:12:16 node220 sshd[1244]: Disconnecting: Too many authentication failures root [preauth]",
        "Nov 01 03:12:17 node220 kernel: [UFW BLOCK] IN=eth0 OUT= SRC=114.12.55.90 DST=10.0.0.5 PROTO=TCP DPT=22",
    ],
    "kernel_panic": [
        "Nov 01 04:22:01 node119 kernel: BUG: unable to handle kernel NULL pointer dereference at 0000000000000000",
        "Nov 01 04:22:01 node119 kernel: IP: kmem_cache_alloc+0x14c/0x1c0",
        "Nov 01 04:22:02 node119 kernel: PGD 0 P4D 0",
        "Nov 01 04:22:02 node119 kernel: Oops: 0000 [#1] SMP PTI",
        "Nov 01 04:22:02 node119 kernel: CPU: 2 PID: 4821 Comm: kworker/2:1 Kdump: loaded Tainted: P D",
        "Nov 01 04:22:03 node119 kernel: Call Trace: <IRQ> ? native_queued_spin_lock_slowpath+0x18b/0x360",
        "Nov 01 04:22:03 node119 kernel: Out of memory: Kill process 5678 (java) score 950 or sacrifice child",
        "Nov 01 04:22:04 node119 kernel: Out of memory: Kill process 5679 (java) score 949 or sacrifice child",
        "Nov 01 04:22:04 node119 kernel: Out of memory: Kill process 5680 (python3) score 948 or sacrifice child",
        "Nov 01 04:22:05 node119 kernel: Kernel panic - not syncing: Fatal exception in interrupt",
        "Nov 01 04:22:05 node119 kernel: CPU: 2 PID: 0 Comm: swapper/2 Not tainted",
        "Nov 01 04:22:06 node119 systemd[1]: Watchdog keepalive missed — system is unresponsive",
        "Nov 01 04:22:07 node119 systemd[1]: billing-v2.service: Watchdog timeout (limit 30s)!",
        "Nov 01 04:22:08 node119 systemd[1]: nginx.service: Main process exited, code=killed, signal=KILL",
    ],
    "db_deadlock": [
        "2026-03-15 13:00:00.001 UTC [db_cluster_01] ERROR: deadlock detected: Process 1234 waiting for ShareLock on transaction 555",
        "2026-03-15 13:00:00.010 UTC [db_cluster_01] DETAIL: Process 5678 holds ExclusiveLock on transaction 555; blocks 1234",
        "2026-03-15 13:00:00.020 UTC [db_cluster_01] ERROR: deadlock detected: Process 2345 waiting for ShareLock on transaction 556",
        "2026-03-15 13:00:00.400 UTC [db_cluster_01] WARNING: could not serialize access due to concurrent update",
        "2026-03-15 13:00:01.000 UTC [db_cluster_01] ERROR: deadlock detected: Process 3456 waiting for ShareLock on transaction 557",
        "2026-03-15 13:00:01.100 UTC [db_cluster_01] ERROR: deadlock detected: Process 4567 waiting for ShareLock on transaction 558",
        "2026-03-15 13:00:01.800 UTC [db_cluster_01] WARNING: statement timeout: query exceeded 30000ms",
        "2026-03-15 13:00:02.000 UTC [db_cluster_01] FATAL: terminating connection due to administrator command",
        "2026-03-15 13:00:02.500 UTC [db_cluster_01] ERROR: could not connect to server: Connection refused — is the server running?",
        "2026-03-15 13:00:03.000 UTC [db_cluster_01] FATAL: the database system is shutting down",
    ],
    "disk_full": [
        "Nov 01 05:10:01 node042 kernel: EXT4-fs error (device sda1): ext4_find_entry:1455: inode #2: comm nginx: reading directory lblock 0",
        "Nov 01 05:10:02 node042 kernel: EXT4-fs error (device sda1): ext4_find_entry: No space left on device",
        "Nov 01 05:10:03 node042 kernel: EXT4-fs error (device sda1): ext4_find_entry: No space left on device",
        "Nov 01 05:10:05 node042 rsyslogd: imuxsock lost 482 messages from pid 3991 due to rate-limiting",
        "Nov 01 05:10:06 node042 kernel: No space left on device — write failed on /var/log/syslog",
        "Nov 01 05:10:07 node042 systemd[1]: var-log.mount: Disk quota exceeded, write failed",
        "Nov 01 05:10:08 node042 CRON[4231]: (root) ERROR (failed to open PAM security session: No space left on device)",
        "Nov 01 05:10:09 node042 kernel: EXT4-fs error (device sda1): ext4_find_entry: No space left on device",
        "Nov 01 05:10:10 node042 nginx: [crit] pwrite() \"/var/cache/nginx/proxy_temp\" failed (28: No space left on device)",
        "Nov 01 05:10:11 node042 postgresql[3322]: FATAL: could not write to file \"pg_wal/00000001\": No space left on device",
        "Nov 01 05:10:12 node042 kernel: EXT4-fs error (device sda1): ext4_find_entry: No space left on device",
        "Nov 01 05:10:13 node042 rsyslogd: file '/var/log/syslog': write error, suspending — No space left on device",
    ],
    "cpu_spike": [
        f"Nov 01 06:30:01 node008 kernel: CPU0: Core temperature above threshold, cpu clock throttled (total events = 8442)",
        f"Nov 01 06:30:02 node008 kernel: CPU1: Package temperature above threshold, cpu clock throttled (total events = 8443)",
        f"Nov 01 06:30:03 node008 kernel: CPU2: Core temperature above threshold, cpu clock throttled (total events = 8480)",
        f"Nov 01 06:30:04 node008 kernel: CPU3: Package temperature above threshold, cpu clock throttled (total events = 8481)",
        f"Nov 01 06:30:05 node008 node_exporter: CPU usage at 99.8% for 30 seconds on core 0",
        f"Nov 01 06:30:06 node008 node_exporter: CPU usage at 99.6% for 30 seconds on core 1",
        f"Nov 01 06:30:07 node008 node_exporter: CPU usage at 98.9% for 30 seconds on core 2",
        f"Nov 01 06:30:08 node008 systemd[1]: cpu.service: Main process exited due to timeout",
        f"Nov 01 06:30:09 node008 kernel: CPU0: Core temperature above threshold, cpu clock throttled (total events = 8500)",
        f"Nov 01 06:30:10 node008 systemd[1]: billing-v2.service: Watchdog timeout (limit 30s)!",
        f"Nov 01 06:30:11 node008 node_exporter: load average 1m: 98.42, 5m: 87.31, 15m: 61.09",
        f"Nov 01 06:30:12 node008 systemd[1]: billing-v2.service: Killing process 9901 (python3) with signal SIGKILL",
    ],
    "http_flood": [
        '114.12.55.90 - - [01/Nov/2026:07:00:01 +0000] "POST /api/v1/login HTTP/1.1" 500 512 "-" "python-requests/2.28.0"',
        '114.12.55.90 - - [01/Nov/2026:07:00:01 +0000] "POST /api/v1/login HTTP/1.1" 500 512 "-" "python-requests/2.28.0"',
        '114.12.55.90 - - [01/Nov/2026:07:00:02 +0000] "POST /api/v1/login HTTP/1.1" 500 512 "-" "python-requests/2.28.0"',
        '203.0.113.42 - - [01/Nov/2026:07:00:02 +0000] "GET /admin/config HTTP/1.1" 500 512 "-" "curl/7.68.0"',
        '114.12.55.90 - - [01/Nov/2026:07:00:03 +0000] "POST /api/v1/login HTTP/1.1" 500 512 "-" "python-requests/2.28.0"',
        '203.0.113.42 - - [01/Nov/2026:07:00:03 +0000] "DELETE /api/v1/users HTTP/1.1" 500 512 "-" "curl/7.68.0"',
        '114.12.55.90 - - [01/Nov/2026:07:00:04 +0000] "POST /api/v1/login HTTP/1.1" 500 512 "-" "python-requests/2.28.0"',
        '198.51.100.7 - - [01/Nov/2026:07:00:04 +0000] "GET /api/v1/data HTTP/1.1" 503 0 "-" "Mozilla/5.0"',
        'Nov 01 07:00:05 node001 nginx: [error] upstream timed out (110: Connection timed out) while reading response header',
        'Nov 01 07:00:06 node001 nginx: [warn] upstream server temporarily disabled while reading response header',
        '114.12.55.90 - - [01/Nov/2026:07:00:06 +0000] "POST /api/v1/login HTTP/1.1" 502 166 "-" "python-requests/2.28.0"',
        'Nov 01 07:00:07 node001 nginx: [crit] *8239 connect() to 127.0.0.1:8000 failed (111: Connection refused)',
    ],
    "ssl_cert": [
        "Nov 01 08:00:01 node001 nginx: SSL_CTX_use_certificate_file('/etc/nginx/ssl/server.crt'): error:0906D06C:PEM routines:PEM_read_bio:no start line",
        "Nov 01 08:00:01 node001 nginx: SSL_CTX_use_PrivateKey_file('/etc/nginx/ssl/server.key'): error:0200100D:system library:fopen:Permission denied",
        "Nov 01 08:00:02 node001 nginx: SSL: error:0906D06C:PEM routines:PEM_read_bio:no start line (SSL: error setting certificate)",
        "Nov 01 08:00:02 node001 sshd[2200]: error: Could not load host key /etc/ssh/ssh_host_rsa_key",
        "Nov 01 08:00:03 node001 nginx: SSL_do_handshake() failed (SSL: error:1408F10B:SSL routines:SSL3_GET_RECORD:wrong version number) while SSL handshaking",
        "Nov 01 08:00:04 node001 nginx: [error] 14384#0: *1 SSL certificate for sentinel.example.com has expired on 2026-01-01T00:00:00",
        "Nov 01 08:00:04 node001 nginx: [warn] 14384#0: *2 peer closed connection in SSL handshake (104: Connection reset by peer)",
        "Nov 01 08:00:05 node001 nginx: [error] 14384#0: *3 SSL_do_handshake() failed — client may be rejecting expired certificate",
        "Nov 01 08:00:06 node001 certbot: FAILED to renew certificate for sentinel.example.com — ACME challenge failed",
        "Nov 01 08:00:07 node001 fail2ban: [nginx-ssl] Found 203.0.113.42 — repeated SSL handshake failures",
    ],
}


# ── Helpers ─────────────────────────────────────────────────────────────────

def _rotate_log_if_needed(log_file: str):
    """Truncate live_system.log if it exceeds LOG_MAX_BYTES to avoid unbounded growth."""
    try:
        if os.path.exists(log_file) and os.path.getsize(log_file) > LOG_MAX_BYTES:
            logger.info(f"Log rotation triggered: {log_file} exceeds {LOG_MAX_BYTES} bytes.")
            with open(log_file, "rb") as f:
                f.seek(-int(LOG_MAX_BYTES * 0.2), 2)
                tail = f.read()
            with open(log_file, "wb") as f:
                f.write(tail)
            logger.info("Log rotation complete.")
    except Exception as e:
        logger.warning(f"Log rotation failed: {e}")


async def _run_ai_pipeline(stream_parser: LogParser, lines: list):
    """
    Feeds new log lines into the session parser and runs the full AI pipeline.
    The T5 summarizer is CPU-bound, so we offload it to a thread pool executor
    to avoid blocking the asyncio event loop.
    """
    loop = asyncio.get_running_loop()

    for line in lines:
        stream_parser.parse_log(line)

    unique_templates = stream_parser.get_all_templates()
    ranked_templates = analyzer.analyze_templates(unique_templates)
    top_5 = ranked_templates[:5]

    # Offload blocking T5 call to thread pool
    summary = await loop.run_in_executor(
        _thread_pool,
        summarizer.summarize,
        top_5[:2]
    )
    return unique_templates, ranked_templates, top_5, summary


# ── API Endpoints ────────────────────────────────────────────────────────────

@app.get("/api/health")
def health_check():
    """Rich health endpoint for monitoring and deployment checks."""
    return {
        "status": "ok",
        "version": "2.0.0",
        "uptime_seconds": round(time.time() - _startup_time),
        "model": MODEL_NAME,
        "use_ai": USE_AI,
        "data_dir": DATA_DIR,
        "active_streams": len(active_streams),
        "max_concurrent_streams": MAX_CONCURRENT_STREAMS,
    }

@app.get("/")
def root_redirect():
    return {"status": "Cloud-Sentinel AI Log Interpreter is active.", "docs": "/docs"}


@app.get("/api/replay")
def replay_dataset():
    """
    Runs the full AI pipeline on the bundled sample_syslog.log dataset.
    Great for demonstrating capabilities with a rich, realistic log corpus.
    """
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
    from datasets.replay_loader import DatasetReplayer

    # Prefer the large real syslog dataset; fall back to the small stub
    candidates = [
        os.path.join(DATASETS_DIR, "sample_syslog.log"),
        os.path.join(DATASETS_DIR, "bgl_sample.log"),
    ]
    dataset_file = next((p for p in candidates if os.path.exists(p)), None)
    if not dataset_file:
        return JSONResponse(status_code=404, content={"error": "No dataset file found in datasets/"})

    start_time = time.time()
    stale = os.path.join(DATA_DIR, "drain3_replay.bin")
    if os.path.exists(stale):
        os.remove(stale)
    replay_parser = LogParser(persistence_path=stale)

    lines_parsed = []
    def on_line(line):
        if len(lines_parsed) < 2000:   # cap at 2000 lines for speed
            replay_parser.parse_log(line)
            lines_parsed.append(line)

    replayer = DatasetReplayer(dataset_file, callback=on_line, speed="turbo")
    replayer.start()

    unique_templates = replay_parser.get_all_templates()
    ranked_templates = analyzer.analyze_templates(unique_templates)
    top_5 = ranked_templates[:5]
    summary = summarizer.summarize(top_5[:2])

    return {
        "status": "complete",
        "dataset": os.path.basename(dataset_file),
        "total_logs": len(lines_parsed),
        "unique_templates": len(unique_templates),
        "top_clusters": top_5,
        "ai_summary": summary,
        "processing_time_ms": round((time.time() - start_time) * 1000)
    }


async def run_analysis_pipeline(text: str):
    """Refactored core pipeline to run in background."""
    global latest_analysis
    start_time = time.time()

    log_lines = [line.strip() for line in text.split("\n") if line.strip()]
    latest_analysis["total_logs"] = len(log_lines)

    if not log_lines:
        latest_analysis["status"] = "error"
        return

    try:
        stale = os.path.join(DATA_DIR, "drain3_state_upload.bin")
        if os.path.exists(stale):
            os.remove(stale)
        fresh_parser = LogParser(persistence_path=stale)

        for line in log_lines:
            fresh_parser.parse_log(line)

        unique_templates = fresh_parser.get_all_templates()
        latest_analysis["unique_templates"] = len(unique_templates)

        ranked_templates = analyzer.analyze_templates(unique_templates)
        top_5 = ranked_templates[:5]
        latest_analysis["top_clusters"] = top_5

        loop = asyncio.get_running_loop()
        summary = await loop.run_in_executor(_thread_pool, summarizer.summarize, top_5[:2])
        latest_analysis["ai_summary"] = summary

        latest_analysis["processing_time_ms"] = round((time.time() - start_time) * 1000)
        latest_analysis["status"] = "complete"
    except Exception as e:
        print(f"Error in background pipeline: {e}")
        latest_analysis["status"] = "error"


@app.post("/api/analyze")
async def analyze_log_file(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """
    Accepts a log file upload.
    Runs the 3-step brain pipeline in the background.
    """
    global latest_analysis

    content = await file.read()
    text = content.decode("utf-8")

    if not text.strip():
        return {"error": "File is empty"}

    latest_analysis["status"] = "processing"
    latest_analysis["ai_summary"] = ""
    latest_analysis["top_clusters"] = []

    background_tasks.add_task(run_analysis_pipeline, text)

    return {"message": "Analysis started in background", "status": "processing"}


@app.get("/api/results")
def get_latest_results():
    """Returns the most recent analysis data for the dashboard."""
    return latest_analysis


@app.get("/api/test-sse")
async def test_sse():
    """Diagnostic endpoint to verify SSE connection works independently of logs."""
    async def tester():
        for i in range(5):
            yield f"data: {json.dumps({'message': f'Test signal {i}', 'status': 'connected'})}\n\n"
            await asyncio.sleep(1)
    return StreamingResponse(tester(), media_type="text/event-stream")


@app.get("/api/library/{scenario}")
def load_library_scenario(scenario: str):
    """Loads a predefined log scenario for quick demo testing without files."""
    scenarios = {
        "ssh_brute": [
            "Failed password for root from 192.168.1.1 port 22 ssh2",
            "Failed password for root from 192.168.1.2 port 22 ssh2",
            "Failed password for invalid user admin from 114.12.55.90 port 54321 ssh2",
            "Failed password for root from 192.168.1.1 port 22 ssh2",
            "Failed password for root from 192.168.1.1 port 22 ssh2"
        ],
        "java_oom": [
            "Oct 10 12:02:00 server2 kernel: Out of memory: Kill process 5678 (java)",
            "Oct 10 12:02:15 server2 kernel: Out of memory: Kill process 5679 (java)",
            "Oct 10 12:02:30 server2 kernel: Out of memory: Kill process 5680 (java)"
        ],
        "mixed_noise": [
            "Heartbeat OK from node 10.0.0.5",
            "systemd: Started Session 1 of user normal_user.",
            "kernel: Out of memory: Kill process 1234 (python)",
            "Heartbeat OK from node 10.0.0.6",
            "systemd: Started Session 2 of user normal_user."
        ],
        "disk_full": [
            "kernel: EXT4-fs error (device sda1): ext4_find_entry: No space left on device",
            "kernel: EXT4-fs error (device sda1): ext4_find_entry: No space left on device",
            "rsyslogd: imuxsock lost 482 messages from pid 3991 due to rate-limiting",
            "kernel: No space left on device — write failed on /var/log/syslog",
            "systemd: var-log.mount: Disk quota exceeded, write failed",
            "kernel: EXT4-fs error (device sda1): ext4_find_entry: No space left on device",
            "CRON: (root) ERROR (failed to open PAM security session: No space left on device)"
        ],
        "db_deadlock": [
            "2026-03-15 13:00:00.000 UTC [db_cluster_01] ERROR: deadlock detected: Process 1234 waiting for ShareLock on transaction 555",
            "2026-03-15 13:00:00.010 UTC [db_cluster_01] DETAIL: Process 5678 holds ExclusiveLock on transaction 555; Process 1234 blocks Process 5678",
            "2026-03-15 13:00:00.020 UTC [db_cluster_01] ERROR: deadlock detected: Process 2345 waiting for ShareLock on transaction 556",
            "2026-03-15 13:00:01.000 UTC [db_cluster_01] WARNING: could not serialize access due to concurrent update",
            "2026-03-15 13:00:01.100 UTC [db_cluster_01] ERROR: deadlock detected: Process 3456 waiting for ShareLock on transaction 557",
            "2026-03-15 13:00:02.000 UTC [db_cluster_01] FATAL: terminating connection due to administrator command"
        ],
        "http_flood": [
            '192.168.1.10 - - [15/Mar/2026:13:00:01 +0000] "POST /api/v1/login HTTP/1.1" 500 512 "-" "Mozilla/5.0"',
            '10.0.0.5 - - [15/Mar/2026:13:00:02 +0000] "GET /api/v1/data HTTP/1.1" 500 512 "-" "Mozilla/5.0"',
            '172.16.254.1 - - [15/Mar/2026:13:00:03 +0000] "GET /admin/config HTTP/1.1" 500 512 "-" "Mozilla/5.0"',
            '114.12.55.90 - - [15/Mar/2026:13:00:04 +0000] "POST /api/v1/login HTTP/1.1" 500 512 "-" "Mozilla/5.0"',
            '192.168.1.10 - - [15/Mar/2026:13:00:05 +0000] "GET /health HTTP/1.1" 500 512 "-" "Mozilla/5.0"',
            '10.0.0.5 - - [15/Mar/2026:13:00:06 +0000] "DELETE /api/v1/data HTTP/1.1" 500 512 "-" "Mozilla/5.0"',
            "Heartbeat OK from node 10.0.0.5",
            "Heartbeat OK from node 10.0.0.6"
        ],
        "ssl_cert": [
            "nginx: SSL_CTX_use_certificate_file: error:0906D06C:PEM routines: no start line",
            "nginx: SSL_CTX_use_PrivateKey_file('/etc/nginx/ssl/server.key'): error:0200100D:system library:fopen:Permission denied",
            "nginx: SSL: error:0906D06C:PEM routines:PEM_read_bio:no start line (SSL: error setting certificate)",
            "sshd: error: Could not load host key /etc/ssh/ssh_host_rsa_key",
            "nginx: SSL_do_handshake() failed (SSL: error:1408F10B:SSL routines:SSL3_GET_RECORD:wrong version number)",
            "nginx: SSL certificate for example.com has expired on 2026-01-01"
        ],
        "kernel_panic": [
            "kernel: BUG: unable to handle kernel NULL pointer dereference at 0000000000000000",
            "kernel: IP: kmem_cache_alloc+0x14c/0x1c0",
            "kernel: Kernel panic - not syncing: Fatal exception in interrupt",
            "kernel: CPU: 0 PID: 0 Comm: swapper/0 Kdump: loaded Tainted: P D",
            "kernel: Out of memory: Kill process 1001 (init) score 9999 or sacrifice child",
            "kernel: Call Trace: <IRQ> ? native_queued_spin_lock_slowpath+0x18b/0x360",
            "systemd: Watchdog keepalive missed — system is unresponsive"
        ],
        "cpu_spike": [
            "kernel: CPU0: Core temperature above threshold, cpu clock throttled (total events = 8442)",
            "kernel: CPU1: Package temperature above threshold, cpu clock throttled (total events = 8443)",
            "systemd: cpu.service: Main process exited due to timeout",
            "kernel: CPU0: Core temperature above threshold, cpu clock throttled (total events = 8500)",
            "node_exporter: CPU usage at 99.8% for 30 seconds on core 0",
            "node_exporter: CPU usage at 99.6% for 30 seconds on core 1",
            "systemd: billing-v2.service: Watchdog timeout (limit 30s)!"
        ]
    }

    if scenario not in scenarios:
        return {"error": "Scenario not found"}

    start_time = time.time()
    log_lines = scenarios[scenario]

    stale = os.path.join(DATA_DIR, f"drain3_demo_{scenario}.bin")
    if os.path.exists(stale):
        os.remove(stale)
    fresh_parser = LogParser(persistence_path=stale)

    for line in log_lines:
        fresh_parser.parse_log(line)

    unique_templates = fresh_parser.get_all_templates()
    ranked_templates = analyzer.analyze_templates(unique_templates)
    top_5 = ranked_templates[:5]
    summary = summarizer.summarize(top_5[:2])

    end_time = time.time()

    return {
        "status": "complete",
        "total_logs": len(log_lines),
        "unique_templates": len(unique_templates),
        "top_clusters": top_5,
        "ai_summary": summary,
        "processing_time_ms": round((end_time - start_time) * 1000)
    }


# ── Live Stream (SSE) ────────────────────────────────────────────────────────

@app.get("/api/stream")
async def log_stream():
    """
    Server-Sent Events endpoint with in-process async chaos log generator.

    Architecture:
    - A unique session_id is created per connection.
    - An async chaos producer generates dirty, mixed, realistic logs continuously.
    - An inject queue per session allows external incident injection mid-stream.
    - Both feed a shared main_queue consumed by the SSE event generator.
    - When the client disconnects, all tasks are cancelled automatically.
    - Session limit enforced: MAX_CONCURRENT_STREAMS.
    """
    if len(active_streams) >= MAX_CONCURRENT_STREAMS:
        logger.warning(f"Stream capacity reached ({MAX_CONCURRENT_STREAMS}). Rejecting new connection.")
        return JSONResponse(
            status_code=503,
            content={"error": f"Live stream is at capacity ({MAX_CONCURRENT_STREAMS} concurrent users). Try again shortly."}
        )

    session_id = str(uuid.uuid4())
    inject_queue: asyncio.Queue = asyncio.Queue(maxsize=100)
    main_queue: asyncio.Queue = asyncio.Queue(maxsize=200)
    active_streams[session_id] = inject_queue
    logger.info(f"New SSE session: {session_id} | Active sessions: {len(active_streams)}")

    async def chaos_producer():
        """
        Continuously generates chaotic, mixed, dirty log lines and feeds main_queue.
        Runs for the lifetime of the SSE connection only.
        """
        while True:
            log_line = generate_chaos_log()
            try:
                main_queue.put_nowait(log_line)
            except asyncio.QueueFull:
                pass  # Drop if consumer is lagging — prevents memory buildup
            await asyncio.sleep(random.uniform(0.4, 2.2))

    async def incident_relay():
        """
        Listens on the inject_queue for scenario logs and forwards them to main_queue.
        Logs are injected one at a time with realistic delays to simulate an unfolding incident.
        """
        while True:
            try:
                log_line = await asyncio.wait_for(inject_queue.get(), timeout=1.0)
                try:
                    main_queue.put_nowait(log_line)
                except asyncio.QueueFull:
                    pass
            except asyncio.TimeoutError:
                pass  # Nothing queued — keep waiting

    async def event_generator():
        # Use an in-memory-only parser for streams — no file persistence.
        # This avoids any FilePersistence path or permission issues on the server.
        stream_parser = LogParser(persistence_path=os.path.join(DATA_DIR, f"drain3_stream_{session_id[:8]}.bin"))

        chaos_task    = None
        incident_task = None

        try:
            chaos_task    = asyncio.create_task(chaos_producer())
            incident_task = asyncio.create_task(incident_relay())
            logger.info(f"[{session_id[:8]}] Chaos producer and incident relay tasks started.")
        except Exception as e:
            logger.error(f"[{session_id[:8]}] Failed to start background tasks: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'error': f'Engine startup failed: {e}'})}\n\n"
            active_streams.pop(session_id, None)
            return

        # Send the session_id as the very first SSE event so the frontend
        # can use it when calling the inject endpoint.
        yield f"data: {json.dumps({'type': 'session', 'session_id': session_id})}\n\n"

        accumulated_lines = []
        last_emit_time    = time.time()

        try:
            while True:
                try:
                    log_line = await asyncio.wait_for(main_queue.get(), timeout=3.0)
                    accumulated_lines.append(log_line)
                except asyncio.TimeoutError:
                    # No new logs — send heartbeat to keep connection alive
                    yield ": heartbeat\n\n"
                    continue

                now = time.time()
                should_emit = (
                    len(accumulated_lines) >= 8 or
                    (now - last_emit_time >= 2.5 and accumulated_lines)
                )

                if should_emit:
                    chunk_start = time.time()
                    try:
                        unique_templates, ranked_templates, top_5, summary = await _run_ai_pipeline(
                            stream_parser, accumulated_lines
                        )

                        payload = {
                            "type": "analysis",
                            "status": "live",
                            "new_logs_chunk": len(accumulated_lines),
                            "total_logs": len(accumulated_lines),
                            "unique_templates": len(unique_templates),
                            "top_clusters": top_5,
                            "ai_summary": summary,
                            "processing_time_ms": round((time.time() - chunk_start) * 1000),
                            "raw_lines": accumulated_lines[-6:],
                        }

                        data_str = json.dumps(payload)
                        logger.info(f"[{session_id[:8]}] Yielding payload: {len(accumulated_lines)} lines, {len(data_str)} bytes")
                        yield f"data: {data_str}\n\n"

                    except Exception as e:
                        logger.error(f"[{session_id[:8]}] Pipeline error: {e}", exc_info=True)
                        yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

                    accumulated_lines = []
                    last_emit_time    = time.time()

        except asyncio.CancelledError:
            logger.info(f"[{session_id[:8]}] SSE connection closed by client.")
        except Exception as e:
            logger.error(f"[{session_id[:8]}] CRITICAL SSE FAILURE: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'error': str(e), 'status': 'disconnected'})}\n\n"
        finally:
            # Guaranteed cleanup — tasks die with the connection
            if chaos_task:    chaos_task.cancel()
            if incident_task: incident_task.cancel()
            active_streams.pop(session_id, None)
            tasks_to_gather = [t for t in [chaos_task, incident_task] if t]
            if tasks_to_gather:
                await asyncio.gather(*tasks_to_gather, return_exceptions=True)
            logger.info(f"[{session_id[:8]}] Session cleaned up. Active sessions: {len(active_streams)}")

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@app.post("/api/stream/inject/{scenario}")
async def inject_scenario(scenario: str, session_id: str):
    """
    Injects a named incident scenario into an active live stream session.
    Logs are delivered one at a time with realistic delays to simulate
    an incident unfolding gradually inside the chaos stream.

    Query param: session_id (returned as the first SSE event on connect)
    """
    if scenario not in INCIDENT_SCENARIOS:
        return JSONResponse(status_code=404, content={"error": f"Unknown scenario: {scenario}"})

    if session_id not in active_streams:
        return JSONResponse(status_code=404, content={"error": "Session not found or expired. Please reconnect."})

    queue = active_streams[session_id]
    logs  = INCIDENT_SCENARIOS[scenario]

    async def gradual_inject():
        """Drip-feeds scenario logs into the session's inject queue with realistic timing."""
        for log_line in logs:
            try:
                await queue.put(log_line)
            except Exception:
                pass
            # Vary delay: incident logs don't all arrive at once
            await asyncio.sleep(random.uniform(0.8, 3.5))

    asyncio.create_task(gradual_inject())

    logger.info(f"Injecting scenario '{scenario}' into session {session_id[:8]} ({len(logs)} log lines)")
    return {
        "status": "injecting",
        "scenario": scenario,
        "total_lines": len(logs),
        "session_id": session_id,
    }


@app.post("/api/stream/cancel-inject")
async def cancel_inject(session_id: str):
    """
    Cancels an active injection by draining the inject queue.
    The stream continues with normal chaos logs only.
    """
    if session_id not in active_streams:
        return JSONResponse(status_code=404, content={"error": "Session not found or expired."})

    queue = active_streams[session_id]
    drained = 0
    while not queue.empty():
        try:
            queue.get_nowait()
            drained += 1
        except asyncio.QueueEmpty:
            break

    logger.info(f"Cancelled injection for session {session_id[:8]} — drained {drained} queued logs")
    return {
        "status": "cancelled",
        "drained_logs": drained,
        "session_id": session_id,
    }
