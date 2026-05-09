import { useState } from 'react';
import { X, Info, Zap, Search, MessageSquare, ExternalLink } from 'lucide-react';

const TECH_DATA = [
  {
    id: 'drain3',
    name: 'Drain3',
    tagline: 'Log Clustering & Parsing',
    icon: Zap,
    color: 'var(--cyan)',
    what: 'A lightning-fast streaming algorithm that reads millions of raw log lines and groups them into logical templates.',
    how: 'It uses a fixed-depth tree structure to cluster similar messages. For example, it identifies that "Login failed for root" and "Login failed for admin" are actually the same event type.',
    where: 'Used as the "Frontline" of the pipeline to reduce massive, noisy datasets into a manageable set of patterns.',
    example: 'Raw: "User sarthak logged in at 10:00" → Template: "User <*> logged in at <*>"',
    apps: 'AIOps, Large-scale system monitoring, Real-time log analytics.'
  },
  {
    id: 'tfidf',
    name: 'TF-IDF',
    tagline: 'Statistical Rarity Scoring',
    icon: Search,
    color: 'var(--amber)',
    what: 'A statistical measure (Term Frequency - Inverse Document Frequency) used to evaluate how important a log pattern is.',
    how: 'It calculates a "rarity score." If a log pattern appears everywhere, it is ignored as noise. If it appears only once in a million lines, it is flagged as a potential threat.',
    where: 'The "Brain" of the anomaly detector. It separates the "normal" background noise from the "suspicious" needles in the haystack.',
    example: 'If "System_Check" happens 5000 times, its score is low. If "Unauthorized_Root_Access" happens once, its score is high.',
    apps: 'Search engines, Spam filters, Cyber threat hunting.'
  },
  {
    id: 't5',
    name: 'T5 Transformer',
    tagline: 'AI-Powered Interpretation',
    icon: MessageSquare,
    color: 'var(--violet)',
    what: "Google's Text-to-Text Transfer Transformer—a state-of-the-art neural network trained for language tasks.",
    how: 'It "reads" the abstract log patterns and translates them into plain English sentences, much like how a human detective explains a crime scene.',
    where: 'The "Voice" of the Sentinel. It turns technical anomalies into actionable threat intelligence that anyone can understand.',
    example: 'Input: "ERR_403_XSS_DETECTED" → Output: "A malicious Cross-Site Scripting attack was blocked on your login page."',
    apps: 'Language translation, Document summarization, Conversational AI.'
  }
];

export default function TechDecoderModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('drain3');
  const activeTech = TECH_DATA.find(t => t.id === activeTab);

  if (!isOpen) return null;

  return (
    <div className="tech-modal-overlay" onClick={onClose}>
      <div className="tech-modal" onClick={e => e.stopPropagation()}>
        <button className="tech-modal-close" onClick={onClose}>
          <X size={20} />
        </button>
        
        <div className="tech-modal-sidebar">
          <div className="tech-modal-label">Pipeline Tech</div>
          {TECH_DATA.map(t => (
            <button 
              key={t.id}
              className={`tech-tab-btn ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
              style={{ '--accent': t.color }}
            >
              <t.icon size={16} />
              <span>{t.name}</span>
            </button>
          ))}
        </div>

        <div className="tech-modal-content">
          <div className="tech-content-header">
            <div className="tech-content-icon" style={{ color: activeTech.color }}>
              <activeTech.icon size={32} />
            </div>
            <div>
              <h2 className="tech-content-name">{activeTech.name}</h2>
              <div className="tech-content-tagline">{activeTech.tagline}</div>
            </div>
          </div>

          <div className="tech-details-grid">
            <div className="tech-detail-item">
              <label>What is it?</label>
              <p>{activeTech.what}</p>
            </div>
            <div className="tech-detail-item">
              <label>How it works?</label>
              <p>{activeTech.how}</p>
            </div>
            <div className="tech-detail-item">
              <label>Where is it used?</label>
              <p>{activeTech.where}</p>
            </div>
            <div className="tech-detail-item">
              <label>Example</label>
              <code className="tech-code-block">{activeTech.example}</code>
            </div>
            <div className="tech-detail-item full">
              <label>Real-world Applications</label>
              <p>{activeTech.apps}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TechHubWidget({ onOpen }) {
  return (
    <div className="tech-hub-widget" onClick={onOpen}>
      <div className="tech-hub-header">
        <Info size={16} className="tech-hub-icon" />
        <span>Technology Decoder</span>
      </div>
      <p className="tech-hub-desc">
        Click to learn about the AI & Algorithms powering this pipeline.
      </p>
      <div className="tech-hub-action">
        <span>Explore Architecture</span>
        <ExternalLink size={12} />
      </div>
    </div>
  );
}
