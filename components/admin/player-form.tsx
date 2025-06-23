"use client"

import type React from "react"

import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Tables } from "@/lib/supabase.types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"

interface PlayerFormProps {
  player?: Tables<"players">
  profiles: Tables<"profiles">[]
  onSuccess?: (player: Tables<"players">) => void
  onCancel?: () => void
}

export default function PlayerForm({ player, profiles, onSuccess, onCancel }: PlayerFormProps) {
  const isEditing = !!player
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    id: player?.id || crypto.randomUUID(),
    name: player?.name || "",
    profile_id: player?.profile_id || "",
    hometown: player?.hometown || "",
    birthdate: player?.birthdate || "",
    slug: player?.slug || "",
    headshot_url: player?.headshot_url || "",
    fullbody_url: player?.fullbody_url || "",
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
      // Generate slug if not provided
      if (!formData.slug) {
        formData.slug = formData.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
      }

      let result

      if (isEditing) {
        result = await supabase.from("players").update(formData).eq("id", player.id).select()
      } else {
        result = await supabase.from("players").insert(formData).select()
      }

      if (result.error) throw result.error

      toast({
        title: isEditing ? "Player updated" : "Player created",
        description: isEditing
          ? "The player has been successfully updated."
          : "The player has been successfully created.",
      })

      if (onSuccess && result.data?.[0]) {
        onSuccess(result.data[0])
      }

      if (!isEditing) {
        // Reset form if creating new player
        setFormData({
          id: crypto.randomUUID(),
          name: "",
          profile_id: "",
          hometown: "",
          birthdate: "",
          slug: "",
          headshot_url: "",
          fullbody_url: "",
        })
      }
    } catch (error) {
      console.error("Error saving player:", error)
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} player. Please try again.`,
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
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Player Name
          </label>
          <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
        </div>

        <div>
          <label htmlFor="profile_id" className="block text-sm font-medium text-gray-700">
            Profile
          </label>
          <Select value={formData.profile_id} onValueChange={(value) => handleSelectChange("profile_id", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a profile" />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.full_name || profile.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="hometown" className="block text-sm font-medium text-gray-700">
            Hometown
          </label>
          <Input id="hometown" name="hometown" value={formData.hometown} onChange={handleChange} />
        </div>

        <div>
          <label htmlFor="birthdate" className="block text-sm font-medium text-gray-700">
            Birthdate (YYYY-MM-DD)
          </label>
          <Input
            id="birthdate"
            name="birthdate"
            value={formData.birthdate}
            onChange={handleChange}
            placeholder="YYYY-MM-DD"
          />
        </div>

        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
            Slug (URL-friendly name)
          </label>
          <Input
            id="slug"
            name="slug"
            value={formData.slug}
            onChange={handleChange}
            placeholder="Generated from name if empty"
          />
        </div>

        <div>
          <label htmlFor="headshot_url" className="block text-sm font-medium text-gray-700">
            Headshot URL
          </label>
          <Input id="headshot_url" name="headshot_url" value={formData.headshot_url} onChange={handleChange} />
        </div>

        <div>
          <label htmlFor="fullbody_url" className="block text-sm font-medium text-gray-700">
            Full Body Image URL
          </label>
          <Input id="fullbody_url" name="fullbody_url" value={formData.fullbody_url} onChange={handleChange} />
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : isEditing ? "Update Player" : "Create Player"}
        </Button>
      </div>
    </form>
  )
}
