// app/page.tsx
import type { Metadata } from "next"
import Navbar from "@/components/navbar"
import Hero from "@/components/hero"
import WhatIsSkyBall from "@/components/what-is-skyball"
import RulesOverview from "@/components/rules-overview"
import VideoSection from "@/components/video-section"
import Contact from "@/components/contact"
import BackToTop from "@/components/back-to-top"
import Footer from "@/components/footer"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "SkyBall™: tennis meets pickleball",
  description:
    "SkyBall™ is a fast, social racket sport that blends tennis and pickleball on a compact court with a foam ball. Learn the rules, watch highlights, and get started.",
  ogDescription:
    "A fast, social racket sport that blends tennis and pickleball. Learn the rules, watch highlights, and get started.",
})

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="overflow-hidden">
        <Hero />
        <WhatIsSkyBall />
        <RulesOverview />
        <VideoSection />
        <Contact />

        <BackToTop />
      </main>
      <Footer />
    </>
  )
}
