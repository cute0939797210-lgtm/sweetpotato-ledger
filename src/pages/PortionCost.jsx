import * as React from "react";
import { Card, Empty, Field, Page, QueryView, cx } from "../components/ui.jsx";
import { money, shortDate, today_ } from "../lib/format.js";
import { useQuery, useStore } from "../lib/store.jsx";
import { db, inList, isNull } from "../lib/supabase.js";

const PORTION_KEY = "portion_cost_settings";

const TAEL_G = 37.5;

const PORTION_SIZES = [8, 9, 10];

const loadPortionOpts = () => {
  try {
    let e = JSON.parse(localStorage.getItem(PORTION_KEY) || "null");
    if (e) {
      return {
        price: "50",
        yieldPct: "100",
        kg: {},
        ...e
      };
    }
  } catch {}
  return {
    price: "50",
    yieldPct: "100",
    kg: {}
  };
};

export function PortionCost() {
  let e = useStore();
  let [t, setT] = React.useState(loadPortionOpts);
  let [n, setN] = React.useState(today_());
  let s = m => {
    let d = {
      ...t,
      ...m
    };
    setT(d);
    try {
      localStorage.setItem(PORTION_KEY, JSON.stringify(d));
    } catch {}
  };
  let i = e.items.filter(m => m.track_inventory && m.is_active);
  let o = useQuery(async () => {
    let [m, d] = await Promise.all([db.select("purchase_orders", {
      where: [isNull("deleted_at")],
      order: "order_date.desc,created_at.desc",
      limit: 80
    }), db.rpc("day_unit_prices", {
      p_day: n
    }).catch(() => [])]);
    if (m.length === 0) {
      return new Map();
    }
    let r = await db.select("purchase_lines", {
      where: [isNull("deleted_at"), inList("purchase_order_id", m.map(_ => _.id))],
      limit: 2000
    });
    let y = new Map(d.map(_ => [_.item_id, _]));
    let h = new Map(m.map(_ => [_.id, _.order_date]));
    let map = new Map();
    for (let _ of i) {
      let u = r.filter(g => g.item_id === _.id && Number(g.quantity) > 0 && Number(g.unit_price) > 0).map(g => ({
        p: Number(g.unit_price),
        d: h.get(g.purchase_order_id) ?? ""
      })).sort((g, f) => f.d.localeCompare(g.d));
      if (!u.length) {
        continue;
      }
      let p = y.get(_.id);
      map.set(_.id, {
        latest: u[0].p,
        latestDate: u[0].d,
        day: p && Number(p.system_price) > 0 ? Number(p.system_price) : null,
        daySrc: p?.source ?? ""
      });
    }
    return map;
  }, [i.map(m => m.id).join(), n]);
  let c = Number(t.price) || 0;
  let b = Math.min(100, Math.max(10, Number(t.yieldPct) || 100)) / 100;
  return <Page title="每份成本試算" backTo="/purchases"><Card className="mb-4"><Field label="哪一天的地瓜" hint="用這天實際烤的地瓜進貨成本（先進先出）"><input type="date" className="field" value={n} max={today_()} onChange={m => setN(m.target.value || today_())} /></Field><div className="mt-3 grid grid-cols-2 gap-3"><Field label="一份賣多少"><input className="field tnum text-lg font-bold" inputMode="numeric" value={t.price} onChange={m => s({
            price: m.target.value
          })} /></Field><Field label="烤完剩幾成（%）" hint="秤生的就填 100"><input className="field tnum text-lg font-bold" inputMode="numeric" value={t.yieldPct} onChange={m => s({
            yieldPct: m.target.value
          })} /></Field></div><p className="mt-2 text-sm text-muted">1 台斤 = 16 兩 = 600 克，1 公斤 ≈ 26.7 兩。</p></Card><QueryView q={o} loadingText="讀取進貨價…" empty={m => {
      if (m.size === 0) {
        return <Empty text="還沒有進貨紀錄" />;
      }
      return null;
    }}>{m => <>{i.filter(d => m.has(d.id)).map(d => {
          let r = m.get(d.id);
          let h = (Number(t.kg[d.id] ?? "50") || 50) * 1000 * b / TAEL_G;
          let v = r.day ?? r.latest;
          let _ = v / h;
          let u = r.latest - v;
          let p = r.latest / h;
          let g = r.day === null ? "最近一次進貨價" : r.daySrc === "fifo" ? "這天實際烤的（先進先出）" : r.daySrc === "history" ? "這天記帳的單價" : "這天還沒記帳，用接下來要用的那批";
          return <Card key={d.id} className="mb-4"><div className="mb-2 flex items-start justify-between gap-2"><div><div className="text-lg font-bold">{d.name}</div><div className="text-sm text-muted">每{d.unit || "包"} <b className="text-ink">{money(Math.round(v))}</b>・{g}</div>{Math.abs(u) >= 1 && <div className={cx("text-sm font-bold", u > 0 ? "text-warn" : "text-leaf")}>最近進貨（{shortDate(r.latestDate)}）{money(r.latest)}，用到那批時{u > 0 ? "漲" : "降"} {money(Math.abs(Math.round(u)))}</div>}</div><label className="w-24 shrink-0 text-right text-sm text-muted">每包公斤<input className="field tnum mt-1 min-h-10 text-center font-bold" inputMode="decimal" aria-label={`${d.name} \u6BCF\u5305\u516C\u65A4`} value={t.kg[d.id] ?? "50"} onChange={f => s({
                  kg: {
                    ...t.kg,
                    [d.id]: f.target.value
                  }
                })} /></label></div><div className="tnum mb-3 grid grid-cols-2 gap-2 text-center"><div className="rounded-xl bg-sunk p-2"><div className="text-xs text-muted">每兩成本</div><b>${_.toFixed(2)}</b></div><div className="rounded-xl bg-sunk p-2"><div className="text-xs text-muted">一包約</div><b>{Math.round(h).toLocaleString()} 兩</b></div></div><div className="overflow-x-auto"><table className="tnum w-full text-sm"><thead><tr className="border-b border-line text-muted"><th scope="col" className="py-1.5 text-left font-normal">每份</th><th scope="col" className="py-1.5 text-right font-normal">成本</th><th scope="col" className="py-1.5 text-right font-normal">毛利</th><th scope="col" className="py-1.5 text-right font-normal">一包賣幾份</th><th scope="col" className="py-1.5 text-right font-normal">一包賣多少</th></tr></thead><tbody>{PORTION_SIZES.map(f => {
                    let k = _ * f;
                    let M = Math.floor(h / f);
                    return <tr key={f} className="border-b border-line last:border-b-0"><td className="py-2 text-left font-bold">{f} 兩</td><td className="py-2 text-right">${k.toFixed(1)}{Math.abs(u) >= 1 && <div className={cx("text-xs", u > 0 ? "text-warn" : "text-leaf")} title="用到最近那批時的差額">之後{u > 0 ? "+" : "−"}{Math.abs((p - _) * f).toFixed(1)}</div>}</td><td className="py-2 text-right font-bold text-leaf">${(c - k).toFixed(1)}<div className="text-xs font-normal text-muted">{c ? Math.round((c - k) / c * 100) : 0}%</div></td><td className="py-2 text-right">{M} 份</td><td className="py-2 text-right">{money(M * c)}<div className="text-xs text-muted">扣成本 {money(Math.round(M * c - v))}</div></td></tr>;
                  })}</tbody></table></div></Card>;
        })}<p className="px-1 text-sm text-muted">只算地瓜本身的成本，不含租金、電費、紙袋、瓦斯。每份差 1 兩，一包就差好幾份，抓穩份量比漲價更有感。</p></>}</QueryView></Page>;
}
