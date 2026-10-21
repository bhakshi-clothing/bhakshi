/* =========================================================
   BHAKSHI v3 — shell & shared API (see ARCHITECTURE.md)
   "Minimal craft streetwear": helpers · drop/stock helpers · stores (Cart + note / Wishlist / Recent) ·
   product card · announcement · header + Shop mega panel · mobile drawer · search · cart drawer ·
   Modal · toast · flyToCart · reveal · countdowns · footer · floating WhatsApp.
   v2-only effects (cursor, scramble, tilt, tickers, magnetic) are kept as harmless no-ops.
   ========================================================= */
document.documentElement.classList.add("js");

/* ---------- Helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
/* Prices: "Rs. 899.00" / "Rs. 1,299.00" (en-IN grouping, 2 decimals) */
const rupee = n => "Rs. " + (Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const getProduct = id => (id && typeof id === "object") ? id : PRODUCTS.find(p => p.id === id);
const catName = id => (CATEGORIES.find(c => c.id === id) || {}).name || id;
const groupOf = p => (CATEGORIES.find(c => c.id === (p && p.category)) || {}).group;
const discount = p => (p && +p.mrp > +p.price) ? Math.round((1 - p.price / p.mrp) * 100) : 0;
const variantsOf = p => { p = getProduct(p); if (!p) return []; return p.family ? PRODUCTS.filter(x => x.family === p.family) : [p]; };
const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = () => matchMedia("(hover: hover) and (pointer: fine)").matches;
const pad2 = n => String(Math.max(0, Math.floor(+n || 0))).padStart(2, "0");
const productUrl = p => `product.html?id=${encodeURIComponent(p.id)}`;
const titleOf = p => String(p.name).split(" — ")[0];
const DROP = Object.assign({ number: "01", name: "", launch: null }, STORE.drop || {});
const dropLabel = () => `Drop ${DROP.number}`;
/* "Screen print +1" — first technique plus how many more ("" if none) */
function techLabel(p) {
  p = getProduct(p); const t = (p && Array.isArray(p.techniques) ? p.techniques : []).filter(Boolean);
  return t.length ? t[0] + (t.length > 1 ? ` +${t.length - 1}` : "") : "";
}

/* WhatsApp link. With no number configured it falls back to a share link (wa.me/?text=). */
const waNumber = () => String(STORE.whatsapp || "").replace(/\D/g, "");
function waLink(text = "") {
  const n = waNumber(), q = text ? "?text=" + encodeURIComponent(text) : "";
  return n ? `https://wa.me/${n}${q}` : `https://wa.me/${q}`;
}

/* Catalogue helpers */
const liveCategories = () => CATEGORIES.filter(c => PRODUCTS.some(p => p.category === c.id));
const hasBottoms = () => PRODUCTS.some(p => groupOf(p) === "Bottoms" || ["pants", "shorts"].includes(p.shape));
const mixMatchOn = () => !!(STORE.features && STORE.features.mixAndMatch) && hasBottoms();
const LOW_STOCK = 10;
function stockInfo(p) {
  p = getProduct(p);
  if (!p) return { left: 0, total: 0, pct: 0, low: false, soldOut: true };
  const left = Math.max(0, Math.floor(+p.stock || 0));
  const total = +p.edition > 0 ? Math.max(Math.floor(+p.edition), left) : 0;
  return { left, total, pct: total ? Math.round(left / total * 100) : (left > 0 ? 100 : 0), low: left > 0 && left <= LOW_STOCK, soldOut: left <= 0 };
}
function dropState() {
  const t = DROP.launch ? Date.parse(DROP.launch) : NaN;
  if (!isFinite(t)) return { live: true, launch: null, msLeft: 0 };
  const msLeft = Math.max(0, t - Date.now());
  return { live: msLeft <= 0, launch: new Date(t), msLeft };
}
const isBuyable = p => { p = getProduct(p); return !!p && dropState().live && stockInfo(p).left > 0; };
function formatCountdown(ms, short) {
  const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
  if (!short) return `${pad2(d)}:${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
  return d ? `${pad2(d)}d ${pad2(h)}h ${pad2(m)}m` : `${pad2(h)}h ${pad2(m)}m ${pad2(sec)}s`;
}
/* Why a product can't be bought right now ("" when it can). */
function buyBlockReason(p) {
  p = getProduct(p); if (!p) return "That product isn't available.";
  const d = dropState();
  if (!d.live) return `${dropLabel()} opens in ${formatCountdown(d.msLeft, true)}.`;
  if (stockInfo(p).soldOut) return `${titleOf(p)} is sold out.`;
  return "";
}

/* Countdowns: one shared 1s timer. countdown(el, date) → stop(). Also auto-binds [data-countdown]. */
const _cds = new Set(); let _cdTimer = 0, _dropLiveFired = false;
function _cdTick() {
  const now = Date.now();
  _cds.forEach(c => {
    if (c.el.isConnected) c.seen = true; else if (c.seen) { _cds.delete(c); return; }
    const left = Math.max(0, c.t - now), txt = formatCountdown(left, c.short);
    if (c.el.textContent !== txt) c.el.textContent = txt;
    c.el.setAttribute("aria-label", formatCountdown(left, true) + " left");
    if (left <= 0) { c.el.classList.add("is-done"); _cds.delete(c); if (!_dropLiveFired && Math.abs(c.t - Date.parse(DROP.launch)) < 1000) fireDropLive(); }
  });
  if (!_cds.size) { clearInterval(_cdTimer); _cdTimer = 0; }
}
function countdown(el, launchDate = DROP.launch) {
  if (!el) return () => {};
  const t = launchDate instanceof Date ? launchDate.getTime() : Date.parse(launchDate);
  el.classList.add("countdown"); el.dataset.cdBound = "1";
  if (!isFinite(t)) { el.textContent = formatCountdown(0, el.dataset.countdownFormat === "short"); return () => {}; }
  const c = { el, t, short: el.dataset.countdownFormat === "short", seen: el.isConnected };
  _cds.add(c); _cdTick();
  if (!_cdTimer && _cds.size) _cdTimer = setInterval(_cdTick, 1000);
  return () => _cds.delete(c);
}
function initCountdowns(root = document) {
  $$("[data-countdown]:not([data-cd-bound])", root).forEach(el => countdown(el, el.dataset.countdown || DROP.launch));
}
function fireDropLive() {
  _dropLiveFired = true;
  const ev = new CustomEvent("drop:live", { cancelable: true, detail: { drop: DROP } });
  const go = document.dispatchEvent(ev);
  renderCart();
  if (go) setTimeout(() => location.reload(), 900);
}

/* ---------- Images ---------- */
function productImage(p, i = 0, view, opts = {}) {
  p = getProduct(p); if (!p) return "";
  const src = p.images && p.images[i];
  if (src) return `<img src="${esc(src)}" alt="${esc(p.name)}${i ? " (view " + (i + 1) + ")" : ""}" loading="${opts.eager ? "eager" : "lazy"}" decoding="async">`;
  if (typeof Art !== "undefined" && Art.garment) {
    try { return Art.garment(p, { view: view || (i === 1 ? "back" : i >= 2 ? "detail" : "front"), bg: opts.bg }); } catch (e) { console.error(e); }
  }
  return `<div class="img-fallback" style="background:${esc(p.color)}" role="img" aria-label="${esc(p.name)}"></div>`;
}
const CAMPAIGN_SCENES = { hero: "flatlay", heroMobile: "flatlay", banner: "rail", story: "macro", newsletter: "stack" };
const CAMPAIGN_RATIOS = { hero: "16:9", heroMobile: "3:4", banner: "16:9", story: "4:5", newsletter: "4:5" };
/* Big editorial slots: owner photo (STORE.campaign[slot]) if set, else Art.campaign(scene). */
function campaignImage(slot, opts = {}) {
  const src = (STORE.campaign || {})[slot];
  const alt = opts.alt != null ? String(opts.alt) : `${STORE.name} ${dropLabel()}${DROP.name ? " — " + DROP.name : ""}`;
  if (src) return `<img src="${esc(src)}" alt="${esc(alt)}" loading="${opts.eager ? "eager" : "lazy"}" decoding="async">`;
  const scene = opts.scene || CAMPAIGN_SCENES[slot] || "flatlay", ratio = opts.ratio || CAMPAIGN_RATIOS[slot] || "16:9";
  if (typeof Art !== "undefined" && typeof Art.campaign === "function") {
    try {
      let svg = String(Art.campaign(scene, { ratio }) || "");
      if (svg) {
        const open = (svg.match(/<svg\b[^>]*>/) || [""])[0];
        if (open && alt) {
          let add = "";
          if (!/\brole=/.test(open)) add += ' role="img"';
          if (!/\baria-label=/.test(open)) add += ` aria-label="${esc(alt)}"`;
          if (add) svg = svg.replace(/<svg\b/, "<svg" + add);
        }
        return svg;
      }
    } catch (e) { console.error(e); }
  }
  const sp = scene.startsWith("single:") ? getProduct(scene.slice(7)) : null;
  const p = sp || PRODUCTS.find(x => (x.tags || []).includes("bestseller")) || PRODUCTS[0];
  return `<div class="img-fallback campaign-fallback" role="img" aria-label="${esc(alt)}">${p ? productImage(p) : ""}</div>`;
}
function swatchHTML(color) {
  return (typeof Art !== "undefined" && Art.swatch) ? Art.swatch(color) : `<span class="swatch-dot" style="background:${esc(color)}"></span>`;
}

const _svg = (d, w = 20, sw = 1.3, vb = 24) => `<svg viewBox="0 0 ${vb} ${vb}" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="${sw}" aria-hidden="true">${d}</svg>`;
const ICON = {
  search: _svg(`<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>`),
  heart: _svg(`<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z" stroke-linejoin="round"/>`),
  bag: _svg(`<path d="M5 8.5h14l-1 12H6z" stroke-linejoin="round"/><path d="M9 10.5V7a3 3 0 0 1 6 0v3.5"/>`),
  menu: _svg(`<path d="M3.5 7.5h17M3.5 12h17M3.5 16.5h17"/>`, 22),
  close: _svg(`<path d="m6 6 12 12M18 6 6 18"/>`),
  arrow: _svg(`<path d="M4 12h15m-5-5 5 5-5 5"/>`, 16),
  chevD: _svg(`<path d="m6 9 6 6 6-6"/>`, 14, 1.5),
  chevL: _svg(`<path d="m15 6-6 6 6 6"/>`, 16, 1.5),
  chevR: _svg(`<path d="m9 6 6 6-6 6"/>`, 16, 1.5),
  up: _svg(`<path d="M12 19V5m-6 6 6-6 6 6"/>`, 18),
  plus: _svg(`<path d="M12 5v14M5 12h14"/>`, 16, 1.4),
  minus: _svg(`<path d="M5 12h14"/>`, 16, 1.4),
  eye: _svg(`<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>`, 16),
  check: _svg(`<path d="m5 12.5 4.5 4.5L19 7.5"/>`, 16, 1.6),
  info: _svg(`<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.9"/>`, 16),
  alert: _svg(`<circle cx="12" cy="12" r="9"/><path d="M12 7v6.5M12 16v1"/>`, 16),
  lock: _svg(`<rect x="5" y="10.5" width="14" height="10"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>`, 16),
  tape: _svg(`<path d="M3 15.5 15.5 3 21 8.5 8.5 21z"/><path d="m7 11.5 2 2M10 8.5l2 2M13 5.5l2 2"/>`, 16),
  ruler: _svg(`<path d="M3 15.5 15.5 3 21 8.5 8.5 21z"/><path d="m7 11.5 2 2M10 8.5l2 2M13 5.5l2 2"/>`, 18),
  gift: _svg(`<rect x="3.5" y="9" width="17" height="11.5"/><path d="M2.5 9h19M12 9v11.5M12 9S9.5 4 7.3 5.3C5.6 6.3 7.6 9 12 9Zm0 0s2.5-5 4.7-3.7C18.4 6.3 16.4 9 12 9Z"/>`, 18),
  truck: _svg(`<path d="M3 8h16v14H3zM19 13h6l4 5v4H19"/><circle cx="9" cy="23.5" r="2.5"/><circle cx="24" cy="23.5" r="2.5"/>`, 26, 1.3, 32),
  cash: _svg(`<rect x="3" y="9" width="26" height="15"/><circle cx="16" cy="16.5" r="3.5"/><path d="M7 13v7M25 13v7"/>`, 26, 1.3, 32),
  swap: _svg(`<path d="M6 12h19l-5-5M26 20H7l5 5"/>`, 26, 1.3, 32),
  fabric: _svg(`<path d="M4 7h24v18H4z"/><path d="M4 13h24M4 19h24M10 7v18M16 7v18M22 7v18" opacity=".55"/>`, 26, 1.3, 32),
  india: _svg(`<circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="3"/><path d="M16 5v8M16 19v8M5 16h8M19 16h8"/>`, 26, 1.3, 32),
  truckSm: _svg(`<path d="M2.5 6.5h11v10h-11zM13.5 10h4l3 3.5v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>`, 18),
  mail: _svg(`<rect x="3" y="5.5" width="18" height="13"/><path d="m3.5 7 8.5 6 8.5-6"/>`, 18),
  insta: _svg(`<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6" fill="currentColor"/>`, 18),
  wa: `<svg viewBox="0 0 32 32" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.6a10.6 10.6 0 0 1-5.4-1.5l-.4-.2-3.9 1 1-3.8-.2-.4A10.6 10.6 0 1 1 16 26.6zm5.8-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.7 8.7 0 0 1-4.3-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.7 3.7 0 0 0-1.1 2.7 6.4 6.4 0 0 0 1.3 3.4 14.7 14.7 0 0 0 5.6 5c2.1.9 2.9 1 4 .8a3.4 3.4 0 0 0 2.2-1.6 2.8 2.8 0 0 0 .2-1.6c-.1-.1-.3-.2-.6-.4z"/></svg>`
};

/* ---------- Storage-backed stores ---------- */
const _store = {
  read(k, fb) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fb; } catch (e) { return fb; } },
  write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
};
const _emit = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));

