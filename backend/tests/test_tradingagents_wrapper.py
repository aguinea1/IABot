"""Tests de regresión para tradingagents_wrapper.py — ver PROGRESS.md, sesión
2026-08-06 (revisión de calidad adicional)."""
import importlib
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def test_ollama_base_url_sin_barra_final_normalizado(monkeypatch):
    """Bug encontrado el 2026-08-06: si OLLAMA_BASE_URL se exporta con barra
    final (p.ej. 'http://localhost:11434/'), OLLAMA_OPENAI_COMPAT_URL quedaba
    bien formada gracias a su propio rstrip, pero cualquier código que usara
    OLLAMA_BASE_URL directamente (como ask_free_question) acababa con doble
    barra ('http://localhost:11434//api/generate'). Ahora se normaliza una
    sola vez al importar el módulo."""
    monkeypatch.setenv("OLLAMA_BASE_URL", "http://localhost:11434/")
    import app.tradingagents_wrapper as w

    importlib.reload(w)
    try:
        assert w.OLLAMA_BASE_URL == "http://localhost:11434"
        assert w.OLLAMA_OPENAI_COMPAT_URL == "http://localhost:11434/v1"
    finally:
        monkeypatch.delenv("OLLAMA_BASE_URL", raising=False)
        importlib.reload(w)  # deja el módulo con la config por defecto para otros tests


def test_ollama_base_url_por_defecto_sin_barra_final(monkeypatch):
    monkeypatch.delenv("OLLAMA_BASE_URL", raising=False)
    import app.tradingagents_wrapper as w

    importlib.reload(w)
    assert w.OLLAMA_BASE_URL == "http://localhost:11434"
    assert w.OLLAMA_OPENAI_COMPAT_URL == "http://localhost:11434/v1"
