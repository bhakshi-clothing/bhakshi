/* =========================================================
   BHAKSHI — STORE SETTINGS & PRODUCTS
   This is the ONLY file you need to edit to run your store.
   ========================================================= */

const STORE = {
  name: "BHAKSHI",
  tagline: "Printed by hand. Made in India.",
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
  drop: { number: "01", name: "First Light", launch: null },

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
   - family: products with the same family are colour options of each other (shown as swatches)
   - colorName / fit / fabric: shown on the product page
   - price / mrp: set mrp higher than price to show a discount; equal = no discount shown
   - images: put photos in the /images folder and list them, e.g. ["images/core-front.jpg", "images/core-back.jpg"]
             leave [] to show the drawn artwork instead
   - shape: drawing used when there are no images (tee, shirt, polo, kurta, hoodie, jacket, pants, shorts, coord)
   - print: graphic drawn on the front/back when there are no photos
            (core, monsoon, chai, express, hornok, "logo" = small chest logo, "" = plain)
   - techniques: how the tee is made/printed, shown under the name (e.g. "Screen print +1")
   - tags: "new", "bestseller", "sale" and moods "office", "casual", "athleisure", "festive"
   - stock: units left (0 = "Sold Out"); edition: total units made (shows "12 / 60 left")      */
const PRODUCTS = [
  { id: "core-tee-black", techniques: ["Screen print"], family: "core-tee", colorName: "Jet Black", fit: "Oversized", fabric: "100% Cotton, 240 GSM, bio-washed",
    name: "Core Tee", category: "tshirts", price: 899, mrp: 899,
    color: "#141414", shape: "tee", print: { front: "logo", back: "core" },
    sizes: ["S","M","L","XL","XXL"], tags: ["new","bestseller","casual"], stock: 48, edition: 60, images: [],
    desc: "The one that started it. Heavyweight 240 GSM cotton, dropped shoulders and a boxy oversized fit, with a small chest mark up front and the full BHAKSHI stack across the back." },
  { id: "monsoon-tee-slate", techniques: ["Screen print", "Puff print"], family: "monsoon-tee", colorName: "Slate", fit: "Oversized", fabric: "100% Cotton, 240 GSM, bio-washed",
    name: "Monsoon Season Tee", category: "tshirts", price: 999, mrp: 999,
    color: "#4a5561", shape: "tee", print: { front: "logo", back: "monsoon" },
    sizes: ["S","M","L","XL","XXL"], tags: ["new","casual"], stock: 31, edition: 50, images: [],
    desc: "For the four months the whole country waits for. Slate-washed heavyweight cotton with a rain-streak back graphic and a circular type lockup." },
  { id: "chai-tee-bone", techniques: ["Hand embroidery", "Screen print"], family: "chai-tee", colorName: "Bone", fit: "Oversized", fabric: "100% Cotton, 240 GSM, bio-washed",
    name: "Chai Break Tee", category: "tshirts", price: 999, mrp: 999,
    color: "#e8e0cf", shape: "tee", print: { front: "chai", back: "chai" },
    sizes: ["S","M","L","XL","XXL"], tags: ["new","casual"], stock: 22, edition: 50, images: [],
    desc: "4:00 PM is its own time zone. Bone-coloured heavyweight cotton with a line-drawn cutting-chai glass on the chest and the full break schedule on the back." },
  { id: "express-tee-brick", techniques: ["Screen print"], family: "express-tee", colorName: "Brick", fit: "Oversized", fabric: "100% Cotton, 240 GSM, bio-washed",
    name: "Night Express Tee", category: "tshirts", price: 999, mrp: 999,
    color: "#7a3426", shape: "tee", print: { front: "logo", back: "express" },
    sizes: ["S","M","L","XL","XXL"], tags: ["new"], stock: 12, edition: 40, images: [],
    desc: "Window seat, overnight, somewhere between two cities. Brick-dyed cotton with a route-map back print inspired by railway station boards." },
  { id: "hornok-tee-white", techniques: ["Screen print", "Hand painted", "Puff print"], family: "hornok-tee", colorName: "Optic White", fit: "Oversized", fabric: "100% Cotton, 240 GSM, bio-washed",
    name: "Horn OK Please Tee", category: "tshirts", price: 1099, mrp: 1099,
    color: "#f1f0ec", shape: "tee", print: { front: "logo", back: "hornok" },
    sizes: ["S","M","L","XL","XXL"], tags: ["new","bestseller"], stock: 9, edition: 40, images: [],
    desc: "A love letter to the back of every truck on the highway. Optic-white heavyweight cotton with a full-colour truck-art back panel." }
];
