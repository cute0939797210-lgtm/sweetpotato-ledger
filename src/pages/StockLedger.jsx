import * as React from "react";
import { Btn, Card, Empty, cx, useSaver } from "../components/ui.jsx";
import { addMonths, money, monthEnd, monthLabel, monthStart, num, shortDate, today_ } from "../lib/format.js";
import { ADJ_REASON_LABELS } from "../lib/models.js";
import { navigate } from "../lib/router.js";
import { useQuery, useStore } from "../lib/store.jsx";
import { db, eq, gte, inList, isNull } from "../lib/supabase.js";

const I1 = ["日", "一", "二", "三", "四", "五", "六"];

export function StockLedger({ start }) {
  let t = useStore();
  let a = t.items.filter((E) => E.track_inventory && E.is_active);
  let [n, setN] = React.useState(monthStart(today_()));
  let [s, setS] = React.useState(() => {
    try {
      return localStorage.getItem("stock_show_bal") === "1";
    } catch {
      return false;
    }
  });
  let o = () => {
    let E = !s;
    setS(E);
    try {
      localStorage.setItem("stock_show_bal", E ? "1" : "0");
    } catch {}
  };
  let [c, setC] = React.useState(null);
  let { saving, run } = useSaver();
  let r = start || "2000-01-01";
  let y = useQuery(async () => {
    let [flows, fifo, oe, ye, adjs] = await Promise.all([
      db.select("v_inventory_flows", {}),
      db.select("v_fifo_costs", {}),
      db.select("business_days", {
        where: [isNull("deleted_at"), gte("day", r)],
      }),
      db.select("purchase_orders", {
        where: [isNull("deleted_at"), gte("order_date", r)],
      }),
      db.select("inventory_adjustments", {
        where: [isNull("deleted_at"), gte("adj_date", r)],
      }),
    ]);
    let [tt, plines] = await Promise.all([
      oe.length
        ? db.select("daily_item_counts", {
            where: [
              isNull("deleted_at"),
              inList(
                "business_day_id",
                oe.map((aa) => aa.id)
              ),
            ],
          })
        : Promise.resolve([]),
      ye.length
        ? db.select("purchase_lines", {
            where: [
              isNull("deleted_at"),
              inList(
                "purchase_order_id",
                ye.map((aa) => aa.id)
              ),
            ],
          })
        : Promise.resolve([]),
    ]);
    return {
      flows,
      fifo,
      days: oe,
      orders: ye,
      adjs,
      counts: tt,
      plines,
    };
  }, [r]);
  if (!y.data) {
    return null;
  }
  let y_data = y.data;
  let v = new Map(y_data.days.map((E) => [E.id, E]));
  let _ = new Map(y_data.orders.map((E) => [E.id, E]));
  let u = new Map(y_data.plines.map((E) => [E.id, E]));
  let p = new Map(y_data.adjs.map((E) => [E.id, E]));
  let g = new Map(y_data.fifo.filter((E) => E.kind === "cooked").map((E) => [E.ref_id, E]));
  let f = a.map((E) => E.id);
  let map = new Map();
  let M = (E, ue) => {
    let oe = map.get(E);
    if (!oe) {
      oe = {
        ...ue,
        delta: {},
        cost: 0,
      };
      map.set(E, oe);
    }
    return oe;
  };
  let T = (E, item_id, oe) => {
    E.delta[item_id] = Math.round(((E.delta[item_id] ?? 0) + oe) * 100) / 100;
  };
  let map_1 = new Map();
  for (let E of y_data.flows) {
    if (!f.includes(E.item_id)) {
      continue;
    }
    let ue = t.item(E.item_id)?.short_name ?? t.item(E.item_id)?.name ?? "";
    if (E.kind === "purchase" || E.kind === "return") {
      let oe = u.get(E.ref_id);
      let ye = oe ? _.get(oe.purchase_order_id) : undefined;
      let fe = t.supplier(ye?.supplier_id)?.name ?? "";
      // 大小調換的單：換出、換進合成一行
      const swap = (ye?.note ?? "").startsWith("大小調換");
      let tt = M(
        swap ? `swap:${ye.id}` : `${E.kind}:${ye?.id ?? E.ref_id}`,
        swap
          ? {
              date: E.flow_date,
              order: 0,
              text: `\u{1F501} 大小調換・${fe}`,
              sub: ye.note.replace(/^大小調換：?/, "") || undefined,
              href: `/purchases/order/${ye.id}`,
            }
          : E.kind === "purchase"
          ? {
              date: E.flow_date,
              order: 0,
              text: `\u9032\u8CA8\u30FB${fe}`,
              sub: ye?.note ?? undefined,
              href: ye ? `/purchases/order/${ye.id}` : undefined,
              tone: "buy",
            }
          : {
              date: E.flow_date,
              order: 1,
              text: `\u8ABF\u51FA\uFF0F\u9000\u56DE\u30FB${fe}`,
              sub: oe?.note ?? undefined,
              href: ye ? `/purchases/order/${ye.id}` : undefined,
            }
      );
      T(tt, E.item_id, E.kind === "purchase" ? Number(E.qty) : -Number(E.qty));
      if (!swap) tt.cost += Number(E.qty) * Number(E.unit_cost ?? oe?.unit_price ?? 0);
    } else if (E.kind === "cooked") {
      let oe = y_data.counts.find((Oe) => Oe.id === E.ref_id);
      let ye = v.get(E.business_day_id ?? "");
      let fe = Number(oe?.cooked ?? E.qty);
      let tt = Number(oe?.remaining ?? 0);
      let it = g.get(E.ref_id);
      let aa =
        oe?.unit_price != null ? Number(oe.unit_price) : it && Number(it.qty) ? Number(it.cost) / Number(it.qty) : 0;
      let Ge = t.market(ye?.market_id)?.name ?? "";
      let z = `/daily?d=${E.flow_date}`;
      let J = E.business_day_id ?? E.flow_date;
      let ge = M(`out:${J}`, {
        date: E.flow_date,
        order: 2,
        text: `\u70E4\u6389${Ge ? `\u30FB${Ge}` : ""}`,
        href: z,
      });
      T(ge, E.item_id, -fe);
      ge.cost += fe * aa;
      if (tt > 0) {
        map_1.set(J, [...(map_1.get(J) ?? []), `${ue} ${num(tt)}`]);
      }
      if (map_1.get(J)?.length) {
        ge.sub = `\u5269 ${map_1.get(J).join("、")} \u653E\u56DE\u5009\u5EAB`;
      }
    } else if (E.kind.startsWith("adjust")) {
      let oe = p.get(E.ref_id);
      let ye = M(`adj:${E.flow_date}:${oe?.reason ?? E.kind}:${E.dir}`, {
        date: E.flow_date,
        order: E.dir > 0 ? 0 : 4,
        text: ADJ_REASON_LABELS[oe?.reason ?? ""] ?? "庫存調整",
        sub: oe?.note ?? undefined,
        tone: "adj",
      });
      T(ye, E.item_id, E.dir > 0 ? Number(E.qty) : -Number(E.qty));
      if (E.dir > 0) {
        ye.cost += Number(E.qty) * Number(E.unit_cost ?? 0);
      }
    }
  }
  let $ = [...map.values()].sort((E, ue) => E.date.localeCompare(ue.date) || E.order - ue.order);
  let G = {};
  let ie = $.map((E) => {
    for (let ue of f) {
      G[ue] = Math.round(((G[ue] ?? 0) + (E.delta[ue] ?? 0)) * 100) / 100;
    }
    return {
      ...E,
      bal: {
        ...G,
      },
    };
  });
  let U = monthEnd(n);
  let W = ie.filter((E) => E.date >= n && E.date <= U);
  let K = ie.filter((E) => E.date < n).at(-1)?.bal ?? {};
  let L = W.at(-1)?.bal ?? K;
  let V = (E) => W.reduce((acc, item) => acc + Math.max(0, item.delta[E] ?? 0), 0);
  let we = (E) => W.reduce((acc, item) => acc + Math.max(0, -(item.delta[E] ?? 0)), 0);
  let Ue = (E) => {
    let ue = y_data.flows
      .filter((fe) => fe.item_id === E && fe.dir > 0)
      .sort(
        (fe, tt) =>
          fe.flow_date.localeCompare(tt.flow_date) ||
          fe.created_at.localeCompare(tt.created_at) ||
          fe.ref_id.localeCompare(tt.ref_id)
      );
    let oe = y_data.flows
      .filter((fe) => fe.item_id === E && fe.dir < 0)
      .reduce((acc, item) => acc + Number(item.qty), 0);
    let map = new Map();
    return ue
      .map((fe) => {
        let tt = Math.min(Number(fe.qty), Math.max(0, oe));
        oe -= tt;
        let it = u.get(fe.ref_id);
        let aa = it ? _.get(it.purchase_order_id) : undefined;
        let Ge = p.get(fe.ref_id);
        let z = (map.get(fe.flow_date) ?? 0) + 1;
        map.set(fe.flow_date, z);
        let J = ue.filter((ge) => ge.flow_date === fe.flow_date).length > 1;
        return {
          ref: fe.ref_id,
          kind: fe.kind,
          date: fe.flow_date,
          batch: `${shortDate(fe.flow_date)}${J ? `-${z}` : ""}`,
          who:
            fe.kind === "purchase"
              ? `\u9032\u8CA8\uFF1A${t.supplier(aa?.supplier_id)?.name ?? ""}`
              : Ge?.reason === "count"
              ? "期初／盤點"
              : ADJ_REASON_LABELS[Ge?.reason ?? ""] ?? "調整",
          note: (fe.kind === "purchase" ? it?.note : Ge?.note) ?? "",
          price: Number(fe.unit_cost ?? 0),
          total: Number(fe.qty),
          rest: Math.round((Number(fe.qty) - tt) * 100) / 100,
        };
      })
      .filter((fe) => fe.rest > 0.001);
  };
  let ft = a
    .map((it) => ({
      it,
      lots: Ue(it.id),
    }))
    .filter((E) => E.lots.length > 0);
  async function ua() {
    if (!c) {
      return;
    }
    let E = c.kind === "purchase" ? "purchase_lines" : "inventory_adjustments";
    if (
      await run(
        () =>
          db.update(
            E,
            {
              note: c.text.trim() || null,
            },
            [eq("id", c.ref)]
          ),
        "已儲存備註"
      )
    ) {
      setC(null);
      y.reload();
    }
  }
  let st = "px-1.5 py-2 text-right";
  return (
    <div className="mb-6">
      {ft.length > 0 && (
        <Card className="mb-3">
          <div className="mb-1 font-bold">倉庫裡還剩的批次（先進先出，每種最上面的先用）</div>
          {ft.map(({ it, lots }) => (
            <div key={it.id} className="mt-2">
              <div className="tnum flex items-baseline justify-between rounded-lg bg-sunk px-2 py-1">
                <b>{it.short_name ?? it.name}</b>
                <span className="text-sm">
                  共 <b>{num(lots.reduce((acc, lot) => acc + lot.rest, 0))}</b> 包
                </span>
              </div>
              {lots.map((oe, ye) => (
                <div key={oe.ref} className="border-b border-line px-1 py-2 last:border-b-0">
                  <div className="tnum flex items-baseline justify-between gap-2">
                    <span className="font-bold">
                      批次 {oe.batch}
                      {ye === 0 && (
                        <span className="ml-1.5 rounded-full bg-flesh-soft px-2 py-0.5 text-xs text-flesh-ink">
                          下一批先用
                        </span>
                      )}
                    </span>
                    <span>
                      <b>剩 {num(oe.rest)} 包</b>
                      <span className="ml-1 text-sm text-muted">／進 {num(oe.total)}</span>
                    </span>
                  </div>
                  <div className="tnum flex justify-between text-sm text-muted">
                    <span>
                      入庫 {shortDate(oe.date)}・{oe.who}
                    </span>
                    <span>@{money(oe.price)}</span>
                  </div>
                  {c?.ref === oe.ref ? (
                    <div className="mt-2 flex gap-2">
                      <input
                        className="field min-w-0 flex-1"
                        autoFocus
                        value={c.text}
                        placeholder="例如：比較甜、有幾顆爛、放倉庫左邊"
                        onChange={(fe) =>
                          setC({
                            ...c,
                            text: fe.target.value,
                          })
                        }
                      />
                      <Btn kind="primary" disabled={saving} onClick={ua}>
                        儲存
                      </Btn>
                      <Btn onClick={() => setC(null)}>取消</Btn>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="mt-1 flex min-h-8 w-full items-start gap-1 text-left text-sm"
                      onClick={() =>
                        setC({
                          ref: oe.ref,
                          kind: oe.kind,
                          text: oe.note,
                        })
                      }
                    >
                      {oe.note ? (
                        <>
                          <span className="text-muted">備註：</span>
                          <span className="flex-1 whitespace-pre-line">{oe.note}</span>
                          <span className="font-bold text-flesh-ink">修改</span>
                        </>
                      ) : (
                        <span className="font-bold text-flesh-ink">＋加備註</span>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </Card>
      )}
      <div className="mb-1 flex items-center justify-between">
        <button
          className="h-11 w-11 rounded-full text-2xl active:bg-sunk"
          aria-label="上個月"
          onClick={() => setN(addMonths(n, -1))}
        >
          ‹
        </button>
        <span className="text-lg font-bold">{monthLabel(n)} 進出明細</span>
        <button
          className="h-11 w-11 rounded-full text-2xl active:bg-sunk"
          aria-label="下個月"
          onClick={() => setN(addMonths(n, 1))}
        >
          ›
        </button>
      </div>
      <label className="mb-2 flex min-h-10 items-center justify-end gap-2 px-1 text-sm text-muted">
        <input type="checkbox" className="h-5 w-5" checked={s} onChange={o} />
        顯示每天結存（日期那一行）
      </label>
      {W.length === 0 ? (
        <Empty text={start && U < start ? `\u5EAB\u5B58\u5F9E ${start} \u958B\u59CB\u8A18` : "這個月沒有進出"} />
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-card">
          <table className="tnum w-full text-[0.92rem]">
            <thead className="text-xs text-muted">
              <tr className="border-b border-line">
                <th className="px-1.5 py-2 text-left">日期・摘要</th>
                {a.map((E) => (
                  <th key={E.id} className={cx(st, "w-12 text-sm text-ink")}>
                    {E.short_name ?? E.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line bg-sunk">
                <td className="px-1.5 py-1.5 text-muted">上月結存</td>
                {a.map((E) => (
                  <td key={E.id} className={cx(st, "py-1.5 font-bold")}>
                    {num(K[E.id] ?? 0)}
                  </td>
                ))}
              </tr>
              {[...new Set(W.map((E) => E.date))].map((E) => {
                let ue = W.filter((ye) => ye.date === E);
                let bal = ue.at(-1).bal;
                return [
                  <tr key={E} className="border-b border-line bg-sunk/70">
                    <td className="px-1.5 py-1 text-xs font-bold text-muted">
                      {shortDate(E)}（週{I1[new Date(`${E}T00:00:00`).getDay()]}）
                    </td>
                    {a.map((ye) => (
                      <td
                        key={ye.id}
                        className={cx(st, "py-1 text-xs", (bal[ye.id] ?? 0) < 0 ? "font-bold text-warn" : "text-muted")}
                      >
                        {s ? num(bal[ye.id] ?? 0) : ""}
                      </td>
                    ))}
                  </tr>,
                  ...ue.map((ye, fe) => (
                    <tr
                      key={E + fe}
                      className={cx(
                        "border-b border-line",
                        ye.href && "cursor-pointer active:bg-sunk",
                        ye.tone === "buy" && "bg-flesh-soft/40",
                        ye.order === 2 && "bg-skin-soft"
                      )}
                      onClick={ye.href ? () => navigate(ye.href) : undefined}
                    >
                      <td className="px-1.5 py-2">
                        <div className="font-bold leading-snug">{ye.text}</div>
                        {(ye.cost > 0 || ye.sub) && (
                          <div className="text-xs text-muted">
                            {[
                              ye.cost > 0 && `${ye.order === 2 ? "成本" : "金額"} ${money(Math.round(ye.cost))}`,
                              ye.sub,
                            ]
                              .filter(Boolean)
                              .join("・")}
                          </div>
                        )}
                      </td>
                      {a.map((tt) => {
                        let it = ye.delta[tt.id] ?? 0;
                        return (
                          <td key={tt.id} className={cx(st, "text-base font-bold", it > 0 ? "text-leaf" : "text-skin")}>
                            {it ? `${it > 0 ? "+" : "−"}${num(Math.abs(it))}` : ""}
                          </td>
                        );
                      })}
                    </tr>
                  )),
                ];
              })}
              <tr className="border-t-2 border-line bg-sunk text-sm">
                <td className="px-1.5 py-1.5 font-bold">本月進／出</td>
                {a.map((E) => (
                  <td key={E.id} className={cx(st, "py-1.5")}>
                    <div className="text-leaf">+{num(V(E.id))}</div>
                    <div className="text-skin">−{num(we(E.id))}</div>
                  </td>
                ))}
              </tr>
              <tr className="bg-sunk">
                <td className="px-1.5 py-2 font-bold">月底結存</td>
                {a.map((E) => (
                  <td key={E.id} className={cx(st, "font-bold", (L[E.id] ?? 0) < 0 && "text-warn")}>
                    {num(L[E.id] ?? 0)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 px-1 text-sm text-muted">
        綠色 + 是進倉庫，紅色 −
        是用掉。每天只列實際烤掉的包數（帶出去沒烤完的已經放回倉庫）。成本依進貨先進先出。點一行可以到那天的記帳或那張進貨單。
      </p>
    </div>
  );
}
