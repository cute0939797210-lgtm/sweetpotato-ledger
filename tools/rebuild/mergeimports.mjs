import fs from 'fs';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import _generate from '@babel/generator';
import * as t from '@babel/types';
const traverse = _traverse.default, generate = _generate.default;
const ast = parse(fs.readFileSync('src/main.jsx', 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
const NAME = { 'react': 'React', 'react-dom/client': 'ReactDOM', 'react/jsx-runtime': 'JsxRuntime' };
const unused = [];
traverse(ast, { Program(p) {
  const keep = new Set();
  for (const decl of p.get('body').filter((s) => s.isImportDeclaration())) {
    const src = decl.node.source.value; const want = NAME[src]; if (!want) continue;
    const local = decl.node.specifiers[0].local.name; const b = p.scope.getBinding(local);
    if (!b.referenced) unused.push(local);
    b.referencePaths.forEach((r) => { r.node.name = want; });
    if (b.referenced && !keep.has(src)) { keep.add(src); decl.node.specifiers[0].local = t.identifier(want); }
    else decl.remove();
  }
  p.stop();
} });
fs.writeFileSync('src/main.jsx', generate(ast, { jsescOption: { minimal: true } }).code);
console.log('unused removed:', unused.length);
