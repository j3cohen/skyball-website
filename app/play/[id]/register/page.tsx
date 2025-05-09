// app/play/[id]/register/page.tsx
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { notFound } from "next/navigation"
import { getTournamentById } from "@/lib/tournaments"
import { submitEventRegistration } from "@/app/actions/event-registration"
import { Button } from "@/components/ui/button"

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params:       { id: string }
  searchParams: { registered?: string; error?: string }
}) {
  const event = await getTournamentById(params.id)
  if (!event) notFound()

  const isRSVP        = event.type === "open-play"
  const justRegistered = searchParams.registered === "1"
  const errorCode      = searchParams.error

  return (
    <>
      <Navbar />
      <main className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-8">
            <h1 className="text-2xl font-bold mb-4">
              {isRSVP ? "RSVP" : "Register"} for {event.name}
            </h1>

            {justRegistered && (
              <div className="mb-6 p-4 bg-green-50 text-green-700 rounded">
                {isRSVP
                  ? "Your RSVP is confirmed!"
                  : "Registration complete! Check your dashboard."}
              </div>
            )}

            {errorCode === "no-pass" && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded">
                You don’t have a valid pass for this level.{" "}
                <a href="/dashboard" className="underline">
                  Buy a pass →
                </a>
              </div>
            )}

            {!justRegistered && (
              <form action={submitEventRegistration} className="space-y-6">
                <input type="hidden" name="eventId"   value={event.id}   />
                <input type="hidden" name="eventName" value={event.name} />
                <input type="hidden" name="eventType" value={event.type} />

                <Button type="submit" className="w-full">
                  {isRSVP ? "Confirm RSVP" : "Complete Registration"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
