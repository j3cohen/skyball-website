"use client"
import { useInView } from "react-intersection-observer"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { products } from "@/data/products"

export default function FeaturedProducts() {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  // Only show the first 3 products on the featured section
  const featuredProducts = products.slice(0, 3)

  return (
    <section ref={ref} className="py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2
          className={cn(
            "text-3xl md:text-4xl font-bold text-center mb-12 transition-all duration-700 delay-100",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
          )}
        >
          Featured Products
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredProducts.map((product, index) => (
            <div
              key={product.id}
              className={cn(
                "bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300",
                inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
              )}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="relative h-48">
                <Image src={product.images[0] || "/placeholder.svg"} alt={product.name} fill className="object-cover" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">{product.name}</h3>
                <p className="text-gray-600 mb-4">{product.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sky-600 font-bold">${product.price.toFixed(2)}</span>
                  <Link href={`/products/${product.id}`}>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <Link href="/shop">
            <Button size="lg">View All Products</Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
