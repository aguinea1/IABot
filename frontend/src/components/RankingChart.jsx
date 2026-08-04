import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { porActivo } from '../lib/aggregations';
import { fmtPct, fmtEUR } from '../lib/format';

export default function RankingChart({ assets, entries, onBarClick }) {
  const data = useMemo(() => {
    return porActivo(assets, entries)
      .filter((p) => p.aportado > 0)
      .sort((a, b) => b.rentabilidadPct - a.rentabilidadPct)
      .map((p) => ({ nombre: p.asset.nombre, pct: Number(p.rentabilidadPct.toFixed(1)), rendimiento: p.rendimiento, assetId: p.asset.id }));
  }, [assets, entries]);

  if (data.length === 0) return <div className="empty-state">Sin datos para mostrar.</div>;

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30 }} onClick={(e) => {
        if (e && e.activePayload && e.activePayload[0] && onBarClick) onBarClick(e.activePayload[0].payload.assetId);
      }}>
        <CartesianGrid stroke="var(--gridline)" horizontal={false} />
        <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={{ stroke: 'var(--baseline)' }} tickLine={false} />
        <YAxis type="category" dataKey="nombre" width={130} tick={{ fontSize: 12, fill: 'var(--text-primary)' }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v, n, p) => [`${v}% (${fmtEUR(p.payload.rendimiento)})`, 'Rentabilidad']} cursor={{ fill: 'var(--page-alt)' }} />
        <Bar dataKey="pct" radius={[0, 4, 4, 0]} maxBarSize={22} cursor="pointer">
          {data.map((d) => (
            <Cell key={d.nombre} fill={d.pct >= 0 ? 'var(--good)' : 'var(--critical)'} />
          ))}
          <LabelList dataKey="pct" position="right" formatter={(v) => fmtPct(v)} style={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
