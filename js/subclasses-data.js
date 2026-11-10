// Dragon Ball Omega — sub-classes: aumento-base, Rugir do Dragão e habilidades I, II e III (com variantes).
// Gerado a partir do documento "Sub-classes e Sub-raças". Para mudar um texto ou número, edite aqui.
//   cat: 0 = Rugir do Dragão (automático no nível 20), 1/2/3 = habilidade I/II/III. variante: "A", "B" ou "C" (só uma por categoria).
//   numeros: o que o site soma sozinho (mods = modificadores; hp/kp = base; corpo; fisico/ki = base do multiplicador;
//            flex = os dois multiplicadores viram a média + esse valor; espacoTec / espacoInv = espaços de técnica / inventário;
//            pctKi / pctFisico = multiplicador de dano em porcentagem (0.15 = ×1,15); pctHp = HP máximo em porcentagem;
//            iniciativa = bônus na iniciativa; dorCombustivel = Berserker: físico ×1,2 com 50% do HP ou menos, ×1,4 com 25%).
//   uso: o que o botão "Usar" faz (mesmo formato das exclusivas, js/classes-exclusivas.js): kp / hp (frações do máximo),
//        pd (Pontos do Dragão), vezes (usos por combate), efeitos [{ ef, grau, rod, em: "si" | "outro" }] e
//        reforco { tipo: "ki" | "fisico" | "qualquer", pct, texto }: não gasta KP na hora; a PRÓXIMA técnica do tipo custa
//        pct a mais de KP (1 = o dobro) e recebe o efeito do texto. O resto é texto (o mestre aplica na mesa).
//   Balanceamento de 09/11/2026: veja BALANCEAMENTO.md.
(function () {
  var D = window.DBOData;
  D.SUBCLASSES = {"Guerreiro": ["Guerreiro das Sombras", "Velocista", "Caçador", "Berserker"], "Artífice": ["Magnata", "Máquina de Guerra", "Invocador"], "Monge": ["Mago", "Místico", "Pesquisador", "Flex"], "Suporte": ["Salvador", "Instrumentista", "Divino"]};
  D.SUBCLASS_UNLOCK = { 0: 20, 1: 30, 2: 60, 3: 90 };
  D.SUBCLASS_INFO = {
 "Guerreiro das Sombras": {
  "classe": "Guerreiro",
  "estilo": "O assassino que você não sente chegar.",
  "base": "+1 no modificador de Velocidade",
  "numeros": {
   "mods": {
    "velocidade": 1
   }
  }
 },
 "Velocista": {
  "classe": "Guerreiro",
  "estilo": "Quem pisca perde a luta.",
  "base": "+2 em testes de Esquiva",
  "numeros": {
   "esquiva": 2
  }
 },
 "Caçador": {
  "classe": "Guerreiro",
  "estilo": "Escolhe a presa e não larga mais.",
  "base": "+1 no modificador de Concentração",
  "numeros": {
   "mods": {
    "concentracao": 1
   }
  }
 },
 "Berserker": {
  "classe": "Guerreiro",
  "estilo": "Quanto mais a luta dura e quanto mais apanha, mais forte fica.",
  "base": "+3.000 de HP base",
  "numeros": {
   "hp": 3000
  }
 },
 "Magnata": {
  "classe": "Artífice",
  "estilo": "O dinheiro também é uma arma.",
  "base": "+1 no modificador de Mente",
  "numeros": {
   "mods": {
    "mente": 1
   }
  }
 },
 "Máquina de Guerra": {
  "classe": "Artífice",
  "estilo": "O inventor que entra na luta dentro da própria invenção.",
  "base": "+1 de Corpo Base",
  "numeros": {
   "corpo": 1
  }
 },
 "Invocador": {
  "classe": "Artífice",
  "estilo": "Não luta sozinho: constrói quem luta.",
  "base": "+2.000 de KP base",
  "numeros": {
   "kp": 2000
  }
 },
 "Mago": {
  "classe": "Monge",
  "estilo": "Dano enorme, corpo de vidro. Dizem que um mago destrói planetas num piscar de olhos.",
  "base": "+40 na base do multiplicador de dano de Ki e −1 de Corpo Base (a fragilidade faz parte da sub-classe)",
  "numeros": {
   "ki": 40,
   "corpo": -1
  }
 },
 "Místico": {
  "classe": "Monge",
  "estilo": "Usa o ki como extensão do próprio corpo e manipula o ki de outros seres vivos, da fauna e da flora.",
  "base": "+1 de Corpo Base (o ki reforça a sua estrutura)",
  "numeros": {
   "corpo": 1
  }
 },
 "Pesquisador": {
  "classe": "Monge",
  "estilo": "Ama desvendar os mistérios do ki: cria técnicas mais baratas e resolve o que ninguém conseguia.",
  "base": "+1 no modificador de Mente",
  "numeros": {
   "mods": {
    "mente": 1
   }
  }
 },
 "Flex": {
  "classe": "Monge",
  "estilo": "Equilibra força mágica e física, e usa o ki tanto na magia quanto no próprio corpo.",
  "base": "seus multiplicadores ficam equilibrados. Os multiplicadores de dano físico e de Ki passam a ser a média dos dois (depois de todos os outros bônus), e ainda ganham +20 cada um",
  "numeros": {
   "flex": 20
  }
 },
 "Salvador": {
  "classe": "Suporte",
  "estilo": "O médico que ninguém deixa para trás.",
  "base": "+10% no multiplicador de Ki das curas (soma com a Medicina Aplicada)",
  "numeros": {
   "cura": 0.1
  }
 },
 "Instrumentista": {
  "classe": "Suporte",
  "estilo": "Toca e o campo de batalha dança no ritmo dele.",
  "base": "+1 no modificador de Concentração",
  "numeros": {
   "mods": {
    "concentracao": 1
   }
  }
 },
 "Divino": {
  "classe": "Suporte",
  "estilo": "Abençoa quem protege e fica mais forte a cada pessoa que está sob sua proteção.",
  "base": "+1 no modificador de Espírito",
  "numeros": {
   "mods": {
    "espirito": 1
   }
  }
 }
};
  D.SUBCLASS_ABILITIES = {
 "Guerreiro das Sombras": [
  {
   "id": "guerreiro-das-sombras-dragao",
   "cat": 0,
   "variante": "",
   "nome": "Rugir do Dragão",
   "nivel": 20,
   "tipo": "Mecânica",
   "frase": "",
   "texto": [
    "Sem gastar ação, você some nas sombras: até o seu próximo ataque, fica com Invisibilidade Grau III e ninguém consegue te mirar. Esse ataque soma seu máximo de PD ao teste e à rolagem de dano, e o alvo tem −(máximo de PD ÷ 2) para reagir. Se você não atacar até o fim do próximo turno, reaparece e o efeito acaba."
   ],
   "dragao": true,
   "custoPd": 1
  },
  {
   "id": "guerreiro-das-sombras-1a",
   "cat": 1,
   "variante": "A",
   "nome": "Ki Silencioso",
   "nivel": 30,
   "tipo": "Híbrida",
   "frase": "Um guerreiro que se mostra já perdeu metade da luta.",
   "texto": [
    "• Narrativa: você pode apagar o próprio ki quando quiser. Scouters e sensores de ki mostram você como uma pessoa comum, e quem sente ki não te encontra enquanto você não atacar.",
    "• Mecânica: o primeiro ataque contra um alvo que não te percebeu ganha +2 no teste de ataque e +1 dado igual ao maior dado da técnica. Funciona uma vez por alvo em cada combate."
   ]
  },
  {
   "id": "guerreiro-das-sombras-1b",
   "cat": 1,
   "variante": "B",
   "nome": "Passo Sombrio",
   "nivel": 30,
   "tipo": "Híbrida",
   "frase": "Ele estava ali. Agora só sobrou o cheiro.",
   "texto": [
    "Gaste 10% do KP para sumir nas sombras e reaparecer num ponto que você consiga ver. Não gasta ação, mas só dá para usar uma vez por turno. O alcance cresce com o nível:",
    "• 30 a 59: Alguns metros, dentro do campo de batalha",
    "• 60 a 89: Qualquer ponto que você veja",
    "• 90+: Praticamente um teletransporte: qualquer ponto do mesmo planeta que você já tenha visitado (só fora de combate)",
    "• Mecânica (ataque): se você atacar logo depois do Passo, o alvo tem −2 para reagir (Esquiva, Bloqueio ou Contra-ataque) contra esse golpe.",
    "• Mecânica (enxofre): no ponto de partida fica uma névoa de enxofre negro até o fim da rodada. Um inimigo que estiver nela, ou passar por ela, faz um teste de Resistência contra sua RD de habilidade (Concentração). Se falhar, fica dopado: Atordoamento por 1 rodada. Cada inimigo só pode ser dopado uma vez por combate.",
    "• Narrativa: o rastro tem cheiro forte de enxofre, então quem te conhece sabe que você passou por ali."
   ],
   "japones": "重苦しい足取り",
   "uso": {
    "kp": 0.1
   }
  },
  {
   "id": "guerreiro-das-sombras-2a",
   "cat": 2,
   "variante": "A",
   "nome": "Zanzoken Sombrio",
   "nivel": 60,
   "tipo": "Mecânica",
   "frase": "Você acertou. Só que não era eu.",
   "texto": [
    "Uma Esquiva melhorada, 3 vezes por combate. Quando um ataque vier na sua direção, gaste 10% do KP e faça um teste de Velocidade com +3 contra o teste de ataque.",
    "• Se passar: o golpe acerta uma imagem residual e você não sofre nada. Você reaparece atrás de quem te atacou, e o seu próximo ataque contra ele, até o fim do seu próximo turno, deixa ele com −4 para reagir.",
    "• Sem custo de ação: diferente das outras reações, o Zanzoken Sombrio não tira ação do seu próximo turno. Quem se move de verdade é a sombra.",
    "• Se falhar: você sofre o dano normalmente e o uso conta mesmo assim."
   ],
   "uso": {
    "kp": 0.1,
    "vezes": 3
   }
  },
  {
   "id": "guerreiro-das-sombras-2b",
   "cat": 2,
   "variante": "B",
   "nome": "Lâmina Dupla de Ki",
   "nivel": 60,
   "tipo": "Mecânica",
   "frase": "Não preciso das sombras para te cortar.",
   "texto": [
    "Gaste 1 ação e 10% do KP para criar um bastão de ki que queima e corta. Ele dura até o fim do combate, não ocupa espaço de técnica, usa o multiplicador de dano físico e sobe de maestria como uma técnica normal. Uma vez por turno, você troca de forma sem gastar ação:",
    "• Bastão: 2d8 + Força · Forma padrão, equilibrada",
    "• Duas lâminas: 1d10 + Força, duas vezes · Os dois cortes gastam uma ação só, cada um com teste de ataque próprio",
    "• Espadão: 2d10 + Força · O dobro do alcance: acerta alvos voando ou afastados, com −1 no teste de ataque",
    "Quando um golpe da lâmina acerta, o alvo faz um teste de Resistência contra sua RD de habilidade (Força). Se falhar, sofre Queimadura ou Sangramento, à sua escolha, no máximo uma vez por rodada. Funciona sem o Ki das Sombras: é a única arma do Guerreiro das Sombras que não depende dele."
   ],
   "japones": "二刀の気刃",
   "uso": {
    "kp": 0.1,
    "vezes": 1
   }
  },
  {
   "id": "guerreiro-das-sombras-3a",
   "cat": 3,
   "variante": "A",
   "nome": "Salto Temporal",
   "nivel": 90,
   "tipo": "Mecânica",
   "frase": "Por 0,5 segundo, o mundo inteiro é meu.",
   "texto": [
    "Uma vez por combate, no início do seu turno, gaste 30% do KP: você joga dois turnos seguidos. No primeiro, os alvos não podem usar reações (esquiva, contra-ataque, Zanzoken) contra você. No fim do segundo turno, você fica com −2 em todos os testes até o seu próximo turno, pelo desgaste."
   ],
   "uso": {
    "kp": 0.3,
    "vezes": 1
   }
  },
  {
   "id": "guerreiro-das-sombras-3b",
   "cat": 3,
   "variante": "B",
   "nome": "Ponto Vital",
   "nivel": 90,
   "tipo": "Híbrida",
   "frase": "Não preciso de força. Preciso de precisão.",
   "texto": [
    "• Mecânica: uma vez por combate, reforce a próxima técnica física (ela custa o dobro de KP). Se ela acertar, o alvo faz um teste de Resistência contra sua RD de habilidade (Velocidade). Se falhar, fica com Paralisia Grau II por 2 rodadas. Se o alvo estiver com 15% do HP ou menos, a falha vira Morte Instantânea Grau II.",
    "• Narrativa: fora de combate, você derruba alguém desacordado sem barulho e sem deixar marca."
   ],
   "uso": {
    "reforco": {
     "tipo": "fisico",
     "pct": 1.0,
     "texto": "se acertar, o alvo testa Resistência contra Paralisia Grau II por 2 rodadas (Morte Instantânea Grau II com 15% do HP ou menos)"
    },
    "vezes": 1
   }
  },
  {
   "id": "guerreiro-das-sombras-3c",
   "cat": 3,
   "variante": "C",
   "nome": "Tormento do Caos",
   "nivel": 90,
   "tipo": "Híbrida",
   "frase": "A mente parou de segurar o corpo. Agora, cada golpe é para matar.",
   "texto": [
    "Um estado de raiva pura que funciona quase como uma transformação. Uma vez por combate, gaste 2 PD e 30% do KP (sem gastar ação). Dura até o fim do combate ou até você cair.",
    "• Mecânica (poder): multiplicador de dano físico ×1,5, +2 em testes de ataque e imunidade a Atordoamento, Paralisia e Concussão.",
    "• Mecânica (descontrole): você não pode usar Esquiva, só Bloqueio e Contra-ataque, e não usa técnicas de suporte nem de cura. Se não houver inimigo ao alcance, faça um teste de Mente contra RD 15; se falhar, você ataca a criatura mais próxima, mesmo que seja um aliado.",
    "• Preço permanente: quando o Tormento acaba, seu corpo não volta a ser o mesmo. Você ganha uma Cicatriz do Caos: perde 2.000 de HP base para sempre, e as cicatrizes se acumulam. Além disso, fica com Atordoamento por 1 rodada.",
    "• Narrativa: o cabelo flutua como se estivesse embaixo d'água, raios negros rasgam o ambiente, os olhos ardem em chamas vermelhas, nascem pelos no corpo e no rosto e você fica mais musculoso e um pouco maior. Cada cicatriz deixa uma marca visível, e o mestre pode criar outras consequências na história."
   ],
   "japones": "混沌の苦悩",
   "uso": {
    "kp": 0.3,
    "pd": 2,
    "vezes": 1
   }
  }
 ],
 "Velocista": [
  {
   "id": "velocista-dragao",
   "cat": 0,
   "variante": "",
   "nome": "Rugir do Dragão",
   "nivel": 20,
   "tipo": "Mecânica",
   "frase": "",
   "texto": [
    "Até o fim do seu próximo turno, toda Esquiva soma seu máximo de PD e não custa ação. Cada Esquiva que passar devolve um Soco grátis em quem te atacou."
   ],
   "dragao": true,
   "custoPd": 1
  },
  {
   "id": "velocista-1a",
   "cat": 1,
   "variante": "A",
   "nome": "Passos de Vento",
   "nivel": 30,
   "tipo": "Híbrida",
   "frase": "Corri até aqui. Do outro lado do planeta.",
   "texto": [
    "• Mecânica: +1 de Corpo Base e +2 em testes de iniciativa.",
    "• Narrativa: você corre sobre a água, por paredes e no ar por alguns segundos. Uma viagem que levaria um dia leva uma hora."
   ],
   "numeros": {
    "corpo": 1,
    "iniciativa": 2
   }
  },
  {
   "id": "velocista-1b",
   "cat": 1,
   "variante": "B",
   "nome": "Reflexos Relâmpago",
   "nivel": 30,
   "tipo": "Mecânica",
   "frase": "Já desviei antes de você pensar em atacar.",
   "texto": [
    "Você tem Reflexos Grau I permanente: a primeira Esquiva que você fizer em cada rodada não custa ação do seu próximo turno. As outras reações seguem a regra normal. Combina com o aumento-base do Velocista: quem desvia de graça desvia sempre."
   ]
  },
  {
   "id": "velocista-2a",
   "cat": 2,
   "variante": "A",
   "nome": "Rajada de Mil Golpes",
   "nivel": 60,
   "tipo": "Mecânica",
   "frase": "Cem socos por segundo. Pode contar.",
   "texto": [
    "Reforce a próxima técnica de dano físico: ela custa 75% a mais de KP e é usada duas vezes seguidas com uma ação só, cada uma com −2 no teste de ataque. Uma vez por rodada."
   ],
   "uso": {
    "reforco": {
     "tipo": "fisico",
     "pct": 0.75,
     "texto": "ela é usada duas vezes seguidas com uma ação só, cada uma com −2 no teste de ataque"
    }
   }
  },
  {
   "id": "velocista-2b",
   "cat": 2,
   "variante": "B",
   "nome": "Desvio Redirecionado",
   "nivel": 60,
   "tipo": "Mecânica (nova reação)",
   "frase": "Cuidado com quem está atrás de mim.",
   "texto": [
    "Nova reação, 2 vezes por combate. Faça um teste de Esquiva contra o teste de ataque. Se passar, você ignora o dano. Se passar por 5 ou mais, o golpe segue e atinge outra criatura perto de você, à sua escolha (pode ser um aliado do atacante), com o mesmo resultado de ataque. Custa 1 ação do próximo turno, como toda reação."
   ],
   "uso": {
    "vezes": 2
   }
  },
  {
   "id": "velocista-3a",
   "cat": 3,
   "variante": "A",
   "nome": "Além da Luz",
   "nivel": 90,
   "tipo": "Mecânica",
   "frase": "Você não está lento. Eu é que estou em outro tempo.",
   "texto": [
    "Ativar, 25% do KP, dura 3 rodadas. Em cada rodada você ganha uma ação extra, que só pode ser Soco, Esquiva ou perseguir/fugir. Uma vez por combate."
   ],
   "uso": {
    "kp": 0.25,
    "vezes": 1,
    "efeitos": [
     {
      "ef": "impeto",
      "grau": 1,
      "rod": 3,
      "em": "si"
     }
    ]
   }
  },
  {
   "id": "velocista-3b",
   "cat": 3,
   "variante": "B",
   "nome": "Contra-ataque da Luz",
   "nivel": 90,
   "tipo": "Mecânica",
   "frase": "Errou. Minha vez.",
   "texto": [
    "Toda vez que um ataque errar você, você pode responder na hora com um Soco grátis, sem gastar ação. No máximo 3 vezes por combate. Mais defensiva que a versão A, e premia quem investe em Corpo Base."
   ],
   "uso": {
    "vezes": 3
   }
  },
  {
   "id": "velocista-3c",
   "cat": 3,
   "variante": "C",
   "nome": "Tempo Acelerado",
   "nivel": 90,
   "tipo": "Mecânica",
   "frase": "Três ações é para quem anda em velocidade normal.",
   "texto": [
    "Você passa a ter 4 ações por turno, sempre. A quarta ação não pode ser usada em técnica que gaste KP, e manter esse ritmo cansa: no começo de cada turno em que usar a quarta ação, gaste 5% do KP. Como tem uma ação a mais, você também pode reagir até 4 vezes antes de perder a vez."
   ]
  }
 ],
 "Caçador": [
  {
   "id": "cacador-dragao",
   "cat": 0,
   "variante": "",
   "nome": "Rugir do Dragão",
   "nivel": 20,
   "tipo": "Mecânica",
   "frase": "",
   "texto": [
    "No próximo ataque contra o alvo marcado, some seu máximo de PD ao teste e à rolagem de dano, e ele tem −(máximo de PD ÷ 2) para reagir. Se ele cair neste combate, a marca passa na hora para outro inimigo, sem custo."
   ],
   "dragao": true,
   "custoPd": 1
  },
  {
   "id": "cacador-1a",
   "cat": 1,
   "variante": "A",
   "nome": "Marca da Presa",
   "nivel": 30,
   "tipo": "Híbrida",
   "frase": "Agora você é meu.",
   "texto": [
    "Gaste 10% do KP e marque uma criatura que você esteja vendo. Só existe uma marca por vez, e ela dura até você marcar outra.",
    "• Mecânica: o alvo fica com o efeito Marca, sem teste (Grau I; Grau II no nível 60 e Grau III no nível 90), e você tem +1 nas rolagens de dano contra ele. Quando o alvo marcado é atingido por uma técnica sua, ele faz um teste de Velocidade contra a sua RD de técnica: se falhar, fica com Lentidão Grau I por 1 rodada.",
    "• Narrativa: você sente onde a presa está, desde que ela esteja no mesmo planeta. Se ela esconder o ki, você só sabe a direção."
   ],
   "uso": {
    "kp": 0.1,
    "efeitos": [
     {
      "ef": "marca",
      "grau": 1,
      "rod": 9,
      "em": "outro"
     }
    ]
   }
  },
  {
   "id": "cacador-2a",
   "cat": 2,
   "variante": "A",
   "nome": "Olhos de Predador",
   "nivel": 60,
   "tipo": "Híbrida",
   "frase": "Já vi esse golpe. Não funciona duas vezes.",
   "texto": [
    "• Mecânica: toda técnica que o alvo marcado já usou contra você neste combate tem −2 no teste de ataque contra você dali pra frente.",
    "• Narrativa: depois de ver o alvo marcado lutar por uma rodada, o mestre te conta um ponto fraco dele (uma resistência baixa, um hábito, uma ferida antiga)."
   ]
  },
  {
   "id": "cacador-3a",
   "cat": 3,
   "variante": "A",
   "nome": "Golpe de Misericórdia",
   "nivel": 90,
   "tipo": "Mecânica",
   "frase": "A caçada acaba aqui.",
   "texto": [
    "Quando o alvo marcado estiver com 25% do HP ou menos, suas técnicas contra ele causam dano final ×1,5. Sem custo extra: o preço é ter caçado até aqui."
   ]
  },
  {
   "id": "cacador-3b",
   "cat": 3,
   "variante": "B",
   "nome": "Corrente Aprisionadora",
   "nivel": 90,
   "tipo": "Híbrida",
   "frase": "Ninguém foge da recompensa.",
   "texto": [
    "• Mecânica: uma vez por combate, gaste 25% do KP. O alvo marcado faz um teste de Força contra sua RD de habilidade (Concentração). Se falhar, fica preso por 2 rodadas: Gravidade Esmagadora Grau III e Quebra de Guarda Grau III, e não se transforma. Com a Lentidão da Marca, dispara a reação Presa Abatida.",
    "• Narrativa: um alvo capturado com essa habilidade não consegue fugir enquanto você o leva para quem pagou a recompensa."
   ],
   "uso": {
    "kp": 0.25,
    "vezes": 1,
    "efeitos": [
     {
      "ef": "gravidade",
      "grau": 3,
      "rod": 2,
      "em": "outro"
     },
     {
      "ef": "quebra",
      "grau": 3,
      "rod": 2,
      "em": "outro"
     }
    ]
   }
  }
 ],
 "Berserker": [
  {
   "id": "berserker-dragao",
   "cat": 0,
   "variante": "",
   "nome": "Rugir do Dragão",
   "nivel": 20,
   "tipo": "Mecânica",
   "frase": "",
   "texto": [
    "Ganhe Fúria igual ao seu máximo de PD (sem passar do máximo de Fúria). Até o seu próximo turno, todo dano que você sofrer cai em 5% para cada ponto do seu máximo de PD (50% com 10)."
   ],
   "dragao": true,
   "custoPd": 1
  },
  {
   "id": "berserker-1a",
   "cat": 1,
   "variante": "A",
   "nome": "Fúria Crescente",
   "nivel": 30,
   "tipo": "Mecânica",
   "frase": "Mais. Eu quero mais!",
   "texto": [
    "Você acumula Fúria em combate: +1 no começo de cada turno seu e +1 sempre que um golpe tirar 20% ou mais do seu HP máximo de uma vez. Cada ponto de Fúria dá +1 em rolagens de dano físico. O máximo é 5 pontos (10 com a habilidade III). A Fúria zera no fim do combate."
   ]
  },
  {
   "id": "berserker-2a",
   "cat": 2,
   "variante": "A",
   "nome": "Dor é Combustível",
   "nivel": 60,
   "tipo": "Mecânica",
   "frase": "Cada ferida me deixa mais perto da vitória.",
   "texto": [
    "Seu multiplicador de dano físico fica ×1,2 com 50% do HP ou menos e ×1,4 com 25% ou menos. Enquanto tiver 5 ou mais de Fúria, você tem Imunidade a Atordoamento e a Concussão até o Grau II."
   ],
   "numeros": {
    "dorCombustivel": true
   }
  },
  {
   "id": "berserker-2b",
   "cat": 2,
   "variante": "B",
   "nome": "Aguentar o Golpe",
   "nivel": 60,
   "tipo": "Mecânica (nova reação)",
   "frase": "Pode bater. Eu espero.",
   "texto": [
    "Nova reação: você não rola nada e recebe o golpe inteiro de propósito, mesmo que ele não fosse passar o seu Corpo Base. Em troca, ganha 2 de Fúria (3 se o golpe te deixar com 25% do HP ou menos). Diferente das outras reações, não custa ação do seu próximo turno."
   ]
  },
  {
   "id": "berserker-3a",
   "cat": 3,
   "variante": "A",
   "nome": "Frenesi Imparável",
   "nivel": 90,
   "tipo": "Mecânica",
   "frase": "Ele não cai. Por que ele não cai?!",
   "texto": [
    "Seu máximo de Fúria sobe para 10. Uma vez por combate, gaste 10 de Fúria: por 3 rodadas, seu HP não cai abaixo de 1, você fica imune a penalidades e ganha +1 ação por turno. Quando acaba, você fica com Atordoamento Grau I por 1 rodada, sem teste."
   ]
  },
  {
   "id": "berserker-3b",
   "cat": 3,
   "variante": "B",
   "nome": "Golpe do Fim",
   "nivel": 90,
   "tipo": "Mecânica",
   "frase": "Tudo o que eu tenho. Em um golpe.",
   "texto": [
    "Seu máximo de Fúria sobe para 10. Uma vez por combate, gaste toda a sua Fúria na próxima técnica física: o dano final é multiplicado por 1 + 0,2 por ponto gasto (até ×3 com 10 pontos). Se o golpe falhar, a Fúria é perdida do mesmo jeito."
   ]
  }
 ],
 "Magnata": [
  {
   "id": "magnata-dragao",
   "cat": 0,
   "variante": "",
   "nome": "Rugir do Dragão",
   "nivel": 20,
   "tipo": "Mecânica",
   "frase": "",
   "texto": [
    "Escolha até 2 criaturas do grupo (você pode ser uma). Cada uma soma seu máximo de PD ao próximo teste ou rolagem de dano neste combate e ganha +(máximo de PD ÷ 2) de Corpo Base até o seu próximo turno."
   ],
   "dragao": true,
   "custoPd": 1
  },
  {
   "id": "magnata-1a",
   "cat": 1,
   "variante": "A",
   "nome": "Cápsulas Hoi-Poi",
   "nivel": 30,
   "tipo": "Híbrida",
   "frase": "Por que carregar uma casa se ela cabe no bolso?",
   "texto": [
    "• Mecânica: +2 espaços de inventário, só para equipamentos guardados em cápsula. Tirar um equipamento da cápsula no meio do combate gasta a ação do turno.",
    "• Narrativa: você tem uma renda fixa. No começo de cada sessão, recebe 100 × nível em Zenis. Também carrega cápsulas de veículo e de acampamento (casa, moto, avião pequeno)."
   ],
   "numeros": {
    "espacoInv": 2
   }
  },
  {
   "id": "magnata-2a",
   "cat": 2,
   "variante": "A",
   "nome": "Rede de Contatos",
   "nivel": 60,
   "tipo": "Narrativa",
   "frase": "Eu não sei. Mas conheço quem sabe.",
   "texto": [
    "Uma vez por sessão, você liga para alguém e consegue uma destas coisas:",
    "• uma informação que o mestre considere possível de descobrir;",
    "• transporte até outro ponto do planeta (ou outro planeta, se a história permitir);",
    "• uma cápsula médica, que cura 50% do HP de um aliado fora de combate;",
    "• um favor de uma autoridade local (soltar alguém, liberar uma área, abrir uma porta)."
   ]
  },
  {
   "id": "magnata-2b",
   "cat": 2,
   "variante": "B",
   "nome": "Câmara de Gravidade Particular",
   "nivel": 60,
   "tipo": "Mecânica",
   "frase": "O Vegeta treinou aqui. Pode ficar à vontade.",
   "texto": [
    "Você tem uma câmara de gravidade. Todo Treino feito nela, por você ou por um aliado que você convidar, ganha o bônus da gravidade 10x (+5), sem precisar achar um lugar assim na história. Gravidades maiores ainda dependem do mestre."
   ]
  },
  {
   "id": "magnata-3a",
   "cat": 3,
   "variante": "A",
   "nome": "Tudo Tem Seu Preço",
   "nivel": 90,
   "tipo": "Mecânica",
   "frase": "Sorte é para quem não pode pagar.",
   "texto": [
    "Depois de ver o resultado de qualquer teste ou rolagem (sua ou de um aliado), gaste 500 × nível em Zenis para rolar de novo e ficar com o melhor resultado. No máximo 3 vezes por sessão. Cada uso seguido na mesma sessão custa o dobro do anterior."
   ]
  },
  {
   "id": "magnata-3b",
   "cat": 3,
   "variante": "B",
   "nome": "Patrocínio",
   "nivel": 90,
   "tipo": "Híbrida",
   "frase": "Vocês lutam. Eu banco.",
   "texto": [
    "• Mecânica: antes de um combate, gaste 1.000 × nível em Zenis. Até o fim do combate, todos os aliados (você incluso) ganham +1 em rolagens de dano e +1 de Corpo Base, por equipamentos de ponta emprestados.",
    "• Narrativa: o grupo usa o seu símbolo. Lugares que conhecem a sua marca tratam o grupo melhor."
   ]
  }
 ],
 "Máquina de Guerra": [
  {
   "id": "maquina-de-guerra-dragao",
   "cat": 0,
   "variante": "",
   "nome": "Rugir do Dragão",
   "nivel": 20,
   "tipo": "Mecânica",
   "frase": "",
   "texto": [
    "O próximo disparo do Canhão de Braço soma seu máximo de PD ao teste de ataque e o dobro dele à rolagem de dano. Até o seu próximo turno, a blindagem dá +(máximo de PD ÷ 2) de Corpo Base."
   ],
   "dragao": true,
   "custoPd": 1
  },
  {
   "id": "maquina-de-guerra-1a",
   "cat": 1,
   "variante": "A",
   "nome": "Blindagem Modular",
   "nivel": 30,
   "tipo": "Mecânica",
   "frase": "Primeira camada: aço. Segunda camada: mais aço.",
   "texto": [
    "Resiliência Grau I permanente (+1 de Corpo Base). E, uma vez por combate, quando receber dano, você pode ativar o escudo de energia e reduzir esse dano pela metade."
   ],
   "numeros": {
    "corpo": 1
   },
   "uso": {
    "vezes": 1
   }
  },
  {
   "id": "maquina-de-guerra-2a",
   "cat": 2,
   "variante": "A",
   "nome": "Canhão de Braço",
   "nivel": 60,
   "tipo": "Mecânica",
   "frase": "Hell's Flash. Mira travada.",
   "texto": [
    "Você ganha uma técnica de dano de ki embutida na armadura: 2d8 + Mente. Ela usa o multiplicador de dano de Ki, sobe de maestria normalmente e não ocupa espaço de técnica aprendida. É o ataque de quem não é lutador de ki, mas tem engenharia."
   ]
  },
  {
   "id": "maquina-de-guerra-3a",
   "cat": 3,
   "variante": "A",
   "nome": "Protocolo Sobrecarga",
   "nivel": 90,
   "tipo": "Mecânica",
   "frase": "Limitadores desligados. Temperatura crítica.",
   "texto": [
    "Ativar, 30% do KP, dura 3 rodadas. Seus multiplicadores de dano físico e de Ki ficam ×1,3. Quando acaba, a armadura superaquece: você fica com Atordoamento Grau I por 1 rodada, sem teste. Uma vez por combate."
   ],
   "uso": {
    "kp": 0.3,
    "vezes": 1
   }
  },
  {
   "id": "maquina-de-guerra-3b",
   "cat": 3,
   "variante": "B",
   "nome": "Fortaleza Ambulante",
   "nivel": 90,
   "tipo": "Mecânica",
   "frase": "Agora sou eu quem bloqueia o caminho.",
   "texto": [
    "Ativar, 25% do KP, uma vez por combate. Você ganha um escudo de HP temporário igual a 20% do seu HP máximo, que absorve dano antes do HP. Enquanto o escudo existir, inimigos ao seu lado têm −2 para atacar qualquer outro aliado que não seja você."
   ],
   "uso": {
    "kp": 0.25,
    "vezes": 1
   }
  }
 ],
 "Invocador": [
  {
   "id": "invocador-dragao",
   "cat": 0,
   "variante": "",
   "nome": "Rugir do Dragão",
   "nivel": 20,
   "tipo": "Mecânica",
   "frase": "",
   "texto": [
    "Solte a Linha de Montagem sem gastar KP e sem gastar ação. Os robôs entram com o dobro do HP, e o primeiro ataque de cada um soma seu máximo de PD ao teste e à rolagem de dano."
   ],
   "dragao": true,
   "custoPd": 1
  },
  {
   "id": "invocador-1a",
   "cat": 1,
   "variante": "A",
   "nome": "Assistente Mecânico",
   "nivel": 30,
   "tipo": "Híbrida",
   "frase": "Giru! Giru!",
   "texto": [
    "Você constrói um pequeno robô companheiro. Ele tem 10% do seu HP máximo, não ataca e, se for destruído, você o reconstrói no próximo descanso.",
    "• Mecânica: uma vez por rodada, o assistente dá +2 no próximo teste de um aliado que esteja perto dele.",
    "• Narrativa: ele analisa coisas, traduz idiomas, lê sinais e guarda até 3 itens pequenos."
   ]
  },
  {
   "id": "invocador-2a",
   "cat": 2,
   "variante": "A",
   "nome": "Linha de Montagem",
   "nivel": 60,
   "tipo": "Mecânica",
   "frase": "Unidades 1 e 2: ataquem.",
   "texto": [
    "Gaste 10% do KP por robô para soltar até 2 robôs de combate. Cada um tem:",
    "• 10% do seu HP máximo e o seu Corpo Base − 2;",
    "• um ataque de 1d6 + Mente, com metade do seu multiplicador de dano físico;",
    "• ação no seu turno, logo depois de você.",
    "Eles duram até serem destruídos ou o combate acabar."
   ],
   "uso": {
    "kp": 0.1
   }
  },
  {
   "id": "invocador-3a",
   "cat": 3,
   "variante": "A",
   "nome": "Obra-Prima",
   "nivel": 90,
   "tipo": "Híbrida",
   "frase": "Meu maior trabalho. Melhor que eu.",
   "texto": [
    "Uma vez por arco, você termina uma criação de verdade, um androide com vontade própria. Ele entra em combate com 40% do seu HP máximo, o seu Corpo Base e uma cópia de uma técnica sua, e joga no próprio turno. Fica até o fim do arco.",
    "• Narrativa: ele tem personalidade e o mestre interpreta. Ele pode discordar de você, como o 17 e a 18 fizeram com o Gero."
   ]
  },
  {
   "id": "invocador-3b",
   "cat": 3,
   "variante": "B",
   "nome": "Absorção de Peças",
   "nivel": 90,
   "tipo": "Mecânica",
   "frase": "Vocês foram construídos para isso.",
   "texto": [
    "No seu turno, absorva um robô seu que esteja em campo (da Linha de Montagem ou o Assistente). Você recupera 25% do HP e ganha Precisão Grau II (+2 nos testes de ataque) por 2 rodadas. O robô absorvido some."
   ],
   "uso": {
    "hp": 0.25,
    "efeitos": [
     {
      "ef": "precisao",
      "grau": 2,
      "rod": 2,
      "em": "si"
     }
    ]
   }
  }
 ],
 "Mago": [
  {
   "id": "mago-dragao",
   "cat": 0,
   "variante": "",
   "nome": "Rugir do Dragão",
   "nivel": 20,
   "tipo": "Mecânica",
   "frase": "",
   "texto": [
    "A próxima técnica de ki não gasta KP, soma seu máximo de PD ao teste de ataque e o dobro dele à rolagem de dano, e o alvo tem −(máximo de PD ÷ 2) para reagir."
   ],
   "dragao": true,
   "custoPd": 1
  },
  {
   "id": "mago-1a",
   "cat": 1,
   "variante": "A",
   "nome": "Canalização Arcana",
   "nivel": 30,
   "tipo": "Mecânica",
   "frase": "Ka... me... ha... me...",
   "texto": [
    "Ao usar uma técnica de ki, você pode gastar 1 ação a mais para carregá-la: ela ganha +1 dado igual ao maior dado da técnica. Dá para carregar com até 2 ações (+2 dados), mas se você sofrer dano antes de soltar, faz um teste de Concentração contra RD 15; se falhar, perde a carga."
   ]
  },
  {
   "id": "mago-1b",
   "cat": 1,
   "variante": "B",
   "nome": "Vidro e Fogo",
   "nivel": 30,
   "tipo": "Mecânica",
   "frase": "Se ninguém me acertar, ninguém sobra.",
   "texto": [
    "Passivo: seu multiplicador de dano de Ki fica ×1,15, e seu HP máximo fica −10%."
   ],
   "numeros": {
    "pctKi": 0.15,
    "pctHp": -0.1
   }
  },
  {
   "id": "mago-2a",
   "cat": 2,
   "variante": "A",
   "nome": "Explosão em Cadeia",
   "nivel": 60,
   "tipo": "Mecânica",
   "frase": "Um alvo só é desperdício.",
   "texto": [
    "Quando uma técnica de ki sua acerta, outra criatura perto do alvo (à sua escolha) sofre metade do dano, sem teste de ataque. Ela ainda pode reagir com Esquiva. Uma vez por turno."
   ]
  },
  {
   "id": "mago-2b",
   "cat": 2,
   "variante": "B",
   "nome": "Transmutação Arcana",
   "nivel": 60,
   "tipo": "Híbrida",
   "frase": "Pedra, doce ou cinza. Escolha.",
   "texto": [
    "• Mecânica: uma vez por combate, gaste 1 ação e 20% do KP. O alvo faz um teste de Resistência contra sua RD de habilidade (Espírito). Se falhar, vira um objeto (doce, pedra, o que você quiser): Paralisia Grau II por 2 rodadas.",
    "• Narrativa: criaturas fracas, bem abaixo do seu Power Level, podem ficar assim para sempre, se o mestre deixar."
   ],
   "uso": {
    "kp": 0.2,
    "vezes": 1,
    "efeitos": [
     {
      "ef": "paralisia",
      "grau": 2,
      "rod": 2,
      "em": "outro"
     }
    ]
   }
  },
  {
   "id": "mago-3a",
   "cat": 3,
   "variante": "A",
   "nome": "Destruidor de Planetas",
   "nivel": 90,
   "tipo": "Híbrida",
   "frase": "Este planeta não merece existir.",
   "texto": [
    "• Mecânica: uma vez por combate, gaste 2 ações e reforce a próxima técnica de ki: ela custa o triplo de KP e atinge todos os inimigos do combate, com dano final ×2. Os alvos só podem evitar com Esquiva. Depois, você fica com Atordoamento Grau I por 1 rodada, sem teste.",
    "• Narrativa: fora do combate, com tempo para carregar, um ataque assim pode destruir uma cidade ou até um planeta. O mestre decide o que é possível e o preço disso na história."
   ],
   "uso": {
    "reforco": {
     "tipo": "ki",
     "pct": 2.0,
     "texto": "ela atinge todos os inimigos com dano final ×2 (só Esquiva evita); depois você fica com Atordoamento Grau I por 1 rodada"
    },
    "vezes": 1
   }
  },
  {
   "id": "mago-3b",
   "cat": 3,
   "variante": "B",
   "nome": "Feitiço Proibido",
   "nivel": 90,
   "tipo": "Mecânica",
   "frase": "Meu corpo é o combustível.",
   "texto": [
    "Uma vez por combate, por 3 rodadas, suas técnicas de ki ganham +2 dados iguais ao maior dado e não gastam KP. Em troca, cada técnica usada custa 10% do seu HP máximo. Se o HP chegar a 0, você cai na hora."
   ]
  }
 ],
 "Místico": [
  {
   "id": "mistico-dragao",
   "cat": 0,
   "variante": "",
   "nome": "Rugir do Dragão",
   "nivel": 20,
   "tipo": "Mecânica",
   "frase": "",
   "texto": [
    "Drene ki de um inimigo perto: ele perde 3% do KP máximo para cada ponto do seu máximo de PD, e você recupera o mesmo em porcentagem do seu KP. Até o fim do próximo turno dele, ele tem −(máximo de PD ÷ 2) em todos os testes."
   ],
   "dragao": true,
   "custoPd": 1
  },
  {
   "id": "mistico-1a",
   "cat": 1,
   "variante": "A",
   "nome": "Pele de Ki",
   "nivel": 30,
   "tipo": "Mecânica",
   "frase": "Meu ki é minha armadura.",
   "texto": [
    "Gaste 10% do KP (sem gastar ação) para cobrir o corpo de ki até o fim do combate. Enquanto durar, seu Bloqueio usa Espírito em vez de Resistência e ganha +2."
   ],
   "uso": {
    "kp": 0.1,
    "vezes": 1
   }
  },
  {
   "id": "mistico-1b",
   "cat": 1,
   "variante": "B",
   "nome": "Comunhão com a Natureza",
   "nivel": 30,
   "tipo": "Híbrida",
   "frase": "As árvores me contaram que você vinha.",
   "texto": [
    "• Mecânica: em lugares com natureza viva (floresta, campo, mar), você recupera 5% do KP máximo no começo de cada turno seu.",
    "• Narrativa: você conversa com animais e plantas e sente o ki de todo ser vivo numa área grande, até de quem esconde o próprio ki."
   ]
  },
  {
   "id": "mistico-2a",
   "cat": 2,
   "variante": "A",
   "nome": "Drenar Ki",
   "nivel": 60,
   "tipo": "Mecânica",
   "frase": "Obrigado pela energia.",
   "texto": [
    "Gaste 1 ação e toque um alvo (precisa acertar um teste de ataque). Ele faz um teste de Resistência contra sua RD de habilidade (Espírito). Se falhar, perde 15% do KP máximo dele, e você recupera o mesmo valor em porcentagem do seu KP. Ele ainda fica com Drenagem de Ki Grau I por 2 rodadas. 2 vezes por combate."
   ],
   "uso": {
    "vezes": 2,
    "efeitos": [
     {
      "ef": "drenagem",
      "grau": 1,
      "rod": 2,
      "em": "outro"
     }
    ]
   }
  },
  {
   "id": "mistico-2b",
   "cat": 2,
   "variante": "B",
   "nome": "Selar Ki",
   "nivel": 60,
   "tipo": "Mecânica",
   "frase": "Seus canais de ki estão fechados.",
   "texto": [
    "Quando uma técnica física sua acertar, o alvo faz um teste de Resistência contra sua RD de habilidade (Espírito). Se falhar, fica com Selamento de Ki Grau I (Grau II a partir do nível 90) até o fim do próximo turno dele: não pode usar técnicas de ki. 2 vezes por combate."
   ],
   "uso": {
    "vezes": 2,
    "efeitos": [
     {
      "ef": "selamento",
      "grau": 1,
      "rod": 1,
      "em": "outro"
     }
    ]
   }
  },
  {
   "id": "mistico-3a",
   "cat": 3,
   "variante": "A",
   "nome": "Raízes Famintas",
   "nivel": 90,
   "tipo": "Híbrida",
   "frase": "A terra também tem fome.",
   "texto": [
    "• Mecânica: uma vez por combate, gaste 1 ação e 30% do KP. Raízes e vinhas cheias de ki brotam do chão embaixo de todos os inimigos perto de você. Cada um faz um teste de Força contra sua RD de habilidade (Espírito). Quem falhar fica preso por 2 rodadas: não se move, tem −2 de Corpo Base e perde 5% do KP máximo no começo de cada turno, que você recupera em porcentagem do seu KP.",
    "• Narrativa: funciona até em lugares sem plantas: o seu ki faz a vida brotar onde não havia, e o lugar continua verde depois da luta."
   ],
   "uso": {
    "kp": 0.3,
    "vezes": 1
   }
  },
  {
   "id": "mistico-3b",
   "cat": 3,
   "variante": "B",
   "nome": "Corpo Astral",
   "nivel": 90,
   "tipo": "Mecânica",
   "frase": "Pode bater. Não tem carne aqui para machucar.",
   "texto": [
    "Uma vez por combate, gaste 30% do KP (sem gastar ação). Por 3 rodadas, seu corpo vira ki concentrado:",
    "• golpes de técnicas físicas contra você causam metade do dano;",
    "• você tem Imunidade a Paralisia, Concussão e Sangramento de todos os graus;",
    "• suas técnicas físicas somam também o seu Espírito à rolagem de dano.",
    "Técnicas de ki contra você continuam causando dano normal: o ki do inimigo atravessa o seu."
   ],
   "uso": {
    "kp": 0.3,
    "vezes": 1
   }
  }
 ],
 "Pesquisador": [
  {
   "id": "pesquisador-dragao",
   "cat": 0,
   "variante": "",
   "nome": "Rugir do Dragão",
   "nivel": 20,
   "tipo": "Mecânica",
   "frase": "",
   "texto": [
    "Analise um inimigo: até o fim do combate, você e os aliados somam metade do seu máximo de PD aos testes de ataque e às rolagens de dano contra ele. Na primeira rodada depois da análise, ele tem −(máximo de PD ÷ 2) para reagir aos ataques do grupo."
   ],
   "dragao": true,
   "custoPd": 1
  },
  {
   "id": "pesquisador-1a",
   "cat": 1,
   "variante": "A",
   "nome": "Técnicas Otimizadas",
   "nivel": 30,
   "tipo": "Mecânica",
   "frase": "Mesma técnica, metade do esforço. Quase.",
   "texto": [
    "As técnicas que você cria custam 20% menos TP. O desconto vale a partir de quando você aprende esta habilidade, sem devolver TP de técnicas antigas."
   ]
  },
  {
   "id": "pesquisador-1b",
   "cat": 1,
   "variante": "B",
   "nome": "Análise de Ki",
   "nivel": 30,
   "tipo": "Híbrida",
   "frase": "Interessante... muito interessante.",
   "texto": [
    "• Mecânica: gaste 1 ação observando um alvo: você descobre o HP, o KP e o Power Level real dele, e o mestre te conta uma fraqueza ou resistência.",
    "• Narrativa: você identifica de onde vem um ki (raça, técnica, objeto mágico) e reconhece técnicas que já estudou."
   ]
  },
  {
   "id": "pesquisador-2a",
   "cat": 2,
   "variante": "A",
   "nome": "Solução Impossível",
   "nivel": 60,
   "tipo": "Híbrida",
   "frase": "Ninguém resolveu porque ninguém tentou direito.",
   "texto": [
    "Uma vez por sessão, depois de um descanso dedicado à pesquisa, você cria a solução para um problema que o mestre aceite. Exemplos:",
    "• um antídoto para um veneno ou doença;",
    "• uma contramedida para uma técnica inimiga específica: ela passa a ter −4 no teste de ataque contra o grupo pelo resto do arco;",
    "• um aparelho simples que resolve uma situação da história."
   ]
  },
  {
   "id": "pesquisador-2b",
   "cat": 2,
   "variante": "B",
   "nome": "Engenharia Reversa",
   "nivel": 60,
   "tipo": "Mecânica",
   "frase": "Vi uma vez. Já entendi como funciona.",
   "texto": [
    "Depois de ver uma técnica ser usada (ou sofrer ela), você pode aprendê-la pagando metade do TP que ela custaria. Você só pode ter uma técnica aprendida assim por arco."
   ]
  },
  {
   "id": "pesquisador-3a",
   "cat": 3,
   "variante": "A",
   "nome": "Teoria Unificada do Ki",
   "nivel": 90,
   "tipo": "Mecânica",
   "frase": "O ki tem regras. Eu descobri todas.",
   "texto": [
    "Você ganha +2 espaços de técnica aprendida, e cada uso das suas técnicas conta em dobro para subir de maestria."
   ],
   "numeros": {
    "espacoTec": 2
   }
  },
  {
   "id": "pesquisador-3b",
   "cat": 3,
   "variante": "B",
   "nome": "Experimento Proibido",
   "nivel": 90,
   "tipo": "Híbrida",
   "frase": "Os riscos são aceitáveis. Para mim.",
   "texto": [
    "• Mecânica: uma vez por arco, você aplica um soro em você ou num aliado: por 3 rodadas, ele ganha os bônus da primeira transformação da raça dele, mesmo sem tê-la desbloqueado. Quando acaba, ele fica com Atordoamento Grau I por 1 rodada, sem teste.",
    "• Narrativa: se a transformação ainda não existe no sistema, o mestre define um bônus equivalente."
   ]
  }
 ],
 "Flex": [
  {
   "id": "flex-dragao",
   "cat": 0,
   "variante": "",
   "nome": "Rugir do Dragão",
   "nivel": 20,
   "tipo": "Mecânica",
   "frase": "",
   "texto": [
    "A próxima técnica conta como física e de ki ao mesmo tempo: usa o maior multiplicador e soma seu máximo de PD ao teste de ataque e à rolagem de dano. O alvo só pode reagir com Esquiva."
   ],
   "dragao": true,
   "custoPd": 1
  },
  {
   "id": "flex-1a",
   "cat": 1,
   "variante": "A",
   "nome": "Punho de Ki",
   "nivel": 30,
   "tipo": "Mecânica",
   "frase": "Força ou ki? Os dois.",
   "texto": [
    "Em qualquer técnica, física ou de ki, você usa o maior modificador entre Força e Espírito no dano e no teste de ataque."
   ]
  },
  {
   "id": "flex-1b",
   "cat": 1,
   "variante": "B",
   "nome": "Corpo e Mente",
   "nivel": 30,
   "tipo": "Mecânica",
   "frase": "Um soco, uma rajada, um soco...",
   "texto": [
    "Sempre que você usar uma técnica física, a próxima técnica de ki no mesmo turno ganha +2 no teste de ataque, e vice-versa. O bônus não acumula: alternar é o que conta."
   ]
  },
  {
   "id": "flex-2a",
   "cat": 2,
   "variante": "A",
   "nome": "Kiai",
   "nivel": 60,
   "tipo": "Mecânica (nova reação)",
   "frase": "HAAA!",
   "texto": [
    "Nova reação: um grito de ki que empurra o golpe. Faça um teste de Espírito contra o teste de ataque. Se passar, você ignora o dano e o atacante é jogado para trás: ele perde 1 ação no próximo turno dele. 2 vezes por combate."
   ],
   "uso": {
    "vezes": 2
   }
  },
  {
   "id": "flex-2b",
   "cat": 2,
   "variante": "B",
   "nome": "Aura Combativa",
   "nivel": 60,
   "tipo": "Mecânica",
   "frase": "Meus punhos têm ki. Meu ki tem punhos.",
   "texto": [
    "Gaste 15% do KP: por 3 rodadas, suas técnicas físicas somam também o Espírito ao dano, e as de ki somam também a Força. Uma vez por combate."
   ],
   "uso": {
    "kp": 0.15,
    "vezes": 1
   }
  },
  {
   "id": "flex-3a",
   "cat": 3,
   "variante": "A",
   "nome": "Equilíbrio Perfeito",
   "nivel": 90,
   "tipo": "Mecânica",
   "frase": "Corpo e espírito, ao mesmo tempo.",
   "texto": [
    "Uma vez por combate, gaste 30% do KP. Por 3 rodadas, uma vez por turno você usa uma técnica física e uma de ki com uma ação só, e ganha +2 de Corpo Base."
   ],
   "uso": {
    "kp": 0.3,
    "vezes": 1,
    "efeitos": [
     {
      "ef": "resiliencia",
      "grau": 2,
      "rod": 3,
      "em": "si"
     }
    ]
   }
  },
  {
   "id": "flex-3b",
   "cat": 3,
   "variante": "B",
   "nome": "Duas Posturas",
   "nivel": 90,
   "tipo": "Mecânica",
   "frase": "Corpo ou espírito? Depende de você.",
   "texto": [
    "Gaste 20% do KP uma vez por combate para entrar em postura. Até o fim do combate, você está sempre em uma das duas, e troca uma vez por turno sem gastar ação:",
    "• Corpo: Multiplicador físico ×1,3 e +2 em Bloqueio · Técnicas de ki com −2 no teste de ataque",
    "• Espírito: Multiplicador de Ki ×1,3 e +2 em Esquiva · Técnicas físicas com −2 no teste de ataque",
    "O segredo é ler o inimigo e trocar na hora certa."
   ],
   "uso": {
    "kp": 0.2,
    "vezes": 1
   }
  }
 ],
 "Salvador": [
  {
   "id": "salvador-dragao",
   "cat": 0,
   "variante": "",
   "nome": "Rugir do Dragão",
   "nivel": 20,
   "tipo": "Mecânica",
   "frase": "",
   "texto": [
    "Sem gastar ação, cure até 2 aliados em 5% do HP máximo deles para cada ponto do seu máximo de PD (50% com 10) e tire todas as penalidades deles. Eles ganham +(máximo de PD ÷ 2) de Corpo Base até o próximo turno deles."
   ],
   "dragao": true,
   "custoPd": 1
  },
  {
   "id": "salvador-1a",
   "cat": 1,
   "variante": "A",
   "nome": "Mãos de Dende",
   "nivel": 30,
   "tipo": "Mecânica",
   "frase": "Fica parado. Já vai passar.",
   "texto": [
    "A rajada da Medicina Aplicada passa a curar até 2 aliados com uma ação só. Um deles, à sua escolha, também recebe Purificação Grau II (perde uma penalidade de Grau I ou II: Envenenamento, Sangramento, Queimadura...)."
   ]
  },
  {
   "id": "salvador-1b",
   "cat": 1,
   "variante": "B",
   "nome": "Horta dos Deuses",
   "nivel": 30,
   "tipo": "Híbrida",
   "frase": "Coma uma. Só uma!",
   "texto": [
    "• Mecânica: no começo de cada sessão, você colhe 2 Sementes dos Deuses. Comer uma gasta 1 ação e recupera 30% do HP e 30% do KP. Você pode dar sementes para aliados; as que sobrarem estragam no fim da sessão.",
    "• Narrativa: você cuida de uma horta especial e conhece plantas medicinais de vários planetas."
   ]
  },
  {
   "id": "salvador-2a",
   "cat": 2,
   "variante": "A",
   "nome": "Barreira Restauradora",
   "nivel": 60,
   "tipo": "Mecânica (nova reação)",
   "frase": "Atrás de mim!",
   "texto": [
    "Nova reação, 3 vezes por combate. Quando um aliado perto de você for atacado, gaste 10% do KP e faça um teste de Espírito contra o teste de ataque. Se passar, uma barreira de ki para o golpe e o aliado não sofre nada. Quem perde a ação do próximo turno é você, não o aliado."
   ],
   "uso": {
    "kp": 0.1,
    "vezes": 3
   }
  },
  {
   "id": "salvador-2b",
   "cat": 2,
   "variante": "B",
   "nome": "Aura Revigorante",
   "nivel": 60,
   "tipo": "Mecânica",
   "frase": "Respira. Sente a energia voltando?",
   "texto": [
    "Gaste 1 ação e 15% do KP: por 3 rodadas, até 3 aliados recuperam 5% do HP máximo no começo de cada turno deles. Uma vez por combate."
   ],
   "uso": {
    "kp": 0.15,
    "vezes": 1,
    "efeitos": [
     {
      "ef": "regeneracao",
      "grau": 3,
      "rod": 3,
      "em": "outro"
     }
    ]
   }
  },
  {
   "id": "salvador-3a",
   "cat": 3,
   "variante": "A",
   "nome": "Segunda Chance",
   "nivel": 90,
   "tipo": "Híbrida",
   "frase": "Hoje ninguém morre.",
   "texto": [
    "• Mecânica: uma vez por arco, quando um aliado cairia a 0 HP, ele fica de pé com 50% do HP. Não gasta ação nem reação: basta você estar no mesmo combate.",
    "• Narrativa: fora de combate, você estabiliza qualquer ferido que ainda esteja vivo, por pior que seja o estado dele."
   ]
  },
  {
   "id": "salvador-3b",
   "cat": 3,
   "variante": "B",
   "nome": "Santuário",
   "nivel": 90,
   "tipo": "Mecânica",
   "frase": "Aqui dentro, vocês estão seguros.",
   "texto": [
    "Gaste 1 ação e 30% do KP, uma vez por combate. Por 3 rodadas, uma cúpula de ki cobre você e os aliados perto. Quem está dentro tem Regeneração Grau III (5% do HP máximo no começo de cada turno), Imunidade a todas as penalidades até o Grau II e Resiliência Grau I (+1 de Corpo Base)."
   ],
   "uso": {
    "kp": 0.3,
    "vezes": 1,
    "efeitos": [
     {
      "ef": "resiliencia",
      "grau": 1,
      "rod": 3,
      "em": "si"
     },
     {
      "ef": "regeneracao",
      "grau": 3,
      "rod": 3,
      "em": "si"
     }
    ]
   }
  }
 ],
 "Instrumentista": [
  {
   "id": "instrumentista-dragao",
   "cat": 0,
   "variante": "",
   "nome": "Rugir do Dragão",
   "nivel": 20,
   "tipo": "Mecânica",
   "frase": "",
   "texto": [
    "Sem gastar ação, toque uma melodia ou canção que afeta todos os alvos do combate. Sua RD de habilidade soma seu máximo de PD contra ela."
   ],
   "dragao": true,
   "custoPd": 1
  },
  {
   "id": "instrumentista-1a",
   "cat": 1,
   "variante": "A",
   "nome": "Instrumento de Ki",
   "nivel": 30,
   "tipo": "Híbrida",
   "frase": "Ouçam bem. Ou não.",
   "texto": [
    "Gaste 1 ação e 10% do KP para criar um instrumento de ki (flauta, violino, tambor... você escolhe). Ele dura o combate. Tocar gasta 1 ação e você escolhe a melodia:",
    "• Refrescante: aliados perto ganham +1 em todos os testes até o seu próximo turno.",
    "• Horrorosa: inimigos perto fazem um teste de Mente contra sua RD de habilidade (Concentração). Quem falhar fica com Concussão Grau I até o seu próximo turno.",
    "• Narrativa: fora de combate, sua música acalma, anima ou irrita qualquer plateia."
   ],
   "uso": {
    "kp": 0.1,
    "vezes": 1
   }
  },
  {
   "id": "instrumentista-1b",
   "cat": 1,
   "variante": "B",
   "nome": "Rajada Sonora",
   "nivel": 30,
   "tipo": "Mecânica",
   "frase": "Som não se bloqueia.",
   "texto": [
    "Você ganha uma técnica de dano de ki que não ocupa espaço: 2d6 + Concentração, com o multiplicador de Ki, que acerta até 2 alvos com um teste de ataque só. Como é som, os alvos não podem usar Bloqueio contra ela, só Esquiva ou Contra-ataque. Se um dos alvos for aliado, ele recupera metade do valor em vez de sofrer dano."
   ]
  },
  {
   "id": "instrumentista-2a",
   "cat": 2,
   "variante": "A",
   "nome": "Canção de Ninar",
   "nivel": 60,
   "tipo": "Híbrida",
   "frase": "Dorme... dorme...",
   "texto": [
    "• Mecânica: 2 vezes por combate, gaste 1 ação e 15% do KP. Um inimigo faz um teste de Mente contra sua RD de habilidade (Concentração). Se falhar, cai no sono: Sono Grau I por 1 rodada (acorda com qualquer dano).",
    "• Narrativa: fora de combate, você faz guardas, animais e pessoas comuns dormirem."
   ],
   "uso": {
    "kp": 0.15,
    "vezes": 2,
    "efeitos": [
     {
      "ef": "sono",
      "grau": 1,
      "rod": 1,
      "em": "outro"
     }
    ]
   }
  },
  {
   "id": "instrumentista-2b",
   "cat": 2,
   "variante": "B",
   "nome": "Ritmo de Batalha",
   "nivel": 60,
   "tipo": "Mecânica",
   "frase": "Sigam a batida!",
   "texto": [
    "Uma vez por combate, gaste 1 ação e 20% do KP: até 3 aliados que ouçam você ganham +1 ação no próximo turno deles."
   ],
   "uso": {
    "kp": 0.2,
    "vezes": 1,
    "efeitos": [
     {
      "ef": "impeto",
      "grau": 3,
      "rod": 1,
      "em": "outro"
     }
    ]
   }
  },
  {
   "id": "instrumentista-3a",
   "cat": 3,
   "variante": "A",
   "nome": "Selo Melódico",
   "nivel": 90,
   "tipo": "Mecânica",
   "frase": "A mesma canção que prendeu o Hildegarn.",
   "texto": [
    "Uma vez por combate, gaste 1 ação e 30% do KP. Um inimigo faz um teste de Mente contra sua RD de habilidade (Concentração). Se falhar, fica selado: Paralisia Grau III e não se transforma. O selo dura enquanto você continuar tocando (1 ação por turno), até 3 rodadas. No fim de cada turno dele, o selado repete o teste para se soltar."
   ],
   "uso": {
    "kp": 0.3,
    "vezes": 1,
    "efeitos": [
     {
      "ef": "paralisia",
      "grau": 3,
      "rod": 3,
      "em": "outro"
     }
    ]
   }
  },
  {
   "id": "instrumentista-3b",
   "cat": 3,
   "variante": "B",
   "nome": "Sinfonia Final",
   "nivel": 90,
   "tipo": "Mecânica",
   "frase": "O último movimento. Todo mundo ouve.",
   "texto": [
    "Uma vez por combate, gaste 2 ações e 30% do KP. Todos os aliados no combate recuperam 25% do HP, e todos os inimigos sofrem 4d8 + Concentração com o multiplicador de Ki. Os inimigos só podem evitar com Esquiva."
   ],
   "uso": {
    "kp": 0.3,
    "vezes": 1
   }
  }
 ],
 "Divino": [
  {
   "id": "divino-dragao",
   "cat": 0,
   "variante": "",
   "nome": "Rugir do Dragão",
   "nivel": 20,
   "tipo": "Mecânica",
   "frase": "",
   "texto": [
    "Um ataque que acertou um protegido erra, e o protegido recupera 2% do HP máximo para cada ponto do seu máximo de PD. Na hora, você devolve um raio de luz que sempre acerta o atacante: (máximo de PD)d6 + Espírito, com o multiplicador de Ki."
   ],
   "dragao": true,
   "custoPd": 1
  },
  {
   "id": "divino-1a",
   "cat": 1,
   "variante": "A",
   "nome": "Benção",
   "nivel": 30,
   "tipo": "Híbrida",
   "frase": "Que os deuses olhem por você.",
   "texto": [
    "Gaste 1 ação e 5% do KP para abençoar um aliado até o fim do combate. Ele vira um protegido.",
    "• Mecânica: cada protegido ganha Resiliência Grau I (+1 de Corpo Base). Você ganha +1 em rolagens de dano de ki para cada protegido.",
    "• Narrativa: pessoas comuns te veem como alguém sagrado. Em vilas e templos, é fácil conseguir abrigo e ajuda."
   ],
   "uso": {
    "kp": 0.05,
    "efeitos": [
     {
      "ef": "resiliencia",
      "grau": 1,
      "rod": 9,
      "em": "outro"
     }
    ]
   }
  },
  {
   "id": "divino-2a",
   "cat": 2,
   "variante": "A",
   "nome": "Intervenção Divina",
   "nivel": 60,
   "tipo": "Mecânica (nova reação)",
   "frase": "Ninguém toca nos meus.",
   "texto": [
    "Nova reação. Quando um protegido for atacado, faça um teste de Espírito +1 por protegido contra o teste de ataque. Se passar, o golpe é desviado e ninguém sofre nada. Quem perde a ação do próximo turno é você."
   ]
  },
  {
   "id": "divino-2b",
   "cat": 2,
   "variante": "B",
   "nome": "Fortaleza da Fé",
   "nivel": 60,
   "tipo": "Mecânica",
   "frase": "Quanto mais gente acredita, mais forte eu fico.",
   "texto": [
    "Para cada protegido, seu multiplicador de dano de Ki sobe 5% e seu HP máximo sobe 5% (até o fim do combate). Se um protegido cair a 0 HP, você perde o bônus dele."
   ]
  },
  {
   "id": "divino-3a",
   "cat": 3,
   "variante": "A",
   "nome": "Milagre",
   "nivel": 90,
   "tipo": "Híbrida",
   "frase": "Peça. Mas peça com fé.",
   "texto": [
    "Uma vez por arco, você faz um milagre de verdade. Escolha um:",
    "• trazer de volta um aliado que caiu neste combate, com 50% do HP;",
    "• curar todo o HP e KP de todos os protegidos;",
    "• anular uma Morte Instantânea que acabou de acontecer;",
    "• um milagre narrativo, combinado com o mestre (abrir um caminho, acalmar uma tempestade, purificar um lugar)."
   ]
  },
  {
   "id": "divino-3b",
   "cat": 3,
   "variante": "B",
   "nome": "Avatar Divino",
   "nivel": 90,
   "tipo": "Mecânica",
   "frase": "Agora eu sou a resposta das preces deles.",
   "texto": [
    "Uma vez por combate, gaste 30% do KP (sem gastar ação). Por 3 rodadas, seu multiplicador de dano de Ki fica ×(1 + 0,1 por protegido), e todos os protegidos ficam imunes a penalidades."
   ],
   "uso": {
    "kp": 0.3,
    "vezes": 1
   }
  }
 ]
};
})();
