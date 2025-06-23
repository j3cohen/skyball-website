import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import PlayerList from "@/components/admin/player-list"
import PlayerForm from "@/components/admin/player-form"

export default async function PlayersPage() {
  const supabase = createServerComponentClient({ cookies })

  const [{ data: players }, { data: profiles }] = await Promise.all([
    supabase.from("players").select("*"),
    supabase.from("profiles").select("id, full_name"),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Players</h2>
        <PlayerList players={players || []} />
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Create Player</h2>
        <PlayerForm profiles={profiles || []} />
      </div>
    </div>
  )
}
