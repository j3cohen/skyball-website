import Link from "next/link"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="min-h-[60vh] flex items-center justify-center bg-gray-50 px-4 py-24">
        <div className="text-center max-w-xl">
          <p className="text-sky-600 font-bold text-sm tracking-widest uppercase mb-4">404</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Page not found</h1>
          <p className="text-gray-600 mb-8">
            The page you&apos;re looking for doesn&apos;t exist or may have moved. Let&apos;s get you back in the game.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button size="lg">Back to Home</Button>
            </Link>
            <Link href="/shop">
              <Button size="lg" variant="outline">
                Visit the Shop
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
