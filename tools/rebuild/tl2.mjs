import fs from 'fs';
import { parse } from '@babel/parser';
const src = fs.readFileSync('src/main.jsx', 'utf8');
const ast = parse(src, { sourceType: 'module', plugins: ['jsx'] });
for (const n of ast.program.body) {
  let names = [];
  if (n.type === 'VariableDeclaration') names = n.declarations.map(d => d.id.name || '{}');
  else if (n.type === 'FunctionDeclaration' || n.type === 'ClassDeclaration') names = [n.id.name];
  else continue;
  const first = src.slice(n.start, Math.min(n.end, n.start + 110)).replace(/\s+/g, ' ');
  console.log(names.join(','), '|', first);
}
