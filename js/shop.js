/* BHAKSHI — shop / collection page (v3, minimal craft streetwear).
   One state object drives the page and is mirrored to the URL (history.replaceState), so every
   filtered / sorted / searched view is shareable:
     cat, group, tag, drop, q, look (stripes | script | knit), size, tech, instock (1 = in stock, 0 = sold out),
     min, max, sort, view, page
   Layout: category links (only when there are 2+ categories) · centred title + count · style chips
   (All · Rugby stripes · Script polos · Knits) · slim drop banner (default view only) · thin toolbar
   (Filters · count · view toggle · sort) · product grid (productCard) · "See more" past 16 pieces.
   Filters live in a right-hand drawer with a draft state and a live "View N items" button. */
(() => {
  "use strict";
  if (document.body.dataset.page !== "shop") return;

  const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const EASE = "cubic-bezier(.2,.7,.1,1)";

  /* ---------- contract helpers with safe fallbacks (app.js owns the real ones) ---------- */
  const LIVE_CATS = () => (typeof liveCategories === "function" ? liveCategories() : CATEGORIES.filter(c => PRODUCTS.some(p => p.category === c.id)));
  const BUY = p => (typeof isBuyable === "function" ? isBuyable(p) : p.stock > 0);
  const PRICE = n => (typeof rupee === "function" ? rupee(n) : "Rs. " + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const short = p => String(p.name).split(" — ")[0];
  const inStock = p => (p.stock | 0) > 0;
  const DROP = STORE.drop || { number: "01", name: "" };
  const DROP_TITLE = `Drop ${DROP.number}${DROP.name ? " — " + DROP.name : ""}`;

  /* ---------- copy ---------- */
  const TAGS = {
    new: "New in", bestseller: "Best sellers", sale: "Sale",
    office: "Office", casual: "Casual", athleisure: "Athleisure", festive: "Festive"
  };
  const LETTER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"];
  const SORTS = [
    ["featured", "Featured"],
    ["best", "Best selling"],
    ["az", "Alphabetically, A–Z"],
    ["za", "Alphabetically, Z–A"],
    ["price-asc", "Price, low to high"],
    ["price-desc", "Price, high to low"],
    ["new", "Newest"]
  ];
  const VIEWS = [
    ["grid", "Grid view", `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="1" y="1" width="6" height="6"/><rect x="9" y="1" width="6" height="6"/><rect x="1" y="9" width="6" height="6"/><rect x="9" y="9" width="6" height="6"/></svg>`],
    ["large", "Large view", `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="1" y="1" width="6" height="14"/><rect x="9" y="1" width="6" height="14"/></svg>`]
  ];
  /* styles ("looks") read from each product's drawing data, so new pieces sort themselves */
  const LOOKS = [
    { id: "stripes", label: "Rugby stripes", title: "Rugby stripes",
      intro: "Bands and pinstripes knitted into the cloth, never printed on.",
      test: p => !!(p.style && p.style.stripes) },
    { id: "script", label: "Script polos", title: "Script polos",
      intro: "Club lettering across the chest, raised in soft puff print or embroidered.",
      test: p => !!(p.style && p.style.graphic && p.style.graphic.kind === "script") },
    { id: "knit", label: "Knits", title: "Knits",
      intro: "Rib and waffle knits with soft collars, for cooler evenings and long train rides.",
      test: p => !!((p.style && ["rib", "waffle"].includes(p.style.knit)) || p.shape === "knitpolo") }
  ];
  const lookOf = id => LOOKS.find(l => l.id === id);
  const PAGE = 12;          // cards per "page"
  const PAGE_FROM = 16;     // paging only kicks in above this many results

  const sizeKey = s => (LETTER.includes(s) ? LETTER.indexOf(s) : 100 + parseFloat(s));
  const groupOfId = id => (CATEGORIES.find(c => c.id === id) || {}).group;
  const catLabel = id => (CATEGORIES.find(c => c.id === id) || {}).name || id;
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const list = v => (v ? v.split(",").map(x => x.trim()).filter(Boolean) : []);
  const num = v => (v !== null && v !== "" && !isNaN(+v) && +v >= 0 ? Math.round(+v) : null);
  const clone = st => JSON.parse(JSON.stringify(st));
  const idx = new Map(PRODUCTS.map((p, i) => [p.id, i]));

  /* techniques, in order of first appearance (scales with the data) */
  const TECHS = [];
  PRODUCTS.forEach(p => (p.techniques || []).forEach(t => { if (!TECHS.some(x => x.toLowerCase() === String(t).toLowerCase())) TECHS.push(t); }));
  const techOf = v => TECHS.find(t => t.toLowerCase() === String(v).toLowerCase());

  /* ---------- state <-> URL ---------- */
  const params = new URLSearchParams(location.search);
  let savedView = "";
  try { savedView = localStorage.getItem("bhakshi_shopview") || ""; } catch (e) { /* ignore */ }
  const pickView = v => (VIEWS.some(x => x[0] === v) ? v : "");
  const ip = params.get("instock");
  const S = {
    group: params.get("group") || "",
    cat: list(params.get("cat")).filter(c => CATEGORIES.some(x => x.id === c)),
    tag: params.get("tag") || "",
    drop: params.has("drop"),
    q: (params.get("q") || "").trim().slice(0, 80),
    size: list(params.get("size")),
    tech: list(params.get("tech")).map(techOf).filter(Boolean),
    look: [...new Set(list(params.get("look")).map(v => v.toLowerCase()).filter(lookOf))],
    avail: ip === "1" ? ["in"] : ip === "0" ? ["out"] : [],
    min: num(params.get("min")),
    max: num(params.get("max")),
    sort: SORTS.some(s => s[0] === params.get("sort")) ? params.get("sort") : "featured",
    view: pickView(params.get("view")) || pickView(savedView) || "grid",
    page: Math.max(1, parseInt(params.get("page"), 10) || 1)
  };
  if (S.group && !CATEGORIES.some(c => c.group === S.group)) S.group = "";
  if (S.tag && !TAGS[S.tag] && !PRODUCTS.some(p => (p.tags || []).includes(S.tag))) S.tag = "";
  if (S.min !== null && S.max !== null && S.min > S.max) [S.min, S.max] = [S.max, S.min];

  function writeURL() {
    const u = new URLSearchParams();
    if (S.drop) u.set("drop", DROP.number);
    if (S.group) u.set("group", S.group);
    if (S.cat.length) u.set("cat", S.cat.join(","));
    if (S.tag) u.set("tag", S.tag);
    if (S.q) u.set("q", S.q);
    if (S.look.length) u.set("look", S.look.join(","));
    if (S.size.length) u.set("size", S.size.join(","));
    if (S.tech.length) u.set("tech", S.tech.join(","));
    if (S.avail.length === 1) u.set("instock", S.avail[0] === "in" ? "1" : "0");
    if (S.min !== null) u.set("min", S.min);
    if (S.max !== null) u.set("max", S.max);
    if (S.sort !== "featured") u.set("sort", S.sort);
    if (S.view !== "grid") u.set("view", S.view);
    if (S.page > 1) u.set("page", S.page);
    const qs = u.toString().replace(/%2C/g, ",").replace(/\+/g, "%20");
    try { history.replaceState(history.state, "", location.pathname + (qs ? "?" + qs : "") + location.hash); } catch (e) { /* file:// etc. */ }
  }

  /* ---------- search ---------- */
  /* words a shopper might type, derived from the drawing data (stripes, script, knit, sleeves…) */
  function styleWords(p) {
    const st = p.style || {}, g = st.graphic || {}, w = [];
    if (st.stripes) w.push("stripe striped stripes rugby", st.stripes.area === "full" ? "pinstripe pinstriped" : "band banded hooped");
    if (g.kind === "script") w.push("script lettering text", g.text || "");
    if (g.kind === "number") w.push("number numeral varsity", g.text || "");
    if (st.knit) w.push(st.knit, st.knit === "pique" ? "pique honeycomb" : st.knit === "jersey" ? "jersey heavyweight" : "knit knitted knitwear sweater");
    if (st.sleeve === "long") w.push("long sleeve full sleeve fullsleeve winter");
    if (st.sleeve === "short") w.push("short sleeve half sleeve halfsleeve summer");
    if (st.placket === "johnny") w.push("johnny collar open collar v neck");
    if (st.tipping && st.tipping.length) w.push("tipped tipping");
    if (st.collar && st.body && String(st.collar).toLowerCase() !== String(st.body).toLowerCase()) w.push("contrast collar");
    w.push("polo collared collar");
    return w.join(" ");
  }
  const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[-_/]/g, "").replace(/[^a-z0-9 ]/g, " ");
  const stem = w => (w.length > 3 && w.endsWith("es") && !w.endsWith("ses") ? w.slice(0, -2) : w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w);
  const SYN = { tee: "tshirt", tees: "tshirt", tshirt: "tshirt", top: "topwear", pant: "trouser", pants: "trouser", denim: "jean", sweatshirt: "hoodie", track: "jogger", embroidered: "embroidery", polos: "polo", rugbies: "rugby", rugger: "rugby", striped: "stripe", stripy: "stripe", lettering: "script", sweater: "knit", jumper: "knit", fullsleeve: "long", halfsleeve: "short", burgundy: "maroon", wine: "maroon", pink: "rose", yellow: "mustard", red: "crimson", brown: "cocoa", white: "chalk" };
  const HAY = new Map();
  function hay(p) {
    if (HAY.has(p.id)) return HAY.get(p.id);
    const c = CATEGORIES.find(x => x.id === p.category) || {};
    const raw = [p.name, p.category, c.name, c.group, p.colorName, p.fabric, p.fit, p.shape, (p.tags || []).join(" "), (p.techniques || []).join(" "), p.family, styleWords(p), p.desc || ""].join(" ");
    const n = norm(raw);
    const h = n + " " + n.split(/\s+/).map(stem).join(" ");
    HAY.set(p.id, h);
    return h;
  }
  function matchesQuery(p, q) {
    const words = norm(q).split(/\s+/).filter(Boolean);
    if (!words.length) return true;
    const h = hay(p);
    return words.every(w => { const s = stem(SYN[w] || w); return h.includes(w) || h.includes(s); });
  }
  function lev(a, b) {
    const m = [];
    for (let i = 0; i <= b.length; i++) m[i] = [i];
    for (let j = 0; j <= a.length; j++) m[0][j] = j;
    for (let i = 1; i <= b.length; i++) for (let j = 1; j <= a.length; j++)
    {
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (b[i - 1] === a[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && b[i - 1] === a[j - 2] && b[i - 2] === a[j - 1]) m[i][j] = Math.min(m[i][j], m[i - 2][j - 2] + 1); // transposition
    }
    return m[b.length][a.length];
  }
  /* "Did you mean": closest product names (small catalogue) or categories (bigger one) */
  function didYouMean(q) {
    const words = norm(q).split(/\s+/).filter(w => w.length > 1);
    if (!words.length) return [];
    const score = terms => {
      let best = 99;
      words.forEach(w => terms.forEach(t => {
        if (t.length < 2) return;
        const d = t.startsWith(w) || w.startsWith(t) ? 0 : lev(w, t.slice(0, Math.max(w.length, 3)));
        best = Math.min(best, d / Math.max(w.length, 3));
      }));
      return best;
    };
    const pool = LIVE_CATS().length > 1
      ? LIVE_CATS().map(c => ({ href: `shop.html?cat=${c.id}`, label: c.name, terms: norm(c.name + " " + c.id).split(/\s+/) }))
      : PRODUCTS.map(p => ({ href: `product.html?id=${encodeURIComponent(p.id)}`, label: short(p), terms: norm(p.name + " " + p.colorName).split(/\s+/) }));
    return pool.map(x => ({ ...x, best: score(x.terms) })).filter(x => x.best < 0.5).sort((a, b) => a.best - b.best).slice(0, 4);
  }

  /* ---------- filtering ---------- */
  function scoped() {
    return PRODUCTS.filter(p =>
      (!S.group || groupOfId(p.category) === S.group) &&
      (!S.tag || (p.tags || []).includes(S.tag)) &&
      (!S.q || matchesQuery(p, S.q)));
  }
  function passes(p, st, skip) {
    if (skip !== "cat" && st.cat.length && !st.cat.includes(p.category)) return false;
    // sizes are product-level: "size M" = the style comes in M and is still in stock
    if (skip !== "size" && st.size.length && (!inStock(p) || !(p.sizes || []).some(s => st.size.includes(s)))) return false;
    if (skip !== "look" && st.look.length && !st.look.some(l => lookOf(l).test(p))) return false;
    if (skip !== "tech" && st.tech.length && !(p.techniques || []).some(t => st.tech.includes(techOf(t)))) return false;
    if (skip !== "avail" && st.avail.length === 1 && (st.avail[0] === "in") !== inStock(p)) return false;
    if (skip !== "price" && st.min !== null && p.price < st.min) return false;
    if (skip !== "price" && st.max !== null && p.price > st.max) return false;
    return true;
  }
  const sold = p => Math.max(0, (p.edition || 0) - (p.stock || 0));
  const hasTag = (p, t) => (p.tags || []).includes(t);
  function sortList(arr, sort) {
    const out = [...arr];
    const by = {
      featured: (a, b) => idx.get(a.id) - idx.get(b.id),
      best: (a, b) => (hasTag(b, "bestseller") - hasTag(a, "bestseller")) || sold(b) - sold(a) || idx.get(a.id) - idx.get(b.id),
      az: (a, b) => short(a).localeCompare(short(b), "en", { sensitivity: "base" }) || idx.get(a.id) - idx.get(b.id),
      za: (a, b) => short(b).localeCompare(short(a), "en", { sensitivity: "base" }) || idx.get(a.id) - idx.get(b.id),
      "price-asc": (a, b) => a.price - b.price || idx.get(a.id) - idx.get(b.id),
      "price-desc": (a, b) => b.price - a.price || idx.get(a.id) - idx.get(b.id),
      new: (a, b) => (hasTag(b, "new") - hasTag(a, "new")) || idx.get(b.id) - idx.get(a.id)
    }[sort] || (() => 0);
    // sold-out pieces sink to the end of the curated orders; explicit orders (A–Z, price) stay strict
    const sink = ["featured", "best", "new"].includes(sort);
    out.sort((a, b) => (sink ? (!inStock(a)) - (!inStock(b)) : 0) || by(a, b));
    return out;
  }
  const results = (st = S) => sortList(scoped().filter(p => passes(p, st)), st.sort);
  const priceTop = () => Math.max(0, ...scoped().map(p => p.price));
  const filterCount = st => st.look.length + st.cat.length + st.size.length + st.tech.length + (st.avail.length === 1 ? 1 : 0) + (st.min !== null || st.max !== null ? 1 : 0);
  const clearFilters = st => Object.assign(st, { look: [], cat: [], size: [], tech: [], avail: [], min: null, max: null });
  /* the plain landing view: nothing searched, filtered or narrowed */
  const isDefault = () => !S.q && !S.tag && !S.group && !S.cat.length && !filterCount(S);

  /* ---------- category links row ---------- */
  function renderCats() {
    const el = $("#shopCats");
    // with a single category the row only repeats "All" — the style chips do that job instead
    if (LIVE_CATS().length < 2 && !S.cat.length) { el.innerHTML = ""; el.hidden = true; return; }
    if (typeof categoryLinksRow === "function") {
      let out = "";
      const active = S.tag || S.q || S.group || S.drop ? null : S.cat.length === 1 ? S.cat[0] : S.cat.length ? null : "";
      try { out = categoryLinksRow({ active }); } catch (e) { out = ""; }
      if (out && typeof out === "object" && out.nodeType === 1) { el.innerHTML = ""; el.appendChild(out); el.hidden = false; return; }
      if (typeof out === "string" && out.trim()) { el.innerHTML = `<div class="container shop-cats-in">${out}</div>`; el.hidden = false; return; }
    }
    // fallback: our own quiet row of links built from the data
    const links = [{ href: "shop.html", label: "All", on: !S.cat.length && !S.tag && !S.group && !S.drop && !S.q }];
    LIVE_CATS().forEach(c => links.push({ href: `shop.html?cat=${c.id}`, label: c.name, on: S.cat.length === 1 && S.cat[0] === c.id && !S.tag }));
    ["new", "bestseller"].forEach(t => {
      const n = PRODUCTS.filter(p => hasTag(p, t)).length;
      if (n && n < PRODUCTS.length) links.push({ href: `shop.html?tag=${t}`, label: TAGS[t], on: S.tag === t });
    });
    el.innerHTML = `<nav class="container shop-cats-in" aria-label="Shop by category"><ul>${links.map(l =>
      `<li><a href="${l.href}" data-shoplink ${l.on ? 'aria-current="page" class="is-active"' : ""}>${esc(l.label)}</a></li>`).join("")}</ul></nav>`;
    el.hidden = false;
  }

  /* ---------- heading ---------- */
  function heading() {
    if (S.q) return { title: `Search: “${S.q}”`, plain: `Search: "${S.q}"` };
    if (S.tag) { const t = TAGS[S.tag] || S.tag; return { title: t, plain: t }; }
    if (S.cat.length === 1) { const c = CATEGORIES.find(x => x.id === S.cat[0]); if (c) return { title: c.name, plain: c.name }; }
    if (S.cat.length > 1) { const t = S.cat.map(catLabel).join(" / "); return { title: t, plain: t }; }
    if (S.group) return { title: S.group, plain: S.group };
    if (S.drop) return { title: DROP_TITLE, plain: DROP_TITLE, kicker: "Limited release" };
    if (S.look.length === 1) { const l = lookOf(S.look[0]); return { title: l.title, plain: l.title, intro: l.intro }; }
    if (S.look.length > 1 && !filterCount({ ...S, look: [] })) { const t = S.look.map(v => lookOf(v).label).join(" / "); return { title: t, plain: t }; }
    if (S.tech.length === 1 && !filterCount({ ...S, tech: [] })) return { title: S.tech[0], plain: S.tech[0], kicker: "Detail" };
    return { title: "All products", plain: "All products" };
  }
  function renderHead(count) {
    const h = heading();
    $("#shopTitle").textContent = h.title;
    const k = $("#shopKicker");
    k.textContent = h.kicker || "";
    k.hidden = !h.kicker;
    const it = $("#shopIntro");
    it.textContent = h.intro || "";
    it.hidden = !h.intro;
    $("#shopCount").textContent = S.q ? (count ? plural(count, "result") : "") : plural(count, "product");
    $("#shopCount").hidden = !$("#shopCount").textContent;
    $("#tbCount").textContent = plural(count, "product");
    const sf = $("#shopSearch");
    sf.hidden = !S.q;
    if (S.q && document.activeElement !== $("#shopQ")) $("#shopQ").value = S.q;
    document.title = `${h.plain} | ${STORE.name}`;
  }

  /* ---------- style chips: All · Rugby stripes · Script polos · Knits (only chips with products) ---------- */
  function renderLooks() {
    const el = $("#shopLooks");
    const base = scoped().filter(p => passes(p, S, "look"));
    const looks = LOOKS.map(l => ({ ...l, n: base.filter(l.test).length })).filter(l => l.n);
    if (S.q || !looks.length) { el.innerHTML = ""; el.hidden = true; return; }
    const one = S.look.length === 1 ? S.look[0] : "";
    const chip = (href, look, label, n, on) => `<li><a class="shop-look${on ? " is-active" : ""}" href="${href}" data-look-chip="${look}" ${on ? 'aria-current="page"' : ""}>
        <span>${esc(label)}</span>${n !== null ? `<span class="shop-look-n" aria-label="${plural(n, "style")}">${n}</span>` : ""}</a></li>`;
    el.innerHTML = `<nav aria-label="Shop by style"><ul>${chip("shop.html", "", "All", null, !S.look.length)}${looks.map(l =>
      chip(`shop.html?look=${l.id}`, l.id, l.label, l.n, one === l.id)).join("")}</ul></nav>`;
    el.hidden = false;
  }

  /* ---------- slim drop banner (landing view only; owner photo STORE.campaign.banner, else drawn flat lay) ---------- */
  let bannerDone = false;
  function renderBanner() {
    const el = $("#shopBanner");
    const show = isDefault() && PRODUCTS.length > 1;
    if (show && !bannerDone) {
      bannerDone = true;
      const n = PRODUCTS.length;
      const eds = PRODUCTS.map(p => p.edition | 0).filter(Boolean);
      const lo = Math.min(...eds), hi = Math.max(...eds);
      const runs = eds.length ? (lo === hi ? `runs of ${lo}` : `runs of ${lo}–${hi}`) : "limited runs";
      let img = "";
      try { img = typeof campaignImage === "function" ? campaignImage("banner", { scene: "flatlay", ratio: "21:9", alt: `${DROP_TITLE}: the full drop laid flat` }) : ""; } catch (e) { img = ""; }
      if (!img && typeof Art !== "undefined" && Art.campaign) { try { img = Art.campaign("flatlay", { ratio: "21:9" }); } catch (e) { img = ""; } }
      el.innerHTML = `<figure class="shop-banner-fig">${img}</figure>
        <div class="shop-banner-cap">
          <p class="shop-banner-t">${esc(DROP_TITLE)}</p>
          <p class="shop-banner-d">Contrast collars, rugby stripes, club script and soft knits. Collared classics for long weekdays and slow Sundays.</p>
          <p class="shop-banner-m">${plural(n, "style")}<span aria-hidden="true">·</span>Limited ${esc(runs)}<span aria-hidden="true">·</span>Made in India</p>
        </div>`;
    }
    el.hidden = !show || !el.innerHTML;
  }

  /* ---------- toolbar ---------- */
  function renderToolbar() {
    const sel = $("#shopSort");
    if (!sel.options.length) sel.innerHTML = SORTS.map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
    sel.value = S.sort;
    fitSelect(sel);
    $("#shopViews").innerHTML = VIEWS.map(([v, l, ic]) =>
      `<button type="button" class="tb-view" data-view="${v}" aria-pressed="${S.view === v}" aria-label="${l}" title="${l}">${ic}</button>`).join("");
    const n = filterCount(S);
    $("#filterN").hidden = !n;
    $("#filterN").textContent = n ? `(${n})` : "";
    $("#filterBtn").setAttribute("aria-label", n ? `Filters, ${n} applied` : "Filters");
  }

  /* size the sort select to its current label so the chevron sits right after it */
  let measureCtx = null;
  function fitSelect(sel) {
    try {
      measureCtx = measureCtx || document.createElement("canvas").getContext("2d");
      const cs = getComputedStyle(sel);
      measureCtx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const txt = (sel.options[sel.selectedIndex] || {}).text || "";
      const ls = parseFloat(cs.letterSpacing) || 0;
      const w = measureCtx.measureText(txt.toUpperCase()).width + ls * txt.length;
      sel.style.width = Math.ceil(w + parseFloat(cs.paddingRight) + 4) + "px";
    } catch (e) { /* keep natural width */ }
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fitSelect($("#shopSort"))).catch(() => {});

  /* ---------- active filter pills ---------- */
  const X = `<svg width="9" height="9" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.4"/></svg>`;
  function activeFilters(st) {
    const out = [];
    // a single style is already shown by the chip row; pill it only alongside other filters or in search
    if (st.look.length > 1 || (st.look.length && (st.q || filterCount({ ...st, look: [] })))) st.look.forEach(v => out.push({ k: "look", v, label: lookOf(v).label }));
    st.cat.forEach(v => out.push({ k: "cat", v, label: catLabel(v) }));
    st.tech.forEach(v => out.push({ k: "tech", v, label: v }));
    st.size.forEach(v => out.push({ k: "size", v, label: `Size: ${v}` }));
    if (st.avail.length === 1) out.push({ k: "avail", label: st.avail[0] === "in" ? "In stock" : "Out of stock" });
    if (st.min !== null || st.max !== null) {
      out.push({ k: "price", label: st.min !== null && st.max !== null ? `${PRICE(st.min)} – ${PRICE(st.max)}` : st.min !== null ? `From ${PRICE(st.min)}` : `Up to ${PRICE(st.max)}` });
    }
    return out;
  }
  function renderPills() {
    const act = activeFilters(S);
    const el = $("#shopPills");
    el.innerHTML = act.length ? act.map(a =>
      `<button type="button" class="pill" data-rm="${a.k}" data-v="${esc(a.v || "")}" aria-label="Remove filter: ${esc(a.label)}"><span>${esc(a.label)}</span>${X}</button>`).join("") +
      `<button type="button" class="pill-clear" data-clear-all>Clear all</button>` : "";
    el.hidden = !act.length;
  }
  function removeFilter(k, v) {
    if (k === "price") { S.min = null; S.max = null; }
    else if (k === "avail") S.avail = [];
    else S[k] = S[k].filter(x => x !== v);
  }

  /* ---------- grid (with a light FLIP) ---------- */
  const tpl = document.createElement("template");
  function cardEl(p) {
    tpl.innerHTML = String(productCard(p)).trim();
    const el = tpl.content.firstElementChild;
    if (el && !el.dataset.id) el.dataset.id = p.id;
    return el;
  }
  function renderGrid(items, { animate = false, focusNew = false } = {}) {
    const grid = $("#shopGrid");
    const view = S.view;
    const viewChanged = grid.dataset.view !== view;
    const motion = animate && !reduceMotion() && typeof grid.animate === "function";
    grid.dataset.view = view;
    grid.classList.toggle("grid-products", true);
    grid.classList.toggle("is-large", view === "large");

    const paged = items.length > PAGE_FROM;
    const maxPage = paged ? Math.ceil(items.length / PAGE) : 1;
    S.page = Math.min(Math.max(1, S.page), maxPage);
    const shown = paged ? items.slice(0, PAGE * S.page) : items;

    $$(":scope > .shop-empty", grid).forEach(el => el.remove());
    const existing = new Map($$(":scope > [data-id]", grid).map(el => [el.dataset.id, el]));
    const first = new Map();
    if (motion && !viewChanged) existing.forEach((el, id) => first.set(id, el.getBoundingClientRect()));

    const keep = new Set(shown.map(p => p.id));
    existing.forEach((el, id) => { if (!keep.has(id)) el.remove(); });
    const entering = [];
    shown.forEach(p => {
      let el = existing.get(p.id);
      if (!el) { el = cardEl(p); if (!el) return; entering.push(el); }
      grid.appendChild(el);
    });
    if (!items.length) grid.insertAdjacentHTML("beforeend", emptyHTML());

    if (motion) {
      if (viewChanged) {
        grid.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: EASE });
      } else {
        shown.forEach(p => {
          const el = grid.querySelector(`:scope > [data-id="${CSS.escape(p.id)}"]`);
          const f = first.get(p.id);
          if (!el || !f || entering.includes(el)) return;
          const l = el.getBoundingClientRect();
          const dx = f.left - l.left, dy = f.top - l.top;
          if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
          el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 420, easing: EASE });
        });
        entering.forEach((el, i) => el.animate(
          [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }],
          { duration: 380, delay: Math.min(i, 8) * 40, easing: EASE, fill: "backwards" }));
        const empty = $(":scope > .shop-empty", grid);
        if (empty) empty.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: EASE });
      }
    }
    if (focusNew && entering[0]) {
      const f = $$("a[href], button", entering[0]).find(n => n.tabIndex !== -1 && !n.closest("[aria-hidden='true']"));
      if (f) f.focus({ preventScroll: true });
    }
    renderMore(items.length, shown.length, paged);
    if (typeof refreshReveal === "function") { try { refreshReveal(grid); } catch (e) { /* ignore */ } }
    if (typeof initCountdowns === "function") { try { initCountdowns(grid); } catch (e) { /* ignore */ } }
  }

  function renderMore(total, shown, paged) {
    const el = $("#shopMore");
    if (!paged) { el.hidden = true; el.innerHTML = ""; return; }
    el.hidden = false;
    const pct = Math.round((shown / total) * 100);
    el.innerHTML = `<p class="shop-more-t">Showing ${shown} of ${total}</p>
      <span class="shop-more-bar" aria-hidden="true"><i style="width:${pct}%"></i></span>
      ${shown < total ? `<button type="button" class="btn btn-outline shop-more-btn" data-more>See more</button>` : ""}`;
  }

  /* ---------- empty states ---------- */
  function emptyHTML() {
    const act = activeFilters(S);
    if (S.q && !scoped().length) {
      const dym = didYouMean(S.q);
      return `<div class="shop-empty" role="status">
        <h2 class="shop-empty-h">No results for “${esc(S.q)}”</h2>
        <p class="shop-empty-p">Check the spelling, or try a simpler word like “rugby”, “stripe” or “green”.</p>
        ${dym.length ? `<p class="shop-empty-l">Did you mean</p><p class="shop-empty-links">${dym.map(o => `<a class="link-underline" href="${o.href}">${esc(o.label)}</a>`).join("")}</p>` : ""}
        <a class="btn btn-outline" href="shop.html">View all products</a>
      </div>`;
    }
    return `<div class="shop-empty" role="status">
      <h2 class="shop-empty-h">No products match these filters</h2>
      <p class="shop-empty-p">Try removing a filter, or clear them all to see everything.</p>
      ${act.length ? `<button type="button" class="btn btn-outline" data-clear-all>Clear filters</button>` : `<a class="btn btn-outline" href="shop.html">View all products</a>`}
    </div>`;
  }

  /* search: when nothing (or only part of the range) matched, show what else there is */
  function renderExtra(items) {
    const el = $("#shopExtra");
    if (!S.q) { el.innerHTML = ""; return; }
    const shownIds = new Set(items.map(p => p.id));
    const rank = p => (BUY(p) ? 10 : 0) + (hasTag(p, "bestseller") ? 2 : 0) + (hasTag(p, "new") ? 1 : 0);
    const picks = PRODUCTS.filter(p => !shownIds.has(p.id)).sort((a, b) => rank(b) - rank(a) || idx.get(a.id) - idx.get(b.id)).slice(0, 4);
    if (!picks.length) { el.innerHTML = ""; return; }
    el.innerHTML = `<section class="shop-extra" aria-labelledby="shopExtraH">
      <div class="shop-extra-head"><h2 id="shopExtraH">${items.length ? "You may also like" : "Popular right now"}</h2><a class="link-underline" href="shop.html">View all</a></div>
      <div class="grid-products shop-extra-grid">${picks.map(productCard).join("")}</div></section>`;
    if (typeof refreshReveal === "function") { try { refreshReveal(el); } catch (e) { /* ignore */ } }
  }

  /* ---------- render all ---------- */
  function render(opts = {}) {
    const items = results();
    renderHead(items.length);
    renderCats();
    renderLooks();
    renderBanner();
    renderToolbar();
    renderPills();
    $("#shopToolbar").hidden = !scoped().length;
    renderGrid(items, opts);
    renderExtra(items);
    writeURL();
  }
  const update = (opts = { animate: true }) => { S.page = 1; render(opts); };

  /* ---------- filter drawer ---------- */
  const drawer = $("#filterDrawer"), panel = $(".fdrawer-panel", drawer), body = $("#filterBody");
  let D = null;           // draft state while the drawer is open
  let lastFocus = null, closeT = 0;
  const GROUPS = ["look", "avail", "size", "price", "tech", "cat"];
  const open = new Set(GROUPS);
  try { const c = JSON.parse(sessionStorage.getItem("bhakshi_fclosed") || "[]"); c.forEach(k => open.delete(k)); } catch (e) { /* ignore */ }
  const chev = `<svg class="fg-ic" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M2 6h8"/><path class="fg-ic-v" d="M6 2v8"/></svg>`;
  const group = (key, title, inner, n) => `<div class="fgroup ${open.has(key) ? "is-open" : ""}" data-g="${key}">
      <h3 class="fgroup-h"><button type="button" class="fgroup-head" data-toggle="${key}" aria-expanded="${open.has(key)}" aria-controls="fg-${key}">
        <span>${title}${n ? ` <span class="fgroup-n">(${n})</span>` : ""}</span>${chev}</button></h3>
      <div class="fgroup-body" id="fg-${key}" ${open.has(key) ? "" : "hidden"}>${inner}</div>
    </div>`;
  const check = (f, v, label, on, count) => `<label class="fopt ${!count && !on ? "is-empty" : ""}">
      <input type="checkbox" data-f="${f}" value="${esc(v)}" data-key="${f}:${esc(v)}" ${on ? "checked" : ""} ${!count && !on ? "disabled" : ""}>
      <span class="fbox" aria-hidden="true"></span><span class="fopt-l">${esc(label)}</span><span class="fopt-n">(${count})</span></label>`;

  function drawerHTML(st) {
    const base = scoped();
    const cnt = (skip, fn) => base.filter(p => passes(p, st, skip) && fn(p)).length;
    const out = [];

    const looks = LOOKS.filter(l => base.some(l.test) || st.look.includes(l.id));
    if (looks.length) {
      out.push(group("look", "Style", looks.map(l => check("look", l.id, l.label, st.look.includes(l.id), cnt("look", l.test))).join(""), st.look.length));
    }

    const nIn = cnt("avail", inStock), nOut = cnt("avail", p => !inStock(p));
    out.push(group("avail", "Availability",
      check("avail", "in", "In stock", st.avail.includes("in"), nIn) + check("avail", "out", "Out of stock", st.avail.includes("out"), nOut),
      st.avail.length === 1 ? 1 : 0));

    const sizes = [...new Set(base.flatMap(p => p.sizes || []))].sort((a, b) => sizeKey(a) - sizeKey(b));
    if (sizes.length) {
      out.push(group("size", "Size", `<div class="fsizes" role="group" aria-label="Sizes">${sizes.map(s => {
        const n = cnt("size", p => inStock(p) && (p.sizes || []).includes(s)), on = st.size.includes(s);
        return `<button type="button" class="fsize" data-f="size" data-v="${esc(s)}" data-key="size:${esc(s)}" aria-pressed="${on}" ${!n && !on ? "disabled" : ""} aria-label="Size ${esc(s)}, ${n} in stock">${esc(s)}</button>`;
      }).join("")}</div>`, st.size.length));
    }

    const top = priceTop();
    out.push(group("price", "Price", `<p class="fprice-note">The highest price is ${PRICE(top)}</p>
      <div class="fprice">
        <label class="fprice-f"><span class="fprice-cur" aria-hidden="true">Rs.</span><input type="number" inputmode="numeric" min="0" max="${top}" step="1" data-p="min" data-key="price:min" placeholder="From" value="${st.min ?? ""}" aria-label="Price from, in rupees"></label>
        <span class="fprice-sep" aria-hidden="true">to</span>
        <label class="fprice-f"><span class="fprice-cur" aria-hidden="true">Rs.</span><input type="number" inputmode="numeric" min="0" max="${top}" step="1" data-p="max" data-key="price:max" placeholder="To" value="${st.max ?? ""}" aria-label="Price to, in rupees"></label>
      </div>`, st.min !== null || st.max !== null ? 1 : 0));

    const techs = TECHS.filter(t => base.some(p => (p.techniques || []).some(x => techOf(x) === t)));
    if (techs.length) {
      out.push(group("tech", "Details", techs.map(t => check("tech", t, t, st.tech.includes(t), cnt("tech", p => (p.techniques || []).some(x => techOf(x) === t)))).join(""), st.tech.length));
    }

    const cats = (S.group ? CATEGORIES.filter(c => c.group === S.group) : CATEGORIES).filter(c => base.some(p => p.category === c.id));
    if (cats.length > 1) {
      out.push(group("cat", "Category", cats.map(c => check("cat", c.id, c.name, st.cat.includes(c.id), cnt("cat", p => p.category === c.id))).join(""), st.cat.length));
    }
    return out.join("");
  }
  function paintDrawer() {
    const focusKey = body.contains(document.activeElement) ? (document.activeElement.dataset.key || document.activeElement.dataset.toggle && "t:" + document.activeElement.dataset.toggle) : null;
    const top = body.scrollTop;
    body.innerHTML = drawerHTML(D);
    body.scrollTop = top;
    if (focusKey) {
      const el = focusKey.startsWith("t:") ? body.querySelector(`[data-toggle="${CSS.escape(focusKey.slice(2))}"]`) : body.querySelector(`[data-key="${CSS.escape(focusKey)}"]`);
      if (el) el.focus({ preventScroll: true });
    }
    paintApply();
  }
  function paintApply() {
    const n = results(D).length;
    const b = $("#filterApply");
    b.textContent = n ? `View ${plural(n, "item")}` : "No items match";
    b.disabled = !n;
    $("#filterClear").disabled = !filterCount(D);
  }
  function readPrice() {
    const f = k => { const el = $(`[data-p="${k}"]`, body); return el ? num(el.value) : null; };
    let a = f("min"), b = f("max");
    if (a !== null && b !== null && a > b) [a, b] = [b, a];
    D.min = a && a > 0 ? a : null;
    D.max = b !== null ? b : null;
  }
  const focusables = el => $$('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])', el).filter(n => n.offsetParent !== null);
  const lock = on => {
    if (typeof lockScroll === "function") { try { lockScroll(on); return; } catch (e) { /* fall through */ } }
    document.documentElement.style.overflow = on ? "hidden" : "";
  };
  function openDrawer() {
    if (!drawer.hidden && drawer.classList.contains("is-open")) return;
    clearTimeout(closeT);
    D = clone(S);
    lastFocus = document.activeElement;
    paintDrawer();
    drawer.hidden = false;
    void drawer.offsetWidth;
    drawer.classList.add("is-open");
    $("#filterBtn").setAttribute("aria-expanded", "true");
    lock(true);
    setTimeout(() => panel.focus({ preventScroll: true }), 40);
  }
  function closeDrawer() {
    if (drawer.hidden) return;
    drawer.classList.remove("is-open");
    $("#filterBtn").setAttribute("aria-expanded", "false");
    lock(false);
    closeT = setTimeout(() => { drawer.hidden = true; body.innerHTML = ""; }, reduceMotion() ? 0 : 320);
    if (lastFocus && document.contains(lastFocus)) { try { lastFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  }
  $("#filterBtn").addEventListener("click", openDrawer);
  drawer.addEventListener("click", e => {
    if (e.target.closest("[data-fclose]")) { closeDrawer(); return; }
    const t = e.target.closest("[data-toggle]");
    if (t) {
      const k = t.dataset.toggle, g = t.closest(".fgroup"), on = !g.classList.contains("is-open");
      g.classList.toggle("is-open", on);
      t.setAttribute("aria-expanded", String(on));
      $(".fgroup-body", g).hidden = !on;
      on ? open.add(k) : open.delete(k);
      try { sessionStorage.setItem("bhakshi_fclosed", JSON.stringify(GROUPS.filter(x => !open.has(x)))); } catch (err) { /* ignore */ }
      return;
    }
    const b = e.target.closest("button[data-f]");
    if (b && !b.disabled) { const f = b.dataset.f, v = b.dataset.v; D[f] = D[f].includes(v) ? D[f].filter(x => x !== v) : [...D[f], v]; paintDrawer(); return; }
    if (e.target.closest("#filterClear")) { clearFilters(D); paintDrawer(); const a = $("#filterApply"); a.focus({ preventScroll: true }); return; }
    if (e.target.closest("#filterApply")) {
      readPrice();
      Object.assign(S, clone(D));
      closeDrawer();
      update();
      const top = $("#shopToolbar").getBoundingClientRect().top + scrollY - 80;
      if (scrollY > top) scrollTo({ top, behavior: reduceMotion() ? "auto" : "smooth" });
    }
  });
  drawer.addEventListener("change", e => {
    const el = e.target;
    if (el.matches('input[type="checkbox"][data-f]')) {
      const f = el.dataset.f;
      D[f] = el.checked ? [...new Set([...D[f], el.value])] : D[f].filter(x => x !== el.value);
      paintDrawer();
    } else if (el.matches("[data-p]")) { readPrice(); paintApply(); }
  });
  drawer.addEventListener("input", e => { if (e.target.matches("[data-p]")) { readPrice(); paintApply(); } });
  drawer.addEventListener("keydown", e => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeDrawer(); return; }
    if (e.key === "Enter" && e.target.matches("[data-p]")) { e.preventDefault(); $("#filterApply").click(); return; }
    if (e.key !== "Tab") return;
    const f = focusables(panel);
    if (!f.length) return;
    const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  });

  /* ---------- page events ---------- */
  $("#shopSort").addEventListener("change", e => { S.sort = e.target.value; update(); });
  $("#shopViews").addEventListener("click", e => {
    const b = e.target.closest("[data-view]");
    if (!b || b.dataset.view === S.view) return;
    S.view = b.dataset.view;
    try { localStorage.setItem("bhakshi_shopview", S.view); } catch (err) { /* ignore */ }
    render({ animate: true });
    const nb = $(`#shopViews [data-view="${S.view}"]`); nb && nb.focus({ preventScroll: true });
  });
  $("#shopSearch").addEventListener("submit", e => {
    e.preventDefault();
    const q = $("#shopQ").value.trim().slice(0, 80);
    if (!q) { location.href = "shop.html"; return; }
    S.q = q; clearFilters(S); update();
  });
  $("#main").addEventListener("click", e => {
    const rm = e.target.closest("[data-rm]");
    if (rm) { removeFilter(rm.dataset.rm, rm.dataset.v); update(); const f = $("#shopPills .pill") || $("#filterBtn"); f.focus({ preventScroll: true }); return; }
    if (e.target.closest("[data-clear-all]")) { clearFilters(S); update(); $("#filterBtn").focus({ preventScroll: true }); return; }
    if (e.target.closest("[data-more]")) { S.page += 1; render({ animate: true, focusNew: true }); return; }
    // style chips: switch in place (no reload), keeping any other filters
    const lc = e.target.closest("[data-look-chip]");
    if (lc && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
      e.preventDefault();
      const v = lc.dataset.lookChip;
      S.look = v ? [v] : [];
      update();
      const nb = $(`#shopLooks [data-look-chip="${CSS.escape(v)}"]`); nb && nb.focus({ preventScroll: true });
      return;
    }
    // our own category links: switch in place (no reload)
    const a = e.target.closest("a[data-shoplink], #shopCats a[href]");
    if (a && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
      const to = new URL(a.href, location.href);
      if (!/(^|\/)shop\.html$/.test(to.pathname) || [...to.searchParams.keys()].some(k => !["cat", "tag"].includes(k))) return;
      e.preventDefault();
      const u = to.searchParams;
      Object.assign(S, { cat: list(u.get("cat")), tag: u.get("tag") || "", group: "", drop: false, q: "", page: 1 });
      clearFilters(S);
      update();
    }
  });

  render();
})();