const Cart = {
  KEY: "bhakshi_cart", NOTE_KEY: "bhakshi_cart_note", MAX: 10,
  get() {
    const raw = _store.read(this.KEY, []);
    return Array.isArray(raw) ? raw.filter(i => i && getProduct(i.id) && +i.qty > 0).map(i => ({ ...i, qty: Math.floor(+i.qty) })) : [];
  },
  save(items, detail = {}) {
    _store.write(this.KEY, items);
    _emit("cart:change", { items: this.get(), count: this.count(), subtotal: this.subtotal(), ...detail });
  },
  limit(id) { const p = getProduct(id); return p ? Math.max(0, Math.min(this.MAX, stockInfo(p).left)) : 0; },
  /* Returns the cart line, or false when refused (not buyable / no size) — with a toast saying why. */
  add(id, size, qty = 1, opts = {}) {
    const p = getProduct(id); if (!p) return false;
    if (!isBuyable(p)) { if (!opts.silent) toast(buyBlockReason(p), { type: "error" }); return false; }
    if (p.sizes && p.sizes.length && (size == null || size === "" || !p.sizes.map(String).includes(String(size)))) {
      if (!opts.silent) toast("Please choose a size.", { type: "error" }); return false;
    }
    qty = Math.max(1, parseInt(qty, 10) || 1);
    const items = this.get(), max = this.limit(p.id);
    let line = items.find(i => i.id === p.id && String(i.size) === String(size));
    if (line && line.qty >= max) { if (!opts.silent) toast(`Maximum ${max} of ${titleOf(p)} per order.`, { type: "info" }); return line; }
    if (line) line.qty = Math.min(max, line.qty + qty);
    else items.push(line = { id: p.id, size, qty: Math.min(max, qty) });
    this.save(items, { action: "add", id: p.id, size, qty });
    return line;
  },
  setQty(index, qty) {
    const items = this.get(); if (!items[index]) return;
    qty = parseInt(qty, 10) || 0;
    if (qty <= 0) return this.remove(index);
    items[index].qty = Math.max(1, Math.min(this.limit(items[index].id) || 1, qty));
    this.save(items, { action: "qty", index });
  },
  remove(index) {
    const items = this.get(); const [line] = items.splice(index, 1);
    if (line) this.save(items, { action: "remove", index, line });
    return line;
  },
  insert(index, line) { const items = this.get(); items.splice(Math.min(index, items.length), 0, line); this.save(items, { action: "add", id: line.id }); },
  clear() { _store.write(this.NOTE_KEY, { gift: false, note: "" }); this.save([], { action: "clear" }); _emit("cart:note", this.note()); },
  lines() { return this.get().map((i, index) => ({ ...i, index, p: getProduct(i.id) })); },
  subtotal() { return this.lines().reduce((s, l) => s + l.p.price * l.qty, 0); },
  count() { return this.get().reduce((s, i) => s + i.qty, 0); },
  has(id) { return this.get().some(i => i.id === id); },
  /* Gift flag + order note → { gift: bool, note: string } (saved in localStorage "bhakshi_cart_note") */
  note() {
    const v = _store.read(this.NOTE_KEY, null);
    return { gift: !!(v && v.gift), note: v && typeof v.note === "string" ? v.note.slice(0, 500) : "" };
  },
  setNote(obj = {}) {
    const cur = this.note(), next = { gift: "gift" in obj ? !!obj.gift : cur.gift, note: "note" in obj ? String(obj.note || "").slice(0, 500) : cur.note };
    _store.write(this.NOTE_KEY, next); _emit("cart:note", next); return next;
  }
};

const Wishlist = {
  KEY: "bhakshi_wishlist",
  get() { const v = _store.read(this.KEY, []); return Array.isArray(v) ? v.filter(id => getProduct(id)) : []; },
  has(id) { return this.get().includes(id); },
  toggle(id) {
    const list = this.get(), i = list.indexOf(id), added = i < 0;
    added ? list.unshift(id) : list.splice(i, 1);
    _store.write(this.KEY, list);
    _emit("wishlist:change", { id, added, items: list.slice(), count: list.length });
    return added;
  },
  add(id) { if (!this.has(id)) this.toggle(id); },
  remove(id) { if (this.has(id)) this.toggle(id); },
  count() { return this.get().length; }
};

const Recent = {
  KEY: "bhakshi_recent", MAX: 12,
  add(id) {
    if (!getProduct(id)) return;
    const list = _store.read(this.KEY, []);
    const next = (Array.isArray(list) ? list : []).filter(x => x !== id && getProduct(x));
    next.unshift(id); _store.write(this.KEY, next.slice(0, this.MAX));
  },
  /* returns product objects (most recent first) */
  list(excludeId) {
    const ids = _store.read(this.KEY, []);
    return (Array.isArray(ids) ? ids : []).filter(id => id !== excludeId).map(getProduct).filter(Boolean);
  }
};

/* Cross-tab sync */
addEventListener("storage", e => {
  if (e.key === Cart.KEY) _emit("cart:change", { items: Cart.get(), count: Cart.count(), subtotal: Cart.subtotal(), action: "sync" });
  if (e.key === Cart.NOTE_KEY) _emit("cart:note", Cart.note());
  if (e.key === Wishlist.KEY) _emit("wishlist:change", { items: Wishlist.get(), count: Wishlist.count(), action: "sync" });
});

const uniqueFamilies = (list, n) => { const seen = new Set(), out = []; list.forEach(p => { const f = p.family || p.id; if (out.length < n && !seen.has(f)) { seen.add(f); out.push(p); } }); return out; };
const rankProduct = p => (isBuyable(p) ? 10 : 0) + ((p.tags || []).includes("bestseller") ? 2 : 0) + ((p.tags || []).includes("new") ? 1 : 0);

