import * as React from "react";
import { StallRanking } from "../components/StallRanking.jsx";
import { BarList, ColumnChart } from "../components/charts.jsx";
import { Badge, Btn, Card, Chips, Empty, List, Money, Page, QueryView, Row, Section, Segmented, cx, useFeedback } from "../components/ui.jsx";
import { WEEKDAYS, addMonths, money, monthEnd, monthLabel, monthStart, num, pct, shortDate, today_, weekday } from "../lib/format.js";
import { isWagePayer } from "../lib/models.js";
import { Ir, SECTION_TITLES, Wg, Wr, eo, sm } from "../lib/report.js";
import { navigate } from "../lib/router.js";
import { useQuery, useStore } from "../lib/store.jsx";
import { db, eq, gt, gte, inList, isNull, lte } from "../lib/supabase.js";
import { download_, writeXlsx } from "../lib/xlsx.js";

const REPORT_TABS = [["month", "月報"], ["year", "年報"], ["markets", "市場"], ["purchases", "進貨"]];

const nh = [{
  value: "sum",
  label: "收支"
}, {
  value: "days",
  label: "每天"
}, {
  value: "counts",
  label: "地瓜數量"
}];

const lh = [{
  value: "months",
  label: "每月"
}, {
  value: "expense",
  label: "支出排行"
}, {
  value: "income",
  label: "收入排行"
}];

const sh = {
  daily: ["month", "days"],
  counts: ["month", "counts"],
  expense: ["year", "expense"],
  income: ["year", "income"]
};

function MonthNav({
  month,
  onChange
}) {
  return <div className="mb-4 flex items-center justify-between"><button className="h-11 w-11 rounded-full text-2xl active:bg-sunk" aria-label="上個月" onClick={() => onChange(addMonths(month, -1))}>‹</button><span className="text-lg font-bold">{monthLabel(month)}</span><button className="h-11 w-11 rounded-full text-2xl active:bg-sunk" aria-label="下個月" onClick={() => onChange(addMonths(month, 1))}>›</button></div>;
}

function YearNav({
  year,
  onChange
}) {
  return <div className="mb-4 flex items-center justify-between"><button className="h-11 w-11 rounded-full text-2xl active:bg-sunk" aria-label="前一年" onClick={() => onChange(String(Number(year) - 1))}>‹</button><span className="text-lg font-bold">{year} 年</span><button className="h-11 w-11 rounded-full text-2xl active:bg-sunk" aria-label="下一年" onClick={() => onChange(String(Number(year) + 1))}>›</button></div>;
}

export function Reports({
  route
}) {
  let t = route.parts[1] ?? "month";
  let a = today_();
  let n = route.query.get("m") || monthStart(a);
  let l = route.query.get("y") || a.slice(0, 4);
  let s = (m, d = {}) => navigate(`/reports/${m}?${new URLSearchParams(d)}`);
  if (t === "accounts") {
    navigate("/accounts");
    return null;
  }
  if (t === "advances") {
    navigate("/accounts/advances");
    return null;
  }
  if (t === "detail") {
    return <F11 route={route} />;
  }
  if (sh[t]) {
    let [m, d] = sh[t];
    s(m, {
      ...Object.fromEntries(route.query),
      v: d
    });
    return null;
  }
  let i = t;
  let o = route.query.get("v") || "";
  let c = nh.some(m => m.value === o) ? o : "sum";
  let b = lh.some(m => m.value === o) ? o : "months";
  return <Page title="報表" wide><nav aria-label="報表種類" className="mb-4 grid grid-cols-4 gap-2">{REPORT_TABS.map(([m, d]) => <a key={m} href={`#/reports/${m}`} aria-current={m === i ? "page" : undefined} className={cx("rounded-full px-2 py-2 text-center font-bold", m === i ? "bg-ink text-bg" : "bg-card text-muted")}>{d}</a>)}</nav>{i === "month" && <><div className="mx-auto max-w-2xl"><MonthNav month={n} onChange={m => s("month", {
          m,
          v: c
        })} /><Segmented className="mb-4" value={c} onChange={m => s("month", {
          m: n,
          v: m
        })} options={nh} /></div>{c === "sum" && <MonthReport month={n} />}{c === "days" && <R11 month={n} />}{c === "counts" && <M11 month={n} />}</>}{i === "year" && <><YearNav year={l} onChange={m => s("year", {
        y: m,
        v: b
      })} /><Segmented className="mx-auto mb-4 max-w-2xl" value={b} onChange={m => s("year", {
        y: l,
        v: m
      })} options={lh} />{b === "months" && <YearReport year={l} />}{(b === "expense" || b === "income") && <C11 kind={b} year={l} />}</>}{i === "markets" && <U11 year={l} onYear={m => s("markets", {
      y: m
    })} />}{i === "purchases" && <D11 year={l} onYear={m => s("purchases", {
      y: m
    })} />}</Page>;
}

