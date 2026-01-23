// app/products/[slug]/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import ProductImageGallery from "@/components/product-image-gallery";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AddToCart from "@/components/add-to-cart";
import { AddonAddToCart } from "@/components/addon-add-to-cart";

import { getSupabasePublic } from "@/lib/server/supabasePublic";

import { ProductDetailsText } from "@/components/product-details-text";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProductKind = "base" | "addon" | "bundle";

type PriceRow = {
  id: string;
  unit_amount: number;
  currency: string;
  active: boolean;
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  details: string | null;
  features: string[];
  images: string[];
  active: boolean;
  kind: ProductKind;
  product_prices: PriceRow[];
};

type AddonCard = {
  productId: string;
  slug: string;
  name: string;
  description: string | null;
  priceRowId: string;
  unit_amount: number;
  currency: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isProductKind(v: unknown): v is ProductKind {
  return v === "base" || v === "addon" || v === "bundle";
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) if (typeof x === "string") out.push(x);
  return out;
}

function toTextArray(v: unknown): string[] {
  return toStringArray(v);
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function parsePriceRow(v: unknown): PriceRow | null {
  if (!isRecord(v)) return null;
  const id = v.id;
  const unit_amount = v.unit_amount;
  const currency = v.currency;
  const active = v.active;

  if (typeof id !== "string") return null;
  if (typeof unit_amount !== "number") return null;
  if (typeof currency !== "string") return null;
  if (typeof active !== "boolean") return null;

  return { id, unit_amount, currency, active };
}

function parseProductRow(v: unknown): ProductRow | null {
  if (!isRecord(v)) return null;

  const id = v.id;
  const slug = v.slug;
  const name = v.name;
  const description = v.description;
  const details = v.details;
  const features = v.features;
  const images = v.images;
  const active = v.active;
  const kind = v.kind;
  const product_prices = v.product_prices;

  if (typeof id !== "string") return null;
  if (typeof slug !== "string") return null;
  if (typeof name !== "string") return null;
  if (!(description === null || typeof description === "string")) return null;
  if (!(details === null || typeof details === "string")) return null;
  if (typeof active !== "boolean") return null;
  if (!isProductKind(kind)) return null;

  const parsedPrices: PriceRow[] = Array.isArray(product_prices)
    ? product_prices
        .map(parsePriceRow)
        .filter((x): x is PriceRow => x !== null)
    : [];

  return {
    id,
    slug,
    name,
    description,
    details,
    features: toTextArray(features),
    images: toStringArray(images),
    active,
    kind,
    product_prices: parsedPrices,
  };
}

async function fetchProductBySlug(slug: string): Promise<ProductRow | null> {
  const supabase = getSupabasePublic();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
        id,
        slug,
        name,
        description,
        details,
        features,
        images,
        active,
        kind,
        product_prices (
          id,
          unit_amount,
          currency,
          active
        )
      `
    )
    .eq("slug", slug)
    .eq("active", true)
    .single();

  if (error || !data) return null;

  return parseProductRow(data);
}

type AddonJoinRaw = {
  addon_product: unknown;
};

function parseAddonCardRow(v: unknown): AddonCard | null {
  if (!isRecord(v)) return null;

  const addon_product = v.addon_product;
  const prod = parseProductRow(addon_product);
  if (!prod) return null;

  if (!prod.active || prod.kind !== "addon") return null;

  const activePrice = prod.product_prices.find((p) => p.active) ?? null;
  if (!activePrice) return null;

  return {
    productId: prod.id,
    slug: prod.slug,
    name: prod.name,
    description: prod.description,
    priceRowId: activePrice.id,
    unit_amount: activePrice.unit_amount,
    currency: activePrice.currency,
  };
}

async function fetchAllowedAddons(baseProductId: string): Promise<AddonCard[]> {
  const supabase = getSupabasePublic();

  const { data, error } = await supabase
    .from("product_addons")
    .select(
      `
        addon_product:products!product_addons_addon_product_id_fkey (
          id,
          slug,
          name,
          description,
          details,
          features,
          images,
          active,
          kind,
          product_prices (
            id,
            unit_amount,
            currency,
            active
          )
        )
      `
    )
    .eq("base_product_id", baseProductId);

  if (error || !data) return [];

  const raw: unknown = data;
  const arr: unknown[] = Array.isArray(raw) ? raw : [];

  return arr
    .map((row) => parseAddonCardRow(row as unknown as AddonJoinRaw))
    .filter((x): x is AddonCard => x !== null);
}

export async function generateMetadata(
  props: { params: { slug: string } }
): Promise<Metadata> {
  const product = await fetchProductBySlug(props.params.slug);
  if (!product) return { title: "Product Not Found | SkyBall" };

  const title = `${product.name} | SkyBall`;
  const description =
    product.description ?? "Shop SkyBall™ equipment and kits. Rally Ready.";

  const ogImage = product.images.length ? product.images[0] : undefined;

  return {
    title,
    description,
    openGraph: ogImage
      ? { title, description, images: [{ url: ogImage }] }
      : { title, description },
  };
}

function isGripAddon(slug: string): boolean {
  return (
    slug === "professional-over-grip-skyball" ||
    slug === "professional-over-grips-skyball-2-pack" ||
    slug === "professional-over-grips-skyball-4-pack"
  );
}

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await fetchProductBySlug(params.slug);
  if (!product) notFound();

  const activePrice = product.product_prices.find((p) => p.active) ?? null;
  if (!activePrice) notFound();

  const addons =
    product.kind === "base" || product.kind === "bundle"
      ? await fetchAllowedAddons(product.id)
      : [];

  // Separate grips from other add-ons
  const gripAddons = addons.filter((a) => isGripAddon(a.slug));
  const otherAddons = addons.filter((a) => !isGripAddon(a.slug));

  const allImages = toStringArray(product.images);
  const galleryImages = allImages.length > 1 ? allImages.slice(1) : allImages;

  // Product details component (reused in two places conditionally)
  const ProductDetailsSection = ({ className = "" }: { className?: string }) => (
    <div className={className}>
      <details className="group" open>
        <summary className="text-lg font-semibold cursor-pointer list-none flex items-center justify-between">
          Product Details
          <svg
            className="w-5 h-5 text-gray-500 transition-transform group-open:rotate-180"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="mt-3">
          {product.details && (
            <div className="text-gray-700">
              <ProductDetailsText text={product.details} />
            </div>
          )}

          {product.features.length > 0 && (
            <div className="mt-4">
              <h3 className="text-base font-semibold mb-2">Key Features</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                {product.features.map((feat) => (
                  <li key={feat}>{feat}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>

      <details className="border-t pt-4 mt-4 group">
        <summary className="text-lg font-semibold cursor-pointer list-none flex items-center justify-between">
          Shipping & Returns
          <svg
            className="w-5 h-5 text-gray-500 transition-transform group-open:rotate-180"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="mt-3 text-sm text-gray-700 space-y-3">
          <p>
            <span className="font-medium">Shipping:</span> Free shipping on all orders within the United States. 
            Standard delivery takes 3-5 business days. For international orders, contact{" "}
            <a href="mailto:info@skyball.us" className="text-sky-600 hover:underline">
              info@skyball.us
            </a>.
          </p>
          <p>
            <span className="font-medium">Returns:</span> 30-day return policy for unused, unopened products 
            in original packaging. Customer responsible for return shipping.
          </p>
        </div>
      </details>
    </div>
  );

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-24">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-xl shadow-lg">
            <div className="md:flex">
              {/* Left column: Gallery + Product Details (on wide screens) */}
              <div className="md:w-1/2 flex flex-col">
                <ProductImageGallery images={galleryImages} alt={product.name} />
                
                {/* Product Details - shown here on md+ screens */}
                <ProductDetailsSection className="hidden md:block p-6 border-t flex-1" />
              </div>

              {/* Right column: Title, Price, CTAs, Add-ons */}
              <div className="md:w-1/2 p-6 md:p-8 md:border-l">
                <div className="mb-6">
                  <h1 className="text-2xl md:text-3xl font-bold mb-3">{product.name}</h1>

                  {product.description && (
                    <p className="text-gray-600 mb-4">{product.description}</p>
                  )}

                  <div className="text-2xl font-bold text-sky-600 mb-4">
                    {formatMoney(activePrice.unit_amount, activePrice.currency)}
                  </div>
                </div>

                {/* Main CTA Section */}
                <div className="border rounded-lg p-4 bg-gray-50 mb-6">
                  {/* Grip upsell - ABOVE main add to cart */}
                  {gripAddons.length > 0 && (
                    <div className="mb-4 pb-4 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        Enhance your grip
                      </p>
                      <div className="space-y-3">
                        {gripAddons.map((a) => (
                          <div
                            key={a.priceRowId}
                            className="flex items-center justify-between gap-3 bg-white rounded-lg p-3 border"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-sm leading-tight">
                                {a.name}
                              </div>
                              <div className="text-sm text-sky-600 font-semibold mt-0.5">
                                {formatMoney(a.unit_amount, a.currency)}
                              </div>
                            </div>
                            <div className="shrink-0">
                              <AddonAddToCart
                                priceRowId={a.priceRowId}
                                addonSlug={a.slug}
                                label="Add"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <AddToCart
                      priceRowId={activePrice.id}
                      label="Add to cart"
                      className="w-full text-base py-3"
                    />
                    <Link href="/cart" className="w-full">
                      <Button variant="outline" className="w-full">
                        View cart
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Other Add-ons (bags, etc.) - compact row */}
                {otherAddons.length > 0 && (
                  <div className="mb-6">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Frequently bought together
                    </p>
                    <div className="space-y-2">
                      {otherAddons.map((a) => (
                        <div
                          key={a.priceRowId}
                          className="flex items-center justify-between gap-3 border rounded-lg p-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm">{a.name}</div>
                            <div className="text-sm text-sky-600 font-semibold">
                              {formatMoney(a.unit_amount, a.currency)}
                            </div>
                          </div>
                          <div className="shrink-0">
                            <AddonAddToCart
                              priceRowId={a.priceRowId}
                              addonSlug={a.slug}
                              label="Add"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Product Details - shown here on mobile only (below add-ons) */}
                <ProductDetailsSection className="md:hidden border-t pt-4 mt-4" />
              </div>
            </div>
          </div>

          {/* Terms alert - outside the white card */}
          <Alert className="mt-6 border-sky-200 bg-sky-50">
            <AlertDescription className="text-center py-2 text-sm">
              <span className="font-semibold text-sky-800">
                Terms and Conditions Apply
              </span>{" "}
              – By completing your purchase, you agree to our{" "}
              <Link
                href="/shop/terms-conditions"
                className="text-sky-600 hover:text-sky-800 underline"
              >
                Terms and Conditions
              </Link>
              .
            </AlertDescription>
          </Alert>

          <div className="mt-8 text-center">
            <Link href="/shop">
              <Button variant="outline">Back to Shop</Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}