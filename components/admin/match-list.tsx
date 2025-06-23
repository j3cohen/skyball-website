"use client"

import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import MatchForm from "./match-form"
import { toast } from "@/components/ui/use-toast"

interface Match {
  id: string
  tournament_id: string
  player1_id: string
  player2_id: string
  winner_id: string
  round: string
  tournament: { name: string }
  player1: { name: string }
  player2: { name: string }
  winner: { name: string }
}

interface MatchListProps {
  matches: Match[]
}

export default function MatchList({ matches: initialMatches }: MatchListProps) {
  const [matches, setMatches] = useState(initialMatches)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [tournaments, setTournaments] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const supabase = createClientComponentClient()

  // Fetch data needed for editing
  const fetchData = async () => {
    if (tournaments.length === 0 || players.length === 0) {
      const [tournamentsResult, playersResult] = await Promise.all([
        supabase.from("tournaments").select("id, name"),
        supabase.from("players").select("id, name"),
      ])

      if (tournamentsResult.data) setTournaments(tournamentsResult.data)
      if (playersResult.data) setPlayers(playersResult.data)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this match? This action cannot be undone.")) {
      return
    }

    try {
      const { error } = await supabase.from("matches").delete().eq("id", id)

      if (error) throw error

      setMatches(matches.filter((match) => match.id !== id))
      toast({
        title: "Match deleted",
        description: "The match has been successfully deleted.",
      })
    } catch (error) {
      console.error("Error deleting match:", error)
      toast({
        title: "Error",
        description: "Failed to delete match. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleEdit = async (match: Match) => {
    await fetchData()
    setEditingMatch(match)
  }

  const handleUpdate = (updatedMatch: any) => {
    // Find the updated match with joined data
    const updatedMatchWithData = {
      ...updatedMatch,
      tournament: tournaments.find((t) => t.id === updatedMatch.tournament_id),
      player1: players.find((p) => p.id === updatedMatch.player1_id),
      player2: players.find((p) => p.id === updatedMatch.player2_id),
      winner: players.find((p) => p.id === updatedMatch.winner_id),
    }

    setMatches(matches.map((m) => (m.id === updatedMatch.id ? updatedMatchWithData : m)))
    setEditingMatch(null)
  }

  return (
    <div className="space-y-6">
      {editingMatch ? (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Edit Match</h3>
          <MatchForm
            match={editingMatch}
            tournaments={tournaments}
            players={players}
            onSuccess={handleUpdate}
            onCancel={() => setEditingMatch(null)}
          />
        </div>
      ) : null}

      <div className="grid gap-4">
        {matches.map((match) => (
          <Card key={match.id} className="p-6">
            <div className="flex justify-between">
              <div>
                <h3 className="text-lg font-medium">
                  {match.tournament.name} - {match.round}
                </h3>
                <p className="text-gray-700 font-medium mt-2">
                  {match.player1.name} vs {match.player2.name}
                </p>
                <p className="text-gray-500 mt-1">Winner: {match.winner.name}</p>
              </div>
              <div className="flex flex-col space-y-2">
                <Button variant="outline" onClick={() => handleEdit(match)}>
                  Edit
                </Button>
                <Button variant="destructive" onClick={() => handleDelete(match.id)}>
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {matches.length === 0 && <p className="text-gray-500 text-center py-4">No matches found.</p>}
      </div>
    </div>
  )
}
