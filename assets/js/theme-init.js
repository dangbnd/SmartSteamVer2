(function () {
  const body = document.body;
  if (!body) return;

  let theme = "dark";
  try {
    const stored = window.localStorage.getItem("stemora:theme") || window.localStorage.getItem("stemora:welcome-theme");
    theme = stored === "light" ? "light" : "dark";
  } catch (error) {
    theme = "dark";
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
