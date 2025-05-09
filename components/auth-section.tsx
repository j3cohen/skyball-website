"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import type { Session } from "@supabase/supabase-js"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle } from "lucide-react"

export function AuthSection() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null)

  // Sync session state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) router.refresh()
    })
    return () => subscription.unsubscribe()
  }, [router])

  // Handle Sign In / Sign Up
  const handleAuth = async () => {
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
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">SkyBall Account</h2>
        <p className="text-lg text-center text-gray-600 mb-10 max-w-2xl mx-auto">
          Create an account or sign in to register for tournaments, purchase passes, and manage your SkyBall experience.
        </p>

        <div className="max-w-md mx-auto">
          {session ? (
            <Card>
              <CardHeader>
                <CardTitle>Welcome Back!</CardTitle>
                <CardDescription>You're signed in as {session.user.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button onClick={() => router.push("/dashboard")} className="w-full">
                    Go to Dashboard
                  </Button>
                  <Button onClick={handleSignOut} variant="outline" className="w-full">
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{isSignUp ? "Create an Account" : "Sign In"}</CardTitle>
                <CardDescription>
                  {isSignUp
                    ? "Join the SkyBall community to register for events and more."
                    : "Sign in to access your SkyBall account."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {message && (
                  <div
                    className={`mb-4 p-3 rounded-md flex items-start gap-2 ${
                      message.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                    }`}
                  >
                    {message.type === "error" ? (
                      <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    )}
                    <p>{message.text}</p>
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <Input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleAuth} disabled={loading} className="w-full">
                    {loading ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
                  </Button>
                  <div className="text-center">
                    <Button variant="link" onClick={() => setIsSignUp(!isSignUp)} className="text-center">
                      {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  )
}
