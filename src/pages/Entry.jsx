import * as React from "react";
import { CashCounter } from "../components/CashCounter.jsx";
import { TxnList } from "../components/TxnList.jsx";
import { Btn, Card, Empty, ErrorBox, Field, Loading, Money, MoneyInput, Page, QueryView, Segmented, parseMoney, useFeedback, useSaver } from "../components/ui.jsx";
import { clearDraft, loadDraft, saveDraft } from "../lib/drafts.js";
import { WEEKDAYS, addMonths, money, monthEnd, monthLabel, monthStart, shortDate, today_, weekday } from "../lib/format.js";
import { PAYMENT_KIND_LABELS, TIER_LABELS, isOwe, isWagePayer } from "../lib/models.js";
import { goBack, navigate } from "../lib/router.js";
import { useQuery, useStore } from "../lib/store.jsx";
import { db, eq, gte, isNull, lte } from "../lib/supabase.js";

const ql = {
  income: "收入",
  expense: "支出",
  transfer: "轉帳",
  payment: "付款"
};

function CategorySelect({
  kind,
  value,
  onChange,
  includeInactive,
  personal
}) {
  let {
    categories
  } = useStore();
  let i = categories.filter(c => c.kind === kind && (c.is_active || c.id === includeInactive) && (personal ? c.tier === 3 : c.tier !== 3) && c.code !== "SWEET_POTATO_COST" && c.code !== "FEE");
  let o = [...new Set(i.map(c => c.tier))].sort();
  return <select className="field" value={value} onChange={c => onChange(c.target.value)}><option value="">請選擇分類</option>{o.map(c => <optgroup key={c} label={kind === "income" ? c === 1 ? "營業收入" : c === 3 ? "家庭收入" : "非營業收入" : TIER_LABELS[c]}>{i.filter(b => b.tier === c).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</optgroup>)}</select>;
}

export function AccountSelect({
  value,
  onChange,
  exclude,
  allowEmpty
}) {
  let {
    accounts
  } = useStore();
  return <select className="field" value={value} onChange={s => onChange(s.target.value)}>{allowEmpty !== undefined && <option value="">{allowEmpty}</option>}{accounts.filter(s => (s.is_active || s.id === value) && s.id !== exclude).map(s => <option key={s.id} value={s.id}>{s.name}{isOwe(s.code) ? "（欠我）" : s.is_business ? "" : "（個人）"}</option>)}</select>;
}

export function Entry({
  route
}) {
  let t = route.parts[1];
  let a = useStore();
  let n = useQuery(async () => {
    if (t) {
      return (await db.select("transactions", {
        where: [eq("id", t)]
      }))[0] ?? null;
    }
    return null;
  }, [t]);
  if (t && n.loading) {
    return <Page title="記帳" backTo="/"><Loading /></Page>;
  }
  if (n.error) {
    return <Page title="記帳" backTo="/"><ErrorBox text={n.error} onRetry={n.reload} /></Page>;
  }
  if (t && !n.data) {
    return <Page title="記帳" backTo="/"><Empty text="找不到這筆資料，可能已經刪除。" /></Page>;
  }
  let personal = route.query.get("book") === "personal" || (n.data ? a.cat(n.data.category_id)?.tier === 3 : false);
  let s = route.query.get("type");
  return <EntryForm txn={n.data} defaultType={personal ? s === "income" ? "income" : "expense" : s || "expense"} defaultDate={route.query.get("d") || today_()} personal={personal} preset={{
    accountId: route.query.get("from") ?? undefined,
    toAccountId: route.query.get("to") ?? undefined,
    paymentKind: route.query.get("kind") ?? undefined,
    marketId: route.query.get("market") ?? undefined,
    amount: route.query.get("amt") ?? undefined,
    coversFrom: route.query.get("cf") ?? undefined,
    coversTo: route.query.get("ct") ?? undefined,
    description: route.query.get("desc") ?? undefined
  }} />;
}

function EntryForm({
  txn,
  defaultType,
  defaultDate,
  personal,
  preset
}) {
  let s = useStore();
  let {
    saving,
    run
  } = useSaver();
  let {
    confirm
  } = useFeedback();
  let b = personal ? `entry:new:personal:${defaultType}` : `entry:new:${defaultType}`;
  let backTo = personal ? "/personal" : "/";
  let d = {
    type: defaultType,
    date: defaultDate,
    amount: "",
    categoryId: "",
    accountId: (personal && defaultType === "income" ? s.accounts.find(f => !f.is_business && f.is_active)?.id : undefined) ?? s.cashAccountId ?? "",
    toAccountId: s.acctByCode("POST")?.id ?? "",
    payerId: "",
    isAdvance: false,
    paymentKind: "supplier",
    supplierId: s.suppliers[0]?.id ?? "",
    marketId: "",
    fee: "",
    coversFrom: "",
    coversTo: "",
    description: "",
    note: ""
  };
  let [r, setR] = React.useState(() => {
    if (txn) {
      return {
        type: txn.type,
        date: txn.txn_date,
        amount: txn.formula ?? String(Number(txn.amount)),
        categoryId: txn.category_id ?? "",
        accountId: txn.account_id ?? "",
        toAccountId: txn.to_account_id ?? "",
        payerId: txn.payer_id ?? "",
        isAdvance: txn.is_advance,
        paymentKind: txn.payment_kind ?? "supplier",
        supplierId: txn.supplier_id ?? "",
        marketId: txn.market_id ?? "",
        fee: txn.fee ? String(Number(txn.fee)) : "",
        coversFrom: txn.covers_from ?? "",
        coversTo: txn.covers_to ?? "",
        description: txn.description ?? "",
        note: txn.note ?? ""
      };
    }
    let f = Object.fromEntries(Object.entries(preset ?? {}).filter(([, k]) => k));
    return {
      ...d,
      ...(loadDraft(b) ?? {}),
      type: defaultType,
      date: defaultDate,
      ...f
    };
  });
  let [h, setH] = React.useState({});
  let _ = f => setR(k => ({
    ...k,
    ...f
  }));
  React.useEffect(() => {
    if (!txn) {
      saveDraft(b, r);
    }
  }, [r, txn, b]);
  if (txn && (txn.source === "daily" && !personal || txn.source === "purchase" || txn.source === "fee")) {
    let f = txn.source === "daily" ? {
      href: `#/daily?d=${txn.txn_date}`,
      text: "到記帳頁修改這一天"
    } : txn.source === "purchase" ? {
      href: `#/purchases/order/${txn.purchase_order_id}`,
      text: "到進貨單修改"
    } : {
      href: `#/entry/${txn.fee_parent_id}`,
      text: "修改原本那筆"
    };
    return <Page title="記帳" backTo="/"><Card><p className="mb-1 text-lg font-bold"><Money value={Number(txn.amount)} /> {txn.description ?? s.cat(txn.category_id)?.name}</p><p className="mb-4 text-muted">{txn.source === "daily" ? "這筆是「每日記帳」產生的。" : txn.source === "purchase" ? "這筆是進貨單當場付款自動產生的。" : "這筆是手續費，跟著原本那筆自動產生。"}</p><Btn kind="primary" href={f.href}>{f.text}</Btn></Card></Page>;
  }
  function u() {
    let f = {};
    if (!r.date) {
      f.date = "請選擇日期";
    }
    let k = parseMoney(r.amount);
    if (k) {
      if (k.amount <= 0) {
        f.amount = "金額要大於 0";
      }
    } else {
      f.amount = "金額看不懂，請檢查算式";
    }
    if ((r.type === "income" || r.type === "expense") && !r.categoryId) {
      f.categoryId = "請選擇分類";
    }
    if (r.type === "income" && !r.accountId) {
      f.accountId = "請選擇收到哪個帳戶";
    }
    if (r.type === "expense" && !r.isAdvance && !r.accountId) {
      f.accountId = "請選擇從哪個帳戶付";
    }
    if (r.type === "expense" && r.isAdvance && !r.payerId) {
      f.payerId = "代墊要選是誰先付的";
    }
    if (r.type === "transfer") {
      if (!r.accountId || !r.toAccountId) {
        f.accountId = "請選擇兩個帳戶";
      } else if (r.accountId === r.toAccountId) {
        f.toAccountId = "轉出、轉入不能是同一個帳戶";
      }
    }
    if (r.type === "payment") {
      if (!r.accountId && r.paymentKind !== "supplier") {
        f.accountId = "請選擇從哪個帳戶付";
      }
      if (r.paymentKind === "supplier" && !r.supplierId) {
        f.supplierId = "請選擇供應商";
      }
      if (r.paymentKind === "rent_prepay" && !r.marketId) {
        f.marketId = "請選擇市場";
      }
      if (r.paymentKind === "advance_repay" && !r.payerId) {
        f.payerId = "請選擇還給誰";
      }
    }
    let M = parseMoney(r.fee);
    if (!M || M.amount < 0) {
      f.fee = "手續費看不懂";
    }
    return f;
  }
  async function p() {
    let f = u();
    setH(f);
    if (Object.keys(f).length) {
      return;
    }
    if (!txn && (r.type === "income" || r.type === "expense") && r.categoryId) {
      let $ = await db.select("transactions", {
        where: [isNull("deleted_at"), eq("txn_date", r.date), eq("category_id", r.categoryId), eq("type", r.type)]
      }).catch(() => []);
      let G = s.cat(r.categoryId)?.name ?? "";
      let ie = $.find(U => U.source === "daily");
      if (ie) {
        if (await confirm(`\u9019\u5929\u7684\u6BCF\u65E5\u8A18\u5E33\u5DF2\u7D93\u8A18\u4E86\u300C${G}\u300D${money(ie.amount)}\uFF0C\u4E0D\u80FD\u91CD\u8907\u5165\u5E33\u3002

\u8981\u6539\u91D1\u984D\uFF0C\u8ACB\u5230\u90A3\u5929\u7684\u6BCF\u65E5\u8A18\u5E33\u6309\u300C\u4FEE\u6539\u300D\u3002\u8981\u73FE\u5728\u904E\u53BB\u55CE\uFF1F`, {
          okText: "去修改",
          danger: false
        })) {
          navigate(`/daily?d=${r.date}`);
        }
        return;
      }
      if ($.length) {
        let U = $.reduce((acc, item) => acc + Number(item.amount), 0);
        if (!(await confirm(`\u9019\u5929\u5DF2\u7D93\u8A18\u904E ${$.length} \u7B46\u300C${G}\u300D\uFF0C\u5171 ${money(U)}\u3002

\u78BA\u5B9A\u9084\u8981\u518D\u8A18\u4E00\u7B46\u55CE\uFF1F\uFF08\u5982\u679C\u662F\u540C\u4E00\u7B46\uFF0C\u8ACB\u6309\u53D6\u6D88\uFF0C\u5230\u9996\u9801\u300C\u6700\u8FD1\u8A18\u5E33\u300D\u6309\u300C\u4FEE\u6539\u300D\uFF09`, {
          okText: "再記一筆",
          danger: false
        }))) {
          return;
        }
      }
    }
    let k = parseMoney(r.amount);
    let r_type = r.type;
    let T = {
      txn_date: r.date,
      type: r_type,
      amount: k.amount,
      formula: k.formula,
      category_id: r_type === "income" || r_type === "expense" ? r.categoryId : null,
      account_id: r_type === "expense" && r.isAdvance ? null : r.accountId || null,
      to_account_id: r_type === "transfer" ? r.toAccountId : null,
      payer_id: (r_type === "expense" || r_type === "payment" && r.paymentKind === "advance_repay") && r.payerId || null,
      is_advance: r_type === "expense" && r.isAdvance,
      payment_kind: r_type === "payment" ? r.paymentKind : null,
      supplier_id: r_type === "payment" && r.paymentKind === "supplier" ? r.supplierId : null,
      market_id: (r_type === "payment" && r.paymentKind === "rent_prepay" || r_type === "income" || r_type === "expense") && r.marketId || null,
      covers_from: r_type === "payment" && r.paymentKind === "rent_prepay" && r.coversFrom || null,
      covers_to: r_type === "payment" && r.paymentKind === "rent_prepay" && r.coversTo || null,
      fee: r_type === "transfer" || r_type === "payment" ? parseMoney(r.fee).amount : 0,
      description: r.description || null,
      note: r.note || null,
      ...(personal && txn?.source === "daily" ? {
        source: "manual",
        business_day_id: null,
        daily_slot: null
      } : {})
    };
    if (await run(() => {
      if (txn) {
        return db.update("transactions", T, [eq("id", txn.id)]);
      }
      return db.insert("transactions", T);
    })) {
      if (!txn) {
        clearDraft(b);
      }
      goBack(backTo);
    }
  }
  async function g() {
    if (!txn || !(await confirm(`\u78BA\u5B9A\u8981\u522A\u9664\u9019\u7B46${ql[txn.type]}\u55CE\uFF1F`))) {
      return;
    }
    if (await run(() => db.softDelete("transactions", txn.id), "已刪除")) {
      goBack(backTo);
    }
  }
  return <Page title={personal ? `${txn ? "編輯" : "記"}${r.type === "income" ? "家庭收入" : "生活開銷"}` : txn ? `\u7DE8\u8F2F${ql[r.type]}` : `\u65B0\u589E${ql[r.type]}`} backTo={backTo}>{personal && <p className="mb-3 px-1 text-sm text-muted">生活開銷、家庭收入都記在「個人」，不算進地瓜生意。</p>}{!txn && personal && <Segmented className="mb-4" value={r.type === "income" ? "income" : "expense"} onChange={f => {
      _({
        type: f,
        categoryId: ""
      });
      navigate(`/entry?book=personal&type=${f}&d=${r.date}`);
    }} options={[{
      value: "expense",
      label: "支出"
    }, {
      value: "income",
      label: "收入"
    }]} />}{!txn && !personal && <Segmented className="mb-4" value={r.type} onChange={f => {
      _({
        type: f,
        categoryId: ""
      });
      navigate(`/entry?type=${f}&d=${r.date}`);
    }} options={Object.keys(ql).map(f => ({
      value: f,
      label: ql[f]
    }))} />}<Card className="mb-4"><Field label="金額" error={h.amount} hint={r.type === "income" && !personal ? undefined : "可以打算式，例如 450+200+90"}>{r.type === "income" && !personal ? <CashCounter value={r.amount} onChange={f => _({
          amount: f
        })} /> : <MoneyInput value={r.amount} onChange={f => _({
          amount: f
        })} autoFocus={!txn} />}</Field>{(r.type === "income" || r.type === "expense") && <Field label="分類" error={h.categoryId}><CategorySelect kind={r.type} personal={personal} value={r.categoryId} onChange={categoryId => _({
          categoryId
        })} includeInactive={txn?.category_id ?? undefined} /></Field>}{r.type === "payment" && <Field label="付什麼"><select className="field" value={r.paymentKind} onChange={f => _({
          paymentKind: f.target.value
        })}>{Object.keys(PAYMENT_KIND_LABELS).map(f => <option key={f} value={f}>{PAYMENT_KIND_LABELS[f]}</option>)}</select></Field>}{r.type === "payment" && r.paymentKind === "supplier" && <Field label="供應商" error={h.supplierId}><select className="field" value={r.supplierId} onChange={f => _({
          supplierId: f.target.value
        })}>{s.suppliers.filter(f => f.is_active || f.id === r.supplierId).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></Field>}{r.type === "payment" && r.paymentKind === "rent_prepay" && <><Field label="市場" error={h.marketId}><select className="field" value={r.marketId} onChange={f => _({
            marketId: f.target.value
          })}><option value="">請選擇市場</option>{s.markets.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></Field><div className="grid grid-cols-2 gap-3"><Field label="涵蓋從"><input type="date" className="field" value={r.coversFrom} onChange={f => _({
              coversFrom: f.target.value
            })} /></Field><Field label="到"><input type="date" className="field" value={r.coversTo} onChange={f => _({
              coversTo: f.target.value
            })} /></Field></div></>}{r.type === "expense" && !personal && <Field label="這筆錢誰出的"><Segmented value={r.isAdvance ? "adv" : "biz"} onChange={f => _({
          isAdvance: f === "adv",
          payerId: f === "adv" ? r.payerId : ""
        })} options={[{
          value: "biz",
          label: "生意帳戶付"
        }, {
          value: "adv",
          label: "個人先代墊"
        }]} /></Field>}{r.type === "expense" && r.isAdvance && !personal && <Field label="誰先代墊的" error={h.payerId}><select className="field" value={r.payerId} onChange={f => _({
          payerId: f.target.value
        })}><option value="">請選擇</option>{s.payers.filter(f => f.is_active && !isWagePayer(f) || f.id === r.payerId).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select><p className="mt-1 text-xs text-muted">不會從生意帳戶扣錢，首頁會提醒「生意欠 ○○ 代墊」，之後用「付款 → 還代墊」還她。</p></Field>}{r.type === "payment" && r.paymentKind === "advance_repay" && <Field label="還給誰" error={h.payerId}><select className="field" value={r.payerId} onChange={f => _({
          payerId: f.target.value
        })}><option value="">請選擇</option>{s.payers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></Field>}{!(r.type === "expense" && r.isAdvance) && <Field label={r.type === "income" ? "收到哪個帳戶" : r.type === "transfer" ? "從哪個帳戶轉出" : "從哪個帳戶付"} error={h.accountId}><AccountSelect value={r.accountId} onChange={accountId => _({
          accountId
        })} allowEmpty={r.type === "payment" && r.paymentKind === "supplier" ? "（沒有動到帳戶，例如扣抵）" : undefined} /></Field>}{r.type === "transfer" && <Field label="轉入哪個帳戶" error={h.toAccountId}><AccountSelect value={r.toAccountId} onChange={toAccountId => _({
          toAccountId
        })} exclude={r.accountId} /></Field>}{(r.type === "transfer" || r.type === "payment") && <Field label="手續費" error={h.fee} hint="有填會自動記一筆手續費支出"><MoneyInput compact value={r.fee} onChange={fee => _({
          fee
        })} /></Field>}<Field label="日期" error={h.date}><input type="date" className="field" value={r.date} onChange={f => _({
          date: f.target.value
        })} /></Field>{(r.type === "income" || r.type === "expense") && !personal && <Field label="市場（選填）"><select className="field" value={r.marketId} onChange={f => _({
          marketId: f.target.value
        })}><option value="">（不指定）</option>{s.markets.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></Field>}<Field label="說明（選填）"><input className="field" value={r.description} placeholder={r.type === "transfer" ? "例如：現金存入郵局" : "例如：工具箱"} onChange={f => _({
          description: f.target.value
        })} /></Field><Field label="備註（選填）" className="mb-0"><input className="field" value={r.note} onChange={f => _({
          note: f.target.value
        })} /></Field></Card><div className="flex gap-3">{txn && <Btn kind="danger" big onClick={g}>刪除</Btn>}<Btn kind="primary" big className="flex-1" onClick={p} disabled={saving}>{saving ? "儲存中…" : "儲存"}</Btn></div></Page>;
}

export function Transactions({
  route
}) {
  let t = useStore();
  let a = route.query.get("m") || monthStart(today_());
  let n = route.query.get("type") || "all";
  let l = route.query.get("cat") || "";
  let s = (route.query.get("s") || "").trim();
  let [i, setI] = React.useState(s);
  let c = r => {
    let y = new URLSearchParams({
      m: a,
      type: n,
      cat: l,
      s,
      ...r
    });
    navigate(`/transactions?${y}`);
  };
  React.useEffect(() => {
    if (i.trim() === s) {
      return;
    }
    let r = setTimeout(() => c({
      s: i.trim()
    }), 400);
    return () => clearTimeout(r);
  }, [i]);
  let b = useQuery(async () => {
    if (s) {
      let h = [isNull("deleted_at")];
      if (n !== "all") {
        h.push(eq("type", n));
      }
      let v = await db.select("transactions", {
        where: h,
        order: "txn_date.desc,created_at.desc",
        limit: 5000
      });
      let _ = s.toLowerCase().replace(/[$,]/g, "");
      return v.filter(u => t.cat(u.category_id)?.tier !== 3 && (!l || u.category_id === l)).filter(u => [u.description, u.note, t.cat(u.category_id)?.name, t.market(u.market_id)?.name, t.supplier(u.supplier_id)?.name, t.payer(u.payer_id)?.name, String(Number(u.amount)), u.formula].some(p => (p ?? "").toLowerCase().includes(_)));
    }
    let r = [isNull("deleted_at"), gte("txn_date", a), lte("txn_date", monthEnd(a))];
    if (n !== "all") {
      r.push(eq("type", n));
    }
    if (l) {
      r.push(eq("category_id", l));
    }
    return (await db.select("transactions", {
      where: r,
      order: "txn_date.desc,created_at.desc",
      limit: 1000
    })).filter(h => t.cat(h.category_id)?.tier !== 3);
  }, [a, n, l, s]);
  let m = b.data?.filter(r => r.type === "income").reduce((r, y) => r + Number(y.amount), 0) ?? 0;
  let d = b.data?.filter(r => r.type === "expense").reduce((r, y) => r + Number(y.amount), 0) ?? 0;
  return <Page title="記帳明細" backTo="/" actions=<Btn kind="primary" href="#/entry?type=expense">＋記帳</Btn>><div className="relative mb-3"><input type="text" inputMode="search" enterKeyHint="search" className="field pr-12" value={i} placeholder="🔍 搜尋：停車、阿基、255…（所有月份）" aria-label="搜尋記帳" onChange={r => setI(r.target.value)} />{i && <button type="button" aria-label="清除搜尋" className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full text-xl text-muted active:bg-sunk" onClick={() => {
        setI("");
        c({
          s: ""
        });
      }}>×</button>}</div>{!s && <div className="mb-3 flex items-center justify-between"><button className="h-11 w-11 rounded-full text-2xl active:bg-sunk" aria-label="上個月" onClick={() => c({
        m: addMonths(a, -1)
      })}>‹</button><span className="text-lg font-bold">{monthLabel(a)}</span><button className="h-11 w-11 rounded-full text-2xl active:bg-sunk" aria-label="下個月" onClick={() => c({
        m: addMonths(a, 1)
      })}>›</button></div>}<Segmented className="mb-3" value={n} onChange={r => c({
      type: r,
      cat: ""
    })} options={[{
      value: "all",
      label: "全部"
    }, ...Object.keys(ql).map(r => ({
      value: r,
      label: ql[r]
    }))]} />{(n === "income" || n === "expense") && <div className="mb-3"><select className="field" value={l} onChange={r => c({
        cat: r.target.value
      })}><option value="">全部分類</option>{t.categories.filter(r => r.kind === n && r.tier !== 3).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>}<QueryView q={b} loadingText={s ? "搜尋中…" : "載入記帳資料中…"} empty={r => {
      if (r.length === 0) {
        return <Empty text={s ? `\u627E\u4E0D\u5230\u300C${s}\u300D` : "這個月沒有符合的記帳"} />;
      }
      return null;
    }}>{r => <><p className="mb-2 px-1 text-sm text-muted">{s ? `\u641C\u5C0B\u300C${s}\u300D\uFF1A` : ""}共 {r.length} 筆・收入 <Money value={m} />・支出 <Money value={d} />{s ? "" : "（不含地瓜成本，地瓜成本在報表）"}</p>{[...new Set(r.filter(y => !y.fee_parent_id || n !== "all").map(y => y.txn_date))].map(y => {
          let h = r.filter(u => u.txn_date === y && (!u.fee_parent_id || n !== "all"));
          let v = h.filter(u => u.type === "income").reduce((acc, item) => acc + Number(item.amount), 0);
          let _ = h.filter(u => u.type === "expense" || u.type === "payment").reduce((acc, item) => acc + Number(item.amount), 0);
          return <div key={y} className="mb-3"><div className="tnum mb-1 flex items-baseline justify-between px-1 text-sm"><b>{s ? `${y.slice(0, 4)}/` : ""}{shortDate(y)}（{WEEKDAYS[weekday(y)]}）</b><span className="text-muted">{h.length} 筆{v > 0 && <>・收入 <span className="text-leaf">+{money(v)}</span></>}{_ > 0 && <>・支出 <span className="text-skin">−{money(_)}</span></>}</span></div><TxnList txns={h} showDate={false} /></div>;
        })}</>}</QueryView></Page>;
}
