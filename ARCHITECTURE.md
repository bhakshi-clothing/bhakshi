# BHAKSHI — Site Architecture & Shared Contract (v3: minimal craft streetwear)

Static site (plain HTML/CSS/JS, **no build step, no frameworks, no npm**), live on GitHub Pages at
`https://bhakshi-clothing.github.io/bhakshi/` — a sub-path, so **all links/paths are relative**
(`shop.html`, `css/style.css` — never `/shop.html`). Orders go to the owner's WhatsApp; payment by UPI or
Cash on Delivery. Audience: Indian men 18–50 who like streetwear.

**History:** v1 (warm editorial serif) and v2 (dark neon "drop") were both rejected by the owner.
The owner's reference is **FARAK (farak.co)** — an Indian handmade streetwear label. v3 adopts that
*kind* of aesthetic (described below) with 100% original BHAKSHI branding, copy, logo and artwork.
Do NOT copy FARAK's (or anyone's) logo, stamp, text, product names, photos, or exact layouts.

**The business right now:** Drop 01 — 5 oversized graphic tees (see `js/products.js`). The site must look
complete with 5 products AND scale when more products/categories are added (menus, filters, sections
appear automatically from data). Mix & match stays OFF (`STORE.features.mixAndMatch`).

## Design direction — "Minimal craft streetwear" (v3)
Clean, white, quiet, image-led, premium. The product imagery does the talking; UI is thin and restrained.
- **Palette (CSS variables in `css/style.css`)**: `--bg:#ffffff` `--surface:#f4f3f1` (image backgrounds)
  `--surface-2:#ecebe8` `--text:#111111` `--text-2:#4a4a4a` `--muted:#8a8a8a` `--line:#e6e6e6`
  `--line-2:#d4d4d4` `--accent:#111111` (black IS the accent) `--sale:#b3261e` `--success:#1f7a4c`
  `--wa:#25d366`. No neon, no gradients, no grain, no glow, no dark theme.
