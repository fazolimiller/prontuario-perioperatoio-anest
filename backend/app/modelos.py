"""Modelo de dados do PeriAnest.

Regra geral: o que vem do MV (paciente, atendimento, agenda, usuário) é guardado
só como referência (códigos do MV + cópia mínima para exibição). O registro
anestésico detalhado é a fonte da verdade aqui. Documentos assinados são
imutáveis; correções viram novos documentos (adendos).
"""
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


def agora() -> datetime:
    return datetime.now()


# ---------- Identidade e acesso ----------
class Usuario(Base):
    __tablename__ = "usuario"
    id: Mapped[int] = mapped_column(primary_key=True)
    login: Mapped[str] = mapped_column(String(80), unique=True)  # mesmo login do AD/MV
    nome: Mapped[str] = mapped_column(String(160))
    perfil: Mapped[str] = mapped_column(String(30))  # anestesista, residente, enfermagem, farmacia, admin
    registro: Mapped[str | None] = mapped_column(String(40))  # CRM, COREN, CRF
    codigo_mv: Mapped[str | None] = mapped_column(String(40))  # código do prestador no MV
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)


# ---------- Referências ao MV ----------
class Atendimento(Base):
    """Cirurgia agendada, sincronizada a partir da agenda do centro cirúrgico do MV."""
    __tablename__ = "atendimento"
    id: Mapped[int] = mapped_column(primary_key=True)
    numero_mv: Mapped[str] = mapped_column(String(30), index=True)  # nº do atendimento no MV
    prontuario_mv: Mapped[str] = mapped_column(String(30))
    paciente_nome: Mapped[str] = mapped_column(String(160))
    paciente_nascimento: Mapped[str | None] = mapped_column(String(10))
    paciente_sexo: Mapped[str | None] = mapped_column(String(1))
    alergias_mv: Mapped[str | None] = mapped_column(Text)
    convenio: Mapped[str | None] = mapped_column(String(80))
    procedimento: Mapped[str] = mapped_column(String(255))
    cirurgiao: Mapped[str | None] = mapped_column(String(160))
    sala: Mapped[str | None] = mapped_column(String(40))
    inicio_previsto: Mapped[datetime | None] = mapped_column(DateTime)
    anestesista_id: Mapped[int | None] = mapped_column(ForeignKey("usuario.id"))
    status: Mapped[str] = mapped_column(String(20), default="agendado")  # agendado, apa, sala, rpa, alta
    sincronizado_em: Mapped[datetime] = mapped_column(DateTime, default=agora)


# ---------- Registro clínico ----------
class AvaliacaoPreAnestesica(Base):
    __tablename__ = "avaliacao_pre_anestesica"
    id: Mapped[int] = mapped_column(primary_key=True)
    atendimento_id: Mapped[int] = mapped_column(ForeignKey("atendimento.id"))
    dados: Mapped[dict] = mapped_column(JSON)  # ASA, via aérea, comorbidades, Apfel, jejum, plano...
    autor_id: Mapped[int] = mapped_column(ForeignKey("usuario.id"))
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=agora)


class Ficha(Base):
    """Ficha anestésica intraoperatória (cabeçalho)."""
    __tablename__ = "ficha"
    id: Mapped[int] = mapped_column(primary_key=True)
    atendimento_id: Mapped[int] = mapped_column(ForeignKey("atendimento.id"))
    tecnica: Mapped[str | None] = mapped_column(String(80))
    inicio: Mapped[datetime] = mapped_column(DateTime)
    fim: Mapped[datetime | None] = mapped_column(DateTime)
    anestesista_id: Mapped[int] = mapped_column(ForeignKey("usuario.id"))
    sangramento_ml: Mapped[int | None] = mapped_column(Integer)
    diurese_ml: Mapped[int | None] = mapped_column(Integer)
    finalizada_em: Mapped[datetime | None] = mapped_column(DateTime)
    sinais: Mapped[list["SinalVital"]] = relationship(cascade="all, delete-orphan")
    administracoes: Mapped[list["Administracao"]] = relationship(cascade="all, delete-orphan")
    eventos: Mapped[list["EventoFicha"]] = relationship(cascade="all, delete-orphan")


