# engine/history.py

import sqlite3
from datetime import datetime


class HistoryStore:
    """
    Persistent storage for all Sentinel events
    """

    def __init__(self, db_path="sentinel.db"):
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.create_tables()

    def create_tables(self):
        cursor = self.conn.cursor()

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            severity TEXT,
            message TEXT,
            pattern TEXT,
            confidence REAL,
            decision TEXT,
            action TEXT
        )
        """)

        self.conn.commit()

    def record(self, event, classification, decision, action):
        cursor = self.conn.cursor()

        cursor.execute("""
        INSERT INTO events (timestamp, severity, message, pattern, confidence, decision, action)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            event.severity,
            event.message,
            classification["pattern"],
            classification["confidence"],
            decision,
            action
        ))

        self.conn.commit()
