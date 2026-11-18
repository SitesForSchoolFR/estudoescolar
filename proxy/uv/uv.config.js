/*
 * Ultraviolet — configuração dinâmica.
 * Funciona na página E dentro do service worker (self.location),
 * sem nenhum caminho fixo: deriva tudo da própria URL deste arquivo.
 */
/*global Ultraviolet*/
(function () {
  "use strict";
  var here = self.location.pathname; // .../proxy/uv/uv.config.js
  var uvDir = here.slice(0, here.lastIndexOf("/") + 1); // .../proxy/uv/
  var proxyBase = uvDir.slice(0, uvDir.length - "uv/".length); // .../proxy/

  self.__uv$config = {
    prefix: proxyBase + "service/uv/",
    encodeUrl: Ultraviolet.codec.xor.encode,
    decodeUrl: Ultraviolet.codec.xor.decode,
    handler: uvDir + "uv.handler.js",
    client: uvDir + "uv.client.js",
    bundle: uvDir + "uv.bundle.js",
    config: uvDir + "uv.config.js",
    sw: proxyBase + "sw.js",
  };
})();