function MonthReport({
  month
}) {
  let t = useStore();
  let {
    toast
  } = useFeedback();
  let n = useQuery(async () => {
    let [cats, i] = await Promise.all([db.select("v_monthly_category", {
      where: [gte("month", month), lte("month", month)]
    }), db.select("v_monthly_summary", {
      where: [gte("month", month), lte("month", month)]
    })]);
    return {
      cats,
      sum: i[0] ?? null
    };
  }, [month]);
  async function l() {
    try {
      toast("產生 Excel 中…", "info");
      let s = month.slice(0, 4);
      let i = await db.select("v_monthly_category", {
        where: [gte("month", `${s}-01-01`), lte("month", `${s}-12-31`)]
      });
      let o = await Wr(month, monthEnd(month), t.categories, t.items, c => t.market(c)?.name ?? "");
      download_(await writeXlsx([o, eo(s, i, t.categories)]), `\u5730\u74DC\u71DF\u904B_${month.slice(0, 7)}.xlsx`);
      toast("已下載 Excel", "ok");
    } catch {
      toast("匯出失敗，請再試一次。", "error");
    }
  }
  return <div className="mx-auto max-w-2xl"><QueryView q={n} loadingText="載入月報中…" empty={s => {
      if (s.cats.length === 0) {
        return <Empty text="這個月還沒有資料" />;
      }
      return null;
    }}>{s => {
        let i = sm(s.cats);
        let o = month.slice(0, 7);
        let c = Ir(t.categories);
        let s_sum = s.sum;
        let m = {
          收入合計: Number(s_sum?.income ?? 0),
          營業淨利: Number(s_sum?.op_profit ?? 0),
          扣除後結餘: Number(s_sum?.after_fixed ?? 0)
        };
        return <><div className="mb-4 grid grid-cols-3 gap-2"><Card className="text-center"><div className="text-sm text-muted">營業天數</div><div className="tnum text-xl font-bold">{s_sum?.open_days ?? 0} 天</div></Card><Card className="text-center"><div className="text-sm text-muted">日均收入</div><div className="tnum text-xl font-bold">{money(s_sum && s_sum.open_days ? s_sum.income / s_sum.open_days : 0)}</div></Card><Card className="text-center"><div className="text-sm text-muted">淨利率</div><div className="tnum text-xl font-bold">{pct(s_sum && s_sum.income ? s_sum.op_profit / s_sum.income : NaN)}</div></Card></div>{SECTION_TITLES.map(d => {
            let r = c.filter(y => y.kind === d.kind && y.tier === d.tier && (i(y, o) !== 0 || d.tier === 1));
            if (r.length === 0 && d.tier === 0) {
              return null;
            }
            return <Section key={d.title} title={d.title}><List>{r.map(y => <Row key={y.group} label={y.group} value=<Money value={i(y, o)} /> onClick={() => navigate(`/reports/detail?${new URLSearchParams({
                  m: month,
                  kind: y.kind,
                  tier: String(y.tier),
                  g: y.group
                })}`)} />)}{d.total && <Row label={d.total} strong value=<Money value={m[d.total]} tone="auto" /> />}</List></Section>;
          })}<StallRanking month={month} /><Btn kind="primary" className="mb-2 w-full" onClick={() => navigate(`/stall-month?m=${o}`)}>攤位收支明細表（下載 Excel／存 PDF）</Btn><Btn className="w-full" onClick={l}>匯出 Excel（每日明細＋年度收支明細表）</Btn></>;
      }}</QueryView></div>;
}

