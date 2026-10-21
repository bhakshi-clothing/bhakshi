/* =========================================================
   BHAKSHI — Home page (index.html). Owner: Home agent.
   Hero flip-tee · ticker tapes · drop index · print spotlights ·
   spec sheet · mix & match (feature-flagged) · drop alerts · FAQ · JSON-LD.
   Depends on globals from products.js, art.js and app.js (see ARCHITECTURE.md),
   with local fallbacks so a missing helper never blanks the page.
   ========================================================= */
(() => {
  "use strict";

  /* ---------- store-owner tweakables ----------
     Garment measurements shown on the spec sheet, in inches, measured flat.
     A = chest (armpit to armpit), B = length (from the high shoulder point),
     C = shoulder drop, D = sleeve length. Update these to match your factory spec. */
  const SPEC_CHART = {
    S:   { A: 21.5, B: 27,   C: 3, D: 8.5 },
    M:   { A: 22.5, B: 28,   C: 3, D: 9 },
    L:   { A: 23.5, B: 29,   C: 3, D: 9.5 },
    XL:  { A: 24.5, B: 30,   C: 3, D: 10 },
    XXL: { A: 25.5, B: 31,   C: 3, D: 10.5 }
  };
  const SPEC_LABELS = { A: "Chest, pit to pit", B: "Body length", C: "Shoulder drop", D: "Sleeve" };

  /* ---------- small, defensive helpers ---------- */
  const qs = (s, el = document) => el.querySelector(s);
  const qsa = (s, el = document) => [...el.querySelectorAll(s)];
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FINE = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const S = typeof STORE !== "undefined" ? STORE : { name: "BHAKSHI", drop: {}, features: {} };
  const ALL = typeof PRODUCTS !== "undefined" ? PRODUCTS : [];
  const E = s => (typeof esc === "function" ? esc(s)
    : String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])));
  const money = n => (typeof rupee === "function" ? rupee(n) : "₹" + Number(n || 0).toLocaleString("en-IN"));
  const pad = n => String(n).padStart(2, "0");
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const title = p => String(p.name).split(" — ")[0];
  // index rows drop the trailing "Tee" (the section already says "Five tees")
  const short = p => p.shape === "tee" ? title(p).replace(/\s+tee$/i, "") || title(p) : title(p);
  const link = p => `product.html?id=${encodeURIComponent(p.id)}`;
  const absUrl = rel => { try { return new URL(rel, location.href).href; } catch { return rel; } };
  const toastMsg = (m, o) => { if (typeof toast === "function") toast(m, o); };
  const hasArt = typeof Art !== "undefined" && typeof Art.garment === "function";
  const dropNo = () => (S.drop && S.drop.number) || "01";
  const dropName = () => (S.drop && S.drop.name) || "First Light";
  const groupOf = p => (typeof CATEGORIES !== "undefined" && (CATEGORIES.find(c => c.id === p.category) || {}).group) || "";

  const wa = text => {
    if (typeof waLink === "function") { try { return waLink(text); } catch { /* fall through */ } }
    return `https://wa.me/${encodeURIComponent(S.whatsapp || "")}?text=${encodeURIComponent(text)}`;
  };
  const drop = () => {
    if (typeof dropState === "function") { try { const d = dropState(); if (d) return d; } catch { /* fall through */ } }
    const l = S.drop && S.drop.launch ? new Date(S.drop.launch) : null;
    const ms = l && !isNaN(l) ? l - Date.now() : 0;
    return { live: ms <= 0, launch: l, msLeft: Math.max(0, ms) };
  };
  const stock = p => {
    const left = Math.max(0, p.stock | 0), total = p.edition > 0 ? p.edition : 0;
    return { left, total, pct: total ? clamp(left / total * 100, 0, 100) : 100, low: left > 0 && left <= 15, soldOut: left <= 0 };
  };
  const buyable = p => (typeof isBuyable === "function") ? isBuyable(p) : drop().live && p.stock > 0;
  const mixOn = () => {
    if (typeof mixMatchOn === "function") { try { return !!mixMatchOn(); } catch { /* fall through */ } }
    return !!(S.features && S.features.mixAndMatch) && ALL.some(p => groupOf(p) === "Bottoms");
  };
  const wished = id => typeof Wishlist !== "undefined" && Wishlist.has && Wishlist.has(id);

  /* imagery: owner photos first, else the drawn garment from Art */
  const garment = (p, view = "front") => {
    const imgs = p.images || [];
    const src = view === "back" ? (imgs[1] || imgs[0]) : imgs[0];
    if (src) return `<img src="${E(src)}" alt="" loading="lazy" decoding="async">`;
    if (hasArt) { try { return Art.garment(p, { view, bg: false }); } catch (e) { console.warn("[home] Art.garment", e); } }
    return `<span class="hm-noart" style="background:${E(p.color)}"></span>`;
  };
  const printArt = p => {
    const name = (p.print && (p.print.back || p.print.front)) || "";
    if (p.images && p.images.length) return garment(p, "back");
    if (hasArt && typeof Art.print === "function" && name) { try { return Art.print(name, { color: p.color }); } catch (e) { console.warn("[home] Art.print", e); } }
    return garment(p, "back");
  };
  const priceHTML = p => `${money(p.price)}${p.mrp > p.price ? ` <s>${money(p.mrp)}</s>` : ""}`;
  const stockText = st => st.soldOut ? "Sold out" : st.total ? `${pad(st.left)} / ${pad(st.total)} left` : `${st.left} left`;
  const lum = hex => {
    const h = String(hex || "#000").replace("#", ""), v = h.length === 3 ? h.split("").map(c => c + c).join("") : h.padEnd(6, "0");
    const [r, g, b] = [0, 2, 4].map(i => parseInt(v.substr(i, 2), 16) / 255)
      .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  /* countdown: app.js countdown() when present, else a local DD:HH:MM:SS ticker */
  function startCountdown(el, launch) {
    if (!el || !launch) return;
    if (typeof countdown === "function") { try { countdown(el, launch); return; } catch { /* fall through */ } }
    const t = new Date(launch).getTime();
    const tick = () => {
      let s = Math.max(0, Math.floor((t - Date.now()) / 1000));
      const d = Math.floor(s / 86400); s %= 86400;
      const h = Math.floor(s / 3600); s %= 3600;
      el.textContent = `${pad(d)}:${pad(h)}:${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
      if (t - Date.now() > 0) setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    tick();
  }

  /* The current drop: products tagged "new" (falls back to everything), in stock first. */
  const DROP = (() => {
    const fresh = ALL.filter(p => (p.tags || []).includes("new"));
    return (fresh.length ? fresh : ALL.slice()).slice(0, 8);
  })();
  const N = DROP.length;
  const noun = DROP.every(p => p.shape === "tee") ? (N === 1 ? "tee" : "tees") : (N === 1 ? "piece" : "pieces");

  /* ======================================================
     01 · HERO — 3D flip tee + cycle
     ====================================================== */
  function initHero() {
    const hero = qs("#hero"); if (!hero) return;
    const d = drop(), no = dropNo(), name = dropName();

    // drop name / number
    qsa("[data-drop-no]").forEach(el => { el.textContent = no; });
    const words = name.trim().split(/\s+/);
    const [l1, l2] = words.length > 1 ? [words[0], words.slice(1).join(" ")] : ["Drop " + no, name];
    qs("[data-title-1]", hero).textContent = l1;
    qs("[data-title-2]", hero).textContent = l2;
    qs("[data-title-sr]", hero).textContent = `Drop ${no} — ${name}`;
    const badge = qs("[data-badge-text]", hero);
    if (badge) badge.textContent = `DROP ${no} · ${name.toUpperCase()} · LIMITED RUN · `;

    // live / countdown state
    const status = qs("#heroStatus"), ctas = qs("#heroCtas");
    const allGone = N && DROP.every(p => p.stock <= 0);
    if (!d.live) {
      hero.classList.add("is-soon");
      status.innerHTML = `<span class="hm-dot" aria-hidden="true"></span><span>Drops in</span> <span class="hm-cd" id="heroCd"></span>`;
      startCountdown(qs("#heroCd"), d.launch);
      ctas.innerHTML = `<a class="btn btn-wa btn-lg hm-cta" href="${E(wa(`Hi ${S.name}! Remind me when Drop ${no} — ${name} goes live.`))}" target="_blank" rel="noopener">Notify me on WhatsApp</a>
        <a class="btn btn-ghost btn-lg hm-cta-2" href="shop.html">Preview the drop</a>`;
      if (d.msLeft > 0 && d.msLeft < 2147483000) setTimeout(() => location.reload(), d.msLeft + 1200);
    } else if (allGone) {
      status.innerHTML = `<span class="hm-dot is-off" aria-hidden="true"></span><span>Sold out · Thank you</span>`;
      ctas.innerHTML = `<a class="btn btn-lg hm-cta" href="#alerts">Get next-drop alerts</a><a class="btn btn-ghost btn-lg hm-cta-2" href="shop.html">See the archive</a>`;
    } else {
      qs("[data-status-text]", status).textContent = `Live now · ${N} ${noun} · Limited units`;
    }

    // IST clock (decorative)
    const clock = qs("#heroClock");
    if (clock) {
      const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      const tickClock = () => { clock.textContent = "IST " + fmt.format(new Date()); };
      tickClock(); setInterval(tickClock, 1000);
    }

    initFlip(hero);
    fitTitle(hero);
  }

  /* fit both title lines to the space: FIRST top-left, LIGHT bottom-right, tee in between */
  function fitTitle(hero) {
    const main = qs(".hm-hero-main", hero), t = qs(".hm-hero-title", hero);
    const lines = qsa(".hm-ht", hero);
    if (!main || !lines.length) return;
    const run = () => {
      const wide = main.clientWidth >= 900;
      const maxW = main.clientWidth * (wide ? 0.6 : 1);
      t.style.setProperty("--ht", "100px");
      const w = Math.max(...lines.map(l => l.scrollWidth)) || 1;
      let size = maxW / w * 100;
      size = Math.min(size, main.clientHeight * (wide ? 0.4 : 0.3), 300);
      t.style.setProperty("--ht", Math.max(36, Math.floor(size)) + "px");
      hero.classList.add("is-fit");
    };
    run();
    addEventListener("resize", run);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
    addEventListener("load", run);
  }

  function initFlip(hero) {
    const stage = qs("#heroStage"), flip = qs("#heroFlip"), card = qs("#heroCard");
    const tilt = qs(".hm-flip-tilt", hero), bar = qs("#heroBar");
    const front = qs('[data-face="front"]', card), back = qs('[data-face="back"]', card);
    const pick = qs("#heroPick");
    if (!N) { stage.hidden = true; pick.hidden = true; return; }

    const art = DROP.map(p => ({ f: garment(p, "front"), b: garment(p, "back") }));
    let idx = -1, angle = 0, auto = !RM && N > 0, autoT = 0, visible = true, swapping = false;

    const sides = qsa("[data-side-box]", hero);
    sides.forEach(el => { el.innerHTML = `<b data-side="0">Front</b><i>/</i><b data-side="1">Back</b><em>${FINE ? "Hover or drag to spin" : "Tap to flip · swipe for next"}</em>`; });
    qs("[data-pick-n]", pick).textContent = pad(N);

    const face = () => ((Math.round(angle / 180) % 2) + 2) % 2;
    const apply = (anim = true) => {
      card.classList.toggle("no-anim", !anim);
      card.style.transform = `rotateY(${angle}deg)`;
      const f = face();
      flip.setAttribute("aria-pressed", String(f === 1));
      flip.setAttribute("aria-label", `${title(DROP[idx] || DROP[0])}, showing the ${f ? "back" : "front"}. Flip the tee.`);
      qsa("[data-side]", hero).forEach(b => b.classList.toggle("is-on", +b.dataset.side === f));
      if (!anim) { void card.offsetWidth; card.classList.remove("no-anim"); }
    };
    const turn = (dir = 1) => { angle += 180 * dir; apply(); };
    const setFace = f => { if (face() !== f) turn(f ? 1 : -1); };

    function fill(i) {
      idx = i;
      const p = DROP[i], st = stock(p);
      front.innerHTML = art[i].f; back.innerHTML = art[i].b;
      angle = 0; apply(false);
      hero.style.setProperty("--tee", p.color);
      hero.dataset.tone = lum(p.color) > 0.35 ? "light" : "dark";
      qs("[data-pick-i]", pick).textContent = pad(i + 1);
      const nm = qs("[data-pick-name]", pick); nm.textContent = short(p); nm.href = link(p);
      nm.setAttribute("aria-label", `${title(p)} — view product`);
      qs("[data-pick-color]", pick).textContent = p.colorName || "";
      qs("[data-pick-price]", pick).innerHTML = priceHTML(p);
      const sEl = qs("[data-pick-stock]", pick);
      sEl.textContent = stockText(st); sEl.classList.toggle("is-low", st.low || st.soldOut);
      const q = qs("[data-pick-quick]", pick); if (q) { q.dataset.quick = p.id; q.setAttribute("aria-label", `Quick add ${title(p)}`); }
      if (bar && !auto) bar.style.transform = `scaleX(${(i + 1) / N})`;
    }

    function show(i, dir = 1) {
      i = ((i % N) + N) % N;
      if (i === idx || swapping) return;
      if (RM || idx < 0) { fill(i); return; }
      swapping = true;
      stage.style.setProperty("--dir", dir);
      stage.classList.add("is-out");
      setTimeout(() => {
        fill(i);
        stage.classList.remove("is-out"); stage.classList.add("is-in");
        void stage.offsetWidth;
        requestAnimationFrame(() => { stage.classList.remove("is-in"); swapping = false; });
      }, 280);
    }

    /* autoplay: front → flip to back → next tee. Any interaction stops it for good. */
    const STEP_F = 2600, STEP_B = 2900;
    const restartBar = () => {
      if (!bar) return;
      bar.classList.remove("is-run"); void bar.offsetWidth;
      if (auto) { bar.style.transform = ""; bar.style.setProperty("--dur", (STEP_F + STEP_B) + "ms"); bar.classList.add("is-run"); }
    };
    const schedule = () => {
      clearTimeout(autoT);
      if (!auto || !visible || document.hidden) { if (bar) bar.classList.add("is-paused"); return; }
      if (bar) bar.classList.remove("is-paused");
      const isBack = face() === 1;
      autoT = setTimeout(() => {
        if (!auto) return;
        if (!isBack) { setFace(1); schedule(); }
        else { show(idx + 1, 1); setTimeout(restartBar, 300); schedule(); }
      }, isBack ? STEP_B : STEP_F);
    };
    const stopAuto = () => {
      if (!auto) return;
      auto = false; clearTimeout(autoT);
      pick.setAttribute("aria-live", "polite"); // announce changes only once the visitor is driving
      if (bar) { bar.classList.remove("is-run", "is-paused"); bar.style.transform = `scaleX(${(idx + 1) / N})`; }
      hero.classList.add("is-manual");
    };

    fill(0);
    if (auto) {
      restartBar(); schedule();
      new IntersectionObserver(es => { visible = es[0].isIntersecting; schedule(); }, { threshold: 0.2 }).observe(hero);
      document.addEventListener("visibilitychange", schedule);
    } else if (bar) bar.style.transform = `scaleX(${1 / N})`;

    // arrows + keyboard
    qsa("[data-hero-dir]", hero).forEach(b => b.addEventListener("click", () => { stopAuto(); show(idx + +b.dataset.heroDir, +b.dataset.heroDir); }));
    hero.addEventListener("keydown", e => {
      if (e.target.closest("input, textarea, select")) return;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault(); stopAuto();
        const dir = e.key === "ArrowRight" ? 1 : -1; show(idx + dir, dir);
      }
    });

    /* pointer: mouse = hover flips, drag spins freely; touch = tap flips, swipe cycles */
    let down = null, moved = false, suppressClick = false;
    flip.addEventListener("click", e => {
      if (suppressClick) { suppressClick = false; e.preventDefault(); return; }
      stopAuto(); turn(1);
    });
    if (FINE) {
      flip.addEventListener("mouseenter", () => { stopAuto(); if (!down) setFace(1); });
      flip.addEventListener("mouseleave", () => { if (!down) setFace(0); });
    }
    flip.addEventListener("pointerdown", e => {
      if (e.button !== 0) return;
      down = { x: e.clientX, y: e.clientY, a: angle, type: e.pointerType, t: performance.now() };
      moved = false;
    });
    addEventListener("pointermove", e => {
      if (!down || down.type !== "mouse") return;
      const dx = e.clientX - down.x;
      if (!moved && Math.abs(dx) > 5) { moved = true; stopAuto(); hero.classList.add("is-dragging"); }
      if (moved) { angle = down.a + dx * 0.6; apply(false); }
    });
    addEventListener("pointerup", e => {
      if (!down) return;
      const dd = down; down = null;
      if (dd.type === "mouse") {
        hero.classList.remove("is-dragging");
        if (moved) { suppressClick = true; angle = Math.round(angle / 180) * 180; apply(); setTimeout(() => { suppressClick = false; }, 0); }
        return;
      }
      const dx = e.clientX - dd.x, dy = e.clientY - dd.y;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        suppressClick = true; setTimeout(() => { suppressClick = false; }, 350);
        stopAuto(); const dir = dx < 0 ? 1 : -1; show(idx + dir, dir);
      }
    });
    addEventListener("pointercancel", () => { down = null; hero.classList.remove("is-dragging"); });
    flip.addEventListener("dragstart", e => e.preventDefault());

    // swipe also works on the rest of the stage on touch
    let ts = null;
    stage.addEventListener("touchstart", e => { if (e.target.closest(".hm-flip")) return; const t = e.touches[0]; ts = { x: t.clientX, y: t.clientY }; }, { passive: true });
    stage.addEventListener("touchend", e => {
      if (!ts) return; const t = e.changedTouches[0], dx = t.clientX - ts.x, dy = t.clientY - ts.y; ts = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) { stopAuto(); const dir = dx < 0 ? 1 : -1; show(idx + dir, dir); }
    }, { passive: true });
    qs("#heroPick").addEventListener("pointerdown", stopAuto);

    // subtle pointer tilt + type parallax (desktop, motion allowed)
    if (FINE && !RM) {
      const l1 = qs(".hm-ht-1", hero), l2 = qs(".hm-ht-2", hero), spot = qs(".hm-spot", hero);
      let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
      const loop = () => {
        x += (tx - x) * 0.09; y += (ty - y) * 0.09;
        tilt.style.transform = `rotateX(${(-y * 9).toFixed(2)}deg) rotateY(${(x * 12).toFixed(2)}deg)`;
        l1.style.transform = `translate3d(${(x * -18).toFixed(1)}px, ${(y * -8).toFixed(1)}px, 0)`;
        l2.style.transform = `translate3d(${(x * 18).toFixed(1)}px, ${(y * 8).toFixed(1)}px, 0)`;
        spot.style.transform = `translate3d(${(x * 30).toFixed(1)}px, ${(y * 20).toFixed(1)}px, 0)`;
        raf = (Math.abs(tx - x) > 0.002 || Math.abs(ty - y) > 0.002) ? requestAnimationFrame(loop) : 0;
      };
      hero.addEventListener("pointermove", e => {
        if (e.pointerType !== "mouse") return;
        const r = stage.getBoundingClientRect();
        tx = clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2), -1.4, 1.4) / 1.4;
        ty = clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2), -1.4, 1.4) / 1.4;
        if (!raf) raf = requestAnimationFrame(loop);
      });
      hero.addEventListener("pointerleave", () => { tx = ty = 0; if (!raf) raf = requestAnimationFrame(loop); });
    }
  }

  /* ======================================================
     03 · THE DROP — interactive index
     ====================================================== */
  function rowHTML(p, i) {
    const st = stock(p), t = title(p);
    const tag = st.soldOut ? "Sold out" : st.low ? "Low stock" : "Back print";
    return `<li class="hm-row${st.low ? " is-low" : ""}${st.soldOut ? " is-out" : ""}" data-i="${i}" style="--c:${E(p.color)}">
      <span class="hm-row-media" aria-hidden="true">${garment(p, "back")}<span class="hm-row-tag">${tag}</span></span>
      <span class="hm-row-no">${pad(i + 1)}</span>
      <h3 class="hm-row-name"><a class="hm-row-link" href="${link(p)}">${E(short(p))}${short(p) !== t ? `<span class="hm-sr"> Tee</span>` : ""}</a></h3>
      <span class="hm-row-col"><i style="background:${E(p.color)}"></i>${E(p.colorName || "")}</span>
      <span class="hm-row-price">${priceHTML(p)}</span>
      <span class="hm-row-stock"><span>${stockText(st)}</span><span class="hm-meter" aria-hidden="true"><i style="--p:${st.pct.toFixed(1)}%"></i></span></span>
      <button class="hm-row-quick" type="button" data-quick="${E(p.id)}" aria-label="Quick add ${E(t)}"><span>Quick add</span><b aria-hidden="true">+</b></button>
    </li>`;
  }

  function initDrop() {
    const list = qs("#dropList"), wrap = qs("#dropWrap"), peek = qs("#dropPeek");
    if (!list) return;
    if (!N) { qs("#drop").hidden = true; return; }
    qsa("[data-drop-count]").forEach(el => { el.textContent = `(${pad(N)})`; });
    list.innerHTML = DROP.map(rowHTML).join("");
    const rows = qsa(".hm-row", list);

    // mobile/touch scroller position + dots
    const pos = qs("#dropPos"), dots = qs("#dropDots");
    if (dots) dots.innerHTML = DROP.map(() => "<i></i>").join("");
    const updatePos = () => {
      if (list.scrollWidth <= list.clientWidth + 4) return;
      const w = rows[0].getBoundingClientRect().width + parseFloat(getComputedStyle(list).columnGap || 0);
      const i = clamp(Math.round(list.scrollLeft / (w || 1)), 0, N - 1);
      if (pos) pos.textContent = `${pad(i + 1)} / ${pad(N)}`;
      if (dots) qsa("i", dots).forEach((d, k) => d.classList.toggle("is-on", k === i));
    };
    list.addEventListener("scroll", () => requestAnimationFrame(updatePos), { passive: true });
    updatePos();

    // desktop: tee follows the cursor
    if (!peek) return;
    peek.innerHTML = DROP.map((p, i) => `<div class="hm-peek-i" data-i="${i}" style="--c:${E(p.color)}">${garment(p, "back")}</div>`).join("");
    const items = qsa(".hm-peek-i", peek);
    const desk = matchMedia("(hover: hover) and (pointer: fine) and (min-width: 900px)");
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0, on = false, cur = -1;
    const setActive = i => {
      if (i === cur) return; cur = i;
      items.forEach((el, k) => el.classList.toggle("is-on", k === i));
      rows.forEach((r, k) => r.classList.toggle("is-active", k === i));
      wrap.style.setProperty("--peek-c", DROP[i] ? DROP[i].color : "transparent");
    };
    const loop = () => {
      const dx = tx - x;
      x += dx * (RM ? 1 : 0.16); y += (ty - y) * (RM ? 1 : 0.16);
      const rot = RM ? 0 : clamp(dx * 0.12, -14, 14);
      peek.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg)`;
      raf = (on && (Math.abs(tx - x) > 0.3 || Math.abs(ty - y) > 0.3)) ? requestAnimationFrame(loop) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    wrap.addEventListener("pointermove", e => {
      if (!desk.matches || e.pointerType !== "mouse") return;
      const r = wrap.getBoundingClientRect();
      const pw = (items[0] && items[0].offsetWidth) || 280, cx = e.clientX - r.left;
      const row = e.target.closest(".hm-row");
      if (row) setActive(+row.dataset.i);
      // keep the preview just past the active name so the name stays readable
      const nm = row && qs(".hm-row-link", row), nr = nm ? nm.getBoundingClientRect().right - r.left + 18 : 0;
      tx = clamp(Math.max(cx + pw * 0.62, nr + pw * 0.5 + 28), pw * 0.5, r.width - pw * 0.5); ty = e.clientY - r.top;
      if (!on) { on = true; x = tx; y = ty; peek.classList.add("is-on"); }
      kick();
    });
    wrap.addEventListener("pointerleave", () => { on = false; peek.classList.remove("is-on"); setActive(-1); });
    // keyboard focus: park the preview beside the focused row
    list.addEventListener("focusin", e => {
      if (!desk.matches) return;
      const row = e.target.closest(".hm-row"); if (!row) return;
      const r = wrap.getBoundingClientRect(), rr = row.getBoundingClientRect();
      tx = x = rr.left - r.left + rr.width * 0.62; ty = y = rr.top - r.top + rr.height / 2;
      on = true; peek.classList.add("is-on"); setActive(+row.dataset.i); loop();
    });
    list.addEventListener("focusout", e => { if (!list.contains(e.relatedTarget)) { on = false; peek.classList.remove("is-on"); setActive(-1); } });
  }

  /* ======================================================
     04 · PRINT SPOTLIGHTS
     ====================================================== */
  function buyHTML(p, st, d) {
    const t = title(p);
    if (!d.live) {
      return `<p class="hm-sp-lock"><span>Drops in</span> <b class="hm-cd" data-cd></b></p>
        <a class="btn btn-wa hm-sp-btn" href="${E(wa(`Hi ${S.name}! Remind me when the ${t} drops.`))}" target="_blank" rel="noopener">Notify me on WhatsApp</a>`;
    }
    if (st.soldOut) {
      return `<p class="hm-sp-lock is-out">Sold out. This run is done.</p>
        <a class="btn btn-ghost hm-sp-btn" href="${E(wa(`Hi ${S.name}! Let me know if the ${t} (${p.colorName}) ever comes back.`))}" target="_blank" rel="noopener">Restock alert on WhatsApp</a>`;
    }
    return `<p class="hm-sp-label" id="sz-${E(p.id)}">Tap a size to add to bag</p>
      <div class="hm-sp-sizes" role="group" aria-labelledby="sz-${E(p.id)}">${(p.sizes || []).map(s =>
        `<button class="hm-size" type="button" data-add="${E(p.id)}" data-size="${E(s)}" aria-label="Add ${E(t)}, size ${E(s)}, to bag"${buyable(p) ? "" : " disabled"}>${E(s)}</button>`).join("")}</div>`;
  }

  function spotHTML(p, i, d) {
    const st = stock(p), t = title(p), tone = lum(p.color) > 0.35 ? "light" : "dark";
    const printName = (p.print && p.print.back) || "plain";
    return `<article class="hm-sp" data-fly id="print-${E(p.id)}" data-tone="${tone}" style="--c:${E(p.color)}" aria-labelledby="sp-${E(p.id)}">
      <div class="hm-sp-in container">
        <div class="hm-sp-art">
          <div class="hm-sp-print">${printArt(p)}</div>
          <span class="hm-sp-tag">Back print · ${E(printName)}</span>
          <a class="hm-sp-mini" href="${link(p)}" tabindex="-1" aria-hidden="true">${garment(p, "back")}</a>
          <span class="hm-sp-num" aria-hidden="true">${pad(i + 1)}</span>
        </div>
        <div class="hm-sp-info">
          <p class="hm-sp-kick"><span>[ ${pad(i + 1)} / ${pad(N)} ]</span><span>${E(p.fit || "Oversized")} tee</span></p>
          <h3 class="hm-sp-name" id="sp-${E(p.id)}"><a href="${link(p)}">${E(t)}</a></h3>
          <p class="hm-sp-desc">${E(p.desc || "")}</p>
          <dl class="hm-sp-meta">
            <div><dt>Colour</dt><dd><i style="background:${E(p.color)}"></i>${E(p.colorName || "")}</dd></div>
            <div><dt>Price</dt><dd>${priceHTML(p)}</dd></div>
            <div class="${st.low || st.soldOut ? "is-low" : ""}"><dt>Left</dt><dd>${stockText(st)}</dd></div>
          </dl>
          <div class="hm-meter hm-sp-meter${st.low ? " is-low" : ""}" role="img" aria-label="${E(stockText(st))}"><i style="--p:${st.pct.toFixed(1)}%"></i></div>
          <div class="hm-sp-buy">${buyHTML(p, st, d)}</div>
          <div class="hm-sp-actions">
            <button class="hm-wish" type="button" data-keep-label="1" data-wish="${E(p.id)}" aria-pressed="${wished(p.id)}" aria-label="Save ${E(t)} to wishlist">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.3s-7.8-4.6-7.8-10.3A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 7.8 2.6c0 5.7-7.8 10.3-7.8 10.3Z"/></svg><span>${wished(p.id) ? "Saved" : "Wishlist"}</span>
            </button>
            <a class="link-arrow" href="${link(p)}">Full details</a>
          </div>
        </div>
      </div>
    </article>`;
  }

  function initPrints() {
    const box = qs("#printsList"); if (!box) return;
    if (!N) { qs("#prints").hidden = true; return; }
    const d = drop();
    box.innerHTML = DROP.map((p, i) => spotHTML(p, i, d)).join("");
    if (!d.live) qsa("[data-cd]", box).forEach(el => startCountdown(el, d.launch));

    // stacked panels: each one dims slightly as the next slides over it (desktop sticky mode only)
    const cards = qsa(".hm-sp", box);
    const mq = matchMedia("(min-width: 1024px) and (min-height: 700px)");
    let ticking = false;
    const update = () => {
      ticking = false;
      if (!mq.matches || RM) { cards.forEach(c => c.style.removeProperty("--cover")); return; }
      const h = innerHeight;
      cards.forEach((c, k) => {
        const next = cards[k + 1]; if (!next) return;
        const top = next.getBoundingClientRect().top, stick = c.getBoundingClientRect().top;
        c.style.setProperty("--cover", clamp(1 - (top - stick) / (h - stick || 1), 0, 1).toFixed(3));
      });
    };
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener("resize", update);
    update();
  }

  // keep every wishlist button on the page in sync
  function syncWish() {
    qsa("main [data-wish]").forEach(b => {
      const on = !!wished(b.dataset.wish);
      b.setAttribute("aria-pressed", String(on));
      if (!b.classList.contains("hm-wish")) return;
      const s = qs("span", b); if (s) s.textContent = on ? "Saved" : "Wishlist";
      const p = ALL.find(x => x.id === b.dataset.wish);
      if (p) b.setAttribute("aria-label", on ? `Remove ${title(p)} from wishlist` : `Save ${title(p)} to wishlist`);
    });
  }

  /* ======================================================
     05 · SPEC SHEET — blueprint with live measurements
     ====================================================== */
  function blueprintSVG() {
    const L = "M320 104C292 104 272 90 262 70L150 96L62 252L132 290L162 250L162 548L478 548L478 250L508 290L578 252L490 96L378 70C368 90 348 104 320 104Z";
    return `<svg viewBox="0 0 640 610" role="img" aria-labelledby="bpTitle">
      <title id="bpTitle">Line drawing of the oversized tee with measurement callouts</title>
      <defs>
        <marker id="bpAr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1L9 5L0 9" fill="none" stroke="currentColor" stroke-width="1.6"/></marker>
      </defs>
      <g class="bp-tee">
        <path class="bp-fill" d="${L}"/>
        <path pathLength="1" d="${L}"/>
        <path pathLength="1" d="M262 70C290 62 350 62 378 70"/>
        <path pathLength="1" d="M262 70C274 98 296 116 320 116C344 116 366 98 378 70"/>
        <path class="bp-dash" d="M150 96Q160 170 162 250M490 96Q480 170 478 250"/>
        <path class="bp-dash" d="M68 241.6L138 279.6M572 241.6L502 279.6M162 534H478"/>
        <path class="bp-fine" d="M320 122V140"/>
      </g>
      <g class="bp-dim" data-dim="A">
        <path d="M168 300H472" marker-start="url(#bpAr)" marker-end="url(#bpAr)"/>
        <path class="bp-ext" d="M162 262V312M478 262V312"/>
        <rect class="bp-pill" x="252" y="312" width="136" height="30" rx="2"/>
        <text x="320" y="333" text-anchor="middle"><tspan class="bp-k">A</tspan> <tspan data-v="A">22.5″</tspan></text>
      </g>
      <g class="bp-dim" data-dim="B">
        <path class="bp-ext" d="M384 70H622M484 548H622"/>
        <path d="M606 76V542" marker-start="url(#bpAr)" marker-end="url(#bpAr)"/>
        <rect class="bp-pill" x="560" y="290" width="92" height="30" rx="2" transform="rotate(-90 606 305)"/>
        <text x="606" y="311" text-anchor="middle" transform="rotate(-90 606 305)"><tspan class="bp-k">B</tspan> <tspan data-v="B">28″</tspan></text>
      </g>
      <g class="bp-dim" data-dim="C">
        <path class="bp-ext" d="M256 70H96M144 96H96"/>
        <path d="M104 74V92" marker-start="url(#bpAr)" marker-end="url(#bpAr)"/>
        <rect class="bp-pill" x="2" y="66" width="92" height="30" rx="2"/>
        <text x="48" y="87" text-anchor="middle"><tspan class="bp-k">C</tspan> <tspan data-v="C">3″</tspan></text>
      </g>
      <g class="bp-dim" data-dim="D">
        <path d="M131 92L47 240" marker-start="url(#bpAr)" marker-end="url(#bpAr)"/>
        <rect class="bp-pill" x="0" y="116" width="96" height="30" rx="2"/>
        <text x="48" y="137" text-anchor="middle"><tspan class="bp-k">D</tspan> <tspan data-v="D">9″</tspan></text>
      </g>
      <g class="bp-note">
        <path d="M320 140V176"/><text x="320" y="196" text-anchor="middle">RIBBED CREW</text>
        <text class="bp-big" x="320" y="440" text-anchor="middle">240</text>
        <text x="320" y="470" text-anchor="middle">GSM · 100% COTTON</text>
        <path d="M230 548V584"/><text x="238" y="600">BOXY HEM · DROPPED SHOULDER</text>
      </g>
    </svg>`;
  }

  function initSpec() {
    const svgBox = qs("#bpSvg"), sizes = qs("#bpSizes"), dims = qs("#bpDims");
    if (!svgBox) return;
    svgBox.innerHTML = blueprintSVG();
    const keys = Object.keys(SPEC_CHART);
    let cur = keys.includes("M") ? "M" : keys[0];
    sizes.innerHTML = keys.map(k => `<button type="button" role="radio" class="hm-bp-size" data-sz="${k}" aria-checked="${k === cur}" tabindex="${k === cur ? 0 : -1}">${k}</button>`).join("");
    dims.innerHTML = Object.keys(SPEC_LABELS).map(k => `<div data-dim-row="${k}"><dt><b>${k}</b>${SPEC_LABELS[k]}</dt><dd data-v="${k}"></dd></div>`).join("");
    const fmt = v => `${v}″`;
    const render = (animate) => {
      const row = SPEC_CHART[cur];
      qsa(".hm-bp-size", sizes).forEach(b => { const on = b.dataset.sz === cur; b.setAttribute("aria-checked", on); b.tabIndex = on ? 0 : -1; });
      qsa("[data-v]", qs("#specs")).forEach(el => {
        const v = fmt(row[el.dataset.v]);
        if (el.textContent === v) return;
        el.textContent = v;
        if (animate && !RM) { el.classList.remove("is-flash"); void el.getBoundingClientRect(); el.classList.add("is-flash"); }
      });
    };
    sizes.addEventListener("click", e => { const b = e.target.closest(".hm-bp-size"); if (!b) return; cur = b.dataset.sz; render(true); });
    sizes.addEventListener("keydown", e => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
      e.preventDefault();
      const i = keys.indexOf(cur) + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1);
      cur = keys[(i + keys.length) % keys.length]; render(true);
      qs(`[data-sz="${cur}"]`, sizes).focus();
    });
    // hovering a dimension row highlights its callout
    const svg = qs("svg", svgBox);
    const hi = k => qsa(".bp-dim", svg).forEach(g => g.classList.toggle("is-hi", g.dataset.dim === k));
    qsa("[data-dim-row]", dims).forEach(r => {
      r.addEventListener("mouseenter", () => hi(r.dataset.dimRow));
      r.addEventListener("mouseleave", () => hi(null));
    });
    render(false);
  }

  /* ======================================================
     06 · MIX & MATCH — "Build your look" studio.
     FEATURE FLAG: rendered only when mixMatchOn() is true
     (STORE.features.mixAndMatch === true AND at least one bottom exists in PRODUCTS).
     Otherwise the <template> in index.html is never cloned, so nothing appears.
     ====================================================== */
  const TOP_CATS = ["tshirts", "shirts", "polos", "kurtas", "hoodies", "jackets"];
  const BOTTOM_CATS = ["jeans", "trousers", "joggers", "shorts"];
  function initStudio() {
    const mount = qs("#studioMount"), tpl = qs("#tpl-studio");
    if (!mount || !tpl) return;
    const tops = ALL.filter(p => TOP_CATS.includes(p.category) && p.stock > 0);
    const bottoms = ALL.filter(p => (BOTTOM_CATS.includes(p.category) || groupOf(p) === "Bottoms") && p.stock > 0);
    if (!mixOn() || !tops.length || !bottoms.length) { mount.remove(); return; } // flag off → nothing on the page
    mount.replaceWith(tpl.content.cloneNode(true));
    const root = qs("#studio");
    const outfit = (t, b) => (hasArt && typeof Art.outfit === "function") ? Art.outfit(t, b, { bg: false }) : garment(t);
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
      qs("[data-price]", el).innerHTML = priceHTML(p);
      qs("[data-count]", el).textContent = `${pad(St[part].i + 1)} / ${pad(St[part].list.length)}`;
      qsa(".hm-thumb", el).forEach((b, i) => { b.setAttribute("aria-selected", i === St[part].i); b.classList.toggle("is-on", i === St[part].i); });
      if (St[part].size && !p.sizes.includes(St[part].size)) St[part].size = null;
      renderSizes(part);
    }
    function renderStage() {
      const t = cur("top"), b = cur("bottom");
      stageArt.innerHTML = `<div class="hm-stage-layer" role="img" aria-label="Outfit: ${E(t.name)} with ${E(b.name)}">${outfit(t, b)}</div>`;
      stageNo.textContent = `Look ${pad(St.top.i + 1)}·${pad(St.bottom.i + 1)}`;
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
      Cart.add(t.id, St.top.size, 1); Cart.add(b.id, St.bottom.size, 1);
      if (typeof flyToCart === "function") flyToCart(stageArt);
      toastMsg(`Look added: ${title(t)} (${St.top.size}) + ${title(b)} (${St.bottom.size})`, { type: "success" });
    });
    renderInfo("top"); renderInfo("bottom"); renderStage();
  }

  /* ======================================================
     07 · DROP ALERTS
     ====================================================== */
  function initAlerts() {
    const form = qs("#alertForm"); if (!form) return;
    const d = drop(), no = dropNo(), next = pad((parseInt(no, 10) || 1) + 1);
    if (!d.live) {
      qs("[data-alert-title]").textContent = `Drop ${no} soon.`;
      qs("[data-alert-line]").textContent = "One WhatsApp message the minute it goes live. No spam, no group chats.";
    }
    const input = qs("#alertName"), err = qs("#alertErr");
    form.addEventListener("submit", e => {
      e.preventDefault();
      const name = input.value.trim().replace(/\s+/g, " ").slice(0, 40);
      if (!name) { err.textContent = "Add your name so we know who's asking."; input.focus(); input.setAttribute("aria-invalid", "true"); return; }
      err.textContent = ""; input.removeAttribute("aria-invalid");
      const msg = d.live
        ? `Hi ${S.name}! I'm ${name}. Put me on the list for Drop ${next}.`
        : `Hi ${S.name}! I'm ${name}. Remind me when Drop ${no} — ${dropName()} goes live.`;
      window.open(wa(msg), "_blank", "noopener");
      toastMsg("Opening WhatsApp — just hit send.", { type: "success" });
    });
    input.addEventListener("input", () => { if (input.value.trim()) { err.textContent = ""; input.removeAttribute("aria-invalid"); } });

    const ig = qs("#igLink");
    if (ig && S.instagram) {
      ig.href = S.instagram;
      const m = String(S.instagram).match(/instagram\.com\/([A-Za-z0-9._]+)/);
      ig.textContent = `Tag @${m ? m[1] : "bhakshi"}`;
    }
  }

  /* ======================================================
     08 · FAQ accordion
     ====================================================== */
  function initFaq() {
    const pay = qs("[data-faq-pay]");
    if (pay) pay.textContent = S.codFee === -1
      ? "Pay by UPI on any app — Google Pay, PhonePe, Paytm, anything. We share our UPI ID when we confirm your order."
      : `Either. Pay by UPI on any app, or choose Cash on Delivery and pay when the parcel reaches you${S.codFee > 0 ? ` (a small ${money(S.codFee)} COD fee applies)` : ""}.`;
    const ship = qs("[data-faq-ship]");
    if (ship && S.freeShippingAbove) ship.textContent = `We dispatch in 1–2 working days, then it's 3–7 working days to your door depending on the pincode. Shipping is free above ${money(S.freeShippingAbove)}.`;
    const faqWa = qs("#faqWa");
    if (faqWa) faqWa.href = wa(`Hi ${S.name}, I have a question about `);

    qsa(".hm-acc-btn").forEach(b => b.addEventListener("click", () => {
      const open = b.getAttribute("aria-expanded") !== "true";
      b.setAttribute("aria-expanded", String(open));
      b.closest(".hm-acc-item").classList.toggle("is-open", open);
    }));
  }

  /* ======================================================
     Reveal-on-scroll for home blocks (independent of the shell)
     ====================================================== */
  function initReveal() {
    const els = qsa(".hm-head, .hm-prints-head, .hm-row, .hm-sp-info, .hm-sp-art, .hm-bp-draw, .hm-bp-side, .hm-alerts-copy, .hm-alerts-form, .hm-faq-head, .hm-acc-item");
    els.forEach(el => el.classList.add("hm-rv"));
    if (RM || !("IntersectionObserver" in window)) { els.forEach(el => el.classList.add("is-in")); return; }
    document.documentElement.classList.add("hm-js");
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target, sib = el.parentElement ? [...el.parentElement.children].filter(c => c.classList.contains("hm-rv")) : [];
      el.style.transitionDelay = Math.min(sib.indexOf(el), 6) * 60 + "ms";
      el.classList.add("is-in"); io.unobserve(el);
      setTimeout(() => { el.style.transitionDelay = ""; }, 1400);
    }), { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    els.forEach(el => io.observe(el));
  }

  /* ======================================================
     SEO — JSON-LD from STORE + FAQ
     ====================================================== */
  function injectLD() {
    const prices = ALL.map(p => p.price).filter(Boolean);
    const home = "https://bhakshi-clothing.github.io/bhakshi/";
    const store = {
      "@context": "https://schema.org", "@type": "ClothingStore",
      name: S.name, description: `${S.tagline || "Graphic tees, made in India"}. Drop ${dropNo()} “${dropName()}”: heavyweight 240 GSM oversized graphic tees in limited units.`,
      url: home, image: home + "images/og.png", logo: home + "images/favicon.svg",
      email: S.email || undefined,
      telephone: S.whatsapp ? "+" + S.whatsapp : undefined,
      priceRange: prices.length ? `${money(Math.min(...prices))}–${money(Math.max(...prices))}` : undefined,
      currenciesAccepted: "INR",
      paymentAccepted: S.codFee === -1 ? "UPI" : "UPI, Cash on Delivery",
      address: { "@type": "PostalAddress", addressCountry: "IN", addressLocality: S.city || "India" },
      areaServed: { "@type": "Country", name: "India" },
      sameAs: [S.instagram].filter(u => u && !/instagram\.com\/?$/.test(u))
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
  function setOffsets() {
    const de = document.documentElement, hero = qs("#hero");
    if (hero) de.style.setProperty("--hm-top", Math.max(0, Math.round(hero.getBoundingClientRect().top + scrollY)) + "px");
  }
  function boot() {
    const steps = [initHero, initDrop, initPrints, initSpec, initStudio, initAlerts, initFaq, injectLD, initReveal];
    steps.forEach(fn => { try { fn(); } catch (err) { console.error("[home] " + fn.name, err); } });
    setOffsets();
    addEventListener("resize", setOffsets);
    addEventListener("load", setOffsets);
    document.addEventListener("wishlist:change", syncWish);
    syncWish();
    if (typeof refreshReveal === "function") { try { refreshReveal(); } catch { /* shell optional */ } }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