/* ---------- Stock note & product card ---------- */
/* v3 has no meters: a quiet text line ("Only 9 left" / "Sold out"), empty when stock is healthy. */
function stockMeter(p, opts = {}) {
  const s = stockInfo(p);
  const txt = s.soldOut ? "Sold out" : s.low ? `Only ${s.left} left` : (opts.always ? "In stock" : "");
  return txt ? `<p class="stock-note${s.low ? " is-low" : ""}${s.soldOut ? " is-out" : ""}${opts.className ? " " + esc(opts.className) : ""}">${esc(txt)}</p>` : "";
}
function cardArt(p, view) {
  if (p.images && p.images.length) {
    const i = view === "back" ? 1 : 0;
    return p.images[i] ? productImage(p, i) : "";
  }
  return productImage(p, 0, view);
}
function priceHTML(p, cls = "card-price") {
  const off = discount(p);
  return `<p class="${cls} price"><span class="price-now">${rupee(p.price)}</span>${off > 0 ? ` <s class="price-mrp"><span class="sr-only">MRP </span>${rupee(p.mrp)}</s>` : ""}</p>`;
}
function productCard(p) {
  p = getProduct(p); if (!p) return "";
  const id = esc(p.id), url = productUrl(p), s = stockInfo(p), d = dropState(), off = discount(p), wished = Wishlist.has(p.id), buy = isBuyable(p);
  const tags = p.tags || [], name = titleOf(p), tech = techLabel(p);
  const badge = s.soldOut ? `<span class="badge card-badge is-out">Sold out</span>`
    : off > 0 && tags.includes("sale") ? `<span class="badge card-badge is-sale">Sale</span>`
    : tags.includes("new") ? `<span class="badge card-badge">New</span>`
    : off > 0 ? `<span class="badge card-badge is-sale">Sale</span>` : "";
  const back = cardArt(p, "back");
  const vars = variantsOf(p);
  const swatches = vars.length > 1 ? `<div class="card-swatches" aria-label="${vars.length} colours">${vars.slice(0, 5).map(v =>
    `<a class="swatch${v.id === p.id ? " is-current" : ""}" href="${productUrl(v)}" title="${esc(v.colorName)}" aria-label="${esc(v.colorName)}"${v.id === p.id ? ' aria-current="true"' : ""}>${swatchHTML(v.color)}</a>`).join("")}${vars.length > 5 ? `<span class="swatch-more">+${vars.length - 5}</span>` : ""}</div>` : "";
  const bar = buy
    ? `<div class="card-bar"><div class="card-bar-inner">
        <button type="button" class="card-quick" data-quick="${id}" aria-label="Quick add ${esc(name)}"><span class="card-quick-label">Quick add</span><i class="card-quick-plus" aria-hidden="true">${ICON.plus}</i></button>
        <div class="card-sizes" role="group" aria-label="Add ${esc(name)} to cart — choose size">${(p.sizes || []).map(sz =>
          `<button type="button" data-add="${id}" data-size="${esc(sz)}" aria-label="Add ${esc(name)}, size ${esc(sz)}, to cart">${esc(sz)}</button>`).join("")}</div>
      </div></div>`
    : (!d.live && !s.soldOut
      ? `<div class="card-bar is-locked"><div class="card-bar-inner"><p class="card-bar-note">Opens in <span data-countdown data-countdown-format="short"></span></p></div></div>`
      : "");
  return `<article class="card${s.soldOut ? " is-soldout" : ""}${s.low ? " is-low" : ""}${back ? " has-back" : ""}" data-id="${id}">
    <a class="card-media" href="${url}" tabindex="-1" aria-hidden="true">
      <span class="card-img">${cardArt(p, "front")}</span>
      ${back ? `<span class="card-img-alt">${back}</span>` : ""}
      ${badge}
    </a>
    <button type="button" class="card-wish" data-wish="${id}" aria-pressed="${wished}" aria-label="${wished ? "Remove from" : "Add to"} wishlist">${ICON.heart}</button>
    ${bar}
    <div class="card-body">
      <a class="card-name card-title" href="${url}">${esc(name)}</a>
      ${tech ? `<p class="card-tech">${esc(tech)}</p>` : ""}
      ${priceHTML(p)}
      ${s.low ? `<p class="card-stock">Only ${s.left} left</p>` : ""}
      ${swatches}
    </div>
  </article>`;
}

/* Compact horizontal product row used in cart, upsells */
function miniCard(p, extra = "") {
  return `<div class="mini-card"><a class="mini-thumb" href="${productUrl(p)}" tabindex="-1" aria-hidden="true">${productImage(p)}</a>
    <div class="mini-info"><a class="mini-name" href="${productUrl(p)}">${esc(titleOf(p))}</a>
    <span class="mini-meta">${esc(techLabel(p) || p.colorName || "")}</span><span class="mini-price">${rupee(p.price)}</span>${extra}</div></div>`;
}
const miniSizes = p => `<div class="mini-sizes" role="group" aria-label="Quick add ${esc(titleOf(p))}">${(p.sizes || []).map(s => `<button type="button" data-add="${esc(p.id)}" data-size="${esc(s)}" aria-label="Add ${esc(titleOf(p))} size ${esc(s)}">${esc(s)}</button>`).join("")}</div>`;

/* Centred row of small category links (+ "All"). Pages may drop it anywhere. */
function categoryLinksRow(opts = {}) {
  const params = new URLSearchParams(location.search), page = (document.body && document.body.dataset.page) || "";
  const active = opts.active !== undefined ? opts.active : (page === "shop" && !params.get("tag") && !params.get("q") ? (params.get("cat") || "") : null);
  const link = (href, label, on) => `<a class="cat-link${on ? " is-active" : ""}" href="${href}"${on ? ' aria-current="page"' : ""}>${esc(label)}</a>`;
  return `<nav class="cat-links${opts.className ? " " + esc(opts.className) : ""}" aria-label="${esc(opts.label || "Shop by category")}">${link("shop.html", opts.allLabel || "All", active === "")}${liveCategories().map(c => link(`shop.html?cat=${encodeURIComponent(c.id)}`, c.name, active === c.id)).join("")}</nav>`;
}

