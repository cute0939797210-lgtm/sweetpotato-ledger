import * as React from "react";
import { CashCounter } from "../components/CashCounter.jsx";
import { TxnList } from "../components/TxnList.jsx";
import {
  Badge,
  Btn,
  Card,
  Chips,
  ErrorBox,
  Field,
  Loading,
  MoneyInput,
  Section,
  Segmented,
  Toggle,
  cx,
  parseMoney,
  useFeedback,
  useSaver,
} from "../components/ui.jsx";
import { clearDraft, loadDraft, saveDraft } from "../lib/drafts.js";
import { addDays, dateLabel, money, num, today_ } from "../lib/format.js";
import { DAY_STATUS_LABELS, isWagePayer } from "../lib/models.js";
import { dayBundle, suggestMarkets } from "../lib/queries.js";
import { fh, nextMonthRentDue } from "../lib/rentDue.js";
import { navigate } from "../lib/router.js";
import { useQuery, useStore } from "../lib/store.jsx";
import { db, eq, inList, isNull } from "../lib/supabase.js";

const neq = (e, t) => [e, `neq.${t}`];

const style = {
  paddingLeft: 2,
  paddingRight: 2,
};

const ou = "grid-cols-[1.4rem_0.85fr_0.85fr_1.3fr_1.3fr_0.9fr]";

const PAY_METHODS = ["現金", "悠遊卡", "信用卡"];

const PAY_CODES = ["PARKING", "FUEL"];

const OTHER_CODES = ["MISC"];

const SALARY_CODES = ["GRANDMA_SALARY", "SISTER_SALARY"];

