import * as React from "react";
import {
  Badge,
  Btn,
  Card,
  Empty,
  Field,
  List,
  Money,
  MoneyInput,
  Page,
  QueryView,
  Row,
  RowActions,
  Section,
  Segmented,
  Sheet,
  Toggle,
  cx,
  parseMoney,
  useFeedback,
  useRemove,
  useSaver,
} from "../components/ui.jsx";
import { BACKUP_KEY, downloadBackup, markBackedUp } from "../lib/backup.js";
import {
  WEEKDAYS,
  addDays,
  addMonths,
  dateLabel,
  money,
  monthEnd,
  monthLabel,
  monthStart,
  shortDate,
  today_,
  weekday,
} from "../lib/format.js";
import { ACCOUNT_KIND_LABELS, TIER_LABELS } from "../lib/models.js";
import { Wr, eo } from "../lib/report.js";
import { navigate } from "../lib/router.js";
import { useQuery, useStore } from "../lib/store.jsx";
import { auth, db, eq, getConfig, gte, hasBuiltinConfig, inList, isNull, lte, saveConfig } from "../lib/supabase.js";
import { download_, writeXlsx } from "../lib/xlsx.js";
import { Import } from "./Import.jsx";
import { uh } from "./Reports.jsx";

export function Settings({ route }) {
  let [t, a] = route.parts.slice(1);
  switch (t) {
    case "markets":
      if (a) {
        return <MarketDetail id={a} />;
      }
      return <W11 />;
    case "categories":
      return <CrudList cfg={CATEGORY_CFG} />;
    case "accounts":
      return <CrudList cfg={ACCOUNT_CFG} />;
    case "payers":
      return <CrudList cfg={PAYER_CFG} />;
    case "recurring":
      return <CrudList cfg={RECURRING_CFG} />;
    case "items":
      return <CrudList cfg={ITEM_CFG} />;
    case "suppliers":
      return <CrudList cfg={SUPPLIER_CFG} />;
    case "import":
      return <Import />;
    case "export":
      return <M1Component />;
    case "backup":
      return <C1Component />;
    case "batches":
      return <A1Component />;
    case "connection":
      return <ConnectionSettings />;
    default:
      return <SettingsHome />;
  }
}

const THEMES = [
  {
    id: "potato",
    name: "烤地瓜",
    sub: "原本的，跟著手機深淺色",
    bg: "#f2eff4",
    card: "#ffffff",
    accent: "#f0a43a",
    ink: "#2a1f2d",
  },
  {
    id: "fresh",
    name: "清爽白綠",
    sub: "白底、綠色按鈕",
    bg: "#f4f7f5",
    card: "#ffffff",
    accent: "#24865b",
    ink: "#1b2a23",
  },
  {
    id: "milk",
    name: "溫暖奶茶",
    sub: "米白底、焦糖色",
    bg: "#f6efe4",
    card: "#fffcf7",
    accent: "#a8651d",
    ink: "#3a2a1d",
  },
  {
    id: "night",
    name: "深色夜市",
    sub: "晚上收攤不刺眼",
    bg: "#121015",
    card: "#1f1c24",
    accent: "#f5a33b",
    ink: "#f3eff5",
  },
];

function applyTheme(e) {
  if (e === "potato") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", e);
  }
  try {
    localStorage.setItem("app_theme", e);
  } catch {}
  let t = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t || "#7a3350");
}

function ThemePicker() {
  let [e, setE] = React.useState(() => document.documentElement.getAttribute("data-theme") || "potato");
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="外觀">
      {THEMES.map((a) => (
        <button
          key={a.id}
          type="button"
          role="radio"
          aria-checked={e === a.id}
          onClick={() => {
            applyTheme(a.id);
            setE(a.id);
          }}
          className={cx("rounded-2xl border-[2.5px] p-2 text-left", e === a.id ? "border-flesh" : "border-transparent")}
        >
          <div
            className="mb-2 flex h-16 items-end gap-1.5 rounded-xl p-2"
            style={{
              background: a.bg,
            }}
          >
            <div
              className="h-10 flex-1 rounded-lg p-1.5"
              style={{
                background: a.card,
              }}
            >
              <div
                className="h-1.5 w-3/4 rounded"
                style={{
                  background: a.ink,
                  opacity: 0.7,
                }}
              />
              <div
                className="mt-1 h-1.5 w-1/2 rounded"
                style={{
                  background: a.ink,
                  opacity: 0.3,
                }}
              />
            </div>
            <div
              className="h-6 w-10 rounded-lg"
              style={{
                background: a.accent,
              }}
            />
          </div>
          <div className="font-bold">
            {e === a.id ? "✓ " : ""}
            {a.name}
          </div>
          <div className="text-sm text-muted">{a.sub}</div>
        </button>
      ))}
    </div>
  );
}

function SettingsHome() {
  let e = useStore();
  let { confirm } = useFeedback();
  let a = [
    ["#/settings/markets", "攤位租金月曆", `${e.markets.filter((n) => n.is_active).length} \u500B\u5E02\u5834`],
    ["#/settings/categories", "收支分類", `${e.categories.filter((n) => n.is_active).length} \u500B\u5206\u985E`],
    [
      "#/settings/accounts",
      "帳戶",
      e.accounts
        .filter((n) => n.is_active)
        .map((n) => n.name)
        .join("、"),
    ],
    [
      "#/settings/payers",
      "付款人",
      e.payers
        .filter((n) => n.is_active)
        .map((n) => n.name)
        .join("、"),
    ],
    [
      "#/settings/items",
      "品項",
      e.items
        .filter((n) => n.is_active)
        .map((n) => n.name)
        .join("、"),
    ],
    [
      "#/settings/suppliers",
      "供應商",
      e.suppliers
        .filter((n) => n.is_active)
        .map((n) => n.name)
        .join("、"),
    ],
    [
      "#/settings/recurring",
      "固定每月自動記帳",
      e.recurring
        .filter((n) => n.is_active)
        .map((n) => `${n.name}\uFF08\u6BCF\u6708 ${n.day_of_month} \u865F\uFF09`)
        .join("、") || "例如汽車貸款每月自動扣款",
    ],
  ];
  return (
    <Page title="設定">
      <Section title="外觀">
        <ThemePicker />
      </Section>
      <Section title="基本資料">
        <List>
          {a.map(([n, l, sub]) => (
            <Row
              key={n}
              label={l}
              sub={sub}
              onClick={() => {
                location.hash = n;
              }}
            />
          ))}
        </List>
      </Section>
      <Section title="資料">
        <List>
          <Row
            label="逐筆對帳（打勾確認、修改金額）"
            sub="例如停車費、加油費，一筆一筆核對"
            onClick={() => navigate("/reconcile?cat=PARKING")}
          />
          <Row
            label="一鍵備份（整個資料庫）"
            sub={backupAgo(e.settings[BACKUP_KEY])}
            onClick={() => navigate("/settings/backup")}
          />
          <Row label="帳戶餘額與明細" onClick={() => navigate("/accounts")} />
          <Row
            label="每月攤位收支明細表"
            sub="各攤位賺多少、每天明細；下載 Excel 或存 PDF"
            onClick={() => navigate("/stall-month")}
          />
          <Row
            label="Excel 匯出"
            sub="記帳明細、收支明細表、每月明細、進貨、帳戶"
            onClick={() => navigate("/settings/export")}
          />
          <Row
            label="Excel 匯入"
            sub="上傳 → 預覽 → 對應欄位 → 確認後才寫入"
            onClick={() => navigate("/settings/import")}
          />
          <Row label="匯入紀錄" sub="可整批撤銷" onClick={() => navigate("/settings/batches")} />
        </List>
      </Section>
      <Section title="帳號">
        <List>
          <Row label="連線與登入" sub={auth.session?.email} onClick={() => navigate("/settings/connection")} />
        </List>
        <Card className="mt-3">
          <p className="mb-3 text-[0.95rem]">
            在別人的電腦或手機用完，請記得<b>登出</b>。自己的手機請設定螢幕鎖。
          </p>
          <Btn
            className="w-full"
            onClick={async () => {
              if (
                await confirm("確定要登出嗎？", {
                  danger: false,
                  okText: "登出",
                })
              ) {
                auth.signOut();
              }
            }}
          >
            登出
          </Btn>
        </Card>
      </Section>
      <Section title="版本">
        <Card>
          <p className="mb-3 text-[0.95rem]">
            目前版本：
            <b className="tnum">{document.querySelector('meta[name="app-build"]')?.getAttribute("content") ?? "—"}</b>
          </p>
          <Btn className="w-full" onClick={reloadLatest}>
            重新載入最新版
          </Btn>
          <p className="mt-2 text-sm text-muted">畫面沒更新時按這裡。帳務資料都在雲端，不會因此不見。</p>
        </Card>
      </Section>
      <p className="text-center text-sm text-muted">🍠 地瓜營運記帳 v1.0</p>
    </Page>
  );
}

