import { useState } from 'react';
import { Info } from 'lucide-react';

export default function KpiCard({ label, value, delta, deltaLabel, formula }) {
  const [showTip, setShowTip] = useState(false);
  const deltaClass = delta === undefined || delta === null ? '' : delta >= 0 ? 'up' : 'down';
  return (
    <div className="kpi-card">
      {showTip && formula && <div className="kpi-tooltip">{formula}</div>}
      <div className="kpi-label">
        {label}
        {formula && (
          <button
            type="button"
            className="kpi-info-btn"
            aria-label={`Cómo se calcula ${label}`}
            style={{ background: 'none', border: 'none', padding: 0, display: 'inline-flex', cursor: 'help', opacity: 0.6 }}
            onMouseEnter={() => setShowTip(true)}
            onMouseLeave={() => setShowTip(false)}
            onFocus={() => setShowTip(true)}
            onBlur={() => setShowTip(false)}
          >
            <Info size={12} />
          </button>
        )}
      </div>
      <div className="kpi-value">{value}</div>
      {deltaLabel && <div className={`kpi-delta ${deltaClass}`}>{deltaLabel}</div>}
    </div>
  );
}
