const timeZone = "Asia/Taipei";

export function today_() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function parseDate(e) {
  let [t, a, n] = e.split("-").map(Number);
  return new Date(Date.UTC(t, a - 1, n));
}

function isoDate(e) {
  return e.toISOString().slice(0, 10);
}

export function addDays(e, t) {
  let a = parseDate(e);
  a.setUTCDate(a.getUTCDate() + t);
  return isoDate(a);
}

export function weekday(e) {
  return parseDate(e).getUTCDay();
}

export const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export function monthStart(e) {
  return `${e.slice(0, 7)}-01`;
}

export function monthEnd(e) {
  let t = parseDate(monthStart(e));
  t.setUTCMonth(t.getUTCMonth() + 1);
  t.setUTCDate(0);
  return isoDate(t);
}

export function addMonths(e, t) {
  let a = parseDate(monthStart(e));
  a.setUTCMonth(a.getUTCMonth() + t);
  return isoDate(a);
}

export function weekStart(e) {
  let t = weekday(e);
  return addDays(e, t === 0 ? -6 : 1 - t);
}

export function shortDate(e) {
  let [, t, a] = e.split("-");
  return `${Number(t)}/${Number(a)}`;
}

export function dateLabel(e) {
  let [t, a, n] = e.split("-");
  return `${t} \u5E74 ${Number(a)} \u6708 ${Number(n)} \u65E5\uFF08${WEEKDAYS[weekday(e)]}\uFF09`;
}

export function monthLabel(e) {
  let [t, a] = e.split("-");
  return `${t} \u5E74 ${Number(a)} \u6708`;
}

const fmtInt = new Intl.NumberFormat("zh-TW", {
  maximumFractionDigits: 0
});

const fmtDec = new Intl.NumberFormat("zh-TW", {
  maximumFractionDigits: 2
});

export function money(e) {
  let t = Number(e ?? 0);
  return (t < 0 ? "−$" : "$") + fmtInt.format(Math.abs(Math.round(t)));
}

export function num(e) {
  return fmtDec.format(Number(e ?? 0));
}

export function pct(e) {
  if (e == null || !isFinite(e)) {
    return "—";
  }
  return `${Math.round(e * 100)}%`;
}
