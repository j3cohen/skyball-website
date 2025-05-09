"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import type { Session } from "@supabase/supabase-js"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle, CheckCircle, User } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function AuthCompact() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null)
  const [open, setOpen] = useState(false)

  // Sync session state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        setOpen(false)
        router.refresh()
      }
    })
    return () => subscription.unsubscribe()
  }, [router])

  // Handle Sign In / Sign Up
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMessage({ text: error.message, type: "error" })
      else setMessage({ text: "Check your email for a confirmation link.", type: "success" })
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage({ text: error.message, type: "error" })
      else router.refresh()
    }

    setLoading(false)
  }

  // Handle Sign Out
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  return (
    <div className="absolute top-24 right-4 z-40">
      {session ? (
        <Card className="shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium truncate max-w-[150px]">{session.user.email}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => router.push("/dashboard")}>Dashboard</Button>
                <Button size="sm" variant="outline" onClick={handleSignOut}>Sign Out</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="shadow-md">
              <User className="h-4 w-4 mr-2" /> Sign In
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <Card className="border-0 shadow-none">
              <CardContent className="p-4 pt-4">
                <h3 className="text-lg font-semibold mb-2">
                  {isSignUp ? "Create Account" : "Sign In"}
                </h3>
                {message && (
                  <div className={`mb-4 p-2 text-sm rounded-md flex items-start gap-2 ${
                      message.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                    }`}>
                    {message.type === "error" ? (
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    )}
                    <p>{message.text}</p>
                  </div>
                )}
                <form onSubmit={handleAuth} autoComplete="on">
                  <div className="space-y-3">
                    <Input
                      name="email"
                      id="email"
                      type="email"
                      placeholder="Email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="text-sm"
                      required
                    />
                    <Input
                      name="password"
                      id="password"
                      type="password"
                      placeholder="Password"
                      autoComplete={isSignUp ? "new-password" : "current-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="text-sm"
                      required
                    />
                    <Button type="submit" disabled={loading} className="w-full" size="sm">
                      {loading ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
                    </Button>
                    <div className="text-center">
                      <Button
                        variant="link"
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-center text-xs p-0 h-auto mt-2"
                      >
                        {isSignUp
                          ? "Already have an account? Sign In"
                          : "Don't have an account? Sign Up"}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
