/* =========================================================
   BHAKSHI — STORE SETTINGS & PRODUCTS
   This is the ONLY file you need to edit to run your store.
   ========================================================= */

const STORE = {
  name: "BHAKSHI",
  tagline: "Collared classics, made in India.",
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
    "Use code BHAKSHI10 for 10% off your first order",
    "Free shipping above Rs. 999 · Cash on Delivery available"
  ],
  coupons: { BHAKSHI10: 10 },  // code: % off

  // The current release. To run a countdown before launch, set launch to a date like
  // "2026-11-01T19:00:00+05:30". Buying stays locked until then. null = live now.
  drop: { number: "01", name: "The Club Edit", launch: null },

  // Switch features on/off. Turn mixAndMatch on once you sell bottoms (jeans, joggers…)
  // so customers can build a full outfit.
  features: { mixAndMatch: false },

  // Big website photos (campaign / lookbook shots). Put the files in /images and write the
  // path here, e.g. hero: "images/hero.jpg". Leave "" to show the drawn artwork instead.
  // Best sizes: hero 2400×1350 (wide), heroMobile 1080×1440 (tall), others 1600×2000 (portrait).
  campaign: {
    hero: "", heroMobile: "", banner: "", story: "", newsletter: ""
  },

  // Photos for the "Worn by you" section (customer or Instagram photos). Leave [] to hide it.
  // e.g. [{ image: "images/ig-1.jpg", name: "@rahul", product: "core-tee-black" }]
  community: []
};

/* Categories. The menu only shows categories that have at least one product,
   so new ones appear automatically when you add products to them. */
