import Navbar from "@/components/navbar"
import Hero from "@/components/hero"
import WhatIsSkyBall from "@/components/what-is-skyball"
import RulesOverview from "@/components/rules-overview"
import VideoSection from "@/components/video-section"
import Contact from "@/components/contact"
import BackToTop from "@/components/back-to-top"
import Footer from "@/components/footer"
import CourtConversionCallout from "@/components/court-conversion-callout"

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="overflow-hidden">
        <Hero />
        <WhatIsSkyBall />
        <CourtConversionCallout />
        <RulesOverview />
        <VideoSection />
        <Contact />
        <BackToTop />
      </main>
      <Footer />
    </>
  )
}

