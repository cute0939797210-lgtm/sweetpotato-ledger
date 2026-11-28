// 測試用假資料（不是真實帳務），新舊版本用同一份比對
let n = 0; const id = (p) => `${p}-0000-4000-8000-${String(++n).padStart(12, '0')}`;
const C = (code, name, kind, tier, group, daily = false, sys = false) => ({ id: id('c0000000'), code, name, kind, tier, report_group: group, show_in_daily: daily, is_system: sys, is_active: true, sort_order: n });
export const categories = [
  C('SALES', '現金收入', 'income', 1, '地瓜收入', true, true), C('INCOME_OTHER', '其它收入', 'income', 0, '其他收入', true, true),
  C('SWEET_POTATO_COST', '地瓜成本', 'expense', 1, '地瓜', false, true), C('RENT', '攤位租金', 'expense', 1, '攤位租金', false, true),
  C('FUEL', '加油費', 'expense', 1, '汽車加油', true), C('PARKING', '汽車停車費', 'expense', 1, '汽車停車費', true), C('GAS', '瓦斯', 'expense', 1, '瓦斯', true),
  C('CLEANING', '清潔費', 'expense', 1, '清潔費', true), C('ELECTRICITY', '電費', 'expense', 1, '電費', true), C('MISC', '其他雜項', 'expense', 1, '其他雜項', true),
  C('CAR_LOAN', '汽車貸款', 'expense', 2, '汽車貸款'), C('WAREHOUSE_RENT', '倉庫租金', 'expense', 2, '倉庫租金'), C('WAREHOUSE_POWER', '倉庫電費', 'expense', 2, '倉庫電費'),
  C('MEALS', '餐費', 'expense', 3, '餐費', true), C('WEILONG_LIVING', '偉龍生活費', 'expense', 3, '偉龍生活費', true), C('PHONE', '電話費', 'expense', 3, '電話費'),
  C('GRANDMA_SALARY', '阿嬤的薪水', 'expense', 3, '阿嬤的薪水', true), C('SISTER_SALARY', '姊的薪水', 'expense', 3, '姊的薪水', true),
  C('FEE', '手續費', 'expense', 4, '郵局／銀行手續費', false, true), C('P_SALARY', '薪資收入', 'income', 3, '薪資收入'), C('P_TRAVEL', '旅遊開銷', 'expense', 3, '旅遊開銷'),
];
const cat = (code) => categories.find((c) => c.code === code).id;
const A = (code, name, kind, biz, ob, sort) => ({ id: id('a0000000'), code, name, kind, is_business: biz, opening_balance: ob, opening_date: '2026-01-01', is_active: true, sort_order: sort, notes: code === 'CASH_BOX' ? '2026-10-31 盤點：一致 $32,547' : null });
export const accounts = [A('CASH_BOX', '金庫', 'cash', true, 27724, 1), A('POST', '郵局', 'post', true, 27, 2), A('MINNIE', 'Minnie 個人', 'other', false, 0, 5), A('OWE_DAD', '爸爸（代收轉租費）', 'other', false, 1000, 7)];
const acct = (code) => accounts.find((a) => a.code === code).id;
export const payers = [{ id: id('p0000000'), name: '偉龍', is_active: true, sort_order: 1 }, { id: id('p0000000'), name: 'Minnie', is_active: true, sort_order: 2 },
  { id: id('p0000000'), name: '阿嬤', is_active: true, sort_order: 3, default_wage: 500, wage_category_id: cat('GRANDMA_SALARY') }];
