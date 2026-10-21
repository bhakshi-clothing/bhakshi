/* =========================================================
   BHAKSHI — Home page (index.html). Owner: Home agent.  v3.1 "The Club Edit".
   Quick links · campaign hero (+ countdown / notify) · the edit · shop by style ·
   shop the look (hotspots) · the details · why BHAKSHI · story · best sellers ·
   fit band · worn by you / Instagram · FAQ · mix & match (feature-flagged <template>) ·
   first access · JSON-LD (store + FAQ).
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
  const moneyShort = n => "Rs. " + Number(n || 0).toLocaleString("en-IN");
  const pad = n => String(Math.max(0, Math.floor(+n || 0))).padStart(2, "0");
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const title = p => String(p.name).split(" — ")[0];
  const link = p => `product.html?id=${encodeURIComponent(p.id)}`;
  const absUrl = rel => { try { return new URL(rel, location.href).href; } catch { return rel; } };
  const toastMsg = (m, o) => { if (typeof toast === "function") toast(m, o); };
  const hasArt = typeof Art !== "undefined" && Art && typeof Art.campaign === "function";
  const dropNo = () => (S.drop && S.drop.number) || "01";
  const dropName = () => (S.drop && S.drop.name) || "";
  const nextNo = () => pad((parseInt(dropNo(), 10) || 1) + 1);
  const groupOf = p => (CATS.find(c => c.id === p.category) || {}).group || "";
  const tags = p => p.tags || [];
  const sty = p => p.style || {};
  const listWords = a => a.length < 2 ? (a[0] || "") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const onMobileChange = fn => { if (MOBILE.addEventListener) MOBILE.addEventListener("change", fn); else if (MOBILE.addListener) MOBILE.addListener(fn); };

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
  const buyable = p => {
    if (typeof isBuyable === "function") { try { return !!isBuyable(p); } catch { /* fall through */ } }
    return drop().live && (p.stock | 0) > 0;
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

  /* ---------- fabric facts, read from the product data (never invented) ---------- */
  const gsmOf = p => { const m = String(p.fabric || "").match(/(\d{3})\s*GSM/i); return m ? +m[1] : 0; };
  const range = (nums, sep = "–") => { const a = nums.filter(n => n > 0); if (!a.length) return ""; const lo = Math.min(...a), hi = Math.max(...a); return lo === hi ? String(lo) : `${lo}${sep}${hi}`; };
  const KNIT_WORDS = [["piqu", "piqué"], ["waffle", "waffle"], ["rib", "rib"], ["jersey", "jersey"]];
  const knitsOf = list => KNIT_WORDS.filter(([k]) => list.some(p => new RegExp(k, "i").test((p.fabric || "") + " " + (sty(p).knit || "")))).map(([, w]) => w);

  /* ---------- imagery ---------- */
  function garment(p, view = "front") {
    const imgs = p.images || [];
    const src = view === "back" ? (imgs[1] || imgs[0]) : imgs[0];
    if (src) return `<img src="${E(src)}" alt="${E(title(p))}" loading="lazy" decoding="async">`;
    if (typeof productImage === "function") { try { return productImage(p, view === "detail" ? 2 : 0, view); } catch { /* fall through */ } }
    if (hasArt && typeof Art.garment === "function") { try { return Art.garment(p, { view }); } catch (e) { console.warn("[home] Art.garment", e); } }
    return `<span class="hm-noart" style="background:${E(p.color)}"></span>`;
  }

  /* Used only if neither campaignImage() nor Art.campaign() exist: a calm row of the pieces. */
  function fallbackScene(scene, ratio) {
    const id = /^(single|look|detail):/.test(scene || "") ? scene.split(":")[1] : "";
    const list = id ? ALL.filter(p => p.id === id) : ALL.slice(0, scene === "macro" ? 1 : 5);
    return `<div class="hm-fallback" data-ratio="${E(ratio)}">${list.map(p => `<span>${garment(p, scene === "macro" ? "detail" : "front")}</span>`).join("")}</div>`;
  }

  /* Does Art know this scene yet? Unknown scenes come back as the default flat-lay,
     so compare labels (or use Art.SCENES if the Art agent publishes one). */
  let flatLabel;
  const labelOf = svg => (String(svg).match(/aria-label="([^"]*)"/) || [])[1] || "";
  function artScene(name, ratio) {
    if (!hasArt) return "";
    try {
      const base = String(name).split(":")[0], known = Art.SCENES || Art.scenes;
      if (Array.isArray(known) && !known.some(s => String(s).split(":")[0] === base)) return "";
      const svg = String(Art.campaign(name, { ratio }) || "");
      if (!svg) return "";
      if (!Array.isArray(known) && base !== "flatlay") {
        if (flatLabel === undefined) flatLabel = labelOf(Art.campaign("flatlay", { ratio: "1:1" }));
        if (flatLabel && labelOf(svg) === flatLabel) return "";
      }
      return svg;
    } catch (e) { console.warn("[home] Art.campaign " + name, e); return ""; }
  }

  /* Big campaign image: owner photo for the slot, else the drawn Art.campaign scene. */
  function campaign(slot, opts) {
    const o = Object.assign({ scene: "flatlay", ratio: "16:9", alt: "" }, opts);
    let html = "";
    if (slot && typeof campaignImage === "function") { try { html = campaignImage(slot, o) || ""; } catch (e) { console.warn("[home] campaignImage", e); } }
    if (!html && slot && C[slot]) html = `<img src="${E(C[slot])}" alt="${E(o.alt)}" loading="lazy" decoding="async">`;
    if (!html && hasArt) { try { html = Art.campaign(o.scene, { ratio: o.ratio }) || ""; } catch (e) { console.warn("[home] Art.campaign", e); } }
    if (!html) html = fallbackScene(o.scene, o.ratio);
    return html;
  }
  /* Make an inlined SVG cover its box and carry the right label. */
  function fitSvg(el, alt) {
    const svg = el && (el.firstElementChild && el.firstElementChild.tagName.toLowerCase() === "svg" ? el.firstElementChild : qs(":scope > svg, :scope > * > svg", el));
    if (!svg) return;
    svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
    svg.setAttribute("width", "100%"); svg.setAttribute("height", "100%");
    if (alt) { svg.setAttribute("role", "img"); svg.setAttribute("aria-label", alt); }
    else if (alt === "") { svg.removeAttribute("role"); svg.removeAttribute("aria-label"); svg.setAttribute("aria-hidden", "true"); }
  }
  /* Fill a box with a campaign image and make it cover the box at any aspect ratio. */
  function mount(el, html, { alt = "", eager = false } = {}) {
    if (!el) return;
    el.innerHTML = html;
    const img = qs("img", el);
    if (img) {
      if (alt && !img.getAttribute("alt")) img.alt = alt;
      if (eager) { img.loading = "eager"; img.setAttribute("fetchpriority", "high"); }
      el.dataset.kind = "photo";
    } else {
      el.dataset.kind = "art";
      fitSvg(el, alt || "");
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
  const COLLARED = ["polo", "rugby", "knitpolo"];
  const collared = DROP.length && DROP.every(p => COLLARED.includes(p.shape));
  const noun = collared ? "collared classics" : DROP.every(p => p.shape === "tee") ? "tees" : "pieces";
  const numWord = n => ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"][n] || String(n);
  const runs = () => range(ALL.map(p => +p.edition), " to ");

  /* style families — used by "Shop by style"; same tests as the Shop page's look= filter (js/shop.js) */
  const LOOKS = [
    { id: "stripes", label: "Rugby stripes", line: "Yarn-dyed bands and pinstripes",
      test: p => !!sty(p).stripes, score: p => (sty(p).stripes || {}).width || 0 },
    { id: "script", label: "Script polos", line: "Raised and embroidered lettering",
      test: p => (sty(p).graphic || {}).kind === "script", score: p => (sty(p).graphic || {}).size === "large" ? 2 : 1 },
    { id: "knit", label: "Knits", line: "Waffle and rib, made for cooler days",
      test: p => p.shape === "knitpolo" || ["rib", "waffle"].includes(sty(p).knit),
      score: p => (p.shape === "knitpolo" ? 2 : 0) + (sty(p).sleeve === "long" ? 1 : 0) }
  ];

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
    // owner photo: full-bleed with the copy over it (tone sampled).
    // drawn scene: the copy sits in a clean band under the image, so it never fights the artwork.
    const ratio = m ? (photo || drop().live ? "4:5" : "1:1") : photo ? "16:9" : "21:9";
    mount(box, campaign(slot, { scene: m ? "flatlay" : "rail", ratio, alt, eager: true }), { alt, eager: true });
    hero.dataset.kind = box.dataset.kind;
    hero.dataset.tone = "dark";
    const below = !photo && box.dataset.kind !== "photo";
    hero.classList.toggle("is-below", below);
    if (below) return;
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

  function heroLine() {
    if (!N) return "Collared classics, made in small runs in India.";
    if (collared) {
      const kinds = [];
      if (DROP.some(p => /piqu/i.test(p.fabric || "") || sty(p).knit === "pique")) kinds.push("piqué polos");
      if (DROP.some(LOOKS[0].test)) kinds.push("rugby stripes");
      if (DROP.some(LOOKS[2].test)) kinds.push("knits");
      return `${numWord(N)} collared classics${kinds.length ? " — " + listWords(kinds) : ""}, made in small runs.`;
    }
    return `${numWord(N)} ${noun}, made in small runs in India.`;
  }

  function initHero() {
    const hero = qs("#hero"); if (!hero) return;
    const d = drop(), no = dropNo(), name = dropName();
    qs("[data-hero-kicker]", hero).textContent = `Drop ${no}`;
    qs("[data-hero-title]", hero).textContent = name || `Drop ${no}`;
    const allGone = N && DROP.every(p => (p.stock | 0) <= 0);
    const line = qs("[data-hero-line]", hero), ctas = qs("#heroCtas");
    line.textContent = heroLine();
    const shop = qs("[data-hero-shop]", hero); if (shop) shop.href = "shop.html";

    if (!d.live) {
      hero.classList.add("is-soon");
      line.textContent = `${heroLine().replace(/\.$/, "")}. Buying opens at launch.`;
      runCountdown(d.launch);
      ctas.innerHTML = `<button class="btn hm-btn" type="button" data-notify>Notify me</button>
        <a class="btn btn-outline hm-btn hm-btn-ghost" href="shop.html">Preview the edit</a>`;
    } else if (allGone) {
      line.textContent = "All sold out — thank you. The next drop is on its way.";
      ctas.innerHTML = `<a class="btn hm-btn" href="#first">Be first for Drop ${nextNo()}</a>`;
    }
    hero.addEventListener("click", e => { if (e.target.closest("[data-notify]")) openNotify(); });

    renderHeroMedia();
    onMobileChange(renderHeroMedia);
  }

  /* ======================================================
     THE CLUB EDIT — the drop row
     ====================================================== */
  function initEdit() {
    const sec = qs("#edit"), rail = qs("#editRail"); if (!rail) return;
    if (!N) { sec.hidden = true; return; }
    qs("[data-edit-title]", sec).textContent = dropName() || `Drop ${dropNo()}`;
    qs("[data-edit-kicker]", sec).textContent = `Drop ${dropNo()} · ${plural(N, "style")}`;
    const r = runs();
    qs("[data-edit-note]", sec).textContent = r ? `${r} pieces a style. No restocks.` : "Small runs. No restocks.";
    rail.style.setProperty("--n", N);
    rail.classList.toggle("is-six", N === 6);
    rail.classList.toggle("is-fit", N <= 6);
    rail.innerHTML = DROP.map(p => `<div class="hm-cell" role="listitem">${card(p)}</div>`).join("");
  }

  /* ======================================================
     SHOP BY STYLE — stripes / script / knits, or categories once there are 2+
     ====================================================== */
  function tileImage(p, used, ratio = "3:4") {
    used.add(p.id);
    if (p.images && p.images.length) return `<img src="${E(p.images[0])}" alt="" loading="lazy" decoding="async">`;
    const s = artScene("single:" + p.id, ratio); if (s) return s;
    return garment(p, "front");
  }
  const pickFor = (list, used, score) => {
    const ranked = score ? list.slice().sort((a, b) => score(b) - score(a)) : list;
    return ranked.find(p => !used.has(p.id)) || ranked[0];
  };
  const USED = new Set(); // products already shown big (tiles) — looks try to show others

  function initStyles() {
    const sec = qs("#styles"), grid = qs("#tileGrid"); if (!grid) return;
    const cats = liveCats();
    let tiles = [];
    if (cats.length > 1) {
      qs("[data-styles-title]", sec).textContent = "Shop by category";
      const ranked = cats.map(c => ({ c, list: ALL.filter(p => p.category === c.id) }))
        .sort((a, b) => b.list.length - a.list.length).slice(0, 3);
      tiles = ranked.map(({ c, list }) => ({ label: c.name, line: "", n: list.length, href: `shop.html?cat=${encodeURIComponent(c.id)}`, art: tileImage(pickFor(list, USED), USED) }));
    } else {
      const groups = LOOKS.map(g => ({ g, list: ALL.filter(g.test) })).filter(x => x.list.length);
      // rarest family picks first so every tile shows a different piece
      const art = {};
      groups.slice().sort((a, b) => a.list.length - b.list.length).forEach(({ g, list }) => { art[g.id] = tileImage(pickFor(list, USED, g.score), USED); });
      tiles = groups.map(({ g, list }) => ({ label: g.label, line: g.line, n: list.length, href: `shop.html?look=${g.id}`, art: art[g.id] }));
    }
    if (!tiles.length) { sec.hidden = true; return; }
    grid.style.setProperty("--n", tiles.length);
    grid.innerHTML = tiles.map(t => `<a class="hm-tile" href="${t.href}">
        <span class="hm-tile-media" aria-hidden="true">${t.art}<span class="hm-tile-count">${E(plural(t.n, "style"))}</span></span>
        <span class="hm-tile-cap">
          <span class="hm-tile-text"><span class="hm-tile-name">${E(t.label)}</span>${t.line ? `<span class="hm-tile-sub">${E(t.line)}</span>` : ""}</span>
          <span class="hm-tile-go">Shop<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
        </span>
      </a>`).join("");
    qsa(".hm-tile-media", grid).forEach(m => fitSvg(m, ""));
  }

  /* ======================================================
     SHOP THE LOOK — styled flat-lays with one hotspot each
     ====================================================== */
  function hotspot(id, ratio, real) {
    let h = null;
    if (real && hasArt && typeof Art.lookHotspot === "function") { try { h = Art.lookHotspot(id, ratio); } catch (e) { console.warn("[home] lookHotspot", e); } }
    let x, y;
    if (Array.isArray(h)) [x, y] = h;
    else if (h && typeof h === "object") { x = h.x ?? h.left; y = h.y ?? h.top; }
    x = parseFloat(x); y = parseFloat(y);
    if (!isFinite(x) || !isFinite(y)) return { x: 50, y: 36 };
    if (x <= 1 && y <= 1) { x *= 100; y *= 100; }
    return { x: clamp(x, 8, 92), y: clamp(y, 8, 92) };
  }

  function initLooks() {
    const sec = qs("#looks"), grid = qs("#lookGrid"); if (!grid) return;
    const pool = DROP.filter(p => (p.stock | 0) > 0);
    const fresh = pool.filter(p => !USED.has(p.id));
    const picks = fresh.concat(pool.filter(p => USED.has(p.id))).slice(0, 3);
    if (!picks.length) { sec.hidden = true; return; }
    const ratio = "4:5";
    grid.innerHTML = picks.map((p, i) => {
      const photo = p.images && p.images[0];
      let art = artScene("look:" + p.id, ratio), real = !!art;
      if (!art) art = photo ? `<img src="${E(photo)}" alt="" loading="lazy" decoding="async">` : (artScene("single:" + p.id, ratio) || garment(p));
      const h = hotspot(p.id, ratio, real), id = `lookPop${i + 1}`, name = title(p), buy = buyable(p);
      // the scene's label names the props ("… styled with ecru trousers and white sneakers")
      const props = real ? ((labelOf(art).match(/styled with (.+)$/i) || [])[1] || "") : "";
      const withLine = props ? "Styled with: " + props.split(/\s+and\s+|,\s*/).join(", ") : "Wear it with light-wash denim and white sneakers";
      const off = p.mrp > p.price;
      return `<figure class="hm-look" role="listitem">
        <div class="hm-look-media" data-look="${E(p.id)}">
          <span class="hm-look-art" aria-hidden="true">${art}</span>
          <button class="hm-hot" type="button" style="left:${h.x}%;top:${h.y}%" data-x="${h.x}" data-y="${h.y}" aria-expanded="false" aria-controls="${id}" aria-label="Show the ${E(name)}"><span aria-hidden="true"></span></button>
          <div class="hm-pop" id="${id}" role="group" aria-label="${E(name)}" hidden>
            <a class="hm-pop-img" href="${link(p)}" tabindex="-1" aria-hidden="true">${garment(p)}</a>
            <div class="hm-pop-body">
              <a class="hm-pop-name" href="${link(p)}">${E(name)}</a>
              <span class="hm-pop-meta">${E(p.colorName || "")}</span>
              <span class="hm-pop-price">${money(p.price)}${off ? ` <s>${money(p.mrp)}</s>` : ""}</span>
              ${buy ? `<button class="hm-pop-add" type="button" data-quick="${E(p.id)}">Quick add</button>`
                    : `<a class="hm-pop-add" href="${link(p)}">View</a>`}
            </div>
            <button class="hm-pop-x" type="button" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
          </div>
        </div>
        <figcaption class="hm-look-cap">
          <span class="hm-look-no">Look ${pad(i + 1)}</span>
          <a class="hm-look-name" href="${link(p)}">${E(name)}</a>
          <span class="hm-look-with">${E(withLine)}</span>
          <span class="hm-look-avail">${buy ? "Polo available now" : (p.stock | 0) > 0 ? "Polo opens at launch" : "Polo sold out"} · ${money(p.price)}</span>
        </figcaption>
      </figure>`;
    }).join("");
    qsa(".hm-look-art", grid).forEach(m => fitSvg(m, ""));

    let open = null;
    const place = (btn, pop) => {
      const box = btn.parentElement, W = box.clientWidth, H = box.clientHeight;
      const x = +btn.dataset.x / 100 * W, y = +btn.dataset.y / 100 * H;
      const pw = Math.min(268, W - 24);
      pop.style.width = pw + "px";
      pop.style.left = clamp(x - pw / 2, 12, W - pw - 12) + "px";
      const ph = pop.offsetHeight || 120;
      const below = y + 28 + ph <= H - 12 || y < H / 2;
      pop.style.top = (below ? clamp(y + 28, 12, H - ph - 12) : clamp(y - 28 - ph, 12, H - ph - 12)) + "px";
      pop.classList.toggle("is-up", !below);
    };
    const close = (focus) => {
      if (!open) return;
      const { btn, pop } = open; open = null;
      btn.setAttribute("aria-expanded", "false"); pop.hidden = true;
      btn.closest(".hm-look").classList.remove("is-open");
      if (focus) btn.focus({ preventScroll: true });
    };
    const show = btn => {
      const pop = qs("#" + btn.getAttribute("aria-controls"));
      if (open && open.btn === btn) { close(true); return; }
      close();
      pop.hidden = false; btn.setAttribute("aria-expanded", "true");
      btn.closest(".hm-look").classList.add("is-open");
      place(btn, pop); open = { btn, pop };
    };
    grid.addEventListener("click", e => {
      const h = e.target.closest(".hm-hot"); if (h) { e.preventDefault(); show(h); return; }
      if (e.target.closest(".hm-pop-x")) { close(true); return; }
      if (e.target.closest("[data-quick]")) { setTimeout(() => close(), 0); return; }
      // a tap on the picture (not the card) toggles its hotspot too — easier on a phone
      const art = e.target.closest(".hm-look-art");
      if (art) { const b = qs(".hm-hot", art.parentElement); if (b) show(b); }
    });
    document.addEventListener("click", e => { if (open && !e.target.closest(".hm-look-media")) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && open) close(true); });
    addEventListener("resize", () => { if (open) place(open.btn, open.pop); });
    grid.addEventListener("scroll", () => close(), { passive: true });
  }

  /* ======================================================
     THE DETAILS — four close-ups
     ====================================================== */
  function initDetails() {
    const sec = qs("#details"), grid = qs("#detailGrid"); if (!grid) return;
    if (!ALL.length) { sec.hidden = true; return; }
    const knits = knitsOf(ALL).filter(k => k !== "jersey");
    const by = (fn, avoid) => ALL.filter(fn).find(p => !avoid.has(p.id)) || ALL.find(fn);
    const taken = new Set();
    const plan = [
      { part: "collar", t: "Collars that keep their shape", d: "Contrast and twill collars that sit flat, wash after wash.",
        f: p => /collar/i.test((p.techniques || []).join(" ")) && sty(p).sleeve === "long" },
      { part: "placket", t: "A neat two-button placket", d: "Stitched flat, with sleeves tipped in contrast.",
        f: p => (sty(p).tipping || []).length && sty(p).placket === "button" && !/puff/i.test((p.techniques || []).join(" ")) },
      { part: "knit", t: "Real knit texture", d: `${knits.length ? listWords(knits.map((k, i) => i ? k : k[0].toUpperCase() + k.slice(1))) : "Knit"} you can feel at your fingertips.`,
        f: p => /waffle|rib/i.test(sty(p).knit || "") },
      { part: "graphic", t: "Raised script", d: "Puff print and embroidery that sit up off the cloth.",
        f: p => (sty(p).graphic || {}).kind === "script" && /puff|embroider/i.test((p.techniques || []).join(" ")) }
    ];
    const items = plan.map(x => {
      const p = by(x.f, taken) || ALL.find(q => !taken.has(q.id)) || ALL[0];
      taken.add(p.id);
      const photo = p.images && p.images[2];
      const art = photo ? `<img src="${E(photo)}" alt="" loading="lazy" decoding="async">`
        : (artScene(`detail:${p.id}:${x.part}`, "1:1") || garment(p, "detail"));
      return { ...x, p, art };
    });
    grid.innerHTML = items.map((x, i) => `<figure class="hm-detail" role="listitem">
        <a class="hm-detail-media" href="${link(x.p)}" tabindex="-1" aria-hidden="true">${x.art}</a>
        <figcaption>
          <span class="hm-detail-no">${pad(i + 1)}</span>
          <span class="hm-detail-t">${E(x.t)}</span>
          <span class="hm-detail-d">${E(x.d)} <a href="${link(x.p)}" class="hm-detail-on">${E(title(x.p))}</a></span>
        </figcaption>
      </figure>`).join("");
    qsa(".hm-detail-media", grid).forEach(m => fitSvg(m, ""));
  }

  /* ======================================================
     WHY BHAKSHI — facts from the data + service line
     ====================================================== */
  function initWhy() {
    const g = range(ALL.map(gsmOf)), k = knitsOf(ALL);
    const gsm = qs("[data-why-gsm]");
    if (gsm && g) gsm.textContent = `${g} GSM ${k.length ? listWords(k) + " " : "cotton "}that keeps its shape.`;
    const r = runs(), el = qs("[data-why-runs]");
    if (el && r) el.textContent = `${r} pieces a style. When it’s gone, it’s gone.`;
    const svc = qs("[data-service]");
    if (svc) {
      const bits = [];
      if (S.freeShippingAbove > 0) bits.push(`Free shipping above ${moneyShort(S.freeShippingAbove)}`);
      if (S.codFee !== -1) bits.push("Cash on Delivery");
      bits.push("7-day size exchange");
      svc.innerHTML = bits.map(b => `<span>${E(b)}</span>`).join("");
    }
  }

  /* ======================================================
     BEST SELLERS — carousel
     ====================================================== */
  function initBest() {
    const sec = qs("#best"), rail = qs("#bestRail"); if (!rail) return;
    const best = ALL.filter(p => tags(p).includes("bestseller"));
    const sold = p => p.edition > 0 ? 1 - (p.stock | 0) / p.edition : 0;
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
     FIT BAND — copy follows the products' fit
     ====================================================== */
  function initFit() {
    const sec = qs("#fit"); if (!sec) return;
    const tops = ALL.filter(p => !["pants", "shorts"].includes(p.shape));
    if (!tops.length) { sec.hidden = true; return; }
    const over = tops.filter(p => /oversize/i.test(p.fit || "")).length > tops.length / 2;
    if (over) {
      qs("#fit-title").textContent = "Oversized on purpose.";
      qs(".hm-fit-lead", sec).textContent = "Take your usual size for the drape, or size down for a closer fit.";
    }
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
    const alt = "Close-up of cotton piqué and a contrast collar";
    mount(qs("#storyMedia"), campaign("story", { scene: "macro", ratio: "4:5", alt }), { alt });
    const specs = qs("[data-specs]"); if (!specs) return;
    const pq = ALL.filter(p => /piqu/i.test(p.fabric || "")), heavy = ALL.filter(p => !/piqu/i.test(p.fabric || ""));
    const rows = [];
    if (pq.length) { const g = range(pq.map(gsmOf)); rows.push(["Piqué polos", `${g ? g + " GSM · " : ""}breathable`]); }
    if (heavy.length) {
      const hi = Math.max(0, ...heavy.map(gsmOf));
      const kinds = [heavy.some(p => p.shape === "rugby" || /rugby/i.test(p.name)) && "Rugbys", heavy.some(p => /knit/i.test(p.fabric || "")) && "knits"].filter(Boolean);
      rows.push([kinds.length ? listWords(kinds).replace(/^r/, "R") : "Heavyweights", `${hi ? "Up to " + hi + " GSM · " : ""}cool-weather weight`]);
    }
    if (rows.length) specs.innerHTML = rows.map(([t, d]) => `<div><dt>${E(t)}</dt><dd>${E(d)}</dd></div>`).join("");
    else specs.remove();
  }

  function initFirst() {
    mount(qs("#newsMedia"), campaign("newsletter", { scene: "stack", ratio: "4:5", alt: "A folded stack of BHAKSHI polos" }), { alt: "A folded stack of BHAKSHI polos" });
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
     FAQ — answers follow STORE settings; also emitted as FAQPage JSON-LD
     ====================================================== */
  let FAQ = [];
  function initFAQ() {
    const list = qs("#faqList"); if (!list) return;
    const cod = S.codFee, free = S.freeShippingAbove, fee = S.shippingFee, r = runs();
    const pay = cod === -1 ? "UPI only for now — every order is prepaid, with no extra fee."
      : `UPI, or Cash on Delivery${cod > 0 ? ` (a ${moneyShort(cod)} COD fee applies)` : " at no extra cost"}. UPI payments never carry a fee.`;
    FAQ = [
      { q: "How do I place an order?",
        a: "Add your size to the bag and check out. Your order comes to us on WhatsApp with everything filled in — we confirm it with you there and dispatch within 1–2 business days." },
      { q: "How can I pay?", a: pay },
      { q: "How long does delivery take?",
        a: `3–7 business days across India, depending on your pincode.${free > 0 ? ` Shipping is free above ${moneyShort(free)}${fee > 0 ? `; below that it’s a flat ${moneyShort(fee)}` : ""}.` : ""} We send the tracking link on WhatsApp.` },
      { q: "Can I exchange my size?",
        a: "Yes — within 7 days of delivery, unworn and unwashed with the tags on. Because every style is a small run, the swap depends on stock.",
        html: ` <a href="policies.html#exchange">Exchange policy</a>` },
      { q: "How do the polos fit?",
        a: "Relaxed and true to size: easy through the chest, sitting at the hip. Between sizes? Size down for a neater line.",
        html: ` <button type="button" class="hm-inline-btn" data-fitfinder>Find my size</button>` },
      { q: "How should I care for piqué and knits?",
        a: "Wash cold and inside out with similar colours. Dry knits flat in the shade — a wet knit hung on a line stretches. Iron on low, never directly over a script or puff print." },
      { q: "Will a style come back?",
        a: `No. Each style is made once, in a small run${r ? ` of ${r} pieces` : ""}, and we don’t restock. Join the first-access list to hear about the next drop.`,
        html: ` <a href="#first">Join the list</a>` }
    ];
    list.innerHTML = FAQ.map((f, i) => `<details class="hm-q" id="faq-${i + 1}">
        <summary><span>${E(f.q)}</span><i class="hm-q-ico" aria-hidden="true"></i></summary>
        <div class="hm-q-a"><p>${E(f.a)}${f.html || ""}</p></div>
      </details>`).join("");
    // one open at a time keeps the list calm
    list.addEventListener("click", e => {
      const sm = e.target.closest("summary"); if (!sm) return;
      const d = sm.parentElement; if (d.open) return;
      qsa("details[open]", list).forEach(o => { if (o !== d) o.open = false; });
    });
    const help = qs("[data-faq-contact]");
    if (help && String(S.whatsapp || "").replace(/\D/g, "").length >= 10) {
      help.href = wa(`Hi ${S.name}! I have a question:`); help.target = "_blank"; help.rel = "noopener"; help.textContent = "Message us on WhatsApp";
    }
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
    const els = qsa([".hm-head", "#editRail .hm-cell", ".hm-tile", ".hm-look", ".hm-detail", ".hm-why-item", ".hm-service",
      "#bestRail .hm-cell", ".hm-fit-art", ".hm-fit-copy", ".hm-worn-card", ".hm-ig-in", ".hm-faq-a", ".hm-faq-list",
      ".hm-split-in", ".hm-split-media", ".hm-studio-grid"].join(","));
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
     SEO — JSON-LD from STORE (+ the FAQ)
     ====================================================== */
  function injectLD() {
    const prices = ALL.map(p => +p.price).filter(Boolean);
    const home = "https://bhakshi-clothing.github.io/bhakshi/";
    const inr = n => "₹" + Number(n).toLocaleString("en-IN");
    const store = {
      "@context": "https://schema.org", "@type": "ClothingStore",
      name: S.name, url: home,
      description: `${S.tagline || "Collared classics, made in India."} Cotton piqué polos, rugby shirts and knit polos with contrast collars, made in small runs${dropName() ? ` — Drop ${dropNo()} “${dropName()}”` : ""}.`,
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
    const add = obj => { const s = document.createElement("script"); s.type = "application/ld+json"; s.textContent = JSON.stringify(obj); document.head.appendChild(s); };
    add(store);
    if (FAQ.length) add({
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: FAQ.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } }))
    });
  }

  /* In-page links (#first …): render every section first so skipped (content-visibility) blocks
     can't shift the landing point. */
  function initJumps() {
    const main = qs("main.hm"); if (!main) return;
    main.addEventListener("click", e => {
      const a = e.target.closest('a[href^="#"]'); if (!a || a.getAttribute("href").length < 2) return;
      const t = document.getElementById(a.getAttribute("href").slice(1)); if (!t) return;
      e.preventDefault();
      main.classList.add("is-cv-off");
      requestAnimationFrame(() => {
        t.scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "start" });
        history.replaceState(null, "", "#" + t.id);
        const f = t.querySelector("input, button, a"); if (f && t.id === "first") setTimeout(() => f.focus({ preventScroll: true }), RM ? 0 : 600);
      });
    });
    if (location.hash && document.getElementById(location.hash.slice(1))) {
      main.classList.add("is-cv-off");
      requestAnimationFrame(() => { const t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); });
    }
  }

  /* ---------- boot ---------- */
  function boot() {
    const steps = [initQuick, initHero, initEdit, initStyles, initLooks, initDetails, initWhy, initStory, initBest, initFit,
      initWorn, initFAQ, initStudio, initFirst, injectLD, initReveal, initJumps];
    steps.forEach(fn => { try { fn(); } catch (err) { console.error("[home] " + fn.name, err); } });
    if (typeof refreshReveal === "function") { try { refreshReveal(); } catch { /* shell optional */ } } // also starts card countdowns
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
