// Catálogos e dados FICTÍCIOS do protótipo.
// Na versão integrada: usuários vêm do AD/MV, agenda e pacientes vêm do MV,
// catálogos (fármacos, kits, máscaras, protocolos) são mantidos pela coordenação/farmácia.

var PERFIS = {
  anestesista: { rotulo: "Anestesiologista", views: ["agenda", "atendimento", "farmacia", "psico", "mv", "papel"], medico: true },
  residente: { rotulo: "Médico residente (ME)", views: ["agenda", "atendimento", "farmacia", "psico", "mv", "papel"], medico: true },
  enfermagem: { rotulo: "Enfermagem CC / RPA", views: ["agenda", "atendimento", "mv", "papel"], medico: false },
  farmacia: { rotulo: "Farmácia", views: ["farmacia", "psico", "mv", "papel"], medico: false }
};

var USUARIOS = [
  { id: "u1", nome: "Dra. Helena Prado", perfil: "anestesista", registro: "CRM 000001" },
  { id: "u2", nome: "Dr. Rafael Moura", perfil: "residente", registro: "CRM 000002" },
  { id: "u3", nome: "Enf. Carla Nunes", perfil: "enfermagem", registro: "COREN 000003" },
  { id: "u4", nome: "Farm. Bruno Teles", perfil: "farmacia", registro: "CRF 000004" },
  { id: "u5", nome: "Dr. Marcos Vieira", perfil: "anestesista", registro: "CRM 000005" }
];

// Fármacos usados na ficha. lista = lista da Portaria SVS/MS 344/98 (controlado) ou null.
var FARMACOS = {
  "Fentanil": { un: "mcg", lista: "A1", via: "EV" },
  "Sufentanil": { un: "mcg", lista: "A1", via: "EV" },
  "Morfina": { un: "mg", lista: "A1", via: "EV" },
  "Midazolam": { un: "mg", lista: "B1", via: "EV" },
  "Cetamina": { un: "mg", lista: "C1", via: "EV" },
  "Propofol": { un: "mg", lista: null, via: "EV" },
  "Rocurônio": { un: "mg", lista: null, via: "EV" },
  "Lidocaína": { un: "mg", lista: null, via: "EV" },
  "Dexametasona": { un: "mg", lista: null, via: "EV" },
  "Ondansetrona": { un: "mg", lista: null, via: "EV" },
  "Dipirona": { un: "mg", lista: null, via: "EV" },
  "Cefazolina": { un: "mg", lista: null, via: "EV" },
  "Efedrina": { un: "mg", lista: null, via: "EV" },
  "Bupivacaína pesada 0,5%": { un: "mg", lista: null, via: "IT" },
  "Sugamadex": { un: "mg", lista: null, via: "EV" },
  "Ringer lactato": { un: "mL", lista: null, via: "EV", fluido: true },
  "SF 0,9%": { un: "mL", lista: null, via: "EV", fluido: true }
};

// Apresentações dispensadas pela farmácia (qtd = quantidade do fármaco por unidade).
var ITENS = {
  fent: { nome: "Fentanil 50 mcg/mL amp 5 mL", farmaco: "Fentanil", qtd: 250 },
  morf: { nome: "Morfina 10 mg/mL amp 1 mL", farmaco: "Morfina", qtd: 10 },
  morfi: { nome: "Morfina 0,2 mg/mL amp 1 mL (s/ conservante)", farmaco: "Morfina", qtd: 0.2 },
  mida: { nome: "Midazolam 5 mg/5 mL amp", farmaco: "Midazolam", qtd: 5 },
  ceta: { nome: "Cetamina 50 mg/mL fr 10 mL", farmaco: "Cetamina", qtd: 500 },
  prop: { nome: "Propofol 10 mg/mL amp 20 mL", farmaco: "Propofol", qtd: 200 },
  rocu: { nome: "Rocurônio 10 mg/mL fr 5 mL", farmaco: "Rocurônio", qtd: 50 },
  lido: { nome: "Lidocaína 2% s/ vaso fr 5 mL", farmaco: "Lidocaína", qtd: 100 },
  dexa: { nome: "Dexametasona 4 mg/mL amp 2,5 mL", farmaco: "Dexametasona", qtd: 10 },
  onda: { nome: "Ondansetrona 2 mg/mL amp 2 mL", farmaco: "Ondansetrona", qtd: 4 },
  dipi: { nome: "Dipirona 500 mg/mL amp 2 mL", farmaco: "Dipirona", qtd: 1000 },
  cefa: { nome: "Cefazolina 1 g fr-amp", farmaco: "Cefazolina", qtd: 1000 },
  efed: { nome: "Efedrina 50 mg/mL amp 1 mL", farmaco: "Efedrina", qtd: 50 },
  bupi: { nome: "Bupivacaína pesada 0,5% amp 4 mL", farmaco: "Bupivacaína pesada 0,5%", qtd: 20 },
  suga: { nome: "Sugamadex 100 mg/mL fr 2 mL", farmaco: "Sugamadex", qtd: 200 }
};

