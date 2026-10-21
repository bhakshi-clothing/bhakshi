/* =========================================================
   BHAKSHI v2 — shell & shared API (see ARCHITECTURE.md)
   Helpers · drop/stock helpers · stores (Cart / Wishlist / Recent) · product card ·
   announcement ticker · header (+ mega menu when a group has 2+ live categories) ·
   mobile menu · search · cart drawer · Modal · toast · flyToCart · reveal · tickers ·
   countdowns · text scramble · custom cursor · page transitions · footer.
   ========================================================= */
document.documentElement.classList.add("js");

/* ---------- Helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const rupee = n => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
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
const LOW_STOCK = 15;
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
  if (!d.live) return `${dropLabel()} unlocks in ${formatCountdown(d.msLeft, true)}. Hold tight.`;
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
  if (!isFinite(t)) { el.textContent = formatCountdown(0); return () => {}; }
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

function productImage(p, i = 0, view, opts = {}) {
  p = getProduct(p); if (!p) return "";
  const src = p.images && p.images[i];
  if (src) return `<img src="${esc(src)}" alt="${esc(p.name)}${i ? " (view " + (i + 1) + ")" : ""}" loading="lazy" decoding="async">`;
  if (typeof Art !== "undefined" && Art.garment) {
    try { return Art.garment(p, { view: view || (i === 1 ? "back" : i >= 2 ? "detail" : "front"), bg: opts.bg }); } catch (e) { console.error(e); }
  }
  return `<div class="img-fallback" style="background:${esc(p.color)}" role="img" aria-label="${esc(p.name)}"></div>`;
}
function swatchHTML(color) {
  return (typeof Art !== "undefined" && Art.swatch) ? Art.swatch(color) : `<span class="swatch-dot" style="background:${esc(color)}"></span>`;
}

const ICON = {
  search: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2" stroke-linecap="square"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 20.3s-7.8-4.6-7.8-10.3A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 7.8 2.6c0 5.7-7.8 10.3-7.8 10.3Z" stroke-linejoin="round"/></svg>`,
  bag: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4.5 8h15l-1 12.5h-13z" stroke-linejoin="miter"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 8h18M3 16h12"/></svg>`,
  close: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 12h15m-5-5 5 5-5 5" stroke-linejoin="miter"/></svg>`,
  up: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`,
  minus: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  check: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>`,
  info: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 11v6M12 7v1.5"/></svg>`,
  alert: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M12 6v8M12 17v1.5"/></svg>`,
  truck: `<svg viewBox="0 0 32 32" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 8h16v14H3zM19 13h6l4 5v4H19"/><circle cx="9" cy="23.5" r="2.5" fill="var(--bg)"/><circle cx="24" cy="23.5" r="2.5" fill="var(--bg)"/></svg>`,
  cash: `<svg viewBox="0 0 32 32" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="9" width="26" height="15"/><circle cx="16" cy="16.5" r="3.5"/><path d="M7 13v7M25 13v7"/></svg>`,
  swap: `<svg viewBox="0 0 32 32" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 12h19l-5-5M26 20H7l5 5"/></svg>`,
  fabric: `<svg viewBox="0 0 32 32" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 7h24v18H4z"/><path d="M4 13h24M4 19h24M10 7v18M16 7v18M22 7v18" opacity=".55"/></svg>`,
  india: `<svg viewBox="0 0 32 32" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="3"/><path d="M16 5v8M16 19v8M5 16h8M19 16h8"/></svg>`,
  truckSm: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M2.5 6.5h11v10h-11zM13.5 10h4l3 3.5v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>`,
  ruler: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 15.5 15.5 3 21 8.5 8.5 21z"/><path d="m7 11.5 2 2M10 8.5l2 2M13 5.5l2 2"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13"/><path d="m3.5 7 8.5 6 8.5-6"/></svg>`,
  insta: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6" fill="currentColor"/></svg>`,
  wa: `<svg viewBox="0 0 32 32" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.6a10.6 10.6 0 0 1-5.4-1.5l-.4-.2-3.9 1 1-3.8-.2-.4A10.6 10.6 0 1 1 16 26.6zm5.8-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.7 8.7 0 0 1-4.3-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.7 3.7 0 0 0-1.1 2.7 6.4 6.4 0 0 0 1.3 3.4 14.7 14.7 0 0 0 5.6 5c2.1.9 2.9 1 4 .8a3.4 3.4 0 0 0 2.2-1.6 2.8 2.8 0 0 0 .2-1.6c-.1-.1-.3-.2-.6-.4z"/></svg>`
};

/* ---------- Storage-backed stores ---------- */
const _store = {
  read(k, fb) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fb; } catch (e) { return fb; } },
  write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
};
const _emit = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));

const Cart = {
  KEY: "bhakshi_cart", MAX: 10,
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
      if (!opts.silent) toast("Pick a size first.", { type: "error" }); return false;
    }
    qty = Math.max(1, parseInt(qty, 10) || 1);
    const items = this.get(), max = this.limit(p.id);
    let line = items.find(i => i.id === p.id && String(i.size) === String(size));
    if (line && line.qty >= max) { if (!opts.silent) toast(`Max ${max} of ${titleOf(p)} per order.`, { type: "info" }); return line; }
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
  clear() { this.save([], { action: "clear" }); },
  lines() { return this.get().map((i, index) => ({ ...i, index, p: getProduct(i.id) })); },
  subtotal() { return this.lines().reduce((s, l) => s + l.p.price * l.qty, 0); },
  count() { return this.get().reduce((s, i) => s + i.qty, 0); },
  has(id) { return this.get().some(i => i.id === id); }
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
  if (e.key === Wishlist.KEY) _emit("wishlist:change", { items: Wishlist.get(), count: Wishlist.count(), action: "sync" });
});

const uniqueFamilies = (list, n) => { const seen = new Set(), out = []; list.forEach(p => { const f = p.family || p.id; if (out.length < n && !seen.has(f)) { seen.add(f); out.push(p); } }); return out; };
const rankProduct = p => (isBuyable(p) ? 10 : 0) + ((p.tags || []).includes("bestseller") ? 2 : 0) + ((p.tags || []).includes("new") ? 1 : 0);

