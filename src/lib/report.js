import { WEEKDAYS, weekday } from "./format.js";
import { db, gte, inList, isNull, lte } from "./supabase.js";

export function Ir(e) {
  let map = new Map();
  for (let n of e) {
    let l = `${n.kind}|${n.tier}|${n.report_group}`;
    let order = n.sort_order;
    let i = map.get(l);
    if (!i || order < i.order) {
      map.set(l, {
        def: {
          kind: n.kind,
          tier: n.tier,
          group: n.report_group,
        },
        order,
      });
    }
  }
  let a = (def) => {
    if (def.kind === "income") {
      if (def.tier === 1) {
        return 0;
      }
      return 1;
    }
    return 1 + def.tier;
  };
  return [...map.values()].sort((n, l) => a(n.def) - a(l.def) || n.order - l.order).map((n) => n.def);
}

export function sm(e) {
  let map = new Map();
  for (let a of e) {
    let n = `${a.kind}|${a.tier}|${a.report_group}`;
    if (!map.has(n)) {
      map.set(n, new Map());
    }
    let l = map.get(n);
    let s = a.month.slice(0, 7);
    l.set(s, (l.get(s) ?? 0) + Number(a.amount));
  }
  return (a, n) => map.get(`${a.kind}|${a.tier}|${a.group}`)?.get(n) ?? 0;
}

export const SECTION_TITLES = [
  {
    kind: "income",
    tier: 1,
    title: "收入",
    total: "收入合計",
  },
  {
    kind: "expense",
    tier: 1,
    title: "營業支出",
    total: "營業淨利",
  },
  {
    kind: "expense",
    tier: 2,
    title: "生財器具與固定支出",
    total: "扣除後結餘",
  },
  {
    kind: "income",
    tier: 0,
    title: "其他收入（不算淨利）",
    total: "",
  },
];

export function eo(e, t, categories) {
  let n = Array.from(
    {
      length: 12,
    },
    (r, y) => `${e}-${String(y + 1).padStart(2, "0")}`
  );
  let l = sm(t);
  let s = Ir(categories).filter((r) => r.tier < 3);
  let i = [["", e, ...n.map((r) => `${Number(r.slice(5))}\u6708`), "小計"]];
  let o = [0];
  let c = (r, y) => s.filter(r).reduce((acc, item) => acc + l(item, y), 0);
  let b = (r) => c((y) => y.kind === "income" && y.tier === 1, r);
  let m = (r, y) => c((h) => h.kind === "expense" && h.tier === r, y);
  let d = {
    收入合計: b,
    營業淨利: (r) => b(r) - m(1, r),
    扣除後結餘: (r) => b(r) - m(1, r) - m(2, r),
  };
  for (let r of SECTION_TITLES) {
    let y = s.filter((h) => h.kind === r.kind && h.tier === r.tier);
    if (
      !(y.length === 0 && !r.total) &&
      (y.forEach((h, v) => {
        let _ = n.map((u) => l(h, u) * (h.kind === "expense" ? -1 : 1));
        i.push([v === 0 ? r.title : "", h.group, ..._, _.reduce((acc, item) => acc + item, 0)]);
      }),
      r.total)
    ) {
      let h = n.map((v) => d[r.total](v));
      o.push(i.length);
      i.push(["", r.total, ...h, h.reduce((acc, item) => acc + item, 0)]);
    }
  }
  return {
    name: `${e} \u6536\u652F\u660E\u7D30\u8868`,
    rows: i,
    widths: [18, 16, ...n.map(() => 11), 12],
    boldRows: o,
  };
}

