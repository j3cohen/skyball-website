// app/play/[id]/page.tsx
// Force this route to always be fetched at request time
export const dynamic = "force-dynamic"
export const revalidate = 0

import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { getTournamentById } from "@/lib/tournaments"
import { getMatchesByTournament } from "@/data/matches"
import { getEventById } from "@/data/events"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Calendar, MapPin, Clock, Trophy, Users, DollarSign, Award, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import RegistrationStatus from "@/components/registration-status"
import MatchScoreDisplay from "@/components/match-score-display"

export default async function EventPage({ params }: { params: { id: string } }) {
  const event = await getTournamentById(params.id)
  if (!event) notFound()

  // Get the static event data for fallback information
  const staticEvent = getEventById(params.id)

  const isPastEvent = event.isPast === true
  const hasResults = event.hasResults === true || staticEvent?.hasResults === true

  // Get matches for this tournament if it has results
  const matches = hasResults ? getMatchesByTournament(event.id) : []

  // Group matches by round
  const matchesByRound: Record<string, typeof matches> = {}
  if (matches.length > 0) {
    matches.forEach((match) => {
      if (!matchesByRound[match.round]) {
        matchesByRound[match.round] = []
      }
      matchesByRound[match.round].push(match)
    })
  }

  // Sort rounds in a logical order
  const roundOrder = ["Play-in", "Quarter-final", "Semi-final", "Final"]
  const sortedRounds = Object.keys(matchesByRound).sort((a, b) => {
    const aIndex = roundOrder.indexOf(a)
    const bIndex = roundOrder.indexOf(b)
    return aIndex - bIndex
  })

  // Helper function to get effective participant count
  const getEffectiveParticipantCount = (): number => {
    // If currentParticipants is undefined or null, return 0
    if (typeof event.currentParticipants !== "number") {
      return 0
    }

    // If it's a past event with 0 participants from the DB view, check static data
    if (event.isPast && event.currentParticipants === 0 && staticEvent) {
      // If static event has a non-zero currentParticipants value, use that
      if (typeof staticEvent.currentParticipants === "number" && staticEvent.currentParticipants > 0) {
        return staticEvent.currentParticipants
      }
    }

    // For all other cases, return the actual participant count
    return event.currentParticipants
  }

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
                {/* Only show description for upcoming events */}
                {!isPastEvent && event.description && <p className="text-lg opacity-90">{event.description}</p>}
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
                      {(event.maxParticipants || event.currentParticipants !== undefined) && (
                        <div className="flex items-center">
                          <Users className="w-5 h-5 mr-3 text-sky-600" />
                          {isPastEvent ? (
                            <span>
                              Participants: {getEffectiveParticipantCount()}
                              {event.maxParticipants ? ` / ${event.maxParticipants}` : ""}
                            </span>
                          ) : (
                            <span>
                              Capacity: {event.currentParticipants !== undefined ? `${event.currentParticipants}/` : ""}
                              {event.maxParticipants} participants
                            </span>
                          )}
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

                {/* Tournament Results Section */}
                {isPastEvent && hasResults && (
                  <>
                    {/* Basic Results Summary */}
                    <Card className="mb-8">
                      <CardHeader>
                        <CardTitle className="text-xl text-sky-600">Tournament Results</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {event.results?.winner && (
                            <div className="flex items-center">
                              <Trophy className="w-5 h-5 mr-3 text-sky-600" />
                              <span>
                                Winner:{" "}
                                <Link
                                  href={`/players/${event.results.winner.toLowerCase().replace(/\s+/g, "-")}`}
                                  className="text-sky-600 hover:underline"
                                  scroll={true}
                                >
                                  {event.results.winner}
                                </Link>
                              </span>
                            </div>
                          )}
                          {event.results?.runnerUp && (
                            <div className="flex items-center">
                              <Trophy className="w-5 h-5 mr-3 text-sky-600 opacity-70" />
                              <span>
                                Runner-up:{" "}
                                <Link
                                  href={`/players/${event.results.runnerUp.toLowerCase().replace(/\s+/g, "-")}`}
                                  className="text-sky-600 hover:underline"
                                  scroll={true}
                                >
                                  {event.results.runnerUp}
                                </Link>
                              </span>
                            </div>
                          )}
                          {event.results?.score && (
                            <div className="flex items-center">
                              <span className="ml-8">Final Score: {event.results.score}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Detailed Match Results */}
                    {matches.length > 0 && (
                      <div className="mb-8">
                        <h2 className="text-2xl font-bold mb-4">Match Results</h2>
                        <div className="space-y-6">
                          {sortedRounds.map(
                            (round) =>
                              matchesByRound[round] && (
                                <div key={round} className="mb-6">
                                  <h3 className="font-semibold text-lg mb-3">{round}</h3>
                                  <div className="grid gap-4 md:grid-cols-2">
                                    {matchesByRound[round].map((match) => (
                                      <MatchScoreDisplay key={match.id} match={match} />
                                    ))}
                                  </div>
                                </div>
                              ),
                          )}
                        </div>
                      </div>
                    )}

                    {/* Seeding Information - Only for specific tournaments */}
                    {params.id === "lift-off" && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                        <h3 className="text-lg font-semibold text-amber-800 mb-2">Seeding Information</h3>
                        <p className="text-sm text-amber-700 mb-3">
                          As this was our first tournament, we used a &quot;King of the Court&quot; format to determine
                          seeding. Players competed in first-to-two-points matches, with winners staying on court and
                          earning points.
                        </p>
                        <div className="bg-white rounded p-3">
                          <h4 className="font-medium text-sm mb-2">King of the Court Results:</h4>
                          <ul className="text-sm space-y-1">
                            <li>Deven - 9 wins (18 points)</li>
                            <li>Isaac - 8 wins (16 points)</li>
                            <li>Jason - 6 wins (12 points)</li>
                            <li>Caleb - 4 wins (8 points)</li>
                            <li>Will - 2 wins (4 points)</li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Points Awarded - Only for specific tournaments */}
                    {params.id === "lift-off" && (
                      <div className="mt-8 bg-gray-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold mb-3">Points Awarded</h3>
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold mr-3">
                              1
                            </div>
                            <div>
                              <div className="font-medium">
                                <Link
                                  href="/players/deven-amann-rao"
                                  className="text-sky-600 hover:underline"
                                  scroll={true}
                                >
                                  Deven Amann-Rao
                                </Link>
                              </div>
                              <div className="text-sm text-gray-500">118 points (100 tournament + 18 seeding)</div>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold mr-3">
                              2
                            </div>
                            <div>
                              <div className="font-medium">
                                <Link
                                  href="/players/isaac-tullis"
                                  className="text-sky-600 hover:underline"
                                  scroll={true}
                                >
                                  Isaac Tullis
                                </Link>
                              </div>
                              <div className="text-sm text-gray-500">66 points (50 tournament + 16 seeding)</div>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                              3
                            </div>
                            <div>
                              <div className="font-medium">
                                <Link
                                  href="/players/caleb-breslin"
                                  className="text-sky-600 hover:underline"
                                  scroll={true}
                                >
                                  Caleb Breslin
                                </Link>
                              </div>
                              <div className="text-sm text-gray-500">33 points (25 tournament + 8 seeding)</div>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold mr-3">
                              4
                            </div>
                            <div>
                              <div className="font-medium">
                                <Link
                                  href="/players/jason-grossman"
                                  className="text-sky-600 hover:underline"
                                  scroll={true}
                                >
                                  Jason Grossman
                                </Link>
                              </div>
                              <div className="text-sm text-gray-500">12 points (seeding only)</div>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold mr-3">
                              5
                            </div>
                            <div>
                              <div className="font-medium">
                                <Link href="/players/will-simon" className="text-sky-600 hover:underline" scroll={true}>
                                  Will Simon
                                </Link>
                              </div>
                              <div className="text-sm text-gray-500">4 points (seeding only)</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
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