class SinalVital(Base):
    __tablename__ = "sinal_vital"
    id: Mapped[int] = mapped_column(primary_key=True)
    ficha_id: Mapped[int] = mapped_column(ForeignKey("ficha.id"))
    momento: Mapped[datetime] = mapped_column(DateTime)
    pas: Mapped[int | None] = mapped_column(Integer)
    pad: Mapped[int | None] = mapped_column(Integer)
    fc: Mapped[int | None] = mapped_column(Integer)
    spo2: Mapped[int | None] = mapped_column(Integer)
    etco2: Mapped[int | None] = mapped_column(Integer)
    temperatura: Mapped[float | None] = mapped_column(Numeric(4, 1))
    origem: Mapped[str] = mapped_column(String(20), default="manual")  # manual | monitor


class Farmaco(Base):
    __tablename__ = "farmaco"
    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(120), unique=True)
    unidade: Mapped[str] = mapped_column(String(10))
    lista_344: Mapped[str | None] = mapped_column(String(4))  # A1, A2, B1, C1... ou nulo
    codigo_mv: Mapped[str | None] = mapped_column(String(40))  # código do produto no MV


class Administracao(Base):
    __tablename__ = "administracao"
    id: Mapped[int] = mapped_column(primary_key=True)
    ficha_id: Mapped[int] = mapped_column(ForeignKey("ficha.id"))
    farmaco_id: Mapped[int] = mapped_column(ForeignKey("farmaco.id"))
    momento: Mapped[datetime] = mapped_column(DateTime)
    dose: Mapped[float] = mapped_column(Numeric(10, 3))
    via: Mapped[str] = mapped_column(String(20))
    infusao_fim: Mapped[datetime | None] = mapped_column(DateTime)  # infusões contínuas
    lote: Mapped[str | None] = mapped_column(String(40))


class EventoFicha(Base):
    __tablename__ = "evento_ficha"
    id: Mapped[int] = mapped_column(primary_key=True)
    ficha_id: Mapped[int] = mapped_column(ForeignKey("ficha.id"))
    momento: Mapped[datetime] = mapped_column(DateTime)
    rotulo: Mapped[str] = mapped_column(String(80))
    detalhe: Mapped[str | None] = mapped_column(Text)


class Mascara(Base):
    """Modelo de descrição anestésica, versionado."""
    __tablename__ = "mascara"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(String(40))
    versao: Mapped[int] = mapped_column(Integer, default=1)
    rotulo: Mapped[str] = mapped_column(String(80))
    campos: Mapped[list] = mapped_column(JSON)
    texto: Mapped[str] = mapped_column(Text)
    ativa: Mapped[bool] = mapped_column(Boolean, default=True)


class AvaliacaoRPA(Base):
    __tablename__ = "avaliacao_rpa"
    id: Mapped[int] = mapped_column(primary_key=True)
    atendimento_id: Mapped[int] = mapped_column(ForeignKey("atendimento.id"))
    momento: Mapped[datetime] = mapped_column(DateTime)
    aldrete: Mapped[dict] = mapped_column(JSON)  # atividade, respiração, circulação, consciência, SpO2
    dor: Mapped[int | None] = mapped_column(Integer)
    nvpo: Mapped[int | None] = mapped_column(Integer)
    autor_id: Mapped[int] = mapped_column(ForeignKey("usuario.id"))


class PrescricaoRPA(Base):
    __tablename__ = "prescricao_rpa"
    id: Mapped[int] = mapped_column(primary_key=True)
    atendimento_id: Mapped[int] = mapped_column(ForeignKey("atendimento.id"))
    item_protocolo: Mapped[str] = mapped_column(String(40))
    texto: Mapped[str] = mapped_column(Text)
    prescritor_id: Mapped[int] = mapped_column(ForeignKey("usuario.id"))
    prescrito_em: Mapped[datetime] = mapped_column(DateTime, default=agora)
    checado_em: Mapped[datetime | None] = mapped_column(DateTime)
    checado_por_id: Mapped[int | None] = mapped_column(ForeignKey("usuario.id"))


