import "./status.css";

function Pill({ label, value, color }) {
  return (
    <div className="pill">
      <span className="dot" style={{ background: color }} />
      <span className="pill-label">{label}</span>
      <span className="pill-value">{value}</span>
    </div>
  );
}

function StatusBar({ stats, control }) {
  if (!stats) return null;

  const eps = (stats.total_events / 60).toFixed(2);

  return (
    <div className="statusbar">
      <Pill label="Sentinel" value="ACTIVE" color="#22c55e" />
      <Pill label="AI Mode" value="Learning" color="#38bdf8" />
      <Pill label="Events/sec" value={eps} color="#f59e0b" />
      <Pill label="Auto Heal" value={control ? "ON" : "OFF"} color={control ? "#22c55e" : "#ef4444"} />
    </div>
  );
}

export default StatusBar;