function YearReport({
  year
}) {
  let t = useStore();
  let {
    toast
  } = useFeedback();
  let n = useQuery(() => db.select("v_monthly_summary", {
    where: [gte("month", `${year}-01-01`), lte("month", `${year}-12-31`)],
    order: "month"
  }), [year]);
  let l = Array.from({
    length: 12
  }, (h, v) => `${year}-${String(v + 1).padStart(2, "0")}-01`);
  let s = useQuery(() => db.select("v_rent_prepaid"), []);
  let i = useQuery(async () => (await db.select("v_monthly_category", {
    where: [gte("month", `${year}-01-01`), lte("month", `${year}-12-31`)]
  })).filter(h => Number(h.tier) === 3 && h.kind === "income"), [year]);
  let o = h => (i.data ?? []).filter(v => !h || v.month === h).reduce((acc, item) => acc + Number(item.amount), 0);
  let c = (s.data ?? []).filter(h => h.payment_method === "transfer" && Number(h.prepaid) - Number(h.used) > 0.5);
  let m = useQuery(async () => {
    let h = t.catByCode("WAREHOUSE_RENT")?.id;
    if (h) {
      return db.select("transactions", {
        where: [isNull("deleted_at"), eq("category_id", h), isNull("account_id"), gt("txn_date", today_())],
        order: "txn_date"
      });
    }
    return [];
  }, []).data ?? [];
  let d = m.reduce((acc, item) => acc + Number(item.amount), 0);
  let r = useQuery(async () => {
    let [h, v] = await Promise.all([db.select("v_inventory", {
      order: "sort_order"
    }), db.select("v_inventory_flows", {
      where: [eq("dir", 1)]
    })]);
    return h.filter(_ => Number(_.on_hand) > 0.001).map(_ => {
      let u = Number(_.on_hand);
      let p = 0;
      let g = v.filter(f => f.item_id === _.item_id).sort((f, k) => k.flow_date.localeCompare(f.flow_date) || k.created_at.localeCompare(f.created_at));
      for (let f of g) {
        if (u <= 0) {
          break;
        }
        let k = Math.min(u, Number(f.qty));
        p += k * Number(f.unit_cost ?? 0);
        u -= k;
      }
      return {
        id: _.item_id,
        name: _.name,
        qty: Number(_.on_hand),
        value: Math.round(p)
      };
    });
  }, []);
  async function y() {
    try {
      let h = await db.select("v_monthly_category", {
        where: [gte("month", `${year}-01-01`), lte("month", `${year}-12-31`)]
      });
      download_(await writeXlsx([eo(year, h, t.categories)]), `\u5730\u74DC\u71DF\u904B_${year}_\u6536\u652F\u660E\u7D30\u8868.xlsx`);
      toast("已下載 Excel", "ok");
    } catch {
      toast("匯出失敗，請再試一次。", "error");
    }
  }
  return <><QueryView q={n} loadingText="載入年報中…" empty={h => {
      if (h.length === 0) {
        return <Empty text="這一年還沒有資料" />;
      }
      return null;
    }}>{h => {
        let v = u => h.find(p => p.month === u);
        let _ = u => h.reduce((acc, item) => acc + Number(item[u]), 0);
        return <><Card className="mb-4"><div className="mb-2 font-bold">每月營業淨利</div><ColumnChart label={`${year} \u6BCF\u6708\u71DF\u696D\u6DE8\u5229`} data={l.map(u => ({
              key: u,
              label: String(Number(u.slice(5, 7))),
              value: Number(v(u)?.op_profit ?? 0)
            }))} /></Card><div className="mb-4 overflow-hidden rounded-2xl bg-card md:hidden">{[...l.filter(u => v(u)), "total"].map(u => {
              let p = u === "total" ? null : v(u);
              let g = f => {
                if (p) {
                  return Number(p[f]);
                }
                return _(f);
              };
              return <button key={u} type="button" disabled={!p} onClick={() => p && navigate(`/reports/month?m=${u}&v=sum`)} className={cx("tnum block w-full border-b border-line px-4 py-3 text-left last:border-b-0", p ? "active:bg-sunk" : "bg-sunk")}><div className="flex items-baseline justify-between"><b>{p ? `${Number(u.slice(5, 7))} \u6708` : "年度合計"}<span className="ml-2 text-sm font-normal text-muted">{g("open_days")} 天</span></b><span className="text-sm text-muted">營業淨利 <b className={cx("text-base", g("op_profit") < 0 ? "text-warn" : "text-ink")}>{money(g("op_profit"))}</b></span></div><div className="mt-1 grid grid-cols-2 gap-x-3 text-sm text-muted"><span>收入 {money(g("income"))}</span><span className="text-right">營業支出 {money(g("op_expense"))}</span><span>固定支出 {money(g("fixed_expense"))}</span><span className="text-right">扣除後 <b className={cx(g("after_fixed") < 0 ? "text-warn" : "text-ink")}>{money(g("after_fixed"))}</b></span><span className="mt-1 rounded-md bg-plan-soft px-2 py-0.5 text-plan">生活開銷 {money(g("personal_expense"))}</span><span className="mt-1 rounded-md bg-leaf-soft px-2 py-0.5 text-right">實際存下 <b className={cx(g("after_fixed") + o(p ? u : undefined) - g("personal_expense") < 0 ? "text-warn" : "text-leaf")}>{money(g("after_fixed") + o(p ? u : undefined) - g("personal_expense"))}</b></span></div></button>;
            })}</div><div className="mb-4 hidden overflow-x-auto rounded-2xl bg-card md:block"><table className="tnum w-full min-w-[760px] text-right text-[0.95rem]"><thead className="text-sm text-muted"><tr className="border-b border-line">{["月份", "收入", "營業支出", "營業淨利", "固定支出", "扣除後結餘", "生活開銷", "實際存下", "天數"].map((u, p) => <th key={u} scope="col" className={cx("whitespace-nowrap px-3 py-2 font-bold", p === 0 && "text-left", u === "生活開銷" && "bg-plan-soft text-plan", u === "實際存下" && "bg-leaf-soft text-leaf")}>{u}</th>)}</tr></thead><tbody>{l.map(u => {
                  let p = v(u);
                  return <tr key={u} className="border-b border-line last:border-b-0 active:bg-sunk" onClick={() => navigate(`/reports/month?m=${u}&v=sum`)}><th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-bold">{Number(u.slice(5, 7))} 月</th><td className="px-3">{p ? money(p.income) : "—"}</td><td className="px-3">{p ? money(p.op_expense) : "—"}</td><td className={cx("px-3 font-bold", p && p.op_profit < 0 && "text-warn")}>{p ? money(p.op_profit) : "—"}</td><td className="px-3">{p ? money(p.fixed_expense) : "—"}</td><td className={cx("px-3", p && p.after_fixed < 0 && "text-warn")}>{p ? money(p.after_fixed) : "—"}</td><td className="bg-plan-soft px-3">{p ? money(p.personal_expense) : "—"}</td><td className={cx("bg-leaf-soft px-3 font-bold", p && Number(p.after_fixed) + o(u) - Number(p.personal_expense) < 0 ? "text-warn" : "text-leaf")}>{p ? money(Number(p.after_fixed) + o(u) - Number(p.personal_expense)) : "—"}</td><td className="px-3">{p?.open_days ?? "—"}</td></tr>;
                })}<tr className="bg-sunk font-bold"><th scope="row" className="px-3 py-2 text-left">年度合計</th><td className="px-3">{money(_("income"))}</td><td className="px-3">{money(_("op_expense"))}</td><td className="px-3">{money(_("op_profit"))}</td><td className="px-3">{money(_("fixed_expense"))}</td><td className="px-3">{money(_("after_fixed"))}</td><td className="bg-plan-soft px-3">{money(_("personal_expense"))}</td><td className={cx("bg-leaf-soft px-3", _("after_fixed") + o() - _("personal_expense") < 0 ? "text-warn" : "text-leaf")}>{money(_("after_fixed") + o() - _("personal_expense"))}</td><td className="px-3">{_("open_days")}</td></tr></tbody></table></div>{(c.length > 0 || m.length > 0) && <Card className="mb-4"><div className="flex items-baseline justify-between"><span className="font-bold">已預付、還沒用掉的租金</span><span className="tnum text-lg font-bold">{money(c.reduce((acc, item) => acc + Number(item.prepaid) - Number(item.used), 0) + d)}</span></div>{c.map(u => <div key={u.market_id} className="tnum flex justify-between border-b border-line py-1.5 text-[0.95rem] last:border-b-0"><span>{u.name}{u.paid_until && <span className="ml-1.5 text-sm text-muted">付到 {shortDate(u.paid_until)}</span>}</span><span className="font-bold">{money(Number(u.prepaid) - Number(u.used))}</span></div>)}{m.length > 0 && <div className="tnum flex justify-between border-b border-line py-1.5 text-[0.95rem] last:border-b-0"><span>倉庫租金<span className="ml-1.5 text-sm text-muted">付到 {shortDate(monthEnd(m[m.length - 1].txn_date))}</span></span><span className="font-bold">{money(d)}</span></div>}<p className="mt-2 text-sm text-muted">只是提醒，不算進上面的支出。攤位租金出攤那天、倉庫租金每月 1 號，才算進當月的支出，所以不會重複扣。</p></Card>}{(r.data?.length ?? 0) > 0 && <Card className="mb-4"><div className="flex items-baseline justify-between"><span className="font-bold">倉庫裡還沒烤的地瓜<span className="ml-1.5 text-sm font-normal text-muted">共 {num(r.data.reduce((acc, item) => acc + item.qty, 0))} 包</span></span><span className="tnum text-lg font-bold">{money(r.data.reduce((acc, item) => acc + item.value, 0))}</span></div>{r.data.map(u => <a key={u.id} href="#/purchases/stock" className="tnum flex justify-between border-b border-line py-1.5 text-[0.95rem] last:border-b-0"><span>{u.name}<span className="ml-1.5 text-sm text-muted">{num(u.qty)} 包</span></span><span className="font-bold">{money(u.value)}</span></a>)}<p className="mt-2 text-sm text-muted">已經進貨、還沒烤掉的地瓜，就像預付出去的錢。金額照最近幾批的進貨單價算（先進先出）。不算進上面的支出，哪天烤掉，那天才算進地瓜成本。</p></Card>}<Btn className="w-full" onClick={y}>匯出 Excel（收支明細表格式）</Btn></>;
      }}</QueryView></>;
}

