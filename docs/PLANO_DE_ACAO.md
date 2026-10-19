# Plano de Ação: Prontuário Perioperatório de Anestesia

Este sistema é um sub-sistema web (HTML) de anestesia que trabalha junto do MV (PEP) do hospital. Ele cobre:

1. Ficha anestésica gráfica (intraoperatória)
2. Descrição anestésica com máscaras (modelos)
3. Evolução anestésica (pré, intra e pós)
4. Recuperação pós-anestésica (RPA), com evolução de alta e prescrição de sintomáticos
5. Farmácia: dispensação e devolução de caixas/kits de anestesia
6. Controle de psicotrópicos e entorpecentes (Portaria SVS/MS 344/98)
7. Login com as credenciais dos médicos e funcionários, e cópia automática das evoluções para o MV, para que médicos de outros setores possam conferir

A estratégia é construir primeiro uma plataforma experimental, isolada e com dados fictícios. Ela precisa ser arquitetada desde o início para trocar o "conector MV simulado" pelo conector real quando a TI liberar a integração.

---

## 1. Princípios de arquitetura

| Decisão | Motivo |
|---|---|
| Aplicação web (HTML5) responsiva, que roda em navegador no PC da sala, em tablet e no posto da RPA | Mesma tecnologia de exibição do MV HTML, sem instalação local |
| O banco próprio é a fonte da verdade do perioperatório, e o MV recebe uma **cópia** dos documentos finalizados | Separa o registro detalhado (gráfico, minuto a minuto) do documento clínico que os outros setores leem |
| **Conector MV como módulo isolado ("adapter")** com 3 modos: `simulado`, `arquivo` e `real` | Permite desenvolver e validar tudo sem depender da TI, e trocar só esse módulo depois |
| **Fila de envio (padrão *outbox*)** com reenvio automático e log | Nenhuma evolução se perde se o MV estiver fora do ar |
| Autenticação plugável: usuários locais no piloto, depois **LDAP/Active Directory** ou a mesma base de usuários do MV | Atende ao requisito de "logar com os dados do médico/funcionário" |
| Trilha de auditoria imutável (quem, quando, o quê, antes/depois) | Exigência de prontuário, de LGPD e do controle de psicotrópicos |
| Documento finalizado é **travado e assinado**, e qualquer correção vira adendo | Integridade do prontuário (CFM) |

### Stack sugerida para a fase experimental

> Ajustável ao que a TI do hospital já domina. O importante é usar banco relacional e containers.

- **Frontend:** HTML5 + TypeScript (React ou Vue), com gráficos em uma biblioteca canvas/SVG (ex.: ECharts ou Chart.js) para a ficha anestésica
- **Backend:** API REST (Python/FastAPI ou Node/NestJS)
- **Banco de dados:** PostgreSQL. Se a TI preferir manter tudo no padrão MV, a modelagem pode migrar para Oracle depois
- **Infra experimental:** Docker Compose em um servidor de homologação interno, ou em nuvem com dados 100% fictícios
- **Integração (fase posterior):** motor de integração (ex.: Mirth Connect/NextGen Connect, gratuito) falando HL7 v2/FHIR ou a API/tabelas de integração que a MV disponibilizar
- **Geração de documento:** PDF de cada descrição/evolução, com hash, para anexar no MV quando a integração for por documento

```
[Navegador: sala cirúrgica / RPA / farmácia]
              │ HTTPS
        [API do sistema] ── [PostgreSQL + auditoria]
              │
        [Fila outbox] ──► [Conector MV]
                             ├─ simulado (fase experimental)
                             ├─ arquivo PDF/HL7 (validação com TI)
                             └─ real: HL7/FHIR/API/tabela intermediária MV
```

---

## 2. Escopo funcional por módulo

### 2.1 Acesso e perfis
- Perfis: anestesiologista, residente (assinatura com supervisor), enfermagem de CC/RPA, farmacêutico, auxiliar de farmácia, auditor, administrador
- Login individual e intransferível, com bloqueio automático por inatividade
- Vínculo do atendimento pelo **nº de atendimento/prontuário do MV**: no piloto é digitado ou simulado, na integração vem do MV

