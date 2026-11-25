import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { install } from './mock.mjs';
const [, , out, ...bases] = process.argv;
const b = await chromium.launch();
for (const [bi, base] of bases.entries()) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const log = []; await install(ctx, log);
  const p = await ctx.newPage(); await p.clock.install({ time: new Date('2026-11-21T20:00:00+08:00') });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  p.on('dialog', (d) => d.accept());
  await p.goto(base + '/'); await p.fill('input[type=email]', 'a@b.c'); await p.fill('input[type=password]', 'pw'); await p.click('button[type=submit]'); await p.waitForTimeout(2000);
  const step = async (name, fn) => { log.push('### ' + name); try { await fn(); } catch (e) { log.push('ERR ' + e.message.split('\n')[0]); } await p.waitForTimeout(1200); };
  await step('daily', async () => { await p.goto(base + '/#/daily?d=2026-11-21'); await p.waitForTimeout(1500);
    const ed = p.locator('button:has-text("修改")'); if (await ed.count()) { await ed.first().click(); await p.waitForTimeout(500); }
    const inp = p.locator('#income input').first(); await inp.fill('8888');
    await p.locator('input[aria-label="地瓜（中） 實際烤"]').fill('2'); await p.locator('button:has-text("儲存")').last().click(); });
  await step('entry', async () => { await p.goto(base + '/#/entry?type=expense'); await p.waitForTimeout(1500);
    await p.locator('input[inputmode=decimal], input[inputmode=numeric]').first().fill('123');
    const sel = p.locator('select'); for (let i = 0; i < await sel.count(); i++) { const opts = await sel.nth(i).locator('option').count(); if (opts > 1) await sel.nth(i).selectOption({ index: 1 }); } await p.locator('button:has-text("儲存")').last().click(); await p.waitForTimeout(500);
    const ok = p.locator('button:has-text("確定"), button:has-text("仍要儲存")'); if (await ok.count()) await ok.first().click(); });
  await step('purchase', async () => { await p.goto(base + '/#/purchases/new'); await p.waitForTimeout(1500);
    const nums = p.locator('input[inputmode=decimal], input[inputmode=numeric]'); await nums.nth(0).fill('3'); await nums.nth(1).fill('1200'); await p.locator('button:has-text("儲存進貨")').click(); });
  await step('reconcile', async () => { await p.goto(base + '/#/reconcile'); await p.waitForTimeout(1500);
    await p.locator('[role=checkbox]').first().click(); await p.locator('button:has-text("儲存")').last().click(); });
  await step('accounts-owe', async () => { await p.goto(base + '/#/accounts'); await p.waitForTimeout(1500); await p.click('text=＋新增'); await p.waitForTimeout(300); });
  fs.writeFileSync(`${out}/${bi}_interact.txt`, log.filter((l) => !l.startsWith('rpc generate') ).join('\n') + '\nERRORS:\n' + errs.join('\n'));
  await ctx.close();
}
await b.close();
