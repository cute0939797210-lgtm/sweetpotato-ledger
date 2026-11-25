import * as React from "react";
import { TxnList } from "../components/TxnList.jsx";
import { BarList, ColumnChart } from "../components/charts.jsx";
import { Btn, Card, Empty, List, Money, Page, QueryView, Row, Section, Segmented, cx, useFeedback, useSaver } from "../components/ui.jsx";
import { addMonths, money, monthEnd, monthLabel, monthStart, pct, shortDate, today_ } from "../lib/format.js";
import { isOwe, isWagePayer } from "../lib/models.js";
import { navigate } from "../lib/router.js";
import { useQuery, useStore } from "../lib/store.jsx";
import { db, eq, gte, inList, isNull, lte } from "../lib/supabase.js";

export function Personal({
  route
}) {
  let t = route.query.get("v") === "year" ? "year" : "month";
  let year = route.query.get("y") || today_().slice(0, 4);
  let tabs = <Segmented className="mb-4" value={t} onChange={l => navigate(l === "year" ? `/personal?v=year&y=${year}` : "/personal")} options={[{
    value: "month",
    label: "每月明細"
  }, {
    value: "year",
    label: "全年總覽"
  }]} />;
  if (t === "year") {
    return <Page title="個人" actions=<span className="flex gap-2"><Btn href="#/entry?type=income&book=personal">＋收入</Btn><Btn kind="primary" href="#/entry?type=expense&book=personal">＋支出</Btn></span>>{tabs}<PersonalYear year={year} /></Page>;
  }
  return <I2Component route={route} tabs={tabs} />;
}

