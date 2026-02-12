import "./metric.css";

function MetricCard({ title, value, accent }) {
  return (
    <div className="metric-card">
      <div className="metric-value" style={{ color: accent }}>
        {value}
      </div>
      <div className="metric-title">{title}</div>
    </div>
  );
}

export default MetricCard;
