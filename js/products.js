/* =========================================================
   BHAKSHI — STORE SETTINGS & PRODUCTS
   This is the ONLY file you need to edit to run your store.
   ========================================================= */

const STORE = {
  name: "BHAKSHI",
  tagline: "Everyday menswear, made for India",
  // Your WhatsApp number with country code, no + or spaces (e.g. 919876543210).
  // Checkout stays switched off until this is a valid Indian number.
  whatsapp: "",
  // Your UPI ID for payments (e.g. bhakshi@okaxis)
  upi: "yourname@upi",
  email: "hello@bhakshi.in",
  instagram: "https://instagram.com/",
  city: "India",
  freeShippingAbove: 999,   // ₹ — orders above this ship free
  shippingFee: 79,          // ₹ — charged below the free-shipping limit
  codFee: 49,               // ₹ — extra fee for Cash on Delivery (0 = free COD, -1 = turn COD off)
  announcement: [
    "FREE SHIPPING ON ORDERS ABOVE ₹999",
    "CASH ON DELIVERY AVAILABLE",
    "EASY 7-DAY EXCHANGE",
    "USE CODE BHAKSHI10 FOR 10% OFF YOUR FIRST ORDER"
  ],
  coupons: { BHAKSHI10: 10 }  // code: % off
};

/* Categories shown in the menu and on the home page.
   "group" decides which dropdown it appears in. */
const CATEGORIES = [
  { id: "tshirts",  name: "T-Shirts",       group: "Topwear" },
  { id: "shirts",   name: "Shirts",         group: "Topwear" },
  { id: "polos",    name: "Polos",          group: "Topwear" },
  { id: "kurtas",   name: "Kurtas",         group: "Topwear" },
  { id: "hoodies",  name: "Hoodies & Sweatshirts", group: "Winterwear" },
  { id: "jackets",  name: "Jackets",        group: "Winterwear" },
  { id: "jeans",    name: "Jeans",          group: "Bottoms" },
  { id: "trousers", name: "Trousers & Chinos", group: "Bottoms" },
  { id: "joggers",  name: "Joggers & Cargos", group: "Bottoms" },
  { id: "shorts",   name: "Shorts",         group: "Bottoms" },
  { id: "coords",   name: "Co-ord Sets",    group: "Co-ords" }
];

/* PRODUCTS
   - id: unique, no spaces
   - images: put photos in the /images folder and list them, e.g. ["images/tee-black-1.jpg"]
             leave [] to show an auto-drawn placeholder
   - shape: placeholder drawing used when there are no images
            (tee, shirt, polo, kurta, hoodie, jacket, pants, shorts, coord)
   - tags: "new", "bestseller", "sale" and moods "office", "casual", "athleisure", "festive"
   - family: products with the same family are colour options of each other (shown as swatches)
   - colorName / fit / fabric: shown on the product page and used by filters
   - stock: set to 0 to show "Sold Out"                                              */
