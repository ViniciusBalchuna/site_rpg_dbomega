/* Som de dado: sintetizado na hora (Web Audio), sem arquivo de áudio.
   DBOSom.dado() toca uma "rolada" curta; chamadas seguidas (vários dados de uma vez) são agrupadas.
   Para silenciar: localStorage.setItem("dbo-som", "off"). */
(function () {
  var ctx = null, last = 0;
  function on() { try { return localStorage.getItem("dbo-som") !== "off"; } catch (e) { return true; } }
  function clack(t, vol, freq) {
    var len = Math.floor(ctx.sampleRate * 0.05), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = 1.4;
    var g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(ctx.destination); src.start(t);
  }
  function dado() {
    if (!on()) return;
    var now = Date.now(); if (now - last < 350) return; last = now;
    try {
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ctx = ctx || new AC(); if (ctx.state === "suspended") ctx.resume();
      var t = ctx.currentTime, gap = 0.04, vol = 0.9;
      for (var i = 0; i < 7; i++) {          // batidas que vão ficando mais fracas e espaçadas
        clack(t, vol, 1400 + Math.random() * 1800);
        t += gap; gap *= 1.28 + Math.random() * 0.2; vol *= 0.72;
      }
    } catch (e) { /* sem áudio: segue sem som */ }
  }
  window.DBOSom = { dado: dado };
})();
