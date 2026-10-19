# PeriAnest: prontuário perioperatório de anestesia

Sub-sistema web (HTML) de registro anestésico que funciona junto do MV. Ele cobre a avaliação pré-anestésica, a ficha anestésica gráfica, a descrição com máscaras, as evoluções, a RPA (alta e sintomáticos), os kits da farmácia e o controle de psicotrópicos. Lê a agenda cirúrgica do MV e copia para o MV os documentos assinados.

> **Fase experimental.** Usa apenas dados fictícios e um MV simulado. Não substitui o prontuário oficial.

## Conteúdo

| Pasta | O que é |
|---|---|
| `prototipo/` | Protótipo clicável para discutir com a equipe. Abre direto no navegador (`prototipo/index.html`), sem instalação. |
| `backend/` | Esqueleto técnico para a TI: API (FastAPI), modelo de dados, fila de envio ao MV e conector MV simulado. |
| `docs/PLANO_DE_ACAO.md` | Plano de ação do projeto: fases, integração, requisitos legais, riscos. |
| `docs/ROTEIRO_DE_DISCUSSAO.md` | Roteiro da reunião com anestesistas, enfermagem e farmácia, com a lista de decisões. |

## Rodar o ambiente experimental

Com Docker (PostgreSQL + API + telas):

```bash
docker compose up --build
# telas: http://localhost:8000   ·   API: http://localhost:8000/docs
```

Sem Docker (SQLite):

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
pytest -q
```

## Arquitetura em uma linha

Telas (HTML) → API → banco próprio (fonte da verdade do registro anestésico) → fila de envio → **conector MV** (`backend/app/mv/`). Hoje o conector é `simulado`; depois vira HL7, API, tabela intermediária ou PDF, conforme a TI definir. O resto do sistema não muda.
