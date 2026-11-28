import * as React from "react";
import {
  Badge,
  Btn,
  Card,
  Empty,
  ErrorBox,
  Field,
  List,
  Loading,
  Money,
  MoneyInput,
  Page,
  QueryView,
  Row,
  Section,
  Segmented,
  Sheet,
  Toggle,
  parseMoney,
  useFeedback,
  useRemove,
  useSaver,
} from "../components/ui.jsx";
import { addMonths, money, monthEnd, monthLabel, monthStart, num, shortDate, today_ } from "../lib/format.js";
import { ADJ_REASON_LABELS } from "../lib/models.js";
import { goBack, navigate } from "../lib/router.js";
import { useQuery, useStore } from "../lib/store.jsx";
import { db, eq, gte, inList, isNull, lte } from "../lib/supabase.js";
import { AccountSelect } from "./Entry.jsx";
import { StockLedger } from "./StockLedger.jsx";

const PURCHASE_TABS = [
  {
    value: "orders",
    label: "進貨單",
  },
  {
    value: "suppliers",
    label: "供應商帳款",
  },
  {
    value: "stock",
    label: "庫存",
  },
];

export function Purchases({ route }) {
  let t = route.parts[1];
  if (t === "new") {
    return <PurchaseEdit id={null} />;
  }
  if (t === "swap") {
    return <SwapForm />;
  }
  if (t === "order" && route.parts[2]) {
    return <PurchaseEdit id={route.parts[2]} />;
  }
  if (t === "supplier" && route.parts[2]) {
    return <SupplierDetail id={route.parts[2]} />;
  }
  let a = t === "suppliers" ? "suppliers" : t === "stock" ? "stock" : "orders";
  return (
    <Page
      title="進貨"
      actions={
        <div className="flex gap-2">
          <Btn href="#/purchases/swap">🔁 調換</Btn>
          <Btn kind="primary" href="#/purchases/new">＋進貨</Btn>
        </div>
      }
    >
      <Segmented
        className="mb-4"
        value={a}
        options={PURCHASE_TABS}
        onChange={(n) => navigate(n === "orders" ? "/purchases" : `/purchases/${n}`)}
      />
      {a === "orders" && (
        <a
          href="#/portion-cost"
          className="mb-4 flex min-h-12 items-center gap-3 rounded-2xl bg-flesh-soft px-4 font-bold text-flesh-ink active:opacity-80"
        >
          <span aria-hidden>🧮</span>
          <span className="flex-1">每份成本試算（漲價影響多少）</span>
          <span aria-hidden>›</span>
        </a>
      )}
      {a === "orders" && <P1Component month={route.query.get("m") || monthStart(today_())} />}
      {a === "suppliers" && <SupplierBalances />}
      {a === "stock" && <A2Component />}
    </Page>
  );
}

function P1Component({ month }) {
  let t = useStore();
  let a = useQuery(async () => {
    let n = await db.select("purchase_orders", {
      where: [isNull("deleted_at"), gte("order_date", month), lte("order_date", monthEnd(month))],
      order: "order_date.desc,created_at.desc",
    });
    let l = n.map((o) => o.id);
    let [s, i] = l.length
      ? await Promise.all([
          db.select("purchase_lines", {
            where: [isNull("deleted_at"), inList("purchase_order_id", l)],
          }),
          db.select("v_purchase_order_status", {
            where: [inList("purchase_order_id", l)],
          }),
        ])
      : [[], []];
    return {
      orders: n,
      lines: s,
      status: i,
    };
  }, [month]);
  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <button
          className="h-11 w-11 rounded-full text-2xl active:bg-sunk"
          aria-label="上個月"
          onClick={() => navigate(`/purchases?m=${addMonths(month, -1)}`)}
        >
          ‹
        </button>
        <span className="text-lg font-bold">{monthLabel(month)}</span>
        <button
          className="h-11 w-11 rounded-full text-2xl active:bg-sunk"
          aria-label="下個月"
          onClick={() => navigate(`/purchases?m=${addMonths(month, 1)}`)}
        >
          ›
        </button>
      </div>
      <QueryView
        q={a}
        loadingText="載入進貨資料中…"
        empty={(n) => {
          if (n.orders.length === 0) {
            return <Empty text="這個月沒有進貨" action=<Btn href="#/purchases/new">＋新增進貨</Btn> />;
          }
          return null;
        }}
      >
        {(n) => {
          let l = n.status.reduce((acc, item) => acc + Number(item.total), 0);
          return (
            <>
              <p className="mb-2 px-1 text-sm text-muted">
                共 {n.orders.length} 張・合計 {money(l)}
              </p>
              <List>
                {n.orders.map((s) => {
                  let i = n.lines.filter((c) => c.purchase_order_id === s.id);
                  let o = n.status.find((c) => c.purchase_order_id === s.id);
                  return (
                    <Row
                      key={s.id}
                      onClick={() => navigate(`/purchases/order/${s.id}`)}
                      label=<span className="flex items-center gap-2">
                        <span className="tnum text-muted">{shortDate(s.order_date)}</span>{" "}
                        {t.supplier(s.supplier_id)?.name}
                        {o && o.status !== "paid" && (
                          <Badge tone={o.status === "unpaid" ? "warn" : "flesh"}>
                            {o.status === "unpaid" ? "未付" : "部分付"}
                          </Badge>
                        )}
                      </span>
                      sub={i
                        .map(
                          (c) =>
                            `${t.item(c.item_id)?.short_name ?? t.item(c.item_id)?.name} ${num(c.quantity)}\xD7${money(
                              c.unit_price
                            )}`
                        )
                        .join("、")}
                      value=<Money value={Number(o?.total ?? 0)} className="font-bold" />
                    />
                  );
                })}
              </List>
            </>
          );
        }}
      </QueryView>
    </>
  );
}

