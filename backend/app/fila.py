"""Envio dos documentos assinados ao MV (padrão outbox).

O documento e o pedido de envio são gravados juntos, na mesma transação.
Depois, esta rotina tenta entregar ao MV; se falhar, mantém na fila e tenta de novo.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from .mv.base import ConectorMV, DocumentoParaMV, FalhaMV
from .modelos import Atendimento, Auditoria, Documento, EnvioMV, Usuario, agora

MAX_TENTATIVAS_ANTES_DE_ALERTAR = 5


def processar_fila(db: Session, mv: ConectorMV) -> dict:
    resultado = {"enviados": 0, "erros": 0}
    envios = db.scalars(select(EnvioMV).where(EnvioMV.status.in_(["pendente", "erro"])).order_by(EnvioMV.id)).all()
    for envio in envios:
        doc = db.get(Documento, envio.documento_id)
        at = db.get(Atendimento, doc.atendimento_id)
        autor = db.get(Usuario, doc.autor_id)
        envio.tentativas += 1
        envio.atualizado_em = agora()
        try:
            envio.protocolo_mv = mv.enviar_documento(DocumentoParaMV(
                numero_atendimento=at.numero_mv, tipo=doc.tipo, texto=doc.texto,
                login_autor=autor.login, assinado_em=doc.assinado_em, hash_sha256=doc.hash_sha256,
            ))
            envio.status, envio.ultimo_erro = "enviado", None
            resultado["enviados"] += 1
        except FalhaMV as erro:
            envio.status, envio.ultimo_erro = "erro", str(erro)
            resultado["erros"] += 1
        db.add(Auditoria(usuario_id=None, acao=f"envio_mv_{envio.status}", entidade="documento", entidade_id=str(doc.id),
                         detalhe={"tentativa": envio.tentativas, "protocolo": envio.protocolo_mv, "erro": envio.ultimo_erro}))
    db.commit()
    return resultado
