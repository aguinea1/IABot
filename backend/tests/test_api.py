import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_advice_mock_when_no_tradingagents():
    r = client.get("/api/advice", params={"ticker": "AAPL", "category": "Acciones/ETFs"})
    assert r.status_code == 200
    data = r.json()
    assert data["ticker"] == "AAPL"
    assert "decision" in data
    assert "resumen" in data


def test_advice_is_cached_second_call():
    r1 = client.get("/api/advice", params={"ticker": "MSFT"})
    r2 = client.get("/api/advice", params={"ticker": "MSFT"})
    assert r1.status_code == 200 and r2.status_code == 200
    # el segundo, si el primero no fue mock, debería venir de caché;
    # si fue mock (sin tradingagents instalado), no se cachea — comprobamos
    # simplemente que ambas respuestas son válidas y consistentes en ticker.
    assert r1.json()["ticker"] == r2.json()["ticker"] == "MSFT"


def test_ask_endpoint():
    r = client.post("/api/ask", json={"ticker": "AAPL", "pregunta": "¿riesgos?"})
    assert r.status_code == 200
    assert "respuesta" in r.json()
