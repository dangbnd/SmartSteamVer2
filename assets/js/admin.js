(function () {
  const root = document.getElementById("admin-root");
  if (!root) return;

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
  const ENDPOINTS = {
    counts: "/migration-full-input/counts.json",
    products: "/migration-full-input/products.json",
    projects: "/migration-full-input/projects.json",
    tutorials: "/migration-full-input/tutorials.json",
    tutorialCategories: "/migration-full-input/tutorial_categories.json",
    news: "/migration-full-input/news.json",
    newsCategories: "/migration-full-input/news_categories.json",
    orders: "/migration-full-input/orders.json",
    users: "/migration-full-input/users.json",
    seoPages: "/migration-full-input/seo_pages.json",
    seoKeywords: "/migration-full-input/seo_keywords.json",
    seoBacklinks: "/migration-full-input/seo_backlinks.json",
  };
  const STORAGE = {
    users: "stemora-admin:users",
    session: "stemora-admin:session",
    googleClient: "stemora-admin:google-client-id",
    view: "stemora-admin:view",
    drafts: "stemora-admin:drafts",
  };
  const DEFAULT_IMAGE = "/assets/img/product-science.svg";
  const TINYMCE_CDN = "/assets/vendor/tinymce/tinymce.min.js";
  const LOCALE = "vi";
  let tinyMceLoader = null;

  const NAV_ITEMS = [
    { id: "dashboard", label: "Tổng quan", icon: "dashboard" },
    { id: "welcome", label: "Welcome", icon: "content" },
    { id: "products", label: "Product", icon: "package" },
    { id: "projects", label: "Project", icon: "content" },
    { id: "tutorials", label: "Tutorials", icon: "content" },
    { id: "news", label: "News", icon: "content" },
    { id: "contact", label: "Contact", icon: "users" },
    { id: "content", label: "Tất cả nội dung", icon: "content" },
    { id: "orders", label: "Đơn hàng", icon: "orders" },
    { id: "customers", label: "Khách hàng", icon: "users" },
    { id: "seo", label: "SEO", icon: "seo" },
    { id: "media", label: "Media", icon: "media" },
    { id: "system", label: "Hệ thống", icon: "system" },
  ];

  const CONTENT_TYPES = [
    { id: "welcome", label: "Welcome", singular: "scene welcome", hrefBase: "/vi/welcome/", routeMode: "hash" },
    { id: "products", label: "Sản phẩm", singular: "sản phẩm", hrefBase: "/vi/product/" },
    { id: "projects", label: "Dự án", singular: "dự án", hrefBase: "/vi/project/" },
    { id: "tutorials", label: "Tutorials", singular: "tutorial", hrefBase: "/vi/tutorial/" },
    { id: "news", label: "News", singular: "bài viết", hrefBase: "/vi/news/" },
    { id: "contact", label: "Contact", singular: "trang contact", hrefBase: "/vi/contact/", singleton: true },
    { id: "policies", label: "Policy", singular: "chính sách", hrefBase: "/vi/policy/" },
  ];

  const ICONS = {
    dashboard:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 13h6V4H4v9Zm10 7h6V4h-6v16ZM4 20h6v-4H4v4Z"/></svg>',
    content:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 4h9l3 3v13H6V4Z"/><path d="M15 4v4h4M9 12h6M9 16h6"/></svg>',
    package:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4.5 7.5 7.5 4.2 7.5-4.2M12 12v8.5"/></svg>',
    orders:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 4h10l1 16-3-1.5-3 1.5-3-1.5L6 20 7 4Z"/><path d="M9.5 8h5M9.5 12h5"/></svg>',
    users:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 19c0-2.2-1.8-4-4-4H8c-2.2 0-4 1.8-4 4"/><path d="M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 19c0-1.7-1-3.1-2.5-3.7M17 4.2a3.2 3.2 0 0 1 0 6.1"/></svg>',
    seo:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 19a8 8 0 1 1 5.7-2.4L21 21"/><path d="M8 11.5h6M8 8.5h8M8 14.5h4"/></svg>',
    media:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5h16v14H4V5Z"/><path d="m7 16 3.2-3.2 2.3 2.3 2.2-2.8L19 17"/><path d="M9 9.2h.01"/></svg>',
    system:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a8 8 0 0 0 .1-6l2-1.5-2-3.4-2.4 1a8 8 0 0 0-5.2-3l-.4-2.6h-4l-.4 2.6a8 8 0 0 0-5.2 3l-2.4-1-2 3.4 2 1.5a8 8 0 0 0 .1 6l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 5.2 3l.4 2.6h4l.4-2.6a8 8 0 0 0 5.2-3l2.4 1 2-3.4-2-1.5Z" transform="scale(.82) translate(2.6 2.6)"/></svg>',
    search:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="m21 21-4.3-4.3"/><circle cx="11" cy="11" r="7"/></svg>',
    plus:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
    edit:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M4 20h4l11-11-4-4L4 16v4Z"/><path d="m14 6 4 4"/></svg>',
    export:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></svg>',
    eye:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="3"/></svg>',
    menu:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    close:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    trash:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 14h10l1-14"/><path d="M9 7V4h6v3"/></svg>',
    spark:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 3 9.8 9.8 3 12l6.8 2.2L12 21l2.2-6.8L21 12l-6.8-2.2L12 3Z"/></svg>',
    arrow:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  };

  const state = {
    users: readStoredJson(STORAGE.users, []),
    currentUser: null,
    authenticated: false,
    authMode: "login",
    view: normalizeView(location.hash.replace("#", "") || localStorage.getItem(STORAGE.view) || "dashboard"),
    data: {
      core: {},
      counts: null,
      productDetailsLoaded: false,
      products: [],
      projects: [],
      tutorials: [],
      news: [],
      policies: [],
      orders: null,
      users: null,
      seoPages: null,
      seoKeywords: null,
      seoBacklinks: null,
    },
    loading: {},
    errors: {},
    filters: {
      query: "",
      contentType: "products",
      status: "all",
      sort: "quality",
    },
    commandOpen: false,
    commandQuery: "",
    editor: null,
    toasts: [],
    drafts: readStoredJson(STORAGE.drafts, {}),
    googleLoading: false,
    dragImageIndex: null,
    quickImagePicker: null,
  };

  initialize();

  function initialize() {
    state.currentUser = getSessionUser();
    state.authenticated = Boolean(state.currentUser);
    state.authMode = state.users.length ? "login" : "register";
    state.data.core = normalizeDataTree(window.STEM_DATA || {});
    state.data.products = Array.isArray(state.data.core.products) ? state.data.core.products : [];
    if (Array.isArray(window.STEM_PRODUCT_DETAILS) && window.STEM_PRODUCT_DETAILS.length) {
      state.data.products = mergeProductsWithMigration(state.data.products, normalizeDataTree(window.STEM_PRODUCT_DETAILS));
      state.data.productDetailsLoaded = true;
    }
    state.data.projects = Array.isArray(state.data.core.projects) ? state.data.core.projects : [];
    state.data.policies = Array.isArray(state.data.core.policies) ? state.data.core.policies : [];
    render();
    loadCounts();
    loadArchiveData();
    window.addEventListener("hashchange", () => {
      const nextView = normalizeView(location.hash.replace("#", ""));
      if (nextView !== state.view) {
        state.view = nextView;
        localStorage.setItem(STORAGE.view, state.view);
        render();
      }
    });
    document.addEventListener("keydown", handleKeydown);
    root.addEventListener("click", handleClick);
    root.addEventListener("mousedown", handleMouseDown);
    root.addEventListener("submit", handleSubmit);
    root.addEventListener("input", handleInput);
    root.addEventListener("change", handleChange);
    root.addEventListener("dragstart", handleDragStart);
    root.addEventListener("dragover", handleDragOver);
    root.addEventListener("dragleave", handleDragLeave);
    root.addEventListener("drop", handleDrop);
    root.addEventListener("dragend", handleDragEnd);
  }

  function normalizeView(view) {
    return NAV_ITEMS.some((item) => item.id === view) ? view : "dashboard";
  }

  function render() {
    destroyTinyMceEditors();
    if (!state.authenticated) {
      renderAccountAuth();
      return;
    }

    root.innerHTML = `
      <div class="admin-app">
        ${renderSidebar()}
        <section class="main-shell">
          ${renderTopbar()}
          <main class="content-shell">
            ${renderCurrentView()}
          </main>
        </section>
      </div>
      ${state.commandOpen ? renderCommandPalette() : ""}
      ${state.editor ? renderEditorDrawer() : ""}
      ${renderToasts()}
    `;
    document.body.classList.remove("admin-nav-open");
    window.requestAnimationFrame(autoSizeEditorTextareas);
    window.requestAnimationFrame(initializeRichEditors);
  }

  function renderAccountAuth() {
    const hasUsers = state.users.length > 0;
    const mode = hasUsers ? state.authMode : "register";
    const googleClientId = getGoogleClientId();
    root.innerHTML = `
      <section class="auth-screen">
        <article class="auth-card auth-card--wide">
          <div class="auth-media">
            <h1>STEMORA Admin</h1>
          </div>
          <div class="auth-body">
            <div class="brand-row">
              <span class="brand-mark" aria-hidden="true"></span>
              <div>
                <strong>${mode === "login" ? "Đăng nhập admin" : "Đăng ký tài khoản admin"}</strong>
                <span>${hasUsers ? "Dùng email + password hoặc Google." : "User đầu tiên sẽ là Owner."}</span>
              </div>
            </div>
            <p>Admin đang chạy trên static site nên tài khoản được lưu cục bộ trong trình duyệt. Khi public thật, cần backend auth để xác thực password và Google token an toàn.</p>
            <div class="auth-tabs" role="tablist" aria-label="Admin auth mode">
              ${
                hasUsers
                  ? `<button class="${mode === "login" ? "is-active" : ""}" type="button" data-auth-mode="login">Đăng nhập</button>
                     <button class="${mode === "register" ? "is-active" : ""}" type="button" data-auth-mode="register">Đăng ký</button>`
                  : `<button class="is-active" type="button" disabled>Đăng ký Owner</button>`
              }
            </div>
            <form class="auth-form" data-auth-form data-mode="${mode}">
              ${
                mode === "register"
                  ? `<label class="field">
                      <span>Họ tên</span>
                      <input name="name" autocomplete="name" required>
                    </label>`
                  : ""
              }
              <label class="field">
                <span>Email</span>
                <input name="email" type="email" autocomplete="email" required>
              </label>
              <label class="field">
                <span>Password</span>
                <input name="password" type="password" autocomplete="${mode === "login" ? "current-password" : "new-password"}" minlength="8" required>
              </label>
              ${
                mode === "register"
                  ? `<label class="field">
                      <span>Nhập lại password</span>
                      <input name="confirm" type="password" autocomplete="new-password" minlength="8" required>
                    </label>`
                  : ""
              }
              <button class="button button--primary" type="submit">
                ${ICONS.arrow}<span>${mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}</span>
              </button>
            </form>
            <div class="auth-divider"><span>hoặc</span></div>
            <div class="google-auth">
              <div id="google-auth-button"></div>
              ${
                googleClientId
                  ? `<p class="hint">Google Sign-In đã cấu hình Client ID.</p>`
                  : `<button class="button google-fallback" type="button" data-action="google-config-needed">
                      ${ICONS.users}<span>Đăng nhập / đăng ký bằng Google</span>
                    </button>
                    <div class="google-config">
                      <label class="field">
                        <span>Google OAuth Client ID</span>
                        <input name="googleClientId" value="${escapeAttr(localStorage.getItem(STORAGE.googleClient) || "")}" placeholder="xxxxx.apps.googleusercontent.com" data-google-client-input>
                      </label>
                      <button class="button" type="button" data-action="save-google-client">Lưu Client ID</button>
                    </div>`
              }
            </div>
            <div class="alert alert--warn">
              ${ICONS.system}
              <span>Không còn “mã quản trị”. Hệ thống dùng user/password. Google login cần Google OAuth Client ID; nếu chưa có backend, token chỉ dùng để nhận diện local.</span>
            </div>
          </div>
        </article>
      </section>
      ${renderToasts()}
    `;
    initGoogleAuth();
  }

  function renderAuth() {
    const hasPassHash = Boolean(localStorage.getItem(STORAGE.passHash));
    root.innerHTML = `
      <section class="auth-screen">
        <article class="auth-card">
          <div class="auth-media">
            <h1>STEMORA Admin</h1>
          </div>
          <div class="auth-body">
            <div class="brand-row">
              <span class="brand-mark" aria-hidden="true"></span>
              <div>
                <strong>${hasPassHash ? "Đăng nhập quản trị" : "Thiết lập mã quản trị"}</strong>
                <span>${hasPassHash ? "Phiên làm việc được giữ trong tab hiện tại." : "Lần đầu mở admin trên trình duyệt này."}</span>
              </div>
            </div>
            <p>Admin chạy trên static site nên mã quản trị chỉ bảo vệ cục bộ trong trình duyệt. Khi cần bảo mật thật, cần thêm backend auth trước khi public.</p>
            <form class="auth-form" data-auth-form>
              <label class="field">
                <span>Mã quản trị</span>
                <input name="passcode" type="password" autocomplete="current-password" minlength="6" required>
              </label>
              ${
                hasPassHash
                  ? ""
                  : `<label class="field">
                      <span>Nhập lại mã</span>
                      <input name="confirm" type="password" autocomplete="new-password" minlength="6" required>
                    </label>`
              }
              <button class="button button--primary" type="submit">
                ${ICONS.arrow}<span>${hasPassHash ? "Vào admin" : "Tạo mã và vào admin"}</span>
              </button>
            </form>
            <div class="alert alert--warn">
              ${ICONS.system}
              <span>Dữ liệu chỉnh sửa được lưu thành nháp local và có thể xuất JSON/patch. Static site không thể tự ghi ngược vào file trên server.</span>
            </div>
          </div>
        </article>
      </section>
      ${renderToasts()}
    `;
  }

  function renderSidebar() {
    return `
      <aside class="sidebar" aria-label="Admin navigation">
        <div class="sidebar__brand">
          <div class="brand-row">
            <span class="brand-mark" aria-hidden="true"></span>
            <div>
              <strong>STEMORA</strong>
              <span>Admin Console</span>
            </div>
          </div>
          <a class="site-chip" href="/vi/welcome/" target="_blank" rel="noreferrer">
            <div>
              <span>Public site</span>
              <strong>/vi/welcome/</strong>
            </div>
            ${ICONS.eye}
          </a>
        </div>
        <nav class="nav-list">
          ${NAV_ITEMS.map(
            (item) => `
              <button class="nav-button ${state.view === item.id ? "is-active" : ""}" type="button" data-nav="${item.id}">
                ${ICONS[item.icon]}
                <span>${item.label}</span>
              </button>
            `,
          ).join("")}
        </nav>
        <div class="sidebar__footer">
          <div class="sync-card">
            <strong>${escapeHtml(state.currentUser ? state.currentUser.name : "Admin")}</strong>
            <span>${escapeHtml(state.currentUser ? `${state.currentUser.role} · ${state.currentUser.email}` : `${Object.keys(state.drafts).length} nháp local`)}</span>
          </div>
          <button class="button button--ghost" type="button" data-action="logout">
            ${ICONS.close}<span>Đăng xuất</span>
          </button>
        </div>
      </aside>
    `;
  }

  function renderTopbar() {
    return `
      <header class="topbar">
        <div class="topbar__left">
          <button class="button button--icon mobile-menu" type="button" data-action="toggle-nav" aria-label="Mở menu">
            ${ICONS.menu}
          </button>
          <label class="global-search">
            ${ICONS.search}
            <input class="search-input" type="search" placeholder="Tìm sản phẩm, bài viết, khách hàng..." value="${escapeAttr(state.filters.query)}" data-filter="query">
          </label>
        </div>
        <div class="topbar__actions">
          <button class="button" type="button" data-action="command-open">${ICONS.spark}<span>Lệnh nhanh</span></button>
          <button class="button" type="button" data-action="export-view">${ICONS.export}<span>Xuất view</span></button>
          <a class="button" href="/vi/welcome/" target="_blank" rel="noreferrer">${ICONS.eye}<span>Xem site</span></a>
        </div>
      </header>
    `;
  }

  function renderCurrentView() {
    switch (state.view) {
      case "welcome":
        return renderContentManager("welcome", true);
      case "content":
        return renderContentView();
      case "products":
        return renderProductsView();
      case "projects":
        return renderContentManager("projects", true);
      case "tutorials":
        return renderContentManager("tutorials", true);
      case "news":
        return renderContentManager("news", true);
      case "contact":
        return renderContentManager("contact", true);
      case "orders":
        return renderOrdersView();
      case "customers":
        return renderCustomersView();
      case "seo":
        return renderSeoView();
      case "media":
        return renderMediaView();
      case "system":
        return renderSystemView();
      case "dashboard":
      default:
        return renderDashboard();
    }
  }

  function renderDashboard() {
    const rows = getAllContentRows();
    const products = getRows("products");
    const articles = getRows("news").length + getRows("tutorials").length;
    const health = getHealthScore(rows);
    const lowStock = products.filter((row) => Number(row.stock) > 0 && Number(row.stock) <= 10).length;
    const insights = buildInsights(rows);
    const activity = buildActivity(rows).slice(0, 7);
    return `
      <section class="page-heading">
        <div>
          <h1>Tổng quan vận hành</h1>
          <p>Bảng điều khiển gom dữ liệu public site và migration JSON, ưu tiên cảnh báo phần cần xử lý trước.</p>
        </div>
        <div class="heading-actions">
          <button class="button button--primary" type="button" data-action="create-record">${ICONS.plus}<span>Tạo nội dung</span></button>
          <button class="button" type="button" data-action="export-drafts">${ICONS.export}<span>Xuất thay đổi</span></button>
        </div>
      </section>
      <section class="metric-grid">
        ${renderMetric("Sản phẩm", formatNumber(products.length), `${lowStock} mục cần kiểm tra tồn kho`, "package")}
        ${renderMetric("Bài học & tin", formatNumber(articles), `${countLocalChanges()} thay đổi local`, "content")}
        ${renderMetric("Đơn hàng", state.data.counts ? formatNumber(state.data.counts.orders || 0) : "...", state.data.orders ? `${formatMoney(sumOrders(state.data.orders))} doanh thu` : "Có thể tải chi tiết khi cần", "orders")}
        ${renderMetric("Health score", `${health}%`, getHealthLabel(health), "spark")}
      </section>
      <section class="dashboard-grid">
        <article class="panel">
          <div class="panel__header">
            <div>
              <h2>Smart recommendations</h2>
              <p>Ưu tiên từ chất lượng nội dung, SEO, tồn kho và dữ liệu migration.</p>
            </div>
            <button class="button" type="button" data-nav="content">${ICONS.arrow}<span>Mở nội dung</span></button>
          </div>
          <div class="panel__body">
            <ul class="insight-list">
              ${insights.map(renderInsight).join("") || renderEmptyList("Không có cảnh báo lớn.")}
            </ul>
          </div>
        </article>
        <article class="panel">
          <div class="panel__header">
            <div>
              <h2>Content health</h2>
              <p>Điểm tính theo tiêu đề, slug, summary, media, trạng thái và SEO.</p>
            </div>
          </div>
          <div class="panel__body health-panel">
            <div class="score-ring" style="--score:${health}">
              <div class="score-ring__inner">
                <strong>${health}</strong>
                <span>/ 100</span>
              </div>
            </div>
            <p>${getHealthLabel(health)}</p>
            ${renderProgressList([
              ["Có ảnh đại diện", percent(rows.filter((row) => row.image).length, rows.length)],
              ["Có summary", percent(rows.filter((row) => row.summary).length, rows.length)],
              ["Đang public", percent(rows.filter((row) => row.status === "published").length, rows.length)],
            ])}
          </div>
        </article>
      </section>
      <section class="dashboard-grid">
        <article class="panel">
          <div class="panel__header">
            <div>
              <h2>Hoạt động gần đây</h2>
              <p>Dựa trên cập nhật migration và các nháp local.</p>
            </div>
          </div>
          <div class="panel__body">
            <ul class="activity-list">
              ${activity.map(renderActivity).join("") || renderEmptyList("Chưa có hoạt động gần đây.")}
            </ul>
          </div>
        </article>
        <article class="panel">
          <div class="panel__header">
            <div>
              <h2>Nguồn dữ liệu</h2>
              <p>Trạng thái đọc file static.</p>
            </div>
          </div>
          <div class="panel__body">
            ${renderDataSources()}
          </div>
        </article>
      </section>
    `;
  }

  function renderContentView() {
    return renderContentManager(state.filters.contentType, false);
  }

  function renderProductsView() {
    return renderContentManager("products", true);
  }

  function getManagerHeading(type, fixedType) {
    const headings = {
      welcome: {
        title: "Quản trị Welcome",
        copy: "Thêm, sửa, xóa và sắp nội dung các scene/section trên trang Welcome.",
      },
      products: {
        title: "Quản trị Product",
        copy: "Theo dõi catalogue, tồn kho, giá, media và chất lượng mô tả sản phẩm.",
      },
      projects: {
        title: "Quản trị Project",
        copy: "Thêm, sửa, xóa case study, ảnh, summary, nội dung chi tiết và metadata dự án.",
      },
      tutorials: {
        title: "Quản trị Tutorials",
        copy: "Quản lý thư viện bài giảng, học liệu, category, nội dung và trạng thái xuất bản.",
      },
      news: {
        title: "Quản trị News",
        copy: "Quản lý tin tức, sự kiện, nội dung editorial, ảnh đại diện và SEO.",
      },
      contact: {
        title: "Quản trị Contact",
        copy: "Điều chỉnh nội dung trang liên hệ, kênh liên lạc, brief form và metadata.",
      },
    };
    if (headings[type]) return headings[type];
    return fixedType
      ? { title: `Quản trị ${getTypeMeta(type).label}`, copy: "Thêm, sửa, xóa và tối ưu dữ liệu nội dung public site." }
      : { title: "Quản trị nội dung", copy: "Quản lý Welcome, Product, Project, Tutorials, News, Contact và Policy trong một workflow thống nhất." };
  }

  function renderContentManager(type, fixedType) {
    const currentType = fixedType ? type : state.filters.contentType;
    const rows = getFilteredRows(currentType);
    const allRows = getRows(currentType);
    const typeMeta = getTypeMeta(currentType);
    const heading = getManagerHeading(currentType, fixedType);
    const headingTitle = heading.title;
    const headingCopy = heading.copy;
    return `
      <section class="page-heading">
        <div>
          <h1>${headingTitle}</h1>
          <p>${headingCopy}</p>
        </div>
        <div class="heading-actions">
          <button class="button button--primary" type="button" data-action="create-record" data-type="${currentType}">${ICONS.plus}<span>Tạo ${typeMeta.singular}</span></button>
          <button class="button" type="button" data-action="export-view">${ICONS.export}<span>Xuất ${typeMeta.label}</span></button>
        </div>
      </section>
      <section class="metric-grid">
        ${renderMetric("Tổng", formatNumber(allRows.length), `${rows.length} mục đang hiển thị`, "content")}
        ${renderMetric("Published", formatNumber(allRows.filter((row) => row.status === "published").length), "Đang public hoặc active", "eye")}
        ${renderMetric("Cần xử lý", formatNumber(allRows.filter((row) => row.quality < 72).length), "Thiếu summary, media, SEO hoặc data", "spark")}
        ${renderMetric("Local CMS", formatNumber(countLocalChanges()), "Thêm, sửa, xóa đang hiển thị trong admin", "edit")}
      </section>
      <section class="panel">
        <div class="panel__header">
          <div>
            <h2>Danh sách ${typeMeta.label}</h2>
            <p>${renderLoadingLabel(["archives", "counts"])}</p>
          </div>
        </div>
        <div class="panel__body">
          ${renderFilters(currentType, fixedType)}
        </div>
        ${currentType === "products" ? renderProductQuickTable(rows) : renderContentTable(rows)}
      </section>
    `;
  }

  function renderFilters(currentType, fixedType) {
    return `
      <div class="filters-bar">
        <label class="global-search">
          ${ICONS.search}
          <input class="search-input" type="search" placeholder="Tìm theo title, slug, category..." value="${escapeAttr(state.filters.query)}" data-filter="query">
        </label>
        ${
          fixedType
            ? `<input type="hidden" value="${currentType}">`
            : `<label class="field">
                <span>Loại</span>
                <select data-filter="contentType">
                  ${CONTENT_TYPES.map((item) => `<option value="${item.id}" ${state.filters.contentType === item.id ? "selected" : ""}>${item.label}</option>`).join("")}
                </select>
              </label>`
        }
        <label class="field">
          <span>Trạng thái</span>
          <select data-filter="status">
            ${[
              ["all", "Tất cả"],
              ["published", "Published"],
              ["draft", "Draft/local"],
              ["hidden", "Hidden"],
              ["needs-work", "Cần xử lý"],
            ].map(([value, label]) => `<option value="${value}" ${state.filters.status === value ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </label>
        <label class="field">
          <span>Sắp xếp</span>
          <select data-filter="sort">
            ${[
              ["quality", "Cần xử lý trước"],
              ["title", "Tên A-Z"],
              ["updated", "Mới cập nhật"],
              ["stock", "Tồn kho thấp"],
            ].map(([value, label]) => `<option value="${value}" ${state.filters.sort === value ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </label>
        <button class="button" type="button" data-action="clear-filters">${ICONS.close}<span>Xóa lọc</span></button>
      </div>
    `;
  }

  function renderContentTable(rows) {
    if (!rows.length) {
      return `<div class="empty-state">${ICONS.search}<strong>Không có kết quả phù hợp</strong><span>Thử đổi keyword, status hoặc loại nội dung.</span></div>`;
    }
    return `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nội dung</th>
              <th>Loại</th>
              <th>Trạng thái</th>
              <th>Chất lượng</th>
              <th>Meta</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(renderContentRow).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderProductQuickTable(rows) {
    if (!rows.length) {
      return `<div class="empty-state">${ICONS.search}<strong>Không có kết quả phù hợp</strong><span>Thử đổi keyword, status hoặc loại nội dung.</span></div>`;
    }
    const categories = getProductCategoryOptions(rows);
    return `
      <div class="table-wrap product-quick-wrap">
        <table class="data-table product-quick-table">
          <thead>
            <tr>
              <th>Ảnh</th>
              <th>Tên / Slug</th>
              <th>Trạng thái</th>
              <th>Giá bán</th>
              <th>Giá gốc</th>
              <th>Tồn kho</th>
              <th>Danh mục</th>
              <th>Sắp xếp</th>
              <th>Featured</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => renderProductQuickRow(row, categories)).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderProductQuickRow(row, categories) {
    const images = getRowImageList(row);
    return `
      <tr data-product-quick-row="${escapeAttr(row.key)}">
        <td class="product-quick-image">
          <button class="product-quick-cover" type="button" data-action="toggle-product-images" data-row="${escapeAttr(row.key)}" title="Chọn ảnh cover">
            <img src="${escapeAttr(displayImageSrc(row.image))}" alt="" title="${escapeAttr(row.image || "")}">
          </button>
          <input type="hidden" value="${escapeAttr(row.image || "")}" data-quick-field="image" aria-label="Ảnh">
          ${state.quickImagePicker === row.key ? renderProductQuickImagePicker(row, images) : ""}
        </td>
        <td class="product-quick-title">
          <input value="${escapeAttr(row.title || "")}" data-quick-field="title" data-quick-title aria-label="Tên sản phẩm">
          <input value="${escapeAttr(row.slug || "")}" data-quick-field="slug" data-quick-slug aria-label="Slug">
        </td>
        <td>
          <select data-quick-field="status" aria-label="Trạng thái">
            ${["published", "draft", "hidden"].map((status) => `<option value="${status}" ${row.status === status ? "selected" : ""}>${status}</option>`).join("")}
          </select>
        </td>
        <td><div class="money-input"><input inputmode="numeric" value="${escapeAttr(toEditableMoney(row.priceText || ""))}" data-quick-field="priceText" aria-label="Giá bán"></div></td>
        <td><div class="money-input"><input inputmode="numeric" value="${escapeAttr(toEditableMoney(row.originalPriceText || ""))}" data-quick-field="originalPriceText" aria-label="Giá gốc"></div></td>
        <td><input type="number" value="${escapeAttr(row.stock == null ? "" : row.stock)}" data-quick-field="stock" aria-label="Tồn kho"></td>
        <td>
          <select data-quick-field="category" aria-label="Danh mục">
            ${categories.map((category) => `<option value="${escapeAttr(category)}" ${row.category === category ? "selected" : ""}>${escapeHtml(category || "Chưa phân loại")}</option>`).join("")}
          </select>
        </td>
        <td><input type="number" value="${escapeAttr(row.featuredOrder == null ? "" : row.featuredOrder)}" data-quick-field="featuredOrder" aria-label="Thứ tự sắp xếp"></td>
        <td><input type="checkbox" ${row.featuredOrder != null && row.featuredOrder !== "" ? "checked" : ""} data-quick-field="featured" aria-label="Featured"></td>
        <td>
          <div class="row-actions">
            ${row.href ? `<a class="button button--icon" href="${escapeAttr(row.href)}" target="_blank" rel="noreferrer" aria-label="Xem">${ICONS.eye}</a>` : ""}
            <button class="button button--icon" type="button" data-action="open-product-editor" data-row="${escapeAttr(row.key)}" aria-label="Sửa">${ICONS.edit}</button>
            <button class="button button--icon button--danger" type="button" data-action="delete-record" data-row="${escapeAttr(row.key)}" aria-label="Xóa">${ICONS.trash}</button>
          </div>
        </td>
      </tr>
    `;
  }

  function renderProductQuickImagePicker(row, images) {
    const values = images.length ? images : [row.image].filter(Boolean);
    return `
      <div class="product-image-picker">
        ${values.map((src) => `
          <button type="button" data-action="pick-product-cover" data-row="${escapeAttr(row.key)}" data-image="${escapeAttr(src)}" class="${normalizeImageSource(src) === normalizeImageSource(row.image) ? "is-active" : ""}">
            <img src="${escapeAttr(displayImageSrc(src))}" alt="">
          </button>
        `).join("") || `<span>Chưa có thumbnail</span>`}
      </div>
    `;
  }

  function getProductCategoryOptions(rows) {
    const sourceRows = Array.isArray(rows) ? rows : getRows("products");
    const categories = sourceRows.map((row) => row.category).filter(Boolean);
    return Array.from(new Set(["", ...categories])).sort((a, b) => a.localeCompare(b, "vi"));
  }

  function renderContentRow(row) {
    return `
      <tr>
        <td>
          <div class="row-title">
            <span class="row-thumb"><img src="${escapeAttr(displayImageSrc(row.image))}" alt="" title="${escapeAttr(row.image || "")}"></span>
            <span>
              <strong>${escapeHtml(row.title || "(Chưa có title)")}</strong>
              <span>${escapeHtml(row.slug || row.id)}${row.hasDraft ? " · Local edit" : ""}</span>
            </span>
          </div>
        </td>
        <td><span class="tag-pill" data-tone="blue">${escapeHtml(getTypeMeta(row.type).label)}</span></td>
        <td>${renderStatus(row)}</td>
        <td>${renderQuality(row.quality)}</td>
        <td>${renderRowMeta(row)}</td>
        <td>
          <div class="row-actions">
            ${row.href ? `<a class="button button--icon" href="${escapeAttr(row.href)}" target="_blank" rel="noreferrer" aria-label="Xem">${ICONS.eye}</a>` : ""}
            <button class="button button--icon" type="button" data-action="open-editor" data-row="${escapeAttr(row.key)}" aria-label="Sửa">${ICONS.edit}</button>
            <button class="button button--icon button--danger" type="button" data-action="delete-record" data-row="${escapeAttr(row.key)}" aria-label="Xóa">${ICONS.trash}</button>
          </div>
        </td>
      </tr>
    `;
  }

  function renderOrdersView() {
    if (!state.data.orders && !state.loading.orders) {
      ensureOrders();
    }
    const orders = state.data.orders || [];
    const revenue = sumOrders(orders);
    return `
      <section class="page-heading">
        <div>
          <h1>Đơn hàng</h1>
          <p>Theo dõi đơn migration đã export, tổng doanh thu và trạng thái xử lý. Ảnh base64 trong file gốc không được render để admin nhẹ hơn.</p>
        </div>
        <div class="heading-actions">
          <button class="button" type="button" data-action="load-orders">${ICONS.orders}<span>Tải lại đơn</span></button>
          <button class="button" type="button" data-action="export-orders">${ICONS.export}<span>Xuất đơn</span></button>
        </div>
      </section>
      <section class="metric-grid">
        ${renderMetric("Tổng đơn", state.loading.orders ? "..." : formatNumber(orders.length || (state.data.counts && state.data.counts.orders) || 0), "Từ migration-full-input/orders.json", "orders")}
        ${renderMetric("Doanh thu", state.loading.orders ? "..." : formatMoney(revenue), "Tính từ total hoặc items", "dashboard")}
        ${renderMetric("Khách có email", state.loading.orders ? "..." : formatNumber(orders.filter((order) => order.email).length), "Dùng cho follow-up", "users")}
        ${renderMetric("AOV", state.loading.orders ? "..." : formatMoney(orders.length ? revenue / orders.length : 0), "Giá trị đơn trung bình", "spark")}
      </section>
      <section class="panel">
        <div class="panel__header">
          <div>
            <h2>Danh sách đơn</h2>
            <p>${renderLoadingLabel(["orders"])}</p>
          </div>
        </div>
        ${state.loading.orders ? renderTableLoading("Đang tải đơn hàng...") : renderOrdersTable(orders)}
      </section>
    `;
  }

  function renderOrdersTable(orders) {
    if (!orders.length) {
      return `<div class="empty-state">${ICONS.orders}<strong>Chưa tải được đơn hàng</strong><span>Kiểm tra file migration hoặc chạy qua static server.</span></div>`;
    }
    return `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Mã đơn</th><th>Khách</th><th>Sản phẩm</th><th>Tổng</th><th>Ngày</th><th>Trạng thái</th></tr></thead>
          <tbody>
            ${orders.map(
              (order) => `
                <tr>
                  <td><strong>${escapeHtml(order.code || order.id)}</strong></td>
                  <td>${escapeHtml(order.customer || "Khách lẻ")}<br><span class="hint">${escapeHtml(maskEmail(order.email || ""))}</span></td>
                  <td>${formatNumber(order.itemCount || 0)} item</td>
                  <td>${formatMoney(order.total || 0)}</td>
                  <td>${formatDate(order.createdAt)}</td>
                  <td><span class="status-pill" data-tone="${order.status === "cancelled" ? "off" : "live"}">${escapeHtml(order.status || "pending")}</span></td>
                </tr>
              `,
            ).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderCustomersView() {
    if (!state.data.users && !state.loading.users) {
      ensureUsers();
    }
    const users = state.data.users || [];
    const verified = users.filter((user) => user.isEmailVerified).length;
    return `
      <section class="page-heading">
        <div>
          <h1>Khách hàng</h1>
          <p>Xem nhanh tài khoản migration. Mật khẩu/hash tuyệt đối không render trong admin.</p>
        </div>
        <div class="heading-actions">
          <button class="button" type="button" data-action="load-users">${ICONS.users}<span>Tải lại khách</span></button>
          <button class="button" type="button" data-action="export-users">${ICONS.export}<span>Xuất khách</span></button>
        </div>
      </section>
      <section class="metric-grid">
        ${renderMetric("Tài khoản", state.loading.users ? "..." : formatNumber(users.length || (state.data.counts && state.data.counts.users) || 0), "Từ users.json", "users")}
        ${renderMetric("Email verified", state.loading.users ? "..." : formatNumber(verified), `${percent(verified, users.length)}% đã xác thực`, "eye")}
        ${renderMetric("Google login", state.loading.users ? "..." : formatNumber(users.filter((user) => user.googleId).length), "Có googleId", "spark")}
        ${renderMetric("Newsletter", state.loading.users ? "..." : formatNumber(users.filter((user) => user.newsletter).length), "Có thể chăm sóc lại", "content")}
      </section>
      <section class="panel">
        <div class="panel__header">
          <div>
            <h2>Danh sách khách hàng</h2>
            <p>${renderLoadingLabel(["users"])}</p>
          </div>
        </div>
        ${state.loading.users ? renderTableLoading("Đang tải khách hàng...") : renderUsersTable(users)}
      </section>
    `;
  }

  function renderUsersTable(users) {
    if (!users.length) {
      return `<div class="empty-state">${ICONS.users}<strong>Chưa tải được khách hàng</strong><span>Kiểm tra file migration hoặc chạy qua static server.</span></div>`;
    }
    return `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Khách</th><th>Email</th><th>Role</th><th>Trạng thái</th><th>Đăng nhập cuối</th><th>Preferences</th></tr></thead>
          <tbody>
            ${users.map(
              (user) => `
                <tr>
                  <td><strong>${escapeHtml(user.name || "No name")}</strong><br><span class="hint">${escapeHtml(user.id)}</span></td>
                  <td>${escapeHtml(maskEmail(user.email || ""))}</td>
                  <td><span class="tag-pill" data-tone="blue">${escapeHtml(user.role || "user")}</span></td>
                  <td><span class="status-pill" data-tone="${user.isActive ? "live" : "off"}">${user.isActive ? "active" : "inactive"}</span></td>
                  <td>${formatDate(user.lastLoginAt || user.lastLogin)}</td>
                  <td>${escapeHtml(user.language || "vi")} · ${escapeHtml(user.theme || "light")}</td>
                </tr>
              `,
            ).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderSeoView() {
    if (!state.data.seoPages && !state.loading.seo) {
      ensureSeo();
    }
    const rows = getAllContentRows();
    const seoPages = state.data.seoPages || [];
    const missingSeo = rows.filter((row) => row.quality < 78 || !row.summary).slice(0, 9);
    return `
      <section class="page-heading">
        <div>
          <h1>SEO Control</h1>
          <p>Soát metadata, slug, title length và các page SEO migration. Đây là lớp kiểm tra trước khi xuất patch.</p>
        </div>
        <div class="heading-actions">
          <button class="button" type="button" data-action="load-seo">${ICONS.seo}<span>Tải SEO</span></button>
          <button class="button" type="button" data-action="export-seo">${ICONS.export}<span>Xuất SEO</span></button>
        </div>
      </section>
      <section class="seo-grid">
        ${renderSeoCard("Title quá dài", rows.filter((row) => (row.title || "").length > 68).length, "Nên giữ dưới 68 ký tự để dễ scan.")}
        ${renderSeoCard("Thiếu summary", rows.filter((row) => !row.summary).length, "Summary dùng cho snippet và preview card.")}
        ${renderSeoCard("Slug trùng", countDuplicateSlugs(rows), "Cần xử lý để tránh route đè nhau.")}
      </section>
      <section class="dashboard-grid">
        <article class="panel">
          <div class="panel__header">
            <div>
              <h2>SEO pages migration</h2>
              <p>${renderLoadingLabel(["seo"])}</p>
            </div>
          </div>
          ${state.loading.seo ? renderTableLoading("Đang tải SEO...") : renderSeoPagesTable(seoPages)}
        </article>
        <article class="panel">
          <div class="panel__header">
            <div>
              <h2>Nội dung cần tối ưu</h2>
              <p>Danh sách ưu tiên theo điểm chất lượng.</p>
            </div>
          </div>
          <div class="panel__body">
            <ul class="task-list">
              ${missingSeo.map((row) => renderTask(row, "Bổ sung summary, ảnh hoặc title SEO.")).join("") || renderEmptyList("Không có mục SEO yếu nổi bật.")}
            </ul>
          </div>
        </article>
      </section>
    `;
  }

  function renderSeoPagesTable(pages) {
    if (!pages.length) {
      return `<div class="empty-state">${ICONS.seo}<strong>Chưa có SEO pages</strong><span>File seo_pages.json chưa tải hoặc rỗng.</span></div>`;
    }
    return `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>URL</th><th>Title</th><th>Score</th><th>Status</th><th>Updated</th></tr></thead>
          <tbody>
            ${pages.map(
              (page) => `
                <tr>
                  <td><strong>${escapeHtml(page.url || "")}</strong></td>
                  <td>${escapeHtml(page.title || "")}<br><span class="hint">${escapeHtml(page.metaDescription || "")}</span></td>
                  <td>${renderQuality(Number(page.seoScore || 0))}</td>
                  <td><span class="status-pill" data-tone="${page.status === "published" ? "live" : "draft"}">${escapeHtml(page.status || "draft")}</span></td>
                  <td>${formatDate(page.lastUpdated)}</td>
                </tr>
              `,
            ).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderMediaView() {
    const media = collectMedia();
    const remote = media.filter((item) => /^https?:\/\//i.test(item.src)).length;
    const local = media.filter((item) => item.src && item.src.startsWith("/")).length;
    return `
      <section class="page-heading">
        <div>
          <h1>Media Library</h1>
          <p>Quét ảnh đang được nội dung dùng. Ưu tiên phát hiện thiếu ảnh, ảnh remote và preview hỏng.</p>
        </div>
        <div class="heading-actions">
          <button class="button" type="button" data-action="export-media">${ICONS.export}<span>Xuất media</span></button>
        </div>
      </section>
      <section class="metric-grid">
        ${renderMetric("Tổng asset", formatNumber(media.length), "Ảnh từ products, projects, news, tutorials", "media")}
        ${renderMetric("Remote", formatNumber(remote), "Đang gọi từ domain ngoài", "system")}
        ${renderMetric("Local", formatNumber(local), "Nằm trong site hoặc uploads", "package")}
        ${renderMetric("Thiếu ảnh", formatNumber(getAllContentRows().filter((row) => !row.image).length), "Nên bổ sung cover", "spark")}
      </section>
      <section class="media-grid">
        ${media.slice(0, 30).map(renderMediaTile).join("") || `<article class="media-tile"><h3>Chưa có media</h3><p>Không tìm thấy ảnh trong dữ liệu hiện tại.</p></article>`}
      </section>
    `;
  }

  function renderSystemView() {
    const snapshot = buildExportSnapshot();
    return `
      <section class="page-heading">
        <div>
          <h1>Hệ thống</h1>
          <p>Quản lý nguồn dữ liệu thật, thay đổi local, export/import và trạng thái endpoint static.</p>
        </div>
        <div class="heading-actions">
          <button class="button button--primary" type="button" data-action="export-all">${ICONS.export}<span>Xuất snapshot</span></button>
        </div>
      </section>
      <section class="metric-grid">
        ${renderMetric("Local CMS", formatNumber(countLocalChanges()), "Thêm, sửa, xóa trong trình duyệt này", "edit")}
        ${renderMetric("Records", formatNumber(snapshot.records.length), "Tổng nội dung quản trị được", "content")}
        ${renderMetric("Endpoints", `${Object.keys(ENDPOINTS).length}`, "File migration đang theo dõi", "system")}
        ${renderMetric("Users", formatNumber(state.users.length), state.currentUser ? `${state.currentUser.role} đang đăng nhập` : "Chưa đăng nhập", "users")}
      </section>
      <section class="dashboard-grid">
        <article class="panel">
          <div class="panel__header">
            <div>
              <h2>Export / Import</h2>
              <p>Dùng cho handoff dữ liệu sau khi thêm, sửa hoặc xóa trong admin.</p>
            </div>
          </div>
          <div class="panel__body">
            <div class="smart-grid">
              <article class="smart-card">
                <h3>Local changes</h3>
                <p>Xuất các mục đã thêm, sửa hoặc xóa trong admin browser.</p>
                <button class="button" type="button" data-action="export-drafts">${ICONS.export}<span>Xuất thay đổi</span></button>
              </article>
              <article class="smart-card">
                <h3>Snapshot admin</h3>
                <p>Xuất toàn bộ record đã chuẩn hóa, không kèm hash/password.</p>
                <button class="button" type="button" data-action="export-all">${ICONS.export}<span>Xuất snapshot</span></button>
              </article>
              <article class="smart-card">
                <h3>Import thay đổi</h3>
                <p>Nạp lại file JSON đã xuất từ admin.</p>
                <label class="button">
                  ${ICONS.plus}<span>Chọn file</span>
                  <input type="file" accept="application/json" data-import-drafts hidden>
                </label>
              </article>
            </div>
            <div style="height:1rem"></div>
            <button class="button button--danger" type="button" data-action="clear-drafts">${ICONS.close}<span>Xóa toàn bộ thay đổi local</span></button>
          </div>
        </article>
        <article class="panel">
          <div class="panel__header">
            <div>
              <h2>Data sources</h2>
              <p>Trạng thái endpoint static.</p>
            </div>
          </div>
          <div class="panel__body">
            ${renderDataSources()}
          </div>
        </article>
      </section>
      <section class="panel">
        <div class="panel__header"><h2>Snapshot preview</h2></div>
        <div class="panel__body"><pre class="json-box">${escapeHtml(JSON.stringify(snapshot.summary, null, 2))}</pre></div>
      </section>
    `;
  }

  function renderMetric(label, value, detail, icon) {
    return `
      <article class="metric-card">
        <div class="metric-card__top">
          <span>${escapeHtml(label)}</span>
          <i class="metric-icon">${ICONS[icon] || ICONS.dashboard}</i>
        </div>
        <strong>${escapeHtml(String(value))}</strong>
        <p>${escapeHtml(detail || "")}</p>
      </article>
    `;
  }

  function renderInsight(item) {
    return `
      <li class="insight-item" data-level="${escapeAttr(item.level || "info")}">
        <span class="insight-dot" aria-hidden="true"></span>
        <span>
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.body)}</p>
        </span>
        ${item.action ? `<button class="button" type="button" data-nav="${escapeAttr(item.action.view)}">${ICONS.arrow}<span>${escapeHtml(item.action.label)}</span></button>` : ""}
      </li>
    `;
  }

  function renderActivity(row) {
    return `
      <li class="activity-item">
        <span class="insight-dot" aria-hidden="true"></span>
        <span>
          <strong>${escapeHtml(row.title || row.slug)}</strong>
          <p>${escapeHtml(getTypeMeta(row.type).label)} · ${formatDate(row.updatedAt)} · quality ${row.quality}%</p>
        </span>
        <button class="button button--icon" type="button" data-action="open-editor" data-row="${escapeAttr(row.key)}" aria-label="Sửa">${ICONS.edit}</button>
      </li>
    `;
  }

  function renderTask(row, body) {
    return `
      <li class="task-item">
        <span class="insight-dot" aria-hidden="true"></span>
        <span>
          <strong>${escapeHtml(row.title || row.slug)}</strong>
          <p>${escapeHtml(body)} Quality ${row.quality}%.</p>
        </span>
        <button class="button button--icon" type="button" data-action="open-editor" data-row="${escapeAttr(row.key)}" aria-label="Sửa">${ICONS.edit}</button>
      </li>
    `;
  }

  function renderProgressList(items) {
    return `
      <div class="progress-list">
        ${items.map(
          ([label, value]) => `
            <div class="progress-row">
              <div class="progress-row__label"><span>${escapeHtml(label)}</span><strong>${value}%</strong></div>
              <div class="progress-track"><span style="--value:${value}"></span></div>
            </div>
          `,
        ).join("")}
      </div>
    `;
  }

  function renderDataSources() {
    return `
      <ul class="task-list">
        ${Object.entries(ENDPOINTS).map(([key, url]) => {
          const loaded = hasLoadedSource(key);
          const loading = state.loading[key] || (key === "projects" && state.loading.archives);
          const error = state.errors[key];
          return `
            <li class="task-item">
              <span class="insight-dot" aria-hidden="true"></span>
              <span>
                <strong>${escapeHtml(key)}</strong>
                <p>${escapeHtml(url)}${error ? ` · ${escapeHtml(error)}` : ""}</p>
              </span>
              <span class="status-pill" data-tone="${error ? "off" : loaded ? "live" : loading ? "draft" : "draft"}">${error ? "error" : loaded ? "loaded" : loading ? "loading" : "idle"}</span>
            </li>
          `;
        }).join("")}
      </ul>
    `;
  }

  function renderSeoCard(title, value, body) {
    return `
      <article class="seo-card">
        <span class="metric-icon">${ICONS.seo}</span>
        <h3>${escapeHtml(title)}</h3>
        <strong style="font-size:2.25rem;line-height:1">${escapeHtml(String(value))}</strong>
        <p>${escapeHtml(body)}</p>
      </article>
    `;
  }

  function renderMediaTile(item) {
    return `
      <article class="media-tile">
        <div class="preview-image"><img src="${escapeAttr(displayImageSrc(item.src))}" alt="" loading="lazy" title="${escapeAttr(item.src)}"></div>
        <h3>${escapeHtml(item.title || "Media asset")}</h3>
        <p>${escapeHtml(item.type)} · ${escapeHtml(item.src.slice(0, 90))}</p>
      </article>
    `;
  }

  function renderCommandPalette() {
    const results = getCommandResults();
    return `
      <div class="command-overlay" role="dialog" aria-modal="true" aria-label="Lệnh nhanh">
        <section class="command-panel">
          <div class="command-header">
            <label class="global-search">
              ${ICONS.search}
              <input class="command-input" type="search" placeholder="Nhập để mở view hoặc nội dung..." value="${escapeAttr(state.commandQuery)}" data-command-input autofocus>
            </label>
            <p class="hint">Ctrl+K để mở, Esc để đóng.</p>
          </div>
          <div class="command-results">
            ${results.map(renderCommandItem).join("") || `<div class="empty-state">${ICONS.search}<strong>Không có kết quả</strong></div>`}
          </div>
        </section>
      </div>
    `;
  }

  function renderCommandItem(item) {
    return `
      <button class="command-item" type="button" data-command-kind="${escapeAttr(item.kind)}" data-command-value="${escapeAttr(item.value)}">
        ${ICONS[item.icon] || ICONS.arrow}
        <span><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.subtitle || "")}</span></span>
        ${ICONS.arrow}
      </button>
    `;
  }

  function renderEditorDrawer() {
    const row = state.editor;
    const typeMeta = getTypeMeta(row.type);
    const suggestions = getEditorSuggestions(row);
    const rowImages = getRowImageList(row);
    if (row.type === "products") return renderProductEditorModal(row, typeMeta, suggestions);
    return `
      <div class="drawer-overlay" role="dialog" aria-modal="true" aria-label="Editor">
        <aside class="drawer">
          <div class="drawer__header">
            <div>
              <h2>${row.isNew ? "Tạo" : "Sửa"} ${typeMeta.singular}</h2>
              <p class="hint">${escapeHtml(row.slug || row.id)}</p>
            </div>
            <button class="button button--icon" type="button" data-action="close-editor" aria-label="Đóng">${ICONS.close}</button>
          </div>
          <div class="drawer__body">
            <div class="editor-grid">
              <article class="editor-panel">
                <div class="panel__header">
                  <div>
                    <h3>Thông tin chính</h3>
                    <p>Lưu sẽ cập nhật ngay dữ liệu đang hiển thị trong admin.</p>
                  </div>
                </div>
                <form class="editor-form" data-editor-form>
                  <div class="form-grid">
                    <label class="field field--wide">
                      <span>Tiêu đề</span>
                      <input name="title" value="${escapeAttr(row.title || "")}" required>
                    </label>
                    <label class="field">
                      <span>Slug</span>
                      <input name="slug" value="${escapeAttr(row.slug || "")}" required>
                    </label>
                    <label class="field">
                      <span>Status</span>
                      <select name="status">
                        ${["published", "draft", "hidden"].map((value) => `<option value="${value}" ${row.status === value ? "selected" : ""}>${value}</option>`).join("")}
                      </select>
                    </label>
                    <label class="field">
                      <span>Category / Tagline</span>
                      <input name="category" value="${escapeAttr(row.category || "")}">
                    </label>
                    <label class="field">
                      <span>Ảnh cover</span>
                      <input name="image" value="${escapeAttr(row.image || "")}">
                    </label>
                    ${
                      row.type === "products"
                        ? `<label class="field">
                            <span>Giá</span>
                            <input name="priceText" value="${escapeAttr(row.priceText || "")}">
                          </label>
                          <label class="field">
                            <span>Tồn kho</span>
                            <input name="stock" type="number" min="0" value="${escapeAttr(row.stock == null ? "" : row.stock)}">
                          </label>`
                        : ""
                    }
                    <label class="field field--wide">
                      <span>Summary</span>
                      <textarea name="summary" class="textarea--summary textarea--autosize">${escapeHtml(row.summary || "")}</textarea>
                    </label>
                    <label class="field field--wide">
                      <span>Ghi chú vận hành</span>
                      <textarea name="notes" class="textarea--summary textarea--autosize">${escapeHtml(row.notes || "")}</textarea>
                    </label>
                  </div>
                  ${renderGenericMediaSection(row, rowImages)}
                  ${renderAdvancedEditorFields(row)}
                  <div class="heading-actions">
                    <button class="button button--primary" type="submit">${ICONS.edit}<span>Lưu & hiển thị</span></button>
                    <button class="button" type="button" data-action="export-editor">${ICONS.export}<span>Xuất mục này</span></button>
                    ${row.isNew ? "" : `<button class="button button--danger" type="button" data-action="delete-record" data-row="${escapeAttr(row.key)}">${ICONS.trash}<span>Xóa mục này</span></button>`}
                  </div>
                </form>
              </article>
              <aside class="preview-panel">
                <div class="panel__header">
                  <div>
                    <h3>Preview & smart checks</h3>
                    <p>Điểm hiện tại: ${row.quality}%</p>
                  </div>
                </div>
                <div class="preview-card">
                  <div class="preview-image"><img src="${escapeAttr(displayImageSrc(rowImages[0] || row.image))}" alt="" title="${escapeAttr(rowImages[0] || row.image || "")}"></div>
                  <div class="preview-meta">
                    ${renderStatus(row)}
                    ${renderQuality(row.quality)}
                    <span class="tag-pill" data-tone="blue">${escapeHtml(typeMeta.label)}</span>
                  </div>
                  <h3>${escapeHtml(row.title || "(Chưa có title)")}</h3>
                  <p>${escapeHtml(row.summary || "Chưa có summary cho preview.")}</p>
                  <ul class="task-list">
                    ${suggestions.map((text) => `<li class="task-item"><span class="insight-dot"></span><span><strong>${escapeHtml(text)}</strong><p>Gợi ý này được tạo từ rule kiểm tra dữ liệu hiện tại.</p></span></li>`).join("") || renderEmptyList("Không có gợi ý lớn cho mục này.")}
                  </ul>
                </div>
              </aside>
            </div>
          </div>
        </aside>
      </div>
    `;
  }

  function renderProductEditorModal(row, typeMeta, suggestions) {
    const images = getRowImageList(row);
    const descriptionText = getEditorDescription(row);
    return `
      <div class="drawer-overlay" role="dialog" aria-modal="true" aria-label="Product editor">
        <aside class="drawer product-editor-modal">
          <form class="product-editor-shell" data-editor-form>
            <div class="drawer__header product-editor-header">
              <div class="product-editor-title">
                <span class="eyebrow">${row.isNew ? "Tạo sản phẩm" : "Sửa sản phẩm"}</span>
                <h2>${escapeHtml(row.title || "(Chưa có title)")}</h2>
                <p>${escapeHtml(row.slug || row.id)}</p>
              </div>
              <div class="product-editor-header__meta">
                ${renderStatus(row)}
                ${renderQuality(row.quality)}
                <span class="tag-pill" data-tone="blue">${escapeHtml(typeMeta.label)}</span>
              </div>
              <div class="product-editor-actions">
                <button class="button button--primary" type="submit">${ICONS.edit}<span>Lưu & hiển thị</span></button>
                <button class="button" type="button" data-action="export-editor">${ICONS.export}<span>Xuất</span></button>
                ${row.isNew ? "" : `<button class="button button--danger" type="button" data-action="delete-record" data-row="${escapeAttr(row.key)}">${ICONS.trash}<span>Xóa</span></button>`}
                <button class="button button--icon" type="button" data-action="close-editor" aria-label="Đóng">${ICONS.close}</button>
              </div>
            </div>
            <div class="product-editor-body">
              <aside class="product-editor-sidebar">
                <nav class="product-editor-nav" aria-label="Editor sections">
                  <button type="button" data-scroll-target="editor-overview">Tổng quan</button>
                  <button type="button" data-scroll-target="editor-media">Ảnh</button>
                  <button type="button" data-scroll-target="editor-content">Mô tả</button>
                  <button type="button" data-scroll-target="editor-specs">Thông số</button>
                  <button type="button" data-scroll-target="editor-seo">SEO</button>
                  <div class="product-editor-nav__stats">
                    <span>${formatNumber(descriptionText.length)} ký tự mô tả</span>
                    <span data-image-count>${images.length} ảnh</span>
                    <span>${row.stock === "" || row.stock == null ? "Chưa có tồn kho" : `Tồn ${row.stock}`}</span>
                  </div>
                </nav>
                ${renderProductPreviewCard(row, images, suggestions)}
              </aside>
              <main class="product-editor-main">
                <section class="editor-card" id="editor-overview">
                  <div class="editor-card__header">
                    <div>
                      <h3>Tổng quan sản phẩm</h3>
                      <p>Các trường xuất hiện ở card mua hàng, danh sách và breadcrumb.</p>
                    </div>
                  </div>
                  <div class="form-grid form-grid--compact">
                    <label class="field field--wide">
                      <span>Tiêu đề</span>
                      <input name="title" value="${escapeAttr(row.title || "")}" required>
                    </label>
                    <label class="field">
                      <span>Slug</span>
                      <input name="slug" value="${escapeAttr(row.slug || "")}" required>
                    </label>
                    <label class="field">
                      <span>Status</span>
                      <select name="status">
                        ${["published", "draft", "hidden"].map((value) => `<option value="${value}" ${row.status === value ? "selected" : ""}>${value}</option>`).join("")}
                      </select>
                    </label>
                    <label class="field">
                      <span>Danh mục / tagline</span>
                      <input name="category" value="${escapeAttr(row.category || "")}">
                    </label>
                    <label class="field">
                      <span>Giá</span>
                      <input name="priceText" value="${escapeAttr(row.priceText || "")}">
                    </label>
                    <label class="field">
                      <span>Tồn kho</span>
                      <input name="stock" type="number" min="0" value="${escapeAttr(row.stock == null ? "" : row.stock)}">
                    </label>
                    <label class="field">
                      <span>Tình trạng</span>
                      <input name="availability" value="${escapeAttr(row.availability || "")}">
                    </label>
                    <div class="form-subsection" id="editor-specs">
                      <div class="form-subsection__header">
                        <div>
                          <h4>Thông số & phân loại</h4>
                          <p>Các trường dùng cho tab thông số, filter và vận hành catalogue.</p>
                        </div>
                      </div>
                      <div class="form-grid form-grid--compact">
                        <label class="field">
                          <span>Giá gốc</span>
                          <input name="originalPriceText" value="${escapeAttr(row.originalPriceText || "")}">
                        </label>
                        <label class="field">
                          <span>SKU</span>
                          <input name="sku" value="${escapeAttr(row.sku || "")}">
                        </label>
                        <label class="field">
                          <span>Featured order</span>
                          <input name="featuredOrder" type="number" value="${escapeAttr(row.featuredOrder == null ? "" : row.featuredOrder)}">
                        </label>
                        <label class="field">
                          <span>Age taxonomy</span>
                          <input name="ageText" value="${escapeAttr(row.ageText || "")}" placeholder="7-9, 10-12">
                        </label>
                        <label class="field">
                          <span>Theme taxonomy</span>
                          <input name="themeText" value="${escapeAttr(row.themeText || "")}" placeholder="robotics, engineering">
                        </label>
                        <label class="field">
                          <span>Format taxonomy</span>
                          <input name="formatText" value="${escapeAttr(row.formatText || "")}" placeholder="kit">
                        </label>
                        <label class="field">
                          <span>Difficulty taxonomy</span>
                          <input name="difficultyText" value="${escapeAttr(row.difficultyText || "")}" placeholder="intermediate">
                        </label>
                      </div>
                    </div>
                    <label class="field field--wide">
                      <span>Summary ngắn</span>
                      <textarea name="summary" class="textarea--summary textarea--autosize">${escapeHtml(row.summary || "")}</textarea>
                    </label>
                    <label class="field field--wide">
                      <span>Ghi chú vận hành</span>
                      <textarea name="notes" class="textarea--summary textarea--autosize">${escapeHtml(row.notes || "")}</textarea>
                    </label>
                  </div>
                </section>

                <section class="editor-card" id="editor-media">
                  <div class="editor-card__header">
                    <div>
                      <h3>Ảnh sản phẩm</h3>
                      <p>Kéo thả để đổi thứ tự. Ảnh đầu tiên là cover sản phẩm.</p>
                    </div>
                    <button class="button button--small" type="button" data-action="add-image">${ICONS.plus}<span>Thêm ảnh</span></button>
                  </div>
                  <div class="media-slot-grid media-slot-grid--wide">
                    ${renderImageSlots(images)}
                  </div>
                </section>

                <section class="editor-card editor-card--focus" id="editor-content">
                  <div class="editor-card__header">
                    <div>
                      <h3>Mô tả chi tiết đầy đủ</h3>
                      <p>Đây là nội dung tab “Mô tả sản phẩm” trên trang chi tiết, đã chuyển từ HTML sang đoạn dễ sửa.</p>
                    </div>
                    <span class="editor-count">${formatNumber(descriptionText.length)} ký tự</span>
                  </div>
                  ${renderRichTextEditor("descriptionHtml", row.descriptionRichHtml || row.fullDescription || row.descriptionHtml || descriptionText, "Mô tả chi tiết")}
                  <label class="field field--wide">
                    <span>Tính năng nổi bật / outcomes, mỗi dòng một ý</span>
                    <textarea name="featuresText" class="textarea--features textarea--autosize">${escapeHtml(row.featuresText || "")}</textarea>
                  </label>
                </section>

                <section class="editor-card" id="editor-seo">
                  <div class="editor-card__header">
                    <div>
                      <h3>SEO</h3>
                      <p>Metadata để kiểm tra trước khi xuất dữ liệu.</p>
                    </div>
                  </div>
                  <div class="form-grid">
                    <label class="field">
                      <span>SEO title</span>
                      <input name="metaTitle" value="${escapeAttr(row.metaTitle || "")}">
                    </label>
                    <label class="field">
                      <span>SEO description</span>
                      <input name="metaDescription" value="${escapeAttr(row.metaDescription || "")}">
                    </label>
                    <label class="field field--wide">
                      <span>Keywords</span>
                      <input name="keywords" value="${escapeAttr(row.keywords || "")}">
                    </label>
                  </div>
                </section>
              </main>
            </div>
          </form>
        </aside>
      </div>
    `;
  }

  function renderProductPreviewCard(row, images, suggestions) {
    return `
      <div class="preview-card preview-card--sticky">
        <div class="preview-image"><img src="${escapeAttr(displayImageSrc(row.image))}" alt="" title="${escapeAttr(row.image || "")}" data-product-preview-cover></div>
        <div class="preview-meta">
          ${renderStatus(row)}
          ${renderQuality(row.quality)}
          <span class="tag-pill" data-tone="blue" data-image-count>${images.length} ảnh</span>
        </div>
        <h3>${escapeHtml(row.title || "(Chưa có title)")}</h3>
        <p>${escapeHtml(row.summary || "Chưa có summary cho preview.")}</p>
        <dl class="editor-mini-specs">
          <div><dt>Giá</dt><dd>${escapeHtml(row.priceText || "Chưa có")}</dd></div>
          <div><dt>Tồn kho</dt><dd>${escapeHtml(row.stock === "" || row.stock == null ? "Chưa có" : String(row.stock))}</dd></div>
          <div><dt>Danh mục</dt><dd>${escapeHtml(row.category || "Chưa có")}</dd></div>
        </dl>
        <ul class="task-list">
          ${suggestions.slice(0, 3).map((text) => `<li class="task-item"><span class="insight-dot"></span><span><strong>${escapeHtml(text)}</strong></span></li>`).join("") || renderEmptyList("Không có gợi ý lớn cho mục này.")}
        </ul>
      </div>
    `;
  }

  function renderGenericMediaSection(row, images) {
    const values = Array.isArray(images) ? images : getRowImageList(row);
    return `
      <section class="editor-section" id="editor-media">
        <div class="editor-section__header">
          <div>
            <h4>Hình ảnh</h4>
            <p>Gom toàn bộ ảnh tìm thấy trong cover, hero, gallery, media, attachment và nội dung HTML.</p>
          </div>
          <button class="button button--small" type="button" data-action="add-image">${ICONS.plus}<span>Thêm ảnh</span></button>
        </div>
        <div class="media-slot-grid media-slot-grid--wide">
          ${renderImageSlots(values)}
        </div>
      </section>
    `;
  }

  function renderAdvancedEditorFields(row) {
    if (row.type === "products") return renderProductEditorFields(row);
    return `
      <section class="editor-section">
        <div class="editor-section__header">
          <h4>Nội dung chi tiết</h4>
          <p>Sửa phần body/content đang dùng cho trang chi tiết hoặc archive.</p>
        </div>
        ${renderRichTextEditor("bodyText", row.bodyRichHtml || row.bodyText || row.description || "", "Nội dung đầy đủ")}
        <div class="form-grid">
          <label class="field">
            <span>SEO title</span>
            <input name="metaTitle" value="${escapeAttr(row.metaTitle || "")}">
          </label>
          <label class="field">
            <span>SEO description</span>
            <input name="metaDescription" value="${escapeAttr(row.metaDescription || "")}">
          </label>
        </div>
      </section>
    `;
  }

  function renderProductEditorFields(row) {
    const images = getRowImageList(row);
    return `
      <section class="editor-section">
        <div class="editor-section__header">
          <h4>Gallery sản phẩm</h4>
          <p>Hiển thị đúng số ảnh thực tế của sản phẩm.</p>
        </div>
        <div class="media-slot-grid">
          ${renderImageSlots(images)}
        </div>
      </section>
      <section class="editor-section">
        <div class="editor-section__header">
          <h4>Nội dung trang chi tiết</h4>
          <p>Đồng bộ với phần mô tả, thông số kỹ thuật và tính năng trên trang sản phẩm.</p>
        </div>
        ${renderRichTextEditor("descriptionHtml", row.descriptionRichHtml || row.fullDescription || row.descriptionHtml || row.description || "", "Mô tả chi tiết")}
        <label class="field field--wide">
          <span>Tính năng nổi bật / outcomes, mỗi dòng một ý</span>
          <textarea name="featuresText" class="textarea--tall">${escapeHtml(row.featuresText || "")}</textarea>
        </label>
        <div class="form-grid">
          <label class="field">
            <span>Giá gốc</span>
            <input name="originalPriceText" value="${escapeAttr(row.originalPriceText || "")}">
          </label>
          <label class="field">
            <span>SKU</span>
            <input name="sku" value="${escapeAttr(row.sku || "")}">
          </label>
          <label class="field">
            <span>Tình trạng</span>
            <input name="availability" value="${escapeAttr(row.availability || "")}">
          </label>
          <label class="field">
            <span>Featured order</span>
            <input name="featuredOrder" type="number" value="${escapeAttr(row.featuredOrder == null ? "" : row.featuredOrder)}">
          </label>
        </div>
      </section>
      <section class="editor-section">
        <div class="editor-section__header">
          <h4>Thông số & SEO</h4>
          <p>Các nhóm này đang xuất hiện trong tab thông số và metadata.</p>
        </div>
        <div class="form-grid">
          <label class="field">
            <span>Age taxonomy</span>
            <input name="ageText" value="${escapeAttr(row.ageText || "")}" placeholder="7-9, 10-12">
          </label>
          <label class="field">
            <span>Theme taxonomy</span>
            <input name="themeText" value="${escapeAttr(row.themeText || "")}" placeholder="robotics, engineering">
          </label>
          <label class="field">
            <span>Format taxonomy</span>
            <input name="formatText" value="${escapeAttr(row.formatText || "")}" placeholder="kit">
          </label>
          <label class="field">
            <span>Difficulty taxonomy</span>
            <input name="difficultyText" value="${escapeAttr(row.difficultyText || "")}" placeholder="intermediate">
          </label>
          <label class="field">
            <span>SEO title</span>
            <input name="metaTitle" value="${escapeAttr(row.metaTitle || "")}">
          </label>
          <label class="field">
            <span>SEO description</span>
            <input name="metaDescription" value="${escapeAttr(row.metaDescription || "")}">
          </label>
          <label class="field field--wide">
            <span>Keywords</span>
            <input name="keywords" value="${escapeAttr(row.keywords || "")}">
          </label>
        </div>
      </section>
    `;
  }

  function renderImageSlots(images) {
    const values = (Array.isArray(images) ? images : []).map(normalizeImageSource).filter(Boolean);
    if (!values.length) {
      return `<div class="media-slot-empty">Chưa có ảnh.</div>`;
    }
    return values.map((src, index) => renderImageSlot(src, index)).join("");
  }

  function renderImageSlot(src, index) {
    const value = normalizeImageSource(src);
    const isCover = index === 0;
    const imageName = getImageFileName(value, index);
    return `
      <article class="media-slot ${isCover ? "media-slot--cover" : ""} ${value ? "" : "media-slot--empty"}" data-image-slot="${index}" draggable="${value ? "true" : "false"}">
        <div class="media-slot__preview">
          <img src="${escapeAttr(displayImageSrc(value))}" alt="" data-image-preview="${index}">
          ${isCover ? `<span class="media-slot__badge">Cover</span>` : ""}
          <button class="media-slot__delete" type="button" data-action="clear-image" data-image-index="${index}" aria-label="Xóa ảnh ${index + 1}" title="Xóa ảnh">${ICONS.trash}</button>
        </div>
        <button class="media-slot__name" type="button" data-action="edit-image" data-image-index="${index}" data-image-name="${index}" title="Sửa ảnh: ${escapeAttr(value || imageName)}">${escapeHtml(imageName)}</button>
        <input type="hidden" name="image${index}" value="${escapeAttr(value)}" data-image-input="${index}">
      </article>
    `;
  }

  function renderRichTextEditor(name, value, label) {
    const html = richEditorHtml(value);
    const plainTextLength = stripHtml(html).length;
    return `
      <div class="rich-editor field--wide" data-rich-field="${escapeAttr(name)}">
        <div class="rich-editor__label">
          <span>${escapeHtml(label)}</span>
          <small>${formatNumber(plainTextLength)} ký tự</small>
        </div>
        <div class="rich-editor__toolbar" aria-label="${escapeAttr(label)} toolbar">
          <button type="button" data-rich-command="bold" title="Bôi đậm"><strong>B</strong></button>
          <button type="button" data-rich-command="italic" title="In nghiêng"><em>I</em></button>
          <button type="button" data-rich-command="underline" title="Gạch chân"><u>U</u></button>
          <span class="rich-editor__divider" aria-hidden="true"></span>
          <select data-rich-block aria-label="Kiểu đoạn">
            <option value="">Đoạn</option>
            <option value="p">Paragraph</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="blockquote">Quote</option>
          </select>
          <select data-rich-font-size aria-label="Cỡ chữ">
            <option value="">Cỡ chữ</option>
            <option value="2">Nhỏ</option>
            <option value="3">Thường</option>
            <option value="4">Lớn</option>
            <option value="5">Rất lớn</option>
          </select>
          <span class="rich-editor__divider" aria-hidden="true"></span>
          <button type="button" data-rich-command="insertUnorderedList" title="Danh sách bullet">• List</button>
          <button type="button" data-rich-command="insertOrderedList" title="Danh sách số">1. List</button>
          <button type="button" data-rich-command="removeFormat" title="Xóa định dạng">Clear</button>
          <span class="rich-editor__divider" aria-hidden="true"></span>
          <button type="button" data-rich-action="link" title="Chèn link">Link</button>
          <button type="button" data-rich-action="image-url" title="Chèn ảnh bằng URL">Ảnh URL</button>
          <button type="button" data-rich-action="image-file" title="Chèn ảnh từ máy">Chọn ảnh</button>
          <input type="file" accept="image/*" data-rich-image-file hidden>
        </div>
        <div class="rich-editor__surface" contenteditable="true" data-rich-editor="${escapeAttr(name)}" role="textbox" aria-multiline="true">${html}</div>
        <textarea name="${escapeAttr(name)}" data-rich-hidden hidden>${escapeHtml(html)}</textarea>
      </div>
    `;
  }

  function renderRichTextEditor(name, value, label) {
    const html = richEditorHtml(value);
    const plainTextLength = stripHtml(html).length;
    const editorId = buildRichEditorId(name);
    return `
      <div class="rich-editor field--wide" data-rich-field="${escapeAttr(name)}">
        <div class="rich-editor__label">
          <span>${escapeHtml(label)}</span>
          <small>${formatNumber(plainTextLength)} ký tự</small>
        </div>
        <div class="rich-editor__loading">Đang mở TinyMCE...</div>
        <textarea id="${escapeAttr(editorId)}" name="${escapeAttr(name)}" class="rich-editor__textarea" data-rich-editor="${escapeAttr(name)}" data-rich-hidden>${escapeHtml(html)}</textarea>
        <div class="rich-editor__fallback" data-rich-fallback>
          <div class="rich-editor__toolbar" aria-label="${escapeAttr(label)} toolbar">
            <button type="button" data-rich-command="bold" title="Bôi đậm"><strong>B</strong></button>
            <button type="button" data-rich-command="italic" title="In nghiêng"><em>I</em></button>
            <button type="button" data-rich-command="underline" title="Gạch chân"><u>U</u></button>
            <span class="rich-editor__divider" aria-hidden="true"></span>
            <select data-rich-block aria-label="Kiểu đoạn">
              <option value="">Đoạn</option>
              <option value="p">Paragraph</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
              <option value="blockquote">Quote</option>
            </select>
            <select data-rich-font-size aria-label="Cỡ chữ">
              <option value="">Cỡ chữ</option>
              <option value="2">Nhỏ</option>
              <option value="3">Thường</option>
              <option value="4">Lớn</option>
              <option value="5">Rất lớn</option>
            </select>
            <span class="rich-editor__divider" aria-hidden="true"></span>
            <button type="button" data-rich-command="insertUnorderedList" title="Danh sách bullet">• List</button>
            <button type="button" data-rich-command="insertOrderedList" title="Danh sách số">1. List</button>
            <button type="button" data-rich-command="removeFormat" title="Xóa định dạng">Clear</button>
            <span class="rich-editor__divider" aria-hidden="true"></span>
            <button type="button" data-rich-action="link" title="Chèn link">Link</button>
            <button type="button" data-rich-action="image-url" title="Chèn ảnh bằng URL">Ảnh URL</button>
            <button type="button" data-rich-action="image-file" title="Chèn ảnh từ máy">Chọn ảnh</button>
            <input type="file" accept="image/*" data-rich-image-file hidden>
          </div>
          <div class="rich-editor__surface" contenteditable="true" data-rich-fallback-editor="${escapeAttr(name)}" role="textbox" aria-multiline="true">${html}</div>
        </div>
      </div>
    `;
  }

  function buildRichEditorId(name) {
    const key = state.editor ? `${state.editor.type}-${state.editor.id}-${name}` : name;
    return `tinymce-${slugify(key)}`;
  }

  function getImageFileName(src, index) {
    const value = normalizeImageSource(src);
    if (!value) return `Ảnh ${index + 1}`;
    const clean = value.split(/[?#]/)[0].replace(/\\/g, "/");
    const name = clean.split("/").filter(Boolean).pop() || `Ảnh ${index + 1}`;
    try {
      return decodeURIComponent(name);
    } catch (_error) {
      return name;
    }
  }

  function renderToasts() {
    if (!state.toasts.length) return "";
    return `
      <div class="toast-stack">
        ${state.toasts.map((toast) => `<div class="toast"><strong>${escapeHtml(toast.title)}</strong><span>${escapeHtml(toast.body || "")}</span></div>`).join("")}
      </div>
    `;
  }

  function renderStatus(row) {
    const tone = row.status === "published" ? "live" : row.status === "hidden" ? "off" : "draft";
    const label = row.hasDraft && row.status !== "draft" ? `${row.status} + local` : row.status || "draft";
    return `<span class="status-pill" data-tone="${tone}">${escapeHtml(label)}</span>`;
  }

  function renderQuality(value) {
    const tone = value >= 82 ? "green" : value >= 65 ? "amber" : "red";
    return `<span class="tag-pill" data-tone="${tone}">${Number(value || 0)}%</span>`;
  }

  function renderRowMeta(row) {
    const parts = [];
    if (row.priceText) parts.push(row.priceText);
    if (row.stock !== "" && row.stock != null) parts.push(`Tồn: ${row.stock}`);
    if (row.category) parts.push(row.category);
    if (row.author) parts.push(row.author);
    if (row.updatedAt) parts.push(formatDate(row.updatedAt));
    return escapeHtml(parts.slice(0, 3).join(" · ") || "Chưa có meta");
  }

  function renderLoadingLabel(keys) {
    const isLoading = keys.some((key) => state.loading[key]);
    if (isLoading) return `<span class="loading-inline">Đang tải dữ liệu</span>`;
    const hasErrors = keys.some((key) => state.errors[key]);
    return hasErrors ? "Có endpoint chưa tải được." : "Dữ liệu đã sẵn sàng.";
  }

  function renderTableLoading(label) {
    return `<div class="empty-state"><span class="loading-inline">${escapeHtml(label)}</span></div>`;
  }

  function renderEmptyList(label) {
    return `<li class="task-item"><span class="insight-dot"></span><span><strong>${escapeHtml(label)}</strong><p>Không cần thao tác ngay.</p></span></li>`;
  }

  function handleClick(event) {
    const richButton = event.target.closest("[data-rich-command], [data-rich-action]");
    if (richButton) {
      handleRichToolbarClick(richButton);
      return;
    }

    const authModeButton = event.target.closest("[data-auth-mode]");
    if (authModeButton) {
      state.authMode = authModeButton.dataset.authMode === "register" ? "register" : "login";
      render();
      return;
    }

    const scrollButton = event.target.closest("[data-scroll-target]");
    if (scrollButton) {
      const target = root.querySelector(`#${CSS.escape(scrollButton.dataset.scrollTarget)}`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const navButton = event.target.closest("[data-nav]");
    if (navButton) {
      switchView(navButton.dataset.nav);
      return;
    }

    const commandItem = event.target.closest("[data-command-kind]");
    if (commandItem) {
      runCommand(commandItem.dataset.commandKind, commandItem.dataset.commandValue);
      return;
    }

    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    const action = actionButton.dataset.action;

    if (action === "toggle-nav") {
      document.body.classList.toggle("admin-nav-open");
    } else if (action === "logout") {
      sessionStorage.removeItem(STORAGE.session);
      state.currentUser = null;
      state.authenticated = false;
      render();
    } else if (action === "google-config-needed") {
      toast("Cần Google Client ID", "Tạo OAuth Client ID trên Google Cloud rồi lưu vào ô bên dưới.");
      render();
    } else if (action === "save-google-client") {
      const input = root.querySelector("[data-google-client-input]");
      const clientId = input ? String(input.value || "").trim() : "";
      if (!/\.apps\.googleusercontent\.com$/.test(clientId)) {
        toast("Client ID chưa hợp lệ", "Client ID thường kết thúc bằng .apps.googleusercontent.com.");
        render();
        return;
      }
      localStorage.setItem(STORAGE.googleClient, clientId);
      toast("Đã lưu Google Client ID", "Bạn có thể dùng nút Google Sign-In sau khi reload khối auth.");
      render();
    } else if (action === "add-image") {
      addImageSlot();
    } else if (action === "edit-image") {
      editImageSlot(actionButton.dataset.imageIndex);
    } else if (action === "clear-image") {
      clearImageSlot(actionButton.dataset.imageIndex);
    } else if (action === "command-open") {
      state.commandOpen = true;
      state.commandQuery = "";
      render();
      focusCommandInput();
    } else if (action === "command-close") {
      closeCommand();
    } else if (action === "clear-filters") {
      state.filters.query = "";
      state.filters.status = "all";
      state.filters.sort = "quality";
      render();
    } else if (action === "open-editor") {
      openEditorByKey(actionButton.dataset.row);
    } else if (action === "toggle-product-images") {
      state.quickImagePicker = state.quickImagePicker === actionButton.dataset.row ? null : actionButton.dataset.row;
      render();
    } else if (action === "pick-product-cover") {
      pickProductQuickCover(actionButton.dataset.row, actionButton.dataset.image);
    } else if (action === "save-product-quick") {
      saveProductQuickDraft(actionButton.dataset.row);
    } else if (action === "open-product-editor") {
      const row = actionButton.closest("[data-product-quick-row]");
      if (row && row.classList.contains("is-dirty")) {
        saveProductQuickDraft(actionButton.dataset.row, { silent: true, skipRender: true });
      }
      openEditorByKey(actionButton.dataset.row);
    } else if (action === "delete-record") {
      deleteRecord(actionButton.dataset.row || (state.editor && state.editor.key));
    } else if (action === "close-editor") {
      state.editor = null;
      render();
    } else if (action === "create-record") {
      openNewEditor(actionButton.dataset.type || (state.view === "products" ? "products" : state.filters.contentType));
    } else if (action === "export-drafts") {
      exportDrafts();
    } else if (action === "export-view") {
      exportCurrentView();
    } else if (action === "export-editor") {
      if (state.editor) downloadJson(`stemora-${state.editor.type}-${state.editor.slug || state.editor.id}.json`, state.editor);
    } else if (action === "export-all") {
      downloadJson("stemora-admin-snapshot.json", buildExportSnapshot());
    } else if (action === "export-orders") {
      downloadJson("stemora-orders-export.json", state.data.orders || []);
    } else if (action === "export-users") {
      downloadJson("stemora-users-export.json", state.data.users || []);
    } else if (action === "export-seo") {
      downloadJson("stemora-seo-export.json", {
        pages: state.data.seoPages || [],
        keywords: state.data.seoKeywords || [],
        backlinks: state.data.seoBacklinks || [],
      });
    } else if (action === "export-media") {
      downloadJson("stemora-media-export.json", collectMedia());
    } else if (action === "load-orders") {
      ensureOrders(true);
    } else if (action === "load-users") {
      ensureUsers(true);
    } else if (action === "load-seo") {
      ensureSeo(true);
    } else if (action === "clear-drafts") {
      if (window.confirm("Xóa toàn bộ thay đổi local trong trình duyệt này?")) {
        state.drafts = {};
        localStorage.removeItem(STORAGE.drafts);
        toast("Đã xóa thay đổi local", "Admin quay lại dữ liệu gốc từ source.");
        render();
      }
    }
  }

  function handleMouseDown(event) {
    if (event.target.closest("[data-rich-command], [data-rich-action]")) {
      event.preventDefault();
    }
  }

  function handleSubmit(event) {
    const authForm = event.target.closest("[data-auth-form]");
    if (authForm) {
      event.preventDefault();
      handleAccountAuth(authForm);
      return;
    }

    const editorForm = event.target.closest("[data-editor-form]");
    if (editorForm) {
      event.preventDefault();
      saveEditorDraft(editorForm);
    }
  }

  function handleInput(event) {
    if (event.target.matches("[data-filter]")) {
      const key = event.target.dataset.filter;
      state.filters[key] = event.target.value;
      if (key === "contentType") state.filters.status = "all";
      render();
    }
    if (event.target.matches("[data-command-input]")) {
      state.commandQuery = event.target.value;
      render();
      focusCommandInput();
    }
    if (event.target.matches("[data-image-input]")) {
      syncImagePreview(event.target);
    }
    if (event.target.matches("[data-rich-editor], [data-rich-fallback-editor]")) {
      syncRichEditor(event.target);
    }
    if (event.target.matches(".textarea--autosize")) {
      autoSizeTextarea(event.target);
    }
    if (event.target.matches("[data-quick-title]")) {
      const row = event.target.closest("[data-product-quick-row]");
      const slugInput = row && row.querySelector("[data-quick-slug]");
      if (slugInput) slugInput.value = slugify(event.target.value);
    }
    if (event.target.matches('[data-quick-field="image"]')) {
      const cell = event.target.closest(".product-quick-image");
      const image = cell && cell.querySelector("img");
      if (image) image.src = displayImageSrc(event.target.value);
    }
  }

  function handleChange(event) {
    if (event.target.matches("[data-import-drafts]")) {
      importDrafts(event.target.files && event.target.files[0]);
    }
    if (event.target.matches("[data-rich-block], [data-rich-font-size]")) {
      handleRichToolbarSelect(event.target);
    }
    if (event.target.matches("[data-rich-image-file]")) {
      insertRichImageFile(event.target);
    }
    if (event.target.matches("[data-quick-field]")) {
      const row = event.target.closest("[data-product-quick-row]");
      if (row) row.classList.add("is-dirty");
    }
  }

  function handleKeydown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      state.commandOpen = true;
      render();
      focusCommandInput();
    }
    if (event.key === "Escape") {
      if (state.commandOpen) closeCommand();
      else if (state.editor) {
        state.editor = null;
        render();
      }
    }
  }

  async function handleAccountAuth(form) {
    const formData = new FormData(form);
    const mode = form.dataset.mode === "register" || !state.users.length ? "register" : "login";
    const email = normalizeEmail(formData.get("email"));
    const password = String(formData.get("password") || "");
    const confirm = String(formData.get("confirm") || "");
    const name = String(formData.get("name") || "").trim();

    if (!email || !email.includes("@")) {
      toast("Email chưa hợp lệ", "Nhập email quản trị đúng định dạng.");
      render();
      return;
    }
    if (password.length < 8) {
      toast("Password quá ngắn", "Dùng tối thiểu 8 ký tự.");
      render();
      return;
    }

    if (mode === "register") {
      if (!name) {
        toast("Thiếu họ tên", "Nhập tên để tạo tài khoản admin.");
        render();
        return;
      }
      if (password !== confirm) {
        toast("Password chưa khớp", "Nhập lại password giống nhau.");
        render();
        return;
      }
      if (state.users.some((user) => user.email === email)) {
        toast("Email đã tồn tại", "Chuyển sang đăng nhập hoặc dùng email khác.");
        state.authMode = "login";
        render();
        return;
      }
      const user = await createPasswordUser({ name, email, password, role: state.users.length ? "editor" : "owner" });
      signInUser(user, "Đã tạo tài khoản", `${user.name} đang đăng nhập với quyền ${user.role}.`);
      return;
    }

    const user = state.users.find((entry) => entry.email === email);
    if (!user || !user.passwordHash || !user.salt) {
      toast("Không tìm thấy tài khoản", "Kiểm tra email hoặc đăng ký tài khoản mới.");
      render();
      return;
    }
    const passwordHash = await hashPassword(password, user.salt);
    if (passwordHash !== user.passwordHash) {
      toast("Sai password", "Kiểm tra lại password admin.");
      render();
      return;
    }
    signInUser({ ...user, lastLoginAt: new Date().toISOString() }, "Đã đăng nhập", "Admin đã sẵn sàng.");
  }

  async function handleAuth(form) {
    const passcode = String(new FormData(form).get("passcode") || "");
    const confirm = String(new FormData(form).get("confirm") || "");
    if (passcode.length < 6) {
      toast("Mã quá ngắn", "Dùng tối thiểu 6 ký tự.");
      render();
      return;
    }
    const currentHash = localStorage.getItem(STORAGE.passHash);
    if (!currentHash && passcode !== confirm) {
      toast("Mã chưa khớp", "Nhập lại mã quản trị giống nhau.");
      render();
      return;
    }

    const nextHash = await sha256(passcode);
    if (!currentHash) {
      localStorage.setItem(STORAGE.passHash, nextHash);
      sessionStorage.setItem(STORAGE.session, "1");
      state.authenticated = true;
      toast("Đã tạo mã", "Bạn đang ở phiên admin local.");
      render();
      return;
    }

    if (nextHash !== currentHash) {
      toast("Sai mã quản trị", "Kiểm tra lại mã đã thiết lập trên trình duyệt này.");
      render();
      return;
    }

    sessionStorage.setItem(STORAGE.session, "1");
    state.authenticated = true;
    toast("Đã đăng nhập", "Admin đã sẵn sàng.");
    render();
  }

  function switchView(view) {
    state.view = normalizeView(view);
    localStorage.setItem(STORAGE.view, state.view);
    if (location.hash.replace("#", "") !== state.view) {
      history.replaceState(null, "", `#${state.view}`);
    }
    if (state.view === "orders") ensureOrders();
    if (state.view === "customers") ensureUsers();
    if (state.view === "seo") ensureSeo();
    render();
  }

  function closeCommand() {
    state.commandOpen = false;
    state.commandQuery = "";
    render();
  }

  function runCommand(kind, value) {
    if (kind === "view") {
      closeCommand();
      switchView(value);
      return;
    }
    if (kind === "row") {
      closeCommand();
      openEditorByKey(value);
    }
  }

  function focusCommandInput() {
    window.setTimeout(() => {
      const input = root.querySelector("[data-command-input]");
      if (input) input.focus();
    }, 0);
  }

  function clearImageSlot(index) {
    const removeIndex = Number(index);
    const values = getCurrentImageValues().filter((_value, imageIndex) => imageIndex !== removeIndex);
    renderImageSlotsInEditor(values);
  }

  function addImageSlot() {
    const source = window.prompt("Dán URL hoặc path ảnh");
    const value = normalizeImageSource(source);
    if (!value) return;
    renderImageSlotsInEditor([...getCurrentImageValues(), value]);
  }

  function editImageSlot(index) {
    const imageIndex = Number(index);
    const values = getCurrentImageValues();
    if (!values[imageIndex]) return;
    const source = window.prompt("Sửa URL hoặc path ảnh", values[imageIndex]);
    if (source == null) return;
    const value = normalizeImageSource(source);
    if (!value) return;
    values[imageIndex] = value;
    renderImageSlotsInEditor(values);
  }

  function syncImagePreview(input) {
    const index = input.dataset.imageInput;
    const value = normalizeImageSource(input.value);
    const preview = root.querySelector(`[data-image-preview="${CSS.escape(String(index))}"]`);
    if (preview) preview.src = displayImageSrc(value);
    const slot = input.closest("[data-image-slot]");
    if (slot) {
      slot.classList.toggle("media-slot--empty", !value);
      slot.classList.toggle("media-slot--cover", Number(index) === 0);
      slot.setAttribute("draggable", value ? "true" : "false");
      const name = slot.querySelector("[data-image-name]");
      if (name) {
        const label = getImageFileName(value, Number(index));
        name.textContent = label;
        name.title = value || label;
      }
    }
    if (Number(index) === 0) syncProductCoverPreview(value);
  }

  function syncProductCoverPreview(nextValue) {
    const value = normalizeImageSource(nextValue == null ? root.querySelector('[data-image-input="0"]')?.value : nextValue);
    const image = root.querySelector("[data-product-preview-cover]");
    if (!image) return;
    image.src = displayImageSrc(value);
    image.title = value || "";
  }

  function renderImageSlotsInEditor(values) {
    const grid = root.querySelector(".media-slot-grid");
    const images = (Array.isArray(values) ? values : []).map(normalizeImageSource).filter(Boolean);
    if (grid) grid.innerHTML = renderImageSlots(images);
    syncImageCountLabels(images.length);
    syncProductCoverPreview(images[0] || "");
  }

  function syncImageCountLabels(count) {
    root.querySelectorAll("[data-image-count]").forEach((item) => {
      item.textContent = `${count} ảnh`;
    });
  }

  function getCurrentImageValues() {
    return getImageInputs().map((input) => normalizeImageSource(input.value)).filter(Boolean);
  }

  function getImageInputs() {
    return Array.from(root.querySelectorAll("[data-image-input]"))
      .sort((a, b) => Number(a.dataset.imageInput) - Number(b.dataset.imageInput));
  }

  function handleDragStart(event) {
    const slot = event.target.closest("[data-image-slot]");
    if (!slot || slot.getAttribute("draggable") !== "true") return;
    state.dragImageIndex = Number(slot.dataset.imageSlot);
    slot.classList.add("is-dragging");
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(state.dragImageIndex));
    }
  }

  function handleDragOver(event) {
    const slot = event.target.closest("[data-image-slot]");
    if (!slot || state.dragImageIndex == null) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    slot.classList.add("is-drag-over");
  }

  function handleDragLeave(event) {
    const slot = event.target.closest("[data-image-slot]");
    if (!slot) return;
    if (event.relatedTarget && slot.contains(event.relatedTarget)) return;
    slot.classList.remove("is-drag-over");
  }

  function handleDrop(event) {
    const slot = event.target.closest("[data-image-slot]");
    if (!slot || state.dragImageIndex == null) return;
    event.preventDefault();
    const fromIndex = Number(event.dataTransfer && event.dataTransfer.getData("text/plain") || state.dragImageIndex);
    const toIndex = Number(slot.dataset.imageSlot);
    reorderImageSlots(fromIndex, toIndex);
    clearImageDragState();
  }

  function handleDragEnd() {
    clearImageDragState();
  }

  function reorderImageSlots(fromIndex, toIndex) {
    const inputs = getImageInputs();
    if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex) || fromIndex === toIndex) return;
    if (!inputs[fromIndex] || !inputs[toIndex]) return;
    const values = inputs.map((input) => normalizeImageSource(input.value));
    const [moved] = values.splice(fromIndex, 1);
    values.splice(toIndex, 0, moved);
    renderImageSlotsInEditor(values);
  }

  function clearImageDragState() {
    state.dragImageIndex = null;
    root.querySelectorAll(".media-slot.is-dragging, .media-slot.is-drag-over").forEach((slot) => {
      slot.classList.remove("is-dragging", "is-drag-over");
    });
  }

  function autoSizeEditorTextareas() {
    root.querySelectorAll("textarea.textarea--autosize").forEach(autoSizeTextarea);
  }

  function autoSizeTextarea(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight + 2}px`;
  }

  function initializeRichEditors() {
    const textareas = Array.from(root.querySelectorAll("textarea[data-rich-editor]"));
    if (!textareas.length) return;
    textareas.forEach((textarea) => {
      const wrapper = textarea.closest(".rich-editor");
      if (wrapper) wrapper.classList.add("rich-editor--tinymce-pending");
    });
    loadTinyMce()
      .then(() => {
        textareas.forEach(initTinyMceEditor);
      })
      .catch(() => {
        textareas.forEach((textarea) => enableFallbackRichEditor(textarea.closest(".rich-editor")));
      });
  }

  function loadTinyMce() {
    if (window.tinymce) return Promise.resolve(window.tinymce);
    if (tinyMceLoader) return tinyMceLoader;
    tinyMceLoader = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-tinymce-admin="true"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(window.tinymce), { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = TINYMCE_CDN;
      script.referrerPolicy = "origin";
      script.dataset.tinymceAdmin = "true";
      script.addEventListener("load", () => {
        if (window.tinymce) resolve(window.tinymce);
        else reject(new Error("TinyMCE script loaded but window.tinymce is missing."));
      }, { once: true });
      script.addEventListener("error", reject, { once: true });
      document.head.appendChild(script);
    });
    return tinyMceLoader;
  }

  function initTinyMceEditor(textarea) {
    if (!textarea || !document.body.contains(textarea) || !window.tinymce) return;
    if (window.tinymce.get(textarea.id)) return;
    const wrapper = textarea.closest(".rich-editor");
    window.tinymce.init({
      target: textarea,
      base_url: "/assets/vendor/tinymce",
      suffix: ".min",
      license_key: "gpl",
      menubar: "edit view insert format tools table help",
      plugins: "advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table help wordcount quickbars",
      toolbar:
        "undo redo | blocks fontfamily fontsize | bold italic underline strikethrough forecolor backcolor | " +
        "alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | blockquote | " +
        "link image media table | removeformat code fullscreen preview help",
      toolbar_mode: "sliding",
      quickbars_insert_toolbar: "quickimage quicktable",
      quickbars_selection_toolbar: "bold italic underline | quicklink h2 h3 blockquote",
      contextmenu: "link image table",
      block_formats: "Đoạn=p; Tiêu đề 2=h2; Tiêu đề 3=h3; Trích dẫn=blockquote; Mã=pre",
      font_size_formats: "12px 14px 16px 18px 20px 24px 28px 32px 40px",
      height: 520,
      min_height: 360,
      branding: false,
      promotion: false,
      statusbar: true,
      resize: true,
      entity_encoding: "raw",
      convert_urls: false,
      paste_data_images: true,
      automatic_uploads: true,
      images_upload_handler: uploadTinyImageAsDataUrl,
      file_picker_types: "image media",
      file_picker_callback: pickTinyMceFile,
      content_style:
        "body{font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.72;color:#102033;padding:14px 18px;}" +
        "img{max-width:100%;height:auto;border-radius:8px;}" +
        "table{border-collapse:collapse;width:100%;}td,th{border:1px solid #d7dee8;padding:8px;}blockquote{border-left:3px solid #176b5b;margin-left:0;padding-left:12px;color:#334155;}",
      setup(editor) {
        editor.on("init", () => {
          if (wrapper) {
            wrapper.classList.remove("rich-editor--tinymce-pending", "rich-editor--fallback");
            wrapper.classList.add("rich-editor--tinymce-ready");
          }
          syncTinyMceEditor(editor, textarea);
        });
        editor.on("Change KeyUp SetContent Undo Redo Paste NodeChange", () => syncTinyMceEditor(editor, textarea));
      },
    }).then((editors) => {
      (Array.isArray(editors) ? editors : []).forEach((editor) => {
        if (wrapper) {
          wrapper.classList.remove("rich-editor--tinymce-pending", "rich-editor--fallback");
          wrapper.classList.add("rich-editor--tinymce-ready");
        }
        syncTinyMceEditor(editor, textarea);
      });
    }).catch(() => {
      enableFallbackRichEditor(wrapper);
    });
  }

  function uploadTinyImageAsDataUrl(blobInfo) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Không đọc được ảnh."));
      reader.readAsDataURL(blobInfo.blob());
    });
  }

  function pickTinyMceFile(callback, _value, meta) {
    if (!meta || (meta.filetype !== "image" && meta.filetype !== "media")) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = meta.filetype === "image" ? "image/*" : "video/*,audio/*";
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => callback(reader.result, { title: file.name, alt: file.name });
      reader.readAsDataURL(file);
    }, { once: true });
    input.click();
  }

  function syncTinyMceEditor(editor, textarea) {
    if (!editor || !textarea) return;
    const html = sanitizeRichHtml(editor.getContent()).trim();
    textarea.value = html;
    updateRichEditorCounter(textarea.closest(".rich-editor"), html);
  }

  function enableFallbackRichEditor(wrapper) {
    if (!wrapper) return;
    wrapper.classList.remove("rich-editor--tinymce-pending", "rich-editor--tinymce-ready");
    wrapper.classList.add("rich-editor--fallback");
    const textarea = wrapper.querySelector("textarea[data-rich-editor]");
    const surface = wrapper.querySelector("[data-rich-fallback-editor]");
    if (textarea && surface && !surface.innerHTML.trim()) surface.innerHTML = richEditorHtml(textarea.value);
    updateRichEditorCounter(wrapper, textarea ? textarea.value : "");
  }

  function destroyTinyMceEditors() {
    if (!window.tinymce) return;
    root.querySelectorAll("textarea[data-rich-editor][id]").forEach((textarea) => {
      const instance = window.tinymce.get(textarea.id);
      if (instance) instance.remove();
    });
  }

  function getRichEditorSurface(control) {
    const editor = control && control.closest ? control.closest(".rich-editor") : null;
    return editor ? editor.querySelector("[data-rich-fallback-editor]") : null;
  }

  function handleRichToolbarClick(control) {
    const surface = getRichEditorSurface(control);
    if (!surface) return;
    surface.focus();
    const command = control.dataset.richCommand;
    if (command) {
      document.execCommand(command, false, null);
      syncRichEditor(surface);
      return;
    }
    const action = control.dataset.richAction;
    if (action === "link") {
      const url = normalizeRichUrl(window.prompt("Dán link"));
      if (url) document.execCommand("createLink", false, url);
    } else if (action === "image-url") {
      const url = normalizeImageSource(window.prompt("Dán URL hoặc path ảnh"));
      if (url) insertRichHtml(surface, `<img src="${escapeAttr(resolveImage(url) || url)}" alt="">`);
    } else if (action === "image-file") {
      const input = control.closest(".rich-editor").querySelector("[data-rich-image-file]");
      if (input) input.click();
    }
    syncRichEditor(surface);
  }

  function handleRichToolbarSelect(control) {
    const surface = getRichEditorSurface(control);
    if (!surface || !control.value) return;
    surface.focus();
    if (control.matches("[data-rich-block]")) {
      document.execCommand("formatBlock", false, control.value);
    }
    if (control.matches("[data-rich-font-size]")) {
      document.execCommand("fontSize", false, control.value);
    }
    control.selectedIndex = 0;
    syncRichEditor(surface);
  }

  function insertRichImageFile(input) {
    const file = input.files && input.files[0];
    const surface = getRichEditorSurface(input);
    if (!file || !surface) return;
    const reader = new FileReader();
    reader.onload = () => {
      surface.focus();
      insertRichHtml(surface, `<img src="${escapeAttr(reader.result)}" alt="${escapeAttr(file.name || "")}">`);
      syncRichEditor(surface);
      input.value = "";
    };
    reader.readAsDataURL(file);
  }

  function insertRichHtml(surface, html) {
    document.execCommand("insertHTML", false, html);
    syncRichEditor(surface);
  }

  function syncRichEditors(scope) {
    const container = scope && scope.querySelectorAll ? scope : root;
    if (window.tinymce) window.tinymce.triggerSave();
    container.querySelectorAll(".rich-editor").forEach(syncRichEditor);
  }

  function syncRichEditor(surface) {
    const editor = surface && surface.closest ? surface.closest(".rich-editor") : null;
    const hidden = editor ? editor.querySelector("[data-rich-hidden]") : null;
    const counter = editor ? editor.querySelector(".rich-editor__label small") : null;
    const html = sanitizeRichHtml(surface.innerHTML).trim();
    if (hidden) hidden.value = html;
    if (counter) counter.textContent = `${formatNumber(stripHtml(html).length)} ký tự`;
  }

  function syncRichEditor(target) {
    const wrapper = target && target.matches && target.matches(".rich-editor")
      ? target
      : target && target.closest
        ? target.closest(".rich-editor")
        : null;
    if (!wrapper) return;
    const textarea = wrapper.querySelector("textarea[data-rich-editor]");
    if (!textarea) return;
    const tiny = window.tinymce && textarea.id ? window.tinymce.get(textarea.id) : null;
    const fallbackSurface = wrapper.querySelector("[data-rich-fallback-editor]");
    const html = sanitizeRichHtml(tiny ? tiny.getContent() : fallbackSurface ? fallbackSurface.innerHTML : textarea.value).trim();
    textarea.value = html;
    updateRichEditorCounter(wrapper, html);
  }

  function updateRichEditorCounter(wrapper, html) {
    const counter = wrapper ? wrapper.querySelector(".rich-editor__label small") : null;
    if (counter) counter.textContent = `${formatNumber(stripHtml(html).length)} ký tự`;
  }

  async function openEditorByKey(key) {
    let row = getAllContentRows().find((item) => item.key === key);
    if (!row) return;
    if (row.type === "products" && !state.data.productDetailsLoaded) {
      await ensureProductDetails();
      row = getAllContentRows().find((item) => item.key === key);
      if (!row) return;
    }
    state.editor = { ...row };
    render();
  }

  function openNewEditor(type) {
    const id = `local-${Date.now()}`;
    const row = normalizeRecord(type, {
      id,
      _id: id,
      slug: `new-${type}-${Date.now()}`,
      titleVi: "",
      title: "",
      summaryVi: "",
      status: "draft",
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, 0);
    row.isNew = true;
    state.editor = row;
    render();
  }

  function saveEditorDraft(form) {
    if (!state.editor) return;
    syncRichEditors(form);
    const now = new Date().toISOString();
    const formData = new FormData(form);
    const imageSlots = Array.from(form.querySelectorAll("[data-image-input]"))
      .sort((a, b) => Number(a.dataset.imageInput) - Number(b.dataset.imageInput))
      .map((input) => normalizeImageSource(input.value))
      .filter(Boolean);
    const fallbackImage = normalizeImageSource(formData.get("image"));
    const images = imageSlots.length ? imageSlots : [fallbackImage].filter(Boolean);
    const primaryImage = images[0] || fallbackImage;
    const title = String(formData.get("title") || "").trim();
    const category = String(formData.get("category") || "").trim();
    const summary = String(formData.get("summary") || "").trim();
    const priceText = String(formData.get("priceText") || "").trim();
    const availability = String(formData.get("availability") || "").trim();
    const descriptionInput = String(formData.get("descriptionHtml") || "").trim();
    const descriptionText = normalizeEditorText(descriptionInput);
    const descriptionHasHtml = /<[^>]+>/.test(descriptionInput);
    const bodyInput = String(formData.get("bodyText") || "").trim();
    const bodyText = normalizeEditorText(bodyInput);
    const bodyHasHtml = /<[^>]+>/.test(bodyInput);
    const features = splitLines(formData.get("featuresText"));
    const payload = {
      title,
      titleVi: title,
      titleEn: title,
      slug: slugify(String(formData.get("slug") || "")),
      status: String(formData.get("status") || "draft"),
      category,
      taglineVi: category,
      taglineEn: category,
      image: primaryImage,
      images,
      cover: primaryImage ? buildMediaObject(primaryImage, state.editor.cover, "catalogue") : null,
      hero: primaryImage ? buildMediaObject(primaryImage, state.editor.hero, "hero") : null,
      gallery: images.map((src, index) => buildMediaObject(src, Array.isArray(state.editor.gallery) ? state.editor.gallery[index] : null, "editorial")),
      summary,
      summaryVi: summary,
      summaryEn: summary,
      notes: String(formData.get("notes") || "").trim(),
      priceText,
      priceVi: priceText,
      priceEn: priceText ? priceText.replace(/đ$/i, " VND") : "",
      stock: formData.get("stock") === null || formData.get("stock") === "" ? "" : Number(formData.get("stock")),
      originalPriceText: String(formData.get("originalPriceText") || "").trim(),
      sku: String(formData.get("sku") || "").trim(),
      availability,
      availabilityVi: availability,
      availabilityEn: availability,
      descriptionHtml: descriptionInput,
      descriptionRichHtml: descriptionHasHtml ? descriptionInput : editorTextToHtml(descriptionText),
      descriptionHtmlVi: descriptionHasHtml ? descriptionInput : "",
      descriptionHtmlEn: descriptionHasHtml ? descriptionInput : "",
      fullDescription: descriptionHasHtml ? descriptionInput : editorTextToHtml(descriptionText),
      description: descriptionText || summary,
      descriptionVi: descriptionText || summary,
      descriptionEn: descriptionText || summary,
      bodyText,
      bodyRichHtml: bodyHasHtml ? bodyInput : editorTextToHtml(bodyText),
      contentHtml: bodyHasHtml ? bodyInput : editorTextToHtml(bodyText),
      content: bodyText,
      outcomesVi: features,
      outcomesEn: features,
      featuresText: features.join("\n"),
      age: splitCommaList(formData.get("ageText")),
      theme: splitCommaList(formData.get("themeText")),
      format: splitCommaList(formData.get("formatText")),
      difficulty: splitCommaList(formData.get("difficultyText")),
      ageText: String(formData.get("ageText") || "").trim(),
      themeText: String(formData.get("themeText") || "").trim(),
      formatText: String(formData.get("formatText") || "").trim(),
      difficultyText: String(formData.get("difficultyText") || "").trim(),
      metaTitle: String(formData.get("metaTitle") || "").trim(),
      metaDescription: String(formData.get("metaDescription") || "").trim(),
      keywords: String(formData.get("keywords") || "").trim(),
      featuredOrder: formData.get("featuredOrder") === null || formData.get("featuredOrder") === "" ? state.editor.featuredOrder : Number(formData.get("featuredOrder")),
      facts: buildProductFacts(category, availability, priceText),
      updatedAt: now,
    };
    const key = state.editor.key || `${state.editor.type}:${state.editor.id}`;
    state.drafts[key] = {
      key,
      type: state.editor.type,
      id: state.editor.id,
      originalSlug: state.editor.slug,
      isNew: Boolean(state.editor.isNew || (state.drafts[key] && state.drafts[key].isNew)),
      payload,
      updatedAt: now,
    };
    persistLocalChanges();
    toast("Đã cập nhật dữ liệu", "Thay đổi đã hiển thị ngay trong admin.");
    state.editor = null;
    render();
  }

  function saveProductQuickDraft(key, options) {
    const row = getAllContentRows().find((item) => item.key === key);
    const tableRow = root.querySelector(`[data-product-quick-row="${CSS.escape(String(key || ""))}"]`);
    if (!row || !tableRow) return;
    const valueOf = (field) => {
      const input = tableRow.querySelector(`[data-quick-field="${field}"]`);
      return input ? String(input.value || "").trim() : "";
    };
    const featuredInput = tableRow.querySelector('[data-quick-field="featured"]');
    const featuredOrderValue = valueOf("featuredOrder");
    const featuredOrder = featuredInput && featuredInput.checked
      ? (featuredOrderValue === "" ? (row.featuredOrder == null || row.featuredOrder === "" ? 0 : Number(row.featuredOrder)) : Number(featuredOrderValue))
      : "";
    const title = valueOf("title");
    const slug = slugify(valueOf("slug") || title);
    const image = normalizeImageSource(valueOf("image"));
    const category = valueOf("category");
    const priceText = fromEditableMoney(valueOf("priceText"));
    const payload = {
      title,
      titleVi: title,
      titleEn: title,
      slug,
      status: valueOf("status") || "draft",
      image,
      images: image ? [image] : [],
      cover: image ? buildMediaObject(image, row.cover, "catalogue") : null,
      hero: image ? buildMediaObject(image, row.hero, "hero") : null,
      gallery: image ? [buildMediaObject(image, Array.isArray(row.gallery) ? row.gallery[0] : null, "editorial")] : [],
      priceText,
      priceVi: priceText,
      priceEn: priceText ? priceText.replace(/đ$/i, " VND") : "",
      originalPriceText: fromEditableMoney(valueOf("originalPriceText")),
      stock: valueOf("stock") === "" ? "" : Number(valueOf("stock")),
      category,
      taglineVi: category,
      taglineEn: category,
      featuredOrder,
      facts: buildProductFacts(category, row.availability, priceText),
      updatedAt: new Date().toISOString(),
    };
    state.drafts[key] = {
      ...(state.drafts[key] || {}),
      key,
      type: row.type,
      id: row.id,
      originalSlug: row.slug,
      isNew: Boolean(row.isNew || (state.drafts[key] && state.drafts[key].isNew)),
      payload: { ...(state.drafts[key] && state.drafts[key].payload ? state.drafts[key].payload : {}), ...payload },
      updatedAt: payload.updatedAt,
    };
    persistLocalChanges();
    if (!options || !options.silent) toast("Đã lưu nhanh sản phẩm", `${title || slug} đã cập nhật trong admin.`);
    if (!options || !options.skipRender) render();
    return true;
  }

  function pickProductQuickCover(key, image) {
    const tableRow = root.querySelector(`[data-product-quick-row="${CSS.escape(String(key || ""))}"]`);
    if (!tableRow) return;
    const value = normalizeImageSource(image);
    const input = tableRow.querySelector('[data-quick-field="image"]');
    const cover = tableRow.querySelector(".product-quick-cover img");
    if (input) input.value = value;
    if (cover) cover.src = displayImageSrc(value);
    tableRow.classList.add("is-dirty");
    state.quickImagePicker = null;
    render();
  }

  function deleteRecord(key) {
    if (!key) return;
    const row = getAllContentRows().find((item) => item.key === key) || (state.editor && state.editor.key === key ? state.editor : null);
    if (!row) return;
    const label = row.title || row.slug || row.id;
    if (!window.confirm(`Xóa "${label}" khỏi dữ liệu admin local?`)) return;
    const now = new Date().toISOString();
    const existing = state.drafts[key];
    if ((existing && existing.isNew) || row.isNew) {
      delete state.drafts[key];
    } else {
      state.drafts[key] = {
        ...(existing || {}),
        key,
        type: row.type,
        id: row.id,
        originalSlug: row.slug,
        isNew: false,
        payload: existing && existing.payload ? existing.payload : {},
        deletedAt: now,
        updatedAt: now,
      };
    }
    persistLocalChanges();
    state.editor = null;
    toast("Đã xóa dữ liệu", "Mục này đã được ẩn khỏi danh sách admin.");
    render();
  }

  function getRows(type) {
    let source = [];
    if (type === "products") source = state.data.products;
    if (type === "welcome") source = getWelcomeSceneRecords();
    if (type === "projects") source = state.data.projects;
    if (type === "tutorials") source = state.data.tutorials;
    if (type === "news") source = state.data.news;
    if (type === "contact") source = getContactPageRecords();
    if (type === "policies") source = state.data.policies;

    const rows = source.map((item, index) => normalizeRecord(type, item, index)).filter((row) => !isLocallyDeleted(row.key));
    const keyedRows = rows.map(applyDraftToRow);
    Object.values(state.drafts)
      .filter((draft) => draft.type === type && draft.isNew && !draft.deletedAt && !keyedRows.some((row) => row.key === draft.key))
      .forEach((draft) => {
        keyedRows.push(applyDraftToRow(normalizeRecord(type, {
          _id: draft.id,
          id: draft.id,
          slug: draft.payload.slug,
          title: draft.payload.title,
          titleVi: draft.payload.title,
          summary: draft.payload.summary,
          summaryVi: draft.payload.summary,
          status: draft.payload.status,
          headline: draft.payload.title,
          body: draft.payload.summary,
          media: draft.payload.image ? { src: draft.payload.image } : null,
          cover: { src: draft.payload.image },
          image: draft.payload.image,
          priceText: draft.payload.priceText,
          stock: draft.payload.stock,
          category: draft.payload.category,
          createdAt: draft.updatedAt,
          updatedAt: draft.updatedAt,
        }, keyedRows.length)));
      });
    return keyedRows;
  }

  function getAllContentRows() {
    return CONTENT_TYPES.flatMap((type) => getRows(type.id));
  }

  function getWelcomeSceneRecords() {
    const core = state.data.core || {};
    const scenes = core.welcomeScenes && Array.isArray(core.welcomeScenes.vi) ? core.welcomeScenes.vi : [];
    return scenes.map((scene, index) => ({
      ...scene,
      _id: scene.id || `welcome-scene-${index + 1}`,
      id: scene.id || `welcome-scene-${index + 1}`,
      slug: scene.id || `scene-${index + 1}`,
      title: scene.headline || scene.title,
      summary: scene.body || scene.summary,
      description: scene.body || scene.description,
      content: scene.body || "",
      category: scene.type || "scene",
      status: "published",
      updatedAt: core.runtimeTuning && core.runtimeTuning.assetVersion ? core.runtimeTuning.assetVersion : "",
      image: pickImageSource(scene.media),
      cover: scene.media,
      hero: scene.secondaryMedia,
      metaTitle: scene.eyebrow || "",
      metaDescription: scene.body || "",
    }));
  }

  function getContactPageRecords() {
    const core = state.data.core || {};
    const strings = core.locales && core.locales.vi ? core.locales.vi : {};
    const page = strings.contactPage || {};
    const pageMeta = strings.pageMeta && strings.pageMeta.contact ? strings.pageMeta.contact : {};
    const siteMeta = core.siteMeta || {};
    const contact = siteMeta.contact || {};
    const bodyParts = [
      page.channelsTitle,
      page.channelsIntro,
      page.socialTitle,
      page.socialIntro,
      page.formTitle,
      page.formIntro,
      page.mapTitle,
      page.mapCopy,
      page.policyLead,
      contact.phone ? `Phone: ${contact.phone}` : "",
      contact.email ? `Email: ${contact.email}` : "",
      contact.address && contact.address.vi ? `Address: ${contact.address.vi}` : "",
      contact.hours && contact.hours.vi ? `Hours: ${contact.hours.vi}` : "",
    ].filter(Boolean);
    const image = pickImageSource(siteMeta.pageAssets && siteMeta.pageAssets.contact) || pickImageSource(core.heroAsset && core.heroAsset.contact);
    return [{
      _id: "contact-page",
      id: "contact-page",
      slug: "contact",
      title: page.title || pageMeta.title || "Contact",
      summary: page.intro || pageMeta.description || "",
      description: page.intro || "",
      content: bodyParts.join("\n\n"),
      category: "Trang liên hệ",
      status: "published",
      updatedAt: core.runtimeTuning && core.runtimeTuning.assetVersion ? core.runtimeTuning.assetVersion : "",
      image,
      cover: image ? { src: image } : null,
      metaTitle: pageMeta.title || "",
      metaDescription: pageMeta.description || "",
    }];
  }

  function getFilteredRows(type) {
    const query = normalizeSearch(state.filters.query);
    return getRows(type)
      .filter((row) => {
        if (!query) return true;
        return normalizeSearch([row.title, row.slug, row.summary, row.category, row.author].join(" ")).includes(query);
      })
      .filter((row) => {
        if (state.filters.status === "all") return true;
        if (state.filters.status === "needs-work") return row.quality < 72;
        if (state.filters.status === "draft") return row.status === "draft" || row.hasDraft;
        return row.status === state.filters.status;
      })
      .sort(sortRows);
  }

  function normalizeRecord(type, item, index) {
    const normalized = item || {};
    const id = type === "products" && normalized.slug ? normalized.slug : normalized._id || normalized.id || normalized.slug || `${type}-${index + 1}`;
    const title = text(normalized.titleVi || normalized.title || normalized.headlineVi || normalized.headline || normalized.name || normalized.titleEn || normalized.code || "");
    const slug = slugify(text(normalized.slug || normalized.sourceSlug || title || id));
    const imageList = collectProductImages(normalized);
    const image = resolveImage(
      imageList[0] ||
        (normalized.cover && normalized.cover.src
          ? normalized.cover.src
          : normalized.hero && normalized.hero.src
            ? normalized.hero.src
            : normalized.image || extractFirstImage(normalized.content || normalized.contentHtml || normalized.fullDescription || "")),
    );
    const summary = text(normalized.summaryVi || normalized.summary || normalized.excerpt || normalized.description || normalized.bodyVi || normalized.body || stripHtml(normalized.content || normalized.contentHtml || "").slice(0, 220));
    const status = normalizeStatus(normalized);
    const category = text(
      normalized.taglineVi ||
        normalized.categoryVi ||
        normalized.category ||
        normalized.categoryName ||
        getFactValue(normalized, "Danh mục") ||
        "",
    );
    const priceText = text(normalized.priceVi || normalized.priceText || (normalized.price ? formatMoney(Number(normalized.price)) : ""));
    const stock = normalized.stock == null ? "" : normalized.stock;
    const updatedAt = normalized.updatedAt || normalized.publishedAt || normalized.createdAt || "";
    const href = buildRecordHref(type, slug);
    const rawDetailDescription = normalized.fullDescription || normalized.descriptionHtmlVi || normalized.descriptionHtml || normalized.contentHtml || normalized.descriptionVi || normalized.description || normalized.bodyVi || normalized.body || normalized.content || "";
    const rawBodyContent = normalized.bodyText || normalized.contentHtml || normalized.content || normalized.bodyVi || normalized.body || rawDetailDescription;
    const descriptionHtml = htmlToEditorText(rawDetailDescription);
    const fullDescription = htmlToEditorText(normalized.fullDescription || rawDetailDescription);
    const descriptionRichHtml = richEditorHtml(rawDetailDescription);
    const bodyRichHtml = richEditorHtml(rawBodyContent);
    const outcomes = Array.isArray(normalized.outcomesVi) && normalized.outcomesVi.length
      ? normalized.outcomesVi
      : Array.isArray(normalized.outcomes)
        ? normalized.outcomes
        : splitLines(normalized.features);
    const row = {
      key: `${type}:${id}`,
      id: String(id),
      type,
      title,
      slug,
      image,
      images: imageList,
      gallery: imageList.map((src, galleryIndex) => buildMediaObject(src, Array.isArray(normalized.gallery) ? normalized.gallery[galleryIndex] : null, "editorial")),
      cover: image ? buildMediaObject(image, normalized.cover, "catalogue") : normalized.cover,
      hero: image ? buildMediaObject(image, normalized.hero, "hero") : normalized.hero,
      summary,
      status,
      category,
      priceText,
      originalPriceText: text(normalized.originalPriceVi || normalized.originalPriceText || (normalized.originalPrice ? formatMoney(Number(normalized.originalPrice)) : "")),
      stock,
      sku: text(normalized.sku || ""),
      availability: text(normalized.availabilityVi || normalized.availability || getFactValue(normalized, "Tình trạng") || ""),
      descriptionHtml,
      descriptionRichHtml,
      fullDescription,
      description: text(normalized.descriptionVi || normalized.description || descriptionHtml || summary),
      bodyText: normalizeEditorText(rawBodyContent),
      bodyRichHtml,
      featuresText: outcomes.map(text).join("\n"),
      ageText: arrayToText(normalized.age),
      themeText: arrayToText(normalized.theme),
      formatText: arrayToText(normalized.format),
      difficultyText: arrayToText(normalized.difficulty),
      age: Array.isArray(normalized.age) ? normalized.age : splitCommaList(normalized.age),
      theme: Array.isArray(normalized.theme) ? normalized.theme : splitCommaList(normalized.theme),
      format: Array.isArray(normalized.format) ? normalized.format : splitCommaList(normalized.format),
      difficulty: Array.isArray(normalized.difficulty) ? normalized.difficulty : splitCommaList(normalized.difficulty),
      metaTitle: text(normalized.metaTitle || ""),
      metaDescription: text(normalized.metaDescription || ""),
      keywords: Array.isArray(normalized.keywords) ? normalized.keywords.join(", ") : text(normalized.keywords || ""),
      featuredOrder: normalized.featuredOrder,
      author: text(normalized.authorVi || normalized.author || ""),
      updatedAt,
      href,
      notes: "",
      raw: normalized,
    };
    row.quality = scoreRecord(row);
    return row;
  }

  function applyDraftToRow(row) {
    const draft = state.drafts[row.key];
    if (!draft || draft.deletedAt) return row;
    const next = { ...row, ...draft.payload, isNew: Boolean(draft.isNew || row.isNew), hasDraft: true, hasLocalChange: true, draftUpdatedAt: draft.updatedAt };
    if (draft.payload.image) next.image = resolveImage(draft.payload.image);
    if (draft.payload.slug) next.href = buildRecordHref(next.type, draft.payload.slug);
    next.quality = scoreRecord(next);
    return next;
  }

  function buildRecordHref(type, slug) {
    const meta = getTypeMeta(type);
    if (!slug) return meta.singleton ? meta.hrefBase : "";
    if (meta.singleton) return meta.hrefBase;
    if (meta.routeMode === "hash") return `${meta.hrefBase}#${slug}`;
    return `${meta.hrefBase}${slug}/`;
  }

  function sortRows(left, right) {
    if (state.filters.sort === "title") return (left.title || "").localeCompare(right.title || "", "vi");
    if (state.filters.sort === "updated") return new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0);
    if (state.filters.sort === "stock") return Number(left.stock || 999999) - Number(right.stock || 999999);
    return left.quality - right.quality || (left.title || "").localeCompare(right.title || "", "vi");
  }

  function scoreRecord(row) {
    let score = 100;
    if (!row.title) score -= 22;
    if (!row.slug) score -= 12;
    if (!row.summary || row.summary.length < 45) score -= 16;
    if (!row.image) score -= 14;
    if (row.status !== "published") score -= 8;
    if ((row.title || "").length > 78) score -= 8;
    if ((row.slug || "").length > 80) score -= 5;
    if (row.type === "products") {
      if (!row.priceText) score -= 8;
      if (row.stock === "" || row.stock == null) score -= 4;
      if (!row.category) score -= 5;
    }
    return clamp(score, 0, 100);
  }

  function buildInsights(rows) {
    const products = rows.filter((row) => row.type === "products");
    const insights = [];
    const lowQuality = rows.filter((row) => row.quality < 72).length;
    const missingImages = rows.filter((row) => !row.image).length;
    const lowStock = products.filter((row) => Number(row.stock) > 0 && Number(row.stock) <= 10).length;
    const duplicateSlugs = countDuplicateSlugs(rows);
    const localChanges = countLocalChanges();
    if (lowQuality) {
      insights.push({
        level: "danger",
        title: `${lowQuality} nội dung cần xử lý trước`,
        body: "Các mục này thiếu summary, media, giá hoặc metadata quan trọng.",
        action: { view: "content", label: "Xử lý" },
      });
    }
    if (duplicateSlugs) {
      insights.push({
        level: "danger",
        title: `${duplicateSlugs} slug đang trùng`,
        body: "Slug trùng có thể làm route chi tiết bị đè hoặc sai canonical.",
        action: { view: "seo", label: "SEO" },
      });
    }
    if (missingImages) {
      insights.push({
        level: "warn",
        title: `${missingImages} mục thiếu ảnh cover`,
        body: "Cover ảnh hưởng trực tiếp đến catalogue, archive và social preview.",
        action: { view: "media", label: "Media" },
      });
    }
    if (lowStock) {
      insights.push({
        level: "warn",
        title: `${lowStock} sản phẩm tồn kho thấp`,
        body: "Nên rà soát tình trạng bán, CTA và thông điệp liên hệ.",
        action: { view: "products", label: "Sản phẩm" },
      });
    }
    if (localChanges) {
      insights.push({
        level: "info",
        title: `${localChanges} thay đổi local`,
        body: "Xuất thay đổi để cập nhật vào source hoặc bàn giao cho người nhập liệu.",
        action: { view: "system", label: "Xuất" },
      });
    }
    if (!state.data.orders && state.data.counts && state.data.counts.orders) {
      insights.push({
        level: "info",
        title: "Dữ liệu đơn hàng đang để lazy-load",
        body: "Mở tab Đơn hàng khi cần xem chi tiết để tránh admin tải nặng ngay từ đầu.",
        action: { view: "orders", label: "Tải đơn" },
      });
    }
    return insights.slice(0, 8);
  }

  function buildActivity(rows) {
    const draftRows = rows.filter((row) => row.hasDraft).sort((a, b) => new Date(b.draftUpdatedAt || 0) - new Date(a.draftUpdatedAt || 0));
    const recentRows = rows.filter((row) => row.updatedAt).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    return [...draftRows, ...recentRows].filter(uniqueByKey);
  }

  function getEditorSuggestions(row) {
    const suggestions = [];
    if (!row.summary || row.summary.length < 80) suggestions.push("Viết summary 80-160 ký tự để card và SEO rõ hơn.");
    if (!row.image) suggestions.push("Bổ sung ảnh cover đúng sản phẩm hoặc trạng thái thực tế.");
    if ((row.title || "").length > 68) suggestions.push("Rút gọn title để hiển thị tốt hơn trên mobile và search snippet.");
    if (row.type === "products" && !row.priceText) suggestions.push("Bổ sung giá hoặc chuyển rõ sang CTA liên hệ.");
    if (row.type === "products" && Number(row.stock) <= 10 && Number(row.stock) > 0) suggestions.push("Tồn kho thấp, nên kiểm tra lại availability và CTA.");
    if (row.status !== "published") suggestions.push("Đang không public hoàn toàn, kiểm tra trước khi export.");
    return suggestions;
  }

  function getCommandResults() {
    const query = normalizeSearch(state.commandQuery);
    const navResults = NAV_ITEMS.map((item) => ({
      kind: "view",
      value: item.id,
      title: item.label,
      subtitle: "Mở khu vực admin",
      icon: item.icon,
    }));
    const rowResults = getAllContentRows()
      .filter((row) => !query || normalizeSearch([row.title, row.slug, row.category].join(" ")).includes(query))
      .slice(0, 12)
      .map((row) => ({
        kind: "row",
        value: row.key,
        title: row.title || row.slug,
        subtitle: `${getTypeMeta(row.type).label} · quality ${row.quality}%`,
        icon: "edit",
      }));
    return [...navResults.filter((item) => !query || normalizeSearch(`${item.title} ${item.subtitle}`).includes(query)), ...rowResults].slice(0, 16);
  }

  function collectMedia() {
    const seen = new Set();
    const media = [];
    getAllContentRows().forEach((row) => {
      getRowImageList(row).forEach((src, index) => {
        if (!src || seen.has(src)) return;
        seen.add(src);
        media.push({
          src,
          title: index === 0 ? row.title : `${row.title} #${index + 1}`,
          type: getTypeMeta(row.type).label,
          key: row.key,
        });
      });
    });
    return media;
  }

  function buildExportSnapshot() {
    const records = getAllContentRows().map((row) => ({
      key: row.key,
      type: row.type,
      id: row.id,
      title: row.title,
      slug: row.slug,
      status: row.status,
      quality: row.quality,
      category: row.category,
      summary: row.summary,
      image: row.image,
      href: row.href,
      hasDraft: Boolean(row.hasDraft),
    }));
    return {
      exportedAt: new Date().toISOString(),
      summary: {
        records: records.length,
        localChanges: countLocalChanges(),
        products: getRows("products").length,
        projects: getRows("projects").length,
        tutorials: getRows("tutorials").length,
        news: getRows("news").length,
        policies: getRows("policies").length,
        healthScore: getHealthScore(records),
      },
      records,
      localChanges: state.drafts,
    };
  }

  async function loadCounts() {
    state.loading.counts = true;
    renderIfAuthenticated();
    const counts = await fetchJson(ENDPOINTS.counts, "counts");
    if (counts) state.data.counts = counts;
    state.loading.counts = false;
    renderIfAuthenticated();
  }

  async function loadArchiveData(force) {
    if (state.loading.archives && !force) return;
    state.loading.archives = true;
    renderIfAuthenticated();
    const [products, projects, tutorials, tutorialCategories, news, newsCategories] = await Promise.all([
      fetchJson(ENDPOINTS.products, "products"),
      fetchJson(ENDPOINTS.projects, "projects"),
      fetchJson(ENDPOINTS.tutorials, "tutorials"),
      fetchJson(ENDPOINTS.tutorialCategories, "tutorialCategories"),
      fetchJson(ENDPOINTS.news, "news"),
      fetchJson(ENDPOINTS.newsCategories, "newsCategories"),
    ]);
    if (Array.isArray(products) && products.length) {
      state.data.products = mergeProductsWithMigration(state.data.products, products);
      state.data.productDetailsLoaded = true;
    }
    if (Array.isArray(projects) && projects.length) state.data.projects = projects;
    if (Array.isArray(tutorials)) state.data.tutorials = attachCategoryNames(tutorials, tutorialCategories);
    if (Array.isArray(news)) state.data.news = attachCategoryNames(news, newsCategories);
    state.loading.archives = false;
    renderIfAuthenticated();
  }

  async function ensureProductDetails(force) {
    if (state.data.productDetailsLoaded && !force) return;
    if (state.productDetailsPromise && !force) return state.productDetailsPromise;
    state.loading.products = true;
    renderIfAuthenticated();
    state.productDetailsPromise = fetchJson(ENDPOINTS.products, "products")
      .then((products) => {
        if (Array.isArray(products) && products.length) {
          state.data.products = mergeProductsWithMigration(state.data.products, products);
          state.data.productDetailsLoaded = true;
        }
      })
      .finally(() => {
        state.loading.products = false;
        state.productDetailsPromise = null;
        renderIfAuthenticated();
      });
    return state.productDetailsPromise;
  }

  async function ensureOrders(force) {
    if (state.data.orders && !force) return;
    state.loading.orders = true;
    renderIfAuthenticated();
    const orders = await fetchJson(ENDPOINTS.orders, "orders");
    state.data.orders = Array.isArray(orders) ? orders.map(projectOrder) : [];
    state.loading.orders = false;
    renderIfAuthenticated();
  }

  async function ensureUsers(force) {
    if (state.data.users && !force) return;
    state.loading.users = true;
    renderIfAuthenticated();
    const users = await fetchJson(ENDPOINTS.users, "users");
    state.data.users = Array.isArray(users) ? users.map(projectUser) : [];
    state.loading.users = false;
    renderIfAuthenticated();
  }

  async function ensureSeo(force) {
    if (state.data.seoPages && !force) return;
    state.loading.seo = true;
    renderIfAuthenticated();
    const [pages, keywords, backlinks] = await Promise.all([
      fetchJson(ENDPOINTS.seoPages, "seoPages"),
      fetchJson(ENDPOINTS.seoKeywords, "seoKeywords"),
      fetchJson(ENDPOINTS.seoBacklinks, "seoBacklinks"),
    ]);
    state.data.seoPages = Array.isArray(pages) ? normalizeDataTree(pages) : [];
    state.data.seoKeywords = Array.isArray(keywords) ? normalizeDataTree(keywords) : [];
    state.data.seoBacklinks = Array.isArray(backlinks) ? normalizeDataTree(backlinks) : [];
    state.loading.seo = false;
    renderIfAuthenticated();
  }

  async function fetchJson(url, key) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      delete state.errors[key];
      return normalizeDataTree(json);
    } catch (error) {
      state.errors[key] = error && error.message ? error.message : "Không tải được";
      return null;
    }
  }

  function projectOrder(order) {
    const items = Array.isArray(order.items) ? order.items : [];
    const itemTotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || item.qty || 1), 0);
    return {
      id: order._id || order.id || order.code,
      code: order.code || order.orderCode || order._id || "",
      customer: text((order.user && order.user.name) || order.customerName || order.name || ""),
      email: text((order.user && order.user.email) || order.email || ""),
      itemCount: items.reduce((sum, item) => sum + Number(item.quantity || item.qty || 1), 0),
      total: Number(order.total || order.totalAmount || order.amount || itemTotal || 0),
      status: text(order.status || order.paymentStatus || "pending"),
      createdAt: order.createdAt || order.updatedAt || "",
    };
  }

  function projectUser(user) {
    return {
      id: user._id || user.id || user.email || "",
      name: text([user.firstName, user.lastName].filter(Boolean).join(" ") || user.name || ""),
      email: text(user.email || ""),
      role: text(user.role || "user"),
      isActive: user.isActive !== false,
      isEmailVerified: Boolean(user.isEmailVerified),
      googleId: user.googleId || "",
      newsletter: Boolean(user.newsletter),
      lastLogin: user.lastLogin || "",
      lastLoginAt: user.lastLoginAt || "",
      language: user.preferences && user.preferences.language,
      theme: user.preferences && user.preferences.theme,
    };
  }

  function mergeProductsWithMigration(baseProducts, migratedProducts) {
    const migratedBySlug = new Map(
      (Array.isArray(migratedProducts) ? migratedProducts : [])
        .map((product) => [slugify(product.slug || product.sourceSlug || product.title || product.name || ""), product])
        .filter(([slug]) => Boolean(slug)),
    );
    const merged = (Array.isArray(baseProducts) ? baseProducts : []).map((product) => {
      const slug = slugify(product.slug || product.sourceSlug || product.title || product.name || "");
      const migrated = migratedBySlug.get(slug);
      return migrated ? mergeProductRecord(product, migrated) : normalizeProductImagePaths(product);
    });
    const knownSlugs = new Set(merged.map((product) => slugify(product.slug || product.sourceSlug || product.title || product.name || "")));
    migratedBySlug.forEach((product, slug) => {
      if (!knownSlugs.has(slug)) merged.push(normalizeProductImagePaths(product));
    });
    return merged;
  }

  function mergeProductRecord(product, migrated) {
    const images = collectProductImages(migrated);
    const firstImage = images[0] || pickImageSource(product);
    const next = {
      ...product,
      ...Object.fromEntries(Object.entries(migrated || {}).filter(([, value]) => value !== undefined && value !== null && value !== "")),
      cover: firstImage ? buildMediaObject(firstImage, product.cover || migrated.cover, "catalogue") : product.cover,
      hero: firstImage ? buildMediaObject(firstImage, product.hero || migrated.hero, "hero") : product.hero,
      image: firstImage || product.image || migrated.image || "",
    };
    if (images.length) {
      next.images = images;
      next.gallery = images.map((src, index) => buildMediaObject(src, Array.isArray(product.gallery) ? product.gallery[index] : null, "editorial"));
    }
    return normalizeProductImagePaths(next);
  }

  function normalizeProductImagePaths(product) {
    const next = { ...(product || {}) };
    const images = collectProductImages(next);
    const firstImage = images[0] || pickImageSource(next);
    if (firstImage) {
      next.image = normalizeImageSource(firstImage);
      next.cover = buildMediaObject(next.image, next.cover, "catalogue");
      next.hero = buildMediaObject(next.image, next.hero, "hero");
    }
    if (images.length) {
      next.images = images.map(normalizeImageSource);
      next.gallery = next.images.map((src, index) => buildMediaObject(src, Array.isArray(next.gallery) ? next.gallery[index] : null, "editorial"));
    }
    return next;
  }

  function collectProductImages(product) {
    return uniqueImageSources(collectMediaSources(product));
  }

  function getRowImageList(row) {
    return uniqueImageSources([
      ...(Array.isArray(row && row.images) ? row.images : []),
      ...(Array.isArray(row && row.gallery) ? row.gallery.map((item) => pickImageSource(item)) : []),
      ...(collectMediaSources(row && row.raw)),
      row && row.image,
      pickImageSource(row && row.media),
      pickImageSource(row && row.secondaryMedia),
      pickImageSource(row && row.cover),
      pickImageSource(row && row.hero),
    ]);
  }

  function uniqueImageSources(sources) {
    return Array.from(new Set((Array.isArray(sources) ? sources : []).map(normalizeImageSource).filter(Boolean)));
  }

  function collectMediaSources(value, seen) {
    if (!value) return [];
    if (typeof value === "string") {
      const htmlImages = value.includes("<img") || value.includes("<IMG") ? extractImagesFromHtml(value) : [];
      if (htmlImages.length) return htmlImages;
      return isLikelyImageSource(value) ? [value] : [];
    }
    if (Array.isArray(value)) {
      return value.flatMap((item) => collectMediaSources(item, seen));
    }
    if (typeof value !== "object") return [];
    const visited = seen || new WeakSet();
    if (visited.has(value)) return [];
    visited.add(value);
    return Object.entries(value).flatMap(([key, entry]) => {
      if (!isMediaLikeKey(key)) return [];
      return collectMediaSources(entry, visited);
    });
  }

  function isMediaLikeKey(key) {
    return /^(src|url|path|secureUrl)$/i.test(key) || /(image|media|cover|hero|gallery|thumb|poster|asset|attachment|content|body|description|html|slide|block|section)/i.test(key);
  }

  function isLikelyImageSource(value) {
    const source = String(value || "").trim();
    if (!source || source.length > 2000) return false;
    if (/^data:image\//i.test(source)) return true;
    if (!/^(https?:\/\/|\/|\.?\/)/i.test(source)) return false;
    return /\.(avif|webp|png|jpe?g|gif|svg)([?#].*)?$/i.test(source) || /\/(images|uploads|assets\/img)\//i.test(source);
  }

  function extractImagesFromHtml(html) {
    const images = [];
    String(html || "").replace(/<img[^>]+src=["']([^"']+)["']/gi, (_match, src) => {
      images.push(src);
      return "";
    });
    return images;
  }

  function getEditorDescription(row) {
    return normalizeEditorText(row.descriptionHtml || row.fullDescription || row.description || "");
  }

  function pickImageSource(value) {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value.src || value.url || value.path || value.secureUrl || "";
  }

  function buildMediaObject(src, base, role) {
    return {
      ...(base && typeof base === "object" ? base : {}),
      src: normalizeImageSource(src),
      width: base && base.width ? base.width : 800,
      height: base && base.height ? base.height : 1000,
      ratio: base && base.ratio ? base.ratio : "4 / 5",
      fit: base && base.fit ? base.fit : "cover",
      role,
    };
  }

  function attachCategoryNames(items, categories) {
    const categoryMap = new Map((Array.isArray(categories) ? categories : []).map((category) => [category._id || category.id, text(category.name || category.title || "")]));
    return items.map((item) => ({
      ...item,
      categoryName: item.categoryName || categoryMap.get(item.categoryId) || "",
    }));
  }

  function exportDrafts() {
    downloadJson("stemora-admin-local-changes.json", {
      exportedAt: new Date().toISOString(),
      count: countLocalChanges(),
      localChanges: state.drafts,
      records: getAllContentRows(),
    });
  }

  function exportCurrentView() {
    if (state.view === "orders") {
      downloadJson("stemora-orders-view.json", state.data.orders || []);
      return;
    }
    if (state.view === "customers") {
      downloadJson("stemora-customers-view.json", state.data.users || []);
      return;
    }
    const type = state.view === "products" ? "products" : state.filters.contentType;
    downloadJson(`stemora-${state.view}-${type}.json`, getFilteredRows(type));
  }

  function importDrafts(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result || "{}"));
        const incoming = json.localChanges || json.drafts || json;
        if (!incoming || typeof incoming !== "object") throw new Error("File không có local changes object.");
        state.drafts = { ...state.drafts, ...incoming };
        persistLocalChanges();
        toast("Đã import dữ liệu local", `${Object.keys(incoming).length} mục đã được nạp.`);
        render();
      } catch (error) {
        toast("Import lỗi", error.message || "Không đọc được file JSON.");
        render();
      }
    };
    reader.readAsText(file);
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast("Đã tạo file export", filename);
    renderIfAuthenticated();
  }

  function toast(title, body) {
    const id = `${Date.now()}-${Math.random()}`;
    state.toasts.push({ id, title, body });
    window.setTimeout(() => {
      state.toasts = state.toasts.filter((toastItem) => toastItem.id !== id);
      renderIfAuthenticated();
    }, 3600);
  }

  function renderIfAuthenticated() {
    if (state.authenticated) render();
  }

  function getTypeMeta(type) {
    return CONTENT_TYPES.find((item) => item.id === type) || CONTENT_TYPES[0];
  }

  function getHealthScore(rows) {
    if (!rows.length) return 0;
    return Math.round(rows.reduce((sum, row) => sum + Number(row.quality || 0), 0) / rows.length);
  }

  function getHealthLabel(score) {
    if (score >= 86) return "Nội dung ổn, chỉ cần tối ưu điểm nhỏ.";
    if (score >= 72) return "Đủ vận hành, nên xử lý các mục quality thấp.";
    return "Cần rà soát dữ liệu trước khi public rộng.";
  }

  function countDrafts(rows) {
    return rows.filter((row) => row.status === "draft" || row.hasDraft).length;
  }

  function countLocalChanges() {
    return Object.values(state.drafts || {}).filter(Boolean).length;
  }

  function isLocallyDeleted(key) {
    return Boolean(state.drafts && state.drafts[key] && state.drafts[key].deletedAt);
  }

  function persistLocalChanges() {
    localStorage.setItem(STORAGE.drafts, JSON.stringify(state.drafts));
  }

  function splitLines(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  function normalizeEditorText(value) {
    return htmlToEditorText(value)
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function richEditorHtml(value) {
    const source = String(value || "").trim();
    if (!source) return "";
    const html = /<[^>]+>/.test(source) ? source : editorTextToHtml(source);
    return sanitizeRichHtml(html);
  }

  function sanitizeRichHtml(value) {
    const source = String(value || "");
    if (!source) return "";
    const template = document.createElement("template");
    template.innerHTML = source
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "");
    template.content.querySelectorAll("*").forEach((node) => {
      Array.from(node.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const attributeValue = String(attribute.value || "");
        if (name.startsWith("on")) node.removeAttribute(attribute.name);
        if ((name === "href" || name === "src") && /^javascript:/i.test(attributeValue)) {
          node.removeAttribute(attribute.name);
        }
      });
      if (node.tagName === "A" && node.getAttribute("href")) {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener");
      }
    });
    return template.innerHTML;
  }

  function htmlToEditorText(value) {
    const source = text(value || "");
    if (!source) return "";
    const withBreaks = source
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(div|p|li|h[1-6])>/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, "");
    return decodeHtmlEntities(withBreaks)
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function editorTextToHtml(value) {
    const lines = normalizeEditorText(value).split(/\n+/).map((line) => line.trim()).filter(Boolean);
    return lines.map((line) => `<div>${escapeHtml(line)}</div>`).join("");
  }

  function normalizeRichUrl(value) {
    const source = String(value || "").trim();
    if (!source || /^javascript:/i.test(source)) return "";
    if (/^(https?:|mailto:|tel:|\/|#)/i.test(source)) return source;
    return `https://${source}`;
  }

  function decodeHtmlEntities(value) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = value;
    return textarea.value;
  }

  function splitCommaList(value) {
    return String(value || "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  function arrayToText(value) {
    return Array.isArray(value) ? value.map(text).filter(Boolean).join(", ") : text(value || "");
  }

  function buildProductFacts(category, availability, priceText) {
    return [
      category ? { labelVi: "Danh mục", labelEn: "Category", valueVi: category, valueEn: category } : null,
      availability ? { labelVi: "Tình trạng", labelEn: "Stock", valueVi: availability, valueEn: availability } : null,
      priceText ? { labelVi: "Giá", labelEn: "Price", valueVi: priceText, valueEn: priceText.replace(/đ$/i, " VND") } : null,
    ].filter(Boolean);
  }

  function countDuplicateSlugs(rows) {
    const groups = rows.reduce((map, row) => {
      const key = `${row.type}:${row.slug}`;
      map.set(key, (map.get(key) || 0) + 1);
      return map;
    }, new Map());
    return Array.from(groups.values()).filter((count) => count > 1).length;
  }

  function sumOrders(orders) {
    return (orders || []).reduce((sum, order) => sum + Number(order.total || 0), 0);
  }

  function normalizeStatus(item) {
    if (item.status) {
      const status = String(item.status).toLowerCase();
      if (status === "published" || status === "active") return "published";
      if (status === "hidden" || status === "inactive" || status === "archived") return "hidden";
      return "draft";
    }
    if (item.isActive === false) return "hidden";
    return "published";
  }

  function getFactValue(item, label) {
    const facts = Array.isArray(item.facts) ? item.facts : [];
    const fact = facts.find((entry) => normalizeSearch(entry.labelVi || entry.labelEn || "").includes(normalizeSearch(label)));
    return fact ? fact.valueVi || fact.valueEn || "" : "";
  }

  function hasLoadedSource(key) {
    if (key === "counts") return Boolean(state.data.counts);
    if (key === "orders") return Boolean(state.data.orders);
    if (key === "users") return Boolean(state.data.users);
    if (key === "seoPages") return Boolean(state.data.seoPages);
    if (key === "seoKeywords") return Boolean(state.data.seoKeywords);
    if (key === "seoBacklinks") return Boolean(state.data.seoBacklinks);
    if (key === "projects") return state.data.projects.length > 0;
    if (key === "tutorials") return state.data.tutorials.length > 0;
    if (key === "news") return state.data.news.length > 0;
    if (key === "tutorialCategories" || key === "newsCategories") return state.data.tutorials.length > 0 || state.data.news.length > 0;
    return false;
  }

  function extractFirstImage(html) {
    const match = String(html || "").match(/<img[^>]+src=["']([^"']+)["']/i);
    return match ? match[1] : "";
  }

  function stripHtml(value) {
    return String(value || "")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function resolveImage(src) {
    const value = normalizeImageSource(src);
    if (!value) return "";
    if (/^(https?:|data:|\/)/i.test(value)) return value;
    return `/${value.replace(/^\.?\//, "")}`;
  }

  function displayImageSrc(src) {
    const value = resolveImage(src || "");
    if (!value) return DEFAULT_IMAGE;
    return value;
  }

  function normalizeImageSource(src) {
    const value = text(src || "").trim();
    if (!value) return "";
    if (/^(undefined|null|nan)$/i.test(value)) return "";
    const smartSteamMatch = value.match(/^https?:\/\/api\.smartsteam\.store(\/images\/[^?#]+)/i);
    if (smartSteamMatch) return smartSteamMatch[1];
    return value;
  }

  function slugify(value) {
    const source = text(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return source || "untitled";
  }

  function normalizeSearch(value) {
    return text(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");
  }

  function text(value) {
    return normalizeText(value == null ? "" : String(value));
  }

  function normalizeText(value) {
    const source = String(value || "");
    if (!source || !SUSPICIOUS_TEXT_PATTERN.test(source) || !utf8Decoder) return source;
    const candidates = [source];
    const once = decodeWin1252AsUtf8(source);
    if (once && once !== source) candidates.push(once);
    const twice = decodeWin1252AsUtf8(once);
    if (twice && twice !== once) candidates.push(twice);
    return candidates
      .map((candidate) => ({ candidate, score: scoreTextQuality(candidate) }))
      .sort((left, right) => right.score - left.score || left.candidate.length - right.candidate.length)[0]
      .candidate;
  }

  function decodeWin1252AsUtf8(source) {
    if (!utf8Decoder) return source;
    const bytes = [];
    for (let index = 0; index < source.length; index += 1) {
      const code = source.charCodeAt(index);
      if (code <= 0xff) {
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
    const suspiciousPenalty = (source.match(/(?:\u00C3|\u00C2|\u00C4|\u00C5|\u00C6|\u00D0|\u00E1\u00BA|\u00E1\u00BB|\u00E2\u20AC)/g) || []).length * 12;
    const controlPenalty = (source.match(/[\u0080-\u009F]/g) || []).length * 25;
    const vietnameseBonus = (source.match(/[à-ỹÀ-ỸđĐ]/g) || []).length * 2;
    return vietnameseBonus - suspiciousPenalty - controlPenalty;
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

  function getSessionUser() {
    const session = readStoredJson(STORAGE.session, null, sessionStorage);
    if (!session || !session.userId) return null;
    return state.users.find((user) => user.id === session.userId) || null;
  }

  function persistUsers() {
    localStorage.setItem(STORAGE.users, JSON.stringify(state.users));
  }

  async function createPasswordUser({ name, email, password, role }) {
    const salt = createId("salt");
    const now = new Date().toISOString();
    const user = {
      id: createId("user"),
      name: name || email.split("@")[0],
      email: normalizeEmail(email),
      role: role || (state.users.length ? "editor" : "owner"),
      providers: ["password"],
      salt,
      passwordHash: await hashPassword(password, salt),
      createdAt: now,
      lastLoginAt: now,
    };
    state.users = [...state.users, user];
    persistUsers();
    return user;
  }

  function upsertGoogleUser(profile) {
    const email = normalizeEmail(profile.email || "");
    if (!email) return null;
    const now = new Date().toISOString();
    const existing = state.users.find((user) => user.email === email);
    if (existing) {
      const nextUser = {
        ...existing,
        name: existing.name || profile.name || email.split("@")[0],
        avatar: existing.avatar || profile.picture || "",
        googleSub: existing.googleSub || profile.sub || "",
        providers: Array.from(new Set([...(existing.providers || []), "google"])),
        lastLoginAt: now,
      };
      state.users = state.users.map((user) => (user.id === existing.id ? nextUser : user));
      persistUsers();
      return nextUser;
    }
    const user = {
      id: createId("user"),
      name: profile.name || email.split("@")[0],
      email,
      avatar: profile.picture || "",
      googleSub: profile.sub || "",
      role: state.users.length ? "editor" : "owner",
      providers: ["google"],
      createdAt: now,
      lastLoginAt: now,
    };
    state.users = [...state.users, user];
    persistUsers();
    return user;
  }

  function signInUser(user, title, body) {
    const nextUser = { ...user, lastLoginAt: new Date().toISOString() };
    state.users = state.users.map((entry) => (entry.id === nextUser.id ? nextUser : entry));
    persistUsers();
    sessionStorage.setItem(STORAGE.session, JSON.stringify({ userId: nextUser.id, email: nextUser.email, signedInAt: new Date().toISOString() }));
    state.currentUser = nextUser;
    state.authenticated = true;
    state.authMode = "login";
    toast(title, body);
    render();
  }

  async function hashPassword(password, salt) {
    return sha256(`${salt}:${password}`);
  }

  function createId(prefix) {
    if (window.crypto && window.crypto.randomUUID) return `${prefix}-${window.crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function getGoogleClientId() {
    const meta = document.querySelector('meta[name="google-signin-client_id"]');
    return (meta && meta.getAttribute("content")) || localStorage.getItem(STORAGE.googleClient) || "";
  }

  function initGoogleAuth() {
    const clientId = getGoogleClientId();
    const container = document.getElementById("google-auth-button");
    if (!clientId || !container) return;
    container.innerHTML = '<span class="loading-inline">Đang tải Google Sign-In</span>';
    loadGoogleIdentity()
      .then(() => {
        if (!window.google || !window.google.accounts || !window.google.accounts.id) {
          throw new Error("Google Identity Services chưa sẵn sàng.");
        }
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredential,
        });
        container.innerHTML = "";
        window.google.accounts.id.renderButton(container, {
          theme: "outline",
          size: "large",
          text: state.authMode === "register" ? "signup_with" : "signin_with",
          shape: "rectangular",
          width: Math.min(360, container.clientWidth || 360),
        });
      })
      .catch((error) => {
        container.innerHTML = `<button class="button google-fallback" type="button" data-action="google-config-needed">${ICONS.users}<span>Google chưa sẵn sàng</span></button>`;
        toast("Không tải được Google", error.message || "Kiểm tra Client ID hoặc kết nối mạng.");
        renderIfAuthenticated();
      });
  }

  function loadGoogleIdentity() {
    if (window.google && window.google.accounts && window.google.accounts.id) return Promise.resolve();
    if (state.googleLoading) return state.googleLoading;
    state.googleLoading = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-google-identity="true"]');
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", () => reject(new Error("Không tải được Google Identity Services.")), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentity = "true";
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", () => reject(new Error("Không tải được Google Identity Services.")), { once: true });
      document.head.appendChild(script);
    }).finally(() => {
      state.googleLoading = false;
    });
    return state.googleLoading;
  }

  function handleGoogleCredential(response) {
    try {
      const profile = decodeJwtPayload(response && response.credential);
      const user = upsertGoogleUser(profile);
      if (!user) throw new Error("Google không trả về email.");
      signInUser(user, "Đã đăng nhập Google", `${user.name} đang vào admin.`);
    } catch (error) {
      toast("Google login lỗi", error.message || "Không đọc được Google credential.");
      render();
    }
  }

  function decodeJwtPayload(token) {
    if (!token || token.split(".").length < 2) throw new Error("Google credential không hợp lệ.");
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(""),
    );
    return JSON.parse(json);
  }

  async function sha256(value) {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const buffer = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
      return Array.from(new Uint8Array(buffer))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    }
    return btoa(unescape(encodeURIComponent(value))).split("").reverse().join("");
  }

  function readStoredJson(key, fallback, storage) {
    try {
      const source = storage || localStorage;
      const value = source.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number(value) || 0));
  }

  function percent(value, total) {
    return total ? Math.round((Number(value || 0) / Number(total)) * 100) : 0;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("vi-VN").format(Number(value || 0));
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value || 0));
  }

  function toEditableMoney(value) {
    const source = String(value || "").trim();
    if (!source) return "";
    const digits = source.replace(/[^\d]/g, "");
    return digits ? formatNumber(Number(digits)) : source;
  }

  function fromEditableMoney(value) {
    const source = String(value || "").trim();
    if (!source) return "";
    const digits = source.replace(/[^\d]/g, "");
    if (!digits) return source;
    return formatNumber(Number(digits));
  }

  function formatDate(value) {
    if (!value) return "Chưa rõ";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Chưa rõ";
    return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  }

  function maskEmail(email) {
    const value = String(email || "");
    const [name, domain] = value.split("@");
    if (!name || !domain) return value;
    return `${name.slice(0, 2)}***@${domain}`;
  }

  function uniqueByKey(row, index, rows) {
    return rows.findIndex((item) => item.key === row.key) === index;
  }
})();