var KITS = {
  geral: { nome: "Kit Anestesia Geral", itens: { fent: 2, prop: 2, rocu: 2, mida: 1, lido: 1, dexa: 1, onda: 1, dipi: 1, cefa: 2, efed: 1, suga: 1 } },
  raqui: { nome: "Kit Raquianestesia", itens: { bupi: 1, morfi: 1, mida: 1, fent: 1, onda: 1, dipi: 1, cefa: 2, efed: 1 } },
  sedacao: { nome: "Kit Sedação", itens: { prop: 2, mida: 1, fent: 1, ceta: 1, lido: 1 } }
};

var EVENTOS = ["Início da anestesia", "Indução", "IOT", "Punção raquidiana", "Bloqueio", "Incisão", "Fim da cirurgia", "Extubação", "Saída de sala", "Intercorrência"];

var TECNICAS = ["Anestesia geral balanceada", "Anestesia venosa total", "Raquianestesia", "Peridural", "Combinada (raqui + peridural)", "Bloqueio periférico", "Sedação"];

// Máscaras de descrição. {campo} é substituído pelo valor digitado.
var MASCARAS = {
  geral: {
    rotulo: "Anestesia geral",
    campos: [
      ["monitorizacao", "Monitorização", "cardioscopia, PANI, oximetria de pulso, capnografia e BIS"],
      ["acesso", "Acesso venoso", "Jelco 18G em MSE"],
      ["preox", "Pré-oxigenação", "O2 a 100% sob máscara facial por 3 minutos"],
      ["inducao", "Indução", ""],
      ["via", "Via aérea", "laringoscopia direta, Cormack-Lehane I, IOT com TOT 7,5 com balonete na 1ª tentativa, ausculta simétrica e capnografia confirmando posição"],
      ["manutencao", "Manutenção", "sevoflurano 1 CAM em O2/ar comprimido, ventilação controlada a volume"],
      ["despertar", "Despertar / extubação", "reversão com sugamadex, extubação acordado em sala"],
      ["intercorrencias", "Intercorrências", "sem intercorrências"],
      ["destino", "Destino", "RPA, estável hemodinamicamente, em ar ambiente"]
    ],
    texto: "Paciente admitido em sala, conferidos identificação, procedimento e lateralidade (checklist de cirurgia segura). Monitorização: {monitorizacao}. Acesso venoso: {acesso}. Pré-oxigenação: {preox}. Indução: {inducao}. Via aérea: {via}. Manutenção: {manutencao}. Despertar: {despertar}. Intercorrências: {intercorrencias}. Encaminhado à {destino}."
  },
  raqui: {
    rotulo: "Raquianestesia",
    campos: [
      ["monitorizacao", "Monitorização", "cardioscopia, PANI e oximetria de pulso"],
      ["acesso", "Acesso venoso", "Jelco 18G em MSE"],
      ["sedacao", "Sedação", ""],
      ["posicao", "Posição", "sentado"],
      ["assepsia", "Assepsia", "clorexidina alcoólica 0,5% e campos estéreis"],
      ["espaco", "Espaço", "L3-L4"],
      ["agulha", "Agulha", "Quincke 25G"],
      ["puncao", "Punção", "única, refluxo de LCR claro"],
      ["drogas", "Solução injetada", ""],
      ["nivel", "Nível sensitivo", "T10"],
      ["intercorrencias", "Intercorrências", "sem intercorrências"],
      ["destino", "Destino", "RPA, estável hemodinamicamente"]
    ],
    texto: "Paciente admitido em sala, checklist de cirurgia segura realizado. Monitorização: {monitorizacao}. Acesso venoso: {acesso}. Sedação: {sedacao}. Em posição {posicao}, assepsia com {assepsia}. Punção subaracnóidea em {espaco} com agulha {agulha}, punção {puncao}. Injetado: {drogas}. Bloqueio sensitivo até {nivel}. Intercorrências: {intercorrencias}. Encaminhado à {destino}."
  },
  bloqueio: {
    rotulo: "Bloqueio periférico",
    campos: [
      ["bloqueio", "Bloqueio", "interescalênico à direita"],
      ["guia", "Técnica", "guiado por ultrassom, técnica em plano"],
      ["agulha", "Agulha", "50 mm 22G, bisel curto"],
      ["solucao", "Solução", "ropivacaína 0,5% 20 mL"],
      ["sedacao", "Sedação", "midazolam 2 mg EV"],
      ["intercorrencias", "Intercorrências", "aspiração negativa, sem parestesia, sem intercorrências"],
      ["destino", "Destino", "RPA"]
    ],
    texto: "Realizado bloqueio {bloqueio}, {guia}, com agulha {agulha}, após assepsia e monitorização padrão. Solução: {solucao}. Sedação: {sedacao}. Intercorrências: {intercorrencias}. Encaminhado à {destino}."
  },
  sedacao: {
    rotulo: "Sedação",
    campos: [
      ["monitorizacao", "Monitorização", "cardioscopia, PANI, oximetria de pulso e capnografia por cateter nasal"],
      ["o2", "Oxigênio", "cateter nasal 3 L/min"],
      ["farmacos", "Fármacos", ""],
      ["nivel", "Nível de sedação", "sedação profunda, ventilação espontânea preservada"],
      ["intercorrencias", "Intercorrências", "sem intercorrências"],
      ["destino", "Destino", "RPA"]
    ],
    texto: "Paciente monitorizado com {monitorizacao}, O2 por {o2}. Sedação com {farmacos}. Nível atingido: {nivel}. Intercorrências: {intercorrencias}. Encaminhado à {destino}."
  }
};

