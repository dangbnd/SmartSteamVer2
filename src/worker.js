const blockedExactPaths = new Set([
  "/admin",
  "/assets/js/admin.js",
  "/assets/js/product-details.js",
  "/assets/css/admin.css",
  "/migration-full-input",
  "/migration-full.zip",
  "/transformed-products.js",
  "/out.txt",
  "/parse-migration.js",
  "/splice-data.js",
  "/transform-products.js",
  "/madi-demo.html"
]);

const blockedPrefixes = [
  "/admin/",
  "/assets/vendor/tinymce/",
  "/migration-full-input/",
  "/tools/"
];

function isBlockedPath(pathname) {
  return blockedExactPaths.has(pathname) || blockedPrefixes.some((prefix) => pathname.startsWith(prefix));
}

async function serve404(request, env) {
  const url = new URL(request.url);
  url.pathname = "/404.html";
  url.search = "";
  const response = await env.ASSETS.fetch(new Request(url, request));
  return new Response(response.body, {
    status: 404,
    headers: response.headers
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return Response.redirect(`${url.origin}/vi/welcome/`, 302);
    }

    if (isBlockedPath(url.pathname)) {
      return serve404(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};