function PurchaseEdit({ id }) {
  let t = useQuery(async () => {
    if (!id) {
      return null;
    }
    let [a] = await db.select("purchase_orders", {
      where: [eq("id", id)],
    });
    let n = await db.select("purchase_lines", {
      where: [eq("purchase_order_id", id), isNull("deleted_at")],
      order: "created_at",
    });
    if (a) {
      return {
        o: a,
        lines: n,
      };
    }
    return null;
  }, [id]);
  if (id && t.loading) {
    return (
      <Page title="進貨單" backTo="/purchases">
        <Loading />
      </Page>
    );
  }
  if (t.error) {
    return (
      <Page title="進貨單" backTo="/purchases">
        <ErrorBox text={t.error} onRetry={t.reload} />
      </Page>
    );
  }
  return <PurchaseForm existing={t.data ?? null} />;
}

function PurchaseForm({ existing }) {
  let t = useStore();
  let { saving, run } = useSaver();
  let { confirm } = useFeedback();
  let s = t.items.filter((U) => U.is_active || existing?.lines.some((W) => W.item_id === U.id));
  let i = (itemId = s[0]?.id ?? "") => ({
    itemId,
    quantity: "",
    unitPrice: String(Number(t.item(itemId)?.default_price ?? 0)),
    note: "",
  });
  let [o, setO] = React.useState(existing?.o.order_date ?? today_());
  let [b, setB] = React.useState(existing?.o.supplier_id ?? t.suppliers[0]?.id ?? "");
  let [d, setD] = React.useState(!!existing?.o.paid_account_id);
  let [y, setY] = React.useState(existing?.o.paid_account_id ?? t.acctByCode("POST")?.id ?? t.cashAccountId ?? "");
  let [v, setV] = React.useState(existing?.o.paid_fee ? String(Number(existing.o.paid_fee)) : "");
  let [u, setU] = React.useState(existing?.o.note ?? "");
  let [g, setG] = React.useState(
    existing
      ? existing.lines.map((U) => ({
          itemId: U.item_id,
          quantity: String(Number(U.quantity)),
          unitPrice: String(Number(U.unit_price)),
          note: U.note ?? "",
        }))
      : s.filter((U) => U.track_inventory).map((U) => i(U.id))
  );
  let [k, setK] = React.useState(null);
  let T = (U, W) =>
    setG((K) =>
      K.map((L, V) => {
        if (V === U) {
          return {
            ...L,
            ...W,
          };
        }
        return L;
      })
    );
  let j = (U) => Math.round((Number(U.quantity) || 0) * (parseMoney(U.unitPrice)?.amount ?? 0) * 100) / 100;
  let $ = g.reduce((acc, item) => acc + j(item), 0);
  async function G() {
    let U = g.filter((V) => Number(V.quantity));
    if (!o || !b) {
      setK("請選擇日期和供應商。");
      return;
    }
    if (U.length === 0) {
      setK("至少要填一個品項的數量。");
      return;
    }
    if (U.some((V) => !V.itemId || parseMoney(V.unitPrice) === null || (parseMoney(V.unitPrice)?.amount ?? 0) < 0)) {
      setK("單價看不懂或是負數，請檢查。");
      return;
    }
    let paid_fee = d && v.trim() ? parseMoney(v)?.amount ?? null : 0;
    if (paid_fee === null || paid_fee < 0) {
      setK("手續費看不懂，請檢查。");
      return;
    }
    setK(null);
    let K = {
      id: existing?.o.id ?? null,
      order_date: o,
      supplier_id: b,
      paid_account_id: d ? y : null,
      paid_fee,
      note: u || null,
      lines: U.map((V) => ({
        item_id: V.itemId,
        quantity: Number(V.quantity),
        unit_price: parseMoney(V.unitPrice).amount,
        note: V.note || null,
      })),
    };
    if (
      await run(() =>
        db.rpc("save_purchase", {
          p: K,
        })
      )
    ) {
      goBack("/purchases");
    }
  }
  async function ie() {
    if (!existing || !(await confirm("確定要刪除這張進貨單嗎？"))) {
      return;
    }
    if (await run(() => db.softDelete("purchase_orders", existing.o.id), "已刪除")) {
      goBack("/purchases");
    }
  }
  return (
    <Page title={existing ? "編輯進貨單" : "新增進貨"} backTo="/purchases">
      {!existing && (
        <a href="#/purchases/swap" className="mb-3 flex min-h-12 items-center gap-3 rounded-2xl bg-sunk px-4 font-bold active:opacity-80">
          <span aria-hidden>🔁</span><span className="flex-1">跟阿基調換大中小包？用「大小調換」</span><span aria-hidden>›</span>
        </a>
      )}
      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="日期">
            <input type="date" className="field" value={o} onChange={(U) => setO(U.target.value)} />
          </Field>
          <Field label="供應商">
            <select className="field" value={b} onChange={(U) => setB(U.target.value)}>
              {t.suppliers
                .filter((U) => U.is_active || U.id === b)
                .map((U) => (
                  <option key={U.id} value={U.id}>
                    {U.name}
                  </option>
                ))}
            </select>
          </Field>
        </div>
      </Card>
      <Section title="品項" aside=<span className="text-sm text-muted">數量可填負數＝調出／借出</span>>
        <Card>
          {g.map((U, W) => (
            <div key={W} className="mb-3 border-b border-line pb-3 last:mb-0 last:border-b-0 last:pb-0">
              <div className="mb-2 flex gap-2">
                <select
                  className="field flex-1"
                  aria-label="品項"
                  value={U.itemId}
                  onChange={(K) => {
                    let value = K.target.value;
                    T(W, {
                      itemId: value,
                      unitPrice: String(Number(t.item(value)?.default_price ?? 0)),
                    });
                  }}
                >
                  {s.map((K) => (
                    <option key={K.id} value={K.id}>
                      {K.name}
                    </option>
                  ))}
                </select>
                <button
                  className="h-12 w-12 shrink-0 rounded-xl text-xl text-muted active:bg-sunk"
                  aria-label="移除這個品項"
                  onClick={() => setG((K) => K.filter((L, V) => V !== W))}
                >
                  ×
                </button>
              </div>
              <div className="grid grid-cols-[1fr_1.3fr_1fr] items-center gap-2">
                <input
                  className="field tnum text-center text-lg font-bold"
                  inputMode="decimal"
                  aria-label="數量"
                  placeholder="數量"
                  value={U.quantity}
                  onChange={(K) =>
                    T(W, {
                      quantity: K.target.value,
                    })
                  }
                />
                <MoneyInput
                  compact
                  value={U.unitPrice}
                  onChange={(unitPrice) =>
                    T(W, {
                      unitPrice,
                    })
                  }
                />
                <span className="tnum text-right font-bold">
                  <Money value={j(U)} />
                </span>
              </div>
              <input
                className="field mt-2 min-h-10 text-sm"
                placeholder="備註（例如：補 1 包、自己洗）"
                value={U.note}
                onChange={(K) =>
                  T(W, {
                    note: K.target.value,
                  })
                }
              />
            </div>
          ))}
          <Btn kind="ghost" onClick={() => setG((U) => [...U, i()])}>
            ＋加一個品項
          </Btn>
        </Card>
      </Section>
      <Card className="mb-4">
        <div className="mb-4 flex items-baseline justify-between">
          <span className="font-bold">總額（自動計算）</span>
          <span className="tnum text-3xl font-bold">{money($)}</span>
        </div>
        <Toggle
          checked={d}
          onChange={setD}
          label="已經付清"
          hint={d ? "會自動記一筆付款" : "會記在供應商帳款，之後再付"}
        />
        {d && (
          <Field label="從哪個帳戶付">
            <AccountSelect value={y} onChange={setY} />
          </Field>
        )}
        {d && (
          <Field label="手續費（選填）" hint="例如郵局轉帳 12 元；會從同一個帳戶另外扣一筆手續費（不算進生意支出）">
            <MoneyInput compact value={v} placeholder="0" onChange={setV} />
          </Field>
        )}
        <Field label="備註（選填）" className="mb-0">
          <input className="field" value={u} onChange={(U) => setU(U.target.value)} />
        </Field>
      </Card>
      {k && (
        <p role="alert" className="mb-3 font-bold text-warn">
          {k}
        </p>
      )}
      <div className="flex gap-3">
        {existing && (
          <Btn kind="danger" big onClick={ie}>
            刪除
          </Btn>
        )}
        <Btn kind="primary" big className="flex-1" onClick={G} disabled={saving}>
          {saving ? "儲存中…" : "儲存進貨"}
        </Btn>
      </div>
    </Page>
  );
}

