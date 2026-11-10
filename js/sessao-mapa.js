// Dragon Ball Omega — mapa da sessão (dados)
// O mestre importa um mapa (da aba Mapas ou uma imagem) e ele aparece no centro da Sessão para todos.
// Tokens: o mestre põe os tokens (jogadores e NPCs); cada jogador move o do próprio personagem; o mestre faz tudo.
// z = layer (andar) em que o token está (coluna "layer", banco/migracoes/migracao-27.sql; 1 = chão).
// luz = "" | "tocha" | "lanterna" e mira = direção da lanterna em radianos (modo caverna, banco/migracoes/migracao-28.sql).
//
// Modo local (teste): localStorage "dbo-sessao-mapa" = { versao, dados, tokens }.
// Modo Supabase: sessao_mapa (uma linha, com versao) e sessao_tokens (banco/migracoes/migracao-22.sql).
//   O mapa só é baixado de novo quando a versão muda (a imagem de fundo pode ser grande).
// Movimentos aparecem na hora para quem mexeu e vão para o banco em segundo plano.
window.DBOSessaoMapa = (function () {
  var remote = !!window.DBOSessao && DBOSessao.remote;
  var KEY = "dbo-sessao-mapa";
  var versao = 0, dados = null, tokens = [], carregou = false;
  var emVoo = {};          // id do token → até quando a cópia local vale mais que a do banco (ms)
  var removidos = {};      // id do token tirado aqui → até quando ignorar o que o banco ainda mostra

  function mestre() { return !!window.DBORoles && DBORoles.isMaster(); }
  function lerL() {
    try { var d = JSON.parse(localStorage.getItem(KEY)); if (d && typeof d === "object") return { versao: d.versao || 0, dados: d.dados || null, tokens: Array.isArray(d.tokens) ? d.tokens : [] }; } catch (e) {}
    return { versao: 0, dados: null, tokens: [] };
  }
  function gravarL(d) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); }
    catch (e) { throw new Error("O mapa é grande demais para ficar salvo neste navegador (diminua a imagem de fundo)."); }
  }
  // voando / submerso: estado do token no relevo (migração 24); borda: cor da borda escolhida pelo jogador (null = prateada)
  function layerDe(t) { var z = t.z != null ? t.z : t.layer; return z != null && isFinite(+z) ? Math.round(+z) : 1; }
  function copia(t) { return { id: t.id, personagem_id: t.personagem_id || null, x: t.x, y: t.y, z: layerDe(t), cor: t.cor || "#E0455A", rot: t.rot || "", voando: !!t.voando, submerso: !!t.submerso, borda: t.borda || null,
    luz: t.luz === "tocha" || t.luz === "lanterna" ? t.luz : "", mira: isFinite(+t.mira) && t.mira !== null && t.mira !== "" ? +t.mira : null }; }
  function erroTabela(err) {
    if (err && (err.status === 404 || err.code === "42P01" || err.code === "PGRST205")) return new Error("O mapa da sessão ainda não existe no banco. Rode banco/migracoes/migracao-22.sql no Supabase.");
    if (err && (err.code === "PGRST204" || err.code === "42703")) {
      if (/layer/.test(String(err.message || ""))) return new Error("falta rodar banco/migracoes/migracao-27.sql no Supabase (layers do mapa).");
      if (/luz|mira/.test(String(err.message || ""))) return new Error("falta rodar banco/migracoes/migracao-28.sql no Supabase (tocha e lanterna do modo caverna).");
      return new Error("falta rodar banco/migracoes/migracao-24.sql no Supabase (voar, submergir e cor da borda).");
    }
    return err;
  }

  // Junta os tokens do banco com os que acabaram de mudar aqui (ainda indo para o banco).
  function juntar(lista) {
    var agora = Date.now(), locais = {};
    tokens.forEach(function (t) { if (emVoo[t.id] && emVoo[t.id] > agora) locais[t.id] = t; });
    var out = lista.map(function (t) { return locais[t.id] || copia(t); });
    Object.keys(locais).forEach(function (id) { if (!out.some(function (t) { return t.id === id; })) out.push(locais[id]); });
    return out.filter(function (t) { return !(removidos[t.id] > agora); });
  }

  async function carregar() {
    if (!remote) {
      var d = lerL();
      if (!mestre() || !carregou) { dados = d.dados; versao = d.versao; }
      tokens = juntar(d.tokens);
      carregou = true;
      return;
    }
    try {
      var r = await Promise.all([
        DBOApi.select("sessao_mapa", { id: "eq.1", select: "versao" }),
        DBOApi.select("sessao_tokens", { order: "atualizado_em.asc" })
      ]);
      var v = r[0] && r[0][0] ? Number(r[0][0].versao) || 0 : 0;
      // O mestre é quem grava o mapa: depois da primeira carga ele fica com a própria cópia.
      if (v !== versao && (!mestre() || !carregou)) {
        var m = await DBOApi.select("sessao_mapa", { id: "eq.1", select: "dados,versao" });
        dados = m && m[0] ? m[0].dados || null : null;
        versao = m && m[0] ? Number(m[0].versao) || 0 : v;
      }
      tokens = juntar(r[1] || []);
      carregou = true;
    } catch (err) { throw erroTabela(err); }
  }

  function marcar(id) { emVoo[id] = Date.now() + 4000; }
  function gravarTokensL() { var d = lerL(); d.tokens = tokens.map(copia); gravarL(d); }

  return {
    ready: function () { return carregar(); },
    poll: function () { return carregar(); },
    dados: function () { return dados; },
    versao: function () { return versao; },
    tokens: function () { return tokens.slice(); },

    // Mestre grava o mapa (importado agora ou editado na sessão).
    salvarMapa: function (d) {
      if (!mestre()) return Promise.reject(new Error("Só o mestre muda o mapa."));
      dados = d; versao = Date.now();
      if (!remote) { var l = lerL(); l.dados = dados; l.versao = versao; try { gravarL(l); } catch (e) { return Promise.reject(e); } return Promise.resolve(); }
      return DBOApi.upsert("sessao_mapa", [{ id: 1, dados: dados, versao: versao, atualizado_em: new Date().toISOString() }]).then(function () {}, function (err) { throw erroTabela(err); });
    },
    // Mestre tira o mapa da sessão (e todos os tokens).
    tirarMapa: function () {
      if (!mestre()) return Promise.reject(new Error("Só o mestre tira o mapa."));
      tokens.forEach(function (t) { removidos[t.id] = Date.now() + 4000; });
      dados = null; versao = Date.now(); tokens = []; emVoo = {};
      if (!remote) { gravarL({ versao: versao, dados: null, tokens: [] }); return Promise.resolve(); }
      return Promise.all([
        DBOApi.upsert("sessao_mapa", [{ id: 1, dados: null, versao: versao, atualizado_em: new Date().toISOString() }]),
        DBOApi.remove("sessao_tokens", { id: "neq.__nenhum__" })
      ]).then(function () {}, function (err) { throw erroTabela(err); });
    },
    // Põe ou move um token (o jogador, só o do próprio personagem; o banco confere).
    salvarToken: function (t) {
      var tk = copia(t);
      marcar(tk.id); delete removidos[tk.id];
      var achou = false;
      tokens = tokens.map(function (x) { if (x.id === tk.id) { achou = true; return tk; } return x; });
      if (!achou) tokens.push(tk);
      if (!remote) { try { gravarTokensL(); } catch (e) { return Promise.reject(e); } return Promise.resolve(); }
      var linha = { id: tk.id, personagem_id: tk.personagem_id, x: tk.x, y: tk.y, layer: tk.z, cor: tk.cor, rot: tk.rot, voando: tk.voando, submerso: tk.submerso, borda: tk.borda, luz: tk.luz, mira: tk.mira, atualizado_em: new Date().toISOString() };
      return DBOApi.upsert("sessao_tokens", [linha]).then(function () { marcar(tk.id); }, function (err) { delete emVoo[tk.id]; throw erroTabela(err); });
    },
    // Mestre tira um token do mapa.
    removerToken: function (id) {
      if (!mestre()) return Promise.reject(new Error("Só o mestre tira tokens do mapa."));
      tokens = tokens.filter(function (x) { return x.id !== id; });
      delete emVoo[id];
      removidos[id] = Date.now() + 4000;   // o próximo poll não traz de volta antes do banco responder
      if (!remote) { gravarTokensL(); return Promise.resolve(); }
      return DBOApi.remove("sessao_tokens", { id: "eq." + id }).then(function () {}, function (err) { delete removidos[id]; throw erroTabela(err); });
    }
  };
})();
