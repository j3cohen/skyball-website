import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { AboutSection } from "@/components/about-section"
import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "About SkyBall",
  description: "SkyBall™ is a fast-paced racket sport played on a compact court, combining the best of tennis and pickleball. Learn how it started, who plays it, and where it's headed.",
  path: "/about",
  ogTitle: "About SkyBall™ — The Sport That Blends Tennis & Pickleball",
})

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

