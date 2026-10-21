/* BHAKSHI — product detail page (v2, dark drop).
   Renders from ?id=… ; colour swatches (only when a family has variants) swap content in place.
   Gallery: front/back 3D flip, detail wipe, thumbnails, swipe, hover lens, fullscreen lightbox. */
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
  const gal = { idx: 0, rot: 0 };

  /* ---------- contract helpers with safe fallbacks ---------- */
  const SI = p => {
    if (typeof stockInfo === "function") return stockInfo(p);
    const left = Math.max(0, p.stock | 0), total = p.edition || 0;
    return { left, total, pct: total ? (left / total) * 100 : 100, low: left > 0 && left <= 15, soldOut: left <= 0 };
  };
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
  const variants = p => (typeof variantsOf === "function" ? variantsOf(p) : PRODUCTS.filter(x => x.family === p.family));
  const short = p => String(p.name).split(" — ")[0];
  const pad2 = n => String(Math.max(0, n | 0)).padStart(2, "0");
  const numOf = p => pad2(PRODUCTS.indexOf(p) + 1);
  const isSold = p => p.stock <= 0;
  const url = p => new URL("product.html?id=" + encodeURIComponent(p.id), location.href).href;
  const swatch = c => (typeof Art !== "undefined" && Art.swatch ? Art.swatch(c) : `<span class="pdp-swatch-dot" style="background:${esc(c)}"></span>`);
  const wished = id => (typeof Wishlist !== "undefined" && Wishlist.has ? Wishlist.has(id) : false);
  const fresh = l => (l || []).map(x => (typeof x === "string" ? getProduct(x) : x)).filter(Boolean);
  const say = (msg, type) => { try { toast(msg, { type }); } catch (e) { /* ignore */ } };
  const DROP = STORE.drop || { number: "01", name: "" };
  const dropTag = `Drop ${DROP.number}`;
  const prints = p => ({ front: (p.print && p.print.front) || "", back: (p.print && p.print.back) || "" });

  /* fabric "100% Cotton, 240 GSM, bio-washed" → parts */
  function fabricParts(p) {
    const bits = (p.fabric || "").split(",").map(s => s.trim()).filter(Boolean);
    const gsm = (bits.find(b => /gsm/i.test(b)) || "").replace(/\s*gsm/i, " GSM");
    const wash = bits.find(b => /wash/i.test(b)) || "";
    const comp = bits.find(b => b !== gsm && !/gsm/i.test(b) && b !== wash) || "";
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    return { comp, gsm: gsm.trim(), wash: cap(wash) };
  }
  const NECK = { tee: "Crew", polo: "Polo collar", shirt: "Collar", kurta: "Mandarin", hoodie: "Hood", jacket: "Collar" };

  const fmtLeft = ms => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return d ? `${pad2(d)}d ${pad2(h)}h ${pad2(m)}m` : `${pad2(h)}h ${pad2(m)}m ${pad2(sec)}s`;
  };

  /* ---------- print copy (Art graphics) ---------- */
  const PRINTS = {
    core: { name: "BHAKSHI Stack", front: "A small BHAKSHI mark on the chest.", back: "The full BHAKSHI wordmark, stacked big across the back." },
    monsoon: { name: "Monsoon Season", front: "Rain-streak graphic on the chest.", back: "A rain-streak graphic with a circular type lockup across the back." },
    chai: { name: "Chai Break", front: "A line-drawn cutting-chai glass on the chest.", back: "The full break schedule across the back. 4:00 PM, every day." },
    express: { name: "Night Express", front: "A small route mark on the chest.", back: "A route map inspired by railway station boards, across the back." },
    hornok: { name: "Horn OK Please", front: "A small truck-art mark on the chest.", back: "A full-colour truck-art panel across the back." },
    logo: { name: "Chest mark", front: "A small BHAKSHI chest mark.", back: "A small BHAKSHI mark." }
  };
  const printLine = (k, side) => (PRINTS[k] ? PRINTS[k][side] : "");

  function slidesOf(p) {
    if (p.images && p.images.length) {
      return p.images.map((_, i) => ({ i, view: i === 1 ? "back" : "front", label: i === 0 ? "Front" : i === 1 ? "Back" : `Photo ${pad2(i + 1)}`, flip: i < 2 && p.images.length > 1 }));
    }
    return [{ i: 0, view: "front", label: "Front", flip: true }, { i: 0, view: "back", label: "Back", flip: true }, { i: 0, view: "detail", label: "Detail", flip: false }];
  }
  const media = (p, s) => productImage(p, s.i, s.view);
  const bare = (p, s) => productImage(p, s.i, s.view, { bg: false }); // for our own spotlight panels

  /* ---------- modal (shared) ---------- */
  const ModalAPI = {
    open(html, opts) {
      if (typeof Modal === "undefined" || !Modal.open) return null;
      const r = Modal.open(html, opts);
      return r && r.nodeType === 1 ? r : $(".modal-content");
    },
    close() { if (typeof Modal !== "undefined" && Modal.close) Modal.close(); }
  };

  /* ---------- size charts (inches) ---------- */
  const CHARTS = {
    oversized: { title: "Oversized tee", note: "Garment measurements, laid flat. Chest is measured armpit to armpit × 2; length from the high shoulder point to hem.",
      cols: ["Chest", "Length"], rows: { S: [44, 27], M: [46, 28], L: [48, 29], XL: [50, 30], XXL: [52, 31] },
      extra: "Dropped shoulder: the seam sits 2–3 in below your natural shoulder. That's the look." },
    tops: { title: "Tops", note: "Body measurements. Measure around the fullest part of the chest, under the arms.",
      cols: ["Chest", "Length", "Shoulder"], rows: { S: [38, 27, 17], M: [40, 28, 17.5], L: [42, 29, 18], XL: [44, 30, 18.5], XXL: [46, 31, 19] } },
    formal: { title: "Shirts (collar sizes)", note: "Size = chest in inches. Collar is measured around the base of the neck, with one finger of room.",
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
    if (p.fit === "Oversized" && TOPS.includes(p.shape)) return [CHARTS.oversized];
    return [CHARTS.tops];
  }
  const cell = (v, unit) => {
    const f = n => (unit === "cm" ? Math.round(n * 2.54) : n);
    return Array.isArray(v) ? `${f(v[0])}–${f(v[1])}` : f(v);
  };
  const TEE_DIAGRAM = `<svg class="sg-fig" viewBox="0 0 200 200" aria-hidden="true" fill="none">
    <path d="M62 30 L40 38 L14 66 L36 92 L50 82 L50 178 L150 178 L150 82 L164 92 L186 66 L160 38 L138 30 Q100 52 62 30 Z" stroke="currentColor" stroke-width="1.6"/>
    <path d="M62 30 Q100 50 138 30" stroke="currentColor" stroke-width="1.2" opacity=".6"/>
    <path d="M50 100 H150" stroke="var(--accent)" stroke-width="1.6" stroke-dasharray="4 3"/><path d="M50 96v8M150 96v8" stroke="var(--accent)" stroke-width="1.6"/>
    <text x="100" y="94" text-anchor="middle" fill="var(--accent)" font-family="Space Mono, monospace" font-size="10">CHEST</text>
    <path d="M168 34 V178" stroke="var(--accent)" stroke-width="1.6" stroke-dasharray="4 3"/><path d="M164 34h8M164 178h8" stroke="var(--accent)" stroke-width="1.6"/>
    <text x="176" y="140" fill="var(--accent)" font-family="Space Mono, monospace" font-size="10" transform="rotate(-90 176 140)">LENGTH</text>
  </svg>`;
  function chartTable(ch, p, unit) {
    const sizes = p.sizes.filter(s => ch.rows[s]);
    const pick = !isSold(p);
    return `<div class="sg-block">
      <div class="sg-scroll"><table class="sg-table">
        <caption class="sr-only">${esc(ch.title)} measurements in ${unit === "cm" ? "centimetres" : "inches"}</caption>
        <thead><tr><th scope="col">Size</th>${ch.cols.map(c => `<th scope="col">${c} <small>${unit}</small></th>`).join("")}${pick ? `<th scope="col"><span class="sr-only">Select</span></th>` : ""}</tr></thead>
        <tbody>${sizes.map(s => `<tr class="${sel.size === s ? "is-sel" : ""}">
          <th scope="row">${esc(s)}${ch.alias && ch.alias[s] ? ` <small>${ch.alias[s]}</small>` : ""}</th>
          ${ch.rows[s].map(v => `<td>${cell(v, unit)}</td>`).join("")}
          ${pick ? `<td><button type="button" class="sg-pick" data-sg-pick="${esc(s)}" aria-label="Select size ${esc(s)}">${sel.size === s ? "Selected" : "Pick"}</button></td>` : ""}
        </tr>`).join("")}</tbody>
      </table></div>
      <p class="sg-note">${esc(ch.note)}</p>
      ${ch.extra ? `<p class="sg-note sg-note-x">${esc(ch.extra)}</p>` : ""}
    </div>`;
  }
  function openSizeGuide() {
    const p = P;
    let unit = "in";
    try { unit = localStorage.getItem("bhakshi_unit") === "cm" ? "cm" : "in"; } catch (e) { /* ignore */ }
    const charts = chartsFor(p);
    const body = () => charts.map(ch => chartTable(ch, p, unit)).join("");
    const over = charts[0] === CHARTS.oversized;
    const html = `<div class="sg">
      <p class="sg-k">[ SIZE CHART ]</p>
      <h2 class="sg-title">${esc(short(p))}</h2>
      <p class="sg-sub">${esc(p.fit)} fit · ${esc(p.fabric)}</p>
      <div class="sg-top">
        ${over ? TEE_DIAGRAM : ""}
        <div class="sg-advice">
          ${over ? `<p class="sg-advice-h">Cut big on purpose.</p>
          <p>Take your usual size for the boxy, dropped-shoulder drape. <b>Size down one for a regular fit.</b></p>` :
          `<p class="sg-advice-h">Between sizes?</p><p>Size up for a relaxed drape, or size down for a closer fit.</p>`}
          <div class="sg-units" role="radiogroup" aria-label="Units">
            <button type="button" role="radio" data-unit="in" aria-checked="${unit === "in"}">Inches</button>
            <button type="button" role="radio" data-unit="cm" aria-checked="${unit === "cm"}">CM</button>
          </div>
        </div>
      </div>
      <div data-sg-body>${body()}</div>
      <p class="sg-help">Still unsure? <a href="${esc(WA(`Hi ${STORE.name}! Can you help me pick a size for "${p.name}"?`))}" target="_blank" rel="noopener">Ask us on WhatsApp</a>${isSold(p) ? "" : ` or <button type="button" class="sg-ff" data-sg-ff>find my size</button>`}.</p>
    </div>`;
    const c = ModalAPI.open(html, { size: "m", label: "Size chart" });
    if (!c) return;
    c.addEventListener("click", e => {
      const u = e.target.closest("[data-unit]");
      if (u) {
        unit = u.dataset.unit;
        try { localStorage.setItem("bhakshi_unit", unit); } catch (err) { /* ignore */ }
        $$("[data-unit]", c).forEach(b => b.setAttribute("aria-checked", b.dataset.unit === unit));
        $("[data-sg-body]", c).innerHTML = body();
        return;
      }
      const pk = e.target.closest("[data-sg-pick]");
      if (pk) { setSize(pk.dataset.sgPick); ModalAPI.close(); say(`Size ${pk.dataset.sgPick} selected`, "success"); return; }
      if (e.target.closest("[data-sg-ff]")) { openFitFinder(); }
    });
  }
  function openFitFinder() {
    if (!P) return;
    if (typeof FitFinder !== "undefined" && FitFinder.open) FitFinder.open({ productId: P.id, onPick: s => { ModalAPI.close(); setSize(s, true); } });
    else openSizeGuide();
  }

  /* ---------- delivery estimate ---------- */
  function addWorkDays(from, n) {
    const d = new Date(from);
    let k = 0;
    while (k < n) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0) k++; }
    return d;
  }
  const fmtDate = d => `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  function estimate(pin) {
    const out = $("#pinOut", root);
    if (!out) return;
    if (!/^[1-9]\d{5}$/.test(pin)) {
      out.innerHTML = `<p class="pin-err">Enter a valid 6-digit pincode.</p>`;
      $("#pin", root).setAttribute("aria-invalid", "true");
      return;
    }
    $("#pin", root).removeAttribute("aria-invalid");
    try { localStorage.setItem(PIN_KEY, pin); } catch (e) { /* ignore */ }
    const now = new Date();
    const a = addWorkDays(now, 1 + 3), b = addWorkDays(now, 2 + 7);
    const cod = STORE.codFee !== -1;
    const free = P.price >= STORE.freeShippingAbove;
    out.innerHTML = `<ul class="pin-res">
      <li><span class="pin-k">ETA</span><span>Delivery to <b>${pin}</b> by <b>${fmtDate(a)} – ${fmtDate(b)}</b></span></li>
      <li class="${cod ? "" : "is-off"}"><span class="pin-k">COD</span><span>${cod ? `Cash on Delivery available${STORE.codFee > 0 ? ` (+${rupee(STORE.codFee)})` : ""}` : "Cash on Delivery is off right now. Pay by UPI."}</span></li>
      <li><span class="pin-k">SHIP</span><span>${free ? "Ships free" : `Free shipping on orders above ${rupee(STORE.freeShippingAbove)}`}</span></li>
    </ul>`;
  }

  /* ---------- icons ---------- */
  const IC = {
    heart: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 20.3s-7.8-4.6-7.8-10.3A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 7.8 2.6c0 5.7-7.8 10.3-7.8 10.3Z" stroke-linejoin="round"/></svg>`,
    wa: `<svg width="18" height="18" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.6a10.6 10.6 0 0 1-5.4-1.5l-.4-.2-3.9 1 1-3.8-.2-.4A10.6 10.6 0 1 1 16 26.6zm5.8-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.7 8.7 0 0 1-4.3-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.7 3.7 0 0 0-1.1 2.7 6.4 6.4 0 0 0 1.3 3.4 14.7 14.7 0 0 0 5.6 5c2.1.9 2.9 1 4 .8a3.4 3.4 0 0 0 2.2-1.6 2.8 2.8 0 0 0 .2-1.6c-.1-.1-.3-.2-.6-.4z"/></svg>`,
    ruler: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 17 17 3l4 4L7 21H3z"/><path d="m7 13 2 2m2-6 2 2m2-6 2 2"/></svg>`,
    spark: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>`,
    expand: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>`,
    left: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>`,
    right: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`,
    flip: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"/><path d="M18 3v4h-4M6 21v-4h4"/></svg>`
  };

  /* ---------- markup: gallery ---------- */
  function badgesHTML(p) {
    const s = SI(p), b = [];
    if (s.soldOut) b.push(`<span class="badge badge-hot">Sold out</span>`);
    else if (s.low) b.push(`<span class="badge badge-hot">Low stock</span>`);
    if (!s.soldOut && (p.tags || []).includes("bestseller")) b.push(`<span class="badge badge-accent">Bestseller</span>`);
    else if (!s.soldOut && (p.tags || []).includes("new")) b.push(`<span class="badge badge-ghost">New</span>`);
    return b.join("");
  }
  function galleryHTML(p) {
    const s = slidesOf(p), many = s.length > 1, fp = fabricParts(p);
    const flips = s.filter(x => x.flip).length === 2;
    return `<div class="pdp-gallery" data-n="${s.length}">
      ${many ? `<div class="g-thumbs" role="group" aria-label="Product views">${s.map((x, i) =>
        `<button type="button" class="g-thumb" data-go="${i}" aria-label="Show ${esc(x.label)} view"><span class="g-thumb-m">${media(p, x)}</span><span class="g-thumb-l">${pad2(i + 1)} ${esc(x.label)}</span></button>`).join("")}</div>` : ""}
      <div class="g-stage" tabindex="0" role="region" aria-roledescription="carousel" aria-label="${esc(p.name)} images. Use arrow keys to change view, Enter for fullscreen.">
        <div class="g-flip" style="--rot:0deg">
          <div class="g-face g-face-a">${bare(p, s[0])}</div>
          <div class="g-face g-face-b" aria-hidden="true"></div>
        </div>
        <div class="g-wipe" aria-hidden="true"></div>
        <span class="g-crop g-crop-tl" aria-hidden="true"></span><span class="g-crop g-crop-tr" aria-hidden="true"></span>
        <span class="g-crop g-crop-bl" aria-hidden="true"></span><span class="g-crop g-crop-br" aria-hidden="true"></span>
        <span class="g-tag g-tag-tl" data-g-label aria-live="polite">[${esc(s[0].label.toUpperCase())}]</span>
        ${fp.gsm ? `<span class="g-tag g-tag-tr">${esc(fp.gsm)}</span>` : ""}
        <span class="g-tag g-tag-bl">${esc(dropTag.toUpperCase())} · No. ${numOf(p)}</span>
        <div class="g-badges">${badgesHTML(p)}</div>
        ${flips ? `<div class="g-viewtoggle" role="group" aria-label="Front or back">
          <button type="button" data-face="0" aria-pressed="true">Front</button>
          <button type="button" data-face="1" aria-pressed="false">Back</button>
          <span class="g-viewtoggle-ic" aria-hidden="true">${IC.flip}</span></div>` : ""}
        <button type="button" class="g-expand" data-lightbox aria-label="Open fullscreen gallery">${IC.expand}</button>
        ${many ? `<div class="g-dots" aria-hidden="true">${s.map((_, i) => `<span class="g-dot" data-dot="${i}"></span>`).join("")}</div>` : ""}
        <div class="g-lens" aria-hidden="true"><div class="g-lens-inner"></div></div>
      </div>
    </div>`;
  }

  /* ---------- markup: info ---------- */
  function careFor(p) {
    const f = (p.fabric || "").toLowerCase();
    if (f.includes("denim")) return ["Wash inside out in cold water", "Wash with similar colours; indigo may bleed in the first few washes", "Do not tumble dry", "Dry in shade"];
    if (f.includes("linen")) return ["Gentle machine wash, cold", "Do not wring; reshape while damp", "Iron while slightly damp on medium heat", "Dry in shade"];
    if (f.includes("fleece")) return ["Machine wash cold, inside out", "Do not bleach", "Line dry or tumble dry low", "Do not iron directly on the fleece face"];
    const printed = prints(p).front || prints(p).back;
    return ["Machine wash cold, inside out, with similar colours", "Do not bleach", printed ? "Do not iron directly on the print" : "Iron on medium heat", "Dry in shade to keep the colour deep"];
  }

  function accHTML(p) {
    const pr = prints(p), fp = fabricParts(p);
    const artOK = typeof Art !== "undefined" && Art.print && !(p.images && p.images.length);
    const printRow = (side, k) => {
      if (!k) return `<li class="acc-print"><span class="acc-print-k">${side}</span><span>Plain. No print.</span></li>`;
      return `<li class="acc-print">${artOK ? `<span class="acc-print-art" style="background:${esc(p.color)}" aria-hidden="true">${Art.print(k, { color: p.color })}</span>` : ""}
        <span class="acc-print-k">${side}</span><span><b>${esc((PRINTS[k] || {}).name || k)}.</b> ${esc(printLine(k, side.toLowerCase()) || "")}</span></li>`;
    };
    const items = [];
    if (pr.front || pr.back) items.push(["print", "The print", `<ul class="acc-prints">${printRow("Front", pr.front)}${printRow("Back", pr.back)}</ul>`]);
    items.push(["fit", "Fabric &amp; fit", `<p>${esc(p.desc || "")}</p>
      <dl class="acc-spec">
        ${fp.comp ? `<div><dt>Fabric</dt><dd>${esc(fp.comp)}${fp.gsm ? `, ${esc(fp.gsm)}` : ""}</dd></div>` : `<div><dt>Fabric</dt><dd>${esc(p.fabric)}</dd></div>`}
        <div><dt>Fit</dt><dd>${esc(p.fit)}${p.fit === "Oversized" ? ". Boxy body, dropped shoulders. Size down for a regular fit." : ""}</dd></div>
        <div><dt>Colour</dt><dd>${esc(p.colorName || "")}</dd></div>
        <div><dt>Code</dt><dd>${esc(p.id.toUpperCase())}</dd></div>
      </dl>`]);
    items.push(["care", "Care", `<ul class="acc-list">${careFor(p).map(c => `<li>${esc(c)}</li>`).join("")}</ul>`]);
    items.push(["ship", "Shipping &amp; exchange", `<ul class="acc-list">
        <li>Dispatched in 1–2 working days, delivered in 3–7 days across India</li>
        <li>Free shipping above ${rupee(STORE.freeShippingAbove)}, otherwise ${rupee(STORE.shippingFee)}</li>
        ${STORE.codFee !== -1 ? `<li>Cash on Delivery${STORE.codFee > 0 ? ` (+${rupee(STORE.codFee)})` : ""}, or pay by UPI</li>` : `<li>Pay by UPI</li>`}
        <li>Easy size exchange within 7 days of delivery. Unworn, tags on.</li></ul>
        <p><a class="link-arrow" href="policies.html#exchange">Exchange policy</a></p>`]);
    return `<div class="acc">${items.map(([k, t, b], i) => `<div class="acc-item ${i === 0 ? "open" : ""}">
      <h3 class="acc-h"><button type="button" class="acc-head" id="acc-${k}-h" aria-expanded="${i === 0}" aria-controls="acc-${k}"><span class="acc-n">${pad2(i + 1)}</span><span class="acc-t">${t}</span><span class="acc-ic" aria-hidden="true"></span></button></h3>
      <div class="acc-body" id="acc-${k}" role="region" aria-labelledby="acc-${k}-h"><div class="acc-inner">${b}</div></div></div>`).join("")}</div>`;
  }

  const waText = p => `Hi ${STORE.name}! I'm interested in "${p.name}" (${rupee(p.price)})${sel.size ? `, size ${sel.size}` : ""}. ${url(p)}`;
  const notifyText = p => `Hi ${STORE.name}! Please let me know if "${p.name}"${sel.size ? ` in size ${sel.size}` : ""} comes back. ${url(p)}`;
  const dropNotifyText = p => `Hi ${STORE.name}! Remind me when ${dropTag} goes live. I want "${p.name}"${sel.size ? ` in size ${sel.size}` : ""}. ${url(p)}`;

  /* segmented stock meter: one tick per unit (scaled for big editions) */
  function meterHTML(p) {
    const s = SI(p);
    const ticks = s.total ? Math.min(s.total, 40) : 0;
    const on = s.total ? Math.round((s.left / s.total) * ticks) : 0;
    const label = s.soldOut ? "Sold out" : s.low ? "Almost gone" : "In stock";
    return `<div class="pmeter ${s.low ? "is-low" : ""} ${s.soldOut ? "is-out" : ""}">
      <div class="pmeter-row">
        <span class="pmeter-n"><b>${pad2(s.left)}</b>${s.total ? ` / ${pad2(s.total)}` : ""} left</span>
        <span class="pmeter-s">${s.low && !s.soldOut ? `<span class="pmeter-dot" aria-hidden="true"></span>` : ""}${label}</span>
      </div>
      ${ticks ? `<span class="pmeter-ticks" role="img" aria-label="${s.left} of ${s.total} units left">${Array.from({ length: ticks }, (_, i) => `<i class="${i < on ? "on" : ""}"></i>`).join("")}</span>`
        : `<span class="pmeter-bar" aria-hidden="true"><i style="width:${s.soldOut ? 0 : 100}%"></i></span>`}
    </div>`;
  }

  function ctaHTML(p) {
    const s = SI(p), d = DS();
    if (s.soldOut) {
      return `<div class="pdp-actions is-out">
          <button type="button" class="btn btn-lg pdp-add" id="addBtn" disabled>Sold out</button>
          <button type="button" class="pdp-wish" data-wish="${esc(p.id)}" aria-pressed="${wished(p.id)}" aria-label="${wished(p.id) ? "Remove from wishlist" : "Add to wishlist"}">${IC.heart}</button>
        </div>
        <a class="btn btn-wa btn-lg btn-block pdp-notify" id="notifyBtn" target="_blank" rel="noopener" href="${esc(WA(notifyText(p)))}">${IC.wa}<span>Sold out — notify me on WhatsApp</span></a>`;
    }
    if (!d.live) {
      return `<div class="pdp-actions is-soon">
          <button type="button" class="btn btn-lg pdp-add pdp-add-soon" id="addBtn" disabled><span>Drops in</span> <b data-drop-left>${fmtLeft(d.msLeft)}</b></button>
          <button type="button" class="pdp-wish" data-wish="${esc(p.id)}" aria-pressed="${wished(p.id)}" aria-label="${wished(p.id) ? "Remove from wishlist" : "Add to wishlist"}">${IC.heart}</button>
        </div>
        <a class="btn btn-wa btn-lg btn-block pdp-notify" id="notifyBtn" target="_blank" rel="noopener" href="${esc(WA(dropNotifyText(p)))}">${IC.wa}<span>Notify me on WhatsApp</span></a>`;
    }
    const max = Math.min(10, s.left);
    return `<div class="pdp-actions">
        <div class="qty pdp-qty"><button type="button" data-q="-1" aria-label="Decrease quantity">−</button><input id="qtyIn" type="number" min="1" max="${max}" value="${sel.qty}" aria-label="Quantity" inputmode="numeric"><button type="button" data-q="1" aria-label="Increase quantity">+</button></div>
        <button type="button" class="btn btn-lg pdp-add" id="addBtn"><span class="pdp-add-t">Add to bag</span><span class="pdp-add-p">${rupee(p.price)}</span></button>
        <button type="button" class="pdp-wish" data-wish="${esc(p.id)}" aria-pressed="${wished(p.id)}" aria-label="${wished(p.id) ? "Remove from wishlist" : "Add to wishlist"}">${IC.heart}</button>
      </div>
      <button type="button" class="btn btn-light btn-lg btn-block pdp-buy" id="buyBtn">Buy now</button>`;
  }

  function infoHTML(p) {
    const s = SI(p), vs = variants(p), off = discount(p), fp = fabricParts(p);
    const sold = s.soldOut;
    return `<div class="pdp-info">
      <p class="pi-eyebrow"><a href="shop.html">${esc(dropTag)}</a><span aria-hidden="true">·</span><span>No. ${numOf(p)}</span><span class="pi-eyebrow-r">${esc(catName(p.category))}</span></p>
      <h1 class="pi-name">${esc(short(p))}</h1>
      <p class="pi-colour"><span class="pi-dot" style="--c:${esc(p.color)}" aria-hidden="true"></span><span>${esc(p.colorName || "")}</span><span class="pi-sep" aria-hidden="true">/</span><span>${esc(p.fit)} fit</span>${fp.gsm ? `<span class="pi-sep" aria-hidden="true">/</span><span>${esc(fp.gsm)}</span>` : ""}</p>
      <div class="pi-price">
        <b>${rupee(p.price)}</b>
        ${off > 0 ? `<s aria-label="MRP ${rupee(p.mrp)}">${rupee(p.mrp)}</s><em>${off}% off</em>` : ""}
        <span class="pi-tax">Inclusive of all taxes</span>
      </div>

      ${vs.length > 1 ? `<div class="pi-block">
        <p class="pi-label">Colour <span>${esc(p.colorName || "")}</span></p>
        <div class="pdp-swatches">${vs.map(v => `<a class="pdp-swatch ${v.id === p.id ? "is-current" : ""} ${isSold(v) ? "is-sold" : ""}" href="product.html?id=${encodeURIComponent(v.id)}" data-variant="${esc(v.id)}"
            aria-label="${esc(v.colorName)}${isSold(v) ? " (sold out)" : ""}" ${v.id === p.id ? 'aria-current="true"' : ""} title="${esc(v.colorName)}">${swatch(v.color)}</a>`).join("")}</div>
      </div>` : ""}

      ${meterHTML(p)}

      <div class="pi-block pi-size" id="sizeBlock">
        <div class="pi-label-row">
          <p class="pi-label" id="sizeLbl">Size <span id="sizeVal">${sel.size ? esc(sel.size) : sold ? "—" : "Pick one"}</span></p>
          <div class="pi-links">
            ${sold ? "" : `<button type="button" class="pi-link" data-fitfinder data-product="${esc(p.id)}">${IC.spark}<span>Find my size</span></button>`}
            <button type="button" class="pi-link" data-sizeguide>${IC.ruler}<span>Size chart</span></button>
          </div>
        </div>
        <div class="pi-sizes" role="group" aria-labelledby="sizeLbl">${p.sizes.map(z =>
          `<button type="button" class="pi-sz" data-sz="${esc(z)}" aria-pressed="${sel.size === z}" ${sold ? "disabled" : ""}>${esc(z)}</button>`).join("")}</div>
        <p class="pi-size-err" id="sizeErr" role="alert" hidden>Pick a size first.</p>
        ${p.fit === "Oversized" ? `<p class="pi-fitnote">Cut oversized. Size down one for a regular fit.</p>` : ""}
      </div>

      ${ctaHTML(p)}

      <a class="pi-wa" id="waLink" target="_blank" rel="noopener" href="${esc(WA(waText(p)))}">${IC.wa}<span>Questions about fit? <b>Ask on WhatsApp</b></span></a>

      <div class="pi-deliver">
        <form class="pi-pin" id="pinForm" novalidate>
          <label for="pin" class="pi-label">Check delivery</label>
          <div class="pi-pin-row"><input id="pin" name="pin" inputmode="numeric" autocomplete="postal-code" maxlength="6" placeholder="6-digit pincode" value="${esc((() => { try { return localStorage.getItem(PIN_KEY) || ""; } catch (e) { return ""; } })())}">
          <button type="submit" class="pi-pin-btn">Check</button></div>
        </form>
        <div id="pinOut" aria-live="polite"></div>
      </div>

      <ul class="pi-perks">
        <li><b>Free shipping</b><span>Over ${rupee(STORE.freeShippingAbove)}</span></li>
        <li><b>${STORE.codFee !== -1 ? "Cash on Delivery" : "UPI"}</b><span>${STORE.codFee !== -1 ? "Pay at your door" : "Fast and secure"}</span></li>
        <li><b>7-day exchange</b><span>Wrong size? Sorted</span></li>
      </ul>

      ${accHTML(p)}
    </div>`;
  }

  /* ---------- story + spec strip ---------- */
  function storyHTML(p) {
    const pr = prints(p), fp = fabricParts(p);
    const sentences = String(p.desc || "").match(/[^.!?]+[.!?]+/g) || [p.desc || ""];
    const head = (sentences[0] || "").trim(), rest = sentences.slice(1).join(" ").trim();
    const key = pr.back || pr.front;
    const useArt = typeof Art !== "undefined" && Art.print && key && key !== "logo" && !(p.images && p.images.length);
    const art = useArt ? Art.print(key, { color: p.color }) : productImage(p, p.images && p.images.length > 2 ? 2 : 0, "detail");
    const specs = [
      ["Fabric", fp.comp || p.fabric],
      ["Weight", fp.gsm],
      ["Fit", p.fit],
      ["Wash", fp.wash],
      [BOTTOMS.includes(p.shape) ? "Waist" : "Neck", BOTTOMS.includes(p.shape) ? "" : NECK[p.shape] || ""],
      ["Made in", "India"],
      ["Edition", p.edition ? `${p.edition} units` : ""]
    ].filter(x => x[1]);
    return `<section class="pdp-story" aria-labelledby="storyH">
      <div class="container">
        <div class="story-grid">
          <div class="story-art ${useArt ? "is-print" : ""}" style="--garment:${esc(p.color)}">
            <span class="story-art-k">[ ${useArt ? `${pr.back ? "BACK" : "FRONT"} PRINT` : "DETAIL"} ]</span>
            <div class="story-art-m">${art}</div>
            ${useArt && PRINTS[key] ? `<span class="story-art-n">${esc(PRINTS[key].name)}</span>` : ""}
          </div>
          <div class="story-copy">
            <p class="story-k">[ THE STORY ]</p>
            <h2 class="story-h" id="storyH">${esc(head)}</h2>
            ${rest ? `<p class="story-p">${esc(rest)}</p>` : ""}
          </div>
        </div>
        <dl class="spec-strip">${specs.map(([k, v], i) => `<div><dt><span>${pad2(i + 1)}</span>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
      </div>
    </section>`;
  }

  function buybarHTML(p) {
    const s = SI(p), d = DS();
    const right = s.soldOut
      ? `<a class="btn btn-wa buybar-btn" target="_blank" rel="noopener" href="${esc(WA(notifyText(p)))}">Notify me</a>`
      : !d.live
        ? `<a class="btn btn-ghost buybar-btn" target="_blank" rel="noopener" href="${esc(WA(dropNotifyText(p)))}"><span data-drop-left>${fmtLeft(d.msLeft)}</span></a>`
        : `<select class="buybar-size" id="barSize" aria-label="Size"><option value="">Size</option>${p.sizes.map(z => `<option ${sel.size === z ? "selected" : ""}>${esc(z)}</option>`).join("")}</select>
           <button type="button" class="btn buybar-btn" id="barAdd">Add to bag</button>`;
    return `<div class="buybar-inner">
      <div class="buybar-thumb" data-fly>${productImage(p, 0, "front")}</div>
      <div class="buybar-meta"><span class="buybar-name">${esc(short(p))}</span><span class="buybar-sub"><b>${rupee(p.price)}</b>${p.mrp > p.price ? `<s>${rupee(p.mrp)}</s>` : ""}<span>${s.soldOut ? "Sold out" : `${pad2(s.left)} left`}</span></span></div>
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
    return `<section class="section pdp-look" aria-labelledby="lookH"><div class="container">
      <div class="section-head"><div><p class="eyebrow">[ STYLED TOGETHER ]</p><h2 class="display-m" id="lookH">Complete the look</h2></div></div>
      <div class="look-grid">
        <div class="look-visual" data-fly>${visual}</div>
        <div class="look-panel">
          <ul class="look-list">${items.map((x, i) => {
            const sold = isSold(x) || !BUY(x);
            return `<li class="look-item ${sold ? "" : "is-on"}" data-look="${esc(x.id)}">
              <label class="look-check"><input type="checkbox" data-look-on="${esc(x.id)}" ${sold ? "disabled" : "checked"} aria-label="Include ${esc(x.name)}"><span class="fbox" aria-hidden="true"></span></label>
              <a class="look-thumb" href="product.html?id=${encodeURIComponent(x.id)}" ${i === 0 ? 'tabindex="-1"' : ""}>${productImage(x, 0, "front")}</a>
              <div class="look-meta">
                <span class="look-cat">${i === 0 ? "This piece" : esc(catName(x.category))}</span>
                <a href="product.html?id=${encodeURIComponent(x.id)}" class="look-name">${esc(short(x))}</a>
                <span class="look-price"><b>${rupee(x.price)}</b>${x.mrp > x.price ? `<s>${rupee(x.mrp)}</s>` : ""}</span>
              </div>
              ${sold ? `<span class="look-sold">${isSold(x) ? "Sold out" : "Soon"}</span>` : `<select class="look-size" data-look-size="${esc(x.id)}" aria-label="Size for ${esc(x.name)}"><option value="">Size</option>${x.sizes.map(z => `<option ${i === 0 && sel.size === z ? "selected" : ""}>${esc(z)}</option>`).join("")}</select>`}
            </li>`;
          }).join("")}</ul>
          <div class="look-foot"><p class="look-total"><span>Total · <b data-look-n>0</b> pieces</span><b data-look-sum></b></p>
            <button type="button" class="btn btn-lg btn-block" data-look-add>Add selected</button></div>
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
    $("[data-look-sum]", box).textContent = rupee(sum);
    btn.textContent = on.length ? `Add selected · ${rupee(sum)}` : "Select pieces to add";
    btn.disabled = !on.length;
  }

  /* ---------- rails ---------- */
  function railHTML(id, eyebrow, title, items, link) {
    if (!items.length) return "";
    return `<section class="section pdp-rail ${id === "more" ? "pdp-rail-more" : ""}" aria-labelledby="rail-${id}"><div class="container">
      <div class="section-head"><div><p class="eyebrow">${eyebrow}</p><h2 class="display-s" id="rail-${id}">${title} <span class="rail-n">(${pad2(items.length)})</span></h2></div>${link ? `<a class="link-arrow" href="${link}">View all</a>` : ""}</div>
      <div class="scroller">${items.map(productCard).join("")}</div>
    </div></section>`;
  }
  function moreFor(p) {
    const others = PRODUCTS.filter(x => x.id !== p.id && x.family !== p.family);
    const idx = new Map(PRODUCTS.map((x, i) => [x.id, i]));
    if (PRODUCTS.length <= 8) return others.sort((a, b) => (isSold(a) - isSold(b)) || idx.get(a.id) - idx.get(b.id));
    const grp = id => (CATEGORIES.find(c => c.id === id) || {}).group, g = grp(p.category);
    return others.map(x => ({ x, s: (x.category === p.category ? 4 : 0) + (grp(x.category) === g ? 2 : 0) + ((x.tags || []).some(t => (p.tags || []).includes(t)) ? 1 : 0) - (isSold(x) ? 10 : 0) }))
      .sort((a, b) => b.s - a.s).slice(0, 10).map(o => o.x);
  }

  /* ---------- SEO ---------- */
  function seo(p) {
    document.title = `${p.name} | ${STORE.name}`;
    let md = $('meta[name="description"]');
    if (!md) { md = document.createElement("meta"); md.name = "description"; document.head.appendChild(md); }
    const d = `${p.name}: ${p.desc} ${p.fit} fit, ${p.fabric}. ${rupee(p.price)}, Cash on Delivery and 7-day exchange.`;
    md.setAttribute("content", d.length > 160 ? d.slice(0, 157) + "…" : d);
    $('meta[name="robots"]') && $('meta[name="robots"]').remove();
    let ld = $("#ldProduct");
    if (!ld) { ld = document.createElement("script"); ld.type = "application/ld+json"; ld.id = "ldProduct"; document.head.appendChild(ld); }
    const data = {
      "@context": "https://schema.org", "@type": "Product",
      name: p.name, description: p.desc, sku: p.id, color: p.colorName, material: p.fabric,
      category: catName(p.category),
      brand: { "@type": "Brand", name: STORE.name },
      offers: {
        "@type": "Offer", url: url(p), priceCurrency: "INR", price: String(p.price),
        availability: isSold(p) ? "https://schema.org/OutOfStock" : DS().live ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
        itemCondition: "https://schema.org/NewCondition"
      }
    };
    if (p.images && p.images.length) data.image = p.images.map(i => new URL(i, location.href).href);
    ld.textContent = JSON.stringify(data);
  }

  /* ---------- size / qty / cart ---------- */
  function setSize(s, fromPick) {
    if (!P || isSold(P)) return;
    if (!P.sizes.includes(String(s))) {
      if (fromPick) say(`We'd suggest size ${s}, which this style doesn't come in. Check the size chart.`, "info");
      return;
    }
    sel.size = String(s);
    $$("[data-sz]", root).forEach(b => b.setAttribute("aria-pressed", b.dataset.sz === sel.size));
    const v = $("#sizeVal", root); if (v) v.textContent = sel.size;
    const err = $("#sizeErr", root); if (err) err.hidden = true;
    const blk = $("#sizeBlock", root); if (blk) blk.classList.remove("has-error");
    const bs = $("#barSize"); if (bs) bs.value = sel.size;
    const ls = $(`[data-look-size="${CSS.escape(P.id)}"]`); if (ls) ls.value = sel.size;
    const w = $("#waLink", root); if (w) w.href = WA(waText(P));
    const n = $("#notifyBtn", root); if (n) n.href = WA(DS().live ? notifyText(P) : dropNotifyText(P));
    if (fromPick) say(`Size ${sel.size} picked for you`, "success");
  }
  function flagSize() {
    const blk = $("#sizeBlock", root), err = $("#sizeErr", root);
    if (err) err.hidden = false;
    if (!blk) return;
    blk.classList.remove("has-error", "shake"); void blk.offsetWidth; blk.classList.add("has-error", "shake");
    const r = blk.getBoundingClientRect();
    if (r.top < 90 || r.bottom > innerHeight) scrollTo({ top: r.top + scrollY - 140, behavior: reduceMotion() ? "auto" : "smooth" });
    setTimeout(() => { const b = $(".pi-sz:not(:disabled)", root); b && b.focus({ preventScroll: true }); }, 300);
  }
  function addToBag(srcEl, { thenCheckout = false } = {}) {
    if (!P) return false;
    if (!BUY(P)) {
      say(isSold(P) ? "This one's sold out." : `Not live yet. ${dropTag} drops in ${fmtLeft(DS().msLeft)}.`, "info");
      return false;
    }
    if (!sel.size) { flagSize(); return false; }
    const ok = Cart.add(P.id, sel.size, sel.qty);
    if (ok === false) { say("Couldn't add that to your bag.", "error"); return false; }
    if (thenCheckout) { location.href = "checkout.html"; return true; }
    const fly = typeof flyToCart === "function";
    if (fly) { try { flyToCart(srcEl || $(".g-face-a", root)); } catch (e) { /* ignore */ } }
    say(`Added · ${short(P)}, size ${sel.size}${sel.qty > 1 ? ` × ${sel.qty}` : ""}`, "success");
    setTimeout(() => typeof openCart === "function" && openCart(), fly && !reduceMotion() ? 750 : 150);
    return true;
  }

  function paintQty() {
    const t = $(".pdp-add-p", root); if (t && P) t.textContent = rupee(P.price * sel.qty);
  }

  /* ---------- gallery behaviour ---------- */
  function initGallery(start) {
    const g = $(".pdp-gallery", root);
    const stage = $(".g-stage", g), flip = $(".g-flip", g), wipe = $(".g-wipe", g);
    const faceA = $(".g-face-a", g), faceB = $(".g-face-b", g);
    const s = slidesOf(P), n = s.length;
    gal.idx = 0; gal.rot = 0;
    let busy = false, swiped = false;
    const visible = () => (Math.round(gal.rot / 180) % 2 === 0 ? faceA : faceB);
    const hidden = () => (visible() === faceA ? faceB : faceA);
    const mark = i => {
      gal.idx = i;
      $$("[data-go]", g).forEach((b, k) => { b.classList.toggle("is-active", k === i); b.setAttribute("aria-current", k === i ? "true" : "false"); });
      $$("[data-dot]", g).forEach((d, k) => d.classList.toggle("is-active", k === i));
      $$("[data-face]", g).forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.face === i)));
      const lab = $("[data-g-label]", g); if (lab) lab.textContent = `[${s[i].label.toUpperCase()}]`;
      g.dataset.view = s[i].view;
      lensFor = null;
    };
    const go = (i, dir) => {
      i = ((i % n) + n) % n;
      if (i === gal.idx || busy) return;
      const from = s[gal.idx], to = s[i];
      const html = bare(P, to);
      if (reduceMotion()) { visible().innerHTML = html; mark(i); return; }
      if (from.flip && to.flip) {
        // 3D flip between front and back
        const h = hidden();
        h.innerHTML = html;
        h.removeAttribute("aria-hidden"); visible().setAttribute("aria-hidden", "true");
        gal.rot += (dir || (i > gal.idx ? 1 : -1)) * 180;
        flip.style.setProperty("--rot", gal.rot + "deg");
        busy = true; setTimeout(() => (busy = false), 420);
        mark(i);
        return;
      }
      // clip-path wipe for everything else (detail, extra photos)
      const fwd = dir ? dir > 0 : i > gal.idx;
      wipe.innerHTML = html;
      wipe.classList.add("on");
      busy = true;
      const done = () => { visible().innerHTML = html; wipe.classList.remove("on"); wipe.innerHTML = ""; busy = false; };
      if (wipe.animate) {
        wipe.animate([
          { clipPath: fwd ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)" },
          { clipPath: "inset(0 0 0 0)" }
        ], { duration: 560, easing: "cubic-bezier(.7,0,.2,1)" }).finished.then(done).catch(done);
      } else done();
      mark(i);
    };
    gal.go = go;

    g.addEventListener("click", e => {
      const t = e.target.closest("[data-go]"); if (t) return go(+t.dataset.go);
      const f = e.target.closest("[data-face]"); if (f) return go(+f.dataset.face);
      if (e.target.closest("[data-lightbox]")) return openLightbox(gal.idx);
      if (e.target.closest(".g-flip") && !swiped) openLightbox(gal.idx);
    });
    stage.addEventListener("keydown", e => {
      if (e.target !== stage) return;
      if (e.key === "ArrowRight") { e.preventDefault(); go(gal.idx + 1, 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(gal.idx - 1, -1); }
      if (e.key === "Enter") { e.preventDefault(); openLightbox(gal.idx); }
    });

    // swipe (touch + pen + mouse drag)
    let sx = null, sy = 0;
    stage.addEventListener("pointerdown", e => { if (e.target.closest("button")) return; sx = e.clientX; sy = e.clientY; swiped = false; });
    stage.addEventListener("pointerup", e => {
      if (sx === null) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      sx = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        swiped = true;
        go(gal.idx + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
        setTimeout(() => (swiped = false), 50);
      }
    });
    stage.addEventListener("pointercancel", () => (sx = null));

    // hover zoom lens (desktop, fine pointer)
    const lens = $(".g-lens", g), inner = $(".g-lens-inner", g);
    const Z = 2.4;
    let lensFor = null;
    const hide = () => { lens.classList.remove("on"); stage.classList.remove("is-zooming"); };
    stage.addEventListener("mousemove", e => {
      if (!fineHover.matches || innerWidth < 1024 || busy) return hide();
      if (e.target.closest("button, .g-viewtoggle, .g-badges")) return hide();
      const face = visible(), r = face.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (x < 0 || y < 0 || x > r.width || y > r.height) return hide();
      if (lensFor !== gal.idx) { inner.innerHTML = face.innerHTML; lensFor = gal.idx; }
      inner.style.width = r.width * Z + "px";
      inner.style.height = r.height * Z + "px";
      const L = lens.offsetWidth / 2;
      lens.style.transform = `translate(${e.clientX - sr.left - L}px, ${e.clientY - sr.top - L}px)`;
      inner.style.transform = `translate(${-(x * Z - L)}px, ${-(y * Z - L)}px)`;
      lens.classList.add("on");
      stage.classList.add("is-zooming");
    });
    stage.addEventListener("mouseleave", hide);

    mark(0);
    if (start) { const k = Math.min(start, n - 1); visible().innerHTML = bare(P, s[k]); mark(k); }
  }

  function openLightbox(start) {
    const p = P, s = slidesOf(p), n = s.length;
    const html = `<div class="lb">
      <div class="lb-stage">
        <div class="lb-media" data-lb-media></div>
        ${n > 1 ? `<button type="button" class="lb-arrow lb-prev" data-lb-step="-1" aria-label="Previous image">${IC.left}</button>
        <button type="button" class="lb-arrow lb-next" data-lb-step="1" aria-label="Next image">${IC.right}</button>` : ""}
      </div>
      <div class="lb-foot">
        <p class="lb-cap"><span>${esc(short(p))}</span><span data-lb-count></span></p>
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
      m.innerHTML = bare(p, s[i]);
      if (!reduceMotion() && m.animate) m.animate([{ opacity: 0, clipPath: "inset(0 0 0 8%)" }, { opacity: 1, clipPath: "inset(0 0 0 0)" }], { duration: 320, easing: "cubic-bezier(.7,0,.2,1)" });
      $("[data-lb-count]", c).textContent = `${pad2(i + 1)} / ${pad2(n)} · ${s[i].label.toUpperCase()}`;
      $$("[data-lb]", c).forEach((b, j) => b.setAttribute("aria-current", j === i ? "true" : "false"));
    };
    c.addEventListener("click", e => {
      const t = e.target.closest("[data-lb]"); if (t) return show(+t.dataset.lb);
      const st = e.target.closest("[data-lb-step]"); if (st) return show(i + +st.dataset.lbStep);
      if (e.target.closest("[data-lb-media]") && !lbSwiped) {
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
    let sx = null, lbSwiped = false;
    m.addEventListener("pointerdown", e => { sx = e.clientX; lbSwiped = false; });
    m.addEventListener("pointerup", e => {
      if (sx !== null && Math.abs(e.clientX - sx) > 40 && !m.classList.contains("is-zoomed")) { lbSwiped = true; show(i + (e.clientX < sx ? 1 : -1)); setTimeout(() => (lbSwiped = false), 50); }
      sx = null;
    });
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
    const foot = document.querySelector("footer");
    const footIn = foot && foot.getBoundingClientRect().top < innerHeight - 40;
    const show = !!(btn && P && btn.getBoundingClientRect().bottom < 0 && !footIn);
    if (bar.classList.contains("show") === show) return;
    bar.classList.toggle("show", show);
    bar.setAttribute("aria-hidden", String(!show));
    bar.inert = !show;
    document.body.classList.toggle("has-buybar", show);
  }
  addEventListener("scroll", () => { if (!barRaf) barRaf = requestAnimationFrame(checkBuyBar); }, { passive: true });

  /* ---------- render ---------- */
  function renderNotFound() {
    P = null;
    $("#pdpCrumbs").innerHTML = `<li><a href="index.html">Home</a></li><li><a href="shop.html">Shop</a></li><li aria-current="page"><span>Not found</span></li>`;
    root.innerHTML = `<div class="pdp-404">
      <p class="pdp-404-big outline-text" aria-hidden="true">404</p>
      <div class="pdp-404-copy">
        <p class="pdp-404-k">[ NOT FOUND ]</p>
        <h1 class="pdp-404-h">This one left the building.</h1>
        <p>The link might be broken, or the piece isn't in the line-up anymore. The rest of ${esc(dropTag)} is right here.</p>
        <div class="pdp-404-cta"><a class="btn btn-lg" href="shop.html">Shop the drop</a><a class="btn btn-ghost btn-lg" href="index.html">Home</a></div>
      </div>
    </div>`;
    document.title = `Not found | ${STORE.name}`;
    if (!$('meta[name="robots"]')) document.head.insertAdjacentHTML("beforeend", `<meta name="robots" content="noindex">`);
    $("#ldProduct") && $("#ldProduct").remove();
    $("#pdpStory").innerHTML = "";
    $("#pdpLook").innerHTML = "";
    $("#buyBar").innerHTML = "";
    $("#pdpMore").innerHTML = railHTML("more", `[ ${esc(dropTag.toUpperCase())} ]`, "The drop", PRODUCTS.filter(x => !isSold(x)));
    renderRecent(null);
    if (typeof refreshReveal === "function") refreshReveal();
  }

  function renderRecent(p) {
    if (typeof Recent === "undefined") { $("#pdpRecent").innerHTML = ""; return; }
    const items = fresh(Recent.list(p ? p.id : undefined)).filter(x => !p || x.id !== p.id).slice(0, 10);
    $("#pdpRecent").innerHTML = railHTML("recent", "[ PICK UP WHERE YOU LEFT OFF ]", "Recently viewed", items);
  }

  function render(p, { keepGallery = false } = {}) {
    const keepIdx = keepGallery ? gal.idx : 0;
    P = p;
    if (!p.sizes.includes(sel.size)) sel.size = null;
    if (p.sizes.length === 1) sel.size = p.sizes[0];
    if (isSold(p)) sel.size = null;
    sel.qty = 1;
    const c = CATEGORIES.find(x => x.id === p.category) || {};
    $("#pdpCrumbs").innerHTML = `<li><a href="index.html">Home</a></li><li><a href="shop.html">Shop</a></li>${LIVE() > 1 ? `<li><a href="shop.html?cat=${encodeURIComponent(p.category)}">${esc(c.name || catName(p.category))}</a></li>` : ""}<li aria-current="page"><span>${esc(short(p))}</span></li>`;
    root.innerHTML = `<div class="pdp ${isSold(p) ? "is-sold" : ""} ${DS().live ? "" : "is-soon"}">${galleryHTML(p)}${infoHTML(p)}</div>`;
    initGallery(keepIdx);
    $("#buyBar").innerHTML = buybarHTML(p);
    $("#pdpStory").innerHTML = storyHTML(p);
    $("#pdpLook").innerHTML = lookHTML(p);
    updateLook();
    $("#pdpMore").innerHTML = railHTML("more", `[ ${esc(dropTag.toUpperCase())} ]`, `More from ${esc(dropTag)}`, moreFor(p), "shop.html");
    if (typeof Recent !== "undefined") Recent.add(p.id);
    renderRecent(p);
    seo(p);
    let pin = null;
    try { pin = localStorage.getItem(PIN_KEY); } catch (e) { /* ignore */ }
    if (pin) estimate(pin);
    checkBuyBar();
    if (typeof refreshReveal === "function") refreshReveal();
  }
  const LIVE = () => (typeof liveCategories === "function" ? liveCategories().length : new Set(PRODUCTS.map(x => x.category)).size);

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

  /* ---------- drop countdown: tick labels, re-render when it goes live ---------- */
  let wasLive = DS().live;
  setInterval(() => {
    const d = DS();
    if (d.live !== wasLive) { wasLive = d.live; if (P) render(P, { keepGallery: true }); return; }
    if (!d.live) $$("[data-drop-left]").forEach(el => (el.textContent = fmtLeft(d.msLeft)));
  }, 1000);

  /* ---------- events (bound once, delegated) ---------- */
  root.addEventListener("click", e => {
    const v = e.target.closest("[data-variant]");
    if (v && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) { e.preventDefault(); swapTo(v.dataset.variant, true); return; }
    const sz = e.target.closest("[data-sz]"); if (sz) return setSize(sz.dataset.sz);
    if (e.target.closest("[data-sizeguide]")) return openSizeGuide();
    const q = e.target.closest("[data-q]");
    if (q) {
      const max = Math.min(10, SI(P).left);
      sel.qty = Math.max(1, Math.min(max, sel.qty + +q.dataset.q));
      $("#qtyIn", root).value = sel.qty; paintQty(); return;
    }
    if (e.target.closest("#addBtn")) return addToBag($(".g-stage", root));
    if (e.target.closest("#buyBtn")) return addToBag(null, { thenCheckout: true });
    const acc = e.target.closest(".acc-head"); if (acc) return toggleAcc(acc);
  });
  root.addEventListener("change", e => {
    if (e.target.id === "qtyIn") { sel.qty = Math.max(1, Math.min(Math.min(10, SI(P).left), parseInt(e.target.value, 10) || 1)); e.target.value = sel.qty; paintQty(); }
  });
  root.addEventListener("submit", e => {
    if (e.target.id !== "pinForm") return;
    e.preventDefault();
    estimate($("#pin", root).value.trim());
  });
  root.addEventListener("input", e => {
    if (e.target.id === "pin") e.target.value = e.target.value.replace(/\D/g, "").slice(0, 6);
  });

  // Find my size: FitFinder with a callback (capture phase so features.js' generic handler doesn't also open)
  document.addEventListener("click", e => {
    const ff = e.target.closest("[data-fitfinder]");
    if (!ff || !P || !root.contains(ff)) return;
    e.preventDefault();
    e.stopPropagation();
    openFitFinder();
  }, true);

  $("#buyBar").addEventListener("change", e => { if (e.target.id === "barSize" && e.target.value) setSize(e.target.value); });
  $("#buyBar").addEventListener("click", e => {
    if (!e.target.closest("#barAdd")) return;
    if (!sel.size) {
      const s = $("#barSize"); s.classList.remove("shake"); void s.offsetWidth; s.classList.add("shake"); s.focus();
      say("Pick a size first", "info");
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
      say(missing.length === 1 ? "Pick a size for the highlighted piece" : `Pick sizes for ${missing.length} pieces`, "info");
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
    const np = getProduct(new URLSearchParams(location.search).get("id"));
    np ? render(np) : renderNotFound();
  });

  /* ---------- boot ---------- */
  const first = getProduct(new URLSearchParams(location.search).get("id"));
  first ? render(first) : renderNotFound();
})();
