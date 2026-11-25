import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { install } from './mock.mjs';
const [, , outDir, ...bases] = process.argv;
const routes = ['/', '/daily', '/daily?d=2026-11-08', '/transactions', '/entry?type=expense', '/entry?type=transfer', '/accounts', '/accounts/advances', '/purchases', '/purchases/stock', '/purchases/new', '/portion-cost',
  '/reports', '/reports/month?m=2026-11-01', '/reports/month?m=2026-10-01', '/reports/year', '/reports/market', '/reports/purchase', '/stall-month?m=2026-11', '/personal', '/personal?tab=year',
  '/settings', '/settings/markets', '/settings/categories', '/settings/accounts', '/settings/export', '/settings/backup', '/reconcile', '/warehouse-rent'];
fs.mkdirSync(outDir, { recursive: true });
const b = await chromium.launch();
for (const [bi, base] of bases.entries()) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const log = []; await install(ctx, log);
  const p = await ctx.newPage();
  await p.clock.install({ time: new Date('2026-11-20T20:00:00+08:00') });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(base + '/'); await p.fill('input[type=email]', 'a@b.c'); await p.fill('input[type=password]', 'pw'); await p.click('button[type=submit]');
  await p.waitForTimeout(2500);
  // 打開帳戶後再按小眼睛
  for (const r of routes) {
    await p.goto(base + '/#' + r); await p.waitForTimeout(1500);
    if (r === '/accounts') { await p.click('[aria-label=顯示金額]').catch(() => {}); await p.waitForTimeout(300); }
    const name = r.replace(/[\/?=&]/g, '_') || 'home';
    fs.writeFileSync(`${outDir}/${bi}${name}.txt`, await p.evaluate(() => document.body.innerText));
    await p.screenshot({ path: `${outDir}/${bi}${name}.png`, fullPage: true });
  }
  fs.writeFileSync(`${outDir}/${bi}_errors.txt`, errs.join('\n') + '\n---\n' + [...new Set(log)].join('\n'));
  await ctx.close();
}
await b.close();
console.log('done');
