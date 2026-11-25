import { db } from "./supabase.js";
import { writeXlsx } from "./xlsx.js";

export const BACKUP_KEY = "last_backup_at";

const BACKUP_TABLES = [["transactions", "記帳"], ["business_days", "營業日"], ["daily_item_counts", "地瓜數量"], ["purchase_orders", "進貨單"], ["purchase_lines", "進貨明細"], ["inventory_adjustments", "庫存調整"], ["market_plans", "攤位月曆"], ["markets", "市場"], ["accounts", "帳戶"], ["categories", "分類"], ["items", "品項"], ["suppliers", "供應商"], ["payers", "付款人"], ["app_settings", "設定"], ["import_batches", "匯入紀錄"]];

async function fetchAllRows(e) {
  let t = [];
  for (let offset = 0;; offset += 1000) {
    let l = await db.select(e, {
      order: "id",
      limit: 1000,
      offset
    });
    t.push(...l);
    if (l.length < 1000) {
      break;
    }
  }
  return t;
}

const l1 = e => {
  if (e == null) {
    return null;
  }
  if (typeof e === "number") {
    return e;
  }
  if (typeof e === "object") {
    return JSON.stringify(e);
  }
  return String(e);
};

export async function downloadBackup(setL) {
  let t = [];
  let a = {};
  for (let [n, l] of BACKUP_TABLES) {
    setL?.(`\u8B80\u53D6\u300C${l}\u300D\u2026`);
    let s = await fetchAllRows(n);
    a[l] = s.length;
    let i = [...new Set(s.flatMap(o => Object.keys(o)))];
    t.push({
      name: `${l}`.slice(0, 31),
      rows: [i.length ? i : ["（沒有資料）"], ...s.map(o => i.map(c => l1(o[c])))],
      widths: i.map(o => {
        if (o.endsWith("_id") || o === "id") {
          return 14;
        }
        return 12;
      }),
      boldRows: [0]
    });
  }
  t.unshift({
    name: "說明",
    rows: [["地瓜營運記帳 完整備份"], ["備份時間", new Date().toLocaleString("zh-TW", {
      timeZone: "Asia/Taipei"
    })], ["說明", "每一頁是資料庫的一張表，包含已刪除的資料（deleted_at 有日期 = 已刪除）。需要復原時把這個檔案交給管理者。"], [], ["資料表", "筆數"], ...Object.entries(a).map(([n, l]) => [n, l])],
    widths: [16, 60],
    boldRows: [0, 4]
  });
  return {
    blob: await writeXlsx(t),
    counts: a
  };
}

export async function markBackedUp(e) {
  let t = new Date().toISOString();
  if (e) {
    await db.update("app_settings", {
      value: t
    }, [["id", `eq.${e}`]]);
  } else {
    await db.insert("app_settings", {
      key: BACKUP_KEY,
      value: t
    });
  }
}