function R11({
  month
}) {
  let t = useQuery(() => db.select("v_daily_summary", {
    where: [gte("day", month), lte("day", monthEnd(month))],
    order: "day.desc"
  }), [month]);
  return <div className="mx-auto max-w-2xl"><QueryView q={t} loadingText="載入每日資料中…" empty={a => {
      if (a.length === 0) {
        return <Empty text="這個月還沒有資料" />;
      }
      return null;
    }}>{a => <List>{a.filter(n => n.business_day_id || n.income || n.op_expense).map(n => <Row key={n.day} onClick={() => navigate(`/daily?d=${n.day}`)} label=<span className="flex items-center gap-2"><span className="tnum">{shortDate(n.day)}（{WEEKDAYS[weekday(n.day)]}）</span><span className="text-muted">{n.status === "open" ? n.market_name ?? "" : n.status ? "休息" : ""}</span>{n.weather && <span className="text-sm text-muted">{n.weather}</span>}{n.has_mismatch && <Badge tone="warn">數量異常</Badge>}</span> sub={`\u6536\u5165 ${money(n.income)}\u30FB\u5730\u74DC ${money(n.sweet_potato_cost)}\u30FB\u79DF\u91D1 ${money(n.rent)}\u30FB\u5176\u4ED6 ${money(n.op_expense - n.sweet_potato_cost - n.rent)}`} value=<Money value={n.op_profit} tone="auto" className="font-bold" /> />)}</List>}</QueryView></div>;
}

