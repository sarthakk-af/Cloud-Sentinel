# engine/baseline.py

from collections import defaultdict
import hashlib


class BaselineFilter:
    """
    Learns recurring unknown logs and suppresses alert storms.
    """

    def __init__(self, learn_threshold=20):
        self.counts = defaultdict(int)
        self.learned_normal = set()
        self.learn_threshold = learn_threshold

    def _fingerprint(self, message):
        """
        Normalize dynamic values (IDs, numbers, IPs)
        so repeated patterns match.
        """
        import re
        msg = re.sub(r'\d+\.\d+\.\d+\.\d+', '<IP>', message)
        msg = re.sub(r'\d+', '<NUM>', msg)
        return hashlib.md5(msg.encode()).hexdigest()

    def evaluate(self, classification, event):
        # Only learn low confidence logs
        if classification["confidence"] > 0.6:
            return False  # not baseline noise

        key = self._fingerprint(event.message)
        self.counts[key] += 1

        if key in self.learned_normal:
            return True  # ignore

        if self.counts[key] >= self.learn_threshold:
            print(f"[BASELINE] Learned normal pattern: {event.message[:60]}...")
            self.learned_normal.add(key)
            return True

        return False
