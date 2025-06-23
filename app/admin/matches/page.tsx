import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import MatchList from "@/components/admin/match-list"
import MatchForm from "@/components/admin/match-form"

export default async function MatchesPage() {
  const supabase = createServerComponentClient({ cookies })

  const [{ data: matches }, { data: tournaments }, { data: players }] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "*, tournament:tournaments(name), player1:players!player1_id(name), player2:players!player2_id(name), winner:players!winner_id(name)",
      ),
    supabase.from("tournaments").select("id, name"),
    supabase.from("players").select("id, name"),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Matches</h2>
        <MatchList matches={matches || []} />
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Create Match</h2>
        <MatchForm tournaments={tournaments || []} players={players || []} />
      </div>
    </div>
  )
}
