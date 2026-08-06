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


# Tests de regresión para un bug encontrado en la revisión de calidad del
# 2026-08-07 (sesión de madrugada): `ask_free_question()` no usa el paquete
# `tradingagents` en absoluto (llama directamente al endpoint nativo de
# Ollama vía httpx), pero antes se decidía si intentar la llamada real o
# devolver el mock mirando `_tradingagents_available` (si el paquete se
# pudo importar) — así que con Ollama corriendo pero sin el paquete
# `tradingagents` instalado, se devolvía el mock igualmente aunque una
# respuesta real fuera posible. Ahora se intenta siempre la llamada real y
# solo se distingue "Ollama no alcanzable" (mock amigable) de "Ollama
# responde con un error" (mensaje de error real, para poder depurarlo).
def test_ask_free_question_ollama_no_alcanzable_da_mensaje_de_mock(monkeypatch):
    import httpx
    import app.tradingagents_wrapper as w

    def fake_post(*args, **kwargs):
        raise httpx.ConnectError("Connection refused")

    monkeypatch.setattr(httpx, "post", fake_post)
    respuesta = w.ask_free_question("AAPL", "¿riesgos?")
    assert respuesta.startswith("(mock)")
    assert "AAPL" in respuesta


def test_ask_free_question_error_real_de_ollama_no_se_oculta_como_mock(monkeypatch):
    import httpx
    import app.tradingagents_wrapper as w

    class FakeResponse:
        def raise_for_status(self):
            raise httpx.HTTPStatusError("modelo no encontrado", request=None, response=None)

    monkeypatch.setattr(httpx, "post", lambda *a, **k: FakeResponse())
    respuesta = w.ask_free_question("AAPL", "¿riesgos?")
    assert respuesta.startswith("(error consultando Ollama:")
    assert not respuesta.startswith("(mock)")


def test_ask_free_question_respuesta_real_si_ollama_contesta(monkeypatch):
    import httpx
    import app.tradingagents_wrapper as w

    class FakeResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {"response": "Riesgo moderado a corto plazo."}

    monkeypatch.setattr(httpx, "post", lambda *a, **k: FakeResponse())
    respuesta = w.ask_free_question("AAPL", "¿riesgos?")
    assert respuesta == "Riesgo moderado a corto plazo."
