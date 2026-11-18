/*
 * Backend mínimo do proxy — Bare (v3) + WISP no mesmo servidor.
 * Rode local:  npm install && npm start     (porta 8080 ou $PORT)
 * No Render:   ele usa a porta da variável $PORT automaticamente.
 *
 * Endpoints:
 *   /bare/   -> protocolo Bare (fallback do Ultraviolet)
 *   /wisp/   -> protocolo WISP (Scramjet + transports epoxy/libcurl) via WebSocket
 */
import http from "node:http";
import { createBareServer } from "@tomphttp/bare-server-node";
import wisp from "wisp-server-node";

const PORT = process.env.PORT || 8080;
const bare = createBareServer("/bare/");

const server = http.createServer((req, res) => {
  if (bare.shouldRoute(req)) {
    bare.routeRequest(req, res);
    return;
  }
  if (req.url === "/" || req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("ok — bare em /bare/ · wisp em /wisp/\n");
    return;
  }
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("not found");
});

server.on("upgrade", (req, socket, head) => {
  if (req.url.startsWith("/wisp/")) {
    wisp.routeRequest(req, socket, head);
  } else if (bare.shouldRoute(req)) {
    bare.routeUpgrade(req, socket, head);
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log("proxy backend ouvindo na porta " + PORT);
});