/* ---------- Scroll lock & layer stack (drawers, search, modal) ---------- */
let _lockCount = 0;
function lockScroll(on) {
  _lockCount = Math.max(0, _lockCount + (on ? 1 : -1));
  const de = document.documentElement;
  if (_lockCount && !de.classList.contains("is-locked")) {
    de.style.setProperty("--sbw", (innerWidth - de.clientWidth) + "px");
    de.classList.add("is-locked");
  } else if (!_lockCount) { de.classList.remove("is-locked"); de.style.removeProperty("--sbw"); }
}
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const focusables = el => $$(FOCUSABLE, el).filter(n => (n.offsetParent !== null || n === document.activeElement) && !n.closest("[inert]"));
const Layers = {
  stack: [],
  open(el, close, focusEl) {
    if (this.stack.some(l => l.el === el)) return;
    this.stack.push({ el, close, restore: document.activeElement });
    lockScroll(true);
    setTimeout(() => { const f = focusEl || focusables(el)[0] || el; try { f.focus({ preventScroll: true }); } catch (e) {} }, 60);
  },
  close(el) {
    const i = this.stack.findIndex(l => l.el === el); if (i < 0) return;
    const [l] = this.stack.splice(i, 1); lockScroll(false);
    if (l.restore && document.contains(l.restore) && l.restore.focus) { try { l.restore.focus({ preventScroll: true }); } catch (e) {} }
  },
  top() { return this.stack[this.stack.length - 1]; }
};
document.addEventListener("keydown", e => {
  const top = Layers.top(); if (!top) return;
  if (e.key === "Escape") { e.preventDefault(); top.close(); return; }
  if (e.key === "Tab") {
    const f = focusables(top.el); if (!f.length) { e.preventDefault(); return; }
    const first = f[0], last = f[f.length - 1];
    if (!top.el.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

/* ---------- Navigation model (built from data) ---------- */
function navGroups() {
  const out = [];
  liveCategories().forEach(c => { let g = out.find(x => x.name === c.group); if (!g) out.push(g = { name: c.group, cats: [] }); g.cats.push(c); });
  return out;
}
const countIn = fn => PRODUCTS.filter(fn).length;
const hasTag = t => PRODUCTS.some(p => (p.tags || []).includes(t));
function shopLinks() {
  const out = [["shop.html", "All products"]];
  if (hasTag("new")) out.push(["shop.html?tag=new", "New in"]);
  if (hasTag("bestseller")) out.push(["shop.html?tag=bestseller", "Bestsellers"]);
  if (PRODUCTS.some(p => discount(p) > 0)) out.push(["shop.html?tag=sale", "Sale"]);
  return out;
}
function megaHTML() {
  const groups = navGroups();
  const best = uniqueFamilies(PRODUCTS.slice().sort((a, b) => rankProduct(b) - rankProduct(a)), 1)[0];
  return `<div class="mega-inner container">
    <div class="mega-cols">
      <div class="mega-col"><p class="mega-head">Shop</p><ul>${shopLinks().map(([h, l]) => `<li><a href="${h}">${esc(l)}</a></li>`).join("")}</ul></div>
      ${groups.map(g => `<div class="mega-col"><p class="mega-head">${esc(g.name)}</p><ul>${g.cats.map(c => `<li><a href="shop.html?cat=${encodeURIComponent(c.id)}">${esc(c.name)}<span class="mega-count">${countIn(p => p.category === c.id)}</span></a></li>`).join("")}</ul></div>`).join("")}
      <div class="mega-col"><p class="mega-head">Help</p><ul><li><button type="button" data-fitfinder>Size guide</button></li><li><a href="policies.html#shipping">Shipping</a></li><li><a href="policies.html#exchange">Exchange &amp; returns</a></li></ul></div>
    </div>
    <div class="mega-tiles">
      <a class="mega-tile" href="shop.html"><span class="mega-tile-media is-wide">${campaignImage("banner", { scene: "rail", ratio: "4:5", alt: `${dropLabel()}${DROP.name ? " — " + DROP.name : ""}` })}</span>
        <span class="mega-tile-name">${esc(dropLabel())}${DROP.name ? " — " + esc(DROP.name) : ""}</span><span class="mega-tile-sub">Shop the drop</span></a>
      ${best ? `<a class="mega-tile" href="${productUrl(best)}"><span class="mega-tile-media">${productImage(best)}</span>
        <span class="mega-tile-name">${esc(titleOf(best))}</span><span class="mega-tile-sub">${rupee(best.price)}</span></a>` : ""}
    </div>
  </div>`;
}
function dropStatusHTML() {
  const d = dropState();
  return d.live ? `<a class="drop-status" href="shop.html">${esc(dropLabel())} — available now</a>`
    : `<span class="drop-status is-soon" role="timer">${esc(dropLabel())} opens in <span data-countdown data-countdown-format="short"></span></span>`;
}
const codOn = () => STORE.codFee !== -1;
const allHeavy = () => PRODUCTS.length && PRODUCTS.every(p => /240\s*gsm/i.test(p.fabric || ""));
const STAMP = `<img class="brand-stamp" src="images/stamp.svg" alt="" width="28" height="28" decoding="async" onerror="this.remove()">`;

/* ---------- Layout: announcement, header, menus, search, drawer, footer ---------- */
function renderLayout() {
  const body = document.body, main = $("main");
  const page = body.dataset.page || "";
  const params = new URLSearchParams(location.search);
  let annClosed = false; try { annClosed = sessionStorage.getItem("bhakshi_announce_closed") === "1"; } catch (e) {}
  const ann = (STORE.announcement || []).filter(Boolean).map(a => esc(a));
  if (!dropState().live) ann.unshift(`${esc(dropLabel())} opens in <span data-countdown data-countdown-format="short"></span>`);
  const cur = cond => cond ? ' aria-current="page"' : "";
  const shopCur = page === "shop" && !location.search;

  const header = `
  <a class="skip-link" href="#main">Skip to content</a>
  ${ann.length && !annClosed ? `<div class="announce" role="region" aria-label="Announcements">
    <div class="announce-track">${ann.map((a, i) => `<p class="announce-item${i ? "" : " is-active"}"${i ? ' aria-hidden="true"' : ""}>${a}</p>`).join("")}</div>
    <button type="button" class="announce-close" aria-label="Dismiss announcement">${ICON.close}</button></div>` : ""}
  <header class="site-header" id="site-header">
    <div class="header-inner">
      <div class="header-left">
        <button type="button" class="icon-btn menu-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu">${ICON.menu}</button>
        <nav class="nav-main" aria-label="Main"><ul>
          <li class="has-mega"><a class="nav-link" href="shop.html" aria-haspopup="true" aria-expanded="false" aria-controls="mega-shop"${cur(page === "shop" && params.has("cat"))}>Shop</a></li>
          <li><a class="nav-link" href="shop.html"${cur(shopCur)}>${esc(dropLabel())}</a></li>
          <li><a class="nav-link" href="about.html"${cur(page === "about")}>About</a></li>
        </ul></nav>
      </div>
      <a class="brand" href="index.html" aria-label="${esc(STORE.name)} — home">${STAMP}<span class="wordmark">${esc(STORE.name)}</span></a>
      <div class="header-right">
        <button type="button" class="icon-btn search-toggle" aria-label="Search" aria-controls="search-overlay">${ICON.search}</button>
        <a class="icon-btn wish-link" href="wishlist.html" aria-label="Wishlist"${cur(page === "wishlist")}>${ICON.heart}<span class="count wish-count" data-count="0">0</span></a>
        <button type="button" class="icon-btn cart-toggle" aria-label="Open cart" aria-controls="cart-drawer">${ICON.bag}<span class="count cart-count" data-count="0">0</span></button>
      </div>
    </div>
    <div class="mega" id="mega-shop" role="region" aria-label="Shop menu"></div>
  </header>
  <div class="mega-scrim" aria-hidden="true"></div>
  <div class="scrim" aria-hidden="true"></div>
  <aside class="mobile-menu" id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu" tabindex="-1" inert>
    <div class="mm-head"><a class="brand" href="index.html" aria-label="${esc(STORE.name)} — home"><span class="wordmark">${esc(STORE.name)}</span></a>
      <button type="button" class="icon-btn mm-close" aria-label="Close menu">${ICON.close}</button></div>
    <nav class="mm-nav" aria-label="Mobile">
      <button type="button" class="mm-link mm-acc" aria-expanded="false" aria-controls="mm-shop"><span>Shop</span><i class="mm-acc-icon" aria-hidden="true"></i></button>
      <div class="mm-panel" id="mm-shop" inert><div class="mm-panel-inner">
        ${shopLinks().map(([h, l]) => `<a href="${h}">${esc(l)}</a>`).join("")}
        ${liveCategories().map(c => `<a href="shop.html?cat=${encodeURIComponent(c.id)}">${esc(c.name)}</a>`).join("")}
      </div></div>
      <a class="mm-link" href="shop.html">${esc(dropLabel())}${DROP.name ? `<span class="mm-sub">${esc(DROP.name)}</span>` : ""}</a>
      <a class="mm-link" href="about.html">About</a>
      <a class="mm-link" href="contact.html">Contact</a>
      <a class="mm-link" href="wishlist.html">Wishlist <span class="mm-sub wish-count-text">(0)</span></a>
    </nav>
    <div class="mm-foot">
      <button type="button" data-fitfinder>Size guide</button>
      <a href="policies.html#shipping">Shipping</a>
      <a href="policies.html#exchange">Exchange &amp; returns</a>
      ${STORE.instagram ? `<a href="${esc(STORE.instagram)}" target="_blank" rel="noopener">Instagram</a>` : ""}
      <a href="${waLink("Hi BHAKSHI, I need some help.")}" target="_blank" rel="noopener">WhatsApp</a>
      <p class="mm-note">UPI${codOn() ? " · Cash on Delivery" : ""} · Free shipping above ${esc(rupee(STORE.freeShippingAbove).replace(/\.00$/, ""))}</p>
    </div>
  </aside>
  <div class="search-overlay" id="search-overlay" role="dialog" aria-modal="true" aria-label="Search products" inert>
    <div class="search-panel">
      <div class="container search-head">
        <form class="search-form" action="shop.html" role="search">
          ${ICON.search}
          <label class="sr-only" for="search-input">Search products</label>
          <input id="search-input" type="search" name="q" placeholder="Search for products" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="false" aria-controls="search-results" aria-autocomplete="list">
          <button type="button" class="search-clear" hidden>Clear</button>
        </form>
        <button type="button" class="icon-btn search-close" aria-label="Close search">${ICON.close}</button>
      </div>
      <div class="container search-body">
        <div class="search-empty">
          <div class="search-chips" aria-label="Suggestions"></div>
          <p class="search-label">Popular products</p>
          <div class="search-grid search-trending"></div>
        </div>
        <div class="search-results-wrap" hidden>
          <div class="search-results-head"><p class="search-label search-count" aria-live="polite"></p><a class="link-underline search-all" href="shop.html">View all results</a></div>
          <div class="search-grid search-results" id="search-results" role="listbox" aria-label="Results"></div>
        </div>
        <div class="search-none" hidden></div>
      </div>
    </div>
  </div>
  <aside class="drawer cart-drawer" id="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title" tabindex="-1" inert>
    <div class="drawer-head"><h2 class="drawer-title" id="cart-title">Your cart <span class="drawer-count"></span></h2>
      <button type="button" class="icon-btn drawer-close" aria-label="Close cart">${ICON.close}</button></div>
    <div class="cart-ship"></div>
    <div class="drawer-body">
      <div class="cart-lines"></div>
      <div class="cart-extras" hidden>
        <label class="cart-gift"><input type="checkbox" class="cart-gift-input"><span class="cart-gift-box" aria-hidden="true">${ICON.check}</span><span>This is a gift — add a note</span></label>
        <button type="button" class="cart-note-toggle" aria-expanded="false" aria-controls="cart-note-wrap">Add order note</button>
        <div class="cart-note-wrap" id="cart-note-wrap" hidden>
          <label class="cart-note-label" for="cart-note-input">Order note</label>
          <textarea id="cart-note-input" class="cart-note-input" rows="3" maxlength="500" placeholder="Special instructions, delivery notes…"></textarea>
          <span class="cart-note-hint">Saved automatically and sent with your order.</span>
        </div>
      </div>
      <div class="cart-upsell"></div>
    </div>
    <div class="drawer-foot cart-foot"></div>
  </aside>`;
  if (main) main.insertAdjacentHTML("beforebegin", header); else body.insertAdjacentHTML("afterbegin", header);

  const year = new Date().getFullYear();
  const footer = `
  <footer class="site-footer">
    <div class="container footer-top">
      <div class="footer-brand">
        <a class="brand" href="index.html" aria-label="${esc(STORE.name)} — home">${STAMP}<span class="wordmark">${esc(STORE.name)}</span></a>
        <p>${esc(STORE.tagline || "Printed by hand. Made in India.")} Heavyweight tees made in small runs — when a drop sells out, it's gone.</p>
      </div>
      <nav class="footer-col" aria-label="Resources"><h3>Resources</h3>
        <a href="about.html">About</a><a href="contact.html">Contact</a><button type="button" data-fitfinder>Size guide</button><a href="contact.html#track">Track order</a></nav>
      <nav class="footer-col" aria-label="Quick links"><h3>Quick links</h3>
        <a href="policies.html#shipping">Shipping</a><a href="policies.html#exchange">Exchange &amp; returns</a><a href="policies.html#privacy">Privacy</a><a href="policies.html#terms">Terms</a></nav>
      <div class="footer-col"><h3>Social</h3>
        ${STORE.instagram ? `<a href="${esc(STORE.instagram)}" target="_blank" rel="noopener">Instagram</a>` : ""}
        <a href="${waLink("Hi BHAKSHI!")}" target="_blank" rel="noopener">WhatsApp</a>
        ${STORE.email ? `<a href="mailto:${esc(STORE.email)}">${esc(STORE.email)}</a>` : ""}</div>
      <form class="wa-join footer-join" novalidate>
        <h3>Get first access</h3>
        <p>New drops reach WhatsApp first. One message per drop, nothing else.</p>
        <div class="wa-join-row"><label class="sr-only" for="wa-join-name">Your first name</label>
          <input id="wa-join-name" name="name" type="text" placeholder="Your first name" autocomplete="given-name" maxlength="40">
          <button type="submit" class="wa-join-btn" aria-label="Join on WhatsApp">${ICON.arrow}</button></div>
        <small>Opens WhatsApp with a message ready to send.</small>
      </form>
    </div>
    <div class="container footer-bottom">
      <span>© ${year} ${esc(STORE.name)}</span>
      <span>UPI${codOn() ? " · Cash on Delivery" : ""}</span>
      <span>Made in India</span>
    </div>
  </footer>
  <a class="wa-float" href="${waLink("Hi BHAKSHI! I have a question.")}" target="_blank" rel="noopener" aria-label="Chat with us on WhatsApp">${ICON.wa}</a>
  <div class="toast-stack" aria-live="polite"></div>
  <div class="modal" hidden><div class="modal-overlay"></div>
    <div class="modal-panel" role="dialog" aria-modal="true" tabindex="-1">
      <div class="modal-handle" aria-hidden="true"><span></span></div>
      <button type="button" class="icon-btn modal-close" aria-label="Close">${ICON.close}</button>
      <div class="modal-content"></div></div></div>`;
  if (main) main.insertAdjacentHTML("afterend", footer); else body.insertAdjacentHTML("beforeend", footer);
}

/* ---------- v2 effects kept as harmless no-ops (old markup can't break) ---------- */
function initTickers() {}
function scramble() {}
function initScramble() {}
function initMagnetic() {}
function initCursor() {}
function fitFooterMark() {}

/* ---------- Announcement: fades between items, dismissible ---------- */
function initAnnouncement() {
  const bar = $(".announce"); if (!bar) return;
  const items = $$(".announce-item", bar);
  let i = 0, timer = 0, paused = false;
  const show = n => {
    items[i].classList.remove("is-active"); items[i].setAttribute("aria-hidden", "true");
    i = (n + items.length) % items.length;
    items[i].classList.add("is-active"); items[i].removeAttribute("aria-hidden");
  };
  const start = () => { clearInterval(timer); if (items.length > 1) timer = setInterval(() => { if (!paused && !document.hidden) show(i + 1); }, 4800); };
  bar.addEventListener("mouseenter", () => paused = true);
  bar.addEventListener("mouseleave", () => paused = false);
  bar.addEventListener("focusin", () => paused = true);
  bar.addEventListener("focusout", () => paused = false);
  start();
  $(".announce-close", bar).addEventListener("click", () => {
    clearInterval(timer);
    try { sessionStorage.setItem("bhakshi_announce_closed", "1"); } catch (e) {}
    bar.style.height = bar.offsetHeight + "px"; void bar.offsetHeight; bar.classList.add("is-closing"); bar.style.height = "0px";
    setTimeout(() => { bar.remove(); updateFloatOffset(); }, reducedMotion() ? 0 : 360);
  });
}

/* ---------- Header: scroll line, Shop mega panel, floating offsets ---------- */
let header;
function initHeader() {
  header = $("#site-header");
  let ticking = false;
  const update = () => {
    const y = scrollY;
    header.classList.toggle("is-scrolled", y > 4);
    document.body.classList.toggle("show-top", y > innerHeight * 1.2);
    updateFloatOffset();
    ticking = false;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener("resize", update, { passive: true });
  update();
  setInterval(() => { if (!document.hidden) updateFloatOffset(); }, 800);
  const foot = $(".site-footer");
  if (foot && "IntersectionObserver" in window) new IntersectionObserver(([en]) => document.body.classList.toggle("footer-in", en.isIntersecting), { rootMargin: "0px 0px -30% 0px" }).observe(foot);

  // Shop mega panel (hover intent, focus, click/tap, Esc)
  const li = $(".has-mega", header), trigger = li && $("a", li), panel = $("#mega-shop");
  if (li && panel) {
    let t;
    const isOpen = () => header.classList.contains("mega-open");
    const open = () => {
      clearTimeout(t);
      if (!panel.dataset.ready) { panel.innerHTML = megaHTML(); panel.dataset.ready = "1"; }
      header.classList.add("mega-open"); document.body.classList.add("mega-open"); li.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
    };
    const close = () => {
      clearTimeout(t);
      header.classList.remove("mega-open"); document.body.classList.remove("mega-open"); li.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
    };
    const later = (fn, ms) => { clearTimeout(t); t = setTimeout(fn, ms); };
    [li, panel].forEach(el => {
      el.addEventListener("mouseenter", () => later(open, isOpen() ? 0 : 120));
      el.addEventListener("mouseleave", () => later(close, 200));
    });
    trigger.addEventListener("click", e => { if (!finePointer() && !isOpen()) { e.preventDefault(); open(); } });
    trigger.addEventListener("keydown", e => { if (e.key === "ArrowDown" || ((e.key === " ") && !isOpen())) { e.preventDefault(); open(); setTimeout(() => { const f = focusables(panel)[0]; if (f) f.focus(); }, 30); } });
    li.addEventListener("focusin", open);
    // Tab from "Shop" walks into the open panel; Tab past its last link continues along the nav
    trigger.addEventListener("keydown", e => {
      if (e.key !== "Tab" || e.shiftKey || !isOpen()) return;
      const f = focusables(panel); if (f.length) { e.preventDefault(); f[0].focus(); }
    });
    panel.addEventListener("keydown", e => {
      if (e.key !== "Tab") return;
      const f = focusables(panel); if (!f.length) return;
      if (!e.shiftKey && document.activeElement === f[f.length - 1]) { const next = li.nextElementSibling && $("a,button", li.nextElementSibling); if (next) { e.preventDefault(); close(); next.focus(); } }
      else if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); trigger.focus(); }
    });
    [li, panel].forEach(el => el.addEventListener("focusout", e => { if (!li.contains(e.relatedTarget) && !panel.contains(e.relatedTarget)) close(); }));
    header.addEventListener("keydown", e => { if (e.key === "Escape" && isOpen()) { close(); trigger.focus(); } });
    $(".mega-scrim").addEventListener("mouseenter", close);
    $(".mega-scrim").addEventListener("click", close);
    panel.addEventListener("click", e => { if (e.target.closest("a,button")) close(); });
    addEventListener("resize", () => { if (innerWidth < 1024 && isOpen()) close(); }, { passive: true });
  }

  updateCounts();
  document.addEventListener("cart:change", e => updateCounts(e.detail && e.detail.action === "add"));
  document.addEventListener("wishlist:change", () => updateCounts());
}
/* Lift floating buttons + toasts above any page-owned fixed bottom bar (e.g. a sticky buy bar).
   Pages can also mark a bar with [data-bottom-bar]. */
const _ownFloat = ".wa-float, .to-top, .toast-stack, .drawer, .modal, .mobile-menu, .search-overlay, .scrim, .mega-scrim, .site-header, .fly-ghost";
let _floatOff = -1;
function updateFloatOffset() {
  let off = 0;
  try {
    $$("[data-bottom-bar]").forEach(b => { const r = b.getBoundingClientRect(); if (r.height && r.top < innerHeight && r.bottom > innerHeight - 4) off = Math.max(off, innerHeight - r.top); });
    if (!off) {
      const els = document.elementsFromPoint(Math.max(0, innerWidth - 40), innerHeight - 4);
      for (const el of els) {
        if (el === document.body || el === document.documentElement || el.closest(_ownFloat)) continue;
        let n = el, hit = null;
        while (n && n !== document.body) { const pos = getComputedStyle(n).position; if (pos === "fixed" || pos === "sticky") { hit = n; break; } n = n.parentElement; }
        if (hit) { const r = hit.getBoundingClientRect(); if (r.bottom >= innerHeight - 2 && r.height < innerHeight * .4) off = Math.max(off, innerHeight - r.top); }
        break;
      }
    }
  } catch (e) {}
  off = Math.round(off);
  if (off !== _floatOff) { _floatOff = off; document.documentElement.style.setProperty("--float-offset", off + "px"); document.body.classList.toggle("has-bottom-bar", off > 0); }
}
let _flying = 0;
function bump(el) { if (!el) return; el.classList.remove("is-bump"); void el.offsetWidth; el.classList.add("is-bump"); }
function updateCounts(added) {
  const c = Cart.count(), w = Wishlist.count();
  $$(".cart-count").forEach(el => { el.textContent = c; el.dataset.count = c; });
  $$(".wish-count").forEach(el => { el.textContent = w; el.dataset.count = w; });
  $$(".wish-count-text").forEach(el => { el.textContent = `(${w})`; });
  const ct = $(".cart-toggle"); if (ct) ct.setAttribute("aria-label", `Open cart, ${c} item${c === 1 ? "" : "s"}`);
  const wl = $(".wish-link"); if (wl) wl.setAttribute("aria-label", `Wishlist, ${w} item${w === 1 ? "" : "s"}`);
  if (added && !_flying) bump($(".cart-count"));
}
function updateCartCount() { updateCounts(); }

/* ---------- Mobile menu (left drawer) ---------- */
function openMenu() {
  const m = $("#mobile-menu"); if (!m || document.body.classList.contains("menu-open")) return;
  closeDrawers();
  m.inert = false; document.body.classList.add("menu-open");
  $(".menu-toggle").setAttribute("aria-expanded", "true");
  Layers.open(m, closeMenu, $(".mm-close", m));
}
function closeMenu() {
  const m = $("#mobile-menu"); if (!m || !document.body.classList.contains("menu-open")) return;
  document.body.classList.remove("menu-open"); m.inert = true;
  $(".menu-toggle").setAttribute("aria-expanded", "false"); Layers.close(m);
}
function initMobileMenu() {
  $(".menu-toggle").addEventListener("click", openMenu);
  $(".mm-close").addEventListener("click", closeMenu);
  const acc = $(".mm-acc"), panel = $("#mm-shop");
  if (acc && panel) acc.addEventListener("click", () => {
    const on = acc.getAttribute("aria-expanded") !== "true";
    acc.setAttribute("aria-expanded", String(on)); panel.classList.toggle("is-open", on); panel.inert = !on;
  });
  addEventListener("resize", () => { if (innerWidth >= 1024) closeMenu(); }, { passive: true });
}

/* ---------- Search ---------- */
const _norm = s => String(s || "").toLowerCase().replace(/[-–—]/g, "").normalize("NFD").replace(/[̀-ͯ]/g, "");
function searchProducts(q) {
  const tokens = _norm(q).split(/\s+/).filter(Boolean).map(t => t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t);
  if (!tokens.length) return [];
  const out = [];
  PRODUCTS.forEach(p => {
    const pr = p.print || {};
    const f = {
      name: _norm(p.name), cat: _norm(catName(p.category) + " " + groupOf(p) + " " + p.shape + (p.shape === "tee" ? " tshirt tee t shirt" : "")),
      color: _norm(p.colorName), tech: _norm((p.techniques || []).join(" ")),
      fabric: _norm((p.fabric || "") + " " + (p.fit || "") + " " + (pr.front || "") + " " + (pr.back || "")),
      tags: _norm((p.tags || []).join(" ")), desc: _norm(p.desc)
    };
    let score = 0;
    for (const t of tokens) {
      let s = 0;
      if (f.name.includes(t)) s += (new RegExp("(^|\\s)" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(f.name) ? 6 : 4);
      if (f.cat.includes(t)) s += 3;
      if (f.color.includes(t)) s += 3;
      if (f.tech.includes(t)) s += 2.5;
      if (f.tags.includes(t)) s += 2;
      if (f.fabric.includes(t)) s += 1;
      if (!s && t.length > 2 && f.desc.includes(t)) s += .5;
      if (!s) return;
      score += s;
    }
    if (isBuyable(p)) score += .5;
    if ((p.tags || []).includes("bestseller")) score += .3;
    out.push({ p, score });
  });
  return out.sort((a, b) => b.score - a.score).map(r => r.p);
}
function highlight(text, q) {
  text = String(text || "");
  const tokens = String(q).toLowerCase().split(/\s+/).filter(t => t.length > 1).flatMap(t => t.length > 3 && t.endsWith("s") ? [t, t.slice(0, -1)] : [t]);
  const lower = text.toLowerCase(), marks = new Array(text.length).fill(false);
  tokens.forEach(t => { let i = lower.indexOf(t); while (i > -1) { for (let k = i; k < i + t.length; k++) marks[k] = true; i = lower.indexOf(t, i + t.length); } });
  let out = "", open = false;
  for (let i = 0; i < text.length; i++) {
    if (marks[i] && !open) { out += "<mark>"; open = true; }
    if (!marks[i] && open) { out += "</mark>"; open = false; }
    out += esc(text[i]);
  }
  return out + (open ? "</mark>" : "");
}
function searchSuggestions() {
  const out = [], add = s => { s = String(s || "").trim(); if (s && !out.some(x => x.toLowerCase() === s.toLowerCase())) out.push(s); };
  [...new Set(PRODUCTS.map(p => p.fit).filter(Boolean))].forEach(add);
  liveCategories().forEach(c => add(c.name));
  PRODUCTS.forEach(p => (p.techniques || []).forEach(add));
  PRODUCTS.forEach(p => add(String(p.colorName || "").split(" ").pop()));
  return out.slice(0, 8);
}
function srTile(p, i, q) {
  const s = stockInfo(p), tech = techLabel(p);
  return `<a class="sr-item" id="sr-${i}" role="option" aria-selected="false" href="${productUrl(p)}">
    <span class="sr-thumb">${productImage(p)}${s.soldOut ? `<span class="badge card-badge is-out">Sold out</span>` : ""}</span>
    <span class="sr-text"><span class="sr-name">${q ? highlight(titleOf(p), q) : esc(titleOf(p))}</span>
    ${tech ? `<span class="sr-meta">${q ? highlight(tech, q) : esc(tech)}</span>` : ""}
    <span class="sr-price">${rupee(p.price)}${discount(p) ? ` <s>${rupee(p.mrp)}</s>` : ""}</span></span></a>`;
}
function openSearch(prefill) {
  const o = $("#search-overlay"); if (!o) return;
  const input = $("input", o);
  if (!document.body.classList.contains("search-open")) closeDrawers();
  const tr = $(".search-trending", o);
  if (!tr.dataset.ready) {
    tr.innerHTML = uniqueFamilies(PRODUCTS.slice().sort((a, b) => rankProduct(b) - rankProduct(a)), 4).map((p, i) => srTile(p, "t" + i)).join("");
    const sug = searchSuggestions();
    $(".search-chips", o).innerHTML = sug.length ? `<span class="search-try">Try</span>${sug.map(s => `<button type="button" class="search-chip" data-search="${esc(s)}">${esc(s)}</button>`).join("")}` : "";
    tr.dataset.ready = "1";
  }
  o.inert = false; document.body.classList.add("search-open");
  if (typeof prefill === "string") { input.value = prefill; runSearch(); }
  Layers.open(o, closeSearch, input);
}
function closeSearch() {
  const o = $("#search-overlay"); if (!o || !document.body.classList.contains("search-open")) return;
  document.body.classList.remove("search-open"); o.inert = true; Layers.close(o);
}
let _sIdx = -1;
function runSearch() {
  const o = $("#search-overlay"), input = $("input", o), q = input.value.trim();
  const wrap = $(".search-results-wrap", o), list = $(".search-results", o), none = $(".search-none", o), empty = $(".search-empty", o);
  $(".search-clear", o).hidden = !q; _sIdx = -1; input.removeAttribute("aria-activedescendant");
  if (!q) { wrap.hidden = true; none.hidden = true; empty.hidden = false; input.setAttribute("aria-expanded", "false"); return; }
  const res = searchProducts(q);
  empty.hidden = true;
  if (!res.length) {
    wrap.hidden = true; none.hidden = false; input.setAttribute("aria-expanded", "false");
    const pop = uniqueFamilies(PRODUCTS.slice().sort((a, b) => rankProduct(b) - rankProduct(a)), 4);
    none.innerHTML = `<p class="search-none-title">No results for “${esc(q)}”</p>
      <p class="search-none-text">Check the spelling or try ${searchSuggestions().slice(0, 3).map(s => `<button type="button" class="search-chip" data-search="${esc(s)}">${esc(s)}</button>`).join(" ")}</p>
      <p class="search-label">Popular products</p><div class="search-grid">${pop.map((p, i) => srTile(p, "n" + i)).join("")}</div>`;
    return;
  }
  none.hidden = true; wrap.hidden = false; input.setAttribute("aria-expanded", "true");
  $(".search-count", o).textContent = `${res.length} result${res.length === 1 ? "" : "s"}`;
  const all = $(".search-all", o); all.href = `shop.html?q=${encodeURIComponent(q)}`;
  list.innerHTML = res.slice(0, 8).map((p, i) => srTile(p, i, q)).join("");
}
function initSearch() {
  const o = $("#search-overlay"), input = $("input", o), form = $("form", o);
  $$(".search-toggle").forEach(b => b.addEventListener("click", () => openSearch()));
  $(".search-close", o).addEventListener("click", closeSearch);
  o.addEventListener("click", e => { if (e.target === o) closeSearch(); });
  let t; input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(runSearch, 40); });
  $(".search-clear", o).addEventListener("click", () => { input.value = ""; runSearch(); input.focus(); });
  o.addEventListener("click", e => { const c = e.target.closest("[data-search]"); if (c) { input.value = c.dataset.search; runSearch(); input.focus(); } });
  input.addEventListener("keydown", e => {
    const items = $$(".sr-item", $(".search-results-wrap", o).hidden ? $(".search-trending", o) : $(".search-results", o));
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && items.length) {
      e.preventDefault();
      _sIdx = e.key === "ArrowDown" ? (_sIdx + 1) % items.length : (_sIdx <= 0 ? items.length - 1 : _sIdx - 1);
      items.forEach((it, i) => { it.classList.toggle("is-active", i === _sIdx); it.setAttribute("aria-selected", String(i === _sIdx)); });
      input.setAttribute("aria-activedescendant", items[_sIdx].id);
      items[_sIdx].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && _sIdx > -1 && items[_sIdx]) { e.preventDefault(); navigate(items[_sIdx].href); }
  });
  form.addEventListener("submit", e => { e.preventDefault(); const q = input.value.trim(); navigate(q ? `shop.html?q=${encodeURIComponent(q)}` : "shop.html"); });
  document.addEventListener("keydown", e => {
    if (e.key === "/" && !Layers.stack.length && !e.target.closest("input,textarea,select,[contenteditable]")) { e.preventDefault(); openSearch(); }
  });
}

/* ---------- Cart drawer ---------- */
function openCart() {
  const d = $("#cart-drawer"); if (!d || document.body.classList.contains("cart-open")) return;
  closeDrawers(); renderCart();
  d.inert = false; document.body.classList.add("cart-open");
  Layers.open(d, closeCart, $(".drawer-close", d));
}
function closeCart() {
  const d = $("#cart-drawer"); if (!d || !document.body.classList.contains("cart-open")) return;
  document.body.classList.remove("cart-open"); d.inert = true; Layers.close(d);
}
function closeDrawers() { closeCart(); closeMenu(); closeSearch(); }

function upsellFor(lines) {
  const inCart = new Set(lines.map(l => l.id)), fams = new Set(lines.map(l => l.p.family || l.p.id));
  const groups = new Set(lines.map(l => groupOf(l.p)));
  const want = mixMatchOn() ? (groups.has("Topwear") && !groups.has("Bottoms") ? "Bottoms" : groups.has("Bottoms") && !groups.has("Topwear") ? "Topwear" : null) : null;
  const pool = PRODUCTS.filter(p => isBuyable(p) && !inCart.has(p.id));
  const rank = p => (want && groupOf(p) === want ? 4 : 0) + (!fams.has(p.family || p.id) ? 3 : 0) + ((p.tags || []).includes("bestseller") ? 2 : 0);
  return uniqueFamilies(pool.sort((a, b) => rank(b) - rank(a)), 2);
}
function cartTile(p) {
  return `<a class="cart-tile" href="${productUrl(p)}"><span class="cart-tile-media">${productImage(p)}</span>
    <span class="cart-tile-name">${esc(titleOf(p))}</span><span class="cart-tile-price">${rupee(p.price)}</span></a>`;
}
function syncNoteUI() {
  const d = $("#cart-drawer"); if (!d) return;
  const n = Cart.note(), gift = $(".cart-gift-input", d), ta = $(".cart-note-input", d), wrap = $(".cart-note-wrap", d), tog = $(".cart-note-toggle", d);
  gift.checked = n.gift;
  if (document.activeElement !== ta) ta.value = n.note;
  const show = n.gift || !!n.note || wrap.dataset.open === "1";
  wrap.hidden = !show; tog.hidden = show; tog.setAttribute("aria-expanded", String(show));
  $(".cart-note-label", d).textContent = n.gift ? "Gift note" : "Order note";
  ta.placeholder = n.gift ? "Write a short message — we'll include it in the package." : "Special instructions, delivery notes…";
}
function renderCart() {
  const d = $("#cart-drawer"); if (!d) return;
  const lines = Cart.lines(), sub = Cart.subtotal(), count = Cart.count(), free = +STORE.freeShippingAbove || 0, ds = dropState();
  $(".drawer-count", d).textContent = `(${count})`;
  // Free-shipping progress (persistent elements so the bar animates)
  const ship = $(".cart-ship", d);
  if (!lines.length || !free) { ship.innerHTML = ""; ship.hidden = true; }
  else {
    ship.hidden = false;
    if (!$(".ship-bar", ship)) ship.innerHTML = `<p class="ship-msg" aria-live="polite"></p><div class="ship-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-label="Progress to free shipping"><span></span></div>`;
    const left = free - sub, unlocked = left <= 0, pct = Math.min(100, sub / free * 100);
    $(".ship-msg", ship).innerHTML = unlocked ? `You've unlocked free shipping` : `You're <b>${rupee(left)}</b> away from free shipping`;
    $(".ship-bar", ship).setAttribute("aria-valuenow", String(Math.round(pct)));
    requestAnimationFrame(() => { const s = $(".ship-bar span", ship); if (s) s.style.width = pct + "%"; });
    ship.classList.toggle("is-unlocked", unlocked);
  }
  // Lines
  const list = $(".cart-lines", d);
  const blocked = lines.filter(l => !isBuyable(l.p) || l.qty > Cart.limit(l.id));
  if (!lines.length) {
    const picks = uniqueFamilies(PRODUCTS.slice().sort((a, b) => rankProduct(b) - rankProduct(a)), 4);
    list.innerHTML = `<div class="cart-empty">
      <p class="cart-empty-title">Your cart is empty</p>
      <a class="btn btn-block" href="shop.html">Continue shopping</a>
      ${picks.length ? `<p class="cart-empty-label">${ds.live ? "Popular right now" : `${esc(dropLabel())} — opening soon`}</p><div class="cart-tiles">${picks.map(cartTile).join("")}</div>` : ""}
    </div>`;
  } else {
    list.innerHTML = lines.map(l => {
      const max = Cart.limit(l.id), ok = isBuyable(l.p), s = stockInfo(l.p);
      const warn = !ok ? (s.soldOut ? "Sold out — please remove to check out" : `Available when ${esc(dropLabel())} opens`) : l.qty > max ? `Only ${max} left — please reduce quantity` : (s.low ? `Only ${s.left} left` : "");
      return `<div class="cart-line${ok ? "" : " is-blocked"}" data-index="${l.index}">
      <a class="cart-thumb" href="${productUrl(l.p)}" tabindex="-1" aria-hidden="true">${productImage(l.p)}</a>
      <div class="cart-info">
        <a class="cart-name" href="${productUrl(l.p)}">${esc(titleOf(l.p))}</a>
        <span class="cart-variant">Size ${esc(l.size)}${l.p.colorName ? ` · ${esc(l.p.colorName)}` : ""}</span>
        ${warn ? `<span class="cart-warn">${warn}</span>` : ""}
        <div class="cart-row">
          <div class="qty qty-sm" role="group" aria-label="Quantity for ${esc(titleOf(l.p))}">
            <button type="button" data-cart-dec="${l.index}" aria-label="Decrease quantity">${ICON.minus}</button>
            <output aria-live="polite">${l.qty}</output>
            <button type="button" data-cart-inc="${l.index}" aria-label="Increase quantity"${l.qty >= max ? " disabled" : ""}>${ICON.plus}</button>
          </div>
          <button type="button" class="cart-remove" data-cart-remove="${l.index}">Remove</button>
        </div>
      </div>
      <div class="cart-price"><span>${rupee(l.p.price * l.qty)}</span>${l.p.mrp > l.p.price ? `<s>${rupee(l.p.mrp * l.qty)}</s>` : ""}</div>
    </div>`; }).join("");
  }
  // Gift + note (persistent nodes; only shown with items)
  const extras = $(".cart-extras", d); extras.hidden = !lines.length; syncNoteUI();
  // Upsell
  const up = $(".cart-upsell", d);
  const ups = lines.length ? upsellFor(lines) : [];
  up.innerHTML = ups.length ? `<p class="cart-upsell-head">You may also like</p><div class="upsell-list">${ups.map(p => miniCard(p, miniSizes(p))).join("")}</div>` : "";
  // Footer
  const waMsg = lines.length ? `Hi BHAKSHI, I have a question about my cart:\n${lines.map(l => `• ${l.p.name} (Size ${l.size}) × ${l.qty}`).join("\n")}` : "Hi BHAKSHI, I need some help.";
  const blockMsg = !ds.live ? `Checkout opens when ${dropLabel()} goes live` : blocked.length ? "Please update the flagged items to check out" : "";
  $(".cart-foot", d).innerHTML = lines.length ? `
    <div class="cart-total"><span>Subtotal</span><span class="cart-total-price">${rupee(sub)}</span></div>
    <p class="cart-small">Shipping and discount codes calculated at checkout. UPI${codOn() ? " or Cash on Delivery" : ""}.</p>
    ${blockMsg ? `<p class="cart-block-msg">${esc(blockMsg)}</p>` : ""}
    <a class="btn btn-block${blockMsg ? " is-disabled" : ""}" href="checkout.html"${blockMsg ? ' aria-disabled="true" tabindex="-1"' : ""}>Check out</a>
    <a class="cart-help" href="${waLink(waMsg)}" target="_blank" rel="noopener">Questions? Ask us on WhatsApp</a>` : "";
}
function initCart() {
  $(".cart-toggle").addEventListener("click", openCart);
  $(".drawer-close").addEventListener("click", closeCart);
  $(".scrim").addEventListener("click", () => { const t = Layers.top(); if (t) t.close(); });
  document.addEventListener("cart:change", () => renderCart());
  document.addEventListener("cart:note", () => syncNoteUI());
  const d = $("#cart-drawer");
  d.addEventListener("click", e => {
    const dec = e.target.closest("[data-cart-dec]"), inc = e.target.closest("[data-cart-inc]"), rm = e.target.closest("[data-cart-remove]");
    if (dec || inc) {
      const i = +(dec || inc).dataset[dec ? "cartDec" : "cartInc"], line = Cart.get()[i]; if (!line) return;
      if (dec && line.qty <= 1) return removeLine(i);
      Cart.setQty(i, line.qty + (dec ? -1 : 1));
      const btn = $(`.cart-line[data-index="${i}"] [data-cart-${dec ? "dec" : "inc"}]`); if (btn && !btn.disabled) btn.focus({ preventScroll: true });
    }
    if (rm) removeLine(+rm.dataset.cartRemove);
    if (e.target.closest(".cart-note-toggle")) {
      const wrap = $(".cart-note-wrap", d); wrap.dataset.open = "1"; syncNoteUI(); $(".cart-note-input", d).focus();
    }
  });
  $(".cart-gift-input", d).addEventListener("change", e => {
    if (e.target.checked) $(".cart-note-wrap", d).dataset.open = "1";
    Cart.setNote({ gift: e.target.checked });
    if (e.target.checked) setTimeout(() => $(".cart-note-input", d).focus({ preventScroll: true }), 30);
  });
  let nt; $(".cart-note-input", d).addEventListener("input", e => { clearTimeout(nt); const v = e.target.value; nt = setTimeout(() => Cart.setNote({ note: v }), 250); });
  $(".cart-note-input", d).addEventListener("blur", e => { clearTimeout(nt); Cart.setNote({ note: e.target.value }); });
}
function removeLine(i) {
  const el = $(`.cart-line[data-index="${i}"]`), line = Cart.get()[i]; if (!line) return;
  const p = getProduct(line.id);
  const go = () => {
    Cart.remove(i);
    toast(`Removed ${titleOf(p)} (${line.size})`, { type: "info", action: { label: "Undo", onClick: () => Cart.insert(i, line) } });
    const f = $(".cart-line .qty button, .cart-empty .btn"); if (f && document.body.classList.contains("cart-open")) f.focus({ preventScroll: true });
  };
  if (el && !reducedMotion()) { el.style.height = el.offsetHeight + "px"; void el.offsetHeight; el.classList.add("is-removing"); setTimeout(go, 240); } else go();
}

/* ---------- Toast ---------- */
function toast(msg, opts = {}) {
  const stack = $(".toast-stack"); if (!stack) return;
  const type = opts.type || "success";
  const t = document.createElement("div");
  t.className = `toast toast-${type}`; t.setAttribute("role", type === "error" ? "alert" : "status");
  t.innerHTML = `<span class="toast-icon">${type === "error" ? ICON.alert : type === "info" ? ICON.info : ICON.check}</span><span class="toast-msg"></span>${opts.action ? `<button type="button" class="toast-action"></button>` : ""}<button type="button" class="toast-close" aria-label="Dismiss">${ICON.close}</button>`;
  $(".toast-msg", t).textContent = msg;
  const kill = () => { if (t._gone) return; t._gone = true; t.classList.remove("is-in"); t.classList.add("is-out"); setTimeout(() => t.remove(), 300); };
  if (opts.action) { const a = $(".toast-action", t); a.textContent = opts.action.label; a.addEventListener("click", () => { kill(); try { opts.action.onClick && opts.action.onClick(); } catch (e) { console.error(e); } }); }
  $(".toast-close", t).addEventListener("click", kill);
  stack.appendChild(t);
  while (stack.children.length > 3) stack.firstElementChild.remove();
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add("is-in")));
  let timer = setTimeout(kill, opts.duration || (opts.action ? 5200 : 3200));
  t.addEventListener("mouseenter", () => clearTimeout(timer));
  t.addEventListener("mouseleave", () => { clearTimeout(timer); timer = setTimeout(kill, 1800); });
  return t;
}

