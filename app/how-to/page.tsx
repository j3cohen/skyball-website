import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import HowToPlay from "@/components/how-to-play"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "How to SkyBall",
  description: "Quick and easy guide on how to play SkyBall, the exciting new racket sport that combines elements of Tennis and Pickleball.",
  openGraph: {
    title: "How to SkyBall",
    description: "Quick and easy guide on how to play SkyBall, the exciting new racket sport that combines elements of Tennis and Pickleball.",
    url: "https://skyball.com/how-to",
  },
}

// app/how-to/page.tsx (or wherever HowToPlayPage lives)

export default function HowToPlayPage() {
  return (
    <>
      {/* Fixed header */}
      <Navbar />

      {/* Page wrapper ensures footer sticks to bottom and content starts below header */}
      <div className="flex min-h-screen flex-col bg-gray-50">
        {/* Spacer equal to Navbar height (h-16) so content isn't covered */}
        <div className="h-16 shrink-0" aria-hidden="true" />

        {/* Main content */}
        <main className="flex-1">
          <HowToPlay />
        </main>

        {/* Footer at bottom */}
        <Footer />
      </div>
    </>
  )
}

    

