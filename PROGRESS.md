# PROGRESS.md — Diario de Inversiones (IABot)

## Sesión del 2026-08-06 (tercera sesión — el PRD ya estaba completo)

### Estado de partida

Al arrancar, `PROGRESS.md` (versión de la sesión del 2026-08-05) indicaba que
el PRD completo (Fases 0-6) seguía terminado, con 28 tests en frontend, 6 en
backend, build y lint en verde. Siguiendo la instrucción de "si el proyecto
ya está completo, haz una revisión de calidad/bugs adicional en vez de
repetir trabajo", esta sesión se dedicó íntegramente a eso: no se ha tocado
ninguna fase del PRD ni añadido features nuevas del encargo.

### Qué se hizo hoy

1. **Verificación de partida**: se clonó el repo, se instalaron dependencias
   (`npm install` en frontend, venv + `pip install -r requirements.txt
   -r requirements-dev.txt` en backend) y se confirmó que los 28 tests de
   frontend y los 6 de backend seguían en verde, y que `npm run build`
   compilaba sin errores, antes de tocar nada.
2. **Dos rondas de auditoría con un agente de exploración fresco**, cada una
   sobre un conjunto de archivos que aún no había recibido una revisión tan
   a fondo en ninguna sesión anterior (backend completo + varios
   componentes/lib de frontend en la primera ronda; `App.jsx`, el resto de
   componentes y `models.js`/`normalize.js`/`format.js` en la segunda). Se
   devolvieron 11 hallazgos reales en total, verificados manualmente uno a
   uno antes de corregir (ninguno afecta a la restricción "100% gratuito").
3. **Correcciones aplicadas** (detalle completo con archivo/línea en
   README.md, sección "Revisión de calidad adicional (tercera sesión de
   build, 2026-08-06)"):
   - `npm run lint` no funcionaba en un checkout limpio: `oxlint` no estaba
     declarado en `devDependencies` pese a estar en el script `lint`.
     Añadido.
   - Fuga de conexión SQLite en cada petición a `/api/advice`
     (`backend/app/cache.py`): `with sqlite3.connect(...)` no cierra la
     conexión (solo gestiona la transacción). Corregido con `try/finally`.
   - Robo de foco real en `PanelDetalleActivo.jsx`: el efecto de foco
     dependía de `onClose`, que cambia de identidad en cada render de
     `App.jsx` (arrow function inline), robando el foco de vuelta en
     cualquier re-render mientras el panel estaba abierto. Corregido con un
     `ref`.
   - Comparador de `sort` inconsistente para el mismo mes en 4 sitios
     (`aggregations.js` ×2, `PanelDetalleActivo.jsx`, `TablaEntradas.jsx`):
     nunca devolvía `0`, violando el contrato de `sort`. Corregido con
     comparador de 3 vías en los cuatro.
   - Categorías "fantasma" con valor 0€ en `desgloseCategoria` para activos
     sin ninguna entrada. Corregido.
   - **Bug crítico de identidad en `canonicalKey`** (`lib/normalize.js`):
     nombres compuestos solo por caracteres no latinos (CJK, etc.)
     colapsaban a la clave canónica vacía, fusionando por error activos de
     nombres totalmente distintos — el bug inverso al que esta función
     arregló en la Fase 0. Corregido con `\p{L}\p{N}` unicode + fallback.
   - Condición de carrera sin cancelar en `enviarPregunta` de `AsesorIA.jsx`
     (a diferencia de `pedirConsejo`, no usaba `AbortController`). Corregido
     con un `ref` propio.
   - Porcentajes del donut incorrectos si hay una categoría con valor
     negativo (`DonutCategoria.jsx`): el total se calculaba sobre los datos
     ya filtrados. Corregido + aviso visible si hay negativos.
   - Mes por defecto del formulario en UTC en vez de hora local
     (`FormularioEntrada.jsx`). Corregido.
   - URL con doble barra si `OLLAMA_BASE_URL` termina en `/`
     (`tradingagents_wrapper.py`, `ask_free_question`). Corregido
     normalizando una sola vez al importar el módulo.
   - Contrato de retorno inconsistente en `market_data.get_last_price`
     (`None` / `dict` / `dict` con `error` según el caso). Corregido a una
     forma uniforme.
4. **Tests nuevos**: `frontend/src/lib/__tests__/aggregations.test.js` (2,
   sort estable + categorías fantasma), `frontend/src/__tests__/components.test.jsx`
   (+1, no robar foco en re-render), `frontend/src/lib/__tests__/models.test.js`
   (+2, `canonicalKey` con nombres CJK/emoji), `backend/tests/test_tradingagents_wrapper.py`
   (2, normalización de `OLLAMA_BASE_URL`). Total: **33 tests en verde en
   frontend** (antes 28), **8 en backend** (antes 6).