function U11({
  year,
  onYear
}) {
  let [a, setA] = React.useState(null);
  let [l, setL] = React.useState(null);
  let i = useQuery(() => db.select("v_daily_summary", {
    where: [gte("day", `${year}-01-01`), lte("day", `${year}-12-31`)]
  }), [year]);
  return <div className="mx-auto max-w-2xl"><YearNav year={year} onChange={onYear} /><div className="mb-2"><Chips value={a} onChange={setA} options={WEEKDAYS.map((o, c) => ({
        value: String(c),
        label: `\u9031${o}`
      }))} /></div><div className="mb-4"><Chips value={l} onChange={setL} options={["晴", "陰", "雨", "冷", "熱", "颱風"].map(o => ({
        value: o,
        label: o
      }))} /></div><QueryView q={i} loadingText="載入市場資料中…">{o => {
        let c = o.filter(d => d.status === "open" && d.market_id && (a === null || String(weekday(d.day)) === a) && (l === null || d.weather === l));
        let map = new Map();
        c.forEach(d => map.set(d.market_name ?? "", [...(map.get(d.market_name ?? "") ?? []), d]));
        let m = [...map.entries()].map(([name, r]) => {
          let inc = r.reduce((acc, item) => acc + Number(item.income), 0);
          let h = r.reduce((acc, item) => acc + Number(item.op_expense), 0);
          let cooked = r.reduce((acc, item) => acc + Number(item.cooked_qty), 0);
          return {
            name,
            n: r.length,
            inc,
            exp: h,
            profit: inc - h,
            cooked
          };
        }).sort((d, r) => r.profit / r.n - d.profit / d.n);
        if (m.length === 0) {
          return <Empty text="沒有符合條件的營業日" />;
        }
        return <><Card className="mb-4"><div className="mb-3 font-bold">平均每日營業淨利</div><BarList rows={m.map(d => ({
              key: d.name,
              label: `${d.name}\uFF08${d.n} \u5929\uFF09`,
              value: d.profit / d.n
            }))} /></Card>{m.map(d => <Card key={d.name} className="mb-3"><div className="mb-2 flex items-baseline justify-between"><span className="text-lg font-bold">{d.name}</span><span className="text-muted">營業 {d.n} 天</span></div><div className="tnum grid grid-cols-3 gap-y-2 text-sm"><div><div className="text-muted">總收入</div><b>{money(d.inc)}</b></div><div><div className="text-muted">總支出</div><b>{money(d.exp)}</b></div><div><div className="text-muted">總淨利</div><b className={d.profit < 0 ? "text-warn" : ""}>{money(d.profit)}</b></div><div><div className="text-muted">平均每日收入</div><b>{money(d.inc / d.n)}</b></div><div><div className="text-muted">平均每日淨利</div><b>{money(d.profit / d.n)}</b></div><div><div className="text-muted">平均烤包數</div><b>{num(d.cooked / d.n)}</b></div></div></Card>)}</>;
      }}</QueryView></div>;
}

function C11({
  kind,
  year
}) {
  let [a, setA] = React.useState(kind === "expense" ? "1" : null);
  let l = useQuery(() => db.select("v_monthly_category", {
    where: [gte("month", `${year}-01-01`), lte("month", `${year}-12-31`)]
  }), [year]);
  return <div className="mx-auto max-w-2xl">{kind === "expense" && <div className="mb-4"><Chips value={a} onChange={setA} options={[{
        value: "1",
        label: "營業"
      }, {
        value: "2",
        label: "生財器具與固定"
      }]} /></div>}<QueryView q={l} loadingText="載入分析中…">{s => {
        let i = s.filter(m => m.kind === kind && m.tier !== 3 && (a === null || String(m.tier) === a));
        let map = new Map();
        i.forEach(m => map.set(m.category, (map.get(m.category) ?? 0) + Number(m.amount)));
        let c = [...map.entries()].sort((m, d) => d[1] - m[1]);
        let b = c.reduce((acc, [, d]) => acc + d, 0);
        if (c.length === 0) {
          return <Empty text="沒有資料" />;
        }
        return <Card><div className="mb-3 flex items-baseline justify-between"><span className="font-bold">{year} 年合計</span><span className="tnum text-xl font-bold">{money(b)}</span></div><BarList tone={kind === "expense" ? "cost" : "profit"} rows={c.map(([m, d]) => ({
            key: m,
            label: m,
            value: d,
            sub: `\u4F54 ${pct(d / b)}`
          }))} /></Card>;
      }}</QueryView></div>;
}

