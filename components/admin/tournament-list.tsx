"use client"

import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Tables } from "@/lib/supabase.types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import TournamentForm from "./tournament-form"
import { toast } from "@/components/ui/use-toast"

interface TournamentListProps {
  tournaments: Tables<"tournaments">[]
}

export default function TournamentList({ tournaments: initialTournaments }: TournamentListProps) {
  const [tournaments, setTournaments] = useState(initialTournaments)
  const [editingTournament, setEditingTournament] = useState<Tables<"tournaments"> | null>(null)
  const supabase = createClientComponentClient()

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tournament? This action cannot be undone.")) {
      return
    }

    try {
      const { error } = await supabase.from("tournaments").delete().eq("id", id)

      if (error) throw error

      setTournaments(tournaments.filter((tournament) => tournament.id !== id))
      toast({
        title: "Tournament deleted",
        description: "The tournament has been successfully deleted.",
      })
    } catch (error) {
      console.error("Error deleting tournament:", error)
      toast({
        title: "Error",
        description: "Failed to delete tournament. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleUpdate = (updatedTournament: Tables<"tournaments">) => {
    setTournaments(tournaments.map((t) => (t.id === updatedTournament.id ? updatedTournament : t)))
    setEditingTournament(null)
  }

  return (
    <div className="space-y-6">
      {editingTournament ? (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Edit Tournament</h3>
          <TournamentForm
            tournament={editingTournament}
            onSuccess={handleUpdate}
            onCancel={() => setEditingTournament(null)}
          />
        </div>
      ) : null}

      <div className="grid gap-4">
        {tournaments.map((tournament) => (
          <Card key={tournament.id} className="p-6">
            <div className="flex justify-between">
              <div>
                <h3 className="text-lg font-medium">{tournament.name}</h3>
                <p className="text-gray-500">
                  {tournament.date} at {tournament.time}
                </p>
                <p className="text-gray-500">{tournament.location}</p>
                <p className="mt-2">{tournament.description}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-500">Registration Fee:</span> {tournament.registration_fee}
                  </div>
                  <div>
                    <span className="text-gray-500">Prize:</span> {tournament.prize || "N/A"}
                  </div>
                  <div>
                    <span className="text-gray-500">Points Value:</span> {tournament.points_value}
                  </div>
                  <div>
                    <span className="text-gray-500">Max Participants:</span>{" "}
                    {tournament.max_participants || "Unlimited"}
                  </div>
                </div>
              </div>
              <div className="flex flex-col space-y-2">
                <Button variant="outline" onClick={() => setEditingTournament(tournament)}>
                  Edit
                </Button>
                <Button variant="destructive" onClick={() => handleDelete(tournament.id)}>
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {tournaments.length === 0 && <p className="text-gray-500 text-center py-4">No tournaments found.</p>}
      </div>
    </div>
  )
}
