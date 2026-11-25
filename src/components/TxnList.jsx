import { List, cx } from "./ui.jsx";
import { money, shortDate } from "../lib/format.js";
import { useStore } from "../lib/store.jsx";

function cleanDescription(description) {
  return (description ?? "")
    .replace(/（\d{4}\/\d{1,2} 月，收支明細表匯入）/g, "")
    .replace(/，?收支明細表匯入/g, "")
    .trim();
}

function txnLabel(e, t) {
  if (e.type === "transfer") {
    return `\u8F49\u5E33\uFF1A${t.acct(e.account_id)?.name ?? "?"} \u2192 ${t.acct(e.to_account_id)?.name ?? "?"}`;
  }
  let a = cleanDescription(e.description);
  if (e.type === "payment") {
    if (e.payment_kind === "supplier") {
      return `\u5730\u74DC\u9032\u8CA8\u4ED8\u6B3E\uFF1A${t.supplier(e.supplier_id)?.name ?? ""}`;
    }
    if (e.payment_kind === "rent_prepay") {
      return `\u9810\u4ED8\u79DF\u91D1\uFF1A${t.market(e.market_id)?.name ?? ""}${a ? `\u30FB${a}` : ""}`;
    }
    if (e.payment_kind === "advance_repay") {
      return `\u9084\u4EE3\u588A\uFF1A${t.payer(e.payer_id)?.name ?? ""}`;
    }
    return a || "付款／結清";
  }
  let n = t.cat(e.category_id)?.name ?? "";
  if (!a || a === n) {
    return n;
  }
  if (a.startsWith(n)) {
    return a;
  }
  return `${n}\u30FB${a}`;
}

const TYPE_LABELS = {
  income: "收入",
  expense: "支出",
  transfer: "轉帳",
  payment: "付款",
};

const SOURCE_LABELS = {
  daily: "每日記帳",
  manual: "單筆",
  import: "匯入",
  purchase: "進貨單",
  fee: "自動手續費",
  ai: "單筆",
};

function txnMeta(e, t) {
  let a = e.is_advance
    ? `${t.payer(e.payer_id)?.name ?? ""} \u4EE3\u588A`
    : e.type === "transfer"
    ? ""
    : e.account_id
    ? t.acct(e.account_id)?.name ?? ""
    : e.type === "expense" && (e.daily_slot === "rent" || (e.market_id && e.daily_slot?.startsWith("cat:")))
    ? "預付租金扣"
    : e.type === "expense" && t.cat(e.category_id)?.code === "WAREHOUSE_RENT"
    ? "已預付"
    : "不動帳戶";
  let n = e.formula && e.formula.length <= 24 ? e.formula : e.formula ? "點鈔" : "";
  let l = e.source === "import" && e.daily_slot ? "每日記帳" : SOURCE_LABELS[e.source] ?? "";
  return [TYPE_LABELS[e.type], a, l, n].filter(Boolean).join("・");
}

export function TxnList({ txns, showDate = true }) {
  let a = useStore();
  return (
    <List>
      {txns.map((n) => {
        let l = n.type === "income" ? 1 : n.type === "transfer" ? 0 : -1;
        let i =
          a.cat(n.category_id)?.tier === 3
            ? `#/entry/${n.id}?book=personal`
            : n.source === "daily"
            ? `#/daily?d=${n.txn_date}`
            : n.source === "purchase"
            ? `#/purchases/order/${n.purchase_order_id}`
            : n.source === "fee"
            ? `#/entry/${n.fee_parent_id}`
            : `#/entry/${n.id}`;
        return (
          <a
            key={n.id}
            href={i}
            className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-b-0 active:bg-sunk"
          >
            {showDate && <span className="tnum w-11 shrink-0 pt-0.5 text-sm text-muted">{shortDate(n.txn_date)}</span>}
            <span className="min-w-0 flex-1">
              <span className="line-clamp-1 break-all">{txnLabel(n, a)}</span>
              <span className="line-clamp-1 text-sm text-muted">{txnMeta(n, a)}</span>
            </span>
            <span className={cx("tnum shrink-0 font-bold", l > 0 && "text-leaf", l < 0 && "text-skin")}>
              {l > 0 ? "+" : l < 0 ? "−" : ""}
              {money(n.amount)}
            </span>
            <span className="shrink-0 pt-0.5 text-muted" aria-hidden>
              ›
            </span>
          </a>
        );
      })}
    </List>
  );
}
