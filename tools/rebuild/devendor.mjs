// 把解壓縮後的 bundle 去掉內嵌的 React，換成 npm 的 import，輸出 src/app.jsx
import fs from 'fs';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import _generate from '@babel/generator';
import * as t from '@babel/types';
const traverse = _traverse.default, generate = _generate.default;
const src = fs.readFileSync('deob.js', 'utf8');
const ast = parse(src, { sourceType: 'module', plugins: ['jsx'] });
const VENDOR = new Set(['zm', 'vt', 'Xm', 'Km', 'Jm', 'Wm', 'dg', 'pg', 'Tg', 'Se']);
const MOD = { vt: 'react', pg: 'react-dom/client', Se: 'react/jsx-runtime' };
const imports = [];
const body = [];
for (const n of ast.program.body) {
  if (n.type === 'ImportDeclaration' && n.source.value.includes('chunk-')) continue; // helper chunk
  if (n.type === 'VariableDeclaration' && n.declarations.length === 1) {
    const d = n.declarations[0];
    const name = d.id.name;
    if (VENDOR.has(name)) continue;
    // const X = c(vt())  →  import * as X from "react"
    if (d.init?.type === 'CallExpression' && d.init.callee.name === 'c' && d.init.arguments[0]?.type === 'CallExpression') {
      const inner = d.init.arguments[0].callee.name;
      if (MOD[inner]) { imports.push(t.importDeclaration([t.importNamespaceSpecifier(t.identifier(name))], t.stringLiteral(MOD[inner]))); continue; }
    }
  }
  body.push(n);
}
ast.program.body = [...imports, ...body];
// 動態載入 jszip
traverse(ast, {
  Import(p) {
    const call = p.parentPath.node;
    if (call.arguments[0]?.value?.includes('jszip')) call.arguments[0] = t.stringLiteral('jszip');
  },
});
let out = generate(ast, { jsescOption: { minimal: true }, retainLines: false }).code;
const helper = `// esbuild 的 class 欄位小工具（原本在共用 chunk 裡）
const d = (obj, key, value) => { const k = typeof key !== "symbol" ? key + "" : key; if (k in obj) Object.defineProperty(obj, k, { enumerable: true, configurable: true, writable: true, value }); else obj[k] = value; return value; };
`;
// 檢查還有沒有用到 b / c
const leftover = (out.match(/\b[bc]\(\w+\(\)\)/g) || []);
console.log('leftover b/c calls:', leftover.slice(0, 5));
out = out.replace(/^(import [^\n]+\n)+/, (m) => m + helper);
fs.mkdirSync('src', { recursive: true });
fs.writeFileSync('src/app.jsx', out);
console.log('imports', imports.length, 'stmts', body.length, 'bytes', out.length);
