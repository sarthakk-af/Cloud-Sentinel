# engine/summarizer.py
from transformers import pipeline
import re

class LogSummarizer:
    """
    Phase C: The Human Brain.
    Takes high-priority log templates (and their original variables) 
    and translates them into a single human-readable DevOps sentence.
    We use a small lightweight T5 model.
    """
    
    def __init__(self, use_ai=True, model_name="t5-small"):
        print(f"Summarizer initialized (Lazy Loading Enabled). model={model_name}")
        self.use_ai = use_ai
        self.model_name = model_name
        self.summarizer = None
        
    def _load_model(self):
        """Loads the T5 model on demand to save memory/time during startup."""
        if self.summarizer is not None:
            return
            
        print(f"Loading {self.model_name} model for Log Summarization...")
        try:
            self.summarizer = pipeline("summarization", model=self.model_name, framework="pt")
            print(f"Model '{self.model_name}' loaded successfully.")
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Failed to load AI model: {e}. Falling back to standard string generation.")
            self.use_ai = False

    def _clean_log_for_ai(self, text: str) -> str:
        """
        Removes 'noise' like timestamps, long IPs, and IDs that confuse small AI models.
        Example: 'Oct 10 12:02:00 server1 Failed password for root...' -> 'Failed password for root'
        Falls back to original text (truncated) if cleaning strips everything.
        """
        original = text.strip()

        # Remove common timestamp patterns (Oct 10 12:02:00 or 2024-03-10...)
        text = re.sub(r'^[A-Z][a-z]{2}\s+\d+\s+\d+:\d+:\d+', '', text)
        text = re.sub(r'^\d{4}-\d{2}-\d{2}[\sT]\d+:\d+:\d+[\.\d]*\s*(UTC|Z)?', '', text)

        # Remove bracket-wrapped tags like [db_cluster_01]
        text = re.sub(r'\[[^\]]{1,30}\]', '', text)

        # Remove IP addresses
        text = re.sub(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', '<IP>', text)

        # Remove long hex strings or IDs
        text = re.sub(r'[a-f0-9]{8,}', '<ID>', text)

        # Remove excessive whitespace
        text = re.sub(r'\s{2,}', ' ', text).strip()

        # If nothing meaningful remains, use original (truncated to 120 chars)
        if len(text) < 10:
            return original[:120]

        return text

    def _get_heuristic_summary(self, log: str) -> str:
        """
        Rule-based fallback that covers the most common DevOps/cloud log patterns.
        Returns a plain-English summary, or empty string if no rule matches.
        """
        log_lower = log.lower()

        # Security
        if "failed password" in log_lower or "authentication failure" in log_lower:
            return "Security Alert: Multiple unauthorized SSH login attempts detected — possible brute-force attack."
        if "invalid user" in log_lower:
            return "Security Alert: Login attempts with invalid usernames detected."
        if "permission denied" in log_lower:
            return "Security: Permission denied errors indicate unauthorized access attempts."
        if "sudo" in log_lower and ("fail" in log_lower or "incorrect" in log_lower):
            return "Security: Failed sudo privilege escalation attempts detected."

        # Memory / OOM
        if "out of memory" in log_lower or "oom" in log_lower:
            return "Critical: System is out of memory and forcibly killing processes — immediate action required."
        if "killed process" in log_lower or "kill process" in log_lower:
            return "Critical: Kernel OOM killer has terminated processes due to memory exhaustion."
        if "memory" in log_lower and "error" in log_lower:
            return "Warning: Memory-related errors detected in system logs."

        # Database
        if "slow query" in log_lower:
            return "Database: Slow query detected — performance bottleneck may be affecting response times."
        if "deadlock" in log_lower:
            return "Database: Transaction deadlock detected, indicating resource contention between concurrent processes."
        if "connection refused" in log_lower and "db" in log_lower:
            return "Database: Connection refused — the database server may be down or unreachable."
        if "replication" in log_lower and "error" in log_lower:
            return "Database: Replication error detected — data consistency between nodes may be at risk."

        # Web/HTTP
        if "500" in log_lower and ("http" in log_lower or "error" in log_lower):
            return "Web Server: Internal server errors (HTTP 500) detected in traffic logs."
        if "404" in log_lower:
            return "Web Server: Resource not found errors (HTTP 404) detected."
        if "502" in log_lower or "503" in log_lower:
            return "Web Server: Gateway or service unavailable errors — upstream service may be down."

        # Storage
        if ("partition" in log_lower or "disk" in log_lower) and ("full" in log_lower or "no space" in log_lower):
            return "Storage: Disk partition is full — write operations will fail until space is freed."
        if "i/o error" in log_lower or "disk error" in log_lower:
            return "Storage: Disk I/O errors detected — hardware failure may be imminent."
        if "quota" in log_lower and "exceeded" in log_lower:
            return "Storage: Disk quota exceeded — the filesystem has no remaining space for this user or volume."

        # Kernel / system panics (BEFORE generic timeout)
        if "kernel panic" in log_lower:
            return "Critical: Kernel panic detected — the system has encountered an unrecoverable error."
        if "null pointer" in log_lower or "segfault" in log_lower or "segmentation fault" in log_lower:
            return "Critical: Segmentation fault or null pointer dereference — a process crashed due to invalid memory access."
        if "bug:" in log_lower and "unable to handle" in log_lower:
            return "Critical: Kernel BUG detected — unhandled exception may have caused system instability."

        # CPU / Performance (BEFORE generic timeout)
        if "throttled" in log_lower or "temperature above threshold" in log_lower:
            return "Performance: CPU thermal throttling detected — core temperatures are critically high."
        if "watchdog" in log_lower and "timeout" in log_lower:
            return "Critical: Watchdog timeout — a service has become unresponsive and may need restart."
        if "cpu" in log_lower and ("overload" in log_lower or "100%" in log_lower or "spike" in log_lower or "usage at" in log_lower):
            return "Performance: CPU utilization is critically high — system may be under severe load."
        if "load average" in log_lower:
            return "Performance: High system load average detected — resource contention across processes."

        # Network (generic timeout LAST so specific patterns above take priority)
        if "connection reset" in log_lower:
            return "Network: Connection reset by peer — clients are unexpectedly dropping connections."
        if "ssl" in log_lower and ("error" in log_lower or "expired" in log_lower or "failed" in log_lower):
            return "Security: SSL/TLS errors detected — certificate or encryption issues present."
        if "firewall" in log_lower or "iptables" in log_lower:
            return "Network: Firewall rule triggered — traffic is being blocked."
        if "timeout" in log_lower:
            return "Network: Request timeout errors detected — downstream services may be slow or unreachable."

        return ""

    def _is_hallucination(self, text: str, prompt: str = "") -> bool:
        """
        Detects if the AI output is garbage, off-topic, or echoes the input prompt.
        """
        blacklist = [
            "cnn.com", "facebook.com", "youtube", "news", "website", "citation",
            "sentence", "wikipedia", "encyclopedia", "english", "language"
        ]
        text_lower = text.lower()
        
        for word in blacklist:
            if word in text_lower:
                return True
        
        # Generic/vague T5 output patterns
        if "translated" in text_lower and "sentence" in text_lower:
            return True

        # Detect prompt echo: T5 sometimes outputs the input back
        # e.g. "explain technical log: a technical log"
        if prompt:
            # If the output is a substring of the prompt or very similar
            prompt_lower = prompt.lower()[:80]
            if text_lower[:60] in prompt_lower or prompt_lower[:40] in text_lower:
                return True

        # Too short to be meaningful
        if len(text.strip()) < 15:
            return True
        
        # Starts with 'explain' or 'translate' — T5 echoing its task prefix
        if text_lower.startswith(("explain", "translate", "summarize", "technical log")):
            return True
            
        return False

    def summarize(self, ranked_templates: list) -> str:
        """
        Takes the top ranked templates from Phase B and summarizes them.
        """
        if not ranked_templates:
            return "No critical logs detected. System appears stable."

        # Grab the top highest priority log
        top_cluster = ranked_templates[0]
        raw_log = top_cluster['original_log']
        
        # Check for heuristic match first (Highest Reliability)
        heuristic = self._get_heuristic_summary(raw_log)
        
        # If it's a very clear match, we might skip AI to be 100% accurate
        if heuristic:
            return heuristic

        if not self.use_ai:
            return f"Anomaly detected: {raw_log}"

        # Logic for AI Summarization
        self._load_model()
        
        if self.summarizer:
            cleaned_log = self._clean_log_for_ai(raw_log)
            
            # T5-small handles 'explain: ' sometimes better for technical tasks
            prompt = f"explain technical log: {cleaned_log}"
            
            try:
                result = self.summarizer(prompt, max_length=50, min_length=15, do_sample=False)
                ai_text = result[0]['summary_text']
                
                # Apply Hallucination Guard (pass prompt to detect echo)
                if self._is_hallucination(ai_text, prompt):
                    # Last resort: use the cleaned log text as a descriptive alert
                    return f"System Alert: Anomalous event detected — {cleaned_log}."
                    
                final_text = ai_text.replace(" .", ".").capitalize()
                if not final_text.endswith("."):
                    final_text += "."
                return final_text
            except Exception as e:
                return f"System Alert: {cleaned_log}."
            
        return f"View raw anomaly: {raw_log}"


if __name__ == "__main__":
    summarizer = LogSummarizer(use_ai=True)
    
    # We simulate passing the #1 ranked Event Cluster from our TF-IDF Analyzer
    mock_ranked_templates = [
        {
            "template": "Failed password for <*> from <*> port 22 ssh2",
            "original_log": "Failed password for root from 192.168.1.1 port 22 ssh2",
            "importance_score": 1.098
        },
        {
            "template": "<*> <*> <*> <*> kernel: Out of memory: Kill process <*> (<*>)",
            "original_log": "Oct 10 12:02:00 server2 kernel: Out of memory: Kill process 5678 (java)",
            "importance_score": 0.706
        }
    ]
    
    print("\n--- Generating Human Summary ---")
    summary = summarizer.summarize(mock_ranked_templates)
    print(f"Final AI Summary: {summary}")