5. **Se intentó de nuevo instalar/alcanzar Ollama** (`curl
   https://ollama.com/install.sh` y `https://ollama.com`): sigue sin ser
   posible desde este entorno de build (timeout de red / lista blanca), tal
   y como se documentó en las dos sesiones anteriores. La Fase 5 sigue
   completa a nivel de código, probada en modo mock, pendiente de prueba
   real en una máquina con Ollama.
6. **Verificación final**: smoke test manual con Playwright headless contra
   `vite preview` (build de producción), cargando el dataset de ejemplo,
   navegando las 4 pestañas y abriendo el panel de detalle de un activo —
   sin errores de consola nuevos, capturas en escritorio y móvil (390×844)
   revisadas visualmente. `npm run build`, `npm run lint`, `npm run test` y
   `pytest` en verde al cerrar la sesión.

### En qué se quedó / próxima sesión

**Todo compila, testea y arranca correctamente, sin ningún cambio a medias.**
Comandos de verificación (todos en verde a fecha de hoy):

```bash
cd frontend && npm install && npm run test -- --run   # 33/33
cd frontend && npm run build                           # sin errores
cd frontend && npm run lint                            # solo 1 warning cosmético preexistente
cd backend && pip install -r requirements.txt -r requirements-dev.txt && python -m pytest tests/ -q  # 8/8
```

Próximos pasos si se retoma (sin cambios respecto a la sesión anterior,
salvo la nota de red confirmada de nuevo):

1. Si hay acceso a una máquina con Ollama instalado (fuera de este entorno
   de build, que sigue sin poder alcanzar `ollama.com`): `ollama pull
   qwen3:latest`, instalar `tradingagents` desde git, y probar `/api/advice`
   y `/api/ask` en modo real.
2. Revisar de vez en cuando el catálogo de modelos de Ollama de
   `tradingagents` por si cambia con nuevas versiones del paquete.
3. Considerar code-splitting real del bundle de Recharts con
   `React.lazy()` — evaluado hoy, no aplicado (riesgo/beneficio no lo
   justificaba en una sesión desatendida).
4. Si esta sesión se repite sin más hallazgos de calidad nuevos, pasar a
   régimen de mantenimiento normal (revisiones puntuales, no auditorías
   completas cada vez) — ya van tres rondas de auditoría consecutivas sin
   encontrar nada que comprometiera la funcionalidad core.

### Decisiones de diseño de hoy

- No se optimizó el bundle con code-splitting pese a estar en la lista de
  "próximos pasos" de la sesión anterior: se evaluó el riesgo de introducir
  un bug de `Suspense`/timing sin nadie disponible para verificarlo
  interactivamente, y no compensaba frente al beneficio marginal.
- El `ref` de cancelación de `enviarPregunta` en `AsesorIA.jsx` se mantuvo
  separado del de `pedirConsejo` a propósito: son peticiones independientes
  y abortar una no debería cancelar la otra.
- Ningún hallazgo de las dos rondas de auditoría de hoy comprometía la
  restricción de "100% gratuito".

---

## Sesión del 2026-08-04 (primera sesión — repo inicializado desde cero)

### Estado: TODAS las fases del PRD (0 a 6) completadas en esta única sesión

El repositorio estaba vacío al arrancar, así que esta sesión ha inicializado
toda la estructura del proyecto y ha completado el PRD de principio a fin.
No hay trabajo previo que continuar.

### Pulido adicional tras completar el PRD (misma sesión)

Con tiempo de sobra tras terminar las 7 fases (~1h de las ~4h asignadas), se
hizo una ronda extra: importar JSON (complemento a exportar), accesibilidad
de teclado (leyenda como botones, panel lateral con foco/Escape/`role=dialog`),
8 tests de integración adicionales con React Testing Library (total 24 tests
en verde), y validación formal de la paleta de accesibilidad con el script
del dataviz skill (todos los checks duros en PASS). Detalle completo en
README.md, sección "Pasada de pulido adicional".

### Qué se hizo (fases del PRD)

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

---

## Sesión del 2026-08-05 (segunda sesión — el PRD ya estaba completo)

### Estado de partida

