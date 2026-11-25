import fs from 'fs';
import { parse } from '@babel/parser';
const src = fs.readFileSync('deob.js', 'utf8');
const ast = parse(src, { sourceType: 'module', plugins: ['jsx'] });
for (const n of ast.program.body) {
  const len = n.end - n.start;
  let name = n.type;
  if (n.type === 'VariableDeclaration') name += ' ' + n.declarations.map(d => d.id.name || '?').join(',');
  if (n.type === 'FunctionDeclaration') name += ' ' + n.id.name;
  const first = src.slice(n.start, n.start + 90).replace(/\n/g, ' ');
  if (len > 3000 || process.argv[2] === 'all') console.log(n.start, len, name, '|', first);
}
console.log('total stmts', ast.program.body.length);
