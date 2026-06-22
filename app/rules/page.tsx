import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import RulesContent from "@/components/rules-content"

import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "Rules",
  description: "Official SkyBall™ rules — court dimensions, scoring, serving, and gameplay for this fast-paced racket sport that blends tennis and pickleball.",
  path: "/rules",
  ogTitle: "SkyBall™ Rules — Official Rulebook",
})

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

