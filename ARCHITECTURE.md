# BHAKSHI — Site Architecture & Shared Contract

Static site (plain HTML/CSS/JS, **no build step, no frameworks, no npm**). Must work when hosted on
GitHub Pages at a sub-path (e.g. `https://user.github.io/bhakshi/`), so **all links/paths are relative**
(`shop.html`, `css/style.css` — never `/shop.html`). Must also work from a simple local server.
Orders go to the owner's WhatsApp; payment by UPI or Cash on Delivery. Audience: Indian men 18–50.

## Brand & design direction — "Modern Indian Essentials"
Premium, editorial, warm, confident — think a high-end menswear label, not a loud streetwear store.
Original design (do NOT copy any other brand's text, logos, or layouts verbatim).

- **Palette (CSS variables, defined in `css/style.css`)**
  - `--ink:#15120f` (text/dark bg) `--ink-2:#3d3833` `--muted:#8a837a`
  - `--paper:#fbf8f3` (page bg) `--bone:#f3ece1` (alt section bg) `--sand:#e6dccb` `--line:#e8e1d6`
  - `--saffron:#d9772b` (primary accent) `--saffron-dark:#b65f1d` `--indigo:#1d2742` (secondary accent)
  - `--success:#1f8a4c` `--danger:#b3261e` `--wa:#1fa855` (WhatsApp green)
- **Type**: display = `--font-display: "Fraunces", Georgia, serif` (use italics for accent words,
  e.g. "Wear the *everyday*"); UI/body = `--font-ui: "Inter", system-ui, sans-serif`.
  Every page `<head>` includes exactly:
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  ```
- **Other tokens**: `--radius-s:6px --radius:12px --radius-l:22px`, `--shadow-s`, `--shadow`, `--shadow-l`,
  `--ease: cubic-bezier(.2,.7,.1,1)`, `--max:1360px`, `--header-h:72px`, `--gutter: clamp(16px,4vw,40px)`.
- **Motif**: an original Indian block-print pattern at `images/pattern.svg` (single-colour, tileable,
  uses `currentColor`-free fill `#d9772b` at low opacity is fine) — used sparingly as dividers/backgrounds.
- Motion: smooth and purposeful; always honour `prefers-reduced-motion`. Mobile-first; must look great at
  360px, 768px, 1280px, 1600px. Touch targets ≥ 44px. Accessible: labels, alt text, focus-visible styles,
  keyboard operable modals (Esc closes, focus trap), `aria-*` where relevant.

## Files & ownership (each agent edits ONLY its own files)
| File(s) | Owner |
|---|---|
| `js/products.js` | store owner data — **read-only for agents** (do not change the data shape) |
| `js/art.js`, `images/pattern.svg`, `images/favicon.svg`, `images/og.svg` | Art agent |
| `css/style.css`, `js/app.js` | Shell agent (design system, header/footer, drawers, shared stores, modal, cursor) |
| `js/features.js`, `css/features.css`, `wishlist.html` | Features agent (quick view, fit finder, wishlist page) |
| `index.html`, `css/home.css`, `js/home.js` | Home agent |
| `shop.html`, `product.html`, `css/shop.css`, `js/shop.js`, `js/product.js` | Shop/PDP agent |
| `checkout.html`, `about.html`, `contact.html`, `policies.html`, `css/pages.css`, `js/checkout.js` | Checkout & pages agent |

## Page skeleton (every page)
```html
<!DOCTYPE html><html lang="en"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>… | BHAKSHI</title><meta name="description" content="…">
  <meta name="theme-color" content="#15120f">
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
`app.js` injects the announcement bar + header before `<main>` and the footer after it. Scripts are plain
(non-module) and share globals. Page scripts run after `app.js`, so the shell already exists.

## Product data (`js/products.js`, globals `STORE`, `CATEGORIES`, `PRODUCTS`)
Product: `{ id, family, colorName, fit, fabric, name, category, price, mrp, color, shape, sizes[], tags[], stock, images[], desc }`
- `shape` ∈ `tee, polo, shirt, kurta, hoodie, jacket, pants, shorts, coord`
- `family`: same family ⇒ colour variants of each other (render swatches using `color`).
- `tags` include `new, bestseller, sale` and occasions `office, casual, athleisure, festive`.
- `images[]` may be empty ⇒ use `Art`. Category `group` ∈ `Topwear, Winterwear, Bottoms, Co-ords`.
- `STORE`: `name, tagline, whatsapp, upi, email, instagram, city, freeShippingAbove, shippingFee, codFee (-1 = COD off), announcement[], coupons{CODE:%}`.

## `js/art.js` API (global `Art`)
- `Art.garment(product, { bg = true, view = "front" })` → SVG string (viewBox `0 0 400 500`, scales to
  container; `view` ∈ `front | back | detail`). `bg:false` ⇒ transparent background.
- `Art.outfit(top, bottom, { bg = true })` → SVG of a top + bottom styled together (flat-lay look).
- `Art.swatch(color)` → small circular fabric-textured SVG swatch.

## `js/app.js` API (globals) — Shell agent implements, everyone may use
Helpers: `$`, `$$`, `rupee(n)` (₹ en-IN), `esc(str)`, `getProduct(id)`, `catName(id)`, `discount(p)` (%),
`variantsOf(p)` (same family, incl. p), `productImage(p, i=0, view)` (photo `<img>` if `p.images[i]` else `Art.garment`).

Stores (localStorage, each fires a `document` CustomEvent on change):
- `Cart` — `get() lines() add(id,size,qty) setQty(index,qty) remove(index) clear() subtotal() count()` → event `cart:change`
- `Wishlist` — `get() has(id) toggle(id) count()` → event `wishlist:change`
- `Recent` — `add(id) list(excludeId)` (recently viewed, max 12)

UI:
- `productCard(p)` → HTML string. Markup contract:
  ```html
  <article class="card" data-id="ID">
    <a class="card-media" href="product.html?id=ID"> badge · image · optional 2nd image/back view on hover </a>
    <button class="card-wish" data-wish="ID" aria-pressed="false" aria-label="Add to wishlist">♥svg</button>
    <button class="card-quick" data-quick="ID">Quick view</button>
    <div class="card-sizes"> <button data-add="ID" data-size="M">M</button>… </div>   <!-- quick add on hover -->
    <div class="card-body"> <a href=…>name</a> · price row · swatches (links to variants) </div>
  </article>
  ```
  Click handling is delegated in `app.js`: `[data-wish]` toggles wishlist (and keeps all matching hearts in
  sync), `[data-add]` adds to cart with `flyToCart` + toast. `[data-quick]` is handled by `features.js`.
- `openCart()`, `closeDrawers()`, `toast(msg, {type})`, `flyToCart(sourceEl)`.
- `Modal.open(html, { size: "s"|"m"|"l"|"sheet", label })` → returns the modal content element; `Modal.close()`.
  Handles overlay, Esc, focus trap, scroll lock, and becomes a bottom sheet on mobile.
- `reveal`: any element with `data-reveal` fades/slides in when scrolled into view; `data-reveal="stagger"`
  staggers its children. Call `refreshReveal()` after injecting new content.
- `.btn` family: `.btn` (primary ink), `.btn-accent` (saffron), `.btn-ghost` (outline), `.btn-light`,
  `.btn-wa` (WhatsApp), `.btn-block`, `.btn-sm`, `.btn-lg`; `data-magnetic` adds a subtle magnetic hover.
- Shared layout classes: `.container`, `.section`, `.section-bone` (alt bg), `.section-ink` (dark),
  `.section-head` (title + link row), `.eyebrow`, `.display-xl|.display-l|.display-m|.display-s`,
  `.link-arrow`, `.chip` (+ `.active`), `.badge` (+ `.badge-accent|.badge-dark|.badge-sale`),
  `.grid-products` (responsive product grid), `.scroller` (horizontal snap carousel),
  `.field` (label + input/select/textarea), `.qty` stepper, `.skeleton`, `.divider-print` (pattern strip).

## `js/features.js` API (global)
- `QuickView.open(id)` — modal with gallery, swatches, size picker, qty, add to cart, link to full page.
- `FitFinder.open({ productId?, onPick?(size) })` — 3-step size quiz (height, weight, fit preference →
  recommended size for tops (S–XXL / 38–46) and bottoms (waist 28–40)); remembers answers in localStorage.
- Handles `[data-quick]` and `[data-fitfinder]` clicks globally.

## Testing
A local server is already running: `http://localhost:8765/` serves this folder.
Headless Chrome: `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`
- Screenshot: `--headless=new --disable-gpu --hide-scrollbars --window-size=1440,2200 --virtual-time-budget=4000 --screenshot=/tmp/<you>/x.png URL`
- Console errors: add `--enable-logging=stderr --v=0 --dump-dom` and grep stderr for `CONSOLE` / `Uncaught`.
- macOS headless has a ~500px minimum window width — for **mobile** screenshots create a temporary
  `_test-<you>.html` in the project root containing `<iframe src="PAGE" width="390" height="1600">` frames,
  screenshot that, then DELETE the temp file.
- Other agents are editing their files concurrently; brief breakage in files you don't own is expected.
  Never edit another agent's file — note any cross-file issue in your final report instead.
