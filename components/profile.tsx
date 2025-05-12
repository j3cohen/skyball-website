// components/profile.tsx
"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Button }  from "@/components/ui/button"
import { Input }   from "@/components/ui/input"

type Props = {
  onSave?: () => void
  readOnly?: boolean
}

export default function Profile({ onSave, readOnly }: Props) {
  const [fullName, setFullName]   = useState("")
  const [phone, setPhone]         = useState("")
  const [current_city, setHometown]   = useState("")
  const [loading, setLoading]     = useState(false)

  useEffect(() => {
    ;(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, current_city")
        .eq("id", session.user.id)
        .single()
      if (data) {
        setFullName(data.full_name || "")
        setPhone(data.phone     || "")
        setHometown(data.current_city || "")
      }
    })()
  }, [])

  const save = async () => {
    setLoading(true)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return

    const updates = {
      id: session.user.id,
      full_name: fullName,
      phone,
      current_city,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from("profiles").upsert(updates)
    setLoading(false)
    if (error) {
      console.error("Failed to save profile:", error)
    } else if (onSave) {
      onSave()
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label>Full Name</label>
        <Input
          disabled={readOnly}
          value={fullName}
          onChange={(e) => setFullName(e.currentTarget.value)}
        />
      </div>
      <div>
        <label>Phone</label>
        <Input
          disabled={readOnly}
          value={phone}
          onChange={(e) => setPhone(e.currentTarget.value)}
        />
      </div>
      <div>
        <label>Current Area</label>
        <Input
          disabled={readOnly}
          value={current_city}
          onChange={(e) => setHometown(e.currentTarget.value)}
        />
      </div>
      {!readOnly && (
        <Button onClick={save} disabled={loading || !fullName || !phone || !current_city}>
          {loading ? "Saving…" : "Save Profile"}
        </Button>
      )}
    </div>
  )
}
