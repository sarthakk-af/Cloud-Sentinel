import pytest
from engine.parser import LogParser
import os

def test_log_parser_init():
    parser = LogParser(persistence_path="test_state.bin")
    assert parser.processed_count == 0
    if os.path.exists("test_state.bin"):
        os.remove("test_state.bin")

def test_parse_log():
    parser = LogParser(persistence_path="test_state.bin")
    log = "Oct 10 12:01:00 server1 kernel: Out of memory: Kill process 1234 (python)"
    result = parser.parse_log(log)
    
    assert "template" in result
    assert "original_log" in result
    assert result["original_log"] == log.strip()
    assert parser.processed_count == 1
    
    if os.path.exists("test_state.bin"):
        os.remove("test_state.bin")

def test_get_all_templates():
    parser = LogParser(persistence_path="test_state.bin")
    parser.parse_log("Log line 1")
    parser.parse_log("Log line 2")
    templates = parser.get_all_templates()
    assert len(templates) > 0
    
    if os.path.exists("test_state.bin"):
        os.remove("test_state.bin")
