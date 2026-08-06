import { useState, useMemo } from 'react';
import { CATEGORIAS } from '../lib/models';
import { similarAssets } from '../lib/normalize';
import { Plus } from 'lucide-react';

export default function FormularioEntrada({ assets, onAdd }) {
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [mes, setMes] = useState(() => {
    // `toISOString()` da el año-mes en UTC, no en la hora local del
    // usuario. Bug encontrado en la revisión de calidad del 2026-08-06:
    // cerca de medianoche local, un usuario en un huso horario negativo
    // (América) podía ver precargado el mes SIGUIENTE al real, y uno en
    // huso positivo cerca de fin de mes el mes ANTERIOR. Se construye el
    // string YYYY-MM a partir de los componentes locales de Date.
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [modo, setModo] = useState('valor');
  const [valor, setValor] = useState('');
  const [participaciones, setParticipaciones] = useState('');
  const [precio, setPrecio] = useState('');
  const [aportacion, setAportacion] = useState('');

  const sugerencias = useMemo(() => (nombre.length >= 3 ? similarAssets(nombre, assets) : []), [nombre, assets]);

  function submit(e) {
    e.preventDefault();
    if (!nombre.trim() || !mes) return;
    onAdd(nombre.trim(), categoria, mes, {
      modo,
      valor: modo === 'valor' ? Number(valor) || 0 : 0,
      participaciones: modo === 'participaciones' ? Number(participaciones) || 0 : 0,
      precio: modo === 'participaciones' ? Number(precio) || 0 : 0,
      aportacion: Number(aportacion) || 0,
    });
    setValor(''); setParticipaciones(''); setPrecio(''); setAportacion('');
  }

  return (
    <form onSubmit={submit} className="panel" style={{ marginBottom: 20 }}>
      <h2>Añadir movimiento</h2>
      <p className="panel-sub">El nombre se normaliza automáticamente: "S&P 500", "s&p500" y "SP500" se tratan como el mismo activo.</p>
      <div className="form-grid">
        <div>
          <label>Nombre del activo</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="ej. S&P 500" required />
          {sugerencias.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--series-1)', marginTop: 3 }}>
              ¿Quizás: {sugerencias.map((s) => (
                <button key={s.id} type="button" onClick={() => setNombre(s.nombre)} style={{ background: 'none', border: 'none', color: 'var(--series-1)', textDecoration: 'underline', cursor: 'pointer', padding: '0 3px' }}>
                  {s.nombre}
                </button>
              ))}?
            </div>
          )}
        </div>
        <div>
          <label>Categoría</label>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label>Mes</label>
          <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} required />
        </div>
        <div>
          <label>Modo</label>
          <select value={modo} onChange={(e) => setModo(e.target.value)}>
            <option value="valor">Valor directo</option>
            <option value="participaciones">Participaciones + precio</option>
          </select>
        </div>
        {modo === 'valor' ? (
          <div>
            <label>Valor total (€)</label>
            <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
        ) : (
          <>
            <div>
              <label>Participaciones</label>
              <input type="number" step="0.0001" value={participaciones} onChange={(e) => setParticipaciones(e.target.value)} />
            </div>
            <div>
              <label>Precio unitario (€)</label>
              <input type="number" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} />
            </div>
          </>
        )}
        <div>
          <label>Aportación este mes (€, opcional)</label>
          <input type="number" step="0.01" value={aportacion} onChange={(e) => setAportacion(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
          <Plus size={14} /> Añadir
        </button>
      </div>
    </form>
  );
}
