import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { AboutSection } from "@/components/about-section"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "About SkyBall",
  description: "SkyBall™ is a fast-paced racket sport played on a compact court, combining the best of tennis and pickleball. Learn how it started, who plays it, and where it's headed.",
  alternates: { canonical: "https://skyball.us/about" },
  openGraph: {
    title: "About SkyBall™ — The Sport That Blends Tennis & Pickleball",
    description: "SkyBall™ is a fast-paced racket sport played on a compact court, combining the best of tennis and pickleball. Learn how it started, who plays it, and where it's headed.",
    url: "https://skyball.us/about",
  },
}

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <AboutSection/>
      </main>
      <Footer />
    </>
  )
}

