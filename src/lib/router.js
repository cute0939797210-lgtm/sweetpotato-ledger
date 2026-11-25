import * as React from "react";

function parseHash() {
  let e = location.hash.replace(/^#/, "") || "/";
  let [t, a = ""] = e.split("?");
  return {
    path: t,
    parts: t.split("/").filter(Boolean),
    query: new URLSearchParams(a)
  };
}

export function useRoute() {
  let [e, setE] = React.useState(parseHash);
  React.useEffect(() => {
    let a = () => {
      setE(parseHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", a);
    return () => window.removeEventListener("hashchange", a);
  }, []);
  return e;
}

export function navigate(e) {
  location.hash = e;
}

export function goBack(e = "/") {
  if (history.length > 1) {
    history.back();
  } else {
    navigate(e);
  }
}
