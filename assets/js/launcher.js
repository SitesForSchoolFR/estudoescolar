/**
 * about:blank Iframe Game & Portal Launcher + Multi-CDN Failover + Playtime Tracker
 * Every game and mirror opens inside a genuine about:blank tab hosting a full-screen <iframe>,
 * disguised with the user's active school cloak, with built-in mirror switching, fullscreen,
 * offline HTML download, and instant study-panic toggle.
 */
(function (global) {
  'use strict';

  let cdnConfig = {
    jsdelivr: [
      'https://cdn.jsdelivr.net/gh/',
      'https://fastly.jsdelivr.net/gh/',
      'https://gcore.jsdelivr.net/gh/',
      'https://testingcf.jsdelivr.net/gh/',
      'https://originfastly.jsdelivr.net/gh/',
      'https://jsdelivr.b-cdn.net/gh/',
      'https://cdn.jsdmirror.com/gh/',
      'https://raw.esm.sh/gh/'
    ],
    gnHtmlPath: 'freebuisness/html@main/',
    gnCoverPath: 'freebuisness/covers@main/',
    ugsPath: 'bubbls/ugs-singlefile@main/UGS-Files/',
    urnPath: 'Onex558/uranium-source-@main/',
    dmImgPath: 'mathlesson/mathlesson.github.io@main/',
    dm1: [
      'https://d1pgfzxl8xljfg.cloudfront.net/',
      'https://dosl6rc74a8u6.cloudfront.net/',
      'https://d1wnrmoe2jrw0g.cloudfront.net/',
      'https://dmg-db.pages.dev/',
      'https://math-a1.b-cdn.net/',
      'https://science-v1.b-cdn.net/',
      'https://pub-8ba40c3fa5854d7490b82d9a8dd671d0.r2.dev/',
      'https://db.duckmath.org/'
    ],
    dm2: [
      'https://d1b8zsan60tues.cloudfront.net/',
      'https://d1imv5hmyw4kfp.cloudfront.net/',
      'https://d139khpwsw1rlp.cloudfront.net/',
      'https://db2.mathevolve.com/',
      'https://db2.duckmath.org/',
      'https://db2.englishteacherpro.com/'
    ]
  };

  let preferredCdnIdx = 0;
  let hudEnabled = true;
  const activeSessions = new Set();
  let trackerTimer = null;

  function orderedList(arr, startIdx = 0) {
    if (!arr || !arr.length) return [];
    const s = ((startIdx % arr.length) + arr.length) % arr.length;
    return [...arr.slice(s), ...arr.slice(0, s)];
  }

  function encodePathSegments(p) {
    return p.split('/').map(seg => {
      try { return encodeURIComponent(decodeURIComponent(seg)); }
      catch (_) { return encodeURIComponent(seg); }
    }).join('/');
  }

  /**
   * Expand a compact URL token into an ordered array of mirror candidate descriptors:
   * [{ label, url, type: 'html' | 'iframe' }]
   */
  function expandUrlCandidates(rawUrl, defaultMode = 'html') {
    if (!rawUrl) return [];
    const jsdList = orderedList(cdnConfig.jsdelivr, preferredCdnIdx);
    const jsdNames = (u) => {
      try { return new URL(u).hostname.replace('.jsdelivr.net', '·jsDelivr'); }
      catch (_) { return 'CDN'; }
    };

    if (rawUrl.startsWith('{GN_HTML}/')) {
      const file = encodePathSegments(rawUrl.slice('{GN_HTML}/'.length));
      return jsdList.map(base => ({
        label: `GN · ${jsdNames(base)}`,
        url: base + cdnConfig.gnHtmlPath + file,
        type: 'html'
      }));
    }
    if (rawUrl.startsWith('{UGS}/')) {
      const file = encodePathSegments(rawUrl.slice('{UGS}/'.length));
      return jsdList.map(base => ({
        label: `P2P/UGS · ${jsdNames(base)}`,
        url: base + cdnConfig.ugsPath + file,
        type: 'html'
      }));
    }
    if (rawUrl.startsWith('{URN}/')) {
      const file = encodePathSegments(rawUrl.slice('{URN}/'.length));
      return jsdList.map(base => ({
        label: `P2P · ${jsdNames(base)}`,
        url: base + cdnConfig.urnPath + file,
        type: 'html'
      }));
    }
    if (rawUrl.startsWith('{DM1}/')) {
      const rest = rawUrl.slice('{DM1}/'.length);
      return cdnConfig.dm1.map((base, i) => ({
        label: `DuckMath Mirror #${i + 1}`,
        url: base + rest,
        type: 'iframe'
      }));
    }
    if (rawUrl.startsWith('{DM2}/')) {
      const rest = rawUrl.slice('{DM2}/'.length);
      return cdnConfig.dm2.map((base, i) => ({
        label: `DuckMath DB2 #${i + 1}`,
        url: base + rest,
        type: 'iframe'
      }));
    }
    if (rawUrl.includes('cdn.jsdelivr.net/gh/')) {
      const tail = rawUrl.split('cdn.jsdelivr.net/gh/')[1];
      return jsdList.map(base => ({
        label: jsdNames(base),
        url: base + tail,
        type: defaultMode
      }));
    }
    return [{ label: 'Servidor Principal', url: rawUrl, type: defaultMode }];
  }

  function buildGameCandidates(game) {
    const all = [...expandUrlCandidates(game.u, game.m || 'html')];
    if (Array.isArray(game.au)) {
      for (const alt of game.au) {
        const altMode = (alt.startsWith('{DM1}/') || alt.startsWith('{DM2}/') || game.m === 'iframe') ? 'iframe' : 'html';
        for (const c of expandUrlCandidates(alt, altMode)) {
          if (!all.some(x => x.url === c.url)) all.push(c);
        }
      }
    }
    return all;
  }

  function resolveCoverUrls(game) {
    const out = [];
    const jsdPrimary = orderedList(cdnConfig.jsdelivr, preferredCdnIdx).slice(0, 3);
    const pushCover = (c) => {
      if (!c) return;
      if (c.startsWith('{GN_COVER}/')) {
        const f = c.slice('{GN_COVER}/'.length);
        jsdPrimary.forEach(b => out.push(b + cdnConfig.gnCoverPath + f));
      } else if (c.startsWith('{DM_IMG}/')) {
        const f = c.slice('{DM_IMG}/'.length);
        jsdPrimary.forEach(b => out.push(b + cdnConfig.dmImgPath + f));
      } else if (c.startsWith('{URN}/')) {
        const f = c.slice('{URN}/'.length);
        jsdPrimary.forEach(b => out.push(b + cdnConfig.urnPath + f));
      } else {
        out.push(c);
      }
    };
    pushCover(game.c);
    pushCover(game.ac);
    return out;
  }

  function startSessionTracker(win) {
    activeSessions.add(win);
    if (trackerTimer) return;
    trackerTimer = setInterval(() => {
      for (const w of Array.from(activeSessions)) {
        try {
          if (!w || w.closed) activeSessions.delete(w);
        } catch (_) {
          activeSessions.delete(w);
        }
      }
      if (activeSessions.size > 0) {
        if (global.ProfileStore) global.ProfileStore.addPlaySeconds(15);
      } else {
        clearInterval(trackerTimer);
        trackerTimer = null;
        if (global.ProfileStore) global.ProfileStore.clearCurrentGame();
      }
    }, 15000);
  }

  /**
   * Generates the self-contained HTML shell written into the about:blank tab.
   * Inside it, the game ALWAYS runs inside <iframe id="game-iframe"> (100% viewport).
   */
  function buildAboutBlankShell({ gameName, cloakTitle, cloakIcon, candidates, showHud, startIndex = 0 }) {
    const safeTitle = String(cloakTitle || 'Estudo Escolar — Atividade').replace(/[<>&"]/g, '');
    const safeIcon = String(cloakIcon || '').replace(/"/g, '%22');
    const payload = JSON.stringify({
      gameName: gameName || 'Atividade',
      candidates,
      showHud: showHud !== false,
      startIndex: Math.max(0, Math.min(startIndex, candidates.length - 1))
    }).replace(/<\//g, '<\\/');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>${safeTitle}</title>
<link rel="icon" href="${safeIcon}">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:100%;height:100%;overflow:hidden;background:#090b10;color:#f1f5f9;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  #game-iframe{position:fixed;inset:0;width:100%;height:100%;border:0;background:#000;z-index:1}
  #loader{position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 35%,#151b2e,#090b10 70%);transition:opacity .25s ease}
  #loader.done{opacity:0;pointer-events:none}
  .lcard{width:min(420px,88vw);padding:28px;border-radius:18px;background:rgba(17,21,34,.92);border:1px solid rgba(255,255,255,.09);text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.55)}
  .spin{width:38px;height:38px;border-radius:50%;border:3px solid rgba(99,102,241,.22);border-top-color:#6366f1;margin:0 auto 16px;animation:sp .75s linear infinite}
  @keyframes sp{to{transform:rotate(360deg)}}
  .gtitle{font-size:17px;font-weight:700;margin-bottom:6px;color:#f8fafc}
  .lstatus{font-size:13px;color:#94a3b8;margin-bottom:14px}
  .pbar{height:6px;background:rgba(255,255,255,.08);border-radius:99px;overflow:hidden}
  .pfill{height:100%;width:18%;background:linear-gradient(90deg,#6366f1,#22d3ee);border-radius:99px;transition:width .2s ease}
  .lactions{margin-top:16px;display:none;gap:8px;justify-content:center;flex-wrap:wrap}
  .lactions button{padding:8px 14px;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:#1e293b;color:#f8fafc;font-size:12px;font-weight:600;cursor:pointer}
  .lactions button.pri{background:#6366f1;border-color:#6366f1}
  #hud{position:fixed;top:8px;right:10px;z-index:30;display:flex;align-items:center;gap:5px;padding:5px 8px;border-radius:999px;background:rgba(11,14,23,.82);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.12);box-shadow:0 8px 24px rgba(0,0,0,.45);transition:opacity .25s ease,transform .25s ease;font-size:12px}
  #hud.collapsed .hud-body{display:none}
  #hud.faded{opacity:.22}
  #hud:hover{opacity:1}
  .hfake{display:inline-flex;align-items:center;background:rgba(34,197,94,.14);border:1px solid rgba(34,197,94,.35);color:#86efac;border-radius:999px;padding:4px 10px;font-size:11px;font-weight:600;white-space:nowrap;max-width:230px;overflow:hidden;text-overflow:ellipsis}
  .hud-body{display:flex;align-items:center;gap:5px}
  .hbtn{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:#e2e8f0;border-radius:999px;padding:4px 9px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;transition:background .15s}
  .hbtn:hover{background:rgba(99,102,241,.35);border-color:rgba(99,102,241,.6)}
  .hsel{background:#111625;color:#e2e8f0;border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:3px 8px;font-size:11px;max-width:145px;cursor:pointer}
  #study-mask{position:fixed;inset:0;z-index:50;display:none;background:#f8fafc;color:#0f172a;padding:42px 24px;overflow:auto}
  #study-mask.on{display:block}
  .sm-box{max-width:720px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:32px;box-shadow:0 4px 16px rgba(15,23,42,.05)}
  .sm-tag{display:inline-block;font-size:12px;font-weight:700;color:#2563eb;background:#eff6ff;padding:4px 10px;border-radius:99px;margin-bottom:12px}
  .sm-box h1{font-size:22px;margin-bottom:12px}
  .sm-box p{font-size:15px;line-height:1.7;color:#334155;margin-bottom:14px}
  .sm-formula{background:#f1f5f9;border-left:4px solid #2563eb;padding:12px 16px;font-family:Georgia,serif;font-size:16px;margin:16px 0;border-radius:0 8px 8px 0}
</style>
</head>
<body>
  <iframe id="game-iframe" referrerpolicy="no-referrer" allow="autoplay; fullscreen; gamepad; pointer-lock; clipboard-read; clipboard-write; accelerometer; gyroscope; midi" allowfullscreen></iframe>

  <div id="loader">
    <div class="lcard">
      <div class="spin" id="lspin"></div>
      <div class="gtitle" id="gtitle"></div>
      <div class="lstatus" id="lstatus">Preparando ambiente em about:blank...</div>
      <div class="pbar"><div class="pfill" id="pfill"></div></div>
      <div class="lactions" id="lactions">
        <button class="pri" id="btn-next-mirror">Tentar próximo Mirror</button>
        <button id="btn-retry">Recarregar</button>
      </div>
    </div>
  </div>

  <div id="hud">
    <button class="hbtn" id="hud-toggle" title="Minimizar/Expandir barra">☰</button>
    <div class="hud-body">
      <span class="hfake" id="fake-url" title="Endereço de disfarce exibido nesta aba">🔒 win10bet.windows/core</span>
      <select class="hsel" id="mirror-sel" title="Trocar servidor/CDN"></select>
      <button class="hbtn" id="hud-reload" title="Recarregar jogo">↻</button>
      <button class="hbtn" id="hud-fs" title="Tela cheia">⛶ Tela Cheia</button>
      <button class="hbtn" id="hud-dl" title="Baixar HTML offline" style="display:none">↓ Offline</button>
      <button class="hbtn" id="hud-panic" title="Disfarce de estudo (F9)">📘 Estudo</button>
      <button class="hbtn" id="hud-close" title="Fechar aba">✕</button>
    </div>
  </div>

  <div id="study-mask">
    <div class="sm-box">
      <span class="sm-tag">Matemática · Revisão ENEM & Vestibular</span>
      <h1>Estudo das Funções Quadráticas e Vértice da Parábola</h1>
      <p>Toda função polinomial do 2º grau é definida por <strong>f(x) = ax² + bx + c</strong>, com <em>a, b, c ∈ ℝ</em> e <em>a ≠ 0</em>. Seu gráfico no plano cartesiano corresponde a uma parábola cuja concavidade depende do sinal do coeficiente <em>a</em>.</p>
      <div class="sm-formula">Δ = b² − 4ac &nbsp;&nbsp;|&nbsp;&nbsp; x = (−b ± √Δ) / 2a &nbsp;&nbsp;|&nbsp;&nbsp; V = (−b/2a, −Δ/4a)</div>
      <p><strong>Exercício resolvido:</strong> Determine o valor máximo da função <em>f(x) = −x² + 8x − 12</em>. Como <em>a = −1 &lt; 0</em>, a parábola possui ponto de máximo em <em>yᵥ = −Δ / 4a = −(64 − 48) / (−4) = 4</em>, atingido quando <em>xᵥ = 4</em>.</p>
      <p style="font-size:12px;color:#94a3b8;margin-top:22px;cursor:pointer" id="sm-back">Caderno de Estudos · Pressione F9 ou clique duas vezes aqui para retornar à atividade.</p>
    </div>
  </div>

<script>
(function(){
  const CFG = ${payload};
  let frame = document.getElementById('game-iframe');
  const loader = document.getElementById('loader');
  const lstatus = document.getElementById('lstatus');
  const pfill = document.getElementById('pfill');
  const lactions = document.getElementById('lactions');
  const gtitle = document.getElementById('gtitle');
  const hud = document.getElementById('hud');
  const sel = document.getElementById('mirror-sel');
  const dlBtn = document.getElementById('hud-dl');
  const mask = document.getElementById('study-mask');

  gtitle.textContent = CFG.gameName;
  if (!CFG.showHud) hud.style.display = 'none';

  // DISGUISE: never display the real host/URL anywhere in this tab.
  // Servers get generic names and the HUD shows a fake, non-existent address.
  let _h = 0; for (const ch of CFG.gameName) _h = ((_h * 31) + ch.charCodeAt(0)) >>> 0;
  const fakeEl = document.getElementById('fake-url');
  if (fakeEl) fakeEl.textContent = '🔒 win10bet.windows/core/aula-' + (_h % 9000 + 1000);
  const serverName = (idx) => 'Servidor ' + (idx + 1);

  CFG.candidates.forEach((c, idx) => {
    const opt = document.createElement('option');
    opt.value = String(idx);
    opt.textContent = serverName(idx) + (c.type === 'iframe' ? ' · web' : ' · app');
    sel.appendChild(opt);
  });

  let curIdx = CFG.startIndex || 0;
  let lastPreparedHtml = '';
  let fadeTimer = null;

  function scheduleHudFade() {
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(() => { hud.classList.add('faded'); hud.classList.add('collapsed'); }, 4500);
  }

  function computeBase(url, html) {
    const folder = url.substring(0, url.lastIndexOf('/') + 1);
    const m = html.match(/<base\\b[^>]*\\bhref\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s">]+))[^>]*>/i);
    const decl = m ? (m[1] !== undefined ? m[1] : m[2] !== undefined ? m[2] : m[3]) : '';
    if (!decl) return folder;
    try { return new URL(decl, folder).href; } catch (_) { return folder; }
  }

  function prepareHtml(rawHtml, sourceUrl) {
    let html = rawHtml;
    // Strip known intrusive ad-network loader if present
    html = html.replace(/<script[^>]*js\\.rev\\.iq[^>]*><\\/script>/gi, '');
    html = html.replace(/<script[^>]*universal\\.wgplayer\\.com[^>]*><\\/script>/gi, '');
    const baseTag = '<base href="' + computeBase(sourceUrl, html) + '">';
    if (/<base\\b[^>]*>/i.test(html)) {
      html = html.replace(/<base\\b[^>]*>/i, baseTag);
    } else if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, m => m + baseTag);
    } else if (/<html[^>]*>/i.test(html)) {
      html = html.replace(/<html[^>]*>/i, m => m + '<head>' + baseTag + '</head>');
    } else {
      html = baseTag + html;
    }
    return html;
  }

  function resetFrame() {
    const nf = document.createElement('iframe');
    nf.id = 'game-iframe';
    nf.setAttribute('referrerpolicy', 'no-referrer');
    nf.setAttribute('allow', 'autoplay; fullscreen; gamepad; pointer-lock; clipboard-read; clipboard-write; accelerometer; gyroscope; midi');
    nf.setAttribute('allowfullscreen', '');
    frame.replaceWith(nf);
    frame = nf;
    return nf;
  }

  function finishLoad() {
    pfill.style.width = '100%';
    setTimeout(() => {
      loader.classList.add('done');
      scheduleHudFade();
      try { frame.focus(); } catch (_) {}
    }, 180);
  }

  async function fetchWithTimeout(url, ms) {
    const ac = new AbortController();
    const tid = setTimeout(() => ac.abort(), ms);
    try {
      const r = await fetch(url, { signal: ac.signal, cache: 'default' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const txt = await r.text();
      if (!txt || txt.trim().length < 24) throw new Error('Resposta vazia');
      return txt;
    } finally {
      clearTimeout(tid);
    }
  }

  async function loadCandidate(index, allowAutoFailover) {
    curIdx = ((index % CFG.candidates.length) + CFG.candidates.length) % CFG.candidates.length;
    sel.value = String(curIdx);
    const cand = CFG.candidates[curIdx];
    loader.classList.remove('done');
    lactions.style.display = 'none';
    dlBtn.style.display = 'none';
    lastPreparedHtml = '';
    pfill.style.width = '24%';
    lstatus.textContent = 'Conectando via ' + serverName(curIdx) + '...';

    const nf = resetFrame();

    if (cand.type === 'html') {
      const chain = allowAutoFailover
        ? [curIdx, ...CFG.candidates.map((_, i) => i).filter(i => i !== curIdx)]
        : [curIdx];

      for (let step = 0; step < chain.length; step++) {
        const idx = chain[step];
        const item = CFG.candidates[idx];
        curIdx = idx;
        sel.value = String(idx);
        pfill.style.width = Math.min(88, 22 + step * 12) + '%';
        lstatus.textContent = step === 0
          ? 'Carregando ' + CFG.gameName + ' (' + item.label + ')...'
          : 'Alternando para mirror ' + item.label + '...';

        if (item.type === 'iframe') {
          loadIframeDirect(nf, item);
          return;
        }
        try {
          const raw = await fetchWithTimeout(item.url, 14000);
          const ready = prepareHtml(raw, item.url);
          lastPreparedHtml = ready;
          dlBtn.style.display = 'inline-block';
          pfill.style.width = '94%';
          lstatus.textContent = 'Iniciando no iframe about:blank...';
          const doc = nf.contentDocument || (nf.contentWindow && nf.contentWindow.document);
          if (doc) {
            doc.open();
            doc.write(ready);
            doc.close();
          } else {
            nf.srcdoc = ready;
          }
          finishLoad();
          return;
        } catch (err) {
          // Try next CDN automatically
        }
      }

      lstatus.textContent = 'Não foi possível conectar aos servidores CDN nesta rede. Tente trocar o mirror abaixo.';
      pfill.style.width = '0%';
      lactions.style.display = 'flex';
    } else {
      loadStealthFirst(nf, cand);
    }
  }

  // STEALTH MODE: fetch the page and inject it via srcdoc, so the frame's own
  // URL is "about:srcdoc" and the real host never appears as the frame address,
  // in the tab, or anywhere in the UI. If the site cannot run injected
  // (Service Worker / WebGPU / SharedArrayBuffer / CORS), fall back to direct.
  async function loadStealthFirst(nf, cand) {
    pfill.style.width = '46%';
    lstatus.textContent = 'Abrindo em modo disfarçado (about:blank)...';
    try {
      const raw = await fetchWithTimeout(cand.url, 12000);
      if (!/<(html|head|body|div|canvas|script)/i.test(raw)) throw new Error('not html');
      const ready = prepareHtml(raw, cand.url);
      lastPreparedHtml = ready;
      dlBtn.style.display = 'inline-block';
      nf.removeAttribute('src');
      nf.srcdoc = ready;
      pfill.style.width = '82%';
      finishLoad();
      setTimeout(() => {
        try {
          const d = nf.contentDocument;
          if (!d || !d.body) return;
          const txt = (d.body.innerText || '').slice(0, 600);
          const hasContent = !!d.querySelector('canvas, iframe, img, video, svg, button, input, [id], [class]');
          const broke = /sharedarraybuffer|service ?worker|cross-origin isolat|failed to load|error occurred|not supported in this browser/i.test(txt);
          if (broke || (!hasContent && txt.trim().length < 3)) {
            const nf2 = resetFrame();
            loadIframeDirect(nf2, cand);
          }
        } catch (_) {}
      }, 5000);
    } catch (_) {
      loadIframeDirect(nf, cand);
    }
  }

  function loadIframeDirect(nf, cand) {
    let settled = false;
    pfill.style.width = '68%';
    lstatus.textContent = 'Abrindo ' + serverName(curIdx) + ' no iframe about:blank...';
    const fallbackTimer = setTimeout(() => {
      if (!settled) { settled = true; finishLoad(); }
    }, 3200);
    nf.addEventListener('load', () => {
      if (!settled) { settled = true; clearTimeout(fallbackTimer); finishLoad(); }
    }, { once: true });
    nf.src = cand.url;
  }

  document.getElementById('hud-toggle').onclick = () => hud.classList.toggle('collapsed');
  sel.onchange = () => loadCandidate(Number(sel.value), false);
  document.getElementById('hud-reload').onclick = () => loadCandidate(curIdx, false);
  document.getElementById('btn-retry').onclick = () => loadCandidate(curIdx, true);
  document.getElementById('btn-next-mirror').onclick = () => loadCandidate(curIdx + 1, false);
  document.getElementById('hud-fs').onclick = () => {
    const el = frame.requestFullscreen ? frame : document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  };
  dlBtn.onclick = () => {
    if (!lastPreparedHtml) return;
    const b = new Blob([lastPreparedHtml], { type: 'text/html;charset=utf-8' });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = u;
    a.download = (CFG.gameName.replace(/[^a-z0-9-_ ]/gi, '').trim() || 'atividade') + '.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 3000);
  };
  document.getElementById('hud-panic').onclick = () => mask.classList.toggle('on');
  document.getElementById('sm-back').ondblclick = () => mask.classList.remove('on');
  document.getElementById('hud-close').onclick = () => window.close();
  window.addEventListener('keydown', (e) => {
    if (e.key === 'F9') { e.preventDefault(); mask.classList.toggle('on'); }
  });

  loadCandidate(curIdx, true);
})();
<\/script>
</body>
</html>`;
  }

  function openInAboutBlank(options) {
    const candidates = options.candidates || [];
    if (!candidates.length) {
      if (global.UI) global.UI.toast('Nenhum link disponível para este jogo.', 'warn');
      return null;
    }

    const win = global.open('about:blank', '_blank');
    if (!win) {
      if (global.UI && global.UI.showPopupBlockedPrompt) {
        global.UI.showPopupBlockedPrompt(options);
      } else if (global.UI) {
        global.UI.toast('O navegador bloqueou o pop-up! Permita pop-ups para abrir em about:blank.', 'warn');
      }
      return null;
    }

    const cloak = global.CloakManager
      ? global.CloakManager.getActiveCloak()
      : { title: 'Estudo Escolar — Atividade', icon: '' };

    const html = buildAboutBlankShell({
      gameName: options.gameName,
      cloakTitle: cloak.title,
      cloakIcon: cloak.icon,
      candidates,
      showHud: hudEnabled,
      startIndex: options.startIndex || 0
    });

    try {
      win.document.open();
      win.document.write(html);
      win.document.close();
    } catch (_) {
      // Fallback if browser restricts writing
      win.location.href = candidates[0].url;
    }

    if (global.SoundFX) global.SoundFX.launch();
    startSessionTracker(win);
    return win;
  }

  async function downloadGameOffline(game) {
    const candidates = buildGameCandidates(game).filter(c => c.type === 'html');
    if (!candidates.length) {
      if (global.UI) global.UI.toast('Este jogo roda via servidor direto; abra em about:blank para jogar!', 'info');
      return;
    }
    if (global.UI) global.UI.toast(`Preparando download offline de ${game.n}...`, 'info');
    for (const c of candidates.slice(0, 5)) {
      try {
        const r = await fetch(c.url);
        if (!r.ok) continue;
        let html = await r.text();
        if (!html || html.length < 30) continue;
        const folder = c.url.substring(0, c.url.lastIndexOf('/') + 1);
        const m = html.match(/<base\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s">]+))[^>]*>/i);
        const decl = m ? (m[1] ?? m[2] ?? m[3]) : '';
        let baseHref = folder;
        if (decl) { try { baseHref = new URL(decl, folder).href; } catch (_) {} }
        const tag = `<base href="${baseHref}">`;
        html = /<base\b[^>]*>/i.test(html)
          ? html.replace(/<base\b[^>]*>/i, tag)
          : html.replace(/<head[^>]*>/i, x => x + tag);
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${game.n.replace(/[^a-z0-9-_ ]/gi, '').trim() || 'jogo'}.html`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        if (global.UI) global.UI.toast(`Download de ${game.n}.html iniciado!`, 'success');
        return;
      } catch (_) {}
    }
    if (global.UI) global.UI.toast('Não foi possível baixar agora. Tente abrir em about:blank.', 'warn');
  }

  global.GameLauncher = {
    setCdnConfig(cfg) {
      if (cfg && typeof cfg === 'object') cdnConfig = { ...cdnConfig, ...cfg };
    },
    configure(opts = {}) {
      if (typeof opts.preferredCdnIdx === 'number') preferredCdnIdx = opts.preferredCdnIdx;
      if (typeof opts.hudEnabled === 'boolean') hudEnabled = opts.hudEnabled;
    },
    getCdnProviders() {
      return cdnConfig.jsdelivr.map((url, idx) => {
        let host = url;
        try { host = new URL(url).hostname; } catch (_) {}
        return { idx, host, url };
      });
    },
    resolveCoverUrls,
    buildGameCandidates,
    launchGame(game, mirrorIndex = 0) {
      if (!game) return null;
      const candidates = buildGameCandidates(game);
      const win = openInAboutBlank({
        gameName: game.n,
        candidates,
        startIndex: mirrorIndex
      });
      if (win && global.ProfileStore) {
        global.ProfileStore.recordLaunch(game);
      }
      if (win && global.UI) {
        global.UI.toast(`Abrindo "${game.n}" em about:blank`, 'success');
      }
      return win;
    },
    launchPortal(portal, mirrorIndex = 0) {
      if (!portal || !Array.isArray(portal.mirrors)) return null;
      const candidates = portal.mirrors.map(m => ({
        label: m.label,
        url: m.url,
        type: m.type || 'iframe'
      }));
      const win = openInAboutBlank({
        gameName: portal.name,
        candidates,
        startIndex: mirrorIndex
      });
      if (win && global.ProfileStore) {
        global.ProfileStore.recordLaunch({ id: portal.id, n: portal.name, k: [] });
      }
      if (win && global.UI) {
        global.UI.toast(`Portal "${portal.name}" aberto em about:blank`, 'success');
      }
      return win;
    },
    launchRawOption(options) {
      return openInAboutBlank(options);
    },
    downloadGameOffline
  };
})(window);
