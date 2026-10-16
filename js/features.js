/* BHAKSHI — features: Quick View, Fit Finder, Wishlist page.
   Globals exposed: QuickView.open(id), FitFinder.open({ productId, onPick }).
   Delegated handlers: [data-quick] (quick view) and [data-fitfinder] (size quiz, optional data-product).
   Depends on app.js (Modal, Cart, Wishlist, Recent, productCard, productImage, variantsOf, toast, flyToCart). */

(() => {
  "use strict";

  /* ---------- small defensive helpers (app.js provides the real ones) ---------- */
  const E = s => (typeof esc === "function" ? esc(s) : String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`));
  const money = n => (typeof rupee === "function" ? rupee(n) : "₹" + Number(n).toLocaleString("en-IN"));
  const find = id => (typeof getProduct === "function" ? getProduct(id) : PRODUCTS.find(p => p.id === id));
  const off = p => (typeof discount === "function" ? discount(p) : Math.round((1 - p.price / p.mrp) * 100));
  const category = id => (typeof catName === "function" ? catName(id) : id);
  const variants = p => (typeof variantsOf === "function" ? variantsOf(p) : PRODUCTS.filter(x => x.family === p.family));
  const pic = (p, i = 0, view = "front") =>
    typeof productImage === "function" ? productImage(p, i, view) : Art.garment(p, { view });
  const say = (msg, type) => { if (typeof toast === "function") toast(msg, { type }); };
  const reduced = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const hasModal = () => typeof Modal !== "undefined" && Modal && typeof Modal.open === "function";
  const closeModal = () => { if (hasModal()) Modal.close(); };
  const hostOf = (host, sel) => (host && host.matches && host.matches(sel) ? host : host && host.querySelector && host.querySelector(sel))
    || [...document.querySelectorAll(sel)].pop() || null;
  const wished = id => typeof Wishlist !== "undefined" && Wishlist.has(id);

  const ICON = {
    heart: `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.4C1.4 7.6 3.6 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4c3.6 0 5.8 3.6 4.5 7.1-1.8 4.8-9.3 9.4-9.3 9.4z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
    chevL: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    chevR: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    tape: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M3 7h13a5 5 0 0 1 0 10H3z M7 7v4 M11 7v3 M15 7v4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    check: `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    wa: `<svg viewBox="0 0 32 32" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.6a10.6 10.6 0 0 1-5.4-1.5l-.4-.2-3.9 1 1-3.8-.2-.4A10.6 10.6 0 1 1 16 26.6zm5.8-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.7 8.7 0 0 1-4.3-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.7 3.7 0 0 0-1.1 2.7 6.4 6.4 0 0 0 1.3 3.4 14.7 14.7 0 0 0 5.6 5c2.1.9 2.9 1 4 .8a3.4 3.4 0 0 0 2.2-1.6 2.8 2.8 0 0 0 .2-1.6c-.1-.1-.3-.2-.6-.4z"/></svg>`
  };

  /* =====================================================================
     QUICK VIEW
     ===================================================================== */
  const QuickView = (() => {
    const VIEW_LABEL = { front: "Front", back: "Back", detail: "Detail" };
    let st = null;     // { id, slide, size, qty }
    let root = null;   // .qv element inside the modal

    function slidesOf(p) {
      if (p.images && p.images.length) return p.images.map((_, i) => ({ html: pic(p, i), label: `Photo ${i + 1}` }));
      return ["front", "back", "detail"].map(v => ({ html: pic(p, 0, v), label: `${VIEW_LABEL[v]} view` }));
    }

    function markup(p) {
      const soldOut = p.stock <= 0;
      const slides = slidesOf(p);
      const vars = variants(p);
      const pct = off(p);
      const badge = soldOut ? `<span class="badge badge-dark">Sold out</span>`
        : p.tags.includes("new") ? `<span class="badge">New</span>`
        : p.tags.includes("bestseller") ? `<span class="badge badge-accent">Bestseller</span>`
        : p.tags.includes("sale") || pct >= 40 ? `<span class="badge badge-sale">${pct}% off</span>` : "";
      const low = !soldOut && p.stock <= 15;

      return `
      <div class="qv-inner">
        <div class="qv-gallery">
          <div class="qv-stage" tabindex="0" aria-roledescription="carousel" aria-label="${E(p.name)} images">
            <div class="qv-badges">${badge}</div>
            <div class="qv-track" style="--i:${st.slide}">
              ${slides.map((s, i) => `<figure class="qv-slide" aria-label="${E(s.label)}" ${i === st.slide ? "" : 'aria-hidden="true"'}>${s.html}</figure>`).join("")}
            </div>
            ${slides.length > 1 ? `
            <button type="button" class="qv-arrow qv-prev" data-qv-nav="-1" aria-label="Previous image">${ICON.chevL}</button>
            <button type="button" class="qv-arrow qv-next" data-qv-nav="1" aria-label="Next image">${ICON.chevR}</button>
            <div class="qv-dots" aria-hidden="true">${slides.map((_, i) => `<span class="${i === st.slide ? "on" : ""}"></span>`).join("")}</div>` : ""}
          </div>
          ${slides.length > 1 ? `<div class="qv-thumbs" role="tablist" aria-label="Choose image">
            ${slides.map((s, i) => `<button type="button" class="qv-thumb${i === st.slide ? " active" : ""}" role="tab" aria-selected="${i === st.slide}" data-qv-slide="${i}" aria-label="${E(s.label)}">${s.html}</button>`).join("")}
          </div>` : ""}
        </div>

        <div class="qv-info">
          <p class="eyebrow qv-eyebrow">${E(category(p.category))}</p>
          <h2 class="qv-title" id="qv-title">${E(p.name)}</h2>
          <div class="qv-price">
            <strong>${money(p.price)}</strong>
            ${p.mrp > p.price ? `<s aria-label="MRP">${money(p.mrp)}</s><span class="qv-off">${pct}% off</span>` : ""}
          </div>
          <p class="qv-tax">MRP inclusive of all taxes</p>

          ${vars.length > 1 ? `
          <div class="qv-block">
            <div class="qv-label">Colour <b>${E(p.colorName || "")}</b></div>
            <div class="qv-swatches" role="radiogroup" aria-label="Colour">
              ${vars.map(v => `<button type="button" class="qv-swatch${v.id === p.id ? " active" : ""}" role="radio" aria-checked="${v.id === p.id}"
                 data-qv-variant="${E(v.id)}" style="--sw:${E(v.color)}" aria-label="${E(v.colorName || v.name)}${v.stock <= 0 ? " (sold out)" : ""}" title="${E(v.colorName || v.name)}">
                 <span></span></button>`).join("")}
            </div>
          </div>` : p.colorName ? `<div class="qv-block"><div class="qv-label">Colour <b>${E(p.colorName)}</b></div></div>` : ""}

          <div class="qv-block">
            <div class="qv-label qv-label-row">
              <span>Size${st.size ? ` <b>${E(st.size)}</b>` : ""}</span>
              <button type="button" class="qv-fitlink" data-qv-fit>${ICON.tape}<span>Not sure? Find your size</span></button>
            </div>
            <div class="qv-sizes" role="radiogroup" aria-label="Size">
              ${p.sizes.map(s => soldOut
                ? `<span class="qv-size-wrap" data-tip="Sold out"><button type="button" class="qv-size" disabled aria-disabled="true">${E(s)}</button></span>`
                : `<span class="qv-size-wrap"><button type="button" class="qv-size${st.size === s ? " active" : ""}" role="radio" aria-checked="${st.size === s}" data-qv-size="${E(s)}">${E(s)}</button></span>`).join("")}
            </div>
            <p class="qv-msg" role="alert" aria-live="assertive"></p>
          </div>

          <div class="qv-buy">
            ${soldOut ? `
              <a class="btn btn-wa btn-block" target="_blank" rel="noopener"
                 href="https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(`Hi ${STORE.name}, please let me know when "${p.name}" is back in stock.`)}">${ICON.wa}<span>Notify me on WhatsApp</span></a>
              <button type="button" class="qv-wish" data-wish="${E(p.id)}" aria-pressed="${wished(p.id)}" aria-label="${wished(p.id) ? "Remove from wishlist" : "Add to wishlist"}">${ICON.heart}</button>`
            : `
              <div class="qty qv-qty" role="group" aria-label="Quantity">
                <button type="button" data-qv-qty="-1" aria-label="Decrease quantity"${st.qty <= 1 ? " disabled" : ""}>−</button>
                <output aria-live="polite">${st.qty}</output>
                <button type="button" data-qv-qty="1" aria-label="Increase quantity"${st.qty >= Math.min(10, p.stock) ? " disabled" : ""}>+</button>
              </div>
              <button type="button" class="btn btn-accent qv-add" data-qv-add>Add to bag <span class="qv-add-price">· ${money(p.price * st.qty)}</span></button>
              <button type="button" class="qv-wish" data-wish="${E(p.id)}" aria-pressed="${wished(p.id)}" aria-label="${wished(p.id) ? "Remove from wishlist" : "Add to wishlist"}">${ICON.heart}</button>`}
          </div>

          ${low ? `<p class="qv-stock"><span class="qv-pulse" aria-hidden="true"></span>Only ${p.stock} left — selling fast</p>` : ""}

          <div class="qv-chips">
            ${p.fabric ? `<span class="chip">${E(p.fabric)}</span>` : ""}
            ${p.fit ? `<span class="chip">${E(p.fit)} fit</span>` : ""}
            <span class="chip">7-day exchange</span>
          </div>
          ${p.desc ? `<p class="qv-desc">${E(p.desc)}</p>` : ""}
          <a class="link-arrow qv-more" href="product.html?id=${encodeURIComponent(p.id)}">View full details</a>
        </div>
      </div>`;
    }

    function paint() {
      const p = find(st.id);
      root.innerHTML = markup(p);
      root.dataset.id = p.id;
    }

    function goSlide(i) {
      const n = root.querySelectorAll(".qv-slide").length;
      if (!n) return;
      st.slide = (i + n) % n;
      const track = root.querySelector(".qv-track");
      track.style.setProperty("--i", st.slide);
      root.querySelectorAll(".qv-slide").forEach((s, k) => k === st.slide ? s.removeAttribute("aria-hidden") : s.setAttribute("aria-hidden", "true"));
      root.querySelectorAll(".qv-thumb").forEach((t, k) => { t.classList.toggle("active", k === st.slide); t.setAttribute("aria-selected", k === st.slide); });
      root.querySelectorAll(".qv-dots span").forEach((d, k) => d.classList.toggle("on", k === st.slide));
    }

    function swapVariant(id) {
      if (id === st.id) return;
      const next = find(id);
      if (!next) return;
      st.id = id;
      st.slide = 0;
      if (st.size && !next.sizes.includes(st.size)) st.size = null;
      if (next.stock > 0) st.qty = clamp(st.qty, 1, Math.min(10, next.stock));
      if (reduced()) { paint(); return; }
      root.classList.add("is-swapping");
      setTimeout(() => {
        paint();
        requestAnimationFrame(() => root.classList.remove("is-swapping"));
      }, 180);
    }

    function pickSize(size) {
      st.size = size;
      root.querySelectorAll("[data-qv-size]").forEach(b => {
        const on = b.dataset.qvSize === size;
        b.classList.toggle("active", on);
        b.setAttribute("aria-checked", on);
      });
      const lbl = root.querySelector(".qv-label-row > span");
      if (lbl) lbl.innerHTML = `Size <b>${E(size)}</b>`;
      const msg = root.querySelector(".qv-msg");
      if (msg) { msg.textContent = ""; msg.classList.remove("show"); }
    }

    function setQty(d) {
      const p = find(st.id);
      st.qty = clamp(st.qty + d, 1, Math.min(10, p.stock));
      const box = root.querySelector(".qv-qty");
      if (!box) return;
      box.querySelector("output").textContent = st.qty;
      box.querySelector('[data-qv-qty="-1"]').disabled = st.qty <= 1;
      box.querySelector('[data-qv-qty="1"]').disabled = st.qty >= Math.min(10, p.stock);
      const pr = root.querySelector(".qv-add-price");
      if (pr) pr.textContent = "· " + money(p.price * st.qty);
    }

    function add(btn) {
      const p = find(st.id);
      if (!st.size) {
        const sizes = root.querySelector(".qv-sizes");
        const msg = root.querySelector(".qv-msg");
        msg.textContent = "Please select a size to continue.";
        msg.classList.add("show");
        sizes.classList.remove("shake");
        void sizes.offsetWidth;          // restart animation
        sizes.classList.add("shake");
        const first = sizes.querySelector("[data-qv-size]");
        if (first) first.focus({ preventScroll: true });
        return;
      }
      if (typeof Cart === "undefined") return;
      Cart.add(p.id, st.size, st.qty);
      const src = root.querySelector(".qv-slide:not([aria-hidden])") || btn;
      if (typeof flyToCart === "function") { try { flyToCart(src); } catch (e) { /* non-fatal */ } }
      say(`Added to bag — ${p.name} (${st.size})`, "success");

      // success state with "View bag" CTA
      const buy = root.querySelector(".qv-buy");
      const left = STORE.freeShippingAbove - (Cart.subtotal ? Cart.subtotal() : 0);
      buy.outerHTML = `
        <div class="qv-added" role="status">
          <span class="qv-added-ico">${ICON.check}</span>
          <div class="qv-added-text">
            <strong>Added to your bag</strong>
            <span>Size ${E(st.size)} · Qty ${st.qty} · ${money(p.price * st.qty)}</span>
            <small>${left > 0 ? `Add ${money(left)} more for free shipping` : "You've unlocked free shipping"}</small>
          </div>
          <div class="qv-added-actions">
            <button type="button" class="btn btn-block" data-qv-viewbag>View bag</button>
            <button type="button" class="btn btn-ghost btn-block" data-qv-close>Keep shopping</button>
          </div>
        </div>`;
      const vb = root.querySelector("[data-qv-viewbag]");
      if (vb) vb.focus({ preventScroll: true });
    }

    /* delegated events on the modal content */
    function bind() {
      root.addEventListener("click", e => {
        const t = e.target.closest("button, a");
        if (!t || !root.contains(t)) return;
        if (t.dataset.qvNav) return goSlide(st.slide + +t.dataset.qvNav);
        if (t.dataset.qvSlide) return goSlide(+t.dataset.qvSlide);
        if (t.dataset.qvVariant) return swapVariant(t.dataset.qvVariant);
        if (t.dataset.qvSize) return pickSize(t.dataset.qvSize);
        if (t.dataset.qvQty) return setQty(+t.dataset.qvQty);
        if (t.hasAttribute("data-qv-add")) return add(t);
        if (t.hasAttribute("data-qv-close")) return closeModal();
        if (t.hasAttribute("data-qv-viewbag")) {
          closeModal();
          if (typeof openCart === "function") setTimeout(openCart, 60);
          return;
        }
        if (t.hasAttribute("data-qv-fit")) {
          const id = st.id, keep = { ...st };
          FitFinder.open({
            productId: id,
            onPick: size => open(id, { size, qty: keep.qty }),
            onCancel: () => open(id, { size: keep.size, qty: keep.qty, slide: keep.slide })
          });
        }
      });
      root.addEventListener("keydown", e => {
        if (!e.target.closest(".qv-stage, .qv-thumbs")) return;
        if (e.key === "ArrowRight") { e.preventDefault(); goSlide(st.slide + 1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); goSlide(st.slide - 1); }
      });
      let x0 = null, y0 = null;
      root.addEventListener("touchstart", e => {
        if (!e.target.closest(".qv-stage")) return;
        x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
      }, { passive: true });
      root.addEventListener("touchend", e => {
        if (x0 === null) return;
        const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) goSlide(st.slide + (dx < 0 ? 1 : -1));
        x0 = y0 = null;
      }, { passive: true });
    }

    function open(id, opts = {}) {
      const p = find(id);
      if (!p) { say("Sorry, that product is no longer available.", "error"); return null; }
      if (!hasModal()) { location.href = `product.html?id=${encodeURIComponent(id)}`; return null; }
      st = { id, slide: opts.slide || 0, size: opts.size && p.sizes.includes(opts.size) ? opts.size : null, qty: opts.qty || 1 };
      const host = Modal.open(`<div class="qv" aria-labelledby="qv-title"></div>`, { size: "l", label: p.name });
      root = hostOf(host, ".qv");
      if (!root) return null;
      paint();
      bind();
      return root;
    }

    return { open };
  })();

  /* =====================================================================
     FIT FINDER
     ---------------------------------------------------------------------
     Size heuristic (Indian menswear, garment ease included):
       BMI   = kg / (m²)
       chest = 19.5 + 0.86·BMI + 0.045·(cm − 170)            (inches, body + ease)
               fit pref: Slim −0.8", Regular 0, Relaxed +1.2"
       Top size by chest:  <38 S · 38–40 M · 40–42 L · 42–44 XL · ≥44 XXL
       Shirt collar:        S 38 · M 40 · L 42 · XL 44 · XXL 46
       waist = 10 + 0.95·BMI + 0.06·(cm − 170)                (inches)
               fit pref: Slim −0.5", Regular 0, Relaxed +0.8"
       Waist size = nearest even number, clamped 28–40.
       Letter-sized bottoms (joggers): 28–30 S · 32 M · 34 L · 36 XL · 38+ XXL
     Sanity checks (regular fit): 165/55 → S·38·28 · 170/64 → M·40·32(30) · 172/70 → M/L·40·32
                    180/85 → XL(L)·44·36 · 178/95 → XXL·46·38 · 155/45 → S·38·28
     Confidence: if the estimate sits within 0.5" of a size boundary we say
     "between sizes" and name the alternative; otherwise "most men with your build choose X".
     ===================================================================== */
  const FitFinder = (() => {
    const KEY = "bhakshi_fit";
    const TOPS = ["S", "M", "L", "XL", "XXL"];
    const COLLAR = { S: "38", M: "40", L: "42", XL: "44", XXL: "46" };
    const FITS = [
      { id: "slim", name: "Slim", note: "Close to the body, sharp lines", w: 0.82 },
      { id: "regular", name: "Regular", note: "Easy through chest & waist", w: 1 },
      { id: "relaxed", name: "Relaxed", note: "Roomy, laid-back drape", w: 1.2 }
    ];
    let st = null, root = null, opts = {};

    const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } };
    const save = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* private mode */ } };
    const ftin = cm => { const inch = Math.round(cm / 2.54); return `${Math.floor(inch / 12)} ft ${inch % 12} in`; };

    function recommend({ height, weight, fit }) {
      const bmi = weight / Math.pow(height / 100, 2);
      const chest = 19.5 + 0.86 * bmi + 0.045 * (height - 170) + ({ slim: -0.8, relaxed: 1.2 }[fit] || 0);
      const pos = (chest - 36) / 2;                       // 0 = start of S band
      const ti = clamp(Math.floor(pos), 0, 4);
      const frac = pos - Math.floor(pos);
      let topAlt = null;
      if (pos >= 1 && pos < 5 && frac < 0.25 && ti > 0) topAlt = TOPS[ti - 1];
      if (pos >= 0 && pos < 4 && frac > 0.75 && ti < 4) topAlt = TOPS[ti + 1];
      const top = TOPS[ti];

      const wRaw = 10 + 0.95 * bmi + 0.06 * (height - 170) + ({ slim: -0.5, relaxed: 0.8 }[fit] || 0);
      const waist = clamp(Math.round(wRaw / 2) * 2, 28, 40);
      let waistAlt = null;
      const dw = wRaw - waist;
      if (Math.abs(dw) > 0.5) { const o = waist + (dw > 0 ? 2 : -2); if (o >= 28 && o <= 40) waistAlt = o; }
      const bl = w => (w <= 30 ? "S" : w <= 32 ? "M" : w <= 34 ? "L" : w <= 36 ? "XL" : "XXL");

      return {
        bmi, top, topAlt, collar: COLLAR[top], collarAlt: topAlt && COLLAR[topAlt],
        waist: String(waist), waistAlt: waistAlt && String(waistAlt),
        bottomLetter: bl(waist), bottomLetterAlt: waistAlt && bl(waistAlt) !== bl(waist) ? bl(waistAlt) : null
      };
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
      const want = { top: r.top, collar: r.collar, waist: r.waist, bottomLetter: r.bottomLetter }[sys];
      if (p.sizes.includes(want)) return { sys, want, size: want, exact: true };
      // nearest available
      const order = sys === "top" || sys === "bottomLetter" ? TOPS : null;
      const rank = v => (order ? order.indexOf(v) : Number(v));
      const step = order ? 1 : 2;
      let best = p.sizes[0], bd = Infinity;
      p.sizes.forEach(s => { const d = Math.abs(rank(s) - rank(want)) / step; if (d < bd) { bd = d; best = s; } });
      return { sys, want, size: best, exact: false };
    }

    /* ---------- illustrations ---------- */
    function figure(h, w) {
      const sy = 0.8 + (h - 150) / 50 * 0.2;             // 150cm → .80, 200cm → 1.00
      const bmi = w / Math.pow(h / 100, 2);
      const sx = clamp(0.78 + (bmi - 18) / 14 * 0.5, 0.72, 1.4);
      const topY = 236 - 210 * sy;                        // head-top y after scaling
      const ticks = Array.from({ length: 12 }, (_, i) => 236 - i * 20)
        .map((y, i) => `<line x1="${i % 2 ? 6 : 2}" y1="${y}" x2="12" y2="${y}"/>`).join("");
      return `<svg class="ff-figure" viewBox="0 0 132 240" aria-hidden="true">
        <g stroke="var(--sand)" stroke-width="1.5" stroke-linecap="round">${ticks}<line x1="12" y1="16" x2="12" y2="236"/></g>
        <g class="ff-mark" style="transform: translateY(${topY.toFixed(1)}px)">
          <line x1="12" y1="0" x2="120" y2="0" stroke="var(--saffron)" stroke-width="1.5" stroke-dasharray="3 4"/>
          <circle cx="12" cy="0" r="4" fill="var(--saffron)"/>
        </g>
        <line x1="12" y1="236" x2="124" y2="236" stroke="var(--ink-2)" stroke-width="2" stroke-linecap="round"/>
        <g class="ff-figure-body" style="transform: scale(${sx.toFixed(3)}, ${sy.toFixed(3)})">
          <circle cx="70" cy="40" r="14" fill="var(--ink-2)"/>
          <rect x="65" y="50" width="10" height="10" rx="3" fill="var(--ink-2)"/>
          <path d="M95 91L105 88 104 148Q100 155 96 148zM45 91L35 88 36 148Q40 155 44 148z" fill="var(--ink-2)"/>
          <path d="M52 126H88L86 226Q81 233 76 226L70 152 64 226Q59 233 54 226z" fill="var(--ink-2)"/>
          <path d="M60 58q10 7 20 0l17 7 9 22-12 6-5-10 1 47H50l1-47-5 10-12-6 9-22z" fill="var(--saffron)"/>
          <path d="M60 58q10 7 20 0" fill="none" stroke="var(--saffron-dark)" stroke-width="2"/>
        </g>
      </svg>`;
    }
    function teeArt(w) {
      const fake = { id: "ff-tee", name: "Tee", family: "ff", colorName: "", fit: "", fabric: "", category: "tshirts",
        price: 0, mrp: 0, color: "#3d3833", shape: "tee", sizes: [], tags: [], stock: 1, images: [], desc: "" };
      let svg = "";
      try { svg = Art.garment(fake, { bg: false }); } catch (e) { svg = ""; }
      if (!svg) svg = `<svg viewBox="0 0 200 250"><path d="M70 50 L88 40 Q100 52 112 40 L130 50 L158 78 L142 94 L130 84 L130 200 L70 200 L70 84 L58 94 L42 78 Z" fill="#e6dccb"/></svg>`;
      return `<div class="ff-tee" style="--w:${w}">${svg}</div>`;
    }

    /* ---------- screens ---------- */
    const STEPS = ["height", "weight", "fit"];

    function head() {
      const n = typeof st.step === "number" ? st.step : 3;
      const pct = st.step === "saved" ? 0 : st.step === "result" ? 100 : ((n + 1) / 3) * 100;
      const label = st.step === "result" ? "Your fit" : st.step === "saved" ? "Welcome back" : `Step ${n + 1} of 3`;
      return `<header class="ff-head">
        <div class="ff-toprow"><p class="eyebrow">${ICON.tape} BHAKSHI Fit Finder</p>
          ${opts.onCancel ? `<button type="button" class="ff-backlink" data-ff-cancel>${ICON.chevL}<span>Back to product</span></button>` : ""}</div>
        <div class="ff-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}" aria-label="Quiz progress"><span style="width:${pct}%"></span></div>
        <p class="ff-stepcount">${label}</p>
      </header>`;
    }

    function screen() {
      const s = st.step;
      if (s === "saved") {
        const r = recommend(st.saved);
        const p = opts.productId && find(opts.productId);
        const fp = p && forProduct(p, r);
        return `<section class="ff-step ff-saved">
          <h2 class="ff-title">Welcome <em>back</em></h2>
          <p class="ff-sub">We remembered your answers from last time.</p>
          <div class="ff-saved-card">
            <div><span>Height</span><b>${st.saved.height} cm</b></div>
            <div><span>Weight</span><b>${st.saved.weight} kg</b></div>
            <div><span>Fit</span><b>${E(cap(st.saved.fit))}</b></div>
            <div class="ff-saved-size"><span>Your size</span><b>${fp ? E(fp.size) : `${r.top} · ${r.collar} · ${r.waist}`}</b></div>
          </div>
          <div class="ff-actions ff-actions-stack">
            <button type="button" class="btn btn-accent btn-block" data-ff-use>Use my saved size</button>
            <button type="button" class="btn btn-ghost btn-block" data-ff-restart>Retake the quiz</button>
          </div>
        </section>`;
      }
      if (s === 0) return `<section class="ff-step">
          <h2 class="ff-title">How <em>tall</em> are you?</h2>
          <p class="ff-sub">Drag the slider — barefoot height works best.</p>
          <div class="ff-measure">
            <div class="ff-fig-wrap">${figure(st.height, st.weight)}</div>
            <div class="ff-readout"><output class="ff-big" data-ff-out>${st.height}<small>cm</small></output><span class="ff-alt" data-ff-alt>${ftin(st.height)}</span></div>
          </div>
          ${range("height", 150, 200, st.height, "Height in centimetres", ["150", "175", "200 cm"])}
        </section>`;
      if (s === 1) return `<section class="ff-step">
          <h2 class="ff-title">And your <em>weight</em>?</h2>
          <p class="ff-sub">A rough number is fine. It stays on your device.</p>
          <div class="ff-measure">
            <div class="ff-fig-wrap">${figure(st.height, st.weight)}</div>
            <div class="ff-readout"><output class="ff-big" data-ff-out>${st.weight}<small>kg</small></output><span class="ff-alt" data-ff-alt>${Math.round(st.weight * 2.2046)} lbs</span></div>
          </div>
          ${range("weight", 45, 120, st.weight, "Weight in kilograms", ["45", "80", "120 kg"])}
        </section>`;
      if (s === 2) return `<section class="ff-step">
          <h2 class="ff-title">How do you like it to <em>fit</em>?</h2>
          <p class="ff-sub">Pick the silhouette you reach for most often.</p>
          <div class="ff-fits" role="radiogroup" aria-label="Fit preference">
            ${FITS.map(f => `<button type="button" class="ff-fit${st.fit === f.id ? " active" : ""}" role="radio" aria-checked="${st.fit === f.id}" data-ff-fitpick="${f.id}">
              ${teeArt(f.w)}<b>${f.name}</b><small>${f.note}</small><span class="ff-tick" aria-hidden="true">${ICON.check}</span></button>`).join("")}
          </div>
        </section>`;
      return resultScreen();
    }

    const cap = s => String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);

    function range(name, min, max, val, label, ticks) {
      const pct = ((val - min) / (max - min)) * 100;
      return `<div class="ff-range">
        <input type="range" min="${min}" max="${max}" step="1" value="${val}" data-ff-range="${name}" aria-label="${label}" style="--p:${pct}%">
        <div class="ff-ticks" aria-hidden="true">${ticks.map(t => `<span>${t}</span>`).join("")}</div>
      </div>`;
    }

    function resultScreen() {
      const r = recommend(st);
      const p = opts.productId && find(opts.productId);
      const fp = p && forProduct(p, r);
      const tiles = [
        { sys: "top", label: "T-shirts, polos & kurtas", val: r.top, alt: r.topAlt },
        { sys: "collar", label: "Shirts · collar size", val: r.collar, alt: r.collarAlt },
        { sys: "waist", label: "Jeans & trousers · waist", val: r.waist, alt: r.waistAlt }
      ];
      const matchSys = fp ? (fp.sys === "bottomLetter" ? "waist" : fp.sys) : null;
      const main = fp ? tiles.find(t => t.sys === matchSys) : tiles[0];
      const mainVal = fp ? fp.size : main.val;
      const alt = fp ? (fp.sys === "bottomLetter" ? r.bottomLetterAlt : main.alt) : main.alt;
      const altOK = alt && (!p || p.sizes.includes(alt));
      const build = `${st.height} cm, ${st.weight} kg`;
      const note = !fp || fp.exact
        ? (altOK
          ? `You're between <b>${E(mainVal)}</b> and <b>${E(alt)}</b>. Go with <b>${E(mainVal)}</b> for a ${st.fit} fit, or <b>${E(alt)}</b> if you like ${Number(alt) > Number(mainVal) || TOPS.indexOf(alt) > TOPS.indexOf(mainVal) ? "a little more room" : "it closer to the body"}.`
          : `Most men with your build (${build}) choose <b>${E(mainVal)}</b>${fp ? " in this style" : ""}.`)
        : `<b>${E(fp.want)}</b> isn't made in this style — <b>${E(fp.size)}</b> is the closest and will feel ${TOPS.indexOf(fp.size) > TOPS.indexOf(fp.want) || Number(fp.size) > Number(fp.want) ? "a touch roomier" : "a touch snugger"}.`;
      const conf = altOK || (fp && !fp.exact) ? { k: "mid", t: "Good match" } : { k: "high", t: "Great match" };
      const soldOut = p && p.stock <= 0;

      return `<section class="ff-step ff-result">
        ${p ? `<div class="ff-prod">${pic(p, 0, "front")}<div><small>Recommended for</small><b>${E(p.name)}</b></div></div>` : ""}
        <h2 class="ff-title">Your size is <em class="ff-size-word">${E(mainVal)}</em></h2>
        <div class="ff-tiles">
          ${tiles.map(t => `<div class="ff-tile${t.sys === (matchSys || "top") ? " is-match" : ""}">
            ${t.sys === matchSys && p ? `<span class="ff-tag">This product</span>` : ""}
            <span class="ff-tile-val">${E(t.sys === matchSys && fp ? fp.size : t.val)}</span>
            <span class="ff-tile-label">${t.label}</span>
          </div>`).join("")}
        </div>
        <div class="ff-note ff-note-${conf.k}">
          <span class="ff-conf"><i></i><i></i><i></i>${conf.t}</span>
          <p>${note}</p>
        </div>
        <p class="ff-basis">Based on ${st.height} cm (${ftin(st.height)}) · ${st.weight} kg · ${cap(st.fit)} fit
          <button type="button" class="ff-edit" data-ff-goto="0">Edit</button></p>
        <div class="ff-actions ff-actions-stack">
          ${p ? (soldOut
            ? `<button type="button" class="btn btn-block" disabled>Currently sold out</button>`
            : `<button type="button" class="btn btn-accent btn-block btn-lg" data-ff-pick="${E(fp.size)}">Select size ${E(fp.size)}</button>`)
            : `<a class="btn btn-accent btn-block" href="shop.html">Shop in your size</a>`}
          <button type="button" class="btn btn-ghost btn-block" data-ff-restart>Start over</button>
        </div>
      </section>`;
    }

    function nav() {
      if (st.step === "saved" || st.step === "result") return "";
      return `<footer class="ff-nav">
        <button type="button" class="btn btn-ghost" data-ff-back ${st.step === 0 ? "disabled" : ""}>Back</button>
        <button type="button" class="btn btn-accent" data-ff-next>${st.step === 2 ? "See my size" : "Next"}</button>
      </footer>`;
    }

    function render(dir = 0) {
      root.innerHTML = head() + `<div class="ff-stage">${screen()}</div>` + nav();
      root.classList.toggle("ff-saved-mode", st.step === "saved");
      const step = root.querySelector(".ff-step");
      if (dir && !reduced()) step.classList.add(dir > 0 ? "ff-in-fwd" : "ff-in-back");
      if (st.step === "result") {
        save({ height: st.height, weight: st.weight, fit: st.fit, ...pick(recommend(st)), ts: Date.now() });
        const w = root.querySelector(".ff-size-word");
        if (w && !reduced()) w.classList.add("pop");
      }
      const focusEl = root.querySelector("[data-ff-range], .ff-fit.active, .ff-fit, [data-ff-pick], [data-ff-use]");
      if (focusEl && dir) focusEl.focus({ preventScroll: true });
    }
    const pick = r => ({ top: r.top, collar: r.collar, waist: r.waist });

    function go(step, dir) {
      st.step = step;
      render(dir);
    }

    function onInput(e) {
      const inp = e.target.closest("[data-ff-range]");
      if (!inp) return;
      const v = +inp.value, name = inp.dataset.ffRange;
      st[name] = v;
      inp.style.setProperty("--p", ((v - inp.min) / (inp.max - inp.min)) * 100 + "%");
      const out = root.querySelector("[data-ff-out]"), alt = root.querySelector("[data-ff-alt]");
      if (name === "height") { out.innerHTML = `${v}<small>cm</small>`; alt.textContent = ftin(v); }
      else { out.innerHTML = `${v}<small>kg</small>`; alt.textContent = `${Math.round(v * 2.2046)} lbs`; }
      const fig = root.querySelector(".ff-fig-wrap");
      if (fig) fig.innerHTML = figure(st.height, st.weight);
    }

    function onClick(e) {
      const t = e.target.closest("button, a");
      if (!t || !root.contains(t)) return;
      if (t.hasAttribute("data-ff-next")) {
        if (st.step === 2 && !st.fit) { st.fit = "regular"; }
        return go(st.step === 2 ? "result" : st.step + 1, 1);
      }
      if (t.hasAttribute("data-ff-back")) return st.step > 0 && go(st.step - 1, -1);
      if (t.dataset.ffFitpick) {
        st.fit = t.dataset.ffFitpick;
        root.querySelectorAll(".ff-fit").forEach(b => { const on = b === t; b.classList.toggle("active", on); b.setAttribute("aria-checked", on); });
        clearTimeout(st._auto);
        st._auto = setTimeout(() => st.step === 2 && go("result", 1), reduced() ? 0 : 420);
        return;
      }
      if (t.hasAttribute("data-ff-cancel")) return opts.onCancel && opts.onCancel();
      if (t.dataset.ffGoto) return go(+t.dataset.ffGoto, -1);
      if (t.hasAttribute("data-ff-restart")) return go(0, 1);
      if (t.hasAttribute("data-ff-use")) {
        Object.assign(st, { height: st.saved.height, weight: st.saved.weight, fit: st.saved.fit });
        return go("result", 1);
      }
      if (t.dataset.ffPick) {
        const size = t.dataset.ffPick, cb = opts.onPick;
        st.picked = true;
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
      const saved = load();
      const valid = saved && saved.height && saved.weight && saved.fit;
      st = {
        height: valid ? saved.height : 172,
        weight: valid ? saved.weight : 70,
        fit: valid ? saved.fit : "regular",
        saved: valid ? saved : null,
        step: valid ? "saved" : 0
      };
      if (o.step !== undefined) st.step = o.step;          // debug / deep-link: 0,1,2,"result"
      const host = Modal.open(`<div class="ff" aria-label="Fit Finder"></div>`, { size: "m", label: "Find your size" });
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
    const countEl = document.getElementById("wl-count");
    const emptyEl = document.getElementById("wl-empty");
    const fullEl = document.getElementById("wl-full");
    const shareBtn = document.getElementById("wl-share");
    const moreEl = document.getElementById("wl-more");

    const ids = () => {
      const raw = typeof Wishlist !== "undefined" ? Wishlist.get() : [];
      return (raw || []).map(x => (typeof x === "string" ? x : x && x.id)).filter(id => find(id));
    };
    const toList = arr => (arr || []).map(x => (typeof x === "string" ? find(x) : x && x.id ? find(x.id) : null)).filter(Boolean);
    const card = p => (typeof productCard === "function" ? productCard(p) : "");
    const refresh = () => { if (typeof refreshReveal === "function") refreshReveal(); };
    const base = location.href.split(/[?#]/)[0].replace(/[^/]*$/, "");

    let current = [];

    function setCount(n) {
      countEl.textContent = n ? `${n} ${n === 1 ? "piece" : "pieces"} saved` : "Nothing saved yet";
      document.title = `Wishlist${n ? ` (${n})` : ""} | ${STORE.name}`;
    }

    function shareLink(list) {
      const lines = list.map((p, i) => `${i + 1}. ${p.name} — ${money(p.price)}\n${base}product.html?id=${encodeURIComponent(p.id)}`);
      const msg = `My ${STORE.name} wishlist ✨\n\n${lines.join("\n\n")}\n\nShop: ${base}shop.html`;
      return `https://wa.me/?text=${encodeURIComponent(msg)}`;
    }

    function renderMore(list) {
      const exclude = new Set(list.map(p => p.id));
      let recent = [];
      try { recent = typeof Recent !== "undefined" ? toList(Recent.list()) : []; } catch (e) { recent = []; }
      recent = recent.filter(p => !exclude.has(p.id));
      let items = recent, title = `Recently <em>viewed</em>`, eyebrow = "Pick up where you left off";
      if (!items.length) {
        items = PRODUCTS.filter(p => p.tags.includes("bestseller") && p.stock > 0 && !exclude.has(p.id));
        title = `Our <em>bestsellers</em>`; eyebrow = list.length ? "You might also like" : "Start with the favourites";
      }
      if (!items.length) { moreEl.hidden = true; return; }
      moreEl.hidden = false;
      moreEl.innerHTML = `<div class="container">
          <div class="section-head"><div><p class="eyebrow">${eyebrow}</p><h2 class="display-s">${title}</h2></div>
          <a class="link-arrow" href="shop.html">Shop all</a></div>
        </div>
        <div class="container"><div class="scroller wl-scroller">${items.slice(0, 12).map(card).join("")}</div></div>`;
    }

    function render() {
      const list = toList(ids());
      current = list.map(p => p.id);
      setCount(list.length);
      const empty = !list.length;
      emptyEl.hidden = !empty;
      fullEl.hidden = empty;
      shareBtn.hidden = empty;
      grid.innerHTML = list.map(card).join("");
      if (!empty) shareBtn.href = shareLink(list);
      renderMore(list);
      refresh();
    }

    document.addEventListener("wishlist:change", () => {
      const now = ids();
      const removed = current.filter(id => !now.includes(id));
      const added = now.filter(id => !current.includes(id));
      if (added.length || !removed.length || reduced()) { render(); return; }
      // animate removed cards out, then re-render
      current = now;
      setCount(now.length);
      const list = toList(now);
      if (list.length) shareBtn.href = shareLink(list);
      removed.forEach(id => {
        const el = grid.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
        if (!el) return;
        el.style.height = el.offsetHeight + "px";
        el.classList.add("wl-out");
      });
      setTimeout(render, 420);
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
