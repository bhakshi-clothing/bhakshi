/* BHAKSHI — shop / "The Drop" listing page (v2).
   One state object drives everything and is mirrored to the URL (history.replaceState),
   so every filtered / sorted / searched view is shareable.
   The page scales with the catalogue:
     • small drop (≤ 8 products, 1 category)  → slim toolbar: size-in-stock chips, sort, view toggle
     • bigger catalogue                         → full filter system (sidebar on desktop, bottom sheet on mobile)
   Views: grid (productCard) · big (1-up editorial cards) · list (typographic rows). */
(() => {
  "use strict";
  if (document.body.dataset.page !== "shop") return;

  const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = () => matchMedia("(hover: hover) and (pointer: fine)").matches;
  const EASE = "cubic-bezier(.7,0,.2,1)";
  const EASE_OUT = "cubic-bezier(.2,.7,.1,1)";

  /* ---------- contract helpers with safe fallbacks (app.js owns the real ones) ---------- */
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
  const LIVE_CATS = () => (typeof liveCategories === "function" ? liveCategories() : CATEGORIES.filter(c => PRODUCTS.some(p => p.category === c.id)));
  const WA = t => (typeof waLink === "function" ? waLink(t) : `https://wa.me/?text=${encodeURIComponent(t)}`);
  const short = p => String(p.name).split(" — ")[0];
  const pad2 = n => String(Math.max(0, n | 0)).padStart(2, "0");
  const numOf = p => pad2(PRODUCTS.indexOf(p) + 1);
  const gsmOf = p => ((p.fabric || "").match(/(\d{3})\s*GSM/i) || [])[1];
  const DROP = STORE.drop || { number: "01", name: "" };
  const dropLabel = `DROP ${DROP.number}${DROP.name ? " — " + DROP.name : ""}`;

  /* SLIM = small catalogue in one category: hide the filter sidebar */
  const SLIM = PRODUCTS.length <= 8 && LIVE_CATS().length <= 1;
  document.body.classList.toggle("shop-slim", SLIM);
  document.body.classList.toggle("shop-full", !SLIM);

  /* ---------- copy ---------- */
  const TAGS = {
    new:        { title: "New In",      desc: "Fresh off the press. The latest pieces in the line-up." },
    bestseller: { title: "Bestsellers", desc: "The ones that keep selling out first." },
    sale:       { title: "Sale",        desc: "Marked down while sizes last." },
    office:     { title: "Office",      desc: "Pieces that survive the five-day week." },
    casual:     { title: "Casual",      desc: "Weekend, chai runs, everything unplanned." },
    athleisure: { title: "Athleisure",  desc: "Gym, airport, sofa. Repeat." },
    festive:    { title: "Festive",     desc: "Colour for every celebration." }
  };
  const CAT_DESC = {
    tshirts: "Heavyweight cotton tees with big back prints, cut boxy and oversized.",
    shirts: "Camp collars and overshirts for the days a tee won't cut it.",
    polos: "Piqué polos with ribbed collars. Dressed down, done right.",
    kurtas: "Easy cotton kurtas, cut cleaner than the usual.",
    hoodies: "Brushed fleece for Delhi winters and over-cooled offices.",
    jackets: "Outer layers that finish the fit.",
    jeans: "Denim in relaxed and straight cuts, washed for a lived-in feel.",
    trousers: "Pleated and tapered bottoms that go from desk to dinner.",
    joggers: "Cargos and knit joggers for travel days and lazy Sundays.",
    shorts: "Above-knee shorts, built for the long Indian summer.",
    coords: "Matching sets. One decision, a complete fit."
  };
  const GROUP_DESC = {
    Topwear: "Tees, shirts, polos and kurtas.",
    Winterwear: "Layers for every kind of Indian winter.",
    Bottoms: "Denim, cargos and joggers.",
    "Co-ords": "Sets that do the styling for you."
  };
  const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
  const OCCASIONS = [["office", "Office"], ["casual", "Casual"], ["athleisure", "Athleisure"], ["festive", "Festive"]];
  const FITS = ["Slim", "Regular", "Relaxed", "Oversized"];
  const LETTER = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
  const HAS_DISCOUNT = PRODUCTS.some(p => p.mrp > p.price);
  const SORTS = [
    ["featured", "Featured"],
    ["price-asc", "Price ↑"],
    ["price-desc", "Price ↓"],
    ["stock-asc", "Low stock first"],
    ...(SLIM ? [] : [["new", "Newest"]]),
    ...(!SLIM && HAS_DISCOUNT ? [["discount", "Biggest discount"]] : [])
  ];
  const VIEWS = [
    ["grid", "Grid", `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="1" y="1" width="6" height="6"/><rect x="9" y="1" width="6" height="6"/><rect x="1" y="9" width="6" height="6"/><rect x="9" y="9" width="6" height="6"/></svg>`],
    ["big", "Big", `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="1" y="1" width="14" height="10"/><rect x="1" y="13" width="14" height="2"/></svg>`],
    ["list", "List", `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="1" y="2" width="3" height="3"/><rect x="6" y="3" width="9" height="1.4"/><rect x="1" y="6.5" width="3" height="3"/><rect x="6" y="7.3" width="9" height="1.4"/><rect x="1" y="11" width="3" height="3"/><rect x="6" y="11.8" width="9" height="1.4"/></svg>`]
  ];

  const slug = s => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const sizeKey = s => (LETTER.includes(s) ? LETTER.indexOf(s) : 100 + parseFloat(s));
  const groupOfId = id => (CATEGORIES.find(c => c.id === id) || {}).group;
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const list = v => (v ? v.split(",").map(x => x.trim()).filter(Boolean) : []);

  /* ---------- colour facets ---------- */
  const COLORS = [];
  PRODUCTS.forEach(p => {
    const id = slug(p.colorName || p.color);
    if (!COLORS.some(c => c.id === id)) COLORS.push({ id, name: p.colorName || p.color, hex: p.color });
  });

  /* ---------- state <-> URL ---------- */
  const params = new URLSearchParams(location.search);
  const num = v => (v !== null && v !== "" && !isNaN(+v) ? +v : null);
  let savedView = "";
  try { savedView = localStorage.getItem("bhakshi_shopview") || ""; } catch (e) { /* ignore */ }
  const pickView = v => (VIEWS.some(x => x[0] === v) ? v : "");
  const S = {
    group: params.get("group") || "",
    cat: list(params.get("cat")),
    tag: params.get("tag") || "",
    q: (params.get("q") || "").trim(),
    size: list(params.get("size")),
    fit: list(params.get("fit")),
    color: list(params.get("color")),
    occ: list(params.get("occ")),
    min: num(params.get("min")),
    max: num(params.get("max")),
    stock: params.get("instock") === "1",
    sort: SORTS.some(s => s[0] === params.get("sort")) ? params.get("sort") : "featured",
    view: pickView(params.get("view")) || pickView(savedView) || "grid"
  };
  if (S.group && !CATEGORIES.some(c => c.group === S.group)) S.group = "";
  if (S.tag && !TAGS[S.tag] && !PRODUCTS.some(p => (p.tags || []).includes(S.tag))) S.tag = "";
  const clone = st => JSON.parse(JSON.stringify(st));

  function writeURL() {
    const u = new URLSearchParams();
    if (S.group) u.set("group", S.group);
    if (S.cat.length) u.set("cat", S.cat.join(","));
    if (S.tag) u.set("tag", S.tag);
    if (S.q) u.set("q", S.q);
    if (S.size.length) u.set("size", S.size.join(","));
    if (S.fit.length) u.set("fit", S.fit.join(","));
    if (S.color.length) u.set("color", S.color.join(","));
    if (S.occ.length) u.set("occ", S.occ.join(","));
    if (S.min !== null) u.set("min", S.min);
    if (S.max !== null) u.set("max", S.max);
    if (S.stock) u.set("instock", "1");
    if (S.sort !== "featured") u.set("sort", S.sort);
    if (S.view !== "grid") u.set("view", S.view);
    const qs = u.toString().replace(/%2C/g, ",");
    history.replaceState(history.state, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
  }

  /* ---------- search ---------- */
  const PRINT_WORDS = { core: "core logo stack", monsoon: "monsoon rain", chai: "chai tea cutting break", express: "train railway express night route", hornok: "horn ok please truck art highway", logo: "logo" };
  const norm = s => String(s).toLowerCase().replace(/[-_/]/g, "").replace(/[^a-z0-9 ]/g, " ");
  const stem = w => (w.length > 3 && w.endsWith("es") && !w.endsWith("ses") ? w.slice(0, -2) : w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w);
  const SYN = { tee: "tshirt", tees: "tshirt", tshirt: "tshirt", top: "topwear", pant: "trouser", pants: "trouser", denim: "jean", sweatshirt: "hoodie", track: "jogger", tea: "chai", rain: "monsoon", truck: "hornok", train: "express" };
  function hay(p) {
    if (p._hay) return p._hay;
    const c = CATEGORIES.find(x => x.id === p.category) || {};
    const pr = p.print || {};
    const raw = [p.name, p.category, c.name, c.group, p.colorName, p.fabric, p.fit, p.shape, (p.tags || []).join(" "), p.family, PRINT_WORDS[pr.front] || "", PRINT_WORDS[pr.back] || "", p.desc || ""].join(" ");
    const n = norm(raw);
    p._hay = n + " " + n.split(/\s+/).map(stem).join(" ");
    return p._hay;
  }
  function matchesQuery(p, q) {
    const words = norm(q).split(/\s+/).filter(Boolean);
    if (!words.length) return true;
    const h = hay(p);
    return words.every(w => {
      const s = stem(SYN[w] || w);
      return h.includes(w) || h.includes(s);
    });
  }
  function lev(a, b) {
    const m = [];
    for (let i = 0; i <= b.length; i++) m[i] = [i];
    for (let j = 0; j <= a.length; j++) m[0][j] = j;
    for (let i = 1; i <= b.length; i++) for (let j = 1; j <= a.length; j++)
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (b[i - 1] === a[j - 1] ? 0 : 1));
    return m[b.length][a.length];
  }
  /* "Did you mean": products (by name) for small catalogues, categories for bigger ones */
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
    if (SLIM) {
      return PRODUCTS.map(p => ({ href: `product.html?id=${encodeURIComponent(p.id)}`, label: short(p), best: score(norm(p.name + " " + p.colorName).split(/\s+/)) }))
        .filter(x => x.best <= 0.5).sort((a, b) => a.best - b.best).slice(0, 4);
    }
    return LIVE_CATS().map(c => {
      const terms = norm(c.name + " " + c.id).split(/\s+/).filter(Boolean);
      PRODUCTS.filter(p => p.category === c.id).forEach(p => terms.push(...norm(p.colorName + " " + p.fabric + " " + p.fit).split(/\s+/)));
      return { href: `shop.html?cat=${c.id}`, label: c.name, best: score(terms) };
    }).filter(x => x.best <= 0.5).sort((a, b) => a.best - b.best).slice(0, 4);
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
    // sizes are product-level: "in size M" means the style comes in M and is still in stock
    if (skip !== "size" && st.size.length && (p.stock <= 0 || !p.sizes.some(s => st.size.includes(s)))) return false;
    if (skip !== "fit" && st.fit.length && !st.fit.includes(p.fit)) return false;
    if (skip !== "color" && st.color.length && !st.color.includes(slug(p.colorName || p.color))) return false;
    if (skip !== "occ" && st.occ.length && !(p.tags || []).some(t => st.occ.includes(t))) return false;
    if (skip !== "price" && st.min !== null && p.price < st.min) return false;
    if (skip !== "price" && st.max !== null && p.price > st.max) return false;
    if (skip !== "stock" && st.stock && p.stock <= 0) return false;
    return true;
  }
  function sortList(arr, sort) {
    const idx = new Map(PRODUCTS.map((p, i) => [p.id, i]));
    const out = [...arr];
    const by = {
      featured: (a, b) => idx.get(a.id) - idx.get(b.id),
      new: (a, b) => ((b.tags || []).includes("new") - (a.tags || []).includes("new")) || idx.get(b.id) - idx.get(a.id),
      "price-asc": (a, b) => a.price - b.price || idx.get(a.id) - idx.get(b.id),
      "price-desc": (a, b) => b.price - a.price || idx.get(a.id) - idx.get(b.id),
      "stock-asc": (a, b) => a.stock - b.stock || idx.get(a.id) - idx.get(b.id),
      discount: (a, b) => discount(b) - discount(a) || a.price - b.price
    }[sort] || (() => 0);
    out.sort((a, b) => ((a.stock <= 0) - (b.stock <= 0)) || by(a, b)); // sold out always last
    return out;
  }
  const results = (st = S) => sortList(scoped().filter(p => passes(p, st)), st.sort);

  function priceBounds() {
    const ps = scoped().map(p => p.price);
    if (!ps.length) return [0, 0];
    return [Math.floor(Math.min(...ps) / 100) * 100, Math.ceil(Math.max(...ps) / 100) * 100];
  }

  /* ---------- drop countdown ticker ---------- */
  const fmtLeft = ms => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return d ? `${pad2(d)}d ${pad2(h)}h ${pad2(m)}m` : `${pad2(h)}h ${pad2(m)}m ${pad2(sec)}s`;
  };
  let wasLive = DS().live;
  setInterval(() => {
    const d = DS();
    if (d.live !== wasLive) { wasLive = d.live; render(false); return; }
    if (!d.live) $$("[data-drop-left]").forEach(el => (el.textContent = fmtLeft(d.msLeft)));
  }, 1000);

  /* ---------- header ---------- */
  function heading() {
    if (S.q) return { eyebrow: "[ SEARCH ]", title: `Search: “${esc(S.q)}”`, plain: `Search: "${S.q}"`, desc: "", long: true };
    if (S.tag && TAGS[S.tag]) return { eyebrow: `[ ${dropLabel} ]`, title: esc(TAGS[S.tag].title), plain: TAGS[S.tag].title, desc: TAGS[S.tag].desc };
    if (S.tag) return { eyebrow: "[ EDIT ]", title: esc(S.tag), plain: S.tag, desc: "" };
    if (S.cat.length === 1) {
      const c = CATEGORIES.find(x => x.id === S.cat[0]);
      if (c) return { eyebrow: `[ ${c.group.toUpperCase()} ]`, title: esc(c.name), plain: c.name, desc: CAT_DESC[c.id] || "" };
    }
    if (S.cat.length > 1) {
      const names = S.cat.map(catName);
      const t = names.length === 2 ? names.join(" & ") : "Your selection";
      return { eyebrow: `[ ${(S.group || "Shop").toUpperCase()} ]`, title: esc(t), plain: t, desc: names.length > 2 ? names.join(", ") : "" };
    }
    if (S.group) return { eyebrow: "[ COLLECTION ]", title: esc(S.group), plain: S.group, desc: GROUP_DESC[S.group] || "" };
    return { eyebrow: `[ ${dropLabel} ]`, title: "The Drop", plain: "The Drop", desc: dropBlurb() };
  }
  function dropBlurb() {
    const n = PRODUCTS.length;
    const shapes = [...new Set(PRODUCTS.map(p => p.shape))], fits = [...new Set(PRODUCTS.map(p => p.fit))], gsm = [...new Set(PRODUCTS.map(gsmOf))];
    if (shapes.length === 1 && shapes[0] === "tee") {
      return `${WORDS[n] || n} ${fits.length === 1 ? fits[0].toLowerCase() + " " : ""}graphic tees${gsm.length === 1 && gsm[0] ? ` in ${gsm[0]} GSM cotton` : ""}. Limited units of each, made in India, built to take monsoon washes and still hold the print.`;
    }
    return "Limited units, made in India. Heavy fabrics, loud prints, clean fits.";
  }

  function renderHead(count) {
    const h = heading();
    $("#shopEyebrow").textContent = h.eyebrow;
    const t = $("#shopTitle");
    t.innerHTML = `<span class="drop-title-t">${h.title}</span><sup class="drop-count" id="shopCount">(${pad2(count)})</sup>`;
    t.classList.toggle("is-long", !!h.long || h.plain.length > 12);
    t.classList.toggle("is-xlong", h.plain.length > 22);
    const desc = S.q
      ? (count ? `${pad2(count)} ${count === 1 ? "piece matches" : "pieces match"} your search.` : "Nothing matched that. Try one of these instead.")
      : h.desc;
    $("#shopDesc").textContent = desc;
    $("#shopDesc").hidden = !desc;
    $("#toolbarCount").innerHTML = `<b>${pad2(count)}</b> ${count === 1 ? "style" : "styles"}`;
    document.title = `${h.plain} | ${STORE.name}`;
    const md = $('meta[name="description"]');
    if (md && h.desc && !S.q) md.setAttribute("content", `${h.plain} at ${STORE.name}. ${h.desc}`.slice(0, 160));

    // breadcrumbs
    const crumbs = [`<li><a href="index.html">Home</a></li>`];
    if (h.plain === "The Drop") crumbs.push(`<li aria-current="page"><span>Shop</span></li>`);
    else {
      crumbs.push(`<li><a href="shop.html">Shop</a></li>`);
      const g = S.group || (S.cat.length === 1 ? groupOfId(S.cat[0]) : "");
      if (g && !S.q && !S.tag && S.cat.length) crumbs.push(`<li><a href="shop.html?group=${encodeURIComponent(g)}">${esc(g)}</a></li>`);
      crumbs.push(`<li aria-current="page"><span>${esc(h.plain)}</span></li>`);
    }
    $("#shopCrumbs").innerHTML = crumbs.join("");

    // status: live dot or countdown
    const d = DS(), st = $("#shopStatus");
    const all = PRODUCTS, left = all.reduce((s, p) => s + Math.max(0, p.stock), 0);
    const total = all.every(p => p.edition) ? all.reduce((s, p) => s + p.edition, 0) : 0;
    const key = (d.live ? "live:" : "soon:") + left;
    if (st.dataset.key === key) { /* unchanged: keep the running countdown */ }
    else if (d.live) {
      st.dataset.key = key;
      st.className = "shop-status is-live";
      st.innerHTML = `<span class="live-dot" aria-hidden="true"></span><span>Live now</span><span class="shop-status-sep" aria-hidden="true">/</span><span>${left}${total ? ` of ${total}` : ""} units left</span>`;
    } else {
      st.dataset.key = key;
      st.className = "shop-status is-soon";
      st.innerHTML = `<span>Drops in</span> <span class="drop-cd" id="dropCd">${fmtLeft(d.msLeft)}</span>`;
      if (typeof countdown === "function" && d.launch) { try { countdown($("#dropCd"), d.launch); } catch (e) { /* keep text */ } }
      else $("#dropCd").setAttribute("data-drop-left", "");
    }

    // meta strip
    const ps = all.map(p => p.price), lo = Math.min(...ps), hi = Math.max(...ps);
    const cells = [
      ["Styles", pad2(LIVE_CATS().length > 1 ? scoped().length : all.length)],
      ["Units left", total ? `${left} / ${total}` : String(left)],
      ["Price", lo === hi ? rupee(lo) : `${rupee(lo)} – ${rupee(hi)}`],
      ["Shipping", `Free over ${rupee(STORE.freeShippingAbove)}`]
    ];
    $("#shopMeta").innerHTML = cells.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("");
    $("#shopMeta").hidden = !!S.q;
  }

  /* ---------- category chips (full catalogue only) ---------- */
  function renderChips() {
    const el = $("#shopChips");
    if (SLIM) { el.innerHTML = ""; el.hidden = true; return; }
    const cats = (S.group ? CATEGORIES.filter(c => c.group === S.group) : CATEGORIES);
    const base = scoped();
    const all = !S.cat.length;
    if (!base.length) { el.innerHTML = ""; el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML =
      `<button type="button" class="chip ${all ? "active" : ""}" data-chip="" aria-pressed="${all}">All <span class="chip-n">${pad2(base.length)}</span></button>` +
      cats.map(c => {
        const n = base.filter(p => p.category === c.id).length;
        if (!n && !S.cat.includes(c.id)) return "";
        const on = S.cat.length === 1 && S.cat[0] === c.id;
        return `<button type="button" class="chip ${on ? "active" : ""}" data-chip="${c.id}" aria-pressed="${on}">${esc(c.name)} <span class="chip-n">${pad2(n)}</span></button>`;
      }).join("");
  }

  /* ---------- slim toolbar: size-in-stock chips ---------- */
  function renderSizeChips() {
    const el = $("#tbSizes");
    if (!SLIM) { el.innerHTML = ""; el.hidden = true; return; }
    const base = scoped();
    const sizes = [...new Set(base.flatMap(p => p.sizes))].sort((a, b) => sizeKey(a) - sizeKey(b));
    if (!sizes.length) { el.innerHTML = ""; el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = `<span class="tb-label" aria-hidden="true">Size</span>` + sizes.map(s => {
      const n = base.filter(p => passes(p, S, "size") && p.stock > 0 && p.sizes.includes(s)).length;
      const on = S.size.includes(s);
      return `<button type="button" class="szchip ${n ? "" : "is-out"}" data-szchip="${esc(s)}" aria-pressed="${on}" ${!n && !on ? "disabled" : ""}
        aria-label="Size ${esc(s)}: ${n ? `${n} ${n === 1 ? "style" : "styles"} in stock` : "out of stock"}"><span>${esc(s)}</span><i>${pad2(n)}</i></button>`;
    }).join("") + (S.size.length ? `<button type="button" class="tb-reset" data-szclear>Clear</button>` : "");
  }

  function renderSort() {
    const sel = $("#shopSort");
    if (!sel.options.length) sel.innerHTML = SORTS.map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
    sel.value = S.sort;
  }
  function renderViews() {
    $("#shopViews").innerHTML = VIEWS.map(([v, l, ic]) =>
      `<button type="button" class="tb-view" data-view="${v}" aria-pressed="${S.view === v}" title="${l} view">${ic}<span>${l}</span></button>`).join("");
  }

  /* ---------- full filter panel (sidebar + mobile sheet) ---------- */
  let collapsed;
  try { collapsed = new Set(JSON.parse(sessionStorage.getItem("bhakshi_fcollapsed") || '["occ"]')); } catch (e) { collapsed = new Set(["occ"]); }
  const chev = `<svg class="fg-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;
  function group(key, title, body, n) {
    const open = !collapsed.has(key);
    return `<div class="fgroup ${open ? "open" : ""}" data-g="${key}">
      <button type="button" class="fgroup-head" aria-expanded="${open}" data-toggle="${key}">
        <span>${title}${n ? ` <b class="fgroup-n">${n}</b>` : ""}</span>${chev}
      </button>
      <div class="fgroup-body"><div class="fgroup-inner">${body}</div></div>
    </div>`;
  }
  const check = (f, v, label, on, count, extra = "") =>
    `<label class="fopt ${!count && !on ? "is-empty" : ""}">
      <input type="checkbox" data-f="${f}" value="${esc(v)}" data-key="${f}:${esc(v)}" ${on ? "checked" : ""} ${!count && !on ? "disabled" : ""}>
      <span class="fbox" aria-hidden="true"></span>${extra}<span class="fopt-l">${label}</span><span class="fopt-n">${count}</span>
    </label>`;

  function panelHTML(st) {
    const base = scoped();
    const cnt = (skip, fn) => base.filter(p => passes(p, st, skip) && fn(p)).length;
    const out = [];

    const cats = S.group ? CATEGORIES.filter(c => c.group === S.group) : CATEGORIES;
    const groups = [...new Set(cats.map(c => c.group))];
    const catBody = groups.map(g => {
      const items = cats.filter(c => c.group === g).map(c => {
        const n = cnt("cat", p => p.category === c.id);
        if (!n && !st.cat.includes(c.id)) return "";
        return check("cat", c.id, esc(c.name), st.cat.includes(c.id), n);
      }).join("");
      return items ? (groups.length > 1 ? `<p class="fsub">${esc(g)}</p>` : "") + items : "";
    }).join("");
    out.push(group("cat", "Category", catBody || `<p class="fnone">No categories</p>`, st.cat.length));

    const sizes = [...new Set(base.flatMap(p => p.sizes))].sort((a, b) => sizeKey(a) - sizeKey(b));
    const sizeBtn = s => {
      const n = cnt("size", p => p.stock > 0 && p.sizes.includes(s)), on = st.size.includes(s);
      return `<button type="button" class="fsize" data-f="size" data-v="${esc(s)}" data-key="size:${esc(s)}" aria-pressed="${on}" ${!n && !on ? "disabled" : ""} aria-label="Size ${esc(s)}, ${n} in stock">${esc(s)}</button>`;
    };
    const letters = sizes.filter(s => LETTER.includes(s)), nums = sizes.filter(s => !LETTER.includes(s));
    const both = letters.length && nums.length;
    const sizeBody = (letters.length ? `${both ? `<p class="fsub">Tops &amp; easy fits</p>` : ""}<div class="fsizes">${letters.map(sizeBtn).join("")}</div>` : "") +
      (nums.length ? `${both ? `<p class="fsub fsub-gap">Waist</p>` : ""}<div class="fsizes">${nums.map(sizeBtn).join("")}</div>` : "");
    out.push(group("size", "Size", sizeBody || `<p class="fnone">No sizes</p>`, st.size.length));

    const fits = FITS.filter(f => base.some(p => p.fit === f));
    if (fits.length > 1) out.push(group("fit", "Fit", fits.map(f => check("fit", f, f, st.fit.includes(f), cnt("fit", p => p.fit === f))).join(""), st.fit.length));

    const colBody = `<div class="fcolors">${COLORS.map(c => {
      const n = cnt("color", p => slug(p.colorName || p.color) === c.id), on = st.color.includes(c.id);
      if (!n && !on) return "";
      return `<button type="button" class="fcolor" data-f="color" data-v="${c.id}" data-key="color:${c.id}" aria-pressed="${on}" title="${esc(c.name)}">
        <span class="fdot" style="--c:${esc(c.hex)}" aria-hidden="true"></span><span class="fcolor-l">${esc(c.name)}</span><span class="fopt-n">${n}</span></button>`;
    }).join("")}</div>`;
    out.push(group("color", "Colour", colBody.includes("fcolor") ? colBody : `<p class="fnone">No colours match the current filters.</p>`, st.color.length));

    const [lo, hi] = priceBounds();
    const a = st.min ?? lo, b = st.max ?? hi;
    const priceBody = hi > lo ? `<div class="frange" data-lo="${lo}" data-hi="${hi}">
        <div class="frange-track"><span class="frange-fill"></span></div>
        <input type="range" class="frange-in" data-r="min" min="${lo}" max="${hi}" step="50" value="${a}" aria-label="Minimum price" data-key="price:min">
        <input type="range" class="frange-in" data-r="max" min="${lo}" max="${hi}" step="50" value="${b}" aria-label="Maximum price" data-key="price:max">
      </div>
      <div class="fprice">
        <label><span>Min</span><b>₹</b><input type="number" inputmode="numeric" data-p="min" min="${lo}" max="${hi}" step="50" value="${a}" aria-label="Minimum price in rupees" data-key="price:nmin"></label>
        <span class="fprice-sep" aria-hidden="true">–</span>
        <label><span>Max</span><b>₹</b><input type="number" inputmode="numeric" data-p="max" min="${lo}" max="${hi}" step="50" value="${b}" aria-label="Maximum price in rupees" data-key="price:nmax"></label>
      </div>` : `<p class="fnone">All pieces at ${rupee(lo)}</p>`;
    out.push(group("price", "Price", priceBody, st.min !== null || st.max !== null ? "•" : 0));

    const inStock = cnt("stock", p => p.stock > 0);
    out.push(group("stock", "Availability", `<label class="fswitch">
        <input type="checkbox" data-f="stock" data-key="stock" ${st.stock ? "checked" : ""}>
        <span class="fswitch-ui" aria-hidden="true"></span><span>In stock only</span><span class="fopt-n">${inStock}</span></label>`, st.stock ? "•" : 0));

    const occs = OCCASIONS.filter(([v]) => base.some(p => (p.tags || []).includes(v)));
    if (occs.length) out.push(group("occ", "Occasion", occs.map(([v, l]) => check("occ", v, l, st.occ.includes(v), cnt("occ", p => (p.tags || []).includes(v)))).join(""), st.occ.length));

    return out.join("");
  }

  function paintRange(root) {
    const r = $(".frange", root);
    if (!r) return;
    const lo = +r.dataset.lo, hi = +r.dataset.hi;
    const a = +$('[data-r="min"]', r).value, b = +$('[data-r="max"]', r).value;
    const fill = $(".frange-fill", r);
    fill.style.left = ((a - lo) / (hi - lo)) * 100 + "%";
    fill.style.right = (100 - ((b - lo) / (hi - lo)) * 100) + "%";
  }

  function bindPanel(root, getState, onChange) {
    root.addEventListener("click", e => {
      const t = e.target.closest("[data-toggle]");
      if (t) {
        const g = t.closest(".fgroup"), k = t.dataset.toggle, open = !g.classList.contains("open");
        g.classList.toggle("open", open);
        t.setAttribute("aria-expanded", open);
        open ? collapsed.delete(k) : collapsed.add(k);
        try { sessionStorage.setItem("bhakshi_fcollapsed", JSON.stringify([...collapsed])); } catch (err) { /* ignore */ }
        return;
      }
      const b = e.target.closest("button[data-f]");
      if (b) {
        const st = getState(), f = b.dataset.f, v = b.dataset.v;
        st[f] = st[f].includes(v) ? st[f].filter(x => x !== v) : [...st[f], v];
        onChange(f);
      }
    });
    root.addEventListener("change", e => {
      const el = e.target, st = getState();
      if (el.matches('input[type="checkbox"][data-f]')) {
        const f = el.dataset.f;
        if (f === "stock") st.stock = el.checked;
        else st[f] = el.checked ? [...new Set([...st[f], el.value])] : st[f].filter(x => x !== el.value);
        onChange(f);
      } else if (el.matches("[data-r]") || el.matches("[data-p]")) {
        commitPrice(root, st, el);
        onChange("price");
      }
    });
    root.addEventListener("input", e => {
      const el = e.target;
      if (!el.matches("[data-r]")) return;
      const r = el.closest(".frange");
      const mn = $('[data-r="min"]', r), mx = $('[data-r="max"]', r);
      if (+mn.value > +mx.value - 50) el === mn ? (mn.value = +mx.value - 50) : (mx.value = +mn.value + 50);
      $('[data-p="min"]', root).value = mn.value;
      $('[data-p="max"]', root).value = mx.value;
      paintRange(root);
      root.dispatchEvent(new CustomEvent("price:preview", { detail: { min: +mn.value, max: +mx.value } }));
    });
    root.addEventListener("keydown", e => {
      if (e.key === "Enter" && e.target.matches("[data-p]")) { e.preventDefault(); e.target.blur(); }
    });
  }
  function commitPrice(root, st, el) {
    const r = $(".frange", root);
    if (!r) return;
    const lo = +r.dataset.lo, hi = +r.dataset.hi;
    let a, b;
    if (el.matches("[data-p]")) { a = +$('[data-p="min"]', root).value || lo; b = +$('[data-p="max"]', root).value || hi; }
    else { a = +$('[data-r="min"]', r).value; b = +$('[data-r="max"]', r).value; }
    a = Math.max(lo, Math.min(a, hi)); b = Math.max(lo, Math.min(b, hi));
    if (a > b) [a, b] = [b, a];
    st.min = a <= lo ? null : a;
    st.max = b >= hi ? null : b;
  }
  function renderPanel(root, st) {
    if (SLIM && root.id === "sidePanel") { root.innerHTML = ""; return; }
    const focusKey = root.contains(document.activeElement) ? document.activeElement.dataset.key : null;
    const scroller = root.closest(".shop-side, .fsheet-body") || root;
    const top = scroller.scrollTop;
    root.innerHTML = panelHTML(st);
    paintRange(root);
    scroller.scrollTop = top;
    if (focusKey) { const el = root.querySelector(`[data-key="${CSS.escape(focusKey)}"]`); el && el.focus({ preventScroll: true }); }
  }

  /* ---------- active pills ---------- */
  const X = `<svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="square"/></svg>`;
  function activeFilters(st) {
    const out = [];
    if (S.q) out.push({ k: "q", label: `“${S.q}”` });
    if (S.tag) out.push({ k: "tag", label: TAGS[S.tag] ? TAGS[S.tag].title : S.tag });
    st.cat.forEach(v => out.push({ k: "cat", v, label: catName(v) }));
    st.size.forEach(v => out.push({ k: "size", v, label: `Size ${v}` }));
    st.fit.forEach(v => out.push({ k: "fit", v, label: `${v} fit` }));
    st.color.forEach(v => { const c = COLORS.find(x => x.id === v); out.push({ k: "color", v, label: c ? c.name : v, hex: c && c.hex }); });
    st.occ.forEach(v => out.push({ k: "occ", v, label: (OCCASIONS.find(o => o[0] === v) || [, v])[1] }));
    if (st.min !== null || st.max !== null) { const [lo, hi] = priceBounds(); out.push({ k: "price", label: `${rupee(st.min ?? lo)} – ${rupee(st.max ?? hi)}` }); }
    if (st.stock) out.push({ k: "stock", label: "In stock" });
    return out;
  }
  const filterCount = st => st.cat.length + st.size.length + st.fit.length + st.color.length + st.occ.length + (st.min !== null || st.max !== null ? 1 : 0) + (st.stock ? 1 : 0);

  function renderPills() {
    // In the slim layout the size chips already show their own state; only show query/tag pills there.
    const act = activeFilters(S).filter(a => !SLIM || a.k === "q" || a.k === "tag");
    const el = $("#shopPills");
    el.innerHTML = act.length ? act.map(a =>
      `<button type="button" class="pill" data-rm="${a.k}" data-v="${esc(a.v || "")}" aria-label="Remove ${esc(a.label)}">
        ${a.hex ? `<span class="fdot" style="--c:${esc(a.hex)}" aria-hidden="true"></span>` : ""}<span>${esc(a.label)}</span>${X}</button>`).join("") +
      (act.length > 1 ? `<button type="button" class="pill-clear" data-clear-all>Clear all</button>` : "") : "";
    el.hidden = !act.length;
    const n = filterCount(S);
    $("#sideClear").hidden = !n;
    $("#shopFabN").hidden = !n;
    $("#shopFabN").textContent = n;
  }
  function removeFilter(k, v) {
    if (k === "q") S.q = "";
    else if (k === "tag") S.tag = "";
    else if (k === "price") { S.min = null; S.max = null; }
    else if (k === "stock") S.stock = false;
    else S[k] = S[k].filter(x => x !== v);
  }
  const clearFilters = st => Object.assign(st, { cat: [], size: [], fit: [], color: [], occ: [], min: null, max: null, stock: false });

  /* ---------- item markup: stock meter, big card, list row, end tile ---------- */
  function meterHTML(p, compact) {
    const s = SI(p);
    const state = s.soldOut ? "Sold out" : s.low ? "Almost gone" : "In stock";
    const count = s.soldOut ? `00${s.total ? ` / ${pad2(s.total)}` : ""}` : `${pad2(s.left)}${s.total ? ` / ${pad2(s.total)}` : ""} left`;
    const pct = s.soldOut ? 0 : Math.max(4, Math.min(100, s.total ? s.pct : 100));
    return `<div class="meter ${s.low ? "is-low" : ""} ${s.soldOut ? "is-out" : ""} ${compact ? "is-compact" : ""}">
      <div class="meter-row"><span class="meter-n">${count}</span>${compact ? "" : `<span class="meter-s">${state}</span>`}</div>
      <span class="meter-bar" role="img" aria-label="${s.soldOut ? "Sold out" : `${s.left}${s.total ? " of " + s.total : ""} units left`}"><i style="width:${pct}%"></i></span>
    </div>`;
  }
  const priceHTML = p => `<span class="sp-price"><b>${rupee(p.price)}</b>${p.mrp > p.price ? `<s>${rupee(p.mrp)}</s><em>${discount(p)}% off</em>` : ""}</span>`;
  const bare = (p, i, view) => productImage(p, i, view, { bg: false }); // art without its own studio bg, for our panels
  function backMedia(p) {
    if (p.images && p.images.length > 1) return bare(p, 1, "back");
    if (!p.images || !p.images.length) return bare(p, 0, "back");
    return "";
  }
  const HEART = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 20.3s-7.8-4.6-7.8-10.3A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 7.8 2.6c0 5.7-7.8 10.3-7.8 10.3Z" stroke-linejoin="round"/></svg>`;
  const ARROW = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 12h15m-5-5 5 5-5 5" stroke-linecap="square"/></svg>`;
  const wished = id => (typeof Wishlist !== "undefined" && Wishlist.has ? Wishlist.has(id) : false);

  function buyBlock(p) {
    const s = SI(p), d = DS();
    if (s.soldOut) {
      return `<div class="bc-state is-out"><span>Sold out</span>
        <a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${esc(WA(`Hi ${STORE.name}! Please tell me if "${p.name}" comes back. ${new URL("product.html?id=" + encodeURIComponent(p.id), location.href).href}`))}">Notify me on WhatsApp</a></div>`;
    }
    if (!d.live) {
      return `<div class="bc-state is-soon"><span>Drops in <b data-drop-left>${fmtLeft(d.msLeft)}</b></span>
        <a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="${esc(WA(`Hi ${STORE.name}! Remind me when ${dropLabel} goes live. I'm eyeing "${p.name}".`))}">Notify me</a></div>`;
    }
    return `<div class="bc-sizes" role="group" aria-label="Quick add ${esc(short(p))}"><span class="bc-sizes-l">Quick add</span>${p.sizes.map(z =>
      `<button type="button" data-add="${esc(p.id)}" data-size="${esc(z)}" aria-label="Add ${esc(short(p))}, size ${esc(z)}, to bag">${esc(z)}</button>`).join("")}</div>`;
  }

  function bigCard(p, i) {
    const url = `product.html?id=${encodeURIComponent(p.id)}`, back = backMedia(p), s = SI(p);
    const gsm = gsmOf(p), fabricBits = (p.fabric || "").split(",").map(x => x.trim()).filter(Boolean);
    const specs = [p.fit, gsm ? `${gsm} GSM` : "", fabricBits[0], fabricBits[2]].filter(Boolean).slice(0, 4);
    const badge = s.soldOut ? `<span class="badge badge-hot">Sold out</span>` : s.low ? `<span class="badge badge-hot">Low stock</span>` : (p.tags || []).includes("bestseller") ? `<span class="badge badge-accent">Bestseller</span>` : (p.tags || []).includes("new") ? `<span class="badge badge-ghost">New</span>` : "";
    return `<article class="bigcard ${s.soldOut ? "is-sold" : ""} ${i % 2 ? "is-flip" : ""}" data-id="${esc(p.id)}">
      <div class="bigcard-media">
        <span class="bigcard-no" aria-hidden="true">${numOf(p)}</span>
        <a class="bigcard-art" href="${url}" tabindex="-1" aria-hidden="true">
          <span class="flip" data-side="front">
            <span class="flip-face flip-front">${bare(p, 0, "front")}</span>
            ${back ? `<span class="flip-face flip-back">${back}</span>` : ""}
          </span>
        </a>
        <span class="tag-tl" data-flip-label>[FRONT]</span>
        ${badge ? `<span class="tag-tr">${badge}</span>` : ""}
        ${back ? `<div class="flip-toggle" role="group" aria-label="Show front or back">
          <button type="button" data-flip="front" aria-pressed="true">Front</button><button type="button" data-flip="back" aria-pressed="false">Back</button></div>` : ""}
      </div>
      <div class="bigcard-info">
        <p class="bigcard-eyebrow"><span>No. ${numOf(p)}</span><span>${esc(p.colorName || "")}</span></p>
        <h2 class="bigcard-name"><a href="${url}">${esc(short(p))}</a></h2>
        <p class="bigcard-story">${esc(p.desc || "")}</p>
        <ul class="bigcard-specs">${specs.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
        <div class="bigcard-buy">${priceHTML(p)}${meterHTML(p)}</div>
        ${buyBlock(p)}
        <div class="bigcard-foot">
          <a class="link-arrow" href="${url}">View details</a>
          <button type="button" class="bigcard-wish" data-wish="${esc(p.id)}" aria-pressed="${wished(p.id)}" aria-label="${wished(p.id) ? "Remove from" : "Add to"} wishlist">${HEART}</button>
        </div>
      </div>
    </article>`;
  }

  function listRow(p) {
    const url = `product.html?id=${encodeURIComponent(p.id)}`, s = SI(p), gsm = gsmOf(p);
    return `<article class="lrow ${s.soldOut ? "is-sold" : ""} ${s.low ? "is-low" : ""}" data-id="${esc(p.id)}">
      <a class="lrow-link" href="${url}">
        <span class="lrow-no">${numOf(p)}</span>
        <span class="lrow-thumb">${productImage(p, 0, "front")}</span>
        <span class="lrow-main">
          <span class="lrow-name">${esc(short(p))}</span>
          <span class="lrow-meta">${[p.colorName, p.fit, gsm ? gsm + " GSM" : ""].filter(Boolean).map(esc).join(" · ")}</span>
        </span>
        <span class="lrow-stock">${meterHTML(p, true)}</span>
        <span class="lrow-price">${priceHTML(p)}</span>
        <span class="lrow-go" aria-hidden="true">${ARROW}</span>
      </a>
    </article>`;
  }

  function endTileHTML() {
    const n = PRODUCTS.length;
    return `<aside class="drop-tile" aria-label="End of drop">
      <p class="drop-tile-k">[ END OF ${esc(dropLabel.toUpperCase())} ]</p>
      <p class="drop-tile-big" aria-hidden="true"><span>That's</span><span class="outline-text">the drop</span></p>
      <p class="drop-tile-copy">${WORDS[n] || n} styles, limited units of each. Cut big on purpose. Not sure of your size? Thirty seconds, sorted.</p>
      <button type="button" class="btn btn-ghost btn-sm" data-fitfinder>Find my size</button>
    </aside>`;
  }

  /* ---------- results with FLIP ---------- */
  const tpl = document.createElement("template");
  function itemEl(p, view, i) {
    const html = view === "big" ? bigCard(p, i) : view === "list" ? listRow(p) : productCard(p);
    tpl.innerHTML = String(html).trim();
    const el = tpl.content.firstElementChild;
    if (el && !el.dataset.id) el.dataset.id = p.id;
    return el;
  }

  function renderGrid(items, animate) {
    const grid = $("#shopGrid");
    const view = S.view;
    const viewChanged = grid.dataset.rendered !== view;
    const motion = animate && !reduceMotion() && typeof grid.animate === "function";
    grid.dataset.view = view;
    grid.classList.toggle("grid-products", view === "grid");

    if (viewChanged) {
      grid.innerHTML = "";
      grid.dataset.rendered = view;
    }
    const existing = new Map($$(":scope > [data-id]", grid).map(el => [el.dataset.id, el]));
    const first = new Map();
    const gRect = grid.getBoundingClientRect();
    if (motion) existing.forEach((el, id) => first.set(id, el.getBoundingClientRect()));

    // leaving
    const keep = new Set(items.map(p => p.id));
    existing.forEach((el, id) => {
      if (keep.has(id)) return;
      if (!motion) { el.remove(); return; }
      const r = first.get(id);
      Object.assign(el.style, { position: "absolute", top: r.top - gRect.top + "px", left: r.left - gRect.left + "px", width: r.width + "px", height: r.height + "px", margin: 0, pointerEvents: "none", zIndex: 0 });
      el.classList.add("is-leaving");
      el.removeAttribute("data-id");
      el.animate([{ opacity: 1, transform: "scale(1)", filter: "none" }, { opacity: 0, transform: "scale(.96)", filter: "blur(4px)" }], { duration: 240, easing: EASE, fill: "forwards" })
        .finished.then(() => el.remove()).catch(() => el.remove());
    });
    $$(":scope > .shop-empty, :scope > .drop-tile", grid).forEach(el => el.remove());

    // order + enter
    const entering = [];
    const idxOf = new Map(PRODUCTS.map((p, i) => [p.id, i]));
    items.forEach((p, k) => {
      let el = existing.get(p.id);
      if (!el) { el = itemEl(p, view, view === "big" ? k : idxOf.get(p.id)); entering.push(el); }
      else if (view === "big") el.classList.toggle("is-flip", k % 2 === 1);
      grid.appendChild(el);
    });
    $$(":scope > .is-leaving", grid).forEach(el => grid.prepend(el));

    let tile = null;
    if (!items.length) grid.insertAdjacentHTML("beforeend", emptyHTML());
    else if (view === "grid" && SLIM && !S.q && !S.tag && !filterCount(S) && items.length === PRODUCTS.length) {
      grid.insertAdjacentHTML("beforeend", endTileHTML());
      tile = $(":scope > .drop-tile", grid);
    }

    if (motion) {
      items.forEach(p => {
        const el = grid.querySelector(`:scope > [data-id="${CSS.escape(p.id)}"]`);
        const f = first.get(p.id);
        if (!el || !f || entering.includes(el)) return;
        const l = el.getBoundingClientRect();
        const dx = f.left - l.left, dy = f.top - l.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(f.width - l.width) < 1) return;
        const sx = f.width / l.width;
        el.animate([
          { transform: `translate(${dx}px, ${dy}px) scale(${sx})`, transformOrigin: "0 0" },
          { transform: "none", transformOrigin: "0 0" }
        ], { duration: 560, easing: EASE });
      });
      entering.forEach((el, i) => el.animate([
        { opacity: 0, transform: "translateY(24px)", clipPath: "inset(0 0 100% 0)" },
        { opacity: 1, transform: "none", clipPath: "inset(0 0 0% 0)" }
      ], { duration: 620, delay: 60 + Math.min(i, 10) * 70, easing: EASE, fill: "backwards" }));
      const extra = $(":scope > .shop-empty", grid) || tile;
      if (extra) extra.animate([{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], { duration: 420, delay: 200 + entering.length * 50, easing: EASE_OUT, fill: "backwards" });
    }
    if (typeof refreshReveal === "function") refreshReveal();
  }

  function emptyHTML() {
    const act = activeFilters(S).filter(a => a.k !== "q" && a.k !== "tag");
    let suggest = "";
    if (S.q) {
      const dym = didYouMean(S.q);
      const opts = dym.length ? dym : SLIM
        ? PRODUCTS.filter(p => p.stock > 0).slice(0, 5).map(p => ({ href: `product.html?id=${encodeURIComponent(p.id)}`, label: short(p) }))
        : LIVE_CATS().slice(0, 5).map(c => ({ href: `shop.html?cat=${c.id}`, label: c.name }));
      suggest = `<p class="shop-empty-label">${dym.length ? "Did you mean" : "Try one of these"}</p>
        <div class="shop-empty-chips">${opts.map(o => `<a class="chip" href="${o.href}">${esc(o.label)}</a>`).join("")}</div>`;
    } else if (act.length) {
      suggest = `<p class="shop-empty-label">Try removing a filter</p>
        <div class="shop-empty-chips">${act.slice(0, 5).map(a => `<button type="button" class="pill" data-rm="${a.k}" data-v="${esc(a.v || "")}"><span>${esc(a.label)}</span>${X}</button>`).join("")}</div>`;
    }
    return `<div class="shop-empty" role="status">
      <p class="shop-empty-big outline-text" aria-hidden="true">00</p>
      <div class="shop-empty-body">
        <p class="shop-empty-k">[ NO MATCH ]</p>
        <h2 class="shop-empty-title">${S.q ? `Nothing for “${esc(S.q)}”` : "Nothing in that combo"}</h2>
        <p class="shop-empty-copy">${S.q ? "Check the spelling or try a simpler word like “tee”, “chai” or “black”." : "Every size in that filter has gone. Loosen it up and see what's still on the rack."}</p>
        ${suggest}
        <div class="shop-empty-cta">
          ${act.length ? `<button type="button" class="btn" data-clear-all>Reset filters</button>` : ""}
          <a class="btn ${act.length ? "btn-ghost" : ""}" href="shop.html">See the full drop</a>
        </div>
      </div>
    </div>`;
  }

  function renderExtra(items) {
    const el = $("#shopExtra"), count = items.length;
    if (!S.q) { el.innerHTML = ""; return; }
    // no results → the full drop; a partial match → the rest of the drop, so the page never feels empty
    const shown = new Set(items.map(p => p.id));
    const picks = PRODUCTS.filter(p => !shown.has(p.id)).sort((a, b) => (a.stock <= 0) - (b.stock <= 0)).slice(0, 10);
    if (!picks.length) { el.innerHTML = ""; return; }
    el.innerHTML = `<section class="shop-recos">
      <div class="section-head"><div><p class="eyebrow">[ ${esc(dropLabel.toUpperCase())} ]</p><h2 class="display-s">${count ? "The rest of the drop" : "The full drop"} <span class="mono">(${pad2(picks.length)})</span></h2></div><a class="link-arrow" href="shop.html">Shop all</a></div>
      <div class="scroller">${picks.map(productCard).join("")}</div></section>`;
    if (typeof refreshReveal === "function") refreshReveal();
  }

  /* ---------- render all ---------- */
  function render(animate = true) {
    const items = results();
    renderHead(items.length);
    renderChips();
    renderSizeChips();
    renderPanel($("#sidePanel"), S);
    renderPills();
    renderSort();
    renderViews();
    const none = !scoped().length;
    $("#shopLayout").classList.toggle("is-noscope", none);
    $("#shopLayout").classList.toggle("is-slim", SLIM);
    $("#shopToolbar").hidden = none;
    $("#shopFab").hidden = SLIM || none;
    renderGrid(items, animate);
    renderExtra(items);
    writeURL();
  }
  (function clampPrice() {
    const [lo, hi] = priceBounds();
    if (S.min !== null && (S.min <= lo || S.min >= hi)) S.min = null;
    if (S.max !== null && (S.max >= hi || S.max <= lo)) S.max = null;
  })();

  /* ---------- events ---------- */
  bindPanel($("#sidePanel"), () => S, () => render(true));
  $("#shopSort").addEventListener("change", e => { S.sort = e.target.value; render(true); });
  $("#shopViews").addEventListener("click", e => {
    const b = e.target.closest("[data-view]");
    if (!b || b.dataset.view === S.view) return;
    S.view = b.dataset.view;
    try { localStorage.setItem("bhakshi_shopview", S.view); } catch (err) { /* ignore */ }
    hidePreview();
    render(true);
    const top = $("#shopToolbar").getBoundingClientRect().top + scrollY - 90;
    if (scrollY > top + 40) scrollTo({ top, behavior: reduceMotion() ? "auto" : "smooth" });
  });
  $("#tbSizes").addEventListener("click", e => {
    if (e.target.closest("[data-szclear]")) { S.size = []; render(true); return; }
    const b = e.target.closest("[data-szchip]");
    if (!b || b.disabled) return;
    const v = b.dataset.szchip;
    S.size = S.size.includes(v) ? S.size.filter(x => x !== v) : [...S.size, v];
    render(true);
    const nb = $(`#tbSizes [data-szchip="${CSS.escape(v)}"]`);
    nb && nb.focus({ preventScroll: true });
  });
  $("#shopChips").addEventListener("click", e => {
    const c = e.target.closest("[data-chip]");
    if (!c) return;
    S.cat = c.dataset.chip ? [c.dataset.chip] : [];
    render(true);
    const nc = document.querySelector(`#shopChips [data-chip="${c.dataset.chip}"]`);
    if (nc) { const row = $("#shopChips"); row.scrollTo({ left: nc.offsetLeft - row.clientWidth / 2 + nc.offsetWidth / 2, behavior: reduceMotion() ? "auto" : "smooth" }); }
  });
  $("#main").addEventListener("click", e => {
    const rm = e.target.closest("[data-rm]");
    if (rm) { removeFilter(rm.dataset.rm, rm.dataset.v); render(true); return; }
    if (e.target.closest("[data-clear-all]")) { clearFilters(S); render(true); return; }
    // big view: front/back flip
    const fb = e.target.closest("[data-flip]");
    if (fb) {
      const card = fb.closest(".bigcard"), side = fb.dataset.flip;
      $(".flip", card).dataset.side = side;
      $$("[data-flip]", card).forEach(b => b.setAttribute("aria-pressed", b.dataset.flip === side));
      const lab = $("[data-flip-label]", card); if (lab) lab.textContent = `[${side.toUpperCase()}]`;
    }
  });
  $("#sideClear").addEventListener("click", () => { clearFilters(S); render(true); });
  document.addEventListener("wishlist:change", () => {
    $$(".bigcard-wish").forEach(b => { const on = wished(b.dataset.wish); b.setAttribute("aria-pressed", on); b.setAttribute("aria-label", `${on ? "Remove from" : "Add to"} wishlist`); });
  });

  /* ---------- list view: floating back-print preview that follows the cursor ---------- */
  const prev = $("#listPreview");
  let prevId = null, px = 0, py = 0, praf = 0;
  function hidePreview() { prev.classList.remove("on"); prevId = null; }
  const movePreview = () => { praf = 0; prev.style.transform = `translate3d(${px + 28}px, ${py - 150}px, 0)`; };
  $("#shopGrid").addEventListener("mousemove", e => {
    if (S.view !== "list" || !fine() || innerWidth < 900) return;
    const row = e.target.closest(".lrow");
    if (!row) return hidePreview();
    px = e.clientX; py = e.clientY;
    if (row.dataset.id !== prevId) {
      const p = getProduct(row.dataset.id);
      prevId = row.dataset.id;
      prev.innerHTML = `<span class="list-preview-l">[BACK]</span>${backMedia(p) || bare(p, 0, "front")}`;
    }
    prev.classList.add("on");
    if (!praf) praf = requestAnimationFrame(movePreview);
  });
  $("#shopGrid").addEventListener("mouseleave", hidePreview);
  addEventListener("scroll", hidePreview, { passive: true });

  /* ---------- mobile filter sheet (full catalogue only) ---------- */
  const ModalAPI = {
    open(html, opts) {
      if (typeof Modal === "undefined" || !Modal.open) return null;
      const r = Modal.open(html, opts);
      return r && r.nodeType === 1 ? r : $(".modal-content");
    },
    close() { if (typeof Modal !== "undefined" && Modal.close) Modal.close(); }
  };
  function openSheet() {
    const D = clone(S);
    const html = `<div class="fsheet">
      <div class="fsheet-head"><h2>Filter &amp; sort</h2><button type="button" class="shop-clear" data-sheet-clear>Clear all</button></div>
      <div class="fsheet-body">
        <div class="fsheet-sort"><p class="fsub">Sort by</p><div class="fsheet-sorts" role="radiogroup" aria-label="Sort by">
          ${SORTS.map(([v, l]) => `<button type="button" class="chip" role="radio" data-sort="${v}" aria-checked="${D.sort === v}">${l}</button>`).join("")}</div></div>
        <div class="fpanel" data-sheet-panel></div>
      </div>
      <div class="fsheet-foot"><button type="button" class="btn btn-block btn-lg" data-apply>Apply</button></div>
    </div>`;
    const root = ModalAPI.open(html, { size: "sheet", label: "Filter and sort" });
    if (!root) return;
    const panel = $("[data-sheet-panel]", root);
    const apply = $("[data-apply]", root);
    const update = preview => {
      const st = preview ? { ...D, ...preview } : D;
      const n = results(st).length;
      apply.textContent = `Show ${plural(n, "style")}`;
    };
    const redraw = () => { renderPanel(panel, D); $$("[data-sort]", root).forEach(b => b.setAttribute("aria-checked", b.dataset.sort === D.sort)); update(); };
    bindPanel(panel, () => D, redraw);
    panel.addEventListener("price:preview", e => {
      const [lo, hi] = priceBounds();
      update({ min: e.detail.min <= lo ? null : e.detail.min, max: e.detail.max >= hi ? null : e.detail.max });
    });
    root.addEventListener("click", e => {
      const s = e.target.closest("[data-sort]");
      if (s) { D.sort = s.dataset.sort; redraw(); return; }
      if (e.target.closest("[data-sheet-clear]")) { clearFilters(D); redraw(); return; }
      if (e.target.closest("[data-apply]")) {
        Object.assign(S, D);
        ModalAPI.close();
        render(true);
        const top = $(".shop-results").getBoundingClientRect().top + scrollY - 120;
        if (scrollY > top) scrollTo({ top, behavior: reduceMotion() ? "auto" : "smooth" });
      }
    });
    redraw();
  }
  $("#shopFab").addEventListener("click", openSheet);

  const fab = $("#shopFab");
  const watchFoot = () => {
    const foot = document.querySelector("footer");
    if (!foot || !("IntersectionObserver" in window)) return;
    new IntersectionObserver(([e]) => fab.classList.toggle("is-hidden", e.isIntersecting), { rootMargin: "0px 0px -40px 0px" }).observe(foot);
  };
  if (document.readyState === "complete") watchFoot(); else addEventListener("load", watchFoot);

  render(false);
})();