/* ---------- Stock meter & product card ---------- */
function stockMeter(p, opts = {}) {
  const s = stockInfo(p);
  const label = s.soldOut ? "Sold out" : s.total ? `${pad2(s.left)} / ${pad2(s.total)} left` : `${pad2(s.left)} left`;
  const aria = s.soldOut ? "Sold out" : s.total ? `${s.left} of ${s.total} left` : `${s.left} left`;
  return `<div class="stock-meter${s.low ? " is-low" : ""}${s.soldOut ? " is-out" : ""}${opts.className ? " " + esc(opts.className) : ""}" style="--pct:${s.pct}%" role="img" aria-label="${esc(aria)}"><span class="stock-meter-bar" aria-hidden="true"><i></i></span><span class="stock-meter-label" aria-hidden="true">${esc(label)}</span></div>`;
}
function cardArt(p, view) {
  if (p.images && p.images.length) {
    const i = view === "back" ? 1 : 0;
    return p.images[i] ? productImage(p, i) : "";
  }
  return productImage(p, 0, view, { bg: false });
}
function productCard(p) {
  p = getProduct(p); if (!p) return "";
  const id = esc(p.id), url = productUrl(p), s = stockInfo(p), d = dropState(), off = discount(p), wished = Wishlist.has(p.id), buy = isBuyable(p);
  const tags = p.tags || [], n = PRODUCTS.indexOf(p);
  const badge = s.soldOut ? `<span class="badge badge-ghost">Sold out</span>`
    : s.low ? `<span class="badge badge-hot">Low stock</span>`
    : tags.includes("new") ? `<span class="badge badge-accent">New</span>`
    : tags.includes("bestseller") ? `<span class="badge">Bestseller</span>`
    : tags.includes("sale") && off ? `<span class="badge badge-hot">Sale</span>` : "";
  const back = cardArt(p, "back");
  const vars = variantsOf(p);
  const swatches = vars.length > 1 ? `<div class="card-swatches" aria-label="${vars.length} colours">${vars.slice(0, 5).map(v =>
    `<a class="swatch${v.id === p.id ? " is-current" : ""}" href="${productUrl(v)}" title="${esc(v.colorName)}" aria-label="${esc(v.colorName)}"${v.id === p.id ? ' aria-current="true"' : ""}>${swatchHTML(v.color)}</a>`).join("")}${vars.length > 5 ? `<span class="swatch-more">+${vars.length - 5}</span>` : ""}</div>` : "";
  const sizes = buy
    ? `<div class="card-sizes" role="group" aria-label="Quick add a size"><span class="card-sizes-label" aria-hidden="true">Add</span>${(p.sizes || []).map(sz =>
      `<button type="button" data-add="${id}" data-size="${esc(sz)}" aria-label="Add ${esc(titleOf(p))}, size ${esc(sz)}, to bag">${esc(sz)}</button>`).join("")}</div>`
    : `<div class="card-sizes card-sizes-out">${s.soldOut ? "<span>Sold out</span>" : `<span>Drops in</span><span data-countdown data-countdown-format="short"></span>`}</div>`;
  return `<article class="card${s.soldOut ? " is-soldout" : ""}${s.low ? " is-low" : ""}" data-id="${id}">
    <a class="card-media" href="${url}" tabindex="-1" aria-hidden="true">
      <span class="card-top">${n > -1 ? `<span class="card-index">[${pad2(n + 1)}]</span>` : ""}${badge}</span>
      <span class="card-img">${cardArt(p, "front")}</span>
      ${back ? `<span class="card-img-alt">${back}</span>` : ""}
    </a>
    <button type="button" class="card-wish" data-wish="${id}" aria-pressed="${wished}" aria-label="${wished ? "Remove from" : "Add to"} wishlist">${ICON.heart}</button>
    <button type="button" class="card-quick" data-quick="${id}" aria-label="Quick view ${esc(titleOf(p))}">${ICON.eye}<span>Quick view</span><i class="card-quick-plus" aria-hidden="true">${ICON.plus}</i></button>
    ${sizes}
    <div class="card-body">
      <div class="card-row"><a class="card-title" href="${url}">${esc(titleOf(p))}</a>
        <span class="price"><span class="price-now">${rupee(p.price)}</span>${off > 0 ? `<s class="price-mrp">${rupee(p.mrp)}</s><span class="price-off">${off}% off</span>` : ""}</span></div>
      <p class="card-meta">${esc(p.colorName || catName(p.category))}${p.fit ? ` · ${esc(p.fit)}` : ""}</p>
      ${stockMeter(p)}
      ${swatches}
    </div>
  </article>`;
}

/* Compact horizontal product row used in cart, upsells */
function miniCard(p, extra = "") {
  return `<div class="mini-card"><a class="mini-thumb" href="${productUrl(p)}" tabindex="-1" aria-hidden="true">${productImage(p)}</a>
    <div class="mini-info"><a class="mini-name" href="${productUrl(p)}">${esc(titleOf(p))}</a>
    <span class="mini-meta">${esc(p.colorName || "")} · ${rupee(p.price)}</span>${extra}</div></div>`;
}
const miniSizes = p => `<div class="mini-sizes" role="group" aria-label="Quick add ${esc(titleOf(p))}">${(p.sizes || []).map(s => `<button type="button" data-add="${esc(p.id)}" data-size="${esc(s)}" aria-label="Add ${esc(titleOf(p))} size ${esc(s)}">${esc(s)}</button>`).join("")}</div>`;

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
const focusables = el => $$(FOCUSABLE, el).filter(n => n.offsetParent !== null || n === document.activeElement);
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
function megaHTML(groupName) {
  const g = navGroups().find(x => x.name === groupName); if (!g) return "";
  const tiles = uniqueFamilies(PRODUCTS.filter(p => groupOf(p) === g.name).sort((a, b) => rankProduct(b) - rankProduct(a)), 3);
  return `<div class="mega-inner container">
    <div class="mega-links"><p class="eyebrow">${esc(g.name)}</p>
      <ul>${g.cats.map(c => `<li><a href="shop.html?cat=${encodeURIComponent(c.id)}">${esc(c.name)}<sup>(${pad2(countIn(p => p.category === c.id))})</sup></a></li>`).join("")}</ul>
      <a class="link-arrow" href="shop.html?group=${encodeURIComponent(g.name)}">Shop all ${esc(g.name)}</a></div>
    ${tiles.map(p => `<a class="mega-tile" href="${productUrl(p)}"><span class="mega-tile-media">${productImage(p)}</span>
      <span class="mega-tile-name">${esc(titleOf(p))}</span><span class="mega-tile-price">${rupee(p.price)}</span></a>`).join("")}
  </div>`;
}
function dropStatusHTML() {
  const d = dropState();
  return d.live
    ? `<a class="drop-status" href="shop.html" aria-label="${esc(dropLabel())} is live now"><span class="live-dot" aria-hidden="true"></span><span>Live now</span></a>`
    : `<span class="drop-status is-soon" role="timer"><span class="live-dot is-hot" aria-hidden="true"></span><span>Drops in</span><span data-countdown></span></span>`;
}
const codOn = () => STORE.codFee !== -1;
const allHeavy = () => PRODUCTS.length && PRODUCTS.every(p => /240\s*gsm/i.test(p.fabric || ""));

