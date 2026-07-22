# Gift Guide implementation

Implemented in this repo:

- `sections/gift-guide-hero.liquid`
- `sections/gift-guide-grid.liquid`
- `assets/gift-guide.css`
- `assets/gift-guide.js`
- `templates/test.json`

## What was added

### Hero section
- editable top-left brand text
- editable top message
- editable top CTA
- editable heading, body, CTA, and bottom strip
- desktop/mobile image support
- button hover animation

### Grid section
- 6 product blocks
- each block supports:
  - product picker
  - lifestyle image override
  - hotspot X/Y positioning
- modal popup with:
  - product image
  - title
  - price
  - description
  - dynamic variant selectors
  - AJAX add to cart

### Auto-add rule
If the selected variant contains both:
- `Black`
- `Medium`

then the code also adds the configured companion product.

Notes:
- By default, it tries the product handle `soft-winter-jacket`.
- You can override that from the section setting **Soft Winter Jacket product**.

## Template used
The existing `templates/test.json` template now renders:
1. `gift-guide-hero`
2. `gift-guide-grid`

## What you need to configure in Shopify admin
1. Open the page using the `test` template.
2. In **Gift Guide Hero**, optionally replace the fallback theme banner image.
3. In **Gift Guide Grid**, pick 6 products.
4. For pixel-closer matching, upload the lifestyle grid images to each block via **Lifestyle image override**.
5. Set the companion product if the store handle is not `soft-winter-jacket`.