function CrudList({ cfg }) {
  let t = useStore();
  let { confirm } = useFeedback();
  let [n, setN] = React.useState(null);
  let s = cfg.rows(t);
  let i = cfg.group ? [...new Set(s.map(cfg.group))] : [""];
  let { saving, run } = useSaver();
  let [b, setB] = React.useState(null);
  let d = (p) => {
    let g = s.filter((f) => !cfg.group || cfg.group(f) === p);
    if (b?.[p]) {
      return b[p].map((f) => g.find((k) => String(k.id) === f)).filter((f) => !!f);
    }
    return g;
  };
  let r = () => setB(Object.fromEntries(i.map((p) => [p, d(p).map((g) => String(g.id))])));
  let y =
    b !== null &&
    i.some((p) => {
      let g = s.filter((f) => !cfg.group || cfg.group(f) === p).map((f) => String(f.id));
      return (b[p] ?? g).join() !== g.join();
    });
  function h(p, g, f) {
    if (!b) {
      return;
    }
    let k = [...b[p]];
    let M = g + f;
    if (!(M < 0 || M >= k.length)) {
      [k[g], k[M]] = [k[M], k[g]];
      setB({
        ...b,
        [p]: k,
      });
    }
  }
  async function v() {
    if (!b) {
      return;
    }
    if (
      await run(async () => {
        for (let g of i) {
          let f = d(g);
          for (let k = 0; k < f.length; k++) {
            let sort_order = (k + 1) * 10;
            if (Number(f[k].sort_order) !== sort_order) {
              await db.update(
                cfg.table,
                {
                  sort_order,
                },
                [eq("id", String(f[k].id))]
              );
            }
          }
        }
        await t.reload();
      }, "已儲存順序")
    ) {
      setB(null);
    }
  }
  async function _() {
    if (
      !(
        y &&
        !(await confirm("排好的順序還沒儲存，確定要放棄嗎？", {
          okText: "放棄",
        }))
      )
    ) {
      setB(null);
    }
  }
  let u =
    "flex h-9 w-10 items-center justify-center rounded-lg border border-line text-lg disabled:opacity-25 active:bg-sunk";
  return (
    <Page
      title={cfg.title}
      backTo="/settings"
      actions={
        b ? undefined : (
          <span className="flex gap-2">
            {cfg.sortable && s.length > 1 && <Btn onClick={r}>調整順序</Btn>}
            <Btn kind="primary" onClick={() => setN(cfg.defaults())}>
              ＋新增
            </Btn>
          </span>
        )
      }
    >
      {b && (
        <p className="mb-3 rounded-2xl bg-flesh-soft p-3 text-flesh-ink">
          用 ↑↓ 排好順序，可以一次改很多個，排完按下面的「<b>儲存順序</b>」才會存。
        </p>
      )}
      {s.length === 0 && <Empty text="還沒有資料" />}
      {i.map((p) => {
        let g = d(p);
        return (
          <Section key={p} title={p || undefined}>
            <List>
              {g.map((f, k) => (
                <Row
                  key={String(f.id)}
                  onClick={b ? undefined : () => setN(f)}
                  label=<span className="flex items-center gap-2">
                    {b && <span className="tnum w-6 text-muted">{k + 1}.</span>}
                    {cfg.label(f)}
                    {f.is_active === false && <Badge>已停用</Badge>}
                  </span>
                  sub={cfg.sub?.(f, t)}
                  value={
                    b ? (
                      <span className="flex gap-1.5">
                        <button
                          type="button"
                          aria-label="往上移"
                          disabled={k === 0}
                          onClick={() => h(p, k, -1)}
                          className={u}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label="往下移"
                          disabled={k === g.length - 1}
                          onClick={() => h(p, k, 1)}
                          className={u}
                        >
                          ↓
                        </button>
                      </span>
                    ) : undefined
                  }
                />
              ))}
            </List>
          </Section>
        );
      })}
      {b && (
        <div className="sticky bottom-20 z-10 mt-4 flex gap-2 rounded-2xl bg-card p-3 shadow-lg md:bottom-4">
          <Btn className="flex-1" onClick={_}>
            取消
          </Btn>
          <Btn kind="primary" className="flex-[2]" disabled={!y || saving} onClick={v}>
            {saving ? "儲存中…" : "儲存順序"}
          </Btn>
        </div>
      )}
      {n && <CrudForm cfg={cfg} row={n} onClose={() => setN(null)} />}
    </Page>
  );
}

