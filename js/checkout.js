/* BHAKSHI — checkout (Information → Payment → order sent to WhatsApp, pay by UPI or COD).
   No backend: the order is composed as a WhatsApp message to STORE.whatsapp.
   v3 look: quiet, white, Shopify-familiar — form on the left, order summary on --surface on the right. */
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

  const state = {
    step: 1,
    pay: "upi",
    coupon: (() => { const c = sessionStorage.getItem(KEY_COUPON); return c && STORE.coupons[c] ? c : ""; })(),
    placed: false,
    pinAuto: { city: "", state: "" }
  };

  /* gift flag + note written in the bag drawer (Cart.note, shell API) — tolerant of string or object */
  function cartNote() {
    let n = null;
    try { n = Cart.note && Cart.note(); } catch { n = null; }
    if (!n) return { gift: false, text: "" };
    if (typeof n === "string") return { gift: false, text: n.trim() };
    return { gift: !!(n.gift ?? n.isGift), text: String(n.note ?? n.text ?? n.message ?? "").trim() };
  }

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

  /* ---------------- icons (thin, 1.5px) ---------------- */
  const svg = (d, s = 18, w = 1.5) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${w}" aria-hidden="true">${d}</svg>`;
  const I = {
    wa: `<svg viewBox="0 0 32 32" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.6a10.6 10.6 0 0 1-5.4-1.5l-.4-.2-3.9 1 1-3.8-.2-.4A10.6 10.6 0 1 1 16 26.6zm5.8-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.7 8.7 0 0 1-4.3-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.7 3.7 0 0 0-1.1 2.7 6.4 6.4 0 0 0 1.3 3.4 14.7 14.7 0 0 0 5.6 5c2.1.9 2.9 1 4 .8a3.4 3.4 0 0 0 2.2-1.6 2.8 2.8 0 0 0 .2-1.6c-.1-.1-.3-.2-.6-.4z"/></svg>`,
    check: svg(`<path d="m5 12.5 4.5 4.5L19 7.5"/>`, 14, 2),
    bigCheck: svg(`<path d="m6.5 12.5 3.6 3.6 7.4-8"/>`, 28, 1.4),
    copy: svg(`<rect x="9" y="9" width="11" height="11"/><path d="M5 15V4h11"/>`, 15),
    lock: svg(`<rect x="5" y="11" width="14" height="9"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>`, 15),
    chev: svg(`<path d="m6 9 6 6 6-6"/>`, 14),
    chevR: svg(`<path d="m9 6 6 6-6 6"/>`, 12),
    pin: svg(`<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>`, 16),
    bag: svg(`<path d="M4.5 8h15l-1 12.5h-13z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>`, 18),
    gift: svg(`<rect x="3.5" y="9" width="17" height="11"/><path d="M2.5 9h19M12 9v11M12 9S10.5 4 8 4.5 7.5 9 12 9zm0 0s1.5-5 4-4.5S16.5 9 12 9z"/>`, 16),
    note: svg(`<path d="M5 4h14v16H5z"/><path d="M8.5 9h7M8.5 13h7M8.5 17h4"/>`, 16),
    info: svg(`<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5v.5"/>`, 18),
    back: svg(`<path d="M15 6l-6 6 6 6"/>`, 14)
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
  const thumb = (p, qty) => `<span class="ck-thumb">${productImage(p)}${qty ? `<span class="ck-bubble" aria-hidden="true">${qty}</span>` : ""}</span>`;
  const gift = () => !!(field("gift") && field("gift").checked);

  /* calm notice shown above the form when ordering can't go through yet */
  function bannerHTML() {
    if (!waReady()) return `
      <div class="ck-banner" role="status">
        <span class="ck-banner-icon">${I.info}</span>
        <div>
          <p class="ck-banner-title">Online ordering opens soon</p>
          <p>We're setting up WhatsApp ordering. Your bag is saved on this device — fill in your details now and place the order once it's switched on. Questions? <a href="contact.html">Contact us</a>.</p>
        </div>
      </div>`;
    const d = drop();
    if (!d.live) return `
      <div class="ck-banner" role="status">
        <span class="ck-banner-icon">${I.info}</span>
        <div>
          <p class="ck-banner-title">Drop ${esc(dropNo)} isn't live yet</p>
          <p>Ordering unlocks at launch${d.launch ? ` — opens in <b class="ck-banner-cd" data-cd>…</b>` : ""}. Keep your bag ready.</p>
        </div>
      </div>`;
    return "";
  }

  /* =================================================================
     EMPTY STATE
     ================================================================= */
  function renderEmpty() {
    const picks = PRODUCTS.filter(p => p.stock > 0).slice(0, 4);
    root.innerHTML = `
      <div class="container">
        <section class="ck-empty">
          <span class="ck-empty-icon">${I.bag}</span>
          <h1 class="ck-empty-title">Your bag is empty</h1>
          <p class="ck-empty-text">There's nothing to check out yet. Every Drop ${esc(dropNo)} design is made in a small run.</p>
          <a class="btn" href="shop.html">Continue shopping</a>
        </section>
        ${picks.length ? `<section class="ck-empty-picks">
          <div class="ck-empty-head"><h2 class="ck-h2">In the drop</h2><a class="link-underline" href="shop.html">View all</a></div>
          <div class="grid-products">${picks.map(productCard).join("")}</div>
        </section>` : ""}
      </div>`;
    if (typeof refreshReveal === "function") refreshReveal();
  }

  /* =================================================================
     CHECKOUT SHELL
     ================================================================= */
  function renderCheckout() {
    const saved = read(KEY_ADDR, null);
    const cn = cartNote();
    root.innerHTML = `
      <button type="button" class="ck-sum-toggle" aria-expanded="false" aria-controls="ck-summary">
        <span class="ck-sum-toggle-l">${I.bag}<span class="ck-sum-toggle-label">Show order summary</span><span class="ck-sum-chev">${I.chev}</span></span>
        <strong class="ck-sum-toggle-total"></strong>
      </button>

      <div class="ck-layout">
        <div class="ck-main"><div class="ck-main-inner">
          <h1 class="ck-title">Checkout</h1>
          <nav class="ck-crumbs" aria-label="Checkout steps"><ol>
            <li><button type="button" class="ck-crumb" data-bag>Bag</button></li>
            <li data-step-pill="1"><span class="ck-crumb-sep" aria-hidden="true">${I.chevR}</span><button type="button" class="ck-crumb" data-goto="1">Information</button></li>
            <li data-step-pill="2"><span class="ck-crumb-sep" aria-hidden="true">${I.chevR}</span><button type="button" class="ck-crumb" data-goto="2" disabled>Payment</button></li>
          </ol></nav>
          <div id="ck-banner-slot"></div>

          <form class="ck-form" id="ck-form" novalidate autocomplete="on">
            <!-- STEP 1 — INFORMATION -->
            <section class="ck-panel" data-panel="1" aria-labelledby="ck-h1">
              <h2 class="sr-only" id="ck-h1" tabindex="-1">Information</h2>
              ${saved && saved.name ? `
              <div class="ck-saved" id="ck-saved">
                <span class="ck-saved-icon">${I.pin}</span>
                <div class="ck-saved-body"><b>Saved address</b>
                  <span>${esc(saved.name)} · ${esc(fmtPhone(saved.phone))}<br>${esc(saved.addr)}, ${esc(saved.city)}, ${esc(saved.state)} ${esc(saved.pin)}</span></div>
                <button type="button" class="btn btn-outline btn-sm" id="ck-use-saved">Use this</button>
              </div>` : ""}

              <fieldset class="ck-group">
                <legend class="ck-h2">Contact</legend>
                <div class="ck-grid">
                  <div class="ck-field ck-span-2" data-f="phone">
                    <label for="ck-phone">Mobile number</label>
                    <div class="ck-affix"><span class="ck-prefix" aria-hidden="true">+91</span>
                      <input id="ck-phone" name="tel" type="tel" inputmode="numeric" maxlength="10" autocomplete="tel-national" placeholder="10-digit mobile number" required aria-describedby="ck-phone-err ck-phone-hint"></div>
                    <p class="ck-hint" id="ck-phone-hint">We confirm your order on this number's WhatsApp.</p>
                    <p class="ck-err" id="ck-phone-err" role="alert"></p>
                  </div>
                  ${inputField("email", "Email", { type: "email", autocomplete: "email", optional: true, span: 2, placeholder: "you@example.com" })}
                </div>
              </fieldset>

              <fieldset class="ck-group">
                <legend class="ck-h2">Delivery</legend>
                <div class="ck-grid">
                  <div class="ck-field ck-span-2 ck-country"><span class="ck-label">Country</span><p class="ck-static">India</p></div>
                  ${inputField("name", "Full name", { autocomplete: "name", req: true, span: 2 })}
                  ${inputField("addr", "House / flat, street, area", { autocomplete: "street-address", req: true, span: 2 })}
                  ${inputField("landmark", "Landmark", { optional: true, span: 2, placeholder: "Near…" })}
                  <div class="ck-field" data-f="pin">
                    <label for="ck-pin">Pincode</label>
                    <div class="ck-affix ck-affix-end"><input id="ck-pin" name="postal-code" inputmode="numeric" maxlength="6" autocomplete="postal-code" placeholder="6 digits" required aria-describedby="ck-pin-err ck-pin-hint"><span class="ck-spin" aria-hidden="true"></span></div>
                    <p class="ck-hint" id="ck-pin-hint" aria-live="polite">City and state fill in automatically.</p>
                    <p class="ck-err" id="ck-pin-err" role="alert"></p>
                  </div>
                  ${inputField("city", "City / district", { autocomplete: "address-level2", req: true })}
                  <div class="ck-field ck-span-2" data-f="state">
                    <label for="ck-state">State / UT</label>
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
                <button type="button" class="btn ck-next" data-next>Continue to payment</button>
                <a class="ck-text-btn" href="shop.html">${I.back}<span>Continue shopping</span></a>
              </div>
            </section>

            <!-- STEP 2 — PAYMENT -->
            <section class="ck-panel" data-panel="2" aria-labelledby="ck-h2" hidden>
              <div class="ck-review" id="ck-review"></div>

              <fieldset class="ck-group">
                <legend class="ck-h2" id="ck-h2" tabindex="-1">Payment</legend>
                <p class="ck-sub">Every order is confirmed personally on WhatsApp before it ships.</p>
                <div class="ck-pay" role="radiogroup" aria-label="Payment method">
                  <label class="ck-pay-card">
                    <input type="radio" name="pay" value="upi" checked>
                    <span class="ck-radio" aria-hidden="true"></span>
                    <span class="ck-pay-body">
                      <span class="ck-pay-title">UPI</span>
                      <span class="ck-pay-desc">GPay, PhonePe, Paytm, BHIM or any UPI app. Our UPI ID and a QR code appear after you place the order.</span>
                    </span>
                    <span class="ck-pay-fee">No fee</span>
                  </label>
                  ${codOn ? `<label class="ck-pay-card">
                    <input type="radio" name="pay" value="cod">
                    <span class="ck-radio" aria-hidden="true"></span>
                    <span class="ck-pay-body">
                      <span class="ck-pay-title">Cash on Delivery</span>
                      <span class="ck-pay-desc">Pay in cash when the parcel reaches your door.</span>
                    </span>
                    <span class="ck-pay-fee">${STORE.codFee ? "+ " + rupee(STORE.codFee) : "Free"}</span>
                  </label>` : `<p class="ck-pay-off">Cash on Delivery isn't available right now — UPI only.</p>`}
                </div>
              </fieldset>

              <fieldset class="ck-group">
                <legend class="ck-h2">Note <span class="opt">(optional)</span></legend>
                <label class="ck-check"><input type="checkbox" id="ck-gift" ${cn.gift ? "checked" : ""}><span class="box">${I.check}</span><span>This order is a gift</span></label>
                <div class="ck-field ck-note-field" data-f="note">
                  <label for="ck-note" class="sr-only">Order note</label>
                  <textarea id="ck-note" rows="3" maxlength="500" placeholder="Gift message, preferred delivery time, anything else we should know">${esc(cn.text)}</textarea>
                </div>
              </fieldset>

              <div class="ck-mtotals" id="ck-mtotals"></div>

              <div class="ck-place">
                <button type="button" class="btn btn-block ck-place-btn" id="ck-place"></button>
                <p class="ck-place-lock" id="ck-place-lock" hidden></p>
                <p class="ck-place-note">This opens WhatsApp with your order filled in — just tap <b>Send</b>. By placing an order you agree to our <a href="policies.html#terms">terms</a> and <a href="policies.html#exchange">exchange policy</a>.</p>
              </div>
              <div class="ck-actions ck-actions-start">
                <button type="button" class="ck-text-btn" data-prev>${I.back}<span>Return to information</span></button>
              </div>
            </section>
          </form>

          <ul class="ck-policies">
            <li><a href="policies.html#shipping">Shipping</a></li>
            <li><a href="policies.html#exchange">Exchange &amp; returns</a></li>
            <li><a href="policies.html#privacy">Privacy</a></li>
            <li><a href="policies.html#terms">Terms</a></li>
          </ul>
        </div></div>

        <aside class="ck-summary" id="ck-summary" aria-label="Order summary">
          <div class="ck-summary-inner" id="ck-summary-card"></div>
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
      btn.innerHTML = locked
        ? `${I.lock}<span>Ordering opens soon</span>`
        : `${I.wa}<span>Place order<span class="ck-hide-xs"> on WhatsApp</span></span><span class="ck-place-sep" aria-hidden="true"></span><b class="ck-place-total">${rupee(totals().total)}</b>`;
    }
    if (note) {
      note.hidden = !locked;
      note.textContent = !wa ? "The store is still setting up WhatsApp ordering, so orders can't be sent just yet."
        : !live ? `Drop ${dropNo} hasn't launched yet — ordering unlocks at launch.` : "";
    }
  }

  function inputField(id, label, o = {}) {
    return `<div class="ck-field${o.span === 2 ? " ck-span-2" : ""}" data-f="${id}">
      <label for="ck-${id}">${label}${o.optional ? ` <span class="opt">(optional)</span>` : ""}</label>
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
  const STEP_FIELDS = { 1: ["phone", "email", "name", "addr", "pin", "city", "state"], 2: [] };

  function setError(id, msg) {
    const f = field(id); if (!f) return;
    const wrap = f.closest(".ck-field"), err = document.getElementById(`ck-${id}-err`);
    wrap.classList.toggle("invalid", !!msg);
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
    state.step = n; maxStep = Math.max(maxStep, n);
    $$(".ck-crumbs [data-step-pill]").forEach(li => {
      const s = +li.dataset.stepPill, b = li.querySelector("button");
      li.classList.toggle("active", s === n);
      li.classList.toggle("done", s < n);
      b.disabled = s > maxStep || s === n;
      s === n ? b.setAttribute("aria-current", "step") : b.removeAttribute("aria-current");
    });
    if (n === 2) renderReview();
    $$(".ck-panel").forEach(p => {
      const s = +p.dataset.panel;
      if (s === n) {
        p.hidden = false;
        p.classList.remove("is-in");
        if (!instant && !reduced()) { void p.offsetWidth; p.classList.add("is-in"); }
      } else p.hidden = true;
    });
    if (!instant) {
      const top = $(".ck-main-inner").getBoundingClientRect().top + scrollY - 90;
      if (scrollY > top) window.scrollTo({ top: Math.max(0, top), behavior: reduced() ? "auto" : "smooth" });
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
      if (!po) { hint.className = "ck-hint warn"; hint.textContent = "We couldn't find this pincode — please check it, or enter city and state yourself."; return; }
      const city = po.District || po.Block || po.Name;
      const st = STATES.find(s => normState(s) === normState(po.State)) ||
        STATES.find(s => normState(po.State).includes(normState(s)) || normState(s).includes(normState(po.State))) || "";
      const cityEl = field("city"), stEl = field("state");
      if (!cityEl.value.trim() || cityEl.value.trim() === state.pinAuto.city) { cityEl.value = city; flash(cityEl); }
      if (st && (!stEl.value || stEl.value === state.pinAuto.state)) { stEl.value = st; flash(stEl); }
      state.pinAuto = { city, state: st };
      ["city", "state"].forEach(f => field(f).closest(".ck-field").classList.contains("invalid") && checkField(f));
      hint.className = "ck-hint ok"; hint.innerHTML = `${I.check} ${esc(city)}${st ? ", " + esc(st) : ""}`;
    } catch {
      if (id !== pinReq) return;
      hint.className = "ck-hint warn"; hint.textContent = "Couldn't auto-detect right now — please enter city and state.";
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
      else if (v.length < 6) { state.lastPin = ""; pinReq++; field("pin").closest(".ck-field").classList.remove("loading"); const h = $("#ck-pin-hint"); h.className = "ck-hint"; h.textContent = "City and state fill in automatically."; }
    });

    // saved address
    const useSaved = $("#ck-use-saved");
    if (useSaved) useSaved.onclick = () => {
      const s = read(KEY_ADDR, {});
      ["name", "phone", "email", "addr", "landmark", "pin", "city", "state"].forEach(k => { if (field(k) && s[k] != null) field(k).value = s[k]; });
      state.lastPin = s.pin; state.pinAuto = { city: s.city, state: s.state };
      ["name", "phone", "email", "addr", "pin", "city", "state"].forEach(k => field(k).value && checkField(k));
      $("#ck-saved").classList.add("used");
      useSaved.textContent = "Filled in";
      useSaved.disabled = true;
      say("Saved address filled in");
    };

    $$("[data-next]").forEach(b => b.onclick = () => { if (validateStep(state.step)) showStep(state.step + 1); });
    $$("[data-prev]").forEach(b => b.onclick = () => showStep(state.step - 1));
    $$("[data-goto]").forEach(b => b.onclick = () => {
      const to = +b.dataset.goto;
      if (to < state.step || validateStep(state.step)) showStep(to);
    });
    const bag = $("[data-bag]");
    if (bag) bag.onclick = () => { if (typeof openCart === "function") openCart(); else location.href = "shop.html"; };

    $$("input[name=pay]").forEach(r => r.addEventListener("change", () => { state.pay = r.value; renderSummary(); }));
    // gift + note: shared with the bag drawer (Cart.note / Cart.setNote) and mirrored live in the summary
    ["gift", "note"].forEach(id => field(id).addEventListener(id === "gift" ? "change" : "input", () => {
      if (typeof Cart.setNote === "function") { try { Cart.setNote({ gift: gift(), note: val("note") }); } catch { /* ignore */ } }
      renderSummary();
    }));

    // mobile summary toggle
    const tog = $(".ck-sum-toggle");
    tog.onclick = () => {
      const open = tog.getAttribute("aria-expanded") !== "true";
      tog.setAttribute("aria-expanded", String(open));
      $(".ck-sum-toggle-label").textContent = open ? "Hide order summary" : "Show order summary";
      $("#ck-summary").classList.toggle("open", open);
    };

    $("#ck-place").onclick = placeOrder;

    // summary (delegated)
    const card = $("#ck-summary-card");
    card.addEventListener("click", e => {
      const rm = e.target.closest("[data-rm]");
      if (rm) { removeLine(+rm.dataset.rm); afterCartChange(); }
      if (e.target.closest("#ck-coupon-apply")) applyCoupon();
      if (e.target.closest("[data-coupon-remove]")) { state.coupon = ""; sessionStorage.removeItem(KEY_COUPON); renderSummary(); setCouponMsg("Discount removed.", ""); }
      const sug = e.target.closest("[data-coupon-suggest]");
      if (sug) { $("#ck-coupon").value = sug.dataset.couponSuggest; applyCoupon(); }
    });
    card.addEventListener("keydown", e => { if (e.target.id === "ck-coupon" && e.key === "Enter") { e.preventDefault(); applyCoupon(); } });
  }

  function applyCoupon() {
    const inp = $("#ck-coupon"), code = inp.value.trim().toUpperCase();
    if (!code) { setCouponMsg("Enter a discount code.", "err"); inp.focus(); return; }
    if (!STORE.coupons[code]) { setCouponMsg(`"${code}" isn't a valid code.`, "err"); inp.select(); return; }
    state.coupon = code; sessionStorage.setItem(KEY_COUPON, code);
    renderSummary();
    setCouponMsg(`${code} applied — you save ${rupee(totals().disc)}.`, "ok");
  }
  function setCouponMsg(msg, cls) { const m = $("#ck-coupon-msg"); if (m) { m.textContent = msg; m.className = "ck-coupon-msg " + (cls || ""); } }

  function afterCartChange() {
    if (state.placed) return;
    if (!Cart.lines().length) { renderEmpty(); return; }
    if (!$("#ck-summary-card")) { renderCheckout(); return; }
    syncNote();
    renderSummary();
    if (state.step === 2) renderReview();
  }

  /* gift / note changed in the bag drawer → reflect it here (without touching what's already equal) */
  function syncNote() {
    const cn = cartNote(), g = field("gift"), n = field("note");
    if (g && g.checked !== cn.gift) g.checked = cn.gift;
    if (n && n.value.trim() !== cn.text) n.value = cn.text;
  }

  /* ---------------- totals block (summary + mobile recap) ---------------- */
  function totalsHTML(t, coupon, pay) {
    return `<dl class="ck-totals">
        <div><dt>Subtotal</dt><dd>${rupee(t.sub)}</dd></div>
        ${t.disc ? `<div class="disc"><dt>Discount <span class="ck-code">${esc(coupon)}</span></dt><dd>− ${rupee(t.disc)}</dd></div>` : ""}
        <div><dt>Shipping</dt><dd>${t.ship ? rupee(t.ship) : "Free"}</dd></div>
        ${pay === "cod" && codOn ? `<div><dt>Cash on Delivery fee</dt><dd>${t.cod ? rupee(t.cod) : "Free"}</dd></div>` : ""}
      </dl>
      <div class="ck-grand"><span>Total</span><b><small>INR</small> ${rupee(t.total)}</b></div>
      <p class="ck-tax">Including all taxes</p>`;
  }

  /* ---------------- summary ---------------- */
  function renderSummary() {
    const card = $("#ck-summary-card"); if (!card) return;
    const lines = Cart.lines(), t = totals(), raw = Cart.get();
    const keepMsg = $("#ck-coupon-msg") ? [$("#ck-coupon-msg").textContent, $("#ck-coupon-msg").className] : null;
    const firstCode = Object.keys(STORE.coupons)[0];
    const mrpSave = lines.reduce((s, l) => s + Math.max(0, l.p.mrp - l.p.price) * l.qty, 0);
    const isGift = gift(), note = val("note");
    card.innerHTML = `
      <h2 class="sr-only">Order summary</h2>
      <ul class="ck-lines">${lines.map(l => {
        const idx = raw.findIndex(r => r.id === l.id && String(r.size) === String(l.size));
        return `<li class="ck-line">
          <a href="product.html?id=${encodeURIComponent(l.id)}" tabindex="-1" aria-hidden="true">${thumb(l.p, l.qty)}</a>
          <div class="ck-line-info">
            <a class="ck-line-name" href="product.html?id=${encodeURIComponent(l.id)}">${esc(l.p.name)}</a>
            <span class="ck-line-meta">${esc(l.p.colorName || "")}${l.p.colorName ? " / " : ""}${esc(l.size)}<span class="sr-only">, quantity ${l.qty}</span></span>
            <button type="button" class="ck-rm" data-rm="${idx}" aria-label="Remove ${esc(l.p.name)} size ${esc(l.size)}">Remove</button>
          </div>
          <div class="ck-line-price">${l.p.mrp > l.p.price ? `<s>${rupee(l.p.mrp * l.qty)}</s>` : ""}<span>${rupee(l.p.price * l.qty)}</span></div>
        </li>`;
      }).join("")}</ul>

      <div class="ck-coupon">
        ${state.coupon ? `<div class="ck-coupon-applied"><span>Discount code <b>${esc(state.coupon)}</b> · ${t.pct}% off</span><button type="button" class="ck-text-link" data-coupon-remove aria-label="Remove discount code ${esc(state.coupon)}">Remove</button></div>`
        : `<div class="ck-coupon-row"><label class="sr-only" for="ck-coupon">Discount code</label>
            <input id="ck-coupon" placeholder="Discount code" autocomplete="off" autocapitalize="characters" spellcheck="false">
            <button type="button" class="btn btn-outline" id="ck-coupon-apply">Apply</button></div>
            ${firstCode ? `<button type="button" class="ck-coupon-hint" data-coupon-suggest="${esc(firstCode)}">First order? Use <b>${esc(firstCode)}</b> for ${STORE.coupons[firstCode]}% off</button>` : ""}`}
        <p class="ck-coupon-msg" id="ck-coupon-msg" aria-live="polite"></p>
      </div>

      ${isGift || note ? `<div class="ck-sum-note">
        ${isGift ? `<p>${I.gift}<span><b>Gift order</b></span></p>` : ""}
        ${note ? `<p>${I.note}<span>${esc(note)}</span></p>` : ""}
      </div>` : ""}

      ${totalsHTML(t, state.coupon, state.pay)}
      ${t.toFree && t.ship ? `<p class="ck-free-hint">Add ${rupee(t.toFree)} more for free shipping.</p>` : ""}
      ${mrpSave > 0 ? `<p class="ck-saving">You save ${rupee(mrpSave + t.disc)}</p>` : ""}`;
    if (keepMsg && keepMsg[0]) { const m = $("#ck-coupon-msg"); m.textContent = keepMsg[0]; m.className = keepMsg[1]; }
    const tot = $(".ck-sum-toggle-total"); if (tot) tot.textContent = rupee(t.total);
    $$(".ck-place-total").forEach(e => e.textContent = rupee(t.total));
    const mt = $("#ck-mtotals"); if (mt) mt.innerHTML = totalsHTML(t, state.coupon, state.pay);
  }

  /* ---------------- review (top of the payment step) ---------------- */
  function renderReview() {
    $("#ck-review").innerHTML = `
      <div class="ck-review-row"><span class="ck-review-k">Contact</span>
        <span class="ck-review-v">${esc(fmtPhone(val("phone")))}${val("email") ? ` · ${esc(val("email"))}` : ""}</span>
        <button type="button" class="ck-text-link" data-edit="1" aria-label="Change contact">Change</button></div>
      <div class="ck-review-row"><span class="ck-review-k">Ship to</span>
        <span class="ck-review-v">${esc(val("name"))}, ${esc(val("addr"))}${val("landmark") ? ` (near ${esc(val("landmark"))})` : ""}, ${esc(val("city"))}, ${esc(val("state"))} ${esc(val("pin"))}</span>
        <button type="button" class="ck-text-link" data-edit="1" aria-label="Change delivery address">Change</button></div>
      <div class="ck-review-row"><span class="ck-review-k">Delivery</span>
        <span class="ck-review-v">Standard · 3–7 business days · <b>${totals().ship ? rupee(totals().ship) : "Free"}</b></span></div>`;
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
    if (o.gift || o.note) L.push("");
    if (o.gift) L.push("*Gift order:* Yes");
    if (o.note) L.push(`*Note:* ${o.note}`);
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
      id: newOrderId(), date: new Date().toISOString(), pay: state.pay, coupon: state.coupon, note: val("note"), gift: gift(),
      items: lines.map(l => ({ id: l.id, name: l.p.name, size: l.size, qty: l.qty, price: l.p.price })),
      t, c
    };
    const msg = composeMessage(order);
    const url = orderLink(msg);

    window.open(url, "_blank", "noopener");

    if ($("#ck-save").checked) write(KEY_ADDR, c); else { try { localStorage.removeItem(KEY_ADDR); } catch { /* ignore */ } }
    write(KEY_LAST, { id: order.id, date: order.date, pay: order.pay, items: order.items, total: t.total, t, coupon: order.coupon, gift: order.gift, note: order.note, city: c.city, state: c.state, pin: c.pin, name: c.name });
    state.placed = true;
    sessionStorage.removeItem(KEY_COUPON);
    Cart.clear();
    renderSuccess(order, url);
  }

  /* =================================================================
     SUCCESS — quiet thank-you page
     ================================================================= */
  function renderSuccess(o, url) {
    const first = esc(o.c.name.split(/\s+/)[0]);
    const amount = o.t.total;
    const upiLink = `upi://pay?pa=${encodeURIComponent(STORE.upi)}&pn=${encodeURIComponent(STORE.name)}&am=${amount}&cu=INR&tn=${encodeURIComponent("Order " + o.id)}`;
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=${encodeURIComponent(upiLink)}`;
    const shotLink = orderLink(`Hi ${STORE.name}, here's the payment screenshot for order ${o.id} (${rupee(amount)}).`);
    const when = new Date(o.date).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

    root.innerHTML = `
      <div class="ck-layout ck-done">
        <div class="ck-main"><div class="ck-main-inner">
          <section class="ck-success" aria-labelledby="ck-success-title">
            <header class="ck-success-head">
              <span class="ck-success-icon">${I.bigCheck}</span>
              <div>
                <p class="ck-success-id">Order <b>${esc(o.id)}</b></p>
                <h1 class="ck-success-title" id="ck-success-title" tabindex="-1">Thank you, ${first}</h1>
              </div>
            </header>

            <div class="ck-box">
              <h2 class="ck-box-title">Your order is ready to send</h2>
              <p>WhatsApp opened with your order filled in. Tap <b>Send</b> there and we'll reply to confirm your order and sizes.</p>
              <a class="btn btn-outline ck-wa-retry" href="${url}" target="_blank" rel="noopener">${I.wa}<span>Open WhatsApp again</span></a>
              <div class="ck-id-row">
                <span>Order ID</span><b>${esc(o.id)}</b>
                <button type="button" class="ck-copy" data-copy="${esc(o.id)}" aria-label="Copy order ID">${I.copy}<span>Copy</span></button>
              </div>
            </div>

            ${o.pay === "upi" ? `
            <div class="ck-box ck-upi">
              <h2 class="ck-box-title">Pay by UPI</h2>
              <div class="ck-upi-grid">
                <div class="ck-upi-info">
                  <p class="ck-upi-amt">${rupee(amount)}</p>
                  <div class="ck-id-row ck-upi-id"><span>UPI ID</span><b>${esc(STORE.upi)}</b>
                    <button type="button" class="ck-copy" data-copy="${esc(STORE.upi)}" aria-label="Copy UPI ID">${I.copy}<span>Copy</span></button></div>
                  <ol class="ck-upi-steps">
                    <li>Pay <b>${rupee(amount)}</b> to <b>${esc(STORE.upi)}</b> and add <b>${esc(o.id)}</b> in the note.</li>
                    <li>Send the payment screenshot on WhatsApp.</li>
                  </ol>
                </div>
                <figure class="ck-qr">
                  <img src="${qr}" width="220" height="220" alt="UPI QR code to pay ${rupee(amount)} to ${esc(STORE.upi)}" onerror="this.closest('figure').hidden=true">
                  <figcaption>Scan with any UPI app</figcaption>
                </figure>
              </div>
              <div class="ck-upi-btns">
                <a class="btn ck-upi-app" href="${upiLink}">Pay with UPI app</a>
                <a class="btn btn-outline" href="${shotLink}" target="_blank" rel="noopener">${I.wa}<span>Send payment screenshot</span></a>
              </div>
            </div>` : `
            <div class="ck-box ck-cod">
              <h2 class="ck-box-title">Cash on Delivery</h2>
              <p class="ck-upi-amt">${rupee(amount)}</p>
              <p>Keep the exact amount ready when your parcel arrives${o.t.cod ? ` (includes ${rupee(o.t.cod)} COD fee)` : ""}. Prefer to pay now? Pay by UPI to <b>${esc(STORE.upi)}</b> and share the screenshot with us.</p>
            </div>`}

            <div class="ck-box">
              <h2 class="ck-box-title">What happens next</h2>
              <ol class="ck-next-steps">
                <li><b>Confirm on WhatsApp</b><span>Send the prefilled message. We reply to confirm your order and sizes.</span></li>
                <li><b>Packed in 1–2 days</b><span>Checked, folded and packed — we share the tracking link on WhatsApp.</span></li>
                <li><b>Delivered in 3–7 days</b><span>Depending on your pincode. Wrong size? Exchange within 7 days, subject to stock.</span></li>
              </ol>
            </div>

            <div class="ck-box ck-box-cols">
              <div><h3 class="ck-box-k">Deliver to</h3><p>${esc(o.c.name)}<br>${esc(o.c.addr)}${o.c.landmark ? `<br>Near ${esc(o.c.landmark)}` : ""}<br>${esc(o.c.city)}, ${esc(o.c.state)} ${esc(o.c.pin)}<br>${esc(fmtPhone(o.c.phone))}</p></div>
              <div><h3 class="ck-box-k">Payment</h3><p>${o.pay === "cod" ? "Cash on Delivery" : "UPI"} · ${rupee(amount)}</p>
                <h3 class="ck-box-k">Placed</h3><p>${esc(when)}</p>
                ${o.gift || o.note ? `<h3 class="ck-box-k">${o.gift ? "Gift order" : "Note"}</h3><p>${o.note ? esc(o.note) : "Yes"}</p>` : ""}</div>
            </div>

            <div class="ck-success-cta">
              <a class="btn" href="shop.html">Continue shopping</a>
              <a class="link-underline" href="contact.html?order=${encodeURIComponent(o.id)}#track">Track this order</a>
            </div>
          </section>
        </div></div>

        <aside class="ck-summary ck-summary-done" aria-label="Order summary">
          <div class="ck-summary-inner">
            <h2 class="ck-sum-title">Order summary</h2>
            <ul class="ck-lines">${o.items.map(i => {
              const p = getProduct(i.id);
              return `<li class="ck-line">${p ? thumb(p, i.qty) : ""}
                <div class="ck-line-info"><span class="ck-line-name">${esc(i.name)}</span><span class="ck-line-meta">${p && p.colorName ? esc(p.colorName) + " / " : ""}${esc(i.size)}${p ? "" : ` × ${i.qty}`}</span></div>
                <div class="ck-line-price"><span>${rupee(i.price * i.qty)}</span></div></li>`;
            }).join("")}</ul>
            ${totalsHTML(o.t, o.coupon, o.pay)}
          </div>
        </aside>
      </div>`;

    $$(".ck-copy", root).forEach(b => b.onclick = () => {
      copyText(b.dataset.copy);
      const s = b.querySelector("span"); s.textContent = "Copied"; b.classList.add("copied");
      setTimeout(() => { s.textContent = "Copy"; b.classList.remove("copied"); }, 1800);
    });
    window.scrollTo({ top: 0 });
    $("#ck-success-title").focus({ preventScroll: true });
  }

  /* =================================================================
     INIT
     ================================================================= */
  document.addEventListener("cart:change", afterCartChange);
  document.addEventListener("cart:note", () => { if (!state.placed && $("#ck-summary-card")) { syncNote(); renderSummary(); } });
  if (!Cart.lines().length) renderEmpty(); else renderCheckout();
})();
