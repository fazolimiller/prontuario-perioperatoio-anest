import os

os.environ["DATABASE_URL"] = "sqlite:///./teste_perianest.db"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db import engine  # noqa: E402
from app.main import app, mv  # noqa: E402
from app.modelos import Base  # noqa: E402


@pytest.fixture()
def cliente():
    Base.metadata.drop_all(engine)
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(engine)
    mv.fora_do_ar = False


def entrar(c, login):
    r = c.post("/api/login", json={"login": login, "senha": "x"})
    assert r.status_code == 200
    return {"Authorization": "Bearer " + r.json()["token"]}


def test_login_invalido(cliente):
    assert cliente.post("/api/login", json={"login": "ninguem", "senha": "x"}).status_code == 401


def test_documento_assinado_chega_ao_mv(cliente):
    h = entrar(cliente, "helena.prado")
    agenda = cliente.get("/api/agenda", headers=h).json()
    assert len(agenda) == 4
    r = cliente.post(f"/api/atendimentos/{agenda[0]['id']}/documentos", headers=h,
                     json={"tipo": "Descrição anestésica", "texto": "Raquianestesia em L3-L4..."})
    assert r.status_code == 201
    assert r.json()["envio"] == "enviado"
    assert r.json()["protocolo_mv"].startswith("MV-DOC-")


def test_mv_fora_do_ar_mantem_na_fila_e_reenvia(cliente):
    h = entrar(cliente, "helena.prado")
    at = cliente.get("/api/agenda", headers=h).json()[0]["id"]
    mv.fora_do_ar = True
    r = cliente.post(f"/api/atendimentos/{at}/documentos", headers=h, json={"tipo": "Evolução de alta da RPA", "texto": "Alta para enfermaria."})
    assert r.json()["envio"] == "erro"
    mv.fora_do_ar = False
    assert cliente.post("/api/envios/processar", headers=h).json() == {"enviados": 1, "erros": 0}
    envio = cliente.get("/api/envios", headers=h).json()[0]
    assert envio["status"] == "enviado" and envio["tentativas"] == 2


def test_enfermagem_nao_assina_documento_medico(cliente):
    h = entrar(cliente, "carla.nunes")
    at = cliente.get("/api/agenda", headers=h).json()[0]["id"]
    r = cliente.post(f"/api/atendimentos/{at}/documentos", headers=h, json={"tipo": "Descrição anestésica", "texto": "..."})
    assert r.status_code == 403


def test_agenda_exige_login(cliente):
    assert cliente.get("/api/agenda").status_code == 401
