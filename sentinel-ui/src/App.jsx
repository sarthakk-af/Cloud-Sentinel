import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";
import MetricCard from "./components/MetricCard";

import EventTable from "./components/EventTable";
import IncidentChart from "./components/IncidentChart";
import ControlPanel from "./components/ControlPanel";
import DashboardLayout from "./layout/DashboardLayout";
import StatusBar from "./components/StatusBar";

function App() {

  const [stats, setStats] = useState(null);
  const [control, setControl] = useState(true);

  // fetch stats every 5 sec
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  // fetch auto-heal state
  useEffect(() => {
    fetch("http://127.0.0.1:8000/control")
      .then((res) => res.json())
      .then((data) => setControl(data.auto_heal))
      .catch(() => setControl(true));
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get(
        `http://127.0.0.1:8000/stats?ts=${Date.now()}`
      );
      setStats(res.data);
    } catch (err) {
      console.error("Backend not reachable");
    }
  };

  return (
    <DashboardLayout>

      {/* NEW STATUS BAR */}
      <StatusBar stats={stats} control={control} />

      {!stats ? (
        <p>Connecting to Sentinel...</p>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
            }}
          >
            <MetricCard title="Total Events" value={stats.total_events} accent="#60a5fa" />
            <MetricCard title="Automation Rate" value={`${stats.auto_fix_rate}%`} accent="#22c55e" />
            <MetricCard title="Auto Repairs" value={stats.auto_fixed} accent="#38bdf8" />
            <MetricCard title="Noise Filtered" value={stats.ignored} accent="#f59e0b" />
          </div>

          <IncidentChart />

          <div style={{ gridColumn: "1 / span 2" }}>
            <EventTable />
          </div>

          <div style={{ gridColumn: "1 / span 2" }}>
            <ControlPanel />
          </div>
        </>
      )}

    </DashboardLayout>
  );
}

export default App;
