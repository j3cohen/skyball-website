"use client"

import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import MatchSetForm from "./match-set-form"
import { toast } from "@/components/ui/use-toast"

interface MatchSet {
  match_id: string
  set_number: number
  p1_score: number
  p2_score: number
  match: {
    id: string
    player1: { name: string }
    player2: { name: string }
  }
}

interface MatchSetListProps {
  matchSets: MatchSet[]
}

export default function MatchSetList({ matchSets: initialMatchSets }: MatchSetListProps) {
  const [matchSets, setMatchSets] = useState(initialMatchSets)
  const [editingMatchSet, setEditingMatchSet] = useState<MatchSet | null>(null)
  const [matches, setMatches] = useState<any[]>([])
  const supabase = createClientComponentClient()

  // Fetch matches for editing
  const fetchMatches = async () => {
    if (matches.length === 0) {
      const { data } = await supabase
        .from("matches")
        .select("id, player1:players!player1_id(name), player2:players!player2_id(name)")

      if (data) setMatches(data)
    }
  }

  const handleDelete = async (matchId: string, setNumber: number) => {
    if (!confirm("Are you sure you want to delete this match set? This action cannot be undone.")) {
      return
    }

    try {
      const { error } = await supabase.from("match_sets").delete().eq("match_id", matchId).eq("set_number", setNumber)

      if (error) throw error

      setMatchSets(matchSets.filter((set) => !(set.match_id === matchId && set.set_number === setNumber)))

      toast({
        title: "Match set deleted",
        description: "The match set has been successfully deleted.",
      })
    } catch (error) {
      console.error("Error deleting match set:", error)
      toast({
        title: "Error",
        description: "Failed to delete match set. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleEdit = async (matchSet: MatchSet) => {
    await fetchMatches()
    setEditingMatchSet(matchSet)
  }

  const handleUpdate = (updatedMatchSet: any) => {
    // Find the match data to include in the updated set
    const matchData = matches.find((m) => m.id === updatedMatchSet.match_id)

    const updatedSet = {
      ...updatedMatchSet,
      match: matchData,
    }

    setMatchSets(
      matchSets.map((set) =>
        set.match_id === updatedMatchSet.match_id && set.set_number === updatedMatchSet.set_number ? updatedSet : set,
      ),
    )
    setEditingMatchSet(null)
  }

  return (
    <div className="space-y-6">
      {editingMatchSet ? (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Edit Match Set</h3>
          <MatchSetForm
            matchSet={editingMatchSet}
            matches={matches}
            onSuccess={handleUpdate}
            onCancel={() => setEditingMatchSet(null)}
          />
        </div>
      ) : null}

      <div className="grid gap-4">
        {matchSets.map((set) => (
          <Card key={`${set.match_id}-${set.set_number}`} className="p-6">
            <div className="flex justify-between">
              <div>
                <h3 className="text-lg font-medium">
                  {set.match.player1.name} vs {set.match.player2.name}
                </h3>
                <p className="text-gray-500">Set {set.set_number}</p>
                <p className="text-gray-700 font-medium mt-2">
                  Score: {set.p1_score} - {set.p2_score}
                </p>
              </div>
              <div className="flex flex-col space-y-2">
                <Button variant="outline" onClick={() => handleEdit(set)}>
                  Edit
                </Button>
                <Button variant="destructive" onClick={() => handleDelete(set.match_id, set.set_number)}>
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {matchSets.length === 0 && <p className="text-gray-500 text-center py-4">No match sets found.</p>}
      </div>
    </div>
  )
}