### 2.2 Avaliação pré-anestésica e evolução
- ASA, via aérea (Mallampati etc.), comorbidades, alergias, medicações em uso, jejum, exames, plano anestésico e consentimento
- Evolução livre e por modelo, com data/hora automática e assinatura

### 2.3 Ficha anestésica gráfica (núcleo do projeto)
- Linha do tempo com início/fim da anestesia e da cirurgia, indução, IOT/extubação e posicionamento
- Sinais vitais (PA, FC, SpO₂, EtCO₂, temperatura, BIS etc.) **em intervalos configuráveis (ex.: 5 min)** com gráfico em tempo real
- Fármacos (bolus e infusão contínua), fluidos, hemocomponentes, diurese e sangramento
- Eventos e intercorrências com marcação no gráfico
- **Fase futura:** captura automática dos monitores multiparamétricos via gateway HL7 do fabricante
- Saída: ficha gráfica em PDF e resumo textual para o MV

### 2.4 Descrição anestésica com máscaras
- Modelos por técnica: geral balanceada, venosa total, raquianestesia, peridural, combinada, bloqueios periféricos, sedação
- Campos variáveis (agulha, nível, drogas, doses) preenchidos automaticamente a partir da ficha gráfica quando possível
- Cadastro de máscaras pela coordenação, com versionamento

### 2.5 RPA (recuperação pós-anestésica)
- Admissão na RPA com passagem de caso a partir da ficha
- Escalas seriadas: **Aldrete-Kroulik**, dor (EVA/numérica), náuseas/vômitos, sedação e, em bloqueios, Bromage
- **Prescrição de sintomáticos** por protocolo (analgésicos, antieméticos, resgates), com checagem de enfermagem
- **Evolução de alta da RPA**, com critério de alta calculado e destino (enfermaria, UTI, casa)

### 2.6 Farmácia: caixas/kits de anestesia
- Cadastro de kits padrão (composição por tipo de procedimento/sala)
- Dispensação vinculada ao **paciente/atendimento + anestesiologista + sala**
- Devolução e conferência: dispensado − devolvido = consumido. Esse consumo é **confrontado com o que foi registrado na ficha**, e as divergências vão para um painel
- Leitura de código de barras/lote/validade (fase 2)

### 2.7 Controle de psicotrópicos e entorpecentes
- Itens das listas da Portaria 344/98 (opioides, benzodiazepínicos, cetamina etc.), parametrizáveis
- Balanço por paciente: **dispensado = administrado + descartado + devolvido**
- Descarte de sobra com **dupla assinatura (testemunha)**
- Livro de registro eletrônico, relatórios para o farmacêutico responsável e para a vigilância sanitária, e alertas de divergência
- Rastreabilidade por lote

### 2.8 Cópia para o MV
- Documentos enviados: **descrição anestésica, evoluções (pré/intra/pós), evolução da RPA/alta** e, opcionalmente, o PDF da ficha gráfica
- Envio disparado na **finalização/assinatura** do documento, com status visível (pendente / enviado / erro)
- Painel de reconciliação: o que foi gerado × o que o MV confirmou

---

## 3. Fases e cronograma (estimativa)

> Os prazos assumem um desenvolvedor dedicado mais o apoio clínico. Com mais gente, as fases 3 e 4 podem rodar em paralelo.

### Fase 0: Governança e alinhamento (semanas 1–3)
- [ ] Formalizar o projeto com a diretoria clínica, a coordenação de anestesia, a farmácia, a TI, a qualidade e o DPO (LGPD)
- [ ] Definir o **patrocinador** e o **dono do produto** (anestesiologista de referência)
- [ ] Reunião com a TI para responder ao **questionário de integração** (seção 5)
- [ ] Verificar no **contrato com a MV** se integração por terceiros é permitida, se há custo e se existe ambiente de homologação
- [ ] Coletar os modelos atuais: ficha em papel, descrições, prescrições padrão da RPA, kits da farmácia e livro de psicotrópicos

**Entregável:** termo de abertura, matriz de responsáveis e lista de requisitos priorizada.

### Fase 1: Desenho (semanas 3–6)
- [ ] Mapear os fluxos atuais e os desejados: pré → sala → RPA → alta, e farmácia → sala → devolução
- [ ] Protótipos de tela (clicáveis), validados por anestesistas, enfermagem de RPA e farmácia
- [ ] Modelo de dados (paciente/atendimento, procedimento, ficha, registros de sinais, administrações, documentos, kits, movimentações, auditoria)
- [ ] Definir as máscaras de descrição e os protocolos de sintomáticos