/* ---------- Layout: announcement, header, menus, search, drawer, footer ---------- */
function renderLayout() {
  const body = document.body, main = $("main");
  const page = body.dataset.page || "";
  const params = new URLSearchParams(location.search);
  let annClosed = false; try { annClosed = sessionStorage.getItem("bhakshi_announce_closed") === "1"; } catch (e) {}
  const ann = (STORE.announcement || []).filter(Boolean);
  const groups = navGroups();
  const cur = (cond) => cond ? ' aria-current="page"' : "";
  const navLinks = [
    `<li><a class="nav-drop" href="shop.html"${cur(page === "shop" && !location.search)} data-scramble>${esc(dropLabel())}<sup>(${pad2(PRODUCTS.length)})</sup></a></li>`,
    ...groups.map(g => g.cats.length >= 2
      ? `<li class="has-mega" data-group="${esc(g.name)}"><a href="shop.html?group=${encodeURIComponent(g.name)}" aria-expanded="false" aria-haspopup="true"${cur(page === "shop" && params.get("group") === g.name)} data-scramble>${esc(g.name)}</a><div class="mega" role="region" aria-label="${esc(g.name)}"></div></li>`
      : `<li><a href="shop.html?cat=${encodeURIComponent(g.cats[0].id)}"${cur(page === "shop" && params.get("cat") === g.cats[0].id)} data-scramble>${esc(g.cats[0].name)}</a></li>`),
    `<li><button type="button" data-fitfinder data-scramble>Size Guide</button></li>`,
    `<li><a href="about.html"${cur(page === "about")} data-scramble>About</a></li>`
  ].join("");

  let idx = 0;
  const mmLink = (href, label, extra = "") => `<a class="mm-link mm-item" href="${href}"${extra}><span class="mm-idx" aria-hidden="true">${pad2(++idx)}</span><span class="mm-text">${esc(label)}</span></a>`;
  const mmNav = [
    mmLink("shop.html", dropLabel()),
    ...groups.map(g => g.cats.length >= 2
      ? mmLink(`shop.html?group=${encodeURIComponent(g.name)}`, g.name) + `<div class="mm-group-cats mm-item">${g.cats.map(c => `<a class="chip" href="shop.html?cat=${encodeURIComponent(c.id)}">${esc(c.name)}</a>`).join("")}</div>`
      : mmLink(`shop.html?cat=${encodeURIComponent(g.cats[0].id)}`, g.cats[0].name)),
    `<button type="button" class="mm-link mm-item" data-fitfinder><span class="mm-idx" aria-hidden="true">${pad2(++idx)}</span><span class="mm-text">Size Guide</span></button>`,
    mmLink("about.html", "About")
  ].join("");

  const header = `
  <a class="skip-link" href="#main">Skip to content</a>
  ${ann.length && !annClosed ? `<div class="announce" role="region" aria-label="Announcements">
    <div class="ticker announce-ticker" data-speed="46">${ann.map(a => `<span class="ticker-item">${esc(a)}<span class="ticker-sep" aria-hidden="true">✦</span></span>`).join("")}</div>
    <button type="button" class="announce-close" aria-label="Dismiss announcements">${ICON.close}</button></div>` : ""}
  <header class="site-header" id="site-header">
    <div class="header-inner">
      <div class="header-left">
        <button type="button" class="icon-btn menu-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu">${ICON.menu}</button>
        <a class="wordmark" href="index.html" aria-label="${esc(STORE.name)} home">${esc(STORE.name)}</a>
        <nav class="nav-main" aria-label="Main"><ul>${navLinks}</ul></nav>
      </div>
      <div class="header-right">
        ${dropStatusHTML()}
        <button type="button" class="header-search search-toggle hide-mobile" aria-label="Search (press /)">${ICON.search}<span>Search</span><kbd aria-hidden="true">/</kbd></button>
        <button type="button" class="icon-btn search-toggle hide-desktop" aria-label="Search">${ICON.search}</button>
        <a class="icon-btn wish-link" href="wishlist.html" aria-label="Wishlist">${ICON.heart}<span class="count wish-count" data-count="0">0</span></a>
        <button type="button" class="icon-btn cart-toggle" aria-label="Open bag" aria-controls="cart-drawer">${ICON.bag}<span class="count cart-count" data-count="0">0</span></button>
      </div>
    </div>
    <div class="scroll-progress" aria-hidden="true"><span></span></div>
  </header>
  <div class="mega-scrim" aria-hidden="true"></div>
  <div class="scrim" aria-hidden="true"></div>
  <aside class="mobile-menu" id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu" tabindex="-1" inert>
    <div class="mm-head"><a class="wordmark" href="index.html">${esc(STORE.name)}</a>${dropStatusHTML()}<button type="button" class="icon-btn mm-close" aria-label="Close menu">${ICON.close}</button></div>
    <nav class="mm-nav" aria-label="Mobile">${mmNav}</nav>
    <div class="mm-drop mm-item"><div class="mm-drop-head"><span class="eyebrow">${esc(dropLabel())}${DROP.name ? " — " + esc(DROP.name) : ""}</span><span class="mono">(${pad2(PRODUCTS.length)})</span></div><div class="mm-drop-row"></div></div>
    <div class="mm-quick mm-item">
      <a href="wishlist.html">${ICON.heart}<span>Wishlist <span class="wish-count-text">(0)</span></span></a>
      <button type="button" data-open-search>${ICON.search}<span>Search</span></button>
      <a href="contact.html#track">${ICON.truckSm}<span>Track order</span></a>
      <a class="is-wa" href="${waLink("Hi BHAKSHI, I need some help.")}" target="_blank" rel="noopener">${ICON.wa}<span>WhatsApp</span></a>
    </div>
    <p class="mm-note mm-item">${esc(dropLabel())}${DROP.name ? " — " + esc(DROP.name) : ""} · Free shipping above ${rupee(STORE.freeShippingAbove)}${codOn() ? " · Cash on Delivery" : ""} · 7-day size exchange</p>
  </aside>
  <div class="search-overlay" id="search-overlay" role="dialog" aria-modal="true" aria-label="Search products" inert>
    <div class="search-top container"><p class="eyebrow">Search ${esc(dropLabel())}</p>
      <button type="button" class="search-close" aria-label="Close search"><span>Close</span><kbd aria-hidden="true">Esc</kbd></button></div>
    <form class="search-form container" action="shop.html" role="search">
      ${ICON.search}
      <input type="search" name="q" placeholder="Search" autocomplete="off" spellcheck="false" aria-label="Search products" role="combobox" aria-expanded="false" aria-controls="search-results" aria-autocomplete="list">
      <button type="button" class="search-clear" hidden>Clear</button>
    </form>
    <div class="search-body container">
      <div class="search-empty">
        <div><p class="eyebrow">Try</p><div class="search-chips"></div></div>
        <div><p class="eyebrow">${esc(dropLabel())} — every piece</p><div class="search-trending"></div></div>
      </div>
      <div class="search-results-wrap" hidden>
        <div class="search-results-head"><p class="eyebrow search-count" aria-live="polite"></p><a class="link-arrow search-all" href="shop.html">View all</a></div>
        <div class="search-results" id="search-results" role="listbox" aria-label="Results"></div>
        <div class="search-more"></div>
      </div>
      <div class="search-none" hidden></div>
    </div>
  </div>
  <aside class="drawer cart-drawer" id="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title" tabindex="-1" inert>
    <div class="drawer-head"><h2 class="drawer-title" id="cart-title">Bag <span class="drawer-count"></span></h2>
      <button type="button" class="icon-btn drawer-close" aria-label="Close bag">${ICON.close}</button></div>
    <div class="cart-ship"></div>
    <div class="drawer-body"><div class="cart-lines"></div><div class="cart-upsell"></div></div>
    <div class="drawer-foot cart-foot"></div>
  </aside>`;
  if (main) main.insertAdjacentHTML("beforebegin", header); else body.insertAdjacentHTML("afterbegin", header);

  const trust = [
    [ICON.truck, "Free shipping", `Above ${rupee(STORE.freeShippingAbove)}`],
    codOn() ? [ICON.cash, "Cash on Delivery", "Pay when it lands"] : [ICON.cash, "UPI payments", "Fast & secure"],
    [ICON.swap, "7-day size exchange", "Wrong fit? Swap it"],
    allHeavy() ? [ICON.fabric, "240 GSM cotton", "Heavyweight, bio-washed"] : [ICON.india, "Made in India", "Cut & printed here"]
  ];
  const helpLinks = `<a href="contact.html#track">Track order</a><a href="policies.html#exchange">Exchange</a><a href="policies.html#shipping">Shipping</a><a href="contact.html">Contact</a>`;
  const footer = `
  <section class="trust-strip" aria-label="Why shop with us"><div class="container trust-grid">
    ${trust.map(t => `<div class="trust-item">${t[0]}<div><b>${esc(t[1])}</b><span>${esc(t[2])}</span></div></div>`).join("")}
  </div></section>
  <footer class="site-footer">
    <div class="container footer-top">
      <form class="wa-join footer-join" novalidate>
        <p class="eyebrow">Drop alerts</p>
        <h2 class="footer-join-title">Get drop alerts on <em>WhatsApp</em></h2>
        <p class="footer-join-text">First word when the next drop lands. One message per drop, nothing else.</p>
        <label class="sr-only" for="wa-join-name">Your first name</label>
        <div class="wa-join-row"><input id="wa-join-name" name="name" type="text" placeholder="Your first name" autocomplete="given-name" maxlength="40">
          <button type="submit" class="btn btn-wa">${ICON.wa}<span>Join</span></button></div>
        <small>Opens WhatsApp with a message ready to send.</small>
      </form>
      <div class="footer-cols">
        <div class="footer-col"><h3>Shop</h3><a href="shop.html">${esc(dropLabel())} — All</a>${liveCategories().map(c => `<a href="shop.html?cat=${encodeURIComponent(c.id)}">${esc(c.name)}</a>`).join("")}<a href="wishlist.html">Wishlist</a></div>
        <div class="footer-col"><h3>Help</h3>${helpLinks}<button type="button" data-fitfinder>Size guide</button></div>
        <div class="footer-col"><h3>Company</h3><a href="about.html">About</a><a href="policies.html">Policies</a><a href="policies.html#privacy">Privacy</a></div>
        <div class="footer-col footer-contact"><h3>Contact</h3>
          <a class="is-wa" href="${waLink("Hi BHAKSHI!")}" target="_blank" rel="noopener">${ICON.wa}<span>WhatsApp us</span></a>
          ${STORE.email ? `<a href="mailto:${esc(STORE.email)}">${ICON.mail}<span>${esc(STORE.email)}</span></a>` : ""}
          ${STORE.instagram ? `<a href="${esc(STORE.instagram)}" target="_blank" rel="noopener">${ICON.insta}<span>Instagram</span></a>` : ""}
          <p class="footer-hours">Mon–Sat · 10am–7pm IST</p></div>
      </div>
    </div>
    <div class="footer-mark" aria-hidden="true"><span>${esc(STORE.name)}</span></div>
    <div class="container footer-bottom">
      <span>© ${new Date().getFullYear()} ${esc(STORE.name)}</span>
      <span><b>UPI${codOn() ? " · Cash on Delivery" : ""}</b></span>
      <span class="footer-drop"><span class="live-dot" aria-hidden="true"></span>${esc(dropLabel())}${DROP.name ? " — " + esc(DROP.name) : ""} — Made in India</span>
    </div>
  </footer>
  <button type="button" class="to-top" aria-label="Back to top">${ICON.up}</button>
  <a class="wa-float" href="${waLink("Hi BHAKSHI! I have a question.")}" target="_blank" rel="noopener" aria-label="Chat with us on WhatsApp">${ICON.wa}<span class="wa-tip">Chat on WhatsApp</span></a>
  <div class="toast-stack" aria-live="polite"></div>
  <div class="modal" hidden><div class="modal-overlay"></div>
    <div class="modal-panel" role="dialog" aria-modal="true" tabindex="-1">
      <div class="modal-handle" aria-hidden="true"><span></span></div>
      <button type="button" class="icon-btn modal-close" aria-label="Close">${ICON.close}</button>
      <div class="modal-content"></div></div></div>`;
  if (main) main.insertAdjacentHTML("afterend", footer); else body.insertAdjacentHTML("beforeend", footer);
}

