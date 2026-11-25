import * as React from "react";
import { StallRanking } from "../components/StallRanking.jsx";
import { TxnList } from "../components/TxnList.jsx";
import {
  Badge,
  Btn,
  Card,
  Collapse,
  Empty,
  ErrorBox,
  List,
  Loading,
  Money,
  Row,
  Section,
  Segmented,
  cx,
} from "../components/ui.jsx";
import { BACKUP_KEY } from "../lib/backup.js";
import {
  addDays,
  addMonths,
  dateLabel,
  money,
  monthEnd,
  monthStart,
  num,
  shortDate,
  today_,
  weekStart,
} from "../lib/format.js";
import { isWagePayer } from "../lib/models.js";
import { dayBundle, monthlySummaries, pnlEntries, suggestMarkets, totals } from "../lib/queries.js";
import { bh, inLastDays, nextMonthRentDue } from "../lib/rentDue.js";
import { savedKey } from "../lib/stallReport.js";
import { useQuery, useStore } from "../lib/store.jsx";
import { db, isNull, lte } from "../lib/supabase.js";
import { PlanCalendar } from "./Settings.jsx";

const PERIOD_LABELS = {
  today: "今日",
  yesterday: "昨日",
  week: "本週",
  prev: "前週",
  month: "本月",
};

const gh = (e) => {
  if (e <= 1) {
    return "前週";
  }
  return `\u524D${e}\u9031`;
};

function periodRange(e, t, a = 1) {
  if (e === "yesterday") {
    return [addDays(t, -1), addDays(t, -1)];
  }
  if (e === "week") {
    return [weekStart(t), t];
  }
  if (e === "prev") {
    let n = addDays(weekStart(t), -7 * a);
    return [n, addDays(n, 6)];
  }
  if (e === "month") {
    return [monthStart(t), t];
  }
  return [t, t];
}

