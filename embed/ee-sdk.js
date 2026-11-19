/*
 * Estudo Escolar — SDK embedável (open-source)
 * Coloque TODO o catálogo (3.600+ jogos) em qualquer site com 3 linhas:
 *
 * <div id="ee-games"></div>
 * <script src="https://cdn.jsdelivr.net/gh/SitesForSchoolFR/estudoescolar@main/embed/ee-sdk.js"></script>
 * <script>EE.init({ container: '#ee-games', theme: 'dark' });</script>
 *
 * Sem dependências. Os jogos abrem em about:blank. Créditos: Estudo Escolar
 * (fontes originais creditadas em estudoescolar — apoie os desenvolvedores!).
 */
(function (global) {
  "use strict";
  var CDN = "https://cdn.jsdelivr.net/gh/SitesForSchoolFR/estudoescolar@main/";
  var state = { games: [], mir: null, q: "", shown: 60, el: null, grid: null, dark: true };

  function expand(u) {
    if (!u) return "";
    var c = (state.mir && state.mir.cdns) || {}, j = (c.jsdelivr && c.jsdelivr[0]) || "https://cdn.jsdelivr.net/gh/";
    if (u.indexOf("{GN_HTML}/") === 0) return j + c.gnHtmlPath + u.slice(10);
    if (u.indexOf("{UGS}/") === 0) return j + c.ugsPath + u.slice(6);
    if (u.indexOf("{URN}/") === 0) return j + c.urnPath + u.slice(6);
    if (u.indexOf("{DM1}/") === 0) return (c.dm1 || [j])[0] + u.slice(6);
    if (u.indexOf("{DM2}/") === 0) return (c.dm2 || [j])[0] + u.slice(6);
    return u;
  }
  function cover(g) {
    var c = g.c || "", mir = state.mir;
    if (!c) return "";
    var j = (mir.cdns.jsdelivr || ["https://cdn.jsdelivr.net/gh/"])[0];
    if (c.indexOf("{GN_COVER}/") === 0) return j + mir.cdns.gnCoverPath + c.slice(11);
    if (c.indexOf("{DM_IMG}/") === 0) return j + mir.cdns.dmImgPath + c.slice(9);
    if (c.indexOf("{URN}/") === 0) return j + mir.cdns.urnPath + c.slice(6);
    return c;
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]; }); }

  function play(g) {
    var w = global.open("about:blank", "_blank");
    var src = expand(g.u);
    if (!w) { location.href = src; return; }
    w.document.write("<!DOCTYPE html><html><head><meta charset='utf-8'><title>" + esc(g.n) + "</title><style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%;display:block}</style></head><body><iframe src='" + src.replace(/'/g, "%27") + "' allowfullscreen></iframe></body></html>");
    w.document.close();
  }

  function render() {
    var q = state.q.toLowerCase();
    var list = state.games.filter(function (g) { return !q || g.n.toLowerCase().indexOf(q) > -1; });
    state.grid.innerHTML = list.slice(0, state.shown).map(function (g, i) {
      var cv = cover(g);
      return "<article data-i='" + state.games.indexOf(g) + "' tabindex='0' style='cursor:pointer;border:1px solid " + (state.dark ? "#232a33" : "#ddd") + ";border-radius:12px;overflow:hidden;background:" + (state.dark ? "#12161C" : "#fff") + "'>" +
        (cv ? "<img loading='lazy' src='" + esc(cv) + "' alt='' style='width:100%;aspect-ratio:16/9;object-fit:cover;display:block' onerror='this.remove()'>" : "") +
        "<div style='padding:10px 12px'><strong style='font-size:.9rem;display:block'>" + esc(g.n) + "</strong>" +
        "<span style='font-size:.75rem;opacity:.65'>Jogar agora</span></div></article>";
    }).join("") || "<p style='opacity:.7'>Nenhum jogo encontrado.</p>";
    var cards = state.grid.querySelectorAll("article");
    cards.forEach(function (card) {
      var open = function () { play(state.games[+card.getAttribute("data-i")]); };
      card.addEventListener("click", open);
      card.addEventListener("keydown", function (e) { if (e.key === "Enter") open(); });
    });
  }

  function init(opts) {
    opts = opts || {};
    var host = document.querySelector(opts.container || "#ee-games");
    if (!host) return;
    state.dark = (opts.theme || "dark") !== "light";
    state.el = host;
    host.innerHTML =
      "<div style='font-family:system-ui,sans-serif;color:" + (state.dark ? "#EDEFF2" : "#14181d") + "'>" +
      "<input type='search' placeholder='Buscar entre " + "milhares de jogos…' style='width:100%;padding:11px 13px;margin-bottom:14px;border-radius:9px;border:1px solid " + (state.dark ? "#232a33" : "#ccc") + ";background:" + (state.dark ? "#0E1116" : "#fff") + ";color:inherit;font-size:.95rem'>" +
      "<div class='ee-grid' style='display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px'></div>" +
      "<button class='ee-more' style='display:block;margin:16px auto;padding:10px 22px;border-radius:9px;border:1px solid " + (state.dark ? "#232a33" : "#ccc") + ";background:transparent;color:inherit;cursor:pointer;font-weight:600'>Carregar mais</button>" +
      "<p style='text-align:center;font-size:.72rem;opacity:.55'>Catálogo <a href='https://sitesforschoolfr.github.io/estudoescolar/' target='_blank' rel='noopener' style='color:inherit'>Estudo Escolar</a> — jogos dos seus criadores originais. Apoie os desenvolvedores!</p></div>";
    state.grid = host.querySelector(".ee-grid");
    host.querySelector("input").addEventListener("input", function (e) { state.q = e.target.value; state.shown = 60; render(); });
    host.querySelector(".ee-more").addEventListener("click", function () { state.shown += 60; render(); });
    host.querySelector("input").placeholder = "Carregando catálogo…";
    Promise.all([
      fetch(CDN + "data/games.json").then(function (r) { return r.json(); }),
      fetch(CDN + "data/mirrors.json").then(function (r) { return r.json(); })
    ]).then(function (res) {
      state.games = res[0]; state.mir = res[1];
      host.querySelector("input").placeholder = "Buscar entre " + state.games.length.toLocaleString("pt-BR") + " jogos…";
      render();
    }).catch(function () {
      state.grid.innerHTML = "<p style='opacity:.7'>Não foi possível carregar o catálogo agora.</p>";
    });
  }

  global.EE = { init: init };
  global.EstudoEscolar = global.EE;
})(window);
