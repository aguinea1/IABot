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

# `sqlite3.Connection` como gestor de contexto ("with con:") solo controla la
# transacción (commit/rollback), NO cierra la conexión — hay que cerrarla a
# mano. Bug encontrado en la revisión de calidad del 2026-08-06: cada llamada
# a `get_cached_advice`/`set_cached_advice` invocaba `_ensure_db()`, que abría
# una conexión SQLite adicional y nunca la cerraba explícitamente (fuga de
# descriptor de archivo bajo tráfico sostenido). Se corrige cerrándola
# siempre. No se cachea "ya inicializado" en una variable de módulo a propósito:
# `DB_PATH` puede cambiar en tests (via monkeypatch) para aislar cada test en
# su propio fichero temporal, y `CREATE TABLE IF NOT EXISTS` es barato.
def _ensure_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    try:
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
        con.commit()
    finally:
        con.close()


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
