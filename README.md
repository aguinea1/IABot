# Diario de Inversiones (IABot)

Dashboard personal de inversiones. Nace como conversión de un artifact de
Claude.ai (`dashboard_inversiones.jsx`, que usaba `window.storage`, una API
que solo existe dentro de Claude.ai) a una aplicación web completa con
persistencia real, corrección de bugs de datos, métricas avanzadas, gráficas
interactivas, un rediseño visual de producto y una integración opcional con
un agente de IA de inversión 100% open source.

**Restricción de diseño no negociable: todo el proyecto es gratuito de
principio a fin.** Ningún componente requiere una tarjeta de crédito ni una
API de pago (ni Anthropic, ni OpenAI, ni Google, ni ninguna otra):

- **Frontend**: React + Vite + Recharts + lucide-react + Framer Motion. Corre
  en local con `npm run dev`.
- **Persistencia**: `localStorage` del navegador (no requiere backend ni base
  de datos para las Fases 0-4). El backend de la Fase 5 usa SQLite como caché
  de archivo, también gratuito.
- **Datos de mercado**: [yfinance](https://github.com/ranaroussi/yfinance)
  (Yahoo Finance), sin coste.
- **Agente de IA**: [TradingAgents](https://github.com/TauricResearch/TradingAgents)
  (TauricResearch, licencia Apache-2.0) configurado *siempre* con
  `llm_provider="ollama"`, apuntando a un modelo de pesos abiertos que corre
  en local con [Ollama](https://ollama.com). Nunca se usa una API de pago
  como opción ni como fallback.
- **Hosting**: todo pensado para correr en local (`localhost`).

---

## Cómo levantar el proyecto

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Comandos útiles:

```bash
npm run build       # build de producción a frontend/dist
npm run test        # tests unitarios (Vitest) del modelo de datos y métricas
```

El frontend funciona de forma completamente autónoma con `localStorage`, sin
necesidad de backend, salvo para la pestaña **"Consejo IA"** (Fase 5), que
intenta hablar con el backend y si no lo encuentra muestra una respuesta de
ejemplo (mock) claramente etiquetada como tal.

### Backend (Fase 5 — Consejo del analista IA)

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# TradingAgents no se distribuye de forma estable en PyPI para todas las
# versiones; instálalo desde el repo oficial:
pip install "git+https://github.com/TauricResearch/TradingAgents.git"

# Instala y arranca Ollama (ver sección "Modelo de IA" más abajo), luego:
uvicorn app.main:app --reload --port 8000
```

Para correr los tests (`backend/tests/`), instala además `requirements-dev.txt`
(añade `pytest`, no necesario para ejecutar el backend en sí):

```bash
pip install -r requirements-dev.txt
python -m pytest tests/ -q
```

El backend expone:

- `GET /api/health` — estado del backend y si TradingAgents está disponible.
- `GET /api/advice?ticker=AAPL&category=Acciones/ETFs` — decisión + resumen
  de razonamiento de TradingAgents, cacheado por ticker+día en SQLite
  (`backend/cache/advice_cache.sqlite`).
- `POST /api/ask` con `{"ticker": "AAPL", "pregunta": "..."}` — pregunta
  libre sobre un activo.
- `GET /api/market-price?ticker=AAPL` — último precio vía yfinance.

Si `tradingagents` u Ollama no están instalados/accesibles, todos estos
endpoints siguen funcionando pero devuelven una respuesta de ejemplo (`mock:
true`) para que el resto de la aplicación se pueda probar igualmente.

Variables de entorno opcionales:

- `IABOT_OLLAMA_MODEL` (por defecto `qwen3:latest`)
- `OLLAMA_BASE_URL` (por defecto `http://localhost:11434`; el backend añade
  automáticamente el sufijo `/v1` al hablar con TradingAgents, porque su
  cliente Ollama es compatible con la API de OpenAI y espera esa ruta — ver
  comentario en `backend/app/tradingagents_wrapper.py` para el detalle)
- En el frontend, `VITE_API_BASE` (por defecto `http://localhost:8000`)

---

## Modelo de IA: qué instalar y qué hardware hace falta

**Nota de entorno importante:** el contenedor donde se han construido las
sesiones de este proyecto (sesiones de build automatizadas en la nube) no
tiene GPU garantizada, y su acceso de red está restringido a una lista
blanca que **no incluye `ollama.com`** (confirmado: el script oficial de
instalación de Ollama devuelve `403` al descargarlo desde este entorno). Por
eso la Fase 5 se ha dejado **completa a nivel de código** (backend FastAPI,
endpoints, caché, frontend con la sección "Consejo del analista IA"
totalmente funcional) pero **sin poder instalar ni ejecutar Ollama en este
entorno**. Sí se pudo instalar el paquete `tradingagents` real desde GitHub
en una sesión de build (ver más abajo) para verificar que el wrapper llama a
su API correctamente, y se corrigió un bug de integración real gracias a
eso — pero la llamada final a un modelo Ollama en ejecución queda pendiente
de una máquina con Ollama instalado y accesible, indicado también en
`PROGRESS.md`.

Modelo recomendado: **`qwen3:latest`** (8B) vía Ollama.

```bash
ollama pull qwen3:latest
```

Por qué este modelo: se instaló el paquete `tradingagents` real (v0.3.1)
desde GitHub y se leyó directamente su catálogo de modelos
(`tradingagents/llm_clients/model_catalog.py`), que es la fuente de verdad
sobre qué modelos de Ollama soporta bien el proyecto en cada momento — una
recomendación fija en este README quedaría desactualizada en cuanto el
catálogo cambie. Hoy (agosto 2026) el catálogo sugiere tres modelos para el
proveedor `"ollama"`: `qwen3:latest` (8B), `gpt-oss:latest` (20B) y
`glm-4.7-flash:latest` (30B); se recomienda `qwen3:latest` por ser el más
ligero de los tres. TradingAgents necesita *tool-calling / function-calling*
para que sus agentes (analista fundamental, técnico, de sentimiento, gestor
de riesgo, etc.) puedan invocar herramientas de datos de mercado, así que no
vale cualquier modelo de Ollama — usa siempre uno de los tres del catálogo
oficial, o comprueba el catálogo actualizado si ha pasado tiempo desde esta
sesión (`python -c "from tradingagents.llm_clients.model_catalog import MODEL_OPTIONS; print(MODEL_OPTIONS['ollama'])"`
con el paquete instalado).

Requisitos de hardware orientativos (CPU, sin GPU):

| Modelo | RAM libre recomendada | Velocidad esperada en CPU |
|---|---|---|
| `qwen3:latest` (8B) | ~8-10 GB | Lento pero usable, hasta decenas de segundos por respuesta corta |
| `gpt-oss:latest` (20B) | ~16-20 GB | Considerablemente más lento, minutos por consulta compleja |
| `glm-4.7-flash:latest` (30B) | ~24-32 GB | Solo recomendable con GPU o mucha RAM/paciencia |

Con GPU (8 GB de VRAM o más) cualquiera de estos modelos corre notablemente
más rápido. TradingAgents ejecuta varios agentes en cadena por consulta
(`propagate`), así que una consulta completa puede tardar de segundos a
varios minutos dependiendo del hardware y del modelo — por eso el backend
cachea la respuesta por ticker+día (y, desde esta sesión, también por
categoría — ver "Bugs encontrados" más abajo).

---

## Bugs encontrados en Fase 0 y cómo se arreglaron

Se generaron datos de prueba sintéticos de 14 meses (`frontend/src/data/testData.js`)
que incluyen deliberadamente:

- El mismo fondo aportado en distintos meses con el nombre escrito de forma
  inconsistente: `"S&P 500"`, `"s&p500 "`, `"SP500"`, `"S&P500"`, `"  s&p 500  "`.
- Una cripto (Bitcoin) con participaciones fraccionarias.
- Un activo con un solo mes de datos (Tesla).
- Un activo con huecos: aparece, desaparece varios meses y reaparece (Cuenta
  remunerada).
- Un activo que llega a valer 0€ en un mes y luego se recompra parcialmente
  (Oro físico).
- Datos repartidos entre el año anterior y el actual.

**Bug principal — "el mismo fondo en un mes distinto se trata como una
inversión diferente":** causa raíz confirmada: no existía una identidad
estable de "activo"; las agregaciones anteriores comparaban directamente el
string del nombre tal y como lo escribía el usuario cada vez, así que
cualquier variación de mayúsculas/espacios/símbolos creaba una serie nueva.

**Solución implementada:**

1. Entidad `Asset` con `id` estable, nombre canónico de comparación
   (`canonicalKey`: trim + lowercase + solo alfanumérico) y nombre "bonito"
   para mostrar (`frontend/src/lib/normalize.js`, `frontend/src/lib/models.js`).
2. `findOrCreateAsset()` es el único punto de entrada para crear movimientos:
   busca por clave canónica antes de crear un asset nuevo, así que
   `"S&P 500"`, `"s&p500 "` y `"SP500"` terminan siendo el mismo `Asset`.
3. Autocompletado por similitud (distancia de Levenshtein sobre la clave
   canónica) al escribir un nombre parecido a uno ya existente, para animar a
   reusar el activo correcto en vez de crear uno nuevo por error.
4. Fusión manual de duplicados (`mergeAssets()`) para los casos que se
   hubiesen colado antes de tener esta normalización — el panel "Posibles
   activos duplicados" en el Resumen lo expone en la UI.
5. Todas las agregaciones (`frontend/src/lib/aggregations.js`) derivan
   siempre de `assetId`, nunca de comparar el string del nombre.

**Edge cases adicionales cubiertos y verificados con tests** (`frontend/src/lib/__tests__/`):

- Activo con un solo mes de datos: no rompe el cálculo de aportado/rendimiento.
- Activo con huecos en la serie: el total mensual de cartera usa
  *forward-fill* (mantiene el último valor conocido de ese activo) en vez de
  caer a 0€ en los meses sin movimiento registrado.
- Activo que llega a 0€: se distingue explícitamente de "sin dato" (`null`)
  para no confundir "vendido todo" con "no hay entrada este mes".
- Tras la fusión de duplicados, "Aportado" y "Rendimiento por revalorización"
  del activo fusionado siguen cuadrando (verificado con test exacto sobre el
  S&P 500 del dataset de prueba).

Ejecutar los tests: `cd frontend && npm run test` (24 tests, todos en verde
a fecha de esta sesión: 16 de la capa de datos/métricas + 5 de integración
de la app completa con React Testing Library + 3 de importación/exportación
de JSON).

---

## Fases del proyecto y estado

- **Fase 0** — Auditoría y testing automatizado: ✅ completa. Dataset de
  prueba + bug de duplicados corregido + tests automatizados.
- **Fase 1** — Modelo de datos (`Asset` + `Entry`): ✅ completa.
- **Fase 2** — Métricas avanzadas (CAGR, volatilidad, máximo drawdown, HHI de
  concentración, TWR aproximado por activo, proyección a 3 escenarios): ✅
  completa, con fórmula explicada en tooltip (icono ⓘ en cada KPI).
- **Fase 3** — Gráficas interactivas (evolución por activo con leyenda
  clicable, vista por tipo de activo, ranking de rentabilidad, heatmap
  mensual, zoom/brush temporal, tooltips enriquecidos, panel lateral de
  detalle al hacer click): ✅ completa.
- **Fase 4** — Rediseño visual (paleta "libro de contabilidad", tipografía
  serif de cabecera + monoespaciada para cifras, transiciones con Framer
  Motion, skeleton loaders, responsive mobile/tablet/desktop verificado con
  capturas): ✅ completa.
- **Fase 5** — Agente de IA (TradingAgents + Ollama vía FastAPI): ✅ completa
  a nivel de código y probada en modo mock; ⏳ pendiente de prueba end-to-end
  con Ollama real en una máquina con suficiente RAM/GPU (ver sección
  anterior y `PROGRESS.md`).
- **Fase 6** — Test final end-to-end: ✅ completa (ver más abajo).

### Verificación de la Fase 6 (end-to-end)

Se cargó el dataset de prueba de Fase 0 en la app terminada y se comprobó
mediante un navegador headless (Playwright):

- Ninguna gráfica queda vacía o rota con el dataset de prueba.
- "S&P 500" (con sus 5 variantes de nombre) aparece como una única serie
  continua en "Evolución por activo".
- Los 3 modos de "Vista por tipo de activo" (todo junto / fondos-ETFs /
  cripto) muestran subconjuntos coherentes y cada uno calcula su propio CAGR.
- La sección "Consejo IA" responde (en modo mock, ver limitación de entorno
  arriba) sin romper el resto de la aplicación.
- Layout responsive verificado en viewport móvil (390×844) y desktop
  (1280×900) sin overflow ni elementos cortados.

---

## Decisiones de diseño relevantes

- **Persistencia**: se eligió `localStorage` como base mínima (cumple el
  requisito "persistencia real" sin depender de un backend). El backend de
  la Fase 5 es aparte y solo se usa para el agente de IA; no gestiona la
  cartera del usuario.
- **Modo de entrada de datos**: cada `Entry` admite "valor directo" o
  "participaciones + precio" — este segundo modo es necesario para activos
  como cripto, donde interesa registrar la cantidad de unidades, no solo el
  valor final.
- **Heatmap mensual**: se usa la pareja diverging azul↔rojo con punto medio
  gris en vez de verde/rojo literal, siguiendo la guía de accesibilidad de
  paletas de datos (verde/rojo es la combinación menos distinguible para el
  tipo de daltonismo más común). El signo +/- se mantiene siempre visible en
  el propio texto de cada celda, no solo en el color.
- **Colores por categoría/activo**: se asignan por índice fijo (identidad de
  la entidad), nunca por posición/orden dinámico, para que un mismo activo
  mantenga siempre el mismo color aunque cambie el orden de la lista.
- **TWR por activo**: se usa una aproximación simplificada
  (`(valor actual - aportado acumulado) / aportado acumulado`) en vez de un
  Time-Weighted Return estricto con múltiples subperíodos, documentado en el
  tooltip de la métrica. Es una simplificación razonable dado que no se
  registra el timing exacto intramensual de cada aportación.

## Pasada de pulido adicional (misma sesión, tras completar el PRD)

Con tiempo de sesión de sobra tras terminar las 7 fases, se hizo una ronda
extra de robustez:

- **Paleta validada formalmente**: se ejecutó el validador de accesibilidad
  de paletas de datos (`validate_palette.js`) sobre los 8 colores
  categóricos usados en las gráficas — pasa todos los checks duros
  (banda de luminosidad, suelo de croma, separación CVD, suelo de visión
  normal); el único WARN (contraste de 3 colores por debajo de 3:1 sobre el
  fondo claro) está mitigado como exige la norma: la leyenda siempre muestra
  el nombre del activo en texto, nunca solo el color.
- **Importar JSON**: además de "Exportar JSON" ya existente, se añadió
  "Importar JSON" para restaurar un backup completo (`frontend/src/lib/storage.js`,
  función `parseImportedState`, con validación básica de forma y mensajes de
  error visibles en la UI si el archivo no es válido).
- **Accesibilidad de teclado**: la leyenda de "Evolución por activo" ahora
  son botones reales (`aria-pressed`, `aria-label`) en vez de `div`s con
  `onClick`; el panel lateral de detalle es un `role="dialog"`, recibe el
  foco al abrirse y se cierra con la tecla Escape.
- **24 tests en verde** (antes 16): se añadieron tests de integración de la
  app completa con React Testing Library (`frontend/src/__tests__/App.test.jsx`)
  que cargan el dataset de Fase 0 dentro de la aplicación real y comprueban
  que el fix del bug de duplicados también se sostiene a nivel de UI
  (no solo a nivel de lógica de datos), y tests de importar/exportar JSON.
- Se detectó y corrigió un bug de timing de `ResponsiveContainer` de
  Recharts (algunas gráficas podían tardar en pintarse del todo en el primer
  render) y un bug real introducido al probar `manualChunks` de Rollup para
  reducir el tamaño del bundle (chunks circulares rompían React en runtime)
  — revertido a un bundle único, estable aunque algo más pesado (~710 KB sin
  comprimir, ~208 KB gzip).

## Revisión de calidad adicional (segunda sesión de build)

Con el PRD ya completo desde la primera sesión, esta sesión se dedicó
íntegramente a una auditoría de calidad/bugs del código existente (sin
añadir features nuevas del PRD) y a intentar validar la Fase 5 contra el
paquete `tradingagents` real. Hallazgos y correcciones:

- **Bug de caché por categoría** (`backend/app/cache.py`): la clave de la
  caché SQLite era solo `(ticker, fecha)`, así que consultar el mismo ticker
  con dos categorías distintas el mismo día devolvía siempre el payload de
  la primera categoría. Corregido incluyendo `categoria` en la clave
  primaria; con test de regresión (`backend/tests/test_cache.py`).
- **Bug de integración real con TradingAgents, confirmado instalando el
  paquete**: se instaló `tradingagents` (v0.3.1) desde GitHub en esta sesión
  de build (sí fue posible; lo que no fue posible fue instalar y ejecutar
  Ollama, bloqueado por la lista blanca de red del entorno — ver sección
  anterior) y se comprobó contra su código real que (a) su catálogo de
  modelos recomendados para Ollama ya no incluye `llama3.2` (ver sección de
  arriba) y (b) su cliente Ollama exige que `backend_url` incluya el sufijo
  `/v1` (API compatible con OpenAI), algo que el wrapper no hacía y que
  habría roto la llamada real en cuanto alguien probara la Fase 5 con Ollama
  instalado. Ambos corregidos en `backend/app/tradingagents_wrapper.py`.
  Verificado también que, sin Ollama corriendo, `get_advice()` cae al mock
  de forma controlada (excepción capturada, no un error 500).
- **Categorías inconsistentes en "Consejo IA"**: el selector de categoría de
  `AsesorIA.jsx` tenía una lista de categorías hardcodeada que omitía
  "Cuenta remunerada", distinta de la lista real en `lib/models.js`.
  Corregido para importar la lista única desde `models.js`.
- **Fugas de estado tras desmontar**: `pedirConsejo`/`enviarPregunta` en
  `AsesorIA.jsx` no cancelaban su `fetch` si el usuario cambiaba de pestaña
  antes de que respondiera. Añadido `AbortController` y guardas de montaje.
- **Fusión de duplicados incompleta**: el botón "Fusionar en..." de
  `DuplicadosPanel.jsx` solo fusionaba los dos primeros activos de un grupo,
  aunque hubiera 3 o más duplicados. Corregido para fusionar el grupo
  completo en un solo click.
- **`cagr()` podía devolver `NaN`** con un valor final negativo (caso límite
  poco realista pero posible con datos manuales). Añadido guard defensivo,
  con test.
- Accesibilidad de teclado en las pestañas de navegación (`App.jsx`,
  `VistaPorTipo.jsx`, ahora `<button role="tab">` en vez de `<div onClick>`)
  y en el icono de fórmula de `KpiCard.jsx` (ahora focuseable, tooltip
  también por foco/blur).
- Limpieza de imports sin usar detectada con `oxlint` (sin efecto funcional).
- **25 tests en verde en frontend** (antes 24) y **6 en backend** (antes 4,
  ahora con `tradingagents` real instalado en el entorno de build — los
  tests siguen pasando también sin él instalado, por diseño).
- Se evaluó también colorear las series de "Evolución por activo" por hash
  estable de `asset.id` en vez de por posición en el array (para que una
  fusión de duplicados no desplazara los colores de activos posteriores),
  pero se descartó tras comprobar visualmente que con pocos activos (caso
  normal) un hash produce colisiones de color mucho más frecuentes que el
  caso raro que se quería arreglar. Se documentó la decisión en
  `frontend/src/lib/format.js` en vez de dejarlo como TODO implícito.

## Revisión de calidad adicional (tercera sesión de build, 2026-08-06)

El proyecto ya estaba completo (PRD 0-6) al arrancar esta sesión, así que de
nuevo se dedicó íntegramente a auditoría de calidad — dos rondas con un
agente de exploración fresco sobre archivos que aún no habían recibido una
revisión tan a fondo, seguidas de verificación manual y tests de regresión
para cada hallazgo real. No se ha tocado ninguna fase del PRD ni la
restricción "100% gratuito". Hallazgos y correcciones:

- **`npm run lint` no funcionaba en un checkout limpio**: `oxlint` estaba
  referenciado en el script `lint` de `package.json` pero nunca se había
  declarado como `devDependency` — cualquiera que clonara el repo y
  ejecutara `npm install && npm run lint` se encontraba con `oxlint: not
  found`. Las dos sesiones anteriores habían corrido `oxlint` con el binario
  ya presente en su propio entorno de build sin darse cuenta de que no
  estaba en el lockfile. Corregido añadiéndolo a `devDependencies` (queda un
  único warning cosmético preexistente en `normalize.js`, ya documentado).
- **Fuga de conexión SQLite en cada petición** (`backend/app/cache.py`):
  `sqlite3.Connection` como gestor de contexto (`with con:`) solo controla la
  transacción (commit/rollback), **no cierra la conexión** — `_ensure_db()`
  abría una conexión nueva en cada llamada a `get_cached_advice`/
  `set_cached_advice` (es decir, en cada petición a `/api/advice`) y nunca la
  cerraba explícitamente. Corregido cerrándola siempre con `try/finally`.
- **Robo de foco (focus-stealing) real en el panel de detalle**
  (`PanelDetalleActivo.jsx`): el `useEffect` que enfoca el botón de cerrar al
  abrir el panel dependía de `[assetId, onClose]`, pero `onClose` se pasa
  desde `App.jsx` como arrow function inline, así que cambia de identidad en
  cada render de `App`. Cualquier re-render mientras el panel estaba abierto
  (cambiar de pestaña, añadir una entrada...) volvía a disparar el efecto y
  robaba el foco de vuelta al botón de cerrar, aunque el usuario estuviera
  escribiendo en otro campo. Corregido guardando `onClose` en un `ref` y
  dejando el efecto dependiente solo de `assetId`. Con test de regresión en
  `frontend/src/__tests__/components.test.jsx`.
- **Comparador de `sort` inconsistente para entradas del mismo mes** (tres
  sitios: `lib/aggregations.js` ×2, `PanelDetalleActivo.jsx`,
  `TablaEntradas.jsx`): el patrón `(a, b) => (a.mes < b.mes ? -1 : 1)` nunca
  devuelve `0`, violando el contrato de comparador de `Array.prototype.sort`.
  Si un usuario introduce dos `Entry` para el mismo activo en el mismo mes
  (no hay UI de edición, solo alta/baja, así que corregir un valor implica
  añadir una entrada nueva), el orden resultante no estaba garantizado como
  "la última añadida gana"; el valor actual por activo, el desglose por
  categoría y el historial del panel de detalle podían mostrar el valor de
  la entrada equivocada de forma no determinista. Corregido con un
  comparador de 3 vías en los cuatro sitios. Con test de regresión en
  `frontend/src/lib/__tests__/aggregations.test.js`.
- **Categorías "fantasma" con valor 0€** (`desgloseCategoria` en
  `lib/aggregations.js`): un activo sin ninguna `Entry` (huérfano tras borrar
  todas sus entradas) aportaba igualmente su categoría al desglose con
  `valor: 0`. Corregido para omitir del desglose los activos sin ninguna
  entrada. Con test de regresión.
- **Colisión crítica de identidad en `canonicalKey`** (`lib/normalize.js`):
  la limpieza `.replace(/[^a-z0-9]+/g, '')` descartaba cualquier carácter no
  ASCII, así que un nombre de activo compuesto solo por caracteres no
  latinos (p. ej. "日経225" o "恒生指数") colapsaba a la clave canónica
  vacía `''`. Dos activos así de nombres totalmente distintos se fusionaban
  silenciosamente al compartir la misma clave vacía — el bug inverso al que
  esta función pretendía arreglar en la Fase 0. Corregido usando
  `\p{L}\p{N}` con el flag `u` (conserva letras/números de cualquier
  alfabeto) y con un *fallback* al nombre recortado/en minúsculas si tras la
  limpieza no queda ningún carácter alfanumérico reconocido (nombres de solo
  símbolos/emoji). Con tests de regresión en
  `frontend/src/lib/__tests__/models.test.js`.
- **Condición de carrera sin cancelación en el chat de "Consejo IA"**
  (`AsesorIA.jsx`, función `enviarPregunta`): a diferencia de `pedirConsejo`
  (que sí cancela la petición anterior con `AbortController`),
  `enviarPregunta` creaba un controller local que nunca se guardaba en
  ningún `ref` ni se abortaba en la siguiente llamada. Si el usuario enviaba
  dos preguntas seguidas rápido, ambas quedaban en vuelo sin cancelarse
  mutuamente, y si la segunda respuesta llegaba antes que la primera el chat
  mostraba las respuestas en el orden equivocado; además, al desmontar el
  componente esa petición quedaba huérfana en segundo plano. Corregido con
  un `ref` propio (`askAbortRef`, independiente del de `pedirConsejo` porque
  son peticiones no relacionadas) que aborta la petición anterior y también
  se aborta al desmontar.
- **Porcentajes incorrectos en el donut si hay una categoría con valor
  negativo** (`DonutCategoria.jsx`): el total usado para calcular el % de
  cada categoría en el tooltip se calculaba sobre los datos ya filtrados
  (categorías con `valor > 0`), así que si existía una categoría con valor
  agregado negativo (p. ej. el último valor registrado de un activo es
  negativo), los porcentajes de las categorías restantes sumaban más del
  100%. Corregido calculando el total sobre el desglose completo sin
  filtrar, y añadiendo un aviso visible si hay categorías negativas no
  representadas en la tarta.
- **Mes por defecto del formulario en UTC en vez de hora local**
  (`FormularioEntrada.jsx`): `new Date().toISOString().slice(0, 7)` da el
  año-mes en UTC; cerca de medianoche local, un usuario en huso horario
  negativo podía ver precargado el mes siguiente al real (y uno en huso
  positivo, cerca de fin de mes, el mes anterior). Corregido construyendo el
  string `YYYY-MM` a partir de los componentes locales de `Date`.
- **URL con doble barra si `OLLAMA_BASE_URL` termina en `/`**
  (`tradingagents_wrapper.py`): `OLLAMA_OPENAI_COMPAT_URL` sí normalizaba con
  `.rstrip("/")`, pero `ask_free_question()` usaba `OLLAMA_BASE_URL` "a
  pelo" para construir la URL del endpoint nativo de Ollama, dando
  `http://localhost:11434//api/generate` si alguien exportaba la variable
  con barra final. Corregido normalizando `OLLAMA_BASE_URL` una sola vez al
  importar el módulo. Con test de regresión en
  `backend/tests/test_tradingagents_wrapper.py`.
- **Contrato de retorno inconsistente en `get_last_price`**
  (`market_data.py`): devolvía `None` sin datos, un `dict` normal si había
  éxito, y un `dict` con clave `"error"` en cualquier otra excepción — tres
  formas de respuesta distintas sin ninguna pista uniforme para el
  consumidor. (Nota: este endpoint, `/api/market-price`, no lo consume
  todavía ningún componente del frontend). Corregido para devolver siempre
  un `dict` con la forma `{ticker, encontrado, precio?, fecha?, error?}`.
- Verificación final: **33 tests en verde en frontend** (antes 28, +5 de
  regresión) y **8 en backend** (antes 6, +2). `npm run build`, `npm run
  lint` y `pytest` en verde. Smoke test manual con Playwright headless
  contra `vite preview` con el dataset de ejemplo cargado, navegando las 4
  pestañas y abriendo el panel de detalle: sin errores de consola nuevos
  (el único error de red es el intento esperado de conectar con el backend
  de IA, que no estaba corriendo durante la prueba).

## Revisión de calidad adicional (cuarta sesión de build, 2026-08-07, madrugada)

El proyecto seguía completo (PRD 0-6) al arrancar, con las tres sesiones
anteriores ya sin hallazgos que comprometieran la funcionalidad core. Siguiendo
la recomendación explícita que la propia sesión anterior dejó en
`PROGRESS.md` ("si se repite sin más hallazgos, pasar a régimen de
mantenimiento normal"), esta sesión hizo **una única ronda ligera y
selectiva** (no dos rondas de auditoría exhaustiva como las tres sesiones
previas) con un agente de exploración, centrada en archivos backend y de
frontend que aún no habían recibido tanta atención (`RankingChart.jsx`,
`HeatmapMensual.jsx`, `VistaPorTipo.jsx`, `KpiCard.jsx`, `Skeleton.jsx`) más
una relectura manual de `main.py`/`cache.py`. Hallazgos reales:

- **Accesibilidad: labels sin asociar en el formulario principal**
  (`FormularioEntrada.jsx`): a diferencia de `AsesorIA.jsx` (corregido el
  2026-08-05), los 8 campos del formulario de "Añadir movimiento" —el más
  usado de la app— tenían `<label>` como hermano del `<input>`/`<select>`
  en vez de asociado vía `htmlFor`/`id`, así que un lector de pantalla no
  anunciaba el nombre del campo al enfocarlo. Corregido añadiendo
  `id`/`htmlFor` a los 8 pares. De paso se añadió `aria-label` al campo de
  filtro de `TablaEntradas.jsx`, que tenía el mismo problema (solo
  `placeholder`, sin label accesible). Con test de regresión en
  `frontend/src/__tests__/components.test.jsx`.
- **`RankingChart.jsx` ocultaba en silencio activos con aportación neta
  <= 0**: el filtro `.filter((p) => p.aportado > 0)` descartaba cualquier
  activo cuya aportación acumulada fuera 0 o negativa (p. ej. una retirada
  parcial superior a lo aportado ese mes), aunque siguiera teniendo valor de
  mercado real — inconsistente con `PanelDetalleActivo.jsx`, que muestra el
  mismo activo sin problema usando el mismo `porActivo()`. Corregido
  filtrando solo los activos realmente sin datos (`aportado === 0 &&
  valorActual === 0`).
- **`RankingChart.jsx` usaba el nombre del activo como `key` de React** en
  vez de `assetId` (que ya estaba disponible en los mismos datos): dos
  activos con el mismo nombre normalizado que el usuario decide no fusionar
  (`DuplicadosPanel` solo lo sugiere, la fusión es opcional) colisionarían
  en la `key`, arriesgando que React reutilizara/desincronizara el color o
  la posición de la barra equivocada entre re-renders. El resto de la app
  (`EvolucionChart.jsx`) ya usa `asset.id` como key precisamente por este
  motivo. Corregido usando `assetId`.
  - Con los dos bugs de `RankingChart.jsx` de por medio, se aprovechó para
    extraer la lógica de datos del componente (filtrado + orden + mapeo) a
    una función pura nueva, `rankingActivos()` en
    `frontend/src/lib/aggregations.js`, siguiendo el mismo patrón que
    `porActivo()`/`desgloseCategoria()`: así se puede testear con datos
    puros sin depender del renderizado de Recharts en jsdom (que requiere
    simular `getBoundingClientRect()`, nada trivial). Con 3 tests de
    regresión en `frontend/src/lib/__tests__/aggregations.test.js`.
- No se encontró ningún hallazgo de confianza alta en `backend/app/`
  (`cache.py`, `main.py`, `market_data.py`, `tradingagents_wrapper.py`) ni
  en `HeatmapMensual.jsx`, `VistaPorTipo.jsx`, `KpiCard.jsx`, `Skeleton.jsx`,
  `aggregations.js`/`metrics.js` (solo un caso marginal de baja confianza en
  `hhi()` con categorías de valor negativo, descartado por no darse en la
  práctica con los tipos de activo soportados — ver comentario en el propio
  código de `metrics.js` si se quiere revisar en el futuro).
- Se intentó de nuevo `curl https://ollama.com/install.sh`: sigue devolviendo
  `403` (lista blanca de red de este contenedor), como en las tres sesiones
  anteriores. Sin cambios respecto a esa limitación documentada.
- **Cobertura de tests ampliada** para tres componentes que hasta ahora solo
  se ejercitaban de forma indirecta a través de `App.test.jsx`
  (`HeatmapMensual.jsx`, `KpiCard.jsx`, `VistaPorTipo.jsx`): no son
  regresiones de bugs concretos, sino tests de comportamiento base
  (`frontend/src/__tests__/components_extra.test.jsx`, 5 tests) para que
  futuras sesiones detecten roturas antes en estos componentes.
- **Smoke test manual con Playwright headless** contra `vite preview`
  (build de producción): dataset de ejemplo cargado, las 4 pestañas
  navegadas, capturas en escritorio (1280×900) y móvil (390×844) — sin
  errores de consola inesperados (el único error de red es el intento
  esperado de conectar con el backend de IA, que no estaba corriendo). El
  script de la prueba fue una herramienta ad-hoc de esta sesión, no se
  incorpora al repo como dependencia permanente (Playwright no está en
  `devDependencies`; se instaló temporalmente solo para esta verificación).
- Verificación final: **42 tests en verde en frontend** (antes 33: +4 de
  regresión de bugs + 5 de cobertura nueva) y **8 en backend** (sin
  cambios, no se tocó nada de backend). `npm run build` y `npm run lint`
  en verde (mismo único warning cosmético preexistente de `normalize.js`).

## Pendiente / próximos pasos sugeridos

- Probar la Fase 5 end-to-end con Ollama real instalado (`ollama pull
  qwen3:latest`) y el paquete `tradingagents` instalado desde git — el
  wrapper ya está corregido para el endpoint `/v1` y el modelo recomendado
  actual, pero la llamada de inferencia real sigue sin probarse porque este
  entorno de build no puede instalar Ollama (ver nota de entorno arriba;
  confirmado de nuevo el 2026-08-06, `ollama.com` sigue devolviendo timeout
  de red en este contenedor).
- Si se usa en un dispositivo compartido, considerar cifrado o exportación
  periódica del `localStorage` (ya existe el botón "Exportar JSON").
- Ampliar el detalle por analista del endpoint `/api/advice` parseando el
  estado intermedio de `TradingAgentsGraph.propagate()` en vez de solo la
  decisión final, si se necesita más granularidad en el resumen de cada
  analista.
- Considerar code-splitting real del bundle de Recharts (~714 KB sin
  comprimir, ~208 KB gzip) con `React.lazy()` a nivel de componente de
  gráfica (evaluado en esta sesión pero no aplicado: el riesgo de introducir
  un bug de Suspense/timing en una sesión desatendida no compensaba el
  beneficio marginal de un bundle que ya funciona bien en local).
- Si se repite esta sesión sin más hallazgos de calidad nuevos, se puede
  considerar el proyecto en régimen de mantenimiento normal: revisiones
  puntuales en vez de auditorías completas cada vez.
