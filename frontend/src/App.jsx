import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Upload, RefreshCw, Trash2 } from 'lucide-react';

import { usePortfolio } from './hooks/usePortfolio';
import { KpiSkeleton, ChartSkeleton } from './components/Skeleton';
import KpiCard from './components/KpiCard';
import EvolucionChart from './components/EvolucionChart';
import DonutCategoria from './components/DonutCategoria';
import RankingChart from './components/RankingChart';
import HeatmapMensual from './components/HeatmapMensual';
import VistaPorTipo from './components/VistaPorTipo';
import FormularioEntrada from './components/FormularioEntrada';
import TablaEntradas from './components/TablaEntradas';
import PanelDetalleActivo from './components/PanelDetalleActivo';
import DuplicadosPanel from './components/DuplicadosPanel';
import AsesorIA from './components/AsesorIA';

import { rendimientoTotal, totalMensual } from './lib/aggregations';
import { cagr, volatilidadMensual, maxDrawdown, hhi, FORMULAS } from './lib/metrics';
import { exportStateAsJSON, parseImportedState } from './lib/storage';
import { fmtEUR, fmtPct } from './lib/format';

const TABS = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'graficas', label: 'Gráficas' },
  { key: 'movimientos', label: 'Movimientos' },
  { key: 'ia', label: 'Consejo IA' },
];

