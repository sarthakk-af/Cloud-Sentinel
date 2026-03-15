# engine/parser.py
from drain3 import TemplateMiner # type: ignore
from drain3.template_miner_config import TemplateMinerConfig # type: ignore
from drain3.file_persistence import FilePersistence # type: ignore

class LogParser:
    """
    Phase A: The Structural Brain.
    Uses the Drain3 algorithm to parse raw log strings into Static Templates.
    It replaces dynamic variables (like IPs, Usernames) with <*>.
    """
    
    def __init__(self, persistence_path="drain3_state.bin"):
        # Configure Drain3 config
        config = TemplateMinerConfig()
        config_path = self._get_config_path()
        if config_path:
            config.load(config_path)
        
        # We define a few standard maskers (Regexes) to identify common dynamic fields
        # By default, Drain3 handles numbers, hex, and general tokens well.
        config.profiling_enabled = False
        
        self.persistence = FilePersistence(persistence_path)
        self.template_miner = TemplateMiner(persistence_handler=self.persistence, config=config)
        self.processed_count = 0
        self.cluster_examples = {}

    def _get_config_path(self):
        """Returns absolute path to drain3.ini if it exists, else None."""
        import os
        config_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "..", "drain3.ini"
        )
        return os.path.normpath(config_path) if os.path.exists(config_path) else None

    def parse_log(self, log_line: str) -> dict:
        """
        Takes a raw log string and extracts the Template ID,
        the static template string, and the dynamic variables.
        Supports structured JSON logs and raw strings.
        """
        original_log = log_line.strip()
        clean_log_for_drain = original_log # This will be the string passed to Drain3

        try:
            # 1. Check for JSON structure first
            if original_log.startswith("{"):
                try:
                    import json
                    data = json.loads(original_log)
                    # Common JSON log keys (message, msg, log)
                    clean_log_for_drain = data.get("message", data.get("msg", data.get("log", str(data))))
                except json.JSONDecodeError:
                    # Fallback to raw string if JSON is malformed
                    pass
            
            # 2. Add the log line (potentially extracted from JSON) to the Drain3 knowledge tree
            result = self.template_miner.add_log_message(clean_log_for_drain)
        except Exception as e:
            print(f"Error parsing log line: {e}")
            return {
                "template_id": -1,
                "template": "PARSING_ERROR",
                "original_log": original_log
            }
            
        self.processed_count += 1
        
        cluster_id = result["cluster_id"]
        if cluster_id not in self.cluster_examples:
            self.cluster_examples[cluster_id] = clean_log_for_drain

        return {
            "template_id": cluster_id,
            "template": result["template_mined"],
            "original_log": clean_log_for_drain
        }
    
    def get_all_templates(self):
        """Returns a list of all unique templates discovered so far."""
        return [
            {
                "id": cluster.cluster_id, 
                "template": cluster.get_template(),
                "original_log": self.cluster_examples.get(cluster.cluster_id, "")
            }
            for cluster in self.template_miner.drain.clusters
        ]

if __name__ == "__main__":
    # A quick standalone test of the parser
    print("Initializing Structural Brain (Drain3)...")
    parser = LogParser()
    
    test_logs = [
        "Oct 10 12:01:00 server1 kernel: Out of memory: Kill process 1234 (python)",
        "Oct 10 12:02:00 server2 kernel: Out of memory: Kill process 5678 (java)",
        "Failed password for admin from 10.0.0.1 port 22 ssh2",
        "Failed password for root from 192.168.1.1 port 22 ssh2"
    ]
    
    print("\n--- Processing Raw Logs ---")
    for log in test_logs:
        result = parser.parse_log(log)
        print(f"Original: {result['original_log']}")
        print(f"Template: {result['template']}")
        print("-" * 50)
    
    print(f"\nTotal Logs Processed: {parser.processed_count}")
    print(f"Total Unique Templates Found: {len(parser.get_all_templates())}")
