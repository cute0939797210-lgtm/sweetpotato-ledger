// Playwright 用：把對 Supabase 的請求接起來，用假資料回應（支援 eq/gte/lte/gt/lt/neq/is/in、order、limit、offset）
import * as F from './fixtures.mjs';
const db = {}; for (const [k, v] of Object.entries(F)) if (Array.isArray(v)) db[k] = JSON.parse(JSON.stringify(v));
const cmp = (a, b) => (a == null ? (b == null ? 0 : -1) : b == null ? 1 : typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b)));
function match(row, col, expr) {
  const v = row[col];
  const i = expr.indexOf('.'); const op = expr.slice(0, i); let val = expr.slice(i + 1);
  const num = (x) => (typeof v === 'number' ? Number(x) : x);
  switch (op) {
    case 'eq': return String(v) === val || (val === 'true' && v === true) || (val === 'false' && v === false);
    case 'neq': return String(v) !== val;
    case 'gte': return v != null && cmp(v, num(val)) >= 0;
    case 'lte': return v != null && cmp(v, num(val)) <= 0;
    case 'gt': return v != null && cmp(v, num(val)) > 0;
    case 'lt': return v != null && cmp(v, num(val)) < 0;
    case 'is': return val === 'null' ? v == null : val === 'not.null' ? v != null : String(v) === val;
    case 'in': { const list = val.replace(/^\(|\)$/g, '').split(',').map((s) => s.replace(/^"|"$/g, '')); return list.includes(String(v)); }
    case 'not': return !match(row, col, val);
    default: return true;
  }
}
export async function install(ctx, log = []) {
  await ctx.route('**/*.supabase.co/**', async (route) => {
    const req = route.request(); const u = new URL(req.url()); const path = u.pathname;
    const json = (b, s = 200) => route.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(b) });
    if (path.startsWith('/auth/v1/')) return json({ access_token: 'x', refresh_token: 'y', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, token_type: 'bearer', user: { id: 'u', email: 'a@b.c' } });
    if (path.startsWith('/rest/v1/rpc/')) { const name = path.split('/').pop(); log.push('rpc ' + name + ' ' + (req.postData() || '')); const f = F.rpc[name]; return json(f ? f(JSON.parse(req.postData() || '{}')) : null); }
    const table = path.replace('/rest/v1/', '');
    if (req.method() !== 'GET') { log.push(req.method() + ' ' + table + ' ' + u.search + ' ' + (req.postData() || '')); return json([]); }
    let rows = db[table]; if (!rows) { log.push('MISSING ' + table); rows = []; }
    for (const [k, v] of u.searchParams) if (!['select', 'order', 'limit', 'offset'].includes(k)) rows = rows.filter((r) => match(r, k, v));
    const order = u.searchParams.get('order');
    if (order) { const keys = order.split(',').map((s) => s.split('.')); rows = [...rows].sort((a, b) => { for (const [k, dir] of keys) { const c = cmp(a[k], b[k]); if (c) return dir === 'desc' ? -c : c; } return 0; }); }
    const off = Number(u.searchParams.get('offset') || 0), lim = Number(u.searchParams.get('limit') || 1e9);
    return json(rows.slice(off, off + lim));
  });
}