- **Type** — every page `<head>` includes exactly:
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Jost:ital,wght@0,300..700;1,300..700&display=swap" rel="stylesheet">
  ```
  `--font: "Jost", "Helvetica Neue", Arial, sans-serif` for everything.
  - Wordmark: `B H A K S H I` feel — uppercase, weight 500, letter-spacing ~.35em.
  - Nav, buttons, labels: uppercase, 12–13px, weight 500, letter-spacing .12–.16em.
  - Headings: uppercase or title case, weight 400–500, modest sizes (h1 ~28–40px; hero lines up to ~56px),
    letter-spacing .04–.08em. Nothing ultra-bold or ultra-wide.
  - Product names: Title Case, 14–15px, weight 400. Technique line: 12–13px muted. Price: `Rs. 899.00`.
- **Layout**: generous whitespace, full-bleed imagery, thin 1px dividers, **square corners** (radius 0;
  inputs 0–2px), **no shadows**. Product images are **portrait 5:7** (`aspect-ratio:5/7`) on `--surface`.
  Grids: 4 columns desktop, 3 tablet, 2 mobile, small gaps (8–16px), text left-aligned under images.
- **Buttons**: `.btn` = black fill, white uppercase tracked text, square; `.btn-outline` = 1px black border;
  hover = subtle invert/opacity. Full-width on mobile where sensible.
- **Motion**: restrained — image crossfade to back view on hover, gentle fade-up reveals, smooth drawers.
  No custom cursor, no scramble text, no tilt, no marquees (except optionally the announcement bar fade).
  Honour `prefers-reduced-motion`.
- **Copy voice**: calm, short, crafted; Indian everyday references are welcome (monsoon, chai, trains,
  truck art). No invented reviews/ratings/celebrity endorsements/customer counts/press.
- **Quality**: flawless at 360/390, 768, 1280, 1440 px; touch targets ≥ 44px; accessible (contrast,
  labels, alt text, focus-visible outlines in black, keyboard modals with Esc + focus trap).

## Files & ownership (each agent edits ONLY its own files)
| File(s) | Owner |
|---|---|
| `js/products.js` | store owner data — **read-only for agents** |
| `js/art.js`, `images/*` (favicon.svg, og.svg, og.png, stamp.svg) | Art agent |
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
  <meta name="theme-color" content="#ffffff">
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

## Product data (`js/products.js`: `STORE`, `CATEGORIES`, `PRODUCTS`)
Product: `{ id, techniques[], family, colorName, fit, fabric, name, category, price, mrp, color, shape, print{front,back}, sizes[], tags[], stock, edition, images[], desc }`
- `techniques[]` e.g. `["Screen print","Puff print"]` → label `techLabel(p)` = `"Screen print +1"`.
- `images[]` (owner photos, front first then back, more allowed) override the drawn art everywhere.
- `mrp === price` ⇒ no discount (no strike). When `mrp > price`: show `Rs. 899.00` then struck `Rs. 1,299.00`.
- `stock`/`edition`: show "Sold out" when 0; low stock ≤ 10 may show a quiet "Only 9 left" text (no meters).
- `STORE.drop = { number, name, launch }` — `launch` future ⇒ countdown + buying locked (keep v2 behaviour).
- `STORE.features.mixAndMatch` — false ⇒ no outfit/complete-the-look UI at all.
- `STORE.campaign = { hero, heroMobile, banner, story, newsletter }` — owner photo paths; "" ⇒ drawn scene.
- `STORE.community = [{ image, name, product }]` — "Worn by you" photos; empty ⇒ section hidden (or a
  small Instagram CTA instead). Never fake people.
- `STORE.whatsapp` may be `""` ⇒ checkout blocks orders (keep the guard); use `waLink()` for links.

## `js/art.js` API (global `Art`)
- `Art.garment(product, { bg = true, view = "front" })` → SVG (viewBox **0 0 500 700**, 5:7, width/height
  100%, `preserveAspectRatio="xMidYMid slice"`). `view` ∈ `front | back | detail | folded`.
  Look = a **realistic e-commerce packshot**: garment on a soft light-grey studio backdrop (`#f4f3f1`), soft
  natural contact shadow, true-to-life fabric shading. `bg:false` ⇒ transparent.
- `Art.campaign(scene, { ratio = "16:9" })` → SVG editorial scene for big image slots when there's no photo.
  `scene` ∈ `flatlay` (all drop tees laid out), `rail` (tees on hangers on a clothing rail), `stack` (folded
  stack), `macro` (close-up of a print + fabric), `single:<productId>` (one tee, styled). `ratio` ∈
  `16:9 | 4:5 | 3:4 | 1:1 | 21:9`. Muted, natural, photographic-feeling palette.
- `Art.print(name, { color, side })`, `Art.outfit(top, bottom)`, `Art.swatch(color)` as before.

## `js/app.js` API (globals) — Shell agent implements, everyone may use
Everything from v2 stays (helpers, stores, events, Modal, toast, flyToCart, reveal, countdown,
`isBuyable`, `dropState`, `stockInfo`, `waLink`, `liveCategories`, `hasBottoms`, `mixMatchOn`, …) plus:
- `rupee(n)` → **`"Rs. 899.00"`** (en-IN grouping, 2 decimals). Use it for every price.
- `techLabel(p)` → `"Screen print +1"` ("" if none).
- `campaignImage(slot, { scene, ratio, alt })` → `<img>` of `STORE.campaign[slot]` if set, else `Art.campaign`.
- `productImage(p, i = 0, view, opts)` → photo `<img>` (`loading="lazy"`) or `Art.garment`.
- `productCard(p)` markup (style freely; keep these hooks):
  ```html
  <article class="card" data-id="ID">
    <a class="card-media" href="product.html?id=ID"> front image · back image (shown on hover) · text badge ("Sold out"/"New") </a>
    <button class="card-wish" data-wish="ID" aria-pressed="false" aria-label="Add to wishlist">…</button>
    <button class="card-quick" data-quick="ID">Quick add</button>
    <div class="card-sizes"> <button data-add="ID" data-size="M">M</button>… </div>
    <div class="card-body"> <a class="card-name">Name</a> <p class="card-tech">Screen print +1</p> <p class="card-price">Rs. 899.00</p> </div>
  </article>
  ```
- Shared classes: `.container` (max ~1440px, side padding 20–48px), `.section`, `.section-alt` (`--surface`),
  `.section-head`, `.eyebrow`, `.h1/.h2/.h3`, `.link-underline`, `.chip`(+`.active`), `.badge`, `.grid-products`,
  `.scroller`, `.field`, `.qty`, `.skeleton`, `.btn` `.btn-outline` `.btn-light` `.btn-wa` `.btn-block` `.btn-sm`.

## `js/features.js` API
`QuickView.open(id)`, `FitFinder.open({ productId, onPick, onCancel })` (+ `fitfinder:pick`), `[data-quick]`,
`[data-fitfinder]` — same behaviour as v2, restyled minimal.

## Testing
Local server `http://localhost:8765/` (running). Real-browser driver: start your own Chrome on YOUR port with
your own fresh profile —
`"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --remote-debugging-port=PORT --user-data-dir=/tmp/<you>-profile about:blank &`
— then `CDP_PORT=PORT node /tmp/bkcdp/drive.mjs steps.json`. Steps: `size:[w,h]` (≤600 ⇒ mobile emulation),
`touch`, `go:"page.html"` (+`wait`), `js:"expr"` (+`print`, `after`), `shot:"/tmp/<you>/x.png"`. It prints
console errors at the end. Scroll gradually to trigger reveals. Kill your Chrome when done
(`pkill -f "remote-debugging-port=PORT"`). Iterate visually ≥ 3 rounds — judge against a top Indian
premium streetwear site: whitespace, alignment, restraint, image quality. Temp files go in `/tmp/<you>/`;
any temp page in the project is `_test-<you>.html` and must be DELETED. Never edit another agent's files.