/* ---------- Modal ---------- */
const Modal = {
  el: null, isOpen: false, _onClose: null, _pending: null,
  open(html, opts = {}) {
    const m = $(".modal"), panel = $(".modal-panel", m), content = $(".modal-content", m);
    this.el = m;
    if (this._pending) { // cancel an in-flight close animation
      clearTimeout(this._t); m.classList.remove("is-closing");
      const pend = this._pending; this._pending = null;
      try { pend.cb && pend.cb(); } catch (e) { console.error(e); }
      _emit("modal:close", {}); pend.res();
    }
    const sheet = opts.size === "sheet";
    panel.className = `modal-panel modal-${opts.size || "m"}`; m.classList.toggle("is-sheet", sheet);
    panel.setAttribute("aria-label", opts.label || "Dialog");
    panel.style.transform = "";
    content.innerHTML = html;
    if (!this.isOpen) {
      if (document.body.classList.contains("search-open")) closeSearch();
      if (document.body.classList.contains("menu-open")) closeMenu();
      m.hidden = false; void m.offsetWidth; m.classList.add("is-open");
      this.isOpen = true; Layers.open(m, () => this.close(), panel);
      document.body.classList.add("modal-open");
      setTimeout(() => { const f = focusables(content)[0] || panel; if (document.activeElement !== panel && m.contains(document.activeElement)) return; f.focus({ preventScroll: true }); }, 80);
    }
    this._onClose = opts.onClose || null;
    content.scrollTop = 0; panel.scrollTop = 0;
    _emit("modal:open", { content, label: opts.label });
    refreshReveal(content);
    return content;
  },
  close() {
    if (!this.isOpen) return Promise.resolve();
    const m = this.el; this.isOpen = false;
    m.classList.remove("is-open"); m.classList.add("is-closing");
    document.body.classList.remove("modal-open");
    Layers.close(m);
    const cb = this._onClose; this._onClose = null;
    return new Promise(res => {
      this._pending = { cb, res };
      this._t = setTimeout(() => {
        this._pending = null;
        m.classList.remove("is-closing"); m.hidden = true; $(".modal-content", m).innerHTML = ""; $(".modal-panel", m).style.transform = "";
        _emit("modal:close", {}); if (cb) cb(); res();
      }, reducedMotion() ? 0 : 280);
    });
  }
};
function initModal() {
  const m = $(".modal"), panel = $(".modal-panel", m);
  $(".modal-overlay", m).addEventListener("click", () => Modal.close());
  $(".modal-close", m).addEventListener("click", () => Modal.close());
  m.addEventListener("click", e => { if (e.target.closest("[data-modal-close]")) Modal.close(); });
  // Drag-to-dismiss for bottom sheets
  const handle = $(".modal-handle", m); let startY = 0, dy = 0, dragging = false, t0 = 0;
  handle.addEventListener("pointerdown", e => { if (getComputedStyle(handle).display === "none") return; dragging = true; startY = e.clientY; dy = 0; t0 = performance.now(); handle.setPointerCapture(e.pointerId); panel.style.transition = "none"; });
  handle.addEventListener("pointermove", e => { if (!dragging) return; dy = Math.max(0, e.clientY - startY); panel.style.transform = `translateY(${dy}px)`; });
  const end = () => {
    if (!dragging) return; dragging = false; panel.style.transition = "";
    const v = dy / Math.max(1, performance.now() - t0);
    if (dy > 110 || v > .6) Modal.close(); else panel.style.transform = "";
  };
  handle.addEventListener("pointerup", end); handle.addEventListener("pointercancel", end);
}

