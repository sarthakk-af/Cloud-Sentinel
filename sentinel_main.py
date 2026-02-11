import time
import os
from sentinel_brain import SentinelBrain

def run_sentinel():
    LOG_FILE = "mock_system.log"
    brain = SentinelBrain()
    
    # Create file if it doesn't exist
    if not os.path.exists(LOG_FILE):
        open(LOG_FILE, 'w').close()

    print(f"--- Sentinel System Online. Watching {LOG_FILE} ---")
    
    with open(LOG_FILE, "r") as f:
        # Move to the end of the file
        f.seek(0, os.SEEK_END)
        
        while True:
            line = f.readline()
            if not line:
                time.sleep(0.5) # Sleep briefly to save CPU
                continue
            
            brain.process_log(line.strip())

if __name__ == "__main__":
    try:
        run_sentinel()
    except KeyboardInterrupt:
        print("\nSentinel shutting down gracefully...")