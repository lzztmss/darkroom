import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const experimentRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const publicRoot = resolve(experimentRoot, "public");
const port = Number(process.env.PHOTO_MENTOR_EVAL_PORT ?? 4173);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
};

function safePath(root, relativePath) {
  const target = resolve(root, `.${relativePath}`);
  return target === root || target.startsWith(`${root}${sep}`) ? target : null;
}

createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const isSource = url.pathname.startsWith("/src/");
  const root = isSource ? experimentRoot : publicRoot;
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = safePath(root, pathname);

  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": mimeTypes[extname(filePath)] ?? "application/octet-stream",
    "cache-control": "no-store",
  });
  createReadStream(filePath).pipe(response);
}).listen(port, "127.0.0.1", () => {
  console.log(`AI 摄影分析实验台：http://127.0.0.1:${port}`);
});