/* ---------- Fly to cart (quiet: a small image glides to the bag) ---------- */
function flyToCart(sourceEl) {
  const target = $(".cart-toggle");
  if (!sourceEl || !target) { bump($(".cart-count")); return Promise.resolve(); }
  let src = sourceEl;
  const card = sourceEl.closest && sourceEl.closest(".card");
  if (card && $(".card-img", card)) src = $(".card-img", card);
  else if (!sourceEl.matches("img,svg") && sourceEl.querySelector && sourceEl.querySelector("img,svg")) src = sourceEl.querySelector("img,svg");
  const r = src.getBoundingClientRect();
  if (reducedMotion() || !r.width || !document.body.animate) { bump($(".cart-count")); return Promise.resolve(); }
  const ghost = document.createElement("div");
  ghost.className = "fly-ghost";
  const w = Math.min(r.width, 160), h = w * (r.height / r.width || 1.4);
  Object.assign(ghost.style, { left: (r.left + (r.width - w) / 2) + "px", top: (r.top + (r.height - h) / 2) + "px", width: w + "px", height: h + "px" });
  ghost.appendChild(src.cloneNode(true));
  document.body.appendChild(ghost); _flying++;
  const go = () => {
    const tr = target.getBoundingClientRect();
    const sx = r.left + r.width / 2, sy = r.top + r.height / 2, ex = tr.left + tr.width / 2, ey = tr.top + tr.height / 2;
    const anim = ghost.animate([
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${ex - sx}px, ${ey - sy}px) scale(${(24 / w).toFixed(3)})`, opacity: .2 }
    ], { duration: 650, easing: "cubic-bezier(.55,0,.25,1)", fill: "forwards" });
    return anim.finished.catch(() => {}).then(() => { ghost.remove(); _flying = Math.max(0, _flying - 1); bump($(".cart-count")); });
  };
  return new Promise(res => requestAnimationFrame(() => go().then(res)));
}

/* ---------- Delegated clicks: wishlist, quick add, misc ---------- */
function syncHearts(id) {
  $$(id ? `[data-wish="${CSS.escape(id)}"]` : "[data-wish]").forEach(b => {
    const on = Wishlist.has(b.dataset.wish);
    b.setAttribute("aria-pressed", String(on));
    if (b.classList.contains("card-wish") || !b.dataset.keepLabel) b.setAttribute("aria-label", `${on ? "Remove from" : "Add to"} wishlist`);
  });
}
function initDelegates() {
  document.addEventListener("click", e => {
    const wish = e.target.closest("[data-wish]");
    if (wish) {
      e.preventDefault();
      const id = wish.dataset.wish, p = getProduct(id); if (!p) return;
      const added = Wishlist.toggle(id);
      $$(`[data-wish="${CSS.escape(id)}"]`).forEach(b => { b.classList.remove("is-pop"); void b.offsetWidth; if (added) b.classList.add("is-pop"); });
      toast(added ? `Saved ${titleOf(p)} to your wishlist` : `Removed from wishlist`, added
        ? { type: "success", action: { label: "View", onClick: () => navigate("wishlist.html") } }
        : { type: "info", action: { label: "Undo", onClick: () => Wishlist.add(id) } });
      return;
    }
    const add = e.target.closest("[data-add][data-size]");
    if (add) {
      e.preventDefault();
      if (add.disabled || add.getAttribute("aria-disabled") === "true") return;
      const p = getProduct(add.dataset.add); if (!p) return;
      const size = add.dataset.size, qty = +add.dataset.qty || 1, inDrawer = add.closest("#cart-drawer");
      const before = (Cart.get().find(i => i.id === p.id && String(i.size) === String(size)) || {}).qty || 0;
      const line = Cart.add(p.id, size, qty);
      if (!line || line.qty === before) return;
      if (!inDrawer) flyToCart(add.closest(".card") || add.closest("[data-fly]") || add);
      add.classList.add("is-added"); setTimeout(() => add.classList.remove("is-added"), 900);
      toast(`Added ${titleOf(p)} — size ${size}`, { type: "success", action: inDrawer ? null : { label: "View cart", onClick: openCart } });
      return;
    }
    if (e.target.closest("[data-open-cart]")) { e.preventDefault(); openCart(); return; }
    if (e.target.closest("[data-open-search]")) { e.preventDefault(); openSearch(); return; }
    if (e.target.closest("[data-open-menu]")) { e.preventDefault(); openMenu(); return; }
    if (e.target.closest("#mobile-menu [data-fitfinder], #cart-drawer [data-fitfinder], #search-overlay [data-fitfinder]")) { closeDrawers(); return; } // features.js opens the Fit Finder
    const sn = e.target.closest(".scroller-prev, .scroller-next");
    if (sn) {
      const sc = sn.getAttribute("aria-controls") ? document.getElementById(sn.getAttribute("aria-controls")) : findScroller(sn);
      if (sc) sc.scrollBy({ left: (sn.classList.contains("scroller-prev") ? -1 : 1) * sc.clientWidth * .85, behavior: reducedMotion() ? "auto" : "smooth" });
    }
  });
  document.addEventListener("wishlist:change", e => syncHearts(e.detail && e.detail.id));
  // Footer WhatsApp "Get first access"
  const join = $(".wa-join");
  if (join) join.addEventListener("submit", e => {
    e.preventDefault();
    const name = ($("input", join).value || "").trim().slice(0, 40);
    window.open(waLink(`Hi ${STORE.name}! Please add me to the first-access list for new drops.${name ? " My name is " + name + "." : ""}`), "_blank", "noopener");
    toast("Opening WhatsApp…", { type: "info" });
  });
}

/* ---------- Scrollers ---------- */
function findScroller(btn) {
  let el = btn.parentElement;
  while (el && el !== document.body) { const s = el.querySelector(".scroller"); if (s) return s; el = el.parentElement; }
  return null;
}
function updateScrollerNav(sc) {
  let el = sc.parentElement, nav = null;
  while (el && el !== document.body && !nav) { nav = el.querySelector(".scroller-nav"); if (nav && findScroller(nav) !== sc) nav = null; el = el.parentElement; }
  if (!nav) return;
  const max = sc.scrollWidth - sc.clientWidth - 2;
  const prev = $(".scroller-prev", nav), next = $(".scroller-next", nav);
  if (prev) prev.disabled = sc.scrollLeft <= 2;
  if (next) next.disabled = sc.scrollLeft >= max;
  nav.classList.toggle("is-static", max <= 0);
}
document.addEventListener("scroll", e => { if (e.target.classList && e.target.classList.contains("scroller")) updateScrollerNav(e.target); }, { capture: true, passive: true });

/* ---------- Reveal on scroll (+ countdowns) ---------- */
let _io;
function refreshReveal(root = document) {
  const scope = root && (root.nodeType === 1 || root === document) ? root : document;
  const els = $$("[data-reveal], .reveal", scope);
  if (scope.matches && scope.matches("[data-reveal], .reveal")) els.push(scope);
  initCountdowns(scope);
  if (!("IntersectionObserver" in window) || reducedMotion()) { els.forEach(el => el.classList.add("is-in", "in")); return; }
  if (!_io) _io = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add("is-in", "in"); _io.unobserve(en.target); }
  }), { threshold: .1, rootMargin: "0px 0px -4% 0px" });
  els.forEach(el => {
    if (el.dataset.reveal === "stagger") [...el.children].forEach((c, i) => c.style.setProperty("--i", Math.min(i, 12)));
    if (el.dataset.revealBound) return;
    el.dataset.revealBound = "1"; _io.observe(el);
  });
  $$(".scroller").forEach(updateScrollerNav);
}

/* ---------- Navigation (plain; no page-leave effect in v3) ---------- */
function navigate(url) { location.href = url; }
function initTransitions() {
  addEventListener("pageshow", e => { document.body.classList.remove("is-leaving"); if (e.persisted) { closeDrawers(); Modal.close(); } });
}

/* ---------- Boot ---------- */
renderLayout();
initAnnouncement();
initHeader();
initMobileMenu();
initSearch();
initCart();
initModal();
initDelegates();
initTransitions();
renderCart();
refreshReveal();
document.addEventListener("DOMContentLoaded", () => {
  refreshReveal(); syncHearts();
  // Auto-pick up content injected later (page scripts may still call refreshReveal()).
  const main = $("main");
  if (main && "MutationObserver" in window) {
    let pending = false;
    new MutationObserver(() => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; refreshReveal(); }); }).observe(main, { childList: true, subtree: true });
  }
});
