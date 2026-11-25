import { db, eq, gte, isNull, lte } from "./supabase.js";

export function pnlEntries(e, t) {
  return db.select("v_pnl_entries", {
    where: [gte("entry_date", e), lte("entry_date", t)],
    order: "entry_date",
  });
}

export function totals(e) {
  let t = {
    income: 0,
    otherIncome: 0,
    opExpense: 0,
    opProfit: 0,
    fixed: 0,
    personal: 0,
    groups: {},
  };
  for (let a of e) {
    let n = Number(a.amount);
    if (a.kind === "income") {
      if (a.tier === 1) {
        t.income += n;
      } else if (a.tier === 0) {
        t.otherIncome += n;
      }
      continue;
    }
    if (a.tier === 1) {
      t.opExpense += n;
      t.groups[a.report_group] = (t.groups[a.report_group] ?? 0) + n;
    } else if (a.tier === 2) {
      t.fixed += n;
    } else if (a.tier === 3) {
      t.personal += n;
    }
  }
  t.opProfit = t.income - t.opExpense;
  return t;
}

export function monthlySummaries(e, t) {
  return db.select("v_monthly_summary", {
    where: [gte("month", e), lte("month", t)],
    order: "month",
  });
}

export async function dayBundle(e) {
  let a =
    (
      await db.select("business_days", {
        where: [eq("day", e), isNull("deleted_at")],
      })
    )[0] ?? null;
  if (!a) {
    return {
      day: null,
      counts: [],
      txns: [],
    };
  }
  let [n, l] = await Promise.all([
    db.select("daily_item_counts", {
      where: [eq("business_day_id", a.id), isNull("deleted_at")],
    }),
    db.select("transactions", {
      where: [eq("business_day_id", a.id), isNull("deleted_at")],
      order: "created_at",
    }),
  ]);
  return {
    day: a,
    counts: n,
    txns: l,
  };
}

export function suggestMarkets(p_day) {
  return db.rpc("suggest_markets", {
    p_day,
  });
}
