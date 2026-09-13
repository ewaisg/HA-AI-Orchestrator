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
var ue = globalThis, de = (e) => e, m = ue.trustedTypes, fe = m ? m.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, pe = "$lit$", h = `lit$${Math.random().toFixed(9).slice(2)}$`, me = "?" + h, he = `<${me}>`, g = document, _ = () => g.createComment(""), v = (e) => e === null || typeof e != "object" && typeof e != "function", y = Array.isArray, ge = (e) => y(e) || typeof e?.[Symbol.iterator] == "function", _e = "[ 	\n\f\r]", b = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, ve = /-->/g, ye = />/g, x = RegExp(`>|${_e}(?:([^\\s"'>=/]+)(${_e}*=${_e}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), be = /'/g, xe = /"/g, Se = /^(?:script|style|textarea|title)$/i, S = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), C = Symbol.for("lit-noChange"), w = Symbol.for("lit-nothing"), Ce = /* @__PURE__ */ new WeakMap(), T = g.createTreeWalker(g, 129);
function we(e, t) {
	if (!y(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return fe === void 0 ? t : fe.createHTML(t);
}
var Te = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = b;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === b ? c[1] === "!--" ? o = ve : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = x) : (Se.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = x) : o = ye : o === x ? c[0] === ">" ? (o = i ?? b, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? x : c[3] === "\"" ? xe : be) : o === xe || o === be ? o = x : o === ve || o === ye ? o = b : (o = x, i = void 0);
		let ee = o === x && e[t + 1].startsWith("/>") ? " " : "";
		a += o === b ? n + he : l >= 0 ? (r.push(s), n.slice(0, l) + pe + n.slice(l) + h + ee) : n + h + (l === -2 ? t : ee);
	}
	return [we(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, Ee = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = Te(t, n);
		if (this.el = e.createElement(l, r), T.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = T.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(pe)) {
					let t = u[o++], n = i.getAttribute(e).split(h), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? ke : r[1] === "?" ? Ae : r[1] === "@" ? je : D
					}), i.removeAttribute(e);
				} else e.startsWith(h) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (Se.test(i.tagName)) {
					let e = i.textContent.split(h), t = e.length - 1;
					if (t > 0) {
						i.textContent = m ? m.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], _()), T.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], _());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === me) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(h, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += h.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = g.createElement("template");
		return n.innerHTML = e, n;
	}
};
function E(e, t, n = e, r) {
	if (t === C) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = v(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = E(e, i._$AS(e, t.values), i, r)), t;
}
var De = class {
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? g).importNode(t, !0);
		T.currentNode = r;
		let i = T.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new Oe(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Me(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = T.nextNode(), a++);
		}
		return T.currentNode = g, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, Oe = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = w, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
		e = E(this, e, t), v(e) ? e === w || e == null || e === "" ? (this._$AH !== w && this._$AR(), this._$AH = w) : e !== this._$AH && e !== C && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? ge(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== w && v(this._$AH) ? this._$AA.nextSibling.data = e : this.T(g.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = Ee.createElement(we(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new De(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = Ce.get(e.strings);
		return t === void 0 && Ce.set(e.strings, t = new Ee(e)), t;
	}
	k(t) {
		y(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(_()), this.O(_()), this, this.options)) : r = n[i], r._$AI(a), i++;
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
}, D = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = w, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = w;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = E(this, e, t, 0), a = !v(e) || e !== this._$AH && e !== C, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = E(this, r[n + o], t, o), s === C && (s = this._$AH[o]), a ||= !v(s) || s !== this._$AH[o], s === w ? e = w : e !== w && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === w ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, ke = class extends D {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === w ? void 0 : e;
	}
}, Ae = class extends D {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== w);
	}
}, je = class extends D {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = E(this, e, t, 0) ?? w) === C) return;
		let n = this._$AH, r = e === w && n !== w || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== w && (n === w || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Me = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		E(this, e);
	}
}, Ne = ue.litHtmlPolyfillSupport;
Ne?.(Ee, Oe), (ue.litHtmlVersions ??= []).push("3.3.3");
var Pe = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new Oe(t.insertBefore(_(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, O = globalThis, k = class extends p {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Pe(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return C;
	}
};
k._$litElement$ = !0, k.finalized = !0, O.litElementHydrateSupport?.({ LitElement: k });
var Fe = O.litElementPolyfillSupport;
Fe?.({ LitElement: k }), (O.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region src/api/status-client.ts
var Ie = Object.freeze({ type: "ai_orchestrator/status" }), A = [
	"providers",
	"workflows",
	"conversation",
	"ai_task"
], j = class extends Error {
	constructor() {
		super("The status response does not match the supported foundation contract."), this.name = "StatusContractError";
	}
};
function Le(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function Re(e, t) {
	return Object.keys(e).length === t.length && t.every((t) => Object.hasOwn(e, t));
}
function ze(e) {
	if (!Le(e) || !Re(e, [
		"schema_version",
		"phase",
		"configured",
		"features"
	]) || !Le(e.features) || !Re(e.features, A)) throw new j();
	let t = e.features;
	if (e.schema_version !== 1 || e.phase !== "foundation" || typeof e.configured != "boolean" || A.some((e) => typeof t[e] != "boolean")) throw new j();
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
async function Be(e) {
	return ze(await e.callWS({ ...Ie }));
}
function Ve(e) {
	return Le(e) && e.code === "unauthorized";
}
//#endregion
//#region src/api/workflow-probe-client.ts
var He = Object.freeze({ type: "ai_orchestrator/workflow/probe/run" }), Ue = class extends Error {
	constructor() {
		super("The workflow lifecycle probe response does not match the supported contract."), this.name = "WorkflowProbeContractError";
	}
};
function We(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function Ge(e, t) {
	return Object.keys(e).length === t.length && t.every((t) => Object.hasOwn(e, t));
}
function Ke(e) {
	return typeof e == "number" && Number.isInteger(e) && e > 0;
}
function qe(e) {
	if (!We(e) || !Ge(e, [
		"schema_version",
		"workflow_id",
		"trigger_type",
		"execution_count",
		"executions_for_trigger",
		"registration_count",
		"provider_contacted",
		"home_assistant_action_called"
	]) || e.schema_version !== 1 || e.workflow_id !== "foundation_lifecycle_probe" || e.trigger_type !== "integration_event" || !Ke(e.execution_count) || e.executions_for_trigger !== 1 || !Ke(e.registration_count) || e.provider_contacted !== !1 || e.home_assistant_action_called !== !1) throw new Ue();
	return e;
}
async function Je(e) {
	return qe(await e.callWS({ ...He }));
}
//#endregion
//#region src/styles/panel-styles.ts
var Ye = o`
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
`, Xe = Object.freeze({ type: "ai_orchestrator/catalog/list" }), Ze = [
	"available",
	"unavailable",
	"not_loaded"
], Qe = ["entity", "device"], $e = 1e4;
function M(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function N(e, t) {
	let n = Object.keys(e).sort(), r = [...t].sort();
	return n.length === r.length && n.every((e, t) => e === r[t]);
}
function P(e) {
	return e === null || typeof e == "string";
}
function F(e) {
	return typeof e == "string" && e.length > 0 && e.length <= 255;
}
function et(e) {
	if (!Array.isArray(e) || e.length > $e) throw Error("Invalid area catalogue");
	return e.map((e) => {
		if (!M(e) || !N(e, ["area_id", "name"]) || !F(e.area_id) || typeof e.name != "string" || e.name.trim() === "") throw Error("Invalid area entry");
		return {
			area_id: e.area_id,
			name: e.name
		};
	});
}
function tt(e) {
	if (!Array.isArray(e) || e.length > $e) throw Error("Invalid device catalogue");
	return e.map((e) => {
		if (!M(e) || !N(e, [
			"device_id",
			"name",
			"area_id",
			"manufacturer",
			"model",
			"disabled"
		]) || !F(e.device_id) || !P(e.name) || e.area_id !== null && !F(e.area_id) || !P(e.manufacturer) || !P(e.model) || typeof e.disabled != "boolean") throw Error("Invalid device entry");
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
function nt(e) {
	if (!Array.isArray(e) || e.length > $e) throw Error("Invalid entity catalogue");
	return e.map((e) => {
		if (!M(e) || !N(e, [
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
		]) || !F(e.registry_id) || typeof e.entity_id != "string" || !/^[a-z0-9_]+\.[a-z0-9_]+$/u.test(e.entity_id) || typeof e.domain != "string" || e.domain !== e.entity_id.split(".", 1)[0] || !F(e.platform) || !P(e.name) || e.device_id !== null && !F(e.device_id) || e.area_id !== null && !F(e.area_id) || e.area_source !== null && !Qe.includes(e.area_source) || e.area_source === null != (e.area_id === null) || typeof e.disabled != "boolean" || !Ze.includes(e.availability)) throw Error("Invalid entity entry");
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
function rt(e) {
	if (!M(e) || !N(e, [
		"schema_version",
		"areas",
		"devices",
		"entities",
		"omitted"
	]) || e.schema_version !== 1 || !M(e.omitted) || !N(e.omitted, [
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
		areas: et(e.areas),
		devices: tt(e.devices),
		entities: nt(e.entities),
		omitted: {
			areas: e.omitted.areas,
			devices: e.omitted.devices,
			entities: e.omitted.entities
		}
	};
}
async function it(e) {
	return rt(await e.callWS({ ...Xe }));
}
//#endregion
//#region src/panel/catalog-view.ts
var at = class extends k {
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
		if (this._state === "loading") return S`<div class="message" role="status" aria-busy="true">Reading Home Assistant registries…</div>`;
		if (this._state === "error") return S`<div class="message"><p>The registry catalogue could not be loaded.</p><button type="button" @click=${this._load}>Retry</button></div>`;
		let e = this._catalog;
		if (e === void 0 || this._state === "empty") return S`<div class="message"><p>No registered entities are available.</p><button type="button" @click=${this._load}>Refresh</button></div>`;
		let t = this._filteredEntities(e);
		return S`
      <div class="summary" aria-label="Registry totals">
        <span>${e.entities.length} entities</span>
        <span>${e.devices.length} devices</span>
        <span>${e.areas.length} areas</span>
        <span>AI access: none</span>
      </div>
      ${e.omitted.entities || e.omitted.devices || e.omitted.areas ? S`<p class="message" role="status">The registry is larger than this view's bound: ${e.omitted.entities} entities, ${e.omitted.devices} devices and ${e.omitted.areas} areas are not shown. Narrow the search or use Home Assistant's own registry pages for the rest.</p>` : w}
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
      ${t.length === 0 ? S`<div class="message" role="status">No entities match this search.</div>` : this._renderTable(e, t)}
    `;
	}
	_renderTable(e, t) {
		let n = new Map(e.areas.map((e) => [e.area_id, e.name])), r = new Map(e.devices.map((e) => [e.device_id, e]));
		return S`
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
		return S`
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
				this._catalog = await it(this.hass), this._state = this._catalog.entities.length === 0 ? "empty" : "ready";
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
}, ot = Object.freeze({ type: "ai_orchestrator/providers/list" }), st = [
	"healthy",
	"degraded",
	"unavailable",
	"authentication_required",
	"not_tested"
], ct = [
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
function lt(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function ut(e, t) {
	let n = Object.keys(e).sort(), r = [...t].sort();
	return n.length === r.length && n.every((e, t) => e === r[t]);
}
function dt(e) {
	return typeof e == "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(e);
}
function ft(e) {
	return typeof e == "string" && st.includes(e);
}
function pt(e) {
	return typeof e == "string" && ct.includes(e);
}
function mt(e) {
	return typeof e == "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.test(e) && !Number.isNaN(Date.parse(e));
}
function ht(e) {
	if (!lt(e) || !ut(e, ["schema_version", "providers"]) || e.schema_version !== 1 || !Array.isArray(e.providers)) throw Error("Invalid provider list response");
	let t = [];
	for (let n of e.providers) {
		if (!lt(n) || !ut(n, [
			"connection_id",
			"provider_type",
			"display_name",
			"title",
			"health",
			"last_tested_at"
		]) || !dt(n.connection_id) || typeof n.provider_type != "string" || !/^[a-z][a-z0-9_]{0,63}$/u.test(n.provider_type) || typeof n.display_name != "string" || n.display_name.trim() === "" || typeof n.title != "string" || n.title.trim() === "" || !ft(n.health) || n.last_tested_at !== null && !mt(n.last_tested_at) || n.health === "not_tested" != (n.last_tested_at === null)) throw Error("Invalid provider entry in list");
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
function gt(e, t) {
	if (!lt(e) || !ut(e, [
		"schema_version",
		"connection_id",
		"health",
		"error_code",
		"last_tested_at"
	]) || e.schema_version !== 1 || !dt(e.connection_id) || t !== void 0 && e.connection_id !== t || !ft(e.health) || e.error_code !== null && !pt(e.error_code) || e.health === "healthy" && e.error_code !== null || e.health !== "healthy" && e.error_code === null || e.health === "not_tested" || !mt(e.last_tested_at)) throw Error("Invalid provider test response");
	return {
		schema_version: 1,
		connection_id: e.connection_id,
		health: e.health,
		error_code: e.error_code,
		last_tested_at: e.last_tested_at
	};
}
async function _t(e) {
	return ht(await e.callWS({ ...ot }));
}
async function vt(e, t) {
	return gt(await e.callWS({
		type: "ai_orchestrator/providers/test",
		connection_id: t
	}), t);
}
//#endregion
//#region src/panel/providers-view.ts
var yt = "/config/integrations/integration/ai_orchestrator", bt = {
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
}, xt = {
	healthy: "Healthy",
	degraded: "Degraded",
	unavailable: "Unavailable",
	authentication_required: "Authentication required",
	not_tested: "Not tested"
}, St = class extends k {
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
		return this._viewState === "loading" ? S`<div role="status" aria-label="Loading providers" aria-busy="true">
        Loading provider connections…
      </div>` : this._viewState === "error" ? S`
        <div class="error-state">
          <p>Could not load provider connections.</p>
          <button class="refresh-button" type="button" @click=${this._loadProviders}>
            Retry
          </button>
        </div>
      ` : this._viewState === "empty" ? S`
        <div class="empty-state">
          <h3>No provider connections</h3>
          <p>
            Add a provider through Home Assistant's AI Orchestrator integration page.
            Credentials stay in the backend config flow and never return to this panel.
          </p>
          <a class="primary-link" href=${yt}>Add provider connection</a>
        </div>
      ` : S`
      <div class="provider-toolbar">
        <a class="primary-link" href=${yt}>Manage provider connections</a>
      </div>
      <div class="provider-grid" role="list" aria-label="Provider connections">
        ${this._providers.map((e) => this._renderProviderCard(e))}
      </div>
    `;
	}
	_renderProviderCard(e) {
		let t = this._testStates.get(e.connection_id) ?? "idle", n = this._testResults.get(e.connection_id), r = e.health, i = e.last_tested_at;
		return S`
      <article class="provider-card" role="listitem">
        <div class="provider-card-header">
          <div>
            <h3 class="provider-name">${e.title}</h3>
            <span class="provider-type">${e.display_name}</span>
          </div>
          <span class="state-badge ${r}">${xt[r]}</span>
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
		if (e === "checking") return S`<span class="test-result checking" role="status" aria-live="polite">
        Checking…
      </span>`;
		if (t === "transport_failure") return S`<span
        class="test-result transport-failure"
        role="status"
        aria-live="polite"
      >
        Home Assistant communication failed; provider health unchanged
      </span>`;
		if (t?.health === "healthy") return S`<span class="test-result healthy" role="status" aria-live="polite">
        Connection test passed
      </span>`;
		if (t !== void 0) {
			let e = bt[t.error_code ?? "unknown"] ?? "Test failed";
			return S`<span
        class="test-result ${t.health}"
        role="status"
        aria-live="polite"
      >${e}</span>`;
		}
		return w;
	}
	_loadProviders = async () => {
		let e = this.hass;
		if (e !== void 0) {
			this._hasLoaded = !0, this._viewState = "loading";
			try {
				let t = await _t(e);
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
				let n = await vt(t, e);
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
}, I = Object.freeze({
	max_messages: 21,
	max_message_chars: 4e3,
	max_total_chars: 16e3,
	max_response_chars: 4e3,
	timeout_seconds: 60
}), L = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
function R(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function z(e, t) {
	return Object.keys(e).length === t.length && t.every((t) => Object.hasOwn(e, t));
}
function B(e, t) {
	return typeof e == "string" && e.trim().length > 0 && e.length <= t;
}
function Ct(e) {
	if (!R(e) || !z(e, [
		"schema_version",
		"providers",
		"limits",
		"streaming",
		"household_context",
		"actions",
		"history_persisted"
	]) || e.schema_version !== 1 || e.streaming !== !1 || e.household_context !== !1 || e.actions !== !1 || e.history_persisted !== !1 || !Array.isArray(e.providers) || !R(e.limits) || !z(e.limits, Object.keys(I))) throw Error("Unsupported chat options");
	let t = e.limits;
	if (Object.entries(I).some(([e, n]) => t[e] !== n)) throw Error("Unsupported chat limits");
	let n = /* @__PURE__ */ new Set();
	return {
		schema_version: 1,
		providers: e.providers.map((e) => {
			if (!R(e) || !z(e, [
				"connection_id",
				"title",
				"display_name",
				"destination",
				"capability_verified"
			]) || typeof e.connection_id != "string" || !L.test(e.connection_id) || !B(e.title, 1e3) || !B(e.display_name, 1e3) || e.destination !== "local" || e.capability_verified !== !1 || n.has(e.connection_id)) throw Error("Unsupported chat provider");
			return n.add(e.connection_id), {
				connection_id: e.connection_id,
				title: e.title,
				display_name: e.display_name,
				destination: "local",
				capability_verified: !1
			};
		}),
		limits: I,
		streaming: !1,
		household_context: !1,
		actions: !1,
		history_persisted: !1
	};
}
function wt(e, t, n) {
	if (!R(e) || !z(e, [
		"schema_version",
		"connection_id",
		"request_id",
		"text",
		"destination",
		"streaming"
	]) || e.schema_version !== 1 || e.connection_id !== t || e.request_id !== n || e.destination !== "local" || e.streaming !== !1 || !B(e.text, I.max_response_chars)) throw Error("Unsupported chat response");
	return {
		schema_version: 1,
		connection_id: t,
		request_id: n,
		text: e.text,
		destination: "local",
		streaming: !1
	};
}
async function V(e) {
	return Ct(await e.callWS({ type: "ai_orchestrator/chat/options" }));
}
function H() {
	let e = crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(16));
	e[6] = e[6] & 15 | 64, e[8] = e[8] & 63 | 128;
	let t = [...e].map((e) => e.toString(16).padStart(2, "0")).join("");
	return `${t.slice(0, 8)}-${t.slice(8, 12)}-${t.slice(12, 16)}-${t.slice(16, 20)}-${t.slice(20)}`;
}
async function Tt(e, t, n, r) {
	if (!L.test(t) || !L.test(n) || r.length === 0 || r.length > I.max_messages || r.length % 2 != 1 || r.some((e, t) => e.role !== (t % 2 == 0 ? "user" : "assistant") || !B(e.content, I.max_message_chars)) || r.reduce((e, t) => e + t.content.length, 0) > I.max_total_chars) throw Error("Invalid chat request");
	return wt(await e.callWS({
		type: "ai_orchestrator/chat/send",
		connection_id: t,
		request_id: n,
		messages: r.map(({ role: e, content: t }) => ({
			role: e,
			content: t
		}))
	}), t, n);
}
function Et(e, t) {
	let n = [...e.map((e) => ({ ...e })), {
		role: "user",
		content: t
	}], r = !1;
	for (; n.length > 1 && (n.length > I.max_messages || n.reduce((e, t) => e + t.content.length, 0) > I.max_total_chars);) n.splice(0, 2), r = !0;
	return {
		messages: n,
		omitted: r
	};
}
//#endregion
//#region src/panel/chat-view.ts
var Dt = "ai-orchestrator-chat-view", Ot = {
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
}, kt = class extends k {
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
			let n = await V(e);
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
		if (t === void 0 || this._busy || this._loading || !r || !n || n.length > I.max_message_chars || this.hass?.connection?.connected === !1) return;
		let i = Et(this._history, n), a = ++this._sequence, o = this._connectionId;
		this._busy = !0, this._pendingPrompt = n, this._error = "", this._notice = i.omitted ? "Earlier turns were left out to stay within the conversation limit." : "";
		try {
			let e = await Tt(t, o, H(), i.messages);
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
			this._error = Ot[t] ?? "The reply could not be completed. Your message is ready to try again.";
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
		return S`<div class="chat">
      <header><p class="eyebrow">Local AI · Read-only chat</p><h1>Talk to your local AI</h1>
        <p class="intro">Try a question, draft an announcement, or explore an idea.</p></header>
      <section class="controls" aria-label="Chat provider">
        <div class="provider"><label for="provider">Local provider</label>
          <select id="provider" .value=${this._connectionId} ?disabled=${this._busy || this._loading || !this._options?.providers.length}
            @change=${(e) => {
			this._reset(), this._connectionId = e.target.value;
		}}>
            ${this._options?.providers.length ? w : S`<option value="">${this._loading ? "Loading providers…" : "No local provider available"}</option>`}
            ${this._options?.providers.map((e) => S`<option value=${e.connection_id}>${e.title}</option>`)}
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
          ${e ? S`<br>Generation is an explicit trial; this model's capabilities have not been verified.` : w}
        </div>
      </details>
      ${!this._loading && this._options?.providers.length === 0 ? S`<p class="setup-hint">Add a local connection in <a href="/config/integrations/integration/ai_orchestrator">provider settings</a>, then refresh providers.</p>` : w}
      <div class="transcript" role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions text">
        ${this._history.length === 0 && !this._busy ? S`<div class="empty"><h2>A fresh conversation</h2><p>For example: “Draft a friendly reminder to close a window.”<br>This chat can write the words; it cannot check or control devices.</p></div>` : w}
        ${this._history.map((e) => S`<article class="message ${e.role}"><strong>${e.role === "user" ? "You" : "AI reply"}</strong><p>${e.content}</p></article>`)}
        ${this._busy ? S`<article class="message user"><strong>You</strong><p>${this._pendingPrompt}</p></article><p class="pending" role="status">Waiting for your local provider…</p>` : w}
      </div>
      ${this._error ? S`<div class="error" role="alert">${this._error}</div>` : w}
      ${this._notice ? S`<p class="notice" role="status">${this._notice}</p>` : w}
      <form class="compose" @submit=${(e) => void this._send(e)}>
        <label for="message">Your message</label>
        <textarea id="message" rows="1" maxlength=${I.max_message_chars} .value=${this._draft} ?disabled=${this._busy}
          placeholder="Ask your local AI…" aria-describedby="compose-hint"
          @input=${(e) => {
			let t = e.target;
			this._draft = t.value, this._autoGrow(t);
		}}
          @keydown=${(e) => {
			e.key === "Enter" && (e.ctrlKey || e.metaKey) && this._send(e);
		}}></textarea>
        <div class="compose-footer"><span id="compose-hint" class="hint">${this._draft.length} / ${I.max_message_chars} · Ctrl/⌘ + Enter to send</span>
          <button class="primary" type="submit" ?disabled=${this._busy || this._loading || !e || !this._draft.trim()}>${this._busy ? "Waiting…" : "Send"}</button></div>
      </form>
    </div>`;
	}
}, At = ["entity", "service"], jt = class extends Error {
	constructor() {
		super("Notification target response is unsupported.");
	}
}, Mt = /^notify\.[a-z0-9_]{1,250}$/u;
function Nt(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function Pt(e) {
	if (!Nt(e) || Object.keys(e).length !== 2 || e.schema_version !== 1 || !Array.isArray(e.targets) || e.targets.length > 500) throw new jt();
	let t = /* @__PURE__ */ new Set();
	return e.targets.map((e) => {
		if (!Nt(e) || Object.keys(e).length !== 3 || typeof e.reference != "string" || !Mt.test(e.reference) || !At.includes(e.kind) || typeof e.name != "string" || e.name.trim() === "" || e.name.length > 255 || t.has(e.reference)) throw new jt();
		return t.add(e.reference), {
			reference: e.reference,
			kind: e.kind,
			name: e.name
		};
	});
}
async function Ft(e) {
	return Pt(await e.callWS({ type: "ai_orchestrator/notify/targets" }));
}
//#endregion
//#region src/api/workflow-preview-client.ts
var It = 131072, U = {
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
}, W = class extends Error {
	constructor() {
		super("Workflow preview response is unsupported.");
	}
};
function Lt(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function Rt(e, t) {
	return Object.keys(e).length === t.length && t.every((t) => Object.hasOwn(e, t));
}
function G(e, t, n) {
	return Array.isArray(e) && e.length <= t && e.every((e, t) => Lt(e) && Rt(e, [
		"index",
		"passed",
		"reason"
	]) && e.index === t && typeof e.passed == "boolean" && typeof e.reason == "string" && n.includes(e.reason) && e.passed === (e.reason === "matched"));
}
var zt = [
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
function Bt(e, t, n) {
	return Lt(e) && Rt(e, n ? ["schema_version", ...zt] : zt) && (!n || e.schema_version === 1) && e.mode === t;
}
function Vt(e) {
	if (!Bt(e, "observation_only", !1)) throw new W();
	return Ut(e);
}
function Ht(e) {
	if (!Bt(e, "offline", !0)) throw new W();
	return Ut(e);
}
function Ut(e) {
	if (typeof e.enabled != "boolean" || typeof e.triggered != "boolean" || typeof e.conditions_passed != "boolean" || typeof e.eligible != "boolean" || e.provider_calls !== 0 || e.actions_executed !== 0 || !G(e.trigger_results, 10, [
		"matched",
		"event_kind_mismatch",
		"state_unchanged",
		"entity_not_selected",
		"target_state_mismatch",
		"time_mismatch"
	]) || !G(e.condition_results, 20, [
		"matched",
		"outside_time_window",
		"state_unavailable",
		"state_mismatch",
		"state_not_numeric",
		"outside_numeric_bounds"
	]) || !Array.isArray(e.planned_steps) || e.planned_steps.length > 25 || !e.planned_steps.every((e, t) => Lt(e) && Rt(e, ["index", "kind"]) && e.index === t && [
		"ai_compose",
		"ai_classify",
		"ai_extract",
		"branch",
		"notify"
	].includes(e.kind)) || e.triggered !== e.trigger_results.some((e) => e.passed) || e.conditions_passed !== e.condition_results.every((e) => e.passed) || e.eligible !== e.planned_steps.length > 0 || e.eligible && (!e.triggered || !e.conditions_passed)) throw new W();
	return e;
}
async function Wt(e, t, n) {
	if (!t.trim() || !n.trim() || t.length > 131072 || n.length > 131072) throw new W();
	return Ht(await e.callWS({
		type: "ai_orchestrator/workflow/preview",
		workflow_json: t,
		snapshot_json: n
	}));
}
var Gt = [
	"ready",
	"unreadable",
	"not_loaded"
], Kt = ["activation_failed", "cleanup_failed"], qt = ["observe", "execute"], Jt = [
	"ok",
	"planned",
	"failed",
	"skipped",
	"delivered",
	"taken",
	"not_taken"
], K = class extends Error {
	constructor() {
		super("The workflow response does not match the supported contract."), this.name = "WorkflowContractError";
	}
}, Yt = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u, Xt = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u, Zt = /^[a-z][a-z0-9_]{0,63}$/u;
function Qt(e) {
	let t = [
		"started_at",
		"steps",
		"provider_calls",
		"actions_executed",
		"completed",
		"error"
	];
	if (!q(e) || !(J(e, t) || J(e, [...t, "finished_at"])) || typeof e.started_at != "string" || e.started_at.length > 40 || "finished_at" in e && (typeof e.finished_at != "string" || e.finished_at.length > 40) || !Array.isArray(e.steps) || e.steps.length > 25 || !Y(e.provider_calls) || !Y(e.actions_executed) || typeof e.completed != "boolean" || e.error !== null && (typeof e.error != "string" || e.error.length > 64)) throw new K();
	let n = e.steps.map((e, t) => {
		if (!q(e) || e.index !== t || typeof e.step_id != "string" || !Zt.test(e.step_id) || typeof e.kind != "string" || typeof e.executed != "boolean" || !Jt.includes(e.status) || Object.keys(e).some((e) => ![
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
		].includes(e.target)) throw new K();
		return e;
	});
	if (e.completed !== (e.error === null) || e.completed && n.some((e) => e.status === "failed")) throw new K();
	let r = n.findIndex((e) => e.status === "failed" || e.status === "not_taken");
	if (n.some((t, n) => t.status === "skipped" && !(r !== -1 && n > r) && e.error !== "provider_unavailable") || e.actions_executed !== n.filter((e) => e.status === "delivered").length) throw new K();
	return {
		...e,
		steps: n
	};
}
function q(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function J(e, t) {
	return Object.keys(e).length === t.length && t.every((t) => Object.hasOwn(e, t));
}
function $t(e, t) {
	return Array.isArray(e) && e.length <= t && e.every(q);
}
function Y(e) {
	return Number.isSafeInteger(e) && e >= 0;
}
function en(e) {
	if (!q(e) || !J(e, [
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
	]) || e.schema_version !== 1 || !qt.includes(e.run_mode) || e.provider_connection_id !== null && (typeof e.provider_connection_id != "string" || !Xt.test(e.provider_connection_id)) || typeof e.workflow_id != "string" || !Yt.test(e.workflow_id) || typeof e.name != "string" || e.name.trim() === "" || e.name.length > 128 || typeof e.description != "string" || e.description.length > 512 || typeof e.enabled != "boolean" || !$t(e.triggers, 10) || !$t(e.conditions, 20) || !$t(e.steps, 25)) throw new K();
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
function tn(e) {
	if (!q(e) || !J(e, [
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
	]) || typeof e.active != "boolean" || !Y(e.executions) || !Y(e.execution_failures) || !Y(e.skipped_busy) || typeof e.execution_running != "boolean" || e.execution_failures > e.executions || !Y(e.observations) || !Y(e.ignored_events) || !Y(e.registrations) || e.error !== null && !Kt.includes(e.error) || e.active && e.error !== null) throw new K();
	let t = null;
	if (e.latest !== null) try {
		t = Vt(e.latest);
	} catch {
		throw new K();
	}
	let n = null;
	return e.last_execution !== null && (n = Qt(e.last_execution)), {
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
function nn(e) {
	if (!Array.isArray(e) || e.length > 50) throw new K();
	let t = /* @__PURE__ */ new Set();
	return e.map((e) => {
		if (!q(e) || !J(e, ["workflow", "status"])) throw new K();
		let n = en(e.workflow);
		if (t.has(n.workflow_id)) throw new K();
		return t.add(n.workflow_id), {
			workflow: n,
			status: tn(e.status)
		};
	});
}
function rn(e) {
	if (!q(e) || !J(e, [
		"schema_version",
		"store",
		"workflows"
	]) || e.schema_version !== 1 || !Gt.includes(e.store)) throw new K();
	let t = nn(e.workflows);
	if (e.store !== "ready" && t.length > 0) throw new K();
	return {
		schema_version: 1,
		store: e.store,
		workflows: t
	};
}
function an(e, t) {
	if (!q(e) || !Object.hasOwn(e, "workflow")) throw new K();
	let { workflow: n, ...r } = e, i = en(n);
	if (t !== void 0 && i.workflow_id !== t) throw new K();
	let a = rn(r);
	if (!a.workflows.some((e) => e.workflow.workflow_id === i.workflow_id)) throw new K();
	return {
		...a,
		workflow: i
	};
}
async function on(e) {
	return rn(await e.callWS({ type: "ai_orchestrator/workflows/list" }));
}
async function sn(e, t) {
	if (!t.trim() || t.length > 131072) throw new K();
	return an(await e.callWS({
		type: "ai_orchestrator/workflows/save",
		workflow_json: t
	}));
}
async function cn(e, t, n) {
	let r = an(await e.callWS({
		type: "ai_orchestrator/workflows/set_enabled",
		workflow_id: t,
		enabled: n
	}), t);
	if (r.workflow.enabled !== n) throw new K();
	return r;
}
async function ln(e, t) {
	let n = rn(await e.callWS({
		type: "ai_orchestrator/workflows/delete",
		workflow_id: t
	}));
	if (n.workflows.some((e) => e.workflow.workflow_id === t)) throw new K();
	return n;
}
async function un(e, t) {
	let n = await e.callWS({
		type: "ai_orchestrator/workflows/run_manual",
		workflow_id: t
	});
	if (!q(n) || n.schema_version !== 1) throw new K();
	let r = Object.fromEntries(Object.entries(n).filter(([e]) => e !== "schema_version"));
	try {
		return Vt(r);
	} catch {
		throw new K();
	}
}
//#endregion
//#region src/panel/workflow-builder-view.ts
var dn = "ai-orchestrator-workflow-builder", fn = /^[a-z][a-z0-9_]{0,63}$/u, pn = [
	"string",
	"number",
	"boolean"
], mn = /^([01]\d|2[0-3]):[0-5]\d$/u, hn = /^[a-z_][a-z0-9_]*\.[a-z0-9_]+$/u, gn = 40, _n = {
	invalid_workflow: "Home Assistant rejected the workflow. Check the highlighted fields.",
	workflow_store_unavailable: "Workflow storage is unavailable.",
	not_loaded: "The foundation is not loaded."
}, vn = class extends k {
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
	_workflowId = H();
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
			it(e),
			V(e),
			Ft(e)
		]);
		n() && (r.status === "fulfilled" && (this._entities = r.value.entities.filter((e) => !e.disabled)), i.status === "fulfilled" && (this._providers = i.value.providers, this._providerId ||= i.value.providers[0]?.connection_id ?? ""), a.status === "fulfilled" && (this._targets = a.value));
	}
	_matches(e) {
		let t = e.trim().toLowerCase();
		return t.length < 2 ? [] : this._entities.filter((e) => e.entity_id.includes(t) || (e.name ?? "").toLowerCase().includes(t)).slice(0, gn);
	}
	_touch() {
		this._error = "", this._saved = !1;
	}
	problems() {
		let e = [];
		(!this._name.trim() || this._name.length > 128) && e.push("Give the workflow a name of up to 128 characters."), this._triggerKind === "state" && !hn.test(this._triggerEntity) && e.push("Choose a trigger entity."), this._triggerKind === "state" && this._toState.length > 255 && e.push("The trigger's target state is too long."), this._description.length > 512 && e.push("Keep the description under 512 characters."), this._triggerKind === "time" && !mn.test(this._atTime) && e.push("Enter the trigger time as HH:MM.");
		for (let [t, n] of this._conditions.entries()) {
			let r = `Condition ${t + 1}`;
			n.kind === "time_window" && (!mn.test(n.after_time) || !mn.test(n.before_time)) && e.push(`${r}: both times must be HH:MM.`), n.kind === "state" && (!hn.test(n.entity_id) || !n.state.trim()) && e.push(`${r}: choose an entity and a state.`), n.kind === "numeric_state" && (!hn.test(n.entity_id) || !n.above.trim() && !n.below.trim() || [n.above, n.below].some((e) => e.trim() && !Number.isFinite(Number(e)))) && e.push(`${r}: choose an entity and a finite bound.`);
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
				(t.length < 1 || t.length > 10 || new Set(t.map((e) => e.name)).size !== t.length || t.some((e) => !/^[a-z][a-z0-9_]{0,63}$/u.test(e.name) || !pn.includes(e.type))) && e.push(`${r}: list one to ten fields as name:type (string, number or boolean).`);
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
		].includes(e.kind) && typeof e.step_id == "string" && fn.test(e.step_id)))) {
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
			if (await sn(e, JSON.stringify(this.document())), !n()) return;
			this._saved = !0, this.dispatchEvent(new CustomEvent("workflow-saved", {
				bubbles: !0,
				composed: !0
			}));
		} catch (e) {
			if (!n()) return;
			let t = typeof e == "object" && e && "code" in e && typeof e.code == "string" ? e.code : "", r = t === "invalid_workflow" && typeof e == "object" && e && "message" in e && typeof e.message == "string" && e.message.length <= 160 ? ` ${e.message}` : "";
			this._error = (_n[t] ?? "The workflow could not be saved. Check administrator access and the installed integration version.") + r;
		} finally {
			n() && (this._busy = !1);
		}
	};
	_startNew = () => {
		this._workflowId = H(), this._touch(), this._editing = !1, this._notice = "", this._name = "", this._description = "", this._enabled = !1, this._runMode = "observe", this._triggerKind = "state", this._triggerEntity = "", this._toState = "on", this._atTime = "", this._conditions = [], this._steps = [{
			kind: "ai_compose",
			prompt: "Write a short, friendly household reminder about this event."
		}, {
			kind: "notify",
			notify_service: ""
		}];
	};
	render() {
		let e = this.problems(), t = !this.hass || this.hass.connection?.connected === !1;
		return S`<section aria-labelledby="builder-title">
      <h1 id="builder-title">${this._editing ? "Edit a workflow" : "Build a workflow"}</h1>
      ${this._notice ? S`<p class="error" id="wb-notice">${this._notice}</p>` : w}
      ${this._editing ? S`<p id="wb-editing">Editing the stored workflow <code>${this._workflowId}</code>; saving replaces it and resets its live status.</p>` : w}
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
              ${this._providers.length === 0 ? S`<option value="">No local provider available</option>` : this._providers.map((e) => S`<option value=${e.connection_id} ?selected=${e.connection_id === this._providerId}>${e.title}</option>`)}
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
        ${this._triggerKind === "state" ? S`<div class="row">
          <div>${this._renderEntityPicker("wb-trigger-entity", "Entity", this._triggerEntity, (e) => {
			this._triggerEntity = e;
		})}</div>
          <div><label for="wb-to-state">Changes to state (leave empty for any change)</label><input id="wb-to-state" maxlength="255" .value=${this._toState} @input=${(e) => {
			this._touch(), this._toState = e.target.value;
		}} /></div>
        </div>` : w}
        ${this._triggerKind === "time" ? S`<label for="wb-at-time">At (HH:MM, local)</label><input id="wb-at-time" placeholder="20:00" maxlength="5" .value=${this._atTime} @input=${(e) => {
			this._touch(), this._atTime = e.target.value;
		}} />` : w}
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
      ${e.length ? S`<ul class="error" id="wb-problems">${e.map((e) => S`<li>${e}</li>`)}</ul>` : w}
      <div class="actions">
        <button class="primary" id="wb-save" type="button" ?disabled=${this._busy || t || e.length > 0} @click=${this._save}>${this._busy ? "Saving…" : "Save workflow"}</button>
        <button id="wb-to-editor" type="button" @click=${this._toEditor}>Open in JSON editor</button>
        <button type="button" @click=${this._startNew}>Start a new one</button>
      </div>
      <div role="status" aria-live="polite">${this._error ? S`<p class="error">${this._error}</p>` : w}${this._saved ? S`<p>Workflow saved. It appears in the stored workflows list below; enable it there or with the checkbox above before saving.</p>` : w}</div>
    </section>`;
	}
	_renderEntityPicker(e, t, n, r) {
		let i = this._matches(n);
		return S`<label for=${e}>${t}</label>
      <input id=${e} list="${e}-list" placeholder="Type to search entities" autocomplete="off" maxlength="255" .value=${n} @input=${(e) => {
			this._touch(), r(e.target.value), this.requestUpdate();
		}} />
      <datalist id="${e}-list">${i.map((e) => S`<option value=${e.entity_id}>${e.name ?? e.entity_id}</option>`)}</datalist>
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
		let n = S`<span class="actions"><button type="button" ?disabled=${t === 0} @click=${() => {
			this._touch(), this._conditions = this._move(this._conditions, t, -1);
		}}>Move condition ${t + 1} up</button><button type="button" ?disabled=${t === this._conditions.length - 1} @click=${() => {
			this._touch(), this._conditions = this._move(this._conditions, t, 1);
		}}>Move condition ${t + 1} down</button><button type="button" @click=${() => {
			this._touch(), this._conditions = this._conditions.filter((e, n) => n !== t);
		}}>Remove condition ${t + 1}</button></span>`;
		return e.kind === "time_window" ? S`<fieldset><legend>Condition ${t + 1}: time window</legend><div class="row">
      <div><label for="wb-c${t}-after">From (HH:MM)</label><input id="wb-c${t}-after" maxlength="5" .value=${e.after_time} @input=${(e) => this._updateCondition(t, { after_time: e.target.value })} /></div>
      <div><label for="wb-c${t}-before">Until (HH:MM, exclusive)</label><input id="wb-c${t}-before" maxlength="5" .value=${e.before_time} @input=${(e) => this._updateCondition(t, { before_time: e.target.value })} /></div></div>${n}</fieldset>` : e.kind === "state" ? S`<fieldset><legend>Condition ${t + 1}: entity state</legend><div class="row">
      <div>${this._renderEntityPicker(`wb-c${t}-entity`, "Entity", e.entity_id, (e) => this._updateCondition(t, { entity_id: e }))}</div>
      <div><label for="wb-c${t}-state">Is in state</label><input id="wb-c${t}-state" maxlength="255" .value=${e.state} @input=${(e) => this._updateCondition(t, { state: e.target.value })} /></div></div>${n}</fieldset>` : S`<fieldset><legend>Condition ${t + 1}: numeric bound</legend><div class="row">
      <div>${this._renderEntityPicker(`wb-c${t}-entity`, "Entity", e.entity_id, (e) => this._updateCondition(t, { entity_id: e }))}</div>
      <div><label for="wb-c${t}-above">Above (exclusive)</label><input id="wb-c${t}-above" inputmode="decimal" .value=${e.above} @input=${(e) => this._updateCondition(t, { above: e.target.value })} /></div>
      <div><label for="wb-c${t}-below">Below (exclusive)</label><input id="wb-c${t}-below" inputmode="decimal" .value=${e.below} @input=${(e) => this._updateCondition(t, { below: e.target.value })} /></div></div>${n}</fieldset>`;
	}
	_renderStep(e, t) {
		let n = S`<span class="actions"><button type="button" ?disabled=${t === 0} @click=${() => {
			this._touch(), this._steps = this._move(this._steps, t, -1);
		}}>Move step ${t + 1} up</button><button type="button" ?disabled=${t === this._steps.length - 1} @click=${() => {
			this._touch(), this._steps = this._move(this._steps, t, 1);
		}}>Move step ${t + 1} down</button><button type="button" @click=${() => {
			this._touch(), this._steps = this._steps.filter((e, n) => n !== t);
		}}>Remove step ${t + 1}</button></span>`;
		if (e.kind === "notify") return S`<fieldset><legend>Step ${t + 1}: send a notification</legend>
      <label for="wb-s${t}-target">Target (from Home Assistant)</label>
      <select id="wb-s${t}-target" .value=${e.notify_service} @change=${(e) => this._updateStep(t, { notify_service: e.target.value })}>
        <option value="" ?selected=${e.notify_service === ""}>Choose a target…</option>
        ${this._targets.map((t) => S`<option value=${t.reference} ?selected=${t.reference === e.notify_service}>${t.name} — ${t.reference} (${t.kind})</option>`)}
      </select>
      <p class="hint">The message is the text composed by the most recent compose step; the workflow name is the title.</p>${n}</fieldset>`;
		if (e.kind === "branch") {
			let r = this._stepIds(), i = this._steps.map((e, t) => ({
				s: e,
				i: t
			})).filter(({ s: e, i: n }) => e.kind === "ai_classify" && n < t), a = i.find(({ i: t }) => r[t] === e.when_step_id)?.s, o = a && a.kind === "ai_classify" ? this._categories(a.categories) : [];
			return S`<fieldset><legend>Step ${t + 1}: branch — continue only when a classification matches</legend>
        <div class="row"><div><label for="wb-s${t}-when">Classify step</label>
        <select id="wb-s${t}-when" .value=${e.when_step_id} @change=${(e) => this._updateStep(t, {
				when_step_id: e.target.value,
				when_category: ""
			})}>
          <option value="" ?selected=${e.when_step_id === ""}>Choose an earlier classify step…</option>
          ${i.map(({ i: t }) => S`<option value=${r[t]} ?selected=${r[t] === e.when_step_id}>Step ${t + 1} (${r[t]})</option>`)}
        </select></div>
        <div><label for="wb-s${t}-category">Continue when category is</label>
        <select id="wb-s${t}-category" ?disabled=${o.length === 0} .value=${e.when_category} @change=${(e) => this._updateStep(t, { when_category: e.target.value })}>
          <option value="" ?selected=${e.when_category === ""}>Choose a category…</option>
          ${o.map((t) => S`<option value=${t} ?selected=${t === e.when_category}>${t}</option>`)}
        </select></div></div>
        <p class="hint">If the category differs, every later step is skipped and the run still counts as completed.</p>${n}</fieldset>`;
		}
		return e.kind === "ai_extract" ? S`<fieldset><legend>Step ${t + 1}: extract values with AI</legend>
      <label for="wb-s${t}-prompt">Prompt</label>
      <textarea id="wb-s${t}-prompt" maxlength="4000" .value=${e.prompt} @input=${(e) => this._updateStep(t, { prompt: e.target.value })}></textarea>
      <label for="wb-s${t}-fields">Fields (name:type, comma separated; types string, number, boolean)</label>
      <input id="wb-s${t}-fields" .value=${e.fields} @input=${(e) => this._updateStep(t, { fields: e.target.value })} />
      <p class="hint">The model must return exactly these fields with these types; anything else fails the step.</p>${n}</fieldset>` : S`<fieldset><legend>Step ${t + 1}: ${e.kind === "ai_compose" ? "compose text with AI" : "classify with AI"}</legend>
      <label for="wb-s${t}-prompt">Prompt</label>
      <textarea id="wb-s${t}-prompt" maxlength="4000" .value=${e.prompt} @input=${(e) => this._updateStep(t, { prompt: e.target.value })}></textarea>
      ${e.kind === "ai_classify" ? S`<label for="wb-s${t}-categories">Categories (comma separated, 2–20)</label><input id="wb-s${t}-categories" .value=${e.categories} @input=${(e) => this._updateStep(t, { categories: e.target.value })} />` : w}
      <p class="hint">The model receives only this prompt plus the event, time, and the states of entities named by your conditions.</p>${n}</fieldset>`;
	}
};
customElements.define(dn, vn);
var yn = [
	"ok",
	"planned",
	"failed",
	"skipped",
	"taken",
	"not_taken"
], bn = [
	"ai_compose",
	"ai_classify",
	"ai_extract",
	"branch",
	"notify"
], xn = {
	invalid_output: "The model reply did not match the required shape",
	timeout: "The provider took too long to reply",
	provider_failed: "The provider request failed"
}, Sn = [
	"entity",
	"service",
	"missing"
], X = class extends Error {
	constructor() {
		super("Workflow dry-run response is unsupported.");
	}
}, Cn = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u, Z = /^[a-z][a-z0-9_]{0,63}$/u, wn = [
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
], Tn = [
	"matched",
	"event_kind_mismatch",
	"state_unchanged",
	"entity_not_selected",
	"target_state_mismatch",
	"time_mismatch"
], En = [
	"matched",
	"outside_time_window",
	"state_unavailable",
	"state_mismatch",
	"state_not_numeric",
	"outside_numeric_bounds"
];
function Dn(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function Q(e, t) {
	return Object.keys(e).length === t.length && t.every((t) => Object.hasOwn(e, t));
}
function $(e, t) {
	return typeof e == "string" && e.trim().length > 0 && e.length <= t;
}
function On(e, t) {
	if (!Dn(e) || e.index !== t || !$(e.step_id, 64) || !Z.test(e.step_id) || !bn.includes(e.kind) || typeof e.executed != "boolean" || !yn.includes(e.status)) return !1;
	let n = [
		"index",
		"step_id",
		"kind",
		"executed",
		"status"
	], r = e.kind === "ai_compose" || e.kind === "ai_classify" || e.kind === "ai_extract";
	switch (e.status) {
		case "ok": return !r || e.executed !== !0 ? !1 : e.kind === "ai_compose" ? Q(e, [...n, "text"]) && $(e.text, 2e3) : e.kind === "ai_classify" ? Q(e, [...n, "category"]) && $(e.category, 64) : Q(e, [...n, "values"]) && Dn(e.values) && Object.keys(e.values).length <= 10 && Object.entries(e.values).every(([e, t]) => Z.test(e) && (typeof t == "string" && t.length <= 500 || typeof t == "number" && Number.isFinite(t) || typeof t == "boolean"));
		case "taken":
		case "not_taken": return e.kind === "branch" && e.executed === !1 && Q(e, n);
		case "planned": return !r && e.executed === !1 && (Q(e, [...n, "message_step_id"]) || Q(e, [
			...n,
			"message_step_id",
			"target"
		]) && Sn.includes(e.target)) && (e.message_step_id === null || $(e.message_step_id, 64) && Z.test(e.message_step_id));
		case "failed": return r && e.executed === !1 && Q(e, [...n, "error"]) && $(e.error, 64);
		default: return e.executed === !1 && Q(e, n);
	}
}
function kn(e, t) {
	if (!Dn(e) || !Q(e, wn) || e.schema_version !== 1 || e.mode !== "dry_run" || e.workflow_id !== t || e.destination !== "local" || typeof e.triggered != "boolean" || typeof e.conditions_passed != "boolean" || typeof e.eligible != "boolean" || typeof e.completed != "boolean" || e.actions_executed !== 0 || !Number.isInteger(e.provider_calls) || e.provider_calls < 0 || !G(e.trigger_results, 10, Tn) || !G(e.condition_results, 20, En) || !Array.isArray(e.steps) || e.steps.length > 25 || !e.steps.every((e, t) => On(e, t)) || e.triggered !== e.trigger_results.some((e) => e.passed) || e.conditions_passed !== e.condition_results.every((e) => e.passed)) throw new X();
	let n = e.steps, r = n.filter((e) => e.kind !== "notify" && (e.status === "ok" || e.status === "failed")).length, i = e.eligible;
	if (!i && (n.length > 0 || e.provider_calls !== 0 || e.completed !== !1) || i && (!(e.triggered && e.conditions_passed) || n.length === 0 || e.provider_calls !== r || e.completed !== !n.some((e) => e.status === "failed"))) throw new X();
	let a = n.findIndex((e) => e.status === "failed" || e.status === "not_taken");
	if (n.some((e, t) => e.status === "skipped" != (a !== -1 && t > a)) || n.some((e) => e.kind === "branch" && e.status !== "taken" && e.status !== "not_taken" && e.status !== "skipped")) throw new X();
	return e;
}
async function An(e, t, n, r) {
	if (!Cn.test(t) || !Cn.test(n) || !r.trim() || r.length > 131072) throw new X();
	return kn(await e.callWS({
		type: "ai_orchestrator/workflows/dry_run",
		workflow_id: t,
		connection_id: n,
		snapshot_json: r
	}), t);
}
//#endregion
//#region src/panel/workflow-preview-view.ts
var jn = "ai-orchestrator-workflow-preview", Mn = {
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
}, Nn = {
	ai_compose: "Compose text",
	ai_classify: "Classify text",
	ai_extract: "Extract values",
	branch: "Branch",
	notify: "Notification"
}, Pn = {
	workflow_not_found: "Save the workflow first; a dry run uses the stored version.",
	dry_run_provider_unavailable: "Select an available local provider.",
	dry_run_busy: "A dry run is already running. Try again shortly.",
	invalid_snapshot: "Check the snapshot JSON.",
	workflow_store_unavailable: "Workflow storage is unavailable."
}, Fn = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u, In = class extends k {
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
		e.has("draft") && this.draft !== void 0 && (this._invalidate(), this._workflow = this.draft.json), e.has("hass") && (this._connection !== this.hass?.connection || this._userId !== this.hass?.user?.id || this._callWS !== this.hass?.callWS) && (this._unbind(), this._reset(), this._connection = this.hass?.connection, this._userId = this.hass?.user?.id, this._callWS = this.hass?.callWS, this._connection?.addEventListener("disconnected", this._reset), this._lookupSequence++, this._providers = [], this._connectionId = "", this._targets = [], this._loadProviders(), this._loadTargets());
	}
	async _loadProviders() {
		let e = this.hass;
		if (!e) return;
		let t = this._lookupSequence;
		try {
			let n = await V(e);
			if (t !== this._lookupSequence || this.hass?.callWS !== e.callWS) return;
			this._providers = n.providers, this._connectionId = n.providers[0]?.connection_id ?? "";
		} catch {}
	}
	async _loadTargets() {
		let e = this.hass;
		if (!e) return;
		let t = this._lookupSequence;
		try {
			let n = await Ft(e);
			if (t !== this._lookupSequence || this.hass?.callWS !== e.callWS) return;
			this._targets = n;
		} catch {}
	}
	_storedWorkflowId() {
		try {
			let e = JSON.parse(this._workflow).workflow_id;
			return typeof e == "string" && Fn.test(e) ? e : void 0;
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
			let r = await An(e, t, n, this._snapshot);
			i() && (this._dryRun = r);
		} catch (e) {
			if (!i()) return;
			let t = typeof e == "object" && e && "code" in e && typeof e.code == "string" ? e.code : "";
			this._error = Pn[t] ?? "The dry run could not be completed. Check the snapshot JSON, the selected provider, administrator access, and the installed integration version.";
		} finally {
			i() && (this._busy = !1);
		}
	};
	_example(e) {
		this._invalidate(), this._workflow = JSON.stringify(Mn, null, 2), this._snapshot = JSON.stringify({
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
			let t = await Wt(e, this._workflow, this._snapshot);
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
			let t = await sn(e, this._workflow);
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
		return S`<section aria-labelledby="preview-title">
      <h1 id="preview-title">Workflow preview</h1>
      <p>Experimental offline JSON editor. Test a draft against a supplied snapshot: previewing reads no live home state, contacts no provider, and executes no action. "Save as workflow" stores the workflow document in Home Assistant; an enabled saved workflow then watches its triggers and records outcomes without running any step.</p>
      <p>Start with a synthetic window example, then edit the workflow or snapshot. The example identifiers are fictional.</p>
      <div class="actions"><button type="button" @click=${() => this._example(!1)}>Load synthetic evening example</button><button type="button" @click=${() => this._example(!0)}>Load synthetic daytime example</button></div>
      <div class="editors"><div><label for="workflow">Workflow JSON</label><textarea id="workflow" spellcheck="false" maxlength=${It} .value=${this._workflow} @input=${(e) => this._edit(e, !0)}></textarea></div>
      <div><label for="snapshot">Snapshot JSON</label><textarea id="snapshot" spellcheck="false" maxlength=${It} .value=${this._snapshot} @input=${(e) => this._edit(e, !1)}></textarea></div></div>
      <div class="actions"><button class="primary" type="button" ?disabled=${this._busy || !this.hass || this.hass.connection?.connected === !1 || !this._workflow.trim() || !this._snapshot.trim()} @click=${this._preview}>${this._busy ? "Previewing…" : "Preview workflow"}</button><button type="button" ?disabled=${this._busy || !this.hass || this.hass.connection?.connected === !1 || !this._workflow.trim()} @click=${this._save}>${this._busy ? "Working…" : "Save as workflow"}</button><button type="button" @click=${this._reset}>Reset preview</button></div>
      <div class="actions">
        <label for="dry-run-provider">Local provider for a dry run</label>
        <select id="dry-run-provider" ?disabled=${this._busy || this._providers.length === 0} .value=${this._connectionId} @change=${(e) => {
			this._invalidate(), this._connectionId = e.target.value;
		}}>
          ${this._providers.length === 0 ? S`<option value="">No local provider available</option>` : this._providers.map((e) => S`<option value=${e.connection_id} ?selected=${e.connection_id === this._connectionId}>${e.title}</option>`)}
        </select>
        <button id="dry-run" type="button" ?disabled=${!this._canDryRun()} @click=${this._runDry}>${this._busy ? "Working…" : "Dry run AI steps"}</button>
      </div>
      <details><summary>Notification targets found in Home Assistant (${this._targets.length})</summary>
        ${this._targets.length ? S`<ul>${this._targets.map((e) => S`<li><code>${e.reference}</code> — ${e.name} (notify ${e.kind})</li>`)}</ul>` : S`<p>No notify entity or notify service was found, or discovery is unavailable.</p>`}
        <p>Use one of these references as a notify step's <code>notify_service</code>. To run a workflow live, set <code>"run_mode": "execute"</code> and, for AI steps, <code>"provider_connection_id"</code> to a local provider, then save and enable it.</p>
      </details>
      <p>A dry run evaluates the <em>stored</em> workflow against the snapshot above, then runs its AI steps once against the selected local provider. The model sees only the step prompt, the event, the time, and the states of entities named by the workflow's conditions. Notifications are only planned; nothing is sent, stored, or executed.</p>
      <div role="status" aria-live="polite">${this._error ? S`<p class="error">${this._error}</p>` : w}${this._saved ? S`<p>Workflow saved. It appears in the stored workflows list below.</p>` : w}${this._busy ? S`<p>Working…</p>` : w}${this._result ? this._renderResult(this._result) : w}${this._dryRun ? this._renderDryRun(this._dryRun) : w}</div>
    </section>`;
	}
	_renderResult(e) {
		return S`<div class="result"><h2>${e.eligible ? "Scenario passes — steps planned" : "Scenario blocked — no steps planned"}</h2>
      <p>Draft enabled flag: ${e.enabled ? "yes" : "no"}. Preview never activates a workflow.</p>
      <h3>Triggers (any must pass)</h3><ul>${e.trigger_results.map((e) => S`<li>Trigger ${e.index + 1}: ${e.passed ? "Pass" : "Fail"} — ${U[e.reason]}</li>`)}</ul>
      <h3>Conditions (all must pass)</h3>${e.condition_results.length ? S`<ul>${e.condition_results.map((e) => S`<li>Condition ${e.index + 1}: ${e.passed ? "Pass" : "Fail"} — ${U[e.reason]}</li>`)}</ul>` : S`<p>No conditions.</p>`}
      <h3>Planned steps</h3>${e.planned_steps.length ? S`<ol>${e.planned_steps.map((e) => S`<li>${Nn[e.kind]} — not executed</li>`)}</ol>` : S`<p>No steps planned.</p>`}
      <p>Provider calls: 0 · Actions executed: 0</p></div>`;
	}
	_renderDryRun(e) {
		return S`<div class="result"><h2>${e.eligible ? e.completed ? "Dry run completed — nothing was sent" : "Dry run stopped at a failed step" : "Dry run: scenario blocked — no AI step ran"}</h2>
      <h3>Triggers (any must pass)</h3><ul>${e.trigger_results.map((e) => S`<li>Trigger ${e.index + 1}: ${e.passed ? "Pass" : "Fail"} — ${U[e.reason]}</li>`)}</ul>
      <h3>Conditions (all must pass)</h3>${e.condition_results.length ? S`<ul>${e.condition_results.map((e) => S`<li>Condition ${e.index + 1}: ${e.passed ? "Pass" : "Fail"} — ${U[e.reason]}</li>`)}</ul>` : S`<p>No conditions.</p>`}
      <h3>Steps</h3>${e.steps.length ? S`<ol>${e.steps.map((e) => this._renderDryRunStep(e))}</ol>` : S`<p>No steps ran.</p>`}
      <p>Provider calls: ${e.provider_calls} · Actions executed: 0 · Destination: local</p></div>`;
	}
	_renderDryRunStep(e) {
		let t = Nn[e.kind];
		return e.status === "ok" && e.text !== void 0 ? S`<li>${t} — composed:<div class="composed">${e.text}</div></li>` : e.status === "ok" && e.values !== void 0 ? S`<li>${t} — values: ${Object.entries(e.values).map(([e, t]) => `${e} = ${String(t)}`).join(", ")}</li>` : e.status === "ok" ? S`<li>${t} — category: ${e.category}</li>` : e.status === "taken" ? S`<li>${t} — taken, later steps continue</li>` : e.status === "not_taken" ? S`<li>${t} — not taken, later steps skipped</li>` : e.status === "planned" ? S`<li>${t} — planned, not sent${e.message_step_id ? ` (would use text from step ${e.message_step_id})` : ""}${e.target === "missing" ? " — target not found in Home Assistant" : e.target ? ` — target resolves to a notify ${e.target}` : ""}</li>` : e.status === "failed" ? S`<li>${t} — failed: ${xn[e.error] ?? "Provider error"}</li>` : S`<li>${t} — skipped</li>`;
	}
};
customElements.define(jn, In);
//#endregion
//#region src/panel/workflows-view.ts
var Ln = "ai-orchestrator-workflows", Rn = {
	load: "Stored workflows could not be read from Home Assistant. Check administrator access and the installed integration version.",
	mutate: "The change could not be completed. Nothing was executed; reload to see the current stored state.",
	observe: "The observation could not be completed. Nothing was executed."
}, zn = class extends k {
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
			let n = await on(e);
			if (!this._current(t, e)) return;
			this._store = n.store, this._entries = n.workflows, this._viewState = "ready";
		} catch {
			if (!this._current(t, e)) return;
			this._entries = [], this._viewState = "error", this._error = Rn.load;
		}
	};
	async _mutate(e) {
		let t = this.hass;
		if (t === void 0 || this._pending !== void 0 || t.connection?.connected === !1) return;
		let n = this._sequence;
		this._pending = e, this._error = "", e.action !== "observe" && (this._observation = void 0);
		try {
			if (e.action === "observe") {
				let r = await un(t, e.id);
				if (!this._current(n, t)) return;
				this._observation = {
					id: e.id,
					result: r
				};
				let i = await on(t);
				if (!this._current(n, t)) return;
				this._store = i.store, this._entries = i.workflows;
				return;
			}
			let r = e.action === "delete" ? await ln(t, e.id) : await cn(t, e.id, e.action === "enable");
			if (!this._current(n, t)) return;
			this._store = r.store, this._entries = r.workflows, this._confirmDeleteId = void 0;
		} catch {
			if (!this._current(n, t)) return;
			this._error = e.action === "observe" ? Rn.observe : Rn.mutate;
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
		return S`
      <section aria-labelledby="workflows-title">
        <h2 id="workflows-title">Stored workflows</h2>
        <p>
          Enabled workflows watch their triggers in Home Assistant and record whether the
          deterministic conditions passed. A workflow in observe mode runs nothing. A workflow
          in execute mode runs its AI steps and delivers to its notify target; no other Home
          Assistant action can be called.
        </p>
        <div class="actions">
          <button
            type="button"
            ?disabled=${this._viewState === "loading" || this._pending !== void 0 || !this.hass}
            @click=${this._load}
          >
            ${this._viewState === "loading" ? "Loading…" : "Reload workflows"}
          </button>
        </div>
        <div role="status" aria-live="polite">
          ${this._error ? S`<p class="error">${this._error}</p>` : w}
          ${this._store === "unreadable" ? S`<p class="notice error">
                The stored workflow file contains data this version cannot validate. Nothing on
                disk was changed and no workflow is active; saving is refused until the file is
                repaired or restored from a backup.
              </p>` : w}
        </div>
        ${this._renderList()}
      </section>
    `;
	}
	_renderList() {
		return this._viewState === "ready" ? this._entries.length === 0 ? S`<p class="notice">No stored workflows. Use "Save as workflow" in the editor above.</p>` : S`<div class="list" role="list" aria-label="Stored workflows">
      ${this._entries.map((e) => this._renderEntry(e))}
    </div>` : w;
	}
	_renderEntry(e) {
		let { workflow: t, status: n } = e, r = t.workflow_id, i = this._pending !== void 0, a = this._pending?.id === r ? this._pending.action : void 0, o = n.error === null ? n.active ? "active" : "inactive" : "error", s = n.error === "activation_failed" ? "Activation failed" : n.error === "cleanup_failed" ? "Cleanup pending" : n.active ? "Active" : t.enabled ? "Enabled, not active" : "Disabled", c = this._observation?.id === r ? this._observation.result : void 0;
		return S`
      <article class="card" role="listitem">
        <div class="card-header">
          <h3>${t.name}</h3>
          <span class="badge ${o}">${s}</span>
        </div>
        ${t.description ? S`<p class="meta">${t.description}</p>` : w}
        <p class="meta">
          ${t.triggers.length} trigger(s) · ${t.conditions.length} condition(s) ·
          ${t.steps.length} step(s)
        </p>
        <p class="meta">
          Observations ${n.observations} · Ignored events ${n.ignored_events} ·
          Listeners ${n.registrations}
        </p>
        <p class="meta">
          ${t.run_mode === "execute" ? S`Mode: <strong>execute</strong> — eligible outcomes run the steps and deliver notifications. Executions ${n.executions} · Failures ${n.execution_failures} · Skipped while busy ${n.skipped_busy}${n.execution_running ? " · running now" : ""}` : S`Mode: observe — outcomes are recorded; no step runs.`}
        </p>
        ${n.last_execution ? this._renderExecution(n.last_execution) : w}
        ${n.latest ? this._renderOutcome("Latest observation", n.latest) : w}
        ${c ? this._renderOutcome("Manual observation", c) : w}
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
          ${this._confirmDeleteId === r ? S`<button
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
                </button>` : S`<button
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
		return S`<p class="meta">
      Last execution: ${e.completed ? "completed" : `failed (${e.error ?? "unknown"})`} ·
      provider calls ${e.provider_calls} · notifications delivered ${e.actions_executed}
      ${t ? S`<br />${t}` : w}
    </p>`;
	}
	_renderOutcome(e, t) {
		return S`<p class="meta">
      ${e}: triggered ${t.triggered ? "yes" : "no"} · conditions
      ${t.conditions_passed ? "passed" : "failed"} ·
      ${t.eligible ? `${t.planned_steps.length} step(s) planned, none executed` : "no steps planned"}
    </p>`;
	}
};
customElements.define(Ln, zn);
//#endregion
//#region src/panel/ai-orchestrator-panel.ts
var Bn = "ai-orchestrator-panel", Vn = [
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
], Hn = {
	providers: "Provider connections",
	workflows: "Workflow runtime",
	conversation: "Conversation agent",
	ai_task: "AI Task entity"
}, Un = {
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
function Wn(e) {
	let t = e?.path?.split("/").filter(Boolean).at(-1);
	return Vn.find((e) => e.id === t)?.id;
}
var Gn = class extends k {
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
	static styles = Ye;
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
			let e = Wn(this.route);
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
		super.connectedCallback(), window.addEventListener("resize", this._onViewportChange, { passive: !0 }), window.visualViewport?.addEventListener("resize", this._onViewportChange, { passive: !0 });
	}
	updated(e) {
		e.has("hass") && this.hass !== void 0 && !this._hasRequested && queueMicrotask(() => void this._refreshStatus()), this.classList.toggle("chat-host", this._activeSection === "chat"), this._syncChatHeight();
	}
	render() {
		let e = this._activeSection === "chat";
		return S`
      <div class="app-frame ${this.narrow ? "narrow" : ""} ${e ? "chat-mode" : ""}">
        ${this._renderSidebar()}
        <main class="workspace" id="main-content" tabindex="-1">
          <div class="workspace-inner">
            ${this._activeSection === "home" ? this._renderHome() : this._activeSection === "automations" ? this._renderWorkflowProbe() : e ? S`<ai-orchestrator-chat-view .hass=${this.hass}></ai-orchestrator-chat-view>` : this._activeSection === "providers" ? this._renderProviders() : this._activeSection === "permissions" ? this._renderCatalog() : this._activeSection === "voice" && this._status?.features.conversation === !0 ? this._renderVoice() : this._renderPlaceholder(this._activeSection)}
          </div>
        </main>
      </div>
    `;
	}
	_renderSidebar() {
		return S`
      <aside class="sidebar">
        <div class="brand">
          <span class="brand-mark" aria-hidden="true">AI</span>
          <div class="brand-copy">
            <p class="brand-title">AI Orchestrator</p>
          <p class="brand-subtitle">Local provider preview</p>
          </div>
        </div>

        <nav class="section-nav" aria-label="AI Orchestrator sections">
          ${Vn.map((e) => S`
              <button
                class="nav-button"
                type="button"
                aria-current=${this._activeSection === e.id ? "page" : w}
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
		return S`
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
          ${this._loadState === "loading" ? S`<div class="loading-bar" role="progressbar" aria-label="Checking integration status"></div>` : w}
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
		return S`
      <section class="card" aria-labelledby="feature-status-heading">
        <h2 id="feature-status-heading">Foundation capabilities</h2>
        <p class="card-intro">Values come from the versioned integration status response.</p>
        <ul class="status-list">
          ${A.map((e) => {
			let t = this._loadState === "ready", n = t && this._status?.features[e] === !0, r = t ? n ? "Available" : "Not available" : "Unknown";
			return S`
              <li class="status-row">
                <span>
                  <span class="status-name">${Hn[e]}</span>
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
		return S`
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
	_renderVoice() {
		return S`
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
		let t = Un[e], n = Vn.find((t) => t.id === e)?.label ?? "Section";
		return S`
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
		return S`
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
		return S`
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
		return S`
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
		return this._probeLoadState === "ready" && this._probeResult !== void 0 ? S`
        <strong>One trigger produced exactly one execution.</strong>
        <span>
          Runtime execution ${this._probeResult.execution_count}; listener registration
          ${this._probeResult.registration_count}. Provider contacted: no. Home Assistant action
          called: no.
        </span>
      ` : this._probeLoadState === "error" ? S`
        <strong>The lifecycle probe was not confirmed.</strong>
        <span>No provider or Home Assistant action was called. Check the integration and logs.</span>
      ` : this._probeLoadState === "loading" ? S`<span>Waiting for the bounded integration response.</span>` : S`<span>No lifecycle probe has run in this panel session.</span>`;
	}
	_renderStatusAction() {
		return this._loadState === "loading" ? w : this._loadState === "ready" && this._status?.configured === !1 ? S`
        <div class="hero-actions">
          <button class="secondary-button" type="button" @click=${this._refreshStatus}>
            Check again
          </button>
        </div>
      ` : [
			"denied",
			"incompatible",
			"error"
		].includes(this._loadState) ? S`
        <div class="hero-actions">
          <button class="primary-button" type="button" @click=${this._refreshStatus}>Retry status check</button>
        </div>
      ` : w;
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
			let n = await Be(e);
			if (t !== this._requestSequence || !this.isConnected) return;
			this._status = n, this._loadState = "ready";
		} catch (e) {
			if (t !== this._requestSequence || !this.isConnected) return;
			this._status = void 0, this._loadState = e instanceof j ? "incompatible" : Ve(e) ? "denied" : "error";
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
			this._probeResult = await Je(e), this._probeLoadState = "ready";
		} catch {
			this._probeResult = void 0, this._probeLoadState = "error";
		}
	};
}, Kn = "ai-orchestrator-providers-view", qn = "ai-orchestrator-catalog-view";
customElements.get("ai-orchestrator-chat-view") === void 0 && customElements.define(Dt, kt), customElements.get("ai-orchestrator-panel") === void 0 && customElements.define(Bn, Gn), customElements.get("ai-orchestrator-providers-view") === void 0 && customElements.define(Kn, St), customElements.get("ai-orchestrator-catalog-view") === void 0 && customElements.define(qn, at);
//#endregion
export { Gn as AiOrchestratorPanel, qn as CATALOG_VIEW_TAG, Dt as CHAT_VIEW_TAG, at as CatalogView, kt as ChatView, Bn as PANEL_TAG, Kn as PROVIDERS_VIEW_TAG, St as ProvidersView };