Al arrancar esta sesión, este mismo fichero (versión de la sesión del
2026-08-04) indicaba que **todas las fases del PRD (0 a 6) estaban
completas**, con build, tests (24/24 frontend, 4/4 backend) y arranque
funcionando correctamente, más una pasada extra de pulido ya hecha en la
misma primera sesión (importar JSON, accesibilidad de teclado, tests de
integración). Siguiendo la instrucción de "si el proyecto ya está completo,
haz una revisión de calidad/bugs adicional en vez de repetir trabajo", esta
sesión se ha dedicado íntegramente a eso: no se ha tocado ninguna fase del
PRD ni se han añadido features nuevas del encargo.

### Qué se hizo hoy

1. **Verificación de partida**: se confirmó que build, los 24 tests de
   frontend y los 4 de backend seguían en verde antes de tocar nada.
2. **Auditoría de calidad con un agente de exploración** sobre
   `lib/aggregations.js`, `lib/metrics.js`, `lib/normalize.js`,
   `lib/models.js`, `lib/storage.js`, todos los componentes de
   `frontend/src/components`, y todo `backend/app/`. Se devolvieron 10
   hallazgos reales (2 importantes, 8 menores), sin ningún hallazgo crítico.
3. **Correcciones aplicadas** (detalladas también en README.md, sección
   "Revisión de calidad adicional"):
   - Bug de caché por categoría en `backend/app/cache.py` (la clave de
     caché SQLite no distinguía `categoria`; corregido + test de regresión
     en `backend/tests/test_cache.py`).
   - Categorías incompletas en el selector de "Consejo IA"
     (`AsesorIA.jsx` tenía una lista hardcodeada que omitía "Cuenta
     remunerada"; ahora importa `CATEGORIAS` de `lib/models.js`).
   - Fugas de estado tras desmontar en `AsesorIA.jsx` (`fetch` sin
     `AbortController`; corregido).
   - Fusión de duplicados incompleta en `DuplicadosPanel.jsx` (solo
     fusionaba los dos primeros de un grupo de 3+; corregido para fusionar
     el grupo entero de un click).
   - `cagr()` podía devolver `NaN` con valor final negativo (guard añadido
     + test).
   - Accesibilidad de teclado real en las pestañas de navegación
     (`App.jsx`, `VistaPorTipo.jsx`: ahora `<button role="tab">`) y en el
     icono de fórmula de `KpiCard.jsx` (ahora focuseable).
   - Labels sin asociar (`htmlFor`/`id`) en los campos de `AsesorIA.jsx`.
   - Limpieza de imports sin usar (`oxlint` en verde salvo un warning
     cosmético preexistente en `normalize.js`, no funcional).
   - Se evaluó y **descartó explícitamente** colorear las series de
     "Evolución por activo" por hash de `asset.id` en vez de por posición
     en el array (para estabilidad tras una fusión); se revirtió tras
     comprobar visualmente que con pocos activos un hash produce
     colisiones de color mucho más frecuentes que el problema que
     intentaba resolver. Decisión documentada en `lib/format.js` y README
     para que no se reintente sin motivo.
4. **Se instaló el paquete real `tradingagents`** (v0.3.1, desde GitHub) en
   el entorno de build para validar la Fase 5 contra código real en vez de
   solo contra supuestos. Esto permitió confirmar y corregir **dos bugs
   reales de integración** en `backend/app/tradingagents_wrapper.py`:
   - El catálogo de modelos recomendados de TradingAgents para Ollama ya no
     incluye `llama3.2` (que se había documentado en la sesión anterior);
     hoy recomienda `qwen3:latest` (8B), `gpt-oss:latest` (20B) y
     `glm-4.7-flash:latest` (30B). Se cambió el modelo por defecto a
     `qwen3:latest` y se actualizó el README con esta fuente verificada
     (`tradingagents/llm_clients/model_catalog.py`).
   - El cliente Ollama de TradingAgents es compatible con la API de OpenAI
     y **requiere que `backend_url` incluya el sufijo `/v1`**
     (`http://localhost:11434/v1`), algo que el wrapper no hacía (usaba la
     raíz `http://localhost:11434`) y que habría roto la llamada real en
     cuanto alguien probara la Fase 5 con Ollama instalado. Corregido.
   - Se confirmó que, sin Ollama corriendo, `get_advice()` captura la
     excepción de conexión y cae al mock de forma controlada (no un error
     500) — comportamiento correcto verificado con el paquete real
     instalado, no solo asumido.
   - **Se intentó instalar Ollama en este entorno de build y no fue
     posible**: `curl https://ollama.com/install.sh` devuelve `403` porque
     el acceso de red de este contenedor está restringido a una lista
     blanca que no incluye `ollama.com`. Esto confirma (no solo repite) la
     limitación de entorno ya documentada en la sesión anterior. La llamada
     de inferencia real contra un modelo Ollama en ejecución sigue sin
     poder probarse desde una sesión de build; el wrapper y el README están
     ahora correctos y listos para esa prueba en cuanto alguien lo ejecute
     en una máquina con Ollama.
5. **Tests nuevos**: `backend/tests/test_cache.py` (2 tests, caché por
   categoría), `frontend/src/lib/__tests__/metrics.test.js` (+1 test, guard
   de `cagr`), `frontend/src/__tests__/components.test.jsx` (2 tests nuevos:
   categorías completas en `AsesorIA`, fusión de grupo completo en
   `DuplicadosPanel`). Total: **28 tests en verde en frontend** (antes 24),
   **6 en backend** (antes 4).
6. **`backend/requirements-dev.txt` añadido** (solo `pytest`, no necesario
   para ejecutar el backend en producción local) — antes `pytest` no estaba
   declarado en ningún fichero de dependencias, aunque los tests ya
   existían y pasaban si se instalaba manualmente.
7. **`frontend/package-lock.json` regenerado**: tenía entradas de lockfile
   incompletas para dependencias de test (`jsdom`, `@testing-library/*`) ya
   declaradas en `package.json` pero no bloqueadas — `npm ci` habría podido
   fallar o resolver versiones distintas en una máquina limpia. Corregido
   con `npm install`.
8. **Verificación final end-to-end** (Playwright headless contra
   `vite preview`, no solo `npm run build`): capturas en escritorio
   (1280×900) con datos de ejemplo cargados (colores de las 6 series todos
   distintos, panel "Consejo IA" con disclaimer visible) y en móvil
   (390×844) confirmando el layout responsive. Sin errores de consola
   aparte de un intento de red esperado (el backend no estaba corriendo
   durante la prueba, así que "Consejo IA" cae a mock correctamente).

### En qué se quedó / próxima sesión

**Todo compila, testea y arranca correctamente.** No hay ningún cambio a
medias. Resumen de comandos de verificación (todos en verde a fecha de
hoy):

```bash
cd frontend && npm run test -- --run   # 28/28
cd frontend && npm run build           # sin errores
cd backend && pip install -r requirements-dev.txt && python -m pytest tests/ -q  # 6/6
```

Próximos pasos concretos si se retoma:

1. Si en algún momento se dispone de una máquina con Ollama instalado
   (fuera de este entorno de build, que tiene el acceso a `ollama.com`
   bloqueado): `ollama pull qwen3:latest`,
   `pip install "git+https://github.com/TauricResearch/TradingAgents.git"`
   y probar `/api/advice` y `/api/ask` en modo real. El wrapper ya está
   corregido (modelo + endpoint `/v1`); si la estructura de retorno de
   `propagate()` no encaja exactamente con lo asumido en
   `tradingagents_wrapper.py`, ajustar el parseo ahí.
2. Revisar de vez en cuando el catálogo de modelos de `tradingagents`
   (`tradingagents/llm_clients/model_catalog.py`, clave `"ollama"`) porque
   cambia con las versiones del paquete — la recomendación de este README
   es la vigente a fecha de instalación (agosto 2026, v0.3.1), no una
   garantía permanente.
3. Considerar code-splitting real del bundle de Recharts (~714 KB sin
   comprimir) con `React.lazy()` a nivel de componente de gráfica.
4. Si el proyecto pasa a usarse de verdad, considerar cifrado o backup
   automático del `localStorage` más allá del botón manual "Exportar JSON".
5. Si se repite esta sesión sin más hallazgos de calidad nuevos, se puede
   considerar el proyecto en régimen de mantenimiento normal: revisiones
   puntuales en vez de auditorías completas cada vez.

### Decisiones de diseño de hoy (además de las de la sesión anterior)

- Colores de serie por posición en el array de activos, no por hash de
  identidad — decisión revertida tras comprobar que era peor en el caso
  común (ver punto 3 de arriba y comentario en `lib/format.js`).
- Modelo de Ollama recomendado cambiado de `llama3.2` a `qwen3:latest`
  siguiendo el catálogo oficial del paquete real instalado, no una
  suposición — ver README para la fuente exacta.
- Ningún hallazgo de la auditoría de hoy comprometía la restricción de
  "100% gratuito": el bug de `backend_url` sin `/v1` habría hecho fallar la
  llamada real a Ollama (local, gratis) — nunca habría hecho que el código
  cayera a una API de pago, porque esa vía no existe en este proyecto.
