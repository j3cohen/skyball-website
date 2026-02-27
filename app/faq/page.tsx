import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import FAQContent from "@/components/faq-content"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently Asked Questions about SkyBall — equipment, rules, where to play, tournaments, and more.",
  alternates: { canonical: "https://skyball.us/faq" },
  openGraph: {
    title: "FAQ",
    description: "Frequently Asked Questions about SkyBall — equipment, rules, where to play, tournaments, and more.",
    url: "https://skyball.us/faq",
  },
}

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What equipment do I need to play SkyBall?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "To start playing SkyBall, you need SkyBalls (high density foam balls designed for optimal flight and control), a SkyBall racket (21 inch stringed racket), and a SkyBall net (a pickleball net can also be used).",
      },
    },
    {
      "@type": "Question",
      name: "Where can I play SkyBall?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "SkyBall can be played almost anywhere with a flat surface — indoor or outdoor. This includes public parks, school playgrounds, backyard spaces, and indoor gymnasiums.",
      },
    },
    {
      "@type": "Question",
      name: "How many players do I need for a game?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "SkyBall can be played in several formats: Singles (1v1) or Doubles (2v2).",
      },
    },
    {
      "@type": "Question",
      name: "Is SkyBall competitive?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "While SkyBall is fantastic for casual play, we're building a growing competitive scene with local tournaments, league play in select cities, annual championships, rating systems, and school and corporate tournaments.",
      },
    },
    {
      "@type": "Question",
      name: "What makes SkyBall different from other racket sports?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "SkyBall combines the best elements of various racket sports while eliminating common barriers to entry. The unique ball design and simplified rules make it easier to maintain rallies, while the smaller court size makes it more accessible. The sport emphasizes fun and strategic play with elements of placement, positioning, and control.",
      },
    },
    {
      "@type": "Question",
      name: "Are there health benefits to playing SkyBall?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes! SkyBall offers numerous health benefits including a full-body workout, improved hand-eye coordination, enhanced agility and reflexes, cardiovascular fitness, low-impact exercise that's easy on joints, and mental sharpness through strategic play.",
      },
    },
  ],
}

export default function FAQPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Navbar />
      <main>
        <FAQContent />
      </main>
      <Footer />
    </>
  )
}

