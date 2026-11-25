import * as React from "react";
import { MoneyInput, cx } from "./ui.jsx";
import { money } from "../lib/format.js";

const BILLS = [1000, 500, 100, 50, 10, 5, 1];

function parseBills(e) {
  let t = e.replace(/\s/g, "").replace(/[×xX]/g, "*");
  let a = {};
  if (t === "" || t === "0") {
    return a;
  }
  for (let n of t.split("+")) {
    let l = /^(\d+)\*(\d+)$/.exec(n);
    if (!l || !BILLS.includes(Number(l[1]))) {
      return null;
    }
    a[Number(l[1])] = String(Number(a[Number(l[1])] ?? 0) + Number(l[2]));
  }
  return a;
}

function billsFormula(e) {
  return BILLS.filter((a) => Number(e[a]) > 0)
    .map((a) => `${a}*${Number(e[a])}`)
    .join("+");
}

const CASH_COUNTER_MODE_KEY = "cash_counter_mode";

export function CashCounter({ value, onChange, label = "總收入金額" }) {
  let n = parseBills(value);
  let [l, setL] = React.useState(() => {
    if (n === null) {
      return true;
    }
    if (value.trim()) {
      return false;
    }
    try {
      return localStorage.getItem(CASH_COUNTER_MODE_KEY) !== "count";
    } catch {
      return true;
    }
  });
  let i = (m) => {
    setL(m);
    try {
      localStorage.setItem(CASH_COUNTER_MODE_KEY, m ? "direct" : "count");
    } catch {}
  };
  let o = n ?? {};
  let c = BILLS.reduce((acc, item) => acc + item * (Number(o[item]) || 0), 0);
  let b = (m, d) =>
    onChange(
      billsFormula({
        ...o,
        [m]: d.replace(/[^\d]/g, ""),
      })
    );
  if (l) {
    return (
      <div>
        <MoneyInput value={value} onChange={onChange} />
        <button
          type="button"
          className="mt-1 inline-flex min-h-11 items-center text-sm font-bold text-flesh-ink underline"
          onClick={() => {
            if (!value || n !== null || confirm("改用點鈔輸入會清空目前的金額，確定嗎？")) {
              if (n === null) {
                onChange("");
              }
              i(false);
            }
          }}
        >
          改用點鈔輸入（各幾張）
        </button>
      </div>
    );
  }
  return (
    <div>
      <div className="overflow-hidden rounded-xl border-[1.5px] border-line">
        <div className="grid grid-cols-[1fr_1fr_1.2fr] bg-sunk px-3 py-1.5 text-sm font-bold text-muted">
          <span>面額</span>
          <span className="text-center">數量</span>
          <span className="text-right">小計</span>
        </div>
        {BILLS.map((m) => {
          let d = Number(o[m]) || 0;
          return (
            <div key={m} className="grid grid-cols-[1fr_1fr_1.2fr] items-center border-t border-line px-3 py-1.5">
              <span className="tnum text-[1.05rem] font-bold">{m.toLocaleString()} 元</span>
              <input
                className="field tnum h-11 min-h-0 text-center text-lg font-bold"
                style={{
                  paddingLeft: 4,
                  paddingRight: 4,
                }}
                inputMode="numeric"
                placeholder="0"
                aria-label={`${m} \u5143\u7684\u6578\u91CF`}
                value={o[m] ?? ""}
                onChange={(r) => b(m, r.target.value)}
              />
              <span className={cx("tnum text-right", d ? "font-bold" : "text-muted")}>{d ? money(m * d) : "—"}</span>
            </div>
          );
        })}
        <div className="grid grid-cols-[1fr_1.2fr] items-center border-t-2 border-line bg-flesh-soft px-3 py-2.5">
          <span className="font-bold text-flesh-ink">{label}</span>
          <span className="tnum text-right text-xl font-bold text-flesh-ink">{money(c)}</span>
        </div>
      </div>
      <button
        type="button"
        className="mt-1 inline-flex min-h-11 items-center text-sm text-muted underline"
        onClick={() => i(true)}
      >
        改成直接輸入金額
      </button>
    </div>
  );
}
