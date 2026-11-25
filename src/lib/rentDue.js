import { addDays, addMonths, monthEnd, monthStart } from "./format.js";
import { db, eq, gte, isNull, lte } from "./supabase.js";

export async function nextMonthRentDue(e, markets, a = addMonths(monthStart(e), 1)) {
  let n = a;
  let l = monthEnd(n);
  let [s, i, o] = await Promise.all([
    db.select("v_rent_prepaid"),
    db.select("market_plans", {
      where: [isNull("deleted_at"), gte("day", e), lte("day", l)],
      order: "day",
    }),
    db.select("transactions", {
      where: [isNull("deleted_at"), eq("daily_slot", "rent"), gte("txn_date", e)],
    }),
  ]);
  let c = new Set(o.map((m) => m.txn_date));
  let b = [];
  for (let m of markets.filter((d) => d.is_active && d.payment_method === "transfer")) {
    let d = i.filter((g) => g.market_id === m.id);
    let r = d
      .filter((g) => g.day < n && !c.has(g.day))
      .reduce((acc, item) => acc + Number(item.rent) + Number(item.electricity_fee), 0);
    let y = d.filter((g) => g.day >= n && !c.has(g.day));
    let need = y.reduce((acc, item) => acc + Number(item.rent) + Number(item.electricity_fee), 0);
    if (need <= 0) {
      continue;
    }
    let v = s.find((g) => g.market_id === m.id);
    let _ = Math.max(0, (v ? Number(v.prepaid) - Number(v.used) : 0) - r);
    if (_ + 0.5 >= need) {
      continue;
    }
    let u = need - _;
    let p = Number(n.slice(5, 7));
    b.push({
      marketId: m.id,
      name: m.name,
      month: n,
      days: y.length,
      need,
      amount: u,
      href: `#/entry?type=payment&kind=rent_prepay&market=${m.id}&amt=${u}&cf=${n}&ct=${l}&desc=${encodeURIComponent(
        `${p}\u6708\u79DF\u91D1`
      )}`,
    });
  }
  return b;
}

export const fh = (dayStr) => Number(monthEnd(dayStr).slice(8)) - Number(dayStr.slice(8)) < 7;

export const inLastDays = (e, t) => Number(monthEnd(e).slice(8)) - Number(e.slice(8)) < t;

const O1 = [1, 4, 7, 10];

export const ph = (e) => {
  let t = Number(e.slice(5, 7));
  let a = O1.filter((n) => n <= t).at(-1);
  return `${e.slice(0, 4)}-${String(a).padStart(2, "0")}-01`;
};

export async function bh(e, t) {
  if (!t) {
    return null;
  }
  let a = ph(e);
  let n = addMonths(a, 3);
  let quarter = e >= addDays(n, -5) ? n : e < addMonths(a, 1) ? a : null;
  if (
    !quarter ||
    (
      await db.select("transactions", {
        where: [
          isNull("deleted_at"),
          eq("category_id", t),
          gte("txn_date", quarter),
          lte("txn_date", addDays(addMonths(quarter, 1), -1)),
        ],
      })
    ).length > 0
  ) {
    return null;
  }
  let i = await db.select("transactions", {
    where: [isNull("deleted_at"), eq("category_id", t)],
    order: "txn_date.desc",
    limit: 1,
  });
  let monthly = Number(i[0]?.amount ?? 4000);
  let c = Number(quarter.slice(5, 7));
  return {
    quarter,
    label: `${c}\u2013${c + 2} \u6708`,
    amount: monthly * 3,
    monthly,
    late: e > addDays(quarter, 4),
    href: `#/warehouse-rent?q=${quarter}`,
  };
}
