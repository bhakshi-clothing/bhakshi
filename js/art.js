/* =========================================================
   BHAKSHI — product artwork (v2, "dark drop culture")
   Studio-style garment renders + original graphic prints, used
   whenever a product has no photos.

   API (global `Art`):
     Art.garment(product, { bg = true, view = "front" })  -> SVG string (400×500)
         view: "front" | "back" | "detail" (close-up of the hero print,
         fabric and woven BHAKSHI tab). bg:false => transparent.
     Art.print(name, { color, side })                      -> SVG string (400×400, transparent)
         just the graphic; `color` = garment colour it sits on (picks inks).
         side "front" | "back" (default "back") — only "chai" differs
         (front = chai glass, back = break ticket).
     Art.outfit(top, bottom, { bg = true })               -> SVG string
     Art.swatch(color)                                    -> SVG string (24×24)

   Pure string building: no DOM access, no network. Every call gets its
   own id prefix so gradients / patterns / clipPaths never collide when
   many SVGs are inlined on one page. Text uses the page's Google Fonts
   (Archivo wide + Space Mono) with textLength, so layouts hold even
   before the fonts load (falls back to Arial Black / monospace).
   ========================================================= */
const Art = (() => {
  let uid = 0;
  const nextId = () => "bk" + (++uid).toString(36) + "-";
  const r1 = n => Math.round(n * 10) / 10;
  const escA = s => String(s == null ? "" : s).replace(/[&<>"']/g, ch =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

  /* ---------- colour helpers ---------- */
  function normHex(hex) {
    let h = String(hex || "").trim().replace("#", "");
    if (h.length === 3) h = h.split("").map(x => x + x).join("");
    return /^[0-9a-f]{6}$/i.test(h) ? "#" + h.toLowerCase() : "#8a837a";
  }
  function hexToHsl(hex) {
    const n = parseInt(normHex(hex).slice(1), 16);
    const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function hslToHex(h, s, l) {
    const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
    return "#" + [f(0), f(8), f(4)].map(x => x.toString(16).padStart(2, "0")).join("");
  }
  // shift lightness by dl (−1…1); optional saturation shift
  function shade(hex, dl, ds = 0) {
    const [h, s, l] = hexToHsl(hex);
    const c = v => Math.max(0, Math.min(1, v));
    return hslToHex(h, c(s + ds), c(l + dl));
  }
  // perceived brightness 0…1 (decides light vs dark ink)
  function luma(hex) {
    const n = parseInt(normHex(hex).slice(1), 16);
    return ((n >> 16) * .299 + ((n >> 8) & 255) * .587 + (n & 255) * .114) / 255;
  }

  /* ---------- fabric textures (tiny tiling patterns, cheap to render) ---------- */
  const W = (o, w = .8) => `stroke="#fff" stroke-opacity="${o}" stroke-width="${w}"`;
  const B = (o, w = .8) => `stroke="#000" stroke-opacity="${o}" stroke-width="${w}"`;
  const pat = (id, s, inner, tf = "") =>
    `<pattern id="${id}" width="${s}" height="${s}" patternUnits="userSpaceOnUse"${tf ? ` patternTransform="${tf}"` : ""}>${inner}</pattern>`;
  const TEX = {
    denim:   id => pat(id, 5, `<path d="M0 1H5" ${W(.13, 1.3)}/><path d="M0 3.5H5" ${B(.16, 1.1)}/>`, "rotate(-40)"),
    twill:   id => pat(id, 4, `<path d="M0 1H4" ${W(.07)}/><path d="M0 3H4" ${B(.07)}/>`, "rotate(-40)"),
    oxford:  id => pat(id, 4, `<path d="M0 .7H2M2 2.7H4" ${W(.2, 1.1)}/><path d="M0 2.7H2M2 .7H4" ${B(.06, 1.1)}/>`),
    linen:   id => pat(id, 12, `<path d="M0 2H7M9 2H12M0 6.5H4M6 6.5H12M0 10H9" ${W(.13)}/><path d="M3 0V12M8.5 0V5M8.5 7V12" ${B(.06, .7)}/>`),
    cotton:  (id, c) => pat(id, 3, `<path d="M0 1.5H3" ${W(c.dark ? .03 : .07)}/><path d="M1.5 0V3" ${B(c.dark ? .1 : .05)}/>`),
    // heavyweight single jersey: knit "V" columns + faint slub dots (visible on close-ups)
    jersey:  (id, c) => pat(id, 2.6, `<path d="M0 0L.65 1.3L1.3 0M1.3 1.3L1.95 2.6L2.6 1.3" fill="none" ${B(c.light ? .05 : c.dark ? .09 : .06, .5)}/><path d="M.65 1.3V2.6M1.95 0V1.3" ${W(c.dark ? .035 : .05, .45)}/>`),
    pique:   (id, c) => pat(id, 3.2, `<circle cx=".8" cy=".8" r=".6" fill="#000" fill-opacity="${c.light ? .07 : .12}"/><circle cx="2.4" cy="2.4" r=".6" fill="#fff" fill-opacity="${c.dark ? .05 : .08}"/>`),
    melange: (id, c) => pat(id, 7, `<path d="M1 1h.4M4.5 2h.4M2 5h.4M6 4.4h.4" stroke="#fff" stroke-opacity="${c.dark ? .09 : .26}" stroke-width="1.2" stroke-linecap="round"/><path d="M3 3.4h.4M5.5 6.2h.4M.4 3h.4" stroke="#000" stroke-opacity="${c.dark ? .2 : .14}" stroke-width="1.2" stroke-linecap="round"/>`),
    suiting: id => pat(id, 3, `<path d="M0 1.5H3" ${W(.05)}/>`, "rotate(-45)"),
    nylon:   () => ""
  };
  // bio-wash mottling: a sparse larger tile of soft light/dark specks layered over the knit
  const WASH = (id, c) => pat(id, 37, `<path d="M3 4h.6M21 9h1M9 23h.6M27 30h.8M33 12h.5" stroke="#fff" stroke-opacity="${c.dark ? ".04" : ".06"}" stroke-width="1.5" stroke-linecap="round"/><path d="M15 2h.8M2 16h.6M30 19h.8M18 33h.5" stroke="#000" stroke-opacity="${c.light ? ".05" : ".08"}" stroke-width="1.5" stroke-linecap="round"/>`, "rotate(8)");
  function fabricOf(p) {
    const f = (p.fabric || "") + " " + (p.name || "");
    if (/denim|jeans/i.test(f)) return "denim";
    if (/linen/i.test(f)) return "linen";
    if (/oxford/i.test(f)) return "oxford";
    if (/piq/i.test(f)) return "pique";
    if (/fleece|knit|melange/i.test(f)) return "melange";
    if (/nylon/i.test(f)) return "nylon";
    if (/twill|chino/i.test(f)) return "twill";
    if (/suiting|viscose|formal trouser/i.test(f)) return "suiting";
    return p.shape === "tee" ? "jersey" : "cotton";
  }

  /* ---------- per-garment palette (tuned for the dark studio) ---------- */
  function ctx(p, k) {
    const base = normHex(p.color);
    const [h, s, l] = hexToHsl(base);
    const light = l > .82, dark = l < .2, fab = fabricOf(p);
    const blueish = h > 190 && h < 260 && s > .15;
    return {
      k, base, light, dark, fab,
      lt: shade(base, dark ? .1 : .07),
      dk: shade(base, light ? -.1 : -.09),
      dk2: shade(base, light ? -.2 : -.17),
      inner: shade(base, light ? -.16 : dark ? -.04 : -.15),
      rib: shade(base, light ? -.04 : dark ? .025 : -.03),
      // dark garments get a lighter edge line so they separate from the near-black studio
      line: light ? shade(base, -.3, -.05) : dark ? shade(base, .06) : shade(base, -.16),
      stitch: fab === "denim" ? (blueish ? "#c98d44" : "#a8916f")
        : dark ? shade(base, .17) : shade(base, light ? -.24 : -.14),
      btn: light ? "#fdfcf9" : shade(base, dark ? .16 : .1),
      metal: dark ? "#8f8b84" : "#b9b2a6",
      // fold strength multipliers: shadows read on light cloth, highlights on dark cloth
      fk: light ? 1.3 : dark ? 1.5 : 1.15,
      hk: light ? .5 : dark ? 1.2 : .95,
      rim: light ? .3 : dark ? .6 : .42
    };
  }

  /* ---------- drawing primitives ---------- */
  const P = (d, f, x = "") => `<path d="${d}" fill="${f}"${x}/>`;
  const L = (d, s, w, x = "") => `<path d="${d}" fill="none" stroke="${s}" stroke-width="${w}"${x}/>`;
  // stitching is collected per garment and emitted as one dashed path on top
  const st = (c, d) => (c.sts.push(d), "");
  const dots = (d, col, w = 1.6) => L(d, col, w, ` stroke-dasharray="0 4" stroke-linecap="round"`);
  // a fabric piece drawn on top of the body (collar, pocket…) with outline + texture
  const piece = (c, d, f, x = "") => P(d, f || c.base, ` stroke="${c.line}" stroke-width="1.2" stroke-linejoin="round"${x}`) +
    (c.texOn ? P(d, `url(#${c.k}t)`) : "");
  // soft folds (rendered inside a blurred, clipped group)
  const op = o => String(r1(o * 100) / 100).replace(/^0\./, ".");
  const F = (d, w = 4, o = .13) => `<path d="${d}" fill="none" stroke="#000" stroke-width="${w}" stroke-opacity="${op(o)}" stroke-linecap="round"/>`;
  const Hl = (d, w = 6, o = .12) => `<path d="${d}" fill="none" stroke="#fff" stroke-width="${w}" stroke-opacity="${op(o)}" stroke-linecap="round"/>`;
  // buttons reference one unit-size button per SVG (keeps markup small)
  const unitButton = k => `<g id="${k}B"><circle r="1" stroke="#000" stroke-opacity=".3" stroke-width=".24"/><circle cx="-.3" r=".17" fill="#000" fill-opacity=".32"/><circle cx=".3" r=".17" fill="#000" fill-opacity=".32"/><path d="M-.62 -.42Q0 -1 .62 -.42" fill="none" stroke="#fff" stroke-opacity=".65" stroke-width=".22"/></g>`;
  const button = (c, x, y, r, col) => `<use href="#${c.k}B" transform="translate(${x} ${y}) scale(${r})" fill="${col || c.btn}"/>`;
  const rivet = (x, y) => `<circle cx="${x}" cy="${y}" r="2.4" fill="#b8763a" stroke="#7d4a1f" stroke-width=".7"/><circle cx="${x - .7}" cy="${y - .7}" r=".8" fill="#f2c9a0"/>`;

  // point on a line [x0,y0,x1,y1] or cubic [x0,y0,c1x,c1y,c2x,c2y,x1,y1]
  function bz(a, t) {
    if (a.length === 4) return [a[0] + (a[2] - a[0]) * t, a[1] + (a[3] - a[1]) * t];
    const u = 1 - t, k0 = u * u * u, k1 = 3 * u * u * t, k2 = 3 * u * t * t, k3 = t * t * t;
    return [k0 * a[0] + k1 * a[2] + k2 * a[4] + k3 * a[6], k0 * a[1] + k1 * a[3] + k2 * a[5] + k3 * a[7]];
  }
  // rib knit lines running between edge A and edge B (cuffs, waistbands, collars)
  function ribs(A, B, n, col = "#000", o = .22) {
    let d = "";
    for (let i = 1; i < n; i++) {
      const p = bz(A, i / n), q = bz(B, i / n);
      d += `M${r1(p[0])} ${r1(p[1])}L${r1(q[0])} ${r1(q[1])}`;
    }
    return L(d, col, .9, ` stroke-opacity="${o}"`);
  }
  // mirror an absolute path (M L C Q H V Z only) across x = 200
  function mir(d) {
    return d.replace(/([MLCQHVZ])([^MLCQHVZ]*)/g, (m, cmd, args) => {
      if (cmd === "V" || cmd === "Z") return m;
      const n = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
      return cmd + n.map((v, i) => (cmd === "H" || i % 2 === 0) ? r1(400 - v) : v).join(" ");
    });
  }
  const both = d => d + mir(d);
  const mirA = a => a.map((v, i) => i % 2 === 0 ? 400 - v : v);
  const ribs2 = (A, B, n, col, o) => ribs(A, B, n, col, o) + ribs(mirA(A), mirA(B), n, col, o);
  // cheap rib knit for straight bands: a wide dashed stroke along the band's centre line
  const rb = (d, w, o = .2) => L(d, "#000", w, ` stroke-opacity="${o}" stroke-dasharray=".9 2.5"`);

  /* ---------- type helpers ---------- */
  const FW = `font-family="Archivo, Arial Black, sans-serif" font-weight="900" font-stretch="125%"`;
  const FM = `font-family="Space Mono, monospace" font-weight="700"`;
  // fixed-width text: textLength pins the width whatever font actually rendered
  const T = (x, y, s, str, fill, w, a, x2 = "") =>
    `<text x="${r1(x)}" y="${r1(y)}" font-size="${r1(s)}"${fill ? ` fill="${fill}"` : ""}${w ? ` textLength="${w}" lengthAdjust="spacingAndGlyphs"` : ""}${a ? ` text-anchor="${a}"` : ""}${x2}>${escA(str)}</text>`;
  // mono text sized to Space Mono's natural advance (.6em) + tracking
  const MT = (x, y, s, str, fill, a, tr = .08) =>
    `<text x="${r1(x)}" y="${r1(y)}" font-size="${r1(s)}"${fill ? ` fill="${fill}"` : ""} textLength="${r1(String(str).length * s * (.6 + tr) - s * tr)}"${a ? ` text-anchor="${a}"` : ""}>${escA(str)}</text>`;
  // woven brand tab: acid label with the wordmark (used at the neck)
  const tab = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx=".6" fill="#c6ff00"/><path d="M${x} ${y + .7}H${x + w}M${x} ${y + h - .7}H${x + w}" stroke="#000" stroke-opacity=".18" stroke-width=".4"/>` +
    `<g ${FW}>${T(x + w / 2, y + h * .68, h * .48, "BHAKSHI", "#0a0a0a", w * .74, "middle")}</g>`;

  /* =========================================================
     GARMENTS — each returns { parts:[d | {d,f}], folds, hl?, top }
     parts: silhouette pieces (filled, outlined, shaded, textured)
     folds: soft shading strokes (blurred, clipped to silhouette)
     hl:    soft highlight strokes (blurred, clipped) — optional
     top:   details drawn above (collars, plackets, stitching…)
     ========================================================= */

  /* ---------- T-shirt: heavyweight oversized (dropped shoulder, boxy) or regular ----------
     Geometry is computed from a few measurements so both fits share one drawing. */
  function teeGeo(o) {
    const big = o.over !== false;
    const S = big ? [82, 118] : [106, 112];                 // shoulder point (left)
    const a = (big ? 36 : 42) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    const len = big ? 74 : 74, cuff = big ? 84 : 64, sx = big ? 82 : 104, hem = big ? 416 : 404;
    const C1 = [S[0] - len * ca, S[1] + len * sa];           // cuff, outer corner
    const C2 = [C1[0] + cuff * sa, C1[1] + cuff * ca];       // cuff, underarm corner
    const A = [sx, r1(C2[1] - (sx - C2[0]) / ca * sa)];      // armpit
    return { big, S, C1, C2, A, ca, sa, sx, hem };
  }
  function tee(c, v, o) {
    const g = teeGeo(o), { S, C1, C2, A, ca, sa, sx, hem } = g;
    const X = x => r1(400 - x), pt = p => `${r1(p[0])} ${r1(p[1])}`, mp = p => `${X(p[0])} ${r1(p[1])}`;
    const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    const Q1 = [(S[0] + C1[0]) / 2 - sa * 3, (S[1] + C1[1]) / 2 - ca * 3];   // sleeve top, slight bulge
    const sc = [sx + 1.5, (A[1] + hem) / 2], H = [sx - 1, hem];             // side seam (boxy, near straight)
    const sh = [S[0] + 22, S[1] - 12];                                        // shoulder curve control
    const body = `M158 90C178 97.5 222 97.5 242 90C262 94 ${X(sh[0])} ${sh[1]} ${mp(S)}Q${mp(Q1)} ${mp(C1)}L${mp(C2)}L${mp(A)}` +
      `Q${mp(sc)} ${mp(H)}Q${X(150)} ${hem + 5} 200 ${hem + 5}Q150 ${hem + 5} ${pt(H)}Q${pt(sc)} ${pt(A)}L${pt(C2)}L${pt(C1)}Q${pt(Q1)} ${pt(S)}C${pt(sh)} 138 94 158 90Z`;
    // dropped-shoulder armhole seam + double-needle cuff and hem
    const seam = `M${pt(S)}Q${r1(S[0] + 8)} ${r1((S[1] + A[1]) / 2)} ${pt(A)}`;
    const ins = (p, d) => [p[0] + ca * d, p[1] - sa * d];
    const cuffSt = d => `M${pt(ins(C1, d))}L${pt(ins(C2, d))}`;
    let top = L(both(seam), c.line, 1, ` stroke-opacity=".8"`) + F(both(seam), 2.4, .12 * c.fk) +
      st(c, both(cuffSt(6))) + st(c, both(cuffSt(9))) +
      st(c, `M${sx} ${hem - 9}Q200 ${hem - 4} ${X(sx)} ${hem - 9}`) + st(c, `M${sx} ${hem - 12}Q200 ${hem - 7} ${X(sx)} ${hem - 12}`);
    const backRib = "M158 90C178 97.5 222 97.5 242 90L234 94C218 104 182 104 166 94Z";
    if (v === "back") {
      top += piece(c, backRib, c.rib) + rb("M162 92C180 100.5 220 100.5 238 92", 5.5, .22) +
        st(c, "M163 98.5C180 108 220 108 237 98.5") + tab(191, 108, 18, 7.5);
    } else {
      // inside of the back neck (shadowed) with the woven label, then the thick front rib
      top += P(backRib, shade(c.inner, -.03)) +
        P("M166 94C182 104 218 104 234 94C233 114 218 122 200 122C182 122 167 114 166 94Z", c.inner) +
        F("M170 100C186 108 214 108 230 100", 5, .3) + tab(189, 102.5, 22, 8.5) +
        piece(c, "M158 90C159 116 178 132 200 132C222 132 241 116 242 90L234 94C233 114 218 122 200 122C182 122 167 114 166 94Z", c.rib) +
        rb("M162 92.5C163 115 179 127 200 127C221 127 237 115 238 92.5", 8, .2) +
        st(c, "M155.5 92C157 120 177 135.5 200 135.5C223 135.5 243 120 244.5 92");
    }
    // heavyweight drape: few, broad folds
    const fk = c.fk, hk = c.hk;
    const Fc = (d, w, o) => `<path d="${d}" stroke="#000" stroke-width="${w}" stroke-opacity="${op(o)}"/>`;
    const Hc = (d, w, o) => `<path d="${d}" stroke="#fff" stroke-width="${w}" stroke-opacity="${op(o)}"/>`;
    const sl = (t1, t2, off) => { const p = lerp(S, A, t1), q = lerp(C1, C2, t2); return `M${pt([p[0] - 4, p[1]])}Q${pt([(p[0] + q[0]) / 2 - sa * off, (p[1] + q[1]) / 2 - ca * off])} ${pt(ins(q, 12))}`; };
    const folds = Fc(both(`M${A[0] + 3} ${A[1] + 4}Q${A[0] + 24} ${A[1] + 30} ${A[0] + 34} ${A[1] + 96}`), 9, .13 * fk) +
      Fc(`M146 150Q134 280 146 ${hem - 10}`, 11, .1 * fk) + Fc(`M262 158Q276 290 258 ${hem - 10}`, 10, .11 * fk) +
      Fc(both(sl(.55, .55, 4)), 6, .14 * fk) + Fc(`M${sx + 8} ${hem - 22}Q150 ${hem - 30} 200 ${hem - 22}Q250 ${hem - 14} ${X(sx + 8)} ${hem - 26}`, 6, .1 * fk) +
      Fc("M176 146Q200 152 224 146", 7, .12 * fk) + Fc(both(`M${sx + 6} ${A[1] + 20}L${sx + 4} ${hem - 20}`), 10, .12 * fk);
    const hl = Hc(`M166 150Q154 280 168 ${hem - 16}`, 22, .05 * hk) + Hc(`M242 166Q254 290 240 ${hem - 18}`, 18, .04 * hk) +
      Hc(both(sl(.3, .3, 6)), 8, .09 * hk) + Hc(both(`M150 98Q118 104 ${pt([S[0] + 8, S[1] + 4])}`), 7, .1 * hk) +
      Hc(both(`M${A[0] + 14} ${A[1] + 6}Q${A[0] + 36} ${A[1] + 34} ${A[0] + 46} ${A[1] + 100}`), 10, .06 * hk);
    return { parts: [body], folds, hl, top };
  }

  /* ---------- Polo (piqué, ribbed collar + cuffs, 2-button placket) ---------- */
  function polo(c, v) {
    const body = "M164 98C178 104 222 104 236 98L290 116L342 178L316 208L290 186L294 380Q200 386 106 380L110 186L84 208L58 178L110 116Z";
    let top = L(both("M110 116Q120 150 110 186"), c.line, 1.1, ` stroke-opacity=".7"`) +
      piece(c, both("M58 178L84 208L92 199L66 169Z"), c.rib) +
      ribs2([58, 178, 84, 208], [66, 169, 92, 199], 7) +
      st(c, "M107 367Q200 373 293 367") + st(c, both("M111 364V379"));
    const back = [158, 100, 174, 86, 226, 86, 242, 100];
    if (v === "back") {
      top += piece(c, "M158 100C174 86 226 86 242 100L238 114C222 106 178 106 162 114Z", c.rib) +
        ribs(back, [162, 114, 178, 106, 222, 106, 238, 114], 22) + st(c, "M161 109C178 101 222 101 239 109");
    } else {
      top += P("M168 104C182 96 218 96 232 104L200 132Z", c.inner) +
        piece(c, "M158 100C174 86 226 86 242 100L232 104C218 96 182 96 168 104Z", c.rib) +
        ribs(back, [168, 104, 182, 96, 218, 96, 232, 104], 20) +
        piece(c, "M190 130H210V210H190Z") + st(c, "M192.5 142V207.5H207.5V142") +
        button(c, 200, 151, 4) + button(c, 200, 183, 4) +
        piece(c, both("M168 103L200 132L176 162Q162 134 156 103Z"), c.rib) +
        st(c, both("M159.5 107Q165 133 176.5 156"));
    }
    const folds = F("M146 214Q164 254 150 306", 7) + F("M258 222Q240 264 254 314", 6) +
      F("M130 356Q200 346 270 358", 5, .1) + F(both("M100 150Q88 168 90 186"), 4);
    return { parts: [body], folds, top };
  }

  /* ---------- Shirt (long sleeve; button-down collar for oxfords) ---------- */
  function shirt(c, v, o) {
    const sl = "M118 104C92 110 74 126 68 150L46 344L80 352L98 206L114 182Z";
    const cf = "M46 344L42 384L76 390L80 352Z";
    const body = "M166 90L116 104C110 138 110 160 114 182L112 352C116 374 154 382 200 392C246 382 284 374 288 352L286 182C290 160 290 138 284 104L234 90Z";
    let top = st(c, "M116 348C120 368 156 376 200 385C244 376 280 368 284 348") +
      st(c, both("M48 350L79 357")) + L(both("M68 344L72 310"), c.line, 1) +
      L(both("M56 343L57 334M62 344L63 335"), c.line, .9, ` stroke-opacity=".6"`) +
      button(c, 60, 372, 2.8) + button(c, 340, 372, 2.8);
    if (v === "back") {
      top += L("M115 134Q200 126 285 134", c.line, 1.1) + st(c, "M115 138Q200 130 285 138") +
        L("M192 133L189 176M208 133L211 176", c.line, 1, ` stroke-opacity=".6"`) +
        L("M195 133Q200 145 205 133", c.line, 1.1) +
        piece(c, "M160 90C176 76 224 76 240 90L242 110C220 102 180 102 158 110Z") +
        st(c, "M161 105C182 98 218 98 239 105");
    } else {
      const pk = o.formal ? "M226 168H260V206H226Z" : "M226 168H262V204L244 211L226 204Z";
      top += st(c, "M195 130V385M205 130V385") + L("M193 121V388M207 121V388", c.line, .9, ` stroke-opacity=".7"`) +
        [166, 202, 238, 274, 310, 346].map(y => button(c, 200, y, 3.3)).join("") +
        piece(c, pk) + st(c, "M226 175H" + (o.formal ? 260 : 262)) +
        P("M168 96C184 86 216 86 232 96L200 121Z", c.inner) +
        piece(c, "M160 90C176 76 224 76 240 90L232 96C216 86 184 86 168 96Z") +
        button(c, 200, 112, 2.6) +
        piece(c, both("M200 121L168 95Q160 92 156 95L178 152Z")) + st(c, both("M160 99L177 145L195 123"));
      if (o.bd) top += button(c, 177, 141, 2.3) + button(c, 223, 141, 2.3);
    }
    const folds = F(both("M90 158L74 330"), 4) + Hl(both("M96 150L84 320"), 5) +
      F("M146 236Q156 290 146 350", 6) + F("M254 236Q244 290 254 350", 6) +
      F(both("M118 196Q128 206 126 226"), 2.5, .1);
    return { parts: [sl, mir(sl), { d: cf }, { d: mir(cf) }, body], folds, top };
  }

  /* ---------- Camp-collar short-sleeve shirt (co-ord top) ---------- */
  function camp(c, v) {
    const body = "M166 90L116 104L52 164L80 196L114 174L112 396H288L286 174L320 196L348 164L284 104L234 90Z";
    let top = L(both("M116 104Q126 140 114 174"), c.line, 1.1, ` stroke-opacity=".7"`) +
      st(c, both("M60 157L88 189")) + st(c, "M114 386H286") + st(c, both("M115 376V395"));
    if (v === "back") {
      top += piece(c, "M156 95C176 80 224 80 244 95L240 108C220 100 180 100 160 108Z") +
        L("M115 132Q200 124 285 132", c.line, 1.1) + st(c, "M115 136Q200 128 285 136");
    } else {
      top += P("M168 94C184 88 216 88 232 94L200 176Z", c.inner) +
        piece(c, "M156 95C176 80 224 80 244 95L232 94C216 88 184 88 168 94Z") +
        L("M204 178V396", c.line, .9, ` stroke-opacity=".7"`) + st(c, "M207 180V394") +
        [198, 240, 282, 324, 366].map(y => button(c, 200, y, 3.2)).join("") +
        piece(c, "M226 196H258V234H226Z") + st(c, "M226 202H258") +
        piece(c, both("M168 94L200 176L188 178L148 116L156 95Z")) + st(c, both("M159 99L152 116L189 172"));
    }
    const folds = F("M146 210Q160 260 148 330", 7) + F("M254 220Q242 270 254 330", 6) +
      F(both("M102 140Q90 156 92 176"), 4);
    return { parts: [body], folds, top };
  }

  /* ---------- Kurta (mandarin collar, placket, side slits; short variant) ---------- */
  function kurta(c, v, o) {
    const H = o.short ? 398 : 452, sy = H - (o.short ? 58 : 86), se = o.short ? 380 : 396;
    const sl = `M122 104C98 110 84 124 80 146L60 ${se}L88 ${se + 6}L106 214L118 188Z`;
    const body = `M172 88L122 104C116 136 116 160 120 184L108 ${sy}L98 ${H}H302L292 ${sy}L280 184C284 160 284 136 278 104L228 88Z`;
    const emb = c.light ? "#b8914a" : shade(c.base, .2);
    const btn = c.light ? "#c29b4f" : shade(c.base, -.3);
    let top = dots(`M101 ${H - 12}H299`, emb) + L(`M102 ${H - 19}H298`, emb, .9, ` stroke-opacity=".8"`) +
      dots(both(`M62 ${se - 12}L90 ${se - 6}`), emb) +
      L(both(`M104 ${sy}H113`), c.line, 1.6) + st(c, both(`M61 ${se - 4}L89 ${se + 2}`));
    if (v === "back") {
      top += piece(c, "M164 88C178 74 222 74 236 88L232 98C218 90 182 90 168 98Z") + dots("M167 88C182 79 218 79 233 88", emb);
    } else {
      top += piece(c, "M192 116H208V214H192Z") + st(c, "M194.5 118V211.5H205.5V118") +
        dots("M188 120V214M212 120V214", emb) +
        [134, 160, 186].map(y => button(c, 200, y, 3.4, btn)).join("") +
        P("M172 90C186 84 214 84 228 90C220 100 210 106 200 106C190 106 180 100 172 90Z", c.inner) +
        piece(c, "M164 88C178 74 222 74 236 88C228 106 214 116 200 116C186 116 172 106 164 88ZM172 90C180 100 190 106 200 106C210 106 220 100 228 90C214 84 186 84 172 90Z", c.base, ` fill-rule="evenodd"`) +
        dots("M167.5 88C180 78.5 220 78.5 232.5 88", emb, 1.4) + L("M200 106V116", c.line, 1);
    }
    const folds = F(`M146 230Q156 320 142 ${H - 22}`, 7) + F(`M254 230Q244 320 258 ${H - 22}`, 7) +
      F(both(`M96 160L78 ${se - 30}`), 4) + Hl(both(`M102 150L86 ${se - 30}`), 5);
    return { parts: [{ d: `M108 ${sy}L90 ${H}H310L292 ${sy}Z`, f: c.dk }, sl, mir(sl), body], folds, top };
  }

  /* ---------- Hoodie (hood, drawcords, zip or kangaroo pocket, ribbing) ---------- */
  function hoodie(c, v, o) {
    const sl = "M112 120C88 126 72 140 66 166L48 362L80 366L100 216L112 196Z";
    const cf = "M48 362L46 396L78 400L80 366Z";
    const hem = "M112 372H288V402H112Z";
    let top = rb(both("M48 379L79 383"), 30) + rb("M112 387H288", 28) +
      L("M112 372H288", c.line, 1) + L(both("M48 362L80 366"), c.line, 1) + L(both("M112 120Q122 156 112 196"), c.line, 1, ` stroke-opacity=".6"`);
    if (v === "back") {
      const body = "M164 104L112 120C106 150 108 172 112 194V372H288V194C292 172 294 150 288 120L236 104C226 112 214 116 200 116C186 116 174 112 164 104Z";
      top += st(c, "M200 98V210") + st(c, "M165 106C154 142 166 196 200 205C234 196 246 142 235 106");
      const folds = F(both("M90 160Q80 260 74 340"), 5) + Hl(both("M96 150Q88 250 84 340"), 6) +
        F("M200 214Q170 260 156 330", 5, .1);
      return { parts: [sl, mir(sl), { d: cf }, { d: mir(cf) }, body, { d: hem }, { d: "M162 100C148 140 160 204 200 214C240 204 252 140 238 100C224 92 176 92 162 100Z" }], folds, top };
    }
    const body = "M164 104L112 120C106 150 108 172 112 194V372H288V194C292 172 294 150 288 120L236 104C228 126 214 138 200 140C186 138 172 126 164 104Z";
    const cord = o.zip ? "#e9e4da" : shade(c.base, c.light ? -.25 : .25);
    top += st(c, "M166 106C166 86 182 74 200 74C218 74 234 86 234 106") + L("M172 106C172 92 186 82 200 82C214 82 228 92 228 106", "#000", 3, ` stroke-opacity=".12"`);
    if (o.zip) {
      top += piece(c, both("M194 290H156Q144 324 134 372H194Z")) + L(both("M156 290Q144 324 134 372"), "#000", 3, ` stroke-opacity=".16"`) +
        st(c, both("M191 293H158Q147 324 137 370")) +
        L("M200 140V402", c.dk2, 7) + L("M200 141V401", c.metal, 3, ` stroke-dasharray="1.3 1.1"`) +
        `<rect x="196.5" y="146" width="7" height="15" rx="2" fill="${c.metal}" stroke="#6e6a64" stroke-width=".6"/><circle cx="200" cy="164" r="2.5" fill="none" stroke="${c.metal}" stroke-width="1.4"/>`;
    } else {
      top += piece(c, "M142 286H258L278 372H122Z") + L("M142 286L122 372M258 286L278 372", "#000", 3, ` stroke-opacity=".16"`) + st(c, "M145 290H255");
    }
    top += L("M186 146C183 176 189 200 184 228M214 146C218 178 211 202 216 230", cord, 3.2, ` stroke-linecap="round"`) +
      `<rect x="181.5" y="226" width="5" height="11" rx="1.5" fill="${c.metal}"/><rect x="213.5" y="228" width="5" height="11" rx="1.5" fill="${c.metal}"/>` +
      `<circle cx="186" cy="146" r="3.4" fill="none" stroke="${c.metal}" stroke-width="1.6"/><circle cx="214" cy="146" r="3.4" fill="none" stroke="${c.metal}" stroke-width="1.6"/>`;
    const folds = F(both("M90 160Q80 260 74 340"), 5) + Hl(both("M96 150Q88 250 84 340"), 6) +
      F("M146 210Q158 250 144 280", 6) + F(both("M58 348Q68 354 78 350"), 3);
    return {
      parts: [{ d: "M146 118C140 84 166 62 200 62C234 62 260 84 254 118Z" },
        { d: "M172 104C172 90 186 80 200 80C214 80 228 90 228 104L236 108C226 134 212 148 200 148C188 148 174 134 164 108Z", f: c.inner },
        sl, mir(sl), { d: cf }, { d: mir(cf) }, body, { d: hem }], folds, top
    };
  }

  /* ---------- Bomber jacket (rib collar/cuffs/hem, zip, welt + sleeve pocket) ---------- */
  function jacket(c, v) {
    const sl = "M116 112C88 118 70 134 64 162L46 358L80 364L102 214L112 196Z";
    const cf = "M46 358L44 396L78 402L80 364Z";
    const hem = "M110 380H290V412H110Z";
    const lining = "#c46a2b";
    let top = rb(both("M46 377L79 383"), 34) + rb("M110 396H290", 30) +
      L("M110 380H290", c.line, 1) + L(both("M46 358L80 364"), c.line, 1) +
      L(both("M116 112Q124 150 112 196"), c.line, 1, ` stroke-opacity=".6"`);
    let body;
    if (v === "back") {
      body = "M168 96L116 112C108 146 110 170 112 194L110 380H290L288 194C290 170 292 146 284 112L232 96C220 102 180 102 168 96Z";
      top += piece(c, "M160 94C174 78 226 78 240 94L238 110C222 102 178 102 162 110Z", c.rib) +
        ribs([160, 94, 174, 78, 226, 78, 240, 94], [162, 110, 178, 102, 222, 102, 238, 110], 26);
    } else {
      body = "M168 96L116 112C108 146 110 170 112 194L110 380H290L288 194C290 170 292 146 284 112L232 96C224 110 212 118 200 120C188 118 176 110 168 96Z";
      top += piece(c, both("M132 258L142 254L164 322L154 326Z"), c.dark ? c.lt : c.dk2) + st(c, both("M129 261L151 329")) +
        piece(c, "M304 160L330 156L334 196L308 200Z") + L("M306 166L330 162", c.metal, 1.6) + st(c, "M314 176L315 196M320 175L321 195") +
        L("M200 122V412", c.dk2, 6) + L("M200 123V411", c.metal, 2.6, ` stroke-dasharray="1.2 1.1"`) +
        P("M170 96C184 88 216 88 230 96C224 110 212 118 200 120C188 118 176 110 170 96Z", lining) +
        piece(c, "M160 94C174 78 226 78 240 94C232 116 216 128 200 130C184 128 168 116 160 94ZM170 96C176 110 188 118 200 120C212 118 224 110 230 96C216 88 184 88 170 96Z", c.rib, ` fill-rule="evenodd"`) +
        ribs([160, 94, 174, 78, 226, 78, 240, 94], [170, 96, 184, 88, 216, 88, 230, 96], 24) +
        ribs2([160, 94, 168, 116, 184, 128, 200, 130], [170, 96, 176, 110, 188, 118, 200, 120], 10) +
        `<rect x="196.5" y="126" width="7" height="15" rx="2" fill="${c.metal}" stroke="#5f5b55" stroke-width=".6"/>`;
    }
    const folds = Hl(both("M92 150Q80 250 72 340"), 9, .14) + F(both("M84 168Q74 260 66 340"), 4) +
      Hl("M146 140Q152 250 142 360", 12, .12) + F("M254 200Q246 280 260 360", 6) +
      F(both("M58 344Q68 352 78 348"), 3) + F("M124 368Q200 358 276 370", 4, .12);
    return { parts: [sl, mir(sl), { d: cf }, { d: mir(cf) }, body, { d: hem }], folds, top };
  }

  /* ---------- Trousers / jeans / chinos / joggers / shorts ---------- */
  function pants(c, v, o) {
    const sh = o.shorts, Y = sh ? 120 : 70;          // waist top
    const denim = c.fab === "denim", elastic = o.jogger || o.draw;
    let body, hem, cuffs = [];
    if (sh) {
      body = "M138 120H262L272 200L284 330L210 336L200 262L190 336L116 330L128 200Z";
    } else if (o.jogger) {
      body = "M138 70H262L270 150C278 250 276 360 260 418H212L200 214L188 418H140C124 360 122 250 130 150Z";
      cuffs = ["M140 418H188L186 452H144Z", "M260 418H212L214 452H256Z"];
    } else {
      const ox = o.slim ? 138 : o.relaxed ? 124 : 130;   // outer hem x (left leg)
      body = `M138 70H262L${o.relaxed ? 272 : 270} 150C${o.relaxed ? 278 : o.slim ? 272 : 275} 240 ${400 - ox + 3} 350 ${400 - ox} 452H208L200 212L192 452H${ox}C${ox - 3} 350 ${o.relaxed ? 122 : o.slim ? 128 : 125} 240 ${o.relaxed ? 128 : 130} 150Z`;
      hem = `M${ox + 1} 443H191M209 443H${399 - ox}`;
    }
    const b = Y + 22;                                  // waistband bottom
    let top = "", folds = "";
    // waistband
    if (elastic) {
      top += L(`M138 ${b + 4}H262`, c.line, 1) + rb(`M138 ${Y + 13}H262`, 24, .15);
    } else {
      top += L(`M138 ${b}H262`, c.line, 1) + st(c, `M139 ${Y + 3}H261M139 ${b - 3}H261`);
      const loops = v === "back" ? [150, 200, 250] : [146, 174, 226, 254];
      top += loops.map(x => piece(c, `M${x - 3} ${Y - 2}H${x + 3}V${b + 4}H${x - 3}Z`)).join("");
    }
    if (v === "back") {
      top += st(c, `M200 ${b}V${sh ? 262 : 212}`);
      if (denim) {
        top += L(`M136 ${Y + 48}L200 ${Y + 66}L264 ${Y + 48}`, c.line, 1) + st(c, `M136 ${Y + 52}L200 ${Y + 70}L264 ${Y + 52}`) +
          piece(c, both(`M148 ${Y + 76}H188L186 ${Y + 130}L167 ${Y + 138}L150 ${Y + 130}Z`)) +
          st(c, both(`M151 ${Y + 80}H185L183.5 ${Y + 127}L167 ${Y + 134}L152.5 ${Y + 127}Z`)) +
          st(c, both(`M155 ${Y + 94}L167 ${Y + 104}L180 ${Y + 94}`)) +
          `<rect x="226" y="${Y + 3}" width="26" height="15" rx="1.5" fill="#a87a4c" stroke="#7a5532" stroke-width=".8"/>`;
      } else if (elastic) {
        top += piece(c, `M222 ${Y + 64}H254V${Y + 104}H222Z`) + st(c, `M222 ${Y + 70}H254`);
      } else {
        top += L(both(`M150 ${b + 22}H184`), c.dk2, 3, ` stroke-linecap="round"`) + button(c, 167, b + 30, 2.6) + button(c, 233, b + 30, 2.6);
      }
    } else {
      // fly + button / drawcord
      top += L(`M200 ${b}V${sh ? b + 88 : 184}`, c.line, 1);
      if (!elastic) {
        top += st(c, `M210 ${b}V${sh ? b + 74 : 168}Q210 ${sh ? b + 86 : 182} 198 ${sh ? b + 90 : 186}`) +
          (denim ? `<circle cx="200" cy="${Y + 11}" r="5.4" fill="${c.metal}" stroke="#6f6a62" stroke-width=".8"/><circle cx="200" cy="${Y + 11}" r="2.6" fill="none" stroke="#fff" stroke-opacity=".5"/>`
            : button(c, 200, Y + 11, 4.2));
      } else {
        const cord = o.draw ? shade(c.base, -.18) : "#d9d4ca";
        top += `<circle cx="194" cy="${Y + 14}" r="2" fill="${c.dk2}"/><circle cx="206" cy="${Y + 14}" r="2" fill="${c.dk2}"/>` +
          L(`M194 ${Y + 14}C188 ${Y + 40} 182 ${Y + 52} 186 ${Y + 74}M206 ${Y + 14}C214 ${Y + 38} 220 ${Y + 54} 214 ${Y + 76}`, cord, 2.6, ` stroke-linecap="round"`);
      }
      // pockets
      if (denim || o.jogger || o.draw) {
        top += L(both(`M162 ${b}Q166 ${b + 42} 131 ${b + 56}`), c.line, 1.3) + st(c, both(`M157 ${b}Q160 ${b + 36} 131 ${b + 50}`)) +
          F(both(`M162 ${b + 4}Q164 ${b + 40} 134 ${b + 54}`), 2.4, .2);
      } else {
        top += L(both(`M156 ${b}L${sh ? 132 : 133} ${b + (sh ? 56 : 66)}`), c.line, 1.3) + st(c, both(`M151 ${b}L131 ${b + (sh ? 50 : 58)}`)) +
          L(both(`M157 ${b + 2}L134 ${b + (sh ? 58 : 68)}`), "#000", 2, ` stroke-opacity=".12"`);
      }
      if (denim) {
        top += piece(c, `M243 ${b + 4}H259L260 ${b + 22}L244 ${b + 24}Z`) + st(c, `M243 ${b + 8}H259`) +
          rivet(162, b + 2) + rivet(131, b + 55) + rivet(238, b + 2) + rivet(269, b + 55);
        folds += Hl(both("M168 172Q180 178 194 174"), 2.5, .3) + Hl(both("M170 184Q182 190 194 186"), 2.5, .24) +
          `<ellipse cx="161" cy="262" rx="15" ry="70" fill="#fff" opacity=".14"/><ellipse cx="239" cy="262" rx="15" ry="70" fill="#fff" opacity=".14"/>`;
      }
    }
    // shared leg details
    if (o.cargo) top += piece(c, both("M130 238H162V306H133Z")) + st(c, both("M133 242H159V302H135")) +
      piece(c, both("M128 230H164V250H129Z")) + button(c, 146, 242, 2.6) + button(c, 254, 242, 2.6);
    if (o.track) top += L(both("M134 152C128 250 129 356 144 416"), "#bdb8b0", 2);
    if (o.crease) top += Hl(both("M163 100L161 448"), 1.4, .28) + F(both("M165 100L163 448"), 1, .14);
    if (cuffs.length) top += rb(both("M143 435H187"), 32) + L(both("M140 418H188"), c.line, 1);
    if (hem) top += st(c, hem);
    if (sh) top += st(c, "M118 318L190 324M210 324L282 318") + L("M117 312L190 318M210 318L283 312", c.line, .9, ` stroke-opacity=".6"`);
    if (o.draw) top += st(c, "M127 444H191M209 444H273");
    folds += sh
      ? F("M196 270L192 330", 4) + F("M204 270L208 330", 4) + Hl(both("M160 160L156 310"), 9, .1) + F(both("M150 300Q168 306 186 302"), 3)
      : F(both("M150 302Q166 310 182 304"), 2.5, .1) + F("M196 240L194 440M204 240L206 440", 4, .12) +
        Hl(both("M160 160L162 440"), 10, .08) + F(both("M136 160Q148 200 140 260"), 3, .1);
    return { parts: [body, ...cuffs], folds, top };
  }

  /* =========================================================
     PRINTS — original Drop 01 graphics, each drawn in a 400×400 box.
     fn(n, k, side) -> markup; n = ink palette for the garment colour,
     k = unique id prefix (for clipPaths / textPaths).
     ========================================================= */
  function inks(col) {
    const base = normHex(col), dark = luma(base) < .5;
    return {
      base, dark,
      fg: dark ? "#f2f1ec" : "#151515",          // main ink
      soft: dark ? "#a9a8a2" : "#6a6862",        // secondary ink
      acc: dark ? "#c6ff00" : "#ff3d2e",         // brand accent (acid on dark, hot on light)
      ko: base                                   // knockout = garment colour
    };
  }
  // deterministic PRNG so artwork never changes between renders
  const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rule = (y, col, x0 = 10, x1 = 390, w = 2) => `<path d="M${x0} ${y}H${x1}" stroke="${col}" stroke-width="${w}"/>`;

  /* small chest mark: wide wordmark over an accent bar + mono drop tag */
  function pLogo(n) {
    return `<g ${FW}>${T(200, 222, 104, "BHAKSHI", n.fg, 384, "middle")}</g>` +
      `<rect x="8" y="244" width="96" height="22" fill="${n.acc}"/>` +
      `<g ${FM}>${T(118, 264, 25, "DROP 01 / FIRST LIGHT", n.fg, 274)}</g>`;
  }

  /* core: the BHAKSHI stack — solid, accent, then outlines fading out */
  function pCore(n) {
    let s = `<g ${FM}>${MT(10, 30, 18, "[ DROP 01 ]", n.fg)}${MT(390, 30, 18, "EST. 2026", n.fg, "end")}` +
      `${MT(10, 386, 18, "MADE IN INDIA", n.fg)}${MT(390, 386, 18, "240 GSM / 001", n.soft, "end")}</g>` +
      rule(42, n.fg) + rule(360, n.fg) + `<g ${FW}>`;
    const ys = [106, 168, 230, 292, 354];
    ys.forEach((y, i) => {
      const style = i < 2 ? ` fill="${n.fg}"` : i === 2 ? ` fill="${n.acc}"`
        : ` fill="none" stroke="${n.fg}" stroke-width="2.4" stroke-opacity="${i === 3 ? 1 : .55}"`;
      s += T(200, y - 6, 72, "BHAKSHI", "", 384, "middle", style);
    });
    return s + `</g>`;
  }

  /* monsoon: rain streaks inside a disc, wrapped by a circular type lockup */
  function pMonsoon(n, k) {
    const cx = 200, cy = 186, R = 124, rnd = rng(1306);
    let thick = "", thin = "", acc = "";
    const dx = -.36, dy = .93;                              // wind-blown rain, falling right → left
    for (let i = 0; i < 120; i++) {
      const x = 70 + rnd() * 300, y = 30 + rnd() * 300, l = 10 + rnd() * (i % 4 ? 40 : 120);
      if (Math.hypot(x - cx, y - cy) > R + 40) continue;
      const seg = `M${r1(x)} ${r1(y)}l${r1(dx * l)} ${r1(dy * l)}`;
      if (i % 17 === 0) acc += seg; else if (i % 3) thin += seg; else thick += seg;
    }
    const circ = r1(2 * Math.PI * 152);
    return `<defs><clipPath id="${k}m"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath>` +
      `<path id="${k}r" d="M${cx - 152} ${cy}a152 152 0 1 1 304 0a152 152 0 1 1 -304 0"/></defs>` +
      `<g clip-path="url(#${k}m)" stroke-linecap="round"><path d="${thin}" stroke="${n.fg}" stroke-width="3" stroke-opacity=".75"/>` +
      `<path d="${thick}" stroke="${n.fg}" stroke-width="6.5"/><path d="${acc}" stroke="${n.acc}" stroke-width="6.5"/></g>` +
      `<circle cx="${cx}" cy="${cy}" r="${R + 10}" fill="none" stroke="${n.fg}" stroke-width="2"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${R + 50}" fill="none" stroke="${n.fg}" stroke-width="2"/>` +
      `<g ${FW} font-size="30" fill="${n.fg}" transform="rotate(-16 ${cx} ${cy})"><text><textPath href="#${k}r" textLength="${circ - 6}" lengthAdjust="spacing">MONSOON SEASON • JUNE—SEPTEMBER •</textPath></text></g>` +
      // centre tag: knockout block
      `<rect x="146" y="166" width="108" height="40" fill="${n.fg}"/>` +
      `<g ${FW}>${T(200, 196, 26, "06—09", n.ko, 92, "middle")}</g>` +
      `<g ${FM}>${MT(10, 388, 16, "19.07°N 72.87°E", n.fg)}${MT(390, 388, 16, "RAIN INDEX 86%", n.fg, "end")}</g>` +
      `<rect x="10" y="368" width="60" height="5" fill="${n.acc}"/>`;
  }

  /* chai (front): line-drawn cutting-chai glass with steam */
  function pChaiGlass(n) {
    const tea = n.dark ? "#d9894a" : "#b8662c", foam = n.dark ? "#f0c9a0" : "#e2b48a";
    // fluted lower half: lines following the taper
    let fl = "";
    for (let i = 1; i < 9; i++) {
      const t = i / 9, xt = 128 + 144 * t, xb = 148 + 104 * t;
      fl += `M${r1(xt + (xb - xt) * .45)} 232L${r1(xb)} 322`;
    }
    return `<g fill="none" stroke="${n.fg}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">` +
      `<path d="M125 190L146 328Q200 340 254 328L275 190Q200 202 125 190Z" fill="${tea}" stroke="none"/>` +
      `<ellipse cx="200" cy="190" rx="75" ry="11" fill="${foam}" stroke-width="5"/>` +
      `<path d="M120 152L146 328Q200 342 254 328L280 152"/><ellipse cx="200" cy="152" rx="80" ry="13"/>` +
      `<path d="${fl}" stroke-width="4" stroke-opacity=".8"/><path d="M150 312Q200 322 250 312" stroke-width="4"/>` +
      `<path d="M168 128c-14-16 12-28 0-46s12-30 2-44M200 122c-14-18 14-30 0-50s14-32 0-48M232 128c-12-16 12-28 0-44s12-28 2-40" stroke-width="5"/>` +
      `<path d="M132 178l8 2M138 214l6 1" stroke-width="5"/></g>` +
      `<g ${FM}>${T(200, 386, 26, "CUTTING CHAI · 4PM", n.fg, 330, "middle")}</g>`;
  }

  /* chai (back): a "CHAI BREAK" ticket — big 4:00 PM + mono menu rows + barcode */
  function pChaiTicket(n, k) {
    const ink = n.fg, hot = n.dark ? "#ffb04a" : "#c24a1c";
    // ticket outline with side notches at the perforation
    const tk = "M40 12H360V110A14 14 0 0 0 360 138V388H40V138A14 14 0 0 0 40 110Z";
    const rows = [["01", "ADRAK", "YES"], ["02", "ELAICHI", "YES"], ["03", "BISCUIT", "DIP"], ["04", "SUGAR", "2 SPN"], ["05", "GOSSIP", "MAX"]];
    let r = "";
    rows.forEach(([a, b, c2], i) => {
      const y = 274 + i * 17;
      r += MT(60, y, 14, a, n.soft) + MT(92, y, 14, b, ink) + MT(340, y, 14, c2, ink, "end");
    });
    let bars = "", x = 60, rnd = rng(400);
    while (x < 210) { const w = 1.5 + Math.floor(rnd() * 3) * 1.6; bars += `M${r1(x)} 358v18`; x += w + 2.2 + rnd() * 2; }
    return `<path d="${tk}" fill="none" stroke="${ink}" stroke-width="4"/>` +
      `<rect x="40" y="12" width="320" height="78" fill="${ink}"/>` +
      `<g ${FM}>${MT(56, 34, 13, "NO. 0400", n.ko)}${MT(344, 34, 13, "ADMIT ONE", n.ko, "end")}` +
      `${MT(60, 246, 13, "DAILY · IST", n.soft)}${MT(340, 246, 13, "PLATFORM: ANY", ink, "end")}${r}` +
      `${MT(340, 374, 12, "NO EXCEPTIONS", ink, "end")}</g>` +
      `<g ${FW}>${T(200, 80, 40, "CHAI BREAK", n.ko, 288, "middle")}${T(60, 222, 104, "4:00", hot, 214)}${T(340, 192, 40, "PM", hot, 62, "end")}${T(340, 222, 22, "SHARP", ink, 62, "end")}</g>` +
      `<path d="M60 124H340" stroke="${ink}" stroke-width="2" stroke-dasharray="4 4"/>` +
      `<path d="M60 256H340M60 348H340" stroke="${ink}" stroke-width="2"/>` +
      `<path d="${bars}" stroke="${ink}" stroke-width="2.4"/>`;
  }

  /* express: railway station board + vertical route map */
  function pExpress(n) {
    const ink = n.fg, yel = "#f2c230", dk = "#141414";
    const st = [["BKS", "BHAKSHI JN.", "22:10"], ["CHT", "CHAI TAPRI", "23:40"], ["MNS", "MONSOON NAGAR", "01:25"], ["HRN", "HORN OK ROAD", "03:50"], ["DWN", "DAWN TERMINUS", "06:20"]];
    let s = "";
    st.forEach(([c3, nm, t], i) => {
      const y = 150 + i * 50, end = i === 0 || i === 4, here = i === 2;
      s += (here ? `<circle cx="64" cy="${y}" r="15" fill="none" stroke="${yel}" stroke-width="3"/>` : "") +
        `<circle cx="64" cy="${y}" r="${end ? 9 : 7}" fill="${end || here ? (here ? yel : ink) : n.ko}" stroke="${here ? yel : ink}" stroke-width="3.5"/>` +
        `<g ${FW}>${T(98, y + 4, 26, c3, here ? yel : ink, 70)}</g>` +
        `<g ${FM}>${MT(180, y + 1, 13, nm, n.soft)}${MT(380, y + 4, 18, t, ink, "end")}</g>`;
    });
    return `<rect x="16" y="10" width="368" height="92" fill="${yel}"/><rect x="22" y="16" width="356" height="80" fill="none" stroke="${dk}" stroke-width="2"/>` +
      `<g ${FW}>${T(200, 62, 38, "NIGHT EXPRESS", dk, 330, "middle")}</g>` +
      `<g ${FM}>${MT(36, 86, 14, "BKS 0101", dk)}${MT(200, 86, 14, "DAILY", dk, "middle")}${MT(364, 86, 14, "PF 04", dk, "end")}</g>` +
      `<path d="M64 150V350" stroke="${ink}" stroke-width="5"/><path d="M64 150V350" stroke="${n.ko}" stroke-width="1.6" stroke-dasharray="6 6"/>` + s +
      `<g ${FM}>${MT(16, 392, 15, "DEP 22:10 → ARR 06:20", ink)}${MT(384, 392, 15, "WINDOW 32", yel, "end")}</g>` +
      `<path d="M16 372H384" stroke="${ink}" stroke-width="2"/>`;
  }

  /* hornok: truck-art back panel — arched frame, dotted borders, flowers, fringe */
  function pHornok() {
    const MG = "#ffb000", PK = "#e5197e", TL = "#0a8f8c", GR = "#2fa84f", RD = "#e2321f", BK = "#141414", WH = "#fffaf0";
    const arch = (x0, y0, x1, y1, h) => `M${x0} ${y1}V${y0 + h}Q${x0} ${y0} 200 ${y0}Q${x1} ${y0} ${x1} ${y0 + h}V${y1}Z`;
    // dotted flower: a ring of round dashes (petals) around a centre dot
    const flower = (x, y, r, pc, cc) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${pc}" stroke-width="${r * 1.1}" stroke-dasharray="0 ${r1(Math.PI * r / 3)}" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="${r * .45}" fill="${cc}"/>`;
    let fringe = "", f2 = "";
    for (let i = 0; i < 14; i++) { const x = 46 + i * 22; const d = `M${x} 362l11 22l11-22Z`; if (i % 2) f2 += d; else fringe += d; }
    const lotus = `<path d="M200 44c-12 14-12 30 0 42c12-12 12-28 0-42ZM200 86c-16-2-30-12-34-28c16 0 28 10 34 28ZM200 86c16-2 30-12 34-28c-16 0-28 10-34 28Z" fill="${PK}" stroke="${BK}" stroke-width="2.5" stroke-linejoin="round"/>`;
    return `<path d="M58 362H342" stroke="${BK}" stroke-width="4"/><path d="${fringe}" fill="${MG}" stroke="${BK}" stroke-width="2" stroke-linejoin="round"/><path d="${f2}" fill="${PK}" stroke="${BK}" stroke-width="2" stroke-linejoin="round"/>` +
      `<path d="${arch(40, 10, 360, 366, 90)}" fill="${BK}"/>` +
      `<path d="${arch(52, 22, 348, 354, 82)}" fill="${RD}"/>` +
      `<path d="${arch(52, 22, 348, 354, 82)}" fill="none" stroke="${MG}" stroke-width="8" stroke-dasharray="10 8"/>` +
      `<path d="${arch(66, 36, 334, 340, 72)}" fill="${TL}" stroke="${BK}" stroke-width="3"/>` +
      `<path d="${arch(74, 44, 326, 332, 66)}" fill="none" stroke="${WH}" stroke-width="2.5" stroke-dasharray="0 9" stroke-linecap="round"/>` +
      // top arch: lotus + highway wisdom
      lotus + flower(130, 82, 9, MG, PK) + flower(270, 82, 9, MG, PK) +
      `<path d="M84 104H316" stroke="${MG}" stroke-width="4"/><path d="M84 112H316" stroke="${BK}" stroke-width="2"/>` +
      // lettering with offset 3D shadow
      `<g ${FW} stroke-linejoin="round">` +
      T(204, 194, 84, "HORN", PK, 236, "middle", ` stroke="${BK}" stroke-width="6" paint-order="stroke"`) +
      T(200, 190, 84, "HORN", MG, 236, "middle", ` stroke="${BK}" stroke-width="3" paint-order="stroke"`) +
      T(203, 324, 54, "PLEASE", RD, 236, "middle", ` stroke="${BK}" stroke-width="6" paint-order="stroke"`) +
      T(200, 321, 54, "PLEASE", WH, 236, "middle", ` stroke="${BK}" stroke-width="3" paint-order="stroke"`) + `</g>` +
      // OK medallion flanked by flowers
      `<circle cx="200" cy="238" r="38" fill="${GR}" stroke="${BK}" stroke-width="3"/>` +
      `<circle cx="200" cy="238" r="30" fill="none" stroke="${MG}" stroke-width="6" stroke-dasharray="0 10.5" stroke-linecap="round"/>` +
      `<g ${FW}>${T(200, 250, 32, "OK", WH, 46, "middle", ` stroke="${BK}" stroke-width="2.5" paint-order="stroke"`)}</g>` +
      flower(120, 238, 13, PK, MG) + flower(280, 238, 13, PK, MG) + flower(92, 238, 6, MG, WH) + flower(308, 238, 6, MG, WH) +
      `<path d="M138 238H158M242 238H262" stroke="${MG}" stroke-width="4" stroke-linecap="round"/>` +
      `<g ${FM}>${MT(200, 128, 11, "USE DIPPER AT NIGHT", WH, "middle", .12)}${MT(200, 336, 10, "DROP 01 · BHAKSHI", MG, "middle", .12)}</g>`;
  }

  const PRINTS = { logo: pLogo, core: pCore, monsoon: pMonsoon, chai: (n, k, side) => side === "front" ? pChaiGlass(n) : pChaiTicket(n, k),
    express: pExpress, hornok: pHornok };
  // where a print sits on each top: logo = small left-chest, chest = centre front, back = big panel  [cx, cy, scale]
  const PLACE = {
    tee:    { logo: [250, 168, .14], chest: [200, 214, .38], back: [200, 238, .54] },
    polo:   { logo: [252, 166, .12], chest: [200, 236, .3],  back: [200, 230, .44] },
    shirt:  { logo: [244, 186, .08], chest: [244, 186, .08], back: [200, 236, .46] },
    camp:   { logo: [244, 214, .08], chest: [244, 214, .08], back: [200, 240, .48] },
    kurta:  { logo: [246, 160, .1],  chest: [246, 160, .1],  back: [200, 240, .46] },
    hoodie: { logo: [250, 182, .13], chest: [200, 204, .3],  back: [200, 250, .42] },
    jacket: { logo: [250, 170, .12], chest: [250, 170, .12], back: [200, 236, .44] }
  };
  // markup for print `name` placed on the garment (side = front/back), or ""
  function printOn(shape, name, side, col, k) {
    const pl = PLACE[shape], fn = PRINTS[name];
    if (!pl || !fn) return "";
    const [x, y, s] = name === "logo" ? (side === "back" ? [200, 132, .12] : pl.logo) : side === "back" ? pl.back : pl.chest;
    return `<g transform="translate(${x} ${y}) scale(${s}) translate(-200 -200)" opacity=".96">${fn(inks(col), k + "q", side)}</g>`;
  }
  const printsOf = p => {
    const pr = p.print && typeof p.print === "object" ? p.print : {};
    return { front: PRINTS[pr.front] ? pr.front : "", back: PRINTS[pr.back] ? pr.back : "" };
  };


  /* ---------- registry + variant detection ---------- */
  const FRAME = { shorts: [200, 240, 1.22, 228], tee: [200, 258, .93, 258] };   // [tx, ty, scale, pivotY]
  // map a point in a shape's drawing space to the framed 400×500 space
  const framed = (shape, x, y) => { const f = FRAME[shape]; return f ? [f[0] + (x - 200) * f[2], f[1] + (y - f[3]) * f[2]] : [x, y]; };
  const DRAW = { tee, polo, shirt, camp, kurta, hoodie, jacket, pants, shorts: (c, v, o) => pants(c, v, { ...o, shorts: true }) };
  function variant(p) {
    const s = `${p.id || ""} ${p.name || ""} ${p.fit || ""} ${p.fabric || ""}`;
    return {
      over: /oversiz|drop|boxy/i.test(s), bd: /oxford|button-down/i.test(s), formal: /formal|wrinkle/i.test(s),
      short: /short kurta|short-kurta/i.test(s), zip: /zip/i.test(s), slim: /slim|taper/i.test(s),
      relaxed: /relaxed|straight/i.test(s), jogger: /jogger|track/i.test(s), cargo: /cargo/i.test(s),
      track: /track/i.test(s), crease: /formal|suiting/i.test(s)
    };
  }

  /* ---------- layer one garment: defs + shadow + fill + print + shading + rim light + details ---------- */
  function layer(p, shape, view, k, o) {
    const c = ctx(p, k);
    const texFn = TEX[c.fab] || TEX.cotton, tex = texFn(k + "t", c);
    c.texOn = !!tex; c.sts = [];
    const g = DRAW[shape](c, view, o);
    // per-shape framing: shorts grow to fill the frame, tees shrink a touch for studio breathing room
    const fr = FRAME[shape], grow = fr ? [`<g transform="translate(${fr[0]} ${fr[1]}) scale(${fr[2]}) translate(-200 ${-fr[3]})">`, "</g>"] : ["", ""];
    const parts = g.parts.map(x => typeof x === "string" ? { d: x } : x);
    const uses = f => parts.map((x, i) => `<use href="#${k}p${i}"${f ? f(x) : ""}/>`).join("");
    const so = a => op(a * (c.light ? 1.35 : c.dark ? .8 : 1));
    // print (only tops have placements); drawn under the shading so folds + knit run across the ink
    const pr = printsOf(p), side = view === "back" ? "back" : "front";
    const ink = printOn(shape, pr[side], side, c.base, k);
    const sheen = c.fab === "nylon"
      ? `<linearGradient id="${k}w" x1="80" y1="60" x2="320" y2="440" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".3" stop-color="#fff" stop-opacity=".02"/><stop offset=".5" stop-color="#fff" stop-opacity=".12"/><stop offset=".75" stop-color="#000" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>`
      : `<linearGradient id="${k}w" x1="0" y1="70" x2="0" y2="460" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="${c.dark ? .07 : .09}"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${so(.2)}"/></linearGradient>`;
    const defs = parts.map((x, i) => `<path id="${k}p${i}" d="${x.d}"/>`).join("") +
      `<clipPath id="${k}c">${uses()}</clipPath>` +
      `<linearGradient id="${k}v" x1="30" x2="370" y1="0" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#000" stop-opacity="${so(.26)}"/><stop offset=".26" stop-color="#fff" stop-opacity="${c.dark ? .05 : .07}"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset=".78" stop-color="#000" stop-opacity="${so(.06)}"/><stop offset="1" stop-color="#000" stop-opacity="${so(.3)}"/></linearGradient>` +
      sheen + tex + (c.fab === "jersey" ? WASH(k + "x", c) : "") + (g.top.includes(`#${k}B`) ? unitButton(k) : "") +
      `<radialGradient id="${k}h" cx="176" cy="200" r="190" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="${c.dark ? .08 : c.light ? .2 : .12}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>` +
      // rim light: key light from top-left, wrapping the silhouette edge
      `<linearGradient id="${k}r" x1="40" y1="60" x2="360" y2="470" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="${c.rim}"/><stop offset=".55" stop-color="#fff" stop-opacity="${op(c.rim * .5)}"/><stop offset="1" stop-color="#fff" stop-opacity="${op(c.rim * .25)}"/></linearGradient>` +
      `<filter id="${k}b" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="${c.light ? 5.5 : 3.8}"/></filter>` +
      `<filter id="${k}e"><feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="b"/><feComposite in="SourceGraphic" in2="b" operator="out"/></filter>` +
      `<mask id="${k}m" maskUnits="userSpaceOnUse" x="-50" y="-50" width="500" height="600"><rect x="-50" y="-50" width="500" height="600" fill="url(#${k}r)"/></mask>` +
      `<filter id="${k}s" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>`;
    const body = grow[0] +
      `<g transform="translate(0 10)" fill="#000" opacity=".5" filter="url(#${k}s)">${uses()}</g>` +
      `<g stroke="${c.line}" stroke-width="1.2" stroke-linejoin="round">${uses(x => ` fill="${x.f || c.base}"`)}</g>` +
      `<g clip-path="url(#${k}c)">${ink}<rect width="400" height="500" fill="url(#${k}v)"/><rect width="400" height="500" fill="url(#${k}w)"/><rect width="400" height="500" fill="url(#${k}h)"/>` +
      (tex ? `<rect width="400" height="500" fill="url(#${k}t)"/>` : "") +
      (c.fab === "jersey" ? `<rect width="400" height="500" fill="url(#${k}x)"/>` : "") +
      `<g filter="url(#${k}b)" fill="none" stroke-linecap="round"${c.dark && !g.hl ? ` opacity=".6"` : ""}>${g.folds}${g.hl || ""}</g></g>` +
      `<g mask="url(#${k}m)"><g filter="url(#${k}e)" fill="#fff">${uses()}</g></g>` + g.top +
      (c.sts.length ? L(c.sts.join(""), c.stitch, 1.1, ` stroke-dasharray="3 2.2" stroke-linecap="round"`) : "") + grow[1];
    return { defs, body };
  }

  // coord set = camp shirt + drawstring trousers laid side by side
  function coordLayers(p, view, k) {
    const a = layer(p, "camp", view, k + "a", {});
    const b = layer(p, "pants", view, k + "b", { draw: true, relaxed: true });
    return {
      defs: a.defs + b.defs,
      body: `<g transform="translate(161 66) scale(.7) rotate(2 200 260)">${b.body}</g><g transform="translate(-21 80) scale(.7) rotate(-2 200 250)">${a.body}</g>`
    };
  }
  const shapeOf = p => (DRAW[p.shape] || p.shape === "coord") ? p.shape : "tee";
  function layersFor(p, view, k) {
    const shape = shapeOf(p);
    if (shape === "coord") return coordLayers(p, view, k);
    return layer(p, shape, view, k, variant(p));
  }

  /* ---------- dark studio backdrop: near-black sweep, soft spotlight, floor shadow ---------- */
  const backdrop = k =>
    `<linearGradient id="${k}bg" x1="0" y1="0" x2="0" y2="500" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#121212"/><stop offset="1" stop-color="#0d0d0d"/></linearGradient>` +
    `<radialGradient id="${k}sp" cx="200" cy="215" r="300" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".13"/><stop offset=".45" stop-color="#fff" stop-opacity=".055"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="${k}fl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".7"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`;
  const backdropBody = (k, fy = 452) =>
    `<rect x="-400" y="-300" width="1200" height="1100" fill="url(#${k}bg)"/><rect x="-400" y="-300" width="1200" height="1100" fill="url(#${k}sp)"/>` +
    `<ellipse cx="200" cy="${fy}" rx="190" ry="20" fill="url(#${k}fl)"/>`;
  const FLOOR = { tee: 442, pants: 476, shorts: 440, kurta: 472, coord: 462 };

  const svgOpen = (label, vb = "0 0 400 500") =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" preserveAspectRatio="xMidYMid meet" width="100%" height="100%" role="img" aria-label="${escA(label)}">`;

  // close-up crop focus per shape: [cx, cy, zoom]
  const FOCUS = { tee: [214, 140, 2.4], polo: [200, 144, 2.2], shirt: [214, 150, 2.1], kurta: [200, 136, 2.3],
    hoodie: [200, 150, 2], jacket: [212, 140, 2], pants: [196, 122, 2], shorts: [196, 170, 2], coord: [121, 168, 2.6] };
  // detail view: close-up on the hero graphic (back panel if any), else on the chest / neck label
  function detailPlan(p) {
    const shape = shapeOf(p), pl = PLACE[shape], pr = printsOf(p);
    const at = (x, y, z) => [...framed(shape, x, y), z * (FRAME[shape] && shape !== "shorts" ? 1 / FRAME[shape][2] : 1)];
    if (pl && pr.back && pr.back !== "logo") return { view: "back", f: at(pl.back[0], pl.back[1] - 14, 1.55) };
    if (pl && pr.front && pr.front !== "logo") return { view: "front", f: at(pl.chest[0], pl.chest[1] - 18, 1.9) };
    if (pl && pr.front === "logo") return { view: "front", f: at((200 + pl.logo[0]) / 2 + 6, (110 + pl.logo[1]) / 2, 2.5) };
    return { view: "front", f: shape === "tee" ? at(214, 140, 2.4) : FOCUS[shape] || FOCUS.tee };
  }

  /* ---------- public: single garment ---------- */
  function garment(p, opts = {}) {
    p = p || {};
    const bg = opts.bg !== false, view = ["front", "back", "detail"].includes(opts.view) ? opts.view : "front";
    const k = nextId(), plan = view === "detail" ? detailPlan(p) : { view };
    const L1 = layersFor(p, plan.view === "back" ? "back" : "front", k);
    let art = L1.body, extra = "";
    if (view === "detail") {
      const [cx, cy, z] = plan.f;
      extra = `<clipPath id="${k}z"><rect width="400" height="500"/></clipPath>`;
      art = `<g clip-path="url(#${k}z)"><g transform="translate(200 250) scale(${z}) translate(${-cx} ${-cy})">${art}</g></g>`;
    }
    const label = (p.name || "Garment") + (view === "back" ? " (back view)" : view === "detail" ? " (print detail)" : "");
    return svgOpen(label) + `<defs>${bg ? backdrop(k) : ""}${L1.defs}${extra}</defs>` +
      (bg ? backdropBody(k, FLOOR[shapeOf(p)]) : "") + art + `</svg>`;
  }

  /* ---------- public: just the graphic (400×400, transparent) ---------- */
  function print(name, opts = {}) {
    const fn = PRINTS[name], k = nextId();
    return svgOpen(`${name || "Blank"} print`, "0 0 400 400") +
      (fn ? fn(inks(opts.color || "#141414"), k, opts.side === "front" ? "front" : "back") : "") + `</svg>`;
  }

  /* ---------- public: outfit flat-lay (top over bottom) ---------- */
  function outfit(top, bottom, opts = {}) {
    if (!bottom) return garment(top, opts);
    if (!top) return garment(bottom, opts);
    const bg = opts.bg !== false, k = nextId();
    const b = layersFor(bottom, "front", k + "l");
    const t = layersFor(top, "front", k + "u");
    const longTop = top.shape === "kurta" || top.shape === "jacket" || top.shape === "hoodie";
    const bShorts = bottom.shape === "shorts";
    const bt = bShorts ? "translate(96 169) scale(.52) rotate(3 200 240)" : "translate(80 186) scale(.6) rotate(3 200 260)";
    const tt = `translate(${longTop ? 66 : 68} ${longTop ? -8 : 2}) scale(${longTop ? .67 : .66}) rotate(-3 200 250)`;
    return svgOpen(`Outfit: ${top.name || ""} with ${bottom.name || ""}`) +
      `<defs>${bg ? backdrop(k) : ""}${b.defs}${t.defs}</defs>` + (bg ? backdropBody(k, 470) : "") +
      `<g transform="${bt}">${b.body}</g><g transform="${tt}">${t.body}</g></svg>`;
  }

  /* ---------- public: colour swatch (reads on the dark UI) ---------- */
  function swatch(color) {
    const k = nextId(), base = normHex(color), l = hexToHsl(base)[2];
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">` +
      `<defs><radialGradient id="${k}s" cx=".34" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></radialGradient>` +
      `<pattern id="${k}t" width="2" height="2" patternUnits="userSpaceOnUse"><path d="M0 0L.5 1L1 0M1 1L1.5 2L2 1" fill="none" stroke="#000" stroke-opacity=".14" stroke-width=".35"/></pattern></defs>` +
      `<circle cx="12" cy="12" r="11" fill="${base}"/><circle cx="12" cy="12" r="11" fill="url(#${k}t)"/><circle cx="12" cy="12" r="11" fill="url(#${k}s)"/>` +
      `<circle cx="12" cy="12" r="11.1" fill="none" stroke="#fff" stroke-opacity="${l < .3 ? .34 : .16}" stroke-width=".9"/></svg>`;
  }

  // Legacy: SHAPES maps each shape name to its drawing function (kept for compatibility)
  const SHAPES = { ...DRAW, coord: coordLayers };
  return { garment, print, outfit, swatch, shade, SHAPES, PRINTS: Object.keys(PRINTS) };
})();
