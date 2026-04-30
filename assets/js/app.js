(function () {
  const WINDOWS_1252_MAP = {
    0x20ac: 0x80,
    0x201a: 0x82,
    0x0192: 0x83,
    0x201e: 0x84,
    0x2026: 0x85,
    0x2020: 0x86,
    0x2021: 0x87,
    0x02c6: 0x88,
    0x2030: 0x89,
    0x0160: 0x8a,
    0x2039: 0x8b,
    0x0152: 0x8c,
    0x017d: 0x8e,
    0x2018: 0x91,
    0x2019: 0x92,
    0x201c: 0x93,
    0x201d: 0x94,
    0x2022: 0x95,
    0x2013: 0x96,
    0x2014: 0x97,
    0x02dc: 0x98,
    0x2122: 0x99,
    0x0161: 0x9a,
    0x203a: 0x9b,
    0x0153: 0x9c,
    0x017e: 0x9e,
    0x0178: 0x9f,
  };
  const utf8Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8", { fatal: false }) : null;
  const SUSPICIOUS_TEXT_PATTERN = /[\u00C2-\u00C6\u00D0\u00E1\u0080-\u009F]/;
  const KNOWN_VIETNAMESE_PLAIN_PHRASES = [
    ["Tat ca khoang gia", "Táº¥t cáº£ khoáº£ng giÃ¡"],
    ["Tat ca danh muc", "Táº¥t cáº£ danh má»¥c"],
    ["Tat ca san pham", "Táº¥t cáº£ sáº£n pháº©m"],
    ["San pham goi y", "Sáº£n pháº©m gá»£i Ã½"],
    ["Danh muc san pham", "Danh má»¥c sáº£n pháº©m"],
    ["Khoang gia", "Khoáº£ng giÃ¡"],
    ["Khoang tien", "Khoáº£ng tiá»n"],
    ["Sap xep theo", "Sáº¯p xáº¿p theo"],
    ["Sap xep: Mac dinh", "Sáº¯p xáº¿p: Máº·c Ä‘á»‹nh"],
    ["Mac dinh", "Máº·c Ä‘á»‹nh"],
    ["Gia tang dan", "GiÃ¡ tÄƒng dáº§n"],
    ["Gia giam dan", "GiÃ¡ giáº£m dáº§n"],
    ["Duoi 500k", "DÆ°á»›i 500k"],
    ["500k den 1tr", "500k Ä‘áº¿n 1tr"],
    ["1tr den 2tr", "1tr Ä‘áº¿n 2tr"],
    ["Tren 2tr", "TrÃªn 2tr"],
    ["Tim theo ten san pham...", "TÃ¬m theo tÃªn sáº£n pháº©m..."],
    ["Tim san pham...", "TÃ¬m sáº£n pháº©m..."],
    ["Dang cap nhat", "Äang cáº­p nháº­t"],
    ["Con hang", "CÃ²n hÃ ng"],
    ["Lien he", "LiÃªn há»‡"],
    ["San pham STEM", "Sáº£n pháº©m STEM"],
    ["Ton kho", "Tá»“n kho"],
    ["Danh muc", "Danh má»¥c"],
    ["Xem trang chi tiet ->", "Xem trang chi tiáº¿t ->"],
    ["Them vao gio hang", "ThÃªm vÃ o giá» hÃ ng"],
    ["Them vao gio", "ThÃªm vÃ o giá»"],
    ["Huong dan mua hang", "HÆ°á»›ng dáº«n mua hÃ ng"],
    ["Huong dan thanh toan", "HÆ°á»›ng dáº«n thanh toÃ¡n"],
    ["Kiem tra don hang", "Kiá»ƒm tra Ä‘Æ¡n hÃ ng"],
  ]
    .sort((left, right) => right[0].length - left[0].length)
    .map(([plain, accented]) => ({
      plain,
      accented,
      pattern: new RegExp(plain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
    }));
  const PLAIN_VIETNAMESE_TEXT_PATTERN = new RegExp(
    KNOWN_VIETNAMESE_PLAIN_PHRASES.map((entry) => entry.plain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
    "i",
  );

  function preserveVietnameseCase(source, replacement) {
    if (source === source.toUpperCase()) return replacement.toLocaleUpperCase("vi-VN");
    if (source === source.toLowerCase()) return replacement.toLocaleLowerCase("vi-VN");
    return replacement;
  }

  function normalizePlainVietnameseText(value) {
    return KNOWN_VIETNAMESE_PLAIN_PHRASES.reduce((result, entry) => {
      if (!entry.pattern.test(result)) return result;
      entry.pattern.lastIndex = 0;
      return result.replace(entry.pattern, (match) => preserveVietnameseCase(match, entry.accented));
    }, value);
  }

  const data = normalizeDataTree(window.STEM_DATA);
  if (data) window.STEM_DATA = data;
  if (!data || !document.body) return;

  const html = document.documentElement;
  const body = document.body;
  const locale = html.dataset.locale || "vi";
  const strings = data.locales[locale];
  const page = body.dataset.page || "welcome";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const currentPath = normalizePath(window.location.pathname);
  const runtimeTuning = data.runtimeTuning || {};
  const stageTuning = runtimeTuning.staging || {};
  const mediaTuning = runtimeTuning.media || {};
  const preloadTuning = runtimeTuning.preloader || {};
  const transitionTuning = runtimeTuning.transitions || {};
  const ASSET_VERSION = runtimeTuning.assetVersion ? `?v=${runtimeTuning.assetVersion}` : "";
  const MIGRATION_ENDPOINTS = {
    products: "/migration-full-input/products.json",
    projects: "/migration-full-input/projects.json",
    tutorials: "/migration-full-input/tutorials.json",
    tutorialCategories: "/migration-full-input/tutorial_categories.json",
    news: "/migration-full-input/news.json",
    newsCategories: "/migration-full-input/news_categories.json",
  };
  const MEDIA_FALLBACKS = {
    hero: "/assets/img/product-robotics.svg",
    editorial: "/assets/img/product-science.svg",
    collage: "/assets/img/family-lab.svg",
    catalogue: "/assets/img/product-science.svg",
    detail: "/assets/img/product-robotics.svg",
    archive: "/assets/img/project-expo.svg",
    decor: "/assets/img/decor-orbit.svg",
    bare: "/assets/img/product-science.svg",
  };
  const GENERATED_FALLBACK_ROLES = new Set(["catalogue", "detail", "hero"]);
  const EMPTY_MEDIA =
    "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 900'%3E%3Crect width='1200' height='900' fill='%23f4efe6'/%3E%3C/svg%3E";
  const state = {
    menuOpen: false,
    filterDrawerOpen: false,
    activeParallax: [],
    rafId: 0,
    motionObserver: null,
    deferredObserver: null,
    lastFocused: null,
    scrollHandler: null,
    resizeHandler: null,
    migratedArchivePromise: null,
    experienceStarted: false,
    transitionPending: sessionStorage.getItem("stemora_transition_pending") === "1",
    textNormalizationObserver: null,
    textNormalizeRaf: 0,
    normalizingText: false,
    welcomeThemeInitialized: false,
  };
  const GROUPS = ["age", "theme", "format", "occasion", "difficulty"];
  const APP_THEME_STORAGE_KEY = "stemora:theme";
  const WELCOME_THEME_STORAGE_KEY = "stemora:welcome-theme";
  const PROJECT_ARCHIVE_SCROLL_KEY = "stemora:project-archive-scroll";

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $$(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function normalizePath(pathname) {
    return pathname.replace(/\/+$/, "") || "/";
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function wait(duration) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, duration);
    });
  }

  function debounce(callback, delay) {
    let timer = 0;
    return () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(callback, delay);
    };
  }

  function getWelcomeThemeLabels() {
    if (locale === "vi") {
      return {
        light: "S\u00e1ng",
        dark: "T\u1ed1i",
        switchToLight: "Chuy\u1ec3n sang giao di\u1ec7n s\u00e1ng",
        switchToDark: "Chuy\u1ec3n sang giao di\u1ec7n t\u1ed1i",
      };
    }

    return {
      light: "Light",
      dark: "Dark",
      switchToLight: "Switch to light mode",
      switchToDark: "Switch to dark mode",
    };
  }

  function normalizeThemeValue(theme) {
    return theme === "light" ? "light" : "dark";
  }

  function readStoredTheme(key) {
    try {
      const storedTheme = window.localStorage.getItem(key);
      return storedTheme === "light" || storedTheme === "dark" ? storedTheme : "";
    } catch (error) {
      return "";
    }
  }

  function updateWelcomeThemeToggle() {
    const button = $(".js-welcome-theme-toggle");
    if (!button) return;

    const labels = getWelcomeThemeLabels();
    const theme = getWelcomeTheme();
    const isLight = theme === "light";
    const label = $(".js-welcome-theme-toggle-label", button);
    const nextAriaLabel = isLight ? labels.switchToDark : labels.switchToLight;

    if (label) label.textContent = isLight ? labels.light : labels.dark;
    button.dataset.theme = theme;
    button.setAttribute("aria-pressed", String(isLight));
    button.setAttribute("aria-label", nextAriaLabel);
    button.title = nextAriaLabel;
  }

  function syncPageThemeState(theme) {
    const nextTheme = normalizeThemeValue(theme);
    body.dataset.theme = nextTheme;

    if (page === "welcome") {
      body.dataset.welcomeTheme = nextTheme;
      body.classList.remove("page-immersive");
    } else {
      delete body.dataset.welcomeTheme;
      body.classList.toggle("page-immersive", nextTheme === "dark");
    }

    document.documentElement.style.colorScheme = nextTheme;
    updateWelcomeThemeToggle();
    return nextTheme;
  }

  function getWelcomeTheme() {
    const themeFromBody = body.dataset.theme || body.dataset.welcomeTheme;
    if (themeFromBody === "light" || themeFromBody === "dark") return themeFromBody;

    return readStoredTheme(APP_THEME_STORAGE_KEY) || readStoredTheme(WELCOME_THEME_STORAGE_KEY) || "dark";
  }

  function setWelcomeTheme(theme) {
    const nextTheme = syncPageThemeState(theme);

    try {
      window.localStorage.setItem(APP_THEME_STORAGE_KEY, nextTheme);
      if (page === "welcome") {
        window.localStorage.setItem(WELCOME_THEME_STORAGE_KEY, nextTheme);
      }
    } catch (error) {
      // Ignore storage failures and keep the current UI state.
    }
  }

  function initWelcomeTheme() {
    const nextTheme = syncPageThemeState(getWelcomeTheme());

    try {
      if (window.localStorage.getItem(APP_THEME_STORAGE_KEY) !== nextTheme) {
        window.localStorage.setItem(APP_THEME_STORAGE_KEY, nextTheme);
      }
      if (page === "welcome" && window.localStorage.getItem(WELCOME_THEME_STORAGE_KEY) !== nextTheme) {
        window.localStorage.setItem(WELCOME_THEME_STORAGE_KEY, nextTheme);
      }
    } catch (error) {
      // Ignore storage failures and keep the current UI state.
    }
  }

  function slugFromPath() {
    const segments = currentPath.split("/").filter(Boolean);
    return segments[segments.length - 1] || "";
  }

  function getLocalePath(key, slug) {
    const prefix = `/${locale}`;
    if (key === "welcome") return `${prefix}/welcome/`;
    if (key === "products") return `${prefix}/products/`;
    if (key === "projects") return `${prefix}/projects/`;
    if (key === "tutorials") return `${prefix}/tutorials/`;
    if (key === "news") return `${prefix}/news/`;
    if (key === "contact") return `${prefix}/contact/`;
    if (key === "policy") return `${prefix}/policy/`;
    if (key === "product-detail") return `${prefix}/product/${slug || ""}/`;
    if (key === "project-detail") return `${prefix}/project/${slug || ""}/`;
    if (key === "tutorial-detail") return `${prefix}/tutorial/${slug || ""}/`;
    if (key === "news-detail") return `${prefix}/news/${slug || ""}/`;
    return `${prefix}/welcome/`;
  }

  function getAlternateLocalePath(targetLocale) {
    const nextPath = currentPath.replace(/^\/(vi|en)/, `/${targetLocale}`);
    return `${nextPath || `/${targetLocale}/welcome/`}${window.location.search}${window.location.hash}`;
  }

  function decodeWin1252AsUtf8(value) {
    if (!utf8Decoder) return value;
    const bytes = [];
    const source = String(value || "");
    for (let i = 0; i < source.length; i += 1) {
      const code = source.charCodeAt(i);
      if (code <= 255) {
        bytes.push(code);
      } else if (WINDOWS_1252_MAP[code]) {
        bytes.push(WINDOWS_1252_MAP[code]);
      } else {
        return source;
      }
    }
    try {
      return utf8Decoder.decode(new Uint8Array(bytes));
    } catch (error) {
      return source;
    }
  }

  function scoreTextQuality(value) {
    const source = String(value || "");
    const replacementPenalty = (source.match(/\uFFFD/g) || []).length * 120;
    const suspiciousPenalty = (source.match(/(?:\u00C3|\u00C2|\u00C4|\u00C5|\u00C6|\u00D0|\u00E1\u00BA|\u00E1\u00BB|\u00E2\u20AC|\u00E2\u02DC)/g) || []).length * 14;
    const controlPenalty = (source.match(/[\u0080-\u009F]/g) || []).length * 30;
    const vietnameseBonus = (source.match(/[à-ỹÀ-ỸđĐ]/g) || []).length * 2;
    return vietnameseBonus - replacementPenalty - suspiciousPenalty - controlPenalty;
  }

  const LEGACY_KNOWN_VIETNAMESE_PLAIN_PHRASES = [
    ["Tat ca khoang gia", "Tất cả khoảng giá"],
    ["Tat ca danh muc", "Tất cả danh mục"],
    ["Tat ca san pham", "Tất cả sản phẩm"],
    ["San pham goi y", "Sản phẩm gợi ý"],
    ["Danh muc san pham", "Danh mục sản phẩm"],
    ["Khoang gia", "Khoảng giá"],
    ["Khoang tien", "Khoảng tiền"],
    ["Sap xep theo", "Sắp xếp theo"],
    ["Sap xep: Mac dinh", "Sắp xếp: Mặc định"],
    ["Mac dinh", "Mặc định"],
    ["Gia tang dan", "Giá tăng dần"],
    ["Gia giam dan", "Giá giảm dần"],
    ["Duoi 500k", "Dưới 500k"],
    ["500k den 1tr", "500k đến 1tr"],
    ["1tr den 2tr", "1tr đến 2tr"],
    ["Tren 2tr", "Trên 2tr"],
    ["Tim theo ten san pham...", "Tìm theo tên sản phẩm..."],
    ["Tim san pham...", "Tìm sản phẩm..."],
    ["Dang cap nhat", "Đang cập nhật"],
    ["Con hang", "Còn hàng"],
    ["Lien he", "Liên hệ"],
    ["San pham STEM", "Sản phẩm STEM"],
    ["Ton kho", "Tồn kho"],
    ["Danh muc", "Danh mục"],
    ["Xem trang chi tiet ->", "Xem trang chi tiết ->"],
    ["Them vao gio hang", "Thêm vào giỏ hàng"],
    ["Them vao gio", "Thêm vào giỏ"],
    ["Huong dan mua hang", "Hướng dẫn mua hàng"],
    ["Huong dan thanh toan", "Hướng dẫn thanh toán"],
    ["Kiem tra don hang", "Kiểm tra đơn hàng"],
  ]
    .sort((left, right) => right[0].length - left[0].length)
    .map(([plain, accented]) => ({
      plain,
      accented,
      pattern: new RegExp(plain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
    }));
  const LEGACY_PLAIN_VIETNAMESE_TEXT_PATTERN = new RegExp(
    LEGACY_KNOWN_VIETNAMESE_PLAIN_PHRASES.map((entry) => entry.plain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
    "i",
  );

  function preserveVietnameseCaseLegacy(source, replacement) {
    if (source === source.toUpperCase()) return replacement.toLocaleUpperCase("vi-VN");
    if (source === source.toLowerCase()) return replacement.toLocaleLowerCase("vi-VN");
    return replacement;
  }

  function normalizePlainVietnameseTextLegacy(value) {
    return LEGACY_KNOWN_VIETNAMESE_PLAIN_PHRASES.reduce((result, entry) => {
      if (!entry.pattern.test(result)) return result;
      entry.pattern.lastIndex = 0;
      return result.replace(entry.pattern, (match) => preserveVietnameseCaseLegacy(match, entry.accented));
    }, value);
  }

  function normalizeText(value) {
    if (value == null) return "";
    const source = normalizePlainVietnameseText(String(value));
    if (!source) return "";
    if (!SUSPICIOUS_TEXT_PATTERN.test(source)) return source;

    const candidates = [source];
    const once = decodeWin1252AsUtf8(source);
    if (once && once !== source) candidates.push(once);
    const chunkFixedSource = source.replace(/(?:[\u00C2-\u00C6\u00D0\u00E1][^\sA-Za-z0-9]*)+/g, (segment) => {
      const decodedSegment = decodeWin1252AsUtf8(segment);
      return scoreTextQuality(decodedSegment) >= scoreTextQuality(segment) ? decodedSegment : segment;
    });
    if (chunkFixedSource && chunkFixedSource !== source) candidates.push(chunkFixedSource);
    const chunkFixedOnce = once.replace(/(?:[\u00C2-\u00C6\u00D0\u00E1][^\sA-Za-z0-9]*)+/g, (segment) => {
      const decodedSegment = decodeWin1252AsUtf8(segment);
      return scoreTextQuality(decodedSegment) >= scoreTextQuality(segment) ? decodedSegment : segment;
    });
    if (chunkFixedOnce && chunkFixedOnce !== once) candidates.push(chunkFixedOnce);
    const twice = decodeWin1252AsUtf8(once);
    if (twice && twice !== once) candidates.push(twice);

    return candidates
      .map((candidate) => ({ candidate, score: scoreTextQuality(candidate) }))
      .sort((left, right) => right.score - left.score || left.candidate.length - right.candidate.length)[0]
      .candidate;
  }

  function normalizeDataTree(value, seen) {
    if (typeof value === "string") return normalizeText(value);
    if (value == null || typeof value !== "object") return value;

    const visited = seen || new WeakMap();
    if (visited.has(value)) return visited.get(value);

    if (Array.isArray(value)) {
      const nextArray = [];
      visited.set(value, nextArray);
      value.forEach((item, index) => {
        nextArray[index] = normalizeDataTree(item, visited);
      });
      return nextArray;
    }

    if (Object.prototype.toString.call(value) !== "[object Object]") return value;

    const nextObject = {};
    visited.set(value, nextObject);
    Object.keys(value).forEach((key) => {
      nextObject[key] = normalizeDataTree(value[key], visited);
    });
    return nextObject;
  }

  function getText(entry, viKey, enKey) {
    if (!entry) return "";
    return normalizeText(locale === "vi" ? entry[viKey] : entry[enKey]);
  }

  function getMediaAlt(media) {
    if (!media || !media.alt) return "";
    return normalizeText(media.alt[locale] || media.alt.en || media.alt.vi || "");
  }

  function normalizeElementCopy(element) {
    if (!element || element.nodeType !== 1) return;
    ["aria-label", "title", "alt", "placeholder", "content"].forEach((attribute) => {
      if (!element.hasAttribute(attribute)) return;
      const currentValue = element.getAttribute(attribute);
      const nextValue = normalizeText(currentValue);
      if (nextValue !== currentValue) {
        element.setAttribute(attribute, nextValue);
      }
    });
  }

  function normalizeDocumentMeta() {
    if (document.title) {
      document.title = normalizeText(document.title);
    }
    $$('meta[name="description"], meta[property="og:title"], meta[property="og:description"], meta[name="twitter:title"], meta[name="twitter:description"]')
      .forEach((meta) => normalizeElementCopy(meta));
  }

  function normalizeRenderedText(root) {
    const scope = root && root.nodeType === 1 ? root : document.body;
    if (!scope) return;

    state.normalizingText = true;
    try {
      normalizeElementCopy(scope);
      if (scope.querySelectorAll) {
        scope.querySelectorAll("*").forEach((element) => normalizeElementCopy(element));
      }

      const textWalker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          return (SUSPICIOUS_TEXT_PATTERN.test(node.nodeValue || "") || PLAIN_VIETNAMESE_TEXT_PATTERN.test(node.nodeValue || ""))
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        },
      });

      let currentNode = textWalker.nextNode();
      while (currentNode) {
        const nextValue = normalizeText(currentNode.nodeValue);
        if (nextValue !== currentNode.nodeValue) {
          currentNode.nodeValue = nextValue;
        }
        currentNode = textWalker.nextNode();
      }

      normalizeDocumentMeta();
    } finally {
      state.normalizingText = false;
    }
  }

  function queueTextNormalization(root) {
    const target = root && root.nodeType === 1 ? root : document.body;
    if (!target) return;
    if (state.textNormalizeRaf) {
      window.cancelAnimationFrame(state.textNormalizeRaf);
    }
    state.textNormalizeRaf = window.requestAnimationFrame(() => {
      state.textNormalizeRaf = 0;
      normalizeRenderedText(target);
    });
  }

  function initTextNormalizer() {
    if (!document.body) return;
    queueTextNormalization(document.body);

    if (state.textNormalizationObserver || !("MutationObserver" in window)) return;

    state.textNormalizationObserver = new MutationObserver((mutations) => {
      if (state.normalizingText) return;
      const shouldNormalize = mutations.some((mutation) => {
        if (mutation.type === "childList") {
          return mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0;
        }
        return mutation.type === "characterData" || mutation.type === "attributes";
      });
      if (shouldNormalize) {
        queueTextNormalization(document.body);
      }
    });

    state.textNormalizationObserver.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["aria-label", "title", "alt", "placeholder"],
    });
  }

  function getCategoryFilterHref(categoryName) {
    const queryValue = categoryName ? `?category=${encodeURIComponent(categoryName)}` : "";
    return `${getLocalePath("products")}${queryValue}`;
  }

  function getProductDetailCopy() {
    return locale === "vi"
      ? {
          allProducts: "Tất cả sản phẩm",
          breadcrumbsHome: "Trang chủ",
          breadcrumbsProducts: "Sản phẩm",
          categoriesTitle: "DANH MỤC SẢN PHẨM",
          stockLabel: "Tình trạng",
          stockInLabel: "Còn hàng",
          stockLeftPrefix: "Chỉ còn ",
          stockLeftSuffix: " sản phẩm",
          stockContact: "Liên hệ để kiểm tra tồn kho",
          priceLabel: "Giá",
          descriptionTab: "Mô tả chi tiết",
          descriptionTitle: "Mô tả sản phẩm",
          specsTab: "Thông số kỹ thuật",
          specsTitle: "Thông số kỹ thuật",
          featuresTab: "Tính năng",
          featuresTitle: "Tính năng nổi bật",
          reviewsTab: "Đánh giá & Bình luận",
          reviewsTitle: "Đánh giá & Bình luận",
          reviewsUnit: "đánh giá",
          quantityLabel: "Số lượng:",
          cartCta: "THÊM VÀO GIỎ HÀNG",
          buyNowCta: "MUA NGAY",
          thumbPrevLabel: "Xem thumbnail trước",
          thumbNextLabel: "Xem thumbnail tiếp theo",
          tabsAria: "Thông tin sản phẩm",
          suggestedTitle: "SẢN PHẨM GỢI Ý",
          moreTitle: "KHÁC",
          buyGuide: "Hướng dẫn mua hàng",
          paymentGuide: "Hướng dẫn thanh toán",
          checkOrder: "Kiểm tra đơn hàng",
          noProducts: "Không tìm thấy sản phẩm",
          sortPrefix: "Sắp xếp: ",
          fallbackFeatureOne: "Dễ tích hợp vào workshop, lớp học và dự án maker.",
          fallbackFeatureTwo: "Phù hợp để demo cơ cấu, thuật toán và tư duy kỹ thuật.",
        }
      : {
          allProducts: "All products",
          breadcrumbsHome: "Home",
          breadcrumbsProducts: "Products",
          categoriesTitle: "PRODUCT CATEGORIES",
          stockLabel: "Stock",
          stockInLabel: "In stock",
          stockLeftPrefix: "Only ",
          stockLeftSuffix: " items left",
          stockContact: "Contact us for stock status",
          priceLabel: "Price",
          descriptionTab: "Description",
          descriptionTitle: "Product description",
          specsTab: "Specifications",
          specsTitle: "Specifications",
          featuresTab: "Features",
          featuresTitle: "Key features",
          reviewsTab: "Reviews & Comments",
          reviewsTitle: "Reviews & Comments",
          reviewsUnit: "reviews",
          quantityLabel: "Quantity:",
          cartCta: "ADD TO CART",
          buyNowCta: "BUY NOW",
          thumbPrevLabel: "Previous thumbnails",
          thumbNextLabel: "Next thumbnails",
          tabsAria: "Product information",
          suggestedTitle: "SUGGESTED PRODUCTS",
          moreTitle: "MORE",
          buyGuide: "Buying guide",
          paymentGuide: "Payment guide",
          checkOrder: "Check order",
          noProducts: "No products found",
          sortPrefix: "Sort: ",
          fallbackFeatureOne: "Easy to integrate into workshops, classrooms, and maker builds.",
          fallbackFeatureTwo: "Useful for demonstrating mechanisms, algorithms, and engineering thinking.",
        };
  }

  function getCategoryIconMarkup(categoryName, index) {
    const safeIcon = ["🤖", "💻", "🎮", "▦", "📦"][index % 5];
    return `
      <span class="product-detail-category-icon" aria-hidden="true">${safeIcon}</span>
      <span class="product-detail-category-label">${categoryName}</span>
    `;
  }

  function renderRichTextBlocks(value) {
    const source = normalizeText(value || "").replace(/\r\n/g, "\n").trim();
    if (!source) return "";
    return source
      .split(/\n{2,}/)
      .map((block) => `<p>${block.trim().replace(/\n/g, "<br>")}</p>`)
      .join("");
  }

  function renderProductDescriptionMarkup(item, fallbackText) {
    const richHtml = locale === "vi" ? item.descriptionHtmlVi : item.descriptionHtmlEn;
    if (richHtml && /<[^>]+>/.test(richHtml)) {
      return `<div class="product-detail-rich-copy product-detail-rich-copy--html">${richHtml}</div>`;
    }
    return `<div class="product-detail-rich-copy">${renderRichTextBlocks(fallbackText)}</div>`;
  }

  function truncateText(value, maxLength) {
    const source = normalizeText(value || "").replace(/\s+/g, " ").trim();
    if (!source) return "";
    if (!Number.isFinite(maxLength) || maxLength <= 0 || source.length <= maxLength) return source;

    const softSlice = source.slice(0, maxLength + 1);
    const lastBreak = Math.max(softSlice.lastIndexOf(" "), softSlice.lastIndexOf(","), softSlice.lastIndexOf("."));
    const cutoff = lastBreak > Math.floor(maxLength * 0.65) ? lastBreak : maxLength;
    return `${softSlice.slice(0, cutoff).replace(/[\s,.;:!?-]+$/g, "")}…`;
  }

  function getProductCardSummaryConfig(title) {
    const titleLength = normalizeText(title || "").replace(/\s+/g, " ").trim().length;
    if (titleLength >= 46) return { maxLength: 120, lines: 3 };
    if (titleLength >= 34) return { maxLength: 156, lines: 4 };
    return { maxLength: 210, lines: 5 };
  }

  function escapeXml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function hashText(value) {
    const source = String(value || "");
    let hash = 0;
    for (let i = 0; i < source.length; i += 1) {
      hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
    }
    return hash;
  }

  function wrapLabel(value, maxLen, maxLines) {
    const words = String(value || "STEMORA")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const lines = [];
    let current = "";
    words.forEach((word) => {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxLen && current) {
        lines.push(current);
        current = word;
        return;
      }
      current = next;
    });
    if (current) lines.push(current);
    return lines.slice(0, maxLines);
  }

  function buildGeneratedFallbackSource(media) {
    const label = getMediaAlt(media) || "STEMORA";
    const hash = hashText(`${label}-${media.role || "catalogue"}`);
    const hueA = 20 + (hash % 160);
    const hueB = 180 + (hash % 120);
    const lines = wrapLabel(label, 20, 3);
    const tspans = lines
      .map((line, index) => `<tspan x="72" dy="${index === 0 ? 0 : 42}">${escapeXml(line)}</tspan>`)
      .join("");

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1500" width="1200" height="1500">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="hsl(${hueA}, 55%, 18%)"/>
            <stop offset="100%" stop-color="hsl(${hueB}, 65%, 12%)"/>
          </linearGradient>
          <radialGradient id="glow" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stop-color="rgba(255,255,255,0.88)"/>
            <stop offset="50%" stop-color="rgba(255,255,255,0.22)"/>
            <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
          </radialGradient>
        </defs>
        <rect width="1200" height="1500" rx="64" fill="url(#bg)"/>
        <circle cx="850" cy="360" r="190" fill="none" stroke="rgba(255,255,255,0.42)" stroke-width="10"/>
        <circle cx="850" cy="360" r="96" fill="rgba(255,255,255,0.12)"/>
        <circle cx="980" cy="220" r="24" fill="hsl(${hueA}, 90%, 70%)"/>
        <circle cx="760" cy="500" r="32" fill="hsl(${hueB}, 90%, 74%)"/>
        <circle cx="1050" cy="520" r="22" fill="hsl(${(hueA + hueB) % 360}, 90%, 72%)"/>
        <line x1="850" y1="360" x2="850" y2="200" stroke="rgba(255,255,255,0.82)" stroke-width="10" stroke-linecap="round"/>
        <line x1="850" y1="360" x2="1030" y2="520" stroke="rgba(255,255,255,0.7)" stroke-width="8" stroke-linecap="round"/>
        <line x1="850" y1="360" x2="740" y2="505" stroke="rgba(255,255,255,0.5)" stroke-width="6" stroke-linecap="round"/>
        <rect x="72" y="112" width="360" height="24" rx="12" fill="rgba(255,255,255,0.82)"/>
        <rect x="72" y="172" width="290" height="18" rx="9" fill="rgba(255,255,255,0.72)"/>
        <rect x="72" y="216" width="250" height="18" rx="9" fill="rgba(255,255,255,0.72)"/>
        <rect x="72" y="260" width="210" height="18" rx="9" fill="rgba(255,255,255,0.72)"/>
        <rect x="72" y="1160" width="420" height="18" rx="9" fill="rgba(255,255,255,0.72)"/>
        <rect x="72" y="1210" width="250" height="18" rx="9" fill="rgba(255,255,255,0.72)"/>
        <ellipse cx="850" cy="420" rx="340" ry="260" fill="url(#glow)" opacity="0.4"/>
        <text x="72" y="980" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#ffffff" letter-spacing="-0.03em">${tspans}</text>
      </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function updateMeta(title, description) {
    if (title) document.title = title;
    const descriptionTag = $('meta[name="description"]');
    if (descriptionTag && description) descriptionTag.setAttribute("content", description);
  }

  function isRemoteMediaSource(src) {
    return /^(https?:)?\/\//i.test(src) || /^data:image\//i.test(src);
  }

  function normalizeMediaSource(src) {
    if (!src) return "";
    const cleanSource = String(src).trim();
    const embeddedDataIndex = cleanSource.indexOf("data:image/");
    if (embeddedDataIndex > 0) return cleanSource.slice(embeddedDataIndex);
    if (/^\/?(uploads|images)\//i.test(cleanSource)) {
      return cleanSource.startsWith("/") ? cleanSource : `/${cleanSource.replace(/^\.\//, "")}`;
    }
    return cleanSource
      .replace(/^https?:\/\/api\.smartsteam\.store\/(images|uploads)\//i, "/$1/")
      .replace(/^https?:\/\/smartsteam\.store\/(images|uploads)\//i, "/$1/")
      .replace(/^https?:\/\/www\.smartsteam\.store\/(images|uploads)\//i, "/$1/")
      .replace(/^https?:\/\/api\.smartsteam\.vn\/(images|uploads)\//i, "/$1/")
      .replace(/^https?:\/\/smartsteam\.vn\/(images|uploads)\//i, "/$1/")
      .replace(/^https?:\/\/ssteam\.onrender\.com\/(images|uploads)\//i, "/$1/");
  }

  function resolveAssetSource(src) {
    const normalizedSource = normalizeMediaSource(src);
    if (!normalizedSource) return "";
    if (isRemoteMediaSource(normalizedSource)) return normalizedSource;
    const localSource = normalizedSource.startsWith("/") ? normalizedSource : `/${normalizedSource.replace(/^\.\//, "")}`;
    if (!ASSET_VERSION) return localSource;
    return `${localSource}${localSource.includes("?") ? "&" : "?"}${ASSET_VERSION.slice(1)}`;
  }

  function normalizeMediaObject(media, options) {
    const config = options || {};
    const baseMedia = typeof media === "string" ? { src: media } : media || {};
    const fallbackRole = baseMedia.role || config.role || "editorial";
    return {
      src: normalizeMediaSource(baseMedia.src) || MEDIA_FALLBACKS[fallbackRole] || MEDIA_FALLBACKS.editorial,
      width: baseMedia.width || config.width || 1200,
      height: baseMedia.height || config.height || 1200,
      ratio: baseMedia.ratio || config.ratio || "4 / 5",
      fit: baseMedia.fit || config.fit || "cover",
      focalX: baseMedia.focalX ?? 50,
      focalY: baseMedia.focalY ?? 50,
      preserveTextSafeArea: Boolean(baseMedia.preserveTextSafeArea),
      role: fallbackRole,
      loadingTier: baseMedia.loadingTier || config.tier || "deferred",
      alt: baseMedia.alt || { vi: "", en: "" },
    };
  }

  function getFallbackMediaSource(media) {
    if (GENERATED_FALLBACK_ROLES.has(media.role)) return buildGeneratedFallbackSource(media);
    const fallbackPath = MEDIA_FALLBACKS[media.role] || MEDIA_FALLBACKS.editorial;
    return resolveAssetSource(fallbackPath);
  }

  function renderMedia(media, className, options) {
    const config = options || {};
    const normalizedMedia = normalizeMediaObject(media, config);
    const tier = config.tier || normalizedMedia.loadingTier || (config.priority ? "critical" : "deferred");
    const inlineSource = tier === "critical";
    const loading = inlineSource ? config.loading || "eager" : "lazy";
    const fetchPriority = tier === "critical" ? ' fetchpriority="high"' : "";
    const decoding = tier === "critical" ? "sync" : "async";
    const alt = config.alt !== undefined ? config.alt : getMediaAlt(normalizedMedia);
    const fit = normalizedMedia.fit || "cover";
    const role = normalizedMedia.role || "editorial";
    const focalX = normalizedMedia.focalX ?? 50;
    const focalY = normalizedMedia.focalY ?? 50;
    const safeText = normalizedMedia.preserveTextSafeArea ? "true" : "false";
    const wrapperClass = ["media-frame", className || "", config.bare ? "media-frame--bare" : ""]
      .filter(Boolean)
      .join(" ");
    const stage = config.stage ? ` data-stage="${config.stage}"` : "";
    const resolvedSource = resolveAssetSource(normalizedMedia.src);
    const fallbackSource = getFallbackMediaSource(normalizedMedia);
    const sourceAttributes = inlineSource
      ? `src="${resolvedSource}" data-fallback-src="${fallbackSource}"`
      : `src="${EMPTY_MEDIA}" data-src="${resolvedSource}" data-fallback-src="${fallbackSource}"`;

    return `
      <figure
        class="${wrapperClass}"
        data-media-tier="${tier}"
        data-fit="${fit}"
        data-role="${role}"
        data-text-safe="${safeText}"${stage}
        style="--media-ratio:${normalizedMedia.ratio || "4 / 5"};--media-position:${focalX}% ${focalY}%;--media-fit:${fit};"
      >
        <img
          class="stable-media"
          ${sourceAttributes}
          alt="${alt}"
          width="${normalizedMedia.width}"
          height="${normalizedMedia.height}"
          data-media-tier="${tier}"
          loading="${loading}"
          decoding="${decoding}"${fetchPriority}
        >
      </figure>
    `;
  }

  function getTaxonomyLabel(group, value) {
    const bucket = data.taxonomy.labels[group] || {};
    const entry = bucket[value];
    return entry ? entry[locale] : value;
  }

  function getGroupLabel(group) {
    return data.taxonomy.groups[group][locale];
  }

  function unique(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  function overlaps(left, right) {
    return left.filter((value) => right.includes(value)).length;
  }

  function sortedProducts() {
    return [...data.products].sort((a, b) => a.featuredOrder - b.featuredOrder);
  }

  function getValidTimestamp(value) {
    const timeValue = new Date(value || "").getTime();
    return Number.isFinite(timeValue) && timeValue > 0 ? timeValue : 0;
  }

  function normalizeProjectEntry(item, index) {
    const source = item || {};
    const titleVi = normalizeText(source.titleVi || source.title || "");
    const titleEn = normalizeText(source.titleEn || source.title || titleVi);
    const summaryVi = normalizeText(source.summaryVi || source.excerptVi || source.taglineVi || source.introVi || "");
    const summaryEn = normalizeText(source.summaryEn || source.excerptEn || source.taglineEn || source.introEn || summaryVi);
    const introVi = normalizeText(source.introVi || source.excerptVi || source.summaryVi || source.taglineVi || "");
    const introEn = normalizeText(source.introEn || source.excerptEn || source.summaryEn || source.taglineEn || introVi);
    const typeVi = normalizeText(source.typeVi || source.categoryVi || source.type || "");
    const typeEn = normalizeText(source.typeEn || source.categoryEn || source.type || typeVi);
    const publishedAt = normalizeText(source.publishedAt || source.updatedAt || source.createdAt || "");
    const timestamp = getValidTimestamp(publishedAt);
    const yearLabel = normalizeText(source.year || (timestamp ? String(new Date(timestamp).getFullYear()) : ""));
    const coverMedia = source.cover || source.hero || data.siteMeta.pageAssets.projects;
    const mediaAlt = getMediaAlt(coverMedia || {});
    const coverAltVi = mediaAlt || normalizeText(source.coverAltVi || source.coverAlt || titleVi);
    const coverAltEn = mediaAlt || normalizeText(source.coverAltEn || source.coverAlt || titleEn);

    return {
      ...source,
      id: source.id || source._id || `project-${index + 1}`,
      titleVi,
      titleEn,
      summaryVi,
      summaryEn,
      excerptVi: normalizeText(source.excerptVi || summaryVi),
      excerptEn: normalizeText(source.excerptEn || summaryEn),
      introVi,
      introEn,
      cover: coverMedia,
      coverImage: normalizeText(source.coverImage || coverMedia.src || ""),
      coverAltVi,
      coverAltEn,
      coverAlt: locale === "vi" ? coverAltVi : coverAltEn,
      publishedAt,
      publishedTimestamp: timestamp,
      year: yearLabel,
      categoryVi: normalizeText(source.categoryVi || typeVi),
      categoryEn: normalizeText(source.categoryEn || typeEn),
      typeVi,
      typeEn,
      manualOrder: Number.isFinite(Number(source.featuredOrder)) ? Number(source.featuredOrder) : index + 1,
    };
  }

  function sortedProjects() {
    return [...(data.projects || [])]
      .map((item, index) => normalizeProjectEntry(item, index))
      .sort((left, right) => {
        if (left.publishedTimestamp && right.publishedTimestamp && left.publishedTimestamp !== right.publishedTimestamp) {
          return right.publishedTimestamp - left.publishedTimestamp;
        }
        if (left.publishedTimestamp && !right.publishedTimestamp) return -1;
        if (!left.publishedTimestamp && right.publishedTimestamp) return 1;
        return left.manualOrder - right.manualOrder;
      });
  }

  function sortedTutorials() {
    return [...(data.tutorials || [])].sort((a, b) => {
      return getValidTimestamp(b.publishedAt) - getValidTimestamp(a.publishedAt);
    });
  }

  function sortedNews() {
    return [...(data.news || [])].sort((a, b) => {
      if (Boolean(a.isFeatured) !== Boolean(b.isFeatured)) return Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured));
      return new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime();
    });
  }

  async function loadMigrationJson(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to load ${path}`);
    return response.json();
  }

  function slugifyArchiveValue(value) {
    const normalizedValue = normalizeText(String(value || ""))
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return normalizedValue || "item";
  }

  function buildUniqueArchiveSlug(item, usedSlugs) {
    const baseSlug = slugifyArchiveValue(item.slug || item.title || item.name || item._id);
    let nextSlug = baseSlug;
    if (usedSlugs.has(nextSlug)) {
      const suffix = slugifyArchiveValue(item._id || `${Date.now()}`).slice(-8) || String(usedSlugs.size + 1);
      nextSlug = `${baseSlug}-${suffix}`;
    }
    let dedupeIndex = 2;
    while (usedSlugs.has(nextSlug)) {
      nextSlug = `${baseSlug}-${dedupeIndex}`;
      dedupeIndex += 1;
    }
    usedSlugs.add(nextSlug);
    return nextSlug;
  }

  function escapeHtmlText(value) {
    return normalizeText(String(value || ""))
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getArticlePlainText(htmlValue) {
    if (!htmlValue) return "";
    const template = document.createElement("template");
    template.innerHTML = String(htmlValue);
    $$("script, style, iframe, object, embed, form, input, button, textarea, select, noscript", template.content).forEach((node) => node.remove());
    const plainText = normalizeText(template.content.textContent || "").replace(/\s+/g, " ").trim();
    return plainText;
  }

  function sanitizeMigratedHtml(htmlValue) {
    const genericFallbackSrc = resolveAssetSource(MEDIA_FALLBACKS.archive || MEDIA_FALLBACKS.editorial);
    const template = document.createElement("template");
    template.innerHTML = String(htmlValue || "");
    $$("script, style, iframe, object, embed, form, input, button, textarea, select, noscript", template.content).forEach((node) => node.remove());

    const textWalker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (textWalker.nextNode()) textNodes.push(textWalker.currentNode);
    textNodes.forEach((textNode) => {
      textNode.nodeValue = normalizeText(textNode.nodeValue || "");
    });

    $$("*", template.content).forEach((element) => {
      Array.from(element.attributes).forEach((attribute) => {
        const attrName = attribute.name.toLowerCase();
        if (attrName.startsWith("on") || attrName === "style" || attrName === "class" || attrName === "id") {
          element.removeAttribute(attribute.name);
          return;
        }
        if (attrName === "src" || attrName === "href") {
          const rawValue = normalizeText(attribute.value || "").trim();
          if (!rawValue || rawValue.startsWith("#") || rawValue.startsWith("mailto:") || rawValue.startsWith("tel:")) {
            element.setAttribute(attribute.name, rawValue);
            return;
          }
          const isExternal = /^(https?:)?\/\//i.test(rawValue);
          if (attrName === "src") {
            const nextImageSrc = resolveAssetSource(rawValue);
            element.setAttribute("src", nextImageSrc);
            element.setAttribute("loading", "lazy");
            element.setAttribute("decoding", "async");
            element.setAttribute("data-fallback-src", genericFallbackSrc);
          } else if (isExternal || /^\/?(uploads|images)\//i.test(rawValue)) {
            const resolvedHref = resolveAssetSource(rawValue);
            element.setAttribute("href", resolvedHref);
            if (/^https?:\/\//i.test(resolvedHref)) {
              element.setAttribute("target", "_blank");
              element.setAttribute("rel", "noreferrer");
            }
          } else {
            element.setAttribute("href", rawValue);
          }
          return;
        }
        if (attrName === "alt" || attrName === "title") {
          element.setAttribute(attribute.name, normalizeText(attribute.value || ""));
        }
      });
    });

    $$("p, ul, ol", template.content).forEach((element) => {
      const hasRenderableChild = Boolean($("img, video, picture, iframe, table", element));
      const textContent = normalizeText(element.textContent || "").replace(/\s+/g, " ").trim();
      if (!hasRenderableChild && !textContent) element.remove();
    });

    return template.innerHTML.trim();
  }

  function getMigratedContentImage(item, fallbackMedia, title) {
    const directImage = item.featuredImage || item.image || item.coverImage || item.thumbnail || "";
    if (directImage) {
      return {
        src: directImage,
        ratio: "16 / 10",
        fit: "cover",
        role: "archive",
        alt: { vi: normalizeText(title), en: normalizeText(title) },
      };
    }

    const template = document.createElement("template");
    template.innerHTML = String(item.description || item.content || "");
    const image = $("img[src]", template.content);
    if (image && image.getAttribute("src")) {
      return {
        src: image.getAttribute("src"),
        ratio: "16 / 10",
        fit: "cover",
        role: "archive",
        alt: { vi: normalizeText(image.getAttribute("alt") || title), en: normalizeText(image.getAttribute("alt") || title) },
      };
    }

    return fallbackMedia;
  }

  function formatArchiveDate(value) {
    const dateValue = new Date(value);
    if (Number.isNaN(dateValue.getTime())) return "";
    const formatter = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
    return formatter.format(dateValue);
  }

  function formatDurationLabel(value) {
    if (value == null || value === "") return "";
    if (typeof value === "string") return normalizeText(value);
    const durationValue = Number(value);
    if (!Number.isFinite(durationValue) || durationValue <= 0) return "";
    return locale === "vi" ? `${durationValue} phút` : `${durationValue} min`;
  }

  function buildMigratedProjects(projectRows) {
    const usedSlugs = new Set();
    return (projectRows || [])
      .filter((item) => item && item.isActive !== false)
      .map((item, index) => {
        const title = normalizeText(item.name || "");
        const sourceSlug = normalizeText(item.slug || "");
        const summaryText = normalizeText(item.shortDescription || "") || getArticlePlainText(item.description).slice(0, 260);
        const cover = getMigratedContentImage(
          item,
          { src: "/assets/img/project-expo.svg", ratio: "16 / 10", fit: "cover", role: "archive", alt: { vi: title, en: title } },
          title
        );
        const safeHtml = sanitizeMigratedHtml(item.description || "");
        const publishedAt = item.updatedAt || item.createdAt || "";
        return {
          id: item._id || `project-${index + 1}`,
          slug: buildUniqueArchiveSlug(item, usedSlugs),
          sourceSlug,
          cover,
          hero: { ...cover, ratio: "16 / 10" },
          titleVi: title,
          titleEn: title,
          summaryVi: summaryText,
          summaryEn: summaryText,
          introVi: summaryText,
          introEn: summaryText,
          contentHtml: safeHtml,
          year: publishedAt ? String(new Date(publishedAt).getFullYear()) : "",
          type: normalizeText(item.category || ""),
          season: formatArchiveDate(publishedAt),
          taglineVi: summaryText,
          taglineEn: summaryText,
          audienceVi: normalizeText(item.level || ""),
          audienceEn: normalizeText(item.level || ""),
          locationVi: "Smart Steam",
          locationEn: "Smart Steam",
          durationLabel: formatDurationLabel(item.duration),
          isFeatured: Boolean(item.featured),
          publishedAt,
          authorVi: "Smart Steam",
          authorEn: "Smart Steam",
          tags: Array.isArray(item.tags) ? item.tags.map((entry) => normalizeText(entry)).filter(Boolean) : [],
          featuredOrder: Boolean(item.featured) ? index + 1 : 1000 + index,
        };
      })
      .sort((left, right) => {
        if (Boolean(left.isFeatured) !== Boolean(right.isFeatured)) return Number(Boolean(right.isFeatured)) - Number(Boolean(left.isFeatured));
        return new Date(right.publishedAt || 0).getTime() - new Date(left.publishedAt || 0).getTime();
      })
      .map((item, index) => ({ ...item, featuredOrder: index + 1 }));
  }

  function buildMigratedTutorials(tutorialRows, categoryRows) {
    const usedSlugs = new Set();
    const categoryMap = new Map((categoryRows || []).map((item) => [item._id, normalizeText(item.name || "")]));
    return (tutorialRows || [])
      .filter((item) => item && item.isPublished !== false)
      .map((item, index) => {
        const title = normalizeText(item.title || "");
        const sourceSlug = normalizeText(item.slug || "");
        const summaryText = normalizeText(item.description || item.shortDescription || "") || getArticlePlainText(item.content).slice(0, 240);
        const categoryName = categoryMap.get(item.categoryId) || "";
        const publishedAt = item.updatedAt || item.createdAt || "";
        const cover = getMigratedContentImage(
          item,
          { src: "/assets/img/product-coding.svg", ratio: "16 / 10", fit: "cover", role: "archive", alt: { vi: title, en: title } },
          title
        );
        return {
          id: item._id || `tutorial-${index + 1}`,
          slug: buildUniqueArchiveSlug(item, usedSlugs),
          sourceSlug,
          titleVi: title,
          titleEn: title,
          summaryVi: summaryText,
          summaryEn: summaryText,
          categoryVi: categoryName,
          categoryEn: categoryName,
          authorVi: normalizeText(item.author || "Smart Steam"),
          authorEn: normalizeText(item.author || "Smart Steam"),
          cover,
          contentHtml: sanitizeMigratedHtml(item.content || ""),
          difficulty: normalizeText(item.difficulty || ""),
          durationMinutes: Number.isFinite(Number(item.duration)) ? Number(item.duration) : 0,
          durationLabel: formatDurationLabel(item.duration),
          publishedAt,
          views: Number(item.views || 0),
          likes: Number(item.likes || 0),
          tags: Array.isArray(item.tags) ? item.tags.map((entry) => normalizeText(entry)).filter(Boolean) : [],
        };
      });
  }

  function buildMigratedNews(newsRows, categoryRows) {
    const usedSlugs = new Set();
    const categoryMap = new Map((categoryRows || []).map((item) => [item._id, normalizeText(item.name || "")]));
    return (newsRows || [])
      .filter((item) => item && item.status !== "draft")
      .map((item, index) => {
        const title = normalizeText(item.title || "");
        const sourceSlug = normalizeText(item.slug || "");
        const summaryText = normalizeText(item.excerpt || "") || getArticlePlainText(item.content).slice(0, 260);
        const categoryName = categoryMap.get(item.categoryId) || "";
        const publishedAt = item.updatedAt || item.createdAt || "";
        const cover = getMigratedContentImage(
          item,
          { src: "/assets/img/project-school.svg", ratio: "16 / 10", fit: "cover", role: "archive", alt: { vi: title, en: title } },
          title
        );
        return {
          id: item._id || `news-${index + 1}`,
          slug: buildUniqueArchiveSlug(item, usedSlugs),
          sourceSlug,
          titleVi: title,
          titleEn: title,
          summaryVi: summaryText,
          summaryEn: summaryText,
          categoryVi: categoryName,
          categoryEn: categoryName,
          authorVi: normalizeText(item.author || "Smart Steam"),
          authorEn: normalizeText(item.author || "Smart Steam"),
          cover,
          contentHtml: sanitizeMigratedHtml(item.content || ""),
          isFeatured: Boolean(item.isFeatured),
          publishedAt,
          tags: Array.isArray(item.tags) ? item.tags.map((entry) => normalizeText(entry)).filter(Boolean) : [],
        };
      });
  }

  function mergeMigratedProducts(productRows) {
    if (!Array.isArray(data.products) || !data.products.length || !Array.isArray(productRows)) return;

    const productMap = new Map(
      productRows
        .filter((item) => item && item.slug)
        .map((item) => [normalizeText(item.slug), item])
    );

    data.products = data.products.map((product) => {
      const migratedProduct = productMap.get(normalizeText(product.slug || ""));
      if (!migratedProduct) return product;

      const fullDescription = String(migratedProduct.fullDescription || "").trim();
      if (!fullDescription) return product;

      const sanitizedDescription = sanitizeMigratedHtml(fullDescription);
      if (!sanitizedDescription) return product;

      return {
        ...product,
        descriptionHtmlVi: sanitizedDescription,
        descriptionHtmlEn: sanitizedDescription,
      };
    });
  }

  function loadMigratedArchiveData() {
    if (state.migratedArchivePromise) return state.migratedArchivePromise;

    state.migratedArchivePromise = Promise.all([
      loadMigrationJson(MIGRATION_ENDPOINTS.products),
      loadMigrationJson(MIGRATION_ENDPOINTS.projects),
      loadMigrationJson(MIGRATION_ENDPOINTS.tutorials),
      loadMigrationJson(MIGRATION_ENDPOINTS.tutorialCategories),
      loadMigrationJson(MIGRATION_ENDPOINTS.news),
      loadMigrationJson(MIGRATION_ENDPOINTS.newsCategories),
    ])
      .then(([productRows, projectRows, tutorialRows, tutorialCategoryRows, newsRows, newsCategoryRows]) => {
        mergeMigratedProducts(productRows);
        const nextProjects = buildMigratedProjects(projectRows);
        const nextTutorials = buildMigratedTutorials(tutorialRows, tutorialCategoryRows);
        const nextNews = buildMigratedNews(newsRows, newsCategoryRows);
        if (nextProjects.length) data.projects = nextProjects;
        data.tutorials = nextTutorials;
        data.news = nextNews;
      })
      .catch(() => {
        if (!Array.isArray(data.tutorials)) data.tutorials = [];
        if (!Array.isArray(data.news)) data.news = [];
      });

    return state.migratedArchivePromise;
  }

  function markMediaFrameLoaded(image) {
    if (!image) return;
    image.dataset.mediaLoaded = "true";
    const frame = image.closest(".media-frame");
    if (frame) frame.classList.add("is-loaded");
  }

  function applyImageFallback(image) {
    if (!image || image.dataset.fallbackApplied === "true") return false;
    const fallbackSource = image.dataset.fallbackSrc;
    if (!fallbackSource || image.getAttribute("src") === fallbackSource) return false;
    image.dataset.fallbackApplied = "true";
    image.removeAttribute("data-src");
    image.setAttribute("src", fallbackSource);
    return true;
  }

  function bindStableMedia(root) {
    $$("img", root || document).forEach((image) => {
      if (!image.closest(".media-frame") && !image.dataset.fallbackSrc) return;
      if (image.dataset.mediaBound === "true") return;
      if (image.dataset.src && image.getAttribute("src") !== image.dataset.src) return;
      image.dataset.mediaBound = "true";
      const finalize = () => markMediaFrameLoaded(image);
      const recover = () => {
        if (applyImageFallback(image)) {
          if (image.complete && image.naturalWidth) finalize();
          return;
        }
        finalize();
      };
      if (image.complete) {
        if (image.naturalWidth) finalize();
        else recover();
        return;
      }
      image.addEventListener("load", finalize, { once: true });
      image.addEventListener("error", recover);
    });
  }

  function ensureImageReady(image) {
    return new Promise((resolve) => {
      if (!image) {
        resolve(null);
        return;
      }

      const pendingSource = image.dataset.src;
      if (pendingSource && image.getAttribute("src") !== pendingSource) {
        image.setAttribute("src", pendingSource);
        image.removeAttribute("data-src");
      }

      const finish = () => {
        const decoded = typeof image.decode === "function" ? image.decode().catch(() => null) : Promise.resolve();
        decoded.finally(() => {
          markMediaFrameLoaded(image);
          resolve(image);
        });
      };

      const recover = () => {
        if (applyImageFallback(image)) {
          if (image.complete && image.naturalWidth) finish();
          return;
        }
        markMediaFrameLoaded(image);
        resolve(image);
      };

      if (image.complete) {
        if (image.naturalWidth) finish();
        else recover();
        return;
      }

      image.addEventListener("load", finish, { once: true });
      image.addEventListener("error", recover);
    });
  }

  function hydrateDynamicMedia(root) {
    const scope = root || document;
    $$("img[data-src]", scope).forEach((image) => {
      ensureImageReady(image);
    });
    bindStableMedia(scope);
  }

  function preloadImageSource(src) {
    return new Promise((resolve) => {
      if (!src) {
        resolve();
        return;
      }

      const image = new Image();
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        const decoded = typeof image.decode === "function" ? image.decode().catch(() => null) : Promise.resolve();
        decoded.finally(resolve);
      };

      image.onload = finish;
      image.onerror = finish;
      image.src = src;
      if (image.complete) finish();
    });
  }

  async function loadMediaBatch(images, batchSize) {
    const queue = images.filter(
      (image) => image && image.dataset.mediaLoaded !== "true" && (image.dataset.src || image.currentSrc || image.getAttribute("src"))
    );
    const size = Math.max(1, batchSize || 1);

    for (let index = 0; index < queue.length; index += size) {
      const slice = queue.slice(index, index + size);
      await Promise.all(slice.map((image) => ensureImageReady(image)));
    }
  }

  function getHeroImage(root) {
    return $('[data-stage="hero"] img', root) || $(".js-detail-stage img", root) || $(".page-intro__visual img", root);
  }

  function refreshInteractiveLayers(root) {
    bindStableMedia(root || document);
    if (!body.classList.contains("is-secondary-visible")) return;
    initMediaPriorityLoading(root);
    initScrollMotion();
  }

  function releaseTransitionHold(delay) {
    const layer = $(".js-transition-layer");
    if (!layer || !state.transitionPending) return;
    window.setTimeout(() => {
      layer.classList.remove("is-active", "is-holding");
      sessionStorage.removeItem("stemora_transition_pending");
      state.transitionPending = false;
      body.classList.remove("is-transitioning");
    }, delay);
  }

  function ensureShell() {
    body.classList.add(`page-${page}`);
    if (!$(".js-preloader")) {
      body.insertAdjacentHTML(
        "afterbegin",
        `
          <div class="preloader js-preloader" aria-hidden="false">
            <div class="preloader__inner">
              <div class="preloader__mark">${data.siteMeta.shortBrand}</div>
              <img class="preloader__logo" src="${data.siteMeta.logo.src}" alt="${getMediaAlt(data.siteMeta.logo)}" width="${data.siteMeta.logo.width}" height="${data.siteMeta.logo.height}">
              <div class="preloader__percent js-preloader-percent">0%</div>
              <div class="preloader__track" aria-hidden="true"><span class="js-preloader-bar"></span></div>
              <p class="preloader__copy">${strings.preloader.copy}</p>
            </div>
          </div>
        `
      );
    }

    if (!$(".js-transition-layer")) {
      body.insertAdjacentHTML(
        "beforeend",
        `
          <div class="transition-layer js-transition-layer" aria-hidden="true">
            <div class="transition-layer__mark">${data.siteMeta.shortBrand}</div>
          </div>
        `
      );
    }

    if (!$(".js-menu-overlay")) {
      body.insertAdjacentHTML("beforeend", renderMenuOverlay());
    }
  }

  function renderMenuOverlay() {
    const routeMarkup = strings.menu.routes
      .map(
        (item, index) => `
          <a class="menu-route" href="${getLocalePath(item.key)}" data-transition style="--stagger-index:${index};">
            <span class="menu-route__kicker">${item.title}</span>
            <strong class="menu-route__title">${item.title}</strong>
            <span class="menu-route__teaser">${item.teaser}</span>
          </a>
        `
      )
      .join("");

    const socials = data.siteMeta.socials
      .map((item) => `<a class="menu-social" href="${item.href}">${item.label}</a>`)
      .join("");

    return `
      <div class="menu-overlay js-menu-overlay" id="site-menu" hidden>
        <button class="menu-overlay__scrim js-menu-close" type="button" aria-label="${strings.actions.closeMenu}"></button>
        <section class="menu-sheet" role="dialog" aria-modal="true" aria-label="${strings.menu.title}" tabindex="-1">
          <div class="menu-sheet__top">
            <p class="menu-sheet__eyebrow">${strings.menu.eyebrow}</p>
            <button class="menu-sheet__close js-menu-close" type="button" aria-label="${strings.actions.closeMenu}">${strings.actions.closeMenu}</button>
          </div>
          <div class="menu-sheet__intro">
            <h2>${strings.menu.title}</h2>
            <p>${strings.menu.intro}</p>
          </div>
          <div class="menu-sheet__routes">${routeMarkup}</div>
          <div class="menu-sheet__bottom">
            <div class="menu-sheet__contact">
              <span>${strings.menu.contactLine}</span>
              <span>${data.siteMeta.socialHandle}</span>
            </div>
            <div class="menu-sheet__meta">
              <div class="menu-sheet__language">
                <span>${strings.menu.languageLabel}</span>
                <div class="menu-lang">
                  <a href="${getAlternateLocalePath("vi")}" class="${locale === "vi" ? "is-current" : ""}" data-transition>VI</a>
                  <a href="${getAlternateLocalePath("en")}" class="${locale === "en" ? "is-current" : ""}" data-transition>EN</a>
                </div>
              </div>
              <div class="menu-sheet__socials">${socials}</div>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  function initGlobalShell() {
    const header = $(".js-site-header");
    const footer = $(".js-site-footer");
    if (!header || !footer) return;
    const footerLinks = ["welcome", "products", "projects", "contact", "policy"];
    const footerCopy = {
      lead: normalizeText(strings.footer.lead),
      title: normalizeText(strings.footer.title),
      invitation: normalizeText(strings.footer.invitation),
      contactLabel: normalizeText(strings.footer.contactLabel),
      quickLinks: normalizeText(strings.footer.quickLinks),
      connect: normalizeText(strings.footer.connect),
      consultation: normalizeText(strings.actions.getConsultation),
      footerNote: normalizeText(data.siteMeta.footerNote[locale]),
      socialHandle: normalizeText(data.siteMeta.socialHandle),
      copyright: normalizeText(data.siteMeta.copyright),
      phone: normalizeText(data.siteMeta.contact.phone),
      email: normalizeText(data.siteMeta.contact.email),
      address: normalizeText(data.siteMeta.contact.address[locale]),
      hours: normalizeText(data.siteMeta.contact.hours[locale]),
    };
    const footerContactItems = [
      footerCopy.email
        ? `<a href="mailto:${footerCopy.email}">${footerCopy.email}</a>`
        : "",
      footerCopy.phone
        ? `<a href="tel:${footerCopy.phone.replace(/\s+/g, "")}">${footerCopy.phone}</a>`
        : "",
      footerCopy.address ? `<span>${footerCopy.address}</span>` : "",
      footerCopy.hours ? `<span>${footerCopy.hours}</span>` : "",
    ].filter(Boolean).join("");
    const footerSocials = data.siteMeta.socials
      .map((item) => `<a href="${item.href}" target="_blank" rel="noreferrer">${normalizeText(item.label)}</a>`)
      .join("");

    const navItems = [
      { key: "welcome", active: page === "welcome" },
      { key: "products", active: page === "products" || page === "product-detail" },
      { key: "projects", active: page === "projects" || page === "project-detail" },
      { key: "tutorials", active: page === "tutorials" || page === "tutorial-detail" },
      { key: "news", active: page === "news" || page === "news-detail" },
      { key: "contact", active: page === "contact" },
    ];
    const welcomeThemeLabels = getWelcomeThemeLabels();
    const currentWelcomeTheme = getWelcomeTheme();
    const welcomeThemeToggle = `
            <button
              class="welcome-theme-toggle js-welcome-theme-toggle"
              type="button"
              data-theme="${currentWelcomeTheme}"
              aria-pressed="${String(currentWelcomeTheme === "light")}"
              aria-label="${currentWelcomeTheme === "light" ? welcomeThemeLabels.switchToDark : welcomeThemeLabels.switchToLight}"
            >
              <span class="welcome-theme-toggle__track" aria-hidden="true">
                <span class="welcome-theme-toggle__thumb"></span>
              </span>
              <span class="welcome-theme-toggle__label js-welcome-theme-toggle-label">${currentWelcomeTheme === "light" ? welcomeThemeLabels.light : welcomeThemeLabels.dark}</span>
            </button>
          `;

    header.innerHTML = `
      <div class="header-shell">
        <div class="container header-shell__inner">
          <a class="brandmark" href="${getLocalePath("welcome")}" data-transition aria-label="${strings.siteName}">
            <img src="${data.siteMeta.logo.src}" alt="${getMediaAlt(data.siteMeta.logo)}" width="${data.siteMeta.logo.width}" height="${data.siteMeta.logo.height}">
            <span class="brandmark__copy">
              <strong>${strings.siteName}</strong>
            </span>
          </a>
          <nav class="primary-nav" aria-label="Primary navigation">
            ${navItems
        .map(
          (item) => `
                  <a class="primary-nav__link ${item.active ? "is-active" : ""}" href="${getLocalePath(item.key)}" data-transition ${item.active ? 'aria-current="page"' : ""
            }>${strings.nav[item.key]}</a>
                `
        )
        .join("")}
          </nav>
          <div class="header-actions">
            ${welcomeThemeToggle}
            <span class="header-lang-inline">
              <a href="${getAlternateLocalePath("vi")}" data-transition class="${locale === "vi" ? "is-current" : ""}">VI</a>
              <span class="header-lang-inline__sep">/</span>
              <a href="${getAlternateLocalePath("en")}" data-transition class="${locale === "en" ? "is-current" : ""}">EN</a>
            </span>
            <a class="header-consult-btn" href="${getLocalePath("contact")}" data-transition>${locale === "vi" ? "Nhận tư vấn" : "Consultation"}</a>
          </div>
        </div>
      </div>
    `;
    updateWelcomeThemeToggle();
    const welcomeThemeButton = $(".js-welcome-theme-toggle", header);
    if (welcomeThemeButton) {
      welcomeThemeButton.addEventListener("click", (event) => {
        event.preventDefault();
        setWelcomeTheme(getWelcomeTheme() === "light" ? "dark" : "light");
      });
    }

    footer.innerHTML = `
      <div class="container">
        <div class="footer-shell">
          <div class="footer-shell__intro">
            <p class="footer-shell__lead">${footerCopy.lead}</p>
            <h2>${footerCopy.title}</h2>
            <p>${footerCopy.invitation}</p>
            <a class="footer-shell__talk" href="${getLocalePath("contact")}" data-transition>${footerCopy.consultation}</a>
          </div>
          <div class="footer-shell__block">
            <span class="footer-shell__label">${footerCopy.contactLabel}</span>
            ${footerContactItems}
          </div>
          <div class="footer-shell__block">
            <span class="footer-shell__label">${footerCopy.quickLinks}</span>
            ${footerLinks.map((key) => `<a href="${getLocalePath(key)}" data-transition>${normalizeText(strings.nav[key])}</a>`).join("")}
          </div>
          <div class="footer-shell__block">
            <span class="footer-shell__label">${footerCopy.connect}</span>
            <div class="footer-shell__socials">
              ${footerSocials}
            </div>
            <p>${footerCopy.footerNote}</p>
          </div>
        </div>
        <div class="footer-shell__bottom">
          <span>${footerCopy.socialHandle}</span>
          <span>${footerCopy.copyright}</span>
        </div>
      </div>
    `;

    const baseMeta = strings.pageMeta[page] || (page === "policy-detail" ? strings.pageMeta.policy : null);
    if (baseMeta) updateMeta(baseMeta.title, baseMeta.description);

    const headerShell = $(".header-shell");
    const handleScroll = () => {
      if (window.scrollY > 24) headerShell.classList.add("is-scrolled");
      else headerShell.classList.remove("is-scrolled");
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
  }

  function initMenuOverlay() {
    const overlay = $(".js-menu-overlay");
    const sheet = $(".menu-sheet", overlay);
    if (!overlay || !sheet) return;

    const closeMenu = () => {
      state.menuOpen = false;
      overlay.classList.remove("is-open");
      body.classList.remove("menu-open");
      $$(".js-menu-trigger").forEach((button) => button.setAttribute("aria-expanded", "false"));
      window.setTimeout(() => {
        overlay.setAttribute("hidden", "");
      }, 320);
      if (state.lastFocused) state.lastFocused.focus();
    };

    const openMenu = (trigger) => {
      state.menuOpen = true;
      state.lastFocused = trigger || document.activeElement;
      overlay.removeAttribute("hidden");
      body.classList.add("menu-open");
      $$(".js-menu-trigger").forEach((button) => button.setAttribute("aria-expanded", "true"));
      requestAnimationFrame(() => overlay.classList.add("is-open"));
      window.setTimeout(() => {
        const firstLink = $(".menu-route", overlay);
        if (firstLink) firstLink.focus();
      }, 120);
    };

    document.addEventListener("click", (event) => {
      const opener = event.target.closest(".js-menu-trigger");
      if (opener) {
        event.preventDefault();
        if (state.menuOpen) closeMenu();
        else openMenu(opener);
      }

      const closer = event.target.closest(".js-menu-close");
      if (closer && state.menuOpen) {
        event.preventDefault();
        closeMenu();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.menuOpen) closeMenu();
      if (event.key !== "Tab" || !state.menuOpen) return;
      const focusables = $$(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        overlay
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  function initPageTransition() {
    const layer = $(".js-transition-layer");
    if (!layer) return;
    if (state.transitionPending) layer.classList.add("is-active", "is-holding");

    window.addEventListener("pageshow", (event) => {
      if (!event.persisted) return;
      layer.classList.remove("is-active", "is-holding");
      sessionStorage.removeItem("stemora_transition_pending");
      state.transitionPending = false;
      body.classList.remove("is-transitioning");
    });

    document.addEventListener("click", (event) => {
      const link = event.target.closest("a[data-transition]");
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || link.target === "_blank" || link.hasAttribute("download") || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const next = new URL(href, window.location.origin);
      if (next.origin !== window.location.origin) return;
      if (normalizePath(next.pathname) === currentPath && next.search === window.location.search && next.hash === window.location.hash) return;
      event.preventDefault();
      sessionStorage.setItem("stemora_transition_pending", "1");
      body.classList.add("is-transitioning");
      layer.classList.remove("is-holding");
      layer.classList.add("is-active");
      window.setTimeout(() => {
        window.location.href = `${next.pathname}${next.search}${next.hash}`;
      }, transitionTuning.leaveDuration || 420);
    });
  }

  function initPreloader() {
    const preloader = $(".js-preloader");
    const percent = $(".js-preloader-percent");
    const bar = $(".js-preloader-bar");
    if (!preloader || !percent || !bar) {
      initPageExperience();
      return;
    }

    const assets = getCriticalAssetsForPage();
    const total = assets.length;
    let loaded = 0;
    let displayProgress = 0;
    let resolved = total === 0;
    const seenVisit = sessionStorage.getItem("stemora_has_visited") === "1";
    const fallbackMs = seenVisit ? preloadTuning.repeatVisitFallback || 2200 : preloadTuning.firstVisitFallback || 3400;
    const startTime = performance.now();
    let finished = false;

    const done = () => {
      if (finished) return;
      finished = true;
      sessionStorage.setItem("stemora_has_visited", "1");
      body.classList.add("is-ready");
      preloader.classList.add("is-hidden");
      initPageExperience();
      window.setTimeout(() => {
        preloader.setAttribute("aria-hidden", "true");
      }, 700);
    };

    const handleResolved = () => {
      loaded += 1;
      if (loaded >= total) resolved = true;
    };

    assets.forEach((src) => {
      preloadImageSource(src).finally(handleResolved);
    });

    const tick = (timestamp) => {
      const elapsed = timestamp - startTime;
      const fallbackDone = elapsed >= fallbackMs;
      const actual = total ? (loaded / total) * 100 : 100;
      const timedFloor = clamp(elapsed / 22, 4, 78);
      let target = Math.max(actual, timedFloor);
      if (resolved || fallbackDone) target = 100;
      else target = Math.min(target, 96);

      displayProgress += (target - displayProgress) * (resolved || fallbackDone ? 0.18 : 0.1);
      const rounded = Math.round(displayProgress);
      percent.textContent = `${rounded}%`;
      bar.style.width = `${rounded}%`;

      if ((resolved || fallbackDone) && displayProgress > 99.4) {
        done();
        return;
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  function getCriticalAssetsForPage() {
    const logo = data.siteMeta.logo.src;
    const sources = [logo];
    if (page === "welcome") {
      const scenes = data.welcomeScenes[locale];
      const collage = data.welcomeCollage[locale];
      [scenes[0], scenes[1], scenes[2]].forEach((scene) => {
        if (scene && scene.media) sources.push(scene.media.src);
      });
      if (collage[0]) sources.push(collage[0].media.src);
    } else if (page === "products") {
      sources.push(data.siteMeta.pageAssets.products.src);
      sortedProducts().slice(0, 3).forEach((item) => sources.push(item.cover.src));
    } else if (page === "product-detail") {
      const item = data.products.find((entry) => entry.slug === slugFromPath());
      if (item) {
        sources.push(item.hero.src);
        if (item.gallery[0]) sources.push(item.gallery[0].src);
      }
    } else if (page === "projects") {
      sources.push(data.siteMeta.pageAssets.projects.src);
      sortedProjects().slice(0, 2).forEach((item) => sources.push(item.cover.src));
    } else if (page === "project-detail") {
      const item = data.projects.find((entry) => entry.slug === slugFromPath() || entry.sourceSlug === slugFromPath());
      if (item) {
        if (item.hero && item.hero.src) sources.push(item.hero.src);
        if (item.gallery && item.gallery[0] && item.gallery[0].src) sources.push(item.gallery[0].src);
      }
    } else if (page === "tutorials") {
      sources.push((data.siteMeta.pageAssets.tutorials || data.siteMeta.pageAssets.products).src);
      sortedTutorials().slice(0, 2).forEach((item) => {
        if (item.cover && item.cover.src) sources.push(item.cover.src);
      });
    } else if (page === "tutorial-detail") {
      const item = sortedTutorials().find((entry) => entry.slug === slugFromPath() || entry.sourceSlug === slugFromPath());
      if (item && item.cover && item.cover.src) sources.push(item.cover.src);
    } else if (page === "news") {
      sources.push(data.siteMeta.pageAssets.projects.src);
      sortedNews().slice(0, 2).forEach((item) => {
        if (item.cover && item.cover.src) sources.push(item.cover.src);
      });
    } else if (page === "news-detail") {
      const item = sortedNews().find((entry) => entry.slug === slugFromPath() || entry.sourceSlug === slugFromPath());
      if (item && item.cover && item.cover.src) sources.push(item.cover.src);
    } else if (page === "contact") {
      sources.push(data.siteMeta.pageAssets.contact.src);
    } else if (page === "policy" || page === "policy-detail") {
      sources.push(data.siteMeta.pageAssets.policy.src);
    }
    return unique(sources);
  }

  function initPageExperience() {
    if (state.experienceStarted) return;
    state.experienceStarted = true;

    const root = $(".js-page-root");
    const heroImage = getHeroImage(root);
    const shellDelay = reducedMotion ? 0 : stageTuning.shellDelay || 70;
    const heroDelay = reducedMotion ? 0 : stageTuning.heroDelay || 150;
    const copyDelay = reducedMotion ? 0 : stageTuning.copyDelay || 300;
    const secondaryDelay = reducedMotion ? 0 : stageTuning.secondaryDelay || 520;

    const revealSequence = async () => {
      body.classList.add("is-ready");
      await wait(shellDelay);
      body.classList.add("is-shell-visible");
      await wait(Math.max(0, heroDelay - shellDelay));
      body.classList.add("is-hero-visible");
      await wait(Math.max(0, copyDelay - heroDelay));
      body.classList.add("is-copy-visible");
      releaseTransitionHold(transitionTuning.releaseDelay || 180);
      await wait(Math.max(0, secondaryDelay - copyDelay));
      body.classList.add("is-secondary-visible");
      initMediaPriorityLoading(root);
      initScrollMotion();
      initParallaxScenes();
      initContactForm();
    };

    ensureImageReady(heroImage).finally(revealSequence);
  }

  function initMediaPriorityLoading(root) {
    const scope = root || document;
    bindStableMedia(scope);

    const nearImages = $$('img[data-media-tier="near"]', scope).filter((image) => image.dataset.mediaLoaded !== "true");
    if (nearImages.length) {
      loadMediaBatch(nearImages, mediaTuning.nearCriticalBatch || 2);
    }

    const deferredImages = $$('img[data-media-tier="deferred"]', document).filter(
      (image) => image.dataset.mediaLoaded !== "true" && image.dataset.src
    );

    if (state.deferredObserver) state.deferredObserver.disconnect();
    if (!deferredImages.length) return;

    if (!("IntersectionObserver" in window) || reducedMotion) {
      loadMediaBatch(deferredImages, mediaTuning.deferredBatch || 2);
      return;
    }

    state.deferredObserver = new IntersectionObserver(
      (entries) => {
        const targets = entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target);
        if (!targets.length) return;
        targets.forEach((target) => state.deferredObserver.unobserve(target));
        loadMediaBatch(targets, mediaTuning.deferredBatch || 2);
      },
      { rootMargin: `${mediaTuning.observerMargin || 240}px 0px` }
    );

    deferredImages.forEach((image) => state.deferredObserver.observe(image));
  }

  function initScrollMotion() {
    if (!body.classList.contains("is-secondary-visible")) return;
    const nodes = $$("[data-motion]");
    if (!nodes.length) return;
    nodes.forEach((node) => {
      if (["stagger", "stagger-group", "text-stagger"].includes(node.dataset.motion)) {
        Array.from(node.children).forEach((child, index) => {
          child.style.setProperty("--stagger-index", index);
        });
      }
    });

    if (reducedMotion) {
      nodes.forEach((node) => node.classList.add("is-inview"));
      return;
    }

    if (state.motionObserver) state.motionObserver.disconnect();
    state.motionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-inview");
            if (entry.target.dataset.once !== "false") state.motionObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -12% 0px" }
    );

    nodes.forEach((node) => state.motionObserver.observe(node));
  }

  function initParallaxScenes() {
    if (state.scrollHandler) window.removeEventListener("scroll", state.scrollHandler);
    if (state.resizeHandler) window.removeEventListener("resize", state.resizeHandler);
    if (state.rafId) {
      cancelAnimationFrame(state.rafId);
      state.rafId = 0;
    }

    state.activeParallax = [];
    if (reducedMotion || window.innerWidth < 768) return;

    const speedMap = { slow: 16, medium: 10, fast: 6 };
    state.activeParallax = $$("[data-parallax]").map((element) => ({
      element,
      divisor: speedMap[element.dataset.parallax] || 10,
    }));

    const updateParallax = () => {
      state.activeParallax.forEach((entry) => {
        const rect = entry.element.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const delta = (window.innerHeight / 2 - midpoint) / entry.divisor;
        entry.element.style.setProperty("--parallax-shift", `${clamp(delta, -24, 24).toFixed(2)}px`);
      });
      state.rafId = 0;
    };

    const requestParallax = () => {
      if (state.rafId) return;
      state.rafId = requestAnimationFrame(updateParallax);
    };

    updateParallax();
    state.scrollHandler = requestParallax;
    state.resizeHandler = debounce(requestParallax, 120);
    window.addEventListener("scroll", state.scrollHandler, { passive: true });
    window.addEventListener("resize", state.resizeHandler);
  }

  function runPageCleanup(root) {
    if (!root) return;
    const cleanup = root.__pageCleanup__;
    if (typeof cleanup === "function") cleanup();
    root.__pageCleanup__ = null;
  }

  function registerPageCleanup(root, cleanup) {
    if (!root || typeof cleanup !== "function") return;
    const previous = typeof root.__pageCleanup__ === "function" ? root.__pageCleanup__ : null;
    root.__pageCleanup__ = () => {
      if (previous) previous();
      cleanup();
    };
  }

  function renderCurrentPage() {
    runPageCleanup($(".js-page-root"));
    syncPageThemeState(getWelcomeTheme());
    if (page === "welcome") return renderWelcomePage();
    if (page === "products") return renderProductsPage();
    if (page === "product-detail") return renderProductDetailPageV2();
    if (page === "projects") return renderProjectsPage();
    if (page === "project-detail") return renderProjectDetailPage();
    if (page === "tutorials") return renderTutorialsPage();
    if (page === "tutorial-detail") return renderTutorialDetailPage();
    if (page === "news") return renderNewsPage();
    if (page === "news-detail") return renderNewsDetailPage();
    if (page === "contact") return renderContactPage();
    if (page === "policy" || page === "policy-detail") return renderPolicyPages();
    return null;
  }

  function renderWelcomePage() {
    const root = $(".js-page-root");
    if (!root) return;
    const scenes = data.welcomeScenes[locale];
    const collage = data.welcomeCollage[locale];
    const stats = data.welcomeStats[locale];
    const quote = data.welcomeQuotes[locale][0];
    updateMeta(strings.pageMeta.welcome.title, strings.pageMeta.welcome.description);

    const renderDecor = (scene) =>
      (scene.decorations || [])
        .map((id) => {
          const shape = data.decorShapes.find((item) => item.id === id);
          if (!shape) return "";
          return `<img class="scene-decoration ${shape.className} parallax-layer" src="${resolveAssetSource(shape.media.src)}" alt="" aria-hidden="true" data-parallax="${shape.parallax}">`;
        })
        .join("");

    const renderValuesScene = (scene) => {
      const primary = scene.blocks[0];
      const secondary = scene.blocks[1];

      return `
        <section class="scene scene--values tone-${scene.tone}">
          <div class="container values-scene">
            <div class="scene-header" data-motion="text-stagger">
              <p class="scene-kicker">${scene.eyebrow}</p>
              <h2 class="editorial-title">${scene.headline}</h2>
              <p class="scene-body">${scene.body}</p>
            </div>
            <div class="values-scene__layout">
              <article class="values-spread values-spread--primary" data-motion="scene-enter">
                <div class="values-spread__media values-spread__media--primary" data-motion="fade-right">
                  ${renderMedia(primary.media, "", { tier: "near" })}
                </div>
                <div class="values-spread__copy values-spread__copy--primary" data-motion="text-stagger">
                  <span class="values-spread__index">01</span>
                  <h3>${primary.title}</h3>
                  <p>${primary.body}</p>
                </div>
              </article>
              <article class="values-spread values-spread--secondary" data-motion="scene-enter">
                <div class="values-spread__copy values-spread__copy--secondary" data-motion="text-stagger">
                  <span class="values-spread__index">02</span>
                  <h3>${secondary.title}</h3>
                  <p>${secondary.body}</p>
                </div>
                <div class="values-spread__media values-spread__media--secondary" data-motion="fade-left">
                  ${renderMedia(secondary.media, "", { tier: "deferred" })}
                </div>
              </article>
              <blockquote class="scene-quote values-scene__quote-main" data-motion="scene-enter">
                <p>${scene.quote.text}</p>
                <footer>${scene.quote.author}</footer>
              </blockquote>
              <div class="scene-quote scene-quote--compact values-scene__quote-side" data-motion="scene-enter">
                <p>${quote.quote}</p>
                <footer>${quote.author}</footer>
              </div>
            </div>
          </div>
        </section>
      `;
    };

    const renderProofTile = (item, index, extraClass = "") => `
      <article
        class="proof-collage__tile ${extraClass} proof-collage__tile--${item.tileSpan || item.size || "standard"} proof-collage__tile--${item.emphasis || "soft"} proof-collage__tile--caption-${item.captionMode || "stack"}"
        data-motion="collage-reveal"
      >
        <div class="proof-collage__media">
          ${renderMedia(item.media, "", { tier: index < 2 ? "near" : "deferred" })}
        </div>
        <div class="proof-collage__caption">
          <strong>${item.title}</strong>
          <p>${item.body}</p>
        </div>
      </article>
    `;

    root.innerHTML = `
      <section class="welcome-flow">
        <canvas class="hero-3d-canvas welcome-hero-canvas js-hero-3d-canvas" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: -1; pointer-events: none;"></canvas>
        <section class="scene scene--hero tone-${scenes[0].tone}" style="position: relative; overflow: hidden; perspective: 1000px;">
          <div class="container scene-grid scene-grid--hero" style="position: relative; z-index: 1;">
            <div class="scene-copy" data-stage="copy">
              <p class="scene-kicker">${scenes[0].eyebrow}</p>
              <h1 class="display-title">${scenes[0].headline}</h1>
              <p class="scene-body scene-body--hero">${scenes[0].body}</p>
              <div class="scene-actions">
                <a class="button button--primary" href="${scenes[0].cta.primary.href}" data-transition>${scenes[0].cta.primary.label}</a>
                <a class="button button--ghost" href="${scenes[0].cta.secondary.href}" data-transition>${scenes[0].cta.secondary.label}</a>
              </div>
            </div>

            <div class="scene-hero-visual" data-stage="hero">
              ${renderMedia(scenes[0].media, "scene-hero-visual__main", { priority: true, stage: "hero" })}
            </div>
            
            <div class="hero-cards-grid" data-stage="secondary">
              <div class="hero-card">
                <h3 class="hero-card__title">${scenes[0].headline}</h3>
                <p class="hero-card__body">${scenes[0].body}</p>
                <div class="hero-card__actions">
                  <a class="button button--primary" href="${scenes[0].cta.primary.href}" data-transition>${scenes[0].cta.primary.label}</a>
                  <a class="button button--ghost" href="${scenes[0].cta.secondary.href}" data-transition>${scenes[0].cta.secondary.label}</a>
                </div>
              </div>
              
              <div class="hero-card hero-card--facts">
                <span class="hero-card__eyebrow">${locale === "vi" ? "ĐIỂM CHÍNH" : "QUICK SCAN"}</span>
                <div class="hero-card__fact-list">
                  ${scenes[0].miniFacts.map((item, index) => `
                    <div class="hero-card-fact">
                      <div class="hero-card-fact__icon">
                        ${index === 0 ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' : ''}
                        ${index === 1 ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' : ''}
                        ${index === 2 ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>' : ''}
                      </div>
                      <div class="hero-card-fact__text">
                        <span>${item.label}</span>
                        <strong>${item.value}</strong>
                      </div>
                    </div>
                  `).join("")}
                </div>
              </div>

              <div class="hero-card hero-card--stats">
                <span class="hero-card__eyebrow">${scenes[0].eyebrow}</span>
                <h3 class="hero-card__title">${scenes[0].noteTitle}</h3>
                <div class="hero-card__stat-list">
                  <div class="hero-card-stat">
                    <strong>06</strong>
                    <span>PROGRAM FORMATS<br>Program arranged with up to deep<br>concepts STEM meets navigation.</span>
                  </div>
                  <div class="hero-card-stat">
                    <strong>04</strong>
                    <span>PROJECT ARCHETYPES<br>Project mechanics S blocks and<br>action plans and the decow.</span>
                  </div>
                  <div class="hero-card-stat">
                    <strong>05</strong>
                    <span>SUPPORT TOPICS<br>Project associates about supports<br>mentions & support topics.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="scene scene--discovery tone-paper">
          <div class="container discovery-layout">
            <div class="discovery-layout__media">
              ${renderMedia(scenes[1].media, "discovery-photo", { tier: "critical" })}
            </div>
            <div class="discovery-layout__copy">
              <p class="scene-kicker">${scenes[1].eyebrow}</p>
              <h2 class="editorial-title">${scenes[1].headline}</h2>
              <p class="scene-body">${scenes[1].body}</p>
              <div class="discovery-features">
                <div class="discovery-feature">
                  <div class="discovery-feature__icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                  </div>
                  <span>${locale === "vi" ? "Học tập\ntương tác" : "Interactive\nlearning"}</span>
                </div>
                <div class="discovery-feature">
                  <div class="discovery-feature__icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                  <span>${locale === "vi" ? "Chuyên gia\nđồng hành" : "Expert\nmentors"}</span>
                </div>
                <div class="discovery-feature">
                  <div class="discovery-feature__icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
                  </div>
                  <span>${locale === "vi" ? "Công cụ\nsáng tạo" : "Creative\ntools"}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="scene scene--process tone-${scenes[2].tone}">
          <div class="container process-scene">
            <div class="process-scene__copy" data-motion="text-stagger">
              <p class="scene-kicker">${scenes[2].eyebrow}</p>
              <h2 class="editorial-title">${scenes[2].headline}</h2>
              <p class="scene-body">${scenes[2].body}</p>
            </div>
            <div class="process-orbit" data-motion="hero-enter">
              <div class="process-orbit__core">
                <span>STEM</span>
                <strong>Curiosity in motion</strong>
              </div>
              ${scenes[2].steps
        .map(
          (step, index) => `
                    <article class="process-step process-step--${index + 1}" data-motion="fade-up">
                      <span>${step.title}</span>
                      <p>${step.body}</p>
                    </article>
                  `
        )
        .join("")}
              ${renderDecor(scenes[2])}
            </div>
          </div>
        </section>

        <section class="scene scene--cluster tone-${scenes[3].tone}">
          <div class="container cluster-layout" data-motion="scene-enter">
            <div class="cluster-layout__copy" data-motion="text-stagger">
              <p class="scene-kicker">${scenes[3].eyebrow}</p>
              <h2 class="editorial-title">${scenes[3].headline}</h2>
              <p class="scene-body">${scenes[3].body}</p>
            </div>
            <div class="cluster-layout__grid" data-motion="stagger-group">
              ${scenes[3].points
        .map(
          (point) => `
                    <article class="cluster-card cluster-card--${point.size}">
                      <strong>${point.title}</strong>
                      <p>${point.body}</p>
                    </article>
                  `
        )
        .join("")}
            </div>
          </div>
        </section>

        ${renderValuesScene(scenes[4])}

        <section class="scene scene--collage tone-${scenes[5].tone}">
          <div class="container">
            <div class="scene-header" data-motion="text-stagger">
              <p class="scene-kicker">${scenes[5].eyebrow}</p>
              <h2 class="editorial-title">${scenes[5].headline}</h2>
              <p class="scene-body">${scenes[5].body}</p>
            </div>
            <div class="proof-collage">
              ${renderProofTile(collage[0], 0, "proof-collage__lead")}
              ${renderProofTile(collage[1], 1, "proof-collage__support-panel")}
              ${renderProofTile(collage[2], 2, "proof-collage__fragment-panel")}
              ${renderProofTile(collage[3], 3, "proof-collage__process-panel")}
              ${renderProofTile(collage[4], 4, "proof-collage__banner-panel")}
            </div>
          </div>
        </section>

        <section class="scene scene--closing tone-${scenes[6].tone}">
          <div class="container closing-panel" data-motion="scene-enter">
            <div class="closing-panel__copy" data-motion="text-stagger">
              <p class="scene-kicker">${scenes[6].eyebrow}</p>
              <h2 class="editorial-title">${scenes[6].headline}</h2>
              <p class="scene-body">${scenes[6].body}</p>
              <div class="scene-actions" data-motion="cta-soft">
                <a class="button button--primary" href="${scenes[6].cta.primary.href}" data-transition>${scenes[6].cta.primary.label}</a>
                <a class="button button--ghost-light" href="${scenes[6].cta.secondary.href}" data-transition>${scenes[6].cta.secondary.label}</a>
              </div>
            </div>
            <div class="closing-panel__media" data-motion="media-reveal">
              ${renderMedia(scenes[6].media, "", { tier: "deferred" })}
              ${renderDecor(scenes[6])}
            </div>
          </div>
        </section>
      </section>
    `;
    setTimeout(() => initHero3DCanvas(root), 100);
  }

  function renderProductsPage() {
    const root = $(".js-page-root");
    if (!root) return;
    var footer = document.querySelector('.site-footer');
    if (footer) footer.style.display = 'none';
    updateMeta(strings.pageMeta.products.title, strings.pageMeta.products.description);

    // Use real products from STEM_DATA
    const baseProducts = sortedProducts();
    const demoProducts = baseProducts.map(function(p) {
      // Extract numeric price from priceVi string (e.g. "599.000đ" → 599000)
      var numStr = (p.priceVi || '').replace(/[^\d]/g, '');
      var priceNum = numStr ? parseInt(numStr, 10) : 0;
      return {
        slug: p.slug,
        cover: p.cover,
        hero: p.hero || p.cover,
        gallery: Array.isArray(p.gallery) && p.gallery.length ? p.gallery : [p.cover].filter(Boolean),
        titleVi: p.titleVi,
        titleEn: p.titleEn || p.titleVi,
        taglineVi: p.taglineVi || '',
        taglineEn: p.taglineEn || p.taglineVi || '',
        summaryVi: p.summaryVi || '',
        summaryEn: p.summaryEn || '',
        priceVi: p.priceVi || 'Liên hệ',
        priceEn: p.priceEn || 'Contact us',
        originalPriceVi: p.originalPriceVi || '',
        originalPriceEn: p.originalPriceEn || '',
        availabilityVi: p.availabilityVi || '',
        availabilityEn: p.availabilityEn || '',
        stock: p.stock || 0,
        age: Array.isArray(p.age) ? p.age : [],
        theme: Array.isArray(p.theme) ? p.theme : [],
        format: Array.isArray(p.format) ? p.format : [],
        difficulty: Array.isArray(p.difficulty) ? p.difficulty : [],
        facts: Array.isArray(p.facts) ? p.facts : [],
        _categoryVi: p.facts && p.facts[0] ? p.facts[0].valueVi : '',
        _categoryEn: p.facts && p.facts[0] ? p.facts[0].valueEn : '',
        _priceNum: priceNum,
      };
    });

    root.innerHTML = '<canvas class="hero-3d-canvas js-hero-3d-canvas" style="position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:-1;pointer-events:none;opacity:0.85;"></canvas>' +
      '<div class="galaxy-scene js-galaxy-scene">' +
        '<div class="galaxy-board-hint galaxy-board-hint--top js-galaxy-board-hint-top">' +
          (locale === 'vi' ? 'Kéo xuống để xem thêm sản phẩm phía trên' : 'Scroll down to reveal more products above') +
        '</div>' +
        '<div class="galaxy-sphere js-galaxy-sphere"></div>' +
        '<div class="galaxy-board-hint galaxy-board-hint--bottom js-galaxy-board-hint-bottom">' +
          (locale === 'vi' ? 'Kéo lên để xem thêm sản phẩm phía dưới' : 'Scroll up to reveal more products below') +
        '</div>' +
      '</div>' +
      '<div class="galaxy-overlay">' +
        '<p class="galaxy-overlay__hint">' + (locale === 'vi' ? 'Kéo để khám phá · Cuộn để phóng to' : 'Drag to explore · Scroll to zoom') + '</p>' +
      '</div>';

    // ── Search bar: append to BODY (outside root) so position:fixed is anchored to viewport, never to 3D scene ──
    var existingBar = document.querySelector('.js-galaxy-search-bar');
    if (existingBar) existingBar.remove();
    var categoryOptions = unique(demoProducts.map(function(productItem) {
      return productItem.facts && productItem.facts[0]
        ? (locale === 'vi' ? productItem.facts[0].valueVi : productItem.facts[0].valueEn)
        : '';
    })).sort(function(left, right) {
      return String(left).localeCompare(String(right));
    });
    var searchBarEl = document.createElement('div');
    searchBarEl.className = 'galaxy-filter-panel js-galaxy-search-bar';
    searchBarEl.innerHTML =
      '<div class="galaxy-search-bar__inner">' +
        '<div class="galaxy-search-bar__input-wrap">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>' +
          '<input class="galaxy-search-bar__input js-galaxy-search" type="text" placeholder="' + (locale === 'vi' ? 'Tìm kiếm sản phẩm...' : 'Search products...') + '">' +
        '</div>' +
        '<div class="galaxy-filter-chips js-galaxy-chips">' +
          '<button class="galaxy-chip is-active" data-filter="all">' + (locale === 'vi' ? 'Tất cả' : 'All') + '</button>' +
          '<button class="galaxy-chip" data-filter="high">' + (locale === 'vi' ? 'Trên 500K' : '500K+ VND') + '</button>' +
          '<button class="galaxy-chip" data-filter="mid">' + (locale === 'vi' ? '100K–500K' : '100K–500K VND') + '</button>' +
          '<button class="galaxy-chip" data-filter="low">' + (locale === 'vi' ? 'Dưới 100K' : 'Under 100K VND') + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="galaxy-results-panel js-galaxy-results" style="display:none;"></div>';
    searchBarEl.innerHTML =
      '<div class="galaxy-filter-panel__inner">' +
        '<p class="galaxy-filter-panel__eyebrow">' + (locale === 'vi' ? 'Lọc catalogue' : 'Catalogue filter') + '</p>' +
        '<h2 class="galaxy-filter-panel__title">' + (locale === 'vi' ? 'Sắp xếp nhanh sản phẩm thật' : 'Arrange the product set') + '</h2>' +
        '<label class="galaxy-filter-field">' +
          '<span>' + (locale === 'vi' ? 'Tìm kiếm' : 'Search') + '</span>' +
          '<div class="galaxy-search-bar__input-wrap">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>' +
            '<input class="galaxy-search-bar__input js-galaxy-search" type="text" placeholder="' + (locale === 'vi' ? 'Tìm theo tên sản phẩm...' : 'Search by product name...') + '">' +
          '</div>' +
        '</label>' +
        '<label class="galaxy-filter-field">' +
          '<span>' + (locale === 'vi' ? 'Danh mục' : 'Category') + '</span>' +
          '<select class="galaxy-filter-select js-galaxy-category">' +
            '<option value="all">' + (locale === 'vi' ? 'Tất cả danh mục' : 'All categories') + '</option>' +
            categoryOptions.map(function(optionName) {
              return '<option value="' + optionName + '">' + optionName + '</option>';
            }).join('') +
          '</select>' +
        '</label>' +
        '<label class="galaxy-filter-field">' +
          '<span>' + (locale === 'vi' ? 'Sắp xếp theo' : 'Sort by') + '</span>' +
          '<select class="galaxy-filter-select js-galaxy-sort">' +
            '<option value="default">' + (locale === 'vi' ? 'Mặc định' : 'Default') + '</option>' +
            '<option value="price-asc">' + (locale === 'vi' ? 'Giá tăng dần' : 'Price ascending') + '</option>' +
            '<option value="price-desc">' + (locale === 'vi' ? 'Giá giảm dần' : 'Price descending') + '</option>' +
          '</select>' +
        '</label>' +
        '<div class="galaxy-filter-field">' +
          '<span>' + (locale === 'vi' ? 'Lọc theo khoảng tiền' : 'Price range') + '</span>' +
          '<div class="galaxy-filter-chips js-galaxy-chips">' +
            '<button class="galaxy-chip is-active" data-filter="all" type="button">' + (locale === 'vi' ? 'Tất cả' : 'All') + '</button>' +
            '<button class="galaxy-chip" data-filter="under-1m" type="button">' + (locale === 'vi' ? 'Dưới 1 triệu' : 'Under 1M') + '</button>' +
            '<button class="galaxy-chip" data-filter="1m-2m" type="button">' + (locale === 'vi' ? '1 đến 2 triệu' : '1M-2M') + '</button>' +
            '<button class="galaxy-chip" data-filter="2m-3m" type="button">' + (locale === 'vi' ? '2 đến 3 triệu' : '2M-3M') + '</button>' +
            '<button class="galaxy-chip" data-filter="3m-5m" type="button">' + (locale === 'vi' ? '3 đến 5 triệu' : '3M-5M') + '</button>' +
          '</div>' +
        '</div>' +
        '<p class="galaxy-filter-panel__meta js-galaxy-filter-meta"></p>' +
      '</div>' +
      '<div class="galaxy-results-panel js-galaxy-results" style="display:none;"></div>';
    searchBarEl.innerHTML =
      '<div class="galaxy-filter-panel__inner galaxy-filter-panel__inner--bar">' +
        '<label class="galaxy-filter-field galaxy-filter-field--search">' +
          '<span>' + (locale === 'vi' ? 'Tìm kiếm' : 'Search') + '</span>' +
          '<div class="galaxy-search-bar__input-wrap">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>' +
            '<input class="galaxy-search-bar__input js-galaxy-search" type="text" placeholder="' + (locale === 'vi' ? 'Tìm sản phẩm...' : 'Search products...') + '">' +
          '</div>' +
        '</label>' +
        '<label class="galaxy-filter-field galaxy-filter-field--category">' +
          '<span>' + (locale === 'vi' ? 'Danh mục' : 'Category') + '</span>' +
          '<select class="galaxy-filter-select js-galaxy-category">' +
            '<option value="all">' + (locale === 'vi' ? 'Tất cả danh mục' : 'All categories') + '</option>' +
            categoryOptions.map(function(optionName) {
              return '<option value="' + optionName + '">' + optionName + '</option>';
            }).join('') +
          '</select>' +
        '</label>' +
        '<div class="galaxy-filter-field galaxy-filter-field--price">' +
          '<span>' + (locale === 'vi' ? 'Khoảng tiền' : 'Price') + '</span>' +
          '<div class="galaxy-filter-chips js-galaxy-chips">' +
            '<button class="galaxy-chip is-active" data-filter="all" type="button">' + (locale === 'vi' ? 'Tất cả' : 'All') + '</button>' +
            '<button class="galaxy-chip" data-filter="under-500k" type="button">' + (locale === 'vi' ? 'Dưới 500k' : 'Under 500K') + '</button>' +
            '<button class="galaxy-chip" data-filter="500k-1m" type="button">' + (locale === 'vi' ? '500k đến 1tr' : '500K-1M') + '</button>' +
            '<button class="galaxy-chip" data-filter="1m-2m" type="button">' + (locale === 'vi' ? '1tr đến 2tr' : '1M-2M') + '</button>' +
            '<button class="galaxy-chip" data-filter="over-2m" type="button">' + (locale === 'vi' ? 'Trên 2tr' : 'Over 2M') + '</button>' +
          '</div>' +
        '</div>' +
        '<label class="galaxy-filter-field galaxy-filter-field--sort">' +
          '<span>' + (locale === 'vi' ? 'Sắp xếp theo' : 'Sort by') + '</span>' +
          '<select class="galaxy-filter-select js-galaxy-sort">' +
            '<option value="default">' + (locale === 'vi' ? 'Mặc định' : 'Default') + '</option>' +
            '<option value="price-asc">' + (locale === 'vi' ? 'Giá tăng dần' : 'Price ascending') + '</option>' +
            '<option value="price-desc">' + (locale === 'vi' ? 'Giá giảm dần' : 'Price descending') + '</option>' +
          '</select>' +
        '</label>' +
        '<p class="galaxy-filter-panel__meta js-galaxy-filter-meta"></p>' +
      '</div>' +
      '<div class="galaxy-results-panel js-galaxy-results" style="display:none;"></div>';
    document.body.appendChild(searchBarEl);

    var filterChevron = '<svg class="galaxy-select-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 6.25 8 10.25 12 6.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var priceLabels = locale === 'vi'
      ? {
        all: 'Tất cả khoảng giá',
        'under-500k': 'Dưới 500.000 đ',
        '500k-1m': 'Từ 500.000 đ đến 1.000.000 đ',
        '1m-2m': 'Từ 1.000.000 đ đến 2.000.000 đ',
        'over-2m': 'Trên 2.000.000 đ',
      }
      : {
        all: 'All price ranges',
        'under-500k': 'Under 500,000 VND',
        '500k-1m': '500,000 to 1,000,000 VND',
        '1m-2m': '1,000,000 to 2,000,000 VND',
        'over-2m': 'Over 2,000,000 VND',
      };
    if (locale === 'vi') {
      priceLabels = {
        all: 'Tất cả khoảng giá',
        'under-500k': 'Dưới 500.000 đ',
        '500k-1m': 'Từ 500.000 đ đến 1.000.000 đ',
        '1m-2m': 'Từ 1.000.000 đ đến 2.000.000 đ',
        'over-2m': 'Trên 2.000.000 đ',
      };
    }
    var categoryField = searchBarEl.querySelector('.galaxy-filter-field--category');
    var sortField = searchBarEl.querySelector('.galaxy-filter-field--sort');
    var priceField = searchBarEl.querySelector('.galaxy-filter-field--price');
    if (categoryField && !categoryField.querySelector('.galaxy-select-arrow')) {
      categoryField.insertAdjacentHTML('beforeend', filterChevron);
    }
    if (sortField && !sortField.querySelector('.galaxy-select-arrow')) {
      sortField.insertAdjacentHTML('beforeend', filterChevron);
    }
    if (priceField) {
      priceField.innerHTML =
        '<button class="galaxy-price-select__button js-galaxy-price-toggle" type="button" aria-haspopup="listbox" aria-expanded="false">' +
          '<span class="js-galaxy-price-label">' + priceLabels.all + '</span>' +
          filterChevron +
        '</button>' +
        '<div class="galaxy-price-select__menu js-galaxy-price-menu" role="listbox">' +
          Object.keys(priceLabels).map(function(priceKey, index) {
            return '<button class="galaxy-price-select__option' + (index === 0 ? ' is-active' : '') + '" type="button" role="option" aria-selected="' + (index === 0 ? 'true' : 'false') + '" data-filter="' + priceKey + '">' + priceLabels[priceKey] + '</button>';
          }).join('') +
        '</div>';
      var priceFieldLabel = priceField.querySelector(':scope > span');
      if (locale === 'vi' && priceFieldLabel) priceFieldLabel.textContent = 'Khoảng giá';
    }

    function enhanceFilterSelect(fieldEl, selectClass, fieldKey) {
      if (!fieldEl) return null;
      var nativeSelect = fieldEl.querySelector(selectClass);
      if (!nativeSelect) return null;
      var options = Array.prototype.slice.call(nativeSelect.options || []);
      var currentOption = options.find(function(optionItem) {
        return optionItem.value === nativeSelect.value;
      }) || options[0];
      nativeSelect.classList.add('galaxy-filter-select--native');
      fieldEl.classList.add('galaxy-filter-field--menu');
      fieldEl.insertAdjacentHTML('beforeend',
        '<button class="galaxy-price-select__button galaxy-filter-menu-toggle js-galaxy-' + fieldKey + '-toggle" type="button" aria-haspopup="listbox" aria-expanded="false">' +
          '<span class="js-galaxy-' + fieldKey + '-label">' + (currentOption ? currentOption.textContent : '') + '</span>' +
          filterChevron +
        '</button>' +
        '<div class="galaxy-price-select__menu galaxy-filter-menu js-galaxy-' + fieldKey + '-menu" role="listbox">' +
          options.map(function(optionItem) {
            return '<button class="galaxy-price-select__option galaxy-filter-menu__option' + (optionItem.value === nativeSelect.value ? ' is-active' : '') + '" type="button" role="option" aria-selected="' + (optionItem.value === nativeSelect.value ? 'true' : 'false') + '" data-value="' + optionItem.value + '">' + optionItem.textContent + '</button>';
          }).join('') +
        '</div>'
      );
      return {
        field: fieldEl,
        select: nativeSelect,
        toggle: fieldEl.querySelector('.js-galaxy-' + fieldKey + '-toggle'),
        menu: fieldEl.querySelector('.js-galaxy-' + fieldKey + '-menu'),
        label: fieldEl.querySelector('.js-galaxy-' + fieldKey + '-label'),
      };
    }

    var categoryDropdownUi = enhanceFilterSelect(categoryField, '.js-galaxy-category', 'category');
    var sortDropdownUi = enhanceFilterSelect(sortField, '.js-galaxy-sort', 'sort');
    if (sortDropdownUi && sortDropdownUi.label) {
      sortDropdownUi.label.textContent = locale === 'vi' ? 'Sắp xếp: Mặc định' : 'Sort: Default';
    }

    var sphere = $(".js-galaxy-sphere", root);
    var sceneEl = $(".js-galaxy-scene", root);
    var boardHintTop = $(".js-galaxy-board-hint-top", root);
    var boardHintBottom = $(".js-galaxy-board-hint-bottom", root);
    var boardLinksSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    boardLinksSvg.setAttribute('class', 'galaxy-board-links js-galaxy-board-links');
    boardLinksSvg.setAttribute('aria-hidden', 'true');
    sceneEl.insertBefore(boardLinksSvg, sphere);
    var searchInput = document.querySelector('.js-galaxy-search');
    var categorySelect = document.querySelector('.js-galaxy-category');
    var sortSelect = document.querySelector('.js-galaxy-sort');
    var filterMeta = document.querySelector('.js-galaxy-filter-meta');
    var resultsPanel = document.querySelector('.js-galaxy-results');
    var chipsWrap = document.querySelector('.js-galaxy-chips');
    var priceDropdown = document.querySelector('.js-galaxy-price-toggle');
    var priceMenu = document.querySelector('.js-galaxy-price-menu');
    var priceValueLabel = document.querySelector('.js-galaxy-price-label');
    var priceCloseTimer = null;

    function syncProductFilterBarFrame() {
      var headerInner = document.querySelector('.header-shell__inner');
      var headerRect = headerInner ? headerInner.getBoundingClientRect() : null;
      if (!headerRect || !searchBarEl) return;

      searchBarEl.style.top = Math.round(headerRect.bottom + 12) + 'px';
      searchBarEl.style.left = Math.round(headerRect.left) + 'px';
      searchBarEl.style.width = Math.round(headerRect.width) + 'px';
    }

    syncProductFilterBarFrame();
    var RADIUS = window.innerWidth < 900 ? 380 : 520;
    var TOTAL = demoProducts.length;
    var goldenAngle = Math.PI * (3 - Math.sqrt(5));

    // Store card positions for hover-to-center
    var cardPositions = [];

    var cardsHTML = '';
    for (var i = 0; i < TOTAL; i++) {
      var item = demoProducts[i];
      var BELT_MIN = -0.65, BELT_MAX = 0.65;
      var yy = BELT_MAX - (i / (TOTAL - 1)) * (BELT_MAX - BELT_MIN);
      var radAtY = Math.sqrt(1 - yy * yy);
      var th = goldenAngle * i;
      var px = Math.cos(th) * radAtY * RADIUS;
      var py = yy * RADIUS;
      var pz = Math.sin(th) * radAtY * RADIUS;
      var rY = Math.atan2(px, pz) * (180 / Math.PI);
      var rX = -Math.asin(yy) * (180 / Math.PI) * 0.9;
      var pr = item._priceNum > 0 ? Math.min(item._priceNum / 1000000, 1) : 0.3;
      var sc = pr >= 0.75 ? 'galaxy-card--xl' : pr >= 0.5 ? 'galaxy-card--lg' : pr >= 0.25 ? 'galaxy-card--md' : 'galaxy-card--sm';
      var sphereTransform = 'translate3d(' + px.toFixed(0) + 'px,' + py.toFixed(0) + 'px,' + pz.toFixed(0) + 'px) rotateY(' + rY.toFixed(1) + 'deg) rotateX(' + rX.toFixed(1) + 'deg)';

      cardPositions.push({
        rotY: -rY,
        rotX: Math.atan2(py, Math.sqrt(px * px + pz * pz)) * (180 / Math.PI),
        sphereTransform: sphereTransform,
      });

      // Pre-compute price/discount for expanded view
      var xOrigVi = item.originalPriceVi || '';
      var xOrigEn = item.originalPriceEn || '';
      var hasDiscount = xOrigVi && xOrigVi !== item.priceVi;
      var xStock = item.stock || 0;
      var xStockLabel = locale === 'vi' ? (xStock > 0 ? (item.availabilityVi || 'Còn hàng') : 'Liên hệ') : (xStock > 0 ? (item.availabilityEn || 'In stock') : 'Contact us');
      var cardTitle = locale === 'vi' ? item.titleVi : item.titleEn;
      var cardTagline = locale === 'vi' ? (item.taglineVi || item.summaryVi || '') : (item.taglineEn || item.summaryEn || '');

      cardsHTML += '<div class="galaxy-card ' + sc + '" data-card-idx="' + i + '" style="transform:' + sphereTransform + '">' +
        '<div class="galaxy-card__inner">' +
          '<div class="galaxy-card__img">' + renderMedia(item.cover, '', { tier: i < 8 ? 'near' : 'deferred', loading: i < 8 ? 'eager' : 'lazy' }) + '</div>' +
          '<div class="galaxy-card__info">' +
            '<span class="galaxy-card__name">' + cardTitle + '</span>' +
            '<span class="galaxy-card__price">' + (locale === 'vi' ? item.priceVi : item.priceEn) + '</span>' +
          '</div>' +
          /* ── Expanded content (hidden by default, shown on hold) ── */
          '<div class="galaxy-card__xinfo">' +
            '<div class="galaxy-card__xprice">' +
              '<span class="xp-cur">' + (locale === 'vi' ? item.priceVi : item.priceEn) + '</span>' +
              (hasDiscount ? '<span class="xp-orig">' + (locale === 'vi' ? xOrigVi : xOrigEn) + '</span>' : '') +
            '</div>' +
            '<p class="galaxy-card__xsummary">' + (cardTagline || 'Sản phẩm STEM chất lượng cao') + '</p>' +
            '<div class="galaxy-card__xstock"><span class="xstock-dot"></span>' + xStockLabel + '</div>' +
            '<div class="galaxy-card__xqty">' +
              '<button class="xqty-btn js-xminus" type="button">−</button>' +
              '<span class="js-xqty-val">1</span>' +
              '<button class="xqty-btn js-xplus" type="button">+</button>' +
            '</div>' +
            '<div class="galaxy-card__xactions">' +
              '<button class="xbtn-cart" type="button">' + (locale === 'vi' ? 'Thêm vào giỏ' : 'Add to Cart') + '</button>' +
              '<button class="xbtn-buy" type="button">' + (locale === 'vi' ? 'Mua ngay' : 'Buy Now') + '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }
    sphere.innerHTML = cardsHTML;
    var cardNodes = Array.prototype.slice.call(sphere.querySelectorAll('.galaxy-card'));
    var layoutMode = 'sphere';
    var boardScrollCurrent = 0;
    var boardScrollTarget = 0;
    var boardScrollMin = 0;
    var boardScrollMax = 0;
    var boardTouchActive = false;
    var boardTouchStartY = 0;
    var boardTouchStartScroll = 0;
    var boardTouchMoved = false;
    var boardGridPose = {};

    // ═══════════════════════════════════════════
    // DRAG-TO-ROTATE 360° (like Google Earth)
    // ═══════════════════════════════════════════
    var DEFAULT_ROT_X = -5;
    var rotX = DEFAULT_ROT_X, rotY = 0;        // current rotation angles
    var velX = 0, velY = 0.15;      // velocity (momentum) — start with gentle auto-spin
    var isDragging = false;
    var lastX = 0, lastY = 0;
    var idleTimer = null;
    var isIdle = true;              // true = auto-spin active
    var DRAG_SENS_H = 0.3;         // horizontal drag sensitivity
    var DRAG_SENS_V = 0.15;        // vertical drag sensitivity (gentler to avoid over-tilt)
    var FRICTION = 0.96;            // momentum decay (higher = longer glide)
    var AUTO_SPIN_SPEED = 0.12;     // idle auto-rotation speed
    var IDLE_DELAY = 3000;          // ms before auto-spin resumes
    var MAX_TILT_X = 62;
    var cZoom = window.innerWidth < 900 ? 0.92 : 0.96;
    var hoverFocusActive = false;
    var hoverFocusCard = null;
    var hoverAnchorX = 0;
    var hoverAnchorY = 0;
    var HOVER_SWITCH_RADIUS = 18;
    var hoverTargetRotX = rotX;
    var hoverTargetRotY = rotY;

    function applyRot() {
      sphere.style.transform = 'rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg) scale3d(' + cZoom + ',' + cZoom + ',' + cZoom + ')';
    }
    applyRot();

    function shortestAngleDelta(fromAngle, toAngle) {
      return ((toAngle - fromAngle + 540) % 360) - 180;
    }

    function pointerMovedFromHoverAnchor(clientX, clientY) {
      var dx = clientX - hoverAnchorX;
      var dy = clientY - hoverAnchorY;
      return (dx * dx + dy * dy) > (HOVER_SWITCH_RADIUS * HOVER_SWITCH_RADIUS);
    }

    function getSphereCardTransform(card, depthOffset) {
      var cardIndex = parseInt(card.dataset.cardIdx, 10);
      var cardPose = cardPositions[cardIndex];
      if (!cardPose) return '';
      return cardPose.sphereTransform + (depthOffset ? ' translateZ(' + depthOffset + 'px)' : '');
    }

    function syncSphereCardDepth(card, isFocused) {
      if (!card || layoutMode !== 'sphere' || card.classList.contains('is-expanded')) return;
      card.style.transform = getSphereCardTransform(card, isFocused ? 84 : 0);
      card.style.zIndex = isFocused ? '260' : '';
    }

    function focusSphereOnCard(card, clientX, clientY) {
      var cardIndex = parseInt(card.dataset.cardIdx, 10);
      var cardPose = cardPositions[cardIndex];
      if (!cardPose) return;

      hoverFocusCard = card;
      hoverAnchorX = typeof clientX === 'number' ? clientX : hoverAnchorX;
      hoverAnchorY = typeof clientY === 'number' ? clientY : hoverAnchorY;
      hoverFocusActive = true;
      hoverTargetRotX = Math.max(-MAX_TILT_X, Math.min(MAX_TILT_X, cardPose.rotX));
      hoverTargetRotY = rotY + shortestAngleDelta(rotY, cardPose.rotY);
      sphereFrozen = false;
      isDragging = false;
      isIdle = false;
      velX = 0;
      velY = 0;
      clearTimeout(idleTimer);
    }

    function releaseSphereHoverFocus() {
      hideHoverPreview();
      if (hoverFocusCard) {
        syncSphereCardDepth(hoverFocusCard, false);
      }
      hoverFocusActive = false;
      hoverFocusCard = null;
      if (!sphereFrozen && !isDragging) {
        isIdle = true;
      }
    }

    // --- Hover card: sphere mode pulls card to center, grid mode scrolls row to center ---
    sphere.addEventListener('mouseover', function(e) {
      var card = e.target.closest('.galaxy-card');
      if (!card) return;
      if (card.contains(e.relatedTarget)) return;

      if (layoutMode === 'sphere' && hoverFocusCard && hoverFocusCard !== card && !pointerMovedFromHoverAnchor(e.clientX, e.clientY)) {
        return;
      }

      var prev = sphere.querySelector('.galaxy-card--focused');
      if (prev && prev !== card) {
        prev.classList.remove('galaxy-card--focused');
        syncSphereCardDepth(prev, false);
      }
      card.classList.add('galaxy-card--focused');
      if (layoutMode === 'sphere') {
        syncSphereCardDepth(card, true);
        showHoverPreview(card);
        focusSphereOnCard(card, e.clientX, e.clientY);
      }
    });
    sphere.addEventListener('mouseout', function(e) {
      var card = e.target.closest('.galaxy-card');
      if (!card || card.contains(e.relatedTarget)) return;
      if (layoutMode === 'sphere' && hoverFocusCard === card && !pointerMovedFromHoverAnchor(e.clientX, e.clientY)) {
        return;
      }
      card.classList.remove('galaxy-card--focused');
      if (layoutMode === 'sphere') {
        releaseSphereHoverFocus();
      }
      if (layoutMode === 'sphere' && !expandedCard && !modalEl.classList.contains('is-open')) {
        resumeSphere(true);
      }
    });

    // --- Drag start ---
    function onDragStart(x, y) {
      if (layoutMode === 'grid') return;
      releaseSphereHoverFocus();
      isDragging = true;
      isIdle = false;
      lastX = x;
      lastY = y;
      // Stop any remaining momentum so it feels responsive
      velX = 0;
      velY = 0;
      clearTimeout(idleTimer);
      sceneEl.style.cursor = 'grabbing';
    }

    // --- Drag move ---
    function onDragMove(x, y) {
      if (!isDragging || layoutMode === 'grid') return;
      var dx = x - lastX;
      var dy = y - lastY;
      // Rotate Y with horizontal drag, X with vertical drag (vertical is gentler)
      velY = dx * DRAG_SENS_H;
      velX = -dy * DRAG_SENS_V;
      lastX = x;
      lastY = y;
    }

    // --- Drag end / release ---
    function onDragEnd() {
      isDragging = false;
      sceneEl.style.cursor = 'grab';
      // Schedule auto-spin resume after idle delay
      clearTimeout(idleTimer);
      idleTimer = setTimeout(function() { isIdle = true; }, IDLE_DELAY);
    }

    // ═══════════════════════════════════════════
    // HOLD / CLICK / DRAG — unified pointer logic
    // ═══════════════════════════════════════════
    var holdTimer = null;
    var holdCard  = null;
    var pDownX = 0, pDownY = 0;
    var pMoved = false;
    var HOLD_MS = 350;
    var MOVE_THRESH = 15;   // px before considered a drag
    var sphereFrozen = false;  // hard freeze — animation loop does nothing
    var activePreviewCard = null; // the card currently being previewed

    // ─── Preview overlay (hold) ───
    var previewEl = document.createElement('div');
    previewEl.className = 'galaxy-preview js-galaxy-preview';
    document.body.appendChild(previewEl);

    var hoverPreviewEl = document.createElement('div');
    hoverPreviewEl.className = 'galaxy-hover-preview js-galaxy-hover-preview';
    document.body.appendChild(hoverPreviewEl);

    // ─── Modal overlay (click) ───
    var modalEl = document.createElement('div');
    modalEl.className = 'galaxy-modal js-galaxy-modal';
    document.body.appendChild(modalEl);

    function getProductByCard(card) {
      return demoProducts[parseInt(card.dataset.cardIdx, 10)];
    }

    function goToProductDetail(product) {
      if (!product || !product.slug) return;
      window.location.href = getLocalePath('product-detail', product.slug);
    }

    function syncHoverPreviewPosition() {
      if (!activePreviewCard || !hoverPreviewEl.firstElementChild) return;
      var inner = activePreviewCard.querySelector('.galaxy-card__inner');
      if (!inner) return;
      var rect = inner.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      var previewWidth = Math.min(
        Math.max(rect.width * 1.22, rect.width + 22),
        window.innerWidth < 900 ? 196 : 238
      );
      var left = Math.max(10, Math.min((rect.left + rect.width * 0.5) - (previewWidth * 0.5), window.innerWidth - previewWidth - 10));
      var top = Math.max(10, Math.min(rect.top - 10, window.innerHeight - rect.height - 10));
      hoverPreviewEl.style.left = left + 'px';
      hoverPreviewEl.style.top = top + 'px';
      hoverPreviewEl.style.width = previewWidth + 'px';
    }

    function hideHoverPreview() {
      if (activePreviewCard) {
        activePreviewCard.classList.remove('is-ghosted');
      }
      activePreviewCard = null;
      hoverPreviewEl.classList.remove('is-visible');
      hoverPreviewEl.innerHTML = '';
      hoverPreviewEl.style.removeProperty('left');
      hoverPreviewEl.style.removeProperty('top');
      hoverPreviewEl.style.removeProperty('width');
    }

    function showHoverPreview(card) {
      if (!card || layoutMode !== 'sphere' || card.classList.contains('is-expanded')) return;
      if (activePreviewCard !== card) {
        hideHoverPreview();
        activePreviewCard = card;
        var previewCard = card.cloneNode(true);
        previewCard.classList.remove('galaxy-card--focused', 'is-expanded', 'is-ghosted');
        previewCard.style.transform = '';
        previewCard.style.zIndex = '';
        hoverPreviewEl.innerHTML = '';
        hoverPreviewEl.appendChild(previewCard);
      }
      card.classList.add('is-ghosted');
      hoverPreviewEl.classList.add('is-visible');
      syncHoverPreviewPosition();
    }

    hoverPreviewEl.addEventListener('mousedown', function(e) {
      if (!activePreviewCard) return;
      e.preventDefault();
      e.stopPropagation();
    });

    hoverPreviewEl.addEventListener('click', function(e) {
      if (!activePreviewCard) return;
      e.preventDefault();
      e.stopPropagation();
      var product = getProductByCard(activePreviewCard);
      if (!product) return;
      openModal(product);
    });

    hoverPreviewEl.addEventListener('mouseleave', function() {
      if (!activePreviewCard || layoutMode !== 'sphere') return;
      var card = activePreviewCard;
      card.classList.remove('galaxy-card--focused');
      releaseSphereHoverFocus();
      if (!expandedCard && !modalEl.classList.contains('is-open')) {
        resumeSphere(true);
      }
    });

    function stopSphere() {
      hideHoverPreview();
      releaseSphereHoverFocus();
      sphereFrozen = true;
      isIdle = false; velX = 0; velY = 0; isDragging = false;
      clearTimeout(idleTimer);
    }
    function resumeSphere(immediate) {
      sphereFrozen = false;
      clearTimeout(idleTimer);
      if (immediate) {
        isIdle = true;
        return;
      }
      idleTimer = setTimeout(function() { isIdle = true; }, IDLE_DELAY);
    }

    function easeSphereTiltHome(strength, damping) {
      velX = (velX + (DEFAULT_ROT_X - rotX) * strength) * damping;
      rotX += velX;
      if (Math.abs(DEFAULT_ROT_X - rotX) < 0.04 && Math.abs(velX) < 0.04) {
        rotX = DEFAULT_ROT_X;
        velX = 0;
      }
    }

    function getProductCategory(product) {
      return locale === 'vi' ? (product._categoryVi || '') : (product._categoryEn || '');
    }

    function matchesPriceRange(product, rangeKey) {
      var price = product._priceNum || 0;
      if (rangeKey === 'under-500k') return price > 0 && price < 500000;
      if (rangeKey === '500k-1m') return price >= 500000 && price < 1000000;
      if (rangeKey === '1m-2m') return price >= 1000000 && price < 2000000;
      if (rangeKey === 'over-2m') return price >= 2000000;
      return true;
    }

    function getBoardPriceBand(product) {
      var price = product._priceNum || 0;
      if (price > 0 && price < 1000000) return 'under-1m';
      if (price >= 1000000 && price < 2000000) return '1m-2m';
      if (price >= 2000000 && price < 3000000) return '2m-3m';
      if (price >= 3000000 && price <= 5000000) return '3m-5m';
      if (price > 5000000) return 'over-5m';
      return 'unknown';
    }

    function sortProductList(items, modeKey) {
      var nextItems = items.slice();
      if (modeKey === 'price-asc') {
        nextItems.sort(function(left, right) {
          return (left._priceNum || 0) - (right._priceNum || 0) || String(locale === 'vi' ? left.titleVi : left.titleEn).localeCompare(String(locale === 'vi' ? right.titleVi : right.titleEn));
        });
      } else if (modeKey === 'price-desc') {
        nextItems.sort(function(left, right) {
          return (right._priceNum || 0) - (left._priceNum || 0) || String(locale === 'vi' ? left.titleVi : left.titleEn).localeCompare(String(locale === 'vi' ? right.titleVi : right.titleEn));
        });
      }
      return nextItems;
    }

    function shouldUseGridLayout(query, categoryKey, priceKey, sortKey) {
      return searchBrowseMode || Boolean(query.trim()) || categoryKey !== 'all' || priceKey !== 'all' || sortKey !== 'default';
    }

    function syncBoardSceneFrame() {
      if (layoutMode !== 'grid') {
        sceneEl.style.removeProperty('position');
        sceneEl.style.removeProperty('top');
        sceneEl.style.removeProperty('width');
        sceneEl.style.removeProperty('height');
        sceneEl.style.removeProperty('margin-top');
        sceneEl.style.removeProperty('margin-left');
        sceneEl.style.removeProperty('margin-right');
        sceneEl.style.removeProperty('transform');
        if (boardHintTop) boardHintTop.classList.remove('is-visible');
        if (boardHintBottom) boardHintBottom.classList.remove('is-visible');
        return;
      }

      sceneEl.style.marginTop = '0px';

      var headerInner = document.querySelector('.header-shell__inner');
      var headerRect = headerInner ? headerInner.getBoundingClientRect() : null;
      var filterRect = searchBarEl ? searchBarEl.getBoundingClientRect() : null;
      var anchorBottom = filterRect ? Math.max(0, Math.round(filterRect.bottom)) : (headerRect ? Math.max(0, Math.round(headerRect.bottom)) : 0);
      var boardTop = anchorBottom + 20;
      var viewportBottomGap = window.innerWidth < 900 ? 16 : 24;
      var boardHeight = Math.max(
        window.innerWidth < 900 ? 420 : 520,
        Math.round(window.innerHeight - anchorBottom - viewportBottomGap)
      );

      sceneEl.style.position = 'fixed';
      sceneEl.style.top = boardTop + 'px';
      sceneEl.style.height = boardHeight + 'px';
      sceneEl.style.transform = 'translate3d(0, 0, 0)';

      if (window.innerWidth < 900 || !headerRect) {
        sceneEl.style.width = 'min(calc(100vw - 1.5rem), var(--max))';
        sceneEl.style.marginLeft = 'auto';
        sceneEl.style.marginRight = 'auto';
        return;
      }

      sceneEl.style.width = Math.round(headerRect.width) + 'px';
      sceneEl.style.marginLeft = Math.max(0, Math.round(headerRect.left)) + 'px';
      sceneEl.style.marginRight = 'auto';
    }

    function getBoardWorkspace() {
      syncBoardSceneFrame();
      var sceneRect = sceneEl.getBoundingClientRect();
      var edgeInset = window.innerWidth < 900 ? 16 : 20;
      return {
        centerX: 0,
        centerY: 0,
        width: Math.max(320, sceneRect.width - edgeInset * 2),
        height: Math.max(420, sceneRect.height),
      };
    }

    function clearBoardConnections() {
      if (!boardLinksSvg) return;
      boardLinksSvg.innerHTML = '';
      boardLinksSvg.classList.remove('is-active');
    }

    function renderBoardConnections(items, boardPose) {
      if (!boardLinksSvg || !sceneEl) return;
      var sceneRect = sceneEl.getBoundingClientRect();
      var centerX = sceneRect.width / 2;
      var centerY = sceneRect.height / 2;
      var grouped = {};
      var edgeSet = {};
      var svgParts = [
        '<defs>' +
          '<radialGradient id="galaxy-pin-glow" cx="50%" cy="50%" r="50%">' +
            '<stop offset="0%" stop-color="rgba(255, 180, 145, 0.95)" />' +
            '<stop offset="100%" stop-color="rgba(208, 98, 46, 0)" />' +
          '</radialGradient>' +
        '</defs>',
      ];

      boardLinksSvg.setAttribute('viewBox', '0 0 ' + Math.max(1, Math.round(sceneRect.width)) + ' ' + Math.max(1, Math.round(sceneRect.height)));

      items.forEach(function(item) {
        var pose = boardPose[item.slug];
        if (!pose) return;
        [getProductCategory(item), getBoardPriceBand(item)].forEach(function(groupKey) {
          if (!groupKey) return;
          if (!grouped[groupKey]) grouped[groupKey] = [];
          grouped[groupKey].push(item.slug);
        });
      });

      Object.keys(grouped).forEach(function(groupKey) {
        var slugs = grouped[groupKey];
        if (!slugs || slugs.length < 2) return;
        for (var idx = 0; idx < slugs.length - 1; idx += 1) {
          var fromPose = boardPose[slugs[idx]];
          var toPose = boardPose[slugs[idx + 1]];
          if (!fromPose || !toPose) continue;
          var edgeKey = slugs[idx] < slugs[idx + 1] ? (slugs[idx] + '__' + slugs[idx + 1]) : (slugs[idx + 1] + '__' + slugs[idx]);
          if (edgeSet[edgeKey]) continue;
          edgeSet[edgeKey] = true;

          var x1 = centerX + fromPose.x + fromPose.width * 0.5;
          var y1 = centerY + fromPose.y + fromPose.height * 0.48;
          var x2 = centerX + toPose.x + toPose.width * 0.5;
          var y2 = centerY + toPose.y + toPose.height * 0.48;
          var seed = hashText(edgeKey + groupKey);
          var bend = (((seed % 101) - 50) / 50) * 38;
          var cx = (x1 + x2) / 2 + bend;
          var cy = (y1 + y2) / 2 - bend * 0.55;

          svgParts.push(
            '<path class="galaxy-board-link" d="M ' + x1.toFixed(1) + ' ' + y1.toFixed(1) +
            ' Q ' + cx.toFixed(1) + ' ' + cy.toFixed(1) +
            ' ' + x2.toFixed(1) + ' ' + y2.toFixed(1) +
            '" style="--link-delay:' + ((idx % 7) * 70) + 'ms"></path>'
          );
        }
      });

      items.forEach(function(item) {
        var pose = boardPose[item.slug];
        if (!pose) return;
        var px = centerX + pose.x + pose.width * 0.5;
        var py = centerY + pose.y + 10;
        svgParts.push(
          '<circle class="galaxy-board-pin-glow" cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="10"></circle>' +
          '<circle class="galaxy-board-pin" cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="3.2"></circle>'
        );
      });

      boardLinksSvg.innerHTML = svgParts.join('');
      boardLinksSvg.classList.add('is-active');
    }

    function applySphereLayout() {
      layoutMode = 'sphere';
      hideHoverPreview();
      boardScrollCurrent = 0;
      boardScrollTarget = 0;
      boardScrollMin = 0;
      boardScrollMax = 0;
      boardTouchActive = false;
      boardGridPose = {};
      syncBoardSceneFrame();
      clearBoardConnections();
      if (boardLinksSvg) boardLinksSvg.style.transform = '';
      sceneEl.classList.remove('is-grid-mode');
      sceneEl.style.cursor = 'grab';
      sphere.style.transform = '';
      cardNodes.forEach(function(card, idx) {
        card.classList.remove('galaxy-card--grid');
        card.classList.remove('galaxy-card--focused');
        card.classList.remove('is-ghosted');
        card.style.opacity = '1';
        card.style.visibility = 'visible';
        card.style.pointerEvents = 'auto';
        card.style.transform = cardPositions[idx] ? cardPositions[idx].sphereTransform : '';
        card.style.zIndex = '';
        card.style.removeProperty('--grid-float-delay');
      });
      if (filterMeta) {
        filterMeta.textContent = locale === 'vi'
          ? 'Đang xem dạng hình cầu. Nhập tìm kiếm hoặc chọn bộ lọc để xếp thành lưới 4 hàng.'
          : 'Sphere mode active. Search or filter to snap cards into a 4-row grid.';
      }
      resumeSphere();
    }

    function syncBoardScrollHints() {
      var hasBoardScroll = layoutMode === 'grid' && (boardScrollMax - boardScrollMin) > 1;
      var canRevealTop = hasBoardScroll && boardScrollTarget < boardScrollMax - 2;
      var canRevealBottom = hasBoardScroll && boardScrollTarget > boardScrollMin + 2;

      if (boardHintTop) {
        boardHintTop.classList.toggle('is-visible', canRevealTop);
      }
      if (boardHintBottom) {
        boardHintBottom.classList.toggle('is-visible', canRevealBottom);
      }
    }

    function updateBoardCardVisibility() {
      if (layoutMode !== 'grid') return;
    }

    function applyBoardScrollFrame(force) {
      if (layoutMode !== 'grid') return;

      if (force) {
        boardScrollCurrent = boardScrollTarget;
      } else {
        boardScrollCurrent += (boardScrollTarget - boardScrollCurrent) * 0.14;
        if (Math.abs(boardScrollTarget - boardScrollCurrent) < 0.12) {
          boardScrollCurrent = boardScrollTarget;
        }
      }

      var boardTransform = 'translate3d(0,' + boardScrollCurrent.toFixed(2) + 'px,0)';
      sphere.style.transform = boardTransform;
      if (boardLinksSvg) {
        boardLinksSvg.style.transform = boardTransform;
      }

      updateBoardCardVisibility();
      syncBoardScrollHints();
    }

    function nudgeBoardScroll(deltaY) {
      if (layoutMode !== 'grid' || (boardScrollMax - boardScrollMin) <= 1) return false;
      boardScrollTarget = clamp(boardScrollTarget - deltaY, boardScrollMin, boardScrollMax);
      syncBoardScrollHints();
      return true;
    }

    function focusBoardCard(card) {
      if (layoutMode !== 'grid') return;
      var product = getProductByCard(card);
      if (!product) return;
      var pose = boardGridPose[product.slug];
      if (!pose) return;
      boardScrollTarget = clamp(-(pose.y + pose.height * 0.5), boardScrollMin, boardScrollMax);
      syncBoardScrollHints();
    }

    function applyGridLayout(items) {
      var wasGridMode = layoutMode === 'grid';
      var previousBoardScrollTarget = boardScrollTarget;
      layoutMode = 'grid';
      stopSphere();
      sceneEl.classList.add('is-grid-mode');
      if (wasGridMode) {
        sceneEl.classList.add('is-grid-reflowing');
      }
      sceneEl.style.cursor = 'default';

      var rankBySlug = {};
      items.forEach(function(item, orderIndex) {
        rankBySlug[item.slug] = orderIndex;
      });

      var boardSpace = getBoardWorkspace();
      var cardGap = 20;
      var minCardWidth = window.innerWidth < 900 ? 152 : 180;
      var maxCardWidth = window.innerWidth < 900 ? 210 : 240;
      var columns = Math.max(1, Math.min(items.length || 1, Math.floor((boardSpace.width + cardGap) / (minCardWidth + cardGap)) || 1));
      var rows = Math.max(1, Math.ceil(items.length / columns));
      var cardWidth = Math.floor((boardSpace.width - cardGap * (columns - 1)) / columns);
      cardWidth = Math.max(minCardWidth, Math.min(maxCardWidth, cardWidth));
      var cardStepX = cardWidth + cardGap;
      var boardSpanX = columns * cardWidth + (columns - 1) * cardGap;
      var firstX = boardSpace.centerX - (boardSpanX / 2);
      var firstY = -boardSpace.height / 2 + (window.innerWidth < 900 ? 12 : 10);
      var rowTitleHeights = new Array(rows);
      var rowInfoHeights = new Array(rows);
      var rowOffsets = new Array(rows);
      var boardPose = {};
      var visibleGridCards = [];

      for (var rowInit = 0; rowInit < rows; rowInit += 1) {
        rowTitleHeights[rowInit] = window.innerWidth < 900 ? 18 : 20;
        rowInfoHeights[rowInit] = window.innerWidth < 900 ? 54 : 58;
      }

      cardNodes.forEach(function(card) {
        var product = demoProducts[parseInt(card.dataset.cardIdx, 10)];
        var rank = rankBySlug[product.slug];
        if (rank === undefined) {
          card.classList.remove('galaxy-card--grid');
          card.style.opacity = '0';
          card.style.visibility = 'hidden';
          card.style.pointerEvents = 'none';
          card.style.transform = 'translate3d(-420px, 0, -600px) rotateY(65deg) scale(0.5)';
          card.style.removeProperty('--grid-info-height');
          return;
        }
        var row = Math.floor(rank / columns);
        var col = rank % columns;
        var cardName = card.querySelector('.galaxy-card__name');
        var cardPrice = card.querySelector('.galaxy-card__price');
        card.classList.add('galaxy-card--grid');
        card.style.setProperty('--grid-card-width', cardWidth + 'px');
        card.style.removeProperty('--grid-title-height');
        card.style.removeProperty('--grid-info-height');
        card.style.opacity = '1';
        card.style.visibility = 'visible';
        card.style.pointerEvents = 'auto';
        var titleHeight = cardName ? Math.ceil(cardName.offsetHeight) : (window.innerWidth < 900 ? 18 : 20);
        var priceHeight = cardPrice ? Math.ceil(cardPrice.offsetHeight) : (window.innerWidth < 900 ? 14 : 16);
        rowTitleHeights[row] = Math.max(rowTitleHeights[row], titleHeight);
        rowInfoHeights[row] = Math.max(rowInfoHeights[row], rowTitleHeights[row] + priceHeight + (window.innerWidth < 900 ? 24 : 26));
        visibleGridCards.push({
          card: card,
          product: product,
          row: row,
          col: col,
          inner: card.querySelector('.galaxy-card__inner'),
        });
      });

      var boardContentHeight = 0;
      var rowCursor = firstY;
      for (var rowIndex = 0; rowIndex < rows; rowIndex += 1) {
        rowOffsets[rowIndex] = rowCursor;
        var rowHeight = cardWidth + rowInfoHeights[rowIndex];
        boardContentHeight += rowHeight;
        rowCursor += rowHeight + cardGap;
        if (rowIndex < rows - 1) boardContentHeight += cardGap;
      }

      visibleGridCards.forEach(function(entry) {
        var gx = firstX + entry.col * cardStepX;
        var gy = rowOffsets[entry.row];
        entry.card.style.setProperty('--grid-title-height', rowTitleHeights[entry.row] + 'px');
        entry.card.style.setProperty('--grid-info-height', rowInfoHeights[entry.row] + 'px');
        boardPose[entry.product.slug] = {
          x: gx,
          y: gy,
          width: entry.inner ? entry.inner.offsetWidth : cardWidth,
          height: cardWidth + rowInfoHeights[entry.row],
        };
        entry.card.style.transform = 'translate3d(' + gx.toFixed(0) + 'px,' + gy.toFixed(0) + 'px,0px) rotateY(0deg) rotateX(0deg) rotateZ(0deg)';
        entry.card.style.setProperty('--grid-float-delay', '0ms');
      });

      var viewportTopY = -boardSpace.height / 2 + (window.innerWidth < 900 ? 12 : 10);
      var viewportBottomY = boardSpace.height / 2 - (window.innerWidth < 900 ? 12 : 10);
      var contentTopY = rows ? rowOffsets[0] : viewportTopY;
      var contentBottomY = rows ? (rowOffsets[rows - 1] + cardWidth + rowInfoHeights[rows - 1]) : viewportTopY;
      var contentOverflowsBoard = (contentBottomY - contentTopY) > (viewportBottomY - viewportTopY + 1);

      if (contentOverflowsBoard) {
        boardScrollMax = Math.max(0, viewportTopY - contentTopY);
        boardScrollMin = Math.min(0, viewportBottomY - contentBottomY);
      } else {
        boardScrollMax = 0;
        boardScrollMin = 0;
      }
      boardScrollTarget = wasGridMode
        ? clamp(previousBoardScrollTarget, boardScrollMin, boardScrollMax)
        : 0;
      boardScrollCurrent = boardScrollTarget;

      boardGridPose = boardPose;
      clearBoardConnections();
      applyBoardScrollFrame(true);
      if (wasGridMode) {
        requestAnimationFrame(function() {
          sceneEl.classList.remove('is-grid-reflowing');
        });
      }

      if (filterMeta) {
        filterMeta.textContent = locale === 'vi'
          ? (items.length + ' sản phẩm phù hợp. Card đang xếp thành 4 hàng theo bộ lọc.')
          : (items.length + ' products matched. Cards are snapped into a 4-row grid.');
      }
    }

    function formatModalTaxonomy(product, group) {
      var values = Array.isArray(product[group]) ? product[group] : [];
      var labels = values.map(function(value) {
        return getTaxonomyLabel(group, value);
      }).filter(Boolean);
      if (labels.length) return labels.join(', ');
      return locale === 'vi' ? 'Đang cập nhật' : 'Updating';
    }

    function buildModalFacts(product, stockLabel, categoryFact) {
      return [
        [locale === 'vi' ? 'Tồn kho' : 'Stock', stockLabel],
        [getGroupLabel('age'), formatModalTaxonomy(product, 'age')],
        [getGroupLabel('format'), formatModalTaxonomy(product, 'format')],
        [getGroupLabel('difficulty'), formatModalTaxonomy(product, 'difficulty')],
        [getGroupLabel('theme'), formatModalTaxonomy(product, 'theme')],
        [locale === 'vi' ? 'Danh mục' : 'Category', categoryFact],
      ]
        .map(function(row) {
          return '<div><dt>' + row[0] + '</dt><dd>' + row[1] + '</dd></div>';
        })
        .join('');
    }

    function buildPriceBlock(p, cls) {
      var orig = Math.round(p._priceNum * 1.28);
      var pct  = Math.round((1 - p._priceNum / orig) * 100);
      return '<span class="' + cls + '__price">$' + p._priceNum + '</span>' +
             '<span class="' + cls + '__orig">$' + orig + '</span>' +
             '<span class="' + cls + '__badge">−' + pct + '%</span>';
    }

    // ─── EXPAND CARD IN-PLACE (hold) — the card ITSELF grows, no overlay ───
    function parseModalPriceNumber(value) {
      var numeric = String(value || '').replace(/[^\d]/g, '');
      return numeric ? Number(numeric) : 0;
    }

    function getModalPriceLabel(product) {
      return locale === 'vi'
        ? (product.priceVi || 'Liên hệ')
        : (product.priceEn || 'Contact us');
    }

    function getModalOriginalPriceLabel(product) {
      return locale === 'vi'
        ? (product.originalPriceVi || '')
        : (product.originalPriceEn || '');
    }

    function buildModalPricePanel(product) {
      var priceLabel = getModalPriceLabel(product);
      var originalLabel = getModalOriginalPriceLabel(product);
      var priceNumber = parseModalPriceNumber(priceLabel) || Number(product._priceNum || 0);
      var originalNumber = parseModalPriceNumber(originalLabel);
      var discount = '';

      if (originalNumber > priceNumber && priceNumber > 0) {
        var pct = Math.round((1 - priceNumber / originalNumber) * 100);
        discount = '<span class="galaxy-modal__badge">-' + pct + '%</span>';
      }

      return '<section class="galaxy-modal__price-panel">' +
        '<div class="galaxy-modal__price-row">' +
          '<span class="galaxy-modal__price">' + priceLabel + '</span>' +
          (originalLabel ? '<span class="galaxy-modal__orig">' + originalLabel + '</span>' : '') +
          discount +
        '</div>' +
      '</section>';
    }

    function buildModalRatingRow(productIndex) {
      var score = productIndex % 3 === 0 ? 5 : 4;
      var reviewCount = 12 + ((productIndex * 7) % 19);
      var stars = '';

      for (var i = 1; i <= 5; i++) {
        stars += '<span class="galaxy-modal__star' + (i <= score ? ' is-on' : '') + '">' + (i <= score ? '★' : '☆') + '</span>';
      }

      return '<div class="galaxy-modal__rating" aria-label="' + reviewCount + (locale === 'vi' ? ' đánh giá' : ' reviews') + '">' +
        '<div class="galaxy-modal__stars">' + stars + '</div>' +
        '<span class="galaxy-modal__review-count">(' + reviewCount + (locale === 'vi' ? ' đánh giá' : ' reviews') + ')</span>' +
      '</div>';
    }

    function buildModalInfoMarkup(product, modalTitle, modalSummary, stock, productIndex, categoryFact) {
      var quantityLabel = locale === 'vi' ? 'Số lượng:' : 'Quantity:';
      var stockNote = locale === 'vi'
        ? (stock > 0 ? 'Chỉ còn ' + stock + ' sản phẩm' : 'Liên hệ để kiểm tra tồn kho')
        : (stock > 0 ? 'Only ' + stock + ' items left' : 'Contact us for stock status');
      var cartLabel = locale === 'vi' ? 'THÊM VÀO GIỎ HÀNG' : 'ADD TO CART';
      var buyLabel = locale === 'vi' ? 'MUA NGAY' : 'BUY NOW';
      var detailsLabel = locale === 'vi' ? 'Xem trang chi tiết →' : 'See full product page →';
      var metaLine = [categoryFact, formatModalTaxonomy(product, 'format'), formatModalTaxonomy(product, 'theme')]
        .filter(Boolean)
        .join(' - ');

      return '<h2 class="galaxy-modal__name">' + modalTitle + '</h2>' +
        buildModalRatingRow(productIndex) +
        buildModalPricePanel(product) +
        '<p class="galaxy-modal__summary">' + modalSummary + '</p>' +
        '<p class="galaxy-modal__meta-line">' + metaLine + '</p>' +
        '<div class="galaxy-modal__purchase-row">' +
          '<div class="galaxy-modal__qty-row">' +
            '<span class="galaxy-modal__qty-label">' + quantityLabel + '</span>' +
            '<div class="galaxy-preview__qty">' +
              '<button class="galaxy-qty-btn js-modal-minus" type="button">−</button>' +
              '<span class="js-modal-qty">1</span>' +
              '<button class="galaxy-qty-btn js-modal-plus" type="button">+</button>' +
            '</div>' +
          '</div>' +
          '<p class="galaxy-modal__stock-note">' + stockNote + '</p>' +
        '</div>' +
        '<div class="galaxy-modal__actions">' +
          '<button class="galaxy-btn-cart" type="button">' + cartLabel + '</button>' +
          '<button class="galaxy-btn-buy" type="button">' + buyLabel + '</button>' +
        '</div>' +
        '<a class="galaxy-modal__fulllink" href="' + getLocalePath('product-detail', product.slug) + '" data-transition>' + detailsLabel + '</a>';
    }

    var expandedCard = null;

    function expandCard(card, product) {
      // Collapse previous if different card
      if (expandedCard && expandedCard !== card) {
        expandedCard.classList.remove('is-expanded');
      }
      expandedCard = card;
      card.classList.add('is-expanded');
      stopSphere();
    }

    function collapseCard() {
      if (!expandedCard) return;
      expandedCard.classList.remove('is-expanded');
      expandedCard = null;
      resumeSphere();
    }

    // Qty + cart/buy delegation on sphere
    sphere.addEventListener('click', function(e) {
      var inner = e.target.closest('.galaxy-card__inner');
      if (!inner) return;
      e.preventDefault(); e.stopPropagation();

      // Qty buttons
      if (e.target.classList.contains('js-xminus')) {
        var v = inner.querySelector('.js-xqty-val');
        if (v && +v.textContent > 1) v.textContent = +v.textContent - 1;
        return;
      }
      if (e.target.classList.contains('js-xplus')) {
        var v = inner.querySelector('.js-xqty-val');
        if (v) v.textContent = +v.textContent + 1;
        return;
      }
      // Cart / Buy (visual feedback only for now)
      if (e.target.classList.contains('xbtn-cart') || e.target.classList.contains('xbtn-buy')) {
        e.target.textContent = e.target.classList.contains('xbtn-cart') ? '✓ Added!' : '✓ Done!';
        setTimeout(function() {
          e.target.textContent = e.target.classList.contains('xbtn-cart') ? 'Add to Cart' : 'Buy Now';
        }, 1500);
        return;
      }

      // Sphere mode opens summary modal. Grid/search/filter mode opens detail page.
      if (layoutMode !== 'grid' && pMoved) return; // was a sphere drag
      var card = e.target.closest('.galaxy-card');
      if (!card) return;
      clearTimeout(holdTimer);
      var product = getProductByCard(card);
      if (layoutMode === 'grid') {
        goToProductDetail(product);
      } else {
        openModal(product);
      }
    }, true);

    // Click backdrop (outside sphere) → collapse expanded card
    document.addEventListener('click', function(e) {
      if (expandedCard && !e.target.closest('.galaxy-card') && !e.target.closest('.galaxy-modal') && !e.target.closest('.galaxy-search-bar')) {
        collapseCard();
      }
    });


    // ─── MODAL (click) ───
    function openModal(product) {
      stopSphere();
      var stock = product.stock || 0;
      var productIndex = Math.max(0, demoProducts.indexOf(product));

      var galleryCandidates = []
        .concat(Array.isArray(product.gallery) ? product.gallery : [])
        .concat([product.hero, product.cover])
        .filter(Boolean);
      var seenGallerySources = {};
      var galleryCovers = galleryCandidates.filter(function(cov) {
        var key = typeof cov === 'string' ? cov : cov.src;
        if (!key || seenGallerySources[key]) return false;
        seenGallerySources[key] = true;
        return true;
      });
      if (!galleryCovers.length && product.cover) galleryCovers.push(product.cover);
      var modalTitle = locale === 'vi' ? product.titleVi : product.titleEn;
      var modalSummary = locale === 'vi'
        ? (product.taglineVi || product.summaryVi || '')
        : (product.taglineEn || product.summaryEn || '');
      var stockLabel = locale === 'vi'
        ? (stock > 0 ? ((product.availabilityVi || 'Còn hàng') + ' · ' + stock) : (product.availabilityVi || 'Liên hệ'))
        : (stock > 0 ? ((product.availabilityEn || 'In stock') + ' · ' + stock) : (product.availabilityEn || 'Contact us'));
      var categoryFact = product.facts && product.facts[0]
        ? (locale === 'vi' ? product.facts[0].valueVi : product.facts[0].valueEn)
        : (locale === 'vi' ? 'Sản phẩm STEM' : 'STEM product');
      if (!modalSummary) modalSummary = categoryFact;

      // Thumbnail HTML
      var thumbsHTML = '<div class="galaxy-modal__thumbs" id="js-modal-thumbs">';
      galleryCovers.forEach(function(cov, idx) {
        thumbsHTML += '<button class="galaxy-modal__thumb' + (idx === 0 ? ' is-active' : '') + '" data-idx="' + idx + '" type="button">' +
          renderMedia(cov, '', { tier: 'critical', loading: 'eager' }) +
        '</button>';
      });
      thumbsHTML += '</div>';

      modalEl.innerHTML =
        '<div class="galaxy-modal__box">' +
          '<button class="galaxy-modal__close js-modal-close">×</button>' +
          '<div class="galaxy-modal__left">' +
            '<div class="galaxy-modal__img js-modal-mainimg">' + renderMedia(product.hero || product.cover, '', { tier: 'critical', loading: 'eager' }) + '</div>' +
            thumbsHTML +
          '</div>' +
          '<div class="galaxy-modal__info">' +
            '<h2 class="galaxy-modal__name">' + modalTitle + '</h2>' +
            '<div class="galaxy-modal__price-row">' + buildPriceBlock(product, 'galaxy-modal') + '</div>' +
            '<p class="galaxy-modal__summary">' + modalSummary + '</p>' +
            '<dl class="galaxy-modal__facts">' +
              '<div><dt>Stock</dt><dd>' + stock + ' units</dd></div>' +
              '<div><dt>Age Group</dt><dd>Ages 6–14</dd></div>' +
              '<div><dt>Format</dt><dd>Kit + Digital Guide</dd></div>' +
              '<div><dt>Difficulty</dt><dd>Beginner</dd></div>' +
              '<div><dt>Learning Theme</dt><dd>STEM Exploration</dd></div>' +
              '<div><dt>Duration</dt><dd>2–3 hours</dd></div>' +
            '</dl>' +
            '<div class="galaxy-modal__qty-row">' +
              '<span>Qty</span>' +
              '<div class="galaxy-preview__qty">' +
                '<button class="galaxy-qty-btn js-modal-minus">−</button>' +
                '<span class="js-modal-qty">1</span>' +
                '<button class="galaxy-qty-btn js-modal-plus">+</button>' +
              '</div>' +
            '</div>' +
            '<div class="galaxy-modal__actions">' +
              '<button class="galaxy-btn-cart">Add to Cart</button>' +
              '<button class="galaxy-btn-buy">Buy Now</button>' +
            '</div>' +
            '<a class="galaxy-modal__fulllink" href="' + getLocalePath('product-detail', product.slug) + '" data-transition>See full product page →</a>' +
          '</div>' +
        '</div>';

      var infoPanel = modalEl.querySelector('.galaxy-modal__info');
      if (infoPanel) {
        infoPanel.innerHTML = buildModalInfoMarkup(product, modalTitle, modalSummary, stock, productIndex, categoryFact);
      }

      modalEl.classList.add('is-open');
      var modalFactsList = modalEl.querySelector('.galaxy-modal__facts');
      if (modalFactsList) {
        modalFactsList.innerHTML = buildModalFacts(product, stockLabel, categoryFact);
      }
      var modalFactRows = $$('.galaxy-modal__facts > div', modalEl);
      var modalFactPayload = [
        [locale === 'vi' ? 'Tồn kho' : 'Stock', stockLabel],
        [getGroupLabel('age'), formatModalTaxonomy(product, 'age')],
        [getGroupLabel('format'), formatModalTaxonomy(product, 'format')],
        [getGroupLabel('difficulty'), formatModalTaxonomy(product, 'difficulty')],
        [getGroupLabel('theme'), formatModalTaxonomy(product, 'theme')],
        [locale === 'vi' ? 'Danh mục' : 'Category', categoryFact],
      ];
      modalFactRows.forEach(function(row, rowIndex) {
        var labelNode = row.querySelector('dt');
        var valueNode = row.querySelector('dd');
        if (labelNode) labelNode.textContent = modalFactPayload[rowIndex][0];
        if (valueNode) valueNode.textContent = modalFactPayload[rowIndex][1];
      });
      var fullLink = modalEl.querySelector('.galaxy-modal__fulllink');
      if (fullLink) fullLink.textContent = locale === 'vi' ? 'Xem trang chi tiết ->' : 'See full product page ->';
      hydrateDynamicMedia(modalEl);

      // Qty controls
      var qtyEl = modalEl.querySelector('.js-modal-qty');
      modalEl.querySelector('.js-modal-minus').onclick = function() { var v=+qtyEl.textContent; if(v>1) qtyEl.textContent=v-1; };
      modalEl.querySelector('.js-modal-plus').onclick  = function() { var v=+qtyEl.textContent; if(v<stock) qtyEl.textContent=v+1; };
      modalEl.querySelector('.js-modal-close').onclick = closeModal;
      modalEl.addEventListener('click', function(e) { if(e.target===modalEl) closeModal(); });

      // Thumbnail switching
      var mainImg = modalEl.querySelector('.js-modal-mainimg');
      modalEl.querySelector('#js-modal-thumbs').addEventListener('click', function(e) {
        var btn = e.target.closest('.galaxy-modal__thumb');
        if (!btn) return;
        var idx = +btn.dataset.idx;
        // Update main image
        mainImg.innerHTML = renderMedia(galleryCovers[idx], '', { tier: 'critical', loading: 'eager' });
        hydrateDynamicMedia(mainImg);
        // Update active class
        modalEl.querySelectorAll('.galaxy-modal__thumb').forEach(function(t) { t.classList.remove('is-active'); });
        btn.classList.add('is-active');
      });
    }

    function closeModal() {
      modalEl.classList.remove('is-open');
      resumeSphere();
    }

    // Intercept card <a> clicks — handled via sphere delegation above
    // (kept empty intentionally — replaced by sphere click handler)

    // Mouse events
    sceneEl.addEventListener('mousedown', function(e) {
      if (layoutMode === 'grid') {
        pMoved = false;
        holdCard = null;
        return;
      }
      if (e.target.closest('.galaxy-search-bar')) return;
      pDownX = e.clientX; pDownY = e.clientY; pMoved = false;
      holdCard = e.target.closest('.galaxy-card');
      if (holdCard) {
        holdTimer = setTimeout(function() {
          if (!pMoved) {
            var product = getProductByCard(holdCard);
            if (product) expandCard(holdCard, product);  // ← expand in-sphere
          }
        }, HOLD_MS);
      }
      e.preventDefault();
      onDragStart(e.clientX, e.clientY);
    });
    window.addEventListener('mousemove', function(e) {
      if (layoutMode === 'grid') return;
      if (Math.abs(e.clientX - pDownX) > MOVE_THRESH || Math.abs(e.clientY - pDownY) > MOVE_THRESH) {
        pMoved = true; clearTimeout(holdTimer);
      }
      onDragMove(e.clientX, e.clientY);
    });
    window.addEventListener('mouseup', onDragEnd);

    // Touch events (mobile)
    sceneEl.addEventListener('touchstart', function(e) {
      if (layoutMode === 'grid') {
        var tBoard = e.touches[0];
        boardTouchActive = true;
        boardTouchStartY = tBoard.clientY;
        boardTouchStartScroll = boardScrollTarget;
        boardTouchMoved = false;
        return;
      }
      if (e.target.closest('.galaxy-search-bar')) return;
      var t = e.touches[0];
      pDownX = t.clientX; pDownY = t.clientY; pMoved = false;
      holdCard = e.target.closest('.galaxy-card');
      if (holdCard) {
        holdTimer = setTimeout(function() {
          if (!pMoved) {
            var product = getProductByCard(holdCard);
            if (product) expandCard(holdCard, product);  // ← expand in-sphere
          }
        }, HOLD_MS);
      }
      onDragStart(t.clientX, t.clientY);
    }, { passive: true });
    sceneEl.addEventListener('touchmove', function(e) {
      if (layoutMode === 'grid') {
        if (!boardTouchActive) return;
        var tBoard = e.touches[0];
        if (Math.abs(tBoard.clientY - boardTouchStartY) > MOVE_THRESH) {
          boardTouchMoved = true;
        }
        boardScrollTarget = clamp(boardTouchStartScroll + ((tBoard.clientY - boardTouchStartY) * 1.08), boardScrollMin, boardScrollMax);
        syncBoardScrollHints();
        e.preventDefault();
        return;
      }
      var t = e.touches[0];
      if (Math.abs(t.clientX - pDownX) > MOVE_THRESH || Math.abs(t.clientY - pDownY) > MOVE_THRESH) {
        pMoved = true; clearTimeout(holdTimer);
      }
      onDragMove(t.clientX, t.clientY);
    }, { passive: false });
    sceneEl.addEventListener('touchend', function(e) {
      clearTimeout(holdTimer);
      if (layoutMode === 'grid') {
        if (!boardTouchMoved) {
          var tapCard = e.target.closest('.galaxy-card');
          var tapProduct = getProductByCard(tapCard);
          goToProductDetail(tapProduct);
        }
        boardTouchActive = false;
        boardTouchMoved = false;
        return;
      }
      if (!pMoved && holdCard) {
        var product = getProductByCard(holdCard);
        openModal(product);
      }
      onDragEnd();
    });

    // Scroll to zoom
    sceneEl.addEventListener('wheel', function(e) {
      if (layoutMode === 'grid') {
        if (nudgeBoardScroll(e.deltaY * 0.82)) {
          e.preventDefault();
        }
        return;
      }
      e.preventDefault();
      cZoom += e.deltaY < 0 ? 0.045 : -0.045;
      if (cZoom < 0.82) cZoom = 0.82;
      if (cZoom > 1.18) cZoom = 1.18;
    }, { passive: false });

    // Close overlays on Escape
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') { collapseCard(); closeModal(); }
    });

    // Set initial cursor
    sceneEl.style.cursor = 'grab';

    // --- Animation loop ---
    function animGalaxy() {
      if (layoutMode === 'grid') {
        applyBoardScrollFrame(false);
      } else if (layoutMode === 'sphere') {
        if (hoverFocusActive && !sphereFrozen && !isDragging) {
          rotY += shortestAngleDelta(rotY, hoverTargetRotY) * 0.1;
          rotX += (hoverTargetRotX - rotX) * 0.1;
          velX = 0;
          velY = 0;
          if (Math.abs(shortestAngleDelta(rotY, hoverTargetRotY)) < 0.08) rotY = hoverTargetRotY;
          if (Math.abs(hoverTargetRotX - rotX) < 0.08) rotX = hoverTargetRotX;
        } else if (!sphereFrozen) {  // only update when NOT frozen
          if (isDragging) {
          rotY += velY;
          rotX += velX;
          } else if (isIdle) {
          velY += (AUTO_SPIN_SPEED - velY) * 0.02;
          rotY += velY;
          easeSphereTiltHome(0.015, 0.9);
          } else {
          velY *= FRICTION;
          rotY += velY;
          easeSphereTiltHome(0.01, FRICTION);
          }
        }
        if (rotX > MAX_TILT_X) { rotX = MAX_TILT_X; velX = 0; }
        if (rotX < -MAX_TILT_X) { rotX = -MAX_TILT_X; velX = 0; }
        applyRot();
        syncHoverPreviewPosition();
      }
      requestAnimationFrame(animGalaxy);
    }
    animGalaxy();

    // --- Search & Filter ---
    var activeFilter = 'all';
    var searchBrowseMode = false;
    var productCopy = getProductDetailCopy();

    function filterProducts(query, priceFilter) {
      var q = query.toLowerCase().trim();
      return demoProducts.filter(function(p) {
        var nameMatch = !q || p.titleEn.toLowerCase().indexOf(q) !== -1;
        var priceMatch = true;
        if (priceFilter === 'high') priceMatch = p._priceNum >= 200;
        else if (priceFilter === 'mid') priceMatch = p._priceNum >= 100 && p._priceNum < 200;
        else if (priceFilter === 'low') priceMatch = p._priceNum < 100;
        return nameMatch && priceMatch;
      });
    }

    function renderSearchResultsPanel() {
      if (resultsPanel) resultsPanel.style.display = 'none';
      return;
      var q = arguments.length && typeof arguments[0] === 'string' ? arguments[0] : searchInput.value;
      var categoryFilter = categorySelect ? categorySelect.value : 'all';
      var sortMode = sortSelect ? sortSelect.value : 'default';
      var items = filterProducts(q, activeFilter, categoryFilter, sortMode);
      if (items.length === 0) {
        resultsPanel.innerHTML = '<div class="galaxy-results-empty">' + (locale === 'vi' ? 'Không tìm thấy sản phẩm' : 'No products found') + '</div>';
      } else {
        resultsPanel.innerHTML = items.map(function(item) {
          var cardTitle = escapeHtmlText(locale === "vi" ? item.titleVi : item.titleEn);
          var cardPrice = escapeHtmlText(locale === "vi" ? item.priceVi : item.priceEn);
          var coverAlt = escapeHtmlText(locale === "vi" ? (item.coverAltVi || item.coverAlt || item.titleVi) : (item.coverAltEn || item.coverAlt || item.titleEn));
          return '<a class="galaxy-search-card" href="' + getLocalePath("product-detail", item.slug) + '" data-transition aria-label="' + cardTitle + '">' +
            '<div class="galaxy-search-card__media">' + renderMedia(item.cover, coverAlt, { tier: "deferred", loading: "lazy" }) + '</div>' +
            '<div class="galaxy-search-card__body">' +
              '<span class="galaxy-search-card__name">' + cardTitle + '</span>' +
              '<span class="galaxy-search-card__price">' + cardPrice + '</span>' +
            '</div>' +
          '</a>';
        }).join('');
      }
      resultsPanel.style.display = 'grid';
      hydrateDynamicMedia(resultsPanel);
    }

    filterProducts = function(query, priceFilter, categoryFilter, sortMode) {
      var q = String(query || '').toLowerCase().trim();
      return sortProductList(demoProducts.filter(function(p) {
        var titleVi = String(p.titleVi || '').toLowerCase();
        var titleEn = String(p.titleEn || '').toLowerCase();
        var nameMatch = !q || titleVi.indexOf(q) !== -1 || titleEn.indexOf(q) !== -1;
        var categoryMatch = categoryFilter === 'all' || getProductCategory(p) === categoryFilter;
        return nameMatch && categoryMatch && matchesPriceRange(p, priceFilter);
      }), sortMode);
    };

    renderResults = function() {
      var q = searchInput.value || '';
      var categoryFilter = categorySelect ? categorySelect.value : 'all';
      var sortMode = sortSelect ? sortSelect.value : 'default';
      var items = filterProducts(q, activeFilter, categoryFilter, sortMode);

      if (resultsPanel) resultsPanel.style.display = 'none';
      collapseCard();

      if (shouldUseGridLayout(q, categoryFilter, activeFilter, sortMode)) {
        applyGridLayout(items);
      } else {
        applySphereLayout();
      }
    };

    function openSearchResults() {
      searchBrowseMode = true;
      if (resultsPanel) resultsPanel.style.display = 'none';
      renderResults();
    }

    function renderInitialProductResults() {
      var q = searchInput.value || '';
      var categoryFilter = categorySelect ? categorySelect.value : 'all';
      var sortMode = sortSelect ? sortSelect.value : 'default';
      var startsInGrid = shouldUseGridLayout(q, categoryFilter, activeFilter, sortMode);

      if (!startsInGrid) {
        renderResults();
        return;
      }

      sceneEl.style.visibility = 'hidden';
      sceneEl.classList.add('is-grid-reflowing');

      var syncWhenShellReady = function() {
        if (!body.classList.contains('is-shell-visible')) {
          requestAnimationFrame(syncWhenShellReady);
          return;
        }

        syncProductFilterBarFrame();
        renderResults();
        requestAnimationFrame(function() {
          syncProductFilterBarFrame();
          renderResults();
          requestAnimationFrame(function() {
            sceneEl.classList.remove('is-grid-reflowing');
            sceneEl.style.visibility = '';
          });
        });
      };

      requestAnimationFrame(syncWhenShellReady);
    }

    function setPriceDropdownOpen(isOpen) {
      if (!priceMenu || !priceDropdown) return;
      if (priceCloseTimer) {
        clearTimeout(priceCloseTimer);
        priceCloseTimer = null;
      }
      priceMenu.classList.toggle('is-open', Boolean(isOpen));
      priceDropdown.setAttribute('aria-expanded', Boolean(isOpen) ? 'true' : 'false');
      if (priceField) priceField.classList.toggle('is-open', Boolean(isOpen));
    }

    function schedulePriceDropdownClose() {
      if (priceCloseTimer) clearTimeout(priceCloseTimer);
      priceCloseTimer = setTimeout(function() {
        setPriceDropdownOpen(false);
      }, 180);
    }

    function setFilterMenuOpen(dropdownUi, isOpen) {
      if (!dropdownUi || !dropdownUi.menu || !dropdownUi.toggle || !dropdownUi.field) return;
      dropdownUi.menu.classList.toggle('is-open', Boolean(isOpen));
      dropdownUi.toggle.setAttribute('aria-expanded', Boolean(isOpen) ? 'true' : 'false');
      dropdownUi.field.classList.toggle('is-open', Boolean(isOpen));
    }

    function syncFilterMenuLabel(dropdownUi) {
      if (!dropdownUi || !dropdownUi.select || !dropdownUi.label || !dropdownUi.menu) return;
      var safeSelectedOption = dropdownUi.select.options[dropdownUi.select.selectedIndex];
      var safeSelectedText = safeSelectedOption ? safeSelectedOption.textContent : '';
      dropdownUi.label.textContent = dropdownUi === sortDropdownUi
        ? productCopy.sortPrefix + safeSelectedText
        : safeSelectedText;
      $$('.galaxy-filter-menu__option', dropdownUi.menu).forEach(function(optionBtn) {
        var isCurrent = optionBtn.dataset.value === dropdownUi.select.value;
        optionBtn.classList.toggle('is-active', isCurrent);
        optionBtn.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
      });
      return;
      var selectedOption = dropdownUi.select.options[dropdownUi.select.selectedIndex];
      var selectedText = selectedOption ? selectedOption.textContent : '';
      dropdownUi.label.textContent = dropdownUi === sortDropdownUi
        ? (locale === 'vi' ? 'Sắp xếp: ' : 'Sort: ') + selectedText
        : selectedText;
      $$('.galaxy-filter-menu__option', dropdownUi.menu).forEach(function(optionBtn) {
        var isCurrent = optionBtn.dataset.value === dropdownUi.select.value;
        optionBtn.classList.toggle('is-active', isCurrent);
        optionBtn.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
      });
    }

    function bindFilterDropdown(dropdownUi) {
      if (!dropdownUi || !dropdownUi.toggle || !dropdownUi.menu || !dropdownUi.field || !dropdownUi.select) return;
      dropdownUi.closeTimer = null;

      function openDropdown() {
        if (dropdownUi.closeTimer) {
          clearTimeout(dropdownUi.closeTimer);
          dropdownUi.closeTimer = null;
        }
        setFilterMenuOpen(dropdownUi, true);
      }

      function scheduleDropdownClose() {
        if (dropdownUi.closeTimer) clearTimeout(dropdownUi.closeTimer);
        dropdownUi.closeTimer = setTimeout(function() {
          setFilterMenuOpen(dropdownUi, false);
        }, 180);
      }

      dropdownUi.toggle.addEventListener('click', function(e) {
        e.stopPropagation();
        if (dropdownUi.closeTimer) {
          clearTimeout(dropdownUi.closeTimer);
          dropdownUi.closeTimer = null;
        }
        setFilterMenuOpen(dropdownUi, !dropdownUi.menu.classList.contains('is-open'));
      });
      dropdownUi.toggle.addEventListener('mouseenter', function() {
        openDropdown();
      });
      dropdownUi.toggle.addEventListener('focus', function() {
        openDropdown();
      });
      dropdownUi.menu.addEventListener('click', function(e) {
        var optionBtn = e.target.closest('.galaxy-filter-menu__option');
        if (!optionBtn) return;
        e.stopPropagation();
        dropdownUi.select.value = optionBtn.dataset.value;
        syncFilterMenuLabel(dropdownUi);
        setFilterMenuOpen(dropdownUi, false);
        renderResults();
      });
      dropdownUi.menu.addEventListener('mouseenter', function() {
        openDropdown();
      });
      dropdownUi.field.addEventListener('mouseleave', function() {
        scheduleDropdownClose();
      });
      dropdownUi.field.addEventListener('focusout', function(e) {
        if (!dropdownUi.field.contains(e.relatedTarget)) setFilterMenuOpen(dropdownUi, false);
      });
      dropdownUi.select.addEventListener('change', function() {
        syncFilterMenuLabel(dropdownUi);
      });
      syncFilterMenuLabel(dropdownUi);
    }

    function selectPriceRange(nextFilter, nextLabel) {
      activeFilter = nextFilter || 'all';
      if (priceValueLabel && nextLabel) priceValueLabel.textContent = nextLabel;
      if (priceMenu) {
        $$('.galaxy-price-select__option', priceMenu).forEach(function(optionBtn) {
          var isActivePrice = optionBtn.dataset.filter === activeFilter;
          optionBtn.classList.toggle('is-active', isActivePrice);
          optionBtn.setAttribute('aria-selected', isActivePrice ? 'true' : 'false');
        });
      }
      setPriceDropdownOpen(false);
      renderResults();
    }

    searchInput.addEventListener('input', function() {
      searchBrowseMode = true;
      renderResults();
    });
    searchInput.addEventListener('focus', openSearchResults);
    searchInput.addEventListener('click', openSearchResults);
    if (categorySelect) categorySelect.addEventListener('change', renderResults);
    if (sortSelect) sortSelect.addEventListener('change', renderResults);
    bindFilterDropdown(categoryDropdownUi);
    bindFilterDropdown(sortDropdownUi);

    var urlCategory = normalizeText(new URLSearchParams(window.location.search).get("category") || "");
    if (urlCategory && categorySelect) {
      var matchedCategoryOption = Array.from(categorySelect.options).find(function(option) {
        return normalizeText(option.value) === urlCategory;
      });
      if (matchedCategoryOption) {
        categorySelect.value = matchedCategoryOption.value;
        syncFilterMenuLabel(categoryDropdownUi);
      }
    }

    var boardResizeTimer = null;
    window.addEventListener('resize', function() {
      syncProductFilterBarFrame();
      clearTimeout(boardResizeTimer);
      boardResizeTimer = setTimeout(renderResults, 120);
    });
    window.addEventListener('scroll', syncProductFilterBarFrame, { passive: true });

    // Close results when clicking outside
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.galaxy-filter-panel')) {
        setPriceDropdownOpen(false);
        setFilterMenuOpen(categoryDropdownUi, false);
        setFilterMenuOpen(sortDropdownUi, false);
        searchBrowseMode = false;
        if (resultsPanel) resultsPanel.style.display = 'none';
        renderResults();
      }
    });

    // Filter chips
    if (chipsWrap) {
      chipsWrap.addEventListener('click', function(e) {
        var btn = e.target.closest('.galaxy-chip');
        if (!btn) return;
        activeFilter = btn.dataset.filter;
        $$('.galaxy-chip', chipsWrap).forEach(function(c) { c.classList.remove('is-active'); });
        btn.classList.add('is-active');
        renderResults();
      });
    }
    if (priceDropdown) {
      priceDropdown.addEventListener('click', function(e) {
        e.stopPropagation();
        if (priceCloseTimer) {
          clearTimeout(priceCloseTimer);
          priceCloseTimer = null;
        }
        setPriceDropdownOpen(!(priceMenu && priceMenu.classList.contains('is-open')));
      });
      priceDropdown.addEventListener('mouseenter', function() {
        setPriceDropdownOpen(true);
      });
      priceDropdown.addEventListener('focus', function() {
        setPriceDropdownOpen(true);
      });
    }
    if (priceMenu) {
      priceMenu.addEventListener('click', function(e) {
        var optionBtn = e.target.closest('.galaxy-price-select__option');
        if (!optionBtn) return;
        e.stopPropagation();
        selectPriceRange(optionBtn.dataset.filter, optionBtn.textContent.trim());
      });
      priceMenu.addEventListener('mouseenter', function() {
        setPriceDropdownOpen(true);
      });
    }
    if (priceField) {
      priceField.addEventListener('mouseleave', function() {
        schedulePriceDropdownClose();
      });
      priceField.addEventListener('focusout', function(e) {
        if (!priceField.contains(e.relatedTarget)) setPriceDropdownOpen(false);
      });
    }
    renderInitialProductResults();

    setTimeout(function() { initHero3DCanvas(root); }, 100);
  }

  function renderProductDetailPageV2() {
    const root = $(".js-page-root");
    if (!root) return;

    const item = data.products.find((entry) => entry.slug === slugFromPath());
    if (!item) return renderMissing(root, getLocalePath("products"));

    const title = getText(item, "titleVi", "titleEn");
    const tagline = getText(item, "taglineVi", "taglineEn");
    const summary = getText(item, "summaryVi", "summaryEn") || tagline;
    const summaryConfig = getProductCardSummaryConfig(title);
    const detailSummary = truncateText(summary, summaryConfig.maxLength);
    const description = getText(item, "descriptionVi", "descriptionEn") || summary;
    const detailCopy = getProductDetailCopy();
    const currentCategory = item.facts && item.facts[0] ? getText(item.facts[0], "valueVi", "valueEn") : "";
    const related = getRelatedProducts(item).slice(0, 4);
    const priceLabel = locale === "vi" ? normalizeText(item.priceVi) : normalizeText(item.priceEn);
    const reviewScore = 4 + ((item.featuredOrder || 0) % 2);
    const reviewCount = 12 + ((item.featuredOrder || 0) % 7) * 2;
    const stockCount = Number(item.stock || 0);
    const safeStockNote = stockCount > 0
      ? `${detailCopy.stockLeftPrefix}${stockCount}${detailCopy.stockLeftSuffix}`
      : detailCopy.stockContact;
    const safeStars = Array.from(
      { length: 5 },
      (_, index) => `<span class="product-detail-stars__star${index < reviewScore ? " is-on" : ""}">${index < reviewScore ? "★" : "☆"}</span>`
    ).join("");
    const stockNote = locale === "vi"
      ? (stockCount > 0 ? `Chỉ còn ${stockCount} sản phẩm` : "Liên hệ để kiểm tra tồn kho")
      : (stockCount > 0 ? `Only ${stockCount} items left` : "Contact us for stock status");
    const stars = Array.from(
      { length: 5 },
      (_, index) => `<span class="product-detail-stars__star${index < reviewScore ? " is-on" : ""}">${index < reviewScore ? "★" : "☆"}</span>`
    ).join("");

    const dedupedGallery = [];
    const seenGallery = new Set();
    [...(Array.isArray(item.gallery) ? item.gallery : []), item.hero, item.cover]
      .filter(Boolean)
      .forEach((mediaItem) => {
        const key = typeof mediaItem === "string" ? mediaItem : mediaItem.src;
        if (!key || seenGallery.has(key)) return;
        seenGallery.add(key);
        dedupedGallery.push(mediaItem);
      });
    if (!dedupedGallery.length && item.cover) dedupedGallery.push(item.cover);

    const categories = Array.from(
      new Set(
        data.products
          .map((product) => product.facts && product.facts[0] ? getText(product.facts[0], "valueVi", "valueEn") : "")
          .filter(Boolean)
      )
    );

    const infoRows = [
      [locale === "vi" ? "Danh mục" : "Category", currentCategory || tagline],
      [locale === "vi" ? "Tình trạng" : "Stock", locale === "vi" ? (normalizeText(item.availabilityVi) || "Còn hàng") : (normalizeText(item.availabilityEn) || "In stock")],
      [locale === "vi" ? "Giá" : "Price", priceLabel],
      [getGroupLabel("age"), item.age.map((value) => getTaxonomyLabel("age", value)).join(", ")],
      [getGroupLabel("theme"), item.theme.map((value) => getTaxonomyLabel("theme", value)).join(", ")],
      [getGroupLabel("format"), item.format.map((value) => getTaxonomyLabel("format", value)).join(", ")],
      [getGroupLabel("difficulty"), item.difficulty.map((value) => getTaxonomyLabel("difficulty", value)).join(", ")],
    ];

    const outcomes = (locale === "vi" ? item.outcomesVi : item.outcomesEn).map((entry) => normalizeText(entry)).filter(Boolean);
    const descriptionMarkup = renderProductDescriptionMarkup(item, description);
    const tabItems = [
      {
        key: "description",
        label: locale === "vi" ? "Mô tả chi tiết" : "Description",
        content: `
          <h2>${locale === "vi" ? "Mô tả sản phẩm" : "Product description"}</h2>
          ${descriptionMarkup}
          ${(Array.isArray(item.detailSections) ? item.detailSections : []).map((section) => `
            <article class="product-detail-tab-section">
              <h3>${getText(section, "headingVi", "headingEn")}</h3>
              <div class="product-detail-rich-copy">${renderRichTextBlocks(getText(section, "bodyVi", "bodyEn"))}</div>
            </article>
          `).join("")}
        `,
      },
      {
        key: "specs",
        label: locale === "vi" ? "Thông số kỹ thuật" : "Specifications",
        content: `
          <h2>${locale === "vi" ? "Thông số kỹ thuật" : "Specifications"}</h2>
          <dl class="product-detail-spec-list">
            ${infoRows.map((row) => `<div><dt>${row[0]}</dt><dd>${row[1]}</dd></div>`).join("")}
          </dl>
        `,
      },
      {
        key: "features",
        label: locale === "vi" ? "Tính năng" : "Features",
        content: `
          <h2>${locale === "vi" ? "Tính năng nổi bật" : "Key features"}</h2>
          <ul class="product-detail-feature-list">
            ${(outcomes.length ? outcomes : [
              summary,
              locale === "vi" ? "Dễ tích hợp vào workshop, lớp học và dự án maker." : "Easy to integrate into workshops, classrooms, and maker builds.",
              locale === "vi" ? "Phù hợp để demo cơ cấu, thuật toán và tư duy kỹ thuật." : "Useful for demonstrating mechanisms, algorithms, and engineering thinking.",
            ]).map((entry) => `<li>${entry}</li>`).join("")}
          </ul>
        `,
      },
      {
        key: "reviews",
        label: locale === "vi" ? "Đánh giá & Bình luận" : "Reviews & Comments",
        content: `
          <h2>${locale === "vi" ? "Đánh giá & Bình luận" : "Reviews & Comments"}</h2>
          <p>${locale === "vi"
            ? `${reviewCount} đánh giá từ giáo viên, phụ huynh và đội triển khai. Điểm trung bình ${reviewScore}/5 cho độ dễ tích hợp và khả năng demo trên lớp.`
            : `${reviewCount} reviews from teachers, parents, and deployment teams. Average score ${reviewScore}/5 for integration quality and classroom demonstration.`}</p>
          <blockquote class="product-detail-review-quote">
            <p>${getText(item.highlightQuote, "textVi", "textEn")}</p>
            <footer>${getText(item.highlightQuote, "authorVi", "authorEn")}</footer>
          </blockquote>
        `,
      },
    ];

    const safeInfoRows = [
      [detailCopy.stockLabel === "Stock" ? "Category" : "Danh mục", currentCategory || tagline],
      [detailCopy.stockLabel, locale === "vi" ? (normalizeText(item.availabilityVi) || detailCopy.stockInLabel) : (normalizeText(item.availabilityEn) || detailCopy.stockInLabel)],
      [detailCopy.priceLabel, priceLabel],
      [getGroupLabel("age"), item.age.map((value) => getTaxonomyLabel("age", value)).join(", ")],
      [getGroupLabel("theme"), item.theme.map((value) => getTaxonomyLabel("theme", value)).join(", ")],
      [getGroupLabel("format"), item.format.map((value) => getTaxonomyLabel("format", value)).join(", ")],
      [getGroupLabel("difficulty"), item.difficulty.map((value) => getTaxonomyLabel("difficulty", value)).join(", ")],
    ];

    const cleanTabItems = [
      {
        key: "description",
        label: detailCopy.descriptionTab,
        content: `
          <h2>${detailCopy.descriptionTitle}</h2>
          ${descriptionMarkup}
          ${(Array.isArray(item.detailSections) ? item.detailSections : []).map((section) => `
            <article class="product-detail-tab-section">
              <h3>${getText(section, "headingVi", "headingEn")}</h3>
              <div class="product-detail-rich-copy">${renderRichTextBlocks(getText(section, "bodyVi", "bodyEn"))}</div>
            </article>
          `).join("")}
        `,
      },
      {
        key: "specs",
        label: detailCopy.specsTab,
        content: `
          <h2>${detailCopy.specsTitle}</h2>
          <dl class="product-detail-spec-list">
            ${safeInfoRows.map((row) => `<div><dt>${row[0]}</dt><dd>${row[1]}</dd></div>`).join("")}
          </dl>
        `,
      },
      {
        key: "features",
        label: detailCopy.featuresTab,
        content: `
          <h2>${detailCopy.featuresTitle}</h2>
          <ul class="product-detail-feature-list">
            ${(outcomes.length ? outcomes : [
              summary,
              detailCopy.fallbackFeatureOne,
              detailCopy.fallbackFeatureTwo,
            ]).map((entry) => `<li>${entry}</li>`).join("")}
          </ul>
        `,
      },
      {
        key: "reviews",
        label: detailCopy.reviewsTab,
        content: `
          <h2>${detailCopy.reviewsTitle}</h2>
          <p>${locale === "vi"
            ? `${reviewCount} đánh giá từ giáo viên, phụ huynh và đội triển khai. Điểm trung bình ${reviewScore}/5 cho độ dễ tích hợp và khả năng demo trên lớp.`
            : `${reviewCount} reviews from teachers, parents, and deployment teams. Average score ${reviewScore}/5 for integration quality and classroom demonstration.`}</p>
          <blockquote class="product-detail-review-quote">
            <p>${getText(item.highlightQuote, "textVi", "textEn")}</p>
            <footer>${getText(item.highlightQuote, "authorVi", "authorEn")}</footer>
          </blockquote>
        `,
      },
    ];

    updateMeta(`${title} | STEMORA`, summary);

    root.innerHTML = `
      <section class="product-detail-page js-detail-stage">
        <div class="container product-detail-shell">
          <nav class="product-detail-breadcrumb" aria-label="Breadcrumb">
            <a href="${getLocalePath("welcome")}" data-transition>${locale === "vi" ? "Trang chủ" : "Home"}</a>
            <span>›</span>
            <a href="${getLocalePath("products")}" data-transition>${locale === "vi" ? "Sản phẩm" : "Products"}</a>
            <span>›</span>
            <strong>${title}</strong>
          </nav>

          <div class="product-detail-layout">
            <section class="product-detail-gallery-card js-detail-gallery-card" data-stage="hero">
              <div class="product-detail-main-media js-detail-main-media">
                ${renderMedia(dedupedGallery[0] || item.hero || item.cover, "", { priority: true, stage: "hero" })}
              </div>
              <div class="product-detail-thumb-row js-detail-thumb-shell">
                <button class="product-detail-thumb-nav js-detail-thumb-prev" type="button" aria-label="${locale === "vi" ? "Xem thumbnail trước" : "Previous thumbnails"}">‹</button>
                <div class="product-detail-thumbs js-detail-thumbs">
                  ${dedupedGallery.map((mediaItem, index) => `
                    <button class="product-detail-thumb${index === 0 ? " is-active" : ""}" type="button" data-idx="${index}">
                      ${renderMedia(mediaItem, "", { tier: index < 2 ? "near" : "deferred", fit: "contain" })}
                    </button>
                  `).join("")}
                </div>
                <button class="product-detail-thumb-nav js-detail-thumb-next" type="button" aria-label="${locale === "vi" ? "Xem thumbnail tiếp theo" : "Next thumbnails"}">›</button>
              </div>
            </section>

            <section class="product-detail-buy-card js-detail-buy-card" data-stage="copy">
              <h1 class="product-detail-title">${title}</h1>
              <div class="product-detail-rating">
                  <div class="product-detail-stars">${safeStars}</div>
                <span>(${reviewCount} ${locale === "vi" ? "đánh giá" : "reviews"})</span>
              </div>
              <div class="product-detail-price-panel">
                <p class="product-detail-price">${priceLabel}</p>
              </div>
              <p class="product-detail-summary" style="--product-summary-lines:${summaryConfig.lines};">${escapeHtmlText(detailSummary || summary)}</p>
              <div class="product-detail-purchase-row">
                <div class="product-detail-qty-block">
                  <span>${locale === "vi" ? "Số lượng:" : "Quantity:"}</span>
                  <div class="product-detail-qty-control">
                    <button class="js-detail-qty-minus" type="button">−</button>
                    <span class="js-detail-qty-value">1</span>
                    <button class="js-detail-qty-plus" type="button">+</button>
                  </div>
                </div>
                <p class="product-detail-stock">${safeStockNote}</p>
              </div>
              <div class="product-detail-cta-row product-detail-cta-row--pinned">
                <button class="product-detail-cart-btn" type="button">${locale === "vi" ? "THÊM VÀO GIỎ HÀNG" : "ADD TO CART"}</button>
                <a class="product-detail-buy-btn" href="${getLocalePath("contact")}" data-transition>${locale === "vi" ? "MUA NGAY" : "BUY NOW"}</a>
              </div>
            </section>

            <aside class="product-detail-sidebar">
              <section class="product-detail-side-card">
                <h2>${locale === "vi" ? "DANH MỤC SẢN PHẨM" : "PRODUCT CATEGORIES"}</h2>
                <div class="product-detail-category-list">
                  <a class="${!currentCategory ? "is-active" : ""}" href="${getCategoryFilterHref("")}" data-transition>
                    ${getCategoryIconMarkup(locale === "vi" ? "Tất cả sản phẩm" : "All products", 4)}
                  </a>
                  ${categories.map((category, index) => `
                    <a class="${category === currentCategory ? "is-active" : ""}" href="${getCategoryFilterHref(category)}" data-transition>
                      ${getCategoryIconMarkup(category, index)}
                    </a>
                  `).join("")}
                </div>
              </section>

              <section class="product-detail-side-card">
                <h2>${locale === "vi" ? "SẢN PHẨM GỢI Ý" : "SUGGESTED PRODUCTS"}</h2>
                <div class="product-detail-suggest-list">
                  ${related.map((entry, index) => `
                    <a class="product-detail-suggest-item" href="${getLocalePath("product-detail", entry.slug)}" data-transition>
                      <div class="product-detail-suggest-thumb">${renderMedia(entry.cover, "", { tier: index < 2 ? "near" : "deferred", fit: "cover" })}</div>
                      <div>
                        <strong>${getText(entry, "titleVi", "titleEn")}</strong>
                        <span>${locale === "vi" ? normalizeText(entry.priceVi) : normalizeText(entry.priceEn)}</span>
                      </div>
                    </a>
                  `).join("")}
                </div>
              </section>

              <section class="product-detail-side-card">
                <h2>${locale === "vi" ? "KHÁC" : "MORE"}</h2>
                <div class="product-detail-link-list">
                  <a href="${getLocalePath("policy")}" data-transition>${locale === "vi" ? "Hướng dẫn mua hàng" : "Buying guide"}</a>
                  <a href="${getLocalePath("policy")}" data-transition>${locale === "vi" ? "Hướng dẫn thanh toán" : "Payment guide"}</a>
                  <a href="${getLocalePath("contact")}" data-transition>${locale === "vi" ? "Kiểm tra đơn hàng" : "Check order"}</a>
                </div>
              </section>
            </aside>

            <section class="product-detail-tabs-shell">
              <div class="product-detail-tabs-nav" role="tablist" aria-label="${locale === "vi" ? "Thông tin sản phẩm" : "Product information"}">
                ${cleanTabItems.map((tab, index) => `
                  <button
                    class="product-detail-tab-btn${index === 0 ? " is-active" : ""} js-product-detail-tab"
                    type="button"
                    role="tab"
                    aria-selected="${index === 0 ? "true" : "false"}"
                    data-tab="${tab.key}"
                  >${tab.label}</button>
                `).join("")}
              </div>
              <div class="product-detail-tabs-panels">
                ${cleanTabItems.map((tab, index) => `
                  <article class="product-detail-tab-panel${index === 0 ? " is-active" : ""}" data-panel="${tab.key}" role="tabpanel">
                    ${tab.content}
                  </article>
                `).join("")}
              </div>
            </section>
          </div>
        </div>
      </section>
    `;

    const mainMedia = $(".js-detail-main-media", root);
    const galleryCard = $(".js-detail-gallery-card", root);
    const buyCard = $(".js-detail-buy-card", root);
    const thumbShell = $(".js-detail-thumb-shell", root);
    const thumbWrap = $(".js-detail-thumbs", root);
    const prevButton = $(".js-detail-thumb-prev", root);
    const nextButton = $(".js-detail-thumb-next", root);
    let activeGalleryIndex = 0;

    const syncGalleryCardHeight = () => {
      if (!galleryCard || !buyCard) return;
      if (window.innerWidth < 981) {
        buyCard.style.height = "";
        buyCard.style.minHeight = "";
        return;
      }
      const galleryHeight = galleryCard.offsetHeight || galleryCard.getBoundingClientRect().height;
      buyCard.style.minHeight = "";
      buyCard.style.height = `${Math.round(galleryHeight)}px`;
    };

    const scheduleGalleryCardHeightSync = () => {
      requestAnimationFrame(() => {
        syncGalleryCardHeight();
        requestAnimationFrame(syncGalleryCardHeight);
      });
    };

    const syncThumbRailNav = () => {
      if (!thumbWrap || !thumbShell || !prevButton || !nextButton) return;
      const maxScrollLeft = Math.max(0, thumbWrap.scrollWidth - thumbWrap.clientWidth - 1);
      const hasOverflow = maxScrollLeft > 2;
      thumbShell.classList.toggle("has-overflow", hasOverflow);
      prevButton.hidden = !hasOverflow || thumbWrap.scrollLeft <= 2;
      nextButton.hidden = !hasOverflow || thumbWrap.scrollLeft >= maxScrollLeft - 2;
    };

    const renderActiveGallery = (shouldReveal = true) => {
      if (!mainMedia || !dedupedGallery[activeGalleryIndex]) return;
      mainMedia.innerHTML = renderMedia(dedupedGallery[activeGalleryIndex], "", { priority: true, stage: shouldReveal ? "hero" : "", fit: "contain" });
      hydrateDynamicMedia(mainMedia);
      $$(".product-detail-thumb", thumbWrap).forEach((thumbButton, thumbIndex) => {
        thumbButton.classList.toggle("is-active", thumbIndex === activeGalleryIndex);
      });
      scheduleGalleryCardHeightSync();
      syncThumbRailNav();
    };

    if (thumbWrap) {
      thumbWrap.addEventListener("click", (event) => {
        const thumbButton = event.target.closest(".product-detail-thumb");
        if (!thumbButton) return;
        activeGalleryIndex = Number(thumbButton.dataset.idx || 0);
        renderActiveGallery();
        thumbButton.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      });
      thumbWrap.addEventListener("scroll", () => {
        requestAnimationFrame(syncThumbRailNav);
      }, { passive: true });
    }

    if (prevButton) {
      prevButton.addEventListener("click", () => {
        if (!thumbWrap) return;
        thumbWrap.scrollBy({ left: -Math.max(thumbWrap.clientWidth * 0.8, 96), behavior: "smooth" });
      });
    }
    if (nextButton) {
      nextButton.addEventListener("click", () => {
        if (!thumbWrap) return;
        thumbWrap.scrollBy({ left: Math.max(thumbWrap.clientWidth * 0.8, 96), behavior: "smooth" });
      });
    }

    const qtyValue = $(".js-detail-qty-value", root);
    const qtyMinus = $(".js-detail-qty-minus", root);
    const qtyPlus = $(".js-detail-qty-plus", root);
    if (qtyMinus && qtyValue) {
      qtyMinus.addEventListener("click", () => {
        const current = Number(qtyValue.textContent || 1);
        qtyValue.textContent = String(Math.max(1, current - 1));
      });
    }
    if (qtyPlus && qtyValue) {
      qtyPlus.addEventListener("click", () => {
        const current = Number(qtyValue.textContent || 1);
        qtyValue.textContent = String(stockCount > 0 ? Math.min(stockCount, current + 1) : current + 1);
      });
    }

    $$(".js-product-detail-tab", root).forEach((tabButton) => {
      tabButton.addEventListener("click", () => {
        const targetKey = tabButton.dataset.tab;
        $$(".js-product-detail-tab", root).forEach((button) => {
          const isCurrent = button === tabButton;
          button.classList.toggle("is-active", isCurrent);
          button.setAttribute("aria-selected", isCurrent ? "true" : "false");
        });
        $$(".product-detail-tab-panel", root).forEach((panel) => {
          panel.classList.toggle("is-active", panel.dataset.panel === targetKey);
        });
      });
    });

    window.addEventListener("resize", () => {
      requestAnimationFrame(() => {
        syncGalleryCardHeight();
        syncThumbRailNav();
      });
    }, { passive: true });

    if (galleryCard && "ResizeObserver" in window) {
      const galleryCardResizeObserver = new ResizeObserver(() => {
        syncGalleryCardHeight();
      });
      galleryCardResizeObserver.observe(galleryCard);
    }

    hydrateDynamicMedia(root);
    renderActiveGallery(false);
    setTimeout(() => {
      syncGalleryCardHeight();
      syncThumbRailNav();
    }, 120);
  }


  function renderProductDetailPage() {
    const root = $(".js-page-root");
    if (!root) return;
    const item = data.products.find((entry) => entry.slug === slugFromPath());
    if (!item) return renderMissing(root, getLocalePath("products"));
    updateMeta(`${getText(item, "titleVi", "titleEn")} | STEMORA`, getText(item, "summaryVi", "summaryEn"));

    const related = getRelatedProducts(item).slice(0, 4);
    const detailGallery = [...(Array.isArray(item.gallery) ? item.gallery : []), item.hero, item.cover].filter(Boolean);
    const dedupedGallery = [];
    const seenGallery = new Set();
    detailGallery.forEach((mediaItem) => {
      const key = typeof mediaItem === "string" ? mediaItem : mediaItem.src;
      if (!key || seenGallery.has(key)) return;
      seenGallery.add(key);
      dedupedGallery.push(mediaItem);
    });
    if (!dedupedGallery.length && item.hero) dedupedGallery.push(item.hero);

    const title = getText(item, "titleVi", "titleEn");
    const tagline = getText(item, "taglineVi", "taglineEn");
    const summary = getText(item, "summaryVi", "summaryEn") || tagline;
    const summaryConfig = getProductCardSummaryConfig(title);
    const detailSummary = truncateText(summary, summaryConfig.maxLength);
    const description = getText(item, "descriptionVi", "descriptionEn") || summary;
    const priceLabel = locale === "vi" ? item.priceVi : item.priceEn;
    const reviewScore = 4 + ((item.featuredOrder || 0) % 2);
    const reviewCount = 12 + ((item.featuredOrder || 0) % 7) * 2;
    const stockCount = Number(item.stock || 0);
    const stockNote = locale === "vi"
      ? (stockCount > 0 ? `Chỉ còn ${stockCount} sản phẩm` : "Liên hệ để kiểm tra tồn kho")
      : (stockCount > 0 ? `Only ${stockCount} items left` : "Contact us for stock status");
    const stars = Array.from({ length: 5 }, (_, index) => `<span class="product-detail-stars__star${index < reviewScore ? " is-on" : ""}">${index < reviewScore ? "★" : "☆"}</span>`).join("");
    const infoRows = [
      [locale === "vi" ? "Danh mục" : "Category", (item.facts && item.facts[0] ? getText(item.facts[0], "valueVi", "valueEn") : tagline)],
      [locale === "vi" ? "Tình trạng" : "Stock", locale === "vi" ? (item.availabilityVi || "Còn hàng") : (item.availabilityEn || "In stock")],
      [locale === "vi" ? "Giá" : "Price", priceLabel],
      [getGroupLabel("age"), item.age.map((value) => getTaxonomyLabel("age", value)).join(", ")],
      [getGroupLabel("theme"), item.theme.map((value) => getTaxonomyLabel("theme", value)).join(", ")],
      [getGroupLabel("format"), item.format.map((value) => getTaxonomyLabel("format", value)).join(", ")],
      [getGroupLabel("difficulty"), item.difficulty.map((value) => getTaxonomyLabel("difficulty", value)).join(", ")],
    ];
    const categories = Array.from(
      new Set(
        data.products
          .map((product) => product.facts && product.facts[0] ? getText(product.facts[0], "valueVi", "valueEn") : "")
          .filter(Boolean)
      )
    );
    const tabItems = [
      {
        key: "description",
        label: locale === "vi" ? "Mô tả chi tiết" : "Description",
        content: `
          <h2>${locale === "vi" ? "Mô tả sản phẩm" : "Product description"}</h2>
          ${descriptionMarkup}
          ${Array.isArray(item.detailSections) && item.detailSections.length
            ? item.detailSections.map((section) => `
              <article class="product-detail-tab-section">
                <h3>${getText(section, "headingVi", "headingEn")}</h3>
                <div class="product-detail-rich-copy">${renderRichTextBlocks(getText(section, "bodyVi", "bodyEn"))}</div>
              </article>
            `).join("")
            : ""}
        `,
      },
      {
        key: "specs",
        label: locale === "vi" ? "Thông số kỹ thuật" : "Specifications",
        content: `
          <h2>${locale === "vi" ? "Thông số kỹ thuật" : "Specifications"}</h2>
          <dl class="product-detail-spec-list">
            ${infoRows.map((row) => `<div><dt>${row[0]}</dt><dd>${row[1]}</dd></div>`).join("")}
          </dl>
        `,
      },
      {
        key: "features",
        label: locale === "vi" ? "Tính năng" : "Features",
        content: `
          <h2>${locale === "vi" ? "Tính năng nổi bật" : "Key features"}</h2>
          <ul class="product-detail-feature-list">
            ${(locale === "vi" ? item.outcomesVi : item.outcomesEn).length
              ? (locale === "vi" ? item.outcomesVi : item.outcomesEn).map((entry) => `<li>${entry}</li>`).join("")
              : `
                <li>${summary}</li>
                <li>${locale === "vi" ? "Dễ tích hợp vào workshop, lớp học và dự án maker." : "Easy to integrate into workshops, classrooms, and maker builds."}</li>
                <li>${locale === "vi" ? "Phù hợp để demo cơ cấu, thuật toán và tư duy kỹ thuật." : "Useful for demonstrating mechanisms, algorithms, and engineering thinking."}</li>
              `}
          </ul>
        `,
      },
      {
        key: "reviews",
        label: locale === "vi" ? "Đánh giá & Bình luận" : "Reviews & Comments",
        content: `
          <h2>${locale === "vi" ? "Đánh giá & Bình luận" : "Reviews & Comments"}</h2>
          <p>${locale === "vi"
            ? `${reviewCount} đánh giá từ giáo viên, phụ huynh và đội triển khai. Điểm trung bình ${reviewScore}/5 cho độ dễ tích hợp và khả năng demo trên lớp.`
            : `${reviewCount} reviews from teachers, parents, and deployment teams. Average score ${reviewScore}/5 for integration quality and classroom demonstration.`}</p>
          <blockquote class="product-detail-review-quote">
            <p>${getText(item.highlightQuote, "textVi", "textEn")}</p>
            <footer>${getText(item.highlightQuote, "authorVi", "authorEn")}</footer>
          </blockquote>
        `,
      },
    ];

    root.innerHTML = `
      <section class="product-detail-page js-detail-stage">
        <div class="container product-detail-shell">
          <nav class="product-detail-breadcrumb" aria-label="Breadcrumb">
            <a href="${getLocalePath("welcome")}" data-transition>${locale === "vi" ? "Trang chủ" : "Home"}</a>
            <span>›</span>
            <a href="${getLocalePath("products")}" data-transition>${locale === "vi" ? "Sản phẩm" : "Products"}</a>
            <span>›</span>
            <strong>${title}</strong>
          </nav>

          <div class="product-detail-layout">
            <section class="product-detail-gallery-card" data-stage="hero">
              <div class="product-detail-main-media js-detail-main-media">
                ${renderMedia(dedupedGallery[0] || item.hero || item.cover, "", { priority: true, stage: "hero" })}
              </div>
              <div class="product-detail-thumb-row">
                <button class="product-detail-thumb-nav js-detail-thumb-prev" type="button" aria-label="${locale === "vi" ? "Ảnh trước" : "Previous image"}">‹</button>
                <div class="product-detail-thumbs js-detail-thumbs">
                  ${dedupedGallery.map((mediaItem, index) => `
                    <button class="product-detail-thumb${index === 0 ? " is-active" : ""}" type="button" data-idx="${index}">
                      ${renderMedia(mediaItem, "", { tier: index < 2 ? "near" : "deferred" })}
                    </button>
                  `).join("")}
                </div>
                <button class="product-detail-thumb-nav js-detail-thumb-next" type="button" aria-label="${locale === "vi" ? "Ảnh sau" : "Next image"}">›</button>
              </div>
            </section>

            <section class="product-detail-buy-card" data-stage="copy">
              <h1 class="product-detail-title">${title}</h1>
              <div class="product-detail-rating">
                <div class="product-detail-stars">${stars}</div>
                <span>(${reviewCount} ${locale === "vi" ? "đánh giá" : "reviews"})</span>
              </div>
              <div class="product-detail-price-panel">
                <p class="product-detail-price">${priceLabel}</p>
              </div>
              <p class="product-detail-summary" style="--product-summary-lines:${summaryConfig.lines};">${escapeHtmlText(detailSummary || summary)}</p>
              <div class="product-detail-purchase-row">
                <div class="product-detail-qty-block">
                  <span>${locale === "vi" ? "Số lượng:" : "Quantity:"}</span>
                  <div class="product-detail-qty-control">
                    <button class="js-detail-qty-minus" type="button">−</button>
                    <span class="js-detail-qty-value">1</span>
                    <button class="js-detail-qty-plus" type="button">+</button>
                  </div>
                </div>
                <p class="product-detail-stock">${stockNote}</p>
              </div>
              <div class="product-detail-cta-row">
                <button class="product-detail-cart-btn" type="button">${locale === "vi" ? "THÊM VÀO GIỎ HÀNG" : "ADD TO CART"}</button>
                <a class="product-detail-buy-btn" href="${getLocalePath("contact")}" data-transition>${locale === "vi" ? "MUA NGAY" : "BUY NOW"}</a>
              </div>
              <div class="product-detail-share-row">
                <button class="product-detail-copy-btn js-copy-link" type="button">${locale === "vi" ? "Sao chép liên kết" : "Copy link"}</button>
                <span class="product-detail-share-feedback js-share-feedback" aria-live="polite"></span>
              </div>
            </section>

            <aside class="product-detail-sidebar">
              <section class="product-detail-side-card">
                <h2>${locale === "vi" ? "DANH MỤC SẢN PHẨM" : "PRODUCT CATEGORIES"}</h2>
                <div class="product-detail-category-list">
                  <a class="is-active" href="${getLocalePath("products")}" data-transition>${locale === "vi" ? "Tất cả sản phẩm" : "All products"}</a>
                  ${categories.map((category, index) => `<a href="${getLocalePath("products")}" data-transition>${["🤖", "💻", "🎮", "▦", "📦"][index % 5]} ${category}</a>`).join("")}
                </div>
              </section>

              <section class="product-detail-side-card">
                <h2>${locale === "vi" ? "SẢN PHẨM GỢI Ý" : "SUGGESTED PRODUCTS"}</h2>
                <div class="product-detail-suggest-list">
                  ${related.map((entry, index) => `
                    <a class="product-detail-suggest-item" href="${getLocalePath("product-detail", entry.slug)}" data-transition>
                      <div class="product-detail-suggest-thumb">${renderMedia(entry.cover, "", { tier: index < 2 ? "near" : "deferred" })}</div>
                      <div>
                        <strong>${getText(entry, "titleVi", "titleEn")}</strong>
                        <span>${locale === "vi" ? entry.priceVi : entry.priceEn}</span>
                      </div>
                    </a>
                  `).join("")}
                </div>
              </section>

              <section class="product-detail-side-card">
                <h2>${locale === "vi" ? "KHÁC" : "MORE"}</h2>
                <div class="product-detail-link-list">
                  <a href="${getLocalePath("policy")}" data-transition>${locale === "vi" ? "Hướng dẫn mua hàng" : "Buying guide"}</a>
                  <a href="${getLocalePath("policy")}" data-transition>${locale === "vi" ? "Hướng dẫn thanh toán" : "Payment guide"}</a>
                  <a href="${getLocalePath("contact")}" data-transition>${locale === "vi" ? "Kiểm tra đơn hàng" : "Check order"}</a>
                </div>
              </section>
            </aside>

            <section class="product-detail-tabs-shell">
              <div class="product-detail-tabs-nav" role="tablist" aria-label="${locale === "vi" ? "Thông tin sản phẩm" : "Product information"}">
                ${tabItems.map((tab, index) => `
                  <button
                    class="product-detail-tab-btn${index === 0 ? " is-active" : ""} js-product-detail-tab"
                    type="button"
                    role="tab"
                    aria-selected="${index === 0 ? "true" : "false"}"
                    data-tab="${tab.key}"
                  >${tab.label}</button>
                `).join("")}
              </div>
              <div class="product-detail-tabs-panels">
                ${tabItems.map((tab, index) => `
                  <article class="product-detail-tab-panel${index === 0 ? " is-active" : ""}" data-panel="${tab.key}" role="tabpanel">
                    ${tab.content}
                  </article>
                `).join("")}
              </div>
            </section>
          </div>
        </div>
      </section>
    `;

    const mainMedia = $(".js-detail-main-media", root);
    const thumbWrap = $(".js-detail-thumbs", root);
    let activeGalleryIndex = 0;

    const renderActiveGallery = () => {
      if (!mainMedia || !dedupedGallery[activeGalleryIndex]) return;
      mainMedia.innerHTML = renderMedia(dedupedGallery[activeGalleryIndex], "", { priority: true, stage: "hero" });
      hydrateDynamicMedia(mainMedia);
      $$(".product-detail-thumb", thumbWrap).forEach((thumbButton, thumbIndex) => {
        thumbButton.classList.toggle("is-active", thumbIndex === activeGalleryIndex);
      });
    };

    if (thumbWrap) {
      thumbWrap.addEventListener("click", (event) => {
        const thumbButton = event.target.closest(".product-detail-thumb");
        if (!thumbButton) return;
        activeGalleryIndex = Number(thumbButton.dataset.idx || 0);
        renderActiveGallery();
      });
    }

    const prevButton = $(".js-detail-thumb-prev", root);
    const nextButton = $(".js-detail-thumb-next", root);
    if (prevButton) {
      prevButton.addEventListener("click", () => {
        activeGalleryIndex = (activeGalleryIndex - 1 + dedupedGallery.length) % dedupedGallery.length;
        renderActiveGallery();
      });
    }
    if (nextButton) {
      nextButton.addEventListener("click", () => {
        activeGalleryIndex = (activeGalleryIndex + 1) % dedupedGallery.length;
        renderActiveGallery();
      });
    }

    const qtyValue = $(".js-detail-qty-value", root);
    const qtyMinus = $(".js-detail-qty-minus", root);
    const qtyPlus = $(".js-detail-qty-plus", root);
    if (qtyMinus && qtyValue) {
      qtyMinus.addEventListener("click", () => {
        const current = Number(qtyValue.textContent || 1);
        qtyValue.textContent = String(Math.max(1, current - 1));
      });
    }
    if (qtyPlus && qtyValue) {
      qtyPlus.addEventListener("click", () => {
        const current = Number(qtyValue.textContent || 1);
        qtyValue.textContent = String(stockCount > 0 ? Math.min(stockCount, current + 1) : current + 1);
      });
    }

    $$(".js-product-detail-tab", root).forEach((tabButton) => {
      tabButton.addEventListener("click", () => {
        const targetKey = tabButton.dataset.tab;
        $$(".js-product-detail-tab", root).forEach((button) => {
          const isCurrent = button === tabButton;
          button.classList.toggle("is-active", isCurrent);
          button.setAttribute("aria-selected", isCurrent ? "true" : "false");
        });
        $$(".product-detail-tab-panel", root).forEach((panel) => {
          panel.classList.toggle("is-active", panel.dataset.panel === targetKey);
        });
      });
    });

    initCopyLink(root, strings.productDetail.copyLinkSuccess);
    hydrateDynamicMedia(root);
  }

  function getRelatedProducts(currentItem) {
    return sortedProducts()
      .filter((entry) => entry.slug !== currentItem.slug)
      .sort((a, b) => {
        const left = overlaps(currentItem.theme, a.theme) * 3 + overlaps(currentItem.format, a.format) * 2 + overlaps(currentItem.age, a.age);
        const right = overlaps(currentItem.theme, b.theme) * 3 + overlaps(currentItem.format, b.format) * 2 + overlaps(currentItem.age, b.age);
        return right - left || a.featuredOrder - b.featuredOrder;
      });
  }

  function renderArchiveMetaRow(entries) {
    const cleanEntries = (entries || []).map((entry) => normalizeText(entry || "")).filter(Boolean);
    if (!cleanEntries.length) return "";
    return `<div class="archive-entry__meta">${cleanEntries.map((entry) => `<span>${escapeHtmlText(entry)}</span>`).join("")}</div>`;
  }

  function renderArchiveHeroShell(eyebrow, title, intro, mediaItem) {
    return `
      <section class="page-intro page-intro--archive">
        <div class="container page-intro__layout">
          <div class="page-intro__copy" data-stage="copy">
            <p class="scene-kicker">${escapeHtmlText(eyebrow)}</p>
            <h1 class="editorial-title">${escapeHtmlText(title)}</h1>
            <p class="scene-body">${escapeHtmlText(intro)}</p>
          </div>
          <div class="page-intro__visual" data-stage="hero">
            ${renderMedia(mediaItem || data.siteMeta.pageAssets.projects, "", { priority: true, stage: "hero" })}
          </div>
        </div>
      </section>
    `;
  }

  function renderCollectionEntries(items, detailKey, emptyMessage) {
    if (!items.length) {
      return `
        <section class="archive-stream">
          <div class="container">
            <article class="contact-panel editorial-empty-card">
              <p>${escapeHtmlText(emptyMessage)}</p>
            </article>
          </div>
        </section>
      `;
    }

    return `
      <section class="archive-stream">
        <div class="container archive-stream__list">
          ${items.map((item, index) => {
            const isMediaLeft = index % 2 === 0;
            const title = getText(item, "titleVi", "titleEn");
            const summary = getText(item, "summaryVi", "summaryEn");
            const metaMarkup = renderArchiveMetaRow([
              item.season || formatArchiveDate(item.publishedAt),
              getText(item, "categoryVi", "categoryEn") || item.type,
              item.durationLabel,
              getText(item, "authorVi", "authorEn"),
            ]);
            const mediaMarkup = `
              <a class="archive-entry__media" href="${getLocalePath(detailKey, item.slug)}" data-transition>
                ${renderMedia(item.cover, "", { tier: index < 2 ? "near" : "deferred", loading: index === 0 ? "eager" : "lazy" })}
              </a>
            `;
            const copyMarkup = `
              <div class="archive-entry__copy">
                ${metaMarkup}
                <h2><a href="${getLocalePath(detailKey, item.slug)}" data-transition>${escapeHtmlText(title)}</a></h2>
                ${summary ? `<p class="archive-entry__tagline">${escapeHtmlText(summary)}</p>` : ""}
                <a class="archive-entry__link" href="${getLocalePath(detailKey, item.slug)}" data-transition>${strings.actions.viewDetail}</a>
              </div>
            `;
            return `
              <article class="archive-entry archive-entry--${isMediaLeft ? "media-left" : "media-right"}" data-motion="scene-enter">
                ${isMediaLeft ? `${mediaMarkup}${copyMarkup}` : `${copyMarkup}${mediaMarkup}`}
              </article>
            `;
          }).join("")}
        </div>
      </section>
    `;
  }

  function renderArticleDetailPage(items, options) {
    const root = $(".js-page-root");
    if (!root) return;
    const config = options || {};
    const item = items.find((entry) => entry.slug === slugFromPath() || entry.sourceSlug === slugFromPath());
    if (!item) return renderMissing(root, getLocalePath(config.archiveKey || "welcome"));

    const title = getText(item, "titleVi", "titleEn");
    const summary = getText(item, "summaryVi", "summaryEn");
    const related = items.filter((entry) => entry.slug !== item.slug).slice(0, 3);

    updateMeta(`${title} | STEMORA`, summary);
    root.innerHTML = `
      <section class="editorial-article-page js-detail-stage">
        <div class="container editorial-article-shell">
          <nav class="product-detail-breadcrumb" aria-label="Breadcrumb">
            <a href="${getLocalePath("welcome")}" data-transition>${locale === "vi" ? "Trang chủ" : "Home"}</a>
            <span>›</span>
            <a href="${getLocalePath(config.archiveKey || "projects")}" data-transition>${escapeHtmlText(config.archiveLabel || "")}</a>
            <span>›</span>
            <strong>${escapeHtmlText(title)}</strong>
          </nav>

          <div class="detail-hero__project editorial-article-hero">
            <div class="detail-hero__project-media" data-stage="hero">
              ${renderMedia(item.hero || item.cover, "", { priority: true, stage: "hero" })}
            </div>
            <div class="detail-hero__project-copy" data-stage="copy">
              <p class="scene-kicker">${escapeHtmlText(config.detailEyebrow || config.archiveLabel || "")}</p>
              <h1>${escapeHtmlText(title)}</h1>
              ${summary ? `<p class="detail-hero__summary">${escapeHtmlText(summary)}</p>` : ""}
              ${renderArchiveMetaRow([
                formatArchiveDate(item.publishedAt),
                getText(item, "categoryVi", "categoryEn") || item.type,
                item.durationLabel,
                getText(item, "authorVi", "authorEn"),
              ])}
              ${Array.isArray(item.tags) && item.tags.length ? `
                <div class="editorial-tag-list">
                  ${item.tags.slice(0, 10).map((tag) => `<span class="editorial-tag">${escapeHtmlText(tag)}</span>`).join("")}
                </div>
              ` : ""}
            </div>
          </div>
        </div>
      </section>

      <section class="project-sections editorial-article-section">
        <div class="container">
          <article class="contact-panel editorial-article-body" data-motion="scene-enter">
            ${item.contentHtml || `<p>${escapeHtmlText(summary)}</p>`}
          </article>
        </div>
      </section>

      ${related.length ? `
        <section class="related-block">
          <div class="container">
            <div class="related-block__header">
              <p class="scene-kicker">${escapeHtmlText(config.relatedEyebrow || "")}</p>
              <h2>${escapeHtmlText(config.relatedTitle || "")}</h2>
            </div>
            <div class="related-grid">
              ${related.map((entry) => `
                <article class="related-card" data-motion="scene-enter">
                  <a href="${getLocalePath(config.detailKey, entry.slug)}" data-transition>
                    ${renderMedia(entry.cover, "", { tier: "deferred" })}
                  </a>
                  <h3><a href="${getLocalePath(config.detailKey, entry.slug)}" data-transition>${escapeHtmlText(getText(entry, "titleVi", "titleEn"))}</a></h3>
                  <p>${escapeHtmlText(getText(entry, "summaryVi", "summaryEn"))}</p>
                </article>
              `).join("")}
            </div>
          </div>
        </section>
      ` : ""}
    `;

    hydrateDynamicMedia(root);
    refreshInteractiveLayers(root);
    initProjectArchiveScrollMemory(root);
  }

  function renderArchiveShowcaseEmptyState(eyebrow, title, copy) {
    return `
      <section class="page-intro archive-showcase-empty">
        <div class="container">
          <div class="empty-state-editorial" data-motion="scene-enter">
            <p class="scene-kicker">${escapeHtmlText(eyebrow)}</p>
            <h2>${escapeHtmlText(title)}</h2>
            <p>${escapeHtmlText(copy)}</p>
          </div>
        </div>
      </section>
    `;
  }

  function renderProjectSpotlightCard(item, index, total) {
    const title = getText(item, "titleVi", "titleEn");
    const summary = truncateText(getText(item, "summaryVi", "summaryEn"), 220);
    const tags = (Array.isArray(item.tags) ? item.tags : []).slice(0, 4);
    return `
      <div class="projects-spotlight__media">
        ${renderMedia(item.cover || item.hero, "", { priority: true, stage: "hero" })}
      </div>
      <div class="projects-spotlight__body">
        <div class="projects-spotlight__count">
          <strong>${String(index + 1).padStart(2, "0")}</strong>
          <span>/ ${String(total).padStart(2, "0")}</span>
        </div>
        ${renderArchiveMetaRow([
          item.season || formatArchiveDate(item.publishedAt),
          getText(item, "typeVi", "typeEn") || item.type,
          item.durationLabel,
        ])}
        <h2>${escapeHtmlText(title)}</h2>
        ${summary ? `<p>${escapeHtmlText(summary)}</p>` : ""}
        ${tags.length ? `
          <div class="projects-spotlight__tags">
            ${tags.map((tag) => `<span>${escapeHtmlText(tag)}</span>`).join("")}
          </div>
        ` : ""}
        <div class="projects-spotlight__actions">
          <div class="projects-spotlight__navs">
            <button class="projects-spotlight__nav js-project-spotlight-nav" type="button" data-dir="-1" aria-label="${locale === "vi" ? "D\u1ef1 \u00e1n tr\u01b0\u1edbc" : "Previous project"}">&#8249;</button>
            <button class="projects-spotlight__nav js-project-spotlight-nav" type="button" data-dir="1" aria-label="${locale === "vi" ? "D\u1ef1 \u00e1n ti\u1ebfp theo" : "Next project"}">&#8250;</button>
          </div>
          <a class="projects-spotlight__link" href="${getLocalePath("project-detail", item.slug)}" data-transition>${strings.actions.viewDetail}</a>
        </div>
      </div>
    `;
  }

  function initProjectsVoyage(root, items) {
    const spotlight = $(".js-project-spotlight", root);
    const steps = $$(".js-project-step", root);
    const thumbs = $$(".js-project-thumb", root);
    if (!spotlight || !steps.length || !items.length) return;

    let activeIndex = 0;
    let observer = null;

    const bindSpotlightNav = () => {
      const previousLabel = locale === "vi" ? "D\u1ef1 \u00e1n tr\u01b0\u1edbc" : "Previous project";
      const nextLabel = locale === "vi" ? "D\u1ef1 \u00e1n ti\u1ebfp theo" : "Next project";
      $$(".js-project-spotlight-nav", spotlight).forEach((button) => {
        const direction = Number(button.dataset.dir || 0);
        button.innerHTML = direction < 0 ? "&#8249;" : "&#8250;";
        button.setAttribute("aria-label", direction < 0 ? previousLabel : nextLabel);
        button.addEventListener("click", () => {
          const nextIndex = (activeIndex + direction + items.length) % items.length;
          activate(nextIndex, { scrollIntoView: true });
        });
      });
    };

    const activate = (nextIndex, options) => {
      const config = options || {};
      if (!items[nextIndex] || (nextIndex === activeIndex && !config.force)) return;
      activeIndex = nextIndex;
      spotlight.innerHTML = renderProjectSpotlightCard(items[activeIndex], activeIndex, items.length);
      steps.forEach((step, stepIndex) => {
        step.classList.toggle("is-active", stepIndex === activeIndex);
      });
      thumbs.forEach((thumb, thumbIndex) => {
        thumb.classList.toggle("is-active", thumbIndex === activeIndex);
      });
      hydrateDynamicMedia(spotlight);
      bindSpotlightNav();
      if (config.scrollIntoView && steps[activeIndex]) {
        steps[activeIndex].scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
      }
    };

    steps.forEach((step) => {
      const stepIndex = Number(step.dataset.projectIndex || 0);
      step.addEventListener("mouseenter", () => activate(stepIndex));
      step.addEventListener("focus", () => activate(stepIndex));
      step.addEventListener("click", () => activate(stepIndex));
    });

    thumbs.forEach((thumb) => {
      const thumbIndex = Number(thumb.dataset.projectIndex || 0);
      thumb.addEventListener("click", () => activate(thumbIndex, { scrollIntoView: true }));
    });

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver((entries) => {
        const current = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        if (!current) return;
        activate(Number(current.target.dataset.projectIndex || 0));
      }, {
        threshold: [0.35, 0.55, 0.75],
        rootMargin: "-15% 0px -35% 0px",
      });
      steps.forEach((step) => observer.observe(step));
    }

    if (observer) registerPageCleanup(root, () => observer.disconnect());
    activate(0, { force: true });
  }

  function buildTutorialTracks(items) {
    const groups = new Map();
    items.forEach((item) => {
      const name = getText(item, "categoryVi", "categoryEn") || (locale === "vi" ? "Studio tuy\u1ec3n ch\u1ecdn" : "Studio picks");
      if (!groups.has(name)) {
        groups.set(name, {
          id: slugifyArchiveValue(name),
          name,
          items: [],
          views: 0,
          likes: 0,
        });
      }
      const group = groups.get(name);
      group.items.push(item);
      group.views += Number(item.views || 0);
      group.likes += Number(item.likes || 0);
    });
    return [...groups.values()].sort((left, right) => right.items.length - left.items.length);
  }

  function renderTutorialTrackCard(item, index) {
    const title = getText(item, "titleVi", "titleEn");
    const summary = truncateText(getText(item, "summaryVi", "summaryEn"), 96);
    return `
      <article class="tutorial-track-card" data-motion="scene-enter">
        <a class="tutorial-track-card__media" href="${getLocalePath("tutorial-detail", item.slug)}" data-transition>
          ${renderMedia(item.cover, "", { tier: index < 4 ? "near" : "deferred" })}
        </a>
        <div class="tutorial-track-card__body">
          <h3><a href="${getLocalePath("tutorial-detail", item.slug)}" data-transition>${escapeHtmlText(title)}</a></h3>
          ${summary ? `<p>${escapeHtmlText(summary)}</p>` : ""}
        </div>
      </article>
    `;
  }

  function initTutorialTracks(root) {
    const chipButtons = $$(".js-tutorial-track-chip", root);
    const tracks = $$(".js-tutorial-track", root);
    const cleanups = [];
    let observer = null;

    const setActiveChip = (trackId) => {
      chipButtons.forEach((chip) => {
        chip.classList.toggle("is-active", chip.dataset.trackTarget === trackId);
      });
    };

    chipButtons.forEach((chip) => {
      chip.addEventListener("click", () => {
        const target = document.getElementById(chip.dataset.trackTarget || "");
        if (!target) return;
        target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
        setActiveChip(chip.dataset.trackTarget || "");
      });
    });

    tracks.forEach((track) => {
      const rail = $(".js-tutorial-track-rail", track);
      const prev = $(".js-tutorial-track-prev", track);
      const next = $(".js-tutorial-track-next", track);
      const progress = $(".js-tutorial-track-progress", track);
      if (!rail) return;

      const syncTrackState = () => {
        const maxScroll = Math.max(rail.scrollWidth - rail.clientWidth, 0);
        const ratio = maxScroll ? rail.scrollLeft / maxScroll : 1;
        if (progress) progress.style.transform = `scaleX(${Math.max(0.08, ratio)})`;
        if (prev) prev.disabled = rail.scrollLeft <= 4;
        if (next) next.disabled = rail.scrollLeft >= maxScroll - 4;
      };

      const stepAmount = () => {
        const firstCard = rail.querySelector(".tutorial-track-card");
        if (!firstCard) return Math.max(rail.clientWidth * 0.86, 280);
        const computedRailStyle = window.getComputedStyle(rail);
        const gap = parseFloat(computedRailStyle.columnGap || computedRailStyle.gap || "0");
        const cardWidth = firstCard.getBoundingClientRect().width;
        const visibleCards = Math.max(1, Math.floor((rail.clientWidth + gap) / Math.max(cardWidth + gap, 1)));
        return Math.max(cardWidth + gap, (cardWidth + gap) * Math.max(1, visibleCards - 1));
      };

      if (prev) {
        prev.addEventListener("click", () => {
          rail.scrollBy({ left: -stepAmount(), behavior: reducedMotion ? "auto" : "smooth" });
        });
      }
      if (next) {
        next.addEventListener("click", () => {
          rail.scrollBy({ left: stepAmount(), behavior: reducedMotion ? "auto" : "smooth" });
        });
      }

      rail.addEventListener("scroll", syncTrackState, { passive: true });
      window.addEventListener("resize", syncTrackState);
      cleanups.push(() => window.removeEventListener("resize", syncTrackState));
      syncTrackState();
    });

    if ("IntersectionObserver" in window && chipButtons.length) {
      observer = new IntersectionObserver((entries) => {
        const current = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        if (!current) return;
        setActiveChip(current.target.id);
      }, {
        threshold: [0.3, 0.55],
        rootMargin: "-15% 0px -55% 0px",
      });
      tracks.forEach((track) => observer.observe(track));
    }

    if (observer) cleanups.push(() => observer.disconnect());
    if (cleanups.length) {
      registerPageCleanup(root, () => {
        cleanups.forEach((cleanup) => cleanup());
      });
    }
  }

  function getTutorialCategoryLabel(item) {
    return getText(item, "categoryVi", "categoryEn") || (locale === "vi" ? "Tổng quan" : "General");
  }

  function getTutorialDifficultyKey(itemOrValue) {
    const rawValue = typeof itemOrValue === "string"
      ? itemOrValue
      : normalizeText(itemOrValue && itemOrValue.difficulty ? itemOrValue.difficulty : "");
    const normalizedValue = normalizeText(rawValue).toLowerCase();
    if (!normalizedValue) return "";
    if (normalizedValue.includes("begin")) return "beginner";
    if (normalizedValue.includes("inter")) return "intermediate";
    if (normalizedValue.includes("adv")) return "advanced";
    return normalizedValue;
  }

  function getTutorialDifficultyLabel(value) {
    const difficultyKey = getTutorialDifficultyKey(value);
    const labels = {
      beginner: locale === "vi" ? "Cơ bản" : "Beginner",
      intermediate: locale === "vi" ? "Trung cấp" : "Intermediate",
      advanced: locale === "vi" ? "Nâng cao" : "Advanced",
    };
    return labels[difficultyKey] || normalizeText(value || "");
  }

  function getTutorialDurationMinutes(item) {
    const directValue = Number(item && item.durationMinutes);
    if (Number.isFinite(directValue) && directValue > 0) return directValue;
    const matchedValue = String(item && item.durationLabel ? item.durationLabel : "").match(/\d+/);
    const parsedValue = Number(matchedValue ? matchedValue[0] : 0);
    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
  }

  function getTutorialDurationBucket(item) {
    const durationMinutes = getTutorialDurationMinutes(item);
    if (!durationMinutes) return "";
    if (durationMinutes <= 15) return "quick";
    if (durationMinutes <= 30) return "standard";
    return "extended";
  }

  function getTutorialDurationBucketLabel(bucket) {
    const labels = {
      quick: locale === "vi" ? "Dưới 15 phút" : "Under 15 min",
      standard: locale === "vi" ? "15–30 phút" : "15–30 min",
      extended: locale === "vi" ? "Trên 30 phút" : "30+ min",
    };
    return labels[bucket] || "";
  }

  function buildTutorialCatalogueFilterModel(items) {
    const categories = [...new Set(items.map((item) => getTutorialCategoryLabel(item)).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right, locale === "vi" ? "vi" : "en", { sensitivity: "base" }));
    const difficulties = [];
    const durations = [];
    const seenDifficulties = new Set();
    const seenDurations = new Set();

    items.forEach((item) => {
      const difficultyKey = getTutorialDifficultyKey(item);
      if (difficultyKey && !seenDifficulties.has(difficultyKey)) {
        seenDifficulties.add(difficultyKey);
        difficulties.push({ value: difficultyKey, label: getTutorialDifficultyLabel(difficultyKey) });
      }

      const durationBucket = getTutorialDurationBucket(item);
      if (durationBucket && !seenDurations.has(durationBucket)) {
        seenDurations.add(durationBucket);
        durations.push({ value: durationBucket, label: getTutorialDurationBucketLabel(durationBucket) });
      }
    });

    const difficultyOrder = ["beginner", "intermediate", "advanced"];
    difficulties.sort((left, right) => difficultyOrder.indexOf(left.value) - difficultyOrder.indexOf(right.value));

    const durationOrder = ["quick", "standard", "extended"];
    durations.sort((left, right) => durationOrder.indexOf(left.value) - durationOrder.indexOf(right.value));

    return { categories, difficulties, durations };
  }

  function renderTutorialCatalogueCard(item, index) {
    const title = getText(item, "titleVi", "titleEn");
    const categoryLabel = getTutorialCategoryLabel(item);
    const difficultyLabel = getTutorialDifficultyLabel(item.difficulty);
    const detailHref = getLocalePath("tutorial-detail", item.slug);
    const mediaTier = index < 10 ? "near" : "deferred";
    const metaText = [categoryLabel, difficultyLabel].filter(Boolean).join(" • ");

    return `
      <article class="tutorial-catalogue-card" data-motion="scene-enter">
        <a class="tutorial-catalogue-card__link" href="${detailHref}" data-transition aria-label="${escapeHtmlText(title)}">
          <div class="tutorial-catalogue-card__media">
            ${renderMedia(item.cover, "", { priority: index < 5, tier: mediaTier })}
          </div>
          <div class="tutorial-catalogue-card__body">
            <h2 class="tutorial-catalogue-card__title">${escapeHtmlText(title)}</h2>
            ${metaText ? `<p class="tutorial-catalogue-card__meta">${escapeHtmlText(metaText)}</p>` : ""}
          </div>
        </a>
      </article>
    `;
  }

  function renderTutorialCatalogueEmptyState() {
    return `
      <div class="tutorial-catalogue-empty" data-motion="scene-enter">
        <strong>${locale === "vi" ? "Không có bài giảng phù hợp." : "No tutorials match this filter."}</strong>
        <p>${locale === "vi"
          ? "Thử đổi chủ đề, cấp độ hoặc thời lượng để xem thêm bài giảng."
          : "Try a different subject, level, or duration to reveal more lessons."}</p>
      </div>
    `;
  }

  function initTutorialCatalogue(root, items) {
    if (!root) return;
    const section = $(".tutorial-catalogue", root);
    const filtersForm = $(".js-tutorial-catalogue-filters", root);
    const results = $(".js-tutorial-catalogue-results", root);
    const count = $(".js-tutorial-catalogue-count", root);
    const viewButtons = $$(".js-tutorial-view", root);
    if (!section || !filtersForm || !results) return;

    const filterModel = buildTutorialCatalogueFilterModel(items);
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const categoryParam = normalizeText(params.get("category") || "").toLowerCase();
    const durationParam = normalizeText(params.get("duration") || "").toLowerCase();
    const initialCategory = filterModel.categories.find((entry) => normalizeText(entry).toLowerCase() === categoryParam) || "all";
    const initialDifficulty = filterModel.difficulties.find((entry) => entry.value === getTutorialDifficultyKey(params.get("difficulty") || ""))?.value || "all";
    const initialDuration = filterModel.durations.find((entry) => entry.value === durationParam)?.value || "all";

    let storedView = "grid";
    try {
      storedView = localStorage.getItem("stemora:tutorial-view") === "editorial" ? "editorial" : "grid";
    } catch (error) {}

    const state = {
      category: initialCategory,
      difficulty: initialDifficulty,
      duration: initialDuration,
      sort: normalizeText(params.get("sort") || "").toLowerCase() || "latest",
      view: storedView,
    };

    $$("select[data-filter-key]", filtersForm).forEach((select) => {
      const filterKey = select.dataset.filterKey;
      if (!filterKey || !(filterKey in state)) return;
      select.value = state[filterKey];
    });

    const compareTitle = (left, right) =>
      getText(left, "titleVi", "titleEn").localeCompare(getText(right, "titleVi", "titleEn"), locale === "vi" ? "vi" : "en", { sensitivity: "base" });

    const sortItems = (entries) => {
      const nextEntries = [...entries];
      if (state.sort === "popular") {
        return nextEntries.sort((left, right) => Number(right.views || 0) - Number(left.views || 0) || getValidTimestamp(right.publishedAt) - getValidTimestamp(left.publishedAt));
      }
      if (state.sort === "title") {
        return nextEntries.sort(compareTitle);
      }
      return nextEntries.sort((left, right) => getValidTimestamp(right.publishedAt) - getValidTimestamp(left.publishedAt) || compareTitle(left, right));
    };

    const matchesFilters = (item) => {
      if (state.category !== "all" && getTutorialCategoryLabel(item) !== state.category) return false;
      if (state.difficulty !== "all" && getTutorialDifficultyKey(item) !== state.difficulty) return false;
      if (state.duration !== "all" && getTutorialDurationBucket(item) !== state.duration) return false;
      return true;
    };

    const updateView = () => {
      section.dataset.view = state.view;
      viewButtons.forEach((button) => {
        const isActive = button.dataset.view === state.view;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
    };

    const renderResults = () => {
      const filteredItems = sortItems(items.filter(matchesFilters));
      if (count) {
        count.textContent = locale === "vi"
          ? `${filteredItems.length} bài giảng`
          : `${filteredItems.length} lessons`;
      }
      results.innerHTML = filteredItems.length
        ? `<div class="tutorial-catalogue-grid">${filteredItems.map((item, index) => renderTutorialCatalogueCard(item, index)).join("")}</div>`
        : renderTutorialCatalogueEmptyState();
      hydrateDynamicMedia(results);
      refreshInteractiveLayers(results);
      updateView();
    };

    const handleFilterChange = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement)) return;
      const filterKey = target.dataset.filterKey;
      if (!filterKey || !(filterKey in state)) return;
      state[filterKey] = normalizeText(target.value || "") || "all";
      renderResults();
    };

    const handleViewClick = (event) => {
      const button = event.target.closest(".js-tutorial-view");
      if (!button || !button.dataset.view || button.dataset.view === state.view) return;
      state.view = button.dataset.view;
      try {
        localStorage.setItem("stemora:tutorial-view", state.view);
      } catch (error) {}
      updateView();
    };

    filtersForm.addEventListener("change", handleFilterChange);
    section.addEventListener("click", handleViewClick);
    renderResults();

    registerPageCleanup(root, () => {
      filtersForm.removeEventListener("change", handleFilterChange);
      section.removeEventListener("click", handleViewClick);
    });
  }

  function renderProjectsPageShowcase() {
    const root = $(".js-page-root");
    if (!root) return;
    const items = sortedProjects();
    updateMeta(strings.pageMeta.projects.title, strings.pageMeta.projects.description);

    if (!items.length) {
      root.innerHTML = renderArchiveShowcaseEmptyState(
        strings.projectsPage.eyebrow,
        locale === "vi" ? "Ch\u01b0a c\u00f3 d\u1ef1 \u00e1n \u0111\u1ec3 hi\u1ec3n th\u1ecb." : "No projects available yet.",
        locale === "vi" ? "D\u1eef li\u1ec7u d\u1ef1 \u00e1n s\u1ebd xu\u1ea5t hi\u1ec7n t\u1ea1i \u0111\u00e2y khi c\u00f3 case study m\u1edbi." : "Project case studies will appear here once new work is published."
      );
      refreshInteractiveLayers(root);
      return;
    }

    const totalYears = new Set(items.map((item) => String(new Date(item.publishedAt || "").getFullYear())).filter((value) => value && value !== "NaN")).size;
    const featuredCount = items.filter((item) => item.isFeatured).length;
    const firstSpotlight = items[0];

    root.innerHTML = `
      <section class="projects-voyage">
        <div class="container projects-voyage__shell">
          <section class="projects-voyage__hero" data-motion="scene-enter">
            <div class="projects-voyage__copy" data-stage="copy">
              <p class="scene-kicker">${strings.projectsPage.eyebrow}</p>
              <h1 class="editorial-title">${strings.projectsPage.title}</h1>
              <p class="scene-body">${strings.projectsPage.intro}</p>
              <div class="projects-voyage__stats">
                <article><strong>${items.length}</strong><span>${locale === "vi" ? "case study tri\u1ec3n khai" : "delivery case studies"}</span></article>
                <article><strong>${featuredCount}</strong><span>${locale === "vi" ? "nh\u1ecbp ch\u00ednh n\u1ed5i b\u1eadt" : "featured anchor stories"}</span></article>
                <article><strong>${totalYears || 1}</strong><span>${locale === "vi" ? "m\u00f9a tri\u1ec3n khai" : "delivery seasons"}</span></article>
              </div>
            </div>
            <div class="projects-voyage__thumb-panel" data-stage="hero">
              <div class="projects-voyage__thumb-head">
                <span>${locale === "vi" ? "Ch\u1ea1m v\u00e0o t\u1eebng nh\u1ecbp \u0111\u1ec3 nh\u1ea3y t\u1edbi spotlight." : "Tap a chapter to jump the spotlight."}</span>
              </div>
              <div class="projects-voyage__thumb-grid">
                ${items.map((item, index) => `
                  <button class="projects-voyage__thumb js-project-thumb${index === 0 ? " is-active" : ""}" type="button" data-project-index="${index}">
                    ${renderMedia(item.cover, "", { tier: index < 2 ? "near" : "deferred" })}
                    <span>${escapeHtmlText(getText(item, "titleVi", "titleEn"))}</span>
                  </button>
                `).join("")}
              </div>
            </div>
          </section>

          <section class="projects-voyage__story-grid">
            <aside class="projects-spotlight js-project-spotlight" data-motion="scene-enter">
              ${renderProjectSpotlightCard(firstSpotlight, 0, items.length)}
            </aside>
            <div class="projects-voyage__steps">
              ${items.map((item, index) => `
                <article class="project-beacon js-project-step${index === 0 ? " is-active" : ""}" data-project-index="${index}" tabindex="0" data-motion="scene-enter">
                  <div class="project-beacon__index">${String(index + 1).padStart(2, "0")}</div>
                  <div class="project-beacon__thumb">
                    ${renderMedia(item.cover, "", { tier: index < 2 ? "near" : "deferred" })}
                  </div>
                  <div class="project-beacon__content">
                    ${renderArchiveMetaRow([
                      item.season || formatArchiveDate(item.publishedAt),
                      getText(item, "typeVi", "typeEn") || item.type,
                      item.durationLabel,
                    ])}
                    <h2>${escapeHtmlText(getText(item, "titleVi", "titleEn"))}</h2>
                    <p>${escapeHtmlText(truncateText(getText(item, "summaryVi", "summaryEn"), 180))}</p>
                    <a class="project-beacon__link" href="${getLocalePath("project-detail", item.slug)}" data-transition>${strings.actions.viewDetail}</a>
                  </div>
                </article>
              `).join("")}
            </div>
          </section>

          <section class="projects-voyage__cta" data-motion="scene-enter">
            <div>
              <p class="scene-kicker">${strings.projectsPage.ctaEyebrow}</p>
              <h2>${strings.projectsPage.ctaTitle}</h2>
              <p>${strings.projectsPage.ctaCopy}</p>
            </div>
            <div class="projects-voyage__cta-actions">
              <a class="button button--primary" href="${getLocalePath("contact")}" data-transition>${strings.actions.getConsultation}</a>
              <a class="button button--ghost" href="${getLocalePath("products")}" data-transition>${strings.actions.browsePrograms}</a>
            </div>
          </section>
        </div>
      </section>
    `;

    hydrateDynamicMedia(root);
    refreshInteractiveLayers(root);
    initProjectsVoyage(root, items);
  }

  function getProjectDateLabel(item) {
    return normalizeText(item.season || formatArchiveDate(item.publishedAt) || item.year || "");
  }

  function getProjectTypeLabel(item) {
    return normalizeText(getText(item, "categoryVi", "categoryEn") || getText(item, "typeVi", "typeEn") || item.category || item.type || "");
  }

  function getProjectExcerpt(item, maxLength) {
    const excerpt = getText(item, "excerptVi", "excerptEn")
      || getText(item, "summaryVi", "summaryEn")
      || getText(item, "taglineVi", "taglineEn")
      || getText(item, "introVi", "introEn")
      || "";
    return maxLength ? truncateText(excerpt, maxLength) : excerpt;
  }

  function getProjectIntro(item) {
    return getText(item, "introVi", "introEn") || getProjectExcerpt(item, 220);
  }

  function renderProjectMeta(entries, className) {
    const safeEntries = (entries || []).map((entry) => normalizeText(entry || "")).filter(Boolean);
    if (!safeEntries.length) return "";
    return `
      <div class="${className || "project-meta"}">
        ${safeEntries.map((entry) => `<span>${escapeHtmlText(entry)}</span>`).join("")}
      </div>
    `;
  }

  function renderProjectArchiveEntry(item, index) {
    const title = getText(item, "titleVi", "titleEn");
    const isMediaLeft = index % 2 === 1;
    const copyMotion = isMediaLeft ? "fade-left" : "fade-right";

    return `
      <article class="project-archive-entry project-archive-entry--${isMediaLeft ? "media-left" : "media-right"}">
        <a class="project-archive-entry__link" href="${getLocalePath("project-detail", item.slug)}" data-transition aria-label="${escapeHtmlText(title)}">
          <div class="project-archive-entry__copy" data-motion="${copyMotion}">
            <h2 class="project-archive-entry__title">${escapeHtmlText(title)}</h2>
          </div>
          <figure class="project-archive-entry__media" data-motion="mask-reveal">
            ${renderMedia(item.cover, "", { tier: index < 2 ? "near" : "deferred", loading: index === 0 ? "eager" : "lazy" })}
          </figure>
        </a>
      </article>
    `;
  }
  function renderProjectStoryFacts(item) {
    const facts = [
      [locale === "vi" ? "Thời gian" : "Published", getProjectDateLabel(item)],
      [locale === "vi" ? "Định dạng" : "Type", getProjectTypeLabel(item)],
      [locale === "vi" ? "Đối tượng" : "Audience", getText(item, "audienceVi", "audienceEn")],
      [locale === "vi" ? "Địa điểm" : "Location", getText(item, "locationVi", "locationEn")],
    ].filter((entry) => entry[1]);

    if (!facts.length) return "";
    return `
      <section class="project-story-facts" data-motion="stagger" aria-label="${locale === "vi" ? "Thông tin dự án" : "Project facts"}">
        ${facts.map((entry) => `
          <article class="project-story-fact">
            <span>${escapeHtmlText(entry[0])}</span>
            <strong>${escapeHtmlText(entry[1])}</strong>
          </article>
        `).join("")}
      </section>
    `;
  }

  function renderProjectStoryStats(item) {
    const stats = Array.isArray(item.stats) ? item.stats.filter(Boolean) : [];
    if (!stats.length) return "";
    return `
      <section class="project-story-stats" data-motion="stagger" aria-label="${locale === "vi" ? "Số liệu chính" : "Key figures"}">
        ${stats.map((entry) => `
          <article class="project-story-stat">
            <strong>${escapeHtmlText(entry.value || "")}</strong>
            <span>${escapeHtmlText(getText(entry, "labelVi", "labelEn"))}</span>
          </article>
        `).join("")}
      </section>
    `;
  }

  function renderProjectStructuredSections(item) {
    const sections = Array.isArray(item.sections) ? item.sections.filter(Boolean) : [];
    if (!sections.length) return "";
    return sections.map((section, index) => {
      const title = getText(section, "titleVi", "titleEn");
      const body = getText(section, "bodyVi", "bodyEn");
      const caption = getText(section, "captionVi", "captionEn");
      const media = section.media || item.gallery && item.gallery[index] || item.cover;
      const layout = normalizeText(section.layout || (index % 2 === 0 ? "media-right" : "media-left"));
      return `
        <section class="project-story-block project-story-block--${layout}" data-motion="scene-enter">
          <figure class="project-story-block__media" data-motion="${layout === "media-right" ? "fade-left" : "fade-right"}">
            ${renderMedia(media, "", { tier: index < 2 ? "near" : "deferred" })}
            ${caption ? `<figcaption>${escapeHtmlText(caption)}</figcaption>` : ""}
          </figure>
          <div class="project-story-block__copy" data-motion="${layout === "media-right" ? "fade-right" : "fade-left"}">
            ${title ? `<h2>${escapeHtmlText(title)}</h2>` : ""}
            ${body ? `<p>${escapeHtmlText(body)}</p>` : ""}
          </div>
        </section>
      `;
    }).join("");
  }

  function renderProjectStoryQuote(item) {
    const quoteText = item.quote ? getText(item.quote, "textVi", "textEn") : "";
    if (!quoteText) return "";
    const author = getText(item.quote, "authorVi", "authorEn");
    return `
      <blockquote class="project-story-quote" data-motion="scene-enter">
        <p>${escapeHtmlText(quoteText)}</p>
        ${author ? `<footer>${escapeHtmlText(author)}</footer>` : ""}
      </blockquote>
    `;
  }

  function renderProjectStoryGallery(item) {
    const galleryItems = Array.isArray(item.gallery) ? item.gallery.filter(Boolean).slice(0, 4) : [];
    if (!galleryItems.length) return "";
    return `
      <section class="project-story-gallery" data-motion="stagger-group" aria-label="${locale === "vi" ? "Hình ảnh dự án" : "Project gallery"}">
        ${galleryItems.map((mediaItem, index) => `
          <figure class="project-story-gallery__item project-story-gallery__item--${index + 1}">
            ${renderMedia(mediaItem, "", { tier: index < 2 ? "near" : "deferred" })}
          </figure>
        `).join("")}
      </section>
    `;
  }

  function renderProjectBodyContent(item, contentModel) {
    if (normalizeText(item.contentHtml || "")) {
      return `
        <article class="project-story-prose editorial-article-body js-detail-body" data-motion="scene-enter">
          ${contentModel.html}
        </article>
      `;
    }

    const structuredSections = renderProjectStructuredSections(item);
    const quoteMarkup = renderProjectStoryQuote(item);
    const galleryMarkup = renderProjectStoryGallery(item);

    return `
      <div class="project-story-body">
        ${structuredSections || `
          <article class="project-story-prose editorial-article-body js-detail-body" data-motion="scene-enter">
            <p>${escapeHtmlText(getProjectExcerpt(item, 320))}</p>
          </article>
        `}
        ${quoteMarkup}
        ${galleryMarkup}
      </div>
    `;
  }

  function renderProjectRelatedSection(items) {
    if (!items.length) return "";
    return `
      <section class="project-story-related" data-motion="scene-enter">
        <div class="project-story-related__header" data-motion="text-stagger">
          <p class="scene-kicker">${locale === "vi" ? "Archive tiếp theo" : "Next in archive"}</p>
          <h2>${locale === "vi" ? "Các dự án liên quan" : "Related projects"}</h2>
        </div>
        <div class="project-story-related__list">
          ${items.map((entry, index) => `
            <article class="project-story-related__item" data-motion="scene-enter">
              <a class="project-story-related__link" href="${getLocalePath("project-detail", entry.slug)}" data-transition>
                <figure class="project-story-related__media" data-motion="mask-reveal">
                  ${renderMedia(entry.cover, "", { tier: index < 2 ? "near" : "deferred" })}
                </figure>
                <div class="project-story-related__copy">
                  ${renderProjectMeta([getProjectDateLabel(entry)], "project-story-related__meta")}
                  <h3>${escapeHtmlText(getText(entry, "titleVi", "titleEn"))}</h3>
                </div>
              </a>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  function getProjectArchiveScrollStorageKey() {
    return `${PROJECT_ARCHIVE_SCROLL_KEY}:${locale}`;
  }

  function initProjectArchiveScrollMemory(root) {
    if (!root) return;
    const storageKey = getProjectArchiveScrollStorageKey();
    const storedScroll = Number(window.sessionStorage.getItem(storageKey) || "");

    if (Number.isFinite(storedScroll) && storedScroll > 0) {
      window.sessionStorage.removeItem(storageKey);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          window.scrollTo(0, storedScroll);
        });
      });
    }

    const projectLinks = $$(".project-archive-entry__link", root);
    if (!projectLinks.length) return;

    const saveScroll = () => {
      window.sessionStorage.setItem(storageKey, String(window.scrollY || window.pageYOffset || 0));
    };

    projectLinks.forEach((link) => link.addEventListener("click", saveScroll));
    registerPageCleanup(root, () => {
      projectLinks.forEach((link) => link.removeEventListener("click", saveScroll));
    });
  }

  function initProjectArchiveTimeline(root) {
    if (!root || typeof window === "undefined") return;
    const shell = $(".project-archive-page__shell", root);
    const divider = $(".project-archive-page__divider", root);
    const list = $(".project-archive-list", root);
    const rail = $(".project-archive-progress", root);
    const dot = $(".project-archive-progress__dot", root);
    if (!shell || !divider || !list || !rail || !dot) return;

    let rafId = 0;
    let disposed = false;

    const update = () => {
      rafId = 0;
      if (disposed) return;
      const shellRect = shell.getBoundingClientRect();
      const dividerRect = divider.getBoundingClientRect();
      const rect = list.getBoundingClientRect();
      const scrollTop = window.scrollY || window.pageYOffset || 0;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
      const dotSize = Math.max(dot.getBoundingClientRect().height || 0, 10);
      const dividerCenter = dividerRect.top + dividerRect.height / 2 - shellRect.top;
      const listTopAbs = rect.top + scrollTop;
      const listBottomAbs = rect.bottom + scrollTop;
      const startScroll = Math.max(0, listTopAbs - viewportHeight * 0.34);
      const endScroll = Math.max(startScroll + 1, listBottomAbs - viewportHeight * 0.56);
      const progress = Math.min(1, Math.max(0, (scrollTop - startScroll) / (endScroll - startScroll)));
      const railHeight = Math.max(rect.bottom - shellRect.top - dividerCenter, dotSize);
      const travel = Math.max(railHeight - dotSize, 0);
      const offset = dotSize / 2 + progress * travel;

      rail.style.top = `${dividerCenter}px`;
      rail.style.height = `${railHeight}px`;
      rail.style.setProperty("--project-progress-offset", `${offset}px`);
      rail.style.setProperty("--project-progress-ratio", progress.toFixed(4));
    };

    const requestUpdate = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(update);
    };

    requestUpdate();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    registerPageCleanup(root, () => {
      disposed = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    });
  }

  function renderTutorialsPageShowcase() {
    const root = $(".js-page-root");
    if (!root) return;
    const items = sortedTutorials();
    updateMeta(strings.pageMeta.tutorials.title, strings.pageMeta.tutorials.description);

    if (!items.length) {
      root.innerHTML = renderArchiveShowcaseEmptyState(
        locale === "vi" ? "B\u00e0i gi\u1ea3ng" : "Tutorials",
        locale === "vi" ? "Ch\u01b0a c\u00f3 b\u00e0i gi\u1ea3ng \u0111\u1ec3 hi\u1ec3n th\u1ecb." : "No tutorials available yet.",
        locale === "vi" ? "Khi d\u1eef li\u1ec7u b\u00e0i gi\u1ea3ng s\u1eb5n s\u00e0ng, learning tracks s\u1ebd xu\u1ea5t hi\u1ec7n \u1edf \u0111\u00e2y." : "Once tutorial data is ready, the learning tracks will appear here."
      );
      refreshInteractiveLayers(root);
      return;
    }

    const filterModel = buildTutorialCatalogueFilterModel(items);
    const labels = {
      pageTitle: locale === "vi" ? "Bài giảng" : "Tutorials",
      category: locale === "vi" ? "Chủ đề" : "Subject",
      difficulty: locale === "vi" ? "Cấp độ" : "Level",
      duration: locale === "vi" ? "Thời lượng" : "Duration",
      sort: locale === "vi" ? "Sắp xếp" : "Sort",
      categoryAll: locale === "vi" ? "Tất cả chủ đề" : "All subjects",
      difficultyAll: locale === "vi" ? "Mọi cấp độ" : "All levels",
      durationAll: locale === "vi" ? "Mọi thời lượng" : "Any duration",
      sortLatest: locale === "vi" ? "Mới nhất" : "Newest",
      sortPopular: locale === "vi" ? "Xem nhiều" : "Most viewed",
      sortTitle: locale === "vi" ? "Tên A-Z" : "Title A-Z",
      viewEditorial: locale === "vi" ? "Ảnh lớn" : "Large cards",
      viewGrid: locale === "vi" ? "Lưới đều" : "Grid view",
    };

    root.innerHTML = `
      <section class="tutorial-catalogue">
        <div class="container tutorial-catalogue__shell">
          <header class="tutorial-catalogue__header" data-motion="scene-enter">
            <div class="tutorial-catalogue__title-row">
              <h1 class="tutorial-catalogue__title">${labels.pageTitle}</h1>
              <div class="tutorial-catalogue__view-toggle" role="group" aria-label="${locale === "vi" ? "Chế độ hiển thị" : "View mode"}">
                <button class="tutorial-catalogue__view-button js-tutorial-view" type="button" data-view="editorial" aria-pressed="false" aria-label="${labels.viewEditorial}">
                  <span aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                      <path d="M4 19V5"></path>
                      <path d="M10 19V9"></path>
                      <path d="M16 19V7"></path>
                      <path d="M22 19V3"></path>
                    </svg>
                  </span>
                </button>
                <button class="tutorial-catalogue__view-button js-tutorial-view is-active" type="button" data-view="grid" aria-pressed="true" aria-label="${labels.viewGrid}">
                  <span aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                      <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                      <rect x="3" y="14" width="7" height="7" rx="1"></rect>
                      <rect x="14" y="14" width="7" height="7" rx="1"></rect>
                    </svg>
                  </span>
                </button>
              </div>
            </div>
            <form class="tutorial-catalogue__filters js-tutorial-catalogue-filters" aria-label="${locale === "vi" ? "Bộ lọc bài giảng" : "Tutorial filters"}">
              <label class="tutorial-catalogue__filter-field">
                <span class="tutorial-catalogue__filter-caption">${labels.category}</span>
                <div class="tutorial-catalogue__filter-control">
                  <select class="tutorial-catalogue__select" data-filter-key="category">
                    <option value="all">${labels.categoryAll}</option>
                    ${filterModel.categories.map((entry) => `<option value="${escapeHtmlText(entry)}">${escapeHtmlText(entry)}</option>`).join("")}
                  </select>
                  <span class="tutorial-catalogue__filter-mark" aria-hidden="true">+</span>
                </div>
              </label>
              <label class="tutorial-catalogue__filter-field">
                <span class="tutorial-catalogue__filter-caption">${labels.difficulty}</span>
                <div class="tutorial-catalogue__filter-control">
                  <select class="tutorial-catalogue__select" data-filter-key="difficulty">
                    <option value="all">${labels.difficultyAll}</option>
                    ${filterModel.difficulties.map((entry) => `<option value="${entry.value}">${escapeHtmlText(entry.label)}</option>`).join("")}
                  </select>
                  <span class="tutorial-catalogue__filter-mark" aria-hidden="true">+</span>
                </div>
              </label>
              <label class="tutorial-catalogue__filter-field">
                <span class="tutorial-catalogue__filter-caption">${labels.duration}</span>
                <div class="tutorial-catalogue__filter-control">
                  <select class="tutorial-catalogue__select" data-filter-key="duration">
                    <option value="all">${labels.durationAll}</option>
                    ${filterModel.durations.map((entry) => `<option value="${entry.value}">${escapeHtmlText(entry.label)}</option>`).join("")}
                  </select>
                  <span class="tutorial-catalogue__filter-mark" aria-hidden="true">+</span>
                </div>
              </label>
              <label class="tutorial-catalogue__filter-field tutorial-catalogue__filter-field--sort">
                <span class="tutorial-catalogue__filter-caption">${labels.sort}</span>
                <div class="tutorial-catalogue__filter-control">
                  <select class="tutorial-catalogue__select" data-filter-key="sort">
                    <option value="latest">${labels.sortLatest}</option>
                    <option value="popular">${labels.sortPopular}</option>
                    <option value="title">${labels.sortTitle}</option>
                  </select>
                  <span class="tutorial-catalogue__filter-mark" aria-hidden="true">+</span>
                </div>
              </label>
              <p class="tutorial-catalogue__count js-tutorial-catalogue-count">${locale === "vi" ? `${items.length} bài giảng` : `${items.length} lessons`}</p>
            </form>
          </header>
          <div class="tutorial-catalogue__results js-tutorial-catalogue-results" aria-live="polite"></div>
        </div>
      </section>
    `;

    hydrateDynamicMedia(root);
    refreshInteractiveLayers(root);
    initTutorialCatalogue(root, items);
  }

  function renderNewsPageShowcase() {
    const root = $(".js-page-root");
    if (!root) return;
    const items = sortedNews();
    updateMeta(strings.pageMeta.news.title, strings.pageMeta.news.description);

    if (!items.length) {
      root.innerHTML = renderArchiveShowcaseEmptyState(
        locale === "vi" ? "Tin t\u1ee9c" : "News",
        locale === "vi" ? "Ch\u01b0a c\u00f3 b\u1ea3n tin \u0111\u00e3 xu\u1ea5t b\u1ea3n." : "No published stories yet.",
        locale === "vi" ? "Khi c\u00f3 b\u00e0i vi\u1ebft \u0111\u01b0\u1ee3c ph\u00e1t h\u00e0nh, newsroom n\u00e0y s\u1ebd t\u1ef1 \u0111\u1ed9ng l\u1ea5p \u0111\u1ea7y." : "Once new stories are published, this newsroom will populate automatically."
      );
      refreshInteractiveLayers(root);
      return;
    }

    const featuredItems = items.slice(0, Math.min(4, items.length));

    const renderNewsLead = (item, index) => `
      <article class="news-signal__stage">
        <div class="news-signal__stage-media">
          ${renderMedia(item.cover, "", { priority: true, stage: "hero" })}
        </div>
        <div class="news-signal__stage-body">
          <h1>${escapeHtmlText(getText(item, "titleVi", "titleEn"))}</h1>
          <p>${escapeHtmlText(truncateText(getText(item, "summaryVi", "summaryEn"), 220))}</p>
          <div class="news-signal__stage-actions">
            <a class="button button--primary" href="${getLocalePath("news-detail", item.slug)}" data-transition>${strings.actions.viewDetail}</a>
          </div>
        </div>
      </article>
    `;

    root.innerHTML = `
      <section class="news-signal">
        <div class="container news-signal__shell">
          <section class="news-signal__hero" data-motion="scene-enter">
            <div class="news-signal__lead js-news-lead">
              ${renderNewsLead(featuredItems[0], 0)}
            </div>
            <div class="news-signal__desk">
              <div class="news-signal__desk-head">
                <p class="scene-kicker">Trending</p>
              </div>
              <div class="news-signal__stack js-news-signal-stack">
                ${featuredItems.map((item, index) => `
                  <button class="news-signal__trend-item js-news-bullet${index === 0 ? " is-active" : ""}" type="button" data-news-index="${index}">
                    <div class="news-signal__trend-thumb">
                      ${renderMedia(item.cover, "", { tier: index < 2 ? "near" : "deferred" })}
                    </div>
                    <div class="news-signal__trend-body">
                      <span class="news-signal__trend-meta">${formatArchiveDate(item.publishedAt)} <em>${escapeHtmlText(getText(item, "categoryVi", "categoryEn") || (locale === "vi" ? "Tin m\u1edbi" : "Update"))}</em></span>
                      <strong>${escapeHtmlText(getText(item, "titleVi", "titleEn"))}</strong>
                      <small>${escapeHtmlText(truncateText(getText(item, "summaryVi", "summaryEn"), 72))}</small>
                    </div>
                  </button>
                `).join("")}
              </div>
            </div>
          </section>

          <section class="news-signal__grid">
            <div class="news-signal__grid-head" data-motion="scene-enter">
              <p class="scene-kicker">Radar stories</p>
            </div>
            <div class="news-signal__cards">
              ${items.map((item, index) => `
                <article class="news-signal__card news-signal__card--${["wide", "tall", "compact"][index % 3]}" data-motion="scene-enter">
                  <a class="news-signal__card-media" href="${getLocalePath("news-detail", item.slug)}" data-transition>
                    ${renderMedia(item.cover, "", { tier: index < 2 ? "near" : "deferred" })}
                  </a>
                  <div class="news-signal__card-body">
                    <h3><a href="${getLocalePath("news-detail", item.slug)}" data-transition>${escapeHtmlText(getText(item, "titleVi", "titleEn"))}</a></h3>
                    <p>${escapeHtmlText(truncateText(getText(item, "summaryVi", "summaryEn"), index === 0 ? 180 : 130))}</p>
                  </div>
                </article>
              `).join("")}
            </div>
          </section>
        </div>
      </section>
    `;

    const lead = $(".js-news-lead", root);
    const bulletButtons = $$(".js-news-bullet", root);
    let activeNewsIndex = 0;
    let rotationTimer = 0;

    const setActiveNews = (nextIndex) => {
      if (!featuredItems[nextIndex] || !lead) return;
      activeNewsIndex = nextIndex;
      lead.innerHTML = renderNewsLead(featuredItems[nextIndex], nextIndex);
      bulletButtons.forEach((button, buttonIndex) => {
        button.classList.toggle("is-active", buttonIndex === nextIndex);
      });
      hydrateDynamicMedia(lead);
    };

    const stopRotation = () => {
      if (!rotationTimer) return;
      window.clearInterval(rotationTimer);
      rotationTimer = 0;
    };

    const startRotation = () => {
      stopRotation();
      if (featuredItems.length < 2 || reducedMotion) return;
      rotationTimer = window.setInterval(() => {
        setActiveNews((activeNewsIndex + 1) % featuredItems.length);
      }, 5200);
    };

    bulletButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setActiveNews(Number(button.dataset.newsIndex || 0));
        startRotation();
      });
    });

    const desk = $(".news-signal__hero", root);
    const handleDeskMouseEnter = () => stopRotation();
    const handleDeskMouseLeave = () => startRotation();
    const handleDeskFocusIn = () => stopRotation();
    const handleDeskFocusOut = (event) => {
      if (!desk || !desk.contains(event.relatedTarget)) startRotation();
    };
    if (desk) {
      desk.addEventListener("mouseenter", handleDeskMouseEnter);
      desk.addEventListener("mouseleave", handleDeskMouseLeave);
      desk.addEventListener("focusin", handleDeskFocusIn);
      desk.addEventListener("focusout", handleDeskFocusOut);
    }

    hydrateDynamicMedia(root);
    refreshInteractiveLayers(root);
    startRotation();
    registerPageCleanup(root, () => {
      stopRotation();
      if (!desk) return;
      desk.removeEventListener("mouseenter", handleDeskMouseEnter);
      desk.removeEventListener("mouseleave", handleDeskMouseLeave);
      desk.removeEventListener("focusin", handleDeskFocusIn);
      desk.removeEventListener("focusout", handleDeskFocusOut);
    });
  }

  function renderProjectsPage() {
    const root = $(".js-page-root");
    if (!root) return;
    const items = sortedProjects();
    updateMeta(
      locale === "vi" ? "STEMORA | Dự án" : "STEMORA | Project",
      locale === "vi"
        ? "Archive dự án được kể theo nhịp biên tập: tiêu đề lớn, ảnh cover rõ, và từng case story mở sang trang đọc riêng."
        : "An editorial project archive with title-led entries, clean cover presentation, and direct long-form story pages."
    );

    if (!items.length) {
      root.innerHTML = renderArchiveShowcaseEmptyState(
        "Project",
        locale === "vi" ? "Chưa có dự án để hiển thị." : "No projects available yet.",
        locale === "vi"
          ? "Các câu chuyện triển khai sẽ xuất hiện tại đây khi dữ liệu dự án được xuất bản."
          : "Published campaign stories will appear here once project data is ready."
      );
      refreshInteractiveLayers(root);
      return;
    }

    root.innerHTML = `
      <section class="project-archive-page">
        <div class="container project-archive-page__shell">
          <header class="project-archive-page__header" data-motion="text-stagger">
            <h1>${locale === "vi" ? "Project" : "Project"}</h1>
            <div class="project-archive-page__divider" aria-hidden="true"><span></span></div>
          </header>

          <div class="project-archive-progress" aria-hidden="true">
            <span class="project-archive-progress__dot"></span>
          </div>
          <section class="project-archive-list" aria-label="${locale === "vi" ? "Danh s\u00e1ch d\u1ef1 \u00e1n" : "Project archive list"}">
            ${items.map((item, index) => renderProjectArchiveEntry(item, index)).join("")}
          </section>
        </div>
      </section>
    `;

    hydrateDynamicMedia(root);
    refreshInteractiveLayers(root);
    initProjectArchiveScrollMemory(root);
    initProjectArchiveTimeline(root);
  }

  function buildArchiveContentModel(item, prefix, fallbackText) {
    const fallbackMarkup = `<p>${escapeHtmlText(fallbackText || "")}</p>`;
    const source = normalizeText(item && item.contentHtml ? item.contentHtml : "").trim();
    if (!source || typeof document === "undefined") {
      return {
        html: fallbackMarkup,
        headings: [],
        wordCount: normalizeText(fallbackText || "").split(/\s+/).filter(Boolean).length,
        imageCount: 0,
        paragraphCount: fallbackText ? 1 : 0,
        readingMinutes: 1,
      };
    }

    const template = document.createElement("template");
    template.innerHTML = source;
    const headings = [];

    Array.from(template.content.querySelectorAll("h2, h3")).forEach((heading, index) => {
      const headingText = normalizeText(heading.textContent || "").replace(/\s+/g, " ").trim();
      if (!headingText) return;
      const headingId = `${prefix}-${slugifyArchiveValue(headingText)}-${index + 1}`;
      heading.id = headingId;
      heading.setAttribute("data-detail-anchor", "");
      headings.push({ id: headingId, text: headingText, level: heading.tagName.toLowerCase() });
    });

    Array.from(template.content.querySelectorAll("img")).forEach((image, index) => {
      if (!image.getAttribute("loading")) image.setAttribute("loading", index === 0 ? "eager" : "lazy");
      if (!image.getAttribute("decoding")) image.setAttribute("decoding", "async");
    });

    const wrapper = document.createElement("div");
    wrapper.appendChild(template.content);
    const plainText = normalizeText(wrapper.textContent || "").replace(/\s+/g, " ").trim();
    const wordCount = plainText ? plainText.split(" ").length : 0;

    return {
      html: wrapper.innerHTML || fallbackMarkup,
      headings,
      wordCount,
      imageCount: wrapper.querySelectorAll("img").length,
      paragraphCount: wrapper.querySelectorAll("p").length,
      readingMinutes: Math.max(1, Math.round(Math.max(wordCount, 80) / 180)),
    };
  }

  function renderDetailBreadcrumb(archiveKey, archiveLabel, title) {
    return `
      <nav class="detail-breadcrumb" aria-label="Breadcrumb">
        <a href="${getLocalePath("welcome")}" data-transition>${locale === "vi" ? "Trang ch\u1ee7" : "Home"}</a>
        <span>&#8250;</span>
        <a href="${getLocalePath(archiveKey)}" data-transition>${escapeHtmlText(archiveLabel || "")}</a>
        <span>&#8250;</span>
        <strong>${escapeHtmlText(title)}</strong>
      </nav>
    `;
  }

  function renderDetailOutlinePanel(eyebrow, title, headings, emptyCopy) {
    const safeHeadings = Array.isArray(headings) ? headings : [];
    return `
      <section class="detail-outline-panel contact-panel" data-motion="scene-enter">
        <p class="scene-kicker">${escapeHtmlText(eyebrow)}</p>
        <h3>${escapeHtmlText(title)}</h3>
        ${safeHeadings.length ? `
          <div class="detail-outline__links">
            ${safeHeadings.map((heading) => `
              <a class="detail-outline__link js-detail-outline-link detail-outline__link--${heading.level === "h3" ? "minor" : "major"}" href="#${heading.id}">
                <span>${escapeHtmlText(heading.text)}</span>
              </a>
            `).join("")}
          </div>
        ` : `<p class="detail-outline__empty">${escapeHtmlText(emptyCopy || "")}</p>`}
      </section>
    `;
  }

  function renderDetailRelatedSection(entries, config) {
    const items = Array.isArray(entries) ? entries : [];
    const options = config || {};
    if (!items.length) return "";
    return `
      <section class="detail-related-section ${options.className || ""}">
        <div class="detail-related__header">
          <p class="scene-kicker">${escapeHtmlText(options.eyebrow || "")}</p>
          <h2>${escapeHtmlText(options.title || "")}</h2>
        </div>
        <div class="detail-related__grid">
          ${items.map((entry, index) => `
            <article class="detail-related__card" data-motion="scene-enter">
              <a class="detail-related__media" href="${getLocalePath(options.detailKey, entry.slug)}" data-transition>
                ${renderMedia(entry.cover || entry.hero, "", { tier: index < 2 ? "near" : "deferred" })}
              </a>
              <div class="detail-related__body">
                ${renderArchiveMetaRow([
                  entry.season || formatArchiveDate(entry.publishedAt),
                  getText(entry, "categoryVi", "categoryEn") || getText(entry, "typeVi", "typeEn") || entry.type,
                  entry.durationLabel,
                ])}
                <h3><a href="${getLocalePath(options.detailKey, entry.slug)}" data-transition>${escapeHtmlText(getText(entry, "titleVi", "titleEn"))}</a></h3>
                <p>${escapeHtmlText(truncateText(getText(entry, "summaryVi", "summaryEn"), 140))}</p>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  function initDetailScaffold(root, options) {
    const config = options || {};
    const bodyElement = $(config.bodySelector || ".js-detail-body", root);
    const progressFill = $(config.progressSelector || ".js-detail-progress-fill", root);
    const outlineLinks = $$(".js-detail-outline-link", root);
    const headings = bodyElement ? Array.from(bodyElement.querySelectorAll("[data-detail-anchor]")) : [];
    const cleanups = [];
    let observer = null;

    const setActiveOutline = (activeId) => {
      outlineLinks.forEach((link) => {
        const linkId = String(link.getAttribute("href") || "").replace(/^#/, "");
        link.classList.toggle("is-active", linkId === activeId);
      });
    };

    outlineLinks.forEach((link) => {
      const href = String(link.getAttribute("href") || "");
      const clickHandler = (event) => {
        if (!href.startsWith("#")) return;
        const target = bodyElement ? bodyElement.querySelector(href) : document.querySelector(href);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
        setActiveOutline(href.slice(1));
      };
      link.addEventListener("click", clickHandler);
      cleanups.push(() => link.removeEventListener("click", clickHandler));
    });

    if (progressFill && bodyElement) {
      const syncProgress = () => {
        const bodyRect = bodyElement.getBoundingClientRect();
        const viewportHeight = window.innerHeight || 1;
        const start = window.scrollY + bodyRect.top - viewportHeight * 0.16;
        const end = window.scrollY + bodyRect.bottom - viewportHeight * 0.68;
        const ratio = clamp((window.scrollY - start) / Math.max(end - start, 1), 0, 1);
        progressFill.style.transform = `scaleX(${Math.max(0.04, ratio)})`;
      };
      window.addEventListener("scroll", syncProgress, { passive: true });
      window.addEventListener("resize", syncProgress);
      cleanups.push(() => window.removeEventListener("scroll", syncProgress));
      cleanups.push(() => window.removeEventListener("resize", syncProgress));
      syncProgress();
    }

    if (headings.length && outlineLinks.length && "IntersectionObserver" in window) {
      observer = new IntersectionObserver((entries) => {
        const current = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        if (!current || !current.target.id) return;
        setActiveOutline(current.target.id);
      }, {
        threshold: [0.2, 0.45, 0.7],
        rootMargin: "-16% 0px -58% 0px",
      });
      headings.forEach((heading) => observer.observe(heading));
      setActiveOutline(headings[0].id);
    }

    if (observer) cleanups.push(() => observer.disconnect());
    if (cleanups.length) {
      registerPageCleanup(root, () => {
        cleanups.forEach((cleanup) => cleanup());
      });
    }
  }

  function renderKnowledgeMetaPills(entries) {
    const items = (entries || []).map((entry) => normalizeText(entry || "")).filter(Boolean);
    if (!items.length) return "";
    return `
      <div class="knowledge-detail__meta">
        ${items.map((entry) => `<span class="knowledge-detail__pill">${escapeHtmlText(entry)}</span>`).join("")}
      </div>
    `;
  }

  function renderKnowledgeLeadMedia(item, contentModel) {
    const mediaItem = item && (item.hero || item.cover);
    if (!mediaItem || (contentModel && contentModel.imageCount > 0)) return "";
    return `
      <figure class="knowledge-detail__lead-media" data-stage="hero">
        ${renderMedia(mediaItem, "", { priority: true, stage: "hero" })}
      </figure>
    `;
  }

  function renderKnowledgeSidebarSection(title, entries, config) {
    const options = config || {};
    const items = Array.isArray(entries) ? entries.filter(Boolean).slice(0, options.limit || 4) : [];
    if (!items.length) return "";
    return `
      <section class="knowledge-sidebar-card" data-motion="scene-enter">
        <h2>${escapeHtmlText(title)}</h2>
        <div class="knowledge-sidebar-list">
          ${items.map((entry, index) => {
            const href = options.hrefFn ? options.hrefFn(entry) : getLocalePath(options.detailKey, entry.slug);
            const titleText = normalizeText(options.titleFn ? options.titleFn(entry) : getText(entry, "titleVi", "titleEn"));
            const metaText = options.kind === "product"
              ? normalizeText(options.metaFn ? options.metaFn(entry) : "")
              : "";
            return `
              <a class="knowledge-sidebar-item${options.kind === "product" ? " knowledge-sidebar-item--product" : ""}" href="${href}" data-transition>
                <div class="knowledge-sidebar-item__media">
                  ${renderMedia(entry.cover || entry.hero, "", { tier: index < 2 ? "near" : "deferred" })}
                </div>
                <div class="knowledge-sidebar-item__body">
                  <strong>${escapeHtmlText(titleText)}</strong>
                  ${metaText ? `<span class="knowledge-sidebar-item__meta">${escapeHtmlText(metaText)}</span>` : ""}
                </div>
              </a>
            `;
          }).join("")}
        </div>
      </section>
    `;
  }

  function renderKnowledgeDetailLayout(config) {
    const options = config || {};
    return `
      <section class="knowledge-detail knowledge-detail--${escapeHtmlText(options.variant || "default")}">
        <div class="detail-reading-progress knowledge-detail__progress knowledge-detail__progress--${escapeHtmlText(options.variant || "default")}">
          <span class="js-detail-progress-fill"></span>
        </div>
        <div class="container knowledge-detail__shell">
          ${renderDetailBreadcrumb(options.archiveKey, options.archiveLabel, options.title)}
          <div class="knowledge-detail__layout">
            <article class="contact-panel knowledge-detail__main">
              <header class="knowledge-detail__header" data-stage="copy">
                <p class="scene-kicker">${escapeHtmlText(options.eyebrow || "")}</p>
                <h1>${escapeHtmlText(options.title || "")}</h1>
                ${renderKnowledgeMetaPills(options.meta)}
                ${options.summary ? `<p class="knowledge-detail__summary">${escapeHtmlText(options.summary)}</p>` : ""}
                <div class="knowledge-detail__actions">
                  <a class="button button--primary" href="${options.backHref}" data-transition>${escapeHtmlText(options.backLabel || "")}</a>
                  <button class="share-button js-copy-link" type="button">${locale === "vi" ? "Sao chép link" : "Copy link"}</button>
                  <span class="share-feedback js-share-feedback" aria-live="polite"></span>
                </div>
              </header>
              ${options.leadMediaHtml || ""}
              <div class="knowledge-detail__prose editorial-article-body js-detail-body" data-motion="scene-enter">
                ${options.contentHtml || ""}
              </div>
            </article>
            <aside class="knowledge-detail__sidebar">
              ${(options.sidebarSections || []).filter(Boolean).join("")}
            </aside>
          </div>
        </div>
      </section>
    `;
  }

  function renderProjectCaseDetail() {
    const root = $(".js-page-root");
    if (!root) return;
    const items = sortedProjects();
    const item = items.find((entry) => entry.slug === slugFromPath() || entry.sourceSlug === slugFromPath());
    if (!item) return renderMissing(root, getLocalePath("projects"));

    const title = getText(item, "titleVi", "titleEn");
    const summary = getProjectExcerpt(item, 240);
    const intro = getProjectIntro(item);
    const typeLabel = getProjectTypeLabel(item) || (locale === "vi" ? "D\u1ef1 \u00e1n" : "Project");
    const contentModel = buildArchiveContentModel(item, `project-${item.slug}`, summary || intro);
    const related = items
      .filter((entry) => entry.slug !== item.slug)
      .sort((left, right) => {
        const leftScore = Number(getProjectTypeLabel(left) === typeLabel) * 3 + Number(Boolean(left.isFeatured));
        const rightScore = Number(getProjectTypeLabel(right) === typeLabel) * 3 + Number(Boolean(right.isFeatured));
        return rightScore - leftScore || (right.publishedTimestamp || 0) - (left.publishedTimestamp || 0);
      })
      .slice(0, 4);
    const tutorials = sortedTutorials().slice(0, 4);
    const products = sortedProducts().slice(0, 4);
    const locationLabel = getText(item, "locationVi", "locationEn") || "Smart Steam";
    const audienceLabel = getText(item, "audienceVi", "audienceEn") || (locale === "vi" ? "Linh hoạt" : "Flexible");
    const dateLabel = getProjectDateLabel(item);

    updateMeta(`${title} | STEMORA`, summary || intro);
    root.innerHTML = renderKnowledgeDetailLayout({
      variant: "project",
      archiveKey: "projects",
      archiveLabel: strings.nav.projects,
      eyebrow: locale === "vi" ? "Dự án" : "Project",
      title,
      summary: intro || summary,
      meta: [
        typeLabel,
        dateLabel,
        locationLabel,
        audienceLabel,
        item.durationLabel || "",
      ],
      backHref: getLocalePath("projects"),
      backLabel: locale === "vi" ? "Quay lại dự án" : "Back to projects",
      leadMediaHtml: renderKnowledgeLeadMedia(item, contentModel),
      contentHtml: contentModel.html,
      sidebarSections: [
        renderKnowledgeSidebarSection(locale === "vi" ? "Dự án liên quan" : "Related projects", related, {
          detailKey: "project-detail",
          metaFn: (entry) => getProjectTypeLabel(entry) || getProjectDateLabel(entry),
          titleFn: (entry) => getText(entry, "titleVi", "titleEn"),
        }),
        renderKnowledgeSidebarSection(locale === "vi" ? "Bài giảng gợi ý" : "Suggested tutorials", tutorials, {
          detailKey: "tutorial-detail",
          metaFn: (entry) => getText(entry, "categoryVi", "categoryEn") || entry.durationLabel,
          titleFn: (entry) => getText(entry, "titleVi", "titleEn"),
        }),
        renderKnowledgeSidebarSection(locale === "vi" ? "Sản phẩm gợi ý" : "Suggested products", products, {
          detailKey: "product-detail",
          kind: "product",
          metaFn: (entry) => locale === "vi" ? normalizeText(entry.priceVi || "Liên hệ") : normalizeText(entry.priceEn || "Contact us"),
          titleFn: (entry) => getText(entry, "titleVi", "titleEn"),
        }),
      ],
    });

    hydrateDynamicMedia(root);
    refreshInteractiveLayers(root);
    initCopyLink(root, locale === "vi" ? "\u0110\u00e3 sao ch\u00e9p li\u00ean k\u1ebft d\u1ef1 \u00e1n." : "Project link copied.");
    initDetailScaffold(root, {
      bodySelector: ".knowledge-detail__prose",
      progressSelector: ".knowledge-detail__progress .js-detail-progress-fill",
    });
  }

  function renderTutorialChapterDetail() {
    const root = $(".js-page-root");
    if (!root) return;
    const items = sortedTutorials();
    const item = items.find((entry) => entry.slug === slugFromPath() || entry.sourceSlug === slugFromPath());
    if (!item) return renderMissing(root, getLocalePath("tutorials"));

    const title = getText(item, "titleVi", "titleEn");
    const summary = getText(item, "summaryVi", "summaryEn");
    const categoryLabel = getText(item, "categoryVi", "categoryEn") || (locale === "vi" ? "B\u00e0i gi\u1ea3ng STEM" : "STEM tutorial");
    const difficultyLabel = normalizeText(item.difficulty || "") || (locale === "vi" ? "C\u01a1 b\u1ea3n" : "Beginner");
    const contentModel = buildArchiveContentModel(item, `tutorial-${item.slug}`, summary);
    const related = items
      .filter((entry) => entry.slug !== item.slug)
      .sort((left, right) => {
        const leftScore = Number(getText(left, "categoryVi", "categoryEn") === categoryLabel) * 3 + Number(left.views || 0) / 1000;
        const rightScore = Number(getText(right, "categoryVi", "categoryEn") === categoryLabel) * 3 + Number(right.views || 0) / 1000;
        return rightScore - leftScore || new Date(right.publishedAt || 0).getTime() - new Date(left.publishedAt || 0).getTime();
      })
      .slice(0, 4);
    const products = sortedProducts().slice(0, 4);
    const newsPicks = sortedNews().slice(0, 3);
    const authorLabel = getText(item, "authorVi", "authorEn") || "Smart Steam";
    const viewsLabel = locale === "vi"
      ? `${Number(item.views || 0).toLocaleString("vi-VN")} lượt xem`
      : `${Number(item.views || 0).toLocaleString("en-US")} views`;

    updateMeta(`${title} | STEMORA`, summary);
    root.innerHTML = renderKnowledgeDetailLayout({
      variant: "tutorial",
      archiveKey: "tutorials",
      archiveLabel: strings.nav.tutorials,
      eyebrow: locale === "vi" ? "Bài giảng" : "Tutorial",
      title,
      summary,
      meta: [
        authorLabel,
        viewsLabel,
        difficultyLabel,
        item.durationLabel || (locale === "vi" ? "Không xác định" : "Flexible"),
        formatArchiveDate(item.publishedAt),
      ],
      backHref: getLocalePath("tutorials"),
      backLabel: locale === "vi" ? "Quay lại thư viện" : "Back to tutorials",
      leadMediaHtml: renderKnowledgeLeadMedia(item, contentModel),
      contentHtml: contentModel.html,
      sidebarSections: [
        renderKnowledgeSidebarSection(locale === "vi" ? "Sản phẩm gợi ý" : "Suggested products", products, {
          detailKey: "product-detail",
          kind: "product",
          metaFn: (entry) => locale === "vi" ? normalizeText(entry.priceVi || "Liên hệ") : normalizeText(entry.priceEn || "Contact us"),
        }),
        renderKnowledgeSidebarSection(locale === "vi" ? "Tin tức gợi ý" : "Suggested news", newsPicks, {
          detailKey: "news-detail",
          metaFn: (entry) => formatArchiveDate(entry.publishedAt),
          summaryFn: (entry) => getText(entry, "summaryVi", "summaryEn"),
        }),
        renderKnowledgeSidebarSection(locale === "vi" ? "Bài giảng liên quan" : "Related tutorials", related, {
          detailKey: "tutorial-detail",
          metaFn: (entry) => getText(entry, "categoryVi", "categoryEn") || formatArchiveDate(entry.publishedAt),
          summaryFn: (entry) => getText(entry, "summaryVi", "summaryEn"),
        }),
      ],
    });

    hydrateDynamicMedia(root);
    refreshInteractiveLayers(root);
    initCopyLink(root, locale === "vi" ? "Đã sao chép liên kết bài giảng." : "Tutorial link copied.");
    initDetailScaffold(root, {
      bodySelector: ".knowledge-detail__prose",
      progressSelector: ".knowledge-detail__progress .js-detail-progress-fill",
    });
    return;

    updateMeta(`${title} | STEMORA`, summary);
    root.innerHTML = `
      <section class="tutorial-chapter">
        <div class="detail-reading-progress tutorial-chapter__progress">
          <span class="js-detail-progress-fill"></span>
        </div>
        <div class="container tutorial-chapter__shell">
          ${renderDetailBreadcrumb("tutorials", strings.nav.tutorials, title)}

          <section class="tutorial-chapter__hero">
            <div class="tutorial-chapter__media" data-stage="hero">
              ${renderMedia(item.cover, "", { priority: true, stage: "hero" })}
            </div>

            <div class="tutorial-chapter__dashboard" data-stage="copy">
              <p class="scene-kicker">${locale === "vi" ? "Lesson board" : "Lesson board"}</p>
              ${renderArchiveMetaRow([
                formatArchiveDate(item.publishedAt),
                categoryLabel,
                item.durationLabel,
              ])}
              <h1>${escapeHtmlText(title)}</h1>
              ${summary ? `<p class="tutorial-chapter__summary">${escapeHtmlText(summary)}</p>` : ""}
              <div class="tutorial-chapter__metric-grid">
                <article><span>${locale === "vi" ? "Th\u1eddi l\u01b0\u1ee3ng" : "Duration"}</span><strong>${escapeHtmlText(item.durationLabel || (locale === "vi" ? "T\u00f9y b\u00e0i" : "Flexible"))}</strong></article>
                <article><span>${locale === "vi" ? "\u0110\u1ed9 kh\u00f3" : "Level"}</span><strong>${escapeHtmlText(difficultyLabel)}</strong></article>
                <article><span>${locale === "vi" ? "L\u01b0\u1ee3t xem" : "Views"}</span><strong>${Number(item.views || 0).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}</strong></article>
                <article><span>${locale === "vi" ? "Y\u00eau th\u00edch" : "Likes"}</span><strong>${Number(item.likes || 0).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}</strong></article>
              </div>
              ${Array.isArray(item.tags) && item.tags.length ? `
                <div class="editorial-tag-list">
                  ${item.tags.slice(0, 10).map((tag) => `<span class="editorial-tag">${escapeHtmlText(tag)}</span>`).join("")}
                </div>
              ` : ""}
              <div class="tutorial-chapter__actions">
                <a class="button button--primary" href="${getLocalePath("tutorials")}" data-transition>${locale === "vi" ? "Quay l\u1ea1i th\u01b0 vi\u1ec7n" : "Back to tutorials"}</a>
                <button class="share-button js-copy-link" type="button">${locale === "vi" ? "Sao ch\u00e9p link" : "Copy link"}</button>
                <span class="share-feedback js-share-feedback" aria-live="polite"></span>
              </div>
            </div>
          </section>

          <section class="tutorial-chapter__content">
            <aside class="tutorial-chapter__sidebar">
              ${renderDetailOutlinePanel(
                locale === "vi" ? "L\u1ed9 tr\u00ecnh b\u00e0i h\u1ecdc" : "Lesson map",
                locale === "vi" ? "C\u00e1c b\u01b0\u1edbc ch\u00ednh" : "Main steps",
                contentModel.headings,
                locale === "vi" ? "B\u00e0i gi\u1ea3ng n\u00e0y kh\u00f4ng chia th\u00e0nh heading." : "This tutorial does not include section headings."
              )}
              <article class="tutorial-chapter__coach contact-panel" data-motion="scene-enter">
                <p class="scene-kicker">${locale === "vi" ? "Lesson mode" : "Lesson mode"}</p>
                <h3>${escapeHtmlText(categoryLabel)}</h3>
                <p>${locale === "vi"
                  ? `${contentModel.readingMinutes} ph\u00fat \u0111\u1ecdc \u2022 ${contentModel.headings.length || 1} ch\u1eb7ng n\u1ed9i dung \u2022 ${difficultyLabel}`
                  : `${contentModel.readingMinutes} min read • ${contentModel.headings.length || 1} sections • ${difficultyLabel}`}</p>
              </article>
            </aside>

            <article class="contact-panel editorial-article-body tutorial-chapter__body js-detail-body" data-motion="scene-enter">
              ${contentModel.html}
            </article>
          </section>

          ${renderDetailRelatedSection(related, {
            className: "tutorial-chapter__related",
            eyebrow: locale === "vi" ? "B\u00e0i gi\u1ea3ng li\u00ean quan" : "Related tutorials",
            title: locale === "vi" ? "Ti\u1ebfp t\u1ee5c track n\u00e0y" : "Continue this learning track",
            detailKey: "tutorial-detail",
          })}
        </div>
      </section>
    `;

    hydrateDynamicMedia(root);
    refreshInteractiveLayers(root);
    initCopyLink(root, locale === "vi" ? "\u0110\u00e3 sao ch\u00e9p li\u00ean k\u1ebft b\u00e0i gi\u1ea3ng." : "Tutorial link copied.");
    initDetailScaffold(root, {
      bodySelector: ".tutorial-chapter__body",
      progressSelector: ".tutorial-chapter__progress .js-detail-progress-fill",
    });
  }

  function renderNewsDossierDetail() {
    const root = $(".js-page-root");
    if (!root) return;
    const items = sortedNews();
    const item = items.find((entry) => entry.slug === slugFromPath() || entry.sourceSlug === slugFromPath());
    if (!item) return renderMissing(root, getLocalePath("news"));

    const title = getText(item, "titleVi", "titleEn");
    const summary = getText(item, "summaryVi", "summaryEn");
    const categoryLabel = getText(item, "categoryVi", "categoryEn") || (locale === "vi" ? "Tin m\u1edbi" : "Update");
    const authorLabel = getText(item, "authorVi", "authorEn") || "Smart Steam";
    const contentModel = buildArchiveContentModel(item, `news-${item.slug}`, summary);
    const related = items
      .filter((entry) => entry.slug !== item.slug)
      .sort((left, right) => {
        const leftScore = Number(getText(left, "categoryVi", "categoryEn") === categoryLabel) * 3 + Number(Boolean(left.isFeatured));
        const rightScore = Number(getText(right, "categoryVi", "categoryEn") === categoryLabel) * 3 + Number(Boolean(right.isFeatured));
        return rightScore - leftScore || new Date(right.publishedAt || 0).getTime() - new Date(left.publishedAt || 0).getTime();
      })
      .slice(0, 3);
    const products = sortedProducts().slice(0, 4);
    const tutorialPicks = sortedTutorials().slice(0, 3);
    const readingLabel = locale === "vi" ? `${contentModel.readingMinutes} phút đọc` : `${contentModel.readingMinutes} min read`;

    updateMeta(`${title} | STEMORA`, summary);
    root.innerHTML = renderKnowledgeDetailLayout({
      variant: "news",
      archiveKey: "news",
      archiveLabel: strings.nav.news,
      eyebrow: locale === "vi" ? "Tin tức" : "News",
      title,
      summary,
      meta: [
        authorLabel,
        categoryLabel,
        readingLabel,
        formatArchiveDate(item.publishedAt),
      ],
      backHref: getLocalePath("news"),
      backLabel: locale === "vi" ? "Quay lại tin tức" : "Back to news",
      leadMediaHtml: renderKnowledgeLeadMedia(item, contentModel),
      contentHtml: contentModel.html,
      sidebarSections: [
        renderKnowledgeSidebarSection(locale === "vi" ? "Sản phẩm gợi ý" : "Suggested products", products, {
          detailKey: "product-detail",
          kind: "product",
          metaFn: (entry) => locale === "vi" ? normalizeText(entry.priceVi || "Liên hệ") : normalizeText(entry.priceEn || "Contact us"),
        }),
        renderKnowledgeSidebarSection(locale === "vi" ? "Bài giảng gợi ý" : "Suggested tutorials", tutorialPicks, {
          detailKey: "tutorial-detail",
          metaFn: (entry) => getText(entry, "categoryVi", "categoryEn") || formatArchiveDate(entry.publishedAt),
          summaryFn: (entry) => getText(entry, "summaryVi", "summaryEn"),
        }),
        renderKnowledgeSidebarSection(locale === "vi" ? "Tin tức liên quan" : "Related news", related, {
          detailKey: "news-detail",
          metaFn: (entry) => formatArchiveDate(entry.publishedAt),
          summaryFn: (entry) => getText(entry, "summaryVi", "summaryEn"),
        }),
      ],
    });

    hydrateDynamicMedia(root);
    refreshInteractiveLayers(root);
    initCopyLink(root, locale === "vi" ? "Đã sao chép liên kết tin tức." : "News link copied.");
    initDetailScaffold(root, {
      bodySelector: ".knowledge-detail__prose",
      progressSelector: ".knowledge-detail__progress .js-detail-progress-fill",
    });
    return;

    updateMeta(`${title} | STEMORA`, summary);
    root.innerHTML = `
      <section class="news-dossier">
        <div class="detail-reading-progress news-dossier__progress">
          <span class="js-detail-progress-fill"></span>
        </div>
        <div class="container news-dossier__shell">
          ${renderDetailBreadcrumb("news", strings.nav.news, title)}

          <section class="news-dossier__hero">
            <div class="news-dossier__copy" data-stage="copy">
              <p class="scene-kicker">${locale === "vi" ? "Signal dossier" : "Signal dossier"}</p>
              ${renderArchiveMetaRow([
                formatArchiveDate(item.publishedAt),
                categoryLabel,
                authorLabel,
              ])}
              <h1>${escapeHtmlText(title)}</h1>
              ${summary ? `<p class="news-dossier__summary">${escapeHtmlText(summary)}</p>` : ""}
              <div class="news-dossier__deck">
                <article><span>${locale === "vi" ? "Xu\u1ea5t b\u1ea3n" : "Published"}</span><strong>${escapeHtmlText(formatArchiveDate(item.publishedAt))}</strong></article>
                <article><span>${locale === "vi" ? "Chuy\u00ean m\u1ee5c" : "Category"}</span><strong>${escapeHtmlText(categoryLabel)}</strong></article>
                <article><span>${locale === "vi" ? "Reading time" : "Reading time"}</span><strong>${contentModel.readingMinutes} ${locale === "vi" ? "ph\u00fat" : "min"}</strong></article>
              </div>
              <div class="news-dossier__actions">
                <button class="share-button js-copy-link" type="button">${locale === "vi" ? "Sao ch\u00e9p link" : "Copy link"}</button>
                <a class="button button--ghost" href="${getLocalePath("news")}" data-transition>${locale === "vi" ? "Quay l\u1ea1i newsroom" : "Back to newsroom"}</a>
                <span class="share-feedback js-share-feedback" aria-live="polite"></span>
              </div>
            </div>

            <div class="news-dossier__media" data-stage="hero">
              ${renderMedia(item.cover, "", { priority: true, stage: "hero" })}
              ${Array.isArray(item.tags) && item.tags.length ? `
                <div class="news-dossier__tag-band">
                  ${item.tags.slice(0, 10).map((tag) => `<span>${escapeHtmlText(tag)}</span>`).join("")}
                </div>
              ` : ""}
            </div>
          </section>

          <section class="news-dossier__story">
            <article class="contact-panel editorial-article-body news-dossier__body js-detail-body" data-motion="scene-enter">
              ${contentModel.html}
            </article>

            <aside class="news-dossier__rail">
              ${renderDetailOutlinePanel(
                locale === "vi" ? "Story map" : "Story map",
                locale === "vi" ? "M\u1ee5c \u0111ang \u0111\u1ecdc" : "Current thread",
                contentModel.headings,
                locale === "vi" ? "B\u00e0i vi\u1ebft n\u00e0y kh\u00f4ng c\u00f3 heading n\u1ed9i dung." : "No section headings are available for this article."
              )}
              <article class="news-dossier__bulletin contact-panel" data-motion="scene-enter">
                <p class="scene-kicker">${locale === "vi" ? "Tin nhanh" : "Quick signal"}</p>
                <h3>${escapeHtmlText(authorLabel)}</h3>
                <p>${locale === "vi"
                  ? `${contentModel.readingMinutes} ph\u00fat \u0111\u1ecdc \u2022 ${contentModel.imageCount || 1} media \u2022 ${contentModel.paragraphCount || 1} \u0111o\u1ea1n n\u1ed9i dung`
                  : `${contentModel.readingMinutes} min read • ${contentModel.imageCount || 1} media blocks • ${contentModel.paragraphCount || 1} sections of copy`}</p>
              </article>
              ${related.length ? `
                <div class="news-dossier__stack">
                  ${related.map((entry, index) => `
                    <a class="news-dossier__stack-item" href="${getLocalePath("news-detail", entry.slug)}" data-transition data-motion="scene-enter">
                      <div class="news-dossier__stack-thumb">${renderMedia(entry.cover, "", { tier: index < 2 ? "near" : "deferred" })}</div>
                      <div>
                        <span>${escapeHtmlText(formatArchiveDate(entry.publishedAt))}</span>
                        <strong>${escapeHtmlText(getText(entry, "titleVi", "titleEn"))}</strong>
                      </div>
                    </a>
                  `).join("")}
                </div>
              ` : ""}
            </aside>
          </section>
        </div>
      </section>
    `;

    hydrateDynamicMedia(root);
    refreshInteractiveLayers(root);
    initCopyLink(root, locale === "vi" ? "\u0110\u00e3 sao ch\u00e9p li\u00ean k\u1ebft tin t\u1ee9c." : "News link copied.");
    initDetailScaffold(root, {
      bodySelector: ".news-dossier__body",
      progressSelector: ".news-dossier__progress .js-detail-progress-fill",
    });
  }

  function renderProjectDetailPage() {
    renderProjectCaseDetail();
  }

  function renderNewsPage() {
    const root = $(".js-page-root");
    if (!root) return;
    updateMeta(strings.pageMeta.news.title, strings.pageMeta.news.description);
    return renderNewsPageShowcase();
    root.innerHTML = `
      <section class="page-intro">
        <div class="container page-intro__layout">
          <div class="page-intro__copy" data-stage="copy">
            <p class="scene-kicker">${locale === 'vi' ? 'Tin tức' : 'News'}</p>
            <h1 class="editorial-title">${locale === 'vi' ? 'Tin tức & Cập nhật' : 'News & Updates'}</h1>
            <p class="scene-body">${locale === 'vi' ? 'Trang tin tức đang được cập nhật. Vui lòng quay lại sau.' : 'News page is being updated. Please check back later.'}</p>
          </div>
        </div>
      </section>
    `;
  }

  function renderTutorialsPage() {
    const root = $(".js-page-root");
    if (!root) return;
    updateMeta(strings.pageMeta.tutorials.title, strings.pageMeta.tutorials.description);
    return renderTutorialsPageShowcase();
    root.innerHTML = `
      <section class="page-intro">
        <div class="container page-intro__layout">
          <div class="page-intro__copy" data-stage="copy">
            <p class="scene-kicker">${locale === 'vi' ? 'Bài giảng' : 'Tutorials'}</p>
            <h1 class="editorial-title">${locale === 'vi' ? 'Bài giảng STEM' : 'STEM Tutorials'}</h1>
            <p class="scene-body">${locale === 'vi' ? 'Thư viện bài giảng đang được cập nhật. Vui lòng quay lại sau.' : 'Tutorials library is being updated. Please check back later.'}</p>
          </div>
        </div>
      </section>
    `;
  }

  function renderContactPage() {
    const root = $(".js-page-root");
    if (!root) return;
    updateMeta(strings.pageMeta.contact.title, strings.pageMeta.contact.description);
    const contactData = data.siteMeta.contact || {};
    const contactAddress = contactData.address ? normalizeText(contactData.address[locale] || "") : "";
    const contactHours = contactData.hours ? normalizeText(contactData.hours[locale] || "") : "";
    const contactChannels = [
      contactData.email
        ? `<a href="mailto:${normalizeText(contactData.email)}">${normalizeText(contactData.email)}</a>`
        : "",
      contactData.phone
        ? `<a href="tel:${normalizeText(contactData.phone).replace(/\s+/g, "")}">${normalizeText(contactData.phone)}</a>`
        : "",
      contactAddress ? `<span>${contactAddress}</span>` : "",
      contactHours ? `<span>${contactHours}</span>` : "",
    ].filter(Boolean).join("");
    const socialLinks = (Array.isArray(data.siteMeta.socials) ? data.siteMeta.socials : [])
      .filter((item) => item && item.href && !String(item.href).startsWith("#"))
      .map((item) => `<a href="${resolveAssetSource(item.href)}" target="_blank" rel="noreferrer">${escapeHtmlText(item.label)}</a>`)
      .join("");

    root.innerHTML = `
      <section class="page-intro page-intro--contact">
        <div class="container page-intro__layout">
          <div class="page-intro__copy" data-stage="copy">
            <p class="scene-kicker">${strings.contactPage.eyebrow}</p>
            <h1 class="editorial-title">${strings.contactPage.title}</h1>
            <p class="scene-body">${strings.contactPage.intro}</p>
          </div>
          <div class="page-intro__visual" data-stage="hero">
            ${renderMedia(data.siteMeta.pageAssets.contact, "", { priority: true, stage: "hero" })}
          </div>
        </div>
      </section>
      <section class="contact-page">
        <div class="container contact-page__grid">
          <div class="contact-page__info">
            <article class="contact-panel" data-motion="scene-enter">
              <p class="scene-kicker">${strings.contactPage.channelsTitle}</p>
              <p>${strings.contactPage.channelsIntro}</p>
              <div class="contact-channel-list">
                ${contactChannels}
              </div>
            </article>
            ${socialLinks ? `<article class="contact-panel" data-motion="scene-enter">
              <p class="scene-kicker">${strings.contactPage.socialTitle}</p>
              <p>${strings.contactPage.socialIntro}</p>
              <div class="contact-socials">
                ${socialLinks}
              </div>
            </article>` : ""}
            <article class="contact-panel contact-panel--map" data-motion="scene-enter">
              <p class="scene-kicker">${strings.contactPage.mapTitle}</p>
              <p>${strings.contactPage.mapCopy}</p>
              <a class="button button--ghost" href="${normalizeText(contactData.mapUrl || "#")}" target="_blank" rel="noreferrer">${strings.actions.viewMap}</a>
            </article>
          </div>
          <div class="contact-page__form">
            <article class="contact-form-wrap" data-motion="scene-enter">
              <p class="scene-kicker">${strings.contactPage.formTitle}</p>
              <p>${strings.contactPage.formIntro}</p>
              <form class="contact-form js-contact-form">
                <label>
                  <span>${strings.form.name}</span>
                  <input name="name" type="text" required>
                </label>
                <label>
                  <span>${strings.form.email}</span>
                  <input name="email" type="email" required>
                </label>
                <label>
                  <span>${strings.form.phone}</span>
                  <input name="phone" type="tel" required>
                </label>
                <label>
                  <span>${strings.form.interest}</span>
                  <select name="interest" required>
                    <option value="">${strings.form.interest}</option>
                    ${strings.form.interests.map((entry) => `<option value="${entry}">${entry}</option>`).join("")}
                  </select>
                </label>
                <label class="contact-form__full">
                  <span>${strings.form.message}</span>
                  <textarea name="message" rows="6" required></textarea>
                </label>
                <label class="contact-form__consent">
                  <input name="consent" type="checkbox" required>
                  <span>${strings.form.consent}</span>
                </label>
                <div class="contact-form__actions">
                  <button class="button button--primary js-contact-submit" type="submit">${strings.form.submit}</button>
                  <a class="button button--ghost" href="${getLocalePath("policy")}" data-transition>${strings.actions.readPolicy}</a>
                </div>
                <p class="contact-form__feedback js-form-feedback" aria-live="polite"></p>
              </form>
            </article>
            <article class="contact-panel contact-panel--policy" data-motion="scene-enter">
              <p>${strings.contactPage.policyLead}</p>
              <a class="button button--ghost" href="${getLocalePath("policy")}" data-transition>${strings.actions.policySupport}</a>
            </article>
          </div>
        </div>
      </section>
    `;
  }

  function renderPolicyPages() {
    const root = $(".js-page-root");
    if (!root) return;
    const slug = slugFromPath();
    const item = data.policies.find((entry) => entry.slug === slug) || data.policies[0];
    updateMeta(
      item ? `${locale === "vi" ? item.titleVi : item.titleEn} | STEMORA` : strings.pageMeta.policy.title,
      item ? (locale === "vi" ? item.summaryVi : item.summaryEn) : strings.pageMeta.policy.description
    );

    root.innerHTML = `
      <section class="page-intro page-intro--policy">
        <div class="container page-intro__layout">
          <div class="page-intro__copy" data-stage="copy">
            <p class="scene-kicker">${strings.policyPage.eyebrow}</p>
            <h1 class="editorial-title">${strings.policyPage.title}</h1>
            <p class="scene-body">${strings.policyPage.intro}</p>
          </div>
          <div class="page-intro__visual" data-stage="hero">
            ${renderMedia(data.siteMeta.pageAssets.policy, "", { priority: true, alt: "", stage: "hero" })}
          </div>
        </div>
      </section>
      <section class="policy-cluster">
        <div class="container policy-cluster__grid">
          <aside class="policy-nav">
            <p class="scene-kicker">${strings.policyPage.topicsLabel}</p>
            <div class="policy-nav__list">
              ${data.policies
        .map(
          (entry) => `
                    <a class="policy-nav__item ${item.slug === entry.slug ? "is-active" : ""}" href="${getLocalePath("policy-detail", entry.slug)}" data-transition>
                      <strong>${locale === "vi" ? entry.titleVi : entry.titleEn}</strong>
                      <span>${locale === "vi" ? entry.summaryVi : entry.summaryEn}</span>
                    </a>
                  `
        )
        .join("")}
            </div>
          </aside>
          <div class="policy-detail">
            <div class="policy-detail__head">
              <p class="scene-kicker">${strings.policyPage.detailLabel}</p>
              <h2>${locale === "vi" ? item.titleVi : item.titleEn}</h2>
              <p>${locale === "vi" ? item.summaryVi : item.summaryEn}</p>
            </div>
            <div class="policy-detail__sections">
              ${item.sections
        .map(
          (section) => `
                    <article class="policy-detail__section" data-motion="scene-enter">
                      <h3>${getText(section, "headingVi", "headingEn")}</h3>
                      <p>${getText(section, "bodyVi", "bodyEn")}</p>
                    </article>
                  `
        )
        .join("")}
            </div>
            <div class="policy-detail__cta">
              <div>
                <strong>${strings.policyPage.ctaTitle}</strong>
                <p>${strings.policyPage.ctaCopy}</p>
              </div>
              <a class="button button--primary" href="${getLocalePath("contact")}" data-transition>${strings.actions.getConsultation}</a>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function renderNewsPageLegacy() {
    const root = $(".js-page-root");
    if (!root) return;
    const items = sortedNews();
    updateMeta(strings.pageMeta.news.title, strings.pageMeta.news.description);

    root.innerHTML = `
      ${renderArchiveHeroShell(
        locale === "vi" ? "Tin tức" : "News",
        locale === "vi" ? "Tin tức & Cập nhật" : "News & Updates",
        locale === "vi"
          ? "Các bài viết, bản tin và cập nhật công nghệ được lấy trực tiếp từ dữ liệu gốc."
          : "Articles, reports, and technology updates are rendered directly from the source archive.",
        items[0] ? items[0].cover : data.siteMeta.pageAssets.projects
      )}
      ${renderCollectionEntries(items, "news-detail", locale === "vi" ? "Chưa có bài tin nào để hiển thị." : "No news entries available.")}
    `;

    hydrateDynamicMedia(root);
    refreshInteractiveLayers(root);
  }

  function renderTutorialsPageLegacy() {
    const root = $(".js-page-root");
    if (!root) return;
    const items = sortedTutorials();
    updateMeta(strings.pageMeta.tutorials.title, strings.pageMeta.tutorials.description);

    root.innerHTML = `
      ${renderArchiveHeroShell(
        locale === "vi" ? "Bài giảng" : "Tutorials",
        locale === "vi" ? "Thư viện bài giảng STEM" : "STEM Tutorial Library",
        locale === "vi"
          ? "Toàn bộ bài giảng và học liệu được lấy từ dữ liệu gốc, giữ đúng ảnh, tác giả, thời lượng và nội dung."
          : "Every tutorial is rendered from the source archive with original images, authors, duration, and content.",
        items[0] ? items[0].cover : data.siteMeta.pageAssets.products
      )}
      ${renderCollectionEntries(items, "tutorial-detail", locale === "vi" ? "Chưa có bài giảng nào để hiển thị." : "No tutorials available.")}
    `;

    hydrateDynamicMedia(root);
    refreshInteractiveLayers(root);
  }

  function renderTutorialDetailPage() {
    renderTutorialChapterDetail();
  }

  function renderNewsDetailPage() {
    renderNewsDossierDetail();
  }

  function renderMissing(root, fallbackHref) {
    root.innerHTML = `
      <section class="page-missing">
        <div class="container page-missing__panel">
          <h1>Content unavailable</h1>
          <p>The requested page could not be rendered from the current dataset.</p>
          <a class="button button--primary" href="${fallbackHref}" data-transition>Back</a>
        </div>
      </section>
    `;
  }

  function initContactForm() {
    const form = $(".js-contact-form");
    if (!form) return;
    const submitButton = $(".js-contact-submit", form);
    const feedback = $(".js-form-feedback", form);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitButton.disabled = true;
      submitButton.textContent = strings.form.sending;
      form.setAttribute("aria-busy", "true");
      feedback.textContent = "";

      window.setTimeout(() => {
        form.reset();
        form.removeAttribute("aria-busy");
        submitButton.disabled = false;
        submitButton.textContent = strings.form.submit;
        feedback.textContent = strings.form.success;
      }, 900);
    });
  }

  function initHero3DCanvas(root) {
    const canvas = $('.js-hero-3d-canvas', root);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let rafId = 0;
    let isDisposed = false;
    let w, h;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resize);
    resize();

    const nodes = [];
    const maxNodes = 120;
    const connectionRadius = 220;
    let time = 0;

    for (let i = 0; i < maxNodes; i++) {
      nodes.push({
        x: Math.random() * 2400 - 1200,
        y: Math.random() * 1000 - 500,
        z: Math.random() * 2000,
        vx: 0,
        vy: 0,
        vz: (Math.random() - 0.5) * 1.5 - 2.5
      });
    }

    const fov = 800;

    function getCanvasPalette() {
      if (getWelcomeTheme() === "light") {
        return {
          theme: "light",
          opacity: "0.5",
          grid: "rgba(191, 98, 49, 0.05)",
          nodeRgb: "115, 150, 174",
          nodeBoost: 0.95,
          linkRgb: "191, 98, 49",
          linkBoost: 0.5,
        };
      }

      return {
        theme: "dark",
        opacity: "0.85",
        grid: "rgba(191, 98, 49, 0.08)",
        nodeRgb: "137, 168, 184",
        nodeBoost: 1.5,
        linkRgb: "191, 98, 49",
        linkBoost: 0.9,
      };
    }

    function renderNode(node) {
      const scale = fov / (fov + node.z);
      return {
        x: w / 2 + node.x * scale,
        y: h / 2 + node.y * scale,
        scale: scale
      };
    }

    function loop() {
      if (isDisposed) return;

      const palette = getCanvasPalette();
      canvas.dataset.theme = palette.theme;
      canvas.style.opacity = palette.opacity;

      ctx.clearRect(0, 0, w, h);
      time += 0.01;

      ctx.lineWidth = 1.0;
      for (let i = -1200; i <= 1200; i += 200) {
        let trackZOffset = (time * 250) % 200;
        const p1 = renderNode({ x: i, y: 500, z: -trackZOffset });
        const p2 = renderNode({ x: i, y: 500, z: 2000 - trackZOffset });

        ctx.strokeStyle = palette.grid;
        if (p1.scale > 0 && p2.scale > 0) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }

        const ph1 = renderNode({ x: -1200, y: 500, z: i * 1.5 + trackZOffset });
        const ph2 = renderNode({ x: 1200, y: 500, z: i * 1.5 + trackZOffset });
        if (ph1.scale > 0 && ph2.scale > 0) {
          ctx.beginPath();
          ctx.moveTo(ph1.x, ph1.y);
          ctx.lineTo(ph2.x, ph2.y);
          ctx.stroke();
        }
      }

      for (let i = 0; i < nodes.length; i++) {
        let node = nodes[i];
        node.z += node.vz;

        if (node.z < 10) {
          node.z = 2000;
          node.x = Math.random() * 2400 - 1200;
          node.y = Math.random() * 1000 - 500;
        }

        const proj = renderNode(node);
        if (proj.scale > 0) {
          ctx.fillStyle = `rgba(${palette.nodeRgb}, ${proj.scale * palette.nodeBoost})`;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, Math.max(0.5, 3 * proj.scale), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.lineWidth = 1.5;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          let n1 = nodes[i];
          let n2 = nodes[j];
          let dist = Math.sqrt((n1.x - n2.x) ** 2 + (n1.y - n2.y) ** 2 + (n1.z - n2.z) ** 2);

          if (dist < connectionRadius) {
            let p1 = renderNode(n1);
            let p2 = renderNode(n2);
            if (p1.scale > 0 && p2.scale > 0) {
              ctx.strokeStyle = `rgba(${palette.linkRgb}, ${(1 - dist / connectionRadius) * p1.scale * palette.linkBoost})`;
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        }
      }

      rafId = requestAnimationFrame(loop);
    }

    registerPageCleanup(root, () => {
      isDisposed = true;
      window.removeEventListener('resize', resize);
      if (rafId) cancelAnimationFrame(rafId);
    });

    loop();
  }

  function initCopyLink(root, successMessage) {
    const button = $(".js-copy-link", root);
    const feedback = $(".js-share-feedback", root);
    if (!button || !navigator.clipboard) return;

    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        feedback.textContent = successMessage;
      } catch (error) {
        feedback.textContent = strings.actions.copied;
      }
    });
  }

  async function startApp() {
    ensureShell();
    initWelcomeTheme();
    initGlobalShell();
    initWelcomeTheme();
    initPageTransition();
    initMenuOverlay();
    await loadMigratedArchiveData();
    renderCurrentPage();
    initTextNormalizer();
    bindStableMedia(document);
    initPreloader();
  }

  startApp();
})();
