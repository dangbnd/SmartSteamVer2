#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const migrationDir = path.join(root, "migration-full-input");
const archiveOut = path.join(root, "assets", "data", "archive.json");

function readJson(file, fallback) {
  const target = path.join(root, file);
  if (!fs.existsSync(target)) return fallback;
  return JSON.parse(fs.readFileSync(target, "utf8"));
}

function writeJson(file, value) {
  const target = path.join(root, file);
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function decodeEntities(value) {
  const named = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    agrave: "à",
    aacute: "á",
    acirc: "â",
    egrave: "è",
    eacute: "é",
    ecirc: "ê",
    igrave: "ì",
    iacute: "í",
    ograve: "ò",
    oacute: "ó",
    ocirc: "ô",
    ugrave: "ù",
    uacute: "ú",
    yacute: "ý",
    ndash: "-",
    mdash: "-",
  };
  return String(value || "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] || match);
}

function escapeAttr(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function stripTags(value) {
  return decodeEntities(String(value || "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function normalizePublicHref(value) {
  const source = String(value || "").trim();
  if (!source || /[\u0000-\u001f<>"'`]/.test(source)) return "";
  if (/^(javascript|vbscript|file):/i.test(source)) return "";
  if (/^(mailto:|tel:|\/|#)/i.test(source)) return source;
  if (!/^https?:/i.test(source)) return "";
  try {
    const parsed = new URL(source);
    if (/^(www\.)?facebook\.com$/i.test(parsed.hostname) || /^l\.facebook\.com$/i.test(parsed.hostname)) return "";
    if (/^(www\.)?smartsteam\.vn$/i.test(parsed.hostname)) return "https://stemora.vn/";
    if (/^(api\.)?smartsteam\.store$/i.test(parsed.hostname)) return "https://stemora.vn/";
    return parsed.href;
  } catch (error) {
    return "";
  }
}

function normalizePublicSrc(value) {
  const source = String(value || "").trim();
  if (!source || /[\u0000-\u001f<>"'`]/.test(source)) return "";
  if (/^(javascript|vbscript|file):/i.test(source)) return "";
  if (/^data:image\//i.test(source)) return "";
  if (/^https?:/i.test(source)) {
    try {
      const parsed = new URL(source);
      if (/facebook\.com$/i.test(parsed.hostname) || /fbcdn\.net$/i.test(parsed.hostname)) return "";
    } catch (error) {
      return "";
    }
  }
  if (!/^(https?:|data:image\/|\/)/i.test(source)) return "";
  return normalizeMediaSource(source);
}

function normalizeMediaSource(src) {
  const source = String(src || "").trim();
  if (!source) return "";
  return source
    .replace(/^https?:\/\/api\.smartsteam\.store\/(images|uploads)\//i, "/$1/")
    .replace(/^https?:\/\/smartsteam\.store\/(images|uploads)\//i, "/$1/")
    .replace(/^https?:\/\/www\.smartsteam\.store\/(images|uploads)\//i, "/$1/")
    .replace(/^https?:\/\/api\.smartsteam\.vn\/(images|uploads)\//i, "/$1/")
    .replace(/^https?:\/\/smartsteam\.vn\/(images|uploads)\//i, "/$1/")
    .replace(/^https?:\/\/ssteam\.onrender\.com\/(images|uploads)\//i, "/$1/");
}

function sanitizeHtml(value) {
  let html = String(value || "");
  if (!html) return "";
  html = html
    .replace(/<img\b(?=[^>]*src=["']https:\/\/static\.xx\.fbcdn\.net\/images\/emoji\.php[^"']*["'])(?=[^>]*alt=["']([^"']*)["'])[^>]*>/gi, "$1")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?<\/embed>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/<!--([\s\S]*?)-->/g, "");

  const allowedTags = new Set(["a", "b", "blockquote", "br", "div", "em", "figcaption", "figure", "h2", "h3", "h4", "hr", "i", "img", "li", "ol", "p", "span", "strong", "table", "tbody", "td", "th", "thead", "tr", "u", "ul"]);
  const allowedAttrs = new Set(["alt", "colspan", "decoding", "height", "href", "loading", "rel", "rowspan", "src", "target", "title", "width"]);

  const sanitized = html.replace(/<\/?([a-z0-9-]+)([^>]*)>/gi, (full, tagName, attrs) => {
    const tag = tagName.toLowerCase();
    const closing = /^<\//.test(full);
    if (!allowedTags.has(tag)) return "";
    if (closing) return `</${tag}>`;

    const nextAttrs = [];
    String(attrs || "").replace(/([:\w-]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g, (match, rawName, rawValue) => {
      const name = rawName.toLowerCase();
      if (!allowedAttrs.has(name) || name.startsWith("on") || name === "style" || name === "class" || name === "id" || name === "srcdoc" || name === "target" || name === "rel") return "";
      const unquoted = String(rawValue || "").replace(/^['"]|['"]$/g, "").trim();
      const value = name === "href" ? normalizePublicHref(unquoted) : name === "src" ? normalizePublicSrc(unquoted) : unquoted;
      if ((name === "href" || name === "src") && !value) return "";
      nextAttrs.push(`${name}="${escapeAttr(value)}"`);
      return "";
    });

    if (tag === "img" && !nextAttrs.some((entry) => entry.startsWith("src="))) return "";

    if (tag === "a" && nextAttrs.some((entry) => entry.startsWith("href="))) {
      nextAttrs.push('target="_blank"', 'rel="noreferrer"');
    }
    if (tag === "img") {
      if (!nextAttrs.some((entry) => entry.startsWith("loading="))) nextAttrs.push('loading="lazy"');
      if (!nextAttrs.some((entry) => entry.startsWith("decoding="))) nextAttrs.push('decoding="async"');
    }
    return `<${tag}${nextAttrs.length ? ` ${nextAttrs.join(" ")}` : ""}>`;
  }).trim();

  return sanitized
    .replace(/<h([2-4])>\s*<p>([\s\S]*?)<\/p>\s*<\/h\1>/gi, "<h$1>$2</h$1>")
    .replace(/<h([2-4])>([\s\S]*?)<\/h\1>/gi, (full, level, inner) => {
      const cleaned = inner.replace(/<\/?p>/gi, "").trim();
      if (!cleaned) return "";
      return /<(?:blockquote|div|figure|li|ol|table|ul)\b/i.test(cleaned) ? cleaned : `<h${level}>${cleaned}</h${level}>`;
    })
    .replace(/<a>([\s\S]*?)<\/a>/gi, "$1")
    .trim();
}

function slugify(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function uniqueSlug(item, used) {
  const base = slugify(item.slug || item.title || item.name || item._id);
  let slug = base;
  let index = 2;
  while (used.has(slug)) {
    slug = `${base}-${index}`;
    index += 1;
  }
  used.add(slug);
  return slug;
}

function formatDuration(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0 ? `${number} phút` : "";
}

function getFirstImage(html) {
  const match = String(html || "").match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? normalizeMediaSource(match[1]) : "";
}

function media(src, title, fallback) {
  return {
    src: normalizeMediaSource(src) || fallback,
    ratio: "16 / 10",
    fit: "cover",
    role: "archive",
    alt: { vi: title, en: title },
  };
}

function titleCaseEnglish(value) {
  return normalizeText(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => (/^(AI|DC|DOF|ESP32|I2C|IR|LCD|LED|LM35|STEM|STEAM|TTP223B|UNO|V8|ULN2003|TSOP1838|R5)$/i.test(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
    .join(" ");
}

function deriveEnglishTitle(item, fallback) {
  let title = normalizeText((item && (item.slug || item.sourceSlug || item._id)) || fallback || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const replacements = [
    ["lap-trinh-game-voi-mblock", "mBlock game programming"],
    ["lap-trinh-arduino", "Arduino programming"],
    ["chu-de-giao-thong-duong-bo", "road traffic theme"],
    ["game-ran-san-moi", "snake game"],
    ["chem-hoa-qua", "fruit slicing game"],
    ["giai-cau-do", "quiz game"],
    ["khoa-hoc-quanh-ta", "science around us"],
    ["cam-bien", "sensor"],
    ["dong-co", "motor"],
    ["giao-duc-stem-va-steam", "STEM and STEAM education"],
    ["robot-hinh-nguoi-tesla-optimus", "Tesla Optimus humanoid robot"],
    ["iphone-17-dung-luong-pin", "iPhone 17 battery capacity"],
  ];
  replacements.forEach(([needle, replacement]) => {
    title = title.replace(new RegExp(needle, "g"), replacement);
  });
  return titleCaseEnglish(title.replace(/-/g, " ")) || normalizeText(fallback || "STEM learning resource");
}

function deriveEnglishSummary(item, title) {
  return `English STEMORA page for ${title}, with practical STEM context, media, and related learning resources.`;
}

function buildTutorials(rows, categories) {
  const used = new Set();
  const categoryMap = new Map(categories.map((item) => [item._id, normalizeText(item.name)]));
  return rows.filter((item) => item && item.isPublished !== false).map((item, index) => {
    const title = normalizeText(item.title);
    const titleEn = deriveEnglishTitle(item, title);
    const contentHtml = sanitizeHtml(item.content);
    const summary = normalizeText(item.description || item.shortDescription) || stripTags(contentHtml).slice(0, 240);
    const summaryEn = deriveEnglishSummary(item, titleEn);
    const cover = media(item.featuredImage || item.image || getFirstImage(contentHtml), title, "/assets/img/product-coding.svg");
    const publishedAt = item.updatedAt || item.createdAt || "";
    const categoryName = categoryMap.get(item.categoryId) || "";
    return {
      id: item._id || `tutorial-${index + 1}`,
      slug: uniqueSlug(item, used),
      sourceSlug: normalizeText(item.slug),
      titleVi: title,
      titleEn,
      summaryVi: summary,
      summaryEn,
      categoryVi: categoryName,
      categoryEn: categoryName,
      authorVi: normalizeText(item.author || "Smart Steam"),
      authorEn: normalizeText(item.author || "Smart Steam"),
      cover,
      contentHtml,
      difficulty: normalizeText(item.difficulty),
      durationMinutes: Number.isFinite(Number(item.duration)) ? Number(item.duration) : 0,
      durationLabel: formatDuration(item.duration),
      publishedAt,
      views: Number(item.views || 0),
      likes: Number(item.likes || 0),
      tags: Array.isArray(item.tags) ? item.tags.map(normalizeText).filter(Boolean) : [],
    };
  });
}

function buildNews(rows, categories) {
  const used = new Set();
  const categoryMap = new Map(categories.map((item) => [item._id, normalizeText(item.name)]));
  return rows.filter((item) => item && item.status !== "draft").map((item, index) => {
    const title = normalizeText(item.title);
    const titleEn = deriveEnglishTitle(item, title);
    const contentHtml = sanitizeHtml(item.content);
    const summary = normalizeText(item.excerpt) || stripTags(contentHtml).slice(0, 260);
    const summaryEn = deriveEnglishSummary(item, titleEn);
    const cover = media(item.image || item.featuredImage || getFirstImage(contentHtml), title, "/assets/img/project-school.svg");
    const categoryName = categoryMap.get(item.categoryId) || "";
    return {
      id: item._id || `news-${index + 1}`,
      slug: uniqueSlug(item, used),
      sourceSlug: normalizeText(item.slug),
      titleVi: title,
      titleEn,
      summaryVi: summary,
      summaryEn,
      categoryVi: categoryName,
      categoryEn: categoryName,
      authorVi: normalizeText(item.author || "Smart Steam"),
      authorEn: normalizeText(item.author || "Smart Steam"),
      cover,
      contentHtml,
      isFeatured: Boolean(item.isFeatured),
      publishedAt: item.updatedAt || item.createdAt || "",
      tags: Array.isArray(item.tags) ? item.tags.map(normalizeText).filter(Boolean) : [],
    };
  });
}

function scrubPublicString(value, key) {
  let next = String(value || "")
    .replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g, "")
    .replace(/https?:\/\/api\.smartsteam\.store\/(images|uploads)\//gi, "/$1/")
    .replace(/https?:\/\/(?:www\.)?smartsteam\.store\/(images|uploads)\//gi, "/$1/")
    .replace(/https?:\/\/api\.smartsteam\.vn\/(images|uploads)\//gi, "/$1/")
    .replace(/https?:\/\/(?:www\.)?smartsteam\.vn\/(images|uploads)\//gi, "/$1/")
    .replace(/https?:\/\/ssteam\.onrender\.com\/(images|uploads)\//gi, "/$1/")
    .replace(/https?:\/\/(?:www\.)?smartsteam\.vn\b/gi, "https://stemora.vn")
    .replace(/https?:\/\/api\.smartsteam\.store\b/gi, "https://stemora.vn");

  if (/^https?:\/\//i.test(next)) {
    const safeHref = normalizePublicHref(next);
    return safeHref || "";
  }

  if (/<[a-z][\s\S]*>/i.test(next) || /&lt;[a-z]/i.test(next) || /^(content|fullDescription|description|features|excerpt|shortDescription)$/i.test(key || "")) {
    next = sanitizeHtml(next);
  }

  return next
    .replace(/https?:\/\/(?:www\.)?facebook\.com\/[^\s"'<>]+/gi, "")
    .replace(/https?:\/\/[^\s"'<>]*fbcdn\.net\/[^\s"'<>]+/gi, "")
    .replace(/https?:\/\/static\.xx\.fbcdn\.net\/[^\s"'<>]+/gi, "")
    .trim();
}

function scrubMigrationNode(value, key) {
  if (typeof value === "string") return scrubPublicString(value, key);
  if (Array.isArray(value)) return value.map((item) => scrubMigrationNode(item, key));
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, scrubMigrationNode(entryValue, entryKey)]));
}

function scrubMigrationPublicData() {
  fs.readdirSync(migrationDir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .forEach((file) => {
      const relativeFile = `migration-full-input/${file}`;
      writeJson(relativeFile, scrubMigrationNode(readJson(relativeFile, []), ""));
    });
}

function scrubInlineMigrationImages() {
  const categoriesFile = "migration-full-input/categories.json";
  const categories = readJson(categoriesFile, []);
  if (Array.isArray(categories)) {
    categories.forEach((item) => {
      if (item && typeof item.icon === "string" && item.icon.startsWith("data:image/")) item.icon = "";
    });
    writeJson(categoriesFile, categories);
  }

  const heroFile = "migration-full-input/hero_slides.json";
  const heroes = readJson(heroFile, []);
  const replacements = ["/assets/img/luxury-3d-chip-hero.png", "/assets/img/family-lab.svg"];
  if (Array.isArray(heroes)) {
    heroes.forEach((item, index) => {
      if (item && typeof item.image === "string" && item.image.startsWith("data:image/")) item.image = replacements[index] || replacements[0];
    });
    writeJson(heroFile, heroes);
  }
}

function main() {
  if (!fs.existsSync(migrationDir)) throw new Error("migration-full-input missing");
  scrubMigrationPublicData();
  const tutorials = buildTutorials(readJson("migration-full-input/tutorials.json", []), readJson("migration-full-input/tutorial_categories.json", []));
  const news = buildNews(readJson("migration-full-input/news.json", []), readJson("migration-full-input/news_categories.json", []));
  fs.mkdirSync(path.dirname(archiveOut), { recursive: true });
  fs.writeFileSync(archiveOut, `${JSON.stringify({ generatedAt: new Date().toISOString(), tutorials, news }, null, 2)}\n`);
  scrubInlineMigrationImages();
  console.log(`Wrote ${path.relative(root, archiveOut)} (${tutorials.length} tutorials, ${news.length} news)`);
}

main();
