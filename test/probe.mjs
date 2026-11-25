import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import { install } from './mock.mjs';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await install(ctx, []);
const p = await ctx.newPage(); await p.clock.install({ time: new Date('2026-11-21T20:00:00+08:00') });
await p.goto('http://127.0.0.1:8091/'); await p.fill('input[type=email]', 'a@b.c'); await p.fill('input[type=password]', 'pw'); await p.click('button[type=submit]'); await p.waitForTimeout(2000);
for (const r of ['/daily?d=2026-11-21', '/entry?type=expense']) {
  await p.goto('http://127.0.0.1:8091/#' + r); await p.waitForTimeout(1500);
  console.log(r, JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('input,button,section[id]')].slice(0, 40).map((e) => `${e.tagName}#${e.id}[${e.getAttribute('inputmode') || e.type}] ${(e.getAttribute('aria-label') || e.placeholder || e.textContent || '').slice(0, 15)}`))));
}
await b.close();
