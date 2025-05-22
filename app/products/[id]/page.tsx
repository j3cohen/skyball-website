import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { products } from "@/data/products"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import ProductImageGallery from "@/components/product-image-gallery"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function ProductPage({ params }: { params: { id: string } }) {
  const product = products.find((p) => p.id === params.id)

  if (!product) {
    notFound()
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-24">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/2">
                <ProductImageGallery images={product.images} alt={product.name} />
              </div>
              <div className="md:w-1/2 p-8">
                <div className="mb-8">
                  <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
                  <p className="text-gray-600 mb-6">{product.description}</p>
                  <div className="text-2xl font-bold text-sky-600 mb-6">${product.price.toFixed(2)}</div>
                  <div className="border-t border-b py-4 my-6">
                    <h2 className="text-xl font-semibold mb-2">Product Details</h2>
                    <p className="text-gray-700">{product.details}</p>
                  </div>

                  {product.stripeLink ? (
                    <a href={product.stripeLink} target="_blank" rel="noopener noreferrer">
                      <Button size="lg" className="w-full md:w-auto">
                        Buy Now
                      </Button>
                    </a>
                  ) : (
                    <Button size="lg" className="w-full md:w-auto">
                      Coming Soon
                    </Button>
                  )}
                </div>

                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-2">Shipping Information</h3>
                  <p className="text-gray-700 mb-4">
                    Free shipping on all orders within the United States. Standard delivery takes approximately 3-5 business days - we will send tracking information when available. For
                    international orders, please contact us at{" "}
                    <a href="mailto:info@skyball.us" className="text-sky-600 hover:underline">
                      info@skyball.us
                    </a>
                    .
                  </p>

                  <h3 className="text-lg font-semibold mb-2">Returns</h3>
                  <p className="text-gray-700">
                    We offer a 30-day return policy for unused, unopened products in original packaging only. Customers
                    are responsible for return shipping costs.
                  </p>
                </div>

              </div>
            </div>
            {/* terms and conditions apply */}
            <Alert className="mb-12 border-sky-200 bg-sky-50">
              <AlertCircle className="h-5 w-5 text-sky-600" />
              <AlertDescription className="text-center py-2">
                <span className="font-semibold text-sky-800">Terms and Conditions</span> – By completing your purchase, you agree to our Terms and Conditions. Please review them before checking out.
                <Link href="/shop/terms-conditions" className="text-sky-600 hover:text-sky-800 underline ml-1">
                  Terms and conditions apply
                </Link>
                .
              </AlertDescription>
            </Alert>
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
  )
}
