// Dragon Ball Omega — habilidades (técnicas e habilidades de equipamento)
// Regras de maestria, dados adicionais, rolagem de dano e o componente visual da habilidade,
// usados pela ficha (arsenal.js) e pelo Combate (combate.js).
//
// Uma habilidade é: { id, nome, descricao, qtd, dado, mod, fixo, tipo, pl, efeitos,
//                     extras: [{ qtd, dado, quando: "sempre" | "situacional", condicao }], usos,
//                     temDano (false = sem efeito de dano: habilidade de "status"), efeitos (penalidade), fortalecimentos, pontaria }
// Uma habilidade tem pelo menos um entre: efeito de dano, efeito de penalidade, efeito de fortalecimento.
window.DBOAbility = (function () {
  var D = DBOData, UI = DBOUI, R = DBORules, el = UI.el;
  // KP atual (vazio = cheio).
  function kpDe(c) { return R.kpAtual(c); }

  var DIE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 2.5 20.5 7.4v9.2L12 21.5 3.5 16.6V7.4z"/><path d="M12 2.5 3.5 16.6h17z"/><path d="M3.5 7.4 12 21.5l8.5-14.1"/></svg>';

  // Escada de dados. O d3 só existe como dado de bônus da maestria 2 (d4 → d3).
  var LADDER = ["d3", "d4", "d6", "d8", "d10", "d12", "d20"];
  // Usos acumulados para chegar nas maestrias 2, 3 e 4 (a contagem não zera ao subir).
  var LIMITS = [5, 10, 20];

  var attrName = {};
  D.ATTRIBUTES.forEach(function (a) { attrName[a[0]] = a[1]; });

  function signed(n) { return n >= 0 ? "+ " + n : "− " + Math.abs(n); }
  function die(sides) { return Math.floor(Math.random() * sides) + 1; }
  function extras(a) { return Array.isArray(a.extras) && temDano(a) ? a.extras : []; }
  // Habilidades antigas não têm o campo temDano: todas causavam dano.
  function temDano(a) { return a.temDano !== false; }
  function penalidades(a) { return Array.isArray(a.efeitos) ? a.efeitos : []; }
  // Efeitos ativos que impedem um uso: "ki" (técnica de ki), "kp" (gastar KP), "ativar". Devolve o motivo ou "".
  function bloqueioEfeitos(c, uso) {
    if (!window.DBOEfeitos || !uso) return "";
    var motivo = "";
    DBOEfeitos.ativos(c).forEach(function (e) {
      if (motivo) return;
      if (e.ef === "paralisia" || e.ef === "sono") motivo = DBOEfeitos.POR_ID[e.ef].nome + ": você não pode usar ações.";
      else if (e.ef === "selamento" && (uso === "ki" || (e.grau >= 2 && (uso === "kp" || uso === "ativar")))) motivo = "Selamento de Ki" + (uso === "ki" ? ": técnicas de ki estão seladas." : ": você não pode gastar KP.");
      else if (e.ef === "cansaco" && e.grau >= 4) motivo = "Cansaço Grau IV: você está exausto demais para agir.";
      else if (e.ef === "concussao" && uso === "ativar") motivo = "Concussão: você não pode usar Ativar.";
    });
    return motivo;
  }
  // Botão "Usar" de duas etapas: o primeiro clique pede confirmação, o segundo usa. Desarma sozinho em 4 s.
  function armar(btn, fazer) {
    var armado = false, timer, rotulo = btn.textContent;
    btn.addEventListener("click", function () {
      if (!armado) {
        armado = true; btn.textContent = "Confirmar?"; btn.classList.add("is-armed");
        timer = setTimeout(function () { armado = false; btn.textContent = rotulo; btn.classList.remove("is-armed"); }, 4000);
        return;
      }
      clearTimeout(timer); armado = false; btn.textContent = rotulo; btn.classList.remove("is-armed");
      fazer();
    });
  }
  function rotuloEfeito(s) { return window.DBOEfeitos ? DBOEfeitos.rotuloTexto(s) : s; }
  function fortalecimentos(a) { return Array.isArray(a.fortalecimentos) ? a.fortalecimentos : []; }
  // Rotina do rótulo: "Ki" ou "Físico" (com dano) ou "Status" (sem dano, só efeitos).
  function tipoRotulo(a) { return temDano(a) ? (a.tipo === "ki" ? "Ki" : "Físico") : "Status"; }
  function tipoClasse(a) { return temDano(a) ? a.tipo : "status"; }
  // Dado de teste (d20) ao lado: some nas habilidades só com efeitos de penalidade.
  function temDado(a) { if (a.classe) return !!a.cura; return temDano(a) || fortalecimentos(a).length > 0; }

  /* ---------- Habilidades de classe ----------
     Vêm de DBOData.CLASS_ABILITIES. A maestria sobe com o NÍVEL do personagem (não com o uso) e os efeitos são calculados
     em js/rules.js (R.passivos). Aqui elas viram um objeto parecido com uma técnica, só para a ficha desenhar. */
  function isClasse(a) { return !!a.classe; }
  // Habilidade racial (DBOData.RACE_ABILITIES): fica em "Habilidades de Raça", não ocupa espaço e só tem descrição. Algumas podem ser cortadas.
  function daRaca(def, c) {
    return { id: def.id, racial: true, nome: def.nome, descricao: def.descricao, cortavel: !!def.cortavel, interpretativo: !!def.interpretativo, raca: c.raca, sub: def.sub || "", tipoHab: def.tipo || "",
      temDano: false, tipo: "ki", mod: "", qtd: 1, dado: "d4", fixo: 0, efeitos: [], fortalecimentos: [], extras: [], usos: 0 };
  }
  function nodeRacial(t, key, tagName, c, ctx) {
    var opened = ctx.opened, n = el(tagName, "tech"), top = el("div", "tech__top");
    var nameBtn = el("button", "tech__name");
    nameBtn.type = "button";
    nameBtn.setAttribute("aria-expanded", String(!!opened[key]));
    nameBtn.appendChild(el("strong", "", t.nome));
    nameBtn.appendChild(el("small", "", (t.sub ? "Habilidade de sub-raça" : "Habilidade racial") + (t.tipoHab ? " · " + t.tipoHab : (t.interpretativo ? " · interpretativa" : ""))));
    nameBtn.addEventListener("click", function () { opened[key] = !opened[key]; ctx.refresh(); });
    top.appendChild(nameBtn);
    if (t.cortavel && ctx.onCortar) {   // eliminar para sempre: pede um segundo clique
      var cut = el("button", "btn use-btn use-btn--cortar", "Cortar");
      cut.type = "button";
      cut.setAttribute("aria-label", "Cortar " + t.nome + " (elimina a habilidade para sempre)");
      var armed = false, timer;
      cut.addEventListener("click", function () {
        if (!armed) {
          armed = true; cut.textContent = "Confirmar corte"; cut.classList.add("is-armed");
          timer = setTimeout(function () { armed = false; cut.textContent = "Cortar"; cut.classList.remove("is-armed"); }, 4000);
          return;
        }
        clearTimeout(timer);
        ctx.onCortar(t.id);
      });
      top.appendChild(cut);
    }
    top.appendChild(el("span", "tag tag--status", t.sub ? "Sub-raça" : "Racial"));
    n.appendChild(top);
    if (opened[key]) {
      var box = el("dl", "tech__details");
      [["Nome", t.nome], ["Descrição", t.descricao], ["Origem", (t.sub ? "Habilidade de sub-raça (" + t.sub + ")" : "Habilidade racial (" + t.raca + ")") + ". Não ocupa espaço nas técnicas de classe."],
       ["Efeito", t.interpretativo ? "100% interpretativo: só vale dentro do jogo, o site não muda nenhum número." : "O site só mostra o texto; quem aplica o efeito é a mesa. Os números fixos (espaços e RD) já estão somados na ficha."]]
        .concat(t.cortavel ? [["Cortar", "Elimina a habilidade para sempre. Não dá para desfazer."]] : []).forEach(function (r) {
          var row = el("div", "tech__row");
          row.appendChild(el("dt", "", r[0]));
          row.appendChild(el("dd", "", r[1]));
          box.appendChild(row);
        });
      n.appendChild(box);
    }
    return n;
  }
  function daClasse(def, c) {
    return { id: def.id, classe: true, def: def, nome: def.nome, descricao: def.sub ? def.frase : def.descricao, temDano: false, tipo: "ki", mod: def.cura ? def.cura.mod : "",
      qtd: 1, dado: "d4", fixo: 0, efeitos: [], fortalecimentos: [], extras: [], usos: 0, cura: def.cura || null, sub: !!def.sub, dragao: !!def.dragao };
  }
  var ROMANO = ["", "I", "II", "III"];
  // Rótulo curto de uma habilidade de sub-classe: "Velocista · Habilidade II (B)" ou "Rugir do Dragão · 1 PD".
  function rotuloSub(def) {
    if (def.dragao) return def.subclasse + " · Rugir do Dragão · " + (def.custoPd || 1) + " PD";
    return def.subclasse + " · Habilidade " + ROMANO[def.cat] + (def.variante && def.variante !== "A" ? " (" + def.variante + ")" : "");
  }
  // Habilidade genérica de classe: `copias` = quantas vezes foi aprendida = maestria (1 a 5).
  function daGenerica(def, copias, c) {
    var a = daClasse(def, c);
    a.generica = true; a.copias = copias;
    if (def.nomes) a.nome = def.nomes[Math.min(copias, def.max) - 1] || def.nome;
    a.descricao = def.max === 1 ? "Habilidade genérica: todas as classes podem aprender. Não tem maestria a mais."
      : "Habilidade genérica: todas as classes podem aprender. Aprender de novo sobe a maestria (até " + def.max + ") e cada cópia ocupa mais um espaço de técnica de classe.";
    return a;
  }
  // Habilidade exclusiva de classe: `copias` cópias (1 ou 2); a maestria 2 só vale no nível 100+.
  function daExclusiva(def, copias, c) {
    var a = daClasse(def, c);
    a.exclusiva = true; a.copias = copias;
    a.descricao = "“" + def.frase + "”";
    return a;
  }
  /* ---------- Usos por combate e Reforço de técnica ----------
     Habilidades de classe com "uma vez por combate" (u.vezes) contam os usos numa marca guardada nos efeitos do personagem
     ({ ef: "_uso", hab, combate, n }); fora de combate não há limite.
     Reforço: habilidade que melhora a PRÓXIMA técnica (Onda Expansiva, Golpe Esmagador, Rajada de Mil Golpes...) não gasta
     KP na hora: ela "arma" a próxima técnica do tipo certo, que passa a custar mais KP (custo × (1 + pct)). Só um reforço por vez.
     Técnica que não gasta KP é reforçada sobre 10% do KP máximo, para o reforço nunca sair de graça. */
  function idCombate() { try { return window.DBOCombat && DBOCombat.active() ? String(DBOCombat.combateId ? DBOCombat.combateId() : "c") : ""; } catch (e) { return ""; } }
  function usosNoCombate(c, id) {
    var cid = idCombate(); if (!cid) return 0;
    var m = (c.efeitosAtivos || []).filter(function (e) { return e.ef === "_uso" && e.hab === id && e.combate === cid; })[0];
    return m ? m.n || 0 : 0;
  }
  function marcarUso(host, id) {
    var cid = idCombate(); if (!cid || !host) return;
    var lista = (host.get().efeitosAtivos || []).filter(function (e) { return !(e.ef === "_uso" && e.hab === id && e.combate !== cid); });
    var m = lista.filter(function (e) { return e.ef === "_uso" && e.hab === id; })[0];
    if (m) lista = lista.map(function (e) { return e === m ? Object.assign({}, e, { n: (e.n || 0) + 1 }) : e; });
    else lista = lista.concat([{ id: "u" + Date.now().toString(36), ef: "_uso", hab: id, combate: cid, n: 1 }]);
    host.save({ efeitosAtivos: lista });
  }
  function reforcoAtivo(c) { return (c && c.efeitosAtivos || []).filter(function (e) { return e.ef === "_reforco"; })[0] || null; }
  // Reforço que vale para esta técnica (tipo físico / ki / qualquer) ou null.
  function reforcoPara(c, t) {
    var r = reforcoAtivo(c);
    if (!r || !t || isClasse(t) || !temDano(t)) return null;
    return r.tipo === "qualquer" || r.tipo === t.tipo ? r : null;
  }
  function custoComReforco(t, c) {
    var base = custoKp(t, c), r = reforcoPara(c, t);
    if (!r) return base;
    return base + Math.ceil(Math.max(base, R.kpMax(c) * 0.1) * r.pct);
  }
  function armarReforco(host, t, u) {
    var lista = (host.get().efeitosAtivos || []).filter(function (e) { return e.ef !== "_reforco"; });
    lista.push({ id: "r" + Date.now().toString(36), ef: "_reforco", fonte: t.nome, hab: t.id, tipo: u.reforco.tipo || "qualquer", pct: u.reforco.pct, texto: u.reforco.texto || "" });
    host.save({ efeitosAtivos: lista });
  }
  function gastarReforco(c) {
    var host = window.DBOEfeitosUI && DBOEfeitosUI.host; if (!host) return;
    host.save({ efeitosAtivos: (host.get().efeitosAtivos || []).filter(function (e) { return e.ef !== "_reforco"; }) });
  }
  // Texto curto do que o botão Usar faz (habilidades de sub-classe).
  function resumoUso(u) {
    var p = [];
    if (u.reforco) p.push("reforça a próxima técnica " + ({ ki: "de ki", fisico: "física" }[u.reforco.tipo] || "") + " (+" + Math.round(u.reforco.pct * 100) + "% de KP nela)");
    if (u.kp) p.push("gasta " + Math.round(u.kp * 100) + "% do KP");
    if (u.pd) p.push("gasta " + u.pd + " PD");
    if (u.hp) p.push("recupera " + Math.round(u.hp * 100) + "% do HP");
    (u.efeitos || []).forEach(function (e) { var d = window.DBOEfeitos && DBOEfeitos.POR_ID[e.ef]; p.push((e.em === "si" ? "em você: " : "no alvo: ") + (d ? d.nome : e.ef) + " Grau " + ROMANO[e.grau]); });
    if (u.vezes) p.push(u.vezes === 1 ? "uma vez por combate" : u.vezes + " vezes por combate");
    return p.join(" · ") || "Marca o uso.";
  }
  // Flex (Punho de Ki): técnica que soma Força ou Espírito usa o maior dos dois.
  function modDano(a, c) {
    if ((a.mod === "forca" || a.mod === "espirito") && c && (c.habilidadesClasse || []).indexOf("flex-1a") >= 0)
      return R.mod(c, "espirito") > R.mod(c, "forca") ? "espirito" : "forca";
    return a.mod;
  }
  // Pesquisador (Teoria Unificada do Ki): cada uso conta em dobro para a maestria.
  function usosPorUso(c) { return c && (c.habilidadesClasse || []).indexOf("pesquisador-3a") >= 0 ? 2 : 1; }

  // Botão Usar de uma exclusiva (ou de uma habilidade de sub-classe com uso): confere KP, gasta, cura, põe em você o
  // que é seu e avisa o que vai nos outros. Com reforço, só arma a próxima técnica (o KP sai quando ela for usada).
  function usarExclusiva(t, ctx) {
    var cur = ctx.get(), u = usoExclusiva(t, cur), custo = u.kp ? Math.ceil(R.kpMax(cur) * u.kp) : 0, pd = u.pd || 0;
    var host = window.DBOEfeitosUI && DBOEfeitosUI.host, FX = window.DBOEfeitos, msgs = [], avisos = [];
    if (u.vezes && usosNoCombate(cur, t.id) >= u.vezes) { UI.bigAlert("Interação falhou: " + t.nome + " já foi usada " + (u.vezes === 1 ? "neste combate" : u.vezes + " vezes neste combate") + ".\nSeu uso foi negado."); return; }
    if (u.reforco) {
      if (!host) return;
      var ja = reforcoAtivo(host.get());
      armarReforco(host, t, u); marcarUso(host, t.id);
      UI.toast(t.nome + " pronta: a próxima técnica " + ({ ki: "de ki", fisico: "física" }[u.reforco.tipo] || "") + " custa +" + Math.round(u.reforco.pct * 100) + "% de KP" + (u.reforco.texto ? " e " + u.reforco.texto : "") + "." + (ja ? " (Substituiu " + ja.fonte + ".)" : ""));
      return;
    }
    var trava = bloqueioEfeitos(cur, custo > 0 ? "kp" : "acao");
    if (trava) { UI.bigAlert("Interação falhou: " + trava + "\nSeu uso foi negado."); return; }
    if (kpDe(cur) < custo) { UI.bigAlert("Interação falhou: KI insuficiente.\nSeu uso foi negado."); return; }
    if (pd && R.pdAtual(cur) < pd) { UI.bigAlert("Interação falhou: Pontos do Dragão insuficientes.\nSeu uso foi negado."); return; }
    if (custo) ctx.onKp(custo);
    if (pd && host) { host.save({ pdAtual: Math.max(0, R.pdAtual(host.get()) - pd) }); msgs.push("−" + pd + " PD"); }
    if (u.vezes) marcarUso(host, t.id);
    if (u.hp && host) {
      var c2 = host.get(), mx = R.hpMax(c2), hp = R.hpAtual(c2), novo = Math.min(mx, hp + Math.round(mx * u.hp));
      host.save({ hpAtual: novo }); msgs.push("+" + UI.fmt(novo - hp) + " HP");
    }
    (u.efeitos || []).forEach(function (e) {
      var cat = FX ? FX.DUR_POR[FX.categoriaDeRodadas(e.rod)] : null, rolada = FX ? FX.duracaoDeRodadas(e.rod) : e.rod;
      var nome = FX ? FX.rotulo(FX.POR_ID[e.ef]) + " Grau " + ROMANO[e.grau] + " (duração " + cat.nome.toLowerCase() + ", " + cat.texto + ")" : e.ef;
      if (e.em === "si" && host && FX) {
        var r = FX.adicionar(host.get(), e.ef, { grau: e.grau, rodadas: rolada, fonte: t.nome });
        host.save({ efeitosAtivos: r.lista }); msgs.push(nome);
      } else avisos.push(nome);
    });
    if (u.purifica && host && DBOEfeitosUI.purificar) DBOEfeitosUI.purificar(host, u.purifica);
    UI.toast(t.nome + ": " + (custo ? "−" + UI.fmt(custo) + " KP. " : "") + (msgs.length ? "Em você: " + msgs.join(", ") + ". " : "") + (avisos.length ? "Aplique no alvo/aliados: " + avisos.join(", ") + "." : ""));
  }
  function usoExclusiva(a, c) {
    if (a.sub) return a.def.uso || null;   // sub-classe: um uso só (sem maestria)
    var m = maestria(a, c); return (a.def.m[m - 1] || {}).uso || null;
  }
  function textoGenerica(def, n) {
    if (def.textos) return def.textos[Math.max(1, Math.min(n, def.max)) - 1];
    return "+" + UI.fmt(R.totalGenerica(def, n)) + " " + def.rotulo;
  }
  // Ativações possíveis: [{ atributo, valor, custoKp (fração do KP máximo), fonte }]. Da classe (Inventor) ou de técnicas com "Aprimorar atributo: X".
  function ativacoes(a, c) {
    var out = [];
    if (a.generica || a.sub || a.exclusiva) return out;
    if (isClasse(a)) {
      R.efeitosAtivos(a.def, c.nivel).forEach(function (e) { if (e.tipo === "ativar") out.push({ atributo: e.atributo, valor: e.valor, custoKp: e.custoKp, fonte: a.nome }); });
      return out;
    }
    // "Aprimorar (atributo)": o bônus sobe com o grau (maestria da técnica).
    var FX = window.DBOEfeitos, ap = FX ? FX.POR_ID.aprimorar : null;
    fortalecimentos(a).forEach(function (f) {
      var r = FX ? FX.ler(f) : null;
      if (!r || !r.def || r.def.id !== "aprimorar") return;
      var chave = null;
      D.ATTRIBUTES.forEach(function (x) { if (x[1] === r.param) chave = x[0]; });
      if (chave) out.push({ atributo: chave, valor: FX.valorGrau(ap.bonus, FX.grauDaMaestria(maestria(a, c))), custoKp: ap.custoKp, fonte: a.nome });
    });
    return out;
  }
  // Bônus "no próximo teste" guardado por personagem (neste navegador). Só um por vez.
  var PKEY = "dbo-pendente";
  function pendLer() { try { return JSON.parse(localStorage.getItem(PKEY) || "{}") || {}; } catch (e) { return {}; } }
  function pendente(c) { return pendLer()[c.id] || null; }
  function pendSalvar(c, v) {
    var all = pendLer();
    if (v) all[c.id] = v; else delete all[c.id];
    try { localStorage.setItem(PKEY, JSON.stringify(all)); } catch (e) {}
    document.dispatchEvent(new CustomEvent("dbo-pendente"));
  }
  // Usa o bônus pendente se ele é do atributo do teste. Devolve { valor, fonte } ou null.
  function usarPendente(c, atributo) {
    var p = pendente(c);
    if (!p || !atributo || p.atributo !== atributo) return null;
    pendSalvar(c, null);
    return p;
  }
  function cancelarPendente(c) { pendSalvar(c, null); }
  function custoAtivacao(c, ativ) { return Math.ceil(R.kpMax(c) * ativ.custoKp); }

  /* ---------- Maestria ---------- */
  // Soco e afins: maestria fixa, definida pela raça do personagem (não sobe com o uso).
  function fixa(a) { return D.FIXED_MASTERY_TECHNIQUES.indexOf(a.nome) !== -1; }
  function maestria(a, c) {
    if (isClasse(a)) return a.generica ? a.copias : a.sub ? 1 : a.exclusiva ? R.maestriaExclusiva(a.def, a.copias, c.nivel) : R.maestriaClasse(a.def, c.nivel);
    if (c && fixa(a)) return R.maestriaRaca(c);
    var u = Number(a.usos) || 0;
    return u >= LIMITS[2] ? 4 : u >= LIMITS[1] ? 3 : u >= LIMITS[0] ? 2 : 1;
  }
  // { alvo, faltam } para a próxima maestria, ou null na maestria 4.
  function proxima(a, c) {
    var u = Number(a.usos) || 0, m = maestria(a, c);
    if (isClasse(a) || m >= 4 || (c && fixa(a))) return null;
    return { alvo: LIMITS[m - 1], faltam: LIMITS[m - 1] - u };
  }
  function menorDado(dado) {
    var i = LADDER.indexOf(dado);
    return i > 0 ? LADDER[i - 1] : null;
  }
  // Bônus de dano da maestria: { qtd, dado } | { fixo: 1 } | null. Cada maestria substitui a anterior.
  function bonusMaestria(a, c) {
    if (!temDano(a)) return null;
    var m = maestria(a, c);
    if (m === 1) return null;
    if (m === 2) { var d = menorDado(a.dado); return d ? { qtd: 1, dado: d } : { fixo: 1 }; }
    return { qtd: m === 3 ? 1 : 2, dado: a.dado };
  }
  function bonusTexto(a, c) {
    var b = bonusMaestria(a, c);
    if (!b) return "Nenhum";
    return b.dado ? "+ " + b.qtd + b.dado : "+ " + b.fixo + " fixo";
  }
  // RD ao usar a habilidade: 8 + modificador da habilidade + nível ÷ 10 (para baixo). O buff da maestria (maestria − 1)
  // só vale para habilidades com efeitos de penalidade; as que causam dano não ganham RD pela maestria.
  function buffRd(a) { return !isClasse(a) && penalidades(a).length > 0; }
  function rd(c, a) { return R.rdHabilidade(c, a.mod) + (buffRd(a) ? maestria(a, c) - 1 : 0); }

  /* ---------- Custo de KP ao usar: B × (N / 2) ----------
     B = dano máximo (soma do maior valor de todos os dados que dá pra rolar) e N = multiplicador de dano de Ki. */
  function danoMaximo(a, c) {
    if (a.cura) return a.cura.qtd * Number(a.cura.dado.slice(1));   // cura: os dados da cura contam como o dano máximo
    if (!temDano(a)) return 0;
    var total = a.qtd * Number(a.dado.slice(1));
    extras(a).forEach(function (e) { total += e.qtd * Number(e.dado.slice(1)); });
    var b = bonusMaestria(a, c);
    if (b && b.dado) total += b.qtd * Number(b.dado.slice(1));
    return total;
  }
  // Soco nunca gasta ki; técnica/habilidade física pode ter a opção "não gasta ki".
  function semKi(a) { return (!temDano(a) && !a.cura) || a.nome === "Soco" || (a.tipo === "fisico" && !!a.semKi); }
  // Habilidade de cura (Medicina Aplicada) gasta o dobro (def.cura.kpFator).
  // KP ao usar = (KP do dano x multiplicador do alvo + KP dos efeitos) x 0,4 se a técnica reduz. Classe/cura mantêm a conta antiga.
  function kpPartes(a, c) {
    var dano = semKi(a) ? 0 : Math.max(0, Math.ceil(danoMaximo(a, c) * R.danoKi(c) / 2) * (a.cura ? a.cura.kpFator || 1 : 1));
    var ef = { total: 0, reduz: false }, mult = 1;
    if (!a.cura && !isClasse(a) && window.DBOEfeitos && DBOEfeitos.kpEfeitos && a.nome !== "Soco") {
      ef = DBOEfeitos.kpEfeitos(a, c, maestria(a, c));
      mult = DBOEfeitos.multDano ? DBOEfeitos.multDano(a) : 1;
    }
    var bruto = dano * mult + ef.total;
    return { dano: dano, mult: mult, efeitos: ef.total, reduz: ef.reduz, total: Math.max(0, Math.ceil(bruto * (ef.reduz ? 0.4 : 1))) };
  }
  function custoKp(a, c) { return kpPartes(a, c).total; }
  // "Gastar HP, ao invés de KP": 60% do custo em KP sai do HP (nunca deixa o HP abaixo de 1).
  function custoHp(a, c) { return a && a.gastaHp ? Math.ceil(custoKp(a, c) * 0.6) : 0; }
  // Multiplicador de Ki da cura: o de Ki do personagem + o aumento da maestria (20%, 35%, 50%; não acumulam).
  function multCura(a, c) {
    var pct = 0;
    R.efeitosAtivos(a.def, c.nivel).forEach(function (e) { if (e.tipo === "cura") pct = e.pct; });
    return Math.round(R.danoKi(c) * (1 + pct));
  }

  /* ---------- Textos ---------- */
  function damageText(a) {
    if (a.generica) return textoGenerica(a.def, a.copias);
    if (a.sub) return rotuloSub(a.def);
    if (a.exclusiva) return "Exclusiva · " + a.def.tipo;
    if (isClasse(a)) return a.cura ? a.cura.qtd + a.cura.dado + " + " + attrName[a.cura.mod] + " (cura)" : "Habilidade de classe";
    if (!temDano(a)) {
      var todos = fortalecimentos(a).concat(penalidades(a)).map(rotuloEfeito);
      return todos.length ? todos.join(", ") : "Sem efeitos";
    }
    var s = a.qtd + a.dado;
    extras(a).forEach(function (e) { if (e.quando !== "situacional") s += " + " + e.qtd + e.dado; });
    if (a.mod) s += " + " + attrName[a.mod];
    if (a.fixo) s += " " + (a.fixo > 0 ? "+ " : "− ") + Math.abs(a.fixo);
    return s;
  }
  function extraTexto(e) {
    return e.qtd + e.dado + (e.quando === "situacional" ? " (situacional" + (e.condicao ? ": " + e.condicao : "") + ")" : " (sempre)");
  }

  /* ---------- Rolagem de dano ---------- */
  function rolar(qtd, dado) {
    var sides = Number(dado.slice(1)), faces = [];
    for (var i = 0; i < qtd; i++) faces.push(die(sides));
    return faces;
  }
  // Rola no prato de dados (js/prato.js); o resultado só é aplicado quando os dados caem.
  function noPrato(titulo, dados, aplicar, extra) {
    if (window.DBOPrato) return DBOPrato.rolar(titulo, dados, aplicar, extra);
    aplicar(); return true;
  }
  // Transforma as partes de uma rolagem de dano em dados para o prato: "2d6", "maestria 1d4"...
  function dadosDe(partes) {
    var out = [];
    partes.forEach(function (p) { var m = /d(\d+)/.exec(p.rot); if (m) p.faces.forEach(function (v) { out.push({ lados: Number(m[1]), valor: v }); }); });
    return out;
  }
  // Depois que os dados pousam, a pontaria pode ter dobrado alguns valores: refaz as faces e o total com o que o prato entregou.
  function recalcular(res, dados) {
    var i = 0, partes = res.partes.map(function (p) {
      return { rot: p.rot, faces: p.faces.map(function (v) { var d = dados && dados[i++]; return d ? d.valor : v; }) };
    });
    var total = res.fixos.reduce(function (s, f) { return s + f.val; }, 0);
    partes.forEach(function (p) { total += soma(p.faces); });
    var raw = Math.max(0, total);
    var fator = res.fator || 1;
    return { partes: partes, fixos: res.fixos, raw: raw, mult: res.mult, fator: fator, total: Math.round(raw * res.mult * fator) };
  }
  function soma(f) { return f.reduce(function (s, n) { return s + n; }, 0); }

  // apply: { [índice do dado extra]: true } para os situacionais marcados.
  function rolarDano(a, c, apply) {
    apply = apply || {};
    if (a.cura) {   // cura: (dados + modificador) x multiplicador de Ki com o aumento da maestria
      var fc = rolar(a.cura.qtd, a.cura.dado), mc = R.mod(c, a.cura.mod), rawC = Math.max(0, soma(fc) + mc), multC = multCura(a, c);
      return { partes: [{ rot: a.cura.qtd + a.cura.dado, faces: fc }], fixos: [{ rot: attrName[a.cura.mod], val: mc }], raw: rawC, mult: multC, total: rawC * multC };
    }
    var partes = [], total = 0;
    var base = rolar(a.qtd, a.dado);
    partes.push({ rot: a.qtd + a.dado, faces: base });
    total += soma(base);
    extras(a).forEach(function (e, i) {
      if (e.quando === "situacional" && !apply[i]) return;
      var f = rolar(e.qtd, e.dado);
      partes.push({ rot: e.qtd + e.dado + (e.quando === "situacional" ? " situacional" : ""), faces: f });
      total += soma(f);
    });
    var b = bonusMaestria(a, c), fixos = [];
    if (b && b.dado) {
      var fm = rolar(b.qtd, b.dado);
      partes.push({ rot: "maestria " + b.qtd + b.dado, faces: fm });
      total += soma(fm);
    } else if (b && b.fixo) {
      fixos.push({ rot: "maestria", val: b.fixo });
      total += b.fixo;
    }
    if (a.mod) {
      var mk = modDano(a, c), m = R.mod(c, mk);
      fixos.push({ rot: attrName[mk], val: m });
      total += m;
    }
    if (a.fixo) { fixos.push({ rot: "fixo", val: Number(a.fixo) }); total += Number(a.fixo); }
    var danoPassivo = R.passivos(c).dano[a.tipo] || 0;   // bônus fixo de dano das habilidades de classe
    var fu = a.tipo === "fisico" ? R.furiaAtual(c) : 0;   // Fúria do Berserker já está dentro de passivos.dano; aqui aparece separada
    var psl = a.tipo === "fisico" ? R.poderSemLimite(c) : 0;   // Poder Sem Limite (Sayajin Lendário), também separado
    danoPassivo -= fu + psl;
    if (danoPassivo) { fixos.push({ rot: "habilidades de classe", val: danoPassivo }); total += danoPassivo; }
    if (fu) { fixos.push({ rot: "Fúria", val: fu }); total += fu; }
    if (psl) { fixos.push({ rot: "Poder Sem Limite", val: psl }); total += psl; }
    var tb = window.DBOTransf ? DBOTransf.bonus(c).dano : 0;
    if (tb) { fixos.push({ rot: "transformação", val: tb }); total += tb; }
    var fe = window.DBOEfeitos ? DBOEfeitos.dano(c) : 0;          // Crueldade
    if (fe) { fixos.push({ rot: "efeitos", val: fe }); total += fe; }
    var raw = Math.max(0, total);
    var mult = a.tipo === "ki" ? R.danoKi(c) : R.danoFisico(c);
    var fator = window.DBOEfeitos ? DBOEfeitos.danoFinal(c) : 1;   // Queimadura (menos dano) e Sobrecarga (mais dano)
    return { partes: partes, fixos: fixos, raw: raw, mult: mult, fator: fator, total: Math.round(raw * mult * fator) };
  }
  function descrever(res) {
    var itens = res.partes.map(function (p) { return p.rot + ": " + p.faces.join(" + "); });
    res.fixos.forEach(function (f) { itens.push(f.rot + " " + signed(f.val)); });
    return "(" + itens.join(" · ") + ") × " + UI.fmt(res.mult) + (res.fator && res.fator !== 1 ? " × " + String(Math.round(res.fator * 100) / 100).replace(".", ",") + " (efeitos)" : "");
  }

  /* ---------- Componente visual ----------
     ctx: { rolls, opened, get(): personagem atual, refresh(), onUse(): soma 1 uso (ou ausente) } */
  // Detalhes de uma habilidade genérica: bônus por maestria (cumulativos), com os já conquistados em destaque.
  function detailsGenerica(t, c, add, box) {
    var def = t.def, n = Math.min(t.copias, def.max);
    add("Nome", t.nome);
    add("Descrição", t.descricao);
    add("Maestria", "Maestria " + n + " de " + def.max + (n >= def.max ? " (máxima)" : ". Para subir, aprenda de novo: ocupa mais um espaço."));
    add(def.textos ? "Efeito agora" : "Bônus agora", textoGenerica(def, n));
    var list = el("ul", "class-effects");
    if (def.textos) {
      def.textos.forEach(function (tx, i) {
        var li = el("li", i < n ? "is-on" : "is-off");
        li.appendChild(el("b", "", "Maestria " + (i + 1) + (def.nomes ? " · " + def.nomes[i] : "")));
        li.appendChild(document.createTextNode(" " + tx));
        list.appendChild(li);
      });
      add("Maestrias", list);
      return box;
    }
    for (var i = 1; i <= def.max; i++) {
      var li = el("li", i <= n ? "is-on" : "is-off");
      li.appendChild(el("b", "", "Maestria " + i));
      li.appendChild(document.createTextNode(" +" + UI.fmt(def.por) + " " + def.rotulo + (i === 1 ? "" : ", acumulando com as anteriores") +
        (i === def.max ? ". Maestria máxima: mais +" + UI.fmt(def.maximo) + " " + def.rotulo : "") + "."));
      list.appendChild(li);
    }
    add("Efeitos de aprimoramento", list);
    return box;
  }

  // Exclusiva: texto das duas maestrias, a atual em destaque; a 2 pede 2 cópias e nível 100.
  function detailsExclusiva(t, c, add, box) {
    var def = t.def, m = maestria(t, c), nv2 = def.nivel2 || 100;
    add("Nome", t.nome);
    add("Descrição", t.descricao);
    add("Origem", "Habilidade exclusiva de " + def.classe + ". Não custa TP e cada cópia ocupa 1 espaço de técnica de classe.");
    add("Maestria", "Maestria " + m + " de 2" + (m < 2 ? (t.copias >= 2 ? ". A maestria 2 libera no nível " + nv2 + " (você está no " + c.nivel + ")." : ". Para a maestria 2, aprenda de novo (mais um espaço) a partir do nível " + nv2 + ".") : " (máxima). A maestria 2 substitui a 1."));
    var list = el("ul", "class-effects");
    def.m.forEach(function (x, i) {
      var li = el("li", i + 1 === m ? "is-on" : "is-off");
      li.appendChild(el("b", "", "Maestria " + (i + 1) + (i ? " (nível " + nv2 + "+)" : "")));
      li.appendChild(document.createTextNode(" " + x.texto));
      list.appendChild(li);
    });
    add("Efeitos", list);
    var u = usoExclusiva(t, c);
    if (u && u.kp) add("Custo de KP ao usar", Math.round(u.kp * 100) + "% do KP máximo (" + UI.fmt(Math.ceil(R.kpMax(c) * u.kp)) + " KP).");
    return box;
  }

  // Detalhes de uma habilidade de classe: descrição, maestria (pelo nível) e os efeitos de cada maestria, os já liberados em destaque.
  function detailsClasse(t, c) {
    var box = el("dl", "tech__details");
    function add(label, value) {
      var row = el("div", "tech__row");
      row.appendChild(el("dt", "", label));
      var dd = el("dd");
      if (value && value.nodeType) dd.appendChild(value); else dd.textContent = value;
      row.appendChild(dd);
      box.appendChild(row);
    }
    if (t.generica) return detailsGenerica(t, c, add, box);
    if (t.sub) {
      var sd = t.def;
      add("Nome", t.nome + (sd.japones ? " (" + sd.japones + ")" : ""));
      add("Origem", sd.dragao ? "Rugir do Dragão da sub-classe " + sd.subclasse + ". Vem sozinho no nível " + sd.nivel + ", não ocupa espaço e custa " + (sd.custoPd || 1) + " Ponto do Dragão (uma vez por combate)."
        : "Habilidade " + ROMANO[sd.cat] + (sd.variante ? ", variante " + sd.variante : "") + " da sub-classe " + sd.subclasse + ". Libera no nível " + sd.nivel + ", não custa TP e ocupa 1 espaço de técnica de classe.");
      if (sd.tipo) add("Tipo", sd.tipo);
      if (sd.frase) add("Frase", "“" + sd.frase + "”");
      var txt = el("div", "sub-texto");
      (sd.texto || []).forEach(function (l) { txt.appendChild(el("p", "", l)); });
      add("Efeito", txt);
      if (sd.uso) add("Botão Usar", resumoUso(sd.uso));
      return box;
    }
    if (t.exclusiva) return detailsExclusiva(t, c, add, box);
    var def = t.def, m = maestria(t, c), next = def.niveis[m];   // niveis[m] = nível da próxima maestria
    add("Nome", t.nome);
    add("Descrição", t.descricao);
    add("Origem", "Habilidade de classe (" + def.classe + "). Não custa TP e não vai para o inventário de técnicas.");
    add("Maestria", "Maestria " + m + " · " + (next ? "próxima no nível " + next + " (você está no " + c.nivel + ")" : "maestria máxima") +
      (def.cumulativo ? ". Os efeitos são acumulativos." : ". Os efeitos não são acumulativos: vale só o da maestria atual."));
    var list = el("ul", "class-effects");
    def.efeitos.forEach(function (grupo, i) {
      var ligado = def.cumulativo ? i < m : i === m - 1;
      grupo.forEach(function (e) {
        var li = el("li", ligado ? "is-on" : "is-off");
        li.appendChild(el("b", "", "Maestria " + (i + 1) + (ligado ? "" : " (nível " + def.niveis[i] + ")")));
        li.appendChild(document.createTextNode(" " + e.texto));
        if (e.tipo === "interpretativo") li.appendChild(el("em", "class-effects__tag", "interpretativo"));
        list.appendChild(li);
      });
    });
    add("Efeitos de aprimoramento", list);
    if (t.cura) {
      add("Efeito de cura", t.cura.qtd + t.cura.dado + " + " + attrName[t.cura.mod] + ", × multiplicador de Ki (" + String(multCura(t, c)).replace(".", ",") + " com a maestria). Alvo único, em quem acertar.");
      add("Custo de KP ao usar", UI.fmt(custoKp(t, c)) + " KP (o dobro de uma habilidade de dano comum)");
    }
    ativacoes(t, c).forEach(function (a) {
      add("Ativação", "Gasta " + Math.round(a.custoKp * 100) + "% do KP máximo (" + UI.fmt(custoAtivacao(c, a)) + " KP) e dá + " + a.valor + " em " + attrName[a.atributo] + " no próximo teste.");
    });
    return box;
  }

  // Efeitos da técnica com o grau atual (pela maestria), o que o grau faz e, nas penalidades, o teste de resistência.
  function listaEfeitos(t, c, lista) {
    var FX = window.DBOEfeitos;
    if (!lista.length) return "Nenhum";
    if (!FX) return lista.join(", ");
    var m = maestria(t, c), ul = el("ul", "fx-list");
    lista.forEach(function (s) {
      var r = FX.ler(s), li = el("li", "fx-list__item");
      if (!r.def) { li.textContent = r.original + " (efeito removido do sistema)"; li.classList.add("is-off"); ul.appendChild(li); return; }
      var ef = FX.efetivo ? FX.efetivo(t, r) : null;
      var g = ef ? FX.grauEfetivo(r.def, ef.alvo, m) : FX.grauDaMaestria(m);
      var head = el("span", "fx-list__head");
      head.appendChild(el("b", "fx-name fx-name--" + r.def.tipo, FX.rotulo(r.def, r.param)));
      head.appendChild(el("span", "fx-grau", "Grau " + FX.ROMANO[g]));
      li.appendChild(head);
      if (ef && r.def.id !== "aprimorar") {
        var du = FX.DUR_POR[ef.dur];
        li.appendChild(el("span", "fx-list__alvo", "Alvo: " + (ef.alvo === "n" ? ef.n + " seres à escolha" : FX.ALVOS[ef.alvo]) + " · Duração: " + du.nome + " (" + du.texto + ")"));
      }
      li.appendChild(el("span", "fx-list__val", FX.valorGrau(r.def.graus, g) + (r.def.tipo === "penalidade" ? " · o alvo resiste com " + FX.resisteTexto(r.def) + " contra RD " + rd(c, t) : "")));
      ul.appendChild(li);
    });
    return ul;
  }

  function details(t, showPl, c, ctx) {
    if (isClasse(t)) return detailsClasse(t, c);
    var box = el("dl", "tech__details");
    function add(label, value) {
      var row = el("div", "tech__row");
      row.appendChild(el("dt", "", label));
      var dd = el("dd");
      if (value && value.nodeType) dd.appendChild(value); else dd.textContent = value;
      row.appendChild(dd);
      box.appendChild(row);
    }
    add("Nome", t.nome);
    add("Descrição", t.descricao || "Sem descrição ainda.");
    add("Tipo", tipoRotulo(t));
    add("Modificador", t.mod ? attrName[t.mod] : "Nenhum");
    if (temDano(t)) {
      add("Dano", damageText(t));
      var ex = extras(t);
      add("Dados adicionais", ex.length ? ex.map(extraTexto).join("; ") : "Nenhum");
    }
    if (showPl) add("TPs gastos para aprender", UI.fmt(t.tp || 0));
    add("Efeitos de penalidade", listaEfeitos(t, c, penalidades(t)));
    add("Efeitos de fortalecimento", listaEfeitos(t, c, fortalecimentos(t)));
    ativacoes(t, c).forEach(function (a) {
      add("Ativação", "Gasta " + Math.round(a.custoKp * 100) + "% do KP máximo (" + UI.fmt(custoAtivacao(c, a)) + " KP) e dá + " + a.valor + " em " + attrName[a.atributo] + " no próximo teste.");
    });

    // Maestria e contador de usos
    var m = maestria(t, c), prox = proxima(t, c), fixed = fixa(t);
    var mast = el("div", "mastery");
    var info = el("div", "mastery__info");
    info.appendChild(el("strong", "", "Maestria " + m));
    info.appendChild(el("small", "", fixed ? "Definida pela raça (" + (c.subraca || c.raca) + "). Não muda com o uso." : (Number(t.usos) || 0) + " usos · " +
      (prox ? "faltam " + prox.faltam + " para a maestria " + (m + 1) + " (" + (Number(t.usos) || 0) + "/" + prox.alvo + ")" : "maestria máxima")));
    mast.appendChild(info);
    add("Maestria", mast);
    if (temDano(t)) add("Bônus de dano da maestria", bonusTexto(t, c));
    if (ctx.onUse && semKi(t)) add("Custo de KP ao usar", "Não gasta ki");
    else if (ctx.onUse) add("Custo de KP ao usar", UI.fmt(custoKp(t, c)) + " KP" + (t.gastaHp ? " (gasta " + UI.fmt(custoHp(t, c)) + " HP, ao invés de KP)" : "") + (kpPartes(t, c).efeitos || kpPartes(t, c).mult !== 1 ? " (dano e efeitos somados)" : " (dano máximo " + danoMaximo(t, c) + " × " + String(R.danoKi(c)).replace(".", ",") + " ÷ 2)"));
    var rdClasse = R.passivos(c).rd;
    add("RD ao usar a habilidade", rd(c, t) + " (8 + " + (t.mod ? attrName[t.mod] + " " + R.mod(c, t.mod) : "sem modificador (0)") + " + nível ÷ 10" + (rdClasse ? " + " + rdClasse + " de habilidades de classe" : "") + " = " + R.rdHabilidade(c, t.mod) +
      (buffRd(t) ? " + " + (m - 1) + " da maestria, por ter efeito de penalidade" : "; sem buff de maestria") + ")");
    return box;
  }

  // Faixa colorida à esquerda das habilidades de classe: genérica (cinza), sub-classe (roxa) e a cor de cada classe.
  var FAIXA_CLASSE = { "Guerreiro": "guerreiro", "Monge": "monge", "Suporte": "suporte", "Curandeiro": "suporte", "Artífice": "artifice" };
  function faixa(t) {
    if (!t.classe || t.dragao || !t.def) return "";
    var tipo = t.generica || t.def.generica ? "generica" : t.sub || t.def.sub ? "sub" : FAIXA_CLASSE[t.def.classe];
    return tipo ? " tech--faixa tech--faixa-" + tipo : "";
  }
  function node(t, key, tagName, showPl, c, ctx) {
    if (t.racial) return nodeRacial(t, key, tagName, c, ctx);
    var rolls = ctx.rolls, opened = ctx.opened;
    var n = el(tagName, "tech" + (t.dragao ? " tech--dragao" : t.sub ? " tech--sub" : "") + faixa(t));
    var top = el("div", "tech__top");

    var nameBtn = el("button", "tech__name");
    nameBtn.type = "button";
    nameBtn.setAttribute("aria-expanded", String(!!opened[key]));
    nameBtn.appendChild(el("strong", "", t.nome));
    nameBtn.appendChild(el("small", "", damageText(t) + (t.sub ? "" : " · Maestria " + maestria(t, c))));
    nameBtn.addEventListener("click", function () { opened[key] = !opened[key]; ctx.refresh(); });
    top.appendChild(nameBtn);
    if (ctx.onUse && (!isClasse(t) || t.cura)) {
      var cost = custoComReforco(t, c), rfAqui = reforcoPara(c, t);
      var use = el("button", "btn use-btn", "Usar");
      use.type = "button";
      use.title = (cost ? "Usar: gasta " + UI.fmt(cost) + " KP" : "Usar: não gasta ki") + (rfAqui ? " (com " + rfAqui.fonte + ")" : "");
      if (rfAqui) { use.classList.add("use-btn--reforco"); use.textContent = "Usar ⚡"; }
      use.setAttribute("aria-label", "Usar " + t.nome + ", gasta " + UI.fmt(cost) + " de KP");
      armar(use, function () {
        var cur = ctx.get(), custo = custoComReforco(t, cur), rf = reforcoPara(cur, t);
        var trava = bloqueioEfeitos(cur, t.tipo === "ki" && temDano(t) ? "ki" : custo > 0 ? "kp" : "acao");
        if (trava) { UI.bigAlert("Interação falhou: " + trava + "\nSeu uso foi negado."); return; }
        var hpc = custoHp(t, cur), hpAt = R.hpAtual(cur);
        if (hpc && hpAt - hpc < 1) { UI.bigAlert("Interação falhou: HP insuficiente.\nSeu uso foi negado."); return; }
        if (!hpc && kpDe(cur) < custo) { UI.bigAlert("Interação falhou: KI insuficiente.\nSeu uso foi negado."); return; }
        // Na Sessão (combate), escolhe os alvos antes; cancelar não gasta nada.
        var usar = function (alvos) {
          if (hpc) ctx.onUse(0, hpc); else ctx.onUse(custo);
          if (rf) { gastarReforco(cur); UI.toast(rf.fonte + " aplicada em " + t.nome + (rf.texto ? ": " + rf.texto : "") + "."); }
          if (window.DBOSessao && DBOSessao.registrarUso && !isClasse(t)) DBOSessao.registrarUso(t, alvos || []);
          // Fortalecimentos da técnica (menos o Aprimorar, que é o botão Ativar) valem em quem usou: escolhe a duração e aplica.
          if (window.DBOEfeitos && window.DBOEfeitosUI && DBOEfeitosUI.host && !isClasse(t)) {
            var bufs = fortalecimentos(t).map(DBOEfeitos.ler).filter(function (r) { return r.def && r.def.id !== "aprimorar"; });
            if (bufs.length) DBOEfeitosUI.aplicarTecnica(t.nome, bufs, DBOEfeitos.grauDaMaestria(maestria(t, ctx.get())));
          }
        };
        if (ctx.escolherAlvos && !isClasse(t)) ctx.escolherAlvos(t, usar); else usar([]);
      });
      top.appendChild(use);
    }
    if ((t.exclusiva || (t.sub && !t.dragao)) && ctx.onKp && usoExclusiva(t, c)) {   // exclusiva com efeito: gasta KP e/ou cura, aplica o que for seu
      var ub = el("button", "btn use-btn", "Usar");
      ub.type = "button";
      ub.title = "Usar " + t.nome;
      armar(ub, function () { usarExclusiva(t, ctx); });
      top.appendChild(ub);
    }
    if (ctx.onPd && t.dragao) {                          // Rugir do Dragão: gasta Pontos do Dragão
      var custoPd = t.def.custoPd || 1;
      var usePd = el("button", "btn use-btn use-btn--pd", "Usar");
      usePd.type = "button";
      usePd.title = "Usar: gasta " + custoPd + " Ponto do Dragão";
      usePd.setAttribute("aria-label", "Usar " + t.nome + ", gasta " + custoPd + " Ponto do Dragão");
      armar(usePd, function () {
        var cur = ctx.get();
        if (R.pdAtual(cur) < custoPd) { UI.bigAlert("Interação falhou: Pontos do Dragão insuficientes.\nSeu uso foi negado."); return; }
        ctx.onPd(custoPd);
      });
      top.appendChild(usePd);
    }
    if (ctx.onKp) ativacoes(t, c).forEach(function (ativ, idx, todas) {
      var b = el("button", "btn use-btn use-btn--ativar", "Ativar" + (todas.length > 1 ? " " + attrName[ativ.atributo] : ""));
      b.type = "button";
      b.title = "Ativar: gasta " + UI.fmt(custoAtivacao(c, ativ)) + " KP e dá + " + ativ.valor + " em " + attrName[ativ.atributo] + " no próximo teste";
      b.addEventListener("click", function () {
        var cur = ctx.get(), custo = custoAtivacao(cur, ativ), ja = pendente(cur);
        var trava2 = bloqueioEfeitos(cur, "ativar");
        if (trava2) { UI.bigAlert("Interação falhou: " + trava2 + "\nSua ativação foi negada."); return; }
        if (ja) { UI.toast("Você já tem um bônus esperando: " + attrName[ja.atributo] + " + " + ja.valor + ". Use ele antes (ou cancele)."); return; }
        if (kpDe(cur) < custo) { UI.bigAlert("Interação falhou: KI insuficiente.\nSua ativação foi negada."); return; }
        ctx.onKp(custo);
        pendSalvar(cur, { atributo: ativ.atributo, valor: ativ.valor, fonte: ativ.fonte });
        // Inventor (maestria 3): a ativação também dá Precisão Grau I até o fim do próximo turno.
        if (isClasse(t) && window.DBOEfeitos && window.DBOEfeitosUI && DBOEfeitosUI.host && R.efeitosAtivos(t.def, cur.nivel).some(function (x) { return x.tipo === "precisao"; })) {
          var hp = DBOEfeitosUI.host, rr = DBOEfeitos.adicionar(hp.get(), "precisao", { grau: 1, rodadas: 1, fonte: t.nome });
          hp.save({ efeitosAtivos: rr.lista });
        }
        UI.toast(ativ.fonte + ": + " + ativ.valor + " em " + attrName[ativ.atributo] + " no seu próximo teste.");
      });
      top.appendChild(b);
    });
    top.appendChild(el("span", "tag tag--" + (t.dragao ? "dragao" : tipoClasse(t)), t.dragao ? (t.def.custoPd || 1) + " PD" : tipoRotulo(t)));

    var dice = el("button", "die");
    dice.type = "button";
    dice.innerHTML = DIE_ICON;
    dice.setAttribute("aria-label", "Rolar d20 de " + t.nome);
    dice.title = "Rolar d20";
    dice.addEventListener("click", function () {
      var cur = ctx.get(), natural = die(20), modAttr = t.mod ? R.mod(cur, t.mod) : 0, bonusT = window.DBOTransf ? DBOTransf.bonus(cur).teste : 0;
      var bonusC = temDano(t) ? R.passivos(cur).ataque[t.tipo] || 0 : 0;        // habilidades de classe: bônus em testes de ataque
      var pend = usarPendente(cur, t.mod), bonusP = pend ? pend.valor : 0;      // ativação ("próximo teste")
      var bonusE = window.DBOEfeitos ? DBOEfeitos.ataque(cur) : 0;               // efeitos ativos (Precisão, Concussão, Cegueira)
      var mod = modAttr + bonusT + bonusC + bonusP + bonusE;
      noPrato("Teste de " + t.nome, [{ lados: 20, valor: natural }], function (ds) {
        var nat = ds && ds[0] ? ds[0].valor : natural;   // com pontaria, o d20 pode ter sido dobrado
        rolls[key] = { natural: nat, base: natural, mod: mod, total: nat + mod, dano: null, apply: {} };
        ctx.refresh();
      }, { fixos: [{ rot: t.mod ? attrName[t.mod] : "", val: modAttr }, { rot: "transformação", val: bonusT }, { rot: "habilidades de classe", val: bonusC }, { rot: pend ? "ativação" : "", val: bonusP }, { rot: "efeitos", val: bonusE }],
           total: function (ds) { return ds[0].valor + mod; }, pontaria: false });
    });
    if (temDado(t)) top.appendChild(dice);   // só penalidade: sem dado
    n.appendChild(top);

    var r = rolls[key];
    if (r) {
      var panel = el("div", "rollpanel");
      var close = el("button", "rollclose", "×");
      close.type = "button";
      close.setAttribute("aria-label", "Fechar a rolagem de " + t.nome);
      close.addEventListener("click", function () { delete rolls[key]; ctx.refresh(); });
      panel.appendChild(close);

      var rb = el("div", "rollbox" + ((r.base || r.natural) === 20 ? " rollbox--crit" : (r.base || r.natural) === 1 ? " rollbox--fail" : ""));
      rb.setAttribute("role", "status");
      rb.appendChild(el("b", "rollbox__total", String(r.total)));
      rb.appendChild(el("small", "", "d20 " + r.natural + (r.mod ? " " + signed(r.mod) : "")));
      panel.appendChild(rb);

      var dmg = el("button", "btn btn--hit", t.cura ? "Rolar cura" : "Rolar dano");
      dmg.type = "button";
      dmg.addEventListener("click", function () {
        if (window.DBOPrato && DBOPrato.ocupado()) return;
        var res = rolarDano(t, ctx.get(), r.apply);
        noPrato((t.cura ? "Cura de " : "Dano de ") + t.nome, dadosDe(res.partes), function (ds) { r.dano = recalcular(res, ds); ctx.refresh(); },
          { fixos: res.fixos, mult: res.mult, pontaria: !!t.pontaria, total: function (ds) { return recalcular(res, ds).total; } });
      });
      if (temDano(t) || t.cura) panel.appendChild(dmg);

      // Dados situacionais: o jogador marca os que valem nesta rolagem.
      var sit = extras(t).map(function (e, i) { return { e: e, i: i }; }).filter(function (x) { return x.e.quando === "situacional"; });
      if (sit.length) {
        var wrap = el("div", "sit");
        sit.forEach(function (x) {
          var label = el("label", "sit__opt");
          var cb = el("input");
          cb.type = "checkbox";
          cb.checked = !!r.apply[x.i];
          cb.addEventListener("change", function () { r.apply[x.i] = cb.checked; });
          label.appendChild(cb);
          label.appendChild(el("span", "", "+ " + x.e.qtd + x.e.dado + (x.e.condicao ? " · " + x.e.condicao : "")));
          wrap.appendChild(label);
        });
        panel.appendChild(wrap);
      }

      if (r.dano) {
        var out = el("div", "dmg-out");
        out.setAttribute("role", "status");
        out.appendChild(el("b", "dmg-out__total", UI.fmt(r.dano.total)));
        out.appendChild(el("small", "", (t.cura ? "cura" : "dano de " + (t.tipo === "ki" ? "Ki" : "físico")) + ": " + descrever(r.dano)));
        panel.appendChild(out);
      }
      n.appendChild(panel);
    }
    if (opened[key]) n.appendChild(details(t, showPl, c, ctx));
    return n;
  }

  return {
    usosPorUso: usosPorUso, reforcoAtivo: reforcoAtivo, custoComReforco: custoComReforco,
    LADDER: LADDER, LIMITS: LIMITS, rotuloSub: rotuloSub, ROMANO: ROMANO, isClasse: isClasse, daClasse: daClasse, daGenerica: daGenerica, daExclusiva: daExclusiva, daRaca: daRaca, ativacoes: ativacoes, pendente: pendente, usarPendente: usarPendente, cancelarPendente: cancelarPendente, definirPendente: pendSalvar, custoAtivacao: custoAtivacao, textoGenerica: textoGenerica, temDano: temDano, penalidades: penalidades, fortalecimentos: fortalecimentos, tipoRotulo: tipoRotulo, tipoClasse: tipoClasse, temDado: temDado,
    fixa: fixa, maestria: maestria, proxima: proxima, bonusMaestria: bonusMaestria, bonusTexto: bonusTexto, rd: rd,
    damageText: damageText, custoKp: custoKp, custoHp: custoHp, kpPartes: kpPartes, semKi: semKi, danoMaximo: danoMaximo, rolarDano: rolarDano, descrever: descrever, node: node
  };
})();
