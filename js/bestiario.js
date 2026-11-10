// Dragon Ball Omega — Bestiário (a página em si fica em js/arvore-enc.js, igual à dos Planetas).
DBOEncTree({
  tipo: "bestiario", um: "ser", varios: "seres", aspect: 1.6,
  fields: [
    { key: "nome", label: "Nome", type: "text", required: true },
    { key: "descricao", label: "Descrição", type: "textarea" },
    { key: "comportamento", label: "Comportamento", type: "select", options: DBOData.ALIGNMENTS, required: true },
    { key: "ameaca", label: "Ameaça", type: "select", options: ["Inofensivo", "Planetária", "Galáxia", "Hemisfério", "Universal"], required: true }
  ]
});
