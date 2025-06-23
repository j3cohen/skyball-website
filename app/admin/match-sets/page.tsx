import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import MatchSetList from "@/components/admin/match-set-list"
import MatchSetForm from "@/components/admin/match-set-form"

export default async function MatchSetsPage() {
  const supabase = createServerComponentClient({ cookies })

  const [{ data: matchSets }, { data: matches }] = await Promise.all([
    supabase
      .from("match_sets")
      .select("*, match:matches(id, player1:players!player1_id(name), player2:players!player2_id(name))"),
    supabase.from("matches").select("id, player1:players!player1_id(name), player2:players!player2_id(name)"),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Match Sets</h2>
        <MatchSetList matchSets={matchSets || []} />
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Create Match Set</h2>
        <MatchSetForm matches={matches || []} />
      </div>
    </div>
  )
}
