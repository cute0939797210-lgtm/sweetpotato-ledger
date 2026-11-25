// 把 main.jsx 依原本的模組順序拆成多個檔案，自動補 import / export
import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import _generate from '@babel/generator';
const traverse = _traverse.default, generate = _generate.default;
const BOUNDS = [
  ['d', 'lib/supabase.js'], ['evalFormula', 'lib/calc.js'], ['timeZone', 'lib/format.js'], ['parseHash', 'lib/router.js'], ['CONFIG_KEY', 'lib/supabase.js'],
  ['cx', 'components/ui.jsx'], ['EMPTY_STORE', 'lib/store.jsx'], ['AuthShell', 'pages/Login.jsx'], ['isWagePayer', 'lib/models.js'], ['pnlEntries', 'lib/queries.js'],
  ['loadZip', 'lib/xlsx.js'], ['BACKUP_KEY', 'lib/backup.js'], ['NO_STALL', 'lib/stallReport.js'], ['StallRanking', 'components/StallRanking.jsx'], ['Ir', 'lib/report.js'],
  ['Import', 'pages/Import.jsx'], ['ColumnChart', 'components/charts.jsx'], ['REPORT_TABS', 'pages/Reports.jsx'], ['Settings', 'pages/Settings.jsx'],
  ['nextMonthRentDue', 'lib/rentDue.js'], ['WarehouseRent', 'pages/WarehouseRent.jsx'], ['PERIOD_LABELS', 'pages/Home.jsx'], ['cleanDescription', 'components/TxnList.jsx'],
  ['DRAFT_PREFIX', 'lib/drafts.js'], ['BILLS', 'components/CashCounter.jsx'], ['neq', 'pages/Daily.jsx'], ['ql', 'pages/Entry.jsx'], ['I1', 'pages/StockLedger.jsx'],
  ['PURCHASE_TABS', 'pages/Purchases.jsx'], ['Accounts', 'pages/Accounts.jsx'], ['Personal', 'pages/Personal.jsx'], ['RECONCILED_TAG', 'pages/Reconcile.jsx'],
  ['StallMonth', 'pages/StallMonth.jsx'], ['PORTION_KEY', 'pages/PortionCost.jsx'], ['NAV_ITEMS', 'App.jsx'],
];
const src = fs.readFileSync('src/main.jsx', 'utf8');
const ast = parse(src, { sourceType: 'module', plugins: ['jsx'] });
const declNames = (n) => n.type === 'VariableDeclaration' ? n.declarations.map((d) => d.id.name) : (n.type === 'FunctionDeclaration' || n.type === 'ClassDeclaration') ? [n.id.name] : [];
const files = new Map(); // file -> {stmts:[], names:Set}
const owner = new Map();
let cur = null; const ext = [];
let programPath;
traverse(ast, { Program(p) { programPath = p; p.stop(); } });
for (const sp of programPath.get('body')) {
  const n = sp.node;
  if (n.type === 'ImportDeclaration') { ext.push(n); continue; }
  const names = declNames(n);
  const b = BOUNDS.find(([nm]) => names.includes(nm)); if (b) cur = b[1];
  if (!files.has(cur)) files.set(cur, { paths: [], names: new Set() });
  files.get(cur).paths.push(sp); names.forEach((nm) => { files.get(cur).names.add(nm); owner.set(nm, cur); });
}
const extNames = new Map(ext.map((d) => [d.specifiers[0].local.name, d]));
const out = {};
for (const [file, f] of files) {
  const needs = new Map(); const extNeed = new Set();
  for (const sp of f.paths) {
    sp.traverse({ ReferencedIdentifier(r) {
      const nm = r.node.name; const bd = r.scope.getBinding(nm);
      if (!bd || bd.scope !== programPath.scope) return;
      if (extNames.has(nm)) { extNeed.add(nm); return; }
      const o = owner.get(nm); if (o && o !== file) { if (!needs.has(o)) needs.set(o, new Set()); needs.get(o).add(nm); }
    } });
    // JSX 元件名稱也算引用
    sp.traverse({ JSXIdentifier(r) { const nm = r.node.name; if (!/^[A-Z]/.test(nm) || r.parentPath.isJSXAttribute()) return; const o = owner.get(nm); if (o && o !== file) { if (!needs.has(o)) needs.set(o, new Set()); needs.get(o).add(nm); } } });
  }
  out[file] = { needs, extNeed, f };
}
// 誰被別的檔案用到 → export
const exported = new Map();
for (const [file, o] of Object.entries(out)) for (const [from, set] of o.needs) { if (!exported.has(from)) exported.set(from, new Set()); set.forEach((n) => exported.get(from).add(n)); }
for (const [file, o] of Object.entries(out)) {
  const lines = [];
  const rel = (to) => { let r = path.relative(path.dirname(file), to).replace(/\\/g, '/'); return r.startsWith('.') ? r : './' + r; };
  for (const nm of o.extNeed) lines.push(generate(extNames.get(nm)).code);
  for (const [from, set] of [...o.needs].sort()) lines.push(`import { ${[...set].sort().join(', ')} } from "${rel(from)}";`);
  const exp = exported.get(file) ?? new Set();
  const body = o.f.paths.map((sp) => { const code = generate(sp.node, { jsescOption: { minimal: true } }).code; const nm = declNames(sp.node); return nm.length && nm.some((x) => exp.has(x)) ? 'export ' + code : code; });
  const text = lines.join('\n') + (lines.length ? '\n\n' : '') + body.join('\n\n') + '\n';
  fs.mkdirSync(path.join('src2', path.dirname(file)), { recursive: true });
  fs.writeFileSync(path.join('src2', file), text);
}
// 入口
fs.writeFileSync('src2/main.jsx', '// 入口：App.jsx 會把畫面掛到 #root\nimport "./App.jsx";\n');
console.log(Object.keys(out).length, 'files');
