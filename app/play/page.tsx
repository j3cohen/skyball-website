// app/play/page.tsx

// option B: tell Next.js this route is fully dynamic
export const dynamic = "force-dynamic"


import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { PlayEvents } from "@/components/play-events"
//import { supabase } from "@/lib/supabaseClient"
//import { events as staticEvents, type Event as StaticEvent } from "@/data/events"
import { getAllTournaments } from "@/lib/tournaments"
//import { supabase } from "@/lib/supabaseClient"
//import { AuthSection } from "@/components/auth-section"
import { AuthCompact } from "@/components/auth-compact"



export default async function PlayPage() {
  const tournaments = await getAllTournaments()

  return (
    <>
      <Navbar />
      <div className="relative">
        <AuthCompact />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">
              Play SkyBall
            </h1>
            <p className="text-lg text-center text-gray-600 mb-12 max-w-3xl mx-auto">
              Join us for tournaments, clinics, open play sessions, and special events. Find the
              perfect way to experience SkyBall!
            </p>

            {/* now shows every static event + any DB updates */}

            <PlayEvents events={tournaments} />
        </div>
      </main>
      </div>
      <Footer />
    </>
  )
}