// 跟供應商（例如阿基）調換大中小：給出去幾包、換回來幾包
//   存成一張進貨單：換出 = 負數、換進 = 正數，同一個單價 → 包數一樣時金額 0，不用付錢
//   包數不一樣時，差額會記在供應商帳款（多拿 = 欠對方，少拿 = 對方欠你）
export const SWAP_NOTE = "大小調換";
function SwapForm() {
  let t = useStore();
  let { saving, run } = useSaver();
  const items = t.items.filter((x) => x.is_active && x.track_inventory);
  const akee = t.suppliers.find((x) => x.is_active && x.name.includes("阿基"));
  let [date, setDate] = React.useState(today_());
  let [sup, setSup] = React.useState(akee?.id ?? t.suppliers.find((x) => x.is_active)?.id ?? "");
  const newPair = () => ({ outItem: items[0]?.id ?? "", outQty: "", inItem: items[1]?.id ?? items[0]?.id ?? "", inQty: "" });
  let [pairs, setPairs] = React.useState([newPair()]);
  let [price, setPrice] = React.useState("");
  let [note, setNote] = React.useState("");
  let [err, setErr] = React.useState(null);
  const setPair = (i, patch) => setPairs((ps) => ps.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  // 單價預設：換出去那種最近一次的進貨價
  React.useEffect(() => {
    const id = pairs[0]?.outItem;
    if (!id || price !== "") return;
    db.rpc("last_purchase_price", { p_item: id }).then((v) => { if (Number(v) > 0) setPrice((p) => (p === "" ? String(Number(v)) : p)); }).catch(() => {});
  }, [pairs[0]?.outItem]);
  const short = (id) => t.item(id)?.short_name ?? t.item(id)?.name ?? "";
  const unit = parseMoney(price)?.amount ?? 0;
  const outTotal = pairs.reduce((a, x) => a + (Number(x.outQty) || 0), 0);
  const inTotal = pairs.reduce((a, x) => a + (Number(x.inQty) || 0), 0);
  const diff = Math.round((inTotal - outTotal) * unit);
  const supName = t.supplier(sup)?.name ?? "對方";
  async function save() {
    const ok = pairs.filter((x) => Number(x.outQty) > 0 || Number(x.inQty) > 0);
    if (!date || !sup) return setErr("請選擇日期和供應商。");
    if (ok.length === 0) return setErr("請填換出去和換回來的包數。");
    if (ok.some((x) => Number(x.outQty) < 0 || Number(x.inQty) < 0)) return setErr("包數不要填負數。");
    if (ok.some((x) => Number(x.outQty) > 0 && Number(x.inQty) > 0 && x.outItem === x.inItem)) return setErr("換出去和換回來是同一種，請檢查。");
    if (parseMoney(price) === null || unit < 0) return setErr("每包價格看不懂，請檢查。");
    setErr(null);
    const lines = ok.flatMap((x) => [
      ...(Number(x.outQty) > 0 ? [{ item_id: x.outItem, quantity: -Number(x.outQty), unit_price: unit, note: `換給${supName}` }] : []),
      ...(Number(x.inQty) > 0 ? [{ item_id: x.inItem, quantity: Number(x.inQty), unit_price: unit, note: `從${supName}換回來` }] : []),
    ]);
    const desc = ok.map((x) => `${short(x.outItem)} ${x.outQty || 0} 包 → ${short(x.inItem)} ${x.inQty || 0} 包`).join("、");
    const p = { id: null, order_date: date, supplier_id: sup, paid_account_id: null, paid_fee: 0, note: [`${SWAP_NOTE}：${desc}`, note.trim()].filter(Boolean).join("；"), lines };
    if (await run(() => db.rpc("save_purchase", { p }), "已記錄大小調換")) goBack("/purchases");
  }
  const sel = (value, onChange, label) => (
    <select className="field min-w-0" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      {items.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
    </select>
  );
  const qty = (value, onChange, label) => (
    <input className="field tnum min-w-0 text-center text-lg font-bold" inputMode="decimal" aria-label={label} placeholder="包數" value={value} onChange={(e) => onChange(e.target.value)} />
  );
  return (
    <Page title="大小調換" backTo="/purchases">
      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="日期"><input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="跟誰換">
            <select className="field" value={sup} onChange={(e) => setSup(e.target.value)}>
              {t.suppliers.filter((x) => x.is_active || x.id === sup).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </Field>
        </div>
      </Card>
      <Section title="怎麼換">
        <Card>
          {pairs.map((x, i) => (
            <div key={i} className="mb-3 border-b border-line pb-3 last:mb-0 last:border-b-0 last:pb-0">
              <div className="mb-1 text-sm font-bold text-skin">換出去（倉庫少）</div>
              <div className="mb-3 grid grid-cols-[1fr_6rem] gap-2">{sel(x.outItem, (v) => setPair(i, { outItem: v }), "換出去的品項")}{qty(x.outQty, (v) => setPair(i, { outQty: v }), "換出去幾包")}</div>
              <div className="mb-1 text-sm font-bold text-leaf">換回來（倉庫多）</div>
              <div className="grid grid-cols-[1fr_6rem] gap-2">{sel(x.inItem, (v) => setPair(i, { inItem: v }), "換回來的品項")}{qty(x.inQty, (v) => setPair(i, { inQty: v }), "換回來幾包")}</div>
              {pairs.length > 1 && <button className="mt-2 text-sm font-bold text-muted" onClick={() => setPairs((ps) => ps.filter((_, k) => k !== i))}>移除這組</button>}
            </div>
          ))}
          <Btn kind="ghost" onClick={() => setPairs((ps) => [...ps, newPair()])}>＋再換一組</Btn>
        </Card>
      </Section>
      <Card className="mb-4">
        <Field label="每包算多少錢" hint="預設是換出去那種最近一次的進貨價；兩邊用同一個價格">
          <MoneyInput compact value={price} onChange={setPrice} />
        </Field>
        <div className="rounded-xl bg-sunk p-3">
          <div className="tnum">給{supName} <b>{num(outTotal)}</b> 包、換回 <b>{num(inTotal)}</b> 包</div>
          <div className={diff === 0 ? "font-bold text-leaf" : "font-bold text-warn"}>
            {diff === 0 ? "包數一樣，不用付錢" : diff > 0 ? `多拿 ${num(inTotal - outTotal)} 包 → 欠${supName} ${money(diff)}（記在供應商帳款）` : `少拿 ${num(outTotal - inTotal)} 包 → ${supName}欠你 ${money(-diff)}（記在供應商帳款）`}
          </div>
        </div>
        <Field label="備註（選填）" className="mb-0 mt-3"><input className="field" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </Card>
      {err && <p role="alert" className="mb-3 font-bold text-warn">{err}</p>}
      <Btn kind="primary" big className="w-full" onClick={save} disabled={saving}>{saving ? "儲存中…" : "儲存調換"}</Btn>
    </Page>
  );
}

function SupplierBalances() {
  let e = useQuery(
    () =>
      db.select("v_supplier_balances", {
        order: "name",
      }),
    []
  );
  return (
    <QueryView
      q={e}
      loadingText="載入供應商帳款中…"
      empty={(t) => {
        if (t.length === 0) {
          return <Empty text="還沒有供應商" />;
        }
        return null;
      }}
    >
      {(t) => (
        <>
          <List className="mb-4">
            {t.map((a) => {
              let n = Number(a.purchased) - Number(a.paid);
              return (
                <Row
                  key={a.supplier_id}
                  label={a.name}
                  sub={`\u9032\u8CA8 ${money(a.purchased)}\u30FB\u5DF2\u4ED8 ${money(a.paid)}`}
                  value={
                    n > 0.5 ? (
                      <span className="font-bold text-warn">欠 {money(n)}</span>
                    ) : n < -0.5 ? (
                      <span className="text-leaf">預付 {money(-n)}</span>
                    ) : (
                      <Badge tone="leaf">已結清</Badge>
                    )
                  }
                  onClick={() => navigate(`/purchases/supplier/${a.supplier_id}`)}
                />
              );
            })}
          </List>
          <p className="px-1 text-sm text-muted">
            點供應商可以看逐筆明細（每張進貨單、每筆付款）。付款：首頁「＋支出」→ 上方選「付款」→ 付供應商。
          </p>
        </>
      )}
    </QueryView>
  );
}

function A2Component() {
  let e = useStore();
  let { run } = useSaver();
  let a = useRemove();
  let [n, setN] = React.useState(null);
  let [s, setS] = React.useState(null);
  let o = useQuery(async () => {
    let [h, adj] = await Promise.all([
      db.select("v_inventory", {
        order: "sort_order",
      }),
      db.select("inventory_adjustments", {
        where: [isNull("deleted_at")],
        order: "adj_date.desc,created_at.desc",
        limit: 30,
      }),
    ]);
    return {
      inv: h,
      adj,
    };
  }, []);
  let c = String(e.settings.inventory_start_date ?? "");
  let [b, setB] = React.useState({
    date: today_(),
    values: {},
    itemId: "",
    qty: "",
    reason: "waste",
    note: "",
  });
  async function d() {
    let v = (o.data?.inv ?? []).filter((p) => b.values[p.item_id] !== undefined && b.values[p.item_id] !== "");
    let _ = await Promise.all(
      v.map((p) =>
        db
          .rpc("last_purchase_price", {
            p_item: p.item_id,
          })
          .catch(() => Number(e.item(p.item_id)?.default_price ?? 0))
      )
    );
    let u = v
      .map((p, g) => ({
        adj_date: b.date,
        item_id: p.item_id,
        quantity: Math.round((Number(b.values[p.item_id]) - Number(p.on_hand)) * 100) / 100,
        reason: "count",
        note: "盤點",
        unit_cost: Number(_[g]) || 0,
      }))
      .filter((p) => p.quantity !== 0);
    if (u.length === 0) {
      setN(null);
      return;
    }
    if (await run(() => db.insert("inventory_adjustments", u), "已更新庫存")) {
      setN(null);
      o.reload();
    }
  }
  async function r() {
    let h = Number(b.qty);
    if (!b.itemId || !h) {
      return;
    }
    let quantity = s && b.reason === "count" ? h : b.reason === "bonus" ? Math.abs(h) : -Math.abs(h);
    let _ = {
      adj_date: b.date,
      item_id: b.itemId,
      quantity,
      reason: b.reason,
      note: b.note || null,
    };
    if (
      await run(() => {
        if (s) {
          return db.update("inventory_adjustments", _, [eq("id", s.id)]);
        }
        return db.insert("inventory_adjustments", _);
      })
    ) {
      setN(null);
      setS(null);
      o.reload();
    }
  }
  function y(h) {
    setS(h);
    setB({
      ...b,
      date: h.adj_date,
      itemId: h.item_id,
      qty: String(h.reason === "count" ? Number(h.quantity) : Math.abs(Number(h.quantity))),
      reason: h.reason,
      note: h.note ?? "",
    });
    setN("adjust");
  }
  return (
    <>
      <QueryView q={o} loadingText="載入庫存中…">
        {(h) => (
          <>
            <div className="mb-3 grid grid-cols-3 gap-2">
              {h.inv.map((v) => (
                <Card key={v.item_id} className="text-center">
                  <div className="font-bold">{v.short_name ?? v.name}</div>
                  <div className={`tnum text-3xl font-bold ${Number(v.on_hand) < 1 ? "text-warn" : ""}`}>
                    {num(v.on_hand)}
                  </div>
                  <div className="text-sm text-muted">{v.unit}</div>
                </Card>
              ))}
            </div>
            <p className="mb-4 px-1 text-sm text-muted">
              庫存 = {c ? `${c} \u8D77\u7684` : ""}進貨 − 每日實際烤 − 調出 ± 調整。地瓜成本依先進先出計算。
            </p>
            <div className="mb-6 flex gap-2">
              <Btn
                kind="primary"
                className="flex-1"
                onClick={() => {
                  setB({
                    ...b,
                    values: {},
                  });
                  setN("count");
                }}
              >
                盤點
              </Btn>
              <Btn
                className="flex-1"
                onClick={() => {
                  setS(null);
                  setB({
                    ...b,
                    itemId: h.inv[0]?.item_id ?? "",
                    qty: "",
                    reason: "waste",
                    note: "",
                  });
                  setN("adjust");
                }}
              >
                報廢／其他調整
              </Btn>
            </div>
            <StockLedger start={c} />
            <Section title="最近的調整">
              {h.adj.length === 0 ? (
                <Empty text="還沒有庫存調整" />
              ) : (
                <List>
                  {h.adj.map((v) => (
                    <Row
                      key={v.id}
                      onClick={() => y(v)}
                      label={`${shortDate(v.adj_date)}\u3000${e.item(v.item_id)?.name}`}
                      sub={`${ADJ_REASON_LABELS[v.reason]}${v.note ? `\u30FB${v.note}` : ""}`}
                      value=<span className={`tnum font-bold ${v.quantity < 0 ? "text-skin" : "text-leaf"}`}>
                        {v.quantity > 0 ? "+" : ""}
                        {num(v.quantity)}
                      </span>
                    />
                  ))}
                </List>
              )}
            </Section>
          </>
        )}
      </QueryView>
      <Sheet open={n === "count"} onClose={() => setN(null)} title="盤點：倉庫實際剩幾包">
        <Field label="日期">
          <input
            type="date"
            className="field"
            value={b.date}
            onChange={(h) =>
              setB({
                ...b,
                date: h.target.value,
              })
            }
          />
        </Field>
        {(o.data?.inv ?? []).map((h) => (
          <Field key={h.item_id} label={`${h.name}\uFF08\u7CFB\u7D71\uFF1A${num(h.on_hand)}\uFF09`}>
            <input
              className="field tnum text-lg"
              inputMode="decimal"
              placeholder="實際包數"
              value={b.values[h.item_id] ?? ""}
              onChange={(v) =>
                setB({
                  ...b,
                  values: {
                    ...b.values,
                    [h.item_id]: v.target.value,
                  },
                })
              }
            />
          </Field>
        ))}
        <Btn kind="primary" big className="w-full" onClick={d}>
          儲存盤點
        </Btn>
      </Sheet>
      <Sheet
        open={n === "adjust"}
        onClose={() => {
          setN(null);
          setS(null);
        }}
        title={s ? "修改庫存調整" : "庫存調整"}
      >
        <Field label="原因">
          <select
            className="field"
            value={b.reason}
            onChange={(h) =>
              setB({
                ...b,
                reason: h.target.value,
              })
            }
          >
            {(s?.reason === "count"
              ? ["count", "waste", "family", "bonus", "other"]
              : ["waste", "family", "bonus", "other"]
            ).map((h) => (
              <option key={h} value={h}>
                {ADJ_REASON_LABELS[h]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="品項">
          <select
            className="field"
            value={b.itemId}
            onChange={(h) =>
              setB({
                ...b,
                itemId: h.target.value,
              })
            }
          >
            {(o.data?.inv ?? []).map((h) => (
              <option key={h.item_id} value={h.item_id}>
                {h.name}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="包數"
          hint={
            b.reason === "count"
              ? "盤點差額：正數 = 增加，負數 = 減少"
              : b.reason === "bonus"
              ? "會增加庫存（成本 $0）"
              : "會減少庫存；報廢會算進地瓜成本"
          }
        >
          <input
            className="field tnum text-lg"
            inputMode="decimal"
            value={b.qty}
            onChange={(h) =>
              setB({
                ...b,
                qty: h.target.value,
              })
            }
          />
        </Field>
        <Field label="日期">
          <input
            type="date"
            className="field"
            value={b.date}
            onChange={(h) =>
              setB({
                ...b,
                date: h.target.value,
              })
            }
          />
        </Field>
        <Field label="備註（選填）">
          <input
            className="field"
            value={b.note}
            onChange={(h) =>
              setB({
                ...b,
                note: h.target.value,
              })
            }
          />
        </Field>
        <Btn kind="primary" big className="w-full" onClick={r}>
          儲存
        </Btn>
        {s && (
          <Btn
            kind="danger"
            className="mt-3 w-full"
            onClick={() =>
              a(
                `\u78BA\u5B9A\u8981\u522A\u9664\u9019\u7B46\u5EAB\u5B58\u8ABF\u6574\uFF08${
                  e.item(s.item_id)?.name
                } ${num(s.quantity)}\uFF09\u55CE\uFF1F`,
                () => db.softDelete("inventory_adjustments", s.id),
                () => {
                  setN(null);
                  setS(null);
                  o.reload();
                }
              )
            }
          >
            刪除這筆調整
          </Btn>
        )}
      </Sheet>
    </>
  );
}

function SupplierDetail({ id }) {
  let t = useStore();
  let a = t.supplier(id);
  let n = useQuery(async () => {
    let [l, pays] = await Promise.all([
      db.select("purchase_orders", {
        where: [isNull("deleted_at"), eq("supplier_id", id)],
        order: "order_date,created_at",
      }),
      db.select("transactions", {
        where: [isNull("deleted_at"), eq("supplier_id", id), eq("type", "payment")],
        order: "txn_date,created_at",
      }),
    ]);
    let i = l.length
      ? await db.select("purchase_lines", {
          where: [
            isNull("deleted_at"),
            inList(
              "purchase_order_id",
              l.map((o) => o.id)
            ),
          ],
        })
      : [];
    return {
      orders: l,
      pays,
      lines: i,
    };
  }, [id]);
  return (
    <Page title={`${a?.name ?? "供應商"} \u9010\u7B46\u660E\u7D30`} backTo="/purchases/suppliers">
      <QueryView q={n} loadingText="載入明細中…">
        {(l) => {
          let s = [
            ...l.orders.map((m) => {
              let d = l.lines
                .filter((y) => y.purchase_order_id === m.id)
                .sort((y, h) => (t.item(y.item_id)?.sort_order ?? 0) - (t.item(h.item_id)?.sort_order ?? 0));
              let r = d.reduce((acc, item) => acc + Number(item.amount), 0);
              return {
                date: m.order_date,
                created: m.created_at,
                kind: "order",
                amount: r,
                title: r < 0 ? "調出／抵貨款" : "進貨",
                note: m.note,
                href: `/purchases/order/${m.id}`,
                lines: d.map((y) => {
                  let h = t.item(y.item_id)?.short_name ?? t.item(y.item_id)?.name ?? "";
                  let v = Number(y.quantity);
                  return `${h} ${v < 0 ? "−" : ""}${num(Math.abs(v))} \u5305${
                    Number(y.unit_price) ? ` @${money(y.unit_price)}` : "（免費補）"
                  }${y.note ? `\u30FB${y.note}` : ""}`;
                }),
              };
            }),
            ...l.pays.map((m) => ({
              date: m.txn_date,
              created: m.created_at,
              kind: "pay",
              amount: -Number(m.amount),
              title: `\u4ED8\u6B3E${m.account_id ? `\uFF08${t.acct(m.account_id)?.name ?? ""}\uFF09` : "（抵扣）"}`,
              lines: [],
              note: m.description || m.note,
              href: `/entry/${m.id}`,
            })),
          ].sort((m, d) => m.date.localeCompare(d.date) || m.created.localeCompare(d.created));
          let bal = 0;
          let o = s.map((m) => {
            bal = Math.round((bal + m.amount) * 100) / 100;
            return {
              ...m,
              bal,
            };
          });
          let c = s.filter((m) => m.kind === "order").reduce((acc, item) => acc + item.amount, 0);
          let b = -s.filter((m) => m.kind === "pay").reduce((acc, item) => acc + item.amount, 0);
          return (
            <>
              <Card className="mb-4">
                <div className="tnum grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-sm text-muted">進貨</div>
                    <b>{money(c)}</b>
                  </div>
                  <div>
                    <div className="text-sm text-muted">已付</div>
                    <b>{money(b)}</b>
                  </div>
                  <div>
                    <div className="text-sm text-muted">還欠</div>
                    <b className={bal > 0.5 ? "text-warn" : "text-leaf"}>{money(bal)}</b>
                  </div>
                </div>
                {bal > 0.5 && (
                  <Btn kind="primary" className="mt-3 w-full" href="#/entry?type=payment&kind=supplier">
                    付款給{a?.name}
                  </Btn>
                )}
              </Card>
              {o.length === 0 ? (
                <Empty text="還沒有進貨或付款" />
              ) : (
                <div className="overflow-hidden rounded-2xl bg-card">
                  {[...o].reverse().map((m, d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => m.href && navigate(m.href)}
                      className={`tnum block w-full border-b border-line px-4 py-3 text-left last:border-b-0 active:bg-sunk ${
                        m.kind === "pay" ? "bg-leaf-soft/40" : ""
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span>
                          <span className="text-sm text-muted">{shortDate(m.date)}</span> <b>{m.title}</b>
                        </span>
                        <span className={`font-bold ${m.amount < 0 ? "text-leaf" : ""}`}>
                          {m.amount < 0 ? "−" : "+"}
                          {money(Math.abs(m.amount))}
                        </span>
                      </div>
                      {m.lines.map((r, y) => (
                        <div key={y} className="text-sm text-muted">
                          {r}
                        </div>
                      ))}
                      {m.note && <div className="text-sm text-muted">{m.note}</div>}
                      <div className={`mt-0.5 text-right text-sm ${m.bal > 0.5 ? "text-warn" : "text-muted"}`}>
                        累計欠 {money(m.bal)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-2 px-1 text-sm text-muted">
                最新的在最上面。+ 是進貨（欠款增加），− 是付款或調出抵貨款（欠款減少）。點任何一筆可以打開修改。
              </p>
            </>
          );
        }}
      </QueryView>
    </Page>
  );
}