const M = (name, rent, elec, incl, sort) => ({ id: id('m0000000'), name, default_rent: rent, default_electricity_fee: elec, rent_includes_electricity: incl, is_active: true, is_temporary: false, payment_method: 'transfer', sort_order: sort });
export const markets = [M('濱江', 1500, 0, false, 2), M('國泰街75巷7號', 1000, 0, false, 3), M('東湖', 2500, 0, true, 4), M('國泰街(丸子旁)', 1000, 50, true, 5)];
const I = (name, short, sort) => ({ id: id('i0000000'), name, short_name: short, unit: '包', default_price: 0, track_inventory: true, is_active: true, sort_order: sort });
export const items = [I('地瓜（大）', '大', 1), I('地瓜（中）', '中', 2), I('地瓜（小）', '小', 3), I('地瓜（紅）', '紅', 4)];
export const suppliers = [{ id: id('s0000000'), name: '蔣先生', is_active: true, sort_order: 1 }, { id: id('s0000000'), name: '三峽', is_active: true, sort_order: 2 }, { id: id('s0000000'), name: '阿基', is_active: true, sort_order: 3 }];
export const app_settings = [{ id: id('x0000000'), key: 'last_backup_at', value: '2026-11-10T10:00:00Z' }, { id: id('x0000000'), key: 'inventory_start_date', value: '2026-09-01' }];
export const recurring_txns = [{ id: id('r0000000'), name: '樂天銀行-汽車貸款', category_id: cat('CAR_LOAN'), account_id: acct('POST'), amount: 9150, fee: 12, day_of_month: 14, first_month: '2026-02-01', total_count: 60, is_active: true }];
// 10、11 月的出攤
const days = []; const plans = []; const txns = []; const counts = []; const pnl = []; const cost = []; const daily = [];
const wk = { 3: markets[0], 4: markets[1], 0: markets[2], 6: markets[3] };
for (let d = new Date('2026-10-01T00:00:00Z'); d <= new Date('2026-11-24T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) {
  const day = d.toISOString().slice(0, 10); const m = wk[d.getUTCDay()]; if (!m) continue;
  plans.push({ id: id('l0000000'), day, market_id: m.id, rent: m.default_rent, electricity_fee: m.default_electricity_fee, note: null });
  if (day > '2026-11-22') continue;
  const bd = { id: id('b0000000'), day, market_id: m.id, status: day === '2026-10-25' ? 'rest' : 'open', weather: '晴', note: null };
  days.push(bd); if (bd.status !== 'open') continue;
  const inc = 6000 + (d.getUTCDate() * 317) % 9000;
  const T = (code, amount, slot, extra = {}) => { const t = { id: id('t0000000'), txn_date: day, type: code === 'SALES' ? 'income' : 'expense', amount, account_id: acct('CASH_BOX'), category_id: cat(code), business_day_id: bd.id, market_id: m.id, daily_slot: slot, source: 'daily', description: null, note: null, fee: 0, is_advance: false, created_at: day + 'T12:00:00Z', ...extra }; txns.push(t); return t; };
  T('SALES', inc, 'cat:' + cat('SALES')); T('RENT', m.default_rent, 'rent'); T('PARKING', 160, 'cat:' + cat('PARKING')); if (d.getUTCDate() % 3 === 0) T('MEALS', 120, 'life:1');
  items.slice(0, 3).forEach((it, k) => { const cooked = 1 + ((d.getUTCDate() + k) % 3); counts.push({ id: id('k0000000'), business_day_id: bd.id, item_id: it.id, carried: cooked + 0.5, cooked, remaining: 0.5, is_mismatch: false, unit_price: null, note: null });
    cost.push({ entry_date: day, item_id: it.id, kind: 'cooked', qty: cooked, cost: cooked * 1210, business_day_id: bd.id, market_id: m.id, ref_id: id('f0000000') }); });
  const potato = cost.filter((c) => c.business_day_id === bd.id).reduce((a, c) => a + c.cost, 0);
  pnl.push({ entry_date: day, category_id: cat('SALES'), kind: 'income', tier: 1, report_group: '地瓜收入', category: '現金收入', amount: inc, market_id: m.id, business_day_id: bd.id, source: 'transaction', ref_id: id('e0000000') },
    { entry_date: day, category_id: cat('RENT'), kind: 'expense', tier: 1, report_group: '攤位租金', category: '攤位租金', amount: m.default_rent, market_id: m.id, business_day_id: bd.id, source: 'transaction', ref_id: id('e0000000') },
    { entry_date: day, category_id: cat('PARKING'), kind: 'expense', tier: 1, report_group: '汽車停車費', category: '汽車停車費', amount: 160, market_id: m.id, business_day_id: bd.id, source: 'transaction', ref_id: id('e0000000') },
    ...cost.filter((c) => c.business_day_id === bd.id).map((c) => ({ entry_date: day, category_id: cat('SWEET_POTATO_COST'), kind: 'expense', tier: 1, report_group: '地瓜', category: '地瓜成本', amount: c.cost, market_id: m.id, business_day_id: bd.id, source: 'inventory_cooked', ref_id: c.ref_id })));
  const op = m.default_rent + 160 + potato;
  daily.push({ day, business_day_id: bd.id, market_id: m.id, market_name: m.name, status: 'open', weather: '晴', income: inc, other_income: 0, op_expense: op, op_profit: inc - op, fixed_expense: 0, personal_expense: 0, sweet_potato_cost: potato, rent: m.default_rent, cooked_qty: 6, has_mismatch: false });
}
txns.push({ id: id('t0000000'), txn_date: '2026-11-14', type: 'expense', amount: 9150, account_id: acct('POST'), category_id: cat('CAR_LOAN'), source: 'manual', description: '樂天銀行-汽車貸款(10/60)', fee: 12, is_advance: false, created_at: '2026-11-14T01:00:00Z' });
pnl.push({ entry_date: '2026-11-14', category_id: cat('CAR_LOAN'), kind: 'expense', tier: 2, report_group: '汽車貸款', category: '汽車貸款', amount: 9150, market_id: null, business_day_id: null, source: 'transaction', ref_id: id('e0000000') },
  { entry_date: '2026-11-08', category_id: cat('SWEET_POTATO_COST'), kind: 'expense', tier: 1, report_group: '地瓜', category: '地瓜成本', amount: 2420, market_id: null, business_day_id: null, source: 'inventory_adjust_count', ref_id: id('e0000000') });
cost.push({ entry_date: '2026-11-08', item_id: items[2].id, kind: 'adjust_count', qty: 2, cost: 2420, business_day_id: null, market_id: null, ref_id: id('f0000000') });
export const business_days = days, market_plans = plans, transactions = txns, daily_item_counts = counts, v_pnl_entries = pnl, v_cost_entries = cost, v_daily_summary = daily;
export const market_schedules = [];
const po = (date, sup, lines, paid) => ({ o: { id: id('o0000000'), order_date: date, supplier_id: sup.id, paid_account_id: paid ? acct('POST') : null, paid_fee: paid ? 12 : 0, note: null }, lines });
const pos = [po('2026-10-27', suppliers[0], [[items[0], 5, 900], [items[2], 11, 1000]], false), po('2026-11-12', suppliers[1], [[items[1], 25, 1260], [items[2], 25, 1260]], true), po('2026-11-06', suppliers[2], [[items[3], 1, 650]], false),
  po('2026-11-20', suppliers[2], [[items[0], -2, 1260], [items[1], 2, 1260]], false)];
pos[3].o.note = '大小調換：大 2 包 → 中 2 包';
export const purchase_orders = pos.map((p) => p.o);
export const purchase_lines = pos.flatMap((p) => p.lines.map(([it, q, pr]) => ({ id: id('q0000000'), purchase_order_id: p.o.id, item_id: it.id, quantity: q, unit_price: pr, amount: q * pr, note: null, created_at: p.o.order_date + 'T02:00:00Z' })));
export const v_purchase_order_status = pos.map((p) => { const total = p.lines.reduce((a, [, q, pr]) => a + q * pr, 0); return { purchase_order_id: p.o.id, order_date: p.o.order_date, supplier_id: p.o.supplier_id, total, paid: p.o.paid_account_id ? total : 0, status: p.o.paid_account_id ? 'paid' : 'unpaid' }; });
export const inventory_adjustments = [{ id: id('j0000000'), adj_date: '2026-11-08', item_id: items[1].id, quantity: 2, reason: 'count', unit_cost: 1210, note: '盤點', created_at: '2026-11-08T10:00:00Z' }];
export const v_inventory_flows = [
  ...purchase_lines.map((l) => ({ item_id: l.item_id, flow_date: purchase_orders.find((o) => o.id === l.purchase_order_id).order_date, dir: l.quantity > 0 ? 1 : -1, qty: Math.abs(l.quantity), unit_cost: l.quantity > 0 ? l.unit_price : null, kind: l.quantity > 0 ? 'purchase' : 'return', ref_id: l.id, created_at: l.created_at, business_day_id: null })),
  ...counts.filter((c) => days.find((b) => b.id === c.business_day_id).day >= '2026-11-01').map((c) => ({ item_id: c.item_id, flow_date: days.find((b) => b.id === c.business_day_id).day, dir: -1, qty: c.cooked, unit_cost: null, kind: 'cooked', ref_id: c.id, created_at: '2026-11-01T10:00:00Z', business_day_id: c.business_day_id }))];
export const v_fifo_costs = [];
export const v_inventory = items.map((it, k) => ({ item_id: it.id, name: it.name, short_name: it.short_name, unit: '包', sort_order: it.sort_order, on_hand: [0, 28.5, 11, 1][k] }));
const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);
export const v_monthly_summary = ['2026-09-01', '2026-10-01', '2026-11-01'].map((month) => { const ds = daily.filter((x) => x.day.startsWith(month.slice(0, 7))); const income = sum(ds, (x) => x.income), op = sum(ds, (x) => x.op_expense); const fixed = month === '2026-11-01' ? 9150 : 0;
  return { month, income, other_income: 0, op_expense: op, op_profit: income - op, fixed_expense: fixed, after_fixed: income - op - fixed, personal_expense: 1200, final_balance: income - op - fixed - 1200, open_days: ds.length, rest_days: month === '2026-10-01' ? 1 : 0 }; });
