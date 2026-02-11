import pandas as pd
import re
import os
from datetime import datetime
from sentence_transformers import SentenceTransformer, util

class SentinelBrain:
    def __init__(self, csv_path='knowledge_base.csv'):
        print("Initializing AI Brain...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.csv_path = csv_path
        self.load_knowledge_base()

    def load_knowledge_base(self):
        if not os.path.exists(self.csv_path):
            # Create a default one if it's missing
            data = {
                'error_pattern': ['out of memory', 'Failed password', 'exit-code', 'full'],
                'explanation': ['RAM exhaustion', 'Brute force attempt', 'Service crash', 'Disk capacity reached'],
                'action': ['python scripts/clear_ram.py', 'python scripts/block_ip.py', 'python scripts/restart_service.py', 'python scripts/cleanup.py']
            }
            pd.DataFrame(data).to_csv(self.csv_path, index=False)
        
        self.kb = pd.read_csv(self.csv_path)
        self.kb_embeddings = self.model.encode(self.kb['error_pattern'].tolist(), convert_to_tensor=True)

    def clean_log(self, log_line):
        # Remove timestamps and server names using split
        if "server1" in log_line:
            return log_line.split("server1")[-1].strip()
        return log_line

    def process_log(self, log_line):
        cleaned = self.clean_log(log_line)
        log_embedding = self.model.encode(cleaned, convert_to_tensor=True)
        
        # Calculate Similarity
        scores = util.cos_sim(log_embedding, self.kb_embeddings)
        best_idx = scores.argmax().item()
        confidence = scores[0][best_idx].item()

        if confidence > 0.45:
            explanation = self.kb.iloc[best_idx]['explanation']
            action = self.kb.iloc[best_idx]['action']
            self.log_action(log_line, explanation, action, confidence)
            self.execute_fix(action)
        else:
            print(f"[UNKNOWN]: {cleaned} (Confidence: {confidence:.2f})")

    def log_action(self, original, reason, action, conf):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] | CONF: {conf:.2f} | ERROR: {original} | FIX: {action}\n"
        with open("sentinel_history.log", "a") as f:
            f.write(log_entry)
        print(f"\n✅ MATCH FOUND: {reason}")

    def execute_fix(self, command):
        print(f"🚀 AUTO-REMEDIATION: Executing '{command}'...")
        os.system(command) # Uncomment this when your scripts are ready!