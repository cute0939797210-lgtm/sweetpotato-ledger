import { Card, Section, cx } from "./ui.jsx";
import { money, monthLabel } from "../lib/format.js";
import { NO_STALL, buildStallMonth, loadStallMonth, rankStalls } from "../lib/stallReport.js";
import { useQuery, useStore } from "../lib/store.jsx";

export function StallRanking({ month, compact = false }) {
  let a = useStore();
  let n = `${month.slice(0, 7)}-01`;
  let l = useQuery(() => loadStallMonth(n), [n]);
  if (!l.data) {
    return null;
  }
  let s = buildStallMonth(l.data.entries, l.data.days, (d) => a.market(d)?.name ?? "");
  let i = rankStalls(s.stalls);
  if (i.length < (compact ? 2 : 1)) {
    return null;
  }
  let o = s.stalls.find((d) => d.stall === NO_STALL);
  let c = Math.max(...i.map((d) => Math.abs(d.avg)), 1);
  let b = `#/stall-month?m=${n.slice(0, 7)}`;
  let title = `${monthLabel(n)} \u6BCF\u6524\u6DE8\u5229\u6392\u884C`;
  if (compact) {
    let d = i[0];
    let r = i[i.length - 1];
    return (
      <Section
        title={title}
        aside=<a href={b} className="text-sm font-bold text-flesh-ink">
          看全部 ›
        </a>
      >
        <div className="grid grid-cols-2 gap-2">
          {[
            {
              r: d,
              label: "🏆 最賺",
              tone: "bg-leaf-soft",
            },
            {
              r,
              label: "⚠\uFE0F 最差",
              tone: "bg-warn-soft",
            },
          ].map(({ r, label, tone }) => (
            <a key={label} href={b} className={cx("rounded-2xl p-3 active:opacity-80", tone)}>
              <div className="text-sm font-bold text-muted">{label}</div>
              <div className="line-clamp-1 font-bold">{r.stall}</div>
              <div className={cx("tnum text-lg font-bold", r.avg < 0 && "text-warn")}>
                {money(r.avg)}
                <span className="text-sm font-normal text-muted"> /天</span>
              </div>
              <div className="tnum text-xs text-muted">
                {r.days} 天・共 {money(r.profit)}
              </div>
            </a>
          ))}
        </div>
      </Section>
    );
  }
  return (
    <Section
      title={title}
      aside=<a href={b} className="text-sm font-bold text-flesh-ink">
        明細表 ›
      </a>
    >
      <Card>
        <p className="mb-3 text-sm text-muted">
          依「平均每天淨利」排（出攤天數不同也能比）。淨利 = 收入 − 地瓜成本 − 租金 − 電費 − 其他營業支出。
        </p>
        <ol className="space-y-3">
          {i.map((d, r) => (
            <li key={d.stall}>
              <div className="flex items-baseline gap-2">
                <span
                  className={cx(
                    "tnum w-6 shrink-0 text-center font-bold",
                    r === 0 ? "text-leaf" : r === i.length - 1 && i.length > 1 ? "text-warn" : "text-muted"
                  )}
                >
                  {r + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-bold">
                  {d.stall}
                  {r === 0 && i.length > 1 ? " 🏆" : ""}
                  {r === i.length - 1 && i.length > 1 ? " ⚠\uFE0F" : ""}
                </span>
                <span className={cx("tnum shrink-0 font-bold", d.avg < 0 && "text-warn")}>
                  {money(d.avg)}
                  <span className="text-sm font-normal text-muted">/天</span>
                </span>
              </div>
              <div className="ml-8 mt-1 h-2 overflow-hidden rounded-full bg-sunk">
                <div
                  className={cx("h-full rounded-full", d.avg < 0 ? "bg-warn" : "bg-leaf")}
                  style={{
                    width: `${Math.max(3, (Math.abs(d.avg) / c) * 100)}%`,
                  }}
                />
              </div>
              <div className="tnum ml-8 mt-0.5 text-xs text-muted">
                {d.days} 天・收入 {money(d.income)}・支出 {money(d.expTotal)}・淨利 {money(d.profit)}
              </div>
            </li>
          ))}
        </ol>
        {o && o.expTotal > 0 && (
          <p className="mt-3 text-xs text-muted">
            另有 {money(o.expTotal)} 營業支出沒分到攤位（倉庫電費、庫存調整、沒出攤那天的支出等）。
          </p>
        )}
      </Card>
    </Section>
  );
}
