import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import RulesContent from "@/components/rules-content"

import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Rankings",
  description: "SkyBall Rankings",
  openGraph: {
    title: "Rankings",
    description: "SkyBall Rankings",
    url: "https://skyball.com/rankings",
  },
}

export default function RulesPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50">
        <RulesContent />
      </main>
      <Footer />
    </>
  )
}