export async function Wr(e, t, categories, items, l) {
  let [s, i] = await Promise.all([
    db.select("v_pnl_entries", {
      where: [gte("entry_date", e), lte("entry_date", t)],
    }),
    db.select("business_days", {
      where: [isNull("deleted_at"), gte("day", e), lte("day", t)],
    }),
  ]);
  let o = i.length
    ? await db.select("daily_item_counts", {
        where: [
          isNull("deleted_at"),
          inList(
            "business_day_id",
            i.map((v) => v.id)
          ),
        ],
      })
    : [];
  let c = Ir(categories).filter((v) => !(v.kind === "income" && v.tier === 0) && v.tier < 3);
  let b = items.filter((v) => v.track_inventory);
  let d = [
    [
      "日期",
      "星期",
      "地點",
      "天氣",
      ...c.map((v) => {
        if (v.kind === "income") {
          return `\u6536\u5165\uFF1A${v.group}`;
        }
        return v.group;
      }),
      "營業淨利",
      ...b.flatMap((v) => [
        `\u5E36 ${v.short_name ?? v.name}`,
        `\u70E4 ${v.short_name ?? v.name}`,
        `\u5269 ${v.short_name ?? v.name}`,
      ]),
    ],
  ];
  let r = [...new Set([...s.map((v) => v.entry_date), ...i.map((v) => v.day)])].sort();
  let y = c.map(() => 0);
  let h = 0;
  for (let v of r) {
    let _ = i.find((k) => k.day === v);
    let u = s.filter((k) => k.entry_date === v);
    let p = c.map((k) =>
      u
        .filter((M) => M.kind === k.kind && M.tier === k.tier && M.report_group === k.group)
        .reduce((acc, item) => acc + Number(item.amount), 0)
    );
    let g = c.reduce(
      (acc, item, index) => acc + (item.tier === 1 ? (item.kind === "income" ? p[index] : -p[index]) : 0),
      0
    );
    p.forEach((k, M) => {
      y[M] += k;
    });
    h += g;
    let f = o.filter((k) => k.business_day_id === _?.id);
    d.push([
      v,
      `週${WEEKDAYS[weekday(v)]}`,
      _?.status === "open" ? l(_.market_id) : _ ? "休息" : "",
      _?.weather ?? "",
      ...p.map((k) => k || null),
      g || null,
      ...b.flatMap((k) => {
        let M = f.find((T) => T.item_id === k.id);
        return [M ? Number(M.carried) : null, M ? Number(M.cooked) : null, M ? Number(M.remaining) : null];
      }),
    ]);
  }
  d.push(["合計", "", "", "", ...y, h]);
  return {
    name: `${e.slice(0, 7)} \u6BCF\u65E5`,
    rows: d,
    widths: [12, 6, 12, 6, ...c.map(() => 11), 11],
    boldRows: [0, d.length - 1],
  };
}

export function Wg(e, t) {
  let a = {
    income: "收入",
    expense: "支出",
    transfer: "轉帳",
    payment: "付款",
  };
  return {
    name: "記帳明細",
    rows: [
      [
        "日期",
        "類型",
        "分類",
        "金額",
        "算式",
        "帳戶",
        "轉入帳戶",
        "付款人",
        "代墊",
        "供應商",
        "市場",
        "手續費",
        "說明",
        "備註",
        "來源",
      ],
      ...e.map((n) => [
        n.txn_date,
        a[n.type],
        t.cat(n.category_id),
        Number(n.amount),
        n.formula,
        t.acct(n.account_id),
        t.acct(n.to_account_id),
        t.payer(n.payer_id),
        n.is_advance ? "是" : "",
        t.supplier(n.supplier_id),
        t.market(n.market_id),
        Number(n.fee) || null,
        n.description,
        n.note,
        n.source,
      ]),
    ],
    widths: [12, 6, 14, 10, 18, 12, 12, 8, 6, 10, 12, 8, 30, 20, 8],
  };
}

export const Pg = {
  date: "日期",
  type: "收入／支出",
  category: "分類",
  amount: "金額",
  account: "帳戶",
  description: "說明",
};

export const eh = {
  date: /日期|date/i,
  type: /類型|收支|type/i,
  category: /分類|項目|科目|category/i,
  amount: /金額|amount|合計|收入|支出/i,
  account: /帳戶|付款方式|account/i,
  description: /說明|明細|備註|摘要|desc|note/i,
};
