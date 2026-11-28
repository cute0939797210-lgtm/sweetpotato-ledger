import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import { install } from './mock.mjs';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await install(ctx, []);
const p = await ctx.newPage(); await p.clock.install({ time: new Date('2026-11-28T15:00:00+08:00') });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://127.0.0.1:8091/'); await p.fill('input[type=email]', 'a@b.c'); await p.fill('input[type=password]', 'pw'); await p.click('button[type=submit]'); await p.waitForTimeout(2000);
await p.goto('http://127.0.0.1:8091/#/purchases/stock'); await p.waitForTimeout(2000);
const el = p.locator('text=大小調換・阿基').first(); console.log('found', await el.count());
if (await el.count()) { await el.evaluate((e) => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(300); const bx = await el.boundingBox(); await p.screenshot({ path: '/home/claude/sp/test/sl3.png', clip: { x: 0, y: bx.y - 50, width: 390, height: 120 } }); }
console.log(errs); await b.close();
