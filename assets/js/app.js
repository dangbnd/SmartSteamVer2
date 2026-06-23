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
    ["Tat ca khoang gia", "TẤT CẢ KHOẢNG GIÁ"],
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
  const THREE_MODULE_URL = "/assets/vendor/three/three.module.min.js";
  const GLTF_LOADER_MODULE_URL = "/assets/vendor/three/GLTFLoader.js";
  const PUBLIC_ARCHIVE_ENDPOINT = `/assets/data/archive.json${ASSET_VERSION}`;
  const PUBLIC_PRODUCTS_ENDPOINT = `/assets/data/products.json${ASSET_VERSION}`;
  const PUBLIC_PROJECTS_ENDPOINT = `/assets/data/projects.json${ASSET_VERSION}`;
  const PUBLIC_POLICIES_ENDPOINT = `/assets/data/policies.json${ASSET_VERSION}`;
  const PUBLIC_DATA_FETCH_TIMEOUT_MS = Math.max(3000, Number(runtimeTuning.publicDataTimeoutMs) || 9000);
  const PUBLIC_DATA_RETRY_DELAY_MS = 180;
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
    productsDataPromise: null,
    projectsDataPromise: null,
    policiesDataPromise: null,
    experienceStarted: false,
    pageExperiencePromise: null,
    transitionPending: sessionStorage.getItem("smartsteam_transition_pending") === "1",
    transitionStarted: false,
    textNormalizationObserver: null,
    textNormalizeRaf: 0,
    normalizingText: false,
    welcomeThemeInitialized: false,
    mediaLoadPromises: new Map(),
    mediaLoadedSources: new Set(),
    performanceAutoFloor: "full",
    performanceMetrics: null,
    productSceneBootUntil: 0,
  };
  const GROUPS = ["age", "theme", "format", "occasion", "difficulty"];
  const APP_THEME_STORAGE_KEY = "smartsteam:theme";
  const WELCOME_THEME_STORAGE_KEY = "smartsteam:welcome-theme";
  const THEME_DEFAULT_VERSION_STORAGE_KEY = "smartsteam:theme-default-version";
  const LIGHT_THEME_DEFAULT_VERSION = "20260604-light";
  const PROJECT_ARCHIVE_SCROLL_KEY = "smartsteam:project-archive-scroll";
  const PERFORMANCE_PROFILE_STORAGE_KEY = "smartsteam:performance-profile:v4";
  const PERFORMANCE_MODES = ["auto", "full", "balanced", "safe"];
  const PERFORMANCE_MODE_RANK = { full: 0, balanced: 1, safe: 2 };
  const BACKGROUND_3D_PAGES = new Set(["welcome", "products", "projects", "tutorials", "news", "contact"]);
  const SHARED_3D_BACKGROUND_PAGES = new Set(["projects", "tutorials", "news", "contact"]);
  let threeModulePromise = null;
  let gltfLoaderModulePromise = null;

  const performanceModeListeners = new Set();
  const performanceModeState = {
    preference: "auto",
    auto: "full",
    applied: "full",
    details: null,
    reason: "boot",
  };

  function isValidPerformanceMode(mode) {
    return PERFORMANCE_MODES.indexOf(mode) !== -1;
  }

  function normalizePerformanceMode(mode) {
    const normalized = String(mode || "").toLowerCase().trim();
    return isValidPerformanceMode(normalized) ? normalized : "";
  }

  function getWorstPerformanceMode(leftMode, rightMode) {
    const left = PERFORMANCE_MODE_RANK[leftMode] || 0;
    const right = PERFORMANCE_MODE_RANK[rightMode] || 0;
    return left >= right ? leftMode : rightMode;
  }

  function getPerformanceQueryMode() {
    try {
      const params = new URLSearchParams(window.location.search || "");
      return normalizePerformanceMode(params.get("perf") || params.get("performance"));
    } catch (error) {
      return "";
    }
  }

  function getRequestedPerformanceMode() {
    return getPerformanceQueryMode() || "auto";
  }

  function shouldEnableHeavyBackground() {
    const requestedMode = getPerformanceQueryMode();
    return requestedMode === "balanced" || requestedMode === "full";
  }

  function isMobileViewport() {
    return Math.min(window.innerWidth || 9999, window.innerHeight || 9999) <= 760;
  }

  function isSiteMenuOpen() {
    return Boolean(state.menuOpen || body.classList.contains("menu-open"));
  }

  function shouldPauseBackgroundForMenu() {
    return isMobileViewport() && isSiteMenuOpen();
  }

  function isMobilePerformanceTarget(details) {
    const minSide = Math.min(window.innerWidth || 9999, window.innerHeight || 9999);
    return minSide <= 760;
  }

  function shouldResetPerformanceProfile() {
    try {
      const params = new URLSearchParams(window.location.search || "");
      return params.get("resetPerf") === "1" || params.get("performanceReset") === "1";
    } catch (error) {
      return false;
    }
  }

  function getStoredPerformanceProfile(details) {
    if (shouldResetPerformanceProfile()) {
      try { localStorage.removeItem(PERFORMANCE_PROFILE_STORAGE_KEY); } catch (error) {}
      return null;
    }
    try {
      const profile = JSON.parse(localStorage.getItem(PERFORMANCE_PROFILE_STORAGE_KEY) || "null");
      if (!profile || profile.version !== 4) return null;
      if (profile.signature !== getPerformanceSignature(details)) return null;
      const mode = normalizePerformanceMode(profile.mode);
      if (!mode || mode === "auto") return null;
      return Object.assign({}, profile, { mode });
    } catch (error) {
      return null;
    }
  }

  function savePerformanceProfile(profile) {
    try {
      localStorage.setItem(PERFORMANCE_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch (error) {}
  }

  function getPerformanceSignature(details) {
    const renderer = normalizeText((details && details.renderer) || "").toLowerCase().slice(0, 96);
    const vendor = normalizeText((details && details.vendor) || "").toLowerCase().slice(0, 64);
    const cores = navigator.hardwareConcurrency || 0;
    const memory = navigator.deviceMemory || 0;
    return [
      details && details.webgl ? "webgl" : "no-webgl",
      details && details.softwareLike ? "software" : "gpu",
      details && details.automationLike ? "automation" : "human",
      details && details.headlessLike ? "headless" : "headed",
      details && details.weakGpu ? "weak" : "ok",
      details && details.lowCpu ? "lowcpu" : "cpu",
      details && details.lowMemory ? "lowmem" : "mem",
      details && details.reducedMotion ? "reduced" : "motion",
      `c${cores}`,
      `m${memory}`,
      vendor,
      renderer,
    ].join("|");
  }

  function createPerformanceProfile(details) {
    const mode = chooseAutoPerformanceMode(details);
    const profile = {
      version: 4,
      mode,
      signature: getPerformanceSignature(details),
      createdAt: Date.now(),
      reason: "device-detect",
    };
    savePerformanceProfile(profile);
    return profile;
  }

  function detectPerformanceDetails() {
    const details = {
      webgl: false,
      vendor: "",
      renderer: "",
      softwareLike: false,
      headlessLike: false,
      automationLike: false,
      weakGpu: false,
      lowCpu: (navigator.hardwareConcurrency || 8) <= 4,
      lowMemory: Boolean(navigator.deviceMemory && navigator.deviceMemory <= 4),
      dpr: window.devicePixelRatio || 1,
      viewport: Math.max(1, window.innerWidth) + "x" + Math.max(1, window.innerHeight),
      reducedMotion,
    };

    details.pixelWork = Math.round(Math.max(1, window.innerWidth) * Math.max(1, window.innerHeight) * details.dpr * details.dpr);

    try {
      const testCanvas = document.createElement("canvas");
      const gl = testCanvas.getContext("webgl2", { failIfMajorPerformanceCaveat: false })
        || testCanvas.getContext("webgl", { failIfMajorPerformanceCaveat: false })
        || testCanvas.getContext("experimental-webgl", { failIfMajorPerformanceCaveat: false });
      if (gl) {
        details.webgl = true;
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        details.vendor = debugInfo ? (gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || "") : (gl.getParameter(gl.VENDOR) || "");
        details.renderer = debugInfo ? (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "") : (gl.getParameter(gl.RENDERER) || "");
        const loseContext = gl.getExtension("WEBGL_lose_context");
        if (loseContext && typeof loseContext.loseContext === "function") loseContext.loseContext();
      }
    } catch (error) {
      details.webgl = false;
    }

    const rendererText = (details.vendor + " " + details.renderer).toLowerCase();
    const userAgentText = String(navigator.userAgent || "").toLowerCase();
    let automationQuery = false;
    try {
      const params = new URLSearchParams(window.location.search || "");
      automationQuery = params.has("codex-cdp") || params.get("automation") === "1" || params.get("headless") === "1";
    } catch (error) {}
    details.headlessLike = /headlesschrome|headless/.test(userAgentText);
    details.automationLike = Boolean(navigator.webdriver || details.headlessLike || automationQuery);
    details.softwareLike = !details.webgl || /swiftshader|warp|microsoft basic|software|llvmpipe|basic render|mesa offscreen|softpipe|d3d11on12/.test(rendererText);
    details.weakGpu = !details.softwareLike && /intel\(r\) uhd|intel uhd|intel\(r\) hd|intel hd graphics|iris\(r\)|intel iris|mesa intel|radeon vega|uhd graphics/.test(rendererText);
    details.integratedGpu = !details.softwareLike && /intel|iris|uhd|hd graphics|radeon vega|apple m/.test(rendererText);

    return details;
  }

  function chooseAutoPerformanceMode(details) {
    return "safe";
  }

  function applyPerformanceModeState(reason) {
    const previousApplied = performanceModeState.applied;
    const previousPreference = performanceModeState.preference;
    const details = detectPerformanceDetails();
    const preference = getRequestedPerformanceMode();
    const storedProfile = preference === "auto" ? getStoredPerformanceProfile(details) : null;
    const autoProfile = storedProfile || (preference === "auto" ? createPerformanceProfile(details) : null);
    const autoMode = autoProfile ? autoProfile.mode : chooseAutoPerformanceMode(details);
    const appliedMode = preference === "auto" ? autoMode : preference;

    performanceModeState.preference = preference;
    performanceModeState.auto = autoMode;
    performanceModeState.applied = appliedMode;
    performanceModeState.details = details;
    performanceModeState.reason = reason || "update";

    body.dataset.performancePreference = preference;
    body.dataset.performanceAuto = autoMode;
    body.dataset.performanceMode = appliedMode;
    body.classList.toggle("performance-full", appliedMode === "full");
    body.classList.toggle("performance-balanced", appliedMode === "balanced");
    body.classList.toggle("performance-safe", appliedMode === "safe");
    window.SMARTSTEAM_PERFORMANCE = {
      preference,
      auto: autoMode,
      mode: appliedMode,
      reason: performanceModeState.reason,
      metrics: state.performanceMetrics,
      details,
      locked: preference === "auto",
      profile: autoProfile,
    };

    if (previousApplied !== appliedMode || previousPreference !== preference) {
      performanceModeListeners.forEach((listener) => {
        try { listener(window.SMARTSTEAM_PERFORMANCE); } catch (error) {}
      });
    }

    return window.SMARTSTEAM_PERFORMANCE;
  }

  function getCurrentPerformanceMode() {
    return performanceModeState.applied || body.dataset.performanceMode || "full";
  }

  function onPerformanceModeChange(listener) {
    if (typeof listener !== "function") return function() {};
    performanceModeListeners.add(listener);
    listener(window.SMARTSTEAM_PERFORMANCE || applyPerformanceModeState("listener"));
    return function() {
      performanceModeListeners.delete(listener);
    };
  }

  function downgradeAutoPerformanceMode(mode, metrics) {
    state.performanceMetrics = metrics || null;
    if (performanceModeState.preference !== "auto") return false;
    if (!isMobileViewport()) return false;
    const requestedMode = normalizePerformanceMode(mode);
    if (!requestedMode || requestedMode === "auto") return false;
    const currentMode = getCurrentPerformanceMode();
    const nextMode = getWorstPerformanceMode(currentMode, requestedMode);
    if (nextMode === currentMode) return false;
    const details = performanceModeState.details || detectPerformanceDetails();
    savePerformanceProfile({
      version: 4,
      mode: nextMode,
      signature: getPerformanceSignature(details),
      createdAt: Date.now(),
      reason: "runtime-downgrade",
      metrics: metrics || null,
    });
    applyPerformanceModeState("runtime-downgrade");
    return true;
  }

  function isProductSceneBooting() {
    return page === "products" && state.productSceneBootUntil && performance.now() < state.productSceneBootUntil;
  }

  function getBackgroundPixelRatioLimit(lowPowerDevice) {
    const mode = getCurrentPerformanceMode();
    const mobile = isMobileViewport();
    if (mode === "safe") return mobile && lowPowerDevice ? 0.65 : 0.85;
    if (mode === "balanced") return mobile && lowPowerDevice ? 0.85 : 1;
    return lowPowerDevice ? 1.15 : 1.35;
  }

  function getBackgroundParticleLimit(maxCount, isProductCanvas, lowPowerDevice) {
    const mode = getCurrentPerformanceMode();
    const mobile = isMobileViewport();
    if (isProductCanvas && isProductSceneBooting()) {
      if (mode === "safe") return Math.min(maxCount, 90);
      if (mode === "balanced") return Math.min(maxCount, 150);
      return Math.min(maxCount, lowPowerDevice ? 180 : 240);
    }
    if (mode === "safe") return Math.min(maxCount, mobile ? (isProductCanvas ? 60 : 48) : (isProductCanvas ? 170 : 130));
    if (mode === "balanced") return Math.min(maxCount, isMobileViewport() && lowPowerDevice ? (isProductCanvas ? 120 : 90) : (isProductCanvas ? 360 : 280));
    if (lowPowerDevice) return Math.min(maxCount, isProductCanvas ? 360 : 320);
    return maxCount;
  }

  function getBackgroundNodeLimit(maxCount, isProductCanvas, lowPowerDevice) {
    const mode = getCurrentPerformanceMode();
    const mobile = isMobileViewport();
    if (isProductCanvas && isProductSceneBooting()) {
      if (mode === "safe") return Math.min(maxCount, 22);
      if (mode === "balanced") return Math.min(maxCount, 34);
      return Math.min(maxCount, lowPowerDevice ? 38 : 46);
    }
    if (mode === "safe") return Math.min(maxCount, mobile ? (isProductCanvas ? 16 : 14) : (isProductCanvas ? 34 : 28));
    if (mode === "balanced") return Math.min(maxCount, isMobileViewport() && lowPowerDevice ? (isProductCanvas ? 26 : 22) : (isProductCanvas ? 58 : 48));
    if (lowPowerDevice) return Math.min(maxCount, isProductCanvas ? 62 : 56);
    return maxCount;
  }

  function shouldFreezeBackgroundMotionForRuntime() {
    const details = performanceModeState.details;
    if (!details) return false;
    if (details.automationLike || details.headlessLike) return true;
    return performanceModeState.preference === "auto" && details.softwareLike;
  }

  function pageSupportsBackgroundMotion() {
    return BACKGROUND_3D_PAGES.has(page) && shouldEnableHeavyBackground() && !shouldFreezeBackgroundMotionForRuntime();
  }

  function getBackgroundMotionProfile(isProductCanvas, sceneEl, lowPowerDevice) {
    if (!pageSupportsBackgroundMotion()) {
      return { active: false, interval: 1000, speed: 0, pointer: false };
    }

    if (shouldPauseBackgroundForMenu()) {
      return { active: false, interval: 1000, speed: 0, pointer: false };
    }

    if (!isProductCanvas && page === "welcome" && isMobileViewport()) {
      return { active: false, interval: 1000, speed: 0, pointer: false };
    }

    const performanceMode = getCurrentPerformanceMode();
    const reduceForMotion = reducedMotion && performanceModeState.preference === "auto";
    const inProductGrid = isProductCanvas && body.classList.contains("is-product-grid-mode");
    const productBooting = isProductCanvas && isProductSceneBooting();
    const busyGrid = inProductGrid && sceneEl && (
      sceneEl.classList.contains("is-board-scrolling") ||
      sceneEl.classList.contains("is-grid-reflowing") ||
      sceneEl.classList.contains("is-grid-refining") ||
      sceneEl.classList.contains("is-morphing-to-grid")
    );

    if (performanceMode === "safe") {
      if (isMobileViewport() && (page === "welcome" || page === "products")) {
        return { active: false, interval: 1000, speed: 0, pointer: false };
      }
      return {
        active: true,
        interval: busyGrid ? 140 : (isProductCanvas ? 96 : 82),
        speed: isProductCanvas ? 0.16 : 0.22,
        pointer: false,
      };
    }

    if (performanceMode === "balanced" && isMobileViewport() && (page === "welcome" || page === "products")) {
      return {
        active: true,
        interval: busyGrid ? 220 : (isProductCanvas ? 160 : 140),
        speed: isProductCanvas ? 0.08 : 0.1,
        pointer: false,
      };
    }

    const fullBaseInterval = isProductCanvas ? 33 : 16;
    const baseInterval = performanceMode === "balanced" ? (lowPowerDevice ? 50 : 33) : (lowPowerDevice ? 33 : fullBaseInterval);
    const gridInterval = performanceMode === "balanced" ? (lowPowerDevice ? 84 : 58) : (lowPowerDevice ? 66 : 42);
    const busyInterval = performanceMode === "balanced" ? (lowPowerDevice ? 132 : 100) : (lowPowerDevice ? 100 : 76);
    let interval = reduceForMotion
      ? Math.max(inProductGrid ? gridInterval : baseInterval, 66)
      : (busyGrid ? busyInterval : (inProductGrid ? gridInterval : baseInterval));
    const reducedScale = reduceForMotion ? 0.42 : 1;
    const performanceScale = performanceMode === "balanced" ? 0.62 : 1;
    const gridScale = busyGrid ? 0.28 : (inProductGrid ? 0.48 : 1);

    return {
      active: true,
      interval,
      speed: Math.max(0.16, reducedScale * performanceScale * gridScale),
      pointer: !productBooting && !reduceForMotion && !busyGrid,
    };
  }

  function createBackgroundFramePacer(lowPowerDevice) {
    const maxLevel = lowPowerDevice ? 3 : 2;
    const step = lowPowerDevice ? 16 : 12;
    let level = 0;
    let slowFrames = 0;
    let stableFrames = 0;

    return {
      get intervalBoost() {
        return level * step;
      },
      observe(frameDelta, targetInterval) {
        if (!Number.isFinite(frameDelta) || !Number.isFinite(targetInterval) || targetInterval <= 0) return;
        const slowThreshold = Math.max(42, targetInterval * 1.8);
        const stableThreshold = Math.max(24, targetInterval * 1.34);

        if (frameDelta > slowThreshold) {
          slowFrames += 1;
          stableFrames = 0;
          if (slowFrames >= 3) {
            level = Math.min(maxLevel, level + 1);
            slowFrames = 0;
          }
          return;
        }

        if (frameDelta < stableThreshold) {
          stableFrames += 1;
          slowFrames = 0;
          if (stableFrames >= 90 && level > 0) {
            level -= 1;
            stableFrames = 0;
          }
          return;
        }

        slowFrames = 0;
        stableFrames = 0;
      },
    };
  }

  function createBackgroundHealthSampler(rendererName, isProductCanvas) {
    const enabled = pageSupportsBackgroundMotion();
    const warmupMs = isProductCanvas ? 900 : 700;
    const sampleMs = isProductCanvas ? 2200 : 2600;
    let active = enabled;
    let round = 0;
    let bootTime = 0;
    let sampleStartTime = 0;
    let lastSampleTime = 0;
    let frames = 0;
    let slowFrames = 0;
    let severeFrames = 0;
    let maxDelta = 0;
    let deltaSum = 0;
    let targetSum = 0;

    function clearWindow(timestamp) {
      bootTime = timestamp || 0;
      sampleStartTime = 0;
      lastSampleTime = timestamp || 0;
      frames = 0;
      slowFrames = 0;
      severeFrames = 0;
      maxDelta = 0;
      deltaSum = 0;
      targetSum = 0;
    }

    return {
      observe(timestamp, targetInterval) {
        if (!active || !enabled) return;
        if (performanceModeState.preference !== "auto" || document.hidden) {
          active = false;
          return;
        }

        const currentMode = getCurrentPerformanceMode();
        if (currentMode === "safe") {
          active = false;
          return;
        }

        if (!Number.isFinite(timestamp) || !Number.isFinite(targetInterval) || targetInterval <= 0) return;
        if (!bootTime) {
          clearWindow(timestamp);
          return;
        }

        if (timestamp - bootTime < warmupMs) {
          lastSampleTime = timestamp;
          return;
        }

        if (!sampleStartTime) {
          sampleStartTime = timestamp;
          lastSampleTime = timestamp;
          return;
        }

        const delta = timestamp - lastSampleTime;
        lastSampleTime = timestamp;
        if (!Number.isFinite(delta) || delta <= 0) return;

        const slowThreshold = Math.max(currentMode === "balanced" ? 72 : 48, targetInterval * 1.65);
        const severeThreshold = Math.max(currentMode === "balanced" ? 138 : 96, targetInterval * 2.85);
        frames += 1;
        deltaSum += delta;
        targetSum += targetInterval;
        maxDelta = Math.max(maxDelta, delta);
        if (delta > slowThreshold) slowFrames += 1;
        if (delta > severeThreshold) severeFrames += 1;

        const elapsed = timestamp - sampleStartTime;
        if (elapsed < sampleMs || frames < 12) return;

        const fps = Math.round((frames / Math.max(1, elapsed)) * 1000);
        const avgDelta = deltaSum / Math.max(1, frames);
        const avgTarget = targetSum / Math.max(1, frames);
        const metrics = {
          page,
          renderer: rendererName,
          mode: currentMode,
          fps,
          slowFrames,
          severeFrames,
          maxDelta: Math.round(maxDelta),
          avgDelta: Math.round(avgDelta),
          targetInterval: Math.round(avgTarget),
          elapsed: Math.round(elapsed),
          round,
        };

        let nextMode = "";
        if (currentMode === "full") {
          if (fps < 50 || severeFrames >= 2 || slowFrames >= 4 || maxDelta > 82 || avgDelta > avgTarget * 1.42) nextMode = "balanced";
        } else if (currentMode === "balanced") {
          if (fps < 26 || severeFrames >= 2 || slowFrames >= 7 || maxDelta > 150 || avgDelta > avgTarget * 2.05) nextMode = "safe";
        }

        if (nextMode && downgradeAutoPerformanceMode(nextMode, metrics)) {
          if (nextMode === "balanced" && round < 1) {
            round += 1;
            clearWindow(timestamp);
            return;
          }
        }

        active = false;
      },
    };
  }

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

  function waitForNextPaints(count) {
    const frames = Math.max(1, count || 1);
    return new Promise((resolve) => {
      let remaining = frames;
      const step = () => {
        remaining -= 1;
        if (remaining <= 0) {
          resolve();
          return;
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  function restoreScrollInstant(top) {
    const doc = document.documentElement;
    const maxScroll = Math.max(
      0,
      Math.max(doc.scrollHeight || 0, body.scrollHeight || 0) - Math.max(window.innerHeight || 0, doc.clientHeight || 0)
    );
    const targetTop = clamp(Number(top) || 0, 0, maxScroll);
    const previousHtmlBehavior = doc.style.scrollBehavior;
    const previousBodyBehavior = body.style.scrollBehavior;

    doc.style.scrollBehavior = "auto";
    body.style.scrollBehavior = "auto";
    window.scrollTo({ top: targetTop, left: 0, behavior: "auto" });

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        doc.style.scrollBehavior = previousHtmlBehavior;
        body.style.scrollBehavior = previousBodyBehavior;
      });
    });
  }

  function runAfterPageShell(callback, fallbackMs) {
    if (typeof callback !== "function") return function() {};
    let done = false;
    let frameId = 0;
    let settleFrameId = 0;
    const timerId = window.setTimeout(finish, Math.max(120, fallbackMs || 1200));

    function cleanup() {
      done = true;
      window.clearTimeout(timerId);
      if (frameId) window.cancelAnimationFrame(frameId);
      if (settleFrameId) window.cancelAnimationFrame(settleFrameId);
      frameId = 0;
      settleFrameId = 0;
    }

    function finish() {
      if (done) return;
      window.clearTimeout(timerId);
      done = true;
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      settleFrameId = window.requestAnimationFrame(() => {
        settleFrameId = 0;
        callback();
      });
    }

    function poll() {
      if (done) return;
      if (body.classList.contains("is-shell-visible") || body.classList.contains("is-copy-visible")) {
        finish();
        return;
      }
      frameId = window.requestAnimationFrame(poll);
    }

    frameId = window.requestAnimationFrame(poll);
    return cleanup;
  }

  function debounce(callback, delay) {
    let timer = 0;
    return () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(callback, delay);
    };
  }

  function supportsWebGLCanvas() {
    if (!window.WebGLRenderingContext) return false;
    try {
      const probe = document.createElement("canvas");
      return Boolean(probe.getContext("webgl") || probe.getContext("experimental-webgl"));
    } catch (error) {
      return false;
    }
  }

  function loadThreeModule() {
    if (!threeModulePromise) threeModulePromise = import(THREE_MODULE_URL);
    return threeModulePromise;
  }

  function loadGltfLoaderModule() {
    if (!gltfLoaderModulePromise) gltfLoaderModulePromise = import(`${GLTF_LOADER_MODULE_URL}${ASSET_VERSION}`);
    return gltfLoaderModulePromise;
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

  function getStoredThemeDefaultVersion() {
    try {
      return window.localStorage.getItem(THEME_DEFAULT_VERSION_STORAGE_KEY) || "";
    } catch (error) {
      return LIGHT_THEME_DEFAULT_VERSION;
    }
  }

  function syncStoredThemeDefaultVersion(theme) {
    const nextTheme = normalizeThemeValue(theme);
    try {
      window.localStorage.setItem(THEME_DEFAULT_VERSION_STORAGE_KEY, LIGHT_THEME_DEFAULT_VERSION);
      window.localStorage.setItem(APP_THEME_STORAGE_KEY, nextTheme);
      if (page === "welcome") window.localStorage.setItem(WELCOME_THEME_STORAGE_KEY, nextTheme);
    } catch (error) {
      // Ignore storage failures and keep the current UI state.
    }
    return nextTheme;
  }

  function getStoredThemeAfterLightDefaultMigration() {
    if (getStoredThemeDefaultVersion() !== LIGHT_THEME_DEFAULT_VERSION) {
      return syncStoredThemeDefaultVersion("light");
    }
    return readStoredTheme(APP_THEME_STORAGE_KEY) || readStoredTheme(WELCOME_THEME_STORAGE_KEY) || "light";
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

  let productUiStabilizeTimer = 0;

  function isMobileProductsViewport() {
    return page === "products" && window.innerWidth <= 760;
  }

  function stabilizeMobileProductUi(duration) {
    if (!isMobileProductsViewport()) return false;
    window.clearTimeout(productUiStabilizeTimer);
    body.classList.add("is-product-ui-stabilizing");
    productUiStabilizeTimer = window.setTimeout(() => {
      body.classList.remove("is-product-ui-stabilizing");
    }, typeof duration === "number" ? duration : 420);
    return true;
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

    return getStoredThemeAfterLightDefaultMigration();
  }

  function setWelcomeTheme(theme) {
    stabilizeMobileProductUi(520);
    const nextTheme = syncPageThemeState(theme);
    syncStoredThemeDefaultVersion(nextTheme);
  }

  function initWelcomeTheme() {
    const nextTheme = syncPageThemeState(getWelcomeTheme());
    syncStoredThemeDefaultVersion(nextTheme);
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
    const viValue = normalizeText(entry[viKey]);
    const enValue = normalizeText(entry[enKey]);
    if (locale === "vi") return viValue;
    if (enValue && enValue !== viValue) return enValue;
    if (enKey === "titleEn") return deriveEnglishTitle(entry, viValue);
    if (/^(summary|intro|excerpt|tagline)En$/.test(enKey)) return deriveEnglishSummary(entry, viValue);
    return enValue || viValue;
  }

  function titleCaseEnglish(value) {
    return normalizeText(value)
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => (/^(AI|DC|DOF|ESP32|I2C|IR|LCD|LED|LM35|STEM|STEAM|TTP223B|UNO|V8|V5DC|ULN2003|TSOP1838|R5)$/i.test(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
      .join(" ");
  }

  function deriveEnglishTitle(entry, fallback) {
    const source = normalizeText((entry && (entry.slug || entry.sourceSlug || entry.id)) || fallback || "").toLowerCase();
    let title = source.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const replacements = [
      ["lap-trinh-game-voi-mblock", "mBlock game programming"],
      ["lap-trinh-arduino", "Arduino programming"],
      ["chu-de-giao-thong-duong-bo", "road traffic theme"],
      ["game-ran-san-moi", "snake game"],
      ["chem-hoa-qua", "fruit slicing game"],
      ["giai-cau-do", "quiz game"],
      ["khoa-hoc-quanh-ta", "science around us"],
      ["cam-bien-thu-hong-ngoai-ir", "IR receiver sensor"],
      ["mach-ieu-khien-ong-co-buoc", "stepper motor driver"],
      ["cam-bien", "sensor"],
      ["dong-co", "motor"],
      ["bo-kit", "kit"],
      ["bo-bien", "converter kit"],
      ["bo-chuyen-doi", "converter kit"],
      ["bo-mo-phong", "simulation kit"],
      ["bo-go", "wooden kit"],
      ["mo-hinh", "model"],
      ["thong-minh", "smart"],
      ["nha-thong-minh", "smart home"],
      ["tram-sac", "charging station"],
      ["canh-tay-robot", "robotic arm"],
      ["dong-ho", "clock"],
      ["den-giao-thong", "traffic light"],
      ["man-hinh", "display"],
      ["do-choi", "toy"],
      ["du-nem", "throwing parachute"],
      ["may-rot-nuoc", "automatic water dispenser"],
      ["may-bay", "airplane"],
      ["con-quay", "spinning toy"],
      ["chim-canh-cut", "penguin"],
      ["robot-cho", "robot dog"],
      ["robot-di-bo", "walking robot"],
      ["robot-nhen", "spider robot"],
      ["robot-do-me-cung", "maze robot"],
      ["giao-duc-stem-va-steam", "STEM and STEAM education"],
      ["robot-hinh-nguoi-tesla-optimus", "Tesla Optimus humanoid robot"],
      ["iphone-17-dung-luong-pin", "iPhone 17 battery capacity"],
    ];
    replacements.forEach(([needle, replacement]) => {
      title = title.replace(new RegExp(needle, "g"), replacement);
    });
    title = title.replace(/-/g, " ").replace(/\b(stem|steam|ai|dc|dof|esp32|i2c|ir|lcd|led|lm35|uno|uln2003|tsop1838|ttp223b|v8|r5)\b/gi, (match) => match.toUpperCase());
    title = titleCaseEnglish(title);
    return title || normalizeText(fallback || "STEM learning resource");
  }

  function deriveEnglishSummary(entry, fallback) {
    const title = deriveEnglishTitle(entry, entry && (entry.titleEn || entry.titleVi) || fallback);
    return `English SMARTSTEAM page for ${title}, with practical STEM context, media, and related learning resources.`;
  }

  function contextualizeMetaTitle(title) {
    const value = normalizeText(title || "");
    if (!value || !page.endsWith("-detail")) return value;
    const labels = locale === "vi"
      ? { "product-detail": "Sản phẩm SMARTSTEAM", "project-detail": "Dự án SMARTSTEAM", "tutorial-detail": "Bài giảng SMARTSTEAM", "news-detail": "Tin SMARTSTEAM", "policy-detail": "Hỗ trợ SMARTSTEAM" }
      : { "product-detail": "SMARTSTEAM Product", "project-detail": "SMARTSTEAM Project", "tutorial-detail": "SMARTSTEAM Tutorial", "news-detail": "SMARTSTEAM News", "policy-detail": "SMARTSTEAM Support" };
    const label = labels[page];
    if (!label || value.includes(label)) return value;
    return value.replace(/\s*\|\s*SMARTSTEAM\s*$/i, ` | ${label}`);
  }

  function shortenMetaTitle(title) {
    const value = normalizeText(title || "");
    if (value.length <= 70) return value;
    const parts = value.split("|").map((part) => normalizeText(part));
    if (parts.length < 2) return `${value.slice(0, 67).trim()}...`;
    const suffix = parts.pop();
    const base = parts.join(" | ");
    const maxBaseLength = Math.max(24, 64 - suffix.length);
    return `${base.slice(0, maxBaseLength).replace(/\s+\S*$/, "").trim()}... | ${suffix}`;
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
    const words = String(value || "SMARTSTEAM")
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
    const label = getMediaAlt(media) || "SMARTSTEAM";
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

  const SITE_ORIGIN = (function () {
    const fromMeta = document.querySelector('meta[name="site-origin"]');
    if (fromMeta && fromMeta.content) return fromMeta.content.replace(/\/$/, "");
    if (window.location.protocol === "http:" || window.location.protocol === "https:") {
      return window.location.origin;
    }
    return "https://stemora.vn";
  })();

  function ensureHeadTag(selector, create) {
    let tag = document.head.querySelector(selector);
    if (!tag) {
      tag = create();
      document.head.appendChild(tag);
    }
    return tag;
  }

  function setMetaTag(name, content, attr) {
    if (!content) return;
    const key = attr || "name";
    const tag = ensureHeadTag(`meta[${key}="${name}"]`, () => {
      const m = document.createElement("meta");
      m.setAttribute(key, name);
      return m;
    });
    tag.setAttribute("content", content);
  }

  function setLinkTag(rel, href, extra) {
    if (!href) return;
    const hrefLang = (extra && extra.hreflang) || "";
    const selector = hrefLang ? `link[rel="${rel}"][hreflang="${hrefLang}"]` : `link[rel="${rel}"]:not([hreflang])`;
    const tag = ensureHeadTag(selector, () => {
      const l = document.createElement("link");
      l.setAttribute("rel", rel);
      if (hrefLang) l.setAttribute("hreflang", hrefLang);
      return l;
    });
    tag.setAttribute("href", href);
  }

  function buildCanonicalUrl() {
    let path = window.location.pathname;
    if (!path.endsWith("/") && !/\.[a-z0-9]+$/i.test(path)) path += "/";
    return SITE_ORIGIN + path;
  }

  function buildAlternateUrl(targetLocale) {
    const fromLocale = "/" + locale + "/";
    const toLocale = "/" + targetLocale + "/";
    let path = window.location.pathname;
    if (path.startsWith(fromLocale)) path = toLocale + path.slice(fromLocale.length);
    if (!path.endsWith("/") && !/\.[a-z0-9]+$/i.test(path)) path += "/";
    return SITE_ORIGIN + path;
  }

  function updateMeta(title, description, options) {
    const opts = options || {};
    title = shortenMetaTitle(contextualizeMetaTitle(title));
    if (title) document.title = title;
    if (description) setMetaTag("description", description);

    const canonical = buildCanonicalUrl();
    setLinkTag("canonical", canonical);
    setLinkTag("alternate", canonical, { hreflang: locale });
    setLinkTag("alternate", buildAlternateUrl(locale === "vi" ? "en" : "vi"), {
      hreflang: locale === "vi" ? "en" : "vi",
    });
    setLinkTag("alternate", buildAlternateUrl("vi"), { hreflang: "x-default" });

    setMetaTag("og:type", opts.ogType || (page.endsWith("-detail") ? "article" : "website"), "property");
    setMetaTag("og:url", canonical, "property");
    setMetaTag("og:site_name", "SMARTSTEAM", "property");
    setMetaTag("og:locale", locale === "vi" ? "vi_VN" : "en_US", "property");
    if (title) setMetaTag("og:title", title, "property");
    if (description) setMetaTag("og:description", description, "property");

    const ogImage = opts.image || (data.siteMeta && data.siteMeta.ogImage) || `${SITE_ORIGIN}/assets/img/luxury-3d-chip-hero.webp`;
    setMetaTag("og:image", ogImage, "property");
    setMetaTag("twitter:card", "summary_large_image");
    setMetaTag("twitter:title", title || "SMARTSTEAM");
    if (description) setMetaTag("twitter:description", description);
    setMetaTag("twitter:image", ogImage);

    if (opts.jsonLd) {
      let script = document.getElementById("smartsteam-jsonld");
      if (!script) {
        script = document.createElement("script");
        script.type = "application/ld+json";
        script.id = "smartsteam-jsonld";
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(opts.jsonLd);
    }
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
    if (/[?&]v=/.test(localSource)) return localSource;
    return `${localSource}${localSource.includes("?") ? "&" : "?"}${ASSET_VERSION.slice(1)}`;
  }

  function normalizeMediaObject(media, options) {
    const config = options || {};
    const baseMedia = typeof media === "string" ? { src: media } : media || {};
    const fallbackRole = baseMedia.role || config.role || "editorial";
    return {
      src: normalizeMediaSource(baseMedia.src) || MEDIA_FALLBACKS[fallbackRole] || MEDIA_FALLBACKS.editorial,
      fallbackSrc: normalizeMediaSource(baseMedia.fallbackSrc || config.fallbackSrc || ""),
      width: baseMedia.width || config.width || 1200,
      height: baseMedia.height || config.height || 1200,
      ratio: baseMedia.ratio || config.ratio || "4 / 5",
      fit: baseMedia.fit || config.fit || "cover",
      focalX: baseMedia.focalX ?? 50,
      focalY: baseMedia.focalY ?? 50,
      preserveTextSafeArea: Boolean(baseMedia.preserveTextSafeArea),
      role: fallbackRole,
      loadingTier: baseMedia.loadingTier || config.tier || (config.priority ? "critical" : "deferred"),
      alt: baseMedia.alt || { vi: "", en: "" },
    };
  }

  function getFallbackMediaSource(media) {
    if (GENERATED_FALLBACK_ROLES.has(media.role)) return buildGeneratedFallbackSource(media);
    const fallbackPath = MEDIA_FALLBACKS[media.role] || MEDIA_FALLBACKS.editorial;
    return resolveAssetSource(fallbackPath);
  }

  function safeMediaNumber(value, fallback, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
  }

  function safeMediaRatio(value, fallback) {
    const source = String(value || "").trim();
    return /^\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?$/.test(source) ? source : fallback;
  }

  function safeMediaToken(value, fallback) {
    const source = String(value || "").trim();
    return /^[a-z0-9_-]+$/i.test(source) ? source : fallback;
  }

  function renderMedia(media, className, options) {
    const config = options || {};
    const normalizedMedia = normalizeMediaObject(media, config);
    const tier = safeMediaToken(config.tier || (config.priority ? "critical" : "") || normalizedMedia.loadingTier || "deferred", "deferred");
    const inlineSource = tier === "critical" || config.inline === true;
    const loading = inlineSource ? config.loading || "eager" : "lazy";
    const fetchPriorityValue = ["auto", "high", "low"].includes(config.fetchPriority) ? config.fetchPriority : "";
    const fetchPriority = fetchPriorityValue
      ? ` fetchpriority="${fetchPriorityValue}"`
      : (tier === "critical" ? ' fetchpriority="high"' : "");
    const decoding = tier === "critical" ? "sync" : "async";
    const alt = config.alt !== undefined ? config.alt : getMediaAlt(normalizedMedia);
    const fit = safeMediaToken(normalizedMedia.fit || "cover", "cover");
    const role = safeMediaToken(normalizedMedia.role || "editorial", "editorial");
    const focalX = safeMediaNumber(normalizedMedia.focalX, 50, 0, 100);
    const focalY = safeMediaNumber(normalizedMedia.focalY, 50, 0, 100);
    const ratio = safeMediaRatio(normalizedMedia.ratio, "4 / 5");
    const safeText = normalizedMedia.preserveTextSafeArea ? "true" : "false";
    const wrapperClass = ["media-frame", String(className || "").replace(/[^a-z0-9_\-\s]/gi, ""), config.bare ? "media-frame--bare" : ""]
      .filter(Boolean)
      .join(" ");
    const stage = config.stage ? ` data-stage="${escapeHtmlText(safeMediaToken(config.stage, ""))}"` : "";
    const resolvedSource = resolveAssetSource(normalizedMedia.src);
    const fallbackSource = normalizedMedia.fallbackSrc
      ? resolveAssetSource(normalizedMedia.fallbackSrc)
      : getFallbackMediaSource(normalizedMedia);
    const manual = config.manual ? ' data-media-manual="true"' : "";
    const sourceAttributes = inlineSource
      ? `src="${escapeHtmlText(resolvedSource)}" data-fallback-src="${escapeHtmlText(fallbackSource)}"`
      : `src="${EMPTY_MEDIA}" data-src="${escapeHtmlText(resolvedSource)}" data-fallback-src="${escapeHtmlText(fallbackSource)}"`;

    return `
      <figure
        class="${escapeHtmlText(wrapperClass)}"
        data-media-tier="${escapeHtmlText(tier)}"
        data-fit="${escapeHtmlText(fit)}"
        data-role="${escapeHtmlText(role)}"
        data-text-safe="${safeText}"${stage}
        style="--media-ratio:${ratio};--media-position:${focalX}% ${focalY}%;--media-fit:${fit};"
      >
        <img
          class="stable-media"
          ${sourceAttributes}
          alt="${escapeHtmlText(alt)}"
          width="${safeMediaNumber(normalizedMedia.width, 1200, 1, 6000)}"
          height="${safeMediaNumber(normalizedMedia.height, 1200, 1, 6000)}"
          data-media-tier="${escapeHtmlText(tier)}"
          ${manual}
          loading="${escapeHtmlText(safeMediaToken(loading, "lazy"))}"
          decoding="${escapeHtmlText(safeMediaToken(decoding, "async"))}"${fetchPriority}
        >
      </figure>
    `;
  }

  function getLocalThumbnailSource(src) {
    const normalizedSource = normalizeMediaSource(src);
    if (!/^\/images\/[^/?#]+\.(?:webp|png|jpe?g)$/i.test(normalizedSource)) return "";
    return normalizedSource.replace(/^\/images\//i, "/images/thumbs/").replace(/\.(?:png|jpe?g|webp)$/i, ".webp");
  }

  function getCatalogueThumbMedia(media) {
    const normalizedMedia = normalizeMediaObject(media, { role: "catalogue" });
    const thumbSource = getLocalThumbnailSource(normalizedMedia.src);
    if (!thumbSource) return normalizedMedia;
    const maxEdge = Math.max(Number(normalizedMedia.width) || 0, Number(normalizedMedia.height) || 0, 1);
    const scale = Math.min(1, 520 / maxEdge);
    return Object.assign({}, normalizedMedia, {
      src: thumbSource,
      fallbackSrc: normalizedMedia.src,
      width: Math.max(1, Math.round((Number(normalizedMedia.width) || 520) * scale)),
      height: Math.max(1, Math.round((Number(normalizedMedia.height) || 520) * scale)),
      loadingTier: "deferred",
    });
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
    return [...(data.products || [])].sort((a, b) => a.featuredOrder - b.featuredOrder);
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

  async function fetchJsonWithTimeout(path, timeoutMs) {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller
      ? window.setTimeout(() => controller.abort(), timeoutMs)
      : 0;
    try {
      const response = await fetch(path, { cache: "force-cache", signal: controller ? controller.signal : undefined });
      if (!response.ok) throw new Error(`Failed to load ${path}`);
      return response.json();
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }
  }

  async function loadJsonEndpoint(path) {
    try {
      return await fetchJsonWithTimeout(path, PUBLIC_DATA_FETCH_TIMEOUT_MS);
    } catch (error) {
      await wait(PUBLIC_DATA_RETRY_DELAY_MS);
      return fetchJsonWithTimeout(path, PUBLIC_DATA_FETCH_TIMEOUT_MS + 3000);
    }
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

  function escapeHtmlText(value) {
    return normalizeText(String(value || ""))
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeSafeHref(value, options) {
    const config = options || {};
    const fallback = config.fallback == null ? "#" : String(config.fallback);
    const allowedProtocols = new Set(config.protocols || ["https:", "http:"]);
    const source = normalizeText(value || "").trim();
    if (!source || /[\u0000-\u001f<>"'`]/.test(source)) return fallback;
    if (source.startsWith("#")) return config.allowHash === false ? fallback : source;
    if (source.startsWith("/") && !source.startsWith("//")) {
      return config.allowRelative === false ? fallback : source;
    }
    try {
      const parsed = new URL(source, window.location.origin);
      if (!allowedProtocols.has(parsed.protocol)) return fallback;
      if (config.allowRelative === false && parsed.origin === window.location.origin && !/^[a-z][a-z0-9+.-]*:/i.test(source)) return fallback;
      return parsed.href;
    } catch (error) {
      return fallback;
    }
  }

  function normalizeEmailHref(value) {
    const source = normalizeText(value || "").trim();
    if (!/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(source)) return "";
    return `mailto:${source}`;
  }

  function normalizeTelHref(value) {
    const source = normalizeText(value || "").trim();
    const dial = source.replace(/[^+\d]/g, "");
    if (!/^\+?\d{8,15}$/.test(dial)) return "";
    return `tel:${dial}`;
  }

  function sanitizeMigratedHtml(htmlValue) {
    const genericFallbackSrc = resolveAssetSource(MEDIA_FALLBACKS.archive || MEDIA_FALLBACKS.editorial);
    const template = document.createElement("template");
    template.innerHTML = String(htmlValue || "");
    $$("script, style, iframe, object, embed, form, input, button, textarea, select, noscript", template.content).forEach((node) => node.remove());
    const allowedTags = new Set([
      "A",
      "B",
      "BLOCKQUOTE",
      "BR",
      "EM",
      "FIGCAPTION",
      "FIGURE",
      "H2",
      "H3",
      "H4",
      "HR",
      "I",
      "IMG",
      "LI",
      "OL",
      "P",
      "STRONG",
      "TABLE",
      "TBODY",
      "TD",
      "TH",
      "THEAD",
      "TR",
      "U",
      "UL",
    ]);
    const allowedAttrs = new Set([
      "alt",
      "colspan",
      "decoding",
      "height",
      "href",
      "loading",
      "rel",
      "rowspan",
      "src",
      "target",
      "title",
      "width",
    ]);

    $$("*", template.content).forEach((element) => {
      if (allowedTags.has(element.tagName)) return;
      element.replaceWith(...Array.from(element.childNodes));
    });

    $$("h2 p, h3 p, h4 p", template.content).forEach((paragraph) => {
      paragraph.replaceWith(...Array.from(paragraph.childNodes));
    });

    $$("h2, h3, h4", template.content).forEach((heading) => {
      const hasBlockChild = $$("blockquote, div, figure, li, ol, p, table, ul", heading).length > 0;
      if (hasBlockChild) {
        heading.replaceWith(...Array.from(heading.childNodes));
        return;
      }
      if (!normalizeText(heading.textContent || "")) heading.remove();
    });

    const textWalker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (textWalker.nextNode()) textNodes.push(textWalker.currentNode);
    textNodes.forEach((textNode) => {
      textNode.nodeValue = normalizeText(textNode.nodeValue || "");
    });

    $$("*", template.content).forEach((element) => {
      Array.from(element.attributes).forEach((attribute) => {
        const attrName = attribute.name.toLowerCase();
        if (attrName.startsWith("on") || attrName === "style" || attrName === "class" || attrName === "id" || attrName === "srcdoc" || !allowedAttrs.has(attrName)) {
          element.removeAttribute(attribute.name);
          return;
        }
        if (attrName === "src" || attrName === "href") {
          const rawValue = normalizeText(attribute.value || "").trim();
          if (!rawValue) {
            element.removeAttribute(attribute.name);
            return;
          }
          if (/^(javascript|vbscript|file):/i.test(rawValue)) {
            element.removeAttribute(attribute.name);
            return;
          }
          if (/facebook\.com|fbcdn\.net/i.test(rawValue)) {
            element.removeAttribute(attribute.name);
            return;
          }
          if (attrName === "href" && (rawValue.startsWith("#") || /^mailto:|^tel:/i.test(rawValue))) {
            element.setAttribute("href", rawValue);
            return;
          }
          const isExternal = /^(https?:)?\/\//i.test(rawValue);
          if (attrName === "src") {
            if (/^data:image\//i.test(rawValue)) {
              element.removeAttribute("src");
              return;
            }
            if (/^[a-z][a-z0-9+.-]*:/i.test(rawValue) && !isExternal && !/^data:image\//i.test(rawValue)) {
              element.removeAttribute("src");
              return;
            }
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
            if (/^[a-z][a-z0-9+.-]*:/i.test(rawValue)) {
              element.removeAttribute("href");
              return;
            }
            element.setAttribute("href", rawValue);
          }
          return;
        }
        if (attrName === "alt" || attrName === "title") {
          element.setAttribute(attribute.name, normalizeText(attribute.value || ""));
        }
      });
    });

    $$("img:not([src])", template.content).forEach((element) => element.remove());

    $$("p, ul, ol", template.content).forEach((element) => {
      const hasRenderableChild = Boolean($("img, video, picture, iframe, table", element));
      const textContent = normalizeText(element.textContent || "").replace(/\s+/g, " ").trim();
      if (!hasRenderableChild && !textContent) element.remove();
    });

    return template.innerHTML.trim();
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

  function normalizeLoadedArray(items) {
    return Array.isArray(items) ? normalizeDataTree(items) : [];
  }

  function loadDataArray(endpoint, key, promiseKey) {
    if (Array.isArray(data[key]) && data[key].length) return Promise.resolve(data[key]);
    if (state[promiseKey]) return state[promiseKey];

    state[promiseKey] = loadJsonEndpoint(endpoint).then((items) => {
      data[key] = normalizeLoadedArray(items);
      return data[key];
    }).catch(() => {
      if (!Array.isArray(data[key])) data[key] = [];
      return data[key];
    });

    return state[promiseKey];
  }

  function loadProductsData() {
    return loadDataArray(PUBLIC_PRODUCTS_ENDPOINT, "products", "productsDataPromise");
  }

  function loadProjectsData() {
    return loadDataArray(PUBLIC_PROJECTS_ENDPOINT, "projects", "projectsDataPromise");
  }

  function loadPoliciesData() {
    return loadDataArray(PUBLIC_POLICIES_ENDPOINT, "policies", "policiesDataPromise");
  }

  function shouldLoadProductsData() {
    return page === "products"
      || page === "product-detail"
      || page === "project-detail"
      || page === "tutorial-detail"
      || page === "news-detail";
  }

  function shouldLoadProjectsData() {
    return page === "projects" || page === "project-detail";
  }

  function shouldLoadPoliciesData() {
    return page === "policy" || page === "policy-detail";
  }

  function shouldLoadTutorialArchiveData() {
    return page === "tutorials"
      || page === "tutorial-detail"
      || page === "project-detail"
      || page === "news-detail";
  }

  function shouldLoadNewsArchiveData() {
    return page === "news" || page === "news-detail" || page === "tutorial-detail";
  }

  function loadMigratedArchiveData() {
    if (state.migratedArchivePromise) return state.migratedArchivePromise;

    const shouldLoadTutorials = shouldLoadTutorialArchiveData();
    const shouldLoadNews = shouldLoadNewsArchiveData();
    state.migratedArchivePromise = loadJsonEndpoint(PUBLIC_ARCHIVE_ENDPOINT).then((archiveData) => {
      const nextTutorials = normalizeLoadedArray(archiveData && archiveData.tutorials);
      const nextNews = normalizeLoadedArray(archiveData && archiveData.news);
      if (shouldLoadTutorials) data.tutorials = nextTutorials;
      if (shouldLoadNews) data.news = nextNews;
    }).catch(() => {
      if (shouldLoadTutorials && !Array.isArray(data.tutorials)) data.tutorials = [];
      if (shouldLoadNews && !Array.isArray(data.news)) data.news = [];
    });

    return state.migratedArchivePromise;
  }

  function loadPageData() {
    const requests = [];
    if (shouldLoadProductsData()) requests.push(loadProductsData());
    if (shouldLoadProjectsData()) requests.push(loadProjectsData());
    if (shouldLoadPoliciesData()) requests.push(loadPoliciesData());
    if (shouldLoadMigratedArchiveData()) requests.push(loadMigratedArchiveData());
    return requests.length ? Promise.all(requests).then(() => null) : Promise.resolve(null);
  }

  function hydrateRenderedPage() {
    initTextNormalizer();
    bindStableMedia(document);
    if (!state.experienceStarted) return;
    const pageRoot = $(".js-page-root");
    initMediaPriorityLoading(pageRoot);
    initScrollMotion();
    initParallaxScenes();
    initContactForm();
  }


  function shouldLoadMigratedArchiveData() {
    return shouldLoadTutorialArchiveData() || shouldLoadNewsArchiveData();
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

  function getMediaSourceKey(src) {
    const source = String(src || "").trim();
    if (!source) return "";
    try {
      return new URL(source, window.location.href).href;
    } catch (error) {
      return source;
    }
  }

  function getImageTargetSource(image) {
    if (!image) return "";
    return image.dataset.src || image.currentSrc || image.getAttribute("src") || "";
  }

  function findRenderedImageForSource(src) {
    const sourceKey = getMediaSourceKey(src);
    if (!sourceKey) return null;
    return $$("img", document).find((image) => getMediaSourceKey(getImageTargetSource(image)) === sourceKey) || null;
  }

  function waitForImageElement(image) {
    return new Promise((resolve) => {
      if (!image) {
        resolve(null);
        return;
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
      image.addEventListener("error", recover, { once: true });
    });
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
    if (!image) return Promise.resolve(null);

    const pendingSource = image.dataset.src;
    const pendingKey = getMediaSourceKey(pendingSource);
    if (pendingSource && image.getAttribute("src") !== pendingSource) {
      const activeRequest = pendingKey && state.mediaLoadPromises.get(pendingKey);
      if (activeRequest && !state.mediaLoadedSources.has(pendingKey)) {
        return activeRequest.finally(() => {
          image.setAttribute("src", pendingSource);
          image.removeAttribute("data-src");
          return waitForImageElement(image);
        });
      }
      image.setAttribute("src", pendingSource);
      image.removeAttribute("data-src");
    }

    const sourceKey = getMediaSourceKey(getImageTargetSource(image));
    if (!sourceKey) return waitForImageElement(image);
    if (image.complete && image.naturalWidth) {
      state.mediaLoadedSources.add(sourceKey);
      return waitForImageElement(image);
    }

    const existingRequest = state.mediaLoadPromises.get(sourceKey);
    if (existingRequest && !state.mediaLoadedSources.has(sourceKey)) {
      return existingRequest.finally(() => waitForImageElement(image));
    }

    const request = waitForImageElement(image).then((loadedImage) => {
      if (image.naturalWidth) state.mediaLoadedSources.add(sourceKey);
      return loadedImage;
    }).finally(() => {
      state.mediaLoadPromises.delete(sourceKey);
    });
    state.mediaLoadPromises.set(sourceKey, request);
    return request;
  }

  function hydrateDynamicMedia(root, options) {
    const scope = root || document;
    const config = options || {};
    if (config.loadAll) $$("img[data-src]", scope).forEach((image) => {
      ensureImageReady(image);
    });
    bindStableMedia(scope);
  }

  function preloadImageSource(src) {
    const sourceKey = getMediaSourceKey(src);
    if (!sourceKey) return Promise.resolve();

    const renderedImage = findRenderedImageForSource(src);
    if (renderedImage) return ensureImageReady(renderedImage).then(() => null);
    if (state.mediaLoadedSources.has(sourceKey)) return Promise.resolve();

    const existingRequest = state.mediaLoadPromises.get(sourceKey);
    if (existingRequest) return existingRequest.then(() => null);

    const image = new Image();
    const request = new Promise((resolve) => {
      let settled = false;
      const finish = (loaded) => {
        if (settled) return;
        settled = true;
        const decoded = loaded && typeof image.decode === "function" ? image.decode().catch(() => null) : Promise.resolve();
        decoded.finally(() => {
          if (loaded) state.mediaLoadedSources.add(sourceKey);
          resolve();
        });
      };

      image.onload = () => finish(true);
      image.onerror = () => finish(false);
      image.src = src;
      if (image.complete) finish(Boolean(image.naturalWidth));
    }).finally(() => {
      state.mediaLoadPromises.delete(sourceKey);
    });

    state.mediaLoadPromises.set(sourceKey, request);
    return request;
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

  function setTransitionProgress(value) {
    const nextValue = clamp(Math.round(value || 0), 0, 100);
    const percent = $(".js-transition-percent");
    const bar = $(".js-transition-bar");
    if (percent) percent.textContent = `${nextValue}%`;
    if (bar) bar.style.width = `${nextValue}%`;
  }

  function releaseTransitionHold(delay) {
    const layer = $(".js-transition-layer");
    if (!layer || !state.transitionPending) return;
    setTransitionProgress(100);
    window.setTimeout(() => {
      layer.classList.remove("is-active", "is-holding");
      layer.setAttribute("aria-hidden", "true");
      sessionStorage.removeItem("smartsteam_transition_pending");
      state.transitionPending = false;
      state.transitionStarted = false;
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
            <span class="preloader__radar" aria-hidden="true"></span>
            <div class="preloader__inner">
              <div class="preloader__symbol" aria-hidden="true">
                <img class="preloader__logo" src="${data.siteMeta.logo.src}" alt="" width="${data.siteMeta.logo.width}" height="${data.siteMeta.logo.height}">
              </div>
              <div class="preloader__mark">${data.siteMeta.brand}</div>
              <p class="preloader__copy">${strings.preloader.copy}</p>
              <div class="preloader__track" aria-hidden="true"><span class="js-preloader-bar"></span></div>
              <div class="preloader__percent js-preloader-percent">0%</div>
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
            <span class="preloader__radar" aria-hidden="true"></span>
            <div class="preloader__inner transition-layer__inner">
              <div class="preloader__symbol" aria-hidden="true">
                <img class="preloader__logo" src="${data.siteMeta.logo.src}" alt="" width="${data.siteMeta.logo.width}" height="${data.siteMeta.logo.height}">
              </div>
              <div class="preloader__mark">${data.siteMeta.brand}</div>
              <p class="preloader__copy">${strings.preloader.copy}</p>
              <div class="preloader__track" aria-hidden="true"><span class="js-transition-bar"></span></div>
              <div class="preloader__percent js-transition-percent">18%</div>
            </div>
          </div>
        `
      );
    }

    if (!$(".js-menu-overlay")) {
      body.insertAdjacentHTML("beforeend", renderMenuOverlay());
    }
  }

  function renderMenuOverlay() {
    const compactTitle = locale === "vi" ? "Khám phá" : "Explore";
    const routeMarkup = strings.menu.routes
      .map(
        (item, index) => {
          const isActiveRoute = item.key === page
            || (item.key === "products" && page === "product-detail")
            || (item.key === "projects" && page === "project-detail")
            || (item.key === "tutorials" && page === "tutorial-detail")
            || (item.key === "news" && page === "news-detail");
          return `
          <a class="menu-route${isActiveRoute ? " is-active" : ""}" href="${getLocalePath(item.key)}" data-transition style="--stagger-index:${index};" ${isActiveRoute ? 'aria-current="page"' : ""}>
            <span class="menu-route__index">${String(index + 1).padStart(2, "0")}</span>
            <span class="menu-route__copy">
              <strong class="menu-route__title">${item.title}</strong>
              <span class="menu-route__teaser">${item.teaser}</span>
            </span>
            <span class="menu-route__arrow" aria-hidden="true">›</span>
          </a>
        `;
        }
      )
      .join("");

    const socials = data.siteMeta.socials
      .map((item) => {
        const href = normalizeSafeHref(item && item.href, { protocols: ["https:", "http:"], allowRelative: false });
        if (!href || href === "#") return "";
        return `<a class="menu-social" href="${escapeHtmlText(href)}" target="_blank" rel="noreferrer">${escapeHtmlText(item.label)}</a>`;
      })
      .filter(Boolean)
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
            <h2><span class="menu-sheet__title-full">${strings.menu.title}</span><span class="menu-sheet__title-compact">${compactTitle}</span></h2>
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
      normalizeEmailHref(footerCopy.email)
        ? `<a href="${escapeHtmlText(normalizeEmailHref(footerCopy.email))}">${escapeHtmlText(footerCopy.email)}</a>`
        : "",
      normalizeTelHref(footerCopy.phone)
        ? `<a href="${escapeHtmlText(normalizeTelHref(footerCopy.phone))}">${escapeHtmlText(footerCopy.phone)}</a>`
        : "",
      footerCopy.address ? `<span>${escapeHtmlText(footerCopy.address)}</span>` : "",
      footerCopy.hours ? `<span>${escapeHtmlText(footerCopy.hours)}</span>` : "",
    ].filter(Boolean).join("");
    const footerSocials = data.siteMeta.socials
      .map((item) => {
        const href = normalizeSafeHref(item && item.href, { protocols: ["https:", "http:"], allowRelative: false });
        if (!href || href === "#") return "";
        return `<a href="${escapeHtmlText(href)}" target="_blank" rel="noreferrer">${escapeHtmlText(item.label)}</a>`;
      })
      .filter(Boolean)
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
              <span class="welcome-theme-toggle__icon welcome-theme-toggle__icon--sun" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <circle cx="12" cy="12" r="4"></circle>
                  <path d="M12 2v2.4M12 19.6V22M4.93 4.93l1.7 1.7M17.37 17.37l1.7 1.7M2 12h2.4M19.6 12H22M4.93 19.07l1.7-1.7M17.37 6.63l1.7-1.7"></path>
                </svg>
              </span>
              <span class="welcome-theme-toggle__icon welcome-theme-toggle__icon--moon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M20.4 14.2A7.8 7.8 0 0 1 9.8 3.6a8.7 8.7 0 1 0 10.6 10.6Z"></path>
                </svg>
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
            <button class="menu-trigger js-menu-trigger" type="button" aria-label="${strings.actions.openMenu}" aria-controls="site-menu" aria-expanded="false">
              <span>${strings.actions.openMenu}</span>
              <span class="menu-trigger__glyph" aria-hidden="true"><span></span><span></span></span>
            </button>
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
      stabilizeMobileProductUi(360);
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
      stabilizeMobileProductUi(420);
      state.menuOpen = true;
      state.lastFocused = trigger || document.activeElement;
      overlay.removeAttribute("hidden");
      body.classList.add("menu-open");
      $$(".js-menu-trigger").forEach((button) => button.setAttribute("aria-expanded", "true"));
      requestAnimationFrame(() => overlay.classList.add("is-open"));
      window.setTimeout(() => {
        sheet.focus();
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

    const clearTransitionState = () => {
      layer.classList.remove("is-active", "is-holding");
      layer.setAttribute("aria-hidden", "true");
      sessionStorage.removeItem("smartsteam_transition_pending");
      state.transitionPending = false;
      state.transitionStarted = false;
      body.classList.remove("is-transitioning");
    };

    const beginRouteTransition = (href) => {
      if (state.transitionStarted) return;
      state.transitionStarted = true;
      state.transitionPending = true;
      sessionStorage.setItem("smartsteam_transition_pending", "1");
      window.location.href = href;
    };

    clearTransitionState();

    document.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest("a[data-transition]");
      if (!link || link.hasAttribute("download")) return;
      const target = (link.getAttribute("target") || "").trim().toLowerCase();
      if (target && target !== "_self") return;
      const rawHref = (link.getAttribute("href") || "").trim();
      if (!rawHref || rawHref.charAt(0) === "#") return;

      let url;
      try {
        url = new URL(link.href, window.location.href);
      } catch (error) {
        return;
      }

      if (url.origin !== window.location.origin) return;

      const samePath = normalizePath(url.pathname) === currentPath;
      const sameSearch = url.search === window.location.search;
      const sameHash = url.hash === window.location.hash;
      if (samePath && sameSearch && url.hash && !sameHash) return;

      event.preventDefault();
      if (samePath && sameSearch && sameHash) {
        clearTransitionState();
        return;
      }
      beginRouteTransition(url.href);
    });

    window.addEventListener("pageshow", (event) => {
      if (!event.persisted) return;
      clearTransitionState();
    });
  }

  function initPreloader() {
    const preloader = $(".js-preloader");
    const percent = $(".js-preloader-percent");
    const bar = $(".js-preloader-bar");

    const revealPage = () => {
      setTransitionProgress(86);
      const finishReveal = () => {
        setTransitionProgress(100);
        releaseTransitionHold(transitionTuning.releaseDelay || 180);
      };
      return initPageExperience().then(finishReveal, finishReveal);
    };

    if (!preloader || !percent || !bar) {
      revealPage();
      return;
    }

    const assets = getCriticalAssetsForPage();
    const total = assets.length;
    let loaded = 0;
    let displayProgress = 8;
    let resolved = total === 0;
    const seenVisit = sessionStorage.getItem("smartsteam_has_visited") === "1";
    const fallbackMs = seenVisit ? preloadTuning.repeatVisitFallback || 650 : preloadTuning.firstVisitFallback || 1450;
    const startTime = performance.now();
    let finished = false;
    let hardTimeoutId = 0;

    const done = () => {
      if (finished) return;
      finished = true;
      if (hardTimeoutId) window.clearTimeout(hardTimeoutId);
      percent.textContent = "98%";
      bar.style.width = "98%";
      sessionStorage.setItem("smartsteam_has_visited", "1");
      revealPage().finally(() => {
        percent.textContent = "100%";
        bar.style.width = "100%";
        window.setTimeout(() => {
          preloader.classList.add("is-hidden");
          window.setTimeout(() => {
            preloader.setAttribute("aria-hidden", "true");
            preloader.remove();
          }, preloadTuning.fadeDuration || 220);
        }, preloadTuning.finishDelay || 30);
      });
    };

    const handleResolved = () => {
      loaded += 1;
      if (loaded >= total) resolved = true;
    };

    assets.forEach((src) => {
      preloadImageSource(src).finally(handleResolved);
    });

    const tick = (timestamp) => {
      if (finished) return;
      const elapsed = timestamp - startTime;
      const fallbackDone = elapsed >= fallbackMs;
      const actual = total ? (loaded / total) * 100 : 100;
      const timedFloor = clamp(elapsed / 10, 14, 88);
      let target = Math.max(actual, timedFloor);
      if (resolved || fallbackDone) target = 100;
      else target = Math.min(target, 96);

      displayProgress += (target - displayProgress) * (resolved || fallbackDone ? 0.32 : 0.16);
      const rounded = Math.round(displayProgress);
      percent.textContent = `${rounded}%`;
      bar.style.width = `${rounded}%`;

      if ((resolved || fallbackDone) && displayProgress > 96.4) {
        done();
        return;
      }

      requestAnimationFrame(tick);
    };

    hardTimeoutId = window.setTimeout(done, fallbackMs + 650);
    requestAnimationFrame(tick);
  }

  function getCriticalAssetsForPage() {
    const logo = data.siteMeta.logo.src;
    const sources = [logo, ...getDocumentPreloadedImageSources()];
    const pushMediaSource = (media) => {
      const source = typeof media === "string" ? media : media && media.src;
      if (source) sources.push(source);
    };
    if (page === "welcome") {
      const scenes = data.welcomeScenes[locale];
      if (scenes[0] && scenes[0].media) pushMediaSource(scenes[0].media);
    } else if (page === "products") {
      // Product sphere loads visible catalogue thumbnails itself; full-size covers here only add unused network work.
    } else if (page === "product-detail") {
      const item = data.products.find((entry) => entry.slug === slugFromPath());
      if (item) {
        pushMediaSource((item.gallery && item.gallery[0]) || item.hero || item.cover);
      }
    } else if (page === "projects") {
      const firstProject = sortedProjects()[0];
      if (firstProject) pushMediaSource(firstProject.cover || firstProject.hero);
    } else if (page === "project-detail") {
      const item = data.projects.find((entry) => entry.slug === slugFromPath() || entry.sourceSlug === slugFromPath());
      if (item) {
        pushMediaSource(item.hero || item.cover);
      }
    } else if (page === "tutorials") {
      const firstTutorial = sortedTutorials()[0];
      if (firstTutorial) pushMediaSource(firstTutorial.cover);
    } else if (page === "tutorial-detail") {
      const item = sortedTutorials().find((entry) => entry.slug === slugFromPath() || entry.sourceSlug === slugFromPath());
      if (item) pushMediaSource(item.cover);
    } else if (page === "news") {
      const firstNews = sortedNews()[0];
      if (firstNews) pushMediaSource(firstNews.cover);
    } else if (page === "news-detail") {
      const item = sortedNews().find((entry) => entry.slug === slugFromPath() || entry.sourceSlug === slugFromPath());
      if (item) pushMediaSource(item.cover);
    } else if (page === "contact") {
      pushMediaSource(data.siteMeta.pageAssets.contact);
    } else if (page === "policy" || page === "policy-detail") {
      pushMediaSource(data.siteMeta.pageAssets.policy);
    }
    return unique(sources.map((source, index) => {
      if (!source) return "";
      return index === 0 ? normalizeMediaSource(source) : resolveAssetSource(source);
      }).filter(Boolean));
  }

  function getDocumentPreloadedImageSources() {
    return $$('link[rel~="preload"][as="image"][href]', document.head)
      .map((link) => normalizeMediaSource(link.getAttribute("href") || ""))
      .filter(Boolean);
  }

  function getViewportRankedImages(selector, root, limit) {
    const scope = root || document;
    const viewportW = Math.max(1, window.innerWidth || 1);
    const viewportH = Math.max(1, window.innerHeight || 1);
    const centerX = viewportW / 2;
    const centerY = viewportH / 2;
    return $$(selector, scope)
      .map((image) => {
        if (!image || image.dataset.mediaLoaded === "true") return null;
        if (!(image.dataset.src || image.currentSrc || image.getAttribute("src"))) return null;
        const frame = image.closest(".galaxy-card__inner") || image.closest(".media-frame") || image;
        const rect = frame.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        if (rect.right < -80 || rect.left > viewportW + 80 || rect.bottom < -80 || rect.top > viewportH + 80) return null;
        const dx = rect.left + rect.width / 2 - centerX;
        const dy = rect.top + rect.height / 2 - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return { image, score: rect.width * rect.height - distance * 3 };
      })
      .filter(Boolean)
      .sort((left, right) => right.score - left.score)
      .slice(0, limit || 4)
      .map((entry) => entry.image);
  }

  function initPageExperience() {
    if (state.pageExperiencePromise) return state.pageExperiencePromise;
    state.experienceStarted = true;

    const root = $(".js-page-root");
    const heroImage = getHeroImage(root);
    const backgroundReady = getRevealBackgroundReady(root);
    const shellDelay = reducedMotion ? 0 : stageTuning.shellDelay || 70;
    const heroDelay = reducedMotion ? 0 : stageTuning.heroDelay || 150;
    const copyDelay = reducedMotion ? 0 : stageTuning.copyDelay || 300;
    const secondaryDelay = reducedMotion ? 0 : stageTuning.secondaryDelay || 520;

    const warmVisibleProductImages = () => {
      if (page !== "products") return;
      const sphere = $(".js-galaxy-sphere", root);
      if (!sphere) return;
      const limit = window.innerWidth < 760 ? 4 : 6;
      const images = getViewportRankedImages(".galaxy-card img", sphere, limit);
      if (images.length) loadMediaBatch(images, window.innerWidth < 760 ? 2 : 3);
    };

    const revealSecondarySequence = async () => {
      await wait(Math.max(0, secondaryDelay - copyDelay));
      body.classList.add("is-secondary-visible");
      initMediaPriorityLoading(root);
      initScrollMotion();
      initParallaxScenes();
      initContactForm();
    };

    const revealSequence = async () => {
      body.classList.add("is-ready");
      await wait(shellDelay);
      body.classList.add("is-shell-visible");
      await wait(Math.max(0, heroDelay - shellDelay));
      body.classList.add("is-hero-visible");
      await wait(Math.max(0, copyDelay - heroDelay));
      body.classList.add("is-copy-visible");
      warmVisibleProductImages();
      if (page === "welcome") enhanceWelcomePage(root).catch(() => {});
      revealSecondarySequence().catch(() => {});
      await waitForNextPaints(preloadTuning.primaryReadyPaints || 1);
    };

    state.pageExperiencePromise = Promise.all([
      Promise.race([
        ensureImageReady(heroImage),
        wait(preloadTuning.heroReadyFallback || 1400),
      ]),
      backgroundReady,
    ]).then(revealSequence, revealSequence);

    return state.pageExperiencePromise;
  }

  function initMediaPriorityLoading(root) {
    const scope = root || document;
    bindStableMedia(scope);

    const nearImages = $$('img[data-media-tier="near"]', scope).filter((image) => image.dataset.mediaLoaded !== "true");
    if (nearImages.length) {
      loadMediaBatch(nearImages, mediaTuning.nearCriticalBatch || 2);
    }

    const deferredImages = $$('img[data-media-tier="deferred"]', document).filter(
      (image) => image.dataset.mediaLoaded !== "true" && image.dataset.src && image.dataset.mediaManual !== "true"
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

  function renderShared3DBackground() {
    return `
      <div class="page-3d-ambient page-3d-ambient--${escapeHtmlText(page)}" aria-hidden="true">
        <span class="page-3d-ambient__orb page-3d-ambient__orb--a"></span>
        <span class="page-3d-ambient__orb page-3d-ambient__orb--b"></span>
        <span class="page-3d-ambient__mesh"></span>
      </div>
      <canvas class="hero-3d-canvas page-3d-canvas js-hero-3d-canvas" aria-hidden="true" style="position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:-1;pointer-events:none;opacity:0.94;"></canvas>
    `;
  }

  function getRevealBackgroundReady(root) {
    if (!root || !SHARED_3D_BACKGROUND_PAGES.has(page)) return Promise.resolve(false);
    const canvas = $(".js-hero-3d-canvas", root);
    if (!canvas) return Promise.resolve(false);
    const readyPromise = initHero3DCanvas(root);
    const mode = getCurrentPerformanceMode();
    const fallbackMs = mode === "full"
      ? preloadTuning.fullBackgroundReadyFallback || preloadTuning.backgroundReadyFallback || 1400
      : preloadTuning.backgroundReadyFallback || 700;
    return Promise.race([
      readyPromise,
      wait(fallbackMs),
    ]).catch(() => false);
  }

  function scheduleIdleTask(callback, delayMs, idleTimeoutMs) {
    const delay = Number.isFinite(delayMs) ? delayMs : 180;
    const idleTimeout = Number.isFinite(idleTimeoutMs) ? idleTimeoutMs : 900;
    return new Promise((resolve) => {
      window.setTimeout(() => {
        const start = () => {
          if (typeof callback !== "function") {
            resolve(false);
            return;
          }
          Promise.resolve(callback()).then(resolve, () => resolve(false));
        };
        if (typeof window.requestIdleCallback === "function") {
          window.requestIdleCallback(start, { timeout: idleTimeout });
        } else {
          window.requestAnimationFrame(() => window.setTimeout(start, 0));
        }
      }, reducedMotion ? 0 : delay);
    });
  }

  function scheduleHero3DCanvas(root, delayMs, idleTimeoutMs) {
    return scheduleIdleTask(() => {
      if (!root || !root.isConnected) return false;
      return initHero3DCanvas(root);
    }, delayMs, idleTimeoutMs);
  }

  function enhanceWelcomePage(root) {
    if (page !== "welcome" || !root || !root.isConnected) return Promise.resolve(false);
    if (root.__welcomeEnhancementPromise) return root.__welcomeEnhancementPromise;

    root.__welcomeEnhancementPromise = waitForNextPaints(2)
      .then(() => scheduleIdleTask(() => {
        if (page !== "welcome" || !root.isConnected || !$(".js-mission-experience", root)) return false;

        if (typeof root.__mountWelcomeDeferredScenes__ === "function") {
          root.__mountWelcomeDeferredScenes__();
        }

        initMissionExperience(root);
        if (body.classList.contains("is-secondary-visible")) {
          initMediaPriorityLoading(root);
          initScrollMotion();
          initParallaxScenes();
        }
        scheduleHero3DCanvas(root, reducedMotion ? 0 : 160, 1200);
        return true;
      }, reducedMotion ? 0 : 80, 1200));

    return root.__welcomeEnhancementPromise;
  }

  function mountShared3DBackground(root) {
    if (!root || !SHARED_3D_BACKGROUND_PAGES.has(page)) return;
    if (!$('.js-hero-3d-canvas', root)) {
      root.insertAdjacentHTML("afterbegin", renderShared3DBackground());
    }
    initHero3DCanvas(root);
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

    const missionCopy = locale === "vi" ? {
      status: "Trạm điều phối",
      live: "",
      signalLabel: "Tín hiệu",
      signalValue: "SMARTSTEAM",
      sequenceLabel: "Vòng học tập",
      sequenceValue: "04 pha",
      briefIndex: "TÓM TẮT 01",
      factsIndex: "DỮ LIỆU 02",
      telemetryIndex: "HỆ THỐNG 03",
    } : {
      status: "Mission control",
      live: "3D scene live",
      signalLabel: "Signal",
      signalValue: "SMARTSTEAM",
      sequenceLabel: "Learning loop",
      sequenceValue: "04 phase",
      briefIndex: "BRIEF 01",
      factsIndex: "DATA 02",
      telemetryIndex: "SYSTEM 03",
    };

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

    const renderMissionTelemetry = () => `
      <div class="mission-telemetry" aria-hidden="true">
        ${stats.map((item) => `
          <div class="mission-telemetry__item">
            <span>${item.label}</span>
            <strong>${item.value}</strong>
          </div>
        `).join("")}
      </div>
    `;

    const renderMissionHud = () => `
      <div class="mission-hud" aria-hidden="true">
        <div class="mission-hud__panel mission-hud__panel--signal" data-mission-layer="4">
          <span>${missionCopy.signalLabel}</span>
          <strong>${missionCopy.signalValue}</strong>
          <i></i>
        </div>
        <div class="mission-hud__panel mission-hud__panel--sequence" data-mission-layer="3">
          <span>${missionCopy.sequenceLabel}</span>
          <strong>${missionCopy.sequenceValue}</strong>
          <div class="mission-hud__steps"><i></i><i></i><i></i><i></i></div>
        </div>
        <div class="mission-hud__orbital" data-mission-layer="2">
          <span class="mission-hud__ring"></span>
          <span class="mission-hud__ring mission-hud__ring--mid"></span>
          <span class="mission-hud__ring mission-hud__ring--inner"></span>
          <span class="mission-hud__core"></span>
        </div>
      </div>
    `;

    const renderMissionRail = () => `
      <div class="mission-scroll-progress js-mission-progress" aria-hidden="true"><span></span></div>
      <div class="mission-ambient" aria-hidden="true">
        <span class="mission-ambient__orb mission-ambient__orb--a"></span>
        <span class="mission-ambient__orb mission-ambient__orb--b"></span>
        <span class="mission-ambient__mesh"></span>
      </div>
    `;

    const renderWelcomeDeferredScenes = () => `
      <section class="scene scene--discovery tone-paper">
        <div class="container discovery-layout">
          <div class="discovery-layout__media">
            ${renderMedia(scenes[1].media, "discovery-photo", { tier: "near" })}
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
    `;

    root.innerHTML = `
      <section class="welcome-flow js-mission-experience">
        ${renderMissionRail()}
        <canvas class="hero-3d-canvas welcome-hero-canvas js-hero-3d-canvas" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: -1; pointer-events: none;"></canvas>
        <section class="scene scene--hero mission-hero tone-${scenes[0].tone}" style="position: relative; overflow: hidden; perspective: 1000px;">
          <div class="container scene-grid scene-grid--hero mission-stage" style="position: relative; z-index: 1;">
            <div class="mission-hero__scanner" aria-hidden="true"></div>
            <div class="scene-copy mission-copy" data-stage="copy" data-mission-layer="2">
              <div class="mission-status-bar" aria-hidden="true">
                <span>${missionCopy.status}</span>
                <strong>${missionCopy.live}</strong>
              </div>
              <p class="scene-kicker">${scenes[0].eyebrow}</p>
              <h1 class="display-title">${scenes[0].headline}</h1>
              <p class="scene-body scene-body--hero">${scenes[0].body}</p>
              <div class="scene-actions">
                <a class="button button--primary" href="${scenes[0].cta.primary.href}" data-transition>${scenes[0].cta.primary.label}</a>
                <a class="button button--ghost" href="${scenes[0].cta.secondary.href}" data-transition>${scenes[0].cta.secondary.label}</a>
              </div>
              ${renderMissionTelemetry()}
            </div>

            <div class="scene-hero-visual mission-visual" data-stage="hero" data-mission-layer="5">
              <div class="mission-visual__frame">
                ${renderMedia(scenes[0].media, "scene-hero-visual__main", { tier: "critical", stage: "hero" })}
                <span class="mission-visual__reticle"></span>
                <span class="mission-hotspot mission-hotspot--a"><span></span></span>
                <span class="mission-hotspot mission-hotspot--b"><span></span></span>
                <span class="mission-hotspot mission-hotspot--c"><span></span></span>
              </div>
            </div>

            ${renderMissionHud()}

            <div class="hero-cards-grid mission-card-grid" data-stage="secondary">
              <div class="hero-card mission-card mission-card--brief" data-mission-panel>
                <span class="mission-card__index">${missionCopy.briefIndex}</span>
                <h3 class="hero-card__title">${scenes[0].headline}</h3>
                <p class="hero-card__body">${scenes[0].body}</p>
                <div class="hero-card__actions">
                  <a class="button button--primary" href="${scenes[0].cta.primary.href}" data-transition>${scenes[0].cta.primary.label}</a>
                  <a class="button button--ghost" href="${scenes[0].cta.secondary.href}" data-transition>${scenes[0].cta.secondary.label}</a>
                </div>
              </div>

              <div class="hero-card hero-card--facts mission-card mission-card--facts" data-mission-panel>
                <span class="mission-card__index">${missionCopy.factsIndex}</span>
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

              <div class="hero-card hero-card--stats mission-card mission-card--telemetry" data-mission-panel>
                <span class="mission-card__index">${missionCopy.telemetryIndex}</span>
                <span class="hero-card__eyebrow">${scenes[0].eyebrow}</span>
                <h3 class="hero-card__title">${scenes[0].noteTitle}</h3>
                <div class="hero-card__stat-list">
                  ${stats.map((item) => `
                    <div class="hero-card-stat">
                      <strong>${item.value}</strong>
                      <span>${item.label}</span>
                    </div>
                  `).join("")}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div class="welcome-deferred-anchor js-welcome-deferred-scenes" data-stage="deferred" aria-hidden="true"></div>
      </section>
    `;
    root.__welcomeEnhancementPromise = null;
    root.__mountWelcomeDeferredScenes__ = () => {
      const placeholder = $(".js-welcome-deferred-scenes", root);
      if (!placeholder || !placeholder.isConnected) return false;
      placeholder.insertAdjacentHTML("beforebegin", renderWelcomeDeferredScenes());
      placeholder.remove();
      root.__mountWelcomeDeferredScenes__ = null;
      return true;
    };
    registerPageCleanup(root, () => {
      root.__welcomeEnhancementPromise = null;
      root.__mountWelcomeDeferredScenes__ = null;
    });
  }

  function renderProductsPage() {
    const root = $(".js-page-root");
    if (!root) return;
    var footer = document.querySelector('.site-footer');
    var previousFooterDisplay = footer ? footer.style.display : '';
    if (footer) footer.style.display = 'none';
    state.productSceneBootUntil = performance.now() + 900;
    updateMeta(strings.pageMeta.products.title, strings.pageMeta.products.description);
    var productCleanups = [];
    function bindProductEvent(target, type, handler, options) {
      if (!target || !type || typeof handler !== 'function') return;
      target.addEventListener(type, handler, options);
      productCleanups.push(function() {
        target.removeEventListener(type, handler, options);
      });
    }

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
        titleEn: p.titleEn && p.titleEn !== p.titleVi ? p.titleEn : deriveEnglishTitle(p, p.titleVi),
        taglineVi: p.taglineVi || '',
        taglineEn: p.taglineEn && p.taglineEn !== p.taglineVi ? p.taglineEn : deriveEnglishSummary(p, p.taglineVi || p.titleVi),
        summaryVi: p.summaryVi || '',
        summaryEn: p.summaryEn && p.summaryEn !== p.summaryVi ? p.summaryEn : deriveEnglishSummary(p, p.summaryVi || p.titleVi),
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

    root.innerHTML = '<h1 class="visually-hidden">' + (locale === 'vi' ? 'Sản phẩm SMARTSTEAM' : 'SMARTSTEAM products') + '</h1>' +
      '<canvas class="hero-3d-canvas js-hero-3d-canvas" style="position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:-1;pointer-events:none;opacity:0.85;"></canvas>' +
      '<div class="galaxy-command-aura" aria-hidden="true"><span></span><span></span><span></span></div>' +
      '<div class="galaxy-command-core" aria-hidden="true"><span></span><span></span><span></span><i></i></div>' +
      '<div class="galaxy-scene js-galaxy-scene">' +
        '<div class="galaxy-board-hint galaxy-board-hint--top js-galaxy-board-hint-top">' +
          (locale === 'vi' ? 'Kéo xuống để xem thêm sản phẩm phía trên' : 'Scroll down to reveal more products above') +
        '</div>' +
        '<div class="galaxy-sphere js-galaxy-sphere"></div>' +
        '<div class="galaxy-board-hint galaxy-board-hint--bottom js-galaxy-board-hint-bottom">' +
          (locale === 'vi' ? 'Kéo lên để xem thêm sản phẩm phía dưới' : 'Scroll up to reveal more products below') +
        '</div>' +
      '</div>' +
      '<div class="galaxy-control-dock js-galaxy-controls" aria-label="' + (locale === 'vi' ? 'Điều khiển hình cầu sản phẩm' : 'Product sphere controls') + '">' +
        '<button class="galaxy-control-btn js-galaxy-zoom-in" type="button" aria-label="' + (locale === 'vi' ? 'Phóng to' : 'Zoom in') + '" title="' + (locale === 'vi' ? 'Phóng to' : 'Zoom in') + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>' +
        '<button class="galaxy-control-btn js-galaxy-zoom-out" type="button" aria-label="' + (locale === 'vi' ? 'Thu nhỏ' : 'Zoom out') + '" title="' + (locale === 'vi' ? 'Thu nhỏ' : 'Zoom out') + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg></button>' +
        '<button class="galaxy-control-btn js-galaxy-motion-toggle" type="button" data-motion-state="running" aria-pressed="false" aria-label="' + (locale === 'vi' ? 'Dừng quỹ đạo' : 'Pause orbit') + '" title="' + (locale === 'vi' ? 'Dừng quỹ đạo' : 'Pause orbit') + '"><svg class="galaxy-icon galaxy-icon--pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg><svg class="galaxy-icon galaxy-icon--play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7-11-7Z"/></svg></button>' +
        '<button class="galaxy-control-btn js-galaxy-reset" type="button" aria-label="' + (locale === 'vi' ? 'Đặt lại góc nhìn' : 'Reset view') + '" title="' + (locale === 'vi' ? 'Đặt lại góc nhìn' : 'Reset view') + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.34-5.66M4 4v6h6"/></svg></button>' +
      '</div>' +
      '<div class="galaxy-state-chip js-galaxy-state" aria-live="polite"><i aria-hidden="true"></i><span class="js-galaxy-state-label">AUTO</span></div>';

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
        all: 'TẤT CẢ KHOẢNG GIÁ',
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
        all: 'TẤT CẢ KHOẢNG GIÁ',
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
    var boardScrollSpacerEl = document.createElement('div');
    boardScrollSpacerEl.className = 'galaxy-board-scroll-spacer';
    boardScrollSpacerEl.setAttribute('aria-hidden', 'true');
    sceneEl.appendChild(boardScrollSpacerEl);
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
    var priceOpenedByFocusAt = 0;
    var productDetailNavigationPending = false;

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
    var mobileProductCardImagesInline = false;

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
        x: px,
        y: py,
        z: pz,
        baseSphereTransform: sphereTransform,
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

      var cardMediaOptions = mobileProductCardImagesInline
        ? { tier: 'near', loading: 'eager', inline: true, fetchPriority: 'auto' }
        : { tier: 'deferred', loading: 'lazy', manual: true };

      cardsHTML += '<div class="galaxy-card ' + sc + '" data-card-idx="' + i + '" style="--card-delay:' + ((i % 18) * 42) + 'ms; --card-phase:' + ((i % 12) * 30) + 'deg; --card-depth:' + Math.round(pz) + '; transform:' + sphereTransform + '">' +
        '<div class="galaxy-card__inner">' +
          '<div class="galaxy-card__img">' + renderMedia(getCatalogueThumbMedia(item.cover), '', cardMediaOptions) + '</div>' +
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
    var galaxyImagesByDepth = cardNodes
      .slice()
      .sort(function(leftCard, rightCard) {
        var leftPose = cardPositions[parseInt(leftCard.dataset.cardIdx, 10)] || {};
        var rightPose = cardPositions[parseInt(rightCard.dataset.cardIdx, 10)] || {};
        return (rightPose.z || 0) - (leftPose.z || 0);
      })
      .map(function(card) { return card.querySelector('img[data-src]'); })
      .filter(Boolean);
    function loadGalaxyImages(images, batchSize) {
      var pendingImages = (images || []).filter(function(image) {
        return image && image.dataset.mediaLoaded !== 'true' && image.dataset.src;
      });
      if (!pendingImages.length) return Promise.resolve([]);
      return loadMediaBatch(pendingImages, batchSize || (window.innerWidth < 760 ? 3 : 5));
    }

    function getGalaxyImageLoadPlan() {
      var mode = getCurrentPerformanceMode();
      var mobile = window.innerWidth < 760;
      if (mode === 'safe') {
        return {
          visibleLimit: mobile ? 8 : 14,
          visibleBatch: mobile ? 3 : 5,
          firstBatch: mobile ? 24 : 54,
          firstBatchSize: mobile ? 4 : 6,
          firstDelay: 120,
          idleBatchSize: mobile ? 3 : 5,
          idleMaxBatch: mobile ? 3 : 5,
          idleStartDelay: 900,
          idleStepDelay: 320,
        };
      }
      if (mode === 'balanced') {
        return {
          visibleLimit: mobile ? 5 : 10,
          visibleBatch: mobile ? 3 : 4,
          firstBatch: mobile ? 5 : 10,
          firstBatchSize: mobile ? 3 : 5,
          firstDelay: 180,
          idleBatchSize: mobile ? 2 : 4,
          idleMaxBatch: 0,
          idleStartDelay: 980,
          idleStepDelay: 210,
        };
      }
      return {
        visibleLimit: mobile ? 6 : 12,
        visibleBatch: mobile ? 4 : 6,
        firstBatch: mobile ? 6 : 12,
        firstBatchSize: mobile ? 4 : 7,
        firstDelay: 110,
        idleBatchSize: mobile ? 3 : 5,
        idleMaxBatch: 0,
        idleStartDelay: 760,
        idleStepDelay: 170,
      };
    }

    var galaxyImagePumpTimer = null;
    var galaxyImagePumpIdle = 0;
    var galaxyInitialImageTimer = null;
    var galaxyVisibleImageFrame = 0;
    var lastVisibleImageLoadAt = 0;
    var lastGridImageLoadAt = 0;
    var safeVisibleImageBudget = window.innerWidth < 760 ? 32 : 54;

    function isMobileProductLite() {
      return window.innerWidth < 760;
    }

    function getVisibleGalaxyImages(limit) {
      var viewportW = Math.max(1, window.innerWidth || 1);
      var viewportH = Math.max(1, window.innerHeight || 1);
      var centerX = viewportW / 2;
      var centerY = viewportH / 2;
      return cardNodes
        .map(function(card) {
          var image = card.querySelector('img[data-src]');
          if (!image || image.dataset.mediaLoaded === 'true' || !image.dataset.src) return null;
          var inner = card.querySelector('.galaxy-card__inner') || card;
          var rect = inner.getBoundingClientRect();
          if (!rect.width || !rect.height) return null;
          if (rect.right < -40 || rect.left > viewportW + 40 || rect.bottom < -40 || rect.top > viewportH + 40) return null;
          var dx = (rect.left + rect.width / 2) - centerX;
          var dy = (rect.top + rect.height / 2) - centerY;
          var distance = Math.sqrt(dx * dx + dy * dy);
          var area = rect.width * rect.height;
          return { image: image, score: area - distance * 3 };
        })
        .filter(Boolean)
        .sort(function(left, right) { return right.score - left.score; })
        .slice(0, limit || 10)
        .map(function(entry) { return entry.image; });
    }

    function loadVisibleGalaxyImages(force) {
      if (layoutMode !== 'sphere') return;
      if (getCurrentPerformanceMode() === 'safe' && !force) {
        var loadedCount = cardNodes.filter(function(card) {
          var image = card.querySelector('img[data-media-loaded="true"]');
          return !!image;
        }).length;
        if (loadedCount >= safeVisibleImageBudget) return;
      }
      var now = performance.now ? performance.now() : Date.now();
      if (!force && now - lastVisibleImageLoadAt < (getCurrentPerformanceMode() === 'safe' ? 420 : 260)) return;
      lastVisibleImageLoadAt = now;
      var plan = getGalaxyImageLoadPlan();
      loadGalaxyImages(getVisibleGalaxyImages(plan.visibleLimit), plan.visibleBatch);
    }

    function getInitialGalaxyImages(limit) {
      var selected = getVisibleGalaxyImages(limit || 1);
      var seen = new Set(selected);
      galaxyImagesByDepth.forEach(function(image) {
        if (selected.length >= limit) return;
        if (!image || seen.has(image)) return;
        selected.push(image);
        seen.add(image);
      });
      return selected;
    }

    function requestVisibleGalaxyImages(force) {
      if (galaxyVisibleImageFrame) return;
      galaxyVisibleImageFrame = requestAnimationFrame(function() {
        galaxyVisibleImageFrame = 0;
        loadVisibleGalaxyImages(force);
      });
    }

    function scheduleGalaxyIdleImages(images, startIndex) {
      var pendingImages = (images || []).slice(startIndex || 0).filter(Boolean);
      if (!pendingImages.length) return;
      var index = 0;
      var plan = getGalaxyImageLoadPlan();
      var idleBatchSize = plan.idleBatchSize;
      var maxBatch = plan.idleMaxBatch;
      if (isMobileProductLite() || maxBatch <= 0) return;
      var queueNext = function(delay) {
        galaxyImagePumpTimer = window.setTimeout(function() {
          galaxyImagePumpTimer = null;
          if (typeof window.requestIdleCallback === 'function') {
            galaxyImagePumpIdle = window.requestIdleCallback(function(deadline) {
              galaxyImagePumpIdle = 0;
              loadNext(deadline);
            }, { timeout: 900 });
          } else {
            window.requestAnimationFrame(function() { loadNext(null); });
          }
        }, delay);
      };
      var loadNext = function(deadline) {
        if (!pendingImages.length || layoutMode !== 'sphere') return;
        requestVisibleGalaxyImages(true);
        var timeLeft = deadline && typeof deadline.timeRemaining === 'function' ? deadline.timeRemaining() : 14;
        var batch = [];
        while (index < pendingImages.length && batch.length < maxBatch && timeLeft > 3) {
          var nextImage = pendingImages[index];
          index += 1;
          if (!nextImage || nextImage.dataset.mediaLoaded === 'true' || !nextImage.dataset.src) continue;
          batch.push(nextImage);
          timeLeft -= 2;
        }
        if (!batch.length) {
          if (index < pendingImages.length && layoutMode === 'sphere') queueNext(120);
          return;
        }
        loadGalaxyImages(batch, idleBatchSize).finally(function() {
          if (index >= pendingImages.length || layoutMode !== 'sphere') return;
          queueNext(plan.idleStepDelay);
        });
      };
      queueNext(plan.idleStartDelay);
    }

    if (galaxyImagesByDepth.length) {
      var initialImagePlan = getGalaxyImageLoadPlan();
      var firstGalaxyBatch = initialImagePlan.firstBatch;
      requestVisibleGalaxyImages(true);
      galaxyInitialImageTimer = window.setTimeout(function() {
        loadGalaxyImages(getInitialGalaxyImages(firstGalaxyBatch), initialImagePlan.firstBatchSize);
      }, initialImagePlan.firstDelay);
      scheduleGalaxyIdleImages(galaxyImagesByDepth, 0);
    }
    var layoutMode = 'sphere';
    var boardScrollCurrent = 0;
    var boardScrollTarget = 0;
    var boardScrollMin = 0;
    var boardScrollMax = 0;
    var boardScrollEffectTimer = null;
    var lastBoardTransformY = null;
    var lastCanRevealTop = null;
    var lastCanRevealBottom = null;
    var boardScrollRange = 0;
    var isSyncingBoardScroll = false;
    var boardTouchActive = false;
    var boardTouchStartY = 0;
    var boardTouchStartScroll = 0;
    var boardTouchMoved = false;
    var boardGridPose = {};
    var gridMorphTimer = null;
    var boardConnectionTimer = null;
    var boardConnectionToken = 0;
    var renderResultsTimer = null;
    var morphLayerEl = null;
    var gravityOverlayEl = null;
    var gravityOverlayTimer = null;
    var GRID_MORPH_DURATION = reducedMotion ? 0 : 640;
    var GRID_REFLOW_DURATION = reducedMotion ? 0 : 180;
    var gridMorphHoldUntil = 0;

    function getCenteredSphereTransform(card, pose) {
      if (!card || !pose || !pose.baseSphereTransform) return pose && pose.sphereTransform ? pose.sphereTransform : '';
      var inner = card.querySelector('.galaxy-card__inner');
      if (!inner) return pose.baseSphereTransform;
      var cardWidth = inner.offsetWidth || inner.getBoundingClientRect().width || 0;
      var cardHeight = inner.offsetHeight || inner.getBoundingClientRect().height || 0;

      return pose.baseSphereTransform.replace(/translate3d\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px\)/, function(match, x, y, z) {
        return 'translate3d(' + (Number(x) - cardWidth / 2).toFixed(1) + 'px,' + (Number(y) - cardHeight / 2).toFixed(1) + 'px,' + z + 'px)';
      });
    }

    function syncSphereCardOrigins() {
      cardNodes.forEach(function(card, idx) {
        var pose = cardPositions[idx];
        if (!pose) return;
        pose.sphereTransform = getCenteredSphereTransform(card, pose);
        if (layoutMode === 'sphere' && !card.classList.contains('is-expanded')) {
          syncSphereCardDepth(card, card.classList.contains('galaxy-card--focus-locked') ? 'locked' : (card.classList.contains('galaxy-card--focused') ? 'hover' : false));
        }
      });
    }

    // ═══════════════════════════════════════════
    // DRAG-TO-ROTATE 360° (like Google Earth)
    // ═══════════════════════════════════════════
    var DEFAULT_ROT_X = -5;
    var AUTO_SPIN_SPEED = 0.12;     // idle auto-rotation speed
    var PRODUCT_SPHERE_FRAME_INTERVAL = 16;
    var PRODUCT_IDLE_SPIN_MAX_DELTA = 1000;
    var rotX = DEFAULT_ROT_X, rotY = 0;        // current rotation angles
    var velX = 0, velY = AUTO_SPIN_SPEED;      // velocity (momentum) — start with steady auto-spin
    var isDragging = false;
    var lastX = 0, lastY = 0;
    var idleTimer = null;
    var isIdle = true;              // true = auto-spin active
    var DRAG_SENS_H = 0.3;         // horizontal drag sensitivity
    var DRAG_SENS_V = 0.15;        // vertical drag sensitivity (gentler to avoid over-tilt)
    var FRICTION = 0.96;            // momentum decay (higher = longer glide)
    var IDLE_DELAY = 3000;          // ms before auto-spin resumes
    var MAX_TILT_X = 62;
    var MIN_ZOOM = window.innerWidth < 900 ? 0.44 : 0.56;
    var MAX_ZOOM = window.innerWidth < 900 ? 1.36 : 1.48;
    var ZOOM_STEP = window.innerWidth < 900 ? 0.055 : 0.06;
    var DEFAULT_ZOOM = window.innerWidth < 900 ? 0.66 : 0.76;
    var cZoom = DEFAULT_ZOOM;
    var hoverFocusActive = false;
    var hoverFocusCard = null;
    var focusLockedCard = null;
    var sphereHoverPaused = false;
    var hoverAnchorX = 0;
    var hoverAnchorY = 0;
    var HOVER_SWITCH_DELAY = 80;
    var HOVER_KEEP_PADDING = 0;
    var HOVER_RESUME_DELAY = 620;
    var MOVE_THRESH = 10;   // px before considered a drag
    var HOVER_FOCUS_EASE = 0.2;
    var HOVER_SNAP_EPSILON = 0.32;
    var MOTION_DECEL_EASE = 0.12;
    var MOTION_STOP_EPSILON = 0.002;
    var hoverTargetRotX = rotX;
    var hoverTargetRotY = rotY;
    var zoomInBtn = document.querySelector('.js-galaxy-zoom-in');
    var zoomOutBtn = document.querySelector('.js-galaxy-zoom-out');
    var zoomResetBtn = document.querySelector('.js-galaxy-reset');
    var motionToggleBtn = document.querySelector('.js-galaxy-motion-toggle');
    var galaxyStateEl = document.querySelector('.js-galaxy-state');
    var galaxyStateLabel = document.querySelector('.js-galaxy-state-label');
    var interactionState = 'idle';
    var userMotionPaused = false;
    var interactionLabels = {
      idle: 'AUTO',
      dragging: 'DRAG',
      hover: 'FOCUS',
      locked: 'LOCK',
      paused: 'PAUSE',
      modal: 'MODAL',
      grid: 'GRID',
      zoom: 'ZOOM',
      keyboard: 'KEY'
    };

    function setInteractionState(nextState) {
      interactionState = nextState || 'idle';
      sceneEl.dataset.orbitState = interactionState;
      if (galaxyStateEl) galaxyStateEl.dataset.orbitState = interactionState;
      if (galaxyStateLabel) galaxyStateLabel.textContent = interactionLabels[interactionState] || interactionState.toUpperCase();
      requestGalaxyFrame();
    }

    function syncMotionToggleButton() {
      if (!motionToggleBtn) return;
      var isPaused = !!userMotionPaused;
      var label = isPaused
        ? (locale === 'vi' ? 'Chạy quỹ đạo' : 'Resume orbit')
        : (locale === 'vi' ? 'Dừng quỹ đạo' : 'Pause orbit');
      motionToggleBtn.dataset.motionState = isPaused ? 'paused' : 'running';
      motionToggleBtn.setAttribute('aria-pressed', isPaused ? 'true' : 'false');
      motionToggleBtn.setAttribute('aria-label', label);
      motionToggleBtn.setAttribute('title', label);
    }

    function getAutoSpinSpeed() {
      return getCurrentPerformanceMode() === 'safe' ? 0.03 : AUTO_SPIN_SPEED;
    }

    function pauseSphereByUser() {
      userMotionPaused = true;
      sphereHoverPaused = false;
      isDragging = false;
      isIdle = false;
      if (Math.abs(velY) < 0.015 && interactionState === 'idle') velY = getAutoSpinSpeed();
      clearTimeout(idleTimer);
      if (!focusLockedCard && layoutMode === 'sphere' && !sphereFrozen) setInteractionState('paused');
      syncMotionToggleButton();
    }

    function resumeSphereByUser() {
      userMotionPaused = false;
      sphereFrozen = false;
      sphereHoverPaused = false;
      if (!focusLockedCard && layoutMode === 'sphere') {
        isIdle = true;
        setInteractionState('idle');
      }
      syncMotionToggleButton();
    }

    function toggleSphereMotion() {
      if (userMotionPaused) resumeSphereByUser();
      else pauseSphereByUser();
    }

    function updateZoomButtons() {
      if (zoomOutBtn) zoomOutBtn.disabled = cZoom <= MIN_ZOOM + 0.001;
      if (zoomInBtn) zoomInBtn.disabled = cZoom >= MAX_ZOOM - 0.001;
    }

    function applyRot() {
      sphere.style.transform = 'rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg) scale3d(' + cZoom + ',' + cZoom + ',' + cZoom + ')';
    }

    function setSphereZoom(nextZoom, stateName) {
      cZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
      applyRot();
      updateZoomButtons();
      syncHoverPreviewPosition();
      if (stateName) setInteractionState(stateName);
    }

    function nudgeSphereZoom(direction) {
      setSphereZoom(cZoom + (direction * ZOOM_STEP), 'zoom');
      clearTimeout(idleTimer);
      idleTimer = setTimeout(function() {
        if (focusLockedCard) {
          setInteractionState('locked');
          return;
        }
        if (userMotionPaused) {
          setInteractionState('paused');
          return;
        }
        if (!sphereFrozen && !focusLockedCard && layoutMode === 'sphere') setInteractionState('idle');
      }, 900);
    }

    function resetSphereView() {
      clearSphereFocus(true);
      sphereFrozen = false;
      userMotionPaused = false;
      isDragging = false;
      isIdle = false;
      rotX = DEFAULT_ROT_X;
      rotY = 0;
      velX = 0;
      velY = 0;
      setSphereZoom(DEFAULT_ZOOM, 'idle');
      syncMotionToggleButton();
      resumeSphere();
    }

    applyRot();
    updateZoomButtons();
    syncMotionToggleButton();
    setInteractionState('idle');
    syncSphereCardOrigins();

    function shortestAngleDelta(fromAngle, toAngle) {
      return ((toAngle - fromAngle + 540) % 360) - 180;
    }

    function pointInsideCard(card, clientX, clientY, padding) {
      if (!card) return false;
      var inner = card.querySelector('.galaxy-card__inner');
      var rect = (inner || card).getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      var buffer = typeof padding === 'number' ? padding : 0;
      return clientX >= rect.left - buffer && clientX <= rect.right + buffer && clientY >= rect.top - buffer && clientY <= rect.bottom + buffer;
    }

    function getSphereCardTransform(card, depthOffset) {
      var cardIndex = parseInt(card.dataset.cardIdx, 10);
      var cardPose = cardPositions[cardIndex];
      if (!cardPose) return '';
      return cardPose.sphereTransform + (depthOffset ? ' translateZ(' + depthOffset + 'px)' : '');
    }

    function syncSphereCardDepth(card, focusMode) {
      if (!card || layoutMode !== 'sphere' || card.classList.contains('is-expanded')) return;
      var lift = focusMode === 'locked' ? 94 : 0;
      card.style.transform = getSphereCardTransform(card, lift);
      card.style.zIndex = focusMode ? (focusMode === 'locked' ? '280' : '240') : '';
    }

    function focusSphereOnCard(card, clientX, clientY) {
      var cardIndex = parseInt(card.dataset.cardIdx, 10);
      var cardPose = cardPositions[cardIndex];
      if (!cardPose) return;

      hoverFocusCard = card;
      hoverAnchorX = typeof clientX === 'number' ? clientX : hoverAnchorX;
      hoverAnchorY = typeof clientY === 'number' ? clientY : hoverAnchorY;
      hoverFocusActive = true;
      sphereHoverPaused = false;
      hoverTargetRotX = Math.max(-MAX_TILT_X, Math.min(MAX_TILT_X, cardPose.rotX));
      hoverTargetRotY = rotY + shortestAngleDelta(rotY, cardPose.rotY);
      sphereFrozen = false;
      isDragging = false;
      isIdle = false;
      velX = 0;
      velY = 0;
      clearTimeout(idleTimer);
    }

    function pauseSphereForHover() {
      sphereHoverPaused = true;
      sphereFrozen = false;
      isDragging = false;
      isIdle = false;
      velX = 0;
      velY = 0;
      clearTimeout(idleTimer);
    }

    function releaseSphereHoverFocus() {
      clearHoverCandidate();
      hideHoverPreview();
      if (hoverFocusCard) {
        syncSphereCardDepth(hoverFocusCard, false);
      }
      hoverFocusActive = false;
      hoverFocusCard = null;
      sphereHoverPaused = false;
    }

    function getCardViewDepth(card) {
      var cardIndex = parseInt(card.dataset.cardIdx, 10);
      var pose = cardPositions[cardIndex];
      if (!pose) return 0;
      var ry = rotY * Math.PI / 180;
      var rx = rotX * Math.PI / 180;
      var cosY = Math.cos(ry);
      var sinY = Math.sin(ry);
      var cosX = Math.cos(rx);
      var sinX = Math.sin(rx);
      var zAfterY = (pose.z * cosY) - (pose.x * sinY);
      return (pose.y * sinX) + (zAfterY * cosX);
    }

    function isHoverableSphereCard(card) {
      return !!(card && !card.classList.contains('galaxy-card--grid') && !card.classList.contains('is-expanded') && card.style.visibility !== 'hidden' && card.style.pointerEvents !== 'none');
    }

    function findFrontCardAt(clientX, clientY) {
      if (layoutMode !== 'sphere') return null;
      var rankedElements = document.elementsFromPoint(clientX, clientY);
      var topCards = [];
      rankedElements.forEach(function(el) {
        var hitCard = el.closest && el.closest('.galaxy-card');
        if (isHoverableSphereCard(hitCard) && topCards.indexOf(hitCard) === -1) topCards.push(hitCard);
      });
      if (!topCards.length) return null;

      var bestCard = null;
      var bestScore = -Infinity;
      topCards.forEach(function(card, topRank) {
        var inner = card.querySelector('.galaxy-card__inner');
        var rect = (inner || card).getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return;
        var centerDx = clientX - (rect.left + rect.width / 2);
        var centerDy = clientY - (rect.top + rect.height / 2);
        var centerDistance = Math.sqrt(centerDx * centerDx + centerDy * centerDy);
        var score = getCardViewDepth(card) - (centerDistance * 0.18) + 280 - (topRank * 36);
        if (card === hoverFocusCard) score += 8;
        if (score > bestScore) {
          bestScore = score;
          bestCard = card;
        }
      });
      return bestCard;
    }

    function clearSphereFocus(forceLocked) {
      if (focusLockedCard && !forceLocked) return;
      clearHoverCandidate();
      clearTimeout(hoverReleaseTimer);
      sphereHoverPaused = false;
      var focusedCards = sphere.querySelectorAll('.galaxy-card--focused, .galaxy-card--focus-locked');
      focusedCards.forEach(function(card) {
        card.classList.remove('galaxy-card--focused', 'galaxy-card--focus-locked');
        syncSphereCardDepth(card, false);
      });
      focusLockedCard = null;
      sceneEl.classList.remove('is-focus-locked');
      releaseSphereHoverFocus();
      if (layoutMode === 'sphere' && !sphereFrozen && !isDragging) setInteractionState('idle');
    }

    function setSphereFocus(card, clientX, clientY, lockFocus) {
      if (!card || layoutMode !== 'sphere') return;
      if (focusLockedCard && !lockFocus) return;
      clearHoverCandidate();
      var prevCards = sphere.querySelectorAll('.galaxy-card--focused, .galaxy-card--focus-locked');
      prevCards.forEach(function(prev) {
        if (prev === card) return;
        prev.classList.remove('galaxy-card--focused', 'galaxy-card--focus-locked');
        syncSphereCardDepth(prev, false);
      });
      focusLockedCard = lockFocus ? card : null;
      sceneEl.classList.toggle('is-focus-locked', !!lockFocus);
      card.classList.add('galaxy-card--focused');
      card.classList.toggle('galaxy-card--focus-locked', !!lockFocus);
      loadGalaxyImages([card.querySelector('img[data-src]')], 1);
      syncSphereCardDepth(card, lockFocus ? 'locked' : 'hover');
      showHoverPreview(card, lockFocus);
      clearTimeout(hoverReleaseTimer);
      if (lockFocus) {
        focusSphereOnCard(card, clientX, clientY);
      } else {
        hoverFocusCard = card;
        hoverAnchorX = typeof clientX === 'number' ? clientX : hoverAnchorX;
        hoverAnchorY = typeof clientY === 'number' ? clientY : hoverAnchorY;
        hoverFocusActive = false;
        pauseSphereForHover();
      }
      setInteractionState(lockFocus ? 'locked' : 'hover');
    }

    var hoverPickFrame = 0;
    var hoverPickX = 0;
    var hoverPickY = 0;
    var hoverReleaseTimer = null;
    var hoverCandidateCard = null;
    var hoverCandidateAt = 0;
    var hoverCandidateTimer = null;

    function clearHoverCandidate() {
      clearTimeout(hoverCandidateTimer);
      hoverCandidateCard = null;
      hoverCandidateAt = 0;
      hoverCandidateTimer = null;
    }

    function commitHoverCandidate(card) {
      if (!card || hoverCandidateCard !== card) return;
      if (layoutMode !== 'sphere' || isDragging || sphereFrozen || focusLockedCard || isPinching) return;
      if (findFrontCardAt(hoverPickX, hoverPickY) !== card) return;
      if (!pointInsideCard(card, hoverPickX, hoverPickY, HOVER_KEEP_PADDING)) return;
      clearHoverCandidate();
      setSphereFocus(card, hoverPickX, hoverPickY, false);
    }

    function scheduleHoverCandidate(card) {
      hoverCandidateCard = card;
      hoverCandidateAt = performance.now ? performance.now() : Date.now();
      clearTimeout(hoverCandidateTimer);
      hoverCandidateTimer = setTimeout(function() {
        commitHoverCandidate(card);
      }, HOVER_SWITCH_DELAY);
    }

    function scheduleSphereHoverRelease(immediate) {
      clearTimeout(hoverReleaseTimer);
      hoverReleaseTimer = setTimeout(function() {
        if (focusLockedCard || isDragging || sphereFrozen || layoutMode !== 'sphere') return;
        clearSphereFocus(true);
        resumeSphere(false, HOVER_RESUME_DELAY);
      }, immediate ? 0 : 90);
    }

    function updateSphereHoverFromPoint(clientX, clientY) {
      if (layoutMode !== 'sphere' || isDragging || sphereFrozen || focusLockedCard || isPinching) return;
      var card = findFrontCardAt(clientX, clientY);
      if (hoverFocusCard && card === hoverFocusCard && pointInsideCard(hoverFocusCard, clientX, clientY, HOVER_KEEP_PADDING)) {
        clearTimeout(hoverReleaseTimer);
        clearHoverCandidate();
        return;
      }
      if (card) {
        clearTimeout(hoverReleaseTimer);
        if (card === hoverFocusCard) {
          clearHoverCandidate();
          return;
        }
        if (hoverFocusCard) {
          hoverFocusCard.classList.remove('galaxy-card--focused');
          releaseSphereHoverFocus();
        }
        if (hoverCandidateCard !== card) {
          scheduleHoverCandidate(card);
          return;
        }
        if (((performance.now ? performance.now() : Date.now()) - hoverCandidateAt) < HOVER_SWITCH_DELAY) return;
        clearHoverCandidate();
        setSphereFocus(card, clientX, clientY, false);
        return;
      }
      clearHoverCandidate();
      if (hoverFocusCard) {
        scheduleSphereHoverRelease(true);
      }
    }

    function queueSphereHover(clientX, clientY) {
      hoverPickX = clientX;
      hoverPickY = clientY;
      if (hoverPickFrame) return;
      hoverPickFrame = requestAnimationFrame(function() {
        hoverPickFrame = 0;
        updateSphereHoverFromPoint(hoverPickX, hoverPickY);
      });
    }

    bindProductEvent(sceneEl, 'pointerleave', function() {
      if (layoutMode !== 'sphere' || focusLockedCard || isDragging || sphereFrozen) return;
      scheduleSphereHoverRelease(true);
    });

    // --- Drag start ---
    function onDragStart(x, y) {
      if (layoutMode === 'grid') return;
      clearSphereFocus(true);
      sphereHoverPaused = false;
      isDragging = true;
      isIdle = false;
      lastX = x;
      lastY = y;
      // Stop any remaining momentum so it feels responsive
      velX = 0;
      velY = 0;
      clearTimeout(idleTimer);
      setInteractionState('dragging');
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
      sphereHoverPaused = false;
      sceneEl.style.cursor = 'grab';
      if (userMotionPaused) {
        velX = 0;
        velY = 0;
        setInteractionState('paused');
        return;
      }
      // Schedule auto-spin resume after idle delay
      clearTimeout(idleTimer);
      idleTimer = setTimeout(function() {
        isIdle = true;
        if (!sphereFrozen && !focusLockedCard && layoutMode === 'sphere') setInteractionState('idle');
      }, IDLE_DELAY);
    }

    // ═══════════════════════════════════════════
    // HOLD / CLICK / DRAG — unified pointer logic
    // ═══════════════════════════════════════════
    var holdTimer = null;
    var holdCard  = null;
    var pDownX = 0, pDownY = 0;
    var pMoved = false;
    var HOLD_MS = 350;
    var sphereFrozen = false;  // hard freeze — animation loop does nothing
    var activePreviewCard = null; // the card currently being previewed
    var activePreviewMode = '';
    var activePointers = {};
    var primaryPointerId = null;
    var pointerStartedOnLockedCard = false;
    var isPinching = false;
    var pinchStartDistance = 0;
    var pinchStartZoom = cZoom;

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
      if (!card) return null;
      return demoProducts[parseInt(card.dataset.cardIdx, 10)];
    }

    function goToProductDetail(product) {
      if (!product || !product.slug || productDetailNavigationPending) return;
      productDetailNavigationPending = true;
      clearTimeout(holdTimer);
      clearTimeout(renderResultsTimer);
      clearTimeout(gridMorphTimer);
      clearTimeout(boardConnectionTimer);
      if (resultsPanel) resultsPanel.style.display = 'none';
      if (sceneEl) {
        sceneEl.classList.remove('is-morphing-to-sphere');
        sceneEl.style.pointerEvents = 'none';
      }
      if (searchBarEl) searchBarEl.style.pointerEvents = 'none';
      window.location.href = getLocalePath('product-detail', product.slug);
    }

    function syncHoverPreviewPosition() {
      if (!activePreviewCard || !hoverPreviewEl.firstElementChild) return;
      var inner = activePreviewCard.querySelector('.galaxy-card__inner');
      if (!inner) return;
      var rect = inner.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      var filterRect = searchBarEl ? searchBarEl.getBoundingClientRect() : null;
      var minTop = filterRect ? filterRect.bottom + 10 : 12;
      var previewWidth = window.innerWidth < 540
        ? Math.min(window.innerWidth - 24, 320)
        : (window.innerWidth < 760 ? Math.min(window.innerWidth - 24, 348) : (window.innerWidth < 1100 ? 374 : 424));
      var panelRect = hoverPreviewEl.firstElementChild.getBoundingClientRect();
      var panelHeight = panelRect.height || (window.innerWidth < 760 ? 174 : 198);
      var cardMidX = rect.left + rect.width * 0.5;
      var cardMidY = rect.top + rect.height * 0.5;
      var preferRight = cardMidX < window.innerWidth * 0.56;
      var previewGap = window.innerWidth < 760 ? 12 : 26;
      var left = preferRight ? rect.right + previewGap : rect.left - previewWidth - previewGap;
      var top = cardMidY - panelHeight * 0.5;
      var previewSide = preferRight ? 'right' : 'left';

      if (window.innerWidth < 760) {
        left = cardMidX - previewWidth * 0.5;
        top = rect.bottom + previewGap;
        previewSide = 'bottom';
        if (top + panelHeight > window.innerHeight - 68) {
          top = rect.top - panelHeight - previewGap;
          previewSide = 'top';
        }
      }

      left = Math.max(12, Math.min(left, window.innerWidth - previewWidth - 12));
      top = Math.max(minTop, Math.min(top, window.innerHeight - panelHeight - 72));
      hoverPreviewEl.style.left = left + 'px';
      hoverPreviewEl.style.top = top + 'px';
      hoverPreviewEl.style.width = previewWidth + 'px';
      hoverPreviewEl.dataset.side = previewSide;
      hoverPreviewEl.style.setProperty('--spotlight-anchor-x', (cardMidX - left).toFixed(1) + 'px');
      hoverPreviewEl.style.setProperty('--spotlight-anchor-y', (cardMidY - top).toFixed(1) + 'px');
    }

    function hideHoverPreview() {
      if (activePreviewCard) {
        activePreviewCard.classList.remove('is-spotlighted', 'is-ghosted');
      }
      activePreviewCard = null;
      activePreviewMode = '';
      sceneEl.classList.remove('is-card-focused');
      hoverPreviewEl.classList.remove('is-visible');
      hoverPreviewEl.removeAttribute('data-orbit-show');
      hoverPreviewEl.removeAttribute('data-side');
      hoverPreviewEl.innerHTML = '';
      hoverPreviewEl.style.removeProperty('left');
      hoverPreviewEl.style.removeProperty('top');
      hoverPreviewEl.style.removeProperty('width');
      hoverPreviewEl.style.removeProperty('--spotlight-anchor-x');
      hoverPreviewEl.style.removeProperty('--spotlight-anchor-y');
    }

    function showHoverPreview(card, isLockedPreview) {
      if (!card || layoutMode !== 'sphere' || card.classList.contains('is-expanded')) return;
      var product = getProductByCard(card);
      if (!product) return;
      var previewMode = isLockedPreview ? 'locked' : 'hover';
      var shouldRenderPreview = activePreviewCard !== card || activePreviewMode !== previewMode;
      if (activePreviewCard && activePreviewCard !== card) {
        activePreviewCard.classList.remove('is-spotlighted', 'is-ghosted');
      }
      if (shouldRenderPreview) {
        activePreviewCard = card;
        activePreviewMode = previewMode;
        var spotlightTitle = escapeHtmlText(locale === 'vi' ? product.titleVi : product.titleEn);
        var spotlightPrice = escapeHtmlText(locale === 'vi' ? product.priceVi : product.priceEn);
        var spotlightCategory = escapeHtmlText(getProductCategory(product) || (locale === 'vi' ? 'Sản phẩm STEM' : 'STEM product'));
        var spotlightAlt = locale === 'vi' ? (product.coverAltVi || product.titleVi) : (product.coverAltEn || product.titleEn);
        var spotlightAction = escapeHtmlText(isLockedPreview ? (locale === 'vi' ? 'Đã khóa quỹ đạo' : 'Orbit locked') : (locale === 'vi' ? 'Đang xem nhanh' : 'Quick focus'));
        var spotlightSummary = escapeHtmlText(locale === 'vi' ? (product.taglineVi || product.summaryVi || '') : (product.taglineEn || product.summaryEn || ''));
        var spotlightStock = escapeHtmlText(locale === 'vi'
          ? (product.stock > 0 ? ((product.availabilityVi || 'Còn hàng') + ' · ' + product.stock) : (product.availabilityVi || 'Liên hệ'))
          : (product.stock > 0 ? ((product.availabilityEn || 'In stock') + ' · ' + product.stock) : (product.availabilityEn || 'Contact us')));

        hoverPreviewEl.innerHTML =
          '<div class="galaxy-spotlight">' +
            '<div class="galaxy-spotlight__media">' + renderMedia(product.cover || product.hero, 'galaxy-spotlight__frame', { tier: 'critical', loading: 'eager', alt: spotlightAlt }) + '</div>' +
            '<div class="galaxy-spotlight__body">' +
              '<span class="galaxy-spotlight__kicker">' + spotlightCategory + '</span>' +
              '<strong class="galaxy-spotlight__name">' + spotlightTitle + '</strong>' +
              '<span class="galaxy-spotlight__price">' + spotlightPrice + '</span>' +
              (spotlightSummary ? '<p class="galaxy-spotlight__summary">' + spotlightSummary + '</p>' : '') +
              '<span class="galaxy-spotlight__stock">' + spotlightStock + '</span>' +
              '<span class="galaxy-spotlight__state">' + spotlightAction + '</span>' +
            '</div>' +
          '</div>';
        hydrateDynamicMedia(hoverPreviewEl);
      }
      card.classList.add('is-spotlighted');
      sceneEl.classList.add('is-card-focused');
      hoverPreviewEl.setAttribute('data-orbit-show', previewMode);
      hoverPreviewEl.classList.add('is-visible');
      syncHoverPreviewPosition();
      requestAnimationFrame(syncHoverPreviewPosition);
    }

    bindProductEvent(hoverPreviewEl, 'mousedown', function(e) {
      if (!activePreviewCard) return;
      e.preventDefault();
      e.stopPropagation();
    });

    bindProductEvent(hoverPreviewEl, 'click', function(e) {
      if (!activePreviewCard) return;
      e.preventDefault();
      e.stopPropagation();
      var product = getProductByCard(activePreviewCard);
      if (!product) return;
      openModal(product);
    });

    bindProductEvent(hoverPreviewEl, 'mouseleave', function() {
      if (!activePreviewCard || layoutMode !== 'sphere') return;
      if (focusLockedCard) return;
      var card = activePreviewCard;
      card.classList.remove('galaxy-card--focused');
      releaseSphereHoverFocus();
      if (!expandedCard && !modalEl.classList.contains('is-open')) {
        resumeSphere(true);
      }
    });

    function stopSphere(reason) {
      clearSphereFocus(true);
      sphereFrozen = true;
      sphereHoverPaused = false;
      isIdle = false; velX = 0; velY = 0; isDragging = false;
      clearTimeout(idleTimer);
      setInteractionState(reason || 'paused');
    }
    function resumeSphere(immediate, delayMs) {
      if (userMotionPaused && layoutMode === 'sphere') {
        sphereFrozen = false;
        sphereHoverPaused = false;
        isIdle = false;
        clearTimeout(idleTimer);
        if (!focusLockedCard) setInteractionState('paused');
        syncMotionToggleButton();
        return;
      }
      sphereFrozen = false;
      sphereHoverPaused = false;
      clearTimeout(idleTimer);
      if (immediate) {
        isIdle = true;
        if (!focusLockedCard && layoutMode === 'sphere') setInteractionState('idle');
        return;
      }
      idleTimer = setTimeout(function() {
        isIdle = true;
        if (!focusLockedCard && layoutMode === 'sphere') setInteractionState('idle');
      }, typeof delayMs === 'number' ? delayMs : IDLE_DELAY);
    }

    function easeSphereTiltHome(strength, damping, motionScale) {
      var scale = Number.isFinite(motionScale) && motionScale > 0 ? motionScale : 1;
      velX = (velX + (DEFAULT_ROT_X - rotX) * scaleMotionEase(strength, scale)) * scaleMotionFriction(damping, scale);
      rotX += velX * scale;
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
        sceneEl.style.removeProperty('left');
        sceneEl.style.removeProperty('right');
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
        sceneEl.style.left = '0.75rem';
        sceneEl.style.right = '0.75rem';
        sceneEl.style.width = 'auto';
        sceneEl.style.marginLeft = '0px';
        sceneEl.style.marginRight = '0px';
        return;
      }

      sceneEl.style.removeProperty('right');
      sceneEl.style.width = Math.round(headerRect.width) + 'px';
      sceneEl.style.left = Math.max(0, Math.round(headerRect.left)) + 'px';
      sceneEl.style.marginLeft = '0px';
      sceneEl.style.marginRight = '0px';
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
      boardLinksSvg.classList.remove('is-active', 'is-static');
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
      boardLinksSvg.classList.toggle('is-static', items.length > 8);
      boardLinksSvg.classList.add('is-active');
    }

    function getCardProduct(card) {
      if (!card) return null;
      return demoProducts[parseInt(card.dataset.cardIdx, 10)] || null;
    }

    function getCardSlug(card) {
      var product = getCardProduct(card);
      return product ? product.slug : '';
    }

    function captureCardRects() {
      var rects = {};
      cardNodes.forEach(function(card) {
        var product = getCardProduct(card);
        if (!product) return;
        var cardIndex = parseInt(card.dataset.cardIdx, 10);
        var style = window.getComputedStyle(card);
        if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) <= 0.02) return;
        var rect = card.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        rects[product.slug] = {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          transform: card.style.transform || '',
          depth: getCardViewDepth(card),
          index: cardIndex,
        };
      });
      return rects;
    }

    function clearMorphLayer() {
      if (!morphLayerEl) return;
      morphLayerEl.remove();
      morphLayerEl = null;
    }

    function clearGravityCollapseFx() {
      clearTimeout(gravityOverlayTimer);
      gravityOverlayTimer = null;
      if (gravityOverlayEl) {
        gravityOverlayEl.remove();
        gravityOverlayEl = null;
      }
      if (searchBarEl) searchBarEl.classList.remove('is-gravity-command');
      sceneEl.classList.remove('is-gravity-collapsing', 'is-gravity-portal-open');
    }

    function playGravityCollapseFx() {
      if (reducedMotion) return;
      clearGravityCollapseFx();
      var sceneRect = sceneEl.getBoundingClientRect();
      var portalX = sceneRect.left + sceneRect.width * 0.5;
      var portalY = sceneRect.top + sceneRect.height * 0.48;
      var portalSize = Math.max(240, Math.min(sceneRect.width, sceneRect.height) * 0.42);

      gravityOverlayEl = document.createElement('div');
      gravityOverlayEl.className = 'galaxy-gravity-fx';
      gravityOverlayEl.style.setProperty('--portal-x', portalX.toFixed(1) + 'px');
      gravityOverlayEl.style.setProperty('--portal-y', portalY.toFixed(1) + 'px');
      gravityOverlayEl.style.setProperty('--portal-size', portalSize.toFixed(1) + 'px');
      gravityOverlayEl.innerHTML =
        '<div class="galaxy-gravity-fx__wash"></div>' +
        '<div class="galaxy-gravity-fx__scan"></div>' +
        '<div class="galaxy-gravity-fx__portal"><span></span><span></span><i></i></div>';
      document.body.appendChild(gravityOverlayEl);
      if (searchBarEl) searchBarEl.classList.add('is-gravity-command');
      sceneEl.classList.add('is-gravity-collapsing');
      gravityOverlayTimer = setTimeout(function() {
        sceneEl.classList.add('is-gravity-portal-open');
      }, 160);
    }

    function clearGridMotionTimers() {
      clearTimeout(gridMorphTimer);
      clearTimeout(boardConnectionTimer);
      clearTimeout(boardScrollEffectTimer);
      gridMorphTimer = null;
      boardConnectionTimer = null;
      boardConnectionToken += 1;
      boardScrollEffectTimer = null;
      gridMorphHoldUntil = 0;
      sceneEl.classList.remove('is-board-scrolling', 'is-wormhole-transition', 'is-grid-refining');
      if (searchBarEl) searchBarEl.classList.remove('is-grid-scanning');
      clearMorphLayer();
      clearGravityCollapseFx();
    }

    function cancelGridCardAnimations() {
      if (isMobileProductLite()) return;
      cardNodes.forEach(function(card) {
        if (!card.getAnimations) return;
        card.getAnimations().forEach(function(animation) {
          if (animation.id === 'galaxy-grid-morph') animation.cancel();
        });
      });
    }

    function setCardOpacityNow(card, opacityValue) {
      if (!card) return;
      if (!isMobileProductLite() && card.getAnimations) {
        card.getAnimations().forEach(function(animation) {
          var target = animation.effect && animation.effect.target;
          if (target === card && !animation.id) animation.cancel();
        });
      }
      var previousTransition = card.style.transition;
      card.style.transition = 'none';
      card.style.opacity = String(opacityValue);
      requestAnimationFrame(function() {
        if (previousTransition) card.style.transition = previousTransition;
        else card.style.removeProperty('transition');
      });
    }

    function hideFilteredGridCards() {
      if (layoutMode !== 'grid') return;
      cardNodes.forEach(function(card) {
        if (card.classList.contains('galaxy-card--grid')) return;
        card.classList.remove('is-grid-exiting', 'is-grid-entering');
        card.style.visibility = 'hidden';
        card.style.opacity = '0';
        card.style.pointerEvents = 'none';
      });
    }

    function scheduleBoardConnections(items, boardPose, delayMs) {
      if (isMobileProductLite()) {
        clearBoardConnections();
        return;
      }
      clearTimeout(boardConnectionTimer);
      boardConnectionToken += 1;
      var connectionToken = boardConnectionToken;
      clearBoardConnections();
      boardConnectionTimer = setTimeout(function() {
        if (layoutMode !== 'grid') return;
        var draw = function() {
          if (layoutMode !== 'grid' || connectionToken !== boardConnectionToken) return;
          renderBoardConnections(items, boardPose);
        };
        if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(draw, { timeout: 900 });
        else window.requestAnimationFrame(draw);
      }, reducedMotion ? 0 : (typeof delayMs === 'number' ? delayMs : 280));
    }

    function finishGridMotion(items, boardPose, delayMs) {
      clearTimeout(gridMorphTimer);
      gridMorphTimer = setTimeout(function() {
        gridMorphHoldUntil = 0;
        sceneEl.classList.remove('is-grid-reflowing', 'is-morphing-to-grid', 'is-morphing-to-sphere');
        sceneEl.classList.remove('is-wormhole-transition', 'is-grid-refining');
        if (searchBarEl) searchBarEl.classList.remove('is-grid-scanning');
        cardNodes.forEach(function(card) {
          card.classList.remove('is-grid-entering', 'is-grid-exiting', 'is-grid-scanned');
          if (card.classList.contains('galaxy-card--grid')) {
            setCardOpacityNow(card, 1);
            card.style.visibility = 'visible';
            card.style.pointerEvents = 'auto';
          }
        });
        cancelGridCardAnimations();
        clearMorphLayer();
        clearGravityCollapseFx();
        hideFilteredGridCards();
        if (items && boardPose) scheduleBoardConnections(items, boardPose, 0);
      }, reducedMotion ? 0 : (typeof delayMs === 'number' ? delayMs : GRID_MORPH_DURATION));
    }

    function createMorphCard(card, firstRect) {
      var inner = card && card.querySelector('.galaxy-card__inner');
      if (!inner || !firstRect) return null;
      var clone = inner.cloneNode(true);
      clone.classList.add('galaxy-morph-card');
      clone.style.left = firstRect.left.toFixed(1) + 'px';
      clone.style.top = firstRect.top.toFixed(1) + 'px';
      clone.style.width = firstRect.width.toFixed(1) + 'px';
      clone.style.height = firstRect.height.toFixed(1) + 'px';
      clone.style.setProperty('--morph-depth', String(Math.round(firstRect.depth || 0)));
      return clone;
    }

    function ensureMorphLayer(mode) {
      clearMorphLayer();
      morphLayerEl = document.createElement('div');
      morphLayerEl.className = 'galaxy-morph-layer';
      if (mode) morphLayerEl.classList.add('galaxy-morph-layer--' + mode);
      document.body.appendChild(morphLayerEl);
      return morphLayerEl;
    }

    function animateOrbitToBoard(firstRects, visibleGridCards, rankBySlug) {
      if (reducedMotion || !firstRects) return false;
      var layer = ensureMorphLayer('board');
      var sceneRect = sceneEl.getBoundingClientRect();
      var portalX = sceneRect.left + sceneRect.width * 0.5;
      var portalY = sceneRect.top + sceneRect.height * 0.48;
      var entriesBySlug = {};
      visibleGridCards.forEach(function(entry) {
        entriesBySlug[entry.product.slug] = entry;
      });
      var sortedCards = cardNodes.slice().sort(function(leftCard, rightCard) {
        var leftRect = firstRects[getCardSlug(leftCard)] || {};
        var rightRect = firstRects[getCardSlug(rightCard)] || {};
        return (rightRect.depth || -9999) - (leftRect.depth || -9999);
      });
      var depthRank = {};
      sortedCards.forEach(function(card, index) {
        var slug = getCardSlug(card);
        if (slug) depthRank[slug] = index;
      });

      cardNodes.forEach(function(card) {
        var product = getCardProduct(card);
        if (!product) return;
        var firstRect = firstRects[product.slug];
        if (!firstRect) return;
        var entry = entriesBySlug[product.slug];
        if (!entry) return;
        var clone = createMorphCard(card, firstRect);
        if (!clone) return;
        layer.appendChild(clone);

        var rank = depthRank[product.slug] || 0;
        var seed = hashText(product.slug);
        var twist = seed % 2 ? 1 : -1;
        var delay = Math.min(rank * 8, 320);
        var cardCenterX = firstRect.left + firstRect.width * 0.5;
        var cardCenterY = firstRect.top + firstRect.height * 0.5;
        var portalDx = portalX - cardCenterX;
        var portalDy = portalY - cardCenterY;
        var keyframes;
        var timing;

        if (entry && rankBySlug[product.slug] !== undefined) {
          var targetRect = entry.card.getBoundingClientRect();
          var dx = targetRect.left - firstRect.left;
          var dy = targetRect.top - firstRect.top;
          var sx = targetRect.width && firstRect.width ? targetRect.width / firstRect.width : 1;
          var sy = targetRect.height && firstRect.height ? targetRect.height / firstRect.height : 1;
          var orbitBend = 54 + (seed % 70);
          var portalArcX = portalDx * 0.72 + twist * orbitBend;
          var portalArcY = portalDy * 0.72 - orbitBend * 0.46;
          var dealX = dx * 0.82 + twist * Math.min(46, Math.abs(dx) * 0.08);
          var dealY = dy * 0.82 - 38;
          clone.classList.add('galaxy-morph-card--landing');
          keyframes = [
            {
              opacity: 0.78,
              filter: 'brightness(0.96) saturate(0.96)',
              transform: 'translate3d(0,0,0) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(0.92)'
            },
            {
              opacity: 1,
              filter: 'brightness(1.04) saturate(1.04)',
              transform: 'translate3d(' + (portalDx * 0.22 + twist * 26).toFixed(1) + 'px,' + (portalDy * 0.2 - 34).toFixed(1) + 'px,120px) rotateX(9deg) rotateY(' + (-twist * 32) + 'deg) rotateZ(' + (twist * 18) + 'deg) scale(1.08)',
              offset: 0.18
            },
            {
              opacity: 1,
              filter: 'brightness(1.06) saturate(1.05)',
              transform: 'translate3d(' + portalArcX.toFixed(1) + 'px,' + portalArcY.toFixed(1) + 'px,260px) rotateX(-12deg) rotateY(' + (twist * 58) + 'deg) rotateZ(' + (twist * 56) + 'deg) scale(0.72)',
              offset: 0.44
            },
            {
              opacity: 1,
              filter: 'brightness(1.02) saturate(1.02)',
              transform: 'translate3d(' + dealX.toFixed(1) + 'px,' + dealY.toFixed(1) + 'px,110px) rotateX(-3deg) rotateY(0deg) rotateZ(' + (-twist * 7) + 'deg) scale(' + Math.max(0.84, ((1 + sx) / 2)).toFixed(3) + ',' + Math.max(0.84, ((1 + sy) / 2)).toFixed(3) + ')',
              offset: 0.74
            },
            {
              opacity: 1,
              filter: 'brightness(1) saturate(1)',
              transform: 'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0) rotateX(0deg) rotateY(0deg) scale(' + sx.toFixed(4) + ',' + sy.toFixed(4) + ')'
            }
          ];
          timing = {
            duration: GRID_MORPH_DURATION,
            delay: delay,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            fill: 'both'
          };
        } else {
          var collapseBend = 34 + (seed % 58);
          var fadeX = portalDx + twist * collapseBend;
          var fadeY = portalDy - collapseBend * 0.38;
          clone.classList.add('galaxy-morph-card--discard');
          keyframes = [
            { opacity: 0.62, filter: 'brightness(0.94) saturate(0.92)', transform: 'translate3d(0,0,0) rotateZ(0deg) scale(0.9)' },
            { opacity: 0.34, filter: 'brightness(0.82) saturate(0.82)', transform: 'translate3d(' + (fadeX * 0.42).toFixed(1) + 'px,' + (fadeY * 0.42).toFixed(1) + 'px,120px) rotateY(' + (twist * 26) + 'deg) rotateZ(' + (twist * 24) + 'deg) scale(0.54)', offset: 0.34 },
            { opacity: 0.1, filter: 'brightness(0.7) saturate(0.72)', transform: 'translate3d(' + (portalDx * 0.86).toFixed(1) + 'px,' + (portalDy * 0.86).toFixed(1) + 'px,260px) rotateY(' + (-twist * 64) + 'deg) rotateZ(' + (twist * 74) + 'deg) scale(0.18)', offset: 0.72 },
            { opacity: 0, filter: 'brightness(0.62) saturate(0.66)', transform: 'translate3d(' + portalDx.toFixed(1) + 'px,' + portalDy.toFixed(1) + 'px,320px) rotateY(' + (-twist * 90) + 'deg) rotateZ(' + (twist * 120) + 'deg) scale(0.05)' }
          ];
          timing = {
            duration: Math.max(620, GRID_MORPH_DURATION * 0.72),
            delay: Math.min(delay, 220),
            easing: 'cubic-bezier(0.2, 0.74, 0.22, 1)',
            fill: 'both'
          };
        }

        var animation = clone.animate(keyframes, timing);
        animation.id = 'galaxy-orbit-board-morph';
      });
      return true;
    }

    function animateCardFromRect(card, firstRect, finalTransform, options) {
      if (reducedMotion || !card || !card.animate) return;
      var lastRect = card.getBoundingClientRect();
      var delay = options && Number.isFinite(options.delay) ? options.delay : 0;
      var duration = options && Number.isFinite(options.duration) ? options.duration : GRID_MORPH_DURATION;
      var startOpacity = options && options.startOpacity !== undefined ? options.startOpacity : 1;
      var startFilter = options && options.startFilter ? options.startFilter : 'blur(0px) saturate(1)';
      var mode = options && options.mode ? options.mode : '';
      if (!firstRect || !lastRect.width || !lastRect.height) {
        var entryKeyframes = mode === 'grid-refine'
          ? [
            { opacity: 0, transform: finalTransform + ' translateZ(-72px) rotateX(7deg) scale(0.94)' },
            { opacity: 1, transform: finalTransform + ' translateZ(34px) rotateX(-2deg) scale(1.012)', offset: 0.58 },
            { opacity: 1, transform: finalTransform }
          ]
          : [
            { opacity: 0, filter: 'blur(10px) saturate(0.72)', transform: 'translate3d(0, 18px, 0) ' + finalTransform },
            { opacity: 1, filter: 'blur(0px) saturate(1)', transform: finalTransform }
          ];
        var entryAnimation = card.animate(entryKeyframes, {
          duration: mode === 'grid-refine' ? Math.max(140, duration) : Math.max(220, duration * 0.72),
          delay: delay,
          easing: mode === 'grid-refine' ? 'cubic-bezier(0.16, 1, 0.3, 1)' : 'cubic-bezier(0.19, 1, 0.22, 1)',
          fill: 'both',
        });
        entryAnimation.id = 'galaxy-grid-morph';
        return;
      }

      var dx = firstRect.left - lastRect.left;
      var dy = firstRect.top - lastRect.top;
      var distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 1.2) return;

      var pathKeyframes = mode === 'grid-refine'
        ? [
          {
            transform: 'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0) ' + finalTransform + ' translateZ(-24px) rotateX(4deg) scale(0.985)',
            opacity: startOpacity,
          },
          {
            transform: 'translate3d(' + (dx * 0.34).toFixed(1) + 'px,' + (dy * 0.34).toFixed(1) + 'px,42px) ' + finalTransform + ' rotateX(-2deg) scale(1.012)',
            opacity: 1,
            offset: 0.52,
          },
          {
            transform: finalTransform,
            opacity: 1,
          }
        ]
        : [
          {
            transform: 'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0) ' + finalTransform,
            opacity: startOpacity,
            filter: startFilter,
          },
          {
            transform: finalTransform,
            opacity: 1,
            filter: 'blur(0px) saturate(1)',
          }
        ];
      var animation = card.animate(pathKeyframes, {
        duration: Math.min(duration + distance * (mode === 'grid-refine' ? 0.02 : 0.06), duration + (mode === 'grid-refine' ? 40 : 120)),
        delay: delay,
        easing: mode === 'grid-refine' ? 'cubic-bezier(0.16, 1, 0.3, 1)' : 'cubic-bezier(0.19, 1, 0.22, 1)',
        fill: 'both',
      });
      animation.id = 'galaxy-grid-morph';
    }

    function animateGridEntrances(firstRects, visibleGridCards, wasGridMode) {
      var baseDuration = wasGridMode ? GRID_REFLOW_DURATION : GRID_MORPH_DURATION;
      visibleGridCards.forEach(function(entry, index) {
        var slug = entry.product.slug;
        var firstRect = firstRects ? firstRects[slug] : null;
        var delay = reducedMotion ? 0 : (wasGridMode ? Math.min(index * 3, 36) : Math.min(entry.row * 32 + entry.col * 12, 180));
        entry.card.classList.toggle('is-grid-entering', !firstRect);
        entry.card.classList.remove('is-grid-scanned');
        animateCardFromRect(entry.card, firstRect, entry.card.style.transform || '', {
          delay: delay,
          duration: baseDuration,
          startOpacity: wasGridMode ? 0.96 : 0.72,
          startFilter: wasGridMode ? 'blur(0px) saturate(1)' : 'blur(6px) saturate(0.82)',
          mode: wasGridMode ? 'grid-refine' : '',
        });
      });
    }

    function animateGridExits(firstRects, rankBySlug, wasGridMode) {
      if (reducedMotion) return;
      cardNodes.forEach(function(card) {
        var slug = getCardSlug(card);
        if (!slug || rankBySlug[slug] !== undefined || !firstRects || !firstRects[slug] || !card.animate) return;
        card.classList.add('is-grid-exiting');
        var exitBaseTransform = firstRects[slug].transform || card.style.transform || 'none';
        var exitKeyframes = wasGridMode
          ? [
            { opacity: 1, transform: exitBaseTransform },
            { opacity: 0.62, transform: exitBaseTransform + ' translateZ(-72px) rotateX(10deg) scale(0.94)', offset: 0.48 },
            { opacity: 0, transform: exitBaseTransform + ' translateZ(-150px) rotateX(16deg) scale(0.8)' }
          ]
          : [
            { opacity: 1, filter: 'blur(0px) saturate(1)' },
            { opacity: 0, filter: 'blur(10px) saturate(0.58)' }
          ];
        var exitAnimation = card.animate(exitKeyframes, {
          duration: wasGridMode ? 300 : 360,
          easing: wasGridMode ? 'cubic-bezier(0.4, 0, 0.2, 1)' : 'cubic-bezier(0.22, 0.61, 0.36, 1)',
          fill: 'both',
        });
        exitAnimation.id = 'galaxy-grid-morph';
      });
    }

    function animateSphereReturn(firstRects) {
      if (reducedMotion || !firstRects) return;
      cardNodes.forEach(function(card, index) {
        var slug = getCardSlug(card);
        var firstRect = slug ? firstRects[slug] : null;
        animateCardFromRect(card, firstRect, card.style.transform || '', {
          delay: Math.min(index * 8, 180),
          duration: GRID_MORPH_DURATION,
          startOpacity: 0.82,
          startFilter: 'blur(6px) saturate(0.78)',
        });
      });
    }

    function applySphereLayout() {
      var wasGridMode = layoutMode === 'grid';
      var firstRects = wasGridMode && !isMobileProductLite() ? captureCardRects() : null;
      clearGridMotionTimers();
      cancelGridCardAnimations();
      layoutMode = 'sphere';
      body.classList.remove('is-product-grid-mode');
      clearSphereFocus(true);
      if (wasGridMode) {
        sceneEl.classList.remove('is-morphing-to-grid');
        sphereFrozen = true;
        isIdle = false;
        velX = 0;
        velY = 0;
        sceneEl.classList.add('is-morphing-to-sphere', 'is-grid-reflowing');
      }
      boardScrollCurrent = 0;
      boardScrollTarget = 0;
      boardScrollMin = 0;
      boardScrollMax = 0;
      boardTouchActive = false;
      boardGridPose = {};
      lastBoardTransformY = null;
      lastCanRevealTop = null;
      lastCanRevealBottom = null;
      boardScrollRange = 0;
      if (boardScrollSpacerEl) boardScrollSpacerEl.style.height = '0px';
      sceneEl.scrollTop = 0;
      syncBoardSceneFrame();
      clearBoardConnections();
      if (boardLinksSvg) boardLinksSvg.style.transform = '';
      sceneEl.classList.remove('is-grid-mode');
      sceneEl.style.cursor = 'grab';
      applyRot();
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
          ? 'Đang xem dạng hình cầu. Nhập tìm kiếm hoặc chọn bộ lọc để xếp thành lưới.'
          : 'Sphere mode active. Search or filter to snap cards into a grid.';
      }
      if (wasGridMode) {
        if (!isMobileProductLite()) animateSphereReturn(firstRects);
        clearTimeout(gridMorphTimer);
        gridMorphTimer = setTimeout(function() {
          sceneEl.classList.remove('is-grid-reflowing', 'is-morphing-to-grid', 'is-morphing-to-sphere');
          sphereFrozen = false;
          setInteractionState('idle');
          resumeSphere(true);
        }, reducedMotion || isMobileProductLite() ? 0 : GRID_MORPH_DURATION + 120);
      } else {
        setInteractionState('idle');
        resumeSphere();
      }
      requestGalaxyFrame();
    }

    function syncBoardScrollHints() {
      var hasBoardScroll = layoutMode === 'grid' && (boardScrollMax - boardScrollMin) > 1;
      var canRevealTop = hasBoardScroll && boardScrollTarget < boardScrollMax - 2;
      var canRevealBottom = hasBoardScroll && boardScrollTarget > boardScrollMin + 2;

      if (boardHintTop && canRevealTop !== lastCanRevealTop) {
        boardHintTop.classList.toggle('is-visible', canRevealTop);
      }
      if (boardHintBottom && canRevealBottom !== lastCanRevealBottom) {
        boardHintBottom.classList.toggle('is-visible', canRevealBottom);
      }
      lastCanRevealTop = canRevealTop;
      lastCanRevealBottom = canRevealBottom;
    }

    function syncBoardScrollSpacer(boardSpace) {
      if (!boardScrollSpacerEl || layoutMode !== 'grid') return;
      boardScrollRange = Math.max(0, boardScrollMax - boardScrollMin);
      var viewportHeight = boardSpace && boardSpace.height
        ? boardSpace.height
        : Math.max(sceneEl.clientHeight || 0, sceneEl.getBoundingClientRect().height || 0);
      boardScrollSpacerEl.style.height = Math.max(viewportHeight + boardScrollRange, viewportHeight) + 'px';
    }

    function getBoardScrollTopForTarget(targetY) {
      return Math.max(0, boardScrollMax - clamp(targetY, boardScrollMin, boardScrollMax));
    }

    function syncBoardScrollTop() {
      if (layoutMode !== 'grid' || !sceneEl) return;
      var nextTop = getBoardScrollTopForTarget(boardScrollTarget);
      if (Math.abs(sceneEl.scrollTop - nextTop) < 1) return;
      isSyncingBoardScroll = true;
      sceneEl.scrollTop = nextTop;
      isSyncingBoardScroll = false;
    }

    function handleBoardNativeScroll() {
      if (layoutMode !== 'grid') return;
      if ((boardScrollMax - boardScrollMin) <= 1) {
        boardScrollTarget = boardScrollMax;
        boardScrollCurrent = boardScrollTarget;
        applyBoardScrollFrame(true);
        return;
      }
      var nextTarget = clamp(boardScrollMax - sceneEl.scrollTop, boardScrollMin, boardScrollMax);
      if (Math.abs(nextTarget - boardScrollTarget) < 0.1 && !isSyncingBoardScroll) return;
      boardScrollTarget = nextTarget;
      markBoardScrollActive();
      applyBoardScrollFrame(true);
    }

    function updateBoardCardVisibility() {
      if (layoutMode !== 'grid') return;
      if (!isMobileProductLite()) return;
      var now = performance.now ? performance.now() : Date.now();
      if (now - lastGridImageLoadAt < 320) return;
      lastGridImageLoadAt = now;
      var sceneHeight = Math.max(1, sceneEl.clientHeight || window.innerHeight || 1);
      var preloadPad = sceneHeight * 0.7;
      var topY = -sceneHeight / 2 - preloadPad - boardScrollCurrent;
      var bottomY = sceneHeight / 2 + preloadPad - boardScrollCurrent;
      var images = [];
      cardNodes.forEach(function(card) {
        if (images.length >= 10) return;
        if (!card.classList.contains('galaxy-card--grid')) return;
        var product = getCardProduct(card);
        var pose = product && boardGridPose[product.slug];
        if (!pose) return;
        if (pose.y + pose.height < topY || pose.y > bottomY) return;
        var image = card.querySelector('img[data-src]');
        if (image && image.dataset.mediaLoaded !== 'true') images.push(image);
      });
      if (images.length) loadGalaxyImages(images, 2);
    }

    function markBoardScrollActive() {
      if (!sceneEl.classList.contains('is-board-scrolling')) sceneEl.classList.add('is-board-scrolling');
      clearTimeout(boardScrollEffectTimer);
      boardScrollEffectTimer = setTimeout(function() {
        boardScrollEffectTimer = null;
        sceneEl.classList.remove('is-board-scrolling');
        if (boardLinksSvg) {
          boardLinksSvg.style.transform = 'translate3d(0,' + boardScrollCurrent.toFixed(2) + 'px,0)';
        }
      }, 120);
    }

    function applyBoardScrollFrame(force) {
      if (layoutMode !== 'grid') return;

      if (force) {
        boardScrollCurrent = boardScrollTarget;
      } else {
        var scrollDelta = boardScrollTarget - boardScrollCurrent;
        if (Math.abs(scrollDelta) < 0.12) {
          if (lastBoardTransformY !== null && Math.abs(boardScrollTarget - lastBoardTransformY) < 0.12) {
            syncBoardScrollHints();
            return;
          }
          boardScrollCurrent = boardScrollTarget;
        } else {
          boardScrollCurrent += scrollDelta * 0.42;
        }
      }

      var roundedBoardY = Math.round(boardScrollCurrent * 100) / 100;
      if (!force && lastBoardTransformY !== null && Math.abs(roundedBoardY - lastBoardTransformY) < 0.1) {
        syncBoardScrollHints();
        return;
      }
      var boardTransform = 'translate3d(0,' + roundedBoardY.toFixed(2) + 'px,0)';
      sphere.style.transform = boardTransform;
      if (boardLinksSvg && !sceneEl.classList.contains('is-board-scrolling')) {
        boardLinksSvg.style.transform = boardTransform;
      }
      lastBoardTransformY = roundedBoardY;

      updateBoardCardVisibility();
      syncBoardScrollHints();
    }

    function nudgeBoardScroll(deltaY, options) {
      if (layoutMode !== 'grid' || (boardScrollMax - boardScrollMin) <= 1) return false;
      var nextScrollTarget = clamp(boardScrollTarget - deltaY, boardScrollMin, boardScrollMax);
      if (Math.abs(nextScrollTarget - boardScrollTarget) < 0.01) return true;
      boardScrollTarget = nextScrollTarget;
      syncBoardScrollTop();
      if (options && options.immediate) {
        markBoardScrollActive();
        applyBoardScrollFrame(true);
      } else {
        syncBoardScrollHints();
      }
      return true;
    }

    function normalizeWheelDeltaY(event) {
      var deltaY = event.deltaY || 0;
      if (event.deltaMode === 1) return deltaY * 16;
      if (event.deltaMode === 2) return deltaY * Math.max(320, window.innerHeight || 800);
      return deltaY;
    }

    function focusBoardCard(card) {
      if (layoutMode !== 'grid') return;
      var product = getProductByCard(card);
      if (!product) return;
      var pose = boardGridPose[product.slug];
      if (!pose) return;
      boardScrollTarget = clamp(-(pose.y + pose.height * 0.5), boardScrollMin, boardScrollMax);
      syncBoardScrollTop();
      applyBoardScrollFrame(true);
    }

    function applyGridLayout(items) {
      var wasGridMode = layoutMode === 'grid';
      var mobileLite = isMobileProductLite();
      var firstRects = wasGridMode || mobileLite ? {} : captureCardRects();
      var previousBoardScrollTarget = boardScrollTarget;
      clearGridMotionTimers();
      cancelGridCardAnimations();
      layoutMode = 'grid';
      body.classList.add('is-product-grid-mode');
      stopSphere('grid');
      sceneEl.classList.add('is-grid-mode');
      sceneEl.classList.add('is-grid-reflowing');
      sceneEl.classList.toggle('is-morphing-to-grid', !wasGridMode);
      sceneEl.classList.remove('is-wormhole-transition');
      sceneEl.classList.remove('is-grid-refining');
      if (searchBarEl) searchBarEl.classList.remove('is-grid-scanning');
      gridMorphHoldUntil = !wasGridMode && !reducedMotion && !mobileLite ? Date.now() + GRID_MORPH_DURATION + 70 : 0;
      sceneEl.style.cursor = 'default';

      var rankBySlug = {};
      items.forEach(function(item, orderIndex) {
        rankBySlug[item.slug] = orderIndex;
      });

      var boardSpace = getBoardWorkspace();
      var isNarrowMobileGrid = window.innerWidth < 760;
      var cardGap = isNarrowMobileGrid ? 12 : 20;
      var minCardWidth = isNarrowMobileGrid ? 128 : (window.innerWidth < 900 ? 152 : 180);
      var maxCardWidth = isNarrowMobileGrid ? 176 : (window.innerWidth < 900 ? 210 : 240);
      var columns = Math.max(1, Math.min(items.length || 1, Math.floor((boardSpace.width + cardGap) / (minCardWidth + cardGap)) || 1));
      if (isNarrowMobileGrid && items.length > 1) columns = Math.max(2, columns);
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
        rowTitleHeights[rowInit] = window.innerWidth < 900 ? 34 : 38;
        rowInfoHeights[rowInit] = window.innerWidth < 900 ? 72 : 76;
      }

      cardNodes.forEach(function(card) {
        var product = demoProducts[parseInt(card.dataset.cardIdx, 10)];
        var rank = rankBySlug[product.slug];
        if (rank === undefined) {
          card.classList.remove('galaxy-card--grid');
          card.classList.remove('is-grid-entering');
          if (firstRects[product.slug]) {
            card.classList.add('is-grid-exiting');
            card.style.opacity = '0';
            card.style.visibility = 'visible';
            card.style.pointerEvents = 'none';
            card.style.transform = firstRects[product.slug].transform || card.style.transform;
          } else {
            card.classList.remove('is-grid-exiting');
            card.style.opacity = '0';
            card.style.visibility = 'hidden';
            card.style.pointerEvents = 'none';
            card.style.transform = 'translate3d(-420px, 0, -600px) rotateY(65deg) scale(0.5)';
          }
          card.style.opacity = '0';
          card.style.removeProperty('--grid-info-height');
          return;
        }
        var row = Math.floor(rank / columns);
        var col = rank % columns;
        card.classList.add('galaxy-card--grid');
        card.style.setProperty('--grid-card-width', cardWidth + 'px');
        card.style.removeProperty('--grid-title-height');
        card.style.removeProperty('--grid-info-height');
        if (!wasGridMode && !reducedMotion && !mobileLite) setCardOpacityNow(card, 0);
        else card.style.opacity = '1';
        card.style.visibility = 'visible';
        card.style.pointerEvents = !wasGridMode && !reducedMotion && !mobileLite ? 'none' : 'auto';
        visibleGridCards.push({
          card: card,
          product: product,
          row: row,
          col: col,
          inner: card.querySelector('.galaxy-card__inner'),
        });
      });

      loadGalaxyImages(visibleGridCards.slice(0, mobileLite ? 8 : 18).map(function(entry) {
        return entry.card.querySelector('img[data-src]');
      }), mobileLite ? 2 : 4);

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
          width: cardWidth,
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
      syncBoardScrollSpacer(boardSpace);
      syncBoardScrollTop();

      boardGridPose = boardPose;
      lastBoardTransformY = null;
      lastCanRevealTop = null;
      lastCanRevealBottom = null;
      applyBoardScrollFrame(true);
      if (mobileLite) {
        visibleGridCards.forEach(function(entry) {
          entry.card.classList.remove('is-grid-entering', 'is-grid-exiting', 'is-grid-scanned');
          entry.card.style.opacity = '1';
          entry.card.style.visibility = 'visible';
          entry.card.style.pointerEvents = 'auto';
        });
      } else if (wasGridMode) {
        cancelGridCardAnimations();
      } else if (animateOrbitToBoard(firstRects, visibleGridCards, rankBySlug)) {
        visibleGridCards.forEach(function(entry) {
          entry.card.classList.add('is-grid-entering');
        });
      } else {
        animateGridExits(firstRects, rankBySlug, wasGridMode);
        animateGridEntrances(firstRects, visibleGridCards, wasGridMode);
      }
      finishGridMotion(items, boardPose, mobileLite ? 60 : (wasGridMode ? 80 : GRID_MORPH_DURATION + 120));

      if (filterMeta) {
        filterMeta.textContent = locale === 'vi'
          ? (items.length + ' sản phẩm phù hợp. Card đang xếp thành lưới theo bộ lọc.')
          : (items.length + ' products matched. Cards are snapped into a filtered grid.');
      }
      requestGalaxyFrame();
    }

    function formatModalTaxonomy(product, group) {
      var values = Array.isArray(product[group]) ? product[group] : [];
      var labels = values.map(function(value) {
        return getTaxonomyLabel(group, value);
      }).filter(Boolean);
      if (labels.length) return labels.join(', ');
      return locale === 'vi' ? 'Đang cập nhật' : 'Updating';
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
      stopSphere('paused');
    }

    function collapseCard() {
      if (!expandedCard) return;
      expandedCard.classList.remove('is-expanded');
      expandedCard = null;
      resumeSphere();
    }

    // Qty + cart/buy delegation on sphere
    sphere.addEventListener('click', function(e) {
      if (productDetailNavigationPending) return;
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
        var actionProduct = getProductByCard(e.target.closest('.galaxy-card'));
        addProductToLocalCart(actionProduct, 1);
        var isCartAction = e.target.classList.contains('xbtn-cart');
        e.target.textContent = isCartAction ? (locale === 'vi' ? 'Đã thêm' : 'Added') : (locale === 'vi' ? 'Đang chuyển' : 'Opening');
        setTimeout(function() {
          if (!isCartAction) {
            window.location.href = getLocalePath("contact");
            return;
          }
          e.target.textContent = locale === 'vi' ? 'Thêm vào giỏ' : 'Add to Cart';
        }, 1500);
        return;
      }

      // Sphere mode opens summary modal directly. Grid/search/filter mode opens detail page.
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
    bindProductEvent(document, 'click', function(e) {
      if (isProductShellClickTarget(e.target)) return;
      if (expandedCard && !e.target.closest('.galaxy-card') && !e.target.closest('.galaxy-modal') && !e.target.closest('.galaxy-filter-panel') && !e.target.closest('.galaxy-control-dock')) {
        collapseCard();
      }
      if (focusLockedCard && !e.target.closest('.galaxy-card') && !e.target.closest('.galaxy-hover-preview') && !e.target.closest('.galaxy-modal') && !e.target.closest('.galaxy-filter-panel') && !e.target.closest('.galaxy-control-dock')) {
        clearSphereFocus(true);
        resumeSphere(true);
      }
    });


    // ─── MODAL (click) ───
    function openModal(product) {
      if (stabilizeMobileProductUi(460)) {
        body.classList.add('is-product-modal-opening');
        window.setTimeout(function() {
          body.classList.remove('is-product-modal-opening');
        }, 180);
      }
      stopSphere('modal');
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
            buildModalInfoMarkup(product, modalTitle, modalSummary, stock, productIndex, categoryFact) +
          '</div>' +
        '</div>';

      modalEl.classList.add('is-open');
      hydrateDynamicMedia(modalEl);

      // Qty controls
      var qtyEl = modalEl.querySelector('.js-modal-qty');
      modalEl.querySelector('.js-modal-minus').onclick = function() { var v=+qtyEl.textContent; if(v>1) qtyEl.textContent=v-1; };
      modalEl.querySelector('.js-modal-plus').onclick  = function() { var v=+qtyEl.textContent; if(v<stock) qtyEl.textContent=v+1; };
      modalEl.querySelector('.js-modal-close').onclick = closeModal;
      modalEl.onclick = function(e) { if(e.target===modalEl) closeModal(); };

      // Thumbnail switching
      var mainImg = modalEl.querySelector('.js-modal-mainimg');
      modalEl.querySelector('#js-modal-thumbs').onclick = function(e) {
        var btn = e.target.closest('.galaxy-modal__thumb');
        if (!btn) return;
        var idx = +btn.dataset.idx;
        // Update main image
        mainImg.innerHTML = renderMedia(galleryCovers[idx], '', { tier: 'critical', loading: 'eager' });
        hydrateDynamicMedia(mainImg);
        // Update active class
        modalEl.querySelectorAll('.galaxy-modal__thumb').forEach(function(t) { t.classList.remove('is-active'); });
        btn.classList.add('is-active');
      };
    }

    function closeModal() {
      modalEl.classList.remove('is-open');
      resumeSphere();
    }

    // Intercept card <a> clicks — handled via sphere delegation above
    // (kept empty intentionally — replaced by sphere click handler)

    function getActivePointerList() {
      return Object.keys(activePointers).map(function(pointerId) { return activePointers[pointerId]; });
    }

    function getPinchDistance() {
      var pointers = getActivePointerList();
      if (pointers.length < 2) return 0;
      var dx = pointers[0].clientX - pointers[1].clientX;
      var dy = pointers[0].clientY - pointers[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function startPinchZoom() {
      if (layoutMode !== 'sphere') return;
      var distance = getPinchDistance();
      if (!distance) return;
      clearTimeout(holdTimer);
      clearSphereFocus(true);
      sphereHoverPaused = false;
      pMoved = true;
      isPinching = true;
      isDragging = false;
      pointerStartedOnLockedCard = false;
      isIdle = false;
      pinchStartDistance = distance;
      pinchStartZoom = cZoom;
      setInteractionState('zoom');
      sceneEl.style.cursor = 'grab';
    }

    function updatePinchZoom() {
      if (!isPinching || layoutMode !== 'sphere') return;
      var distance = getPinchDistance();
      if (!distance || !pinchStartDistance) return;
      setSphereZoom(pinchStartZoom * (distance / pinchStartDistance), 'zoom');
    }

    function isSceneControlTarget(target) {
      return !!(target && target.closest && target.closest('.galaxy-filter-panel, .galaxy-control-dock, .galaxy-modal, .galaxy-hover-preview'));
    }

    function handlePointerDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (isSceneControlTarget(e.target)) return;

      activePointers[e.pointerId] = { clientX: e.clientX, clientY: e.clientY };

      if (layoutMode === 'grid') {
        if (primaryPointerId !== null) return;
        try { sceneEl.setPointerCapture(e.pointerId); } catch (error) {}
        primaryPointerId = e.pointerId;
        pDownX = e.clientX;
        pDownY = e.clientY;
        pMoved = false;
        holdCard = null;
        pointerStartedOnLockedCard = false;
        boardTouchActive = true;
        boardTouchStartY = e.clientY;
        boardTouchStartScroll = boardScrollTarget;
        boardTouchMoved = false;
        setInteractionState('grid');
        return;
      }

      if (getActivePointerList().length >= 2) {
        try { sceneEl.setPointerCapture(e.pointerId); } catch (error) {}
        startPinchZoom();
        e.preventDefault();
        return;
      }

      if (primaryPointerId !== null) return;
      primaryPointerId = e.pointerId;
      pDownX = e.clientX;
      pDownY = e.clientY;
      pMoved = false;
      holdCard = findFrontCardAt(e.clientX, e.clientY) || e.target.closest('.galaxy-card');
      pointerStartedOnLockedCard = !!(holdCard && holdCard === focusLockedCard);
      if (holdCard) {
        clearTimeout(holdTimer);
        holdTimer = setTimeout(function() {
          if (!pMoved) {
            var product = getProductByCard(holdCard);
            if (product) {
              pMoved = true;
              expandCard(holdCard, product);
            }
          }
        }, HOLD_MS);
      }
      e.preventDefault();
      if (pointerStartedOnLockedCard) {
        isIdle = false;
        clearTimeout(idleTimer);
        setInteractionState('locked');
      } else if (!holdCard) {
        try { sceneEl.setPointerCapture(e.pointerId); } catch (error) {}
        isIdle = false;
        clearTimeout(idleTimer);
        setInteractionState('dragging');
        sceneEl.style.cursor = 'grabbing';
      }
    }

    function handlePointerMove(e) {
      if (activePointers[e.pointerId]) {
        activePointers[e.pointerId] = { clientX: e.clientX, clientY: e.clientY };
      }

      if (layoutMode === 'grid') {
        if (!boardTouchActive || e.pointerId !== primaryPointerId) return;
        if (Math.abs(e.clientY - boardTouchStartY) > MOVE_THRESH || Math.abs(e.clientX - pDownX) > MOVE_THRESH) {
          boardTouchMoved = true;
        }
        boardScrollTarget = clamp(boardTouchStartScroll + ((e.clientY - boardTouchStartY) * 1.08), boardScrollMin, boardScrollMax);
        syncBoardScrollTop();
        markBoardScrollActive();
        applyBoardScrollFrame(true);
        e.preventDefault();
        return;
      }

      if (isPinching) {
        updatePinchZoom();
        e.preventDefault();
        return;
      }

      if (primaryPointerId === null) {
        if (e.pointerType !== 'touch') queueSphereHover(e.clientX, e.clientY);
        return;
      }
      if (e.pointerId !== primaryPointerId) return;

      if (Math.abs(e.clientX - pDownX) > MOVE_THRESH || Math.abs(e.clientY - pDownY) > MOVE_THRESH) {
        pMoved = true;
        clearTimeout(holdTimer);
        if (!isDragging) {
          try { sceneEl.setPointerCapture(e.pointerId); } catch (error) {}
          onDragStart(pDownX, pDownY);
        }
      }
      onDragMove(e.clientX, e.clientY);
      e.preventDefault();
    }

    function finishGridPointer(e) {
      if (!boardTouchMoved) {
        var tapTarget = document.elementFromPoint(e.clientX, e.clientY);
        var tapCard = tapTarget && tapTarget.closest ? tapTarget.closest('.galaxy-card') : null;
        var tapProduct = getProductByCard(tapCard);
        goToProductDetail(tapProduct);
        if (productDetailNavigationPending) return;
      }
      boardTouchActive = false;
      boardTouchMoved = false;
      primaryPointerId = null;
      pointerStartedOnLockedCard = false;
      setInteractionState('grid');
    }

    function handlePointerEnd(e) {
      clearTimeout(holdTimer);
      delete activePointers[e.pointerId];
      try { sceneEl.releasePointerCapture(e.pointerId); } catch (error) {}

      if (layoutMode === 'grid') {
        if (e.pointerId === primaryPointerId) finishGridPointer(e);
        return;
      }

      if (isPinching) {
        if (getActivePointerList().length < 2) {
          isPinching = false;
          primaryPointerId = null;
          pointerStartedOnLockedCard = false;
          onDragEnd();
          setInteractionState('zoom');
        }
        return;
      }

      if (e.pointerId !== primaryPointerId) return;
      primaryPointerId = null;
      if (isDragging) onDragEnd();
      else if (!holdCard && layoutMode === 'sphere' && !sphereFrozen) resumeSphere();
      pointerStartedOnLockedCard = false;
    }

    bindProductEvent(sceneEl, 'pointerdown', handlePointerDown);
    bindProductEvent(sceneEl, 'pointermove', handlePointerMove);
    bindProductEvent(sceneEl, 'pointerup', handlePointerEnd);
    bindProductEvent(sceneEl, 'pointercancel', handlePointerEnd);
    bindProductEvent(sceneEl, 'scroll', handleBoardNativeScroll, { passive: true });

    // Wheel zoom
    bindProductEvent(sceneEl, 'wheel', function(e) {
      if (layoutMode === 'grid') {
        markBoardScrollActive();
        return;
      }
      e.preventDefault();
      nudgeSphereZoom(e.deltaY < 0 ? 1 : -1);
    }, { passive: false });

    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', function(e) {
        e.preventDefault();
        nudgeSphereZoom(1);
      });
    }
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        nudgeSphereZoom(-1);
      });
    }
    if (zoomResetBtn) {
      zoomResetBtn.addEventListener('click', function(e) {
        e.preventDefault();
        resetSphereView();
      });
    }
    if (motionToggleBtn) {
      motionToggleBtn.addEventListener('click', function(e) {
        e.preventDefault();
        toggleSphereMotion();
      });
    }

    // Close overlays on Escape
    bindProductEvent(document, 'keydown', function(e) {
      var targetTag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : '';
      var isTyping = targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select' || (e.target && e.target.isContentEditable);
      if (e.key === 'Escape') {
        collapseCard();
        closeModal();
        clearSphereFocus(true);
        return;
      }
      if (isTyping || layoutMode !== 'sphere' || modalEl.classList.contains('is-open')) return;

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        nudgeSphereZoom(1);
        return;
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        nudgeSphereZoom(-1);
        return;
      }
      if (e.key === '0') {
        e.preventDefault();
        resetSphereView();
        return;
      }
      var keyRotStep = e.shiftKey ? 16 : 8;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        clearSphereFocus(true);
        sphereFrozen = false;
        isIdle = false;
        clearTimeout(idleTimer);
        if (e.key === 'ArrowLeft') rotY -= keyRotStep;
        if (e.key === 'ArrowRight') rotY += keyRotStep;
        if (e.key === 'ArrowUp') rotX = Math.max(-MAX_TILT_X, rotX - keyRotStep * 0.55);
        if (e.key === 'ArrowDown') rotX = Math.min(MAX_TILT_X, rotX + keyRotStep * 0.55);
        velX = 0;
        velY = 0;
        applyRot();
        setInteractionState('keyboard');
        idleTimer = setTimeout(function() {
          isIdle = true;
          if (!sphereFrozen && layoutMode === 'sphere') setInteractionState('idle');
        }, IDLE_DELAY);
      }
    });

    // Set initial cursor
    sceneEl.style.cursor = 'grab';

    // --- Animation loop ---
    var galaxyRafId = 0;
    var lastGalaxyRenderTime = 0;
    var lastGalaxyMotionTime = 0;
    var lastGalaxyFrameDelta = PRODUCT_SPHERE_FRAME_INTERVAL;
    var productPerfSampleRafId = 0;
    var productPerfSampleTimer = null;
    var galaxyRuntimeStarted = false;
    var PRODUCT_ORBIT_DELTA_CLAMP = 10;

    function scaleMotionEase(ease, scale) {
      var safeEase = Math.max(0, Math.min(1, Number(ease) || 0));
      var safeScale = Math.max(0, Number(scale) || 1);
      return 1 - Math.pow(1 - safeEase, safeScale);
    }

    function scaleMotionFriction(friction, scale) {
      var safeFriction = Math.max(0, Math.min(1, Number(friction) || 0));
      var safeScale = Math.max(0, Number(scale) || 1);
      return Math.pow(safeFriction, safeScale);
    }

    function getGalaxyMotionScale(now, targetInterval) {
      var referenceInterval = Math.max(8, Number(targetInterval) || 16);
      var frameDelta = lastGalaxyMotionTime ? now - lastGalaxyMotionTime : referenceInterval;
      lastGalaxyMotionTime = now;
      if (!Number.isFinite(frameDelta) || frameDelta <= 0) {
        lastGalaxyFrameDelta = referenceInterval;
        return 1;
      }
      lastGalaxyFrameDelta = frameDelta;
      return Math.max(0.25, Math.min(PRODUCT_ORBIT_DELTA_CLAMP, frameDelta / referenceInterval));
    }

    function getIdleSpinScale() {
      var frameDelta = Number(lastGalaxyFrameDelta) || PRODUCT_SPHERE_FRAME_INTERVAL;
      if (!Number.isFinite(frameDelta) || frameDelta <= 0) return 1;
      return Math.max(0.25, Math.min(PRODUCT_IDLE_SPIN_MAX_DELTA, frameDelta) / PRODUCT_SPHERE_FRAME_INTERVAL);
    }

    function resetGalaxyFrameClock() {
      lastGalaxyRenderTime = 0;
      lastGalaxyMotionTime = 0;
      lastGalaxyFrameDelta = PRODUCT_SPHERE_FRAME_INTERVAL;
    }

    function getProductOrbitFrameInterval() {
      var mode = getCurrentPerformanceMode();
      if (layoutMode === 'grid') return mode === 'safe' ? 66 : (mode === 'balanced' ? 42 : 16);
      if (mode === 'safe') return 33;
      return PRODUCT_SPHERE_FRAME_INTERVAL;
    }

    function hasActiveSphereMotion() {
      if (layoutMode !== 'sphere') return false;
      if (isDragging || isPinching || hoverFocusActive || focusLockedCard) return true;
      if (userMotionPaused) return Math.abs(velY) > MOTION_STOP_EPSILON || Math.abs(velX) > MOTION_STOP_EPSILON;
      if (sphereFrozen || sphereHoverPaused) return false;
      if (isIdle) return true;
      return Math.abs(velY) > MOTION_STOP_EPSILON || Math.abs(velX) > MOTION_STOP_EPSILON;
    }

    function shouldContinueGalaxyLoop() {
      if (isProductMenuOpen()) return false;
      if (layoutMode === 'sphere') {
        return getCurrentPerformanceMode() === 'safe' ? hasActiveSphereMotion() : true;
      }
      if (layoutMode !== 'grid') return false;
      return sceneEl.classList.contains('is-grid-reflowing')
        || sceneEl.classList.contains('is-morphing-to-grid')
        || sceneEl.classList.contains('is-morphing-to-sphere')
        || Math.abs(boardScrollTarget - boardScrollCurrent) > 0.12;
    }

    function requestGalaxyFrame() {
      if (!galaxyRafId) galaxyRafId = requestAnimationFrame(animGalaxy);
    }

    function isProductMenuOpen() {
      return Boolean(state.menuOpen || body.classList.contains('menu-open'));
    }

    function animGalaxy(timestamp) {
      galaxyRafId = 0;
      var now = typeof timestamp === 'number' ? timestamp : (performance.now ? performance.now() : Date.now());
      if (isProductMenuOpen()) {
        lastGalaxyRenderTime = now;
        return;
      }
      var targetInterval = getProductOrbitFrameInterval();
      if (lastGalaxyRenderTime && now - lastGalaxyRenderTime < targetInterval) {
        if (shouldContinueGalaxyLoop()) requestGalaxyFrame();
        return;
      }
      lastGalaxyRenderTime = now;

      if (layoutMode === 'grid') {
        lastGalaxyMotionTime = now;
        applyBoardScrollFrame(false);
      } else if (layoutMode === 'sphere') {
        var motionScale = getGalaxyMotionScale(now, targetInterval);
        if (hoverFocusActive && !sphereFrozen && !isDragging) {
          var hoverEase = scaleMotionEase(HOVER_FOCUS_EASE, motionScale);
          rotY += shortestAngleDelta(rotY, hoverTargetRotY) * hoverEase;
          rotX += (hoverTargetRotX - rotX) * hoverEase;
          velX = 0;
          velY = 0;
          if (Math.abs(shortestAngleDelta(rotY, hoverTargetRotY)) < HOVER_SNAP_EPSILON) rotY = hoverTargetRotY;
          if (Math.abs(hoverTargetRotX - rotX) < HOVER_SNAP_EPSILON) rotX = hoverTargetRotX;
        } else if (userMotionPaused && !sphereFrozen && !isDragging) {
          velY += (0 - velY) * scaleMotionEase(MOTION_DECEL_EASE, motionScale);
          rotY += velY * motionScale;
          easeSphereTiltHome(0.012, 0.9, motionScale);
          if (Math.abs(velY) < MOTION_STOP_EPSILON) velY = 0;
        } else if (sphereHoverPaused && !sphereFrozen && !isDragging) {
          velX = 0;
          velY = 0;
        } else if (!sphereFrozen) {  // only update when NOT frozen
          if (isDragging) {
          rotY += velY;
          rotX += velX;
          } else if (isIdle) {
          velY += (getAutoSpinSpeed() - velY) * scaleMotionEase(0.02, motionScale);
          rotY += velY * getIdleSpinScale();
          easeSphereTiltHome(0.015, 0.9, motionScale);
          } else {
          velY *= scaleMotionFriction(FRICTION, motionScale);
          rotY += velY * motionScale;
          easeSphereTiltHome(0.01, FRICTION, motionScale);
          }
        }
        if (rotX > MAX_TILT_X) { rotX = MAX_TILT_X; velX = 0; }
        if (rotX < -MAX_TILT_X) { rotX = -MAX_TILT_X; velX = 0; }
        applyRot();
        syncHoverPreviewPosition();
        requestVisibleGalaxyImages(false);
      }
      if (shouldContinueGalaxyLoop()) requestGalaxyFrame();
    }

    function sampleProductFrameHealth() {
      if (performanceModeState.preference !== 'auto' || document.hidden) return;
      if (getCurrentPerformanceMode() === 'safe') return;
      if (isProductSceneBooting()) {
        var bootWait = Math.max(700, Math.min(3200, state.productSceneBootUntil - performance.now() + 650));
        productPerfSampleTimer = setTimeout(sampleProductFrameHealth, bootWait);
        return;
      }
      var startTime = 0;
      var lastTime = 0;
      var frames = 0;
      var slowFrames = 0;
      var severeFrames = 0;
      var maxDelta = 0;
      var deltaSum = 0;

      function sample(timestamp) {
        if (performanceModeState.preference !== 'auto' || document.hidden || layoutMode !== 'sphere') {
          productPerfSampleRafId = 0;
          return;
        }
        if (!startTime) startTime = timestamp;
        if (lastTime) {
          var delta = timestamp - lastTime;
          deltaSum += delta;
          maxDelta = Math.max(maxDelta, delta);
          if (delta > 48) slowFrames += 1;
          if (delta > 96) severeFrames += 1;
        }
        lastTime = timestamp;
        frames += 1;

        if (timestamp - startTime < 2200) {
          productPerfSampleRafId = requestAnimationFrame(sample);
          return;
        }

        productPerfSampleRafId = 0;
        var elapsed = Math.max(1, timestamp - startTime);
        var fps = Math.round((frames / elapsed) * 1000);
        var avgDelta = deltaSum / Math.max(1, frames - 1);
        var currentMode = getCurrentPerformanceMode();
        var metrics = {
          page: 'products',
          renderer: 'product-sphere',
          mode: currentMode,
          fps: fps,
          slowFrames: slowFrames,
          severeFrames: severeFrames,
          maxDelta: Math.round(maxDelta),
          avgDelta: Math.round(avgDelta),
          elapsed: Math.round(elapsed),
        };
        if (currentMode === 'full') {
          if (fps < 50 || severeFrames >= 2 || slowFrames >= 4 || maxDelta > 72 || avgDelta > 28) {
            if (downgradeAutoPerformanceMode('balanced', metrics)) {
              productPerfSampleTimer = setTimeout(sampleProductFrameHealth, 1800);
            }
          }
        } else if (currentMode === 'balanced') {
          if (fps < 30 || severeFrames >= 2 || slowFrames >= 8 || maxDelta > 130 || avgDelta > 44) {
            downgradeAutoPerformanceMode('safe', metrics);
          }
        }
      }

      productPerfSampleRafId = requestAnimationFrame(sample);
    }

    function handleGalaxyVisibilityChange() {
      if (document.hidden) return;
      resetGalaxyFrameClock();
      if (galaxyRuntimeStarted) requestGalaxyFrame();
    }

    bindProductEvent(document, 'visibilitychange', handleGalaxyVisibilityChange);

    productCleanups.push(onPerformanceModeChange(function() {
      resetGalaxyFrameClock();
      if (galaxyRuntimeStarted) requestGalaxyFrame();
    }));

    galaxyRuntimeStarted = true;
    requestGalaxyFrame();
    productPerfSampleTimer = setTimeout(sampleProductFrameHealth, 1400);

    var productMenuWasOpen = isProductMenuOpen();
    function syncProductMenuPause() {
      var menuOpen = isProductMenuOpen();
      if (menuOpen === productMenuWasOpen) return;
      productMenuWasOpen = menuOpen;

      if (menuOpen) {
        clearHoverCandidate();
        hideHoverPreview();
        stopSphere('paused');
        if (galaxyRafId) {
          cancelAnimationFrame(galaxyRafId);
          galaxyRafId = 0;
        }
        return;
      }

      resetGalaxyFrameClock();
      if (layoutMode === 'sphere' && !modalEl.classList.contains('is-open')) resumeSphere(true);
      if (galaxyRuntimeStarted) requestGalaxyFrame();
    }

    if (typeof MutationObserver === 'function') {
      var productMenuObserver = new MutationObserver(syncProductMenuPause);
      productMenuObserver.observe(body, { attributes: true, attributeFilter: ['class'] });
      productCleanups.push(function() {
        productMenuObserver.disconnect();
      });
    }

    // --- Search & Filter ---
    var activeFilter = 'all';
    var searchBrowseMode = false;
    var productCopy = getProductDetailCopy();

    function filterProducts(query, priceFilter, categoryFilter, sortMode) {
      var q = String(query || '').toLowerCase().trim();
      return sortProductList(demoProducts.filter(function(p) {
        var titleVi = String(p.titleVi || '').toLowerCase();
        var titleEn = String(p.titleEn || '').toLowerCase();
        var nameMatch = !q || titleVi.indexOf(q) !== -1 || titleEn.indexOf(q) !== -1;
        var categoryMatch = categoryFilter === 'all' || getProductCategory(p) === categoryFilter;
        return nameMatch && categoryMatch && matchesPriceRange(p, priceFilter);
      }), sortMode);
    }

    renderResults = function() {
      if (productDetailNavigationPending) return;
      clearTimeout(renderResultsTimer);
      renderResultsTimer = null;
      var q = searchInput.value || '';
      var categoryFilter = categorySelect ? categorySelect.value : 'all';
      var sortMode = sortSelect ? sortSelect.value : 'default';
      var items = filterProducts(q, activeFilter, categoryFilter, sortMode);
      var useGridLayout = shouldUseGridLayout(q, categoryFilter, activeFilter, sortMode);

      if (resultsPanel) resultsPanel.style.display = 'none';
      collapseCard();

      if (!useGridLayout && layoutMode === 'sphere') {
        return;
      }

      if (useGridLayout) {
        applyGridLayout(items);
      } else {
        applySphereLayout();
      }
    };

    function scheduleRenderResults(delayMs) {
      if (productDetailNavigationPending) return;
      clearTimeout(renderResultsTimer);
      var delay = reducedMotion ? 0 : (typeof delayMs === 'number' ? delayMs : 90);
      if (layoutMode === 'grid') delay = Math.min(delay, 40);
      if (layoutMode !== 'grid' && !reducedMotion && gridMorphHoldUntil && sceneEl.classList.contains('is-morphing-to-grid')) {
        delay = Math.max(delay, Math.max(0, gridMorphHoldUntil - Date.now()));
      }
      renderResultsTimer = setTimeout(function() {
        if (productDetailNavigationPending) return;
        renderResultsTimer = null;
        renderResults();
      }, delay);
    }

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
    }

    function bindFilterDropdown(dropdownUi) {
      if (!dropdownUi || !dropdownUi.toggle || !dropdownUi.menu || !dropdownUi.field || !dropdownUi.select) return;
      dropdownUi.closeTimer = null;
      dropdownUi.openedByFocusAt = 0;

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
        var focusOpenedRecently = dropdownUi.openedByFocusAt && Date.now() - dropdownUi.openedByFocusAt < 350;
        if (dropdownUi.closeTimer) {
          clearTimeout(dropdownUi.closeTimer);
          dropdownUi.closeTimer = null;
        }
        setFilterMenuOpen(dropdownUi, focusOpenedRecently || !dropdownUi.menu.classList.contains('is-open'));
        dropdownUi.openedByFocusAt = 0;
      });
      dropdownUi.toggle.addEventListener('mouseenter', function() {
        openDropdown();
      });
      dropdownUi.toggle.addEventListener('focus', function() {
        dropdownUi.openedByFocusAt = Date.now();
        openDropdown();
      });
      dropdownUi.menu.addEventListener('click', function(e) {
        var optionBtn = e.target.closest('.galaxy-filter-menu__option');
        if (!optionBtn) return;
        e.stopPropagation();
        dropdownUi.select.value = optionBtn.dataset.value;
        syncFilterMenuLabel(dropdownUi);
        setFilterMenuOpen(dropdownUi, false);
        scheduleRenderResults(90);
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
      scheduleRenderResults(90);
    }

    searchInput.addEventListener('input', function() {
      searchBrowseMode = true;
      scheduleRenderResults(40);
    });
    searchInput.addEventListener('focus', openSearchResults);
    searchInput.addEventListener('click', openSearchResults);
    if (categorySelect) categorySelect.addEventListener('change', function() { scheduleRenderResults(40); });
    if (sortSelect) sortSelect.addEventListener('change', function() { scheduleRenderResults(40); });
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
    bindProductEvent(window, 'resize', function() {
      syncProductFilterBarFrame();
      syncSphereCardOrigins();
      clearTimeout(boardResizeTimer);
      boardResizeTimer = setTimeout(renderResults, 120);
    });
    bindProductEvent(window, 'scroll', syncProductFilterBarFrame, { passive: true });

    function isProductShellClickTarget(target) {
      return Boolean(target && target.closest([
        '.js-site-header',
        '.header-shell',
        '.js-menu-trigger',
        '.js-menu-overlay',
        '.menu-overlay',
        '.welcome-theme-toggle',
        '.header-lang-inline',
        '.header-consult-btn',
        '.galaxy-control-dock',
        '.galaxy-modal',
        '.galaxy-hover-preview'
      ].join(',')));
    }

    function productHasActiveGridCriteria() {
      var q = searchInput.value || '';
      var categoryFilter = categorySelect ? categorySelect.value : 'all';
      var sortMode = sortSelect ? sortSelect.value : 'default';
      return Boolean(String(q).trim()) || categoryFilter !== 'all' || activeFilter !== 'all' || sortMode !== 'default';
    }

    // Close results when clicking outside
    bindProductEvent(document, 'click', function(e) {
      if (productDetailNavigationPending) return;
      if (e.target.closest('.galaxy-filter-panel')) return;
      if (isProductShellClickTarget(e.target)) return;

      var shouldReturnToSphere = !productHasActiveGridCriteria() && (searchBrowseMode || layoutMode === 'grid');
      setPriceDropdownOpen(false);
      setFilterMenuOpen(categoryDropdownUi, false);
      setFilterMenuOpen(sortDropdownUi, false);
      searchBrowseMode = false;
      if (resultsPanel) resultsPanel.style.display = 'none';
      if (shouldReturnToSphere) renderResults();
    });

    // Filter chips
    if (chipsWrap) {
      chipsWrap.addEventListener('click', function(e) {
        var btn = e.target.closest('.galaxy-chip');
        if (!btn) return;
        activeFilter = btn.dataset.filter;
        $$('.galaxy-chip', chipsWrap).forEach(function(c) { c.classList.remove('is-active'); });
        btn.classList.add('is-active');
        scheduleRenderResults(90);
      });
    }
    if (priceDropdown) {
      priceDropdown.addEventListener('click', function(e) {
        e.stopPropagation();
        var focusOpenedRecently = priceOpenedByFocusAt && Date.now() - priceOpenedByFocusAt < 350;
        if (priceCloseTimer) {
          clearTimeout(priceCloseTimer);
          priceCloseTimer = null;
        }
        setPriceDropdownOpen(focusOpenedRecently || !(priceMenu && priceMenu.classList.contains('is-open')));
        priceOpenedByFocusAt = 0;
      });
      priceDropdown.addEventListener('mouseenter', function() {
        setPriceDropdownOpen(true);
      });
      priceDropdown.addEventListener('focus', function() {
        priceOpenedByFocusAt = Date.now();
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
    registerPageCleanup(root, function() {
      productCleanups.forEach(function(cleanup) { cleanup(); });
      productCleanups = [];
      clearTimeout(idleTimer);
      clearTimeout(holdTimer);
      clearTimeout(hoverReleaseTimer);
      clearTimeout(hoverCandidateTimer);
      clearTimeout(renderResultsTimer);
      clearTimeout(gridMorphTimer);
      clearTimeout(boardConnectionTimer);
      clearTimeout(boardScrollEffectTimer);
      clearTimeout(gravityOverlayTimer);
      clearTimeout(priceCloseTimer);
      clearTimeout(boardResizeTimer);
      clearTimeout(productPerfSampleTimer);
      clearTimeout(galaxyImagePumpTimer);
      clearTimeout(galaxyInitialImageTimer);
      if (galaxyImagePumpIdle && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(galaxyImagePumpIdle);
      if (categoryDropdownUi && categoryDropdownUi.closeTimer) clearTimeout(categoryDropdownUi.closeTimer);
      if (sortDropdownUi && sortDropdownUi.closeTimer) clearTimeout(sortDropdownUi.closeTimer);
      if (hoverPickFrame) cancelAnimationFrame(hoverPickFrame);
      if (galaxyRafId) cancelAnimationFrame(galaxyRafId);
      if (productPerfSampleRafId) cancelAnimationFrame(productPerfSampleRafId);
      if (galaxyVisibleImageFrame) cancelAnimationFrame(galaxyVisibleImageFrame);
      hoverPickFrame = 0;
      galaxyRafId = 0;
      productPerfSampleRafId = 0;
      galaxyVisibleImageFrame = 0;
      galaxyImagePumpIdle = 0;
      galaxyRuntimeStarted = false;
      state.productSceneBootUntil = 0;
      clearMorphLayer();
      clearGravityCollapseFx();
      clearBoardConnections();
      [searchBarEl, previewEl, hoverPreviewEl, modalEl].forEach(function(element) {
        if (element && element.parentNode) element.parentNode.removeChild(element);
      });
      if (footer) footer.style.display = previousFooterDisplay;
    });
    renderInitialProductResults();

    scheduleHero3DCanvas(root, 80, 260);
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

    const heroImageSource = item.hero && item.hero.src ? resolveAssetSource(item.hero.src) : null;
    const ogImageUrl = heroImageSource ? (heroImageSource.startsWith("http") ? heroImageSource : SITE_ORIGIN + heroImageSource) : null;
    const productPrice = Number(String(item.priceVi || item.priceEn || "0").replace(/[^\d]/g, "")) || 0;
    const productJsonLd = {
      "@context": "https://schema.org/",
      "@type": "Product",
      name: title,
      description: summary,
      image: ogImageUrl ? [ogImageUrl] : undefined,
      brand: { "@type": "Brand", name: "SMARTSTEAM" },
      offers: productPrice > 0 ? {
        "@type": "Offer",
        priceCurrency: "VND",
        price: productPrice,
        availability: stockCount > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        url: buildCanonicalUrl(),
      } : undefined,
    };
    updateMeta(`${title} | SMARTSTEAM`, summary, {
      ogType: "product",
      image: ogImageUrl,
      jsonLd: productJsonLd,
    });

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
                ${renderMedia(dedupedGallery[0] || item.hero || item.cover, "", { priority: true, stage: "hero", fit: "contain" })}
              </div>
              <div class="product-detail-thumb-row js-detail-thumb-shell">
                <button class="product-detail-thumb-nav js-detail-thumb-prev" type="button" aria-label="${locale === "vi" ? "Xem thumbnail trước" : "Previous thumbnails"}">‹</button>
                <div class="product-detail-thumbs js-detail-thumbs">
                  ${dedupedGallery.map((mediaItem, index) => `
                    <button class="product-detail-thumb${index === 0 ? " is-active" : ""}" type="button" data-idx="${index}">
                      ${renderMedia(getCatalogueThumbMedia(mediaItem), "", { tier: index < 2 ? "near" : "deferred", fit: "contain" })}
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
    const detailCleanups = [];

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
    const cartButton = $(".product-detail-cart-btn", root);
    if (cartButton && qtyValue) {
      const defaultLabel = cartButton.textContent;
      cartButton.addEventListener("click", () => {
        const quantity = Math.max(1, Number(qtyValue.textContent || 1));
        addProductToLocalCart(item, quantity);
        cartButton.textContent = locale === "vi" ? "ĐÃ THÊM VÀO GIỎ" : "ADDED TO CART";
        window.setTimeout(() => {
          cartButton.textContent = defaultLabel;
        }, 1600);
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

    const handleDetailResize = () => {
      requestAnimationFrame(() => {
        syncGalleryCardHeight();
        syncThumbRailNav();
      });
    };
    window.addEventListener("resize", handleDetailResize, { passive: true });
    detailCleanups.push(() => window.removeEventListener("resize", handleDetailResize));

    if (galleryCard && "ResizeObserver" in window) {
      const galleryCardResizeObserver = new ResizeObserver(() => {
        syncGalleryCardHeight();
      });
      galleryCardResizeObserver.observe(galleryCard);
      detailCleanups.push(() => galleryCardResizeObserver.disconnect());
    }

    registerPageCleanup(root, () => {
      detailCleanups.forEach((cleanup) => cleanup());
    });

    hydrateDynamicMedia(root);
    scheduleGalleryCardHeightSync();
    syncThumbRailNav();
    setTimeout(() => {
      syncGalleryCardHeight();
      syncThumbRailNav();
    }, 120);
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
    const filterTrigger = $(".js-tutorial-filter-trigger", root);
    const filterSummary = $(".js-tutorial-filter-summary", root);
    const filterApply = $(".js-tutorial-filter-apply", root);
    const filterClear = $(".js-tutorial-filter-clear", root);
    const filterCloseButtons = $$(".js-tutorial-filter-close", root);
    const viewButtons = $$(".js-tutorial-view", root);
    const mobileFilterQuery = typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(max-width: 760px)")
      : null;
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
      storedView = localStorage.getItem("smartsteam:tutorial-view") === "editorial" ? "editorial" : "grid";
    } catch (error) {}

    const state = {
      category: initialCategory,
      difficulty: initialDifficulty,
      duration: initialDuration,
      sort: normalizeText(params.get("sort") || "").toLowerCase() || "latest",
      view: storedView,
    };

    const syncFilterControls = () => {
      $$("select[data-filter-key]", filtersForm).forEach((select) => {
        const filterKey = select.dataset.filterKey;
        if (!filterKey || !(filterKey in state)) return;
        select.value = state[filterKey];
      });
    };

    syncFilterControls();

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
      if (filterSummary) {
        const activeFilters = [state.category !== "all", state.difficulty !== "all", state.duration !== "all", state.sort !== "latest"].filter(Boolean).length;
        const resultLabel = locale === "vi"
          ? `${filteredItems.length} bài giảng`
          : `${filteredItems.length} lessons`;
        filterSummary.textContent = activeFilters
          ? (locale === "vi" ? `${activeFilters} lọc · ${resultLabel}` : `${activeFilters} filters · ${resultLabel}`)
          : resultLabel;
      }
      results.innerHTML = filteredItems.length
        ? `<div class="tutorial-catalogue-grid">${filteredItems.map((item, index) => renderTutorialCatalogueCard(item, index)).join("")}</div>`
        : renderTutorialCatalogueEmptyState();
      hydrateDynamicMedia(results);
      refreshInteractiveLayers(results);
      updateView();
    };

    const isMobileFilterViewport = () => !mobileFilterQuery || mobileFilterQuery.matches;

    const syncFilterVisibilityState = () => {
      const isOpen = section.classList.contains("is-filter-open");
      if (isMobileFilterViewport()) {
        filtersForm.setAttribute("aria-hidden", isOpen ? "false" : "true");
      } else {
        filtersForm.removeAttribute("aria-hidden");
      }
    };

    const setFilterOpen = (isOpen) => {
      const nextOpen = Boolean(isOpen) && isMobileFilterViewport();
      section.classList.toggle("is-filter-open", nextOpen);
      if (filterTrigger) filterTrigger.setAttribute("aria-expanded", nextOpen ? "true" : "false");
      syncFilterVisibilityState();
      document.body.classList.toggle("is-tutorial-filter-open", nextOpen);
      if (nextOpen) {
        const firstSelect = $("select[data-filter-key]", filtersForm);
        window.setTimeout(() => firstSelect && firstSelect.focus({ preventScroll: true }), 80);
      }
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
        localStorage.setItem("smartsteam:tutorial-view", state.view);
      } catch (error) {}
      updateView();
    };

    const handleFilterTriggerClick = () => setFilterOpen(!section.classList.contains("is-filter-open"));

    const handleFilterCloseClick = () => setFilterOpen(false);

    const handleFilterClearClick = () => {
      state.category = "all";
      state.difficulty = "all";
      state.duration = "all";
      state.sort = "latest";
      syncFilterControls();
      renderResults();
    };

    const handleFilterKeydown = (event) => {
      if (event.key === "Escape" && section.classList.contains("is-filter-open")) setFilterOpen(false);
    };

    const handleFilterViewportChange = () => {
      if (!isMobileFilterViewport()) setFilterOpen(false);
      else syncFilterVisibilityState();
    };

    filtersForm.addEventListener("change", handleFilterChange);
    section.addEventListener("click", handleViewClick);
    if (filterTrigger) filterTrigger.addEventListener("click", handleFilterTriggerClick);
    if (filterApply) filterApply.addEventListener("click", handleFilterCloseClick);
    if (filterClear) filterClear.addEventListener("click", handleFilterClearClick);
    filterCloseButtons.forEach((button) => button.addEventListener("click", handleFilterCloseClick));
    document.addEventListener("keydown", handleFilterKeydown);
    window.addEventListener("resize", handleFilterViewportChange);
    setFilterOpen(false);
    renderResults();

    registerPageCleanup(root, () => {
      filtersForm.removeEventListener("change", handleFilterChange);
      section.removeEventListener("click", handleViewClick);
      if (filterTrigger) filterTrigger.removeEventListener("click", handleFilterTriggerClick);
      if (filterApply) filterApply.removeEventListener("click", handleFilterCloseClick);
      if (filterClear) filterClear.removeEventListener("click", handleFilterClearClick);
      filterCloseButtons.forEach((button) => button.removeEventListener("click", handleFilterCloseClick));
      document.removeEventListener("keydown", handleFilterKeydown);
      window.removeEventListener("resize", handleFilterViewportChange);
      document.body.classList.remove("is-tutorial-filter-open");
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
      restoreScrollInstant(storedScroll);
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
      mountShared3DBackground(root);
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
      filterButton: locale === "vi" ? "Lọc" : "Filter",
      filterTitle: locale === "vi" ? "Bộ lọc" : "Filters",
      filterApply: locale === "vi" ? "Áp dụng" : "Apply",
      filterClear: locale === "vi" ? "Xóa lọc" : "Clear",
      filterClose: locale === "vi" ? "Đóng bộ lọc" : "Close filters",
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
            <button class="tutorial-catalogue__filter-trigger js-tutorial-filter-trigger" type="button" aria-expanded="false" aria-controls="tutorial-catalogue-filter-panel">
              <span class="tutorial-catalogue__filter-trigger-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 6h16"></path>
                  <path d="M7 12h10"></path>
                  <path d="M10 18h4"></path>
                </svg>
              </span>
              <span>${labels.filterButton}</span>
              <strong class="js-tutorial-filter-summary">${locale === "vi" ? `${items.length} bài giảng` : `${items.length} lessons`}</strong>
            </button>
            <button class="tutorial-catalogue__filter-scrim js-tutorial-filter-close" type="button" aria-label="${labels.filterClose}" aria-hidden="true"></button>
            <form id="tutorial-catalogue-filter-panel" class="tutorial-catalogue__filters js-tutorial-catalogue-filters" aria-label="${locale === "vi" ? "Bộ lọc bài giảng" : "Tutorial filters"}">
              <div class="tutorial-catalogue__filter-head">
                <strong>${labels.filterTitle}</strong>
                <button class="tutorial-catalogue__filter-close js-tutorial-filter-close" type="button" aria-label="${labels.filterClose}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
                    <path d="M6 6l12 12"></path>
                    <path d="M18 6L6 18"></path>
                  </svg>
                </button>
              </div>
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
              <div class="tutorial-catalogue__filter-actions">
                <button class="tutorial-catalogue__filter-clear js-tutorial-filter-clear" type="button">${labels.filterClear}</button>
                <button class="tutorial-catalogue__filter-apply js-tutorial-filter-apply" type="button">${labels.filterApply}</button>
              </div>
            </form>
          </header>
          <div class="tutorial-catalogue__results js-tutorial-catalogue-results" aria-live="polite"></div>
        </div>
      </section>
    `;

    mountShared3DBackground(root);
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
      mountShared3DBackground(root);
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

    mountShared3DBackground(root);
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
      locale === "vi" ? "SMARTSTEAM | Dự án" : "SMARTSTEAM | Projects",
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
      mountShared3DBackground(root);
      refreshInteractiveLayers(root);
      return;
    }

    root.innerHTML = `
      <section class="project-archive-page">
        <div class="container project-archive-page__shell">
          <header class="project-archive-page__header" data-motion="text-stagger">
            <h1>${locale === "vi" ? "Dự án" : "Projects"}</h1>
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

    mountShared3DBackground(root);
    hydrateDynamicMedia(root);
    refreshInteractiveLayers(root);
    initProjectArchiveScrollMemory(root);
    initProjectArchiveTimeline(root);
  }

  function buildArchiveContentModel(item, prefix, fallbackText) {
    const fallbackMarkup = `<p>${escapeHtmlText(fallbackText || "")}</p>`;
    const source = sanitizeMigratedHtml(item && item.contentHtml ? item.contentHtml : "");
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

    updateMeta(`${title} | SMARTSTEAM`, summary || intro);
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

    updateMeta(`${title} | SMARTSTEAM`, summary);
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

    updateMeta(`${title} | SMARTSTEAM`, summary);
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
  }

  function renderProjectDetailPage() {
    renderProjectCaseDetail();
  }

  function renderNewsPage() {
    const root = $(".js-page-root");
    if (!root) return;
    updateMeta(strings.pageMeta.news.title, strings.pageMeta.news.description);
    return renderNewsPageShowcase();
  }

  function renderTutorialsPage() {
    const root = $(".js-page-root");
    if (!root) return;
    updateMeta(strings.pageMeta.tutorials.title, strings.pageMeta.tutorials.description);
    return renderTutorialsPageShowcase();
  }

  function renderContactPage() {
    const root = $(".js-page-root");
    if (!root) return;
    updateMeta(strings.pageMeta.contact.title, strings.pageMeta.contact.description);
    const contactData = data.siteMeta.contact || {};
    const contactAddress = contactData.address ? normalizeText(contactData.address[locale] || "") : "";
    const contactHours = contactData.hours ? normalizeText(contactData.hours[locale] || "") : "";
    const emailHref = normalizeEmailHref(contactData.email);
    const telHref = normalizeTelHref(contactData.phone);
    const mapHref = normalizeSafeHref(contactData.mapUrl, { protocols: ["https:", "http:"], allowRelative: false });
    const contactChannels = [
      emailHref
        ? `<a href="${escapeHtmlText(emailHref)}">${escapeHtmlText(contactData.email)}</a>`
        : "",
      telHref
        ? `<a href="${escapeHtmlText(telHref)}">${escapeHtmlText(contactData.phone)}</a>`
        : "",
      contactAddress ? `<span>${escapeHtmlText(contactAddress)}</span>` : "",
      contactHours ? `<span>${escapeHtmlText(contactHours)}</span>` : "",
    ].filter(Boolean).join("");
    const socialLinks = (Array.isArray(data.siteMeta.socials) ? data.siteMeta.socials : [])
      .filter((item) => item && item.href && !String(item.href).startsWith("#"))
      .map((item) => {
        const href = normalizeSafeHref(item.href, { protocols: ["https:", "http:"], allowRelative: false });
        if (!href || href === "#") return "";
        return `<a href="${escapeHtmlText(href)}" target="_blank" rel="noreferrer">${escapeHtmlText(item.label)}</a>`;
      })
      .filter(Boolean)
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
              <a class="button button--ghost" href="${escapeHtmlText(mapHref)}" target="_blank" rel="noreferrer">${strings.actions.viewMap}</a>
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
    mountShared3DBackground(root);
  }

  function renderPolicyPages() {
    const root = $(".js-page-root");
    if (!root) return;
    const slug = slugFromPath();
    const item = data.policies.find((entry) => entry.slug === slug) || data.policies[0];
    updateMeta(
      item ? `${locale === "vi" ? item.titleVi : item.titleEn} | SMARTSTEAM` : strings.pageMeta.policy.title,
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
      const contactData = data.siteMeta.contact || {};
      const recipient = normalizeText(contactData.email || "");
      const formData = new FormData(form);
      const subject = locale === "vi" ? "Yêu cầu tư vấn SMARTSTEAM" : "SMARTSTEAM consultation request";
      const lines = [
        `${strings.form.name}: ${normalizeText(formData.get("name") || "")}`,
        `${strings.form.email}: ${normalizeText(formData.get("email") || "")}`,
        `${strings.form.phone}: ${normalizeText(formData.get("phone") || "")}`,
        `${strings.form.interest}: ${normalizeText(formData.get("interest") || "")}`,
        "",
        `${strings.form.message}:`,
        normalizeText(formData.get("message") || ""),
      ];
      const emailHref = normalizeEmailHref(recipient);
      const mailtoUrl = emailHref ? `${emailHref}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}` : "";
      submitButton.disabled = true;
      submitButton.textContent = strings.form.sending;
      form.setAttribute("aria-busy", "true");
      feedback.textContent = "";

      window.setTimeout(() => {
        form.removeAttribute("aria-busy");
        submitButton.disabled = false;
        submitButton.textContent = strings.form.submit;
        feedback.textContent = mailtoUrl
          ? (locale === "vi"
            ? "Đã mở ứng dụng email với nội dung bạn nhập. Gửi email để hoàn tất liên hệ."
            : "Your email app opened with the brief filled in. Send the email to complete the enquiry.")
          : (locale === "vi"
            ? "Đã ghi nhận nội dung bạn nhập. Vui lòng dùng số điện thoại hoặc Zalo bên cạnh để gửi yêu cầu."
            : "Your brief is ready. Use the phone or Zalo channel beside this form to send the request.");
        if (mailtoUrl) window.location.href = mailtoUrl;
      }, 250);
    });
  }

  function addProductToLocalCart(product, quantity) {
    if (!product || !product.slug) return;
    const qty = Math.max(1, Number(quantity || 1));
    const storageKey = "smartsteam:cart";
    let cart = [];
    try {
      cart = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (!Array.isArray(cart)) cart = [];
    } catch (error) {
      cart = [];
    }
    const slug = product.slug;
    const existing = cart.find((entry) => entry.slug === slug);
    if (existing) {
      existing.quantity = Math.max(1, Number(existing.quantity || 0)) + qty;
      existing.updatedAt = new Date().toISOString();
    } else {
      cart.push({
        slug,
        title: getText(product, "titleVi", "titleEn") || product.name || slug,
        priceVi: product.priceVi || "",
        priceEn: product.priceEn || "",
        quantity: qty,
        addedAt: new Date().toISOString(),
      });
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch (error) {}
  }

  function initMissionExperience(root) {
    const scope = $(".js-mission-experience", root);
    if (!scope) return;

    const progressFill = $(".js-mission-progress span", root);
    const hero = $(".mission-hero", root);
    const layers = $$("[data-mission-layer]", root);
    const livePanels = $$("[data-mission-panel], .mission-hud__panel, .mission-hud__orbital, .process-step, .proof-collage__tile", root);
    const staticWelcome = page === "welcome" && (isMobileViewport() || getCurrentPerformanceMode() === "safe");
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let pointerRaf = 0;
    let scrollRaf = 0;
    let observer = null;

    function applyStaticMobileFrame() {
      scope.style.setProperty("--mission-x", "0");
      scope.style.setProperty("--mission-y", "0");
      scope.style.setProperty("--mission-tilt-x", "0deg");
      scope.style.setProperty("--mission-tilt-y", "0deg");
      scope.style.setProperty("--mission-scroll", "0");
      scope.style.setProperty("--mission-hero-progress", "0");
      layers.forEach((layer) => {
        layer.style.setProperty("--layer-x", "0px");
        layer.style.setProperty("--layer-y", "0px");
      });
      if (progressFill) progressFill.style.transform = "scaleX(0)";
    }

    function applyPointerFrame() {
      pointerRaf = 0;
      pointer.x += (pointer.targetX - pointer.x) * 0.12;
      pointer.y += (pointer.targetY - pointer.y) * 0.12;
      scope.style.setProperty("--mission-x", pointer.x.toFixed(4));
      scope.style.setProperty("--mission-y", pointer.y.toFixed(4));
      scope.style.setProperty("--mission-tilt-x", (pointer.y * -7).toFixed(3) + "deg");
      scope.style.setProperty("--mission-tilt-y", (pointer.x * 8).toFixed(3) + "deg");

      layers.forEach((layer, index) => {
        const depth = Number(layer.dataset.missionLayer || index + 1);
        layer.style.setProperty("--layer-x", (pointer.x * depth * 5.5).toFixed(2) + "px");
        layer.style.setProperty("--layer-y", (pointer.y * depth * 4.5).toFixed(2) + "px");
      });

      if (Math.abs(pointer.targetX - pointer.x) > 0.001 || Math.abs(pointer.targetY - pointer.y) > 0.001) {
        pointerRaf = window.requestAnimationFrame(applyPointerFrame);
      }
    }

    function handlePointer(event) {
      if (reducedMotion) return;
      pointer.targetX = clamp((event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2, -1, 1);
      pointer.targetY = clamp((event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2, -1, 1);
      if (!pointerRaf) pointerRaf = window.requestAnimationFrame(applyPointerFrame);
    }

    function applyScrollFrame() {
      scrollRaf = 0;
      const scopeRect = scope.getBoundingClientRect();
      const distance = Math.max(scope.scrollHeight - window.innerHeight, 1);
      const progress = clamp(-scopeRect.top / distance, 0, 1);
      scope.style.setProperty("--mission-scroll", progress.toFixed(4));
      if (progressFill) progressFill.style.transform = `scaleX(${progress})`;

      if (hero) {
        const heroRect = hero.getBoundingClientRect();
        const heroProgress = clamp((window.innerHeight - heroRect.top) / Math.max(heroRect.height + window.innerHeight, 1), 0, 1);
        scope.style.setProperty("--mission-hero-progress", heroProgress.toFixed(4));
      }
    }

    function requestScrollFrame() {
      if (!scrollRaf) scrollRaf = window.requestAnimationFrame(applyScrollFrame);
    }

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-mission-live");
        });
      }, { threshold: 0.22, rootMargin: "0px 0px -8% 0px" });
      livePanels.forEach((panel) => observer.observe(panel));
    } else {
      livePanels.forEach((panel) => panel.classList.add("is-mission-live"));
    }

    if (staticWelcome) {
      applyStaticMobileFrame();
    } else {
      window.addEventListener("pointermove", handlePointer, { passive: true });
      window.addEventListener("scroll", requestScrollFrame, { passive: true });
      window.addEventListener("resize", requestScrollFrame);
      applyPointerFrame();
      applyScrollFrame();
    }

    registerPageCleanup(root, () => {
      window.removeEventListener("pointermove", handlePointer);
      window.removeEventListener("scroll", requestScrollFrame);
      window.removeEventListener("resize", requestScrollFrame);
      if (pointerRaf) window.cancelAnimationFrame(pointerRaf);
      if (scrollRaf) window.cancelAnimationFrame(scrollRaf);
      if (observer) observer.disconnect();
    });
  }

  function initThreeHero3DCanvas(root, canvas) {
    return loadThreeModule().then((THREE) => {
      if (!root.isConnected || !canvas.isConnected || canvas.dataset.fallback2d === "true") return;

      const isProductCanvas = body.dataset.page === "products";
      const supportsBackgroundMotion = pageSupportsBackgroundMotion();
      const lowPowerDevice = (navigator.hardwareConcurrency || 8) <= 4 || window.innerWidth < 760;
      const initialPerformanceMode = getCurrentPerformanceMode();
      let productSceneEl = null;
      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: !lowPowerDevice && initialPerformanceMode === "full",
        preserveDrawingBuffer: false,
        powerPreference: lowPowerDevice || initialPerformanceMode !== "full" ? "default" : "high-performance",
      });
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 120);
      camera.position.set(0, 0, 16);

      const stage = new THREE.Group();
      scene.add(stage);

      function pickBackgroundModelValue(value, fallback) {
        if (value && typeof value === "object" && !Array.isArray(value)) {
          if (Object.prototype.hasOwnProperty.call(value, page)) return value[page];
          if (isProductCanvas && Object.prototype.hasOwnProperty.call(value, "products")) return value.products;
          if (Object.prototype.hasOwnProperty.call(value, "default")) return value.default;
        }
        return value === undefined ? fallback : value;
      }

      function readModelTuple(value, fallback) {
        const source = Array.isArray(value) ? value : [];
        return [0, 1, 2].map((index) => {
          const nextValue = Number(source[index]);
          return Number.isFinite(nextValue) ? nextValue : fallback[index];
        });
      }

      function getBackgroundModelConfig() {
        const modelConfig = runtimeTuning.backgroundModel || {};
        if (!modelConfig || modelConfig.enabled === false) return null;
        const allowedPages = Array.isArray(modelConfig.pages) ? modelConfig.pages : [];
        if (allowedPages.length && !allowedPages.includes(page)) return null;
        const source = resolveAssetSource(pickBackgroundModelValue(modelConfig.src, ""));
        if (!source) return null;
        const defaultPosition = isProductCanvas ? [0, 1.15, -19] : [4.6, 1.2, -19];
        const fitSize = Number(pickBackgroundModelValue(modelConfig.fitSize, isProductCanvas ? 7.2 : 5.4));
        return {
          src: source,
          fitSize: Number.isFinite(fitSize) && fitSize > 0 ? fitSize : (isProductCanvas ? 7.2 : 5.4),
          position: readModelTuple(pickBackgroundModelValue(modelConfig.position, defaultPosition), defaultPosition),
          rotation: readModelTuple(pickBackgroundModelValue(modelConfig.rotation, [0, 0, 0]), [0, 0, 0]),
          spin: readModelTuple(pickBackgroundModelValue(modelConfig.spin, [0.0002, 0.001, 0.00008]), [0.0002, 0.001, 0.00008]),
          showCoreWithModel: Boolean(modelConfig.showCoreWithModel),
        };
      }

      const backgroundModelConfig = getBackgroundModelConfig();

      const particleCount = !supportsBackgroundMotion
        ? 180
        : (lowPowerDevice ? (isProductCanvas ? 360 : 320) : (isProductCanvas ? 720 : 560));
      let activeParticleCount = particleCount;
      const particleSpreadX = isProductCanvas ? 42 : 36;
      const particleSpreadY = isProductCanvas ? 24 : 21;
      const particleDepth = isProductCanvas ? 68 : 58;
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const speeds = new Float32Array(particleCount);
      const lanes = new Float32Array(particleCount);

      function resetParticle(index, initial) {
        const offset = index * 3;
        positions[offset] = (Math.random() - 0.5) * particleSpreadX;
        positions[offset + 1] = (Math.random() - 0.5) * particleSpreadY;
        positions[offset + 2] = initial ? -Math.random() * particleDepth - 2 : -particleDepth - Math.random() * 16;
        speeds[index] = 0.0028 + Math.random() * (isProductCanvas ? 0.011 : 0.0085);
        lanes[index] = Math.random() > 0.58 ? 1 : -1;
      }

      for (let i = 0; i < particleCount; i++) resetParticle(i, true);

      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      particleGeometry.setDrawRange(0, activeParticleCount);
      const particleMaterial = new THREE.PointsMaterial({
        size: lowPowerDevice ? 0.055 : 0.048,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.92,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const particles = new THREE.Points(particleGeometry, particleMaterial);
      stage.add(particles);

      const grid = new THREE.GridHelper(52, lowPowerDevice ? 34 : 46, 0x86ddff, 0x86ddff);
      grid.position.set(0, -6.3, -18);
      grid.rotation.z = 0.03;
      stage.add(grid);

      const ambientLight = new THREE.AmbientLight(0xdffaff, isProductCanvas ? 1.35 : 1.15);
      const keyLight = new THREE.DirectionalLight(0xffffff, isProductCanvas ? 2.25 : 1.75);
      keyLight.position.set(-4.5, 5.2, 9);
      const rimLight = new THREE.DirectionalLight(0x73e6ff, isProductCanvas ? 1.3 : 1.0);
      rimLight.position.set(4.8, -1.8, 5.4);
      scene.add(ambientLight, keyLight, rimLight);

      const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0x86ddff,
        wireframe: true,
        transparent: true,
        opacity: 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(isProductCanvas ? 3.2 : 2.55, 2), coreMaterial);
      core.position.set(isProductCanvas ? 0 : 4.6, 1.2, -19);
      stage.add(core);

      const backgroundModelHost = new THREE.Group();
      backgroundModelHost.visible = false;
      stage.add(backgroundModelHost);
      let backgroundModelReady = false;
      const backgroundModelSpin = new THREE.Vector3(0, 0, 0);

      function markBackgroundModelFallback() {
        backgroundModelReady = false;
        backgroundModelHost.visible = false;
        core.visible = true;
        canvas.dataset.backgroundModel = backgroundModelConfig ? "fallback" : "off";
      }

      function readBackgroundModelBounds(modelRoot) {
        const bounds = new THREE.Box3().setFromObject(modelRoot);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        bounds.getSize(size);
        bounds.getCenter(center);
        const maxSize = Math.max(size.x, size.y, size.z);
        if (!Number.isFinite(maxSize) || maxSize <= 0 || bounds.isEmpty()) return null;
        return { center, maxSize };
      }

      function tuneBackgroundModelMaterial(material) {
        if (!material) return;
        material.depthWrite = true;
        material.depthTest = true;
        if ("envMapIntensity" in material) material.envMapIntensity = Math.max(material.envMapIntensity || 0, 0.8);
        if ("roughness" in material) material.roughness = Math.min(Math.max(material.roughness || 0.38, 0.18), 0.72);
        if ("metalness" in material) material.metalness = Math.min(Math.max(material.metalness || 0.12, 0), 0.65);
        material.needsUpdate = true;
      }

      function prepareBackgroundModel(modelRoot) {
        modelRoot.traverse((object) => {
          eachMaterial(object.material, tuneBackgroundModelMaterial);
          if (object.isMesh) {
            object.castShadow = false;
            object.receiveShadow = false;
          }
        });

        modelRoot.updateWorldMatrix(true, true);
        const modelBounds = readBackgroundModelBounds(modelRoot);
        if (!modelBounds) return false;

        modelRoot.position.sub(modelBounds.center);
        backgroundModelHost.scale.setScalar(backgroundModelConfig.fitSize / modelBounds.maxSize);
        backgroundModelHost.position.fromArray(backgroundModelConfig.position);
        backgroundModelHost.rotation.set(
          backgroundModelConfig.rotation[0],
          backgroundModelConfig.rotation[1],
          backgroundModelConfig.rotation[2]
        );
        backgroundModelSpin.fromArray(backgroundModelConfig.spin);
        return true;
      }

      async function backgroundModelSourceExists(source) {
        if (!source || source.startsWith("data:")) return Boolean(source);
        try {
          const response = await fetch(source, { method: "HEAD", cache: "force-cache" });
          if (response.ok) return true;
          return response.status === 405 || response.status === 501;
        } catch (error) {
          return isRemoteMediaSource(source);
        }
      }

      async function loadBackgroundModel() {
        markBackgroundModelFallback();
        if (!backgroundModelConfig) return;
        const sourceExists = await backgroundModelSourceExists(backgroundModelConfig.src);
        if (!sourceExists || isDisposed) return;

        try {
          const { GLTFLoader } = await loadGltfLoaderModule();
          if (isDisposed) return;
          const loader = new GLTFLoader();
          const gltf = await loader.loadAsync(backgroundModelConfig.src);
          if (isDisposed) return;
          const modelRoot = gltf.scene || (Array.isArray(gltf.scenes) && gltf.scenes[0]);
          if (!modelRoot || !prepareBackgroundModel(modelRoot)) {
            markBackgroundModelFallback();
            return;
          }
          backgroundModelHost.clear();
          backgroundModelHost.add(modelRoot);
          backgroundModelHost.visible = true;
          backgroundModelReady = true;
          core.visible = backgroundModelConfig.showCoreWithModel;
          canvas.dataset.backgroundModel = "ready";
          renderer.render(scene, camera);
          requestLoop();
        } catch (error) {
          markBackgroundModelFallback();
        }
      }

      function createOrbit(radius, squash, color, opacity, tilt) {
        const points = [];
        const steps = lowPowerDevice ? 96 : 144;
        for (let i = 0; i < steps; i++) {
          const angle = (i / steps) * Math.PI * 2;
          points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius * squash, 0));
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const orbit = new THREE.LineLoop(geometry, material);
        orbit.position.copy(core.position);
        orbit.rotation.set(tilt.x, tilt.y, tilt.z);
        stage.add(orbit);
        return orbit;
      }

      const orbits = [
        createOrbit(isProductCanvas ? 8.4 : 6.6, 0.34, 0x86ddff, 0.28, { x: 0.8, y: 0.15, z: 0.2 }),
        createOrbit(isProductCanvas ? 11.6 : 9.2, 0.22, 0xf68c4b, 0.22, { x: 1.22, y: -0.34, z: -0.12 }),
        createOrbit(isProductCanvas ? 14.8 : 12.4, 0.16, 0x86ddff, 0.14, { x: 1.47, y: 0.36, z: 0.4 }),
      ];

      const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
      let rafId = 0;
      let lastTime = 0;
      let lastRenderTime = 0;
      let elapsed = 0;
      let isDisposed = false;
      let isVisible = !document.hidden;
      let paletteKey = "";
      const framePacer = createBackgroundFramePacer(lowPowerDevice);
      const backgroundHealthSampler = createBackgroundHealthSampler("three", isProductCanvas);

      function getProductSceneEl() {
        if (!isProductCanvas) return null;
        if (!productSceneEl || !productSceneEl.isConnected) {
          productSceneEl = $(".galaxy-scene", root) || $(".galaxy-scene");
        }
        return productSceneEl;
      }

      function eachMaterial(material, callback) {
        if (Array.isArray(material)) material.forEach(callback);
        else if (material) callback(material);
      }

      function getThreePalette() {
        const isLightTheme = body.dataset.page === "welcome"
          ? getWelcomeTheme() === "light"
          : body.dataset.theme === "light";

        if (isLightTheme) {
          const isWelcomeCanvas = body.dataset.page === "welcome";
          return {
            key: "light",
            opacity: isProductCanvas ? "0.78" : (isWelcomeCanvas ? "0.92" : "0.82"),
            particles: [0x1230a8, 0xe24f1a, 0x071f35, 0x00b6ad],
            particleOpacity: 1,
            particleSize: lowPowerDevice ? 0.082 : 0.072,
            particleBlending: THREE.NormalBlending,
            gridPrimary: 0x006ea8,
            gridSecondary: 0x006ea8,
            gridOpacity: isProductCanvas ? 0.52 : (isWelcomeCanvas ? 0.58 : 0.46),
            core: 0x00a7b5,
            coreOpacity: isProductCanvas ? 0.52 : (isWelcomeCanvas ? 0.7 : 0.62),
            detailBlending: THREE.NormalBlending,
            orbitA: 0x2643d8,
            orbitB: 0xe24f1a,
            orbitOpacity: isProductCanvas ? [0.64, 0.54, 0.44] : (isWelcomeCanvas ? [0.82, 0.68, 0.54] : [0.72, 0.6, 0.48]),
          };
        }

        return {
          key: "dark",
          opacity: isProductCanvas ? "0.96" : "0.94",
          particles: [0x86ddff, 0xf68c4b, 0xf4fbff],
          particleOpacity: 0.9,
          particleSize: lowPowerDevice ? 0.055 : 0.048,
          particleBlending: THREE.AdditiveBlending,
          gridPrimary: 0x86ddff,
          gridSecondary: 0x86ddff,
          gridOpacity: 0.34,
          core: 0x86ddff,
          coreOpacity: 0.14,
          detailBlending: THREE.AdditiveBlending,
          orbitA: 0x86ddff,
          orbitB: 0xf68c4b,
          orbitOpacity: [0.3, 0.23, 0.15],
        };
      }

      function applyPalette() {
        const palette = getThreePalette();
        if (palette.key === paletteKey) return;
        paletteKey = palette.key;
        canvas.dataset.theme = palette.key;
        canvas.dataset.renderer = "three";
        canvas.style.opacity = palette.opacity;
        particleMaterial.opacity = palette.particleOpacity;
        particleMaterial.size = palette.particleSize;
        particleMaterial.blending = palette.particleBlending;
        particleMaterial.needsUpdate = true;
        coreMaterial.color.setHex(palette.core);
        coreMaterial.opacity = palette.coreOpacity;
        coreMaterial.blending = palette.detailBlending;
        coreMaterial.needsUpdate = true;

        eachMaterial(grid.material, (material, index) => {
          material.transparent = true;
          material.opacity = palette.gridOpacity * 0.68;
          material.color.setHex(palette.gridSecondary);
        });

        orbits.forEach((orbit, index) => {
          orbit.material.color.setHex(index === 1 ? palette.orbitB : palette.orbitA);
          orbit.material.opacity = palette.orbitOpacity[index];
          orbit.material.blending = palette.detailBlending;
          orbit.material.needsUpdate = true;
        });

        for (let i = 0; i < particleCount; i++) {
          const color = new THREE.Color(palette.particles[i % palette.particles.length]);
          const offset = i * 3;
          colors[offset] = color.r;
          colors[offset + 1] = color.g;
          colors[offset + 2] = color.b;
        }
        particleGeometry.attributes.color.needsUpdate = true;
      }

      function resize() {
        const width = Math.max(1, window.innerWidth);
        const height = Math.max(1, window.innerHeight);
        activeParticleCount = getBackgroundParticleLimit(particleCount, isProductCanvas, lowPowerDevice);
        particleGeometry.setDrawRange(0, activeParticleCount);
        canvas.dataset.performanceMode = getCurrentPerformanceMode();
        const pixelRatio = Math.min(window.devicePixelRatio || 1, getBackgroundPixelRatioLimit(lowPowerDevice));
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }

      function handlePointer(event) {
        if (reducedMotion && performanceModeState.preference === "auto") return;
        pointer.targetX = clamp((event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2, -1, 1);
        pointer.targetY = clamp((event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2, -1, 1);
      }

      function cancelLoop() {
        if (!rafId) return;
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }

      function requestLoop() {
        if (!rafId && supportsBackgroundMotion && isVisible && !isDisposed && !shouldPauseBackgroundForMenu()) {
          rafId = window.requestAnimationFrame(renderFrame);
        }
      }

      function handleVisibility() {
        isVisible = !document.hidden;
        if (!isVisible) cancelLoop();
        else requestLoop();
      }

      function syncMenuPause() {
        lastRenderTime = 0;
        lastTime = 0;
        if (shouldPauseBackgroundForMenu()) cancelLoop();
        else requestLoop();
      }

      function renderFrame(timestamp) {
        rafId = 0;
        if (isDisposed || !isVisible || shouldPauseBackgroundForMenu()) {
          rafId = 0;
          return;
        }

        const nextParticleCount = getBackgroundParticleLimit(particleCount, isProductCanvas, lowPowerDevice);
        if (nextParticleCount !== activeParticleCount) {
          activeParticleCount = nextParticleCount;
          particleGeometry.setDrawRange(0, activeParticleCount);
          canvas.dataset.performanceMode = getCurrentPerformanceMode();
        }

        const motionProfile = getBackgroundMotionProfile(isProductCanvas, getProductSceneEl(), lowPowerDevice);
        if (!motionProfile.active) {
          applyPalette();
          renderer.render(scene, camera);
          return;
        }

        const targetInterval = motionProfile.interval + framePacer.intervalBoost;
        if (lastRenderTime && timestamp - lastRenderTime < targetInterval) {
          requestLoop();
          return;
        }

        const frameDelta = lastRenderTime ? timestamp - lastRenderTime : targetInterval;
        lastRenderTime = timestamp;
        framePacer.observe(frameDelta, targetInterval);
        backgroundHealthSampler.observe(timestamp, targetInterval);
        applyPalette();
        const delta = Math.min(64, timestamp - (lastTime || timestamp || 0) || targetInterval);
        const motionDelta = delta * motionProfile.speed;
        lastTime = timestamp;
        elapsed += motionDelta * 0.001;

        if (motionProfile.active) {
          const targetX = motionProfile.pointer ? pointer.targetX : 0;
          const targetY = motionProfile.pointer ? pointer.targetY : 0;
          const pointerEase = motionProfile.pointer ? 0.055 : 0.035;
          pointer.x += (targetX - pointer.x) * pointerEase;
          pointer.y += (targetY - pointer.y) * pointerEase;
          camera.position.x = pointer.x * 1.18;
          camera.position.y = pointer.y * -0.82;
          camera.lookAt(pointer.x * 1.8, pointer.y * -1.1, -18);

          for (let i = 0; i < activeParticleCount; i++) {
            const offset = i * 3;
            positions[offset] += Math.sin(elapsed * 1.35 + i * 0.17) * 0.0038 * lanes[i] * motionDelta;
            positions[offset + 1] += Math.cos(elapsed * 1.05 + i * 0.11) * 0.0024 * lanes[i] * motionDelta;
            positions[offset + 2] += speeds[i] * motionDelta * 2.2;
            if (positions[offset + 2] > 12) resetParticle(i, false);
          }
          particleGeometry.attributes.position.needsUpdate = true;

          stage.rotation.y = pointer.x * 0.12 + Math.sin(elapsed * 0.42) * 0.05;
          stage.rotation.x = pointer.y * -0.07 + Math.cos(elapsed * 0.36) * 0.018;
          particles.rotation.z = elapsed * 0.048;
          grid.position.z = -18 + ((elapsed * 8.5) % 6);
          core.rotation.x += 0.0012 * motionDelta;
          core.rotation.y += 0.0016 * motionDelta;
          if (backgroundModelReady) {
            backgroundModelHost.rotation.x += backgroundModelSpin.x * motionDelta;
            backgroundModelHost.rotation.y += backgroundModelSpin.y * motionDelta;
            backgroundModelHost.rotation.z += backgroundModelSpin.z * motionDelta;
          }
          orbits.forEach((orbit, index) => {
            orbit.rotation.z += (index === 1 ? -1 : 1) * (0.00072 + index * 0.00018) * motionDelta;
            orbit.rotation.y += (index === 1 ? 0.00042 : -0.00034) * motionDelta;
          });
        }

        renderer.render(scene, camera);
        requestLoop();
      }

      function disposeObject(object) {
        if (object.geometry) object.geometry.dispose();
        eachMaterial(object.material, (material) => material.dispose());
      }

      const unbindPerformanceMode = onPerformanceModeChange(() => {
        lastRenderTime = 0;
        resize();
        requestLoop();
      });
      let menuObserver = null;
      if (typeof MutationObserver === "function") {
        menuObserver = new MutationObserver(syncMenuPause);
        menuObserver.observe(body, { attributes: true, attributeFilter: ["class"] });
      }
      window.addEventListener("resize", resize);
      window.addEventListener("pointermove", handlePointer, { passive: true });
      document.addEventListener("visibilitychange", handleVisibility);
      resize();
      applyPalette();
      renderer.render(scene, camera);
      loadBackgroundModel();
      requestLoop();

      registerPageCleanup(root, () => {
        isDisposed = true;
        window.removeEventListener("resize", resize);
        window.removeEventListener("pointermove", handlePointer);
        document.removeEventListener("visibilitychange", handleVisibility);
        if (menuObserver) menuObserver.disconnect();
        unbindPerformanceMode();
        cancelLoop();
        scene.traverse(disposeObject);
        renderer.dispose();
      });
    });
  }

  function initHero3DCanvas(root) {
    const canvas = $(".js-hero-3d-canvas", root);
    if (!canvas) return Promise.resolve(false);
    if (canvas.__smartsteam3DReadyPromise) return canvas.__smartsteam3DReadyPromise;

    const markReady = (value) => {
      if (canvas.isConnected) canvas.dataset.hero3dReady = "true";
      return value;
    };

    if (!shouldEnableHeavyBackground()) {
      canvas.dataset.renderer = "static";
      canvas.dataset.performanceMode = getCurrentPerformanceMode();
      canvas.__smartsteam3DReadyPromise = Promise.resolve(markReady(false));
      return canvas.__smartsteam3DReadyPromise;
    }

    if (canvas.dataset.fallback2d !== "true" && supportsWebGLCanvas()) {
      canvas.__smartsteam3DReadyPromise = initThreeHero3DCanvas(root, canvas).then(() => markReady(true)).catch(() => {
        canvas.dataset.fallback2d = "true";
        canvas.__smartsteam3DReadyPromise = null;
        return initHero3DCanvas(root);
      });
      return canvas.__smartsteam3DReadyPromise;
    }
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return Promise.resolve(false);
    canvas.dataset.fallback2d = "true";
    canvas.dataset.renderer = "canvas";
    canvas.__smartsteam3DReadyPromise = Promise.resolve(true);

    let rafId = 0;
    let isDisposed = false;
    let isVisible = !document.hidden;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let time = 0;

    const isProductCanvas = body.dataset.page === "products";
    const supportsBackgroundMotion = pageSupportsBackgroundMotion();
    const lowPowerDevice = (navigator.hardwareConcurrency || 8) <= 4 || window.innerWidth < 760;
    const maxNodes = !supportsBackgroundMotion
      ? 32
      : (lowPowerDevice ? (isProductCanvas ? 62 : 56) : (isProductCanvas ? 96 : 78));
    let activeNodeCount = maxNodes;
    const connectionRadius = isProductCanvas ? 265 : 228;
    const fov = isProductCanvas ? 880 : 820;
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let productSceneEl = null;
    let lastRenderTime = 0;
    const framePacer = createBackgroundFramePacer(lowPowerDevice);
    const backgroundHealthSampler = createBackgroundHealthSampler("canvas", isProductCanvas);

    function getProductSceneEl() {
      if (!isProductCanvas) return null;
      if (!productSceneEl || !productSceneEl.isConnected) {
        productSceneEl = $(".galaxy-scene", root) || $(".galaxy-scene");
      }
      return productSceneEl;
    }

    function resetNode(node, initial) {
      node.x = Math.random() * 2600 - 1300;
      node.y = Math.random() * 1160 - 580;
      node.z = initial ? Math.random() * 2300 : 2050 + Math.random() * 340;
      node.vz = -1.35 - Math.random() * (isProductCanvas ? 2.2 : 1.45);
      node.size = 0.7 + Math.random() * 2.8;
      node.phase = Math.random() * Math.PI * 2;
      node.lane = Math.random() > 0.62 ? 1 : 0;
    }

    function resize() {
      activeNodeCount = getBackgroundNodeLimit(maxNodes, isProductCanvas, lowPowerDevice);
      canvas.dataset.performanceMode = getCurrentPerformanceMode();
      dpr = Math.min(window.devicePixelRatio || 1, getBackgroundPixelRatioLimit(lowPowerDevice));
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function handlePointer(event) {
      if (reducedMotion && performanceModeState.preference === "auto") return;
      pointer.targetX = clamp((event.clientX / Math.max(w, 1) - 0.5) * 2, -1, 1);
      pointer.targetY = clamp((event.clientY / Math.max(h, 1) - 0.5) * 2, -1, 1);
    }

    function cancelLoop() {
      if (!rafId) return;
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }

    function requestLoop() {
      if (!rafId && supportsBackgroundMotion && isVisible && !isDisposed && !shouldPauseBackgroundForMenu()) {
        rafId = window.requestAnimationFrame(loop);
      }
    }

    function handleVisibility() {
      isVisible = !document.hidden;
      if (!isVisible) cancelLoop();
      else requestLoop();
    }

    function syncMenuPause() {
      lastRenderTime = 0;
      if (shouldPauseBackgroundForMenu()) cancelLoop();
      else requestLoop();
    }

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handlePointer, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);
    const unbindPerformanceMode = onPerformanceModeChange(() => {
      lastRenderTime = 0;
      resize();
      requestLoop();
    });
    let menuObserver = null;
    if (typeof MutationObserver === "function") {
      menuObserver = new MutationObserver(syncMenuPause);
      menuObserver.observe(body, { attributes: true, attributeFilter: ["class"] });
    }
    resize();

    const nodes = [];
    for (let i = 0; i < maxNodes; i++) {
      const node = {};
      resetNode(node, true);
      nodes.push(node);
    }

    function getCanvasPalette() {
      const isLightTheme = body.dataset.page === "welcome"
        ? getWelcomeTheme() === "light"
        : body.dataset.theme === "light";

      if (isLightTheme) {
        const isWelcomeCanvas = body.dataset.page === "welcome";
        return {
          theme: "light",
          opacity: isProductCanvas ? "0.78" : (isWelcomeCanvas ? "0.94" : "0.82"),
          grid: isWelcomeCanvas ? "rgba(0, 102, 160, 0.24)" : "rgba(0, 102, 160, 0.16)",
          nodeRgb: "0, 92, 145",
          nodeBoost: isWelcomeCanvas ? 1.68 : 1.42,
          linkRgb: "0, 118, 200",
          linkBoost: isWelcomeCanvas ? 1.18 : 0.96,
          fog: "rgba(248, 253, 255, 0.04)",
          glowA: isWelcomeCanvas ? "rgba(0, 118, 200, 0.3)" : "rgba(0, 118, 200, 0.22)",
          glowB: isWelcomeCanvas ? "rgba(209, 95, 36, 0.24)" : "rgba(209, 95, 36, 0.18)",
        };
      }

      return {
        theme: "dark",
        opacity: isProductCanvas ? "0.94" : "0.88",
        grid: "rgba(191, 98, 49, 0.095)",
        nodeRgb: "143, 202, 232",
        nodeBoost: 1.45,
        linkRgb: "191, 98, 49",
        linkBoost: 0.94,
        fog: "rgba(7, 10, 14, 0.16)",
        glowA: "rgba(226, 122, 66, 0.18)",
        glowB: "rgba(91, 165, 204, 0.16)",
      };
    }

    function renderNode(node) {
      const cameraPull = clamp(1 - node.z / 2400, 0.08, 1);
      const scale = fov / (fov + node.z);
      return {
        x: w / 2 + (node.x + pointer.x * 150 * cameraPull) * scale,
        y: h / 2 + (node.y + pointer.y * 105 * cameraPull) * scale,
        scale,
      };
    }

    function drawAtmosphere(palette) {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = palette.fog;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "screen";
      const glowA = ctx.createRadialGradient(
        w * (0.28 + pointer.x * 0.04),
        h * (0.22 + pointer.y * 0.03),
        0,
        w * 0.28,
        h * 0.22,
        Math.max(w, h) * 0.72
      );
      glowA.addColorStop(0, palette.glowA);
      glowA.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glowA;
      ctx.fillRect(0, 0, w, h);

      const glowB = ctx.createRadialGradient(
        w * (0.78 + pointer.x * 0.03),
        h * (0.34 + pointer.y * 0.04),
        0,
        w * 0.78,
        h * 0.34,
        Math.max(w, h) * 0.62
      );
      glowB.addColorStop(0, palette.glowB);
      glowB.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glowB;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
    }

    function drawGrid(palette) {
      ctx.save();
      ctx.translate(pointer.x * 12, pointer.y * 8);
      ctx.lineWidth = 1;
      ctx.strokeStyle = palette.grid;
      const groundY = isProductCanvas ? 440 : 510;
      const trackZOffset = (time * (isProductCanvas ? 310 : 235)) % 220;

      for (let i = -1400; i <= 1400; i += 175) {
        const p1 = renderNode({ x: i, y: groundY, z: -trackZOffset });
        const p2 = renderNode({ x: i, y: groundY, z: 2200 - trackZOffset });
        if (p1.scale > 0 && p2.scale > 0) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }

        const ph1 = renderNode({ x: -1400, y: groundY, z: i * 1.45 + trackZOffset });
        const ph2 = renderNode({ x: 1400, y: groundY, z: i * 1.45 + trackZOffset });
        if (ph1.scale > 0 && ph2.scale > 0) {
          ctx.beginPath();
          ctx.moveTo(ph1.x, ph1.y);
          ctx.lineTo(ph2.x, ph2.y);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    function drawOrbitRibbons(palette) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.lineWidth = 1.1;
      for (let i = 0; i < 3; i++) {
        const phase = time * (0.65 + i * 0.12) + i * 1.7;
        const cx = w * (0.58 + Math.sin(phase) * 0.025 + pointer.x * 0.025);
        const cy = h * (0.42 + Math.cos(phase * 0.82) * 0.018 + pointer.y * 0.025);
        const rx = Math.min(w, 980) * (0.24 + i * 0.07);
        const ry = Math.min(h, 720) * (0.08 + i * 0.035);
        ctx.strokeStyle = i === 1 ? palette.glowB : palette.glowA;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, phase * 0.22, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawFrame(advance) {
      if (isDisposed) return;

      const palette = getCanvasPalette();
      activeNodeCount = getBackgroundNodeLimit(maxNodes, isProductCanvas, lowPowerDevice);
      canvas.dataset.theme = palette.theme;
      canvas.style.opacity = palette.opacity;

      const motionProfile = getBackgroundMotionProfile(isProductCanvas, getProductSceneEl(), lowPowerDevice);

      if (advance && motionProfile.active) {
        time += 0.012 * motionProfile.speed;
        const targetX = motionProfile.pointer ? pointer.targetX : 0;
        const targetY = motionProfile.pointer ? pointer.targetY : 0;
        const pointerEase = motionProfile.pointer ? 0.055 : 0.035;
        pointer.x += (targetX - pointer.x) * pointerEase;
        pointer.y += (targetY - pointer.y) * pointerEase;
      }

      drawAtmosphere(palette);
      drawGrid(palette);
      drawOrbitRibbons(palette);

      for (let i = 0; i < activeNodeCount; i++) {
        const node = nodes[i];
        if (advance && motionProfile.active) {
          node.z += node.vz * motionProfile.speed;
          node.x += Math.sin(time + node.phase) * 0.12 * motionProfile.speed * (node.lane ? 1 : 0.42);
          node.y += Math.cos(time * 0.8 + node.phase) * 0.08 * motionProfile.speed * (node.lane ? 1 : 0.35);
        }

        if (node.z < 10) {
          resetNode(node, false);
        }

        const proj = renderNode(node);
        if (proj.scale > 0) {
          const alpha = clamp(proj.scale * palette.nodeBoost, 0.08, 0.92);
          ctx.fillStyle = `rgba(${palette.nodeRgb}, ${alpha})`;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, Math.max(0.55, node.size * proj.scale), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.lineWidth = 1.5;
      const radiusSq = connectionRadius * connectionRadius;
      for (let i = 0; i < activeNodeCount; i++) {
        for (let j = i + 1; j < activeNodeCount; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dz = n1.z - n2.z;
          const distSq = dx * dx + dy * dy + dz * dz;

          if (distSq < radiusSq) {
            const dist = Math.sqrt(distSq);
            const p1 = renderNode(n1);
            const p2 = renderNode(n2);
            if (p1.scale > 0 && p2.scale > 0) {
              const linkAlpha = clamp((1 - dist / connectionRadius) * p1.scale * palette.linkBoost, 0, 0.72);
              ctx.strokeStyle = `rgba(${palette.linkRgb}, ${linkAlpha})`;
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();

              if (motionProfile.active && (i + j) % 19 === 0) {
                const packet = (Math.sin(time * 2.6 + i * 0.41 + j * 0.13) + 1) / 2;
                ctx.fillStyle = `rgba(${palette.linkRgb}, ${Math.min(linkAlpha + 0.22, 0.95)})`;
                ctx.beginPath();
                ctx.arc(p1.x + (p2.x - p1.x) * packet, p1.y + (p2.y - p1.y) * packet, Math.max(0.8, p1.scale * 2.2), 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
        }
      }
    }

    function loop() {
      rafId = 0;
      if (isDisposed || !isVisible || shouldPauseBackgroundForMenu()) return;

      const motionProfile = getBackgroundMotionProfile(isProductCanvas, getProductSceneEl(), lowPowerDevice);
      const now = performance.now();
      const targetInterval = motionProfile.interval + framePacer.intervalBoost;
      if (lastRenderTime && now - lastRenderTime < targetInterval) {
        requestLoop();
        return;
      }
      const frameDelta = lastRenderTime ? now - lastRenderTime : targetInterval;
      lastRenderTime = now;
      framePacer.observe(frameDelta, targetInterval);
      backgroundHealthSampler.observe(now, targetInterval);
      drawFrame(true);
      requestLoop();
    }

    registerPageCleanup(root, () => {
      isDisposed = true;
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointer);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (menuObserver) menuObserver.disconnect();
      unbindPerformanceMode();
      cancelLoop();
    });

    drawFrame(false);
    markReady(true);
    requestLoop();

    return canvas.__smartsteam3DReadyPromise;
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
    applyPerformanceModeState("boot");
    ensureShell();
    initWelcomeTheme();
    initGlobalShell();
    initPageTransition();
    initMenuOverlay();

    await loadPageData();

    renderCurrentPage();
    hydrateRenderedPage();
    initPreloader();
  }


  startApp();
})();
