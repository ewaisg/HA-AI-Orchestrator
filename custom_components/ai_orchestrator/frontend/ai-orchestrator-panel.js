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
})(e) : e, { is: l, defineProperty: u, getOwnPropertyDescriptor: d, getOwnPropertyNames: ee, getOwnPropertySymbols: te, getPrototypeOf: ne } = Object, f = globalThis, re = f.trustedTypes, ie = re ? re.emptyScript : "", ae = f.reactiveElementPolyfillSupport, p = (e, t) => e, m = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? ie : null;
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
}, oe = (e, t) => !l(e, t), se = {
	attribute: !0,
	type: String,
	converter: m,
	reflect: !1,
	useDefault: !1,
	hasChanged: oe
};
Symbol.metadata ??= Symbol("metadata"), f.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var h = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = se) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && u(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = d(this.prototype, e) ?? {
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
		return this.elementProperties.get(e) ?? se;
	}
	static _$Ei() {
		if (this.hasOwnProperty(p("elementProperties"))) return;
		let e = ne(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(p("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(p("properties"))) {
			let e = this.properties, t = [...ee(e), ...te(e)];
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
			let i = (n.converter?.toAttribute === void 0 ? m : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? m : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? oe)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
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
h.elementStyles = [], h.shadowRootOptions = { mode: "open" }, h[p("elementProperties")] = /* @__PURE__ */ new Map(), h[p("finalized")] = /* @__PURE__ */ new Map(), ae?.({ ReactiveElement: h }), (f.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var g = globalThis, ce = (e) => e, _ = g.trustedTypes, le = _ ? _.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, ue = "$lit$", v = `lit$${Math.random().toFixed(9).slice(2)}$`, de = "?" + v, fe = `<${de}>`, y = document, b = () => y.createComment(""), x = (e) => e === null || typeof e != "object" && typeof e != "function", pe = Array.isArray, me = (e) => pe(e) || typeof e?.[Symbol.iterator] == "function", he = "[ 	\n\f\r]", S = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, ge = /-->/g, _e = />/g, C = RegExp(`>|${he}(?:([^\\s"'>=/]+)(${he}*=${he}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), ve = /'/g, ye = /"/g, be = /^(?:script|style|textarea|title)$/i, w = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), T = Symbol.for("lit-noChange"), E = Symbol.for("lit-nothing"), xe = /* @__PURE__ */ new WeakMap(), D = y.createTreeWalker(y, 129);
function Se(e, t) {
	if (!pe(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return le === void 0 ? t : le.createHTML(t);
}
var Ce = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = S;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === S ? c[1] === "!--" ? o = ge : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = C) : (be.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = C) : o = _e : o === C ? c[0] === ">" ? (o = i ?? S, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? C : c[3] === "\"" ? ye : ve) : o === ye || o === ve ? o = C : o === ge || o === _e ? o = S : (o = C, i = void 0);
		let d = o === C && e[t + 1].startsWith("/>") ? " " : "";
		a += o === S ? n + fe : l >= 0 ? (r.push(s), n.slice(0, l) + ue + n.slice(l) + v + d) : n + v + (l === -2 ? t : d);
	}
	return [Se(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, O = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = Ce(t, n);
		if (this.el = e.createElement(l, r), D.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = D.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(ue)) {
					let t = u[o++], n = i.getAttribute(e).split(v), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? Te : r[1] === "?" ? Ee : r[1] === "@" ? De : j
					}), i.removeAttribute(e);
				} else e.startsWith(v) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (be.test(i.tagName)) {
					let e = i.textContent.split(v), t = e.length - 1;
					if (t > 0) {
						i.textContent = _ ? _.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], b()), D.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], b());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === de) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(v, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += v.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = y.createElement("template");
		return n.innerHTML = e, n;
	}
};
function k(e, t, n = e, r) {
	if (t === T) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = x(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = k(e, i._$AS(e, t.values), i, r)), t;
}
var we = class {
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? y).importNode(t, !0);
		D.currentNode = r;
		let i = D.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new A(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Oe(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = D.nextNode(), a++);
		}
		return D.currentNode = y, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, A = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = E, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
		e = k(this, e, t), x(e) ? e === E || e == null || e === "" ? (this._$AH !== E && this._$AR(), this._$AH = E) : e !== this._$AH && e !== T && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? me(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== E && x(this._$AH) ? this._$AA.nextSibling.data = e : this.T(y.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = O.createElement(Se(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new we(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = xe.get(e.strings);
		return t === void 0 && xe.set(e.strings, t = new O(e)), t;
	}
	k(t) {
		pe(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(b()), this.O(b()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = ce(e).nextSibling;
			ce(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, j = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = E, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = E;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = k(this, e, t, 0), a = !x(e) || e !== this._$AH && e !== T, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = k(this, r[n + o], t, o), s === T && (s = this._$AH[o]), a ||= !x(s) || s !== this._$AH[o], s === E ? e = E : e !== E && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === E ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, Te = class extends j {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === E ? void 0 : e;
	}
}, Ee = class extends j {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== E);
	}
}, De = class extends j {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = k(this, e, t, 0) ?? E) === T) return;
		let n = this._$AH, r = e === E && n !== E || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== E && (n === E || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Oe = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		k(this, e);
	}
}, ke = g.litHtmlPolyfillSupport;
ke?.(O, A), (g.litHtmlVersions ??= []).push("3.3.3");
var Ae = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new A(t.insertBefore(b(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, M = globalThis, N = class extends h {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Ae(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return T;
	}
};
N._$litElement$ = !0, N.finalized = !0, M.litElementHydrateSupport?.({ LitElement: N });
var je = M.litElementPolyfillSupport;
je?.({ LitElement: N }), (M.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region src/api/status-client.ts
var Me = Object.freeze({ type: "ai_orchestrator/status" }), P = [
	"providers",
	"workflows",
	"conversation",
	"ai_task"
], F = class extends Error {
	constructor() {
		super("The status response does not match the supported foundation contract."), this.name = "StatusContractError";
	}
};
function I(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function Ne(e, t) {
	return Object.keys(e).length === t.length && t.every((t) => Object.hasOwn(e, t));
}
function Pe(e) {
	if (!I(e) || !Ne(e, [
		"schema_version",
		"phase",
		"configured",
		"features"
	]) || !I(e.features) || !Ne(e.features, P)) throw new F();
	let t = e.features;
	if (e.schema_version !== 1 || e.phase !== "foundation" || typeof e.configured != "boolean" || P.some((e) => typeof t[e] != "boolean")) throw new F();
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
async function Fe(e) {
	return Pe(await e.callWS({ ...Me }));
}
function Ie(e) {
	return I(e) && e.code === "unauthorized";
}
//#endregion
//#region src/api/workflow-probe-client.ts
var Le = Object.freeze({ type: "ai_orchestrator/workflow/probe/run" }), Re = class extends Error {
	constructor() {
		super("The workflow lifecycle probe response does not match the supported contract."), this.name = "WorkflowProbeContractError";
	}
};
function ze(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function Be(e, t) {
	return Object.keys(e).length === t.length && t.every((t) => Object.hasOwn(e, t));
}
function Ve(e) {
	return typeof e == "number" && Number.isInteger(e) && e > 0;
}
function He(e) {
	if (!ze(e) || !Be(e, [
		"schema_version",
		"workflow_id",
		"trigger_type",
		"execution_count",
		"executions_for_trigger",
		"registration_count",
		"provider_contacted",
		"home_assistant_action_called"
	]) || e.schema_version !== 1 || e.workflow_id !== "foundation_lifecycle_probe" || e.trigger_type !== "integration_event" || !Ve(e.execution_count) || e.executions_for_trigger !== 1 || !Ve(e.registration_count) || e.provider_contacted !== !1 || e.home_assistant_action_called !== !1) throw new Re();
	return e;
}
async function Ue(e) {
	return He(await e.callWS({ ...Le }));
}
//#endregion
//#region src/styles/panel-styles.ts
var We = o`
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

  .app-frame.chat-mode ai-orchestrator-chat-view {
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
`, Ge = Object.freeze({ type: "ai_orchestrator/catalog/list" }), Ke = [
	"available",
	"unavailable",
	"not_loaded"
], qe = ["entity", "device"], L = 1e4;
function R(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function z(e, t) {
	let n = Object.keys(e).sort(), r = [...t].sort();
	return n.length === r.length && n.every((e, t) => e === r[t]);
}
function B(e) {
	return e === null || typeof e == "string";
}
function V(e) {
	return typeof e == "string" && e.length > 0 && e.length <= 255;
}
function Je(e) {
	if (!Array.isArray(e) || e.length > L) throw Error("Invalid area catalogue");
	return e.map((e) => {
		if (!R(e) || !z(e, ["area_id", "name"]) || !V(e.area_id) || typeof e.name != "string" || e.name.trim() === "") throw Error("Invalid area entry");
		return {
			area_id: e.area_id,
			name: e.name
		};
	});
}
function Ye(e) {
	if (!Array.isArray(e) || e.length > L) throw Error("Invalid device catalogue");
	return e.map((e) => {
		if (!R(e) || !z(e, [
			"device_id",
			"name",
			"area_id",
			"manufacturer",
			"model",
			"disabled"
		]) || !V(e.device_id) || !B(e.name) || e.area_id !== null && !V(e.area_id) || !B(e.manufacturer) || !B(e.model) || typeof e.disabled != "boolean") throw Error("Invalid device entry");
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
function Xe(e) {
	if (!Array.isArray(e) || e.length > L) throw Error("Invalid entity catalogue");
	return e.map((e) => {
		if (!R(e) || !z(e, [
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
		]) || !V(e.registry_id) || typeof e.entity_id != "string" || !/^[a-z0-9_]+\.[a-z0-9_]+$/u.test(e.entity_id) || typeof e.domain != "string" || e.domain !== e.entity_id.split(".", 1)[0] || !V(e.platform) || !B(e.name) || e.device_id !== null && !V(e.device_id) || e.area_id !== null && !V(e.area_id) || e.area_source !== null && !qe.includes(e.area_source) || e.area_source === null != (e.area_id === null) || typeof e.disabled != "boolean" || !Ke.includes(e.availability)) throw Error("Invalid entity entry");
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
function Ze(e) {
	if (!R(e) || !z(e, [
		"schema_version",
		"areas",
		"devices",
		"entities"
	]) || e.schema_version !== 1) throw Error("Invalid catalogue response");
	return {
		schema_version: 1,
		areas: Je(e.areas),
		devices: Ye(e.devices),
		entities: Xe(e.entities)
	};
}
async function Qe(e) {
	return Ze(await e.callWS({ ...Ge }));
}
//#endregion
//#region src/panel/catalog-view.ts
var $e = class extends N {
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
		if (this._state === "loading") return w`<div class="message" role="status" aria-busy="true">Reading Home Assistant registries…</div>`;
		if (this._state === "error") return w`<div class="message"><p>The registry catalogue could not be loaded.</p><button type="button" @click=${this._load}>Retry</button></div>`;
		let e = this._catalog;
		if (e === void 0 || this._state === "empty") return w`<div class="message"><p>No registered entities are available.</p><button type="button" @click=${this._load}>Refresh</button></div>`;
		let t = this._filteredEntities(e);
		return w`
      <div class="summary" aria-label="Registry totals">
        <span>${e.entities.length} entities</span>
        <span>${e.devices.length} devices</span>
        <span>${e.areas.length} areas</span>
        <span>AI access: none</span>
      </div>
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
      ${t.length === 0 ? w`<div class="message" role="status">No entities match this search.</div>` : this._renderTable(e, t)}
    `;
	}
	_renderTable(e, t) {
		let n = new Map(e.areas.map((e) => [e.area_id, e.name])), r = new Map(e.devices.map((e) => [e.device_id, e]));
		return w`
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
		return w`
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
				this._catalog = await Qe(this.hass), this._state = this._catalog.entities.length === 0 ? "empty" : "ready";
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
}, et = Object.freeze({ type: "ai_orchestrator/providers/list" }), tt = [
	"healthy",
	"degraded",
	"unavailable",
	"authentication_required",
	"not_tested"
], nt = [
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
function H(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function U(e, t) {
	let n = Object.keys(e).sort(), r = [...t].sort();
	return n.length === r.length && n.every((e, t) => e === r[t]);
}
function rt(e) {
	return typeof e == "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(e);
}
function it(e) {
	return typeof e == "string" && tt.includes(e);
}
function at(e) {
	return typeof e == "string" && nt.includes(e);
}
function ot(e) {
	return typeof e == "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.test(e) && !Number.isNaN(Date.parse(e));
}
function st(e) {
	if (!H(e) || !U(e, ["schema_version", "providers"]) || e.schema_version !== 1 || !Array.isArray(e.providers)) throw Error("Invalid provider list response");
	let t = [];
	for (let n of e.providers) {
		if (!H(n) || !U(n, [
			"connection_id",
			"provider_type",
			"display_name",
			"title",
			"health",
			"last_tested_at"
		]) || !rt(n.connection_id) || typeof n.provider_type != "string" || !/^[a-z][a-z0-9_]{0,63}$/u.test(n.provider_type) || typeof n.display_name != "string" || n.display_name.trim() === "" || typeof n.title != "string" || n.title.trim() === "" || !it(n.health) || n.last_tested_at !== null && !ot(n.last_tested_at) || n.health === "not_tested" != (n.last_tested_at === null)) throw Error("Invalid provider entry in list");
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
function ct(e, t) {
	if (!H(e) || !U(e, [
		"schema_version",
		"connection_id",
		"health",
		"error_code",
		"last_tested_at"
	]) || e.schema_version !== 1 || !rt(e.connection_id) || t !== void 0 && e.connection_id !== t || !it(e.health) || e.error_code !== null && !at(e.error_code) || e.health === "healthy" && e.error_code !== null || e.health !== "healthy" && e.error_code === null || e.health === "not_tested" || !ot(e.last_tested_at)) throw Error("Invalid provider test response");
	return {
		schema_version: 1,
		connection_id: e.connection_id,
		health: e.health,
		error_code: e.error_code,
		last_tested_at: e.last_tested_at
	};
}
async function lt(e) {
	return st(await e.callWS({ ...et }));
}
async function ut(e, t) {
	return ct(await e.callWS({
		type: "ai_orchestrator/providers/test",
		connection_id: t
	}), t);
}
//#endregion
//#region src/panel/providers-view.ts
var dt = "/config/integrations/integration/ai_orchestrator", ft = {
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
}, pt = {
	healthy: "Healthy",
	degraded: "Degraded",
	unavailable: "Unavailable",
	authentication_required: "Authentication required",
	not_tested: "Not tested"
}, mt = class extends N {
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
		return this._viewState === "loading" ? w`<div role="status" aria-label="Loading providers" aria-busy="true">
        Loading provider connections…
      </div>` : this._viewState === "error" ? w`
        <div class="error-state">
          <p>Could not load provider connections.</p>
          <button class="refresh-button" type="button" @click=${this._loadProviders}>
            Retry
          </button>
        </div>
      ` : this._viewState === "empty" ? w`
        <div class="empty-state">
          <h3>No provider connections</h3>
          <p>
            Add a provider through Home Assistant's AI Orchestrator integration page.
            Credentials stay in the backend config flow and never return to this panel.
          </p>
          <a class="primary-link" href=${dt}>Add provider connection</a>
        </div>
      ` : w`
      <div class="provider-toolbar">
        <a class="primary-link" href=${dt}>Manage provider connections</a>
      </div>
      <div class="provider-grid" role="list" aria-label="Provider connections">
        ${this._providers.map((e) => this._renderProviderCard(e))}
      </div>
    `;
	}
	_renderProviderCard(e) {
		let t = this._testStates.get(e.connection_id) ?? "idle", n = this._testResults.get(e.connection_id), r = e.health, i = e.last_tested_at;
		return w`
      <article class="provider-card" role="listitem">
        <div class="provider-card-header">
          <div>
            <h3 class="provider-name">${e.title}</h3>
            <span class="provider-type">${e.display_name}</span>
          </div>
          <span class="state-badge ${r}">${pt[r]}</span>
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
		if (e === "checking") return w`<span class="test-result checking" role="status" aria-live="polite">
        Checking…
      </span>`;
		if (t === "transport_failure") return w`<span
        class="test-result transport-failure"
        role="status"
        aria-live="polite"
      >
        Home Assistant communication failed; provider health unchanged
      </span>`;
		if (t?.health === "healthy") return w`<span class="test-result healthy" role="status" aria-live="polite">
        Connection test passed
      </span>`;
		if (t !== void 0) {
			let e = ft[t.error_code ?? "unknown"] ?? "Test failed";
			return w`<span
        class="test-result ${t.health}"
        role="status"
        aria-live="polite"
      >${e}</span>`;
		}
		return E;
	}
	_loadProviders = async () => {
		let e = this.hass;
		if (e !== void 0) {
			this._hasLoaded = !0, this._viewState = "loading";
			try {
				let t = await lt(e);
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
				let n = await ut(t, e);
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
}, W = Object.freeze({
	max_messages: 21,
	max_message_chars: 4e3,
	max_total_chars: 16e3,
	max_response_chars: 4e3,
	timeout_seconds: 60
}), G = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
function K(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function q(e, t) {
	return Object.keys(e).length === t.length && t.every((t) => Object.hasOwn(e, t));
}
function J(e, t) {
	return typeof e == "string" && e.trim().length > 0 && e.length <= t;
}
function ht(e) {
	if (!K(e) || !q(e, [
		"schema_version",
		"providers",
		"limits",
		"streaming",
		"household_context",
		"actions",
		"history_persisted"
	]) || e.schema_version !== 1 || e.streaming !== !1 || e.household_context !== !1 || e.actions !== !1 || e.history_persisted !== !1 || !Array.isArray(e.providers) || !K(e.limits) || !q(e.limits, Object.keys(W))) throw Error("Unsupported chat options");
	let t = e.limits;
	if (Object.entries(W).some(([e, n]) => t[e] !== n)) throw Error("Unsupported chat limits");
	let n = /* @__PURE__ */ new Set();
	return {
		schema_version: 1,
		providers: e.providers.map((e) => {
			if (!K(e) || !q(e, [
				"connection_id",
				"title",
				"display_name",
				"destination",
				"capability_verified"
			]) || typeof e.connection_id != "string" || !G.test(e.connection_id) || !J(e.title, 1e3) || !J(e.display_name, 1e3) || e.destination !== "local" || e.capability_verified !== !1 || n.has(e.connection_id)) throw Error("Unsupported chat provider");
			return n.add(e.connection_id), {
				connection_id: e.connection_id,
				title: e.title,
				display_name: e.display_name,
				destination: "local",
				capability_verified: !1
			};
		}),
		limits: W,
		streaming: !1,
		household_context: !1,
		actions: !1,
		history_persisted: !1
	};
}
function gt(e, t, n) {
	if (!K(e) || !q(e, [
		"schema_version",
		"connection_id",
		"request_id",
		"text",
		"destination",
		"streaming"
	]) || e.schema_version !== 1 || e.connection_id !== t || e.request_id !== n || e.destination !== "local" || e.streaming !== !1 || !J(e.text, W.max_response_chars)) throw Error("Unsupported chat response");
	return {
		schema_version: 1,
		connection_id: t,
		request_id: n,
		text: e.text,
		destination: "local",
		streaming: !1
	};
}
async function _t(e) {
	return ht(await e.callWS({ type: "ai_orchestrator/chat/options" }));
}
async function vt(e, t, n, r) {
	if (!G.test(t) || !G.test(n) || r.length === 0 || r.length > W.max_messages || r.length % 2 != 1 || r.some((e, t) => e.role !== (t % 2 == 0 ? "user" : "assistant") || !J(e.content, W.max_message_chars)) || r.reduce((e, t) => e + t.content.length, 0) > W.max_total_chars) throw Error("Invalid chat request");
	return gt(await e.callWS({
		type: "ai_orchestrator/chat/send",
		connection_id: t,
		request_id: n,
		messages: r.map(({ role: e, content: t }) => ({
			role: e,
			content: t
		}))
	}), t, n);
}
function yt(e, t) {
	let n = [...e.map((e) => ({ ...e })), {
		role: "user",
		content: t
	}], r = !1;
	for (; n.length > 1 && (n.length > W.max_messages || n.reduce((e, t) => e + t.content.length, 0) > W.max_total_chars);) n.splice(0, 2), r = !0;
	return {
		messages: n,
		omitted: r
	};
}
//#endregion
//#region src/panel/chat-view.ts
var bt = "ai-orchestrator-chat-view", xt = {
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
}, St = class extends N {
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
			let n = await _t(e);
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
		if (t === void 0 || this._busy || this._loading || !r || !n || n.length > W.max_message_chars || this.hass?.connection?.connected === !1) return;
		let i = yt(this._history, n), a = ++this._sequence, o = this._connectionId;
		this._busy = !0, this._pendingPrompt = n, this._error = "", this._notice = i.omitted ? "Earlier turns were left out to stay within the conversation limit." : "";
		try {
			let e = await vt(t, o, crypto.randomUUID(), i.messages);
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
			this._error = xt[t] ?? "The reply could not be completed. Your message is ready to try again.";
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
		return w`<div class="chat">
      <header><p class="eyebrow">Local AI · Read-only chat</p><h1>Talk to your local AI</h1>
        <p class="intro">Try a question, draft an announcement, or explore an idea.</p></header>
      <section class="controls" aria-label="Chat provider">
        <div class="provider"><label for="provider">Local provider</label>
          <select id="provider" .value=${this._connectionId} ?disabled=${this._busy || this._loading || !this._options?.providers.length}
            @change=${(e) => {
			this._reset(), this._connectionId = e.target.value;
		}}>
            ${this._options?.providers.length ? E : w`<option value="">${this._loading ? "Loading providers…" : "No local provider available"}</option>`}
            ${this._options?.providers.map((e) => w`<option value=${e.connection_id}>${e.title}</option>`)}
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
          ${e ? w`<br>Generation is an explicit trial; this model's capabilities have not been verified.` : E}
        </div>
      </details>
      ${!this._loading && this._options?.providers.length === 0 ? w`<p class="setup-hint">Add a local connection in <a href="/config/integrations/integration/ai_orchestrator">provider settings</a>, then refresh providers.</p>` : E}
      <div class="transcript" role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions text">
        ${this._history.length === 0 && !this._busy ? w`<div class="empty"><h2>A fresh conversation</h2><p>For example: “Draft a friendly reminder to close a window.”<br>This chat can write the words; it cannot check or control devices.</p></div>` : E}
        ${this._history.map((e) => w`<article class="message ${e.role}"><strong>${e.role === "user" ? "You" : "AI reply"}</strong><p>${e.content}</p></article>`)}
        ${this._busy ? w`<article class="message user"><strong>You</strong><p>${this._pendingPrompt}</p></article><p class="pending" role="status">Waiting for your local provider…</p>` : E}
      </div>
      ${this._error ? w`<div class="error" role="alert">${this._error}</div>` : E}
      ${this._notice ? w`<p class="notice" role="status">${this._notice}</p>` : E}
      <form class="compose" @submit=${(e) => void this._send(e)}>
        <label for="message">Your message</label>
        <textarea id="message" rows="1" maxlength=${W.max_message_chars} .value=${this._draft} ?disabled=${this._busy}
          placeholder="Ask your local AI…" aria-describedby="compose-hint"
          @input=${(e) => {
			let t = e.target;
			this._draft = t.value, this._autoGrow(t);
		}}
          @keydown=${(e) => {
			e.key === "Enter" && (e.ctrlKey || e.metaKey) && this._send(e);
		}}></textarea>
        <div class="compose-footer"><span id="compose-hint" class="hint">${this._draft.length} / ${W.max_message_chars} · Ctrl/⌘ + Enter to send</span>
          <button class="primary" type="submit" ?disabled=${this._busy || this._loading || !e || !this._draft.trim()}>${this._busy ? "Waiting…" : "Send"}</button></div>
      </form>
    </div>`;
	}
}, Ct = 131072, wt = {
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
}, Y = class extends Error {
	constructor() {
		super("Workflow preview response is unsupported.");
	}
};
function Tt(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function Et(e, t) {
	return Object.keys(e).length === t.length && t.every((t) => Object.hasOwn(e, t));
}
function Dt(e, t, n) {
	return Array.isArray(e) && e.length <= t && e.every((e, t) => Tt(e) && Et(e, [
		"index",
		"passed",
		"reason"
	]) && e.index === t && typeof e.passed == "boolean" && typeof e.reason == "string" && n.includes(e.reason) && e.passed === (e.reason === "matched"));
}
var Ot = [
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
function kt(e, t, n) {
	return Tt(e) && Et(e, n ? ["schema_version", ...Ot] : Ot) && (!n || e.schema_version === 1) && e.mode === t;
}
function At(e) {
	if (!kt(e, "observation_only", !1)) throw new Y();
	return Mt(e);
}
function jt(e) {
	if (!kt(e, "offline", !0)) throw new Y();
	return Mt(e);
}
function Mt(e) {
	if (typeof e.enabled != "boolean" || typeof e.triggered != "boolean" || typeof e.conditions_passed != "boolean" || typeof e.eligible != "boolean" || e.provider_calls !== 0 || e.actions_executed !== 0 || !Dt(e.trigger_results, 10, [
		"matched",
		"event_kind_mismatch",
		"state_unchanged",
		"entity_not_selected",
		"target_state_mismatch",
		"time_mismatch"
	]) || !Dt(e.condition_results, 20, [
		"matched",
		"outside_time_window",
		"state_unavailable",
		"state_mismatch",
		"state_not_numeric",
		"outside_numeric_bounds"
	]) || !Array.isArray(e.planned_steps) || e.planned_steps.length > 25 || !e.planned_steps.every((e, t) => Tt(e) && Et(e, ["index", "kind"]) && e.index === t && [
		"ai_compose",
		"ai_classify",
		"notify"
	].includes(e.kind)) || e.triggered !== e.trigger_results.some((e) => e.passed) || e.conditions_passed !== e.condition_results.every((e) => e.passed) || e.eligible !== e.planned_steps.length > 0 || e.eligible && (!e.triggered || !e.conditions_passed)) throw new Y();
	return e;
}
async function Nt(e, t, n) {
	if (!t.trim() || !n.trim() || t.length > 131072 || n.length > 131072) throw new Y();
	return jt(await e.callWS({
		type: "ai_orchestrator/workflow/preview",
		workflow_json: t,
		snapshot_json: n
	}));
}
var Pt = [
	"ready",
	"unreadable",
	"not_loaded"
], Ft = ["activation_failed", "cleanup_failed"], X = class extends Error {
	constructor() {
		super("The workflow response does not match the supported contract."), this.name = "WorkflowContractError";
	}
}, It = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
function Z(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function Q(e, t) {
	return Object.keys(e).length === t.length && t.every((t) => Object.hasOwn(e, t));
}
function Lt(e, t) {
	return Array.isArray(e) && e.length <= t && e.every(Z);
}
function Rt(e) {
	return Number.isSafeInteger(e) && e >= 0;
}
function zt(e) {
	if (!Z(e) || !Q(e, [
		"schema_version",
		"workflow_id",
		"name",
		"description",
		"enabled",
		"triggers",
		"conditions",
		"steps"
	]) || e.schema_version !== 1 || typeof e.workflow_id != "string" || !It.test(e.workflow_id) || typeof e.name != "string" || e.name.trim() === "" || e.name.length > 128 || typeof e.description != "string" || e.description.length > 512 || typeof e.enabled != "boolean" || !Lt(e.triggers, 10) || !Lt(e.conditions, 20) || !Lt(e.steps, 25)) throw new X();
	return {
		schema_version: 1,
		workflow_id: e.workflow_id,
		name: e.name,
		description: e.description,
		enabled: e.enabled,
		triggers: e.triggers,
		conditions: e.conditions,
		steps: e.steps
	};
}
function Bt(e) {
	if (!Z(e) || !Q(e, [
		"active",
		"observations",
		"ignored_events",
		"registrations",
		"latest",
		"error"
	]) || typeof e.active != "boolean" || !Rt(e.observations) || !Rt(e.ignored_events) || !Rt(e.registrations) || e.error !== null && !Ft.includes(e.error) || e.active && e.error !== null) throw new X();
	let t = null;
	if (e.latest !== null) try {
		t = At(e.latest);
	} catch {
		throw new X();
	}
	return {
		active: e.active,
		observations: e.observations,
		ignored_events: e.ignored_events,
		registrations: e.registrations,
		latest: t,
		error: e.error
	};
}
function Vt(e) {
	if (!Array.isArray(e) || e.length > 50) throw new X();
	let t = /* @__PURE__ */ new Set();
	return e.map((e) => {
		if (!Z(e) || !Q(e, ["workflow", "status"])) throw new X();
		let n = zt(e.workflow);
		if (t.has(n.workflow_id)) throw new X();
		return t.add(n.workflow_id), {
			workflow: n,
			status: Bt(e.status)
		};
	});
}
function Ht(e) {
	if (!Z(e) || !Q(e, [
		"schema_version",
		"store",
		"workflows"
	]) || e.schema_version !== 1 || !Pt.includes(e.store)) throw new X();
	let t = Vt(e.workflows);
	if (e.store !== "ready" && t.length > 0) throw new X();
	return {
		schema_version: 1,
		store: e.store,
		workflows: t
	};
}
function Ut(e, t) {
	if (!Z(e) || !Object.hasOwn(e, "workflow")) throw new X();
	let { workflow: n, ...r } = e, i = zt(n);
	if (t !== void 0 && i.workflow_id !== t) throw new X();
	let a = Ht(r);
	if (!a.workflows.some((e) => e.workflow.workflow_id === i.workflow_id)) throw new X();
	return {
		...a,
		workflow: i
	};
}
async function Wt(e) {
	return Ht(await e.callWS({ type: "ai_orchestrator/workflows/list" }));
}
async function Gt(e, t) {
	if (!t.trim() || t.length > 131072) throw new X();
	return Ut(await e.callWS({
		type: "ai_orchestrator/workflows/save",
		workflow_json: t
	}));
}
async function Kt(e, t, n) {
	let r = Ut(await e.callWS({
		type: "ai_orchestrator/workflows/set_enabled",
		workflow_id: t,
		enabled: n
	}), t);
	if (r.workflow.enabled !== n) throw new X();
	return r;
}
async function qt(e, t) {
	let n = Ht(await e.callWS({
		type: "ai_orchestrator/workflows/delete",
		workflow_id: t
	}));
	if (n.workflows.some((e) => e.workflow.workflow_id === t)) throw new X();
	return n;
}
async function Jt(e, t) {
	let n = await e.callWS({
		type: "ai_orchestrator/workflows/run_manual",
		workflow_id: t
	});
	if (!Z(n) || n.schema_version !== 1) throw new X();
	let r = Object.fromEntries(Object.entries(n).filter(([e]) => e !== "schema_version"));
	try {
		return At(r);
	} catch {
		throw new X();
	}
}
//#endregion
//#region src/panel/workflow-preview-view.ts
var Yt = "ai-orchestrator-workflow-preview", Xt = {
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
}, Zt = {
	ai_compose: "Compose text",
	ai_classify: "Classify text",
	notify: "Notification"
}, Qt = class extends N {
	static properties = {
		hass: { attribute: !1 },
		draft: { attribute: !1 },
		_workflow: { state: !0 },
		_snapshot: { state: !0 },
		_busy: { state: !0 },
		_error: { state: !0 },
		_result: { state: !0 },
		_saved: { state: !0 }
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
    .error { color:var(--error-color,#852e23); } li { margin:8px 0; } @media(max-width:700px) { .editors { grid-template-columns:minmax(0,1fr); } textarea { height:220px; } }
  `;
	_sequence = 0;
	_connection;
	_userId;
	_callWS;
	constructor() {
		super(), this._workflow = "", this._snapshot = "", this._busy = !1, this._error = "", this._saved = !1;
	}
	_reset = () => {
		this._invalidate(), this._workflow = "", this._snapshot = "";
	};
	_invalidate() {
		this._sequence++, this._busy = !1, this._error = "", this._result = void 0, this._saved = !1;
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
		e.has("draft") && this.draft !== void 0 && (this._invalidate(), this._workflow = this.draft.json), e.has("hass") && (this._connection !== this.hass?.connection || this._userId !== this.hass?.user?.id || this._callWS !== this.hass?.callWS) && (this._unbind(), this._reset(), this._connection = this.hass?.connection, this._userId = this.hass?.user?.id, this._callWS = this.hass?.callWS, this._connection?.addEventListener("disconnected", this._reset));
	}
	_example(e) {
		this._invalidate(), this._workflow = JSON.stringify(Xt, null, 2), this._snapshot = JSON.stringify({
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
			let t = await Nt(e, this._workflow, this._snapshot);
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
			let t = await Gt(e, this._workflow);
			if (!n()) return;
			this._workflow = JSON.stringify(t.workflow, null, 2), this._saved = !0, this.dispatchEvent(new CustomEvent("workflow-saved", {
				bubbles: !0,
				composed: !0
			}));
		} catch {
			n() && (this._error = "The workflow could not be saved. Check the workflow JSON, administrator access, and the installed integration version.");
		} finally {
			n() && (this._busy = !1);
		}
	};
	render() {
		return w`<section aria-labelledby="preview-title">
      <h1 id="preview-title">Workflow preview</h1>
      <p>Experimental offline JSON editor. Test a draft against a supplied snapshot: previewing reads no live home state, contacts no provider, and executes no action. "Save as workflow" stores the workflow document in Home Assistant; an enabled saved workflow then watches its triggers and records outcomes without running any step.</p>
      <p>Start with a synthetic window example, then edit the workflow or snapshot. The example identifiers are fictional.</p>
      <div class="actions"><button type="button" @click=${() => this._example(!1)}>Load synthetic evening example</button><button type="button" @click=${() => this._example(!0)}>Load synthetic daytime example</button></div>
      <div class="editors"><div><label for="workflow">Workflow JSON</label><textarea id="workflow" spellcheck="false" maxlength=${Ct} .value=${this._workflow} @input=${(e) => this._edit(e, !0)}></textarea></div>
      <div><label for="snapshot">Snapshot JSON</label><textarea id="snapshot" spellcheck="false" maxlength=${Ct} .value=${this._snapshot} @input=${(e) => this._edit(e, !1)}></textarea></div></div>
      <div class="actions"><button class="primary" type="button" ?disabled=${this._busy || !this.hass || this.hass.connection?.connected === !1 || !this._workflow.trim() || !this._snapshot.trim()} @click=${this._preview}>${this._busy ? "Previewing…" : "Preview workflow"}</button><button type="button" ?disabled=${this._busy || !this.hass || this.hass.connection?.connected === !1 || !this._workflow.trim()} @click=${this._save}>${this._busy ? "Working…" : "Save as workflow"}</button><button type="button" @click=${this._reset}>Reset preview</button></div>
      <div role="status" aria-live="polite">${this._error ? w`<p class="error">${this._error}</p>` : E}${this._saved ? w`<p>Workflow saved. It appears in the stored workflows list below.</p>` : E}${this._busy ? w`<p>Evaluating the supplied snapshot…</p>` : E}${this._result ? this._renderResult(this._result) : E}</div>
    </section>`;
	}
	_renderResult(e) {
		return w`<div class="result"><h2>${e.eligible ? "Scenario passes — steps planned" : "Scenario blocked — no steps planned"}</h2>
      <p>Draft enabled flag: ${e.enabled ? "yes" : "no"}. Preview never activates a workflow.</p>
      <h3>Triggers (any must pass)</h3><ul>${e.trigger_results.map((e) => w`<li>Trigger ${e.index + 1}: ${e.passed ? "Pass" : "Fail"} — ${wt[e.reason]}</li>`)}</ul>
      <h3>Conditions (all must pass)</h3>${e.condition_results.length ? w`<ul>${e.condition_results.map((e) => w`<li>Condition ${e.index + 1}: ${e.passed ? "Pass" : "Fail"} — ${wt[e.reason]}</li>`)}</ul>` : w`<p>No conditions.</p>`}
      <h3>Planned steps</h3>${e.planned_steps.length ? w`<ol>${e.planned_steps.map((e) => w`<li>${Zt[e.kind]} — not executed</li>`)}</ol>` : w`<p>No steps planned.</p>`}
      <p>Provider calls: 0 · Actions executed: 0</p></div>`;
	}
};
customElements.define(Yt, Qt);
//#endregion
//#region src/panel/workflows-view.ts
var $t = "ai-orchestrator-workflows", en = {
	load: "Stored workflows could not be read from Home Assistant. Check administrator access and the installed integration version.",
	mutate: "The change could not be completed. Nothing was executed; reload to see the current stored state.",
	observe: "The observation could not be completed. Nothing was executed."
}, tn = class extends N {
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
	_connection;
	_userId;
	_callWS;
	constructor() {
		super(), this.refreshToken = 0, this._viewState = "waiting", this._store = "not_loaded", this._entries = [], this._error = "";
	}
	_reset = () => {
		this._sequence++, this._viewState = "waiting", this._store = "not_loaded", this._entries = [], this._pending = void 0, this._confirmDeleteId = void 0, this._error = "", this._observation = void 0;
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
		let t = ++this._sequence;
		this._viewState = "loading", this._error = "";
		try {
			let n = await Wt(e);
			if (!this._current(t, e)) return;
			this._store = n.store, this._entries = n.workflows, this._viewState = "ready";
		} catch {
			if (!this._current(t, e)) return;
			this._entries = [], this._viewState = "error", this._error = en.load;
		}
	};
	async _mutate(e) {
		let t = this.hass;
		if (t === void 0 || this._pending !== void 0 || t.connection?.connected === !1) return;
		let n = this._sequence;
		this._pending = e, this._error = "", e.action !== "observe" && (this._observation = void 0);
		try {
			if (e.action === "observe") {
				let r = await Jt(t, e.id);
				if (!this._current(n, t)) return;
				this._observation = {
					id: e.id,
					result: r
				};
				let i = await Wt(t);
				if (!this._current(n, t)) return;
				this._store = i.store, this._entries = i.workflows;
				return;
			}
			let r = e.action === "delete" ? await qt(t, e.id) : await Kt(t, e.id, e.action === "enable");
			if (!this._current(n, t)) return;
			this._store = r.store, this._entries = r.workflows, this._confirmDeleteId = void 0;
		} catch {
			if (!this._current(n, t)) return;
			this._error = e.action === "observe" ? en.observe : en.mutate;
		} finally {
			this._current(n, t) && (this._pending = void 0);
		}
	}
	_loadIntoEditor(e) {
		this.dispatchEvent(new CustomEvent("workflow-load", {
			detail: { json: JSON.stringify(e.workflow, null, 2) },
			bubbles: !0,
			composed: !0
		}));
	}
	render() {
		return w`
      <section aria-labelledby="workflows-title">
        <h2 id="workflows-title">Stored workflows</h2>
        <p>
          Enabled workflows watch their triggers in Home Assistant and record whether the
          deterministic conditions passed. No step runs yet: no text is generated, no
          notification is sent, and no device action executes.
        </p>
        <div class="actions">
          <button type="button" ?disabled=${this._viewState === "loading" || !this.hass} @click=${this._load}>
            ${this._viewState === "loading" ? "Loading…" : "Reload workflows"}
          </button>
        </div>
        <div role="status" aria-live="polite">
          ${this._error ? w`<p class="error">${this._error}</p>` : E}
          ${this._store === "unreadable" ? w`<p class="notice error">
                Stored workflows could not be read. Nothing on disk was changed and no workflow is
                active; saving is refused until the storage file is repaired or restored.
              </p>` : E}
        </div>
        ${this._renderList()}
      </section>
    `;
	}
	_renderList() {
		return this._viewState === "ready" ? this._entries.length === 0 ? w`<p class="notice">No stored workflows. Use "Save as workflow" in the editor above.</p>` : w`<div class="list" role="list" aria-label="Stored workflows">
      ${this._entries.map((e) => this._renderEntry(e))}
    </div>` : E;
	}
	_renderEntry(e) {
		let { workflow: t, status: n } = e, r = t.workflow_id, i = this._pending !== void 0, a = this._pending?.id === r ? this._pending.action : void 0, o = n.error === null ? n.active ? "active" : "inactive" : "error", s = n.error === "activation_failed" ? "Activation failed" : n.error === "cleanup_failed" ? "Cleanup pending" : n.active ? "Active" : t.enabled ? "Enabled, not active" : "Disabled", c = this._observation?.id === r ? this._observation.result : void 0;
		return w`
      <article class="card" role="listitem">
        <div class="card-header">
          <h3>${t.name}</h3>
          <span class="badge ${o}">${s}</span>
        </div>
        ${t.description ? w`<p class="meta">${t.description}</p>` : E}
        <p class="meta">
          ${t.triggers.length} trigger(s) · ${t.conditions.length} condition(s) ·
          ${t.steps.length} step(s)
        </p>
        <p class="meta">
          Observations ${n.observations} · Ignored events ${n.ignored_events} ·
          Listeners ${n.registrations}
        </p>
        ${n.latest ? this._renderOutcome("Latest observation", n.latest) : E}
        ${c ? this._renderOutcome("Manual observation", c) : E}
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
          <button type="button" ?disabled=${i} @click=${() => this._loadIntoEditor(e)}>
            Load into editor
          </button>
          ${this._confirmDeleteId === r ? w`<button
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
                </button>` : w`<button
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
	_renderOutcome(e, t) {
		return w`<p class="meta">
      ${e}: triggered ${t.triggered ? "yes" : "no"} · conditions
      ${t.conditions_passed ? "passed" : "failed"} ·
      ${t.eligible ? `${t.planned_steps.length} step(s) planned, none executed` : "no steps planned"}
    </p>`;
	}
};
customElements.define($t, tn);
//#endregion
//#region src/panel/ai-orchestrator-panel.ts
var nn = "ai-orchestrator-panel", $ = [
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
], rn = {
	providers: "Provider connections",
	workflows: "Workflow runtime",
	conversation: "Conversation agent",
	ai_task: "AI Task entity"
}, an = {
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
function on(e) {
	let t = e?.path?.split("/").filter(Boolean).at(-1);
	return $.find((e) => e.id === t)?.id;
}
var sn = class extends N {
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
		_draft: { state: !0 }
	};
	static styles = We;
	_draftSequence = 0;
	_hasRequested = !1;
	_requestSequence = 0;
	constructor() {
		super(), this.narrow = !1, this._activeSection = "home", this._loadState = "waiting", this._probeLoadState = "idle", this._workflowsRefresh = 0;
	}
	disconnectedCallback() {
		this._requestSequence += 1, window.removeEventListener("resize", this._onViewportChange), window.visualViewport?.removeEventListener("resize", this._onViewportChange), super.disconnectedCallback();
	}
	willUpdate(e) {
		if (e.has("route")) {
			let e = on(this.route);
			e !== void 0 && (this._activeSection = e);
		}
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
		super.connectedCallback(), window.addEventListener("resize", this._onViewportChange, { passive: !0 }), window.visualViewport?.addEventListener("resize", this._onViewportChange, { passive: !0 });
	}
	updated(e) {
		e.has("hass") && this.hass !== void 0 && !this._hasRequested && queueMicrotask(() => void this._refreshStatus()), this.classList.toggle("chat-host", this._activeSection === "chat"), this._syncChatHeight();
	}
	render() {
		let e = this._activeSection === "chat";
		return w`
      <div class="app-frame ${this.narrow ? "narrow" : ""} ${e ? "chat-mode" : ""}">
        ${this._renderSidebar()}
        <main class="workspace" id="main-content" tabindex="-1">
          <div class="workspace-inner">
            ${this._activeSection === "home" ? this._renderHome() : this._activeSection === "automations" ? this._renderWorkflowProbe() : e ? w`<ai-orchestrator-chat-view .hass=${this.hass}></ai-orchestrator-chat-view>` : this._activeSection === "providers" ? this._renderProviders() : this._activeSection === "permissions" ? this._renderCatalog() : this._renderPlaceholder(this._activeSection)}
          </div>
        </main>
      </div>
    `;
	}
	_renderSidebar() {
		return w`
      <aside class="sidebar">
        <div class="brand">
          <span class="brand-mark" aria-hidden="true">AI</span>
          <div class="brand-copy">
            <p class="brand-title">AI Orchestrator</p>
          <p class="brand-subtitle">Local provider preview</p>
          </div>
        </div>

        <nav class="section-nav" aria-label="AI Orchestrator sections">
          ${$.map((e) => w`
              <button
                class="nav-button"
                type="button"
                aria-current=${this._activeSection === e.id ? "page" : E}
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
          catalogue sends no household context to AI. Device actions remain unavailable.
        </div>
      </aside>
    `;
	}
	_renderHome() {
		let e = this._statusHeading();
		return w`
      <header class="page-header">
        <div>
          <p class="eyebrow">Private Home Assistant AI</p>
          <h1>Build from a verified foundation</h1>
          <p class="page-intro">
            Set up a local provider, browse your entity catalogue, and try a read-only chat.
            Workflow execution, device permissions, and Assist remain in development.
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
          ${this._loadState === "loading" ? w`<div class="loading-bar" role="progressbar" aria-label="Checking integration status"></div>` : E}
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
	_renderFeatureCard() {
		return w`
      <section class="card" aria-labelledby="feature-status-heading">
        <h2 id="feature-status-heading">Foundation capabilities</h2>
        <p class="card-intro">Values come from the versioned integration status response.</p>
        <ul class="status-list">
          ${P.map((e) => {
			let t = this._loadState === "ready", n = t && this._status?.features[e] === !0, r = t ? n ? "Available" : "Not available" : "Unknown";
			return w`
              <li class="status-row">
                <span>
                  <span class="status-name">${rn[e]}</span>
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
		return w`
      <section class="card" aria-labelledby="next-steps-heading">
        <h2 id="next-steps-heading">What happens next</h2>
        <p class="card-intro">Each capability opens only after its own verification gate.</p>
        <ol class="next-list">
          <li>
            <strong>Confirm the panel lifecycle</strong>
            Load, reload, mobile layout, caching, and upgrade behavior must be tested on the target
            Home Assistant version.
          </li>
          <li>
            <strong>Connect a verified local provider</strong>
            Provider setup will require live endpoint, authentication, model, and capability evidence.
          </li>
          <li>
            <strong>Discover permissions from Home Assistant</strong>
            Entity and action choices will come from live registries and begin with no AI access.
          </li>
        </ol>
      </section>
    `;
	}
	_renderPlaceholder(e) {
		let t = an[e], n = $.find((t) => t.id === e)?.label ?? "Section";
		return w`
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
		return w`
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
		return w`
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
		return w`
      <header class="page-header">
        <div>
          <p class="eyebrow">Entities & Permissions</p>
          <h1>Home Assistant registry catalogue</h1>
          <p class="page-intro">
            Browse current entity, device, and area metadata from Home Assistant. No state values
            or attributes are included, and every entity begins with no AI access.
          </p>
        </div>
        <span class="privacy-badge">Read-only · AI access none</span>
      </header>
      <ai-orchestrator-catalog-view .hass=${this.hass}></ai-orchestrator-catalog-view>
    `;
	}
	_renderWorkflowProbeResult() {
		return this._probeLoadState === "ready" && this._probeResult !== void 0 ? w`
        <strong>One trigger produced exactly one execution.</strong>
        <span>
          Runtime execution ${this._probeResult.execution_count}; listener registration
          ${this._probeResult.registration_count}. Provider contacted: no. Home Assistant action
          called: no.
        </span>
      ` : this._probeLoadState === "error" ? w`
        <strong>The lifecycle probe was not confirmed.</strong>
        <span>No provider or Home Assistant action was called. Check the integration and logs.</span>
      ` : this._probeLoadState === "loading" ? w`<span>Waiting for the bounded integration response.</span>` : w`<span>No lifecycle probe has run in this panel session.</span>`;
	}
	_renderStatusAction() {
		return this._loadState === "loading" ? E : this._loadState === "ready" && this._status?.configured === !1 ? w`
        <div class="hero-actions">
          <button class="secondary-button" type="button" @click=${this._refreshStatus}>
            Check again
          </button>
        </div>
      ` : [
			"denied",
			"incompatible",
			"error"
		].includes(this._loadState) ? w`
        <div class="hero-actions">
          <button class="primary-button" type="button" @click=${this._refreshStatus}>Retry status check</button>
        </div>
      ` : E;
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
			let n = await Fe(e);
			if (t !== this._requestSequence || !this.isConnected) return;
			this._status = n, this._loadState = "ready";
		} catch (e) {
			if (t !== this._requestSequence || !this.isConnected) return;
			this._status = void 0, this._loadState = e instanceof F ? "incompatible" : Ie(e) ? "denied" : "error";
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
			this._probeResult = await Ue(e), this._probeLoadState = "ready";
		} catch {
			this._probeResult = void 0, this._probeLoadState = "error";
		}
	};
}, cn = "ai-orchestrator-providers-view", ln = "ai-orchestrator-catalog-view";
customElements.get("ai-orchestrator-chat-view") === void 0 && customElements.define(bt, St), customElements.get("ai-orchestrator-panel") === void 0 && customElements.define(nn, sn), customElements.get("ai-orchestrator-providers-view") === void 0 && customElements.define(cn, mt), customElements.get("ai-orchestrator-catalog-view") === void 0 && customElements.define(ln, $e);
//#endregion
export { sn as AiOrchestratorPanel, ln as CATALOG_VIEW_TAG, bt as CHAT_VIEW_TAG, $e as CatalogView, St as ChatView, nn as PANEL_TAG, cn as PROVIDERS_VIEW_TAG, mt as ProvidersView };
