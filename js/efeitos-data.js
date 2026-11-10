// Dragon Ball Omega — EFEITOS DE PENALIDADE E DE FORTALECIMENTO (um só lugar para mexer)
//
// Cada efeito tem 3 graus. O grau vem da maestria da técnica (maestria 1–2 = Grau I, 3 = Grau II, 4 = Grau III);
// habilidades de raça, classe e sub-classe dizem o próprio grau.
//
// Campos de cada efeito:
//   id, nome, tipo: "penalidade" | "fortalecimento", frase (descrição curta), resiste (atributo do teste de resistência)
//   texto      linhas da mecânica (iguais em todos os graus)
//   graus      o que muda em cada grau: [Grau I, Grau II, Grau III]
//   tp         custo de TP para aplicar: TP a mais para aprender uma técnica com esse efeito
//   param      o efeito pede mais uma escolha: "penalidade" (Imunidade), "atributo" (Aprimorar) ou "dano" (Vulnerabilidade)
//   acumula    máximo de acúmulos (Envenenamento, Sangramento)
//   tick       o que acontece sozinho a cada turno: { quando: "inicio" | "fim" | "acao", alvo: "hp" | "kp", sinal: -1 | 1,
//              dados: ["1d10", ...] (a % do máximo é rolada) ou pct: [4, 5, 6] (% fixa), porAcumulo }
//   mods       números que a ficha aplica sozinha enquanto o efeito está ativo, por grau:
//              corpo, ataque, dano (antes do multiplicador), danoFinal (fator), attr: { chave: [I, II, III] }, testes: { chave: [...] }
//
// Efeito ativo no personagem (c.efeitosAtivos): { id, ef, param, grau (1-3), rodadas (null = sem duração), acumulos, fonte }
// A duração conta em rodadas do alvo: diminui no FIM do turno dele e o efeito acaba quando chega a 0.
window.DBOEfeitos = (function () {
  var ATR = { forca: "Força", velocidade: "Velocidade", resistencia: "Resistência", mente: "Mente", espirito: "Espírito", concentracao: "Concentração" };
  var SIG = { forca: "FOR", velocidade: "VEL", resistencia: "RES", mente: "MEN", espirito: "ESP", concentracao: "CON" };

  var LISTA = [
    /* ---------------- Penalidades ---------------- */
    { id: "paralisia", nome: "Paralisia", tipo: "penalidade", frase: "O corpo trava por completo.", resiste: "resistencia", tp: 60,
      texto: ["Não pode usar ações nem reagir: contra qualquer ataque, só pode deixar ser atingido."],
      graus: ["Corpo Base −2", "Corpo Base −3", "Corpo Base −4"], mods: { corpo: [-2, -3, -4] } },
    { id: "atordoamento", nome: "Atordoamento", tipo: "penalidade", frase: "Zonzo, sem tempo de reagir.", resiste: "mente", tp: 40,
      texto: ["−1 ação em cada turno seu e não pode Contra-atacar."],
      graus: ["−2 em Esquiva e Bloqueio", "−3 em Esquiva e Bloqueio", "−4 em Esquiva e Bloqueio"] },
    { id: "envenenamento", nome: "Envenenamento", tipo: "penalidade", frase: "A toxina corrói por dentro.", resiste: "resistencia", tp: 30, acumula: 3,
      texto: ["No começo de cada turno seu, role o dado do grau: perde essa % do HP máximo para cada acúmulo.", "Curas recebidas curam só a metade.",
        "Acumula até 3 vezes. Cada acúmulo aplicado renova a duração do veneno inteiro."],
      graus: ["1d10% por acúmulo", "1d12% por acúmulo", "2d6% por acúmulo"],
      tick: { quando: "inicio", alvo: "hp", sinal: -1, dados: ["1d10", "1d12", "2d6"], porAcumulo: true } },
    { id: "sangramento", nome: "Sangramento", tipo: "penalidade", frase: "Ferida aberta que piora com o esforço.", resiste: "resistencia", tp: 30, acumula: 3,
      texto: ["Cada ação que você gasta e cada reação que você faz: role o dado do grau e perca essa % do HP máximo para cada acúmulo.",
        "Acumula até 3 vezes. Qualquer cura recebida encerra todos os acúmulos."],
      graus: ["1d4% por acúmulo", "1d6% por acúmulo", "1d8% por acúmulo"],
      tick: { quando: "acao", alvo: "hp", sinal: -1, dados: ["1d4", "1d6", "1d8"], porAcumulo: true } },
    { id: "concussao", nome: "Concussão", tipo: "penalidade", frase: "A cabeça gira e o foco some.", resiste: "mente", tp: 35,
      texto: ["Penalidade em testes de ataque e em testes de Mente e de Concentração.", "Não pode usar Ativar (bônus no próximo teste) nem ativar uma transformação."],
      graus: ["−1 nesses testes", "−2 nesses testes", "−3 nesses testes"],
      mods: { ataque: [-1, -2, -3], testes: { mente: [-1, -2, -3], concentracao: [-1, -2, -3] } } },
    { id: "queimadura", nome: "Queimadura", tipo: "penalidade", frase: "Chamas presas ao corpo.", resiste: "espirito", tp: 35,
      texto: ["No fim de cada turno seu, role o dado do grau: perde essa % do HP máximo.", "A dor enfraquece os golpes: o dano final que você causa diminui.",
        "Gastar 1 ação para apagar as chamas encerra a queimadura."],
      graus: ["2d6% do HP máximo · dano causado −10%", "2d8% do HP máximo · dano causado −15%", "3d6% do HP máximo · dano causado −20%"],
      tick: { quando: "fim", alvo: "hp", sinal: -1, dados: ["2d6", "2d8", "3d6"] }, mods: { danoFinal: [0.9, 0.85, 0.8] } },
    { id: "morte", nome: "Morte Instantânea", tipo: "penalidade", frase: "Um golpe que encerra a luta.", resiste: "resistencia", tp: 80, instantaneo: true,
      texto: ["Só funciona se o alvo estiver com uma parte do HP máximo ou menos quando é atingido. Se o alvo tiver Poder de Luta menor que o seu, essa parte dobra.",
        "Não passou: o HP vai a 0. Passou: sofre só o dano normal e fica imune a Morte Instantânea pelo resto do combate.", "Efeito instantâneo: não tem duração."],
      graus: ["15% do HP máximo (30% com PL menor)", "18% do HP máximo (36% com PL menor)", "20% do HP máximo (40% com PL menor)"], limiar: [15, 18, 20] },
    { id: "lentidao", nome: "Lentidão", tipo: "penalidade", frase: "Pernas pesadas, reflexos atrasados.", resiste: "velocidade", tp: 20,
      texto: ["Penalidade no modificador de Velocidade.", "Perseguir ou fugir custa 2 ações."],
      graus: ["VEL −1", "VEL −2", "VEL −3"], mods: { attr: { velocidade: [-1, -2, -3] } } },
    { id: "cegueira", nome: "Cegueira", tipo: "penalidade", frase: "Não enxerga o que vem.", resiste: "concentracao", tp: 40,
      texto: ["Penalidade em testes de ataque.", "Só pode reagir com Bloqueio."],
      graus: ["−3 em testes de ataque", "−4 em testes de ataque", "−5 em testes de ataque"], mods: { ataque: [-3, -4, -5] } },
    { id: "selamento", nome: "Selamento de Ki", tipo: "penalidade", frase: "O ki não responde.", resiste: "espirito", tp: 45,
      texto: ["Não pode usar técnicas de ki. Técnicas físicas continuam normais.", "Nos graus maiores, o selo trava também outros usos do ki."],
      graus: ["Só técnicas de ki", "+ não gasta KP em nada (Ativar, habilidades)", "+ não pode ativar transformação"] },
    { id: "drenagem", nome: "Drenagem de Ki", tipo: "penalidade", frase: "O ki escorre para fora.", resiste: "espirito", tp: 25,
      texto: ["No começo de cada turno seu, perde uma parte do KP máximo."],
      graus: ["4% do KP máximo", "5% do KP máximo", "6% do KP máximo"], tick: { quando: "inicio", alvo: "kp", sinal: -1, pct: [4, 5, 6] } },
    { id: "quebra", nome: "Quebra de Guarda", tipo: "penalidade", frase: "A defesa se abre.", resiste: "resistencia", tp: 30,
      texto: ["Penalidade no Corpo Base e −2 em Bloqueio."],
      graus: ["Corpo Base −2", "Corpo Base −3", "Corpo Base −4"], mods: { corpo: [-2, -3, -4] } },
    { id: "vulnerabilidade", nome: "Vulnerabilidade", tipo: "penalidade", frase: "Um ponto fraco exposto.", resiste: "resistencia", resisteTexto: "Resistência (RES) contra físico, Espírito (ESP) contra ki.", tp: 40, param: "dano",
      texto: ["Ao criar a técnica, escolha físico ou ki: o dano desse tipo que o alvo recebe aumenta."],
      graus: ["+15% de dano recebido", "+20% de dano recebido", "+25% de dano recebido"] },
    { id: "medo", nome: "Medo", tipo: "penalidade", frase: "Não consegue encarar quem o assusta.", resiste: "mente", tp: 35,
      texto: ["Penalidade nos testes de ataque contra quem causou o efeito."],
      graus: ["−3 no teste de ataque", "−6 no teste de ataque", "−9 no teste de ataque"] },
    { id: "provocacao", nome: "Provocação", tipo: "penalidade", frase: "Só tem olhos para quem provocou.", resiste: "mente", tp: 25,
      texto: ["Seus ataques precisam mirar quem provocou. Atacar qualquer outro alvo dá penalidade no teste de ataque."],
      graus: ["−3 contra outros alvos", "−4 contra outros alvos", "−5 contra outros alvos"] },
    { id: "congelamento", nome: "Congelamento", tipo: "penalidade", frase: "O gelo prende os movimentos.", resiste: "resistencia", tp: 45,
      texto: ["−1 ação em cada turno seu e VEL −2.", "O próximo dano físico que você receber aumenta e encerra o congelamento (o gelo quebra)."],
      graus: ["Próximo dano físico +30%", "Próximo dano físico +40%", "Próximo dano físico +50%"], mods: { attr: { velocidade: [-2, -2, -2] } } },
    { id: "sono", nome: "Sono", tipo: "penalidade", frase: "Apaga no meio da luta.", resiste: "concentracao", tp: 40,
      texto: ["Perde todas as ações e não pode reagir.", "Acorda se um aliado gastar 1 ação para acordá-lo, ou ao sofrer dano suficiente."],
      graus: ["Acorda com qualquer dano", "Acorda com 5% do HP máximo de dano de uma vez", "Acorda com 10% do HP máximo de dano de uma vez"] },
    { id: "confusao", nome: "Confusão", tipo: "penalidade", frase: "Não sabe mais quem é quem.", resiste: "mente", tp: 40,
      texto: ["No começo de cada turno seu, role 1d6. Se cair no intervalo do grau, sua primeira ação é um ataque contra o ser mais próximo (aliado inclusive)."],
      graus: ["Ataca no 1", "Ataca no 1 ou 2", "Ataca no 1, 2 ou 3"], confusao: [1, 2, 3] },
    { id: "maldicao", nome: "Maldição", tipo: "penalidade", frase: "O corpo recusa a cura.", resiste: "espirito", tp: 35,
      texto: ["Curas recebidas e regeneração (de habilidades, raças e fortalecimentos) diminuem."],
      graus: ["Cura −50%", "Cura −75%", "Não pode ser curado"], cura: [0.5, 0.25, 0] },
    { id: "exaustao", nome: "Exaustão", tipo: "penalidade", frase: "Sem fôlego para se defender.", resiste: "resistencia", tp: 30,
      texto: ["Cada reação custa 2 ações do seu próximo turno, e há um limite de reações por rodada."],
      graus: ["No máximo 2 reações por rodada", "No máximo 1 reação por rodada", "No máximo 1 reação por rodada, com −2"] },
    { id: "marca", nome: "Marca", tipo: "penalidade", assinatura: "Caçador", frase: "Uma presa à vista de todos.", resiste: "concentracao", tp: 25,
      texto: ["Ataques contra o alvo ganham bônus no teste.", "Ele não consegue se esconder de quem marcou (nem com Invisibilidade).", "Efeito assinatura do Caçador."],
      graus: ["+1 nos ataques contra ele", "+2 nos ataques contra ele", "+3 nos ataques contra ele"] },
    { id: "desarme", nome: "Desarme", tipo: "penalidade", frase: "O equipamento escapa das mãos.", resiste: "forca", tp: 30,
      texto: ["Habilidades de equipamento do alvo ficam inutilizáveis. Quem aplicou escolhe quais."],
      graus: ["1 equipamento", "2 equipamentos", "Todos os equipamentos"] },
    { id: "gravidade", nome: "Gravidade Esmagadora", tipo: "penalidade", frase: "O peso do mundo nas costas.", resiste: "forca", tp: 35,
      texto: ["Penalidade nos modificadores de Força e Velocidade.", "Não pode voar nem fugir."],
      graus: ["FOR −1 e VEL −1", "FOR −2 e VEL −2", "FOR −3 e VEL −3"], mods: { attr: { forca: [-1, -2, -3], velocidade: [-1, -2, -3] } } },

    /* ---------------- Fortalecimentos ---------------- */
    { id: "resiliencia", nome: "Resiliência", tipo: "fortalecimento", frase: "Guarda mais firme.", tp: 25,
      texto: ["Bônus no Corpo Base."], graus: ["Corpo Base +1", "Corpo Base +2", "Corpo Base +3"], mods: { corpo: [1, 2, 3] } },
    { id: "crueldade", nome: "Crueldade", tipo: "fortalecimento", frase: "Golpes mais pesados.", tp: 25,
      texto: ["Bônus em todas as rolagens de dano, somado antes do multiplicador."], graus: ["+1 no dano", "+2 no dano", "+3 no dano"], mods: { dano: [1, 2, 3] } },
    { id: "precisao", nome: "Precisão", tipo: "fortalecimento", frase: "Mira e tempo afiados.", tp: 25,
      texto: ["Bônus em testes de ataque."], graus: ["+1 nos testes de ataque", "+2 nos testes de ataque", "+3 nos testes de ataque"], mods: { ataque: [1, 2, 3] } },
    { id: "imunidade", nome: "Imunidade a penalidade", tipo: "fortalecimento", frase: "O corpo já se acostumou.", tp: 30, param: "penalidade",
      texto: ["Escolha uma penalidade ao criar a técnica. Você não sofre essa penalidade se ela for de grau igual ou menor que o da imunidade. Se o grau da penalidade aplicada for maior, a imunidade não funciona.",
        "Se você já estiver sob a penalidade e ela for de grau coberto, ela termina na hora."],
      graus: ["Cobre o Grau I", "Cobre os Graus I e II", "Cobre todos os graus"] },
    { id: "aprimorar", nome: "Aprimorar", tipo: "fortalecimento", frase: "Uma explosão de foco.", tp: 20, param: "atributo", ativavel: true,
      texto: ["Escolha um atributo ao criar a técnica: o nome muda com ele (Aprimorar Força, Aprimorar Velocidade...).",
        "Botão Ativar: gasta 20% do KP máximo e dá bônus no próximo teste desse atributo. Só um bônus pendente por vez."],
      graus: ["+2 no próximo teste", "+3 no próximo teste", "+4 no próximo teste"], bonus: [2, 3, 4], custoKp: 0.20 },
    { id: "regeneracao", nome: "Regeneração", tipo: "fortalecimento", frase: "As feridas fecham sozinhas.", tp: 40,
      texto: ["No começo de cada turno seu, recupera uma parte do HP máximo."], graus: ["3% do HP máximo", "4% do HP máximo", "5% do HP máximo"],
      tick: { quando: "inicio", alvo: "hp", sinal: 1, pct: [3, 4, 5], cura: true } },
    { id: "recarga", nome: "Recarga de Ki", tipo: "fortalecimento", frase: "O ki volta a cada respiração.", tp: 30,
      texto: ["No começo de cada turno seu, recupera uma parte do KP máximo."], graus: ["3% do KP máximo", "4% do KP máximo", "5% do KP máximo"],
      tick: { quando: "inicio", alvo: "kp", sinal: 1, pct: [3, 4, 5] } },
    { id: "barreira", nome: "Barreira", tipo: "fortalecimento", frase: "Um escudo de ki à frente do corpo.", tp: 40,
      texto: ["Absorve dano antes do HP, até um limite. Some quando esvazia ou quando o efeito acaba."],
      graus: ["Absorve até 10% do HP máximo", "Absorve até 12% do HP máximo", "Absorve até 15% do HP máximo"], escudo: [10, 12, 15] },
    { id: "armadura", nome: "Armadura de Ki", tipo: "fortalecimento", frase: "O ki endurece a pele.", tp: 45,
      texto: ["Reduz todo dano que você recebe."], graus: ["Dano recebido −10%", "Dano recebido −15%", "Dano recebido −20%"] },
    { id: "impeto", nome: "Ímpeto", tipo: "fortalecimento", frase: "Um fôlego a mais.", tp: 50,
      texto: ["+1 ação no seu próximo turno. Não acumula. O grau define o que essa ação pode fazer."],
      graus: ["Só Soco, perseguir ou fugir", "Qualquer ação, menos técnica que gaste KP", "Qualquer ação"] },
    { id: "reflexos", nome: "Reflexos", tipo: "fortalecimento", frase: "O corpo reage antes da mente.", tp: 45,
      texto: ["A primeira reação de cada rodada não custa ação do seu próximo turno. O grau define quais reações contam."],
      graus: ["Só Esquiva", "Esquiva ou Bloqueio", "Qualquer reação"] },
    { id: "evasao", nome: "Evasão", tipo: "fortalecimento", frase: "Sempre um passo à frente.", tp: 20,
      texto: ["Bônus em testes de Esquiva."], graus: ["+1 em Esquiva", "+2 em Esquiva", "+3 em Esquiva"] },
    { id: "postura", nome: "Postura de Ferro", tipo: "fortalecimento", frase: "Segura o golpe de frente.", tp: 40,
      texto: ["Um Bloqueio que falha ainda corta o dano pela metade.", "Nos graus maiores, ganha também bônus no Bloqueio."],
      graus: ["Sem bônus no Bloqueio", "+1 em Bloqueio", "+2 em Bloqueio"] },
    { id: "absorcao", nome: "Absorção", tipo: "fortalecimento", frase: "Rouba a força de quem acerta.", tp: 45,
      texto: ["Recupera HP igual a uma parte do dano que você causa."], graus: ["Cura 10% do dano causado", "Cura 13% do dano causado", "Cura 15% do dano causado"] },
    { id: "sobrecarga", nome: "Sobrecarga", tipo: "fortalecimento", frase: "Poder com preço.", tp: 45,
      texto: ["+25% no dano final que você causa.", "No começo de cada turno seu, role o dado do grau: perde essa % do HP máximo. Quanto mais domina, menos o corpo sofre."],
      graus: ["Perde 1d12% do HP máximo", "Perde 1d10% do HP máximo", "Perde 1d8% do HP máximo"],
      tick: { quando: "inicio", alvo: "hp", sinal: -1, dados: ["1d12", "1d10", "1d8"] }, mods: { danoFinal: [1.25, 1.25, 1.25] } },
    { id: "segunda", nome: "Segunda Chance", tipo: "fortalecimento", frase: "Não cai tão fácil.", tp: 60,
      texto: ["Na primeira vez que cairia a 0 HP enquanto o efeito durar, fica de pé com uma parte do HP. Uma vez por efeito."],
      graus: ["Fica com 1 HP", "Fica com 5% do HP máximo", "Fica com 10% do HP máximo"] },
    { id: "inspiracao", nome: "Inspiração", tipo: "fortalecimento", frase: "A presença levanta o grupo.", tp: 45,
      texto: ["Aliados perto de você ganham bônus (você não)."], graus: ["+1 em testes de ataque", "+1 em todos os testes", "+1 em todos os testes e +1 de Corpo Base"] },
    { id: "invisibilidade", nome: "Invisibilidade", tipo: "fortalecimento", frase: "Ninguém sabe onde você está.", tp: 40,
      texto: ["Ataques contra você têm penalidade. Seu próximo ataque ganha o mesmo valor como bônus e encerra a invisibilidade.", "Quem te marcou (efeito Marca) te enxerga normalmente."],
      graus: ["−3 contra você · +3 no seu ataque", "−4 contra você · +4 no seu ataque", "−5 contra você · +5 no seu ataque"] },
    { id: "purificacao", nome: "Purificação", tipo: "fortalecimento", frase: "Limpa o corpo e o ki.", tp: 35,
      texto: ["Ao usar a técnica, encerra penalidades suas de grau igual ou menor que o da Purificação."],
      graus: ["Encerra 1 penalidade de Grau I", "Encerra 1 penalidade de Grau I ou II", "Encerra 2 penalidades de qualquer grau"], purifica: [[1, 1], [1, 2], [2, 3]] },
    { id: "determinacao", nome: "Determinação", tipo: "fortalecimento", frase: "A vontade segura o corpo.", tp: 25,
      texto: ["Bônus em testes de resistência contra penalidades."], graus: ["+1 nos testes de resistência", "+2 nos testes de resistência", "+3 nos testes de resistência"] },
    { id: "contragolpe", nome: "Contra-golpe Feroz", tipo: "fortalecimento", frase: "Pune quem errou.", tp: 35,
      texto: ["Um Contra-ataque bem-sucedido causa mais dano."], graus: ["+20% de dano no contra-ataque", "+35% de dano no contra-ataque", "+50% de dano no contra-ataque"] },
    { id: "penetracao", nome: "Penetração", tipo: "fortalecimento", frase: "Acha a brecha na guarda.", tp: 35,
      texto: ["Seus ataques ignoram bônus no Corpo Base do alvo (de habilidades, equipamentos e efeitos). O valor de base (fixo da classe + modificador) nunca é ignorado.",
        "Exemplo: o alvo tem Corpo Base 8 de base, mais +2 de Resiliência e +1 da Blindagem Modular: 11 no total. Com Penetração Grau I você ignora 2 pontos de bônus, e seu ataque precisa alcançar 9. Com Grau III, ignora todos: precisa alcançar 8."],
      graus: ["Ignora até 2 de bônus", "Ignora até 3 de bônus", "Ignora todos os bônus"] }
  ];
  // Fome e Cansaço: penalidades de evolução (XP e TP de treino) que também mexem no desempenho. O Cansaço tem Grau IV (só por escalada).
  LISTA.push(
    { id: "fome", nome: "Fome", tipo: "penalidade", frase: "Quem não come, não cresce forte.", resiste: "espirito",
      texto: ["Quem está com fome só falece se ficar sem se hidratar por um período."],
      graus: ["XP ganho −10% · +1 em testes para rastrear e caçar", "XP ganho −25% · Concentração −2 e Mente −1", "XP ganho −50% · FOR −2, RES −2, CON −3 · descansos recuperam só metade do HP e do KP"],
      mods: { xp: [0.9, 0.75, 0.5], testes: { concentracao: [0, -2, -3], mente: [0, -1, 0] }, attr: { forca: [0, 0, -2], resistencia: [0, 0, -2] } } },
    { id: "cansaco", nome: "Cansaço", tipo: "penalidade", frase: "Descansar é o que faz o músculo crescer.", resiste: "resistencia", escala: true,
      texto: ["Aplicar Cansaço em quem já o tem sobe 1 grau (até o IV). O Grau IV só vem assim, ou de uma habilidade que diga o grau."],
      graus: ["TP de treino −10% · FOR −1 e VEL −1", "TP de treino −25% · FOR, VEL e RES −2 · ataque −1", "TP de treino −50% · FOR, VEL e RES −3 · −1 ação por turno", "Desmaia: não age nem reage · TP de treino 0"],
      mods: { treino: [0.9, 0.75, 0.5, 0], ataque: [0, -1, 0, 0], attr: { forca: [-1, -2, -3, -3], velocidade: [-1, -2, -3, -3], resistencia: [0, -2, -3, -3] } } }
  );
  // Custos de TP para aplicar e peso de KP (KP base no nível 1, Grau I = peso x 30), depois do balanceamento: [TP, peso de KP].
  var NOVOS = {
    paralisia: [300, 100], sono: [160, 60], morte: [240, 100], congelamento: [120, 60], atordoamento: [100, 50], confusao: [90, 50], selamento: [90, 50],
    vulnerabilidade: [80, 45], queimadura: [60, 30], envenenamento: [60, 30], sangramento: [60, 30], quebra: [55, 30], gravidade: [55, 35], cegueira: [35, 30],
    medo: [50, 35], exaustao: [50, 30], concussao: [35, 35], maldicao: [35, 35], desarme: [30, 30], provocacao: [25, 25], marca: [25, 25], drenagem: [25, 25],
    lentidao: [20, 20], fome: [40, 25], cansaco: [70, 40],
    impeto: [200, 70], segunda: [120, 70], armadura: [100, 55], inspiracao: [90, 50], regeneracao: [80, 45], sobrecarga: [80, 45], invisibilidade: [70, 40],
    absorcao: [70, 45], barreira: [60, 40], recarga: [60, 30], reflexos: [60, 45], crueldade: [50, 25], postura: [50, 40], penetracao: [50, 35],
    contragolpe: [50, 35], purificacao: [50, 35], imunidade: [50, 30], resiliencia: [25, 25], precisao: [25, 25], determinacao: [25, 25], evasao: [20, 20], aprimorar: [20, 20]
  };
  // Efeitos que um golpe FÍSICO aplica sem gastar ki (flecha envenenada): sempre 1 turno, no alvo do golpe ou no conjurador.
  var FISICOS = ["concussao", "envenenamento", "sangramento", "atordoamento", "lentidao", "cegueira", "quebra", "desarme", "exaustao", "queimadura", "marca", "provocacao", "cansaco",
    "determinacao", "precisao", "crueldade", "penetracao", "resiliencia", "postura", "reflexos", "evasao", "contragolpe"];
  var POR_ID = {}, POR_NOME = {};
  LISTA.forEach(function (e) {
    var n = NOVOS[e.id]; if (n) { e.tp = n[0]; e.kp = n[1] * 30; }
    e.fisico = FISICOS.indexOf(e.id) >= 0;
    POR_ID[e.id] = e; POR_NOME[e.nome] = e;
  });
  // Nomes antigos (técnicas criadas antes dos graus) → efeito novo. Os removidos viram null.
  var ANTIGOS = { "Aumento de Corpo Base": "resiliencia", "Bônus em rolagens de dano": "crueldade", "Bônus em testes de ataque": "precisao",
    "Aprimorar atributo": "aprimorar", "Aumentar base de HP": null, "Aumentar base de KP": null };

  // Reações entre penalidades: com as duas ao mesmo tempo, o alvo ganha mais uma (Grau I, sem teste). Uma vez por alvo, por combate.
  var REACOES = [
    { id: "choque", nome: "Choque Térmico", par: ["queimadura", "congelamento"], extra: "atordoamento", rodadas: 1, encerra: true,
      texto: "As duas acabam, e o alvo fica com Atordoamento por 1 rodada." },
    { id: "hemorragia", nome: "Hemorragia Tóxica", par: ["sangramento", "envenenamento"], extra: "maldicao", enquanto: true, texto: "Maldição enquanto as duas durarem." },
    { id: "panico", nome: "Pânico", par: ["medo", "cegueira"], extra: "confusao", rodadas: 1, texto: "Confusão por 1 rodada." },
    { id: "presa", nome: "Presa Abatida", par: ["marca", "lentidao"], extra: "quebra", enquanto: true, texto: "Quebra de Guarda enquanto as duas durarem." },
    { id: "colapso", nome: "Colapso", par: ["exaustao", "gravidade"], extra: "paralisia", rodadas: 1, texto: "Paralisia por 1 rodada." },
    { id: "vazio", nome: "Vazio Espiritual", par: ["selamento", "drenagem"], extra: "vulnerabilidade", param: "Ki", enquanto: true, texto: "Vulnerabilidade (ki) enquanto as duas durarem." }
  ];

  /* ---------- Nomes guardados nas técnicas ----------
     Técnica guarda os efeitos como texto: "Sangramento", "Imunidade a penalidade: Envenenamento", "Aprimorar: Força", "Vulnerabilidade: Ki". */
  // Cada efeito de técnica pode trazer opções depois de " | ": "Sangramento | alvo=n n=3 dur=longa".
  function ler(s) {
    s = String(s || "");
    var bruto = s, opt = {}, k = s.indexOf(" | ");
    if (k > 0) { s.slice(k + 3).split(" ").forEach(function (kv) { var a = kv.split("="); if (a[0]) opt[a[0]] = a[1]; }); s = s.slice(0, k); }
    var i = s.indexOf(": "), base = i > 0 ? s.slice(0, i) : s, param = i > 0 ? s.slice(i + 2) : "";
    var def = POR_NOME[base] || null;
    if (!def && Object.prototype.hasOwnProperty.call(ANTIGOS, base)) def = ANTIGOS[base] ? POR_ID[ANTIGOS[base]] : null;
    return { def: def, param: param, original: s, removido: !def, bruto: bruto, alvo: opt.alvo || "", n: Number(opt.n) || 0, dur: opt.dur || "" };
  }
  function texto(def, param, o) {
    var t = param ? def.nome + ": " + param : def.nome;
    if (o && (o.alvo || o.dur)) t += " | alvo=" + (o.alvo || "") + (o.n ? " n=" + o.n : "") + " dur=" + (o.dur || "");
    return t;
  }
  // Rótulo bonito: "Aprimorar Força", "Imunidade a Envenenamento", "Vulnerabilidade (Ki)".
  function rotulo(def, param) {
    if (!def) return "";
    if (def.id === "aprimorar") return "Aprimorar " + (param || "(atributo)");
    if (def.id === "imunidade") return param ? "Imunidade a " + param : def.nome;
    if (def.id === "vulnerabilidade") return param ? "Vulnerabilidade (" + param + ")" : def.nome;
    return def.nome;
  }
  function rotuloTexto(s) { var r = ler(s); return r.def ? rotulo(r.def, r.param) : r.original + " (efeito removido)"; }
  // Lista de efeitos de uma técnica, já sem os removidos.
  function daTecnica(t) {
    return [].concat(t.efeitos || [], t.fortalecimentos || []).map(ler).filter(function (r) { return r.def; });
  }
  // Atualiza os nomes antigos de uma lista (usado ao editar uma técnica).
  function normalizar(lista) {
    return (lista || []).map(ler).filter(function (r) { return r.def; }).map(function (r) { return texto(r.def, r.param, r); });
  }

  /* ---------- Grau e custo ---------- */
  function grauDaMaestria(m) { m = Number(m) || 1; return m >= 4 ? 3 : m >= 3 ? 2 : 1; }
  var ROMANO = ["", "I", "II", "III", "IV"];
  /* ---------- Duração, alvo e custo ----------
     Duração: 7 categorias, rolada quando o efeito é aplicado; muda o custo (TP e KP) do efeito.
     Alvo: muda o custo do efeito (e o do dano) e é limitado pelo alvo do dano da técnica. */
  var DURACOES = [
    { id: "inst", nome: "Instantânea", mult: 1, texto: "Instantânea (sem duração)" },
    { id: "med", nome: "Medíocre", mult: 0.5, fixo: 1, texto: "1 turno" },
    { id: "curta", nome: "Curta", mult: 1, dado: "1d4", soma: 1, texto: "1d4 + 1 turnos" },
    { id: "media", nome: "Média", mult: 1.25, dado: "1d6", soma: 2, texto: "1d6 + 2 turnos" },
    { id: "longa", nome: "Longa", mult: 1.5, dado: "2d4", soma: 3, texto: "2d4 + 3 turnos" },
    { id: "extrema", nome: "Extrema", mult: 1.75, dado: "2d6", soma: 4, texto: "2d6 + 4 turnos" },
    { id: "sem", nome: "Reativa / Sem fim", mult: 2, texto: "Só acaba quando algo é feito" }
  ];
  var DUR_POR = {}; DURACOES.forEach(function (d) { DUR_POR[d.id] = d; });
  // Rola a duração: devolve o número de turnos do alvo, ou null (sem fim).
  function rolarDuracao(id) {
    var d = DUR_POR[id] || DUR_POR.curta;
    if (d.id === "sem") return null;
    if (d.id === "inst") return 1;
    if (d.fixo) return d.fixo;
    return rolarDados(d.dado).reduce(function (a, b) { return a + b; }, 0) + d.soma;
  }
  // Habilidades antigas (raça, classe, sub-classe) dizem "N rodadas": viram a categoria mais próxima e rolam.
  function categoriaDeRodadas(n) { n = Number(n) || 1; return n <= 1 ? "med" : n <= 3 ? "curta" : n <= 5 ? "media" : n <= 8 ? "longa" : "extrema"; }
  function duracaoDeRodadas(n) { return rolarDuracao(categoriaDeRodadas(n)); }

  var ALVOS = { conj: "Conjurador", ser: "Ser", n: "N seres à escolha", area: "Área", atingidos: "Seres atingidos", golpe: "Alvo do golpe" };
  var ALVOS_DANO = { conj: "Conjurador", ser: "Ser", area: "Área", n: "N seres à escolha" };
  function padraoAlvo(def) { return def.tipo === "fortalecimento" ? "conj" : "ser"; }
  function modoFisico(t) { return !!t && t.temDano !== false && t.tipo === "fisico"; }
  function clampN(n, max) { n = Math.floor(Number(n) || 2); return Math.max(2, Math.min(max || 10, n)); }
  // Multiplicador do custo do efeito de dano pelo alvo (técnicas antigas, sem alvo guardado, valem x1).
  function multDano(t) {
    if (!t || t.temDano === false) return 1;
    switch (t.danoAlvo) {
      case "conj": return 0;
      case "ser": return 0.75;
      case "n": return 1 + 0.25 * clampN(t.danoN);
      default: return 1;
    }
  }
  // Multiplicador do custo de um efeito de penalidade/fortalecimento pelo alvo.
  function multAlvo(alvo, n) { return alvo === "area" ? 4 : alvo === "n" ? 1 + 0.5 * (clampN(n) - 1) : 1; }
  // Alvos que a técnica deixa escolher num efeito (o alcance do dano limita os outros efeitos).
  function alvosPermitidos(t, def) {
    if (modoFisico(t) && def.fisico) return def.tipo === "fortalecimento" ? ["conj"] : ["golpe", "conj"];
    if (def.id === "aprimorar" || def.id === "purificacao") return ["conj"];
    if (t && t.temDano !== false && t.danoAlvo) {
      if (t.danoAlvo === "conj" || t.danoAlvo === "ser") return ["conj", "ser"];
      if (t.danoAlvo === "area") return ["atingidos", "conj"];
      if (t.danoAlvo === "n") return ["conj", "ser", "n"];
    }
    return ["conj", "ser", "n", "area"];
  }
  // Efeito de uma técnica já com alvo e duração válidos (e o modo "golpe físico sem ki" aplicado).
  function efetivo(t, r) {
    var def = r.def, fis = modoFisico(t) && def.fisico;
    var validos = alvosPermitidos(t, def), alvo = r.alvo || padraoAlvo(def);
    if (validos.indexOf(alvo) < 0) alvo = validos.indexOf(padraoAlvo(def)) >= 0 ? padraoAlvo(def) : validos[0];
    var n = alvo === "n" ? clampN(r.n, t && t.danoAlvo === "n" ? clampN(t.danoN) : 10) : 0;
    var dur = r.dur || "curta";
    if (def.instantaneo || def.id === "purificacao") dur = "inst";
    else if (def.id === "aprimorar") dur = "curta";
    if (fis) dur = "med";
    return { def: def, param: r.param, alvo: alvo, n: n, dur: dur, fis: fis };
  }
  function itens(t) {
    return [].concat((t.efeitos || []), (t.fortalecimentos || [])).map(ler).filter(function (r) { return r.def; }).map(function (r) { return efetivo(t, r); });
  }
  // Penalidade no conjurador ou fortalecimento em "seres atingidos": a técnica inteira passa a custar 40%.
  function reduz40(lista) {
    return lista.some(function (e) { return (e.def.tipo === "penalidade" && e.alvo === "conj") || (e.def.tipo === "fortalecimento" && e.alvo === "atingidos"); });
  }
  // Custo em TP dos efeitos de uma técnica (somado depois da conta dos dados): TP x alvo x duração. { total, reduz }
  function custoEfeitos(t) {
    var lista = itens(t), total = 0;
    lista.forEach(function (e) { total += e.def.tp * multAlvo(e.alvo, e.n) * DUR_POR[e.dur].mult; });
    return { total: total, reduz: reduz40(lista) };
  }
  function custo(t) { return custoEfeitos(t).total; }
  // Grau do efeito: sobe com a maestria. Penalidade no conjurador é mais dura: maestria 1-2 = Grau III, 3-4 = Grau II.
  function grauEfetivo(def, alvo, maestria) {
    var m = Number(maestria) || 1, g = grauDaMaestria(m);
    if (def.tipo === "penalidade" && alvo === "conj") g = m <= 2 ? 3 : 2;
    return Math.min(def.graus.length, g);
  }
  var GRAU_KP = [1, 1.5, 2, 3];
  // KP dos efeitos ao usar a técnica: peso do efeito x crescimento do nível x grau x alvo x duração. Golpe físico sem ki e penalidade no conjurador não cobram. { total, reduz }
  function kpEfeitos(t, c, maestria) {
    var R = window.DBORules, cresc = R && R.crescimentoVida ? R.crescimentoVida(c) : 1, total = 0, lista = itens(t);
    lista.forEach(function (e) {
      if (e.fis || e.def.id === "aprimorar" || !e.def.kp) return;
      if (e.def.tipo === "penalidade" && e.alvo === "conj") return;
      var g = grauEfetivo(e.def, e.alvo, maestria);
      total += e.def.kp * cresc * GRAU_KP[g - 1] * multAlvo(e.alvo, e.n) * DUR_POR[e.dur].mult;
    });
    return { total: total, reduz: reduz40(lista) };
  }
  // Regra: sem efeito de dano de 100 TP ou mais, a técnica pode ter até DOIS efeitos fora de dano (penalidade e/ou fortalecimento);
  // com 100 TP ou mais em dados, só UM.
  var LIMITE_DADOS = 100;
  function limiteOk(custoDados, nEfeitos) { return nEfeitos <= (custoDados < LIMITE_DADOS ? 2 : 1); }

  /* ---------- Dados ---------- */
  function rolarDados(expr) {
    var m = /^(\d+)d(\d+)$/.exec(expr), out = [];
    for (var i = 0; i < Number(m[1]); i++) out.push(1 + Math.floor(Math.random() * Number(m[2])));
    return out;
  }

  /* ---------- Efeitos ativos no personagem ---------- */
  function ativos(c) { return (c && Array.isArray(c.efeitosAtivos) ? c.efeitosAtivos : []).filter(function (e) { return POR_ID[e.ef]; }); }
  function marcas(c) { return (c && Array.isArray(c.efeitosAtivos) ? c.efeitosAtivos : []).filter(function (e) { return /^_r:/.test(e.ef); }); }
  function idNovo() { return "fx" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
  function valorGrau(arr, g) { return arr ? arr[Math.max(1, Math.min(arr.length, g)) - 1] : 0; }

  // Soma dos números que a ficha aplica sozinha. chave = "corpo" | "ataque" | "dano".
  function somaMod(c, chave) {
    var t = 0;
    ativos(c).forEach(function (e) { var m = POR_ID[e.ef].mods; if (m && m[chave]) t += valorGrau(m[chave], e.grau); });
    return t;
  }
  function modAtributo(c, attr) {
    var t = 0;
    ativos(c).forEach(function (e) { var m = POR_ID[e.ef].mods; if (m && m.attr && m.attr[attr]) t += valorGrau(m.attr[attr], e.grau); });
    return t;
  }
  function teste(c, attr) {
    var t = 0;
    ativos(c).forEach(function (e) { var m = POR_ID[e.ef].mods; if (m && m.testes && m.testes[attr]) t += valorGrau(m.testes[attr], e.grau); });
    return t;
  }
  // Fator do XP ganho (Fome) e do TP ganho por treino (Cansaço).
  function fatorMod(c, chave) {
    var f = 1;
    ativos(c).forEach(function (e) { var m = POR_ID[e.ef].mods; if (m && m[chave]) f = Math.min(f, valorGrau(m[chave], e.grau)); });
    return f;
  }
  function danoFinal(c) {
    var f = 1;
    ativos(c).forEach(function (e) { var m = POR_ID[e.ef].mods; if (m && m.danoFinal) f *= valorGrau(m.danoFinal, e.grau); });
    return f;
  }
  // Fator das curas recebidas (Maldição e Envenenamento).
  function fatorCura(c) {
    var f = 1;
    ativos(c).forEach(function (e) {
      if (e.ef === "maldicao") f = Math.min(f, valorGrau(POR_ID.maldicao.cura, e.grau));
      if (e.ef === "envenenamento") f = Math.min(f, 0.5);
    });
    return f;
  }

  /* ---------- Imunidades ---------- */
  // Grau máximo coberto para cada penalidade: { envenenamento: 3, medo: 1, ... }
  function imunidades(c) {
    var out = {};
    function cobre(id, g) { out[id] = Math.max(out[id] || 0, g); }
    ativos(c).forEach(function (e) {
      if (e.ef !== "imunidade" || !e.param) return;
      var p = POR_NOME[e.param]; if (p) cobre(p.id, e.grau);
    });
    // Fixas: sub-raças sem sangue nem órgãos.
    if (c && (c.subraca === "Construto" || c.subraca === "Mecânico")) { cobre("envenenamento", 3); cobre("sangramento", 3); }
    // Cerealjin (Terceiro Olho): imune a Cegueira de todos os graus.
    if (c && c.subraca === "Cerealjin") cobre("cegueira", 3);
    // Habilidades de classe com imunidade (DBOData.CLASS_ABILITIES, efeito "imunidade").
    if (window.DBORules && c) {
      // Genéricas com imunidade numa maestria (Sensor de Presença: Cegueira).
      (DBOData.GENERIC_CLASS_ABILITIES || []).forEach(function (def) {
        if (!def.imune || !DBORules.maestriaGenerica) return;
        var m = DBORules.maestriaGenerica(c, def.id);
        Object.keys(def.imune).forEach(function (ef) { if (m >= def.imune[ef]) cobre(ef, 3); });
      });
      DBORules.habilidadesDeClasse(c).forEach(function (def) {
        if (def.generica || def.sub || def.exclusiva) return;
        DBORules.efeitosAtivos(def, c.nivel).forEach(function (x) { if (x.tipo === "imunidade") cobre(x.efeito, x.grau); });
      });
    }
    return out;
  }
  function imune(c, efId, grau) { var g = imunidades(c)[efId] || 0; return g >= grau; }

  /* ---------- Aplicar e tirar ---------- */
  // Devolve { lista: nova lista de efeitos, msgs: [textos] } — não grava nada.
  function adicionar(c, ef, opts) {
    opts = opts || {};
    var def = POR_ID[ef], lista = (c.efeitosAtivos || []).slice(), msgs = [];
    var grau = Math.max(1, Math.min(def ? def.graus.length : 3, Number(opts.grau) || 1)), rod = opts.rodadas == null || opts.rodadas === "" ? null : Math.max(1, Number(opts.rodadas) || 1);
    if (!def) return { lista: lista, msgs: ["Efeito desconhecido."] };
    if (def.tipo === "penalidade" && imune(c, ef, grau)) return { lista: lista, msgs: [nomeCompleto(def, opts.param) + " Grau " + ROMANO[grau] + ": você é imune."], bloqueado: true };
    var ja = lista.filter(function (e) { return e.ef === ef && (e.param || "") === (opts.param || ""); })[0];
    if (ja && def.acumula) {
      ja.acumulos = Math.min(def.acumula, (Number(ja.acumulos) || 1) + 1);
      ja.grau = Math.max(ja.grau, grau);
      if (rod != null) ja.rodadas = Math.max(ja.rodadas || 0, rod); else ja.rodadas = null;
      msgs.push(def.nome + ": " + ja.acumulos + " acúmulo" + (ja.acumulos > 1 ? "s" : "") + " (duração renovada).");
    } else if (ja) {
      if (def.escala) { ja.grau = Math.min(def.graus.length, ja.grau + 1); msgs.push(nomeCompleto(def, opts.param) + " subiu para o Grau " + ROMANO[ja.grau] + "."); }
      else ja.grau = Math.max(ja.grau, grau);
      ja.rodadas = rod == null ? null : Math.max(ja.rodadas || 0, rod);
      msgs.push(nomeCompleto(def, opts.param) + ": duração renovada.");
    } else {
      lista.push({ id: idNovo(), ef: ef, param: opts.param || "", grau: grau, rodadas: rod, acumulos: 1, fonte: opts.fonte || "" });
    }
    // Imunidade nova encerra a penalidade coberta que já estava ativa.
    if (ef === "imunidade" && opts.param) {
      var alvo = POR_NOME[opts.param];
      if (alvo) lista = lista.filter(function (e) {
        var sai = e.ef === alvo.id && e.grau <= grau;
        if (sai) msgs.push(alvo.nome + " terminou (imunidade).");
        return !sai;
      });
    }
    if (def.tipo === "penalidade") lista = reagir(lista, msgs);
    return { lista: lista, msgs: msgs };
  }
  // Reações entre efeitos (uma vez por combate: a marca "_r:id" fica guardada até a lista esvaziar).
  function reagir(lista, msgs) {
    REACOES.forEach(function (r) {
      var a = lista.filter(function (e) { return e.ef === r.par[0]; })[0], b = lista.filter(function (e) { return e.ef === r.par[1]; })[0];
      if (!a || !b || lista.some(function (e) { return e.ef === "_r:" + r.id; })) return;
      lista.push({ id: idNovo(), ef: "_r:" + r.id });
      var rod = r.rodadas || (a.rodadas == null || b.rodadas == null ? null : Math.min(a.rodadas, b.rodadas));
      if (r.encerra) lista = lista.filter(function (e) { return e !== a && e !== b; });
      var ja = lista.filter(function (e) { return e.ef === r.extra; })[0];
      if (ja) { if (rod != null && ja.rodadas != null) ja.rodadas = Math.max(ja.rodadas, rod); }
      else lista.push({ id: idNovo(), ef: r.extra, param: r.param || "", grau: 1, rodadas: rod, acumulos: 1, fonte: r.nome });
      msgs.push(r.nome + "! " + r.texto);
    });
    return lista;
  }
  function remover(c, id) {
    var lista = (c.efeitosAtivos || []).filter(function (e) { return e.id !== id; });
    if (!ativos({ efeitosAtivos: lista }).length) lista = [];   // sem efeitos: as reações podem acontecer de novo
    return lista;
  }

  /* ---------- Turnos ----------
     fase "inicio": efeitos de começo de turno (veneno, drenagem, regeneração, recarga, sobrecarga).
     fase "fim": efeitos de fim de turno (queimadura) e a duração diminui; quem chega a 0 acaba.
     fase "acao": sangramento (cada ação ou reação).
     soEste: id de um efeito (botão "Passar rodada" de um efeito só).
     Devolve { patch: { hpAtual?, kpAtual?, efeitosAtivos }, msgs }. */
  function turno(c, fase, soEste) {
    var R = window.DBORules, hpMax = R.hpMax(c), kpMax = R.kpMax(c);
    var hp = R.hpAtual(c), kp = R.kpAtual(c);   // vazio = cheio
    var hp0 = hp, kp0 = kp, msgs = [], lista = (c.efeitosAtivos || []).map(function (e) { return Object.assign({}, e); });
    var cura = fatorCura(c);
    // Reator Infinito (Androide): +5% do KP máximo no começo de cada turno (não vale no "Passar rodada" de um efeito só).
    if (fase === "inicio" && !soEste && c.subraca === "Androide" && (c.raciaisPerdidas || []).indexOf("reator-infinito") < 0) {
      var rec = Math.round(kpMax * 0.05);
      kp = Math.min(kpMax, kp + rec);
      if (kp !== kp0) msgs.push("Reator Infinito: +5% (+" + (kp - kp0).toLocaleString("pt-BR") + " KP)");
    }
    // Aura Serena (Monge): Recarga de Ki Grau I (3%) ou, na maestria 2, Grau III (5%) no começo de cada turno.
    var aura = fase === "inicio" && !soEste ? R.exclusivaDoPersonagem(c, "aura-serena") : 0;
    if (aura) {
      var pa = aura >= 2 ? 5 : 3, ra = Math.round(kpMax * pa / 100);
      kp = Math.min(kpMax, kp + ra);
      if (kp !== kp0) msgs.push("Aura Serena: +" + pa + "% (+" + (kp - kp0).toLocaleString("pt-BR") + " KP)");
    }
    lista.forEach(function (e) {
      var def = POR_ID[e.ef];
      if (!def || (soEste && e.id !== soEste)) return;
      var tk = def.tick;
      if (tk && tk.quando === fase) {
        var pct, rol = "";
        if (tk.dados) { var faces = rolarDados(valorGrau(tk.dados, e.grau)); pct = faces.reduce(function (s, n) { return s + n; }, 0); rol = valorGrau(tk.dados, e.grau) + " = " + faces.join(" + ") + " → "; }
        else pct = valorGrau(tk.pct, e.grau);
        if (tk.porAcumulo) pct *= Math.max(1, Number(e.acumulos) || 1);
        var max = tk.alvo === "hp" ? hpMax : kpMax, qtd = Math.round(max * pct / 100);
        if (tk.cura) qtd = Math.round(qtd * cura);
        if (tk.alvo === "hp") hp = Math.max(0, Math.min(hpMax, hp + tk.sinal * qtd)); else kp = Math.max(0, Math.min(kpMax, kp + tk.sinal * qtd));
        msgs.push(def.nome + ": " + rol + (tk.sinal < 0 ? "−" : "+") + pct + "% (" + (tk.sinal < 0 ? "−" : "+") + Math.round(qtd).toLocaleString("pt-BR") + " " + tk.alvo.toUpperCase() + ")");
      }
      if (fase === "fim" && e.rodadas != null) e.rodadas -= 1;
    });
    var fim = lista.filter(function (e) { return POR_ID[e.ef] && e.rodadas != null && e.rodadas <= 0 && (!soEste || e.id === soEste); });
    fim.forEach(function (e) { msgs.push(rotulo(POR_ID[e.ef], e.param) + " acabou."); });
    lista = lista.filter(function (e) { return fim.indexOf(e) < 0; });
    if (!ativos({ efeitosAtivos: lista }).length) lista = [];
    var patch = { efeitosAtivos: lista };
    if (hp !== hp0) patch.hpAtual = hp;
    if (kp !== kp0) patch.kpAtual = kp;
    return { patch: patch, msgs: msgs };
  }
  // "Passar rodada" de um efeito: começo do turno, fim do turno e a duração diminui 1.
  function passarRodada(c, id) {
    var a = turno(c, "inicio", id), c2 = Object.assign({}, c, a.patch), b = turno(c2, "fim", id);
    return { patch: Object.assign({}, a.patch, b.patch), msgs: a.msgs.concat(b.msgs) };
  }
  // Turno inteiro (combate): começo e fim de todos os efeitos.
  function inicioTurno(c) { return turno(c, "inicio"); }
  function fimTurno(c) { return turno(c, "fim"); }
  function sangrar(c, id) { return turno(c, "acao", id); }

  function nomeCompleto(def, param) { return rotulo(def, param); }
  // Resumo para os cartões: o que o grau faz agora.
  function resumo(e) { var def = POR_ID[e.ef]; return def ? valorGrau(def.graus, e.grau) : ""; }

  return {
    LISTA: LISTA, POR_ID: POR_ID, POR_NOME: POR_NOME, REACOES: REACOES, ATR: ATR, SIG: SIG, ROMANO: ROMANO, LIMITE_DADOS: LIMITE_DADOS,
    penalidades: function () { return LISTA.filter(function (e) { return e.tipo === "penalidade"; }); },
    fortalecimentos: function () { return LISTA.filter(function (e) { return e.tipo === "fortalecimento"; }); },
    ler: ler, texto: texto, rotulo: rotulo, rotuloTexto: rotuloTexto, daTecnica: daTecnica, normalizar: normalizar,
    grauDaMaestria: grauDaMaestria, custo: custo, limiteOk: limiteOk, valorGrau: valorGrau,
    DURACOES: DURACOES, DUR_POR: DUR_POR, ALVOS: ALVOS, ALVOS_DANO: ALVOS_DANO, rolarDuracao: rolarDuracao, duracaoDeRodadas: duracaoDeRodadas, categoriaDeRodadas: categoriaDeRodadas,
    padraoAlvo: padraoAlvo, modoFisico: modoFisico, multDano: multDano, multAlvo: multAlvo, alvosPermitidos: alvosPermitidos, efetivo: efetivo, itens: itens,
    custoEfeitos: custoEfeitos, kpEfeitos: kpEfeitos, grauEfetivo: grauEfetivo, reduz40: reduz40, clampN: clampN, fatorMod: fatorMod,
    ativos: ativos, marcas: marcas, corpo: function (c) { return somaMod(c, "corpo"); }, ataque: function (c) { return somaMod(c, "ataque"); },
    dano: function (c) { return somaMod(c, "dano"); }, modAtributo: modAtributo, teste: teste, danoFinal: danoFinal, fatorCura: fatorCura,
    imunidades: imunidades, imune: imune, adicionar: adicionar, remover: remover, turno: turno, inicioTurno: inicioTurno, fimTurno: fimTurno,
    passarRodada: passarRodada, sangrar: sangrar, resumo: resumo, rolarDados: rolarDados,
    resisteTexto: function (def) { return def.resisteTexto || (def.resiste ? ATR[def.resiste] + " (" + SIG[def.resiste] + ")" : ""); }
  };
})();
