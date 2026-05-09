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
            # Scale down base score so it provides nuance, but doesn't override the tiers
            base_score = float(doc_scores[idx]) * 0.3
            
            # Tiered Keyword Boosters
            # 1. Emergency (Red/Critical): System is dying or breached
            emergencies = ['panic', 'kill', 'oom', 'denied', 'brute', 'failed password']
            # 2. Alerts (Amber/Warning): Hardware/Resource failures
            alerts = ['timeout', 'deadlock', 'full', 'fatal']
            # 3. Performance (Violet/Degraded): Application/Web errors
            perf = ['error', 'fail', 'failed', '500', '502', '503', 'storm', 'ssl', 'expired', 'spike', 'refused']

            template_lower = str(t.get("template", "")).lower()
            tier_score = 0.0
            
            # Use max() instead of += to prevent multiple minor keywords from triggering a Critical state
            for kw in perf:
                if kw in template_lower: tier_score = max(tier_score, 0.4)
            for kw in alerts:
                if kw in template_lower: tier_score = max(tier_score, 0.8)
            for kw in emergencies:
                if kw in template_lower: tier_score = max(tier_score, 1.5)
            
            t["importance_score"] = base_score + tier_score
            
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
