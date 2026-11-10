// Dragon Ball Omega — listas fixas do sistema (usadas na criação e na ficha)
window.DBOData = {
  MAX_LEVEL: 200,
  MAX_ATTR_CREATION: 16,  // máximo de pontos em um atributo na criação
  START_TP: 50,           // todo personagem começa com 50 TPs gastos
  SCHEMA: 2,              // versão do formato da ficha (usada para atualizar fichas antigas)

  ATTRIBUTES: [
    ["forca", "Força", "FOR"], ["velocidade", "Velocidade", "VEL"], ["resistencia", "Resistência", "RES"],
    ["mente", "Mente", "MEN"], ["espirito", "Espírito", "ESP"], ["concentracao", "Concentração", "CON"]
  ],

  CLASSES: ["Guerreiro", "Monge", "Artífice", "Suporte"],
  // Texto de cada classe na criação de personagem (passo "Classe"). Para mudar, edite só aqui.
  CLASS_INFO: {
    guerreiro: "Um ser nobre de coração guerreiro é capaz de enfrentar os maiores adversários sem se amedrontar. Ter um guerreiro na linha de frente é essencial.",
    monge: "O corpo é a arma e o ki é o punho. O monge é focado em golpes de ki: transforma disciplina e concentração em ataques que o inimigo sente antes de ver. Para quem quer estar no centro da luta, com ki em cada golpe.",
    artifice: "A mente por trás das armas, armaduras e engenhocas do grupo. O artífice é um grande criador de equipamentos e máquinas, e sempre tem uma invenção que muda o rumo da batalha. Para quem gosta de construir, preparar e vencer pela criatividade.",
    suporte: "O coração do grupo. Cura, protege, encanta e abençoa os aliados, e devolve o fôlego que falta para virar a luta. Com um suporte por perto, o grupo ousa ir mais longe. Só para alinhamentos Bons."
  },
  SUBCLASS_LEVEL: 10, // nível a partir do qual dá pra escolher a sub-classe
  // Lista de sub-classes de cada classe. As habilidades e o aumento-base de cada uma ficam em js/subclasses-data.js.
  SUBCLASSES: {
    "Guerreiro": ["Guerreiro das Sombras", "Velocista", "Caçador", "Berserker"],
    "Artífice": ["Magnata", "Máquina de Guerra", "Invocador"],
    "Monge": ["Mago", "Místico", "Pesquisador", "Flex"],
    "Suporte": ["Salvador", "Instrumentista", "Divino"]
  },
  // Classes que só aceitam certos alinhamentos (o começo do nome do alinhamento).
  CLASS_ALIGNMENT: { "Suporte": "Bom" },

  RACES: {
    "Sayajin": ["Sayajin Primitivo", "Sayajin Híbrido", "Sayajin Puro", "Sayajin Lendário", "Sayajin Corrompido"],
    "Humanóide": ["Alienígena", "Terráqueo", "Construto", "Cerealjin"],
    "Robôs": ["Mecânico", "Androide", "Bioandroide"],
    "Arcosiano": [],
    "Namekuseijin": ["Criador", "Demoníaco"]
  },

  /* ---------- Habilidades genéricas de classe ----------
     Aparecem para TODAS as classes. Para subir a maestria, aprende-se de novo (até 5 vezes), e cada cópia ocupa mais um espaço
     no inventário de técnicas de classe. Cada maestria dá `por` (cumulativo com as anteriores); a maestria 5 dá `maximo` além disso.
       tipo: "corpo" | "rd" (RD de técnica) | "hp" | "kp" | "multiplicador" (com alvo "fisico"/"ki") | "espacoTecnica" | "espacoInventario"
       rotulo: texto depois do valor ("+1 de Corpo Base"). */
  GENERIC_CLASS_ABILITIES: [
    { id: "corpo-estruturado", nome: "Corpo Estruturado", generica: true, max: 5, tipo: "corpo", por: 1, maximo: 2, rotulo: "de Corpo Base" },
    { id: "mestre-tecnicas", nome: "Mestre das Técnicas", generica: true, max: 5, tipo: "rd", por: 1, maximo: 2, rotulo: "de RD de técnica" },
    { id: "corpo-de-aco", nome: "Corpo de aço", generica: true, max: 5, tipo: "hp", por: 2000, maximo: 5000, rotulo: "de HP base" },
    { id: "espirito-resiliente", nome: "Espírito resiliente", generica: true, max: 5, tipo: "kp", por: 2000, maximo: 5000, rotulo: "de KP base" },
    { id: "artista-marcial", nome: "Artista Marcial", generica: true, max: 5, tipo: "multiplicador", alvo: "fisico", por: 20, maximo: 50, rotulo: "na base do multiplicador de dano físico" },
    { id: "artista-mental", nome: "Artista Mental", generica: true, max: 5, tipo: "multiplicador", alvo: "ki", por: 20, maximo: 50, rotulo: "na base do multiplicador de dano de Ki" },
    { id: "mente-expandida", nome: "Mente expandida", generica: true, max: 5, tipo: "espacoTecnica", por: 1, maximo: 2, rotulo: "em espaço de técnica" },
    { id: "bolsos-espacosos", nome: "Bolsos espaçosos", generica: true, max: 5, tipo: "espacoInventario", por: 1, maximo: 2, rotulo: "em espaço de inventário" },
    // Genéricas de texto (sem número somado na ficha): cada maestria tem o próprio texto (textos[n-1]).
    //   nomes: o nome muda com a maestria · mods: bônus de modificador por maestria · imune: { efeito: maestria mínima } ·
    //   sonar: maestria em que o mapa da Sessão mostra quem está escondido perto (raio = CON × 3, mínimo 1).
    { id: "sensor-de-ki", nome: "Sensor de Ki", nomes: ["Sensor de Ki", "Sensor de Presença"], generica: true, max: 2,
      mods: { concentracao: [0, 1] }, imune: { cegueira: 2 }, sonar: 2,
      textos: ["Você sente o Ki dos outros: vê o Power Level de quem está ao seu redor e sabe qual é o maior atributo de cada um (narrativo).",
        "Vira Sensor de Presença: +1 no modificador de Concentração, imunidade a Cegueira, e no mapa da Sessão quem está escondido de você num raio de CON × 3 blocos (mínimo 1) pulsa como um sinal vermelho de sonar, na posição exata."] },
    { id: "piloto", nome: "Piloto", generica: true, max: 1,
      textos: ["Você comanda uma nave numa viagem: o teste de navegação de cada etapa é 1d20 + CON (sem você, o robô-chefe rola 1d20 − 2). Única genérica sem maestria a mais."] },
    { id: "comilao", nome: "Comilão", generica: true, max: 3,
      textos: ["+1 refeição entre descansos longos. A DT para recuperar HP ou KP comendo cai 1.",
        "+2 refeições entre descansos longos. A DT cai 2.",
        "Refeições sempre recuperam HP e KP (sem teste) e você come quantas vezes quiser, sem precisar descansar. Continua 1 refeição completa por descanso."] }
  ],

  // Texto da raça e de cada sub-raça na criação (passo "Raça"). A chave é o nome da raça ou da sub-raça.
  // fisico = aparência (já preenchida); ingame = características no jogo (ainda W.I.P).
  // Raça ou sub-raça que não estiver aqui aparece como W.I.P.
  RACE_INFO: {
    "Sayajin": { fisico: "Humanoides de porte atlético e musculoso, de pele bronzeada, olhos escuros e olhar intenso. O cabelo é preto, espetado e rebelde, e nunca muda de forma: por mais que seja cortado, volta ao mesmo penteado (só se transforma no Super Sayajin, quando fica dourado e ergue-se como chamas). Têm uma cauda peluda de macaco, marrom, que sai da base da coluna e costuma ficar enrolada na cintura. No campo de batalha, usam uma armadura de batalha leve sobre um macacão justo, e sob a lua cheia podem se tornar o gigantesco Oozaru.", ingame: "W.I.P" },
    "Sayajin Puro": { fisico: "O guerreiro de elite clássico. Postura altiva, cabelo espetado em pico (o famoso “V” da testa), rosto marcado pelo orgulho, armadura de batalha de soldado e uma cauda bem cuidada. Pense em Vegeta, Nappa e Raditz.", ingame: "W.I.P" },
    "Sayajin Primitivo": { fisico: "A linhagem mais antiga e selvagem da raça. Corpo mais largo e rústico, cabelo longo, escuro e desgrenhado, pele marcada por cicatrizes e vestes de pele de animais, no lugar de armaduras. A cauda é longa e grossa, e o olhar lembra o de um predador.", ingame: "W.I.P" },
    "Sayajin Híbrido": { fisico: "Filho de sayajin com outro povo. Tem aparência quase humana, com traços do lado da outra raça, mas herda o cabelo espetado e rebelde e o brilho intenso dos olhos quando a energia sobe. A cauda pode ser menor ou nem existir. Pense em Gohan, Goten e Trunks.", ingame: "W.I.P" },
    "Sayajin Lendário": { fisico: "De longe o maior de todos: passa dos dois metros, com musculatura descomunal, cabelo longo e volumoso e um corpo que parece pequeno demais para o poder que guarda. O olhar costuma ser vazio e distante, até a fúria despertar. Pense em Broly.", ingame: "W.I.P" },
    "Sayajin Corrompido": { fisico: "Um sayajin tomado pelo lado sombrio. Porte forte, cabelo espetado e rebelde, olhos de brilho avermelhado, marcas escuras na pele e uma expressão de crueldade fria. Pense em Cumber, o sayajin do mal.", ingame: "W.I.P" },
    "Humanóide": { fisico: "Corpo de forma humana, com variações enormes conforme a sub-raça: cor de pele, traços, tamanho e detalhes de outros mundos. Não têm cauda por padrão.", ingame: "W.I.P" },
    "Alienígena": { fisico: "Forma humana com traços exóticos de outro mundo: pele azul, cinza, rosa ou esverdeada, chifres, antenas, olhos extras, orelhas pontudas, escamas. É o povo mais variado do universo.", ingame: "W.I.P" },
    "Terráqueo": { fisico: "O humano da Terra, em toda a sua variedade: de todas as cores de pele, cabelos e estaturas, de quem mal passa de um metro e meio ao brutamontes de dois metros. Sem cauda e sem traços exóticos, mas com roupas e estilos que vão de mestres de kung fu a cientistas de jaleco. Pense em Kuririn, Yamcha e Tenshinhan (que, por exceção, tem um terceiro olho).", ingame: "W.I.P" },
    "Cerealjin": { fisico: "Humanoide de porte firme e postura calma, de pele clara com um tom levemente esverdeado e sem cabelo. O traço inconfundível é o terceiro olho, no meio da testa, que fica semicerrado e só abre por inteiro quando a pessoa se concentra. Os três olhos têm um brilho atento, e o olhar parece analisar tudo à volta. Não têm cauda. Costumam se vestir de forma sóbria, com roupas de combate simples e faixas na testa para esconder ou proteger o terceiro olho. Pense em Tenshinhan.", ingame: "W.I.P" },
    "Construto": { fisico: "Humanoide criado ou montado por alguém, e não nascido. Aparenta ser uma pessoa, mas há detalhes que denunciam a origem: pele lisa e uniforme demais, juntas e emendas visíveis, olhos vítreos e pouca variação de expressão. O material (argila, pedra, biomassa) define a cor e a textura.", ingame: "W.I.P" },
    "Robôs": { fisico: "Do metal à vista a corpos quase idênticos aos de uma pessoa, conforme a sub-raça. Nenhum respira por necessidade e quase todos têm olhos que não piscam.", ingame: "W.I.P" },
    "Mecânico": { fisico: "Máquina por inteiro. Corpo de placas de metal, juntas hidráulicas, olhos que são lentes ou luzes de LED, antenas, canhões embutidos e tamanhos que vão do compacto ao gigante. Não tenta parecer vivo.", ingame: "W.I.P" },
    "Androide": { fisico: "Por fora, um humano: pele, cabelo e traços de uma pessoa comum, com olhar um pouco frio demais. Por dentro, circuitos, um reator de energia e, muitas vezes, uma marca discreta da organização que o criou (como o símbolo da Red Ribbon). Pense nos Androides 17 e 18.", ingame: "W.I.P" },
    "Bioandroide": { fisico: "Mistura de tecido vivo e circuitos. Exoesqueleto de aspecto insetoide, pele esverdeada com manchas escuras, asas e uma cauda com ferrão. As formas mais evoluídas ficam mais esguias e mais humanas. Pense no Cell.", ingame: "W.I.P" },
    "Arcosiano": { fisico: "Seres de aspecto reptiliano e porte variável: nas formas contidas são baixos e atarracados, com chifres curvos, e nas formas plenas ficam altos e esguios, de corpo liso e brilhante. A pele é branca ou clara, com placas e protuberâncias em tons de roxo, azul ou dourado. Têm olhos vermelhos, uma cauda longa e fina e uma expressão de quem se acha superior a todos. Aguentam o vácuo do espaço. Pense em Freeza, Cooler, o Rei Cold e Frost.", ingame: "W.I.P" },
    "Namekuseijin": { fisico: "Pele verde, antenas na testa, orelhas pontudas e corpo esguio e alto. Não têm cabelo nem nariz como os humanos, são calmos e de voz firme. Alimentam-se só de água e têm uma ligação forte com o planeta Namekusei.", ingame: "W.I.P" },
    "Criador": { fisico: "O tipo mais sereno e pacífico. Pele verde-clara, antenas finas na testa, orelhas pontudas, corpo esguio, olhos calmos e vestes simples, de manto ou túnica claros. Pense em Kami-Sama, Dende e Nail.", ingame: "W.I.P" },
    "Demoníaco": { fisico: "O lado sombrio da raça. A pele verde é mais escura, os traços ficam mais duros, os olhos mais afiados e o sorriso mais cruel, muitas vezes com marcas escuras no rosto. Costuma usar capa de ombros largos e turbante. Pense em Piccolo Daimaoh.", ingame: "W.I.P" }
  },


  // Os 9 alinhamentos, em ordem: cada linha é Bom, Neutro e Mau.
  ALIGNMENTS: [
    "Bom e Leal", "Bom e Neutro", "Bom e Caótico",
    "Neutro e Leal", "Neutro Puro", "Neutro Caótico",
    "Mau e Leal", "Mau e Neutro", "Mau e Caótico"
  ],

  DICE: ["d4", "d6", "d8", "d10", "d12", "d20"],

  // Efeitos secundários disponíveis para técnicas e habilidades de equipamentos.
  // Efeitos de penalidade (pioram o alvo). Têm o buff de RD da maestria.
  // ATENÇÃO: a lista completa (23 penalidades, 21 fortalecimentos, graus, custo de TP) agora fica em js/efeitos-data.js (DBOEfeitos).
  // Estas duas listas antigas ficam só para compatibilidade.
  EFFECTS: ["Paralisia", "Atordoamento", "Envenenamento", "Sangramento", "Concussão", "Queimadura", "Morte Instantânea"],
  // Efeitos de fortalecimento (melhoram quem usa), escolhíveis ao criar uma técnica. São passivos (não precisam de ativação),
  // exceto "Aprimorar atributo", que tem botão "Ativar".
  //   param: o efeito pede mais uma escolha ("penalidade" ou "atributo"); fica guardado como "Nome: escolha".
  //   valor: quanto o efeito dá numa técnica CRIADA. null = ainda não definido: o efeito aparece na técnica mas não muda os números.
  //   (quando o mestre definir valor e custo em TP, é só preencher aqui; as habilidades de classe abaixo já usam seus valores.)
  BUFF_EFFECTS: [
    { nome: "Aumento de Corpo Base", valor: null },
    { nome: "Bônus em rolagens de dano", valor: null },
    { nome: "Bônus em testes de ataque", valor: null },
    { nome: "Aumentar base de HP", valor: null },
    { nome: "Aumentar base de KP", valor: null },
    { nome: "Imunidade a penalidade", param: "penalidade", valor: null },
    { nome: "Aprimorar atributo", param: "atributo", ativavel: true }
  ],
  // "Aprimorar atributo" numa técnica criada: botão Ativar gasta esta fração do KP máximo e dá o bônus fixo no próximo teste desse atributo.
  APRIMORAR_ATRIBUTO: { valor: 2, custoKp: 0.20 },

  /* ---------- Habilidades de classe ----------
     Não custam TP, não são criadas pelo jogador e não vão para o inventário de técnicas: ocupam espaço no inventário de
     "técnicas de classe" (R.limiteClasse). Mudar de classe perde todas elas e dá a inicial da nova classe.
       niveis: nível em que cada maestria começa (a maestria 1 começa no nível 1).
       cumulativo: a maestria mais alta ainda mantém os efeitos das anteriores.
       efeitos[i]: efeitos da maestria i+1. tipo:
         "rolagem"   { alvo: "fisico"|"ki", valor }  bônus fixo em rolagens de dano e testes de ataque de técnicas desse tipo
         "corpo"     { valor }                       Corpo Base
         "hp" / "kp" { valor }                       base de HP / KP
         "multiplicador" { alvo, valor }             base do multiplicador de dano físico / de Ki
         "ativar"    { atributo, valor, custoKp }    botão Ativar: bônus no próximo teste do atributo (custoKp = fração do KP máximo)
         "cura"      { pct }                         aumenta o multiplicador de Ki da cura (0.20 = 20%)
         "interpretativo"                            só vale dentro do jogo, o site só mostra o texto */
  CLASS_ABILITIES: {
    "Guerreiro": [{
      id: "destemido", nome: "Destemido!", inicial: true, niveis: [1, 12, 28, 40], cumulativo: true,
      descricao: "“O corpo é a primeira arma. O Ki é a extensão dela. A vontade é aquilo que decide até onde ambos podem chegar.”",
      efeitos: [
        [{ tipo: "rolagem", alvo: "fisico", valor: 1, texto: "Recebe um bônus permanente de +1 em rolagens de dano e testes de ataque em técnicas de dano físico." }],
        [{ tipo: "corpo", valor: 2, texto: "Seu Corpo Base aumenta em +2." },
         { tipo: "imunidade", efeito: "medo", grau: 1, texto: "Imunidade a Medo Grau I: o guerreiro não recua." }],
        [{ tipo: "hp", valor: 4000, texto: "Aumenta sua base de HP em 4.000." }],
        [{ tipo: "multiplicador", alvo: "fisico", valor: 40, texto: "Aumenta sua base de multiplicador de dano físico em 40." }]
      ]
    }],
    "Monge": [{
      id: "soberano-espirito", nome: "Soberano em Espírito", inicial: true, niveis: [1, 12, 28, 40], cumulativo: true,
      descricao: "“Somente com a mente sã e limpa, se pode ver a mais linda e pura alma”.",
      efeitos: [
        [{ tipo: "rolagem", alvo: "ki", valor: 1, texto: "Recebe um bônus permanente de +1 em rolagens de dano e testes de ataque em técnicas de dano de ki." }],
        [{ tipo: "corpo", valor: 2, texto: "Seu Corpo Base aumenta em +2." },
         { tipo: "determinacao", efeitos: ["concussao", "confusao", "sono"], grau: 1, texto: "Determinação Grau I contra Concussão, Confusão e Sono, as penalidades da mente (+1 nos testes de resistência contra elas)." }],
        [{ tipo: "kp", valor: 4000, texto: "Aumenta sua base de KP em 4.000." }],
        [{ tipo: "multiplicador", alvo: "ki", valor: 40, texto: "Aumenta sua base de multiplicador de dano de Ki em 40." }]
      ]
    }],
    "Artífice": [{
      id: "inventor", nome: "Inventor", inicial: true, niveis: [1, 24, 40], cumulativo: true,
      descricao: "“O conhecimento não têm limites.”",
      efeitos: [
        [{ tipo: "ativar", atributo: "mente", valor: 2, custoKp: 0.10, texto: "Botão Ativar: aumenta seu modificador de Mente no próximo teste em +2. Gasta 10% do KP." }],
        [{ tipo: "interpretativo", texto: "Quando ativa em um acampamento, o próximo treino ou descanso é considerado um nível maior." }],
        [{ tipo: "interpretativo", texto: "Quando ativa em um combate, permite ver o HP atual de todos." },
         { tipo: "precisao", grau: 1, texto: "As ativações do Inventor também dão Precisão Grau I (+1 nos testes de ataque) até o fim do seu próximo turno." }]
      ]
    }],
    "Suporte": [{
      id: "medicina-aplicada", nome: "Medicina Aplicada", inicial: true, niveis: [1, 24, 40], cumulativo: false,
      descricao: "“Um verdadeiro médico, ajuda seus aliados até mesmo em combate. Lança uma rajada de ki, que cura quem for atingido.”",
      // Efeito de cura (só habilidades de classe do suporte): (2d6 + Espírito) x multiplicador de dano de Ki, alvo único, em quem acertar.
      cura: { qtd: 2, dado: "d6", mod: "espirito", kpFator: 2 },
      efeitos: [
        [{ tipo: "cura", pct: 0.20, texto: "Aumenta em 20% o multiplicador de dano de Ki, quando aplicado em habilidades com efeitos de cura." }],
        [{ tipo: "cura", pct: 0.35, texto: "Aumenta em 35% o multiplicador de dano de Ki, quando aplicado em habilidades com efeitos de cura." }],
        [{ tipo: "cura", pct: 0.50, texto: "Aumenta em 50% o multiplicador de dano de Ki, quando aplicado em habilidades com efeitos de cura." },
         { tipo: "purificacao", grau: 1, texto: "Quem é curado pela rajada também recebe Purificação Grau I (perde uma penalidade de Grau I)." }]
      ]
    }]
  },
  /* ---------- Características das raças ----------
     SUBRACE_MODS: bônus (ou penalidade) fixo nos MODIFICADORES dos atributos, por sub-raça. Chave "Raça|Sub-raça".
     RACE_ABILITIES: habilidades raciais, por raça. Ficam na janela de técnicas de classe, separadas por uma linha pontilhada,
       e NÃO ocupam espaço. cortavel: tem o botão "Cortar", que elimina a habilidade para sempre.
       interpretativo: só vale dentro do jogo (o site mostra o texto).
     Raça sem entrada aqui ainda não tem nada (W.I.P). */
  SUBRACE_MODS: {
    "Sayajin|Sayajin Puro": { forca: 1, velocidade: 1 },
    "Sayajin|Sayajin Primitivo": { forca: 1, velocidade: 1, resistencia: 1, mente: -1 },
    "Sayajin|Sayajin Híbrido": { forca: 1, mente: 1 },
    "Sayajin|Sayajin Lendário": { forca: 3, resistencia: 3, velocidade: 3, mente: -5 },
    "Sayajin|Sayajin Corrompido": { forca: 2, espirito: 2, velocidade: 1, mente: -2 },
    "Humanóide|Alienígena": { velocidade: 1, espirito: 1, concentracao: 1 },
    "Humanóide|Terráqueo": { espirito: 1, concentracao: 1 },
    "Humanóide|Construto": { forca: 1, resistencia: 1 },
    "Humanóide|Cerealjin": { mente: 2, concentracao: 1, forca: -1 },
    "Robôs|Mecânico": { forca: 2, resistencia: 1, velocidade: 1, espirito: -1 },
    "Robôs|Androide": { forca: 1, velocidade: 1, resistencia: 1, espirito: -1 },
    "Robôs|Bioandroide": { velocidade: 1, espirito: 1, resistencia: 1, mente: -1 },
    "Arcosiano": { espirito: 2, resistencia: 1, concentracao: -1 },
    "Namekuseijin|Criador": { mente: 1, espirito: 1, concentracao: 1, forca: -1 },
    "Namekuseijin|Demoníaco": { forca: 1, velocidade: 1, espirito: 2, mente: -2 }
  },
  /* PL base de partida de cada sub-raça (Arcosiano: a própria raça). Chave igual à de SUBRACE_MODS.
     CLASS_PL: quanto cada classe soma ao PL base. PL base = PL da sub-raça + bônus da classe + 10 × TPs gastos. */
  SUBRACE_PL: {
    "Sayajin|Sayajin Puro": 18000, "Sayajin|Sayajin Primitivo": 17000, "Sayajin|Sayajin Híbrido": 12000,
    "Sayajin|Sayajin Lendário": 25000, "Sayajin|Sayajin Corrompido": 22000,
    "Humanóide|Alienígena": 10000, "Humanóide|Terráqueo": 5000, "Humanóide|Construto": 8000, "Humanóide|Cerealjin": 7000,
    "Robôs|Mecânico": 9000, "Robôs|Androide": 11000, "Robôs|Bioandroide": 14000,
    "Arcosiano": 19000, "Namekuseijin|Criador": 6000, "Namekuseijin|Demoníaco": 16000
  },
  CLASS_PL: { "Guerreiro": 3000, "Monge": 2500, "Artífice": 1000, "Suporte": 500 },

  RACE_ABILITIES: {
    "Sayajin": [
      { id: "cauda-deus-macaco", nome: "Cauda do Deus macaco", cortavel: true, interpretativo: true,
        descricao: "Você possui uma memorável cauda de macaco. Pode ser cortada num golpe furtivo, por ser frágil demais. Guerreiros com essa cauda conseguem desbloquear o verdadeiro potencial de um sayajin. Caso sua cauda seja segurada, você recebe -4 em todos os testes." },
      { id: "zenkai", nome: "Zenkai", interpretativo: true,
        descricao: "Ao sair vivo de um confronto com 10% de HP ou menos e se recuperar, você recebe (modificador de Resistência × nível) de TPs." }
    ]
  },

  // Técnicas cuja maestria é fixa (definida pela raça). Reconhecidas pelo nome.
  FIXED_MASTERY_TECHNIQUES: ["Soco"],
  // Maestria do Soco por raça / sub-raça. Chave: "Raça" (sem sub-raça) ou "Raça|Sub-raça". Padrão: 1.
  RACE_MASTERY: {
    "Sayajin|Sayajin Lendário": 4, "Sayajin|Sayajin Corrompido": 4,
    "Arcosiano": 3, "Namekuseijin|Demoníaco": 3, "Sayajin|Sayajin Primitivo": 3, "Sayajin|Sayajin Puro": 3,
    "Sayajin|Sayajin Híbrido": 2, "Robôs|Androide": 2, "Robôs|Bioandroide": 2, "Namekuseijin|Criador": 2, "Humanóide|Construto": 2,
    "Robôs|Mecânico": 1, "Humanóide|Cerealjin": 1, "Humanóide|Terráqueo": 1, "Humanóide|Alienígena": 1
  },

  // Técnicas que todo personagem começa sabendo.
  // qtd + dado + modificador + fixo = dano (ex.: 1d4 + Espírito). tipo: "ki" ou "fisico".
  INITIAL_TECHNIQUES: [
    // Soco: dano base 1d3. A maestria dele não sobe por uso: é fixa e vem da raça (RACE_MASTERY, logo abaixo).
    { id: "soco", nome: "Soco", descricao: "", qtd: 1, dado: "d3", mod: "forca", fixo: 0, tipo: "fisico", efeitos: [] },
    { id: "ki-blast", nome: "Ki blast", descricao: "", qtd: 1, dado: "d4", mod: "espirito", fixo: 0, tipo: "ki", efeitos: [] },
    { id: "ki-wave", nome: "Ki wave", descricao: "", qtd: 1, dado: "d6", mod: "espirito", fixo: 0, tipo: "ki", efeitos: [] }
  ]
};
