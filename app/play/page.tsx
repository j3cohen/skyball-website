// app/play/page.tsx

// option B: tell Next.js this route is fully dynamic
export const dynamic = "force-dynamic"


import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { PlayEvents } from "@/components/play-events"
//import { supabase } from "@/lib/supabaseClient"
//import { events as staticEvents, type Event as StaticEvent } from "@/data/events"
import { getAllTournaments } from "@/lib/tournaments"
import { supabase } from "@/lib/supabaseClient"



export default async function PlayPage() {
  const { data: rawData, error: rawError } = await supabase
    .from("tournaments")
    .select("*")
  console.log("[PlayPage] supabase returned:", { rawData, rawError })
  const tournaments = await getAllTournaments()

  return (
    <>
      <Navbar />
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
          <h2 className="text-lg font-medium mb-2">❯ Supabase Raw Data</h2>
          <pre className="p-4 mb-8 bg-gray-100 rounded overflow-auto text-sm">
            {JSON.stringify({ rawError, rawData }, null, 2)}
          </pre>
          <PlayEvents events={tournaments} />
        </div>
      </main>
      <Footer />
    </>
  )
}
