// Dragon Ball Omega — personagens guardados (versão local)
//
// Cada personagem tem o formato:
//   { id, nome, nivel, classe, raca, subraca, altura, idade, alinhamento,
//     atributos: { forca, velocidade, resistencia, mente, espirito, concentracao }, foto }
//   (foto = imagem em data URL, ou "")
// MODO LOCAL (teste): os personagens ficam no localStorage, separados por dono (e-mail da conta, ou "visitante").
// MODO SUPABASE (js/supabase-config.js preenchido): ficam nas tabelas personagens, habilidades, tecnicas_aprendidas,
// inventario e transformacoes. A API pública é a mesma; só ready() e hydrate() são assíncronas.
// Fluxo de uma página: await DBOCharacters.ready(); (na ficha) await DBOCharacters.hydrate(id); depois use list/get/update.
window.DBOCharacters = (function () {
  var KEY = "dbo-characters";
  // O modo vem do login: com url/key preenchidas é Supabase. Se o js/banco.js não carregou (arquivo faltando ou
  // versão antiga em cache), melhor avisar do que cair em silêncio no localStorage e mostrar a lista vazia.
  var remote = typeof DBOAuth !== "undefined" && DBOAuth.mode === "supabase";
  function needApi() {
    if (!window.DBOApi || !DBOApi.enabled) throw new Error("O arquivo js/banco.js não foi carregado. Atualize a página sem cache (Ctrl+Shift+R) e confira se ele foi publicado.");
  }
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  function owner() {
    if (typeof DBOAuth === "undefined") {
      throw new Error("Não achei o arquivo js/auth.js. Confira se ele está na pasta js e se a página carrega ele antes do characters.js.");
    }
    var user = DBOAuth.current();
    return user ? user.email : "visitante";
  }
  function readAll() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function clone(x) { return x === undefined ? x : JSON.parse(JSON.stringify(x)); }
  function newId(prefix) {
    if (remote) {
      if (crypto.randomUUID) return crypto.randomUUID();
      var b = crypto.getRandomValues(new Uint8Array(16));
      b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
      var h = Array.prototype.map.call(b, function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
      return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
    }
    return (prefix || "x") + Date.now().toString(36);
  }

  /* =====================================================================
     MODO SUPABASE
     ===================================================================== */
  var COLS = {
    nome: "nome", nivel: "nivel", xp: "xp", classe: "classe", subclasse: "subclasse", raca: "raca", subraca: "subraca",
    alinhamento: "alinhamento", altura: "altura", idade: "idade", foto: "foto_url", corpoBase: "corpo_base",
    tpAtuais: "tp_atuais", tpGastos: "tp_gastos", zeni: "zeni", hpAtual: "hp_atual", kpAtual: "kp_atual",
    transformacaoAtiva: "transformacao_ativa", naCampanha: "na_campanha",
    fichaModelo: "ficha_modelo", atributosModelo: "atributos_modelo", visualizacao: "visualizacao_modelo",
    habilidadesClasse: "habilidades_classe", raciaisPerdidas: "raciais_perdidas", pdAtual: "pd_atual", furiaAtual: "furia_atual",
    efeitosAtivos: "efeitos_ativos", efeitosTurno: "efeitos_turno",   /* migração 17: penalidades e aprimoramentos ativos */
    npc: "npc", plBase: "pl_base",                                    /* migração 25: NPCs do mestre (PL base editável) */
    tamanho: "tamanho"                                                /* migração 26: tamanho do NPC no mapa */
  };
  var ATTRS = ["forca", "velocidade", "resistencia", "mente", "espirito", "concentracao"];
  var NULLABLE = { tamanho: 1, plBase: 1, altura: 1, foto: 1, idade: 1, transformacaoAtiva: 1, corpoBase: 1, fichaModelo: 1, atributosModelo: 1, visualizacao: 1, pdAtual: 1, furiaAtual: 1, efeitosTurno: 1 };

  var mine = [];          // personagens da própria conta
  var others = [];        // [{ owner, char }] (só o mestre recebe linhas de outras contas)
  var snap = {};          // id -> cópia do que o banco já tem (para calcular o que mudou)
  var hydrated = {};      // id -> true quando técnicas, equipamentos e transformações já foram carregados
  var readyPromise = null;
  var readyFor = null;    // de quem é a lista carregada (se a pessoa entrar/sair na mesma página, recarrega)
  var queue = Promise.resolve();

  function rowToChar(r) {
    var at = {};
    ATTRS.forEach(function (k) { at[k] = r[k] || 0; });
    return {
      id: r.id, v: 99, nome: r.nome, nivel: r.nivel, xp: Number(r.xp) || 0, classe: r.classe === "Curandeiro" ? "Suporte" : r.classe, subclasse: r.subclasse || "",
      raca: r.raca, subraca: r.subraca || "", alinhamento: r.alinhamento, altura: r.altura || "", idade: r.idade,
      foto: r.foto_url || "", atributos: at, corpoBase: r.corpo_base == null ? undefined : r.corpo_base, /* vazio = calculado pela regra da classe */
      tpAtuais: Number(r.tp_atuais) || 0, tpGastos: Number(r.tp_gastos) || 0,
      zeni: Number(r.zeni), hpAtual: Number(r.hp_atual), kpAtual: Number(r.kp_atual),
      transformacaoAtiva: r.transformacao_ativa || "", naCampanha: !!r.na_campanha,
      fichaModelo: r.ficha_modelo || "", atributosModelo: r.atributos_modelo || "", visualizacao: r.visualizacao_modelo || "",
      habilidadesClasse: Array.isArray(r.habilidades_classe) ? r.habilidades_classe : undefined,   /* undefined = coluna ainda não existe (migração 11) */
      raciaisPerdidas: Array.isArray(r.raciais_perdidas) ? r.raciais_perdidas : [],   /* habilidades raciais cortadas para sempre (migração 12) */
      pdAtual: r.pd_atual == null ? undefined : Number(r.pd_atual),   /* Pontos do Dragão atuais (migração 15); vazio = cheio */
      furiaAtual: r.furia_atual == null ? undefined : Number(r.furia_atual),   /* Fúria do Berserker (migração 18) */
      efeitosAtivos: Array.isArray(r.efeitos_ativos) ? r.efeitos_ativos : [],   /* efeitos ativos (migração 17) */
      efeitosTurno: r.efeitos_turno || "",                                    /* último turno de combate já processado */
      npc: !!r.npc,                                                           /* NPC do mestre (migração 25) */
      plBase: r.pl_base == null ? undefined : Number(r.pl_base),              /* PL base do NPC; vazio = raça + classe */
      tamanho: r.tamanho || ""                                                /* tamanho do NPC no mapa (vazio = normal) */
    };
  }
  // Converte campos da ficha (parcial) em colunas.
  function scalarRow(patch) {
    var row = {};
    Object.keys(patch).forEach(function (k) {
      if (COLS[k]) row[COLS[k]] = (NULLABLE[k] && (patch[k] === "" || patch[k] === undefined)) ? null : patch[k];
      else if (k === "atributos") ATTRS.forEach(function (a) { if (patch.atributos && patch.atributos[a] !== undefined) row[a] = patch.atributos[a]; });
    });
    return row;
  }

  // Configurações novas da habilidade (alvo do dano, N seres, gastar HP, gastou TP) vão numa linha oculta "#cfg|..." no fim de
  // fortalecimentos (coluna text[]), assim não precisa mudar o banco. Na leitura a linha sai da lista e volta para os campos.
  function packFort(a) {
    var out = (a.fortalecimentos || []).filter(function (x) { return String(x).indexOf("#cfg|") !== 0; });
    var cfg = [];
    if (a.danoAlvo) cfg.push("da=" + a.danoAlvo);
    if (a.danoN) cfg.push("dn=" + (Number(a.danoN) || 0));
    if (a.gastaHp) cfg.push("hp=1");
    if (a.gastouTp) cfg.push("gt=1");
    if (a.tp && a.gastouTp) cfg.push("tp=" + (Number(a.tp) || 0));
    if (cfg.length) out.push("#cfg|" + cfg.join("|"));
    return out;
  }
  function unpackFort(arr, alvo) {
    var out = [], cfg = null;
    (arr || []).forEach(function (x) { if (String(x).indexOf("#cfg|") === 0) cfg = String(x).slice(5).split("|"); else out.push(x); });
    alvo.fortalecimentos = out;
    if (cfg) cfg.forEach(function (kv) {
      var i = kv.indexOf("="), k = kv.slice(0, i), v = kv.slice(i + 1);
      if (k === "da") alvo.danoAlvo = v; else if (k === "dn") alvo.danoN = Number(v) || 0; else if (k === "hp") alvo.gastaHp = true;
      else if (k === "gt") alvo.gastouTp = true; else if (k === "tp") alvo.tp = Number(v) || 0;
    });
    return alvo;
  }

  function habRow(a, donoId) {
    return { id: a.id, dono_personagem_id: donoId, nome: a.nome, descricao: a.descricao || "", qtd: a.qtd || 1, dado: a.dado,
      modificador: a.mod || null, fixo: Number(a.fixo) || 0, tipo: a.tipo, efeitos: a.efeitos || [], sem_ki: !!a.semKi, pontaria: !!a.pontaria, tem_dano: a.temDano !== false, fortalecimentos: packFort(a) };
  }
  function habPatch(a) {
    return { nome: a.nome, descricao: a.descricao || "", qtd: a.qtd || 1, dado: a.dado, modificador: a.mod || null,
      fixo: Number(a.fixo) || 0, tipo: a.tipo, efeitos: a.efeitos || [], sem_ki: !!a.semKi, pontaria: !!a.pontaria, tem_dano: a.temDano !== false, fortalecimentos: packFort(a) };
  }
  function extraRows(a) {
    return (a.extras || []).map(function (e) {
      return { habilidade_id: a.id, qtd: e.qtd, dado: e.dado, quando: e.quando || "sempre", condicao: e.condicao || "" };
    });
  }
  function habFromRow(h, dados) {
    return unpackFort(h.fortalecimentos, {
      id: h.id, nome: h.nome, descricao: h.descricao || "", qtd: h.qtd, dado: h.dado, mod: h.modificador || "", fixo: h.fixo || 0,
      tipo: h.tipo, efeitos: h.efeitos || [], semKi: !!h.sem_ki, pontaria: !!h.pontaria, temDano: h.tem_dano !== false,
      extras: (dados || []).map(function (e) { return { qtd: e.qtd, dado: e.dado, quando: e.quando, condicao: e.condicao || "" }; })
    });
  }

  // Dá um uuid a tudo que ainda não tem (fichas novas, técnicas iniciais). Mexe na própria lista.
  function ensureIds(patch) {
    if (patch.tecnicas) patch.tecnicas.forEach(function (t) {
      if (!UUID.test(t.id || "")) t.id = newId();
      if (!UUID.test(t.hid || "")) t.hid = newId();
    });
    if (patch.equipamentos) patch.equipamentos.forEach(function (it) {
      if (!UUID.test(it.id || "")) it.id = newId();
      if (it.habilidade && typeof it.habilidade === "object" && !UUID.test(it.habilidade.id || "")) it.habilidade.id = newId();
    });
    if (patch.transformacoes) patch.transformacoes.forEach(function (t) { if (!UUID.test(t.id || "")) t.id = newId(); });
  }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function byId(list) { var m = {}; (list || []).forEach(function (x) { m[x.id] = x; }); return m; }

  async function replaceExtras(a) {
    await DBOApi.remove("habilidade_dados", { habilidade_id: "eq." + a.id });
    var rows = extraRows(a);
    if (rows.length) await DBOApi.insert("habilidade_dados", rows);
  }
  async function insertHab(a, donoId) {
    await DBOApi.insert("habilidades", [habRow(a, donoId)]);
    var rows = extraRows(a);
    if (rows.length) await DBOApi.insert("habilidade_dados", rows);
  }

  /* -- técnicas: id = tecnicas_aprendidas.id, hid = habilidades.id -- */
  async function syncTecnicas(id, next, phase) {
    var prev = byId(snap[id].tecnicas), now = byId(next);
    if (phase === "upsert") {
      for (var i = 0; i < next.length; i++) {
        var t = next[i], old = prev[t.id];
        var hab = Object.assign({}, t, { id: t.hid });
        if (!old) {
          await insertHab(hab, id);
          await DBOApi.insert("tecnicas_aprendidas", [{ id: t.id, personagem_id: id, habilidade_id: t.hid, origem_id: t.origemId || null, tp_gastos: Number(t.tp) || 0, usos: t.usos || 0, guardada: !!t.guardada }]);
        } else if (!same(old, t)) {
          await DBOApi.patch("habilidades", { id: "eq." + t.hid }, habPatch(hab));
          if (!same(old.extras, t.extras)) await replaceExtras(hab);
          await DBOApi.patch("tecnicas_aprendidas", { id: "eq." + t.id }, { usos: t.usos || 0, guardada: !!t.guardada, tp_gastos: Number(t.tp) || 0 });
        }
      }
    } else {
      for (var j = 0; j < (snap[id].tecnicas || []).length; j++) {
        var gone = snap[id].tecnicas[j];
        if (!now[gone.id]) await DBOApi.remove("habilidades", { id: "eq." + gone.hid }); // apaga a técnica junto (cascade)
      }
      snap[id].tecnicas = clone(next);
    }
  }

  /* -- equipamentos: id = inventario.id; habilidade.id = habilidades.id; habilidade.usos = inventario.usos -- */
  function abilityOf(it) { return it && it.habilidade && typeof it.habilidade === "object" ? it.habilidade : null; }
  async function syncItens(id, next, phase) {
    var prev = byId(snap[id].equipamentos), now = byId(next);
    if (phase === "upsert") {
      for (var i = 0; i < next.length; i++) {
        var it = next[i], old = prev[it.id], ab = abilityOf(it), oldAb = abilityOf(old);
        if (old && same(old, it)) continue;
        if (ab && (!oldAb || oldAb.id !== ab.id)) await insertHab(ab, id);
        else if (ab && !same(Object.assign({}, oldAb, { usos: 0 }), Object.assign({}, ab, { usos: 0 }))) {
          await DBOApi.patch("habilidades", { id: "eq." + ab.id }, habPatch(ab));
          if (!same(oldAb.extras, ab.extras)) await replaceExtras(ab);
        }
        var row = { nome: it.nome, descricao: it.descricao || "", habilidade_id: ab ? ab.id : null, usos: ab ? (Number(ab.usos) || 0) : 0 };
        if (!old) await DBOApi.insert("inventario", [Object.assign({ id: it.id, personagem_id: id }, row)]);
        else await DBOApi.patch("inventario", { id: "eq." + it.id }, row);
        if (oldAb && (!ab || oldAb.id !== ab.id)) await DBOApi.remove("habilidades", { id: "eq." + oldAb.id });
      }
    } else {
      for (var j = 0; j < (snap[id].equipamentos || []).length; j++) {
        var g = snap[id].equipamentos[j];
        if (now[g.id]) continue;
        await DBOApi.remove("inventario", { id: "eq." + g.id });
        if (abilityOf(g)) await DBOApi.remove("habilidades", { id: "eq." + abilityOf(g).id });
      }
      snap[id].equipamentos = clone(next);
    }
  }

  async function syncTransf(id, next, phase) {
    var prev = byId(snap[id].transformacoes), now = byId(next);
    function row(t) { return { nome: t.nome, descricao: t.descricao || "", requisito: t.requisito || "", mult_pl: t.mult, kp_por_rodada: t.kp, catalogo_id: t.catalogoId || null, bonus_teste: Number(t.bonusTeste) || 0, bonus_dano: Number(t.bonusDano) || 0, usos: Number(t.usos) || 0 }; }
    if (phase === "upsert") {
      for (var i = 0; i < next.length; i++) {
        var t = next[i], old = prev[t.id];
        if (!old) await DBOApi.insert("transformacoes", [Object.assign({ id: t.id, personagem_id: id }, row(t))]);
        else if (!same(old, t)) await DBOApi.patch("transformacoes", { id: "eq." + t.id }, row(t));
      }
    } else {
      for (var j = 0; j < (snap[id].transformacoes || []).length; j++) {
        var g = snap[id].transformacoes[j];
        if (!now[g.id]) await DBOApi.remove("transformacoes", { id: "eq." + g.id });
      }
      snap[id].transformacoes = clone(next);
    }
  }

  var SYNC = { tecnicas: syncTecnicas, equipamentos: syncItens, transformacoes: syncTransf };

  async function persist(id, patch, arrays) {
    var keys = Object.keys(SYNC).filter(function (k) { return arrays[k]; });
    for (var i = 0; i < keys.length; i++) await SYNC[keys[i]](id, arrays[keys[i]], "upsert");
    var row = scalarRow(patch);
    if (Object.keys(row).length) await DBOApi.patch("personagens", { id: "eq." + id }, row);
    for (var j = 0; j < keys.length; j++) await SYNC[keys[j]](id, arrays[keys[j]], "delete");
  }

  function failed(err) {
    if (window.DBOUI) DBOUI.toast("Não consegui salvar no banco: " + err.message + " Recarregue a página para ver o que ficou salvo.");
  }

  async function loadList() {
    var me = DBOAuth.userId();
    var rows = await DBOApi.select("personagens", { order: "criado_em.asc" });
    mine = []; others = [];
    var foreign = [];
    rows.forEach(function (r) {
      if (r.dono_id === me) mine.push(rowToChar(r));
      else foreign.push(r);
    });
    if (foreign.length) {
      var ids = Array.from(new Set(foreign.map(function (r) { return r.dono_id; })));
      var emails = {};
      try { (await DBOApi.select("perfis", { select: "id,email,nome", id: DBOApi.list(ids) })).forEach(function (p) { emails[p.id] = p.nome ? p.nome + " (" + p.email + ")" : p.email; }); } catch (e) {}
      foreign.forEach(function (r) { others.push({ owner: emails[r.dono_id] || "conta de outra pessoa", char: rowToChar(r) }); });
    }
  }

  /* -- Cache da lista: a página Personagens desenha na hora com ele e confere com o banco em seguida -- */
  var CACHE = "dbo-roster:";
  function saveCache() {
    var id = DBOAuth.userId();
    if (!id) return;
    try { localStorage.setItem(CACHE + id, JSON.stringify({ mine: mine, others: others, t: Date.now() })); } catch (e) {
      try { // sem espaço: guarda sem as fotos
        var slim = function (c) { return Object.assign({}, c, { foto: "" }); };
        localStorage.setItem(CACHE + id, JSON.stringify({ mine: mine.map(slim), others: others.map(function (x) { return { owner: x.owner, char: slim(x.char) }; }), t: Date.now() }));
      } catch (e2) {}
    }
  }

  async function loadFull(c) {
    var id = c.id;
    var res = await Promise.all([
      DBOApi.select("tecnicas_aprendidas", { personagem_id: "eq." + id }),
      DBOApi.select("inventario", { personagem_id: "eq." + id }),
      DBOApi.select("transformacoes", { personagem_id: "eq." + id }).catch(function (err) {
        // Banco antigo sem a tabela "transformacoes": a ficha abre mesmo assim. Rode o migracao-01.sql.
        if (window.console) console.warn("Tabela transformacoes indisponível (" + err.message + "). Rode banco/migracoes/migracao-01.sql.");
        return [];
      })
    ]);
    var apr = res[0], inv = res[1], trf = res[2];
    var hids = apr.map(function (a) { return a.habilidade_id; }).concat(inv.map(function (i) { return i.habilidade_id; }).filter(Boolean));
    var habs = [], dados = [];
    if (hids.length) {
      var hr = await Promise.all([
        DBOApi.select("habilidades", { id: DBOApi.list(hids) }),
        DBOApi.select("habilidade_dados", { habilidade_id: DBOApi.list(hids) })
      ]);
      habs = hr[0]; dados = hr[1];
    }
    function hab(hid) {
      var h = habs.filter(function (x) { return x.id === hid; })[0];
      return h ? habFromRow(h, dados.filter(function (d) { return d.habilidade_id === hid; })) : null;
    }
    c.tecnicas = apr.map(function (a) {
      var h = hab(a.habilidade_id);
      if (!h) return null;
      return Object.assign(h, { id: a.id, hid: h.id, tp: Number(a.tp_gastos) || 0, usos: a.usos || 0, origemId: a.origem_id || undefined, guardada: !!a.guardada });
    }).filter(Boolean);
    c.equipamentos = inv.map(function (i) {
      var h = i.habilidade_id ? hab(i.habilidade_id) : null;
      if (h) h.usos = i.usos || 0;
      return { id: i.id, nome: i.nome, descricao: i.descricao || "", habilidade: h };
    });
    c.transformacoes = trf.map(function (t) {
      return { id: t.id, nome: t.nome, descricao: t.descricao || "", requisito: t.requisito || "", mult: Number(t.mult_pl), kp: t.kp_por_rodada, catalogoId: t.catalogo_id || "", bonusTeste: Number(t.bonus_teste) || 0, bonusDano: Number(t.bonus_dano) || 0, usos: Number(t.usos) || 0 };
    });
    snap[id] = { tecnicas: clone(c.tecnicas), equipamentos: clone(c.equipamentos), transformacoes: clone(c.transformacoes) };
    hydrated[id] = true;
  }

  function findMine(id) { return mine.filter(function (c) { return c.id === id; })[0] || null; }
  // Todas as fichas da conta: personagens e NPCs.
  function todos() { return remote ? mine : (readAll()[owner()] || []); }
  function findOther(id) { var h = others.filter(function (x) { return x.char.id === id; })[0]; return h ? h.char : null; }

  /* =====================================================================
     API PÚBLICA
     ===================================================================== */
  var api = {
    // Endereço da página do personagem.
    sheetUrl: function (id) { return "personagem.html?id=" + encodeURIComponent(id); },

    newId: newId,

    // Chame (e espere) antes de desenhar qualquer página que use personagens. No modo local não faz nada.
    ready: function () {
      if (!remote) return Promise.resolve();
      var who = (DBOAuth.current() || {}).id || "";
      if (readyPromise && readyFor !== who) { readyPromise = null; mine = []; others = []; snap = {}; hydrated = {}; }
      if (!readyPromise) {
        readyFor = who;
        readyPromise = (async function () {
          needApi();
          var u = DBOAuth.current();
          if (!u || !u.confirmed) { mine = []; others = []; return; }
          if (window.DBORoles && DBORoles.refresh) await DBORoles.refresh();
          await loadList();
          saveCache();
        })();
        readyPromise.catch(function () { readyPromise = null; });
      }
      return readyPromise;
    },

    // Lista guardada da última visita (só modo Supabase): { mine, others } ou null. Serve para desenhar na hora.
    cached: function () {
      var id = remote && DBOAuth.userId();
      if (!id) return null;
      try {
        var d = JSON.parse(localStorage.getItem(CACHE + id));
        if (!d || !Array.isArray(d.mine)) return null;
        d.npcs = d.mine.filter(function (c) { return c.npc; });
        d.mine = d.mine.filter(function (c) { return !c.npc; });   // NPCs não aparecem em Personagens
        return d;
      } catch (e) { return null; }
    },

    // Apaga personagens do dono (ids). No banco, tudo que depende deles (técnicas, itens...) vai junto (cascade).
    remove: async function (ids) {
      ids = (ids || []).filter(Boolean);
      if (!ids.length) return;
      if (remote) {
        await api.ready();
        var own = ids.filter(function (id) { return findMine(id); });
        if (!own.length) throw new Error("Nenhum desses personagens é seu.");
        var gone = await DBOApi.remove("personagens", { id: DBOApi.list(own) });
        mine = mine.filter(function (c) { return own.indexOf(c.id) === -1; });
        own.forEach(function (id) { delete snap[id]; delete hydrated[id]; });
        saveCache();
        return gone;
      }
      var all = readAll(), who = owner();
      all[who] = (all[who] || []).filter(function (c) { return ids.indexOf(c.id) === -1; });
      try { localStorage.setItem(KEY, JSON.stringify(all)); }
      catch (e) { throw new Error("Não deu pra apagar neste navegador."); }
    },

    // Carrega técnicas, equipamentos e transformações de UM personagem (a ficha precisa disso).
    hydrate: async function (id) {
      if (!remote) return;
      await api.ready();
      var c = findMine(id) || findOther(id);
      if (c && !hydrated[id]) await loadFull(c);
    },

    // Fichas de outras contas (usado pela Campanha). No modo local lê o localStorage.
    ofOwner: function (email) {
      if (remote) { var u = DBOAuth.current(); return u && u.email === email ? mine : []; }
      return readAll()[email] || [];
    },

    // SÓ PARA O MESTRE: fichas de todas as outras contas, como [{ owner, char }].
    // No modo Supabase, quem libera isso é a RLS (o mestre lê todas as fichas, só leitura).
    others: function () {
      var isMaster = window.DBORoles && DBORoles.isMaster();
      if (!isMaster) return [];
      if (remote) return others;
      var me = owner(), all = readAll(), out = [];
      Object.keys(all).forEach(function (email) {
        if (email === me) return;
        (all[email] || []).forEach(function (c) { out.push({ owner: email, char: c }); });
      });
      return out;
    },
    // Ficha de outra pessoa (só o mestre enxerga), ou null. Somente leitura.
    getOther: function (id) {
      if (!(window.DBORoles && DBORoles.isMaster())) return null;
      if (remote) return findOther(id);
      var hit = this.others().filter(function (x) { return x.char.id === id; })[0];
      return hit ? hit.char : null;
    },

    // Personagens da conta (sem os NPCs do mestre, que ficam em npcs()).
    list: function () {
      if (Array.isArray(window.DBO_DEMO)) return window.DBO_DEMO; // usado só nas prévias
      return todos().filter(function (c) { return !c.npc; });
    },
    // NPCs do mestre (Campanha > NPCs): fichas como as dos personagens, marcadas com npc: true.
    npcs: function () { return todos().filter(function (c) { return c.npc; }); },
    get: function (id) {
      if (Array.isArray(window.DBO_DEMO)) return window.DBO_DEMO.filter(function (c) { return c.id === id; })[0] || null;
      return todos().filter(function (c) { return c.id === id; })[0] || null;
    },

    // Atualiza só a cópia em memória (o banco já foi alterado por uma função dele, como concluir_missao).
    patchCache: function (id, patch) {
      var c = this.get(id);
      if (c) { Object.assign(c, patch); if (remote) saveCache(); }
      return c;
    },

    // Junta `patch` aos dados do personagem e salva. Retorna o personagem atualizado (na hora; o banco recebe em seguida).
    update: function (id, patch) {
      if (remote) {
        var c = findMine(id);
        if (!c) throw new Error("Personagem não encontrado.");
        ensureIds(patch);
        var arrays = {};
        Object.keys(SYNC).forEach(function (k) { if (patch[k]) arrays[k] = clone(patch[k]); });
        if (arrays.tecnicas && !hydrated[id]) throw new Error("A ficha ainda está carregando.");
        for (var k in patch) c[k] = patch[k];
        if (Object.keys(patch).length) {
          queue = queue.then(function () { return persist(id, patch, arrays); }).catch(failed);
        }
        return c;
      }
      var all = readAll();
      var list = all[owner()] || [];
      for (var i = 0; i < list.length; i++) {
        if (list[i].id !== id) continue;
        for (var key in patch) list[i][key] = patch[key];
        try { localStorage.setItem(KEY, JSON.stringify(all)); }
        catch (e) { throw new Error("Não deu pra salvar a alteração neste navegador."); }
        return list[i];
      }
      throw new Error("Personagem não encontrado.");
    },

    // Aprender técnica nova gastando TP: no banco é UMA função só (aprender_tecnica), tudo ou nada.
    // Só existe no modo Supabase; no local a ficha faz a conta sozinha.
    learn: remote ? function (id, tech, spend) {
      var c = findMine(id);
      if (!c) return Promise.reject(new Error("Personagem não encontrado."));
      var job = queue.then(async function () {
        await DBOApi.rpc("aprender_tecnica", {
          p_personagem: id, p_origem: null, p_tp: spend,
          p_hab: { nome: tech.nome, descricao: tech.descricao || "", qtd: tech.qtd, dado: tech.dado, modificador: tech.mod || "", fixo: Number(tech.fixo) || 0,
                   tipo: tech.tipo, efeitos: tech.efeitos || [], extras: tech.extras || [], sem_ki: !!tech.semKi, pontaria: !!tech.pontaria, tem_dano: tech.temDano !== false, fortalecimentos: packFort(tech) },
          p_guardada: !!tech.guardada
        });
        var row = (await DBOApi.select("personagens", { id: "eq." + id }))[0];
        if (row) Object.assign(c, rowToChar(row), { tecnicas: c.tecnicas, equipamentos: c.equipamentos, transformacoes: c.transformacoes });
        hydrated[id] = false;
        await loadFull(c);
        return c;
      });
      queue = job.catch(failed);
      return job;
    } : null,

    // Usado pela janela de criação de personagem. No modo Supabase devolve uma Promise.
    add: function (character) {
      if (remote) {
        return (async function () {
          var u = DBOAuth.current();
          if (!u || !u.confirmed) throw new Error("Confirme o e-mail para criar personagem.");
          await api.ready();
          var c = Object.assign({}, clone(character), { id: newId() });
          var row = Object.assign({ id: c.id, dono_id: u.id }, scalarRow(c));
          ATTRS.forEach(function (a) { row[a] = (c.atributos || {})[a] || 0; });
          try { await DBOApi.insert("personagens", [row]); }
          catch (err) {
            if (c.npc && err && (err.code === "PGRST204" || err.code === "42703")) throw new Error("O banco ainda não tem NPCs. Rode banco/migracoes/migracao-25.sql no Supabase.");
            throw err;
          }
          var techs = c.tecnicas || [];
          var equipes = c.equipamentos || [], trfs = c.transformacoes || [];
          c.tecnicas = techs; c.equipamentos = equipes; c.transformacoes = trfs;
          ensureIds(c);
          snap[c.id] = { tecnicas: [], equipamentos: [], transformacoes: [] };
          await syncTecnicas(c.id, c.tecnicas, "upsert");
          snap[c.id].tecnicas = clone(c.tecnicas);
          hydrated[c.id] = true;
          c.v = 99;
          mine.push(c);
          return c;
        })();
      }
      var all = readAll();
      var who = owner();
      character.id = character.id || Date.now().toString(36);
      (all[who] = all[who] || []).push(character);
      try { localStorage.setItem(KEY, JSON.stringify(all)); }
      catch (e) { throw new Error("Não deu pra salvar o personagem neste navegador."); }
      return character;
    }
  };
  return api;
})();
