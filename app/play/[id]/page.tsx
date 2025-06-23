// app/play/[id]/page.tsx
export const dynamic = "force-dynamic"
export const revalidate = 0

import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { getTournamentById, getTournamentSummary} from "@/lib/tournaments"
import MatchResultsSection from "@/components/match-results-section"
import { getEventById } from "@/data/events"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Calendar, MapPin, Clock, Trophy, DollarSign, Award, Info } from "lucide-react"
import RegistrationStatus from "@/components/registration-status"
import { AddToCalendarDropdown } from "@/components/add-to-calendar-dropdown"
import type { Metadata } from "next"
import BasicResultsSummary from "@/components/basic-results-summary"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Event Details",
  description: "Detailed information about the event, including results and registration.",
  openGraph: {
    title: "Event Details",
    description: "Detailed information about the event, including results and registration.",
    url: "https://skyball.com/play/[id]",
  },
}

export default async function EventPage({ params }: { params: { id: string } }) {
  const event = await getTournamentById(params.id)
  if (!event) notFound()
  const staticEvent = getEventById(params.id)

  // Determine past/upcoming
  const isPastEvent = event.start_at
    ? new Date(event.start_at) < new Date()
    : event.isPast === true
  


  const summary = await getTournamentSummary(params.id)


  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">

            {/* Back to all events link */}
            <div className="mb-6">
              <Link href="/play" className="text-sky-600 hover:text-sky-800">
                ← Back to all events
              </Link>
            </div>


            {/* Event Card */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
              
              {/* HEADER BANNER */}
              <div className="bg-sky-600 p-8 text-white">
                <div className="flex justify-between items-start">
                  {/* Name + Date (+ time & location for upcoming) */}
                  <div>
                    <h1 className="text-3xl font-bold mb-2">{event.name}</h1>
                    <div className="flex flex-wrap items-center space-x-4 text-lg opacity-90">
                      <Calendar className="w-5 h-5 inline mr-1" />
                      <span>{event.date}</span>
                      {!isPastEvent && (
                        <>
                          <Clock className="w-5 h-5 inline mr-1" />
                          <span>{event.time}</span>
                          <MapPin className="w-5 h-5 inline mr-1" />
                          <span>{event.location}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Add to Calendar only for upcoming */}
                  {!isPastEvent && (
                    <AddToCalendarDropdown
                      name={event.name}
                      date={event.date}
                      time={event.time}
                      location={event.location}
                      description={event.description}
                      variant="secondary"
                    />
                  )}
                </div>
                {/* Description only for upcoming */}
                {!isPastEvent && event.description && (
                  <p className="mt-4 text-lg opacity-90">{event.description}</p>
                )}
              </div>

              {/* BODY */}
              <div className="p-8">
                {/* Upcoming: full details + registration */}
                {!isPastEvent && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      {/* Event Details */}
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
                                Skill Level:{" "}
                                {event.skillLevel.charAt(0).toUpperCase() +
                                  event.skillLevel.slice(1)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Registration Info */}
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
                          {staticEvent?.registrationDeadline && (
                            <div className="flex items-center">
                              <Calendar className="w-5 h-5 mr-3 text-sky-600" />
                              <span>
                                Registration Deadline: {staticEvent.registrationDeadline}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-8 text-center">
                      <RegistrationStatus tournamentId={event.id} />
                    </div>
                  </>
                )}

                {/* Past: results only */}
                {isPastEvent && (
                  <>
                  <BasicResultsSummary results={summary ?? {}} />
                  <MatchResultsSection
                    tournamentId={event.id}
                    tournamentName={event.name}
                    tournamentDate={event.date}
                  />
                  </>
                )}

              </div>
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
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
