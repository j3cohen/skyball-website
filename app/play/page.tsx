// app/play/page.tsx
//
// Court finder first, events below. Courts come from the committed Google
// Places snapshot in public/data/courts-US.json — regenerate it with
// `npm run courts:fetch` (needs GOOGLE_MAPS_API_KEY, server-side only). The
// map itself needs NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY; without that key the
// page still renders the searchable list and every directions link.

export const dynamic = "force-dynamic"
export const revalidate = 0

import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { PlayEvents } from "@/components/play-events"
import CourtFinder from "@/components/court-finder"
import { getAllTournaments } from "@/lib/tournaments"
import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "Play SkyBall",
  description:
    "Find a pickleball court near you to play SkyBall™, plus open play sessions, tournaments, and events. Search public courts across the US and get directions.",
  path: "/play",
  ogTitle: "Play SkyBall™ — Find a Court Near You",
})

export default async function PlayPage() {
  const tournaments = await getAllTournaments()
  const browserKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? null

  return (
    <>
      <Navbar />
      <div className="relative">
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">Play SkyBall</h1>
            <p className="text-lg text-center text-gray-600 mb-12 max-w-3xl mx-auto">
              SkyBall plays on any pickleball court. Find one near you below, then join us for
              tournaments, open play sessions, clinics, and special events.
            </p>

            <section aria-labelledby="find-a-court" className="mb-16">
              <h2
                id="find-a-court"
                className="mb-2 text-2xl md:text-3xl font-bold text-center text-[#01014c]"
              >
                Find a court near you
              </h2>
              <p className="mx-auto mb-6 max-w-2xl text-center text-gray-600">
                Search public pickleball courts across the US, then get directions.
              </p>
              <CourtFinder courtsUrl="/data/courts-US.json" browserKey={browserKey} />
            </section>

            <section aria-labelledby="upcoming-events">
              <h2
                id="upcoming-events"
                className="mb-8 text-2xl md:text-3xl font-bold text-center text-[#01014c]"
              >
                Tournaments &amp; open play
              </h2>

              {/* now shows every static event + any DB updates */}
              <PlayEvents events={tournaments} />
            </section>
          </div>
        </main>
      </div>
      <Footer />
    </>
  )
}