# ---------- Documentos e integração ----------
class Documento(Base):
    """Documento assinado (APA, descrição, evolução, resumo da ficha, alta da RPA). Imutável."""
    __tablename__ = "documento"
    id: Mapped[int] = mapped_column(primary_key=True)
    atendimento_id: Mapped[int] = mapped_column(ForeignKey("atendimento.id"))
    tipo: Mapped[str] = mapped_column(String(60))
    texto: Mapped[str] = mapped_column(Text)
    autor_id: Mapped[int] = mapped_column(ForeignKey("usuario.id"))
    assinado_em: Mapped[datetime] = mapped_column(DateTime, default=agora)
    hash_sha256: Mapped[str] = mapped_column(String(64))
    substitui_id: Mapped[int | None] = mapped_column(ForeignKey("documento.id"))  # adendo/correção


class EnvioMV(Base):
    """Fila de saída (padrão outbox): cada documento gera um envio, repetido até o MV confirmar."""
    __tablename__ = "envio_mv"
    id: Mapped[int] = mapped_column(primary_key=True)
    documento_id: Mapped[int] = mapped_column(ForeignKey("documento.id"), unique=True)
    status: Mapped[str] = mapped_column(String(20), default="pendente")  # pendente | enviado | erro
    tentativas: Mapped[int] = mapped_column(Integer, default=0)
    protocolo_mv: Mapped[str | None] = mapped_column(String(60))
    ultimo_erro: Mapped[str | None] = mapped_column(Text)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime, default=agora)


# ---------- Farmácia ----------
class Kit(Base):
    __tablename__ = "kit"
    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(80))
    composicao: Mapped[dict] = mapped_column(JSON)  # {codigo_item: quantidade}


class Dispensacao(Base):
    __tablename__ = "dispensacao"
    id: Mapped[int] = mapped_column(primary_key=True)
    atendimento_id: Mapped[int] = mapped_column(ForeignKey("atendimento.id"))
    kit_id: Mapped[int] = mapped_column(ForeignKey("kit.id"))
    itens: Mapped[dict] = mapped_column(JSON)  # {codigo_item: {"qtd": n, "lote": "..."}}
    dispensado_por_id: Mapped[int] = mapped_column(ForeignKey("usuario.id"))
    recebido_por_id: Mapped[int] = mapped_column(ForeignKey("usuario.id"))
    dispensado_em: Mapped[datetime] = mapped_column(DateTime, default=agora)
    devolucao: Mapped[dict | None] = mapped_column(JSON)
    devolvido_em: Mapped[datetime | None] = mapped_column(DateTime)


class DescarteControlado(Base):
    __tablename__ = "descarte_controlado"
    id: Mapped[int] = mapped_column(primary_key=True)
    dispensacao_id: Mapped[int] = mapped_column(ForeignKey("dispensacao.id"))
    farmaco_id: Mapped[int] = mapped_column(ForeignKey("farmaco.id"))
    quantidade: Mapped[float] = mapped_column(Numeric(10, 3))
    responsavel_id: Mapped[int] = mapped_column(ForeignKey("usuario.id"))
    testemunha_id: Mapped[int] = mapped_column(ForeignKey("usuario.id"))
    motivo: Mapped[str] = mapped_column(String(120))
    registrado_em: Mapped[datetime] = mapped_column(DateTime, default=agora)


# ---------- Auditoria ----------
class Auditoria(Base):
    """Registro de toda operação (LGPD e prontuário): quem, quando, o quê, antes e depois."""
    __tablename__ = "auditoria"
    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuario.id"))
    momento: Mapped[datetime] = mapped_column(DateTime, default=agora)
    acao: Mapped[str] = mapped_column(String(60))
    entidade: Mapped[str] = mapped_column(String(60))
    entidade_id: Mapped[str | None] = mapped_column(String(40))
    detalhe: Mapped[dict | None] = mapped_column(JSON)
    ip: Mapped[str | None] = mapped_column(String(45))
