"use client"
import { useInView } from "react-intersection-observer"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CalendarIcon, MapPinIcon } from "lucide-react"
import { upcomingTournaments } from "@/data/tournaments"

export default function UpcomingTournaments() {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

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
                "bg-gray-50 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300",
                inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
              )}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">{tournament.name}</h3>
                <div className="flex items-center text-gray-600 mb-2">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  <span>{tournament.date}</span>
                </div>
                <div className="flex items-center text-gray-600 mb-4">
                  <MapPinIcon className="w-4 h-4 mr-2" />
                  <span>{tournament.location}</span>
                </div>
                <p className="text-gray-600 mb-4">{tournament.description}</p>
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

