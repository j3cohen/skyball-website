"use client"

import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Tables } from "@/lib/supabase.types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import PlayerForm from "./player-form"
import { toast } from "@/components/ui/use-toast"

interface PlayerListProps {
  players: Tables<"players">[]
}

export default function PlayerList({ players: initialPlayers }: PlayerListProps) {
  const [players, setPlayers] = useState(initialPlayers)
  const [editingPlayer, setEditingPlayer] = useState<Tables<"players"> | null>(null)
  const [profiles, setProfiles] = useState<Tables<"profiles">[]>([])
  const supabase = createClientComponentClient()

  // Fetch profiles when needed for editing
  const fetchProfiles = async () => {
    if (profiles.length === 0) {
      const { data } = await supabase.from("profiles").select("id, full_name")
      if (data) setProfiles(data)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this player? This action cannot be undone.")) {
      return
    }

    try {
      const { error } = await supabase.from("players").delete().eq("id", id)

      if (error) throw error

      setPlayers(players.filter((player) => player.id !== id))
      toast({
        title: "Player deleted",
        description: "The player has been successfully deleted.",
      })
    } catch (error) {
      console.error("Error deleting player:", error)
      toast({
        title: "Error",
        description: "Failed to delete player. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleEdit = async (player: Tables<"players">) => {
    await fetchProfiles()
    setEditingPlayer(player)
  }

  const handleUpdate = (updatedPlayer: Tables<"players">) => {
    setPlayers(players.map((p) => (p.id === updatedPlayer.id ? updatedPlayer : p)))
    setEditingPlayer(null)
  }

  return (
    <div className="space-y-6">
      {editingPlayer ? (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Edit Player</h3>
          <PlayerForm
            player={editingPlayer}
            profiles={profiles}
            onSuccess={handleUpdate}
            onCancel={() => setEditingPlayer(null)}
          />
        </div>
      ) : null}

      <div className="grid gap-4">
        {players.map((player) => (
          <Card key={player.id} className="p-6">
            <div className="flex justify-between">
              <div className="flex gap-4">
                {player.headshot_url && (
                  <img
                    src={player.headshot_url || "/placeholder.svg"}
                    alt={player.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                )}
                <div>
                  <h3 className="text-lg font-medium">{player.name}</h3>
                  <p className="text-gray-500">Hometown: {player.hometown || "N/A"}</p>
                  <p className="text-gray-500">Birthdate: {player.birthdate || "N/A"}</p>
                  <p className="text-gray-500">Slug: {player.slug}</p>
                </div>
              </div>
              <div className="flex flex-col space-y-2">
                <Button variant="outline" onClick={() => handleEdit(player)}>
                  Edit
                </Button>
                <Button variant="destructive" onClick={() => handleDelete(player.id)}>
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {players.length === 0 && <p className="text-gray-500 text-center py-4">No players found.</p>}
      </div>
    </div>
  )
}
