import { monthEnd } from "./format.js";
import { db, gte, isNull, lte } from "./supabase.js";

export const NO_STALL = "沒分到攤位的支出";

const FIRST_GROUPS = ["地瓜", "攤位租金", "電費"];

export function buildStallMonth(entries, days, a) {
  let n = new Map(days.map(u => [u.id, u]));
  let l = new Map(days.filter(u => u.status === "open").map(u => [u.day, u]));
  let s = entries.filter(u => u.tier === 1);
  let stallOf = u => {
    let p = u.business_day_id && n.get(u.business_day_id) || (u.source === "transaction" ? l.get(u.entry_date) : undefined);
    let g = p?.status === "open" ? p.market_id : u.market_id;
    if (g) {
      return a(g) || "（未命名攤位）";
    }
    return NO_STALL;
  };
  let map = new Map();
  s.filter(u => u.kind === "expense").forEach(u => map.set(u.report_group, (map.get(u.report_group) ?? 0) + Number(u.amount)));
  let groups = [...map.keys()].sort((u, p) => {
    let g = FIRST_GROUPS.indexOf(u);
    let f = FIRST_GROUPS.indexOf(p);
    if (g >= 0 || f >= 0) {
      return (g < 0 ? 99 : g) - (f < 0 ? 99 : f);
    }
    return (map.get(p) ?? 0) - (map.get(u) ?? 0);
  });
  let b = (u, p) => `${u}|${p}`;
  let map_1 = new Map();
  let d = (u, p) => {
    let g = b(u, p);
    if (!map_1.has(g)) {
      map_1.set(g, {
        date: u,
        stall: p,
        income: 0,
        exp: {},
        expTotal: 0,
        profit: 0,
        rest: false
      });
    }
    return map_1.get(g);
  };
  for (let u of days) {
    if (u.status === "open") {
      d(u.day, a(u.market_id) || "（未命名攤位）");
    }
  }
  for (let u of s) {
    let p = d(u.entry_date, stallOf(u));
    let g = Number(u.amount);
    if (u.kind === "income") {
      p.income += g;
    } else {
      p.exp[u.report_group] = (p.exp[u.report_group] ?? 0) + g;
      p.expTotal += g;
    }
  }
  let r = [...map_1.values()].map(u => ({
    ...u,
    profit: u.income - u.expTotal
  }));
  let stallNames = [...new Set(r.map(u => u.stall))].sort((u, p) => (u === NO_STALL ? 1 : p === NO_STALL ? -1 : 0) || r.filter(g => g.stall === p).reduce((acc, item) => acc + item.income, 0) - r.filter(g => g.stall === u).reduce((acc, item) => acc + item.income, 0));
  let stalls = stallNames.map(u => {
    let p = r.filter(T => T.stall === u);
    let g = {};
    p.forEach(T => Object.entries(T.exp).forEach(([j, $]) => {
      g[j] = (g[j] ?? 0) + $;
    }));
    let income = p.reduce((acc, item) => acc + item.income, 0);
    let expTotal = p.reduce((acc, item) => acc + item.expTotal, 0);
    let M = u === NO_STALL ? 0 : new Set(p.map(T => T.date)).size;
    return {
      stall: u,
      days: M,
      income,
      exp: g,
      expTotal,
      profit: income - expTotal
    };
  });
  let total = {
    stall: "合計",
    days: stalls.reduce((acc, stall) => acc + stall.days, 0),
    income: stalls.reduce((acc, stall) => acc + stall.income, 0),
    exp: Object.fromEntries(groups.map(u => [u, stalls.reduce((acc, stall) => acc + (stall.exp[u] ?? 0), 0)])),
    expTotal: stalls.reduce((acc, stall) => acc + stall.expTotal, 0),
    profit: stalls.reduce((acc, stall) => acc + stall.profit, 0)
  };
  let otherIncome = entries.filter(u => u.kind === "income" && u.tier === 0).reduce((acc, item) => acc + Number(item.amount), 0);
  return {
    groups,
    rows: r.sort((u, p) => u.date.localeCompare(p.date)),
    stalls,
    stallNames,
    total,
    stallOf,
    otherIncome
  };
}

export async function loadStallMonth(e) {
  let t = monthEnd(e);
  let [a, n] = await Promise.all([db.select("v_pnl_entries", {
    where: [gte("entry_date", e), lte("entry_date", t)],
    order: "entry_date",
    limit: 5000
  }), db.select("business_days", {
    where: [isNull("deleted_at"), gte("day", e), lte("day", t)],
    order: "day"
  })]);
  return {
    entries: a,
    days: n
  };
}

export function rankStalls(stalls) {
  return stalls.filter(t => t.stall !== NO_STALL && t.days > 0).map(t => ({
    ...t,
    avg: Math.round(t.profit / t.days)
  })).sort((t, a) => a.avg - t.avg);
}

export const savedKey = e => `stall_month_saved_${e}`;

export async function markStallMonthSaved(e, t) {
  let a = new Date().toISOString();
  if (t) {
    await db.update("app_settings", {
      value: a
    }, [["id", `eq.${t}`]]);
  } else {
    await db.insert("app_settings", {
      key: savedKey(e),
      value: a
    });
  }
}
