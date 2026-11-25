import * as React from "react";
import { evalFormula, looksLikeFormula } from "../lib/calc.js";
import { money } from "../lib/format.js";
import { goBack } from "../lib/router.js";
import { DbError } from "../lib/supabase.js";

export function cx(...e) {
  return e.filter(Boolean).join(" ");
}

export function Page({ title, backTo, actions, children, wide }) {
  return (
    <div className={cx("mx-auto w-full px-4 pb-28 pt-3 md:pb-10", wide ? "max-w-5xl" : "max-w-2xl")}>
      <header className="mb-4 flex min-h-12 items-center gap-2">
        {backTo !== undefined && (
          <button
            onClick={() => goBack(backTo)}
            aria-label="返回"
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-2xl hover:bg-sunk"
          >
            ‹
          </button>
        )}
        <h1 className="flex-1 text-[1.4rem] font-bold leading-tight">{title}</h1>
        {actions}
      </header>
      {children}
    </div>
  );
}

export function Section({ title, aside, children, className, id }) {
  return (
    <section id={id} className={cx("mb-6", className)}>
      {(title || aside) && (
        <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
          {title && <h2 className="text-base font-bold text-muted">{title}</h2>}
          {aside && <span className="section-aside -my-2 shrink-0">{aside}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Card({ children, className, onClick }) {
  const Component = onClick ? "button" : "div";
  return (
    <Component
      onClick={onClick}
      className={cx("block w-full rounded-2xl bg-card p-4 text-left", onClick && "active:bg-sunk", className)}
    >
      {children}
    </Component>
  );
}

export function Btn({ kind = "secondary", children, onClick, type = "button", disabled, className, big, href }) {
  let c = cx(
    "inline-flex items-center justify-center gap-2 rounded-xl font-bold select-none disabled:opacity-50",
    big ? "min-h-14 px-5 text-lg" : "min-h-11 px-4 text-base",
    kind === "primary" && "bg-flesh text-on-flesh active:brightness-95",
    kind === "secondary" && "border-[1.5px] border-line bg-card active:bg-sunk",
    kind === "danger" && "bg-skin-soft text-skin active:brightness-95",
    kind === "ghost" && "text-flesh-ink active:bg-sunk",
    className
  );
  if (href) {
    return (
      <a href={href} className={c}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={c}>
      {children}
    </button>
  );
}

export function Field({ label: label_1, children, hint, error, className }) {
  return (
    <label className={cx("mb-4 block", className)}>
      <span className="mb-1.5 block text-[0.95rem] font-bold">{label_1}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-sm font-bold text-warn">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-sm text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export function MoneyInput({ value, onChange, placeholder = "0", autoFocus, className, compact, salary }) {
  let o = looksLikeFormula(value) ? evalFormula(value) : null;
  return (
    <div className={className}>
      <div className="relative">
        <span
          className={cx(
            "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2",
            salary ? "text-salary" : "text-muted"
          )}
        >
          $
        </span>
        <input
          className={cx(
            "field tnum pl-7 text-right",
            salary && "field-salary",
            compact ? "text-lg" : "text-xl font-bold"
          )}
          inputMode="decimal"
          enterKeyHint="next"
          autoComplete="off"
          placeholder={placeholder}
          autoFocus={autoFocus}
          value={value}
          onChange={(c) => onChange(c.target.value)}
        />
      </div>
      {looksLikeFormula(value) && (
        <div className={cx("mt-1 text-right text-sm", o === null ? "font-bold text-warn" : "text-muted")}>
          {o === null ? "算式看不懂，請檢查" : `= ${money(o)}`}
        </div>
      )}
    </div>
  );
}

export function parseMoney(e) {
  let t = e.trim();
  if (!t) {
    return {
      amount: 0,
      formula: null,
    };
  }
  let a = evalFormula(t);
  if (a === null) {
    return null;
  }
  return {
    amount: a,
    formula: looksLikeFormula(t) ? t.replace(/\s/g, "") : null,
  };
}

export function Segmented({ value, onChange, options, className }) {
  return (
    <div role="radiogroup" className={cx("flex rounded-xl bg-sunk p-1", className)}>
      {options.map((l) => (
        <button
          key={l.value}
          type="button"
          role="radio"
          aria-checked={l.value === value}
          onClick={() => onChange(l.value)}
          className={cx(
            "min-h-10 flex-1 rounded-lg px-2 text-[0.95rem] font-bold",
            l.value === value ? "bg-card shadow-sm" : "text-muted"
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

export function Chips({ value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((n) => (
        <button
          key={n.value}
          type="button"
          aria-pressed={n.value === value}
          onClick={() => onChange(n.value === value ? null : n.value)}
          className={cx(
            "min-h-10 rounded-full border-[1.5px] px-4 font-bold",
            n.value === value ? "border-flesh bg-flesh-soft text-flesh-ink" : "border-line bg-card text-muted"
          )}
        >
          {n.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="mb-4 flex min-h-11 w-full items-center gap-3 text-left"
    >
      <span className="flex-1">
        <span className="block font-bold">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
      <span
        className={cx("relative h-7 w-12 shrink-0 rounded-full transition-colors", checked ? "bg-leaf" : "bg-line")}
      >
        <span
          className={cx(
            "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all",
            checked ? "left-[1.4rem]" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}

export function Loading({ text = "載入中…" }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-12 text-muted">
      <span className="h-5 w-5 animate-spin rounded-full border-[3px] border-line border-t-flesh" />
      {text}
    </div>
  );
}

export function Empty({ text, action }) {
  return (
    <div className="rounded-2xl border-[1.5px] border-dashed border-line px-4 py-5 text-center">
      <p className={cx("text-muted", action ? "mb-3" : "")}>{text}</p>
      {action}
    </div>
  );
}

export function ErrorBox({ text, onRetry }) {
  return (
    <div role="alert" className="rounded-2xl bg-warn-soft p-4 text-warn">
      <p className="font-bold">{text}</p>
      {onRetry && (
        <Btn kind="ghost" className="mt-2 -ml-3 text-warn" onClick={onRetry}>
          重新載入
        </Btn>
      )}
    </div>
  );
}

export function QueryView({ q, empty, loadingText, children }) {
  if (q.loading && !q.data) {
    return <Loading text={loadingText} />;
  }
  if (q.error) {
    return <ErrorBox text={q.error} onRetry={q.reload} />;
  }
  if (!q.data) {
    return null;
  }
  let l = empty?.(q.data);
  if (l) {
    return <>{l}</>;
  }
  return <>{children(q.data)}</>;
}

export function Money({ value, tone, className }) {
  let n = tone ?? "plain";
  let l =
    n === "in" ? "text-leaf" : n === "out" ? "text-skin" : n === "auto" ? (value < 0 ? "text-warn" : "text-leaf") : "";
  return <span className={cx("tnum whitespace-nowrap", l, className)}>{money(value)}</span>;
}

export function Badge({ children, tone = "muted" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold",
        {
          muted: "bg-sunk text-muted",
          warn: "bg-warn-soft text-warn",
          leaf: "bg-leaf-soft text-leaf",
          flesh: "bg-flesh-soft text-flesh-ink",
          skin: "bg-skin-soft text-skin",
        }[tone]
      )}
    >
      {children}
    </span>
  );
}

export function Row({ label, value, sub, onClick, strong }) {
  const Component = onClick ? "button" : "div";
  return (
    <Component
      onClick={onClick}
      className={cx(
        "flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-b-0",
        onClick && "active:bg-sunk",
        strong && "font-bold"
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate">{label}</span>
        {sub && <span className="line-clamp-2 block text-sm text-muted">{sub}</span>}
      </span>
      {value !== undefined && <span className="shrink-0 text-right">{value}</span>}
      {onClick && (
        <span className="text-muted" aria-hidden>
          ›
        </span>
      )}
    </Component>
  );
}

export function List({ children, className }) {
  return <div className={cx("overflow-hidden rounded-2xl bg-card", className)}>{children}</div>;
}

export function Sheet({ open, onClose, title, children }) {
  React.useEffect(() => {
    if (!open) {
      return;
    }
    let l = (s) => {
      if (s.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", l);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", l);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (open) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" onClick={onClose}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="sheet-in safe-bottom max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-bg p-4 md:rounded-3xl"
          onClick={(l) => l.stopPropagation()}
        >
          <div className="mb-3 flex items-center">
            <h2 className="flex-1 text-xl font-bold">{title}</h2>
            <button onClick={onClose} aria-label="關閉" className="h-11 w-11 rounded-full text-2xl hover:bg-sunk">
              ×
            </button>
          </div>
          {children}
        </div>
      </div>
    );
  }
  return null;
}

const FeedbackContext = React.createContext(null);

export function FeedbackProvider({ children }) {
  let [t, setT] = React.useState([]);
  let [n, setN] = React.useState(null);
  let sRef = React.useRef(0);
  let toast = React.useCallback((b, m = "ok") => {
    let d = ++sRef.current;
    setT((r) => [
      ...r.filter((y) => y.kind !== "info"),
      {
        id: d,
        text: b,
        kind: m,
      },
    ]);
    if (m !== "info") {
      setTimeout(() => setT((r) => r.filter((y) => y.id !== d)), m === "error" ? 5000 : 2200);
    }
  }, []);
  let confirm = React.useCallback(
    (b, m) =>
      new Promise((resolve) =>
        setN({
          text: b,
          okText: m?.okText ?? "確定",
          danger: m?.danger ?? true,
          resolve,
        })
      ),
    []
  );
  let c = (b) => {
    n?.resolve(b);
    setN(null);
  };
  return (
    <FeedbackContext.Provider
      value={{
        toast,
        confirm,
      }}
    >
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {t.map((b) => (
          <div
            key={b.id}
            className={cx(
              "toast-in pointer-events-auto rounded-xl px-5 py-3 font-bold shadow-lg",
              b.kind === "ok" && "bg-leaf text-white",
              b.kind === "error" && "bg-warn text-white",
              b.kind === "info" && "bg-ink text-bg"
            )}
          >
            {b.kind === "ok" && "✓ "}
            {b.text}
          </div>
        ))}
      </div>
      {n && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-6" onClick={() => c(false)}>
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-3xl bg-card p-5"
            onClick={(b) => b.stopPropagation()}
          >
            <p className="mb-5 text-lg font-bold">{n.text}</p>
            <div className="flex gap-3">
              <Btn className="flex-1" onClick={() => c(false)}>
                取消
              </Btn>
              <Btn className="flex-1" kind={n.danger ? "danger" : "primary"} onClick={() => c(true)}>
                {n.okText}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  let e = React.useContext(FeedbackContext);
  if (!e) {
    throw new Error("FeedbackProvider missing");
  }
  return e;
}

export function useSaver() {
  let { toast } = useFeedback();
  let [saving, setSaving] = React.useState(false);
  let nRef = React.useRef(false);
  let run = React.useCallback(
    async (s, i = "已儲存") => {
      if (nRef.current) {
        return false;
      }
      nRef.current = true;
      setSaving(true);
      toast("儲存中…", "info");
      try {
        await s();
        toast(i, "ok");
        return true;
      } catch (error) {
        toast(error instanceof DbError ? error.friendly : "儲存失敗，請再試一次。", "error");
        return false;
      } finally {
        nRef.current = false;
        setSaving(false);
      }
    },
    [toast]
  );
  return {
    saving,
    run,
  };
}

export function RowActions({ onEdit, onDelete, deleteDisabled }) {
  let n = (s) => (i) => {
    i.preventDefault();
    i.stopPropagation();
    s?.();
  };
  let { toast } = useFeedback();
  return (
    <span className="flex shrink-0 gap-1.5">
      {onEdit && (
        <button
          type="button"
          onClick={n(onEdit)}
          className="min-h-9 rounded-lg border-[1.5px] border-line bg-card px-3 text-sm font-bold active:bg-sunk"
        >
          修改
        </button>
      )}
      {(onDelete || deleteDisabled) && (
        <button
          type="button"
          onClick={n(deleteDisabled ? () => toast(deleteDisabled, "error") : onDelete)}
          aria-disabled={!!deleteDisabled}
          className={cx(
            "min-h-9 rounded-lg px-3 text-sm font-bold",
            deleteDisabled ? "bg-sunk text-muted" : "bg-skin-soft text-skin active:brightness-95"
          )}
        >
          刪除
        </button>
      )}
    </span>
  );
}

export function useRemove() {
  let { confirm } = useFeedback();
  let { run } = useSaver();
  return React.useCallback(
    async (a, n, l) => {
      if (!(await confirm(a))) {
        return false;
      }
      let s = await run(n, "已刪除");
      if (s) {
        await l?.();
      }
      return s;
    },
    [confirm, run]
  );
}

export function Collapse({ id, title, summary, aside, defaultOpen = false, children }) {
  let i = `collapse:${id}`;
  let [o, setO] = React.useState(() => {
    try {
      let m = localStorage.getItem(i);
      if (m === null) {
        return defaultOpen;
      }
      return m === "1";
    } catch {
      return defaultOpen;
    }
  });
  return (
    <section className="mb-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() =>
            setO((m) => {
              try {
                localStorage.setItem(i, m ? "0" : "1");
              } catch {}
              return !m;
            })
          }
          aria-expanded={o}
          className="flex min-h-12 flex-1 items-center gap-2 rounded-2xl bg-card px-4 text-left active:bg-sunk"
        >
          <span className={cx("text-muted transition-transform", o && "rotate-90")} aria-hidden>
            ›
          </span>
          <span className="font-bold">{title}</span>
          {summary && <span className="tnum ml-auto text-right text-[0.95rem] text-muted">{summary}</span>}
        </button>
        {aside}
      </div>
      {o && <div className="mt-2">{children}</div>}
    </section>
  );
}