**Entregável:** protótipo aprovado e dicionário de dados.

### Fase 2: Plataforma experimental (semanas 5–8)
- [ ] Subir o ambiente experimental (Docker: app + PostgreSQL + backup) em servidor de homologação
- [ ] **Usar somente dados fictícios** (base de pacientes simulados)
- [ ] Login local com perfis, auditoria e HTTPS
- [ ] Conector MV em modo **simulado**: grava o "documento enviado" numa tabela/tela que imita o MV
- [ ] CI básico (testes automáticos a cada alteração)

**Entregável:** ambiente acessível pela equipe-piloto, com login.

### Fase 3: MVP clínico (semanas 8–16)
Ordem sugerida, do maior valor para o maior risco:
1. Evolução e descrição anestésica com máscaras
2. Ficha anestésica gráfica (entrada manual)
3. RPA: escalas, prescrição de sintomáticos e evolução de alta
4. Geração de PDF e status de envio ao MV (simulado)

**Entregável:** fluxo completo de um paciente fictício, do pré à alta da RPA.

### Fase 4: Farmácia e psicotrópicos (semanas 12–20)
- [ ] Kits, dispensação, devolução e conciliação com a ficha
- [ ] Psicotrópicos: balanço, descarte com testemunha e relatórios
- [ ] Validação com o farmacêutico responsável técnico

### Fase 5: Testes de uso, ainda sem integração (semanas 16–22)
- [ ] Simulações em sala/RPA com casos fictícios cronometrados (tempo de preenchimento × papel)
- [ ] Ajustes de usabilidade
- [ ] Testes de segurança (permissões, sessão, auditoria) e de contingência (queda de rede/servidor)
- [ ] Definir o **plano de contingência**: formulário em papel padronizado e como digitalizar depois

### Fase 6: Integração com a TI/MV (semanas 20–30, depende da TI e da MV)
- [ ] Autenticação real (AD/LDAP ou base de usuários do MV)
- [ ] Busca de paciente/atendimento no MV (dados demográficos, alergias, cirurgia agendada)
- [ ] Envio dos documentos ao MV em **homologação**, pelo método definido (seção 4)
- [ ] Teste de ponta a ponta: o médico de outro setor abre o PEP do MV e encontra a evolução
- [ ] Hospedagem definitiva no datacenter do hospital, backup, monitoramento e LGPD (RIPD)

### Fase 7: Piloto real e expansão (após aprovação)
- [ ] Piloto em **1 sala + RPA**, rodando em paralelo ao processo atual por 2–4 semanas
- [ ] Indicadores: completude da ficha, tempo de registro, divergências de psicotrópicos e falhas de envio ao MV
- [ ] Expansão gradual para todas as salas, com treinamento e manual
- [ ] Fase futura: captura automática dos monitores, painel gerencial e indicadores de qualidade (ex.: NVPO, dor na RPA, tempo de RPA)

---

## 4. Opções de integração com o MV (a decidir com a TI)

| Opção | Como funciona | Prós | Contras |
|---|---|---|---|
| **A. HL7 v2 (mensagem de documento, ex.: MDM)** via motor de integração | O sistema envia o texto/PDF, e o MV registra como documento/evolução | Padrão de mercado, desacoplado | Depende do módulo de integração do MV estar habilitado |
| **B. API/Web service MV (REST/FHIR)** | Chamada direta à API disponibilizada pela MV | Moderno, com retorno imediato | Pode ter custo e licença; disponibilidade depende da versão |
| **C. Tabela intermediária (staging)** no banco MV | O sistema grava numa tabela, e uma rotina da TI/MV importa | Comum em hospitais com MV, a TI controla | Acoplado ao banco, precisa de rotina de importação |
| **D. Anexo de PDF** ao atendimento | O PDF assinado é anexado ao prontuário | Mais simples | Texto não pesquisável e menos integrado |

**Recomendação:** desenvolver o conector com uma interface única e implementar primeiro a opção **D** (fácil de validar), depois a **A, B ou C**, conforme o que a TI/MV oferecer. O restante do sistema não muda.

---

