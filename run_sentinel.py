from engine.watcher import LogWatcher
from engine.processor import LogProcessor
from engine.classifier import LogClassifier
from engine.decision import DecisionEngine
from engine.executor import Executor
import argparse
from datasets.replay_loader import DatasetReplayer
from engine.baseline import BaselineFilter
from engine.incidents import IncidentManager
from engine.predictor import FailurePredictor
from engine.history import HistoryStore
import requests




LOG_FILE = "mock_system.log"

processor = LogProcessor()
classifier = LogClassifier()
decision = DecisionEngine()
executor = Executor()
baseline = BaselineFilter()
incidents = IncidentManager()
predictor = FailurePredictor()
history = HistoryStore()






def handle_new_log(line):
    event = processor.parse(line)
    result = classifier.classify(event.message)

    # baseline suppression
    if baseline.evaluate(result, event):
        print(f"[BASELINE IGNORE] {event.message}")
        return

    prediction = predictor.evaluate(result)
    if prediction:
        print(f"[PREDICTION] {prediction}")

    # incident grouping
    incident_state, incident_msg = incidents.process(result, event)
    if incident_state == "SUPPRESSED":
        print(f"[INCIDENT] {incident_msg}")
        return
    elif incident_state == "NEW_INCIDENT":
        print(f"[INCIDENT] {incident_msg}")

    action, reason = decision.evaluate(result, event)

    print(f"\n[{event.severity}] {event.message}")
    print(f"Detected: {result['pattern']} ({result['confidence']:.2f})")
    print(f"Decision: {action} | Reason: {reason}")

    executed_action = None

    executed_action = None

    if action == "AUTO_FIX":
        executed_action = result["action"]
        try:
            control = requests.get("http://127.0.0.1:8000/control").json()
            if control["auto_heal"]:
                executor.execute(result, event)
            else:
                print("[CONTROL] Auto-heal disabled. Action skipped.")
                executed_action = None
        except:
            # fallback if API not reachable
            executor.execute(result, event)

    history.record(event, result, action, executed_action)



parser = argparse.ArgumentParser()
parser.add_argument("--replay", help="Replay a dataset log file")
parser.add_argument("--speed", default="fast", choices=["realtime", "fast", "turbo"])
args = parser.parse_args()

watcher = LogWatcher(LOG_FILE, handle_new_log)

if __name__ == "__main__":
    try:
        if args.replay:
            replayer = DatasetReplayer(args.replay, handle_new_log, args.speed)
            replayer.start()
        else:
            watcher.start()
    except KeyboardInterrupt:
        watcher.stop()
        print("\nSentinel shutting down gracefully...")
