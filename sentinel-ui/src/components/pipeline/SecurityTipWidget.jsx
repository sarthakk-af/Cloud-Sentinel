import { useState, useEffect, useCallback } from 'react';
import { Lightbulb, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { SECURITY_TIPS } from '../../utils/constants';

/**
 * SecurityTipWidget — "Did You Know?" rotating security tips
 * Sits at the bottom of the pipeline sidebar.
 * Auto-rotates every 8s, with manual nav arrows.
 */
export default function SecurityTipWidget() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * SECURITY_TIPS.length));
  const [animDir, setAnimDir] = useState('next');
  const [animKey, setAnimKey] = useState(0);

  const goNext = useCallback(() => {
    setAnimDir('next');
    setIndex(p => (p + 1) % SECURITY_TIPS.length);
    setAnimKey(k => k + 1);
  }, []);

  const goPrev = useCallback(() => {
    setAnimDir('prev');
    setIndex(p => (p - 1 + SECURITY_TIPS.length) % SECURITY_TIPS.length);
    setAnimKey(k => k + 1);
  }, []);

  // Auto-rotate every 8 seconds
  useEffect(() => {
    const iv = setInterval(goNext, 8000);
    return () => clearInterval(iv);
  }, [goNext]);

  const tip = SECURITY_TIPS[index];

  return (
    <div className="security-tip-widget">
      <div className="security-tip-header">
        <div className="security-tip-icon-wrapper">
          <Lightbulb size={12} />
        </div>
        <span className="security-tip-label">Did You Know?</span>
        <Sparkles size={10} className="security-tip-sparkle" />
      </div>

      <div className="security-tip-body" key={animKey} data-dir={animDir}>
        <span className="security-tip-title">{tip.title}</span>
        <p className="security-tip-fact">{tip.fact}</p>
      </div>

      <div className="security-tip-footer">
        <div className="security-tip-dots">
          {SECURITY_TIPS.map((_, i) => (
            <div key={i} className={`security-tip-dot ${i === index ? 'active' : ''}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
