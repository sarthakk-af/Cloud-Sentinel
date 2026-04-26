import { useState, useRef, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import axios from 'axios';
import { API, LIVE_SCENARIOS } from '../utils/constants';

/**
 * Custom hook encapsulating all SSE live-stream logic.
 * Returns everything the LiveStreamTab and ResultsPanel need.
 */
export function useStreamConnection() {
  const [isStreaming, setIsStreaming]           = useState(false);
  const [terminalLogs, setTerminalLogs]         = useState([]);
  const [streamResults, setStreamResults]       = useState(null);
  const [injectingScenario, setInjectingScenario] = useState(null);

  const eventSourceRef = useRef(null);
  const sessionIdRef   = useRef(null);

  /* ── Start SSE ──────────────────────────────────────────────── */
  const startStream = useCallback(() => {
    setStreamResults(null);
    setTerminalLogs([
      `[SYSTEM] Targeting API: ${API}`,
      '[SYSTEM] Starting in-process chaos log generator...',
      '[SYSTEM] Stream engine initializing — waiting for first batch...',
    ]);
    setIsStreaming(true);
    sessionIdRef.current = null;

    const es = new EventSource(`${API}/api/stream`);
    eventSourceRef.current = es;

    es.onopen = () =>
      setTerminalLogs(p => [...p, '[SUCCESS] SSE Connection established. Chaos engine is live.']);

    es.onmessage = (ev) => {
      try {
        const d = JSON.parse(ev.data);

        if (d.type === 'session') {
          sessionIdRef.current = d.session_id;
          setTerminalLogs(p => [
            ...p,
            `[SYSTEM] Session ID: ${d.session_id.slice(0, 8)}… — chaos generator running.`,
          ]);
          return;
        }

        if (d.type === 'analysis' && d.status === 'live') {
          if (d.raw_lines?.length) {
            setTerminalLogs(p => [
              ...p,
              ...d.raw_lines.map(l => `[TRAFFIC] ${l.length > 100 ? l.slice(0, 100) + '…' : l}`),
            ]);
          }
          setTerminalLogs(p => [
            ...p,
            `[SUCCESS] AI Analysis: +${d.new_logs_chunk} logs → ${d.unique_templates} templates (${d.processing_time_ms}ms)`,
          ]);
          setStreamResults(d);
        }

        if (d.type === 'error') {
          setTerminalLogs(p => [...p, `[ERROR] Engine error: ${d.error}`]);
        }
      } catch { /* heartbeat comment lines — safe to ignore */ }
    };

    es.onerror = () => {
      setTerminalLogs(p => [
        ...p,
        `[ERROR] Connection lost at ${API}/api/stream`,
        '[TIP] Check that uvicorn is running and the API is reachable.',
      ]);
      notifications.show({
        title: 'Stream Disconnected',
        message: 'Live stream connection lost. Check that the backend is running.',
        color: 'red',
        autoClose: 5000,
      });
      stopStream();
    };
  }, []);

  /* ── Stop SSE ───────────────────────────────────────────────── */
  const stopStream = useCallback(() => {
    setIsStreaming(false);
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    sessionIdRef.current   = null;
    setInjectingScenario(null);
  }, []);

  /* ── Inject incident ────────────────────────────────────────── */
  const handleInject = useCallback(async (scenario) => {
    if (!sessionIdRef.current) {
      setTerminalLogs(p => [...p, '[ERROR] No active session. Connect first.']);
      return;
    }
    const s = LIVE_SCENARIOS.find(x => x.key === scenario);
    setInjectingScenario(scenario);
    setTerminalLogs(p => [
      ...p,
      `[SYSTEM] ⚡ Injecting incident: ${s?.name ?? scenario}...`,
      '[SYSTEM] Logs will appear gradually inside the chaos stream.',
    ]);
    try {
      await axios.post(`${API}/api/stream/inject/${scenario}?session_id=${sessionIdRef.current}`);
      setTerminalLogs(p => [
        ...p,
        `[SUCCESS] Incident '${s?.name}' injected — watch the AI summary update.`,
      ]);
      notifications.show({
        title: 'Incident Injected',
        message: `${s?.icon} ${s?.name} has been injected into the chaos stream.`,
        color: 'violet',
        autoClose: 4000,
      });
    } catch (err) {
      const msg = err?.response?.data?.error ?? 'Injection failed.';
      setTerminalLogs(p => [...p, `[ERROR] ${msg}`]);
    } finally {
      setTimeout(() => setInjectingScenario(null), 30000);
    }
  }, []);

  /* ── Cancel injection ──────────────────────────────────────── */
  const cancelInject = useCallback(async () => {
    if (!sessionIdRef.current) return;
    setInjectingScenario(null);
    setTerminalLogs(p => [...p, '[SYSTEM] Injection cancelled — returning to baseline logs.']);
    try {
      await axios.post(`${API}/api/stream/cancel-inject?session_id=${sessionIdRef.current}`);
    } catch { /**/ }
  }, []);

  return {
    isStreaming,
    terminalLogs,
    streamResults,
    injectingScenario,
    startStream,
    stopStream,
    handleInject,
    cancelInject,
    setStreamResults,
  };
}
