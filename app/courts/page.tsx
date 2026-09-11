// app/courts/page.tsx
//
// Court finder: pickleball courts (SkyBall plays on any of them) from the
// committed Google Places snapshot in public/data/courts-US.json — regenerate
// with `npm run courts:fetch` (needs GOOGLE_MAPS_API_KEY). The map needs
// NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY; without it the list still works.

import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import CourtFinder, { type Court, type CourtsFile } from "@/components/court-finder"
import courtsFile from "@/public/data/courts-US.json"

import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "Find a Court",
  description:
    "Find pickleball courts near you to play SkyBall™ — public parks, clubs, and partner facilities across the US, with directions.",
  path: "/courts",
  ogTitle: "SkyBall™ Court Finder — Find a Court Near You",
})

export default function CourtsPage() {
  const file = courtsFile as CourtsFile
  const courts: Court[] = file.courts
  const browserKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? null

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 pt-24 pb-16">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm font-semibold uppercase tracking-wide text-sky-600">Courts</p>
          <h1 className="mt-2 text-center text-4xl font-bold text-[#01014c] md:text-5xl">Find a court near you</h1>
          <p className="mx-auto mt-4 mb-10 max-w-3xl text-center text-lg text-gray-600">
            SkyBall plays on any pickleball court. Search public parks, clubs, and partner facilities,
            then get directions.
          </p>
          <CourtFinder courts={courts} browserKey={browserKey} snapshotSource={file.source} />
        </div>
      </main>
      <Footer />
    </>
  )
}