const PRODUCTS = [
  { id: "classic-crew-tee-black", family: "classic-crew-tee", colorName: "Jet Black", fit: "Regular", fabric: "100% Combed Cotton, 180 GSM",
     name: "Classic Crew Tee — Jet Black", category: "tshirts", price: 499, mrp: 899,
    color: "#1c1c1c", shape: "tee", sizes: ["S","M","L","XL","XXL"], tags: ["bestseller","casual"], stock: 40,
    images: [], desc: "180 GSM combed cotton, regular fit. Soft, breathable and pre-shrunk — the tee you'll reach for every day." },
  { id: "oversized-tee-sand", family: "oversized-tee", colorName: "Sand", fit: "Oversized", fabric: "100% Cotton, 240 GSM",
     name: "Oversized Drop-Shoulder Tee — Sand", category: "tshirts", price: 649, mrp: 1099,
    color: "#cdb994", shape: "tee", sizes: ["S","M","L","XL"], tags: ["new","casual"], stock: 25,
    images: [], desc: "240 GSM heavyweight cotton with a relaxed, dropped shoulder. Holds its shape wash after wash." },
  { id: "classic-crew-tee-white", family: "classic-crew-tee", colorName: "Off White", fit: "Regular", fabric: "100% Combed Cotton, 180 GSM",
     name: "Classic Crew Tee — Off White", category: "tshirts", price: 499, mrp: 899,
    color: "#efebe2", shape: "tee", sizes: ["S","M","L","XL","XXL"], tags: ["bestseller","casual"], stock: 40,
    images: [], desc: "180 GSM combed cotton, regular fit. A clean wardrobe essential." },
  { id: "oxford-shirt-sky", family: "oxford-shirt", colorName: "Sky Blue", fit: "Regular", fabric: "100% Cotton Oxford",
     name: "Oxford Button-Down Shirt — Sky Blue", category: "shirts", price: 1199, mrp: 1899,
    color: "#9fbfdc", shape: "shirt", sizes: ["S","M","L","XL","XXL"], tags: ["bestseller","office"], stock: 30,
    images: [], desc: "100% cotton Oxford weave. Smart enough for office, relaxed enough for weekends." },
  { id: "linen-shirt-olive", family: "linen-shirt", colorName: "Olive", fit: "Regular", fabric: "55% Linen, 45% Cotton",
     name: "Linen Blend Shirt — Olive", category: "shirts", price: 1299, mrp: 2199,
    color: "#7a7f55", shape: "shirt", sizes: ["M","L","XL"], tags: ["new","casual"], stock: 18,
    images: [], desc: "Linen-cotton blend that stays cool in Indian summers. Regular fit, full sleeves." },
  { id: "formal-shirt-white", family: "formal-shirt", colorName: "White", fit: "Slim", fabric: "Cotton Blend, Easy-Iron",
     name: "Wrinkle-Free Formal Shirt — White", category: "shirts", price: 1099, mrp: 1799,
    color: "#f4f4f4", shape: "shirt", sizes: ["38","40","42","44","46"], tags: ["office"], stock: 35,
    images: [], desc: "Easy-iron cotton blend with a sharp collar. Your weekday workhorse." },
  { id: "pique-polo-navy", family: "pique-polo", colorName: "Navy", fit: "Regular", fabric: "100% Cotton Piqué",
     name: "Piqué Polo — Navy", category: "polos", price: 799, mrp: 1299,
    color: "#1f2b4a", shape: "polo", sizes: ["S","M","L","XL","XXL"], tags: ["bestseller","office","casual"], stock: 28,
    images: [], desc: "Classic cotton piqué polo with a ribbed collar. Smart-casual done right." },
  { id: "pique-polo-maroon", family: "pique-polo", colorName: "Maroon", fit: "Regular", fabric: "100% Cotton Piqué",
     name: "Piqué Polo — Maroon", category: "polos", price: 799, mrp: 1299,
    color: "#6b1f2a", shape: "polo", sizes: ["S","M","L","XL"], tags: ["sale"], stock: 12,
    images: [], desc: "Classic cotton piqué polo with a ribbed collar." },
  { id: "cotton-kurta-ivory", family: "cotton-kurta", colorName: "Ivory", fit: "Regular", fabric: "100% Cotton",
     name: "Cotton Straight Kurta — Ivory", category: "kurtas", price: 1199, mrp: 1999,
    color: "#ede3cc", shape: "kurta", sizes: ["S","M","L","XL","XXL"], tags: ["festive","new"], stock: 20,
    images: [], desc: "Breathable cotton kurta with a mandarin collar. Perfect for pujas, weddings and festive days." },
  { id: "short-kurta-mustard", family: "short-kurta", colorName: "Mustard", fit: "Regular", fabric: "100% Cotton",
     name: "Short Kurta — Mustard", category: "kurtas", price: 999, mrp: 1699,
    color: "#c9962c", shape: "kurta", sizes: ["M","L","XL"], tags: ["festive"], stock: 15,
    images: [], desc: "Hip-length cotton kurta. Pairs with jeans or chinos for an easy festive look." },
  { id: "slim-jeans-indigo", family: "slim-jeans", colorName: "Indigo", fit: "Slim", fabric: "98% Cotton, 2% Elastane Denim",
     name: "Slim Fit Stretch Jeans — Indigo", category: "jeans", price: 1499, mrp: 2499,
    color: "#2d3f6b", shape: "pants", sizes: ["28","30","32","34","36","38"], tags: ["bestseller","casual"], stock: 30,
    images: [], desc: "Stretch denim with a slim, comfortable fit. Mid-rise, 5-pocket styling." },
  { id: "relaxed-jeans-black", family: "relaxed-jeans", colorName: "Washed Black", fit: "Relaxed", fabric: "100% Cotton Denim",
     name: "Relaxed Straight Jeans — Washed Black", category: "jeans", price: 1599, mrp: 2599,
    color: "#2b2b2e", shape: "pants", sizes: ["30","32","34","36"], tags: ["new","casual"], stock: 22,
    images: [], desc: "Straight, relaxed leg with a soft washed finish." },
  { id: "chinos-khaki", family: "stretch-chinos", colorName: "Khaki", fit: "Slim", fabric: "97% Cotton, 3% Elastane Twill",
     name: "Stretch Chinos — Khaki", category: "trousers", price: 1199, mrp: 1999,
    color: "#b59e74", shape: "pants", sizes: ["28","30","32","34","36","38"], tags: ["office","bestseller"], stock: 26,
    images: [], desc: "Cotton stretch chinos with a tapered fit. Office to dinner." },
  { id: "formal-trouser-grey", family: "formal-trouser", colorName: "Charcoal", fit: "Regular", fabric: "Poly-Viscose Suiting",
     name: "Formal Trousers — Charcoal", category: "trousers", price: 1299, mrp: 2199,
    color: "#4a4b50", shape: "pants", sizes: ["30","32","34","36","38","40"], tags: ["office"], stock: 20,
    images: [], desc: "Flat-front formal trousers with a crease-resistant finish." },
  { id: "cargo-jogger-olive", family: "cargo-jogger", colorName: "Olive", fit: "Relaxed", fabric: "100% Cotton Twill",
     name: "Cargo Joggers — Olive", category: "joggers", price: 999, mrp: 1699,
    color: "#5c6142", shape: "pants", sizes: ["S","M","L","XL"], tags: ["new","athleisure"], stock: 24,
    images: [], desc: "Cotton twill joggers with utility cargo pockets and an elastic waist." },
  { id: "track-jogger-black", family: "track-jogger", colorName: "Black", fit: "Regular", fabric: "Cotton-Poly Knit",
     name: "Everyday Track Joggers — Black", category: "joggers", price: 799, mrp: 1299,
    color: "#1f1f1f", shape: "pants", sizes: ["S","M","L","XL","XXL"], tags: ["athleisure","bestseller"], stock: 40,
    images: [], desc: "Soft-touch knit joggers for gym, travel and lazy Sundays." },
  { id: "chino-shorts-navy", family: "chino-shorts", colorName: "Navy", fit: "Regular", fabric: "100% Cotton Twill",
     name: "Chino Shorts — Navy", category: "shorts", price: 699, mrp: 1199,
    color: "#25304d", shape: "shorts", sizes: ["28","30","32","34","36"], tags: ["casual","sale"], stock: 18,
    images: [], desc: "Above-knee cotton shorts for summer weekends." },
  { id: "zip-hoodie-grey", family: "zip-hoodie", colorName: "Grey Melange", fit: "Regular", fabric: "Brushed Fleece, 320 GSM",
     name: "Fleece Zip Hoodie — Grey Melange", category: "hoodies", price: 1399, mrp: 2299,
    color: "#9a9a9c", shape: "hoodie", sizes: ["S","M","L","XL","XXL"], tags: ["athleisure"], stock: 16,
    images: [], desc: "Brushed fleece interior, full-zip front and kangaroo pockets." },
  { id: "bomber-jacket-black", family: "bomber-jacket", colorName: "Black", fit: "Regular", fabric: "Nylon Shell, Poly Lining",
     name: "Bomber Jacket — Black", category: "jackets", price: 1999, mrp: 3499,
    color: "#232323", shape: "jacket", sizes: ["M","L","XL"], tags: ["new"], stock: 0,
    images: [], desc: "Lightweight bomber with ribbed cuffs. Ideal for Indian winters." },
  { id: "classic-crew-tee-olive", family: "classic-crew-tee", colorName: "Olive", fit: "Regular", fabric: "100% Combed Cotton, 180 GSM",
    name: "Classic Crew Tee — Olive", category: "tshirts", price: 499, mrp: 899,
    color: "#6b7048", shape: "tee", sizes: ["S","M","L","XL","XXL"], tags: ["casual"], stock: 30,
    images: [], desc: "180 GSM combed cotton, regular fit. Earthy olive that pairs with denim and khaki." },
  { id: "oxford-shirt-white", family: "oxford-shirt", colorName: "White", fit: "Regular", fabric: "100% Cotton Oxford",
    name: "Oxford Button-Down Shirt — White", category: "shirts", price: 1199, mrp: 1899,
    color: "#f6f5f1", shape: "shirt", sizes: ["S","M","L","XL","XXL"], tags: ["office"], stock: 26,
    images: [], desc: "100% cotton Oxford weave in crisp white. The one shirt every wardrobe needs." },
  { id: "pique-polo-white", family: "pique-polo", colorName: "White", fit: "Regular", fabric: "100% Cotton Piqué",
    name: "Piqué Polo — White", category: "polos", price: 799, mrp: 1299,
    color: "#f3f2ee", shape: "polo", sizes: ["S","M","L","XL","XXL"], tags: ["casual","office"], stock: 22,
    images: [], desc: "Classic cotton piqué polo with a ribbed collar." },
  { id: "chinos-navy", family: "stretch-chinos", colorName: "Navy", fit: "Slim", fabric: "97% Cotton, 3% Elastane Twill",
    name: "Stretch Chinos — Navy", category: "trousers", price: 1199, mrp: 1999,
    color: "#232d48", shape: "pants", sizes: ["28","30","32","34","36","38"], tags: ["office"], stock: 20,
    images: [], desc: "Cotton stretch chinos with a tapered fit. Office to dinner." },
  { id: "coord-set-beige", family: "resort-coord", colorName: "Beige", fit: "Relaxed", fabric: "Cotton-Linen Blend",
     name: "Resort Co-ord Set — Beige", category: "coords", price: 1799, mrp: 2999,
    color: "#d8c7a6", shape: "coord", sizes: ["S","M","L","XL"], tags: ["new","casual"], stock: 14,
    images: [], desc: "Matching short-sleeve shirt and drawstring trousers in breathable cotton-linen." }
];
