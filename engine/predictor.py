# engine/predictor.py

import time
from collections import defaultdict

class FailurePredictor:
    """
    Predict failures using symptom categories instead of identical logs
    """

    def __init__(self, window=30, threshold=3):
        self.window = window
        self.threshold = threshold
        self.events = defaultdict(list)

        # group patterns into failure families
        self.symptom_groups = {
            "security": ["failed password"],
            "service": ["service crash"],
            "resource": ["disk full", "out of memory"]
        }

        self.predictions = {
            "security": "Possible brute force attack",
            "service": "Service instability detected",
            "resource": "Resource exhaustion likely soon"
        }

    def _get_group(self, pattern):
        for group, patterns in self.symptom_groups.items():
            if pattern in patterns:
                return group
        return None

    def evaluate(self, classification):
        pattern = classification["pattern"]
        group = self._get_group(pattern)

        if not group:
            return None

        now = time.time()
        self.events[group].append(now)

        # keep only recent timestamps
        self.events[group] = [
            t for t in self.events[group] if now - t <= self.window
        ]

        if len(self.events[group]) >= self.threshold:
            self.events[group].clear()
            return self.predictions[group]

        return None
