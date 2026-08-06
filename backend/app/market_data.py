"""Datos de mercado gratuitos vía yfinance (Yahoo Finance). Sin API de pago."""
from __future__ import annotations


def get_last_price(ticker: str) -> dict:
    """Siempre devuelve un dict con forma uniforme: {ticker, encontrado, precio?,
    fecha?, error?}. Antes devolvía `None` cuando el ticker no tenía datos y un
    `dict` en cualquier otro caso (éxito o excepción, incluida la falta del
    propio paquete yfinance) — un contrato inconsistente detectado en la
    revisión de calidad del 2026-08-06 que habría obligado a cualquier
    consumidor a distinguir tres formas de respuesta distintas sin ninguna
    pista uniforme. Este endpoint no lo consume aún ningún componente del
    frontend; se deja el contrato correcto antes de que empiece a usarse.
    """
    try:
        import yfinance as yf

        t = yf.Ticker(ticker)
        hist = t.history(period="5d")
        if hist.empty:
            return {"ticker": ticker.upper(), "encontrado": False}
        last = hist.iloc[-1]
        return {
            "ticker": ticker.upper(),
            "encontrado": True,
            "precio": float(last["Close"]),
            "fecha": str(hist.index[-1].date()),
        }
    except Exception as e:
        return {"ticker": ticker.upper(), "encontrado": False, "error": str(e)}
