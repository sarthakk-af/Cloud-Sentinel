import time
import os

class LogWatcher:
    """
    Watches a log file and emits new lines as events.
    This module does NOT process or understand logs.
    """

    def __init__(self, log_file, callback, poll_interval=0.5):
        self.log_file = log_file
        self.callback = callback
        self.poll_interval = poll_interval
        self._running = False

        # Ensure file exists
        if not os.path.exists(self.log_file):
            open(self.log_file, "w").close()

    def start(self):
        print(f"--- Sentinel Watcher Active | Monitoring: {self.log_file} ---")
        self._running = True

        with open(self.log_file, "r") as f:
            f.seek(0, os.SEEK_END)

            while self._running:
                line = f.readline()
                if not line:
                    time.sleep(self.poll_interval)
                    continue
                self.callback(line.strip())

    def stop(self):
        self._running = False
