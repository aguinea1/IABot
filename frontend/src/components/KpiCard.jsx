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
          <Info
            size={12}
            style={{ cursor: 'help', opacity: 0.6 }}
            onMouseEnter={() => setShowTip(true)}
            onMouseLeave={() => setShowTip(false)}
          />
        )}
      </div>
      <div className="kpi-value">{value}</div>
      {deltaLabel && <div className={`kpi-delta ${deltaClass}`}>{deltaLabel}</div>}
    </div>
  );
}