function CrudForm({ cfg, row, onClose }) {
  let n = useStore();
  let l = useRemove();
  let { saving, run } = useSaver();
  let [o, setO] = React.useState(row);
  let [b, setB] = React.useState(null);
  let d = !row.id;
  async function r() {
    if (cfg.table === "categories" && !String(o.report_group ?? "").trim()) {
      o.report_group = o.name;
    }
    let y = cfg.fields.find((_) => _.required && (o[_.key] === "" || o[_.key] === null || o[_.key] === undefined));
    if (y) {
      setB(`\u8ACB\u586B\u5BEB\u300C${y.label}\u300D`);
      return;
    }
    let h = {};
    cfg.fields.forEach((_) => {
      let u = o[_.key];
      h[_.key] =
        _.nullable && (u === "" || u === null || u === undefined)
          ? null
          : _.type === "number" || _.numeric
          ? Number(u || 0)
          : _.type === "select" || _.type === "date" || _.type === "text"
          ? u === ""
            ? null
            : u
          : !!u;
    });
    if ("is_active" in o) {
      h.is_active = o.is_active;
    }
    if (
      await run(() => {
        if (d) {
          return db.insert(cfg.table, h);
        }
        return db.update(cfg.table, h, [eq("id", String(row.id))]);
      })
    ) {
      await n.reload();
      onClose();
    }
  }
  return (
    <Sheet open onClose={onClose} title={d ? `\u65B0\u589E${cfg.title}` : `\u4FEE\u6539${cfg.title}`}>
      {cfg.fields.map((y) => {
        let disabled = !d && y.locked?.(row);
        let v = o[y.key];
        if (y.type === "bool") {
          return (
            <Toggle
              key={y.key}
              checked={!!v}
              onChange={(_) =>
                setO({
                  ...o,
                  [y.key]: _,
                })
              }
              label={y.label}
              hint={y.hint}
            />
          );
        }
        return (
          <Field key={y.key} label={y.label} hint={disabled ? "系統使用中，不能修改" : y.hint}>
            {y.type === "select" ? (
              <select
                className="field"
                disabled={disabled}
                value={String(v ?? "")}
                onChange={(_) =>
                  setO({
                    ...o,
                    [y.key]: _.target.value,
                  })
                }
              >
                {y.options(n).map((_) => (
                  <option key={_.value} value={_.value}>
                    {_.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="field"
                disabled={disabled}
                type={y.type === "date" ? "date" : "text"}
                inputMode={y.type === "number" ? "decimal" : undefined}
                value={v == null ? "" : String(v)}
                onChange={(_) =>
                  setO({
                    ...o,
                    [y.key]: _.target.value,
                  })
                }
              />
            )}
          </Field>
        );
      })}
      {!d && (
        <Toggle
          checked={o.is_active !== false}
          onChange={(is_active) =>
            setO({
              ...o,
              is_active,
            })
          }
          label="啟用"
          hint="停用後不會出現在選單，但舊資料保留"
        />
      )}
      {b && (
        <p role="alert" className="mb-3 font-bold text-warn">
          {b}
        </p>
      )}
      <Btn kind="primary" big className="w-full" onClick={r} disabled={saving}>
        {saving ? "儲存中…" : "儲存"}
      </Btn>
      {!d &&
        (cfg.cantDelete?.(row) ? (
          <p className="mt-3 text-center text-sm text-muted">{cfg.cantDelete(row)}</p>
        ) : (
          <Btn
            kind="danger"
            className="mt-3 w-full"
            onClick={() =>
              l(
                `\u78BA\u5B9A\u8981\u522A\u9664\u300C${String(
                  row.name
                )}\u300D\u55CE\uFF1F\u4EE5\u524D\u7528\u5230\u5B83\u7684\u8A18\u5E33\u6703\u4FDD\u7559\u3002`,
                () => db.softDelete(cfg.table, String(row.id)),
                async () => {
                  await n.reload();
                  onClose();
                }
              )
            }
          >
            刪除
          </Btn>
        ))}
    </Sheet>
  );
}

const sa = (e, t) => e[t];

const h1 = (e) => [
  {
    value: "1",
    label: "營業（收入／營業支出）",
  },
  {
    value: "2",
    label: "生財器具與固定支出（只限支出）",
  },
  {
    value: "3",
    label: "生活開銷／家庭收入（不算進生意）",
  },
  {
    value: "4",
    label: "帳戶費用：只從帳戶扣，不列入損益（例如郵局手續費）",
  },
  {
    value: "0",
    label: "非營業收入（只限收入）",
  },
];

var CATEGORY_CFG = {
  table: "categories",
  title: "收支分類",
  fields: [
    {
      key: "name",
      label: "名稱",
      type: "text",
      required: true,
    },
    {
      key: "kind",
      label: "收入或支出",
      type: "select",
      options: () => [
        {
          value: "expense",
          label: "支出",
        },
        {
          value: "income",
          label: "收入",
        },
      ],
      locked: (e) => !!e.is_system,
    },
    {
      key: "tier",
      label: "損益層級",
      type: "select",
      numeric: true,
      options: h1,
      locked: (e) => !!e.is_system,
    },
    {
      key: "report_group",
      label: "報表群組（可以空白）",
      type: "text",
      hint: "空白 = 跟名稱一樣，報表自己一行。想跟別的項目合併成一行，就填那一行的名稱（例如「買菜」填「餐費」，報表就算在餐費裡）",
    },
    {
      key: "sort_order",
      label: "排序",
      type: "number",
    },
    {
      key: "show_in_daily",
      label: "顯示在每日記帳畫面",
      type: "bool",
    },
  ],
  defaults: () => ({
    name: "",
    kind: "expense",
    tier: "1",
    report_group: "",
    sort_order: 50,
    show_in_daily: false,
  }),
  rows: (e) => e.categories,
  label: (e) => sa(e, "name"),
  sub: (e) =>
    `\u5831\u8868\uFF1A${sa(e, "report_group")}${e.show_in_daily ? "・每日畫面" : ""}${e.is_system ? "・系統" : ""}`,
  group: (e) => `${e.kind === "income" ? "收入" : "支出"}\u30FB${TIER_LABELS[Number(e.tier)]}`,
  cantDelete: (e) => {
    if (e.is_system) {
      return "這是系統計算要用的分類，不能刪除；可以按「修改」改名稱。";
    }
  },
  sortable: true,
};

var ACCOUNT_CFG = {
  table: "accounts",
  title: "帳戶",
  fields: [
    {
      key: "name",
      label: "名稱",
      type: "text",
      required: true,
    },
    {
      key: "kind",
      label: "種類",
      type: "select",
      options: () =>
        Object.entries(ACCOUNT_KIND_LABELS).map(([e, t]) => ({
          value: e,
          label: t,
        })),
    },
    {
      key: "is_business",
      label: "生意帳戶",
      type: "bool",
      hint: "關掉 = 個人帳戶（例如 Minnie 個人）",
    },
    {
      key: "opening_balance",
      label: "期初餘額",
      type: "number",
    },
    {
      key: "opening_date",
      label: "期初日期",
      type: "date",
    },
    {
      key: "sort_order",
      label: "排序",
      type: "number",
    },
  ],
  defaults: () => ({
    name: "",
    kind: "cash",
    is_business: true,
    opening_balance: 0,
    opening_date: today_(),
    sort_order: 50,
  }),
  rows: (e) => e.accounts,
  label: (e) => sa(e, "name"),
  sub: (e) => `${ACCOUNT_KIND_LABELS[sa(e, "kind")]}\u30FB\u671F\u521D ${money(Number(e.opening_balance))}`,
  group: (e) => {
    if (e.is_business) {
      return "生意帳戶";
    }
    return "個人帳戶";
  },
  cantDelete: (e) => {
    if (e.code === "CASH_BOX") {
      return "每日記帳要用這個帳戶，不能刪除；可以按「修改」改名稱。";
    }
  },
};

var RECURRING_CFG = {
  table: "recurring_txns",
  title: "固定每月自動記帳",
  fields: [
    {
      key: "name",
      label: "名稱",
      type: "text",
      required: true,
      hint: "例如：樂天銀行-汽車貸款。有期數會自動加上（10/60）",
    },
    {
      key: "category_id",
      label: "分類",
      type: "select",
      required: true,
      options: (e) => [
        {
          value: "",
          label: "請選擇",
        },
        ...e.categories
          .filter((t) => t.kind === "expense" && t.is_active)
          .map((t) => ({
            value: t.id,
            label: t.name,
          })),
      ],
    },
    {
      key: "account_id",
      label: "從哪個帳戶扣",
      type: "select",
      required: true,
      options: (e) => [
        {
          value: "",
          label: "請選擇",
        },
        ...e.accounts
          .filter((t) => t.is_active)
          .map((t) => ({
            value: t.id,
            label: t.name,
          })),
      ],
    },
    {
      key: "amount",
      label: "每月金額",
      type: "number",
      required: true,
    },
    {
      key: "fee",
      label: "手續費（沒有填 0）",
      type: "number",
      hint: "會自動記一筆手續費，只從帳戶扣，不算進報表",
    },
    {
      key: "day_of_month",
      label: "每月幾號扣款（1–28）",
      type: "number",
      required: true,
    },
    {
      key: "first_month",
      label: "第 1 期是哪個月（填那個月的 1 號）",
      type: "date",
      required: true,
    },
    {
      key: "total_count",
      label: "總共幾期（沒有期限就空白）",
      type: "number",
      nullable: true,
    },
    {
      key: "is_active",
      label: "啟用（關掉就不會再自動記）",
      type: "bool",
    },
  ],
  defaults: () => ({
    name: "",
    category_id: "",
    account_id: "",
    amount: "",
    fee: 0,
    day_of_month: 1,
    first_month: `${today_().slice(0, 8)}01`,
    total_count: "",
    is_active: true,
  }),
  rows: (e) => e.recurring,
  label: (e) => sa(e, "name"),
  sub: (e, t) =>
    `\u6BCF\u6708 ${sa(e, "day_of_month")} \u865F\u30FB${t.acct(sa(e, "account_id"))?.name ?? ""} \u6263 ${money(
      Number(e.amount)
    )}${Number(e.fee) ? ` \uFF0B\u624B\u7E8C\u8CBB ${money(Number(e.fee))}` : ""}${
      e.total_count ? `\u30FB\u5171 ${sa(e, "total_count")} \u671F` : ""
    }`,
};

var PAYER_CFG = {
  table: "payers",
  title: "付款人",
  fields: [
    {
      key: "name",
      label: "名稱",
      type: "text",
      required: true,
    },
    {
      key: "default_wage",
      label: "日薪預設金額（家人幫忙才填）",
      type: "number",
      hint: "每天記帳勾「今天有來幫忙」時預先帶入的金額，當天可以改。只有阿嬤、姊這種領日薪的才有。",
    },
    {
      key: "sort_order",
      label: "排序",
      type: "number",
    },
  ],
  defaults: () => ({
    name: "",
    sort_order: 50,
  }),
  rows: (e) => e.payers,
  label: (e) => sa(e, "name"),
  sub: (e) => {
    if (e.wage_category_id) {
      return `\u65E5\u85AA ${money(Number(e.default_wage ?? 0))}\u30FB\u6708\u5E95\u7D50\u7B97`;
    }
    return "代墊用";
  },
};

var SUPPLIER_CFG = {
  table: "suppliers",
  title: "供應商",
  fields: [
    {
      key: "name",
      label: "名稱",
      type: "text",
      required: true,
    },
    {
      key: "contact_name",
      label: "聯絡人",
      type: "text",
    },
    {
      key: "phone",
      label: "電話",
      type: "text",
    },
    {
      key: "address",
      label: "地址",
      type: "text",
    },
    {
      key: "notes",
      label: "備註",
      type: "text",
    },
    {
      key: "sort_order",
      label: "排序",
      type: "number",
    },
  ],
  defaults: () => ({
    name: "",
    sort_order: 50,
  }),
  rows: (e) => e.suppliers,
  label: (e) => sa(e, "name"),
  sub: (e) => [sa(e, "phone"), sa(e, "notes")].filter(Boolean).join("・"),
};

var ITEM_CFG = {
  table: "items",
  title: "品項",
  fields: [
    {
      key: "name",
      label: "名稱",
      type: "text",
      required: true,
    },
    {
      key: "short_name",
      label: "簡稱（每日畫面用，例如 大）",
      type: "text",
    },
    {
      key: "unit",
      label: "單位",
      type: "text",
      required: true,
    },
    {
      key: "default_price",
      label: "預設單價",
      type: "number",
      hint: "進貨時自動帶入；庫存不足時也用這個價格估成本",
    },
    {
      key: "track_inventory",
      label: "計算庫存（地瓜）",
      type: "bool",
      hint: "關掉 = 買的時候直接算支出（紙袋、塑膠袋）",
    },
    {
      key: "expense_category_id",
      label: "不計庫存時算哪個支出分類",
      type: "select",
      options: (e) => [
        {
          value: "",
          label: "（不需要）",
        },
        ...e.categories
          .filter((t) => t.kind === "expense")
          .map((t) => ({
            value: t.id,
            label: t.name,
          })),
      ],
    },
    {
      key: "sort_order",
      label: "排序",
      type: "number",
    },
  ],
  defaults: () => ({
    name: "",
    unit: "包",
    default_price: 0,
    track_inventory: true,
    sort_order: 50,
    expense_category_id: "",
  }),
  rows: (e) => e.items,
  label: (e) => sa(e, "name"),
  sub: (e, t) =>
    `${money(Number(e.default_price))}\uFF0F${sa(e, "unit")}\u30FB${
      e.track_inventory
        ? "計算庫存"
        : `\u76F4\u63A5\u7B97\u652F\u51FA\uFF1A${t.cat(sa(e, "expense_category_id"))?.name ?? ""}`
    }`,
};

function W11() {
  let e = useStore();
  let [t, setT] = React.useState(false);
  let [n, setN] = React.useState(null);
  let s = e.markets.filter((c) => c.is_active);
  let i = e.markets.filter((c) => !c.is_active);
  let OComponent = (c) => (
    <Row
      key={c.id}
      onClick={() => navigate(`/settings/markets/${c.id}`)}
      label=<span className="flex items-center gap-2">
        {c.name}
        {!c.is_active && <Badge>已隱藏</Badge>}
      </span>
      sub={`${c.payment_method === "cash" ? "每次當場付現" : "整月預付"}\u30FB\u9810\u8A2D\u79DF\u91D1 ${money(
        c.default_rent
      )}${Number(c.default_electricity_fee) ? `\uFF0B\u96FB\u8CBB ${money(c.default_electricity_fee)}` : ""}`}
    />
  );
  return (
    <Page title="攤位租金月曆" backTo="/settings" wide>
      <div className="md:grid md:grid-cols-[1.4fr_1fr] md:gap-6">
        <PlanCalendar />
        <div>
          <Section
            title="目前使用的市場"
            aside=<Btn kind="ghost" onClick={() => setN(MARKET_CFG.defaults())}>
              ＋新增市場
            </Btn>
          >
            {s.length ? <List>{s.map(OComponent)}</List> : <Empty text="還沒有市場，按「＋新增市場」" />}
          </Section>
          {i.length > 0 && (
            <Section
              title={`\u5DF2\u96B1\u85CF\u7684\u820A\u5E02\u5834\uFF08${i.length}\uFF09`}
              aside=<button className="text-sm font-bold text-flesh-ink" onClick={() => setT(!t)}>
                {t ? "收起" : "顯示"}
              </button>
            >
              {t && <List>{i.map(OComponent)}</List>}
              {t && (
                <p className="mt-2 px-1 text-sm text-muted">
                  舊市場不會出現在選單，以前的報表仍會用到。要重新使用：按「修改」→ 打開「啟用」。
                </p>
              )}
            </Section>
          )}
        </div>
      </div>
      {n && <CrudForm cfg={MARKET_CFG} row={n} onClose={() => setN(null)} />}
    </Page>
  );
}

const TRAVEL = "出國";

const isTravel = (e) => !!e && !e.market_id && (e.note ?? "").startsWith(TRAVEL);

const E1 = (plan) => (plan.note ?? "").replace(/^出國[・：:\s]*/, "");

export function PlanCalendar({ compact } = {}) {
  let t = useStore();
  let a = useRemove();
  let { saving, run } = useSaver();
  let s = today_();
  let [i, setI] = React.useState(monthStart(s));
  let [c, setC] = React.useState(null);
  let [m, setM] = React.useState("day");
  let [r, setR] = React.useState("");
  let [h, setH] = React.useState({
    marketId: "",
    rent: "",
    elec: "",
    note: "",
  });
  let [_, set_] = React.useState(false);
  let p = useQuery(
    () =>
      db.select("market_plans", {
        where: [isNull("deleted_at"), gte("day", i), lte("day", monthEnd(i))],
        order: "day",
      }),
    [i]
  );
  let g = useQuery(async () => {
    let z = monthEnd(i);
    if (z < s) {
      return null;
    }
    let [left, rents, future] = await Promise.all([
      db.select("v_rent_prepaid"),
      db.select("transactions", {
        where: [isNull("deleted_at"), eq("daily_slot", "rent"), gte("txn_date", s)],
      }),
      db.select("market_plans", {
        where: [isNull("deleted_at"), gte("day", s), lte("day", z)],
        order: "day",
      }),
    ]);
    return {
      left,
      rents,
      future,
    };
  }, [i, s]);
  let k = (weekday(i) + 6) % 7;
  let length_1 = Number(monthEnd(i).slice(8));
  let T = [
    ...Array(k).fill(null),
    ...Array.from(
      {
        length: length_1,
      },
      (z, J) => addDays(i, J)
    ),
  ];
  let j = (z) => p.data?.find((J) => J.day === z) ?? null;
  let $ = t.markets.filter((z) => z.is_active);
  function G(z) {
    let plan = j(z);
    setH(
      plan
        ? {
            marketId: plan.market_id ?? (isTravel(plan) ? "TRAVEL" : "REST"),
            rent: String(Number(plan.rent)),
            elec: Number(plan.electricity_fee) ? String(Number(plan.electricity_fee)) : "",
            note: isTravel(plan) ? E1(plan) : plan.note ?? "",
          }
        : {
            marketId: "",
            rent: "",
            elec: "",
            note: "",
          }
    );
    setM("day");
    setR(z);
    setC({
      day: z,
      plan,
    });
  }
  function ie(z) {
    let J = t.market(z);
    setH({
      ...h,
      marketId: z,
      rent: J ? String(Number(J.default_rent)) : "",
      elec: J && Number(J.default_electricity_fee) ? String(Number(J.default_electricity_fee)) : "",
    });
  }
  let U = (day) => T.filter((J) => !!J && weekday(J) === weekday(day));
  let W = (day, J) => {
    let ge = [];
    for (let Oe = day; Oe <= J && ge.length < 62; Oe = addDays(Oe, 1)) {
      ge.push(Oe);
    }
    return ge;
  };
  let K = () => {
    if (c) {
      if (m === "month") {
        return U(c.day);
      }
      if (m === "range" && r > c.day) {
        return W(c.day, r);
      }
      return [c.day];
    }
    return [];
  };
  async function L() {
    if (!c || !h.marketId) {
      return;
    }
    let z = h.marketId === "TRAVEL";
    let J = h.marketId === "REST" || z;
    let note = z ? [TRAVEL, h.note.trim()].filter(Boolean).join("・") : h.note || null;
    let Oe = {
      market_id: J ? null : h.marketId,
      rent: J ? 0 : parseMoney(h.rent)?.amount ?? 0,
      electricity_fee: J ? 0 : parseMoney(h.elec)?.amount ?? 0,
      note,
    };
    let Tt = K();
    if (
      await run(
        async () => {
          let va = await db.select("market_plans", {
            where: [isNull("deleted_at"), gte("day", Tt[0]), lte("day", Tt[Tt.length - 1])],
          });
          let Ys = (Ra) => va.find(($l) => $l.day === Ra) ?? null;
          let Qs = Tt.filter((Ra) => !Ys(Ra)).map((day) => ({
            ...Oe,
            day,
          }));
          for (let Ra of Tt) {
            let $l = Ys(Ra);
            if ($l) {
              await db.update("market_plans", Oe, [eq("id", $l.id)]);
            }
          }
          if (Qs.length) {
            await db.insert("market_plans", Qs);
          }
        },
        Tt.length > 1 ? `\u5DF2\u5957\u7528 ${Tt.length} \u5929` : "已儲存"
      )
    ) {
      setC(null);
      p.reload();
    }
  }
  async function V() {
    let z = K();
    if (!z.length || !c) {
      return;
    }
    let J = await db
      .select("market_plans", {
        where: [isNull("deleted_at"), gte("day", z[0]), lte("day", z[z.length - 1])],
      })
      .then((ge) => ge.filter((Oe) => z.includes(Oe.day)));
    if (J.length) {
      await a(
        m === "month"
          ? `\u78BA\u5B9A\u8981\u522A\u9664\u9019\u500B\u6708\u6240\u6709\u9031${
              WEEKDAYS[weekday(c.day)]
            }\u7684\u5B89\u6392\u55CE\uFF1F\uFF08${J.length} \u5929\uFF09`
          : m === "range"
          ? `\u78BA\u5B9A\u8981\u522A\u9664 ${shortDate(z[0])}\u2013${shortDate(
              z[z.length - 1]
            )} \u7684\u5B89\u6392\u55CE\uFF1F\uFF08${J.length} \u5929\uFF09`
          : `\u78BA\u5B9A\u8981\u522A\u9664 ${shortDate(c.day)} \u7684\u5B89\u6392\u55CE\uFF1F`,
        async () => {
          for (let ge of J) {
            await db.softDelete("market_plans", ge.id);
          }
        },
        () => {
          setC(null);
          p.reload();
        }
      );
    }
  }
  let we = p.data ?? [];
  let set = new Set();
  if (g.data) {
    let z = new Set(g.data.rents.map((ge) => ge.txn_date));
    let J = new Map(
      g.data.left
        .filter((ge) => ge.payment_method === "transfer")
        .map((ge) => [ge.market_id, Number(ge.prepaid) - Number(ge.used)])
    );
    for (let ge of g.data.future) {
      if (!ge.market_id || z.has(ge.day)) {
        continue;
      }
      let Oe = J.get(ge.market_id) ?? 0;
      if (Oe + 0.5 >= Number(ge.rent) + Number(ge.electricity_fee)) {
        set.add(ge.day);
        J.set(ge.market_id, Oe - Number(ge.rent) - Number(ge.electricity_fee));
      } else {
        J.set(ge.market_id, 0);
      }
    }
  }
  let ft = (z) => set.has(z);
  let ua = new Set(g.data?.rents.map((z) => z.txn_date) ?? []);
  let st = (z) => z < s || ua.has(z);
  let E = we.filter((z) => z.market_id);
  let ue = [1, 2, 3, 4, 5, 6, 0]
    .map((w_1) => {
      let J = E.filter((Nt) => weekday(Nt.day) === w_1);
      let names = [...new Set(J.map((Nt) => t.market(Nt.market_id)?.name ?? "市場"))];
      let Oe = J.filter((Nt) => Nt.day >= s);
      let Tt = Oe.filter((Nt) => ft(Nt.day));
      return {
        w: w_1,
        days: J.length,
        names,
        rent: J.reduce((acc, item) => acc + Number(item.rent), 0),
        elec: J.reduce((acc, item) => acc + Number(item.electricity_fee), 0),
        preDays: Tt.length,
        preAmt: Tt.reduce((acc, item) => acc + Number(item.rent) + Number(item.electricity_fee), 0),
        futDays: Oe.length,
        futAmt: Oe.reduce((acc, item) => acc + Number(item.rent) + Number(item.electricity_fee), 0),
        cash: J.every((Nt) => t.market(Nt.market_id)?.payment_method === "cash"),
      };
    })
    .filter((z) => z.days > 0);
  let oe = ue.reduce((acc, item) => acc + item.rent, 0);
  let ye = ue.reduce((acc, item) => acc + item.elec, 0);
  let length = we.filter(isTravel).length;
  let tt = we.length - E.length - length;
  let it = ue.reduce((acc, item) => acc + item.preAmt, 0);
  let aa = ue.filter((z) => !z.cash).reduce((acc, item) => acc + item.futAmt, 0);
  let Ge = Number(i.slice(5, 7));
  return (
    <Section
      title={compact ? undefined : "月曆"}
      aside={
        compact ? (
          <a href="#/settings/markets" className="ml-auto text-sm font-bold text-flesh-ink">
            看統計明細、安排市場 ›
          </a>
        ) : undefined
      }
    >
      <Card className="mb-3 p-3">
        <div className="mb-2 flex items-center justify-between">
          <button
            className="h-11 w-11 rounded-full text-2xl active:bg-sunk"
            aria-label="上個月"
            onClick={() => setI(addMonths(i, -1))}
          >
            ‹
          </button>
          <span className="text-lg font-bold">{monthLabel(i)}</span>
          <button
            className="h-11 w-11 rounded-full text-2xl active:bg-sunk"
            aria-label="下個月"
            onClick={() => setI(addMonths(i, 1))}
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {["一", "二", "三", "四", "五", "六", "日"].map((z) => (
            <div key={z} className="pb-1 text-sm font-bold text-muted">
              {z}
            </div>
          ))}
          {T.map((z, J) => {
            if (!z) {
              return <div key={`b${J}`} />;
            }
            let ge = j(z);
            let Oe = ge?.market_id ? t.market(ge.market_id) : null;
            let Tt = isTravel(ge);
            return (
              <button
                key={z}
                type="button"
                onClick={() => G(z)}
                aria-label={`${z} ${ge ? (Oe ? Oe.name : Tt ? "出國" : "休息") : "未安排"}`}
                className={cx(
                  "flex min-h-16 flex-col items-center rounded-lg px-0.5 pt-1 text-left active:brightness-95",
                  ge
                    ? Oe
                      ? st(z)
                        ? "border-[1.5px] border-line bg-card"
                        : ft(z)
                        ? "bg-leaf-soft"
                        : "bg-flesh-soft"
                      : Tt
                      ? "bg-plan-soft"
                      : "bg-sunk"
                    : "border-[1.5px] border-dashed border-line",
                  z === s && "ring-2 ring-flesh"
                )}
              >
                <span className={cx("tnum text-sm", z === s ? "font-bold text-flesh-ink" : "text-muted")}>
                  {Number(z.slice(8))}
                </span>
                {ge && (
                  <span
                    className={cx(
                      "mt-0.5 line-clamp-2 text-center text-[0.72rem] font-bold leading-tight",
                      Oe ? (st(z) ? "text-muted" : "text-flesh-ink") : Tt ? "text-plan" : "text-muted"
                    )}
                  >
                    {Oe ? Oe.name : Tt ? "✈ 出國" : "休息"}
                  </span>
                )}
                {Oe && <span className="tnum text-[0.68rem] text-muted">{Number(ge.rent)}</span>}
                {Oe && st(z) && <span className="text-[0.62rem] font-bold leading-tight text-muted">已結清</span>}
                {Oe && !st(z) && ft(z) && (
                  <span className="text-[0.62rem] font-bold leading-tight text-leaf">已預付</span>
                )}
              </button>
            );
          })}
        </div>
        {p.error && <p className="mt-2 text-sm font-bold text-warn">{p.error}</p>}
        {compact ? (
          <div className="mt-3 flex items-baseline justify-between rounded-lg bg-flesh-soft px-3 py-2.5">
            <span className="font-bold text-flesh-ink">
              {Ge} 月租金合計<span className="ml-1 text-sm font-normal text-muted">出攤 {E.length} 天</span>
            </span>
            <span className="tnum text-lg font-bold text-flesh-ink">{money(oe + ye)}</span>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">
            點日期安排市場；記帳時會自動帶出這天的市場和租金。
            <span className="font-bold text-leaf">綠色＝租金已預付</span>，橘色＝還沒付，白底灰字＝已經過去（已結清），
            <span className="font-bold text-plan">藍色＝出國</span>。
          </p>
        )}
      </Card>
      {!compact && (
        <Card className="mb-3 p-4">
          <div className="mb-2 text-[1.05rem] font-bold">{Ge} 月租金統計</div>
          {ue.length === 0 ? (
            <p className="text-sm text-muted">這個月還沒安排市場。</p>
          ) : (
            <>
              {ue.map((z) => (
                <div
                  key={z.w}
                  className="flex items-baseline justify-between gap-3 border-b border-line py-2 last:border-0"
                >
                  <div className="min-w-0">
                    <div className="font-bold">
                      每週{WEEKDAYS[z.w]}・{z.names.join("、")}
                    </div>
                    <div className="text-sm text-muted">
                      {z.days} 天{z.elec ? `\u30FB\u542B\u96FB\u8CBB ${money(z.elec)}` : ""}
                    </div>
                    {z.futDays === 0 ? (
                      <span className="mt-1 inline-block rounded-full bg-sunk px-2 py-0.5 text-xs font-bold text-muted">
                        已結清
                      </span>
                    ) : z.cash ? (
                      <span className="mt-1 inline-block rounded-full bg-sunk px-2 py-0.5 text-xs font-bold text-muted">
                        當場付現
                      </span>
                    ) : z.preDays === z.futDays ? (
                      <span className="mt-1 inline-block rounded-full bg-leaf-soft px-2 py-0.5 text-xs font-bold text-leaf">
                        已預付
                      </span>
                    ) : z.preDays > 0 ? (
                      <span className="mt-1 inline-block rounded-full bg-leaf-soft px-2 py-0.5 text-xs font-bold text-leaf">
                        已預付 {z.preDays}/{z.futDays} 天・還要付 {money(z.futAmt - z.preAmt)}
                      </span>
                    ) : (
                      <span className="mt-1 inline-block rounded-full bg-flesh-soft px-2 py-0.5 text-xs font-bold text-flesh-ink">
                        還沒預付・要付 {money(z.futAmt)}
                      </span>
                    )}
                  </div>
                  <span
                    className={cx("tnum shrink-0 font-bold", z.futDays > 0 && z.preDays === z.futDays && "text-leaf")}
                  >
                    {money(z.rent + z.elec)}
                  </span>
                </div>
              ))}
              <div className="mt-2 flex items-baseline justify-between gap-3 rounded-lg bg-flesh-soft px-3 py-2.5">
                <div>
                  <div className="font-bold text-flesh-ink">本月租金合計</div>
                  <div className="text-sm text-muted">
                    出攤 {E.length} 天{tt ? `\u30FB\u4F11\u606F ${tt} \u5929` : ""}
                    {length ? `\u30FB\u51FA\u570B ${length} \u5929` : ""}
                    {ye ? `\u30FB\u79DF\u91D1 ${money(oe)}\uFF0B\u96FB\u8CBB ${money(ye)}` : ""}
                  </div>
                  {monthEnd(i) < s ? (
                    <div className="text-sm text-muted">這個月已經結束，租金都已結清</div>
                  ) : (
                    aa > 0 && (
                      <div className="text-sm">
                        <b className="text-leaf">已預付 {money(it)}</b>
                        <span className="text-muted">・還沒預付 {money(aa - it)}</span>
                      </div>
                    )
                  )}
                </div>
                <span className="tnum shrink-0 text-lg font-bold text-flesh-ink">{money(oe + ye)}</span>
              </div>
            </>
          )}
        </Card>
      )}
      {!compact && we.length > 0 && (
        <button
          type="button"
          onClick={() => set_(!_)}
          aria-expanded={_}
          className="mb-2 flex min-h-11 w-full items-center justify-between rounded-lg bg-sunk px-4 font-bold active:brightness-95"
        >
          <span>
            {Ge}/1–{Ge}/{length_1} 每日明細（{we.length} 筆）
          </span>
          <span className="text-flesh-ink">{_ ? "收起 ▲" : "打開 ▼"}</span>
        </button>
      )}
      {!compact && _ && we.length > 0 && (
        <List>
          {we.map((z) => {
            let J = z.market_id ? t.market(z.market_id) : null;
            return (
              <Row
                key={z.id}
                onClick={() => G(z.day)}
                label={`${shortDate(z.day)}\uFF08${WEEKDAYS[weekday(z.day)]}\uFF09\u3000${
                  J ? J.name : isTravel(z) ? "✈ 出國" : "休息"
                }`}
                sub={
                  J
                    ? `\u79DF\u91D1 ${money(z.rent)}${
                        Number(z.electricity_fee) ? `\uFF0B\u96FB\u8CBB ${money(z.electricity_fee)}` : ""
                      }${z.note ? `\u30FB${z.note}` : ""}`
                    : z.note ?? undefined
                }
              />
            );
          })}
        </List>
      )}
      <Sheet open={c !== null} onClose={() => setC(null)} title={c ? `${dateLabel(c.day)}` : ""}>
        {c && (
          <>
            <Field label="這天去哪個市場">
              <select className="field" value={h.marketId} onChange={(z) => ie(z.target.value)}>
                <option value="">請選擇</option>
                {$.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
                <option value="REST">休息（這天不出攤）</option>
                <option value="TRAVEL">✈ 出國（這段時間不出攤）</option>
              </select>
            </Field>
            {h.marketId && h.marketId !== "REST" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="攤位租金" hint="已帶入預設租金，請確認">
                  <MoneyInput
                    compact
                    value={h.rent}
                    onChange={(z) =>
                      setH({
                        ...h,
                        rent: z,
                      })
                    }
                  />
                </Field>
                <Field label="電費（另計）">
                  <MoneyInput
                    compact
                    value={h.elec}
                    onChange={(elec) =>
                      setH({
                        ...h,
                        elec,
                      })
                    }
                  />
                </Field>
              </div>
            )}
            <Field label="備註（選填）">
              <input
                className="field"
                value={h.note}
                placeholder={h.marketId === "TRAVEL" ? "例如：去日本" : "例如：臨時攤位、靠近入口"}
                onChange={(z) =>
                  setH({
                    ...h,
                    note: z.target.value,
                  })
                }
              />
            </Field>
            <div className="mb-1 text-[0.95rem] font-bold">套用範圍</div>
            <Segmented
              className="mb-2"
              value={m}
              onChange={setM}
              options={[
                {
                  value: "day",
                  label: "只有這天",
                },
                {
                  value: "range",
                  label: "連續幾天",
                },
                {
                  value: "month",
                  label: `\u6BCF\u500B\u9031${WEEKDAYS[weekday(c.day)]}`,
                },
              ]}
            />
            {m === "range" && (
              <Field
                label={`\u5F9E ${shortDate(c.day)} \u5230\u54EA\u4E00\u5929`}
                hint={
                  r > c.day
                    ? `\u5171 ${
                        W(c.day, r).length
                      } \u5929\uFF0C\u5DF2\u7D93\u5B89\u6392\u7684\u6703\u88AB\u6539\u6210\u9019\u500B`
                    : "請選結束那天"
                }
              >
                <input type="date" className="field" min={c.day} value={r} onChange={(z) => setR(z.target.value)} />
              </Field>
            )}
            {m === "month" && (
              <p className="mb-4 text-sm text-muted">
                會套用到{" "}
                {U(c.day)
                  .map((z) => Number(z.slice(8)))
                  .join("、")}{" "}
                日{U(c.day).some((z) => z !== c.day && j(z)) && "（已經安排的會被改成這個）"}
              </p>
            )}
            {$.length === 0 && <p className="mb-3 text-sm text-warn">還沒有市場，請先在下面「＋新增市場」。</p>}
            <div className="flex gap-3">
              {(m === "range" || K().some((z) => j(z))) && (
                <Btn kind="danger" big onClick={V}>
                  {m === "month" ? "全部刪除" : "刪除安排"}
                </Btn>
              )}
              <Btn kind="primary" big className="flex-1" disabled={saving || !h.marketId} onClick={L}>
                {saving ? "儲存中…" : "儲存"}
              </Btn>
            </div>
          </>
        )}
      </Sheet>
    </Section>
  );
}

var MARKET_CFG = {
  table: "markets",
  title: "市場",
  fields: [
    {
      key: "name",
      label: "市場名稱",
      type: "text",
      required: true,
    },
    {
      key: "default_rent",
      label: "預設租金",
      type: "number",
      hint: "在月曆選這個市場時自動帶入，可以每天再改",
    },
    {
      key: "default_electricity_fee",
      label: "預設電費（另計，沒有就填 0）",
      type: "number",
    },
    {
      key: "payment_method",
      label: "租金付款方式",
      type: "select",
      options: () => [
        {
          value: "cash",
          label: "每次當場付現金",
        },
        {
          value: "transfer",
          label: "整月預付（匯款或現金先付）",
        },
      ],
    },
    {
      key: "address",
      label: "地址",
      type: "text",
    },
    {
      key: "contact_name",
      label: "聯絡人",
      type: "text",
    },
    {
      key: "phone",
      label: "電話",
      type: "text",
    },
    {
      key: "stall_size",
      label: "攤位大小",
      type: "text",
    },
    {
      key: "bank_code",
      label: "銀行代號",
      type: "text",
    },
    {
      key: "bank_account",
      label: "匯款帳號",
      type: "text",
    },
    {
      key: "rent_includes_electricity",
      label: "租金含電費",
      type: "bool",
    },
    {
      key: "notes",
      label: "備註",
      type: "text",
    },
    {
      key: "sort_order",
      label: "排序",
      type: "number",
    },
  ],
  defaults: () => ({
    name: "",
    default_rent: 0,
    default_electricity_fee: 0,
    payment_method: "cash",
    rent_includes_electricity: false,
    sort_order: 50,
  }),
  rows: (e) => e.markets,
  label: (e) => sa(e, "name"),
};

function MarketDetail({ id }) {
  let t = useStore();
  let a = useRemove();
  let row = t.market(id);
  let [l, setL] = React.useState(false);
  if (row) {
    return (
      <Page
        title={row.name}
        backTo="/settings/markets"
        actions=<RowActions
          onEdit={() => setL(true)}
          onDelete={() =>
            a(
              `\u78BA\u5B9A\u8981\u522A\u9664\u5E02\u5834\u300C${row.name}\u300D\u55CE\uFF1F\u4EE5\u524D\u5728\u9019\u88E1\u7684\u8A18\u5E33\u6703\u4FDD\u7559\u3002`,
              () => db.softDelete("markets", row.id),
              async () => {
                await t.reload();
                navigate("/settings/markets");
              }
            )
          }
        />
      >
        <List className="mb-4">
          <Row label="預設租金" value=<Money value={row.default_rent} /> />
          {Number(row.default_electricity_fee) > 0 && (
            <Row label="預設電費" value=<Money value={row.default_electricity_fee} /> />
          )}
          <Row
            label="付款方式"
            value={row.payment_method === "cash" ? "每次當場付現金" : "整月預付（匯款或現金先付）"}
          />
          {row.payment_method === "transfer" && (row.bank_code || row.bank_account) && (
            <Row label="匯款帳號" value={`${row.bank_code ?? ""} ${row.bank_account ?? ""}`} />
          )}
          {row.address && <Row label="地址" sub={row.address} />}
          {(row.contact_name || row.phone) && (
            <Row label="聯絡" value={[row.contact_name, row.phone].filter(Boolean).join(" ")} />
          )}
          {row.stall_size && <Row label="攤位大小" value={row.stall_size} />}
          {row.rent_includes_electricity && <Row label="租金含電費" value="是" />}
          {row.notes && <Row label="備註" sub={row.notes} />}
          <Row label="狀態" value={row.is_active ? "使用中" : "已隱藏"} />
        </List>
        <p className="px-1 text-sm text-muted">要安排哪天去這個市場，請到「攤位租金月曆」點日期。</p>
        {l && <CrudForm cfg={MARKET_CFG} row={row} onClose={() => setL(false)} />}
      </Page>
    );
  }
  return (
    <Page title="市場" backTo="/settings/markets">
      <Empty text="找不到這個市場" />
    </Page>
  );
}

function backupAgo(e) {
  if (typeof e !== "string") {
    return "還沒備份過";
  }
  let t = Math.floor((Date.now() - new Date(e).getTime()) / 86400000);
  return `\u4E0A\u6B21\u5099\u4EFD\uFF1A${new Date(e).toLocaleDateString("zh-TW", {
    timeZone: "Asia/Taipei",
  })}\uFF08${t === 0 ? "今天" : `${t} \u5929\u524D`}\uFF09`;
}

function C1Component() {
  let e = useStore();
  let { toast } = useFeedback();
  let [a, setA] = React.useState(false);
  let [l, setL] = React.useState("");
  let [i, setI] = React.useState(null);
  async function c() {
    setA(true);
    setI(null);
    try {
      let { blob, counts } = await downloadBackup(setL);
      let d = new Date()
        .toLocaleString("sv-SE", {
          timeZone: "Asia/Taipei",
        })
        .slice(0, 16)
        .replace(/[-: ]/g, "");
      download_(blob, `\u5730\u74DC\u8A18\u5E33_\u5B8C\u6574\u5099\u4EFD_${d}.xlsx`);
      await markBackedUp(e.settingRows.find((r) => r.key === BACKUP_KEY)?.id);
      await e.reload();
      setI(counts);
      toast("備份完成，已下載", "ok");
    } catch {
      toast("備份失敗，請再試一次。", "error");
    } finally {
      setA(false);
      setL("");
    }
  }
  return (
    <Page title="一鍵備份" backTo="/settings">
      <Card className="mb-4">
        <p className="mb-1 text-[1.05rem] font-bold">把整個資料庫下載成一個 Excel</p>
        <p className="mb-3 text-muted">
          包含所有記帳、進貨、地瓜數量、攤位月曆、設定，連已刪除的也會保留。建議每個月備份一次，存到自己的雲端硬碟。
        </p>
        <p className="mb-3 text-sm text-muted">{backupAgo(e.settings[BACKUP_KEY])}</p>
        <Btn kind="primary" big className="w-full" disabled={a} onClick={c}>
          {a ? l || "備份中…" : "立即備份"}
        </Btn>
      </Card>
      {i && (
        <List>
          {Object.entries(i).map(([b, m]) => (
            <Row key={b} label={b} value=<span className="tnum">{m} 筆</span> />
          ))}
        </List>
      )}
    </Page>
  );
}

function M1Component() {
  let e = useStore();
  let { toast } = useFeedback();
  let a = today_();
  let [n, setN] = React.useState(`${a.slice(0, 4)}-01-01`);
  let [s, setS] = React.useState(a);
  let [o, setO] = React.useState(a.slice(0, 7));
  let [disabled, setDisabled] = React.useState(false);
  async function d(y) {
    setDisabled(true);
    toast("產生 Excel 中…", "info");
    try {
      await y();
      toast("已下載 Excel", "ok");
    } catch {
      toast("匯出失敗，請再試一次。", "error");
    } finally {
      setDisabled(false);
    }
  }
  let r = n.slice(0, 4);
  return (
    <Page title="Excel 匯出" backTo="/settings">
      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="從">
            <input type="date" className="field" value={n} onChange={(y) => setN(y.target.value)} />
          </Field>
          <Field label="到">
            <input type="date" className="field" value={s} onChange={(y) => setS(y.target.value)} />
          </Field>
        </div>
        <div className="grid gap-2">
          <Btn disabled={disabled} onClick={() => d(() => uh(n, s, e))}>
            記帳明細（收入、支出、轉帳、付款）
          </Btn>
          <Btn
            disabled={disabled}
            onClick={() =>
              d(async () => {
                let y = await db.select("purchase_orders", {
                  where: [isNull("deleted_at"), gte("order_date", n), lte("order_date", s)],
                  order: "order_date",
                });
                let h = y.length
                  ? await db.select("purchase_lines", {
                      where: [
                        isNull("deleted_at"),
                        inList(
                          "purchase_order_id",
                          y.map((_) => _.id)
                        ),
                      ],
                    })
                  : [];
                let v = new Map(y.map((_) => [_.id, _]));
                download_(
                  await writeXlsx([
                    {
                      name: "進貨明細",
                      widths: [12, 10, 12, 8, 8, 10, 30],
                      rows: [
                        ["日期", "供應商", "品項", "數量", "單價", "合計", "備註"],
                        ...h
                          .map((_) => {
                            let u = v.get(_.purchase_order_id);
                            return [
                              u.order_date,
                              e.supplier(u.supplier_id)?.name ?? "",
                              e.item(_.item_id)?.name ?? "",
                              Number(_.quantity),
                              Number(_.unit_price),
                              Number(_.amount),
                              _.note,
                            ];
                          })
                          .sort((_, u) => String(_[0]).localeCompare(String(u[0]))),
                      ],
                    },
                  ]),
                  `\u5730\u74DC\u71DF\u904B_\u9032\u8CA8\u660E\u7D30_${n}_${s}.xlsx`
                );
              })
            }
          >
            進貨明細
          </Btn>
          <Btn
            disabled={disabled}
            onClick={() =>
              d(async () => {
                let y = await db.select("v_account_ledger", {
                  where: [gte("txn_date", n), lte("txn_date", s)],
                  order: "account_name,txn_date",
                });
                download_(
                  await writeXlsx([
                    {
                      name: "帳戶明細",
                      widths: [12, 12, 36, 10, 10, 20],
                      rows: [
                        ["帳戶", "日期", "明細", "收入", "支出", "餘額"],
                        ...y.map((h) => [
                          h.account_name,
                          h.txn_date,
                          h.label,
                          h.delta > 0 ? h.delta : null,
                          h.delta < 0 ? -h.delta : null,
                          Number(h.balance),
                        ]),
                      ],
                    },
                  ]),
                  `\u5730\u74DC\u71DF\u904B_\u5E33\u6236\u660E\u7D30_${n}_${s}.xlsx`
                );
              })
            }
          >
            帳戶明細（含逐筆餘額）
          </Btn>
          <Btn
            disabled={disabled}
            onClick={() =>
              d(async () => {
                let y = await db.select("v_monthly_category", {
                  where: [gte("month", `${r}-01-01`), lte("month", `${r}-12-31`)],
                });
                download_(
                  await writeXlsx([eo(r, y, e.categories)]),
                  `\u5730\u74DC\u71DF\u904B_${r}_\u6536\u652F\u660E\u7D30\u8868.xlsx`
                );
              })
            }
          >
            {r} 年收支明細表（每月 × 分類）
          </Btn>
        </div>
      </Card>
      <Btn kind="primary" className="mb-4 w-full" onClick={() => navigate(`/stall-month?m=${o}`)}>
        每月攤位收支明細表（Excel／PDF）
      </Btn>
      <Card>
        <Field label="每月明細（每天一列，跟原本每月工作表一樣）">
          <input type="month" className="field" value={o} onChange={(y) => setO(y.target.value)} />
        </Field>
        <Btn
          className="w-full"
          disabled={disabled}
          onClick={() =>
            d(async () => {
              let y = `${o}-01`;
              download_(
                await writeXlsx([await Wr(y, monthEnd(y), e.categories, e.items, (h) => e.market(h)?.name ?? "")]),
                `\u5730\u74DC\u71DF\u904B_${o}_\u6BCF\u65E5.xlsx`
              );
            })
          }
        >
          下載 {o} 每日明細
        </Btn>
      </Card>
      <p className="mt-3 px-1 text-sm text-muted">匯出的檔案可以用 Excel、Numbers、Google 試算表開啟。</p>
    </Page>
  );
}

function A1Component() {
  let e = useStore();
  let { confirm } = useFeedback();
  let { run } = useSaver();
  let n = useQuery(
    () =>
      db.select("import_batches", {
        where: [isNull("deleted_at")],
        order: "created_at.desc",
      }),
    []
  );
  async function l(s) {
    if (
      (await confirm(
        `\u78BA\u5B9A\u8981\u64A4\u92B7\u300C${
          s.filename ?? "這批匯入"
        }\u300D\u55CE\uFF1F\u9019\u6279\u532F\u5165\u7684\u8CC7\u6599\u90FD\u6703\u88AB\u522A\u9664\uFF08\u8EDF\u522A\u9664\uFF09\u3002`
      )) &&
      (await run(
        () =>
          db.rpc("revert_import", {
            p_batch: s.id,
          }),
        "已撤銷"
      ))
    ) {
      n.reload();
      e.reload();
    }
  }
  return (
    <Page title="匯入紀錄" backTo="/settings">
      <QueryView
        q={n}
        empty={(s) => {
          if (s.length === 0) {
            return <Empty text="還沒有匯入過資料" />;
          }
          return null;
        }}
      >
        {(s) => (
          <List>
            {s.map((i) => (
              <Row
                key={i.id}
                label=<span className="flex items-center gap-2">
                  {i.filename ?? "匯入"}
                  {i.status === "reverted" && <Badge tone="warn">已撤銷</Badge>}
                </span>
                sub={`${shortDate(i.created_at.slice(0, 10))}\u30FB${
                  i.source === "excel_history" ? "歷史資料（Excel）" : i.source === "excel" ? "Excel 匯入" : "AI"
                }`}
                value={
                  i.status === "committed" ? (
                    <Btn kind="danger" onClick={() => l(i)}>
                      撤銷
                    </Btn>
                  ) : undefined
                }
              />
            ))}
          </List>
        )}
      </QueryView>
    </Page>
  );
}

function ConnectionSettings() {
  let { confirm } = useFeedback();
  let t = getConfig();
  return (
    <Page title="連線與登入" backTo="/settings">
      <List className="mb-4">
        <Row label="登入帳號" value=<span className="text-muted">{auth.session?.email}</span> />
        <Row label="資料庫" sub={t?.url} />
      </List>
      <div className="grid gap-2">
        <Btn
          onClick={async () => {
            if (
              await confirm("確定要登出嗎？", {
                danger: false,
                okText: "登出",
              })
            ) {
              auth.signOut();
            }
          }}
        >
          登出
        </Btn>
        {!hasBuiltinConfig() && (
          <Btn
            kind="danger"
            onClick={async () => {
              if (await confirm("確定要更改資料庫連線嗎？會先登出。")) {
                await auth.signOut();
                saveConfig(null);
                location.reload();
              }
            }}
          >
            更改資料庫連線
          </Btn>
        )}
      </div>
      <p className="mt-4 px-1 text-sm text-muted">資料存在你自己的 Supabase 資料庫，只有登入的帳號可以讀寫。</p>
    </Page>
  );
}

async function reloadLatest() {
  try {
    let e = (await navigator.serviceWorker?.getRegistrations?.()) ?? [];
    await Promise.all(e.map((t) => t.unregister()));
    if (window.caches) {
      await Promise.all((await caches.keys()).map((t) => caches.delete(t)));
    }
  } catch {}
  location.replace(`${location.pathname}?r=${Date.now()}${location.hash}`);
}
