/*
 * Service worker ÚNICO do proxy.
 * Registra Scramjet v2 e Ultraviolet no mesmo escopo (.../proxy/):
 *  - URLs em  service/scramjet/  -> Scramjet
 *  - URLs em  service/uv/        -> Ultraviolet (ele registra o próprio listener)
 * Os prefixos são diferentes, então os dois convivem sem conflito.
 */
importScripts("scramjet/scramjet.all.js");
importScripts("uv/uv.bundle.js");
importScripts("uv/uv.config.js");
importScripts("uv/uv.sw.js"); // o UV adiciona o listener de fetch dele

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();
const UV_PREFIX = self.__uv$config.prefix;

self.addEventListener("fetch", async (event) => {
  // O Ultraviolet cuida das URLs dele (listener próprio acima).
  if (event.request.url.startsWith(self.location.origin + UV_PREFIX)) return;
  await scramjet.loadConfig();
  if (scramjet.route(event)) {
    event.respondWith(scramjet.fetch(event));
  }
});
