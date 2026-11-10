// Dragon Ball Omega — Planetas (a página em si fica em js/arvore-enc.js, igual à do Bestiário).
DBOEncTree({
  tipo: "planetas", um: "planeta", varios: "planetas", aspect: 1.6,
  fields: [
    { key: "nome", label: "Nome", type: "text", required: true },
    { key: "descricao", label: "Descrição", type: "textarea" },
    { key: "fauna", label: "Fauna", type: "textarea" },
    { key: "flora", label: "Flora", type: "textarea" },
    { key: "povo", label: "Povo", type: "textarea" },
    { key: "clima", label: "Clima", type: "textarea" },
    { key: "lugares", label: "Lugares marcantes", type: "textarea" },
    { key: "curiosidades", label: "Curiosidades", type: "textarea" }
  ]
});
