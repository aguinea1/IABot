import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { desgloseCategoria } from '../lib/aggregations';
import { fmtEUR, colorForCategoria } from '../lib/format';

export default function DonutCategoria({ assets, entries }) {
  const data = useMemo(() => desgloseCategoria(assets, entries).filter((d) => d.valor > 0), [assets, entries]);
  const total = data.reduce((s, d) => s + d.valor, 0);

  if (data.length === 0) return <div className="empty-state">Sin datos para mostrar.</div>;

  return (
    <div style={{ width: '100%', height: 280 }}>
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="valor" nameKey="categoria" cx="50%" cy="45%" innerRadius={60} outerRadius={90} paddingAngle={2} stroke="var(--surface-1)" strokeWidth={2}>
          {data.map((d) => (
            <Cell key={d.categoria} fill={colorForCategoria(d.categoria)} />
          ))}
        </Pie>
        <Tooltip formatter={(v, n) => [`${fmtEUR(v)} (${((v / total) * 100).toFixed(1)}%)`, n]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
    </div>
  );
}
