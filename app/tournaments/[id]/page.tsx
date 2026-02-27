import { upcomingTournaments, pastTournaments, type PastTournament } from "@/data/tournaments"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CalendarIcon, MapPinIcon, Clock, Trophy, Users, DollarSign, Star, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const tournament =
    upcomingTournaments.find((t) => t.id === params.id) || pastTournaments.find((t) => t.id === params.id)

  if (!tournament) return { title: "Tournament Not Found" }

  const isPast = "winner" in tournament
  const description = `${tournament.name} — ${tournament.date} at ${tournament.location}. ${tournament.description}`

  return {
    title: tournament.name,
    description,
    alternates: { canonical: `https://skyball.us/${isPast ? "past-tournaments" : "tournaments"}/${params.id}` },
    openGraph: {
      title: tournament.name,
      description,
      url: `https://skyball.us/${isPast ? "past-tournaments" : "tournaments"}/${params.id}`,
    },
  }
}

export default function TournamentDetailsPage({ params }: { params: { id: string } }) {
  // Look for the tournament in both upcoming and past tournaments
  const tournament =
    upcomingTournaments.find((t) => t.id === params.id) || pastTournaments.find((t) => t.id === params.id)

  if (!tournament) {
    notFound()
  }

  // Check if it's a past tournament
  const isPastTournament = "winner" in tournament

  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: tournament.name,
    description: tournament.description,
    startDate: tournament.date,
    location: {
      "@type": "Place",
      name: tournament.location,
    },
    organizer: {
      "@type": "Organization",
      name: "SkyBall™",
      url: "https://skyball.us",
    },
    eventStatus: isPastTournament
      ? "https://schema.org/EventScheduled"
      : "https://schema.org/EventScheduled",
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
      />
      <Navbar />
      <main className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Tournament Header */}
              <div className="bg-sky-600 p-8 text-white">
                <h1 className="text-3xl font-bold mb-2">{tournament.name}</h1>
                <p className="text-lg opacity-90">{tournament.description}</p>
              </div>

              {/* Tournament Details */}
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Event Details</h2>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <CalendarIcon className="w-5 h-5 mr-3 text-sky-600" />
                        <span>{tournament.date}</span>
                      </div>

                      {tournament.startTime && (
                        <div className="flex items-center">
                          <Clock className="w-5 h-5 mr-3 text-sky-600" />
                          <span>{tournament.startTime}</span>
                        </div>
                      )}

                      <div className="flex items-center">
                        <MapPinIcon className="w-5 h-5 mr-3 text-sky-600" />
                        <span>{tournament.location}</span>
                      </div>

                      {tournament.format && (
                        <div className="flex items-center">
                          <Info className="w-5 h-5 mr-3 text-sky-600" />
                          <span>Format: {tournament.format}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold mb-4">Registration Info</h2>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <DollarSign className="w-5 h-5 mr-3 text-sky-600" />
                        <span>Registration Fee: {tournament.registrationFee}</span>
                      </div>

                      {tournament.prizePool && (
                        <div className="flex items-center">
                          <Trophy className="w-5 h-5 mr-3 text-sky-600" />
                          <span>Prize Pool: {tournament.prizePool}</span>
                        </div>
                      )}

                      {tournament.pointsAwarded && (
                        <div className="flex items-center">
                          <Star className="w-5 h-5 mr-3 text-sky-600" />
                          <span>Points Awarded: {tournament.pointsAwarded}</span>
                        </div>
                      )}

                      {tournament.maxParticipants && (
                        <div className="flex items-center">
                          <Users className="w-5 h-5 mr-3 text-sky-600" />
                          <span>
                            Participants: {tournament.currentParticipants || 0}/{tournament.maxParticipants}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Past Tournament Results */}
                {isPastTournament && (
                  <Card className="mb-8">
                    <CardHeader>
                      <CardTitle className="text-xl text-sky-600">Tournament Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <Trophy className="w-5 h-5 mr-3 text-sky-600" />
                          <span>Winner: {isPastTournament ? (tournament as PastTournament).winner : ""}</span>
                        </div>
                        <div className="flex items-center">
                          <Trophy className="w-5 h-5 mr-3 text-sky-600 opacity-70" />
                          <span>Runner-up: {isPastTournament ? (tournament as PastTournament).runnerUp : ""}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Contact Information */}
                {tournament.contactEmail && (
                  <Card className="mb-8">
                    <CardHeader>
                      <CardTitle className="text-xl text-sky-600">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>
                        For questions about this tournament, please contact:{" "}
                        <a href={`mailto:${tournament.contactEmail}`} className="text-sky-600 hover:underline">
                          {tournament.contactEmail}
                        </a>
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Registration Button */}
                {!isPastTournament && (
                  <div className="mt-8 text-center">
                    <Link href={tournament.registrationLink}>
                      <Button size="lg" className="bg-sky-600 hover:bg-sky-700 text-white">
                        Register for Tournament
                      </Button>
                    </Link>
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

