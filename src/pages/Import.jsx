import * as React from "react";
import { Badge, Btn, Card, Field, Page, Section, cx, useFeedback, useSaver } from "../components/ui.jsx";
import { evalFormula } from "../lib/calc.js";
import { money } from "../lib/format.js";
import { Pg, eh } from "../lib/report.js";
import { navigate } from "../lib/router.js";
import { useStore } from "../lib/store.jsx";
import { db } from "../lib/supabase.js";
import { excelDate, parseCsv, readXlsx } from "../lib/xlsx.js";

export function Import() {
  let e = useStore();
  let {
    toast
  } = useFeedback();
  let {
    saving,
    run
  } = useSaver();
  let [l, setL] = React.useState(null);
  let [i, setI] = React.useState([]);
  let [c, setC] = React.useState(0);
  let [m, setM] = React.useState(0);
  let [r, setR] = React.useState({
    date: -1,
    type: -1,
    category: -1,
    amount: -1,
    account: -1,
    description: -1
  });
  let [h, setH] = React.useState("auto");
  let [_, set_] = React.useState("");
  let [p, setP] = React.useState(e.cashAccountId ?? "");
  let [f, setF] = React.useState(1);
  async function M(L) {
    if (L) {
      try {
        let V = /\.csv$/i.test(L.name) ? parseCsv(await L.text()) : await readXlsx(L);
        if (!V.length) {
          throw new Error();
        }
        setL(L.name);
        setI(V);
        setC(0);
        T(V[0], 0);
        setF(2);
      } catch {
        toast("讀不到這個檔案，請確認是 .xlsx 或 .csv。", "error");
      }
    }
  }
  function T(L, V) {
    setM(V);
    let we = (L.rows[V] ?? []).map(ft => String(ft ?? ""));
    let Ue = {
      date: -1,
      type: -1,
      category: -1,
      amount: -1,
      account: -1,
      description: -1
    };
    Object.keys(eh).forEach(ft => {
      let ua = we.findIndex((st, E) => eh[ft].test(st) && !Object.values(Ue).includes(E));
      Ue[ft] = ua;
    });
    setR(Ue);
  }
  let j = i[c];
  let $ = (j?.rows[m] ?? []).map((L, V) => String(L ?? `\u7B2C ${V + 1} \u6B04`));
  let G = (L, V) => e.categories.find(we => we.kind === V && (we.name === L || we.report_group === L)) ?? e.categories.find(we => we.kind === V && L && (we.name.includes(L) || L.includes(we.name)));
  let ie = L => e.accounts.find(V => V.name === L || L && V.name.includes(L));
  let U = React.useMemo(() => {
    if (!j) {
      return [];
    }
    let L = (V, we) => {
      if (we >= 0) {
        return V[we];
      }
      return null;
    };
    return j.rows.slice(m + 1).map((V, we) => {
      let Ue = L(V, r.amount);
      let ft = typeof Ue === "number" ? Ue : evalFormula(String(Ue ?? "").replace(/[$,]/g, "")) ?? NaN;
      let ua = String(L(V, r.type) ?? "");
      let st = h === "income" ? "income" : "expense";
      if (h === "auto") {
        if (/收入|income/i.test(ua)) {
          st = "income";
        } else if (/支出|費用|expense/i.test(ua)) {
          st = "expense";
        } else {
          st = ft < 0 ? "expense" : "income";
        }
      }
      ft = Math.abs(ft);
      let E = excelDate(L(V, r.date) ?? null);
      let ue = String(L(V, r.category) ?? "").trim();
      let oe = G(ue, st) ?? (_ ? e.cat(_) : undefined);
      let ye = String(L(V, r.account) ?? "").trim();
      let acct = ie(ye) ?? e.acct(p);
      let desc = String(L(V, r.description) ?? "").trim() || (ue && oe?.name !== ue ? ue : "");
      let problems = [];
      if (!E) {
        problems.push("日期看不懂");
      }
      if (!isFinite(ft) || ft <= 0) {
        problems.push("金額看不懂或是 0");
      }
      if (!oe || oe.kind !== st) {
        problems.push(ue ? `\u627E\u4E0D\u5230\u5206\u985E\u300C${ue}\u300D` : "沒有分類");
      }
      let empty = V.every(Ge => Ge == null || Ge === "");
      return {
        i: m + 2 + we,
        date: E,
        type: st,
        amount: ft,
        cat: oe,
        acct,
        desc,
        problems,
        empty
      };
    }).filter(V => !V.empty);
  }, [j, m, r, h, _, p, e.categories, e.accounts]);
  let W = U.filter(L => L.problems.length === 0);
  async function K() {
    let L = crypto.randomUUID();
    if (await run(async () => {
      await db.insert("import_batches", {
        id: L,
        source: "excel",
        filename: l,
        summary: {
          rows: W.length
        }
      });
      for (let we = 0; we < W.length; we += 200) {
        await db.insert("transactions", W.slice(we, we + 200).map(Ue => ({
          txn_date: Ue.date,
          type: Ue.type,
          amount: Math.round(Ue.amount * 100) / 100,
          category_id: Ue.cat.id,
          account_id: Ue.acct?.id ?? null,
          description: Ue.desc || null,
          source: "import",
          import_batch_id: L
        })));
      }
    }, `\u5DF2\u532F\u5165 ${W.length} \u7B46`)) {
      navigate("/settings/batches");
    }
  }
  return <Page title="Excel 匯入" backTo="/settings"><ol className="mb-4 flex gap-2 text-sm font-bold">{["選檔案", "對應欄位", "確認匯入"].map((L, V) => <li key={L} className={cx("flex-1 rounded-full px-3 py-2 text-center", f === V + 1 ? "bg-ink text-bg" : "bg-card text-muted")}>{V + 1}. {L}</li>)}</ol>{f === 1 && <Card><p className="mb-4 text-muted">支援 .xlsx、.csv。每一列一筆收入或支出，至少要有日期、金額。上傳後會先預覽，按「確認匯入」才會寫入。</p><label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line font-bold text-flesh-ink">選擇 Excel 檔案<input type="file" accept=".xlsx,.csv" className="sr-only" onChange={L => M(L.target.files?.[0])} /></label><p className="mt-4 text-sm text-muted">原本的「2026 記帳 Excel」請用安裝包裡的歷史匯入 SQL（已比對過每月數字），不要用這裡匯入，以免重複。</p></Card>}{f === 2 && j && <><Card className="mb-4"><p className="mb-3 font-bold">{l}</p><div className="grid grid-cols-2 gap-3"><Field label="工作表"><select className="field" value={c} onChange={L => {
              let V = Number(L.target.value);
              setC(V);
              T(i[V], 0);
            }}>{i.map((L, V) => <option key={V} value={V}>{L.name}</option>)}</select></Field><Field label="標題在第幾列"><select className="field" value={m} onChange={L => T(j, Number(L.target.value))}>{j.rows.slice(0, 15).map((L, V) => <option key={V} value={V}>第 {V + 1} 列</option>)}</select></Field></div>{Object.keys(Pg).map(L => <Field key={L} label={Pg[L]} className="mb-3"><select className="field" value={r[L]} onChange={V => setR({
            ...r,
            [L]: Number(V.target.value)
          })}><option value={-1}>（沒有這一欄）</option>{$.map((V, we) => <option key={we} value={we}>{V}</option>)}</select></Field>)}<Field label="收入或支出"><select className="field" value={h} onChange={L => setH(L.target.value)}><option value="auto">依「收入／支出」欄判斷；沒有就用正負號（負數 = 支出）</option><option value="expense">全部都是支出</option><option value="income">全部都是收入</option></select></Field><Field label="找不到分類時用" hint="分類名稱跟系統一樣會自動對應"><select className="field" value={_} onChange={L => set_(L.target.value)}><option value="">（不匯入這種列）</option>{e.categories.filter(L => L.is_active).map(L => <option key={L.id} value={L.id}>{L.kind === "income" ? "收入" : "支出"}：{L.name}</option>)}</select></Field><Field label="沒有帳戶時用" className="mb-0"><select className="field" value={p} onChange={L => setP(L.target.value)}>{e.accounts.map(L => <option key={L.id} value={L.id}>{L.name}</option>)}</select></Field></Card><div className="flex gap-3"><Btn big onClick={() => setF(1)}>重新選檔</Btn><Btn kind="primary" big className="flex-1" onClick={() => setF(3)}>預覽 {U.length} 列</Btn></div></>}{f === 3 && <><Card className="mb-4"><p className="text-lg font-bold">可以匯入 {W.length} 筆，合計 收入 {money(W.filter(L => L.type === "income").reduce((acc, item) => acc + item.amount, 0))}、支出 {money(W.filter(L => L.type === "expense").reduce((acc, item) => acc + item.amount, 0))}</p>{U.length - W.length > 0 && <p className="mt-1 font-bold text-warn">{U.length - W.length} 列有問題，不會匯入（下面標紅的）</p>}</Card><Section title="預覽"><div className="overflow-x-auto rounded-2xl bg-card"><table className="tnum w-full min-w-[560px] text-[0.95rem]"><thead className="text-left text-sm text-muted"><tr className="border-b border-line">{["列", "日期", "類型", "分類", "金額", "帳戶", "說明"].map(L => <th key={L} scope="col" className="px-3 py-2">{L}</th>)}</tr></thead><tbody>{U.slice(0, 300).map(L => <tr key={L.i} className={cx("border-b border-line last:border-b-0", L.problems.length && "bg-warn-soft")}><td className="px-3 py-2 text-muted">{L.i}</td><td className="px-3">{L.date ?? "?"}</td><td className="px-3">{L.type === "income" ? <Badge tone="leaf">收入</Badge> : <Badge tone="skin">支出</Badge>}</td><td className="px-3">{L.problems.length ? <span className="font-bold text-warn">{L.problems.join("、")}</span> : L.cat?.name}</td><td className="px-3 text-right">{isFinite(L.amount) ? money(L.amount) : "?"}</td><td className="px-3">{L.acct?.name}</td><td className="px-3">{L.desc}</td></tr>)}</tbody></table></div>{U.length > 300 && <p className="mt-2 text-sm text-muted">只顯示前 300 列</p>}</Section><div className="flex gap-3"><Btn big onClick={() => setF(2)}>回上一步</Btn><Btn kind="primary" big className="flex-1" disabled={saving || W.length === 0} onClick={K}>{saving ? "匯入中…" : `\u78BA\u8A8D\u532F\u5165 ${W.length} \u7B46`}</Btn></div></>}</Page>;
}
