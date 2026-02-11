import time
import random
from datetime import datetime

class ServerSimulator:
    def __init__(self, log_file="mock_system.log"):
        self.log_file = log_file
        self.errors = [
            "kernel: [123.45] out of memory: kill process",
            "sshd[1234]: Failed password for root from 192.168.1.50",
            "systemd[1]: apache2.service: Failed with result 'exit-code'.",
            "kernel: [987.65] partition /dev/sda1 is full (100%)",
            "sshd[5678]: Connection closed by authenticating user admin"
        ]

    def generate(self):
        print(f"--- Simulator Started: Writing to {self.log_file} ---")
        while True:
            try:
                with open(self.log_file, "a") as f:
                    timestamp = datetime.now().strftime("%b %d %H:%M:%S")
                    error = random.choice(self.errors)
                    log_line = f"{timestamp} server1 {error}"
                    f.write(log_line + "\n")
                    print(f"[LIVE LOG]: {log_line}")
                time.sleep(random.randint(3, 7)) # Randomize timing
            except KeyboardInterrupt:
                print("\nStopping Simulator...")
                break

if __name__ == "__main__":
    sim = ServerSimulator()
    sim.generate()