// Protocolo de sintomáticos da RPA — EXEMPLO para discussão, a validar com a coordenação, a farmácia e a CCIH.
var PROTOCOLO_RPA = [
  { id: "dipi", farmaco: "Dipirona", texto: "Dipirona 1 g EV, se dor (EVA ≥ 3) ou febre" },
  { id: "onda", farmaco: "Ondansetrona", texto: "Ondansetrona 4 mg EV, se náusea ou vômito" },
  { id: "drop", farmaco: "Droperidol", texto: "Droperidol 0,625 mg EV, se NVPO refratária à ondansetrona" },
  { id: "morf", farmaco: "Morfina", texto: "Morfina 2 mg EV a cada 10 min, se EVA ≥ 7 (máx. 10 mg) — opioide, controlado" },
  { id: "trama", farmaco: "Tramadol", texto: "Tramadol 50 mg EV lento, se EVA 4–6 — controlado (lista A2)" },
  { id: "o2", farmaco: null, texto: "O2 por cateter nasal 2 L/min, se SpO2 < 92%" },
  { id: "aque", farmaco: null, texto: "Aquecimento ativo (manta térmica), se T < 36 °C" },
  { id: "meper", farmaco: "Meperidina", texto: "Meperidina 25 mg EV, se tremores intensos — controlado" }
];

