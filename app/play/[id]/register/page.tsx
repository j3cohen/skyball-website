// app/play/[id]/register/page.tsx
"use client"

import { useState, useEffect, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { getMobileSupabaseClient } from "@/lib/supabaseMobileClient"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import { submitRegistration } from "@/app/actions/registration"
import { ExternalLink } from "lucide-react"

type Tournament = {
  id: string
  name: string
  payment_link: string | null
}

export default function RegisterPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // detect any "free 50" tournaments
  const isFree50 = params.id.startsWith("skyball-50-")

  // 1) Fetch tournament data. Registration is handled via Stripe payment links
  //    (or the free-50 form); passes have been retired.
  useEffect(() => {
    ;(async () => {
      const { data: tournamentData, error: tournamentError } = await getMobileSupabaseClient()
        .from("tournaments")
        .select("id, name, payment_link")
        .eq("id", params.id)
        .single()

      if (tournamentError) {
        setError("Tournament not found")
        setLoading(false)
        return
      }

      setTournament(tournamentData as Tournament)
      setLoading(false)
    })()
  }, [params.id])

  // 2) Handle free-50 signup form
  const handleFree50 = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const result = await submitRegistration(form)

    if (result.success) {
      router.push(`/play/${params.id}?registered=1`)
    } else {
      setError(result.message)
      setLoading(false)
    }
  }

  // 3) Open the Stripe payment link
  const handleRegister = () => {
    if (tournament?.payment_link) {
      window.open(tournament.payment_link, "_blank")
    }
  }

  return (
    <>
      <Navbar />
      <main className="py-24">
        <div className="container mx-auto max-w-xl">
          <h1 className="text-2xl font-bold mb-4">Register for Tournament</h1>

          {tournament && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-700">{tournament.name}</h2>
            </div>
          )}

          {loading ? (
            <p>Loading…</p>
          ) : error ? (
            <p className="text-red-600">{error}</p>
          ) : isFree50 ? (
            // FREE-50 FORM
            <form onSubmit={handleFree50} className="space-y-4">
              <input type="hidden" name="tournamentId" value={params.id} />
              <input type="hidden" name="tournamentName" value={params.id} />
              <input type="hidden" name="tournamentDate" value="" />

              <div>
                <label className="block text-sm font-medium">Name</label>
                <input name="name" required className="mt-1 block w-full border rounded p-2" />
              </div>

              <div>
                <label className="block text-sm font-medium">Email</label>
                <input name="email" type="email" required className="mt-1 block w-full border rounded p-2" />
              </div>

              <div>
                <label className="block text-sm font-medium">Phone</label>
                <input name="phone" required className="mt-1 block w-full border rounded p-2" />
              </div>

              <div>
                <label className="block text-sm font-medium">Date of Birth</label>
                <input name="dob" type="date" required className="mt-1 block w-full border rounded p-2" />
              </div>

              <div>
                <label className="block text-sm font-medium">ZIP Code</label>
                <input name="zip" required className="mt-1 block w-full border rounded p-2" />
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? "Submitting…" : "Submit Registration"}
              </Button>
            </form>
          ) : tournament?.payment_link ? (
            // PAYMENT-LINK REGISTRATION
            <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Register</h3>
              <p className="text-gray-600 mb-4">
                You&apos;ll be redirected to complete your registration and payment.
              </p>
              <Button onClick={handleRegister} className="w-full bg-blue-600 hover:bg-blue-700">
                Continue to Registration
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>
          ) : (
            <p className="text-gray-600">
              Online registration for this event isn&apos;t available yet. Check the event page for details.
            </p>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
