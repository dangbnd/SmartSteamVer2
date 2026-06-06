#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function readJson(file, fallback) {
  const target = path.join(root, file);
  if (!fs.existsSync(target)) return fallback;
  return JSON.parse(fs.readFileSync(target, "utf8"));
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name === "index.html") out.push(full);
  }
  return out;
}

function loadCoreData() {
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(read("assets/js/data.js"), context, { filename: "assets/js/data.js" });
  return context.window.STEM_DATA || {};
}

function mediaSrc(media) {
  return typeof media === "string" ? media : media && media.src;
}

function toLocalSource(value) {
  let source = String(value || "").trim();
  if (!source) return "";
  source = source.replace(/^https?:\/\/www\.stemora\.vn/i, "");
  source = source.replace(/^https?:\/\/stemora\.vn/i, "");
  if (!/^\/(assets\/img|images|uploads)\//i.test(source)) return "";
  return source.split("#")[0].split("?")[0];
}

function localThumb(src) {
  const source = toLocalSource(src);
  if (!/^\/images\/[^/?#]+\.(?:webp|png|jpe?g)$/i.test(source)) return source;
  const thumb = source.replace(/^\/images\//i, "/images/thumbs/").replace(/\.(?:png|jpe?g|webp)$/i, ".webp");
  return fs.existsSync(path.join(root, thumb.slice(1))) ? thumb : source;
}

function versionedHref(value, version) {
  const clean = toLocalSource(value);
  if (!clean || !/\.(?:svg|webp|png|jpe?g|jfif)$/i.test(clean)) return "";
  if (!fs.existsSync(path.join(root, clean.replace(/^\/+/, "")))) return "";
  return `${clean}?v=${version}`;
}

function getTimestamp(value) {
  const time = new Date(value || "").getTime();
  return Number.isFinite(time) && time > 0 ? time : 0;
}

function getBodyPage(html) {
  const match = html.match(/<body[^>]*data-page="([^"]+)"/);
  return match ? match[1] : "";
}

function getOgImage(html) {
  const match = html.match(/<meta property="og:image" content="([^"]+)">/);
  return match ? toLocalSource(match[1]) : "";
}

function choosePreloadSource(page, ogImage, context) {
  const { data, products, projects, tutorials, news } = context;
  const defaultHero = "/assets/img/luxury-3d-chip-hero.webp";
  if (page === "welcome") return defaultHero;
  if (page === "products") return localThumb(mediaSrc((products[0] || {}).cover));
  if (page === "projects") return mediaSrc((projects[0] || {}).cover) || mediaSrc(data.siteMeta && data.siteMeta.pageAssets && data.siteMeta.pageAssets.projects);
  if (page === "tutorials") return mediaSrc((tutorials[0] || {}).cover);
  if (page === "news") return mediaSrc((news[0] || {}).cover);
  if (page === "contact") return mediaSrc(data.siteMeta && data.siteMeta.pageAssets && data.siteMeta.pageAssets.contact);
  if (page === "policy") return mediaSrc(data.siteMeta && data.siteMeta.pageAssets && data.siteMeta.pageAssets.policy);
  if (page === "policy-detail") return ogImage && ogImage !== defaultHero ? ogImage : mediaSrc(data.siteMeta && data.siteMeta.pageAssets && data.siteMeta.pageAssets.policy);
  if (page.endsWith("-detail") && ogImage && ogImage !== defaultHero) return ogImage;
  return "";
}

function shouldLoadProductsData(page) {
  return page === "products"
    || page === "product-detail"
    || page === "project-detail"
    || page === "tutorial-detail"
    || page === "news-detail";
}

function shouldLoadProjectsData(page) {
  return page === "projects" || page === "project-detail";
}

function shouldLoadPoliciesData(page) {
  return page === "policy" || page === "policy-detail";
}

function shouldLoadArchiveData(page) {
  return page === "tutorials"
    || page === "tutorial-detail"
    || page === "project-detail"
    || page === "news"
    || page === "news-detail";
}

function chooseDataPreloads(page, version) {
  const hrefs = [];
  if (shouldLoadProductsData(page)) hrefs.push(`/assets/data/products.json?v=${version}`);
  if (shouldLoadProjectsData(page)) hrefs.push(`/assets/data/projects.json?v=${version}`);
  if (shouldLoadPoliciesData(page)) hrefs.push(`/assets/data/policies.json?v=${version}`);
  if (shouldLoadArchiveData(page)) hrefs.push(`/assets/data/archive.json?v=${version}`);
  return hrefs.filter((href) => fs.existsSync(path.join(root, href.split("?")[0].replace(/^\/+/, ""))));
}

function main() {
  const data = loadCoreData();
  const version = data.runtimeTuning && data.runtimeTuning.assetVersion;
  if (!version) throw new Error("Missing runtimeTuning.assetVersion");

  const products = readJson("assets/data/products.json", []).sort((left, right) => (left.featuredOrder || 0) - (right.featuredOrder || 0));
  const projects = readJson("assets/data/projects.json", []).sort((left, right) => (left.featuredOrder || 0) - (right.featuredOrder || 0));
  const archive = readJson("assets/data/archive.json", {});
  const tutorials = (archive.tutorials || []).slice().sort((left, right) => getTimestamp(right.publishedAt) - getTimestamp(left.publishedAt));
  const news = (archive.news || []).slice().sort((left, right) => {
    if (Boolean(left.isFeatured) !== Boolean(right.isFeatured)) return Number(Boolean(right.isFeatured)) - Number(Boolean(left.isFeatured));
    return getTimestamp(right.publishedAt) - getTimestamp(left.publishedAt);
  });
  const context = { data, products, projects, tutorials, news };

  let touched = 0;
  let preloads = 0;
  let dataPreloads = 0;
  for (const htmlPath of ["vi", "en"].flatMap((dir) => walk(path.join(root, dir)))) {
    let html = fs.readFileSync(htmlPath, "utf8");
    const before = html;

    html = html.replace(/20\d{6}-smartsteam-opt-r\d+/g, version);
    html = html.replace(/(\/assets\/(?:css\/main\.css|js\/(?:data|app)\.js)\?v=)[^"']+/g, `$1${version}`);
    html = html.replace(/^\s*<link rel="preload" as="image" href="[^"]+" data-smartsteam-preload="hero">\n/mg, "");
    html = html.replace(/^\s*<link rel="preload" as="fetch" href="\/assets\/data\/[^"]+" crossorigin data-smartsteam-preload="data">\n/mg, "");

    const page = getBodyPage(html);
    const href = versionedHref(choosePreloadSource(page, getOgImage(html), context), version);
    const tags = [];
    if (href) {
      tags.push(`  <link rel="preload" as="image" href="${href}" data-smartsteam-preload="hero">`);
      preloads += 1;
    }
    for (const dataHref of chooseDataPreloads(page, version)) {
      tags.push(`  <link rel="preload" as="fetch" href="${dataHref}" crossorigin data-smartsteam-preload="data">`);
      dataPreloads += 1;
    }

    if (tags.length) {
      html = html.replace(/(  <link rel="stylesheet" href="\/assets\/css\/main\.css\?v=[^"]+">)/, `$1\n${tags.join("\n")}`);
    }

    if (html !== before) {
      fs.writeFileSync(htmlPath, html);
      touched += 1;
    }
  }

  console.log(`refresh-static-html ok: html=${touched}, preloads=${preloads}, dataPreloads=${dataPreloads}, assetVersion=${version}`);
}

main();
