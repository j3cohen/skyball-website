import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { events } from "@/data/events"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Calendar, MapPin, Clock, Trophy, Users, DollarSign, Award, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function EventPage({ params }: { params: { id: string } }) {
  const event = events.find((e) => e.id === params.id)

  if (!event) {
    notFound()
  }

  const isPastEvent = event.isPast === true
  const isRSVP = event.type === "open-play"

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <Link href="/play" className="text-sky-600 hover:text-sky-800">
                ← Back to all events
              </Link>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
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
                            Capacity: {event.currentParticipants !== undefined ? `${event.currentParticipants}/` : ""}
                            {event.maxParticipants} participants
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

                {/* Past Event Results */}
                {isPastEvent && event.results && (
                  <Card className="mb-8">
                    <CardHeader>
                      <CardTitle className="text-xl text-sky-600">Event Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {event.results.winner && (
                          <div className="flex items-center">
                            <Trophy className="w-5 h-5 mr-3 text-sky-600" />
                            <span>Winner: {event.results.winner}</span>
                          </div>
                        )}
                        {event.results.runnerUp && (
                          <div className="flex items-center">
                            <Trophy className="w-5 h-5 mr-3 text-sky-600 opacity-70" />
                            <span>Runner-up: {event.results.runnerUp}</span>
                          </div>
                        )}
                        {event.results.score && (
                          <div className="flex items-center">
                            <Info className="w-5 h-5 mr-3 text-sky-600" />
                            <span>Final Score: {event.results.score}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Contact Information */}
                {event.contactEmail && (
                  <Card className="mb-8">
                    <CardHeader>
                      <CardTitle className="text-xl text-sky-600">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>
                        For questions about this event, please contact:{" "}
                        <a href={`mailto:${event.contactEmail}`} className="text-sky-600 hover:underline">
                          {event.contactEmail}
                        </a>
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Registration Button */}
                {!isPastEvent && (
                  <div className="mt-8 text-center">
                    <Link href={`/play/${event.id}/register`}>
                      <Button size="lg" className="bg-sky-600 hover:bg-sky-700 text-white">
                        {isRSVP ? "RSVP Now" : "Register for Event"}
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
