/**
 * ScanningBeam — A "laser scanner" loading indicator
 * Replaces generic spinners with a sweeping beam that reinforces
 * the surveillance / sentinel theme.
 *
 * Props:
 *   active  — boolean — beam animates when true
 *   color   — string  — beam accent color (defaults to --cyan)
 *   label   — string  — optional text below the beam
 */
export default function ScanningBeam({ active = true, color, label }) {
  if (!active) return null;

  const beamColor = color || 'var(--cyan)';

  return (
    <div className="scanning-beam-container" aria-label="Loading">
      <div className="scanning-beam-track">
        <div
          className="scanning-beam-line"
          style={{
            background: `linear-gradient(90deg, transparent, ${beamColor}, transparent)`,
            boxShadow: `0 0 20px ${beamColor}, 0 0 40px ${beamColor}44`,
          }}
        />
        {/* Secondary faint echo beam */}
        <div
          className="scanning-beam-echo"
          style={{
            background: `linear-gradient(90deg, transparent, ${beamColor}40, transparent)`,
          }}
        />
      </div>
      {label && (
        <div className="scanning-beam-label" style={{ color: beamColor }}>
          {label}
        </div>
      )}
    </div>
  );
}
