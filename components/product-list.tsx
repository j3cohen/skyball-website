"use client";

import { useInView } from "react-intersection-observer";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import GradientImageFrame from "@/components/gradient-image-frame";

export type ShopListProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  images: string[];
  priceCents: number;
  currency: string;
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export default function ProductList({ products }: { products: ShopListProduct[] }) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section ref={ref} className="py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {products.map((product, index) => (
          <div
            key={product.id}
            className={cn(
              "bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300",
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
            style={{ transitionDelay: `${index * 100}ms` }}
          >
            {/* ✅ Gradient frame replaces the old white image box */}
            <GradientImageFrame
              src={product.images[0] || "/placeholder.svg"}
              alt={product.name}
              aspectClassName="aspect-[4/3]"
              paddingClassName="p-6"
              className="rounded-none"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />

            <div className="p-6">
              <h3 className="text-xl font-bold mb-2">{product.name}</h3>
              <p className="text-gray-600 mb-4">{product.description ?? ""}</p>

              <div className="flex justify-between items-center">
                <span className="text-sky-600 font-bold">
                  {formatMoney(product.priceCents, product.currency)}
                </span>

                <Link href={`/products/${product.slug}`}>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
