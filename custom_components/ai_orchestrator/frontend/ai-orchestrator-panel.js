//#region node_modules/@lit/reactive-element/css-tag.js
var e = globalThis, t = e.ShadowRoot && (e.ShadyCSS === void 0 || e.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, n = Symbol(), r = /* @__PURE__ */ new WeakMap(), i = class {
	constructor(e, t, r) {
		if (this._$cssResult$ = !0, r !== n) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, n = this.t;
		if (t && e === void 0) {
			let t = n !== void 0 && n.length === 1;
			t && (e = r.get(n)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), t && r.set(n, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, a = (e) => new i(typeof e == "string" ? e : e + "", void 0, n), o = (e, ...t) => new i(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, n), s = (n, r) => {
	if (t) n.adoptedStyleSheets = r.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let t of r) {
		let r = document.createElement("style"), i = e.litNonce;
		i !== void 0 && r.setAttribute("nonce", i), r.textContent = t.cssText, n.appendChild(r);
	}
}, c = t ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return a(t);
})(e) : e, { is: l, defineProperty: u, getOwnPropertyDescriptor: ee, getOwnPropertyNames: te, getOwnPropertySymbols: ne, getPrototypeOf: re } = Object, d = globalThis, ie = d.trustedTypes, ae = ie ? ie.emptyScript : "", oe = d.reactiveElementPolyfillSupport, f = (e, t) => e, se = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? ae : null;
				break;
			case Object:
			case Array: e = e == null ? e : JSON.stringify(e);
		}
		return e;
	},
	fromAttribute(e, t) {
		let n = e;
		switch (t) {
			case Boolean:
				n = e !== null;
				break;
			case Number:
				n = e === null ? null : Number(e);
				break;
			case Object:
			case Array: try {
				n = JSON.parse(e);
			} catch {
				n = null;
			}
		}
		return n;
	}
}, ce = (e, t) => !l(e, t), le = {
	attribute: !0,
	type: String,
	converter: se,
	reflect: !1,
	useDefault: !1,
	hasChanged: ce
};
Symbol.metadata ??= Symbol("metadata"), d.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var p = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = le) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && u(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = ee(this.prototype, e) ?? {
			get() {
				return this[t];
			},
			set(e) {
				this[t] = e;
			}
		};
		return {
			get: r,
			set(t) {
				let a = r?.call(this);
				i?.call(this, t), this.requestUpdate(e, a, n);
			},
			configurable: !0,
			enumerable: !0
		};
	}
	static getPropertyOptions(e) {
		return this.elementProperties.get(e) ?? le;
	}
	static _$Ei() {
		if (this.hasOwnProperty(f("elementProperties"))) return;
		let e = re(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(f("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(f("properties"))) {
			let e = this.properties, t = [...te(e), ...ne(e)];
			for (let n of t) this.createProperty(n, e[n]);
		}
		let e = this[Symbol.metadata];
		if (e !== null) {
			let t = litPropertyMetadata.get(e);
			if (t !== void 0) for (let [e, n] of t) this.elementProperties.set(e, n);
		}
		this._$Eh = /* @__PURE__ */ new Map();
		for (let [e, t] of this.elementProperties) {
			let n = this._$Eu(e, t);
			n !== void 0 && this._$Eh.set(n, e);
		}
		this.elementStyles = this.finalizeStyles(this.styles);
	}
	static finalizeStyles(e) {
		let t = [];
		if (Array.isArray(e)) {
			let n = new Set(e.flat(1 / 0).reverse());
			for (let e of n) t.unshift(c(e));
		} else e !== void 0 && t.push(c(e));
		return t;
	}
	static _$Eu(e, t) {
		let n = t.attribute;
		return !1 === n ? void 0 : typeof n == "string" ? n : typeof e == "string" ? e.toLowerCase() : void 0;
	}
	constructor() {
		super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
	}
	_$Ev() {
		this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((e) => e(this));
	}
	addController(e) {
		(this._$EO ??= /* @__PURE__ */ new Set()).add(e), this.renderRoot !== void 0 && this.isConnected && e.hostConnected?.();
	}
	removeController(e) {
		this._$EO?.delete(e);
	}
	_$E_() {
		let e = /* @__PURE__ */ new Map(), t = this.constructor.elementProperties;
		for (let n of t.keys()) this.hasOwnProperty(n) && (e.set(n, this[n]), delete this[n]);
		e.size > 0 && (this._$Ep = e);
	}
	createRenderRoot() {
		let e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
		return s(e, this.constructor.elementStyles), e;
	}
	connectedCallback() {
		this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(!0), this._$EO?.forEach((e) => e.hostConnected?.());
	}
	enableUpdating(e) {}
	disconnectedCallback() {
		this._$EO?.forEach((e) => e.hostDisconnected?.());
	}
	attributeChangedCallback(e, t, n) {
		this._$AK(e, n);
	}
	_$ET(e, t) {
		let n = this.constructor.elementProperties.get(e), r = this.constructor._$Eu(e, n);
		if (r !== void 0 && !0 === n.reflect) {
			let i = (n.converter?.toAttribute === void 0 ? se : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? se : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? ce)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
			this.C(e, t, n);
		}
		!1 === this.isUpdatePending && (this._$ES = this._$EP());
	}
	C(e, t, { useDefault: n, reflect: r, wrapped: i }, a) {
		n && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, a ?? t ?? this[e]), !0 !== i || a !== void 0) || (this._$AL.has(e) || (this.hasUpdated || n || (t = void 0), this._$AL.set(e, t)), !0 === r && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
	}
	async _$EP() {
		this.isUpdatePending = !0;
		try {
			await this._$ES;
		} catch (e) {
			Promise.reject(e);
		}
		let e = this.scheduleUpdate();
		return e != null && await e, !this.isUpdatePending;
	}
	scheduleUpdate() {
		return this.performUpdate();
	}
	performUpdate() {
		if (!this.isUpdatePending) return;
		if (!this.hasUpdated) {
			if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
				for (let [e, t] of this._$Ep) this[e] = t;
				this._$Ep = void 0;
			}
			let e = this.constructor.elementProperties;
			if (e.size > 0) for (let [t, n] of e) {
				let { wrapped: e } = n, r = this[t];
				!0 !== e || this._$AL.has(t) || r === void 0 || this.C(t, void 0, n, r);
			}
		}
		let e = !1, t = this._$AL;
		try {
			e = this.shouldUpdate(t), e ? (this.willUpdate(t), this._$EO?.forEach((e) => e.hostUpdate?.()), this.update(t)) : this._$EM();
		} catch (t) {
			throw e = !1, this._$EM(), t;
		}
		e && this._$AE(t);
	}
	willUpdate(e) {}
	_$AE(e) {
		this._$EO?.forEach((e) => e.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
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
	shouldUpdate(e) {
		return !0;
	}
	update(e) {
		this._$Eq &&= this._$Eq.forEach((e) => this._$ET(e, this[e])), this._$EM();
	}
	updated(e) {}
	firstUpdated(e) {}
};
p.elementStyles = [], p.shadowRootOptions = { mode: "open" }, p[f("elementProperties")] = /* @__PURE__ */ new Map(), p[f("finalized")] = /* @__PURE__ */ new Map(), oe?.({ ReactiveElement: p }), (d.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var ue = globalThis, de = (e) => e, fe = ue.trustedTypes, pe = fe ? fe.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, me = "$lit$", m = `lit$${Math.random().toFixed(9).slice(2)}$`, he = "?" + m, ge = `<${he}>`, h = document, g = () => h.createComment(""), _ = (e) => e === null || typeof e != "object" && typeof e != "function", _e = Array.isArray, ve = (e) => _e(e) || typeof e?.[Symbol.iterator] == "function", ye = "[ 	\n\f\r]", v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, be = /-->/g, xe = />/g, y = RegExp(`>|${ye}(?:([^\\s"'>=/]+)(${ye}*=${ye}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), Se = /'/g, Ce = /"/g, we = /^(?:script|style|textarea|title)$/i, b = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), x = Symbol.for("lit-noChange"), S = Symbol.for("lit-nothing"), Te = /* @__PURE__ */ new WeakMap(), C = h.createTreeWalker(h, 129);
function Ee(e, t) {
	if (!_e(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return pe === void 0 ? t : pe.createHTML(t);
}
var De = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = v;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === v ? c[1] === "!--" ? o = be : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = y) : (we.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = y) : o = xe : o === y ? c[0] === ">" ? (o = i ?? v, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? y : c[3] === "\"" ? Ce : Se) : o === Ce || o === Se ? o = y : o === be || o === xe ? o = v : (o = y, i = void 0);
		let ee = o === y && e[t + 1].startsWith("/>") ? " " : "";
		a += o === v ? n + ge : l >= 0 ? (r.push(s), n.slice(0, l) + me + n.slice(l) + m + ee) : n + m + (l === -2 ? t : ee);
	}
	return [Ee(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, Oe = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = De(t, n);
		if (this.el = e.createElement(l, r), C.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = C.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(me)) {
					let t = u[o++], n = i.getAttribute(e).split(m), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? Ae : r[1] === "?" ? je : r[1] === "@" ? Me : E
					}), i.removeAttribute(e);
				} else e.startsWith(m) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (we.test(i.tagName)) {
					let e = i.textContent.split(m), t = e.length - 1;
					if (t > 0) {
						i.textContent = fe ? fe.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], g()), C.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], g());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === he) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(m, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += m.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = h.createElement("template");
		return n.innerHTML = e, n;
	}
};
function w(e, t, n = e, r) {
	if (t === x) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = _(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = w(e, i._$AS(e, t.values), i, r)), t;
}
var ke = class {
	constructor(e, t) {
		this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = t;
	}
	get parentNode() {
		return this._$AM.parentNode;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	u(e) {
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? h).importNode(t, !0);
		C.currentNode = r;
		let i = C.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new T(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Ne(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = C.nextNode(), a++);
		}
		return C.currentNode = h, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, T = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = S, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
	}
	get parentNode() {
		let e = this._$AA.parentNode, t = this._$AM;
		return t !== void 0 && e?.nodeType === 11 && (e = t.parentNode), e;
	}
	get startNode() {
		return this._$AA;
	}
	get endNode() {
		return this._$AB;
	}
	_$AI(e, t = this) {
		e = w(this, e, t), _(e) ? e === S || e == null || e === "" ? (this._$AH !== S && this._$AR(), this._$AH = S) : e !== this._$AH && e !== x && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? ve(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== S && _(this._$AH) ? this._$AA.nextSibling.data = e : this.T(h.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = Oe.createElement(Ee(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new ke(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = Te.get(e.strings);
		return t === void 0 && Te.set(e.strings, t = new Oe(e)), t;
	}
	k(t) {
		_e(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(g()), this.O(g()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = de(e).nextSibling;
			de(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, E = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = S, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = S;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = w(this, e, t, 0), a = !_(e) || e !== this._$AH && e !== x, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = w(this, r[n + o], t, o), s === x && (s = this._$AH[o]), a ||= !_(s) || s !== this._$AH[o], s === S ? e = S : e !== S && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === S ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, Ae = class extends E {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === S ? void 0 : e;
	}
}, je = class extends E {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== S);
	}
}, Me = class extends E {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = w(this, e, t, 0) ?? S) === x) return;
		let n = this._$AH, r = e === S && n !== S || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== S && (n === S || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Ne = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		w(this, e);
	}
}, Pe = {
	M: me,
	P: m,
	A: he,
	C: 1,
	L: De,
	R: ke,
	D: ve,
	V: w,
	I: T,
	H: E,
	N: je,
	U: Me,
	B: Ae,
	F: Ne
}, Fe = ue.litHtmlPolyfillSupport;
Fe?.(Oe, T), (ue.litHtmlVersions ??= []).push("3.3.3");
var Ie = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new T(t.insertBefore(g(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, Le = globalThis, D = class extends p {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Ie(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return x;
	}
};
D._$litElement$ = !0, D.finalized = !0, Le.litElementHydrateSupport?.({ LitElement: D });
var Re = Le.litElementPolyfillSupport;
Re?.({ LitElement: D }), (Le.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region node_modules/lit-html/directive.js
var ze = (e) => (...t) => ({
	_$litDirective$: e,
	values: t
}), Be = class {
	constructor(e) {}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AT(e, t, n) {
		this._$Ct = e, this._$AM = t, this._$Ci = n;
	}
	_$AS(e, t) {
		return this.update(e, t);
	}
	update(e, t) {
		return this.render(...t);
	}
}, { I: Ve } = Pe, He = {}, Ue = (e, t = He) => e._$AH = t, We = ze(class extends Be {
	constructor() {
		super(...arguments), this.key = S;
	}
	render(e, t) {
		return this.key = e, t;
	}
	update(e, [t, n]) {
		return t !== this.key && (Ue(e), this.key = t), n;
	}
}), Ge = Object.freeze({ type: "ai_orchestrator/status" }), Ke = [
	"providers",
	"workflows",
	"conversation",
	"ai_task"
], qe = class extends Error {
	constructor() {
		super("The status response does not match the supported foundation contract."), this.name = "StatusContractError";
	}
};
function Je(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function Ye(e, t) {
	return Object.keys(e).length === t.length && t.every((t) => Object.hasOwn(e, t));
}
function Xe(e) {
	if (!Je(e) || !Ye(e, [
		"schema_version",
		"phase",
		"configured",
		"features"
	]) || !Je(e.features) || !Ye(e.features, Ke)) throw new qe();
	let t = e.features;
	if (e.schema_version !== 1 || e.phase !== "foundation" || typeof e.configured != "boolean" || Ke.some((e) => typeof t[e] != "boolean")) throw new qe();
	return {
		schema_version: 1,
		phase: "foundation",
		configured: e.configured,
		features: {
			providers: t.providers,
			workflows: t.workflows,
			conversation: t.conversation,
			ai_task: t.ai_task
		}
	};
}
async function Ze(e) {
	return Xe(await e.callWS({ ...Ge }));
}
function Qe(e) {
	return Je(e) && e.code === "unauthorized";
}
//#endregion
//#region src/api/workflow-probe-client.ts
var $e = Object.freeze({ type: "ai_orchestrator/workflow/probe/run" }), et = class extends Error {
	constructor() {
		super("The workflow lifecycle probe response does not match the supported contract."), this.name = "WorkflowProbeContractError";
	}
};
function tt(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function nt(e, t) {
	return Object.keys(e).length === t.length && t.every((t) => Object.hasOwn(e, t));
}
function rt(e) {
	return typeof e == "number" && Number.isInteger(e) && e > 0;
}
function it(e) {
	if (!tt(e) || !nt(e, [
		"schema_version",
		"workflow_id",
		"trigger_type",
		"execution_count",
		"executions_for_trigger",
		"registration_count",
		"provider_contacted",
		"home_assistant_action_called"
	]) || e.schema_version !== 1 || e.workflow_id !== "foundation_lifecycle_probe" || e.trigger_type !== "integration_event" || !rt(e.execution_count) || e.executions_for_trigger !== 1 || !rt(e.registration_count) || e.provider_contacted !== !1 || e.home_assistant_action_called !== !1) throw new et();
	return e;
}
async function at(e) {
	return it(await e.callWS({ ...$e }));
}
//#endregion
//#region src/styles/panel-styles.ts
var ot = o`
  :host {
    --orchestrator-accent: var(--primary-color, #0c6b66);
    --orchestrator-accent-strong: #07514d;
    --orchestrator-accent-soft: #dff2ef;
    --orchestrator-surface: var(--card-background-color, #ffffff);
    --orchestrator-canvas: var(--primary-background-color, #f2f6f6);
    --orchestrator-text: var(--primary-text-color, #172126);
    --orchestrator-muted: var(--secondary-text-color, #526168);
    --orchestrator-border: var(--divider-color, #d7e0e0);
    --orchestrator-warning: #7a4a00;
    --orchestrator-warning-soft: #fff2d8;
    --orchestrator-error: var(--error-color, #b42318);
    --orchestrator-error-soft: #ffebe9;
    display: block;
    min-height: 100%;
    background: var(--orchestrator-canvas);
    color: var(--orchestrator-text);
    font-family: var(
      --paper-font-body1_-_font-family,
      Inter,
      ui-sans-serif,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif
    );
  }

  * {
    box-sizing: border-box;
  }

  button,
  a {
    font: inherit;
  }

  button:focus-visible,
  a:focus-visible {
    outline: 3px solid var(--orchestrator-accent);
    outline-offset: 3px;
  }

  .app-frame {
    min-height: 100vh;
    display: grid;
    grid-template-columns: minmax(232px, 272px) minmax(0, 1fr);
  }

  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 28px;
    padding: 24px 18px;
    border-right: 1px solid var(--orchestrator-border);
    background: var(--orchestrator-surface);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 8px;
  }

  .brand-mark {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 13px;
    background: var(--orchestrator-accent);
    color: #ffffff;
    font-weight: 800;
    letter-spacing: -0.04em;
  }

  .brand-copy {
    min-width: 0;
  }

  .brand-title {
    margin: 0;
    font-size: 1rem;
    line-height: 1.2;
    font-weight: 760;
  }

  .brand-subtitle {
    margin: 4px 0 0;
    color: var(--orchestrator-muted);
    font-size: 0.78rem;
  }

  .section-nav {
    display: grid;
    gap: 5px;
  }

  .nav-button {
    min-height: 44px;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border: 1px solid transparent;
    border-radius: 11px;
    background: transparent;
    color: var(--orchestrator-muted);
    cursor: pointer;
    text-align: left;
  }

  .nav-button:hover {
    border-color: var(--orchestrator-border);
    background: var(--orchestrator-canvas);
    color: var(--orchestrator-text);
  }

  .nav-button[aria-current="page"] {
    background: var(--orchestrator-accent-soft);
    color: var(--orchestrator-accent-strong);
    font-weight: 720;
  }

  .nav-marker {
    width: 9px;
    height: 9px;
    flex: 0 0 auto;
    border: 2px solid currentColor;
    border-radius: 50%;
  }

  .sidebar-note {
    margin-top: auto;
    padding: 14px;
    border: 1px solid var(--orchestrator-border);
    border-radius: 12px;
    color: var(--orchestrator-muted);
    font-size: 0.8rem;
    line-height: 1.5;
  }

  .sidebar-note strong {
    display: block;
    margin-bottom: 3px;
    color: var(--orchestrator-text);
  }

  .workspace {
    min-width: 0;
    padding: clamp(20px, 4vw, 48px);
  }

  .workspace-inner {
    width: min(1100px, 100%);
    margin: 0 auto;
  }

  /*
   * Chat uses an app-shell layout: the frame fills the height Home Assistant
   * gives the panel and only the transcript inside the chat view scrolls, so
   * the compose box and controls stay fixed like a normal chat app.
   *
   * Home Assistant renders this panel below its own toolbar, so the panel host
   * is not the full viewport. Prefer the host's own height and fall back to a
   * dynamic-viewport height only when the host is not itself constrained.
   */
  :host(.chat-host) {
    height: var(--orchestrator-shell-height, 100dvh);
    min-height: 0;
    overflow: hidden;
  }

  .app-frame.chat-mode {
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  .app-frame.chat-mode .workspace {
    min-height: 0;
    overflow: hidden;
    display: flex;
    padding: clamp(14px, 2vw, 24px) clamp(14px, 3vw, 32px);
  }

  .app-frame.chat-mode .workspace-inner {
    min-height: 0;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    width: min(980px, 100%);
  }

  .app-frame.chat-mode ai-orchestrator-assistant {
    flex: 1 1 auto;
    min-height: 0;
  }


  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 28px;
  }

  .eyebrow {
    margin: 0 0 8px;
    color: var(--orchestrator-accent-strong);
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  h1,
  h2,
  h3,
  p {
    overflow-wrap: anywhere;
  }

  h1 {
    margin: 0;
    font-size: clamp(1.85rem, 4vw, 2.65rem);
    line-height: 1.08;
    letter-spacing: -0.035em;
  }

  .page-intro {
    max-width: 690px;
    margin: 12px 0 0;
    color: var(--orchestrator-muted);
    font-size: 1rem;
    line-height: 1.65;
  }

  .privacy-badge,
  .phase-badge,
  .state-pill {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    padding: 5px 10px;
    border: 1px solid var(--orchestrator-border);
    border-radius: 999px;
    background: var(--orchestrator-surface);
    color: var(--orchestrator-muted);
    font-size: 0.78rem;
    font-weight: 700;
    white-space: nowrap;
  }

  .hero {
    position: relative;
    overflow: hidden;
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(240px, 0.6fr);
    gap: 28px;
    padding: clamp(24px, 4vw, 38px);
    border: 1px solid var(--orchestrator-border);
    border-radius: 22px;
    background: var(--orchestrator-surface);
    box-shadow: 0 18px 48px rgb(31 55 57 / 8%);
  }

  .hero::after {
    content: "";
    position: absolute;
    width: 220px;
    height: 220px;
    right: -85px;
    top: -100px;
    border-radius: 50%;
    background: var(--orchestrator-accent-soft);
    opacity: 0.7;
    pointer-events: none;
  }

  .hero-copy,
  .connection-summary {
    position: relative;
    z-index: 1;
  }

  .status-kicker {
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 0 0 14px;
    color: var(--orchestrator-muted);
    font-size: 0.82rem;
    font-weight: 720;
  }

  .status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--orchestrator-muted);
    box-shadow: 0 0 0 5px color-mix(in srgb, var(--orchestrator-muted) 14%, transparent);
  }

  .status-dot.ready {
    background: #167451;
    box-shadow: 0 0 0 5px #dff3ea;
  }

  .status-dot.warning {
    background: var(--orchestrator-warning);
    box-shadow: 0 0 0 5px var(--orchestrator-warning-soft);
  }

  .status-dot.error {
    background: var(--orchestrator-error);
    box-shadow: 0 0 0 5px var(--orchestrator-error-soft);
  }

  .hero h2 {
    max-width: 620px;
    margin: 0;
    font-size: clamp(1.45rem, 3vw, 2rem);
    line-height: 1.2;
    letter-spacing: -0.025em;
  }

  .hero-description {
    max-width: 650px;
    margin: 13px 0 0;
    color: var(--orchestrator-muted);
    line-height: 1.65;
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 24px;
  }

  .primary-button,
  .secondary-button {
    min-height: 44px;
    padding: 9px 16px;
    border-radius: 11px;
    cursor: pointer;
    font-weight: 740;
  }

  .primary-button {
    border: 1px solid var(--orchestrator-accent);
    background: var(--orchestrator-accent);
    color: #ffffff;
  }

  .primary-button:hover {
    background: var(--orchestrator-accent-strong);
  }

  .secondary-button {
    border: 1px solid var(--orchestrator-border);
    background: var(--orchestrator-surface);
    color: var(--orchestrator-text);
  }

  .secondary-button:hover {
    border-color: var(--orchestrator-accent);
    color: var(--orchestrator-accent-strong);
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .connection-summary {
    align-self: stretch;
    padding: 20px;
    border: 1px solid var(--orchestrator-border);
    border-radius: 16px;
    background: var(--orchestrator-canvas);
  }

  .summary-label {
    margin: 0;
    color: var(--orchestrator-muted);
    font-size: 0.76rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .summary-value {
    margin: 9px 0 0;
    font-size: 1.05rem;
    font-weight: 780;
  }

  .summary-detail {
    margin: 7px 0 0;
    color: var(--orchestrator-muted);
    font-size: 0.86rem;
    line-height: 1.5;
  }

  .summary-rule {
    height: 1px;
    margin: 17px 0;
    background: var(--orchestrator-border);
  }

  .content-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
    margin-top: 20px;
  }

  .card {
    padding: 22px;
    border: 1px solid var(--orchestrator-border);
    border-radius: 17px;
    background: var(--orchestrator-surface);
  }

  .card h2,
  .card h3 {
    margin: 0;
    font-size: 1.05rem;
    line-height: 1.3;
  }

  .card-intro {
    margin: 7px 0 18px;
    color: var(--orchestrator-muted);
    font-size: 0.88rem;
    line-height: 1.5;
  }

  .status-list,
  .next-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .status-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 14px;
    align-items: center;
    padding: 12px 0;
    border-top: 1px solid var(--orchestrator-border);
  }

  .status-row:first-child {
    padding-top: 0;
    border-top: 0;
  }

  .status-row:last-child {
    padding-bottom: 0;
  }

  .status-name {
    display: block;
    font-weight: 700;
  }

  .status-detail {
    display: block;
    margin-top: 3px;
    color: var(--orchestrator-muted);
    font-size: 0.8rem;
  }

  .state-pill.available {
    border-color: #9fd6c0;
    background: #e5f5ed;
    color: #0e6040;
  }

  .state-pill.unavailable {
    border-color: var(--orchestrator-border);
    background: var(--orchestrator-canvas);
  }

  .next-list {
    counter-reset: steps;
  }

  .next-list li {
    position: relative;
    min-height: 38px;
    padding: 0 0 16px 42px;
    color: var(--orchestrator-muted);
    line-height: 1.5;
    counter-increment: steps;
  }

  .next-list li::before {
    content: counter(steps);
    position: absolute;
    left: 0;
    top: 0;
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border-radius: 9px;
    background: var(--orchestrator-accent-soft);
    color: var(--orchestrator-accent-strong);
    font-size: 0.78rem;
    font-weight: 800;
  }

  .next-list li:last-child {
    padding-bottom: 0;
  }

  .next-list strong {
    display: block;
    color: var(--orchestrator-text);
  }

  .assurance {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    margin-top: 18px;
    padding: 15px 17px;
    border: 1px solid #a9d6d2;
    border-radius: 13px;
    background: var(--orchestrator-accent-soft);
    color: var(--orchestrator-accent-strong);
    font-size: 0.86rem;
    line-height: 1.55;
  }

  .assurance-mark {
    flex: 0 0 auto;
    font-weight: 900;
  }

  .placeholder {
    min-height: 360px;
    display: grid;
    place-items: center;
    padding: clamp(26px, 6vw, 72px);
    border: 1px solid var(--orchestrator-border);
    border-radius: 22px;
    background: var(--orchestrator-surface);
    text-align: center;
  }

  .placeholder-inner {
    max-width: 620px;
  }

  .placeholder h2 {
    margin: 18px 0 0;
    font-size: clamp(1.35rem, 3vw, 1.8rem);
  }

  .placeholder p {
    margin: 12px auto 0;
    color: var(--orchestrator-muted);
    line-height: 1.65;
  }

  .probe-actions {
    justify-content: center;
  }

  .probe-result {
    display: grid;
    gap: 5px;
    margin-top: 20px;
    padding: 14px 16px;
    border: 1px solid var(--orchestrator-border);
    border-radius: 12px;
    background: var(--orchestrator-canvas);
    color: var(--orchestrator-muted);
    font-size: 0.86rem;
    line-height: 1.5;
    text-align: left;
  }

  .probe-result strong {
    color: var(--orchestrator-text);
  }

  .loading-bar {
    width: 100%;
    max-width: 320px;
    height: 7px;
    margin-top: 24px;
    overflow: hidden;
    border-radius: 999px;
    background: var(--orchestrator-border);
  }

  .loading-bar::after {
    content: "";
    display: block;
    width: 42%;
    height: 100%;
    border-radius: inherit;
    background: var(--orchestrator-accent);
    animation: loading 1.2s ease-in-out infinite alternate;
  }

  @keyframes loading {
    from {
      transform: translateX(-12%);
    }
    to {
      transform: translateX(150%);
    }
  }

  @media (max-width: 900px) {
    .app-frame,
    .app-frame.narrow {
      display: block;
    }

    /* Mobile chat: header/nav stay put, only the transcript scrolls. */
    .app-frame.chat-mode,
    .app-frame.chat-mode.narrow {
      display: flex;
      flex-direction: column;
    }

    .app-frame.chat-mode .sidebar {
      flex: 0 0 auto;
    }

    .app-frame.chat-mode .workspace {
      flex: 1 1 auto;
      padding: 12px 12px 14px;
    }

    .sidebar {
      gap: 16px;
      padding: 14px 16px;
      border-right: 0;
      border-bottom: 1px solid var(--orchestrator-border);
    }

    .brand {
      padding: 0;
    }

    .brand-mark {
      width: 38px;
      height: 38px;
    }

    .section-nav {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding: 2px 1px 6px;
      scrollbar-width: thin;
    }

    .nav-button {
      width: auto;
      flex: 0 0 auto;
      white-space: nowrap;
    }

    .sidebar-note {
      display: none;
    }

    .workspace {
      padding: 24px 16px 40px;
    }

    .hero {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (max-width: 680px) {
    .page-header {
      display: block;
    }

    .privacy-badge {
      margin-top: 16px;
      white-space: normal;
    }

    .content-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .hero {
      padding: 23px 19px;
      border-radius: 17px;
    }

    .card {
      padding: 19px;
    }

    .status-row {
      grid-template-columns: minmax(0, 1fr);
      gap: 8px;
    }

    .state-pill {
      justify-self: start;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      scroll-behavior: auto !important;
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  @media (forced-colors: active) {
    .brand-mark,
    .primary-button,
    .status-dot,
    .next-list li::before {
      forced-color-adjust: none;
    }

    .nav-button[aria-current="page"] {
      outline: 2px solid CanvasText;
    }
  }
`, st = 131072, O = {
	matched: "Matched",
	event_kind_mismatch: "Event type did not match",
	state_unchanged: "State did not change",
	entity_not_selected: "Entity was not selected",
	target_state_mismatch: "Target state did not match",
	time_mismatch: "Time did not match",
	outside_time_window: "Outside the time window",
	state_unavailable: "State unavailable",
	state_mismatch: "State did not match",
	state_not_numeric: "State is not numeric",
	outside_numeric_bounds: "Outside numeric bounds"
}, k = class extends Error {
	constructor() {
		super("Workflow preview response is unsupported.");
	}
};
function ct(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function lt(e, t) {
	return Object.keys(e).length === t.length && t.every((t) => Object.hasOwn(e, t));
}
function A(e, t, n) {
	return Array.isArray(e) && e.length <= t && e.every((e, t) => ct(e) && lt(e, [
		"index",
		"passed",
		"reason"
	]) && e.index === t && typeof e.passed == "boolean" && typeof e.reason == "string" && n.includes(e.reason) && e.passed === (e.reason === "matched"));
}
var ut = [
	"mode",
	"enabled",
	"triggered",
	"conditions_passed",
	"eligible",
	"trigger_results",
	"condition_results",
	"planned_steps",
	"provider_calls",
	"actions_executed"
];
function dt(e, t, n) {
	return ct(e) && lt(e, n ? ["schema_version", ...ut] : ut) && (!n || e.schema_version === 1) && e.mode === t;
}
function ft(e) {
	if (!dt(e, "observation_only", !1)) throw new k();
	return mt(e);
}
function pt(e) {
	if (!dt(e, "offline", !0)) throw new k();
	return mt(e);
}
function mt(e) {
	if (typeof e.enabled != "boolean" || typeof e.triggered != "boolean" || typeof e.conditions_passed != "boolean" || typeof e.eligible != "boolean" || e.provider_calls !== 0 || e.actions_executed !== 0 || !A(e.trigger_results, 10, [
		"matched",
		"event_kind_mismatch",
		"state_unchanged",
		"entity_not_selected",
		"target_state_mismatch",
		"time_mismatch"
	]) || !A(e.condition_results, 20, [
		"matched",
		"outside_time_window",
		"state_unavailable",
		"state_mismatch",
		"state_not_numeric",
		"outside_numeric_bounds"
	]) || !Array.isArray(e.planned_steps) || e.planned_steps.length > 25 || !e.planned_steps.every((e, t) => ct(e) && lt(e, ["index", "kind"]) && e.index === t && [
		"ai_compose",
		"ai_classify",
		"ai_extract",
		"branch",
		"notify"
	].includes(e.kind)) || e.triggered !== e.trigger_results.some((e) => e.passed) || e.conditions_passed !== e.condition_results.every((e) => e.passed) || e.eligible !== e.planned_steps.length > 0 || e.eligible && (!e.triggered || !e.conditions_passed)) throw new k();
	return e;
}
async function ht(e, t, n) {
	if (!t.trim() || !n.trim() || t.length > 131072 || n.length > 131072) throw new k();
	return pt(await e.callWS({
		type: "ai_orchestrator/workflow/preview",
		workflow_json: t,
		snapshot_json: n
	}));
}
var gt = [
	"ready",
	"unreadable",
	"not_loaded"
], _t = [
	"activation_failed",
	"cleanup_failed",
	"dry_run_required"
], vt = ["observe", "execute"], yt = [
	"ok",
	"planned",
	"failed",
	"skipped",
	"delivered",
	"taken",
	"not_taken"
], j = class extends Error {
	constructor() {
		super("The workflow response does not match the supported contract."), this.name = "WorkflowContractError";
	}
}, bt = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u, xt = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u, St = /^[a-z][a-z0-9_]{0,63}$/u;
function Ct(e) {
	let t = [
		"started_at",
		"steps",
		"provider_calls",
		"actions_executed",
		"completed",
		"error"
	];
	if (!M(e) || !(N(e, t) || N(e, [...t, "finished_at"])) || typeof e.started_at != "string" || e.started_at.length > 40 || "finished_at" in e && (typeof e.finished_at != "string" || e.finished_at.length > 40) || !Array.isArray(e.steps) || e.steps.length > 25 || !P(e.provider_calls) || !P(e.actions_executed) || typeof e.completed != "boolean" || e.error !== null && (typeof e.error != "string" || e.error.length > 64)) throw new j();
	let n = e.steps.map((e, t) => {
		if (!M(e) || e.index !== t || typeof e.step_id != "string" || !St.test(e.step_id) || typeof e.kind != "string" || typeof e.executed != "boolean" || !yt.includes(e.status) || Object.keys(e).some((e) => ![
			"index",
			"step_id",
			"kind",
			"executed",
			"status",
			"error",
			"category",
			"target"
		].includes(e)) || "error" in e && (typeof e.error != "string" || e.error.length > 64) || "category" in e && (typeof e.category != "string" || e.category.length > 64) || "target" in e && ![
			"entity",
			"service",
			"missing"
		].includes(e.target)) throw new j();
		return e;
	});
	if (e.completed !== (e.error === null) || e.completed && n.some((e) => e.status === "failed")) throw new j();
	let r = n.findIndex((e) => e.status === "failed" || e.status === "not_taken");
	if (n.some((t, n) => t.status === "skipped" && !(r !== -1 && n > r) && e.error !== "provider_unavailable") || e.actions_executed !== n.filter((e) => e.status === "delivered").length) throw new j();
	return {
		...e,
		steps: n
	};
}
function M(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function N(e, t) {
	return Object.keys(e).length === t.length && t.every((t) => Object.hasOwn(e, t));
}
function wt(e, t) {
	return Array.isArray(e) && e.length <= t && e.every(M);
}
function P(e) {
	return Number.isSafeInteger(e) && e >= 0;
}
function F(e) {
	if (!M(e) || !N(e, [
		"schema_version",
		"workflow_id",
		"name",
		"description",
		"enabled",
		"run_mode",
		"provider_connection_id",
		"triggers",
		"conditions",
		"steps"
	]) || e.schema_version !== 1 || !vt.includes(e.run_mode) || e.provider_connection_id !== null && (typeof e.provider_connection_id != "string" || !xt.test(e.provider_connection_id)) || typeof e.workflow_id != "string" || !bt.test(e.workflow_id) || typeof e.name != "string" || e.name.trim() === "" || e.name.length > 128 || typeof e.description != "string" || e.description.length > 512 || typeof e.enabled != "boolean" || !wt(e.triggers, 10) || !wt(e.conditions, 20) || !wt(e.steps, 25)) throw new j();
	return {
		schema_version: 1,
		workflow_id: e.workflow_id,
		name: e.name,
		description: e.description,
		enabled: e.enabled,
		run_mode: e.run_mode,
		provider_connection_id: e.provider_connection_id,
		triggers: e.triggers,
		conditions: e.conditions,
		steps: e.steps
	};
}
function Tt(e) {
	if (!M(e) || !N(e, [
		"active",
		"observations",
		"ignored_events",
		"registrations",
		"latest",
		"error",
		"executions",
		"execution_failures",
		"skipped_busy",
		"execution_running",
		"last_execution"
	]) || typeof e.active != "boolean" || !P(e.executions) || !P(e.execution_failures) || !P(e.skipped_busy) || typeof e.execution_running != "boolean" || e.execution_failures > e.executions || !P(e.observations) || !P(e.ignored_events) || !P(e.registrations) || e.error !== null && !_t.includes(e.error) || e.active && e.error !== null) throw new j();
	let t = null;
	if (e.latest !== null) try {
		t = ft(e.latest);
	} catch {
		throw new j();
	}
	let n = null;
	return e.last_execution !== null && (n = Ct(e.last_execution)), {
		active: e.active,
		observations: e.observations,
		ignored_events: e.ignored_events,
		registrations: e.registrations,
		latest: t,
		error: e.error,
		executions: e.executions,
		execution_failures: e.execution_failures,
		skipped_busy: e.skipped_busy,
		execution_running: e.execution_running,
		last_execution: n
	};
}
function Et(e) {
	if (!Array.isArray(e) || e.length > 50) throw new j();
	let t = /* @__PURE__ */ new Set();
	return e.map((e) => {
		if (!M(e) || !N(e, ["workflow", "status"])) throw new j();
		let n = F(e.workflow);
		if (t.has(n.workflow_id)) throw new j();
		return t.add(n.workflow_id), {
			workflow: n,
			status: Tt(e.status)
		};
	});
}
function Dt(e) {
	if (!M(e) || !N(e, [
		"schema_version",
		"store",
		"workflows"
	]) || e.schema_version !== 1 || !gt.includes(e.store)) throw new j();
	let t = Et(e.workflows);
	if (e.store !== "ready" && t.length > 0) throw new j();
	return {
		schema_version: 1,
		store: e.store,
		workflows: t
	};
}
function Ot(e, t) {
	if (!M(e) || !Object.hasOwn(e, "workflow")) throw new j();
	let { workflow: n, ...r } = e, i = F(n);
	if (t !== void 0 && i.workflow_id !== t) throw new j();
	let a = Dt(r);
	if (!a.workflows.some((e) => e.workflow.workflow_id === i.workflow_id)) throw new j();
	return {
		...a,
		workflow: i
	};
}
async function I(e) {
	return Dt(await e.callWS({ type: "ai_orchestrator/workflows/list" }));
}
async function kt(e, t) {
	if (!t.trim() || t.length > 131072) throw new j();
	return Ot(await e.callWS({
		type: "ai_orchestrator/workflows/save",
		workflow_json: t
	}));
}
async function At(e, t, n) {
	let r = Ot(await e.callWS({
		type: "ai_orchestrator/workflows/set_enabled",
		workflow_id: t,
		enabled: n
	}), t);
	if (r.workflow.enabled !== n) throw new j();
	return r;
}
async function jt(e, t) {
	let n = Dt(await e.callWS({
		type: "ai_orchestrator/workflows/delete",
		workflow_id: t
	}));
	if (n.workflows.some((e) => e.workflow.workflow_id === t)) throw new j();
	return n;
}
async function Mt(e, t) {
	let n = await e.callWS({
		type: "ai_orchestrator/workflows/run_manual",
		workflow_id: t
	});
	if (!M(n) || n.schema_version !== 1) throw new j();
	let r = Object.fromEntries(Object.entries(n).filter(([e]) => e !== "schema_version"));
	try {
		return ft(r);
	} catch {
		throw new j();
	}
}
//#endregion
//#region src/api/catalog-client.ts
var Nt = Object.freeze({ type: "ai_orchestrator/catalog/list" }), Pt = [
	"available",
	"unavailable",
	"not_loaded"
], Ft = ["entity", "device"], It = 1e4;
function L(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function R(e, t) {
	let n = Object.keys(e).sort(), r = [...t].sort();
	return n.length === r.length && n.every((e, t) => e === r[t]);
}
function z(e) {
	return e === null || typeof e == "string";
}
function B(e) {
	return typeof e == "string" && e.length > 0 && e.length <= 255;
}
function Lt(e) {
	if (!Array.isArray(e) || e.length > It) throw Error("Invalid area catalogue");
	return e.map((e) => {
		if (!L(e) || !R(e, ["area_id", "name"]) || !B(e.area_id) || typeof e.name != "string" || e.name.trim() === "") throw Error("Invalid area entry");
		return {
			area_id: e.area_id,
			name: e.name
		};
	});
}
function Rt(e) {
	if (!Array.isArray(e) || e.length > It) throw Error("Invalid device catalogue");
	return e.map((e) => {
		if (!L(e) || !R(e, [
			"device_id",
			"name",
			"area_id",
			"manufacturer",
			"model",
			"disabled"
		]) || !B(e.device_id) || !z(e.name) || e.area_id !== null && !B(e.area_id) || !z(e.manufacturer) || !z(e.model) || typeof e.disabled != "boolean") throw Error("Invalid device entry");
		return {
			device_id: e.device_id,
			name: e.name,
			area_id: e.area_id,
			manufacturer: e.manufacturer,
			model: e.model,
			disabled: e.disabled
		};
	});
}
function zt(e) {
	if (!Array.isArray(e) || e.length > It) throw Error("Invalid entity catalogue");
	return e.map((e) => {
		if (!L(e) || !R(e, [
			"registry_id",
			"entity_id",
			"domain",
			"platform",
			"name",
			"device_id",
			"area_id",
			"area_source",
			"disabled",
			"availability"
		]) || !B(e.registry_id) || typeof e.entity_id != "string" || !/^[a-z0-9_]+\.[a-z0-9_]+$/u.test(e.entity_id) || typeof e.domain != "string" || e.domain !== e.entity_id.split(".", 1)[0] || !B(e.platform) || !z(e.name) || e.device_id !== null && !B(e.device_id) || e.area_id !== null && !B(e.area_id) || e.area_source !== null && !Ft.includes(e.area_source) || e.area_source === null != (e.area_id === null) || typeof e.disabled != "boolean" || !Pt.includes(e.availability)) throw Error("Invalid entity entry");
		return {
			registry_id: e.registry_id,
			entity_id: e.entity_id,
			domain: e.domain,
			platform: e.platform,
			name: e.name,
			device_id: e.device_id,
			area_id: e.area_id,
			area_source: e.area_source,
			disabled: e.disabled,
			availability: e.availability
		};
	});
}
function Bt(e) {
	if (!L(e) || !R(e, [
		"schema_version",
		"areas",
		"devices",
		"entities",
		"omitted"
	]) || e.schema_version !== 1 || !L(e.omitted) || !R(e.omitted, [
		"areas",
		"devices",
		"entities"
	]) || ![
		e.omitted.areas,
		e.omitted.devices,
		e.omitted.entities
	].every((e) => Number.isInteger(e) && e >= 0)) throw Error("Invalid catalogue response");
	return {
		schema_version: 1,
		areas: Lt(e.areas),
		devices: Rt(e.devices),
		entities: zt(e.entities),
		omitted: {
			areas: e.omitted.areas,
			devices: e.omitted.devices,
			entities: e.omitted.entities
		}
	};
}
async function V(e) {
	return Bt(await e.callWS({ ...Nt }));
}
//#endregion
//#region src/panel/catalog-view.ts
var Vt = class extends D {
	static properties = {
		hass: { attribute: !1 },
		_state: { state: !0 },
		_catalog: { state: !0 },
		_query: { state: !0 }
	};
	static styles = o`
    :host { display: block; }
    .summary { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; }
    .summary span, .permission {
      padding: 6px 10px; border: 1px solid var(--divider-color, #d7e0e0);
      border-radius: 999px; background: var(--card-background-color, #fff);
      font-size: 0.8rem; font-weight: 700;
    }
    .permission { color: var(--secondary-text-color, #526168); }
    .toolbar { display: flex; gap: 10px; margin-bottom: 16px; }
    input {
      min-width: 0; flex: 1; min-height: 44px; padding: 9px 12px;
      border: 1px solid var(--divider-color, #d7e0e0); border-radius: 10px;
      background: var(--card-background-color, #fff); color: var(--primary-text-color, #172126);
      font: inherit;
    }
    button {
      min-height: 44px; padding: 9px 15px; border: 1px solid var(--divider-color, #d7e0e0);
      border-radius: 10px; background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #172126); cursor: pointer; font: inherit; font-weight: 700;
    }
    input:focus-visible, button:focus-visible { outline: 3px solid var(--primary-color, #0c6b66); outline-offset: 2px; }
    .table-wrap { overflow-x: auto; border: 1px solid var(--divider-color, #d7e0e0); border-radius: 14px; }
    table { width: 100%; border-collapse: collapse; background: var(--card-background-color, #fff); }
    th, td { padding: 13px 14px; border-bottom: 1px solid var(--divider-color, #d7e0e0); text-align: left; vertical-align: top; }
    th { font-size: 0.76rem; color: var(--secondary-text-color, #526168); text-transform: uppercase; letter-spacing: 0.05em; }
    tr:last-child td { border-bottom: 0; }
    .name { font-weight: 750; }
    code, .detail { display: block; margin-top: 3px; color: var(--secondary-text-color, #526168); font-size: 0.8rem; }
    .state { font-weight: 700; font-size: 0.8rem; }
    .state.available { color: #0e6040; }
    .state.unavailable { color: var(--error-color, #b42318); }
    .state.not_loaded { color: #7a4a00; }
    .message { padding: 36px 20px; border: 1px solid var(--divider-color, #d7e0e0); border-radius: 14px; text-align: center; background: var(--card-background-color, #fff); }
    @media (max-width: 680px) {
      .toolbar { display: grid; }
      thead { display: none; }
      table, tbody, tr, td { display: block; width: 100%; }
      tr { padding: 12px 14px; border-bottom: 1px solid var(--divider-color, #d7e0e0); }
      tr:last-child { border-bottom: 0; }
      td { padding: 5px 0; border: 0; }
      td::before { content: attr(data-label); display: block; color: var(--secondary-text-color, #526168); font-size: 0.7rem; font-weight: 800; text-transform: uppercase; }
    }
  `;
	_hasLoaded = !1;
	_loadScheduled = !1;
	constructor() {
		super(), this._state = "loading", this._query = "";
	}
	connectedCallback() {
		super.connectedCallback(), this._scheduleLoad();
	}
	updated() {
		this._scheduleLoad();
	}
	render() {
		if (this._state === "loading") return b`<div class="message" role="status" aria-busy="true">Reading Home Assistant registries…</div>`;
		if (this._state === "error") return b`<div class="message"><p>The registry catalogue could not be loaded.</p><button type="button" @click=${this._load}>Retry</button></div>`;
		let e = this._catalog;
		if (e === void 0 || this._state === "empty") return b`<div class="message"><p>No registered entities are available.</p><button type="button" @click=${this._load}>Refresh</button></div>`;
		let t = this._filteredEntities(e);
		return b`
      <div class="summary" aria-label="Registry totals">
        <span>${e.entities.length} entities</span>
        <span>${e.devices.length} devices</span>
        <span>${e.areas.length} areas</span>
        <span>AI access: none</span>
      </div>
      ${e.omitted.entities || e.omitted.devices || e.omitted.areas ? b`<p class="message" role="status">The registry is larger than this view's bound: ${e.omitted.entities} entities, ${e.omitted.devices} devices and ${e.omitted.areas} areas are not shown. Narrow the search or use Home Assistant's own registry pages for the rest.</p>` : S}
      <div class="toolbar">
        <input
          type="search"
          aria-label="Search entities"
          placeholder="Search name, entity ID, area, device, or integration"
          .value=${this._query}
          @input=${this._onSearch}
        />
        <button type="button" @click=${this._load}>Refresh registries</button>
      </div>
      ${t.length === 0 ? b`<div class="message" role="status">No entities match this search.</div>` : this._renderTable(e, t)}
    `;
	}
	_renderTable(e, t) {
		let n = new Map(e.areas.map((e) => [e.area_id, e.name])), r = new Map(e.devices.map((e) => [e.device_id, e]));
		return b`
      <div class="table-wrap">
        <table>
          <thead><tr><th>Entity</th><th>Area / device</th><th>Status</th><th>AI permission</th></tr></thead>
          <tbody>${t.map((e) => this._renderEntity(e, n, r))}</tbody>
        </table>
      </div>
    `;
	}
	_renderEntity(e, t, n) {
		let r = e.area_id === null ? "No area" : t.get(e.area_id) ?? "Unresolved area", i = e.device_id === null ? void 0 : n.get(e.device_id), a = e.disabled ? "Disabled" : e.availability.replace("_", " ");
		return b`
      <tr>
        <td data-label="Entity"><span class="name">${e.name ?? e.entity_id}</span><code>${e.entity_id}</code><span class="detail">${e.platform}</span></td>
        <td data-label="Area / device"><span>${r}</span><span class="detail">${i?.name ?? (e.device_id === null ? "No device" : "Unresolved device")}</span></td>
        <td data-label="Status"><span class="state ${e.disabled ? "not_loaded" : e.availability}">${a}</span></td>
        <td data-label="AI permission"><span class="permission">None</span></td>
      </tr>
    `;
	}
	_filteredEntities(e) {
		let t = this._query.trim().toLocaleLowerCase();
		if (t === "") return e.entities;
		let n = new Map(e.areas.map((e) => [e.area_id, e.name])), r = new Map(e.devices.map((e) => [e.device_id, e.name]));
		return e.entities.filter((e) => [
			e.entity_id,
			e.name,
			e.domain,
			e.platform,
			e.area_id === null ? null : n.get(e.area_id),
			e.device_id === null ? null : r.get(e.device_id)
		].some((e) => e?.toLocaleLowerCase().includes(t) === !0));
	}
	_onSearch = (e) => {
		this._query = e.currentTarget.value;
	};
	_load = async () => {
		if (this.hass !== void 0) {
			this._hasLoaded = !0, this._state = "loading";
			try {
				this._catalog = await V(this.hass), this._state = this._catalog.entities.length === 0 ? "empty" : "ready";
			} catch {
				this._catalog = void 0, this._state = "error";
			}
		}
	};
	_scheduleLoad() {
		this.hass === void 0 || this._hasLoaded || this._loadScheduled || (this._loadScheduled = !0, queueMicrotask(() => {
			this._loadScheduled = !1, this._load();
		}));
	}
}, H = Object.freeze({
	max_messages: 21,
	max_message_chars: 4e3,
	max_total_chars: 16e3,
	max_response_chars: 4e3,
	timeout_seconds: 60
}), Ht = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
function U(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function Ut(e, t) {
	return Object.keys(e).length === t.length && t.every((t) => Object.hasOwn(e, t));
}
function Wt(e, t) {
	return typeof e == "string" && e.trim().length > 0 && e.length <= t;
}
function Gt(e) {
	if (!U(e) || !Ut(e, [
		"schema_version",
		"providers",
		"limits",
		"streaming",
		"household_context",
		"actions",
		"history_persisted"
	]) || e.schema_version !== 1 || e.streaming !== !1 || e.household_context !== !1 || e.actions !== !1 || e.history_persisted !== !1 || !Array.isArray(e.providers) || !U(e.limits) || !Ut(e.limits, Object.keys(H))) throw Error("Unsupported chat options");
	let t = e.limits;
	if (Object.entries(H).some(([e, n]) => t[e] !== n)) throw Error("Unsupported chat limits");
	let n = /* @__PURE__ */ new Set();
	return {
		schema_version: 1,
		providers: e.providers.map((e) => {
			if (!U(e) || !Ut(e, [
				"connection_id",
				"title",
				"display_name",
				"destination",
				"capability_verified"
			]) || typeof e.connection_id != "string" || !Ht.test(e.connection_id) || !Wt(e.title, 1e3) || !Wt(e.display_name, 1e3) || e.destination !== "local" || e.capability_verified !== !1 || n.has(e.connection_id)) throw Error("Unsupported chat provider");
			return n.add(e.connection_id), {
				connection_id: e.connection_id,
				title: e.title,
				display_name: e.display_name,
				destination: "local",
				capability_verified: !1
			};
		}),
		limits: H,
		streaming: !1,
		household_context: !1,
		actions: !1,
		history_persisted: !1
	};
}
function Kt(e, t, n) {
	if (!U(e) || !Ut(e, [
		"schema_version",
		"connection_id",
		"request_id",
		"text",
		"destination",
		"streaming"
	]) || e.schema_version !== 1 || e.connection_id !== t || e.request_id !== n || e.destination !== "local" || e.streaming !== !1 || !Wt(e.text, H.max_response_chars)) throw Error("Unsupported chat response");
	return {
		schema_version: 1,
		connection_id: t,
		request_id: n,
		text: e.text,
		destination: "local",
		streaming: !1
	};
}
async function W(e) {
	return Gt(await e.callWS({ type: "ai_orchestrator/chat/options" }));
}
function G() {
	let e = crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(16));
	e[6] = e[6] & 15 | 64, e[8] = e[8] & 63 | 128;
	let t = [...e].map((e) => e.toString(16).padStart(2, "0")).join("");
	return `${t.slice(0, 8)}-${t.slice(8, 12)}-${t.slice(12, 16)}-${t.slice(16, 20)}-${t.slice(20)}`;
}
async function qt(e, t, n, r) {
	if (!Ht.test(t) || !Ht.test(n) || r.length === 0 || r.length > H.max_messages || r.length % 2 != 1 || r.some((e, t) => e.role !== (t % 2 == 0 ? "user" : "assistant") || !Wt(e.content, H.max_message_chars)) || r.reduce((e, t) => e + t.content.length, 0) > H.max_total_chars) throw Error("Invalid chat request");
	return Kt(await e.callWS({
		type: "ai_orchestrator/chat/send",
		connection_id: t,
		request_id: n,
		messages: r.map(({ role: e, content: t }) => ({
			role: e,
			content: t
		}))
	}), t, n);
}
function Jt(e, t) {
	let n = [...e.map((e) => ({ ...e })), {
		role: "user",
		content: t
	}], r = !1;
	for (; n.length > 1 && (n.length > H.max_messages || n.reduce((e, t) => e + t.content.length, 0) > H.max_total_chars);) n.splice(0, 2), r = !0;
	return {
		messages: n,
		omitted: r
	};
}
//#endregion
//#region src/api/agent-client.ts
var Yt = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
function K(e, t) {
	return typeof e == "object" && !!e && !Array.isArray(e) && Object.keys(e).length === t.length && t.every((t) => Object.hasOwn(e, t));
}
function Xt(e) {
	if (!K(e, [
		"connection_id",
		"revision",
		"observe_registry_ids",
		"action_scopes"
	]) || typeof e.connection_id != "string" || !Yt.test(e.connection_id) || !Number.isSafeInteger(e.revision) || e.revision < 0 || !Array.isArray(e.observe_registry_ids) || e.observe_registry_ids.length > 64 || e.observe_registry_ids.some((e) => typeof e != "string" || !e.trim() || e.length > 64) || new Set(e.observe_registry_ids).size !== e.observe_registry_ids.length || !Array.isArray(e.action_scopes) || e.action_scopes.length !== 0) throw Error("Unsupported agent policy");
	return {
		connection_id: e.connection_id,
		revision: e.revision,
		observe_registry_ids: [...e.observe_registry_ids],
		action_scopes: []
	};
}
async function Zt(e) {
	let t = await e.callWS({ type: "ai_orchestrator/agents/list" });
	if (!K(t, ["schema_version", "profiles"]) || t.schema_version !== 1 || !Array.isArray(t.profiles) || t.profiles.length > 32) throw Error("Unsupported agent policies");
	let n = t.profiles.map(Xt);
	if (new Set(n.map((e) => e.connection_id)).size !== n.length) throw Error("Duplicate policy");
	return n;
}
async function Qt(e, t) {
	let n = Xt(t), r = await e.callWS({
		type: "ai_orchestrator/agents/save",
		connection_id: n.connection_id,
		expected_revision: n.revision,
		observe_registry_ids: n.observe_registry_ids
	});
	if (!K(r, ["schema_version", "profile"]) || r.schema_version !== 1) throw Error("Unsupported policy response");
	let i = Xt(r.profile);
	if (i.connection_id !== n.connection_id || i.revision !== n.revision + 1 || [...i.observe_registry_ids].sort().join("\n") !== [...n.observe_registry_ids].sort().join("\n")) throw Error("Policy response mismatch");
	return i;
}
var $t = [
	"busy",
	"not_verified",
	"not_authorized",
	"invalid_request",
	"invalid_response",
	"provider_failed",
	"provider_unavailable",
	"failed",
	"limit_exceeded",
	"timeout"
];
async function en(e, t) {
	if (!Yt.test(t)) throw Error("Invalid agent");
	let n = await e.callWS({
		type: "ai_orchestrator/agents/probe_tools",
		connection_id: t
	});
	if (!K(n, [
		"schema_version",
		"connection_id",
		"supported",
		"error_code"
	]) || n.schema_version !== 1 || n.connection_id !== t || typeof n.supported != "boolean" || (n.supported ? n.error_code !== null : typeof n.error_code != "string" || !$t.includes(n.error_code))) throw Error("Unsupported probe result");
	return n.supported;
}
async function tn(e, t, n) {
	if (Xt(t), !n.trim() || n.length > 4e3) throw Error("Invalid question");
	let r = G(), i = await e.callWS({
		type: "ai_orchestrator/agents/chat",
		connection_id: t.connection_id,
		expected_revision: t.revision,
		request_id: r,
		prompt: n
	});
	if (!K(i, [
		"schema_version",
		"connection_id",
		"request_id",
		"text",
		"provider_calls",
		"tool_calls",
		"trace",
		"destination",
		"actions_executed"
	]) || i.schema_version !== 1 || i.connection_id !== t.connection_id || i.request_id !== r || i.destination !== "local" || i.actions_executed !== 0 || typeof i.text != "string" || !i.text.trim() || i.text.length > 2e3 || !Number.isInteger(i.provider_calls) || i.provider_calls < 1 || i.provider_calls > 4 || !Number.isInteger(i.tool_calls) || i.tool_calls < 0 || i.tool_calls > 4 || !Array.isArray(i.trace) || i.trace.length > 8 || i.trace.some((e) => e !== "provider_response" && e !== "state_read") || i.trace.filter((e) => e === "provider_response").length !== i.provider_calls || i.trace.filter((e) => e === "state_read").length !== i.tool_calls) throw Error("Unsupported agent answer");
	return {
		text: i.text,
		provider_calls: i.provider_calls,
		tool_calls: i.tool_calls,
		trace: [...i.trace]
	};
}
//#endregion
//#region src/panel/agent-scopes-view.ts
var nn = class extends D {
	static properties = {
		hass: { attribute: !1 },
		_profiles: { state: !0 },
		_providers: { state: !0 },
		_entities: { state: !0 },
		_connection: { state: !0 },
		_selected: { state: !0 },
		_query: { state: !0 },
		_busy: { state: !0 },
		_message: { state: !0 },
		_verified: { state: !0 },
		_question: { state: !0 },
		_answer: { state: !0 }
	};
	static styles = o`
    :host { display:block; margin-bottom:24px; }
    section { padding:20px; border:1px solid var(--divider-color,#ccd); border-radius:12px; }
    label { display:block; margin:10px 0; overflow-wrap:anywhere; }
    select,input[type=search],button { font:inherit; min-height:44px; max-width:100%; box-sizing:border-box; }
    select,input[type=search] { width:100%; color:inherit; background:var(--card-background-color,#fff); }
    .choices { max-height:280px; overflow:auto; }
    button { margin:8px 8px 0 0; }
    small { display:block; color:var(--secondary-text-color,#526168); }
    textarea { display:block; width:100%; box-sizing:border-box; min-height:90px; font:inherit; color:inherit; background:var(--card-background-color,#fff); }
    .answer { white-space:pre-wrap; overflow-wrap:anywhere; }
  `;
	_generation = 0;
	_identity;
	_socket;
	_disconnected = () => {
		this._clear();
	};
	_ready = () => {
		this._load();
	};
	constructor() {
		super(), this._profiles = [], this._providers = [], this._entities = [], this._connection = "", this._selected = [], this._query = "", this._busy = !1, this._message = "", this._verified = !1, this._question = "", this._answer = void 0;
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._clear(), this._identity = void 0, this._socket?.removeEventListener?.("disconnected", this._disconnected), this._socket?.removeEventListener?.("ready", this._ready), this._socket = void 0;
	}
	_clear() {
		this._generation++, this._profiles = [], this._providers = [], this._entities = [], this._selected = [], this._connection = "", this._message = "", this._query = "", this._busy = !1, this._verified = !1, this._question = "", this._answer = void 0;
	}
	willUpdate(e) {
		if (e.has("hass") && this.hass) {
			let e = this.hass.user?.id ?? "unknown";
			(e !== this._identity || this._socket !== this.hass.connection) && (this._socket?.removeEventListener?.("disconnected", this._disconnected), this._socket?.removeEventListener?.("ready", this._ready), this._clear(), this._identity = e, this._socket = this.hass.connection, this._socket?.addEventListener?.("disconnected", this._disconnected), this._socket?.addEventListener?.("ready", this._ready), this._load());
		} else e.has("hass") && (this._clear(), this._identity = void 0);
	}
	async _load() {
		let e = this.hass;
		if (!e || e.connection?.connected === !1) return;
		this._clear();
		let t = ++this._generation;
		this._busy = !0, this._profiles = [], this._selected = [], this._connection = "", this._message = "";
		try {
			let [n, r, i] = await Promise.all([
				Zt(e),
				W(e),
				V(e)
			]);
			if (t !== this._generation || !this.isConnected) return;
			this._profiles = n, this._providers = r.providers, this._entities = i.entities.filter((e) => !e.disabled && [
				"sensor",
				"binary_sensor",
				"light",
				"switch",
				"fan"
			].includes(e.domain)), this._choose(r.providers[0]?.connection_id ?? "");
		} catch {
			t === this._generation && (this._message = "Policies could not be loaded. Reload to try again.");
		} finally {
			t === this._generation && (this._busy = !1);
		}
	}
	_choose(e) {
		this._connection = e, this._verified = !1, this._answer = void 0, this._question = "", this._selected = [...this._profiles.find((t) => t.connection_id === e)?.observe_registry_ids ?? []], this._message = "";
	}
	async _save() {
		let e = this._profiles.find((e) => e.connection_id === this._connection);
		if (!this.hass || this.hass.connection?.connected === !1 || !e || this._busy) return;
		let t = ++this._generation;
		this._busy = !0, this._message = "", this._answer = void 0;
		try {
			let n = await Qt(this.hass, {
				...e,
				observe_registry_ids: [...this._selected]
			});
			if (t !== this._generation || !this.isConnected) return;
			this._profiles = this._profiles.map((e) => e.connection_id === n.connection_id ? n : e), this._message = "Observation policy saved. Device actions remain disabled.";
		} catch {
			t === this._generation && (this._message = "Policy was not saved. Reload and check the selected entities; another edit or an excluded entity may prevent saving.");
		} finally {
			t === this._generation && (this._busy = !1);
		}
	}
	async _probe() {
		if (!this.hass || !this._connection || this._busy) return;
		let e = ++this._generation;
		this._busy = !0, this._verified = !1, this._answer = void 0, this._message = "";
		try {
			let t = await en(this.hass, this._connection);
			if (e !== this._generation || !this.isConnected) return;
			this._verified = t, this._message = t ? "Tool call and continuation verified for this local connection." : "This connection did not pass the synthetic tool test. Scoped questions remain unavailable.";
		} catch {
			e === this._generation && (this._message = "Tool test did not complete. Check the local provider and retry.");
		} finally {
			e === this._generation && (this._busy = !1);
		}
	}
	_savedProfile() {
		let e = this._profiles.find((e) => e.connection_id === this._connection);
		return e && [...e.observe_registry_ids].sort().join("\n") === [...this._selected].sort().join("\n") ? e : void 0;
	}
	async _ask() {
		let e = this._savedProfile();
		if (!this.hass || !e || !e.observe_registry_ids.length || !this._verified || this._busy) return;
		let t = ++this._generation;
		this._busy = !0, this._answer = void 0, this._message = "";
		try {
			let n = await tn(this.hass, e, this._question);
			if (t !== this._generation || !this.isConnected) return;
			this._answer = n;
		} catch {
			t === this._generation && (this._verified = !1, this._message = "The scoped question did not complete. Reload policies and rerun the tool test; the provider or permissions may have changed.");
		} finally {
			t === this._generation && (this._busy = !1);
		}
	}
	render() {
		let e = this._query.trim().toLowerCase(), t = this._entities.filter((t) => `${t.name ?? ""} ${t.entity_id}`.toLowerCase().includes(e)), n = this._selected.filter((e) => !this._entities.some((t) => t.registry_id === e));
		return b`<section aria-label="Agent observation scopes" aria-busy=${this._busy}>
      <h2>Agent observation scopes</h2>
      <p>Choose the entities a local agent may observe. Policies start empty. Only numeric sensor values and on/off states are allowed; attributes and sensitive sensor classes are excluded. Device actions cannot be granted here.</p>
      <p>Use the scoped question below to read selected states through a verified local tool connection. Regular Chat and Assist remain text-only.</p>
      <label>Local agent<select .value=${this._connection} ?disabled=${this._busy} @change=${(e) => this._choose(e.target.value)}>
        ${this._providers.map((e) => b`<option value=${e.connection_id}>${e.title}</option>`)}
      </select></label>
      ${!this._busy && !this._providers.length ? b`<p>No local agent is available.</p>` : S}
      <label>Find an entity<input type="search" .value=${this._query} @input=${(e) => {
			this._query = e.target.value;
		}}></label>
      <p>${this._selected.length} of 64 selected. The backend checks whether each selected entity is eligible.</p>
      <div class="choices">${t.slice(0, 100).map((e) => b`<label><input type="checkbox" .checked=${this._selected.includes(e.registry_id)}
        ?disabled=${this._busy || !this._connection || !this._selected.includes(e.registry_id) && this._selected.length >= 64}
        @change=${(t) => {
			this._answer = void 0, this._selected = t.target.checked ? [...this._selected, e.registry_id] : this._selected.filter((t) => t !== e.registry_id);
		}}>
        ${e.name ?? e.entity_id}<small>${e.entity_id}</small></label>`)}</div>
      ${t.length > 100 ? b`<p>Showing 100 matches. Refine your search.</p>` : S}
      ${n.length ? b`<p>${n.length} selected entities are unavailable. Clear the selection to revoke them.</p>` : S}
      <button ?disabled=${this._busy || !this._connection} @click=${() => {
			this._answer = void 0, this._selected = [];
		}}>Clear selection</button>
      <button ?disabled=${this._busy || !this._connection} @click=${() => {
			this._save();
		}}>Save observation policy</button>
      <button ?disabled=${this._busy} @click=${() => {
			this._load();
		}}>Reload policies</button>
      <h3>Ask about selected entities</h3>
      <p>The tool test uses synthetic data only. A scoped question sends your question and permitted state values to this local provider. Each question is independent; no history is saved. No device action is available.</p>
      <button ?disabled=${this._busy || !this._connection} @click=${() => {
			this._probe();
		}}>Test tool support</button>
      <label>Scoped question<textarea maxlength="4000" .value=${this._question} ?disabled=${this._busy} @input=${(e) => {
			this._question = e.target.value, this._answer = void 0;
		}}></textarea></label>
      <button ?disabled=${this._busy || !this._verified || !this._savedProfile()?.observe_registry_ids.length || !this._question.trim()} @click=${() => {
			this._ask();
		}}>Ask local agent</button>
      ${this._answer ? b`
        <p class="answer">${this._answer.text}</p>
        <section aria-label="Scoped question trace">
          <h3>How this answer was produced</h3>
          <p>Local provider · ${this._answer.provider_calls} provider calls · ${this._answer.tool_calls} state reads · 0 actions</p>
          <ol>${this._answer.trace.map((e) => b`<li>${e === "provider_response" ? "Local provider returned a response" : "Read permitted entity states"}</li>`)}</ol>
          <p>This trace contains operation types only. It does not include prompts, state values, or provider payloads, and is not saved as history.</p>
        </section>
      ` : S}
      <p role="status">${this._message}</p>
    </section>`;
	}
};
customElements.define("ai-orchestrator-agent-scopes-view", nn);
//#endregion
//#region src/api/provider-client.ts
var rn = Object.freeze({ type: "ai_orchestrator/providers/list" }), an = [
	"healthy",
	"degraded",
	"unavailable",
	"authentication_required",
	"not_tested"
], on = [
	"authentication",
	"authorization",
	"not_found",
	"rate_limited",
	"context_overflow",
	"safety_refusal",
	"provider_unavailable",
	"invalid_response",
	"timeout",
	"connection",
	"tls",
	"dns",
	"cancelled",
	"unsupported",
	"unknown"
];
function sn(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function cn(e, t) {
	let n = Object.keys(e).sort(), r = [...t].sort();
	return n.length === r.length && n.every((e, t) => e === r[t]);
}
function ln(e) {
	return typeof e == "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(e);
}
function un(e) {
	return typeof e == "string" && an.includes(e);
}
function dn(e) {
	return typeof e == "string" && on.includes(e);
}
function fn(e) {
	return typeof e == "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.test(e) && !Number.isNaN(Date.parse(e));
}
function pn(e) {
	if (!sn(e) || !cn(e, ["schema_version", "providers"]) || e.schema_version !== 1 || !Array.isArray(e.providers)) throw Error("Invalid provider list response");
	let t = [];
	for (let n of e.providers) {
		if (!sn(n) || !cn(n, [
			"connection_id",
			"provider_type",
			"display_name",
			"title",
			"health",
			"last_tested_at"
		]) || !ln(n.connection_id) || typeof n.provider_type != "string" || !/^[a-z][a-z0-9_]{0,63}$/u.test(n.provider_type) || typeof n.display_name != "string" || n.display_name.trim() === "" || typeof n.title != "string" || n.title.trim() === "" || !un(n.health) || n.last_tested_at !== null && !fn(n.last_tested_at) || n.health === "not_tested" != (n.last_tested_at === null)) throw Error("Invalid provider entry in list");
		t.push({
			connection_id: n.connection_id,
			provider_type: n.provider_type,
			display_name: n.display_name,
			title: n.title,
			health: n.health,
			last_tested_at: n.last_tested_at
		});
	}
	return {
		schema_version: 1,
		providers: t
	};
}
function mn(e, t) {
	if (!sn(e) || !cn(e, [
		"schema_version",
		"connection_id",
		"health",
		"error_code",
		"last_tested_at"
	]) || e.schema_version !== 1 || !ln(e.connection_id) || t !== void 0 && e.connection_id !== t || !un(e.health) || e.error_code !== null && !dn(e.error_code) || e.health === "healthy" && e.error_code !== null || e.health !== "healthy" && e.error_code === null || e.health === "not_tested" || !fn(e.last_tested_at)) throw Error("Invalid provider test response");
	return {
		schema_version: 1,
		connection_id: e.connection_id,
		health: e.health,
		error_code: e.error_code,
		last_tested_at: e.last_tested_at
	};
}
async function hn(e) {
	return pn(await e.callWS({ ...rn }));
}
async function gn(e, t) {
	return mn(await e.callWS({
		type: "ai_orchestrator/providers/test",
		connection_id: t
	}), t);
}
//#endregion
//#region src/panel/providers-view.ts
var _n = "/config/integrations/integration/ai_orchestrator", vn = {
	authentication: "Authentication failed",
	authorization: "Authorization denied",
	not_found: "Model not found",
	rate_limited: "Rate limited",
	provider_unavailable: "Provider unavailable",
	timeout: "Connection timed out",
	connection: "Connection failed",
	tls: "TLS error",
	dns: "DNS resolution failed",
	context_overflow: "Context limit exceeded",
	safety_refusal: "Provider refused the request",
	invalid_response: "Provider returned an invalid response",
	cancelled: "Connection test cancelled",
	unsupported: "Connection test unsupported",
	unknown: "Test failed"
}, yn = {
	healthy: "Healthy",
	degraded: "Degraded",
	unavailable: "Unavailable",
	authentication_required: "Authentication required",
	not_tested: "Not tested"
}, bn = class extends D {
	static properties = {
		hass: { attribute: !1 },
		_viewState: { state: !0 },
		_providers: { state: !0 },
		_testStates: { state: !0 },
		_testResults: { state: !0 }
	};
	static styles = o`
    :host {
      display: block;
    }

    .provider-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }

    .provider-card {
      background: var(--card-background-color, #fff);
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .provider-card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
    }

    .provider-name {
      font-size: 1rem;
      font-weight: 600;
      margin: 0;
      line-height: 1.3;
      color: var(--primary-text-color, #212121);
    }

    .provider-type {
      font-size: 0.8rem;
      color: var(--secondary-text-color, #727272);
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .state-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 10px;
      white-space: nowrap;
    }

    .state-badge.healthy {
      border: 1px solid var(--success-color, #2e7d32);
      color: var(--success-color, #2e7d32);
    }

    .state-badge.degraded,
    .state-badge.not_tested {
      border: 1px solid var(--warning-color, #8a5a00);
      color: var(--warning-color, #8a5a00);
    }

    .state-badge.unavailable,
    .state-badge.authentication_required {
      border: 1px solid var(--error-color, #b42318);
      color: var(--error-color, #b42318);
    }

    .provider-meta {
      font-size: 0.85rem;
      color: var(--secondary-text-color, #727272);
      margin: 0;
    }

    .provider-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }

    .test-button {
      font-size: 0.85rem;
      font-weight: 500;
      padding: 6px 14px;
      border-radius: 6px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: transparent;
      color: var(--primary-text-color, #212121);
      cursor: pointer;
      transition: background 0.15s;
    }

    .test-button:hover:not(:disabled) {
      background: var(--secondary-background-color, #f5f5f5);
    }

    .test-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .test-result {
      font-size: 0.8rem;
      font-weight: 500;
    }

    .test-result.healthy {
      color: var(--success-color, #4caf50);
    }

    .test-result.unavailable,
    .test-result.authentication_required {
      color: #8a1c12;
    }

    .test-result.checking,
    .test-result.degraded,
    .test-result.not_tested {
      color: var(--secondary-text-color, #727272);
    }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: var(--primary-text-color, #212121);
    }

    .empty-state h3 {
      font-size: 1.1rem;
      margin: 0 0 8px;
      color: var(--primary-text-color, #212121);
    }

    .empty-state p {
      margin: 0;
      max-width: 400px;
      margin-inline: auto;
    }

    .error-state {
      text-align: center;
      padding: 32px 24px;
      color: var(--primary-text-color, #212121);
    }

    .primary-link,
    .refresh-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      font-weight: 500;
      padding: 8px 16px;
      border-radius: 6px;
      border: none;
      background: var(--orchestrator-accent-strong, #07514d);
      color: #fff;
      cursor: pointer;
      margin-top: 12px;
      text-decoration: none;
    }

    .primary-link:hover,
    .refresh-button:hover {
      opacity: 0.9;
    }

    .provider-toolbar {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 16px;
    }
  `;
	_hasLoaded = !1;
	_loadScheduled = !1;
	constructor() {
		super(), this._viewState = "loading", this._providers = [], this._testStates = /* @__PURE__ */ new Map(), this._testResults = /* @__PURE__ */ new Map();
	}
	connectedCallback() {
		super.connectedCallback(), this._scheduleLoad();
	}
	updated() {
		this._scheduleLoad();
	}
	render() {
		return this._viewState === "loading" ? b`<div role="status" aria-label="Loading providers" aria-busy="true">
        Loading provider connections…
      </div>` : this._viewState === "error" ? b`
        <div class="error-state">
          <p>Could not load provider connections.</p>
          <button class="refresh-button" type="button" @click=${this._loadProviders}>
            Retry
          </button>
        </div>
      ` : this._viewState === "empty" ? b`
        <div class="empty-state">
          <h3>No provider connections</h3>
          <p>
            Add a provider through Home Assistant's AI Orchestrator integration page.
            Credentials stay in the backend config flow and never return to this panel.
          </p>
          <a class="primary-link" href=${_n}>Add provider connection</a>
        </div>
      ` : b`
      <div class="provider-toolbar">
        <a class="primary-link" href=${_n}>Manage provider connections</a>
      </div>
      <div class="provider-grid" role="list" aria-label="Provider connections">
        ${this._providers.map((e) => this._renderProviderCard(e))}
      </div>
    `;
	}
	_renderProviderCard(e) {
		let t = this._testStates.get(e.connection_id) ?? "idle", n = this._testResults.get(e.connection_id), r = e.health, i = e.last_tested_at;
		return b`
      <article class="provider-card" role="listitem">
        <div class="provider-card-header">
          <div>
            <h3 class="provider-name">${e.title}</h3>
            <span class="provider-type">${e.display_name}</span>
          </div>
          <span class="state-badge ${r}">${yn[r]}</span>
        </div>
        <p class="provider-meta">Local provider · ${e.provider_type}</p>
        <p class="provider-meta">
          ${i ? `Last tested ${new Date(i).toLocaleString()}` : "Not tested in this Home Assistant runtime"}
        </p>
        <div class="provider-actions">
          <button
            class="test-button"
            type="button"
            ?disabled=${t === "checking"}
            @click=${() => this._testConnection(e.connection_id)}
          >
            ${t === "checking" ? "Testing…" : "Test connection"}
          </button>
          ${this._renderTestResult(t, n)}
        </div>
      </article>
    `;
	}
	_renderTestResult(e, t) {
		if (e === "checking") return b`<span class="test-result checking" role="status" aria-live="polite">
        Checking…
      </span>`;
		if (t === "transport_failure") return b`<span
        class="test-result transport-failure"
        role="status"
        aria-live="polite"
      >
        Home Assistant communication failed; provider health unchanged
      </span>`;
		if (t?.health === "healthy") return b`<span class="test-result healthy" role="status" aria-live="polite">
        Connection test passed
      </span>`;
		if (t !== void 0) {
			let e = vn[t.error_code ?? "unknown"] ?? "Test failed";
			return b`<span
        class="test-result ${t.health}"
        role="status"
        aria-live="polite"
      >${e}</span>`;
		}
		return S;
	}
	_loadProviders = async () => {
		let e = this.hass;
		if (e !== void 0) {
			this._hasLoaded = !0, this._viewState = "loading";
			try {
				let t = await hn(e);
				this._providers = t.providers, this._viewState = this._providers.length > 0 ? "ready" : "empty";
			} catch {
				this._viewState = "error", this._providers = [];
			}
		}
	};
	_scheduleLoad() {
		this.hass === void 0 || this._hasLoaded || this._loadScheduled || (this._loadScheduled = !0, queueMicrotask(() => {
			this._loadScheduled = !1, this._loadProviders();
		}));
	}
	async _testConnection(e) {
		let t = this.hass;
		if (t !== void 0 && this._testStates.get(e) !== "checking") {
			this._testStates = new Map(this._testStates).set(e, "checking"), this.requestUpdate();
			try {
				let n = await gn(t, e);
				this._providers = this._providers.map((t) => t.connection_id === e ? {
					...t,
					health: n.health,
					last_tested_at: n.last_tested_at
				} : t);
				let r = new Map(this._testStates), i = new Map(this._testResults);
				r.set(e, "idle"), i.set(e, n), this._testStates = r, this._testResults = i;
			} catch {
				this._testStates = new Map(this._testStates).set(e, "idle"), this._testResults = new Map(this._testResults).set(e, "transport_failure");
			}
		}
	}
}, xn = {
	light_turn_on_v1: "Turn light on",
	light_turn_off_v1: "Turn light off",
	switch_turn_on_v1: "Turn switch on",
	switch_turn_off_v1: "Turn switch off",
	media_play_v1: "Play media",
	media_pause_v1: "Pause media",
	media_volume_v1: "Set media volume"
}, Sn = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
function q(e, t) {
	return typeof e == "object" && !!e && !Array.isArray(e) && Object.keys(e).length === t.length && t.every((t) => Object.hasOwn(e, t));
}
function J(e, t = 256) {
	return typeof e == "string" && !!e.trim() && e.length <= t;
}
function Cn(e) {
	return typeof e == "string" && Object.hasOwn(xn, e);
}
function wn(e) {
	return Number.isSafeInteger(e) && e >= 0;
}
function Tn(e) {
	return typeof e == "string" && !e.startsWith("0000") && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{6})?\+00:00$/.test(e) && Number.isFinite(Date.parse(e)) && new Date(e).toISOString().slice(0, 19) === e.slice(0, 19);
}
function Y(e) {
	if (!q(e, [
		"connection_id",
		"revision",
		"action_scopes",
		"switch_reviews"
	]) || !J(e.connection_id) || !Sn.test(e.connection_id) || !wn(e.revision) || !Array.isArray(e.action_scopes) || e.action_scopes.length > 7) throw Error("Unsupported action policy");
	let t = e.action_scopes.map((e) => {
		if (!q(e, ["tool_id", "registry_ids"]) || !Cn(e.tool_id) || !Array.isArray(e.registry_ids) || !e.registry_ids.length || e.registry_ids.length > 64 || e.registry_ids.some((e) => !J(e, 64)) || new Set(e.registry_ids).size !== e.registry_ids.length) throw Error("Unsupported action grant");
		return {
			tool_id: e.tool_id,
			registry_ids: [...e.registry_ids]
		};
	});
	if (new Set(t.map((e) => e.tool_id)).size !== t.length || t.reduce((e, t) => e + t.registry_ids.length, 0) > 64) throw Error("Unsupported action grants");
	if (!Array.isArray(e.switch_reviews) || e.switch_reviews.length > 64) throw Error("Unsupported switch reviews");
	let n = e.switch_reviews.map((e) => {
		if (!q(e, [
			"registry_id",
			"classification",
			"review_id",
			"reviewed_at"
		]) || !J(e.registry_id, 64) || e.classification !== "ordinary_noncritical" || !J(e.review_id) || !Sn.test(e.review_id) || e.review_id[14] !== "4" || !Tn(e.reviewed_at)) throw Error("Unsupported switch review");
		return {
			registry_id: e.registry_id,
			classification: e.classification,
			review_id: e.review_id,
			reviewed_at: e.reviewed_at
		};
	});
	if (new Set(n.map((e) => e.registry_id)).size !== n.length || new Set(n.map((e) => e.review_id)).size !== n.length || t.some((e) => e.tool_id.startsWith("switch_") && e.registry_ids.some((e) => !n.some((t) => t.registry_id === e)))) throw Error("Unreviewed switch grant");
	return {
		connection_id: e.connection_id,
		revision: e.revision,
		action_scopes: t,
		switch_reviews: n
	};
}
function En(e, t) {
	return t === "media_volume_v1" ? q(e, ["volume_level"]) && typeof e.volume_level == "number" && Number.isFinite(e.volume_level) && e.volume_level >= 0 && e.volume_level <= 1 : q(e, []);
}
async function Dn(e, t) {
	if (!Sn.test(t)) throw Error("Invalid provider");
	let n = await e.callWS({
		type: "ai_orchestrator/actions/catalog",
		connection_id: t
	});
	if (!q(n, [
		"schema_version",
		"profile",
		"tools",
		"switch_candidates"
	]) || n.schema_version !== 2 || !Array.isArray(n.tools) || n.tools.length > 7) throw Error("Unsupported action catalog");
	let r = Y(n.profile);
	if (r.connection_id !== t) throw Error("Mismatched action policy");
	let i = n.tools.map((e) => {
		if (!q(e, [
			"tool_id",
			"label",
			"risk",
			"arguments",
			"targets"
		]) || !Cn(e.tool_id) || !J(e.label) || e.risk !== (e.tool_id.startsWith("switch_") ? "high" : "medium") || e.arguments !== (e.tool_id === "media_volume_v1" ? "volume" : "none") || !Array.isArray(e.targets) || e.targets.length > 1e4) throw Error("Unsupported action tool");
		let t = e.targets.map((e) => {
			if (!q(e, [
				"registry_id",
				"entity_id",
				"name"
			]) || !J(e.registry_id, 64) || !J(e.entity_id) || !J(e.name, 1e3)) throw Error("Unsupported action target");
			return {
				registry_id: e.registry_id,
				entity_id: e.entity_id,
				name: e.name
			};
		});
		if (new Set(t.map((e) => e.registry_id)).size !== t.length) throw Error("Duplicate action target");
		return {
			tool_id: e.tool_id,
			label: e.label,
			risk: e.risk,
			arguments: e.tool_id === "media_volume_v1" ? "volume" : "none",
			targets: t
		};
	});
	if (new Set(i.map((e) => e.tool_id)).size !== i.length) throw Error("Duplicate action tool");
	if (!Array.isArray(n.switch_candidates) || n.switch_candidates.length > 500) throw Error("Unsupported switch candidates");
	let a = n.switch_candidates.map((e) => {
		if (!q(e, [
			"registry_id",
			"entity_id",
			"name",
			"device_name",
			"status"
		]) || !J(e.registry_id, 64) || !J(e.entity_id) || !/^switch\.[a-z0-9_]+$/.test(e.entity_id) || !J(e.name, 1e3) || !J(e.device_name, 1e3) || ![
			"unreviewed",
			"reviewed",
			"stale"
		].includes(e.status)) throw Error("Unsupported switch candidate");
		if (e.status !== "unreviewed" !== r.switch_reviews.some((t) => t.registry_id === e.registry_id)) throw Error("Mismatched switch review");
		return {
			registry_id: e.registry_id,
			entity_id: e.entity_id,
			name: e.name,
			device_name: e.device_name,
			status: e.status
		};
	});
	if (new Set(a.map((e) => e.registry_id)).size !== a.length || i.some((e) => e.tool_id.startsWith("switch_") && e.targets.some((e) => !a.some((t) => t.registry_id === e.registry_id && t.entity_id === e.entity_id && t.status === "reviewed")))) throw Error("Unreviewed switch target");
	return {
		profile: r,
		tools: i,
		switch_candidates: a
	};
}
async function On(e, t) {
	let n = Y(t), r = await e.callWS({
		type: "ai_orchestrator/actions/save",
		connection_id: n.connection_id,
		expected_revision: n.revision,
		action_scopes: n.action_scopes
	});
	if (!q(r, ["schema_version", "profile"]) || r.schema_version !== 2) throw Error("Unsupported action save");
	let i = Y(r.profile), a = (e) => JSON.stringify(e.map((e) => ({
		tool_id: e.tool_id,
		registry_ids: [...e.registry_ids].sort()
	})).sort((e, t) => e.tool_id.localeCompare(t.tool_id)));
	if (i.connection_id !== n.connection_id || i.revision !== n.revision + 1 || a(i.action_scopes) !== a(n.action_scopes) || JSON.stringify(i.switch_reviews) !== JSON.stringify(n.switch_reviews)) throw Error("Mismatched action save");
	return i;
}
async function kn(e, t, n) {
	Y(t);
	let r = await e.callWS({
		type: "ai_orchestrator/actions/switch_review/preview",
		connection_id: t.connection_id,
		expected_revision: t.revision,
		registry_id: n.registry_id
	});
	if (!q(r, [
		"schema_version",
		"revision",
		"registry_id",
		"entity_id",
		"name",
		"device_name",
		"review_token",
		"expires_in"
	]) || r.schema_version !== 2 || r.revision !== t.revision || r.registry_id !== n.registry_id || r.entity_id !== n.entity_id || r.name !== n.name || r.device_name !== n.device_name || !J(r.review_token, 128) || r.expires_in !== 300) throw Error("Changed switch review target");
	return {
		revision: t.revision,
		registry_id: n.registry_id,
		entity_id: n.entity_id,
		name: n.name,
		device_name: n.device_name,
		review_token: r.review_token,
		expires_in: 300
	};
}
async function An(e, t, n, r) {
	if (Y(t), !J(n, 64) || r && (r.registry_id !== n || r.revision !== t.revision)) throw Error("Changed switch review");
	let i = await e.callWS({
		type: `ai_orchestrator/actions/switch_review/${r ? "save" : "revoke"}`,
		connection_id: t.connection_id,
		expected_revision: t.revision,
		registry_id: n,
		...r ? {
			review_token: r.review_token,
			classification: "ordinary_noncritical",
			attestations: {
				physical_target_verified: !0,
				single_device: !0,
				not_security_or_life_safety: !0
			}
		} : {}
	});
	if (!q(i, ["schema_version", "profile"]) || i.schema_version !== 2) throw Error("Unsupported switch review save");
	let a = Y(i.profile), o = t.action_scopes.map((e) => ({
		...e,
		registry_ids: e.registry_ids.filter((t) => !e.tool_id.startsWith("switch_") || t !== n)
	})).filter((e) => e.registry_ids.length), s = (e) => JSON.stringify(e.filter((e) => e.registry_id !== n).sort((e, t) => e.registry_id.localeCompare(t.registry_id)));
	if (a.connection_id !== t.connection_id || a.revision !== t.revision + 1 || JSON.stringify(a.action_scopes) !== JSON.stringify(o) || s(a.switch_reviews) !== s(t.switch_reviews) || a.switch_reviews.some((e) => e.registry_id === n) !== !!r) throw Error("Mismatched switch review save");
	return a;
}
async function jn(e, t, n, r, i) {
	if (Y(t), !En(i, n.tool_id) || !n.targets.some((e) => e.registry_id === r.registry_id && e.entity_id === r.entity_id) || !t.action_scopes.some((e) => e.tool_id === n.tool_id && e.registry_ids.includes(r.registry_id))) throw Error("Action is not granted");
	let a = G(), o = Mn(await e.callWS({
		type: "ai_orchestrator/actions/propose",
		connection_id: t.connection_id,
		expected_revision: t.revision,
		request_id: a,
		tool_id: n.tool_id,
		registry_id: r.registry_id,
		arguments: i
	}), t.connection_id, a, n, r);
	if (JSON.stringify(o.arguments) !== JSON.stringify(i)) throw Error("Mismatched action arguments");
	return o;
}
function Mn(e, t, n, r, i) {
	if (!q(e, [
		"schema_version",
		"connection_id",
		"request_id",
		"token",
		"expires_in",
		"tool_id",
		"entity_id",
		"risk",
		"arguments",
		"state"
	]) || e.schema_version !== 1 || e.connection_id !== t || e.request_id !== n || !J(e.token, 128) || e.expires_in !== 300 || e.tool_id !== r.tool_id || e.entity_id !== i.entity_id || e.risk !== r.risk || !En(e.arguments, r.tool_id) || !J(e.state, 1e3)) throw Error("Unsupported action proposal");
	return {
		connection_id: t,
		request_id: n,
		token: e.token,
		expires_in: 300,
		tool_id: r.tool_id,
		entity_id: i.entity_id,
		risk: r.risk,
		arguments: { ...e.arguments },
		state: e.state
	};
}
async function Nn(e, t, n) {
	let r = Y(t.profile);
	if (!J(n, 4e3)) throw Error("Invalid action request");
	let i = G(), a = await e.callWS({
		type: "ai_orchestrator/actions/interpret",
		connection_id: r.connection_id,
		expected_revision: r.revision,
		request_id: i,
		prompt: n
	});
	if (typeof a != "object" || !a || !("tool_id" in a) || !("entity_id" in a)) throw Error("Unsupported AI proposal");
	let o = t.tools.find((e) => e.tool_id === a.tool_id), s = o?.targets.find((e) => e.entity_id === a.entity_id);
	if (!o || !s || !r.action_scopes.some((e) => e.tool_id === o.tool_id && e.registry_ids.includes(s.registry_id))) throw Error("AI proposal is outside granted scope");
	return Mn(a, r.connection_id, i, o, s);
}
async function Pn(e, t) {
	let n = await e.callWS({
		type: "ai_orchestrator/actions/confirm",
		connection_id: t.connection_id,
		request_id: t.request_id,
		token: t.token
	});
	if (!q(n, [
		"schema_version",
		"connection_id",
		"request_id",
		"status",
		"actions_executed"
	]) || n.schema_version !== 1 || n.connection_id !== t.connection_id || n.request_id !== t.request_id || !(n.status === "completed" && n.actions_executed === 1 || n.status === "unknown" && n.actions_executed === 0)) throw Error("Unsupported action outcome");
	return n.status;
}
//#endregion
//#region src/api/notify-client.ts
var Fn = ["entity", "service"], In = class extends Error {
	constructor() {
		super("Notification target response is unsupported.");
	}
}, Ln = /^notify\.[a-z0-9_]{1,250}$/u;
function Rn(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function zn(e) {
	if (!Rn(e) || Object.keys(e).length !== 2 || e.schema_version !== 1 || !Array.isArray(e.targets) || e.targets.length > 500) throw new In();
	let t = /* @__PURE__ */ new Set();
	return e.targets.map((e) => {
		if (!Rn(e) || Object.keys(e).length !== 3 || typeof e.reference != "string" || !Ln.test(e.reference) || !Fn.includes(e.kind) || typeof e.name != "string" || e.name.trim() === "" || e.name.length > 255 || t.has(e.reference)) throw new In();
		return t.add(e.reference), {
			reference: e.reference,
			kind: e.kind,
			name: e.name
		};
	});
}
async function Bn(e) {
	return zn(await e.callWS({ type: "ai_orchestrator/notify/targets" }));
}
//#endregion
//#region src/api/workflow-draft-client.ts
var Vn = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
function Hn(e, t) {
	return typeof e == "object" && !!e && !Array.isArray(e) && Object.keys(e).length === t.length && t.every((t) => Object.hasOwn(e, t));
}
function Un(e) {
	return Array.isArray(e) && e.length <= 8 && e.every((e) => typeof e == "string" && e.length > 0 && e.length <= 255) && new Set(e).size === e.length;
}
function Wn(e) {
	return {
		entity_ids: [.../* @__PURE__ */ new Set([...e.triggers.flatMap((e) => Array.isArray(e.entity_ids) ? e.entity_ids : []), ...e.conditions.flatMap((e) => typeof e.entity_id == "string" ? [e.entity_id] : [])])].sort(),
		notify_targets: [...new Set(e.steps.flatMap((e) => typeof e.notify_service == "string" ? [e.notify_service] : []))].sort()
	};
}
async function Gn(e, t) {
	if (!Vn.test(t)) throw Error("Invalid draft source");
	let n = await e.callWS({
		type: "ai_orchestrator/workflows/draft_source",
		source_workflow_id: t
	});
	if (!Hn(n, ["schema_version", "source"]) || n.schema_version !== 1 || !Hn(n.source, [
		"workflow_id",
		"version",
		"workflow",
		"entity_ids",
		"notify_targets"
	])) throw Error("Unsupported draft source");
	let r = n.source;
	if (r.workflow_id !== t || typeof r.version != "string" || !/^[a-f0-9]{64}$/u.test(r.version) || !Un(r.entity_ids) || !Un(r.notify_targets)) throw Error("Unsupported draft source");
	let i = F(r.workflow);
	if (i.workflow_id !== t) throw Error("Mismatched draft source");
	let a = Wn(i);
	if (JSON.stringify(a.entity_ids) !== JSON.stringify([...r.entity_ids].sort()) || JSON.stringify(a.notify_targets) !== JSON.stringify([...r.notify_targets].sort())) throw Error("Mismatched source references");
	return {
		workflow_id: t,
		version: r.version,
		workflow: i,
		entity_ids: [...r.entity_ids],
		notify_targets: [...r.notify_targets]
	};
}
async function Kn(e, t, n, r, i, a) {
	if (!Vn.test(t) || !n.trim() || n.length > 4e3 || !Un(r) || !Un(i) || a && (!Vn.test(a.workflow_id) || !/^[a-f0-9]{64}$/u.test(a.version) || a.entity_ids.some((e) => !r.includes(e)) || a.notify_targets.some((e) => !i.includes(e)))) throw Error("Invalid draft input");
	let o = await e.callWS({
		type: "ai_orchestrator/workflows/generate_draft",
		connection_id: t,
		prompt: n,
		entity_ids: r,
		notify_targets: i,
		...a ? {
			source_workflow_id: a.workflow_id,
			source_version: a.version
		} : {}
	});
	if (typeof o != "object" || !o || Array.isArray(o)) throw Error("Unsupported draft");
	let s = o, c = [
		"schema_version",
		"destination",
		"provider_calls",
		"actions_executed",
		"saved",
		"workflow"
	];
	if (a && c.push("source"), Object.keys(s).length !== c.length || !c.every((e) => Object.hasOwn(s, e)) || s.schema_version !== 1 || s.destination !== "local" || s.provider_calls !== 1 || s.actions_executed !== 0 || s.saved !== !1) throw Error("Unsupported draft");
	let l = F(s.workflow);
	if (l.enabled || l.run_mode !== "execute" || l.provider_connection_id !== t) throw Error("Unsafe draft");
	if (a && (!Hn(s.source, ["workflow_id", "version"]) || s.source.workflow_id !== a.workflow_id || s.source.version !== a.version || l.workflow_id === a.workflow_id)) throw Error("Mismatched refinement");
	if (a) {
		let e = Wn(l);
		if (e.entity_ids.some((e) => !r.includes(e)) || e.notify_targets.some((e) => !i.includes(e))) throw Error("Unselected refinement references");
	}
	return l;
}
//#endregion
//#region src/panel/assistant-view.ts
var qn = {
	chat: "Conversation",
	observe: "Read permitted states",
	action: "Propose device action",
	draft: "Draft automation"
}, Jn = class extends D {
	static properties = {
		hass: { attribute: !1 },
		_providers: { state: !0 },
		_provider: { state: !0 },
		_intent: { state: !0 },
		_prompt: { state: !0 },
		_busy: { state: !0 },
		_message: { state: !0 },
		_turns: { state: !0 },
		_proposal: { state: !0 },
		_draft: { state: !0 },
		_entities: { state: !0 },
		_targets: { state: !0 },
		_selectedEntities: { state: !0 },
		_selectedTargets: { state: !0 },
		_sources: { state: !0 },
		_sourceId: { state: !0 },
		_source: { state: !0 },
		_draftReady: { state: !0 },
		_entityQuery: { state: !0 },
		_targetQuery: { state: !0 }
	};
	static styles = o`
    :host { display:flex; flex-direction:column; height:100%; min-height:0; min-width:0; overflow:hidden; color:var(--primary-text-color,#233642); }
    * { box-sizing:border-box; }
    header { flex:0 0 auto; max-height:34%; overflow:auto; }
    .header-controls { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
    header label { margin:4px 0; font-size:.8rem; }
    .body { flex:1 1 auto; min-height:0; overflow:auto; overscroll-behavior:contain; padding:0 3px; }
    footer { flex:0 0 auto; max-height:48%; min-height:0; overflow:auto; border-top:1px solid var(--divider-color,#ccd); padding:4px 0; }
    footer label { margin:2px 0; font-size:.8rem; } footer p { margin:2px 0; }
    .footer-controls { display:flex; flex-wrap:wrap; gap:4px; } .footer-controls button { margin:2px 0; font-size:.85rem; }
    h1 { font-size:1.2rem; margin:0 0 4px; } h2 { font-size:1.1rem; }
    p,li,dd { line-height:1.5; overflow-wrap:anywhere; } dd { margin:0 0 8px; }
    label { display:block; margin:10px 0; } select,textarea { display:block; width:100%; min-width:0; font:inherit; color:inherit; background:var(--card-background-color,white); }
    select,button,input { min-height:44px; max-width:100%; } button { font:inherit; padding:8px 12px; margin:4px; cursor:pointer; } button:disabled { opacity:.6; cursor:default; }
    button:focus-visible,select:focus-visible,textarea:focus-visible,input:focus-visible { outline:3px solid var(--primary-color,#007a78); outline-offset:2px; }
    textarea { height:54px; min-height:44px; resize:vertical; max-height:100px; }
    .transcript { list-style:none; padding:0; }
    .transcript li,section { border:1px solid var(--divider-color,#ccd); border-radius:10px; padding:12px; margin:10px 0; }
    .choices { max-height:180px; overflow:auto; }
    pre { white-space:pre-wrap; overflow-wrap:anywhere; max-height:240px; overflow:auto; }
    .turn-text { white-space:pre-wrap; }
  `;
	_chatContext = [];
	_epoch = 0;
	_socket;
	_call;
	_user;
	_expiry;
	constructor() {
		super(), this._providers = [], this._provider = "", this._intent = "chat", this._prompt = "", this._busy = !1, this._message = "", this._turns = [], this._entities = [], this._targets = [], this._selectedEntities = [], this._selectedTargets = [], this._sources = [], this._sourceId = "", this._draftReady = !1, this._entityQuery = "", this._targetQuery = "";
	}
	_clearCards() {
		clearTimeout(this._expiry), this._expiry = void 0, this._proposal = void 0, this._draft = void 0;
	}
	_reset = () => {
		this._epoch++, this._clearCards(), this._providers = [], this._provider = "", this._intent = "chat", this._prompt = "", this._busy = !1, this._message = "", this._turns = [], this._chatContext = [], this._entities = [], this._targets = [], this._selectedEntities = [], this._selectedTargets = [], this._sources = [], this._sourceId = "", this._source = void 0, this._draftReady = !1, this._entityQuery = "", this._targetQuery = "";
	};
	_ready = () => {
		this._load();
	};
	disconnectedCallback() {
		this._socket?.removeEventListener("disconnected", this._reset), this._socket?.removeEventListener("ready", this._ready), this._reset(), this._call = void 0, super.disconnectedCallback();
	}
	willUpdate(e) {
		e.has("hass") && (this._socket !== this.hass?.connection || this._call !== this.hass?.callWS || this._user !== this.hass?.user?.id) && (this._socket?.removeEventListener("disconnected", this._reset), this._socket?.removeEventListener("ready", this._ready), this._reset(), this._socket = this.hass?.connection, this._call = this.hass?.callWS, this._user = this.hass?.user?.id, this._socket?.addEventListener("disconnected", this._reset), this._socket?.addEventListener("ready", this._ready), queueMicrotask(this._ready));
	}
	_online() {
		return !!this.hass && this.isConnected && this.hass.connection?.connected !== !1;
	}
	_current(e, t, n, r = this._user) {
		return this._online() && e === this._epoch && this._provider === n && this.hass?.callWS === t.callWS && this.hass?.connection === t.connection && this.hass?.user?.id === r;
	}
	async _load() {
		if (!this._online()) return;
		this._reset();
		let e = this._epoch, t = this.hass;
		this._busy = !0;
		try {
			let n = await W(t);
			if (!this._current(e, t, "")) return;
			this._providers = n.providers, this._provider = n.providers[0]?.connection_id ?? "";
		} catch {
			e === this._epoch && (this._message = "Providers could not load. Check administrator access and reload.");
		} finally {
			e === this._epoch && (this._busy = !1);
		}
	}
	_chooseProvider(e) {
		this._busy || !this._providers.some((t) => t.connection_id === e) || (this._epoch++, this._clearCards(), this._provider = e, this._prompt = "", this._turns = [], this._chatContext = [], this._selectedEntities = [], this._selectedTargets = [], this._sourceId = "", this._source = void 0, this._message = "");
	}
	async _chooseIntent(e) {
		if (this._busy || !Object.hasOwn(qn, e) || (this._epoch++, this._clearCards(), this._intent = e, this._message = "", e !== "draft" || this._draftReady || !this._online())) return;
		let t = this._epoch, n = this.hass, r = this._provider;
		this._busy = !0;
		try {
			let [e, i, a] = await Promise.all([
				V(n),
				Bn(n),
				I(n)
			]);
			if (!this._current(t, n, r)) return;
			this._entities = e.entities.filter((e) => !e.disabled), this._targets = i, this._sources = a.store === "ready" ? a.workflows.map((e) => e.workflow) : [], this._draftReady = !0;
		} catch {
			t === this._epoch && (this._message = "Draft choices could not load. Reload the assistant and try again.");
		} finally {
			t === this._epoch && (this._busy = !1);
		}
	}
	async _chooseSource(e) {
		if (this._busy || !this._online() || (this._epoch++, this._clearCards(), this._sourceId = e, this._source = void 0, this._selectedEntities = [], this._selectedTargets = [], !e)) return;
		let t = this._epoch, n = this.hass, r = this._provider;
		this._busy = !0;
		try {
			let i = await Gn(n, e);
			if (!this._current(t, n, r)) return;
			this._source = i, this._selectedEntities = [...i.entity_ids], this._selectedTargets = [...i.notify_targets];
		} catch {
			t === this._epoch && (this._message = "The source could not be loaded. Select it again or start a new draft.");
		} finally {
			t === this._epoch && (this._busy = !1);
		}
	}
	_validDraft() {
		return this._draftReady && (!this._sourceId || !!this._source) && this._selectedEntities.length <= 8 && this._selectedTargets.length <= 8 && this._selectedEntities.every((e) => this._entities.some((t) => t.entity_id === e)) && this._selectedTargets.every((e) => this._targets.some((t) => t.reference === e)) && (this._source?.entity_ids.every((e) => this._selectedEntities.includes(e)) ?? !0) && (this._source?.notify_targets.every((e) => this._selectedTargets.includes(e)) ?? !0);
	}
	async _probe() {
		if (!this._online() || this._busy || !this._provider) return;
		let e = ++this._epoch, t = this.hass, n = this._provider;
		this._clearCards(), this._busy = !0;
		try {
			let r = await en(t, n);
			this._current(e, t, n) && (this._message = r ? "Synthetic state-tool test passed for this loaded provider. This does not verify device actions or automation generation." : "State-tool support was not verified. Check the local provider.");
		} catch {
			e === this._epoch && (this._message = "Tool support could not be verified.");
		} finally {
			e === this._epoch && (this._busy = !1);
		}
	}
	async _send() {
		if (!this._online() || this._busy || !this._provider || !this._prompt.trim() || this._prompt.length > 4e3 || this._intent === "draft" && !this._validDraft()) return;
		let e = ++this._epoch, t = this.hass, n = this._provider, r = this._prompt, i = this._intent;
		this._clearCards(), this._busy = !0, this._message = "";
		let a = () => this._current(e, t, n);
		try {
			let e = "", o;
			if (i === "chat") {
				let i = Jt(this._chatContext, r), o = await qt(t, n, G(), i.messages);
				if (!a()) return;
				e = o.text, this._chatContext = [...i.messages, {
					role: "assistant",
					content: e
				}], i.omitted && (this._message = "Older conversation turns were omitted from model context.");
			} else if (i === "observe") {
				let i = await Zt(t);
				if (!a()) return;
				let s = i.find((e) => e.connection_id === n);
				if (!s?.observe_registry_ids.length) throw Error("No observation scope");
				let c = await tn(t, s, r);
				if (!a()) return;
				e = c.text, o = c.trace.map((e) => e === "state_read" ? "Read permitted entity state" : "Local provider returned a response");
			} else if (i === "action") {
				let i = await Dn(t, n);
				if (!a()) return;
				if (!i.profile.action_scopes.length) throw Error("No action scope");
				let o = await Nn(t, i, r);
				if (!a()) return;
				this._proposal = o, e = "A permitted action proposal is ready. Review the exact target and confirm separately.", this._expiry = setTimeout(() => {
					this._proposal = void 0, this._message = "Action confirmation expired. Submit a new request to review again.";
				}, this._proposal.expires_in * 1e3);
			} else {
				let i = await Kn(t, n, r, [...this._selectedEntities], [...this._selectedTargets], this._source);
				if (!a()) return;
				this._draft = i, e = "New disabled, unsaved draft ready. Review in the editor, then save, dry run and enable separately.";
			}
			this._turns = [...this._turns, {
				intent: i,
				prompt: r,
				text: e,
				...o ? { trace: o } : {}
			}].slice(-20), this._prompt = "";
		} catch {
			a() && (this._message = "Request failed. Check the selected provider and permissions, then review your request. No confirmation, workflow save or enable was sent.");
		} finally {
			e === this._epoch && (this._busy = !1);
		}
	}
	async _confirm() {
		if (!this._online() || this._busy || !this._proposal) return;
		let e = this._proposal, t = ++this._epoch, n = this.hass, r = this._provider;
		this._clearCards(), this._busy = !0;
		try {
			let i = await Pn(n, e);
			this._current(t, n, r) && (this._message = i === "completed" ? "Home Assistant accepted the action. Check the physical device to verify the result." : "Action outcome is unknown. Check the device before requesting another action.");
		} catch {
			t === this._epoch && (this._message = "Action confirmation failed or the outcome is unknown. Check the device before trying again.");
		} finally {
			t === this._epoch && (this._busy = !1);
		}
	}
	render() {
		let e = this._entities.filter((e) => `${e.name ?? ""} ${e.entity_id}`.toLowerCase().includes(this._entityQuery.toLowerCase())), t = this._targets.filter((e) => `${e.name} ${e.reference}`.toLowerCase().includes(this._targetQuery.toLowerCase()));
		return b`<header><h1>Assistant</h1><div class="header-controls">
      <label>Local provider<select .value=${this._provider} ?disabled=${this._busy} @change=${(e) => this._chooseProvider(e.target.value)}>${this._providers.map((e) => b`<option value=${e.connection_id}>${e.title}</option>`)}</select></label>
      <label>Request type<select .value=${this._intent} ?disabled=${this._busy} @change=${(e) => {
			this._chooseIntent(e.target.value);
		}}>${Object.entries(qn).map(([e, t]) => b`<option value=${e}>${t}</option>`)}</select></label>
      </div></header><div class="body" role="region" aria-label="Assistant content" tabindex="0">
      <p>Choose how to handle each message. Only conversation turns enter conversation context; permitted-state answers, device proposals and drafts are kept separate. This view is temporary and clears on session or provider changes.</p>
      ${this._intent === "observe" ? b`<p>Uses saved observation permissions. Configure those in Entities & Permissions first.</p><button ?disabled=${this._busy || !this._provider} @click=${() => {
			this._probe();
		}}>Test state-tool support</button>` : S}
      ${this._intent === "action" ? b`<p>Your request and granted target names/IDs go to the local model. Current device states are not sent. Saved grants are required; the model cannot confirm.</p>` : S}
      ${this._intent === "draft" ? b`<section aria-label="Draft context"><p>Only this request, selected identifiers and any explicitly selected source drafting fields go to the local model. No household states are included.</p>
        <label>Starting workflow<select .value=${this._sourceId} ?disabled=${this._busy || !this._draftReady} @change=${(e) => {
			this._chooseSource(e.target.value);
		}}><option value="">New draft</option>${this._sources.map((e) => b`<option value=${e.workflow_id}>${e.name}</option>`)}</select></label>
        ${this._source ? b`<details><summary>Source fields sent to the model</summary><pre>${JSON.stringify({
			name: this._source.workflow.name,
			description: this._source.workflow.description,
			triggers: this._source.workflow.triggers,
			conditions: this._source.workflow.conditions,
			steps: this._source.workflow.steps
		}, null, 2)}</pre></details>` : S}
        <p>Select up to eight entities and eight notification targets. Source references must remain selected.</p>
        <p>Selected entities: ${this._selectedEntities.join(", ") || "none"}. Selected notification targets: ${this._selectedTargets.join(", ") || "none"}.</p>
        <label>Find draft entity<input type="search" .value=${this._entityQuery} @input=${(e) => {
			this._entityQuery = e.target.value;
		}}></label>
        <div class="choices" aria-label="Draft entities">${e.slice(0, 100).map((e) => b`<label><input type="checkbox" .checked=${this._selectedEntities.includes(e.entity_id)} ?disabled=${this._busy || !this._selectedEntities.includes(e.entity_id) && this._selectedEntities.length >= 8} @change=${(t) => {
			this._clearCards(), this._selectedEntities = t.target.checked ? [...this._selectedEntities, e.entity_id] : this._selectedEntities.filter((t) => t !== e.entity_id);
		}}>${e.name ?? e.entity_id} (${e.entity_id})</label>`)}</div>
        ${e.length > 100 ? b`<p>Showing the first 100 matching entities. Refine your search.</p>` : S}
        <label>Find notification target<input type="search" .value=${this._targetQuery} @input=${(e) => {
			this._targetQuery = e.target.value;
		}}></label>
        <div class="choices" aria-label="Notification targets">${t.slice(0, 100).map((e) => b`<label><input type="checkbox" .checked=${this._selectedTargets.includes(e.reference)} ?disabled=${this._busy || !this._selectedTargets.includes(e.reference) && this._selectedTargets.length >= 8} @change=${(t) => {
			this._clearCards(), this._selectedTargets = t.target.checked ? [...this._selectedTargets, e.reference] : this._selectedTargets.filter((t) => t !== e.reference);
		}}>${e.name} (${e.reference})</label>`)}</div>
        ${t.length > 100 ? b`<p>Showing the first 100 matching targets. Refine your search.</p>` : S}
      </section>` : S}
      <ol class="transcript" aria-label="Assistant conversation">${this._turns.map((e) => b`<li><strong>${qn[e.intent]}</strong><p class="turn-text">You: ${e.prompt}</p><p class="turn-text">${e.text}</p>${e.trace ? b`<ol aria-label="Observation trace">${e.trace.map((e) => b`<li>${e}</li>`)}</ol>` : S}</li>`)}</ol>
      ${this._proposal ? b`<section aria-label="Action confirmation"><h2>Review before confirming</h2><dl><dt>Action</dt><dd>${xn[this._proposal.tool_id]}</dd><dt>Exact entity</dt><dd>${this._proposal.entity_id}</dd><dt>Current state</dt><dd>${this._proposal.state}</dd><dt>Arguments</dt><dd>${JSON.stringify(this._proposal.arguments)}</dd><dt>Risk</dt><dd>${this._proposal.risk}</dd></dl><p>Expires in five minutes. Changed state or permissions require a new proposal.</p><button ?disabled=${this._busy} @click=${() => {
			this._confirm();
		}}>Confirm this action</button><button @click=${() => this._clearCards()}>Cancel proposal</button></section>` : S}
      ${this._draft ? b`<section aria-label="Unsaved workflow draft"><h2>Review disabled draft</h2><pre>${JSON.stringify(this._draft, null, 2)}</pre><button ?disabled=${this._busy} @click=${() => {
			this._draft && this._online() && this.dispatchEvent(new CustomEvent("assistant-workflow-review", {
				bubbles: !0,
				composed: !0,
				detail: { json: JSON.stringify(this._draft) }
			}));
		}}>Review in workflow editor</button></section>` : S}
      </div><footer>
      <label>Your message<textarea maxlength="4000" .value=${this._prompt} ?disabled=${this._busy} @input=${(e) => {
			this._clearCards(), this._prompt = e.target.value;
		}} @keydown=${(e) => {
			(e.ctrlKey || e.metaKey) && e.key === "Enter" && (e.preventDefault(), this._send());
		}}></textarea></label>
      <div class="footer-controls"><button ?disabled=${this._busy || !this._provider || !this._prompt.trim() || this._intent === "draft" && !this._validDraft()} @click=${() => {
			this._send();
		}}>Send request</button>
      <button ?disabled=${this._busy} @click=${() => {
			this._epoch++, this._clearCards(), this._chatContext = [], this._turns = [], this._prompt = "", this._message = "", this._source = void 0, this._sourceId = "", this._selectedEntities = [], this._selectedTargets = [], this._entityQuery = "", this._targetQuery = "", this._intent = "chat";
		}}>New conversation</button>
      <button ?disabled=${this._busy} @click=${this._ready}>Reload assistant</button></div>
      <p role="status" aria-live="polite">${this._busy ? "Working…" : this._message}</p></footer>`;
	}
};
customElements.get("ai-orchestrator-assistant") || customElements.define("ai-orchestrator-assistant", Jn);
//#endregion
//#region src/panel/workflow-builder-view.ts
var Yn = "ai-orchestrator-workflow-builder", Xn = /^[a-z][a-z0-9_]{0,63}$/u, Zn = [
	"string",
	"number",
	"boolean"
], Qn = /^([01]\d|2[0-3]):[0-5]\d$/u, $n = /^[a-z_][a-z0-9_]*\.[a-z0-9_]+$/u, er = 40, tr = {
	invalid_workflow: "Home Assistant rejected the workflow. Check the highlighted fields.",
	workflow_store_unavailable: "Workflow storage is unavailable.",
	workflow_dry_run_required: "Save with Enabled unchecked, dry run this exact workflow successfully, then enable it in the stored list.",
	not_loaded: "The foundation is not loaded."
}, nr = class extends D {
	static properties = {
		hass: { attribute: !1 },
		draft: { attribute: !1 },
		_editing: { state: !0 },
		_notice: { state: !0 },
		_entities: { state: !0 },
		_providers: { state: !0 },
		_targets: { state: !0 },
		_name: { state: !0 },
		_description: { state: !0 },
		_runMode: { state: !0 },
		_providerId: { state: !0 },
		_enabled: { state: !0 },
		_triggerKind: { state: !0 },
		_triggerEntity: { state: !0 },
		_toState: { state: !0 },
		_atTime: { state: !0 },
		_conditions: { state: !0 },
		_steps: { state: !0 },
		_busy: { state: !0 },
		_error: { state: !0 },
		_saved: { state: !0 }
	};
	static styles = o`
    :host { display:block; min-width:0; color:var(--primary-text-color,#233642); margin-bottom:32px; }
    * { box-sizing:border-box; } h1 { font-size:26px; margin:0 0 10px; } h2 { font-size:18px; margin:18px 0 8px; }
    p { line-height:1.6; } fieldset { border:1px solid var(--divider-color,#ccd9da); border-radius:12px; padding:12px 16px; margin:0 0 14px; min-width:0; }
    legend { font-weight:600; padding:0 6px; } label { display:block; font-weight:600; margin:10px 0 4px; }
    input, select, textarea { width:100%; min-width:0; min-height:44px; padding:8px 12px; font:inherit; color:inherit; background:var(--card-background-color,#fff); border:1px solid #7d969c; border-radius:8px; }
    textarea { min-height:96px; resize:vertical; } .row { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr)); gap:12px; }
    .actions { display:flex; flex-wrap:wrap; gap:10px; margin:14px 0; } button { cursor:pointer; min-height:44px; padding:10px 14px; font:inherit; border:1px solid #7d969c; border-radius:8px; background:var(--card-background-color,#fff); color:inherit; }
    .primary { background:#175e56; color:#fff; } button:disabled { opacity:.55; cursor:default; } .error { color:var(--error-color,#852e23); }
    .hint { font-size:13px; opacity:.85; margin:4px 0 0; } .check { display:flex; align-items:center; gap:8px; font-weight:600; margin:10px 0; } .check input { width:auto; min-height:0; }
    button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline:3px solid #207e73; outline-offset:3px; }
  `;
	_sequence = 0;
	_callWS;
	_userId;
	_workflowId = G();
	constructor() {
		super(), this._entities = [], this._providers = [], this._targets = [], this._name = "", this._description = "", this._runMode = "observe", this._providerId = "", this._enabled = !1, this._triggerKind = "state", this._triggerEntity = "", this._toState = "on", this._atTime = "", this._conditions = [], this._steps = [{
			kind: "ai_compose",
			prompt: "Write a short, friendly household reminder about this event."
		}, {
			kind: "notify",
			notify_service: ""
		}], this._busy = !1, this._error = "", this._saved = !1, this._editing = !1, this._notice = "";
	}
	willUpdate(e) {
		e.has("draft") && this.draft !== void 0 && this._loadDocument(this.draft.json), e.has("hass") && (this._callWS !== this.hass?.callWS || this._userId !== this.hass?.user?.id) && (this._callWS = this.hass?.callWS, this._userId = this.hass?.user?.id, this._sequence++, this._entities = [], this._providers = [], this._targets = [], this._busy = !1, this._error = "", this._saved = !1, this._loadLookups());
	}
	async _loadLookups() {
		let e = this.hass;
		if (!e) return;
		let t = this._sequence, n = () => t === this._sequence && this.isConnected && this.hass?.callWS === e.callWS, [r, i, a] = await Promise.allSettled([
			V(e),
			W(e),
			Bn(e)
		]);
		n() && (r.status === "fulfilled" && (this._entities = r.value.entities.filter((e) => !e.disabled)), i.status === "fulfilled" && (this._providers = i.value.providers, this._providerId ||= i.value.providers[0]?.connection_id ?? ""), a.status === "fulfilled" && (this._targets = a.value));
	}
	_matches(e) {
		let t = e.trim().toLowerCase();
		return t.length < 2 ? [] : this._entities.filter((e) => e.entity_id.includes(t) || (e.name ?? "").toLowerCase().includes(t)).slice(0, er);
	}
	_touch() {
		this._error = "", this._saved = !1;
	}
	problems() {
		let e = [];
		(!this._name.trim() || this._name.length > 128) && e.push("Give the workflow a name of up to 128 characters."), this._triggerKind === "state" && !$n.test(this._triggerEntity) && e.push("Choose a trigger entity."), this._triggerKind === "state" && this._toState.length > 255 && e.push("The trigger's target state is too long."), this._description.length > 512 && e.push("Keep the description under 512 characters."), this._triggerKind === "time" && !Qn.test(this._atTime) && e.push("Enter the trigger time as HH:MM.");
		for (let [t, n] of this._conditions.entries()) {
			let r = `Condition ${t + 1}`;
			n.kind === "time_window" && (!Qn.test(n.after_time) || !Qn.test(n.before_time)) && e.push(`${r}: both times must be HH:MM.`), n.kind === "state" && (!$n.test(n.entity_id) || !n.state.trim()) && e.push(`${r}: choose an entity and a state.`), n.kind === "numeric_state" && (!$n.test(n.entity_id) || !n.above.trim() && !n.below.trim() || [n.above, n.below].some((e) => e.trim() && !Number.isFinite(Number(e)))) && e.push(`${r}: choose an entity and a finite bound.`);
		}
		this._steps.length === 0 && e.push("Add at least one step.");
		for (let [t, n] of this._steps.entries()) {
			let r = `Step ${t + 1}`;
			if ((n.kind === "ai_compose" || n.kind === "ai_classify" || n.kind === "ai_extract") && (!n.prompt.trim() || n.prompt.length > 4e3) && e.push(`${r}: enter a prompt of up to 4,000 characters.`), n.kind === "ai_classify") {
				let t = this._categories(n.categories);
				(t.length < 2 || t.length > 20 || new Set(t).size !== t.length || t.some((e) => e.length > 64)) && e.push(`${r}: list two to twenty unique categories.`);
			}
			if (n.kind === "notify" && !this._targets.some((e) => e.reference === n.notify_service) && e.push(`${r}: choose a notification target that Home Assistant has.`), n.kind === "ai_extract") {
				let t = this._fields(n.fields);
				(t.length < 1 || t.length > 10 || new Set(t.map((e) => e.name)).size !== t.length || t.some((e) => !/^[a-z][a-z0-9_]{0,63}$/u.test(e.name) || !Zn.includes(e.type))) && e.push(`${r}: list one to ten fields as name:type (string, number or boolean).`);
			}
			if (n.kind === "branch") {
				let i = this._stepIds().indexOf(n.when_step_id), a = i >= 0 && i < t ? this._steps[i] : void 0;
				!a || a.kind !== "ai_classify" ? e.push(`${r}: choose an earlier classify step to branch on.`) : this._categories(a.categories).includes(n.when_category) || e.push(`${r}: choose one of that step's categories.`);
			}
		}
		return this._runMode === "execute" && this._steps.some((e) => e.kind === "ai_compose" || e.kind === "ai_classify" || e.kind === "ai_extract") && !this._providers.some((e) => e.connection_id === this._providerId) && e.push("Execute mode with AI steps needs a local provider."), e;
	}
	_categories(e) {
		return e.split(",").map((e) => e.trim()).filter(Boolean);
	}
	_fields(e) {
		return e.split(",").map((e) => e.trim()).filter(Boolean).map((e) => {
			let [t = "", n = "string"] = e.split(":").map((e) => e.trim());
			return {
				name: t,
				type: n
			};
		});
	}
	_stepIds() {
		let e = new Set(this._steps.map((e) => e.id).filter((e) => e !== void 0)), t = {};
		return this._steps.map((n) => {
			if (n.id !== void 0) return n.id;
			let r = n.kind === "ai_compose" ? "compose" : n.kind === "ai_classify" ? "classify" : n.kind === "ai_extract" ? "extract" : n.kind === "branch" ? "gate" : "notify", i;
			do
				t[r] = (t[r] ?? 0) + 1, i = t[r] === 1 ? r : `${r}_${t[r]}`;
			while (e.has(i));
			return e.add(i), i;
		});
	}
	_loadDocument(e) {
		this._touch(), this._notice = "";
		let t;
		try {
			t = JSON.parse(e);
		} catch {
			this._notice = "That document is not valid JSON; use the JSON editor below.";
			return;
		}
		let n = Array.isArray(t.triggers) ? t.triggers : [], r = Array.isArray(t.conditions) ? t.conditions : [], i = Array.isArray(t.steps) ? t.steps : [], a = n[0];
		if (!(typeof t.workflow_id == "string" && typeof t.name == "string" && n.length === 1 && a !== void 0 && (a.kind === "manual" || a.kind === "time" || a.kind === "state" && Array.isArray(a.entity_ids) && a.entity_ids.length === 1) && r.every((e) => [
			"time_window",
			"state",
			"numeric_state"
		].includes(e.kind)) && i.every((e) => [
			"ai_compose",
			"ai_classify",
			"ai_extract",
			"branch",
			"notify"
		].includes(e.kind) && typeof e.step_id == "string" && Xn.test(e.step_id)))) {
			this._notice = "This workflow uses a shape the builder cannot show (for example several triggers); use the JSON editor below.";
			return;
		}
		this._workflowId = t.workflow_id, this._editing = !0, this._name = t.name, this._description = typeof t.description == "string" ? t.description : "", this._enabled = t.enabled === !0, this._runMode = t.run_mode === "execute" ? "execute" : "observe", typeof t.provider_connection_id == "string" && (this._providerId = t.provider_connection_id), this._triggerKind = a.kind, this._triggerEntity = a.kind === "state" ? String(a.entity_ids[0]) : "", this._toState = a.kind === "state" && a.to_state !== void 0 ? String(a.to_state) : "", this._atTime = a.kind === "time" ? String(a.at_time ?? "") : "", this._conditions = r.map((e) => e.kind === "time_window" ? {
			kind: "time_window",
			after_time: String(e.after_time ?? ""),
			before_time: String(e.before_time ?? "")
		} : e.kind === "state" ? {
			kind: "state",
			entity_id: String(e.entity_id ?? ""),
			state: String(e.state ?? "")
		} : {
			kind: "numeric_state",
			entity_id: String(e.entity_id ?? ""),
			above: e.above === void 0 ? "" : String(e.above),
			below: e.below === void 0 ? "" : String(e.below)
		}), this._steps = i.map((e) => {
			let t = e.step_id;
			return e.kind === "ai_compose" ? {
				id: t,
				kind: "ai_compose",
				prompt: String(e.prompt ?? "")
			} : e.kind === "ai_classify" ? {
				id: t,
				kind: "ai_classify",
				prompt: String(e.prompt ?? ""),
				categories: (Array.isArray(e.categories) ? e.categories : []).join(", ")
			} : e.kind === "ai_extract" ? {
				id: t,
				kind: "ai_extract",
				prompt: String(e.prompt ?? ""),
				fields: (Array.isArray(e.fields) ? e.fields : []).map((e) => `${String(e.name)}:${String(e.type)}`).join(", ")
			} : e.kind === "branch" ? {
				id: t,
				kind: "branch",
				when_step_id: String(e.when_step_id ?? ""),
				when_category: String(e.when_category ?? "")
			} : {
				id: t,
				kind: "notify",
				notify_service: String(e.notify_service ?? "")
			};
		});
	}
	_move(e, t, n) {
		let r = t + n;
		if (r < 0 || r >= e.length) return e;
		let i = [...e];
		return [i[t], i[r]] = [i[r], i[t]], i;
	}
	document() {
		let e = this._triggerKind === "state" ? [this._toState.trim() ? {
			kind: "state",
			entity_ids: [this._triggerEntity],
			to_state: this._toState
		} : {
			kind: "state",
			entity_ids: [this._triggerEntity]
		}] : this._triggerKind === "time" ? [{
			kind: "time",
			at_time: this._atTime
		}] : [{ kind: "manual" }], t = this._conditions.map((e) => {
			if (e.kind === "time_window") return {
				kind: "time_window",
				after_time: e.after_time,
				before_time: e.before_time
			};
			if (e.kind === "state") return {
				kind: "state",
				entity_id: e.entity_id,
				state: e.state
			};
			let t = {
				kind: "numeric_state",
				entity_id: e.entity_id
			};
			return e.above.trim() && (t.above = Number(e.above)), e.below.trim() && (t.below = Number(e.below)), t;
		}), n = this._stepIds(), r = this._steps.map((e, t) => {
			let r = n[t];
			return e.kind === "ai_compose" ? {
				step_id: r,
				kind: "ai_compose",
				prompt: e.prompt
			} : e.kind === "ai_classify" ? {
				step_id: r,
				kind: "ai_classify",
				prompt: e.prompt,
				categories: this._categories(e.categories)
			} : e.kind === "ai_extract" ? {
				step_id: r,
				kind: "ai_extract",
				prompt: e.prompt,
				fields: this._fields(e.fields)
			} : e.kind === "branch" ? {
				step_id: r,
				kind: "branch",
				when_step_id: e.when_step_id,
				when_category: e.when_category
			} : {
				step_id: r,
				kind: "notify",
				notify_service: e.notify_service
			};
		}), i = this._steps.some((e) => e.kind === "ai_compose" || e.kind === "ai_classify" || e.kind === "ai_extract");
		return {
			schema_version: 1,
			workflow_id: this._workflowId,
			name: this._name.trim(),
			description: this._description,
			enabled: this._enabled,
			run_mode: this._runMode,
			provider_connection_id: this._runMode === "execute" && i ? this._providerId : null,
			triggers: e,
			conditions: t,
			steps: r
		};
	}
	_toEditor = () => {
		this._touch(), this.dispatchEvent(new CustomEvent("workflow-draft", {
			bubbles: !0,
			composed: !0,
			detail: { json: JSON.stringify(this.document(), null, 2) }
		}));
	};
	_save = async () => {
		let e = this.hass;
		if (this._busy || !e || e.connection?.connected === !1 || this.problems().length > 0) return;
		this._touch(), this._busy = !0;
		let t = this._sequence, n = () => t === this._sequence && this.isConnected && this.hass?.callWS === e.callWS && this.hass?.user?.id === e.user?.id;
		try {
			if (await kt(e, JSON.stringify(this.document())), !n()) return;
			this._saved = !0, this.dispatchEvent(new CustomEvent("workflow-saved", {
				bubbles: !0,
				composed: !0
			}));
		} catch (e) {
			if (!n()) return;
			let t = typeof e == "object" && e && "code" in e && typeof e.code == "string" ? e.code : "", r = t === "invalid_workflow" && typeof e == "object" && e && "message" in e && typeof e.message == "string" && e.message.length <= 160 ? ` ${e.message}` : "";
			this._error = (tr[t] ?? "The workflow could not be saved. Check administrator access and the installed integration version.") + r;
		} finally {
			n() && (this._busy = !1);
		}
	};
	_startNew = () => {
		this._workflowId = G(), this._touch(), this._editing = !1, this._notice = "", this._name = "", this._description = "", this._enabled = !1, this._runMode = "observe", this._triggerKind = "state", this._triggerEntity = "", this._toState = "on", this._atTime = "", this._conditions = [], this._steps = [{
			kind: "ai_compose",
			prompt: "Write a short, friendly household reminder about this event."
		}, {
			kind: "notify",
			notify_service: ""
		}];
	};
	render() {
		let e = this.problems(), t = !this.hass || this.hass.connection?.connected === !1;
		return b`<section aria-labelledby="builder-title">
      <h1 id="builder-title">${this._editing ? "Edit a workflow" : "Build a workflow"}</h1>
      ${this._notice ? b`<p class="error" id="wb-notice">${this._notice}</p>` : S}
      ${this._editing ? b`<p id="wb-editing">Editing the stored workflow <code>${this._workflowId}</code>; saving replaces it and resets its live status.</p>` : S}
      <p>Assemble a workflow from what Home Assistant actually has: a trigger, optional deterministic conditions, AI steps, and a notification target. Nothing is sent until you save; a saved workflow only runs live when its mode is <strong>execute</strong> and it is enabled.</p>
      <fieldset><legend>Workflow</legend>
        <div class="row">
          <div><label for="wb-name">Name</label><input id="wb-name" maxlength="128" .value=${this._name} @input=${(e) => {
			this._touch(), this._name = e.target.value;
		}} /></div>
          <div><label for="wb-description">Description (optional)</label><input id="wb-description" maxlength="512" .value=${this._description} @input=${(e) => {
			this._touch(), this._description = e.target.value;
		}} /></div>
          <div><label for="wb-mode">Mode</label>
            <select id="wb-mode" .value=${this._runMode} @change=${(e) => {
			this._touch(), this._runMode = e.target.value;
		}}>
              <option value="observe" ?selected=${this._runMode === "observe"}>Observe only (record outcomes)</option>
              <option value="execute" ?selected=${this._runMode === "execute"}>Execute (run AI steps and deliver)</option>
            </select></div>
          <div><label for="wb-provider">Local provider for AI steps</label>
            <select id="wb-provider" ?disabled=${this._providers.length === 0} .value=${this._providerId} @change=${(e) => {
			this._touch(), this._providerId = e.target.value;
		}}>
              ${this._providers.length === 0 ? b`<option value="">No local provider available</option>` : this._providers.map((e) => b`<option value=${e.connection_id} ?selected=${e.connection_id === this._providerId}>${e.title}</option>`)}
            </select></div>
        </div>
        <label class="check" for="wb-enabled"><input id="wb-enabled" type="checkbox" .checked=${this._enabled} @change=${(e) => {
			this._touch(), this._enabled = e.target.checked;
		}} /> Enable after saving</label>
      </fieldset>
      <fieldset><legend>Trigger</legend>
        <label for="wb-trigger-kind">Kind</label>
        <select id="wb-trigger-kind" .value=${this._triggerKind} @change=${(e) => {
			this._touch(), this._triggerKind = e.target.value;
		}}>
          <option value="state" ?selected=${this._triggerKind === "state"}>An entity changes to a state</option>
          <option value="time" ?selected=${this._triggerKind === "time"}>A time of day</option>
          <option value="manual" ?selected=${this._triggerKind === "manual"}>Manual only (Observe now)</option>
        </select>
        ${this._triggerKind === "state" ? b`<div class="row">
          <div>${this._renderEntityPicker("wb-trigger-entity", "Entity", this._triggerEntity, (e) => {
			this._triggerEntity = e;
		})}</div>
          <div><label for="wb-to-state">Changes to state (leave empty for any change)</label><input id="wb-to-state" maxlength="255" .value=${this._toState} @input=${(e) => {
			this._touch(), this._toState = e.target.value;
		}} /></div>
        </div>` : S}
        ${this._triggerKind === "time" ? b`<label for="wb-at-time">At (HH:MM, local)</label><input id="wb-at-time" placeholder="20:00" maxlength="5" .value=${this._atTime} @input=${(e) => {
			this._touch(), this._atTime = e.target.value;
		}} />` : S}
      </fieldset>
      <fieldset><legend>Conditions (all must pass)</legend>
        ${this._conditions.map((e, t) => this._renderCondition(e, t))}
        <div class="actions">
          <button type="button" @click=${() => this._addCondition({
			kind: "time_window",
			after_time: "18:00",
			before_time: "06:00"
		})}>Add time window</button>
          <button type="button" @click=${() => this._addCondition({
			kind: "state",
			entity_id: "",
			state: "on"
		})}>Add entity state</button>
          <button type="button" @click=${() => this._addCondition({
			kind: "numeric_state",
			entity_id: "",
			above: "",
			below: ""
		})}>Add numeric bound</button>
        </div>
      </fieldset>
      <fieldset><legend>Steps (in order)</legend>
        ${this._steps.map((e, t) => this._renderStep(e, t))}
        <div class="actions">
          <button type="button" ?disabled=${this._steps.length >= 25} @click=${() => this._addStep({
			kind: "ai_compose",
			prompt: ""
		})}>Add compose text</button>
          <button type="button" ?disabled=${this._steps.length >= 25} @click=${() => this._addStep({
			kind: "ai_classify",
			prompt: "",
			categories: "urgent, routine"
		})}>Add classify</button>
          <button type="button" ?disabled=${this._steps.length >= 25} @click=${() => this._addStep({
			kind: "ai_extract",
			prompt: "",
			fields: "room:string, needs_action:boolean"
		})}>Add extract values</button>
          <button type="button" ?disabled=${this._steps.length >= 25} @click=${() => this._addStep({
			kind: "branch",
			when_step_id: "",
			when_category: ""
		})}>Add branch</button>
          <button type="button" ?disabled=${this._steps.length >= 25} @click=${() => this._addStep({
			kind: "notify",
			notify_service: ""
		})}>Add notification</button>
        </div>
      </fieldset>
      ${e.length ? b`<ul class="error" id="wb-problems">${e.map((e) => b`<li>${e}</li>`)}</ul>` : S}
      <div class="actions">
        <button class="primary" id="wb-save" type="button" ?disabled=${this._busy || t || e.length > 0} @click=${this._save}>${this._busy ? "Saving…" : "Save workflow"}</button>
        <button id="wb-to-editor" type="button" @click=${this._toEditor}>Open in JSON editor</button>
        <button type="button" @click=${this._startNew}>Start a new one</button>
      </div>
      <div role="status" aria-live="polite">${this._error ? b`<p class="error">${this._error}</p>` : S}${this._saved ? b`<p>Workflow saved. It appears in the stored workflows list below; enable it there or with the checkbox above before saving.</p>` : S}</div>
    </section>`;
	}
	_renderEntityPicker(e, t, n, r) {
		let i = this._matches(n);
		return b`<label for=${e}>${t}</label>
      <input id=${e} list="${e}-list" placeholder="Type to search entities" autocomplete="off" maxlength="255" .value=${n} @input=${(e) => {
			this._touch(), r(e.target.value), this.requestUpdate();
		}} />
      <datalist id="${e}-list">${i.map((e) => b`<option value=${e.entity_id}>${e.name ?? e.entity_id}</option>`)}</datalist>
      <p class="hint">${this._entities.length ? `${this._entities.length} entities in the catalogue` : "Catalogue unavailable; type an entity id"}${i.length ? ` · ${i.length} match(es)` : ""}</p>`;
	}
	_addCondition(e) {
		this._conditions.length < 20 && (this._touch(), this._conditions = [...this._conditions, e]);
	}
	_addStep(e) {
		this._touch(), this._steps = [...this._steps, e];
	}
	_updateCondition(e, t) {
		this._touch(), this._conditions = this._conditions.map((n, r) => r === e ? {
			...n,
			...t
		} : n);
	}
	_updateStep(e, t) {
		this._touch(), this._steps = this._steps.map((n, r) => r === e ? {
			...n,
			...t
		} : n);
	}
	_renderCondition(e, t) {
		let n = b`<span class="actions"><button type="button" ?disabled=${t === 0} @click=${() => {
			this._touch(), this._conditions = this._move(this._conditions, t, -1);
		}}>Move condition ${t + 1} up</button><button type="button" ?disabled=${t === this._conditions.length - 1} @click=${() => {
			this._touch(), this._conditions = this._move(this._conditions, t, 1);
		}}>Move condition ${t + 1} down</button><button type="button" @click=${() => {
			this._touch(), this._conditions = this._conditions.filter((e, n) => n !== t);
		}}>Remove condition ${t + 1}</button></span>`;
		return e.kind === "time_window" ? b`<fieldset><legend>Condition ${t + 1}: time window</legend><div class="row">
      <div><label for="wb-c${t}-after">From (HH:MM)</label><input id="wb-c${t}-after" maxlength="5" .value=${e.after_time} @input=${(e) => this._updateCondition(t, { after_time: e.target.value })} /></div>
      <div><label for="wb-c${t}-before">Until (HH:MM, exclusive)</label><input id="wb-c${t}-before" maxlength="5" .value=${e.before_time} @input=${(e) => this._updateCondition(t, { before_time: e.target.value })} /></div></div>${n}</fieldset>` : e.kind === "state" ? b`<fieldset><legend>Condition ${t + 1}: entity state</legend><div class="row">
      <div>${this._renderEntityPicker(`wb-c${t}-entity`, "Entity", e.entity_id, (e) => this._updateCondition(t, { entity_id: e }))}</div>
      <div><label for="wb-c${t}-state">Is in state</label><input id="wb-c${t}-state" maxlength="255" .value=${e.state} @input=${(e) => this._updateCondition(t, { state: e.target.value })} /></div></div>${n}</fieldset>` : b`<fieldset><legend>Condition ${t + 1}: numeric bound</legend><div class="row">
      <div>${this._renderEntityPicker(`wb-c${t}-entity`, "Entity", e.entity_id, (e) => this._updateCondition(t, { entity_id: e }))}</div>
      <div><label for="wb-c${t}-above">Above (exclusive)</label><input id="wb-c${t}-above" inputmode="decimal" .value=${e.above} @input=${(e) => this._updateCondition(t, { above: e.target.value })} /></div>
      <div><label for="wb-c${t}-below">Below (exclusive)</label><input id="wb-c${t}-below" inputmode="decimal" .value=${e.below} @input=${(e) => this._updateCondition(t, { below: e.target.value })} /></div></div>${n}</fieldset>`;
	}
	_renderStep(e, t) {
		let n = b`<span class="actions"><button type="button" ?disabled=${t === 0} @click=${() => {
			this._touch(), this._steps = this._move(this._steps, t, -1);
		}}>Move step ${t + 1} up</button><button type="button" ?disabled=${t === this._steps.length - 1} @click=${() => {
			this._touch(), this._steps = this._move(this._steps, t, 1);
		}}>Move step ${t + 1} down</button><button type="button" @click=${() => {
			this._touch(), this._steps = this._steps.filter((e, n) => n !== t);
		}}>Remove step ${t + 1}</button></span>`;
		if (e.kind === "notify") return b`<fieldset><legend>Step ${t + 1}: send a notification</legend>
      <label for="wb-s${t}-target">Target (from Home Assistant)</label>
      <select id="wb-s${t}-target" .value=${e.notify_service} @change=${(e) => this._updateStep(t, { notify_service: e.target.value })}>
        <option value="" ?selected=${e.notify_service === ""}>Choose a target…</option>
        ${this._targets.map((t) => b`<option value=${t.reference} ?selected=${t.reference === e.notify_service}>${t.name} — ${t.reference} (${t.kind})</option>`)}
      </select>
      <p class="hint">The message is the text composed by the most recent compose step; the workflow name is the title.</p>${n}</fieldset>`;
		if (e.kind === "branch") {
			let r = this._stepIds(), i = this._steps.map((e, t) => ({
				s: e,
				i: t
			})).filter(({ s: e, i: n }) => e.kind === "ai_classify" && n < t), a = i.find(({ i: t }) => r[t] === e.when_step_id)?.s, o = a && a.kind === "ai_classify" ? this._categories(a.categories) : [];
			return b`<fieldset><legend>Step ${t + 1}: branch — continue only when a classification matches</legend>
        <div class="row"><div><label for="wb-s${t}-when">Classify step</label>
        <select id="wb-s${t}-when" .value=${e.when_step_id} @change=${(e) => this._updateStep(t, {
				when_step_id: e.target.value,
				when_category: ""
			})}>
          <option value="" ?selected=${e.when_step_id === ""}>Choose an earlier classify step…</option>
          ${i.map(({ i: t }) => b`<option value=${r[t]} ?selected=${r[t] === e.when_step_id}>Step ${t + 1} (${r[t]})</option>`)}
        </select></div>
        <div><label for="wb-s${t}-category">Continue when category is</label>
        <select id="wb-s${t}-category" ?disabled=${o.length === 0} .value=${e.when_category} @change=${(e) => this._updateStep(t, { when_category: e.target.value })}>
          <option value="" ?selected=${e.when_category === ""}>Choose a category…</option>
          ${o.map((t) => b`<option value=${t} ?selected=${t === e.when_category}>${t}</option>`)}
        </select></div></div>
        <p class="hint">If the category differs, every later step is skipped and the run still counts as completed.</p>${n}</fieldset>`;
		}
		return e.kind === "ai_extract" ? b`<fieldset><legend>Step ${t + 1}: extract values with AI</legend>
      <label for="wb-s${t}-prompt">Prompt</label>
      <textarea id="wb-s${t}-prompt" maxlength="4000" .value=${e.prompt} @input=${(e) => this._updateStep(t, { prompt: e.target.value })}></textarea>
      <label for="wb-s${t}-fields">Fields (name:type, comma separated; types string, number, boolean)</label>
      <input id="wb-s${t}-fields" .value=${e.fields} @input=${(e) => this._updateStep(t, { fields: e.target.value })} />
      <p class="hint">The model must return exactly these fields with these types; anything else fails the step.</p>${n}</fieldset>` : b`<fieldset><legend>Step ${t + 1}: ${e.kind === "ai_compose" ? "compose text with AI" : "classify with AI"}</legend>
      <label for="wb-s${t}-prompt">Prompt</label>
      <textarea id="wb-s${t}-prompt" maxlength="4000" .value=${e.prompt} @input=${(e) => this._updateStep(t, { prompt: e.target.value })}></textarea>
      ${e.kind === "ai_classify" ? b`<label for="wb-s${t}-categories">Categories (comma separated, 2–20)</label><input id="wb-s${t}-categories" .value=${e.categories} @input=${(e) => this._updateStep(t, { categories: e.target.value })} />` : S}
      <p class="hint">The model receives only this prompt plus the event, time, and the states of entities named by your conditions.</p>${n}</fieldset>`;
	}
};
customElements.define(Yn, nr);
var rr = [
	"ok",
	"planned",
	"failed",
	"skipped",
	"taken",
	"not_taken"
], ir = [
	"ai_compose",
	"ai_classify",
	"ai_extract",
	"branch",
	"notify"
], ar = {
	invalid_output: "The model reply did not match the required shape",
	timeout: "The provider took too long to reply",
	provider_failed: "The provider request failed"
}, or = [
	"entity",
	"service",
	"missing"
], sr = class extends Error {
	constructor() {
		super("Workflow dry-run response is unsupported.");
	}
}, cr = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u, lr = /^[a-z][a-z0-9_]{0,63}$/u, ur = [
	"schema_version",
	"mode",
	"workflow_id",
	"destination",
	"triggered",
	"conditions_passed",
	"eligible",
	"trigger_results",
	"condition_results",
	"steps",
	"provider_calls",
	"actions_executed",
	"completed"
], dr = [
	"matched",
	"event_kind_mismatch",
	"state_unchanged",
	"entity_not_selected",
	"target_state_mismatch",
	"time_mismatch"
], fr = [
	"matched",
	"outside_time_window",
	"state_unavailable",
	"state_mismatch",
	"state_not_numeric",
	"outside_numeric_bounds"
];
function pr(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function X(e, t) {
	return Object.keys(e).length === t.length && t.every((t) => Object.hasOwn(e, t));
}
function Z(e, t) {
	return typeof e == "string" && e.trim().length > 0 && e.length <= t;
}
function mr(e, t) {
	if (!pr(e) || e.index !== t || !Z(e.step_id, 64) || !lr.test(e.step_id) || !ir.includes(e.kind) || typeof e.executed != "boolean" || !rr.includes(e.status)) return !1;
	let n = [
		"index",
		"step_id",
		"kind",
		"executed",
		"status"
	], r = e.kind === "ai_compose" || e.kind === "ai_classify" || e.kind === "ai_extract";
	switch (e.status) {
		case "ok": return !r || e.executed !== !0 ? !1 : e.kind === "ai_compose" ? X(e, [...n, "text"]) && Z(e.text, 2e3) : e.kind === "ai_classify" ? X(e, [...n, "category"]) && Z(e.category, 64) : X(e, [...n, "values"]) && pr(e.values) && Object.keys(e.values).length <= 10 && Object.entries(e.values).every(([e, t]) => lr.test(e) && (typeof t == "string" && t.length <= 500 || typeof t == "number" && Number.isFinite(t) || typeof t == "boolean"));
		case "taken":
		case "not_taken": return e.kind === "branch" && e.executed === !1 && X(e, n);
		case "planned": return !r && e.executed === !1 && (X(e, [...n, "message_step_id"]) || X(e, [
			...n,
			"message_step_id",
			"target"
		]) && or.includes(e.target)) && (e.message_step_id === null || Z(e.message_step_id, 64) && lr.test(e.message_step_id));
		case "failed": return r && e.executed === !1 && X(e, [...n, "error"]) && Z(e.error, 64);
		default: return e.executed === !1 && X(e, n);
	}
}
function hr(e, t) {
	if (!pr(e) || !X(e, ur) || e.schema_version !== 1 || e.mode !== "dry_run" || e.workflow_id !== t || e.destination !== "local" || typeof e.triggered != "boolean" || typeof e.conditions_passed != "boolean" || typeof e.eligible != "boolean" || typeof e.completed != "boolean" || e.actions_executed !== 0 || !Number.isInteger(e.provider_calls) || e.provider_calls < 0 || !A(e.trigger_results, 10, dr) || !A(e.condition_results, 20, fr) || !Array.isArray(e.steps) || e.steps.length > 25 || !e.steps.every((e, t) => mr(e, t)) || e.triggered !== e.trigger_results.some((e) => e.passed) || e.conditions_passed !== e.condition_results.every((e) => e.passed)) throw new sr();
	let n = e.steps, r = n.filter((e) => e.kind !== "notify" && (e.status === "ok" || e.status === "failed")).length, i = e.eligible;
	if (!i && (n.length > 0 || e.provider_calls !== 0 || e.completed !== !1) || i && (!(e.triggered && e.conditions_passed) || n.length === 0 || e.provider_calls !== r || e.completed !== !n.some((e) => e.status === "failed"))) throw new sr();
	let a = n.findIndex((e) => e.status === "failed" || e.status === "not_taken");
	if (n.some((e, t) => e.status === "skipped" != (a !== -1 && t > a)) || n.some((e) => e.kind === "branch" && e.status !== "taken" && e.status !== "not_taken" && e.status !== "skipped")) throw new sr();
	return e;
}
async function gr(e, t, n, r) {
	if (!cr.test(t) || !cr.test(n) || !r.trim() || r.length > 131072) throw new sr();
	return hr(await e.callWS({
		type: "ai_orchestrator/workflows/dry_run",
		workflow_id: t,
		connection_id: n,
		snapshot_json: r
	}), t);
}
//#endregion
//#region src/panel/workflow-preview-view.ts
var _r = "ai-orchestrator-workflow-preview", vr = {
	schema_version: 1,
	workflow_id: "12345678-1234-4123-8123-123456789abc",
	name: "Synthetic evening window preview",
	enabled: !1,
	triggers: [{
		kind: "state",
		entity_ids: ["binary_sensor.synthetic_window"],
		to_state: "on"
	}],
	conditions: [{
		kind: "time_window",
		after_time: "18:00",
		before_time: "06:00"
	}, {
		kind: "state",
		entity_id: "binary_sensor.synthetic_window",
		state: "on"
	}],
	steps: [{
		step_id: "compose",
		kind: "ai_compose",
		prompt: "Write a short window reminder."
	}, {
		step_id: "notify",
		kind: "notify",
		notify_service: "notify.synthetic"
	}]
}, yr = {
	ai_compose: "Compose text",
	ai_classify: "Classify text",
	ai_extract: "Extract values",
	branch: "Branch",
	notify: "Notification"
}, br = {
	workflow_not_found: "Save the workflow first; a dry run uses the stored version.",
	dry_run_provider_unavailable: "Select an available local provider.",
	dry_run_busy: "A dry run is already running. Try again shortly.",
	invalid_snapshot: "Check the snapshot JSON.",
	workflow_store_unavailable: "Workflow storage is unavailable."
}, xr = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u, Sr = class extends D {
	static properties = {
		hass: { attribute: !1 },
		draft: { attribute: !1 },
		_workflow: { state: !0 },
		_snapshot: { state: !0 },
		_busy: { state: !0 },
		_error: { state: !0 },
		_result: { state: !0 },
		_saved: { state: !0 },
		_providers: { state: !0 },
		_connectionId: { state: !0 },
		_dryRun: { state: !0 },
		_targets: { state: !0 }
	};
	static styles = o`
    :host { display:block; min-width:0; color:var(--primary-text-color,#233642); margin-bottom:32px; }
    * { box-sizing:border-box; } h1 { font-size:26px; margin:0 0 10px; } h2 { font-size:20px; }
    p { line-height:1.6; } .editors { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr)); gap:16px; }
    label { display:block; font-weight:600; margin-bottom:6px; } textarea { width:100%; min-width:0; height:300px; resize:vertical; padding:12px; font:13px/1.5 monospace; color:inherit; background:var(--card-background-color,#fff); border:1px solid #7d969c; border-radius:8px; }
    .actions { display:flex; flex-wrap:wrap; gap:10px; margin:16px 0; } button { cursor:pointer; min-height:44px; padding:10px 14px; font:inherit; border:1px solid #7d969c; border-radius:8px; background:var(--card-background-color,#fff); color:inherit; }
    .primary { background:#175e56; color:#fff; } button:disabled { opacity:.55; cursor:default; }
    button:focus-visible,textarea:focus-visible { outline:3px solid #207e73; outline-offset:3px; }
    .result { border:1px solid var(--divider-color,#ccd9da); border-radius:12px; padding:16px; overflow-wrap:anywhere; }
    .error { color:var(--error-color,#852e23); } li { margin:8px 0; } select { min-height:44px; padding:8px 12px; font:inherit; border:1px solid #7d969c; border-radius:8px; background:var(--card-background-color,#fff); color:inherit; max-width:100%; } .composed { white-space:pre-wrap; border-left:3px solid #175e56; padding-left:12px; } @media(max-width:700px) { .editors { grid-template-columns:minmax(0,1fr); } textarea { height:220px; } }
  `;
	_sequence = 0;
	_lookupSequence = 0;
	_connection;
	_userId;
	_callWS;
	constructor() {
		super(), this._workflow = "", this._snapshot = "", this._busy = !1, this._error = "", this._saved = !1, this._providers = [], this._connectionId = "", this._targets = [];
	}
	_reset = () => {
		this._invalidate(), this._workflow = "", this._snapshot = "";
	};
	_invalidate() {
		this._sequence++, this._busy = !1, this._error = "", this._result = void 0, this._saved = !1, this._dryRun = void 0;
	}
	_unbind() {
		this._connection?.removeEventListener("disconnected", this._reset);
	}
	connectedCallback() {
		super.connectedCallback(), this._connection?.addEventListener("disconnected", this._reset);
	}
	disconnectedCallback() {
		this._unbind(), this._reset(), super.disconnectedCallback();
	}
	willUpdate(e) {
		let t = this._callWS === void 0, n = e.has("hass") && (this._connection !== this.hass?.connection || this._userId !== this.hass?.user?.id || this._callWS !== this.hass?.callWS);
		n && (this._unbind(), this._reset(), this._connection = this.hass?.connection, this._userId = this.hass?.user?.id, this._callWS = this.hass?.callWS, this._connection?.addEventListener("disconnected", this._reset), this._lookupSequence++, this._providers = [], this._connectionId = "", this._targets = [], this._loadProviders(), this._loadTargets()), e.has("draft") && this.draft !== void 0 && (!n || t) && (this._invalidate(), this._workflow = this.draft.json);
	}
	async _loadProviders() {
		let e = this.hass;
		if (!e) return;
		let t = this._lookupSequence;
		try {
			let n = await W(e);
			if (t !== this._lookupSequence || this.hass?.callWS !== e.callWS) return;
			this._providers = n.providers, this._connectionId = n.providers[0]?.connection_id ?? "";
		} catch {}
	}
	async _loadTargets() {
		let e = this.hass;
		if (!e) return;
		let t = this._lookupSequence;
		try {
			let n = await Bn(e);
			if (t !== this._lookupSequence || this.hass?.callWS !== e.callWS) return;
			this._targets = n;
		} catch {}
	}
	_storedWorkflowId() {
		try {
			let e = JSON.parse(this._workflow).workflow_id;
			return typeof e == "string" && xr.test(e) ? e : void 0;
		} catch {
			return;
		}
	}
	_canDryRun() {
		return !this._busy && !!this.hass && this.hass.connection?.connected !== !1 && !!this._snapshot.trim() && this._storedWorkflowId() !== void 0 && this._providers.some((e) => e.connection_id === this._connectionId);
	}
	_runDry = async () => {
		let e = this.hass, t = this._storedWorkflowId(), n = this._connectionId;
		if (!this._canDryRun() || !e || t === void 0) return;
		this._invalidate(), this._busy = !0;
		let r = this._sequence, i = () => r === this._sequence && this.isConnected && this.hass?.callWS === e.callWS && this.hass?.connection === e.connection && this.hass?.user?.id === e.user?.id;
		try {
			let r = await gr(e, t, n, this._snapshot);
			i() && (this._dryRun = r);
		} catch (e) {
			if (!i()) return;
			let t = typeof e == "object" && e && "code" in e && typeof e.code == "string" ? e.code : "";
			this._error = br[t] ?? "The dry run could not be completed. Check the snapshot JSON, the selected provider, administrator access, and the installed integration version.";
		} finally {
			i() && (this._busy = !1);
		}
	};
	_example(e) {
		this._invalidate(), this._workflow = JSON.stringify(vr, null, 2), this._snapshot = JSON.stringify({
			states: { "binary_sensor.synthetic_window": "on" },
			time: e ? "12:00" : "20:00",
			event: {
				kind: "state",
				entity_id: "binary_sensor.synthetic_window",
				from_state: "off",
				to_state: "on"
			}
		}, null, 2);
	}
	_edit(e, t) {
		this._invalidate();
		let n = e.target.value;
		t ? this._workflow = n : this._snapshot = n;
	}
	_preview = async () => {
		let e = this.hass;
		if (this._busy || !e || e.connection?.connected === !1 || !this._workflow.trim() || !this._snapshot.trim()) return;
		this._invalidate(), this._busy = !0;
		let t = this._sequence, n = () => t === this._sequence && this.isConnected && this.hass?.callWS === e.callWS && this.hass?.connection === e.connection && this.hass?.user?.id === e.user?.id;
		try {
			let t = await ht(e, this._workflow, this._snapshot);
			n() && (this._result = t);
		} catch {
			n() && (this._error = "Preview could not be completed. Check both JSON documents, administrator access, and the installed integration version.");
		} finally {
			n() && (this._busy = !1);
		}
	};
	_save = async () => {
		let e = this.hass;
		if (this._busy || !e || e.connection?.connected === !1 || !this._workflow.trim()) return;
		this._invalidate(), this._busy = !0;
		let t = this._sequence, n = () => t === this._sequence && this.isConnected && this.hass?.callWS === e.callWS && this.hass?.connection === e.connection && this.hass?.user?.id === e.user?.id;
		try {
			let t = await kt(e, this._workflow);
			if (!n()) return;
			this._workflow = JSON.stringify(t.workflow, null, 2), this._saved = !0, this.dispatchEvent(new CustomEvent("workflow-saved", {
				bubbles: !0,
				composed: !0
			}));
		} catch (e) {
			n() && (this._error = typeof e == "object" && e && "code" in e && e.code === "workflow_dry_run_required" ? "Save with enabled set to false, dry run this exact workflow successfully, then enable it in the stored list." : "The workflow could not be saved. Check the workflow JSON, administrator access, and the installed integration version.");
		} finally {
			n() && (this._busy = !1);
		}
	};
	render() {
		return b`<section aria-labelledby="preview-title">
      <h1 id="preview-title">Workflow preview</h1>
      <p>Test a draft against a supplied snapshot. Preview contacts no provider and executes no action. Save an execute workflow disabled, dry run it successfully with its configured provider, then enable it in the stored list. Changing the workflow requires another dry run. Observe mode never runs steps.</p>
      <p>Start with a synthetic window example, then edit the workflow or snapshot. The example identifiers are fictional.</p>
      <div class="actions"><button type="button" @click=${() => this._example(!1)}>Load synthetic evening example</button><button type="button" @click=${() => this._example(!0)}>Load synthetic daytime example</button></div>
      <div class="editors"><div><label for="workflow">Workflow JSON</label><textarea id="workflow" spellcheck="false" maxlength=${st} .value=${this._workflow} @input=${(e) => this._edit(e, !0)}></textarea></div>
      <div><label for="snapshot">Snapshot JSON</label><textarea id="snapshot" spellcheck="false" maxlength=${st} .value=${this._snapshot} @input=${(e) => this._edit(e, !1)}></textarea></div></div>
      <div class="actions"><button class="primary" type="button" ?disabled=${this._busy || !this.hass || this.hass.connection?.connected === !1 || !this._workflow.trim() || !this._snapshot.trim()} @click=${this._preview}>${this._busy ? "Previewing…" : "Preview workflow"}</button><button type="button" ?disabled=${this._busy || !this.hass || this.hass.connection?.connected === !1 || !this._workflow.trim()} @click=${this._save}>${this._busy ? "Working…" : "Save as workflow"}</button><button type="button" @click=${this._reset}>Reset preview</button></div>
      <div class="actions">
        <label for="dry-run-provider">Local provider for a dry run</label>
        <select id="dry-run-provider" ?disabled=${this._busy || this._providers.length === 0} .value=${this._connectionId} @change=${(e) => {
			this._invalidate(), this._connectionId = e.target.value;
		}}>
          ${this._providers.length === 0 ? b`<option value="">No local provider available</option>` : this._providers.map((e) => b`<option value=${e.connection_id} ?selected=${e.connection_id === this._connectionId}>${e.title}</option>`)}
        </select>
        <button id="dry-run" type="button" ?disabled=${!this._canDryRun()} @click=${this._runDry}>${this._busy ? "Working…" : "Dry run AI steps"}</button>
      </div>
      <details><summary>Notification targets found in Home Assistant (${this._targets.length})</summary>
        ${this._targets.length ? b`<ul>${this._targets.map((e) => b`<li><code>${e.reference}</code> — ${e.name} (notify ${e.kind})</li>`)}</ul>` : b`<p>No notify entity or notify service was found, or discovery is unavailable.</p>`}
        <p>Use one of these references as a notify step's <code>notify_service</code>. To run a workflow live, set <code>"run_mode": "execute"</code> and, for AI steps, <code>"provider_connection_id"</code> to a local provider, then save and enable it.</p>
      </details>
      <p>A dry run evaluates the <em>stored</em> workflow against the snapshot above, then runs its AI steps once against the selected local provider. The model sees only the step prompt, the event, the time, and the states of entities named by the workflow's conditions. Notifications are only planned; nothing is sent, stored, or executed.</p>
      <div role="status" aria-live="polite">${this._error ? b`<p class="error">${this._error}</p>` : S}${this._saved ? b`<p>Workflow saved. It appears in the stored workflows list below.</p>` : S}${this._busy ? b`<p>Working…</p>` : S}${this._result ? this._renderResult(this._result) : S}${this._dryRun ? this._renderDryRun(this._dryRun) : S}</div>
    </section>`;
	}
	_renderResult(e) {
		return b`<div class="result"><h2>${e.eligible ? "Scenario passes — steps planned" : "Scenario blocked — no steps planned"}</h2>
      <p>Draft enabled flag: ${e.enabled ? "yes" : "no"}. Preview never activates a workflow.</p>
      <h3>Triggers (any must pass)</h3><ul>${e.trigger_results.map((e) => b`<li>Trigger ${e.index + 1}: ${e.passed ? "Pass" : "Fail"} — ${O[e.reason]}</li>`)}</ul>
      <h3>Conditions (all must pass)</h3>${e.condition_results.length ? b`<ul>${e.condition_results.map((e) => b`<li>Condition ${e.index + 1}: ${e.passed ? "Pass" : "Fail"} — ${O[e.reason]}</li>`)}</ul>` : b`<p>No conditions.</p>`}
      <h3>Planned steps</h3>${e.planned_steps.length ? b`<ol>${e.planned_steps.map((e) => b`<li>${yr[e.kind]} — not executed</li>`)}</ol>` : b`<p>No steps planned.</p>`}
      <p>Provider calls: 0 · Actions executed: 0</p></div>`;
	}
	_renderDryRun(e) {
		return b`<div class="result"><h2>${e.eligible ? e.completed ? "Dry run completed — nothing was sent" : "Dry run stopped at a failed step" : "Dry run: scenario blocked — no AI step ran"}</h2>
      <h3>Triggers (any must pass)</h3><ul>${e.trigger_results.map((e) => b`<li>Trigger ${e.index + 1}: ${e.passed ? "Pass" : "Fail"} — ${O[e.reason]}</li>`)}</ul>
      <h3>Conditions (all must pass)</h3>${e.condition_results.length ? b`<ul>${e.condition_results.map((e) => b`<li>Condition ${e.index + 1}: ${e.passed ? "Pass" : "Fail"} — ${O[e.reason]}</li>`)}</ul>` : b`<p>No conditions.</p>`}
      <h3>Steps</h3>${e.steps.length ? b`<ol>${e.steps.map((e) => this._renderDryRunStep(e))}</ol>` : b`<p>No steps ran.</p>`}
      <p>Provider calls: ${e.provider_calls} · Actions executed: 0 · Destination: local</p></div>`;
	}
	_renderDryRunStep(e) {
		let t = yr[e.kind];
		return e.status === "ok" && e.text !== void 0 ? b`<li>${t} — composed:<div class="composed">${e.text}</div></li>` : e.status === "ok" && e.values !== void 0 ? b`<li>${t} — values: ${Object.entries(e.values).map(([e, t]) => `${e} = ${String(t)}`).join(", ")}</li>` : e.status === "ok" ? b`<li>${t} — category: ${e.category}</li>` : e.status === "taken" ? b`<li>${t} — taken, later steps continue</li>` : e.status === "not_taken" ? b`<li>${t} — not taken, later steps skipped</li>` : e.status === "planned" ? b`<li>${t} — planned, not sent${e.message_step_id ? ` (would use text from step ${e.message_step_id})` : ""}${e.target === "missing" ? " — target not found in Home Assistant" : e.target ? ` — target resolves to a notify ${e.target}` : ""}</li>` : e.status === "failed" ? b`<li>${t} — failed: ${ar[e.error] ?? "Provider error"}</li>` : b`<li>${t} — skipped</li>`;
	}
};
customElements.define(_r, Sr);
//#endregion
//#region src/panel/workflows-view.ts
var Cr = "ai-orchestrator-workflows", wr = {
	load: "Stored workflows could not be read from Home Assistant. Check administrator access and the installed integration version.",
	mutate: "The change could not be completed. Nothing was executed; reload to see the current stored state.",
	observe: "The observation could not be completed. Nothing was executed."
}, Tr = class extends D {
	static properties = {
		hass: { attribute: !1 },
		refreshToken: {
			type: Number,
			attribute: !1
		},
		_viewState: { state: !0 },
		_store: { state: !0 },
		_entries: { state: !0 },
		_pending: { state: !0 },
		_confirmDeleteId: { state: !0 },
		_error: { state: !0 },
		_observation: { state: !0 }
	};
	static styles = o`
    :host {
      display: block;
      min-width: 0;
      color: var(--primary-text-color, #233642);
      margin-bottom: 32px;
    }
    * {
      box-sizing: border-box;
    }
    h2 {
      font-size: 20px;
      margin: 0 0 8px;
    }
    h3 {
      font-size: 1rem;
      margin: 0;
      line-height: 1.3;
    }
    p {
      line-height: 1.6;
    }
    .list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
      gap: 16px;
      margin-top: 16px;
    }
    .card {
      background: var(--card-background-color, #fff);
      border: 1px solid var(--divider-color, #ccd9da);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }
    .badge {
      display: inline-flex;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 10px;
      border: 1px solid currentColor;
      white-space: nowrap;
    }
    .badge.active {
      color: var(--success-color, #2e7d32);
    }
    .badge.inactive {
      color: var(--secondary-text-color, #5d6f74);
    }
    .badge.error {
      color: var(--error-color, #852e23);
    }
    .meta {
      margin: 0;
      font-size: 0.85rem;
      color: var(--secondary-text-color, #5d6f74);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    button {
      cursor: pointer;
      min-height: 40px;
      padding: 8px 12px;
      font: inherit;
      border: 1px solid #7d969c;
      border-radius: 8px;
      background: var(--card-background-color, #fff);
      color: inherit;
    }
    button.danger {
      border-color: var(--error-color, #852e23);
      color: var(--error-color, #852e23);
    }
    button:disabled {
      opacity: 0.55;
      cursor: default;
    }
    button:focus-visible {
      outline: 3px solid #207e73;
      outline-offset: 3px;
    }
    .notice {
      border: 1px solid var(--divider-color, #ccd9da);
      border-radius: 12px;
      padding: 12px 16px;
    }
    .error {
      color: var(--error-color, #852e23);
    }
  `;
	_sequence = 0;
	_refreshRequested = !1;
	_connection;
	_userId;
	_callWS;
	constructor() {
		super(), this.refreshToken = 0, this._viewState = "waiting", this._store = "not_loaded", this._entries = [], this._error = "";
	}
	_reset = () => {
		this._sequence++, this._viewState = "waiting", this._store = "not_loaded", this._entries = [], this._pending = void 0, this._refreshRequested = !1, this._confirmDeleteId = void 0, this._error = "", this._observation = void 0;
	};
	connectedCallback() {
		super.connectedCallback(), this._connection?.addEventListener("disconnected", this._reset), this._callWS !== void 0 && this.hass !== void 0 && queueMicrotask(() => void this._load());
	}
	disconnectedCallback() {
		this._connection?.removeEventListener("disconnected", this._reset), this._reset(), super.disconnectedCallback();
	}
	willUpdate(e) {
		e.has("hass") && (this._connection !== this.hass?.connection || this._userId !== this.hass?.user?.id || this._callWS !== this.hass?.callWS) && (this._connection?.removeEventListener("disconnected", this._reset), this._reset(), this._connection = this.hass?.connection, this._userId = this.hass?.user?.id, this._callWS = this.hass?.callWS, this._connection?.addEventListener("disconnected", this._reset), this.hass !== void 0 && queueMicrotask(() => void this._load())), e.has("refreshToken") && e.get("refreshToken") !== void 0 && queueMicrotask(() => void this._load());
	}
	_current(e, t) {
		return e === this._sequence && this.isConnected && this.hass?.callWS === t.callWS && this.hass?.connection === t.connection && this.hass?.user?.id === t.user?.id;
	}
	_load = async () => {
		let e = this.hass;
		if (e === void 0 || e.connection?.connected === !1) return;
		if (this._pending !== void 0) {
			this._refreshRequested = !0;
			return;
		}
		this._refreshRequested = !1;
		let t = ++this._sequence;
		this._viewState = "loading", this._error = "";
		try {
			let n = await I(e);
			if (!this._current(t, e)) return;
			this._store = n.store, this._entries = n.workflows, this._viewState = "ready";
		} catch {
			if (!this._current(t, e)) return;
			this._entries = [], this._viewState = "error", this._error = wr.load;
		}
	};
	async _mutate(e) {
		let t = this.hass;
		if (t === void 0 || this._pending !== void 0 || t.connection?.connected === !1) return;
		let n = this._sequence;
		this._pending = e, this._error = "", e.action !== "observe" && (this._observation = void 0);
		try {
			if (e.action === "observe") {
				let r = await Mt(t, e.id);
				if (!this._current(n, t)) return;
				this._observation = {
					id: e.id,
					result: r
				};
				let i = await I(t);
				if (!this._current(n, t)) return;
				this._store = i.store, this._entries = i.workflows;
				return;
			}
			let r = e.action === "delete" ? await jt(t, e.id) : await At(t, e.id, e.action === "enable");
			if (!this._current(n, t)) return;
			this._store = r.store, this._entries = r.workflows, this._confirmDeleteId = void 0;
		} catch (r) {
			if (!this._current(n, t)) return;
			this._error = typeof r == "object" && r && "code" in r && r.code === "workflow_dry_run_required" ? "Execution requires a successful dry run of this exact workflow. Save disabled, dry run, then enable." : e.action === "observe" ? wr.observe : wr.mutate;
		} finally {
			this._pending === e && (this._pending = void 0, this._refreshRequested && this._current(n, t) && queueMicrotask(() => void this._load()));
		}
	}
	_editInBuilder(e) {
		this.dispatchEvent(new CustomEvent("workflow-edit", {
			detail: { json: JSON.stringify(e.workflow, null, 2) },
			bubbles: !0,
			composed: !0
		}));
	}
	_loadIntoEditor(e) {
		this.dispatchEvent(new CustomEvent("workflow-load", {
			detail: { json: JSON.stringify(e.workflow, null, 2) },
			bubbles: !0,
			composed: !0
		}));
	}
	render() {
		return b`
      <section aria-labelledby="workflows-title">
        <h2 id="workflows-title">Stored workflows</h2>
        <p>
          Enabled workflows watch their triggers in Home Assistant and record whether the
          deterministic conditions passed. A workflow in observe mode runs nothing. A workflow
          in execute mode runs its AI steps and delivers to its notify target; no other Home
          Assistant action can be called.
        </p>
        <div class="actions">
          <p>Before enabling execution, save disabled and successfully dry run the exact workflow with its configured provider. Observe now only checks conditions and never sends notifications.</p>
          <button
            type="button"
            ?disabled=${this._viewState === "loading" || this._pending !== void 0 || !this.hass}
            @click=${this._load}
          >
            ${this._viewState === "loading" ? "Loading…" : "Reload workflows"}
          </button>
        </div>
        <div role="status" aria-live="polite">
          ${this._error ? b`<p class="error">${this._error}</p>` : S}
          ${this._store === "unreadable" ? b`<p class="notice error">
                The stored workflow file contains data this version cannot validate. Nothing on
                disk was changed and no workflow is active; saving is refused until the file is
                repaired or restored from a backup.
              </p>` : S}
        </div>
        ${this._renderList()}
      </section>
    `;
	}
	_renderList() {
		return this._viewState === "ready" ? this._entries.length === 0 ? b`<p class="notice">No stored workflows. Use "Save as workflow" in the editor above.</p>` : b`<div class="list" role="list" aria-label="Stored workflows">
      ${this._entries.map((e) => this._renderEntry(e))}
    </div>` : S;
	}
	_renderEntry(e) {
		let { workflow: t, status: n } = e, r = t.workflow_id, i = this._pending !== void 0, a = this._pending?.id === r ? this._pending.action : void 0, o = n.error === null ? n.active ? "active" : "inactive" : "error", s = n.error === "activation_failed" ? "Activation failed" : n.error === "cleanup_failed" ? "Cleanup pending" : n.error === "dry_run_required" ? "Dry run required" : n.active ? "Active" : t.enabled ? "Enabled, not active" : "Disabled", c = this._observation?.id === r ? this._observation.result : void 0;
		return b`
      <article class="card" role="listitem">
        <div class="card-header">
          <h3>${t.name}</h3>
          <span class="badge ${o}">${s}</span>
        </div>
        ${t.description ? b`<p class="meta">${t.description}</p>` : S}
        <p class="meta">
          ${t.triggers.length} trigger(s) · ${t.conditions.length} condition(s) ·
          ${t.steps.length} step(s)
        </p>
        <p class="meta">
          Observations ${n.observations} · Ignored events ${n.ignored_events} ·
          Listeners ${n.registrations}
        </p>
        <p class="meta">
          ${t.run_mode === "execute" ? b`Mode: <strong>execute</strong> — eligible outcomes run the steps and deliver notifications. Executions ${n.executions} · Failures ${n.execution_failures} · Skipped while busy ${n.skipped_busy}${n.execution_running ? " · running now" : ""}` : b`Mode: observe — outcomes are recorded; no step runs.`}
        </p>
        ${n.last_execution ? this._renderExecution(n.last_execution) : S}
        ${n.latest ? this._renderOutcome("Latest observation", n.latest) : S}
        ${c ? this._renderOutcome("Manual observation", c) : S}
        <div class="actions">
          <button
            type="button"
            ?disabled=${i}
            @click=${() => this._mutate({
			id: r,
			action: t.enabled ? "disable" : "enable"
		})}
          >
            ${a === "enable" || a === "disable" ? "Saving…" : t.enabled ? "Disable" : "Enable"}
          </button>
          <button
            type="button"
            ?disabled=${i || !n.active}
            @click=${() => this._mutate({
			id: r,
			action: "observe"
		})}
          >
            ${a === "observe" ? "Observing…" : "Observe now"}
          </button>
          <button type="button" ?disabled=${i} @click=${() => this._editInBuilder(e)}>
            Edit in builder
          </button>
          <button type="button" ?disabled=${i} @click=${() => this._loadIntoEditor(e)}>
            Load into editor
          </button>
          ${this._confirmDeleteId === r ? b`<button
                  class="danger"
                  type="button"
                  ?disabled=${i}
                  @click=${() => this._mutate({
			id: r,
			action: "delete"
		})}
                >
                  ${a === "delete" ? "Deleting…" : "Confirm delete"}
                </button>
                <button type="button" ?disabled=${i} @click=${() => {
			this._confirmDeleteId = void 0;
		}}>
                  Keep
                </button>` : b`<button
                class="danger"
                type="button"
                ?disabled=${i}
                @click=${() => {
			this._confirmDeleteId = r;
		}}
              >
                Delete
              </button>`}
        </div>
      </article>
    `;
	}
	_renderExecution(e) {
		let t = e.steps.map((e) => `${e.step_id}: ${e.status}${e.target ? ` (${e.target})` : ""}${e.error ? ` — ${e.error}` : ""}`).join(" · ");
		return b`<p class="meta">
      Last execution: ${e.completed ? "completed" : `failed (${e.error ?? "unknown"})`} ·
      provider calls ${e.provider_calls} · notifications delivered ${e.actions_executed}
      ${t ? b`<br />${t}` : S}
    </p>`;
	}
	_renderOutcome(e, t) {
		return b`<p class="meta">
      ${e}: triggered ${t.triggered ? "yes" : "no"} · conditions
      ${t.conditions_passed ? "passed" : "failed"} ·
      ${t.eligible ? `${t.planned_steps.length} step(s) planned, none executed` : "no steps planned"}
    </p>`;
	}
};
customElements.define(Cr, Tr);
//#endregion
//#region src/panel/activity-view.ts
var Er = class extends D {
	static properties = {
		hass: { attribute: !1 },
		_entries: { state: !0 },
		_state: { state: !0 },
		_store: { state: !0 }
	};
	static styles = o`
    :host { display: block; color: var(--primary-text-color, #233642); }
    * { box-sizing: border-box; }
    h1 { font-size: 1.6rem; } h2 { font-size: 1.1rem; }
    p, li { line-height: 1.6; }
    .cards { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); }
    article { border: 1px solid var(--divider-color, #ccd9da); border-radius: 12px; padding: 16px; background: var(--card-background-color, white); overflow-wrap: anywhere; min-width: 0; }
    button { font: inherit; color: inherit; background: var(--card-background-color, white); border: 1px solid var(--divider-color, #ccd9da); border-radius: 8px; min-height: 44px; padding: 8px 16px; cursor: pointer; }
    button:focus-visible { outline: 3px solid var(--primary-color, #007a78); }
    button:disabled { opacity: .6; cursor: default; }
  `;
	_sequence = 0;
	_connection;
	_callWS;
	_userId;
	constructor() {
		super(), this._entries = [], this._state = "waiting", this._store = "not_loaded";
	}
	_reset = () => {
		this._sequence++, this._entries = [], this._state = "waiting", this._store = "not_loaded";
	};
	_ready = () => {
		this._load();
	};
	connectedCallback() {
		super.connectedCallback(), this._connection?.addEventListener("disconnected", this._reset), this._connection?.addEventListener("ready", this._ready), this._callWS && queueMicrotask(this._ready);
	}
	disconnectedCallback() {
		this._connection?.removeEventListener("disconnected", this._reset), this._connection?.removeEventListener("ready", this._ready), this._reset(), super.disconnectedCallback();
	}
	willUpdate(e) {
		e.has("hass") && (this._connection !== this.hass?.connection || this._callWS !== this.hass?.callWS || this._userId !== this.hass?.user?.id) && (this._connection?.removeEventListener("disconnected", this._reset), this._connection?.removeEventListener("ready", this._ready), this._reset(), this._connection = this.hass?.connection, this._callWS = this.hass?.callWS, this._userId = this.hass?.user?.id, this._connection?.addEventListener("disconnected", this._reset), this._connection?.addEventListener("ready", this._ready), queueMicrotask(this._ready));
	}
	async _load() {
		let e = this.hass;
		if (!e || !this.isConnected || e.connection?.connected === !1 || this._state === "loading") return;
		let t = ++this._sequence;
		this._state = "loading", this._entries = [];
		let n = () => t === this._sequence && this.isConnected && this.hass?.callWS === e.callWS && this.hass?.connection === e.connection && this.hass?.user?.id === e.user?.id;
		try {
			let t = await I(e);
			if (!n()) return;
			this._entries = t.workflows, this._store = t.store, this._state = "ready";
		} catch {
			if (!n()) return;
			this._state = "error";
		}
	}
	render() {
		return b`
      <h1>Activity &amp; Security</h1>
      <p>Latest workflow results from Home Assistant. Notification success means Home Assistant accepted the call; check the phone to confirm receipt.</p>
      <p>These counters and last-run records are temporary and may reset when workflows are changed or Home Assistant restarts. Prompts, generated messages, and household state are not displayed here.</p>
      <button @click=${this._ready} ?disabled=${this._state === "loading"}>Refresh activity</button>
      <div role="status" aria-live="polite">
        ${this._state === "waiting" ? b`<p>Waiting for Home Assistant.</p>` : S}
        ${this._state === "loading" ? b`<p>Loading activity…</p>` : S}
        ${this._state === "error" ? b`<p>Activity could not be loaded. Check your connection and administrator access, then refresh.</p>` : S}
        ${this._state === "ready" && this._store !== "ready" ? b`<p>Workflow storage is unavailable. No activity can be verified.</p>` : S}
        ${this._state === "ready" && this._store === "ready" && this._entries.length === 0 ? b`<p>No stored workflows yet.</p>` : S}
      </div>
      ${this._state === "ready" && this._store === "ready" ? b`<div class="cards">${this._entries.map(({ workflow: e, status: t }) => b`
        <article aria-label=${e.name}>
          <h2>${e.name}</h2>
          <p>${t.active ? "Active" : "Inactive"} · ${e.run_mode === "execute" ? "Execute mode" : "Observe only"}${t.execution_running ? " · Running" : ""}</p>
          <p>Runs: ${t.executions} · Failures: ${t.execution_failures} · Skipped while busy: ${t.skipped_busy}</p>
          ${t.error ? b`<p>Workflow needs attention: ${t.error}</p>` : S}
          ${t.last_execution ? b`
            <p>Last run: ${t.last_execution.completed ? "Completed" : "Failed"}</p>
            <p>Started: ${t.last_execution.started_at}${t.last_execution.finished_at ? b`<br>Finished: ${t.last_execution.finished_at}` : S}</p>
            <p>Provider calls: ${t.last_execution.provider_calls} · Successful notification calls: ${t.last_execution.actions_executed}</p>
            ${t.last_execution.error ? b`<p>Failure code: ${t.last_execution.error}</p>` : S}
            <ol aria-label="Execution steps">${t.last_execution.steps.map((e) => b`<li>${e.step_id}: ${e.status}${e.target ? b` (${e.target})` : S}</li>`)}</ol>
          ` : b`<p>No execution recorded in this runtime.</p>`}
        </article>
      `)}</div>` : S}
    `;
	}
};
customElements.get("ai-orchestrator-activity") || customElements.define("ai-orchestrator-activity", Er);
//#endregion
//#region src/api/audit-client.ts
var Dr = {
	light_turn_on_v1: ["action", "medium"],
	light_turn_off_v1: ["action", "medium"],
	switch_turn_on_v1: ["action", "high"],
	switch_turn_off_v1: ["action", "high"],
	media_play_v1: ["action", "medium"],
	media_pause_v1: ["action", "medium"],
	media_volume_v1: ["action", "medium"],
	workflow_run: ["workflow", null],
	notify: ["notification", null]
}, Or = /* @__PURE__ */ new Set([
	"not_authorized",
	"invalid_request",
	"provider_unavailable",
	"provider_failed",
	"invalid_output",
	"target_unavailable",
	"cancelled",
	"timeout",
	"dispatch_unknown",
	"interrupted",
	"storage_failure"
]), kr = [
	"sequence",
	"audit_id",
	"parent_id",
	"kind",
	"phase",
	"created_at",
	"updated_at",
	"operation",
	"risk",
	"step_index",
	"provider_calls",
	"actions_attempted",
	"service_returns",
	"error_code",
	"counts_final"
];
function Q() {
	throw Error("Invalid audit metadata");
}
function Ar(e, t) {
	return (!e || typeof e != "object" || Array.isArray(e) || Object.keys(e).length !== t.length || t.some((t) => !Object.hasOwn(e, t))) && Q(), e;
}
function $(e, t, n) {
	return typeof e == "number" && Number.isSafeInteger(e) && e >= t && e <= n;
}
function jr(e) {
	return typeof e == "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(e);
}
function Mr(e) {
	if (typeof e != "string" || e.startsWith("0000") || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{6})?\+00:00$/.test(e)) return !1;
	let t = new Date(e);
	return Number.isFinite(t.getTime()) && t.toISOString().slice(0, 19) === e.slice(0, 19);
}
function Nr(e) {
	return e.length === 25 ? e.slice(0, 19) + ".000000" : e.slice(0, 26);
}
function Pr(e) {
	let t = Ar(e, kr);
	(!$(t.sequence, 1, 2 ** 53 - 1) || !jr(t.audit_id) || t.parent_id !== null && !jr(t.parent_id) || t.parent_id === t.audit_id || typeof t.operation != "string" || !Object.hasOwn(Dr, t.operation) || typeof t.phase != "string" || ![
		"requested",
		"authorized",
		"started",
		"committed",
		"failed",
		"unknown"
	].includes(t.phase) || !Mr(t.created_at) || !Mr(t.updated_at) || Nr(t.updated_at) < Nr(t.created_at) || t.step_index !== null && !$(t.step_index, 0, 63) || !$(t.provider_calls, 0, 64) || !$(t.actions_attempted, 0, 64) || !$(t.service_returns, 0, 64) || t.service_returns > t.actions_attempted || typeof t.counts_final != "boolean" || t.error_code !== null && (typeof t.error_code != "string" || !Or.has(t.error_code))) && Q();
	let [n, r] = Dr[t.operation];
	return (t.kind !== n || t.risk !== r || t.counts_final !== ["committed", "failed"].includes(t.phase) || t.error_code !== null !== ["failed", "unknown"].includes(t.phase) || ["requested", "authorized"].includes(t.phase) && (t.actions_attempted !== 0 || t.provider_calls !== 0) || ["committed", "failed"].includes(t.phase) && t.actions_attempted !== t.service_returns) && Q(), { ...t };
}
async function Fr(e, t = 0, n = 100) {
	(!$(t, 0, 2 ** 53 - 1) || !$(n, 1, 100)) && Q();
	let r = Ar(await e.callWS({
		type: "ai_orchestrator/audit/list",
		after_sequence: t,
		limit: n
	}), [
		"schema_version",
		"retention_days",
		"records",
		"next_cursor"
	]);
	(r.schema_version !== 1 || r.retention_days !== 90 || !Array.isArray(r.records) || r.records.length > n) && Q();
	let i = r.records.map(Pr), a = t, o = /* @__PURE__ */ new Set();
	for (let e of i) (e.sequence <= a || o.has(e.audit_id)) && Q(), a = e.sequence, o.add(e.audit_id);
	return r.next_cursor !== null && (!$(r.next_cursor, 1, 2 ** 53 - 1) || !i.length || r.next_cursor !== a) && Q(), {
		records: i,
		next_cursor: r.next_cursor
	};
}
//#endregion
//#region src/panel/audit-view.ts
var Ir = {
	light_turn_on_v1: "Turn light on",
	light_turn_off_v1: "Turn light off",
	switch_turn_on_v1: "Turn switch on",
	switch_turn_off_v1: "Turn switch off",
	media_play_v1: "Play media",
	media_pause_v1: "Pause media",
	media_volume_v1: "Set media volume",
	workflow_run: "Workflow run",
	notify: "Notification"
}, Lr = class extends D {
	static properties = {
		hass: { attribute: !1 },
		_rows: { state: !0 },
		_state: { state: !0 },
		_cursor: { state: !0 }
	};
	static styles = o`
    :host { display: block; color: var(--primary-text-color, #233642); }
    * { box-sizing: border-box; }
    p, li { line-height: 1.6; overflow-wrap: anywhere; }
    ol { padding: 0; list-style: none; display: grid; gap: 12px; }
    li { border: 1px solid var(--divider-color, #ccd9da); border-radius: 10px; padding: 16px; min-width: 0; }
    h2 { font-size: 1.2rem; } h3 { font-size: 1rem; }
    button { font: inherit; color: inherit; background: var(--card-background-color, white); border: 1px solid var(--divider-color, #ccd9da); border-radius: 8px; padding: 8px 16px; min-height: 44px; cursor: pointer; }
    button:focus-visible { outline: 3px solid var(--primary-color, #007a78); }
    button:disabled { opacity: .6; cursor: default; }
  `;
	_sequence = 0;
	_connection;
	_callWS;
	_userId;
	constructor() {
		super(), this._rows = [], this._state = "waiting", this._cursor = null;
	}
	_reset = () => {
		this._sequence++, this._rows = [], this._cursor = null, this._state = "waiting";
	};
	_refresh = () => {
		this._load(!1);
	};
	connectedCallback() {
		super.connectedCallback(), this._connection?.addEventListener("disconnected", this._reset), this._connection?.addEventListener("ready", this._refresh), this._callWS && queueMicrotask(this._refresh);
	}
	disconnectedCallback() {
		this._connection?.removeEventListener("disconnected", this._reset), this._connection?.removeEventListener("ready", this._refresh), this._reset(), super.disconnectedCallback();
	}
	willUpdate(e) {
		e.has("hass") && (this._connection !== this.hass?.connection || this._callWS !== this.hass?.callWS || this._userId !== this.hass?.user?.id) && (this._connection?.removeEventListener("disconnected", this._reset), this._connection?.removeEventListener("ready", this._refresh), this._reset(), this._connection = this.hass?.connection, this._callWS = this.hass?.callWS, this._userId = this.hass?.user?.id, this._connection?.addEventListener("disconnected", this._reset), this._connection?.addEventListener("ready", this._refresh), queueMicrotask(this._refresh));
	}
	async _load(e) {
		let t = this.hass;
		if (!t || !this.isConnected || t.connection?.connected === !1 || this._state === "loading" || e && (this._cursor === null || this._rows.length >= 4096)) return;
		let n = ++this._sequence, r = t.user?.id, i = e ? this._cursor : 0;
		e || (this._rows = [], this._cursor = null), this._state = "loading";
		let a = () => n === this._sequence && this.isConnected && this.hass?.callWS === t.callWS && this.hass?.connection === t.connection && this.hass?.user?.id === r && this.hass?.connection?.connected !== !1;
		try {
			let e = await Fr(t, i, Math.min(100, 4096 - this._rows.length));
			if (!a()) return;
			let n = new Set(this._rows.map((e) => e.audit_id));
			if (e.records.some((e) => n.has(e.audit_id))) throw Error("Duplicate audit metadata");
			this._rows = [...this._rows, ...e.records], this._cursor = e.next_cursor, this._state = "ready";
		} catch {
			if (!a()) return;
			this._rows = [], this._cursor = null, this._state = "error";
		}
	}
	render() {
		return b`
      <h2>Durable action history</h2>
      <p>Confirmed device-action metadata is retained for up to 90 days, within a 4096-record limit. Workflows are not recorded here yet. No household identifiers or message content are shown.</p>
      <p>Committed means the service call returned; it does not confirm a physical device change. Unknown means the result is uncertain and must be checked before trying again. Non-final counts may be incomplete.</p>
      <button @click=${this._refresh} ?disabled=${this._state === "loading"}>Refresh history</button>
      <div role="status" aria-live="polite">
        ${this._state === "waiting" ? b`<p>Waiting for Home Assistant.</p>` : S}
        ${this._state === "loading" ? b`<p>Loading audit history…</p>` : S}
        ${this._state === "error" ? b`<p>Audit history is unavailable. Check your connection, administrator access and integration storage, then refresh.</p>` : S}
        ${this._state === "ready" && !this._rows.length ? b`<p>No retained action history.</p>` : S}
      </div>
      <ol aria-label="Audit records">${this._rows.map((e) => b`<li>
        <h3>${Ir[e.operation]}</h3>
        <p>Stage: ${e.phase}. Counts: ${e.counts_final ? "final" : "not final"}.</p>
        <p>Created: <time datetime=${e.created_at}>${e.created_at}</time><br>Updated: <time datetime=${e.updated_at}>${e.updated_at}</time></p>
        <p>Provider calls: ${e.provider_calls} · Actions attempted: ${e.actions_attempted} · Service returns: ${e.service_returns}</p>
        ${e.error_code ? b`<p>Reason: ${e.error_code}</p>` : S}
      </li>`)}</ol>
      ${this._cursor !== null && this._rows.length < 4096 ? b`<button @click=${() => {
			this._load(!0);
		}} ?disabled=${this._state === "loading"}>Load more history</button>` : S}
      ${this._rows.length >= 4096 ? b`<p>Display limit reached. Refresh to read current retained history.</p>` : S}
    `;
	}
};
customElements.get("ai-orchestrator-audit") || customElements.define("ai-orchestrator-audit", Lr);
//#endregion
//#region src/panel/workflow-draft-view.ts
var Rr = {
	draft_invalid_result: "The provider returned an unsupported or oversized result. Try a shorter draft request.",
	draft_invalid_json: "The provider did not return valid JSON. Ask for a simpler workflow or use the visual builder.",
	draft_invalid_fields: "The draft has missing or unsupported top-level fields. Retry with a simpler request or use the visual builder.",
	draft_invalid_schema: "The draft contains an invalid trigger, condition or step. Simplify the workflow or use the visual builder.",
	draft_invalid_references: "The draft refers to entities or notification targets outside your selection. Check your selections and retry.",
	draft_invalid_notify_order: "The draft tries to notify before composing a message. Ask it to compose the message before notification.",
	draft_provider_failed: "The local provider could not complete the request. Check its model and status, then simplify the request or use the visual builder.",
	draft_timeout: "The local provider took too long to create a draft. Try a shorter request or use the visual builder.",
	draft_provider_unavailable: "The selected local provider is unavailable or changed. Reload draft options and select an available provider.",
	draft_invalid_selection: "A selected entity or notification target is unavailable. Reload draft options and check your selections.",
	draft_invalid_response: "The local provider did not produce a valid workflow draft. Simplify the request or use the visual builder.",
	draft_source_changed: "The source workflow changed or its references are not selected. Reload draft options, reselect the source and review its targets.",
	draft_source_unavailable: "The source workflow is unavailable or the draft size limit was exceeded. Choose a smaller source or request, or use the visual builder.",
	draft_busy: "Another draft is still running. Wait for it to finish before trying again.",
	draft_cancelled: "Draft generation was cancelled. Reload draft options and submit again when ready.",
	unauthorized: "Administrator access is required. Reconnect with an administrator account.",
	not_loaded: "AI Orchestrator is not loaded. Check the integration, then reload draft options."
};
function zr(e, t) {
	let n;
	try {
		typeof e == "object" && e && !Array.isArray(e) && (n = Object.getOwnPropertyDescriptor(e, "code")?.value);
	} catch {
		return t;
	}
	return typeof n == "string" && n.length <= 64 && Object.hasOwn(Rr, n) ? Rr[n] : t;
}
var Br = class extends D {
	static properties = {
		hass: { attribute: !1 },
		_providers: { state: !0 },
		_entities: { state: !0 },
		_targets: { state: !0 },
		_provider: { state: !0 },
		_entity: { state: !0 },
		_selected: { state: !0 },
		_prompt: { state: !0 },
		_busy: { state: !0 },
		_message: { state: !0 },
		_draft: { state: !0 },
		_sources: { state: !0 },
		_sourceId: { state: !0 },
		_source: { state: !0 }
	};
	static styles = o`
    :host { display:block; margin-bottom:24px; color:var(--primary-text-color,#233642); }
    section { border:1px solid var(--divider-color,#ccd); border-radius:12px; padding:20px; }
    h2 { margin-top:0; } p { line-height:1.6; }
    label { display:block; margin:12px 0; overflow-wrap:anywhere; }
    input,select,textarea,button { box-sizing:border-box; font:inherit; color:inherit; }
    select,input[list],textarea { width:100%; background:var(--card-background-color,white); min-height:44px; }
    textarea { min-height:90px; } button { min-height:44px; margin:8px 8px 0 0; }
    .targets { max-height:240px; overflow:auto; } pre { white-space:pre-wrap; overflow-wrap:anywhere; }
  `;
	_sequence = 0;
	_socket;
	_user;
	_call;
	constructor() {
		super(), this._providers = [], this._entities = [], this._targets = [], this._provider = "", this._entity = "", this._selected = [], this._prompt = "", this._busy = !1, this._message = "", this._sources = [], this._sourceId = "";
	}
	_reset = () => {
		this._sequence++, this._providers = [], this._entities = [], this._targets = [], this._provider = "", this._entity = "", this._selected = [], this._prompt = "", this._busy = !1, this._message = "", this._draft = void 0, this._sources = [], this._sourceId = "", this._source = void 0;
	};
	_ready = () => {
		this._load();
	};
	disconnectedCallback() {
		this._socket?.removeEventListener("disconnected", this._reset), this._socket?.removeEventListener("ready", this._ready), this._reset(), this._call = void 0, super.disconnectedCallback();
	}
	willUpdate(e) {
		e.has("hass") && (this._socket !== this.hass?.connection || this._user !== this.hass?.user?.id || this._call !== this.hass?.callWS) && (this._socket?.removeEventListener("disconnected", this._reset), this._socket?.removeEventListener("ready", this._ready), this._reset(), this._socket = this.hass?.connection, this._user = this.hass?.user?.id, this._call = this.hass?.callWS, this._socket?.addEventListener("disconnected", this._reset), this._socket?.addEventListener("ready", this._ready), queueMicrotask(this._ready));
	}
	async _load() {
		if (!this.hass || this.hass.connection?.connected === !1) return;
		this._reset();
		let e = ++this._sequence;
		this._busy = !0;
		try {
			let [t, n, r, i] = await Promise.all([
				W(this.hass),
				V(this.hass),
				Bn(this.hass),
				I(this.hass)
			]);
			if (e !== this._sequence || !this.isConnected) return;
			this._providers = t.providers, this._provider = t.providers[0]?.connection_id ?? "", this._entities = n.entities.filter((e) => !e.disabled), this._targets = r, this._sources = i.store === "ready" ? i.workflows.map((e) => e.workflow) : [];
		} catch {
			e === this._sequence && (this._message = "Draft setup could not load. Check administrator access and reload.");
		} finally {
			e === this._sequence && (this._busy = !1);
		}
	}
	async _generate() {
		if (!this.hass || this._busy || !this._valid()) return;
		let e = ++this._sequence;
		this._busy = !0, this._draft = void 0, this._message = "";
		try {
			let t = await Kn(this.hass, this._provider, this._prompt, this._entityIds(), this._selected, this._source);
			if (e !== this._sequence || !this.isConnected) return;
			this._draft = t, this._message = this._source ? "Refined copy ready. The source workflow is unchanged. Review the new draft, save disabled, then dry run before enabling." : "Draft ready. Review it, save disabled, then dry run before enabling.";
		} catch (t) {
			e === this._sequence && (this._message = `${zr(t, "The draft request failed. Check your Home Assistant and local provider connections, then retry or use the visual builder.")} Nothing was saved or enabled.`);
		} finally {
			e === this._sequence && (this._busy = !1);
		}
	}
	_valid() {
		return !!this._provider && !!this._prompt.trim() && (!this._sourceId || !!this._source) && this._entityIds().length <= 8 && this._entityIds().every((e) => this._entities.some((t) => t.entity_id === e)) && this._selected.length <= 8 && this._selected.every((e) => this._targets.some((t) => t.reference === e)) && (this._source?.notify_targets.every((e) => this._selected.includes(e)) ?? !0);
	}
	_entityIds() {
		return [.../* @__PURE__ */ new Set([...this._source?.entity_ids ?? [], ...this._entity ? [this._entity] : []])];
	}
	async _chooseSource(e) {
		if (!this.hass || this._busy || this.hass.connection?.connected === !1) return;
		let t = ++this._sequence;
		if (this._draft = void 0, this._source = void 0, this._sourceId = e, this._entity = "", this._selected = [], this._prompt = "", this._message = "", e && this._sources.some((t) => t.workflow_id === e)) {
			this._busy = !0;
			try {
				let n = await Gn(this.hass, e);
				if (t !== this._sequence || !this.isConnected) return;
				this._source = n, this._selected = [...n.notify_targets];
			} catch (e) {
				t === this._sequence && (this._message = zr(e, "This source cannot be refined. Reload workflows or choose another source."));
			} finally {
				t === this._sequence && (this._busy = !1);
			}
		}
	}
	render() {
		return b`<section aria-label="Create a workflow with AI" aria-busy=${this._busy}>
      <h2>Create a workflow with AI</h2>
      <p>${this._source ? "Refine the selected workflow into a new draft using the source content disclosed below." : "Describe a notification workflow. The local model receives your request and only the entity and notification identifiers you select below."} No current state is sent. Generated drafts never save or enable themselves.</p>
      <label>Starting point<select .value=${this._sourceId} ?disabled=${this._busy} @change=${(e) => void this._chooseSource(e.target.value)}><option value="">Create a new workflow</option>${this._sources.map((e) => b`<option value=${e.workflow_id}>Refine a copy of ${e.name}</option>`)}</select></label>
      ${this._source ? b`<p>Refine a new copy of <strong>${this._source.workflow.name}</strong>. Its name, description, triggers, conditions, prompts, steps and selected references will be sent to the local provider with your instructions. The existing workflow remains unchanged.</p>
        <details><summary>Review source sent to local AI</summary><pre>${JSON.stringify({
			name: this._source.workflow.name,
			description: this._source.workflow.description,
			triggers: this._source.workflow.triggers,
			conditions: this._source.workflow.conditions,
			steps: this._source.workflow.steps
		}, null, 2)}</pre></details>
        <p>Source entity references: ${this._source.entity_ids.length ? this._source.entity_ids.join(", ") : "None"}</p>
        <p>Source notification references: ${this._source.notify_targets.length ? this._source.notify_targets.join(", ") : "None"}</p>
        <p>Keep all source references selected for refinement. Unavailable references must be repaired in the source before generating a copy.</p>` : S}
      <label>Draft provider<select .value=${this._provider} ?disabled=${this._busy} @change=${(e) => {
			this._provider = e.target.value, this._draft = void 0;
		}}>${this._providers.map((e) => b`<option value=${e.connection_id}>${e.title}</option>`)}</select></label>
      <label>${this._source ? "Additional entity the copy may use (optional)" : "Entity the draft may use (optional)"}<input list="draft-entities" .value=${this._entity} ?disabled=${this._busy} @input=${(e) => {
			this._entity = e.target.value, this._draft = void 0;
		}}></label>
      <datalist id="draft-entities">${this._entities.map((e) => b`<option value=${e.entity_id}>${e.name ?? e.entity_id}</option>`)}</datalist>
      <fieldset ?disabled=${this._busy}><legend>Notification targets the draft may use (up to 8)</legend><div class="targets">${this._targets.map((e) => b`<label><input type="checkbox" .checked=${this._selected.includes(e.reference)} ?disabled=${!this._selected.includes(e.reference) && this._selected.length >= 8} @change=${(t) => {
			this._selected = t.target.checked ? [...this._selected, e.reference] : this._selected.filter((t) => t !== e.reference), this._draft = void 0;
		}}>${e.name} (${e.kind})</label>`)}</div></fieldset>
      <label>${this._source ? "What should change in the copy?" : "What should happen?"}<textarea maxlength="4000" .value=${this._prompt} ?disabled=${this._busy} @input=${(e) => {
			this._prompt = e.target.value, this._draft = void 0;
		}}></textarea></label>
      <button ?disabled=${this._busy || !this._valid()} @click=${() => void this._generate()}>${this._source ? "Generate refined copy" : "Generate draft"}</button>
      <button ?disabled=${this._busy} @click=${this._ready}>Reload draft options</button>
      <p role="status">${this._message}</p>
      ${this._draft ? b`<h3>${this._draft.name}</h3><p>${this._draft.description}</p><details><summary>Review generated workflow</summary><pre>${JSON.stringify(this._draft, null, 2)}</pre></details>
        <button @click=${() => this.dispatchEvent(new CustomEvent("generated-workflow", {
			bubbles: !0,
			composed: !0,
			detail: { json: JSON.stringify(this._draft, null, 2) }
		}))}>Review in workflow editor</button>` : S}
    </section>`;
	}
};
customElements.define("ai-orchestrator-workflow-draft", Br);
//#endregion
//#region src/panel/action-controls-view.ts
var Vr = class extends D {
	static properties = {
		hass: { attribute: !1 },
		mode: {},
		_providers: { state: !0 },
		_connection: { state: !0 },
		_catalog: { state: !0 },
		_scopes: { state: !0 },
		_tool: { state: !0 },
		_target: { state: !0 },
		_volume: { state: !0 },
		_query: { state: !0 },
		_busy: { state: !0 },
		_message: { state: !0 },
		_proposal: { state: !0 },
		_prompt: { state: !0 },
		_switchTarget: { state: !0 },
		_review: { state: !0 },
		_attestations: { state: !0 }
	};
	static styles = o`
    :host{display:block;margin-bottom:24px} section{padding:20px;border:1px solid var(--divider-color,#ccd);border-radius:12px;min-width:0}
    label{display:block;margin:10px 0;overflow-wrap:anywhere} select,input[type=search],input[type=number],textarea{display:block;width:100%;box-sizing:border-box;background:var(--card-background-color,#fff);color:inherit} textarea{font:inherit;min-height:80px}
    button,select,input{font:inherit;min-height:44px;max-width:100%} button{margin:8px 8px 0 0} .choices{max-height:280px;overflow:auto} small{display:block} p,dd{overflow-wrap:anywhere} dd{margin:0 0 10px} dt{font-weight:bold} .proposal{margin-top:16px}
  `;
	_reviewTimer;
	_generation = 0;
	_identity;
	_callWS;
	_socket;
	_timer;
	_offline = () => this._clear();
	_ready = () => {
		this._load();
	};
	constructor() {
		super(), this._switchTarget = "", this._attestations = [
			!1,
			!1,
			!1
		], this.mode = "all", this._prompt = "", this._providers = [], this._connection = "", this._scopes = [], this._tool = "", this._target = "", this._volume = "", this._query = "", this._busy = !1, this._message = "";
	}
	_clearReview() {
		clearTimeout(this._reviewTimer), this._reviewTimer = void 0, this._review = void 0, this._attestations = [
			!1,
			!1,
			!1
		];
	}
	_clearProposal() {
		clearTimeout(this._timer), this._timer = void 0, this._proposal = void 0, this._clearReview();
	}
	_clear() {
		this._generation++, this._clearProposal(), this._prompt = "", this._switchTarget = "", this._providers = [], this._catalog = void 0, this._connection = "", this._scopes = [], this._tool = "", this._target = "", this._volume = "", this._query = "", this._busy = !1, this._message = "";
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._clear(), this._identity = void 0, this._socket?.removeEventListener("disconnected", this._offline), this._socket?.removeEventListener("ready", this._ready), this._socket = void 0;
	}
	willUpdate(e) {
		if (e.has("mode") && this._clearProposal(), !e.has("hass")) return;
		let t = this.hass?.user?.id ?? "unknown";
		(!this.hass || t !== this._identity || this.hass.connection !== this._socket || this.hass.callWS !== this._callWS) && (this._socket?.removeEventListener("disconnected", this._offline), this._socket?.removeEventListener("ready", this._ready), this._clear(), this._identity = this.hass ? t : void 0, this._socket = this.hass?.connection, this._callWS = this.hass?.callWS, this._socket?.addEventListener("disconnected", this._offline), this._socket?.addEventListener("ready", this._ready), this.hass && this._load());
	}
	_online() {
		return !!this.hass && this.hass.connection?.connected !== !1 && this.isConnected;
	}
	async _load() {
		if (!this._online()) return;
		this._clear();
		let e = this._generation;
		this._busy = !0;
		try {
			let t = await W(this.hass);
			if (e !== this._generation || !this._online()) return;
			this._providers = t.providers, this._busy = !1, t.providers[0] && await this._choose(t.providers[0].connection_id);
		} catch {
			e === this._generation && (this._message = "Action controls could not be loaded. Reload to try again.");
		} finally {
			e === this._generation && (this._busy = !1);
		}
	}
	async _choose(e) {
		if (!this._online() || this._busy) return;
		let t = ++this._generation;
		this._clearProposal(), this._catalog = void 0, this._scopes = [], this._tool = "", this._target = "", this._volume = "", this._message = "", this._connection = e, this._busy = !0, this._prompt = "", this._switchTarget = "";
		try {
			let n = await Dn(this.hass, e);
			if (t !== this._generation || !this._online()) return;
			this._catalog = n, this._scopes = structuredClone(n.profile.action_scopes), this._tool = n.tools[0]?.tool_id ?? "";
		} catch {
			t === this._generation && (this._message = "Action permissions are unavailable. Reload before trying again.");
		} finally {
			t === this._generation && (this._busy = !1);
		}
	}
	_toggle(e, t) {
		if (!this._tool || this._busy) return;
		this._clearProposal();
		let n = this._scopes.find((e) => e.tool_id === this._tool)?.registry_ids ?? [], r = t ? [.../* @__PURE__ */ new Set([...n, e])] : n.filter((t) => t !== e);
		this._scopes = this._scopes.filter((e) => e.tool_id !== this._tool), r.length && (this._scopes = [...this._scopes, {
			tool_id: this._tool,
			registry_ids: r
		}]);
	}
	_dirty() {
		return JSON.stringify(this._scopes) !== JSON.stringify(this._catalog?.profile.action_scopes ?? []);
	}
	async _save() {
		if (!this._online() || this._busy || !this._catalog) return;
		let e = ++this._generation;
		this._clearProposal(), this._busy = !0, this._message = "";
		try {
			let t = await On(this.hass, {
				...this._catalog.profile,
				action_scopes: this._scopes
			});
			if (e !== this._generation || !this._online()) return;
			this._catalog = {
				...this._catalog,
				profile: t
			}, this._scopes = structuredClone(t.action_scopes), this._message = "Action permissions saved. Every action still requires separate confirmation.";
		} catch {
			e === this._generation && (this._message = "Permissions were not saved. Reload and review the current permissions.");
		} finally {
			e === this._generation && (this._busy = !1);
		}
	}
	async _propose() {
		let e = this._catalog?.tools.find((e) => e.tool_id === this._tool), t = e?.targets.find((e) => e.registry_id === this._target);
		if (!this._online() || this._busy || !this._catalog || !e || !t || this._dirty()) return;
		let n = ++this._generation;
		this._clearProposal(), this._busy = !0, this._message = "";
		try {
			let r = e.arguments === "volume" ? { volume_level: Number(this._volume) } : {};
			if (e.arguments === "volume" && !this._volume.trim()) throw Error("Volume required");
			let i = await jn(this.hass, this._catalog.profile, e, t, r);
			if (n !== this._generation || !this._online()) return;
			this._proposal = i, this._timer = setTimeout(() => {
				this._clearProposal(), this._message = "This confirmation expired. Review a new proposal before acting.";
			}, i.expires_in * 1e3);
		} catch {
			n === this._generation && (this._message = "The action could not be proposed. Reload permissions and review the target.");
		} finally {
			n === this._generation && (this._busy = !1);
		}
	}
	async _confirm() {
		if (!this._online() || this._busy || !this._proposal) return;
		let e = this._proposal, t = ++this._generation;
		this._clearProposal(), this._busy = !0, this._message = "";
		try {
			let n = await Pn(this.hass, e);
			if (t !== this._generation || !this._online()) return;
			this._message = n === "completed" ? "Home Assistant accepted the action. Check the device to verify its physical result." : "The action outcome is unknown. Check the device before considering another action.";
		} catch {
			t === this._generation && (this._message = "The action was not confirmed or its outcome is unknown. Check the device before trying another action.");
		} finally {
			t === this._generation && (this._busy = !1);
		}
	}
	async _interpret() {
		if (!this._online() || this._busy || !this._catalog || this._dirty() || !this._prompt.trim()) return;
		let e = ++this._generation;
		this._clearProposal(), this._busy = !0, this._message = "";
		try {
			let t = await Nn(this.hass, this._catalog, this._prompt);
			if (e !== this._generation || !this._online()) return;
			this._proposal = t, this._timer = setTimeout(() => {
				this._clearProposal(), this._message = "This confirmation expired. Review a new proposal before acting.";
			}, t.expires_in * 1e3);
		} catch {
			e === this._generation && (this._message = "AI could not propose a permitted action. Review the request and permissions; no confirmation was sent.");
		} finally {
			e === this._generation && (this._busy = !1);
		}
	}
	async _previewSwitch() {
		let e = this._catalog?.switch_candidates.find((e) => e.registry_id === this._switchTarget);
		if (!this._online() || this._busy || !this._catalog || !e || this._dirty()) return;
		let t = ++this._generation;
		this._clearProposal(), this._busy = !0, this._message = "";
		try {
			let n = await kn(this.hass, this._catalog.profile, e);
			if (t !== this._generation || !this._online()) return;
			this._review = n, this._reviewTimer = setTimeout(() => {
				this._clearReview(), this._message = "Switch review expired. Inspect the current target again.";
			}, n.expires_in * 1e3);
		} catch {
			t === this._generation && (this._message = "Switch review is unavailable. Reload and inspect the current target.");
		} finally {
			t === this._generation && (this._busy = !1);
		}
	}
	async _saveSwitchReview(e) {
		let t = this._review;
		if (!this._online() || this._busy || !this._catalog || this._dirty() || !e && (!t || !this._attestations.every(Boolean))) return;
		let n = ++this._generation, r = this._connection;
		this._clearProposal(), this._busy = !0, this._message = "";
		try {
			if (await An(this.hass, this._catalog.profile, e ?? t.registry_id, e ? void 0 : t), n !== this._generation || !this._online()) return;
			this._busy = !1, await this._choose(r), this._generation === n + 1 && this._connection === r && this._catalog && (this._message = e ? "Switch review revoked and its switch grants removed." : "Switch review saved. No action is granted yet. Select and save separate switch action permissions.");
		} catch {
			n === this._generation && (this._catalog = void 0, this._scopes = [], this._message = "Switch review was not verified. Reload current permissions before continuing.");
		} finally {
			n === this._generation && (this._busy = !1);
		}
	}
	render() {
		let e = this._catalog?.tools.find((e) => e.tool_id === this._tool), t = this._scopes.find((e) => e.tool_id === this._tool)?.registry_ids ?? [], n = this._catalog?.profile.action_scopes.find((e) => e.tool_id === this._tool)?.registry_ids ?? [], r = this._scopes.reduce((e, t) => e + t.registry_ids.length, 0), i = e?.targets.filter((e) => `${e.name} ${e.entity_id}`.toLowerCase().includes(this._query.toLowerCase())) ?? [];
		return b`<section aria-label="Confirmed device actions" aria-busy=${this._busy}>
      <h2>${this.mode === "permissions" ? "Device action permissions" : "Confirmed device actions"}</h2>
      <p>Review an exact device action and confirm separately before Home Assistant sends it. Saved grants alone never execute an action.</p>
      <label>Action provider<select .value=${this._connection} ?disabled=${this._busy} @change=${(e) => {
			this._choose(e.target.value);
		}}>${this._providers.map((e) => b`<option value=${e.connection_id}>${e.title}</option>`)}</select></label>
      <label>Device action<select .value=${this._tool} ?disabled=${this._busy || !this._catalog} @change=${(e) => {
			this._clearProposal(), this._tool = e.target.value, this._target = "", this._volume = "";
		}}>${this._catalog?.tools.map((e) => b`<option value=${e.tool_id}>${e.label}</option>`)}</select></label>
      ${this.mode === "control" ? S : b`
        <h3>Review ordinary switches</h3>
        <p>Inspect the physical device before classifying it. A switch name does not establish what it controls. Security, locks, doors, alarms, life-safety equipment and grouped targets are not eligible. Review saves no grants; each later switch action is high risk and requires separate confirmation.</p>
        <label>Switch to inspect<select .value=${this._switchTarget} ?disabled=${this._busy || this._dirty()} @change=${(e) => {
			this._clearProposal(), this._switchTarget = e.target.value;
		}}><option value="">Choose a switch</option>${this._catalog?.switch_candidates.map((e) => b`<option value=${e.registry_id}>${e.name} — ${e.entity_id} (${e.status})</option>`)}</select></label>
        <button ?disabled=${this._busy || this._dirty() || !this._catalog?.switch_candidates.some((e) => e.registry_id === this._switchTarget)} @click=${() => {
			this._previewSwitch();
		}}>Inspect switch review</button>
        ${this._review ? b`<section aria-label="Switch classification review"><h3>Verify this physical target</h3><dl><dt>Entity</dt><dd>${this._review.entity_id}</dd><dt>Device</dt><dd>${this._review.device_name}</dd><dt>Name</dt><dd>${this._review.name}</dd><dt>Classification</dt><dd>Ordinary, noncritical switch</dd></dl>
          ${[
			"I verified the physical target controlled by this switch.",
			"This controls one physical device, not a group or indirect automation.",
			"This is not security or life-safety equipment and cannot control a lock, door or alarm."
		].map((e, t) => b`<label><input type="checkbox" .checked=${this._attestations[t]} ?disabled=${this._busy} @change=${(e) => {
			this._attestations = this._attestations.map((n, r) => r === t ? e.target.checked : n);
		}}>${e}</label>`)}
          <p>Expires in five minutes. This review will remove any existing switch grants for this target.</p>
          <button ?disabled=${this._busy || !this._attestations.every(Boolean)} @click=${() => {
			this._saveSwitchReview();
		}}>Save switch review</button><button @click=${() => this._clearReview()}>Cancel switch review</button>
        </section>` : S}
        ${this._catalog?.profile.switch_reviews.length ? b`<h4>Saved switch reviews</h4><ul>${this._catalog.profile.switch_reviews.map((e) => b`<li>${this._catalog?.switch_candidates.find((t) => t.registry_id === e.registry_id)?.entity_id ?? "Unavailable reviewed switch"}<button ?disabled=${this._busy || this._dirty()} @click=${() => {
			this._saveSwitchReview(e.registry_id);
		}}>Revoke switch review</button></li>`)}</ul>` : S}
        ${this._dirty() ? b`<p>Save or reload your pending grants before reviewing a switch.</p>` : S}
        <label>Find action target<input type="search" .value=${this._query} @input=${(e) => {
			this._query = e.target.value;
		}}></label>
        <p>${r} of 64 action grants selected. An action grant is separate from observation permission.</p>
        <div class="choices">${i.slice(0, 100).map((e) => b`<label><input type="checkbox" .checked=${t.includes(e.registry_id)} ?disabled=${this._busy || !t.includes(e.registry_id) && r >= 64} @change=${(t) => this._toggle(e.registry_id, t.target.checked)}>${e.name}<small>${e.entity_id}</small></label>`)}</div>
        ${t.some((t) => !e?.targets.some((e) => e.registry_id === t)) ? b`<p>Some saved targets are unavailable. Clear all grants to revoke them.</p>` : S}
        <button ?disabled=${this._busy || !this._catalog} @click=${() => {
			this._clearProposal(), this._scopes = [];
		}}>Clear all action grants</button>
        <button ?disabled=${this._busy || !this._catalog} @click=${() => {
			this._save();
		}}>Save action permissions</button>
      `}
      ${this.mode === "permissions" ? S : b`
        <h3>Ask local AI to propose an action</h3><p>Your request and granted device names and IDs go to this local provider. Review the proposal before confirming; current device states are not sent to the model.</p>
        <label>Device request<textarea maxlength="4000" .value=${this._prompt} ?disabled=${this._busy} @input=${(e) => {
			this._clearProposal(), this._prompt = e.target.value;
		}}></textarea></label>
        <button ?disabled=${this._busy || !this._catalog?.profile.action_scopes.length || this._dirty() || !this._prompt.trim()} @click=${() => {
			this._interpret();
		}}>Ask AI to propose</button>
        <h3>Or choose the action directly</h3>
        <label>Granted device<select .value=${this._target} ?disabled=${this._busy || !this._catalog} @change=${(e) => {
			this._clearProposal(), this._target = e.target.value;
		}}><option value="">Choose a device</option>${e?.targets.filter((e) => n.includes(e.registry_id)).map((e) => b`<option value=${e.registry_id}>${e.name} — ${e.entity_id}</option>`)}</select></label>
        ${e?.arguments === "volume" ? b`<label>Volume (0 to 1)<input type="number" min="0" max="1" step="0.01" .value=${this._volume} ?disabled=${this._busy} @input=${(e) => {
			this._clearProposal(), this._volume = e.target.value;
		}}></label>` : S}
        ${n.length ? S : b`<p>No device is granted for this action. Save explicit grants in Entities & Permissions first.</p>`}
        <button ?disabled=${this._busy || !this._target || this._dirty()} @click=${() => {
			this._propose();
		}}>Review action</button>
        ${this._proposal ? b`<section class="proposal" aria-label="Action confirmation"><h3>Review before confirming</h3><dl><dt>Action</dt><dd>${xn[this._proposal.tool_id]}</dd><dt>Exact entity</dt><dd>${this._proposal.entity_id}</dd><dt>Current state</dt><dd>${this._proposal.state}</dd><dt>Arguments</dt><dd>${JSON.stringify(this._proposal.arguments)}</dd><dt>Risk</dt><dd>${this._proposal.risk}</dd></dl><p>Expires in five minutes. A changed state or permission requires a new proposal.</p><button ?disabled=${this._busy} @click=${() => {
			this._confirm();
		}}>Confirm this action</button><button @click=${() => this._clearProposal()}>Cancel proposal</button></section>` : S}
      `}
      <button ?disabled=${this._busy} @click=${() => {
			this._load();
		}}>Reload action permissions</button><p role="status">${this._message}</p>
    </section>`;
	}
};
customElements.define("ai-orchestrator-action-controls-view", Vr);
//#endregion
//#region src/panel/ai-orchestrator-panel.ts
var Hr = "ai-orchestrator-panel", Ur = [
	{
		id: "home",
		label: "Home"
	},
	{
		id: "automations",
		label: "Automations"
	},
	{
		id: "chat",
		label: "Chat"
	},
	{
		id: "providers",
		label: "Providers"
	},
	{
		id: "permissions",
		label: "Entities & Permissions"
	},
	{
		id: "voice",
		label: "Voice & Notifications"
	},
	{
		id: "activity",
		label: "Activity & Security"
	},
	{
		id: "settings",
		label: "Settings"
	}
], Wr = {
	providers: "Provider connections",
	workflows: "Workflow runtime",
	conversation: "Conversation agent",
	ai_task: "AI Task entity"
}, Gr = {
	automations: {
		title: "Automation Studio is not active yet",
		detail: "The foundation build does not create, publish, or run workflows. The structured builder arrives only after its deterministic runtime and safety checks are proven."
	},
	chat: {
		title: "Chat is not connected yet",
		detail: "Read-only chat follows a validated provider connection. This panel does not assume a provider, model, entity, or conversation history."
	},
	providers: {
		title: "Provider setup is not enabled yet",
		detail: "No endpoint, credential, model identifier, or provider capability is assumed by this foundation shell."
	},
	permissions: {
		title: "Entity permissions are not loaded yet",
		detail: "A later phase will read Home Assistant's live registries and start with no AI access. This shell contains no invented household entities or targets."
	},
	voice: {
		title: "Voice and notification setup is not active yet",
		detail: "Only capabilities discovered from Home Assistant will appear here. Announcement output will never be presented as proof of voice-input support."
	},
	activity: {
		title: "There is no execution activity to show",
		detail: "The foundation shell does not call AI providers or Home Assistant actions. Audit records appear only after their backend lifecycle and retention rules are implemented."
	},
	settings: {
		title: "Settings are intentionally limited",
		detail: "Only the live integration status is available in Phase 0. Credential, privacy, retention, and cloud-routing controls are not simulated here."
	}
};
function Kr(e) {
	let t = e?.path?.split("/").filter(Boolean).at(-1);
	return Ur.find((e) => e.id === t)?.id;
}
var qr = class extends D {
	static properties = {
		hass: { attribute: !1 },
		narrow: { type: Boolean },
		route: { attribute: !1 },
		panel: { attribute: !1 },
		_activeSection: { state: !0 },
		_loadState: { state: !0 },
		_status: { state: !0 },
		_probeLoadState: { state: !0 },
		_probeResult: { state: !0 },
		_workflowsRefresh: { state: !0 },
		_draft: { state: !0 },
		_builderDraft: { state: !0 }
	};
	static styles = ot;
	_draftSequence = 0;
	_viewSession = 0;
	_sessionConnection;
	_sessionCall;
	_sessionUser;
	_clearSessionContent = () => {
		this._draft = void 0, this._builderDraft = void 0, this._viewSession += 1, this.requestUpdate();
	};
	_hasRequested = !1;
	_requestSequence = 0;
	constructor() {
		super(), this.narrow = !1, this._activeSection = "home", this._loadState = "waiting", this._probeLoadState = "idle", this._workflowsRefresh = 0;
	}
	disconnectedCallback() {
		this._sessionConnection?.removeEventListener("disconnected", this._clearSessionContent), this._clearSessionContent(), this._requestSequence += 1, window.removeEventListener("resize", this._onViewportChange), window.visualViewport?.removeEventListener("resize", this._onViewportChange), super.disconnectedCallback();
	}
	willUpdate(e) {
		if (e.has("hass") && (this._sessionConnection !== this.hass?.connection || this._sessionCall !== this.hass?.callWS || this._sessionUser !== this.hass?.user?.id) && (this._sessionConnection?.removeEventListener("disconnected", this._clearSessionContent), this._clearSessionContent(), this._sessionConnection = this.hass?.connection, this._sessionCall = this.hass?.callWS, this._sessionUser = this.hass?.user?.id, this._sessionConnection?.addEventListener("disconnected", this._clearSessionContent)), e.has("route")) {
			let e = Kr(this.route);
			e !== void 0 && (this._activeSection = e);
		}
		e.has("_activeSection") && this._activeSection !== "automations" && (this._draft = void 0, this._builderDraft = void 0);
	}
	_syncChatHeight() {
		if (this._activeSection !== "chat") {
			this.style.removeProperty("--orchestrator-shell-height");
			return;
		}
		let e = this.getBoundingClientRect().top, t = Math.max(320, Math.round(window.innerHeight - e));
		this.style.setProperty("--orchestrator-shell-height", `${t}px`);
	}
	_onViewportChange = () => {
		this._syncChatHeight();
	};
	connectedCallback() {
		super.connectedCallback(), this._sessionConnection?.addEventListener("disconnected", this._clearSessionContent), window.addEventListener("resize", this._onViewportChange, { passive: !0 }), window.visualViewport?.addEventListener("resize", this._onViewportChange, { passive: !0 });
	}
	updated(e) {
		e.has("hass") && this.hass !== void 0 && !this._hasRequested && queueMicrotask(() => void this._refreshStatus()), this.classList.toggle("chat-host", this._activeSection === "chat"), this._syncChatHeight();
	}
	render() {
		let e = this._activeSection === "chat";
		return b`
      <div class="app-frame ${this.narrow ? "narrow" : ""} ${e ? "chat-mode" : ""}">
        ${this._renderSidebar()}
        <main class="workspace" id="main-content" tabindex="-1">
          <div class="workspace-inner">
            ${We(this._viewSession, this._activeSection === "home" ? this._renderHome() : this._activeSection === "automations" ? this._renderWorkflowProbe() : e ? this._renderChatModes() : this._activeSection === "providers" ? this._renderProviders() : this._activeSection === "permissions" ? this._renderCatalog() : this._activeSection === "activity" ? b`<ai-orchestrator-audit .hass=${this.hass}></ai-orchestrator-audit><ai-orchestrator-activity .hass=${this.hass}></ai-orchestrator-activity>` : this._activeSection === "voice" && this._status?.features.conversation === !0 ? this._renderVoice() : this._renderPlaceholder(this._activeSection))}
          </div>
        </main>
      </div>
    `;
	}
	_renderSidebar() {
		return b`
      <aside class="sidebar">
        <div class="brand">
          <span class="brand-mark" aria-hidden="true">AI</span>
          <div class="brand-copy">
            <p class="brand-title">AI Orchestrator</p>
          <p class="brand-subtitle">Home Assistant AI</p>
          </div>
        </div>

        <nav class="section-nav" aria-label="AI Orchestrator sections">
          ${Ur.map((e) => b`
              <button
                class="nav-button"
                type="button"
                aria-current=${this._activeSection === e.id ? "page" : S}
                @click=${() => this._selectSection(e.id)}
              >
                <span class="nav-marker" aria-hidden="true"></span>
                <span>${e.label}</span>
              </button>
            `)}
        </nav>

        <div class="sidebar-note">
          <strong>Local AI, explicit requests</strong>
          Chat sends only your conversation to the selected local provider. Browsing the entity
          catalogue sends no household context to AI. Device control requires saved permissions and your confirmation.
        </div>
      </aside>
    `;
	}
	_renderHome() {
		let e = this._statusHeading();
		return b`
      <header class="page-header">
        <div>
          <p class="eyebrow">Private Home Assistant AI</p>
          <h1>Your Home Assistant AI</h1>
          <p class="page-intro">
            Connect a local provider, build and test notification workflows, and inspect their results.
            Choose observation permissions explicitly; available capabilities are shown below.
          </p>
        </div>
        <span class="privacy-badge">Local status check only</span>
      </header>

      <section class="hero" aria-labelledby="foundation-status" aria-busy=${this._loadState === "loading"}>
        <div class="hero-copy" aria-live="polite">
          <p class="status-kicker">
            <span class="status-dot ${e.tone}" aria-hidden="true"></span>
            ${e.kicker}
          </p>
          <h2 id="foundation-status">${e.title}</h2>
          <p class="hero-description">${e.detail}</p>
          ${this._renderStatusAction()}
          ${this._loadState === "loading" ? b`<div class="loading-bar" role="progressbar" aria-label="Checking integration status"></div>` : S}
        </div>
        <div class="connection-summary" aria-label="Connection summary">
          <p class="summary-label">Home Assistant</p>
          <p class="summary-value">${this._connectionLabel()}</p>
          <p class="summary-detail">${this._connectionDetail()}</p>
          <div class="summary-rule"></div>
          <p class="summary-label">AI destination</p>
          <p class="summary-value">None contacted</p>
          <p class="summary-detail">This status request contains no entity state or prompt content.</p>
        </div>
      </section>

      <div class="content-grid">
        ${this._renderFeatureCard()} ${this._renderNextSteps()}
      </div>

      <div class="assurance">
        <span class="assurance-mark" aria-hidden="true">✓</span>
        <span>
          Home Assistant remains the authority for state and actions. This panel has no generic
          action executor, does not store browser secrets, and does not enable cloud failover.
        </span>
      </div>
    `;
	}
	_renderChatModes() {
		let e = this.hass?.connection, t = this.hass?.user?.id, n = this.hass?.callWS;
		return b`
      <ai-orchestrator-assistant .hass=${this.hass}
        @assistant-workflow-review=${(r) => {
			if (!(!this.isConnected || this._activeSection !== "chat" || !this.hass || this.hass.connection !== e || this.hass.user?.id !== t || this.hass.callWS !== n || e?.connected === !1 || r.target !== this.renderRoot.querySelector("ai-orchestrator-assistant") || typeof r.detail?.json != "string" || r.detail.json.length > 65536)) try {
				let e = F(JSON.parse(r.detail.json));
				if (e.enabled) return;
				let t = {
					json: JSON.stringify(e, null, 2),
					sequence: ++this._draftSequence
				};
				this._activeSection = "automations", this._builderDraft = t, this._draft = t;
			} catch {}
		}}
      ></ai-orchestrator-assistant>
    `;
	}
	_renderFeatureCard() {
		return b`
      <section class="card" aria-labelledby="feature-status-heading">
        <h2 id="feature-status-heading">Available capabilities</h2>
        <p class="card-intro">Values come from the versioned integration status response.</p>
        <ul class="status-list">
          ${Ke.map((e) => {
			let t = this._loadState === "ready", n = t && this._status?.features[e] === !0, r = t ? n ? "Available" : "Not available" : "Unknown";
			return b`
              <li class="status-row">
                <span>
                  <span class="status-name">${Wr[e]}</span>
                  <span class="status-detail">${this._featureDetail(n)}</span>
                </span>
                <span class="state-pill ${t ? n ? "available" : "unavailable" : "unknown"}">
                  ${r}
                </span>
              </li>
            `;
		})}
        </ul>
      </section>
    `;
	}
	_renderNextSteps() {
		return b`
      <section class="card" aria-labelledby="next-steps-heading">
        <h2 id="next-steps-heading">What happens next</h2>
        <p class="card-intro">Start with a local provider, then test a workflow before enabling it.</p>
        <ol class="next-list">
          <li>
            <strong>Build an automation</strong>
            Choose a real trigger and notification targets in Automations. Save disabled and dry run before enabling.
          </li>
          <li>
            <strong>Connect a verified local provider</strong>
            Add your connection in Providers and run its connection test.
          </li>
          <li>
            <strong>Discover permissions from Home Assistant</strong>
            Select permitted entities in Entities &amp; Permissions. Review execution results in Activity &amp; Security.
          </li>
        </ol>
      </section>
    `;
	}
	_renderVoice() {
		return b`
      <header class="page-header">
        <div>
          <p class="eyebrow">Voice &amp; Notifications</p>
          <h1>Voice &amp; Notifications</h1>
        </div>
        <span class="phase-badge">Assist agent available</span>
      </header>
      <section class="card" aria-labelledby="voice-agent-title">
        <h2 id="voice-agent-title">Conversation agent</h2>
        <p>
          Each connected local provider adds one conversation agent to Home Assistant. Choose it in
          Settings, then Voice assistants, as the conversation agent of an Assist pipeline. It answers
          by text through whichever pipeline you attach it to, including a voice pipeline.
        </p>
        <p>
          The agent replies with model text only. It receives the words of the conversation and nothing
          else: no entity states, no tools, and no way to call a Home Assistant action. Keep Home
          Assistant's own assistant for device commands.
        </p>
        <p>
          Notification delivery is separate: workflows in execute mode send to a notification target you
          choose in the Automations section.
        </p>
      </section>
    `;
	}
	_renderPlaceholder(e) {
		let t = Gr[e], n = Ur.find((t) => t.id === e)?.label ?? "Section";
		return b`
      <header class="page-header">
        <div>
          <p class="eyebrow">${n}</p>
          <h1>${n}</h1>
        </div>
        <span class="phase-badge">Foundation preview</span>
      </header>
      <section class="placeholder" aria-labelledby="placeholder-title">
        <div class="placeholder-inner">
          <span class="phase-badge">Not enabled</span>
          <h2 id="placeholder-title">${t.title}</h2>
          <p>${t.detail}</p>
          <div class="hero-actions">
            <button class="secondary-button" type="button" @click=${() => this._selectSection("home")}>
              Return to foundation status
            </button>
          </div>
        </div>
      </section>
    `;
	}
	_renderWorkflowProbe() {
		return b`
      <ai-orchestrator-workflow-draft .hass=${this.hass}
        @generated-workflow=${(e) => {
			this._builderDraft = {
				json: e.detail.json,
				sequence: ++this._draftSequence
			}, this._draft = {
				json: e.detail.json,
				sequence: ++this._draftSequence
			};
		}}></ai-orchestrator-workflow-draft>
      <ai-orchestrator-workflow-builder
        .hass=${this.hass}
        .draft=${this._builderDraft}
        @workflow-saved=${() => {
			this._workflowsRefresh += 1;
		}}
        @workflow-draft=${(e) => {
			this._draft = {
				json: e.detail.json,
				sequence: ++this._draftSequence
			};
		}}
      ></ai-orchestrator-workflow-builder>
      <ai-orchestrator-workflow-preview
        .hass=${this.hass}
        .draft=${this._draft}
        @workflow-saved=${() => {
			this._workflowsRefresh += 1;
		}}
      ></ai-orchestrator-workflow-preview>
      <ai-orchestrator-workflows
        .hass=${this.hass}
        .refreshToken=${this._workflowsRefresh}
        @workflow-load=${(e) => {
			this._draft = {
				json: e.detail.json,
				sequence: ++this._draftSequence
			};
		}}
        @workflow-edit=${(e) => {
			this._builderDraft = {
				json: e.detail.json,
				sequence: ++this._draftSequence
			}, this.renderRoot.querySelector("ai-orchestrator-workflow-builder")?.scrollIntoView({ block: "start" });
		}}
      ></ai-orchestrator-workflows>
      <header class="page-header">
        <div>
          <p class="eyebrow">Automations</p>
          <h1>Restricted workflow lifecycle probe</h1>
          <p class="page-intro">
            This Phase 0 control fires one integration-owned internal event. It records an
            in-memory count and calls neither an AI provider nor a Home Assistant action.
          </p>
        </div>
        <span class="phase-badge">Lifecycle evidence only</span>
      </header>
      <section class="placeholder" aria-labelledby="probe-title">
        <div class="placeholder-inner">
          <span class="phase-badge">No device action</span>
          <h2 id="probe-title">Run one harmless trigger</h2>
          <p>
            A successful result must report exactly one execution for this trigger. Reload and
            restart tests use that exact delta to detect duplicate listener registration.
          </p>
          <div class="hero-actions probe-actions">
            <button
              class="primary-button"
              type="button"
              ?disabled=${this._probeLoadState === "loading"}
              @click=${this._runWorkflowProbe}
            >
              ${this._probeLoadState === "loading" ? "Running probe…" : "Run lifecycle probe"}
            </button>
            <button class="secondary-button" type="button" @click=${() => this._selectSection("home")}>
              Return to foundation status
            </button>
          </div>
          <div class="probe-result" role="status" aria-live="polite">
            ${this._renderWorkflowProbeResult()}
          </div>
        </div>
      </section>
    `;
	}
	_renderProviders() {
		return b`
      <header class="page-header">
        <div>
          <p class="eyebrow">Providers</p>
          <h1>Provider connections</h1>
          <p class="page-intro">
            Configure credentials through Home Assistant's backend config flow. This panel receives
            no stored secret. Use "Test connection" to verify reachability, authentication, and the
            configured model without sending entity state or a prompt.
          </p>
        </div>
        <span class="privacy-badge">Local status only</span>
      </header>
      <ai-orchestrator-providers-view .hass=${this.hass}></ai-orchestrator-providers-view>
    `;
	}
	_renderCatalog() {
		return b`
      <header class="page-header">
        <div>
          <p class="eyebrow">Entities & Permissions</p>
          <h1>Home Assistant registry catalogue</h1>
          <p class="page-intro">
            Browse current entity, device, and area metadata from Home Assistant. No state values
            or attributes are included, and every entity begins with no AI access.
          </p>
        </div>
        <span class="privacy-badge">Explicit permissions</span>
      </header>
      <ai-orchestrator-agent-scopes-view .hass=${this.hass}></ai-orchestrator-agent-scopes-view>
      <ai-orchestrator-action-controls-view .hass=${this.hass} mode="permissions"></ai-orchestrator-action-controls-view>
      <ai-orchestrator-catalog-view .hass=${this.hass}></ai-orchestrator-catalog-view>
    `;
	}
	_renderWorkflowProbeResult() {
		return this._probeLoadState === "ready" && this._probeResult !== void 0 ? b`
        <strong>One trigger produced exactly one execution.</strong>
        <span>
          Runtime execution ${this._probeResult.execution_count}; listener registration
          ${this._probeResult.registration_count}. Provider contacted: no. Home Assistant action
          called: no.
        </span>
      ` : this._probeLoadState === "error" ? b`
        <strong>The lifecycle probe was not confirmed.</strong>
        <span>No provider or Home Assistant action was called. Check the integration and logs.</span>
      ` : this._probeLoadState === "loading" ? b`<span>Waiting for the bounded integration response.</span>` : b`<span>No lifecycle probe has run in this panel session.</span>`;
	}
	_renderStatusAction() {
		return this._loadState === "loading" ? S : this._loadState === "ready" && this._status?.configured === !1 ? b`
        <div class="hero-actions">
          <button class="secondary-button" type="button" @click=${this._refreshStatus}>
            Check again
          </button>
        </div>
      ` : [
			"denied",
			"incompatible",
			"error"
		].includes(this._loadState) ? b`
        <div class="hero-actions">
          <button class="primary-button" type="button" @click=${this._refreshStatus}>Retry status check</button>
        </div>
      ` : S;
	}
	_statusHeading() {
		return this._loadState === "loading" ? {
			kicker: "Checking authenticated connection",
			title: "Reading the integration status",
			detail: "No provider or Home Assistant action is called during this check.",
			tone: ""
		} : this._loadState === "ready" && this._status?.configured === !0 ? {
			kicker: "Foundation connection confirmed",
			title: "The integration is configured",
			detail: "Home Assistant returned the supported foundation status. Feature readiness remains limited to the explicit capability values below.",
			tone: "ready"
		} : this._loadState === "ready" ? {
			kicker: "Foundation connection confirmed",
			title: "Integration setup is not complete",
			detail: "Home Assistant answered successfully, but the integration reports that setup is not configured. No provider readiness is inferred.",
			tone: "warning"
		} : this._loadState === "denied" ? {
			kicker: "Access denied",
			title: "Administrator access is required",
			detail: "The status command was not available to this Home Assistant user. No action ran and no data was sent to an AI provider.",
			tone: "error"
		} : this._loadState === "incompatible" ? {
			kicker: "Compatibility check failed",
			title: "The status response is not supported",
			detail: "The panel did not accept an unknown response as healthy. No action ran and no data was sent to an AI provider.",
			tone: "error"
		} : this._loadState === "error" ? {
			kicker: "Status unavailable",
			title: "The integration status could not be read",
			detail: "The panel cannot confirm setup or feature readiness. No action ran and no data was sent to an AI provider.",
			tone: "error"
		} : {
			kicker: "Waiting for Home Assistant",
			title: "The panel has not received a connection",
			detail: "No setup state or feature readiness is assumed while the Home Assistant connection is unavailable.",
			tone: "warning"
		};
	}
	_connectionLabel() {
		return this._loadState === "ready" ? "Authenticated status received" : this._loadState === "loading" ? "Checking" : this._loadState === "denied" ? "Access denied" : this._loadState === "incompatible" ? "Incompatible response" : this._loadState === "error" ? "Unavailable" : "Waiting";
	}
	_connectionDetail() {
		return this._loadState === "ready" ? "The versioned ai_orchestrator/status command completed successfully." : this._loadState === "loading" ? "A single authenticated WebSocket status command is in progress." : "Feature availability cannot be confirmed in this state.";
	}
	_featureDetail(e) {
		return this._loadState === "ready" ? e ? "Reported by the integration" : "Reported unavailable by the integration" : "Status not confirmed";
	}
	_selectSection(e) {
		this._activeSection = e;
	}
	_refreshStatus = async () => {
		let e = this.hass;
		if (e === void 0) {
			this._loadState = "waiting", this._status = void 0;
			return;
		}
		this._hasRequested = !0, this._loadState = "loading", this._status = void 0;
		let t = ++this._requestSequence;
		try {
			let n = await Ze(e);
			if (t !== this._requestSequence || !this.isConnected) return;
			this._status = n, this._loadState = "ready";
		} catch (e) {
			if (t !== this._requestSequence || !this.isConnected) return;
			this._status = void 0, this._loadState = e instanceof qe ? "incompatible" : Qe(e) ? "denied" : "error";
		}
	};
	_runWorkflowProbe = async () => {
		let e = this.hass;
		if (e === void 0) {
			this._probeLoadState = "error", this._probeResult = void 0;
			return;
		}
		this._probeLoadState = "loading", this._probeResult = void 0;
		try {
			this._probeResult = await at(e), this._probeLoadState = "ready";
		} catch {
			this._probeResult = void 0, this._probeLoadState = "error";
		}
	};
}, Jr = "ai-orchestrator-chat-view", Yr = {
	unauthorized: "Administrator access is required for chat.",
	chat_busy: "A request is still running. Wait a moment, then send again.",
	chat_duplicate_request: "This request was already submitted. Start a new request to retry.",
	chat_provider_unavailable: "This local provider is no longer available. Refresh providers and select a connection.",
	chat_authentication: "Provider authentication failed. Update its credentials in Home Assistant.",
	chat_timeout: "The provider took too long to reply. Your message is ready to try again.",
	chat_invalid_response: "The provider did not return a valid text-only reply. Try a shorter request.",
	chat_connection: "Home Assistant could not reach the local provider.",
	chat_not_found: "The configured model is not available. Check provider settings.",
	chat_unsupported: "This provider does not support the requested text generation."
}, Xr = class extends D {
	static properties = {
		hass: { attribute: !1 },
		_options: { state: !0 },
		_connectionId: { state: !0 },
		_draft: { state: !0 },
		_history: { state: !0 },
		_busy: { state: !0 },
		_loading: { state: !0 },
		_error: { state: !0 },
		_notice: { state: !0 },
		_pendingPrompt: { state: !0 }
	};
	static styles = o`
    :host { display:block; color:var(--primary-text-color,#233642); font:inherit; block-size:100%; min-block-size:0; }
    * { box-sizing:border-box; }

    /* App-shell layout: only .transcript scrolls; header/controls/compose stay fixed. */
    .chat {
      display:flex; flex-direction:column; min-height:0;
      height:var(--ai-chat-height,100%);
      width:100%; max-width:var(--ai-chat-max-width,860px); margin-inline:auto;
    }
    .chat > .transcript { flex:1 1 auto; min-height:0; }
    .chat > header, .chat > .controls, .chat > .privacy,
    .chat > .error, .chat > .notice, .chat > .compose, .chat > .setup-hint { flex:0 0 auto; }

    header { margin:0 0 12px; }
    .eyebrow { margin:0; color:var(--secondary-text-color,#4b626d); text-transform:uppercase; font-size:11px; letter-spacing:.14em; font-weight:700; }
    h1 { font-size:clamp(20px,2.4vw,26px); letter-spacing:-.02em; margin:4px 0 0; }
    h2 { font-size:18px; margin:0 0 6px; }
    p { line-height:1.6; }
    .intro { display:none; }

    .controls { display:flex; flex-wrap:wrap; align-items:end; gap:10px; padding:10px 12px; background:var(--card-background-color,#fff); border:1px solid var(--divider-color,#ccd9da); border-radius:12px; }
    .provider { flex:1; min-width:0; }
    label { display:block; font-weight:600; margin-bottom:5px; font-size:12px; color:var(--secondary-text-color,#4b626d); }
    select,textarea { width:100%; max-width:100%; min-width:0; color:inherit; background:var(--card-background-color,#fff); border:1px solid #7d969c; border-radius:9px; font:inherit; padding:9px 10px; }
    select { text-overflow:ellipsis; }
    textarea { resize:none; min-height:52px; max-height:34vh; line-height:1.5; overflow:auto; }
    button,a { font:inherit; }
    button { cursor:pointer; min-height:40px; border-radius:9px; padding:8px 14px; border:1px solid #7d969c; color:inherit; background:var(--card-background-color,#fff); font-weight:600; }
    button.primary { background:#175e56; color:#fff; border-color:#175e56; }
    button:disabled { opacity:.55; cursor:default; }
    button:focus-visible,select:focus-visible,textarea:focus-visible,a:focus-visible { outline:3px solid #207e73; outline-offset:3px; }
    a { color:#175e56; }

    .privacy { padding:6px 2px; color:var(--secondary-text-color,#4b626d); font-size:12px; line-height:1.55; }
    .privacy strong { color:var(--primary-text-color,#233642); font-weight:600; }
    .privacy > summary { cursor:pointer; list-style:revert; padding:2px 0; }
    .privacy > summary:focus-visible { outline:3px solid #207e73; outline-offset:3px; border-radius:6px; }
    .privacy-detail { padding:6px 0 2px 2px; }
    .setup-hint { margin:0 0 8px; }

    .transcript { overflow-y:auto; overflow-x:hidden; padding:8px 2px; overscroll-behavior:contain; scrollbar-width:thin; }
    .empty { text-align:center; padding:28px 18px; color:var(--secondary-text-color,#4b626d); }

    .message { border-radius:14px; padding:12px 14px; margin:0 0 10px; border:1px solid var(--divider-color,#ccd9da); background:var(--card-background-color,#fff); overflow-wrap:anywhere; max-width:88%; }
    .message.user { margin-left:auto; border-left:3px solid #207e73; }
    .message.assistant { margin-right:auto; }
    .message strong { font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:var(--secondary-text-color,#4b626d); }
    .message p { white-space:pre-wrap; margin:6px 0 0; }
    .pending { color:var(--secondary-text-color,#4b626d); margin:0 0 10px; font-size:13px; }
    .error { background:#fff2ee; color:#852e23; border:1px solid #d7a79d; border-radius:10px; padding:10px 14px; margin:8px 0; line-height:1.5; }
    .notice { color:var(--secondary-text-color,#4b626d); font-size:12px; line-height:1.5; margin:6px 0; }

    .compose { padding:10px 12px; background:var(--card-background-color,#fff); border:1px solid var(--divider-color,#ccd9da); border-radius:12px; }
    .compose label { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0 0 0 0); clip-path:inset(50%); white-space:nowrap; border:0; }
    .compose-footer { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:8px; }
    .hint { font-size:11px; color:var(--secondary-text-color,#4b626d); }

    @media(max-width:900px) {
      .chat { height:var(--ai-chat-height,100%); }
      h1 { font-size:20px; }
    }
    @media(max-width:480px) {
      .controls,.compose { padding:9px 10px; }
      .provider { flex-basis:100%; }
      .message { max-width:94%; }
      .privacy { font-size:11px; padding:6px 2px; }
      textarea { max-height:26vh; }
    }
  `;
	_sequence = 0;
	_loadSequence = 0;
	_boundConnection;
	_userId;
	_hasLoaded = !1;
	constructor() {
		super(), this._connectionId = "", this._draft = "", this._history = [], this._busy = !1, this._loading = !1, this._error = "", this._notice = "", this._pendingPrompt = "";
	}
	_onDisconnected = () => {
		this._reset(), this._options = void 0, this._hasLoaded = !1, this._error = "Home Assistant disconnected. Chat history was cleared. Reconnect and refresh providers.";
	};
	_onReady = () => {
		this._hasLoaded = !0, this._load();
	};
	disconnectedCallback() {
		this._unbind(), this._reset(), this._hasLoaded = !1, super.disconnectedCallback();
	}
	willUpdate(e) {
		if (e.has("hass")) {
			if (this.hass === void 0) {
				this._unbind(), this._reset(), this._options = void 0, this._connectionId = "", this._hasLoaded = !1, this._userId = void 0;
				return;
			}
			(this._userId !== this.hass.user?.id || this._boundConnection !== this.hass.connection) && (this._unbind(), this._reset(), this._options = void 0, this._connectionId = "", this._hasLoaded = !1, this._userId = this.hass.user?.id, this._boundConnection = this.hass.connection, this._boundConnection?.addEventListener("disconnected", this._onDisconnected), this._boundConnection?.addEventListener("ready", this._onReady)), !this._hasLoaded && this.hass.connection?.connected !== !1 && (this._hasLoaded = !0, queueMicrotask(() => void this._load()));
		}
	}
	_unbind() {
		this._boundConnection?.removeEventListener("disconnected", this._onDisconnected), this._boundConnection?.removeEventListener("ready", this._onReady), this._boundConnection = void 0;
	}
	_reset() {
		this._sequence += 1, this._loadSequence += 1, this._history = [], this._draft = "", this._pendingPrompt = "", this._busy = !1, this._loading = !1, this._error = "", this._notice = "";
	}
	async _load() {
		let e = this.hass;
		if (e === void 0 || this._loading || !this.isConnected) return;
		let t = ++this._loadSequence;
		this._loading = !0, this._error = "";
		try {
			let n = await W(e);
			if (t !== this._loadSequence || !this.isConnected) return;
			this._options = n, n.providers.some((e) => e.connection_id === this._connectionId) || (this._sequence += 1, this._history = [], this._draft = "", this._notice = "", this._connectionId = n.providers[0]?.connection_id ?? "");
		} catch {
			if (t !== this._loadSequence || !this.isConnected) return;
			this._options = void 0, this._error = "Chat is unavailable. Check administrator access and install matching backend and panel files, then refresh providers.";
		} finally {
			t === this._loadSequence && (this._loading = !1);
		}
	}
	async _send(e) {
		e?.preventDefault();
		let t = this.hass, n = this._draft.trim(), r = this._options?.providers.find((e) => e.connection_id === this._connectionId);
		if (t === void 0 || this._busy || this._loading || !r || !n || n.length > H.max_message_chars || this.hass?.connection?.connected === !1) return;
		let i = Jt(this._history, n), a = ++this._sequence, o = this._connectionId;
		this._busy = !0, this._pendingPrompt = n, this._error = "", this._notice = i.omitted ? "Earlier turns were left out to stay within the conversation limit." : "";
		try {
			let e = await qt(t, o, G(), i.messages);
			if (a !== this._sequence || !this.isConnected) return;
			this._history = [...i.messages, {
				role: "assistant",
				content: e.text
			}], this._draft = "", await this.updateComplete;
			let n = this.renderRoot.querySelector(".transcript");
			n?.scrollTo({ top: n.scrollHeight });
		} catch (e) {
			if (a !== this._sequence || !this.isConnected) return;
			let t = typeof e == "object" && e && "code" in e && typeof e.code == "string" ? e.code : "";
			this._error = Yr[t] ?? "The reply could not be completed. Your message is ready to try again.";
		} finally {
			a === this._sequence && (this._busy = !1, this._pendingPrompt = "", await this.updateComplete, this.renderRoot.querySelector("textarea")?.focus());
		}
	}
	_autoGrow(e) {
		e.style.height = "auto", e.style.height = `${e.scrollHeight}px`;
	}
	updated(e) {
		if (e.has("_draft") && this._draft === "") {
			let e = this.shadowRoot?.querySelector("textarea");
			e && (e.style.height = "");
		}
		if (!e.has("_history") && !e.has("_busy")) return;
		let t = this.shadowRoot?.querySelector(".transcript");
		t && (t.scrollTop = t.scrollHeight);
	}
	render() {
		let e = this._options?.providers.find((e) => e.connection_id === this._connectionId);
		return b`<div class="chat">
      <header><p class="eyebrow">Local AI · Read-only chat</p><h1>Talk to your local AI</h1>
        <p class="intro">Try a question, draft an announcement, or explore an idea.</p></header>
      <section class="controls" aria-label="Chat provider">
        <div class="provider"><label for="provider">Local provider</label>
          <select id="provider" .value=${this._connectionId} ?disabled=${this._busy || this._loading || !this._options?.providers.length}
            @change=${(e) => {
			this._reset(), this._connectionId = e.target.value;
		}}>
            ${this._options?.providers.length ? S : b`<option value="">${this._loading ? "Loading providers…" : "No local provider available"}</option>`}
            ${this._options?.providers.map((e) => b`<option value=${e.connection_id}>${e.title}</option>`)}
          </select></div>
        <button type="button" ?disabled=${this._busy || this._loading} @click=${() => void this._load()}>Refresh providers</button>
        <button type="button" @click=${() => {
			let e = this._busy;
			this._reset(), e && (this._notice = "Conversation cleared. The pending provider request may still finish; its reply will be discarded.");
		}}>New chat</button>
      </section>
      <details class="privacy">
        <summary><strong>Destination: ${e ? `${e.title} · Local` : "Choose a local provider"}</strong></summary>
        <div class="privacy-detail">
          Only messages in this conversation are sent when you press Send. No household context or device actions.
          History stays in this open chat view and clears when you leave. Replies arrive when complete; streaming is unavailable.
          ${e ? b`<br>Generation is an explicit trial; this model's capabilities have not been verified.` : S}
        </div>
      </details>
      ${!this._loading && this._options?.providers.length === 0 ? b`<p class="setup-hint">Add a local connection in <a href="/config/integrations/integration/ai_orchestrator">provider settings</a>, then refresh providers.</p>` : S}
      <div class="transcript" role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions text">
        ${this._history.length === 0 && !this._busy ? b`<div class="empty"><h2>A fresh conversation</h2><p>For example: “Draft a friendly reminder to close a window.”<br>This chat can write the words; it cannot check or control devices.</p></div>` : S}
        ${this._history.map((e) => b`<article class="message ${e.role}"><strong>${e.role === "user" ? "You" : "AI reply"}</strong><p>${e.content}</p></article>`)}
        ${this._busy ? b`<article class="message user"><strong>You</strong><p>${this._pendingPrompt}</p></article><p class="pending" role="status">Waiting for your local provider…</p>` : S}
      </div>
      ${this._error ? b`<div class="error" role="alert">${this._error}</div>` : S}
      ${this._notice ? b`<p class="notice" role="status">${this._notice}</p>` : S}
      <form class="compose" @submit=${(e) => void this._send(e)}>
        <label for="message">Your message</label>
        <textarea id="message" rows="1" maxlength=${H.max_message_chars} .value=${this._draft} ?disabled=${this._busy}
          placeholder="Ask your local AI…" aria-describedby="compose-hint"
          @input=${(e) => {
			let t = e.target;
			this._draft = t.value, this._autoGrow(t);
		}}
          @keydown=${(e) => {
			e.key === "Enter" && (e.ctrlKey || e.metaKey) && this._send(e);
		}}></textarea>
        <div class="compose-footer"><span id="compose-hint" class="hint">${this._draft.length} / ${H.max_message_chars} · Ctrl/⌘ + Enter to send</span>
          <button class="primary" type="submit" ?disabled=${this._busy || this._loading || !e || !this._draft.trim()}>${this._busy ? "Waiting…" : "Send"}</button></div>
      </form>
    </div>`;
	}
}, Zr = "ai-orchestrator-providers-view", Qr = "ai-orchestrator-catalog-view";
customElements.get("ai-orchestrator-chat-view") === void 0 && customElements.define(Jr, Xr), customElements.get("ai-orchestrator-panel") === void 0 && customElements.define(Hr, qr), customElements.get("ai-orchestrator-providers-view") === void 0 && customElements.define(Zr, bn), customElements.get("ai-orchestrator-catalog-view") === void 0 && customElements.define(Qr, Vt);
//#endregion
export { qr as AiOrchestratorPanel, Qr as CATALOG_VIEW_TAG, Jr as CHAT_VIEW_TAG, Vt as CatalogView, Xr as ChatView, Hr as PANEL_TAG, Zr as PROVIDERS_VIEW_TAG, bn as ProvidersView };