function MoneyBar({ t: t_1 }) {
  let t = t_1.groups.地瓜 ?? 0;
  let a = t_1.groups.攤位租金 ?? 0;
  let n = t_1.opExpense - t - a;
  let l = Math.max(0, t_1.opProfit);
  let s = Math.max(t_1.income, t_1.opExpense, 1);
  let i = [
    {
      k: "地瓜成本",
      v: t,
      c: "bg-c-cost",
    },
    {
      k: "租金",
      v: a,
      c: "bg-c-rent",
    },
    {
      k: "其他支出",
      v: n,
      c: "bg-c-other",
    },
    {
      k: "淨利",
      v: l,
      c: "bg-c-profit",
    },
  ].filter((o) => o.v > 0);
  if (t_1.income === 0 && t_1.opExpense === 0) {
    return null;
  }
  return (
    <figure className="mt-4" aria-label="營收分配">
      <div className="flex h-4 gap-[2px] overflow-hidden rounded-[4px]">
        {i.map((o) => (
          <div
            key={o.k}
            className={o.c}
            style={{
              width: `${(o.v / s) * 100}%`,
            }}
            title={`${o.k} ${money(o.v)}`}
          />
        ))}
      </div>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        {i.map((o) => (
          <span key={o.k} className="inline-flex items-center gap-1.5">
            <span className={cx("inline-block h-2.5 w-2.5 rounded-sm", o.c)} aria-hidden />
            {o.k} <span className="tnum font-bold text-ink">{money(o.v)}</span>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

function CountsCard({ counts }) {
  let { items } = useStore();
  let a = items.filter((l) => l.track_inventory && l.is_active);
  let n = counts.some((l) => l.is_mismatch);
  return (
    <Card>
      <div className="grid grid-cols-3 gap-3">
        {a.map((l) => {
          let s = counts.find((i) => i.item_id === l.id);
          return (
            <div key={l.id} className={cx("rounded-xl p-2 text-center", s?.is_mismatch ? "bg-warn-soft" : "bg-sunk")}>
              <div className="font-bold">{l.short_name ?? l.name}</div>
              <div className="tnum mt-1 text-2xl font-bold">{num(s?.cooked)}</div>
              <div className="text-xs text-muted">實際烤</div>
              <div className="tnum mt-1 text-sm text-muted">
                帶 {num(s?.carried)}・
                <span className={cx(Number(s?.remaining) > 0 && "text-[1.05rem] font-bold text-red")}>
                  剩 {num(s?.remaining)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {n && <p className="mt-3 text-sm font-bold text-warn">⚠ 帶出 ≠ 實際烤 ＋ 剩餘，請確認數量</p>}
    </Card>
  );
}

function Alerts() {
  let e = useStore();
  let t = useQuery(async () => {
    let s = today_();
    let [i, o, c, b] = await Promise.all([
      db.select("v_advance_balances"),
      db.select("v_supplier_balances"),
      db.select("v_inventory"),
      inLastDays(s, 10)
        ? nextMonthRentDue(s, e.markets).catch(() => [])
        : Number(s.slice(8)) <= 10
        ? nextMonthRentDue(s, e.markets, monthStart(s)).catch(() => [])
        : Promise.resolve([]),
    ]);
    let wh = await bh(s, e.catByCode("WAREHOUSE_RENT")?.id).catch(() => null);
    return {
      adv: i,
      sup: o,
      inv: c,
      due: b,
      wh,
    };
  }, [e.markets.length]);
  if (!t.data) {
    return null;
  }
  let a = [];
  t.data.adv
    .filter((s) => s.advanced - s.repaid > 0.5)
    .forEach((s) =>
      a.push(
        isWagePayer(e.payer(s.payer_id))
          ? {
              text: `${s.name}\u85AA\u6C34\u672A\u4ED8 ${money(
                s.advanced - s.repaid
              )}\uFF08\u6708\u5E95\u7D50\u7B97\uFF09`,
              href: "#/personal",
              tone: "flesh",
            }
          : {
              text: `\u751F\u610F\u6B20 ${s.name} \u4EE3\u588A ${money(s.advanced - s.repaid)}`,
              href: "#/accounts/advances",
              tone: "flesh",
            }
      )
    );
  t.data.sup
    .filter((s) => s.purchased - s.paid > 0.5)
    .forEach((s) =>
      a.push({
        text: `${s.name} \u8CA8\u6B3E\u672A\u4ED8 ${money(s.purchased - s.paid)}`,
        href: "#/purchases/suppliers",
        tone: "flesh",
      })
    );
  if (t.data.wh) {
    a.push({
      text: `\u5009\u5EAB\u79DF\u91D1 ${t.data.wh.label}\u9084\u6C92\u4ED8 ${money(t.data.wh.amount)}\uFF08${
        t.data.wh.late ? "已過 5 號" : `${Number(t.data.wh.quarter.slice(5, 7))}/5 \u524D`
      }\uFF0C\u5F9E\u91D1\u5EAB\uFF09`,
      href: `${t.data.wh.href}&amt=${t.data.wh.monthly}`,
      tone: "warn",
    });
  }
  t.data.due.forEach((s) =>
    a.push({
      text: `${s.name} ${Number(s.month.slice(5, 7))}\u6708\u79DF\u91D1\u9084\u6C92\u9810\u4ED8 ${money(
        s.amount
      )}\uFF08${s.days} \u5929\uFF09`,
      href: s.href,
      tone: "warn",
    })
  );
  t.data.inv
    .filter((s) => s.on_hand < 1)
    .forEach((s) =>
      a.push({
        text: `${s.name} \u5EAB\u5B58\u5269 ${num(s.on_hand)} \u5305`,
        href: "#/purchases/stock",
        tone: "warn",
      })
    );
  let n = e.settings[BACKUP_KEY];
  let l = typeof n === "string" ? Math.floor((Date.now() - new Date(n).getTime()) / 86400000) : null;
  if (l === null || l >= 7) {
    a.push({
      text: l === null ? "還沒備份過資料，建議現在備份一次" : `\u5DF2\u7D93 ${l} \u5929\u6C92\u5099\u4EFD\u8CC7\u6599`,
      href: "#/settings/backup",
      tone: "warn",
    });
  }
  if (a.length === 0) {
    return null;
  }
  return (
    <Section title="提醒">
      <List>
        {a.map((s) => (
          <a
            key={s.text}
            href={s.href}
            className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 active:bg-sunk"
          >
            <Badge tone={s.tone}>{s.tone === "warn" ? "注意" : "待處理"}</Badge>
            <span className="flex-1">{s.text}</span>
            <span className="text-muted" aria-hidden>
              ›
            </span>
          </a>
        ))}
      </List>
    </Section>
  );
}

function MonthEndCheck() {
  let e = useStore();
  let [t, setT] = React.useState(false);
  let n = today_();
  let l = Number(n.slice(8)) <= 3;
  let s = l || inLastDays(n, 5);
  let i = l ? addMonths(monthStart(n), -1) : monthStart(n);
  let o = monthEnd(i);
  let c = addDays(o, -6);
  let b = useQuery(async () => {
    if (!s) {
      return null;
    }
    let [k, M, T] = await Promise.all([
      db.select("v_advance_balances"),
      db.select("v_supplier_balances"),
      nextMonthRentDue(l ? addDays(monthStart(n), -1) : n, e.markets).catch(() => []),
    ]);
    return {
      adv: k,
      sup: M,
      due: T,
    };
  }, [s, i, e.markets.length]);
  if (!s || !b.data) {
    return null;
  }
  let m = (k, M) =>
    (e.acctByCode(k)?.notes ?? "")
      .split(
        `
`
      )
      .some((T) => T.includes(M) && /^\d{4}-\d{2}-\d{2}/.test(T) && T.slice(0, 10) >= c);
  let d = (k) => b.data.adv.filter((M) => isWagePayer(e.payer(M.payer_id)) === k && M.advanced - M.repaid > 0.5);
  let r = b.data.sup.filter((k) => k.purchased - k.paid > 0.5);
  let y = e.settings[BACKUP_KEY];
  let h = e.acctByCode("CASH_BOX")?.id ?? e.cashAccountId;
  let v = e.acctByCode("POST")?.id;
  let _ = Number(addMonths(i, 1).slice(5, 7));
  let u = [
    {
      ok: m("CASH_BOX", "盤點"),
      text: "金庫盤點（數現金，輸入實際金額）",
      href: `#/accounts/${h}`,
    },
    ...(v
      ? [
          {
            ok: m("POST", "對存摺"),
            text: "郵局對存摺",
            href: `#/accounts/${v}`,
          },
        ]
      : []),
    {
      ok: b.data.due.length === 0,
      text: b.data.due.length
        ? `${_} \u6708\u79DF\u91D1\u9084\u6C92\u9810\u4ED8\uFF1A${b.data.due
            .map((k) => `${k.name} ${money(k.amount)}`)
            .join("、")}`
        : `${_} \u6708\u79DF\u91D1\u90FD\u9810\u4ED8\u4E86`,
      href: b.data.due[0]?.href ?? "#/settings/markets",
    },
    {
      ok: d(true).length === 0,
      text: d(true).length
        ? `\u5BB6\u4EBA\u85AA\u6C34\u9084\u6C92\u4ED8\uFF1A${d(true)
            .map((k) => `${k.name} ${money(k.advanced - k.repaid)}`)
            .join("、")}`
        : "家人薪水都付清了",
      href: "#/personal",
    },
    {
      ok: r.length === 0,
      text: r.length
        ? `\u8CA8\u6B3E\u9084\u6C92\u4ED8\uFF1A${r.map((k) => `${k.name} ${money(k.purchased - k.paid)}`).join("、")}`
        : "貨款都付清了",
      href: "#/purchases/suppliers",
    },
    {
      ok: d(false).length === 0,
      text: d(false).length
        ? `\u9084\u6C92\u9084\u7684\u4EE3\u588A\uFF1A${d(false)
            .map((k) => `${k.name} ${money(k.advanced - k.repaid)}`)
            .join("、")}`
        : "代墊都還清了",
      href: "#/accounts/advances",
    },
    {
      ok: typeof y === "string" && y.slice(0, 10) >= c,
      text: "備份資料（下載一份存到雲端）",
      href: "#/settings/backup",
    },
    {
      ok: typeof e.settings[savedKey(i.slice(0, 7))] === "string",
      text: `\u4E0B\u8F09 ${Number(
        i.slice(5, 7)
      )} \u6708\u6524\u4F4D\u6536\u652F\u660E\u7D30\u8868\uFF08Excel \u6216 PDF\uFF09\u5B58\u5230\u96FB\u8166`,
      href: `#/stall-month?m=${i.slice(0, 7)}`,
    },
  ];
  let length = u.filter((k) => k.ok).length;
  let g = u.filter((k) => !k.ok);
  if (g.length === 0 && !t) {
    return (
      <button
        type="button"
        onClick={() => setT(true)}
        className="mb-6 flex min-h-12 w-full items-center gap-3 rounded-2xl bg-leaf-soft px-4 text-left font-bold text-leaf"
      >
        <span aria-hidden>✓</span>
        <span className="flex-1">{Number(i.slice(5, 7))} 月月底對帳完成</span>
        <span className="text-sm font-normal">看明細 ›</span>
      </button>
    );
  }
  let f = t ? u : g;
  return (
    <Section
      title={`${Number(i.slice(5, 7))} \u6708\u6708\u5E95\u5C0D\u5E33`}
      aside=<span className={cx("tnum text-sm font-bold", length === u.length ? "text-leaf" : "text-muted")}>
        {length}/{u.length} 完成
      </span>
    >
      <List>
        {f.map((k) => (
          <a
            key={k.text}
            href={k.href}
            className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 active:bg-sunk"
          >
            <span
              aria-label={k.ok ? "完成" : "還沒做"}
              className={cx(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                k.ok ? "bg-leaf text-white" : "border-2 border-line text-transparent"
              )}
            >
              ✓
            </span>
            <span className={cx("flex-1", k.ok && "text-muted")}>{k.text}</span>
            <span className="text-muted" aria-hidden>
              ›
            </span>
          </a>
        ))}
        {length > 0 && (
          <button
            type="button"
            onClick={() => setT(!t)}
            className="flex min-h-11 w-full items-center justify-center text-sm font-bold text-flesh-ink active:bg-sunk"
          >
            {t ? "只看還沒做的 ▲" : `\u5DF2\u5B8C\u6210 ${length} \u9805 \u25BC`}
          </button>
        )}
      </List>
    </Section>
  );
}

export function Home() {
  let e = useStore();
  let t = today_();
  let [a, setA] = React.useState("today");
  let [l, setL] = React.useState(1);
  let [i, o] = periodRange(a, t, l);
  let c = (g) => {
    setL(g === "prev" && a === "prev" ? l + 1 : 1);
    setA(g);
  };
  let b = a === "prev" ? gh(l) : PERIOD_LABELS[a];
  let m = useQuery(async () => totals(await pnlEntries(i, o)), [i, o]);
  let d = useQuery(async () => {
    let [g, f] = await Promise.all([dayBundle(t), suggestMarkets(t)]);
    return {
      ...g,
      suggestion: f[0] ?? null,
    };
  }, [t]);
  let r = useQuery(async () => {
    let g = t.slice(0, 4);
    let f = await monthlySummaries(`${g}-01-01`, `${g}-12-31`);
    return {
      rows: f,
      cur: f.find((k) => k.month === monthStart(t)) ?? null,
    };
  }, [t]);
  let y = useQuery(
    () =>
      db.select("transactions", {
        where: [isNull("deleted_at"), isNull("fee_parent_id"), lte("txn_date", t)],
        order: "txn_date.desc,created_at.desc",
        limit: 30,
      }),
    [t]
  );
  let h = (g) => {
    if (g.type === "income") {
      return 0;
    }
    return 1;
  };
  let v = y.data
    ?.filter((g) => e.cat(g.category_id)?.tier !== 3 && !(g.source === "import" && !g.daily_slot))
    .map((tx, f) => ({
      tx,
      i: f,
    }))
    .sort((g, f) => f.tx.txn_date.localeCompare(g.tx.txn_date) || h(g.tx) - h(f.tx) || g.i - f.i)
    .map((g) => g.tx)
    .slice(0, 6);
  let _ = d.data?.suggestion ?? null;
  let u = d.data?.day?.market_id ? e.market(d.data.day.market_id)?.name : _?.market_id ? _.name : undefined;
  let p = (d.data?.day && d.data.day.status !== "open") || (!d.data?.day && _ && !_.market_id);
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4 md:pb-10">
      <header className="mb-4">
        <p className="text-muted">{dateLabel(t)}</p>
        <div className="flex items-center gap-2">
          <h1 className="text-[1.6rem] font-bold">
            {p ? "今天休息" : u ? `\u4ECA\u5929\u5728 ${u}` : "今天還沒排市場"}
          </h1>
        </div>
        {!d.data?.day && _?.market_id && (
          <p className="text-muted">
            租金 {money(_.rent)}・{_.payment_method === "cash" ? "當場付現" : "整月預付"}
          </p>
        )}
      </header>
      <Card className="mb-4">
        <Segmented
          value={a}
          onChange={c}
          options={Object.keys(PERIOD_LABELS).map((g) => ({
            value: g,
            label: g === "prev" && a === "prev" ? gh(l) : PERIOD_LABELS[g],
          }))}
        />
        {a === "prev" && (
          <div className="mt-2 flex items-center justify-between text-sm">
            <button
              type="button"
              className="min-h-10 rounded-lg px-2 font-bold text-flesh-ink active:bg-sunk"
              onClick={() => setL(l + 1)}
            >
              ‹ 再往前一週
            </button>
            {l > 1 && (
              <button
                type="button"
                className="min-h-10 rounded-lg px-2 font-bold text-flesh-ink active:bg-sunk"
                onClick={() => setL(l - 1)}
              >
                往後一週 ›
              </button>
            )}
          </div>
        )}
        {m.loading && !m.data ? (
          <Loading text="載入營運資料中…" />
        ) : m.error ? (
          <div className="mt-3">
            <ErrorBox text="目前無法載入營運資料，請稍後再試。" onRetry={m.reload} />
          </div>
        ) : (
          m.data && (
            <div className="mt-4">
              <div className="text-muted">
                {b}營業淨利
                {a !== "today" && a !== "yesterday" && (
                  <span className="text-sm">
                    （{shortDate(i)}–{shortDate(o)}）
                  </span>
                )}
              </div>
              <div className={cx("tnum text-[2.75rem] font-bold leading-none", m.data.opProfit < 0 && "text-warn")}>
                {money(m.data.opProfit)}
              </div>
              <div className="tnum mt-2 flex gap-5 text-[0.95rem]">
                <span>
                  收入 <b className="text-leaf">{money(m.data.income)}</b>
                </span>
                <span>
                  營業支出 <b className="text-skin">{money(m.data.opExpense)}</b>
                </span>
                {m.data.income > 0 && (
                  <span className="text-muted">淨利率 {Math.round((m.data.opProfit / m.data.income) * 100)}%</span>
                )}
              </div>
              {m.data.income === 0 && m.data.opExpense === 0 ? (
                <p className="mt-3 text-muted">這段期間還沒有記帳。</p>
              ) : (
                <MoneyBar t={m.data} />
              )}
            </div>
          )
        )}
      </Card>
      <Btn kind="primary" big className="mb-3 w-full" href="#/daily">
        今天記帳（收攤後一次記完）
      </Btn>
      <div className="mb-6 grid grid-cols-4 gap-2">
        {[
          {
            href: "#/entry?type=income",
            label: "收入",
            c: "text-leaf",
          },
          {
            href: "#/entry?type=expense",
            label: "支出",
            c: "text-skin",
          },
          {
            href: "#/purchases/new",
            label: "進貨",
            c: "text-flesh-ink",
          },
          {
            href: "#/daily?focus=counts",
            label: "數量",
            c: "text-ink",
          },
        ].map((g) => (
          <a
            key={g.label}
            href={g.href}
            className="flex min-h-12 items-center justify-center gap-1 rounded-2xl bg-card font-bold active:bg-sunk"
          >
            <span className={cx("text-xl leading-none", g.c)} aria-hidden>
              ＋
            </span>
            <span>{g.label}</span>
          </a>
        ))}
      </div>
      <Alerts />
      <MonthEndCheck />
      <Section
        title="今日地瓜"
        aside={
          d.data && d.data.counts.length > 0 ? (
            <a href="#/daily?focus=counts" className="text-sm font-bold text-flesh-ink">
              記數量
            </a>
          ) : undefined
        }
      >
        {d.loading && !d.data ? (
          <Loading />
        ) : d.error ? (
          <ErrorBox text={d.error} onRetry={d.reload} />
        ) : d.data && d.data.counts.length > 0 ? (
          <CountsCard counts={d.data.counts} />
        ) : (
          <a
            href="#/daily?focus=counts"
            className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border-[1.5px] border-dashed border-line px-4 active:bg-sunk"
          >
            <span className="text-muted">今天還沒記地瓜數量</span>
            <span className="font-bold text-flesh-ink">記數量 ›</span>
          </a>
        )}
      </Section>
      <StallRanking compact month={Number(t.slice(8)) <= 7 ? addMonths(monthStart(t), -1) : monthStart(t)} />
      <Collapse id="home-calendar" title="攤位租金月曆" summary="這個月出攤和租金">
        <PlanCalendar compact />
      </Collapse>
      <Collapse
        id="home-month"
        title="本月統計"
        summary={
          r.data?.cur ? (
            <>
              淨利{" "}
              <b className={cx(Number(r.data.cur.op_profit) < 0 ? "text-warn" : "text-ink")}>
                {money(r.data.cur.op_profit)}
              </b>
              ・{r.data.cur.open_days} 天
            </>
          ) : undefined
        }
        aside=<a
          href="#/reports"
          className="flex min-h-12 shrink-0 items-center rounded-2xl bg-card px-3 font-bold text-flesh-ink active:bg-sunk"
        >
          報表
        </a>
      >
        {r.loading && !r.data ? (
          <Loading />
        ) : r.error ? (
          <ErrorBox text={r.error} onRetry={r.reload} />
        ) : (
          r.data &&
          (() => {
            let cur = r.data.cur;
            let f = cur?.open_days ?? 0;
            let k = r.data.rows.reduce((acc, row) => acc + Number(row.op_profit), 0);
            let M = r.data.rows.reduce((acc, row) => acc + Number(row.income), 0);
            let T = r.data.rows.reduce((acc, row) => acc + Number(row.op_expense), 0);
            return (
              <List>
                <Row label="本月收入" value=<Money value={cur?.income ?? 0} /> />
                <Row label="本月營業支出" value=<Money value={cur?.op_expense ?? 0} /> />
                <Row label="本月營業淨利" strong value=<Money value={cur?.op_profit ?? 0} tone="auto" /> />
                <Row
                  label="營業天數"
                  value=<span className="tnum">
                    {f} 天{cur?.rest_days ? `\uFF08\u4F11 ${cur.rest_days}\uFF09` : ""}
                  </span>
                />
                <Row label="平均每日收入" value=<Money value={f ? (cur?.income ?? 0) / f : 0} /> />
                <Row label="平均每日淨利" value=<Money value={f ? (cur?.op_profit ?? 0) / f : 0} /> />
                <Row
                  label={`${t.slice(0, 4)} \u5E74\u5EA6\u71DF\u696D\u6DE8\u5229`}
                  sub={`\u6536\u5165 ${money(M)} \u2212 \u71DF\u696D\u652F\u51FA ${money(T)}`}
                  value=<Money value={k} tone="auto" className="font-bold" />
                />
                <Row
                  label="本月扣除固定支出後"
                  sub="營業淨利再扣生財器具、車貸、倉庫（生活開銷另外在「個人」）"
                  value=<Money value={cur?.after_fixed ?? 0} tone="auto" />
                  onClick={() => {
                    location.hash = `#/reports/month?m=${monthStart(t)}`;
                  }}
                />
              </List>
            );
          })()
        )}
      </Collapse>
      <Section
        title="最近記帳"
        aside=<a href="#/transactions" className="text-sm font-bold text-flesh-ink">
          全部
        </a>
      >
        {y.loading && !y.data ? (
          <Loading />
        ) : y.error ? (
          <ErrorBox text={y.error} onRetry={y.reload} />
        ) : v && v.length === 0 ? (
          <Empty
            text="目前尚無記帳資料"
            action=<div className="flex justify-center gap-2">
              <Btn href="#/entry?type=income">＋新增收入</Btn>
              <Btn href="#/entry?type=expense">＋新增支出</Btn>
            </div>
          />
        ) : (
          v && (
            <TxnList
              txns={v}
              onChanged={() => {
                y.reload();
                m.reload();
                r.reload();
              }}
            />
          )
        )}
      </Section>
    </div>
  );
}
