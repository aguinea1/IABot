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

- `IABOT_OLLAMA_MODEL` (por defecto `llama3.2`)
- `OLLAMA_BASE_URL` (por defecto `http://localhost:11434`)
- En el frontend, `VITE_API_BASE` (por defecto `http://localhost:8000`)

---

## Modelo de IA: qué instalar y qué hardware hace falta

**Nota de entorno importante:** el contenedor donde se ha construido este
proyecto (sesiones de build automatizadas en la nube) no tiene GPU
garantizada ni Ollama instalado. Por eso la Fase 5 se ha dejado
**completa a nivel de código** (backend FastAPI, endpoints, caché, frontend
con la sección "Consejo del analista IA" totalmente funcional) pero
**probada solo en modo mock**. Queda pendiente de una prueba end-to-end real
en una máquina con Ollama, indicado también en `PROGRESS.md`.

Modelo recomendado: **`llama3.2`** (3B) vía Ollama.

```bash
ollama pull llama3.2
```

Por qué este modelo: en la integración de TradingAgents con Ollama, no todos
los modelos sirven — TradingAgents necesita *tool-calling / function-calling*
para que sus agentes (analista fundamental, técnico, de sentimiento, gestor
de riesgo, etc.) puedan invocar herramientas de datos de mercado. `llama3`
(la versión original) **no** soporta tool-calling y falla; `llama3.2` sí está
confirmado como compatible. Alternativas si tienes más RAM disponible y
quieres más calidad de razonamiento:

- `qwen2.5:7b` — más capaz, requiere más RAM (~8 GB libres recomendados).
- `mistral-nemo` — alternativa intermedia.

Requisitos de hardware orientativos (CPU, sin GPU):

| Modelo | RAM libre recomendada | Velocidad esperada en CPU |
|---|---|---|
| `llama3.2` (3B) | ~4-6 GB | Aceptable, segundos por respuesta corta |
| `qwen2.5:7b` | ~8-10 GB | Más lento, decenas de segundos por consulta compleja |

Con GPU (incluso una de gama media con 8 GB de VRAM) cualquiera de estos
modelos corre notablemente más rápido. TradingAgents ejecuta varios agentes
en cadena por consulta (`propagate`), así que una consulta completa puede
tardar de segundos a un par de minutos dependiendo del hardware y del
modelo — por eso el backend cachea la respuesta por ticker+día.

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

## Pendiente / próximos pasos sugeridos

- Probar la Fase 5 end-to-end con Ollama real instalado (`ollama pull
  llama3.2`) y el paquete `tradingagents` instalado desde git.
- Si se usa en un dispositivo compartido, considerar cifrado o exportación
  periódica del `localStorage` (ya existe el botón "Exportar JSON").
- Ampliar el detalle por analista del endpoint `/api/advice` parseando el
  estado intermedio de `TradingAgentsGraph.propagate()` en vez de solo la
  decisión final, si se necesita más granularidad en el resumen de cada
  analista.
