# api/server.py
from fastapi import FastAPI, UploadFile, File, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import time
import asyncio
import json
import logging
import os

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

# Instantiate shared stateless engines
logger.info("Waking up Intelligence Engine...")
try:
    analyzer = LogAnalyzer()
    summarizer = LogSummarizer(use_ai=USE_AI, model_name=MODEL_NAME)
    logger.info(f"Intelligence Engine Ready. model={MODEL_NAME}, use_ai={USE_AI}")
except Exception as e:
    logger.error(f"Error initializing Engine: {e}")

# In-memory storage for the latest analysis
latest_analysis = {
    "status": "idle",
    "total_logs": 0,
    "unique_templates": 0,
    "top_clusters": [],
    "ai_summary": "",
    "processing_time_ms": 0
}

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
    }

@app.get("/")
def root_redirect():
    return {"status": "Cloud-Sentinel AI Log Interpreter is active.", "docs": "/docs"}

def _rotate_log_if_needed(log_file: str):
    """Truncate live_system.log if it exceeds LOG_MAX_BYTES to avoid unbounded growth."""
    try:
        if os.path.exists(log_file) and os.path.getsize(log_file) > LOG_MAX_BYTES:
            logger.info(f"Log rotation triggered: {log_file} exceeds {LOG_MAX_BYTES} bytes.")
            # Keep the last 20% of the file to preserve recent context
            with open(log_file, "rb") as f:
                f.seek(-int(LOG_MAX_BYTES * 0.2), 2)
                tail = f.read()
            with open(log_file, "wb") as f:
                f.write(tail)
            logger.info("Log rotation complete.")
    except Exception as e:
        logger.warning(f"Log rotation failed: {e}")

@app.get("/api/replay")
def replay_dataset():
    """
    Runs the full AI pipeline on the bundled sample_syslog.log dataset.
    Great for demonstrating capabilities with a rich, realistic log corpus.
    """
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
    from datasets.replay_loader import DatasetReplayer

    # Try the large syslog first, fall back to bgl_sample
    candidates = [
        os.path.join(DATASETS_DIR, "bgl_sample.log"),
        os.path.join(DATASETS_DIR, "sample_syslog.log"),
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
        # Phase A: Delete stale state FIRST, then create a fresh parser
        stale = os.path.join(DATA_DIR, "drain3_state_upload.bin")
        if os.path.exists(stale):
            os.remove(stale)
        fresh_parser = LogParser(persistence_path=stale)
        
        for line in log_lines:
            fresh_parser.parse_log(line)
            
        unique_templates = fresh_parser.get_all_templates()
        latest_analysis["unique_templates"] = len(unique_templates)

        # Phase B: Analyze & Filter
        ranked_templates = analyzer.analyze_templates(unique_templates)
        top_5 = ranked_templates[:5]
        latest_analysis["top_clusters"] = top_5
        
        # Phase C: Summarize
        summary = summarizer.summarize(top_5[:2])
        latest_analysis["ai_summary"] = summary
        
        end_time = time.time()
        latest_analysis["processing_time_ms"] = round((end_time - start_time) * 1000)
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
    
    # 1. Read file contents
    content = await file.read()
    text = content.decode("utf-8")
    
    if not text.strip():
        return {"error": "File is empty"}

    # Reset state and trigger background task
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
        # --- Original 3 ---
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

        # --- 6 New Scenarios ---
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
    
    # Fresh parser per scenario — avoids polluting counts with prior runs
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

@app.get("/api/stream")
async def log_stream():
    """
    Server-Sent Events (SSE) endpoint that tails live_system.log.
    Every few seconds, it analyzes the newest chunk of logs and yields the AI results.
    """
    logger.info("New SSE Stream Connection requested.")
    LOG_FILE = os.path.join(DATA_DIR, "live_system.log")
    
    async def event_generator():
        logger.info("Initializing Event Generator loop.")
        yield ": open\n\n"
        
        if not os.path.exists(LOG_FILE):
            logger.warning(f"Log file not found at {LOG_FILE}. Creating empty file.")
            with open(LOG_FILE, "w") as f: f.write("")
                
        try:
            # Create ONE stream parser per SSE connection — resets counts on reconnect,
            # but accumulates naturally across chunks within the same session.
            stream_bin = os.path.join(DATA_DIR, "drain3_stream.bin")
            if os.path.exists(stream_bin):
                os.remove(stream_bin)
            stream_parser = LogParser(persistence_path=stream_bin)
            logger.info("Stream parser initialised (fresh state).")

            # We use a simple polling read to avoid long-running locks on Windows
            last_position = os.path.getsize(LOG_FILE)
            logger.info(f"Starting tailing from position {last_position}")
            
            while True:
                # Check if file was truncated or rotated
                current_size = os.path.getsize(LOG_FILE)
                if current_size < last_position:
                    logger.info("Log file rotation detected. Resetting pointer.")
                    last_position = 0
                
                if current_size > last_position:
                    with open(LOG_FILE, "r") as f:
                        f.seek(last_position)
                        content = f.read()
                        last_position = f.tell()
                        
                    if content.strip():
                        lines = [l for l in content.splitlines() if l.strip()]
                        logger.info(f"Processing {len(lines)} new log lines.")
                        
                        start_time = time.time()
                        
                        # Feed lines into the session-scoped stream parser
                        for line in lines:
                            stream_parser.parse_log(line)
                            
                        unique_templates = stream_parser.get_all_templates()
                        ranked_templates = analyzer.analyze_templates(unique_templates)
                        top_5 = ranked_templates[:5]
                        summary = summarizer.summarize(top_5[:2])
                        
                        payload = {
                            "status": "live",
                            "new_logs_chunk": len(lines),
                            "total_logs": len(lines),
                            "unique_templates": len(unique_templates),
                            "top_clusters": top_5,
                            "ai_summary": summary,
                            "processing_time_ms": round((time.time() - start_time) * 1000)
                        }
                        
                        try:
                            data_str = json.dumps(payload)
                            logger.info(f"Yielding payload: {len(data_str)} bytes")
                            yield f"data: {data_str}\n\n"
                        except Exception as json_err:
                            logger.error(f"Serialization Failure: {json_err}")
                    
                else:
                    # Heartbeat
                    yield ": heartbeat\n\n"
                    
                await asyncio.sleep(2.0)
                
        except Exception as e:
            logger.error(f"CRITICAL SSE FAILURE: {e}", exc_info=True)
            yield f"data: {json.dumps({'error': str(e), 'status': 'disconnected'})}\n\n"
                
    return StreamingResponse(
        event_generator(), 
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable buffering for Nginx if any
        }
    )