export const v_monthly_category = v_monthly_summary.flatMap((s) => [
  { month: s.month, kind: 'income', tier: 1, report_group: '地瓜收入', category_id: cat('SALES'), category: '現金收入', amount: s.income },
  { month: s.month, kind: 'expense', tier: 1, report_group: '地瓜', category_id: cat('SWEET_POTATO_COST'), category: '地瓜成本', amount: Math.round(s.op_expense * 0.7) },
  { month: s.month, kind: 'expense', tier: 1, report_group: '攤位租金', category_id: cat('RENT'), category: '攤位租金', amount: Math.round(s.op_expense * 0.3) },
  { month: s.month, kind: 'expense', tier: 3, report_group: '餐費', category_id: cat('MEALS'), category: '餐費', amount: 1200 }]);
export const v_rent_prepaid = markets.map((m, k) => ({ market_id: m.id, name: m.name, payment_method: 'transfer', prepaid: [4500, 4000, 10000, 4200][k], used: [3000, 3000, 7500, 3150][k], paid_until: '2026-11-30' }));
export const v_advance_balances = [{ payer_id: payers[1].id, name: 'Minnie', advanced: 21237, repaid: 0 }];
export const v_supplier_balances = suppliers.map((s, k) => ({ supplier_id: s.id, name: s.name, purchased: [15500, 63000, 650][k], paid: [10000, 63000, 0][k] }));
const bal = { CASH_BOX: 44003, POST: 69911, MINNIE: 0, OWE_DAD: 1000 };
export const v_account_balances = accounts.map((a) => ({ account_id: a.id, name: a.name, kind: a.kind, is_business: a.is_business, opening_balance: a.opening_balance, sort_order: a.sort_order, is_active: true, income: 0, expense: 0, transfer_in: 0, transfer_out: 0, payments: 0, balance: bal[a.code] }));
let run = 30000;
export const v_account_ledger = txns.filter((t) => t.account_id === acct('CASH_BOX') && t.txn_date >= '2026-11-01').map((t) => { const delta = t.type === 'income' ? t.amount : -t.amount; run += delta;
  return { account_id: t.account_id, txn_date: t.txn_date, txn_id: t.id, type: t.type, created_at: t.created_at, delta, label: categories.find((c) => c.id === t.category_id)?.name ?? '', note: null, account_name: '金庫', balance: run }; });
export const import_batches = [];
export const rpc = { day_unit_prices: (b) => items.map((it) => ({ item_id: it.id, system_price: 1210, source: 'fifo' })), last_purchase_price: () => 1260, suggest_markets: () => [], generate_recurring: () => 0 };
