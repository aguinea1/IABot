import { AlertTriangle } from 'lucide-react';

export default function DuplicadosPanel({ duplicates, onMerge }) {
  if (!duplicates || duplicates.length === 0) return null;
  return (
    <div className="panel" style={{ borderColor: 'var(--warning)' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={16} color="var(--warning)" /> Posibles activos duplicados</h2>
      <p className="panel-sub">Se detectaron activos con el mismo nombre normalizado. Fusiónalos para que sus movimientos se acumulen en una sola serie.</p>
      {duplicates.map((group, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
          {group.map((a) => <span key={a.id} className="badge badge-warn">{a.nombre}</span>)}
          <button
            className="btn"
            onClick={() => group.slice(1).forEach((a) => onMerge(group[0].id, a.id))}
          >
            Fusionar en "{group[0].nombre}"
          </button>
        </div>
      ))}
    </div>
  );
}
