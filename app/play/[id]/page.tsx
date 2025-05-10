// app/play/[id]/page.tsx
// Force this route to always be fetched at request time
export const dynamic = "force-dynamic"
export const revalidate = 0

import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { getTournamentById } from "@/lib/tournaments"
import { getMatchesByTournament } from "@/data/matches"
import { notFound } from "next/navigation"
import Link from "next/link"
import {
  Calendar,
  MapPin,
  Clock,
  Trophy,
  Users,
  DollarSign,
  Award,
  Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import MatchScoreDisplay from "@/components/match-score-display"
import RegistrationStatus from "@/components/registration-status"

export default async function EventPage({ params }: { params: { id: string } }) {
  const event = await getTournamentById(params.id)
  if (!event) notFound()

  const isPastEvent  = event.isPast === true
  const isRSVP       = event.type    === "open-play"
  const hasResults   = event.hasResults === true

  const matches = hasResults ? getMatchesByTournament(event.id) : []
  const matchesByRound: Record<string, typeof matches> = {}
  matches.forEach((m) => {
    matchesByRound[m.round] = matchesByRound[m.round] || []
    matchesByRound[m.round].push(m)
  })
  const roundOrder   = ["Play-in", "Quarter-final", "Semi-final", "Final"]
  const sortedRounds = Object.keys(matchesByRound).sort(
    (a, b) => roundOrder.indexOf(a) - roundOrder.indexOf(b)
  )

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <Link href="/play" className="text-sky-600 hover:text-sky-800" scroll={true}>
                ← Back to all events
              </Link>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
              {/* Event Header */}
              <div className="bg-sky-600 p-8 text-white">
                <h1 className="text-3xl font-bold mb-2">{event.name}</h1>
                <p className="text-lg opacity-90">{event.description}</p>
              </div>

              {/* Event Details */}
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Event Details</h2>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <Calendar className="w-5 h-5 mr-3 text-sky-600" />
                        <span>{event.date}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-5 h-5 mr-3 text-sky-600" />
                        <span>{event.time}</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-5 h-5 mr-3 text-sky-600" />
                        <span>{event.location}</span>
                      </div>
                      {event.format && (
                        <div className="flex items-center">
                          <Info className="w-5 h-5 mr-3 text-sky-600" />
                          <span>Format: {event.format}</span>
                        </div>
                      )}
                      {event.skillLevel && (
                        <div className="flex items-center">
                          <Award className="w-5 h-5 mr-3 text-sky-600" />
                          <span>
                            Skill Level: {event.skillLevel.charAt(0).toUpperCase() + event.skillLevel.slice(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold mb-4">Registration Info</h2>
                    <div className="space-y-3">
                      {event.registrationFee && (
                        <div className="flex items-center">
                          <DollarSign className="w-5 h-5 mr-3 text-sky-600" />
                          <span>Registration Fee: {event.registrationFee}</span>
                        </div>
                      )}
                      {event.prize && (
                        <div className="flex items-center">
                          <Trophy className="w-5 h-5 mr-3 text-sky-600" />
                          <span>Prize: {event.prize}</span>
                        </div>
                      )}
                      {(event.maxParticipants || event.currentParticipants) && (
                        <div className="flex items-center">
                          <Users className="w-5 h-5 mr-3 text-sky-600" />
                          <span>
                            Capacity: {event.currentParticipants ?? 0}/{event.maxParticipants} participants
                          </span>
                        </div>
                      )}
                      {event.registrationDeadline && (
                        <div className="flex items-center">
                          <Calendar className="w-5 h-5 mr-3 text-sky-600" />
                          <span>Registration Deadline: {event.registrationDeadline}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tournament Results */}
                {isPastEvent && hasResults && (
                  <>
                    {/* … your existing results/cards here … */}
                  </>
                )}

                {/* Contact Information */}
                {event.contactEmail && (
                  <Card className="mb-8">
                    <CardHeader>
                      <CardTitle className="text-xl text-sky-600">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>
                        Contact:{" "}
                        <a href={`mailto:${event.contactEmail}`} className="text-sky-600 hover:underline">
                          {event.contactEmail}
                        </a>
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Registration Button / Status */}
                {!isPastEvent && (
                  <div className="mt-8 text-center">
                    <RegistrationStatus tournamentId={event.id} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