function D11({
  year,
  onYear
}) {
  let a = useStore();
  let n = useQuery(async () => {
    let l = await db.select("purchase_orders", {
      where: [isNull("deleted_at"), gte("order_date", `${year}-01-01`), lte("order_date", `${year}-12-31`)],
      order: "order_date"
    });
    let s = l.length ? await db.select("purchase_lines", {
      where: [isNull("deleted_at"), inList("purchase_order_id", l.map(i => i.id))]
    }) : [];
    return {
      orders: l,
      lines: s
    };
  }, [year]);
  return <div className="mx-auto max-w-2xl"><YearNav year={year} onChange={onYear} /><QueryView q={n} loadingText="載入進貨資料中…" empty={l => {
      if (l.lines.length === 0) {
        return <Empty text="這一年沒有進貨" />;
      }
      return null;
    }}>{l => {
        let s = new Map(l.orders.map(v => [v.id, v]));
        let map = new Map();
        l.lines.forEach(v => {
          let supplier_id = s.get(v.purchase_order_id).supplier_id;
          map.set(supplier_id, (map.get(supplier_id) ?? 0) + Number(v.amount));
        });
        let o = [...new Set(l.lines.map(v => v.item_id))].sort((v, _) => (a.item(v)?.sort_order ?? 0) - (a.item(_)?.sort_order ?? 0));
        let c = v => Number(v.quantity) > 0 && Number(v.unit_price) > 0;
        let b = v => ({
          q: v.reduce((acc, item) => acc + Number(item.quantity), 0),
          amt: v.reduce((acc, item) => acc + Number(item.amount), 0)
        });
        let m = (v, _) => s.get(v.purchase_order_id).order_date.startsWith(_);
        let d = v => v.filter(_ => Number(_.quantity) > 0 && Number(_.unit_price) === 0).reduce((acc, item) => acc + Number(item.quantity), 0);
        let r = v => ({
          q: -v.filter(_ => Number(_.quantity) < 0).reduce((acc, item) => acc + Number(item.quantity), 0),
          amt: -v.filter(_ => Number(_.quantity) < 0).reduce((acc, item) => acc + Number(item.amount), 0)
        });
        let YComponent = (v, _ = false, u = []) => {
          let p = d(u);
          let g = r(u);
          if (v.q || p || g.q) {
            return <>{v.q ? <><span className={_ ? "font-bold" : ""}>{num(v.q)} 包</span><div className="text-sm text-muted">@{money(v.amt / v.q)}</div><div className={cx("text-sm", _ ? "font-bold" : "text-muted")}>{money(v.amt)}</div></> : null}{p > 0 && <div className="text-sm font-bold text-warn">＋免費補 {num(p)} 包</div>}{g.q > 0 && <div className="text-sm font-bold text-warn">−調出 {num(g.q)} 包（抵 {money(g.amt)}）</div>}</>;
          }
          return "—";
        };
        let h = [...new Set(l.orders.map(v => v.order_date.slice(0, 7)))].sort();
        return <><Card className="mb-4"><div className="mb-3 font-bold">供應商進貨金額</div><BarList tone="cost" rows={[...map.entries()].sort((v, _) => _[1] - v[1]).map(([v, _]) => ({
              key: v,
              label: a.supplier(v)?.name ?? "",
              value: _
            }))} /></Card><Section title="品項：數量與平均單價（每月）"><div className="overflow-x-auto rounded-2xl bg-card"><table className="tnum w-full min-w-[560px] text-right text-[0.95rem]"><thead className="text-sm text-muted"><tr className="border-b border-line"><th scope="col" className="px-3 py-2 text-left">月份</th>{o.map(v => <th key={v} scope="col" className="px-3 py-2">{a.item(v)?.name}</th>)}<th scope="col" className="bg-sunk px-3 py-2 text-ink">合計</th></tr></thead><tbody>{h.map(v => <tr key={v} className="border-b border-line last:border-b-0"><th scope="row" className="px-3 py-2 text-left">{Number(v.slice(5))} 月</th>{o.map(_ => <td key={_} className="px-3 py-1.5 align-top">{YComponent(b(l.lines.filter(u => u.item_id === _ && c(u) && m(u, v))), false, l.lines.filter(u => u.item_id === _ && m(u, v)))}</td>)}<td className="bg-sunk px-3 py-1.5 align-top">{YComponent(b(l.lines.filter(_ => c(_) && m(_, v))), true, l.lines.filter(_ => m(_, v)))}</td></tr>)}<tr className="border-t-2 border-line bg-sunk"><th scope="row" className="px-3 py-2 text-left font-bold">全年</th>{o.map(v => <td key={v} className="px-3 py-1.5 align-top">{YComponent(b(l.lines.filter(_ => _.item_id === v && c(_))), true, l.lines.filter(_ => _.item_id === v))}</td>)}<td className="px-3 py-1.5 align-top text-flesh-ink">{YComponent(b(l.lines.filter(c)), true, l.lines)}</td></tr></tbody></table></div></Section></>;
      }}</QueryView></div>;
}

function M11({
  month
}) {
  let t = useStore();
  let a = useQuery(async () => {
    let n = await db.select("business_days", {
      where: [isNull("deleted_at"), gte("day", month), lte("day", monthEnd(month))],
      order: "day"
    });
    let l = n.length ? await db.select("daily_item_counts", {
      where: [isNull("deleted_at"), inList("business_day_id", n.map(s => s.id))]
    }) : [];
    return {
      days: n,
      counts: l
    };
  }, [month]);
  return <div className="mx-auto max-w-2xl"><QueryView q={a} loadingText="載入數量資料中…" empty={n => {
      if (n.counts.length === 0) {
        return <Empty text="這個月沒有地瓜數量紀錄" />;
      }
      return null;
    }}>{n => {
        let l = t.items.filter(i => i.track_inventory);
        let s = n.days.filter(i => n.counts.some(o => o.business_day_id === i.id && o.is_mismatch));
        return <><div className="mb-4 grid grid-cols-3 gap-2">{l.map(i => {
              let o = n.counts.filter(m => m.item_id === i.id);
              let c = o.reduce((acc, item) => acc + Number(item.carried), 0);
              let b = o.reduce((acc, item) => acc + Number(item.cooked), 0);
              return <Card key={i.id} className="text-center"><div className="font-bold">{i.short_name ?? i.name}</div><div className="tnum text-2xl font-bold">{num(b)}</div><div className="text-xs text-muted">實際烤（包）</div><div className="tnum mt-1 text-sm text-muted">預計 {num(c)}</div></Card>;
            })}</div><Section title="每日" aside={s.length > 0 ? <Badge tone="warn">數量異常 {s.length} 天</Badge> : undefined}><div className="overflow-x-auto rounded-2xl bg-card"><table className="tnum w-full min-w-[420px] text-center text-[0.95rem]"><thead className="text-sm text-muted"><tr className="border-b border-line"><th scope="col" className="px-2 py-2 text-left">日期</th>{l.map(i => <th key={i.id} scope="col" className="px-2">{i.short_name}<span className="block text-xs font-normal">預計/烤/剩</span></th>)}</tr></thead><tbody>{n.days.filter(i => n.counts.some(o => o.business_day_id === i.id)).map(i => {
                    let o = n.counts.some(c => c.business_day_id === i.id && c.is_mismatch);
                    return <tr key={i.id} className={cx("cursor-pointer border-b border-line last:border-b-0 active:brightness-95", o && "bg-warn-soft")} onClick={() => navigate(`/daily?d=${i.day}`)}><th scope="row" className="whitespace-nowrap px-2 py-2 text-left font-normal"><span className="font-bold">{shortDate(i.day)}{o && <span className="ml-0.5 text-warn">⚠</span>}</span><span className="block text-xs text-muted">{t.market(i.market_id)?.name ?? ""}</span></th>{l.map(c => {
                        let b = n.counts.find(m => m.business_day_id === i.id && m.item_id === c.id);
                        return <td key={c.id} className={cx("whitespace-nowrap px-2", b?.is_mismatch && "font-bold text-warn")}>{b ? `${num(b.carried)}/${num(b.cooked)}/${num(b.remaining)}` : "—"}</td>;
                      })}</tr>;
                  })}</tbody></table></div><p className="mt-2 px-1 text-sm text-muted">⚠ 紅色＝預計 ≠ 烤 ＋ 剩，數量對不起來。點任何一天可以到那天修改。</p></Section></>;
      }}</QueryView></div>;
}

