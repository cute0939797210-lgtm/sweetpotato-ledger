import * as React from "react";
import { Btn, Card, Field, MoneyInput, Page, parseMoney, useSaver } from "../components/ui.jsx";
import { addMonths, money, today_ } from "../lib/format.js";
import { ph } from "../lib/rentDue.js";
import { navigate } from "../lib/router.js";
import { useStore } from "../lib/store.jsx";
import { db } from "../lib/supabase.js";

export function WarehouseRent({
  route
}) {
  let t = useStore();
  let {
    saving,
    run
  } = useSaver();
  let l = route.query.get("q") || ph(today_());
  let s = [0, 1, 2].map(h => addMonths(l, h));
  let i = t.catByCode("WAREHOUSE_RENT");
  let [o, setO] = React.useState(route.query.get("amt") || "4000");
  let [b, setB] = React.useState(today_());
  let d = Number(l.slice(5, 7));
  let r = parseMoney(o)?.amount ?? 0;
  async function y() {
    if (!i || !t.cashAccountId || r <= 0) {
      return;
    }
    let note = `${b.slice(5).replace("-", "/")} \u73FE\u91D1\u4E00\u6B21\u4ED8 ${d}\u2013${d + 2} \u6708`;
    if (await run(async () => {
      await db.insert("transactions", {
        txn_date: b,
        type: "payment",
        payment_kind: "settlement",
        amount: r * 3,
        account_id: t.cashAccountId,
        source: "manual",
        description: `\u9810\u4ED8\u5009\u5EAB\u79DF\u91D1\uFF08${d}\u2013${d + 2} \u6708\uFF09`,
        note
      });
      await db.insert("transactions", s.map(txn_date => ({
        txn_date,
        type: "expense",
        amount: r,
        account_id: null,
        category_id: i.id,
        source: "manual",
        description: `\u5009\u5EAB\u79DF\u91D1\uFF08${txn_date.slice(0, 4)}/${txn_date.slice(5, 7)} \u6708\uFF09`,
        note: `${note}\uFF08\u5DF2\u9810\u4ED8\uFF09`
      })));
    }, "已記好倉庫租金")) {
      navigate("/");
    }
  }
  return <Page title="付倉庫租金（3 個月）" backTo="/"><Card className="mb-4"><p className="mb-3 text-[0.95rem]">一次付 <b>{l.slice(0, 4)} 年 {d}–{d + 2} 月</b>，從<b>金庫</b>付現金。金庫只在付錢那天扣一次；月報每個月 1 號各有一筆倉庫租金（已預付，不會再扣金庫）。</p><Field label="每個月租金"><MoneyInput value={o} onChange={setO} /></Field><Field label="實際付錢的日期（寫在備註）"><input type="date" className="field" value={b} onChange={h => setB(h.target.value)} /></Field><div className="tnum mt-2 rounded-xl bg-sunk p-3 text-[0.95rem]">{s.map(h => <div key={h} className="flex justify-between"><span>{Number(h.slice(5, 7))}/1 倉庫租金</span><span>{money(r)}</span></div>)}<div className="mt-1 flex justify-between border-t border-line pt-1 font-bold"><span>從金庫付出</span><span>{money(r * 3)}</span></div></div></Card><Btn kind="primary" big className="w-full" disabled={saving || r <= 0 || !i} onClick={y}>{saving ? "儲存中…" : `\u8A18\u597D\uFF0C\u5F9E\u91D1\u5EAB\u4ED8 ${money(r * 3)}`}</Btn></Page>;
}
