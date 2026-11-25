// esbuild 的 class 欄位小工具（原本在共用 chunk 裡）
const d = (obj, key, value) => {
  const k = typeof key !== "symbol" ? key + "" : key;
  if (k in obj) Object.defineProperty(obj, k, {
    enumerable: true,
    configurable: true,
    writable: true,
    value
  });else obj[k] = value;
  return value;
};

const CONFIG_KEY = "sp:config";

const SESSION_KEY = "sp:session";

function lsGet(e) {
  try {
    return localStorage.getItem(e);
  } catch {
    return null;
  }
}

function lsSet(e, t) {
  try {
    if (t === null) {
      localStorage.removeItem(e);
    } else {
      localStorage.setItem(e, t);
    }
  } catch {}
}

export function getConfig() {
  let window_SP_CONFIG = window.SP_CONFIG;
  if (window_SP_CONFIG?.url && window_SP_CONFIG?.anonKey) {
    return {
      url: window_SP_CONFIG.url.replace(/\/$/, ""),
      anonKey: window_SP_CONFIG.anonKey
    };
  }
  let t = lsGet(CONFIG_KEY);
  if (!t) {
    return null;
  }
  try {
    let a = JSON.parse(t);
    if (a.url && a.anonKey) {
      return {
        url: a.url.replace(/\/$/, ""),
        anonKey: a.anonKey
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveConfig(e) {
  lsSet(CONFIG_KEY, e ? JSON.stringify(e) : null);
}

export function hasBuiltinConfig() {
  return !!(window.SP_CONFIG?.url && window.SP_CONFIG?.anonKey);
}

export class DbError extends Error {
  constructor(a, n = 0, l = "") {
    super(a);
    d(this, "friendly", a);
    d(this, "status", n);
    d(this, "detail", l);
  }
}

function friendlyError(e, t) {
  let a = t.message || t.error_description || t.msg || "";
  if (e === 401 || e === 403) {
    if (/invalid login|invalid_grant|Invalid login credentials/i.test(a)) {
      return "帳號或密碼不正確。";
    }
    return "登入已過期，請重新登入。";
  }
  if (/[一-鿿]/.test(a)) {
    return a;
  }
  if (t.code === "23505") {
    return "這筆資料已經存在，請改用編輯。";
  }
  if (t.code === "23503") {
    return "這筆資料還有其他紀錄在使用，不能這樣修改。";
  }
  if (t.code === "23514") {
    return "資料不符合規則（例如金額必須大於 0），請檢查後再試一次。";
  }
  if (t.code === "PGRST202" || t.code === "42P01" || t.code === "42883") {
    return "資料庫還沒有建立完成，請確認已執行安裝 SQL。";
  }
  return "儲存失敗，請再試一次。";
}

let session = (() => {
  let e = lsGet(SESSION_KEY);
  try {
    if (e) {
      return JSON.parse(e);
    }
    return null;
  } catch {
    return null;
  }
})();

const sessionListeners = new Set();

function setSession(e) {
  session = e;
  lsSet(SESSION_KEY, e ? JSON.stringify(e) : null);
  sessionListeners.forEach(t => t(e));
}

async function authRequest(e, t) {
  let a = requireConfig();
  let n;
  try {
    n = await fetch(`${a.url}/auth/v1/${e}`, {
      method: "POST",
      headers: {
        apikey: a.anonKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(t)
    });
  } catch {
    throw new DbError("網路連線失敗，請檢查網路後再試一次。");
  }
  let l = await n.json().catch(() => ({}));
  if (!n.ok) {
    throw new DbError(friendlyError(n.status === 400 ? 401 : n.status, l), n.status);
  }
  return {
    access_token: l.access_token,
    refresh_token: l.refresh_token,
    expires_at: l.expires_at ?? Math.floor(Date.now() / 1000) + (l.expires_in ?? 3600),
    email: l.user?.email ?? ""
  };
}

let refreshing = null;

async function ensureSession() {
  if (!session) {
    throw new DbError("登入已過期，請重新登入。", 401);
  }
  if (!(session.expires_at - 60 > Date.now() / 1000)) {
    refreshing ??= authRequest("token?grant_type=refresh_token", {
      refresh_token: session.refresh_token
    }).then(e => setSession({
      ...e,
      email: e.email || session?.email || ""
    })).catch(e => {
      if (e instanceof DbError && e.status >= 400) {
        setSession(null);
      }
      throw e;
    }).finally(() => {
      refreshing = null;
    });
    await refreshing;
  }
}

export const auth = {
  get session() {
    return session;
  },
  onChange(e) {
    sessionListeners.add(e);
    return () => {
      sessionListeners.delete(e);
    };
  },
  async signIn(email, password) {
    setSession(await authRequest("token?grant_type=password", {
      email,
      password
    }));
  },
  async signOut() {
    let e = getConfig();
    if (e && session) {
      fetch(`${e.url}/auth/v1/logout`, {
        method: "POST",
        headers: {
          apikey: e.anonKey,
          Authorization: `Bearer ${session.access_token}`
        }
      }).catch(() => {});
    }
    setSession(null);
  }
};

function requireConfig() {
  let e = getConfig();
  if (!e) {
    throw new DbError("尚未設定資料庫連線。");
  }
  return e;
}

export const eq = (e, t) => [e, `eq.${t}`];

export const gte = (e, t) => [e, `gte.${t}`];

export const lte = (e, t) => [e, `lte.${t}`];

export const gt = (e, t) => [e, `gt.${t}`];

export const isNull = e => [e, "is.null"];

export const inList = (e, t) => [e, `in.(${t.map(a => `"${a}"`).join(",")})`];

function buildQuery(e) {
  let urlSearchParams = new URLSearchParams();
  urlSearchParams.set("select", e.select ?? "*");
  (e.where ?? []).forEach(([a, n]) => urlSearchParams.append(a, n));
  if (e.order) {
    urlSearchParams.set("order", e.order);
  }
  if (e.limit) {
    urlSearchParams.set("limit", String(e.limit));
  }
  if (e.offset) {
    urlSearchParams.set("offset", String(e.offset));
  }
  return urlSearchParams.toString();
}

async function request(e, t = {}) {
  let a = requireConfig();
  await ensureSession();
  let n;
  try {
    n = await fetch(`${a.url}/rest/v1/${e}`, {
      ...t,
      headers: {
        apikey: a.anonKey,
        Authorization: `Bearer ${session?.access_token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        ...t.headers
      }
    });
  } catch {
    throw new DbError("網路連線失敗，資料沒有儲存。請檢查網路後再試一次。");
  }
  if (n.status === 204) {
    return [];
  }
  let l = await n.text();
  let s = l ? JSON.parse(l) : null;
  if (!n.ok) {
    console.error("[db]", n.status, s);
    if (n.status === 401) {
      setSession(null);
    }
    throw new DbError(friendlyError(n.status, s ?? {}), n.status, s?.message ?? "");
  }
  return s;
}

export const db = {
  select(e, t = {}) {
    return request(`${e}?${buildQuery(t)}`, {
      method: "GET"
    });
  },
  insert(e, t) {
    return request(e, {
      method: "POST",
      body: JSON.stringify(t)
    });
  },
  update(e, t, where) {
    return request(`${e}?${buildQuery({
      where,
      select: "*"
    })}`, {
      method: "PATCH",
      body: JSON.stringify(t)
    });
  },
  softDelete(e, t) {
    return this.update(e, {
      deleted_at: new Date().toISOString()
    }, [eq("id", t)]);
  },
  rpc(e, t) {
    return request(`rpc/${e}`, {
      method: "POST",
      body: JSON.stringify(t)
    });
  }
};
