# BHAKSHI store — notes for Claude

BHAKSHI is an Indian label selling collared polo T-shirts and rugby shirts. This repo is its online store:
a static site (plain HTML/CSS/JS, no build step, no npm) published by GitHub Pages at
https://bhakshi-clothing.github.io/bhakshi/ from the `main` branch. Pushing to `main` redeploys in about a minute.

## Where things are
- `js/products.js`: **all store settings and products** (WhatsApp number, UPI ID, coupons, drop info,
  feature flags, campaign photo slots, the 6 polos). Most owner requests are edits here.
- `ARCHITECTURE.md`: the shared JS/CSS API and the design contract. Read it before changing code.
- `README.md`: plain-language instructions for the owner.
- `js/art.js` draws product images when a product has no photos. Real photos go in `images/` and are listed in a product's `images`.

## Rules
- **Design:** clean, white, minimal, photo-led premium streetwear (v3). The owner rejected a warm serif
  look and a dark neon look, and dislikes truck-art style graphics ("Horn OK Please"). Don't bring those back.
  If asked to restyle, ask for a reference link or screenshots before guessing.
- **Originality:** never use other brands' or creators' photos, logos, text or graphics on the site, even if the
  owner shares them as references. Use them only for garment-type cues.
- `STORE.features.mixAndMatch` stays `false` until the store sells bottoms. Keep that code.
- Checkout must keep blocking orders while `STORE.whatsapp` isn't a valid `91XXXXXXXXXX` number.
- All paths stay relative, because the site lives at the `/bhakshi/` sub-path.
- Don't invent reviews, ratings, customer counts, press or celebrity endorsements.
- Git commits use the account's GitHub noreply email, never a work email.

## Workflow for change requests
1. Make the change.
2. Preview with `python3 -m http.server 8765` and open http://localhost:8765, or ask the owner to check.
3. Test pages at desktop and phone widths for console errors and horizontal scroll.
4. Once the owner is happy, commit and push to `main`.
