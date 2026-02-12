import { useEffect, useState } from "react";
import axios from "axios";

function ControlPanel() {
  const [enabled, setEnabled] = useState(true);

  const fetchState = async () => {
    const res = await axios.get("http://127.0.0.1:8000/control");
    setEnabled(res.data.auto_heal);
  };

  const toggle = async () => {
    const newState = enabled ? "off" : "on";
    const res = await axios.post(`http://127.0.0.1:8000/control/${newState}`);
    setEnabled(res.data.auto_heal);
  };

  useEffect(() => { fetchState(); }, []);

  return (
    <div style={{ marginTop: "40px" }}>
      <h2>AI Control Panel</h2>
      <button
        onClick={toggle}
        style={{
          padding: "10px 20px",
          background: enabled ? "#22c55e" : "#ef4444",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer"
        }}
      >
        {enabled ? "AUTO HEAL ENABLED" : "AUTO HEAL DISABLED"}
      </button>
    </div>
  );
}

export default ControlPanel;
