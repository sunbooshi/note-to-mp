/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const B = globalThis, W = B.ShadowRoot && (B.ShadyCSS === void 0 || B.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, F = Symbol(), K = /* @__PURE__ */ new WeakMap();
let lt = class {
  constructor(t, e, i) {
    if (this._$cssResult$ = !0, i !== F) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t, this.t = e;
  }
  get styleSheet() {
    let t = this.o;
    const e = this.t;
    if (W && t === void 0) {
      const i = e !== void 0 && e.length === 1;
      i && (t = K.get(e)), t === void 0 && ((this.o = t = new CSSStyleSheet()).replaceSync(this.cssText), i && K.set(e, t));
    }
    return t;
  }
  toString() {
    return this.cssText;
  }
};
const ut = (s) => new lt(typeof s == "string" ? s : s + "", void 0, F), gt = (s, ...t) => {
  const e = s.length === 1 ? s[0] : t.reduce((i, r, o) => i + ((n) => {
    if (n._$cssResult$ === !0) return n.cssText;
    if (typeof n == "number") return n;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + n + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(r) + s[o + 1], s[0]);
  return new lt(e, s, F);
}, ft = (s, t) => {
  if (W) s.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
  else for (const e of t) {
    const i = document.createElement("style"), r = B.litNonce;
    r !== void 0 && i.setAttribute("nonce", r), i.textContent = e.cssText, s.appendChild(i);
  }
}, X = W ? (s) => s : (s) => s instanceof CSSStyleSheet ? ((t) => {
  let e = "";
  for (const i of t.cssRules) e += i.cssText;
  return ut(e);
})(s) : s;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { is: bt, defineProperty: $t, getOwnPropertyDescriptor: mt, getOwnPropertyNames: yt, getOwnPropertySymbols: xt, getPrototypeOf: _t } = Object, x = globalThis, Q = x.trustedTypes, vt = Q ? Q.emptyScript : "", j = x.reactiveElementPolyfillSupport, P = (s, t) => s, z = { toAttribute(s, t) {
  switch (t) {
    case Boolean:
      s = s ? vt : null;
      break;
    case Object:
    case Array:
      s = s == null ? s : JSON.stringify(s);
  }
  return s;
}, fromAttribute(s, t) {
  let e = s;
  switch (t) {
    case Boolean:
      e = s !== null;
      break;
    case Number:
      e = s === null ? null : Number(s);
      break;
    case Object:
    case Array:
      try {
        e = JSON.parse(s);
      } catch {
        e = null;
      }
  }
  return e;
} }, V = (s, t) => !bt(s, t), Y = { attribute: !0, type: String, converter: z, reflect: !1, useDefault: !1, hasChanged: V };
Symbol.metadata ?? (Symbol.metadata = Symbol("metadata")), x.litPropertyMetadata ?? (x.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
let k = class extends HTMLElement {
  static addInitializer(t) {
    this._$Ei(), (this.l ?? (this.l = [])).push(t);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t, e = Y) {
    if (e.state && (e.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(t) && ((e = Object.create(e)).wrapped = !0), this.elementProperties.set(t, e), !e.noAccessor) {
      const i = Symbol(), r = this.getPropertyDescriptor(t, i, e);
      r !== void 0 && $t(this.prototype, t, r);
    }
  }
  static getPropertyDescriptor(t, e, i) {
    const { get: r, set: o } = mt(this.prototype, t) ?? { get() {
      return this[e];
    }, set(n) {
      this[e] = n;
    } };
    return { get: r, set(n) {
      const l = r == null ? void 0 : r.call(this);
      o == null || o.call(this, n), this.requestUpdate(t, l, i);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(t) {
    return this.elementProperties.get(t) ?? Y;
  }
  static _$Ei() {
    if (this.hasOwnProperty(P("elementProperties"))) return;
    const t = _t(this);
    t.finalize(), t.l !== void 0 && (this.l = [...t.l]), this.elementProperties = new Map(t.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(P("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(P("properties"))) {
      const e = this.properties, i = [...yt(e), ...xt(e)];
      for (const r of i) this.createProperty(r, e[r]);
    }
    const t = this[Symbol.metadata];
    if (t !== null) {
      const e = litPropertyMetadata.get(t);
      if (e !== void 0) for (const [i, r] of e) this.elementProperties.set(i, r);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [e, i] of this.elementProperties) {
      const r = this._$Eu(e, i);
      r !== void 0 && this._$Eh.set(r, e);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(t) {
    const e = [];
    if (Array.isArray(t)) {
      const i = new Set(t.flat(1 / 0).reverse());
      for (const r of i) e.unshift(X(r));
    } else t !== void 0 && e.push(X(t));
    return e;
  }
  static _$Eu(t, e) {
    const i = e.attribute;
    return i === !1 ? void 0 : typeof i == "string" ? i : typeof t == "string" ? t.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    var t;
    this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), (t = this.constructor.l) == null || t.forEach((e) => e(this));
  }
  addController(t) {
    var e;
    (this._$EO ?? (this._$EO = /* @__PURE__ */ new Set())).add(t), this.renderRoot !== void 0 && this.isConnected && ((e = t.hostConnected) == null || e.call(t));
  }
  removeController(t) {
    var e;
    (e = this._$EO) == null || e.delete(t);
  }
  _$E_() {
    const t = /* @__PURE__ */ new Map(), e = this.constructor.elementProperties;
    for (const i of e.keys()) this.hasOwnProperty(i) && (t.set(i, this[i]), delete this[i]);
    t.size > 0 && (this._$Ep = t);
  }
  createRenderRoot() {
    const t = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return ft(t, this.constructor.elementStyles), t;
  }
  connectedCallback() {
    var t;
    this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this.enableUpdating(!0), (t = this._$EO) == null || t.forEach((e) => {
      var i;
      return (i = e.hostConnected) == null ? void 0 : i.call(e);
    });
  }
  enableUpdating(t) {
  }
  disconnectedCallback() {
    var t;
    (t = this._$EO) == null || t.forEach((e) => {
      var i;
      return (i = e.hostDisconnected) == null ? void 0 : i.call(e);
    });
  }
  attributeChangedCallback(t, e, i) {
    this._$AK(t, i);
  }
  _$ET(t, e) {
    var o;
    const i = this.constructor.elementProperties.get(t), r = this.constructor._$Eu(t, i);
    if (r !== void 0 && i.reflect === !0) {
      const n = (((o = i.converter) == null ? void 0 : o.toAttribute) !== void 0 ? i.converter : z).toAttribute(e, i.type);
      this._$Em = t, n == null ? this.removeAttribute(r) : this.setAttribute(r, n), this._$Em = null;
    }
  }
  _$AK(t, e) {
    var o, n;
    const i = this.constructor, r = i._$Eh.get(t);
    if (r !== void 0 && this._$Em !== r) {
      const l = i.getPropertyOptions(r), a = typeof l.converter == "function" ? { fromAttribute: l.converter } : ((o = l.converter) == null ? void 0 : o.fromAttribute) !== void 0 ? l.converter : z;
      this._$Em = r;
      const d = a.fromAttribute(e, l.type);
      this[r] = d ?? ((n = this._$Ej) == null ? void 0 : n.get(r)) ?? d, this._$Em = null;
    }
  }
  requestUpdate(t, e, i, r = !1, o) {
    var n;
    if (t !== void 0) {
      const l = this.constructor;
      if (r === !1 && (o = this[t]), i ?? (i = l.getPropertyOptions(t)), !((i.hasChanged ?? V)(o, e) || i.useDefault && i.reflect && o === ((n = this._$Ej) == null ? void 0 : n.get(t)) && !this.hasAttribute(l._$Eu(t, i)))) return;
      this.C(t, e, i);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(t, e, { useDefault: i, reflect: r, wrapped: o }, n) {
    i && !(this._$Ej ?? (this._$Ej = /* @__PURE__ */ new Map())).has(t) && (this._$Ej.set(t, n ?? e ?? this[t]), o !== !0 || n !== void 0) || (this._$AL.has(t) || (this.hasUpdated || i || (e = void 0), this._$AL.set(t, e)), r === !0 && this._$Em !== t && (this._$Eq ?? (this._$Eq = /* @__PURE__ */ new Set())).add(t));
  }
  async _$EP() {
    this.isUpdatePending = !0;
    try {
      await this._$ES;
    } catch (e) {
      Promise.reject(e);
    }
    const t = this.scheduleUpdate();
    return t != null && await t, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    var i;
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this._$Ep) {
        for (const [o, n] of this._$Ep) this[o] = n;
        this._$Ep = void 0;
      }
      const r = this.constructor.elementProperties;
      if (r.size > 0) for (const [o, n] of r) {
        const { wrapped: l } = n, a = this[o];
        l !== !0 || this._$AL.has(o) || a === void 0 || this.C(o, void 0, n, a);
      }
    }
    let t = !1;
    const e = this._$AL;
    try {
      t = this.shouldUpdate(e), t ? (this.willUpdate(e), (i = this._$EO) == null || i.forEach((r) => {
        var o;
        return (o = r.hostUpdate) == null ? void 0 : o.call(r);
      }), this.update(e)) : this._$EM();
    } catch (r) {
      throw t = !1, this._$EM(), r;
    }
    t && this._$AE(e);
  }
  willUpdate(t) {
  }
  _$AE(t) {
    var e;
    (e = this._$EO) == null || e.forEach((i) => {
      var r;
      return (r = i.hostUpdated) == null ? void 0 : r.call(i);
    }), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(t)), this.updated(t);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t) {
    return !0;
  }
  update(t) {
    this._$Eq && (this._$Eq = this._$Eq.forEach((e) => this._$ET(e, this[e]))), this._$EM();
  }
  updated(t) {
  }
  firstUpdated(t) {
  }
};
k.elementStyles = [], k.shadowRootOptions = { mode: "open" }, k[P("elementProperties")] = /* @__PURE__ */ new Map(), k[P("finalized")] = /* @__PURE__ */ new Map(), j == null || j({ ReactiveElement: k }), (x.reactiveElementVersions ?? (x.reactiveElementVersions = [])).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const O = globalThis, tt = (s) => s, D = O.trustedTypes, et = D ? D.createPolicy("lit-html", { createHTML: (s) => s }) : void 0, dt = "$lit$", y = `lit$${Math.random().toFixed(9).slice(2)}$`, ht = "?" + y, wt = `<${ht}>`, A = document, U = () => A.createComment(""), N = (s) => s === null || typeof s != "object" && typeof s != "function", Z = Array.isArray, At = (s) => Z(s) || typeof (s == null ? void 0 : s[Symbol.iterator]) == "function", L = `[ 	
\f\r]`, C = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, rt = /-->/g, it = />/g, _ = RegExp(`>|${L}(?:([^\\s"'>=/]+)(${L}*=${L}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), st = /'/g, ot = /"/g, pt = /^(?:script|style|textarea|title)$/i, kt = (s) => (t, ...e) => ({ _$litType$: s, strings: t, values: e }), b = kt(1), S = Symbol.for("lit-noChange"), c = Symbol.for("lit-nothing"), nt = /* @__PURE__ */ new WeakMap(), v = A.createTreeWalker(A, 129);
function ct(s, t) {
  if (!Z(s) || !s.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return et !== void 0 ? et.createHTML(t) : t;
}
const St = (s, t) => {
  const e = s.length - 1, i = [];
  let r, o = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", n = C;
  for (let l = 0; l < e; l++) {
    const a = s[l];
    let d, f, h = -1, $ = 0;
    for (; $ < a.length && (n.lastIndex = $, f = n.exec(a), f !== null); ) $ = n.lastIndex, n === C ? f[1] === "!--" ? n = rt : f[1] !== void 0 ? n = it : f[2] !== void 0 ? (pt.test(f[2]) && (r = RegExp("</" + f[2], "g")), n = _) : f[3] !== void 0 && (n = _) : n === _ ? f[0] === ">" ? (n = r ?? C, h = -1) : f[1] === void 0 ? h = -2 : (h = n.lastIndex - f[2].length, d = f[1], n = f[3] === void 0 ? _ : f[3] === '"' ? ot : st) : n === ot || n === st ? n = _ : n === rt || n === it ? n = C : (n = _, r = void 0);
    const m = n === _ && s[l + 1].startsWith("/>") ? " " : "";
    o += n === C ? a + wt : h >= 0 ? (i.push(d), a.slice(0, h) + dt + a.slice(h) + y + m) : a + y + (h === -2 ? l : m);
  }
  return [ct(s, o + (s[e] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), i];
};
class H {
  constructor({ strings: t, _$litType$: e }, i) {
    let r;
    this.parts = [];
    let o = 0, n = 0;
    const l = t.length - 1, a = this.parts, [d, f] = St(t, e);
    if (this.el = H.createElement(d, i), v.currentNode = this.el.content, e === 2 || e === 3) {
      const h = this.el.content.firstChild;
      h.replaceWith(...h.childNodes);
    }
    for (; (r = v.nextNode()) !== null && a.length < l; ) {
      if (r.nodeType === 1) {
        if (r.hasAttributes()) for (const h of r.getAttributeNames()) if (h.endsWith(dt)) {
          const $ = f[n++], m = r.getAttribute(h).split(y), R = /([.?@])?(.*)/.exec($);
          a.push({ type: 1, index: o, name: R[2], strings: m, ctor: R[1] === "." ? Ct : R[1] === "?" ? Pt : R[1] === "@" ? Ot : I }), r.removeAttribute(h);
        } else h.startsWith(y) && (a.push({ type: 6, index: o }), r.removeAttribute(h));
        if (pt.test(r.tagName)) {
          const h = r.textContent.split(y), $ = h.length - 1;
          if ($ > 0) {
            r.textContent = D ? D.emptyScript : "";
            for (let m = 0; m < $; m++) r.append(h[m], U()), v.nextNode(), a.push({ type: 2, index: ++o });
            r.append(h[$], U());
          }
        }
      } else if (r.nodeType === 8) if (r.data === ht) a.push({ type: 2, index: o });
      else {
        let h = -1;
        for (; (h = r.data.indexOf(y, h + 1)) !== -1; ) a.push({ type: 7, index: o }), h += y.length - 1;
      }
      o++;
    }
  }
  static createElement(t, e) {
    const i = A.createElement("template");
    return i.innerHTML = t, i;
  }
}
function E(s, t, e = s, i) {
  var n, l;
  if (t === S) return t;
  let r = i !== void 0 ? (n = e._$Co) == null ? void 0 : n[i] : e._$Cl;
  const o = N(t) ? void 0 : t._$litDirective$;
  return (r == null ? void 0 : r.constructor) !== o && ((l = r == null ? void 0 : r._$AO) == null || l.call(r, !1), o === void 0 ? r = void 0 : (r = new o(s), r._$AT(s, e, i)), i !== void 0 ? (e._$Co ?? (e._$Co = []))[i] = r : e._$Cl = r), r !== void 0 && (t = E(s, r._$AS(s, t.values), r, i)), t;
}
class Et {
  constructor(t, e) {
    this._$AV = [], this._$AN = void 0, this._$AD = t, this._$AM = e;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t) {
    const { el: { content: e }, parts: i } = this._$AD, r = ((t == null ? void 0 : t.creationScope) ?? A).importNode(e, !0);
    v.currentNode = r;
    let o = v.nextNode(), n = 0, l = 0, a = i[0];
    for (; a !== void 0; ) {
      if (n === a.index) {
        let d;
        a.type === 2 ? d = new T(o, o.nextSibling, this, t) : a.type === 1 ? d = new a.ctor(o, a.name, a.strings, this, t) : a.type === 6 && (d = new Mt(o, this, t)), this._$AV.push(d), a = i[++l];
      }
      n !== (a == null ? void 0 : a.index) && (o = v.nextNode(), n++);
    }
    return v.currentNode = A, r;
  }
  p(t) {
    let e = 0;
    for (const i of this._$AV) i !== void 0 && (i.strings !== void 0 ? (i._$AI(t, i, e), e += i.strings.length - 2) : i._$AI(t[e])), e++;
  }
}
class T {
  get _$AU() {
    var t;
    return ((t = this._$AM) == null ? void 0 : t._$AU) ?? this._$Cv;
  }
  constructor(t, e, i, r) {
    this.type = 2, this._$AH = c, this._$AN = void 0, this._$AA = t, this._$AB = e, this._$AM = i, this.options = r, this._$Cv = (r == null ? void 0 : r.isConnected) ?? !0;
  }
  get parentNode() {
    let t = this._$AA.parentNode;
    const e = this._$AM;
    return e !== void 0 && (t == null ? void 0 : t.nodeType) === 11 && (t = e.parentNode), t;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t, e = this) {
    t = E(this, t, e), N(t) ? t === c || t == null || t === "" ? (this._$AH !== c && this._$AR(), this._$AH = c) : t !== this._$AH && t !== S && this._(t) : t._$litType$ !== void 0 ? this.$(t) : t.nodeType !== void 0 ? this.T(t) : At(t) ? this.k(t) : this._(t);
  }
  O(t) {
    return this._$AA.parentNode.insertBefore(t, this._$AB);
  }
  T(t) {
    this._$AH !== t && (this._$AR(), this._$AH = this.O(t));
  }
  _(t) {
    this._$AH !== c && N(this._$AH) ? this._$AA.nextSibling.data = t : this.T(A.createTextNode(t)), this._$AH = t;
  }
  $(t) {
    var o;
    const { values: e, _$litType$: i } = t, r = typeof i == "number" ? this._$AC(t) : (i.el === void 0 && (i.el = H.createElement(ct(i.h, i.h[0]), this.options)), i);
    if (((o = this._$AH) == null ? void 0 : o._$AD) === r) this._$AH.p(e);
    else {
      const n = new Et(r, this), l = n.u(this.options);
      n.p(e), this.T(l), this._$AH = n;
    }
  }
  _$AC(t) {
    let e = nt.get(t.strings);
    return e === void 0 && nt.set(t.strings, e = new H(t)), e;
  }
  k(t) {
    Z(this._$AH) || (this._$AH = [], this._$AR());
    const e = this._$AH;
    let i, r = 0;
    for (const o of t) r === e.length ? e.push(i = new T(this.O(U()), this.O(U()), this, this.options)) : i = e[r], i._$AI(o), r++;
    r < e.length && (this._$AR(i && i._$AB.nextSibling, r), e.length = r);
  }
  _$AR(t = this._$AA.nextSibling, e) {
    var i;
    for ((i = this._$AP) == null ? void 0 : i.call(this, !1, !0, e); t !== this._$AB; ) {
      const r = tt(t).nextSibling;
      tt(t).remove(), t = r;
    }
  }
  setConnected(t) {
    var e;
    this._$AM === void 0 && (this._$Cv = t, (e = this._$AP) == null || e.call(this, t));
  }
}
class I {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t, e, i, r, o) {
    this.type = 1, this._$AH = c, this._$AN = void 0, this.element = t, this.name = e, this._$AM = r, this.options = o, i.length > 2 || i[0] !== "" || i[1] !== "" ? (this._$AH = Array(i.length - 1).fill(new String()), this.strings = i) : this._$AH = c;
  }
  _$AI(t, e = this, i, r) {
    const o = this.strings;
    let n = !1;
    if (o === void 0) t = E(this, t, e, 0), n = !N(t) || t !== this._$AH && t !== S, n && (this._$AH = t);
    else {
      const l = t;
      let a, d;
      for (t = o[0], a = 0; a < o.length - 1; a++) d = E(this, l[i + a], e, a), d === S && (d = this._$AH[a]), n || (n = !N(d) || d !== this._$AH[a]), d === c ? t = c : t !== c && (t += (d ?? "") + o[a + 1]), this._$AH[a] = d;
    }
    n && !r && this.j(t);
  }
  j(t) {
    t === c ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t ?? "");
  }
}
class Ct extends I {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t) {
    this.element[this.name] = t === c ? void 0 : t;
  }
}
class Pt extends I {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t) {
    this.element.toggleAttribute(this.name, !!t && t !== c);
  }
}
class Ot extends I {
  constructor(t, e, i, r, o) {
    super(t, e, i, r, o), this.type = 5;
  }
  _$AI(t, e = this) {
    if ((t = E(this, t, e, 0) ?? c) === S) return;
    const i = this._$AH, r = t === c && i !== c || t.capture !== i.capture || t.once !== i.once || t.passive !== i.passive, o = t !== c && (i === c || r);
    r && this.element.removeEventListener(this.name, this, i), o && this.element.addEventListener(this.name, this, t), this._$AH = t;
  }
  handleEvent(t) {
    var e;
    typeof this._$AH == "function" ? this._$AH.call(((e = this.options) == null ? void 0 : e.host) ?? this.element, t) : this._$AH.handleEvent(t);
  }
}
class Mt {
  constructor(t, e, i) {
    this.element = t, this.type = 6, this._$AN = void 0, this._$AM = e, this.options = i;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t) {
    E(this, t);
  }
}
const q = O.litHtmlPolyfillSupport;
q == null || q(H, T), (O.litHtmlVersions ?? (O.litHtmlVersions = [])).push("3.3.2");
const Ut = (s, t, e) => {
  const i = (e == null ? void 0 : e.renderBefore) ?? t;
  let r = i._$litPart$;
  if (r === void 0) {
    const o = (e == null ? void 0 : e.renderBefore) ?? null;
    i._$litPart$ = r = new T(t.insertBefore(U(), o), o, void 0, e ?? {});
  }
  return r._$AI(s), r;
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const w = globalThis;
class M extends k {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    var e;
    const t = super.createRenderRoot();
    return (e = this.renderOptions).renderBefore ?? (e.renderBefore = t.firstChild), t;
  }
  update(t) {
    const e = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t), this._$Do = Ut(e, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    var t;
    super.connectedCallback(), (t = this._$Do) == null || t.setConnected(!0);
  }
  disconnectedCallback() {
    var t;
    super.disconnectedCallback(), (t = this._$Do) == null || t.setConnected(!1);
  }
  render() {
    return S;
  }
}
var at;
M._$litElement$ = !0, M.finalized = !0, (at = w.litElementHydrateSupport) == null || at.call(w, { LitElement: M });
const G = w.litElementPolyfillSupport;
G == null || G({ LitElement: M });
(w.litElementVersions ?? (w.litElementVersions = [])).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Nt = { attribute: !0, type: String, converter: z, reflect: !1, hasChanged: V }, Ht = (s = Nt, t, e) => {
  const { kind: i, metadata: r } = e;
  let o = globalThis.litPropertyMetadata.get(r);
  if (o === void 0 && globalThis.litPropertyMetadata.set(r, o = /* @__PURE__ */ new Map()), i === "setter" && ((s = Object.create(s)).wrapped = !0), o.set(e.name, s), i === "accessor") {
    const { name: n } = e;
    return { set(l) {
      const a = t.get.call(this);
      t.set.call(this, l), this.requestUpdate(n, a, s, !0, l);
    }, init(l) {
      return l !== void 0 && this.C(n, void 0, s, l), l;
    } };
  }
  if (i === "setter") {
    const { name: n } = e;
    return function(l) {
      const a = this[n];
      t.call(this, l), this.requestUpdate(n, a, s, !0, l);
    };
  }
  throw Error("Unsupported decorator location: " + i);
};
function u(s) {
  return (t, e) => typeof e == "object" ? Ht(s, t, e) : ((i, r, o) => {
    const n = r.hasOwnProperty(o);
    return r.constructor.createProperty(o, i), n ? Object.getOwnPropertyDescriptor(r, o) : void 0;
  })(s, t, e);
}
var Tt = Object.defineProperty, g = (s, t, e, i) => {
  for (var r = void 0, o = s.length - 1, n; o >= 0; o--)
    (n = s[o]) && (r = n(t, e, r) || r);
  return r && Tt(t, e, r), r;
};
const J = class J extends M {
  constructor() {
    super(...arguments), this.image = null, this.gradient = "", this.direction = "to-br", this.padding = 64, this.imageWidth = null, this.imageHeight = null, this.borderStyle = "none", this.borderRadius = 12, this.showShadow = !1, this.watermarkText = "", this.watermarkFont = "Inter", this.watermarkSize = 14, this.watermarkColor = "rgba(0,0,0,0.3)", this.watermarkPosition = "bottom-right", this.watermarkOpacity = 1, this.backgroundRadius = 0, this.className = "";
  }
  // Removed createRenderRoot() to use Shadow DOM by default
  getBorderClass(t) {
    switch (t) {
      case "mac-light":
        return "border-mac-light";
      case "mac-dark":
        return "border-mac-dark";
      case "light-border":
        return "border-light";
      case "dark-border":
        return "border-dark";
      case "stacked-cards":
        return "border-stacked";
      default:
        return "";
    }
  }
  renderMacWindowControls(t) {
    return t !== "mac-light" && t !== "mac-dark" ? null : b`
      <div class="mac-controls">
        <div class="dot dot-red"></div>
        <div class="dot dot-amber"></div>
        <div class="dot dot-green"></div>
      </div>
    `;
  }
  renderLiquidGlassBorder(t, e) {
    return t !== "liquid-glass" ? null : b`
      <div 
        aria-hidden="true" 
        style="
          position: absolute;
          inset: 0px;
          margin: -8px;
          border-radius: ${e}px;
          padding: 64px;
          pointer-events: none;
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          backdrop-filter: url(#liquid-glass) blur(1.5px) brightness(1.12);
          box-shadow: rgba(255, 255, 255, 0.15) 0px 0px 0px 0.5px inset, rgba(255, 255, 255, 0.1) 0px 0px 0px 1px inset, rgba(0, 0, 0, 0.05) 0px 1px 3px;
          contain: paint;
          isolation: isolate;
          will-change: filter, backdrop-filter;
          z-index: 0;
        "
      ></div>
    `;
  }
  renderGlassBorder(t, e) {
    return t !== "light-glass" && t !== "dark-glass" ? null : b`
      <div
        aria-hidden="true"
        style="
          position: absolute;
          inset: 0;
          overflow: hidden;
          border-radius: ${e}px;
          margin: -8px;
          pointer-events: none;
          backdrop-filter: ${t === "light-glass" ? "blur(2em) saturate(200%) contrast(150%) brightness(105%)" : "blur(2em) saturate(200%) contrast(150%) brightness(95%)"};
          background: ${t === "light-glass" ? "#fff9" : "#0009"};
          will-change: backdrop-filter;
          transform: translateZ(0);
        "
      ></div>
    `;
  }
  renderStackedCards(t, e) {
    if (t !== "stacked-cards") return null;
    const i = `
      position: absolute;
      inset: 0;
      border-radius: ${e}px ${e}px 0 0;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.88) 100%);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.4);
      border-bottom: none;
    `;
    return b`
      <div
        aria-hidden="true"
        style="position: absolute; inset: 0; pointer-events: none;"
      >
        <!-- Back layer -->
        <div class="stacked-card"
          style="
            ${i}
            top: -28px;
            right: 64px;
            left: 64px;
            box-shadow: 
              0 12px 30px rgba(0, 0, 0, 0.04),
              0 4px 10px rgba(0, 0, 0, 0.02),
              inset 0 1px 0 rgba(255, 255, 255, 0.5);
            z-index: -2;
          "
        ></div>
        <!-- Middle layer -->
        <div class="stacked-card"
          style="
            ${i}
            top: -14px;
            right: 32px;
            left: 32px;
            box-shadow: 
              0 15px 35px rgba(0, 0, 0, 0.06),
              0 6px 15px rgba(0, 0, 0, 0.03),
              inset 0 1px 0 rgba(255, 255, 255, 0.6);
            z-index: -1;
          "
        ></div>
      </div>
    `;
  }
  renderSVGFilter() {
    const t = this.borderStyle === "liquid-glass";
    return t ? b`
      <svg style="width: 0; height: 0; position: absolute;" aria-hidden="true" focusable="false">
        ${t ? b`
        <filter id="liquid-glass" x="-15%" y="-15%" width="130%" height="130%" filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-color="white" result="white" />
          <feGaussianBlur in="white" stdDeviation="40" result="radialBlur" />
          <feColorMatrix in="radialBlur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="directionalMap" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blurOuter" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blurInner" />
          <feComposite in="blurOuter" in2="blurInner" operator="out" result="edgeRing" />
          <feComponentTransfer in="edgeRing" result="edgeMap">
            <feFuncA type="linear" slope="0.8" intercept="0" />
          </feComponentTransfer>
          <feTurbulence type="turbulence" baseFrequency="0.01" numOctaves="1" seed="9" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="1 0 0 0 -0.5  0 1 0 0 -0.5  0 0 1 0 -0.5  0 0 0 1 0" result="centeredNoise" />
          <feBlend in="centeredNoise" in2="edgeMap" mode="multiply" result="weightedNoise" />
          <feBlend in="directionalMap" in2="weightedNoise" mode="normal" result="combinedDisplacement" />
          <feDisplacementMap in="SourceGraphic" in2="combinedDisplacement" scale="40" xChannelSelector="R" yChannelSelector="G" result="displaced" />
          <feColorMatrix in="displaced" type="matrix" values="1 0 0 0 0   0 0 0 0 0   0 0 0 0 0   0 0 0 1 0" result="rIso" />
          <feOffset in="rIso" dx="0.5" dy="-0.4" result="r" />
          <feColorMatrix in="displaced" type="matrix" values="0 0 0 0 0   0 1 0 0 0   0 0 0 0 0   0 0 0 1 0" result="gIso" />
          <feOffset in="gIso" dx="-0.35" dy="0.35" result="g" />
          <feColorMatrix in="displaced" type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 1 0 0   0 0 0 1 0" result="bIso" />
          <feOffset in="bIso" dx="0.2" dy="0.2" result="b" />
          <feBlend in="r" in2="g" mode="screen" result="rg" />
          <feBlend in="rg" in2="b" mode="screen" result="rgb" />
          <feColorMatrix in="rgb" type="saturate" values="1.14" result="saturated" />
          <feGaussianBlur in="saturated" stdDeviation="0.5" />
        </filter>
        ` : ""}
      </svg>
    ` : null;
  }
  render() {
    if (!this.image) return null;
    const { gradient: t, direction: e, padding: i, borderStyle: r, borderRadius: o, showShadow: n, className: l } = this, a = ["liquid-glass", "light-glass", "dark-glass"].includes(r);
    let d = "";
    return t && (t.includes("#") || t.includes("rgb") || t.includes(",")) && (d = `--gradient-stops: ${t};`), b`
      <div 
        id="gradify-export-area"
        class="${e} ${l}"
        style="padding: ${i}px; border-radius: ${this.backgroundRadius}px; ${d}"
      >
        <div 
          class="preview-card ${this.getBorderClass(r)} ${n ? "shadow-xl" : ""}"
          style="
            border-radius: ${o}px;
            ${r === "stacked-cards" ? `
              background: rgba(255, 255, 255, 0.94);
              backdrop-filter: blur(20px) saturate(180%);
              -webkit-backdrop-filter: blur(20px) saturate(180%);
              border: 1px solid rgba(255, 255, 255, 0.5);
              box-shadow: 
                0 20px 50px rgba(0, 0, 0, 0.1),
                0 5px 15px rgba(0, 0, 0, 0.05),
                inset 0 1px 0 rgba(255, 255, 255, 0.7);
            ` : ""}
          "
        >
          ${this.renderSVGFilter()}
          ${this.renderLiquidGlassBorder(r, o)}
          ${this.renderMacWindowControls(r)}
          ${this.renderGlassBorder(r, o)}
          ${this.renderStackedCards(r, o)}
          
          ${a ? b`
            <div style="overflow: hidden; border-radius: ${o}px; position: relative; z-index: 1; ${r === "light-glass" ? "box-shadow: rgba(0, 0, 0, 0.325) -1px 0px 6px 0px;" : ""}">
              <img 
                src="${this.image}" 
                alt="Preview" 
                class="preview-image"
                style="
                  ${this.imageWidth ? `width: ${this.imageWidth}px;` : ""} 
                  ${this.imageHeight ? `height: ${this.imageHeight}px;` : ""}
                " 
              />
            </div>
          ` : b`
            <img 
              src="${this.image}" 
              alt="Preview" 
              class="preview-image"
              style="
                border-bottom-left-radius: ${o}px;
                border-bottom-right-radius: ${o}px;
                border-top-left-radius: ${r === "mac-light" || r === "mac-dark" ? "0px" : o + "px"};
                border-top-right-radius: ${r === "mac-light" || r === "mac-dark" ? "0px" : o + "px"};
                ${r === "stacked-cards" ? "box-shadow: 0 2px 4px rgba(0,0,0,0.03), 0 8px 16px rgba(0,0,0,0.05), 0 12px 24px rgba(0,0,0,0.06);" : ""}
                ${this.imageWidth ? `width: ${this.imageWidth}px;` : ""}
                ${this.imageHeight ? `height: ${this.imageHeight}px;` : ""}
              "
            />
          `}
        </div>
        
        ${this.watermarkText ? b`
          <div 
            class="watermark"
            style="
              font-family: ${this.watermarkFont};
              font-size: ${this.watermarkSize}px;
              color: ${this.watermarkColor};
              opacity: ${this.watermarkOpacity};
              ${this.watermarkPosition.includes("top") ? "top: 4px;" : "bottom: 4px;"}
              ${this.watermarkPosition.includes("left") ? "left: 12px;" : ""}
              ${this.watermarkPosition.includes("right") ? "right: 12px;" : ""}
              ${this.watermarkPosition.includes("center") ? "left: 50%; transform: translateX(-50%);" : ""}
            "
          >${this.watermarkText.trim()}</div>
        ` : ""}
      </div>
    `;
  }
};
J.styles = gt`
    :host {
      display: block;
    }

    #gradify-export-area {
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 240px;
    }

    .preview-card {
      position: relative;
      transition: all 0.3s ease;
    }

    /* Gradients */
    .to-t { background-image: linear-gradient(to top, var(--gradient-stops)); }
    .to-tr { background-image: linear-gradient(to top right, var(--gradient-stops)); }
    .to-r { background-image: linear-gradient(to right, var(--gradient-stops)); }
    .to-br { background-image: linear-gradient(to bottom right, var(--gradient-stops)); }
    .to-b { background-image: linear-gradient(to bottom, var(--gradient-stops)); }
    .to-bl { background-image: linear-gradient(to bottom left, var(--gradient-stops)); }
    .to-l { background-image: linear-gradient(to left, var(--gradient-stops)); }
    .to-tl { background-image: linear-gradient(to top left, var(--gradient-stops)); }

    /* Borders */
    .border-mac-light { border: 1px solid #e5e7eb; background-color: #ffffff; }
    .border-mac-dark { border: 1px solid #374151; background-color: #1f2937; }
    .border-light { background-color: #ffffff; padding: 8px; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); }
    .border-dark { background-color: #374151; padding: 8px; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); }
    .border-stacked { border: 1px solid #e5e7eb; background-color: #ffffff; box-shadow: 8px 8px 0 0 rgba(0,0,0,0.1); }

    .stacked-card {
      position: absolute;
      pointer-events: none;
      overflow: hidden;
    }

    .shadow-xl {
      box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
    }

    .mac-controls {
      display: flex;
      gap: 8px;
      padding: 12px;
      align-items: center;
      border-bottom: 1px solid rgba(229, 231, 235, 0.5);
    }

    .dot {
      width: 12px;
      height: 12px;
      border-radius: 9999px;
    }

    .dot-red { background-color: #f87171; }
    .dot-amber { background-color: #fbbf24; }
    .dot-green { background-color: #4ade80; }

    .preview-image {
      max-width: 100%;
      height: auto;
      object-fit: contain;
      display: block;
      position: relative;
      z-index: 10;
      max-height: 70vh;
    }

    .watermark {
      position: absolute;
      filter: drop-shadow(0 4px 3px rgb(0 0 0 / 0.07)) drop-shadow(0 2px 2px rgb(0 0 0 / 0.06));
      white-space: pre;
      pointer-events: none;
    }
  `;
let p = J;
g([
  u({ type: String })
], p.prototype, "image");
g([
  u({ type: String })
], p.prototype, "gradient");
g([
  u({ type: String })
], p.prototype, "direction");
g([
  u({ type: Number })
], p.prototype, "padding");
g([
  u({ type: Number, attribute: "image-width" })
], p.prototype, "imageWidth");
g([
  u({ type: Number, attribute: "image-height" })
], p.prototype, "imageHeight");
g([
  u({ type: String, attribute: "border-style" })
], p.prototype, "borderStyle");
g([
  u({ type: Number, attribute: "border-radius" })
], p.prototype, "borderRadius");
g([
  u({ type: Boolean, attribute: "show-shadow" })
], p.prototype, "showShadow");
g([
  u({ type: String, attribute: "watermark-text" })
], p.prototype, "watermarkText");
g([
  u({ type: String, attribute: "watermark-font" })
], p.prototype, "watermarkFont");
g([
  u({ type: Number, attribute: "watermark-size" })
], p.prototype, "watermarkSize");
g([
  u({ type: String, attribute: "watermark-color" })
], p.prototype, "watermarkColor");
g([
  u({ type: String, attribute: "watermark-position" })
], p.prototype, "watermarkPosition");
g([
  u({ type: Number, attribute: "watermark-opacity" })
], p.prototype, "watermarkOpacity");
g([
  u({ type: Number, attribute: "background-radius" })
], p.prototype, "backgroundRadius");
g([
  u({ type: String, attribute: "class-name" })
], p.prototype, "className");
customElements.get("shot-render") || customElements.define("shot-render", p);
export {
  p as ShotRender
};
//# sourceMappingURL=shot-render.es.js.map
