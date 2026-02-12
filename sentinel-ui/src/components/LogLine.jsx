import "./logline.css";

const decisionColor = {
  AUTO_FIX: "#22c55e",
  MONITOR: "#f59e0b",
  IGNORE: "#64748b",
  ESCALATE: "#ef4444"
};

const severityColor = {
  "failed password": "#ef4444",   // security threat
  "service crash": "#fb7185",     // critical
  "out of memory": "#f59e0b",     // warning
  "disk full": "#f97316",         // urgent soon
};

function LogLine({ event }) {
  if (!event) return null;

  const time = event.time ? event.time.substring(11, 19) : "--:--:--";
  const pattern = event.pattern || "unknown";
  const decision = event.decision || "UNKNOWN";
  const action = event.action || "-";

  const decisionCol = decisionColor[decision] || "#38bdf8";
  const severityCol = severityColor[pattern] || "#38bdf8";

  return (
    <div className="logline">
      <span className="time">[{time}]</span>
      <span className="pattern" style={{ color: severityCol }}>
        {pattern.toUpperCase()}
      </span>
      <span className="arrow">→</span>
      <span className="decision" style={{ color: decisionCol }}>
        {decision}
      </span>
      <span className="action">{action}</span>
    </div>
  );
}

export default LogLine;