export function Rh1Component() {
  let e = useStore();
  let t = useQuery(async () => {
    let [a, n, recent] = await Promise.all([db.select("v_advance_balances"), db.select("v_rent_prepaid"), db.select("transactions", {
      where: [isNull("deleted_at"), ["is_advance", "is.true"]],
      order: "txn_date.desc",
      limit: 30
    })]);
    return {
      adv: a,
      rent: n,
      recent
    };
  }, []);
  return <div className="mx-auto max-w-2xl"><QueryView q={t} loadingText="載入中…">{a => <><Section title="代墊（生意欠誰）" aside=<a className="text-sm font-bold text-flesh-ink" href="#/entry?type=payment">還代墊</a>><List>{a.adv.filter(n => !isWagePayer(e.payer(n.payer_id))).map(n => <Row key={n.payer_id} label={n.name} sub={`\u4EE3\u588A ${money(n.advanced)}\u30FB\u5DF2\u9084 ${money(n.repaid)}`} value={n.advanced - n.repaid > 0.5 ? <b className="text-warn">欠 {money(n.advanced - n.repaid)}</b> : <Badge tone="leaf">已還清</Badge>} />)}</List></Section>{a.recent.some(n => !isWagePayer(e.payer(n.payer_id))) && <Section title="最近代墊"><List>{a.recent.filter(n => !isWagePayer(e.payer(n.payer_id))).map(n => <Row key={n.id} onClick={() => navigate(`/entry/${n.id}`)} label={`${shortDate(n.txn_date)} ${e.payer(n.payer_id)?.name}\uFF1A${n.description ?? e.cat(n.category_id)?.name}`} value=<Money value={Number(n.amount)} /> />)}</List></Section>}<Section title="預付租金" aside=<a className="text-sm font-bold text-flesh-ink" href="#/entry?type=payment">記預付租金</a>><List>{a.rent.filter(n => n.payment_method === "transfer" && (n.prepaid || n.used)).map(n => <Row key={n.market_id} label={n.name} sub={`\u5DF2\u9810\u4ED8 ${money(n.prepaid)}\u30FB\u5DF2\u4F7F\u7528 ${money(n.used)}${n.paid_until ? `\u30FB\u4ED8\u5230 ${shortDate(n.paid_until)}` : ""}`} value=<Money value={n.prepaid - n.used} tone="auto" className="font-bold" /> />)}</List><p className="mt-2 px-1 text-sm text-muted">已使用 = 標記「已預付」的每日租金加總。負數表示預付款不夠、或有預付紀錄沒記到。</p></Section></>}</QueryView></div>;
}

export async function uh(e, t, a) {
  let n = await db.select("transactions", {
    where: [isNull("deleted_at"), gte("txn_date", e), lte("txn_date", t)],
    order: "txn_date,created_at"
  });
  let l = Wg(n, {
    cat: s => a.cat(s)?.name ?? "",
    acct: s => a.acct(s)?.name ?? "",
    market: s => a.market(s)?.name ?? "",
    supplier: s => a.supplier(s)?.name ?? "",
    payer: s => a.payer(s)?.name ?? ""
  });
  download_(await writeXlsx([l]), `\u5730\u74DC\u71DF\u904B_\u8A18\u5E33\u660E\u7D30_${e}_${t}.xlsx`);
}

