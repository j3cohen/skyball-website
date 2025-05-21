"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { X, AlertCircle } from "lucide-react"
import Link from "next/link"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import ProductList from "@/components/product-list"
import InfoRequestForm from "@/components/info-request-form"
import { Button } from "@/components/ui/button"
// import { Alert, AlertDescription } from "@/components/ui/alert"


export default function ShopPage() {
  const [showForm, setShowForm] = useState(false)

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">SkyBall™ Shop</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get everything you need to start playing SkyBall™. From individual rackets and balls to complete kits,
              we&apos;ve got you covered.
            </p>
          </div>

          {/* Pre-order Notice */}
          {/* <Alert className="mb-12 border-sky-200 bg-sky-50">
            <AlertCircle className="h-5 w-5 text-sky-600" />
            <AlertDescription className="text-center py-2">
              <span className="font-semibold text-sky-800">PRE-ORDER NOW</span> – Products should be available to ship
              before June 1. All pre-orders are automatically entered to win free SkyBall gear! Winners announced June
              3rd.
              <Link href="/giveaway-terms" className="text-sky-600 hover:text-sky-800 underline ml-1">
                Terms and conditions apply
              </Link>
              .
            </AlertDescription>
          </Alert> */}

          <ProductList />

          {/* CTA Button */}
          <div className="text-center mt-16 mb-8">
            <Button
              onClick={() => setShowForm(true)}
              className="bg-sky-600 hover:bg-sky-700 text-white text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Product Inquiries
            </Button>
          </div>
        </div>
      </main>
      <Footer />

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full relative"
          >
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              <X size={24} />
            </button>
            <InfoRequestForm subject="Product Inquiry" onClose={() => setShowForm(false)} />
          </motion.div>
        </div>
      )}
    </>
  )
}
