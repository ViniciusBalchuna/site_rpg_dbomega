// Dragon Ball Omega — dragões decorativos em SVG (desenho original, bem simples e caricato).
//   DBODragon.head() -> texto SVG: só a cabeça de lado, fofa (usada na tela de carregamento dourada de Personagens).
//   DBODragon.face() -> texto SVG: rosto de FRENTE, só contorno, com dois chifres ameaçadores (telas de deleção).
// As cores vêm das variáveis CSS --dr-base, --dr-dark, --dr-light e --dr-eye (css/dragao.css).
window.DBODragon = (function () {
  /* ---------- Cabeça de lado (aponta para +x): redondinha e simpática ----------
     Chifres: nascem atrás do olho, no alto do crânio, e se curvam PARA TRÁS (como os do Shenron), com um dentinho
     e dois anéis. Um segundo chifre, mais escuro e deslocado, aparece atrás para dar profundidade. */
  var HORN = "M2,-24C-14,-34-36,-36-64,-54C-48,-26-30,-16-12,-14Z";                                // chifre curvo
  var PRONG = "M-22,-33C-26,-46-32,-56-42,-64C-42,-52-48,-44-46,-39Z";                             // dentinho para cima e para trás
  function headParts() {
    var s = "";
    s += '<g transform="translate(9,-7) scale(.88)"><path class="dr-horn dr-horn--far" d="' + PRONG + '"/><path class="dr-horn dr-horn--far" d="' + HORN + '"/></g>'; // chifre do fundo
    s += '<path class="dr-bs" d="M-30,-6 L-54,-17 L-45,-1 L-62,6 L-46,12 L-58,22 L-32,17 Z"/>';   // crina na nuca
    s += '<path class="dr-horn" d="' + PRONG + '"/><path class="dr-horn" d="' + HORN + '"/>';      // chifre da frente
    s += '<path class="dr-horn-r" d="M-19,-31q4,6 -1,12M-33,-35q4,6 0,11"/>';                       // anéis do chifre
    s += '<ellipse class="dr-bs" cx="0" cy="0" rx="34" ry="28"/>';                                  // cabeça
    s += '<rect class="dr-bs" x="14" y="-6" width="46" height="30" rx="15"/>';                       // focinho
    s += '<ellipse class="dr-light" cx="-4" cy="14" rx="14" ry="8"/>';                               // bochecha
    s += '<circle class="dr-dk" cx="52" cy="4" r="2.6"/>';                                           // narina
    s += '<circle class="dr-white" cx="8" cy="-8" r="9"/><circle class="dr-dk" cx="11" cy="-7" r="4.6"/><circle cx="12.6" cy="-8.6" r="1.4" fill="#fff"/>';
    s += '<path class="dr-dk-s" d="M-2,-19Q11,-28 26,-15"/>';                                        // sobrancelha
    s += '<path class="dr-dk-s" d="M26,17 Q42,26 56,15"/>';                                          // sorriso
    s += '<path class="dr-tooth" d="M40,19 L44,26 L48,19 Z"/>';                                      // dentinho
    s += '<path class="dr-whisk" d="M58,2 Q84,-10 98,6"/><path class="dr-whisk" d="M56,12 Q80,20 92,34"/>'; // bigodes
    return s;
  }

  function head() {
    return '<svg class="dr-svg dr-svg--head" viewBox="-72 -70 176 128" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><g>' + headParts() + '</g></svg>';
  }

  /* ---------- Rosto de frente, só contorno (vai "engolir" a tela) ---------- */
  function face() {
    var half =
      '<path d="M128,92 C80,88 34,52 28,-8 C62,28 98,34 150,60"/>' +                       // chifre
      '<path d="M200,52 C168,52 142,64 128,92 C104,116 88,146 94,182 C98,214 124,240 160,252 C176,258 190,259 200,259"/>' + // contorno do rosto
      '<path d="M112,134 L180,154"/>' +                                                      // sobrancelha brava
      '<path d="M126,150 Q150,134 176,160 Q148,168 126,150 Z"/><path d="M152,146 L154,160"/>' + // olho
      '<path d="M184,178 q-9,6 -2,15"/>' +                                                   // narina
      '<path d="M104,200 C140,190 172,206 200,200"/>' +                                      // boca
      '<path d="M108,203 L122,232 L134,206 L148,236 L160,210 L174,238 L186,212 L200,240"/>'; // presas
    return '<svg class="dr-svg dr-svg--face" viewBox="-10 -30 420 310" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
      '<g class="dr-outline">' + half + '<g transform="translate(400,0) scale(-1,1)">' + half + '</g></g></svg>';
  }

  return { head: head, face: face };
})();
