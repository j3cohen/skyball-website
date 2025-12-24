import Navbar from "@/components/navbar"
import Hero from "@/components/hero"
import WhatIsSkyBall from "@/components/what-is-skyball"
import RulesOverview from "@/components/rules-overview"
import VideoSection from "@/components/video-section"
import Contact from "@/components/contact"
import BackToTop from "@/components/back-to-top"
import Footer from "@/components/footer"


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

