import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import RulesContent from "@/components/rules-content"

import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Rules",
  description: "Official SkyBall™ rules — court dimensions, scoring, serving, and gameplay for this fast-paced racket sport that blends tennis and pickleball.",
  alternates: { canonical: "https://skyball.us/rules" },
  openGraph: {
    title: "SkyBall™ Rules — Official Rulebook",
    description: "Official SkyBall™ rules — court dimensions, scoring, serving, and gameplay for this fast-paced racket sport that blends tennis and pickleball.",
    url: "https://skyball.us/rules",
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

