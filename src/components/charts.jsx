import * as React from "react";
import * as JsxRuntime from "react/jsx-runtime";
// esbuild 的 class 欄位小工具（原本在共用 chunk 裡）
import { cx } from "./ui.jsx";
import { money } from "../lib/format.js";

export function ColumnChart({
  data,
  label,
  color = "var(--c-profit)"
}) {
  let [n, setN] = React.useState(null);
  let s = Math.max(1, ...data.map(d => d.value));
  let i = Math.min(0, ...data.map(d => d.value));
  let height = 160;
  let width = 100 / Math.max(1, data.length);
  let b = d => (s - d) / (s - i) * height;
  let m = b(0);
  return <figure aria-label={label} className="relative"><svg viewBox={`0 0 100 ${height + 18}`} preserveAspectRatio="none" className="h-48 w-full overflow-visible"><line x1="0" x2="100" y1={m} y2={m} stroke="var(--line)" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />{data.map((d, r) => {
        let y = Math.min(b(d.value), m);
        let h = Math.abs(b(d.value) - m);
        return <g key={d.key} onMouseEnter={() => setN(r)} onMouseLeave={() => setN(null)} onClick={() => setN(r)}><rect x={r * width} y={0} width={width} height={height} fill="transparent" /><rect x={r * width + width * 0.18} y={y} width={width * 0.64} height={Math.max(h, d.value ? 0.8 : 0)} rx="0.8" fill={d.value < 0 ? "var(--warn)" : color} opacity={n === null || n === r ? 1 : 0.45} /></g>;
      })}</svg><div className="flex">{data.map(d => <span key={d.key} className="flex-1 text-center text-xs text-muted">{d.label}</span>)}</div>{n !== null && data[n] && <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 rounded-lg bg-ink px-3 py-1 text-sm font-bold text-bg">{data[n].label}：{money(data[n].value)}</div>}</figure>;
}

export function BarList({
  rows,
  tone = "profit"
}) {
  let a = Math.max(1, ...rows.map(l => Math.abs(l.value)));
  let n = tone === "cost" ? "bg-c-cost" : tone === "rent" ? "bg-c-rent" : "bg-c-profit";
  return <div className="space-y-3">{rows.map(l => {
      let s = l.href ? "a" : "div";
      return JsxRuntime.jsxs(s, {
        href: l.href,
        className: "block",
        children: [<div className="mb-1 flex items-baseline justify-between gap-2"><span className="truncate font-bold">{l.label}</span><span className="tnum shrink-0 font-bold">{money(l.value)}</span></div>, <div className="h-2.5 rounded-[4px] bg-sunk"><div className={cx("h-full rounded-[4px]", l.value < 0 ? "bg-warn" : n)} style={{
            width: `${Math.abs(l.value) / a * 100}%`
          }} /></div>, l.sub && <div className="mt-1 text-sm text-muted">{l.sub}</div>]
      }, l.key);
    })}</div>;
}
