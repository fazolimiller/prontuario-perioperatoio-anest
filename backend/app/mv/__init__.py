import os

from .base import ConectorMV
from .simulado import ConectorMVSimulado


def criar_conector() -> ConectorMV:
    tipo = os.getenv("MV_CONECTOR", "simulado")
    if tipo == "simulado":
        return ConectorMVSimulado()
    # Próximas implementações, conforme a opção de integração escolhida com a TI:
    #   "hl7"     -> mensagens HL7 v2 (MDM) via motor de integração
    #   "api"     -> API/web service disponibilizado pela MV
    #   "staging" -> tabela intermediária no banco do MV
    #   "pdf"     -> anexo de PDF ao atendimento
    raise ValueError(f"Conector MV '{tipo}' ainda não implementado")
