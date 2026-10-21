/* BHAKSHI — features (v2 "dark drop"): Quick View, Fit Finder, Wishlist page.
   Globals exposed: QuickView.open(id), FitFinder.open({ productId, onPick, onCancel }) (+ "fitfinder:pick" event).
   Delegated handlers: [data-quick] (quick view) and [data-fitfinder] (size quiz, optional data-product).
   Depends on app.js (Modal, Cart, Wishlist, Recent, productCard, productImage, variantsOf, waLink, stockInfo,
   dropState, isBuyable, hasBottoms, toast, flyToCart) — every call is guarded so a missing helper never crashes. */

(() => {
  "use strict";

  /* ---------- defensive helpers (app.js provides the real ones) ---------- */
  // app.js globals are top-level const/function bindings: reach them by name, guarded with typeof
  const API = () => ({
    esc: typeof esc === "function" ? esc : null,
    rupee: typeof rupee === "function" ? rupee : null,
    getProduct: typeof getProduct === "function" ? getProduct : null,
    discount: typeof discount === "function" ? discount : null,
    catName: typeof catName === "function" ? catName : null,
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
  const money = n => call("rupee", n) ?? "₹" + Number(n || 0).toLocaleString("en-IN");
  const find = id => call("getProduct", id) ?? (id && typeof id === "object" ? id : PRODUCTS.find(p => p.id === id));
  const off = p => call("discount", p) ?? (p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0);
  const category = id => call("catName", id) ?? id;
  const variants = p => call("variantsOf", p) ?? (p.family ? PRODUCTS.filter(x => x.family === p.family) : [p]);
  const pic = (p, i = 0, view = "front") => call("productImage", p, i, view) ?? (typeof Art !== "undefined" ? Art.garment(p, { view }) : "");
  const say = (msg, type) => { call("toast", msg, { type }); };
  const wa = text => call("waLink", text) ?? `https://wa.me/${encodeURIComponent((typeof STORE !== "undefined" && STORE.whatsapp) || "")}?text=${encodeURIComponent(text)}`;
  const reduced = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = () => window.matchMedia && matchMedia("(max-width: 859.98px)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad = n => String(n).padStart(2, "0");
  const hasModal = () => !!modal();
  const closeModal = () => { const m = modal(); if (m) m.close(); };
  const hostOf = (host, sel) => (host && host.matches && host.matches(sel) ? host : host && host.querySelector && host.querySelector(sel))
    || [...document.querySelectorAll(sel)].pop() || null;
  const wished = id => { const w = wishStore(); return !!(w && w.has(id)); };
  const tagsOf = p => p.tags || [];
  const printOf = (p, side) => (p.print && p.print[side]) || "";

  function stockOf(p) {
    const left = Math.max(0, Number(p.stock) || 0), total = Number(p.edition) || 0;
    const s = call("stockInfo", p) || {};
    return {
      left, total,
      pct: total ? clamp(left / total * 100, 0, 100) : 100,
      low: s.low ?? (left > 0 && left <= 15),
      soldOut: s.soldOut ?? left <= 0
    };
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
  const dropNo = () => (typeof STORE !== "undefined" && STORE.drop && STORE.drop.number) || "01";
  /* No. 0X = position of the product's family in the catalogue */
  function serial(p) {
    const fams = [];
    PRODUCTS.forEach(x => { const f = x.family || x.id; if (!fams.includes(f)) fams.push(f); });
    return pad(fams.indexOf(p.family || p.id) + 1);
  }
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
    heart: `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.4C1.4 7.6 3.6 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4c3.6 0 5.8 3.6 4.5 7.1-1.8 4.8-9.3 9.4-9.3 9.4z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
    chevL: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg>`,
    arrow: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg>`,
    flip: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 9a8 8 0 0 1 14-3l2 2M20 15a8 8 0 0 1-14 3l-2-2M20 4v4h-4M4 20v-4h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/></svg>`,
    tape: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M3 7h13a5 5 0 0 1 0 10H3z M7 7v4 M11 7v3 M15 7v4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>`,
    check: `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square"/></svg>`,
    lock: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`,
    wa: `<svg viewBox="0 0 32 32" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.6a10.6 10.6 0 0 1-5.4-1.5l-.4-.2-3.9 1 1-3.8-.2-.4A10.6 10.6 0 1 1 16 26.6zm5.8-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.7 8.7 0 0 1-4.3-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.7 3.7 0 0 0-1.1 2.7 6.4 6.4 0 0 0 1.3 3.4 14.7 14.7 0 0 0 5.6 5c2.1.9 2.9 1 4 .8a3.4 3.4 0 0 0 2.2-1.6 2.8 2.8 0 0 0 .2-1.6c-.1-.1-.3-.2-.6-.4z"/></svg>`
  };

  /* =====================================================================
     QUICK VIEW
     ===================================================================== */
  const QuickView = (() => {
    let st = null;     // { id, view, size, qty }
    let root = null;   // .qv element inside the modal

    /* faces available for a product: drawn art always has front/back/detail; photos use what exists */
    function facesOf(p) {
      const photos = (p.images || []).filter(Boolean);
      if (photos.length) {
        const f = { front: pic(p, 0) };
        if (photos[1]) f.back = pic(p, 1);
        if (photos[2]) f.detail = pic(p, 2);
        return f;
      }
      return { front: pic(p, 0, "front"), back: pic(p, 0, "back"), detail: pic(p, 0, "detail") };
    }
    const VIEWS = { front: "Front", back: "Back", detail: "Detail" };

    function badgeOf(p, s) {
      const pct = off(p);
      if (s.soldOut) return `<span class="badge badge-hot">Sold out</span>`;
      if (s.low) return `<span class="badge badge-hot">Low stock</span>`;
      if (pct > 0) return `<span class="badge badge-accent">−${pct}%</span>`;
      if (tagsOf(p).includes("bestseller")) return `<span class="badge badge-accent">Bestseller</span>`;
      if (tagsOf(p).includes("new")) return `<span class="badge badge-ghost">New</span>`;
      return "";
    }

    function stockMeter(s) {
      if (s.soldOut) return `<div class="qv-stock is-out"><div class="qv-stock-top"><span>Stock</span><b>Sold out</b></div><div class="qv-stock-bar"><i style="width:0"></i></div></div>`;
      const txt = s.total ? `${pad(s.left)} / ${pad(s.total)} left` : `${pad(s.left)} left`;
      return `<div class="qv-stock${s.low ? " is-low" : ""}" role="meter" aria-valuemin="0" aria-valuemax="${s.total || s.left}" aria-valuenow="${s.left}" aria-label="Units left">
        <div class="qv-stock-top"><span>${s.low ? `<i class="qv-live" aria-hidden="true"></i>Going fast` : "Stock"}</span><b>${txt}</b></div>
        <div class="qv-stock-bar"><i style="width:${s.pct.toFixed(1)}%"></i></div>
      </div>`;
    }

    function buyRow(p, s, d) {
      const wish = `<button type="button" class="qv-wish" data-wish="${E(p.id)}" aria-pressed="${wished(p.id)}" aria-label="${wished(p.id) ? "Remove from wishlist" : "Add to wishlist"}">${ICON.heart}</button>`;
      if (!d.live) {
        return `<div class="qv-buy qv-buy-locked">
          <button type="button" class="btn btn-ghost qv-add qv-locked" disabled aria-disabled="true">${ICON.lock}<span>Drops in <span class="mono" data-cd>${fmtLeft(d.msLeft)}</span></span></button>
          ${wish}
          <a class="btn btn-wa qv-notify" href="${E(wa(`Hi ${STORE.name}! Ping me when Drop ${dropNo()} goes live — I want the ${p.name}.`))}" target="_blank" rel="noopener">${ICON.wa}<span>Notify me on WhatsApp</span></a>
        </div>`;
      }
      if (s.soldOut || !buyable(p)) {
        return `<div class="qv-buy qv-buy-out">
          <a class="btn btn-wa qv-add" href="${E(wa(`Hi ${STORE.name}! Please tell me if the ${p.name} (${p.colorName || ""}) restocks.`))}" target="_blank" rel="noopener">${ICON.wa}<span>Notify me</span></a>
          ${wish}
        </div>`;
      }
      const max = Math.min(10, s.left);
      return `<div class="qv-buy">
        <div class="qty qv-qty" role="group" aria-label="Quantity">
          <button type="button" data-qv-qty="-1" aria-label="Decrease quantity"${st.qty <= 1 ? " disabled" : ""}>−</button>
          <output aria-live="polite">${st.qty}</output>
          <button type="button" data-qv-qty="1" aria-label="Increase quantity"${st.qty >= max ? " disabled" : ""}>+</button>
        </div>
        <button type="button" class="btn qv-add" data-qv-add><span>Add to bag</span><span class="qv-add-price mono">${money(p.price * st.qty)}</span></button>
        ${wish}
      </div>`;
    }

    function markup(p) {
      const s = stockOf(p), d = drop(), faces = facesOf(p), vars = variants(p), pct = off(p);
      const keys = Object.keys(faces);
      if (!faces[st.view]) st.view = "front";
      const canFlip = !!faces.back;
      const out = s.soldOut;
      const specs = [
        ["Fabric", p.fabric],
        ["Fit", p.fit],
        ["Print", [printOf(p, "front") && printOf(p, "front") !== "logo" ? "Front graphic" : printOf(p, "front") === "logo" ? "Chest mark" : "",
                   printOf(p, "back") ? "back print" : ""].filter(Boolean).join(" + ").replace(/^b/, "B")],
        ["Returns", "7-day size exchange"]
      ].filter(r => r[1]);

      return `
      <div class="qv-inner">
        <div class="qv-media">
          <div class="qv-stage" data-view="${st.view}" role="group" aria-label="${E(p.name)} artwork">
            <div class="qv-badges">${badgeOf(p, s)}</div>
            <span class="qv-stage-meta mono" aria-hidden="true">${pad(keys.indexOf(st.view) + 1)} / ${pad(keys.length)} · ${VIEWS[st.view]}</span>
            <div class="qv-flip">
              <figure class="qv-face qv-face-front" aria-hidden="${st.view !== "front"}">${faces.front}</figure>
              ${canFlip ? `<figure class="qv-face qv-face-back" aria-hidden="${st.view !== "back"}">${faces.back}</figure>` : ""}
            </div>
            ${faces.detail ? `<figure class="qv-detail" aria-hidden="${st.view !== "detail"}">${faces.detail}</figure>` : ""}
            ${canFlip ? `<div class="qv-toggle" role="group" aria-label="Garment side">
              <button type="button" data-qv-view="front" aria-pressed="${st.view === "front"}">Front</button>
              <button type="button" data-qv-view="back" aria-pressed="${st.view === "back"}">Back</button>
              <span class="qv-toggle-ind" aria-hidden="true"></span>
            </div>` : ""}
          </div>
          ${keys.length > 1 ? `<div class="qv-thumbs" role="group" aria-label="Choose view">
            ${keys.map((k, i) => `<button type="button" class="qv-thumb" data-qv-view="${k}" aria-pressed="${st.view === k}" aria-label="${VIEWS[k]} view">
              <span class="qv-thumb-art">${faces[k]}</span><span class="qv-thumb-label mono">${pad(i + 1)} ${VIEWS[k]}</span></button>`).join("")}
          </div>` : ""}
        </div>

        <div class="qv-info">
          <p class="qv-eyebrow mono">Drop ${E(dropNo())} · No. ${serial(p)}<span> · ${E(category(p.category))}</span></p>
          <h2 class="qv-title" id="qv-title">${E(p.name)}</h2>
          <div class="qv-price-row">
            <span class="qv-price mono">${money(p.price)}</span>
            ${pct > 0 ? `<s class="qv-mrp mono" aria-label="MRP ${money(p.mrp)}">${money(p.mrp)}</s><span class="qv-off mono">−${pct}%</span>` : ""}
            <span class="qv-tax mono">Incl. taxes</span>
          </div>
          ${stockMeter(s)}

          <div class="qv-block">
            <div class="qv-label"><span>Colour</span><b>${E(p.colorName || "")}</b></div>
            ${vars.length > 1 ? `<div class="qv-swatches" role="radiogroup" aria-label="Colour">
              ${vars.map(v => `<button type="button" class="qv-swatch${v.id === p.id ? " active" : ""}" role="radio" aria-checked="${v.id === p.id}"
                 data-qv-variant="${E(v.id)}" style="--sw:${E(v.color)}" aria-label="${E(v.colorName || v.name)}${v.stock <= 0 ? " (sold out)" : ""}" title="${E(v.colorName || v.name)}">
                 <span></span></button>`).join("")}
            </div>` : ""}
          </div>

          <div class="qv-block">
            <div class="qv-label qv-label-row">
              <span class="qv-size-label">Size${st.size ? ` <b>${E(st.size)}</b>` : ""}</span>
              <button type="button" class="qv-fitlink" data-qv-fit>${ICON.tape}<span>Find my size</span></button>
            </div>
            <div class="qv-sizes" role="radiogroup" aria-label="Size">
              ${p.sizes.map(sz => out
                ? `<button type="button" class="qv-size" disabled aria-disabled="true" title="Sold out">${E(sz)}</button>`
                : `<button type="button" class="qv-size${st.size === sz ? " active" : ""}" role="radio" aria-checked="${st.size === sz}" data-qv-size="${E(sz)}">${E(sz)}</button>`).join("")}
            </div>
            ${/oversize/i.test(p.fit || "") ? `<p class="qv-fitnote mono">Cut oversized — take your usual size for the boxy drape, one down for a regular fit.</p>` : ""}
            <p class="qv-msg" role="alert"></p>
          </div>

          ${buyRow(p, s, d)}

          <dl class="qv-specs">${specs.map(([k, v]) => `<div><dt class="mono">${k}</dt><dd>${E(v)}</dd></div>`).join("")}</dl>
          ${p.desc ? `<p class="qv-desc">${E(p.desc)}</p>` : ""}
          <a class="qv-more" href="product.html?id=${encodeURIComponent(p.id)}"><span>Full details</span>${ICON.arrow}</a>
        </div>
      </div>`;
    }

    function paint() {
      const p = find(st.id);
      root.innerHTML = markup(p);
      root.dataset.id = p.id;
      tick(root);
    }

    function setView(v) {
      const stage = root.querySelector(".qv-stage");
      if (!stage) return;
      const keys = [...root.querySelectorAll(".qv-thumb")].map(b => b.dataset.qvView);
      const list = keys.length ? keys : ["front"].concat(root.querySelector(".qv-face-back") ? ["back"] : []);
      if (!list.includes(v)) return;
      st.view = v;
      stage.dataset.view = v;
      root.querySelectorAll("[data-qv-view]").forEach(b => b.setAttribute("aria-pressed", b.dataset.qvView === v));
      const map = { front: ".qv-face-front", back: ".qv-face-back", detail: ".qv-detail" };
      Object.entries(map).forEach(([k, sel]) => { const el = root.querySelector(sel); if (el) el.setAttribute("aria-hidden", k !== v); });
      const meta = root.querySelector(".qv-stage-meta");
      if (meta) meta.textContent = `${pad(list.indexOf(v) + 1)} / ${pad(list.length)} · ${VIEWS[v]}`;
    }
    function stepView(dir) {
      const list = [...root.querySelectorAll(".qv-thumb")].map(b => b.dataset.qvView);
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
      setTimeout(() => { paint(); requestAnimationFrame(() => root.classList.remove("is-swapping")); }, 180);
    }

    function pickSize(size) {
      st.size = size;
      root.querySelectorAll("[data-qv-size]").forEach(b => {
        const on = b.dataset.qvSize === size;
        b.classList.toggle("active", on);
        b.setAttribute("aria-checked", on);
      });
      const lbl = root.querySelector(".qv-size-label");
      if (lbl) lbl.innerHTML = `Size <b>${E(size)}</b>`;
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
      const pr = root.querySelector(".qv-add-price");
      if (pr) pr.textContent = money(p.price * st.qty);
    }

    function add(btn) {
      const p = find(st.id);
      if (!st.size) {
        const sizes = root.querySelector(".qv-sizes");
        const msg = root.querySelector(".qv-msg");
        msg.textContent = "Pick a size first.";
        msg.classList.add("show");
        sizes.classList.remove("shake");
        void sizes.offsetWidth;          // restart animation
        sizes.classList.add("shake");
        const first = sizes.querySelector("[data-qv-size]");
        if (first) first.focus({ preventScroll: true });
        if (mobile()) sizes.scrollIntoView({ block: "center", behavior: reduced() ? "auto" : "smooth" });
        return;
      }
      const cart = cartStore();
      if (!cart || !buyable(p)) { say("This tee can't be added right now.", "error"); return; }
      const ok = cart.add(p.id, st.size, st.qty);
      if (ok === false) { say("Couldn't add that — it may have just sold out.", "error"); return; }
      const src = root.querySelector(st.view === "detail" ? ".qv-detail" : st.view === "back" ? ".qv-face-back" : ".qv-face-front") || btn;
      try { call("flyToCart", src); } catch (e) { /* non-fatal */ }
      say(`Added — ${p.name} · ${st.size}`, "success");

      const buy = root.querySelector(".qv-buy");
      const sub = cart.subtotal ? cart.subtotal() : 0;
      const left = (STORE.freeShippingAbove || 0) - sub;
      buy.outerHTML = `
        <div class="qv-added" role="status">
          <span class="qv-added-ico">${ICON.check}</span>
          <div class="qv-added-text">
            <strong>In your bag</strong>
            <span class="mono">Size ${E(st.size)} · Qty ${pad(st.qty)} · ${money(p.price * st.qty)}</span>
            <small class="mono">${left > 0 ? `${money(left)} more for free shipping` : "Free shipping unlocked"}</small>
          </div>
          <div class="qv-added-actions">
            <button type="button" class="btn btn-block" data-qv-viewbag>View bag</button>
            <button type="button" class="btn btn-ghost btn-block" data-qv-close>Keep shopping</button>
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
      if (!p) { say("That tee isn't available any more.", "error"); return null; }
      if (!hasModal()) { location.href = `product.html?id=${encodeURIComponent(id)}`; return null; }
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
      { id: "oversized", name: "Oversized", sub: "as intended", note: "Boxy, dropped shoulders — how it's cut" },
      { id: "relaxed", name: "Slightly relaxed", sub: "a bit less drape", note: "Roomy, but less volume" },
      { id: "regular", name: "Regular", sub: "size down", note: "Closer to a normal tee" }
    ];
    const FITS_CLASSIC = [
      { id: "slim", name: "Slim", sub: "close", note: "Close to the body, sharp lines" },
      { id: "regular", name: "Regular", sub: "easy", note: "Easy through chest and waist" },
      { id: "relaxed", name: "Relaxed", sub: "roomy", note: "Roomy, laid-back drape" }
    ];
    const FIT_NAME = { oversized: "Oversized", relaxed: "Slightly relaxed", regular: "Regular", slim: "Slim" };
    let st = null, root = null, opts = {};

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

    /* ---------- illustrations ---------- */
    const TEE = {               // shoulder half-width, shoulder drop, sleeve out/down, hem half-width, hem y
      slim: [15, 1, 8, 20, 15, 128], regular: [17, 2, 9, 24, 17, 132],
      relaxed: [21, 6, 10, 28, 21, 140], oversized: [27, 13, 9, 30, 27, 152]
    };
    function teePath(fit) {
      const [S, D, sx, sy, H, L] = TEE[fit] || TEE.regular, c = 70, y = 60 + D;
      const r = (a, b) => `${(c + a).toFixed(1)} ${b.toFixed(1)}`, l = (a, b) => `${(c - a).toFixed(1)} ${b.toFixed(1)}`;
      return `M${l(8, 57)} Q${c} 66 ${r(8, 57)} L${r(S, y)} L${r(S + sx, y + sy)} L${r(S + sx - 11, y + sy + 4)} L${r(H, y + 22)} L${r(H, L)} L${l(H, L)} L${l(H, y + 22)} L${l(S + sx - 11, y + sy + 4)} L${l(S + sx, y + sy)} L${l(S, y)} Z`;
    }
    function body() {
      return `<circle cx="70" cy="38" r="13"/><rect x="65" y="48" width="10" height="11"/>
        <path d="M52 60h36l8 4 9 26-1 58-7 3-4-56-2 0v44H55v-44l-2 0-4 56-7-3-1-58 9-26z"/>
        <path d="M54 126h32l-2 102h-11l-3-80-3 80H56z"/>`;
    }
    function figure(h, w, fit) {
      const sy = 0.8 + (h - 150) / 50 * 0.2;             // 150cm → .80, 200cm → 1.00
      const bmi = w / Math.pow(h / 100, 2);
      const sx = clamp(0.8 + (bmi - 18) / 14 * 0.45, 0.74, 1.36);
      const topY = 236 - 211 * sy;                        // head-top y after scaling
      const ticks = Array.from({ length: 12 }, (_, i) => 236 - i * 20)
        .map((y, i) => `<line x1="${i % 2 ? 7 : 2}" y1="${y}" x2="12" y2="${y}"/>`).join("");
      return `<svg class="ff-figure" viewBox="0 0 140 240" aria-hidden="true">
        <g class="ff-ruler">${ticks}<line x1="12" y1="16" x2="12" y2="236"/></g>
        <g class="ff-mark" style="transform: translateY(${topY.toFixed(1)}px)">
          <line x1="12" y1="0" x2="128" y2="0"/><rect x="8" y="-4" width="8" height="8"/>
        </g>
        <line class="ff-ground" x1="12" y1="236" x2="132" y2="236"/>
        <g class="ff-figure-body" style="transform: scale(${sx.toFixed(3)}, ${sy.toFixed(3)})">
          <g class="ff-skin">${body()}</g>
          <path class="ff-tee-shape" d="${teePath(fit)}"/>
        </g>
      </svg>`;
    }
    function fitArt(fit) {
      return `<svg class="ff-fit-art" viewBox="22 18 96 150" aria-hidden="true">
        <g class="ff-skin">${body()}</g><path class="ff-tee-shape" d="${teePath(fit)}"/></svg>`;
    }

    /* ---------- screens ---------- */
    function head() {
      const n = typeof st.step === "number" ? st.step : 3;
      const label = st.step === "result" ? "Result" : st.step === "saved" ? "Welcome back" : `${pad(n + 1)} / 03`;
      return `<header class="ff-head">
        <div class="ff-toprow">
          <p class="ff-brand mono">[ Fit Finder ]</p>
          ${opts.onCancel ? `<button type="button" class="ff-backlink mono" data-ff-cancel>${ICON.chevL}<span>Back to tee</span></button>` : ""}
        </div>
        ${st.step === "saved" ? "" : `<div class="ff-progress" role="progressbar" aria-valuemin="0" aria-valuemax="3" aria-valuenow="${Math.min(3, n + 1)}" aria-label="Quiz progress">
          ${[0, 1, 2].map(i => `<span class="${i < n || st.step === "result" ? "done" : i === n ? "on" : ""}"></span>`).join("")}
          <b class="mono">${label}</b></div>`}
      </header>`;
    }

    function range(name, min, max, val, label, ticks) {
      const pct = ((val - min) / (max - min)) * 100;
      return `<div class="ff-range">
        <input type="range" min="${min}" max="${max}" step="1" value="${val}" data-ff-range="${name}" aria-label="${label}" style="--p:${pct}%">
        <div class="ff-ticks mono" aria-hidden="true">${ticks.map(t => `<span>${t}</span>`).join("")}</div>
      </div>`;
    }

    function measure(kind) {
      const isH = kind === "height";
      const v = isH ? st.height : st.weight;
      return `<div class="ff-measure">
          <div class="ff-fig-wrap">${figure(st.height, st.weight, st.fit)}</div>
          <div class="ff-readout">
            <output class="ff-big mono" data-ff-out>${v}</output>
            <span class="ff-unit mono">${isH ? "cm" : "kg"} <i data-ff-alt>${isH ? ftin(v) : Math.round(v * 2.2046) + " lb"}</i></span>
          </div>
        </div>
        ${isH ? range("height", 150, 200, st.height, "Height in centimetres", ["150", "175", "200"])
              : range("weight", 45, 120, st.weight, "Weight in kilograms", ["45", "80", "120"])}`;
    }

    function screen() {
      const s = st.step, os = st.os;
      if (s === "saved") {
        const r = recommend(st.saved, os);
        const p = product();
        const fp = p && forProduct(p, r);
        return `<section class="ff-step ff-saved">
          <h2 class="ff-title">Welcome<br><span class="ff-acid">back.</span></h2>
          <p class="ff-sub">Your answers from last time are still here.</p>
          <div class="ff-saved-card">
            <div><span class="mono">Height</span><b class="mono">${st.saved.height}<small>cm</small></b></div>
            <div><span class="mono">Weight</span><b class="mono">${st.saved.weight}<small>kg</small></b></div>
            <div><span class="mono">Fit</span><b>${E(FIT_NAME[normFit(st.saved.fit, os)])}</b></div>
            <div class="ff-saved-size"><span class="mono">Your size</span><b class="mono">${E(fp ? fp.size : r.top)}</b></div>
          </div>
          <div class="ff-actions">
            <button type="button" class="btn btn-block btn-lg" data-ff-use>Use my size</button>
            <button type="button" class="btn btn-ghost btn-block" data-ff-restart>Retake the quiz</button>
          </div>
        </section>`;
      }
      if (s === 0) return `<section class="ff-step">
          <h2 class="ff-title">How <span class="ff-acid">tall</span>?</h2>
          <p class="ff-sub">Drag it. Barefoot height works best.</p>
          ${measure("height")}
        </section>`;
      if (s === 1) return `<section class="ff-step">
          <h2 class="ff-title">And your <span class="ff-acid">weight</span>?</h2>
          <p class="ff-sub">Roughly is fine — it never leaves your phone.</p>
          ${measure("weight")}
        </section>`;
      if (s === 2) return `<section class="ff-step">
          <h2 class="ff-title">How should it <span class="ff-acid">sit</span>?</h2>
          <p class="ff-sub">${os ? "These tees are cut oversized. Pick the drape you want." : "Pick the silhouette you reach for most."}</p>
          <div class="ff-fits" role="radiogroup" aria-label="Fit preference">
            ${fitsFor(os).map((f, i) => `<button type="button" class="ff-fit${st.fit === f.id ? " active" : ""}" role="radio" aria-checked="${st.fit === f.id}" data-ff-fitpick="${f.id}">
              <span class="ff-fit-no mono">${pad(i + 1)}</span>
              ${fitArt(f.id)}
              <b>${E(f.name)}</b><small class="mono">${E(f.sub)}</small><span class="ff-fit-note">${E(f.note)}</span>
              <span class="ff-tick" aria-hidden="true">${ICON.check}</span></button>`).join("")}
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
        note = `Based on your build, <b>${E(size)}</b> is the one${fp && !fp.exact ? ` (closest we make to ${E(fp.want)})` : ""}.`;
      } else if (os) {
        if (st.fit === "oversized") {
          note = `<b>${E(size)}</b> gives you the boxy, dropped-shoulder drape this tee is cut for.`;
          if (r.down && r.down !== size && offered(r.down)) { alt = r.down; altLabel = "Regular fit"; note += ` For a regular fit, size down to <b>${E(r.down)}</b>.`; }
          else if (r.floored || !r.down) note += ` It's our smallest — expect a roomy fit either way.`;
        } else if (st.fit === "relaxed") {
          note = `<b>${E(size)}</b> keeps it loose without swallowing you.`;
          if (r.intended !== size && offered(r.intended)) { alt = r.intended; altLabel = "Full oversized"; note += ` Want the full oversized drape? Go <b>${E(r.intended)}</b>.`; }
          else if (r.down && offered(r.down)) { alt = r.down; altLabel = "Regular fit"; note += ` For a regular fit, size down to <b>${E(r.down)}</b>.`; }
        } else {
          note = r.floored
            ? `<b>${E(size)}</b> is our smallest — on you it will still sit a little relaxed.`
            : `One down from your usual — <b>${E(size)}</b> sits like a regular tee on you.`;
          if (r.intended !== size && offered(r.intended)) { alt = r.intended; altLabel = "Oversized"; note += ` For the full oversized drape, go <b>${E(r.intended)}</b>.`; }
        }
        if (r.between && st.fit === "oversized" && !alt && offered(r.between)) { alt = r.between; altLabel = "Broad shoulders"; }
        if (r.between && st.fit === "oversized") note += ` You're near the top of the band — broad shoulders can go <b>${E(r.between)}</b>.`;
      } else {
        note = `Most builds like yours (${st.height} cm, ${st.weight} kg) wear <b>${E(size)}</b> for a ${E(FIT_NAME[st.fit].toLowerCase())} fit.`;
      }
      if (fp && !fp.exact && isTop) note += ` <b>${E(fp.want)}</b> isn't made in this style, so <b>${E(size)}</b> is the closest.`;

      /* secondary systems only when the store actually sells them */
      const extra = [];
      if (bottoms()) extra.push({ k: "Waist · jeans & joggers", v: r.waist });
      if (PRODUCTS.some(x => systemOf(x) === "collar")) extra.push({ k: "Shirts · collar", v: r.collar });
      const soldOut = p && p.stock <= 0;

      return `<section class="ff-step ff-result">
        ${p ? `<div class="ff-prod"><span class="ff-prod-art">${pic(p, 0, "front")}</span><div><small class="mono">Sized for · No. ${serial(p)}</small><b>${E(p.name)}</b><small class="mono">${E(p.fit || "")}${p.fit ? " cut" : ""}</small></div></div>` : ""}
        <div class="ff-answer">
          <p class="ff-answer-label mono">Your size${os && isTop ? " · oversized cut" : ""}</p>
          <p class="ff-size-word" data-len="${String(size).length}" aria-live="polite">${E(size)}</p>
        </div>
        ${isTop ? `<div class="ff-scale" aria-hidden="true">${sizes.map(x => `<span class="${x === size ? "is-pick" : x === alt ? "is-alt" : ""}">${E(x)}${x === alt ? `<i class="mono">${E(altLabel)}</i>` : ""}</span>`).join("")}</div>` : ""}
        <div class="ff-note"><p>${note}</p></div>
        ${extra.length ? `<div class="ff-tiles">${extra.map(t => `<div class="ff-tile"><span class="ff-tile-val mono">${E(t.v)}</span><span class="ff-tile-label mono">${t.k}</span></div>`).join("")}</div>` : ""}
        <p class="ff-basis mono">${st.height} cm (${ftin(st.height)}) · ${st.weight} kg · ${E(FIT_NAME[st.fit])}
          <button type="button" class="ff-edit mono" data-ff-goto="0">Edit</button></p>
        <div class="ff-actions">
          ${p ? (soldOut
            ? `<button type="button" class="btn btn-block btn-lg" disabled>Sold out</button>`
            : `<button type="button" class="btn btn-block btn-lg" data-ff-pick="${E(size)}">Select size ${E(size)}</button>`)
            : `<a class="btn btn-block btn-lg" href="shop.html">Shop Drop ${E(dropNo())} in ${E(size)}</a>`}
          <button type="button" class="btn btn-ghost btn-block" data-ff-restart>Start over</button>
        </div>
      </section>`;
    }

    function nav() {
      if (st.step === "saved" || st.step === "result") return "";
      return `<footer class="ff-nav">
        <button type="button" class="btn btn-ghost" data-ff-back ${st.step === 0 ? "disabled" : ""}>Back</button>
        <button type="button" class="btn" data-ff-next>${st.step === 2 ? "See my size" : "Next"}${ICON.arrow}</button>
      </footer>`;
    }

    function render(dir = 0) {
      root.innerHTML = head() + `<div class="ff-stage">${screen()}</div>` + nav();
      root.dataset.step = st.step;
      const step = root.querySelector(".ff-step");
      if (dir && !reduced()) step.classList.add(dir > 0 ? "ff-in-fwd" : "ff-in-back");
      if (st.step === "result") {
        const r = recommend(st, st.os);
        save({ height: st.height, weight: st.weight, fit: st.fit, top: r.top, collar: r.collar, waist: r.waist, ts: Date.now() });
        const w = root.querySelector(".ff-size-word");
        if (w && !reduced()) w.classList.add("pop");
      }
      const focusEl = root.querySelector("[data-ff-range], .ff-fit.active, .ff-fit, [data-ff-pick], [data-ff-use]");
      if (focusEl && dir) focusEl.focus({ preventScroll: true });
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
      const fig = root.querySelector(".ff-fig-wrap");
      if (fig) {
        const fresh = figure(st.height, st.weight, st.fit);
        // update transforms in place so CSS transitions animate
        const tmp = document.createElement("div"); tmp.innerHTML = fresh;
        const ob = fig.querySelector(".ff-figure-body"), om = fig.querySelector(".ff-mark");
        const nb = tmp.querySelector(".ff-figure-body"), nm = tmp.querySelector(".ff-mark");
        if (ob && nb) ob.style.transform = nb.style.transform; else fig.innerHTML = fresh;
        if (om && nm) om.style.transform = nm.style.transform;
      }
    }

    function onClick(e) {
      const t = e.target.closest("button, a");
      if (!t || !root.contains(t)) return;
      if (t.hasAttribute("data-ff-next")) return go(st.step === 2 ? "result" : st.step + 1, 1);
      if (t.hasAttribute("data-ff-back")) return st.step > 0 && go(st.step - 1, -1);
      if (t.dataset.ffFitpick) {
        st.fit = t.dataset.ffFitpick;
        root.querySelectorAll(".ff-fit").forEach(b => { const on = b === t; b.classList.toggle("active", on); b.setAttribute("aria-checked", on); });
        clearTimeout(st._auto);
        st._auto = setTimeout(() => st.step === 2 && root.isConnected && go("result", 1), reduced() ? 0 : 480);
        return;
      }
      if (t.hasAttribute("data-ff-cancel")) { clearTimeout(st._auto); return opts.onCancel && opts.onCancel(); }
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
    if (q) { e.preventDefault(); QuickView.open(q.dataset.quick); return; }
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
    const numEl = document.getElementById("wl-num");
    const countEl = document.getElementById("wl-count");
    const emptyEl = document.getElementById("wl-empty");
    const fullEl = document.getElementById("wl-full");
    const shareBtn = document.getElementById("wl-share");
    const askBtn = document.getElementById("wl-ask");
    const suggestEl = document.getElementById("wl-suggest");
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
    /* the drop's tees, one per family, skipping families already saved; in-stock first */
    const dropTees = exclude => {
      const fams = new Set([...exclude].map(id => { const p = find(id); return p && (p.family || p.id); }));
      return uniq(PRODUCTS.filter(p => !fams.has(p.family || p.id))).sort((a, b) => (b.stock > 0) - (a.stock > 0));
    };

    let current = [];

    function setCount(n) {
      if (numEl) {
        const txt = `(${pad(n)})`;
        if (numEl.textContent !== txt && numEl.textContent !== "(00)" && !reduced()) {
          numEl.classList.remove("bump"); void numEl.offsetWidth; numEl.classList.add("bump");
        }
        numEl.textContent = txt;
      }
      countEl.textContent = n ? `${pad(n)} ${n === 1 ? "piece" : "pieces"} · stored on this device` : "Your list is empty";
      document.title = `Saved${n ? ` (${n})` : ""} | ${STORE.name}`;
    }

    const listText = list => list.map((p, i) => `${pad(i + 1)}. ${p.name} — ${money(p.price)}\n${base}product.html?id=${encodeURIComponent(p.id)}`).join("\n\n");
    function shareLink(list) {
      // a share to any contact (no number) — so friends can see the list
      const msg = `My ${STORE.name} wishlist — Drop ${dropNo()}\n\n${listText(list)}\n\nShop: ${base}shop.html`;
      return `https://wa.me/?text=${encodeURIComponent(msg)}`;
    }
    function askLink(list) {
      return wa(`Hi ${STORE.name}! I'm interested in these:\n\n${listText(list)}`);
    }

    function renderMore(list) {
      const exclude = new Set(list.map(p => p.id));
      let items = dropTees(exclude), title = `More from Drop ${E(dropNo())}`, eyebrow = `[ ${pad(items.length)} more ]`;
      if (!items.length) {
        let recent = [];
        try { const r = recentStore(); recent = r ? toList(r.list()) : []; } catch (e) { recent = []; }
        items = recent.filter(p => !exclude.has(p.id));
        title = "Recently viewed"; eyebrow = "[ pick up where you left off ]";
      }
      if (!items.length) { moreEl.hidden = true; moreEl.innerHTML = ""; return; }
      moreEl.hidden = false;
      moreEl.innerHTML = `<div class="container">
          <div class="wl-more-head"><p class="eyebrow mono">${eyebrow}</p><h2 class="wl-more-title">${title}</h2>
          <a class="wl-link mono" href="shop.html">Shop all ${ICON.arrow}</a></div>
          <div class="grid-products wl-more-grid">${items.slice(0, 8).map(card).join("")}</div>
        </div>`;
    }

    function render() {
      const list = toList(ids());
      current = list.map(p => p.id);
      setCount(list.length);
      const empty = !list.length;
      emptyEl.hidden = !empty;
      fullEl.hidden = empty;
      shareBtn.hidden = empty;
      if (askBtn) askBtn.hidden = empty || !(STORE.whatsapp && String(STORE.whatsapp).length >= 10);
      document.body.classList.toggle("wl-is-empty", empty);
      grid.innerHTML = list.map(card).join("");
      if (!empty) { shareBtn.href = shareLink(list); if (askBtn) askBtn.href = askLink(list); }
      if (empty) {
        const sugg = dropTees(new Set());
        suggestEl.innerHTML = sugg.slice(0, 8).map(card).join("");
        const sTitle = document.getElementById("wl-suggest-title");
        if (sTitle) sTitle.textContent = `Drop ${dropNo()} — ${pad(sugg.length)} ${sugg.every(p => p.shape === "tee") ? "tees" : "pieces"}`;
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
      const list = toList(now);
      if (list.length) { shareBtn.href = shareLink(list); if (askBtn) askBtn.href = askLink(list); }
      let any = false;
      removed.forEach(id => {
        const el = grid.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
        if (!el) return;
        any = true;
        el.classList.add("wl-out");
      });
      setTimeout(render, any ? 520 : 0);
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
