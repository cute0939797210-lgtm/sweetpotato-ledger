const loadZip = async () => (await import("jszip")).default;

const xmlEscape = (e) => e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function colName(e) {
  let t = "";
  for (let a = e + 1; a > 0; a = Math.floor((a - 1) / 26)) {
    t = String.fromCharCode(65 + ((a - 1) % 26)) + t;
  }
  return t;
}

export async function writeXlsx(e) {
  let t = await loadZip();
  let a = new t();
  a.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${e
      .map(
        (n, l) =>
          `<Override PartName="/xl/worksheets/sheet${
            l + 1
          }.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
      )
      .join("")}</Types>`
  );
  a.file(
    "_rels/.rels",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
  );
  a.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${e
      .map(
        (n, l) =>
          `<sheet name="${xmlEscape(n.name.slice(0, 31).replace(/[\\/?*[\]:]/g, "-"))}" sheetId="${l + 1}" r:id="rId${
            l + 1
          }"/>`
      )
      .join("")}</sheets></workbook>`
  );
  a.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${e
      .map(
        (n, l) =>
          `<Relationship Id="rId${
            l + 1
          }" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${
            l + 1
          }.xml"/>`
      )
      .join(
        ""
      )}<Relationship Id="rIdS" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
  );
  a.file(
    "xl/styles.xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.##"/></numFmts><fonts count="2"><font><sz val="12"/><name val="Microsoft JhengHei"/></font><font><b/><sz val="12"/><name val="Microsoft JhengHei"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="4"><xf/><xf fontId="1" applyFont="1"/><xf numFmtId="164" applyNumberFormat="1"/><xf numFmtId="164" fontId="1" applyNumberFormat="1" applyFont="1"/></cellXfs></styleSheet>'
  );
  e.forEach((n, l) => {
    let s = new Set(n.boldRows ?? [0]);
    let i = n.widths
      ? `<cols>${n.widths
          .map((c, b) => `<col min="${b + 1}" max="${b + 1}" width="${c}" customWidth="1"/>`)
          .join("")}</cols>`
      : "";
    let o = n.rows
      .map(
        (c, b) =>
          `${
            `<row r="${b + 1}">` +
            c
              .map((m, d) => {
                if (m == null || m === "") {
                  return "";
                }
                let r = `${colName(d)}${b + 1}`;
                if (typeof m === "number" && isFinite(m)) {
                  return `<c r="${r}" s="${s.has(b) ? 3 : 2}"><v>${m}</v></c>`;
                }
                return `<c r="${r}" t="inlineStr"${s.has(b) ? ' s="1"' : ""}><is><t xml:space="preserve">${xmlEscape(
                  String(m)
                )}</t></is></c>`;
              })
              .join("")
          }</row>`
      )
      .join("");
    a.file(
      `xl/worksheets/sheet${l + 1}.xml`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${i}<sheetData>${o}</sheetData></worksheet>`
    );
  });
  return a.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function download_(e, t) {
  let aElement = document.createElement("a");
  aElement.href = URL.createObjectURL(e);
  aElement.download = t;
  document.body.appendChild(aElement);
  aElement.click();
  setTimeout(() => {
    URL.revokeObjectURL(aElement.href);
    aElement.remove();
  }, 1000);
}

function colIndex(e) {
  return (/^[A-Z]+/.exec(e)?.[0] ?? "A").split("").reduce((acc, item) => acc * 26 + item.charCodeAt(0) - 64, 0) - 1;
}

export async function readXlsx(e) {
  let a = await (await loadZip()).loadAsync(e);
  let n = async (m) => {
    let d = a.file(m);
    if (d) {
      return new DOMParser().parseFromString(await d.async("string"), "application/xml");
    }
    return null;
  };
  let l = await n("xl/workbook.xml");
  let s = await n("xl/_rels/workbook.xml.rels");
  if (!l || !s) {
    throw new Error("不是 Excel 檔案");
  }
  let i = [];
  (await n("xl/sharedStrings.xml"))?.querySelectorAll("si").forEach((m) =>
    i.push(
      Array.from(m.querySelectorAll("t"))
        .map((d) => d.textContent ?? "")
        .join("")
    )
  );
  let map = new Map();
  s.querySelectorAll("Relationship").forEach((m) =>
    map.set(m.getAttribute("Id") ?? "", m.getAttribute("Target") ?? "")
  );
  let b = [];
  for (let m of Array.from(l.querySelectorAll("sheet"))) {
    let d =
      m.getAttribute("r:id") ??
      m.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") ??
      "";
    let r = map.get(d) ?? "";
    r = r.startsWith("/") ? r.slice(1) : `xl/${r}`;
    let y = await n(r);
    if (!y) {
      continue;
    }
    let h = [];
    y.querySelectorAll("sheetData > row").forEach((v) => {
      let _ = Number(v.getAttribute("r") ?? h.length + 1) - 1;
      let u = [];
      v.querySelectorAll("c").forEach((p) => {
        let g = p.getAttribute("t");
        let f = p.querySelector("v")?.textContent ?? null;
        let k = null;
        if (g === "s") {
          k = i[Number(f)] ?? "";
        } else if (g === "inlineStr") {
          k = p.querySelector("is")?.textContent ?? "";
        } else if (g === "str" || g === "e") {
          k = f;
        } else if (g === "b") {
          k = f === "1" ? "TRUE" : "FALSE";
        } else if (f !== null) {
          k = Number(f);
        }
        u[colIndex(p.getAttribute("r") ?? "A")] = k;
      });
      h[_] = u;
    });
    for (let v = 0; v < h.length; v++) {
      h[v] ?? (h[v] = []);
    }
    b.push({
      name: m.getAttribute("name") ?? `Sheet${b.length + 1}`,
      rows: h,
    });
  }
  return b;
}

export function parseCsv(e) {
  let t = [];
  let a = [];
  let n = "";
  let l = false;
  for (let s = 0; s < e.length; s++) {
    let i = e[s];
    if (l) {
      if (i === '"' && e[s + 1] === '"') {
        n += '"';
        s++;
      } else if (i === '"') {
        l = false;
      } else {
        n += i;
      }
    } else if (i === '"') {
      l = true;
    } else if (i === ",") {
      a.push(n);
      n = "";
    } else if (
      i ===
        `
` ||
      i === "\r"
    ) {
      if (
        i === "\r" &&
        e[s + 1] ===
          `
`
      ) {
        s++;
      }
      a.push(n);
      t.push(a);
      a = [];
      n = "";
    } else {
      n += i;
    }
  }
  if (n || a.length) {
    a.push(n);
    t.push(a);
  }
  return [
    {
      name: "CSV",
      rows: t.map((s) =>
        s.map((i) => {
          if (i !== "" && i !== undefined && /^-?[0-9.,]+$/.test(String(i))) {
            return Number(String(i).replace(/,/g, ""));
          }
          return i;
        })
      ),
    },
  ];
}

export function excelDate(e) {
  if (typeof e === "number" && e > 20000 && e < 80000) {
    return new Date(Date.UTC(1899, 11, 30) + Math.round(e) * 86400000).toISOString().slice(0, 10);
  }
  if (typeof e === "string") {
    let t = /^(\d{2,4})[-/.年](\d{1,2})[-/.月](\d{1,2})/.exec(e.trim());
    if (t) {
      let a = Number(t[1]);
      if (a < 200) {
        a += 1911;
      }
      return `${a}-${String(t[2]).padStart(2, "0")}-${String(t[3]).padStart(2, "0")}`;
    }
  }
  return null;
}