## 5. Questionário para a TI (levar na primeira reunião)

1. Qual versão/produto do MV está em uso (SOUL MV, PEP HTML5), e qual é o banco (Oracle)?
2. Existe **ambiente de homologação/treinamento do MV** que possamos usar?
3. O hospital tem motor de integração (Mirth/NextGen, barramento MV, outro)? Já existe alguma integração HL7/FHIR rodando?
4. Como os documentos de terceiros entram hoje no PEP (laudos de imagem, laboratório)? *É provável que esse seja o caminho mais curto.*
5. A autenticação dos usuários do MV é via **Active Directory/LDAP**? Podemos autenticar contra ele?
6. Há SSO, ou dá para abrir o sistema a partir do MV já com o paciente selecionado (link contextual)?
7. Política de hospedagem: servidor interno, VM disponível, rede da sala cirúrgica/RPA (Wi-Fi, tablets)?
8. A assinatura digital é feita com certificado **ICP-Brasil** no MV? Os médicos usam token ou nuvem?
9. Qual é o processo de aprovação de sistemas novos (segurança da informação, DPO, comitê)?
10. Quem é o contato técnico na MV para viabilizar a integração?

---

## 6. Requisitos legais e normativos (validar com jurídico/qualidade)

- **CFM nº 2.174/2017**: ato anestésico, com avaliação pré-anestésica, ficha anestésica e RPA com critérios de alta
- **CFM nº 1.821/2007, CFM nº 2.299/2021 e Lei 13.787/2018**: prontuário eletrônico, guarda, digitalização e assinatura eletrônica (prontuário sem papel exige certificação ICP-Brasil/requisitos SBIS)
- **Portaria SVS/MS 344/1998** e normas sanitárias correlatas: controle, escrituração e guarda de entorpecentes/psicotrópicos
- **LGPD (Lei 13.709/2018)**: dado sensível de saúde, base legal, controle de acesso, registro de operações e Relatório de Impacto (RIPD)
- Normas internas da CCIH/qualidade e de acreditação (ONA/JCI, se aplicável)

> Enquanto não houver integração e assinatura válidas, **o sistema experimental não substitui o prontuário oficial**. Ele roda com dados fictícios ou em paralelo.

---

## 7. Equipe e papéis

| Papel | Quem | Dedicação |
|---|---|---|
| Patrocinador | Diretoria clínica/técnica | Pontual |
| Dono do produto | Anestesiologista coordenador | 4–6 h/semana |
| Representantes de usuários | Anestesistas, enfermagem CC/RPA, farmacêutico | Validações quinzenais |
| Desenvolvimento | 1–2 desenvolvedores (interno, terceiro ou apoio com IA) | Contínua |
| TI do hospital | Infra, AD, integração MV | Fases 2, 6 e 7 |
| Segurança/DPO | LGPD, RIPD | Fases 0, 5 e 6 |

---

## 8. Principais riscos e mitigação

| Risco | Mitigação |
|---|---|
| A MV não libera integração ou cobra caro | Levantar isso na fase 0. Ter a opção D (PDF) como plano B |
| Baixa adesão em sala (registro mais lento que o papel) | Prototipar com usuários, usar atalhos/modelos e, depois, captura automática dos monitores |
| Queda de sistema durante a cirurgia | Contingência em papel, operação offline local com sincronização posterior (avaliar) |
| Divergência legal no controle de psicotrópicos | Validação do farmacêutico RT antes do piloto, mantendo o livro oficial em paralelo |
| Vazamento de dados | Dados fictícios na fase experimental, HTTPS, perfis mínimos, auditoria e RIPD |
| Dependência de uma única pessoa desenvolvedora | Código versionado no GitHub, documentação e testes automatizados |

---

## 9. Próximos passos imediatos (próximas 2 semanas)

1. Agendar reunião com a TI e levar o **questionário da seção 5**
2. Reunir os modelos em papel atuais (ficha, descrição, RPA, kits, livro de psicotrópicos) e digitalizar para referência
3. Definir o dono do produto e os 3–5 usuários-chave para validação
4. Aprovar a stack da fase experimental com a TI
5. Iniciar o repositório com a estrutura do projeto (frontend, backend, banco, conector MV simulado) e a primeira tela: **evolução/descrição com máscaras**