function I2Component({
  route,
  tabs
}) {
  let a = useStore();
  let n = route.query.get("m") || monthStart(today_());
  let l = a.categories.filter(y => y.tier === 3).map(y => y.id);
  let s = useQuery(async () => {
    let [y, h, v, _] = await Promise.all([l.length ? db.select("transactions", {
      where: [isNull("deleted_at"), inList("type", ["expense", "income"]), inList("category_id", l), gte("txn_date", n), lte("txn_date", monthEnd(n))],
      order: "txn_date.desc,created_at.desc",
      limit: 1000
    }) : Promise.resolve([]), db.select("v_account_balances", {
      order: "sort_order"
    }), db.select("v_advance_balances"), db.select("v_monthly_summary", {
      where: [eq("month", n)]
    })]);
    return {
      txns: y,
      accts: h.filter(u => !u.is_business && u.is_active && !isOwe(a.acct(u.account_id)?.code)),
      adv: v,
      biz: Number(_[0]?.after_fixed ?? 0)
    };
  }, [n, l.join(",")]);
  let {
    confirm
  } = useFeedback();
  let {
    run
  } = useSaver();
  let c = a.payers.filter(y => isWagePayer(y) && y.is_active);
  let [b, setB] = React.useState(new Set());
  let d = y => setB(h => {
    let v = new Set(h);
    if (v.has(y)) {
      v.delete(y);
    } else {
      v.add(y);
    }
    return v;
  });
  async function r(payer_id, name, v, _) {
    if (!a.cashAccountId) {
      return;
    }
    let u = Number(n.slice(5, 7));
    if (!(await confirm(`\u5F9E\u91D1\u5EAB\u4ED8 ${name} \u73FE\u91D1 ${money(v)}\uFF1F
\uFF08${u} \u6708\u5E6B\u5FD9 ${_} \u5929\uFF1B\u4ED8\u4E86\u4E4B\u5F8C\u300C\u6B20${name}\u300D\u6703\u6B78\u96F6\uFF09`, {
      danger: false,
      okText: "付清"
    }))) {
      return;
    }
    if (await run(() => db.insert("transactions", {
      txn_date: today_(),
      type: "payment",
      payment_kind: "advance_repay",
      payer_id,
      amount: v,
      account_id: a.cashAccountId,
      source: "manual",
      description: `${name}\u85AA\u6C34\u7D50\u7B97\uFF08${u} \u6708\uFF0C${_} \u5929\uFF09`
    }), `\u5DF2\u4ED8 ${name} ${money(v)}`)) {
      s.reload();
    }
  }
  return <Page title="個人" actions=<span className="flex gap-2"><Btn href="#/entry?type=income&book=personal">＋收入</Btn><Btn kind="primary" href="#/entry?type=expense&book=personal">＋支出</Btn></span>>{tabs}<div className="mb-3 flex items-center justify-between"><button className="h-11 w-11 rounded-full text-2xl active:bg-sunk" aria-label="上個月" onClick={() => navigate(`/personal?m=${addMonths(n, -1)}`)}>‹</button><span className="text-lg font-bold">{monthLabel(n)}</span><button className="h-11 w-11 rounded-full text-2xl active:bg-sunk" aria-label="下個月" onClick={() => navigate(`/personal?m=${addMonths(n, 1)}`)}>›</button></div><QueryView q={s} loadingText="載入生活開銷中…">{y => {
        let h = y.txns.filter($ => $.type === "expense");
        let v = y.txns.filter($ => $.type === "income");
        let _ = h.reduce((acc, item) => acc + Number(item.amount), 0);
        let u = v.reduce((acc, item) => acc + Number(item.amount), 0);
        let p = account_id => !!(account_id && a.acct(account_id)?.is_business);
        let g = h.filter($ => !$.is_advance && p($.account_id) || isWagePayer(a.payer($.payer_id))).reduce((acc, item) => acc + Number(item.amount), 0);
        let f = _ - g;
        let k = $ => {
          let map = new Map();
          $.forEach(U => {
            let W = a.cat(U.category_id)?.report_group ?? "其他";
            map.set(W, (map.get(W) ?? 0) + Number(U.amount));
          });
          let ie = U => Math.min(...a.categories.filter(W => W.tier === 3 && W.report_group === U).map(W => W.sort_order), 9999);
          return [...map.entries()].sort((U, W) => ie(U[0]) - ie(W[0]) || W[1] - U[1]);
        };
        let M = k(h);
        let T = k(v);
        let JComponent = ($, G, ie) => <div className="overflow-hidden rounded-2xl bg-card">{$.map(([U, W]) => {
            let K = G.filter(Ue => (a.cat(Ue.category_id)?.report_group ?? "其他") === U);
            let L = ie === "expense" && K.length > 0 && K.every(Ue => isWagePayer(a.payer(Ue.payer_id)));
            let V = `${ie}:${U}`;
            let we = b.has(V);
            return <div key={V} className="border-b border-line last:border-b-0"><button type="button" className="flex min-h-14 w-full items-center gap-2 px-4 py-3 text-left active:bg-sunk" onClick={() => {
                if (L) {
                  return document.getElementById("wages")?.scrollIntoView({
                    behavior: "smooth"
                  });
                }
                return d(V);
              }} aria-expanded={L ? undefined : we}><span className="flex-1 font-bold">{U}<span className="ml-1.5 text-sm font-normal text-muted">{L ? "明細在上面" : `${K.length} \u7B46`}</span></span><Money value={W} className={cx("font-bold", ie === "income" && "text-leaf")} />{!L && <span className={cx("text-muted transition-transform", we && "rotate-90")}>›</span>}</button>{we && !L && <div className="border-t border-line bg-sunk/40"><TxnList txns={K} onChanged={s.reload} /></div>}</div>;
          })}</div>;
        return <><Card className="mb-4"><div className="mb-2 text-muted">{Number(n.slice(5, 7))} 月生活開銷與存款</div><div className="tnum grid grid-cols-2 gap-x-4 gap-y-3"><div><div className="text-sm text-muted">生意帶回家<span className="text-xs">（扣除後結餘）</span></div><div className="text-xl font-bold">{money(y.biz)}</div></div><div><div className="text-sm text-muted">家庭收入</div><div className="text-xl font-bold text-leaf">{money(u)}</div></div><div className="rounded-xl bg-plan-soft p-2"><div className="text-sm text-plan">生活開銷</div><div className="text-xl font-bold text-plan">{money(_)}</div></div><div className="rounded-xl bg-leaf-soft p-2"><div className="text-sm text-leaf">實際存下</div><div className={cx("text-xl font-bold", y.biz + u - _ < 0 ? "text-warn" : "text-leaf")}>{money(y.biz + u - _)}</div></div></div><p className="mt-2 text-sm text-muted">實際存下 = 生意帶回家 ＋ 家庭收入 − 生活開銷</p>{_ > 0 && <div className="tnum mt-2 text-[0.95rem] text-muted">支出裡：從生意帳戶拿 <b className="text-ink">{money(g)}</b>・個人自己付 <b className="text-ink">{money(f)}</b></div>}<p className="mt-2 text-sm text-muted">這裡的收入、支出都不會算進地瓜生意的營業淨利和報表。</p></Card>{c.length > 0 && <Section title="家人幫忙薪水（月底結算）" id="wages">{c.map($ => {
              let G = y.txns.filter(K => K.payer_id === $.id && K.is_advance).sort((K, L) => K.txn_date.localeCompare(L.txn_date));
              let ie = G.reduce((acc, item) => acc + Number(item.amount), 0);
              let U = y.adv.find(K => K.payer_id === $.id);
              let W = U ? Number(U.advanced) - Number(U.repaid) : 0;
              if (G.length === 0 && W <= 0.5) {
                return <div key={$.id} className="mb-3 flex min-h-12 items-center justify-between rounded-2xl bg-card px-4"><span className="font-bold text-salary">{$.name}</span><span className="text-muted">本月 0 天・已付清</span></div>;
              }
              return <Card key={$.id} className="mb-3"><div className="flex items-baseline justify-between"><span className="text-lg font-bold text-salary">{$.name}</span><span className="tnum text-muted">本月 {G.length} 天・{money(ie)}</span></div>{G.length > 0 && <div className="mt-2 border-t border-line">{G.map(K => <div key={K.id} className="tnum flex items-center justify-between border-b border-line py-2 text-[0.95rem] active:bg-sunk" role="button" onClick={() => navigate(`/daily?d=${K.txn_date}`)}><span>{shortDate(K.txn_date)}<span className="ml-1 text-muted">（週{"日一二三四五六"[new Date(`${K.txn_date}T00:00:00`).getDay()]}）</span></span><span className={cx("font-bold", Number(K.amount) !== Number($.default_wage) && "text-salary")}>{money(K.amount)}</span></div>)}<div className="tnum flex justify-between py-2 font-bold"><span>合計 {G.length} 天</span><span>{money(ie)}</span></div></div>}<div className="mt-3 flex items-center justify-between gap-3"><div><div className="text-sm text-muted">目前還欠</div><Money value={W} className={cx("text-2xl font-bold", W > 0.5 && "text-salary")} /></div>{W > 0.5 ? <Btn kind="primary" onClick={() => r($.id, $.name, W, G.length)}>月底結算・從金庫付現金</Btn> : <span className="font-bold text-muted">已付清</span>}</div></Card>;
            })}<p className="mb-2 px-1 text-sm text-muted">每天在「記帳」的其他雜支打開「今天有來幫忙」就會記在這裡（先記欠薪水，不扣金庫）。日薪預設在「設定 → 付款人」改。</p></Section>}{T.length > 0 && <Section title="家庭收入（點項目展開）" aside=<a className="text-sm font-bold text-flesh-ink" href="#/settings/categories">調整順序</a>>{JComponent(T, v, "income")}</Section>}<Section title=<>生活開銷明細<span className="ml-1 text-sm font-normal">（點項目展開）</span></> aside=<span className="tnum font-bold text-plan">{money(_)}</span>>{M.length === 0 ? <Empty text="這個月還沒有生活開銷" action=<Btn href="#/entry?type=expense&book=personal">＋支出</Btn> /> : JComponent(M, h, "expense")}<a className="mt-2 inline-flex min-h-10 items-center px-1 text-sm font-bold text-flesh-ink" href="#/settings/categories">調整項目順序 ›</a></Section>{y.accts.length > 0 && <Section title="個人帳戶"><List>{y.accts.map($ => <Row key={$.account_id} label={$.name} onClick={() => navigate(`/accounts/${$.account_id}`)} value=<Money value={Number($.balance)} tone={$.balance < 0 ? "auto" : "plain"} className={cx("font-bold")} /> />)}</List></Section>}</>;
      }}</QueryView></Page>;
}

