import * as React from "react";
import {
  Btn,
  Card,
  Empty,
  MoneyInput,
  Page,
  QueryView,
  cx,
  parseMoney,
  useFeedback,
  useSaver,
} from "../components/ui.jsx";
import { WEEKDAYS, money, shortDate, today_, weekday } from "../lib/format.js";
import { navigate } from "../lib/router.js";
import { useQuery, useStore } from "../lib/store.jsx";
import { db, eq, gte, isNull, lte } from "../lib/supabase.js";

const RECONCILED_TAG = "[已對帳]";

const isReconciled = (e) => (e.note ?? "").includes(RECONCILED_TAG);

export function Reconcile({ route }) {
  let t = useStore();
  let { confirm } = useFeedback();
  let { saving, run } = useSaver();
  let s = route.query.get("cat") || "PARKING";
  let i = route.query.get("y") || today_().slice(0, 4);
  let o = t.categories.find((T) => T.code === s) ?? t.categories.find((T) => T.id === s);
  let c = (T) =>
    navigate(
      `/reconcile?${new URLSearchParams({
        cat: s,
        y: i,
        ...T,
      })}`
    );
  let b = useQuery(async () => {
    if (o) {
      return db.select("transactions", {
        where: [
          isNull("deleted_at"),
          eq("category_id", o.id),
          gte("txn_date", `${i}-01-01`),
          lte("txn_date", `${i}-12-31`),
        ],
        order: "txn_date.asc,created_at.asc",
        limit: 2000,
      });
    }
    return [];
  }, [o?.id, i]);
  let [m, setM] = React.useState({});
  let [r, setR] = React.useState({});
  let [h, setH] = React.useState(false);
  let _ = (T) => m[T.id] ?? isReconciled(T);
  let u = (T) => {
    let j = (r[T.id] ?? "").trim();
    let $ = j ? parseMoney(j) : null;
    if ($ && $.amount > 0) {
      return $.amount;
    }
    return null;
  };
  let p = React.useMemo(
    () =>
      (b.data ?? []).filter(
        (T) => (m[T.id] !== undefined && m[T.id] !== isReconciled(T)) || (u(T) !== null && u(T) !== Number(T.amount))
      ),
    [b.data, m, r]
  );
  let g = (T) => {
    if (T.is_advance) {
      return `${t.payer(T.payer_id)?.name ?? ""} \u4EE3\u588A${
        T.description && ["悠遊卡", "信用卡"].includes(T.description) ? `\uFF08${T.description}\uFF09` : ""
      }`;
    }
    if (T.account_id) {
      return t.acct(T.account_id)?.name ?? "";
    }
    return "不動帳戶";
  };
  let f = (T) => t.market(T.market_id)?.name ?? "";
  async function k() {
    let T = p.filter(($) => u($) !== null && u($) !== Number($.amount));
    if (
      T.length &&
      !(await confirm(
        `\u8981\u4FEE\u6539 ${T.length} \u7B46\u91D1\u984D\uFF1A
${T.map(($) => `${shortDate($.txn_date)} ${money($.amount)} \u2192 ${money(u($))}`).join(`
`)}

\u5F9E\u54EA\u500B\u5E33\u6236\u4ED8\u7684\uFF08\u91D1\u5EAB\uFF0F\u4EE3\u588A\uFF09\u6703\u8DDF\u8457\u65B0\u91D1\u984D\u81EA\u52D5\u8ABF\u6574\u3002`,
        {
          danger: false,
          okText: "確定修改",
        }
      ))
    ) {
      return;
    }
    if (
      await run(async () => {
        for (let $ of p) {
          let G = u($);
          let ie = ($.note ?? "").replace(RECONCILED_TAG, "").replace(/；$/, "").trim();
          let U = {};
          if (G !== null && G !== Number($.amount)) {
            ie = [ie, `${today_()} \u5C0D\u5E33\u4FEE\u6B63\uFF1A${money($.amount)} \u2192 ${money(G)}`]
              .filter(Boolean)
              .join("；");
            Object.assign(U, {
              amount: G,
              formula: null,
            });
          }
          if (_($)) {
            ie = [ie, RECONCILED_TAG].filter(Boolean).join("；");
          }
          await db.update(
            "transactions",
            {
              ...U,
              note: ie || null,
            },
            [eq("id", $.id)]
          );
        }
      }, "已儲存對帳結果")
    ) {
      setM({});
      setR({});
      b.reload();
    }
  }
  let M = t.categories
    .filter((T) => T.kind === "expense" && T.is_active)
    .sort((T, j) => T.tier - j.tier || T.sort_order - j.sort_order);
  return (
    <Page title="逐筆對帳" backTo="/settings">
      <div className="mb-3 grid grid-cols-[1fr_auto] gap-2">
        <select
          className="field"
          value={o?.code ?? o?.id ?? ""}
          aria-label="對帳項目"
          onChange={(T) => {
            setM({});
            setR({});
            c({
              cat: T.target.value,
            });
          }}
        >
          {M.map((T) => (
            <option key={T.id} value={T.code ?? T.id}>
              {T.name}
            </option>
          ))}
        </select>
        <select
          className="field"
          value={i}
          aria-label="年份"
          onChange={(T) =>
            c({
              y: T.target.value,
            })
          }
        >
          {[0, 1, 2]
            .map((T) => String(Number(today_().slice(0, 4)) - T))
            .map((T) => (
              <option key={T} value={T}>
                {T} 年
              </option>
            ))}
        </select>
      </div>
      <QueryView
        q={b}
        loadingText="載入中…"
        empty={(T) => {
          if (T.length === 0) {
            return <Empty text={`${i} \u5E74\u6C92\u6709\u300C${o?.name ?? ""}\u300D\u7684\u7D00\u9304`} />;
          }
          return null;
        }}
      >
        {(T) => {
          let j = T.reduce((acc, item) => acc + (u(item) ?? Number(item.amount)), 0);
          let length = T.filter(_).length;
          let G = [...new Set(T.map((ie) => ie.txn_date.slice(0, 7)))];
          return (
            <>
              <Card className="mb-3">
                <div className="tnum flex items-baseline justify-between">
                  <span className="font-bold">
                    {o?.name}・{i} 年 {T.length} 筆
                  </span>
                  <span className="text-lg font-bold">{money(j)}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-sunk">
                  <div
                    className="h-full bg-leaf"
                    style={{
                      width: `${(length / T.length) * 100}%`,
                    }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-sm text-muted">
                  <span>
                    已確認 <b className="text-leaf">{length}</b> / {T.length} 筆
                  </span>
                  <label className="flex min-h-10 items-center gap-2">
                    <input type="checkbox" className="h-5 w-5" checked={h} onChange={() => setH(!h)} />
                    只看還沒勾的
                  </label>
                </div>
                <p className="mt-1 text-sm text-muted">
                  正確就打勾；金額不對就在右邊輸入正確金額。全部看完按最下面「儲存」，一起更新。
                </p>
              </Card>
              {G.map((ie) => {
                let U = T.filter((K) => K.txn_date.startsWith(ie) && (!h || !_(K)));
                if (U.length === 0) {
                  return null;
                }
                let W = T.filter((K) => K.txn_date.startsWith(ie));
                return (
                  <div key={ie} className="mb-3">
                    <div className="tnum mb-1 flex justify-between px-1 text-sm">
                      <b>{Number(ie.slice(5, 7))} 月</b>
                      <span className="text-muted">
                        {W.length} 筆・{money(W.reduce((acc, item) => acc + (u(item) ?? Number(item.amount)), 0))}
                      </span>
                    </div>
                    <div className="overflow-hidden rounded-2xl bg-card">
                      {U.map((K) => {
                        let L = _(K);
                        let V = u(K);
                        let we = V !== null && V !== Number(K.amount);
                        return (
                          <div
                            key={K.id}
                            className={cx(
                              "flex items-center gap-2 border-b border-line px-3 py-2 last:border-b-0",
                              L && "bg-leaf-soft/60",
                              we && "bg-warn-soft"
                            )}
                          >
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={L}
                              aria-label={`${shortDate(K.txn_date)} ${money(K.amount)} \u78BA\u8A8D\u6B63\u78BA`}
                              onClick={() =>
                                setM({
                                  ...m,
                                  [K.id]: !L,
                                })
                              }
                              className={cx(
                                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 text-xl font-bold",
                                L ? "border-leaf bg-leaf text-white" : "border-line bg-card"
                              )}
                            >
                              {L ? "✓" : ""}
                            </button>
                            <div className="min-w-0 flex-1">
                              <div className="tnum font-bold">
                                {shortDate(K.txn_date)}
                                <span className="ml-1 text-sm font-normal text-muted">
                                  （{WEEKDAYS[weekday(K.txn_date)]}）
                                </span>
                                <span className={cx("ml-2", we && "text-muted line-through")}>{money(K.amount)}</span>
                              </div>
                              <div className="line-clamp-1 text-sm text-muted">
                                {[f(K), g(K)].filter(Boolean).join("・")}
                              </div>
                            </div>
                            <div className="w-28 shrink-0">
                              <MoneyInput
                                compact
                                value={r[K.id] ?? ""}
                                placeholder="修改金額"
                                onChange={(Ue) =>
                                  setR({
                                    ...r,
                                    [K.id]: Ue,
                                  })
                                }
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              <div className="sticky bottom-20 z-10 mt-4 md:bottom-4">
                <Btn kind="primary" big className="w-full shadow-lg" disabled={saving || p.length === 0} onClick={k}>
                  {saving
                    ? "儲存中…"
                    : p.length
                    ? `\u5132\u5B58\uFF08${p.length} \u7B46\u6709\u8B8A\u52D5\uFF09`
                    : "沒有變動"}
                </Btn>
              </div>
            </>
          );
        }}
      </QueryView>
    </Page>
  );
}
