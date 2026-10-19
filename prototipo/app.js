// PeriAnest — protótipo navegável. Tudo roda no navegador, com dados fictícios
// guardados localmente. O "MV" aqui é simulado: os documentos assinados entram
// numa fila de envio, que imita a integração real.

var CHAVE = "perianest-prototipo";
var S = carregar();
var UI = { view: "agenda", at: null, aba: "apa", outSel: null, devolver: null, confirmarReset: false };

var STATUS = {
  agendado: { rotulo: "Agendado", cls: "" },
  apa: { rotulo: "APA concluída", cls: "info" },
  sala: { rotulo: "Em sala", cls: "warn" },
  rpa: { rotulo: "Na RPA", cls: "acc" },
  alta: { rotulo: "Alta da RPA", cls: "ok" }
};
var ORDEM = ["agendado", "apa", "sala", "rpa", "alta"];

// ---------------- utilidades ----------------
function carregar() {
  try {
    var x = JSON.parse(localStorage.getItem(CHAVE));
    if (x && x.versao === 3) return x;
  } catch (e) {}
  return criarDadosIniciais();
}
function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(S)); } catch (e) {} }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function p2(n) { return (n < 10 ? "0" : "") + n; }
function agora() { var d = new Date(); return p2(d.getHours()) + ":" + p2(d.getMinutes()); }
function hMin(h) { var p = String(h).split(":"); return (+p[0]) * 60 + (+p[1] || 0); }
function minH(m) { m = ((Math.round(m) % 1440) + 1440) % 1440; return p2(Math.floor(m / 60)) + ":" + p2(m % 60); }
function horaFicha(f, t) { return minH(hMin(f.inicio) + t); }
function num(v, casas) { return Number(v).toLocaleString("pt-BR", { maximumFractionDigits: casas == null ? 2 : casas }); }
function dose(farmaco, d) { var f = FARMACOS[farmaco] || { un: "" }; return num(d) + " " + f.un; }
function usuario(id) { return USUARIOS.filter(function (u) { return u.id === id; })[0] || { nome: "—", registro: "", perfil: "" }; }
function eu() { return S.sessao ? usuario(S.sessao) : null; }
function perfil() { return PERFIS[eu().perfil]; }
function medico() { return perfil().medico; }
function ag(id) { return S.agenda.filter(function (a) { return a.id === id; })[0]; }
function sel(nome, opcoes, atual, attrs) {
  return '<select name="' + nome + '" ' + (attrs || "") + ">" + opcoes.map(function (o) {
    var v = Array.isArray(o) ? o[0] : o, r = Array.isArray(o) ? o[1] : o;
    return '<option value="' + esc(v) + '"' + (String(v) === String(atual) ? " selected" : "") + ">" + esc(r) + "</option>";
  }).join("") + "</select>";
}
function chipStatus(s) { var st = STATUS[s]; return '<span class="chip ' + st.cls + '">' + st.rotulo + "</span>"; }
function discutir(itens) {
  return '<aside class="discutir"><h3>Para discutir com a equipe</h3><ul>' + itens.map(function (i) { return "<li>" + i + "</li>"; }).join("") + "</ul></aside>";
}
function toast(msg) {
  var t = document.getElementById("toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, 3200);
}
function setStatus(atId, s) {
  var a = ag(atId);
  if (ORDEM.indexOf(s) > ORDEM.indexOf(a.status)) a.status = s;
}

// ---------------- cálculos clínicos ----------------
function imc(apa) { return apa.peso && apa.altura ? apa.peso / (apa.altura * apa.altura) : null; }
function apfel(a, apa) {
  var s = 0;
  if (a.paciente.sexo === "F") s++;
  if ((apa.comorbidades || []).indexOf("Tabagismo") < 0) s++;
  if (apa.nvpoPrevia) s++;
  if (apa.opioidePos) s++;
  return { pontos: s, risco: [10, 21, 39, 61, 79][s] };
}
function viaAerea(apa) {
  var achados = [];
  if (apa.mallampati === "III" || apa.mallampati === "IV") achados.push("Mallampati " + apa.mallampati);
  if (apa.abertura === "nao") achados.push("abertura bucal < 3 cm");
  if (apa.dtm === "nao") achados.push("DTM < 6 cm");
  if (apa.cervical === "limitada") achados.push("mobilidade cervical limitada");
  if (apa.iotDificil === "sim") achados.push("história de IOT difícil");
  return { achados: achados, alerta: apa.iotDificil === "sim" || achados.length >= 2 };
}
function aldreteTotal(av) { return av.atv + av.resp + av.circ + av.cons + av.spo2; }
function criteriosAlta(rpa) {
  var u = rpa.avaliacoes[rpa.avaliacoes.length - 1];
  if (!u) return { ok: false, itens: [["Nenhuma avaliação registrada", false]] };
  var itens = [
    ["Aldrete-Kroulik ≥ 9 (atual " + aldreteTotal(u) + ")", aldreteTotal(u) >= 9],
    ["Dor controlada, EVA ≤ 3 (atual " + u.dor + ")", u.dor <= 3],
    ["Sem náusea/vômito importante (atual " + u.nvpo + ")", u.nvpo <= 1]
  ];
  return { ok: itens.every(function (i) { return i[1]; }), itens: itens };
}
function conciliar(atId) {
  var x = S.at[atId], mapa = {}, ordem = [];
  function linha(f) { if (!mapa[f]) { mapa[f] = { farmaco: f, disp: 0, adm: 0, dev: 0, desc: 0 }; ordem.push(f); } return mapa[f]; }
  S.dispensacoes.filter(function (d) { return d.atId === atId; }).forEach(function (d) {
    Object.keys(d.itens).forEach(function (k) {
      var it = ITENS[k], l = linha(it.farmaco);
      l.disp += d.itens[k] * it.qtd;
      if (d.devolucao && d.devolucao[k]) l.dev += d.devolucao[k] * it.qtd;
    });
  });
  x.ficha.drogas.forEach(function (dr) { if (!FARMACOS[dr.farmaco].fluido) linha(dr.farmaco).adm += dr.dose; });
  S.descartes.filter(function (z) { return z.atId === atId; }).forEach(function (z) { linha(z.farmaco).desc += z.qtd; });
  return ordem.map(function (f) {
    var l = mapa[f], ctrl = FARMACOS[f].lista;
    l.dif = Math.round((l.disp - l.adm - l.dev - l.desc) * 1000) / 1000;
    l.lista = ctrl;
    if (ctrl) {
      l.situacao = l.dif === 0 ? ["Conciliado", "ok"] : l.dif > 0 ? ["Sobra sem destino registrado", "danger"] : ["Administrado sem dispensação", "danger"];
    } else {
      l.situacao = l.dif < 0 ? ["Uso acima do kit", "warn"] : l.dif > 0 ? ["Sobra (descarte comum)", ""] : ["Conciliado", "ok"];
    }
    return l;
  });
}

// ---------------- textos enviados ao MV ----------------
function cabecalhoDoc(titulo, atId) {
  var a = ag(atId), p = a.paciente;
  return titulo.toUpperCase() + "\n" +
    "Paciente: " + p.nome + " (" + p.idade + " anos, " + p.sexo + ") · Atendimento MV " + a.atendimento + " · Prontuário " + a.prontuario + "\n" +
    "Procedimento: " + a.procedimento + " · " + a.sala + " · Cirurgião: " + a.cirurgiao + "\n\n";
}
function assinatura(id, em) {
  var u = usuario(id);
  return "\n\n" + u.nome + " — " + u.registro + " — " + PERFIS[u.perfil].rotulo + "\nAssinado eletronicamente no PeriAnest às " + em + ".";
}
function textoAPA(atId) {
  var a = ag(atId), apa = S.at[atId].apa, i = imc(apa), ap = apfel(a, apa), va = viaAerea(apa);
  var simnao = function (v) { return v === "sim" ? "sim" : v === "nao" ? "não" : "—"; };
  var t = cabecalhoDoc("Avaliação pré-anestésica", atId);
  t += "Peso " + (apa.peso || "—") + " kg · Altura " + (apa.altura ? num(apa.altura) : "—") + " m · IMC " + (i ? num(i, 1) : "—") + " kg/m²\n";
  t += "Estado físico: ASA " + (apa.asa || "—") + (apa.emergencia ? " E" : "") + "\n";
  t += "Comorbidades: " + ((apa.comorbidades || []).join(", ") || "nega") + (apa.outrasComorb ? "; " + apa.outrasComorb : "") + "\n";
  t += "Alergias (registro MV): " + a.paciente.alergias + "\n";
  t += "Via aérea: Mallampati " + (apa.mallampati || "—") + "; abertura bucal ≥ 3 cm: " + simnao(apa.abertura) + "; DTM ≥ 6 cm: " + simnao(apa.dtm) +
    "; mobilidade cervical: " + (apa.cervical || "—") + "; dentição: " + (apa.denticao || "—") + "; IOT difícil prévia: " + simnao(apa.iotDificil) + ".";
  if (va.alerta) t += " ALERTA: preditores de via aérea difícil (" + va.achados.join(", ") + ").";
  t += "\nRisco de NVPO (Apfel): " + ap.pontos + "/4 (≈ " + ap.risco + "%)\n";
  t += "Jejum: sólidos desde " + (apa.jejumSolidos || "—") + "; líquidos claros desde " + (apa.jejumLiquidos || "—") + "\n";
  t += "Medicações em uso: " + (apa.medicacoes || "—") + "\n";
  t += "Exames: " + (apa.exames || "—") + "\n";
  t += "Plano anestésico: " + (apa.tecnica || "—") + (apa.plano ? " — " + apa.plano : "") + "\n";
  if (apa.reservaUti) t += "Reserva de vaga em UTI solicitada.\n";
  if (apa.reservaSangue) t += "Reserva de hemocomponentes solicitada.\n";
  t += "Termo de consentimento anestésico: " + (apa.tcle ? "assinado" : "PENDENTE");
  if (apa.assinado) t += assinatura(apa.assinado.por, apa.assinado.em);
  return t;
}
function valorCampo(d, c) { var v = d.campos[c[0]]; return v != null && v !== "" ? v : c[2]; }
function textoDescricao(atId) {
  var x = S.at[atId], d = x.descricao, m = MASCARAS[d.modelo], f = x.ficha;
  var corpo = m.texto.replace(/\{(\w+)\}/g, function (_, k) {
    var c = m.campos.filter(function (c) { return c[0] === k; })[0];
    return c ? (valorCampo(d, c) || "[" + c[1] + "]") : "";
  });
  var t = cabecalhoDoc("Descrição anestésica — " + m.rotulo, atId);
  if (f.inicio) t += "Início da anestesia: " + f.inicio + " · Técnica: " + (f.tecnica || "—") + "\n\n";
  t += corpo;
  if (d.assinado) t += assinatura(d.assinado.por, d.assinado.em);
  return t;
}
function textoFicha(atId) {
  var f = S.at[atId].ficha, b = f.balanco || {};
  var t = cabecalhoDoc("Ficha anestésica — resumo", atId);
  var fim = f.eventos.reduce(function (m, e) { return Math.max(m, e.t); }, 0);
  t += "Técnica: " + (f.tecnica || "—") + "\nInício da anestesia: " + f.inicio + " · Duração registrada: " + fim + " min\n";
  t += "Eventos: " + f.eventos.slice().sort(function (a, b) { return a.t - b.t; }).map(function (e) { return horaFicha(f, e.t) + " " + e.rotulo; }).join("; ") + "\n";
  var drogas = f.drogas.filter(function (d) { return !FARMACOS[d.farmaco].fluido; }).sort(function (a, b) { return a.t - b.t; });
  t += "Fármacos: " + drogas.map(function (d) { return d.farmaco + " " + dose(d.farmaco, d.dose) + " " + (d.via || FARMACOS[d.farmaco].via) + " (" + horaFicha(f, d.t) + ")"; }).join("; ") + "\n";
  var fl = f.drogas.filter(function (d) { return FARMACOS[d.farmaco].fluido; });
  t += "Hidratação: " + (fl.map(function (d) { return d.farmaco + " " + dose(d.farmaco, d.dose); }).join("; ") || "—") +
    " · Sangramento estimado: " + (b.sangramento ? b.sangramento + " mL" : "—") + " · Diurese: " + (b.diurese ? b.diurese + " mL" : "não medida") + "\n";
  if (f.vitais.length) {
    var r = function (k) { var v = f.vitais.map(function (x) { return x[k]; }).filter(function (x) { return x != null; }); return Math.min.apply(null, v) + "–" + Math.max.apply(null, v); };
    t += "Sinais vitais: PAS " + r("pas") + " mmHg · PAD " + r("pad") + " mmHg · FC " + r("fc") + " bpm · SpO2 " + r("spo2") + "%\n";
  }
  t += "Ficha gráfica completa disponível no PeriAnest (na versão integrada segue como PDF anexo).";
  if (f.finalizada) t += assinatura(f.finalizada.por, f.finalizada.em);
  return t;
}
function textoAlta(atId) {
  var x = S.at[atId], r = x.rpa, al = r.alta || {};
  var t = cabecalhoDoc("Evolução de alta da recuperação pós-anestésica", atId);
  t += "Admissão na RPA: " + (r.entrada || "—") + " · Técnica: " + (x.ficha.tecnica || "—") + "\n";
  t += "Avaliações seriadas:\n" + r.avaliacoes.map(function (av) {
    return "  " + av.hora + " — Aldrete-Kroulik " + aldreteTotal(av) + "/10 · dor (EVA) " + av.dor + " · NVPO " + av.nvpo;
  }).join("\n") + "\n";
  t += "Sintomáticos prescritos: " + (r.prescricao.map(function (p) { return itemProtocolo(p.id).texto; }).join("; ") || "nenhum") + "\n";
  t += "Administrados na RPA: " + (r.checagens.map(function (c) { return c.hora + " " + itemProtocolo(c.id).texto.split(",")[0] + (c.obs ? " (" + c.obs + ")" : ""); }).join("; ") || "nenhum") + "\n";
  var cr = criteriosAlta(r);
  t += "Critérios de alta: " + (cr.ok ? "atingidos" : "NÃO atingidos — alta por decisão médica") + "\n";
  t += "Destino: " + (al.destino || "—") + "\n";
  t += "Orientações: " + (al.orientacoes || "—");
  if (al.por) t += assinatura(al.por, al.em);
  return t;
}
function itemProtocolo(id) { return PROTOCOLO_RPA.filter(function (p) { return p.id === id; })[0] || { texto: id }; }
function textoDoc(o) {
  if (o.texto) return o.texto;
  if (o.tipo === "Avaliação pré-anestésica") return textoAPA(o.atId);
  if (o.tipo === "Descrição anestésica") return textoDescricao(o.atId);
  if (o.tipo === "Ficha anestésica (resumo)") return textoFicha(o.atId);
  return "";
}

// ---------------- fila de envio ao MV (simulada) ----------------
function enviarMV(tipo, atId, texto) {
  S.outbox.unshift({ id: "o" + (++S.seq), tipo: tipo, atId: atId, autor: S.sessao, em: agora(), status: "pendente", texto: texto, tentativas: 0 });
  salvar();
  processarFila();
  toast(tipo + " assinada e colocada na fila de envio ao MV.");
}
function processarFila() {
  clearTimeout(processarFila._t);
  processarFila._t = setTimeout(function () {
    var mudou = false;
    S.outbox.forEach(function (o) {
      if (o.status !== "pendente") return;
      o.tentativas++; mudou = true;
      if (S.mvForaDoAr) { o.status = "erro"; o.erro = "MV não respondeu (simulado). O envio será repetido quando o MV voltar."; }
      else { o.status = "enviado"; o.protocolo = "MV-DOC-" + (90000 + (++S.seq)); o.erro = null; }
    });
    if (mudou) { salvar(); renderSeguro(); }
  }, 1400);
}

// ---------------- telas ----------------
function telaLogin() {
  return '<div class="login"><form class="login-caixa" data-form="login">' +
    '<div class="marca"><b>PeriAnest</b><span>registro anestésico perioperatório</span></div>' +
    '<span class="selo" style="align-self:flex-start">Protótipo · dados fictícios</span>' +
    '<p class="muted small">Escolha um usuário de teste para ver o sistema pelo perfil dele. Na versão integrada, o acesso será feito com o mesmo usuário e senha do MV ou da rede do hospital.</p>' +
    '<div class="perfis">' + USUARIOS.map(function (u, i) {
      return '<label><input type="radio" name="usuario" value="' + u.id + '"' + (i === 0 ? " checked" : "") + '><span><b>' + esc(u.nome) + "</b><small>" + PERFIS[u.perfil].rotulo + " · " + u.registro + "</small></span></label>";
    }).join("") + "</div>" +
    '<label class="campo"><span>Senha (qualquer valor no protótipo)</span><input type="password" id="senha" name="senha" value="demo"></label>' +
    '<button class="btn primario" type="submit">Entrar</button></form></div>';
}

function topo() {
  var u = eu();
  return '<header class="topo"><div class="marca"><b>PeriAnest</b><span>módulo de anestesia · integrado ao MV</span></div>' +
    '<span class="selo">Protótipo · dados fictícios</span><span class="espaco"></span>' +
    '<span class="mvstatus"><span class="ponto' + (S.mvForaDoAr ? " off" : "") + '"></span>MV ' + (S.mvForaDoAr ? "indisponível" : "conectado") + " (simulado)</span>" +
    '<div class="usuario"><b>' + esc(u.nome) + "</b>" + PERFIS[u.perfil].rotulo + "</div>" +
    '<button class="btn peq" data-acao="reset">' + (UI.confirmarReset ? "Confirmar: apagar alterações" : "Restaurar exemplo") + "</button>" +
    '<button class="btn peq" data-acao="sair">Sair</button></header>';
}

function nav() {
  var v = perfil().views, pend = S.outbox.filter(function (o) { return o.status !== "enviado"; }).length;
  var itens = [
    ["agenda", "Agenda cirúrgica", "importada do MV"],
    ["atendimento", "Paciente", UI.at ? ag(UI.at).paciente.nome : ""],
    ["farmacia", "Farmácia", "kits de anestesia"],
    ["psico", "Psicotrópicos", "balanço e descarte"],
    ["mv", "Envios ao MV", pend ? pend + " pendente(s)" : "tudo enviado"],
    ["papel", "Papel no MV", "para discussão"]
  ];
  var html = '<nav class="nav"><div class="rotulo-grupo">Assistência</div>';
  itens.forEach(function (it, i) {
    if (v.indexOf(it[0]) < 0) return;
    if (it[0] === "atendimento" && !UI.at) return;
    if (i === 2) html += '<div class="rotulo-grupo">Farmácia</div>';
    if (i === 4) html += '<div class="rotulo-grupo">Integração</div>';
    html += '<button data-acao="ir" data-view="' + it[0] + '" class="' + (UI.view === it[0] ? "ativo" : "") + '"><b>' + it[1] + "</b><small>" + esc(it[2]) + "</small></button>";
  });
  return html + "</nav>";
}

// ----- Agenda -----
function vAgenda() {
  var cont = {};
  S.agenda.forEach(function (a) { cont[a.status] = (cont[a.status] || 0) + 1; });
  var linhas = S.agenda.slice().sort(function (a, b) { return hMin(a.hora) - hMin(b.hora); }).map(function (a) {
    var p = a.paciente;
    return '<tr class="clicavel" data-acao="abrir" data-id="' + a.id + '"><td class="num">' + a.hora + "</td><td>" + esc(a.sala) + "</td><td><b>" + esc(p.nome) + '</b><br><span class="muted small">' + p.idade + " a · " + p.sexo + " · " + esc(p.convenio) + " · at. " + a.atendimento + "</span>" +
      (/nenhuma/i.test(p.alergias) ? "" : ' <span class="chip danger">Alergia: ' + esc(p.alergias) + "</span>") +
      "</td><td>" + esc(a.procedimento) + '<br><span class="muted small">' + esc(a.cirurgiao) + " · " + a.previsao + " min</span></td><td>" + esc(usuario(a.anestesista).nome) + "</td><td>" + chipStatus(a.status) + "</td></tr>";
  }).join("");
  var hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  return '<div class="cabecalho"><div><h1>Agenda cirúrgica</h1><p>' + esc(hoje) + ". A lista vem da agenda do centro cirúrgico do MV. Aqui não se marca nem se altera cirurgia, só se registra a anestesia.</p></div>" +
    '<button class="btn" data-acao="sync">Atualizar agenda do MV</button></div>' +
    '<div class="linha">' + ORDEM.map(function (s) { return '<span class="chip ' + STATUS[s].cls + '">' + STATUS[s].rotulo + ": " + (cont[s] || 0) + "</span>"; }).join("") + "</div>" +
    '<div class="tabela-wrap"><table><thead><tr><th class="num">Hora</th><th>Sala</th><th>Paciente <span class="tag-mv">MV</span></th><th>Procedimento</th><th>Anestesista</th><th>Situação</th></tr></thead><tbody>' + linhas + "</tbody></table></div>" +
    discutir([
      "A agenda deve ser lida do MV em tempo real ou atualizada de tempo em tempo (ex.: a cada 5 min)?",
      "Quem distribui os anestesistas nas salas: a escala continua no MV, numa planilha, ou passa a ser feita aqui?",
      "Urgências que entram fora da agenda: o PeriAnest pode abrir o registro só com o número de atendimento?",
      "Quais situações do fluxo (agendado → APA → sala → RPA → alta) precisam voltar para o painel do centro cirúrgico no MV?"
    ]);
}

// ----- Atendimento -----
var ABAS = [["apa", "Pré-anestésica"], ["ficha", "Ficha anestésica"], ["descricao", "Descrição"], ["evolucao", "Evoluções"], ["rpa", "RPA"], ["kit", "Medicações e kit"], ["docs", "Documentos no MV"]];

function vAtendimento() {
  if (!UI.at) { UI.view = "agenda"; return vAgenda(); }
  var a = ag(UI.at), p = a.paciente, x = S.at[UI.at], i = ORDEM.indexOf(a.status);
  var docs = S.outbox.filter(function (o) { return o.atId === UI.at; }).length;
  var cab = '<section class="paciente"><div class="nome"><h1>' + esc(p.nome) + '</h1><span class="muted">' + p.idade + " anos · " + p.sexo + " · " + esc(p.convenio) + "</span>" + chipStatus(a.status) + "</div>" +
    '<div class="dados"><span>Atendimento <b class="mono">' + a.atendimento + '</b><span class="tag-mv">MV</span></span><span>Prontuário <b class="mono">' + a.prontuario + "</b></span><span>Procedimento <b>" + esc(a.procedimento) + "</b></span><span>" + esc(a.sala) + " · <b>" + a.hora + "</b></span><span>Cirurgião <b>" + esc(a.cirurgiao) + "</b></span><span>Anestesista <b>" + esc(usuario(a.anestesista).nome) + "</b></span></div>" +
    (/nenhuma/i.test(p.alergias) ? "" : '<div class="alerta">Alergia registrada no MV: ' + esc(p.alergias) + "</div>") +
    '<div class="fluxo">' + ORDEM.map(function (s, k) { return '<span class="' + (k < i ? "feito" : k === i ? "atual" : "") + '">' + STATUS[s].rotulo + "</span>"; }).join("") + "</div></section>";
  var abas = '<div class="abas">' + ABAS.map(function (ab) {
    var extra = "";
    if (ab[0] === "apa" && x.apa.assinado) extra = '<span class="chip ok">assinada</span>';
    if (ab[0] === "docs") extra = '<span class="chip">' + docs + "</span>";
    return '<button data-acao="aba" data-aba="' + ab[0] + '" class="' + (UI.aba === ab[0] ? "ativo" : "") + '">' + ab[1] + extra + "</button>";
  }).join("") + "</div>";
  var corpo = { apa: abaAPA, ficha: abaFicha, descricao: abaDescricao, evolucao: abaEvolucao, rpa: abaRPA, kit: abaKit, docs: abaDocs }[UI.aba]();
  return cab + abas + corpo;
}

function inp(campo, valor, tipo, extra) {
  return '<input type="' + (tipo || "text") + '" id="c-' + campo.replace(/\./g, "-") + '" data-campo="' + campo + '" value="' + esc(valor == null ? "" : valor) + '" ' + (extra || "") + ">";
}
function selC(campo, opcoes, atual, extra) {
  return '<select id="c-' + campo.replace(/\./g, "-") + '" data-campo="' + campo + '" ' + (extra || "") + ">" + opcoes.map(function (o) {
    var v = Array.isArray(o) ? o[0] : o, r = Array.isArray(o) ? o[1] : o;
    return '<option value="' + esc(v) + '"' + (String(v) === String(atual == null ? "" : atual) ? " selected" : "") + ">" + esc(r) + "</option>";
  }).join("") + "</select>";
}
function campo(rotulo, html, largo) { return '<label class="campo' + (largo ? " largo" : "") + '"><span>' + rotulo + "</span>" + html + "</label>"; }
var SN = [["", "—"], ["sim", "Sim"], ["nao", "Não"]];

function abaAPA() {
  var a = ag(UI.at), apa = S.at[UI.at].apa, trava = !medico() || !!apa.assinado, dis = trava ? "disabled" : "";
  var comorb = ["HAS", "DM", "Asma/DPOC", "Cardiopatia isquêmica", "Insuficiência cardíaca", "Arritmia", "DRC", "Hepatopatia", "Apneia do sono", "Obesidade", "Tabagismo", "Etilismo", "Anticoagulado", "Gestante"];
  var html = '<div class="grade-2"><div class="painel">' +
    "<header><h2>Avaliação pré-anestésica</h2>" + (apa.assinado ? '<span class="chip ok">Assinada por ' + esc(usuario(apa.assinado.por).nome) + " às " + apa.assinado.em + "</span>" : '<span class="chip warn">Em preenchimento</span>') + "</header>" +
    (trava && !apa.assinado ? '<div class="alerta info">Somente médicos preenchem e assinam a avaliação pré-anestésica.</div>' : "") +
    "<fieldset><legend>Dados do MV</legend><p class=\"small muted\">Vêm do cadastro do paciente no MV e não são editados aqui.</p>" +
    '<div class="campos"><div class="campo"><span>Idade / sexo</span><b>' + a.paciente.idade + " anos · " + a.paciente.sexo + '</b></div><div class="campo"><span>Convênio</span><b>' + esc(a.paciente.convenio) + '</b></div><div class="campo"><span>Alergias</span><b>' + esc(a.paciente.alergias) + '</b></div><div class="campo"><span>Cirurgia</span><b>' + esc(a.procedimento) + "</b></div></div></fieldset>" +
    "<fieldset><legend>Antropometria e estado físico</legend><div class=\"campos\">" +
    campo("Peso (kg)", inp("apa.peso", apa.peso, "number", 'step="0.1" ' + dis)) +
    campo("Altura (m)", inp("apa.altura", apa.altura, "number", 'step="0.01" ' + dis)) +
    '<div class="campo"><span>IMC</span><b class="num" data-calc="imc"></b></div>' +
    campo("ASA", selC("apa.asa", ["", "I", "II", "III", "IV", "V", "VI"], apa.asa, dis)) +
    '<label class="campo"><span>Emergência</span><span class="checks"><label><input type="checkbox" data-campo="apa.emergencia" ' + (apa.emergencia ? "checked " : "") + dis + "> sufixo E</label></span></label>" +
    "</div></fieldset>" +
    "<fieldset><legend>Comorbidades</legend><div class=\"checks\">" + comorb.map(function (c) {
      return '<label><input type="checkbox" data-campo="apa.comorbidades" data-lista="1" value="' + c + '" ' + ((apa.comorbidades || []).indexOf(c) >= 0 ? "checked " : "") + dis + "> " + c + "</label>";
    }).join("") + "</div>" + campo("Outras", inp("apa.outrasComorb", apa.outrasComorb, "text", dis), true) + "</fieldset>" +
    "<fieldset><legend>Via aérea</legend><div class=\"campos\">" +
    campo("Mallampati", selC("apa.mallampati", ["", "I", "II", "III", "IV"], apa.mallampati, dis)) +
    campo("Abertura bucal ≥ 3 cm", selC("apa.abertura", SN, apa.abertura, dis)) +
    campo("Distância tireomentoniana ≥ 6 cm", selC("apa.dtm", SN, apa.dtm, dis)) +
    campo("Mobilidade cervical", selC("apa.cervical", [["", "—"], ["normal", "Normal"], ["limitada", "Limitada"]], apa.cervical, dis)) +
    campo("Dentição", selC("apa.denticao", [["", "—"], ["normal", "Normal"], ["protese", "Prótese"], ["dentes frouxos", "Dentes frouxos"]], apa.denticao, dis)) +
    campo("IOT difícil prévia", selC("apa.iotDificil", SN, apa.iotDificil, dis)) +
    '</div><div data-calc="viaaerea"></div></fieldset>' +
    "<fieldset><legend>Náuseas e vômitos (escore de Apfel)</legend><div class=\"checks\">" +
    '<label><input type="checkbox" data-campo="apa.nvpoPrevia" ' + (apa.nvpoPrevia ? "checked " : "") + dis + "> NVPO ou cinetose prévia</label>" +
    '<label><input type="checkbox" data-campo="apa.opioidePos" ' + (apa.opioidePos ? "checked " : "") + dis + "> Opioide previsto no pós-operatório</label>" +
    '</div><p class="small muted">Sexo feminino e tabagismo são lidos do cadastro e das comorbidades.</p><div data-calc="apfel"></div></fieldset>' +
    "<fieldset><legend>Jejum, medicações e exames</legend><div class=\"campos\">" +
    campo("Sólidos desde", inp("apa.jejumSolidos", apa.jejumSolidos, "time", dis)) +
    campo("Líquidos claros desde", inp("apa.jejumLiquidos", apa.jejumLiquidos, "time", dis)) +
    campo("Medicações em uso", '<textarea data-campo="apa.medicacoes" id="c-apa-medicacoes" ' + dis + ">" + esc(apa.medicacoes) + "</textarea>", true) +
    campo("Exames relevantes", '<textarea data-campo="apa.exames" id="c-apa-exames" ' + dis + ">" + esc(apa.exames) + "</textarea>", true) +
    "</div></fieldset>" +
    "<fieldset><legend>Plano anestésico</legend><div class=\"campos\">" +
    campo("Técnica proposta", selC("apa.tecnica", [""].concat(TECNICAS), apa.tecnica, dis)) +
    campo("Observações do plano", inp("apa.plano", apa.plano, "text", dis)) +
    "</div><div class=\"checks\">" +
    '<label><input type="checkbox" data-campo="apa.reservaUti" ' + (apa.reservaUti ? "checked " : "") + dis + "> Reserva de UTI</label>" +
    '<label><input type="checkbox" data-campo="apa.reservaSangue" ' + (apa.reservaSangue ? "checked " : "") + dis + "> Reserva de hemocomponentes</label>" +
    '<label><input type="checkbox" data-campo="apa.tcle" ' + (apa.tcle ? "checked " : "") + dis + "> Termo de consentimento anestésico assinado</label>" +
    "</div></fieldset>" +
    (trava ? "" : '<div class="linha"><button class="btn primario" data-acao="assinar-apa">Assinar e enviar ao MV</button><span class="small muted">Depois de assinada, a avaliação só pode ser complementada por evolução.</span></div>') +
    "</div>" +
    '<div class="painel"><header><h3>Como o texto chega ao prontuário do MV</h3></header><div class="doc-mv" data-calc="apa-texto"></div></div></div>' +
    discutir([
      "A APA feita no ambulatório (dias antes) é registrada aqui ou continua no MV? Como evitar que exista em dois lugares?",
      "Quais campos são obrigatórios para liberar o paciente para a sala?",
      "Exames e medicações em uso podem ser puxados do MV automaticamente?",
      "O alerta de via aérea difícil deve aparecer também no painel do centro cirúrgico do MV?"
    ]);
  return html;
}

// ----- Ficha anestésica -----
function fichaSVG(f) {
  var maxT = 0;
  f.vitais.forEach(function (v) { maxT = Math.max(maxT, v.t); });
  f.drogas.forEach(function (d) { maxT = Math.max(maxT, d.t); });
  f.eventos.forEach(function (e) { maxT = Math.max(maxT, e.t); });
  var dur = Math.max(60, Math.ceil((maxT + 10) / 15) * 15);
  var W = 980, L = 150, R = 16, y0 = 40, H = 220, linha = 17;
  var farmacos = [];
  f.drogas.slice().sort(function (a, b) { return a.t - b.t; }).forEach(function (d) { if (farmacos.indexOf(d.farmaco) < 0) farmacos.push(d.farmaco); });
  var yTempo = y0 + H + 14, yS = yTempo + 12, yE = yS + linha, yD = yE + linha;
  var total = yD + farmacos.length * linha + 10;
  var x = function (t) { return L + t * (W - L - R) / dur; };
  var y = function (v) { return y0 + H - Math.max(0, Math.min(220, v)) / 220 * H; };
  var s = '<svg class="ficha-svg" viewBox="0 0 ' + W + " " + total + '" role="img" aria-label="Ficha anestésica gráfica"><rect class="bg" x="0" y="0" width="' + W + '" height="' + total + '"/>';
  for (var v = 0; v <= 220; v += 10) s += '<line class="' + (v % 40 === 0 ? "gs" : "g") + '" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/>';
  for (var t = 0; t <= dur; t += 5) {
    s += '<line class="' + (t % 15 === 0 ? "gs" : "g") + '" x1="' + x(t) + '" x2="' + x(t) + '" y1="' + y0 + '" y2="' + (total - 6) + '"/>';
    if (t % 15 === 0) s += '<text x="' + x(t) + '" y="' + yTempo + '" text-anchor="middle">' + horaFicha(f, t) + "</text>";
  }
  for (v = 0; v <= 220; v += 40) s += '<text x="' + (L - 6) + '" y="' + (y(v) + 3) + '" text-anchor="end">' + v + "</text>";
  s += '<text class="lbl" x="8" y="' + (y0 + 12) + '">mmHg / bpm</text>';
  f.eventos.slice().sort(function (a, b) { return a.t - b.t; }).forEach(function (e, k) {
    s += '<line class="ev" x1="' + x(e.t) + '" x2="' + x(e.t) + '" y1="' + (y0 - 4) + '" y2="' + (y0 + H) + '"/>';
    s += '<text class="ev-t" x="' + (x(e.t) + 3) + '" y="' + (k % 2 ? 26 : 13) + '">' + esc(e.rotulo) + "</text>";
  });
  var fcPts = [];
  f.vitais.forEach(function (vt) {
    var cx = x(vt.t);
    if (vt.pas != null && vt.pad != null) s += '<line class="pa-l" x1="' + cx + '" x2="' + cx + '" y1="' + y(vt.pas) + '" y2="' + y(vt.pad) + '"/>';
    if (vt.pas != null) s += '<path class="pa" d="M' + (cx - 4) + " " + (y(vt.pas) - 7) + " L" + cx + " " + y(vt.pas) + " L" + (cx + 4) + " " + (y(vt.pas) - 7) + '"/>';
    if (vt.pad != null) s += '<path class="pa" d="M' + (cx - 4) + " " + (y(vt.pad) + 7) + " L" + cx + " " + y(vt.pad) + " L" + (cx + 4) + " " + (y(vt.pad) + 7) + '"/>';
    if (vt.fc != null) { fcPts.push(cx + "," + y(vt.fc)); s += '<circle class="fc" cx="' + cx + '" cy="' + y(vt.fc) + '" r="2.8"/>'; }
    if (vt.spo2 != null) s += '<text x="' + cx + '" y="' + (yS + 4) + '" text-anchor="middle">' + vt.spo2 + "</text>";
    if (vt.etco2 != null) s += '<text x="' + cx + '" y="' + (yE + 4) + '" text-anchor="middle">' + vt.etco2 + "</text>";
  });
  if (fcPts.length > 1) s += '<polyline class="fc-l" points="' + fcPts.join(" ") + '"/>';
  s += '<text class="lbl" x="8" y="' + (yS + 4) + '">SpO₂ (%)</text><text class="lbl" x="8" y="' + (yE + 4) + '">EtCO₂ (mmHg)</text>';
  farmacos.forEach(function (fm, k) {
    var yy = yD + k * linha + 4, ctrl = FARMACOS[fm].lista;
    s += '<text class="lbl" x="8" y="' + yy + '">' + esc(fm.length > 22 ? fm.slice(0, 21) + "…" : fm) + " (" + FARMACOS[fm].un + ")</text>";
    f.drogas.filter(function (d) { return d.farmaco === fm; }).forEach(function (d) {
      s += '<text class="dose' + (ctrl ? " ctrl" : "") + '" x="' + x(d.t) + '" y="' + yy + '" text-anchor="middle">' + num(d.dose) + "</text>";
    });
  });
  return s + "</svg>";
}

function abaFicha() {
  var a = ag(UI.at), x = S.at[UI.at], f = x.ficha, med = medico();
  if (!f.inicio) {
    return '<div class="painel"><h2>Anestesia ainda não iniciada</h2><p class="muted">A ficha começa a contar o tempo a partir do início da anestesia. Técnica prevista na APA: <b>' + esc(x.apa.tecnica || "não definida") + "</b>.</p>" +
      (med ? '<div class="linha"><button class="btn primario" data-acao="iniciar">Iniciar anestesia agora</button></div>' : '<p class="small muted">Somente o anestesiologista inicia a ficha.</p>') + "</div>";
  }
  var aberta = med && !f.finalizada;
  var ultimo = f.vitais.length ? f.vitais[f.vitais.length - 1].t : -5, prox = ultimo + 5;
  var u = f.vitais[f.vitais.length - 1] || {};
  var opF = Object.keys(FARMACOS).map(function (k) { return [k, k + (FARMACOS[k].lista ? " — controlado " + FARMACOS[k].lista : "")]; });
  var cristal = f.drogas.filter(function (d) { return FARMACOS[d.farmaco].fluido; }).reduce(function (s, d) { return s + d.dose; }, 0);
  var html = '<div class="painel"><header><div class="linha"><h2>Ficha anestésica</h2>' + (f.finalizada ? '<span class="chip ok">Finalizada às ' + f.finalizada.em + "</span>" : '<span class="chip warn">Em andamento</span>') + "</div>" +
    '<div class="linha small muted">Início ' + f.inicio + " · " + esc(f.tecnica || "técnica não definida") + "</div></header>" +
    '<div class="legenda"><span><i style="color:var(--pa)">∨</i> PAS</span><span><i style="color:var(--pa)">∧</i> PAD</span><span><i style="color:var(--fc)">●</i> FC</span><span><i style="color:var(--danger)">123</i> dose de controlado</span><span>linhas tracejadas: eventos</span></div>' +
    '<div class="ficha-wrap">' + fichaSVG(f) + "</div>";
  if (aberta) {
    html += '<div class="grade">' +
      '<form class="painel" data-form="vital"><h3>Sinais vitais · ' + horaFicha(f, prox) + "</h3>" +
      '<input type="hidden" name="t" value="' + prox + '"><div class="campos" style="grid-template-columns:repeat(auto-fit,minmax(90px,1fr))">' +
      campo("PAS", '<input type="number" name="pas" id="v-pas" value="' + (u.pas || "") + '">') + campo("PAD", '<input type="number" name="pad" id="v-pad" value="' + (u.pad || "") + '">') +
      campo("FC", '<input type="number" name="fc" id="v-fc" value="' + (u.fc || "") + '">') + campo("SpO₂", '<input type="number" name="spo2" id="v-spo2" value="' + (u.spo2 || "") + '">') +
      campo("EtCO₂", '<input type="number" name="etco2" id="v-etco2" value="' + (u.etco2 == null ? "" : u.etco2) + '">') +
      '</div><button class="btn primario">Registrar</button><p class="small muted">Vem preenchido com o último valor, para agilizar. Na fase 2, os valores virão do monitor.</p></form>' +
      '<form class="painel" data-form="droga"><h3>Fármaco ou fluido</h3><div class="campos">' +
      campo("Fármaco", sel("farmaco", opF, "Fentanil", 'id="d-farmaco"'), true) + campo("Dose", '<input type="number" step="any" name="dose" id="d-dose" required>') +
      campo("Via", sel("via", [["", "padrão"], "EV", "IT", "Peridural", "Perineural", "IM", "SC"], "", 'id="d-via"')) +
      campo("Minuto", '<input type="number" name="t" id="d-t" value="' + Math.max(0, ultimo) + '">') +
      '</div><button class="btn primario">Registrar</button><p class="small muted">Controlados (Portaria 344) entram automaticamente no balanço da farmácia.</p></form>' +
      '<form class="painel" data-form="evento"><h3>Evento</h3><div class="campos">' +
      campo("Evento", sel("rotulo", EVENTOS, "Incisão", 'id="e-rotulo"'), true) + campo("Minuto", '<input type="number" name="t" id="e-t" value="' + Math.max(0, ultimo) + '">') +
      "</div><button class=\"btn primario\">Marcar</button></form></div>";
  }
  html += '<div class="grade-2"><div class="tabela-wrap"><table><thead><tr><th>Hora</th><th>Fármaco</th><th class="num">Dose</th><th>Via</th><th></th></tr></thead><tbody>' +
    f.drogas.map(function (d, k) { return { d: d, k: k }; }).sort(function (a, b) { return a.d.t - b.d.t; }).map(function (o) {
      var d = o.d, fm = FARMACOS[d.farmaco];
      return "<tr><td class=\"num\">" + horaFicha(f, d.t) + "</td><td>" + esc(d.farmaco) + (fm.lista ? ' <span class="chip danger">' + fm.lista + "</span>" : "") + '</td><td class="num">' + dose(d.farmaco, d.dose) + "</td><td>" + (d.via || fm.via) + "</td><td>" +
        (aberta ? '<button class="btn peq perigo" data-acao="rm-droga" data-i="' + o.k + '">remover</button>' : "") + "</td></tr>";
    }).join("") + "</tbody></table></div>" +
    '<div class="painel"><h3>Balanço</h3><div class="campos"><div class="campo"><span>Cristaloides</span><b class="num">' + num(cristal) + " mL</b></div>" +
    campo("Sangramento estimado (mL)", inp("ficha.balanco.sangramento", f.balanco.sangramento, "number", aberta ? "" : "disabled")) +
    campo("Diurese (mL)", inp("ficha.balanco.diurese", f.balanco.diurese, "number", aberta ? "" : "disabled")) + "</div>" +
    (aberta ? '<button class="btn primario" data-acao="finalizar-ficha">Finalizar ficha, enviar resumo ao MV e encaminhar à RPA</button>' : "") + "</div></div></div>" +
    discutir([
      "Intervalo padrão de registro: 5 minutos? Muda conforme o porte da cirurgia?",
      "Quais monitores existem nas salas (marca/modelo)? Eles exportam dados (HL7 ou gateway do fabricante)?",
      "O que vai para o MV: só o resumo em texto, o PDF da ficha gráfica, ou os dois?",
      "Precisamos registrar infusões contínuas (remifentanil, noradrenalina) com início e fim, além dos bolus?",
      "A ficha deve funcionar sem rede (tablet) e sincronizar depois?"
    ]);
  return html;
}

// ----- Descrição -----
function abaDescricao() {
  var x = S.at[UI.at], d = x.descricao, m = MASCARAS[d.modelo], trava = !medico() || !!d.assinado, dis = trava ? "disabled" : "";
  var html = '<div class="grade-2"><div class="painel"><header><h2>Descrição anestésica</h2>' +
    (d.assinado ? '<span class="chip ok">Assinada às ' + d.assinado.em + "</span>" : '<span class="chip warn">Rascunho</span>') + "</header>" +
    '<div class="campos">' + campo("Máscara", selC("descricao.modelo", Object.keys(MASCARAS).map(function (k) { return [k, MASCARAS[k].rotulo]; }), d.modelo, 'data-rerender="1" ' + dis)) + "</div>" +
    (trava ? "" : '<div class="linha"><button class="btn peq" data-acao="preencher-desc">Preencher fármacos a partir da ficha</button></div>') +
    '<div class="campos">' + m.campos.map(function (c) {
      return campo(c[1], '<textarea rows="2" style="min-height:44px" data-campo="descricao.campos.' + c[0] + '" id="c-desc-' + c[0] + '" placeholder="' + esc(c[2] || "preencher") + '" ' + dis + ">" + esc(valorCampo(d, c)) + "</textarea>", true);
    }).join("") + "</div>" +
    (trava ? "" : '<div class="linha"><button class="btn primario" data-acao="assinar-desc">Assinar e enviar ao MV</button></div>') + "</div>" +
    '<div class="painel"><header><h3>Texto final</h3></header><div class="doc-mv" data-calc="desc-texto"></div></div></div>' +
    discutir([
      "Quais máscaras precisamos (cesárea, pediatria, bloqueios específicos, anestesia para exames)?",
      "Quem cria e aprova as máscaras? Cada anestesista pode ter as suas próprias?",
      "No MV, a descrição anestésica deve aparecer como documento próprio ou junto da descrição cirúrgica?"
    ]);
  return html;
}

// ----- Evoluções -----
var FRASES = ["Paciente acordado, orientado, sem queixas.", "Sem cefaleia pós-punção.", "Sem sinais de bloqueio residual.", "Dor controlada com analgesia prescrita.", "Sem náuseas ou vômitos.", "Orientado sobre o procedimento e a anestesia; dúvidas esclarecidas."];
function abaEvolucao() {
  var x = S.at[UI.at], med = medico();
  var lista = x.evolucoes.length ? x.evolucoes.slice().reverse().map(function (e) {
    return '<div class="painel"><header><b>' + esc(e.tipo) + '</b><span class="small muted">' + e.em + " · " + esc(usuario(e.por).nome) + '</span></header><p style="white-space:pre-wrap">' + esc(e.texto) + "</p></div>";
  }).join("") : '<p class="muted">Nenhuma evolução anestésica registrada para este atendimento.</p>';
  return '<div class="grade-2"><div style="display:flex;flex-direction:column;gap:12px;min-width:0">' + lista + "</div>" +
    (med ? '<form class="painel" data-form="evolucao"><h2>Nova evolução</h2>' +
      campo("Tipo", sel("tipo", ["Visita pré-anestésica", "Evolução intraoperatória", "Visita pós-anestésica (24 h)", "Intercorrência"], "Visita pós-anestésica (24 h)", 'id="evo-tipo"')) +
      '<div class="linha">' + FRASES.map(function (fr, k) { return '<button type="button" class="btn peq" data-acao="frase" data-k="' + k + '">' + esc(fr.split(" ").slice(0, 3).join(" ")) + "…</button>"; }).join("") + "</div>" +
      campo("Texto", '<textarea name="texto" id="evo-texto" rows="6" required></textarea>') +
      '<button class="btn primario">Assinar e enviar ao MV</button></form>' : '<div class="painel"><p class="muted">Evoluções anestésicas são registradas por médicos.</p></div>') + "</div>" +
    discutir(["A visita pós-anestésica de 24 h será feita no PeriAnest ou direto no MV?", "Que frases prontas a equipe mais usa?"]);
}

// ----- RPA -----
function abaRPA() {
  var a = ag(UI.at), x = S.at[UI.at], r = x.rpa, med = medico(), pode = med || eu().perfil === "enfermagem";
  if (!r.entrada) {
    return '<div class="painel"><h2>Paciente ainda não está na RPA</h2><p class="muted">A admissão acontece quando o anestesiologista finaliza a ficha, ou pode ser feita aqui pela enfermagem.</p>' +
      (pode && a.status === "sala" ? '<div class="linha"><button class="btn primario" data-acao="admitir-rpa">Admitir na RPA agora</button></div>' : "") + "</div>";
  }
  var fechada = !!r.alta;
  var opts = function (k) { return ALDRETE[k].map(function (l, i) { return [i, i + " — " + l]; }); };
  var aval = r.avaliacoes.map(function (av) {
    var tot = aldreteTotal(av);
    return '<tr><td class="num">' + av.hora + '</td><td class="num">' + av.atv + '</td><td class="num">' + av.resp + '</td><td class="num">' + av.circ + '</td><td class="num">' + av.cons + '</td><td class="num">' + av.spo2 + '</td><td><span class="chip ' + (tot >= 9 ? "ok" : "warn") + '">' + tot + '/10</span></td><td class="num">' + av.dor + '</td><td class="num">' + av.nvpo + "</td><td>" + esc(usuario(av.por).nome) + "</td></tr>";
  }).join("");
  var alergia = a.paciente.alergias.toLowerCase();
  var prescritos = r.prescricao.map(function (p) { return p.id; });
  var cr = criteriosAlta(r);

  var html = '<div class="painel"><header><h2>Recuperação pós-anestésica</h2><span class="small muted">Admissão às ' + r.entrada + " · " + esc(x.ficha.tecnica || "") + "</span></header>" +
    '<div class="tabela-wrap"><table><thead><tr><th>Hora</th><th class="num">Ativ.</th><th class="num">Resp.</th><th class="num">Circ.</th><th class="num">Consc.</th><th class="num">SpO₂</th><th>Aldrete</th><th class="num">Dor</th><th class="num">NVPO</th><th>Registro</th></tr></thead><tbody>' + (aval || '<tr><td colspan="10" class="muted">Nenhuma avaliação ainda.</td></tr>') + "</tbody></table></div>" +
    (pode && !fechada ? '<form data-form="aldrete" class="campos">' +
      campo("Hora", '<input type="time" name="hora" id="al-hora" value="' + agora() + '">') +
      campo("Atividade", sel("atv", opts("atv"), 2, 'id="al-atv"')) + campo("Respiração", sel("resp", opts("resp"), 2, 'id="al-resp"')) +
      campo("Circulação", sel("circ", opts("circ"), 2, 'id="al-circ"')) + campo("Consciência", sel("cons", opts("cons"), 2, 'id="al-cons"')) +
      campo("SpO₂", sel("spo2", opts("spo2"), 2, 'id="al-spo2"')) + campo("Dor (EVA 0–10)", '<input type="number" min="0" max="10" name="dor" id="al-dor" value="2">') +
      campo("NVPO", sel("nvpo", [[0, "0 — ausente"], [1, "1 — náusea"], [2, "2 — vômito"], [3, "3 — vômitos repetidos"]], 0, 'id="al-nvpo"')) +
      '<div class="campo"><span>&nbsp;</span><button class="btn primario">Registrar avaliação</button></div></form>' : "") + "</div>";

  html += '<div class="grade-2"><div class="painel"><header><h3>Prescrição de sintomáticos</h3><span class="chip warn">Protocolo de exemplo</span></header>';
  if (r.prescricao.length) {
    html += '<div class="tabela-wrap"><table><thead><tr><th>Item</th><th>Prescrito</th><th>Checagem</th><th></th></tr></thead><tbody>' + r.prescricao.map(function (p) {
      var ch = r.checagens.filter(function (c) { return c.id === p.id; });
      return "<tr><td>" + esc(itemProtocolo(p.id).texto) + '</td><td class="small">' + p.em + "<br>" + esc(usuario(p.por).nome) + '</td><td class="small">' + (ch.map(function (c) { return c.hora + " " + esc(usuario(c.por).nome.split(" ").slice(0, 2).join(" ")) + (c.obs ? " (" + esc(c.obs) + ")" : ""); }).join("<br>") || "—") + "</td><td>" +
        (pode && !fechada ? '<button class="btn peq" data-acao="checar" data-id="' + p.id + '">Checar</button>' : "") + "</td></tr>";
    }).join("") + "</tbody></table></div>";
  }
  if (med && !fechada) {
    html += '<form data-form="prescrever" class="checks" style="flex-direction:column;align-items:flex-start">' + PROTOCOLO_RPA.filter(function (p) { return prescritos.indexOf(p.id) < 0; }).map(function (p) {
      var al = p.farmaco && alergia.indexOf(p.farmaco.toLowerCase()) >= 0;
      return '<label><input type="checkbox" name="item" value="' + p.id + '"' + (al ? " disabled" : "") + "> " + esc(p.texto) + (al ? ' <span class="chip danger">bloqueado: alergia registrada no MV</span>' : "") + "</label>";
    }).join("") + '<button class="btn primario">Prescrever selecionados</button></form>';
  }
  html += "</div>";

  html += '<div class="painel"><header><h3>Alta da RPA</h3>' + (fechada ? '<span class="chip ok">Alta às ' + r.alta.em + "</span>" : "") + "</header>" +
    cr.itens.map(function (i) { return '<div class="linha"><span class="chip ' + (i[1] ? "ok" : "warn") + '">' + (i[1] ? "atingido" : "pendente") + "</span>" + esc(i[0]) + "</div>"; }).join("");
  if (fechada) {
    html += '<div class="doc-mv">' + esc(textoAlta(UI.at)) + "</div>";
  } else if (med) {
    html += '<form data-form="alta" class="campos">' + campo("Destino", sel("destino", ["Enfermaria", "Apartamento", "UTI", "Alta hospitalar (hospital-dia)"], "Enfermaria", 'id="alta-destino"'), true) +
      campo("Orientações", '<textarea name="orientacoes" id="alta-orient">Manter analgesia conforme prescrição da equipe cirúrgica. Liberar dieta conforme tolerância. Comunicar anestesia se dor não controlada, sonolência excessiva ou vômitos.</textarea>', true) +
      (cr.ok ? "" : '<div class="alerta warn campo largo">Critérios ainda não atingidos. Se der alta mesmo assim, o texto registra "alta por decisão médica".</div>') +
      '<div class="campo largo"><button class="btn primario">Assinar evolução de alta e enviar ao MV</button></div></form>';
  } else {
    html += '<p class="small muted">A alta da RPA é assinada pelo anestesiologista.</p>';
  }
  html += "</div></div>" + discutir([
    "A prescrição de sintomáticos da RPA deve entrar na prescrição eletrônica do MV, para a farmácia dispensar e o convênio ser cobrado? Ou fica só aqui, com estoque próprio da RPA?",
    "Quem aprova o protocolo de sintomáticos (coordenação, farmácia, CCIH)?",
    "Critério de alta: Aldrete-Kroulik ≥ 9 para todos? Pacientes de hospital-dia usam PADSS?",
    "A enfermagem da RPA registra aqui ou continua com a evolução de enfermagem no MV?"
  ]);
  return html;
}

// ----- Medicações e kit -----
function abaKit() {
  var linhas = conciliar(UI.at), disp = S.dispensacoes.filter(function (d) { return d.atId === UI.at; });
  if (!disp.length && !linhas.length) return '<div class="painel"><p class="muted">Nenhum kit dispensado e nenhum fármaco registrado para este paciente.</p></div>';
  return '<div class="painel"><header><h2>Conciliação: farmácia × ficha anestésica</h2>' + disp.map(function (d) { return '<span class="chip">' + KITS[d.kit].nome + " · " + d.em + (d.devolucao ? " · devolvido" : " · em uso") + "</span>"; }).join("") + "</header>" +
    '<p class="small muted">Dispensado = administrado (ficha) + devolvido + descartado. Para controlados, qualquer diferença precisa de justificativa.</p>' +
    tabelaConciliacao(linhas) + "</div>";
}
function tabelaConciliacao(linhas, comPaciente) {
  return '<div class="tabela-wrap"><table><thead><tr>' + (comPaciente ? "<th>Paciente</th>" : "") + '<th>Fármaco</th><th class="num">Dispensado</th><th class="num">Administrado</th><th class="num">Devolvido</th><th class="num">Descartado</th><th class="num">Diferença</th><th>Situação</th></tr></thead><tbody>' +
    linhas.map(function (l) {
      var un = FARMACOS[l.farmaco].un, f = function (v) { return num(v) + " " + un; };
      return "<tr>" + (comPaciente ? "<td>" + esc(ag(l.atId).paciente.nome) + '<br><span class="small muted">' + ag(l.atId).sala + "</span></td>" : "") +
        "<td>" + esc(l.farmaco) + (l.lista ? ' <span class="chip danger">' + l.lista + "</span>" : "") + '</td><td class="num">' + f(l.disp) + '</td><td class="num">' + f(l.adm) + '</td><td class="num">' + f(l.dev) + '</td><td class="num">' + f(l.desc) + '</td><td class="num"><b>' + f(l.dif) + '</b></td><td><span class="chip ' + l.situacao[1] + '">' + l.situacao[0] + "</span></td></tr>";
    }).join("") + "</tbody></table></div>";
}

// ----- Documentos -----
function abaDocs() {
  var docs = S.outbox.filter(function (o) { return o.atId === UI.at; });
  if (!docs.length) return '<div class="painel"><p class="muted">Nenhum documento enviado ao MV para este atendimento.</p></div>';
  return tabelaOutbox(docs, false);
}

// ----- Farmácia -----
function vFarmacia() {
  var farm = eu().perfil === "farmacia";
  var medicos = USUARIOS.filter(function (u) { return PERFIS[u.perfil].medico; });
  var linhas = S.dispensacoes.slice().reverse().map(function (d) {
    var a = ag(d.atId);
    var row = "<tr><td class=\"num\">" + d.em + "</td><td>" + esc(a.paciente.nome) + '<br><span class="small muted">at. ' + a.atendimento + "</span></td><td>" + esc(a.sala) + "</td><td>" + KITS[d.kit].nome + "</td><td>" + esc(usuario(d.recebido).nome) + "</td><td>" +
      (d.devolucao ? '<span class="chip ok">Devolvido ' + d.devolucao._em + "</span>" : '<span class="chip warn">Em uso</span>') + "</td><td>" +
      (farm && !d.devolucao ? '<button class="btn peq" data-acao="devolver" data-id="' + d.id + '">Registrar devolução</button>' : "") + "</td></tr>";
    if (UI.devolver === d.id) {
      row += '<tr><td colspan="7"><form data-form="devolucao" data-id="' + d.id + '" class="painel"><h3>Devolução do ' + KITS[d.kit].nome + " — " + esc(a.paciente.nome) + '</h3><p class="small muted">Informe quantas unidades fechadas voltaram. As ampolas abertas com sobra de controlado vão para o registro de descarte, com testemunha.</p><div class="campos">' +
        Object.keys(d.itens).map(function (k) { return campo(esc(ITENS[k].nome) + " (saíram " + d.itens[k] + ")", '<input type="number" min="0" max="' + d.itens[k] + '" name="' + k + '" id="dev-' + k + '" value="0">'); }).join("") +
        '</div><div class="linha"><button class="btn primario">Confirmar devolução</button><button type="button" class="btn" data-acao="devolver" data-id="">Cancelar</button></div></form></td></tr>';
    }
    return row;
  }).join("");
  return '<div class="cabecalho"><div><h1>Farmácia · kits de anestesia</h1><p>Cada kit sai da farmácia vinculado ao paciente, à sala e ao anestesista que recebe. Na devolução, o sistema confere o que voltou contra o que foi registrado na ficha.</p></div></div>' +
    '<div class="grade-2"><div class="painel"><h2>Dispensações de hoje</h2><div class="tabela-wrap"><table><thead><tr><th>Hora</th><th>Paciente</th><th>Sala</th><th>Kit</th><th>Recebido por</th><th>Situação</th><th></th></tr></thead><tbody>' + linhas + "</tbody></table></div></div>" +
    '<form class="painel" data-form="dispensar"><h2>Dispensar kit</h2>' + (farm ? "" : '<div class="alerta info">Somente a farmácia dispensa. Aqui você vê como funciona.</div>') +
    campo("Paciente", sel("atId", S.agenda.map(function (a) { return [a.id, a.hora + " · " + a.paciente.nome + " · " + a.sala]; }), "a4", 'id="disp-at"' + (farm ? "" : " disabled"))) +
    campo("Kit", sel("kit", Object.keys(KITS).map(function (k) { return [k, KITS[k].nome]; }), "geral", 'id="disp-kit"' + (farm ? "" : " disabled"))) +
    campo("Recebido por", sel("recebido", medicos.map(function (u) { return [u.id, u.nome]; }), "u1", 'id="disp-rec"' + (farm ? "" : " disabled"))) +
    '<button class="btn primario"' + (farm ? "" : " disabled") + ">Dispensar</button></form></div>" +
    '<div class="painel"><h2>Composição dos kits</h2><div class="grade">' + Object.keys(KITS).map(function (k) {
      return '<div><h3>' + KITS[k].nome + '</h3><ul class="small">' + Object.keys(KITS[k].itens).map(function (i) { return "<li>" + KITS[k].itens[i] + " × " + esc(ITENS[i].nome) + (FARMACOS[ITENS[i].farmaco].lista ? ' <span class="chip danger">' + FARMACOS[ITENS[i].farmaco].lista + "</span>" : "") + "</li>"; }).join("") + "</ul></div>";
    }).join("") + "</div></div>" +
    discutir([
      "A saída do kit dá baixa no estoque do MV (via dispensação por paciente) ou o PeriAnest só controla e a baixa continua no MV?",
      "O consumo da ficha será usado para a cobrança do convênio? Hoje quem lança no MV?",
      "Kits padronizados por tipo de cirurgia ou por sala? Quem revisa a composição?",
      "Leitura de código de barras (lote e validade) na dispensação e na devolução?"
    ]);
}

// ----- Psicotrópicos -----
function vPsico() {
  var todas = [];
  S.agenda.forEach(function (a) { conciliar(a.id).forEach(function (l) { if (l.lista) { l.atId = a.id; todas.push(l); } }); });
  var diverg = todas.filter(function (l) { return l.dif !== 0; });
  var outros = USUARIOS.filter(function (u) { return u.id !== S.sessao; });
  var livro = S.descartes.slice().reverse().map(function (z) {
    return '<tr><td class="num">' + z.em + "</td><td>" + esc(ag(z.atId).paciente.nome) + "</td><td>" + esc(z.farmaco) + '</td><td class="num">' + dose(z.farmaco, z.qtd) + "</td><td>" + esc(usuario(z.por).nome) + "</td><td>" + esc(usuario(z.testemunha).nome) + "</td><td>" + esc(z.motivo) + "</td></tr>";
  }).join("");
  return '<div class="cabecalho"><div><h1>Psicotrópicos e entorpecentes</h1><p>Balanço por paciente dos fármacos das listas da Portaria SVS/MS 344/98: tudo o que saiu da farmácia precisa estar administrado na ficha, devolvido ou descartado com testemunha.</p></div>' +
    '<span class="chip ' + (diverg.length ? "danger" : "ok") + '">' + (diverg.length ? diverg.length + " divergência(s) aberta(s)" : "Sem divergências") + "</span></div>" +
    tabelaConciliacao(todas, true) +
    '<div class="grade-2"><div class="painel"><h2>Livro de descartes</h2>' + (livro ? '<div class="tabela-wrap"><table><thead><tr><th>Hora</th><th>Paciente</th><th>Fármaco</th><th class="num">Quantidade</th><th>Responsável</th><th>Testemunha</th><th>Motivo</th></tr></thead><tbody>' + livro + "</tbody></table></div>" : '<p class="muted">Nenhum descarte registrado hoje.</p>') + "</div>" +
    '<form class="painel" data-form="descarte"><h2>Registrar descarte de sobra</h2>' +
    (diverg.filter(function (l) { return l.dif > 0; }).length ? campo("Sobra", sel("linha", diverg.filter(function (l) { return l.dif > 0; }).map(function (l) { return [l.atId + "|" + l.farmaco, ag(l.atId).paciente.nome + " · " + l.farmaco + " · sobra " + dose(l.farmaco, l.dif)]; }), "", 'id="desc-linha"')) +
      campo("Quantidade descartada", '<input type="number" step="any" name="qtd" id="desc-qtd" required>') +
      campo("Testemunha", sel("testemunha", outros.map(function (u) { return [u.id, u.nome + " · " + PERFIS[u.perfil].rotulo]; }), "", 'id="desc-test"')) +
      campo("Senha da testemunha (simulada)", '<input type="password" name="senhaT" id="desc-senha" value="demo">') +
      campo("Motivo", sel("motivo", ["Sobra de ampola aberta", "Ampola quebrada", "Contaminação", "Outro"], "", 'id="desc-motivo"')) +
      '<button class="btn primario">Registrar descarte</button>' : '<p class="muted">Não há sobras de controlados pendentes.</p>') + "</form></div>" +
    discutir([
      "O livro oficial de escrituração continua no sistema da farmácia/MV? O PeriAnest serve de conferência diária ou substitui algum registro?",
      "A testemunha do descarte precisa ser da farmácia ou pode ser da enfermagem da sala?",
      "Opioides da RPA (morfina, tramadol, meperidina) entram neste balanço ou seguem pela prescrição do MV?",
      "Que relatório a farmácia precisa (por plantão, por anestesista, por fármaco)?"
    ]);
}

// ----- Envios ao MV -----
function tabelaOutbox(lista, comPaciente) {
  var o = S.outbox.filter(function (x) { return x.id === UI.outSel; })[0];
  if (!o || lista.indexOf(o) < 0) o = lista[0];
  var cls = { enviado: "ok", pendente: "warn", erro: "danger" }, rot = { enviado: "Recebido pelo MV", pendente: "Na fila", erro: "Erro — vai repetir" };
  return '<div class="grade-2"><div class="tabela-wrap"><table><thead><tr><th>Hora</th><th>Documento</th>' + (comPaciente ? "<th>Paciente</th>" : "") + "<th>Autor</th><th>Situação</th><th>Protocolo MV</th></tr></thead><tbody>" +
    lista.map(function (x) {
      return '<tr class="clicavel" data-acao="out-sel" data-id="' + x.id + '"' + (x === o ? ' style="background:var(--accent-soft)"' : "") + '><td class="num">' + x.em + "</td><td>" + esc(x.tipo) + "</td>" + (comPaciente ? "<td>" + esc(ag(x.atId).paciente.nome) + "</td>" : "") + "<td>" + esc(usuario(x.autor).nome) + '</td><td><span class="chip ' + cls[x.status] + '">' + rot[x.status] + '</span></td><td class="mono small">' + (x.protocolo || "—") + "</td></tr>";
    }).join("") + "</tbody></table></div>" +
    '<div class="painel"><header><h3>' + esc(o.tipo) + '</h3><span class="small muted">tentativas: ' + (o.tentativas || 1) + "</span></header>" +
    (o.erro ? '<div class="alerta">' + esc(o.erro) + "</div>" : "") +
    '<p class="small muted">Prévia simulada de como o texto ficaria no prontuário do MV, visível para médicos de outros setores.</p><div class="doc-mv">' + esc(textoDoc(o)) + "</div></div></div>";
}
function vMV() {
  var n = { enviado: 0, pendente: 0, erro: 0 };
  S.outbox.forEach(function (o) { n[o.status]++; });
  return '<div class="cabecalho"><div><h1>Envios ao MV</h1><p>Todo documento assinado no PeriAnest (avaliação pré-anestésica, ficha, descrição, evoluções e alta da RPA) entra numa fila e é copiado para o prontuário do MV. Se o MV estiver fora do ar, nada se perde: o envio é repetido automaticamente.</p></div>' +
    '<button class="btn" data-acao="mv-toggle">' + (S.mvForaDoAr ? "Simular: MV voltou" : "Simular: MV fora do ar") + "</button></div>" +
    '<div class="linha"><span class="chip ok">Recebidos: ' + n.enviado + '</span><span class="chip warn">Na fila: ' + n.pendente + '</span><span class="chip danger">Com erro: ' + n.erro + "</span></div>" +
    (S.outbox.length ? tabelaOutbox(S.outbox, true) : "") +
    discutir([
      "Formato de entrada no MV: evolução de texto, documento do PEP, ou PDF anexo? (ver a seção 4 do plano de ação)",
      "O documento chega no MV em nome do médico que assinou? Precisa de assinatura ICP-Brasil no MV também?",
      "Correções depois do envio: viram um adendo no MV ou substituem o documento?"
    ]);
}

// ----- Papel no MV -----
function vPapel() {
  return '<div class="cabecalho"><div><h1>Papel do PeriAnest dentro do MV</h1><p>O PeriAnest não substitui o MV. Ele cuida do registro detalhado da anestesia, que o MV não faz bem (ficha gráfica minuto a minuto, máscaras, RPA, conciliação de controlados), e devolve ao MV os documentos que os outros setores precisam ler.</p></div></div>' +
    '<div class="fluxo-mv"><div class="painel"><h2>Continua no MV</h2><ul><li>Cadastro do paciente e número de atendimento</li><li>Agenda do centro cirúrgico e mapa de salas</li><li>Prescrição médica geral e da enfermaria</li><li>Estoque oficial, faturamento e convênios</li><li>Descrição cirúrgica e evolução das outras equipes</li><li>Prontuário oficial que todo o hospital consulta</li></ul></div>' +
    '<div class="seta"><div>agenda, paciente, alergias, usuários<br>→ do MV para o PeriAnest</div><div>APA, ficha, descrição, evoluções, alta da RPA<br>← do PeriAnest para o MV</div></div>' +
    '<div class="painel"><h2>Passa a ser feito no PeriAnest</h2><ul><li>Avaliação pré-anestésica estruturada (ASA, via aérea, Apfel)</li><li>Ficha anestésica gráfica</li><li>Descrição anestésica com máscaras</li><li>Evoluções anestésicas</li><li>RPA: Aldrete, dor, NVPO, sintomáticos e alta</li><li>Kits de anestesia e balanço de psicotrópicos</li></ul></div></div>' +
    '<div class="painel"><h2>Decisões que precisamos tomar juntos</h2><div class="tabela-wrap"><table><thead><tr><th>Tema</th><th>Opções</th><th>Proposta inicial</th></tr></thead><tbody>' +
    [["Login", "Usuário próprio · mesmo usuário da rede (AD) · mesmo usuário do MV", "Mesmo usuário da rede/MV, sem nova senha"],
     ["Agenda cirúrgica", "Leitura em tempo real · sincronização periódica · digitação manual", "Sincronização a cada 5 min e botão de atualizar"],
     ["Documentos no MV", "Texto em evolução · documento do PEP · PDF anexo", "Começar com PDF + texto e evoluir conforme a TI"],
     ["Prescrição da RPA", "Só no PeriAnest · no MV · nos dois", "No MV, para não quebrar a farmácia e o faturamento (a decidir)"],
     ["Kits e estoque", "Controle só no PeriAnest · baixa no MV", "PeriAnest controla e concilia; baixa oficial continua no MV"],
     ["Psicotrópicos", "Conferência · escrituração oficial", "Conferência diária, livro oficial onde já está"],
     ["Assinatura", "Senha · certificado ICP-Brasil", "Senha no piloto; ICP-Brasil antes de abandonar o papel"],
     ["Contingência", "Papel · tablet offline", "Ficha em papel padronizada nos primeiros meses"]].map(function (r) {
      return "<tr><td><b>" + r[0] + "</b></td><td>" + r[1] + "</td><td>" + r[2] + "</td></tr>";
    }).join("") + "</tbody></table></div></div>" +
    '<div class="painel"><h2>Fluxo de um paciente</h2><div class="fluxo">' + ["Agenda (MV)", "Avaliação pré-anestésica", "Kit retirado na farmácia", "Ficha anestésica em sala", "Descrição", "RPA e sintomáticos", "Alta da RPA", "Devolução e balanço do kit", "Documentos copiados no MV"].map(function (s) { return "<span>" + s + "</span>"; }).join("") + "</div></div>" +
    '<p class="aviso-rodape">Protótipo para discussão. Todos os pacientes, profissionais e números de atendimento são fictícios. Protocolos, doses e kits são exemplos e precisam ser validados pela coordenação de anestesia, pela farmácia e pela CCIH antes de qualquer uso real.</p>';
}

var VIEWS = { agenda: vAgenda, atendimento: vAtendimento, farmacia: vFarmacia, psico: vPsico, mv: vMV, papel: vPapel };

// ---------------- renderização ----------------
function render() {
  var app = document.getElementById("app");
  if (!eu()) { app.innerHTML = telaLogin(); return; }
  if (perfil().views.indexOf(UI.view) < 0) UI.view = perfil().views[0];
  app.innerHTML = topo() + '<div class="casca">' + nav() + '<main class="principal">' + VIEWS[UI.view]() + "</main></div>";
  atualizarCalc();
}
function renderSeguro() {
  var el = document.activeElement;
  if (el && /INPUT|TEXTAREA|SELECT/.test(el.tagName) && el.closest(".principal")) return;
  render();
}
function atualizarCalc() {
  if (!UI.at) return;
  var a = ag(UI.at), x = S.at[UI.at];
  document.querySelectorAll("[data-calc]").forEach(function (el) {
    var k = el.dataset.calc;
    if (k === "imc") { var i = imc(x.apa); el.textContent = i ? num(i, 1) + " kg/m²" : "—"; }
    if (k === "apfel") { var ap = apfel(a, x.apa); el.innerHTML = '<span class="chip ' + (ap.pontos >= 3 ? "danger" : ap.pontos === 2 ? "warn" : "ok") + '">Apfel ' + ap.pontos + "/4 · risco ≈ " + ap.risco + "%</span>"; }
    if (k === "viaaerea") { var va = viaAerea(x.apa); el.innerHTML = va.alerta ? '<div class="alerta">Preditores de via aérea difícil: ' + esc(va.achados.join(", ")) + ". Planejar material de via aérea difícil.</div>" : va.achados.length ? '<div class="alerta warn">Atenção: ' + esc(va.achados.join(", ")) + "</div>" : ""; }
    if (k === "apa-texto") el.textContent = textoAPA(UI.at);
    if (k === "desc-texto") el.textContent = textoDescricao(UI.at);
  });
}

// ---------------- eventos ----------------
function aoEditarCampo(e) {
  var el = e.target;
  if (!el.dataset || !el.dataset.campo || !UI.at) return;
  var caminho = el.dataset.campo.split("."), obj = S.at[UI.at];
  for (var i = 0; i < caminho.length - 1; i++) obj = obj[caminho[i]] = obj[caminho[i]] || {};
  var k = caminho[caminho.length - 1];
  if (el.type === "checkbox" && el.dataset.lista) {
    var arr = obj[k] = obj[k] || [], pos = arr.indexOf(el.value);
    if (el.checked && pos < 0) arr.push(el.value);
    if (!el.checked && pos >= 0) arr.splice(pos, 1);
  } else if (el.type === "checkbox") obj[k] = el.checked;
  else if (el.type === "number") obj[k] = el.value === "" ? "" : Number(el.value);
  else obj[k] = el.value;
  salvar();
  if (el.dataset.rerender && e.type === "change") render(); else atualizarCalc();
}
document.addEventListener("input", aoEditarCampo);
document.addEventListener("change", aoEditarCampo);

var ACOES = {
  ir: function (el) { UI.view = el.dataset.view; render(); },
  abrir: function (el) {
    UI.at = el.dataset.id; UI.view = "atendimento";
    var s = ag(UI.at).status;
    UI.aba = eu().perfil === "enfermagem" ? "rpa" : s === "agendado" ? "apa" : s === "sala" ? "ficha" : s === "rpa" || s === "alta" ? "rpa" : "apa";
    render();
  },
  aba: function (el) { UI.aba = el.dataset.aba; render(); },
  sair: function () { S.sessao = null; UI.at = null; UI.view = "agenda"; salvar(); render(); },
  reset: function () {
    if (!UI.confirmarReset) { UI.confirmarReset = true; render(); setTimeout(function () { UI.confirmarReset = false; renderSeguro(); }, 4000); return; }
    var sessao = S.sessao; S = criarDadosIniciais(); S.sessao = sessao; UI.confirmarReset = false; UI.at = null; UI.view = "agenda"; salvar(); render(); toast("Dados de exemplo restaurados.");
  },
  sync: function () { toast("Agenda atualizada a partir do MV (simulado) às " + agora() + "."); },
  "assinar-apa": function () {
    var x = S.at[UI.at];
    x.apa.assinado = { por: S.sessao, em: agora() };
    setStatus(UI.at, "apa");
    enviarMV("Avaliação pré-anestésica", UI.at, textoAPA(UI.at)); render();
  },
  iniciar: function () {
    var x = S.at[UI.at], d = new Date(), m = d.getHours() * 60 + d.getMinutes();
    x.ficha.inicio = minH(m - (m % 5));
    x.ficha.tecnica = x.apa.tecnica || "";
    x.ficha.eventos.push({ t: 0, rotulo: "Início da anestesia" });
    if (x.ficha.tecnica === "Raquianestesia") x.descricao.modelo = "raqui";
    else if (x.ficha.tecnica === "Sedação") x.descricao.modelo = "sedacao";
    else if (x.ficha.tecnica === "Bloqueio periférico") x.descricao.modelo = "bloqueio";
    setStatus(UI.at, "sala"); salvar(); render();
  },
  "rm-droga": function (el) { S.at[UI.at].ficha.drogas.splice(+el.dataset.i, 1); salvar(); render(); },
  "finalizar-ficha": function () {
    var x = S.at[UI.at];
    x.ficha.finalizada = { por: S.sessao, em: agora() };
    if (!x.rpa.entrada) x.rpa.entrada = agora();
    setStatus(UI.at, "rpa");
    enviarMV("Ficha anestésica (resumo)", UI.at, textoFicha(UI.at)); render();
  },
  "preencher-desc": function () {
    var x = S.at[UI.at], d = x.descricao, f = x.ficha;
    var lista = function (filtro) {
      return f.drogas.filter(function (dr) { return !FARMACOS[dr.farmaco].fluido && dr.farmaco !== "Cefazolina" && filtro(dr); }).sort(function (a, b) { return a.t - b.t; })
        .map(function (dr) { return dr.farmaco.toLowerCase() + " " + dose(dr.farmaco, dr.dose); }).join(", ");
    };
    var it = function (dr) { return (dr.via || FARMACOS[dr.farmaco].via) === "IT"; };
    if (d.modelo === "geral") d.campos.inducao = lista(function (dr) { return dr.t <= 10; });
    if (d.modelo === "raqui") { d.campos.drogas = lista(it); d.campos.sedacao = lista(function (dr) { return !it(dr) && dr.t <= 10; }); }
    if (d.modelo === "sedacao") d.campos.farmacos = lista(function () { return true; });
    salvar(); render(); toast("Campos preenchidos com os fármacos registrados na ficha.");
  },
  "assinar-desc": function () {
    var x = S.at[UI.at];
    x.descricao.assinado = { por: S.sessao, em: agora() };
    enviarMV("Descrição anestésica", UI.at, textoDescricao(UI.at)); render();
  },
  frase: function (el) {
    var ta = document.getElementById("evo-texto");
    ta.value = (ta.value ? ta.value.replace(/\s*$/, " ") : "") + FRASES[+el.dataset.k];
    ta.focus();
  },
  "admitir-rpa": function () { S.at[UI.at].rpa.entrada = agora(); setStatus(UI.at, "rpa"); salvar(); render(); },
  checar: function (el) { S.at[UI.at].rpa.checagens.push({ id: el.dataset.id, hora: agora(), por: S.sessao }); salvar(); render(); toast("Administração checada."); },
  devolver: function (el) { UI.devolver = el.dataset.id || null; render(); },
  "out-sel": function (el) { UI.outSel = el.dataset.id; render(); },
  "mv-toggle": function () {
    S.mvForaDoAr = !S.mvForaDoAr;
    if (!S.mvForaDoAr) S.outbox.forEach(function (o) { if (o.status === "erro") o.status = "pendente"; });
    salvar(); processarFila(); render();
    toast(S.mvForaDoAr ? "MV fora do ar (simulado). Novos documentos vão ficar na fila." : "MV de volta. Reenviando os documentos da fila.");
  }
};
document.addEventListener("click", function (e) {
  var el = e.target.closest("[data-acao]");
  if (!el || !ACOES[el.dataset.acao]) return;
  e.preventDefault();
  ACOES[el.dataset.acao](el, e);
});

var FORMS = {
  login: function (fd) { S.sessao = fd.get("usuario"); UI.view = PERFIS[usuario(S.sessao).perfil].views[0]; salvar(); render(); },
  vital: function (fd) {
    var f = S.at[UI.at].ficha, n = function (k) { var v = fd.get(k); return v === "" ? null : Number(v); };
    f.vitais.push({ t: Number(fd.get("t")), pas: n("pas"), pad: n("pad"), fc: n("fc"), spo2: n("spo2"), etco2: n("etco2") });
    salvar(); render();
  },
  droga: function (fd) {
    S.at[UI.at].ficha.drogas.push({ t: Number(fd.get("t")) || 0, farmaco: fd.get("farmaco"), dose: Number(fd.get("dose")), via: fd.get("via") || undefined });
    salvar(); render();
  },
  evento: function (fd) { S.at[UI.at].ficha.eventos.push({ t: Number(fd.get("t")) || 0, rotulo: fd.get("rotulo") }); salvar(); render(); },
  evolucao: function (fd) {
    var e = { tipo: fd.get("tipo"), texto: fd.get("texto"), por: S.sessao, em: agora() };
    S.at[UI.at].evolucoes.push(e);
    enviarMV("Evolução — " + e.tipo, UI.at, cabecalhoDoc("Evolução anestésica — " + e.tipo, UI.at) + e.texto + assinatura(e.por, e.em));
    render();
  },
  aldrete: function (fd) {
    var av = { hora: fd.get("hora") || agora(), por: S.sessao };
    ["atv", "resp", "circ", "cons", "spo2", "dor", "nvpo"].forEach(function (k) { av[k] = Number(fd.get(k)); });
    S.at[UI.at].rpa.avaliacoes.push(av); salvar(); render();
  },
  prescrever: function (fd) {
    var ids = fd.getAll("item");
    if (!ids.length) { toast("Selecione ao menos um item do protocolo."); return; }
    ids.forEach(function (id) { S.at[UI.at].rpa.prescricao.push({ id: id, por: S.sessao, em: agora() }); });
    salvar(); render(); toast(ids.length + " item(ns) prescrito(s).");
  },
  alta: function (fd) {
    var r = S.at[UI.at].rpa;
    r.alta = { destino: fd.get("destino"), orientacoes: fd.get("orientacoes"), por: S.sessao, em: agora() };
    setStatus(UI.at, "alta");
    enviarMV("Evolução de alta da RPA", UI.at, textoAlta(UI.at)); render();
  },
  dispensar: function (fd) {
    var kit = fd.get("kit");
    S.dispensacoes.push({ id: "d" + (++S.seq), atId: fd.get("atId"), kit: kit, itens: Object.assign({}, KITS[kit].itens), por: S.sessao, recebido: fd.get("recebido"), em: agora(), devolucao: null });
    salvar(); render(); toast(KITS[kit].nome + " dispensado.");
  },
  devolucao: function (fd, form) {
    var d = S.dispensacoes.filter(function (x) { return x.id === form.dataset.id; })[0], dev = { _em: agora(), _por: S.sessao };
    Object.keys(d.itens).forEach(function (k) { dev[k] = Math.min(d.itens[k], Math.max(0, Number(fd.get(k)) || 0)); });
    d.devolucao = dev; UI.devolver = null; salvar(); render(); toast("Devolução registrada. Confira o balanço em Psicotrópicos.");
  },
  descarte: function (fd) {
    var p = String(fd.get("linha")).split("|"), qtd = Number(fd.get("qtd"));
    if (!qtd || qtd <= 0) { toast("Informe a quantidade descartada."); return; }
    if (!fd.get("senhaT")) { toast("A testemunha precisa confirmar com a senha."); return; }
    S.descartes.push({ id: "z" + (++S.seq), atId: p[0], farmaco: p[1], qtd: qtd, por: S.sessao, testemunha: fd.get("testemunha"), motivo: fd.get("motivo"), em: agora() });
    salvar(); render(); toast("Descarte registrado com testemunha.");
  }
};
document.addEventListener("submit", function (e) {
  var f = e.target;
  if (!f.dataset.form || !FORMS[f.dataset.form]) return;
  e.preventDefault();
  FORMS[f.dataset.form](new FormData(f), f);
});

render();
processarFila();
