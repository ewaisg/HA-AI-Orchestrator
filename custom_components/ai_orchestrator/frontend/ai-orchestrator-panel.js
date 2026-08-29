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
var g = globalThis, _ = (e) => e, v = g.trustedTypes, y = v ? v.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, b = "$lit$", x = `lit$${Math.random().toFixed(9).slice(2)}$`, ce = "?" + x, le = `<${ce}>`, S = document, C = () => S.createComment(""), w = (e) => e === null || typeof e != "object" && typeof e != "function", T = Array.isArray, ue = (e) => T(e) || typeof e?.[Symbol.iterator] == "function", E = "[ 	\n\f\r]", D = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, de = /-->/g, fe = />/g, O = RegExp(`>|${E}(?:([^\\s"'>=/]+)(${E}*=${E}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), k = /'/g, A = /"/g, j = /^(?:script|style|textarea|title)$/i, M = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), N = Symbol.for("lit-noChange"), P = Symbol.for("lit-nothing"), pe = /* @__PURE__ */ new WeakMap(), F = S.createTreeWalker(S, 129);
function me(e, t) {
	if (!T(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return y === void 0 ? t : y.createHTML(t);
}
var he = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = D;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === D ? c[1] === "!--" ? o = de : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = O) : (j.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = O) : o = fe : o === O ? c[0] === ">" ? (o = i ?? D, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? O : c[3] === "\"" ? A : k) : o === A || o === k ? o = O : o === de || o === fe ? o = D : (o = O, i = void 0);
		let d = o === O && e[t + 1].startsWith("/>") ? " " : "";
		a += o === D ? n + le : l >= 0 ? (r.push(s), n.slice(0, l) + b + n.slice(l) + x + d) : n + x + (l === -2 ? t : d);
	}
	return [me(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, I = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = he(t, n);
		if (this.el = e.createElement(l, r), F.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = F.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(b)) {
					let t = u[o++], n = i.getAttribute(e).split(x), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? _e : r[1] === "?" ? ve : r[1] === "@" ? ye : z
					}), i.removeAttribute(e);
				} else e.startsWith(x) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (j.test(i.tagName)) {
					let e = i.textContent.split(x), t = e.length - 1;
					if (t > 0) {
						i.textContent = v ? v.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], C()), F.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], C());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === ce) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(x, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += x.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = S.createElement("template");
		return n.innerHTML = e, n;
	}
};
function L(e, t, n = e, r) {
	if (t === N) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = w(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = L(e, i._$AS(e, t.values), i, r)), t;
}
var ge = class {
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? S).importNode(t, !0);
		F.currentNode = r;
		let i = F.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new R(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new be(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = F.nextNode(), a++);
		}
		return F.currentNode = S, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, R = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = P, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
		e = L(this, e, t), w(e) ? e === P || e == null || e === "" ? (this._$AH !== P && this._$AR(), this._$AH = P) : e !== this._$AH && e !== N && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? ue(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== P && w(this._$AH) ? this._$AA.nextSibling.data = e : this.T(S.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = I.createElement(me(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new ge(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = pe.get(e.strings);
		return t === void 0 && pe.set(e.strings, t = new I(e)), t;
	}
	k(t) {
		T(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(C()), this.O(C()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = _(e).nextSibling;
			_(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, z = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = P, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = P;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = L(this, e, t, 0), a = !w(e) || e !== this._$AH && e !== N, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = L(this, r[n + o], t, o), s === N && (s = this._$AH[o]), a ||= !w(s) || s !== this._$AH[o], s === P ? e = P : e !== P && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === P ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, _e = class extends z {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === P ? void 0 : e;
	}
}, ve = class extends z {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== P);
	}
}, ye = class extends z {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = L(this, e, t, 0) ?? P) === N) return;
		let n = this._$AH, r = e === P && n !== P || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== P && (n === P || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, be = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		L(this, e);
	}
}, xe = g.litHtmlPolyfillSupport;
xe?.(I, R), (g.litHtmlVersions ??= []).push("3.3.3");
var Se = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new R(t.insertBefore(C(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, B = globalThis, V = class extends h {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Se(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return N;
	}
};
V._$litElement$ = !0, V.finalized = !0, B.litElementHydrateSupport?.({ LitElement: V });
var Ce = B.litElementPolyfillSupport;
Ce?.({ LitElement: V }), (B.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region src/api/status-client.ts
var we = Object.freeze({ type: "ai_orchestrator/status" }), H = [
	"providers",
	"workflows",
	"conversation",
	"ai_task"
], U = class extends Error {
	constructor() {
		super("The status response does not match the supported foundation contract."), this.name = "StatusContractError";
	}
};
function W(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function Te(e, t) {
	return Object.keys(e).length === t.length && t.every((t) => Object.hasOwn(e, t));
}
function Ee(e) {
	if (!W(e) || !Te(e, [
		"schema_version",
		"phase",
		"configured",
		"features"
	]) || !W(e.features) || !Te(e.features, H)) throw new U();
	let t = e.features;
	if (e.schema_version !== 1 || e.phase !== "foundation" || typeof e.configured != "boolean" || H.some((e) => typeof t[e] != "boolean")) throw new U();
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
async function De(e) {
	return Ee(await e.callWS({ ...we }));
}
function Oe(e) {
	return W(e) && e.code === "unauthorized";
}
//#endregion
//#region src/api/workflow-probe-client.ts
var ke = Object.freeze({ type: "ai_orchestrator/workflow/probe/run" }), Ae = class extends Error {
	constructor() {
		super("The workflow lifecycle probe response does not match the supported contract."), this.name = "WorkflowProbeContractError";
	}
};
function je(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function Me(e, t) {
	return Object.keys(e).length === t.length && t.every((t) => Object.hasOwn(e, t));
}
function Ne(e) {
	return typeof e == "number" && Number.isInteger(e) && e > 0;
}
function Pe(e) {
	if (!je(e) || !Me(e, [
		"schema_version",
		"workflow_id",
		"trigger_type",
		"execution_count",
		"executions_for_trigger",
		"registration_count",
		"provider_contacted",
		"home_assistant_action_called"
	]) || e.schema_version !== 1 || e.workflow_id !== "foundation_lifecycle_probe" || e.trigger_type !== "integration_event" || !Ne(e.execution_count) || e.executions_for_trigger !== 1 || !Ne(e.registration_count) || e.provider_contacted !== !1 || e.home_assistant_action_called !== !1) throw new Ae();
	return e;
}
async function Fe(e) {
	return Pe(await e.callWS({ ...ke }));
}
//#endregion
//#region src/styles/panel-styles.ts
var Ie = o`
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
`, Le = Object.freeze({ type: "ai_orchestrator/catalog/list" }), Re = [
	"available",
	"unavailable",
	"not_loaded"
], ze = ["entity", "device"], G = 1e4;
function K(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function q(e, t) {
	let n = Object.keys(e).sort(), r = [...t].sort();
	return n.length === r.length && n.every((e, t) => e === r[t]);
}
function J(e) {
	return e === null || typeof e == "string";
}
function Y(e) {
	return typeof e == "string" && e.length > 0 && e.length <= 255;
}
function Be(e) {
	if (!Array.isArray(e) || e.length > G) throw Error("Invalid area catalogue");
	return e.map((e) => {
		if (!K(e) || !q(e, ["area_id", "name"]) || !Y(e.area_id) || typeof e.name != "string" || e.name.trim() === "") throw Error("Invalid area entry");
		return {
			area_id: e.area_id,
			name: e.name
		};
	});
}
function Ve(e) {
	if (!Array.isArray(e) || e.length > G) throw Error("Invalid device catalogue");
	return e.map((e) => {
		if (!K(e) || !q(e, [
			"device_id",
			"name",
			"area_id",
			"manufacturer",
			"model",
			"disabled"
		]) || !Y(e.device_id) || !J(e.name) || e.area_id !== null && !Y(e.area_id) || !J(e.manufacturer) || !J(e.model) || typeof e.disabled != "boolean") throw Error("Invalid device entry");
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
function He(e) {
	if (!Array.isArray(e) || e.length > G) throw Error("Invalid entity catalogue");
	return e.map((e) => {
		if (!K(e) || !q(e, [
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
		]) || !Y(e.registry_id) || typeof e.entity_id != "string" || !/^[a-z0-9_]+\.[a-z0-9_]+$/u.test(e.entity_id) || typeof e.domain != "string" || e.domain !== e.entity_id.split(".", 1)[0] || !Y(e.platform) || !J(e.name) || e.device_id !== null && !Y(e.device_id) || e.area_id !== null && !Y(e.area_id) || e.area_source !== null && !ze.includes(e.area_source) || e.area_source === null != (e.area_id === null) || typeof e.disabled != "boolean" || !Re.includes(e.availability)) throw Error("Invalid entity entry");
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
function Ue(e) {
	if (!K(e) || !q(e, [
		"schema_version",
		"areas",
		"devices",
		"entities"
	]) || e.schema_version !== 1) throw Error("Invalid catalogue response");
	return {
		schema_version: 1,
		areas: Be(e.areas),
		devices: Ve(e.devices),
		entities: He(e.entities)
	};
}
async function We(e) {
	return Ue(await e.callWS({ ...Le }));
}
//#endregion
//#region src/panel/catalog-view.ts
var Ge = class extends V {
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
		if (this._state === "loading") return M`<div class="message" role="status" aria-busy="true">Reading Home Assistant registries…</div>`;
		if (this._state === "error") return M`<div class="message"><p>The registry catalogue could not be loaded.</p><button type="button" @click=${this._load}>Retry</button></div>`;
		let e = this._catalog;
		if (e === void 0 || this._state === "empty") return M`<div class="message"><p>No registered entities are available.</p><button type="button" @click=${this._load}>Refresh</button></div>`;
		let t = this._filteredEntities(e);
		return M`
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
      ${t.length === 0 ? M`<div class="message" role="status">No entities match this search.</div>` : this._renderTable(e, t)}
    `;
	}
	_renderTable(e, t) {
		let n = new Map(e.areas.map((e) => [e.area_id, e.name])), r = new Map(e.devices.map((e) => [e.device_id, e]));
		return M`
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
		return M`
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
				this._catalog = await We(this.hass), this._state = this._catalog.entities.length === 0 ? "empty" : "ready";
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
}, Ke = Object.freeze({ type: "ai_orchestrator/providers/list" }), qe = [
	"healthy",
	"degraded",
	"unavailable",
	"authentication_required",
	"not_tested"
], Je = [
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
function X(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function Z(e, t) {
	let n = Object.keys(e).sort(), r = [...t].sort();
	return n.length === r.length && n.every((e, t) => e === r[t]);
}
function Ye(e) {
	return typeof e == "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(e);
}
function Xe(e) {
	return typeof e == "string" && qe.includes(e);
}
function Ze(e) {
	return typeof e == "string" && Je.includes(e);
}
function Qe(e) {
	return typeof e == "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.test(e) && !Number.isNaN(Date.parse(e));
}
function $e(e) {
	if (!X(e) || !Z(e, ["schema_version", "providers"]) || e.schema_version !== 1 || !Array.isArray(e.providers)) throw Error("Invalid provider list response");
	let t = [];
	for (let n of e.providers) {
		if (!X(n) || !Z(n, [
			"connection_id",
			"provider_type",
			"display_name",
			"title",
			"health",
			"last_tested_at"
		]) || !Ye(n.connection_id) || typeof n.provider_type != "string" || !/^[a-z][a-z0-9_]{0,63}$/u.test(n.provider_type) || typeof n.display_name != "string" || n.display_name.trim() === "" || typeof n.title != "string" || n.title.trim() === "" || !Xe(n.health) || n.last_tested_at !== null && !Qe(n.last_tested_at) || n.health === "not_tested" != (n.last_tested_at === null)) throw Error("Invalid provider entry in list");
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
function et(e, t) {
	if (!X(e) || !Z(e, [
		"schema_version",
		"connection_id",
		"health",
		"error_code",
		"last_tested_at"
	]) || e.schema_version !== 1 || !Ye(e.connection_id) || t !== void 0 && e.connection_id !== t || !Xe(e.health) || e.error_code !== null && !Ze(e.error_code) || e.health === "healthy" && e.error_code !== null || e.health !== "healthy" && e.error_code === null || e.health === "not_tested" || !Qe(e.last_tested_at)) throw Error("Invalid provider test response");
	return {
		schema_version: 1,
		connection_id: e.connection_id,
		health: e.health,
		error_code: e.error_code,
		last_tested_at: e.last_tested_at
	};
}
async function tt(e) {
	return $e(await e.callWS({ ...Ke }));
}
async function nt(e, t) {
	return et(await e.callWS({
		type: "ai_orchestrator/providers/test",
		connection_id: t
	}), t);
}
//#endregion
//#region src/panel/providers-view.ts
var rt = "/config/integrations/integration/ai_orchestrator", it = {
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
}, at = {
	healthy: "Healthy",
	degraded: "Degraded",
	unavailable: "Unavailable",
	authentication_required: "Authentication required",
	not_tested: "Not tested"
}, Q = class extends V {
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
		return this._viewState === "loading" ? M`<div role="status" aria-label="Loading providers" aria-busy="true">
        Loading provider connections…
      </div>` : this._viewState === "error" ? M`
        <div class="error-state">
          <p>Could not load provider connections.</p>
          <button class="refresh-button" type="button" @click=${this._loadProviders}>
            Retry
          </button>
        </div>
      ` : this._viewState === "empty" ? M`
        <div class="empty-state">
          <h3>No provider connections</h3>
          <p>
            Add a provider through Home Assistant's AI Orchestrator integration page.
            Credentials stay in the backend config flow and never return to this panel.
          </p>
          <a class="primary-link" href=${rt}>Add provider connection</a>
        </div>
      ` : M`
      <div class="provider-toolbar">
        <a class="primary-link" href=${rt}>Manage provider connections</a>
      </div>
      <div class="provider-grid" role="list" aria-label="Provider connections">
        ${this._providers.map((e) => this._renderProviderCard(e))}
      </div>
    `;
	}
	_renderProviderCard(e) {
		let t = this._testStates.get(e.connection_id) ?? "idle", n = this._testResults.get(e.connection_id), r = n === "transport_failure" ? "unavailable" : n?.health ?? e.health, i = n === "transport_failure" ? e.last_tested_at : n?.last_tested_at ?? e.last_tested_at;
		return M`
      <article class="provider-card" role="listitem">
        <div class="provider-card-header">
          <div>
            <h3 class="provider-name">${e.title}</h3>
            <span class="provider-type">${e.display_name}</span>
          </div>
          <span class="state-badge ${r}">${at[r]}</span>
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
		if (e === "checking") return M`<span class="test-result checking" role="status" aria-live="polite">
        Checking…
      </span>`;
		if (t === "transport_failure") return M`<span class="test-result unavailable" role="status" aria-live="polite">
        Test failed
      </span>`;
		if (t?.health === "healthy") return M`<span class="test-result healthy" role="status" aria-live="polite">
        Connection test passed
      </span>`;
		if (t !== void 0) {
			let e = it[t.error_code ?? "unknown"] ?? "Test failed";
			return M`<span
        class="test-result ${t.health}"
        role="status"
        aria-live="polite"
      >${e}</span>`;
		}
		return P;
	}
	_loadProviders = async () => {
		let e = this.hass;
		if (e !== void 0) {
			this._hasLoaded = !0, this._viewState = "loading";
			try {
				let t = await tt(e);
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
		if (t !== void 0) {
			this._testStates = new Map(this._testStates).set(e, "checking"), this.requestUpdate();
			try {
				let n = await nt(t, e), r = new Map(this._testStates), i = new Map(this._testResults);
				r.set(e, "idle"), i.set(e, n), this._testStates = r, this._testResults = i;
			} catch {
				this._testStates = new Map(this._testStates).set(e, "idle"), this._testResults = new Map(this._testResults).set(e, "transport_failure");
			}
		}
	}
}, ot = "ai-orchestrator-panel", $ = [
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
], st = {
	providers: "Provider connections",
	workflows: "Workflow runtime",
	conversation: "Conversation agent",
	ai_task: "AI Task entity"
}, ct = {
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
function lt(e) {
	let t = e?.path?.split("/").filter(Boolean).at(-1);
	return $.find((e) => e.id === t)?.id;
}
var ut = class extends V {
	static properties = {
		hass: { attribute: !1 },
		narrow: { type: Boolean },
		route: { attribute: !1 },
		panel: { attribute: !1 },
		_activeSection: { state: !0 },
		_loadState: { state: !0 },
		_status: { state: !0 },
		_probeLoadState: { state: !0 },
		_probeResult: { state: !0 }
	};
	static styles = Ie;
	_hasRequested = !1;
	_requestSequence = 0;
	constructor() {
		super(), this.narrow = !1, this._activeSection = "home", this._loadState = "waiting", this._probeLoadState = "idle";
	}
	disconnectedCallback() {
		this._requestSequence += 1, super.disconnectedCallback();
	}
	willUpdate(e) {
		if (e.has("route")) {
			let e = lt(this.route);
			e !== void 0 && (this._activeSection = e);
		}
	}
	updated(e) {
		e.has("hass") && this.hass !== void 0 && !this._hasRequested && queueMicrotask(() => void this._refreshStatus());
	}
	render() {
		return M`
      <div class="app-frame ${this.narrow ? "narrow" : ""}">
        ${this._renderSidebar()}
        <main class="workspace" id="main-content" tabindex="-1">
          <div class="workspace-inner">
            ${this._activeSection === "home" ? this._renderHome() : this._activeSection === "automations" ? this._renderWorkflowProbe() : this._activeSection === "providers" ? this._renderProviders() : this._activeSection === "permissions" ? this._renderCatalog() : this._renderPlaceholder(this._activeSection)}
          </div>
        </main>
      </div>
    `;
	}
	_renderSidebar() {
		return M`
      <aside class="sidebar">
        <div class="brand">
          <span class="brand-mark" aria-hidden="true">AI</span>
          <div class="brand-copy">
            <p class="brand-title">AI Orchestrator</p>
          <p class="brand-subtitle">Local provider preview</p>
          </div>
        </div>

        <nav class="section-nav" aria-label="AI Orchestrator sections">
          ${$.map((e) => M`
              <button
                class="nav-button"
                type="button"
                aria-current=${this._activeSection === e.id ? "page" : P}
                @click=${() => this._selectSection(e.id)}
              >
                <span class="nav-marker" aria-hidden="true"></span>
                <span>${e.label}</span>
              </button>
            `)}
        </nav>

        <div class="sidebar-note">
          <strong>Explicit provider tests only</strong>
          Status and provider lists stay inside Home Assistant. A provider is contacted only after
          an administrator selects Test connection; no entity state or prompt is sent.
        </div>
      </aside>
    `;
	}
	_renderHome() {
		let e = this._statusHeading();
		return M`
      <header class="page-header">
        <div>
          <p class="eyebrow">Private Home Assistant AI</p>
          <h1>Build from a verified foundation</h1>
          <p class="page-intro">
            This shell reports only what the installed integration confirms. Provider setup,
            entity access, workflows, chat, and actions stay unavailable until their evidence and
            safety gates pass.
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
          ${this._loadState === "loading" ? M`<div class="loading-bar" role="progressbar" aria-label="Checking integration status"></div>` : P}
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
		return M`
      <section class="card" aria-labelledby="feature-status-heading">
        <h2 id="feature-status-heading">Foundation capabilities</h2>
        <p class="card-intro">Values come from the versioned integration status response.</p>
        <ul class="status-list">
          ${H.map((e) => {
			let t = this._loadState === "ready", n = t && this._status?.features[e] === !0, r = t ? n ? "Available" : "Not available" : "Unknown";
			return M`
              <li class="status-row">
                <span>
                  <span class="status-name">${st[e]}</span>
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
		return M`
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
		let t = ct[e], n = $.find((t) => t.id === e)?.label ?? "Section";
		return M`
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
		return M`
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
		return M`
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
		return M`
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
		return this._probeLoadState === "ready" && this._probeResult !== void 0 ? M`
        <strong>One trigger produced exactly one execution.</strong>
        <span>
          Runtime execution ${this._probeResult.execution_count}; listener registration
          ${this._probeResult.registration_count}. Provider contacted: no. Home Assistant action
          called: no.
        </span>
      ` : this._probeLoadState === "error" ? M`
        <strong>The lifecycle probe was not confirmed.</strong>
        <span>No provider or Home Assistant action was called. Check the integration and logs.</span>
      ` : this._probeLoadState === "loading" ? M`<span>Waiting for the bounded integration response.</span>` : M`<span>No lifecycle probe has run in this panel session.</span>`;
	}
	_renderStatusAction() {
		return this._loadState === "loading" ? P : this._loadState === "ready" && this._status?.configured === !1 ? M`
        <div class="hero-actions">
          <button class="secondary-button" type="button" @click=${this._refreshStatus}>
            Check again
          </button>
        </div>
      ` : [
			"denied",
			"incompatible",
			"error"
		].includes(this._loadState) ? M`
        <div class="hero-actions">
          <button class="primary-button" type="button" @click=${this._refreshStatus}>Retry status check</button>
        </div>
      ` : P;
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
			let n = await De(e);
			if (t !== this._requestSequence || !this.isConnected) return;
			this._status = n, this._loadState = "ready";
		} catch (e) {
			if (t !== this._requestSequence || !this.isConnected) return;
			this._status = void 0, this._loadState = e instanceof U ? "incompatible" : Oe(e) ? "denied" : "error";
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
			this._probeResult = await Fe(e), this._probeLoadState = "ready";
		} catch {
			this._probeResult = void 0, this._probeLoadState = "error";
		}
	};
}, dt = "ai-orchestrator-providers-view", ft = "ai-orchestrator-catalog-view";
customElements.get("ai-orchestrator-panel") === void 0 && customElements.define(ot, ut), customElements.get("ai-orchestrator-providers-view") === void 0 && customElements.define(dt, Q), customElements.get("ai-orchestrator-catalog-view") === void 0 && customElements.define(ft, Ge);
//#endregion
export { ut as AiOrchestratorPanel, ft as CATALOG_VIEW_TAG, Ge as CatalogView, ot as PANEL_TAG, dt as PROVIDERS_VIEW_TAG, Q as ProvidersView };
