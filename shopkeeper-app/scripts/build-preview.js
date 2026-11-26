// Builds a single-file clickable web preview with sample data: node scripts/build-preview.js <out.html>
// Requires a prior: EXPO_PUBLIC_DEMO=1 npx expo export -p web --output-dir dist-demo
const fs = require("fs"), path = require("path");
const dist = path.resolve(__dirname, "../dist-demo"), out = path.resolve(process.argv[2] || "preview.html");
const jsDir = path.join(dist, "_expo/static/js/web");
let js = fs.readFileSync(path.join(jsDir, fs.readdirSync(jsDir)[0]), "utf8");
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
for (const f of walk(path.join(dist, "assets"))) {
  const ref = "/" + path.relative(dist, f);
  js = js.split(JSON.stringify(ref)).join(JSON.stringify("data:image/png;base64," + fs.readFileSync(f).toString("base64")));
}
js = js.replace(/<\/script/gi, "<\\/script");
let html = fs.readFileSync(path.join(dist, "index.html"), "utf8")
  .replace(/<script src="[^"]+" defer><\/script>/g, "")
  .replace('<link rel="icon" href="/favicon.ico"/>', "")
  .replace(/<!doctype html>\s*/i, "")
  .replace("<title>Catalyst Seller</title>", "<title>Catalyst Seller</title>\n<style>:root{color-scheme:light}html,body{background:#E8ECF4}#root{max-width:430px;margin:0 auto;background:#F5F7FB;box-shadow:0 0 0 1px #DDE3EE,0 12px 40px rgba(15,23,42,.12)}</style>")
  .replace("<head>", '<head>\n<script>try{if(location.pathname!=="/")history.replaceState(null,"","/")}catch(e){}</script>');
html = html.replace("</body>", () => "<script>" + js + "</script>\n</body>");
fs.writeFileSync(out, html);
console.log("wrote", out, fs.statSync(out).size, "bytes");