const Sh = (e = "extra") => `${e}:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const WEATHER = ["晴", "陰", "雨", "冷", "熱", "颱風"].map((e) => ({
  value: e,
  label: e,
}));

const ha = (e) => {
  if (e) {
    return String(Number(e));
  }
  return "";
};

export function Daily({ route }) {
  let t = route.query.get("d") || today_();
  let a = useQuery(async () => {
    let [n, suggestions, prices] = await Promise.all([
      dayBundle(t),
      suggestMarkets(t),
      db
        .rpc("day_unit_prices", {
          p_day: t,
        })
        .catch(() => []),
    ]);
    let stock = await db.select("v_inventory").catch(() => []);
    let loose = await db
      .select("transactions", {
        where: [isNull("deleted_at"), eq("txn_date", t), isNull("business_day_id")],
      })
      .catch(() => []);
    return {
      ...n,
      suggestions,
      prices,
      stock,
      loose,
    };
  }, [t]);
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-44 pt-3 md:pb-28">
      <header className="mb-3 flex items-center gap-1">
        <button
          aria-label="前一天"
          onClick={() => navigate(`/daily?d=${addDays(t, -1)}`)}
          className="h-12 w-12 rounded-full text-2xl active:bg-sunk"
        >
          ‹
        </button>
        <label className="relative flex-1 text-center">
          <span className="block text-[1.3rem] font-bold">
            {t === today_() ? "今天" : dateLabel(t).replace(/^\d+ 年 /, "")}
          </span>
          <span className="block text-sm text-muted">{dateLabel(t)}</span>
          <input
            type="date"
            aria-label="選擇日期"
            value={t}
            max="2099-12-31"
            onChange={(n) => {
              let value = n.target.value;
              if (value) {
                navigate(`/daily?d=${value}`);
              }
            }}
            className="absolute inset-0 opacity-0"
          />
        </label>
        <button
          aria-label="後一天"
          onClick={() => navigate(`/daily?d=${addDays(t, 1)}`)}
          className="h-12 w-12 rounded-full text-2xl active:bg-sunk"
        >
          ›
        </button>
      </header>
      {a.loading && !a.data ? (
        <Loading text="載入當天資料中…" />
      ) : a.error ? (
        <ErrorBox text={a.error} onRetry={a.reload} />
      ) : (
        a.data && (
          <DailyForm
            key={t + (a.data.day?.updated_at ?? "")}
            dayStr={t}
            bd={a.data.day}
            counts={a.data.counts}
            txns={a.data.txns}
            suggestions={a.data.suggestions}
            prices={a.data.prices}
            stock={a.data.stock}
            loose={a.data.loose}
            focus={route.query.get("focus")}
            onSaved={a.reload}
          />
        )
      )}
    </div>
  );
}

function DailyForm({ dayStr, bd, counts, txns, suggestions, prices, stock, loose, focus, onSaved }) {
  let m = useStore();
  let { saving, run } = useSaver();
  let { confirm, toast } = useFeedback();
  let v = `daily:${dayStr}`;
  let _ = m.payers.filter((N) => isWagePayer(N) && N.is_active);
  let u = new Set(_.map((N) => N.wage_category_id));
  let p = (N) => m.payers.some((O) => O.wage_category_id === N) || ["DRAWER"].includes(m.cat(N)?.code ?? "");
  let g = loose.filter((N) => N.daily_slot?.startsWith("wage:"));
  let f = loose.filter((N) => N.daily_slot?.startsWith("life:"));
  let k = m.categories.filter((N) => N.kind === "expense" && N.tier === 3 && N.is_active && !p(N.id));
  let M = m.categories.filter((N) => N.show_in_daily && N.is_active && N.tier !== 3 && !u.has(N.id));
  let T = M.filter((N) => N.kind === "income").sort(
    (N, O) => +(O.code === "SALES") - +(N.code === "SALES") || (O.tier === 1 ? 1 : 0) - (N.tier === 1 ? 1 : 0)
  );
  let j = M.filter((N) => N.kind === "expense" && N.tier === 1);
  let $ = j.filter((N) => !OTHER_CODES.includes(N.code ?? ""));
  let G = OTHER_CODES.map((N) => j.find((O) => O.code === N)).filter((N) => !!N);
  let ie = m.catByCode("MISC");
  let U = txns.filter((N) => N.daily_slot?.startsWith("extra:"));
  let W = M.filter((N) => N.kind === "expense" && N.tier === 2);
  let K = txns.filter((N) => N.source === "daily" && m.cat(N.category_id)?.tier === 3);
  let L = async () => {
    for (let N of K) {
      await db.update(
        "transactions",
        {
          source: "manual",
          business_day_id: null,
          daily_slot: null,
        },
        [eq("id", N.id)]
      );
    }
  };
  let V = m.items.filter((N) => N.track_inventory && N.is_active);
  let we = (N) => {
    let O = suggestions.find((pe) => pe.market_id === N);
    let Z = m.market(N);
    return Number(O ? O.rent : Z?.default_rent ?? 0);
  };
  let Ue = m.catByCode("ELECTRICITY");
  let ft = (N) => {
    let O = suggestions.find((pe) => pe.market_id === N);
    let Z = m.market(N);
    return Number(O ? O.electricity_fee : Z?.default_electricity_fee ?? 0);
  };
  let ua = React.useMemo(() => {
    let N = {};
    txns
      .filter((me) => me.daily_slot?.startsWith("cat:"))
      .forEach((me) => {
        N[me.daily_slot.slice(4)] = me.formula ?? ha(me.amount);
      });
    let extras = U.map((me) => ({
      id: me.id,
      desc: me.description ?? "",
      amount: me.formula ?? ha(me.amount),
    }));
    let life = f.map((me) => ({
      id: me.id,
      catId: me.category_id ?? "",
      desc: me.description ?? "",
      amount: me.formula ?? ha(me.amount),
    }));
    let pe = {};
    g.forEach((me) => {
      pe[me.daily_slot.slice(5)] = me.formula ?? ha(me.amount);
    });
    let Fe = {};
    V.forEach((me) => {
      let ut = counts.find((Oa) => Oa.item_id === me.id);
      Fe[me.id] = {
        carried: ha(ut?.carried),
        cooked: ha(ut?.cooked),
        remaining: ha(ut?.remaining),
        price: ha(ut?.unit_price),
      };
    });
    let pay = {};
    txns
      .filter((me) => me.daily_slot?.startsWith("cat:") && me.is_advance)
      .forEach((me) => {
        pay[me.daily_slot.slice(4)] = PAY_METHODS.includes(me.description) ? me.description : "信用卡";
      });
    if (bd) {
      let me = txns.find((ut) => ut.daily_slot === "rent");
      return {
        marketId: bd.market_id ?? "",
        status: bd.status,
        weather: bd.weather,
        note: bd.note ?? "",
        rent: me ? me.formula ?? ha(me.amount) : "",
        prepaid: me ? me.account_id === null : false,
        lines: N,
        counts: Fe,
        extras,
        wages: pe,
        life,
        pay,
      };
    }
    let Ct = suggestions[0];
    let Qe = m.catByCode("ELECTRICITY");
    if (Ct?.market_id && Ct.electricity_fee > 0 && Qe) {
      N[Qe.id] = ha(Ct.electricity_fee);
    }
    return {
      marketId: Ct?.market_id ?? "",
      status: Ct && !Ct.market_id ? "rest" : "open",
      weather: null,
      note: "",
      rent: Ct?.market_id ? ha(Ct.rent) : "",
      prepaid: Ct?.market_id ? Ct.payment_method === "transfer" : false,
      lines: N,
      counts: Fe,
      extras,
      wages: pe,
      life,
      pay,
    };
  }, []);
  let st = loadDraft(v);
  let [E, setE] = React.useState(st ?? ua);
  let [oe, setOe] = React.useState(!!st);
  let [fe, setFe] = React.useState(!!bd && !st);
  let [it, setIt] = React.useState(false);
  let Ge = (N) => {
    setE((O) => ({
      ...O,
      ...N,
    }));
    setIt(true);
  };
  let z = (N, O) =>
    Ge({
      lines: {
        ...E.lines,
        [N]: O,
      },
    });
  let J = E.extras ?? [];
  let ge = E.wages ?? {};
  let Oe = E.life ?? [];
  let Tt = E.pay ?? {};
  let Nt = (N, O) =>
    Ge({
      life: Oe.map((Z, pe) => {
        if (pe === N) {
          return {
            ...Z,
            ...O,
          };
        }
        return Z;
      }),
    });
  let va = (desc, O = "MEALS") =>
    Ge({
      life: [
        ...Oe,
        {
          desc,
          amount: "",
          catId: (k.find((Z) => desc && Z.name === desc) ?? m.catByCode(O) ?? k[0])?.id ?? "",
        },
      ],
    });
  let Ys = (N, O) => {
    let Z = {
      ...ge,
    };
    if (O === null) {
      delete Z[N];
    } else {
      Z[N] = O;
    }
    Ge({
      wages: Z,
    });
  };
  let Qs = (N, O) =>
    Ge({
      extras: J.map((Z, pe) => {
        if (pe === N) {
          return {
            ...Z,
            ...O,
          };
        }
        return Z;
      }),
    });
  let Ra = (N, O, Z) => {
    let pe = {
      ...E.counts[N],
      [O]: Z,
    };
    if (O === "carried" || O === "cooked") {
      let Fe = Number(pe.carried);
      let ca = Number(pe.cooked);
      if (pe.carried?.trim() && Number.isFinite(Fe) && Number.isFinite(ca)) {
        let Ct = Math.round(Math.max(0, Fe - (ca || 0)) * 100) / 100;
        pe.remaining = Ct ? String(Ct) : "";
      }
    }
    Ge({
      counts: {
        ...E.counts,
        [N]: pe,
      },
    });
  };
  React.useEffect(() => {
    if (it) {
      saveDraft(v, E);
    }
  }, [E, it, v]);
  React.useEffect(() => {
    if (focus === "counts") {
      document.getElementById("counts")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [focus]);
  function $l(N) {
    let O = m.market(N);
    let Z = {
      ...E.lines,
    };
    if (Ue && N) {
      Z[Ue.id] = ha(ft(N));
    }
    Ge({
      marketId: N,
      status: N ? "open" : E.status,
      rent: N ? ha(we(N)) : "",
      prepaid: O ? O.payment_method === "transfer" : E.prepaid,
      lines: Z,
    });
  }
  let xa = (N) => parseMoney(N)?.amount ?? 0;
  let jh = T.filter((N) => N.tier === 1).reduce((acc, item) => acc + xa(E.lines[item.id] ?? ""), 0);
  let Yh = T.filter((N) => N.tier !== 1).reduce((acc, item) => acc + xa(E.lines[item.id] ?? ""), 0);
  let Qh =
    j.reduce((acc, item) => acc + xa(E.lines[item.id] ?? ""), 0) + J.reduce((acc, item) => acc + xa(item.amount), 0);
  let Gh = (N) => stock.find((O) => O.item_id === N)?.on_hand;
  let cu = (N) => prices.find((O) => O.item_id === N)?.system_price;
  let no = (N) => {
    let O = (E.counts[N]?.price ?? "").trim();
    if (O === "") {
      return null;
    }
    return Number(O);
  };
  let Xh = V.some((N) => {
    let O = no(N.id);
    return O !== null && (!Number.isFinite(O) || O < 0);
  });
  let Gs = V.reduce(
    (acc, item) =>
      acc +
      (Number(E.counts[item.id]?.cooked) || 0) *
        (no(item.id) ?? (Number(cu(item.id) ?? 0) > 0 ? Number(cu(item.id)) : Number(item.default_price))),
    0
  );
  let Vh = xa(E.rent);
  let lo = [
    ...txns.filter((N) => !N.daily_slot),
    ...loose.filter(
      (N) =>
        !txns.some((O) => O.id === N.id) && !N.daily_slot?.startsWith("wage:") && !N.daily_slot?.startsWith("life:")
    ),
  ];
  let du = (N) => m.cat(N.category_id)?.tier;
  let Xs = lo.filter((N) => N.type === "income" && du(N) === 1).reduce((acc, item) => acc + Number(item.amount), 0);
  let Vs = lo.filter((N) => N.type === "expense" && du(N) === 1).reduce((acc, item) => acc + Number(item.amount), 0);
  let mu =
    Yh + lo.filter((N) => N.type === "income" && du(N) === 0).reduce((acc, item) => acc + Number(item.amount), 0);
  let xm = jh - Qh - Vh - Gs + Xs - Vs;
  let Kh = [
    E.rent,
    ...Object.values(E.lines),
    ...J.map((N) => N.amount),
    ...Object.values(ge),
    ...Oe.map((N) => N.amount),
  ].some((N) => parseMoney(N) === null);
  async function Zh() {
    if (Kh || Xh) {
      toast("有金額或單價看不懂，請檢查標紅的欄位。", "error");
      return;
    }
    let N = V.some((Qe) => {
      let me = E.counts[Qe.id];
      let [ut, Oa, io] = [Number(me?.carried) || 0, Number(me?.cooked) || 0, Number(me?.remaining) || 0];
      return (ut || Oa || io) && Math.abs(ut - Oa - io) > 0.001;
    });
    let O = parseMoney(E.rent);
    let Z = {
      day: dayStr,
      market_id: E.marketId || null,
      status: E.status,
      weather: E.weather,
      note: E.note || null,
      cash_account_id: m.cashAccountId,
      rent: {
        amount: O.amount,
        formula: O.formula,
        prepaid: E.prepaid,
      },
      lines: M.map((Qe) => {
        let me = parseMoney(E.lines[Qe.id] ?? "");
        return {
          category_id: Qe.id,
          amount: me.amount,
          formula: me.formula,
        };
      }),
      counts: V.map((Qe) => ({
        item_id: Qe.id,
        carried: Number(E.counts[Qe.id]?.carried) || 0,
        cooked: Number(E.counts[Qe.id]?.cooked) || 0,
        remaining: Number(E.counts[Qe.id]?.remaining) || 0,
        unit_price: no(Qe.id),
      })),
    };
    let pe = M.filter((Qe) => xa(E.lines[Qe.id] ?? "") > 0);
    if (pe.length) {
      let me = (
        await db
          .select("transactions", {
            where: [
              isNull("deleted_at"),
              eq("txn_date", dayStr),
              inList(
                "category_id",
                pe.map((ut) => ut.id)
              ),
              neq("source", "daily"),
            ],
          })
          .catch(() => [])
      ).filter((ut) => !ut.daily_slot?.startsWith("extra:") && !(bd && ut.business_day_id === bd.id));
      if (me.length) {
        let ut = me.map((Oa) => `${m.cat(Oa.category_id)?.name ?? ""} ${money(Oa.amount)}`).join("、");
        if (
          !(await confirm(
            `\u9019\u5929\u5DF2\u7D93\u7528\u55AE\u7B46\u8A18\u5E33\u8A18\u904E\uFF1A${ut}\u3002\u9019\u88E1\u518D\u8A18\u4E00\u6B21\u6703\u8B8A\u6210\u5169\u7B46\uFF08\u91CD\u8907\u5165\u5E33\uFF09\u3002

