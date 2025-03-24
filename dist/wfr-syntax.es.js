const x = [
  { type: "comment", pattern: /^\/\/.*(?:\n|$)/ },
  { type: "comment-start", pattern: /^\/\*/ },
  { type: "comment-end", pattern: /^\*\// },
  { type: "comment-content", pattern: /^(?:[^\*]+|\*(?!\/))/ },
  { type: "selector-bracket", pattern: /^[\[\]]/ },
  { type: "selector-attribute", pattern: /^[\w.]*(?=\s*(?:=|\]))/ },
  { type: "selector-operator", pattern: /^=/ },
  { type: "selector-regex-prefix", pattern: /^(regex:|re:|[:$])/ },
  { type: "selector-regex-pattern", pattern: /^\/[^]*?(?=[\[\]\s,{}])/ },
  // Updated: Match until boundary
  { type: "selector-value", pattern: /^(?:"[^"]*"|'[^']*'|[^,\s\[\]{}]+)/ },
  { type: "block-bracket", pattern: /^[\{\}]/ },
  { type: "feature-name", pattern: /^[\w-]+(?=\s*:)/ },
  { type: "feature-colon", pattern: /^:/ },
  { type: "feature-value", pattern: /^(?:on|off|\d+(?:\.\d+)?(?:px|em|rem|%)?|"[^"]*"|'[^']*')(?=\s*;)/ },
  { type: "feature-semicolon", pattern: /^;/ },
  { type: "comma", pattern: /^,/ },
  { type: "whitespace", pattern: /^\s+/ },
  { type: "unknown", pattern: /^./ }
], h = {
  comment: 4,
  "comment-start": 4,
  "comment-end": 7,
  "comment-content": 7,
  whitespace: 5,
  "selector-value": 8,
  "selector-regex-pattern": 8
};
function m(n) {
  const e = [];
  let t = 0;
  const r = { inSelector: !1, inBlock: !1, inMultiLineComment: !1, afterRegexPrefix: !1, afterSelectorOperator: !1, expectingAttribute: !1 };
  for (; t < n.length; ) {
    const i = n.slice(t);
    let l = !1;
    for (const { type: c, pattern: o } of x) {
      if (!d(c, r)) continue;
      const s = i.match(o);
      if (s) {
        const a = s[0];
        w(c, a, r), e.push({ type: c, text: a, state: { ...r } }), t += a.length, l = !0;
        break;
      }
    }
    l || (e.push({ type: "unknown", text: i[0], state: { ...r } }), t++);
  }
  return e;
}
function d(n, e) {
  return !(e.inMultiLineComment && (h[n] & 1) !== 1 || !e.inMultiLineComment && (h[n] & 2) === 2 || n === "selector-value" && !e.afterSelectorOperator || n === "selector-regex-prefix" && e.inBlock || n === "feature-colon" && !e.inBlock || n === "selector-attribute" && !e.expectingAttribute || n === "selector-regex-pattern" && !e.afterRegexPrefix || e.afterRegexPrefix && n !== "selector-regex-pattern" && n !== "whitespace" && n !== "selector-bracket" || n !== "whitespace" && n !== "selector-attribute" && e.expectingAttribute);
}
function w(n, e, t) {
  n === "comment-start" ? t.inMultiLineComment = !0 : n === "comment-end" ? t.inMultiLineComment = !1 : n === "selector-bracket" ? (t.inSelector = e === "[", t.afterSelectorOperator = !1, t.expectingAttribute = e === "[", e === "]" && (t.expectingAttribute = !1, t.afterRegexPrefix = !1)) : n === "block-bracket" ? (t.inBlock = e === "{", e === "{" && (t.inSelector = !1), t.afterRegexPrefix = !1, t.expectingAttribute = !1) : n === "selector-operator" ? t.afterSelectorOperator = !0 : n === "selector-regex-prefix" ? t.afterRegexPrefix = !0 : n === "selector-value" || n === "selector-regex-pattern" ? (t.afterSelectorOperator = !1, t.afterRegexPrefix = !1) : n === "selector-attribute" && (t.expectingAttribute = !1);
}
const y = [
  { type: "regex-escape", pattern: /^\\[\\\/\[\](){}|.^$*+?]/ },
  { type: "regex-char-class-escape", pattern: /^\\[wWdDsS]/ },
  { type: "regex-anchor", pattern: /^[\^$]|\\b|\\B/ },
  { type: "regex-punctuation", pattern: /^[()[\]]/ },
  { type: "regex-alternation", pattern: /^\|/ },
  { type: "regex-punctuation", pattern: /^[{}]/ },
  { type: "regex-quantifier", pattern: /^[?*+]/ },
  { type: "regex-punctuation", pattern: /^\./ },
  { type: "regex-literal", pattern: /^[^\\\s\/\[\](){}|.^$*+?]+/ },
  { type: "unknown", pattern: /^./ }
], C = (n) => {
  const e = [];
  let t = 0;
  const r = [];
  for (; t < n.length; ) {
    const i = n.slice(t);
    let l = !1;
    if (r.length > 0 && (i[0] === "]" || i[0] === "}")) {
      const c = r[r.length - 1];
      if (c.opener === "[" && i[0] === "]" || c.opener === "{" && i[0] === "}") {
        if (e.push({ type: "regex-punctuation", text: i[0] }), r.pop(), e.length >= 2 && e[e.length - 2].type === "regex-punctuation" && e[e.length - 2].text === "{") {
          const o = e[e.length - 1].text;
          o.match(/^\d+(?:,\d*)?$/) && (e[e.length - 2] = { type: "regex-punctuation", text: "{" }, e[e.length - 1] = { type: "regex-quantifier", text: o }, e[e.length] = { type: "regex-punctuation", text: "}" });
        }
        t++, l = !0;
      }
    }
    if (!l)
      for (const { type: c, pattern: o } of y) {
        const s = i.match(o);
        if (s) {
          const a = s[0];
          c === "regex-punctuation" && (a === "[" || a === "{") && r.push({ opener: a, closer: a === "[" ? "]" : "}" }), e.push({ type: c, text: a }), t += a.length, l = !0;
          break;
        }
      }
    l || (e.push({ type: "unknown", text: i[0] }), t++);
  }
  for (; r.length > 0; )
    e.push({ type: "regex-punctuation", text: r.pop().closer });
  return e;
}, g = (n) => {
  const e = document.createDocumentFragment();
  if (!n.startsWith("/"))
    return e.appendChild(document.createTextNode(n)), e;
  const t = document.createElement("span");
  t.className = "wfr-regex-punctuation", t.textContent = "/", e.appendChild(t);
  let r = n.slice(1), i = "", l = !1, c = r;
  if (r.endsWith("/i") ? (i = "i", c = r.slice(0, -2), l = !0) : r.endsWith("/") && (c = r.slice(0, -1), l = !0), C(c).forEach((s) => {
    const a = document.createElement("span");
    a.className = `wfr-${s.type}`, a.textContent = s.text, e.appendChild(a);
  }), l) {
    const s = document.createElement("span");
    s.className = "wfr-regex-punctuation", s.textContent = "/", e.appendChild(s);
  }
  if (i) {
    const s = document.createElement("span");
    s.className = "wfr-regex-flag", s.textContent = i, e.appendChild(s);
  }
  return e;
};
function b(n) {
  const e = document.createDocumentFragment();
  return n.forEach((t) => {
    if (t.type === "whitespace")
      e.appendChild(document.createTextNode(t.text));
    else if (t.type === "selector-regex-pattern" || t.type === "feature-regex")
      console.log(122, t.text, g(t.text)), e.appendChild(g(t.text));
    else {
      const r = document.createElement("span");
      let i = `wfr-${t.type}`;
      t.type.startsWith("comment") && (i += " wfr-comment"), t.type === "selector-regex-prefix" && (i += " wfr-regex-prefix"), r.className = i, r.textContent = t.text, e.appendChild(r);
    }
  }), e;
}
function O(n) {
  const e = n.textContent;
  try {
    const t = m(e), r = b(t);
    n.replaceChildren(r);
  } catch (t) {
    console.error("WFR highlighting error:", t), n.textContent = e;
  }
}
function u(n, e) {
  const t = Math.min(n.indexOf("*") + 1 || 1 / 0, n.indexOf("?") + 1 || 1 / 0) - 1;
  if (t >= 1 / 0) return n === e;
  if (t > 0 && !e.startsWith(n.substring(0, t))) return !1;
  const r = n.length, i = e.length;
  let l = 0;
  const c = new Array(i - t + 1);
  for (c[0] = { i: t, j: t }; l >= 0; ) {
    let { i: o, j: s } = c[l--];
    for (; o < r && n.charCodeAt(o) !== 42 && n.charCodeAt(o) !== 63 && !(s >= i || n.charCodeAt(o) !== e.charCodeAt(s)); )
      o++, s++;
    if (o === r) {
      if (s === i) return !0;
      continue;
    }
    let a = n.charCodeAt(o);
    if (a === 42)
      if (o + 1 < r && n.charCodeAt(o + 1) === 42) {
        if (o += 2, o >= r) return !0;
        for (let f = i; f >= s; f--)
          c[++l] = { i: o, j: f };
      } else {
        o++;
        let f = s;
        for (; f < i && e.charCodeAt(f) !== 47 && e.charCodeAt(f) !== 46; ) f++;
        if (o === r) {
          if (f === i) return !0;
          continue;
        }
        for (let p = f; p >= s; p--)
          c[++l] = { i: o, j: p };
      }
    else a === 63 && s < i && e.charCodeAt(s) !== 47 && e.charCodeAt(s) !== 46 && (c[++l] = { i: o + 1, j: s + 1 });
  }
  return !1;
}
function k(n) {
  if (typeof n != "string") return null;
  const e = n.indexOf("/");
  if (!(e === 6 && n.startsWith("regex:"))) {
    if (!(e === 3 && n.startsWith("re:"))) {
      if (!(e === 1 && (n[0] === ":" || n[0] === "$"))) return null;
    }
  }
  const t = e + 1, r = n.lastIndexOf("/");
  if (r <= t) return null;
  const i = n.slice(t, r), l = n.slice(r + 1);
  try {
    return new RegExp(i, l);
  } catch (c) {
    return null;
  }
}
function A(n) {
  const e = [];
  for (let t = 0, r = n.length; t < r; ) {
    let i = n[t];
    if (i <= " ") {
      t++;
      continue;
    }
    if (i === "/") {
      if (n[t + 1] === "/") {
        t = n.indexOf(`
`, t + 2) + 1 || r;
        continue;
      }
      if (n[t + 1] === "*") {
        t = n.indexOf("*/", t + 2) + 1 || r + 1;
        continue;
      }
    } else if ("[]{}:;,".includes(i)) {
      e.push(i), t++;
      continue;
    } else if (i === "=") {
      e.push("="), t++;
      let c = n.indexOf("/", t);
      if (c > t && c < t + 8) {
        const o = n.slice(t).match(/^(?:regex:|re:|[:$])\/.*?(?:\/[a-z]*)?(?=[\s\]\},;]|$)/i);
        if (o) {
          e.push(o[0]), t += o[0].length;
          continue;
        }
      }
    }
    const l = t;
    for (; t < r && n[t] > " " && !"[]{}:;,=".includes(n[t]); ) t++;
    t > l && e.push(n.slice(l, t));
  }
  return e;
}
function E(n) {
  const e = A(n), t = [];
  for (let r = 0, i = e.length; r < i; )
    if (e[r] === "[") {
      const l = [[]];
      try {
        for (; r < i && e[r] !== "{"; )
          if (e[r] === "[") {
            const o = e[++r];
            if (r++, !o) throw new Error("Missing attribute");
            let s = null, a = !1;
            if (e[r] === "=") {
              s = e[++r], r++;
              const f = k(s);
              f && (s = f, a = !0);
            } else if (!o.startsWith("query.")) throw new Error('Expected "="');
            if (e[r++] !== "]") throw new Error('Missing "]"');
            l[l.length - 1].push({ attr: o, value: s, isRegex: a });
          } else if (e[r] === ",")
            l.push([]), r++;
          else throw new Error("Invalid selector");
        if (e[r++] !== "{") throw new Error('Missing "{"');
        const c = {};
        for (; r < i && e[r] !== "}"; ) {
          const o = e[r++], s = e[r++], a = e[r++], f = e[r++];
          if (s !== ":" || f !== ";") throw new Error("Invalid feature");
          c[o] = a;
        }
        if (e[r++] !== "}") throw new Error('Missing "}"');
        t.push({ selectors: l.filter((o) => o.length), features: c });
      } catch (c) {
        for (; r < i && e[r] !== "["; ) r++;
      }
    } else r++;
  return t;
}
function S({ attr: n, value: e, isRegex: t }, { host: r, pathname: i, searchParams: l }) {
  if (n === "host") return t ? e.test(r) : u(e, r);
  if (n === "path") return t ? e.test(i) : u(e, i);
  if (n === "domain") {
    const c = r.split(".").slice(-2).join(".");
    return t ? e.test(r) : u(e, c);
  }
  if (n.startsWith("query.")) {
    const c = l.get(n.slice(6));
    return e === null ? c !== null : c && (t ? e.test(c) : u(e, c));
  }
  return !1;
}
function R(n, e) {
  const t = {};
  for (const r of n)
    r.selectors.some((i) => i.every((l) => S(l, e))) && Object.assign(t, r.features);
  return t;
}
function P(n, e) {
  try {
    const t = new URL(e);
    return R(E(n), t);
  } catch (t) {
    return {};
  }
}
export {
  P as getWfrFeatures,
  O as highlight
};
//# sourceMappingURL=wfr-syntax.es.js.map
