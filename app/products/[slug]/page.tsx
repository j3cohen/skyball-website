import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import ProductImageGallery from "@/components/product-image-gallery";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AddToCart from "@/components/add-to-cart";

import { getSupabasePublic } from "@/lib/server/supabasePublic";

type PriceRow = {
  id: string; // product_prices.id (what we store in cart)
  unit_amount: number; // cents
  currency: string;
  active: boolean;
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  details: string | null;
  features: string[]; // text[]
  images: unknown; // jsonb
  active: boolean;
  kind: "base" | "addon" | "bundle";
  product_prices: PriceRow[] | null;
};

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) if (typeof x === "string") out.push(x);
  return out;
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
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

  return data as unknown as ProductRow;
}

export async function generateMetadata(
  props: { params: { slug: string } }
): Promise<Metadata> {
  const product = await fetchProductBySlug(props.params.slug);
  if (!product) return { title: "Product Not Found | SkyBall" };

  const title = `${product.name} | SkyBall`;
  const description =
    product.description ??
    "Shop SkyBall™ equipment and kits. Rally Ready.";

  const images = toStringArray(product.images);
  const ogImage = images.length ? images[0] : undefined;

  return {
    title,
    description,
    openGraph: ogImage
      ? { title, description, images: [{ url: ogImage }] }
      : { title, description },
  };
}

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await fetchProductBySlug(params.slug);
  if (!product) notFound();

  const images = toStringArray(product.images);

  const prices = product.product_prices ?? [];
  const activePrice = prices.find((p) => p.active) ?? null;
  if (!activePrice) notFound();

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-24">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/2">
                <ProductImageGallery images={images} alt={product.name} />
              </div>

              <div className="md:w-1/2 p-8">
                <div className="mb-8">
                  <h1 className="text-3xl font-bold mb-4">{product.name}</h1>

                  {product.description && (
                    <p className="text-gray-600 mb-6">{product.description}</p>
                  )}

                  <div className="text-2xl font-bold text-sky-600 mb-6">
                    {formatMoney(activePrice.unit_amount, activePrice.currency)}
                  </div>

                  <div className="border-t border-b py-4 my-6">
                    <h2 className="text-xl font-semibold mb-2">
                      Product Details
                    </h2>
                    <p className="text-gray-700">
                      {product.details ?? ""}
                    </p>

                    {product.features && product.features.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-lg font-semibold mb-2">
                          Key Features
                        </h3>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          {product.features.map((feat) => (
                            <li key={feat}>{feat}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    <AddToCart
                      priceRowId={activePrice.id}
                      label="Add to cart"
                      className="w-full md:w-auto"
                    />
                    <Link href="/cart">
                      <Button variant="outline" className="w-full md:w-auto">
                        View cart
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-2">
                    Shipping Information
                  </h3>
                  <p className="text-gray-700 mb-4">
                    Free shipping on all orders within the United States. Standard
                    delivery takes approximately 3-5 business days - we will send
                    tracking information when available. For international orders,
                    please contact{" "}
                    <a
                      href="mailto:info@skyball.us"
                      className="text-sky-600 hover:underline"
                    >
                      info@skyball.us
                    </a>
                    .
                  </p>

                  <h3 className="text-lg font-semibold mb-2">Returns</h3>
                  <p className="text-gray-700">
                    We offer a 30-day return policy for unused, unopened products
                    in original packaging only. Customers are responsible for return
                    shipping costs.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-8 mt-6">
              <Alert className="mb-12 border-sky-200 bg-sky-50">
                <AlertDescription className="text-center py-2">
                  <span className="font-semibold text-sky-800">
                    Terms and Conditions Apply
                  </span>{" "}
                  – By completing your purchase, you agree to our Terms and
                  Conditions.
                  <Link
                    href="/shop/terms-conditions"
                    className="text-sky-600 hover:text-sky-800 underline ml-1"
                  >
                    Terms and Conditions Apply
                  </Link>
                  .
                </AlertDescription>
              </Alert>
            </div>
          </div>

          <div className="mt-12 text-center">
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
