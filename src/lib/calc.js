export function evalFormula(e) {
  let t = e
    .replace(/[，,\s]/g, "")
    .replace(/[×xX]/g, "*")
    .replace(/÷/g, "/")
    .replace(/[－—]/g, "-")
    .replace(/＋/g, "+");
  if (!t || !/^[0-9.+\-*/()]+$/.test(t)) {
    return null;
  }
  let a = 0;
  let n = () => t[a];
  function l() {
    let o = s();
    while (n() === "+" || n() === "-") {
      let c = t[a++];
      let b = s();
      o = c === "+" ? o + b : o - b;
    }
    return o;
  }
  function s() {
    let o = i();
    while (n() === "*" || n() === "/") {
      let c = t[a++];
      let b = i();
      o = c === "*" ? o * b : o / b;
    }
    return o;
  }
  function i() {
    if (n() === "-") {
      a++;
      return -i();
    }
    if (n() === "(") {
      a++;
      let c = l();
      if (t[a++] !== ")") {
        throw new Error("括號");
      }
      return c;
    }
    let o = /^[0-9]+(\.[0-9]+)?/.exec(t.slice(a));
    if (!o) {
      throw new Error("數字");
    }
    a += o[0].length;
    return Number(o[0]);
  }
  try {
    let o = l();
    if (a !== t.length || !isFinite(o)) {
      return null;
    }
    return Math.round(o * 100) / 100;
  } catch {
    return null;
  }
}

export function looksLikeFormula(e) {
  return /[0-9][+\-*/×÷]/.test(e.replace(/\s/g, ""));
}
