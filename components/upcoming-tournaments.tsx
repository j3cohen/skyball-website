"use client"
import { useInView } from "react-intersection-observer"
import type React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CalendarIcon, MapPinIcon, Clock, Trophy, Users } from "lucide-react"
import { upcomingTournaments } from "@/data/tournaments"
import { useRouter } from "next/navigation"

export default function UpcomingTournaments() {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const router = useRouter()

  const handleCardClick = (id: string, event: React.MouseEvent) => {
    // Check if the click was on the register button or its parent
    const target = event.target as HTMLElement
    if (target.tagName === "BUTTON" || target.closest("button")) {
      // Don't navigate if clicking on the register button
      return
    }

    // Navigate to tournament details page
    router.push(`/tournaments/${id}`)
  }

  return (
    <section ref={ref} className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <h2
          className={cn(
            "text-3xl md:text-4xl font-bold text-center mb-12 transition-all duration-700 delay-100",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
          )}
        >
          Upcoming Tournaments
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {upcomingTournaments.map((tournament, index) => (
            <div
              key={tournament.id}
              className={cn(
                "bg-gray-50 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer",
                inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
              )}
              style={{ transitionDelay: `${index * 100}ms` }}
              onClick={(e) => handleCardClick(tournament.id, e)}
            >
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">{tournament.name}</h3>
                <div className="flex items-center text-gray-600 mb-2">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  <span>{tournament.date}</span>
                </div>
                {tournament.startTime && (
                  <div className="flex items-center text-gray-600 mb-2">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>{tournament.startTime}</span>
                  </div>
                )}
                <div className="flex items-center text-gray-600 mb-2">
                  <MapPinIcon className="w-4 h-4 mr-2" />
                  <span>{tournament.location}</span>
                </div>
                {tournament.prizePool && (
                  <div className="flex items-center text-gray-600 mb-2">
                    <Trophy className="w-4 h-4 mr-2" />
                    <span>Prize Pool: {tournament.prizePool}</span>
                  </div>
                )}
                {tournament.maxParticipants && (
                  <div className="flex items-center text-gray-600 mb-4">
                    <Users className="w-4 h-4 mr-2" />
                    <span>
                      {tournament.currentParticipants || 0}/{tournament.maxParticipants} Participants
                    </span>
                  </div>
                )}
                <p className="text-gray-600 mb-4 line-clamp-2">{tournament.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sky-600 font-bold">Fee: {tournament.registrationFee}</span>
                  <Link href={tournament.registrationLink}>
                    <Button variant="outline" size="sm">
                      Register
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div
          className={cn(
            "text-center mt-12 transition-all duration-700 delay-500",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
          )}
        >
          <Link href="/tournaments">
            <Button size="lg" className="bg-sky-600 hover:bg-sky-700 text-white">
              View All Tournaments
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

