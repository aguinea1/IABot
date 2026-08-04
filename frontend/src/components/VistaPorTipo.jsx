import { useMemo, useState } from 'react';
import EvolucionChart from './EvolucionChart';
import { cagr } from '../lib/metrics';
import { fmtPct } from '../lib/format';

const GRUPOS = {
  todo: { label: 'Todo junto', filtro: () => true },
  fondos: { label: 'Fondos / ETFs', filtro: (c) => c === 'Fondos indexados' || c === 'Acciones/ETFs' },
  cripto: { label: 'Cripto', filtro: (c) => c === 'Cripto' },
};

export default function VistaPorTipo({ assets, entries, onAssetClick }) {
  const [grupo, setGrupo] = useState('todo');

  const { subAssets, subEntries } = useMemo(() => {
    const filtro = GRUPOS[grupo].filtro;
    const subAssets = assets.filter((a) => filtro(a.categoria));
    const ids = new Set(subAssets.map((a) => a.id));
    const subEntries = entries.filter((e) => ids.has(e.assetId));
    return { subAssets, subEntries };
  }, [assets, entries, grupo]);

  const cagrGrupo = useMemo(() => cagr(subAssets, subEntries), [subAssets, subEntries]);

  return (
    <div>
      <div className="tabs" style={{ marginBottom: 12 }}>
        {Object.entries(GRUPOS).map(([key, g]) => (
          <div key={key} className={`tab ${grupo === key ? 'active' : ''}`} onClick={() => setGrupo(key)}>
            {g.label}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
        CAGR de este grupo: <strong style={{ fontFamily: 'var(--font-mono)' }}>{fmtPct(cagrGrupo)}</strong> · {subAssets.length} activo(s)
      </div>
      <EvolucionChart assets={subAssets} entries={subEntries} onAssetClick={onAssetClick} />
    </div>
  );
}
