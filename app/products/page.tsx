"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import InfoRequestForm from "@/components/info-request-form"
import { X } from "lucide-react"

export default function ProductsPage() {
  const [showForm, setShowForm] = useState(false)

  return (
    <>
      <Navbar />
      <main className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-center mb-8">SkyBall&trade; Products</h1>
          <p className="text-xl text-center text-gray-600 mb-12 max-w-3xl mx-auto">
            Our official SkyBall&trade; equipment is coming soon! Sign up below to stay updated on product availability and exclusive deals.
          </p>

          {/* Information Section */}
          <div className="bg-white rounded-xl shadow-md p-8 mb-16">
            <h2 className="text-2xl font-bold mb-4">Premium SkyBall&trade; Equipment</h2>
            <p className="mb-4">
              We&apos;re working hard to bring you the highest quality SkyBall&trade; equipment, designed specifically for optimal performance and durability.
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4">
              <li>
                <strong>SkyBall&trade; Rackets:</strong> 21-inch stringed rackets with perfect balance and control.
              </li>
              <li>
                <strong>SkyBall&trade; Balls:</strong> High-density foam balls designed for optimal flight and control.
              </li>
              <li>
                <strong>SkyBall&trade; Nets:</strong> Regulation nets that are portable and easy to set up.
              </li>
            </ul>
            <p>
              Sign up to be notified when our products become available and receive exclusive early-access deals!
            </p>
          </div>

          {/* CTA Button */}
          <div className="text-center mb-16">
            <Button
              onClick={() => setShowForm(true)}
              className="bg-sky-600 hover:bg-sky-700 text-white text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Get Notified When Available
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
            <InfoRequestForm subject="Purchase Inquiry" onClose={() => setShowForm(false)} />
          </motion.div>
        </div>
      )}
    </>
  )
}
