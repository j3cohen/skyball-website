"use client"

import type React from "react"

import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"

interface MatchFormProps {
  match?: any
  tournaments: any[]
  players: any[]
  onSuccess?: (match: any) => void
  onCancel?: () => void
}

export default function MatchForm({ match, tournaments, players, onSuccess, onCancel }: MatchFormProps) {
  const isEditing = !!match
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    id: match?.id || crypto.randomUUID(),
    tournament_id: match?.tournament_id || "",
    player1_id: match?.player1_id || "",
    player2_id: match?.player2_id || "",
    winner_id: match?.winner_id || "",
    round: match?.round || "",
  })

  const supabase = createClientComponentClient()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      let result

      if (isEditing) {
        result = await supabase.from("matches").update(formData).eq("id", match.id).select()
      } else {
        result = await supabase.from("matches").insert(formData).select()
      }

      if (result.error) throw result.error

      toast({
        title: isEditing ? "Match updated" : "Match created",
        description: isEditing
          ? "The match has been successfully updated."
          : "The match has been successfully created.",
      })

      if (onSuccess && result.data?.[0]) {
        onSuccess(result.data[0])
      }

      if (!isEditing) {
        // Reset form if creating new match
        setFormData({
          id: crypto.randomUUID(),
          tournament_id: "",
          player1_id: "",
          player2_id: "",
          winner_id: "",
          round: "",
        })
      }
    } catch (error) {
      console.error("Error saving match:", error)
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} match. Please try again.`,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="tournament_id" className="block text-sm font-medium text-gray-700">
            Tournament
          </label>
          <Select value={formData.tournament_id} onValueChange={(value) => handleSelectChange("tournament_id", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a tournament" />
            </SelectTrigger>
            <SelectContent>
              {tournaments.map((tournament) => (
                <SelectItem key={tournament.id} value={tournament.id}>
                  {tournament.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="round" className="block text-sm font-medium text-gray-700">
            Round
          </label>
          <Input
            id="round"
            name="round"
            value={formData.round}
            onChange={handleChange}
            placeholder="e.g., Quarter-final, Semi-final, Final"
            required
          />
        </div>

        <div>
          <label htmlFor="player1_id" className="block text-sm font-medium text-gray-700">
            Player 1
          </label>
          <Select value={formData.player1_id} onValueChange={(value) => handleSelectChange("player1_id", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select player 1" />
            </SelectTrigger>
            <SelectContent>
              {players.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  {player.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="player2_id" className="block text-sm font-medium text-gray-700">
            Player 2
          </label>
          <Select value={formData.player2_id} onValueChange={(value) => handleSelectChange("player2_id", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select player 2" />
            </SelectTrigger>
            <SelectContent>
              {players.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  {player.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="winner_id" className="block text-sm font-medium text-gray-700">
            Winner
          </label>
          <Select value={formData.winner_id} onValueChange={(value) => handleSelectChange("winner_id", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select winner" />
            </SelectTrigger>
            <SelectContent>
              {players.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  {player.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : isEditing ? "Update Match" : "Create Match"}
        </Button>
      </div>
    </form>
  )
}
