import { useState, useEffect } from 'react';
import { SimpleGrid } from '@mantine/core';

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (typeof value !== 'number') return;
    const target = value;
    const step = Math.max(1, Math.floor(target / 24));
    let cur = 0;
    const timer = setInterval(() => {
      cur = Math.min(cur + step, target);
      setDisplay(cur);
      if (cur >= target) clearInterval(timer);
    }, 28);
    return () => clearInterval(timer);
  }, [value]);
  return typeof value === 'number' ? display.toLocaleString() : (value ?? '—');
}

const STAT_CONFIG = [
  { key: 'logs',      label: 'Logs Ingested',    color: 'var(--cyan)' },
  { key: 'templates', label: 'Patterns Found',    color: 'var(--violet)' },
  { key: 'time',      label: 'Processing Time',   color: 'var(--green)' },
];

export default function StatsGrid({ results }) {
  const rawLabel = results.total_logs != null
    ? results.total_logs
    : results.new_logs_chunk != null
      ? `+${results.new_logs_chunk}`
      : '—';

  const values = {
    logs: typeof rawLabel === 'number' ? rawLabel : undefined,
    templates: results.unique_templates ?? results.total_unique_templates,
    time: results.processing_time_ms,
  };

  const suffixes = { logs: '', templates: '', time: 'ms' };

  return (
    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm" mb="sm">
      {STAT_CONFIG.map(stat => (
        <div key={stat.key} className="card" style={{ padding: '18px 20px' }}>
          <div className="card-label" style={{ marginBottom: 8 }}>
            {stat.label}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span
              className="stat-value"
              style={{ color: stat.color }}
            >
              <AnimatedNumber value={values[stat.key]} />
            </span>
            {suffixes[stat.key] && (
              <span className="stat-suffix">{suffixes[stat.key]}</span>
            )}
          </div>
        </div>
      ))}
    </SimpleGrid>
  );
}
