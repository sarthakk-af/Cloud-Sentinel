# engine/analytics.py

import sqlite3

class AnalyticsEngine:
    """
    Computes reliability metrics from history database
    """

    def __init__(self, db_path="sentinel.db"):
        self.conn = sqlite3.connect(db_path, check_same_thread=False)

    def summary(self):
        cursor = self.conn.cursor()

        total = cursor.execute("SELECT COUNT(*) FROM events").fetchone()[0]
        autofix = cursor.execute("SELECT COUNT(*) FROM events WHERE decision='AUTO_FIX'").fetchone()[0]
        ignored = cursor.execute("SELECT COUNT(*) FROM events WHERE decision='IGNORE'").fetchone()[0]

        top_issue = cursor.execute("""
            SELECT pattern, COUNT(*) as c
            FROM events
            GROUP BY pattern
            ORDER BY c DESC
            LIMIT 1
        """).fetchone()

        return {
            "total_events": total,
            "auto_fixed": autofix,
            "ignored": ignored,
            "top_issue": top_issue[0] if top_issue else None,
            "auto_fix_rate": round((autofix / total) * 100, 2) if total else 0
        }
