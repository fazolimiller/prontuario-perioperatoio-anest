"""Contrato do conector com o MV.

O resto do sistema só conhece esta interface. Para trocar o MV simulado pelo
real, basta escrever outra implementação (HL7, API/FHIR, tabela intermediária
ou anexo PDF) e mudar a variável de ambiente MV_CONECTOR.
"""
from dataclasses import dataclass
from datetime import date, datetime
from typing import Protocol


@dataclass
class CirurgiaAgendada:
    numero_atendimento: str
    prontuario: str
    paciente_nome: str
    paciente_sexo: str
    paciente_nascimento: str
    alergias: str
    convenio: str
    procedimento: str
    cirurgiao: str
    sala: str
    inicio_previsto: datetime
    codigo_anestesista: str | None = None


@dataclass
class DocumentoParaMV:
    numero_atendimento: str
    tipo: str
    texto: str
    login_autor: str
    assinado_em: datetime
    hash_sha256: str
    pdf: bytes | None = None


@dataclass
class UsuarioMV:
    login: str
    nome: str
    registro: str | None
    codigo_mv: str | None


class FalhaMV(Exception):
    """O MV não respondeu ou recusou. O envio fica na fila e será repetido."""


class ConectorMV(Protocol):
    def autenticar(self, login: str, senha: str) -> UsuarioMV | None: ...
    def agenda_cirurgica(self, dia: date) -> list[CirurgiaAgendada]: ...
    def enviar_documento(self, doc: DocumentoParaMV) -> str:
        """Devolve o protocolo/identificador gerado no MV. Lança FalhaMV em caso de erro."""
        ...
