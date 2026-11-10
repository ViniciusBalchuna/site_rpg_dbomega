// Dragon Ball Omega — CATÁLOGO DE TRANSFORMAÇÕES (um só lugar para mexer)
//
// Cada transformação:
//   pl        multiplicador do poder de luta BASE (ex.: 10 = 10x)
//   danoPct   aumento de TODOS os danos, em %. 25 = dano final × 1,25.
//   kpPct     custo por rodada, em % do KP MÁXIMO (informativo: o site ainda não desconta sozinho)
//   teste     bônus somado aos testes (d20) enquanto está ativa
//   dano      bônus somado às rolagens de dano enquanto está ativa
//   mods      bônus/penalidade nos modificadores enquanto está ativa (ex.: { velocidade: -2 })
//   grade     é uma grade de outra transformação: { de: "ssj", n: 2 }. Não se aprende sozinha: libera com a maestria da outra.
//   requer    só dá para aprender com essa maestria em outra transformação: { id: "blue", maestria: 5 }
//   divina    transformação divina (Híbrido Kaioshin). wip: valores ainda em produção.
//
// Maestria das transformações: sobe a cada vez que você ativa a transformação (MAESTRIA_USOS, abaixo).
// Quem pode usar cada uma: POR_RACA, mais embaixo. Raça sem entrada lá mostra "W.I.P".
window.DBOTransf = (function () {
  var CATALOGO = {
    // Saiyajin Comum (e base do Primitivo)
    oozaru:         { nome: "Oozaru",                                   pl: 10,       danoPct: 15,  kpPct: 5,    teste: -1, dano: 1 },
    pressagio:      { nome: "Super Saiyajin Presságio",                 pl: 10,       danoPct: 15,  kpPct: 4,    teste: 0,  dano: 0 },
    ssj:            { nome: "Super Saiyajin",                           pl: 50,       danoPct: 25,  kpPct: 4,    teste: 1,  dano: 0, grades: 4 },
    ssj_g2:         { nome: "Super Saiyajin Grade 2 (Dai ni Dankai)",   pl: 60,       danoPct: 35,  kpPct: 6,    teste: 1,  dano: 0, grade: { de: "ssj", n: 2 } },
    ssj_g3:         { nome: "Super Saiyajin Grade 3 (Dai san Dankai)",  pl: 70,       danoPct: 60,  kpPct: 10,   teste: 0,  dano: 2, mods: { velocidade: -2 }, grade: { de: "ssj", n: 3 } },
    ssj_g4:         { nome: "Super Saiyajin Grade 4 (Full Power)",      pl: 75,       danoPct: 35,  kpPct: 0,    teste: 1,  dano: 0, grade: { de: "ssj", n: 4 } },
    ssj2:           { nome: "Super Saiyajin 2",                         pl: 100,      danoPct: 50,  kpPct: 7,    teste: 1,  dano: 1 },
    ssj3:           { nome: "Super Saiyajin 3",                         pl: 400,      danoPct: 75,  kpPct: 23,   teste: 3,  dano: 3 },
    oozaru_dourado: { nome: "Oozaru Dourado",                           pl: 1500,     danoPct: 100, kpPct: 20,   teste: 3,  dano: 3 },
    ssj4:           { nome: "Super Saiyajin 4",                         pl: 500000,   danoPct: 200, kpPct: 5,    teste: 5,  dano: 5 },
    // Divinas (Híbrido Kaioshin)
    deus:           { nome: "Super Saiyajin Deus",                      pl: 10000,    danoPct: 125, kpPct: 10,   teste: 4,  dano: 4, divina: true },
    blue:           { nome: "Super Saiyajin Blue / Rosé",               pl: 500000,   danoPct: 200, kpPct: 30,   teste: 5,  dano: 5, divina: true },
    blue_fp:        { nome: "Super Saiyajin Blue / Rosé Full Power",    pl: 500000,   danoPct: 200, kpPct: 5,    teste: 5,  dano: 5, divina: true, requer: { id: "blue", maestria: 5 } },
    blue_evo:       { nome: "Super Saiyajin Blue Evolution / Rosé Ultimate", pl: 750000, danoPct: 215, kpPct: 9, teste: 7, dano: 7, divina: true },
    blue_godki:     { nome: "Super Saiyajin Blue God Ki / Rosé Purificado", pl: 1000000, danoPct: 230, kpPct: 18, teste: 8, dano: 8, divina: true },
    // Saiyajin Primitivo
    ikari:          { nome: "Ikari (Oozaru Controlado)",                pl: 10000,    danoPct: 125, kpPct: 9,    teste: 4,  dano: 4 },
    ssj4_fp:        { nome: "Super Saiyajin 4 Full Power",              pl: 750000,   danoPct: 215, kpPct: 7,    teste: 7,  dano: 7 },
    ssj4_ufp:       { nome: "Ultra Full Power Super Saiyajin 4",        pl: 1000000,  danoPct: 230, kpPct: 14,   teste: 8,  dano: 8 },
    ssj4_lb:        { nome: "Super Saiyajin 4 Limit Breaker",           pl: 10000000, danoPct: 250, kpPct: 18,   teste: 10, dano: 10, divina: true },
    // Saiyajin Lendário
    tipo_c:         { nome: "Super Saiyajin Tipo C",                    pl: 50,       danoPct: 25,  kpPct: 4,    teste: 1,  dano: 0 },
    lssj:           { nome: "Super Saiyajin Lendário",                  pl: 1500,     danoPct: 100, kpPct: 10,   teste: 3,  dano: 3 },
    lssj2:          { nome: "Super Saiyajin Lendário 2",                pl: 3000,     danoPct: 115, kpPct: 12.5, teste: 4,  dano: 4 },
    lssj3:          { nome: "Super Saiyajin Lendário 3",                pl: 85000,    danoPct: 140, kpPct: 20,   teste: 5,  dano: 5 },
    lssj4:          { nome: "Super Saiyajin Lendário 4",                pl: 1000000,  danoPct: 250, kpPct: 20,   teste: 7,  dano: 7 },
    lssj4_lb:       { nome: "Super Saiyajin Lendário 4 Limit Breaker",  pl: 50000000, danoPct: 300, kpPct: 25,   teste: 12, dano: 12 },
    // Saiyajin Corrompido (valores W.I.P)
    ssjc:           { nome: "Super Saiyajin Corrompido",                 pl: 50,       danoPct: 25,  kpPct: 4,    teste: 1,  dano: 0, wip: true }
  };
  Object.keys(CATALOGO).forEach(function (id) { var t = CATALOGO[id]; t.id = id; t.multDano = 1 + t.danoPct / 100; });

  // Maestria da transformação pelo número de ativações: maestria 2 com 5, 3 com 10, 4 com 20 e 5 com 40.
  var MAESTRIA_USOS = [5, 10, 20, 40];
  function maestria(usos) { var m = 1; MAESTRIA_USOS.forEach(function (u) { if ((Number(usos) || 0) >= u) m++; }); return m; }

  var COMUM = ["oozaru", "pressagio", "ssj", "ssj2", "ssj3", "oozaru_dourado", "ssj4"];
  var DIVINAS = ["deus", "blue", "blue_fp", "blue_evo", "blue_godki"];
  var POR_RACA = {
    "Sayajin": {
      "*": COMUM.concat(DIVINAS),
      "Sayajin Corrompido": COMUM.concat(DIVINAS, ["ssjc"]),
      "Sayajin Primitivo": COMUM.concat(["ikari", "ssj4_fp", "ssj4_ufp", "ssj4_lb"]),
      "Sayajin Lendário": ["oozaru", "tipo_c", "lssj", "lssj2", "lssj3", "lssj4", "lssj4_lb"]
    }
  };
  // Grupos para o modo debug (todas as transformações, sem trava de raça).
  var GRUPOS = [["Saiyajin Comum", COMUM], ["Divinas (Híbrido Kaioshin)", DIVINAS], ["Saiyajin Primitivo", ["ikari", "ssj4_fp", "ssj4_ufp", "ssj4_lb"]],
    ["Saiyajin Lendário", ["tipo_c", "lssj", "lssj2", "lssj3", "lssj4", "lssj4_lb"]], ["Saiyajin Corrompido", ["ssjc"]]];

  function ids(c) {
    var r = POR_RACA[c.raca];
    if (!r) return [];
    return r[c.subraca] || r["*"] || [];
  }
  // As que o personagem JÁ APRENDEU (c.transformacoes), com a maestria de cada uma.
  function lista(c) {
    var vistos = {};
    return (c.transformacoes || []).filter(function (e) {
      var ok = CATALOGO[e.catalogoId] && !CATALOGO[e.catalogoId].grade && !vistos[e.catalogoId];
      vistos[e.catalogoId] = true;
      return ok;
    }).map(function (e) {
      return Object.assign({}, CATALOGO[e.catalogoId], { eid: e.id, usos: Number(e.usos) || 0, maestria: maestria(e.usos) });
    });
  }
  function aprendida(c, id) { return lista(c).filter(function (t) { return t.id === id; })[0] || null; }
  // Motivo para não poder aprender ("" = pode).
  function bloqueio(c, t) {
    if (t.requer) {
      var base = aprendida(c, t.requer.id);
      if (!base || base.maestria < t.requer.maestria) return "Precisa de maestria " + t.requer.maestria + " em " + CATALOGO[t.requer.id].nome;
    }
    return "";
  }
  function disponiveis(c) {
    var have = lista(c).map(function (t) { return t.id; });
    return ids(c).filter(function (id) { return have.indexOf(id) < 0; }).map(function (id) { return Object.assign({ bloqueio: bloqueio(c, CATALOGO[id]) }, CATALOGO[id]); });
  }
  // Grades que a transformação tem e as que a maestria já liberou: [{ id, nome, n, livre }]
  function grades(c, baseId) {
    var b = aprendida(c, baseId), out = [{ id: baseId, n: 1, nome: CATALOGO[baseId].nome + " (Grade 1)", livre: true }];
    Object.keys(CATALOGO).forEach(function (id) {
      var g = CATALOGO[id].grade;
      if (g && g.de === baseId) out.push({ id: id, n: g.n, nome: CATALOGO[id].nome, livre: !!b && b.maestria >= g.n });
    });
    return out.sort(function (a, z) { return a.n - z.n; });
  }
  // A transformação ativa (pode ser uma grade). Some se o personagem não a tem mais.
  function ativa(c) {
    var id = c && c.transformacaoAtiva, t = id && CATALOGO[id];
    if (!t) return null;
    var base = aprendida(c, t.grade ? t.grade.de : id);
    if (!base || (t.grade && base.maestria < t.grade.n)) return null;
    return Object.assign({}, t, { eid: base.eid, usos: base.usos, maestria: base.maestria, baseId: base.id });
  }

  return {
    CATALOGO: CATALOGO, GRUPOS: GRUPOS, MAESTRIA_USOS: MAESTRIA_USOS,
    lista: lista, disponiveis: disponiveis, ativa: ativa, grades: grades, maestria: maestria, bloqueio: bloqueio,
    wip: function (c) { return ids(c).length === 0; },
    // Bônus somados nas rolagens enquanto a transformação está ativa: em testes (d20) e em danos.
    bonus: function (c) { var t = ativa(c); return { teste: t ? t.teste : 0, dano: t ? t.dano : 0 }; },
    // Multiplicadores da transformação ativa (1 e 1 se não houver).
    mults: function (c) { var t = ativa(c); return { pl: t ? t.pl : 1, dano: t ? t.multDano : 1 }; },
    // Bônus/penalidade no modificador de um atributo (ex.: Grade 3: −2 em Velocidade).
    modAtributo: function (c, chave) { var t = ativa(c); return t && t.mods && t.mods[chave] ? t.mods[chave] : 0; }
  };
})();
