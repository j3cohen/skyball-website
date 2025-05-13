import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import FAQContent from "@/components/faq-content"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently Asked Questions about SkyBall.",
  openGraph: {
    title: "FAQ",
    description: "Frequently Asked Questions about SkyBall.",
    url: "https://skyball.com/faq",
  },
}

export default function FAQPage() {
  return (
    <>
      <Navbar />
      <main>
        <FAQContent />
      </main>
      <Footer />
    </>
  )
}

