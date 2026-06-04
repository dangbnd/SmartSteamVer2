(function () {
  const body = document.body;
  if (!body) return;

  const APP_THEME_STORAGE_KEY = "smartsteam:theme";
  const WELCOME_THEME_STORAGE_KEY = "smartsteam:welcome-theme";
  const THEME_DEFAULT_VERSION_STORAGE_KEY = "smartsteam:theme-default-version";
  const LIGHT_THEME_DEFAULT_VERSION = "20260604-light";
  let theme = "light";
  try {
    const hasCurrentDefault = window.localStorage.getItem(THEME_DEFAULT_VERSION_STORAGE_KEY) === LIGHT_THEME_DEFAULT_VERSION;
    if (!hasCurrentDefault) {
      window.localStorage.setItem(THEME_DEFAULT_VERSION_STORAGE_KEY, LIGHT_THEME_DEFAULT_VERSION);
      window.localStorage.setItem(APP_THEME_STORAGE_KEY, "light");
      if (body.dataset.page === "welcome") window.localStorage.setItem(WELCOME_THEME_STORAGE_KEY, "light");
    } else {
      const stored = window.localStorage.getItem(APP_THEME_STORAGE_KEY) || window.localStorage.getItem(WELCOME_THEME_STORAGE_KEY);
      theme = stored === "dark" ? "dark" : "light";
    }
  } catch (error) {
    theme = "light";
  }

  body.dataset.theme = theme;
  if (body.dataset.page === "welcome") {
    body.dataset.welcomeTheme = theme;
  } else if (theme === "dark") {
    body.classList.add("page-immersive");
  } else {
    body.classList.remove("page-immersive");
  }

  document.documentElement.style.colorScheme = theme;
})();
