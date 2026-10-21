/* BHAKSHI — product detail page (v3, minimal craft streetwear).
   Renders from ?id=… . Desktop: every view stacked full-width on the left, a sticky info column on
   the right. Mobile: a swipeable gallery with thin progress dots, then the info.
   Colour swatches (only when a family has variants) swap the product in place. */
(() => {
  "use strict";
  if (document.body.dataset.page !== "product") return;

  const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TOPS = ["tee", "polo", "shirt", "kurta", "hoodie", "jacket"];
  const BOTTOMS = ["pants", "shorts"];
  const OCC = ["office", "casual", "athleisure", "festive"];
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const PIN_KEY = "bhakshi_pincode";
  const LOW = 10;

  const root = $("#pdpRoot");
  let P = null;
  const sel = { size: null, qty: 1 };

  /* ---------- contract helpers with safe fallbacks ---------- */
  const DS = () => {
    if (typeof dropState === "function") return dropState();
    const l = STORE.drop && STORE.drop.launch ? new Date(STORE.drop.launch) : null;
    const ms = l ? l - Date.now() : 0;
    return { live: !l || ms <= 0, launch: l, msLeft: Math.max(0, ms) };
  };
  const BUY = p => (typeof isBuyable === "function" ? isBuyable(p) : DS().live && p.stock > 0);
  const MIXON = () => (typeof mixMatchOn === "function" ? mixMatchOn()
    : !!(STORE.features && STORE.features.mixAndMatch) && PRODUCTS.some(x => BOTTOMS.includes(x.shape)));
  const WA = t => (typeof waLink === "function" ? waLink(t) : `https://wa.me/?text=${encodeURIComponent(t)}`);
  const PRICE = n => (typeof rupee === "function" ? rupee(n) : "Rs. " + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const OFF = p => (typeof discount === "function" ? discount(p) : p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0);
  const variants = p => (typeof variantsOf === "function" ? variantsOf(p) : PRODUCTS.filter(x => x.family && x.family === p.family));
  const swatch = c => (typeof Art !== "undefined" && Art.swatch ? Art.swatch(c) : `<span class="pi-swatch-dot" style="background:${esc(c)}"></span>`);
  const short = p => String(p.name).split(" — ")[0];
  const pad2 = n => String(Math.max(0, n | 0)).padStart(2, "0");
  const isSold = p => (p.stock | 0) <= 0;
  const url = p => new URL("product.html?id=" + encodeURIComponent(p.id), location.href).href;
  const wished = id => (typeof Wishlist !== "undefined" && Wishlist.has ? Wishlist.has(id) : false);
  const fresh = l => (l || []).map(x => (typeof x === "string" ? getProduct(x) : x)).filter(Boolean);
  const say = (msg, type) => { try { toast(msg, { type }); } catch (e) { /* ignore */ } };
  const DROP = STORE.drop || { number: "01", name: "" };
  const dropTag = `Drop ${DROP.number}`;
  const prints = p => ({ front: (p.print && p.print.front) || "", back: (p.print && p.print.back) || "" });
  const maxQty = p => Math.max(1, Math.min(10, p.stock | 0));

  function fabricParts(p) {
    const bits = (p.fabric || "").split(",").map(s => s.trim()).filter(Boolean);
    const gsm = (bits.find(b => /gsm/i.test(b)) || "").replace(/\s*gsm/i, " GSM").trim();
    const wash = bits.find(b => /wash/i.test(b)) || "";
    const comp = bits.find(b => !/gsm/i.test(b) && b !== wash) || "";
    return { comp, gsm, wash: wash ? wash.charAt(0).toUpperCase() + wash.slice(1) : "" };
  }
  const fmtLeft = ms => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return d ? `${pad2(d)}d ${pad2(h)}h ${pad2(m)}m` : `${pad2(h)}h ${pad2(m)}m ${pad2(sec)}s`;
  };

  /* ---------- copy ---------- */
  const PRINTS = {
    core: { name: "BHAKSHI Stack", front: "A small BHAKSHI mark on the chest", back: "The full BHAKSHI wordmark, stacked big across the back" },
    monsoon: { name: "Monsoon Season", front: "A rain-streak graphic on the chest", back: "Rain streaks and a circular type lockup across the back" },
    chai: { name: "Chai Break", front: "A line-drawn cutting-chai glass on the chest", back: "The full break schedule across the back" },
    express: { name: "Night Express", front: "A small route mark on the chest", back: "A route map inspired by railway station boards" },
    hornok: { name: "Horn OK Please", front: "A small truck-art mark on the chest", back: "A full-colour truck-art panel across the back" },
    logo: { name: "Chest mark", front: "A small BHAKSHI chest mark", back: "A small BHAKSHI mark" }
  };
  const CRAFT = {
    "screen print": "Every colour gets its own mesh screen. Ink is pulled through by hand with a squeegee, one colour at a time, then heat-cured so the print stays put wash after wash.",
    "puff print": "A special ink that rises when it is heated. Parts of the graphic stand up off the fabric with a soft, raised texture you can feel with your fingers.",
    "hand embroidery": "Stitched by hand, thread by thread. Tiny differences in every piece are the mark of a person, not a machine.",
    "hand painted": "Details are finished with a brush after printing, so no two pieces come out exactly alike.",
    "embroidery": "Stitched detail that adds texture and depth to the graphic.",
    "block print": "Carved wooden blocks are inked and pressed by hand, one impression at a time.",
    "tie dye": "Folded, bound and dyed by hand. Every pattern is a one-off."
  };
  const craftText = t => CRAFT[String(t).toLowerCase()] || "Finished by hand in small batches.";

  /* ---------- gallery slides ---------- */
  function slidesOf(p) {
    if (p.images && p.images.length) {
      return p.images.map((_, i) => ({ i, view: i === 1 ? "back" : i === 0 ? "front" : "detail", label: i === 0 ? "Front" : i === 1 ? "Back" : `View ${i + 1}` }));
    }
    return [
      { i: 0, view: "front", label: "Front" },
      { i: 0, view: "back", label: "Back" },
      { i: 0, view: "detail", label: "Print detail" },
      { i: 0, view: "folded", label: "Folded" }
    ];
  }
  const media = (p, s) => {
    if (p.images && p.images[s.i]) return productImage(p, s.i, s.view);
    if (typeof Art !== "undefined" && Art.garment) { try { return Art.garment(p, { view: s.view, bg: true }); } catch (e) { /* fall back */ } }
    return productImage(p, s.i, s.view);
  };

  /* ---------- modal (shared shell modal) ---------- */
  const ModalAPI = {
    open(html, opts) {
      if (typeof Modal === "undefined" || !Modal.open) return null;
      const r = Modal.open(html, opts);
      return r && r.nodeType === 1 ? r : $(".modal-content");
    },
    close() { if (typeof Modal !== "undefined" && Modal.close) Modal.close(); }
  };

  /* ---------- size charts (inches, garment laid flat) ---------- */
  const CHARTS = {
    oversized: { title: "Oversized tee", note: "Garment measurements, laid flat. Chest is armpit to armpit × 2; length is from the high point of the shoulder to the hem.",
      cols: ["Chest", "Length"], rows: { S: [44, 27], M: [46, 28], L: [48, 29], XL: [50, 30], XXL: [52, 31] },
      extra: ["Dropped shoulder: the seam sits 2–3 in below your natural shoulder. That is the look.", "Prefer a regular fit? Size down one."] },
    tops: { title: "Tops", note: "Body measurements. Measure around the fullest part of the chest, under the arms.",
      cols: ["Chest", "Length", "Shoulder"], rows: { XS: [36, 26, 16.5], S: [38, 27, 17], M: [40, 28, 17.5], L: [42, 29, 18], XL: [44, 30, 18.5], XXL: [46, 31, 19] } },
    formal: { title: "Shirts (collar sizes)", note: "Size = chest in inches. Collar is measured around the base of the neck, with one finger of room.",
      cols: ["Collar", "Chest", "Length", "Sleeve"],
      rows: { 38: [15, 40, 29, 24], 40: [15.5, 42, 29.5, 24.5], 42: [16, 44, 30, 25], 44: [16.5, 46, 30.5, 25.5], 46: [17, 48, 31, 26] } },
    bottoms: { title: "Bottoms", note: "Waist is measured where you usually wear your trousers; inseam from crotch to hem.",
      cols: ["Waist", "Hip", "Inseam"], rows: { 28: [28, 36, 31], 30: [30, 38, 31], 32: [32, 40, 32], 34: [34, 42, 32], 36: [36, 44, 32], 38: [38, 46, 32], 40: [40, 48, 32] } },
    shorts: { title: "Shorts", note: "Above-knee cut. Inseam measured from crotch to hem.",
      cols: ["Waist", "Hip", "Inseam"], rows: { 28: [28, 36, 7], 30: [30, 38, 7], 32: [32, 40, 7.5], 34: [34, 42, 7.5], 36: [36, 44, 8] } },
    easy: { title: "Elastic-waist bottoms", note: "Elasticated waist with drawcord. Pick by your usual trouser waist.",
      cols: ["Waist", "Hip", "Inseam"], rows: { S: [[28, 30], 37, 29], M: [[30, 32], 39, 29.5], L: [[32, 34], 41, 30], XL: [[34, 36], 43, 30.5], XXL: [[36, 38], 45, 31] } }
  };
  function chartFor(p) {
    const numeric = /^\d+$/.test((p.sizes || [])[0]);
    if (p.shape === "shorts") return numeric ? CHARTS.shorts : CHARTS.easy;
    if (p.shape === "pants") return numeric ? CHARTS.bottoms : CHARTS.easy;
    if (numeric) return CHARTS.formal;
    if (p.fit === "Oversized" && TOPS.includes(p.shape)) return CHARTS.oversized;
    return CHARTS.tops;
  }
  const cell = (v, unit) => {
    const f = n => (unit === "cm" ? Math.round(n * 2.54) : n);
    return Array.isArray(v) ? `${f(v[0])}–${f(v[1])}` : f(v);
  };
  const TEE_FIG = `<svg class="sg-fig" viewBox="0 0 200 190" aria-hidden="true" fill="none">
    <path d="M64 24 L38 34 L12 64 L34 88 L48 78 L48 172 L152 172 L152 78 L166 88 L188 64 L162 34 L136 24 Q100 46 64 24 Z" stroke="currentColor" stroke-width="1.2"/>
    <path d="M48 96 H152" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/><path d="M48 92v8M152 92v8" stroke="currentColor"/>
    <text x="100" y="90" text-anchor="middle" fill="currentColor" font-family="Jost, Arial, sans-serif" font-size="9" letter-spacing="1.5">CHEST</text>
    <path d="M176 26 V172" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/><path d="M172 26h8M172 172h8" stroke="currentColor"/>
    <text x="186" y="118" fill="currentColor" font-family="Jost, Arial, sans-serif" font-size="9" letter-spacing="1.5" transform="rotate(-90 186 118)">LENGTH</text>
  </svg>`;
  function chartTable(ch, p, unit) {
    const sizes = (p.sizes || []).filter(s => ch.rows[s]);
    return `<div class="sg-scroll"><table class="sg-table">
        <caption class="sr-only">${esc(ch.title)} measurements in ${unit === "cm" ? "centimetres" : "inches"}</caption>
        <thead><tr><th scope="col">Size</th>${ch.cols.map(c => `<th scope="col">${c} (${unit})</th>`).join("")}</tr></thead>
        <tbody>${sizes.map(s => `<tr class="${sel.size === s ? "is-sel" : ""}"><th scope="row">${esc(s)}</th>${ch.rows[s].map(v => `<td>${cell(v, unit)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table></div>`;
  }
  function openSizeGuide() {
    const p = P;
    if (!p) return;
    let unit = "in";
    try { unit = localStorage.getItem("bhakshi_unit") === "cm" ? "cm" : "in"; } catch (e) { /* ignore */ }
    const ch = chartFor(p), over = ch === CHARTS.oversized;
    const html = `<div class="sg">
      <h2 class="sg-title">Size guide</h2>
      <p class="sg-sub">${esc(short(p))} · ${esc(p.fit || "")} fit</p>
      <div class="sg-units" role="radiogroup" aria-label="Units">
        <button type="button" role="radio" data-unit="in" aria-checked="${unit === "in"}">Inches</button>
        <button type="button" role="radio" data-unit="cm" aria-checked="${unit === "cm"}">cm</button>
      </div>
      <div data-sg-body>${chartTable(ch, p, unit)}</div>
      <div class="sg-notes">
        ${over ? `<p class="sg-lead">Cut big on purpose. Take your usual size for the boxy, dropped-shoulder drape, or size down for a regular fit.</p>` : `<p class="sg-lead">Between sizes? Size up for a relaxed drape, or down for a closer fit.</p>`}
        <div class="sg-how">
          ${TOPS.includes(p.shape) ? TEE_FIG : ""}
          <div>
            <p class="sg-h">How we measure</p>
            <p>${esc(ch.note)}</p>
            ${(ch.extra || []).map(x => `<p>${esc(x)}</p>`).join("")}
          </div>
        </div>
      </div>
      <p class="sg-help">${isSold(p) ? "" : `<button type="button" class="link-underline sg-ff" data-fitfinder data-product="${esc(p.id)}">Find my size</button><span aria-hidden="true">·</span>`}<a class="link-underline" href="${esc(WA(`Hi ${STORE.name}! Can you help me pick a size for "${p.name}"?`))}" target="_blank" rel="noopener">Ask us on WhatsApp</a></p>
    </div>`;
    const c = ModalAPI.open(html, { size: "m", label: "Size guide" });
    if (!c) return;
    c.addEventListener("click", e => {
      const u = e.target.closest("[data-unit]");
      if (!u) return;
      unit = u.dataset.unit;
      try { localStorage.setItem("bhakshi_unit", unit); } catch (err) { /* ignore */ }
      $$("[data-unit]", c).forEach(b => b.setAttribute("aria-checked", String(b.dataset.unit === unit)));
      $("[data-sg-body]", c).innerHTML = chartTable(ch, p, unit);
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
    const out = $("#pinOut", root), inp = $("#pin", root);
    if (!out || !inp) return;
    if (!/^[1-9]\d{5}$/.test(pin)) {
      out.innerHTML = `<p class="pin-err">Enter a valid 6-digit pincode.</p>`;
      inp.setAttribute("aria-invalid", "true");
      return;
    }
    inp.removeAttribute("aria-invalid");
    try { localStorage.setItem(PIN_KEY, pin); } catch (e) { /* ignore */ }
    const now = new Date();
    const a = addWorkDays(now, 4), b = addWorkDays(now, 8);
    const cod = STORE.codFee !== -1;
    out.innerHTML = `<p class="pin-res">Delivery to <b>${pin}</b> between <b>${fmtDate(a)}</b> and <b>${fmtDate(b)}</b>.${cod ? ` Cash on Delivery available${STORE.codFee > 0 ? ` (+${PRICE(STORE.codFee)})` : ""}.` : " Pay by UPI."}</p>`;
  }

  /* ---------- icons ---------- */
  const IC = {
    heart: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 20.3s-7.8-4.6-7.8-10.3A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 7.8 2.6c0 5.7-7.8 10.3-7.8 10.3Z" stroke-linejoin="round"/></svg>`,
    wa: `<svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.6a10.6 10.6 0 0 1-5.4-1.5l-.4-.2-3.9 1 1-3.8-.2-.4A10.6 10.6 0 1 1 16 26.6zm5.8-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.7 8.7 0 0 1-4.3-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.7 3.7 0 0 0-1.1 2.7 6.4 6.4 0 0 0 1.3 3.4 14.7 14.7 0 0 0 5.6 5c2.1.9 2.9 1 4 .8a3.4 3.4 0 0 0 2.2-1.6 2.8 2.8 0 0 0 .2-1.6c-.1-.1-.3-.2-.6-.4z"/></svg>`,
    close: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19"/></svg>`,
    left: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>`,
    right: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`,
    plus: `<svg class="acc-ic" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M1 6h10"/><path class="acc-ic-v" d="M6 1v10"/></svg>`
  };

  /* ---------- markup: gallery ---------- */
  function galleryHTML(p) {
    const s = slidesOf(p), n = s.length;
    const badge = isSold(p) ? `<span class="pg-badge">Sold out</span>` : !DS().live ? `<span class="pg-badge">Coming soon</span>` : "";
    return `<div class="pdp-media">
      <div class="pg" data-n="${n}">
        <div class="pg-track" id="pgTrack">
          ${s.map((x, i) => `<figure class="pg-slide" data-i="${i}">
            <button type="button" class="pg-open" data-lb="${i}" aria-label="View ${esc(x.label.toLowerCase())} image full screen (${i + 1} of ${n})">${media(p, x)}</button>
            ${i === 0 ? badge : ""}
          </figure>`).join("")}
        </div>
        ${n > 1 ? `<div class="pg-dots" aria-hidden="true">${s.map((_, i) => `<span class="pg-dot ${i === 0 ? "is-on" : ""}"></span>`).join("")}</div>` : ""}
      </div>
    </div>`;
  }

  /* ---------- markup: info ---------- */
  function careFor(p) {
    const f = (p.fabric || "").toLowerCase();
    if (f.includes("denim")) return ["Wash inside out in cold water", "Wash with similar colours; indigo may bleed in the first few washes", "Do not tumble dry", "Dry in shade"];
    if (f.includes("linen")) return ["Gentle machine wash, cold", "Do not wring; reshape while damp", "Iron while slightly damp on medium heat", "Dry in shade"];
    if (f.includes("fleece")) return ["Machine wash cold, inside out", "Do not bleach", "Line dry or tumble dry low", "Do not iron directly on the fleece face"];
    const t = (p.techniques || []).map(x => x.toLowerCase());
    const out = ["Machine wash cold, inside out, with similar colours", "Do not bleach or tumble dry"];
    out.push(prints(p).front || prints(p).back ? "Do not iron directly on the print" : "Iron on medium heat");
    if (t.some(x => x.includes("embroider"))) out.push("Turn inside out before washing to protect the stitching");
    if (t.some(x => x.includes("puff") || x.includes("paint"))) out.push("Hand wash recommended for the first few washes to keep raised and painted areas crisp");
    out.push("Dry in shade to keep the colour deep");
    return out;
  }

  function accHTML(p) {
    const pr = prints(p), fp = fabricParts(p), ch = chartFor(p);
    const techs = p.techniques || [];
    const items = [];
    items.push(["details", "Details", `<p>${esc(p.desc || "")}</p>
      <dl class="acc-spec">
        <div><dt>Fabric</dt><dd>${esc(p.fabric || "")}</dd></div>
        <div><dt>Fit</dt><dd>${esc(p.fit || "")}</dd></div>
        <div><dt>Colour</dt><dd>${esc(p.colorName || "")}</dd></div>
        ${pr.front && PRINTS[pr.front] ? `<div><dt>Front</dt><dd>${esc(PRINTS[pr.front].front)}</dd></div>` : ""}
        ${pr.back && PRINTS[pr.back] ? `<div><dt>Back</dt><dd>${esc(PRINTS[pr.back].back)}</dd></div>` : ""}
        ${p.edition ? `<div><dt>Edition</dt><dd>Limited to ${p.edition} pieces</dd></div>` : ""}
        <div><dt>Made in</dt><dd>India</dd></div>
      </dl>`]);
    if (techs.length) {
      items.push(["craft", "The craft", `${techs.map(t => `<div class="acc-craft"><p class="acc-craft-h">${esc(t)}</p><p>${esc(craftText(t))}</p></div>`).join("")}
        <p class="acc-muted">Made in small batches${p.edition ? ` of ${p.edition}` : ""}. Slight variations from piece to piece are part of the process, not a flaw.</p>`]);
    }
    const sizes = (p.sizes || []).filter(s => ch.rows[s]);
    items.push(["fit", "Size &amp; fit", `${p.fit === "Oversized"
        ? `<p>Oversized and boxy, with dropped shoulders and a slightly longer body. Take your usual size for the intended drape; size down one for a regular fit.</p>`
        : `<p>${esc(p.fit || "Regular")} fit. Take your usual size.</p>`}
      ${sizes.length ? `<div class="sg-scroll"><table class="sg-table sg-table-s"><thead><tr><th scope="col">Size</th>${ch.cols.map(c => `<th scope="col">${c} (in)</th>`).join("")}</tr></thead>
        <tbody>${sizes.map(s => `<tr><th scope="row">${esc(s)}</th>${ch.rows[s].map(v => `<td>${cell(v, "in")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : ""}
      ${fp.gsm ? `<p class="acc-muted">${esc(fp.gsm)} heavyweight cotton. It holds its shape and softens with every wash.</p>` : ""}
      <p><button type="button" class="link-underline" data-sizeguide>Open the full size guide</button></p>`]);
    items.push(["ship", "Shipping &amp; returns", `<ul class="acc-list">
        <li>Dispatched in 1–2 working days, delivered in 3–7 days across India.</li>
        <li>Free shipping on orders over ${PRICE(STORE.freeShippingAbove)}; ${PRICE(STORE.shippingFee)} below that.</li>
        ${STORE.codFee !== -1 ? `<li>Cash on Delivery${STORE.codFee > 0 ? ` (+${PRICE(STORE.codFee)})` : ""}, or pay by UPI.</li>` : `<li>Pay by UPI.</li>`}
        <li>Easy size exchange within 7 days of delivery. Unworn, with tags on.</li></ul>
        <p><a class="link-underline" href="policies.html#exchange">Shipping &amp; exchange policy</a></p>`]);
    items.push(["care", "Care", `<ul class="acc-list">${careFor(p).map(c => `<li>${esc(c)}</li>`).join("")}</ul>`]);
    return `<div class="acc">${items.map(([k, t, b], i) => `<div class="acc-item ${i === 0 ? "is-open" : ""}">
      <h2 class="acc-h"><button type="button" class="acc-head" id="acc-${k}-h" aria-expanded="${i === 0}" aria-controls="acc-${k}"><span>${t}</span>${IC.plus}</button></h2>
      <div class="acc-body" id="acc-${k}" role="region" aria-labelledby="acc-${k}-h" ${i === 0 ? "" : "hidden"}><div class="acc-inner">${b}</div></div></div>`).join("")}</div>`;
  }

  const waText = p => `Hi ${STORE.name}! I have a question about "${p.name}" (${PRICE(p.price)})${sel.size ? `, size ${sel.size}` : ""}. ${url(p)}`;
  const notifyText = p => `Hi ${STORE.name}! Please let me know if "${p.name}"${sel.size ? ` in size ${sel.size}` : ""} comes back in stock. ${url(p)}`;
  const dropNotifyText = p => `Hi ${STORE.name}! Remind me when ${dropTag} goes live. I want "${p.name}"${sel.size ? ` in size ${sel.size}` : ""}. ${url(p)}`;

  function ctaHTML(p) {
    const d = DS();
    if (isSold(p)) {
      return `<div class="pi-actions is-out" id="pdpActions">
        <button type="button" class="btn btn-block pi-add" id="addBtn" disabled>Sold out</button>
        <a class="btn btn-outline btn-block pi-notify" id="notifyBtn" target="_blank" rel="noopener" href="${esc(WA(notifyText(p)))}">${IC.wa}<span>Notify me on WhatsApp</span></a>
      </div>`;
    }
    if (!d.live) {
      return `<div class="pi-actions is-soon" id="pdpActions">
        <button type="button" class="btn btn-block pi-add" id="addBtn" disabled><span>Available in</span>&nbsp;<span data-drop-left>${fmtLeft(d.msLeft)}</span></button>
        <a class="btn btn-outline btn-block pi-notify" id="notifyBtn" target="_blank" rel="noopener" href="${esc(WA(dropNotifyText(p)))}">${IC.wa}<span>Notify me on WhatsApp</span></a>
      </div>`;
    }
    return `<div class="pi-actions" id="pdpActions">
      <button type="button" class="btn btn-block pi-add" id="addBtn">Add to cart</button>
      <button type="button" class="btn btn-outline btn-block pi-buy" id="buyBtn">Buy it now</button>
    </div>`;
  }

  function infoHTML(p) {
    const vs = variants(p), off = OFF(p), sold = isSold(p), live = DS().live;
    const cat = CATEGORIES.find(x => x.id === p.category) || {};
    const techs = p.techniques || [];
    let pin = "";
    try { pin = localStorage.getItem(PIN_KEY) || ""; } catch (e) { /* ignore */ }
    return `<div class="pdp-info" id="pdpInfo">
      <nav class="pi-crumbs" aria-label="Breadcrumb"><ol>
        <li><a href="index.html">Home</a></li>
        <li><a href="shop.html?cat=${encodeURIComponent(p.category)}">${esc(cat.name || catName(p.category))}</a></li>
        <li aria-current="page"><span>${esc(short(p))}</span></li>
      </ol></nav>
      <h1 class="pi-name">${esc(short(p))}</h1>
      <div class="pi-price">
        ${off > 0 ? `<span class="sr-only">Sale price</span>` : ""}<span class="pi-now ${off > 0 ? "is-sale" : ""}">${PRICE(p.price)}</span>
        ${off > 0 ? `<s class="pi-mrp"><span class="sr-only">Regular price </span>${PRICE(p.mrp)}</s><span class="pi-off">Save ${off}%</span>` : ""}
      </div>
      <p class="pi-tax">Tax included. Free shipping on orders over ${PRICE(STORE.freeShippingAbove)}.</p>
      ${techs.length ? `<ul class="pi-tech" aria-label="How it is made">${techs.map(t => `<li><a href="shop.html?tech=${encodeURIComponent(t)}">${esc(t)}</a></li>`).join("")}</ul>` : ""}

      <div class="pi-block pi-colour">
        <p class="pi-label">Colour: <span>${esc(p.colorName || "")}</span></p>
        ${vs.length > 1 ? `<div class="pi-swatches">${vs.map(v => `<a class="pi-swatch ${v.id === p.id ? "is-current" : ""} ${isSold(v) ? "is-sold" : ""}" href="product.html?id=${encodeURIComponent(v.id)}" data-variant="${esc(v.id)}"
            aria-label="${esc(v.colorName)}${isSold(v) ? " (sold out)" : ""}" ${v.id === p.id ? 'aria-current="true"' : ""} title="${esc(v.colorName)}">${swatch(v.color)}</a>`).join("")}</div>` : ""}
      </div>

      <div class="pi-block pi-size" id="sizeBlock">
        <div class="pi-label-row">
          <p class="pi-label" id="sizeLbl">Size${sel.size ? `: <span id="sizeVal">${esc(sel.size)}</span>` : `<span id="sizeVal"></span>`}</p>
          <button type="button" class="pi-link" data-sizeguide>Size guide</button>
        </div>
        <div class="pi-sizes" role="group" aria-labelledby="sizeLbl">${(p.sizes || []).map(z =>
          `<button type="button" class="pi-sz" data-sz="${esc(z)}" aria-pressed="${sel.size === z}" ${sold ? "disabled" : ""} aria-label="Size ${esc(z)}${sold ? ", sold out" : ""}">${esc(z)}</button>`).join("")}</div>
        <p class="pi-size-err" id="sizeErr" role="alert" hidden>Please select a size.</p>
        <p class="pi-fitnote">${p.fit === "Oversized" ? "Oversized fit. Size down for a regular fit." : `${esc(p.fit || "Regular")} fit.`}
          ${sold ? "" : `<button type="button" class="pi-link" data-fitfinder data-product="${esc(p.id)}">Find my size</button>`}</p>
      </div>

      ${!sold && live ? `<div class="pi-block pi-qty-row">
        <p class="pi-label" id="qtyLbl">Quantity</p>
        <div class="pi-qty" role="group" aria-labelledby="qtyLbl">
          <button type="button" data-q="-1" aria-label="Decrease quantity">−</button>
          <input id="qtyIn" type="number" min="1" max="${maxQty(p)}" value="${sel.qty}" aria-label="Quantity" inputmode="numeric">
          <button type="button" data-q="1" aria-label="Increase quantity">+</button>
        </div>
      </div>` : ""}

      ${!sold && (p.stock | 0) <= LOW ? `<p class="pi-low"><span aria-hidden="true"></span>Only ${p.stock} left</p>` : ""}

      ${ctaHTML(p)}

      <div class="pi-sub">
        <button type="button" class="pi-wish" data-wish="${esc(p.id)}" data-keep-label="1" aria-pressed="${wished(p.id)}">${IC.heart}<span>${wished(p.id) ? "Saved to wishlist" : "Add to wishlist"}</span></button>
        <a class="pi-wa" id="waLink" target="_blank" rel="noopener" href="${esc(WA(waText(p)))}">${IC.wa}<span>Ask a question</span></a>
      </div>

      <form class="pi-pin" id="pinForm" novalidate>
        <label for="pin" class="pi-pin-l">Check delivery</label>
        <div class="pi-pin-row"><input id="pin" name="pin" inputmode="numeric" autocomplete="postal-code" maxlength="6" placeholder="Pincode" value="${esc(pin)}">
        <button type="submit" class="pi-pin-btn">Check</button></div>
        <div id="pinOut" aria-live="polite"></div>
      </form>

      ${accHTML(p)}
    </div>`;
  }

  function buybarHTML(p) {
    const d = DS();
    const right = isSold(p)
      ? `<a class="btn btn-outline buybar-btn" target="_blank" rel="noopener" href="${esc(WA(notifyText(p)))}">Notify me</a>`
      : !d.live
        ? `<button type="button" class="btn buybar-btn" disabled><span data-drop-left>${fmtLeft(d.msLeft)}</span></button>`
        : `<label class="sr-only" for="barSize">Size</label><select class="buybar-size" id="barSize"><option value="">Size</option>${(p.sizes || []).map(z => `<option ${sel.size === z ? "selected" : ""}>${esc(z)}</option>`).join("")}</select>
           <button type="button" class="btn buybar-btn" id="barAdd">Add to cart</button>`;
    return `<div class="buybar-inner">
      <div class="buybar-meta"><span class="buybar-name">${esc(short(p))}</span><span class="buybar-price">${PRICE(p.price)}${p.mrp > p.price ? ` <s>${PRICE(p.mrp)}</s>` : ""}</span></div>
      ${right}
    </div>`;
  }

  /* ---------- complete the look (only when mixMatchOn()) ---------- */
  function complements(p) {
    const want = BOTTOMS.includes(p.shape) ? TOPS : p.shape === "coord" ? ["tee", "hoodie", "jacket", "polo"] : BOTTOMS;
    const occ = (p.tags || []).filter(t => OCC.includes(t));
    const cands = PRODUCTS.filter(x => x.id !== p.id && x.family !== p.family && want.includes(x.shape) && !isSold(x))
      .map(x => ({ x, s: (x.tags || []).filter(t => occ.includes(t)).length * 3 + ((x.tags || []).includes("bestseller") ? 1 : 0) + (x.color !== p.color ? 0.5 : 0) }))
      .sort((a, b) => b.s - a.s);
    const picked = [], cats = new Set();
    cands.forEach(({ x }) => { if (picked.length < 3 && !cats.has(x.category)) { picked.push(x); cats.add(x.category); } });
    return picked;
  }
  function lookHTML(p) {
    if (!MIXON()) return "";
    const comp = complements(p);
    if (!comp.length) return "";
    const items = [p, ...comp];
    const top = TOPS.includes(p.shape) ? p : comp.find(c => TOPS.includes(c.shape));
    const bottom = BOTTOMS.includes(p.shape) ? p : comp.find(c => BOTTOMS.includes(c.shape));
    const visual = top && bottom && typeof Art !== "undefined" && Art.outfit ? Art.outfit(top, bottom) : productImage(p, 0, "front");
    return `<section class="pdp-section pdp-look" aria-labelledby="lookH"><div class="container">
      <h2 class="pdp-section-h" id="lookH">Complete the look</h2>
      <div class="look-grid">
        <div class="look-visual" data-fly>${visual}</div>
        <div class="look-panel">
          <ul class="look-list">${items.map((x, i) => {
            const off = isSold(x) || !BUY(x);
            return `<li class="look-item ${off ? "" : "is-on"}" data-look="${esc(x.id)}">
              <label class="look-check"><input type="checkbox" data-look-on="${esc(x.id)}" ${off ? "disabled" : "checked"} aria-label="Include ${esc(x.name)}"><span class="fbox" aria-hidden="true"></span></label>
              <a class="look-thumb" href="product.html?id=${encodeURIComponent(x.id)}" tabindex="-1" aria-hidden="true">${productImage(x, 0, "front")}</a>
              <div class="look-meta">
                <span class="look-cat">${i === 0 ? "This piece" : esc(catName(x.category))}</span>
                <a href="product.html?id=${encodeURIComponent(x.id)}" class="look-name">${esc(short(x))}</a>
                <span class="look-price">${PRICE(x.price)}</span>
              </div>
              ${off ? `<span class="look-sold">${isSold(x) ? "Sold out" : "Soon"}</span>` : `<select class="look-size" data-look-size="${esc(x.id)}" aria-label="Size for ${esc(x.name)}"><option value="">Size</option>${x.sizes.map(z => `<option ${i === 0 && sel.size === z ? "selected" : ""}>${esc(z)}</option>`).join("")}</select>`}
            </li>`;
          }).join("")}</ul>
          <div class="look-foot"><p class="look-total"><span>Total, <b data-look-n>0</b> pieces</span><b data-look-sum></b></p>
            <button type="button" class="btn btn-block" data-look-add>Add selected</button></div>
        </div>
      </div>
    </div></section>`;
  }
  function updateLook() {
    const box = $("#pdpLook");
    const btn = $("[data-look-add]", box);
    if (!btn) return;
    const on = $$("[data-look-on]", box).filter(c => c.checked);
    const sum = on.reduce((s, c) => s + getProduct(c.dataset.lookOn).price, 0);
    $$(".look-item", box).forEach(li => li.classList.toggle("is-on", !!($("[data-look-on]", li) || {}).checked));
    $("[data-look-n]", box).textContent = on.length;
    $("[data-look-sum]", box).textContent = PRICE(sum);
    btn.textContent = on.length ? `Add selected · ${PRICE(sum)}` : "Select pieces to add";
    btn.disabled = !on.length;
  }

  /* ---------- rows ---------- */
  function rowHTML(id, title, items, link) {
    if (!items.length) return "";
    return `<section class="pdp-section pdp-row-sec" aria-labelledby="row-${id}"><div class="container">
      <div class="pdp-section-head"><h2 class="pdp-section-h" id="row-${id}">${title}</h2>${link ? `<a class="link-underline" href="${link}">View all</a>` : ""}</div>
      <div class="pdp-row grid-products">${items.map(productCard).join("")}</div>
    </div></section>`;
  }
  function moreFor(p) {
    const grp = id => (CATEGORIES.find(c => c.id === id) || {}).group, g = grp(p.category);
    const idx = new Map(PRODUCTS.map((x, i) => [x.id, i]));
    return PRODUCTS.filter(x => x.id !== p.id && x.family !== p.family)
      .map(x => ({ x, s: (x.category === p.category ? 4 : 0) + (x.shape === p.shape ? 2 : 0) + (grp(x.category) === g ? 1 : 0)
        + ((x.techniques || []).some(t => (p.techniques || []).includes(t)) ? 0.5 : 0) - (isSold(x) ? 10 : 0) }))
      .sort((a, b) => b.s - a.s || idx.get(a.x.id) - idx.get(b.x.id)).slice(0, 4).map(o => o.x);
  }

  /* ---------- SEO ---------- */
  function seo(p) {
    document.title = `${p.name} | ${STORE.name}`;
    let md = $('meta[name="description"]');
    if (!md) { md = document.createElement("meta"); md.name = "description"; document.head.appendChild(md); }
    const d = `${p.name}: ${p.desc} ${p.fit} fit, ${p.fabric}. Cash on Delivery and 7-day size exchange.`;
    md.setAttribute("content", d.length > 160 ? d.slice(0, 157) + "…" : d);
    const robots = $('meta[name="robots"]'); if (robots) robots.remove();
    let ld = $("#ldProduct");
    if (!ld) { ld = document.createElement("script"); ld.type = "application/ld+json"; ld.id = "ldProduct"; document.head.appendChild(ld); }
    const data = {
      "@context": "https://schema.org", "@type": "Product",
      name: p.name, description: p.desc, sku: p.id, color: p.colorName, material: p.fabric,
      category: catName(p.category),
      brand: { "@type": "Brand", name: STORE.name },
      image: p.images && p.images.length ? p.images.map(i => new URL(i, location.href).href) : [new URL("images/og.png", location.href).href],
      offers: {
        "@type": "Offer", url: url(p), priceCurrency: "INR", price: Number(p.price).toFixed(2),
        availability: isSold(p) ? "https://schema.org/OutOfStock" : DS().live ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
        itemCondition: "https://schema.org/NewCondition",
        seller: { "@type": "Organization", name: STORE.name }
      }
    };
    ld.textContent = JSON.stringify(data);
  }

  /* ---------- size / qty / cart ---------- */
  function setSize(s, fromPick) {
    if (!P || isSold(P)) return;
    if (!(P.sizes || []).map(String).includes(String(s))) {
      if (fromPick) say(`We'd suggest size ${s}, which this style doesn't come in. Check the size guide.`, "info");
      return;
    }
    sel.size = String(s);
    $$("[data-sz]", root).forEach(b => b.setAttribute("aria-pressed", String(b.dataset.sz === sel.size)));
    const lbl = $("#sizeLbl", root); if (lbl) lbl.innerHTML = `Size: <span id="sizeVal">${esc(sel.size)}</span>`;
    const err = $("#sizeErr", root); if (err) err.hidden = true;
    const blk = $("#sizeBlock", root); if (blk) blk.classList.remove("has-error");
    const bs = $("#barSize"); if (bs) bs.value = sel.size;
    const ls = $(`[data-look-size="${CSS.escape(P.id)}"]`); if (ls) ls.value = sel.size;
    const w = $("#waLink", root); if (w) w.href = WA(waText(P));
    const n = $("#notifyBtn", root); if (n) n.href = WA(DS().live ? notifyText(P) : dropNotifyText(P));
    if (fromPick) say(`Size ${sel.size} selected for you`, "success");
  }
  function flagSize() {
    const blk = $("#sizeBlock", root), err = $("#sizeErr", root);
    if (err) err.hidden = false;
    if (!blk) return;
    blk.classList.remove("has-error"); void blk.offsetWidth; blk.classList.add("has-error");
    const r = blk.getBoundingClientRect();
    if (r.top < 90 || r.bottom > innerHeight) scrollTo({ top: r.top + scrollY - 120, behavior: reduceMotion() ? "auto" : "smooth" });
    setTimeout(() => { const b = $(".pi-sz:not(:disabled)", root); b && b.focus({ preventScroll: true }); }, 300);
  }
  function addToCart(srcEl, { thenCheckout = false } = {}) {
    if (!P) return false;
    if (!BUY(P)) {
      say(isSold(P) ? "This one is sold out." : `Not available yet. ${dropTag} opens in ${fmtLeft(DS().msLeft)}.`, "info");
      return false;
    }
    if (!sel.size) { flagSize(); return false; }
    if (typeof Cart === "undefined" || !Cart.add) return false;
    const ok = Cart.add(P.id, sel.size, sel.qty);
    if (ok === false || ok == null) return false;
    if (thenCheckout) { location.href = "checkout.html"; return true; }
    const fly = typeof flyToCart === "function";
    if (fly) { try { flyToCart(srcEl || $(".pg-slide", root)); } catch (e) { /* ignore */ } }
    if (typeof openCart === "function") setTimeout(() => { try { openCart(); } catch (e) { /* ignore */ } }, fly && !reduceMotion() ? 650 : 100);
    else say(`Added ${short(P)}, size ${sel.size}${sel.qty > 1 ? ` × ${sel.qty}` : ""}`, "success");
    return true;
  }

  /* ---------- gallery behaviour (mobile swipe dots) ---------- */
  function initGallery() {
    const track = $("#pgTrack", root);
    if (!track) return;
    const dots = $$(".pg-dot", root);
    let raf = 0;
    track.addEventListener("scroll", () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
        dots.forEach((d, k) => d.classList.toggle("is-on", k === i));
      });
    }, { passive: true });
  }

  /* ---------- fullscreen lightbox (own overlay) ---------- */
  let lb = null;
  function openLightbox(start = 0) {
    if (!P || lb) return;
    const p = P, s = slidesOf(p), n = s.length;
    const opener = document.activeElement;
    const el = document.createElement("div");
    el.className = "lb";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", `${short(p)}: images`);
    el.tabIndex = -1;
    el.innerHTML = `<div class="lb-track" data-lb-track>${s.map((x, i) => `<figure class="lb-slide" data-i="${i}"><div class="lb-img" data-zoom>${media(p, x)}</div></figure>`).join("")}</div>
      <button type="button" class="lb-x" data-lb-close aria-label="Close">${IC.close}</button>
      ${n > 1 ? `<button type="button" class="lb-arrow lb-prev" data-lb-step="-1" aria-label="Previous image">${IC.left}</button>
      <button type="button" class="lb-arrow lb-next" data-lb-step="1" aria-label="Next image">${IC.right}</button>` : ""}
      <p class="lb-count" aria-live="polite"><span data-lb-i>1</span> / ${n}</p>`;
    document.body.appendChild(el);
    lb = el;
    const track = $("[data-lb-track]", el);
    let i = 0;
    const lockOn = typeof lockScroll === "function";
    if (lockOn) { try { lockScroll(true); } catch (e) { /* ignore */ } } else document.documentElement.style.overflow = "hidden";
    const unzoom = () => { $$(".lb-img.is-zoomed", el).forEach(z => { z.classList.remove("is-zoomed"); z.style.transformOrigin = ""; }); el.classList.remove("is-zoomed"); };
    const go = (k, smooth = true) => {
      i = Math.max(0, Math.min(n - 1, k));
      unzoom();
      track.scrollTo({ left: i * track.clientWidth, behavior: smooth && !reduceMotion() ? "smooth" : "auto" });
      $("[data-lb-i]", el).textContent = i + 1;
    };
    track.addEventListener("scroll", () => {
      const k = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      if (k !== i) { i = k; unzoom(); $("[data-lb-i]", el).textContent = i + 1; }
    }, { passive: true });
    const close = () => {
      if (!lb) return;
      lb = null;
      document.removeEventListener("keydown", onKey, true);
      el.classList.remove("is-open");
      if (lockOn) { try { lockScroll(false); } catch (e) { /* ignore */ } } else document.documentElement.style.overflow = "";
      setTimeout(() => el.remove(), reduceMotion() ? 0 : 240);
      if (opener && document.contains(opener)) { try { opener.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    };
    const onKey = e => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); go(i + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(i - 1); }
      if (e.key === "Tab") {
        const f = $$("button", el);
        const a = f[0], z = f[f.length - 1];
        if (!el.contains(document.activeElement)) { e.preventDefault(); a.focus(); }
        else if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    document.addEventListener("keydown", onKey, true);
    el.addEventListener("click", e => {
      if (e.target.closest("[data-lb-close]")) return close();
      const st = e.target.closest("[data-lb-step]");
      if (st) return go(i + +st.dataset.lbStep);
      const z = e.target.closest("[data-zoom]");
      if (z) {
        const r = z.getBoundingClientRect();
        z.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
        const on = !z.classList.contains("is-zoomed");
        z.classList.toggle("is-zoomed", on);
        el.classList.toggle("is-zoomed", on);
      }
    });
    el.addEventListener("mousemove", e => {
      const z = e.target.closest(".lb-img.is-zoomed");
      if (!z) return;
      const r = z.parentElement.getBoundingClientRect();
      z.style.transformOrigin = `${Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100))}% ${Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100))}%`;
    });
    requestAnimationFrame(() => {
      el.classList.add("is-open");
      go(start, false);
      el.focus({ preventScroll: true });
    });
  }

  /* ---------- accordion ---------- */
  function toggleAcc(btn) {
    const item = btn.closest(".acc-item"), on = !item.classList.contains("is-open");
    item.classList.toggle("is-open", on);
    btn.setAttribute("aria-expanded", String(on));
    $(".acc-body", item).hidden = !on;
  }

  /* ---------- sticky info column: stick by its bottom edge when taller than the viewport ---------- */
  function headerOffset() {
    const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h"));
    return (isFinite(v) && v > 0 ? v : 64) + 24;
  }
  let stickRaf = 0;
  function fitSticky() {
    stickRaf = 0;
    const info = $("#pdpInfo", root);
    if (!info) return;
    const top = headerOffset(), h = info.offsetHeight;
    const t = h + top + 24 > innerHeight ? Math.min(top, innerHeight - h - 32) : top;
    info.style.setProperty("--stick", `${Math.round(t)}px`);
  }
  const queueSticky = () => { if (!stickRaf) stickRaf = requestAnimationFrame(fitSticky); };
  addEventListener("resize", queueSticky, { passive: true });
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(queueSticky) : null;

  /* ---------- mobile sticky add-to-cart bar ---------- */
  let barRaf = 0;
  function checkBuyBar() {
    barRaf = 0;
    const bar = $("#buyBar"), act = $("#pdpActions", root);
    const foot = document.querySelector("footer");
    const footIn = foot && foot.getBoundingClientRect().top < innerHeight - 40;
    const show = !!(act && P && innerWidth < 1024 && act.getBoundingClientRect().bottom < 0 && !footIn);
    if (bar.classList.contains("is-shown") === show) return;
    bar.classList.toggle("is-shown", show);
    bar.setAttribute("aria-hidden", String(!show));
    bar.inert = !show;
    document.body.classList.toggle("has-buybar", show);
  }
  addEventListener("scroll", () => { if (!barRaf) barRaf = requestAnimationFrame(checkBuyBar); }, { passive: true });
  addEventListener("resize", () => { if (!barRaf) barRaf = requestAnimationFrame(checkBuyBar); }, { passive: true });

  /* ---------- render ---------- */
  function renderNotFound() {
    P = null;
    root.innerHTML = `<div class="pdp-404">
      <h1 class="pdp-404-h">Product not found</h1>
      <p>The link may be broken, or this piece is no longer in the range.</p>
      <a class="btn" href="shop.html">View all products</a>
    </div>`;
    document.title = `Product not found | ${STORE.name}`;
    if (!$('meta[name="robots"]')) document.head.insertAdjacentHTML("beforeend", `<meta name="robots" content="noindex">`);
    const ld = $("#ldProduct"); if (ld) ld.remove();
    $("#pdpLook").innerHTML = "";
    $("#buyBar").innerHTML = "";
    $("#pdpMore").innerHTML = rowHTML("more", "You may like", PRODUCTS.filter(x => !isSold(x)).slice(0, 4), "shop.html");
    renderRecent(null);
    if (typeof refreshReveal === "function") { try { refreshReveal(); } catch (e) { /* ignore */ } }
  }

  function renderRecent(p) {
    if (typeof Recent === "undefined" || !Recent.list) { $("#pdpRecent").innerHTML = ""; return; }
    let items = [];
    try { items = fresh(Recent.list(p ? p.id : undefined)).filter(x => !p || x.id !== p.id).slice(0, 4); } catch (e) { items = []; }
    $("#pdpRecent").innerHTML = rowHTML("recent", "Recently viewed", items);
  }

  function render(p) {
    P = p;
    if (!(p.sizes || []).includes(sel.size)) sel.size = null;
    if ((p.sizes || []).length === 1) sel.size = p.sizes[0];
    if (isSold(p)) sel.size = null;
    sel.qty = 1;
    root.innerHTML = `<div class="pdp ${isSold(p) ? "is-sold" : ""} ${DS().live ? "" : "is-soon"}">${galleryHTML(p)}${infoHTML(p)}</div>`;
    initGallery();
    $("#buyBar").innerHTML = buybarHTML(p);
    $("#pdpLook").innerHTML = lookHTML(p);
    updateLook();
    $("#pdpMore").innerHTML = rowHTML("more", "You may also like", moreFor(p), `shop.html?cat=${encodeURIComponent(p.category)}`);
    renderRecent(p);
    if (typeof Recent !== "undefined" && Recent.add) { try { Recent.add(p.id); } catch (e) { /* ignore */ } }
    seo(p);
    let pin = null;
    try { pin = localStorage.getItem(PIN_KEY); } catch (e) { /* ignore */ }
    if (pin) estimate(pin);
    const info = $("#pdpInfo", root);
    if (ro && info) { ro.disconnect(); ro.observe(info); }
    fitSticky();
    checkBuyBar();
    if (typeof refreshReveal === "function") { try { refreshReveal(); } catch (e) { /* ignore */ } }
    if (typeof initCountdowns === "function") { try { initCountdowns(); } catch (e) { /* ignore */ } }
  }

  function swapTo(id, push) {
    const np = getProduct(id);
    if (!np) return renderNotFound();
    if (P && np.id === P.id) return;
    if (push) history.pushState({ id }, "", location.pathname + "?id=" + encodeURIComponent(id));
    render(np);
  }

  /* ---------- drop countdown: tick labels, re-render when it goes live ---------- */
  let wasLive = DS().live;
  setInterval(() => {
    const d = DS();
    if (d.live !== wasLive) { wasLive = d.live; if (P) render(P); return; }
    if (!d.live) $$("[data-drop-left]").forEach(el => (el.textContent = fmtLeft(d.msLeft)));
  }, 1000);
  document.addEventListener("drop:live", e => { if (P) { e.preventDefault(); wasLive = true; render(P); } });

  /* ---------- events (bound once, delegated) ---------- */
  root.addEventListener("click", e => {
    const v = e.target.closest("[data-variant]");
    if (v && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) { e.preventDefault(); swapTo(v.dataset.variant, true); return; }
    const lbBtn = e.target.closest("[data-lb]");
    if (lbBtn) { openLightbox(+lbBtn.dataset.lb); return; }
    const sz = e.target.closest("[data-sz]"); if (sz) return setSize(sz.dataset.sz);
    if (e.target.closest("[data-sizeguide]")) return openSizeGuide();
    const q = e.target.closest("[data-q]");
    if (q && P) {
      sel.qty = Math.max(1, Math.min(maxQty(P), sel.qty + +q.dataset.q));
      $("#qtyIn", root).value = sel.qty;
      return;
    }
    if (e.target.closest("#addBtn")) return addToCart($(".pg-slide", root));
    if (e.target.closest("#buyBtn")) return addToCart(null, { thenCheckout: true });
    const acc = e.target.closest(".acc-head"); if (acc) return toggleAcc(acc);
  });
  root.addEventListener("change", e => {
    if (e.target.id === "qtyIn" && P) { sel.qty = Math.max(1, Math.min(maxQty(P), parseInt(e.target.value, 10) || 1)); e.target.value = sel.qty; }
  });
  root.addEventListener("submit", e => {
    if (e.target.id !== "pinForm") return;
    e.preventDefault();
    estimate($("#pin", root).value.trim());
  });
  root.addEventListener("input", e => {
    if (e.target.id === "pin") e.target.value = e.target.value.replace(/\D/g, "").slice(0, 6);
  });
  // Fit Finder (features.js opens it from [data-fitfinder]); apply its pick to this product
  document.addEventListener("fitfinder:pick", e => {
    const d = e.detail || {};
    if (P && d.size && (!d.productId || d.productId === P.id)) setSize(d.size, true);
  });

  $("#buyBar").addEventListener("change", e => { if (e.target.id === "barSize" && e.target.value) setSize(e.target.value); });
  $("#buyBar").addEventListener("click", e => {
    if (!e.target.closest("#barAdd")) return;
    if (!sel.size) {
      const s = $("#barSize");
      s.classList.remove("is-missing"); void s.offsetWidth; s.classList.add("is-missing");
      s.focus();
      say("Please select a size", "info");
      return;
    }
    addToCart($(".pg-slide", root));
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
      missing.forEach(id => { const s = $(`[data-look-size="${CSS.escape(id)}"]`, box); s.classList.remove("is-missing"); void s.offsetWidth; s.classList.add("is-missing"); });
      $(`[data-look-size="${CSS.escape(missing[0])}"]`, box).focus();
      say(missing.length === 1 ? "Pick a size for the highlighted piece" : `Pick sizes for ${missing.length} pieces`, "info");
      return;
    }
    on.forEach(id => Cart.add(id, $(`[data-look-size="${CSS.escape(id)}"]`, box).value, 1));
    if (typeof flyToCart === "function") { try { flyToCart($(".look-visual", box)); } catch (err) { /* ignore */ } }
    say(`Added ${on.length} piece${on.length > 1 ? "s" : ""} to your cart`, "success");
  });

  document.addEventListener("wishlist:change", () => {
    const w = $(".pi-wish", root);
    if (!w || !P) return;
    const on = wished(P.id);
    w.setAttribute("aria-pressed", String(on));
    w.removeAttribute("aria-label");
    $("span", w).textContent = on ? "Saved to wishlist" : "Add to wishlist";
  });
  addEventListener("popstate", () => {
    const np = getProduct(new URLSearchParams(location.search).get("id"));
    np ? render(np) : renderNotFound();
  });

  /* ---------- boot ---------- */
  const first = getProduct(new URLSearchParams(location.search).get("id"));
  first ? render(first) : renderNotFound();
})();
