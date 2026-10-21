# BHAKSHI — Collared Classics, Made in India

A complete online store that costs **₹0/month** to run.
Customers browse, add to bag, and check out. The order arrives in **your WhatsApp**, and they pay by **UPI** or **Cash on Delivery**.

---

## 1. Set up your store (5 minutes)

Open `js/products.js` in any text editor (VS Code, or even TextEdit) and change the top section:

```js
whatsapp: "919876543210",   // ← your WhatsApp number: 91 + 10 digits, no spaces or + (checkout is off until set)
upi: "yourname@upi",        // ← your UPI ID (from GPay / PhonePe / Paytm)
email: "hello@bhakshi.in",
instagram: "https://instagram.com/yourhandle",
```

**This is the only file you need to edit.** Everything else updates automatically.

## 2. Your drop, your products

The store is set up for **Drop 01: The Club Edit**, with 6 collared polos and rugby shirts. Each product looks like this:

```js
{ id: "varsity-script-polo-green", techniques: ["Puff print", "Contrast collar"], family: "varsity-script-polo",
  colorName: "Bottle Green", fit: "Relaxed", fabric: "Cotton piqué, 240 GSM",
  name: "Varsity Script Polo", category: "tshirts", price: 1299, mrp: 1299, color: "#1f4a33", shape: "polo",
  style: { body: "#1f4a33", collar: "#f1ece0", sleeve: "short", ... },
  sizes: ["S","M","L","XL","XXL"], tags: ["new","bestseller"], stock: 46, edition: 60, images: [], desc: "..." },
```

- **Real photos (the most important upgrade):** put them in the `images/` folder and list them as front, then back, e.g.
  `images: ["images/varsity-front.jpg", "images/varsity-back.jpg"]`. Until then, the site shows drawn product
  images built from the `style` colours. Use portrait photos (4:5 or 5:7, e.g. 1200×1680), JPG/WebP under ~300 KB each.
  Only use photos you took yourself or have permission to use. Don't use screenshots of other brands or creators.
- **Limited stock:** `stock` is units left and `edition` is units made. `stock: 0` shows "Sold out".
- **Price:** if `mrp` equals `price`, no discount is shown. Set `mrp` higher to show a struck-out price.
- **Discount codes:** `coupons: { BHAKSHI10: 10 }` means 10% off.

### Countdown to a drop
Set `drop.launch` to a date and time, e.g. `launch: "2026-11-01T19:00:00+05:30"`. The site then shows a live
countdown and locks buying until that moment. `launch: null` means the drop is live.

### Mix & Match (switched off for now)
The outfit builder, where customers pick a top and bottoms together, is built but hidden. When you start selling jeans,
joggers or other bottoms, add them as products and set `features: { mixAndMatch: true }`.
Menus also grow by themselves: a new category appears in the menu as soon as it has a product.

## 3. Try it on your computer

Double-click `index.html`. Or, for the most accurate preview, run this in a terminal inside this folder:

```bash
python3 -m http.server 8000
```

then open http://localhost:8000.

## 4. Put it online for free (GitHub Pages)

1. Create a free account at https://github.com.
2. Click **+ → New repository**, name it `bhakshi`, set it to **Public**, and click **Create repository**.
3. On the new repo page, click **"uploading an existing file"**. Drag **everything inside this folder**
   (index.html, css, js, images, …) into the page and click **Commit changes**.
4. Go to **Settings → Pages**. Under "Branch" choose **main** and **/ (root)**, then click **Save**.
5. Wait 1–2 minutes. Your store is live at **`https://YOUR-USERNAME.github.io/bhakshi/`**

To update the site later, upload the changed files again (for example `js/products.js`). The site refreshes in about a minute.

**Alternative:** on https://app.netlify.com/drop you can drag the folder in and get a link instantly. It's also free.

### Custom domain (optional, about ₹500–800/year)
Buy `bhakshi.in` (or similar) from GoDaddy, Hostinger, Namecheap etc. In GitHub, go to **Settings → Pages → Custom domain**,
type your domain, and follow the DNS instructions GitHub shows. HTTPS is free.

## 5. How an order works

1. The customer adds items to the bag, goes to checkout and enters their address.
2. They tap **Place order on WhatsApp**, and WhatsApp opens with the full order already typed (items, sizes, total, address).
   They press Send.
3. You confirm on WhatsApp. For UPI orders, they pay to your UPI ID or QR code and send you a screenshot.
4. Ship with any courier. Shiprocket, Delhivery or India Post work well, and Shiprocket has no monthly fee.

## Before you launch, check these
- [ ] WhatsApp number and UPI ID set in `js/products.js` (checkout is switched off until the WhatsApp number is set)
- [ ] Real tee names, prices, stock and photos in `js/products.js` (the 5 current tees are placeholder designs)
- [ ] Garment measurements on the home page size diagram (`SPEC_CHART` at the top of `js/home.js`) and the product size chart checked against your real tees
- [ ] Policies page (`policies.html`) reviewed and edited to match how you actually run the business
- [ ] For GST registration, invoicing and other legal requirements for your business, ask a CA

## Files
| File | What it is |
|---|---|
| `js/products.js` | **Your store settings and products** (edit this) |
| `index.html` | Home page |
| `shop.html` | All products, with filters |
| `product.html` | Single product page |
| `checkout.html` | Checkout (sends the order to WhatsApp) |
| `wishlist.html`, `about.html`, `contact.html`, `policies.html` | Other pages |
| `css/`, `js/` | Design and site code (no need to touch) |
| `images/` | Put your product photos here |
