/* BHAKSHI — features (v3 "minimal craft"): Quick View, Fit Finder, Wishlist page.
   Globals exposed: QuickView.open(id), FitFinder.open({ productId, onPick, onCancel }) (+ "fitfinder:pick" event).
   Delegated handlers: [data-quick] (quick view) and [data-fitfinder] (size quiz, optional data-product).
   Depends on app.js (Modal, Cart, Wishlist, Recent, productCard, productImage, variantsOf, waLink, stockInfo,
   dropState, isBuyable, hasBottoms, rupee, techLabel, toast, flyToCart) — every call is guarded so a missing
   helper never crashes. */

(() => {
  "use strict";

  /* ---------- defensive helpers (app.js provides the real ones) ---------- */
  // app.js globals are top-level const/function bindings: reach them by name, guarded with typeof
  const API = () => ({
    esc: typeof esc === "function" ? esc : null,
    rupee: typeof rupee === "function" ? rupee : null,
    techLabel: typeof techLabel === "function" ? techLabel : null,
    getProduct: typeof getProduct === "function" ? getProduct : null,
    discount: typeof discount === "function" ? discount : null,
    variantsOf: typeof variantsOf === "function" ? variantsOf : null,
    productImage: typeof productImage === "function" ? productImage : null,
    productCard: typeof productCard === "function" ? productCard : null,
    waLink: typeof waLink === "function" ? waLink : null,
    stockInfo: typeof stockInfo === "function" ? stockInfo : null,
    dropState: typeof dropState === "function" ? dropState : null,
    isBuyable: typeof isBuyable === "function" ? isBuyable : null,
    hasBottoms: typeof hasBottoms === "function" ? hasBottoms : null,
    toast: typeof toast === "function" ? toast : null,
    flyToCart: typeof flyToCart === "function" ? flyToCart : null,
    openCart: typeof openCart === "function" ? openCart : null,
    refreshReveal: typeof refreshReveal === "function" ? refreshReveal : null
  });
  const call = (name, ...a) => { const f = API()[name]; return f ? f(...a) : undefined; };
  const modal = () => (typeof Modal !== "undefined" && Modal && typeof Modal.open === "function" ? Modal : null);
  const wishStore = () => (typeof Wishlist !== "undefined" ? Wishlist : null);
  const cartStore = () => (typeof Cart !== "undefined" ? Cart : null);
  const recentStore = () => (typeof Recent !== "undefined" ? Recent : null);

  const E = s => call("esc", s) ?? String(s ?? "").replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  const money = n => call("rupee", n) ?? "Rs. " + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const find = id => call("getProduct", id) ?? (id && typeof id === "object" ? id : PRODUCTS.find(p => p.id === id));
  const off = p => call("discount", p) ?? (p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0);
  const techs = p => (p.techniques || []).filter(Boolean);
  const tech = p => { const t = call("techLabel", p); if (typeof t === "string") return t; const a = techs(p); return a.length ? a[0] + (a.length > 1 ? ` +${a.length - 1}` : "") : ""; };
  const variants = p => call("variantsOf", p) ?? (p.family ? PRODUCTS.filter(x => x.family === p.family) : [p]);
  const pic = (p, i = 0, view = "front") => call("productImage", p, i, view) ?? (typeof Art !== "undefined" ? Art.garment(p, { view }) : "");
  const say = (msg, type) => { call("toast", msg, { type }); };
  const wa = text => call("waLink", text) ?? `https://wa.me/${encodeURIComponent((typeof STORE !== "undefined" && STORE.whatsapp) || "")}?text=${encodeURIComponent(text)}`;
  const reduced = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = () => window.matchMedia && matchMedia("(max-width: 899.98px)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad = n => String(n).padStart(2, "0");
  const hasModal = () => !!modal();
  const closeModal = () => { const m = modal(); if (m) m.close(); };
  const hostOf = (host, sel) => (host && host.matches && host.matches(sel) ? host : host && host.querySelector && host.querySelector(sel))
    || [...document.querySelectorAll(sel)].pop() || null;
  const wished = id => { const w = wishStore(); return !!(w && w.has(id)); };
  const brand = () => (typeof STORE !== "undefined" && STORE.name) || "BHAKSHI";
  const dropNo = () => (typeof STORE !== "undefined" && STORE.drop && STORE.drop.number) || "01";
  const dropName = () => (typeof STORE !== "undefined" && STORE.drop && STORE.drop.name) || "";
  const LOW = 10;   // "Only 9 left" threshold (quiet text, no meters)

  function stockOf(p) {
    const left = Math.max(0, Number(p.stock) || 0);
    const s = call("stockInfo", p) || {};
    return { left, low: left > 0 && left <= LOW, soldOut: s.soldOut ?? left <= 0 };
  }
  function drop() {
    const d = call("dropState");
    if (d && typeof d.live === "boolean") return { live: d.live, launch: d.launch, msLeft: d.msLeft || 0 };
    const launch = typeof STORE !== "undefined" && STORE.drop && STORE.drop.launch;
    const msLeft = launch ? Date.parse(launch) - Date.now() : 0;
    return { live: !launch || !(msLeft > 0), launch: launch || null, msLeft: Math.max(0, msLeft || 0) };
  }
  const buyable = p => { const b = call("isBuyable", p); return typeof b === "boolean" ? b : drop().live && p.stock > 0; };
  const bottoms = () => {
    const b = call("hasBottoms");
    if (typeof b === "boolean") return b;
    return PRODUCTS.some(p => ["pants", "shorts"].includes(p.shape) || (CATEGORIES.find(c => c.id === p.category) || {}).group === "Bottoms");
  };
  function fmtLeft(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    return `${pad(d)}d ${pad(h)}h ${pad(m)}m ${pad(x)}s`;
  }
  /* ticks every [data-cd] inside root until root leaves the DOM */
  function tick(root) {
    const els = () => root.querySelectorAll("[data-cd]");
    if (!els().length) return;
    const t = setInterval(() => {
      if (!root.isConnected) return clearInterval(t);
      const d = drop();
      if (d.live) { clearInterval(t); root.dispatchEvent(new CustomEvent("drop:live")); return; }
      els().forEach(el => { el.textContent = fmtLeft(d.msLeft); });
    }, 1000);
  }

  const ICON = {
    heart: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 20s-7.2-4.4-8.9-9C1.9 7.7 4 4.5 7.3 4.5c1.9 0 3.5 1 4.7 2.7 1.2-1.7 2.8-2.7 4.7-2.7 3.3 0 5.4 3.2 4.2 6.5-1.7 4.6-8.9 9-8.9 9z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>`,
    back: `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M20 12H5M11 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>`,
    share: `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5M5 12v8h14v-8" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>`,
    check: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`
  };

  /* =====================================================================
     QUICK VIEW
     ===================================================================== */
  const QuickView = (() => {
    let st = null;     // { id, view, size, qty }
    let root = null;   // .qv element inside the modal

    /* views available: photos use what exists; drawn art has front / back / detail */
    const VIEWS = { front: "Front", back: "Back", detail: "Detail" };
    function facesOf(p) {
      const photos = (p.images || []).filter(Boolean);
      if (photos.length) return photos.map((_, i) => ({ key: "v" + i, label: i === 0 ? "Front" : i === 1 ? "Back" : `View ${i + 1}`, html: pic(p, i) }));
      return ["front", "back", "detail"].map(k => ({ key: k, label: VIEWS[k], html: pic(p, 0, k) }));
    }

    function buyRow(p, s, d) {
      const wish = `<button type="button" class="qv-wish" data-wish="${E(p.id)}" aria-pressed="${wished(p.id)}" aria-label="${wished(p.id) ? "Remove from wishlist" : "Add to wishlist"}">${ICON.heart}</button>`;
      if (!d.live) {
        return `<div class="qv-buy qv-buy-locked">
          <div class="qv-buy-row">
            <button type="button" class="btn btn-block qv-add" disabled aria-disabled="true">Available in&nbsp;<span class="qv-cd" data-cd>${fmtLeft(d.msLeft)}</span></button>
            ${wish}
          </div>
          <a class="btn btn-outline btn-block qv-notify" href="${E(wa(`Hi ${brand()}! Please let me know when Drop ${dropNo()} goes live. I'd like the ${p.name}.`))}" target="_blank" rel="noopener">Notify me</a>
        </div>`;
      }
      if (s.soldOut || !buyable(p)) {
        return `<div class="qv-buy qv-buy-out">
          <div class="qv-buy-row">
            <a class="btn btn-block qv-add" href="${E(wa(`Hi ${brand()}! Please tell me if the ${p.name} (${p.colorName || ""}) comes back in stock.`))}" target="_blank" rel="noopener">Notify me</a>
            ${wish}
          </div>
        </div>`;
      }
      const max = Math.min(10, s.left);
      return `<div class="qv-buy">
        <div class="qv-buy-row">
          <div class="qty qv-qty" role="group" aria-label="Quantity">
            <button type="button" data-qv-qty="-1" aria-label="Decrease quantity"${st.qty <= 1 ? " disabled" : ""}>−</button>
            <output aria-live="polite">${st.qty}</output>
            <button type="button" data-qv-qty="1" aria-label="Increase quantity"${st.qty >= max ? " disabled" : ""}>+</button>
          </div>
          <button type="button" class="btn qv-add" data-qv-add>Add to cart</button>
          ${wish}
        </div>
      </div>`;
    }

    function markup(p) {
      const s = stockOf(p), d = drop(), faces = facesOf(p), vars = variants(p), pct = off(p);
      if (!faces.some(f => f.key === st.view)) st.view = faces[0].key;
      const cur = faces.findIndex(f => f.key === st.view);
      const out = s.soldOut;
      const tline = techs(p).length ? techs(p).join(" · ") : tech(p);
      const status = !d.live ? `Drop ${E(dropNo())} — coming soon` : out ? "Sold out" : s.low ? `Only ${s.left} left` : "";

      return `
      <div class="qv-inner">
        <div class="qv-media">
          ${faces.length > 1 ? `<div class="qv-thumbs" role="group" aria-label="Choose view">
            ${faces.map(f => `<button type="button" class="qv-thumb" data-qv-view="${f.key}" aria-pressed="${f.key === st.view}" aria-label="${E(f.label)} view">${f.html}</button>`).join("")}
          </div>` : ""}
          <div class="qv-stage" role="group" aria-roledescription="gallery" aria-label="${E(p.name)} images">
            ${faces.map(f => `<figure class="qv-face${f.key === st.view ? " is-on" : ""}" data-face="${f.key}" aria-hidden="${f.key !== st.view}">${f.html}</figure>`).join("")}
          </div>
          ${faces.length > 1 ? `<div class="qv-dots" aria-hidden="true">${faces.map(f => `<i class="${f.key === st.view ? "is-on" : ""}" data-dot="${f.key}"></i>`).join("")}</div>` : ""}
          <span class="visually-hidden qv-live" aria-live="polite">${E(faces[cur].label)} view</span>
        </div>

        <div class="qv-info">
          <h2 class="qv-title" id="qv-title">${E(p.name)}</h2>
          <p class="qv-price">
            <span class="qv-now">${money(p.price)}</span>
            ${pct > 0 ? `<s class="qv-mrp"><span class="visually-hidden">Was </span>${money(p.mrp)}</s>` : ""}
          </p>
          <p class="qv-tax">Tax included. Shipping calculated at checkout.</p>
          ${tline ? `<p class="qv-tech">${E(tline)}</p>` : ""}

          <div class="qv-block">
            <p class="qv-label">Colour <span>${E(p.colorName || "")}</span></p>
            ${vars.length > 1 ? `<div class="qv-swatches" role="radiogroup" aria-label="Colour">
              ${vars.map(v => `<button type="button" class="qv-swatch${v.id === p.id ? " active" : ""}" role="radio" aria-checked="${v.id === p.id}"
                 data-qv-variant="${E(v.id)}" style="--sw:${E(v.color)}" aria-label="${E(v.colorName || v.name)}${v.stock <= 0 ? " (sold out)" : ""}" title="${E(v.colorName || v.name)}"><span></span></button>`).join("")}
            </div>` : ""}
          </div>

          <div class="qv-block">
            <div class="qv-label-row">
              <p class="qv-label qv-size-label">Size${st.size ? ` <span>${E(st.size)}</span>` : ""}</p>
              <button type="button" class="qv-fitlink" data-qv-fit>Find my size</button>
            </div>
            <div class="qv-sizes" role="radiogroup" aria-label="Size">
              ${p.sizes.map(sz => out
                ? `<button type="button" class="qv-size" disabled aria-disabled="true" title="Sold out">${E(sz)}</button>`
                : `<button type="button" class="qv-size${st.size === sz ? " active" : ""}" role="radio" aria-checked="${st.size === sz}" data-qv-size="${E(sz)}">${E(sz)}</button>`).join("")}
            </div>
            ${/oversize/i.test(p.fit || "") ? `<p class="qv-fitnote">Oversized fit. Take your usual size for the intended drape, or one down for a regular fit.</p>` : ""}
            <p class="qv-msg" role="alert"></p>
          </div>

          ${status ? `<p class="qv-status${out ? " is-out" : ""}">${status}</p>` : ""}
          ${buyRow(p, s, d)}

          ${p.desc ? `<p class="qv-desc">${E(p.desc)}</p>` : ""}
          <a class="qv-more link-underline" href="product.html?id=${encodeURIComponent(p.id)}">View full details</a>
        </div>
      </div>`;
    }

    function paint() {
      const p = find(st.id);
      root.innerHTML = markup(p);
      root.dataset.id = p.id;
      tick(root);
    }

    const keys = () => [...root.querySelectorAll(".qv-face")].map(f => f.dataset.face);
    function setView(v) {
      if (!keys().includes(v)) return;
      st.view = v;
      root.querySelectorAll(".qv-face").forEach(f => { const on = f.dataset.face === v; f.classList.toggle("is-on", on); f.setAttribute("aria-hidden", !on); });
      root.querySelectorAll("[data-qv-view]").forEach(b => b.setAttribute("aria-pressed", b.dataset.qvView === v));
      root.querySelectorAll("[data-dot]").forEach(i => i.classList.toggle("is-on", i.dataset.dot === v));
      const live = root.querySelector(".qv-live"), th = root.querySelector(`[data-qv-view="${v}"]`);
      if (live && th) live.textContent = th.getAttribute("aria-label");
    }
    function stepView(dir) {
      const list = keys();
      if (list.length < 2) return;
      setView(list[(list.indexOf(st.view) + dir + list.length) % list.length]);
    }

    function swapVariant(id) {
      if (id === st.id) return;
      const next = find(id);
      if (!next) return;
      st.id = id;
      if (st.size && !next.sizes.includes(st.size)) st.size = null;
      if (next.stock > 0) st.qty = clamp(st.qty, 1, Math.min(10, next.stock));
      if (reduced()) { paint(); return; }
      root.classList.add("is-swapping");
      setTimeout(() => { paint(); requestAnimationFrame(() => root.classList.remove("is-swapping")); }, 160);
    }

    function pickSize(size) {
      st.size = size;
      root.querySelectorAll("[data-qv-size]").forEach(b => {
        const on = b.dataset.qvSize === size;
        b.classList.toggle("active", on);
        b.setAttribute("aria-checked", on);
      });
      const lbl = root.querySelector(".qv-size-label");
      if (lbl) lbl.innerHTML = `Size <span>${E(size)}</span>`;
      const msg = root.querySelector(".qv-msg");
      if (msg) { msg.textContent = ""; msg.classList.remove("show"); }
    }

    function setQty(dq) {
      const p = find(st.id), max = Math.min(10, Math.max(1, p.stock));
      st.qty = clamp(st.qty + dq, 1, max);
      const box = root.querySelector(".qv-qty");
      if (!box) return;
      box.querySelector("output").textContent = st.qty;
      box.querySelector('[data-qv-qty="-1"]').disabled = st.qty <= 1;
      box.querySelector('[data-qv-qty="1"]').disabled = st.qty >= max;
    }

    function add(btn) {
      const p = find(st.id);
      if (!st.size) {
        const sizes = root.querySelector(".qv-sizes");
        const msg = root.querySelector(".qv-msg");
        msg.textContent = "Please select a size.";
        msg.classList.add("show");
        const first = sizes.querySelector("[data-qv-size]");
        if (first) first.focus({ preventScroll: true });
        sizes.scrollIntoView({ block: "center", behavior: reduced() ? "auto" : "smooth" });
        return;
      }
      const cart = cartStore();
      if (!cart || !buyable(p)) { say("This piece can't be added right now.", "error"); return; }
      const ok = cart.add(p.id, st.size, st.qty);
      if (ok === false) return;               // Cart.add already explained why (toast)
      const src = root.querySelector(".qv-face.is-on") || btn;
      try { call("flyToCart", src); } catch (e) { /* non-fatal */ }

      const buy = root.querySelector(".qv-buy");
      const sub = cart.subtotal ? cart.subtotal() : 0;
      const left = ((typeof STORE !== "undefined" && STORE.freeShippingAbove) || 0) - sub;
      buy.outerHTML = `
        <div class="qv-added" role="status">
          <p class="qv-added-title">${ICON.check}<span>Added to cart</span></p>
          <p class="qv-added-meta">Size ${E(st.size)} · Qty ${st.qty} · ${money(p.price * st.qty)}</p>
          <p class="qv-added-ship">${left > 0 ? `${money(left)} away from free shipping` : "Your order ships free"}</p>
          <div class="qv-added-actions">
            <button type="button" class="btn btn-block" data-qv-viewbag>View cart</button>
            <button type="button" class="btn btn-outline btn-block" data-qv-close>Continue shopping</button>
          </div>
        </div>`;
      const vb = root.querySelector("[data-qv-viewbag]");
      if (vb) vb.focus({ preventScroll: true });
      const box = root.querySelector(".qv-added");
      if (box && mobile()) box.scrollIntoView({ block: "nearest", behavior: reduced() ? "auto" : "smooth" });
    }

    function bind() {
      root.addEventListener("click", e => {
        const t = e.target.closest("button, a");
        if (!t || !root.contains(t)) return;
        if (t.dataset.qvView) return setView(t.dataset.qvView);
        if (t.dataset.qvVariant) return swapVariant(t.dataset.qvVariant);
        if (t.dataset.qvSize) return pickSize(t.dataset.qvSize);
        if (t.dataset.qvQty) return setQty(+t.dataset.qvQty);
        if (t.hasAttribute("data-qv-add")) return add(t);
        if (t.hasAttribute("data-qv-close")) return closeModal();
        if (t.hasAttribute("data-qv-viewbag")) {
          closeModal();
          setTimeout(() => call("openCart"), 60);
          return;
        }
        if (t.hasAttribute("data-qv-fit")) {
          const id = st.id, keep = { ...st };
          FitFinder.open({
            productId: id,
            onPick: size => open(id, { size, qty: keep.qty, view: keep.view }),
            onCancel: () => open(id, { size: keep.size, qty: keep.qty, view: keep.view })
          });
        }
      });
      root.addEventListener("keydown", e => {
        if (!e.target.closest(".qv-stage, .qv-thumbs")) return;
        if (e.key === "ArrowRight") { e.preventDefault(); stepView(1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); stepView(-1); }
      });
      root.addEventListener("drop:live", () => paint());
      let x0 = null, y0 = null;
      root.addEventListener("touchstart", e => {
        if (!e.target.closest(".qv-stage")) return;
        x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
      }, { passive: true });
      root.addEventListener("touchend", e => {
        if (x0 === null) return;
        const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) stepView(dx < 0 ? 1 : -1);
        x0 = y0 = null;
      }, { passive: true });
    }

    function open(id, opts = {}) {
      const p = find(id);
      if (!p) { say("That piece isn't available any more.", "error"); return null; }
      if (!hasModal()) { location.href = `product.html?id=${encodeURIComponent(p.id)}`; return null; }
      st = { id: p.id, view: opts.view || "front", size: opts.size && p.sizes.includes(opts.size) ? opts.size : null, qty: opts.qty || 1 };
      const host = modal().open(`<div class="qv" aria-labelledby="qv-title"></div>`, { size: mobile() ? "sheet" : "l", label: p.name });
      root = hostOf(host, ".qv");
      if (!root) return null;
      paint();
      bind();
      try { const r = recentStore(); if (r) r.add(p.id); } catch (e) { /* non-fatal */ }
      return root;
    }

    return { open };
  })();

  /* =====================================================================
     FIT FINDER
     ---------------------------------------------------------------------
     Base ("true") size from build, Indian menswear, garment ease included:
       BMI   = kg / m²
       chest = 19.5 + 0.86·BMI + 0.045·(cm − 170)   (inches)
       True top size by chest: <38 S · 38–40 M · 40–42 L · 42–44 XL · ≥44 XXL
     Preference scale (how much room you like): slim < regular < relaxed < oversized.
       Oversized-cut garment (Drop 01 tees — the room is already in the pattern):
         oversized → true size · relaxed → true size, or one down when you sit in the
         lower half of the band · regular/slim → one size down.
       Regular-cut garment (future shirts etc.): chest shifts slim −0.8" relaxed +1.2",
         oversized → one size up.
     Shirt collar: S 38 · M 40 · L 42 · XL 44 · XXL 46.
     Waist = 10 + 0.95·BMI + 0.06·(cm − 170) → nearest even 28–40 (only shown if the store sells bottoms).
     Sanity (oversized, as intended): 165/55 → S · 172/70 → M · 180/85 → XL · 178/95 → XXL.
     ===================================================================== */
  const FitFinder = (() => {
    const KEY = "bhakshi_fit";
    const TOPS = ["S", "M", "L", "XL", "XXL"];
    const COLLAR = { S: "38", M: "40", L: "42", XL: "44", XXL: "46" };
    const FITS_OS = [
      { id: "oversized", name: "Oversized", sub: "As designed", note: "Boxy body, dropped shoulders" },
      { id: "relaxed", name: "Relaxed", sub: "A little less room", note: "Easy, with less drape" },
      { id: "regular", name: "Regular", sub: "Size down", note: "Closer to a classic tee" }
    ];
    const FITS_CLASSIC = [
      { id: "slim", name: "Slim", sub: "Close", note: "Close to the body" },
      { id: "regular", name: "Regular", sub: "Easy", note: "Easy through chest and waist" },
      { id: "relaxed", name: "Relaxed", sub: "Roomy", note: "A laid-back drape" }
    ];
    const FIT_NAME = { oversized: "Oversized", relaxed: "Relaxed", regular: "Regular", slim: "Slim" };
    let st = null, root = null, opts = {}, kbd = false;

    const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } };
    const save = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* private mode */ } };
    const ftin = cm => { const inch = Math.round(cm / 2.54); return `${Math.floor(inch / 12)}′${inch % 12}″`; };
    const product = () => (opts.productId && find(opts.productId)) || null;

    /* is the context an oversized cut? (the product, or the store's tops when opened without one) */
    function isOversized(p) {
      if (p) return /oversize/i.test(p.fit || "");
      const tops = PRODUCTS.filter(x => !["pants", "shorts"].includes(x.shape));
      return tops.length > 0 && tops.filter(x => /oversize/i.test(x.fit || "")).length >= tops.length / 2;
    }
    const fitsFor = os => (os ? FITS_OS : FITS_CLASSIC);
    const normFit = (fit, os) => {
      const ids = fitsFor(os).map(f => f.id);
      if (ids.includes(fit)) return fit;
      return os ? (fit === "slim" ? "regular" : "oversized") : (fit === "oversized" ? "relaxed" : "regular");
    };

    function recommend({ height, weight, fit }, os = true) {
      const bmi = weight / Math.pow(height / 100, 2);
      const base = 19.5 + 0.86 * bmi + 0.045 * (height - 170);
      let chest = base;
      if (!os) chest += ({ slim: -0.8, relaxed: 1.2 }[fit] || 0);
      const pos = (chest - 36) / 2;                       // 0 = start of S band
      const ti = clamp(Math.floor(pos), 0, 4);
      const frac = clamp(pos - Math.floor(pos), 0, 1);
      let idx = ti;
      if (os) {
        if (fit === "regular" || fit === "slim") idx = ti - 1;
        else if (fit === "relaxed") idx = frac < 0.5 ? ti - 1 : ti;
      } else if (fit === "oversized") idx = ti + 1;
      const floored = idx < 0;                             // wanted smaller than our smallest
      idx = clamp(idx, 0, 4);
      const top = TOPS[idx];
      const intended = TOPS[ti];                           // the size this oversized cut is designed around
      const down = ti > 0 ? TOPS[ti - 1] : null;           // for a regular fit
      const between = (pos >= 0 && pos < 4 && frac > 0.8 && ti < 4) ? TOPS[ti + 1] : null;

      const wRaw = 10 + 0.95 * bmi + 0.06 * (height - 170) + ({ slim: -0.5, relaxed: 0.8, oversized: 0.8 }[fit] || 0);
      const waist = clamp(Math.round(wRaw / 2) * 2, 28, 40);
      return { bmi, top, intended, down, between, floored, collar: COLLAR[top], waist: String(waist), os };
    }

    /* which size system a product uses */
    function systemOf(p) {
      if (!p) return null;
      const s = p.sizes || [];
      const numeric = s.length && s.every(x => /^\d+$/.test(x));
      const bottom = ["pants", "shorts"].includes(p.shape);
      if (numeric) return bottom || Math.min(...s.map(Number)) < 38 ? "waist" : "collar";
      return bottom ? "bottomLetter" : "top";
    }
    function forProduct(p, r) {
      const sys = systemOf(p);
      const bl = w => (w <= 30 ? "S" : w <= 32 ? "M" : w <= 34 ? "L" : w <= 36 ? "XL" : "XXL");
      const want = { top: r.top, collar: r.collar, waist: r.waist, bottomLetter: bl(+r.waist) }[sys];
      if (p.sizes.includes(want)) return { sys, want, size: want, exact: true };
      const order = sys === "top" || sys === "bottomLetter" ? TOPS : null;
      const rank = v => (order ? order.indexOf(v) : Number(v));
      let best = p.sizes[0], bd = Infinity;
      p.sizes.forEach(s => { const d = Math.abs(rank(s) - rank(want)); if (d < bd) { bd = d; best = s; } });
      return { sys, want, size: best, exact: false };
    }

    /* ---------- line drawing: a flat tee silhouette per fit (1px outline, no fill) ---------- */
    const TEE = {               // shoulder half-width, shoulder drop, sleeve out/down, hem half-width, hem y
      slim: [15, 1, 8, 20, 15, 128], regular: [17, 2, 9, 24, 17, 132],
      relaxed: [21, 6, 10, 28, 21, 140], oversized: [27, 13, 9, 30, 27, 152]
    };
    function teePath(fit) {
      const [S, D, sx, sy, H, L] = TEE[fit] || TEE.regular, c = 70, y = 60 + D;
      const r = (a, b) => `${(c + a).toFixed(1)} ${b.toFixed(1)}`, l = (a, b) => `${(c - a).toFixed(1)} ${b.toFixed(1)}`;
      return `M${l(8, 57)} Q${c} 66 ${r(8, 57)} L${r(S, y)} L${r(S + sx, y + sy)} L${r(S + sx - 11, y + sy + 4)} L${r(H, y + 22)} L${r(H, L)} L${l(H, L)} L${l(H, y + 22)} L${l(S + sx - 11, y + sy + 4)} L${l(S + sx, y + sy)} L${l(S, y)} Z`;
    }
    const fitArt = fit => `<svg class="ff-fit-art" viewBox="22 50 96 108" aria-hidden="true"><path d="${teePath(fit)}"/></svg>`;

    /* ---------- screens ---------- */
    function head() {
      const n = typeof st.step === "number" ? st.step : 3;
      const label = st.step === "result" ? "Result" : st.step === "saved" ? "" : `Step ${n + 1} of 3`;
      const pct = st.step === "result" ? 100 : st.step === "saved" ? 0 : ((n + 1) / 3) * 100;
      return `<header class="ff-head">
        <div class="ff-toprow">
          ${opts.onCancel ? `<button type="button" class="ff-backlink" data-ff-cancel>${ICON.back}<span>Back to product</span></button>` : `<p class="ff-brand">Find your size</p>`}
          ${label ? `<p class="ff-count">${label}</p>` : ""}
        </div>
        ${st.step === "saved" ? "" : `<div class="ff-progress" role="progressbar" aria-valuemin="0" aria-valuemax="3" aria-valuenow="${Math.min(3, n + 1)}" aria-label="Quiz progress"><i style="width:${pct}%"></i></div>`}
      </header>`;
    }

    function range(name, min, max, val, label, ticks) {
      const pct = ((val - min) / (max - min)) * 100;
      return `<div class="ff-range">
        <input type="range" min="${min}" max="${max}" step="1" value="${val}" data-ff-range="${name}" aria-label="${label}" style="--p:${pct}%">
        <div class="ff-ticks" aria-hidden="true">${ticks.map(t => `<span>${t}</span>`).join("")}</div>
      </div>`;
    }

    function measure(kind) {
      const isH = kind === "height";
      const v = isH ? st.height : st.weight;
      return `<div class="ff-readout">
          <output class="ff-big" data-ff-out>${v}</output>
          <span class="ff-unit">${isH ? "cm" : "kg"}</span>
        </div>
        <p class="ff-alt" data-ff-alt>${isH ? ftin(v) : Math.round(v * 2.2046) + " lb"}</p>
        ${isH ? range("height", 150, 200, st.height, "Height in centimetres", ["150 cm", "175", "200 cm"])
              : range("weight", 45, 120, st.weight, "Weight in kilograms", ["45 kg", "80", "120 kg"])}`;
    }

    function screen() {
      const s = st.step, os = st.os;
      if (s === "saved") {
        const r = recommend(st.saved, os);
        const p = product();
        const fp = p && forProduct(p, r);
        return `<section class="ff-step ff-saved">
          <h2 class="ff-title">Welcome back</h2>
          <p class="ff-sub">We kept your answers from last time on this device.</p>
          <dl class="ff-saved-card">
            <div><dt>Height</dt><dd>${st.saved.height} cm</dd></div>
            <div><dt>Weight</dt><dd>${st.saved.weight} kg</dd></div>
            <div><dt>Fit</dt><dd>${E(FIT_NAME[normFit(st.saved.fit, os)])}</dd></div>
            <div class="ff-saved-size"><dt>Your size</dt><dd>${E(fp ? fp.size : r.top)}</dd></div>
          </dl>
          <div class="ff-actions">
            <button type="button" class="btn btn-block" data-ff-use>Use my size</button>
            <button type="button" class="ff-textbtn" data-ff-restart>Retake the quiz</button>
          </div>
        </section>`;
      }
      if (s === 0) return `<section class="ff-step">
          <h2 class="ff-title">How tall are you?</h2>
          <p class="ff-sub">Barefoot height works best.</p>
          ${measure("height")}
        </section>`;
      if (s === 1) return `<section class="ff-step">
          <h2 class="ff-title">And your weight?</h2>
          <p class="ff-sub">A rough number is fine. It stays on your phone.</p>
          ${measure("weight")}
        </section>`;
      if (s === 2) return `<section class="ff-step">
          <h2 class="ff-title">How do you like it to fit?</h2>
          <p class="ff-sub">${os ? "Our tees are cut oversized. Choose how much room you want." : "Choose the fit you reach for most."}</p>
          <div class="ff-fits" role="radiogroup" aria-label="Fit preference">
            ${fitsFor(os).map(f => `<button type="button" class="ff-fit${st.fit === f.id ? " active" : ""}" role="radio" aria-checked="${st.fit === f.id}" data-ff-fitpick="${f.id}">
              ${fitArt(f.id)}
              <span class="ff-fit-text"><b>${E(f.name)}<span> — ${E(f.sub)}</span></b><small>${E(f.note)}</small></span>
              <span class="ff-radio" aria-hidden="true"></span></button>`).join("")}
          </div>
        </section>`;
      return resultScreen();
    }

    function resultScreen() {
      const os = st.os, r = recommend(st, os);
      const p = product();
      const fp = p && forProduct(p, r);
      const size = fp ? fp.size : r.top;
      const sizes = p ? p.sizes : TOPS;
      const isTop = !fp || fp.sys === "top";
      const offered = x => sizes.includes(x);

      let note, alt = null, altLabel = "";
      if (!isTop) {
        note = `Based on your build, <b>${E(size)}</b> is the one${fp && !fp.exact ? ` (the closest we make to ${E(fp.want)})` : ""}.`;
      } else if (os) {
        if (st.fit === "oversized") {
          note = `<b>${E(size)}</b> gives you the boxy, dropped-shoulder fit the tee is designed for.`;
          if (r.down && r.down !== size && offered(r.down)) { alt = r.down; altLabel = "Regular"; note += ` For a regular fit, size down to <b>${E(r.down)}</b>.`; }
          else if (r.floored || !r.down) note += ` It's our smallest size, so expect a roomy fit either way.`;
        } else if (st.fit === "relaxed") {
          note = `<b>${E(size)}</b> keeps it easy without too much volume.`;
          if (r.intended !== size && offered(r.intended)) { alt = r.intended; altLabel = "Oversized"; note += ` For the full oversized drape, take <b>${E(r.intended)}</b>.`; }
          else if (r.down && offered(r.down)) { alt = r.down; altLabel = "Regular"; note += ` For a regular fit, size down to <b>${E(r.down)}</b>.`; }
        } else {
          note = r.floored
            ? `<b>${E(size)}</b> is our smallest size. On you it will still sit a little relaxed.`
            : `One size down from your usual. <b>${E(size)}</b> sits like a regular tee.`;
          if (r.intended !== size && offered(r.intended)) { alt = r.intended; altLabel = "Oversized"; note += ` For the full oversized drape, take <b>${E(r.intended)}</b>.`; }
        }
        if (r.between && st.fit === "oversized" && !alt && offered(r.between)) { alt = r.between; altLabel = "Broad build"; }
        if (r.between && st.fit === "oversized") note += ` You're near the top of the range, so broad shoulders may prefer <b>${E(r.between)}</b>.`;
      } else {
        note = `Most builds like yours (${st.height} cm, ${st.weight} kg) wear <b>${E(size)}</b> for a ${E(FIT_NAME[st.fit].toLowerCase())} fit.`;
      }
      if (fp && !fp.exact && isTop) note += ` <b>${E(fp.want)}</b> isn't made in this style, so <b>${E(size)}</b> is the closest.`;

      /* secondary systems only when the store actually sells them (tops only otherwise) */
      const extra = [];
      if (bottoms()) extra.push({ k: "Waist (jeans, joggers)", v: r.waist });
      if (PRODUCTS.some(x => systemOf(x) === "collar")) extra.push({ k: "Shirt collar", v: r.collar });
      const soldOut = p && p.stock <= 0;

      return `<section class="ff-step ff-result">
        <div class="ff-card">
          ${p ? `<div class="ff-prod"><span class="ff-prod-art">${pic(p, 0, "front")}</span><div><b>${E(p.name)}</b><small>${E(p.colorName || "")}${p.fit ? ` · ${E(p.fit)} fit` : ""}</small></div></div>` : ""}
          <div class="ff-answer">
            <p class="ff-answer-label">Recommended size</p>
            <p class="ff-size-word" aria-live="polite">${E(size)}</p>
          </div>
          ${isTop ? `<div class="ff-scale" aria-hidden="true">${sizes.map(x => `<span class="${x === size ? "is-pick" : x === alt ? "is-alt" : ""}"><b>${E(x)}</b>${x === alt ? `<i>${E(altLabel)}</i>` : ""}</span>`).join("")}</div>` : ""}
          <p class="ff-note">${note}</p>
          ${extra.length ? `<dl class="ff-tiles">${extra.map(t => `<div><dt>${t.k}</dt><dd>${E(t.v)}</dd></div>`).join("")}</dl>` : ""}
        </div>
        <p class="ff-basis">${st.height} cm (${ftin(st.height)}) · ${st.weight} kg · ${E(FIT_NAME[st.fit])}
          <button type="button" class="ff-edit" data-ff-goto="0">Edit</button></p>
        <div class="ff-actions">
          ${p ? (soldOut
            ? `<button type="button" class="btn btn-block" disabled>Sold out</button>`
            : `<button type="button" class="btn btn-block" data-ff-pick="${E(size)}">Select size ${E(size)}</button>`)
            : `<a class="btn btn-block" href="shop.html">Shop size ${E(size)}</a>`}
          <button type="button" class="ff-textbtn" data-ff-restart>Start over</button>
        </div>
      </section>`;
    }

    function nav() {
      if (st.step === "saved" || st.step === "result") return "";
      return `<footer class="ff-nav">
        <button type="button" class="btn btn-outline" data-ff-back ${st.step === 0 ? "disabled" : ""}>Back</button>
        <button type="button" class="btn" data-ff-next>${st.step === 2 ? "See my size" : "Next"}</button>
      </footer>`;
    }

    function render(dir = 0) {
      root.innerHTML = head() + `<div class="ff-stage">${screen()}</div>` + nav();
      root.dataset.step = st.step;
      const step = root.querySelector(".ff-step");
      if (dir && !reduced()) step.classList.add("ff-in");
      if (st.step === "result") {
        const r = recommend(st, st.os);
        save({ height: st.height, weight: st.weight, fit: st.fit, top: r.top, collar: r.collar, waist: r.waist, ts: Date.now() });
      }
      // keep focus inside the dialog: move it to the new control for keyboard users, else to the quiz itself
      if (dir) {
        const focusEl = kbd && root.querySelector("[data-ff-range], .ff-fit.active, .ff-fit, [data-ff-pick], [data-ff-use]");
        (focusEl || root).focus({ preventScroll: true });
        const sc = root.closest(".modal-content");
        if (sc) sc.scrollTop = 0;
      }
    }

    function go(step, dir) { st.step = step; render(dir); }

    function onInput(e) {
      const inp = e.target.closest("[data-ff-range]");
      if (!inp) return;
      const v = +inp.value, name = inp.dataset.ffRange;
      st[name] = v;
      inp.style.setProperty("--p", ((v - inp.min) / (inp.max - inp.min)) * 100 + "%");
      const out = root.querySelector("[data-ff-out]"), alt = root.querySelector("[data-ff-alt]");
      out.textContent = v;
      alt.textContent = name === "height" ? ftin(v) : `${Math.round(v * 2.2046)} lb`;
    }

    function onClick(e) {
      const t = e.target.closest("button, a");
      if (!t || !root.contains(t)) return;
      if (t.hasAttribute("data-ff-next")) return go(st.step === 2 ? "result" : st.step + 1, 1);
      if (t.hasAttribute("data-ff-back")) return st.step > 0 && go(st.step - 1, -1);
      if (t.dataset.ffFitpick) {
        st.fit = t.dataset.ffFitpick;
        root.querySelectorAll(".ff-fit").forEach(b => { const on = b === t; b.classList.toggle("active", on); b.setAttribute("aria-checked", on); });
        return;
      }
      if (t.hasAttribute("data-ff-cancel")) return opts.onCancel && opts.onCancel();
      if (t.dataset.ffGoto) return go(+t.dataset.ffGoto, -1);
      if (t.hasAttribute("data-ff-restart")) return go(0, 1);
      if (t.hasAttribute("data-ff-use")) {
        Object.assign(st, { height: st.saved.height, weight: st.saved.weight, fit: normFit(st.saved.fit, st.os) });
        return go("result", 1);
      }
      if (t.dataset.ffPick) {
        const size = t.dataset.ffPick, cb = opts.onPick;
        document.dispatchEvent(new CustomEvent("fitfinder:pick", { detail: { productId: opts.productId || null, size } }));
        if (cb) { try { cb(size); } catch (err) { console.error(err); } }
        else say(`Size ${size} selected`, "success");
        // close unless the callback already replaced the modal content (e.g. returning to Quick View)
        if (root.isConnected) closeModal();
      }
    }

    function open(o = {}) {
      if (!hasModal()) return null;
      opts = o || {};
      const p = product();
      const os = isOversized(p);
      const saved = load();
      const valid = saved && saved.height && saved.weight && saved.fit;
      st = {
        os,
        height: valid ? clamp(+saved.height, 150, 200) : 172,
        weight: valid ? clamp(+saved.weight, 45, 120) : 70,
        fit: normFit(valid ? saved.fit : (os ? "oversized" : "regular"), os),
        saved: valid ? saved : null,
        step: valid ? "saved" : 0
      };
      if (o.step !== undefined) st.step = o.step;          // debug / deep-link: 0,1,2,"result"
      const host = modal().open(`<div class="ff" aria-label="Fit Finder"></div>`, { size: mobile() ? "sheet" : "m", label: "Find your size" });
      root = hostOf(host, ".ff");
      if (!root) return null;
      root.tabIndex = -1;
      kbd = false;
      root.addEventListener("keydown", () => { kbd = true; }, true);
      root.addEventListener("pointerdown", () => { kbd = false; }, true);
      root.addEventListener("click", onClick);
      root.addEventListener("input", onInput);
      root.addEventListener("keydown", e => {
        if (e.key === "Enter" && e.target.matches("[data-ff-range]")) { e.preventDefault(); go(st.step + 1, 1); }
      });
      render(0);
      return root;
    }

    return { open, recommend, systemOf };
  })();

  /* ---------- global delegated triggers ---------- */
  document.addEventListener("click", e => {
    const q = e.target.closest("[data-quick]");
    if (q) { if (!q.dataset.quick) return; e.preventDefault(); QuickView.open(q.dataset.quick); return; }
    const f = e.target.closest("[data-fitfinder]");
    if (f && !f.closest(".qv")) {
      e.preventDefault();
      const productId = f.dataset.product || f.dataset.fitfinder || undefined;
      FitFinder.open({ productId: productId && find(productId) ? productId : undefined });
    }
  });

  /* =====================================================================
     WISHLIST PAGE
     ===================================================================== */
  function wishlistPage() {
    const grid = document.getElementById("wl-grid");
    if (!grid) return;
    const titleEl = document.getElementById("wl-title");
    const countEl = document.getElementById("wl-count");
    const emptyEl = document.getElementById("wl-empty");
    const fullEl = document.getElementById("wl-full");
    const actionsEl = document.getElementById("wl-actions");
    const shareBtn = document.getElementById("wl-share");
    const askBtn = document.getElementById("wl-ask");
    const suggestEl = document.getElementById("wl-suggest");
    const suggestTitle = document.getElementById("wl-suggest-title");
    const moreEl = document.getElementById("wl-more");

    const ids = () => {
      const w = wishStore();
      const raw = w ? w.get() : [];
      return (raw || []).map(x => (typeof x === "string" ? x : x && x.id)).filter(id => find(id));
    };
    const toList = arr => (arr || []).map(x => find(typeof x === "string" ? x : x && x.id)).filter(Boolean);
    const card = p => call("productCard", p) || "";
    const refresh = () => { call("refreshReveal"); };
    const base = location.href.split(/[?#]/)[0].replace(/[^/]*$/, "");
    const uniq = list => { const seen = new Set(); return list.filter(p => { const f = p.family || p.id; if (seen.has(f)) return false; seen.add(f); return true; }); };
    /* the drop's pieces, one per family, skipping families already saved; in-stock first */
    const dropPieces = exclude => {
      const fams = new Set([...exclude].map(id => { const p = find(id); return p && (p.family || p.id); }));
      return uniq(PRODUCTS.filter(p => !fams.has(p.family || p.id))).sort((a, b) => (b.stock > 0) - (a.stock > 0));
    };
    const dropTitle = () => `Drop ${E(dropNo())}${dropName() ? ` — ${E(dropName())}` : ""}`;

    let current = [];

    function setCount(n) {
      titleEl.textContent = n ? `Wishlist (${n})` : "Wishlist";
      countEl.textContent = n ? `${n} ${n === 1 ? "piece" : "pieces"} saved on this device` : "";
      countEl.hidden = !n;
      document.title = `Wishlist${n ? ` (${n})` : ""} | ${brand()}`;
    }

    const listText = list => list.map((p, i) => `${i + 1}. ${p.name} (${p.colorName || ""}) — ${money(p.price)}\n${base}product.html?id=${encodeURIComponent(p.id)}`).join("\n\n");
    function shareLink(list) {
      // a share to any contact (no number) — so friends can see the list
      const msg = `My ${brand()} wishlist\n\n${listText(list)}\n\nShop: ${base}shop.html`;
      return `https://wa.me/?text=${encodeURIComponent(msg)}`;
    }
    const askLink = list => wa(`Hi ${brand()}! I'm interested in these:\n\n${listText(list)}`);
    const canAsk = () => typeof STORE !== "undefined" && String(STORE.whatsapp || "").replace(/\D/g, "").length >= 10;

    function renderMore(list) {
      const exclude = new Set(list.map(p => p.id));
      let items = dropPieces(exclude), title = `More from ${dropTitle()}`;
      if (!items.length) {
        let recent = [];
        try { const r = recentStore(); recent = r ? toList(r.list()) : []; } catch (e) { recent = []; }
        items = recent.filter(p => !exclude.has(p.id));
        title = "Recently viewed";
      }
      if (!items.length) { moreEl.hidden = true; moreEl.innerHTML = ""; return; }
      moreEl.hidden = false;
      moreEl.innerHTML = `<div class="container">
          <div class="wl-sec-head"><h2 class="wl-sec-title">${title}</h2>
          <a class="link-underline wl-sec-link" href="shop.html">View all</a></div>
          <div class="grid-products">${items.slice(0, 8).map(card).join("")}</div>
        </div>`;
    }

    function links(list) {
      if (!list.length) return;
      shareBtn.href = shareLink(list);
      if (askBtn) askBtn.href = askLink(list);
    }

    function render() {
      const list = toList(ids());
      current = list.map(p => p.id);
      setCount(list.length);
      const empty = !list.length;
      emptyEl.hidden = !empty;
      fullEl.hidden = empty;
      actionsEl.hidden = empty;
      if (askBtn) askBtn.hidden = empty || !canAsk();
      document.body.classList.toggle("wl-is-empty", empty);
      grid.innerHTML = list.map(card).join("");
      links(list);
      if (empty) {
        const sugg = dropPieces(new Set());
        suggestEl.innerHTML = sugg.slice(0, 8).map(card).join("");
        if (suggestTitle) suggestTitle.innerHTML = dropTitle();
        moreEl.hidden = true; moreEl.innerHTML = "";
      } else {
        suggestEl.innerHTML = "";
        renderMore(list);
      }
      refresh();
    }

    document.addEventListener("wishlist:change", () => {
      const now = ids();
      const removed = current.filter(id => !now.includes(id));
      const added = now.filter(id => !current.includes(id));
      if (added.length || !removed.length || reduced()) { render(); return; }
      current = now;
      setCount(now.length);
      links(toList(now));
      let any = false;
      removed.forEach(id => {
        const el = grid.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
        if (!el) return;
        any = true;
        el.classList.add("wl-out");
      });
      setTimeout(render, any ? 420 : 0);
    });

    render();
  }

  if (document.body && document.body.dataset.page === "wishlist") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wishlistPage);
    else wishlistPage();
  }

  window.QuickView = QuickView;
  window.FitFinder = FitFinder;
})();
