# BHAKSHI — Site Architecture & Shared Contract (v2: dark "drop" redesign)

Static site (plain HTML/CSS/JS, **no build step, no frameworks, no npm**), live on GitHub Pages at
`https://bhakshi-clothing.github.io/bhakshi/` — a sub-path, so **all links/paths are relative**
(`shop.html`, `css/style.css` — never `/shop.html`). Orders go to the owner's WhatsApp; payment by UPI or
Cash on Delivery. Audience: Indian men 18–50 who like streetwear.

**The business right now:** launching with **Drop 01 — 5 oversized graphic tees** (see `js/products.js`).
The site must look full and intentional with only 5 products, AND scale gracefully when the owner later
adds shirts, jeans, joggers etc. (menus, filters and sections appear automatically when data exists).

## Brand & design direction — "Dark drop culture"
A trendy, dark, confident Indian streetwear label. Think limited drops, spec sheets, ticker tapes, graphic
back prints, big wide type — energetic but premium and clean, never cluttered or cheap. 100% original
(do NOT copy any other brand's text, logos, graphics, or layouts).

- **Palette (CSS variables in `css/style.css`)** — dark-first:
  - `--bg:#0a0a0a` (page) `--surface:#121212` `--surface-2:#1a1a1a` `--surface-3:#242424`
  - `--line:#262626` `--line-2:#383838` (hairlines/borders)
  - `--text:#f2f1ec` `--text-2:#b9b8b2` `--muted:#7c7b76`
  - `--accent:#c6ff00` (acid volt — the signature colour; use for CTAs, live dots, highlights, ticker)
    `--accent-ink:#0a0a0a` (text on accent)
  - `--hot:#ff3d2e` (low stock / sold out / urgency) `--success:#3ddc84` `--danger:#ff4d4d` `--wa:#25d366`
- **Type** — every page `<head>` includes exactly:
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  ```
  - Display: `--font-display: "Archivo", system-ui, sans-serif` with `font-stretch:125%`, weight 800–900,
    UPPERCASE, tight tracking (`-0.02em`), line-height ~0.9. Use for headlines, product names on big moments.
  - Body/UI: `--font-ui: "Archivo", system-ui, sans-serif` (normal width, 400–600).
  - Mono labels: `--font-mono: "Space Mono", ui-monospace, monospace` — small uppercase metadata with
    letter-spacing .06–.1em: `[ DROP 01 ]`, `(05)`, `SKU`, `240 GSM`, stock `09 / 40 LEFT`, timestamps.
- **Shape & texture**: square-ish corners (`--radius-s:2px --radius:4px --radius-l:8px`, pills only for
  small tags), hairline borders and grid lines instead of soft shadows, a subtle fixed film-grain overlay,
  occasional accent glow. Product imagery sits on `--surface` panels with a soft spotlight.
- **Motion** (`--ease: cubic-bezier(.7,0,.2,1)`, snappy): marquee tickers, clip-path image wipes, text
  scramble/decode on hover for nav + mono labels, hover invert on buttons, card tilt. Always honour
  `prefers-reduced-motion`.
- **Quality**: mobile-first and flawless at 360/390, 768, 1280, 1440, 1600 px. Touch targets ≥ 44px.
  Accessible: contrast ≥ 4.5:1 for body text, labels, alt text, focus-visible rings (accent), keyboard
  operable modals (Esc, focus trap), `aria-*` where relevant.
- **Copy voice**: short, punchy, a little playful, Indian everyday references (monsoon, chai, overnight
  trains, truck art, city streets). No invented reviews, ratings, customer counts, press, or awards.

## Files & ownership (each agent edits ONLY its own files)
| File(s) | Owner |
|---|---|
| `js/products.js` | store owner data — **read-only for agents** |
| `js/art.js`, `images/*` (favicon.svg, og.svg, og.png, any textures) | Art agent |
| `css/style.css`, `js/app.js` | Shell agent |
| `js/features.js`, `css/features.css`, `wishlist.html` | Features agent |
| `index.html`, `css/home.css`, `js/home.js` | Home agent |
| `shop.html`, `product.html`, `css/shop.css`, `js/shop.js`, `js/product.js` | Shop/PDP agent |
| `checkout.html`, `about.html`, `contact.html`, `policies.html`, `css/pages.css`, `js/checkout.js` | Checkout & pages agent |

## Page skeleton (every page)
```html
<!DOCTYPE html><html lang="en"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>… | BHAKSHI</title><meta name="description" content="…">
  <meta name="theme-color" content="#0a0a0a">
  <!-- fonts (above) -->
  <link rel="stylesheet" href="css/style.css">
  <link rel="stylesheet" href="css/features.css">
  <link rel="stylesheet" href="css/PAGE.css">        <!-- home.css / shop.css / pages.css -->
  <link rel="icon" href="images/favicon.svg">
</head>
<body data-page="home|shop|product|checkout|wishlist|about|contact|policies">
  <main id="main"> …page content… </main>
  <script src="js/products.js"></script>
  <script src="js/art.js"></script>
  <script src="js/app.js"></script>
  <script src="js/features.js"></script>
  <script src="js/PAGE.js"></script>                 <!-- if the page has one -->
</body></html>
```
`app.js` injects the announcement ticker + header before `<main>` and the footer after it. Scripts are plain
(non-module) globals. Page scripts run after `app.js`.

## Product data (`js/products.js`, globals `STORE`, `CATEGORIES`, `PRODUCTS`)
Product: `{ id, family, colorName, fit, fabric, name, category, price, mrp, color, shape, print{front,back}, sizes[], tags[], stock, edition, images[], desc }`
- `shape` ∈ `tee, polo, shirt, kurta, hoodie, jacket, pants, shorts, coord` (now only `tee` is used).
- `print.front` / `print.back` ∈ `core, monsoon, chai, express, hornok, logo, ""` — graphic drawn by `Art`
  when there are no photos. May be missing on future products ⇒ treat as `""`.
- `mrp === price` ⇒ **no discount**: never show a struck-through MRP or "0% off" in that case.
- `stock` = units left, `edition` = total units made (may be missing ⇒ just show stock). Low stock ≤ 15.
- `STORE.drop = { number, name, launch }` — `launch` null ⇒ drop is LIVE. A future ISO date ⇒ show a live
  countdown and lock buying until then (buttons read "Drops in 02d 14h…" / "Notify me on WhatsApp").
- `STORE.features.mixAndMatch` (currently **false**) — gates every outfit/mix-and-match/complete-the-look
  feature. When false (or when there are no bottoms in PRODUCTS), those sections must not render at all
  (no empty shells). Keep the code ready so flipping the flag turns it on.
- `STORE.whatsapp` may be `""` (owner hasn't set it yet): checkout already blocks orders in that case;
  WhatsApp links elsewhere must still not crash (use `waLink(text)` from app.js).
- Category `group` ∈ `Topwear, Winterwear, Bottoms, Co-ords`. Only categories with ≥1 product are shown.

## `js/art.js` API (global `Art`)
- `Art.garment(product, { bg = true, view = "front" })` → SVG string (viewBox `0 0 400 500`, width/height
  100%). `view` ∈ `front | back | detail` (detail = close-up of the print/fabric). Draws `product.print`.
  `bg:false` ⇒ transparent. Background (when on) is the dark studio look.
- `Art.print(name, { color })` → SVG of just the graphic (square viewBox `0 0 400 400`, transparent bg),
  for artwork close-ups/stickers. `color` = the garment colour it sits on (to pick ink colours).
- `Art.outfit(top, bottom, { bg = true })` → top + bottom together (used only when mixAndMatch is on).
- `Art.swatch(color)` → small circular swatch (viewBox 0 0 24 24).

## `js/app.js` API (globals) — Shell agent implements, everyone may use
Helpers: `$`, `$$`, `rupee(n)` (₹ en-IN), `esc(str)`, `getProduct(idOrProduct)`, `catName(id)`, `discount(p)`
(% , 0 when none), `variantsOf(p)`, `productImage(p, i=0, view)`, `waLink(text)` (wa.me link; if
`STORE.whatsapp` is empty it returns a share link without a number), `liveCategories()` (categories with
products), `hasBottoms()`, `mixMatchOn()` (= flag && hasBottoms()),
`stockInfo(p)` → `{ left, total, pct, low, soldOut }`, `dropState()` → `{ live, launch, msLeft }`,
`isBuyable(p)` (drop live && stock > 0), `countdown(el, launchDate)` (renders/updates `DD:HH:MM:SS`).

Stores (localStorage; each fires a `document` CustomEvent on change):
- `Cart` — `get() lines() add(id,size,qty) setQty(index,qty) remove(index) clear() subtotal() count()` → `cart:change`
  (`add` refuses non-buyable products). Key `bhakshi_cart`, lines `{id,size,qty}`.
- `Wishlist` — `get() has(id) toggle(id) count()` → `wishlist:change`
- `Recent` — `add(id) list(excludeId)` → returns product objects

UI:
- `productCard(p)` → HTML string. Markup contract (style changes freely, these hooks stay):
  ```html
  <article class="card" data-id="ID">
    <a class="card-media" href="product.html?id=ID"> badge · front image · back view on hover </a>
    <button class="card-wish" data-wish="ID" aria-pressed="false" aria-label="Add to wishlist">…</button>
    <button class="card-quick" data-quick="ID">Quick view</button>
    <div class="card-sizes"> <button data-add="ID" data-size="M">M</button>… </div>
    <div class="card-body"> name · price (no strike if no discount) · stock meter · swatches if variants </div>
  </article>
  ```
  Delegated in `app.js`: `[data-wish]`, `[data-add][data-size]`, `[data-open-cart]`, `[data-open-search]`.
  `[data-quick]` and `[data-fitfinder]` are handled by `features.js`.
- `openCart()`, `closeCart()`, `closeDrawers()`, `toast(msg, {type, action})`, `flyToCart(sourceEl)`,
  `Modal.open(html, { size: "s"|"m"|"l"|"sheet", label })` / `Modal.close()`, `refreshReveal()`
  (`data-reveal`, `data-reveal="stagger"`), `data-magnetic`, `data-scramble` (text decode on hover).
- Shared classes: `.container`, `.section`, `.section-alt` (surface bg), `.section-accent` (acid bg, dark text),
  `.section-head`, `.eyebrow` (mono label), `.mono`, `.display-xl|l|m|s`, `.outline-text` (stroked type),
  `.link-arrow`, `.chip`(+`.active`), `.badge`(+`.badge-accent|.badge-hot|.badge-ghost`), `.grid-products`,
  `.scroller`, `.field`, `.qty`, `.skeleton`, `.ticker` (marquee), `.stock-meter`, `.live-dot`,
  `.btn` (accent fill) `.btn-ghost` (outline) `.btn-light` (white fill) `.btn-dark` `.btn-wa`
  `.btn-block .btn-sm .btn-lg`.

## `js/features.js` API (global)
- `QuickView.open(id)`; `FitFinder.open({ productId, onPick, onCancel })` (+ `fitfinder:pick` event).
  If the store sells no bottoms, FitFinder shows only the top size (no waist result).

## Testing
Local server: `http://localhost:8765/` serves this folder (already running).
**Real-browser driver** (preferred — real scrolling, clicks, mobile emulation, console capture):
1. Start your own Chrome on YOUR port (see your prompt) with your own profile:
   `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --remote-debugging-port=PORT --user-data-dir=/tmp/<you>-profile about:blank &`
2. Write a steps JSON and run `CDP_PORT=PORT node /tmp/bkcdp/drive.mjs steps.json`. Each step may have:
   `size:[w,h]` (≤600 wide ⇒ mobile emulation), `touch:true|false`, `go:"page.html"` (+`wait` ms),
   `js:"expression"` (awaited; `print:"label"` logs its JSON value; `after` ms), `shot:"/tmp/<you>/x.png"`.
   It prints all console errors / exceptions at the end. Scroll gradually in `js` to trigger reveals.
3. Kill your Chrome when done: `pkill -f "remote-debugging-port=PORT"`.
Look at your screenshots critically and iterate (≥ 3 rounds). Put temp files in `/tmp/<you>/`; any temp page
inside the project must be named `_test-<you>.html` and DELETED when done.
Other agents edit their files concurrently; brief breakage in files you don't own is expected. Never edit
another agent's file — report cross-file issues in your final report instead.
