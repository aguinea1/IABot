# PROGRESS.md — Diario de Inversiones (IABot)

## Sesión del 2026-08-04 (primera sesión — repo inicializado desde cero)

### Estado: TODAS las fases del PRD (0 a 6) completadas en esta única sesión

El repositorio estaba vacío al arrancar, así que esta sesión ha inicializado
toda la estructura del proyecto y ha completado el PRD de principio a fin.
No hay trabajo previo que continuar.

### Qué se hizo

**Fase 0 — Auditoría y testing automatizado**: dataset de prueba sintético de
14 meses (`frontend/src/data/testData.js`) con el fondo "S&P 500" escrito de
5 formas distintas, una cripto con participaciones fraccionarias, un activo
de un solo mes, un activo con huecos (desaparece y reaparece) y un activo que
llega a 0€. Bug de duplicados por nombre corregido con identidad estable de
`Asset` (ver README, sección "Bugs encontrados en Fase 0"). 16 tests
unitarios en verde (`frontend/src/lib/__tests__/`).

**Fase 1 — Modelo de datos**: entidades `Asset` y `Entry`
(`frontend/src/lib/models.js`), normalización (`frontend/src/lib/normalize.js`)
y agregaciones derivadas siempre de `assetId` (`frontend/src/lib/aggregations.js`).

**Fase 2 — Métricas avanzadas**: CAGR, volatilidad mensual, máximo drawdown,
HHI de concentración con aviso >50%, TWR aproximado por activo, proyección a
3 escenarios (`frontend/src/lib/metrics.js`), todas con fórmula en tooltip.

**Fase 3 — Gráficas e interactividad**: evolución por activo con leyenda
clicable (`EvolucionChart.jsx`), donut por categoría (`DonutCategoria.jsx`),
ranking de rentabilidad (`RankingChart.jsx`), heatmap mensual
(`HeatmapMensual.jsx`), vista por tipo de activo con su propia previsión
(`VistaPorTipo.jsx`), zoom/brush temporal, tooltips enriquecidos, panel
lateral de detalle al hacer click en un punto/barra/fila de tabla
(`PanelDetalleActivo.jsx`).

**Fase 4 — Rediseño visual**: paleta "libro de contabilidad" validada para
accesibilidad (`frontend/src/index.css`, ver dataviz skill), tipografía serif
de cabecera (Source Serif 4) + monoespaciada para cifras (JetBrains Mono),
transiciones con Framer Motion, skeleton loaders (`Skeleton.jsx`), responsive
verificado en móvil/tablet/desktop con capturas de Playwright.

**Fase 5 — Agente de IA**: backend FastAPI (`backend/app/`) que envuelve
TradingAgents (TauricResearch, Apache-2.0) configurado con
`llm_provider="ollama"` y modelo recomendado `llama3.2` (confirmado con
soporte de tool-calling). Caché SQLite por ticker+día. Endpoints
`/api/advice`, `/api/ask`, `/api/market-price` (yfinance), `/api/health`.
Frontend con sección "Consejo del analista IA" (`AsesorIA.jsx`) con
disclaimer permanente. **Probado en modo mock** (4 tests backend en verde);
**pendiente de prueba end-to-end con Ollama real** porque este entorno de
build no tiene GPU garantizada ni Ollama instalado — ver limitación abajo.

**Fase 6 — Test final end-to-end**: verificado con Playwright headless
cargando el dataset de Fase 0 en la app terminada: ninguna gráfica vacía o
rota, "S&P 500" aparece como serie única con las 5 aportaciones fusionadas
(verificado visualmente en el panel de detalle: aportado 2.390€ = suma
correcta de las 5 entradas), los 3 modos de "Vista por tipo de activo"
muestran subconjuntos coherentes con su propio CAGR, la sección IA responde
en modo mock sin romper el resto, responsive correcto en 390×844 (móvil),
800×1024 (tablet) y 1280×900 (desktop).

### En qué archivo/tarea exacta se quedó

En ningún sitio a medias: **todas las fases están completas y el proyecto
compila, testea y arranca correctamente** (`npm run build` sin errores,
`npm run test` 16/16, `pytest` backend 4/4). Se hizo una pasada extra de
pulido tras completar el PRD: se corrigió un bug de timing de
`ResponsiveContainer` de Recharts (el donut y las series individuales podían
tardar en aparecer en el primer render) añadiendo un `resize` sintético en
`App.jsx`, y se corrigió un bug real introducido al intentar code-splitting
manual en `vite.config.js` (chunks circulares rompían React en runtime) —
revertido a bundle único, que es estable.

### Próximos pasos concretos para la siguiente sesión

1. Si hay acceso a una máquina con Ollama instalado: `ollama pull llama3.2`,
   `pip install "git+https://github.com/TauricResearch/TradingAgents.git"` y
   probar `/api/advice` y `/api/ask` en modo real (no mock). Ajustar el
   parseo de `TradingAgentsGraph.propagate()` en
   `backend/app/tradingagents_wrapper.py` si la estructura de retorno real
   no coincide exactamente con lo asumido (se implementó sin poder probar
   contra el paquete real instalado).
2. Considerar code-splitting real del bundle de Recharts (~545KB) con
   `React.lazy()` a nivel de componente de gráfica en vez de `manualChunks`
   a nivel de Rollup (que causó un bug de chunks circulares — ver arriba,
   ya revertido).
3. Si el proyecto pasa a usarse de verdad, considerar exportar/importar el
   JSON de `localStorage` como flujo de backup real (el botón "Exportar
   JSON" ya existe; falta el de "Importar").
4. Revisión de calidad opcional si esta sesión se repite sin trabajo nuevo
   del PRD: repasar accesibilidad (contraste, navegación por teclado en el
   panel lateral y tablas), y considerar tests de integración de componentes
   React (actualmente los 16 tests cubren solo la capa de lógica/datos, no
   los componentes).

### Decisiones de diseño y limitaciones (ver también README.md)

- Persistencia con `localStorage` (no hay backend para la cartera; el
  backend de Fase 5 es solo para el agente de IA).
- Heatmap mensual usa azul↔rojo (no verde/rojo literal) por accesibilidad
  para daltonismo — decisión documentada en el propio código
  (`HeatmapMensual.jsx`) y en el README.
- **Limitación de entorno confirmada**: esta sesión de build corre en un
  contenedor cloud sin GPU y sin Ollama preinstalado. La Fase 5 se entrega
  completa a nivel de código y probada en modo mock; la prueba real con
  Ollama queda pendiente de una máquina apropiada, tal y como pedía el
  encargo.
- No se ha tocado ningún servicio de pago en ningún punto del proyecto.
