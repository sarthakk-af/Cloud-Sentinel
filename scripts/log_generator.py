import time
import random
import os
from datetime import datetime

# Resolve absolute path so the script works from any directory
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_SCRIPT_DIR)
LOG_FILE = os.path.join(_PROJECT_ROOT, "data", "live_system.log")

TEMPLATES = [
    # Normal Logs (High Frequency)
    {"msg": "Heartbeat OK from node 10.0.0.{ip_suffix}", "weight": 60},
    {"msg": "systemd: Started Session {session_id} of user normal_user.", "weight": 20},
    {"msg": "nginx: 192.168.1.{ip_suffix} - - [{timestamp}] \"GET /api/status HTTP/1.1\" 200 {bytes}", "weight": 40},
    
    # Warning Logs (Medium Frequency)
    {"msg": "kernel: Connection timeout on interface eth{interface}", "weight": 5},
    {"msg": "nginx: 192.168.1.{ip_suffix} - - [{timestamp}] \"GET /api/data HTTP/1.1\" 404 {bytes}", "weight": 10},
    
    # Critical Logs (Low Frequency - Anomalies)
    {"msg": "kernel: Out of memory: Kill process {pid} (java) score 950", "weight": 1},
    {"msg": "sshd[{pid}]: Failed password for root from 192.168.1.{ip_suffix} port 22 ssh2", "weight": 2},
    {"msg": "kernel: Critical memory exhaustion detected - threshold {threshold}%", "weight": 1},
]

def generate_log():
    # Select a template based on weights to simulate realistic distributions
    weights = [float(t["weight"]) for t in TEMPLATES]
    template = str(random.choices(TEMPLATES, weights=weights, k=1)[0]["msg"])
    
    # Generate dynamic variables
    timestamp_format = "%b %d %H:%M:%S"
    formatted_time = datetime.now().strftime(timestamp_format)
    
    log_line = template.format(
        ip_suffix=random.randint(1, 20),
        session_id=random.randint(100, 999),
        timestamp=formatted_time,
        bytes=random.randint(500, 2000),
        interface=random.randint(0, 1),
        pid=random.randint(1000, 9999),
        threshold=random.choice([90, 95, 99])
    )
    
    # Prepend basic syslog format
    full_log = f"{formatted_time} node{random.randint(1,5):03d} {log_line}\n"
    return full_log

if __name__ == "__main__":
    print(f"Starting Live Log Generator. Writing to {LOG_FILE}...")
    print("Press Ctrl+C to stop.")
    
    # Clear the file first
    with open(LOG_FILE, "w") as f:
         f.write("")
    
    try:
        while True:
            log_entry = generate_log()
            with open(LOG_FILE, "a") as f:
                f.write(log_entry)
            
            # Print to console for confirmation
            print(log_entry.strip())
            
            # Sleep for a random interval to simulate bursty traffic
            time.sleep(random.uniform(0.1, 2.0))
    except KeyboardInterrupt:
        print("\nLog Generator stopped.")
