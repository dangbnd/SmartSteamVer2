#!/usr/bin/env node

const childProcess = require("child_process");
const fs = require("fs");
const http = require("http");
const net = require("net");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "..");
const defaultPaths = [
  "/vi/welcome/",
  "/vi/products/",
  "/vi/product/kikibot/",
  "/vi/projects/",
  "/vi/project/summer-stem-expo-2026/",
  "/vi/tutorials/",
  "/vi/tutorial/bien-tro-lap-trinh-arduino/",
  "/vi/news/",
  "/vi/news/giao-duc-stem-va-steam-vai-tro-va-tam-quan-trong-trong-the-ky-21/",
  "/vi/policy/",
  "/vi/policy/thanh-toan-va-dat-lich/",
  "/vi/contact/",
];
const smokePaths = (process.env.SMOKE_PATHS || defaultPaths.join(",")).split(",").map((item) => item.trim()).filter(Boolean);
const WebSocketImpl = global.WebSocket;
const pagesWithDataPreloads = new Set(["products", "product-detail", "projects", "project-detail", "tutorials", "tutorial-detail", "news", "news-detail", "policy", "policy-detail"]);

if (!WebSocketImpl) {
  console.error("smoke-site needs Node with global WebSocket support");
  process.exit(1);
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

function httpJson(url, method = "GET") {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method }, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error(`Invalid JSON from ${url}: ${data.slice(0, 160)}`));
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findChromium() {
  const candidates = [
    process.env.CHROME_BIN,
    "chromium",
    "chromium-browser",
    "google-chrome",
    "/snap/bin/chromium",
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (path.isAbsolute(candidate) && fs.existsSync(candidate)) return candidate;
    const result = childProcess.spawnSync("which", [candidate], { encoding: "utf8" });
    const found = String(result.stdout || "").trim().split("\n")[0];
    if (result.status === 0 && found) return found;
  }
  return null;
}

