"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function ResetPasswordForm() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null)

  // The recovery link establishes a session from the URL (detectSessionInUrl is
  // enabled on the client). Enable the form once we have a recovery session.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true)
    })
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setMessage({ text: "Passwords do not match.", type: "error" })
      return
    }
    if (password.length < 6) {
      setMessage({ text: "Password must be at least 6 characters.", type: "error" })
      return
    }

    setLoading(true)
    setMessage(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setMessage({ text: error.message, type: "error" })
      setLoading(false)
    } else {
      setMessage({ text: "Password updated. Redirecting to your dashboard…", type: "success" })
      setTimeout(() => router.push("/dashboard"), 1500)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      {message && (
        <p className={message.type === "error" ? "text-red-600 mb-4" : "text-green-600 mb-4"}>
          {message.text}
        </p>
      )}

      {ready ? (
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-medium mb-1">New password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirm new password</label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Updating…" : "Update Password"}
          </Button>
        </form>
      ) : (
        <p className="text-gray-600">
          Open this page from the password-reset link in your email. If you got here by mistake,{" "}
          <Link href="/login" className="text-sky-600 underline">
            go to sign in
          </Link>
          .
        </p>
      )}
    </div>
  )
}
