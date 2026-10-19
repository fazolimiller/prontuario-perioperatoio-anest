# Roteiro para a reunião com a equipe

Objetivo: usar o protótipo para decidir **o que o PeriAnest faz e o que continua no MV**, antes de qualquer integração.
Duração sugerida: 60 a 90 minutos. Participantes: anestesiologistas, enfermagem do CC e da RPA, farmácia e um representante da TI.

> Tudo no protótipo é fictício: pacientes, profissionais, números de atendimento, kits e protocolos.

## Como abrir o protótipo
- **Sem instalar nada:** abrir `prototipo/index.html` no navegador (Chrome ou Edge).
- **Com o servidor experimental:** `docker compose up --build` na raiz do projeto e acessar `http://localhost:8000`.

Na tela de entrada, escolha o usuário de teste. Cada perfil vê telas e permissões diferentes:

| Usuário | Perfil | O que mostrar |
|---|---|---|
| Dra. Helena Prado | Anestesiologista | APA, ficha, descrição, RPA e alta |
| Dr. Rafael Moura | Residente | Mesmo fluxo; discutir a supervisão |
| Enf. Carla Nunes | Enfermagem CC/RPA | Aldrete, checagem de sintomáticos (não assina alta) |
| Farm. Bruno Teles | Farmácia | Dispensação, devolução e descarte com testemunha |

O botão **Restaurar exemplo** volta os dados ao estado inicial.

## Sequência sugerida (um paciente do início ao fim)

1. **Agenda cirúrgica** (5 min): mostra que a agenda vem do MV e que nada de cirurgia é alterado aqui.
2. **Carlos Eduardo Silva → Pré-anestésica** (10 min): preencher e mostrar o IMC, o escore de Apfel, o alerta de via aérea e o texto que vai para o MV.
3. **João Batista Ferreira → Ficha anestésica** (15 min): paciente em sala com raquianestesia. Registrar sinais vitais, um fármaco e um evento. Discutir intervalo, monitores e infusões.
4. **Descrição** (10 min): trocar a máscara, usar o botão "Preencher fármacos a partir da ficha" e assinar.
5. **Finalizar a ficha → RPA** (10 min): registrar o Aldrete, prescrever sintomáticos e dar alta. No paciente Carlos, mostrar a dipirona bloqueada por alergia.
6. **Farmácia e Psicotrópicos** (10 min, entrar como farmácia): registrar a devolução do kit, ver as sobras de fentanil/midazolam e registrar um descarte com testemunha.
7. **Envios ao MV** (5 min): clicar em "Simular: MV fora do ar", assinar um documento, ver a fila com erro e depois "MV voltou".
8. **Papel no MV** (15 min): percorrer a tabela de decisões e preencher as respostas abaixo.

## Decisões a registrar na reunião

| # | Pergunta | Decisão | Responsável |
|---|---|---|---|
| 1 | A APA do ambulatório entra no PeriAnest ou fica no MV? | | |
| 2 | Intervalo padrão de sinais vitais e captura automática dos monitores (fase 2)? | | |
| 3 | Quais máscaras de descrição são necessárias na primeira versão? | | |
| 4 | A prescrição de sintomáticos da RPA vai para a prescrição do MV (farmácia/faturamento)? | | |
| 5 | Protocolo de sintomáticos: quem aprova (coordenação, farmácia, CCIH)? | | |
| 6 | Critério de alta da RPA (Aldrete ≥ 9? PADSS para hospital-dia?) | | |
| 7 | Os kits dão baixa no estoque do MV ou só são conciliados aqui? | | |
| 8 | Psicotrópicos: o PeriAnest é conferência ou parte da escrituração oficial? | | |
| 9 | Como o documento entra no MV: texto de evolução, documento do PEP ou PDF? | | |
| 10 | Correção de documento já enviado: adendo ou substituição? | | |
| 11 | A enfermagem da RPA registra aqui ou continua no MV? | | |
| 12 | Uso em tablet sem rede: necessário na primeira versão? | | |

## O que levar para a TI depois da reunião
- As respostas acima (principalmente 4, 7, 9 e 10, que definem a integração)
- O questionário da seção 5 do [plano de ação](PLANO_DE_ACAO.md)
- O esqueleto técnico em `backend/`: o conector MV fica isolado em `backend/app/mv/`, e basta trocar o modo `simulado` pela integração real que a TI escolher
