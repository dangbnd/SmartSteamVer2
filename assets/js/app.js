(function () {
  const data = window.STEM_DATA;
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
    experienceStarted: false,
    transitionPending: sessionStorage.getItem("stemora_transition_pending") === "1",
  };
  const GROUPS = ["age", "theme", "format", "occasion", "difficulty"];

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

  function slugFromPath() {
    const segments = currentPath.split("/").filter(Boolean);
    return segments[segments.length - 1] || "";
  }

  function getLocalePath(key, slug) {
    const prefix = `/${locale}`;
    if (key === "welcome") return `${prefix}/welcome/`;
    if (key === "products") return `${prefix}/products/`;
    if (key === "projects") return `${prefix}/projects/`;
    if (key === "contact") return `${prefix}/contact/`;
    if (key === "policy") return `${prefix}/policy/`;
    if (key === "product-detail") return `${prefix}/product/${slug || ""}/`;
    if (key === "project-detail") return `${prefix}/project/${slug || ""}/`;
    if (key === "policy-detail") return `${prefix}/policy/${slug || ""}/`;
    return `${prefix}/welcome/`;
  }

  function getAlternateLocalePath(targetLocale) {
    const nextPath = currentPath.replace(/^\/(vi|en)/, `/${targetLocale}`);
    return `${nextPath || `/${targetLocale}/welcome/`}${window.location.search}${window.location.hash}`;
  }

  function getText(entry, viKey, enKey) {
    return locale === "vi" ? entry[viKey] : entry[enKey];
  }

  function getMediaAlt(media) {
    if (!media || !media.alt) return "";
    return media.alt[locale] || media.alt.en || media.alt.vi || "";
  }

  function updateMeta(title, description) {
    if (title) document.title = title;
    const descriptionTag = $('meta[name="description"]');
    if (descriptionTag && description) descriptionTag.setAttribute("content", description);
  }

  function resolveAssetSource(src) {
    if (!src) return "";
    return `${src}${ASSET_VERSION}`;
  }

  function renderMedia(media, className, options) {
    const config = options || {};
    const tier = config.tier || media.loadingTier || (config.priority ? "critical" : "deferred");
    const inlineSource = tier === "critical";
    const loading = inlineSource ? config.loading || "eager" : "lazy";
    const fetchPriority = tier === "critical" ? ' fetchpriority="high"' : "";
    const decoding = tier === "critical" ? "sync" : "async";
    const alt = config.alt !== undefined ? config.alt : getMediaAlt(media);
    const fit = media.fit || "cover";
    const role = media.role || "editorial";
    const focalX = media.focalX ?? 50;
    const focalY = media.focalY ?? 50;
    const safeText = media.preserveTextSafeArea ? "true" : "false";
    const wrapperClass = ["media-frame", className || "", config.bare ? "media-frame--bare" : ""]
      .filter(Boolean)
      .join(" ");
    const stage = config.stage ? ` data-stage="${config.stage}"` : "";
    const resolvedSource = resolveAssetSource(media.src);
    const sourceAttributes = inlineSource ? `src="${resolvedSource}"` : `src="${EMPTY_MEDIA}" data-src="${resolvedSource}"`;

    return `
      <figure
        class="${wrapperClass}"
        data-media-tier="${tier}"
        data-fit="${fit}"
        data-role="${role}"
        data-text-safe="${safeText}"${stage}
        style="--media-ratio:${media.ratio || "4 / 5"};--media-position:${focalX}% ${focalY}%;--media-fit:${fit};"
      >
        <img
          class="stable-media"
          ${sourceAttributes}
          alt="${alt}"
          width="${media.width || 1200}"
          height="${media.height || 1200}"
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

  function sortedProjects() {
    return [...data.projects].sort((a, b) => a.featuredOrder - b.featuredOrder);
  }

  function markMediaFrameLoaded(image) {
    if (!image) return;
    image.dataset.mediaLoaded = "true";
    const frame = image.closest(".media-frame");
    if (frame) frame.classList.add("is-loaded");
  }

  function bindStableMedia(root) {
    $$("img", root || document).forEach((image) => {
      if (!image.closest(".media-frame")) return;
      if (image.dataset.mediaBound === "true") return;
      if (image.dataset.src && image.getAttribute("src") !== image.dataset.src) return;
      image.dataset.mediaBound = "true";
      const finalize = () => markMediaFrameLoaded(image);
      if (image.complete && image.naturalWidth) {
        finalize();
        return;
      }
      image.addEventListener("load", finalize, { once: true });
      image.addEventListener("error", finalize, { once: true });
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

      if (image.complete && image.naturalWidth) {
        finish();
        return;
      }

      image.addEventListener("load", finish, { once: true });
      image.addEventListener(
        "error",
        () => {
          markMediaFrameLoaded(image);
          resolve(image);
        },
        { once: true }
      );
    });
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

    const navItems = [
      { key: "welcome", active: page === "welcome" },
      { key: "products", active: page === "products" || page === "product-detail" },
      { key: "projects", active: page === "projects" || page === "project-detail" },
      { key: "contact", active: page === "contact" },
    ];

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

    footer.innerHTML = `
      <div class="container">
        <div class="footer-shell">
          <div class="footer-shell__intro">
            <p class="footer-shell__lead">${strings.footer.lead}</p>
            <h2>${strings.footer.title}</h2>
            <p>${strings.footer.invitation}</p>
            <a class="footer-shell__talk" href="${getLocalePath("contact")}" data-transition>${strings.actions.getConsultation}</a>
          </div>
          <div class="footer-shell__block">
            <span class="footer-shell__label">${strings.footer.contactLabel}</span>
            <a href="mailto:${data.siteMeta.contact.email}">${data.siteMeta.contact.email}</a>
            <a href="tel:${data.siteMeta.contact.phone.replace(/\s+/g, "")}">${data.siteMeta.contact.phone}</a>
            <span>${data.siteMeta.contact.address[locale]}</span>
            <span>${data.siteMeta.contact.hours[locale]}</span>
          </div>
          <div class="footer-shell__block">
            <span class="footer-shell__label">${strings.footer.quickLinks}</span>
            ${footerLinks.map((key) => `<a href="${getLocalePath(key)}" data-transition>${strings.nav[key]}</a>`).join("")}
          </div>
          <div class="footer-shell__block">
            <span class="footer-shell__label">${strings.footer.connect}</span>
            <div class="footer-shell__socials">
              ${data.siteMeta.socials.map((item) => `<a href="${item.href}">${item.label}</a>`).join("")}
            </div>
            <p>${data.siteMeta.footerNote[locale]}</p>
          </div>
        </div>
        <div class="footer-shell__bottom">
          <span>${data.siteMeta.socialHandle}</span>
          <span>${data.siteMeta.copyright}</span>
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
      const item = data.projects.find((entry) => entry.slug === slugFromPath());
      if (item) {
        sources.push(item.hero.src);
        if (item.gallery[0]) sources.push(item.gallery[0].src);
      }
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

  function renderCurrentPage() {
    document.body.classList.remove('page-welcome');
    if (page === "welcome") return renderWelcomePage();
    if (page === "products") return renderProductsPage();
    if (page === "product-detail") return renderProductDetailPage();
    if (page === "projects") return renderProjectsPage();
    if (page === "project-detail") return renderProjectDetailPage();
    if (page === "contact") return renderContactPage();
    if (page === "policy" || page === "policy-detail") return renderPolicyPages();
    return null;
  }

  function renderWelcomePage() {
    const root = $(".js-page-root");
    if (!root) return;
    document.body.classList.add('page-welcome');
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
        <canvas class="hero-3d-canvas js-hero-3d-canvas" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: -1; pointer-events: none; opacity: 0.85;"></canvas>
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
    updateMeta(strings.pageMeta.products.title, strings.pageMeta.products.description);

    root.innerHTML = `
      <section class="page-intro page-intro--catalogue">
        <div class="container page-intro__layout">
          <div class="page-intro__copy" data-stage="copy">
            <p class="scene-kicker">${strings.productsPage.eyebrow}</p>
            <h1 class="editorial-title">${strings.productsPage.title}</h1>
            <p class="scene-body">${strings.productsPage.intro}</p>
          </div>
          <div class="page-intro__visual" data-stage="hero">
            ${renderMedia(data.siteMeta.pageAssets.products, "", { priority: true, stage: "hero" })}
          </div>
        </div>
      </section>
      <section class="catalogue-shell js-products-shell">
        <div class="filter-drawer-backdrop js-filter-close"></div>
        <div class="container catalogue-shell__inner">
          <aside class="taxonomy-panel js-taxonomy-panel">
            <div class="taxonomy-panel__top">
              <div>
                <p class="scene-kicker">${strings.productsPage.filterTitle}</p>
                <p class="taxonomy-panel__intro">${strings.productsPage.filterIntro}</p>
              </div>
              <button class="taxonomy-panel__close js-filter-close" type="button">${strings.actions.closeFilters}</button>
            </div>
            <div class="js-filter-groups"></div>
            <button class="taxonomy-panel__clear js-clear-filters" type="button">${strings.actions.clearAll}</button>
          </aside>
          <div class="catalogue-results">
            <div class="catalogue-results__head">
              <button class="filter-drawer-trigger js-filter-open" type="button">${strings.actions.openFilters}</button>
              <div class="catalogue-results__count">
                <span>${strings.productsPage.countLabel}</span>
                <strong class="js-result-count">0</strong>
              </div>
            </div>
            <div class="selected-filters">
              <span>${strings.productsPage.selectedLabel}</span>
              <div class="selected-filters__list js-selected-filters"></div>
            </div>
            <div class="catalogue-grid js-product-grid"></div>
          </div>
        </div>
      </section>
      <section class="page-cta page-cta--catalogue">
        <div class="container page-cta__panel" data-motion="scene-enter">
          <div>
            <p class="scene-kicker">${strings.productsPage.ctaEyebrow}</p>
            <h2>${strings.productsPage.ctaTitle}</h2>
            <p>${strings.productsPage.ctaCopy}</p>
          </div>
          <div class="page-cta__actions" data-motion="cta-soft">
            <a class="button button--primary" href="${getLocalePath("contact")}" data-transition>${strings.actions.requestFit}</a>
            <a class="button button--ghost" href="${getLocalePath("projects")}" data-transition>${strings.actions.browseProjects}</a>
          </div>
        </div>
      </section>
    `;

    initProductsFilters(root);
  }

  function initProductsFilters(root) {
    const filterWrap = $(".js-filter-groups", root);
    const countNode = $(".js-result-count", root);
    const selectedNode = $(".js-selected-filters", root);
    const grid = $(".js-product-grid", root);
    const params = new URLSearchParams(window.location.search);
    const filters = {};

    GROUPS.forEach((group) => {
      filters[group] = params.get(group) || "";
    });

    const syncUrl = () => {
      const next = new URLSearchParams();
      GROUPS.forEach((group) => {
        if (filters[group]) next.set(group, filters[group]);
      });
      const query = next.toString();
      history.replaceState({}, "", query ? `${window.location.pathname}?${query}` : window.location.pathname);
    };

    const renderFilters = () => {
      filterWrap.innerHTML = GROUPS.map((group) => {
        const options = data.taxonomy.order[group];
        return `
          <section class="taxonomy-group">
            <h3>${getGroupLabel(group)}</h3>
            <div class="taxonomy-group__options">
              <button class="taxonomy-chip ${filters[group] ? "" : "is-active"}" type="button" data-group="${group}" data-value="">${strings.actions.all}</button>
              ${options
            .map(
              (value) => `
                    <button class="taxonomy-chip ${filters[group] === value ? "is-active" : ""}" type="button" data-group="${group}" data-value="${value}">
                      ${getTaxonomyLabel(group, value)}
                    </button>
                  `
            )
            .join("")}
            </div>
          </section>
        `;
      }).join("");

      $$("[data-group]", filterWrap).forEach((button) => {
        button.addEventListener("click", () => {
          const group = button.dataset.group;
          const value = button.dataset.value;
          filters[group] = filters[group] === value ? "" : value;
          syncUrl();
          update();
        });
      });
    };

    const getPattern = (index) => ["feature", "tall", "standard", "wide", "standard", "tall"][index % 6];

    const renderResults = () => {
      const items = sortedProducts().filter((item) =>
        GROUPS.every((group) => !filters[group] || item[group].includes(filters[group]))
      );

      countNode.textContent = `${items.length} ${strings.actions.results}`;
      const activeFilters = GROUPS.filter((group) => filters[group]);

      selectedNode.innerHTML = activeFilters.length
        ? activeFilters
          .map(
            (group) => `
                <button class="selected-pill" type="button" data-remove="${group}">
                  <span>${getGroupLabel(group)}</span>
                  <strong>${getTaxonomyLabel(group, filters[group])}</strong>
                </button>
              `
          )
          .join("")
        : `<span class="selected-pill selected-pill--empty">${strings.actions.all}</span>`;

      $$("[data-remove]", selectedNode).forEach((button) => {
        button.addEventListener("click", () => {
          filters[button.dataset.remove] = "";
          syncUrl();
          update();
        });
      });

      if (!items.length) {
        grid.innerHTML = `
          <div class="empty-state-editorial">
            <div class="empty-state-editorial__visual">${renderMedia(data.siteMeta.pageAssets.policy, "", { loading: "lazy", alt: "" })}</div>
            <div class="empty-state-editorial__copy">
              <h3>${strings.productsPage.emptyTitle}</h3>
              <p>${strings.productsPage.emptyCopy}</p>
              <div class="scene-actions">
                <button class="button button--primary js-clear-filters" type="button">${strings.actions.clearAll}</button>
                <a class="button button--ghost" href="${getLocalePath("contact")}" data-transition>${strings.actions.getConsultation}</a>
              </div>
            </div>
          </div>
        `;
      } else {
        grid.innerHTML = items
          .map((item, index) => {
            const labels = [
              { group: "age", value: item.age[0] },
              { group: "format", value: item.format[0] },
              { group: "theme", value: item.theme[0] },
            ];

            return `
              <article class="catalogue-item catalogue-item--${getPattern(index)}" data-motion="scene-enter">
                <a class="catalogue-item__media" href="${getLocalePath("product-detail", item.slug)}" data-transition>
                  ${renderMedia(item.cover, "", { tier: index < 2 ? "near" : "deferred", loading: index < 2 ? "eager" : "lazy" })}
                </a>
                <div class="catalogue-item__body">
                  <div class="catalogue-item__meta">
                    ${labels.map((entry) => `<span>${getTaxonomyLabel(entry.group, entry.value)}</span>`).join("")}
                  </div>
                  <h3><a href="${getLocalePath("product-detail", item.slug)}" data-transition>${getText(item, "titleVi", "titleEn")}</a></h3>
                  <p class="catalogue-item__tagline">${getText(item, "taglineVi", "taglineEn")}</p>
                  <p class="catalogue-item__summary">${getText(item, "summaryVi", "summaryEn")}</p>
                  <div class="catalogue-item__footer">
                    <strong>${locale === "vi" ? item.priceVi : item.priceEn}</strong>
                    <a href="${getLocalePath("product-detail", item.slug)}" data-transition>${strings.actions.viewDetail}</a>
                  </div>
                </div>
              </article>
            `;
          })
          .join("");
      }

      $$(".js-clear-filters", root).forEach((button) => {
        button.addEventListener("click", () => {
          GROUPS.forEach((group) => {
            filters[group] = "";
          });
          syncUrl();
          update();
        });
      });

      refreshInteractiveLayers(grid);
    };

    const closeDrawer = () => {
      body.classList.remove("filters-open");
      state.filterDrawerOpen = false;
    };

    const openDrawer = () => {
      body.classList.add("filters-open");
      state.filterDrawerOpen = true;
    };

    const update = () => {
      renderFilters();
      renderResults();
    };

    $(".js-filter-open", root).addEventListener("click", openDrawer);
    $$(".js-filter-close", root).forEach((button) => button.addEventListener("click", closeDrawer));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.filterDrawerOpen) closeDrawer();
    });

    update();
  }

  function renderProductDetailPage() {
    const root = $(".js-page-root");
    if (!root) return;
    const item = data.products.find((entry) => entry.slug === slugFromPath());
    if (!item) return renderMissing(root, getLocalePath("products"));
    updateMeta(`${getText(item, "titleVi", "titleEn")} | STEMORA`, getText(item, "summaryVi", "summaryEn"));

    const related = getRelatedProducts(item).slice(0, 3);
    root.innerHTML = `
      <section class="detail-hero detail-hero--product js-detail-stage">
        <div class="container detail-hero__grid">
          <div class="detail-hero__media" data-stage="hero">
            ${renderMedia(item.hero, "", { priority: true, stage: "hero" })}
          </div>
          <aside class="detail-hero__panel" data-stage="copy">
            <p class="scene-kicker">${strings.productDetail.heroEyebrow}</p>
            <h1>${getText(item, "titleVi", "titleEn")}</h1>
            <p class="detail-hero__summary">${getText(item, "taglineVi", "taglineEn")}</p>
            <p class="detail-hero__price">${locale === "vi" ? item.priceVi : item.priceEn}</p>
            <div class="detail-actions">
              <a class="button button--primary" href="${getLocalePath("contact")}" data-transition>${strings.productDetail.primaryCta}</a>
              <a class="button button--ghost" href="${getLocalePath("products")}" data-transition>${strings.productDetail.secondaryCta}</a>
            </div>
            <div class="detail-share">
              <button class="share-button js-copy-link" type="button">${strings.actions.copyLink}</button>
              <span class="share-feedback js-share-feedback" aria-live="polite"></span>
            </div>
            <div class="quick-facts">
              <h2>${strings.productDetail.quickFacts}</h2>
              <dl>
                ${item.facts
        .map(
          (fact) => `
                      <div>
                        <dt>${locale === "vi" ? fact.labelVi : fact.labelEn}</dt>
                        <dd>${locale === "vi" ? fact.valueVi : fact.valueEn}</dd>
                      </div>
                    `
        )
        .join("")}
                <div><dt>${getGroupLabel("age")}</dt><dd>${item.age.map((value) => getTaxonomyLabel("age", value)).join(", ")}</dd></div>
                <div><dt>${getGroupLabel("theme")}</dt><dd>${item.theme.map((value) => getTaxonomyLabel("theme", value)).join(", ")}</dd></div>
                <div><dt>${getGroupLabel("format")}</dt><dd>${item.format.map((value) => getTaxonomyLabel("format", value)).join(", ")}</dd></div>
                <div><dt>${getGroupLabel("difficulty")}</dt><dd>${item.difficulty.map((value) => getTaxonomyLabel("difficulty", value)).join(", ")}</dd></div>
              </dl>
            </div>
          </aside>
        </div>
      </section>
      <section class="detail-narrative">
        <div class="container detail-narrative__grid">
          <div class="detail-narrative__copy">
            <p class="scene-kicker">${strings.productDetail.narrativeLabel}</p>
            <p class="detail-narrative__lead">${getText(item, "descriptionVi", "descriptionEn")}</p>
            ${item.detailSections
        .map(
          (section) => `
                  <article class="detail-section" data-motion="scene-enter">
                    <h2>${getText(section, "headingVi", "headingEn")}</h2>
                    <p>${getText(section, "bodyVi", "bodyEn")}</p>
                  </article>
                `
        )
        .join("")}
          </div>
          <blockquote class="detail-quote" data-motion="scene-enter">
            <p>${locale === "vi" ? item.highlightQuote.textVi : item.highlightQuote.textEn}</p>
            <footer>${locale === "vi" ? item.highlightQuote.authorVi : item.highlightQuote.authorEn}</footer>
          </blockquote>
        </div>
      </section>
      <section class="detail-media-strip">
        <div class="container">
          <div class="detail-media-strip__header">
            <p class="scene-kicker">${strings.productDetail.galleryLabel}</p>
            <h2>${getText(item, "titleVi", "titleEn")}</h2>
          </div>
          <div class="detail-media-strip__grid">
            ${item.gallery
        .map(
          (mediaItem, index) => `
                  <div class="detail-media-strip__item detail-media-strip__item--${index + 1}" data-motion="media-reveal">
                    ${renderMedia(mediaItem, "", { tier: index === 0 ? "near" : "deferred" })}
                  </div>
                `
        )
        .join("")}
          </div>
        </div>
      </section>
      <section class="detail-outcomes">
        <div class="container detail-outcomes__grid">
          <div>
            <p class="scene-kicker">${strings.productDetail.outcomesLabel}</p>
            <h2>${getText(item, "titleVi", "titleEn")}</h2>
          </div>
          <div class="outcome-list" data-motion="stagger-group">
            ${(locale === "vi" ? item.outcomesVi : item.outcomesEn)
        .map(
          (entry) => `
                  <article class="outcome-card">
                    <span></span>
                    <p>${entry}</p>
                  </article>
                `
        )
        .join("")}
          </div>
        </div>
      </section>
      <section class="related-block">
        <div class="container">
          <div class="related-block__header">
            <p class="scene-kicker">${strings.productDetail.relatedLabel}</p>
            <h2>${strings.productDetail.relatedLabel}</h2>
          </div>
          <div class="related-grid">
            ${related
        .map(
          (entry) => `
                  <article class="related-card" data-motion="scene-enter">
                    <a href="${getLocalePath("product-detail", entry.slug)}" data-transition>${renderMedia(entry.cover, "", { tier: "deferred" })}</a>
                    <h3><a href="${getLocalePath("product-detail", entry.slug)}" data-transition>${getText(entry, "titleVi", "titleEn")}</a></h3>
                    <p>${getText(entry, "taglineVi", "taglineEn")}</p>
                  </article>
                `
        )
        .join("")}
          </div>
        </div>
      </section>
    `;

    initCopyLink(root, strings.productDetail.copyLinkSuccess);
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

  function renderProjectsPage() {
    const root = $(".js-page-root");
    if (!root) return;
    const items = sortedProjects();
    updateMeta(strings.pageMeta.projects.title, strings.pageMeta.projects.description);

    root.innerHTML = `
      <section class="page-intro page-intro--archive">
        <div class="container page-intro__layout">
          <div class="page-intro__copy" data-stage="copy">
            <p class="scene-kicker">${strings.projectsPage.eyebrow}</p>
            <h1 class="editorial-title">${strings.projectsPage.title}</h1>
            <p class="scene-body">${strings.projectsPage.intro}</p>
          </div>
          <div class="page-intro__visual" data-stage="hero">
            ${renderMedia(data.siteMeta.pageAssets.projects, "", { priority: true, stage: "hero" })}
          </div>
        </div>
      </section>
      <section class="archive-stream">
        <div class="container archive-stream__list">
          ${items
        .map(
          (item, index) => `
                <article class="archive-entry archive-entry--${index % 2 === 0 ? "media-left" : "media-right"}" data-motion="scene-enter">
                  ${index % 2 === 0
              ? `
                        <a class="archive-entry__media" href="${getLocalePath("project-detail", item.slug)}" data-transition>
                          ${renderMedia(item.cover, "", { tier: index < 2 ? "near" : "deferred", loading: index === 0 ? "eager" : "lazy" })}
                        </a>
                        <div class="archive-entry__copy">
                          <div class="archive-entry__meta">
                            <span>${item.season}</span>
                            <span>${item.type}</span>
                            <span>${locale === "vi" ? item.locationVi : item.locationEn}</span>
                          </div>
                          <h2><a href="${getLocalePath("project-detail", item.slug)}" data-transition>${getText(item, "titleVi", "titleEn")}</a></h2>
                          <p class="archive-entry__tagline">${getText(item, "taglineVi", "taglineEn")}</p>
                          <p>${getText(item, "summaryVi", "summaryEn")}</p>
                          <a class="archive-entry__link" href="${getLocalePath("project-detail", item.slug)}" data-transition>${strings.actions.viewCaseStudy}</a>
                        </div>
                      `
              : `
                        <div class="archive-entry__copy">
                          <div class="archive-entry__meta">
                            <span>${item.season}</span>
                            <span>${item.type}</span>
                            <span>${locale === "vi" ? item.locationVi : item.locationEn}</span>
                          </div>
                          <h2><a href="${getLocalePath("project-detail", item.slug)}" data-transition>${getText(item, "titleVi", "titleEn")}</a></h2>
                          <p class="archive-entry__tagline">${getText(item, "taglineVi", "taglineEn")}</p>
                          <p>${getText(item, "summaryVi", "summaryEn")}</p>
                          <a class="archive-entry__link" href="${getLocalePath("project-detail", item.slug)}" data-transition>${strings.actions.viewCaseStudy}</a>
                        </div>
                        <a class="archive-entry__media" href="${getLocalePath("project-detail", item.slug)}" data-transition>
                          ${renderMedia(item.cover, "", { tier: index < 2 ? "near" : "deferred", loading: index === 0 ? "eager" : "lazy" })}
                        </a>
                      `
            }
                </article>
              `
        )
        .join("")}
        </div>
      </section>
      <section class="page-cta page-cta--archive">
        <div class="container page-cta__panel" data-motion="scene-enter">
          <div>
            <p class="scene-kicker">${strings.projectsPage.ctaEyebrow}</p>
            <h2>${strings.projectsPage.ctaTitle}</h2>
            <p>${strings.projectsPage.ctaCopy}</p>
          </div>
          <div class="page-cta__actions" data-motion="cta-soft">
            <a class="button button--primary" href="${getLocalePath("contact")}" data-transition>${strings.actions.getConsultation}</a>
            <a class="button button--ghost" href="${getLocalePath("products")}" data-transition>${strings.actions.browsePrograms}</a>
          </div>
        </div>
      </section>
    `;
  }

  function renderProjectDetailPage() {
    const root = $(".js-page-root");
    if (!root) return;
    const item = data.projects.find((entry) => entry.slug === slugFromPath());
    if (!item) return renderMissing(root, getLocalePath("projects"));

    updateMeta(`${getText(item, "titleVi", "titleEn")} | STEMORA`, getText(item, "summaryVi", "summaryEn"));
    const related = sortedProjects().filter((entry) => entry.slug !== item.slug).slice(0, 3);

    root.innerHTML = `
      <section class="detail-hero detail-hero--project js-detail-stage">
        <div class="container detail-hero__project">
          <div class="detail-hero__project-media" data-stage="hero">
            ${renderMedia(item.hero, "", { priority: true, stage: "hero" })}
          </div>
          <div class="detail-hero__project-copy" data-stage="copy">
            <p class="scene-kicker">${strings.projectDetail.heroEyebrow}</p>
            <h1>${getText(item, "titleVi", "titleEn")}</h1>
            <p class="detail-hero__summary">${getText(item, "taglineVi", "taglineEn")}</p>
            <p class="detail-project__intro">${getText(item, "summaryVi", "summaryEn")}</p>
            <div class="detail-project__meta">
              <span>${item.year}</span>
              <span>${item.type}</span>
              <span>${item.season}</span>
              <span>${locale === "vi" ? item.locationVi : item.locationEn}</span>
              <span>${locale === "vi" ? item.audienceVi : item.audienceEn}</span>
            </div>
          </div>
        </div>
      </section>
      <section class="project-intro">
        <div class="container project-intro__grid">
          <div>
            <p class="scene-kicker">${strings.projectDetail.introLabel}</p>
            <p class="project-intro__lead">${getText(item, "introVi", "introEn")}</p>
          </div>
          <blockquote class="detail-quote">
            <p>${locale === "vi" ? item.quote.textVi : item.quote.textEn}</p>
            <footer>${locale === "vi" ? item.quote.authorVi : item.quote.authorEn}</footer>
          </blockquote>
        </div>
      </section>
      <section class="project-sections">
        <div class="container">
          <div class="scene-header">
            <p class="scene-kicker">${strings.projectDetail.sectionsLabel}</p>
            <h2>${getText(item, "titleVi", "titleEn")}</h2>
          </div>
          ${item.sections
        .map(
          (section, index) => `
                <article class="project-section project-section--${section.layout}" data-motion="scene-enter">
                  <div class="project-section__media">
                    ${renderMedia(section.media, "", { tier: index === 0 ? "near" : "deferred" })}
                    <span class="project-section__caption">${getText(section, "captionVi", "captionEn")}</span>
                  </div>
                  <div class="project-section__copy">
                    <h3>${getText(section, "titleVi", "titleEn")}</h3>
                    <p>${getText(section, "bodyVi", "bodyEn")}</p>
                  </div>
                </article>
              `
        )
        .join("")}
        </div>
      </section>
      <section class="project-stats">
        <div class="container">
          <div class="scene-header">
            <p class="scene-kicker">${strings.projectDetail.outcomesLabel}</p>
            <h2>${strings.projectDetail.outcomesLabel}</h2>
          </div>
          <div class="project-stats__grid" data-motion="stagger-group">
            ${item.stats
        .map(
          (stat) => `
                  <article class="project-stat">
                    <strong>${stat.value}</strong>
                    <span>${locale === "vi" ? stat.labelVi : stat.labelEn}</span>
                  </article>
                `
        )
        .join("")}
          </div>
        </div>
      </section>
      <section class="project-gallery">
        <div class="container">
          <div class="scene-header">
            <p class="scene-kicker">${strings.projectDetail.galleryLabel}</p>
            <h2>${strings.projectDetail.galleryLabel}</h2>
          </div>
          <div class="project-gallery__grid">
            ${item.gallery
        .map(
          (mediaItem, index) => `
                  <div class="project-gallery__item project-gallery__item--${index + 1}" data-motion="collage-reveal">
                    ${renderMedia(mediaItem, "", { tier: index === 0 ? "near" : "deferred" })}
                  </div>
                `
        )
        .join("")}
          </div>
        </div>
      </section>
      <section class="related-block">
        <div class="container">
          <div class="related-block__header">
            <p class="scene-kicker">${strings.projectDetail.relatedLabel}</p>
            <h2>${strings.projectDetail.relatedLabel}</h2>
          </div>
          <div class="related-grid">
            ${related
        .map(
          (entry) => `
                  <article class="related-card" data-motion="scene-enter">
                    <a href="${getLocalePath("project-detail", entry.slug)}" data-transition>${renderMedia(entry.cover, "", { tier: "deferred" })}</a>
                    <h3><a href="${getLocalePath("project-detail", entry.slug)}" data-transition>${getText(entry, "titleVi", "titleEn")}</a></h3>
                    <p>${getText(entry, "taglineVi", "taglineEn")}</p>
                  </article>
                `
        )
        .join("")}
          </div>
          <div class="related-block__cta">
            <a class="button button--primary" href="${getLocalePath("contact")}" data-transition>${strings.projectDetail.primaryCta}</a>
          </div>
        </div>
      </section>
    `;

  }

  function renderContactPage() {
    const root = $(".js-page-root");
    if (!root) return;
    updateMeta(strings.pageMeta.contact.title, strings.pageMeta.contact.description);

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
                <a href="mailto:${data.siteMeta.contact.email}">${data.siteMeta.contact.email}</a>
                <a href="tel:${data.siteMeta.contact.phone.replace(/\s+/g, "")}">${data.siteMeta.contact.phone}</a>
                <span>${data.siteMeta.contact.address[locale]}</span>
                <span>${data.siteMeta.contact.hours[locale]}</span>
              </div>
            </article>
            <article class="contact-panel" data-motion="scene-enter">
              <p class="scene-kicker">${strings.contactPage.socialTitle}</p>
              <p>${strings.contactPage.socialIntro}</p>
              <div class="contact-socials">
                ${data.siteMeta.socials.map((item) => `<a href="${item.href}">${item.label}</a>`).join("")}
              </div>
            </article>
            <article class="contact-panel contact-panel--map" data-motion="scene-enter">
              <p class="scene-kicker">${strings.contactPage.mapTitle}</p>
              <p>${strings.contactPage.mapCopy}</p>
              <a class="button button--ghost" href="${data.siteMeta.contact.mapUrl}" target="_blank" rel="noreferrer">${strings.actions.viewMap}</a>
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
    function renderNode(node) {
      const scale = fov / (fov + node.z);
      return {
        x: w / 2 + node.x * scale,
        y: h / 2 + node.y * scale,
        scale: scale
      };
    }

    function loop() {
      ctx.clearRect(0, 0, w, h);
      time += 0.01;

      ctx.lineWidth = 1.0;
      for (let i = -1200; i <= 1200; i += 200) {
        let trackZOffset = (time * 250) % 200;
        const p1 = renderNode({ x: i, y: 500, z: -trackZOffset });
        const p2 = renderNode({ x: i, y: 500, z: 2000 - trackZOffset });

        ctx.strokeStyle = 'rgba(191, 98, 49, 0.08)';
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
          ctx.fillStyle = `rgba(137, 168, 184, ${proj.scale * 1.5})`;
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
              ctx.strokeStyle = `rgba(191, 98, 49, ${(1 - dist / connectionRadius) * p1.scale * 0.9})`;
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        }
      }
      requestAnimationFrame(loop);
    }
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

  ensureShell();
  initGlobalShell();
  renderCurrentPage();
  bindStableMedia(document);
  initPageTransition();
  initMenuOverlay();
  initPreloader();
})();