function startStaticServer() {
  const server = http.createServer((req, res) => {
    try {
      const parsed = new URL(req.url, "http://127.0.0.1");
      let requestPath = decodeURIComponent(parsed.pathname);
      if (requestPath.endsWith("/")) requestPath += "index.html";
      const resolved = path.resolve(root, requestPath.replace(/^\/+/, ""));
      if (!resolved.startsWith(root)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }
      const ext = path.extname(resolved).toLowerCase();
      res.writeHead(200, { "content-type": mimeTypes[ext] || "application/octet-stream" });
      fs.createReadStream(resolved).pipe(res);
    } catch (error) {
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end(String(error && error.stack || error));
    }
  });
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function waitForCdp(port) {
  const endpoint = `http://127.0.0.1:${port}/json/version`;
  for (let i = 0; i < 80; i += 1) {
    try {
      await httpJson(endpoint);
      return;
    } catch (error) {
      await delay(100);
    }
  }
  throw new Error("Chromium CDP did not start");
}

async function closeBrowser(cdpPort) {
  const version = await httpJson(`http://127.0.0.1:${cdpPort}/json/version`);
  if (!version.webSocketDebuggerUrl) return;
  const ws = new WebSocketImpl(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  ws.send(JSON.stringify({ id: 1, method: "Browser.close" }));
  await delay(500);
  try {
    ws.close();
  } catch (error) {}
}

async function smokePage(cdpPort, baseUrl, pagePath) {
  const target = await httpJson(`http://127.0.0.1:${cdpPort}/json/new?${encodeURIComponent(baseUrl + pagePath)}`, "PUT");
  const ws = new WebSocketImpl(target.webSocketDebuggerUrl);
  const pending = new Map();
  const events = [];
  let id = 0;

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id).resolve(msg.result);
      pending.delete(msg.id);
      return;
    }
    if (msg.method === "Runtime.consoleAPICalled") {
      const text = (msg.params.args || []).map((arg) => arg.value || arg.description || "").join(" ");
      if (msg.params.type === "error" || msg.params.type === "warning") events.push({ type: msg.params.type, text });
    }
    if (msg.method === "Runtime.exceptionThrown") {
      events.push({ type: "exception", text: msg.params.exceptionDetails && msg.params.exceptionDetails.text || "exception" });
    }
    if (msg.method === "Log.entryAdded") {
      const entry = msg.params.entry;
      if (entry.level === "error") events.push({ type: "log", text: entry.text });
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const message = { id: ++id, method, params };
      pending.set(message.id, { resolve, reject });
      ws.send(JSON.stringify(message));
    });
  }

  await send("Runtime.enable");
  await send("Log.enable");
  await send("Page.enable");
  await send("Page.navigate", { url: baseUrl + pagePath });
  await delay(Number(process.env.SMOKE_WAIT_MS || 4500));

  const result = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `new Promise((resolve) => {
      const read = () => ({
        title: document.title,
        page: document.body && document.body.dataset.page || "",
        ready: document.body && document.body.classList.contains("is-ready"),
        shell: document.body && document.body.classList.contains("is-shell-visible"),
        hero: document.body && document.body.classList.contains("is-hero-visible"),
        preloader: !!document.querySelector(".js-preloader"),
        transition: !!document.querySelector(".js-transition-layer.is-open"),
        renderer: document.querySelector("canvas[data-renderer]")?.dataset.renderer || "",
        perf: document.querySelector("canvas[data-performance-mode]")?.dataset.performanceMode || document.body?.dataset.performanceMode || "",
        preloadHints: document.querySelectorAll('link[data-smartsteam-preload="hero"]').length,
        dataPreloadHints: document.querySelectorAll('link[data-smartsteam-preload="data"]').length,
        heroImageLoaded: (() => {
          const img = document.querySelector('[data-stage="hero"] img') || document.querySelector('.product-detail-hero img') || document.querySelector('.knowledge-detail img');
          return !img || img.dataset.mediaLoaded === "true" || Boolean(img.complete && img.naturalWidth);
        })(),
        cards: document.querySelectorAll(".galaxy-card").length,
        rootChildren: document.querySelector(".js-page-root")?.children.length || 0
      });
      const initial = read();
      if (initial.page !== "products") {
        resolve(initial);
        return;
      }
      const sphere = document.querySelector(".js-galaxy-sphere");
      const beforeTransform = sphere ? sphere.style.transform : "";
      window.setTimeout(() => {
        const after = read();
        after.motionChanged = Boolean(sphere && beforeTransform !== sphere.style.transform);
        after.loadedProductImages = document.querySelectorAll(".galaxy-card img[data-media-loaded='true']").length;
        resolve(after);
      }, 800);
    })`,
  });

  ws.close();
  await httpJson(`http://127.0.0.1:${cdpPort}/json/close/${target.id}`).catch(() => {});

  const state = result && result.result && result.result.value || {};
  const filteredEvents = events.filter((event) => !/favicon/i.test(event.text));
  const failures = [];
  if (!state.ready || !state.shell || !state.hero) failures.push("page did not reach ready/shell/hero state");
  if (state.preloader) failures.push("preloader still mounted");
  if (state.preloadHints !== 1) failures.push("hero preload hint missing or duplicated");
  if (pagesWithDataPreloads.has(state.page) && state.dataPreloadHints < 1) failures.push("data preload hint missing");
  if (!state.heroImageLoaded) failures.push("hero image did not finish loading");
  if (state.page === "products" && state.cards > 0 && !state.motionChanged) failures.push("product sphere did not advance");
  if (filteredEvents.length) failures.push(`console events: ${filteredEvents.map((event) => `${event.type}:${event.text}`).join(" | ")}`);

  return { path: pagePath, state, failures };
}

async function main() {
  const chromium = findChromium();
  if (!chromium) throw new Error("Chromium not found. Set CHROME_BIN=/path/to/chrome.");

  const staticServer = await startStaticServer();
  const staticPort = staticServer.address().port;
  const baseUrl = `http://127.0.0.1:${staticPort}`;
  const cdpPort = await getFreePort();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "smartsteam-smoke-"));
  const chromiumProcess = childProcess.spawn(chromium, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    `--user-data-dir=${userDataDir}`,
    `--remote-debugging-port=${cdpPort}`,
    "about:blank",
  ], { stdio: "ignore" });
  chromiumProcess.unref();

  const cleanup = () => {
    staticServer.close();
    try {
      if (!chromiumProcess.killed) chromiumProcess.kill("SIGTERM");
    } catch (error) {}
    fs.rmSync(userDataDir, { recursive: true, force: true });
  };

  try {
    await waitForCdp(cdpPort);
    const results = [];
    for (const pagePath of smokePaths) {
      const result = await smokePage(cdpPort, baseUrl, pagePath);
      results.push(result);
      console.log(`${result.failures.length ? "FAIL" : "ok"} ${pagePath} ${JSON.stringify(result.state)}`);
    }
    const failed = results.filter((result) => result.failures.length);
    if (failed.length) {
      failed.forEach((result) => {
        console.error(`${result.path}: ${result.failures.join("; ")}`);
      });
      process.exitCode = 1;
    }
  } finally {
    await closeBrowser(cdpPort).catch(() => {});
    cleanup();
  }
}

main().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
