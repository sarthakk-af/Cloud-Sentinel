# engine/incidents.py

import time
from collections import defaultdict

class IncidentManager:
    """
    Groups related failures into a single incident
    to avoid symptom-based fixes.
    """

    def __init__(self, window=30):
        self.window = window
        self.active_incidents = {}
        self.incident_history = []

    def process(self, classification, event):
        now = time.time()
        pattern = classification["pattern"]

        # Clean expired incidents
        expired = []
        for key, data in self.active_incidents.items():
            if now - data["start"] > self.window:
                expired.append(key)

        for key in expired:
            self.incident_history.append(self.active_incidents.pop(key))

        # Attach to existing incident
        for key, data in self.active_incidents.items():
            if data["root"] == pattern:
                data["events"].append(event.message)
                return "SUPPRESSED", f"Part of incident: {pattern}"

        # Create new incident only for strong signals
        if classification["confidence"] > 0.80:
            self.active_incidents[pattern] = {
                "root": pattern,
                "start": now,
                "events": [event.message]
            }
            return "NEW_INCIDENT", f"Root cause detected: {pattern}"

        return "NONE", ""
