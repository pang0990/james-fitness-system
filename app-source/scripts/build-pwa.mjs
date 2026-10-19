import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
const root = "out";
const icons = [192, 512].map((size) => ({
  src: `${base}/icon-${size}.png`,
  sizes: `${size}x${size}`,
  type: "image/png",
  purpose: "any maskable",
}));
fs.writeFileSync(
  path.join(root, "manifest.webmanifest"),
  JSON.stringify(
    {
      id: base + "/",
      name: "James Fitness System",
      short_name: "James",
      description: "Nutrition · Training · Progress",
      lang: "zh-Hant",
      start_url: base + "/today/",
      scope: base + "/",
      display: "standalone",
      background_color: "#070708",
      theme_color: "#070708",
      icons,
    },
    null,
    2,
  ),
);
function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
    );
}
const files = walk(path.join(root, "_next"))
  .filter((p) => /\.(js|css)$/.test(p))
  .map((p) => base + "/" + p.slice(4));
const urls = [
  base + "/",
  ...[
    "today",
    "nutrition",
    "training",
    "progress",
    "learn",
    "onboarding",
    "settings",
  ].map((p) => base + "/" + p + "/"),
  base + "/icon-192.png",
  base + "/icon-512.png",
  ...files,
];
const version =
  "james-" +
  crypto
    .createHash("sha256")
    .update(JSON.stringify(files))
    // A service-worker logic fix must replace and evict old caches, even
    // when the compiled JS/CSS filenames did not change.
    .update(fs.readFileSync(new URL(import.meta.url)))
    .digest("hex")
    .slice(0, 10);
fs.writeFileSync(
  path.join(root, "sw.js"),
  `const CACHE=${JSON.stringify(version)};const BASE=${JSON.stringify(base)};const URLS=${JSON.stringify(urls)};self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(URLS))));self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('james-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(BASE+'/'))return;/* Never intercept or cache OAuth callbacks, credentials or query URLs. A cached callback may contain a one-time authorization code. */if(url.pathname===BASE+'/auth'||url.pathname.startsWith(BASE+'/auth/')||url.search||event.request.cache==='no-store')return;event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy))}return response}).catch(async()=>{const cache=await caches.open(CACHE);const hit=await cache.match(event.request);if(hit)return hit;if(event.request.mode==='navigate')return new Response('<!doctype html><html lang="zh-Hant"><meta name="viewport" content="width=device-width"><body style="font:16px system-ui;padding:40px"><h1>目前離線</h1><p>此頁尚未下載，請連線後再開啟。</p><a href="'+BASE+'/today/">返回 Today</a></body></html>',{headers:{'Content-Type':'text/html; charset=utf-8'}});return Response.error()}))});`,
);
