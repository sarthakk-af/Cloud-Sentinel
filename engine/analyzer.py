# engine/analyzer.py
from sklearn.feature_extraction.text import TfidfVectorizer # type: ignore
import numpy as np # type: ignore

class LogAnalyzer:
    """
    Phase B: The Analytical Brain.
    Uses TF-IDF to find rare, important templates and filter out the noise.
    """
    
    def __init__(self):
        # Stop words filter out common english words (the, is, at, which, on)
        self.vectorizer = TfidfVectorizer(stop_words='english')
        
        # We also define some domain-specific keywords that we ALWAYS want to prioritize
        self.critical_keywords = ['error', 'fail', 'failed', 'critical', 'panic', 'denied', 'timeout', 'exception', 'kill', 'oom']
        
    def analyze_templates(self, templates: list) -> list:
        """
        Takes a list of dictionaries: [{"id": 1, "template": "Failed password..."}, ...]
        Returns the sorted list enriched with an 'importance_score' based on TF-IDF.
        """
        if not templates:
            return []
            
        # Extract just the template strings for the vectorizer
        corpus = [t["template"] for t in templates]
        
        # Fit and transform the corpus into a TF-IDF matrix
        try:
            tfidf_matrix = self.vectorizer.fit_transform(corpus)
        except Exception as e:
            # If the corpus is empty, only stopwords, or scikit-learn fails
            print(f"Warning: TF-IDF analysis failed: {e}")
            for t in templates:
                t["importance_score"] = 0.0
            return templates
            
        # Average TF-IDF score for each document (template)
        # This gives us a baseline rarity score
        doc_scores = np.mean(tfidf_matrix.toarray(), axis=1)
        
        # Now, we combine the TF-IDF rarity score with our domain heuristics
        feature_names = self.vectorizer.get_feature_names_out()
        
        for idx, t in enumerate(templates):
            base_score: float = float(doc_scores[idx])
            
            # Boost score if the template contains known critical keywords
            kw_boost = 0.0
            template_lower = str(t.get("template", "")).lower()
            for kw in self.critical_keywords:
                if kw in template_lower:
                    kw_boost = kw_boost + 0.5  # type: ignore
            
            t["importance_score"] = float(base_score) + float(kw_boost)
            
        # Sort templates by highest importance score first
        ranked_templates = sorted(templates, key=lambda x: x["importance_score"], reverse=True)
        return ranked_templates

if __name__ == "__main__":
    from engine.parser import LogParser # type: ignore
    
    print("Initializing Phase A & Phase B integration test...")
    
    # 1. Parse raw logs
    parser = LogParser()
    test_logs = [
        "Oct 10 12:01:00 server1 systemd: Started Session 1 of user normal_user.",
        "Oct 10 12:01:05 server1 systemd: Started Session 2 of user normal_user.",
        "Oct 10 12:01:10 server1 systemd: Started Session 3 of user normal_user.",
        "Oct 10 12:01:15 server1 systemd: Started Session 4 of user normal_user.",
        "Oct 10 12:02:00 server2 kernel: Out of memory: Kill process 5678 (java)",
        "Failed password for root from 192.168.1.1 port 22 ssh2",
        "Heartbeat OK from node 10.0.0.5"
    ]
    
    for log in test_logs:
        parser.parse_log(log)
        
    unique_templates = parser.get_all_templates()
    
    # 2. Analyze
    analyzer = LogAnalyzer()
    ranked = analyzer.analyze_templates(unique_templates)
    
    print("\n--- Ranked Templates ---")
    for t in ranked:
        print(f"Score: {t['importance_score']:.3f} | Template: {t['template']}")
