import { ExternalLink, Shield, Heart, Code2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-left">
        <div className="footer-brand">
          <Shield size={14} />
          <span>Cloud Sentinel v2.0</span>
        </div>
        <span className="footer-dot">·</span>
        <span className="footer-text">AI Log Interpreter</span>
        <span className="footer-dot">·</span>
        <span className="footer-text footer-built">
          Built with <Heart size={10} className="footer-heart" /> using Drain3 + TF-IDF + T5
        </span>
      </div>
      <div className="footer-right">
        <span className="footer-status">
          <span className="status-dot status-dot-green" />
          System Operational
        </span>
        <span className="footer-dot">·</span>
        <a
          href="https://github.com/sarthakk-af/Cloud-Sentinel"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
        >
          <Code2 size={13} />
          GitHub
          <ExternalLink size={10} />
        </a>
      </div>
    </footer>
  );
}
