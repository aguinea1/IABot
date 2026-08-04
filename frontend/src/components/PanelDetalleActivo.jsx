import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { porActivo } from '../lib/aggregations';
import { fmtEUR, fmtPct, fmtMes } from '../lib/format';

export default function PanelDetalleActivo({ assetId, assets, entries, onClose }) {
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (!assetId) return;
    closeBtnRef.current?.focus();
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [assetId, onClose]);

  if (!assetId) return null;
  const asset = assets.find((a) => a.id === assetId);
  if (!asset) return null;
  const detalle = porActivo(assets, entries).find((p) => p.asset.id === assetId);
  const movimientos = entries.filter((e) => e.assetId === assetId).sort((a, b) => (a.mes < b.mes ? -1 : 1));

  return (
    <>
      <div className="side-panel-backdrop" onClick={onClose} />
      <div className="side-panel" role="dialog" aria-modal="true" aria-label={`Detalle de ${asset.nombre}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', margin: 0 }}>{asset.nombre}</h2>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{asset.categoria}</div>
          </div>
          <button ref={closeBtnRef} onClick={onClose} aria-label="Cerrar panel de detalle" style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div className="kpi-grid" style={{ marginTop: 16, gridTemplateColumns: '1fr 1fr' }}>
          <div className="kpi-card">
            <div className="kpi-label">Aportado</div>
            <div className="kpi-value">{fmtEUR(detalle?.aportado)}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Valor actual</div>
            <div className="kpi-value">{fmtEUR(detalle?.valorActual)}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Rendimiento</div>
            <div className="kpi-value" style={{ color: (detalle?.rendimiento ?? 0) >= 0 ? 'var(--good)' : 'var(--critical)' }}>{fmtEUR(detalle?.rendimiento)}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Rentabilidad</div>
            <div className="kpi-value" style={{ color: (detalle?.rentabilidadPct ?? 0) >= 0 ? 'var(--good)' : 'var(--critical)' }}>{fmtPct(detalle?.rentabilidadPct)}</div>
          </div>
        </div>

        <h3 style={{ fontSize: 13, marginTop: 20 }}>Historial de movimientos</h3>
        <table className="table-ledger">
          <thead><tr><th>Mes</th><th>Valor</th><th>Aportación</th></tr></thead>
          <tbody>
            {movimientos.map((m) => (
              <tr key={m.id}>
                <td>{fmtMes(m.mes)}</td>
                <td>{fmtEUR(m.valor)}</td>
                <td>{m.aportacion ? fmtEUR(m.aportacion) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
