import pandas as pd
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import re


RULE_PATTERNS = {
    "out of memory": r"\b(out of memory|oom-killer|kill process)\b",
    "failed password": r"\b(failed password|authentication failure)\b",
    "service crash": r"\b(failed with result|exit-code|segmentation fault)\b",   
    "disk full": r"\b(no space left|disk full|100%)\b",

}


class LogClassifier:
    """
    Hybrid classifier:
    1) Rule-based detection (high precision)
    2) Embedding similarity fallback (generalization)
    """

    def __init__(self, knowledge_base_path="knowledge_base.csv"):
        print("Loading AI model...")
        self.model = SentenceTransformer("all-MiniLM-L6-v2")

        print("Loading knowledge base...")
        self.kb = pd.read_csv(knowledge_base_path)

        # normalize KB for safe lookup
        self.kb["error_pattern"] = self.kb["error_pattern"].str.lower()

        # Precompute embeddings once
        self.pattern_texts = self.kb["error_pattern"].tolist()
        self.pattern_embeddings = self.model.encode(self.pattern_texts)

    # ---------------- RULE MATCH ----------------
    def _rule_match(self, message):
        lower_msg = message.lower()

        for label, pattern in RULE_PATTERNS.items():
            if re.search(pattern, lower_msg):
                return {
                    "pattern": label,
                    "explanation": "Rule-based detection",
                    "action": self._lookup_action(label),
                    "confidence": 0.95
                }
        return None

    # ---------------- KB LOOKUP ----------------
    def _lookup_action(self, label):
        label = label.lower()
        row = self.kb[self.kb["error_pattern"] == label]

        if not row.empty:
            return row.iloc[0]["action"]

        return "none"

    # ---------------- MAIN CLASSIFY ----------------
    def classify(self, message: str):

        # 1) Try rule detection first
        rule_result = self._rule_match(message)
        if rule_result:
            return rule_result

        # 2) Fallback to semantic similarity
        log_embedding = self.model.encode([message])
        similarities = cosine_similarity(log_embedding, self.pattern_embeddings)[0]
        best_idx = similarities.argmax()

        return {
            "pattern": self.pattern_texts[best_idx],
            "explanation": self.kb.iloc[best_idx]["explanation"],
            "action": self.kb.iloc[best_idx]["action"],
            "confidence": float(similarities[best_idx])
        }
