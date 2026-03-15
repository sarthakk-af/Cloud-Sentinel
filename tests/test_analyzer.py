import pytest
from engine.analyzer import LogAnalyzer

def test_analyzer_init():
    analyzer = LogAnalyzer()
    assert len(analyzer.critical_keywords) > 0

def test_analyze_templates():
    analyzer = LogAnalyzer()
    templates = [
        {"id": 1, "template": "Normal heartbeat"},
        {"id": 2, "template": "Critical Out of memory error"}
    ]
    ranked = analyzer.analyze_templates(templates)
    
    assert len(ranked) == 2
    # The one with 'critical' and 'error' should be first
    assert "Critical" in ranked[0]["template"]
    assert ranked[0]["importance_score"] > ranked[1]["importance_score"]

def test_analyze_empty_templates():
    analyzer = LogAnalyzer()
    assert analyzer.analyze_templates([]) == []
