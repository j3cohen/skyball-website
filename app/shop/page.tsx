import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import ProductList from "@/components/product-list"

export default function ShopPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-center mb-12">SkyBall™ Shop</h1>
          <ProductList />
        </div>
      </main>
      <Footer />
    </>
  )
}

