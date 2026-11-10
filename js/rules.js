// Dragon Ball Omega — REGRAS DO SISTEMA
//
// Todas as fórmulas da ficha passam por aqui. Para mudar uma regra, mexa só neste arquivo.
// Cada função recebe o personagem `c` (c.nivel, c.classe, c.atributos, c.tpGastos, c.tecnicas...).
window.DBORules = (function () {
  // Números de cada classe. HP, KP e danos são multiplicados por 2^((N-1)/7).
  //   corpo: valor fixo + modificador do atributo indicado (se o modificador for positivo, conta só a metade, arredondada para cima; mínimo 4).
  //   fisico / ki: base do multiplicador de dano.
  var CLASSES = {
    "Guerreiro":  { hp: 24000, kp: 8000,  corpo: [6, "velocidade"], fisico: 320, ki: 200 },
    "Monge":      { hp: 12000, kp: 24000, corpo: [6, "velocidade"], fisico: 200, ki: 320 },
    "Artífice":   { hp: 16000, kp: 16000, corpo: [5, "mente"],      fisico: 250, ki: 250 },
    "Suporte":    { hp: 8000,  kp: 32000, corpo: [4, "espirito"],   fisico: 150, ki: 300 }
  };
  function daClasse(c) { return CLASSES[c.classe] || CLASSES["Artífice"]; }
  var CORPO_MINIMO = 4;
  var PL_BASE_INICIAL = 10000;
  var PL_BASE_MAXIMA = 1000000;
  var BASE_MINIMA = 2000; // piso da base de HP e KP, antes do crescimento por nível
  var PL_POR_TP = 10; // quanto cada TP gasto soma ao Power Level base

  /* ---------- CUSTO DE TP DAS TÉCNICAS (mexa aqui para rebalancear) ----------
     O custo de uma técnica sai dos dados do efeito de dano (dados base + dados adicionais):
       - cada dado custa o valor da tabela abaixo; soma-se o custo de todos os dados;
       - com N dados no total, a soma é multiplicada por FATOR_DADOS elevado a (N - 1):
         1 dado = x1, 2 dados = x2, 3 dados = x4, 4 dados = x8...
       Ex.: 1d3 = 3 TP | 2d3 = (3 + 3) x 2 = 12 TP | 3d3 = 9 x 4 = 36 TP | 1d3 + 1d4 = (3 + 4) x 2 = 14 TP.
     Efeitos de penalidade e de fortalecimento somam o próprio custo DEPOIS da conta dos dados (DBOEfeitos.custo).
     LIMITE_TP = maior valor de TP que o banco guarda (coluna int do Postgres): técnica que custa mais que isso não pode ser criada. */
  var CUSTO_TP_DADO = { d3: 3, d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20 };   // cada dado custa o próprio grau (1d4 = 4 TP)
  /* Incremento fixo do dano (o "+5" de 2d10 + 5): também custa TP, e o custo dobra a cada ponto, como os dados.
       o ponto número k custa 5 × 2^(k − 1): +1 = 5 TP · +2 = 15 · +3 = 35 · +4 = 75 · +5 = 155 · +6 = 315.
     Assim, numa técnica sem incremento, os primeiros pontos são o jeito barato de subir o dano (2d6: +1 custa 5 TP;
     mais 1d6 custaria 48), e numa que já tem incremento alto, outro dado sai mais em conta (2d10 + 5: o 6º ponto custa
     160 TP; mais 1d10, 80). Incremento negativo não custa nem devolve TP. */
  var INCREMENTO_BASE = 5;
  function custoIncremento(fixo) { var i = Math.max(0, Math.floor(Number(fixo) || 0)); return i ? INCREMENTO_BASE * (Math.pow(2, i) - 1) : 0; }
  var FATOR_DADOS = 2;
  var LIMITE_TP = 2147483647;
  // Recebe a técnica ({ temDano, qtd, dado, extras: [{ qtd, dado }] }) e devolve o custo em TP.
  // Custo total: dados + efeitos. custoDados: só os dados (é ele que decide a regra dos 100 TP).
  // Dados x multiplicador do alvo do dano (Conjurador x0, Ser x0,75, Área x1, N seres 1 + 0,25 x N). É esse valor que decide a regra dos 100 TP.
  function custoDadosAlvo(t) { return custoDados(t) * (window.DBOEfeitos ? DBOEfeitos.multDano(t) : 1); }
  // Total: dados (com o alvo) + efeitos (alvo e duração). Penalidade no conjurador, ou fortalecimento em "seres atingidos", leva a técnica inteira a 40%.
  // Com o personagem (c), aplica descontos de habilidade (Pesquisador: Técnicas Otimizadas, −20%).
  function custoTecnica(t, c) {
    var FX = window.DBOEfeitos, total;
    if (!FX) total = custoDados(t);
    else {
      var e = FX.custoEfeitos(t); total = custoDadosAlvo(t) + e.total;
      if (e.reduz) total *= 0.4;
    }
    if (c && descontoTp(c)) total *= 1 - descontoTp(c);
    return Math.ceil(total - 1e-9);
  }
  function descontoTp(c) { return (c.habilidadesClasse || []).indexOf("pesquisador-1a") >= 0 ? 0.2 : 0; }
  function custoDados(t) {
    if (t.temDano === false) return 0;
    var soma = 0, n = 0;
    function conta(qtd, dado) {
      qtd = Math.max(0, Math.floor(Number(qtd) || 0));
      if (!qtd || !dado) return;
      soma += qtd * (CUSTO_TP_DADO[dado] || 0); n += qtd;
    }
    conta(t.qtd, t.dado);
    (t.extras || []).forEach(function (e) { conta(e.qtd, e.dado); });
    return (n ? soma * Math.pow(FATOR_DADOS, n - 1) : 0) + custoIncremento(t.fixo);
  }

  // Multiplicadores da transformação ativa (js/transformacoes-data.js). Sem o arquivo, não altera nada.
  function transf(c) { return window.DBOTransf ? DBOTransf.mults(c) : { pl: 1, dano: 1 }; }

  function crescimentoVida(c) { return Math.pow(2, (c.nivel - 1) / 7); }

  // Limite inicial do modificador a partir de 10: 10, 15, 25, 40, 60, 85...
  // (a diferença entre um limite e o próximo cresce de 5 em 5).
  function limite(m) { return 10 + 5 * m * (m - 1) / 2; }

  /* ---------- Habilidades de classe ---------- */
  // Todas as habilidades de classe do jogo, por id.
  function defClasse(id) {
    var all = DBOData.CLASS_ABILITIES || {}, found = null;
    Object.keys(all).forEach(function (k) { all[k].forEach(function (d) { if (d.id === id) found = Object.assign({}, d, { classe: k }); }); });
    (DBOData.GENERIC_CLASS_ABILITIES || []).forEach(function (d) { if (d.id === id) found = Object.assign({}, d, { classe: "*" }); });
    if (!found) found = defSubclasse(id);
    return found;
  }
  // Habilidade de sub-classe (js/subclasses-data.js), com a classe e a sub-classe dela.
  function defSubclasse(id) {
    var S = DBOData.SUBCLASS_ABILITIES || {}, I = DBOData.SUBCLASS_INFO || {}, found = null;
    Object.keys(S).forEach(function (sub) { S[sub].forEach(function (d) {
      if (d.id === id) found = Object.assign({}, d, { sub: true, subclasse: sub, classe: (I[sub] || {}).classe || "" });
    }); });
    return found;
  }
  // Números do aumento-base da sub-classe do personagem (vazio se não tem sub-classe).
  function baseSub(c) { var i = (DBOData.SUBCLASS_INFO || {})[c.subclasse]; return (i && i.numeros) || {}; }
  // Rugir do Dragão da sub-classe (a definição da habilidade): automático a partir do nível 20 (DBOData.SUBCLASS_UNLOCK[0]).
  // null antes do nível 20 ou sem sub-classe. Os Pontos do Dragão que ele gasta são pdMax / pdAtual.
  function rugirDoDragao(c) {
    var l = (DBOData.SUBCLASS_ABILITIES || {})[c.subclasse] || [];
    var d = l.filter(function (x) { return x.dragao; })[0];
    var nv = ((DBOData.SUBCLASS_UNLOCK || {})[0]) || 20;
    return d && (c.nivel || 1) >= nv ? defSubclasse(d.id) : null;
  }
  // Habilidade genérica: com `copias` cópias aprendidas (maestria = copias), dá copias x por (+ maximo na maestria máxima).
  function totalGenerica(def, copias) {
    if (def.textos) return 0;   // genérica de texto (Sensor de Ki, Piloto, Comilão)
    copias = Math.min(copias, def.max);
    return copias * def.por + (copias >= def.max ? def.maximo : 0);
  }
  // Bônus de modificador de habilidades genéricas de texto (Sensor de Presença: +1 CON na maestria 2).
  function bonusGenericas(c, chave) {
    var t = 0;
    habilidadesAgrupadas(c).forEach(function (g) {
      var m = g.def.generica && g.def.mods && g.def.mods[chave];
      if (m) t += m[Math.min(g.copias, g.def.max) - 1] || 0;
    });
    return t;
  }
  // Habilidades de classe do personagem, agrupadas: [{ def, copias }] na ordem em que aparecem (as genéricas repetidas viram uma só, com mais maestria).
  function habilidadesAgrupadas(c) {
    var out = [], idx = {};
    (c.habilidadesClasse || []).forEach(function (id) {
      var d = defClasse(id);
      if (!d) return;
      if ((d.generica || d.exclusiva) && idx[id] !== undefined) { out[idx[id]].copias++; return; }
      if (d.generica || d.exclusiva) idx[id] = out.length;
      out.push({ def: d, copias: 1 });
    });
    return out;
  }
  // Habilidade exclusiva: maestria 2 só com 2 cópias E nível 100+ (antes disso vale a 1).
  function maestriaExclusiva(def, copias, nivel) { return copias >= 2 && (nivel || 1) >= (def.nivel2 || 100) ? 2 : 1; }
  // Maestria que o personagem tem de uma exclusiva (0 se não tem).
  function exclusivaDoPersonagem(c, id) {
    var n = (c.habilidadesClasse || []).filter(function (x) { return x === id; }).length;
    var d = n ? defClasse(id) : null;
    return d && d.exclusiva ? maestriaExclusiva(d, n, c.nivel) : 0;
  }
  // Maestria da habilidade de classe pelo nível do personagem (niveis: nível em que cada maestria começa).
  function maestriaClasse(def, nivel) {
    var m = 0;
    def.niveis.forEach(function (n) { if (nivel >= n) m++; });
    return Math.max(1, m);
  }
  // Efeitos que valem agora: com maestria cumulativa, os de todas as maestrias até a atual; senão só os da atual.
  function efeitosAtivos(def, nivel) {
    var m = maestriaClasse(def, nivel), out = [];
    for (var i = def.cumulativo ? 0 : m - 1; i < m; i++) (def.efeitos[i] || []).forEach(function (e) { out.push(e); });
    return out;
  }
  // As habilidades de classe do personagem, já como definições (ids que não existem mais são ignorados).
  // Definições de todas as habilidades de classe que o personagem tem (uma por id em c.habilidadesClasse, com repetições).
  function habilidadesDeClasse(c) {
    return (c.habilidadesClasse || []).map(defClasse).filter(Boolean);
  }
  // Limite de pontos (TP) em um único atributo, por nível: de 15 em 15 níveis.
  var LIMITES_ATRIBUTO = [[1, 16], [15, 40], [30, 60], [45, 85], [60, 115], [75, 150], [90, 190], [105, 235], [120, 235], [135, 285], [150, 340], [165, 340], [180, 400], [195, 400]];
  function limiteAtributo(nivel) {
    var v = LIMITES_ATRIBUTO[0][1];
    LIMITES_ATRIBUTO.forEach(function (l) { if ((nivel || 1) >= l[0]) v = l[1]; });
    return v;
  }
  // Próximo nível em que o limite sobe: { nivel, limite } (ou null no limite final).
  function proximoLimiteAtributo(nivel) {
    var atual = limiteAtributo(nivel), r = null;
    LIMITES_ATRIBUTO.forEach(function (l) { if (!r && l[0] > (nivel || 1) && l[1] > atual) r = { nivel: l[0], limite: l[1] }; });
    return r;
  }
  // Primeiro nível em que o limite comporta `valor` pontos: { nivel, limite } (ou null se nunca).
  function nivelDoLimite(valor) {
    var r = null;
    LIMITES_ATRIBUTO.forEach(function (l) { if (!r && l[1] >= valor) r = { nivel: l[0], limite: l[1] }; });
    return r;
  }
  // Fator final de um multiplicador de dano: habilidades de sub-classe em porcentagem (Vidro e Fogo ×1,15) e
  // Dor é Combustível (Berserker: físico ×1,2 com 50% do HP ou menos, ×1,4 com 25% ou menos).
  function fatorMult(c, alvo) {
    var p = passivos(c), f = 1 + (p.pctMult[alvo] || 0);
    if (alvo === "fisico" && p.dorCombustivel) {
      var semPct = Math.round(Math.max(BASE_MINIMA, daClasse(c).hp + 2000 * DBORules.mod(c, "resistencia") + p.hp) * crescimentoVida(c) * (1 + p.pctHp));
      var hp = c.hpAtual == null || c.hpAtual === "" ? semPct : Number(c.hpAtual) || 0, fr = semPct ? hp / semPct : 1;
      if (fr <= 0.25) f *= 1.4; else if (fr <= 0.5) f *= 1.2;
    }
    return f;
  }
  // Poder Sem Limite (Sayajin Lendário): em combate, +(rodada − 1) no dano físico, até +5. Fora de combate, 0.
  function poderSemLimite(c) {
    if (!c || c.raca !== "Sayajin" || c.subraca !== "Sayajin Lendário") return 0;
    var rod = 1;
    try { if (window.DBOCombat && DBOCombat.active()) rod = Number(DBOCombat.rodada()) || 1; } catch (e) {}
    return Math.max(0, Math.min(5, rod - 1));
  }
  // Fúria do Berserker: a barra aparece depois do nível 30, quando ele escolhe a habilidade 1 (Fúria Crescente).
  // Máximo 5; sobe para 10 no nível 90. Cada ponto dá +1 em rolagens de dano físico.
  function furiaMax(c) {
    if (c.subclasse !== "Berserker" || (c.nivel || 1) < 30) return 0;
    if ((c.habilidadesClasse || []).indexOf("berserker-1a") < 0) return 0;
    return (c.nivel || 1) >= 90 ? 10 : 5;
  }
  function furiaAtual(c) { var m = furiaMax(c); return m ? Math.max(0, Math.min(m, Number(c.furiaAtual) || 0)) : 0; }
  // Bônus fixos que as habilidades de classe dão agora (e, no futuro, as técnicas com efeito de fortalecimento que tiverem valor definido).
  function passivos(c) {
    var p = { corpo: 0, hp: 0, kp: 0, rd: 0, espacoTec: 0, espacoInv: 0, mult: { fisico: 0, ki: 0 }, dano: { fisico: 0, ki: 0 }, ataque: { fisico: 0, ki: 0 },
      pctMult: { fisico: 0, ki: 0 }, pctHp: 0, iniciativa: 0, dorCombustivel: false,
      fontes: { corpo: [], hp: [], kp: [], fisico: [], ki: [] } };   // fontes: [nome, valor] de cada bônus (modo debug mostra a conta)
    function fonte(k, nome, v) { if (v) p.fontes[k].push([nome, v]); }
    var fu = furiaAtual(c), psl = poderSemLimite(c);
    if (fu) p.dano.fisico += fu;
    if (psl) p.dano.fisico += psl;   // Fúria: +1 por ponto no dano físico
    // Aumento-base da sub-classe
    var bs = baseSub(c);
    if (bs.hp) { p.hp += bs.hp; fonte("hp", c.subclasse, bs.hp); }
    if (bs.kp) { p.kp += bs.kp; fonte("kp", c.subclasse, bs.kp); }
    if (bs.corpo) { p.corpo += bs.corpo; fonte("corpo", c.subclasse, bs.corpo); }
    if (bs.ki) { p.mult.ki += bs.ki; fonte("ki", c.subclasse, bs.ki); }
    if (bs.fisico) { p.mult.fisico += bs.fisico; fonte("fisico", c.subclasse, bs.fisico); }
    habilidadesAgrupadas(c).forEach(function (g) {
      var def = g.def;
      if (def.sub) {
        var n = def.numeros || {};
        if (n.corpo) { p.corpo += n.corpo; fonte("corpo", def.nome, n.corpo); }
        if (n.hp) { p.hp += n.hp; fonte("hp", def.nome, n.hp); }
        if (n.kp) { p.kp += n.kp; fonte("kp", def.nome, n.kp); }
        if (n.espacoTec) p.espacoTec += n.espacoTec;
        if (n.espacoInv) p.espacoInv += n.espacoInv;
        if (n.pctKi) p.pctMult.ki += n.pctKi;               // Vidro e Fogo: multiplicador de Ki ×1,15
        if (n.pctFisico) p.pctMult.fisico += n.pctFisico;
        if (n.pctHp) p.pctHp += n.pctHp;                    // Vidro e Fogo: HP máximo −10%
        if (n.iniciativa) p.iniciativa += n.iniciativa;     // Passos de Vento: +2 na iniciativa
        if (n.dorCombustivel) p.dorCombustivel = true;      // Dor é Combustível (Berserker)
        return;
      }
      if (def.exclusiva) return;   // exclusivas: só texto e botão Usar (js/classes-exclusivas.js)
      if (def.generica) {
        var v = totalGenerica(def, g.copias);
        if (def.tipo === "corpo") { p.corpo += v; fonte("corpo", def.nome, v); }
        else if (def.tipo === "rd") p.rd += v;
        else if (def.tipo === "hp") { p.hp += v; fonte("hp", def.nome, v); }
        else if (def.tipo === "kp") { p.kp += v; fonte("kp", def.nome, v); }
        else if (def.tipo === "multiplicador") { p.mult[def.alvo] += v; fonte(def.alvo, def.nome, v); }
        else if (def.tipo === "espacoTecnica") p.espacoTec += v;
        else if (def.tipo === "espacoInventario") p.espacoInv += v;
        return;
      }
      efeitosAtivos(def, c.nivel).forEach(function (e) {
        if (e.tipo === "corpo") { p.corpo += e.valor; fonte("corpo", def.nome, e.valor); }
        else if (e.tipo === "hp") { p.hp += e.valor; fonte("hp", def.nome, e.valor); }
        else if (e.tipo === "kp") { p.kp += e.valor; fonte("kp", def.nome, e.valor); }
        else if (e.tipo === "multiplicador") { p.mult[e.alvo] += e.valor; fonte(e.alvo, def.nome, e.valor); }
        else if (e.tipo === "rolagem") { p.dano[e.alvo] += e.valor; p.ataque[e.alvo] += e.valor; }
      });
    });
    // Habilidades de raça e de sub-raça com números (Berço das Técnicas, Mente de Dois Mundos...)
    var perd = c.raciaisPerdidas || [];
    racaTodas(c).forEach(function (d) {
      if (!d.numeros || perd.indexOf(d.id) >= 0) return;
      if (d.numeros.espacoTec) p.espacoTec += d.numeros.espacoTec;
      if (d.numeros.rd) p.rd += d.numeros.rd;
    });
    // Fortalecimentos de técnicas não são passivos: valem pela duração, como efeitos ativos (js/efeitos-data.js).
    return p;
  }
  // Habilidades da raça + as da sub-raça (js/subracas-data.js). Cada uma leva `sub` (nome da sub-raça) quando vem dela.
  function racaTodas(c) {
    var D = window.DBOData || {}, r = (D.RACE_ABILITIES || {})[c.raca] || [], s = (D.SUBRACE_ABILITIES || {})[c.raca + "|" + c.subraca] || [];
    return r.concat(s.map(function (d) { return Object.assign({ sub: c.subraca }, d); }));
  }
  // Espaços do inventário de técnicas de classe: 2 no começo, +1 a cada 15 níveis e +1 no nível 200.
  function limiteClasse(c) { return c.npc ? Infinity : 2 + Math.floor((c.nivel || 1) / 15) + ((c.nivel || 1) >= 200 ? 1 : 0); }
  // Habilidade inicial da classe (todo personagem a tem desde o nível 1).
  function inicialDaClasse(classe) {
    var l = (DBOData.CLASS_ABILITIES || {})[classe] || [];
    return l.filter(function (d) { return d.inicial; })[0] || null;
  }

  return {
    // Bônus de iniciativa de habilidades (Velocista: Passos de Vento +2).
    bonusIniciativa: function (c) { return passivos(c).iniciativa; },
    fatorMult: fatorMult, custoIncremento: custoIncremento, descontoTp: descontoTp,
    // Maestria de uma habilidade genérica no personagem (0 = não tem).
    maestriaGenerica: function (c, id) { var g = habilidadesAgrupadas(c).filter(function (x) { return x.def.id === id; })[0]; return g ? Math.min(g.copias, g.def.max) : 0; },
    CUSTO_TP_DADO: CUSTO_TP_DADO, FATOR_DADOS: FATOR_DADOS, LIMITE_TP: LIMITE_TP, custoTecnica: custoTecnica, custoDados: custoDados, custoDadosAlvo: custoDadosAlvo,
    // Modificador de um atributo.
    //   0 a 9: começa em -5 e sobe 1 a cada 2 pontos, chegando a 0 no 9.
    //   10 em diante: +1 em 10; depois +2 em 15, +3 em 25, +4 em 40, +5 em 60...
    // O limite é incluso no degrau de cima (15 já é +2).
    modificador: function (valor) {
      valor = Math.max(0, Math.floor(Number(valor) || 0));
      if (valor < 10) return -5 + Math.floor((valor + 1) / 2);
      var m = Math.floor((1 + Math.sqrt(1 + 8 * (valor - 10) / 5)) / 2);
      while (limite(m + 1) <= valor) m++;
      while (m > 1 && limite(m) > valor) m--;
      return m;
    },

    // Valor base do Power Level: 10.000, aumentado em 10 a cada
    // TP gasto (atributos e técnicas), com teto de 1.000.000.
    powerLevelBase: function (c) {
      // NPC: o mestre escolhe o PL base (no lugar de raça + classe) e não há teto; os TPs gastos continuam somando.
      if (c.npc) return Math.max(0, this.plInicial(c) + PL_POR_TP * (Number(c.tpGastos) || 0));
      return Math.min(PL_BASE_MAXIMA, this.plRaca(c) + this.plClasse(c) + PL_POR_TP * (Number(c.tpGastos) || 0));
    },
    // PL de partida: raça + classe (no NPC, o PL base que o mestre escreveu, se escreveu).
    plInicial: function (c) { return c.npc && c.plBase != null && c.plBase !== "" ? Math.max(0, Number(c.plBase) || 0) : this.plRaca(c) + this.plClasse(c); },
    // PL de partida da sub-raça (ou da raça, se não tem sub-raça) e bônus da classe. Sem dado: 10.000 e 0.
    chaveRaca: function (c) { var t = DBOData.SUBRACE_PL || {}; return t[c.raca + "|" + c.subraca] != null ? c.raca + "|" + c.subraca : (t[c.raca] != null ? c.raca : null); },
    plRaca: function (c) { var k = this.chaveRaca(c); return k ? DBOData.SUBRACE_PL[k] : PL_BASE_INICIAL; },
    plClasse: function (c) { return (DBOData.CLASS_PL || {})[c.classe] || 0; },
    powerLevel: function (c) {
      return Math.round(this.powerLevelBase(c) * Math.pow(2, (c.nivel - 1) / 10) * transf(c).pl);
    },

    // HP e KP dependem da classe.
    hpMax: function (c) {
      return Math.round(Math.max(BASE_MINIMA, daClasse(c).hp + 2000 * this.mod(c, "resistencia") + passivos(c).hp) * crescimentoVida(c) * (1 + passivos(c).pctHp));
    },
    kpMax: function (c) {
      return Math.round(Math.max(BASE_MINIMA, daClasse(c).kp + 2000 * this.mod(c, "espirito") + passivos(c).kp) * crescimentoVida(c));
    },

    // Experiência necessária para passar do nível n para o n+1:
    // 100 x 1.12^(n+1) - 100 x 1.12^n.
    xpProximoNivel: function (n) {
      return Math.max(1, Math.round(100 * Math.pow(1.12, n + 1) - 100 * Math.pow(1.12, n)));
    },

    // Modificador de um atributo do personagem pela chave (ex.: "forca").
    // O modificador já inclui o bônus (ou penalidade) da sub-raça (DBOData.SUBRACE_MODS).
    mod: function (c, chave) { return this.modificador((c.atributos || {})[chave] || 0) + this.bonusRaca(c, chave) + this.bonusSubclasse(c, chave) + bonusGenericas(c, chave) + (window.DBOTransf && DBOTransf.modAtributo ? DBOTransf.modAtributo(c, chave) : 0) + (window.DBOEfeitos ? DBOEfeitos.modAtributo(c, chave) : 0); },
    // Bônus de modificador do aumento-base da sub-classe (ex.: Guerreiro das Sombras +1 em Velocidade).
    bonusSubclasse: function (c, chave) { var m = baseSub(c).mods; return m && m[chave] ? m[chave] : 0; },
    bonusRaca: function (c, chave) {
      var t = DBOData.SUBRACE_MODS || {}, m = t[c.raca + "|" + c.subraca] || t[c.raca];
      return m && m[chave] ? m[chave] : 0;
    },
    // Habilidades raciais que o personagem ainda tem (as cortadas para sempre ficam em c.raciaisPerdidas).
    habilidadesRaciais: function (c) {
      var perdidas = c.raciaisPerdidas || [];
      return racaTodas(c).filter(function (d) { return perdidas.indexOf(d.id) < 0; });
    },

    // Corpo Base (a CA do sistema): valor fixo da classe + modificador do atributo da classe (positivo conta só a metade, para cima),
    // com mínimo 4. Os bônus de habilidades de classe entram depois do mínimo.
    corpoBase: function (c) {
      var regra = daClasse(c).corpo, m = this.mod(c, regra[1]);
      // Efeitos ativos (Resiliência, Paralisia, Quebra de Guarda...) somam depois de tudo.
      return Math.max(CORPO_MINIMO, regra[0] + (m > 0 ? Math.ceil(m / 2) : m)) + passivos(c).corpo + (window.DBOEfeitos ? DBOEfeitos.corpo(c) : 0);
    },

    // Multiplicadores de dano. A base da classe sobe 20 por ponto de modificador:
    // Força para o dano físico e Espírito para o dano de Ki.
    danoFisico: function (c) { return Math.max(0, Math.round(this.baseMultiplicadores(c).fisico * crescimentoVida(c) * transf(c).dano * fatorMult(c, "fisico"))); },
    danoKi: function (c) { return Math.max(0, Math.round(this.baseMultiplicadores(c).ki * crescimentoVida(c) * transf(c).dano * fatorMult(c, "ki"))); },
    // Base dos multiplicadores (antes do crescimento por nível). Sub-classe Flex: os dois viram a média + o valor dela.
    baseMultiplicadores: function (c) {
      var p = passivos(c), f = daClasse(c).fisico + 20 * this.mod(c, "forca") + p.mult.fisico, k = daClasse(c).ki + 20 * this.mod(c, "espirito") + p.mult.ki;
      var bs = baseSub(c);
      if (bs.flex) { var m = (f + k) / 2 + bs.flex; return { fisico: m, ki: m, flex: true }; }
      return { fisico: f, ki: k };
    },
    classeBase: function (c) { return daClasse(c); },
    // Pontos do Dragão: 1 no começo e +1 a cada 25 níveis (9 no nível 200).
    furiaMax: furiaMax, furiaAtual: furiaAtual, poderSemLimite: poderSemLimite, limiteAtributo: limiteAtributo, proximoLimiteAtributo: proximoLimiteAtributo, nivelDoLimite: nivelDoLimite,
    pdMax: function (c) { return Math.min(9, 1 + Math.floor((c.nivel || 1) / 25)); },
    // HP e KP atuais: vazio (null ou "") = cheio, como os Pontos do Dragão. Use sempre estas, não c.hpAtual direto.
    hpAtual: function (c) { return c.hpAtual == null || c.hpAtual === "" ? this.hpMax(c) : Number(c.hpAtual) || 0; },
    kpAtual: function (c) { return c.kpAtual == null || c.kpAtual === "" ? this.kpMax(c) : Number(c.kpAtual) || 0; },
    pdAtual: function (c) { var m = this.pdMax(c); return c.pdAtual == null || c.pdAtual === "" ? m : Math.max(0, Math.min(m, Number(c.pdAtual) || 0)); },
    crescimentoVida: function (c) { return crescimentoVida(c); },
    // A classe aceita o alinhamento? (DBOData.CLASS_ALIGNMENT: o Suporte só aceita alinhamentos Bons.)
    alinhamentoOk: function (classe, alinhamento) {
      var req = (DBOData.CLASS_ALIGNMENT || {})[classe];
      return !req || String(alinhamento || "").indexOf(req) === 0;
    },

    // Maestria do Soco (e de técnicas de maestria fixa): vem da raça e da sub-raça, não do uso.
    maestriaRaca: function (c) {
      var t = DBOData.RACE_MASTERY;
      return t[c.raca + "|" + c.subraca] || t[c.raca] || 1;
    },

    // RD de técnica: modificador de Espírito + 8 + nível / 10 (arredondado para baixo).
    rdTecnica: function (c) { return this.mod(c, "espirito") + 8 + Math.floor(c.nivel / 10) + passivos(c).rd; },
    // RD de uma habilidade: 8 + modificador escolhido na habilidade (se tiver) + nível / 10 (arredondado para baixo).
    rdHabilidade: function (c, modKey) { return 8 + (modKey ? this.mod(c, modKey) : 0) + Math.floor(c.nivel / 10) + passivos(c).rd; },

    // Limite do inventário: 5 + modificador de Força.
    // Técnicas aprendidas (fora do inventário): limite = 5 + modificador de Mente. O Soco não conta.
    // NPC: sem limite de técnicas, de habilidades de classe nem de inventário.
    limiteTecnicas: function (c) { return c.npc ? Infinity : Math.max(0, 5 + this.mod(c, "mente") + passivos(c).espacoTec); },
    contaTecnicas: function (c) {
      return (c.tecnicas || []).filter(function (t) { return !t.guardada && t.nome !== "Soco"; }).length;
    },
    defClasse: defClasse, defSubclasse: defSubclasse, rugirDoDragao: rugirDoDragao, habilidadesAgrupadas: habilidadesAgrupadas, totalGenerica: totalGenerica, maestriaClasse: maestriaClasse, efeitosAtivos: efeitosAtivos, habilidadesDeClasse: habilidadesDeClasse, passivos: passivos,
    limiteClasse: limiteClasse, maestriaExclusiva: maestriaExclusiva, exclusivaDoPersonagem: exclusivaDoPersonagem, inicialDaClasse: inicialDaClasse,
    contaClasse: function (c) { return habilidadesDeClasse(c).length; },
    limiteInventario: function (c) { return c.npc ? Infinity : Math.max(0, 5 + this.mod(c, "forca") + passivos(c).espacoInv); }
  };
})();
