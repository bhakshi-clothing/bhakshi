/* =========================================================
   BHAKSHI — shell & shared API (see ARCHITECTURE.md)
   Helpers · stores (Cart / Wishlist / Recent) · product card · header, mega menu,
   mobile menu, search · cart drawer · Modal · toast · flyToCart · reveal ·
   custom cursor · page transitions · footer.
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
const discount = p => (p && p.mrp > p.price) ? Math.round((1 - p.price / p.mrp) * 100) : 0;
const variantsOf = p => { p = getProduct(p); if (!p) return []; return p.family ? PRODUCTS.filter(x => x.family === p.family) : [p]; };
const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = () => matchMedia("(hover: hover) and (pointer: fine)").matches;
const waLink = (text = "") => `https://wa.me/${encodeURIComponent(STORE.whatsapp)}${text ? "?text=" + encodeURIComponent(text) : ""}`;
const productUrl = p => `product.html?id=${encodeURIComponent(p.id)}`;
const titleOf = p => String(p.name).split(" — ")[0];

function productImage(p, i = 0, view) {
  p = getProduct(p); if (!p) return "";
  const src = p.images && p.images[i];
  if (src) return `<img src="${esc(src)}" alt="${esc(p.name)}${i ? " (view " + (i + 1) + ")" : ""}" loading="lazy" decoding="async">`;
  if (typeof Art !== "undefined" && Art.garment) return Art.garment(p, { view: view || (i === 1 ? "back" : i >= 2 ? "detail" : "front") });
  return `<div class="img-fallback" style="background:${esc(p.color)}" role="img" aria-label="${esc(p.name)}"></div>`;
}
function swatchHTML(color) {
  return (typeof Art !== "undefined" && Art.swatch) ? Art.swatch(color) : `<span class="swatch-dot" style="background:${esc(color)}"></span>`;
}

const ICON = {
  search: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2" stroke-linecap="round"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 20.3s-7.8-4.6-7.8-10.3A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 7.8 2.6c0 5.7-7.8 10.3-7.8 10.3Z" stroke-linejoin="round"/></svg>`,
  bag: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5.5 8h13l-1 12.5h-11z" stroke-linejoin="round"/><path d="M9 10V7a3 3 0 0 1 6 0v3" stroke-linecap="round"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 8h16M4 16h11" stroke-linecap="round"/></svg>`,
  close: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke-linecap="round"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 12h15m-5-5 5 5-5 5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  up: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>`,
  minus: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 12h14" stroke-linecap="round"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  check: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  info: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.2" stroke-linecap="round"/></svg>`,
  alert: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3.5 22 20H2z" stroke-linejoin="round"/><path d="M12 10v4.5M12 17.2v.2" stroke-linecap="round"/></svg>`,
  truck: `<svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M3 8h16v14H3zM19 13h6l4 5v4H19" stroke-linejoin="round"/><circle cx="9" cy="23.5" r="2.5" fill="var(--paper)"/><circle cx="24" cy="23.5" r="2.5" fill="var(--paper)"/></svg>`,
  cash: `<svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="3" y="9" width="26" height="15" rx="2"/><circle cx="16" cy="16.5" r="3.5"/><path d="M7 13v7M25 13v7"/></svg>`,
  swap: `<svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M6 12h19l-5-5M26 20H7l5 5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  india: `<svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="3"/><path d="M16 5v8M16 19v8M5 16h8M19 16h8M8.2 8.2l5.7 5.7M18.1 18.1l5.7 5.7M23.8 8.2l-5.7 5.7M13.9 18.1l-5.7 5.7"/></svg>`,
  truckSm: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M2.5 6.5h11v10h-11zM13.5 10h4l3 3.5v3h-7" stroke-linejoin="round"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/></svg>`,
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
  limit(id) { const p = getProduct(id); return p ? Math.max(0, Math.min(this.MAX, p.stock)) : 0; },
  add(id, size, qty = 1) {
    const p = getProduct(id); if (!p || p.stock <= 0) return false;
    qty = Math.max(1, parseInt(qty, 10) || 1);
    const items = this.get();
    let line = items.find(i => i.id === p.id && String(i.size) === String(size));
    if (line) line.qty = Math.min(this.limit(p.id), line.qty + qty);
    else items.push(line = { id: p.id, size, qty: Math.min(this.limit(p.id), qty) });
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
    const list = _store.read(this.KEY, []).filter(x => x !== id && getProduct(x));
    list.unshift(id); _store.write(this.KEY, list.slice(0, this.MAX));
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

/* ---------- Product card ---------- */
function productCard(p) {
  p = getProduct(p); if (!p) return "";
  const id = esc(p.id), url = productUrl(p), soldOut = p.stock <= 0, off = discount(p), wished = Wishlist.has(p.id);
  const tags = p.tags || [];
  const badge = soldOut ? `<span class="badge badge-dark">Sold out</span>`
    : tags.includes("new") ? `<span class="badge">New</span>`
    : tags.includes("bestseller") ? `<span class="badge badge-accent">Bestseller</span>`
    : tags.includes("sale") ? `<span class="badge badge-sale">Sale</span>` : "";
  const hasPhoto = p.images && p.images[0];
  const alt = hasPhoto ? (p.images[1] ? productImage(p, 1) : "") : productImage(p, 0, "back");
  const vars = variantsOf(p);
  const swatches = vars.length > 1 ? `<div class="card-swatches" aria-label="${vars.length} colours">${vars.slice(0, 5).map(v =>
    `<a class="swatch${v.id === p.id ? " is-current" : ""}" href="${productUrl(v)}" title="${esc(v.colorName)}" aria-label="${esc(v.colorName)}"${v.id === p.id ? ' aria-current="true"' : ""}>${swatchHTML(v.color)}</a>`).join("")}${vars.length > 5 ? `<span class="swatch-more">+${vars.length - 5}</span>` : ""}</div>` : "";
  const sizes = soldOut
    ? `<div class="card-sizes card-sizes-out"><span>Sold out · back soon</span></div>`
    : `<div class="card-sizes" role="group" aria-label="Quick add a size"><span class="card-sizes-label">Add</span>${p.sizes.map(s =>
      `<button type="button" data-add="${id}" data-size="${esc(s)}" aria-label="Add size ${esc(s)} to bag">${esc(s)}</button>`).join("")}</div>`;
  const low = !soldOut && p.stock <= 5 ? `<span class="card-low">Only ${p.stock} left</span>` : "";
  return `<article class="card${soldOut ? " is-soldout" : ""}" data-id="${id}">
    <a class="card-media" href="${url}" tabindex="-1" aria-hidden="true">
      ${badge ? `<span class="card-badges">${badge}</span>` : ""}
      <span class="card-img">${productImage(p, 0, "front")}</span>
      ${alt ? `<span class="card-img-alt">${alt}</span>` : ""}
    </a>
    <button type="button" class="card-wish" data-wish="${id}" aria-pressed="${wished}" aria-label="${wished ? "Remove from" : "Add to"} wishlist">${ICON.heart}</button>
    <button type="button" class="card-quick" data-quick="${id}" aria-label="Quick view ${esc(p.name)}">${ICON.eye}<span>Quick view</span><i class="card-quick-plus">${ICON.plus}</i></button>
    ${sizes}
    <div class="card-body">
      <a class="card-title" href="${url}">${esc(titleOf(p))}</a>
      <p class="card-meta">${esc(p.colorName || catName(p.category))}${p.fit ? ` · ${esc(p.fit)} fit` : ""}</p>
      <div class="price"><span class="price-now">${rupee(p.price)}</span>${off > 0 ? `<s class="price-mrp">${rupee(p.mrp)}</s><span class="price-off">${off}% off</span>` : ""}</div>
      ${swatches}${low}
    </div>
  </article>`;
}

