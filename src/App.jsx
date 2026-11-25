import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { FeedbackProvider, cx } from "./components/ui.jsx";
import { useRoute } from "./lib/router.js";
import { StoreProvider, useStore } from "./lib/store.jsx";
import { auth, getConfig } from "./lib/supabase.js";
import { Accounts } from "./pages/Accounts.jsx";
import { Daily } from "./pages/Daily.jsx";
import { Entry, Transactions } from "./pages/Entry.jsx";
import { Home } from "./pages/Home.jsx";
import { LoginForm, SetupForm } from "./pages/Login.jsx";
import { Personal } from "./pages/Personal.jsx";
import { PortionCost } from "./pages/PortionCost.jsx";
import { Purchases } from "./pages/Purchases.jsx";
import { Reconcile } from "./pages/Reconcile.jsx";
import { Reports } from "./pages/Reports.jsx";
import { Settings } from "./pages/Settings.jsx";
import { StallMonth } from "./pages/StallMonth.jsx";
import { WarehouseRent } from "./pages/WarehouseRent.jsx";

const NAV_ITEMS = [
  {
    href: "#/",
    key: "",
    label: "首頁",
    icon: "M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  },
  {
    href: "#/daily",
    key: "daily",
    label: "記帳",
    icon: "M5 3h11l3 3v15H5zM8 9h8M8 13h8M8 17h5",
  },
  {
    href: "#/purchases",
    key: "purchases",
    label: "進貨",
    icon: "M3 7h18l-2 12H5zM8 7V5a4 4 0 0 1 8 0v2",
  },
  {
    href: "#/accounts",
    key: "accounts",
    label: "帳戶",
    icon: "M3 9.5 12 4l9 5.5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18",
  },
  {
    href: "#/reports",
    key: "reports",
    label: "報表",
    icon: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  },
  {
    href: "#/personal",
    key: "personal",
    label: "個人",
    icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  },
  {
    href: "#/settings",
    key: "settings",
    label: "設定",
    icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z",
  },
];

function BottomNav({ active }) {
  return (
    <nav
      aria-label="主選單"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 print:hidden border-t border-line bg-card/95 backdrop-blur md:inset-y-0 md:left-0 md:right-auto md:w-56 md:border-r md:border-t-0 md:pt-6"
    >
      <div className="hidden px-6 pb-6 text-xl font-bold md:block">🍠 地瓜營運</div>
      <ul className="mx-auto flex max-w-lg md:max-w-none md:flex-col md:gap-1 md:px-3">
        {NAV_ITEMS.map((t) => {
          let a = t.key === active;
          return (
            <li key={t.key} className="flex-1">
              <a
                href={t.href}
                aria-current={a ? "page" : undefined}
                className={cx(
                  "flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-bold md:min-h-12 md:flex-row md:justify-start md:gap-3 md:rounded-xl md:px-3 md:text-base",
                  a ? "text-flesh-ink md:bg-flesh-soft" : "text-muted"
                )}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={a ? 2.4 : 1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d={t.icon} />
                </svg>
                {t.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Shell() {
  let route = useRoute();
  let t = useStore();
  let [a, n] = route.parts;
  let l;
  if (t.loading && t.categories.length === 0) {
    l = <div className="flex min-h-[60vh] items-center justify-center text-muted">載入營運資料中…</div>;
  } else if (t.error && t.categories.length === 0) {
    l = (
      <div className="mx-auto max-w-md p-6">
        <div role="alert" className="rounded-2xl bg-warn-soft p-5 text-warn">
          <p className="mb-3 font-bold">{t.error}</p>
          <button
            className="font-bold underline"
            onClick={() => {
              t.reload();
            }}
          >
            重新載入
          </button>
          <span className="mx-2">·</span>
          <a className="font-bold underline" href="#/settings/connection">
            檢查連線設定
          </a>
        </div>
      </div>
    );
  } else {
    switch (a) {
      case "daily":
        l = <Daily route={route} />;
        break;
      case "entry":
        l = <Entry route={route} />;
        break;
      case "transactions":
        l = <Transactions route={route} />;
        break;
      case "purchases":
        l = <Purchases route={route} />;
        break;
      case "reports":
        l = <Reports route={route} />;
        break;
      case "accounts":
        l = <Accounts route={route} />;
        break;
      case "settings":
        l = <Settings route={route} />;
        break;
      case "personal":
        l = <Personal route={route} />;
        break;
      case "warehouse-rent":
        l = <WarehouseRent route={route} />;
        break;
      case "reconcile":
        l = <Reconcile route={route} />;
        break;
      case "stall-month":
        l = <StallMonth route={route} />;
        break;
      case "portion-cost":
        l = <PortionCost />;
        break;
      default:
        l = <Home />;
    }
  }
  let active =
    a === "entry" && route.query.get("book") === "personal"
      ? "personal"
      : a === "entry" || a === "transactions"
      ? "daily"
      : a ?? "";
  return (
    <div className="min-h-dvh md:pl-56 print:pl-0">
      <main key={route.path + (n ?? "")}>{l}</main>
      <BottomNav active={active} />
    </div>
  );
}

function App() {
  let [e, setE] = React.useState(auth.session);
  let [a, setA] = React.useState(!!getConfig());
  React.useEffect(() => auth.onChange(setE), []);
  return (
    <FeedbackProvider>
      {a ? (
        e ? (
          <StoreProvider>
            <Shell />
          </StoreProvider>
        ) : (
          <SetupForm onReset={() => setA(false)} />
        )
      ) : (
        <LoginForm onDone={() => setA(true)} />
      )}
    </FeedbackProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ("serviceWorker" in navigator && location.protocol === "https:") {
  let e = !!navigator.serviceWorker.controller;
  let t = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (e && !t) {
      t = true;
      location.reload();
    }
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js", {
        updateViaCache: "none",
      })
      .then((a) => {
        let n = () => {
          if (document.visibilityState === "visible") {
            a.update().catch(() => {});
          }
        };
        document.addEventListener("visibilitychange", n);
        setInterval(n, 1800 * 1000);
      })
      .catch(() => {});
  });
}
