/* =========================================================
   BHAKSHI — product artwork (v3, "minimal craft streetwear")
   Photographic-feeling packshots + editorial scenes, used whenever a
   product (or a campaign slot) has no photo.

   API (global `Art`):
     Art.garment(product, { bg = true, view = "front", part })  -> SVG string (viewBox 0 0 500 700, 5:7, slice)
         view: "front" | "back" | "detail" (macro close-up) | "folded" (retail-folded packshot).
         part (detail view of collared shapes): "collar" | "placket" | "knit" | "graphic".
         bg:false => transparent.
         Collared shapes polo / rugby / knitpolo are drawn from product.style (v3.1): contrast collar,
         button placket or johnny V, short sleeves with rib cuffs + tipping or long sleeves with rib
         cuffs, yarn-dyed stripes ("full" or "bands"), piqué / jersey / rib / waffle knit, and a
         chest graphic (our own path-drawn script, or a felt-appliqué number).
     Art.campaign(scene, { ratio = "16:9" })               -> SVG string (editorial scene)
         scene: "flatlay" | "rail" | "stack" | "macro" | "single:<productId>"
                | "look:<productId>"  (top-down outfit flat lay: the shirt + generic trousers,
                                       white sneakers, sunglasses, cap — props are not products)
                | "detail:<productId>:<collar|placket|knit|graphic>"  (tight close-up)
         ratio: "16:9" | "4:5" | "3:4" | "1:1" | "21:9"
     Art.lookHotspot(productId, ratio = "4:5")            -> { x, y } percentages of the frame where the
         shirt's chest sits in that look: scene (for a "shop this" dot)
     Art.print(name, { color, side })                      -> SVG string (400×400, transparent)
     Art.outfit(top, bottom, { bg = true })               -> SVG string (500×700)
     Art.swatch(color)                                    -> SVG string (24×24)
     Art.shade(hex, dl, ds), Art.SHAPES, Art.PRINTS

   How it looks real: every garment is a flat colour silhouette, lit by
   a resolution-independent "emboss" filter built from a grey height map
   (soft folds, rolled edges, seams, rib knit, puff ink) plus fractal
   grain, so the light behaves the same at 300px and 1400px. Prints are
   run through an ink filter (slightly broken, absorbed) and sit under
   the lighting so they follow the cloth.

   Pure string building: no DOM access, no network. Every call gets its
   own id prefix so filters / patterns / clipPaths never collide when
   many SVGs are inlined on one page. Text uses the site font (Jost) with
   textLength, so layouts hold even before the font loads.
   ========================================================= */
