import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import RulesContent from "@/components/rules-content"

import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Rules",
  description: "SkyBall Rules",
  openGraph: {
    title: "SkyBall Rules",
    description: "SkyBall Rules",
    url: "https://skyball.com/rules",
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