const CATEGORIES = [
  { id: "tshirts",  name: "Polo T-Shirts",  group: "Topwear" },
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
   - family: products with the same family are colour options of each other (shown as swatches)
   - colorName / fit / fabric: shown on the product page
   - price / mrp: set mrp higher than price to show a discount; equal = no discount shown
   - images: put photos in the /images folder and list them, front first, e.g. ["images/varsity-front.jpg", "images/varsity-back.jpg"]
             leave [] to show the drawn artwork instead
   - shape: drawing used when there are no images (polo = short-sleeve polo, rugby = long-sleeve rugby,
            knitpolo = knit polo with an open "johnny" collar; tee, shirt, hoodie… also work)
   - style: colours and details for the drawing — body, collar, sleeve ("short"/"long"), placket,
            stripes, sleeve tipping, chest graphic (script word or number)
   - techniques: how it's made, shown under the name (e.g. "Embroidery +1")
   - tags: "new", "bestseller", "sale" and moods "office", "casual", "athleisure", "festive"
   - stock: units left (0 = "Sold Out"); edition: total units made                              */
const PRODUCTS = [
  { id: "varsity-script-polo-green", techniques: ["Puff print", "Contrast collar"], family: "varsity-script-polo",
    colorName: "Bottle Green", fit: "Relaxed", fabric: "Cotton piqué, 240 GSM",
    name: "Varsity Script Polo", category: "tshirts", price: 1299, mrp: 1299, color: "#1f4a33", shape: "polo",
    style: { body: "#1f4a33", collar: "#f1ece0", sleeve: "short", placket: "button", knit: "pique",
             tipping: ["#f1ece0", "#1f4a33", "#f1ece0"],
             graphic: { kind: "script", text: "Bhakshi", sub: "MEMBERS · DROP 01", color: "#f1ece0", size: "large" } },
    sizes: ["S","M","L","XL","XXL"], tags: ["new","bestseller","casual"], stock: 46, edition: 60, images: [],
    desc: "A collegiate classic in deep bottle green. Breathable cotton piqué, a crisp cream collar with matching sleeve tipping, and the Bhakshi script raised across the chest in soft puff print." },
  { id: "juhu-club-polo-rose", techniques: ["Embroidery", "Contrast collar"], family: "juhu-club-polo",
    colorName: "Rose", fit: "Relaxed", fabric: "Cotton piqué, 240 GSM",
    name: "Juhu Club Polo", category: "tshirts", price: 1299, mrp: 1299, color: "#d4838a", shape: "polo",
    style: { body: "#d4838a", collar: "#f7f5f0", sleeve: "short", placket: "button", knit: "pique",
             tipping: ["#f7f5f0", "#d4838a", "#f7f5f0"],
             graphic: { kind: "script", text: "Juhu Club", sub: "SUNSET HOURS", color: "#f7f5f0", size: "large" } },
    sizes: ["S","M","L","XL","XXL"], tags: ["new","casual"], stock: 34, edition: 50, images: [],
    desc: "For evenings by the sea. Washed rose piqué with a bright white collar and tipped sleeves, finished with an embroidered Juhu Club script on the chest." },
  { id: "number-knit-polo-mustard", techniques: ["Felt appliqué", "Waffle knit"], family: "number-knit-polo",
    colorName: "Mustard", fit: "Relaxed", fabric: "Cotton waffle knit, 300 GSM",
    name: "Number 01 Knit Polo", category: "tshirts", price: 1699, mrp: 1699, color: "#ddb12f", shape: "knitpolo",
    style: { body: "#ddb12f", collar: "#ddb12f", sleeve: "long", placket: "johnny", knit: "waffle",
             graphic: { kind: "number", text: "01", sub: "BHAKSHI", color: "#23262e", size: "large" } },
    sizes: ["S","M","L","XL","XXL"], tags: ["new","casual"], stock: 22, edition: 40, images: [],
    desc: "Warm mustard waffle knit with an open johnny collar and long sleeves. A felt-appliqué 01 on the chest marks our first drop." },
  { id: "coastline-stripe-polo", techniques: ["Yarn-dyed stripes", "Rib knit"], family: "coastline-stripe-polo",
    colorName: "Chalk / Navy", fit: "Relaxed", fabric: "Cotton rib knit, 280 GSM",
    name: "Coastline Stripe Knit Polo", category: "tshirts", price: 1599, mrp: 1599, color: "#f2f0ea", shape: "rugby",
    style: { body: "#f2f0ea", collar: "#f2f0ea", sleeve: "long", placket: "button", knit: "rib",
             stripes: { area: "full", colors: ["#26324d", "#7d2a33"], width: 3, spacing: 26 } },
    sizes: ["S","M","L","XL","XXL"], tags: ["new","office","casual"], stock: 30, edition: 50, images: [],
    desc: "Chalk-white rib knit with fine navy and maroon pinstripes from collar to cuff. Long sleeves, a soft knitted collar, and easy enough for the office or the weekend." },
  { id: "heritage-rugby-navy", techniques: ["Yarn-dyed stripes", "Twill collar"], family: "heritage-rugby",
    colorName: "Navy / Maroon", fit: "Relaxed", fabric: "Heavy cotton jersey, 300 GSM",
    name: "Heritage Rugby Polo", category: "tshirts", price: 1799, mrp: 1799, color: "#1c2238", shape: "rugby",
    style: { body: "#1c2238", collar: "#f4f1ea", sleeve: "long", placket: "button", knit: "jersey",
             stripes: { area: "full", colors: ["#7a2430", "#f4f1ea"], width: 7, spacing: 34 } },
    sizes: ["S","M","L","XL","XXL"], tags: ["new","bestseller","casual"], stock: 18, edition: 40, images: [],
    desc: "Built like the old rugby jerseys. Heavy 300 GSM cotton in deep navy with maroon and white bands, a sturdy white twill collar and long sleeves." },
  { id: "crimson-club-rugby", techniques: ["Yarn-dyed stripes", "Embroidery"], family: "crimson-club-rugby",
    colorName: "Crimson / Cocoa", fit: "Relaxed", fabric: "Heavy cotton jersey, 260 GSM",
    name: "Crimson Club Rugby", category: "tshirts", price: 1499, mrp: 1499, color: "#a3222b", shape: "polo",
    style: { body: "#a3222b", collar: "#f4f1ea", sleeve: "short", placket: "button", knit: "jersey",
             stripes: { area: "bands", colors: ["#4a2b22", "#efe6d3", "#4a2b22"], width: 10, spacing: 46 },
             graphic: { kind: "script", text: "Bhakshi", color: "#efe6d3", size: "small" } },
    sizes: ["S","M","L","XL","XXL"], tags: ["new","casual"], stock: 9, edition: 40, images: [],
    desc: "Crimson short-sleeve rugby with cocoa and cream bands, a white collar and a small embroidered Bhakshi script over the heart." }
];
