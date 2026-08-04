"""Datos de mercado gratuitos vía yfinance (Yahoo Finance). Sin API de pago."""
from __future__ import annotations


def get_last_price(ticker: str) -> dict | None:
    try:
        import yfinance as yf

        t = yf.Ticker(ticker)
        hist = t.history(period="5d")
        if hist.empty:
            return None
        last = hist.iloc[-1]
        return {
            "ticker": ticker.upper(),
            "precio": float(last["Close"]),
            "fecha": str(hist.index[-1].date()),
        }
    except Exception as e:
        return {"ticker": ticker.upper(), "error": str(e)}