/* ---------- Tickers (marquee): any .ticker; content is auto-duplicated for a seamless loop ---------- */
function initTickers(root = document) {
  const list = $$(".ticker", root.querySelectorAll ? root : document);
  if (root.classList && root.classList.contains("ticker")) list.push(root);
  list.forEach(t => {
    if (t.dataset.tickerReady || t.offsetParent === null && getComputedStyle(t).position !== "fixed") return;
    let track = t.querySelector(":scope > .ticker-track");
    if (!track) { track = document.createElement("div"); track.className = "ticker-track"; while (t.firstChild) track.appendChild(t.firstChild); t.appendChild(track); }
    if ([...track.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim())) {
      const item = document.createElement("span"); item.className = "ticker-item";
      while (track.firstChild) item.appendChild(track.firstChild); track.appendChild(item);
    }
    const originals = [...track.children]; if (!originals.length) return;
    t.dataset.tickerReady = "1";
    const clone = n => { const c = n.cloneNode(true); c.setAttribute("aria-hidden", "true"); $$("a,button,input", c).forEach(x => x.tabIndex = -1); return c; };
    const need = Math.max(t.clientWidth, 1280) * 1.05; let guard = 0;
    while (track.offsetWidth < need && guard++ < 24) originals.forEach(n => track.appendChild(clone(n)));
    [...track.children].forEach(n => track.appendChild(clone(n)));
    const speed = +t.dataset.speed || 60;
    t.style.setProperty("--ticker-dur", Math.max(8, track.offsetWidth / 2 / speed).toFixed(1) + "s");
  });
}

/* ---------- Text scramble (data-scramble) ---------- */
const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+/<>";
function scramble(el, dur = 520) {
  if (!el || el._scr || reducedMotion()) return;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = []; while (walker.nextNode()) if (walker.currentNode.nodeValue.trim()) nodes.push(walker.currentNode);
  if (!nodes.length) return;
  const orig = nodes.map(n => n.nodeValue);
  const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
  const prev = { width: el.style.width, display: el.style.display, overflow: el.style.overflow, whiteSpace: el.style.whiteSpace };
  if (cs.display === "inline") el.style.display = "inline-block";
  el.style.width = r.width + "px"; el.style.overflow = "hidden"; el.style.whiteSpace = "nowrap";
  const total = orig.join("").length, t0 = performance.now();
  el._scr = true;
  const frame = now => {
    const p = Math.min(1, (now - t0) / dur); let k = 0;
    nodes.forEach((n, ni) => {
      n.nodeValue = [...orig[ni]].map(ch => {
        const pos = k++ / Math.max(1, total);
        if (ch === " " || p >= 1 || p > pos * .7 + .3) return ch;
        return SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0];
      }).join("");
    });
    if (p < 1) requestAnimationFrame(frame);
    else { nodes.forEach((n, i) => n.nodeValue = orig[i]); Object.assign(el.style, prev); el._scr = false; }
  };
  requestAnimationFrame(frame);
}
function initScramble() {
  const handler = e => {
    const el = e.target.closest && e.target.closest("[data-scramble]"); if (!el || el.dataset.scramble === "in") return;
    if (e.type === "mouseover" && e.relatedTarget && el.contains(e.relatedTarget)) return;
    scramble(el);
  };
  document.addEventListener("mouseover", handler, { passive: true });
  document.addEventListener("focusin", handler);
}

