/*
 * Estudo Escolar — Proxy (Scramjet v2 + Ultraviolet) — configuração
 * ----------------------------------------------------------------
 * Tudo é calculado a partir da URL atual (sem localhost fixo), então
 * funciona igual em GitHub Pages (/estudoescolar/proxy/), em servidor
 * local (npx serve) ou na raiz de qualquer domínio.
 *
 * PARA USAR SEU PRÓPRIO BACKEND: suba a pasta /backend no Render e
 * troque WISP_SERVERS[0] pela sua URL, ex.: "wss://meu-proxy.onrender.com/wisp/"
 */
(function () {
  "use strict";
  var base = new URL(".", location.href); // .../proxy/
  var basePath = base.pathname;

  window.PROXY_CONFIG = {
    // Página que já vem preenchida no formulário
    target: "https://tavvkkj.xyz/venice/original",

    base: base.href,
    basePath: basePath,

    // Service worker único (registra Scramjet + UV), escopo = esta pasta
    swScript: new URL("sw.js?v=3", base).href, // ?v= força o navegador a pegar o SW novo
    swScope: basePath,

    // Prefixos (ficam dentro do escopo do SW)
    scramjetPrefix: basePath + "service/scramjet/",
    uvPrefix: basePath + "service/uv/",

    // Arquivos do Scramjet v2 (@mercuryworkshop/scramjet)
    scramjetFiles: {
      wasm: new URL("scramjet/scramjet.wasm.wasm", base).href,
      all: new URL("scramjet/scramjet.all.js", base).href,
      sync: new URL("scramjet/scramjet.sync.js", base).href,
    },

    // BareMux + transports (epoxy = WISP moderno; libcurl = WISP legado)
    baremuxModule: new URL("baremux/index.mjs", base).href,
    baremuxWorker: new URL("baremux/worker.js", base).href,
    transports: {
      epoxy: new URL("transports/epoxy/index.mjs", base).href,
      libcurl: new URL("transports/libcurl/index.mjs", base).href,
    },
    transport: "epoxy", // transporte padrão

    // Servidores WISP públicos (o 1º é o oficial da Mercury Workshop).
    // Se um cair, o código tenta o próximo automaticamente.
    wispServers: [
      "wss://wisp.mercuryworkshop.me/",
      // "wss://SEU-BACKEND.onrender.com/wisp/",  // <- seu backend (pasta /backend)
    ],

    // Fallback Bare (protocolo antigo, usado só se o WISP falhar no UV).
    // Bare público vive caindo; o caminho confiável é o backend próprio.
    bareServers: [
      // "https://SEU-BACKEND.onrender.com/bare/",
    ],
  };
})();
