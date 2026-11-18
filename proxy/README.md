# Proxy — Scramjet v2 + Ultraviolet (fallback)

Página estática em `/proxy/` que abre sites através de proxy no navegador,
em janela `about:blank` disfarçada. Feita para GitHub Pages (só arquivos
estáticos): o tráfego passa por um servidor **WISP** (WebSocket) público ou
pelo seu próprio backend.

## Estrutura

```
proxy/
  index.html          página (campo de URL + botões Abrir / Abrir alternativo)
  config.js           WISP, transports, prefixos — tudo relativo, sem localhost
  sw.js               service worker único: registra Scramjet + UV no mesmo escopo
  scramjet/           Scramjet v2 (@mercuryworkshop/scramjet): all/sync/wasm
  uv/                 Ultraviolet 3.2.10: bundle/handler/client/sw + uv.config.js dinâmico
  baremux/            @mercuryworkshop/bare-mux (index.mjs + worker.js)
  transports/epoxy/   transporte WISP moderno
  transports/libcurl/ transporte WISP legado
backend/              servidor Bare+WISP opcional p/ Render (server.js, 1 clique)
```

## Checklist (em ordem)

1. **Conferir os arquivos vendorizados** (já estão no repo; para atualizar):
   - Scramjet: `npm pack @mercuryworkshop/scramjet` → copiar `dist/scramjet.all.js`,
     `dist/scramjet.sync.js` e `dist/scramjet.wasm.wasm` para `proxy/scramjet/`.
   - Ultraviolet: `npm pack @titaniumnetwork-dev/ultraviolet` → copiar
     `dist/uv.bundle.js`, `uv.handler.js`, `uv.client.js`, `uv.sw.js` para `proxy/uv/`
     (o `uv.config.js` do repo é dinâmico — **não** sobrescreva pelo do pacote).
   - BareMux/transports: idem para `baremux/` e `transports/` (dist `index.mjs`/`worker.js`).
2. **Testar local**: na raiz do repo rode `npx serve .` (ou `python3 -m http.server`)
   e abra `http://localhost:3000/proxy/` → clique em **Abrir**. Service worker
   exige `localhost` ou HTTPS — abrir via `file://` não funciona.
3. **Publicar**: o GitHub Pages do repo já serve a raiz, então `proxy/` entra
   sozinho no próximo deploy (`https://sitesforschoolfr.github.io/estudoescolar/proxy/`).
   Não precisa mudar nada nas configurações do Pages (branch `main`, pasta `/root`).
4. **Usar**: o campo já vem com `https://tavvkkj.xyz/venice/original`.
   - **Abrir** = Scramjet (principal). **Abrir (alternativo)** = Ultraviolet.
   - Se um WISP público cair, troque o transporte para Libcurl ou suba o backend.

## Se o WISP público cair → backend próprio (Render, grátis)

1. Clique para implantar (usa o `backend/render.yaml` deste repo):
   <https://render.com/deploy?repo=https://github.com/SitesForSchoolFR/estudoescolar>
2. Depois do deploy, abra `proxy/config.js` e troque o primeiro item de
   `wispServers` para `wss://SEU-APP.onrender.com/wisp/` (e, se quiser, o
   `bareServers` para `https://SEU-APP.onrender.com/bare/`).
3. Faça commit — pronto. (Plano free do Render "dorme" após inatividade:
   a primeira abertura pode demorar ~1 min.)

## Notas técnicas

- O `sw.js` registra os dois motores no mesmo escopo com prefixos separados
  (`service/scramjet/` e `service/uv/`), sem conflito de `respondWith`.
- Scramjet e UV 3.2 compartilham o transporte via **BareMux**: quem escolhe
  epoxy/libcurl e o WISP é a página — vale para os dois motores.
- Nenhum caminho é fixo: `config.js` e `uv/uv.config.js` derivam tudo da URL
  atual, então funciona em subpasta do Pages, domínio próprio ou `npx serve`.
