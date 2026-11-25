import * as React from "react";
import { Btn, Card, Empty, Field, List, Money, MoneyInput, Page, QueryView, Row, Section, Sheet, cx, parseMoney, useFeedback, useSaver } from "../components/ui.jsx";
import { addMonths, money, monthEnd, monthLabel, monthStart, shortDate, today_ } from "../lib/format.js";
import { ACCOUNT_KIND_LABELS, isOwe, isWagePayer } from "../lib/models.js";
import { navigate } from "../lib/router.js";
import { useQuery, useStore } from "../lib/store.jsx";
import { db, eq, gte, lte } from "../lib/supabase.js";
import { Rh1Component } from "./Reports.jsx";

export function Accounts({
  route
}) {
  let t = route.parts[1];
  if (t === "advances") {
    return <Page title="代墊・預付租金" backTo="/accounts" wide><Rh1Component /></Page>;
  }
  if (t) {
    return <AccountLedger id={t} month={route.query.get("m") || monthStart(today_())} />;
  }
  return <AccountsHome />;
}

function AccountsHome() {
  let e = useStore();
  let t = useQuery(async () => {
    let [o, ...c] = await Promise.all([db.select("v_account_balances", {
      order: "sort_order"
    }), db.select("v_advance_balances"), db.select("v_rent_prepaid")]);
    return Object.assign(o, {
      adv: c[0],
      rent: c[1]
    });
  }, []);
  let [a, setA] = React.useState(null);
  let [__h, __sh] = React.useState(true);
  let {
    run,
    saving
  } = useSaver();
  async function i() {
    let opening_balance = parseMoney(a?.amt ?? "")?.amount ?? 0;
    if (!a || !a.name.trim() || opening_balance <= 0) {
      return;
    }
    if (await run(async () => {
      await db.insert("accounts", {
        code: `OWE_${Date.now().toString(36).toUpperCase()}`,
        name: a.name.trim(),
        kind: "other",
        is_business: false,
        opening_balance,
        opening_date: today_(),
        sort_order: 80,
        notes: `${today_()} \u6B20 ${money(opening_balance)}${a.note.trim() ? `\uFF1A${a.note.trim()}` : ""}\u3002\u9084\u9322\u6642\u8A18\u300C\u8F49\u5E33\uFF1A${a.name.trim()} \u2192 \u91D1\u5EAB\u300D`
      });
      await e.reload();
    }, "已記下")) {
      setA(null);
      t.reload();
    }
  }
  return <Page title="帳戶" actions=<Btn kind="primary" href="#/entry?type=transfer">轉帳</Btn>><QueryView q={t} loadingText="載入帳戶中…" empty={o => {
      if (o.length === 0) {
        return <Empty text="還沒有帳戶" />;
      }
      return null;
    }}>{o => {
        let c = o.filter(d => d.is_business && d.is_active && !isOwe(e.acct(d.account_id)?.code));
        let b = o.filter(d => d.is_active && isOwe(e.acct(d.account_id)?.code) && Math.abs(Number(d.balance)) > 0.5);
        let m = c.reduce((acc, item) => acc + Number(item.balance), 0);
        return <><Card className="mb-4"><div className="flex items-center justify-between"><div className="text-muted">生意帳戶合計</div><button type="button" aria-label={__h ? "顯示金額" : "隱藏金額"} aria-pressed={!__h} className="-my-2 -mr-2 flex h-11 w-11 items-center justify-center rounded-full text-muted active:bg-sunk" onClick={() => __sh(!__h)}><svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx={12} cy={12} r={3} />{__h ? <line x1={3} y1={3} x2={21} y2={21} /> : null}</svg></button></div><div className={cx("tnum text-4xl font-bold", !__h && m < 0 && "text-warn")}>{__h ? "$ ******" : money(m)}</div></Card><Section title="生意帳戶（點進去看明細）"><List>{c.map(d => <Row key={d.account_id} onClick={() => navigate(`/accounts/${d.account_id}`)} label=<span className="text-[1.05rem] font-bold">{d.name}</span> sub={ACCOUNT_KIND_LABELS[d.kind]} value={__h ? <span className="tnum text-lg font-bold text-muted">******</span> : <Money value={Number(d.balance)} tone={d.balance < 0 ? "auto" : "plain"} className="text-lg font-bold" />} />)}</List></Section><Section title="代墊（生意欠誰）" aside=<a className="text-sm font-bold text-flesh-ink" href="#/entry?type=payment&kind=advance_repay">還代墊</a>>{o.adv.filter(d => Number(d.advanced) - Number(d.repaid) > 0 && !isWagePayer(e.payer(d.payer_id))).length === 0 ? <Empty text="目前沒有代墊" /> : <List>{o.adv.filter(d => Number(d.advanced) - Number(d.repaid) > 0 && !isWagePayer(e.payer(d.payer_id))).map(d => <Row key={d.payer_id} onClick={() => navigate("/accounts/advances")} label=<span className="text-[1.05rem] font-bold">{d.name}</span> sub={`\u4EE3\u588A ${money(d.advanced)}\u30FB\u5DF2\u9084 ${money(d.repaid)}`} value=<Money value={Number(d.advanced) - Number(d.repaid)} className="text-lg font-bold" /> />)}</List>}</Section><Section title="別人欠我" aside=<button type="button" className="min-h-10 text-sm font-bold text-flesh-ink" onClick={() => setA({
            name: "",
            amt: "",
            note: ""
          })}>＋新增</button>>{b.length === 0 ? <Empty text="目前沒有人欠錢" /> : <List>{b.map(d => <div key={d.account_id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"><button type="button" className="min-w-0 flex-1 text-left" onClick={() => navigate(`/accounts/${d.account_id}`)}><span className="block text-[1.05rem] font-bold">{d.name}</span><span className="block text-sm text-muted line-clamp-2">{e.acct(d.account_id)?.notes?.split(`
`)[0]}</span></button><Money value={Number(d.balance)} className="text-lg font-bold" /><Btn href={`#/entry?type=transfer&from=${d.account_id}&to=${e.cashAccountId ?? ""}&amt=${Number(d.balance)}&desc=${encodeURIComponent(`${d.name} \u9084\u9322`)}`}>還錢了</Btn></div>)}</List>}</Section><Section title="預付租金（還剩）" aside=<a className="text-sm font-bold text-flesh-ink" href="#/entry?type=payment&kind=rent_prepay">記預付租金</a>>{o.rent.filter(d => d.payment_method === "transfer" && Math.abs(Number(d.prepaid) - Number(d.used)) > 0.5).length === 0 ? <Empty text="目前沒有預付租金" /> : <List>{o.rent.filter(d => d.payment_method === "transfer" && Math.abs(Number(d.prepaid) - Number(d.used)) > 0.5).map(d => <Row key={d.market_id} onClick={() => navigate("/accounts/advances")} label=<span className="text-[1.05rem] font-bold">{d.name}</span> sub={d.paid_until ? `\u4ED8\u5230 ${shortDate(d.paid_until)}` : undefined} value=<Money value={Number(d.prepaid) - Number(d.used)} tone="auto" className="text-lg font-bold" /> />)}</List>}</Section><p className="mb-2 px-1 text-sm text-muted">Minnie、偉龍的個人帳戶在<a className="inline-block py-2 font-bold text-flesh-ink underline" href="#/personal">「個人」分頁</a>。</p><p className="px-1 text-sm text-muted">餘額 = 期初 ＋ 收入 ＋ 轉入 − 支出 − 轉出 − 付款。期初餘額在「設定 → 帳戶」修改。</p></>;
      }}</QueryView><Sheet open={a !== null} onClose={() => setA(null)} title="新增：別人欠我">{a && <><Field label="誰欠的"><input className="field" value={a.name} placeholder="例如：爸爸（代收轉租費）" onChange={o => setA({
            ...a,
            name: o.target.value
          })} /></Field><Field label="欠多少"><MoneyInput value={a.amt} onChange={amt => setA({
            ...a,
            amt
          })} /></Field><Field label="原因（選填）"><input className="field" value={a.note} placeholder="例如：10/7 濱江轉租費爸爸先收" onChange={o => setA({
            ...a,
            note: o.target.value
          })} /></Field><p className="mb-3 text-sm text-muted">還錢時按「還錢了」，會記成「轉帳：{a.name || "○○"} → 金庫」，欠的金額就會歸零。</p><Btn kind="primary" big className="w-full" disabled={saving || !a.name.trim() || !parseMoney(a.amt)?.amount} onClick={i}>{saving ? "儲存中…" : "記下"}</Btn></>}</Sheet></Page>;
}

function AccountLedger({
  id,
  month
}) {
  let a = useStore();
  let n = a.acct(id);
  let a_cashAccountId = a.cashAccountId;
  let s = useQuery(async () => {
    let [bal] = await db.select("v_account_balances", {
      where: [eq("account_id", id)]
    });
    let p = await db.select("v_account_ledger", {
      where: [eq("account_id", id), gte("txn_date", month), lte("txn_date", monthEnd(month))],
      order: "txn_date.asc,created_at.asc,txn_id.asc",
      limit: 2000
    });
    let g = p.length ? Number(p[0].balance) - Number(p[0].delta) : 0;
    let f = j => {
      if (Number(j.delta) > 0) {
        return 0;
      }
      return 1;
    };
    let k = p.map((j, $) => ({
      r: j,
      i: $
    })).sort((j, $) => j.r.txn_date.localeCompare($.r.txn_date) || f(j.r) - f($.r) || j.i - $.i).map(j => j.r);
    let M = g;
    let T = k.map(j => {
      M += Number(j.delta);
      return {
        ...j,
        balance: Math.round(M * 100) / 100
      };
    });
    return {
      bal,
      rows: T
    };
  }, [id, month]);
  let [i, setI] = React.useState("");
  let [c, setC] = React.useState(new Set());
  let {
    confirm
  } = useFeedback();
  let {
    run
  } = useSaver();
  let r = n?.kind === "cash";
  async function y(u, amount) {
    if (!n) {
      return;
    }
    let g = amount - u;
    if (!(await confirm(`\u628A\u300C${n.name}\u300D\u5F9E\u7CFB\u7D71\u7684 ${money(u)} \u8ABF\u6574\u6210\u5BE6\u969B\u7684 ${money(amount)}\uFF1F
\uFF08\u5DEE ${g > 0 ? "+" : "−"}${money(Math.abs(g))}\uFF0C\u4E0D\u7B97\u6536\u5165\u4E5F\u4E0D\u7B97\u652F\u51FA\uFF0C\u53EA\u662F\u8B93\u5E33\u8DDF\u5BE6\u969B\u4E00\u6A23\uFF09

\u8ACB\u5148\u78BA\u8A8D\u4ECA\u5929\u7684\u6536\u5165\u3001\u652F\u51FA\u90FD\u5DF2\u7D93\u8A18\u597D\u4E86\u3002`, {
      danger: false,
      okText: "調整"
    }))) {
      return;
    }
    let f = `${today_()} ${r ? "盤點" : "對存摺"}\uFF1A\u7CFB\u7D71 ${money(u)} \u2192 \u5BE6\u969B ${money(amount)}\uFF08${g > 0 ? "+" : "−"}${money(Math.abs(g))}\uFF09`;
    if (await run(async () => {
      await db.update("accounts", {
        opening_balance: Number(n.opening_balance) + g,
        notes: [n.notes, f].filter(Boolean).join(`
`)
      }, [eq("id", n.id)]);
      await a.reload();
    }, "已調整成實際金額")) {
      setI("");
      s.reload();
    }
  }
  async function h(u) {
    if (!n) {
      return;
    }
    let p = `${today_()} ${r ? "盤點" : "對存摺"}\uFF1A\u4E00\u81F4 ${money(u)}`;
    if (await run(async () => {
      await db.update("accounts", {
        notes: [n.notes, p].filter(Boolean).join(`
`)
      }, [eq("id", n.id)]);
      await a.reload();
    }, r ? "已記下：盤點正確" : "已記下：存摺對過了")) {
      setI("");
    }
  }
  let v = u => navigate(`/accounts/${id}?m=${u}`);
  let _ = id === a_cashAccountId ? a.acctByCode("POST")?.id : a_cashAccountId;
  return <Page title={n?.name ?? "帳戶明細"} backTo="/accounts"><QueryView q={s} loadingText="載入明細中…">{u => {
        let p = u.rows.filter(T => T.delta > 0).reduce((acc, item) => acc + Number(item.delta), 0);
        let g = u.rows.filter(T => T.delta < 0).reduce((acc, item) => acc - Number(item.delta), 0);
        let f = Number(u.bal?.balance ?? 0);
        let k = parseMoney(i);
        let M = k && i.trim() ? k.amount - f : null;
        return <><Card className="mb-4"><div className="text-muted">目前餘額</div><div className={cx("tnum text-4xl font-bold", f < 0 && "text-warn")}>{money(f)}</div><div className="mt-3 grid grid-cols-2 gap-2">{n?.kind === "cash" ? <><Btn href={`#/entry?type=transfer&from=${id}&to=${a.acctByCode("POST")?.id ?? ""}`}>存到郵局</Btn><Btn href={`#/entry?type=transfer&from=${a.acctByCode("POST")?.id ?? ""}&to=${id}`}>從郵局領回</Btn></> : <><Btn href={`#/entry?type=transfer&from=${_ ?? ""}&to=${id}`}>存入</Btn><Btn href={`#/entry?type=transfer&from=${id}&to=${_ ?? ""}`}>提領</Btn></>}<Btn href={`#/entry?type=payment&from=${id}`}>付款／匯款</Btn><Btn href={`#/entry?type=expense&from=${id}`}>支出／手續費</Btn></div></Card><Card className="mb-4"><div className="mb-2 font-bold">{r ? "點現金（盤點）" : "對存摺"}</div><div className="flex items-center gap-2"><MoneyInput compact className="flex-1" value={i} onChange={setI} placeholder={r ? "輸入實際點到的現金" : "輸入存摺上的餘額"} /></div>{M !== null && <p className={cx("mt-2 font-bold", Math.abs(M) < 0.5 ? "text-leaf" : "text-warn")}>{Math.abs(M) < 0.5 ? "✓ 跟系統一樣，對帳正確" : `${r ? "實際現金" : "存摺"}\u6BD4\u7CFB\u7D71${M > 0 ? "多" : "少"} ${money(Math.abs(M))}\uFF0C\u53EF\u80FD\u6709\u6F0F\u8A18\u6216\u591A\u8A18\uFF0C\u53EF\u4EE5\u5148\u6AA2\u67E5\u4E0B\u9762\u7684\u660E\u7D30`}</p>}{M !== null && Math.abs(M) < 0.5 && <Btn kind="primary" className="mt-3 w-full" onClick={() => h(f)}>記下：今天{r ? "盤點" : "對存摺"}正確</Btn>}{M !== null && k && Math.abs(M) >= 0.5 && <Btn className="mt-3 w-full" onClick={() => y(f, k.amount)}>把系統調整成 {money(k.amount)}</Btn>}{n?.notes && <p className="mt-2 whitespace-pre-line text-xs text-muted">{n.notes}</p>}</Card><div className="mb-3 flex items-center justify-between"><button className="h-11 w-11 rounded-full text-2xl active:bg-sunk" aria-label="上個月" onClick={() => v(addMonths(month, -1))}>‹</button><span className="text-lg font-bold">{monthLabel(month)}</span><button className="h-11 w-11 rounded-full text-2xl active:bg-sunk" aria-label="下個月" onClick={() => v(addMonths(month, 1))}>›</button></div><div className="tnum mb-2 flex justify-between px-1 text-sm text-muted"><span>存入 <b className="text-leaf">{money(p)}</b></span><span>支出 <b className="text-skin">{money(g)}</b></span><span>{u.rows.length} 筆</span></div>{u.rows.length === 0 ? <Empty text="這個月沒有進出" /> : (() => {
            let T = [...new Set(u.rows.map(U => U.txn_date))];
            let j = T.every(U => c.has(U));
            let $ = U => U.type === "income" && U.label.includes("現金收入");
            let G = U => U.type === "payment" && U.label === "進貨付款" && Number(U.delta) < 0;
            let ie = U => {
              if (U.type === "payment" && U.label === "進貨付款") {
                return "地瓜進貨付款";
              }
              return U.label;
            };
            return <><div className="mb-2 flex justify-end gap-2"><Btn onClick={() => setC(j ? new Set() : new Set(T))}>{j ? "全部收合" : "全部展開"}</Btn></div><div className="overflow-hidden rounded-2xl bg-card"><table className="tnum w-full text-[0.92rem]"><thead className="text-left text-xs text-muted"><tr className="border-b border-line"><th className="py-2 pl-3 font-bold">日期</th><th className="font-bold">摘要</th><th className="text-right font-bold">金額</th><th className="pl-3 pr-3 text-right font-bold">餘額</th></tr></thead><tbody>{T.map(U => {
                      let W = u.rows.filter(E => E.txn_date === U);
                      let K = W.filter(E => Number(E.delta) > 0);
                      let L = W.filter(E => Number(E.delta) < 0);
                      let V = K.reduce((acc, item) => acc + Number(item.delta), 0);
                      let we = -L.reduce((acc, item) => acc + Number(item.delta), 0);
                      let Ue = c.has(U);
                      let ft = () => setC(E => {
                        let ue = new Set(E);
                        if (ue.has(U)) {
                          ue.delete(U);
                        } else {
                          ue.add(U);
                        }
                        return ue;
                      });
                      let UaComponent = (E, ue) => <tr key={E.txn_id + ue} className={cx("cursor-pointer border-b border-line align-top active:brightness-95", $(E) && "bg-weekend")} onClick={() => navigate(`/entry/${E.txn_id}`)}><td className="py-2.5 pl-6 pr-2" /><td className="py-2.5 pr-2">{G(E) && <span className="mr-1.5 inline-block rounded-full bg-flesh-soft px-2 py-0.5 text-xs font-bold text-flesh-ink">🍠 地瓜進貨</span>}<span className="line-clamp-2 break-all">{ie(E)}</span></td><td className={cx("whitespace-nowrap py-2.5 text-right font-bold", E.delta > 0 ? "text-leaf" : "text-skin")}>{E.delta > 0 ? "+" : "−"}{money(Math.abs(E.delta))}</td><td className="whitespace-nowrap py-2.5 pl-3 pr-3 text-right text-muted">{money(E.balance)}</td></tr>;
                      let StComponent = (E, ue, oe) => <tr className="border-b border-line bg-sunk/30"><td /><td className={cx("py-1.5 pr-2 text-sm font-bold", oe)}>{E}</td><td className={cx("whitespace-nowrap py-1.5 text-right text-sm font-bold", oe)}>{E === "收入" ? "+" : "−"}{money(ue)}</td><td /></tr>;
                      return <React.Fragment key={U}><tr className="cursor-pointer border-b border-line bg-sunk/60 align-top active:bg-sunk" aria-expanded={Ue} onClick={ft}><td className="whitespace-nowrap py-2.5 pl-3 pr-2 font-bold"><span className={cx("mr-1 inline-block text-muted transition-transform", Ue && "rotate-90")}>›</span>{shortDate(U)}</td><td className="py-2.5 pr-2">{K.length > 0 && <div>收入<span className="ml-1 text-xs text-muted">{K.length} 筆</span></div>}{L.length > 0 && <div>支出<span className="ml-1 text-xs text-muted">{L.length} 筆</span></div>}</td><td className="whitespace-nowrap py-2.5 text-right font-bold">{K.length > 0 && <div className="text-leaf">+{money(V)}</div>}{L.length > 0 && <div className="text-skin">−{money(we)}</div>}</td><td className="whitespace-nowrap py-2.5 pl-3 pr-3 text-right font-bold">{money(W[W.length - 1].balance)}</td></tr>{Ue && <>{K.length > 0 && L.length > 0 && StComponent("收入", V, "text-leaf")}{K.map(UaComponent)}{L.length > 0 && K.length > 0 && StComponent("支出", we, "text-skin")}{L.map(UaComponent)}</>}</React.Fragment>;
                    })}</tbody></table></div></>;
          })()}<p className="mt-3 px-1 text-sm text-muted">點日期可以展開／收合那天的明細；點任何一筆可以修改。粉紅色底是現金收入，綠色金額是存入，紅色是支出（含手續費）。</p></>;
      }}</QueryView></Page>;
}