function F11({
  route
}) {
  let t = useStore();
  let a = route.query.get("m") || monthStart(today_());
  let n = route.query.get("kind") || "expense";
  let l = Number(route.query.get("tier") ?? 1);
  let g_1 = route.query.get("g") || "";
  let i = n === "expense" && g_1 === "地瓜";
  let o = b => navigate(`/reports/detail?${new URLSearchParams({
    m: b,
    kind: n,
    tier: String(l),
    g: g_1
  })}`);
  let c = useQuery(async () => {
    let b = await db.select("v_pnl_entries", {
      where: [gte("entry_date", a), lte("entry_date", monthEnd(a)), eq("report_group", g_1), eq("kind", n), eq("tier", l)],
      order: "entry_date"
    });
    let m = b.filter(y => y.source === "transaction").map(y => y.ref_id);
    let [d, costs] = await Promise.all([m.length ? db.select("transactions", {
      where: [inList("id", m)]
    }) : Promise.resolve([]), i ? db.select("v_cost_entries", {
      where: [gte("entry_date", a), lte("entry_date", monthEnd(a))]
    }) : Promise.resolve([])]);
    return {
      entries: b,
      txns: d,
      costs
    };
  }, [a, n, l, g_1]);
  return <Page title={g_1 || "明細"} backTo={`/reports/month?m=${a}`}><MonthNav month={a} onChange={o} /><QueryView q={c} loadingText="載入明細中…">{b => {
        let m = b.entries.reduce((acc, entry) => acc + Number(entry.amount), 0);
        let d = [...new Set(b.entries.map(_ => _.entry_date))];
        let r = ref_id => b.txns.find(u => u.id === ref_id);
        let y = t.items.filter(_ => _.track_inventory);
        let h = item_id => {
          let u = t.item(item_id);
          return u?.short_name ?? u?.name ?? "?";
        };
        let v = {
          cooked: "實際烤",
          waste: "報廢",
          family: "家人取用",
          count: "盤點調整",
          bonus: "補貨",
          other: "其他",
          adjust: "調整"
        };
        return <><Card className="mb-4"><div className="text-muted">{Number(a.slice(5, 7))} 月{g_1}合計</div><div className="tnum text-[2.25rem] font-bold leading-tight">{money(m)}</div><div className="text-sm text-muted">{d.length} 天・{b.entries.length} 筆</div>{i && b.costs.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2">{y.map(_ => {
                let u = b.costs.filter(p => p.item_id === _.id && p.kind === "cooked");
                if (u.length) {
                  return <div key={_.id} className="rounded-xl bg-sunk p-2 text-center"><div className="font-bold">{_.short_name ?? _.name}</div><div className="tnum text-lg font-bold">{num(u.reduce((acc, item) => acc + Number(item.qty), 0))} 包</div><div className="tnum text-sm text-muted">{money(u.reduce((acc, item) => acc + Number(item.cost), 0))}</div></div>;
                }
                return null;
              })}</div>}</Card>{d.length === 0 ? <Empty text="這個月沒有這個項目" /> : <List>{d.map(_ => {
              let u = b.entries.filter(G => G.entry_date === _);
              let p = u.reduce((acc, item) => acc + Number(item.amount), 0);
              let g = u.find(G => G.business_day_id)?.business_day_id;
              let f = u.find(G => G.market_id)?.market_id;
              let k = i ? b.costs.filter(G => G.entry_date === _ && Number(G.cost) !== 0) : [];
              let M = u.filter(G => !(i && G.source.startsWith("inventory_")));
              let T = g ? `/daily?d=${_}` : M[0]?.source === "transaction" ? `/entry/${M[0].ref_id}` : null;
              let j = G => {
                let tx = G.source === "transaction" ? r(G.ref_id) : undefined;
                let U = tx?.description && tx.description !== G.category && tx.description !== g_1 ? tx.description : "";
                let W = [G.category !== g_1 ? G.category : "", U, G.source === "purchase" ? "進貨" : ""].filter(Boolean).join("・");
                return {
                  tx,
                  label: W
                };
              };
              let $ = M.length === 1 ? (() => {
                let {
                  tx,
                  label
                } = j(M[0]);
                return label + (tx?.formula ? `\uFF08${tx.formula}\uFF09` : "");
              })() : "";
              return <div key={_} className={cx("border-b border-line px-4 py-3 last:border-b-0", (weekday(_) === 0 || weekday(_) === 6) && "bg-weekend", T && "cursor-pointer active:brightness-95")} onClick={T ? () => navigate(T) : undefined}><div className="flex items-baseline justify-between gap-3"><span className="font-bold"><span className="tnum">{shortDate(_)}</span>（{WEEKDAYS[weekday(_)]}）{f && <span className="ml-1 font-normal text-muted">{t.market(f)?.name}</span>}{$ && <span className="ml-1 font-normal text-muted">{$}</span>}</span><span className="tnum font-bold">{money(p)}</span></div>{k.length > 0 && <div className="tnum mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[0.95rem] text-muted">{k.map((G, ie) => <span key={ie}>{h(G.item_id)} {num(G.qty)} 包 <b className="text-ink">{money(G.cost)}</b>{G.kind !== "cooked" ? `\uFF08${v[G.kind] ?? G.kind}\uFF09` : ""}</span>)}</div>}{M.map(G => {
                  let {
                    tx,
                    label
                  } = j(G);
                  if (M.length > 1) {
                    return <div key={G.ref_id} className="mt-0.5 flex justify-between gap-3 text-[0.95rem] text-muted"><span className="min-w-0 truncate">{label || g_1}{tx?.formula ? `\uFF08${tx.formula}\uFF09` : ""}</span><span className="tnum shrink-0">{money(G.amount)}</span></div>;
                  }
                  return null;
                })}</div>;
            })}</List>}<p className="mt-3 px-1 text-sm text-muted">粉紅色是週六、週日。點某一天可以到那天修改。{i ? "地瓜成本依進貨價格先進先出計算。" : ""}</p></>;
      }}</QueryView></Page>;
}
