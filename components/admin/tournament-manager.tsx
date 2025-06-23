"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabaseClient"
import { Plus, Edit, Trash2 } from "lucide-react"
import type { Database } from "@/lib/database.types"

type Tournament = Database["public"]["Tables"]["tournaments"]["Row"]

export default function TournamentManager() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null)

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    date: "",
    time: "",
    location: "",
    description: "",
    max_participants: "",
    prize: "",
    registration_fee: "",
    points_value: "100",
  })

  useEffect(() => {
    fetchTournaments()
  }, [])

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase.from("tournaments").select("*").order("date_actual", { ascending: false })

      if (error) throw error
      setTournaments(data || [])
    } catch (error) {
      console.error("Error fetching tournaments:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const tournamentData = {
        ...formData,
        max_participants: formData.max_participants ? Number.parseInt(formData.max_participants) : null,
        points_value: Number.parseInt(formData.points_value),
        date_actual: new Date(formData.date).toISOString().split("T")[0],
      }

      if (editingTournament) {
        const { error } = await supabase.from("tournaments").update(tournamentData).eq("id", editingTournament.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from("tournaments").insert([tournamentData])

        if (error) throw error
      }

      await fetchTournaments()
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error("Error saving tournament:", error)
    }
  }

  const handleEdit = (tournament: Tournament) => {
    setEditingTournament(tournament)
    setFormData({
      id: tournament.id,
      name: tournament.name,
      date: tournament.date,
      time: tournament.time,
      location: tournament.location,
      description: tournament.description,
      max_participants: tournament.max_participants?.toString() || "",
      prize: tournament.prize || "",
      registration_fee: tournament.registration_fee || "",
      points_value: tournament.points_value?.toString() || "100",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tournament?")) return

    try {
      const { error } = await supabase.from("tournaments").delete().eq("id", id)

      if (error) throw error
      await fetchTournaments()
    } catch (error) {
      console.error("Error deleting tournament:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      id: "",
      name: "",
      date: "",
      time: "",
      location: "",
      description: "",
      max_participants: "",
      prize: "",
      registration_fee: "",
      points_value: "100",
    })
    setEditingTournament(null)
  }

  if (isLoading) {
    return <div>Loading tournaments...</div>
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Tournament Management</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Tournament
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingTournament ? "Edit Tournament" : "Add New Tournament"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="id">Tournament ID</Label>
                  <Input
                    id="id"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    placeholder="tournament-id"
                    required
                    disabled={!!editingTournament}
                  />
                </div>
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    placeholder="7:00 PM"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="max_participants">Max Participants</Label>
                  <Input
                    id="max_participants"
                    type="number"
                    value={formData.max_participants}
                    onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="registration_fee">Registration Fee</Label>
                  <Input
                    id="registration_fee"
                    value={formData.registration_fee}
                    onChange={(e) => setFormData({ ...formData, registration_fee: e.target.value })}
                    placeholder="$20"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="points_value">Points Value</Label>
                  <Input
                    id="points_value"
                    type="number"
                    value={formData.points_value}
                    onChange={(e) => setFormData({ ...formData, points_value: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="prize">Prize</Label>
                <Input
                  id="prize"
                  value={formData.prize}
                  onChange={(e) => setFormData({ ...formData, prize: e.target.value })}
                  placeholder="$100"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">{editingTournament ? "Update" : "Create"} Tournament</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tournaments.map((tournament) => (
            <div key={tournament.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-semibold">{tournament.name}</h3>
                <p className="text-sm text-gray-600">
                  {tournament.date} at {tournament.time} • {tournament.location}
                </p>
                <p className="text-sm text-gray-500">
                  {tournament.points_value} points • {tournament.registration_fee}
                </p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(tournament)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(tournament.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