export default function App() {
  const { state, loading, addEntry, removeEntry, merge, loadDemoData, resetAll, importState, duplicates } = usePortfolio();
  const { assets, entries } = state;
  const [tab, setTab] = useState('resumen');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [importError, setImportError] = useState(null);

  const rendimiento = useMemo(() => rendimientoTotal(assets, entries), [assets, entries]);
  const ultimo = rendimiento.at(-1);
  const anterior = rendimiento.at(-2);
  const deltaMes = ultimo && anterior ? ultimo.total - anterior.total : null;

  // Workaround: en algunos navegadores/headless, ResponsiveContainer de
  // Recharts mide el contenedor antes de que el layout (fuentes, grid) se
  // estabilice del todo. Disparamos un resize sintético tras el primer
  // render y al cambiar de pestaña para forzar el recálculo.
  useEffect(() => {
    const t1 = setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
    const t2 = setTimeout(() => window.dispatchEvent(new Event('resize')), 350);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [tab, loading]);

  const cagrVal = useMemo(() => cagr(assets, entries), [assets, entries]);
  const volVal = useMemo(() => volatilidadMensual(assets, entries), [assets, entries]);
  const ddVal = useMemo(() => maxDrawdown(assets, entries), [assets, entries]);
  const hhiVal = useMemo(() => hhi(assets, entries), [assets, entries]);

  function handleExport() {
    const blob = new Blob([exportStateAsJSON(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dashboard_inversiones_export.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = parseImportedState(reader.result);
        importState(data);
        setImportError(null);
      } catch (err) {
        setImportError(err.message || 'No se pudo importar el archivo.');
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="app-shell">
      <header className="ledger-header">
        <div>
          <h1>Diario de Inversiones</h1>
          <div className="subtitle">Cartera personal · datos guardados en este navegador (localStorage)</div>
        </div>
        <div className="toolbar">
          <button className="btn" onClick={loadDemoData}><RefreshCw size={14} style={{ marginRight: 5 }} />Cargar datos de ejemplo</button>
          <button className="btn" onClick={handleExport}><Download size={14} style={{ marginRight: 5 }} />Exportar JSON</button>
          <label className="btn" style={{ display: 'inline-flex', alignItems: 'center', margin: 0 }}>
            <Upload size={14} style={{ marginRight: 5 }} />Importar JSON
            <input type="file" accept="application/json" onChange={handleImportFile} style={{ display: 'none' }} />
          </label>
          <button className="btn btn-danger" onClick={resetAll}><Trash2 size={14} style={{ marginRight: 5 }} />Vaciar todo</button>
        </div>
      </header>
      {importError && (
        <div className="disclaimer" style={{ borderColor: 'var(--critical)', background: '#fdecea', color: 'var(--critical)' }}>
          {importError}
        </div>
      )}

      <nav className="tabs">
        {TABS.map((t) => (
          <div key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</div>
        ))}
      </nav>

      {loading ? (
        <>
          <KpiSkeleton />
          <ChartSkeleton />
        </>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {tab === 'resumen' && (
              <>
                <div className="kpi-grid">
                  <KpiCard label="Valor total" value={fmtEUR(ultimo?.total ?? 0)} deltaLabel={deltaMes !== null ? `${deltaMes >= 0 ? '+' : ''}${fmtEUR(deltaMes)} vs mes anterior` : null} delta={deltaMes} />
                  <KpiCard label="Aportado" value={fmtEUR(ultimo?.aportado ?? 0)} />
                  <KpiCard label="Rendimiento" value={fmtEUR(ultimo?.rendimiento ?? 0)} delta={ultimo?.rendimiento} />
                  <KpiCard label="CAGR" value={fmtPct(cagrVal)} formula={FORMULAS.cagr} />
                  <KpiCard label="Volatilidad mensual" value={fmtPct(volVal)} formula={FORMULAS.volatilidad} />
                  <KpiCard label="Máx. drawdown" value={fmtPct(-ddVal)} formula={FORMULAS.drawdown} />
                </div>

                <div className="panel">
                  <h2>Concentración / diversificación (HHI)</h2>
                  <p className="panel-sub" title={FORMULAS.hhi}>{FORMULAS.hhi}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div className="kpi-value" style={{ fontSize: 28 }}>{hhiVal.indice.toFixed(0)}</div>
                    {hhiVal.alerta && <span className="badge badge-warn">⚠ Una categoría supera el 50% de la cartera</span>}
                    <div className="legend-row" style={{ marginTop: 0 }}>
                      {hhiVal.desglosePct.map((d) => (
                        <span key={d.categoria} className="legend-item">{d.categoria}: {d.pct.toFixed(1)}%</span>
                      ))}
                    </div>
                  </div>
                </div>

                <DuplicadosPanel duplicates={duplicates} onMerge={merge} />

                <div className="panel">
                  <h2>Evolución total y previsión</h2>
                  <EvolucionChart assets={assets} entries={entries} onAssetClick={setSelectedAsset} />
                </div>
              </>
            )}

            {tab === 'graficas' && (
              <>
                <div className="chart-grid">
                  <div className="panel">
                    <h2>Evolución por activo</h2>
                    <p className="panel-sub">Click en la leyenda para aislar series.</p>
                    <EvolucionChart assets={assets} entries={entries} onAssetClick={setSelectedAsset} />
                  </div>
                  <div className="panel">
                    <h2>Desglose por categoría</h2>
                    <DonutCategoria assets={assets} entries={entries} />
                  </div>
                </div>
                <div className="panel">
                  <h2>Vista por tipo de activo</h2>
                  <VistaPorTipo assets={assets} entries={entries} onAssetClick={setSelectedAsset} />
                </div>
                <div className="chart-grid">
                  <div className="panel">
                    <h2>Ranking de rentabilidad por activo</h2>
                    <RankingChart assets={assets} entries={entries} onBarClick={setSelectedAsset} />
                  </div>
                  <div className="panel">
                    <h2>Heatmap mensual de variación %</h2>
                    <HeatmapMensual assets={assets} entries={entries} />
                  </div>
                </div>
              </>
            )}

            {tab === 'movimientos' && (
              <>
                <FormularioEntrada assets={assets} onAdd={addEntry} />
                <div className="panel">
                  <h2>Historial de movimientos</h2>
                  <TablaEntradas assets={assets} entries={entries} onRemove={removeEntry} onRowClick={setSelectedAsset} />
                </div>
              </>
            )}

            {tab === 'ia' && <AsesorIA assets={assets} />}
          </motion.div>
        </AnimatePresence>
      )}

      <PanelDetalleActivo assetId={selectedAsset} assets={assets} entries={entries} onClose={() => setSelectedAsset(null)} />
    </div>
  );
}
