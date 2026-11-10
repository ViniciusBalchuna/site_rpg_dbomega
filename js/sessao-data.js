// Dragon Ball Omega — Sessão da campanha (dados)
// Quem está na sessão, pedidos para entrar, o log (mensagens, rolagens, sistema) e as anotações de cada jogador.
//
// Modo local (teste): tudo no localStorage ("dbo-sessao" e "dbo-sessao-notas:<email>").
// Modo Supabase: tabelas sessao_membros, sessao_log e sessao_notas (banco/migracoes/migracao-19.sql).
//   - Entrar: o jogador pede (pedir_sessao); o mestre aceita ou rejeita (responder_sessao). Rejeitar bloqueia o pedido por 2 minutos.
//   - Log: todos leem as mensagens; rolagens, usos de técnica e avisos do sistema (so_mestre) só o mestre lê.
//   - O mestre fixa e desfixa UMA mensagem (fixar_log).
//   - Sair (sair_sessao): tira o jogador da sessão e do combate e apaga as anotações dele.
//
// Rolagens: js/prato.js chama DBOSessao.registrarRolagem() em toda rolagem. Ela só vai para o log se o personagem
// da página (definirPersonagem) for o personagem com que o jogador está na sessão.
window.DBOSessao = (function () {
  var remote = !!window.DBOAuth && DBOAuth.mode === "supabase" && !!window.DBOApi && DBOApi.enabled;
  var KEY = "dbo-sessao", NOTAS = "dbo-sessao-notas:";
  var BLOQUEIO_MS = 2 * 60 * 1000;

  var personagemPagina = null;     // personagem aberto nesta página (ficha ou combate)
  var membros = [], log = [], fixada = null, ultimoId = 0, carregadoEm = 0, carregando = null;
  var combateCache = { id: "", t: 0 };

  function eu() { return window.DBOAuth ? DBOAuth.current() : null; }
  function meuId() { var u = eu(); if (!u) return ""; return remote ? (DBOAuth.userId ? DBOAuth.userId() : u.id) || "" : u.email; }
  function mestre() { return !!window.DBORoles && DBORoles.isMaster(); }
  function nick() { var u = eu(); return u && u.nick ? u.nick : ""; }
  function agora() { return new Date().toISOString(); }

  /* ---------- Modo local ---------- */
  function lerL() {
    try { var d = JSON.parse(localStorage.getItem(KEY)); if (d && d.membros && Array.isArray(d.log)) return d; } catch (e) {}
    return { membros: {}, log: [], seq: 0 };
  }
  function gravarL(d) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); }
    catch (e) { throw new Error("Não deu pra salvar a sessão neste navegador (espaço cheio?)."); }
  }
  function visivel(m) { return !m.so_mestre || mestre(); }

  /* ---------- Carregar ---------- */
  // Mensagens ainda indo para o banco (aparecem na hora para quem escreveu; ids "tmp-...").
  var pendentesLog = [];
  var tema = "";        // tema visual da sessão (escolhido pelo mestre)
  var npcs = [];        // NPCs que o mestre pôs na sessão: [{ personagem_id, nome, foto, tamanho }] (migração 26)
  function comPendentes(lista) { return lista.concat(pendentesLog.filter(function (p) { return visivel(p); })); }
  async function carregar(completo) {
    if (!eu()) { membros = []; log = []; fixada = null; return; }
    if (!remote) {
      var d = lerL();
      membros = Object.keys(d.membros).map(function (k) { return d.membros[k]; });
      var vis = d.log.filter(visivel);
      log = vis.slice(-200);
      fixada = vis.filter(function (m) { return m.fixada; })[0] || null;
      ultimoId = d.seq;
      tema = d.tema || "";
      npcs = Array.isArray(d.npcs) ? d.npcs : [];
      carregadoEm = Date.now();
      return;
    }
    if (!eu().confirmed) { membros = []; log = []; return; }
    try {
      // Só os ids (e se está fixada) das últimas 150: assim mensagens apagadas e o log limpo também chegam aqui.
      var r = await Promise.all([
        DBOApi.select("sessao_membros", { order: "criado_em.asc" }),
        DBOApi.select("sessao_log", { select: "id,fixada", order: "id.desc", limit: 150 }),
        DBOApi.select("sessao_log", { fixada: "eq.true", limit: 1 }),
        DBOApi.select("sessao_estado", { id: "eq.1", select: "tema" }).catch(function () { return null; }),
        DBOApi.select("sessao_npcs", { order: "criado_em.asc" }).catch(function () { return null; })
      ]);
      if (r[4]) npcs = r[4];
      membros = r[0] || [];
      var ids = (r[1] || []).map(function (x) { return x.id; });
      var cache = {};
      if (!completo) log.forEach(function (m) { if (typeof m.id === "number") cache[m.id] = m; });
      var faltam = ids.filter(function (id) { return !cache[id]; });
      if (faltam.length) {
        var novos = await DBOApi.select("sessao_log", { id: DBOApi.list(faltam) });
        (novos || []).forEach(function (m) { cache[m.id] = m; });
      }
      var fix = {}; (r[1] || []).forEach(function (x) { fix[x.id] = x.fixada; });
      log = ids.slice().reverse().map(function (id) { var m = cache[id]; if (m) m.fixada = !!fix[id]; return m; }).filter(Boolean);
      ultimoId = ids.length ? ids[0] : 0;
      fixada = (r[2] || [])[0] || null;
      if (r[3] && r[3][0]) tema = r[3][0].tema || "";
      carregadoEm = Date.now();
    } catch (err) {
      if (err && (err.status === 404 || err.code === "42P01" || err.code === "PGRST205")) {
        throw new Error("A sessão ainda não existe no banco. Rode banco/migracoes/migracao-19.sql e banco/migracoes/migracao-20.sql no Supabase.");
      }
      throw err;
    }
  }
  // Garante membros carregados há pouco (a ficha usa isso antes de mandar uma rolagem).
  function garantir() {
    if (carregadoEm && Date.now() - carregadoEm < 20000) return Promise.resolve();
    if (!carregando) carregando = carregar(false).catch(function (err) { if (window.console) console.warn("[Sessão] não consegui carregar a sessão:", err); }).then(function () { carregando = null; });
    return carregando;
  }

  /* ---------- Quem está na sessão ---------- */
  function registro(uid) { uid = uid || meuId(); return membros.filter(function (m) { return m.usuario_id === uid; })[0] || null; }
  function bloqueadoAte(m) { return m && m.bloqueado_ate ? new Date(m.bloqueado_ate).getTime() : 0; }
  // "mestre" | "aceito" | "pendente" | "rejeitado" (ainda bloqueado) | "fora"
  function status() {
    if (!eu()) return "fora";
    if (mestre()) return "mestre";
    var m = registro();
    if (!m) return "fora";
    if (m.status === "rejeitado") return bloqueadoAte(m) > Date.now() ? "rejeitado" : "fora";
    return m.status;
  }
  function naSessao() { var s = status(); return s === "mestre" || s === "aceito"; }

  /* ---------- Escrever no log ----------
     A mensagem aparece na hora na tela de quem escreveu (pendente) e vai para o banco em segundo plano. */
  var seqTmp = 0;
  function postar(tipo, texto, dados, soMestre) {
    texto = String(texto || "").slice(0, 2000);
    var msg = { id: "tmp-" + (++seqTmp), autor_id: meuId(), autor_nome: tipo === "sistema" ? "Sistema" : (nick() || "Jogador"), tipo: tipo, texto: texto,
      dados: dados || {}, so_mestre: !!soMestre, fixada: false, criado_em: agora(), pendente: true };
    if (!remote) {
      var d = lerL();
      d.seq += 1;
      msg.id = d.seq; delete msg.pendente;
      d.log.push(msg);
      if (d.log.length > 600) d.log = d.log.slice(-600);
      gravarL(d);
      if (visivel(msg)) log = log.concat([msg]).slice(-200);
      return Promise.resolve(msg);
    }
    pendentesLog.push(msg);
    avisar();
    // Rolagens e técnicas do jogador vão só para o mestre. O jogador não pode ler essa linha, então grava pela
    // função do banco postar_sessao_log (migração 23): direto na tabela o banco recusaria a gravação.
    var envio;
    if (soMestre && !mestre()) {
      envio = DBOApi.rpc("postar_sessao_log", { p_tipo: tipo, p_texto: texto, p_dados: dados || {} }).then(function () { return null; }, function (err) {
        if (err && (err.status === 404 || err.code === "PGRST202" || err.code === "42883")) {
          throw new Error("falta rodar banco/migracoes/migracao-23.sql no Supabase.");
        }
        throw err;
      });
    } else {
      envio = DBOApi.insert("sessao_log", [{ tipo: tipo, texto: texto, dados: dados || {}, so_mestre: !!soMestre }]);
    }
    return envio.then(function (rows) {
      pendentesLog = pendentesLog.filter(function (p) { return p !== msg; });
      var real = rows && rows[0];
      if (real && visivel(real) && !log.some(function (m) { return m.id === real.id; })) log = log.concat([real]).slice(-300);
      avisar();
      return real;
    }, function (err) {
      pendentesLog = pendentesLog.filter(function (p) { return p !== msg; });
      avisar();
      throw err;
    });
  }
  // Quem desenha a página ouve isso para redesenhar o log na hora (mensagem pendente, confirmada ou apagada).
  var ouvintes = [];
  function avisar() { ouvintes.forEach(function (f) { try { f(); } catch (e) {} }); }

  // Combate ativo (para contar as técnicas usadas nele). Na página do combate vem de DBOCombat.
  async function combateAtual() {
    if (window.DBOCombat && DBOCombat.combateId) { try { if (DBOCombat.active()) return String(DBOCombat.combateId() || ""); } catch (e) {} }
    if (Date.now() - combateCache.t < 15000) return combateCache.id;
    var id = "";
    try {
      if (remote) { var f = await DBOApi.select("combates", { select: "id", ativo: "eq.true", limit: 1 }); id = f && f[0] ? f[0].id : ""; }
      else { var c = JSON.parse(localStorage.getItem("dbo-combat") || "null"); id = c && c.id ? c.id : "local"; }
    } catch (e) {}
    combateCache = { id: id, t: Date.now() };
    return id;
  }

  // O personagem desta página é o que está na sessão? (o mestre não manda rolagens para o log)
  // Quando não é, diz no console o porquê (ajuda a achar o problema quando a rolagem não chega).
  function personagemNaSessao() {
    var m = registro();
    var ok = !mestre() && !!m && m.status === "aceito" && !!personagemPagina && String(m.personagem_id) === String(personagemPagina.id);
    if (!ok && window.console) {
      console.info("[Sessão] rolagem fora do log:",
        mestre() ? "você é o mestre" : !m ? "você não está na sessão (conta " + meuId() + ")" : m.status !== "aceito" ? "pedido ainda " + m.status :
        "o personagem desta ficha (" + (personagemPagina && personagemPagina.id) + ") não é o que entrou na sessão (" + m.personagem_id + ")");
    }
    return ok;
  }
  // Falha ao mandar para o log: aparece na tela (uma vez por minuto) e no console.
  var ultimaFalha = 0;
  function avisarFalha(prefixo, err) {
    if (window.console) console.warn(prefixo, err);
    if (Date.now() - ultimaFalha > 60000 && window.DBOUI && DBOUI.toast) { ultimaFalha = Date.now(); DBOUI.toast(prefixo + ((err && err.message) || err)); }
  }

  var ATRIBUTOS = {};
  ((window.DBOData && DBOData.ATTRIBUTES) || []).forEach(function (a) { ATRIBUTOS[a[1]] = a[0]; });
  // Tipo da rolagem pelo título do prato: atributo (branco), teste/acerto (amarelo), dano (vermelho), outro.
  function classificar(info) {
    if (info.log && info.log.tipo) return info.log;
    var t = String(info.titulo || ""), m = /^Teste de (.+)$/.exec(t);
    if (m) {
      if (ATRIBUTOS[m[1]]) return { tipo: "atributo", nome: m[1] };
      if (m[1] === "d20") return { tipo: "teste", nome: "Teste de d20" };
      return { tipo: "teste", nome: m[1] };
    }
    m = /^(Dano|Cura) de (.+)$/.exec(t);
    if (m) return { tipo: "dano", nome: m[2], cura: m[1] === "Cura" };
    if (t === "Iniciativa") return { tipo: "teste", nome: "Iniciativa" };
    return { tipo: "outro", nome: t || "Rolagem" };
  }

  var api = {
    remote: remote,
    BLOQUEIO_MS: BLOQUEIO_MS,
    ready: function () { return carregar(true); },
    poll: function () { return carregar(false); },
    status: status,
    naSessao: naSessao,
    registro: registro,
    bloqueadoAte: function () { return bloqueadoAte(registro()); },
    membros: function () { return membros.slice(); },
    aceitos: function () { return membros.filter(function (m) { return m.status === "aceito"; }); },
    pendentes: function () { return membros.filter(function (m) { return m.status === "pendente"; }); },
    log: function () { return comPendentes(log); },
    aoMudar: function (f) { ouvintes.push(f); },
    tema: function () { return tema; },
    // NPCs na sessão (o mestre põe e tira; todos leem, para ver os tokens no mapa).
    npcs: function () { return npcs.slice(); },
    adicionarNpc: function (n) {
      if (!mestre()) return Promise.reject(new Error("Só o mestre põe NPCs na sessão."));
      var row = { personagem_id: n.personagem_id, nome: String(n.nome || "NPC").slice(0, 60), foto: n.foto || null, tamanho: n.tamanho || "normal" };
      npcs = npcs.filter(function (x) { return x.personagem_id !== row.personagem_id; }).concat([Object.assign({ criado_em: agora() }, row)]);
      avisar();
      if (!remote) { var d = lerL(); d.npcs = npcs; gravarL(d); return Promise.resolve(); }
      return DBOApi.upsert("sessao_npcs", [row]).then(function () {}, function (err) {
        npcs = npcs.filter(function (x) { return x.personagem_id !== row.personagem_id; }); avisar();
        if (err && (err.status === 404 || err.code === "42P01" || err.code === "PGRST205")) throw new Error("Rode banco/migracoes/migracao-26.sql no Supabase para pôr NPCs na sessão.");
        throw err;
      });
    },
    removerNpc: function (pid) {
      if (!mestre()) return Promise.reject(new Error("Só o mestre tira NPCs da sessão."));
      npcs = npcs.filter(function (x) { return x.personagem_id !== pid; }); avisar();
      if (!remote) { var d = lerL(); d.npcs = npcs; gravarL(d); return Promise.resolve(); }
      return DBOApi.remove("sessao_npcs", { personagem_id: "eq." + pid }).then(function () {});
    },
    // Mestre escolhe o tema visual da sessão (vale para todos que estão nela).
    definirTema: function (t) {
      if (!mestre()) return Promise.reject(new Error("Só o mestre escolhe o tema."));
      tema = t || "";
      if (!remote) { var d = lerL(); d.tema = tema; gravarL(d); return Promise.resolve(); }
      return DBOApi.upsert("sessao_estado", [{ id: 1, tema: tema, atualizado_em: agora() }]).then(function () {});
    },
    // Mestre apaga mensagens escolhidas (some na hora da tela dele).
    apagar: function (ids) {
      if (!mestre()) return Promise.reject(new Error("Só o mestre apaga mensagens."));
      var set = {}; ids.forEach(function (id) { set[id] = true; });
      log = log.filter(function (m) { return !set[m.id]; });
      if (fixada && set[fixada.id]) fixada = null;
      avisar();
      if (!remote) { var d = lerL(); d.log = d.log.filter(function (m) { return !set[m.id]; }); gravarL(d); return Promise.resolve(); }
      var reais = ids.filter(function (id) { return typeof id === "number"; });
      return reais.length ? DBOApi.remove("sessao_log", { id: DBOApi.list(reais) }).then(function () {}) : Promise.resolve();
    },
    // Mestre limpa o log: só as mensagens ("msg"), só os dados ("dados": rolagens, técnicas e avisos) ou tudo (sem parte).
    limpar: function (parte) {
      if (!mestre()) return Promise.reject(new Error("Só o mestre limpa o log."));
      var sai = function (m) { return parte === "msg" ? m.tipo === "msg" : parte === "dados" ? m.tipo !== "msg" : true; };
      log = log.filter(function (m) { return !sai(m); });
      if (fixada && sai(fixada)) fixada = null;
      avisar();
      if (!remote) { var d = lerL(); d.log = d.log.filter(function (m) { return !sai(m); }); gravarL(d); return Promise.resolve(); }
      var filtro = parte === "msg" ? { tipo: "eq.msg" } : parte === "dados" ? { tipo: "neq.msg" } : { id: "gt.0" };
      return DBOApi.remove("sessao_log", filtro).then(function () {});
    },
    fixada: function () { return fixada; },
    nick: nick,

    // Jogador pede para entrar com o personagem dele na campanha.
    pedir: async function (personagemId) {
      if (!eu()) throw new Error("Entre na sua conta primeiro.");
      var antes = registro();
      if (!(antes && antes.status === "rejeitado" && bloqueadoAte(antes) > Date.now())) {
        membros = membros.filter(function (m) { return m.usuario_id !== meuId(); }).concat([{ usuario_id: meuId(), personagem_id: personagemId, nome: nick() || "Jogador", status: "pendente", bloqueado_ate: null, criado_em: agora() }]);
      }
      if (!remote) {
        var d = lerL(), m = d.membros[meuId()];
        if (m && m.status === "rejeitado" && bloqueadoAte(m) > Date.now()) throw new Error("O mestre recusou seu pedido. Espere um pouco para pedir de novo.");
        d.membros[meuId()] = { usuario_id: meuId(), personagem_id: personagemId, nome: nick() || "Jogador", status: "pendente", bloqueado_ate: null, criado_em: agora() };
        gravarL(d);
      } else {
        try { await DBOApi.rpc("pedir_sessao", { p_personagem: personagemId }); }
        catch (err) { await carregar(false).catch(function () {}); throw err; }
      }
      await carregar(false);
    },
    // Mestre aceita (entra na sessão) ou rejeita (o botão do jogador fica bloqueado por 2 minutos).
    responder: async function (usuarioId, aceitar) {
      if (!mestre()) throw new Error("Só o mestre responde os pedidos.");
      // na hora, na tela do mestre
      membros.forEach(function (m) { if (m.usuario_id === usuarioId) { m.status = aceitar ? "aceito" : "rejeitado"; m.bloqueado_ate = aceitar ? null : new Date(Date.now() + BLOQUEIO_MS).toISOString(); } });
      avisar();
      if (!remote) {
        var d = lerL(), m = d.membros[usuarioId];
        if (m) { m.status = aceitar ? "aceito" : "rejeitado"; m.bloqueado_ate = aceitar ? null : new Date(Date.now() + BLOQUEIO_MS).toISOString(); gravarL(d); }
      } else {
        await DBOApi.rpc("responder_sessao", { p_usuario: usuarioId, p_aceitar: !!aceitar });
      }
      await carregar(false);
    },
    // Mestre tira um jogador da sessão.
    remover: async function (usuarioId) {
      if (!mestre()) throw new Error("Só o mestre tira jogadores da sessão.");
      membros = membros.filter(function (m) { return m.usuario_id !== usuarioId; }); avisar();
      if (!remote) { var d = lerL(); delete d.membros[usuarioId]; gravarL(d); try { localStorage.removeItem(NOTAS + usuarioId); } catch (e) {} }
      else await DBOApi.remove("sessao_membros", { usuario_id: "eq." + usuarioId });
      await carregar(false);
    },
    // O jogador sai: deixa a sessão (e o combate) e as anotações dele são apagadas.
    sair: async function () {
      if (!remote) {
        var d = lerL(); delete d.membros[meuId()]; gravarL(d);
        try { localStorage.removeItem(NOTAS + meuId()); } catch (e) {}
      } else {
        await DBOApi.rpc("sair_sessao", {});
      }
      await carregar(false);
    },

    postar: function (texto) {
      texto = String(texto || "").trim();
      if (!texto) return Promise.reject(new Error("Escreva uma mensagem."));
      if (!naSessao()) return Promise.reject(new Error("Você não está na sessão."));
      return postar("msg", texto, {}, false);
    },
    // Aviso do sistema que só o mestre lê (ex.: iniciativa alterada).
    sistema: function (texto, dados) { return postar("sistema", texto, dados || {}, true).catch(function () {}); },
    fixar: async function (id, fixar) {
      if (!mestre()) throw new Error("Só o mestre fixa mensagens.");
      // na hora: muda a fixada na tela; depois confirma no banco
      log.forEach(function (m) { if (fixar) m.fixada = m.id === id; else if (m.id === id) m.fixada = false; });
      fixada = fixar ? log.filter(function (m) { return m.id === id; })[0] || null : (fixada && fixada.id === id ? null : fixada);
      avisar();
      if (!remote) {
        var d = lerL();
        d.log.forEach(function (m) { if (fixar) m.fixada = m.id === id; else if (m.id === id) m.fixada = false; });
        gravarL(d);
      } else {
        await DBOApi.rpc("fixar_log", { p_id: id, p_fixar: !!fixar });
      }
    },

    definirPersonagem: function (c) { personagemPagina = c || null; },
    personagem: function () { return personagemPagina; },

    // Rolagem de dado (js/prato.js). Vai para o log do mestre se o personagem da página estiver na sessão.
    registrarRolagem: function (info) {
      if (!eu() || mestre() || !personagemPagina) return;
      var c = personagemPagina;
      garantir().then(function () {
        if (!personagemNaSessao()) return;
        var k = classificar(info);
        var detalhe = (info.dados.length === 1 ? "d" + info.dados[0] + " " + info.soma : info.dados.length + " dados: " + info.soma) +
          (info.fixos ? (info.fixos > 0 ? " + " : " − ") + Math.abs(info.fixos) : "") + (info.mult && info.mult !== 1 ? " × " + info.mult : "");
        var nat = k.tipo === "atributo" || k.tipo === "teste" ? info.natural : 0;
        return postar("rolagem", c.nome + " rolou " + info.total + " (" + k.nome + ")", {
          personagem: c.nome, personagem_id: c.id, tipo: k.tipo, nome: k.nome, cura: !!k.cura, total: info.total, natural: nat || 0, detalhe: detalhe
        }, true);
      }).catch(function (err) { avisarFalha("A rolagem não foi para o log do mestre: ", err); });
    },
    // Técnica usada (botão Usar). Fica no log do mestre e conta em "Técnicas usadas" do Resumo.
    registrarUso: function (t, alvos) {
      if (!eu() || mestre() || !personagemPagina || !t) return;
      var c = personagemPagina;
      garantir().then(function () {
        if (!personagemNaSessao()) return;
        return combateAtual().then(function (cid) {
          var nomes = (alvos || []).map(function (a) { return a.nome; }).filter(Boolean);
          return postar("uso", c.nome + " usou " + t.nome + (nomes.length ? " em " + nomes.join(", ") : ""), {
            personagem: c.nome, personagem_id: c.id, tecnica: t.nome, combate: cid, alvos: nomes
          }, true);
        });
      }).catch(function (err) { avisarFalha("A técnica usada não foi para o log do mestre: ", err); });
    },
    // Quantas vezes cada personagem usou cada técnica num combate: { personagem_id: { tecnica: n } }.
    contarUsos: async function (combateId) {
      var lista = [];
      if (!remote) lista = lerL().log.filter(function (m) { return m.tipo === "uso"; });
      else lista = await DBOApi.select("sessao_log", { select: "dados", tipo: "eq.uso", "dados->>combate": "eq." + combateId, limit: 2000 });
      var out = {};
      lista.forEach(function (m) {
        var d = m.dados || {};
        if (String(d.combate || "") !== String(combateId || "")) return;
        var p = out[d.personagem_id] = out[d.personagem_id] || {};
        p[d.tecnica] = (p[d.tecnica] || 0) + 1;
      });
      return out;
    },

    // Anotações do jogador (Markdown). Ficam salvas até ele sair da sessão.
    notas: {
      ler: async function () {
        if (!remote) { try { return localStorage.getItem(NOTAS + meuId()) || ""; } catch (e) { return ""; } }
        var r = await DBOApi.select("sessao_notas", { usuario_id: "eq." + meuId(), select: "conteudo" });
        return r && r[0] ? r[0].conteudo || "" : "";
      },
      salvar: async function (texto) {
        if (!remote) {
          try { localStorage.setItem(NOTAS + meuId(), texto); }
          catch (e) { throw new Error("As anotações ficaram grandes demais para este navegador. Apague alguns desenhos."); }
          return;
        }
        await DBOApi.upsert("sessao_notas", [{ usuario_id: meuId(), conteudo: texto, atualizado_em: agora() }]);
      }
    }
  };
  return api;
})();
