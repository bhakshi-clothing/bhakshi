# BHAKSHI — Men's Clothing Store

A complete online store that costs **₹0/month** to run.
Customers browse, add to bag, and check out. The order arrives in **your WhatsApp**, and they pay by **UPI** or **Cash on Delivery**.

---

## 1. Set up your store (5 minutes)

Open `js/products.js` in any text editor (VS Code, or even TextEdit) and change the top section:

```js
whatsapp: "919999999999",   // ← your WhatsApp number: 91 + 10 digits, no spaces or +
upi: "yourname@upi",        // ← your UPI ID (from GPay / PhonePe / Paytm)
email: "hello@bhakshi.in",
instagram: "https://instagram.com/yourhandle",
```

**This is the only file you need to edit.** Everything else updates automatically.

## 2. Add or edit products

In the same file, each product looks like this:

```js
{ id: "oxford-shirt-sky", family: "oxford-shirt", colorName: "Sky Blue", fit: "Regular", fabric: "100% Cotton Oxford",
  name: "Oxford Button-Down Shirt — Sky Blue", category: "shirts", price: 1199, mrp: 1899,
  color: "#9fbfdc", shape: "shirt", sizes: ["S","M","L","XL","XXL"], tags: ["bestseller","office"], stock: 30,
  images: [], desc: "..." },
```

- **Adding real photos:** put photos in the `images/` folder and list them, e.g.
  `images: ["images/oxford-sky-front.jpg", "images/oxford-sky-back.jpg"]`.
  Until you add photos, the site shows a drawn illustration of the garment instead.
  Use portrait photos (4:5, e.g. 1200×1500), saved as JPG/WebP under ~300 KB each.
- **Selling out:** set `stock: 0` to show "Sold Out".
- **Colour options:** give products the same `family` to show them as colour swatches of each other.
- **Where products appear:** `tags` decide this. `new` puts a product in New In, `bestseller` in Bestsellers, and `sale` in Sale. The occasion tags are `office`, `casual`, `athleisure` and `festive`.
- **Discount codes:** add them in `coupons: { BHAKSHI10: 10 }`, which means 10% off.

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
- [ ] Real products, prices and photos added
- [ ] Sample customer testimonials on the home page **replaced with real reviews**. Showing made-up reviews isn't allowed under Indian consumer rules.
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
