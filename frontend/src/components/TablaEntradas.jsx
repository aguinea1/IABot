import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { fmtEUR, fmtMes } from '../lib/format';

export default function TablaEntradas({ assets, entries, onRemove, onRowClick }) {
  const [filtro, setFiltro] = useState('');
  const assetById = new Map(assets.map((a) => [a.id, a]));
  const rows = [...entries]
    .sort((a, b) => (a.mes < b.mes ? 1 : a.mes > b.mes ? -1 : 0))
    .filter((e) => {
      const a = assetById.get(e.assetId);
      return !filtro || (a && a.nombre.toLowerCase().includes(filtro.toLowerCase()));
    });

  if (entries.length === 0) return <div className="empty-state">Todavía no hay movimientos registrados.</div>;

  return (
    <div>
      <input aria-label="Filtrar por activo" placeholder="Filtrar por activo…" value={filtro} onChange={(e) => setFiltro(e.target.value)} style={{ marginBottom: 10, width: 220 }} />
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        <table className="table-ledger">
          <thead>
            <tr>
              <th>Mes</th><th>Activo</th><th>Categoría</th><th>Valor</th><th>Aportación</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => {
              const a = assetById.get(e.assetId);
              return (
                <tr key={e.id} onClick={() => onRowClick && onRowClick(a?.id)} style={{ cursor: 'pointer' }}>
                  <td>{fmtMes(e.mes)}</td>
                  <td style={{ fontFamily: 'var(--font-sans)' }}>{a ? a.nombre : '—'}</td>
                  <td style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-secondary)' }}>{a ? a.categoria : '—'}</td>
                  <td>{fmtEUR(e.valor)}</td>
                  <td>{e.aportacion ? fmtEUR(e.aportacion) : '—'}</td>
                  <td>
                    <button
                      type="button"
                      onClick={(ev) => { ev.stopPropagation(); onRemove(e.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--critical)', display: 'flex' }}
                      title="Eliminar movimiento"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