\u5EFA\u8B70\u6309\u300C\u53D6\u6D88\u300D\uFF0C\u5230\u9996\u9801\u300C\u6700\u8FD1\u8A18\u5E33\u300D\u9EDE\u90A3\u4E00\u7B46\u9032\u53BB\u522A\u6389\u3002\u78BA\u5B9A\u9084\u662F\u8981\u5132\u5B58\u55CE\uFF1F`,
            {
              okText: "還是儲存",
            }
          ))
        ) {
          return;
        }
      }
    }
    let Fe = PAY_CODES.map((Qe) => m.catByCode(Qe)).filter((Qe) => !!Qe);
    let ca =
      m.payers.find((Qe) => Qe.name === "Minnie" && Qe.is_active) ?? m.payers.find((Qe) => Qe.name.includes("Minnie"));
    if (
      await run(
        async () => {
          await L();
          if (bd) {
            for (let ut of Fe) {
              await db.update(
                "transactions",
                {
                  is_advance: false,
                  payer_id: null,
                  description: null,
                },
                [eq("business_day_id", bd.id), eq("daily_slot", `cat:${ut.id}`), isNull("deleted_at")]
              );
            }
          }
          let Qe = await db.rpc("save_daily", {
            p: Z,
          });
          for (let ut of Fe) {
            let description = Tt[ut.id] ?? "現金";
            if (description !== "現金" && ca && xa(E.lines[ut.id] ?? "") > 0) {
              await db.update(
                "transactions",
                {
                  account_id: null,
                  is_advance: true,
                  payer_id: ca.id,
                  description,
                },
                [eq("business_day_id", Qe), eq("daily_slot", `cat:${ut.id}`), isNull("deleted_at")]
              );
            }
          }
          let me = m.catByCode("ELECTRICITY");
          if (E.prepaid && me && dayStr >= "2026-11-01") {
            await db.update(
              "transactions",
              {
                account_id: null,
              },
              [eq("business_day_id", Qe), eq("daily_slot", `cat:${me.id}`), isNull("deleted_at")]
            );
          }
          await Wh(Qe);
          await Ih();
          await Fh();
        },
        N ? "已儲存（地瓜數量不一致，已標記異常）" : "已儲存"
      )
    ) {
      clearDraft(v);
      setIt(false);
      setOe(false);
      setFe(true);
      onSaved();
      await Jh();
    }
  }
  async function Jh() {
    let N = m.market(E.marketId);
    if (
      E.status !== "open" ||
      !N ||
      N.payment_method !== "transfer" ||
      !fh(dayStr) ||
      dayStr.slice(0, 7) !== today_().slice(0, 7)
    ) {
      return;
    }
    let O = (await nextMonthRentDue(today_(), m.markets).catch(() => [])).find((pe) => pe.marketId === N.id);
    if (!O) {
      return;
    }
    let Z = Number(O.month.slice(5, 7));
    if (
      await confirm(
        `\u4ECA\u5929\u662F\u9019\u500B\u6708\u6700\u5F8C\u4E00\u9031\u7684\u51FA\u6524\u65E5\u3002

