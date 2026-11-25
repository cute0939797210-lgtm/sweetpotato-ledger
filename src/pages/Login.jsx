import * as React from "react";
import { Btn, Field } from "../components/ui.jsx";
import { DbError, auth, hasBuiltinConfig, saveConfig } from "../lib/supabase.js";

function AuthShell({
  children
}) {
  return <div className="flex min-h-dvh items-center justify-center p-5"><div className="w-full max-w-sm"><div className="mb-8 text-center"><div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-[1.6rem] bg-skin text-5xl" aria-hidden>🍠</div><h1 className="text-2xl font-bold">地瓜營運記帳</h1></div>{children}</div></div>;
}

export function SetupForm({
  onReset
}) {
  let [t, setT] = React.useState("");
  let [n, setN] = React.useState("");
  let [s, setS] = React.useState(false);
  let [o, setO] = React.useState(null);
  async function b(m) {
    m.preventDefault();
    if (!t || !n) {
      setO("請輸入帳號和密碼。");
      return;
    }
    setS(true);
    setO(null);
    try {
      await auth.signIn(t.trim(), n);
    } catch (error) {
      setO(error instanceof DbError ? error.friendly : "登入失敗，請再試一次。");
    } finally {
      setS(false);
    }
  }
  return <AuthShell><form onSubmit={b} className="rounded-3xl bg-card p-5"><Field label="帳號（Email）"><input className="field" type="email" autoComplete="username" inputMode="email" value={t} onChange={m => setT(m.target.value)} /></Field><Field label="密碼" error={o}><input className="field" type="password" autoComplete="current-password" value={n} onChange={m => setN(m.target.value)} /></Field><Btn kind="primary" big type="submit" className="w-full" disabled={s}>{s ? "登入中…" : "登入"}</Btn></form><p className="mt-4 text-center text-sm text-muted">帳號由管理者在 Supabase 建立，不開放註冊。{!hasBuiltinConfig() && <><br /><button className="mt-2 font-bold text-flesh-ink underline" onClick={() => {
          saveConfig(null);
          onReset();
        }}>更改資料庫連線</button></>}</p></AuthShell>;
}

export function LoginForm({
  onDone
}) {
  let [t, setT] = React.useState("");
  let [n, setN] = React.useState("");
  let [s, setS] = React.useState(false);
  let [o, setO] = React.useState(null);
  async function b(m) {
    m.preventDefault();
    let url = t.trim().replace(/\/$/, "");
    if (!/^https:\/\/.+/.test(url)) {
      setO("網址要以 https:// 開頭，例如 https://abcd.supabase.co");
      return;
    }
    if (n.trim().length < 20) {
      setO("請貼上完整的 anon public key。");
      return;
    }
    setS(true);
    setO(null);
    try {
      let r = await fetch(`${url}/auth/v1/settings`, {
        headers: {
          apikey: n.trim()
        }
      });
      if (!r.ok) {
        throw new Error(String(r.status));
      }
      saveConfig({
        url,
        anonKey: n.trim()
      });
      onDone();
    } catch {
      setO("連不上這個資料庫，請確認網址和 key 是否正確、網路是否正常。");
    } finally {
      setS(false);
    }
  }
  return <AuthShell><form onSubmit={b} className="rounded-3xl bg-card p-5"><p className="mb-4 text-muted">第一次使用，請輸入 Supabase 的連線資料（在 Supabase 專案的 Settings → API）。</p><Field label="Project URL"><input className="field" inputMode="url" autoCapitalize="off" placeholder="https://xxxx.supabase.co" value={t} onChange={m => setT(m.target.value)} /></Field><Field label="anon public key" error={o}><textarea className="field min-h-24 font-mono text-sm" autoCapitalize="off" value={n} onChange={m => setN(m.target.value)} /></Field><Btn kind="primary" big type="submit" className="w-full" disabled={s}>{s ? "連線中…" : "連線"}</Btn></form></AuthShell>;
}
