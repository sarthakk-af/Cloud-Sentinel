import { useEffect, useState } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function IncidentChart() {
  const [data, setData] = useState([]);

  const fetchIncidents = async () => {
    try {
      const res = await axios.get(`http://127.0.0.1:8000/incidents?ts=${Date.now()}`);
      setData(res.data);
    } catch {
      console.log("Failed to load incidents");
    }
  };

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ marginTop: "50px" }}>
      <h2>Incident Frequency</h2>
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <XAxis dataKey="pattern" stroke="#fff" />
            <YAxis stroke="#fff" />
            <Tooltip />
            <Bar dataKey="count" fill="#38bdf8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default IncidentChart;