${N.name} ${Z} \u6708\u7684\u79DF\u91D1\u9084\u6C92\u9810\u4ED8\uFF1A${money(O.amount)}\uFF08${Z} \u6708\u6392\u4E86 ${
          O.days
        } \u5929\uFF09\u3002

\u73FE\u5728\u53BB\u8A18\u9810\u4ED8\u79DF\u91D1\u55CE\uFF1F`,
        {
          okText: "去記預付",
          danger: false,
        }
      )
    ) {
      location.hash = O.href;
    }
  }
  async function Fh() {
    let N = Oe.filter((O) => xa(O.amount) > 0 && O.catId);
    for (let O of f) {
      if (!N.some((Z) => Z.id === O.id)) {
        await db.softDelete("transactions", O.id);
      }
    }
    for (let O of N) {
      let Z = parseMoney(O.amount);
      let pe = {
        txn_date: dayStr,
        amount: Z.amount,
        formula: Z.formula,
        category_id: O.catId,
        description: O.desc.trim() || null,
        account_id: m.cashAccountId,
      };
      if (O.id && f.some((Fe) => Fe.id === O.id)) {
        await db.update("transactions", pe, [eq("id", O.id)]);
      } else {
        await db.insert("transactions", {
          ...pe,
          type: "expense",
          daily_slot: Sh("life"),
          source: "manual",
        });
      }
    }
  }
  async function Ih() {
    for (let N of _) {
      let daily_slot = `wage:${N.id}`;
      let Z = g.find((Fe) => Fe.daily_slot === daily_slot);
      let pe = parseMoney(ge[N.id] ?? "");
      if (pe && pe.amount > 0) {
        let Fe = {
          txn_date: dayStr,
          amount: pe.amount,
          formula: pe.formula,
          description: `${N.name}\u5E6B\u5FD9`,
        };
        if (Z) {
          await db.update("transactions", Fe, [eq("id", Z.id)]);
        } else {
          await db.insert("transactions", {
            ...Fe,
            type: "expense",
            category_id: N.wage_category_id,
            is_advance: true,
            payer_id: N.id,
            account_id: null,
            daily_slot,
            source: "manual",
          });
        }
      } else {
        if (Z) {
          await db.softDelete("transactions", Z.id);
        }
      }
    }
  }
  async function Wh(business_day_id) {
    let O = J.filter((Z) => xa(Z.amount) > 0);
    for (let Z of U) {
      if (!O.some((pe) => pe.id === Z.id)) {
        await db.softDelete("transactions", Z.id);
      }
    }
    if (ie) {
      for (let Z of O) {
        let pe = parseMoney(Z.amount);
        let Fe = {
          txn_date: dayStr,
          amount: pe.amount,
          formula: pe.formula,
          description: Z.desc.trim() || "其他雜支",
          account_id: m.cashAccountId,
          market_id: E.marketId || null,
        };
        if (Z.id && U.some((ca) => ca.id === Z.id)) {
          await db.update("transactions", Fe, [eq("id", Z.id)]);
        } else {
          await db.insert("transactions", {
            ...Fe,
            type: "expense",
            category_id: ie.id,
            business_day_id,
            daily_slot: Sh(),
            source: "manual",
          });
        }
      }
    }
  }
  async function Ph() {
    if (!bd || !(await confirm("確定要刪除這一天的全部記帳嗎？（可以請管理者從資料庫復原）"))) {
      return;
    }
    if (
      await run(async () => {
        await L();
        await db.softDelete("business_days", bd.id);
      }, "已刪除")
    ) {
      clearDraft(v);
      onSaved();
    }
  }
  let _m = m.catByCode("FEE")?.id;
  let Nm = lo.filter((N) => !N.fee_parent_id && !(_m && N.category_id === _m));
  let ev = m.markets.filter((N) => N.is_active);
  let so = suggestions.filter((N) => N.market_id);
  let tv = new Set(so.map((N) => N.market_id));
  return (
    <>
      {oe && (
        <div className="mb-3 flex items-center gap-3 rounded-2xl bg-flesh-soft p-3 text-flesh-ink">
          <span className="flex-1 font-bold">已還原上次還沒儲存的內容</span>
          <button
            className="font-bold underline"
            onClick={() => {
              clearDraft(v);
              setE(ua);
              setOe(false);
              setIt(false);
            }}
          >
            放棄
          </button>
        </div>
      )}
      {fe && (
        <div className="mb-3 flex items-center gap-3 rounded-2xl bg-leaf-soft p-3">
          <span className="flex-1">
            <b>這天已經記帳了。</b>要修改請按「修改」，改完按「儲存」更新。
          </span>
          <Btn kind="primary" onClick={() => setFe(false)}>
            修改
          </Btn>
        </div>
      )}
      <nav
        aria-label="跳到"
        className="sticky top-0 z-10 -mx-4 mb-4 flex gap-2 overflow-x-auto bg-bg/95 px-4 py-2 backdrop-blur"
      >
        {[
          ["income", "收入"],
          ["rent", "租金"],
          ["counts", "地瓜"],
          ["misc", "雜支"],
          ["life", "生活"],
          ["note", "備註"],
        ].map(([N, O]) => (
          <button
            key={N}
            type="button"
            onClick={() =>
              document.getElementById(N)?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
            className="min-h-10 flex-1 shrink-0 whitespace-nowrap rounded-full bg-card px-2 text-[0.95rem] font-bold text-flesh-ink active:bg-sunk"
          >
            {O}
          </button>
        ))}
      </nav>
      <fieldset disabled={fe} className={cx("m-0 min-w-0 border-0 p-0", fe && "opacity-80")}>
        <Section>
          <Card>
            <Field
              label="市場"
              hint={
                suggestions.length === 0 ? (
                  <>
                    這天還沒在月曆安排市場，可以直接選，或
                    <a className="font-bold text-flesh-ink underline" href="#/settings/markets">
                      到月曆安排
                    </a>
                  </>
                ) : suggestions[0].market_id ? (
                  "依月曆的安排帶入，可以改"
                ) : (
                  "月曆上這天安排休息"
                )
              }
            >
              <select className="field" value={E.marketId} onChange={(N) => $l(N.target.value)}>
                <option value="">（沒有出攤）</option>
                {so.length > 0 && (
                  <optgroup label="月曆上安排的">
                    {so.map((N) => (
                      <option key={N.market_id} value={N.market_id}>
                        {N.name}・租金 {money(N.rent)}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label={so.length ? "其他市場" : "市場"}>
                  {ev
                    .filter((N) => !tv.has(N.id))
                    .map((N) => (
                      <option key={N.id} value={N.id}>
                        {N.name}
                        {N.is_temporary ? "（臨時）" : ""}
                      </option>
                    ))}
                </optgroup>
              </select>
            </Field>
            <Segmented
              value={E.status}
              onChange={(N) =>
                Ge({
                  status: N,
                })
              }
              options={["open", "rest", "closed"].map((N) => ({
                value: N,
                label: DAY_STATUS_LABELS[N],
              }))}
              className="mb-4"
            />
            <div className="mb-1 text-[0.95rem] font-bold">天氣</div>
            <Chips
              value={E.weather}
              onChange={(weather) =>
                Ge({
                  weather,
                })
              }
              options={WEATHER}
            />
          </Card>
        </Section>
        <Section title="收入" id="income">
          <Card>
            {T.map((N) => {
              if (N.code === "SALES") {
                return (
                  <div
                    key={N.id}
                    className="-mx-2 mb-3 rounded-xl border-[1.5px] border-skin/40 bg-skin-soft px-2 pt-2"
                  >
                    <Field
                      label=<span className="text-lg font-bold text-skin">💰 {N.name}</span>
                      error={parseMoney(E.lines[N.id] ?? "") === null ? "算式看不懂" : null}
                    >
                      <CashCounter value={E.lines[N.id] ?? ""} onChange={(O) => z(N.id, O)} />
                    </Field>
                  </div>
                );
              }
              return (
                <Field
                  key={N.id}
                  label={N.tier === 1 ? N.name : `${N.name}\uFF08\u4E0D\u7B97\u6DE8\u5229\uFF09`}
                  error={parseMoney(E.lines[N.id] ?? "") === null ? "算式看不懂" : null}
                >
                  <MoneyInput value={E.lines[N.id] ?? ""} onChange={(O) => z(N.id, O)} />
                </Field>
              );
            })}
          </Card>
        </Section>
        <Section title="攤位租金" id="rent">
          <Card>
            <MoneyInput
              value={E.rent}
              onChange={(N) =>
                Ge({
                  rent: N,
                })
              }
              className="mb-3"
            />
            <Toggle
              checked={E.prepaid}
              onChange={(prepaid) =>
                Ge({
                  prepaid,
                })
              }
              label="已預付（整月先付）"
              hint={E.prepaid ? "從預付租金扣，不扣金庫（電費也一起從預付扣）" : "今天在現場付現金，從金庫扣"}
            />
            {!fe && Ue && E.marketId && !xa(E.lines[Ue.id] ?? "") && ft(E.marketId) > 0 && (
              <button
                type="button"
                onClick={() => z(Ue.id, ha(ft(E.marketId)))}
                className="mt-3 min-h-11 w-full rounded-xl border border-dashed border-line px-3 text-left text-[0.95rem] text-plan active:bg-sunk"
              >
                ＋ 這攤每次要付電費 {money(ft(E.marketId))}，還沒填，按這裡帶入
              </button>
            )}
          </Card>
        </Section>
        <Section title="地瓜數量（包）" id="counts">
          <Card>
            <div
              className={cx("mb-2 grid gap-1 px-0.5 text-center text-[0.8rem] font-bold leading-tight text-muted", ou)}
            >
              <span />
              <span className="text-plan">預計</span>
              <span>實際烤</span>
              <span>單價</span>
              <span>總金額</span>
              <span>剩餘包數</span>
            </div>
            {V.map((N) => {
              let O = E.counts[N.id] ?? {
                carried: "",
                cooked: "",
                remaining: "",
              };
              let [Z, pe, Fe] = [Number(O.carried) || 0, Number(O.cooked) || 0, Number(O.remaining) || 0];
              let ca = (Z || pe || Fe) && Math.abs(Z - pe - Fe) > 0.001;
              let Ct = cu(N.id);
              let Qe = Ct !== undefined && Number(Ct) > 0;
              let me = no(N.id);
              let ut = me !== null && (!Number.isFinite(me) || me < 0);
              let Oa = me !== null && !ut && Qe && Math.abs(me - Number(Ct)) > 0.004;
              let io = ut ? 0 : me ?? Number(Qe ? Ct : N.default_price);
              let fu = pe * io;
              let km = Gh(N.id);
              let oo = "field tnum h-12 min-h-0 px-0 text-center text-[0.95rem] font-bold";
              return (
                <div key={N.id} className={cx("mb-2 rounded-xl p-0.5", ca && "bg-warn-soft")}>
                  <div className={cx("grid items-center gap-1", ou)}>
                    <span className="text-center text-lg font-bold">{N.short_name ?? N.name}</span>
                    <input
                      className={cx(oo, "field-plan")}
                      style={style}
                      inputMode="decimal"
                      placeholder="0"
                      aria-label={`${N.name} \u9810\u8A08`}
                      value={O.carried}
                      onChange={(ml) => Ra(N.id, "carried", ml.target.value)}
                    />
                    <input
                      className={oo}
                      style={style}
                      inputMode="decimal"
                      placeholder="0"
                      aria-label={`${N.name} \u5BE6\u969B\u70E4`}
                      value={O.cooked}
                      onChange={(ml) => Ra(N.id, "cooked", ml.target.value)}
                    />
                    <input
                      className={cx(oo, ut && "border-warn")}
                      style={style}
                      inputMode="decimal"
                      placeholder={Qe ? String(Number(Ct)) : "0"}
                      aria-label={`${N.name} \u55AE\u50F9`}
                      value={O.price ?? ""}
                      onChange={(ml) => Ra(N.id, "price", ml.target.value)}
                    />
                    <output
                      aria-label={`${N.name} \u7E3D\u91D1\u984D`}
                      className={cx(
                        "tnum flex h-12 items-center justify-center rounded-xl bg-sunk px-0.5 text-[0.85rem] font-bold",
                        !fu && "text-muted"
                      )}
                    >
                      {fu ? money(fu) : "0"}
                    </output>
                    <input
                      className={oo}
                      style={style}
                      inputMode="decimal"
                      placeholder="0"
                      aria-label={`${N.name} \u5269\u9918\u5305\u6578`}
                      value={O.remaining}
                      onChange={(ml) => Ra(N.id, "remaining", ml.target.value)}
                    />
                  </div>
                  <div className={cx("grid gap-1 text-center text-[0.72rem] leading-tight", ou)}>
                    <span className="col-start-4 tnum mt-0.5">
                      <span className={Oa ? "font-bold text-warn" : "text-muted"}>
                        {Qe ? `\u7CFB\u7D71 ${money(Ct)}` : "系統 無資料"}
                      </span>
                    </span>
                    {km !== undefined && <span className="col-start-6 tnum mt-0.5 text-muted">庫存 {num(km)}</span>}
                  </div>
                  {ca ? (
                    <p className="mt-1 px-1 text-sm font-bold text-warn">
                      預計 {Z} ≠ 烤 {pe} ＋ 剩 {Fe}（差 {Math.round((Z - pe - Fe) * 100) / 100}），仍可儲存
                    </p>
                  ) : null}
                </div>
              );
            })}
            {(() => {
              let N = (Z) => V.reduce((acc, item) => acc + (Number(E.counts[item.id]?.[Z]) || 0), 0);
              let O = "tnum flex h-10 items-center justify-center font-bold";
              return (
                <div className={cx("mb-3 grid items-center gap-1 border-t-2 border-line p-0.5 pt-1.5", ou)}>
                  <span />
                  <span className={O}>{num(N("carried"))}</span>
                  <span className={O}>{num(N("cooked"))}</span>
                  <span className="text-center text-[0.95rem] font-bold">合計</span>
                  <output
                    aria-label="地瓜總金額合計"
                    className={cx(O, "rounded-xl bg-flesh-soft px-0.5 text-[0.9rem] text-flesh-ink")}
                  >
                    {money(Gs)}
                  </output>
                  <span className={O}>{num(N("remaining"))}</span>
                </div>
              );
            })()}
            <p className="text-sm text-muted">
              剩餘包數會自動算（預計 −
              實際烤），沒烤完的轉回庫存、隔天帶出去時再扣；剩餘也可以自己改。單價沒填就用「系統」單價（依進貨先進先出算），有填就用您填的；跟系統不一樣時會變紅色。總金額
              = 實際烤 × 單價。
            </p>
          </Card>
        </Section>
        <Section title="營業雜支" id="misc">
          <Card className="grid grid-cols-2 gap-x-3 gap-y-1">
            {$.map((N) => {
              let O = SALARY_CODES.includes(N.code ?? "");
              let Z = PAY_CODES.includes(N.code ?? "") && xa(E.lines[N.id] ?? "") > 0;
              return (
                <Field
                  key={N.id}
                  label={O ? <span className="text-salary">{N.name}</span> : N.name}
                  error={parseMoney(E.lines[N.id] ?? "") === null ? "看不懂" : null}
                  className={cx("min-w-0", Z && "col-span-2")}
                >
                  <MoneyInput salary={O} value={E.lines[N.id] ?? ""} onChange={(pe) => z(N.id, pe)} />
                  {PAY_CODES.includes(N.code ?? "") && xa(E.lines[N.id] ?? "") > 0 && (
                    <div className="mt-2">
                      <div
                        className="flex flex-wrap gap-2"
                        role="radiogroup"
                        aria-label={`${N.name}\u600E\u9EBC\u4ED8`}
                      >
                        {PAY_METHODS.map((pe) => {
                          let Fe = (Tt[N.id] ?? "現金") === pe;
                          return (
                            <button
                              key={pe}
                              type="button"
                              role="radio"
                              aria-checked={Fe}
                              onClick={() =>
                                Ge({
                                  pay: {
                                    ...Tt,
                                    [N.id]: pe,
                                  },
                                })
                              }
                              className={cx(
                                "flex min-h-11 items-center gap-2 rounded-xl border-[1.5px] px-3 text-[0.95rem]",
                                Fe ? "border-flesh bg-flesh-soft font-bold text-flesh-ink" : "border-line"
                              )}
                            >
                              <span
                                aria-hidden
                                className={cx(
                                  "flex h-5 w-5 items-center justify-center rounded border-[1.5px] text-xs",
                                  Fe ? "border-flesh bg-flesh text-white" : "border-line text-transparent"
                                )}
                              >
                                ✓
                              </span>
                              {pe}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {(Tt[N.id] ?? "現金") === "現金"
                          ? "從金庫付現金"
                          : `${
                              Tt[N.id]
                            }\u4ED8\u7684\uFF1A\u4E0D\u6263\u91D1\u5EAB\uFF0C\u8A18\u6210 Minnie \u5148\u588A\uFF08\u751F\u610F\u6B20 Minnie\uFF09`}
                      </p>
                    </div>
                  )}
                </Field>
              );
            })}
          </Card>
        </Section>
        <Section
          title="其他雜支"
          aside=<button
            type="button"
            className="min-h-10 text-sm font-bold text-flesh-ink"
            onClick={() =>
              Ge({
                extras: [
                  ...J,
                  {
                    desc: "",
                    amount: "",
                  },
                ],
              })
            }
          >
            ＋新增一筆
          </button>
        >
          <Card>
            {_.map((N) => {
              let checked = ge[N.id] !== undefined;
              return (
                <div key={N.id} className="mb-3">
                  <Toggle
                    checked={checked}
                    onChange={(Z) => Ys(N.id, Z ? String(Number(N.default_wage ?? 0) || "") : null)}
                    label=<span className="text-salary">{N.name}今天有來幫忙</span>
                    hint={checked ? "先記「欠薪水」，月底在「個人」分頁一次付現金" : undefined}
                  />
                  {checked && (
                    <Field
                      label=<span className="text-salary">{N.name}今天的薪水</span>
                      error={parseMoney(ge[N.id] ?? "") === null ? "看不懂" : null}
                      className="mt-2"
                    >
                      <MoneyInput salary value={ge[N.id] ?? ""} onChange={(Z) => Ys(N.id, Z)} />
                    </Field>
                  )}
                </div>
              );
            })}
            <div>
              {G.map((N) => {
                let O = SALARY_CODES.includes(N.code ?? "");
                return (
                  <Field
                    key={N.id}
                    label={O ? <span className="text-salary">{N.name}</span> : N.name}
                    error={parseMoney(E.lines[N.id] ?? "") === null ? "看不懂" : null}
                    className="mb-3"
                  >
                    <MoneyInput salary={O} value={E.lines[N.id] ?? ""} onChange={(Z) => z(N.id, Z)} />
                  </Field>
                );
              })}
            </div>
            {J.map((N, O) => (
              <div key={N.id ?? `new${O}`} className="mb-3 flex items-start gap-2">
                <input
                  className="field min-w-0 flex-[1.3]"
                  value={N.desc}
                  placeholder="內容，例如：買手套"
                  aria-label={`\u7B2C ${O + 1} \u7B46\u5167\u5BB9`}
                  onChange={(Z) =>
                    Qs(O, {
                      desc: Z.target.value,
                    })
                  }
                />
                <MoneyInput
                  className="min-w-0 flex-1"
                  value={N.amount}
                  onChange={(Z) =>
                    Qs(O, {
                      amount: Z,
                    })
                  }
                />
                <button
                  type="button"
                  aria-label={`\u522A\u9664\u7B2C ${O + 1} \u7B46`}
                  className="flex h-12 w-10 shrink-0 items-center justify-center rounded-lg text-xl text-muted active:bg-sunk"
                  onClick={() =>
                    Ge({
                      extras: J.filter((Z, pe) => pe !== O),
                    })
                  }
                >
                  ✕
                </button>
              </div>
            ))}
            {parseMoney(J.map((N) => N.amount).find((N) => parseMoney(N) === null) ?? "") === null && (
              <p className="mb-2 text-sm font-bold text-warn">有金額看不懂，請檢查</p>
            )}
            <button
              type="button"
              onClick={() =>
                Ge({
                  extras: [
                    ...J,
                    {
                      desc: "",
                      amount: "",
                    },
                  ],
                })
              }
              className="flex min-h-11 w-full items-center justify-center rounded-lg border-[1.5px] border-dashed border-line font-bold text-flesh-ink active:bg-sunk"
            >
              ＋新增一筆（內容＋金額）
            </button>
            <p className="mt-2 text-sm text-muted">自己新增的項目會算在營業支出的「其他雜項」。</p>
          </Card>
        </Section>
        {W.length > 0 && (
          <Section title="固定支出（不算營業）">
            <Card>
              {W.map((N) => (
                <Field
                  key={N.id}
                  label={N.name}
                  error={parseMoney(E.lines[N.id] ?? "") === null ? "看不懂" : null}
                  className="mb-3"
                >
                  <MoneyInput value={E.lines[N.id] ?? ""} onChange={(O) => z(N.id, O)} />
                </Field>
              ))}
            </Card>
          </Section>
        )}
        {K.length > 0 && (
          <p className="mb-4 px-1 text-sm text-muted">
            這天有 {K.length} 筆生活開銷，已移到
            <a className="font-bold text-flesh-ink underline" href="#/personal">
              「個人」分頁
            </a>
            。
          </p>
        )}
        <Section
          id="life"
          title="生活開銷（用當天賺的錢・從金庫拿）"
          aside=<span className="tnum font-bold">{money(Oe.reduce((acc, item) => acc + xa(item.amount), 0))}</span>
        >
          <Card>
            <p className="mb-3 text-sm text-muted">
              買菜、飲料、餐費這類生活開銷記在這裡：從金庫扣錢，但算在「個人」，<b>不算生意的營業支出</b>。
            </p>
            {Oe.map((N, O) => (
              <div key={N.id ?? `new${O}`} className="mb-3 rounded-xl bg-sunk/50 p-2">
                <div className="mb-2 flex gap-2">
                  <select
                    className="field min-w-0 flex-1"
                    value={N.catId}
                    aria-label={`\u7B2C ${O + 1} \u7B46\u5206\u985E`}
                    onChange={(Z) =>
                      Nt(O, {
                        catId: Z.target.value,
                      })
                    }
                  >
                    {k.map((Z) => (
                      <option key={Z.id} value={Z.id}>
                        {Z.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    aria-label={`\u522A\u9664\u7B2C ${O + 1} \u7B46\u751F\u6D3B\u958B\u92B7`}
                    className="flex h-12 w-10 shrink-0 items-center justify-center rounded-lg text-xl text-muted active:bg-sunk"
                    onClick={() =>
                      Ge({
                        life: Oe.filter((Z, pe) => pe !== O),
                      })
                    }
                  >
                    ✕
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    className="field min-w-0 flex-[1.3]"
                    value={N.desc}
                    placeholder="內容，例如：買菜"
                    aria-label={`\u7B2C ${O + 1} \u7B46\u5167\u5BB9`}
                    onChange={(Z) =>
                      Nt(O, {
                        desc: Z.target.value,
                      })
                    }
                  />
                  <MoneyInput
                    className="min-w-0 flex-1"
                    value={N.amount}
                    onChange={(Z) =>
                      Nt(O, {
                        amount: Z,
                      })
                    }
                  />
                </div>
              </div>
            ))}
            <div className="grid grid-cols-4 gap-2">
              {[
                ["買菜", "MEALS"],
                ["飲料", "MEALS"],
                ["餐費", "MEALS"],
                ["其他", "PERSONAL_OTHER"],
              ].map(([N, O]) => (
                <button
                  key={N}
                  type="button"
                  onClick={() => va(N === "其他" ? "" : N, O)}
                  className="flex min-h-11 items-center justify-center rounded-lg border-[1.5px] border-dashed border-line font-bold text-flesh-ink active:bg-sunk"
                >
                  ＋{N}
                </button>
              ))}
            </div>
          </Card>
        </Section>
        <Section title="備註" id="note">
          <textarea
            className="field min-h-20"
            value={E.note}
            placeholder="例如：下午下雨、客人少"
            onChange={(N) =>
              Ge({
                note: N.target.value,
              })
            }
          />
        </Section>
      </fieldset>
      <Section
        title="這天的單筆記帳"
        aside=<a className="text-sm font-bold text-flesh-ink" href={`#/entry?type=expense&d=${dayStr}`}>
          ＋單筆記帳
        </a>
      >
        {Nm.length ? (
          <TxnList txns={Nm} showDate={false} onChanged={onSaved} />
        ) : (
          <p className="px-1 text-sm text-muted">進貨付款、代墊、轉帳等，用「單筆記帳」另外記。</p>
        )}
      </Section>
      {bd && (
        <div className="mb-6 text-center">
          <Btn kind="danger" onClick={Ph}>
            刪除這一天的記帳
          </Btn>
        </div>
      )}
      <div className="safe-bottom fixed inset-x-0 bottom-16 z-30 border-t border-line bg-card/95 backdrop-blur md:bottom-0 md:left-56">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <div className="flex-1">
            <div className="text-sm text-muted">今日營業淨利（試算）</div>
            <div className={cx("tnum text-2xl font-bold", xm < 0 && "text-warn")}>{money(xm)}</div>
            {(Gs > 0 || Xs > 0 || Vs > 0 || mu > 0) && (
              <div className="text-xs text-muted">
                {[
                  Gs > 0 && `\u542B\u5730\u74DC\u6210\u672C\u7D04 ${money(Gs)}`,
                  (Xs || Vs) && `\u542B\u55AE\u7B46\u8A18\u5E33 ${Xs - Vs >= 0 ? "+" : "−"}${money(Math.abs(Xs - Vs))}`,
                  mu > 0 && `\u5176\u4ED6\u6536\u5165 ${money(mu)} \u4E0D\u7B97\u6DE8\u5229`,
                ]
                  .filter(Boolean)
                  .join("・")}
              </div>
            )}
          </div>
          {it && !fe && <Badge tone="flesh">未儲存</Badge>}
          {fe ? (
            <Btn
              kind="primary"
              big
              onClick={() => {
                setFe(false);
                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                });
              }}
            >
              修改
            </Btn>
          ) : (
            <Btn kind="primary" big onClick={Zh} disabled={saving}>
              {saving ? "儲存中…" : "儲存"}
            </Btn>
          )}
        </div>
      </div>
    </>
  );
}