var ALDRETE = {
  atv: ["Não move membros", "Move 2 membros", "Move 4 membros"],
  resp: ["Apneia", "Dispneia / limitada", "Respira e tosse"],
  circ: ["PA ± 50% do pré", "PA ± 20–49% do pré", "PA ± 20% do pré"],
  cons: ["Não responde", "Desperta ao chamado", "Lúcido e orientado"],
  spo2: ["< 90% com O2", "> 90% com O2", "> 92% em ar ambiente"]
};

// ---------- Paciente fictício: gerador determinístico de sinais vitais ----------
function _vitais(dur, base) {
  var v = [];
  for (var t = 0; t <= dur; t += 5) {
    var queda = t >= 5 && t <= 20 ? 18 : 0;
    var onda = Math.round(Math.sin(t / 9) * 6);
    v.push({
      t: t,
      pas: base.pas - queda + onda,
      pad: base.pad - Math.round(queda / 2) + Math.round(onda / 2),
      fc: base.fc + Math.round(Math.cos(t / 7) * 5) - (queda ? 6 : 0),
      spo2: t < 5 ? 97 : 99,
      etco2: base.geral && t >= 10 ? 33 + (t % 3) : null
    });
  }
  return v;
}

function criarDadosIniciais() {
  var agenda = [
    { id: "a1", atendimento: "4581203", prontuario: "778120", hora: "07:00", sala: "Sala 1", paciente: { nome: "Maria Aparecida Souza", idade: 58, sexo: "F", convenio: "SUS", alergias: "Nenhuma conhecida" }, procedimento: "Colecistectomia videolaparoscópica", cirurgiao: "Dr. Paulo Lima", anestesista: "u1", previsao: 90, carater: "Eletiva", status: "rpa" },
    { id: "a2", atendimento: "4581217", prontuario: "650981", hora: "07:30", sala: "Sala 2", paciente: { nome: "João Batista Ferreira", idade: 67, sexo: "M", convenio: "Unimed", alergias: "Penicilina" }, procedimento: "Artroplastia total de joelho direito", cirurgiao: "Dr. André Castro", anestesista: "u5", previsao: 120, carater: "Eletiva", status: "sala" },
    { id: "a3", atendimento: "4581230", prontuario: "803344", hora: "09:30", sala: "Sala 1", paciente: { nome: "Ana Beatriz Rocha", idade: 34, sexo: "F", convenio: "Bradesco Saúde", alergias: "Nenhuma conhecida" }, procedimento: "Histerectomia videolaparoscópica", cirurgiao: "Dra. Lúcia Campos", anestesista: "u1", previsao: 150, carater: "Eletiva", status: "apa" },
    { id: "a4", atendimento: "4581244", prontuario: "812001", hora: "10:00", sala: "Sala 3", paciente: { nome: "Pedro Henrique Alves", idade: 8, sexo: "M", convenio: "SUS", alergias: "Nenhuma conhecida" }, procedimento: "Adenotonsilectomia", cirurgiao: "Dr. Fábio Reis", anestesista: "u2", previsao: 60, carater: "Eletiva", status: "agendado" },
    { id: "a5", atendimento: "4581251", prontuario: "590777", hora: "11:00", sala: "Endoscopia", paciente: { nome: "Luiza Mendes", idade: 45, sexo: "F", convenio: "Particular", alergias: "Látex" }, procedimento: "Colonoscopia diagnóstica", cirurgiao: "Dr. Tiago Nunes", anestesista: "u5", previsao: 40, carater: "Eletiva", status: "agendado" },
    { id: "a6", atendimento: "4581268", prontuario: "430215", hora: "13:00", sala: "Sala 3", paciente: { nome: "Carlos Eduardo Silva", idade: 72, sexo: "M", convenio: "SUS", alergias: "Dipirona" }, procedimento: "Ressecção transuretral de próstata", cirurgiao: "Dr. André Castro", anestesista: "u1", previsao: 90, carater: "Eletiva", status: "agendado" }
  ];

  var vazio = function () {
    return { apa: { comorbidades: [] }, ficha: { vitais: [], drogas: [], eventos: [], balanco: {} }, descricao: { modelo: "geral", campos: {} }, evolucoes: [], rpa: { avaliacoes: [], prescricao: [], checagens: [] } };
  };
  var at = {};
  agenda.forEach(function (a) { at[a.id] = vazio(); });

  // Paciente 1: colecistectomia já na RPA
  at.a1.apa = {
    peso: 82, altura: 1.62, asa: "II", comorbidades: ["HAS", "Obesidade"], mallampati: "II", abertura: "sim", dtm: "sim", cervical: "normal", denticao: "normal",
    iotDificil: "nao", nvpoPrevia: false, opioidePos: true, jejumSolidos: "22:00", jejumLiquidos: "05:00", medicacoes: "Losartana 50 mg 1x/dia (tomou hoje com gole de água)",
    exames: "Hb 13,1 · Plaq 245 mil · Cr 0,8 · ECG ritmo sinusal", tecnica: "Anestesia geral balanceada", plano: "IOT, analgesia multimodal, profilaxia NVPO", tcle: true,
    assinado: { por: "u1", em: "06:45" }
  };
  at.a1.ficha = {
    inicio: "07:10", tecnica: "Anestesia geral balanceada",
    vitais: _vitais(85, { pas: 142, pad: 86, fc: 78, geral: true }),
    drogas: [
      { t: 2, farmaco: "Cefazolina", dose: 2000 }, { t: 3, farmaco: "Midazolam", dose: 2 }, { t: 5, farmaco: "Fentanil", dose: 250 },
      { t: 5, farmaco: "Lidocaína", dose: 60 }, { t: 6, farmaco: "Propofol", dose: 160 }, { t: 6, farmaco: "Rocurônio", dose: 50 },
      { t: 15, farmaco: "Dexametasona", dose: 8 }, { t: 20, farmaco: "Efedrina", dose: 10 }, { t: 40, farmaco: "Fentanil", dose: 100 },
      { t: 60, farmaco: "Dipirona", dose: 1000 }, { t: 65, farmaco: "Ondansetrona", dose: 4 }, { t: 75, farmaco: "Sugamadex", dose: 200 },
      { t: 0, farmaco: "Ringer lactato", dose: 1000 }
    ],
    eventos: [{ t: 0, rotulo: "Início da anestesia" }, { t: 5, rotulo: "Indução" }, { t: 8, rotulo: "IOT" }, { t: 20, rotulo: "Incisão" }, { t: 70, rotulo: "Fim da cirurgia" }, { t: 78, rotulo: "Extubação" }, { t: 85, rotulo: "Saída de sala" }],
    balanco: { diurese: "", sangramento: "50" },
    finalizada: { por: "u1", em: "08:35" }
  };
  at.a1.descricao = { modelo: "geral", campos: { inducao: "midazolam 2 mg, fentanil 250 mcg, lidocaína 60 mg, propofol 160 mg e rocurônio 50 mg" }, assinado: { por: "u1", em: "08:36" } };
  at.a1.rpa = {
    entrada: "08:36",
    avaliacoes: [
      { hora: "08:40", atv: 2, resp: 2, circ: 2, cons: 1, spo2: 1, dor: 5, nvpo: 0, por: "u3" },
      { hora: "08:55", atv: 2, resp: 2, circ: 2, cons: 2, spo2: 1, dor: 3, nvpo: 1, por: "u3" }
    ],
    prescricao: [{ id: "dipi", por: "u1", em: "08:42" }, { id: "onda", por: "u1", em: "08:42" }, { id: "morf", por: "u1", em: "08:42" }],
    checagens: [{ id: "morf", hora: "08:47", por: "u3", obs: "2 mg EV" }]
  };

  // Paciente 2: em sala, raquianestesia
  at.a2.apa = {
    peso: 88, altura: 1.74, asa: "II", comorbidades: ["HAS", "DM"], mallampati: "III", abertura: "sim", dtm: "sim", cervical: "limitada", denticao: "protese",
    iotDificil: "nao", nvpoPrevia: false, opioidePos: true, jejumSolidos: "21:00", jejumLiquidos: "05:30", medicacoes: "Metformina 850 mg 2x/dia (suspensa hoje), anlodipino 5 mg",
    exames: "Hb 14,0 · Glicemia 132 · Cr 1,0 · ECG BRD", tecnica: "Raquianestesia", plano: "Raqui + morfina intratecal, sedação leve", tcle: true, assinado: { por: "u5", em: "07:05" }
  };
  at.a2.ficha = {
    inicio: "07:40", tecnica: "Raquianestesia",
    vitais: _vitais(45, { pas: 150, pad: 88, fc: 72, geral: false }),
    drogas: [
      { t: 0, farmaco: "Cefazolina", dose: 2000 }, { t: 2, farmaco: "Midazolam", dose: 2 }, { t: 5, farmaco: "Fentanil", dose: 25 },
      { t: 8, farmaco: "Bupivacaína pesada 0,5%", dose: 15 }, { t: 8, farmaco: "Morfina", dose: 0.08, via: "IT" }, { t: 15, farmaco: "Efedrina", dose: 10 },
      { t: 0, farmaco: "Ringer lactato", dose: 500 }
    ],
    eventos: [{ t: 0, rotulo: "Início da anestesia" }, { t: 8, rotulo: "Punção raquidiana" }, { t: 22, rotulo: "Incisão" }],
    balanco: {}
  };
  at.a2.descricao = { modelo: "raqui", campos: { sedacao: "midazolam 2 mg + fentanil 25 mcg EV", drogas: "bupivacaína pesada 0,5% 15 mg + morfina 80 mcg" } };

  // Paciente 3: APA feita
  at.a3.apa = {
    peso: 64, altura: 1.66, asa: "I", comorbidades: [], mallampati: "I", abertura: "sim", dtm: "sim", cervical: "normal", denticao: "normal",
    iotDificil: "nao", nvpoPrevia: true, opioidePos: true, jejumSolidos: "22:00", jejumLiquidos: "06:00", medicacoes: "Nenhuma",
    exames: "Hb 12,8 · β-hCG negativo", tecnica: "Anestesia geral balanceada", plano: "IOT, profilaxia NVPO tripla (Apfel 4)", tcle: true, assinado: { por: "u1", em: "07:50" }
  };

  var dispensacoes = [
    { id: "d1", atId: "a1", kit: "geral", itens: Object.assign({}, KITS.geral.itens), por: "u4", recebido: "u1", em: "06:50", devolucao: null },
    { id: "d2", atId: "a2", kit: "raqui", itens: Object.assign({}, KITS.raqui.itens), por: "u4", recebido: "u5", em: "07:20", devolucao: null }
  ];

  var outbox = [
    { id: "o1", tipo: "Avaliação pré-anestésica", atId: "a1", autor: "u1", em: "06:45", status: "enviado", protocolo: "MV-DOC-90211", texto: "" },
    { id: "o2", tipo: "Avaliação pré-anestésica", atId: "a2", autor: "u5", em: "07:05", status: "enviado", protocolo: "MV-DOC-90214", texto: "" },
    { id: "o3", tipo: "Avaliação pré-anestésica", atId: "a3", autor: "u1", em: "07:50", status: "enviado", protocolo: "MV-DOC-90220", texto: "" },
    { id: "o4", tipo: "Ficha anestésica (resumo)", atId: "a1", autor: "u1", em: "08:35", status: "enviado", protocolo: "MV-DOC-90231", texto: "" },
    { id: "o5", tipo: "Descrição anestésica", atId: "a1", autor: "u1", em: "08:36", status: "enviado", protocolo: "MV-DOC-90232", texto: "" }
  ];

  return { versao: 3, sessao: null, agenda: agenda, at: at, dispensacoes: dispensacoes, descartes: [], outbox: outbox, mvForaDoAr: false, seq: 100 };
}
