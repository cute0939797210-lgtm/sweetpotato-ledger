// 🍠 建置：esbuild 打包 React + Tailwind v4 編譯，輸出到 dist/（純靜態網站，放 GitHub Pages）
//   node build.mjs
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import esbuild from "esbuild";
import * as tw from "tailwindcss";

const out = "dist";
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

await esbuild.build({
  entryPoints: ["src/main.jsx"],
  bundle: true,
  minify: true,
  sourcemap: false,
  format: "esm",
  target: ["es2020"],
  jsx: "automatic",
  outdir: out,
  entryNames: "app",
  chunkNames: "chunks/[name]-[hash]",
  splitting: true,
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
});

// Tailwind：從原始碼抽出可能的 class 名稱
const candidates = new Set();
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
  const p = path.join(d, e.name);
  if (e.isDirectory()) walk(p);
  else if (/\.(jsx?|tsx?|html)$/.test(e.name)) fs.readFileSync(p, "utf8").split(/[\s"'`{}()<>;,]+/).forEach((t) => t && candidates.add(t));
});
walk("src");
const twBase = path.dirname(path.resolve("node_modules/tailwindcss/index.css"));
const load = async (id, base) => {
  let p;
  if (id === "tailwindcss") p = path.join(twBase, "index.css");
  else if (id.startsWith("tailwindcss/")) p = path.join(twBase, id.slice(12));
  else p = path.resolve(base, id);
  return { path: p, base: path.dirname(p), content: fs.readFileSync(p, "utf8") };
};
const compiler = await tw.compile(fs.readFileSync("src/styles.css", "utf8"), { base: path.resolve("src"), loadStylesheet: load });
const css = compiler.build([...candidates]);
const cssMin = (await esbuild.transform(css, { loader: "css", minify: true })).code;
fs.writeFileSync(`${out}/app.css`, cssMin);

// 靜態檔案＋版本號（手機才會抓到新版）
fs.cpSync("public", out, { recursive: true });
const chunks = fs.existsSync(`${out}/chunks`) ? fs.readdirSync(`${out}/chunks`).sort() : [];
const h = crypto.createHash("sha1").update(fs.readFileSync(`${out}/app.js`)).update(cssMin);
chunks.forEach((c) => h.update(c));
const hash = h.digest("hex").slice(0, 10);
for (const f of ["index.html", "sw.js"]) {
  fs.writeFileSync(`${out}/${f}`, fs.readFileSync(`${out}/${f}`, "utf8").replaceAll("__BUILD__", hash)
    .replace('"__CHUNKS__"', chunks.map((c) => JSON.stringify(`./chunks/${c}`)).join(", ")));
}
const kb = (f) => Math.round(fs.statSync(`${out}/${f}`).size / 1024);
console.log(`✅ 建置完成  app.js ${kb("app.js")} KB  app.css ${kb("app.css")} KB  版本 ${hash}`);
