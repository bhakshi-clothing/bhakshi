/* BHAKSHI — home page interactions (hero, rails, studio, fabric story, sliders, FAQ).
   Depends on globals from products.js, art.js and app.js (see ARCHITECTURE.md). */
(() => {
  "use strict";

  /* ---------- small, defensive helpers ---------- */
  const qs = (s, el = document) => el.querySelector(s);
  const qsa = (s, el = document) => [...el.querySelectorAll(s)];
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FINE = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const money = n => (typeof rupee === "function" ? rupee(n) : "₹" + Number(n).toLocaleString("en-IN"));
  const E = s => (typeof esc === "function" ? esc(s)
    : String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])));
  const byId = id => PRODUCTS.find(p => p.id === id);
  const inStock = p => p && p.stock > 0;
  const hasArt = typeof Art !== "undefined";
  const pic = (p, opts = { bg: false }) => (p.images && p.images[0])
    ? `<img src="${E(p.images[0])}" alt="${E(p.name)}" loading="lazy">`
    : hasArt ? Art.garment(p, opts) : "";
  const outfit = (t, b) => hasArt && Art.outfit ? Art.outfit(t, b, { bg: false }) : "";
  const card = p => (typeof productCard === "function") ? productCard(p)
    : `<article class="card" data-id="${E(p.id)}"><a class="card-media" href="product.html?id=${encodeURIComponent(p.id)}">${pic(p, {})}</a><div class="card-body"><a href="product.html?id=${encodeURIComponent(p.id)}">${E(p.name)}</a><div>${money(p.price)}</div></div></article>`;
  const refresh = () => { if (typeof refreshReveal === "function") refreshReveal(); };
  const short = p => p.name.split(" — ")[0];
  const pct = (price, mrp) => Math.round((1 - price / mrp) * 100);
  const toastMsg = (m, o) => { if (typeof toast === "function") toast(m, o); };
  const link = p => `product.html?id=${encodeURIComponent(p.id)}`;
  const absUrl = rel => { try { return new URL(rel, location.href).href; } catch { return rel; } };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ======================================================
     1 · HERO — occasion tabs morph colour + outfit
     ====================================================== */
  const OCC = [
    { key: "office", label: "Office", tag: "office", top: "oxford-shirt-sky", bottom: "chinos-khaki",
      line: "Crisp Oxfords and stretch chinos that survive the morning commute and still look sharp at the six o'clock review." },
    { key: "weekend", label: "Weekend", tag: "casual", top: "classic-crew-tee-olive", bottom: "slim-jeans-indigo",
      line: "Soft crew tees and easy denim for slow Sundays, long drives and a second round of cutting chai." },
    { key: "festive", label: "Festive", tag: "festive", top: "short-kurta-mustard", bottom: "chinos-navy",
      line: "Breathable cotton kurtas for pujas, sangeets and Diwali card nights, comfortable from the aarti to the last dance." },
    { key: "travel", label: "Travel", tag: "athleisure", top: "zip-hoodie-grey", bottom: "track-jogger-black",
      line: "Brushed fleece and soft-knit joggers that fold into a cabin bag and step out ready for the hills." }
  ];

  function initHero() {
    const hero = qs("#hero"); if (!hero) return;
    const layers = qs("#heroLayers"), tabs = qsa(".hm-tab", hero);
    const line = qs("#heroLine"), cta = qs("#heroCta"), word = qs("#heroWord");
    const cap = qs("#heroCaption"), stage = qs("#hero-stage");
    const looks = OCC.map(o => ({ ...o, t: byId(o.top), b: byId(o.bottom) })).filter(o => o.t && o.b);

    layers.innerHTML = looks.map((o, i) =>
      `<div class="hm-layer${i === 0 ? " is-on" : ""}" data-occ="${o.key}" aria-hidden="${i !== 0}">${outfit(o.t, o.b)}</div>`).join("");
    hero.classList.add("is-ready");

    let cur = 0, timer = null, stopped = RM, visible = true;
    const setText = (el, txt) => {
      if (!el || el.textContent === txt) return;
      if (RM) { el.textContent = txt; return; }
      el.classList.add("is-out");
      setTimeout(() => { el.textContent = txt; el.classList.remove("is-out"); }, 220);
    };

    function go(i, focus) {
      i = (i + looks.length) % looks.length;
      const o = looks[i];
      cur = i;
      hero.dataset.occ = o.key;
      tabs.forEach(t => {
        const on = t.dataset.occ === o.key;
        t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1;
        if (on && focus) t.focus();
      });
      stage.setAttribute("aria-labelledby", "tab-" + o.key);
      qsa(".hm-layer", layers).forEach(l => {
        const on = l.dataset.occ === o.key;
        l.classList.toggle("is-on", on); l.setAttribute("aria-hidden", !on);
      });
      setText(line, o.line);
      setText(word, o.label);
      cta.href = cap.href = "shop.html?tag=" + o.tag;
      cta.textContent = `Shop the ${o.label} Edit`;
      qs(".hm-cap-no", cap).textContent = `Look 0${i + 1} · ${o.label}`;
      qs(".hm-cap-names", cap).textContent = `${short(o.t)} + ${short(o.b)}`;
      qs(".hm-cap-price", cap).textContent = money(o.t.price + o.b.price);
      // restart progress animation on the active tab
      hero.classList.remove("is-tick"); void hero.offsetWidth;
      if (!stopped) hero.classList.add("is-tick");
    }

    const schedule = () => {
      clearTimeout(timer);
      if (stopped || !visible || document.hidden) return;
      timer = setTimeout(() => { go(cur + 1); schedule(); }, 5200);
    };
    const stop = () => { stopped = true; clearTimeout(timer); hero.classList.remove("is-auto", "is-tick"); };

    tabs.forEach((t, i) => {
      t.addEventListener("click", () => { stop(); go(looks.findIndex(o => o.key === t.dataset.occ)); });
      if (FINE) t.addEventListener("mouseenter", () => { stop(); go(looks.findIndex(o => o.key === t.dataset.occ)); });
      t.addEventListener("keydown", e => {
        const k = e.key;
        if (k === "ArrowRight" || k === "ArrowLeft" || k === "Home" || k === "End") {
          e.preventDefault(); stop();
          go(k === "Home" ? 0 : k === "End" ? looks.length - 1 : cur + (k === "ArrowRight" ? 1 : -1), true);
        }
      });
    });

    if (!RM) {
      hero.classList.add("is-auto");
      new IntersectionObserver(es => { visible = es[0].isIntersecting; schedule(); }, { threshold: 0.25 }).observe(hero);
      document.addEventListener("visibilitychange", schedule);
    }
    go(0);
    schedule();

    // pointer parallax (desktop, motion allowed)
    if (FINE && !RM) {
      const arch = qs(".hm-arch", hero), w = qs(".hm-hero-word", hero);
      let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
      const loop = () => {
        x += (tx - x) * 0.08; y += (ty - y) * 0.08;
        layers.style.transform = `translate3d(${x * 16}px, ${y * 12}px, 0) rotate(${x * 1.2}deg)`;
        arch.style.transform = `translate3d(${x * 6}px, ${y * 5}px, 0)`;
        w.style.transform = `translate3d(${x * -34}px, ${y * -14}px, 0)`;
        raf = (Math.abs(tx - x) > 0.001 || Math.abs(ty - y) > 0.001) ? requestAnimationFrame(loop) : 0;
      };
      hero.addEventListener("pointermove", e => {
        const r = hero.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
        if (!raf) raf = requestAnimationFrame(loop);
      });
      hero.addEventListener("pointerleave", () => { tx = ty = 0; if (!raf) raf = requestAnimationFrame(loop); });
    }
  }

  /* ======================================================
     Shared: rail arrows + drag-to-scroll (mouse only)
     ====================================================== */
  function railArrows() {
    qsa(".hm-arrows[data-for]").forEach(box => {
      const rail = document.getElementById(box.dataset.for); if (!rail) return;
      const [prev, next] = qsa(".hm-arrow", box);
      const update = () => {
        const max = rail.scrollWidth - rail.clientWidth - 2;
        prev.disabled = rail.scrollLeft <= 2;
        next.disabled = rail.scrollLeft >= max;
      };
      qsa(".hm-arrow", box).forEach(b => b.addEventListener("click", () => {
        rail.scrollBy({ left: +b.dataset.dir * rail.clientWidth * 0.8, behavior: RM ? "auto" : "smooth" });
      }));
      rail.addEventListener("scroll", update, { passive: true });
      addEventListener("resize", update);
      update();
    });
  }

  function dragScroll(el) {
    let down = false, moved = false, sx = 0, sl = 0;
    el.addEventListener("pointerdown", e => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true; moved = false; sx = e.clientX; sl = el.scrollLeft;
    });
    addEventListener("pointermove", e => {
      if (!down) return;
      const dx = e.clientX - sx;
      if (!moved && Math.abs(dx) > 6) { moved = true; el.classList.add("is-dragging"); }
      if (moved) el.scrollLeft = sl - dx;
    });
    addEventListener("pointerup", () => {
      if (!down) return;
      down = false;
      // re-enabling scroll-snap lets the browser settle on the nearest item
      if (moved) el.classList.remove("is-dragging");
    });
    el.addEventListener("click", e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    el.addEventListener("dragstart", e => e.preventDefault());
  }

  /* ======================================================
     2 · CATEGORY RAIL
     ====================================================== */
  const CAT_TINT = {
    tshirts: "#ece3d3", shirts: "#dfe5ee", polos: "#e6e2ec", kurtas: "#f1e2cc", hoodies: "#e4e4e1",
    jackets: "#e6ddd2", jeans: "#dce2ec", trousers: "#ebe2d1", joggers: "#e2e4d4", shorts: "#dfe6e8", coords: "#efe5d3"
  };
  function initCategories() {
    const rail = qs("#catRail"); if (!rail) return;
    rail.innerHTML = CATEGORIES.map((c, i) => {
      const items = PRODUCTS.filter(p => p.category === c.id);
      if (!items.length) return "";
      const hero = items.find(inStock) || items[0];
      const n = items.length;
      return `<a class="hm-cat" href="shop.html?cat=${encodeURIComponent(c.id)}" style="--tint:${CAT_TINT[c.id] || "#ece6dc"}">
        <span class="hm-cat-media">${pic(hero)}<span class="hm-cat-i">${String(i + 1).padStart(2, "0")}</span></span>
        <span class="hm-cat-body"><span class="hm-cat-name">${E(c.name)}</span><span class="hm-cat-n">${n} ${n === 1 ? "style" : "styles"}</span></span>
      </a>`;
    }).join("");
  }

  /* ======================================================
     3 · NEW IN
     ====================================================== */
  function initNew() {
    const rail = qs("#newRail"); if (!rail) return;
    const list = PRODUCTS.filter(p => p.tags.includes("new"));
    list.sort((a, b) => (b.stock > 0) - (a.stock > 0));
    rail.innerHTML = list.map(card).join("");
  }

  /* ======================================================
     4 · BUILD YOUR LOOK STUDIO
     ====================================================== */
  const TOP_CATS = ["tshirts", "shirts", "polos", "kurtas"];
  const BOTTOM_CATS = ["jeans", "trousers", "joggers", "shorts"];
  const GOES_WITH = {
    tshirts: ["jeans", "joggers", "shorts", "trousers"],
    shirts: ["trousers", "jeans", "shorts"],
    polos: ["trousers", "jeans", "shorts"],
    kurtas: ["jeans", "trousers"]
  };
  const lum = hex => {
    const h = hex.replace("#", ""), v = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
    const [r, g, b] = [0, 2, 4].map(i => parseInt(v.substr(i, 2), 16) / 255)
      .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const goodPair = (t, b) => {
    if (!(GOES_WITH[t.category] || []).includes(b.category)) return false;
    if (t.category === "shirts" && t.tags.includes("office") && b.category === "shorts") return false;
    return contrast(t.color, b.color) >= 1.6;
  };

  function initStudio() {
    const root = qs("#studio"); if (!root) return;
    const tops = PRODUCTS.filter(p => TOP_CATS.includes(p.category) && inStock(p))
      .sort((a, b) => TOP_CATS.indexOf(a.category) - TOP_CATS.indexOf(b.category));
    const bottoms = PRODUCTS.filter(p => BOTTOM_CATS.includes(p.category) && inStock(p))
      .sort((a, b) => BOTTOM_CATS.indexOf(a.category) - BOTTOM_CATS.indexOf(b.category));
    if (!tops.length || !bottoms.length) { root.hidden = true; return; }

    const S = {
      top: { list: tops, i: Math.max(0, tops.findIndex(p => p.id === "oxford-shirt-white")), size: null },
      bottom: { list: bottoms, i: Math.max(0, bottoms.findIndex(p => p.id === "chinos-navy")), size: null }
    };
    const stageArt = qs("#stageArt"), stageNo = qs("#stageNo"), err = qs("#sizeErr");
    const picks = { top: qs('.hm-pick[data-part="top"]', root), bottom: qs('.hm-pick[data-part="bottom"]', root) };
    const cur = part => S[part].list[S[part].i];

    // thumbnails
    ["top", "bottom"].forEach(part => {
      const box = qs("[data-thumbs]", picks[part]);
      box.innerHTML = S[part].list.map((p, i) =>
        `<button class="hm-thumb" role="option" data-i="${i}" aria-selected="false" aria-label="${E(p.name)}" style="--c:${p.color}">${pic(p)}</button>`).join("");
      box.addEventListener("click", e => {
        const b = e.target.closest(".hm-thumb"); if (!b) return;
        const i = +b.dataset.i; set(part, i, i > S[part].i ? 1 : -1);
      });
    });

    // sizes
    root.addEventListener("click", e => {
      const s = e.target.closest(".hm-size"); if (!s) return;
      const part = s.closest(".hm-pick").dataset.part;
      S[part].size = s.dataset.size;
      renderSizes(part);
      if (S.top.size && S.bottom.size) err.textContent = "";
      picks[part].classList.remove("is-missing");
    });

    function renderSizes(part) {
      const p = cur(part), box = qs("[data-sizes]", picks[part]);
      box.innerHTML = p.sizes.map(sz =>
        `<button class="hm-size" role="radio" data-size="${E(sz)}" aria-checked="${S[part].size === sz}">${E(sz)}</button>`).join("");
    }

    function renderInfo(part) {
      const p = cur(part), el = picks[part];
      const nm = qs("[data-name]", el); nm.textContent = short(p); nm.href = link(p);
      qs("[data-color]", el).textContent = `${p.colorName} · ${p.fit} fit`;
      qs("[data-dot]", el).style.background = p.color;
      qs("[data-price]", el).innerHTML = `${money(p.price)} <s>${money(p.mrp)}</s>`;
      qs("[data-count]", el).textContent = `${String(S[part].i + 1).padStart(2, "0")} / ${String(S[part].list.length).padStart(2, "0")}`;
      qsa(".hm-thumb", el).forEach((b, i) => {
        const on = i === S[part].i; b.setAttribute("aria-selected", on); b.classList.toggle("is-on", on);
        if (on) { const box = b.parentElement; box.scrollTo({ left: b.offsetLeft - box.clientWidth / 2 + b.clientWidth / 2, behavior: RM ? "auto" : "smooth" }); }
      });
      if (S[part].size && !p.sizes.includes(S[part].size)) S[part].size = null;
      renderSizes(part);
    }

    function renderStage(dir = 0, part) {
      const t = cur("top"), b = cur("bottom");
      const layer = document.createElement("div");
      layer.className = "hm-stage-layer";
      layer.innerHTML = outfit(t, b);
      layer.setAttribute("aria-label", `Outfit: ${t.name} with ${b.name}`);
      layer.setAttribute("role", "img");
      const old = qsa(".hm-stage-layer", stageArt);
      if (!RM && old.length) {
        layer.classList.add("is-enter");
        layer.style.setProperty("--dx", (dir || 1) * 26 + "px");
        layer.dataset.part = part || "";
        stageArt.appendChild(layer);
        requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.remove("is-enter")));
        old.forEach(o => { o.classList.add("is-leave"); o.style.setProperty("--dx", -(dir || 1) * 26 + "px"); setTimeout(() => o.remove(), 600); });
      } else {
        stageArt.innerHTML = ""; stageArt.appendChild(layer);
      }
      stageNo.textContent = `Look Nº ${String(S.top.i + 1).padStart(2, "0")}·${String(S.bottom.i + 1).padStart(2, "0")}`;
      // totals
      const price = t.price + b.price, mrp = t.mrp + b.mrp;
      qs("#lookTotal").textContent = money(price);
      qs("#lookMrp").textContent = mrp > price ? money(mrp) : "";
      const ship = typeof STORE !== "undefined" && price >= STORE.freeShippingAbove ? " · Ships free" : "";
      qs("#lookSave").textContent = mrp > price ? `You save ${money(mrp - price)} (${pct(price, mrp)}%)${ship}` : ship.replace(" · ", "");
      // share link
      const msg = `Putting this look together from ${typeof STORE !== "undefined" ? STORE.name : "BHAKSHI"}:\n\n` +
        `Top: ${t.name} (${money(t.price)})\n${absUrl(link(t))}\n\n` +
        `Bottom: ${b.name} (${money(b.price)})\n${absUrl(link(b))}\n\nTogether: ${money(price)}. What do you think?`;
      qs("#shareLook").href = "https://wa.me/?text=" + encodeURIComponent(msg);
    }

    function set(part, i, dir) {
      const n = S[part].list.length;
      S[part].i = (i + n) % n;
      renderInfo(part);
      renderStage(dir, part);
    }

    // stage arrows
    qsa(".hm-sbtn", root).forEach(b => b.addEventListener("click", () => {
      const part = b.dataset.part, d = +b.dataset.dir; set(part, S[part].i + d, d);
    }));

    // swipe on stage (top half = top, bottom half = bottom)
    const stage = qs("#stage");
    let sx = 0, sy = 0, sp = null, tracking = false;
    stage.addEventListener("pointerdown", e => {
      if (e.target.closest("button")) return;
      const r = stage.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY; sp = (e.clientY - r.top) < r.height / 2 ? "top" : "bottom"; tracking = true;
    });
    stage.addEventListener("pointerup", e => {
      if (!tracking) return; tracking = false;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) { const d = dx < 0 ? 1 : -1; set(sp, S[sp].i + d, d); }
    });
    stage.addEventListener("pointercancel", () => { tracking = false; });

    // keyboard on stage
    stage.tabIndex = 0;
    stage.setAttribute("aria-label", "Outfit preview. Use left and right arrows to change the top, shift with arrows to change the bottom.");
    stage.addEventListener("keydown", e => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const part = e.shiftKey ? "bottom" : "top", d = e.key === "ArrowRight" ? 1 : -1;
      set(part, S[part].i + d, d);
    });

    // shuffle: random *good* pairing, different from current
    qs("#shuffleLook").addEventListener("click", () => {
      const pairs = [];
      tops.forEach((t, ti) => bottoms.forEach((b, bi) => {
        if (goodPair(t, b) && !(ti === S.top.i && bi === S.bottom.i)) pairs.push([ti, bi]);
      }));
      if (!pairs.length) return;
      const [ti, bi] = pairs[Math.floor(Math.random() * pairs.length)];
      S.top.i = ti; S.bottom.i = bi;
      renderInfo("top"); renderInfo("bottom"); renderStage(1, "both");
      const btn = qs("#shuffleLook"); btn.classList.remove("is-spin"); void btn.offsetWidth; btn.classList.add("is-spin");
    });

    // add the look
    qs("#addLook").addEventListener("click", e => {
      const missing = ["top", "bottom"].filter(p => !S[p].size);
      if (missing.length) {
        err.textContent = missing.length === 2 ? "Pick a size for the top and the bottom." : `Pick a size for the ${missing[0]}.`;
        missing.forEach(p => { const el = picks[p]; el.classList.remove("is-missing"); void el.offsetWidth; el.classList.add("is-missing"); });
        const first = qs(".hm-size", picks[missing[0]]); if (first) first.focus({ preventScroll: true });
        return;
      }
      if (typeof Cart === "undefined") return;
      const t = cur("top"), b = cur("bottom");
      Cart.add(t.id, S.top.size, 1);
      Cart.add(b.id, S.bottom.size, 1);
      if (typeof flyToCart === "function") flyToCart(qs(".hm-stage-layer:last-child", stageArt) || stageArt);
      toastMsg(`Look added: ${short(t)} (${S.top.size}) + ${short(b)} (${S.bottom.size})`, { type: "success", action: { label: "View bag", onClick: () => { if (typeof openCart === "function") openCart(); } } });
      e.currentTarget.classList.add("is-done");
      const btn = e.currentTarget, label = btn.textContent;
      btn.textContent = "Added to bag ✓";
      setTimeout(() => { btn.textContent = label; btn.classList.remove("is-done"); }, 1800);
    });

    renderInfo("top"); renderInfo("bottom"); renderStage();
  }

  /* ======================================================
     5 · SHOP BY OCCASION
     ====================================================== */
  const OCC_TILES = [
    { tag: "office", name: "Office", note: "Commute-proof, meeting-ready.", hero: "formal-shirt-white", bg: "#1d2742" },
    { tag: "casual", name: "Casual", note: "Chai runs, long drives, lazy brunches.", hero: "oversized-tee-sand", bg: "#7d6142" },
    { tag: "athleisure", name: "Athleisure", note: "Gym, flights and slow Sundays.", hero: "zip-hoodie-grey", bg: "#3f4429" },
    { tag: "festive", name: "Festive", note: "Pujas, sangeets and Diwali nights.", hero: "cotton-kurta-ivory", bg: "#5a1a24" }
  ];
  function initOccasions() {
    const grid = qs("#occGrid"); if (!grid) return;
    grid.innerHTML = OCC_TILES.map((o, i) => {
      const items = PRODUCTS.filter(p => p.tags.includes(o.tag));
      if (!items.length) return "";
      const hero = byId(o.hero) || items[0];
      const seen = new Set([hero.family]);
      const picks = items.filter(p => inStock(p) && !seen.has(p.family) && seen.add(p.family)).slice(0, 3);
      return `<article class="hm-occ-tile" style="--bg:${o.bg}">
        <a class="hm-occ-link" href="shop.html?tag=${o.tag}" aria-label="Shop ${o.name} — ${items.length} styles"></a>
        <div class="hm-occ-top"><span>${String(i + 1).padStart(2, "0")}</span><span>${items.length} styles</span></div>
        <div class="hm-occ-art" aria-hidden="true">${pic(hero)}</div>
        <div class="hm-occ-body">
          <h3 class="hm-occ-name">${o.name}</h3>
          <p class="hm-occ-note">${o.note}</p>
          <span class="hm-occ-cta">Shop ${o.name}</span>
        </div>
        <ul class="hm-occ-picks">${picks.map(p => `<li><a href="${link(p)}" tabindex="-1"><span class="hm-occ-pic">${pic(p)}</span><span class="hm-occ-pn">${E(short(p))}</span><span class="hm-occ-pp">${money(p.price)}</span></a></li>`).join("")}</ul>
      </article>`;
    }).join("");
  }

  /* ======================================================
     6 · BESTSELLERS
     ====================================================== */
  function initBest() {
    const grid = qs("#bestGrid"); if (!grid) return;
    const list = PRODUCTS.filter(p => p.tags.includes("bestseller")).slice(0, 8);
    let html = list.map(card).join("");
    if (list.length % 4) {
      html += `<a class="hm-more-tile" href="shop.html">
        <span class="hm-more-k">The full edit</span>
        <span class="hm-more-t">${PRODUCTS.length} styles across ${CATEGORIES.length} categories.</span>
        <span class="link-arrow">Shop everything</span></a>`;
    }
    grid.innerHTML = html;
  }

  /* ======================================================
     7 · FABRIC STORY — textures + pinned horizontal scroll
     ====================================================== */
  function seeded(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
  const TEX = {
    jersey(id) {
      return `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs><pattern id="${id}" width="14" height="10" patternUnits="userSpaceOnUse">
          <rect width="14" height="10" fill="#efe8db"/>
          <path d="M0 0l3.5 9L7 0M7 0l3.5 9L14 0" fill="none" stroke="#d3c6af" stroke-width="1.4" stroke-linejoin="round"/>
        </pattern>
        <radialGradient id="${id}l" cx="30%" cy="20%" r="90%"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#5b4a33" stop-opacity=".22"/></radialGradient></defs>
        <rect width="400" height="300" fill="url(#${id})"/>
        <rect width="400" height="300" fill="url(#${id}l)"/></svg>`;
    },
    linen(id) {
      const r = seeded(7); let lines = "";
      for (let y = 0; y < 300; y += 3.2) lines += `<rect x="0" y="${y.toFixed(1)}" width="400" height="${(1 + r() * 1.6).toFixed(2)}" fill="#8f8a5f" opacity="${(0.12 + r() * 0.28).toFixed(2)}"/>`;
      for (let x = 0; x < 400; x += 3.6) lines += `<rect x="${x.toFixed(1)}" y="0" width="${(0.8 + r() * 1.4).toFixed(2)}" height="300" fill="#6f6b45" opacity="${(0.08 + r() * 0.22).toFixed(2)}"/>`;
      for (let k = 0; k < 26; k++) lines += `<rect x="${(r() * 400).toFixed(0)}" y="${(r() * 300).toFixed(0)}" width="${(20 + r() * 60).toFixed(0)}" height="${(1.6 + r() * 1.4).toFixed(1)}" rx="1" fill="#5f5b3a" opacity=".35"/>`;
      return `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#2f2d1a" stop-opacity=".18"/></linearGradient></defs>
        <rect width="400" height="300" fill="#c9c39c"/>${lines}<rect width="400" height="300" fill="url(#${id})"/></svg>`;
    },
    denim(id) {
      const r = seeded(11); let flecks = "";
      for (let k = 0; k < 160; k++) flecks += `<rect x="${(r() * 400).toFixed(0)}" y="${(r() * 300).toFixed(0)}" width="${(3 + r() * 9).toFixed(0)}" height="1.2" fill="#c9d3ea" opacity="${(0.1 + r() * 0.3).toFixed(2)}" transform="rotate(-62 200 150)"/>`;
      return `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs><pattern id="${id}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-62)">
          <rect width="6" height="6" fill="#283a63"/><rect width="2.6" height="6" fill="#3b5185"/><rect x="2.6" width=".6" height="6" fill="#1b2848"/>
        </pattern>
        <radialGradient id="${id}f" cx="55%" cy="45%" r="70%"><stop offset="0" stop-color="#9fb2dc" stop-opacity=".35"/><stop offset="1" stop-color="#0d1530" stop-opacity=".45"/></radialGradient></defs>
        <rect width="400" height="300" fill="url(#${id})"/>${flecks}
        <path d="M0 236 H400" stroke="#d9772b" stroke-width="2" stroke-dasharray="7 5" opacity=".9"/>
        <path d="M0 246 H400" stroke="#d9772b" stroke-width="2" stroke-dasharray="7 5" opacity=".9"/>
        <rect width="400" height="300" fill="url(#${id}f)"/></svg>`;
    },
    pique(id) {
      return `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs><pattern id="${id}" width="12" height="10.4" patternUnits="userSpaceOnUse">
          <rect width="12" height="10.4" fill="#1f2b4a"/>
          <path d="M3 0h6l3 5.2-3 5.2H3L0 5.2z" fill="#2c3b62" stroke="#152038" stroke-width="1"/>
          <circle cx="6" cy="5.2" r="1.6" fill="#16213d"/>
        </pattern>
        <radialGradient id="${id}l" cx="25%" cy="15%" r="95%"><stop offset="0" stop-color="#b8c6ea" stop-opacity=".3"/><stop offset="1" stop-color="#05091a" stop-opacity=".45"/></radialGradient></defs>
        <rect width="400" height="300" fill="url(#${id})"/>
        <rect y="0" width="400" height="34" fill="#18223d"/>
        ${Array.from({ length: 67 }, (_, k) => `<rect x="${k * 6}" y="0" width="3" height="34" fill="#25325a"/>`).join("")}
        <rect width="400" height="300" fill="url(#${id}l)"/></svg>`;
    }
  };
  const FABRICS = [
    { tex: "jersey", name: "Combed Cotton", num: "180", unit: "GSM", tone: "light",
      copy: "Short fibres are combed out before spinning, so the yarn is smoother, stronger and kinder to skin. Heavy enough not to cling in humidity, light enough for May.",
      href: "shop.html?cat=tshirts", cta: "Shop crew tees" },
    { tex: "linen", name: "Linen Blend", num: "55", unit: "% linen", tone: "light",
      copy: "Linen breathes; cotton softens it. Together they stay cool through a Chennai afternoon and relax into easy creases you'll grow to like.",
      href: "shop.html?cat=shirts", cta: "Shop linen shirts" },
    { tex: "denim", name: "Stretch Denim", num: "2", unit: "% elastane", tone: "dark",
      copy: "Just enough give for scooter rides, cross-legged lunches and long-haul trains. The rest is honest cotton that fades the way denim should.",
      href: "shop.html?cat=jeans", cta: "Shop jeans" },
    { tex: "pique", name: "Cotton Piqué", num: "100", unit: "% cotton", tone: "dark",
      copy: "A raised honeycomb weave that holds a collar's shape and lets air move. Smart enough for a client lunch, relaxed enough for the club.",
      href: "shop.html?cat=polos", cta: "Shop polos" }
  ];

  function initFabric() {
    const sec = qs("#fabric"), track = qs("#fabricTrack"); if (!sec || !track) return;
    track.innerHTML = FABRICS.map((f, i) => `
      <article class="hm-fab" data-tone="${f.tone}">
        <div class="hm-fab-tex">${TEX[f.tex]("tx" + i)}<span class="hm-fab-i">${String(i + 1).padStart(2, "0")} / ${String(FABRICS.length).padStart(2, "0")}</span></div>
        <div class="hm-fab-body">
          <p class="hm-fab-num" data-count-to="${f.num}"><span>${f.num}</span><small>${f.unit}</small></p>
          <h3 class="hm-fab-name">${f.name}</h3>
          <p class="hm-fab-copy">${f.copy}</p>
          <a class="link-arrow" href="${f.href}">${f.cta}</a>
        </div>
      </article>`).join("");

    const bar = qs("#fabricBar");
    const mq = matchMedia("(min-width: 1024px)");
    let distance = 0, ticking = false;

    const measure = () => {
      const pin = mq.matches && !RM;
      sec.classList.toggle("is-pinned", pin);
      if (!pin) { sec.style.height = ""; track.style.transform = ""; return; }
      const vp = qs(".hm-fabric-viewport", sec);
      distance = Math.max(0, track.scrollWidth - vp.clientWidth);
      sec.style.height = (innerHeight + distance) + "px";
      onScroll();
    };
    const onScroll = () => {
      if (!sec.classList.contains("is-pinned")) {
        const vp = qs(".hm-fabric-viewport", sec);
        const m = vp.scrollWidth - vp.clientWidth;
        if (bar) bar.style.transform = `scaleX(${m > 0 ? clamp(vp.scrollLeft / m, 0, 1) : 0})`;
        return;
      }
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const top = sec.getBoundingClientRect().top;
        const p = distance ? clamp(-top / distance, 0, 1) : 0;
        track.style.transform = `translate3d(${-p * distance}px,0,0)`;
        if (bar) bar.style.transform = `scaleX(${p})`;
      });
    };
    addEventListener("scroll", onScroll, { passive: true });
    qs(".hm-fabric-viewport", sec).addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", measure);
    (mq.addEventListener ? mq.addEventListener("change", measure) : mq.addListener(measure));
    measure();
    // fonts can change widths; re-measure once they're in
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    addEventListener("load", measure);
  }

  /* 8 · measuring-tape numbers (decorative) */
  function initTape() {
    const t = qs(".hm-tape-inner"); if (!t) return;
    t.innerHTML = Array.from({ length: 120 }, (_, k) => `<span style="left:${k * 60}px">${(k % 60) + 1}</span>`).join("");
  }

  /* ======================================================
     9 · NUMBERS — count-up
     ====================================================== */
  function initNumbers() {
    const box = qs("#numbers"); if (!box) return;
    const st = typeof STORE !== "undefined" ? STORE : { freeShippingAbove: 999, codFee: 49 };
    const cod = st.codFee !== -1;
    const stats = [
      { n: 7, pre: "", suf: "", unit: "day", label: "Size exchange, sorted over WhatsApp" },
      { n: st.freeShippingAbove, pre: "₹", suf: "", unit: "", label: "Orders above this ship free, anywhere we deliver" },
      { n: 7, pre: "3–", suf: "", unit: "days", label: "From our dispatch desk to your door" },
      cod ? { n: 2, pre: "", suf: "", unit: "ways to pay", label: "UPI on any app, or cash when it arrives" }
          : { n: 1, pre: "", suf: "", unit: "tap UPI", label: "Pay with any UPI app" }
    ];
    box.innerHTML = stats.map(s => `<div class="hm-num">
      <p class="hm-num-v"><span class="hm-num-pre">${s.pre}</span><span data-to="${s.n}">${RM ? Number(s.n).toLocaleString("en-IN") : 0}</span><small>${s.unit}</small></p>
      <p class="hm-num-l">${E(s.label)}</p></div>`).join("");
    if (RM) return;
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return; io.disconnect();
      qsa("[data-to]", box).forEach((el, k) => {
        const to = +el.dataset.to, dur = 1400 + k * 120, t0 = performance.now();
        const tick = now => {
          const p = clamp((now - t0) / dur, 0, 1), v = Math.round(to * (1 - Math.pow(1 - p, 4)));
          el.textContent = v.toLocaleString("en-IN");
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }), { threshold: 0.4 });
    io.observe(box);
  }

  /* ======================================================
     10 · VOICES — testimonial slider
     ====================================================== */
  function initVoices() {
    const track = qs("#voiceTrack"), dots = qs("#voiceDots"), vp = qs("#voices-viewport");
    if (!track) return;
    const slides = qsa(".hm-voice", track), n = slides.length;
    let i = 0, timer = null, paused = false, visible = false;
    dots.innerHTML = slides.map((_, k) => `<button class="hm-dotbtn" aria-label="Show review ${k + 1}"><span></span></button>`).join("");
    const go = k => {
      i = (k + n) % n;
      track.style.transform = `translate3d(${-i * 100}%,0,0)`;
      slides.forEach((s, j) => { s.classList.toggle("is-on", j === i); s.setAttribute("aria-hidden", j !== i); });
      qsa(".hm-dotbtn", dots).forEach((d, j) => d.setAttribute("aria-current", j === i));
      dots.classList.remove("is-run"); void dots.offsetWidth;
      if (!RM && !paused) dots.classList.add("is-run");
      schedule();
    };
    const schedule = () => {
      clearTimeout(timer);
      if (RM || paused || !visible || document.hidden) return;
      timer = setTimeout(() => go(i + 1), 6500);
    };
    qs("#voicePrev").onclick = () => go(i - 1);
    qs("#voiceNext").onclick = () => go(i + 1);
    qsa(".hm-dotbtn", dots).forEach((d, k) => d.onclick = () => go(k));
    const pause = v => { paused = v; dots.classList.toggle("is-paused", v); if (!v) go(i); else clearTimeout(timer); };
    vp.addEventListener("mouseenter", () => pause(true));
    vp.addEventListener("mouseleave", () => pause(false));
    vp.addEventListener("focusin", () => pause(true));
    vp.addEventListener("focusout", () => pause(false));
    // swipe
    let sx = 0, sy = 0, down = false;
    vp.addEventListener("pointerdown", e => { down = true; sx = e.clientX; sy = e.clientY; });
    vp.addEventListener("pointerup", e => {
      if (!down) return; down = false;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(i + (dx < 0 ? 1 : -1));
    });
    vp.addEventListener("pointercancel", () => { down = false; });
    vp.addEventListener("keydown", e => { if (e.key === "ArrowRight") go(i + 1); if (e.key === "ArrowLeft") go(i - 1); });
    new IntersectionObserver(es => { visible = es[0].isIntersecting; schedule(); }, { threshold: 0.3 }).observe(vp);
    document.addEventListener("visibilitychange", schedule);
    go(0);
  }

  /* ======================================================
     11 · FAQ accordion
     ====================================================== */
  function initFaq() {
    const st = typeof STORE !== "undefined" ? STORE : null;
    if (st) {
      const pay = qs("[data-faq-pay]");
      if (pay) pay.textContent = st.codFee === -1
        ? "Pay by UPI with Google Pay, PhonePe, Paytm or any UPI app. We'll share our UPI ID when we confirm your order."
        : `Pay by UPI with Google Pay, PhonePe, Paytm or any UPI app, or choose Cash on Delivery and pay when the parcel reaches you${st.codFee > 0 ? ` (a small ${money(st.codFee)} COD fee applies)` : ""}.`;
      const ship = qs("[data-faq-ship]");
      if (ship) ship.textContent = `We dispatch within 1–2 working days. Delivery usually takes 3–7 working days depending on your pincode, and shipping is free on orders above ${money(st.freeShippingAbove)}.`;
      const wa = qs("#faqWa");
      if (wa) wa.href = `https://wa.me/${st.whatsapp}?text=${encodeURIComponent(`Hi ${st.name}, I have a question about `)}`;
    }
    qsa(".hm-acc-btn").forEach(b => b.addEventListener("click", () => {
      const open = b.getAttribute("aria-expanded") !== "true";
      b.setAttribute("aria-expanded", open);
      b.closest(".hm-acc-item").classList.toggle("is-open", open);
    }));
  }

  /* ======================================================
     12 · CLOSING ribbon — scroll-velocity marquee
     ====================================================== */
  function initRibbon() {
    const rows = qsa(".hm-ribbon-row"); if (!rows.length) return;
    const A = ["Office", "Weekend", "Festive", "Travel", "Monsoon", "Wedding season", "Sunday chai"];
    const B = ["Wear the everyday", "Made for India", "Cotton first", "Dressed for every part of the day"];
    rows.forEach((row, k) => {
      const words = k ? B : A;
      const unit = words.map((w, j) => `<span class="${(j + k) % 2 ? "is-solid" : ""}">${w}</span><i>✦</i>`).join("");
      qs(".hm-ribbon-track", row).innerHTML = `<div class="hm-ribbon-unit">${unit}</div><div class="hm-ribbon-unit">${unit}</div>`;
    });
    if (RM) return;
    let lastY = scrollY, vel = 0, on = false, raf = 0;
    const state = rows.map(r => ({ el: qs(".hm-ribbon-track", r), x: 0, speed: +r.dataset.speed || 1 }));
    const loop = () => {
      const dy = scrollY - lastY; lastY = scrollY;
      vel += (clamp(dy, -60, 60) - vel) * 0.1;
      state.forEach(s => {
        const w = s.el.firstElementChild.offsetWidth || 1;
        s.x -= s.speed * (0.6 + Math.abs(vel) * 0.18) * (vel < -0.5 ? -1 : 1);
        if (s.x <= -w) s.x += w; if (s.x > 0) s.x -= w;
        s.el.style.transform = `translate3d(${s.x}px,0,0) skewX(${clamp(-vel * 0.3, -8, 8)}deg)`;
      });
      raf = on ? requestAnimationFrame(loop) : 0;
    };
    state.forEach(s => { if (s.speed < 0) s.x = -(s.el.firstElementChild.offsetWidth || 0) / 2; });
    new IntersectionObserver(es => {
      on = es[0].isIntersecting;
      if (on && !raf) { lastY = scrollY; raf = requestAnimationFrame(loop); }
    }).observe(qs(".hm-ribbon"));
  }

  /* ======================================================
     SEO — JSON-LD from STORE + FAQ
     ====================================================== */
  function injectLD() {
    if (typeof STORE === "undefined") return;
    const prices = PRODUCTS.map(p => p.price);
    const home = absUrl("index.html").replace(/index\.html$/, "");
    const store = {
      "@context": "https://schema.org", "@type": "ClothingStore",
      name: STORE.name, description: STORE.tagline + ". Shirts, tees, polos, jeans, chinos and kurtas for men.",
      url: home, image: absUrl("images/og.png"), logo: absUrl("images/favicon.svg"),
      email: STORE.email, telephone: "+" + STORE.whatsapp,
      priceRange: `${money(Math.min(...prices))}–${money(Math.max(...prices))}`,
      currenciesAccepted: "INR",
      paymentAccepted: STORE.codFee === -1 ? "UPI" : "UPI, Cash on Delivery",
      address: { "@type": "PostalAddress", addressCountry: "IN", addressLocality: STORE.city },
      areaServed: { "@type": "Country", name: "India" },
      sameAs: [STORE.instagram].filter(u => u && !/instagram\.com\/?$/.test(u))
    };
    const faq = {
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: qsa(".hm-acc-item").map(it => ({
        "@type": "Question", name: qs(".hm-acc-btn", it).textContent.trim(),
        acceptedAnswer: { "@type": "Answer", text: qs(".hm-acc-panel p", it).textContent.trim() }
      }))
    };
    [store, faq].forEach(o => {
      const s = document.createElement("script"); s.type = "application/ld+json";
      s.textContent = JSON.stringify(o); document.head.appendChild(s);
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    const steps = [initHero, initCategories, initNew, initStudio, initOccasions, initBest, initFabric, initTape, initNumbers, initVoices, initFaq, initRibbon, injectLD];
    steps.forEach(fn => { try { fn(); } catch (err) { console.error("[home] " + fn.name, err); } });
    const setVw = () => {
      const de = document.documentElement;
      de.style.setProperty("--hm-vw", de.clientWidth + "px");
      const hero = qs("#hero");
      if (hero) de.style.setProperty("--hm-top", Math.max(0, hero.getBoundingClientRect().top + scrollY) + "px");
    };
    setVw(); addEventListener("resize", setVw);
    const hdr = qs("#site-header"), bar = hdr && hdr.previousElementSibling;
    if (bar && "ResizeObserver" in window) new ResizeObserver(setVw).observe(bar);
    railArrows();
    if (FINE) qsa("[data-drag]").forEach(dragScroll);
    refresh();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
