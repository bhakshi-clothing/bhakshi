/* BHAKSHI — shop / listing page.
   Filters, sorting and search are all driven by one state object that is mirrored
   to the URL (history.replaceState) so every filtered view is shareable. */
(() => {
  "use strict";
  if (document.body.dataset.page !== "shop") return;

  const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isDesk = () => matchMedia("(min-width: 1024px)").matches;

  /* ---------- copy ---------- */
  const TAGS = {
    new:        { title: "New <em>arrivals</em>",   eyebrow: "Just in", desc: "Fresh off the cutting table: the latest additions to the BHAKSHI wardrobe." },
    bestseller: { title: "The <em>bestsellers</em>", eyebrow: "Most loved", desc: "The pieces our customers come back for, again and again." },
    sale:       { title: "The <em>sale</em>",        eyebrow: "Limited time", desc: "Wardrobe favourites at their friendliest prices, while sizes last." },
    office:     { title: "The <em>office</em> edit", eyebrow: "Edit", desc: "Sharp, breathable pieces for five-day weeks, long meetings and the commute home." },
    casual:     { title: "The <em>casual</em> edit", eyebrow: "Edit", desc: "Easy staples for weekends, chai runs and everything unplanned." },
    athleisure: { title: "<em>Athleisure</em>",      eyebrow: "Edit", desc: "Soft, stretchy pieces that move between the gym, the airport and the sofa." },
    festive:    { title: "The <em>festive</em> edit", eyebrow: "Edit", desc: "Kurtas and celebratory colour for Diwali, weddings and every family gathering." }
  };
  const CAT_DESC = {
    tshirts: "Combed and heavyweight cottons, cut to keep their shape through monsoon washes and summer days.",
    shirts: "Oxfords, linens and easy-iron formals: crisp enough for the boardroom, easy enough for Sunday brunch.",
    polos: "Piqué polos with ribbed collars that hold their line. The smartest way to dress down.",
    kurtas: "Breathable cotton kurtas with clean mandarin collars, made for pujas, sangeets and long festive evenings.",
    hoodies: "Brushed fleece layers for Delhi winters, hill-station weekends and over-cooled offices.",
    jackets: "Lightweight outer layers that travel well and finish every outfit.",
    jeans: "Stretch and rigid denim in slim and relaxed cuts, washed for a lived-in feel from day one.",
    trousers: "Tapered chinos and crease-resistant suiting that go from desk to dinner without a second thought.",
    joggers: "Utility cargos and soft knit joggers for travel days, gym sessions and lazy Sundays.",
    shorts: "Above-knee cotton shorts, made for the long Indian summer.",
    coords: "Matching sets in breathable blends. One decision, a complete look."
  };
  const GROUP_DESC = {
    Topwear: "Tees, shirts, polos and kurtas: the foundation of a well-dressed week.",
    Winterwear: "Layers for every kind of Indian winter, from barely-there to properly cold.",
    Bottoms: "Denim, chinos and joggers, cut for comfort and built to last.",
    "Co-ords": "Coordinated sets that do the styling for you."
  };
  const OCCASIONS = [["office", "Office"], ["casual", "Casual"], ["athleisure", "Athleisure"], ["festive", "Festive"]];
  const FITS = ["Slim", "Regular", "Relaxed", "Oversized"];
  const SORTS = [["featured", "Featured"], ["new", "Newest"], ["price-asc", "Price: low to high"], ["price-desc", "Price: high to low"], ["discount", "Biggest discount"]];
  const LETTER = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

  const slug = s => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const sizeKey = s => (LETTER.includes(s) ? LETTER.indexOf(s) : 100 + parseFloat(s));
  const groupOf = id => (CATEGORIES.find(c => c.id === id) || {}).group;
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const list = v => (v ? v.split(",").map(x => x.trim()).filter(Boolean) : []);

  /* ---------- colour facets (deduped by colour name) ---------- */
  const COLORS = [];
  PRODUCTS.forEach(p => {
    const id = slug(p.colorName || p.color);
    if (!COLORS.some(c => c.id === id)) COLORS.push({ id, name: p.colorName || p.color, hex: p.color });
  });

  /* ---------- state <-> URL ---------- */
  const params = new URLSearchParams(location.search);
  const num = v => (v !== null && v !== "" && !isNaN(+v) ? +v : null);
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
    view: ["1", "2", "3", "4"].includes(params.get("view")) ? params.get("view") : ""
  };
  if (S.group && !CATEGORIES.some(c => c.group === S.group)) S.group = "";
  if (!TAGS[S.tag] && S.tag && !PRODUCTS.some(p => p.tags.includes(S.tag))) S.tag = "";

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
    if (S.view) u.set("view", S.view);
    const qs = u.toString().replace(/%2C/g, ",");
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
  }

  /* ---------- search ---------- */
  const norm = s => String(s).toLowerCase().replace(/[-_/]/g, "").replace(/[^a-z0-9 ]/g, " ");
  const stem = w => (w.length > 3 && w.endsWith("es") && !w.endsWith("ses") ? w.slice(0, -2) : w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w);
  const SYN = { tee: "tshirt", tees: "tshirt", top: "topwear", pant: "trouser", pants: "trouser", chino: "chino", denim: "jean", sweatshirt: "hoodie", track: "jogger", cargo: "cargo" };
  function hay(p) {
    if (p._hay) return p._hay;
    const c = CATEGORIES.find(x => x.id === p.category) || {};
    const raw = [p.name, p.category, c.name, c.group, p.colorName, p.fabric, p.fit, p.shape, p.tags.join(" "), p.family].join(" ");
    p._hay = norm(raw) + " " + norm(raw).split(/\s+/).map(stem).join(" ");
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
  function didYouMean(q) {
    const words = norm(q).split(/\s+/).filter(w => w.length > 1);
    if (!words.length) return [];
    const scored = CATEGORIES.map(c => {
      const terms = norm(c.name + " " + c.id).split(/\s+/).filter(Boolean);
      PRODUCTS.filter(p => p.category === c.id).forEach(p => terms.push(...norm(p.colorName + " " + p.fabric + " " + p.fit).split(/\s+/)));
      let best = 99;
      words.forEach(w => terms.forEach(t => {
        if (t.length < 2) return;
        const d = t.startsWith(w) || w.startsWith(t) ? 0 : lev(w, t.slice(0, Math.max(w.length, 3)));
        best = Math.min(best, d / Math.max(w.length, 3));
      }));
      return { c, best };
    }).filter(x => x.best <= 0.5).sort((a, b) => a.best - b.best);
    return scored.slice(0, 4).map(x => x.c);
  }

  /* ---------- filtering ---------- */
  function scoped() {
    return PRODUCTS.filter(p =>
      (!S.group || groupOf(p.category) === S.group) &&
      (!S.tag || p.tags.includes(S.tag)) &&
      (!S.q || matchesQuery(p, S.q)));
  }
  function passes(p, st, skip) {
    if (skip !== "cat" && st.cat.length && !st.cat.includes(p.category)) return false;
    if (skip !== "size" && st.size.length && !p.sizes.some(s => st.size.includes(s))) return false;
    if (skip !== "fit" && st.fit.length && !st.fit.includes(p.fit)) return false;
    if (skip !== "color" && st.color.length && !st.color.includes(slug(p.colorName || p.color))) return false;
    if (skip !== "occ" && st.occ.length && !p.tags.some(t => st.occ.includes(t))) return false;
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
      new: (a, b) => (b.tags.includes("new") - a.tags.includes("new")) || idx.get(b.id) - idx.get(a.id),
      "price-asc": (a, b) => a.price - b.price || idx.get(a.id) - idx.get(b.id),
      "price-desc": (a, b) => b.price - a.price || idx.get(a.id) - idx.get(b.id),
      discount: (a, b) => discount(b) - discount(a) || a.price - b.price
    }[sort] || (() => 0);
    out.sort((a, b) => ((a.stock <= 0) - (b.stock <= 0)) || by(a, b)); // sold-out always last
    return out;
  }
  const results = (st = S) => sortList(scoped().filter(p => passes(p, st)), st.sort);

  function priceBounds() {
    const ps = scoped().map(p => p.price);
    if (!ps.length) return [0, 0];
    return [Math.floor(Math.min(...ps) / 100) * 100, Math.ceil(Math.max(...ps) / 100) * 100];
  }

  /* ---------- header, crumbs, chips ---------- */
  function heading() {
    if (S.q) return { eyebrow: "Search results", title: `Search: <em>“${esc(S.q)}”</em>`, plain: `Search: "${S.q}"`, desc: "" };
    if (S.tag && TAGS[S.tag]) return { ...TAGS[S.tag], plain: TAGS[S.tag].title.replace(/<[^>]+>/g, "") };
    if (S.tag) return { eyebrow: "Edit", title: esc(S.tag), plain: S.tag, desc: "" };
    if (S.cat.length === 1) {
      const c = CATEGORIES.find(x => x.id === S.cat[0]);
      if (c) return { eyebrow: c.group, title: esc(c.name), plain: c.name, desc: CAT_DESC[c.id] || "" };
    }
    if (S.cat.length > 1) {
      const names = S.cat.map(catName);
      const t = names.length === 2 ? names.join(" & ") : "Your selection";
      return { eyebrow: S.group || "Shop", title: esc(t), plain: t, desc: names.length > 2 ? names.join(", ") : "" };
    }
    if (S.group) return { eyebrow: "Collection", title: esc(S.group), plain: S.group, desc: GROUP_DESC[S.group] || "" };
    return { eyebrow: "The wardrobe", title: "Shop <em>all</em>", plain: "Shop All", desc: "Considered essentials for the Indian week: office, weekend and every celebration in between." };
  }

  function renderHead(count) {
    const h = heading();
    $("#shopEyebrow").textContent = h.eyebrow;
    $("#shopTitle").innerHTML = h.title;
    $("#shopDesc").textContent = S.q
      ? (count ? `${plural(count, "piece")} matching your search.` : "We couldn't find an exact match. Try one of these instead.")
      : h.desc;
    $("#shopDesc").hidden = !$("#shopDesc").textContent;
    $("#shopCount").innerHTML = `<b>${count}</b> ${count === 1 ? "piece" : "pieces"}`;
    $("#toolbarCount").textContent = `Showing ${plural(count, "product")}`;
    document.title = `${h.plain} | ${STORE.name}`;
    const md = $('meta[name="description"]');
    if (md && h.desc) md.setAttribute("content", `${h.plain} at ${STORE.name}. ${h.desc}`);

    const crumbs = [`<li><a href="index.html">Home</a></li>`];
    if (h.plain === "Shop All") crumbs.push(`<li aria-current="page"><span>Shop</span></li>`);
    else {
      crumbs.push(`<li><a href="shop.html">Shop</a></li>`);
      const g = S.group || (S.cat.length === 1 ? groupOf(S.cat[0]) : "");
      if (g && !S.q && !S.tag && S.cat.length) crumbs.push(`<li><a href="shop.html?group=${encodeURIComponent(g)}">${esc(g)}</a></li>`);
      crumbs.push(`<li aria-current="page"><span>${esc(h.plain)}</span></li>`);
    }
    $("#shopCrumbs").innerHTML = crumbs.join("");
  }

  function renderChips() {
    const cats = S.group ? CATEGORIES.filter(c => c.group === S.group) : CATEGORIES;
    const base = scoped();
    const all = !S.cat.length;
    if (!base.length) { $("#shopChips").innerHTML = ""; return; }
    $("#shopChips").innerHTML =
      `<button type="button" class="chip ${all ? "active" : ""}" data-chip="" aria-pressed="${all}">All <span class="chip-n">${base.length}</span></button>` +
      cats.map(c => {
        const n = base.filter(p => p.category === c.id).length;
        if (!n && !S.cat.includes(c.id)) return "";
        const on = S.cat.length === 1 && S.cat[0] === c.id;
        return `<button type="button" class="chip ${on ? "active" : ""}" data-chip="${c.id}" aria-pressed="${on}">${esc(c.name)} <span class="chip-n">${n}</span></button>`;
      }).join("");
  }

  /* ---------- filter panel (used by sidebar and mobile sheet) ---------- */
  const collapsed = new Set(JSON.parse(sessionStorage.getItem("bhakshi_fcollapsed") || '["occ"]'));
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

    // Category
    const cats = S.group ? CATEGORIES.filter(c => c.group === S.group) : CATEGORIES;
    const groups = [...new Set(cats.map(c => c.group))];
    const catBody = groups.map(g => {
      const items = cats.filter(c => c.group === g).map(c => {
        const n = cnt("cat", p => p.category === c.id);
        return check("cat", c.id, esc(c.name), st.cat.includes(c.id), n);
      }).join("");
      return items ? (groups.length > 1 ? `<p class="fsub">${esc(g)}</p>` : "") + items : "";
    }).join("");
    out.push(group("cat", "Category", catBody || `<p class="fnone">No categories</p>`, st.cat.length));

    // Size
    const sizes = [...new Set(base.flatMap(p => p.sizes))].sort((a, b) => sizeKey(a) - sizeKey(b));
    const sizeBtn = s => {
      const n = cnt("size", p => p.sizes.includes(s)), on = st.size.includes(s);
      return `<button type="button" class="fsize" data-f="size" data-v="${esc(s)}" data-key="size:${esc(s)}" aria-pressed="${on}" ${!n && !on ? "disabled" : ""} aria-label="Size ${esc(s)}, ${n} products">${esc(s)}</button>`;
    };
    const letters = sizes.filter(s => LETTER.includes(s)), nums = sizes.filter(s => !LETTER.includes(s));
    const both = letters.length && nums.length;
    const sizeBody = (letters.length ? `${both ? `<p class="fsub">Tops &amp; easy fits</p>` : ""}<div class="fsizes">${letters.map(sizeBtn).join("")}</div>` : "") +
      (nums.length ? `${both ? `<p class="fsub fsub-gap">Waist &amp; collar</p>` : ""}<div class="fsizes">${nums.map(sizeBtn).join("")}</div>` : "");
    out.push(group("size", "Size", sizeBody, st.size.length));

    // Fit
    out.push(group("fit", "Fit", FITS.map(f => check("fit", f, f, st.fit.includes(f), cnt("fit", p => p.fit === f))).join(""), st.fit.length));

    // Colour
    const colBody = `<div class="fcolors">${COLORS.map(c => {
      const n = cnt("color", p => slug(p.colorName || p.color) === c.id), on = st.color.includes(c.id);
      if (!n && !on) return "";
      return `<button type="button" class="fcolor" data-f="color" data-v="${c.id}" data-key="color:${c.id}" aria-pressed="${on}" title="${esc(c.name)}">
        <span class="fdot" style="--c:${esc(c.hex)}" aria-hidden="true"></span><span class="fcolor-l">${esc(c.name)}</span><span class="fopt-n">${n}</span></button>`;
    }).join("")}</div>`;
    out.push(group("color", "Colour", colBody.includes("fcolor") ? colBody : `<p class="fnone">No colours match the current filters.</p>`, st.color.length));

    // Price
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

    // Availability
    const inStock = cnt("stock", p => p.stock > 0);
    out.push(group("stock", "Availability", `<label class="fswitch">
        <input type="checkbox" data-f="stock" data-key="stock" ${st.stock ? "checked" : ""}>
        <span class="fswitch-ui" aria-hidden="true"></span><span>In stock only</span><span class="fopt-n">${inStock}</span></label>`, st.stock ? "•" : 0));

    // Occasion
    out.push(group("occ", "Occasion", OCCASIONS.map(([v, l]) => check("occ", v, l, st.occ.includes(v), cnt("occ", p => p.tags.includes(v)))).join(""), st.occ.length));

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

  /* Binds a panel element to a state object. onChange(kind) is called after each change. */
  function bindPanel(root, getState, onChange) {
    root.addEventListener("click", e => {
      const t = e.target.closest("[data-toggle]");
      if (t) {
        const g = t.closest(".fgroup"), k = t.dataset.toggle, open = !g.classList.contains("open");
        g.classList.toggle("open", open);
        t.setAttribute("aria-expanded", open);
        open ? collapsed.delete(k) : collapsed.add(k);
        sessionStorage.setItem("bhakshi_fcollapsed", JSON.stringify([...collapsed]));
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
    if (el.matches("[data-p]")) {
      a = +$('[data-p="min"]', root).value || lo; b = +$('[data-p="max"]', root).value || hi;
    } else {
      a = +$('[data-r="min"]', r).value; b = +$('[data-r="max"]', r).value;
    }
    a = Math.max(lo, Math.min(a, hi)); b = Math.max(lo, Math.min(b, hi));
    if (a > b) [a, b] = [b, a];
    st.min = a <= lo ? null : a;
    st.max = b >= hi ? null : b;
  }

  function renderPanel(root, st) {
    const focusKey = root.contains(document.activeElement) ? document.activeElement.dataset.key : null;
    const scroller = root.closest(".shop-side, .fsheet-body") || root;
    const top = scroller.scrollTop;
    root.innerHTML = panelHTML(st);
    paintRange(root);
    scroller.scrollTop = top;
    if (focusKey) { const el = root.querySelector(`[data-key="${CSS.escape(focusKey)}"]`); el && el.focus({ preventScroll: true }); }
  }

  /* ---------- active pills ---------- */
  function activeFilters(st) {
    const out = [];
    if (S.q) out.push({ k: "q", label: `“${S.q}”` });
    if (S.tag) out.push({ k: "tag", label: (TAGS[S.tag] ? TAGS[S.tag].title.replace(/<[^>]+>/g, "") : S.tag) });
    st.cat.forEach(v => out.push({ k: "cat", v, label: catName(v) }));
    st.size.forEach(v => out.push({ k: "size", v, label: `Size ${v}` }));
    st.fit.forEach(v => out.push({ k: "fit", v, label: `${v} fit` }));
    st.color.forEach(v => { const c = COLORS.find(x => x.id === v); out.push({ k: "color", v, label: c ? c.name : v, hex: c && c.hex }); });
    st.occ.forEach(v => out.push({ k: "occ", v, label: (OCCASIONS.find(o => o[0] === v) || [, v])[1] }));
    if (st.min !== null || st.max !== null) {
      const [lo, hi] = priceBounds();
      out.push({ k: "price", label: `${rupee(st.min ?? lo)} – ${rupee(st.max ?? hi)}` });
    }
    if (st.stock) out.push({ k: "stock", label: "In stock" });
    return out;
  }
  const filterCount = st => st.cat.length + st.size.length + st.fit.length + st.color.length + st.occ.length + (st.min !== null || st.max !== null ? 1 : 0) + (st.stock ? 1 : 0);

  function renderPills() {
    const act = activeFilters(S);
    const el = $("#shopPills");
    el.innerHTML = act.length ? act.map(a =>
      `<button type="button" class="pill" data-rm="${a.k}" data-v="${esc(a.v || "")}" aria-label="Remove filter ${esc(a.label)}">
        ${a.hex ? `<span class="fdot" style="--c:${esc(a.hex)}" aria-hidden="true"></span>` : ""}<span>${esc(a.label)}</span>
        <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>`).join("") +
      (act.length > 1 || filterCount(S) ? `<button type="button" class="pill-clear" data-clear>Clear all</button>` : "") : "";
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
  function clearAll() {
    Object.assign(S, { cat: [], size: [], fit: [], color: [], occ: [], min: null, max: null, stock: false });
  }

  /* ---------- density ---------- */
  const gridIcon = n => {
    const w = 16, gap = 2, s = (w - gap * (n - 1)) / n;
    let r = "";
    for (let i = 0; i < n; i++) r += `<rect x="${i * (s + gap)}" y="0" width="${s}" height="${w}" rx="1"/>`;
    return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">${r}</svg>`;
  };
  function renderDensity() {
    const cur = S.view || (isDesk() ? "3" : "2");
    $("#shopDensity").innerHTML =
      ["2", "3", "4"].map(v => `<button type="button" class="dens dens-d" data-view="${v}" aria-pressed="${isDesk() && cur === v}" aria-label="${v} per row">${gridIcon(+v)}</button>`).join("") +
      ["1", "2"].map(v => `<button type="button" class="dens dens-m" data-view="${v}" aria-pressed="${!isDesk() && (cur === "1" ? v === "1" : v === "2")}" aria-label="${v} per row">${gridIcon(+v)}</button>`).join("");
    $("#shopGrid").dataset.view = S.view || "";
  }

  /* ---------- results grid with FLIP ---------- */
  const tpl = document.createElement("template");
  function cardEl(p) {
    tpl.innerHTML = productCard(p).trim();
    const el = tpl.content.firstElementChild;
    if (!el.dataset.id) el.dataset.id = p.id;
    return el;
  }

  function renderGrid(items, animate) {
    const grid = $("#shopGrid");
    const motion = animate && !reduceMotion() && typeof grid.animate === "function";
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
      el.animate([{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(.94)" }], { duration: 260, easing: "cubic-bezier(.2,.7,.1,1)", fill: "forwards" })
        .finished.then(() => el.remove()).catch(() => el.remove());
    });
    $$(":scope > .shop-empty", grid).forEach(el => el.remove());

    // order + enter
    const entering = [];
    items.forEach(p => {
      let el = existing.get(p.id);
      if (!el) { el = cardEl(p); entering.push(el); }
      grid.appendChild(el);
    });
    // keep leaving ones behind in the DOM order (absolute anyway)
    $$(":scope > .is-leaving", grid).forEach(el => grid.prepend(el));

    if (!items.length) grid.insertAdjacentHTML("beforeend", emptyHTML());

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
        ], { duration: 520, easing: "cubic-bezier(.2,.7,.1,1)" });
      });
      entering.forEach((el, i) => el.animate([
        { opacity: 0, transform: "translateY(18px) scale(.98)" },
        { opacity: 1, transform: "none" }
      ], { duration: 460, delay: 120 + Math.min(i, 10) * 45, easing: "cubic-bezier(.2,.7,.1,1)", fill: "backwards" }));
      const empty = $(":scope > .shop-empty", grid);
      if (empty) empty.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 400, delay: 150, fill: "backwards" });
    }
    if (typeof refreshReveal === "function") refreshReveal();
  }

  function emptyHTML() {
    const act = activeFilters(S).filter(a => a.k !== "q" && a.k !== "tag");
    let suggest = "";
    if (S.q) {
      const dym = didYouMean(S.q);
      const cats = dym.length ? dym : ["shirts", "tshirts", "jeans", "kurtas"].map(id => CATEGORIES.find(c => c.id === id)).filter(Boolean);
      suggest = `<p class="shop-empty-label">${dym.length ? "Did you mean" : "Popular right now"}</p>
        <div class="shop-empty-chips">${cats.map(c => `<a class="chip" href="shop.html?cat=${c.id}">${esc(c.name)}</a>`).join("")}</div>`;
    } else if (act.length) {
      suggest = `<p class="shop-empty-label">Try removing a filter</p>
        <div class="shop-empty-chips">${act.slice(0, 5).map(a => `<button type="button" class="pill" data-rm="${a.k}" data-v="${esc(a.v || "")}"><span>${esc(a.label)}</span><svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>`).join("")}</div>`;
    }
    return `<div class="shop-empty" role="status">
      <svg class="shop-empty-art" width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true"><circle cx="31" cy="31" r="19" stroke="currentColor" stroke-width="2"/><path d="m45 45 14 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M24 31h14" stroke="var(--saffron)" stroke-width="2" stroke-linecap="round"/></svg>
      <h2 class="shop-empty-title">${S.q ? `Nothing for <em>“${esc(S.q)}”</em> yet` : "No pieces match <em>those</em> filters"}</h2>
      <p>${S.q ? "Check the spelling, try a broader word like “shirt” or “cotton”, or browse a category below." : "Loosen a filter or two and we'll find you something good."}</p>
      ${suggest}
      <div class="shop-empty-cta">
        ${act.length ? `<button type="button" class="btn" data-clear>Reset filters</button>` : ""}
        <a class="btn ${act.length ? "btn-ghost" : ""}" href="shop.html">Browse everything</a>
      </div>
    </div>`;
  }

  function renderExtra(count) {
    const el = $("#shopExtra");
    if (count || !S.q) { el.innerHTML = ""; return; }
    const picks = PRODUCTS.filter(p => p.tags.includes("bestseller") && p.stock > 0).slice(0, 8);
    el.innerHTML = `<section class="shop-recos">
      <div class="section-head"><div><p class="eyebrow">While you're here</p><h2 class="display-s">Our <em>bestsellers</em></h2></div><a class="link-arrow" href="shop.html?tag=bestseller">View all</a></div>
      <div class="scroller">${picks.map(productCard).join("")}</div></section>`;
    if (typeof refreshReveal === "function") refreshReveal();
  }

  /* ---------- render all ---------- */
  function render(animate = true) {
    const items = results();
    renderHead(items.length);
    renderChips();
    renderPanel($("#sidePanel"), S);
    renderPills();
    renderDensity();
    $("#shopSort").value = S.sort;
    const none = !scoped().length;
    $(".shop-layout").classList.toggle("is-noscope", none);
    $("#shopFab").hidden = none;
    renderGrid(items, animate);
    renderExtra(items.length);
    writeURL();
  }
  // Clamp a stale price range from URL to the current scope
  (function clampPrice() {
    const [lo, hi] = priceBounds();
    if (S.min !== null && (S.min <= lo || S.min >= hi)) S.min = null;
    if (S.max !== null && (S.max >= hi || S.max <= lo)) S.max = null;
  })();

  /* ---------- events ---------- */
  bindPanel($("#sidePanel"), () => S, () => render(true));

  $("#shopSort").addEventListener("change", e => { S.sort = e.target.value; render(true); });
  $("#shopDensity").addEventListener("click", e => {
    const b = e.target.closest("[data-view]");
    if (!b) return;
    const v = b.dataset.view;
    S.view = (isDesk() && v === "3") || (!isDesk() && v === "2") ? "" : v;
    render(true);
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
    if (e.target.closest("[data-clear]")) { clearAll(); render(true); }
  });
  $("#sideClear").addEventListener("click", () => { clearAll(); render(true); });
  matchMedia("(min-width: 1024px)").addEventListener("change", () => renderDensity());

  /* ---------- mobile filter sheet ---------- */
  let localModal = null;
  const ModalAPI = {
    open(html, opts) {
      if (typeof Modal !== "undefined" && Modal.open) return Modal.open(html, opts);
      // Fallback (only used if the shared Modal isn't available)
      ModalAPI.close();
      const wrap = document.createElement("div");
      wrap.className = "sx-modal";
      wrap.innerHTML = `<div class="sx-overlay" data-sx-close></div><div class="sx-panel" role="dialog" aria-modal="true" aria-label="${esc(opts.label || "")}"><button class="sx-x" data-sx-close aria-label="Close">✕</button><div class="sx-content">${html}</div></div>`;
      document.body.appendChild(wrap);
      document.body.style.overflow = "hidden";
      wrap.addEventListener("click", e => e.target.closest("[data-sx-close]") && ModalAPI.close());
      wrap.addEventListener("keydown", e => e.key === "Escape" && ModalAPI.close());
      requestAnimationFrame(() => wrap.classList.add("open"));
      localModal = wrap;
      setTimeout(() => { const f = wrap.querySelector("button, input, select"); f && f.focus(); }, 50);
      return wrap.querySelector(".sx-content");
    },
    close() {
      if (localModal) { localModal.remove(); localModal = null; document.body.style.overflow = ""; return; }
      if (typeof Modal !== "undefined" && Modal.close) Modal.close();
    }
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
    const update = (preview) => {
      const st = preview ? { ...D, ...preview } : D;
      const n = results(st).length;
      apply.textContent = `Apply · ${plural(n, "result")}`;
      apply.disabled = false;
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
      if (e.target.closest("[data-sheet-clear]")) {
        Object.assign(D, { cat: [], size: [], fit: [], color: [], occ: [], min: null, max: null, stock: false });
        redraw(); return;
      }
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

  // hide the floating button once the footer comes into view
  const fab = $("#shopFab");
  const foot = document.querySelector("footer");
  if (foot && "IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => fab.classList.toggle("is-hidden", e.isIntersecting), { rootMargin: "0px 0px -40px 0px" }).observe(foot);
  }

  render(false);
})();
