import { Btn, Card, Empty, Page, QueryView, cx, useFeedback } from "../components/ui.jsx";
import { WEEKDAYS, addMonths, money, monthEnd, monthLabel, today_, weekday } from "../lib/format.js";
import { navigate } from "../lib/router.js";
import { NO_STALL, buildStallMonth, markStallMonthSaved, savedKey } from "../lib/stallReport.js";
import { useQuery, useStore } from "../lib/store.jsx";
import { db, gte, isNull, lte } from "../lib/supabase.js";
import { download_, writeXlsx } from "../lib/xlsx.js";

export function StallMonth({
  route
}) {
  let t = useStore();
  let {
    toast
  } = useFeedback();
  let n = `${(route.query.get("m") || today_()).slice(0, 7)}-01`;
  let l = monthEnd(n);
  let s = n.slice(0, 7);
  let i = m => navigate(`/stall-month?m=${m.slice(0, 7)}`);
  let o = useQuery(async () => {
    let [m, d, r] = await Promise.all([db.select("v_pnl_entries", {
      where: [gte("entry_date", n), lte("entry_date", l)],
      order: "entry_date",
      limit: 5000
    }), db.select("business_days", {
      where: [isNull("deleted_at"), gte("day", n), lte("day", l)],
      order: "day"
    }), db.select("transactions", {
      where: [isNull("deleted_at"), gte("txn_date", n), lte("txn_date", l)],
      limit: 5000
    })]);
    return {
      entries: m,
      days: d,
      txns: r
    };
  }, [n]);
  let c = m => t.market(m)?.name ?? "";
  async function b() {
    if (o.data) {
      try {
        toast("產生 Excel 中…", "info");
        let m = o.data;
        let d = buildStallMonth(m.entries, m.days, c);
        let r = f => `週${WEEKDAYS[weekday(f)]}`;
        let y = f => f || null;
        let h = [[`${monthLabel(n)} \u6524\u4F4D\u6536\u652F\u5F59\u7E3D`], [], ["攤位", "出攤天數", "收入", ...d.groups, "支出合計", "淨利", "平均每天淨利"], ...[...d.stalls, d.total].map(f => [f.stall, f.days || null, y(f.income), ...d.groups.map(k => y(f.exp[k] ?? 0)), y(f.expTotal), f.profit, f.days ? Math.round(f.profit / f.days) : null])];
        if (d.otherIncome) {
          h.push([], ["其他收入（不算淨利）", null, d.otherIncome]);
        }
        h.push([], [`\u7522\u751F\u65E5\u671F\uFF1A${today_()}`]);
        let v = [["攤位", "日期", "星期", "收入", ...d.groups, "支出合計", "淨利"]];
        let _ = [0];
        for (let f of d.stallNames) {
          let k = d.rows.filter(T => T.stall === f);
          k.forEach(T => v.push([f, T.date, r(T.date), y(T.income), ...d.groups.map(j => y(T.exp[j] ?? 0)), y(T.expTotal), T.profit]));
          let M = d.stalls.find(T => T.stall === f);
          v.push([`${f} \u5C0F\u8A08`, `${M.days || k.length} \u5929`, "", y(M.income), ...d.groups.map(T => y(M.exp[T] ?? 0)), y(M.expTotal), M.profit]);
          _.push(v.length - 1);
          v.push([]);
        }
        v.push(["合計", "", "", d.total.income, ...d.groups.map(f => y(d.total.exp[f] ?? 0)), d.total.expTotal, d.total.profit]);
        _.push(v.length - 1);
        let u = new Map(m.txns.map(f => [f.id, f]));
        let p = [["日期", "星期", "攤位", "收／支", "群組", "分類", "金額", "說明", "備註"], ...m.entries.filter(f => f.tier === 1 || f.kind === "income" && f.tier === 0).sort((f, k) => f.entry_date.localeCompare(k.entry_date) || (f.kind === k.kind ? 0 : f.kind === "income" ? -1 : 1)).map(f => {
          let k = f.source === "transaction" ? u.get(f.ref_id) : undefined;
          let M = f.source.startsWith("inventory") ? "地瓜成本（先進先出）" : f.source === "purchase" ? "進貨" : "";
          return [f.entry_date, r(f.entry_date), d.stallOf(f), f.kind === "income" ? f.tier === 0 ? "其他收入（不算淨利）" : "收入" : "支出", f.report_group, f.category, Number(f.amount), k?.description ?? M, k?.note ?? ""];
        })];
        let widths = [16, 12, 7, 10, ...d.groups.map(() => 10), 10, 10];
        download_(await writeXlsx([{
          name: "攤位彙總",
          rows: h,
          widths: [24, 9, 11, ...d.groups.map(() => 10), 11, 11, 13],
          boldRows: [0, 2, 3 + d.stalls.length]
        }, {
          name: "每日明細",
          rows: v,
          widths,
          boldRows: _
        }, {
          name: "逐筆明細",
          rows: p,
          widths: [12, 6, 20, 10, 12, 14, 10, 30, 30]
        }]), `\u5730\u74DC\u71DF\u904B_${s}_\u6524\u4F4D\u6536\u652F\u660E\u7D30\u8868.xlsx`);
        toast("已下載 Excel", "ok");
        try {
          await markStallMonthSaved(s, t.settingRows.find(f => f.key === savedKey(s))?.id);
          await t.reload();
        } catch {}
      } catch {
        toast("匯出失敗，請再試一次。", "error");
      }
    }
  }
  return <Page title="攤位收支明細表" backTo="/reports/month" wide><div className="print:hidden"><div className="mx-auto mb-3 flex max-w-2xl items-center justify-between"><button className="h-11 w-11 rounded-full text-2xl active:bg-sunk" aria-label="上個月" onClick={() => i(addMonths(n, -1))}>‹</button><span className="text-lg font-bold">{monthLabel(n)}</span><button className="h-11 w-11 rounded-full text-2xl active:bg-sunk" aria-label="下個月" onClick={() => i(addMonths(n, 1))}>›</button></div><div className="mx-auto mb-2 grid max-w-2xl grid-cols-2 gap-2"><Btn kind="primary" disabled={!o.data} onClick={b}>⬇ 下載 Excel</Btn><Btn disabled={!o.data} onClick={() => {
          window.print();
          markStallMonthSaved(s, t.settingRows.find(m => m.key === savedKey(s))?.id).then(() => t.reload()).catch(() => {});
        }}>🖨 列印／存 PDF</Btn></div><p className="mx-auto mb-4 max-w-2xl px-1 text-sm text-muted">存 PDF：按「列印／存 PDF」，印表機選「另存為 PDF」（手機選「分享 → 儲存到檔案」）。Excel 有 3 張表：攤位彙總、每日明細、逐筆明細。</p></div><QueryView q={o} loadingText="整理中…" empty={m => {
      if (m.entries.length === 0 && m.days.length === 0) {
        return <Empty text="這個月還沒有資料" />;
      }
      return null;
    }}>{m => {
        let d = buildStallMonth(m.entries, m.days, c);
        let r = "whitespace-nowrap px-2 py-1.5 font-bold";
        let y = "whitespace-nowrap px-2 py-1.5 text-right tnum";
        let h = profit => {
          if (profit < 0) {
            return "text-warn";
          }
          return "";
        };
        let v = u => {
          if (u) {
            return money(u);
          }
          return "";
        };
        let Component = u => <tr className="border-b-2 border-line bg-sunk print:bg-[#eee]">{u.map((p, g) => <th key={p} scope="col" className={cx(r, g === 0 || p === "攤位" ? "text-left" : "text-right")}>{p}</th>)}<th scope="col" className={cx(r, "text-right")}>收入</th>{d.groups.map(p => <th key={p} scope="col" className={cx(r, "text-right")}>{p}</th>)}<th scope="col" className={cx(r, "text-right")}>支出合計</th><th scope="col" className={cx(r, "text-right")}>淨利</th></tr>;
        return <div className="print-area"><h2 className="mb-1 hidden text-xl font-bold print:block">🍠 地瓜營運｜{monthLabel(n)} 攤位收支明細表</h2><p className="mb-3 hidden text-xs print:block">產生日期：{today_()}</p><div className="mb-4 grid grid-cols-3 gap-2 print:hidden"><Card className="text-center"><div className="text-sm text-muted">收入</div><div className="tnum text-xl font-bold text-leaf">{money(d.total.income)}</div></Card><Card className="text-center"><div className="text-sm text-muted">營業支出</div><div className="tnum text-xl font-bold">{money(d.total.expTotal)}</div></Card><Card className="text-center"><div className="text-sm text-muted">營業淨利</div><div className={cx("tnum text-xl font-bold", h(d.total.profit))}>{money(d.total.profit)}</div></Card></div><h3 className="mb-2 px-1 font-bold">一、各攤位彙總</h3><div className="mb-6 overflow-x-auto rounded-2xl bg-card print:overflow-visible print:rounded-none"><table className="w-full text-sm print:text-[9pt]"><thead>{Component(["攤位", "天數"])}</thead><tbody>{d.stalls.map(u => <tr key={u.stall} className="border-b border-line"><td className="whitespace-nowrap px-2 py-1.5 text-left font-bold">{u.stall}</td><td className={y}>{u.days || ""}</td><td className={cx(y, "text-leaf print:text-inherit")}>{v(u.income)}</td>{d.groups.map(p => <td key={p} className={y}>{v(u.exp[p])}</td>)}<td className={y}>{v(u.expTotal)}</td><td className={cx(y, "font-bold", h(u.profit))}>{money(u.profit)}</td></tr>)}<tr className="border-t-2 border-line font-bold"><td className="px-2 py-1.5 text-left">合計</td><td className={y}>{d.total.days}</td><td className={y}>{money(d.total.income)}</td>{d.groups.map(u => <td key={u} className={y}>{v(d.total.exp[u])}</td>)}<td className={y}>{money(d.total.expTotal)}</td><td className={cx(y, h(d.total.profit))}>{money(d.total.profit)}</td></tr></tbody></table></div>{d.otherIncome > 0 && <p className="-mt-4 mb-6 px-1 text-sm text-muted">另有其他收入 {money(d.otherIncome)}（不算淨利，列在 Excel 逐筆明細）。</p>}<h3 className="mb-2 px-1 font-bold print:break-before-page">二、每日明細（依攤位）</h3><div className="mb-6 overflow-x-auto rounded-2xl bg-card print:overflow-visible print:rounded-none"><table className="w-full text-sm print:text-[8.5pt]"><thead>{Component(["日期", "攤位"])}</thead>{d.stallNames.map(u => {
                let p = d.rows.filter(f => f.stall === u);
                let g = d.stalls.find(f => f.stall === u);
                return <tbody key={u} className="print:break-inside-avoid">{p.map(f => <tr key={f.date + u} className="border-b border-line"><td className="whitespace-nowrap px-2 py-1.5 text-left tnum">{Number(f.date.slice(5, 7))}/{Number(f.date.slice(8))}（{WEEKDAYS[weekday(f.date)]}）</td><td className="max-w-40 truncate px-2 py-1.5 text-left print:max-w-none">{u}</td><td className={y}>{v(f.income)}</td>{d.groups.map(k => <td key={k} className={y}>{v(f.exp[k])}</td>)}<td className={y}>{v(f.expTotal)}</td><td className={cx(y, h(f.profit))}>{money(f.profit)}</td></tr>)}<tr className="border-b-2 border-line bg-flesh-soft/60 font-bold print:bg-[#f5f5f5]"><td className="px-2 py-1.5 text-left" colSpan={2}>{u} 小計{g.days ? `\uFF08${g.days} \u5929\uFF09` : ""}</td><td className={y}>{v(g.income)}</td>{d.groups.map(f => <td key={f} className={y}>{v(g.exp[f])}</td>)}<td className={y}>{v(g.expTotal)}</td><td className={cx(y, h(g.profit))}>{money(g.profit)}</td></tr></tbody>;
              })}</table></div><p className="px-1 text-sm text-muted print:text-[8pt]">收入、支出只算生意（營業）的部分；生財器具、車貸、生活開銷不在這張表。地瓜成本依實際烤的包數、先進先出計算。「{NO_STALL}」是沒連到某一攤的營業支出（例如倉庫電費、庫存盤點／報廢／調出、沒出攤那天的支出）。</p></div>;
      }}</QueryView></Page>;
}
