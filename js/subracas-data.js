// Dragon Ball Omega — habilidades de sub-raça (e do Arcosiano, que não tem sub-raça).
// Fonte: documento "Sub-classes e Sub-raças", capítulo Sub-raças. Para mudar um texto ou número, edite aqui.
//   SUBRACE_ABILITIES["Raça|Sub-raça"]: valem desde o nível 1, não ocupam espaço e SOMAM com as habilidades da raça
//     (Cauda do Deus Macaco e Zenkai continuam valendo para todo Sayajin). Aparecem junto das habilidades de raça na ficha.
//   tipo: "Mecânica" | "Narrativa" | "Híbrida" (só informa o jeito de jogar).
//   numeros: o que o site soma sozinho (espacoTec = espaços de técnica aprendida; rd = RD de técnica).
//   kpTurno: fração do KP máximo recuperada no começo de cada turno do combate (Reator Infinito).
//   O resto é texto para a mesa aplicar. Imunidades (Construto e Mecânico) ficam em js/efeitos-data.js.
(function () {
  var D = window.DBOData;

  D.SUBRACE_ABILITIES = {
    "Sayajin|Sayajin Primitivo": [
      { id: "sangue-selvagem", nome: "Sangue Selvagem", tipo: "Mecânica",
        descricao: "Quando seu HP cai para 50% ou menos, você ganha +2 em rolagens de dano físico e −2 em testes de Mente até o fim do combate. “A fome de luta fala mais alto que a razão.”" },
      { id: "faro-de-caca", nome: "Faro de Caça", tipo: "Narrativa", interpretativo: true,
        descricao: "Você sobrevive em qualquer lugar selvagem sem equipamento, rastreia pelo cheiro e sente quando uma luta está prestes a começar." }
    ],
    "Sayajin|Sayajin Híbrido": [
      { id: "poder-oculto", nome: "Poder Oculto", tipo: "Mecânica",
        descricao: "Uma vez por combate, quando um aliado cai a 0 HP na sua frente, você explode de raiva: +2 em testes de ataque e multiplicadores de dano ×1,2 por 3 rodadas." },
      { id: "mente-de-dois-mundos", nome: "Mente de Dois Mundos", tipo: "Híbrida", numeros: { espacoTec: 1 },
        descricao: "+1 espaço de técnica aprendida. Na história, você se dá bem tanto entre Sayajins quanto entre humanos (ou a outra raça do seu lado da família)." }
    ],
    "Sayajin|Sayajin Puro": [
      { id: "orgulho-da-elite", nome: "Orgulho da Elite", tipo: "Mecânica",
        descricao: "Contra um inimigo com Power Level maior que o seu, você ganha +1 em testes de ataque e em rolagens de dano. “Eu sou o príncipe de todos os Sayajins!”" },
      { id: "sangue-real", nome: "Sangue Real", tipo: "Narrativa", interpretativo: true,
        descricao: "Sayajins e soldados de exércitos galácticos reconhecem sua linhagem. Isso abre portas e também cria inimigos." }
    ],
    "Sayajin|Sayajin Lendário": [
      { id: "poder-sem-limite", nome: "Poder Sem Limite", tipo: "Mecânica",
        descricao: "Em combate, seu bônus em rolagens de dano físico é igual à rodada − 1 (+1 na 2ª rodada, +2 na 3ª...), até +5. Zera no fim do combate." },
      { id: "corpo-indestrutivel", nome: "Corpo Indestrutível", tipo: "Mecânica",
        descricao: "Uma vez por combate, ignore uma penalidade que você acabou de receber (Paralisia, Atordoamento, Concussão...)." }
    ],
    "Sayajin|Sayajin Corrompido": [
      { id: "sede-de-destruicao", nome: "Sede de Destruição", tipo: "Mecânica",
        descricao: "Quando você causa dano com uma técnica, recupera 5% do dano causado como HP." },
      { id: "aura-maligna", nome: "Aura Maligna", tipo: "Híbrida",
        descricao: "Criaturas inimigas perto de você têm −1 em testes de Mente e Concentração. Na história, animais fogem e pessoas comuns sentem medo só de estar perto." }
    ],

    "Humanóide|Alienígena": [
      { id: "fisiologia-exotica", nome: "Fisiologia Exótica", tipo: "Híbrida",
        descricao: "Na criação, escolha uma: respirar no vácuo e embaixo d'água; enxergar no escuro total; ou imunidade a Envenenamento. Combine com o mestre como isso aparece no seu corpo." },
      { id: "poliglota-galactico", nome: "Poliglota Galáctico", tipo: "Narrativa", interpretativo: true,
        descricao: "Você entende e fala as línguas mais comuns da galáxia e reconhece a raça de quase qualquer alienígena." }
    ],
    "Humanóide|Terráqueo": [
      { id: "berco-das-tecnicas", nome: "Berço das Técnicas", tipo: "Mecânica", numeros: { espacoTec: 1, rd: 1 },
        descricao: "+1 espaço de técnica aprendida e +1 de RD de técnica. Humanos não têm o corpo mais forte, mas inventaram o Kamehameha, o Kienzan e o Taiyoken." },
      { id: "nunca-desista", nome: "Nunca Desista", tipo: "Mecânica",
        descricao: "Uma vez por sessão, role de novo um teste que você acabou de falhar." }
    ],
    "Humanóide|Construto": [
      { id: "corpo-moldado", nome: "Corpo Moldado", tipo: "Mecânica",
        descricao: "Imune a Envenenamento e Sangramento: você não tem sangue nem órgãos como os outros. (O site já aplica essa imunidade.)" },
      { id: "sem-cansaco", nome: "Sem Cansaço", tipo: "Narrativa", interpretativo: true,
        descricao: "Você não precisa comer, beber nem dormir. Ainda precisa de descanso para recuperar HP e KP." }
    ],

    "Humanóide|Cerealjin": [
      { id: "terceiro-olho", nome: "Terceiro Olho", tipo: "Mecânica",
        descricao: "Você enxerga o ki, os movimentos e os detalhes que os outros perdem. Imune a Cegueira de todos os graus (o site já aplica). Uma vez por combate, no seu turno, escolha um alvo à vista: até o fim da rodada seguinte, você tem +2 em testes de ataque contra ele." },
      { id: "mente-analitica", nome: "Mente Analítica", tipo: "Híbrida",
        descricao: "Uma vez por cena, quando fizer um teste de Mente ou Concentração para investigar, observar ou perceber algo, você pode rolar de novo e ficar com o melhor resultado. Na história, você lê padrões, mentiras e pontos fracos antes dos outros." }
    ],

    "Robôs|Mecânico": [
      { id: "chassi-reparavel", nome: "Chassi Reparável", tipo: "Mecânica",
        descricao: "Fora de combate, com peças e ferramentas, você (ou um aliado) faz um teste de Mente contra RD 15. Se passar, você recupera 50% do HP. Uma vez por descanso." },
      { id: "circuitos-blindados", nome: "Circuitos Blindados", tipo: "Mecânica",
        descricao: "Imune a Envenenamento e Sangramento (o site já aplica). Em troca, curas de ki em você funcionam pela metade: máquina se conserta, não se cura." }
    ],
    "Robôs|Androide": [
      { id: "reator-infinito", nome: "Reator Infinito", tipo: "Mecânica", kpTurno: 0.05,
        descricao: "No começo de cada turno seu em combate, você recupera 5% do KP máximo. (No combate do site, isso acontece sozinho quando a vez chega no seu personagem.)" },
      { id: "sem-assinatura-de-ki", nome: "Sem Assinatura de Ki", tipo: "Narrativa", interpretativo: true,
        descricao: "Ninguém sente seu ki, e scouters não leem seu Power Level. Você só é encontrado olhando." }
    ],
    "Robôs|Bioandroide": [
      { id: "regeneracao-celular", nome: "Regeneração Celular", tipo: "Mecânica",
        descricao: "Uma vez por combate, no seu turno, gaste 15% do KP para recuperar 20% do HP e regenerar um membro perdido." },
      { id: "memoria-genetica", nome: "Memória Genética", tipo: "Híbrida",
        descricao: "Uma vez por arco, você pode usar uma técnica que viu alguém usar no arco, com o dano dela na maestria 1, sem aprendê-la." },
      { id: "absorcao-total", nome: "Absorção Total", tipo: "Híbrida",
        descricao: "Gaste 2 ações e crave a cauda num alvo que esteja com 10% do HP ou menos, Paralisado ou preso. Ele faz um teste de Resistência contra sua RD de habilidade (Força). Se falhar, é absorvido e sai da história. Uma vez por arco, e nunca num personagem de jogador sem o acordo do jogador.\n" +
          "Recompensa: escolha uma técnica do ser absorvido (ou uma habilidade dele, se o mestre permitir). Você a aprende com maestria máxima, sem gastar TP. Ela ocupa espaço normalmente.\n" +
          "Evolução: absorver seres poderosos destrava as transformações do Bioandroide. O 1º ser absorvido com Power Level igual ou maior que o seu destrava a Forma Semi-Perfeita; o 2º destrava a Forma Perfeita. Os números de cada forma ficam junto das outras transformações (ainda W.I.P)." }
    ],

    "Namekuseijin|Criador": [
      { id: "criacao-de-materia", nome: "Criação de Matéria", tipo: "Narrativa", interpretativo: true,
        descricao: "Você cria do nada objetos simples, como roupas, ferramentas e armas comuns. Objetos mágicos ou equipamentos com dados de dano só se o mestre deixar. A mesma habilidade com que Kami criou as Esferas do Dragão." },
      { id: "toque-revigorante", nome: "Toque Revigorante", tipo: "Mecânica",
        descricao: "Uma vez por descanso, fora de combate, cure 25% do HP de um aliado. Bem mais modesto que o Suporte, mas ajuda o grupo." }
    ],
    "Namekuseijin|Demoníaco": [
      { id: "regeneracao-demoniaca", nome: "Regeneração Demoníaca", tipo: "Mecânica",
        descricao: "Uma vez por combate, gaste 20% do KP para recuperar 25% do HP e regenerar um membro perdido." },
      { id: "bracos-elasticos", nome: "Braços Elásticos", tipo: "Híbrida",
        descricao: "Seus braços esticam vários metros: você alcança alvos longe sem se mover. Na mecânica, +1 em testes de ataque com técnicas físicas contra alvos voando ou fugindo." }
    ]
  };

  // O Arcosiano não tem sub-raça: as habilidades dele entram direto na raça.
  D.RACE_ABILITIES = D.RACE_ABILITIES || {};
  D.RACE_ABILITIES["Arcosiano"] = [
    { id: "sobrevivente-do-vacuo", nome: "Sobrevivente do Vácuo", tipo: "Híbrida",
      descricao: "Você respira no espaço e aguenta ambientes extremos. Uma vez por arco, quando cairia a 0 HP, fica com 1 HP. O Freeza sobreviveu cortado ao meio." },
    { id: "golpe-de-cauda", nome: "Golpe de Cauda", tipo: "Mecânica",
      descricao: "Uma vez por rodada, depois de usar uma técnica física, faça um ataque extra com a cauda: 1d4 + Velocidade, com o multiplicador de dano físico." }
  ];

  // Tipo das habilidades que já existiam (Sayajin).
  (D.RACE_ABILITIES["Sayajin"] || []).forEach(function (a) { if (!a.tipo) a.tipo = a.id === "zenkai" ? "Mecânica" : "Híbrida"; });

  // Texto de "Características no jogo" gerado a partir dos números (a criação mostra isto junto das habilidades).
  D.RACE_INFO = D.RACE_INFO || {};
})();
