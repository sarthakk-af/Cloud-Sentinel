import { SimpleGrid } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import axios from 'axios';
import * as Icons from 'lucide-react';
import { SCENARIOS, API } from '../../utils/constants';
import ScanningBeam from '../effects/ScanningBeam';

const SEVERITY_COLORS = {
  ssh_brute:    'var(--red)',
  java_oom:     'var(--red)',
  kernel_panic: 'var(--red)',
  disk_full:    'var(--amber)',
  db_deadlock:  'var(--amber)',
  cpu_spike:    'var(--amber)',
  http_flood:   'var(--violet)',
  ssl_cert:     'var(--violet)',
  mixed_noise:  'var(--cyan)',
};

const SEVERITY_LABELS = {
  ssh_brute: 'CRITICAL', java_oom: 'CRITICAL', kernel_panic: 'CRITICAL',
  disk_full: 'WARNING', db_deadlock: 'WARNING', cpu_spike: 'WARNING',
  http_flood: 'DEGRADED', ssl_cert: 'DEGRADED', mixed_noise: 'LOW',
};

export default function DemoScenariosTab({
  onResults, analyzing, setAnalyzing, activeScenario, setActiveScenario,
}) {
  const handleDemo = async (scenario) => {
    setAnalyzing(true);
    setActiveScenario(scenario);
    try {
      const r = await axios.get(`${API}/api/library/${scenario}`);
      onResults(r.data);
    } catch {
      notifications.show({ title: 'Scenario failed', message: `Failed to load scenario: ${scenario}`, color: 'red' });
      setActiveScenario(null);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="card" style={{ animation: 'fadeUp 0.4s ease forwards' }}>
      <div className="card-header" style={{ justifyContent: 'space-between' }}>
        <span className="card-title">Threat Scenario Library</span>
        <span className="library-count-badge">
          {SCENARIOS.length} patterns loaded
        </span>
      </div>

      <p className="library-subtitle">
        Select a scenario to run the full AI analysis pipeline against pre-crafted attack patterns.
      </p>

      <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing="sm">
        {SCENARIOS.map((s, i) => {
          const isActive = activeScenario === s.key;
          const Icon = Icons[s.icon] || Icons.AlertTriangle;
          const accentColor = SEVERITY_COLORS[s.key] || 'var(--cyan)';
          const sevLabel = SEVERITY_LABELS[s.key] || 'INFO';

          return (
            <div
              key={s.key}
              id={`demo-${s.key}`}
              className={`threat-card${isActive ? ' active' : ''}`}
              onClick={() => handleDemo(s.key)}
              style={{ animationDelay: `${i * 0.05}s`, '--accent': accentColor }}
            >
              {/* Severity indicator stripe */}
              <div className="threat-card-stripe" style={{ background: accentColor }} />

              {/* Icon */}
              <div className="threat-card-icon" style={{ color: accentColor, background: `${accentColor}12`, borderColor: `${accentColor}33` }}>
                <Icon size={22} />
              </div>

              {/* Content */}
              <div className="threat-card-name">{s.name}</div>
              <div className="threat-card-desc">{s.desc}</div>

              {/* Severity tag */}
              <div className="threat-card-tag" style={{ color: accentColor, borderColor: `${accentColor}33`, background: `${accentColor}08` }}>
                {sevLabel}
              </div>

              {/* Active glow overlay */}
              {isActive && <div className="threat-card-active-overlay" style={{ borderColor: accentColor }} />}
            </div>
          );
        })}
      </SimpleGrid>

      {analyzing && (
        <div style={{ marginTop: 16 }}>
          <ScanningBeam label="Running threat analysis…" />
        </div>
      )}
    </div>
  );
}
