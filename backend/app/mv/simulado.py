"""MV simulado para a fase experimental: agenda fictícia e "recebimento" de documentos em memória."""
import itertools
from datetime import date, datetime, time

from .base import CirurgiaAgendada, DocumentoParaMV, FalhaMV, UsuarioMV

USUARIOS_TESTE = {
    "helena.prado": UsuarioMV("helena.prado", "Dra. Helena Prado", "CRM 000001", "P001"),
    "rafael.moura": UsuarioMV("rafael.moura", "Dr. Rafael Moura", "CRM 000002", "P002"),
    "carla.nunes": UsuarioMV("carla.nunes", "Enf. Carla Nunes", "COREN 000003", "P003"),
    "bruno.teles": UsuarioMV("bruno.teles", "Farm. Bruno Teles", "CRF 000004", "P004"),
}

_AGENDA = [
    ("4581203", "778120", "Maria Aparecida Souza", "F", "1968-03-02", "Nenhuma conhecida", "SUS", "Colecistectomia videolaparoscópica", "Dr. Paulo Lima", "Sala 1", time(7, 0)),
    ("4581217", "650981", "João Batista Ferreira", "M", "1959-07-21", "Penicilina", "Unimed", "Artroplastia total de joelho direito", "Dr. André Castro", "Sala 2", time(7, 30)),
    ("4581230", "803344", "Ana Beatriz Rocha", "F", "1992-01-15", "Nenhuma conhecida", "Bradesco Saúde", "Histerectomia videolaparoscópica", "Dra. Lúcia Campos", "Sala 1", time(9, 30)),
    ("4581268", "430215", "Carlos Eduardo Silva", "M", "1954-11-30", "Dipirona", "SUS", "Ressecção transuretral de próstata", "Dr. André Castro", "Sala 3", time(13, 0)),
]


class ConectorMVSimulado:
    def __init__(self) -> None:
        self.fora_do_ar = False
        self.recebidos: list[tuple[str, DocumentoParaMV]] = []
        self._seq = itertools.count(90001)

    def autenticar(self, login: str, senha: str) -> UsuarioMV | None:
        # Qualquer senha não vazia vale no ambiente experimental.
        return USUARIOS_TESTE.get(login) if senha else None

    def agenda_cirurgica(self, dia: date) -> list[CirurgiaAgendada]:
        return [
            CirurgiaAgendada(at, pr, nome, sexo, nasc, alerg, conv, proc, cir, sala, datetime.combine(dia, hora))
            for at, pr, nome, sexo, nasc, alerg, conv, proc, cir, sala, hora in _AGENDA
        ]

    def enviar_documento(self, doc: DocumentoParaMV) -> str:
        if self.fora_do_ar:
            raise FalhaMV("MV simulado fora do ar")
        protocolo = f"MV-DOC-{next(self._seq)}"
        self.recebidos.append((protocolo, doc))
        return protocolo
