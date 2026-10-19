"""API do PeriAnest (esqueleto da fase experimental).

Rodar localmente:  uvicorn app.main:app --reload   (dentro de backend/)
Protótipo de telas: http://localhost:8000/   ·   Documentação da API: http://localhost:8000/docs
"""
import asyncio
import hashlib
import secrets
from contextlib import asynccontextmanager
from datetime import date
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import Sessao, engine
from .fila import processar_fila
from .modelos import Atendimento, Auditoria, Base, Documento, EnvioMV, Usuario
from .mv import criar_conector

mv = criar_conector()
_tokens: dict[str, int] = {}  # sessões em memória; na versão integrada, JWT/SSO do hospital

PERFIS_POR_LOGIN = {"helena.prado": "anestesista", "rafael.moura": "residente", "carla.nunes": "enfermagem", "bruno.teles": "farmacia"}
TIPOS_MEDICOS = {"Avaliação pré-anestésica", "Descrição anestésica", "Ficha anestésica (resumo)", "Evolução anestésica", "Evolução de alta da RPA"}


async def _laco_fila():
    while True:
        await asyncio.sleep(30)
        with Sessao() as db:
            processar_fila(db, mv)


@asynccontextmanager
async def ciclo(app: FastAPI):
    Base.metadata.create_all(engine)
    tarefa = asyncio.create_task(_laco_fila())
    yield
    tarefa.cancel()


app = FastAPI(title="PeriAnest", version="0.1.0", lifespan=ciclo)


def db():
    with Sessao() as s:
        yield s


def usuario_atual(authorization: str = Header(default=""), s: Session = Depends(db)) -> Usuario:
    uid = _tokens.get(authorization.removeprefix("Bearer ").strip())
    if not uid:
        raise HTTPException(401, "Faça login novamente.")
    return s.get(Usuario, uid)


class Login(BaseModel):
    login: str
    senha: str


class NovoDocumento(BaseModel):
    tipo: str
    texto: str


@app.get("/api/saude")
def saude():
    return {"ok": True, "conector_mv": type(mv).__name__}


@app.post("/api/login")
def login(dados: Login, s: Session = Depends(db)):
    u_mv = mv.autenticar(dados.login, dados.senha)
    if not u_mv:
        raise HTTPException(401, "Usuário ou senha incorretos.")
    u = s.scalar(select(Usuario).where(Usuario.login == u_mv.login))
    if not u:
        u = Usuario(login=u_mv.login, nome=u_mv.nome, registro=u_mv.registro, codigo_mv=u_mv.codigo_mv,
                    perfil=PERFIS_POR_LOGIN.get(u_mv.login, "anestesista"))
        s.add(u)
    s.add(Auditoria(usuario_id=None, acao="login", entidade="usuario", entidade_id=u_mv.login))
    s.commit()
    token = secrets.token_urlsafe(24)
    _tokens[token] = u.id
    return {"token": token, "nome": u.nome, "perfil": u.perfil}


@app.get("/api/agenda")
def agenda(dia: date | None = None, u: Usuario = Depends(usuario_atual), s: Session = Depends(db)):
    """Lê a agenda cirúrgica do MV e atualiza a cópia local (sem apagar o registro anestésico)."""
    saida = []
    for c in mv.agenda_cirurgica(dia or date.today()):
        at = s.scalar(select(Atendimento).where(Atendimento.numero_mv == c.numero_atendimento))
        if not at:
            at = Atendimento(numero_mv=c.numero_atendimento)
            s.add(at)
        at.prontuario_mv, at.paciente_nome, at.paciente_sexo = c.prontuario, c.paciente_nome, c.paciente_sexo
        at.paciente_nascimento, at.alergias_mv, at.convenio = c.paciente_nascimento, c.alergias, c.convenio
        at.procedimento, at.cirurgiao, at.sala, at.inicio_previsto = c.procedimento, c.cirurgiao, c.sala, c.inicio_previsto
        saida.append(at)
    s.commit()
    return [{"id": a.id, "atendimento": a.numero_mv, "paciente": a.paciente_nome, "alergias": a.alergias_mv,
             "procedimento": a.procedimento, "sala": a.sala, "inicio": a.inicio_previsto, "status": a.status} for a in saida]


@app.post("/api/atendimentos/{atendimento_id}/documentos", status_code=201)
def assinar_documento(atendimento_id: int, dados: NovoDocumento, u: Usuario = Depends(usuario_atual), s: Session = Depends(db)):
    """Assina um documento e o coloca na fila de envio ao MV, na mesma transação."""
    if not s.get(Atendimento, atendimento_id):
        raise HTTPException(404, "Atendimento não encontrado.")
    if dados.tipo in TIPOS_MEDICOS and u.perfil not in ("anestesista", "residente"):
        raise HTTPException(403, "Este documento só pode ser assinado por médico.")
    doc = Documento(atendimento_id=atendimento_id, tipo=dados.tipo, texto=dados.texto, autor_id=u.id,
                    hash_sha256=hashlib.sha256(dados.texto.encode()).hexdigest())
    s.add(doc)
    s.flush()
    s.add(EnvioMV(documento_id=doc.id))
    s.add(Auditoria(usuario_id=u.id, acao="assinar", entidade="documento", entidade_id=str(doc.id), detalhe={"tipo": dados.tipo}))
    s.commit()
    processar_fila(s, mv)
    envio = s.scalar(select(EnvioMV).where(EnvioMV.documento_id == doc.id))
    return {"documento_id": doc.id, "hash": doc.hash_sha256, "envio": envio.status, "protocolo_mv": envio.protocolo_mv}


@app.get("/api/envios")
def envios(u: Usuario = Depends(usuario_atual), s: Session = Depends(db)):
    linhas = s.execute(select(EnvioMV, Documento).join(Documento, Documento.id == EnvioMV.documento_id).order_by(EnvioMV.id.desc())).all()
    return [{"documento_id": d.id, "tipo": d.tipo, "status": e.status, "tentativas": e.tentativas,
             "protocolo_mv": e.protocolo_mv, "erro": e.ultimo_erro} for e, d in linhas]


@app.post("/api/envios/processar")
def reprocessar(u: Usuario = Depends(usuario_atual), s: Session = Depends(db)):
    return processar_fila(s, mv)


# Telas do protótipo servidas pelo mesmo endereço.
_prototipo = Path(__file__).resolve().parents[2] / "prototipo"
if _prototipo.exists():
    app.mount("/", StaticFiles(directory=_prototipo, html=True), name="prototipo")
