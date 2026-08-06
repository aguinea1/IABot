"""Envoltorio sobre TradingAgents (TauricResearch, Apache-2.0,
github.com/TauricResearch/TradingAgents), configurado siempre con
llm_provider="ollama" — nunca con una API de pago.

Modelo recomendado: confirmado instalando el paquete real `tradingagents`
(v0.3.1, agosto 2026) y leyendo su catálogo de modelos
(`tradingagents/llm_clients/model_catalog.py`, clave "ollama"): los modelos
que el propio proyecto sugiere hoy para Ollama son "qwen3:latest" (8B),
"gpt-oss:latest" (20B) y "glm-4.7-flash:latest" (30B) — la recomendación de
"llama3.2" de una versión anterior de este README ya no aparece en el
catálogo del paquete instalado y se ha corregido. Se usa "qwen3:latest" (8B)
como valor por defecto porque es el más ligero de los tres. Ver README para
requisitos de hardware exactos y alternativas.

Detalle importante de integración descubierto al instalar el paquete real:
el cliente Ollama de TradingAgents es compatible con la API de OpenAI y
espera el `base_url` con el sufijo "/v1" (p.ej. "http://localhost:11434/v1"),
no la raíz "http://localhost:11434" que expone Ollama de forma nativa. Por
eso aquí se añade "/v1" al construir `config["backend_url"]` para el grafo,
mientras que `ask_free_question()` sí usa la raíz sin "/v1" porque llama
directamente al endpoint nativo /api/generate de Ollama, que es distinto.

Esta capa NUNCA cae a una API de pago como fallback. Si TradingAgents u
Ollama no están disponibles en el entorno, se devuelve una respuesta de
ejemplo (mock) claramente etiquetada como tal, para que el resto de la app
(frontend, endpoints) se pueda probar igualmente.
"""
from __future__ import annotations
import os
from datetime import date

OLLAMA_MODEL = os.environ.get("IABOT_OLLAMA_MODEL", "qwen3:latest")
# Normalizado una sola vez aquí (sin barra final): bug encontrado en la
# revisión de calidad del 2026-08-06: si alguien exporta OLLAMA_BASE_URL con
# barra final (p.ej. "http://localhost:11434/"), OLLAMA_OPENAI_COMPAT_URL
# quedaba bien formada por su propio .rstrip(), pero ask_free_question()
# construía la URL nativa con doble barra ("http://localhost:11434//api/generate"),
# lo que puede fallar según cómo Ollama normalice la ruta. Se corrige
# aplicando rstrip aquí, una sola vez, en vez de en cada uso.
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
# Endpoint OpenAI-compatible que espera el cliente "ollama" de TradingAgents
# (ver nota arriba) — distinto de OLLAMA_BASE_URL "a pelo", que se usa para
# el endpoint nativo de Ollama en ask_free_question().
OLLAMA_OPENAI_COMPAT_URL = OLLAMA_BASE_URL + "/v1"

_tradingagents_available = False
try:
    # Import perezoso: solo si el paquete está instalado. No se instala por
    # requirements.txt porque su empaquetado en PyPI no es estable en todas
    # las versiones — ver README para instrucciones de instalación desde git.
    from tradingagents.graph.trading_graph import TradingAgentsGraph  # type: ignore
    from tradingagents.default_config import DEFAULT_CONFIG  # type: ignore

    _tradingagents_available = True
except Exception:
    _tradingagents_available = False


def tradingagents_status() -> dict:
    return {
        "tradingagents_instalado": _tradingagents_available,
        "modelo_ollama": OLLAMA_MODEL,
        "ollama_base_url": OLLAMA_BASE_URL,
        "ollama_openai_compat_url": OLLAMA_OPENAI_COMPAT_URL,
        "modo": "real" if _tradingagents_available else "mock",
    }


def _mock_response(ticker: str, categoria: str | None) -> dict:
    return {
        "ticker": ticker.upper(),
        "categoria": categoria,
        "decision": "MANTENER",
        "fecha": date.today().isoformat(),
        "resumen": (
            "Respuesta de EJEMPLO (mock). TradingAgents/Ollama no está disponible en este "
            "entorno de ejecución (sin GPU garantizada). Instala Ollama + 'ollama pull "
            f"{OLLAMA_MODEL}' y el paquete tradingagents para obtener análisis real. "
            "Ver README, sección 'Fase 5'."
        ),
        "analistas": [
            {"nombre": "Analista fundamental", "resumen": "Ejemplo: métricas de valoración dentro de rango histórico razonable."},
            {"nombre": "Analista técnico", "resumen": "Ejemplo: sin señal clara de ruptura de tendencia en el corto plazo."},
            {"nombre": "Analista de sentimiento", "resumen": "Ejemplo: sentimiento de mercado y noticias neutro."},
            {"nombre": "Gestor de riesgo", "resumen": "Ejemplo: exposición dentro de límites razonables para este tipo de activo."},
        ],
        "mock": True,
    }


def get_advice(ticker: str, categoria: str | None = None) -> dict:
    if not _tradingagents_available:
        return _mock_response(ticker, categoria)

    try:
        config = DEFAULT_CONFIG.copy()
        config["llm_provider"] = "ollama"
        config["backend_url"] = OLLAMA_OPENAI_COMPAT_URL
        config["deep_think_llm"] = OLLAMA_MODEL
        config["quick_think_llm"] = OLLAMA_MODEL

        graph = TradingAgentsGraph(debug=False, config=config)
        _, decision = graph.propagate(ticker.upper(), date.today().isoformat())

        return {
            "ticker": ticker.upper(),
            "categoria": categoria,
            "decision": str(decision).upper() if decision else "SIN DATOS",
            "fecha": date.today().isoformat(),
            "resumen": "Análisis generado por TradingAgents con modelo local de Ollama.",
            "analistas": [],  # TradingAgents expone el detalle en graph.propagate(); se puede
                                 # enriquecer aquí parseando el estado intermedio si se necesita
                                 # más granularidad por analista.
            "mock": False,
        }
    except Exception as e:
        resp = _mock_response(ticker, categoria)
        resp["error"] = f"Fallo ejecutando TradingAgents: {e}"
        return resp


def ask_free_question(ticker: str, pregunta: str) -> str:
    if not _tradingagents_available:
        return (
            f"(mock) No hay backend de TradingAgents/Ollama disponible en este entorno. "
            f"Con Ollama corriendo y el modelo '{OLLAMA_MODEL}' instalado, aquí verías una "
            f"respuesta real generada localmente sobre tu pregunta para {ticker}: \"{pregunta}\"."
        )
    try:
        import httpx

        prompt = (
            f"Eres un analista de inversiones. Sobre el activo {ticker}, responde de forma "
            f"breve y en español a esta pregunta, dejando claro que es una opinión generada "
            f"por IA y no asesoramiento financiero real: {pregunta}"
        )
        r = httpx.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
            timeout=120,
        )
        r.raise_for_status()
        return r.json().get("response", "(sin respuesta del modelo)")
    except Exception as e:
        return f"(error consultando Ollama: {e})"
