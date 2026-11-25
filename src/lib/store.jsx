import * as React from "react";
import { DbError, db, isNull } from "./supabase.js";

const EMPTY_STORE = {
  categories: [],
  accounts: [],
  payers: [],
  markets: [],
  schedules: [],
  items: [],
  suppliers: [],
  settings: {},
  settingRows: [],
  recurring: []
};

const StoreContext = React.createContext(null);

const NOT_DELETED = {
  where: [isNull("deleted_at")]
};

export function StoreProvider({
  children
}) {
  let [t, setT] = React.useState(EMPTY_STORE);
  let [n, setN] = React.useState(true);
  let [s, setS] = React.useState(null);
  let reload = React.useCallback(async () => {
    setN(true);
    try {
      await db.rpc("generate_recurring", {}).catch(() => {});
      let [categories, accounts, payers, markets, schedules, items, suppliers, _] = await Promise.all([db.select("categories", {
        ...NOT_DELETED,
        order: "kind,tier,sort_order,name"
      }), db.select("accounts", {
        ...NOT_DELETED,
        order: "sort_order,name"
      }), db.select("payers", {
        ...NOT_DELETED,
        order: "sort_order,name"
      }), db.select("markets", {
        ...NOT_DELETED,
        order: "is_temporary,sort_order,name"
      }), db.select("market_schedules", {
        ...NOT_DELETED,
        order: "weekday,effective_from"
      }), db.select("items", {
        ...NOT_DELETED,
        order: "sort_order,name"
      }), db.select("suppliers", {
        ...NOT_DELETED,
        order: "sort_order,name"
      }), db.select("app_settings", NOT_DELETED)]);
      let recurring = await db.select("recurring_txns", {
        ...NOT_DELETED,
        order: "day_of_month,name"
      }).catch(() => []);
      let settings = {};
      _.forEach(g => {
        settings[g.key] = g.value;
      });
      setT({
        categories,
        accounts,
        payers,
        markets,
        schedules,
        items,
        suppliers,
        settings,
        settingRows: _,
        recurring
      });
      setS(null);
    } catch (error) {
      setS(error instanceof DbError ? error.friendly : "目前無法載入資料，請稍後再試。");
    } finally {
      setN(false);
    }
  }, []);
  React.useEffect(() => {
    reload();
  }, [reload]);
  let c = React.useMemo(() => {
    let b = r => y => {
      if (y) {
        return r.find(h => h.id === y);
      }
    };
    let acctByCode = r => t.accounts.find(y => y.code === r);
    let d = r => {
      if (typeof t.settings[r] === "string") {
        return t.settings[r];
      }
      return "";
    };
    return {
      ...t,
      loading: n,
      error: s,
      reload,
      cat: b(t.categories),
      catByCode: r => t.categories.find(y => y.code === r),
      acct: b(t.accounts),
      acctByCode,
      market: b(t.markets),
      item: b(t.items),
      supplier: b(t.suppliers),
      payer: b(t.payers),
      cashAccountId: acctByCode(d("daily_cash_account_code") || "CASH_BOX")?.id ?? t.accounts[0]?.id ?? null,
      drawerFromAccountId: acctByCode(d("drawer_from_account_code") || "RESERVE")?.id ?? null
    };
  }, [t, n, s, reload]);
  return <StoreContext.Provider value={c}>{children}</StoreContext.Provider>;
}

export function useStore() {
  let e = React.useContext(StoreContext);
  if (!e) {
    throw new Error("StoreProvider missing");
  }
  return e;
}

export function useQuery(e, t) {
  let [a, setA] = React.useState({
    data: null,
    loading: true,
    error: null
  });
  let [l, setL] = React.useState(0);
  React.useEffect(() => {
    let i = true;
    setA(o => ({
      ...o,
      loading: true,
      error: null
    }));
    e().then(data => {
      if (i) {
        setA({
          data,
          loading: false,
          error: null
        });
      }
    }, o => {
      if (i) {
        setA({
          data: null,
          loading: false,
          error: o instanceof DbError ? o.friendly : "目前無法載入資料，請稍後再試。"
        });
      }
    });
    return () => {
      i = false;
    };
  }, [...t, l]);
  return {
    ...a,
    reload: () => setL(i => i + 1)
  };
}
