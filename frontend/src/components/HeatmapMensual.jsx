import { useMemo, useState } from 'react';
import { totalMensual } from '../lib/aggregations';
import { fmtMes, fmtPct, fmtEUR } from '../lib/format';

// Heatmap de variación % mensual del total de cartera.
// Nota de accesibilidad (dataviz skill): usamos el par diverging azul↔rojo con
// punto medio gris neutro en vez de verde/rojo literal, porque verde/rojo es
// precisamente la combinación menos distinguible para daltonismo rojo-verde
// (el tipo más común). El signo (ganancia/pérdida) se sigue leyendo por el
// signo numérico en el propio texto de la celda, no solo por color.
function colorForVariacion(pct) {
  if (pct === null) return 'var(--gridline)';
  const clamped = Math.max(-8, Math.min(8, pct));
  const t = clamped / 8; // -1..1
  if (t >= 0) {
    // azul, más intenso cuanto mayor la subida
    const alpha = 0.15 + Math.abs(t) * 0.55;
    return `rgba(42, 120, 214, ${alpha})`;
  }
  const alpha = 0.15 + Math.abs(t) * 0.55;
  return `rgba(211, 59, 59, ${alpha})`;
}

export default function HeatmapMensual({ assets, entries }) {
  const [hover, setHover] = useState(null);
  const variaciones = useMemo(() => {
    const mensual = totalMensual(assets, entries);
    return mensual.map((m, i) => {
      if (i === 0 || mensual[i - 1].total <= 0) return { mes: m.mes, pct: null };
      return { mes: m.mes, pct: ((m.total - mensual[i - 1].total) / mensual[i - 1].total) * 100 };
    });
  }, [assets, entries]);

  if (variaciones.length === 0) return <div className="empty-state">Sin datos para mostrar.</div>;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: 6 }}>
        {variaciones.map((v) => (
          <div
            key={v.mes}
            onMouseEnter={() => setHover(v)}
            onMouseLeave={() => setHover(null)}
            style={{
              background: colorForVariacion(v.pct),
              borderRadius: 6,
              padding: '10px 6px',
              textAlign: 'center',
              cursor: 'default',
              border: '1px solid var(--border)',
              transition: 'transform 0.12s ease',
              transform: hover?.mes === v.mes ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{fmtMes(v.mes)}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>
              {v.pct === null ? '—' : `${v.pct >= 0 ? '+' : ''}${v.pct.toFixed(1)}%`}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-secondary)', display: 'flex', gap: 14 }}>
        <span><span className="legend-dot" style={{ background: 'rgba(211,59,59,0.6)' }} /> Caída</span>
        <span><span className="legend-dot" style={{ background: 'rgba(42,120,214,0.6)' }} /> Subida</span>
      </div>
    </div>
  );
}
