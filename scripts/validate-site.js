#!/usr/bin/env node

const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const errors = [];
const warnings = [];

function rel(file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function existsPublic(urlPath) {
  const clean = String(urlPath || "").split("?")[0].split("#")[0];
  if (!clean || clean === "/" || clean.endsWith("/")) return true;
  const target = path.resolve(root, clean.replace(/^\/+/, ""));
  return target.startsWith(root) && fs.existsSync(target);
}

function walk(dir, predicate, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, predicate, out);
    else if (!predicate || predicate(full)) out.push(full);
  }
  return out;
}

function checkNodeSyntax(file) {
  const result = childProcess.spawnSync(process.execPath, ["--check", path.join(root, file)], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    errors.push(`${file} syntax failed:\n${result.stderr || result.stdout}`);
  }
}

function loadData() {
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(read("assets/js/data.js"), context, { filename: "assets/js/data.js" });
  return context.window.STEM_DATA;
}

function collectMediaRefs(value, refs = new Set()) {
  if (!value) return refs;
  if (typeof value === "string") {
    if (/^\/(assets|images|uploads)\//.test(value)) refs.add(value.split("?")[0].split("#")[0]);
    return refs;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectMediaRefs(item, refs));
    return refs;
  }
  if (typeof value === "object") {
    Object.values(value).forEach((item) => collectMediaRefs(item, refs));
  }
  return refs;
}

function checkDuplicateSlugs(label, items) {
  const seen = new Map();
  for (const item of items || []) {
    const slug = item && (item.slug || item.sourceSlug || item.id);
    if (!slug) continue;
    if (!seen.has(slug)) seen.set(slug, []);
    seen.get(slug).push(item.titleVi || item.title || item.name || slug);
  }
  for (const [slug, titles] of seen.entries()) {
    if (titles.length > 1) errors.push(`${label} duplicate slug ${slug}: ${titles.join(" | ")}`);
  }
}

function checkHtmlRefs(htmlFiles) {
  const attrRe = /(?:href|src|content)=["']([^"']+)["']/g;
  let refs = 0;
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, "utf8");
    let match;
    while ((match = attrRe.exec(html))) {
      let url = match[1];
      if (url.startsWith("https://stemora.vn/")) url = url.replace("https://stemora.vn", "");
      if (!url.startsWith("/") || url.startsWith("//")) continue;
      if (/^\/(vi|en)\//.test(url) && url.endsWith("/")) continue;
      refs += 1;
      if (!existsPublic(url)) errors.push(`${rel(file)} missing local ref ${url}`);
    }
  }
  return refs;
}

function checkAssetVersion(htmlFiles, expectedVersion) {
  const versions = new Map();
  const versionRe = /\/assets\/(?:css\/main\.css|js\/(?:data|app)\.js)\?v=([^"']+)/g;
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, "utf8");
    let match;
    while ((match = versionRe.exec(html))) {
      if (!versions.has(match[1])) versions.set(match[1], []);
      versions.get(match[1]).push(rel(file));
    }
  }
  if (!versions.size) errors.push("No versioned app/data/css asset refs found in HTML");
  for (const [version, files] of versions.entries()) {
    if (version !== expectedVersion) {
      errors.push(`Asset version ${version} does not match data.js ${expectedVersion}; first file ${files[0]}`);
    }
  }
}

function checkNoLegacyDomain() {
  const legacyDomain = "ssteam" + ".netlify.app";
  const files = walk(root, (file) => {
    const name = path.basename(file);
    if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".webp") || name.endsWith(".ico")) return false;
    return true;
  });
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    if (text.includes(legacyDomain)) errors.push(`${rel(file)} still contains ${legacyDomain}`);
  }
}

function main() {
  checkNodeSyntax("assets/js/app.js");
  checkNodeSyntax("assets/js/data.js");

  const data = loadData();
  if (!data || !data.runtimeTuning || !data.runtimeTuning.assetVersion) {
    errors.push("assets/js/data.js missing runtimeTuning.assetVersion");
  }
  const expectedVersion = data.runtimeTuning.assetVersion;

  const htmlFiles = walk(root, (file) => file.endsWith(".html") && !file.includes("/assets/vendor/"));
  const htmlRefs = checkHtmlRefs(htmlFiles);
  checkAssetVersion(htmlFiles.filter((file) => /\/(vi|en)\//.test(file)), expectedVersion);

  const archivePath = path.join(root, "assets/data/archive.json");
  const archive = fs.existsSync(archivePath) ? JSON.parse(fs.readFileSync(archivePath, "utf8")) : {};
  const productsPath = path.join(root, "assets/data/products.json");
  const projectsPath = path.join(root, "assets/data/projects.json");
  const policiesPath = path.join(root, "assets/data/policies.json");
  const products = fs.existsSync(productsPath) ? JSON.parse(fs.readFileSync(productsPath, "utf8")) : [];
  const projects = fs.existsSync(projectsPath) ? JSON.parse(fs.readFileSync(projectsPath, "utf8")) : [];
  const policies = fs.existsSync(policiesPath) ? JSON.parse(fs.readFileSync(policiesPath, "utf8")) : [];
  const refs = collectMediaRefs(data);
  collectMediaRefs(archive, refs);
  collectMediaRefs(products, refs);
  collectMediaRefs(projects, refs);
  collectMediaRefs(policies, refs);
  for (const ref of refs) {
    if (!existsPublic(ref)) errors.push(`Data missing media ${ref}`);
  }

  checkDuplicateSlugs("products", products || []);
  checkDuplicateSlugs("projects", projects || []);
  checkDuplicateSlugs("policies", policies || []);
  checkDuplicateSlugs("archive tutorials", archive.tutorials || []);
  checkDuplicateSlugs("archive news", archive.news || []);

  const appJs = read("assets/js/app.js");
  if (appJs.includes('cache: "no-store"')) errors.push("assets/js/app.js still uses cache: no-store");
  if (!appJs.includes("archive.json${ASSET_VERSION}")) errors.push("archive endpoint is not versioned with ASSET_VERSION");
  if (!appJs.includes("products.json${ASSET_VERSION}")) errors.push("products endpoint is not versioned with ASSET_VERSION");
  if (!appJs.includes("projects.json${ASSET_VERSION}")) errors.push("projects endpoint is not versioned with ASSET_VERSION");
  if (!appJs.includes("policies.json${ASSET_VERSION}")) errors.push("policies endpoint is not versioned with ASSET_VERSION");

  if (!read("_headers").includes("Cache-Control")) errors.push("_headers missing Cache-Control rules");
  if (!fs.existsSync(path.join(root, ".netlifyignore"))) warnings.push(".netlifyignore missing");
  checkNoLegacyDomain();

  if (errors.length) {
    console.error("validate-site failed");
    errors.forEach((error) => console.error(`- ${error}`));
    if (warnings.length) warnings.forEach((warning) => console.warn(`warning: ${warning}`));
    process.exit(1);
  }

  console.log(`validate-site ok: html=${htmlFiles.length}, htmlRefs=${htmlRefs}, mediaRefs=${refs.size}, assetVersion=${expectedVersion}`);
  if (warnings.length) warnings.forEach((warning) => console.warn(`warning: ${warning}`));
}

main();
