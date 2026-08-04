import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Brush, ReferenceLine,
} from 'recharts';
import { seriesByAsset, sortedMonths, totalMensual } from '../lib/aggregations';
import { proyeccion } from '../lib/metrics';
import { fmtEUR, fmtMes, colorForIndex } from '../lib/format';

function CustomTooltip({ active, payload, label, assets, prevByMes }) {
  if (!active || !payload || payload.length === 0) return null;
  const prev = prevByMes.get(label);
  return (
    <div style={{ background: 'var(--text-primary)', color: '#fff', padding: '10px 12px', borderRadius: 8, fontSize: 12, maxWidth: 260 }}>
      <div style={{ fontFamily: 'var(--font-mono)', marginBottom: 4, opacity: 0.8 }}>{fmtMes(label)}</div>
      {payload.map((p) => {
        const asset = assets.find((a) => a.id === p.dataKey);
        if (p.value === null || p.value === undefined) return null;
        return (
          <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span>{asset ? asset.nombre : p.name}{asset ? ` · ${asset.categoria}` : ''}</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{fmtEUR(p.value)}</span>
          </div>
        );
      })}
      {prev !== undefined && payload[0] && (
        <div style={{ marginTop: 4, opacity: 0.75 }}>
          vs mes anterior: {prev >= 0 ? '+' : ''}{fmtEUR(prev)}
        </div>
      )}
    </div>
  );
}

function ClickableDot(props) {
  const { cx, cy, stroke, payload, dataKey, onAssetClick } = props;
  if (cx === undefined || cy === undefined || payload[dataKey] === null || payload[dataKey] === undefined) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={stroke}
      stroke="var(--surface-1)"
      strokeWidth={1}
      style={{ cursor: 'pointer' }}
      onClick={(e) => {
        e.stopPropagation();
        onAssetClick && onAssetClick(dataKey);
      }}
    />
  );
}

export default function EvolucionChart({ assets, entries, onAssetClick }) {
  const [hidden, setHidden] = useState(new Set());
  const [showProyeccion, setShowProyeccion] = useState(true);

  const months = useMemo(() => sortedMonths(entries), [entries]);
  const series = useMemo(() => seriesByAsset(assets, entries), [assets, entries]);
  const totales = useMemo(() => totalMensual(assets, entries), [assets, entries]);
  const proy = useMemo(() => proyeccion(assets, entries, 6), [assets, entries]);

  const prevByMes = useMemo(() => {
    const map = new Map();
    for (let i = 1; i < totales.length; i++) {
      map.set(totales[i].mes, totales[i].total - totales[i - 1].total);
    }
    return map;
  }, [totales]);

  const chartData = useMemo(() => {
    const base = months.map((mes, idx) => {
      const row = { mes, total: totales[idx]?.total ?? null };
      series.forEach(({ asset, puntos }) => {
        row[asset.id] = puntos[idx]?.valor ?? null;
      });
      return row;
    });
    if (!showProyeccion) return base;
    const lastTotal = totales.at(-1)?.total ?? 0;
    const proyRows = proy.map((p, i) => ({
      mes: `+${i + 1}m`,
      proyPesimista: p.pesimista,
      proyBase: p.base,
      proyOptimista: p.optimista,
    }));
    if (base.length) base[base.length - 1] = { ...base[base.length - 1], proyPesimista: lastTotal, proyBase: lastTotal, proyOptimista: lastTotal };
    return [...base, ...proyRows];
  }, [months, series, totales, proy, showProyeccion]);

  function toggleAsset(id) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (months.length === 0) {
    return <div className="empty-state">Sin datos todavía. Añade una entrada o carga los datos de ejemplo.</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={showProyeccion} onChange={(e) => setShowProyeccion(e.target.checked)} />
          <span style={{ fontSize: 12 }}>Mostrar proyección (3 escenarios)</span>
        </label>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--gridline)" vertical={false} />
          <XAxis dataKey="mes" tickFormatter={(m) => (m.startsWith('+') ? m : fmtMes(m))} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={{ stroke: 'var(--baseline)' }} tickLine={false} />
          <YAxis tickFormatter={(v) => fmtEUR(v)} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={70} />
          <Tooltip content={<CustomTooltip assets={assets} prevByMes={prevByMes} />} />
          <ReferenceLine x={months.at(-1)} stroke="var(--baseline)" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="total" name="Total cartera" stroke="var(--text-primary)" strokeWidth={2} dot={false} connectNulls />
          {series.map(({ asset }, idx) =>
            hidden.has(asset.id) ? null : (
              <Line
                key={asset.id}
                type="monotone"
                dataKey={asset.id}
                name={asset.nombre}
                stroke={colorForIndex(idx)}
                strokeWidth={1.5}
                dot={<ClickableDot onAssetClick={onAssetClick} />}
                activeDot={<ClickableDot onAssetClick={onAssetClick} />}
                connectNulls={false}
              />
            )
          )}
          {showProyeccion && (
            <>
              <Line type="monotone" dataKey="proyPesimista" name="Proy. pesimista" stroke="var(--series-8)" strokeDasharray="4 3" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="proyBase" name="Proy. base" stroke="var(--series-4)" strokeDasharray="4 3" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="proyOptimista" name="Proy. optimista" stroke="var(--good)" strokeDasharray="4 3" strokeWidth={1.5} dot={false} />
            </>
          )}
          <Brush dataKey="mes" height={22} stroke="var(--baseline)" travellerWidth={8} tickFormatter={(m) => (m.startsWith('+') ? m : fmtMes(m))} />
        </LineChart>
      </ResponsiveContainer>
      <div className="legend-row">
        {series.map(({ asset }, idx) => (
          <div key={asset.id} className={`legend-item ${hidden.has(asset.id) ? 'inactive' : ''}`} onClick={() => toggleAsset(asset.id)}>
            <span className="legend-dot" style={{ background: colorForIndex(idx) }} />
            {asset.nombre}
          </div>
        ))}
      </div>
    </div>
  );
}
