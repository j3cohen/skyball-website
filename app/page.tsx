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

const SITE_URL = "https://skyball.us"
const OG_IMAGE =
  "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/website-content/SkyBall_Home_Logo.jpg"

export const metadata: Metadata = {
  title: "SkyBall™: tennis meets pickleball",
  description:
    "SkyBall™ is a fast, social racket sport that blends tennis and pickleball on a compact court with a foam ball. Learn the rules, watch highlights, and get started.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    url: SITE_URL,
    title: "SkyBall™: tennis meets pickleball",
    description:
      "A fast, social racket sport that blends tennis and pickleball. Learn the rules, watch highlights, and get started.",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "SkyBall™ home" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SkyBall™: tennis meets pickleball",
    description:
      "A fast, social racket sport that blends tennis and pickleball. Learn the rules, watch highlights, and get started.",
    images: [OG_IMAGE],
  },
}

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
