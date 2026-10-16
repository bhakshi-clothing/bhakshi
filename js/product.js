/* BHAKSHI — product detail page.
   Renders from ?id=… ; colour swatches swap content in place (history.pushState). */
(() => {
  "use strict";
  if (document.body.dataset.page !== "product") return;

  const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fineHover = matchMedia("(hover: hover) and (pointer: fine)");
  const TOPS = ["tee", "polo", "shirt", "kurta", "hoodie", "jacket"];
  const BOTTOMS = ["pants", "shorts"];
  const OCC = ["office", "casual", "athleisure", "festive"];
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const PIN_KEY = "bhakshi_pincode";

  const root = $("#pdpRoot");
  let P = null;
  const sel = { size: null, qty: 1 };
  let gallery = { idx: 0 };

  /* ---------- small helpers ---------- */
  const variants = p => (typeof variantsOf === "function" ? variantsOf(p) : PRODUCTS.filter(x => x.family === p.family));
  const media = (p, s) => productImage(p, s.i, s.view);
  const splitName = p => { const [a, b] = p.name.split(" — "); return { base: a, colour: b || "" }; };
  const isSold = p => p.stock <= 0;
  const url = p => new URL("product.html?id=" + encodeURIComponent(p.id), location.href).href;
  const wa = text => `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(text)}`;
  const swatch = c => (typeof Art !== "undefined" && Art.swatch ? Art.swatch(c) : `<span class="pdp-swatch-dot" style="background:${esc(c)}"></span>`);
  const wished = id => (typeof Wishlist !== "undefined" && Wishlist.has ? Wishlist.has(id) : false);
  const fresh = list => (list || []).map(x => (typeof x === "string" ? getProduct(x) : x)).filter(Boolean);
  const say = (msg, type) => { try { toast(msg, { type }); } catch (e) { /* ignore */ } };

  function slidesOf(p) {
    if (p.images && p.images.length) return p.images.map((_, i) => ({ i, view: "front", label: `Photo ${i + 1}` }));
    return [{ i: 0, view: "front", label: "Front" }, { i: 0, view: "back", label: "Back" }, { i: 0, view: "detail", label: "Fabric detail" }];
  }

  /* ---------- modal (shared contract, with a tiny fallback) ---------- */
  let localModal = null;
  const ModalAPI = {
    open(html, opts) {
      if (typeof Modal !== "undefined" && Modal.open) return Modal.open(html, opts);
      ModalAPI.close();
      const wrap = document.createElement("div");
      wrap.className = "sx-modal";
      wrap.dataset.size = opts.size || "m";
      wrap.innerHTML = `<div class="sx-overlay" data-sx-close></div><div class="sx-panel" role="dialog" aria-modal="true" aria-label="${esc(opts.label || "")}"><button class="sx-x" data-sx-close aria-label="Close">✕</button><div class="sx-content">${html}</div></div>`;
      document.body.appendChild(wrap);
      document.body.style.overflow = "hidden";
      wrap.addEventListener("click", e => e.target.closest("[data-sx-close]") && ModalAPI.close());
      wrap.addEventListener("keydown", e => e.key === "Escape" && ModalAPI.close());
      requestAnimationFrame(() => wrap.classList.add("open"));
      localModal = wrap;
      setTimeout(() => { const f = wrap.querySelector(".sx-content button, .sx-content input"); (f || wrap.querySelector(".sx-x")).focus(); }, 50);
      return wrap.querySelector(".sx-content");
    },
    close() {
      if (localModal) { localModal.remove(); localModal = null; document.body.style.overflow = ""; return; }
      if (typeof Modal !== "undefined" && Modal.close) Modal.close();
    }
  };

  /* ---------- size charts (inches) ---------- */
  const CHARTS = {
    tops: { title: "Tops", note: "Body measurements. Measure around the fullest part of the chest, under the arms.",
      cols: ["Chest", "Length", "Shoulder"], rows: { S: [38, 27, 17], M: [40, 28, 17.5], L: [42, 29, 18], XL: [44, 30, 18.5], XXL: [46, 31, 19] } },
    formal: { title: "Formal shirts (collar sizes)", note: "Size = chest in inches. Collar is measured around the base of the neck, with one finger of room.",
      cols: ["Collar", "Chest", "Length", "Sleeve"], alias: { 38: "S", 40: "M", 42: "L", 44: "XL", 46: "XXL" },
      rows: { 38: [15, 40, 29, 24], 40: [15.5, 42, 29.5, 24.5], 42: [16, 44, 30, 25], 44: [16.5, 46, 30.5, 25.5], 46: [17, 48, 31, 26] } },
    bottoms: { title: "Bottoms", note: "Waist is measured where you usually wear your trousers; inseam from crotch to hem.",
      cols: ["Waist", "Hip", "Inseam"], rows: { 28: [28, 36, 31], 30: [30, 38, 31], 32: [32, 40, 32], 34: [34, 42, 32], 36: [36, 44, 32], 38: [38, 46, 32], 40: [40, 48, 32] } },
    shorts: { title: "Shorts", note: "Above-knee cut. Inseam measured from crotch to hem.",
      cols: ["Waist", "Hip", "Inseam"], rows: { 28: [28, 36, 7], 30: [30, 38, 7], 32: [32, 40, 7.5], 34: [34, 42, 7.5], 36: [36, 44, 8] } },
    easy: { title: "Elastic-waist bottoms", note: "Elasticated waist with drawcord. Pick by your usual trouser waist.",
      cols: ["Waist", "Hip", "Inseam"], rows: { S: [[28, 30], 37, 29], M: [[30, 32], 39, 29.5], L: [[32, 34], 41, 30], XL: [[34, 36], 43, 30.5], XXL: [[36, 38], 45, 31] } }
  };
  function chartsFor(p) {
    const numeric = /^\d+$/.test(p.sizes[0]);
    if (p.shape === "coord") return [CHARTS.tops, CHARTS.easy];
    if (p.shape === "shorts") return [numeric ? CHARTS.shorts : CHARTS.easy];
    if (p.shape === "pants") return [numeric ? CHARTS.bottoms : CHARTS.easy];
    if (numeric) return [CHARTS.formal];
    return [CHARTS.tops];
  }
  const cell = (v, unit) => {
    const f = n => (unit === "cm" ? Math.round(n * 2.54) : n);
    return Array.isArray(v) ? `${f(v[0])}–${f(v[1])}` : f(v);
  };
  function chartTable(ch, p, unit) {
    const sizes = p.sizes.filter(s => ch.rows[s]);
    return `<div class="sg-block">
      <h3 class="sg-h">${esc(ch.title)}</h3>
      <div class="sg-scroll"><table class="sg-table">
        <thead><tr><th scope="col">Size</th>${ch.cols.map(c => `<th scope="col">${c} <small>(${unit})</small></th>`).join("")}${isSold(p) ? "" : `<th><span class="sr-only">Select</span></th>`}</tr></thead>
        <tbody>${sizes.map(s => `<tr class="${sel.size === s ? "is-sel" : ""}">
          <th scope="row">${esc(s)}${ch.alias && ch.alias[s] ? ` <small>${ch.alias[s]}</small>` : ""}</th>
          ${ch.rows[s].map(v => `<td>${cell(v, unit)}</td>`).join("")}
          ${isSold(p) ? "" : `<td><button type="button" class="sg-pick" data-sg-pick="${esc(s)}" aria-label="Select size ${esc(s)}">${sel.size === s ? "Selected" : "Select"}</button></td>`}
        </tr>`).join("")}</tbody>
      </table></div>
      <p class="sg-note">${esc(ch.note)}</p>
    </div>`;
  }
  function openSizeGuide() {
    const p = P;
    let unit = localStorage.getItem("bhakshi_unit") === "cm" ? "cm" : "in";
    const body = () => chartsFor(p).map(ch => chartTable(ch, p, unit)).join("");
    const html = `<div class="sg">
      <p class="eyebrow">Size guide</p>
      <h2 class="sg-title">${esc(splitName(p).base)}</h2>
      <p class="sg-sub">${esc(p.fit)} fit · ${esc(p.fabric)}</p>
      <div class="sg-units" role="radiogroup" aria-label="Units">
        <button type="button" role="radio" data-unit="in" aria-checked="${unit === "in"}">Inches</button>
        <button type="button" role="radio" data-unit="cm" aria-checked="${unit === "cm"}">Centimetres</button>
      </div>
      <div data-sg-body>${body()}</div>
      <div class="sg-tip">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 17 17 3l4 4L7 21H3z"/><path d="m7 13 2 2m2-6 2 2m2-6 2 2"/></svg>
        <p><b>Between sizes?</b> Size up for a relaxed drape, or size down for a closer fit. ${p.fit === "Oversized" ? "This style is cut oversized, so your usual size already fits loose." : ""}
        Still unsure? <a href="${wa(`Hi ${STORE.name}! Can you help me pick a size for "${p.name}"?`)}" target="_blank" rel="noopener">Ask us on WhatsApp</a>.</p>
      </div>
    </div>`;
    const c = ModalAPI.open(html, { size: "m", label: "Size guide" });
    if (!c) return;
    c.addEventListener("click", e => {
      const u = e.target.closest("[data-unit]");
      if (u) {
        unit = u.dataset.unit; localStorage.setItem("bhakshi_unit", unit);
        $$("[data-unit]", c).forEach(b => b.setAttribute("aria-checked", b.dataset.unit === unit));
        $("[data-sg-body]", c).innerHTML = body();
        return;
      }
      const pk = e.target.closest("[data-sg-pick]");
      if (pk) { setSize(pk.dataset.sgPick); ModalAPI.close(); say(`Size ${pk.dataset.sgPick} selected`); }
    });
  }

  /* ---------- delivery estimate ---------- */
  function addWorkDays(from, n) {
    const d = new Date(from);
    let k = 0;
    while (k < n) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0) k++; }
    return d;
  }
  const fmtDate = d => `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  function estimate(pin) {
    const out = $("#pinOut", root);
    if (!out) return;
    if (!/^[1-9]\d{5}$/.test(pin)) {
      out.innerHTML = `<p class="pin-err">Please enter a valid 6-digit pincode.</p>`;
      $("#pin", root).setAttribute("aria-invalid", "true");
      return;
    }
    $("#pin", root).removeAttribute("aria-invalid");
    localStorage.setItem(PIN_KEY, pin);
    const now = new Date();
    const a = addWorkDays(now, 1 + 3), b = addWorkDays(now, 2 + 7);
    const cod = STORE.codFee !== -1;
    const free = P.price >= STORE.freeShippingAbove;
    out.innerHTML = `<ul class="pin-res">
      <li><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
        <span>Delivery to <b>${pin}</b> by <b>${fmtDate(a)} – ${fmtDate(b)}</b></span></li>
      <li class="${cod ? "" : "is-off"}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>
        <span>${cod ? `Cash on Delivery available${STORE.codFee > 0 ? ` <small>(+${rupee(STORE.codFee)})</small>` : ""}` : "Cash on Delivery isn't available right now. Pay securely by UPI."}</span></li>
      <li><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 12l4 4L19 6"/></svg>
        <span>${free ? "Free shipping on this item" : `Free shipping on orders above ${rupee(STORE.freeShippingAbove)}`}</span></li>
    </ul>`;
  }

  /* ---------- markup ---------- */
  const ICON = {
    heart: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 20s-7-4.4-9.2-9A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5C19 15.6 12 20 12 20z"/></svg>`,
    wa: `<svg width="18" height="18" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.6a10.6 10.6 0 0 1-5.4-1.5l-.4-.2-3.9 1 1-3.8-.2-.4A10.6 10.6 0 1 1 16 26.6zm5.8-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.7 8.7 0 0 1-4.3-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.7 3.7 0 0 0-1.1 2.7 6.4 6.4 0 0 0 1.3 3.4 14.7 14.7 0 0 0 5.6 5c2.1.9 2.9 1 4 .8a3.4 3.4 0 0 0 2.2-1.6 2.8 2.8 0 0 0 .2-1.6c-.1-.1-.3-.2-.6-.4z"/></svg>`,
    ruler: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 17 17 3l4 4L7 21H3z"/><path d="m7 13 2 2m2-6 2 2m2-6 2 2"/></svg>`,
    spark: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>`,
    expand: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>`,
    left: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>`,
    right: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`,
    truck: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>`,
    cash: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v.01M18 15v.01"/></svg>`,
    swap: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>`
  };

  function badges(p) {
    if (isSold(p)) return `<span class="badge badge-dark">Sold out</span>`;
    const b = [];
    if (p.tags.includes("new")) b.push(`<span class="badge">New</span>`);
    if (p.tags.includes("bestseller")) b.push(`<span class="badge badge-accent">Bestseller</span>`);
    return b.join("");
  }

  function galleryHTML(p) {
    const s = slidesOf(p), many = s.length > 1;
    return `<div class="pdp-gallery" data-n="${s.length}">
      ${many ? `<div class="g-thumbs" aria-label="Product views">${s.map((x, i) => `<button type="button" class="g-thumb" data-go="${i}" aria-label="Show ${esc(x.label)} view">${media(p, x)}<span class="g-thumb-l">${esc(x.label)}</span></button>`).join("")}</div>` : ""}
      <div class="g-stage">
        <div class="g-track" tabindex="0" role="region" aria-roledescription="carousel" aria-label="${esc(p.name)} images">
          ${s.map((x, i) => `<figure class="g-slide" data-i="${i}" aria-label="${i + 1} of ${s.length}: ${esc(x.label)}"><div class="g-media">${media(p, x)}</div></figure>`).join("")}
        </div>
        <div class="g-badges">${badges(p)}</div>
        ${many ? `<button type="button" class="g-arrow g-prev" data-step="-1" aria-label="Previous image">${ICON.left}</button>
        <button type="button" class="g-arrow g-next" data-step="1" aria-label="Next image">${ICON.right}</button>
        <div class="g-dots" aria-hidden="true">${s.map((_, i) => `<span class="g-dot" data-dot="${i}"></span>`).join("")}</div>` : ""}
        <button type="button" class="g-expand" data-lightbox aria-label="Open fullscreen gallery">${ICON.expand}</button>
        <span class="g-hint" aria-hidden="true">Hover to zoom · click to expand</span>
        <div class="g-lens" aria-hidden="true"><div class="g-lens-inner"></div></div>
      </div>
    </div>`;
  }

  function careFor(p) {
    const f = p.fabric.toLowerCase();
    if (f.includes("denim")) return ["Wash inside out in cold water", "Wash with similar colours; deep indigo may bleed in the first few washes", "Do not tumble dry", "Dry in shade to keep the wash rich"];
    if (f.includes("linen")) return ["Gentle machine wash, cold", "Do not wring; reshape while damp", "Iron while slightly damp on medium heat", "Dry in shade"];
    if (f.includes("fleece")) return ["Machine wash cold, inside out", "Do not bleach", "Line dry or tumble dry low", "Do not iron directly on the fleece face"];
    if (f.includes("nylon")) return ["Gentle hand wash or spot clean", "Do not iron or dry clean", "Hang to dry away from direct sun"];
    if (f.includes("suiting") || f.includes("viscose")) return ["Gentle machine wash or dry clean", "Iron on medium heat to refresh the crease", "Hang to retain shape"];
    return ["Machine wash cold with similar colours", "Do not bleach", "Iron inside out on medium heat", "Dry in shade to keep colours bright"];
  }

  function accHTML(p) {
    const n = splitName(p);
    const items = [
      ["desc", "Description", `<p>${esc(p.desc)}</p>
        <dl class="pdp-spec"><div><dt>Colour</dt><dd>${esc(p.colorName || n.colour)}</dd></div><div><dt>Fit</dt><dd>${esc(p.fit)}</dd></div>
        <div><dt>Fabric</dt><dd>${esc(p.fabric)}</dd></div><div><dt>Product code</dt><dd>${esc(p.id.toUpperCase())}</dd></div></dl>`],
      ["care", "Fabric &amp; care", `<p><b>${esc(p.fabric)}.</b> Chosen for comfort in Indian weather and cut to hold its shape wash after wash.</p>
        <ul class="pdp-list">${careFor(p).map(c => `<li>${esc(c)}</li>`).join("")}</ul>`],
      ["ship", "Shipping &amp; exchange", `<ul class="pdp-list">
        <li>Dispatched within 1–2 working days; delivered in 3–7 days across India</li>
        <li>Free shipping on orders above ${rupee(STORE.freeShippingAbove)}, otherwise ${rupee(STORE.shippingFee)}</li>
        ${STORE.codFee !== -1 ? `<li>Cash on Delivery available${STORE.codFee > 0 ? ` (${rupee(STORE.codFee)} handling fee)` : ""}, or pay by UPI</li>` : `<li>Pay securely by UPI</li>`}
        <li>Easy size exchange within 7 days of delivery. Unworn, with tags on.</li></ul>
        <p><a class="link-arrow" href="policies.html#exchange">Read our exchange policy</a></p>`]
    ];
    return `<div class="acc">${items.map(([k, t, b], i) => `<div class="acc-item ${i === 0 ? "open" : ""}">
      <h3 class="acc-h"><button type="button" class="acc-head" id="acc-${k}-h" aria-expanded="${i === 0}" aria-controls="acc-${k}">${t}<span class="acc-ic" aria-hidden="true"></span></button></h3>
      <div class="acc-body" id="acc-${k}" role="region" aria-labelledby="acc-${k}-h"><div class="acc-inner">${b}</div></div></div>`).join("")}</div>`;
  }

  function waText(p) {
    return `Hi ${STORE.name}! I'm interested in "${p.name}" (${rupee(p.price)})${sel.size ? `, size ${sel.size}` : ""}. ${url(p)}`;
  }
  function notifyText(p) {
    return `Hi ${STORE.name}! Please notify me when "${p.name}"${sel.size ? ` in size ${sel.size}` : ""} is back in stock. ${url(p)}`;
  }

  function infoHTML(p) {
    const n = splitName(p), sold = isSold(p), vs = variants(p);
    const off = discount(p);
    const stockPct = Math.max(8, Math.min(100, (p.stock / 40) * 100));
    return `<div class="pdp-info">
      <div class="pdp-eyebrow"><a class="eyebrow" href="shop.html?cat=${encodeURIComponent(p.category)}">${esc(catName(p.category))}</a>${p.tags.includes("new") && !sold ? `<span class="pdp-tag">New season</span>` : ""}</div>
      <h1 class="pdp-title">${esc(n.base)}${n.colour ? ` <em>${esc(n.colour)}</em>` : ""}</h1>
      <div class="pdp-price">
        <strong>${rupee(p.price)}</strong>
        ${p.mrp > p.price ? `<s aria-label="MRP ${rupee(p.mrp)}">MRP ${rupee(p.mrp)}</s><span class="pdp-off">${off}% off</span>` : ""}
      </div>
      <p class="pdp-tax">Inclusive of all taxes</p>

      ${vs.length > 1 ? `<div class="pdp-block">
        <p class="pdp-label">Colour <span>${esc(p.colorName || n.colour)}</span></p>
        <div class="pdp-swatches">${vs.map(v => `<a class="pdp-swatch ${v.id === p.id ? "is-current" : ""} ${isSold(v) ? "is-sold" : ""}" href="product.html?id=${encodeURIComponent(v.id)}" data-variant="${esc(v.id)}"
            aria-label="${esc(v.colorName)}${isSold(v) ? " (sold out)" : ""}" ${v.id === p.id ? 'aria-current="true"' : ""} title="${esc(v.colorName)}">${swatch(v.color)}</a>`).join("")}</div>
      </div>` : ""}

      <div class="pdp-chips"><span class="pdp-chip"><b>Fit</b>${esc(p.fit)}</span><span class="pdp-chip"><b>Fabric</b>${esc(p.fabric)}</span></div>

      <div class="pdp-block pdp-size-block" id="sizeBlock">
        <div class="pdp-label-row">
          <p class="pdp-label" id="sizeLbl">Size <span id="sizeVal">${sel.size ? esc(sel.size) : sold ? "" : "Select a size"}</span></p>
          <button type="button" class="pdp-link" data-sizeguide>${ICON.ruler}Size guide</button>
        </div>
        <div class="pdp-sizes" role="group" aria-labelledby="sizeLbl">${p.sizes.map(s =>
          `<button type="button" class="pdp-size" data-sz="${esc(s)}" aria-pressed="${sel.size === s}" ${sold ? "disabled" : ""}>${esc(s)}</button>`).join("")}</div>
        <p class="pdp-size-err" id="sizeErr" role="alert" hidden>Please choose a size to continue.</p>
        ${sold ? "" : `<button type="button" class="pdp-fitfinder" data-fitfinder data-product="${esc(p.id)}">${ICON.spark}<span>Not sure? <b>Find my size</b> in 30 seconds</span></button>`}
      </div>

      ${!sold && p.stock <= 15 ? `<div class="pdp-urgency"><p><span class="pdp-pulse" aria-hidden="true"></span>Only <b>${p.stock} left</b>. Selling fast.</p><span class="pdp-urgency-bar" aria-hidden="true"><i style="width:${stockPct}%"></i></span></div>` : ""}

      <div class="pdp-actions">
        ${sold ? "" : `<div class="qty pdp-qty"><button type="button" data-q="-1" aria-label="Decrease quantity">−</button><input id="qtyIn" type="number" min="1" max="10" value="${sel.qty}" aria-label="Quantity" inputmode="numeric"><button type="button" data-q="1" aria-label="Increase quantity">+</button></div>`}
        <button type="button" class="btn btn-lg pdp-add" id="addBtn" ${sold ? "disabled" : ""}>${sold ? "Sold out" : "Add to bag"}</button>
        <button type="button" class="pdp-wish" data-wish="${esc(p.id)}" aria-pressed="${wished(p.id)}" aria-label="${wished(p.id) ? "Remove from wishlist" : "Add to wishlist"}">${ICON.heart}</button>
      </div>
      ${sold
        ? `<p class="pdp-soldnote">This piece is sold out for now. We restock our bestsellers often.</p>
           <a class="btn btn-wa btn-lg btn-block" id="notifyBtn" target="_blank" rel="noopener" href="${wa(notifyText(p))}">${ICON.wa}<span>Notify me on WhatsApp</span></a>`
        : `<button type="button" class="btn btn-accent btn-lg btn-block pdp-buy" id="buyBtn">Buy now</button>`}
      <a class="pdp-wa" id="waLink" target="_blank" rel="noopener" href="${wa(waText(p))}">${ICON.wa}<span>Questions about fit or fabric? <b>Ask on WhatsApp</b></span></a>

      <div class="pdp-deliver">
        <form class="pdp-pin" id="pinForm" novalidate>
          <label for="pin" class="pdp-label">Check delivery</label>
          <div class="pdp-pin-row"><input id="pin" name="pin" inputmode="numeric" autocomplete="postal-code" maxlength="6" placeholder="Enter 6-digit pincode" value="${esc(localStorage.getItem(PIN_KEY) || "")}">
          <button type="submit" class="pdp-pin-btn">Check</button></div>
        </form>
        <div id="pinOut" aria-live="polite"></div>
      </div>

      <ul class="pdp-perks">
        <li>${ICON.truck}<span><b>Free shipping</b>Above ${rupee(STORE.freeShippingAbove)}</span></li>
        ${STORE.codFee !== -1 ? `<li>${ICON.cash}<span><b>Cash on Delivery</b>Pay at your door</span></li>` : `<li>${ICON.cash}<span><b>UPI payments</b>Fast and secure</span></li>`}
        <li>${ICON.swap}<span><b>7-day exchange</b>Wrong size? Sorted</span></li>
      </ul>

      ${accHTML(p)}
    </div>`;
  }

  function buybarHTML(p) {
    const sold = isSold(p);
    return `<div class="buybar-inner">
      <div class="buybar-thumb">${productImage(p, 0, "front")}</div>
      <div class="buybar-meta"><span class="buybar-name">${esc(splitName(p).base)}</span><span class="buybar-price"><b>${rupee(p.price)}</b>${p.mrp > p.price ? `<s>${rupee(p.mrp)}</s>` : ""}</span></div>
      ${sold ? `<a class="btn btn-wa buybar-btn" target="_blank" rel="noopener" href="${wa(notifyText(p))}">Notify me</a>`
        : `<select class="buybar-size" id="barSize" aria-label="Size"><option value="">Size</option>${p.sizes.map(s => `<option ${sel.size === s ? "selected" : ""}>${esc(s)}</option>`).join("")}</select>
           <button type="button" class="btn buybar-btn" id="barAdd">Add</button>`}
    </div>`;
  }

  /* ---------- complete the look ---------- */
  function complements(p) {
    const want = BOTTOMS.includes(p.shape) ? TOPS : p.shape === "coord" ? ["tee", "hoodie", "jacket", "polo"] : BOTTOMS;
    const occ = p.tags.filter(t => OCC.includes(t));
    const cands = PRODUCTS.filter(x => x.id !== p.id && x.family !== p.family && want.includes(x.shape) && !isSold(x))
      .map(x => ({ x, s: x.tags.filter(t => occ.includes(t)).length * 3 + (x.tags.includes("bestseller") ? 1 : 0) + (x.color !== p.color ? 0.5 : 0) }))
      .sort((a, b) => b.s - a.s);
    const picked = [], cats = new Set();
    cands.forEach(({ x }) => { if (picked.length < 3 && !cats.has(x.category)) { picked.push(x); cats.add(x.category); } });
    return picked;
  }
  function lookHTML(p) {
    const comp = complements(p);
    if (comp.length < 2) return "";
    const items = [p, ...comp];
    const top = TOPS.includes(p.shape) ? p : comp.find(c => TOPS.includes(c.shape));
    const bottom = BOTTOMS.includes(p.shape) ? p : comp.find(c => BOTTOMS.includes(c.shape));
    const visual = top && bottom && typeof Art !== "undefined" && Art.outfit ? Art.outfit(top, bottom) : productImage(p, 0, "front");
    return `<section class="section pdp-look" aria-labelledby="lookH"><div class="container">
      <div class="section-head"><div><p class="eyebrow">Styled together</p><h2 class="display-m" id="lookH">Complete the <em>look</em></h2></div></div>
      <div class="look-grid">
        <div class="look-visual">${visual}</div>
        <div class="look-panel">
          <ul class="look-list">${items.map((x, i) => {
            const sold = isSold(x);
            const on = !sold;
            return `<li class="look-item ${on ? "is-on" : ""}" data-look="${esc(x.id)}">
              <label class="look-check"><input type="checkbox" data-look-on="${esc(x.id)}" ${on ? "checked" : ""} ${sold ? "disabled" : ""} aria-label="Include ${esc(x.name)}"><span class="fbox" aria-hidden="true"></span></label>
              <a class="look-thumb" href="product.html?id=${encodeURIComponent(x.id)}" ${i === 0 ? 'tabindex="-1"' : ""}>${productImage(x, 0, "front")}</a>
              <div class="look-meta">
                ${i === 0 ? `<span class="look-this">This item</span>` : `<span class="look-cat">${esc(catName(x.category))}</span>`}
                <a href="product.html?id=${encodeURIComponent(x.id)}" class="look-name">${esc(x.name)}</a>
                <span class="look-price"><b>${rupee(x.price)}</b>${x.mrp > x.price ? `<s>${rupee(x.mrp)}</s>` : ""}</span>
              </div>
              ${sold ? `<span class="look-sold">Sold out</span>` : `<select class="look-size" data-look-size="${esc(x.id)}" aria-label="Size for ${esc(x.name)}"><option value="">Size</option>${x.sizes.map(s => `<option ${i === 0 && sel.size === s ? "selected" : ""}>${esc(s)}</option>`).join("")}</select>`}
            </li>`;
          }).join("")}</ul>
          <div class="look-foot"><p class="look-total"><span>Total for <b data-look-n>0</b> pieces</span><b data-look-sum></b></p>
            <button type="button" class="btn btn-lg btn-block" data-look-add>Add selected</button></div>
        </div>
      </div>
    </div></section>`;
  }
  function updateLook() {
    const box = $("#pdpLook");
    const on = $$("[data-look-on]", box).filter(c => c.checked);
    const sum = on.reduce((s, c) => s + getProduct(c.dataset.lookOn).price, 0);
    $$(".look-item", box).forEach(li => li.classList.toggle("is-on", !!$("[data-look-on]", li)?.checked));
    const n = $("[data-look-n]", box), s = $("[data-look-sum]", box), btn = $("[data-look-add]", box);
    if (!btn) return;
    n.textContent = on.length;
    s.textContent = rupee(sum);
    btn.textContent = on.length ? `Add selected · ${rupee(sum)}` : "Select pieces to add";
    btn.disabled = !on.length;
  }

  /* ---------- sections below ---------- */
  function scrollerSection(id, eyebrow, title, items, link) {
    if (!items.length) return "";
    return `<section class="section ${id === "more" ? "section-bone" : ""} pdp-rail" aria-labelledby="rail-${id}"><div class="container">
      <div class="section-head"><div><p class="eyebrow">${eyebrow}</p><h2 class="display-m" id="rail-${id}">${title}</h2></div>${link ? `<a class="link-arrow" href="${link}">View all</a>` : ""}</div>
      <div class="scroller">${items.map(productCard).join("")}</div>
    </div></section>`;
  }
  function related(p) {
    const g = (CATEGORIES.find(c => c.id === p.category) || {}).group;
    const grp = id => (CATEGORIES.find(c => c.id === id) || {}).group;
    return PRODUCTS.filter(x => x.id !== p.id && x.family !== p.family)
      .map(x => ({ x, s: (x.category === p.category ? 4 : 0) + (grp(x.category) === g ? 2 : 0) + (x.tags.some(t => p.tags.includes(t)) ? 1 : 0) - (isSold(x) ? 10 : 0) }))
      .sort((a, b) => b.s - a.s).slice(0, 10).map(o => o.x);
  }

  /* ---------- SEO ---------- */
  function seo(p) {
    document.title = `${p.name} | ${STORE.name}`;
    let md = $('meta[name="description"]');
    if (!md) { md = document.createElement("meta"); md.name = "description"; document.head.appendChild(md); }
    const d = `${p.name}: ${p.desc} ${p.fit} fit, ${p.fabric}. ${rupee(p.price)} with Cash on Delivery and 7-day exchange.`;
    md.setAttribute("content", d.length > 160 ? d.slice(0, 157) + "…" : d);
    $('meta[name="robots"]')?.remove();
    let ld = $("#ldProduct");
    if (!ld) { ld = document.createElement("script"); ld.type = "application/ld+json"; ld.id = "ldProduct"; document.head.appendChild(ld); }
    const data = {
      "@context": "https://schema.org", "@type": "Product",
      name: p.name, description: p.desc, sku: p.id, color: p.colorName, material: p.fabric,
      category: catName(p.category),
      brand: { "@type": "Brand", name: STORE.name },
      offers: {
        "@type": "Offer", url: url(p), priceCurrency: "INR", price: String(p.price),
        availability: isSold(p) ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
        itemCondition: "https://schema.org/NewCondition"
      }
    };
    if (p.images && p.images.length) data.image = p.images.map(i => new URL(i, location.href).href);
    ld.textContent = JSON.stringify(data);
  }

  /* ---------- size / qty state ---------- */
  function setSize(s, fromPick) {
    if (!P || isSold(P)) return;
    if (!P.sizes.includes(String(s))) {
      if (fromPick) say(`We'd suggest size ${s}, which this style doesn't come in. Try the size guide.`);
      return;
    }
    sel.size = String(s);
    $$("[data-sz]", root).forEach(b => b.setAttribute("aria-pressed", b.dataset.sz === sel.size));
    const v = $("#sizeVal", root); if (v) v.textContent = sel.size;
    const err = $("#sizeErr", root); if (err) err.hidden = true;
    $("#sizeBlock", root)?.classList.remove("has-error");
    const bs = $("#barSize"); if (bs) bs.value = sel.size;
    const ls = $(`[data-look-size="${CSS.escape(P.id)}"]`); if (ls) ls.value = sel.size;
    const w = $("#waLink", root); if (w) w.href = wa(waText(P));
    if (fromPick) say(`Size ${sel.size} selected for you`, "success");
  }
  function flagSize() {
    const blk = $("#sizeBlock", root), err = $("#sizeErr", root);
    if (err) err.hidden = false;
    if (!blk) return;
    blk.classList.remove("has-error", "shake"); void blk.offsetWidth; blk.classList.add("has-error", "shake");
    const r = blk.getBoundingClientRect();
    if (r.top < 80 || r.bottom > innerHeight) scrollTo({ top: r.top + scrollY - 140, behavior: reduceMotion() ? "auto" : "smooth" });
    setTimeout(() => $(".pdp-size:not(:disabled)", root)?.focus({ preventScroll: true }), 300);
  }
  function addToBag(srcEl, { thenCheckout = false } = {}) {
    if (!P || isSold(P)) return false;
    if (!sel.size) { flagSize(); return false; }
    Cart.add(P.id, sel.size, sel.qty);
    if (thenCheckout) { location.href = "checkout.html"; return true; }
    const fly = typeof flyToCart === "function";
    if (fly) { try { flyToCart(srcEl || $(".g-slide.is-active .g-media", root) || $(".g-media", root)); } catch (e) { /* ignore */ } }
    say(`Added to bag · ${splitName(P).base}, size ${sel.size}${sel.qty > 1 ? ` × ${sel.qty}` : ""}`, "success");
    setTimeout(() => typeof openCart === "function" && openCart(), fly && !reduceMotion() ? 750 : 150);
    return true;
  }

  /* ---------- gallery behaviour ---------- */
  function initGallery(start) {
    const g = $(".pdp-gallery", root);
    const track = $(".g-track", g), slides = $$(".g-slide", g), n = slides.length;
    const stage = $(".g-stage", g);
    let idx = Math.min(start || 0, n - 1), raf = 0;
    const setActive = i => {
      idx = i; gallery.idx = i;
      slides.forEach((s, k) => s.classList.toggle("is-active", k === i));
      $$("[data-go]", g).forEach((b, k) => { b.classList.toggle("is-active", k === i); b.setAttribute("aria-current", k === i); });
      $$("[data-dot]", g).forEach((d, k) => d.classList.toggle("is-active", k === i));
    };
    const go = (i, smooth = true) => {
      i = (i + n) % n;
      track.scrollTo({ left: i * track.clientWidth, behavior: smooth && !reduceMotion() ? "smooth" : "auto" });
      setActive(i);
    };
    track.addEventListener("scroll", () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth)); if (i !== idx && i < n) setActive(i); });
    }, { passive: true });
    track.addEventListener("keydown", e => {
      if (e.key === "ArrowRight") { e.preventDefault(); go(idx + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(idx - 1); }
      if (e.key === "Enter") openLightbox(idx);
    });
    g.addEventListener("click", e => {
      const t = e.target.closest("[data-go]"); if (t) return go(+t.dataset.go);
      const s = e.target.closest("[data-step]"); if (s) return go(idx + +s.dataset.step);
      if (e.target.closest("[data-lightbox]") || e.target.closest(".g-slide")) openLightbox(idx);
    });
    gallery.realign = () => track.isConnected && track.scrollTo({ left: idx * track.clientWidth });
    setActive(idx);
    requestAnimationFrame(() => (track.scrollLeft = idx * track.clientWidth));

    // hover zoom lens (desktop, fine pointer)
    const lens = $(".g-lens", g), inner = $(".g-lens-inner", g);
    const Z = 2.4;
    let lensSlide = null;
    const hide = () => { lens.classList.remove("on"); stage.classList.remove("is-zooming"); };
    stage.addEventListener("mousemove", e => {
      if (!fineHover.matches || innerWidth < 1024) return hide();
      const slide = e.target.closest(".g-slide");
      if (!slide || e.target.closest("button")) return hide();
      const r = slide.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (lensSlide !== slide) {
        inner.innerHTML = $(".g-media", slide).innerHTML;
        lensSlide = slide;
      }
      inner.style.width = r.width * Z + "px";
      inner.style.height = r.height * Z + "px";
      const L = lens.offsetWidth / 2;
      lens.style.transform = `translate(${e.clientX - sr.left - L}px, ${e.clientY - sr.top - L}px)`;
      inner.style.transform = `translate(${-(x * Z - L)}px, ${-(y * Z - L)}px)`;
      lens.classList.add("on");
      stage.classList.add("is-zooming");
    });
    stage.addEventListener("mouseleave", hide);
    track.addEventListener("scroll", () => { lensSlide = null; }, { passive: true });
  }

  function openLightbox(start) {
    const p = P, s = slidesOf(p), n = s.length;
    const html = `<div class="lb">
      <div class="lb-stage">
        <div class="lb-media" data-lb-media></div>
        ${n > 1 ? `<button type="button" class="lb-arrow lb-prev" data-lb-step="-1" aria-label="Previous image">${ICON.left}</button>
        <button type="button" class="lb-arrow lb-next" data-lb-step="1" aria-label="Next image">${ICON.right}</button>` : ""}
      </div>
      <div class="lb-foot">
        <p class="lb-cap"><span>${esc(p.name)}</span><span data-lb-count></span></p>
        ${n > 1 ? `<div class="lb-thumbs">${s.map((x, i) => `<button type="button" data-lb="${i}" aria-label="Show ${esc(x.label)}">${media(p, x)}</button>`).join("")}</div>` : ""}
      </div>
    </div>`;
    const c = ModalAPI.open(html, { size: "l", label: `${p.name}: gallery` });
    if (!c) return;
    const m = $("[data-lb-media]", c);
    let i = 0;
    const show = k => {
      i = (k + n) % n;
      m.classList.remove("is-zoomed");
      m.innerHTML = media(p, s[i]);
      if (!reduceMotion() && m.animate) m.animate([{ opacity: 0, transform: "scale(.985)" }, { opacity: 1, transform: "none" }], { duration: 280, easing: "ease-out" });
      $("[data-lb-count]", c).textContent = `${i + 1} / ${n} · ${s[i].label}`;
      $$("[data-lb]", c).forEach((b, j) => b.setAttribute("aria-current", j === i));
    };
    c.addEventListener("click", e => {
      const t = e.target.closest("[data-lb]"); if (t) return show(+t.dataset.lb);
      const st = e.target.closest("[data-lb-step]"); if (st) return show(i + +st.dataset.lbStep);
      if (e.target.closest("[data-lb-media]")) {
        const r = m.getBoundingClientRect();
        m.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
        m.classList.toggle("is-zoomed");
      }
    });
    m.addEventListener("mousemove", e => {
      if (!m.classList.contains("is-zoomed")) return;
      const r = m.getBoundingClientRect();
      m.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
    });
    c.addEventListener("keydown", e => {
      if (e.key === "ArrowRight") show(i + 1);
      if (e.key === "ArrowLeft") show(i - 1);
    });
    let sx = null;
    m.addEventListener("pointerdown", e => (sx = e.clientX));
    m.addEventListener("pointerup", e => { if (sx !== null && Math.abs(e.clientX - sx) > 40 && !m.classList.contains("is-zoomed")) show(i + (e.clientX < sx ? 1 : -1)); sx = null; });
    show(start || 0);
  }

  /* ---------- accordion ---------- */
  function toggleAcc(btn) {
    const item = btn.closest(".acc-item"), open = !item.classList.contains("open");
    item.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", open);
  }

  /* ---------- sticky buy bar ---------- */
  let barRaf = 0;
  function checkBuyBar() {
    barRaf = 0;
    const bar = $("#buyBar"), btn = $("#addBtn", root);
    const show = !!(btn && P && btn.getBoundingClientRect().bottom < 0);
    if (bar.classList.contains("show") === show) return;
    bar.classList.toggle("show", show);
    bar.setAttribute("aria-hidden", String(!show));
    bar.inert = !show;
    document.body.classList.toggle("has-buybar", show);
  }
  const watchBuyBar = () => checkBuyBar();
  addEventListener("scroll", () => { if (!barRaf) barRaf = requestAnimationFrame(checkBuyBar); }, { passive: true });

  /* ---------- render ---------- */
  function renderNotFound() {
    P = null;
    $("#pdpCrumbs").innerHTML = `<li><a href="index.html">Home</a></li><li><a href="shop.html">Shop</a></li><li aria-current="page"><span>Not found</span></li>`;
    root.innerHTML = `<div class="pdp-404">
      <p class="eyebrow">Error 404</p>
      <h1 class="display-l">This piece has <em>wandered off</em></h1>
      <p>The link may be incomplete, or the style has left the collection. Plenty more where it came from.</p>
      <div class="pdp-404-cta"><a class="btn btn-lg" href="shop.html">Shop all</a><a class="btn btn-ghost btn-lg" href="shop.html?tag=new">New arrivals</a></div>
    </div>`;
    document.title = `Product not found | ${STORE.name}`;
    if (!$('meta[name="robots"]')) document.head.insertAdjacentHTML("beforeend", `<meta name="robots" content="noindex">`);
    $("#ldProduct")?.remove();
    $("#pdpLook").innerHTML = "";
    $("#buyBar").innerHTML = "";
    $("#pdpMore").innerHTML = scrollerSection("more", "Most loved", "Our <em>bestsellers</em>", PRODUCTS.filter(x => x.tags.includes("bestseller") && !isSold(x)), "shop.html?tag=bestseller");
    renderRecent(null);
    if (typeof refreshReveal === "function") refreshReveal();
  }

  function renderRecent(p) {
    if (typeof Recent === "undefined") { $("#pdpRecent").innerHTML = ""; return; }
    const items = fresh(Recent.list(p ? p.id : undefined)).filter(x => !p || x.id !== p.id).slice(0, 10);
    $("#pdpRecent").innerHTML = scrollerSection("recent", "Picking up where you left off", "Recently <em>viewed</em>", items);
  }

  function render(p, { keepGallery = false } = {}) {
    P = p;
    if (!p.sizes.includes(sel.size)) sel.size = null;
    if (p.sizes.length === 1) sel.size = p.sizes[0];
    if (isSold(p)) sel.size = null;
    sel.qty = 1;
    const c = CATEGORIES.find(x => x.id === p.category) || {};
    $("#pdpCrumbs").innerHTML = `<li><a href="index.html">Home</a></li>${c.group ? `<li><a href="shop.html?group=${encodeURIComponent(c.group)}">${esc(c.group)}</a></li>` : ""}
      <li><a href="shop.html?cat=${encodeURIComponent(p.category)}">${esc(catName(p.category))}</a></li><li aria-current="page"><span>${esc(p.name)}</span></li>`;
    root.innerHTML = `<div class="pdp ${isSold(p) ? "is-sold" : ""}">${galleryHTML(p)}${infoHTML(p)}</div>`;
    initGallery(keepGallery ? gallery.idx : 0);
    $("#buyBar").innerHTML = buybarHTML(p);
    $("#pdpLook").innerHTML = lookHTML(p);
    updateLook();
    $("#pdpMore").innerHTML = scrollerSection("more", "More to explore", "You may also <em>like</em>", related(p), `shop.html?cat=${encodeURIComponent(p.category)}`);
    if (typeof Recent !== "undefined") Recent.add(p.id);
    renderRecent(p);
    seo(p);
    const pin = localStorage.getItem(PIN_KEY);
    if (pin) estimate(pin);
    watchBuyBar();
    if (typeof refreshReveal === "function") refreshReveal();
  }

  function swapTo(id, push) {
    const np = getProduct(id);
    if (!np) return renderNotFound();
    if (P && np.id === P.id) return;
    const go = () => {
      if (push) history.pushState({ id }, "", location.pathname + "?id=" + encodeURIComponent(id));
      render(np, { keepGallery: true });
      requestAnimationFrame(() => root.classList.remove("is-swapping"));
    };
    if (reduceMotion()) go();
    else { root.classList.add("is-swapping"); setTimeout(go, 200); }
  }

  /* ---------- events (bound once, delegated) ---------- */
  root.addEventListener("click", e => {
    const v = e.target.closest("[data-variant]");
    if (v && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) { e.preventDefault(); swapTo(v.dataset.variant, true); return; }
    const sz = e.target.closest("[data-sz]"); if (sz) return setSize(sz.dataset.sz);
    if (e.target.closest("[data-sizeguide]")) return openSizeGuide();
    const q = e.target.closest("[data-q]");
    if (q) { sel.qty = Math.max(1, Math.min(10, sel.qty + +q.dataset.q)); $("#qtyIn", root).value = sel.qty; return; }
    if (e.target.closest("#addBtn")) return addToBag($(".g-slide.is-active .g-media", root));
    if (e.target.closest("#buyBtn")) return addToBag(null, { thenCheckout: true });
    const acc = e.target.closest(".acc-head"); if (acc) return toggleAcc(acc);
  });
  root.addEventListener("change", e => {
    if (e.target.id === "qtyIn") { sel.qty = Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)); e.target.value = sel.qty; }
  });
  root.addEventListener("submit", e => {
    if (e.target.id !== "pinForm") return;
    e.preventDefault();
    estimate($("#pin", root).value.trim());
  });
  root.addEventListener("input", e => {
    if (e.target.id === "pin") e.target.value = e.target.value.replace(/\D/g, "").slice(0, 6);
  });

  // Find my size: use FitFinder with a callback when it exists, otherwise fall back to the size guide.
  document.addEventListener("click", e => {
    const ff = e.target.closest("[data-fitfinder]");
    if (!ff || !P || !root.contains(ff)) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof FitFinder !== "undefined" && FitFinder.open) FitFinder.open({ productId: P.id, onPick: s => { ModalAPI.close(); setSize(s, true); } });
    else openSizeGuide();
  }, true);

  $("#buyBar").addEventListener("change", e => { if (e.target.id === "barSize" && e.target.value) setSize(e.target.value); });
  $("#buyBar").addEventListener("click", e => {
    if (!e.target.closest("#barAdd")) return;
    if (!sel.size) {
      const s = $("#barSize"); s.classList.remove("shake"); void s.offsetWidth; s.classList.add("shake"); s.focus();
      say("Please choose a size");
      return;
    }
    addToBag($(".buybar-thumb"));
  });

  $("#pdpLook").addEventListener("change", e => {
    if (e.target.matches("[data-look-on]")) updateLook();
    if (e.target.matches("[data-look-size]")) {
      e.target.classList.remove("is-missing");
      if (P && e.target.dataset.lookSize === P.id && e.target.value) setSize(e.target.value);
    }
  });
  $("#pdpLook").addEventListener("click", e => {
    const btn = e.target.closest("[data-look-add]");
    if (!btn) return;
    const box = $("#pdpLook");
    const on = $$("[data-look-on]", box).filter(c => c.checked).map(c => c.dataset.lookOn);
    const missing = on.filter(id => !$(`[data-look-size="${CSS.escape(id)}"]`, box).value);
    if (missing.length) {
      missing.forEach(id => { const s = $(`[data-look-size="${CSS.escape(id)}"]`, box); s.classList.remove("is-missing", "shake"); void s.offsetWidth; s.classList.add("is-missing", "shake"); });
      $(`[data-look-size="${CSS.escape(missing[0])}"]`, box).focus();
      say(missing.length === 1 ? "Choose a size for the highlighted piece" : `Choose sizes for ${missing.length} pieces`);
      return;
    }
    on.forEach(id => Cart.add(id, $(`[data-look-size="${CSS.escape(id)}"]`, box).value, 1));
    if (typeof flyToCart === "function") { try { flyToCart($(".look-visual", box)); } catch (err) { /* ignore */ } }
    say(`Added ${on.length} piece${on.length > 1 ? "s" : ""} to your bag`, "success");
    setTimeout(() => typeof openCart === "function" && openCart(), typeof flyToCart === "function" && !reduceMotion() ? 750 : 150);
  });

  document.addEventListener("wishlist:change", () => {
    const w = $(".pdp-wish", root);
    if (w && P) { const on = wished(P.id); w.setAttribute("aria-pressed", on); w.setAttribute("aria-label", on ? "Remove from wishlist" : "Add to wishlist"); }
  });
  addEventListener("popstate", () => {
    const id = new URLSearchParams(location.search).get("id");
    const np = getProduct(id);
    np ? render(np, { keepGallery: false }) : renderNotFound();
  });

  addEventListener("resize", () => gallery.realign && gallery.realign(), { passive: true });

  /* ---------- boot ---------- */
  const first = getProduct(new URLSearchParams(location.search).get("id"));
  first ? render(first) : renderNotFound();
})();
