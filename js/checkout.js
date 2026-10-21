/* BHAKSHI — checkout (3-step stepper → order sent to WhatsApp, pay by UPI or COD).
   No backend: the order is composed as a WhatsApp message to STORE.whatsapp.
   v2 look: dark "order ticket" — mono numbers, hairlines, acid steps, perforated receipt. */
(() => {
  const root = document.getElementById("checkout-root");
  if (!root) return;

  const KEY_ADDR = "bhakshi_address";
  const KEY_LAST = "bhakshi_last_order";
  const KEY_COUPON = "bhakshi_coupon";
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const codOn = STORE.codFee >= 0;
  const dropNo = (STORE.drop && STORE.drop.number) || "01";

  const STATES = ["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
    "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
    "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
    "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"];

  const read = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full / private */ } };
  const say = (msg, o) => { if (typeof toast === "function") toast(msg, o); };

  /* ordering is open only when the owner has set a real WhatsApp number AND the drop is live */
  const waReady = () => /^91[6-9]\d{9}$/.test(String(STORE.whatsapp || ""));
  function drop() {
    if (typeof dropState === "function") { try { return dropState(); } catch { /* fall through */ } }
    const l = STORE.drop && STORE.drop.launch, t = l ? new Date(l).getTime() : NaN;
    const msLeft = isNaN(t) ? 0 : Math.max(0, t - Date.now());
    return { live: msLeft <= 0, launch: isNaN(t) ? null : new Date(t), msLeft };
  }
  const canOrder = () => waReady() && drop().live;

  const state = {
    step: 1,
    pay: "upi",
    coupon: (() => { const c = sessionStorage.getItem(KEY_COUPON); return c && STORE.coupons[c] ? c : ""; })(),
    placed: false,
    pinAuto: { city: "", state: "" }
  };

  /* ---------------- money ---------------- */
  function totals(pay = state.pay) {
    const sub = Cart.subtotal();
    const pct = state.coupon ? STORE.coupons[state.coupon] || 0 : 0;
    const disc = Math.round(sub * pct / 100);
    const after = sub - disc;
    const ship = sub > 0 && after < STORE.freeShippingAbove ? STORE.shippingFee : 0;
    const cod = pay === "cod" && codOn ? STORE.codFee : 0;
    return { sub, pct, disc, after, ship, cod, total: after + ship + cod, toFree: Math.max(0, STORE.freeShippingAbove - after) };
  }

  /* ---------------- icons ---------------- */
  const I = {
    wa: `<svg viewBox="0 0 32 32" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.6a10.6 10.6 0 0 1-5.4-1.5l-.4-.2-3.9 1 1-3.8-.2-.4A10.6 10.6 0 1 1 16 26.6zm5.8-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.7 8.7 0 0 1-4.3-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.7 3.7 0 0 0-1.1 2.7 6.4 6.4 0 0 0 1.3 3.4 14.7 14.7 0 0 0 5.6 5c2.1.9 2.9 1 4 .8a3.4 3.4 0 0 0 2.2-1.6 2.8 2.8 0 0 0 .2-1.6c-.1-.1-.3-.2-.6-.4z"/></svg>`,
    check: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>`,
    copy: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="1"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/></svg>`,
    lock: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`,
    chev: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`,
    pin: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>`,
    upi: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="1.5"/><path d="M10 18.5h4"/><path d="m10 8 2 4 2-4"/></svg>`,
    cash: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="1"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/></svg>`,
    tag: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/></svg>`,
    truck: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>`,
    arrow: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
    back: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>`
  };

  /* ---------------- helpers ---------------- */
  function copyText(text) {
    const done = () => say("Copied: " + text, { type: "success" });
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(done, fallback); }
    else fallback();
    function fallback() {
      const t = document.createElement("textarea"); t.value = text; t.setAttribute("readonly", "");
      t.style.cssText = "position:fixed;opacity:0;top:0"; document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); done(); } catch { /* ignore */ }
      t.remove();
    }
  }
  const field = id => document.getElementById("ck-" + id);
  const val = id => (field(id) ? field(id).value.trim() : "");
  const fmtPhone = p => p ? `+91 ${p.slice(0, 5)} ${p.slice(5)}` : "";
  const removeLine = i => (typeof Cart.remove === "function" ? Cart.remove(i) : Cart.setQty(i, 0));
  // order message always goes to the store's own number (placeOrder refuses to run without one)
  const orderLink = text => `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(text)}`;
  const normState = s => String(s || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z]/g, "");
  const pad2 = n => String(n).padStart(2, "0");

  /* barcode-ish SVG derived from a string (decorative; the readable id sits next to it) */
  function barcode(str, h = 44) {
    let x = 0; const bars = [];
    ("*" + str + "*").split("").forEach(ch => {
      const c = ch.charCodeAt(0) * 7 + 3;
      for (let k = 0; k < 6; k++) {
        const w = (c >> k) & 1 ? 3 : 1.4;
        if (k % 2 === 0) bars.push(`<rect x="${x.toFixed(1)}" y="0" width="${w}" height="${h}"/>`);
        x += w + .8;
      }
      x += 1.6;
    });
    return `<svg class="ck-barcode" viewBox="0 0 ${x.toFixed(1)} ${h}" preserveAspectRatio="none" fill="currentColor" aria-hidden="true">${bars.join("")}</svg>`;
  }

  /* calm notice shown above the form when ordering can't go through yet */
  function bannerHTML() {
    if (!waReady()) return `
      <div class="ck-banner" role="status">
        <span class="ck-banner-dot" aria-hidden="true"></span>
        <div class="ck-banner-body">
          <p class="ck-banner-title">Online ordering opens soon</p>
          <p>The store is setting up WhatsApp ordering. Your bag is saved on this device, so you can fill in your details now and place the order once it's switched on. Questions? <a href="contact.html">Contact us</a>.</p>
        </div>
      </div>`;
    const d = drop();
    if (!d.live) return `
      <div class="ck-banner" role="status">
        <span class="ck-banner-dot" aria-hidden="true"></span>
        <div class="ck-banner-body">
          <p class="ck-banner-title">Drop ${esc(dropNo)} isn't live yet</p>
          <p>Ordering unlocks at launch${d.launch ? ` — opens in <b class="mono ck-banner-cd" data-cd>…</b>` : ""}. Keep your bag ready.</p>
        </div>
      </div>`;
    return "";
  }

  /* =================================================================
     EMPTY STATE
     ================================================================= */
  function renderEmpty() {
    const picks = PRODUCTS.filter(p => p.stock > 0).slice(0, 8);
    root.innerHTML = `
      <section class="ck-empty">
        <p class="eyebrow">[ Checkout ]</p>
        <h1 class="ck-empty-title">Your bag<br><span class="outline-text">is empty</span></h1>
        <p class="ck-empty-text">Nothing to check out yet. Every Drop ${esc(dropNo)} design is made in a small run — once it's gone, it's gone.</p>
        <div class="ck-empty-cta">
          <a class="btn btn-lg" href="shop.html" data-magnetic>Shop Drop ${esc(dropNo)}</a>
          <a class="btn btn-ghost btn-lg" href="index.html">Back home</a>
        </div>
      </section>
      ${picks.length ? `<section class="ck-empty-picks">
        <div class="section-head"><h2 class="display-s">In the drop</h2><a class="link-arrow" href="shop.html">View all</a></div>
        <div class="grid-products" data-reveal="stagger">${picks.map(productCard).join("")}</div>
      </section>` : ""}`;
    if (typeof refreshReveal === "function") refreshReveal();
  }

  /* =================================================================
     CHECKOUT SHELL
     ================================================================= */
  function renderCheckout() {
    const saved = read(KEY_ADDR, null);
    const stepNames = ["Contact", "Payment", "Review"];
    root.innerHTML = `
      <div class="ck-head">
        <a class="ck-back-link" href="shop.html">${I.back}<span>Continue shopping</span></a>
        <div class="ck-head-row">
          <h1 class="ck-title">Checkout</h1>
          <p class="ck-secure mono">${I.lock} Order goes straight to our WhatsApp</p>
        </div>
      </div>
      <div id="ck-banner-slot"></div>

      <button type="button" class="ck-sum-toggle" aria-expanded="false" aria-controls="ck-summary">
        <span class="ck-sum-toggle-l">${I.tag} <span class="ck-sum-toggle-label">Show order ticket</span> ${I.chev}</span>
        <strong class="ck-sum-toggle-total mono"></strong>
      </button>

      <div class="ck-layout">
        <div class="ck-main">
          <ol class="ck-stepper" aria-label="Checkout steps">
            ${stepNames.map((n, i) => `<li class="ck-step-pill" data-step-pill="${i + 1}">
              <button type="button" data-goto="${i + 1}" disabled>
                <span class="ck-step-num"><span class="n">${pad2(i + 1)}</span><span class="t">${I.check}</span></span>
                <span class="ck-step-name">${n}</span>
              </button></li>`).join("")}
          </ol>

          <form class="ck-form" id="ck-form" novalidate autocomplete="on">
            <!-- STEP 1 -->
            <section class="ck-panel" data-panel="1" aria-labelledby="ck-h1">
              <h2 class="ck-panel-title" id="ck-h1"><span class="mono">01 /</span> Contact &amp; address</h2>
              ${saved && saved.name ? `
              <div class="ck-saved" id="ck-saved">
                <div class="ck-saved-body">${I.pin}<div><strong class="mono">Saved address</strong>
                  <span>${esc(saved.name)} · ${esc(fmtPhone(saved.phone))}<br>${esc(saved.addr)}, ${esc(saved.city)}, ${esc(saved.state)} – ${esc(saved.pin)}</span></div></div>
                <button type="button" class="btn btn-sm btn-ghost" id="ck-use-saved">Use saved address</button>
              </div>` : ""}

              <fieldset class="ck-group">
                <legend class="mono">// Contact</legend>
                <div class="ck-grid">
                  ${inputField("name", "Full name", { autocomplete: "name", req: true, span: 2, placeholder: "As on your ID" })}
                  <div class="ck-field" data-f="phone">
                    <label for="ck-phone">Mobile number <span class="req" aria-hidden="true">*</span></label>
                    <div class="ck-affix"><span class="ck-prefix" aria-hidden="true">+91</span>
                      <input id="ck-phone" name="tel" type="tel" inputmode="numeric" maxlength="10" autocomplete="tel-national" placeholder="10-digit mobile" required aria-describedby="ck-phone-err ck-phone-hint"></div>
                    <p class="ck-hint" id="ck-phone-hint">We confirm your order on this number's WhatsApp.</p>
                    <p class="ck-err" id="ck-phone-err" role="alert"></p>
                  </div>
                  ${inputField("email", "Email", { type: "email", autocomplete: "email", optional: true, placeholder: "you@example.com" })}
                </div>
              </fieldset>

              <fieldset class="ck-group">
                <legend class="mono">// Delivery address</legend>
                <div class="ck-grid">
                  ${inputField("addr", "House / flat, street, area", { autocomplete: "street-address", req: true, span: 2 })}
                  ${inputField("landmark", "Landmark", { optional: true, span: 2, placeholder: "Near…" })}
                  <div class="ck-field" data-f="pin">
                    <label for="ck-pin">Pincode <span class="req" aria-hidden="true">*</span></label>
                    <div class="ck-affix ck-affix-end"><input id="ck-pin" name="postal-code" inputmode="numeric" maxlength="6" autocomplete="postal-code" placeholder="6 digits" required aria-describedby="ck-pin-err ck-pin-hint"><span class="ck-spin" aria-hidden="true"></span></div>
                    <p class="ck-hint" id="ck-pin-hint" aria-live="polite">City &amp; state fill in automatically.</p>
                    <p class="ck-err" id="ck-pin-err" role="alert"></p>
                  </div>
                  ${inputField("city", "City / district", { autocomplete: "address-level2", req: true })}
                  <div class="ck-field ck-span-2" data-f="state">
                    <label for="ck-state">State / UT <span class="req" aria-hidden="true">*</span></label>
                    <div class="ck-select"><select id="ck-state" name="address-level1" autocomplete="address-level1" required aria-describedby="ck-state-err">
                      <option value="">Select state</option>
                      <optgroup label="States">${STATES.slice(0, 28).map(s => `<option>${s}</option>`).join("")}</optgroup>
                      <optgroup label="Union Territories">${STATES.slice(28).map(s => `<option>${s}</option>`).join("")}</optgroup>
                    </select>${I.chev}</div>
                    <p class="ck-err" id="ck-state-err" role="alert"></p>
                  </div>
                </div>
                <label class="ck-check"><input type="checkbox" id="ck-save" checked><span class="box">${I.check}</span><span>Save this address on this device for next time</span></label>
              </fieldset>

              <div class="ck-actions">
                <a class="ck-text-btn" href="shop.html">${I.back}<span>Back to shop</span></a>
                <button type="button" class="btn btn-lg" data-next><span>Continue to payment</span>${I.arrow}</button>
              </div>
            </section>

            <!-- STEP 2 -->
            <section class="ck-panel" data-panel="2" aria-labelledby="ck-h2" hidden>
              <h2 class="ck-panel-title" id="ck-h2"><span class="mono">02 /</span> Payment</h2>
              <div class="ck-pay" role="radiogroup" aria-label="Payment method">
                <label class="ck-pay-card">
                  <input type="radio" name="pay" value="upi" checked>
                  <span class="ck-radio" aria-hidden="true"></span>
                  <span class="ck-pay-icon">${I.upi}</span>
                  <span class="ck-pay-body">
                    <span class="ck-pay-title">UPI <span class="badge badge-accent">Fastest</span></span>
                    <span class="ck-pay-desc">GPay, PhonePe, Paytm, BHIM — any UPI app. Our UPI ID and a QR code appear right after you place the order.</span>
                  </span>
                  <span class="ck-pay-fee ok mono">No fee</span>
                </label>
                ${codOn ? `<label class="ck-pay-card">
                  <input type="radio" name="pay" value="cod">
                  <span class="ck-radio" aria-hidden="true"></span>
                  <span class="ck-pay-icon">${I.cash}</span>
                  <span class="ck-pay-body">
                    <span class="ck-pay-title">Cash on Delivery</span>
                    <span class="ck-pay-desc">Pay in cash when the parcel reaches your door.</span>
                  </span>
                  <span class="ck-pay-fee mono">${STORE.codFee ? "+" + rupee(STORE.codFee) : "Free"}</span>
                </label>` : `<p class="ck-note-muted">Cash on Delivery isn't available right now — UPI only.</p>`}
              </div>
              <div class="ck-field ck-note-field" data-f="note">
                <label for="ck-note">Order note <span class="opt">(optional)</span></label>
                <textarea id="ck-note" rows="3" maxlength="300" placeholder="Gift wrap, preferred delivery time, anything else we should know"></textarea>
              </div>
              <div class="ck-actions">
                <button type="button" class="ck-text-btn" data-prev>${I.back}<span>Back</span></button>
                <button type="button" class="btn btn-lg" data-next><span>Review order</span>${I.arrow}</button>
              </div>
            </section>

            <!-- STEP 3 -->
            <section class="ck-panel" data-panel="3" aria-labelledby="ck-h3" hidden>
              <h2 class="ck-panel-title" id="ck-h3"><span class="mono">03 /</span> Review &amp; place</h2>
              <div class="ck-review" id="ck-review"></div>
              <div class="ck-place">
                <button type="button" class="btn btn-wa btn-lg btn-block" id="ck-place"></button>
                <p class="ck-place-lock" id="ck-place-lock" hidden></p>
                <p class="ck-place-note">This opens WhatsApp with your order filled in — just tap <b>Send</b>. We confirm every order personally. By placing an order you agree to our <a href="policies.html#terms">terms</a> and <a href="policies.html#exchange">exchange policy</a>.</p>
              </div>
              <div class="ck-actions ck-actions-start">
                <button type="button" class="ck-text-btn" data-prev>${I.back}<span>Back to payment</span></button>
              </div>
            </section>
          </form>
        </div>

        <aside class="ck-summary" id="ck-summary" aria-label="Order summary">
          <div class="ck-summary-inner"><div class="ck-ticket" id="ck-summary-card"></div></div>
        </aside>
      </div>`;

    lockKey = null;
    syncLock();
    bindCheckout();
    renderSummary();
    showStep(1, true);
    // re-check once a second while locked, so the page unlocks by itself when the drop goes live
    clearInterval(lockTimer);
    lockTimer = setInterval(() => { if (state.placed || !document.getElementById("ck-place")) clearInterval(lockTimer); else syncLock(); }, 1000);
  }

  /* banner + place button reflect whether ordering is open right now */
  let lockKey = null, lockTimer = 0;
  function syncLock() {
    const wa = waReady(), live = drop().live, key = wa + "|" + live;
    if (key === lockKey) return;
    lockKey = key;
    const locked = !(wa && live);
    const slot = $("#ck-banner-slot"), btn = $("#ck-place"), note = $("#ck-place-lock");
    if (slot) {
      slot.innerHTML = bannerHTML();
      const cd = $("[data-cd]", slot), d = drop();
      if (cd && d.launch) {
        if (typeof countdown === "function") countdown(cd, d.launch);
        else cd.textContent = new Date(d.launch).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
      }
    }
    if (btn) {
      btn.classList.toggle("is-locked", locked);
      if (locked) { btn.setAttribute("aria-disabled", "true"); btn.setAttribute("aria-describedby", "ck-place-lock"); }
      else { btn.removeAttribute("aria-disabled"); btn.removeAttribute("aria-describedby"); }
      btn.innerHTML = `${locked ? I.lock : I.wa}<span>${locked ? "Ordering opens soon" : `Place order<span class="ck-hide-xs"> on WhatsApp</span>`} · <b class="ck-place-total mono">${rupee(totals().total)}</b></span>`;
    }
    if (note) {
      note.hidden = !locked;
      note.textContent = !wa ? "The store is still setting up WhatsApp ordering, so orders can't be sent just yet."
        : !live ? `Drop ${dropNo} hasn't launched yet — ordering unlocks at launch.` : "";
    }
  }

  function inputField(id, label, o = {}) {
    return `<div class="ck-field${o.span === 2 ? " ck-span-2" : ""}" data-f="${id}">
      <label for="ck-${id}">${label} ${o.req ? `<span class="req" aria-hidden="true">*</span>` : ""}${o.optional ? `<span class="opt">(optional)</span>` : ""}</label>
      <input id="ck-${id}" type="${o.type || "text"}" ${o.autocomplete ? `autocomplete="${o.autocomplete}"` : ""} ${o.placeholder ? `placeholder="${o.placeholder}"` : ""} ${o.req ? "required" : ""} aria-describedby="ck-${id}-err">
      <p class="ck-err" id="ck-${id}-err" role="alert"></p>
    </div>`;
  }

  /* ---------------- validation ---------------- */
  const RULES = {
    name: v => v.length < 2 ? "Please enter your full name." : /\d/.test(v) ? "Name shouldn't contain numbers." : "",
    phone: v => !v ? "Please enter your mobile number." : !/^[6-9]\d{9}$/.test(v) ? "Enter a valid 10-digit Indian mobile number (starts with 6–9)." : "",
    email: v => v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "That email doesn't look right." : "",
    addr: v => v.length < 8 ? "Please enter your full address — house no., street and area." : "",
    pin: v => !/^[1-9]\d{5}$/.test(v) ? "Enter a valid 6-digit pincode." : "",
    city: v => v.length < 2 ? "Please enter your city." : "",
    state: v => !v ? "Please select your state." : ""
  };
  const STEP_FIELDS = { 1: ["name", "phone", "email", "addr", "pin", "city", "state"], 2: [], 3: [] };

  function setError(id, msg) {
    const f = field(id); if (!f) return;
    const wrap = f.closest(".ck-field"), err = document.getElementById(`ck-${id}-err`);
    wrap.classList.toggle("invalid", !!msg);
    wrap.classList.toggle("valid", !msg && !!f.value.trim());
    f.setAttribute("aria-invalid", msg ? "true" : "false");
    if (err) err.textContent = msg || "";
  }
  function checkField(id) { const msg = RULES[id] ? RULES[id](val(id)) : ""; setError(id, msg); return !msg; }
  function validateStep(n) {
    const bad = STEP_FIELDS[n].filter(id => !checkField(id));
    if (bad.length) {
      const f = field(bad[0]);
      f.focus({ preventScroll: true });
      f.closest(".ck-field").scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "center" });
    }
    return !bad.length;
  }

  /* ---------------- step navigation ---------------- */
  let maxStep = 1;
  function showStep(n, instant) {
    const prev = state.step;
    state.step = n; maxStep = Math.max(maxStep, n);
    $$(".ck-step-pill").forEach(li => {
      const s = +li.dataset.stepPill, b = li.querySelector("button");
      li.classList.toggle("active", s === n);
      li.classList.toggle("done", s < n || (s < maxStep && s !== n));
      b.disabled = s > maxStep || s === n;
      s === n ? b.setAttribute("aria-current", "step") : b.removeAttribute("aria-current");
    });
    $(".ck-stepper").style.setProperty("--progress", ((n - 1) / 2).toString());
    if (n === 3) renderReview();
    $$(".ck-panel").forEach(p => {
      const s = +p.dataset.panel;
      if (s === n) {
        p.hidden = false;
        p.classList.remove("enter-fwd", "enter-back");
        if (!instant && !reduced()) { void p.offsetWidth; p.classList.add(n >= prev ? "enter-fwd" : "enter-back"); }
      } else p.hidden = true;
    });
    if (!instant) {
      const r = $(".ck-stepper").getBoundingClientRect(), top = r.top + scrollY - 110;
      if (r.top < 90 || r.top > innerHeight * .6) window.scrollTo({ top, behavior: reduced() ? "auto" : "smooth" });
      const h = $(`#ck-h${n}`); h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true });
    }
  }

  /* ---------------- pincode lookup ---------------- */
  let pinReq = 0;
  async function lookupPin(pin) {
    const id = ++pinReq, hint = $("#ck-pin-hint"), wrap = field("pin").closest(".ck-field");
    wrap.classList.add("loading"); hint.className = "ck-hint"; hint.textContent = "Looking up your pincode…";
    const ctrl = "AbortController" in window ? new AbortController() : null;
    const timer = setTimeout(() => ctrl && ctrl.abort(), 6000);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, ctrl ? { signal: ctrl.signal } : {});
      const data = await res.json();
      if (id !== pinReq) return;
      const po = data && data[0] && data[0].Status === "Success" && data[0].PostOffice && data[0].PostOffice[0];
      if (!po) { hint.className = "ck-hint warn"; hint.textContent = "We couldn't find this pincode — please check it, or enter city & state yourself."; return; }
      const city = po.District || po.Block || po.Name;
      const st = STATES.find(s => normState(s) === normState(po.State)) ||
        STATES.find(s => normState(po.State).includes(normState(s)) || normState(s).includes(normState(po.State))) || "";
      const cityEl = field("city"), stEl = field("state");
      if (!cityEl.value.trim() || cityEl.value.trim() === state.pinAuto.city) { cityEl.value = city; flash(cityEl); }
      if (st && (!stEl.value || stEl.value === state.pinAuto.state)) { stEl.value = st; flash(stEl); }
      state.pinAuto = { city, state: st };
      ["city", "state"].forEach(f => field(f).closest(".ck-field").classList.contains("invalid") && checkField(f));
      hint.className = "ck-hint ok"; hint.innerHTML = `${I.check} Detected: <b>${esc(city)}${st ? ", " + esc(st) : ""}</b>`;
    } catch {
      if (id !== pinReq) return;
      hint.className = "ck-hint warn"; hint.textContent = "Couldn't auto-detect right now — please enter city & state.";
    } finally {
      clearTimeout(timer);
      if (id === pinReq) wrap.classList.remove("loading");
    }
  }
  function flash(el) { if (reduced()) return; el.classList.remove("ck-flash"); void el.offsetWidth; el.classList.add("ck-flash"); }

  /* ---------------- bindings ---------------- */
  function bindCheckout() {
    const form = $("#ck-form");
    form.addEventListener("submit", e => e.preventDefault());

    // validation on blur (once touched) and live re-check after an error
    Object.keys(RULES).forEach(id => {
      const f = field(id); if (!f) return;
      f.addEventListener("blur", () => { if (f.value.trim() || f.dataset.touched) { f.dataset.touched = 1; checkField(id); } });
      f.addEventListener(f.tagName === "SELECT" ? "change" : "input", () => {
        if (f.closest(".ck-field").classList.contains("invalid")) checkField(id);
      });
    });
    // digits only
    ["phone", "pin"].forEach(id => field(id).addEventListener("input", e => {
      let v = e.target.value.replace(/\D/g, "");
      if (id === "phone" && v.length > 10 && v.startsWith("91")) v = v.slice(2);
      if (id === "phone" && v.length > 10 && v.startsWith("0")) v = v.slice(1);
      e.target.value = v.slice(0, id === "phone" ? 10 : 6);
    }));
    field("pin").addEventListener("input", e => {
      const v = e.target.value;
      if (/^[1-9]\d{5}$/.test(v)) { if (v !== state.lastPin) { state.lastPin = v; lookupPin(v); } }
      else if (v.length < 6) { state.lastPin = ""; pinReq++; field("pin").closest(".ck-field").classList.remove("loading"); const h = $("#ck-pin-hint"); h.className = "ck-hint"; h.textContent = "City & state fill in automatically."; }
    });

    // saved address
    const useSaved = $("#ck-use-saved");
    if (useSaved) useSaved.onclick = () => {
      const s = read(KEY_ADDR, {});
      ["name", "phone", "email", "addr", "landmark", "pin", "city", "state"].forEach(k => { if (field(k) && s[k] != null) field(k).value = s[k]; });
      state.lastPin = s.pin; state.pinAuto = { city: s.city, state: s.state };
      ["name", "phone", "email", "addr", "pin", "city", "state"].forEach(k => field(k).value && checkField(k));
      $("#ck-saved").classList.add("used");
      useSaved.textContent = "Address filled in";
      useSaved.disabled = true;
      say("Saved address filled in");
    };

    $$("[data-next]").forEach(b => b.onclick = () => { if (validateStep(state.step)) showStep(state.step + 1); });
    $$("[data-prev]").forEach(b => b.onclick = () => showStep(state.step - 1));
    $$("[data-goto]").forEach(b => b.onclick = () => {
      const to = +b.dataset.goto;
      if (to < state.step || validateStep(state.step)) showStep(to);
    });

    $$("input[name=pay]").forEach(r => r.addEventListener("change", () => { state.pay = r.value; renderSummary(); }));

    // mobile summary toggle
    const tog = $(".ck-sum-toggle");
    tog.onclick = () => {
      const open = tog.getAttribute("aria-expanded") !== "true";
      tog.setAttribute("aria-expanded", String(open));
      $(".ck-sum-toggle-label").textContent = open ? "Hide order ticket" : "Show order ticket";
      $("#ck-summary").classList.toggle("open", open);
    };

    $("#ck-place").onclick = placeOrder;

    // summary (delegated)
    const card = $("#ck-summary-card");
    card.addEventListener("click", e => {
      const q = e.target.closest("[data-q]"), rm = e.target.closest("[data-rm]");
      if (q) {
        const i = +q.dataset.idx, line = Cart.get()[i]; if (!line) return;
        const p = getProduct(line.id), max = Math.min(10, p && p.stock > 0 ? p.stock : 10);
        const next = Math.max(1, Math.min(max, line.qty + +q.dataset.q));
        if (next !== line.qty) {
          Cart.setQty(i, next); afterCartChange();
          const again = $(`#ck-summary-card [data-q="${q.dataset.q}"][data-idx="${i}"]`);
          if (again && !again.disabled) again.focus(); else { const s = $(`#ck-summary-card [data-idx="${i}"]:not([disabled])`); s && s.focus(); }
        }
        else if (+q.dataset.q > 0) say(`Max ${max} per order for this item`);
      }
      if (rm) { removeLine(+rm.dataset.rm); afterCartChange(); }
      if (e.target.closest("#ck-coupon-apply")) applyCoupon();
      if (e.target.closest("[data-coupon-remove]")) { state.coupon = ""; sessionStorage.removeItem(KEY_COUPON); renderSummary(); setCouponMsg("Coupon removed.", ""); }
      const sug = e.target.closest("[data-coupon-suggest]");
      if (sug) { $("#ck-coupon").value = sug.dataset.couponSuggest; applyCoupon(); }
    });
    card.addEventListener("keydown", e => { if (e.target.id === "ck-coupon" && e.key === "Enter") { e.preventDefault(); applyCoupon(); } });
  }

  function applyCoupon() {
    const inp = $("#ck-coupon"), code = inp.value.trim().toUpperCase();
    if (!code) { setCouponMsg("Enter a coupon code.", "err"); inp.focus(); return; }
    if (!STORE.coupons[code]) { setCouponMsg(`"${code}" isn't a valid code.`, "err"); inp.select(); return; }
    state.coupon = code; sessionStorage.setItem(KEY_COUPON, code);
    renderSummary();
    setCouponMsg(`${code} applied — you save ${rupee(totals().disc)}.`, "ok");
  }
  function setCouponMsg(msg, cls) { const m = $("#ck-coupon-msg"); if (m) { m.textContent = msg; m.className = "ck-coupon-msg " + (cls || ""); } }

  function afterCartChange() {
    if (state.placed) return;
    if (!Cart.lines().length) { renderEmpty(); return; }
    renderSummary();
    if (state.step === 3) renderReview();
  }

  /* ---------------- summary (the order ticket) ---------------- */
  function renderSummary() {
    const card = $("#ck-summary-card"); if (!card) return;
    const lines = Cart.lines(), t = totals(), raw = Cart.get();
    const count = lines.reduce((s, l) => s + l.qty, 0);
    const pct = Math.min(100, (t.after / STORE.freeShippingAbove) * 100);
    const keepMsg = $("#ck-coupon-msg") ? [$("#ck-coupon-msg").textContent, $("#ck-coupon-msg").className] : null;
    const firstCode = Object.keys(STORE.coupons)[0];
    const mrpSave = lines.reduce((s, l) => s + Math.max(0, l.p.mrp - l.p.price) * l.qty, 0);
    card.innerHTML = `
      <header class="ck-ticket-head">
        <div class="ck-ticket-brand"><span>${esc(STORE.name)}</span><span class="mono">Drop ${esc(dropNo)}</span></div>
        <div class="ck-ticket-meta mono"><span>Order ticket</span><span>${pad2(count)} item${count === 1 ? "" : "s"}</span></div>
      </header>
      <h2 class="sr-only">Order summary</h2>
      <ul class="ck-lines">${lines.map((l, n) => {
        const idx = raw.findIndex(r => r.id === l.id && r.size === l.size);
        return `<li class="ck-line">
          <a class="ck-thumb" href="product.html?id=${encodeURIComponent(l.id)}" tabindex="-1" aria-hidden="true">${productImage(l.p)}</a>
          <div class="ck-line-info">
            <span class="ck-line-no mono">${pad2(n + 1)}</span>
            <a class="ck-line-name" href="product.html?id=${encodeURIComponent(l.id)}">${esc(l.p.name)}</a>
            <span class="ck-line-meta mono">${esc(l.p.colorName || "")}${l.p.colorName ? " · " : ""}Size ${esc(l.size)} · ${rupee(l.p.price)}</span>
            <div class="ck-line-ctrl">
              <div class="ck-qty" role="group" aria-label="Quantity for ${esc(l.p.name)}">
                <button type="button" data-q="-1" data-idx="${idx}" aria-label="Decrease quantity" ${l.qty <= 1 ? "disabled" : ""}>−</button>
                <span class="mono" aria-live="polite">${pad2(l.qty)}</span>
                <button type="button" data-q="1" data-idx="${idx}" aria-label="Increase quantity">+</button>
              </div>
              <button type="button" class="ck-rm mono" data-rm="${idx}">Remove</button>
            </div>
          </div>
          <div class="ck-line-price mono">${rupee(l.p.price * l.qty)}${l.p.mrp > l.p.price ? `<s>${rupee(l.p.mrp * l.qty)}</s>` : ""}</div>
        </li>`;
      }).join("")}</ul>

      <div class="ck-tear" aria-hidden="true"></div>

      <div class="ck-coupon">
        ${state.coupon ? `<div class="ck-coupon-applied">${I.tag}<span class="mono"><b>${esc(state.coupon)}</b> · ${t.pct}% off</span><button type="button" data-coupon-remove aria-label="Remove coupon ${esc(state.coupon)}">Remove</button></div>`
        : `<div class="ck-coupon-row"><label class="sr-only" for="ck-coupon">Coupon code</label>
            <input id="ck-coupon" placeholder="Coupon code" autocomplete="off" autocapitalize="characters" spellcheck="false">
            <button type="button" class="btn btn-sm btn-ghost" id="ck-coupon-apply">Apply</button></div>
            ${firstCode ? `<button type="button" class="ck-coupon-hint" data-coupon-suggest="${esc(firstCode)}">Try <b class="mono">${esc(firstCode)}</b> — tap for ${STORE.coupons[firstCode]}% off</button>` : ""}`}
        <p class="ck-coupon-msg" id="ck-coupon-msg" aria-live="polite"></p>
      </div>

      <div class="ck-ship ${t.toFree ? "" : "free"}">
        <p>${I.truck} <span>${t.toFree ? `Add <b class="mono">${rupee(t.toFree)}</b> more for free shipping` : `Free shipping unlocked`}</span></p>
        <div class="ck-ship-bar"><span style="transform:scaleX(${pct / 100})"></span></div>
      </div>

      <dl class="ck-totals">
        <div><dt>Subtotal</dt><dd>${rupee(t.sub)}</dd></div>
        ${t.disc ? `<div class="disc"><dt>Discount (${esc(state.coupon)})</dt><dd>−${rupee(t.disc)}</dd></div>` : ""}
        <div><dt>Shipping</dt><dd>${t.ship ? rupee(t.ship) : `<span class="free">Free</span>`}</dd></div>
        ${state.pay === "cod" && codOn ? `<div><dt>COD fee</dt><dd>${t.cod ? rupee(t.cod) : `<span class="free">Free</span>`}</dd></div>` : ""}
      </dl>
      <div class="ck-grand"><span class="mono">Total <small>incl. taxes</small></span><b>${rupee(t.total)}</b></div>
      ${mrpSave + t.disc > 0 ? `<p class="ck-saving mono">You save ${rupee(mrpSave + t.disc)}</p>` : ""}
      <footer class="ck-ticket-foot">
        ${barcode("DROP" + dropNo + "-" + count + "-" + t.total, 34)}
        <ul class="ck-assure mono"><li>${I.check} 7-day size exchange</li><li>${I.check} Confirmed on WhatsApp</li></ul>
      </footer>`;
    if (keepMsg && keepMsg[0]) { const m = $("#ck-coupon-msg"); m.textContent = keepMsg[0]; m.className = keepMsg[1]; }
    const tot = $(".ck-sum-toggle-total"); if (tot) tot.textContent = rupee(t.total);
    $$(".ck-place-total").forEach(e => e.textContent = rupee(t.total));
  }

  /* ---------------- review ---------------- */
  function addressBlock() {
    return `${esc(val("name"))}<br>${esc(val("addr"))}${val("landmark") ? `<br>Landmark: ${esc(val("landmark"))}` : ""}<br>${esc(val("city"))}, ${esc(val("state"))} – ${esc(val("pin"))}`;
  }
  function renderReview() {
    const t = totals(), lines = Cart.lines();
    $("#ck-review").innerHTML = `
      <div class="ck-review-grid">
        <div class="ck-review-card"><div class="ck-review-head"><h3 class="mono">Deliver to</h3><button type="button" class="ck-text-btn" data-edit="1">Edit</button></div>
          <p>${addressBlock()}</p>
          <p class="ck-review-meta mono">${esc(fmtPhone(val("phone")))}${val("email") ? ` · ${esc(val("email"))}` : ""}</p></div>
        <div class="ck-review-card"><div class="ck-review-head"><h3 class="mono">Payment</h3><button type="button" class="ck-text-btn" data-edit="2">Edit</button></div>
          <p><b>${state.pay === "cod" ? "Cash on Delivery" : "UPI"}</b></p>
          <p class="ck-review-meta">${state.pay === "cod" ? `Pay ${rupee(t.total)} in cash at delivery${t.cod ? ` (incl. ${rupee(t.cod)} COD fee)` : ""}.` : `Pay ${rupee(t.total)} to our UPI ID after placing the order.`}</p>
          ${val("note") ? `<p class="ck-review-meta"><b>Note:</b> ${esc(val("note"))}</p>` : ""}</div>
      </div>
      <div class="ck-review-card ck-review-items"><div class="ck-review-head"><h3 class="mono">Items (${pad2(lines.reduce((s, l) => s + l.qty, 0))})</h3></div>
        <ul>${lines.map(l => `<li><span class="ck-ri-thumb">${productImage(l.p)}</span><span class="ck-ri-name">${esc(l.p.name)}<small class="mono">Size ${esc(l.size)} · Qty ${pad2(l.qty)}</small></span><b class="mono">${rupee(l.p.price * l.qty)}</b></li>`).join("")}</ul>
        <div class="ck-review-total"><span class="mono">Total to pay</span><b>${rupee(t.total)}</b></div>
      </div>`;
    $$("#ck-review [data-edit]").forEach(b => b.onclick = () => showStep(+b.dataset.edit));
  }

  /* =================================================================
     PLACE ORDER
     ================================================================= */
  function newOrderId() {
    const tail = String(Date.now()).slice(-5) + String(Math.floor(Math.random() * 100)).padStart(2, "0");
    return "BK" + tail;
  }

  function composeMessage(o) {
    const L = [];
    L.push(`*New order — ${STORE.name}*`);
    L.push(`Order ID: *${o.id}*`);
    L.push("");
    L.push("*Items*");
    o.items.forEach((it, i) => {
      L.push(`${i + 1}. ${it.name}`);
      L.push(`    Size ${it.size} · Qty ${it.qty} · ${rupee(it.price * it.qty)}`);
    });
    L.push("");
    L.push(`Subtotal: ${rupee(o.t.sub)}`);
    if (o.t.disc) L.push(`Discount (${o.coupon}, ${o.t.pct}% off): −${rupee(o.t.disc)}`);
    L.push(`Shipping: ${o.t.ship ? rupee(o.t.ship) : "Free"}`);
    if (o.pay === "cod") L.push(`COD fee: ${o.t.cod ? rupee(o.t.cod) : "Free"}`);
    L.push(`*Total: ${rupee(o.t.total)}*`);
    L.push("");
    L.push(`*Payment:* ${o.pay === "cod" ? "Cash on Delivery" : `UPI to ${STORE.upi} (I'll send the screenshot)`}`);
    L.push("");
    L.push("*Deliver to*");
    L.push(o.c.name);
    L.push(o.c.addr);
    if (o.c.landmark) L.push(`Landmark: ${o.c.landmark}`);
    L.push(`${o.c.city}, ${o.c.state} – ${o.c.pin}`);
    L.push(`Phone: ${fmtPhone(o.c.phone)}`);
    if (o.c.email) L.push(`Email: ${o.c.email}`);
    if (o.note) { L.push(""); L.push(`*Note:* ${o.note}`); }
    L.push("");
    L.push("Please confirm my order. Thank you!");
    return L.join("\n");
  }

  function placeOrder() {
    // don't send orders anywhere until the owner has set a real WhatsApp number in products.js
    if (!waReady()) {
      say("Online ordering opens soon. Please check back shortly.", { type: "error" });
      return;
    }
    // …and never before the drop is live
    if (!drop().live) {
      say(`Drop ${dropNo} isn't live yet — ordering unlocks at launch.`, { type: "error" });
      return;
    }
    // re-validate everything in case something changed
    if (!STEP_FIELDS[1].every(checkField)) { showStep(1); validateStep(1); return; }
    const lines = Cart.lines();
    if (!lines.length) { renderEmpty(); return; }

    const c = { name: val("name"), phone: val("phone"), email: val("email"), addr: val("addr"), landmark: val("landmark"), pin: val("pin"), city: val("city"), state: val("state") };
    const t = totals();
    const order = {
      id: newOrderId(), date: new Date().toISOString(), pay: state.pay, coupon: state.coupon, note: val("note"),
      items: lines.map(l => ({ id: l.id, name: l.p.name, size: l.size, qty: l.qty, price: l.p.price })),
      t, c
    };
    const msg = composeMessage(order);
    const url = orderLink(msg);

    window.open(url, "_blank", "noopener");

    if ($("#ck-save").checked) write(KEY_ADDR, c); else { try { localStorage.removeItem(KEY_ADDR); } catch { /* ignore */ } }
    write(KEY_LAST, { id: order.id, date: order.date, pay: order.pay, items: order.items, total: t.total, t, coupon: order.coupon, city: c.city, state: c.state, pin: c.pin, name: c.name });
    state.placed = true;
    sessionStorage.removeItem(KEY_COUPON);
    Cart.clear();
    renderSuccess(order, url);
  }

  /* =================================================================
     SUCCESS — "ORDER LOCKED IN"
     ================================================================= */
  function renderSuccess(o, url) {
    const first = esc(o.c.name.split(/\s+/)[0]);
    const amount = o.t.total;
    const qty = o.items.reduce((s, i) => s + i.qty, 0);
    const upiLink = `upi://pay?pa=${encodeURIComponent(STORE.upi)}&pn=${encodeURIComponent(STORE.name)}&am=${amount}&cu=INR&tn=${encodeURIComponent("Order " + o.id)}`;
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=${encodeURIComponent(upiLink)}`;
    const shotLink = orderLink(`Hi ${STORE.name}, here's the payment screenshot for order ${o.id} (${rupee(amount)}).`);
    const when = new Date(o.date).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

    root.innerHTML = `
      <section class="ck-success" aria-labelledby="ck-success-title">
        <div class="ck-success-hero">
          <canvas class="ck-confetti" aria-hidden="true"></canvas>
          <svg class="ck-tick" viewBox="0 0 80 80" aria-hidden="true"><rect class="c" x="4" y="4" width="72" height="72" rx="4"/><path class="k" d="m22 41 12 12 24-26"/></svg>
          <p class="eyebrow">[ Order sent · ${esc(o.id)} ]</p>
          <h1 class="ck-success-title" id="ck-success-title" tabindex="-1">Order<br><span>locked in</span></h1>
          <p class="ck-success-lead">Nice one, ${first}. WhatsApp just opened with your order — tap <b>Send</b> there so we can confirm it.</p>
          <a class="btn btn-wa ck-wa-retry" href="${url}" target="_blank" rel="noopener">${I.wa}<span>WhatsApp didn't open? Tap here</span></a>
        </div>

        <div class="ck-success-grid">
          <article class="ck-stub" aria-label="Order ticket">
            <header class="ck-stub-head">
              <span class="ck-stub-brand">${esc(STORE.name)}</span>
              <span class="mono">Drop ${esc(dropNo)} · ${esc(when)}</span>
            </header>
            <div class="ck-stub-id">
              <span class="mono">Order ID</span>
              <b class="mono">${esc(o.id)}</b>
              <button type="button" class="ck-copy" data-copy="${esc(o.id)}" aria-label="Copy order ID">${I.copy}<span>Copy</span></button>
            </div>
            ${barcode(o.id, 56)}
            <ul class="ck-stub-lines">${o.items.map(i => `<li><span>${esc(i.name)} <small>${esc(i.size)} × ${i.qty}</small></span><b>${rupee(i.price * i.qty)}</b></li>`).join("")}</ul>
            <dl class="ck-stub-totals">
              <div><dt>Subtotal</dt><dd>${rupee(o.t.sub)}</dd></div>
              ${o.t.disc ? `<div><dt>Discount (${esc(o.coupon)})</dt><dd>−${rupee(o.t.disc)}</dd></div>` : ""}
              <div><dt>Shipping</dt><dd>${o.t.ship ? rupee(o.t.ship) : "Free"}</dd></div>
              ${o.pay === "cod" ? `<div><dt>COD fee</dt><dd>${o.t.cod ? rupee(o.t.cod) : "Free"}</dd></div>` : ""}
            </dl>
            <div class="ck-stub-total"><span>Total · ${pad2(qty)} item${qty === 1 ? "" : "s"}</span><b>${rupee(amount)}</b></div>
            <p class="ck-stub-foot mono">${o.pay === "cod" ? "Cash on Delivery" : "UPI"} · Deliver to ${esc(o.c.city)}</p>
          </article>

          <div class="ck-success-side">
          ${o.pay === "upi" ? `
          <div class="ck-upi">
            <div class="ck-upi-top">
              <div>
                <p class="eyebrow">Pay by UPI</p>
                <p class="ck-upi-amt">${rupee(amount)}</p>
                <div class="ck-upi-id"><span class="mono">UPI ID</span><code>${esc(STORE.upi)}</code>
                  <button type="button" class="ck-copy" data-copy="${esc(STORE.upi)}" aria-label="Copy UPI ID">${I.copy}<span>Copy</span></button></div>
              </div>
              <figure class="ck-qr">
                <img src="${qr}" width="220" height="220" alt="UPI QR code to pay ${rupee(amount)} to ${esc(STORE.upi)}" onerror="this.closest('figure').hidden=true">
                <figcaption class="mono">Scan with any UPI app</figcaption>
              </figure>
            </div>
            <a class="btn btn-lg btn-block ck-upi-app" href="${upiLink}">Pay ${rupee(amount)} with UPI app</a>
            <ol class="ck-upi-steps">
              <li>Pay <b>${rupee(amount)}</b> to <b>${esc(STORE.upi)}</b> — add <b>${esc(o.id)}</b> in the note.</li>
              <li>Send the payment screenshot on WhatsApp.</li>
            </ol>
            <a class="btn btn-ghost btn-block" href="${shotLink}" target="_blank" rel="noopener">${I.wa}<span>Send payment screenshot</span></a>
          </div>` : `
          <div class="ck-upi ck-cod">
            <p class="eyebrow">Cash on Delivery</p>
            <p class="ck-upi-amt">${rupee(amount)}</p>
            <p>Keep the exact amount ready when your parcel arrives${o.t.cod ? ` (includes ${rupee(o.t.cod)} COD fee)` : ""}. Prefer to pay now? Pay by UPI to <b>${esc(STORE.upi)}</b> and share the screenshot with us.</p>
          </div>`}

          <div class="ck-next">
            <h2 class="ck-next-title mono">What happens next</h2>
            <ol class="ck-timeline">
              <li class="now"><span class="dot"></span><div><b>Confirm on WhatsApp</b><p>Send the prefilled message. We reply to confirm your order and sizes.</p></div></li>
              <li><span class="dot"></span><div><b>Packed in 1–2 days</b><p>Checked, folded and packed — we share the tracking link on WhatsApp.</p></div></li>
              <li><span class="dot"></span><div><b>Delivered in 3–7 days</b><p>Depending on your pincode. Wrong size? Exchange within 7 days, subject to stock.</p></div></li>
            </ol>
            <div class="ck-success-cta">
              <a class="btn btn-lg" href="shop.html">Back to the drop</a>
              <a class="ck-text-btn" href="contact.html?order=${encodeURIComponent(o.id)}#track"><span>Track this order</span>${I.arrow}</a>
            </div>
          </div>
          </div>
        </div>
      </section>`;

    $$(".ck-copy", root).forEach(b => b.onclick = () => {
      copyText(b.dataset.copy);
      const s = b.querySelector("span"); s.textContent = "Copied"; b.classList.add("copied");
      setTimeout(() => { s.textContent = "Copy"; b.classList.remove("copied"); }, 1800);
    });
    window.scrollTo({ top: 0 });
    $("#ck-success-title").focus({ preventScroll: true });
    if (!reduced()) confetti($(".ck-confetti"));
  }

  function confetti(canvas) {
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d"), dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.offsetWidth, h = canvas.offsetHeight;
    canvas.width = w * dpr; canvas.height = h * dpr; ctx.scale(dpr, dpr);
    const colors = ["#c6ff00", "#c6ff00", "#f2f1ec", "#ff3d2e", "#c6ff00", "#f2f1ec"];
    const cx = w / 2, cy = Math.min(120, h * 0.3);
    const parts = Array.from({ length: 110 }, () => {
      const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 7;
      return { x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3.5, r: 3 + Math.random() * 4, rot: Math.random() * 6, vr: (Math.random() - .5) * .3, c: colors[(Math.random() * colors.length) | 0], s: Math.random() > .35 };
    });
    const start = performance.now(), dur = 1700;
    (function frame(now) {
      const k = (now - start) / dur;
      ctx.clearRect(0, 0, w, h);
      if (k >= 1) return;
      parts.forEach(p => {
        p.vy += .18; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save(); ctx.globalAlpha = 1 - Math.max(0, (k - .6) / .4);
        ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
        p.s ? ctx.fillRect(-p.r, -p.r / 2.4, p.r * 2, p.r / 1.2) : ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r);
        ctx.restore();
      });
      requestAnimationFrame(frame);
    })(start);
  }

  /* =================================================================
     INIT
     ================================================================= */
  document.addEventListener("cart:change", afterCartChange);
  if (!Cart.lines().length) renderEmpty(); else renderCheckout();
})();
