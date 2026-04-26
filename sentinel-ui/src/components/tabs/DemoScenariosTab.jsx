import { SimpleGrid, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import axios from 'axios';
import * as Icons from 'lucide-react';
import { SCENARIOS, API } from '../../utils/constants';

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
        <span style={{
          padding: '3px 10px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 600,
          color: 'var(--cyan)', background: 'var(--cyan-dim)', border: '1px solid var(--border-active)',
          fontFamily: 'var(--font-mono)',
        }}>
          {SCENARIOS.length} loaded
        </span>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
        Select a scenario to run the AI analysis pipeline.
      </p>

      <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing="sm">
        {SCENARIOS.map((s, i) => {
          const isActive = activeScenario === s.key;
          const Icon = Icons[s.icon] || Icons.AlertTriangle;
          return (
            <div
              key={s.key}
              id={`demo-${s.key}`}
              className={`scenario-card${isActive ? ' active' : ''}`}
              onClick={() => handleDemo(s.key)}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="scenario-card-icon"><Icon size={28} /></div>
              <div className="scenario-card-name">{s.name}</div>
              <div className="scenario-card-desc">{s.desc}</div>
            </div>
          );
        })}
      </SimpleGrid>

      {analyzing && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <Loader color="var(--cyan)" size="sm" type="dots" />
        </div>
      )}
    </div>
  );
}