/* Compact horizontal product row used in cart, search, upsells */
function miniCard(p, extra = "") {
  return `<div class="mini-card"><a class="mini-thumb" href="${productUrl(p)}" tabindex="-1" aria-hidden="true">${productImage(p)}</a>
    <div class="mini-info"><a class="mini-name" href="${productUrl(p)}">${esc(titleOf(p))}</a>
    <span class="mini-meta">${esc(p.colorName || "")} · ${rupee(p.price)}</span>${extra}</div></div>`;
}

/* ---------- Scroll lock & layer stack (drawers, search, modal) ---------- */
let _lockCount = 0;
function lockScroll(on) {
  _lockCount = Math.max(0, _lockCount + (on ? 1 : -1));
  const de = document.documentElement;
  if (_lockCount && !de.classList.contains("is-locked")) {
    const sb = innerWidth - de.clientWidth;
    de.style.setProperty("--sbw", sb + "px");
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

/* ---------- Layout: announcement, header, menus, search, drawer, footer ---------- */
const NAV_GROUPS = ["Topwear", "Bottoms", "Winterwear", "Co-ords"].filter(g => CATEGORIES.some(c => c.group === g))
  .concat([...new Set(CATEGORIES.map(c => c.group))].filter(g => !["Topwear", "Bottoms", "Winterwear", "Co-ords"].includes(g)));
const GROUP_OCCASION = {
  Topwear: { tag: "office", title: "The Office <em>Edit</em>", text: "Crisp Oxfords, polos and easy-iron shirts for the working week." },
  Bottoms: { tag: "casual", title: "Weekend <em>Ease</em>", text: "Chinos, denim and joggers that move with your Saturday." },
  Winterwear: { tag: "athleisure", title: "Layer <em>Up</em>", text: "Hoodies and jackets built for cool evenings and long drives." },
  "Co-ords": { tag: "festive", title: "Festive <em>Ready</em>", text: "Sets and kurtas for haldi mornings and Diwali nights." }
};
const groupCats = g => CATEGORIES.filter(c => c.group === g);
function featuredFor(group, n = 2) {
  const rank = p => (p.tags.includes("bestseller") ? 2 : 0) + (p.tags.includes("new") ? 1 : 0);
  const inG = PRODUCTS.filter(p => groupOf(p) === group && p.stock > 0).sort((a, b) => rank(b) - rank(a));
  const seen = new Set(inG.map(p => p.family));
  const pick = []; const fam = new Set();
  inG.forEach(p => { if (pick.length < n && !fam.has(p.family)) { pick.push(p); fam.add(p.family); } });
  const occ = (GROUP_OCCASION[group] || {}).tag;
  PRODUCTS.filter(p => p.stock > 0 && !seen.has(p.family) && (p.tags.includes(occ) || p.tags.includes("bestseller")))
    .sort((a, b) => (b.tags.includes(occ) ? 2 : 0) + (b.tags.includes("bestseller") ? 1 : 0) - ((a.tags.includes(occ) ? 2 : 0) + (a.tags.includes("bestseller") ? 1 : 0))).forEach(p => { if (pick.length < n && !fam.has(p.family)) { pick.push(p); fam.add(p.family); } });
  return pick;
}

function megaHTML(g) {
  const occ = GROUP_OCCASION[g] || { tag: "new", title: "New <em>In</em>", text: "Fresh arrivals, every fortnight." };
  return `<div class="mega-inner container">
    <div class="mega-links"><p class="eyebrow">${esc(g)}</p>
      <ul>${groupCats(g).map(c => `<li><a href="shop.html?cat=${encodeURIComponent(c.id)}">${esc(c.name)}<sup>${PRODUCTS.filter(p => p.category === c.id).length}</sup></a></li>`).join("")}</ul>
      <a class="link-arrow" href="shop.html?group=${encodeURIComponent(g)}">Shop all ${esc(g)}</a></div>
    ${featuredFor(g).map(p => `<a class="mega-tile" href="${productUrl(p)}"><span class="mega-tile-media">${productImage(p)}</span>
      <span class="mega-tile-name">${esc(titleOf(p))}</span><span class="mega-tile-price">${rupee(p.price)}</span></a>`).join("")}
    <a class="mega-occasion" href="shop.html?tag=${encodeURIComponent(occ.tag)}"><span class="eyebrow">Shop by occasion</span>
      <span class="mega-occasion-title">${occ.title}</span><span class="mega-occasion-text">${esc(occ.text)}</span><span class="link-arrow">Explore the edit</span></a>
  </div>`;
}

function renderLayout() {
  const body = document.body, main = $("main");
  const page = body.dataset.page || "";
  const annClosed = sessionStorage.getItem("bhakshi_announce_closed") === "1";
  const ann = (STORE.announcement || []).filter(Boolean);
  const navLinks = [
    `<li><a href="shop.html"${page === "shop" && !location.search ? ' aria-current="page"' : ""}>Shop All</a></li>`,
    `<li><a href="shop.html?tag=new">New In</a></li>`,
    ...NAV_GROUPS.map(g => `<li class="has-mega" data-group="${esc(g)}"><a href="shop.html?group=${encodeURIComponent(g)}" aria-expanded="false" aria-haspopup="true">${esc(g)}</a><div class="mega" role="region" aria-label="${esc(g)}"></div></li>`),
    `<li><a href="shop.html?tag=festive" class="nav-festive">Festive</a></li>`
  ].join("");

  const mmGroups = NAV_GROUPS.map((g, i) => `<div class="mm-group mm-item">
      <button type="button" class="mm-acc" aria-expanded="false" aria-controls="mm-panel-${i}"><span>${esc(g)}</span><i aria-hidden="true"></i></button>
      <div class="mm-panel" id="mm-panel-${i}"><div>${groupCats(g).map(c => `<a href="shop.html?cat=${encodeURIComponent(c.id)}">${esc(c.name)}</a>`).join("")}
        <a href="shop.html?group=${encodeURIComponent(g)}" class="mm-all">Shop all ${esc(g)} ${ICON.arrow}</a></div></div></div>`).join("");

  const header = `
  <a class="skip-link" href="#main">Skip to content</a>
  ${ann.length && !annClosed ? `<div class="announce" role="region" aria-label="Announcements">
    <div class="announce-track" aria-live="off">${ann.map((a, i) => `<p class="announce-msg${i === 0 ? " is-active" : ""}"${i ? ' aria-hidden="true"' : ""}>${esc(a)}</p>`).join("")}</div>
    <button type="button" class="announce-close" aria-label="Dismiss announcement">${ICON.close}</button></div>` : ""}
  <header class="site-header" id="site-header">
    <div class="header-inner">
      <div class="header-left">
        <button type="button" class="icon-btn menu-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu">${ICON.menu}</button>
        <button type="button" class="icon-btn search-toggle hide-desktop" aria-label="Search">${ICON.search}</button>
        <nav class="nav-main" aria-label="Main"><ul>${navLinks}</ul></nav>
      </div>
      <a class="wordmark" href="index.html" aria-label="${esc(STORE.name)} home">${esc(STORE.name)}</a>
      <div class="header-right">
        <button type="button" class="icon-btn search-toggle hide-mobile" aria-label="Search">${ICON.search}</button>
        <a class="icon-btn wish-link" href="wishlist.html" aria-label="Wishlist">${ICON.heart}<span class="count wish-count" data-count="0">0</span></a>
        <button type="button" class="icon-btn cart-toggle" aria-label="Open bag" aria-controls="cart-drawer">${ICON.bag}<span class="count cart-count" data-count="0">0</span></button>
      </div>
    </div>
    <div class="scroll-progress" aria-hidden="true"><span></span></div>
  </header>
  <div class="mega-scrim" aria-hidden="true"></div>
  <div class="scrim" aria-hidden="true"></div>
  <aside class="mobile-menu" id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu" tabindex="-1" inert>
    <div class="mm-head"><a class="wordmark" href="index.html">${esc(STORE.name)}</a><button type="button" class="icon-btn mm-close" aria-label="Close menu">${ICON.close}</button></div>
    <nav class="mm-nav" aria-label="Mobile">
      <a class="mm-link mm-item" href="shop.html">Shop All</a>
      <a class="mm-link mm-item" href="shop.html?tag=new">New In</a>
      ${mmGroups}
      <a class="mm-link mm-item" href="shop.html?tag=festive">Festive <em>edit</em></a>
      <a class="mm-link mm-item" href="shop.html?tag=bestseller">Bestsellers</a>
    </nav>
    <div class="mm-quick mm-item">
      <a href="wishlist.html">${ICON.heart}<span>Wishlist</span></a>
      <a href="contact.html#track">${ICON.truckSm}<span>Track order</span></a>
      <a href="${waLink("Hi BHAKSHI, I need some help.")}" target="_blank" rel="noopener">${ICON.wa}<span>WhatsApp help</span></a>
    </div>
    <p class="mm-note mm-item">Free shipping above ${rupee(STORE.freeShippingAbove)} · Cash on Delivery · 7-day exchange</p>
  </aside>
  <div class="search-overlay" id="search-overlay" role="dialog" aria-modal="true" aria-label="Search products" inert>
    <div class="search-top container">
      <form class="search-form" action="shop.html" role="search">
        ${ICON.search}
        <input type="search" name="q" placeholder="Search tees, linen, kurtas…" autocomplete="off" spellcheck="false" aria-label="Search products" role="combobox" aria-expanded="false" aria-controls="search-results" aria-autocomplete="list">
        <button type="button" class="search-clear" hidden>Clear</button>
      </form>
      <button type="button" class="icon-btn search-close" aria-label="Close search">${ICON.close}</button>
    </div>
    <div class="search-body container">
      <div class="search-empty">
        <div><p class="eyebrow">Popular searches</p><div class="search-chips">${["Oversized tee", "Linen shirt", "Kurta", "Jeans", "Polo", "Co-ord", "Chinos", "Hoodie"].map(s => `<button type="button" class="chip" data-search="${esc(s)}">${esc(s)}</button>`).join("")}</div></div>
        <div><p class="eyebrow">Trending now</p><div class="search-trending"></div></div>
      </div>
      <div class="search-results-wrap" hidden>
        <div class="search-results-head"><p class="eyebrow search-count"></p><a class="link-arrow search-all" href="shop.html">View all results</a></div>
        <div class="search-results" id="search-results" role="listbox" aria-label="Suggestions"></div>
      </div>
      <div class="search-none" hidden></div>
    </div>
  </div>
  <aside class="drawer cart-drawer" id="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title" tabindex="-1" inert>
    <div class="drawer-head"><h2 class="drawer-title" id="cart-title">Your bag <span class="drawer-count"></span></h2>
      <button type="button" class="icon-btn drawer-close" aria-label="Close bag">${ICON.close}</button></div>
    <div class="cart-ship"></div>
    <div class="drawer-body"><div class="cart-lines"></div><div class="cart-upsell"></div></div>
    <div class="drawer-foot cart-foot"></div>
  </aside>`;
  if (main) main.insertAdjacentHTML("beforebegin", header); else body.insertAdjacentHTML("afterbegin", header);

  const groups = NAV_GROUPS;
  const footer = `
  <section class="trust-row" aria-label="Why shop with us"><div class="container trust-grid">
    <div class="trust-item">${ICON.truck}<div><b>Free shipping</b><span>On orders above ${rupee(STORE.freeShippingAbove)}</span></div></div>
    <div class="trust-item">${ICON.cash}<div><b>Cash on Delivery</b><span>Pay when it arrives</span></div></div>
    <div class="trust-item">${ICON.swap}<div><b>7-day exchange</b><span>Wrong size? Easy swap</span></div></div>
    <div class="trust-item">${ICON.india}<div><b>Made in India</b><span>Honest fabrics, fair prices</span></div></div>
  </div></section>
  <footer class="site-footer">
    <div class="divider-print" aria-hidden="true"></div>
    <div class="container footer-grid">
      <div class="footer-brand">
        <p class="footer-lede">Modern Indian <em>essentials</em> — cut for the way you actually live.</p>
        <form class="wa-join" novalidate>
          <label class="footer-label" for="wa-join-name">Join on WhatsApp for early access to drops &amp; offers</label>
          <div class="wa-join-row"><input id="wa-join-name" name="name" type="text" placeholder="Your first name" autocomplete="given-name" maxlength="40">
          <button type="submit" class="btn btn-wa">${ICON.wa}<span>Join</span></button></div>
          <small>No spam. One message a fortnight, leave anytime.</small>
        </form>
      </div>
      <div class="footer-col"><h3>Shop</h3><a href="shop.html?tag=new">New In</a>${groups.map(g => `<a href="shop.html?group=${encodeURIComponent(g)}">${esc(g)}</a>`).join("")}<a href="shop.html?tag=festive">Festive</a><a href="shop.html?tag=sale">Sale</a></div>
      <div class="footer-col"><h3>Help</h3><a href="contact.html#track">Track order</a><a href="policies.html#exchange">Exchange &amp; returns</a><a href="policies.html#shipping">Shipping</a><a href="policies.html#payment">Payments &amp; COD</a><a href="contact.html">Contact us</a></div>
      <div class="footer-col"><h3>Company</h3><a href="about.html">Our story</a><a href="wishlist.html">Wishlist</a><a href="policies.html#privacy">Privacy</a><a href="policies.html#terms">Terms</a></div>
      <div class="footer-col footer-contact"><h3>Talk to us</h3>
        <a href="${waLink("Hi BHAKSHI!")}" target="_blank" rel="noopener">${ICON.wa}<span>WhatsApp us</span></a>
        <a href="mailto:${esc(STORE.email)}">${ICON.mail}<span>${esc(STORE.email)}</span></a>
        <a href="${esc(STORE.instagram)}" target="_blank" rel="noopener">${ICON.insta}<span>Instagram</span></a>
        <p class="footer-hours">Mon–Sat, 10am–7pm IST</p></div>
    </div>
    <div class="footer-mark" aria-hidden="true">${esc(STORE.name)}</div>
    <div class="container footer-bottom">
      <span>© ${new Date().getFullYear()} ${esc(STORE.name)}. Made in India.</span>
      <span class="footer-pay">We accept <b>UPI</b> · <b>Cash on Delivery</b></span>
    </div>
  </footer>
  <button type="button" class="to-top" aria-label="Back to top">${ICON.up}</button>
  <a class="wa-float" href="${waLink("Hi BHAKSHI! I have a question.")}" target="_blank" rel="noopener" aria-label="Chat with us on WhatsApp">${ICON.wa}<span class="wa-tip">Chat with us</span></a>
  <div class="toast-stack" aria-live="polite"></div>
  <div class="modal" hidden><div class="modal-overlay"></div>
    <div class="modal-panel" role="dialog" aria-modal="true" tabindex="-1">
      <div class="modal-handle" aria-hidden="true"><span></span></div>
      <button type="button" class="icon-btn modal-close" aria-label="Close">${ICON.close}</button>
      <div class="modal-content"></div></div></div>`;
  if (main) main.insertAdjacentHTML("afterend", footer); else body.insertAdjacentHTML("beforeend", footer);
}

/* ---------- Announcement ---------- */
function initAnnouncement() {
  const bar = $(".announce"); if (!bar) return;
  const msgs = $$(".announce-msg", bar); let i = 0, timer;
  const next = () => {
    if (msgs.length < 2 || document.hidden) return;
    const cur = msgs[i]; i = (i + 1) % msgs.length; const nx = msgs[i];
    cur.classList.remove("is-active"); cur.classList.add("is-leaving"); cur.setAttribute("aria-hidden", "true");
    nx.classList.add("is-active"); nx.removeAttribute("aria-hidden");
    setTimeout(() => cur.classList.remove("is-leaving"), 700);
  };
  const start = () => { clearInterval(timer); timer = setInterval(next, 4000); };
  bar.addEventListener("mouseenter", () => clearInterval(timer));
  bar.addEventListener("mouseleave", start);
  start();
  $(".announce-close", bar).addEventListener("click", () => {
    sessionStorage.setItem("bhakshi_announce_closed", "1"); clearInterval(timer);
    bar.style.height = bar.offsetHeight + "px"; bar.offsetHeight; bar.classList.add("is-closing"); bar.style.height = "0px";
    setTimeout(() => bar.remove(), 420);
  });
}

/* ---------- Header: scroll states, mega menu ---------- */
let header;
function initHeader() {
  header = $("#site-header");
  const isHome = document.body.dataset.page === "home";
  const bar = $(".scroll-progress span"), toTop = $(".to-top");
  let lastY = scrollY, ticking = false;
  const update = () => {
    const y = scrollY, dy = y - lastY;
    header.classList.toggle("is-top", isHome && y < 40);
    header.classList.toggle("is-scrolled", y > 8);
    const frozen = Layers.stack.length || header.classList.contains("mega-open") || header.contains(document.activeElement) && document.activeElement !== document.body;
    if (!frozen) {
      if (y > 260 && dy > 5) header.classList.add("is-hidden");
      else if (dy < -5 || y < 120) header.classList.remove("is-hidden");
    }
    const max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    document.body.classList.toggle("show-top", y > innerHeight);
    lastY = y; ticking = false;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener("resize", update, { passive: true });
  update();
  header.addEventListener("focusin", () => header.classList.remove("is-hidden"));
  toTop.addEventListener("click", () => scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" }));

  // Mega menu with hover intent
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

  // Count badges
  updateCounts();
  document.addEventListener("cart:change", e => updateCounts(e.detail && e.detail.action === "add"));
  document.addEventListener("wishlist:change", () => updateCounts());
}
let _flying = 0;
function bump(el) { if (!el) return; el.classList.remove("is-bump"); void el.offsetWidth; el.classList.add("is-bump"); }
function updateCounts(added) {
  const c = Cart.count(), w = Wishlist.count();
  $$(".cart-count").forEach(el => { el.textContent = c; el.dataset.count = c; });
  $$(".wish-count").forEach(el => { el.textContent = w; el.dataset.count = w; });
  const ct = $(".cart-toggle"); if (ct) ct.setAttribute("aria-label", `Open bag, ${c} item${c === 1 ? "" : "s"}`);
  const wl = $(".wish-link"); if (wl) wl.setAttribute("aria-label", `Wishlist, ${w} item${w === 1 ? "" : "s"}`);
  if (added && !_flying) bump($(".cart-toggle"));
}
function updateCartCount() { updateCounts(); }

/* ---------- Mobile menu ---------- */
function openMenu() {
  const m = $("#mobile-menu"); closeDrawers();
  $$(".mm-item", m).forEach((el, i) => el.style.setProperty("--i", i));
  m.inert = false; document.body.classList.add("menu-open");
  $(".menu-toggle").setAttribute("aria-expanded", "true");
  Layers.open(m, closeMenu, $(".mm-close", m));
}
function closeMenu() {
  const m = $("#mobile-menu"); if (!document.body.classList.contains("menu-open")) return;
  document.body.classList.remove("menu-open"); m.inert = true;
  $(".menu-toggle").setAttribute("aria-expanded", "false"); Layers.close(m);
}
function initMobileMenu() {
  $(".menu-toggle").addEventListener("click", openMenu);
  $(".mm-close").addEventListener("click", closeMenu);
  $$(".mm-acc").forEach(b => b.addEventListener("click", () => {
    const open = b.getAttribute("aria-expanded") !== "true";
    $$(".mm-acc").forEach(o => { if (o !== b) o.setAttribute("aria-expanded", "false"); });
    b.setAttribute("aria-expanded", String(open));
  }));
}

/* ---------- Search ---------- */
const _norm = s => String(s || "").toLowerCase().replace(/[-–—]/g, "").normalize("NFD").replace(/[̀-ͯ]/g, "");
function searchProducts(q) {
  const tokens = _norm(q).split(/\s+/).filter(Boolean).map(t => t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t);
  if (!tokens.length) return [];
  const out = [];
  PRODUCTS.forEach(p => {
    const f = { name: _norm(p.name), cat: _norm(catName(p.category) + " " + groupOf(p) + " " + p.shape), color: _norm(p.colorName), fabric: _norm(p.fabric + " " + p.fit), tags: _norm((p.tags || []).join(" ")) };
    let score = 0;
    for (const t of tokens) {
      let s = 0;
      if (f.name.includes(t)) s += (new RegExp("(^|\\s)" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(f.name) ? 6 : 4);
      if (f.cat.includes(t)) s += 3;
      if (f.color.includes(t)) s += 3;
      if (f.tags.includes(t)) s += 2;
      if (f.fabric.includes(t)) s += 1;
      if (!s) return;
      score += s;
    }
    if (p.stock > 0) score += .5;
    if (p.tags.includes("bestseller")) score += .3;
    out.push({ p, score });
  });
  return out.sort((a, b) => b.score - a.score).map(r => r.p);
}
function highlight(text, q) {
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
function openSearch(prefill) {
  const o = $("#search-overlay"), input = $("input", o); closeDrawers();
  const tr = $(".search-trending", o);
  if (!tr.dataset.ready) {
    tr.innerHTML = uniqueFamilies(PRODUCTS.filter(p => p.stock > 0 && p.tags.includes("bestseller")), 4).map(p =>
      `<a class="trend-tile" href="${productUrl(p)}"><span class="trend-media">${productImage(p)}</span><span class="trend-name">${esc(titleOf(p))}</span><span class="trend-price">${rupee(p.price)}</span></a>`).join("");
    tr.dataset.ready = "1";
  }
  o.inert = false; document.body.classList.add("search-open");
  if (typeof prefill === "string") { input.value = prefill; runSearch(); }
  Layers.open(o, closeSearch, input);
}
function closeSearch() {
  const o = $("#search-overlay"); if (!document.body.classList.contains("search-open")) return;
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
    none.innerHTML = `<p class="search-none-title">No matches for “${esc(q)}”</p><p>Try a fabric, colour or fit — like <button type="button" class="chip" data-search="linen">linen</button> <button type="button" class="chip" data-search="black">black</button> <button type="button" class="chip" data-search="oversized">oversized</button></p>`;
    return;
  }
  none.hidden = true; wrap.hidden = false; input.setAttribute("aria-expanded", "true");
  $(".search-count", o).textContent = `${res.length} result${res.length === 1 ? "" : "s"}`;
  $(".search-all", o).href = `shop.html?q=${encodeURIComponent(q)}`;
  list.innerHTML = res.slice(0, 8).map((p, i) => `<a class="sr-item" id="sr-${i}" role="option" aria-selected="false" href="${productUrl(p)}">
      <span class="sr-thumb">${productImage(p)}</span>
      <span class="sr-text"><span class="sr-name">${highlight(p.name, q)}</span><span class="sr-meta">${highlight(catName(p.category), q)} · ${highlight(p.colorName || "", q)}${p.stock <= 0 ? " · Sold out" : ""}</span></span>
      <span class="sr-price">${rupee(p.price)}${discount(p) ? `<s>${rupee(p.mrp)}</s>` : ""}</span></a>`).join("");
}
function initSearch() {
  const o = $("#search-overlay"), input = $("input", o), form = $("form", o);
  $$(".search-toggle").forEach(b => b.addEventListener("click", () => openSearch()));
  $(".search-close", o).addEventListener("click", closeSearch);
  let t; input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(runSearch, 60); });
  $(".search-clear", o).addEventListener("click", () => { input.value = ""; runSearch(); input.focus(); });
  o.addEventListener("click", e => { const c = e.target.closest("[data-search]"); if (c) { input.value = c.dataset.search; runSearch(); input.focus(); } });
  input.addEventListener("keydown", e => {
    const items = $$(".sr-item", o);
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && items.length && !$(".search-results-wrap", o).hidden) {
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
  const d = $("#cart-drawer"); if (document.body.classList.contains("cart-open")) return;
  closeDrawers(); renderCart();
  d.inert = false; document.body.classList.add("cart-open");
  Layers.open(d, closeCart, $(".drawer-close", d));
}
function closeCart() {
  const d = $("#cart-drawer"); if (!document.body.classList.contains("cart-open")) return;
  document.body.classList.remove("cart-open"); d.inert = true; Layers.close(d);
}
function closeDrawers() { closeCart(); closeMenu(); closeSearch(); }

function upsellFor(lines) {
  const inCart = new Set(lines.map(l => l.id)), fams = new Set(lines.map(l => l.p.family));
  const groups = new Set(lines.map(l => groupOf(l.p)));
  const want = groups.has("Topwear") && !groups.has("Bottoms") ? "Bottoms" : groups.has("Bottoms") && !groups.has("Topwear") ? "Topwear" : null;
  const pool = PRODUCTS.filter(p => p.stock > 0 && !inCart.has(p.id) && !fams.has(p.family));
  const rank = p => (want && groupOf(p) === want ? 4 : 0) + (p.tags.includes("bestseller") ? 2 : 0) + (p.price < 1000 ? 1 : 0);
  const pick = [], fam = new Set();
  pool.sort((a, b) => rank(b) - rank(a)).forEach(p => { if (pick.length < 3 && !fam.has(p.family)) { pick.push(p); fam.add(p.family); } });
  return pick;
}
function renderCart() {
  const d = $("#cart-drawer"); if (!d) return;
  const lines = Cart.lines(), sub = Cart.subtotal(), count = Cart.count(), free = STORE.freeShippingAbove;
  $(".drawer-count", d).textContent = count ? `(${count})` : "";
  // Free-shipping progress (persistent elements so the bar animates)
  const ship = $(".cart-ship", d);
  if (!lines.length) { ship.innerHTML = ""; ship.hidden = true; _shipUnlocked = null; }
  else {
    ship.hidden = false;
    if (!$(".ship-bar", ship)) ship.innerHTML = `<p class="ship-msg"></p><div class="ship-bar"><span></span></div><div class="ship-confetti" aria-hidden="true">${Array.from({ length: 14 }, (_, i) => `<i style="--a:${i * 360 / 14}deg;--d:${30 + (i % 3) * 14}px;--c:${["var(--saffron)", "var(--indigo)", "var(--success)", "var(--sand)"][i % 4]}"></i>`).join("")}</div>`;
    const left = free - sub, unlocked = left <= 0, pct = Math.min(100, sub / free * 100);
    $(".ship-msg", ship).innerHTML = unlocked ? `${ICON.check}<span>You've unlocked <b>free shipping</b></span>` : `<span>You're <b>${rupee(left)}</b> away from <b>free shipping</b></span>`;
    requestAnimationFrame(() => { const s = $(".ship-bar span", ship); if (s) s.style.width = pct + "%"; });
    ship.classList.toggle("is-unlocked", unlocked);
    if (unlocked && _shipUnlocked === false && document.body.classList.contains("cart-open")) { ship.classList.remove("is-celebrate"); void ship.offsetWidth; ship.classList.add("is-celebrate"); }
    _shipUnlocked = unlocked;
  }
  // Lines
  const list = $(".cart-lines", d);
  if (!lines.length) {
    list.innerHTML = `<div class="cart-empty"><div class="cart-empty-icon">${ICON.bag}</div>
      <p class="cart-empty-title">Your bag is <em>empty</em></p><p class="cart-empty-text">Good things are waiting. Start with our most-loved pieces.</p>
      <a class="btn btn-block" href="shop.html?tag=bestseller">Shop bestsellers</a></div>`;
  } else {
    list.innerHTML = lines.map(l => {
      const max = Cart.limit(l.id);
      return `<div class="cart-line" data-index="${l.index}">
      <a class="cart-thumb" href="${productUrl(l.p)}" tabindex="-1" aria-hidden="true">${productImage(l.p)}</a>
      <div class="cart-info">
        <a class="cart-name" href="${productUrl(l.p)}">${esc(titleOf(l.p))}</a>
        <span class="cart-variant">${esc(l.p.colorName || "")} · Size ${esc(l.size)}</span>
        <div class="cart-row">
          <div class="qty qty-sm" role="group" aria-label="Quantity for ${esc(l.p.name)}">
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
  // Upsell / bestsellers
  const up = $(".cart-upsell", d);
  const ups = lines.length ? upsellFor(lines) : uniqueFamilies(PRODUCTS.filter(p => p.stock > 0 && p.tags.includes("bestseller")), 3);
  up.innerHTML = ups.length ? `<p class="eyebrow">${lines.length ? "Pairs well with" : "Most loved"}</p>
    <div class="upsell-list">${ups.map(p => miniCard(p, `<div class="mini-sizes" role="group" aria-label="Quick add ${esc(p.name)}">${p.sizes.map(s => `<button type="button" data-add="${esc(p.id)}" data-size="${esc(s)}" aria-label="Add ${esc(p.name)} size ${esc(s)}">${esc(s)}</button>`).join("")}</div>`)).join("")}</div>` : "";
  // Footer
  const save = lines.reduce((s, l) => s + Math.max(0, l.p.mrp - l.p.price) * l.qty, 0);
  const waMsg = lines.length ? `Hi BHAKSHI, I need help with my bag:\n${lines.map(l => `• ${l.p.name} (Size ${l.size}) × ${l.qty}`).join("\n")}` : "Hi BHAKSHI, I need some help.";
  $(".cart-foot", d).innerHTML = lines.length ? `
    <div class="cart-total"><span>Subtotal</span><b>${rupee(sub)}</b></div>
    ${save > 0 ? `<p class="cart-save">You're saving ${rupee(save)} on MRP</p>` : ""}
    <p class="cart-note">Shipping &amp; coupons calculated at checkout. UPI or Cash on Delivery.</p>
    <a class="btn btn-block btn-lg" href="checkout.html" data-magnetic>Checkout <span aria-hidden="true">·</span> ${rupee(sub)}</a>
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
      m.hidden = false; void m.offsetWidth; m.classList.add("is-open");
      this.isOpen = true; Layers.open(m, () => this.close(), panel);
      document.body.classList.add("modal-open");
      setTimeout(() => { const f = focusables(content)[0] || panel; if (document.activeElement !== panel && m.contains(document.activeElement)) return; f.focus({ preventScroll: true }); }, 80);
    }
    this._onClose = opts.onClose || null;
    content.scrollTop = 0; panel.scrollTop = 0;
    _emit("modal:open", { content, label: opts.label });
    refreshReveal();
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
      frames.push({ transform: `translate(${x - sx}px, ${y - sy}px) scale(${s}) rotate(${t * -8}deg)`, opacity: t > .85 ? 1 - (t - .85) / .15 * .7 : 1, borderRadius: `${12 + t * 40}%` });
    }
    const anim = ghost.animate(frames, { duration: 820, easing: "cubic-bezier(.55,.05,.35,1)", fill: "forwards" });
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
      toast(added ? `Saved to wishlist` : `Removed from wishlist`, added
        ? { type: "success", action: { label: "View", onClick: () => navigate("wishlist.html") } }
        : { type: "info", action: { label: "Undo", onClick: () => Wishlist.add(id) } });
      return;
    }
    const add = e.target.closest("[data-add][data-size]");
    if (add) {
      e.preventDefault();
      if (add.disabled || add.getAttribute("aria-disabled") === "true") return;
      const p = getProduct(add.dataset.add); if (!p || p.stock <= 0) return;
      const size = add.dataset.size, qty = +add.dataset.qty || 1;
      const inDrawer = add.closest("#cart-drawer");
      if (!inDrawer) flyToCart(add.closest(".card") || add.closest("[data-fly]") || add);
      Cart.add(p.id, size, qty);
      add.classList.add("is-added"); setTimeout(() => add.classList.remove("is-added"), 900);
      toast(`Added ${titleOf(p)} · ${size}`, { type: "success", action: inDrawer ? null : { label: "View bag", onClick: openCart } });
      return;
    }
    if (e.target.closest("[data-open-cart]")) { e.preventDefault(); openCart(); return; }
    if (e.target.closest("[data-open-search]")) { e.preventDefault(); openSearch(); return; }
    const sn = e.target.closest(".scroller-prev, .scroller-next");
    if (sn) {
      const sc = sn.getAttribute("aria-controls") ? document.getElementById(sn.getAttribute("aria-controls")) : findScroller(sn);
      if (sc) sc.scrollBy({ left: (sn.classList.contains("scroller-prev") ? -1 : 1) * sc.clientWidth * .85, behavior: reducedMotion() ? "auto" : "smooth" });
    }
  });
  document.addEventListener("wishlist:change", e => syncHearts(e.detail && e.detail.id));
  // Footer WhatsApp join
  const join = $(".wa-join");
  if (join) join.addEventListener("submit", e => {
    e.preventDefault();
    const name = join.name.value.trim().slice(0, 40);
    window.open(waLink(`Hi ${STORE.name}! I'd like early access to new drops and offers.${name ? " My name is " + name + "." : ""}`), "_blank", "noopener");
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

/* ---------- Reveal on scroll ---------- */
let _io;
function refreshReveal(root = document) {
  const els = $$("[data-reveal], .reveal", root.nodeType === 1 || root === document ? root : document);
  if (root.matches && root.matches("[data-reveal]")) els.push(root);
  if (!("IntersectionObserver" in window) || reducedMotion()) { els.forEach(el => el.classList.add("is-in", "in")); return; }
  if (!_io) _io = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add("is-in", "in"); _io.unobserve(en.target); }
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
    m.style.translate = `${(dx * 12).toFixed(1)}px ${(dy * 8).toFixed(1)}px`;
  }, { passive: true });
  document.addEventListener("pointerleave", () => cur && reset(cur));
}

/* ---------- Custom cursor ---------- */
function initCursor() {
  if (!finePointer() || reducedMotion()) return;
  const root = document.createElement("div");
  root.className = "cursor is-hidden"; root.setAttribute("aria-hidden", "true");
  root.innerHTML = `<div class="cursor-ring"><div class="cursor-ring-inner"><span class="cursor-label"></span></div></div><div class="cursor-dot"><div class="cursor-dot-inner"></div></div>`;
  document.body.appendChild(root);
  const ring = $(".cursor-ring", root), dot = $(".cursor-dot", root), label = $(".cursor-label", root);
  let x = -100, y = -100, rx = x, ry = y, raf = 0, shown = false, lastT = null;
  const loop = () => {
    rx += (x - rx) * .2; ry += (y - ry) * .2;
    ring.style.transform = `translate3d(${rx.toFixed(2)}px,${ry.toFixed(2)}px,0)`;
    raf = Math.abs(x - rx) + Math.abs(y - ry) > .15 ? requestAnimationFrame(loop) : 0;
  };
  const state = t => {
    if (t === lastT || !t || !t.closest) return; lastT = t;
    const field = t.closest("input, textarea, select, [contenteditable=true], iframe");
    const view = !field && t.closest(".card-media, [data-cursor]");
    const link = !field && !view && t.closest("a, button, [role=button], label, summary, .chip, [data-magnetic]");
    root.classList.toggle("is-field", !!field);
    root.classList.toggle("is-view", !!view);
    root.classList.toggle("is-link", !!link);
    label.textContent = view ? (view.dataset.cursor || "View") : "";
  };
  addEventListener("pointermove", e => {
    if (e.pointerType && e.pointerType !== "mouse") return;
    x = e.clientX; y = e.clientY;
    dot.style.transform = `translate3d(${x}px,${y}px,0)`;
    if (!shown) { shown = true; rx = x; ry = y; document.documentElement.classList.add("has-cursor"); }
    root.classList.remove("is-hidden");
    state(e.target);
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
  document.documentElement.addEventListener("mouseleave", () => root.classList.add("is-hidden"));
  addEventListener("pointerdown", () => root.classList.add("is-down"));
  addEventListener("pointerup", () => root.classList.remove("is-down"));
  document.addEventListener("scroll", () => { lastT = null; }, { passive: true, capture: true });
}

/* ---------- Page transitions ---------- */
function navigate(url) {
  if (reducedMotion()) { location.href = url; return; }
  document.body.classList.add("is-leaving");
  setTimeout(() => { location.href = url; }, 200);
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
initMagnetic();
initCursor();
initTransitions();
renderCart();
refreshReveal();
document.addEventListener("DOMContentLoaded", () => {
  refreshReveal(); syncHearts();
  // Auto-pick up content injected later (page scripts should still call refreshReveal()).
  const main = $("main");
  if (main && "MutationObserver" in window) {
    let pending = false;
    new MutationObserver(() => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; refreshReveal(); }); }).observe(main, { childList: true, subtree: true });
  }
});
