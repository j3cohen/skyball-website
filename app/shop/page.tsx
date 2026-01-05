import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import ShopClient from "@/components/shop-client";
import { getSupabasePublic } from "@/lib/server/supabasePublic";
import type { ShopListProduct } from "@/components/product-list";
import { notFound } from "next/navigation";


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
  images: unknown; // will validate
  active: boolean;
  sort_order: number;
  kind: "base" | "bundle" | "addon";
  product_prices: PriceRow[] | null;
};

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) if (typeof x === "string") out.push(x);
  return out;
}

export default async function ShopPage() {
  const supabase = getSupabasePublic();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id,
      slug,
      name,
      description,
      images,
      active,
      sort_order,
      kind,
      product_prices (
        id,
        unit_amount,
        currency,
        active
      )
    `
    )
    .eq("active", true)
    .in("kind", ["base", "bundle"])
    .order("sort_order", { ascending: true });

  if (error) {
    // You can render a fallback UI instead if you prefer
    console.error("Shop fetch error:", error);
    notFound();
  }

  const rows: ProductRow[] = (data ?? []).map((p) => ({
    ...p,
    product_prices: Array.isArray(p.product_prices)
      ? p.product_prices
      : [],
  }));


  const products: ShopListProduct[] = rows
    .map((p) => {
      const prices = p.product_prices ?? [];
      const activePrice = prices.find((pr) => pr.active);
      if (!activePrice) return null;

      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        images: toStringArray(p.images),
        priceCents: activePrice.unit_amount,
        currency: activePrice.currency,
      };
    })
    .filter((x): x is ShopListProduct => x !== null);

  return (
    <>
      <Navbar />
      <ShopClient products={products} />
      <Footer />
    </>
  );
}
