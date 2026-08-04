"""Backend FastAPI para el Consejo del analista IA (Fase 5).

100% gratuito: TradingAgents (Apache-2.0) + Ollama local. Nunca usa APIs de
pago como fallback — si no están disponibles, se responde con datos de
ejemplo claramente etiquetados como mock (ver tradingagents_wrapper.py).
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import cache, tradingagents_wrapper, market_data

app = FastAPI(title="IABot backend — Consejo del analista IA")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # uso local; ajustar si se expone fuera de localhost
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", **tradingagents_wrapper.tradingagents_status()}


@app.get("/api/advice")
def advice(ticker: str, category: str | None = None):
    cached = cache.get_cached_advice(ticker, category)
    if cached:
        cached["cache"] = True
        return cached
    result = tradingagents_wrapper.get_advice(ticker, category)
    if not result.get("mock"):
        cache.set_cached_advice(ticker, category, result)
    result["cache"] = False
    return result


class AskBody(BaseModel):
    ticker: str
    pregunta: str


@app.post("/api/ask")
def ask(body: AskBody):
    respuesta = tradingagents_wrapper.ask_free_question(body.ticker, body.pregunta)
    return {"ticker": body.ticker.upper(), "pregunta": body.pregunta, "respuesta": respuesta}


@app.get("/api/market-price")
def market_price(ticker: str):
    return market_data.get_last_price(ticker)
