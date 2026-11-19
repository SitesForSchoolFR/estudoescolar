/*
 * Estudo Escolar — SDK embedável v2 (open-source)
 * O catálogo inteiro (3.600+ jogos) em qualquer site, com visual do EE,
 * cursor customizado, favoritos, categorias, jogo surpresa e CHAT GLOBAL
 * (a mesma rede Nostr do site principal — quem usa o embed conversa com
 * quem está no Estudo Escolar!).
 *
 * <div id="ee-games"></div>
 * <script src="https://cdn.jsdelivr.net/gh/SitesForSchoolFR/estudoescolar@main/embed/ee-sdk.js"></script>
 * <script>EE.init({ container: '#ee-games', theme: 'dark' });</script>
 *
 * Opções: { container, theme: 'dark'|'light', chat: true, cursor: true }
 * Jogos dos seus criadores originais — apoie os desenvolvedores!
 */
(function (global) {
  "use strict";
  var CDN = "https://cdn.jsdelivr.net/gh/SitesForSchoolFR/estudoescolar@main/";
  var RELAYS = ["wss://nos.lol", "wss://relay.damus.io", "wss://relay.primal.net", "wss://offchain.pub"];
  var NS = "estudoescolar-sfs-v1-chat-";
  var CHANNELS = [["geral", "# geral"], ["recomendacoes", "# dicas"], ["recordes", "# recordes"]];
  var CATS = [["todos", "Todos"], ["favoritos", "Favoritos"], ["famosos", "Famosos"], ["acao", "Ação"], ["corrida-esportes", "Corrida & Esportes"], ["plataforma", "Plataforma"], ["estrategia", "Estratégia"], ["terror", "Terror"], ["ritmo", "Ritmo / FNF"], ["retro", "Retrô"], ["multiplayer", "Multiplayer"], ["mundos", "Mundos Abertos"], ["ports", "Ports"]];
  var S = { games: [], mir: null, q: "", cat: "todos", sort: "pop", shown: 0, dark: true, favs: new Set(), profile: null, chatCh: "geral", msgs: new Map(), unread: 0, chatBuilt: false, lastSend: 0 };
  try { (JSON.parse(localStorage.getItem("ee_embed_favs") || "[]")).forEach(function (id) { S.favs.add(id); }); } catch (e) {}
  try { S.profile = JSON.parse(localStorage.getItem("ee_embed_profile") || "null"); } catch (e) {}

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]; }); }
  function expand(u) {
    if (!u) return "";
    var c = (S.mir && S.mir.cdns) || {}, j = (c.jsdelivr && c.jsdelivr[0]) || "https://cdn.jsdelivr.net/gh/";
    if (u.indexOf("{GN_HTML}/") === 0) return j + c.gnHtmlPath + u.slice(10);
    if (u.indexOf("{UGS}/") === 0) return j + c.ugsPath + u.slice(6);
    if (u.indexOf("{URN}/") === 0) return j + c.urnPath + u.slice(6);
    if (u.indexOf("{DM1}/") === 0) return (c.dm1 || [j])[0] + u.slice(6);
    if (u.indexOf("{DM2}/") === 0) return (c.dm2 || [j])[0] + u.slice(6);
    return u;
  }
  function cover(g) {
    var c = g.c || ""; if (!c || !S.mir) return "";
    var j = (S.mir.cdns.jsdelivr || ["https://cdn.jsdelivr.net/gh/"])[0];
    if (c.indexOf("{GN_COVER}/") === 0) return j + S.mir.cdns.gnCoverPath + c.slice(11);
    if (c.indexOf("{DM_IMG}/") === 0) return j + S.mir.cdns.dmImgPath + c.slice(9);
    if (c.indexOf("{URN}/") === 0) return j + S.mir.cdns.urnPath + c.slice(6);
    return c;
  }
  function play(g) {
    if (!g) return;
    var w = global.open("about:blank", "_blank"), src = expand(g.u);
    if (!w) { location.href = src; return; }
    w.document.write("<!DOCTYPE html><html><head><meta charset='utf-8'><title>" + esc(g.n) + "</title><style>html,body{margin:0;height:100%;background:#0B0D10}iframe{border:0;width:100%;height:100%;display:block}</style></head><body><iframe src='" + src.replace(/'/g, "%27") + "' allowfullscreen allow='fullscreen;gamepad'></iframe></body></html>");
    w.document.close();
  }
  function saveFavs() { try { localStorage.setItem("ee_embed_favs", JSON.stringify([].concat(Array.from(S.favs)))); } catch (e) {} }

  /* ---------- CSS ---------- */
  function css() {
    return "" +
    ".ee2{--ee-bg:#0B0D10;--ee-s:#12161C;--ee-s2:#171C24;--ee-b:#232a33;--ee-t:#EDEFF2;--ee-m:#9AA3AD;--ee-a:#7A0F1B;--ee-a2:#C8102E;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;background:radial-gradient(1200px 500px at 50% -10%,#171017,var(--ee-bg));color:var(--ee-t);border:1px solid var(--ee-b);border-radius:16px;padding:18px;position:relative;overflow:hidden}" +
    ".ee2.light{--ee-bg:#F4F4F6;--ee-s:#fff;--ee-s2:#ECECF0;--ee-b:#D8D8DE;--ee-t:#14181D;--ee-m:#5B6470;background:var(--ee-bg)}" +
    ".ee2 *{box-sizing:border-box}.ee2 ::selection{background:var(--ee-a2);color:#fff}" +
    ".ee2-h{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:12px}" +
    ".ee2-logo{font-weight:800;letter-spacing:.14em;font-size:.95rem}.ee2-logo small{display:block;letter-spacing:.3em;font-size:.58rem;color:var(--ee-m)}" +
    ".ee2 input[type=search]{flex:1;min-width:180px;background:var(--ee-s);border:1px solid var(--ee-b);border-radius:9px;color:inherit;padding:11px 13px;font-size:.95rem}" +
    ".ee2-btn{background:transparent;border:1px solid var(--ee-b);color:inherit;border-radius:9px;padding:10px 14px;font-weight:600;cursor:pointer;font-size:.85rem;transition:border-color .15s,background .15s}" +
    ".ee2-btn:hover{border-color:var(--ee-t)}.ee2-btn.pri{background:var(--ee-a);border-color:var(--ee-a);color:#fff}.ee2-btn.pri:hover{background:var(--ee-a2)}" +
    ".ee2-chips{display:flex;gap:8px;overflow-x:auto;padding:4px 0 12px;scrollbar-width:thin}" +
    ".ee2-chip{flex:none;border:1px solid var(--ee-b);background:transparent;color:var(--ee-m);border-radius:99px;padding:7px 13px;font-size:.8rem;cursor:pointer;transition:all .15s}" +
    ".ee2-chip:hover{color:var(--ee-t);border-color:var(--ee-t)}.ee2-chip.on{background:var(--ee-a);border-color:var(--ee-a);color:#fff}" +
    ".ee2-feat{display:flex;gap:10px;overflow-x:auto;padding-bottom:12px;scrollbar-width:thin}" +
    ".ee2-feat article{flex:none;width:210px;cursor:pointer;border:1px solid var(--ee-b);border-radius:12px;overflow:hidden;background:var(--ee-s);transition:transform .15s,border-color .15s}" +
    ".ee2-feat article:hover{transform:translateY(-2px);border-color:var(--ee-a2)}" +
    ".ee2-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}" +
    ".ee2-card{cursor:pointer;border:1px solid var(--ee-b);border-radius:12px;overflow:hidden;background:var(--ee-s);position:relative;transition:transform .15s,border-color .15s;animation:ee2in .18s ease both}" +
    ".ee2-card:hover{transform:translateY(-2px);border-color:var(--ee-a2)}" +
    "@keyframes ee2in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}" +
    ".ee2-card img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;background:var(--ee-s2)}" +
    ".ee2-ph{width:100%;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:800;color:#fff;background:linear-gradient(135deg,var(--ee-s2),var(--ee-a))}" +
    ".ee2-card .b{padding:10px 12px}.ee2-card strong{font-size:.9rem;display:block;line-height:1.3}" +
    ".ee2-card small{color:var(--ee-m);font-size:.72rem;letter-spacing:.08em;text-transform:uppercase}" +
    ".ee2-fav{position:absolute;top:8px;right:8px;width:30px;height:30px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:rgba(5,6,9,.7);color:#fff;cursor:pointer;font-size:.9rem;line-height:1}" +
    ".ee2-fav.on{color:#ff5b6a;border-color:#ff5b6a}" +
    ".ee2-cur-dot,.ee2-cur-ring{position:fixed;top:0;left:0;pointer-events:none;z-index:99999;border-radius:50%;display:none}" +
    ".ee2-cur-dot{width:8px;height:8px;background:var(--ee-a2,#C8102E);margin:-4px 0 0 -4px}" +
    ".ee2-cur-ring{width:30px;height:30px;border:1.5px solid rgba(200,16,46,.75);margin:-15px 0 0 -15px;transition:width .15s,height .15s,margin .15s}" +
    ".ee2-chat{position:fixed;top:0;right:0;height:100dvh;width:min(380px,94vw);background:var(--ee-bg,#0B0D10);color:var(--ee-t,#EDEFF2);border-left:1px solid var(--ee-b,#232a33);z-index:99998;display:flex;flex-direction:column;font-family:system-ui,sans-serif;transform:translateX(105%);transition:transform .18s ease}" +
    ".ee2-chat.open{transform:none}.ee2-chat header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--ee-b,#232a33);font-weight:800;letter-spacing:.1em;font-size:.8rem}" +
    ".ee2-msgs{flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:10px}" +
    ".ee2-msg strong{font-size:.8rem}.ee2-msg small{opacity:.55;font-size:.68rem}.ee2-msg p{margin:2px 0 0;font-size:.88rem;line-height:1.45;word-break:break-word}" +
    ".ee2-chat form{display:flex;gap:8px;padding:12px;border-top:1px solid var(--ee-b,#232a33)}" +
    ".ee2-chat input{flex:1;background:var(--ee-s,#12161C);border:1px solid var(--ee-b,#232a33);border-radius:9px;color:inherit;padding:10px}" +
    ".ee2-name{padding:14px 16px;border-top:1px solid var(--ee-b,#232a33);font-size:.85rem}" +
    ".ee2-badge{background:var(--ee-a2);color:#fff;border-radius:99px;font-size:.65rem;padding:1px 7px;margin-left:6px;vertical-align:2px}";
  }

  /* ---------- Cursor (pontinho instantâneo, anel com atraso — igual ao EE) ---------- */
  function initCursor(root) {
    if (!global.matchMedia || !matchMedia("(pointer:fine)").matches) return;
    var dot = document.createElement("div"), ring = document.createElement("div");
    dot.className = "ee2-cur-dot"; ring.className = "ee2-cur-ring";
    document.body.appendChild(dot); document.body.appendChild(ring);
    var mx = -100, my = -100, rx = -100, ry = -100, inside = false;
    root.addEventListener("mouseenter", function () { inside = true; dot.style.display = ring.style.display = "block"; });
    root.addEventListener("mouseleave", function () { inside = false; dot.style.display = ring.style.display = "none"; });
    document.addEventListener("mousemove", function (e) { mx = e.clientX; my = e.clientY; if (inside) { dot.style.transform = "translate(" + mx + "px," + my + "px)"; } });
    (function loop() { rx += (mx - rx) * 0.085; ry += (my - ry) * 0.085; if (inside) ring.style.transform = "translate(" + rx + "px," + ry + "px)"; requestAnimationFrame(loop); })();
  }

  /* ---------- Chat global (Nostr, mesma rede do site) ---------- */
  var sockets = [];
  function loadCrypto() {
    if (global.NostrCrypto) return Promise.resolve();
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = CDN + "assets/js/nostr-crypto.js";
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  function renderMsgs(box) {
    var list = Array.from(S.msgs.values()).filter(function (m) { return m.channel === S.chatCh; }).sort(function (a, b) { return a.ts - b.ts; }).slice(-80);
    box.innerHTML = list.map(function (m) {
      return "<div class='ee2-msg'><strong style='color:" + esc(m.color) + "'>" + esc(m.name) + "</strong> <small>" + new Date(m.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) + "</small><p>" + esc(m.text) + "</p></div>";
    }).join("") || "<p style='opacity:.6;font-size:.85rem'>Sem mensagens ainda. Seja o primeiro!</p>";
    box.scrollTop = box.scrollHeight;
  }
  function connectChat(box, badge) {
    RELAYS.forEach(function (url) {
      try {
        var ws = new WebSocket(url); sockets.push(ws);
        ws.onopen = function () {
          ws.send(JSON.stringify(["REQ", "ee-embed", { kinds: [1], "#t": CHANNELS.map(function (c) { return NS + c[0]; }), limit: 60 }]));
        };
        ws.onmessage = function (e) {
          try {
            var m = JSON.parse(e.data);
            if (m[0] !== "EVENT" || !m[2]) return;
            var ev = m[2], tag = (ev.tags.find(function (t) { return t[0] === "t"; }) || [])[1] || "";
            if (tag.indexOf(NS) !== 0 || S.msgs.has(ev.id)) return;
            var p = JSON.parse(ev.content);
            if (!p.text || !p.name) return;
            S.msgs.set(ev.id, { id: ev.id, channel: tag.slice(NS.length), name: String(p.name).slice(0, 24), color: /^#[0-9a-fA-F]{6}$/.test(p.color) ? p.color : "#C8102E", text: String(p.text).slice(0, 360), ts: (ev.created_at || 0) * 1000 });
            if (S.chatBuilt) { renderMsgs(box); if (!document.querySelector(".ee2-chat.open")) { S.unread++; badge.textContent = S.unread; badge.style.display = ""; } }
          } catch (err) {}
        };
      } catch (err) {}
    });
  }
  async function sendMsg(text, box) {
    var now = Date.now();
    if (now - S.lastSend < 1800) return;
    await loadCrypto();
    if (!S.profile || !S.profile.privKey) {
      var sk = global.NostrCrypto.generateSecretKey();
      S.profile = { name: "", privKey: sk, pubKey: global.NostrCrypto.getPublicKey(sk), color: "#C8102E" };
    }
    var ev = await global.NostrCrypto.signEvent({ kind: 1, tags: [["t", NS + S.chatCh], ["client", "EstudoEscolar-Embed"]], content: JSON.stringify({ name: S.profile.name, avatar: "🎮", color: S.profile.color, level: 1, text: text }) }, S.profile.privKey);
    S.lastSend = now;
    S.msgs.set(ev.id, { id: ev.id, channel: S.chatCh, name: S.profile.name, color: S.profile.color, text: text, ts: Date.now() });
    renderMsgs(box);
    sockets.forEach(function (ws) { if (ws.readyState === 1) try { ws.send(JSON.stringify(["EVENT", ev])); } catch (e) {} });
  }

  /* ---------- App ---------- */
  function filtered() {
    var q = S.q.toLowerCase();
    var list = S.games.filter(function (g) {
      if (S.cat === "favoritos" && !S.favs.has(g.id)) return false;
      if (S.cat !== "todos" && S.cat !== "favoritos" && (g.k || []).indexOf(S.cat) === -1) return false;
      return !q || g.n.toLowerCase().indexOf(q) > -1;
    });
    if (S.sort === "az") list.sort(function (a, b) { return a.n.localeCompare(b.n); });
    else list.sort(function (a, b) { return (b.p || 0) - (a.p || 0); });
    return list;
  }
  function cardHTML(g) {
    var cv = cover(g), fav = S.favs.has(g.id) ? " on" : "";
    return "<article class='ee2-card' data-id='" + g.id + "'>" + (cv ? "<img loading='lazy' decoding='async' src='" + esc(cv) + "' alt='' onerror='this.outerHTML=\"<div class=ee2-ph>" + esc((g.n || "?").charAt(0)) + "</div>\"'>" : "<div class='ee2-ph'>" + esc((g.n || "?").charAt(0)) + "</div>") +
      "<button class='ee2-fav" + fav + "' data-fav='" + g.id + "' title='Favoritar'>♥</button>" +
      "<div class='b'><strong>" + esc(g.n) + "</strong><small>" + esc((g.s || [])[0] || "") + "</small></div></article>";
  }

  function init(opts) {
    opts = opts || {};
    var host = document.querySelector(opts.container || "#ee-games");
    if (!host) return;
    S.dark = (opts.theme || "dark") !== "light";
    if (!document.getElementById("ee2-css")) {
      var st = document.createElement("style"); st.id = "ee2-css"; st.textContent = css(); document.head.appendChild(st);
    }
    host.classList.add("ee2"); if (!S.dark) host.classList.add("light");
    host.innerHTML =
      "<div class='ee2-h'><div class='ee2-logo'>ESTUDO.ESCOLAR<small>CATÁLOGO EMBED</small></div>" +
      "<input type='search' placeholder='Carregando catálogo…' aria-label='Buscar jogos'>" +
      "<button class='ee2-btn' data-act='surprise'>Surpresa</button>" +
      "<button class='ee2-btn' data-act='chat'>Chat global<span class='ee2-badge' style='display:none'>0</span></button>" +
      "<button class='ee2-btn' data-act='theme'>" + (S.dark ? "Claro" : "Escuro") + "</button></div>" +
      "<div class='ee2-chips'>" + CATS.map(function (c) { return "<button class='ee2-chip" + (S.cat === c[0] ? " on" : "") + "' data-cat='" + c[0] + "'>" + c[1] + "</button>"; }).join("") + "</div>" +
      "<div class='ee2-feat'></div>" +
      "<div class='ee2-grid'></div><div class='ee2-more' style='text-align:center;padding:14px;opacity:.6;font-size:.85rem'>Role para carregar mais…</div>" +
      "<p style='text-align:center;font-size:.72rem;opacity:.55;margin:10px 0 0'>Catálogo <a href='https://sitesforschoolfr.github.io/estudoescolar/' target='_blank' rel='noopener' style='color:inherit'>Estudo Escolar</a> (open-source) — jogos dos seus criadores originais. Apoie os desenvolvedores!</p>";

    var grid = host.querySelector(".ee2-grid"), feat = host.querySelector(".ee2-feat"),
        search = host.querySelector("input"), badge = host.querySelector(".ee2-badge"), list = [];

    function appendBatch() {
      var slice = list.slice(S.shown, S.shown + 48);
      if (!slice.length) return;
      var tmp = document.createElement("div");
      tmp.innerHTML = slice.map(cardHTML).join("");
      while (tmp.firstChild) grid.appendChild(tmp.firstChild);
      S.shown += slice.length;
    }
    function render(reset) {
      list = filtered();
      if (reset) { grid.innerHTML = ""; S.shown = 0; }
      appendBatch();
      host.querySelector(".ee2-more").textContent = S.shown >= list.length ? (list.length + " jogos") : "Role para carregar mais…";
    }
    // Scroll infinito (sem lag: lotes de 48 + delegação de eventos)
    var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) render(false); }, { rootMargin: "600px" });
    io.observe(host.querySelector(".ee2-more"));
    // Delegação: 1 listener para todos os cards
    grid.addEventListener("click", function (e) {
      var fav = e.target.closest("[data-fav]");
      if (fav) { e.stopPropagation(); var id = fav.getAttribute("data-fav"); S.favs.has(id) ? S.favs.delete(id) : S.favs.add(id); fav.classList.toggle("on"); saveFavs(); if (S.cat === "favoritos") render(true); return; }
      var card = e.target.closest("[data-id]");
      if (card) play(S.games.find(function (g) { return g.id === card.getAttribute("data-id"); }));
    });
    feat.addEventListener("click", function (e) { var c = e.target.closest("[data-id]"); if (c) play(S.games.find(function (g) { return g.id === c.getAttribute("data-id"); })); });
    var deb;
    search.addEventListener("input", function () { clearTimeout(deb); deb = setTimeout(function () { S.q = search.value; render(true); }, 120); });
    host.querySelector(".ee2-chips").addEventListener("click", function (e) {
      var chip = e.target.closest("[data-cat]"); if (!chip) return;
      S.cat = chip.getAttribute("data-cat");
      host.querySelectorAll(".ee2-chip").forEach(function (c) { c.classList.toggle("on", c === chip); });
      render(true);
    });
    host.querySelector("[data-act='surprise']").addEventListener("click", function () { play(S.games[Math.floor(Math.random() * S.games.length)]); });
    host.querySelector("[data-act='theme']").addEventListener("click", function (e) { S.dark = !S.dark; host.classList.toggle("light", !S.dark); e.target.textContent = S.dark ? "Claro" : "Escuro"; });

    /* Chat */
    var panel = document.createElement("aside");
    panel.className = "ee2-chat";
    panel.innerHTML = "<header>CHAT GLOBAL <button class='ee2-btn' data-x='1'>✕</button></header>" +
      "<div class='ee2-chips' style='padding:10px 12px 0'>" + CHANNELS.map(function (c, i) { return "<button class='ee2-chip" + (i === 0 ? " on" : "") + "' data-ch='" + c[0] + "'>" + c[1] + "</button>"; }).join("") + "</div>" +
      "<div class='ee2-msgs'></div><div class='ee2-name'></div>" +
      "<form><input placeholder='Sua mensagem…' maxlength='360' autocomplete='off'><button class='ee2-btn pri'>Enviar</button></form>";
    document.body.appendChild(panel);
    var msgsBox = panel.querySelector(".ee2-msgs"), nameBox = panel.querySelector(".ee2-name");
    function paintName() {
      if (S.profile && S.profile.name) { nameBox.innerHTML = "Falando como <strong style='color:" + esc(S.profile.color) + "'>" + esc(S.profile.name) + "</strong>"; nameBox.style.display = ""; }
      else nameBox.innerHTML = "Escolha um nome para falar: <form class='ee2-nf' style='display:flex;gap:8px;margin-top:8px'><input placeholder='Seu nome (mín. 2 letras)' maxlength='24' style='flex:1'><button class='ee2-btn pri'>Entrar</button></form>";
      var nf = nameBox.querySelector(".ee2-nf");
      if (nf) nf.addEventListener("submit", function (e) {
        e.preventDefault();
        var v = nf.querySelector("input").value.trim();
        if (v.length < 2) return;
        loadCrypto().then(function () {
          if (!S.profile) S.profile = {};
          if (!S.profile.privKey) { S.profile.privKey = global.NostrCrypto.generateSecretKey(); S.profile.pubKey = global.NostrCrypto.getPublicKey(S.profile.privKey); }
          S.profile.name = v; S.profile.color = S.profile.color || "#C8102E";
          try { localStorage.setItem("ee_embed_profile", JSON.stringify(S.profile)); } catch (err) {}
          paintName();
        });
      });
    }
    panel.querySelector("[data-x]").addEventListener("click", function () { panel.classList.remove("open"); });
    panel.querySelector(".ee2-chips").addEventListener("click", function (e) {
      var c = e.target.closest("[data-ch]"); if (!c) return;
      S.chatCh = c.getAttribute("data-ch");
      panel.querySelectorAll(".ee2-chip").forEach(function (x) { x.classList.toggle("on", x === c); });
      renderMsgs(msgsBox);
    });
    panel.querySelector("form:not(.ee2-nf)").addEventListener("submit", function (e) {
      e.preventDefault();
      var inp = panel.querySelector("form input"), v = inp.value.trim();
      if (!v) return;
      if (!S.profile || !S.profile.name) { paintName(); nameBox.scrollIntoView(); return; }
      inp.value = "";
      sendMsg(v, msgsBox).catch(function () {});
    });
    host.querySelector("[data-act='chat']").addEventListener("click", function () {
      panel.classList.toggle("open");
      if (panel.classList.contains("open")) { S.unread = 0; badge.style.display = "none"; paintName(); renderMsgs(msgsBox); if (!S.chatBuilt) { S.chatBuilt = true; connectChat(msgsBox, badge); } }
    });

    if (opts.cursor !== false) initCursor(host);
    search.placeholder = "Carregando catálogo…";
    Promise.all([
      fetch(CDN + "data/games.json").then(function (r) { return r.json(); }),
      fetch(CDN + "data/mirrors.json").then(function (r) { return r.json(); })
    ]).then(function (res) {
      S.games = res[0]; S.mir = res[1];
      search.placeholder = "Buscar entre " + S.games.length.toLocaleString("pt-BR") + " jogos…";
      feat.innerHTML = S.games.filter(function (g) { return g.f === 1; }).sort(function (a, b) { return (b.p || 0) - (a.p || 0); }).slice(0, 8).map(function (g) {
        return "<article data-id='" + g.id + "'>" + (cover(g) ? "<img loading='lazy' src='" + esc(cover(g)) + "' alt='' style='width:100%;aspect-ratio:16/9;object-fit:cover;display:block' onerror='this.remove()'>" : "") + "<div style='padding:9px 11px'><strong style='font-size:.85rem'>" + esc(g.n) + "</strong></div></article>";
      }).join("");
      render(true);
    }).catch(function () { grid.innerHTML = "<p style='opacity:.7'>Não foi possível carregar o catálogo agora.</p>"; });
  }

  global.EE = { init: init };
  global.EstudoEscolar = global.EE;
})(window);