function PersonalYear({
  year
}) {
  let t = useStore();
  let a = useQuery(async () => {
    let [sums, o] = await Promise.all([db.select("v_monthly_summary", {
      where: [gte("month", `${year}-01-01`), lte("month", `${year}-12-31`)],
      order: "month"
    }), db.select("v_monthly_category", {
      where: [gte("month", `${year}-01-01`), lte("month", `${year}-12-31`)]
    })]);
    return {
      sums,
      cats: o.filter(c => Number(c.tier) === 3)
    };
  }, [year]);
  let n = Array.from({
    length: 12
  }, (i, o) => `${year}-${String(o + 1).padStart(2, "0")}-01`);
  let [l, setL] = React.useState(true);
  return <><div className="mb-4 flex items-center justify-between"><button className="h-11 w-11 rounded-full text-2xl active:bg-sunk" aria-label="前一年" onClick={() => navigate(`/personal?v=year&y=${Number(year) - 1}`)}>‹</button><span className="text-lg font-bold">{year} 年</span><button className="h-11 w-11 rounded-full text-2xl active:bg-sunk" aria-label="下一年" onClick={() => navigate(`/personal?v=year&y=${Number(year) + 1}`)}>›</button></div><QueryView q={a} loadingText="載入全年生活開銷中…">{i => {
        let o = f => Number(i.sums.find(k => k.month === f)?.after_fixed ?? 0);
        let c = (f, k) => i.cats.filter(M => M.month === f && M.kind === k).reduce((acc, item) => acc + Number(item.amount), 0);
        let b = f => i.sums.some(k => k.month === f) || i.cats.some(k => k.month === f);
        let m = f => {
          let b_1 = o(f);
          let M = c(f, "income");
          let e = c(f, "expense");
          return {
            b: b_1,
            i: M,
            e,
            save: b_1 + M - e
          };
        };
        let d = n.reduce((acc, item) => {
          let M = m(item);
          return {
            b: acc.b + M.b,
            i: acc.i + M.i,
            e: acc.e + M.e,
            save: acc.save + M.save
          };
        }, {
          b: 0,
          i: 0,
          e: 0,
          save: 0
        });
        let r = n.filter(b);
        let map = new Map();
        i.cats.filter(f => f.kind === "expense").forEach(f => {
          let k = f.report_group || f.category;
          let M = map.get(k) ?? new Map();
          M.set(f.month, (M.get(f.month) ?? 0) + Number(f.amount));
          map.set(k, M);
        });
        let h = f => [...(map.get(f)?.values() ?? [])].reduce((acc, item) => acc + item, 0);
        let v = [...map.keys()].sort((f, k) => h(k) - h(f));
        let _ = f => Math.min(...t.categories.filter(k => k.tier === 3 && k.report_group === f).map(k => k.sort_order), 9999);
        let u = [...map.keys()].sort((f, k) => _(f) - _(k) || h(k) - h(f));
        let p = Math.max(1, r.filter(f => c(f, "expense") > 0).length);
        let g = save => {
          if (save < 0) {
            return "text-warn";
          }
          return "text-leaf";
        };
        return <><Card className="mb-4"><div className="mb-2 text-muted">{year} 年生活開銷與存款</div><div className="tnum grid grid-cols-2 gap-x-4 gap-y-3"><div><div className="text-sm text-muted">生意帶回家<span className="text-xs">（扣除後結餘）</span></div><div className="text-xl font-bold">{money(d.b)}</div></div><div><div className="text-sm text-muted">家庭收入</div><div className="text-xl font-bold text-leaf">{money(d.i)}</div></div><div className="rounded-xl bg-plan-soft p-2"><div className="text-sm text-plan">生活開銷</div><div className="text-xl font-bold text-plan">{money(d.e)}</div><div className="text-xs text-muted">平均每月 {money(d.e / p)}</div></div><div className="rounded-xl bg-leaf-soft p-2"><div className="text-sm text-leaf">實際存下</div><div className={cx("text-xl font-bold", g(d.save))}>{money(d.save)}</div></div></div><p className="mt-2 text-sm text-muted">實際存下 = 生意帶回家 ＋ 家庭收入 − 生活開銷</p></Card><Card className="mb-4"><div className="mb-2 font-bold">每月生活開銷</div><ColumnChart color="var(--plan)" label={`${year} \u6BCF\u6708\u751F\u6D3B\u958B\u92B7`} data={n.map(f => ({
              key: f,
              label: String(Number(f.slice(5, 7))),
              value: c(f, "expense")
            }))} /></Card><div className="mb-4 overflow-hidden rounded-2xl bg-card md:hidden">{[...r, "total"].map(f => {
              let k = f === "total" ? d : m(f);
              return <button key={f} type="button" onClick={() => f !== "total" && navigate(`/personal?m=${f}`)} disabled={f === "total"} className={cx("tnum block w-full border-b border-line px-4 py-3 text-left last:border-b-0", f === "total" ? "bg-sunk" : "active:bg-sunk")}><div className="flex items-baseline justify-between"><b>{f === "total" ? "全年合計" : `${Number(f.slice(5, 7))} \u6708`}</b><span className="text-sm text-muted">實際存下 <b className={cx("text-base", g(k.save))}>{money(k.save)}</b></span></div><div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-muted"><span>生意帶回家 {money(k.b)}</span><span className="text-right">家庭收入 {money(k.i)}</span><span className="rounded-md bg-plan-soft px-2 py-0.5 text-plan">生活開銷 {money(k.e)}</span><span className="rounded-md bg-leaf-soft px-2 py-0.5 text-right">實際存下 <b className={g(k.save)}>{money(k.save)}</b></span></div></button>;
            })}</div><div className="mb-4 hidden overflow-x-auto rounded-2xl bg-card md:block"><table className="tnum w-full min-w-[600px] text-right text-[0.95rem]"><thead className="text-sm text-muted"><tr className="border-b border-line">{["月份", "生意帶回家", "家庭收入", "生活開銷", "實際存下"].map((f, k) => <th key={f} scope="col" className={cx("whitespace-nowrap px-3 py-2 font-bold", k === 0 && "text-left", f === "生活開銷" && "bg-plan-soft text-plan", f === "實際存下" && "bg-leaf-soft text-leaf")}>{f}</th>)}</tr></thead><tbody>{n.map(f => {
                  let k = b(f) ? m(f) : null;
                  return <tr key={f} className="cursor-pointer border-b border-line active:bg-sunk" onClick={() => navigate(`/personal?m=${f}`)}><th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-bold">{Number(f.slice(5, 7))} 月</th><td className="px-3">{k ? money(k.b) : "—"}</td><td className="px-3 text-leaf">{k ? money(k.i) : "—"}</td><td className="bg-plan-soft px-3">{k ? money(k.e) : "—"}</td><td className={cx("bg-leaf-soft px-3 font-bold", k && g(k.save))}>{k ? money(k.save) : "—"}</td></tr>;
                })}<tr className="bg-sunk font-bold"><th scope="row" className="px-3 py-2 text-left">全年合計</th><td className="px-3">{money(d.b)}</td><td className="px-3 text-leaf">{money(d.i)}</td><td className="bg-plan-soft px-3">{money(d.e)}</td><td className={cx("bg-leaf-soft px-3", g(d.save))}>{money(d.save)}</td></tr></tbody></table></div>{v.length > 0 && <Section title="生活開銷排行（全年，大到小）"><Card><BarList tone="cost" rows={v.map(f => ({
                key: f,
                label: f,
                value: h(f),
                sub: `\u4F54 ${pct(h(f) / (d.e || 1))}\u30FB\u5E73\u5747\u6BCF\u6708 ${money(h(f) / p)}`
              }))} /></Card></Section>}{u.length > 0 && <Section title="生活開銷明細（各項目每月）" aside=<button type="button" className="min-h-10 text-sm font-bold text-flesh-ink" onClick={() => setL(!l)}>{l ? "收起 ▲" : "打開 ▼"}</button>>{l && <div className="overflow-x-auto rounded-2xl bg-card"><table className="tnum w-full min-w-[900px] text-right text-sm"><thead className="text-muted"><tr className="border-b border-line"><th className="sticky left-0 bg-card px-3 py-2 text-left">項目</th>{n.map(f => <th key={f} className="px-2 py-2">{Number(f.slice(5, 7))}月</th>)}<th className="bg-plan-soft px-3 py-2 text-plan">全年</th></tr></thead><tbody>{u.map(f => <tr key={f} className="border-b border-line last:border-b-0"><th scope="row" className="sticky left-0 whitespace-nowrap bg-card px-3 py-2 text-left font-bold">{f}</th>{n.map(k => {
                      let M = map.get(f)?.get(k) ?? 0;
                      return <td key={k} className={cx("px-2", !M && "text-muted")}>{M ? money(M) : "—"}</td>;
                    })}<td className="bg-plan-soft px-3 font-bold">{money(h(f))}</td></tr>)}<tr className="bg-sunk font-bold"><th className="sticky left-0 bg-sunk px-3 py-2 text-left">合計</th>{n.map(f => <td key={f} className="px-2">{c(f, "expense") ? money(c(f, "expense")) : "—"}</td>)}<td className="bg-plan-soft px-3">{money(d.e)}</td></tr></tbody></table></div>}</Section>}</>;
      }}</QueryView></>;
}
