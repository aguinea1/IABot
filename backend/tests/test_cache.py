import sys
import os
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import app.cache as cache_module


def test_cache_is_keyed_by_ticker_fecha_y_categoria(tmp_path, monkeypatch):
    """Regresión: get_cached_advice/set_cached_advice deben distinguir la
    categoria en la clave de caché. Antes de la corrección, consultar el
    mismo ticker con dos categorías distintas el mismo día devolvía siempre
    el payload de la primera categoría consultada."""
    db_path = str(tmp_path / "advice_cache_test.sqlite")
    monkeypatch.setattr(cache_module, "DB_PATH", db_path)

    cache_module.set_cached_advice("AAPL", "Acciones/ETFs", {"decision": "COMPRAR"})
    cache_module.set_cached_advice("AAPL", "Fondos indexados", {"decision": "VENDER"})

    r1 = cache_module.get_cached_advice("AAPL", "Acciones/ETFs")
    r2 = cache_module.get_cached_advice("AAPL", "Fondos indexados")

    assert r1["decision"] == "COMPRAR"
    assert r2["decision"] == "VENDER"


def test_cache_sin_categoria_no_choca_con_categoria_vacia(tmp_path, monkeypatch):
    db_path = str(tmp_path / "advice_cache_test2.sqlite")
    monkeypatch.setattr(cache_module, "DB_PATH", db_path)

    cache_module.set_cached_advice("MSFT", "", {"decision": "MANTENER"})
    assert cache_module.get_cached_advice("MSFT") == {"decision": "MANTENER"}
    assert cache_module.get_cached_advice("MSFT", None) == {"decision": "MANTENER"}
