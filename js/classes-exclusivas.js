// Dragon Ball Omega — habilidades EXCLUSIVAS de classe (3 por classe), entre as genéricas e as de sub-classe.
// Fonte: capítulo 2.3 do guia. Para mudar um texto ou número, edite aqui.
//   Maestria 1: qualquer nível. Maestria 2 ("apelona"): só a partir do nível 100, aprendendo a habilidade de novo
//   (cada cópia ocupa 1 espaço de técnica de classe; a maestria 2 SUBSTITUI a 1, os números não somam).
//   m[i].texto: o que a maestria faz (o site mostra).
//   m[i].uso: o que o botão "Usar" faz: kp (fração do KP máximo gasta), hp (fração do HP máximo curada),
//     efeitos [{ ef, grau, rod, em }] (em: "si" = aplicado em você; "outro" = só avisa o que aplicar no alvo ou nos aliados),
//     purifica (Grau da Purificação em você), vezes (usos por combate) e reforco { tipo, pct, texto }: em vez de gastar KP
//     na hora, reforça a PRÓXIMA técnica do tipo (ela custa pct a mais de KP). Sem `uso`, a habilidade é passiva ou reação: só texto.
//   A Aura Serena é passiva: a Recarga de Ki dela corre sozinha no começo do turno em combate (js/efeitos-data.js).
(function () {
  var D = window.DBOData;
  var NOVAS = {
 "Guerreiro": [
  {
   "id": "golpe-esmagador",
   "nome": "Golpe Esmagador",
   "tipo": "Mecânica",
   "frase": "Quem se protege demais deixa de ver o golpe.",
   "m": [
    {
     "texto": "Ativar (não gasta ação, uma vez por turno). Reforça a próxima técnica física: ela custa 50% a mais de KP e, se acertar, aplica Quebra de Guarda Grau I por 1 rodada, sem teste de resistência.",
     "uso": {
      "reforco": {
       "tipo": "fisico",
       "pct": 0.5,
       "texto": "se acertar, o alvo fica com Quebra de Guarda Grau I por 1 rodada, sem teste"
      }
     }
    },
    {
     "texto": "Reforça a próxima técnica física: ela custa 75% a mais de KP, aplica Quebra de Guarda Grau III por 2 rodadas e ganha Crueldade Grau II (+2 no dano). Se o alvo já estava com Quebra de Guarda, o golpe também ignora todos os bônus de Corpo Base dele (Penetração Grau III).",
     "uso": {
      "reforco": {
       "tipo": "fisico",
       "pct": 0.75,
       "texto": "se acertar, Quebra de Guarda Grau III por 2 rodadas e +2 no dano (Crueldade Grau II); contra quem já tinha Quebra de Guarda, ignora os bônus de Corpo Base"
      }
     }
    }
   ]
  },
  {
   "id": "segundo-folego",
   "nome": "Segundo Fôlego",
   "tipo": "Mecânica",
   "frase": "Enquanto o coração bate, a luta continua.",
   "m": [
    {
     "texto": "1 ação, uma vez por combate. Recupera 10% do HP máximo e ganha Resiliência Grau I por 1 rodada.",
     "uso": {
      "hp": 0.1,
      "efeitos": [
       {
        "ef": "resiliencia",
        "grau": 1,
        "rod": 1,
        "em": "si"
       }
      ],
      "vezes": 1
     }
    },
    {
     "texto": "1 ação, uma vez por combate. Recupera 25% do HP máximo, ganha Resiliência Grau II por 2 rodadas e Purificação Grau II (encerra uma penalidade sua de Grau I ou II).",
     "uso": {
      "hp": 0.25,
      "efeitos": [
       {
        "ef": "resiliencia",
        "grau": 2,
        "rod": 2,
        "em": "si"
       }
      ],
      "purifica": 2,
      "vezes": 1
     }
    }
   ]
  },
  {
   "id": "escudo-de-carne",
   "nome": "Escudo de Carne",
   "tipo": "Mecânica",
   "frase": "Ninguém cai enquanto eu estiver de pé.",
   "m": [
    {
     "texto": "Reação, uma vez por combate. Quando um aliado perto de você é atacado, você assume o ataque no lugar dele: o teste de ataque passa a valer contra você, e você reage normalmente (a reação que você usar para se defender custa como qualquer outra). Você ganha +1 em Bloqueio contra esse ataque."
    },
    {
     "texto": "Reação, até duas vezes por combate. Assumir o ataque não custa ação (a reação de defesa custa normal). Contra o ataque assumido, você tem Postura de Ferro Grau III: um Bloqueio que falha ainda corta o dano pela metade, e você ganha +2 em Bloqueio."
    }
   ]
  }
 ],
 "Monge": [
  {
   "id": "aura-serena",
   "nome": "Aura Serena",
   "tipo": "Mecânica",
   "frase": "A calma é o primeiro golpe.",
   "m": [
    {
     "texto": "Passiva. Em combate, você tem Recarga de Ki Grau I o tempo todo: recupera 3% do KP máximo no começo de cada turno seu."
    },
    {
     "texto": "Passiva. Recarga de Ki Grau III (5% do KP máximo por turno) e Determinação Grau II (+2 nos seus testes de resistência contra penalidades)."
    }
   ]
  },
  {
   "id": "palma-desviadora",
   "nome": "Palma Desviadora",
   "tipo": "Mecânica",
   "frase": "A força do inimigo é só um presente.",
   "m": [
    {
     "texto": "+2 nos testes de Aparar (reação do capítulo 4). Quando você apara com sucesso, recupera 5% do KP máximo."
    },
    {
     "texto": "+4 nos testes de Aparar. Quando apara com sucesso, devolve o dano +25% e recupera 10% do KP máximo. Uma vez por rodada, Aparar não custa ação do seu próximo turno."
    }
   ]
  },
  {
   "id": "onda-expansiva",
   "nome": "Onda Expansiva",
   "tipo": "Mecânica",
   "frase": "Um só sopro, vários alvos.",
   "m": [
    {
     "texto": "Ativar (não gasta ação, uma vez por combate). Reforça a próxima técnica de ki: ela custa 60% a mais de KP e também atinge um segundo alvo perto do primeiro, que recebe 50% do dano. A rolagem é uma só.",
     "uso": {
      "reforco": {
       "tipo": "ki",
       "pct": 0.6,
       "texto": "ela também atinge um segundo alvo perto do primeiro, com 50% do dano (rolagem única)"
      },
      "vezes": 1
     }
    },
    {
     "texto": "Até duas vezes por combate. Reforça a próxima técnica de ki: ela custa o dobro de KP e atinge até dois alvos extras: o segundo recebe 100% do dano e o terceiro, 50%. A rolagem é uma só.",
     "uso": {
      "reforco": {
       "tipo": "ki",
       "pct": 1.0,
       "texto": "ela atinge até dois alvos extras: o segundo com 100% do dano e o terceiro com 50% (rolagem única)"
      },
      "vezes": 2
     }
    }
   ]
  }
 ],
 "Artífice": [
  {
   "id": "escudo-portatil",
   "nome": "Escudo Portátil",
   "tipo": "Mecânica",
   "frase": "Toda boa luta começa com um bom escudo.",
   "m": [
    {
     "texto": "1 ação, 10% do KP, uma vez por combate. Você ou um aliado perto ganha Barreira Grau I (absorve até 10% do HP máximo de quem a recebe) por 2 rodadas.",
     "uso": {
      "kp": 0.1,
      "efeitos": [
       {
        "ef": "barreira",
        "grau": 1,
        "rod": 2,
        "em": "outro"
       }
      ],
      "vezes": 1
     }
    },
    {
     "texto": "1 ação, 10% do KP, até duas vezes por combate. Até dois alvos ganham Barreira Grau III (absorve até 15% do HP máximo de cada um) por 3 rodadas.",
     "uso": {
      "kp": 0.1,
      "efeitos": [
       {
        "ef": "barreira",
        "grau": 3,
        "rod": 3,
        "em": "outro"
       }
      ],
      "vezes": 2
     }
    }
   ]
  },
  {
   "id": "ponto-fraco",
   "nome": "Ponto Fraco",
   "tipo": "Mecânica",
   "frase": "Todo material tem um ponto de ruptura.",
   "m": [
    {
     "texto": "1 ação, 10% do KP, uma vez por alvo em cada combate. Escaneia um alvo à vista: ele recebe Vulnerabilidade Grau I (ki ou físico, à sua escolha) por 1 rodada, sem teste de resistência, e você vê o HP atual dele.",
     "uso": {
      "kp": 0.1,
      "efeitos": [
       {
        "ef": "vulnerabilidade",
        "grau": 1,
        "rod": 1,
        "em": "outro"
       }
      ]
     }
    },
    {
     "texto": "1 ação, 15% do KP, uma vez por rodada. Vulnerabilidade Grau III (+25% de dano recebido) por 2 rodadas, sem teste. Você vê o HP e o KP atuais do alvo e as penalidades que ele tem.",
     "uso": {
      "kp": 0.15,
      "efeitos": [
       {
        "ef": "vulnerabilidade",
        "grau": 3,
        "rod": 2,
        "em": "outro"
       }
      ]
     }
    }
   ]
  },
  {
   "id": "contramedida",
   "nome": "Contramedida",
   "tipo": "Mecânica",
   "frase": "Eu já previ isso.",
   "m": [
    {
     "texto": "Reação, uma vez por combate. Quando você ou um aliado perto receberia uma penalidade de Grau I, o seu gadget a anula antes do teste de resistência."
    },
    {
     "texto": "Reação, até duas vezes por combate, e a primeira de cada rodada não custa ação. Anula penalidades de Grau I ou II, e quem foi protegido ganha Imunidade a essa penalidade (Grau II) até o fim do combate."
    }
   ]
  }
 ],
 "Suporte": [
  {
   "id": "aura-curativa",
   "nome": "Aura Curativa",
   "tipo": "Mecânica",
   "frase": "O calor das mãos que não deixam ninguém para trás.",
   "m": [
    {
     "texto": "1 ação, 10% do KP. Um aliado perto ganha Regeneração Grau I (3% do HP máximo por turno) por 3 rodadas.",
     "uso": {
      "kp": 0.1,
      "efeitos": [
       {
        "ef": "regeneracao",
        "grau": 1,
        "rod": 3,
        "em": "outro"
       }
      ]
     }
    },
    {
     "texto": "1 ação, 15% do KP. Todos os aliados perto ganham Regeneração Grau III (5% do HP máximo por turno) por 3 rodadas.",
     "uso": {
      "kp": 0.15,
      "efeitos": [
       {
        "ef": "regeneracao",
        "grau": 3,
        "rod": 3,
        "em": "outro"
       }
      ]
     }
    }
   ]
  },
  {
   "id": "palavras-de-animo",
   "nome": "Palavras de Ânimo",
   "tipo": "Mecânica",
   "frase": "Levanta! A gente ainda não perdeu.",
   "m": [
    {
     "texto": "1 ação, 15% do KP, uma vez por combate. Os aliados perto ganham Inspiração Grau I (+1 nos testes de ataque) por 2 rodadas. Você não recebe o bônus.",
     "uso": {
      "kp": 0.15,
      "efeitos": [
       {
        "ef": "inspiracao",
        "grau": 1,
        "rod": 2,
        "em": "outro"
       }
      ],
      "vezes": 1
     }
    },
    {
     "texto": "1 ação, 15% do KP, uma vez por combate. Os aliados perto ganham Inspiração Grau III (+1 em todos os testes e +1 de Corpo Base) e Determinação Grau II por 3 rodadas.",
     "uso": {
      "kp": 0.15,
      "efeitos": [
       {
        "ef": "inspiracao",
        "grau": 3,
        "rod": 3,
        "em": "outro"
       },
       {
        "ef": "determinacao",
        "grau": 2,
        "rod": 3,
        "em": "outro"
       }
      ],
      "vezes": 1
     }
    }
   ]
  },
  {
   "id": "voto-de-protecao",
   "nome": "Voto de Proteção",
   "tipo": "Mecânica",
   "frase": "Enquanto eu respirar, você não cai.",
   "m": [
    {
     "texto": "1 ação, 20% do KP, uma vez por combate. Um aliado perto ganha Segunda Chance Grau I (se cair a 0 HP, fica com 1 HP) por 3 rodadas.",
     "uso": {
      "kp": 0.2,
      "efeitos": [
       {
        "ef": "segunda",
        "grau": 1,
        "rod": 3,
        "em": "outro"
       }
      ],
      "vezes": 1
     }
    },
    {
     "texto": "1 ação, 20% do KP, uma vez por combate. Dois aliados ganham Segunda Chance Grau III (se caírem a 0 HP, ficam com 10% do HP máximo) por 3 rodadas.",
     "uso": {
      "kp": 0.2,
      "efeitos": [
       {
        "ef": "segunda",
        "grau": 3,
        "rod": 3,
        "em": "outro"
       }
      ],
      "vezes": 1
     }
    }
   ]
  }
 ]
};
  Object.keys(NOVAS).forEach(function (classe) {
    D.CLASS_ABILITIES[classe] = D.CLASS_ABILITIES[classe] || [];
    NOVAS[classe].forEach(function (d) {
      d.exclusiva = true; d.max = 2; d.nivel2 = 100;
      d.descricao = "“" + d.frase + "”";
      D.CLASS_ABILITIES[classe].push(d);
    });
  });
})();