const Art = (() => {
  let uid = 0;
  const nextId = () => "bk" + (++uid).toString(36) + "-";
  const r1 = n => Math.round(n * 10) / 10;
  const r2 = n => Math.round(n * 100) / 100;
  const escA = s => String(s == null ? "" : s).replace(/[&<>"']/g, ch =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const op = o => String(r2(Math.max(0, Math.min(1, o)))).replace(/^0\./, ".");

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
  function mix(a, b, t) {
    const A = parseInt(normHex(a).slice(1), 16), B = parseInt(normHex(b).slice(1), 16);
    const ch = s => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t);
    return "#" + [16, 8, 0].map(s => ch(s).toString(16).padStart(2, "0")).join("");
  }

  /* ---------- Jost advance widths (per 100 em) — lets textLength choose tracking vs squeeze ---------- */
  const ADV_CH = " !\"#%&'()*+,-./0123456789:;?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]abcdefghijklmnopqrstuvwxyz·—•→°";
  const ADV = {
    500: "30,32,49,63,82,71,29,32,32,59,64,31,22,31,55,62,47,60,58,63,60,61,56,58,61,31,36,58,77,69,60,69,70,57,52,79,74,28,28,62,48,84,78,80,58,82,60,58,50,66,69,102,61,60,57,32,32,50,59,48,59,54,31,59,54,27,26,50,25,80,55,56,59,59,37,42,27,55,48,71,46,47,48,31,91,30,60,29",
    700: "30,34,52,67,92,75,31,34,34,59,67,32,22,32,61,66,51,66,62,70,64,67,60,63,67,32,39,63,77,74,66,70,73,60,55,81,79,32,33,70,53,89,79,82,62,86,65,62,56,70,74,106,68,66,62,36,36,54,62,49,62,57,34,61,57,28,27,58,27,82,57,59,62,62,41,46,32,57,53,76,53,52,52,32,94,30,60,30"
  };
  for (const w in ADV) ADV[w] = ADV[w].split(",").map(Number);
  const textW = (str, size, wt = 700) => {
    let w = 0;
    for (const ch of String(str)) { const i = ADV_CH.indexOf(ch); w += i < 0 ? 60 : ADV[wt][i]; }
    return w / 100 * size;
  };

  /* ---------- type helpers ---------- */
  const FONT = `font-family="Jost, Futura, 'Century Gothic', 'Helvetica Neue', Arial, sans-serif"`;
  const FW = `${FONT} font-weight="700"`;
  const FM = `${FONT} font-weight="500"`;
  // fixed-width text: textLength pins the width whatever font actually rendered.
  // Tracks the letters out when the word is naturally narrower, squeezes only when wider.
  const T = (x, y, s, str, fill, w, a, x2 = "", wt = 700) => {
    const adj = w ? ` textLength="${r1(w)}" lengthAdjust="${textW(str, s, wt) < w * 1.01 ? "spacing" : "spacingAndGlyphs"}"` : "";
    return `<text x="${r1(x)}" y="${r1(y)}" font-size="${r1(s)}"${fill ? ` fill="${fill}"` : ""}${adj}${a ? ` text-anchor="${a}"` : ""}${x2}>${escA(str)}</text>`;
  };
  // small tracked text (weight 500): natural Jost width + tracking `tr` em between letters
  const MT = (x, y, s, str, fill, a, tr = .1) => {
    const n = String(str).length;
    return `<text x="${r1(x)}" y="${r1(y)}" font-size="${r1(s)}"${fill ? ` fill="${fill}"` : ""} textLength="${r1(textW(str, s, 500) + tr * s * (n - 1))}" lengthAdjust="spacing"${a ? ` text-anchor="${a}"` : ""}>${escA(str)}</text>`;
  };

  /* ---------- fabric textures (legacy shapes: denim, linen, oxford…) ---------- */
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
    pique:   (id, c) => pat(id, 3.2, `<circle cx=".8" cy=".8" r=".6" fill="#000" fill-opacity="${c.light ? .07 : .12}"/><circle cx="2.4" cy="2.4" r=".6" fill="#fff" fill-opacity="${c.dark ? .05 : .08}"/>`),
    melange: (id, c) => pat(id, 7, `<path d="M1 1h.4M4.5 2h.4M2 5h.4M6 4.4h.4" stroke="#fff" stroke-opacity="${c.dark ? .09 : .26}" stroke-width="1.2" stroke-linecap="round"/><path d="M3 3.4h.4M5.5 6.2h.4M.4 3h.4" stroke="#000" stroke-opacity="${c.dark ? .2 : .14}" stroke-width="1.2" stroke-linecap="round"/>`),
    suiting: id => pat(id, 3, `<path d="M0 1.5H3" ${W(.05)}/>`, "rotate(-45)")
  };
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
    return p.shape === "tee" || !p.shape ? "jersey" : "cotton";
  }

  /* ---------- per-garment palette ---------- */
  function ctx(p, k, R) {
    const cl = isClub(p), base = cl ? styleOf(p).body : normHex(p.color);
    const [h, s] = hexToHsl(base), lum = luma(base);
    const light = lum > .78, dark = lum < .16, fab = cl ? "k" + styleOf(p).knit : fabricOf(p);
    const blueish = h > 190 && h < 260 && s > .15;
    return {
      k, R, base, light, dark, lum, fab, tone: light ? "l" : dark ? "d" : "m",
      lt: shade(base, dark ? .08 : .06),
      dk: shade(base, light ? -.08 : -.07),
      dk2: shade(base, light ? -.16 : -.13),
      inner: dark ? shade(base, -.04) : shade(base, light ? -.12 : -.1),
      rib: dark ? shade(base, .012) : shade(base, light ? -.022 : -.018),
      // tonal edge / seam colour (no cartoon outlines: always close to the cloth colour)
      line: light ? shade(base, -.17) : dark ? shade(base, .07) : shade(base, -.1),
      stitch: fab === "denim" ? (blueish ? "#c98d44" : "#a8916f")
        : dark ? shade(base, .09) : shade(base, light ? -.15 : -.09),
      btn: light ? "#fdfcf9" : shade(base, dark ? .16 : .1),
      metal: dark ? "#8f8b84" : "#b9b2a6",
      sts: [], texOn: false, p
    };
  }

  /* ---------- drawing primitives ---------- */
  const P = (d, f, x = "") => `<path d="${d}" fill="${f}"${x}/>`;
  const L = (d, s, w, x = "") => `<path d="${d}" fill="none" stroke="${s}" stroke-width="${w}"${x}/>`;
  // stitching is collected per garment and emitted as one dashed tonal path on top
  const st = (c, d) => (c.sts.push(d), "");
  const dots = (d, col, w = 1.6) => L(d, col, w, ` stroke-dasharray="0 4" stroke-linecap="round"`);
  // a fabric piece drawn on top of the body (collar, pocket…): tonal edge + texture
  const piece = (c, d, f, x = "") => P(d, f || c.base, ` stroke="${c.line}" stroke-opacity=".6" stroke-width=".8" stroke-linejoin="round"${x}`) +
    (c.texOn ? P(d, `url(#${c.k}t)`) : "");
  // soft fold / highlight strokes (these feed the height map: dark = valley, light = ridge)
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
  function ribs(A, B, n, col = "#000", o = .22, w = .9, ri = r1) {
    let d = "";
    for (let i = 1; i < n; i++) {
      const p = bz(A, i / n), q = bz(B, i / n);
      d += `M${ri(p[0])} ${ri(p[1])}L${ri(q[0])} ${ri(q[1])}`;
    }
    return L(d, col, w, ` stroke-opacity="${o}"`);
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
  const ribs2 = (A, B, n, col, o, w, ri) => ribs(A, B, n, col, o, w, ri) + ribs(mirA(A), mirA(B), n, col, o, w, ri);
  // cheap rib knit for straight bands: a wide dashed stroke along the band's centre line
  const rb = (d, w, o = .2) => L(d, "#000", w, ` stroke-opacity="${o}" stroke-dasharray=".9 2.5"`);

  // closed outline through points [x, y, r]: each corner rounded with radius r (a quadratic);
  // a large r on a mid-edge point turns it into a smooth curve
  function rpath(pts) {
    const n = pts.length, f = p => `${Math.round(p[0])} ${Math.round(p[1])}`;
    let d = "";
    for (let i = 0; i < n; i++) {
      const p = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      const la = Math.hypot(a[0] - p[0], a[1] - p[1]) || 1, lb = Math.hypot(b[0] - p[0], b[1] - p[1]) || 1;
      const r = Math.min(p[2] || 0, la / 2, lb / 2);
      const p1 = [p[0] + (a[0] - p[0]) * r / la, p[1] + (a[1] - p[1]) * r / la];
      const p2 = [p[0] + (b[0] - p[0]) * r / lb, p[1] + (b[1] - p[1]) * r / lb];
      d += (i ? "L" : "M") + f(p1) + (r > 0 ? `Q${f(p)} ${f(p2)}` : "");
    }
    return d + "Z";
  }
  const mirPts = pts => pts.slice().reverse().map(p => [400 - p[0], p[1], p[2]]);

  /* =========================================================
     LEGACY GARMENTS (shirt, camp, kurta, hoodie, jacket, pants) — collared polos live in CLUB EDIT below
     each returns { parts:[d | {d,f}], folds, hl?, top }
     ========================================================= */
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
     Inks are real screen-print colours: off-white / soft black + one
     earthy accent (terracotta), never neon.
     ========================================================= */
  function inks(col) {
    const base = normHex(col), dark = luma(base) < .55;
    return {
      base, dark,
      fg: dark ? "#ecebe5" : "#1b1b1a",          // main ink
      soft: dark ? "#a6a39b" : "#6c6861",        // secondary ink
      acc: dark ? "#cf6a46" : "#b4462d",         // accent (terracotta / sindoor)
      ko: base                                   // knockout = garment colour
    };
  }
  // deterministic PRNG so artwork never changes between renders
  const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rule = (y, col, x0 = 10, x1 = 390, w = 2) => `<path d="M${x0} ${y}H${x1}" stroke="${col}" stroke-width="${w}"/>`;

  /* small chest mark: tracked wordmark over a hairline + drop tag */
  function pLogo(n) {
    return `<g ${FW}>${T(200, 214, 96, "BHAKSHI", n.fg, 384, "middle")}</g>` +
      `<path d="M8 246H392" stroke="${n.fg}" stroke-width="5"/>` +
      `<g ${FM}>${T(200, 294, 30, "DROP 01 · FIRST LIGHT", n.fg, 384, "middle", "", 500)}</g>`;
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
      `<rect x="146" y="166" width="108" height="40" fill="${n.fg}"/>` +
      `<g ${FW}>${T(200, 196, 26, "06—09", n.ko, 92, "middle")}</g>` +
      `<g ${FM}>${MT(10, 388, 16, "19.07°N 72.87°E", n.fg)}${MT(390, 388, 16, "RAIN INDEX 86%", n.fg, "end")}</g>` +
      `<rect x="10" y="368" width="60" height="5" fill="${n.acc}"/>`;
  }

  /* chai (front): line-drawn cutting-chai glass with steam */
  function pChaiGlass(n) {
    const tea = n.dark ? "#d08a52" : "#a9622f", foam = n.dark ? "#ecc9a2" : "#dcb48c";
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
      `<g ${FM}>${MT(200, 386, 25, "CUTTING CHAI · 4PM", n.fg, "middle", .14)}</g>`;
  }

  /* chai (back): a "CHAI BREAK" ticket — big 4:00 PM + menu rows + barcode */
  function pChaiTicket(n) {
    const ink = n.fg, hot = n.dark ? "#e09a52" : "#b4462d";
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
    const ink = n.fg, yel = "#e0b23e", dk = "#161616";
    const st = [["BKS", "BHAKSHI JN.", "22:10"], ["CHT", "CHAI TAPRI", "23:40"], ["MNS", "MONSOON NAGAR", "01:25"], ["HWY", "HIGHWAY DHABA", "03:50"], ["DWN", "DAWN TERMINUS", "06:20"]];
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

  const PRINTS = { logo: pLogo, core: pCore, monsoon: pMonsoon, chai: (n, k, side) => side === "front" ? pChaiGlass(n) : pChaiTicket(n, k),
    express: pExpress };
  // where a print sits on each top: [cx, cy, scale] of the 400-box print in the garment's drawing space.
  // Tee numbers are true to life: chest mark ≈ 9 cm, back panel ≈ 34 cm on a 60 cm chest.
  const PLACE = {
    tee:    { logo: [252, 150, .1],  chest: [200, 182, .24], back: [200, 206, .36], backLogo: [200, 124, .1] },
    polo:   { logo: [252, 166, .12], chest: [200, 236, .3],  back: [200, 230, .44] },
    shirt:  { logo: [244, 186, .08], chest: [244, 186, .08], back: [200, 236, .46] },
    camp:   { logo: [244, 214, .08], chest: [244, 214, .08], back: [200, 240, .48] },
    kurta:  { logo: [246, 160, .1],  chest: [246, 160, .1],  back: [200, 240, .46] },
    hoodie: { logo: [250, 182, .13], chest: [200, 204, .3],  back: [200, 250, .42] },
    jacket: { logo: [250, 170, .12], chest: [250, 170, .12], back: [200, 236, .44] }
  };
  const printsOf = p => {
    const pr = p.print && typeof p.print === "object" ? p.print : {};
    return { front: PRINTS[pr.front] ? pr.front : "", back: PRINTS[pr.back] ? pr.back : "" };
  };
  // how the graphic is applied (changes its relief): puff ink stands up, embroidery is thread
  const techOf = (p, side, name) => {
    const t = (p.techniques || []).join(" ").toLowerCase();
    if (side === "front" && name !== "logo" && /embroider/.test(t)) return "emb";
    if (side === "back" && /puff/.test(t)) return "puff";
    return "screen";
  };

  /* =========================================================
     T-SHIRT v3 — heavyweight oversized tee, laid flat (or on a hanger).
     Drawn in the 400×500 garment space. Returns
       { parts, relief (grey height map: dark = low, light = high), top (colour details) }
     ========================================================= */
  function teeGeo(o = {}) {
    const hang = !!o.hang, reg = o.over === false;
    const deg = hang ? 47 : reg ? 31 : 31, a = deg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    const S = hang ? [84, 116] : reg ? [96, 104] : [82, 106];                 // shoulder point (left)
    const len = hang ? 80 : reg ? 70 : 90, cuff = hang ? 70 : reg ? 64 : 76;  // sleeve length, cuff opening
    const sx = hang ? 86 : reg ? 96 : 82, hem = hang ? 398 : reg ? 388 : 392, hx = hang ? 96 : sx + 1;
    const C1 = [S[0] - len * ca, S[1] + len * sa], C2 = [C1[0] + cuff * sa, C1[1] + cuff * ca];
    const t = (sx - C2[0]) / ca;
    const A = t > 4 ? [sx, C2[1] - t * sa] : [sx, C2[1] + 5];               // armpit
    return { hang, ca, sa, S, C1, C2, A, sx, hem, hx };
  }
  // neck geometry shared by the flat, folded and hanging tee
  const NECK = {
    hole: "M158 90C178 97.5 222 97.5 242 90C242 118 222 134 200 134C178 134 158 118 158 90Z",
    fRib: "M158 90C158 118 178 134 200 134C222 134 242 118 242 90L234 93.5C233.5 114 218 125.5 200 125.5C182 125.5 166.5 114 166 93.5Z",
    fOut: "M158 90C158 118 178 134 200 134C222 134 242 118 242 90",
    bRibIn: "M158 90C178 97.5 222 97.5 242 90L236 94.5C218 103 182 103 164 94.5Z",
    bRib: "M158 90C178 97.5 222 97.5 242 90L241.3 96.4C221 104 179 104 158.7 96.4Z",
    bIn: "M158.7 96.4C179 104 221 104 241.3 96.4"
  };
  const hv = (d, w, o) => `<path d="${d}" stroke="#000" stroke-width="${w}" stroke-opacity="${op(o)}"/>`;   // valley
  const hr = (d, w, o) => `<path d="${d}" stroke="#fff" stroke-width="${w}" stroke-opacity="${op(o)}"/>`;   // ridge
  const hf = (d, col, o) => `<path d="${d}" fill="${col}" fill-opacity="${op(o)}"/>`;
  const he = (cx, cy, rx, ry, col, o, rot = 0) => `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${rx}" ry="${ry}" fill="${col}" fill-opacity="${op(o)}"${rot ? ` transform="rotate(${r1(rot)} ${r1(cx)} ${r1(cy)})"` : ""}/>`;

  // woven label (inside back neck) / woven tab (outside back neck)
  function wovenLabel(c, x, y, w, h) {
    const R = c.R, x0 = r1(x - w / 2), y0 = r1(y - h / 2);
    return `<rect x="${r1(x0 + .4)}" y="${r1(y0 + .9)}" width="${w}" height="${h}" fill="#000" fill-opacity="${c.dark ? .5 : .2}" filter="url(#${R.blur(.7)})"/>` +
      `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#e9e4d8"/>` +
      `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="url(#${R.weave()})"/>` +
      `<g ${FW}>${T(x, y + h * .19, h * .5, "BHAKSHI", "#1d1d1c", w * .7, "middle")}</g>` +
      `<path d="M${r1(x0 + 1)} ${y0}V${r1(y0 + h)}M${r1(x0 + w - 1)} ${y0}V${r1(y0 + h)}" stroke="#000" stroke-opacity=".22" stroke-width=".35" stroke-dasharray=".7 .45"/>`;
  }
  function neckFront(c, o) {
    const R = c.R;
    let top = P(NECK.hole, c.inner) + P(NECK.bRibIn, shade(c.inner, c.dark ? .015 : .03)) +
      // the back rib casts a soft shadow down into the neck opening
      `<path d="M163 96C182 104.5 218 104.5 237 96" fill="none" stroke="#000" stroke-opacity="${c.dark ? .55 : .3}" stroke-width="4.5" filter="url(#${R.blur(1.6)})"/>` +
      wovenLabel(c, 200, 106, 22, 8.5);
    if (o.hang) top += `<path d="M160 93.5C180 100.5 220 100.5 240 93.5L239 101.5C220 109 180 109 161 101.5Z" fill="#b08559"/>` +
      `<path d="M160 94C180 101 220 101 240 94" fill="none" stroke="#dcbd94" stroke-width="1.4"/>` +
      `<path d="M161 102C180 109.5 220 109.5 239 102" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="2.4" filter="url(#${R.blur(1)})"/>` +
      `<rect x="197.5" y="86" width="5" height="13" rx="1.4" fill="#8e8b85"/>`;
    top += P(NECK.fRib, c.rib) +
      (o.lite ? "" : ribs2([158, 90, 158, 118, 178, 134, 200, 134], [166, 93.5, 166.5, 114, 182, 125.5, 200, 125.5], 26, c.dark ? "#fff" : "#000", c.dark ? .05 : .08, .45));
    st(c, "M155.5 92C157 120 177 137.5 200 137.5C223 137.5 243 120 244.5 92");
    const relief = hf(NECK.hole, "#000", .45) + hf(NECK.bRibIn, "#808080", .55) +
      `<rect x="189" y="101.8" width="22" height="8.5" fill="#fff" fill-opacity=".14"/>` +
      hf(NECK.fRib, "#fff", .3) + hv(NECK.fOut, 1.2, .35);
    return { top, relief };
  }

  function tee(c, v, o) {
    const G = teeGeo(o), { S, C1, C2, A, ca, sa, sx, hem, hx } = G, R = c.R;
    const f = p => `${r1(p[0])} ${r1(p[1])}`;
    const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    const ins = (p, d) => [p[0] + ca * d, p[1] - sa * d];   // from the cuff edge toward the shoulder
    const m = lerp(S, C1, .5), Q = [m[0] - sa * 2.5, m[1] - ca * 2.5];
    const left = [[158, 90, 3], [(158 + S[0]) / 2, (90 + S[1]) / 2 - 2, 40], [S[0], S[1], 12], [Q[0], Q[1], 40],
      [C1[0], C1[1], 3.5], [C2[0], C2[1], 3.5], [A[0], A[1], G.hang ? 5 : 10], [sx + .7, (A[1] + hem) / 2, 90], [hx, hem, 4]];
    const body = rpath([...left, [200, hem + 3, 90], ...mirPts(left), [200, 96.5, 40]]);
    // construction lines
    const seam = `M${f(S)}Q${f([S[0] + 9, (S[1] + A[1]) / 2])} ${f(A)}`;
    const seamR = `M${f([S[0] + 2.4, S[1] + 1])}Q${f([S[0] + 11.4, (S[1] + A[1]) / 2])} ${f([A[0] + 2.4, A[1] - 1])}`;
    const cuffL = d => `M${f(ins(C1, d))}L${f(ins(C2, d))}`;
    const hemL = d => `M${hx + .5} ${hem - d}Q200 ${hem + 3 - d} ${399.5 - hx} ${hem - d}`;
    const cuffBand = `M${f(C1)}L${f(C2)}L${f(ins(C2, 10))}L${f(ins(C1, 10))}Z`;
    const hemBand = `M${hx} ${hem}Q200 ${hem + 4} ${400 - hx} ${hem}L${399.5 - hx} ${hem - 10}Q200 ${hem - 7} ${hx + .5} ${hem - 10}Z`;
    st(c, (o.noCuff ? "" : both(cuffL(7)) + both(cuffL(9.4))) + hemL(7) + hemL(9.4));
    // drape: a few broad, soft folds (heavyweight cotton doesn't crumple)
    const sc = [(S[0] + C1[0] + C2[0] + A[0]) / 4, (S[1] + C1[1] + C2[1] + A[1]) / 4];
    const ang = -Math.atan2(sa, ca) * 180 / Math.PI;
    let soft, med, dome;
    if (G.hang) {
      dome = he(200, 250, 70, 130, "#fff", .18);
      soft = hv("M146 128Q136 260 150 388", 14, .24) + hv("M252 136Q266 262 248 390", 12, .22) +
        hr("M176 132Q168 262 180 390", 16, .22) + hr("M224 138Q234 262 222 390", 14, .2) +
        hv(both(`M${A[0] + 3} ${r1(A[1])}Q${A[0] + 8} ${r1(A[1] + 70)} ${A[0] + 4} ${hem - 10}`), 10, .2) +
        he(S[0] + 12, S[1] + 2, 16, 10, "#fff", .32) + he(388 - S[0], S[1] + 2, 16, 10, "#fff", .32) +
        hv(both("M168 114Q140 122 108 128"), 9, .16);
      med = hv(both(`M${f(lerp(S, A, .5))}Q${f([sc[0] - 4, sc[1] + 6])} ${f(ins(lerp(C1, C2, .6), 12))}`), 4, .22) +
        hv(`M150 ${hem - 2}Q153 ${hem - 18} 149 ${hem - 34}`, 4, .18) + hv(`M262 ${hem - 1}Q258 ${hem - 16} 263 ${hem - 30}`, 4, .16);
    } else {
      dome = he(200, 252, 92, 112, "#fff", .26) + he(sc[0], sc[1], 26, 17, "#fff", .2, ang) + he(400 - sc[0], sc[1], 26, 17, "#fff", .2, -ang);
      soft = hv(both(`M${A[0] + 2} ${r1(A[1] + 8)}Q${A[0] + 26} ${r1(A[1] + 44)} ${A[0] + 30} ${r1(A[1] + 120)}`), 16, .22) +
        hv("M92 322Q146 308 198 322Q250 336 306 318", 24, .13) + hr("M100 352Q150 340 202 352Q254 362 300 348", 22, .08) +
        hv("M268 152Q286 250 270 352", 18, .11) + hr("M136 160Q122 252 138 346", 20, .2) +
        hv("M168 152Q200 162 232 152", 10, .13);
      med = hv(both(`M${f(lerp(S, A, .45))}Q${f([sc[0] - 2, sc[1] + 2])} ${f(ins(lerp(C1, C2, .55), 14))}`), 5, .2) +
        hv(both(`M${A[0] - 3} ${r1(A[1] - 5)}Q${A[0] - 14} ${r1(A[1] - 15)} ${A[0] - 28} ${r1(A[1] - 17)}`), 4, .18) +
        hv(`M128 ${hem - 1}Q131 ${hem - 12} 127 ${hem - 26}`, 4, .18) + hv(`M246 ${hem}Q243 ${hem - 14} 248 ${hem - 28}`, 4, .16) +
        hv(`M186 ${hem + 1}Q188 ${hem - 9} 185 ${hem - 20}`, 3.5, .13);
    }
    const flip = v === "back" ? ` transform="matrix(-1 0 0 1 400 0)"` : "";
    const fine = `<g filter="url(#${R.blur(.9)})">` + hv(both(seam), 1.6, c.dark ? .2 : .24) + hr(both(seamR), 2.4, .05) +
      hf(both(cuffBand), "#fff", .07) + hv(both(cuffL(10)), 1.4, .26) + hf(hemBand, "#fff", .07) + hv(hemL(10), 1.4, .26) + `</g>`;
    let top = "", nr = "";
    if (o.noNeck) { /* collared garments draw their own neck */ }
    else if (v === "back") {
      top = P(NECK.bRib, c.rib) +
        (o.lite ? "" : ribs([158, 90, 178, 97.5, 222, 97.5, 242, 90], [158.7, 96.4, 179, 104, 221, 104, 241.3, 96.4], 44, c.dark ? "#fff" : "#000", c.dark ? .05 : .08, .45)) +
        wovenLabel(c, 200, 105.6, 19, 7.4);
      st(c, "M159.5 99.8C179 107.6 221 107.6 240.5 99.8");
      nr = hf(NECK.bRib, "#fff", .22) + hv(NECK.bIn, 1.1, .35) + `<rect x="190.5" y="101.9" width="19" height="7.4" fill="#fff" fill-opacity=".16"/>`;
    } else {
      const n = neckFront(c, o);
      top = n.top; nr = n.relief;
    }
    return {
      parts: [body], place: "tee", edge: [9, .22], top, G,
      relief: `<g fill="none" stroke-linecap="round"><g filter="url(#${R.blur(18)})">${dome}</g><g filter="url(#${R.blur(10)})"><g${flip}>${soft}</g></g>` +
        `<g filter="url(#${R.blur(2.6)})"><g${flip}>${med}</g></g>${fine}${nr}</g>`
    };
  }

  /* ---------- the same tee, retail-folded (sides and sleeves tucked behind, chest showing) ---------- */
  function teeFolded(c, v, o) {
    const R = c.R, x0 = 118, x1 = 282, y1 = 292;
    const left = [[158, 90, 3], [138, 93.5, 24], [x0, 97, 6], [x0 - .8, 196, 120], [x0 + .4, y1, 6]];
    const body = rpath([...left, [200, y1 + 1.2, 90], ...mirPts(left), [200, 96.5, 40]]);
    const dome = he(200, 200, 66, 88, "#fff", .2), soft = hv("M120 206Q200 196 280 208", 22, .1) +
      hr(both(`M${x0 + 15} 112Q${x0 + 12} 200 ${x0 + 16} ${y1 - 14}`), 12, .15) +
      hv(both(`M${x0 + 28} 120Q${x0 + 25} 200 ${x0 + 30} ${y1 - 24}`), 8, .12) +
      hr(`M${x0 + 16} ${y1 - 12}Q200 ${y1 - 8} ${x1 - 16} ${y1 - 12}`, 10, .24);
    const med = hv(both("M160 101Q141 108 122 104"), 4, .14) + hv("M150 262Q175 254 196 264", 4, .1) + hv("M226 222Q246 216 262 224", 3.5, .08);
    const n = neckFront(c, o);
    return {
      parts: [body], place: "tee", edge: [12, .26], top: n.top,
      relief: `<g fill="none" stroke-linecap="round"><g filter="url(#${R.blur(16)})">${dome}</g><g filter="url(#${R.blur(7)})">${soft}</g><g filter="url(#${R.blur(2.6)})">${med}</g>${n.relief}</g>`
    };
  }

  /* =========================================================
     CLUB EDIT (v3.1) — collared polos, rugby shirts, johnny-collar knits.
     Driven by product.style; same 400×500 drawing space and lighting
     pipeline as the tee. A collared garment returns
       { parts, under (yarn-dyed stripes, below the knit texture), top, relief }
     ========================================================= */
  const CLUB = { polo: 1, rugby: 1, knitpolo: 1 };
  const isClub = p => !!(p && CLUB[p.shape]);
  function styleOf(p) {
    const s = (p && p.style) || {}, sh = p && p.shape;
    const body = normHex(s.body || p.color);
    const sp = s.stripes && Array.isArray(s.stripes.colors) && s.stripes.colors.length ? s.stripes : null;
    const g = s.graphic && s.graphic.text ? s.graphic : null;
    const t = ((p && p.techniques) || []).join(" ").toLowerCase();
    return {
      body, collar: normHex(s.collar || body),
      long: (s.sleeve || (sh === "polo" ? "short" : "long")) === "long",
      johnny: (s.placket || (sh === "knitpolo" ? "johnny" : "button")) === "johnny",
      knit: { pique: 1, jersey: 1, rib: 1, waffle: 1 }[s.knit] ? s.knit : sh === "knitpolo" ? "waffle" : sh === "rugby" ? "jersey" : "pique",
      tipping: Array.isArray(s.tipping) ? s.tipping.slice(0, 5).map(normHex) : [],
      stripes: sp && { bands: sp.area === "bands", colors: sp.colors.slice(0, 4).map(normHex),
        w: Math.max(1, Math.min(16, +sp.width || 4)), gap: Math.max(8, Math.min(80, +sp.spacing || 24)) },
      graphic: g && { kind: g.kind === "number" ? "number" : "script", text: String(g.text).slice(0, 14), sub: g.sub ? String(g.sub).slice(0, 24) : "",
        color: normHex(g.color || "#f4f1ea"), large: g.size !== "small",
        tech: g.kind === "number" ? "felt" : /puff/.test(t) ? "puff" : /embroid/.test(t) ? "emb" : "print" }
    };
  }
  // tonal palette for a contrast collar / placket
  function cpal(hex) {
    const b = normHex(hex), l = luma(b), light = l > .78, dark = l < .16;
    return { b, light, dark, line: light ? shade(b, -.17) : dark ? shade(b, .08) : shade(b, -.11),
      in: shade(b, light ? -.13 : dark ? .03 : -.1), st: light ? shade(b, -.2) : shade(b, dark ? .1 : -.13) };
  }
  // knit textures for the club garments (subtle; scale with the drawing)
  TEX.kpique = (id, c) => `<pattern id="${id}" width="2.6" height="2.2" patternUnits="userSpaceOnUse">` +
    `<circle cx=".65" cy=".55" r=".52" fill="#000" fill-opacity="${c.light ? .07 : .13}"/><circle cx="1.95" cy="1.65" r=".52" fill="#000" fill-opacity="${c.light ? .07 : .13}"/>` +
    `<circle cx=".5" cy=".38" r=".22" fill="#fff" fill-opacity="${c.dark ? .05 : .1}"/><circle cx="1.8" cy="1.48" r=".22" fill="#fff" fill-opacity="${c.dark ? .05 : .1}"/></pattern>`;
  TEX.kjersey = (id, c) => pat(id, 1.6, `<path d="M.8 0V1.6" ${B(c.light ? .05 : .09, .5)}/><path d="M0 .4H1.6" ${W(c.dark ? .025 : .05, .3)}/>`);
  TEX.krib = (id, c) => pat(id, 2.4, `<rect width="1.1" height="2.4" fill="#000" fill-opacity="${c.light ? .06 : .11}"/><path d="M1.75 0V2.4" ${W(c.dark ? .04 : .09, .6)}/>`);
  TEX.kwaffle = (id, c) => pat(id, 1.9, `<path d="M0 .2H1.9M.2 0V1.9" ${B(c.light ? .05 : .09, .4)}/><rect x=".55" y=".55" width="1.05" height="1.05" rx=".35" fill="#fff" fill-opacity="${c.dark ? .03 : .08}"/>`);

  // rotate-able rib pattern for cuffs / hem bands (ribs run along `ang`)
  const ribPat = (R, ang, tone) => R.once("rp" + Math.round(ang) + tone, id =>
    `<pattern id="${id}" width="2.2" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(${r1(ang)})"><rect width="1" height="10" fill="#000" fill-opacity="${tone === "l" ? .07 : .14}"/><rect x="1.3" width=".5" height="10" fill="#fff" fill-opacity="${tone === "d" ? .04 : .1}"/></pattern>`);
  // yarn-dyed stripe edges: knitted, not printed — the edge steps a little with every stitch
  const yarnF = R => R.once("yarn", id => `<filter id="${id}" filterUnits="userSpaceOnUse" x="-120" y="-120" width="640" height="760">` +
    `<feTurbulence type="fractalNoise" baseFrequency="2.2 1.2" numOctaves="1" seed="7" result="n"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="n" scale=".55" xChannelSelector="R" yChannelSelector="G"/></filter>`);
  const feltF = R => R.once("felt", id => `<filter id="${id}" x="-4%" y="-4%" width="108%" height="108%" color-interpolation-filters="sRGB">` +
    `<feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="17" result="n"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="n" scale=".9" xChannelSelector="R" yChannelSelector="G" result="d"/>` +
    `<feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="2" seed="3" result="f"/>` +
    `<feColorMatrix in="f" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 .7 0 0 0 -.32" result="w"/>` +
    `<feComposite in="w" in2="d" operator="in" result="ws"/><feMerge><feMergeNode in="d"/><feMergeNode in="ws"/></feMerge></filter>`);
  const satinP = (R, light) => R.once("sat" + (light ? "l" : "d"), id => `<pattern id="${id}" width=".9" height=".9" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">` +
    `<rect width=".9" height=".9" fill="${light ? "#fff" : "#000"}" fill-opacity="0"/><path d="M0 .2H.9" stroke="#000" stroke-opacity="${light ? .16 : .3}" stroke-width=".26"/><path d="M0 .62H.9" stroke="#fff" stroke-opacity="${light ? .5 : .22}" stroke-width=".22"/></pattern>`);

  /* ---------- script lettering: our own monoline cursive, drawn with a broad-nib trick ----------
     Upright glyphs on a baseline (y 0), x-height −20, ascender −47; lowercase glyphs start at
     (0,−9) and end at e, so letters join; words are slanted with skewX at render time. */
  const GLY = {
    B: { d: "M3 -35C6 -45 18 -48 27 -45C35 -42 34 -30 22 -26C17 -24.5 14 -24 12 -24C24 -24 33 -18 31 -9C29 -1 18 2 8 0C2 -1 -1 -4 1 -7C3 -10 9 -9 14 -8C20 -7 26 -7 31 -9M14.5 -45C13.5 -30 10.5 -14 6.5 -1", e: [31, -9] },
    J: { d: "M3 -37C7 -45 19 -48 30 -45C24 -32 19 -12 15 4C12 15 4 18 3 11C2 4 12 -4 26 -9", e: [26, -9] },
    C: { d: "M27 -40C24 -46 12 -47 6 -37C0 -26 0 -8 9 -2C15 2 22 -2 27 -9", e: [27, -9] },
    a: { d: "M0 -9C4 -15 9 -19 15 -19C8 -21 1 -14 2 -6C3 0 10 0 13 -6L16 -19C15 -12 13 -3 17 -1C20 0 23 -4 25 -9", s: 1, e: [25, -9] },
    b: { d: "M0 -9C5 -17 12 -31 13 -40C14 -48 7 -49 6 -41C5 -30 3 -10 5 -3C8 2 15 -2 17 -10C18 -16 15 -21 11 -17C14 -16 19 -16 24 -18", s: 1, e: [24, -18] },
    h: { d: "M0 -9C5 -17 12 -31 13 -40C14 -48 7 -49 6 -41C5 -30 4 -12 3 0C5 -9 9 -19 16 -19C21 -19 21 -14 20 -9C19 -4 19 0 22 0C24 0 26 -4 28 -9", s: 1, e: [28, -9] },
    i: { d: "M0 -9C3 -13 5 -17 7 -20C6 -13 4 -5 7 -2C9 0 12 -4 14 -9", s: 1, e: [14, -9], dot: [9, -28] },
    k: { d: "M0 -9C5 -17 12 -31 13 -40C14 -48 7 -49 6 -41C5 -30 4 -12 3 0C5 -10 10 -19 16 -19C21 -19 21 -12 10 -11C15 -9 16 -1 21 -1C23 -1 25 -5 27 -9", s: 1, e: [27, -9] },
    l: { d: "M0 -9C5 -17 12 -31 13 -40C14 -48 7 -49 6 -41C5 -30 3 -10 5 -3C7 1 11 -3 14 -9", s: 1, e: [14, -9] },
    s: { d: "M0 -9C4 -12 7 -16 9 -21C11 -16 16 -11 14 -5C12 0 5 0 3 -3C7 -1 12 -3 15 -5C17 -6 19 -8 20 -9", s: 1, e: [20, -9] },
    u: { d: "M0 -9C2 -13 4 -17 5 -20C3 -12 2 -4 6 -1C10 1 14 -7 16 -20C15 -12 14 -3 18 -1C20 0 23 -5 25 -9", s: 1, e: [25, -9] }
  };
  const PAIR = /(-?\d*\.?\d+)\s+(-?\d*\.?\d+)/g;
  for (const ch in GLY) { const xs = []; GLY[ch].d.replace(PAIR, (m, x) => xs.push(+x)); GLY[ch].l = Math.min(...xs); }
  function scriptWord(text) {
    let pen = 0, free = true, d = "";
    const xs = [], ys = [];
    for (const ch of String(text)) {
      if (ch === " ") { pen += 12; free = true; continue; }
      const g = GLY[ch] || GLY[ch.toLowerCase()];
      if (!g) { pen += 12; free = true; continue; }
      const dx = g.s && !free ? pen : pen - g.l + (free && pen ? 2 : 0);
      d += g.d.replace(PAIR, (m, x, y) => { const X = +x + dx; xs.push(X); ys.push(+y); return `${r1(X)} ${y}`; });
      if (g.dot) d += `M${r1(g.dot[0] + dx)} ${g.dot[1]}h.1`;
      pen = dx + g.e[0]; free = false;
    }
    return xs.length ? { d, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) } : null;
  }
  const SK = .21;   // skewX(−12°)
  // the chest script: raised puff / satin embroidery / flat print; returns markup + relief
  function scriptMark(c, G, cx, cy, wT, rot, zoom) {
    const R = c.R, w = scriptWord(G.text);
    if (!w) return { top: "", relief: "" };
    const id = c.k + "sw", bx0 = w.x0 - SK * w.y1, bx1 = w.x1 - SK * w.y0;
    const s = wT / (bx1 - bx0), xc = (bx0 + bx1) / 2, yc = w.y0 * .55;
    const sw = G.large ? 3.3 : 3.6, nib = G.large ? 1.5 : 1.1;
    const cp = [0, .5, 1].map(t => `<use href="#${id}p"${t ? ` x="${r2(t * nib)}" y="${r2(-t * nib)}"` : ""}/>`).join("");
    R.defs.push(`<path id="${id}p" d="${w.d}"/><g id="${id}">${cp}</g>`);
    const tf = `translate(${r1(cx)} ${r1(cy)}) rotate(${rot}) scale(${r2(s)}) translate(${r1(-xc)} ${r1(-yc)}) skewX(-12)`;
    const u = x => `<use href="#${id}"${x}/>`, light = luma(G.color) > .6;
    let m = u(` stroke="#000" transform="translate(.5 1.1)" filter="url(#${R.blur(.7)})" opacity="${G.tech === "puff" ? .45 : .32}"`) +
      `<g${G.tech === "puff" ? "" : ` filter="url(#${G.tech === "emb" ? R.thread() : R.ink()})"`}>` + u(` stroke="${G.color}"`) +
      (G.tech === "emb" && zoom ? u(` stroke="url(#${satinP(R, light)})"`) : "") + `</g>` +
      (G.tech === "puff" ? u(` stroke="#fff" stroke-opacity="${light ? .28 : .16}" stroke-width="${r1(sw * .35)}" transform="translate(-.4 -.5)" filter="url(#${R.blur(.3)})"`) : "");
    let top = `<g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="${sw}"><g transform="${tf}">${m}</g></g>`;
    const relief = `<g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="${sw}" filter="url(#${R.blur(G.large ? 1.8 : 1.2)})"><g transform="${tf}">` +
      u(` stroke="#fff" stroke-opacity="${G.tech === "puff" ? .2 : G.tech === "emb" ? .12 : .03}"`) + `</g></g>`;
    if (G.sub) {
      const fs = G.large ? 7 : 4.2, sy = cy + (G.large ? 40 : 13);
      top += `<g ${FM}${G.tech === "puff" ? "" : ` filter="url(#${G.tech === "emb" ? R.thread() : R.ink()})"`}>${MT(cx, sy, fs, G.sub, G.color, "middle", .32)}</g>`;
    }
    return { top, relief };
  }
  /* felt-appliqué collegiate numbers (0 and 1 drawn; other digits fall back to Jost) */
  const DIG = {
    "0": { w: 60, o: [[0, 0, 15], [60, 0, 15], [60, 84, 15], [0, 84, 15]], h: [[17, 17, 6], [43, 17, 6], [43, 67, 6], [17, 67, 6]],
      so: [[3.2, 3.2, 12], [56.8, 3.2, 12], [56.8, 80.8, 12], [3.2, 80.8, 12]], sh: [[13.8, 13.8, 8], [46.2, 13.8, 8], [46.2, 70.2, 8], [13.8, 70.2, 8]] },
    "1": { w: 46, o: [[12, 0, 2], [36, 0, 2], [36, 68, 1], [46, 68, 1], [46, 84, 1.5], [0, 84, 1.5], [0, 68, 1], [12, 68, 1], [12, 22, 1], [2, 25, 1.5], [2, 9, 1.5]],
      so: [[14.4, 3.2, 1.5], [32.8, 3.2, 1.5], [32.8, 71.2, 1], [42.8, 71.2, 1], [42.8, 80.8, 1], [3.2, 80.8, 1], [3.2, 71.2, 1], [15.2, 71.2, 1], [15.2, 17.6, 1], [5.2, 21, 1], [5.2, 11, 1.5]] }
  };
  const shiftPts = (pts, dx) => pts.map(q => [q[0] + dx, q[1], q[2]]);
  function numberMark(c, G, cx, cy, h) {
    const R = c.R, id = c.k + "nm", chars = String(G.text).split("").filter(ch => DIG[ch] || /\d/.test(ch));
    const gap = 9, tot = chars.reduce((a, ch) => a + (DIG[ch] ? DIG[ch].w : 52), 0) + gap * (chars.length - 1);
    let x = 0, shape = "", stitch = "", fb = "";
    for (const ch of chars) {
      const g = DIG[ch];
      if (g) {
        shape += rpath(shiftPts(g.o, x)) + (g.h ? rpath(shiftPts(g.h, x).reverse()) : "");
        stitch += rpath(shiftPts(g.so, x)) + (g.sh ? rpath(shiftPts(g.sh, x)) : "");
        x += g.w + gap;
      } else { fb += `<g ${FW}>${T(x + 26, 84, 112, ch, "", 52, "middle")}</g>`; x += 52 + gap; }
    }
    const s = h / 84, tf = `translate(${r1(cx - tot * s / 2)} ${r1(cy - h / 2)}) scale(${r2(s)})`;
    R.defs.push(`<g id="${id}"><path d="${shape}" fill-rule="evenodd"/>${fb}</g>`);
    const thread = shade(G.color, luma(G.color) < .3 ? .16 : -.14);
    let top = `<g transform="${tf}"><use href="#${id}" fill="#000" transform="translate(.9 1.6)" filter="url(#${R.blur(1.1)})" opacity="${.5}"/>` +
      `<g filter="url(#${feltF(R)})"><use href="#${id}" fill="${G.color}"/></g>` +
      L(stitch, thread, 1.1, ` stroke-dasharray="2.4 1.5" stroke-linecap="round" stroke-opacity=".9"`) + `</g>`;
    if (G.sub) top += `<g ${FM} filter="url(#${R.thread()})">${MT(cx, cy + h / 2 + 15, 7.2, G.sub, G.color, "middle", .42)}</g>`;
    const relief = `<g transform="${tf}" filter="url(#${R.blur(2.2)})"><use href="#${id}" fill="#fff" fill-opacity=".2"/></g>`;
    return { top, relief };
  }
  // where the chest graphic sits (drawing space): centre + width (or height for numbers)
  function graphicPos(S) {
    const G = S.graphic;
    if (!G) return null;
    if (G.kind === "number") return G.large ? { x: 200, y: 236, w: 112, h: 84 } : { x: 254, y: 168, w: 40, h: 30 };
    return G.large ? { x: 200, y: S.johnny ? 238 : 236, w: G.text.length > 8 ? 184 : 172 } : { x: 256, y: 166, w: G.text.length > 8 ? 58 : 50 };
  }
  function graphicArt(c, S, scale = 1, zoom) {
    const G = S.graphic, gp = graphicPos(S);
    if (!G) return { top: "", relief: "" };
    return G.kind === "number" ? numberMark(c, G, gp.x, gp.y, gp.h * scale)
      : scriptMark(c, G, gp.x, gp.y, gp.w * scale, G.large ? -6 : -4, zoom);
  }

  /* ---------- stripes: knitted-in, running round the body and round each sleeve ---------- */
  // offsets (along the stacking axis, from t0 to t1) of each stripe: [t, width, colour]
  function stripeList(sp, t0, t1, role) {
    const out = [], n = sp.colors.length;
    if (!sp.bands) {
      for (let i = 0, t = t0 + sp.gap * .5; t < t1; i++, t += sp.gap) out.push([t, sp.w, sp.colors[i % n]]);
      return out;
    }
    const g = Math.max(1.6, sp.w * .42), gh = n * sp.w + (n - 1) * g;
    const group = t => sp.colors.forEach((col, i) => out.push([t + i * (sp.w + g) + sp.w / 2, sp.w, col]));
    if (role === "sleeve") group(t0 + (t1 - t0) * .42 - gh / 2);
    else { group(t0 + 8); group(t0 + (t1 - t0) * .48 - gh / 2); group(t1 - gh - 14); }
    return out;
  }
  // stroke each stripe across the region: centre O, stacking axis u, stripe direction v, slight bow
  function stripeMarks(list, O, u, v, L, bow) {
    const by = {};
    for (const [t, w, col] of list) {
      const c0 = [O[0] + u[0] * t, O[1] + u[1] * t], b = bow(t);
      const a = [c0[0] - v[0] * L, c0[1] - v[1] * L], z = [c0[0] + v[0] * L, c0[1] + v[1] * L];
      const key = col + "|" + w;
      by[key] = (by[key] || "") + `M${r1(a[0])} ${r1(a[1])}Q${r1(c0[0] + u[0] * b)} ${r1(c0[1] + u[1] * b)} ${r1(z[0])} ${r1(z[1])}`;
    }
    return Object.keys(by).map(key => { const [col, w] = key.split("|"); return { col, w, d: by[key] }; });
  }

  /* ---------- the collar (front): back collar ring, two leaves with depth, neck interior ---------- */
  const q2c = (a, q, b) => [a[0], a[1], a[0] + (q[0] - a[0]) * 2 / 3, a[1] + (q[1] - a[1]) * 2 / 3, b[0] + (q[0] - b[0]) * 2 / 3, b[1] + (q[1] - b[1]) * 2 / 3, b[0], b[1]];
  const COL = {
    ring: "M152 95C170 77 230 77 248 95L234 99C218 89 182 89 166 99Z",
    ringIn: "M166 99C182 89 218 89 234 99",
    hull: "M149 98C167 73 233 73 251 98Z",
    stand: "M166 99C182 89 218 89 234 99L231 103.5C216 95.5 184 95.5 169 103.5Z",
    tape: "M169 103.5C184 95.5 216 95.5 231 103.5L228.5 107.5C214 100 186 100 171.5 107.5Z",
    // button polo leaf: roll edge (neck) → front edge → point → outer edge
    leaf: "M166 99Q181 111 198 125Q185 137 171 150Q147 128 152 95Z",
    leafRoll: [[166, 99], [181, 111], [198, 125]], leafOut: [[152, 95], [147, 128], [171, 150]],
    leafSt: "M154.4 97.5Q150.6 126 170.6 146.2Q182.6 136.5 194.4 125.6",
    hole: "M166 99C182 89 218 89 234 99L204 127H196Z",
    // johnny collar: bigger leaves, open V below
    jleaf: "M166 99Q178 113 194 130Q172 150 152 166Q138 128 151 95Z",
    jRoll: [[166, 99], [178, 113], [194, 130]], jOut: [[151, 95], [138, 128], [152, 166]],
    jleafSt: "M153.4 97.6Q141.4 128 153.6 162.2Q172 147.5 190.6 129.8",
    jhole: "M166 99C182 89 218 89 234 99L206 130L200 176L194 130Z",
    back: "M154 90.5C174 85 226 85 246 90.5L252 104.5C230 112 170 112 148 104.5Z",
    backTop: [154, 90.5, 174, 85, 226, 85, 246, 90.5], backBot: [148, 104.5, 170, 112, 230, 112, 252, 104.5]
  };
  function collarFront(c, S, o) {
    const R = c.R, cc = cpal(S.collar), J = S.johnny, lite = o.lite;
    const leaf = J ? COL.jleaf : COL.leaf, lid = c.k + "lv";
    R.defs.push(`<path id="${lid}" d="${leaf + mir(leaf)}"/>`);
    const roll = J ? COL.jRoll : COL.leafRoll, out = J ? COL.jOut : COL.leafOut;
    const A = q2c(...roll), Bc = q2c(...out);
    const tape = shade(S.body, luma(S.body) > .7 ? -.12 : -.06);
    let top = P(J ? COL.jhole : COL.hole, c.inner) + P(COL.stand, cc.in) + P(COL.tape, tape) +
      // the back collar shades the inside of the neck
      `<path d="M168 101C184 93 216 93 232 101" fill="none" stroke="#000" stroke-opacity="${cc.dark ? .5 : .32}" stroke-width="4" filter="url(#${R.blur(1.4)})"/>` +
      (o.zoom ? `<rect x="192.5" y="103.5" width="15" height="6.2" fill="#e9e4d8" stroke="#000" stroke-opacity=".18" stroke-width=".3"/><g ${FW}>${T(200, 107.8, 3.1, "BHAKSHI", "#1d1d1c", 10.5, "middle")}</g>` : P("M193 104H207V109.5H193Z", "#e6e0d3"));
    // placket / johnny V
    if (J) {
      top += L(both("M194.2 130L200 176"), c.line, .9, ` stroke-opacity=".7"`) + st(c, both("M191.6 131L198.2 178")) +
        L("M196.5 177.5H203.5", c.stitch, 1.4, ` stroke-opacity=".7"`);
    } else {
      const pk = S.stripes ? S.collar : S.body, pc = cpal(pk), y1 = S.long ? 214 : 202;
      const btn = S.collar !== S.body ? shade(S.collar, cc.light ? -.03 : .02) : c.btn;
      top += `<path d="M211.6 127V${y1}" stroke="#000" stroke-opacity=".3" stroke-width="2.4" filter="url(#${R.blur(1.2)})"/>` +
        P(`M189 124H211V${y1}H189Z`, pk, ` stroke="${pc.line}" stroke-opacity=".7" stroke-width=".8"`) +
        (c.texOn && pk === S.body ? P(`M189 124H211V${y1}H189Z`, `url(#${c.k}t)`) : "") +
        L(`M200.6 126V${y1 - 9}`, "#000", .7, ` stroke-opacity=".12"`) +
        L(`M191.3 127V${y1 - 2.2}H208.7V127M191.3 ${y1 - 9}H208.7`, pc.st, .65, ` stroke-opacity=".75" stroke-dasharray="2 1.4"`) +
        (S.long ? [148, 174, 200] : [146, 176]).map(y => `<circle cx="200.4" cy="${y + .9}" r="4.4" fill="#000" fill-opacity=".28" filter="url(#${R.blur(.8)})"/>` + button(c, 200, y, 3.9, btn)).join("");
    }
    // collar leaves: cast shadow, cloth, rib knit, edge stitching
    top += `<use href="#${lid}" fill="#000" transform="translate(1.4 2.8)" filter="url(#${R.blur(2)})" opacity="${cc.dark ? .6 : .42}"/>` +
      P(COL.ring, cc.b, ` stroke="${cc.line}" stroke-opacity=".55" stroke-width=".7"`) +
      (lite ? "" : ribs([152, 95, 170, 77, 230, 77, 248, 95], [166, 99, 182, 89, 218, 89, 234, 99], 25, cc.dark ? "#fff" : "#000", cc.dark ? .06 : .09, .5, Math.round)) +
      `<use href="#${lid}" fill="${cc.b}" stroke="${cc.line}" stroke-opacity=".6" stroke-width=".75"/>` +
      (lite ? "" : ribs2(A, Bc, 10, cc.dark ? "#fff" : "#000", cc.dark ? .06 : .085, .5, Math.round)) +
      L(both(J ? COL.jleafSt : COL.leafSt), cc.st, .6, ` stroke-opacity=".7" stroke-dasharray="1.8 1.3"`) +
      // the fold where each leaf rolls over from the stand catches the light
      L(both(`M167 99.6Q${J ? "178.6 113.4 193" : "181.4 111.5 196.6"} ${J ? 129.6 : 124.6}`), "#fff", 1.6, ` stroke-opacity="${cc.light ? .5 : .22}" stroke-linecap="round"`);
    const relief = `<g filter="url(#${R.blur(2.2)})">` + hf(J ? COL.jhole : COL.hole, "#000", .4) + hf(COL.stand, "#000", .15) +
      hf(COL.ring, "#fff", .14) + `<use href="#${lid}" fill="#fff" fill-opacity=".14"/>` +
      hr(both(`M167 100Q${J ? "178.5 113.5 193" : "181.5 111.6 197"} ${J ? 130 : 125}`), 3, .3) +
      (J ? "" : hf(`M189 124H211V${S.long ? 214 : 202}H189Z`, "#fff", .1)) + `</g>`;
    return { top, relief };
  }
  function collarBack(c, S, o) {
    const R = c.R, cc = cpal(S.collar);
    const top = `<path d="${COL.back}" fill="#000" transform="translate(.8 2.6)" filter="url(#${R.blur(2)})" opacity="${cc.dark ? .55 : .38}"/>` +
      P(COL.back, cc.b, ` stroke="${cc.line}" stroke-opacity=".55" stroke-width=".7"`) +
      (o.lite ? "" : ribs(COL.backTop, COL.backBot, 32, cc.dark ? "#fff" : "#000", cc.dark ? .06 : .085, .5, Math.round)) +
      L("M150.4 102C171 109.4 229 109.4 249.6 102", cc.st, .6, ` stroke-opacity=".7" stroke-dasharray="1.8 1.3"`) +
      L("M155.5 91.4C174 86.4 226 86.4 244.5 91.4", "#fff", 1.6, ` stroke-opacity="${cc.light ? .45 : .2}" stroke-linecap="round"`);
    const relief = `<g filter="url(#${R.blur(2.2)})">${hf(COL.back, "#fff", .14)}${hr("M155 91.6C174 86.6 226 86.6 245 91.6", 3, .3)}</g>`;
    return { top, relief };
  }

  /* ---------- the collared garment ---------- */
  function club(c, v, o) {
    const S = styleOf(c.p), R = c.R, k = c.k, back = v === "back";
    const f = p => `${r1(p[0])} ${r1(p[1])}`;
    let parts, relief, top = "", geo;
    const sp = S.stripes, cuffs = [];
    if (!S.long) {
      const t = tee(c, v, { ...o, noNeck: true, noCuff: true, over: undefined });
      const G = t.G, { S: Sh, C1, C2, A, ca, sa } = G;
      const ins = (p, d) => [p[0] + ca * d, p[1] - sa * d];
      parts = [t.parts[0]]; relief = t.relief;
      geo = { Sh, A, hem: G.hem, sx: G.sx, u: [-ca, sa], v: [sa, ca], len: Math.hypot(C1[0] - Sh[0], C1[1] - Sh[1]) };
      // rib cuff with tipping
      const band = `M${f(C1)}L${f(C2)}L${f(ins(C2, 12))}L${f(ins(C1, 12))}Z`;
      R.defs.push(`<path id="${k}cf" d="${both(band)}"/>`);
      let cuff = `<use href="#${k}cf" fill="${c.rib}"/><use href="#${k}cf" fill="url(#${ribPat(R, -Math.atan2(sa, ca) * 180 / Math.PI + 90, c.tone)})"/>`;
      S.tipping.forEach((col, i) => {
        const d = 2.8 + i * 2.6;
        if (col !== S.body) cuff += L(both(`M${f(ins(C1, d))}L${f(ins(C2, d))}`), col, 2.05);
      });
      cuff += L(both(`M${f(ins(C1, 12))}L${f(ins(C2, 12))}`), c.line, .8, ` stroke-opacity=".8"`);
      cuffs.push(cuff);
    } else {
      const hang = !!o.hang;
      const Sh = hang ? [94, 114] : [90, 108], A = hang ? [104, 204] : [101, 212], sx = A[0], hem = 398;
      const E1 = hang ? [72, 352] : [40, 334], E2 = hang ? [103, 358] : [86, 342];
      const K1 = hang ? [73.5, 386] : [43, 368], K2 = hang ? [101, 390] : [82.5, 375];
      const OB = hang ? [80, 232] : [57, 204], sm = [Sh[0] + 9, (Sh[1] + A[1]) / 2];
      const bl = [[158, 90, 3], [(158 + Sh[0]) / 2, (90 + Sh[1]) / 2 - 2, 40], [Sh[0], Sh[1], 8], [sm[0], sm[1], 60], [A[0], A[1], 4], [sx + .6, (A[1] + hem) / 2, 90], [sx, hem, 4]];
      const body = rpath([...bl, [200, hem + 3, 90], ...mirPts(bl), [200, 96.5, 40]]);
      const sl = [[Sh[0], Sh[1], 10], [OB[0], OB[1], 90], [E1[0], E1[1], 3], [E2[0], E2[1], 3], [A[0], A[1], 6], [sm[0] + .6, sm[1], 60]];
      const cf = [[E1[0] + .6, E1[1] - 1.5, 1], [E2[0] - .6, E2[1] - 1.5, 1], [K2[0], K2[1], 3], [K1[0], K1[1], 3]];
      parts = [body, rpath(sl), rpath(mirPts(sl)), { d: rpath(cf), f: c.rib }, { d: rpath(mirPts(cf)), f: c.rib }];
      const so = [(Sh[0] + A[0]) / 2, (Sh[1] + A[1]) / 2], ce = [(E1[0] + E2[0]) / 2, (E1[1] + E2[1]) / 2];
      const ax = [ce[0] - so[0], ce[1] - so[1]], al = Math.hypot(...ax), u = [ax[0] / al, ax[1] / al];
      geo = { Sh, A, hem, sx, u, v: [-u[1], u[0]], len: al, O: so, long: 1 };
      const ang = Math.atan2(u[1], u[0]) * 180 / Math.PI - 90;
      cuffs.push(`<use href="#${k}p3" fill="url(#${ribPat(R, ang, c.tone)})"/><use href="#${k}p4" fill="url(#${ribPat(R, -ang, c.tone)})"/>` +
        L(both(`M${f(E1)}L${f(E2)}`), c.line, .8, ` stroke-opacity=".8"`));
      st(c, both(`M${f(Sh)}Q${f([sm[0] + 3, sm[1]])} ${f([A[0] + 2.6, A[1] - 1.5])}`));
      // drape: broad soft folds on the body, a long ridge down each sleeve, creases at the elbow
      const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
      const crease = (t, a, b) => { const p0 = lerp(OB, E1, t), p1 = lerp(A, E2, t + .06); const q0 = lerp(p0, p1, a), q1 = lerp(p0, p1, b);
        return `M${f(q0)}Q${f([(q0[0] + q1[0]) / 2, (q0[1] + q1[1]) / 2 + 4])} ${f(q1)}`; };
      const flip = back ? ` transform="matrix(-1 0 0 1 400 0)"` : "";
      const dome = he(200, 252, 90, 118, "#fff", .26) + he(so[0] + u[0] * al * .45, so[1] + u[1] * al * .45, 14, 70, "#fff", .2, -ang) + he(400 - so[0] - u[0] * al * .45, so[1] + u[1] * al * .45, 14, 70, "#fff", .2, ang);
      const soft = hv(both(`M${A[0] + 4} ${A[1] + 12}Q${A[0] + 24} ${A[1] + 76} ${A[0] + 18} ${hem - 34}`), 16, .2) +
        hv("M98 330Q150 316 200 330Q250 344 304 326", 22, .12) + hr("M102 360Q150 348 202 360Q254 370 300 356", 20, .08) +
        hv("M268 152Q286 250 270 352", 18, .1) + hr("M136 160Q122 252 138 346", 20, .18) + hv("M168 150Q200 160 232 150", 10, .12) +
        hv(both(`M${f(lerp(A, E2, .08))}L${f(lerp(A, E2, .95))}`), 9, .2);
      const med = hv(both(crease(.52, .05, .7) + crease(.66, .25, .95)), 3.5, .22) + hv(both(crease(.8, .1, .6)), 3, .16) +
        hv(both(`M${f(lerp(K1, K2, .2))}L${f(lerp(E1, E2, .25))}M${f(lerp(K1, K2, .7))}L${f(lerp(E1, E2, .72))}`), 2.4, .16);
      const fine = `<g filter="url(#${R.blur(.9)})">` + hv(both(`M${f(Sh)}Q${f(sm)} ${f(A)}`), 1.6, c.dark ? .2 : .26) +
        hv(both(`M${f(E1)}L${f(E2)}`), 1.6, .32) + `</g>`;
      relief = `<g fill="none" stroke-linecap="round"><g filter="url(#${R.blur(18)})">${dome}</g><g filter="url(#${R.blur(10)})"><g${flip}>${soft}</g></g>` +
        `<g filter="url(#${R.blur(2.6)})"><g${flip}>${med}</g></g>${fine}</g>`;
    }
    parts.push({ d: back ? COL.back : COL.hull, f: S.collar });
    // hem: rib band for knits, else a stitched hem with side vents
    const { hem, sx } = geo;
    if (S.long && (S.knit === "rib" || S.knit === "waffle")) {
      const hb = `M${sx} ${hem - 24}Q200 ${hem - 21} ${400 - sx} ${hem - 24}L${400 - sx} ${hem}Q200 ${hem + 3} ${sx} ${hem}Z`;
      top += P(hb, c.rib) + `<path d="${hb}" fill="url(#${ribPat(R, 0, c.tone)})"/>` + L(`M${sx} ${hem - 24}Q200 ${hem - 21} ${400 - sx} ${hem - 24}`, c.line, .8, ` stroke-opacity=".8"`);
      relief += `<g filter="url(#${R.blur(.9)})">${hv(`M${sx} ${hem - 23.6}Q200 ${hem - 20.6} ${400 - sx} ${hem - 23.6}`, 2, .3)}</g>`;
    } else {
      const vx = sx + 1.4, vy = hem - 24;
      top += L(both(`M${vx} ${vy}L${vx + .6} ${hem + 1}`), c.line, 1, ` stroke-opacity=".9"`) +
        P(both(`M${vx - 1.2} ${vy - 1.6}H${vx + 3}V${vy + 1}H${vx - 1.2}Z`), c.dk2) + st(c, both(`M${vx + 3} ${vy + 1}L${vx + 3.5} ${hem - 2}`));
      if (S.long) st(c, `M${sx + .5} ${hem - 7}Q200 ${hem - 4} ${399.5 - sx} ${hem - 7}M${sx + .5} ${hem - 9.4}Q200 ${hem - 6.4} ${399.5 - sx} ${hem - 9.4}`);
      relief += `<g filter="url(#${R.blur(.8)})">${hv(both(`M${vx} ${vy}L${vx + .6} ${hem}`), 1.6, .4)}</g>`;
    }
    // yarn-dyed stripes, clipped to the body and to each sleeve (stacked round the arm)
    let under = "";
    if (sp) {
      const { Sh, A } = geo, sm = [Sh[0] + 9, (Sh[1] + A[1]) / 2];
      const half = `M-300 -300H${Sh[0]}V${Sh[1]}Q${f(sm)} ${f(A)}V900H-300Z`;
      const bodyR = `M${Sh[0]} -300H${400 - Sh[0]}V${Sh[1]}Q${f([400 - sm[0], sm[1]])} ${f([400 - A[0], A[1]])}V900H${A[0]}V${A[1]}Q${f(sm)} ${f(Sh)}Z`;
      R.defs.push(`<clipPath id="${k}cb"><path d="${bodyR}"/></clipPath><clipPath id="${k}cs"><path d="${half}"/><path d="${mir(half)}"/></clipPath>`);
      const bodyT0 = S.johnny ? 100 : 96;
      const bl = stripeMarks(stripeList(sp, sp.bands ? 112 : bodyT0, hem - 2, "body"), [200, 0], [0, 1], [1, 0], 230, t => 1.2 + Math.max(0, t - 200) * .012);
      const O = geo.O || Sh, sl = stripeMarks(stripeList(sp, sp.bands ? 0 : -30, geo.len + 10, "sleeve"), O, geo.u, geo.v, 90, () => 1.4);
      const draw = (arr, m) => arr.map(s => L(m ? s.d + mir(s.d) : s.d, s.col, s.w)).join("");
      under = `<g filter="url(#${yarnF(R)})"><g clip-path="url(#${k}cb)">${draw(bl)}</g><g clip-path="url(#${k}cs)">${draw(sl, 1)}</g></g>`;
    }
    top += cuffs.join("");
    if (back) {
      const cb = collarBack(c, S, o);
      top += cb.top; relief += cb.relief;
    } else {
      const cf = collarFront(c, S, o), gr = graphicArt(c, S, 1, o.zoom);
      top += gr.top + cf.top; relief += cf.relief + gr.relief;
    }
    return { parts, under, top, relief: `<g fill="none" stroke-linecap="round">${relief}</g>`, edge: [9, .22] };
  }

  /* ---------- the collared garment, retail-folded: chest panel, collar and placket ---------- */
  function clubFolded(c, v, o) {
    const S = styleOf(c.p), R = c.R, k = c.k, x0 = 118, x1 = 282, y1 = 292;
    const left = [[158, 90, 3], [138, 93.5, 24], [x0, 97, 6], [x0 - .8, 196, 120], [x0 + .4, y1, 6]];
    const body = rpath([...left, [200, y1 + 1.2, 90], ...mirPts(left), [200, 96.5, 40]]);
    const dome = he(200, 200, 66, 88, "#fff", .2), soft = hv("M120 206Q200 196 280 208", 22, .1) +
      hr(both(`M${x0 + 15} 112Q${x0 + 12} 200 ${x0 + 16} ${y1 - 14}`), 12, .15) +
      hv(both(`M${x0 + 28} 120Q${x0 + 25} 200 ${x0 + 30} ${y1 - 24}`), 8, .12) +
      hr(`M${x0 + 16} ${y1 - 12}Q200 ${y1 - 8} ${x1 - 16} ${y1 - 12}`, 10, .24);
    const med = hv(both("M156 101Q139 107 122 104"), 4, .14) + hv("M150 266Q175 258 196 268", 4, .1);
    let under = "";
    if (S.stripes) {
      const bl = stripeMarks(stripeList(S.stripes, S.stripes.bands ? 112 : 96, 392, "body"), [200, 0], [0, 1], [1, 0], 120, () => 1);
      under = `<g filter="url(#${yarnF(R)})">${bl.map(s => L(s.d, s.col, s.w)).join("")}</g>`;
    }
    const cf = collarFront(c, S, o), G = S.graphic, gr = G ? graphicArt(c, S, G.large ? .84 : 1, o.zoom) : { top: "", relief: "" };
    return {
      parts: [body, { d: COL.hull, f: S.collar }], under, top: gr.top + cf.top, edge: [12, .26],
      relief: `<g fill="none" stroke-linecap="round"><g filter="url(#${R.blur(16)})">${dome}</g><g filter="url(#${R.blur(7)})">${soft}</g><g filter="url(#${R.blur(2.6)})">${med}</g>${cf.relief}${gr.relief}</g>`
    };
  }
  // close-up framing for the detail view / detail scenes: [view, cx, cy, visible width]
  function clubFocus(p, part) {
    const S = styleOf(p), gp = graphicPos(S);
    if (part === "collar") return ["front", 200, 122, 118];
    if (part === "placket") return S.johnny ? ["front", 200, 146, 96] : ["front", 200, S.long ? 170 : 160, 88];
    if (part === "knit") return ["front", 140, 330, 60];
    if (part === "graphic" && gp) return ["front", gp.x, gp.y + (S.graphic.sub && S.graphic.large ? 9 : 2), gp.w * (S.graphic.large ? 1.02 : 1.6)];
    if (part === "graphic" || part === "back") return ["back", 200, 120, 130];
    const big = gp && S.graphic.large;
    return ["front", gp && !big ? 222 : 204, big ? 184 : 150, big ? 178 : 150];
  }

  /* =========================================================
     LIGHTING — shared filters, created once per SVG
     ========================================================= */
  // per-tone gains: shadows read on light cloth, sheen reads on black — but black stays black
  const TONE = {
    l: { g: 5.5, gs: .78, gh: .5, grain: .016, wash: .02, lg: [.06, .07] },
    m: { g: 5.5, gs: .95, gh: .55, grain: .022, wash: .045, lg: [.06, .08] },
    d: { g: 5.5, gs: .7, gh: .5, grain: .026, wash: .04, lg: [.035, .1] }
  };
  // height map (luminance) -> blur -> + grain -> directional emboss (light from top-left, in user units,
  // so it looks identical at any render size) -> split into a dark (shadow) and a light (sheen) layer
  function shadeFilter(id, tone) {
    const t = TONE[tone] || TONE.m;
    return `<filter id="${id}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">` +
      `<feColorMatrix in="SourceGraphic" type="luminanceToAlpha" result="h"/>` +
      `<feGaussianBlur in="h" stdDeviation="1" result="hb"/>` +
      `<feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="2" seed="3" result="g"/>` +
      `<feColorMatrix in="g" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0" result="ga"/>` +
      `<feComposite in="hb" in2="ga" operator="arithmetic" k2="1" k3="${t.grain}" k4="${-t.grain / 2}" result="hh"/>` +
      `<feOffset in="hh" dx="-1.3" dy="-1.7" result="a"/><feOffset in="hh" dx="1.3" dy="1.7" result="b"/>` +
      `<feComposite in="a" in2="b" operator="arithmetic" k2="${t.g}" k3="${-t.g}" k4=".5" result="e0"/>` +
      `<feTurbulence type="fractalNoise" baseFrequency=".016 .022" numOctaves="2" seed="9" result="w"/>` +
      `<feColorMatrix in="w" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0" result="wa"/>` +
      `<feComposite in="e0" in2="wa" operator="arithmetic" k2="1" k3="${t.wash}" k4="${-t.wash / 2}" result="e"/>` +
      `<feColorMatrix in="e" type="matrix" values="0 0 0 0 .07 0 0 0 0 .06 0 0 0 0 .05 0 0 0 ${-t.gs} ${t.gs / 2}" result="sd"/>` +
      `<feColorMatrix in="e" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 ${t.gh} ${-t.gh / 2}" result="hl"/>` +
      `<feMerge><feMergeNode in="sd"/><feMergeNode in="hl"/></feMerge></filter>`;
  }
  // printed ink: edges very slightly broken + uneven density where the ink soaked into the knit
  const inkFilter = id => `<filter id="${id}" x="-3%" y="-3%" width="106%" height="106%" color-interpolation-filters="sRGB">` +
    `<feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="2" seed="11" result="n"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="n" scale=".55" xChannelSelector="R" yChannelSelector="G" result="d"/>` +
    `<feTurbulence type="fractalNoise" baseFrequency=".45" numOctaves="3" seed="5" result="m"/>` +
    `<feColorMatrix in="m" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -.45 0 0 1.17" result="ma"/>` +
    `<feComposite in="d" in2="ma" operator="in"/></filter>`;
  // embroidery: solid thread with fine directional sheen
  const threadFilter = id => `<filter id="${id}" x="-3%" y="-3%" width="106%" height="106%" color-interpolation-filters="sRGB">` +
    `<feTurbulence type="fractalNoise" baseFrequency="1.8 .4" numOctaves="2" seed="21" result="n"/>` +
    `<feColorMatrix in="n" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 1.6 0 0 0 -.66" result="w"/>` +
    `<feComposite in="w" in2="SourceGraphic" operator="in" result="ws"/>` +
    `<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="ws"/></feMerge></filter>`;

  /* ---------- per-SVG registry: unique ids + shared defs ---------- */
  function reg(W = 500, H = 700) {
    const k = nextId(), defs = [], have = {};
    let n = 0;
    const R = { k, defs, W, H };
    R.sub = () => k + (n++).toString(36);
    R.once = (name, build) => { if (!have[name]) { have[name] = k + "_" + name; defs.push(build(have[name])); } return have[name]; };
    const nm = v => String(v).replace(".", "d").replace("-", "m");
    // blur in garment drawing space (fixed generous region so thin groups never get clipped)
    const SNAP = [.9, 2.2, 3.5, 5, 8, 16];
    R.blur = s => (s = SNAP.reduce((a, b) => Math.abs(b - s) < Math.abs(a - s) ? b : a), R.once("b" + nm(s), id => `<filter id="${id}" filterUnits="userSpaceOnUse" x="-120" y="-120" width="640" height="760"><feGaussianBlur stdDeviation="${s}"/></filter>`));
    // blur in scene space
    R.sblur = s => R.once("sb" + nm(s), id => `<filter id="${id}" filterUnits="userSpaceOnUse" x="${-W * .2}" y="${-H * .2}" width="${W * 1.4}" height="${H * 1.4}"><feGaussianBlur stdDeviation="${s}"/></filter>`);
    R.shade = tone => R.once("sh" + tone, id => shadeFilter(id, tone));
    R.ink = () => R.once("ink", inkFilter);
    R.thread = () => R.once("thr", threadFilter);
    R.whiten = a => R.once("wh" + nm(a), id => `<filter id="${id}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 ${a} 0"/></filter>`);
    // jersey knit (only drawn when zoomed in): columns of V loops
    R.knit = tone => R.once("kn" + tone, id => `<pattern id="${id}" width=".9" height=".72" patternUnits="userSpaceOnUse">` +
      `<path d="M.08 .05L.45 .67L.82 .05" fill="none" stroke="#fff" stroke-opacity="${tone === "d" ? .07 : .13}" stroke-width=".22"/>` +
      `<path d="M0 0V.72" stroke="#000" stroke-opacity="${tone === "d" ? .4 : .15}" stroke-width=".12"/></pattern>`);
    R.weave = () => R.once("wv", id => `<pattern id="${id}" width=".6" height=".55" patternUnits="userSpaceOnUse"><path d="M0 .27H.6" stroke="#000" stroke-opacity=".1" stroke-width=".16"/><path d="M.3 0V.55" stroke="#fff" stroke-opacity=".25" stroke-width=".1"/></pattern>`);
    // soft key light falling across one garment (top-left brighter, lower-right deeper)
    R.light = tone => R.once("lt" + tone, id => { const g = (TONE[tone] || TONE.m).lg;
      return `<linearGradient id="${id}" x1="60" y1="70" x2="340" y2="430" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="${g[0]}"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${g[1]}"/></linearGradient>`; });
    return R;
  }

  /* =========================================================
     LAYER — one garment: shadow, cloth, ink, details, light
     o: { shadow: flat|thick|wall|none, zoom, region:[x,y,w,h], lite, hang, …variant flags }
     ========================================================= */
  const DRAW = { tee, folded: teeFolded, polo: club, rugby: club, knitpolo: club, clubFolded, shirt, camp, kurta, hoodie, jacket, pants, shorts: (c, v, o) => pants(c, v, { ...o, shorts: true }) };
  function layer(p, shape, view, R, o = {}) {
    const k = R.sub(), c = ctx(p, k, R);
    const tex = TEX[c.fab] ? TEX[c.fab](k + "t", c) : "";
    c.texOn = !!tex;
    const g = DRAW[shape](c, view, o);
    const parts = g.parts.map(x => typeof x === "string" ? { d: x } : x);
    const uses = f => parts.map((x, i) => `<use href="#${k}p${i}"${f ? f(x) : ""}/>`).join("");
    // print: drawn under the lighting so folds and knit run across the ink
    const pr = printsOf(p), side = view === "back" ? "back" : "front", name = pr[side], pl = PLACE[g.place || shape];
    let ink = "", inkRelief = "";
    if (pl && name) {
      const [x, y, s] = name === "logo" ? (side === "back" ? pl.backLogo || [200, 132, .12] : pl.logo) : side === "back" ? pl.back : pl.chest;
      const tech = techOf(p, side, name);
      ink = `<g filter="url(#${tech === "emb" ? R.thread() : R.ink()})"${tech === "emb" ? "" : ` opacity="${c.dark ? .93 : .95}"`}>` +
        `<g id="${k}pr" transform="translate(${x} ${y}) scale(${s}) translate(-200 -200)">${PRINTS[name](inks(c.base), k + "q", side)}</g></g>`;
      inkRelief = `<use href="#${k}pr" filter="url(#${R.whiten(tech === "puff" ? .17 : tech === "emb" ? .3 : .04)})"/>`;
    }
    const relief = g.relief || `<g fill="none" filter="url(#${R.blur(3.5)})">${g.folds}${g.folds}${g.hl || ""}</g>`;
    const [ew, eo] = g.edge || [10, .3];
    const rg = o.region || [-20, 20, 440, 500], rect = `x="${r1(rg[0])}" y="${r1(rg[1])}" width="${r1(rg[2])}" height="${r1(rg[3])}"`;
    // one reusable group of every part (shadows, edge light, outline); clipPath needs the shapes themselves
    const all = parts.length > 1 ? `<use href="#${k}a"/>` : uses();
    R.defs.push(parts.map((x, i) => `<path id="${k}p${i}" d="${x.d}"/>`).join("") + `<clipPath id="${k}c">${uses()}</clipPath>` +
      (parts.length > 1 ? `<g id="${k}a">${all}</g>` : "") +
      tex + (g.top.includes(`#${k}B`) ? `<defs>${unitButton(k)}</defs>` : ""));
    const sc = "#2c2722", sm = o.shadow || "flat";
    const shadow = sm === "none" ? ""
      : sm === "wall" ? `<g transform="translate(15 11)" fill="${sc}" opacity=".16" filter="url(#${R.blur(9)})">${all}</g>`
      : sm === "thick" ? `<g transform="translate(4 8)" fill="${sc}" opacity=".24" filter="url(#${R.blur(9)})">${all}</g><g transform="translate(1.4 2.8)" fill="${sc}" opacity=".3" filter="url(#${R.blur(2.4)})">${all}</g>`
      : `<g transform="translate(2.5 6)" fill="${sc}" opacity="${c.light ? .2 : .16}" filter="url(#${R.blur(8)})">${all}</g><g transform="translate(.8 2)" fill="${sc}" opacity="${c.light ? .26 : .2}" filter="url(#${R.blur(2)})">${all}</g>`;
    return shadow +
      `<g fill="${c.base}">${uses(x => x.f ? ` fill="${x.f}"` : "")}</g>` +
      `<g clip-path="url(#${k}c)">` +
      (g.under || "") + (tex ? `<rect ${rect} fill="url(#${k}t)"/>` : "") + ink + g.top +
      (o.zoom && (c.fab === "jersey" || c.fab === "kjersey") ? `<rect ${rect} fill="url(#${R.knit(c.tone)})"/>` : "") +
      `<g filter="url(#${R.shade(c.tone)})"><rect ${rect} fill="#808080"/>` +
      `<g fill="none" stroke="#000" stroke-opacity="${eo}" stroke-width="${ew}" filter="url(#${R.blur(3.5)})">${all}</g>` +
      relief + inkRelief + `</g>` +
      `<rect ${rect} fill="url(#${R.light(c.tone)})"/>` +
      (c.sts.length ? L(c.sts.join(""), c.stitch, .7, ` stroke-opacity=".55" stroke-dasharray="2.2 1.5" stroke-linecap="round"`) : "") +
      `</g>` +
      (c.light ? `<g fill="none" stroke="${shade(c.base, -.22)}" stroke-opacity=".4" stroke-width=".6">${all}</g>` : "");
  }

  /* ---------- registry + variant detection ---------- */
  function variant(p) {
    const s = `${p.id || ""} ${p.name || ""} ${p.fit || ""} ${p.fabric || ""}`;
    return {
      over: /oversiz|drop|boxy/i.test(s), bd: /oxford|button-down/i.test(s), formal: /formal|wrinkle/i.test(s),
      short: /short kurta|short-kurta/i.test(s), zip: /zip/i.test(s), slim: /slim|taper/i.test(s),
      relaxed: /relaxed|straight/i.test(s), jogger: /jogger|track/i.test(s), cargo: /cargo/i.test(s),
      track: /track/i.test(s), crease: /formal|suiting/i.test(s)
    };
  }
  const shapeOf = p => (DRAW[p.shape] && p.shape !== "folded" && p.shape !== "clubFolded") || p.shape === "coord" ? p.shape : "tee";
  // framing key: collared garments frame by sleeve length; any top can be retail-folded
  const frameKey = (p, view) => view === "folded" ? (isClub(p) ? "clubF" : "folded") : isClub(p) ? (styleOf(p).long ? "clubL" : "clubS") : shapeOf(p);
  const foldShape = p => isClub(p) ? "clubFolded" : "folded";
  // coord set = camp shirt + drawstring trousers laid side by side
  function coordBody(p, view, R, o) {
    const a = layer(p, "camp", view, R, { ...o });
    const b = layer(p, "pants", view, R, { ...o, draw: true, relaxed: true });
    return `<g transform="translate(161 66) scale(.7) rotate(2 200 260)">${b}</g><g transform="translate(-21 80) scale(.7) rotate(-2 200 250)">${a}</g>`;
  }
  function bodyFor(p, view, R, o = {}) {
    const shape = shapeOf(p);
    return shape === "coord" ? coordBody(p, view, R, o) : layer(p, shape, view, R, { ...variant(p), ...o });
  }
  // how each drawing is framed in the 500×700 packshot: [drawing cx, drawing cy, scale, frame cy]
  const FR = {
    tee: [200, 242, .95, 346], folded: [200, 192, 2.12, 350], clubS: [200, 242, 1.02, 350], clubL: [200, 240, 1.15, 350], clubF: [200, 194, 1.92, 350], polo: [200, 242, 1.2, 350], shirt: [200, 234, 1.13, 350],
    camp: [200, 243, 1.15, 350], kurta: [200, 263, 1.1, 352], hoodie: [200, 232, 1.15, 350], jacket: [200, 245, 1.14, 350],
    pants: [200, 261, 1.2, 352], shorts: [200, 228, 1.45, 350], coord: [200, 250, 1.15, 350]
  };
  const frameT = key => { const f = FR[key] || FR.tee; return `translate(250 ${f[3]}) scale(${f[2]}) translate(-200 ${-f[1]})`; };

  /* ---------- light studio backdrop: seamless #f4f3f1 with a whisper of falloff ---------- */
  function backdrop(R) {
    const v = R.once("bgv", id => `<radialGradient id="${id}" cx="250" cy="300" r="560" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".045"/></radialGradient>`);
    const fl = R.once("bgf", id => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="700" gradientUnits="userSpaceOnUse"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".035"/></linearGradient>`);
    return `<rect x="-250" y="-350" width="1000" height="1400" fill="#f4f3f1"/><rect x="-250" y="-350" width="1000" height="1400" fill="url(#${v})"/><rect x="-250" y="-350" width="1000" height="1400" fill="url(#${fl})"/>`;
  }
  const svgOpen = (label, vb) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" role="img" aria-label="${escA(label)}">`;
  const svgOut = (label, vb, R, body) => svgOpen(label, vb) + `<defs>${R.defs.join("")}</defs>` + body + `</svg>`;

  // legacy close-up focus per shape (drawing space): [cx, cy, visible width]
  const FOCUS = { polo: [200, 144, 180], shirt: [214, 150, 190], camp: [214, 160, 190], kurta: [200, 136, 175], hoodie: [200, 150, 200],
    jacket: [212, 140, 200], pants: [196, 122, 200], shorts: [196, 170, 200], coord: [121, 168, 155] };
  // detail view: macro on the hero graphic + woven label, else on the neck + chest mark
  function detailPlan(p) {
    const shape = shapeOf(p), pr = printsOf(p);
    if (shape !== "tee") { const f = FOCUS[shape] || FOCUS.polo; return { view: "front", fx: f[0], fy: f[1], w: f[2] }; }
    if (pr.back && pr.back !== "logo") return { view: "back", fx: 200, fy: 180, w: 168 };
    if (pr.front && pr.front !== "logo") return { view: "front", fx: 200, fy: 160, w: 150 };
    if (pr.front === "logo") return { view: "front", fx: 222, fy: 138, w: 120 };
    return { view: "front", fx: 212, fy: 132, w: 130 };
  }

  /* ---------- public: single garment packshot ---------- */
  const VIEWS = ["front", "back", "detail", "folded"];
  function garment(p, opts = {}) {
    p = p || {};
    const bg = opts.bg !== false, view = VIEWS.includes(opts.view) ? opts.view : "front";
    const R = reg(), shape = shapeOf(p), club = isClub(p);
    let art, label = p.name || "Garment";
    if (view === "detail") {
      let v, fx, fy, w;
      if (club) [v, fx, fy, w] = clubFocus(p, opts.part);
      else ({ view: v, fx, fy, w } = detailPlan(p));
      const Z = 500 / w, h = w * 1.4;
      const L1 = shape === "coord" ? coordBody(p, v, R, { zoom: true }) : bodyFor(p, v, R, { zoom: true, region: [fx - w / 2 - 14, fy - h / 2 - 14, w + 28, h + 28] });
      art = `<g transform="translate(250 350) scale(${r2(Z)}) translate(${-fx} ${-fy})">${L1}</g>`;
      label += club ? ` (close-up${opts.part ? ": " + opts.part : ""})` : " (close-up)";
    } else if (view === "folded" && (shape === "tee" || club)) {
      art = `<g transform="${frameT(frameKey(p, "folded"))}">${layer(p, foldShape(p), "front", R, { ...variant(p), shadow: "thick" })}</g>`;
      label += " (folded)";
    } else {
      const v = view === "back" ? "back" : "front";
      art = `<g transform="${frameT(frameKey(p, v))}">${bodyFor(p, v, R)}</g>`;
      if (v === "back") label += " (back view)";
    }
    return svgOut(label, "0 0 500 700", R, (bg ? backdrop(R) : "") + art);
  }

  /* ---------- public: just the graphic (400×400, transparent) ---------- */
  function print(name, opts = {}) {
    const fn = PRINTS[name], k = nextId();
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet" width="100%" height="100%" role="img" aria-label="${escA((name || "Blank") + " print")}">` +
      (fn ? fn(inks(opts.color || "#141414"), k, opts.side === "front" ? "front" : "back") : "") + `</svg>`;
  }

  /* ---------- public: outfit flat-lay (top over bottom) ---------- */
  function outfit(top, bottom, opts = {}) {
    if (!bottom) return garment(top, opts);
    if (!top) return garment(bottom, opts);
    const bg = opts.bg !== false, R = reg();
    const b = bodyFor(bottom, "front", R), t = bodyFor(top, "front", R);
    const longTop = top.shape === "kurta" || top.shape === "jacket" || top.shape === "hoodie";
    const bShorts = bottom.shape === "shorts", tTee = shapeOf(top) === "tee";
    const bt = bShorts ? "translate(96 169) scale(.52) rotate(3 200 240)" : "translate(80 186) scale(.6) rotate(3 200 260)";
    const tt = tTee ? "translate(62 -10) scale(.69) rotate(-3 200 236)" : `translate(${longTop ? 66 : 68} ${longTop ? -8 : 2}) scale(${longTop ? .67 : .66}) rotate(-3 200 250)`;
    return svgOut(`Outfit: ${top.name || ""} with ${bottom.name || ""}`, "0 0 500 700", R,
      (bg ? backdrop(R) : "") + `<g transform="translate(10 50) scale(1.2)"><g transform="${bt}">${b}</g><g transform="${tt}">${t}</g></g>`);
  }

  /* ---------- public: colour swatch (reads on the white UI) ---------- */
  function swatch(color) {
    const k = nextId(), base = normHex(color), lum = luma(base);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">` +
      `<defs><radialGradient id="${k}s" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></radialGradient>` +
      `<pattern id="${k}t" width="2" height="2" patternUnits="userSpaceOnUse"><path d="M0 0L.5 1L1 0M1 1L1.5 2L2 1" fill="none" stroke="#000" stroke-opacity=".1" stroke-width=".35"/></pattern></defs>` +
      `<circle cx="12" cy="12" r="11" fill="${base}"/><circle cx="12" cy="12" r="11" fill="url(#${k}t)"/><circle cx="12" cy="12" r="11" fill="url(#${k}s)"/>` +
      `<circle cx="12" cy="12" r="10.6" fill="none" stroke="#000" stroke-opacity="${lum > .8 ? .2 : .08}" stroke-width=".8"/></svg>`;
  }

  /* =========================================================
     CAMPAIGN SCENES — editorial stills for big image slots
     ========================================================= */
  const RATIOS = { "16:9": [1600, 900], "4:5": [1000, 1250], "3:4": [960, 1280], "1:1": [1100, 1100], "21:9": [2100, 900] };
  // fallback drop (only if PRODUCTS is missing): plain collared classics
  const DEFAULT_DROP = [["#1f4a33", "#f1ece0", "polo"], ["#1c2238", "#f4f1ea", "rugby"], ["#d4838a", "#f7f5f0", "polo"], ["#ddb12f", "#ddb12f", "knitpolo"], ["#f2f0ea", "#f2f0ea", "rugby"], ["#a3222b", "#f4f1ea", "polo"]]
    .map(([body, collar, shape], i) => ({ id: "drop-" + i, shape, color: body, style: { body, collar }, techniques: [] }));
  // the drop's tops, in catalogue order (collared shapes and tees; bottoms are left out)
  function dropTees(n = 6) {
    const all = typeof PRODUCTS !== "undefined" && Array.isArray(PRODUCTS) ? PRODUCTS : [];
    const list = all.filter(p => p && (isClub(p) || shapeOf(p) === "tee"));
    return (list.length ? list : DEFAULT_DROP).slice(0, n);
  }
  const findProduct = id => (typeof PRODUCTS !== "undefined" && Array.isArray(PRODUCTS) ? PRODUCTS : []).find(p => p && p.id === id);
  // the side worth showing: collared shirts sell on the front; a tee's big back graphic beats a small chest mark
  const heroSide = p => { if (isClub(p)) return "front"; const pr = printsOf(p); return pr.front && pr.front !== "logo" ? "front" : pr.back ? "back" : "front"; };

  // one garment placed in scene space (centre x,y · scale · rotation)
  function put(R, p, view, x, y, s, rot, o = {}) {
    const key = frameKey(p, view), f = FR[key] || FR.tee;
    const body = view === "folded" ? layer(p, foldShape(p), "front", R, { ...variant(p), ...o }) : bodyFor(p, view, R, o);
    return `<g transform="translate(${r1(x)} ${r1(y)})${rot ? ` rotate(${rot})` : ""} scale(${r2(s)}) translate(-200 ${-f[1]})">${body}</g>`;
  }

  // a neutral surface seen from above: base, low-frequency mottling, soft window light, vignette
  function surface(R, col, o = {}) {
    const { W, H } = R;
    const mot = R.once("mot", id => `<filter id="${id}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">` +
      `<feTurbulence type="fractalNoise" baseFrequency=".0016 .0024" numOctaves="2" seed="4" result="n"/>` +
      `<feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -.14 0 0 0 .07" result="d"/>` +
      `<feColorMatrix in="n" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 .2 0 0 0 -.1" result="l"/>` +
      `<feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="1" seed="8" result="f"/>` +
      `<feColorMatrix in="f" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -.06 0 0 0 .033" result="fd"/>` +
      `<feMerge><feMergeNode in="d"/><feMergeNode in="l"/><feMergeNode in="fd"/></feMerge></filter>`);
    const lg = R.once("slg", id => `<linearGradient id="${id}" x1="0" y1="0" x2="${W}" y2="${H}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="${o.light ?? .3}"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".07"/></linearGradient>`);
    const vg = R.once("svg", id => `<radialGradient id="${id}" cx="${W / 2}" cy="${H / 2}" r="${Math.max(W, H) * .72}" gradientUnits="userSpaceOnUse"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".09"/></radialGradient>`);
    const box = `width="${W}" height="${H}"`;
    return `<rect ${box} fill="${col}"/><rect ${box} filter="url(#${mot})"/><rect ${box} fill="url(#${lg})"/><rect ${box} fill="url(#${vg})"/>`;
  }
  // sunlight through a window blind, falling across everything (drawn last)
  function blinds(R, ang = 28, o = .06) {
    const { W, H } = R, D = Math.hypot(W, H);
    const pt = R.once("bld", id => `<pattern id="${id}" width="120" height="120" patternUnits="userSpaceOnUse" patternTransform="rotate(${ang})"><rect width="120" height="46" fill="#1c1712"/></pattern>`);
    return `<g opacity="${o}" filter="url(#${R.sblur(Math.round(Math.max(W, H) * .012))})"><rect x="${r1(W / 2 - D)}" y="${r1(H / 2 - D)}" width="${r1(D * 2)}" height="${r1(D * 2)}" fill="url(#${pt})"/></g>`;
  }
  // a room: plaster wall with window light + floor
  function room(R, floorY) {
    const { W, H } = R;
    const wall = R.once("wall", id => `<linearGradient id="${id}" x1="0" y1="0" x2="${W}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f2eee7"/><stop offset=".55" stop-color="#ece7df"/><stop offset="1" stop-color="#e2dcd2"/></linearGradient>`);
    const fl = R.once("floor", id => `<linearGradient id="${id}" x1="0" y1="${floorY}" x2="0" y2="${H}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#d3cbbf"/><stop offset="1" stop-color="#ddd6cb"/></linearGradient>`);
    const mot = R.once("mot2", id => `<filter id="${id}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".002 .003" numOctaves="2" seed="12" result="n"/>` +
      `<feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -.1 0 0 0 .05"/></filter>`);
    const x0 = W * .06, x1 = W * .44, sk = (floorY) * .32;
    const pane = (a, b) => `M${r1(a)} -20L${r1(b)} -20L${r1(b + sk)} ${r1(floorY)}L${r1(a + sk)} ${r1(floorY)}Z`;
    const mull = (x0 + x1) / 2;
    return `<rect width="${W}" height="${floorY}" fill="url(#${wall})"/><rect width="${W}" height="${floorY}" filter="url(#${mot})"/>` +
      // window light + mullion shadow on the wall
      `<g filter="url(#${R.sblur(Math.round(W * .02))})"><path d="${pane(x0, x1)}" fill="#fffaf2" opacity=".5"/>` +
      `<path d="${pane(mull - W * .012, mull + W * .012)}" fill="#e3ddd3" opacity=".9"/></g>` +
      `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="url(#${fl})"/>` +
      `<rect y="${floorY - 3}" width="${W}" height="9" fill="#e8e2d8"/><rect y="${floorY + 6}" width="${W}" height="10" fill="#000" opacity=".07" filter="url(#${R.sblur(4)})"/>` +
      // light continuing onto the floor
      `<path d="M${r1(x0 + sk)} ${floorY}L${r1(x1 + sk)} ${floorY}L${r1(x1 + sk * 1.9)} ${H}L${r1(x0 + sk * 1.6)} ${H}Z" fill="#fff8ee" opacity=".22" filter="url(#${R.sblur(Math.round(W * .02))})"/>`;
  }

  /* ---- flat lay: the whole drop laid out in two loose rows (or three, on tall frames) ---- */
  const FLAT = {
    "16:9": [.98, [[290, 240, -3], [800, 228, 2], [1310, 246, -2], [325, 660, 2], [835, 668, -2], [1340, 652, 3]]],
    "21:9": [.98, [[470, 240, -3], [1050, 228, 2], [1630, 246, -2], [500, 660, 2], [1075, 668, -2], [1655, 652, 3]]],
    "1:1":  [.86, [[300, 210, -3], [800, 220, 3], [295, 555, 2], [805, 548, -2], [300, 895, -2], [800, 888, 2]]],
    "4:5":  [.94, [[270, 232, -3], [732, 242, 3], [268, 628, 2], [735, 620, -2], [272, 1020, -2], [730, 1012, 2]]],
    "3:4":  [.92, [[258, 240, -3], [702, 250, 3], [256, 642, 2], [705, 634, -2], [260, 1040, -2], [700, 1032, 2]]]
  };
  function flatlay(R, ratio) {
    const [s, pts] = FLAT[ratio], tops = dropTees(6), n = tops.length;
    const at = n < 6 ? pts.filter((q, i) => i < n) : pts;
    return surface(R, "#ebe8e3") + tops.map((p, i) => {
      const [x, y, rot] = at[i];
      return put(R, p, heroSide(p), x, y, s * (1 - (i % 2) * .02), rot, { lite: true });
    }).join("") + blinds(R, 28, .035);
  }

  /* ---- rail: shirts on hangers, minimal metal rail, window light ---- */
  const RAIL = {
    "16:9": { s: 1.3, gap: 375, y: 150, floor: 820, n: 4 },
    "21:9": { s: 1.3, gap: 390, y: 150, floor: 820, n: 5 },
    "1:1":  { s: 1.2, gap: 365, y: 250, floor: 985, n: 3 },
    "4:5":  { s: 1.5, gap: 475, y: 330, floor: 1115, n: 2 },
    "3:4":  { s: 1.46, gap: 460, y: 345, floor: 1145, n: 2 }
  };
  function rail(R, ratio) {
    const { W } = R, c = RAIL[ratio], tops = dropTees(c.n), n = tops.length;
    const xs = tops.map((p, i) => W / 2 + (i - (n - 1) / 2) * c.gap);
    const a = xs[0] - c.gap * 1.1, b = xs[n - 1] + c.gap * 1.1, y = c.y, fy = c.floor;
    const metal = "#2e2d2b", hl = "#77736c";
    const sh = `<g opacity=".13" filter="url(#${R.sblur(5)})" fill="#2a241d"><rect x="${r1(a + 16)}" y="${y + 9}" width="${r1(b - a)}" height="7"/>` +
      `<rect x="${r1(a + 14)}" y="${y + 10}" width="7" height="${fy - y - 10}"/><rect x="${r1(b + 14)}" y="${y + 10}" width="7" height="${fy - y - 10}"/></g>`;
    const frame = `<rect x="${r1(a - 3.5)}" y="${y}" width="7" height="${fy - y + 6}" fill="${metal}"/><rect x="${r1(b - 3.5)}" y="${y}" width="7" height="${fy - y + 6}" fill="${metal}"/>` +
      `<rect x="${r1(a - 60)}" y="${fy + 2}" width="120" height="7" rx="2" fill="${metal}"/><rect x="${r1(b - 60)}" y="${fy + 2}" width="120" height="7" rx="2" fill="${metal}"/>` +
      `<ellipse cx="${r1(a + 6)}" cy="${fy + 10}" rx="80" ry="7" fill="#000" opacity=".16" filter="url(#${R.sblur(5)})"/><ellipse cx="${r1(b + 6)}" cy="${fy + 10}" rx="80" ry="7" fill="#000" opacity=".16" filter="url(#${R.sblur(5)})"/>` +
      `<rect x="${r1(a - 6)}" y="${y - 4}" width="${r1(b - a + 12)}" height="8" rx="4" fill="${metal}"/><rect x="${r1(a - 4)}" y="${y - 3}" width="${r1(b - a + 8)}" height="1.6" fill="${hl}" opacity=".7"/>`;
    // hook drawn in garment space: rail line sits at drawing y = 40, the hook disappears into the collar
    const hook = `<path d="M200 82V70C200 60 210.5 58 210.5 47.5C210.5 40 205.5 35.6 200 35.6C194.5 35.6 190.5 39.5 190.5 44.5" fill="none" stroke="#8f8b84" stroke-width="2.2" stroke-linecap="round"/>` +
      `<path d="M201 80V71C201 61.5 211.4 59 211.4 48" fill="none" stroke="#d6d2ca" stroke-width=".7" stroke-linecap="round"/>`;
    const tee = tops.map((p, i) => {
      const s = c.s, ty = y + (242 - 40) * s, rot = [-.6, .5, -.3, .7, -.4, .4][i % 6];
      return `<g transform="translate(${r1(xs[i])} ${r1(ty)}) rotate(${rot}) scale(${s}) translate(-200 -242)">` + hook +
        layer(p, shapeOf(p), "front", R, { ...variant(p), hang: true, shadow: "wall", lite: true }) + `</g>`;
    }).join("");
    return room(R, fy) + sh + frame + tee +
      `<path d="M0 0H${W}V${fy}H0Z" fill="url(#${R.once("rl", id => `<linearGradient id="${id}" x1="0" y1="0" x2="${W}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff6ea" stop-opacity=".08"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".05"/></linearGradient>`)})"/>`;
  }

  /* ---- stack: the drop folded and stacked, seen from above — each shirt peeks out below the next ---- */
  const STACK = { "16:9": [.6, .5, .78], "21:9": [.6, .5, .78], "1:1": [.5, .5, .76], "4:5": [.5, .5, .64], "3:4": [.5, .5, .62] };
  function stack(R, ratio) {
    const { W, H } = R, [fx, fy, fh] = STACK[ratio], tops = dropTees(6), n = tops.length;
    const step = 28, tall = 206 + step * (n - 1), s = Math.min(H * fh / tall, W * .62 / 170);
    const cx = W * fx, cy = H * fy, f = FR.folded;
    const rots = [1.6, -1.1, .9, -1.4, .4, -.7];
    let out = surface(R, "#ebe8e3", { light: .34 });
    // bottom of the pile first; the first product ends up on top
    for (let i = n - 1; i >= 0; i--) {
      const off = (i - (n - 1) / 2) * step * s, jx = [0, -4, 3, -2, 4, -3][i] * s;
      out += `<g transform="translate(${r1(cx + jx)} ${r1(cy - off)}) rotate(${rots[i]}) scale(${r2(s)}) translate(-200 ${-f[1]})">` +
        layer(tops[i], foldShape(tops[i]), "front", R, { ...variant(tops[i]), shadow: "thick", lite: true }) + `</g>`;
    }
    return out + blinds(R, 26, .05);
  }

  /* ---- macro: extreme close-up of the chest script, collar and knit ---- */
  function macro(R, ratio) {
    const { W, H } = R, all = dropTees(6);
    const p = all.find(x => isClub(x) && styleOf(x).graphic && styleOf(x).graphic.large && styleOf(x).graphic.kind === "script") ||
      all.find(x => isClub(x)) || all[0];
    let fx, fy, view = "front", wv = W / H > 1.3 ? 190 : 128;
    if (isClub(p)) { const gp = graphicPos(styleOf(p)), wide = W / H > 1.3; if (wide) wv = 236; fx = gp ? gp.x - (wide ? 0 : 10) : 200; fy = gp ? gp.y - (wide ? -4 : 40) : 140; }
    else { const back = !!(printsOf(p).back && printsOf(p).back !== "logo"); view = back ? "back" : "front"; [fx, fy] = back ? [203, 214] : [226, 142]; wv = W / H > 1.3 ? 150 : 104; }
    const Z = W / wv, hvv = H / Z;
    const region = [fx - wv * .85, fy - hvv * .85 - 20, wv * 1.7, hvv * 1.7 + 40];
    const vg = R.once("mvg", id => `<radialGradient id="${id}" cx="${W / 2}" cy="${H / 2}" r="${Math.max(W, H) * .7}" gradientUnits="userSpaceOnUse"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></radialGradient>`);
    const base = isClub(p) ? styleOf(p).body : normHex(p.color);
    return `<rect width="${W}" height="${H}" fill="${base}"/>` +
      `<g transform="translate(${W / 2} ${H / 2}) rotate(-7) scale(${r2(Z)}) translate(${-fx} ${-fy})">` +
      layer(p, shapeOf(p), view, R, { ...variant(p), zoom: true, region, shadow: "none" }) + `</g>` +
      `<rect width="${W}" height="${H}" fill="url(#${vg})"/>` + blinds(R, 30, .045);
  }

  /* ---- detail:<id>:<part> — a tight close-up of collar / placket / knit / graphic ---- */
  function detailScene(R, ratio, p, part) {
    const { W, H } = R;
    let view = "front", fx, fy, w;
    if (isClub(p)) [view, fx, fy, w] = clubFocus(p, part || "collar");
    else ({ view, fx, fy, w } = detailPlan(p));
    const Z = Math.sqrt(W * H) / (w * 1.05), vw = W / Z, vh = H / Z;
    const region = [fx - vw / 2 - 20, fy - vh / 2 - 20, vw + 40, vh + 40];
    const base = isClub(p) ? styleOf(p).body : normHex(p.color);
    const vg = R.once("dvg", id => `<radialGradient id="${id}" cx="${W * .42}" cy="${H * .4}" r="${Math.max(W, H) * .75}" gradientUnits="userSpaceOnUse"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></radialGradient>`);
    return `<rect width="${W}" height="${H}" fill="#f4f3f1"/>` +
      `<g transform="translate(${W / 2} ${H / 2}) scale(${r2(Z)}) translate(${-fx} ${-fy})">` +
      bodyFor(p, view, R, { zoom: true, region, shadow: "flat" }) + `</g>` + `<rect width="${W}" height="${H}" fill="url(#${vg})"/>`;
  }

  /* ---- single: one shirt styled with a kulhad of chai and window light ---- */
  function kulhad(R, x, y, r) {
    const cl = R.once("kcl", id => `<radialGradient id="${id}" cx=".38" cy=".34" r=".7"><stop offset="0" stop-color="#c47552"/><stop offset=".7" stop-color="#a65a3b"/><stop offset="1" stop-color="#874329"/></radialGradient>`);
    const tea = R.once("ktea", id => `<radialGradient id="${id}" cx=".56" cy=".6" r=".6"><stop offset="0" stop-color="#c08d63"/><stop offset=".75" stop-color="#a87650"/><stop offset="1" stop-color="#7d5233"/></radialGradient>`);
    return `<g transform="translate(${r1(x)} ${r1(y)})">` +
      `<circle cx="${r1(r * .16)}" cy="${r1(r * .22)}" r="${r1(r * 1.04)}" fill="#1f1a14" opacity=".28" filter="url(#${R.sblur(r1(r * .16))})"/>` +
      `<circle r="${r}" fill="url(#${cl})"/><circle r="${r1(r * .84)}" fill="#7a3b23"/>` +
      `<circle r="${r1(r * .79)}" fill="url(#${tea})"/>` +
      `<circle r="${r1(r * .6)}" fill="none" stroke="#e1c3a0" stroke-opacity=".28" stroke-width="${r1(r * .1)}" filter="url(#${R.sblur(r1(r * .05))})"/>` +
      `<circle r="${r1(r * .92)}" fill="none" stroke="#e5a585" stroke-opacity=".35" stroke-width="${r1(r * .05)}" stroke-dasharray="${r1(r * 1.6)} ${r1(r * 4.2)}" transform="rotate(200)"/>` +
      `<ellipse cx="${r1(-r * .28)}" cy="${r1(-r * .3)}" rx="${r1(r * .2)}" ry="${r1(r * .07)}" fill="#fff" opacity=".3" transform="rotate(-35 ${r1(-r * .28)} ${r1(-r * .3)})" filter="url(#${R.sblur(r1(r * .04))})"/></g>`;
  }
  function single(R, ratio, p) {
    const { W, H } = R, wide = W / H > 1.2, view = heroSide(p);
    const s = wide ? Math.min(W * .4 / 388, H * .74 / 300) : Math.min(W * .76 / 388, H * .5 / 300);
    const x = wide ? W * .6 : W * .5, y = wide ? H * .5 : H * .48;
    // the cup rests just off the hem's corner, so the still survives a tight crop
    const kx = wide ? x + 262 * s : x + 150 * s, ky = wide ? y - 92 * s : y + 186 * s;
    return surface(R, "#ece9e4") + put(R, p, view, x, y, s, -4, { lite: true }) + kulhad(R, kx, ky, 40 * s) + blinds(R, 28, .055);
  }

  /* ---- look:<id> — a top-down outfit flat lay: the shirt, trousers, white sneakers, props ----
     Bottoms and props are generic, unbranded drawings (not products). Composition is laid out in
     "garment units" (1 unit ≈ 2.5 mm, the same scale as the shirt drawing) and fitted to the frame. */
  const LOOK = {
    tall: { box: [36, 40, 620, 790], top: [250, 222, -4], bot: [530, 500, 4], shoes: [[168, 650, -14], [272, 676, -4]], glasses: [392, 780, 12], cap: [176, 462, -12] },
    square: { box: [30, 46, 690, 640], top: [240, 228, -3], bot: [574, 424, 4], shoes: [[184, 572, -20], [286, 598, -8]], glasses: [420, 470, 10], cap: [650, 118, -14] },
    wide: { box: [30, 26, 1050, 500], top: [240, 254, -4], bot: [628, 272, 2], shoes: [[852, 182, 74], [866, 318, 84]], glasses: [466, 462, 8], cap: [1010, 330, -12] }
  };
  const lookKind = ratio => ratio === "1:1" ? "square" : RATIOS[ratio][0] > RATIOS[ratio][1] ? "wide" : "tall";
  function lookFit(ratio) {
    const [W, H] = RATIOS[ratio], L0 = LOOK[lookKind(ratio)], [bx, by, bw, bh] = L0.box;
    const k = Math.min(W / bw, H / bh) * .96;
    return { L0, k, tx: W / 2 - (bx + bw / 2) * k, ty: H / 2 - (by + bh / 2) * k };
  }
  function bottomFor(p) {
    const b = isClub(p) ? styleOf(p).body : normHex(p.color), [h, s] = hexToHsl(b), l = luma(b);
    if (l > .72) return { id: "look-black", name: "Black trousers", color: "#232324", fabric: "Cotton twill", shape: "pants" };
    if (l < .2 || (h > 80 && h < 175 && s > .2)) return { id: "look-ecru", name: "Ecru trousers", color: "#ece7dc", fabric: "Cotton twill", shape: "pants" };
    return { id: "look-denim", name: "Light-wash jeans", color: "#a7bdd3", fabric: "Denim", shape: "pants" };
  }
  // white leather low-top, seen from above (toe up), unbranded
  function sneakerDef(R) {
    return R.once("snk", id => {
      const sole = "M2 -61C15 -61 23 -48 23 -31C23 -14 18 -2 17 12C16 30 20 42 17 52C14 61 6 64 -1 64C-9 64 -16 60 -17 51C-18 41 -16 31 -17 14C-18 -2 -21 -16 -21 -32C-21 -48 -12 -61 2 -61Z";
      const gl = R.once("snkg", gid => `<radialGradient id="${gid}" cx="-8" cy="-34" r="80" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#5a5248" stop-opacity=".22"/></radialGradient>`);
      let lace = "";
      for (let i = 0; i < 5; i++) { const y = -18 + i * 6.5; lace += `M-9.5 ${y}L9.5 ${y + 4.6}M9.5 ${y}L-9.5 ${y + 4.6}`; }
      return `<g id="${id}"><path d="${sole}" fill="#000" opacity=".3" transform="translate(3 6)" filter="url(#${R.sblur(5)})"/>` +
        `<path d="${sole}" fill="#e7e3da" stroke="#cdc7bb" stroke-width=".8"/>` +
        `<path d="${sole}" fill="#f8f7f3" transform="translate(.4 1.2) scale(.885 .93)" stroke="#e2ddd3" stroke-width=".9"/>` +
        `<path d="M-15 -37C-8 -29 9 -29 16 -37M-16.5 -8C-13 12 -13 32 -14.5 49M17.5 -8C14 12 14 32 15.5 49" fill="none" stroke="#d9d3c8" stroke-width=".9"/>` +
        `<path d="M-14 -35C-7 -27.5 8 -27.5 15 -35" fill="none" stroke="#cfc8bb" stroke-width=".6" stroke-dasharray="1.6 1.2"/>` +
        `<path d="M-8 9C-9 -4 -8 -15 -6 -23L6 -23C8 -15 9 -4 8 9Z" fill="#fcfbf8" stroke="#ddd7cc" stroke-width=".8"/>` +
        `<path d="${lace}" stroke="#c9c2b5" stroke-width="2.8" stroke-linecap="round"/><path d="${lace}" stroke="#fdfcfa" stroke-width="1.9" stroke-linecap="round"/>` +
        `<path d="M-11 -18v26M11 -18v26" stroke="#bdb5a7" stroke-width="1.6" stroke-dasharray=".1 6.5" stroke-linecap="round"/>` +
        `<path d="M-10 26C-11 13 -7 7 0 7C7 7 11 13 10 26C9 40 5 47 0 47C-5 47 -9 40 -10 26Z" fill="#dcd4c5" stroke="#f1eee8" stroke-width="3"/>` +
        `<path d="M-8 18C-6 11 6 11 8 18" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="3" filter="url(#${R.sblur(1.4)})"/>` +
        `<path d="M-6 57C-6 62.5 6 62.5 6 57L5 52H-5Z" fill="#d6d0c4"/>` +
        `<path d="${sole}" fill="url(#${gl})"/></g>`;
    });
  }
  function glassesDef(R) {
    return R.once("sun", id => {
      const lens = "M-27 -9C-27 -14 -22 -15 -14 -15C-6 -15 -3 -13 -3 -6C-3 3 -8 9 -15 9C-23 9 -27 2 -27 -9Z";
      const lg = R.once("sung", gid => `<linearGradient id="${gid}" x1="0" y1="-15" x2="0" y2="9" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3b3833"/><stop offset="1" stop-color="#191816"/></linearGradient>`);
      return `<g id="${id}"><g fill="#000" opacity=".28" transform="translate(2.5 5)" filter="url(#${R.sblur(3)})"><path d="${lens}"/><path d="${lens}" transform="scale(-1 1)"/></g>` +
        `<path d="M-26 -11L19 -7M26 -11L-19 -7" stroke="#1d1c1a" stroke-width="2.2" stroke-linecap="round"/>` +
        `<path d="${lens}" fill="url(#${lg})" stroke="#1d1c1a" stroke-width="2.6"/><path d="${lens}" transform="matrix(-1 0 0 1 0 0)" fill="url(#${lg})" stroke="#1d1c1a" stroke-width="2.6"/>` +
        `<path d="M-3 -9Q0 -12 3 -9" fill="none" stroke="#1d1c1a" stroke-width="2.4"/>` +
        `<path d="M-22 -10L-12 -3M17 -11L23 -6" stroke="#fff" stroke-opacity=".22" stroke-width="2" stroke-linecap="round"/></g>`;
    });
  }
  function capDef(R, col) {
    return R.once("cap" + col.slice(1), id => {
      const dk = shade(col, -.1), st = shade(col, luma(col) > .6 ? -.18 : .12);
      const g = R.once("capg", gid => `<radialGradient id="${gid}" cx="-12" cy="-14" r="58" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".7" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></radialGradient>`);
      let seams = "";
      for (const a of [-60, 0, 60, 120, 180, 240]) { const r = a * Math.PI / 180; seams += `M0 0L${r1(Math.sin(r) * 39)} ${r1(-Math.cos(r) * 39)}`; }
      return `<g id="${id}"><path d="M-36 18C-33 74 33 74 36 18C18 31 -18 31 -36 18Z" fill="#000" opacity=".26" transform="translate(3 6)" filter="url(#${R.sblur(4)})"/>` +
        `<circle r="40" fill="#000" opacity=".26" transform="translate(3 6)" filter="url(#${R.sblur(5)})"/>` +
        `<path d="M-36 18C-33 74 33 74 36 18C18 31 -18 31 -36 18Z" fill="${dk}"/>` +
        `<path d="M-32 32C-26 64 26 64 32 32M-28 38C-22 58 22 58 28 38" fill="none" stroke="${st}" stroke-width=".7" stroke-dasharray="1.6 1.2"/>` +
        `<circle r="40" fill="${col}"/><path d="${seams}" stroke="${dk}" stroke-width="1.4"/>` +
        `<path d="${seams}" stroke="${st}" stroke-width=".5" stroke-dasharray="1.4 1.2" transform="rotate(4)"/>` +
        `<circle r="4" fill="${col}" stroke="${dk}" stroke-width="1"/>` +
        [-30, 30, 90, 150, 210, 270].map(a => { const r = a * Math.PI / 180; return `<circle cx="${r1(Math.sin(r) * 24)}" cy="${r1(-Math.cos(r) * 24)}" r="1.4" fill="${dk}" stroke="${st}" stroke-width=".5"/>`; }).join("") +
        `<circle r="40" fill="url(#${g})"/></g>`;
    });
  }
  // a surface for the look: polished concrete or washed linen
  function lookSurface(R, linen) {
    const { W, H } = R;
    if (!linen) {
      const pores = R.once("pores", id => `<filter id="${id}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".55" numOctaves="2" seed="21" result="n"/>` +
        `<feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -2.4 0 0 0 1.05"/></filter>`);
      return surface(R, "#cfccc6", { light: .26 }) + `<rect width="${W}" height="${H}" filter="url(#${pores})" opacity=".14"/>`;
    }
    const wv = R.once("lnw", id => `<pattern id="${id}" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M0 2H5M7 2H9M0 6.5H3M5 6.5H9" stroke="#fff" stroke-opacity=".22" stroke-width="1"/><path d="M2.5 0V9M7 0V4M7 6V9" stroke="#000" stroke-opacity=".05" stroke-width=".8"/></pattern>`);
    return surface(R, "#e3dccf", { light: .3 }) + `<rect width="${W}" height="${H}" fill="url(#${wv})"/>` +
      `<g fill="none" stroke-linecap="round" filter="url(#${R.sblur(Math.round(W * .008))})"><path d="M${r1(W * .05)} ${r1(H * .7)}Q${r1(W * .4)} ${r1(H * .62)} ${r1(W * .95)} ${r1(H * .8)}" stroke="#000" stroke-opacity=".06" stroke-width="${r1(W * .02)}"/>` +
      `<path d="M${r1(W * .1)} ${r1(H * .2)}Q${r1(W * .5)} ${r1(H * .3)} ${r1(W * .9)} ${r1(H * .12)}" stroke="#fff" stroke-opacity=".2" stroke-width="${r1(W * .03)}"/></g>`;
  }
  function look(R, ratio, p) {
    const { L0, k, tx, ty } = lookFit(ratio), idx = Math.max(0, dropTees(6).findIndex(x => x.id === p.id));
    const bot = bottomFor(p), body = isClub(p) ? styleOf(p).body : normHex(p.color);
    const sn = sneakerDef(R), gl = glassesDef(R), capCol = luma(body) > .6 ? "#4a5468" : hexToHsl(body)[0] > 30 && hexToHsl(body)[0] < 60 ? "#e9e4da" : "#d9cfbb";
    const ub = (h, x, y, s, rot, m = "") => `<use href="#${h}" transform="translate(${x} ${y}) rotate(${rot}) scale(${s})${m}"/>`;
    const [px, py, pr] = L0.top, [bx, by, brot] = L0.bot;
    let g = `<g transform="translate(${r1(bx)} ${r1(by)}) rotate(${brot}) scale(1.2) translate(-200 -261)">` +
      layer(bot, "pants", "front", R, { relaxed: true, lite: true, shadow: "flat" }) + `</g>`;
    g += put(R, p, "front", px, py, 1, pr, { lite: true });
    g += ub(sn, L0.shoes[0][0], L0.shoes[0][1], .9, L0.shoes[0][2], " scale(-1 1)") + ub(sn, L0.shoes[1][0], L0.shoes[1][1], .9, L0.shoes[1][2]);
    g += ub(gl, L0.glasses[0], L0.glasses[1], 1, L0.glasses[2]);
    if (L0.cap) g += ub(capDef(R, capCol), L0.cap[0], L0.cap[1], 1, L0.cap[2]);
    return lookSurface(R, idx % 2 === 1) + `<g transform="translate(${r1(tx)} ${r1(ty)}) scale(${r2(k)})">${g}</g>` + blinds(R, 28, .04);
  }
  // where the shirt's chest sits in a look: percentages of the frame (for a "shop this" dot)
  function lookHotspot(productId, ratio = "4:5") {
    ratio = RATIOS[ratio] ? ratio : "4:5";
    const p = findProduct(productId) || dropTees(6)[0], [W, H] = RATIOS[ratio], { L0, k, tx, ty } = lookFit(ratio);
    const [px, py, pr] = L0.top, cy = (FR[frameKey(p, "front")] || FR.tee)[1], a = pr * Math.PI / 180;
    const lx = 0, ly = 222 - cy, x = px + lx * Math.cos(a) - ly * Math.sin(a), y = py + lx * Math.sin(a) + ly * Math.cos(a);
    return { x: Math.round((tx + x * k) / W * 1000) / 10, y: Math.round((ty + y * k) / H * 1000) / 10 };
  }

  /* ---------- public: editorial scene ---------- */
  const SCENE_LABEL = { flatlay: "The Club Edit laid flat: collared polos and rugby shirts", rail: "Polos and rugby shirts on a clothing rail by the window",
    stack: "A folded stack of collared polos and rugby shirts", macro: "Close-up of a raised chest script, contrast collar and piqué knit" };
  function campaign(scene, opts = {}) {
    const ratio = RATIOS[opts.ratio] ? opts.ratio : "16:9", [W, H] = RATIOS[ratio];
    const R = reg(W, H), sc = String(scene || "flatlay"), parts = sc.split(":");
    let body, label;
    if (parts[0] === "single" || parts[0] === "look" || parts[0] === "detail") {
      const p = findProduct(parts[1]) || dropTees(6)[0], nm = p.name || "Polo";
      if (parts[0] === "single") { body = single(R, ratio, p); label = nm + ", styled"; }
      else if (parts[0] === "look") { body = look(R, ratio, p); label = `${nm} styled with ${bottomFor(p).name.toLowerCase()} and white sneakers`; }
      else { body = detailScene(R, ratio, p, parts[2]); label = `${nm}: close-up of the ${({ collar: "collar", placket: "placket and buttons", knit: "knit", graphic: "chest graphic" })[parts[2]] || "collar"}`; }
    } else {
      const fn = { flatlay, rail, stack, macro }[sc] || flatlay;
      body = fn(R, ratio); label = SCENE_LABEL[sc] || SCENE_LABEL.flatlay;
    }
    return svgOut(label, `0 0 ${W} ${H}`, R, body);
  }


  // Legacy: SHAPES maps each shape name to its drawing function (kept for compatibility)
  const SHAPES = { ...DRAW, coord: coordBody };
  return { garment, campaign, lookHotspot, print, outfit, swatch, shade, SHAPES, PRINTS: Object.keys(PRINTS) };
})();
