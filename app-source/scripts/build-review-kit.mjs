import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "test-results");
const target = path.join(root, "review-kit");
const build = path.join(root, "out");
if (!fs.existsSync(source) || !fs.existsSync(build)) throw Error("Preview build or screenshots missing");
fs.mkdirSync(path.join(target, "screenshots"), { recursive: true });
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const files = walk(source);
const pages = [["today","Today"],["nutrition","Nutrition"],["training","Training"],["progress","Progress"]];
const cards = [];
for (const [page,label] of pages) {
  for (const size of ["mobile","desktop"]) {
    const file = "review-" + page + "-" + size + ".png";
    const sourceFile = files.filter(name => path.basename(name) === file);
    if (sourceFile.length !== 1) throw Error("Expected exactly one screenshot: " + file);
    fs.copyFileSync(sourceFile[0], path.join(target, "screenshots", file));
    cards.push('<figure><figcaption>' + label + ' · ' + (size === "mobile" ? "390px Mobile" : "1440px Desktop") +
      '</figcaption><a href="screenshots/' + file + '"><img loading="lazy" src="screenshots/' +
      file + '" alt="' + label + ' ' + size + '"></a></figure>');
  }
}
fs.cpSync(build, path.join(target, "site"), { recursive: true });
// Only the isolated review build receives deploy-host safety headers.
// The real JFS GitHub Pages build is unaffected.
fs.writeFileSync(path.join(target, "site", "_headers"), [
  "/*",
  "  X-Robots-Tag: noindex, nofollow, noarchive",
  "  X-Frame-Options: DENY",
  "  X-Content-Type-Options: nosniff",
  "  Referrer-Policy: no-referrer",
  "  Permissions-Policy: camera=(), microphone=(), geolocation=()",
  "  Cache-Control: no-store",
  "",
].join("\n"));
fs.writeFileSync(path.join(target, "site", "robots.txt"),
  "User-agent: *\\nDisallow: /\\n".replaceAll("\\\\n", "\\n"));
if (!fs.existsSync(path.join(target, "site", "index.html")) ||
    !fs.existsSync(path.join(target, "site", "today", "index.html"))) {
  throw Error("Missing preview root index or Today route");
}
const html = [
  '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1">',
  '<meta name="robots" content="noindex,nofollow"><title>JFS 四頁隔離預覽</title>',
  '<style>*{box-sizing:border-box}body{margin:0;background:#111116;color:#f6f6f8;font-family:system-ui,sans-serif}',
  'header{padding:24px clamp(18px,6vw,70px);border-bottom:1px solid #33333c}',
  'p{color:#cac8d1}.grid{padding:22px clamp(18px,6vw,70px);display:grid;',
  'grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:24px}',
  'figure{margin:0;padding:15px;border-radius:12px;background:#202027}',
  'figcaption{margin-bottom:12px;font-weight:600}img{width:100%;height:auto;border-radius:9px}',
  'a{color:inherit}</style></head><body><header><h1>James Fitness System｜隔離預覽</h1>',
  '<p>虛構示範資料 · 手機與桌面實測畫面 · 尚未合併或部署正式網站</p>',
  '<p>截圖可直接檢視。可互動的測試版位於 zip 中的 site/，必須使用獨立靜態伺服器。</p>',
  '</header><div class="grid">' + cards.join("\n") + '</div></body></html>',
].join("\n");
fs.writeFileSync(path.join(target, "index.html"), html);
fs.writeFileSync(path.join(target, "README.md"), [
  "# JFS Review Kit (synthetic data only)",
  "",
  "index.html: open directly to review 8 mobile/desktop real-browser screenshots.",
  "site/: actual Next.js static review build. This is interactive, not a mock screenshot.",
  "Never host on the existing production site or use the same origin as real accounts.",
  "The sample user is a synthetic local-only identity. Cloud auth and sync are disabled.",
  "Do not enter personal information into this review environment.",
  "",
  "To start a local preview in this directory:",
  "python3 -m http.server 3100 --bind 127.0.0.1 --directory site",
  "Visit http://127.0.0.1:3100/today/ on that computer.",
  "For mobile access, arrange a trusted LAN or an approved separate preview hostname.",
  "GitHub Actions artifacts are downloads, not public hosted preview URLs.",
  "",
  "QA: Today (quick logs), Nutrition (meals), Training (session/rest/History),",
  "Progress (7D/30D/90D/1Y). Test keyboard, safe area and scroll on actual phones.",
  "Use the top banner's reset control between synthetic review sessions.",
  "Real device Safari/Android testing is not established by Chromium screenshots.",
].join("\n"));
console.log("Created JFS review kit with eight screenshots and an interactive static build");
