#!/usr/bin/env node
/**
 * Local dev server with live episode discovery.
 * New folders under episodes/ with text.md appear after a browser refresh — no manifest step.
 */

const fs = require("fs");
const http = require("http");
const path = require("path");
const { buildEpisodesManifest } = require("./lib/episodes_manifest");

const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT || 8000);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".md": "text/markdown; charset=utf-8",
  ".ico": "image/x-icon",
};

const resolveFilePath = (urlPath) => {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const relative = decoded.replace(/^\/+/, "") || "index.html";
  const filePath = path.resolve(ROOT, relative);
  if (!filePath.startsWith(ROOT)) {
    return null;
  }
  return filePath;
};

const sendFile = (res, filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(error.code === "ENOENT" ? 404 : 500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(error.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }

    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": ext === ".html" || ext === ".js" || ext === ".json" || ext === ".md"
        ? "no-store"
        : "public, max-age=3600",
    });
    res.end(data);
  });
};

const server = http.createServer((req, res) => {
  const urlPath = req.url || "/";

  if (urlPath.split("?")[0] === "/episodes.json") {
    const manifest = buildEpisodesManifest(ROOT);
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(`${JSON.stringify(manifest, null, 2)}\n`);
    return;
  }

  const filePath = resolveFilePath(urlPath);
  if (!filePath) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    if (stats.isDirectory()) {
      const indexPath = path.join(filePath, "index.html");
      if (fs.existsSync(indexPath)) {
        sendFile(res, indexPath);
        return;
      }
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    sendFile(res, filePath);
  });
});

server.listen(PORT, () => {
  const count = buildEpisodesManifest(ROOT).length;
  console.log(`MenaTeleCom dev server: http://localhost:${PORT}`);
  console.log(`Live episode discovery — ${count} episode(s) found in episodes/`);
  console.log("Add a folder with text.md, then refresh the browser.");
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Stop the other server or run PORT=${PORT + 1} npm start`);
    process.exit(1);
  }
  console.error(error);
  process.exit(1);
});
