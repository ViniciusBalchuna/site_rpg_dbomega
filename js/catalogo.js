// Dragon Ball Omega — CATÁLOGO DE TÉCNICAS E EQUIPAMENTOS PRONTOS (um só lugar para mexer)
//
// Aparecem na ficha, em "Aprender técnica já existente" e "Pegar equipamento já existente".
//   >>> Os itens abaixo são EXEMPLOS: troque, apague ou acrescente à vontade. <<<
//
// Técnica:  { id, nome, descricao, qtd (o custo em TP sai dos dados: DBORules.custoTecnica), dado, mod, fixo, tipo: "fisico"|"ki", pl, efeitos, extras }
//   dado: d4 d6 d8 d10 d12 d20 | mod: atributo ("forca", "espirito"...) ou ""
//   efeitos: Paralisia, Atordoamento, Envenenamento, Sangramento, Concussão, Queimadura, Morte Instantânea
//   extras: [{ qtd, dado, quando: "sempre" | "situacional", condicao }]
// Equipamento: { id, nome, descricao, habilidade: null | { nome, descricao, qtd, dado, mod, fixo, tipo, efeitos, extras } }
window.DBOCatalog = {
  TECNICAS: [
    { id: "cat-rajada", nome: "Rajada de Ki", descricao: "Uma saraivada de pequenas esferas de energia.", qtd: 2, dado: "d4", mod: "espirito", fixo: 0, tipo: "ki", efeitos: [], extras: [] },
    { id: "cat-chute", nome: "Chute Giratório", descricao: "Um chute em giro que acerta quem estiver perto.", qtd: 1, dado: "d8", mod: "forca", fixo: 0, tipo: "fisico", efeitos: [], extras: [] },
    { id: "cat-golpe", nome: "Golpe Pesado", descricao: "Um golpe lento, mas que quebra a guarda.", qtd: 1, dado: "d10", mod: "forca", fixo: 0, tipo: "fisico", efeitos: ["Atordoamento"], extras: [] },
    { id: "cat-onda", nome: "Onda de Energia", descricao: "Um feixe contínuo de Ki disparado das mãos.", qtd: 1, dado: "d12", mod: "espirito", fixo: 0, tipo: "ki", efeitos: [], extras: [{ qtd: 1, dado: "d4", quando: "situacional", condicao: "carregado por uma rodada" }] },
    { id: "cat-disco", nome: "Disco de Ki", descricao: "Um disco afiado que corta quase tudo.", qtd: 1, dado: "d12", mod: "espirito", fixo: 2, tipo: "ki", efeitos: ["Sangramento"], extras: [] },
    { id: "cat-explosao", nome: "Explosão de Ki", descricao: "Libera o Ki ao redor do corpo de uma vez.", qtd: 2, dado: "d10", mod: "espirito", fixo: 0, tipo: "ki", efeitos: ["Queimadura"], extras: [] }
  ],
  EQUIPAMENTOS: [
    { id: "cat-armadura", nome: "Armadura de Batalha", descricao: "Proteção leve usada pelos guerreiros.", habilidade: null },
    { id: "cat-scouter", nome: "Scouter", descricao: "Lê o poder de luta de quem está por perto.", habilidade: null },
    { id: "cat-bastao", nome: "Bastão Extensível", descricao: "Um bastão que se estica e encolhe.", habilidade: { nome: "Golpe de bastão", descricao: "Um golpe com o alcance do bastão.", qtd: 1, dado: "d6", mod: "forca", fixo: 0, tipo: "fisico", efeitos: [], extras: [] } },
    { id: "cat-espada", nome: "Espada do Guerreiro", descricao: "Uma espada simples, mas bem balanceada.", habilidade: { nome: "Corte", descricao: "Um corte rápido.", qtd: 1, dado: "d8", mod: "forca", fixo: 0, tipo: "fisico", efeitos: ["Sangramento"], extras: [] } },
    { id: "cat-luvas", nome: "Luvas Condutoras", descricao: "Ajudam a concentrar o Ki nas mãos.", habilidade: { nome: "Disparo concentrado", descricao: "Ki disparado pelas luvas.", qtd: 1, dado: "d6", mod: "espirito", fixo: 0, tipo: "ki", efeitos: [], extras: [] } }
  ]
};