/* ---------- Announcement ---------- */
function initAnnouncement() {
  const bar = $(".announce"); if (!bar) return;
  $(".announce-close", bar).addEventListener("click", () => {
    try { sessionStorage.setItem("bhakshi_announce_closed", "1"); } catch (e) {}
    bar.style.height = bar.offsetHeight + "px"; void bar.offsetHeight; bar.classList.add("is-closing"); bar.style.height = "0px";
    setTimeout(() => bar.remove(), 420);
  });
}

/* ---------- Header: scroll states, mega menu, floating offsets ---------- */
let header;
function initHeader() {
  header = $("#site-header");
  const bar = $(".scroll-progress span"), toTop = $(".to-top");
  let lastY = scrollY, ticking = false;
  const update = () => {
    const y = scrollY, dy = y - lastY;
    header.classList.toggle("is-scrolled", y > 8);
    const frozen = Layers.stack.length || header.classList.contains("mega-open") || (header.contains(document.activeElement) && document.activeElement !== document.body);
    if (!frozen) {
      if (y > 320 && dy > 6) header.classList.add("is-hidden");
      else if (dy < -6 || y < 140) header.classList.remove("is-hidden");
    }
    const max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    document.body.classList.toggle("show-top", y > innerHeight * 1.2);
    document.body.classList.toggle("header-hidden", header.classList.contains("is-hidden"));
    updateFloatOffset();
    lastY = y; ticking = false;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener("resize", update, { passive: true });
  update();
  setInterval(() => { if (!document.hidden) updateFloatOffset(); }, 800);
  const foot = $(".site-footer");
  if (foot && "IntersectionObserver" in window) new IntersectionObserver(([en]) => document.body.classList.toggle("footer-in", en.isIntersecting), { rootMargin: "0px 0px -35% 0px" }).observe(foot);
  header.addEventListener("focusin", () => header.classList.remove("is-hidden"));
  toTop.addEventListener("click", () => scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" }));

  // Mega menu with hover intent (only rendered when a group has 2+ live categories)
  const closeMega = li => {
    li.classList.remove("is-open"); $("a", li).setAttribute("aria-expanded", "false");
    if (!$(".has-mega.is-open")) { header.classList.remove("mega-open"); document.body.classList.remove("mega-open"); }
  };
  const openMega = li => {
    $$(".has-mega.is-open").forEach(o => o !== li && closeMega(o));
    const panel = $(".mega", li);
    if (!panel.dataset.ready) { panel.innerHTML = megaHTML(li.dataset.group); panel.dataset.ready = "1"; }
    li.classList.add("is-open"); $("a", li).setAttribute("aria-expanded", "true");
    header.classList.add("mega-open"); document.body.classList.add("mega-open");
  };
  $$(".has-mega").forEach(li => {
    let t;
    li.addEventListener("mouseenter", () => { clearTimeout(t); t = setTimeout(() => openMega(li), $(".has-mega.is-open") ? 0 : 110); });
    li.addEventListener("mouseleave", () => { clearTimeout(t); t = setTimeout(() => closeMega(li), 180); });
    li.addEventListener("focusin", () => { clearTimeout(t); openMega(li); });
    li.addEventListener("focusout", e => { if (!li.contains(e.relatedTarget)) closeMega(li); });
    li.addEventListener("keydown", e => { if (e.key === "Escape" && li.classList.contains("is-open")) { closeMega(li); $("a", li).focus(); } });
  });
  $(".mega-scrim").addEventListener("mouseenter", () => $$(".has-mega.is-open").forEach(closeMega));

  updateCounts();
  document.addEventListener("cart:change", e => updateCounts(e.detail && e.detail.action === "add"));
  document.addEventListener("wishlist:change", () => updateCounts());
}
/* Lift floating buttons + toasts above any page-owned fixed bottom bar (e.g. a sticky buy bar).
   Pages can also mark a bar with [data-bottom-bar]. */
const _ownFloat = ".wa-float, .to-top, .toast-stack, .cursor-dot, .cursor-ring, .drawer, .modal, .mobile-menu, .search-overlay, .scrim, .site-header";
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
  if (off !== _floatOff) { _floatOff = off; document.documentElement.style.setProperty("--float-offset", off + "px"); }
}
let _flying = 0;
function bump(el) { if (!el) return; el.classList.remove("is-bump"); void el.offsetWidth; el.classList.add("is-bump"); }
function updateCounts(added) {
  const c = Cart.count(), w = Wishlist.count();
  $$(".cart-count").forEach(el => { el.textContent = c; el.dataset.count = c; });
  $$(".wish-count").forEach(el => { el.textContent = w; el.dataset.count = w; });
  $$(".wish-count-text").forEach(el => { el.textContent = `(${pad2(w)})`; });
  const ct = $(".cart-toggle"); if (ct) ct.setAttribute("aria-label", `Open bag, ${c} item${c === 1 ? "" : "s"}`);
  const wl = $(".wish-link"); if (wl) wl.setAttribute("aria-label", `Wishlist, ${w} item${w === 1 ? "" : "s"}`);
  if (added && !_flying) { bump($(".cart-toggle")); bump($(".cart-count")); }
}
function updateCartCount() { updateCounts(); }

/* ---------- Mobile menu ---------- */
function openMenu() {
  const m = $("#mobile-menu"); closeDrawers();
  const row = $(".mm-drop-row", m);
  if (row && !row.dataset.ready) {
    row.dataset.ready = "1";
    row.innerHTML = PRODUCTS.slice().sort((a, b) => rankProduct(b) - rankProduct(a)).slice(0, 12).map(p => `<a class="mm-drop-tile" href="${productUrl(p)}" aria-label="${esc(titleOf(p))}"><span class="mm-drop-media">${productImage(p)}</span><span class="mm-drop-meta"><span>[${pad2(PRODUCTS.indexOf(p) + 1)}]</span><span>${rupee(p.price)}</span></span></a>`).join("");
  }
  $$(".mm-item", m).forEach((el, i) => el.style.setProperty("--i", i));
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
      name: _norm(p.name), cat: _norm(catName(p.category) + " " + groupOf(p) + " " + p.shape + " tshirt tee"),
      color: _norm(p.colorName), fabric: _norm((p.fabric || "") + " " + (p.fit || "") + " " + (pr.front || "") + " " + (pr.back || "")),
      tags: _norm((p.tags || []).join(" ")), desc: _norm(p.desc)
    };
    let score = 0;
    for (const t of tokens) {
      let s = 0;
      if (f.name.includes(t)) s += (new RegExp("(^|\\s)" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(f.name) ? 6 : 4);
      if (f.cat.includes(t)) s += 3;
      if (f.color.includes(t)) s += 3;
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
  PRODUCTS.forEach(p => add(String(p.colorName || "").split(" ").pop()));
  PRODUCTS.forEach(p => { const w = titleOf(p).split(" ")[0]; if (w.length > 3) add(w); });
  return out.slice(0, 10);
}
function srTile(p, i, q) {
  const s = stockInfo(p), n = PRODUCTS.indexOf(p);
  return `<a class="sr-item" id="sr-${i}" role="option" aria-selected="false" href="${productUrl(p)}">
    <span class="sr-thumb">${n > -1 ? `<span class="sr-idx" aria-hidden="true">[${pad2(n + 1)}]</span>` : ""}${productImage(p)}</span>
    <span class="sr-text"><span class="sr-name">${q ? highlight(titleOf(p), q) : esc(titleOf(p))}</span>
    <span class="sr-meta">${q ? highlight(p.colorName || catName(p.category), q) : esc(p.colorName || catName(p.category))}${s.soldOut ? " · Sold out" : s.low ? ` · ${pad2(s.left)} left` : ""}</span>
    <span class="sr-price">${rupee(p.price)}${discount(p) ? `<s>${rupee(p.mrp)}</s>` : ""}</span></span></a>`;
}
function openSearch(prefill) {
  const o = $("#search-overlay"), input = $("input", o); closeDrawers();
  const tr = $(".search-trending", o);
  if (!tr.dataset.ready) {
    tr.innerHTML = uniqueFamilies(PRODUCTS.slice().sort((a, b) => rankProduct(b) - rankProduct(a)), 8).map((p, i) => srTile(p, "t" + i)).join("");
    $(".search-chips", o).innerHTML = searchSuggestions().map(s => `<button type="button" class="chip" data-search="${esc(s)}">${esc(s)}</button>`).join("");
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
    none.innerHTML = `<p class="search-none-title">Nothing for “${esc(q)}”</p><p>Try ${searchSuggestions().slice(0, 4).map(s => `<button type="button" class="chip" data-search="${esc(s)}">${esc(s)}</button>`).join(" ")}</p>`;
    return;
  }
  none.hidden = true; wrap.hidden = false; input.setAttribute("aria-expanded", "true");
  $(".search-count", o).textContent = `${pad2(res.length)} result${res.length === 1 ? "" : "s"}`;
  const all = $(".search-all", o); all.href = `shop.html?q=${encodeURIComponent(q)}`; all.hidden = res.length <= 12;
  list.innerHTML = res.slice(0, 12).map((p, i) => srTile(p, i, q)).join("");
  const more = res.length < 4 ? uniqueFamilies(PRODUCTS.filter(p => !res.includes(p)).sort((a, b) => rankProduct(b) - rankProduct(a)), 6) : [];
  $(".search-more", o).innerHTML = more.length ? `<p class="eyebrow">More from ${esc(dropLabel())}</p><div class="search-trending">${more.map((p, i) => srTile(p, "m" + i)).join("")}</div>` : "";
}
function initSearch() {
  const o = $("#search-overlay"), input = $("input", o), form = $("form", o);
  $$(".search-toggle").forEach(b => b.addEventListener("click", () => openSearch()));
  $(".search-close", o).addEventListener("click", closeSearch);
  let t; input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(runSearch, 50); });
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
let _shipUnlocked = null;
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
  const rank = p => (want && groupOf(p) === want ? 4 : 0) + (!fams.has(p.family || p.id) ? 3 : 0) + ((p.tags || []).includes("bestseller") ? 2 : 0) + (stockInfo(p).low ? 1 : 0);
  return uniqueFamilies(pool.sort((a, b) => rank(b) - rank(a)), 3);
}
function renderCart() {
  const d = $("#cart-drawer"); if (!d) return;
  const lines = Cart.lines(), sub = Cart.subtotal(), count = Cart.count(), free = +STORE.freeShippingAbove || 0, ds = dropState();
  $(".drawer-count", d).textContent = count ? `(${pad2(count)})` : "";
  // Free-shipping progress (persistent elements so the bar animates)
  const ship = $(".cart-ship", d);
  if (!lines.length || !free) { ship.innerHTML = ""; ship.hidden = true; _shipUnlocked = null; }
  else {
    ship.hidden = false;
    if (!$(".ship-bar", ship)) ship.innerHTML = `<p class="ship-msg" aria-live="polite"></p><div class="ship-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-label="Progress to free shipping"><span></span></div><div class="ship-ticks" aria-hidden="true"><span>₹0</span><span>${rupee(free)} · Free</span></div>`;
    const left = free - sub, unlocked = left <= 0, pct = Math.min(100, sub / free * 100);
    $(".ship-msg", ship).innerHTML = unlocked ? `${ICON.check}<span>Free shipping unlocked</span>` : `<span><b>${rupee(left)}</b> away from free shipping</span>`;
    $(".ship-bar", ship).setAttribute("aria-valuenow", String(Math.round(pct)));
    requestAnimationFrame(() => { const s = $(".ship-bar span", ship); if (s) s.style.width = pct + "%"; });
    ship.classList.toggle("is-unlocked", unlocked);
    if (unlocked && _shipUnlocked === false && document.body.classList.contains("cart-open")) { ship.classList.remove("is-celebrate"); void ship.offsetWidth; ship.classList.add("is-celebrate"); }
    _shipUnlocked = unlocked;
  }
  // Lines
  const list = $(".cart-lines", d);
  const blocked = lines.filter(l => !isBuyable(l.p) || l.qty > Cart.limit(l.id));
  if (!lines.length) {
    list.innerHTML = `<div class="cart-empty">
      <p class="cart-empty-title">Bag's<span class="outline-text">empty</span></p>
      <p class="cart-empty-text">${ds.live ? `${esc(dropLabel())} is live with ${PRODUCTS.filter(isBuyable).length} pieces. Limited units — once they're gone, they're gone.` : `${esc(dropLabel())} unlocks soon. Pick your tee now and be ready.`}</p>
      <a class="btn btn-block" href="shop.html">Shop ${esc(dropLabel())} ${ICON.arrow}</a></div>`;
  } else {
    list.innerHTML = lines.map(l => {
      const max = Cart.limit(l.id), ok = isBuyable(l.p), s = stockInfo(l.p);
      const warn = !ok ? (s.soldOut ? "Sold out — remove to check out" : `Unlocks when ${esc(dropLabel())} goes live`) : l.qty > max ? `Only ${max} left — reduce qty` : (s.low ? `Only ${pad2(s.left)} left` : "");
      return `<div class="cart-line${ok ? "" : " is-blocked"}" data-index="${l.index}">
      <a class="cart-thumb" href="${productUrl(l.p)}" tabindex="-1" aria-hidden="true">${productImage(l.p)}</a>
      <div class="cart-info">
        <a class="cart-name" href="${productUrl(l.p)}">${esc(titleOf(l.p))}</a>
        <span class="cart-variant">${esc(l.p.colorName || "")} · Size ${esc(l.size)}</span>
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
      <div class="cart-price"><b>${rupee(l.p.price * l.qty)}</b>${l.p.mrp > l.p.price ? `<s>${rupee(l.p.mrp * l.qty)}</s>` : ""}</div>
    </div>`; }).join("");
  }
  // Upsell: "Add one more tee" from products not in the bag (empty bag: the whole drop)
  const up = $(".cart-upsell", d);
  const ups = lines.length ? upsellFor(lines) : uniqueFamilies(PRODUCTS.filter(isBuyable).sort((a, b) => rankProduct(b) - rankProduct(a)), 5);
  const allTees = ups.every(p => p.shape === "tee");
  const upTitle = lines.length ? (allTees ? "Add one more tee" : "Add one more") : `${dropLabel()} — pick yours`;
  up.innerHTML = ups.length ? `<div class="cart-upsell-head"><h3>${esc(upTitle)}</h3><span class="mono">${pad2(ups.length)} ${lines.length ? "left to add" : "pieces"}</span></div>
    <div class="upsell-list">${ups.map(p => miniCard(p, miniSizes(p))).join("")}</div>` : "";
  // Footer
  const save = lines.reduce((s, l) => s + Math.max(0, l.p.mrp - l.p.price) * l.qty, 0);
  const waMsg = lines.length ? `Hi BHAKSHI, I need help with my bag:\n${lines.map(l => `• ${l.p.name} (Size ${l.size}) × ${l.qty}`).join("\n")}` : "Hi BHAKSHI, I need some help.";
  const blockMsg = !ds.live ? `Checkout opens when ${dropLabel()} goes live` : blocked.length ? "Fix the flagged items to check out" : "";
  $(".cart-foot", d).innerHTML = lines.length ? `
    <div class="cart-total"><span>Subtotal</span><b>${rupee(sub)}</b></div>
    ${save > 0 ? `<p class="cart-save">You're saving ${rupee(save)} on MRP</p>` : ""}
    <p class="cart-note">Shipping &amp; coupons at checkout · UPI${codOn() ? " or Cash on Delivery" : ""}</p>
    ${blockMsg ? `<p class="cart-block-msg">${esc(blockMsg)}</p>` : ""}
    <a class="btn btn-block btn-lg${blockMsg ? " is-disabled" : ""}" href="checkout.html"${blockMsg ? ' aria-disabled="true" tabindex="-1"' : ""} data-magnetic>Checkout · ${rupee(sub)} ${ICON.arrow}</a>
    <a class="cart-help" href="${waLink(waMsg)}" target="_blank" rel="noopener">${ICON.wa}<span>Questions? Ask us on WhatsApp</span></a>` : "";
}
function initCart() {
  $(".cart-toggle").addEventListener("click", openCart);
  $(".drawer-close").addEventListener("click", closeCart);
  $(".scrim").addEventListener("click", () => { const t = Layers.top(); if (t) t.close(); });
  document.addEventListener("cart:change", () => renderCart());
  $("#cart-drawer").addEventListener("click", e => {
    const dec = e.target.closest("[data-cart-dec]"), inc = e.target.closest("[data-cart-inc]"), rm = e.target.closest("[data-cart-remove]");
    if (dec || inc) {
      const i = +(dec || inc).dataset[dec ? "cartDec" : "cartInc"], line = Cart.get()[i]; if (!line) return;
      if (dec && line.qty <= 1) return removeLine(i);
      Cart.setQty(i, line.qty + (dec ? -1 : 1));
      const out = $(`.cart-line[data-index="${i}"] output`); if (out) bump(out);
    }
    if (rm) removeLine(+rm.dataset.cartRemove);
  });
}
function removeLine(i) {
  const el = $(`.cart-line[data-index="${i}"]`), line = Cart.get()[i]; if (!line) return;
  const p = getProduct(line.id);
  const go = () => {
    Cart.remove(i);
    toast(`Removed ${titleOf(p)} (${line.size})`, { type: "info", action: { label: "Undo", onClick: () => Cart.insert(i, line) } });
    const f = $(".cart-line .qty button, .cart-empty .btn"); if (f) f.focus({ preventScroll: true });
  };
  if (el && !reducedMotion()) { el.style.height = el.offsetHeight + "px"; void el.offsetHeight; el.classList.add("is-removing"); setTimeout(go, 260); } else go();
}

/* ---------- Toast ---------- */
function toast(msg, opts = {}) {
  const stack = $(".toast-stack"); if (!stack) return;
  const type = opts.type || "success";
  const t = document.createElement("div");
  t.className = `toast toast-${type}`; t.setAttribute("role", type === "error" ? "alert" : "status");
  t.innerHTML = `<span class="toast-icon">${type === "error" ? ICON.alert : type === "info" ? ICON.info : ICON.check}</span><span class="toast-msg"></span>${opts.action ? `<button type="button" class="toast-action"></button>` : ""}<button type="button" class="toast-close" aria-label="Dismiss">${ICON.close}</button>`;
  $(".toast-msg", t).textContent = msg;
  const kill = () => { if (t._gone) return; t._gone = true; t.classList.remove("is-in"); t.classList.add("is-out"); setTimeout(() => t.remove(), 320); };
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
      }, reducedMotion() ? 0 : 320);
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

/* ---------- Fly to cart ---------- */
function flyToCart(sourceEl) {
  const target = $(".cart-toggle");
  if (!sourceEl || !target) { bump(target); return Promise.resolve(); }
  header && header.classList.remove("is-hidden");
  let src = sourceEl;
  const card = sourceEl.closest && sourceEl.closest(".card");
  if (card && $(".card-img", card)) src = $(".card-img", card);
  else if (!sourceEl.matches("img,svg") && sourceEl.querySelector && sourceEl.querySelector("img,svg")) src = sourceEl.querySelector("img,svg");
  const r = src.getBoundingClientRect();
  if (reducedMotion() || !r.width || !document.body.animate) { bump(target); bump($(".cart-count")); return Promise.resolve(); }
  const ghost = document.createElement("div");
  ghost.className = "fly-ghost";
  const w = Math.min(r.width, 220), h = w * (r.height / r.width || 1.25);
  Object.assign(ghost.style, { left: (r.left + (r.width - w) / 2) + "px", top: (r.top + (r.height - h) / 2) + "px", width: w + "px", height: h + "px" });
  ghost.appendChild(src.cloneNode(true));
  document.body.appendChild(ghost); _flying++;
  const go = () => {
    const tr = target.getBoundingClientRect();
    const sx = r.left + r.width / 2, sy = r.top + r.height / 2, ex = tr.left + tr.width / 2, ey = tr.top + tr.height / 2;
    const cx = (sx + ex) / 2 + (ex > sx ? -60 : 60), cy = Math.min(sy, ey) - 160;
    const frames = [], N = 14, endScale = 22 / w;
    for (let i = 0; i <= N; i++) {
      const t = i / N, x = (1 - t) ** 2 * sx + 2 * (1 - t) * t * cx + t * t * ex, y = (1 - t) ** 2 * sy + 2 * (1 - t) * t * cy + t * t * ey;
      const s = 1 + (endScale - 1) * (t ** 1.4);
      frames.push({ transform: `translate(${x - sx}px, ${y - sy}px) scale(${s}) rotate(${t * -8}deg)`, opacity: t > .85 ? 1 - (t - .85) / .15 * .7 : 1 });
    }
    const anim = ghost.animate(frames, { duration: 780, easing: "cubic-bezier(.55,.05,.35,1)", fill: "forwards" });
    return anim.finished.catch(() => {}).then(() => { ghost.remove(); _flying = Math.max(0, _flying - 1); bump(target); bump($(".cart-count")); });
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
      bump($(".wish-link"));
      toast(added ? `Saved ${titleOf(p)} to wishlist` : `Removed from wishlist`, added
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
      toast(`Added ${titleOf(p)} · ${size}`, { type: "success", action: inDrawer ? null : { label: "View bag", onClick: openCart } });
      return;
    }
    if (e.target.closest("[data-open-cart]")) { e.preventDefault(); openCart(); return; }
    if (e.target.closest("[data-open-search]")) { e.preventDefault(); openSearch(); return; }
    if (e.target.closest("#mobile-menu [data-fitfinder], #cart-drawer [data-fitfinder]")) { closeDrawers(); return; } // features.js opens the Fit Finder
    const sn = e.target.closest(".scroller-prev, .scroller-next");
    if (sn) {
      const sc = sn.getAttribute("aria-controls") ? document.getElementById(sn.getAttribute("aria-controls")) : findScroller(sn);
      if (sc) sc.scrollBy({ left: (sn.classList.contains("scroller-prev") ? -1 : 1) * sc.clientWidth * .85, behavior: reducedMotion() ? "auto" : "smooth" });
    }
  });
  document.addEventListener("wishlist:change", e => syncHearts(e.detail && e.detail.id));
  // Card spotlight follows the pointer
  if (finePointer()) document.addEventListener("pointermove", e => {
    const m = e.target.closest && e.target.closest(".card-media"); if (!m) return;
    const r = m.getBoundingClientRect();
    m.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
    m.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
    const alt = $(".card-img-alt", m); if (alt) { alt.style.setProperty("--mx", m.style.getPropertyValue("--mx")); alt.style.setProperty("--my", m.style.getPropertyValue("--my")); }
  }, { passive: true });
  // Footer WhatsApp drop alerts
  const join = $(".wa-join");
  if (join) join.addEventListener("submit", e => {
    e.preventDefault();
    const name = join.name.value.trim().slice(0, 40);
    window.open(waLink(`Hi ${STORE.name}! Add me to drop alerts — I want first word on new drops.${name ? " My name is " + name + "." : ""}`), "_blank", "noopener");
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

/* ---------- Reveal on scroll (+ tickers, countdowns, data-scramble="in") ---------- */
let _io;
function refreshReveal(root = document) {
  const scope = root && (root.nodeType === 1 || root === document) ? root : document;
  const els = $$("[data-reveal], .reveal, [data-scramble='in']", scope);
  if (scope.matches && scope.matches("[data-reveal], [data-scramble='in']")) els.push(scope);
  initTickers(scope); initCountdowns(scope);
  if (!("IntersectionObserver" in window) || reducedMotion()) { els.forEach(el => el.classList.add("is-in", "in")); return; }
  if (!_io) _io = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add("is-in", "in"); if (en.target.dataset.scramble === "in") scramble(en.target, 800); _io.unobserve(en.target); }
  }), { threshold: .12, rootMargin: "0px 0px -6% 0px" });
  els.forEach(el => {
    if (el.dataset.reveal === "stagger") [...el.children].forEach((c, i) => c.style.setProperty("--i", Math.min(i, 14)));
    if (el.dataset.revealBound) return;
    el.dataset.revealBound = "1"; _io.observe(el);
  });
  $$(".scroller").forEach(updateScrollerNav);
}

/* ---------- Magnetic buttons ---------- */
function initMagnetic() {
  if (!finePointer() || reducedMotion()) return;
  let cur = null;
  const reset = el => { el.style.translate = ""; };
  document.addEventListener("pointermove", e => {
    const m = e.target.closest && e.target.closest("[data-magnetic]");
    if (m !== cur) { if (cur) reset(cur); cur = m; }
    if (!m) return;
    const r = m.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / r.width, dy = (e.clientY - (r.top + r.height / 2)) / r.height;
    m.style.translate = `${(dx * 10).toFixed(1)}px ${(dy * 6).toFixed(1)}px`;
  }, { passive: true });
  document.addEventListener("pointerleave", () => cur && reset(cur));
}

/* ---------- Custom cursor (fine pointer only, never intercepts events) ---------- */
function initCursor() {
  if (!finePointer() || reducedMotion()) return;
  const dot = document.createElement("div"), ring = document.createElement("div");
  dot.className = "cursor-dot is-hidden"; ring.className = "cursor-ring is-hidden";
  dot.setAttribute("aria-hidden", "true"); ring.setAttribute("aria-hidden", "true");
  dot.innerHTML = "<i></i>"; ring.innerHTML = "<i></i>";
  document.body.append(ring, dot);
  const label = $("i", ring);
  let x = -100, y = -100, rx = x, ry = y, raf = 0, shown = false, lastT = null;
  const loop = () => {
    rx += (x - rx) * .22; ry += (y - ry) * .22;
    ring.style.transform = `translate3d(${rx.toFixed(1)}px,${ry.toFixed(1)}px,0)`;
    raf = Math.abs(x - rx) + Math.abs(y - ry) > .2 ? requestAnimationFrame(loop) : 0;
  };
  const setCls = (k, on) => { dot.classList.toggle(k, on); ring.classList.toggle(k, on); };
  const state = t => {
    if (t === lastT || !t || !t.closest) return; lastT = t;
    const field = t.closest("input, textarea, select, [contenteditable=true], iframe");
    const view = !field && t.closest(".card-media, [data-cursor]");
    const link = !field && !view && t.closest("a, button, [role=button], label, summary, .chip, [data-magnetic]");
    setCls("is-field", !!field); setCls("is-view", !!view); setCls("is-link", !!link);
    if (view) label.textContent = view.dataset.cursor || "View";
  };
  addEventListener("pointermove", e => {
    if (e.pointerType && e.pointerType !== "mouse") return;
    x = e.clientX; y = e.clientY;
    dot.style.transform = `translate3d(${x}px,${y}px,0)`;
    if (!shown) { shown = true; rx = x; ry = y; document.documentElement.classList.add("has-cursor", "cursor-on"); }
    setCls("is-hidden", false);
    state(e.target);
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
  document.documentElement.addEventListener("mouseleave", () => setCls("is-hidden", true));
  addEventListener("pointerdown", () => setCls("is-down", true));
  addEventListener("pointerup", () => setCls("is-down", false));
  document.addEventListener("scroll", () => { lastT = null; }, { passive: true, capture: true });
}

/* ---------- Footer wordmark: fit edge to edge ---------- */
function fitFooterMark() {
  const m = $(".footer-mark"), s = m && $("span", m); if (!s) return;
  m.style.fontSize = "100px";
  const cs = getComputedStyle(m), avail = m.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), w = s.getBoundingClientRect().width;
  if (w > 0 && avail > 0) m.style.fontSize = (100 * avail / w * .995).toFixed(2) + "px";
}

/* ---------- Page transitions ---------- */
function navigate(url) {
  if (reducedMotion()) { location.href = url; return; }
  document.body.classList.add("is-leaving");
  setTimeout(() => { location.href = url; }, 220);
}
function initTransitions() {
  addEventListener("click", e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest("a[href]"); if (!a) return;
    if (a.target && a.target !== "_self" || a.hasAttribute("download") || a.closest("[data-no-transition]")) return;
    const href = a.getAttribute("href"); if (!href || href.startsWith("#") || /^(mailto|tel|javascript|sms|upi):/i.test(href)) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
    e.preventDefault(); navigate(url.href);
  });
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
initScramble();
initMagnetic();
initCursor();
initTransitions();
renderCart();
refreshReveal();
fitFooterMark();
{ let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { fitFooterMark(); initTickers(); }, 150); }, { passive: true }); }
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fitFooterMark(); }).catch(() => {});
document.addEventListener("DOMContentLoaded", () => {
  refreshReveal(); syncHearts(); fitFooterMark();
  // Auto-pick up content injected later (page scripts may still call refreshReveal()).
  const main = $("main");
  if (main && "MutationObserver" in window) {
    let pending = false;
    new MutationObserver(() => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; refreshReveal(); }); }).observe(main, { childList: true, subtree: true });
  }
});
