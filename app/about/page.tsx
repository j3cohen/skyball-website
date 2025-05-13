import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { AboutSection } from "@/components/about-section"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn more about SkyBall, the future of racket sports combining the best of Tennis and Pickleball.",
  openGraph: {
    title: "About Us",
    description: "Learn more about SkyBall, the future of racket sports combining the best of Tennis and Pickleball.",
    url: "https://skyball.com/about",
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

