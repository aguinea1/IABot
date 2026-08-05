"""Caché de respuestas del agente de IA por ticker+día en SQLite.
Evita volver a ejecutar TradingAgentsGraph.propagate (lento, típicamente
varios minutos con un modelo local en CPU) si ya se consultó ese ticker hoy.
"""
import sqlite3
import json
import os
from datetime import date
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "cache", "advice_cache.sqlite")


def _ensure_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with sqlite3.connect(DB_PATH) as con:
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS advice_cache (
                ticker TEXT NOT NULL,
                fecha TEXT NOT NULL,
                categoria TEXT NOT NULL DEFAULT '',
                payload TEXT NOT NULL,
                PRIMARY KEY (ticker, fecha, categoria)
            )
            """
        )


@contextmanager
def _conn():
    _ensure_db()
    con = sqlite3.connect(DB_PATH)
    try:
        yield con
    finally:
        con.close()


def get_cached_advice(ticker: str, categoria: str | None = None):
    hoy = date.today().isoformat()
    categoria = categoria or ""
    with _conn() as con:
        row = con.execute(
            "SELECT payload FROM advice_cache WHERE ticker = ? AND fecha = ? AND categoria = ?",
            (ticker.upper(), hoy, categoria),
        ).fetchone()
        if row:
            return json.loads(row[0])
    return None


def set_cached_advice(ticker: str, categoria: str, payload: dict):
    hoy = date.today().isoformat()
    categoria = categoria or ""
    with _conn() as con:
        con.execute(
            "INSERT OR REPLACE INTO advice_cache (ticker, fecha, categoria, payload) VALUES (?, ?, ?, ?)",
            (ticker.upper(), hoy, categoria, json.dumps(payload)),
        )
        con.commit()
