/* =========================================================
   BHAKSHI — Home page (index.html). Owner: Home agent.  v3 "minimal craft streetwear".
   Quick links · campaign hero (+ countdown / notify) · drop row · campaign banner ·
   three tiles (craft or category) · best sellers carousel · worn by you / Instagram ·
   brand story · mix & match (feature-flagged <template>) · first access · JSON-LD.
   Uses globals from products.js, art.js and app.js (see ARCHITECTURE.md), with local
   fallbacks so a missing helper never blanks the page.
   ========================================================= */
(() => {
  "use strict";

  /* ---------- small, defensive helpers ---------- */
  const qs = (s, el = document) => el.querySelector(s);
  const qsa = (s, el = document) => [...el.querySelectorAll(s)];
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MOBILE = matchMedia("(max-width: 767px)");
  const S = typeof STORE !== "undefined" ? STORE : { name: "BHAKSHI", drop: {}, features: {} };
  const ALL = typeof PRODUCTS !== "undefined" ? PRODUCTS : [];
  const CATS = typeof CATEGORIES !== "undefined" ? CATEGORIES : [];
  const C = S.campaign || {};
  const E = s => (typeof esc === "function" ? esc(s)
    : String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])));
  const money = n => (typeof rupee === "function" ? rupee(n)
    : "Rs. " + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const pad = n => String(Math.max(0, Math.floor(+n || 0))).padStart(2, "0");
  const title = p => String(p.name).split(" — ")[0];
  const link = p => `product.html?id=${encodeURIComponent(p.id)}`;
  const absUrl = rel => { try { return new URL(rel, location.href).href; } catch { return rel; } };
  const toastMsg = (m, o) => { if (typeof toast === "function") toast(m, o); };
  const hasArt = typeof Art !== "undefined";
  const dropNo = () => (S.drop && S.drop.number) || "01";
  const dropName = () => (S.drop && S.drop.name) || "";
  const nextNo = () => pad((parseInt(dropNo(), 10) || 1) + 1);
  const groupOf = p => (CATS.find(c => c.id === p.category) || {}).group || "";
  const tags = p => p.tags || [];

  const wa = text => {
    if (typeof waLink === "function") { try { return waLink(text); } catch { /* fall through */ } }
    const n = String(S.whatsapp || "").replace(/\D/g, "");
    return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
  };
  const drop = () => {
    if (typeof dropState === "function") { try { const d = dropState(); if (d) return d; } catch { /* fall through */ } }
    const l = S.drop && S.drop.launch ? new Date(S.drop.launch) : null;
    const ms = l && !isNaN(l) ? l - Date.now() : 0;
    return { live: ms <= 0, launch: l, msLeft: Math.max(0, ms) };
  };
  const mixOn = () => {
    if (typeof mixMatchOn === "function") { try { return !!mixMatchOn(); } catch { /* fall through */ } }
    return !!(S.features && S.features.mixAndMatch) && ALL.some(p => groupOf(p) === "Bottoms");
  };
  const liveCats = () => {
    if (typeof liveCategories === "function") { try { return liveCategories(); } catch { /* fall through */ } }
    return CATS.filter(c => ALL.some(p => p.category === c.id));
  };
  const card = p => {
    if (typeof productCard === "function") { try { return productCard(p); } catch (e) { console.warn("[home] productCard", e); } }
    return `<article class="card" data-id="${E(p.id)}"><a class="card-media" href="${link(p)}">${garment(p)}</a>
      <div class="card-body"><a class="card-name" href="${link(p)}">${E(title(p))}</a><p class="card-price">${money(p.price)}</p></div></article>`;
  };
  const igHandle = () => {
    const m = String(S.instagram || "").match(/instagram\.com\/([A-Za-z0-9._]+)/);
    return "@" + (m ? m[1] : String(S.name || "bhakshi").toLowerCase());
  };

  /* ---------- imagery ---------- */
  function garment(p, view = "front") {
    const imgs = p.images || [];
    const src = view === "back" ? (imgs[1] || imgs[0]) : imgs[0];
    if (src) return `<img src="${E(src)}" alt="${E(title(p))}" loading="lazy" decoding="async">`;
    if (typeof productImage === "function") { try { return productImage(p, 0, view); } catch { /* fall through */ } }
    if (hasArt && typeof Art.garment === "function") { try { return Art.garment(p, { view }); } catch (e) { console.warn("[home] Art.garment", e); } }
    return `<span class="hm-noart" style="background:${E(p.color)}"></span>`;
  }

  /* Used only if neither campaignImage() nor Art.campaign() exist yet: a calm flat-lay of the tees. */
  function fallbackScene(scene, ratio) {
    const id = String(scene || "").startsWith("single:") ? scene.slice(7) : "";
    const list = id ? ALL.filter(p => p.id === id) : ALL.slice(0, scene === "macro" ? 1 : 5);
    return `<div class="hm-fallback" data-ratio="${E(ratio)}">${list.map(p => `<span>${garment(p, scene === "macro" ? "back" : "front")}</span>`).join("")}</div>`;
  }

  /* Big campaign image: owner photo for the slot, else the drawn Art.campaign scene. */
  function campaign(slot, opts) {
    const o = Object.assign({ scene: "flatlay", ratio: "16:9", alt: "" }, opts);
    let html = "";
    if (slot && typeof campaignImage === "function") { try { html = campaignImage(slot, o) || ""; } catch (e) { console.warn("[home] campaignImage", e); } }
    if (!html && slot && C[slot]) html = `<img src="${E(C[slot])}" alt="${E(o.alt)}" loading="lazy" decoding="async">`;
    if (!html && hasArt && typeof Art.campaign === "function") { try { html = Art.campaign(o.scene, { ratio: o.ratio }) || ""; } catch (e) { console.warn("[home] Art.campaign", e); } }
    if (!html) html = fallbackScene(o.scene, o.ratio);
    return html;
  }
  /* Fill a box with a campaign image and make it cover the box at any aspect ratio. */
  function mount(el, html, { alt = "", eager = false } = {}) {
    if (!el) return;
    el.innerHTML = html;
    const img = qs("img", el), svg = el.firstElementChild && el.firstElementChild.tagName.toLowerCase() === "svg" ? el.firstElementChild : qs(":scope > svg, :scope > * > svg", el);
    if (img) {
      if (alt && !img.getAttribute("alt")) img.alt = alt;
      if (eager) { img.loading = "eager"; img.setAttribute("fetchpriority", "high"); }
      el.dataset.kind = "photo";
    } else {
      el.dataset.kind = "art";
      if (svg) {
        svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
        svg.setAttribute("width", "100%"); svg.setAttribute("height", "100%");
        if (alt) { svg.setAttribute("role", "img"); svg.setAttribute("aria-label", alt); } else svg.setAttribute("aria-hidden", "true");
      }
    }
  }

  /* Pick white or black overlay text by sampling the image under the copy (best effort). */
  function sampleTone(box, target, region) {
    const set = tone => { target.dataset.tone = tone; };
    const img = qs("img", box), svg = qs("svg", box);
    let src = "";
    if (img) src = img.currentSrc || img.src;
    else if (svg) {
      try {
        const s = new XMLSerializer().serializeToString(svg);
        src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s.includes("xmlns=") ? s : s.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"'));
      } catch { return; }
    }
    if (!src) return;
    const im = new Image();
    im.decoding = "async";
    im.onload = () => {
      try {
        const r = box.getBoundingClientRect(); if (!r.width || !r.height) return;
        const W = 96, H = Math.max(1, Math.round(W * r.height / r.width));
        const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
        const cx = cv.getContext("2d", { willReadFrequently: true });
        // emulate object-fit: cover / xMidYMid slice
        const iw = im.naturalWidth || 1600, ih = im.naturalHeight || 900;
        const sc = Math.max(W / iw, H / ih), dw = iw * sc, dh = ih * sc;
        cx.drawImage(im, (W - dw) / 2, (H - dh) / 2, dw, dh);
        const [x0, y0, x1, y1] = region(W, H);
        const d = cx.getImageData(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0)).data;
        let sum = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) { sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; n++; }
        set(sum / n / 255 < 0.56 ? "light" : "dark");
      } catch { /* tainted or undecodable — keep the default */ }
    };
    im.src = src;
  }

  /* ---------- the drop's products ---------- */
  const DROP = (() => {
    const fresh = ALL.filter(p => tags(p).includes("new"));
    return (fresh.length ? fresh : ALL.slice()).slice(0, 12);
  })();
  const N = DROP.length;
  const noun = DROP.every(p => p.shape === "tee") ? (N === 1 ? "tee" : "tees") : (N === 1 ? "piece" : "pieces");
  const numWord = n => ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"][n] || String(n);

  /* ======================================================
     QUICK LINKS
     ====================================================== */
  function initQuick() {
    const nav = qs("#quickLinks"); if (!nav) return;
    const extra = [];
    if (ALL.some(p => tags(p).includes("new"))) extra.push(["New in", "shop.html?tag=new", "start"]);
    if (ALL.some(p => tags(p).includes("bestseller"))) extra.push(["Best sellers", "shop.html?tag=bestseller", "end"]);
    if (ALL.some(p => tags(p).includes("sale") && p.mrp > p.price)) extra.push(["Sale", "shop.html?tag=sale", "end"]);
    if (typeof categoryLinksRow === "function") {
      try {
        const html = categoryLinksRow({ className: "hm-cats", label: "Shop by", active: null });
        if (html) {
          const box = qs(".hm-wrap", nav); box.innerHTML = html;
          const row = box.firstElementChild, all = row && row.firstElementChild;
          if (row) {
            const mk = ([t, h]) => { const a = document.createElement("a"); a.className = "cat-link"; a.href = h; a.textContent = t; return a; };
            extra.filter(x => x[2] === "start").reverse().forEach(x => row.prepend(mk(x)));
            // "All" goes last so the row reads New in · T-Shirts · Best sellers · All
            extra.filter(x => x[2] === "end").forEach(x => row.append(mk(x)));
            if (all && /^all$/i.test(all.textContent.trim())) { all.textContent = "Shop all"; row.append(all); }
            nav.classList.add("is-shell");
            return;
          }
        }
      } catch (e) { console.warn("[home] categoryLinksRow", e); }
    }
    const items = extra.filter(x => x[2] === "start");
    liveCats().forEach(c => items.push([c.name, `shop.html?cat=${encodeURIComponent(c.id)}`]));
    extra.filter(x => x[2] === "end").forEach(x => items.push(x));
    items.push(["Shop all", "shop.html"]);
    qs("[data-quick-list]", nav).innerHTML = items.map(([t, h]) => `<li><a href="${h}">${E(t)}</a></li>`).join("");
  }

  /* ======================================================
     HERO
     ====================================================== */
  function renderHeroMedia() {
    const hero = qs("#hero"), box = qs("#heroMedia"); if (!box) return;
    const m = MOBILE.matches;
    // a desktop photo still beats a drawn scene on mobile — crop it rather than switch to art
    const slot = m ? (C.heroMobile || !C.hero ? "heroMobile" : "hero") : "hero";
    const alt = `${S.name} Drop ${dropNo()}${dropName() ? " — " + dropName() : ""}`;
    const photo = !!C[slot];
    // phone + drawn scene: a square crop, copy below; phone + photo: tall 4:5 with copy over it
    mount(box, campaign(slot, { scene: "rail", ratio: m ? (photo ? "4:5" : "1:1") : "16:9", alt, eager: true }), { alt, eager: true });
    hero.dataset.kind = box.dataset.kind;
    hero.dataset.tone = "dark";
    // drawn scenes fill the frame on a phone, so the copy moves below the image there (black on white)
    const below = m && !photo && box.dataset.kind !== "photo";
    hero.classList.toggle("is-below", below);
    if (below) return;
    // copy sits in a low band across the bottom on desktop, bottom-left on mobile photos
    sampleTone(box, hero, (W, H) => m ? [0, Math.round(H * 0.55), W, H] : [0, Math.round(H * 0.7), W, H]);
  }

  let cdTimer = 0;
  function runCountdown(launch) {
    const box = qs("#heroCd"); if (!box || !launch) return;
    const t = new Date(launch).getTime(), units = { d: qs('[data-u="d"]', box), h: qs('[data-u="h"]', box), m: qs('[data-u="m"]', box), s: qs('[data-u="s"]', box) };
    const timer = qs(".hm-cd-units", box);
    box.hidden = false;
    const tick = () => {
      const left = t - Date.now();
      let s = Math.max(0, Math.floor(left / 1000));
      const d = Math.floor(s / 86400); s %= 86400;
      const h = Math.floor(s / 3600); s %= 3600;
      const mi = Math.floor(s / 60); s %= 60;
      units.d.textContent = pad(d); units.h.textContent = pad(h); units.m.textContent = pad(mi); units.s.textContent = pad(s);
      timer.setAttribute("aria-label", `${d} days, ${h} hours, ${mi} minutes, ${s} seconds`);
      if (left <= 0) { clearTimeout(cdTimer); setTimeout(() => location.reload(), 1200); return; }
      cdTimer = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    tick();
  }

  function openNotify() {
    const no = dropNo(), name = dropName();
    const html = `<div class="hm-notify">
      <p class="hm-kicker">Drop ${E(no)}${name ? " · " + E(name) : ""}</p>
      <h2 class="hm-notify-title" id="notifyTitle">Get a message at launch</h2>
      <p class="hm-notify-line">Tell us your name and WhatsApp opens with a ready message. Hit send and we’ll ping you the minute the drop goes live.</p>
      <form class="hm-form" id="notifyForm" novalidate>
        <label class="hm-label" for="notifyName">Your name</label>
        <input class="hm-input" id="notifyName" name="name" type="text" autocomplete="given-name" placeholder="e.g. Arjun" maxlength="40" required>
        <p class="hm-err" id="notifyErr" role="alert"></p>
        <button class="btn btn-block hm-btn" type="submit">Continue on WhatsApp</button>
      </form>
    </div>`;
    if (typeof Modal === "undefined" || !Modal.open) { qs("#firstName") && qs("#firstName").focus(); return; }
    const content = Modal.open(html, { label: "Notify me", size: "s" });
    const form = qs("#notifyForm", content || document), input = qs("#notifyName", content || document), err = qs("#notifyErr", content || document);
    if (!form) return;
    setTimeout(() => input && input.focus({ preventScroll: true }), 120);
    form.addEventListener("submit", e => {
      e.preventDefault();
      const nm = input.value.trim().replace(/\s+/g, " ").slice(0, 40);
      if (!nm) { err.textContent = "Add your name so we know who’s asking."; input.setAttribute("aria-invalid", "true"); input.focus(); return; }
      window.open(wa(`Hi ${S.name}! I'm ${nm}. Please message me when Drop ${no}${name ? " — " + name : ""} goes live.`), "_blank", "noopener");
      Modal.close();
      toastMsg("Opening WhatsApp — just hit send.", { type: "success" });
    });
    input.addEventListener("input", () => { if (input.value.trim()) { err.textContent = ""; input.removeAttribute("aria-invalid"); } });
  }

  function initHero() {
    const hero = qs("#hero"); if (!hero) return;
    const d = drop(), no = dropNo(), name = dropName();
    qs("[data-hero-kicker]", hero).textContent = `Drop ${no}`;
    qs("[data-hero-title]", hero).textContent = name || `Drop ${no}`;
    const allGone = N && DROP.every(p => (p.stock | 0) <= 0);
    const line = qs("[data-hero-line]", hero), ctas = qs("#heroCtas");
    if (N) line.textContent = `${numWord(N)} heavyweight ${noun}, printed by hand in small runs.`;

    if (!d.live) {
      hero.classList.add("is-soon");
      line.textContent = N ? `${numWord(N)} heavyweight ${noun}, printed by hand. Buying opens at launch.` : "Buying opens at launch.";
      runCountdown(d.launch);
      ctas.innerHTML = `<button class="btn hm-btn" type="button" data-notify>Notify me</button>
        <a class="btn btn-outline hm-btn hm-btn-ghost" href="shop.html">Preview the drop</a>`;
    } else if (allGone) {
      line.textContent = "All sold out — thank you. The next drop is on its way.";
      ctas.innerHTML = `<a class="btn hm-btn" href="#first">Be first for Drop ${nextNo()}</a>`;
    }
    hero.addEventListener("click", e => { if (e.target.closest("[data-notify]")) openNotify(); });

    renderHeroMedia();
    const onMq = () => renderHeroMedia();
    if (MOBILE.addEventListener) MOBILE.addEventListener("change", onMq); else if (MOBILE.addListener) MOBILE.addListener(onMq);
  }

  /* ======================================================
     DROP ROW
     ====================================================== */
  function initDrop() {
    const sec = qs("#drop"), rail = qs("#dropRail"); if (!rail) return;
    if (!N) { sec.hidden = true; return; }
    qs("[data-drop-title]", sec).textContent = `Drop ${dropNo()}${dropName() ? " — " + dropName() : ""}`;
    rail.style.setProperty("--n", Math.min(N, 5));
    rail.classList.toggle("is-fit", N <= 5);
    rail.innerHTML = DROP.map(p => `<div class="hm-cell" role="listitem">${card(p)}</div>`).join("");
  }

  /* ======================================================
     CAMPAIGN BANNER
     ====================================================== */
  function renderBanner() {
    const box = qs("#bannerMedia"); if (!box) return;
    const m = MOBILE.matches;
    mount(box, campaign("banner", { scene: "flatlay", ratio: m ? "4:5" : "21:9", alt: `${S.name} — the drop, laid out` }));
  }
  function initBanner() {
    renderBanner();
    const onMq = () => renderBanner();
    if (MOBILE.addEventListener) MOBILE.addEventListener("change", onMq);
  }

  /* ======================================================
     THREE TILES — craft (one category) or categories (two+)
     ====================================================== */
  const TECH_ORDER = ["Screen print", "Hand embroidery", "Hand painted", "Puff print", "Block print", "Embroidery", "Applique"];
  const TECH_LABEL = {
    "screen print": "Screen printed", "hand embroidery": "Hand embroidered", "embroidery": "Embroidered",
    "hand painted": "Hand painted", "puff print": "Puff printed", "block print": "Block printed", "applique": "Appliqué"
  };
  function tileImage(p, used) {
    used.add(p.id);
    if (p.images && p.images.length) return `<img src="${E(p.images[0])}" alt="" loading="lazy" decoding="async">`;
    if (hasArt && typeof Art.campaign === "function") { try { const s = Art.campaign("single:" + p.id, { ratio: "3:4" }); if (s) return s; } catch { /* fall through */ } }
    return garment(p, "back");
  }
  const pickFor = (list, used) => list.find(p => !used.has(p.id)) || list[0];

  function initTiles() {
    const sec = qs("#tiles"), grid = qs("#tileGrid"); if (!grid) return;
    const used = new Set();
    const cats = liveCats();
    let tiles = [];
    if (cats.length > 1) {
      qs("[data-tiles-title]", sec).textContent = "Shop by category";
      const ranked = cats.map(c => ({ c, list: ALL.filter(p => p.category === c.id) }))
        .sort((a, b) => b.list.length - a.list.length).slice(0, 3);
      tiles = ranked.map(({ c, list }) => {
        const p = pickFor(list, used);
        return { label: c.name, sub: `${list.length} ${list.length === 1 ? "style" : "styles"}`, href: `shop.html?cat=${encodeURIComponent(c.id)}`, art: tileImage(p, used) };
      });
    } else {
      const counts = new Map();
      ALL.forEach(p => (p.techniques || []).forEach(t => counts.set(t, (counts.get(t) || 0) + 1)));
      const rank = t => { const i = TECH_ORDER.findIndex(x => x.toLowerCase() === t.toLowerCase()); return i < 0 ? 99 : i; };
      const techs = [...counts.keys()].sort((a, b) => rank(a) - rank(b) || counts.get(b) - counts.get(a)).slice(0, 3);
      // give the rarest technique first pick so every tile shows a different tee
      const byRarity = techs.slice().sort((a, b) => counts.get(a) - counts.get(b));
      const art = {};
      byRarity.forEach(t => { const p = pickFor(ALL.filter(x => (x.techniques || []).includes(t)), used); art[t] = tileImage(p, used); });
      tiles = techs.map(t => ({
        label: TECH_LABEL[t.toLowerCase()] || t,
        sub: `${counts.get(t)} ${counts.get(t) === 1 ? "style" : "styles"}`,
        href: `shop.html?tech=${encodeURIComponent(t)}`, art: art[t]
      }));
    }
    if (!tiles.length) { sec.hidden = true; return; }
    grid.style.setProperty("--n", tiles.length);
    grid.innerHTML = tiles.map(t => `<a class="hm-tile" href="${t.href}">
        <span class="hm-tile-media" aria-hidden="true">${t.art}</span>
        <span class="hm-tile-cap"><span class="hm-tile-name">${E(t.label)}</span><span class="hm-tile-sub">${E(t.sub)}</span></span>
      </a>`).join("");
    qsa(".hm-tile-media", grid).forEach(m => { const s = qs(":scope > svg", m); if (s) { s.setAttribute("preserveAspectRatio", "xMidYMid slice"); s.setAttribute("width", "100%"); s.setAttribute("height", "100%"); } });
  }

  /* ======================================================
     BEST SELLERS — carousel
     ====================================================== */
  function initBest() {
    const sec = qs("#best"), rail = qs("#bestRail"); if (!rail) return;
    const best = ALL.filter(p => tags(p).includes("bestseller"));
    const sold = p => p.edition > 0 ? 1 - (p.stock | 0) / p.edition : 0;
    // fewer than four tagged? fill the row with the rest of the range, most-sold first
    const list = best.length >= 4 ? best : best.concat(ALL.filter(p => !best.includes(p)).sort((a, b) => sold(b) - sold(a)));
    if (!list.length) { sec.hidden = true; return; }
    if (best.length < 4) { const l = qs("[data-best-link]", sec); if (l) l.href = "shop.html"; }
    rail.innerHTML = list.map(p => `<div class="hm-cell" role="listitem">${card(p)}</div>`).join("");
    bindArrows(rail, qs('[data-arrows="bestRail"]', sec));
  }
  function bindArrows(rail, box) {
    if (!box) return;
    const [prev, next] = qsa(".hm-arrow", box);
    const step = () => { const c = qs(".hm-cell", rail); return c ? c.getBoundingClientRect().width + parseFloat(getComputedStyle(rail).columnGap || 0) : rail.clientWidth; };
    const update = () => {
      const max = rail.scrollWidth - rail.clientWidth - 2;
      box.hidden = max <= 2;
      prev.disabled = rail.scrollLeft <= 2; next.disabled = rail.scrollLeft >= max;
    };
    prev.addEventListener("click", () => rail.scrollBy({ left: -step(), behavior: RM ? "auto" : "smooth" }));
    next.addEventListener("click", () => rail.scrollBy({ left: step(), behavior: RM ? "auto" : "smooth" }));
    rail.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
    addEventListener("resize", update);
    update();
  }

  /* ======================================================
     WORN BY YOU / INSTAGRAM
     ====================================================== */
  function initWorn() {
    const sec = qs("#worn"), cta = qs("#igCta"), rail = qs("#wornRail");
    const ig = S.instagram || "https://instagram.com/", handle = igHandle();
    qsa("[data-ig-link]").forEach(a => { a.href = ig; });
    qsa("[data-ig-handle]").forEach(b => { b.textContent = handle; });
    const tag = qs("#worn [data-ig-link]"); if (tag) tag.textContent = `Tag ${handle}`;
    const items = (Array.isArray(S.community) ? S.community : []).filter(c => c && c.image);
    if (!items.length) { sec.remove(); cta.hidden = false; return; }
    cta.remove(); sec.hidden = false;
    rail.innerHTML = items.map(c => {
      const p = ALL.find(x => x.id === c.product);
      return `<figure class="hm-cell hm-worn-card" role="listitem">
        <span class="hm-worn-media"><img src="${E(c.image)}" alt="${E((c.name || "A customer") + (p ? " wearing the " + title(p) : " wearing " + S.name))}" loading="lazy" decoding="async"></span>
        <figcaption><span class="hm-worn-name">${E(c.name || "")}</span>${p ? `<a class="hm-worn-prod" href="${link(p)}">${E(title(p))}</a>` : ""}</figcaption>
      </figure>`;
    }).join("");
  }

  /* ======================================================
     STORY + FIRST ACCESS
     ====================================================== */
  function initStory() {
    mount(qs("#storyMedia"), campaign("story", { scene: "macro", ratio: "4:5", alt: "Close-up of a hand-pulled print on heavyweight cotton" }), { alt: "Close-up of a hand-pulled print on heavyweight cotton" });
    const runs = ALL.map(p => +p.edition).filter(n => n > 0);
    const el = qs("[data-story-runs]");
    if (el && runs.length) {
      const lo = Math.min(...runs), hi = Math.max(...runs);
      const hand = ALL.some(p => (p.techniques || []).some(t => /embroider|paint/i.test(t)));
      el.textContent = `Each print is pulled by hand, one screen and one colour at a time${hand ? ", and some are finished with a needle or a brush" : ""}. Every design is made in a numbered run of ${lo === hi ? lo : `${lo} to ${hi}`} pieces — when it’s gone, it’s gone.`;
    }
  }

  function initFirst() {
    mount(qs("#newsMedia"), campaign("newsletter", { scene: "stack", ratio: "4:5", alt: "A folded stack of BHAKSHI tees" }), { alt: "A folded stack of BHAKSHI tees" });
    const form = qs("#firstForm"); if (!form) return;
    const d = drop(), no = dropNo();
    const target = d.live ? nextNo() : no;
    qs("[data-first-title]").textContent = `Be first for Drop ${target}`;
    if (!d.live) qs("[data-first-line]").textContent = `One WhatsApp message the minute Drop ${no} goes live. No spam, no group chats.`;
    const input = qs("#firstName"), err = qs("#firstErr");
    form.addEventListener("submit", e => {
      e.preventDefault();
      const name = input.value.trim().replace(/\s+/g, " ").slice(0, 40);
      if (!name) { err.textContent = "Add your name so we know who’s asking."; input.focus(); input.setAttribute("aria-invalid", "true"); return; }
      err.textContent = ""; input.removeAttribute("aria-invalid");
      window.open(wa(`Hi ${S.name}! I'm ${name}. Please put me on the first-access list for Drop ${target}.`), "_blank", "noopener");
      toastMsg("Opening WhatsApp — just hit send.", { type: "success" });
    });
    input.addEventListener("input", () => { if (input.value.trim()) { err.textContent = ""; input.removeAttribute("aria-invalid"); } });
  }

  /* ======================================================
     MIX & MATCH — "Build your look".
     FEATURE FLAG: rendered only when mixMatchOn() is true
     (STORE.features.mixAndMatch === true AND at least one bottom exists in PRODUCTS).
     Otherwise the <template> in index.html is never cloned, so nothing appears.
     ====================================================== */
  const TOP_CATS = ["tshirts", "shirts", "polos", "kurtas", "hoodies", "jackets"];
  const BOTTOM_CATS = ["jeans", "trousers", "joggers", "shorts"];
  function initStudio() {
    const mnt = qs("#studioMount"), tpl = qs("#tpl-studio");
    if (!mnt || !tpl) return;
    const tops = ALL.filter(p => TOP_CATS.includes(p.category) && p.stock > 0);
    const bottoms = ALL.filter(p => (BOTTOM_CATS.includes(p.category) || groupOf(p) === "Bottoms") && p.stock > 0);
    if (!mixOn() || !tops.length || !bottoms.length) { mnt.remove(); return; } // flag off → nothing on the page
    mnt.replaceWith(tpl.content.cloneNode(true));
    const root = qs("#studio");
    const outfit = (t, b) => (hasArt && typeof Art.outfit === "function") ? Art.outfit(t, b) : garment(t);
    const St = { top: { list: tops, i: 0, size: null }, bottom: { list: bottoms, i: 0, size: null } };
    const stageArt = qs("#stageArt"), stageNo = qs("#stageNo"), err = qs("#sizeErr");
    const picks = { top: qs('.hm-mm[data-part="top"]', root), bottom: qs('.hm-mm[data-part="bottom"]', root) };
    const cur = part => St[part].list[St[part].i];

    ["top", "bottom"].forEach(part => {
      const box = qs("[data-thumbs]", picks[part]);
      box.innerHTML = St[part].list.map((p, i) =>
        `<button class="hm-thumb" type="button" role="option" data-i="${i}" aria-selected="false" aria-label="${E(p.name)}">${garment(p)}</button>`).join("");
      box.addEventListener("click", e => { const b = e.target.closest(".hm-thumb"); if (b) set(part, +b.dataset.i); });
    });
    root.addEventListener("click", e => {
      const s = e.target.closest(".hm-mm-size"); if (!s) return;
      const part = s.closest(".hm-mm").dataset.part;
      St[part].size = s.dataset.size; renderSizes(part);
      if (St.top.size && St.bottom.size) err.textContent = "";
    });
    function renderSizes(part) {
      const p = cur(part);
      qs("[data-sizes]", picks[part]).innerHTML = p.sizes.map(sz =>
        `<button class="hm-mm-size" type="button" role="radio" data-size="${E(sz)}" aria-checked="${St[part].size === sz}">${E(sz)}</button>`).join("");
    }
    function renderInfo(part) {
      const p = cur(part), el = picks[part];
      const nm = qs("[data-name]", el); nm.textContent = title(p); nm.href = link(p);
      qs("[data-color]", el).textContent = p.colorName || "";
      qs("[data-price]", el).innerHTML = `${money(p.price)}${p.mrp > p.price ? ` <s>${money(p.mrp)}</s>` : ""}`;
      qs("[data-count]", el).textContent = `${pad(St[part].i + 1)} / ${pad(St[part].list.length)}`;
      qsa(".hm-thumb", el).forEach((b, i) => { b.setAttribute("aria-selected", i === St[part].i); b.classList.toggle("is-on", i === St[part].i); });
      if (St[part].size && !p.sizes.includes(St[part].size)) St[part].size = null;
      renderSizes(part);
    }
    function renderStage() {
      const t = cur("top"), b = cur("bottom");
      stageArt.innerHTML = `<div class="hm-stage-layer" role="img" aria-label="Outfit: ${E(t.name)} with ${E(b.name)}">${outfit(t, b)}</div>`;
      stageNo.textContent = `Look ${pad(St.top.i + 1)} · ${pad(St.bottom.i + 1)}`;
      const price = t.price + b.price, mrp = t.mrp + b.mrp;
      qs("#lookTotal").textContent = money(price);
      qs("#lookMrp").textContent = mrp > price ? money(mrp) : "";
      const msg = `Putting this look together from ${S.name}:\n\nTop: ${t.name} (${money(t.price)})\n${absUrl(link(t))}\n\nBottom: ${b.name} (${money(b.price)})\n${absUrl(link(b))}\n\nTogether: ${money(price)}. What do you think?`;
      qs("#shareLook").href = "https://wa.me/?text=" + encodeURIComponent(msg);
    }
    function set(part, i) { const n = St[part].list.length; St[part].i = (i + n) % n; renderInfo(part); renderStage(); }
    qsa(".hm-arrow[data-part]", root).forEach(b => b.addEventListener("click", () => set(b.dataset.part, St[b.dataset.part].i + +b.dataset.dir)));
    qs("#shuffleLook").addEventListener("click", () => {
      St.top.i = Math.floor(Math.random() * tops.length); St.bottom.i = Math.floor(Math.random() * bottoms.length);
      renderInfo("top"); renderInfo("bottom"); renderStage();
    });
    qs("#addLook").addEventListener("click", () => {
      const missing = ["top", "bottom"].filter(p => !St[p].size);
      if (missing.length) { err.textContent = missing.length === 2 ? "Pick a size for the top and the bottom." : `Pick a size for the ${missing[0]}.`; return; }
      if (typeof Cart === "undefined") return;
      const t = cur("top"), b = cur("bottom");
      const ok1 = Cart.add(t.id, St.top.size, 1), ok2 = Cart.add(b.id, St.bottom.size, 1);
      if (!ok1 && !ok2) return;
      if (typeof flyToCart === "function") { try { flyToCart(stageArt); } catch { /* optional */ } }
      toastMsg(`Look added: ${title(t)} (${St.top.size}) + ${title(b)} (${St.bottom.size})`, { type: "success" });
    });
    renderInfo("top"); renderInfo("bottom"); renderStage();
  }

  /* ======================================================
     Restrained fade-up reveals (home blocks only)
     ====================================================== */
  function initReveal() {
    const els = qsa(".hm-head, #dropRail .hm-cell, .hm-banner-cap, .hm-tile, #bestRail .hm-cell, .hm-worn-card, .hm-ig-in, .hm-split-in, .hm-split-media, .hm-studio-grid");
    els.forEach(el => el.classList.add("hm-rv"));
    if (RM || !("IntersectionObserver" in window)) { els.forEach(el => el.classList.add("is-in")); return; }
    document.documentElement.classList.add("hm-js");
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target, sib = el.parentElement ? [...el.parentElement.children].filter(c => c.classList.contains("hm-rv")) : [];
      el.style.transitionDelay = Math.min(Math.max(0, sib.indexOf(el)), 5) * 70 + "ms";
      el.classList.add("is-in"); io.unobserve(el);
      setTimeout(() => { el.style.transitionDelay = ""; }, 1500);
    }), { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    els.forEach(el => io.observe(el));
  }

  /* ======================================================
     SEO — JSON-LD from STORE
     ====================================================== */
  function injectLD() {
    const prices = ALL.map(p => +p.price).filter(Boolean);
    const home = "https://bhakshi-clothing.github.io/bhakshi/";
    const inr = n => "₹" + Number(n).toLocaleString("en-IN");
    const store = {
      "@context": "https://schema.org", "@type": "ClothingStore",
      name: S.name, url: home,
      description: `${S.tagline || "Printed by hand. Made in India."} Heavyweight oversized graphic tees made in small numbered runs${dropName() ? ` — Drop ${dropNo()} “${dropName()}”` : ""}.`,
      image: home + "images/og.png", logo: home + "images/favicon.svg",
      email: S.email || undefined,
      telephone: S.whatsapp ? "+" + String(S.whatsapp).replace(/\D/g, "") : undefined,
      priceRange: prices.length ? `${inr(Math.min(...prices))}–${inr(Math.max(...prices))}` : undefined,
      currenciesAccepted: "INR",
      paymentAccepted: S.codFee === -1 ? "UPI" : "UPI, Cash on Delivery",
      address: { "@type": "PostalAddress", addressCountry: "IN", addressLocality: S.city || "India" },
      areaServed: { "@type": "Country", name: "India" },
      sameAs: [S.instagram].filter(u => u && !/instagram\.com\/?$/.test(u)),
      hasOfferCatalog: {
        "@type": "OfferCatalog", name: dropName() ? `Drop ${dropNo()} — ${dropName()}` : "Catalogue",
        itemListElement: DROP.map(p => ({
          "@type": "Offer", priceCurrency: "INR", price: p.price, url: absUrl(link(p)),
          availability: (p.stock | 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
          itemOffered: { "@type": "Product", name: title(p), color: p.colorName || undefined, material: p.fabric || undefined }
        }))
      }
    };
    const s = document.createElement("script"); s.type = "application/ld+json";
    s.textContent = JSON.stringify(store); document.head.appendChild(s);
  }

  /* ---------- boot ---------- */
  function boot() {
    const steps = [initQuick, initHero, initDrop, initBanner, initTiles, initBest, initWorn, initStory, initStudio, initFirst, injectLD, initReveal];
    steps.forEach(fn => { try { fn(); } catch (err) { console.error("[home] " + fn.name, err); } });
    if (typeof refreshReveal === "function") { try { refreshReveal(); } catch { /* shell optional */ } } // also starts card countdowns
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
