import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { desgloseCategoria } from '../lib/aggregations';
import { fmtEUR, colorForCategoria } from '../lib/format';

export default function DonutCategoria({ assets, entries }) {
  // El total para los porcentajes del tooltip se calcula sobre TODAS las
  // categorías (incluidas las negativas, si las hay), no solo sobre las que
  // se dibujan en la tarta. Bug encontrado en la revisión de calidad del
  // 2026-08-06: Recharts no representa bien porciones negativas, así que se
  // siguen excluyendo del donut visual, pero calcular el total solo sobre
  // los valores ya filtrados hacía que los porcentajes de las categorías
  // restantes sumaran más del 100% si existía una categoría con valor
  // negativo (p.ej. un activo con el último valor registrado en negativo).
  const todas = useMemo(() => desgloseCategoria(assets, entries), [assets, entries]);
  const data = useMemo(() => todas.filter((d) => d.valor > 0), [todas]);
  const total = todas.reduce((s, d) => s + d.valor, 0);
  const hayNegativos = todas.some((d) => d.valor < 0);

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
    {hayNegativos && (
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 4 }}>
        Alguna categoría tiene valor negativo y no se representa en el donut; el % mostrado en el tooltip sí lo tiene en cuenta.
      </div>
    )}
    </div>
  );
}
