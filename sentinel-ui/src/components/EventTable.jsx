import { useEffect, useState, useRef } from "react";
import axios from "axios";
import LogLine from "./LogLine";

function EventTable() {
  const [events, setEvents] = useState([]);
  const bottomRef = useRef(null);
  const [pulse, setPulse] = useState(false);

  const fetchEvents = async () => {
    try {
      const res = await axios.get(
        `http://127.0.0.1:8000/events?ts=${Date.now()}`,
      );
      setEvents(res.data);
      setPulse(true);
      setTimeout(() => setPulse(false), 200);
    } catch {
      console.log("Failed to load events");
    }
  };

  // auto scroll when new logs arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  // polling
  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ marginTop: "40px" }}>
      <h2 className="stream-title">
        Live Event Stream
        <span className={pulse ? "pulse active" : "pulse"}></span>
      </h2>

      <div className="console">
        {events && events.length > 0 ? (
          <>
            {events.map((e, i) => (
              <LogLine key={i} event={e} />
            ))}
            <div ref={bottomRef} />
          </>
        ) : (
          <p style={{ color: "#64748b" }}>Waiting for events...</p>
        )}
      </div>
    </div>
  );
}

export default EventTable;
