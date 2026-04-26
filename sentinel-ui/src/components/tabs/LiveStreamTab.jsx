import { useRef } from 'react';
import * as Icons from 'lucide-react';
import { LIVE_SCENARIOS } from '../../utils/constants';
import { getTerminalClass } from '../../utils/severity';

export default function LiveStreamTab({
  isStreaming, terminalLogs, injectingScenario,
  startStream, stopStream, handleInject, cancelInject,
}) {
  const terminalEndRef = useRef(null);

  return (
    <div className="card" style={{ animation: 'fadeUp 0.4s ease forwards' }}>
      <div className="card-header" style={{ justifyContent: 'space-between' }}>
        <span className="card-title">Live Signal Feed</span>
        {isStreaming && (
          <span className="nav-live-badge">
            <span className="status-dot status-dot-red" />
            Active
          </span>
        )}
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
        Connect to the chaos generator for real-time log analysis.
        {isStreaming && <span style={{ color: 'var(--text-bright)', fontWeight: 500 }}> Inject threats</span>}
        {isStreaming && ' to test detection.'}
      </p>

      {isStreaming && (
        <div style={{
          padding: 14, background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', marginBottom: 16,
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--cyan)', marginBottom: 8, fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icons.Zap size={14} /> Inject Threat Vector
            </span>
            {injectingScenario && (
              <button
                className="btn btn-sm btn-danger"
                onClick={cancelInject}
                style={{ padding: '4px 10px', fontSize: '0.62rem' }}
              >
                <Icons.X size={12} /> Cancel Injection
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {LIVE_SCENARIOS.map(s => {
              const active = injectingScenario === s.key;
              const Icon = Icons[s.icon] || Icons.AlertTriangle;
              return (
                <button key={s.key} id={`inject-${s.key}`} onClick={() => handleInject(s.key)}
                  className="btn btn-sm"
                  style={{
                    borderColor: active ? s.color : 'var(--border)', color: active ? s.color : 'var(--text-secondary)',
                    background: active ? `${s.color}15` : 'transparent',
                  }}
                >
                  <Icon size={13} /> {s.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="terminal-window" id="terminal-output">
        {terminalLogs.length === 0 && (
          <span style={{ color: 'var(--text-dim)' }}>
            Waiting for connection... Click "Connect" to start.
          </span>
        )}
        {terminalLogs.map((line, i) => (
          <p key={i} className={getTerminalClass(line)}>{line}</p>
        ))}
        <span className="blinking-cursor" />
        <div ref={terminalEndRef} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
        {!isStreaming ? (
          <button id="connect-stream-btn" className="btn btn-primary" onClick={startStream}>
            <Icons.Wifi size={15} /> Connect Stream
          </button>
        ) : (
          <button id="disconnect-stream-btn" className="btn btn-danger" onClick={stopStream}>
            <Icons.WifiOff size={15} /> Disconnect
          </button>
        )}
      </div>
    </div>
  );
}
