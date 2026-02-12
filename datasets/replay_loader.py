import time

class DatasetReplayer:
    """
    Feeds historical logs into the Sentinel pipeline.
    Simulates large scale log ingestion.
    """

    def __init__(self, file_path, callback, speed="fast"):
        self.file_path = file_path
        self.callback = callback
        self.speed = speed

        self.delay = {
            "realtime": 0.2,
            "fast": 0.01,
            "turbo": 0
        }[speed]

    def start(self):
        print(f"--- Replaying dataset: {self.file_path} | Speed: {self.speed} ---")

        with open(self.file_path, "r", errors="ignore") as f:
            for line in f:
                self.callback(line.strip())
                if self.delay:
                    time.sleep(self.delay)
