# api/server.py

from fastapi import FastAPI
import sqlite3
from engine.analytics import AnalyticsEngine
from fastapi.middleware.cors import CORSMiddleware
AUTO_HEAL_ENABLED = True


app = FastAPI(title="Cloud Sentinel API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


DB_PATH = "sentinel.db"


def query_db(query):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    rows = cursor.execute(query).fetchall()
    conn.close()
    return rows


# ---------- EVENTS ----------
@app.get("/events")
def get_events(limit: int = 50):
    rows = query_db(f"""
        SELECT timestamp, severity, message, pattern, confidence, decision, action
        FROM events
        ORDER BY id DESC
        LIMIT {limit}
    """)

    return [
        {
            "timestamp": r[0],
            "severity": r[1],
            "message": r[2],
            "pattern": r[3],
            "confidence": r[4],
            "decision": r[5],
            "action": r[6]
        }
        for r in rows
    ]


# ---------- STATS ----------
@app.get("/stats")
def get_stats():
    analytics = AnalyticsEngine(DB_PATH)
    return analytics.summary()


# ---------- INCIDENTS ----------
@app.get("/incidents")
def get_incidents():
    rows = query_db("""
        SELECT pattern, COUNT(*) as count
        FROM events
        WHERE decision != 'IGNORE'
        GROUP BY pattern
        ORDER BY count DESC
        LIMIT 10
    """)

    return [{"pattern": r[0], "count": r[1]} for r in rows]


# ---------- HEALTH ----------
@app.get("/")
def root():
    return {"status": "Cloud Sentinel API running"}


# ---------- CONTROL ----------
@app.get("/control")
def get_control():
    return {"auto_heal": AUTO_HEAL_ENABLED}


@app.post("/control/{state}")
def set_control(state: str):
    global AUTO_HEAL_ENABLED
    AUTO_HEAL_ENABLED = state.lower() == "on"
    return {"auto_heal": AUTO_HEAL_ENABLED}
