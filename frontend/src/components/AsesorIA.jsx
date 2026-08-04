import { useState } from 'react';
import { Bot, Send, ShieldAlert } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const MOCK_ADVICE = {
  decision: 'MANTENER',
  fecha: new Date().toISOString().slice(0, 10),
  resumen: 'Respuesta de ejemplo (mock): el backend de TradingAgents no está disponible en este entorno. Instala Ollama y levanta el backend FastAPI para respuestas reales.',
  analistas: [
    { nombre: 'Analista fundamental', resumen: 'Ejemplo: métricas de valoración dentro de rango histórico.' },
    { nombre: 'Analista técnico', resumen: 'Ejemplo: tendencia lateral en el corto plazo.' },
    { nombre: 'Analista de sentimiento', resumen: 'Ejemplo: sentimiento de mercado neutro.' },
  ],
};

export default function AsesorIA({ assets }) {
  const [ticker, setTicker] = useState('');
  const [categoria, setCategoria] = useState(assets[0]?.categoria || 'Acciones/ETFs');
  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState(null);
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [usandoMock, setUsandoMock] = useState(false);

  async function pedirConsejo() {
    if (!ticker.trim()) return;
    setLoading(true);
    setUsandoMock(false);
    try {
      const res = await fetch(`${API_BASE}/api/advice?ticker=${encodeURIComponent(ticker)}&category=${encodeURIComponent(categoria)}`);
      if (!res.ok) throw new Error('backend no disponible');
      const data = await res.json();
      setRespuesta(data);
    } catch (e) {
      setUsandoMock(true);
      setRespuesta({ ...MOCK_ADVICE, ticker });
    } finally {
      setLoading(false);
    }
  }

  async function enviarPregunta() {
    if (!pregunta.trim() || !ticker.trim()) return;
    const preguntaActual = pregunta;
    setChat((c) => [...c, { rol: 'user', texto: preguntaActual }]);
    setPregunta('');
    try {
      const res = await fetch(`${API_BASE}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, pregunta: preguntaActual }),
      });
      if (!res.ok) throw new Error('backend no disponible');
      const data = await res.json();
      setChat((c) => [...c, { rol: 'ia', texto: data.respuesta }]);
    } catch (e) {
      setChat((c) => [...c, { rol: 'ia', texto: '(mock) No hay backend disponible en este entorno. Con Ollama + el backend FastAPI corriendo, aquí verías la respuesta real de TradingAgents sobre tu pregunta.' }]);
    }
  }

  return (
    <div className="panel">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Bot size={18} /> Consejo del analista IA</h2>
      <div className="disclaimer">
        <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          Esto usa <strong>TradingAgents</strong> (TauricResearch, Apache-2.0), un framework de investigación
          open source ejecutado localmente con un modelo de Ollama. <strong>No es asesoramiento financiero real.</strong>{' '}
          Es 100% gratuito: no se usa ninguna API de pago (ni Anthropic, ni OpenAI, ni Google).
        </span>
      </div>

      <div className="form-grid" style={{ marginBottom: 12 }}>
        <div>
          <label>Ticker o nombre del activo</label>
          <input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="ej. AAPL, BTC-USD, VWCE.DE" list="activos-propios" />
          <datalist id="activos-propios">
            {assets.map((a) => <option key={a.id} value={a.nombre} />)}
          </datalist>
        </div>
        <div>
          <label>Categoría</label>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {['Acciones/ETFs', 'Fondos indexados', 'Cripto', 'Materias primas/Oro', 'Otros'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={pedirConsejo} disabled={loading}>{loading ? 'Consultando…' : 'Pedir consejo'}</button>
      </div>

      {usandoMock && (
        <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginBottom: 8 }}>
          Backend no disponible ({API_BASE}) — mostrando datos de ejemplo. Ver README para levantar el backend con Ollama.
        </div>
      )}

      {respuesta && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className={`badge ${respuesta.decision === 'COMPRAR' ? 'badge-good' : respuesta.decision === 'VENDER' ? 'badge-crit' : 'badge-warn'}`}>{respuesta.decision}</span>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{respuesta.fecha}</span>
          </div>
          <p style={{ fontSize: 13, marginTop: 8 }}>{respuesta.resumen}</p>
          <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
            {respuesta.analistas?.map((an) => (
              <div key={an.nombre} style={{ fontSize: 12 }}>
                <strong>{an.nombre}:</strong> {an.resumen}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <label>Pregunta libre sobre {ticker || 'el activo'}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={{ flex: 1 }} value={pregunta} onChange={(e) => setPregunta(e.target.value)} placeholder="ej. ¿Qué riesgos tiene a corto plazo?" onKeyDown={(e) => e.key === 'Enter' && enviarPregunta()} />
          <button className="btn" onClick={enviarPregunta}><Send size={14} /></button>
        </div>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
          {chat.map((m, i) => (
            <div key={i} style={{ fontSize: 12.5, alignSelf: m.rol === 'user' ? 'flex-end' : 'flex-start', background: m.rol === 'user' ? 'var(--page-alt)' : 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', maxWidth: '85%' }}>
              {m.texto}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
