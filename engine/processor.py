import re
from dataclasses import dataclass
from datetime import datetime

@dataclass
class LogEvent:
    timestamp: str
    severity: str
    source: str
    message: str
    raw: str


class LogProcessor:
    """
    Converts raw log lines into structured LogEvent objects.
    """

    # Example:
    # Oct 10 12:01:00 server1 kernel: Out of memory
    LOG_PATTERN = re.compile(
        r'^(?P<month>\w{3})\s+(?P<day>\d+)\s+(?P<time>\d{2}:\d{2}:\d{2})\s+(?P<host>\S+)\s+(?P<source>[\w\-\/\.]+):\s+(?P<message>.*)$'
    )

    SEVERITY_MAP = {
        "error": "ERROR",
        "failed": "ERROR",
        "critical": "CRITICAL",
        "warning": "WARNING",
        "denied": "SECURITY",
        "invalid": "SECURITY",
        "timeout": "NETWORK",
        "memory": "RESOURCE",
        "disk": "RESOURCE",
        "full": "RESOURCE"
    }

    def parse(self, raw_line: str) -> LogEvent:
        match = self.LOG_PATTERN.match(raw_line)

        if not match:
            return LogEvent(
                timestamp="unknown",
                severity="UNKNOWN",
                source="unknown",
                message=raw_line,
                raw=raw_line
            )

        message = match.group("message")
        severity = self._infer_severity(message)

        return LogEvent(
            timestamp=match.group("time"),
            severity=severity,
            source=match.group("source"),
            message=message,
            raw=raw_line
        )

    def _infer_severity(self, message: str) -> str:
        lower_msg = message.lower()

        for keyword, level in self.SEVERITY_MAP.items():
            if keyword in lower_msg:
                return level

        return "INFO"
