# Admin: Products (shop catalog editor)

Added 2026-10-12. The admin app (`admin/`, deployed separately) has a **Products** section for
editing the skyball.us shop catalog without touching the Supabase dashboard:

- `/products` — every product (active and inactive), first-image thumbnail, kind, visibility, and a
  "no active price · hidden on site" warning. **New product** creates an inactive, image-less row.
- `/products/[id]` — three cards:
  - **Images** — ordered list of image URLs with live thumbnails; drag the handle or use ↑/↓ to
    reorder, ✕ to remove, paste one or many URLs to add. Saved as the `products.images` jsonb array.
  - **Details** — name, slug, kind, SKU, sort order, active, description, details, features
    (one per line → `text[]`).
  - **Price** — read-only list of `product_prices` rows. Prices are Stripe price rows and are
    deliberately not editable here.

The public site reads the same rows (`app/shop/page.tsx`, `app/products/[slug]/page.tsx`) with
`force-dynamic`, so a save is live on the next page load. Nothing on the site changed for this.

## Photo workflow (files stay in S3)

Image *files* are not uploaded through the admin. The row only stores URLs.

1. Upload the file to the S3 bucket `jbcpublicbucket` under `skyball-shop/` (AWS console),
   public-read, and copy its object URL
   (`https://jbcpublicbucket.s3.us-east-1.amazonaws.com/skyball-shop/<file>`).
2. Open the product in the admin, paste the URL into the Images card, order it, **Save images**.

Allowed hosts are the ones in `images.domains` of the root `next.config.js` (S3 bucket + the old
Vercel blob host) — mirrored in `admin/lib/product-admin.ts` `ALLOWED_IMAGE_HOSTS`. The API accepts
any `https://` URL, but the editor warns on other hosts because `next/image` on the site refuses
to render them. The admin CSP (`admin/next.config.mjs`, `img-src`) lists the same hosts so the
previews load.

## Rules the site imposes (the admin only explains them)

- **Image 1 is the shop tile.** When a product has more than one image, the product page gallery
  shows images 2 onward (`galleryImages = allImages.slice(1)` in `app/products/[slug]/page.tsx`).
- **No active price → not listed.** The shop and product pages drop products without an active
  `product_prices` row. New products stay invisible until a price row exists, even when active.
- **Slug = public URL.** Changing it breaks links/QR codes; the editor asks for confirmation.

## Code

- API: `admin/app/api/admin/products/route.ts` (GET list, POST create),
  `admin/app/api/admin/products/[id]/route.ts` (GET, PATCH). Auth + rate limit via
  `guardCertAdmin()` (generic admin guard despite the name); writes via the service-role `certDb`.
- Validation: `admin/lib/server/productGuard.ts` — https-only image URLs (≤50, ≤2000 chars),
  slug normalization, kind enum, features list, unique-violation → 409.
- UI: `admin/components/image-list-editor.tsx` (ported from the redesign admin),
  `products-table.tsx`, `product-editor.tsx`; shared types/helpers in `admin/lib/product-admin.ts`.
- No schema change; no DELETE (orders reference products — set inactive instead).
