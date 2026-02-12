# engine/decision.py

import time
from collections import defaultdict


class DecisionEngine:
    """
    Decides what to do with a classified log event.
    Uses time-window memory to prevent alert saturation.
    """

    def __init__(self):
        self.last_action_time = defaultdict(float)

        # NEW: time-window tracking
        self.repeat_events = defaultdict(list)
        self.repeat_window = 60  # seconds

        # policy thresholds
        self.ignore_threshold = 0.40
        self.monitor_threshold = 0.60
        self.fix_threshold = 0.75
        self.cooldown_seconds = 30
        self.escalation_limit = 5

    def evaluate(self, classification, event):
        key = classification["pattern"]
        confidence = classification["confidence"]
        now = time.time()

        # ---- Track events in recent time window ----
        self.repeat_events[key].append(now)
        self.repeat_events[key] = [
            t for t in self.repeat_events[key]
            if now - t <= self.repeat_window
        ]

        repeat_count = len(self.repeat_events[key])

        # Cooldown protection
        if now - self.last_action_time[key] < self.cooldown_seconds:
            return "MONITOR", "Cooldown active"

        # Escalation protection
        if repeat_count >= self.escalation_limit:
            return "ESCALATE", "Too frequent failures in short time"

        # Confidence policy
        if confidence < self.ignore_threshold:
            return "IGNORE", "Low confidence"

        if confidence < self.monitor_threshold:
            return "MONITOR", "Suspicious but uncertain"

        if confidence < self.fix_threshold:
            return "MONITOR", "Not safe enough for auto fix"

        self.last_action_time[key] = now
        return "AUTO_FIX", "High confidence"
