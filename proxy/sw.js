/*
 * Service worker ÚNICO do proxy.
 * Registra Scramjet v2 e Ultraviolet no mesmo escopo (.../proxy/):
 *  - URLs em  service/scramjet/  -> Scramjet
 *  - URLs em  service/uv/        -> Ultraviolet (ele registra o próprio listener)
 * Os prefixos são diferentes, então os dois convivem sem conflito.
 *
 * IMPORTANTE: nunca abrir o IndexedDB do Scramjet para requisições comuns.
 * Quem cria o banco (com as tabelas) é a página, no controller.init();
 * se o SW abrir antes, cria um banco vazio e o init quebra com
 * "One of the specified object stores was not found".
 */
importScripts("scramjet/scramjet.all.js");
importScripts("uv/uv.bundle.js");
importScripts("uv/uv.config.js");
importScripts("uv/uv.sw.js"); // o UV adiciona o listener de fetch dele

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();
const UV_PREFIX = self.__uv$config.prefix;
const SW_DIR = self.location.pathname.slice(0, self.location.pathname.lastIndexOf("/") + 1);
const SJ_PREFIX = SW_DIR + "service/scramjet/";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", async (event) => {
  const url = new URL(event.request.url);
  // O Ultraviolet cuida das URLs dele (listener próprio acima).
  if (event.request.url.startsWith(self.location.origin + UV_PREFIX)) return;
  // Só rotas do Scramjet (e o .wasm dele) podem tocar na configuração/IDB.
  const isScramjet =
    url.pathname.startsWith(SJ_PREFIX) || url.pathname.endsWith("scramjet.wasm.wasm");
  if (!isScramjet) return;
  try {
    await scramjet.loadConfig();
    if (scramjet.config && scramjet.route(event)) {
      event.respondWith(scramjet.fetch(event));
    }
  } catch (err) {
    event.respondWith(fetch(event.request));
  }
});
